# Kombify Portable Dev/Test-Container & Runtime-Testing-Standard — Design Spec

- **Status:** Design / Draft (zur Review)
- **Datum:** 2026-06-03
- **Owner:** Marcel (kombify)
- **Typ:** Design-Spec für einen neuen kombify-Standard (der publizierte Standard ist ein Plan-Deliverable, nicht dieses Dokument)
- **Verwandte Standards:** `LOCAL-E2E-DEPLOYMENT-STANDARD.md` (Root), `.github/docs/local-development-deployment.md`, `.github/docs/ci-cd-cost-and-deployment-strategy.md`, `PACKAGE_MANAGER_STANDARDIZATION.md`

> Diese Fassung merged zwei Achsen: (1) das **portable Substrat** (devcontainer + mise + Engine-Entkopplung, SOTA-recherchiert) und (2) die **Runtime-Typ-Taxonomie** (4 Standards + AI-Overlay) aus dem internen "Kombify Development-Testing Standards"-Vorschlag.

---

## 1. Problem / Motivation

1. **Docker-Desktop-Hardgate** — `doctor:docker` / `run-local-e2e-gate.ps1` werfen ohne `docker version` (DD-Lizenzpflicht ab >250 MA / >$10M).
2. **PowerShell-Coupling** — Gate-Runner sind `.ps1`; ein Linux-devcontainer/Codespace kann sie nicht ausführen.
3. **Repo-Individualismus** — jedes der ~13 Repos wird ad hoc behandelt statt nach Runtime-Typ standardisiert.

Ziel: **flexible Container, in möglichst vielen Umgebungen identisch nutzbar** (lokal Win/mac/Linux jede Engine, Codespaces, self-hosted CI), **ohne DD-Bindung**, mit **mise** als einheitlicher Bedienoberfläche und **3 wiederverwendbaren Runtime-Standards** statt Repo-Sonderregeln.

## 2. Goals / Non-Goals

### Goals (v1)
- **Substrat:** `.devcontainer/devcontainer.json` + `@devcontainers/cli` (`up`/`exec`) als Portabilitäts-Vertrag; **mise** als In-Container-Entrypoint mit erzwungener `mise.lock`.
- **Engine-Entkopplung:** `doctor:container` (Runtime-Probe) ersetzt `doctor:docker`; lokaler Default **WSL2 + Podman rootful**.
- **Runtime-Taxonomie:** 4 Standards (0/A/B/C) + AI/Agent-Overlay, als Repo-Matrix statt Sonderregeln.
- **3 Archetyp-Basisimages** (A/B/C) in GHCR, Depot-buildbar, per Digest gepinnt; Standard 0 nutzt eine minimale Toolchain-Variante.
- **Drift-Kontrolle:** Archetyp-Templates + `devcontainer:audit`.
- **Pilot** auf 2 Repos grün (Techstack hat schon einen devcontainer).

### Non-Goals (deferred → Roadmap §16)
- **Testcontainers** als Test-Dep-Layer → **v2**.
- **`.ps1`-Gate-Run-Logik → mise-Tasks** migrieren → **v2** (in v1 nur der Engine-Probe-Teil).
- **`kombi-local-gate.mjs` Runtime-Detection + Shadow-Promotion-Engine** → **v2**.
- **Codespaces-Prebuilds produktiv + Coder/DevPod-Self-Host** → **v3**.
- **Dagger** → deferred bis CI-vs-lokal-Duplikation real wehtut (mise liefert portable Invocation).
- **Nix / devenv / Devbox / Flox** als Baseline → nein (WSL2-only auf Windows, kein natives Codespaces); nur selektiv *innerhalb* eines devcontainers für hermetik-kritische Repos.

## 3. SOTA-Basis (mid-2026, quellenverifiziert)

Drei parallele Research-Pässe gegen offizielle Docs + 2025/26-Quellen. Kernverdict: **die Dev-Container-Spec ist 2026 stärker verankert, nicht schwächer** — jede Cloud-CDE (Codespaces, Coder, DevPod, Gitpod Flex, Daytona) konsumiert `devcontainer.json`; die Portabilitäts-Garantie liegt in der **`@devcontainers/cli`**, nicht in den Editoren.

| Baustein | Verdict | Quelle |
|---|---|---|
| Dev Container Spec | Baseline (MIT/CC-BY, kein CNCF) | [containers.dev/supporting](https://containers.dev/supporting) |
| `@devcontainers/cli` (`up`/`exec`) | Portabilitäts-Vertrag, headless, `--docker-path` für Podman | [github.com/devcontainers/cli](https://github.com/devcontainers/cli) |
| `devcontainers/ci@v0.3` | CI-Wrapper (`runCmd`/`subFolder`/`platform`), self-hosted-fähig | [github.com/devcontainers/ci](https://github.com/devcontainers/ci) |
| mise | tools+tasks+env; `mise.lock` opt-in → erzwingen | [mise.lock](https://mise.jdx.dev/dev-tools/mise-lock.html) |
| Engine-Alternativen | Podman/Rancher/colima/WSL2 = Docker-API-Socket | [podman-desktop.io](https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility) |
| Testcontainers (v2) | engine-agnostisch via `DOCKER_HOST`; Ryuk-Caveat rootless | [golang.testcontainers.org](https://golang.testcontainers.org/system_requirements/using_podman/) |
| Docker Desktop | Lizenzpflicht ab >250 MA / >$10M = Entkopplungs-Treiber | [docs.docker.com](https://docs.docker.com/subscription/desktop-license/) |

## 4. Architektur — Substrat + 4 Standards + Overlay

```
AI/AGENT-OVERLAY (quer, shadow→blocking)  ─────────────────────────────────┐
                                                                            │
STANDARDS (Spine):  0 Library/Contract │ A Edge/Worker │ B SaaS+Aspire │ C Self-hosted/OSS
                         (kein Image)        ├─ Archetyp-Basisimage ─┤
                                             ▼            ▼            ▼
SUBSTRAT:   devcontainer.json + @devcontainers/cli (up/exec)
            mise (mise.toml + mise.lock)  →  runCmd: mise run <gate>
            doctor:container (Runtime-Probe)  ·  lokal: WSL2 + Podman rootful
HOSTS:      lokal (CLI) │ self-hosted CI (devcontainers/ci@v0.3) │ Codespaces (interaktiv) │ Depot (Image-Build)
```

Prinzip: **`devcontainer.json` + `mise` = SSOT.** Jeder Standard ist ein Archetyp-Template über demselben Substrat; Hosts sind austauschbare Consumer.

## 5. Substrat (die Mechanik)

### 5.1 Vertrag + Archetyp-Basisimages
- Jedes Repo hat `.devcontainer/devcontainer.json`, das sein **Archetyp-Basisimage** (A/B/C) per Digest `FROM`'t und nur repo-spezifische Features/Tools ergänzt.
- **3 Archetyp-Images in GHCR**, **Depot-buildbar** (native arm64 statt ~1h QEMU), per **Digest** gepinnt, nutzbar in Codespaces *und* GitHub-Actions-`container:`-Jobs:
  - `ghcr.io/.../devtest-edge` (A): Node/Bun, wrangler, miniflare/workerd.
  - `ghcr.io/.../devtest-saas` (B): Go, Node/Bun, .NET-SDK + Aspire, docker-in-docker.
  - `ghcr.io/.../devtest-selfhost` (C): Go, Compose-Client, Playwright, Image-/VM-Smoke-Tooling.
  - **Standard 0** braucht kein eigenes Archetyp-Image → minimale Toolchain-devcontainer-Variante (Sprache via mise, kein DinD).
- **mise-Install (zweistufig):** mise-**Binary** im Image (offizielles Script/apt, gepinnt); danach `onCreateCommand: mise install --system` für die **Tools** aus `mise.toml`. Bewusst offizieller Weg statt Community-Feature (v0.1.x/Single-Maintainer = Supply-Chain-Risiko).
- **Editor-Honesty:** garantiert ist **Config + CLI**, nicht IDE-UX-Parität.

### 5.2 mise-Vertrag im Container
- Pflicht-Tasks pro Repo: `setup, doctor, build, test, check, health, preview:local, preflight:quick, preflight:release, preflight:deploy` (+ standard-spezifische, §6).
- **`mise.lock` verpflichtend committet** (`lockfile = true`, `mise lock`).
- **Ein Invocation-Pfad überall:** `runCmd: mise run preflight:release` in CI = derselbe Task wie lokal.

### 5.3 Engine-Entkopplung
- **`doctor:container`** ersetzt `doctor:docker`: akzeptiert lokale Docker-Engine/Desktop, devcontainer/Codespaces, GitHub-Actions-`container:`-Jobs oder kompatible OCI/Compose-Runtimes (Probe via `docker info` gegen `DOCKER_HOST`). **`doctor:docker` bleibt Kompatibilitätsalias.** `predeploy:local` hängt von `doctor:container` ab.
- **Lokaler Default Windows:** WSL2 + Podman (**rootful** → Ryuk-ready für v2). mac: colima/Rancher. Linux/CI: dockerd/Podman (kein Desktop nötig).

### 5.4 Hosts (Hybrid-Cost)
| Host | Rolle | Mechanik |
|---|---|---|
| Lokal | Primärer Loop | `devcontainer up` + `exec -- mise run <gate>` auf WSL2+Podman |
| self-hosted CI (`kombi`) | Automatisierte Runs | `devcontainers/ci@v0.3`, `runCmd`, `cacheFrom`, `subFolder` für Multi-Repo |
| Codespaces | Interaktiv/Agent-Dev | gleiche Spec; Prebuilds erst v3 |
| Depot | Archetyp-Image-Builds, Multi-Arch | Beschleuniger, **nicht** Deploy-Control-Plane |

CI-Runs auf self-hosted (kein Codespaces-Spend); konform zu `ci-cd-cost-and-deployment-strategy.md`.

## 6. Die 4 Standards (Spine)

### Standard 0 — Library / Contract
- **Für:** reine Libraries/Standards ohne deploybare Runtime.
- **Blocking Gate:** `preflight:release` = Unit + Lint + Contract/Build (Go `go test ./...`, CUE-Vet, API-Contract-Checks). **Kein Container-/E2E-Gate.**
- **Artefakt:** Modul/Package, kein Image.
- **Repos:** kombify-Core, kombify-go-common, kombify-api-toolkit (+ ggf. kombify-Brand).

### Standard A — Edge-Native Worker Testing
- **Für:** Cloudflare Worker/Pages/Edge-Routing.
- **Blocking Gate:** `preflight:release` = Typecheck, Unit/Worker-Runtime-Tests (workerd/miniflare), `wrangler deploy --dry-run`, bei Bedarf lokaler `wrangler dev`-Smoke. CF Workers Builds/Previews primär; GitHub Actions = Orchestrierung/Fallback; CF-native Deploys werden **nicht** durch GH/Depot-Containerpfade ersetzt.
- **Basisimage:** `devtest-edge`.
- **Repos:** kombify-Me, kombify-Gateway, kombify-Desk (Worker), AI TechStack-Manager-Worker, SpeechKit CF Quality-Gate-Agent.

### Standard B — SaaS Container + Aspire Testing
- **Für:** managed SaaS-Web/API-Flows.
- **Blocking Gate:** schnelle Tests ohne Container zuerst, dann OCI/Compose **oder** Aspire (`DistributedApplicationTestingBuilder`, headless via `dotnet test`, Podman-fähig) für produktionsnahe lokale Flows. GHCR-Images = immutable Release-Artefakte; **Depot** Default für Remote-Builds; **Render** primär (render-native, sonst render-image-backed).
- **Basisimage:** `devtest-saas`.
- **Repos:** kombify-Cloud, kombify-AI, kombify-Administration, kombify-Techstack (SaaS), kombify-Blog, kombify-DB (Data-Plane-Dependency).

### Standard C — Self-Hosted / OSS Release Testing
- **Für:** Produkte, die Nutzer lokal/Compose/CLI/VM installieren.
- **Blocking Gate:** fresh Compose/VM/Image-Install, Health-Smoke, Browser/API-Beweis **und Install-Doku-Beweis**. GHCR/Public-Images + generated release evidence wichtiger als Render-native Builds.
- **Basisimage:** `devtest-selfhost`.
- **Repos:** kombify-StackKits, kombify-SpeechKit, kombify-simulate, kombify-Techstack (self-hosted), StackKit public exports.

## 7. AI/Agent-Overlay (kein 4. Standard, quer)
- Quick/Release-Gates nutzen **Fake-/Mock-Provider oder kleine deterministic provider smokes** (keine echten LLM-Calls im Quick-Gate).
- CF-Worker/Sandbox/R2-basierte Agenten- oder Generated-App-Gates laufen **zuerst als Shadow-Evidence** und werden **erst nach 3 stabilen grünen Läufen blocking**.
- **Promotion-Mechanismus (v2, hier zu spezifizieren):** `shadowGate`-Evidence-Feld trackt Lauf-Resultate; eine definierte State-Quelle zählt aufeinanderfolgende grüne Läufe und flippt das Gate auf blocking. **In v1 nur das Evidence-Feld + die Doktrin; die Promotion-Engine ist v2.**
- Greift auf Repos mit AI-Surface: kombify-AI, SpeechKit, kombify-Agents, homelab-architect (Klassifikation §8).

## 8. Repo-Matrix

| Repo | Standard | Basisimage | Note |
|---|---|---|---|
| kombify-Core | 0 | – (minimal) | Standards/Lib |
| kombify-go-common | 0 | – (minimal) | Go-Lib |
| kombify-api-toolkit | 0 | – (minimal) | Toolkit |
| kombify-Me | A | edge | Worker |
| kombify-Gateway | A | edge | CF Edge-Router |
| kombify-Desk | A (+B?) | edge | Worker; falls Render-SaaS-Surface → auch B |
| kombify-Cloud | B | saas | Flagship SaaS |
| kombify-AI | B | saas | + AI-Overlay |
| kombify-Administration | B | saas | |
| kombify-Blog | B | saas | Render-website |
| kombify-DB | B | saas | Data-Plane-Dependency |
| kombify-Techstack | **B + C** | saas / selfhost | Dual-Mode (DEPLOYMENT_MODE) |
| kombify-SpeechKit | **A + C** | edge / selfhost | CF-Agent + OSS-Release; + AI-Overlay |
| kombify-StackKits | C | selfhost | OSS Dual-Repo |
| kombify-simulate | C | selfhost | VPS-Preview-Exception |
| StackKit public exports | C | selfhost | |

**Noch zu klassifizieren (im Pilot):** kombify-MCP (A oder B — Edge-MCP-Host), kombify-Agents/-workers (A + AI-Overlay), homelab-architect (B/C + AI-Overlay), kombify-Sim-ionos-ingress (C-adjacent/Infra), kombify-Brand (0 oder N/A), mintlify-docs (0/Docs-Build).

## 9. Drift-Kontrolle (kritisch)
Konsistenz kommt aus **Template + Check**, nicht aus 13 bespoke Configs:
1. **Archetyp-Templates** in `.github/templates/devcontainer/{edge,saas,selfhost,lib}/` (Referenz-`devcontainer.json` + Dockerfile-FROM-Archetyp + mise-Tasks).
2. **`devcontainer:audit`** (analog `local-e2e:audit`): prüft je Repo Existenz `.devcontainer/`, korrekter Archetyp/Image-Digest, `mise install --system` im Lifecycle, Pflicht-mise-Tasks, committete `mise.lock`. Reportet Drift ohne zu mutieren.

## 10. Reproduzierbarkeit
- `mise.lock` committet (Pflicht).
- Archetyp-Images + Features per **Digest** gepinnt.
- Vendor-Konzentration der Spec (Microsoft-anchored) dokumentiert, akzeptiert.

## 11. Evidence-Felder (kombi-local-gate.mjs)
Bestehende Evidence + neu: `runtimeProfile` (0/A/B/C), `containerRuntime` (docker/podman/codespaces/gha-container), `cloudProvider` (cloudflare/render/none), `imageRef` (GHCR-Digest), `shadowGate` (shadow/blocking + Lauf-Historie). **In v1 als Felder eingeführt; die automatische Runtime-Detection/Promotion-Logik ist v2.**

## 12. Error / Blocked States
- Engine nicht erreichbar → `doctor:container` failt mit WSL2+Podman-Hinweis (nicht "DD starten").
- Fehlende `mise.lock`/Pflicht-Task → `devcontainer:audit` blockt.
- Codespaces-Prebuild-Limit (v3): Repo >32 GB → keine 2/4-Core-Prebuilds (go.work-Risiko).
- Ryuk auf rootless Podman (v2) → rootful oder `TESTCONTAINERS_RYUK_DISABLED=true` nur CI.
- AI-Gate flaky → bleibt Shadow, wird nicht prematür blocking.

## 13. Validierung / Acceptance (v1)
Pilot = **kombify-Techstack** (B, hat devcontainer) + **ein zweites Repo** (Vorschlag: ein Standard-A-Repo wie **kombify-Gateway**, um Edge-Pfad + zweiten Archetyp zu beweisen; final im Plan).
**Akzeptanz (mit Evidence-Zitat):** derselbe `mise run preflight:release` läuft grün (1) lokal WSL2+Podman via `devcontainer exec`, (2) via `devcontainers/ci@v0.3` auf `kombi`-Runner, (3) in einem Codespace. Evidence unter `_e2e-artifacts/`.
**v1 baut nur die von den Piloten benötigten Archetyp-Images** (edge + saas); selfhost + Standard-0-minimal folgen im Rollout.

## 14. Beziehung zu bestehenden Standards
- `LOCAL-E2E-DEPLOYMENT-STANDARD.md`: "Docker Desktop" → "jede Docker-API-Engine"; `doctor:container` ersetzt `doctor:docker`. Mandat (lokaler E2E-Gate Pflicht) unverändert.
- `.github/docs/local-development-deployment.md`: mise-Kontrakt um devcontainer-Lifecycle + 4-Standard-Matrix erweitern.
- `ci-cd-cost-...md`: Hybrid-Host-Modell + Depot-als-Beschleuniger-nicht-Control-Plane konform.

## 15. Rollout (v1)
1. Archetyp-Templates + `devcontainer:audit` in `.github/`.
2. `doctor:container` (+ `doctor:docker`-Alias) in Root-`mise.toml`; `predeploy:local` → `doctor:container`.
3. Evidence-Felder in `kombi-local-gate.mjs` (Felder, noch ohne Auto-Detection).
4. Archetyp-Images `devtest-edge` + `devtest-saas` via Depot → GHCR (Digest).
5. Pilot A (Techstack, B) + Pilot B (Gateway, A): 3-Host-Acceptance grün.
6. WSL2+Podman-Setup-Doku.
7. Repo-Matrix-Doc (4 Standards + Overlay, keine Repo-Sonderregeln).

## 16. Roadmap
- **v2:** Testcontainers (testcontainers-go zuerst); `.ps1`-Gate-Run → mise-Tasks; `kombi-local-gate.mjs` Runtime-Auto-Detection; **Shadow→Blocking-Promotion-Engine**; Ryuk/Podman-Härtung; `devtest-selfhost`-Image + Standard-0-minimal.
- **v3:** Codespaces-Prebuilds produktiv (Trigger "on config change"/scheduled, Idle-Timeout, Storage-Budget); Coder/DevPod self-hosted Cloud-Dev (gleiche Spec); Features/Images vollständig per Digest.
- **Optional/später:** devenv/Devbox in hermetik-kritischen Repos; Dagger bei CI-vs-lokal-Duplikation.

## 17. Risiken & offene Fragen
- Drift trotz Template → steht/fällt mit CI-enforced `devcontainer:audit`.
- 3 Archetyp-Images = 3 Build-/Patch-Pfade (Depot-Pipelines) — Wartungskosten vs. Konsistenz-Gewinn.
- Podman-rootful + Features (Bind-Mount/UID) → pro Archetyp validieren.
- Shadow→Blocking-Promotion: State-Quelle/Owner offen (v2-Design).
- Aspire-Multi-Repo-Integration passt nicht in Single-Repo-Codespace → v1 außen vor, Re-Eval v2/v3.
- Dual-Mode-Repos (Techstack B+C, SpeechKit A+C): zwei devcontainer-Configs oder ein Multi-Target-Config? → Pilot klärt.

## 18. Entscheidungs-Log

| # | Entscheidung | Quelle |
|---|---|---|
| 1 | Primärziel: Cloud-Test-Umgebungen (Codespaces) | User |
| 2 | Hybrid: 1 Spec, 2 Hosts (Codespaces interaktiv / kombi-Runner CI) | User |
| 3 | Maximal portabel über `@devcontainers/cli` als Vertrag | SOTA |
| 4 | **3 Archetyp-Basisimages (A/B/C)** statt 1-shared oder 13-bespoke | User (revidiert nach Taxonomie-Frame) |
| 5 | Lokal: WSL2 + Podman rootful | User |
| 6 | v1 = Substrat + Taxonomie + 2 Piloten; Testcontainers/.ps1→mise/Promotion-Engine = v2 | User |
| 7 | **Runtime-Taxonomie A/B/C + AI-Overlay** als Spine (aus internem Vorschlag) | Merge |
| 8 | **Standard 0: Library/Contract** für Libs ohne Runtime | User |
| 9 | `doctor:container` (Naming aus Vorschlag) statt `doctor:engine` | Merge |
| 10 | Dagger & Nix deferred/selektiv | SOTA + YAGNI |
