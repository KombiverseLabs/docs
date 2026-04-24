# STATUS — mintlify-docs

Last verified: 2026-04-18

Ist-Zustand der Public-Documentation-Site. Plaene gehoeren in `ROADMAP.md`.

## Rolle des Repos

Tier 1 Public Documentation der kombify-Plattform, gebaut mit Mintlify. Deployed auf `docs.kombify.io` via Mintlify-Plattform (automatischer Deploy auf main-Push).

## Features (was auf der Live-Site existiert)

### Tabs (aus `docs.json`)
- **Overview** — Introduction, Quickstart, Ecosystem, Comparisons
- **Guides** — Getting Started, Auth, Deployment, Self-Hosting, Troubleshooting
- **Stack** (kombify-TechStack) — Overview, Quickstart, How-To, Explanations, Reference
- **Sim** (kombify-Sim) — Overview, Quickstart, How-To, Explanations, Reference
- **StackKits** (kombify-StackKits) — Overview, Quickstart, Kits (base/ha/modern-homelab), CUE-Architecture, Spec-Format
- **Cloud** (kombify Cloud) — Overview, Getting Started, Dashboard, Team-Management, Tool-Launcher, Pricing, Subscriptions, Enterprise
- **Concepts** — Hybrid Infrastructure, Simulation-first, Spec-driven, StackKits-Modell
- **API Reference** — `api/kombifyai/`, `api/kombifycloud/`, `api/kombifysim/`, `api/kombifytechstack/`

### AI-Tools-Integration
- `ai-tools/claude-code.mdx`, `cursor.mdx`, `windsurf.mdx`

### Integrations
- `integrations/auth0.mdx` (seit 2026-04-15 Auth0-Cutover)
- `integrations/coolify.mdx`, `integrations/proxmox.mdx`

## Deployment

| Komponente | Target | Trigger |
|---|---|---|
| Mintlify-Site | `docs.kombify.io` | `git push main` → Mintlify auto-deploy |
| Preview | PR-Preview-URL | Pull Request |

Kein Render, kein eigenes Hosting. Mintlify-SaaS.

## Dependencies

- Mintlify CLI (Dev-Preview)
- Node 22 (fuer Playwright, lokale Scripts)
- `package.json` sehr schlank (nur Playwright als test-Dep)

## Known Issues

- **Code-vs-Doc-Gap (offen):** Einige MDX enthalten noch code-level alte Namen (`kombistack.yaml`-Dateiname, `KOMBISTACK_PORT`-Env-Vars, `kombisim:`-Docker-Service-Namen). Diese sind moeglicherweise noch in den Tool-Repos gueltig. Update erfolgt koordiniert mit kombify-TechStack / kombify-Sim Audits.
- **Content-Gaps (aus altem README übernommen, historisch):**
  - StackKits: `quickstart.mdx` vorhanden — historisch TODO, vermutlich inzwischen erledigt. Pruefen.
  - API Reference: existiert fuer alle 4 Tools, Detailtiefe unterschiedlich.
  - Einzelne Auth-/Deployment-Guides: Inhalt und Aktualitaet nach Auth0-Cutover pruefen.
- **Concept-Layer und Cloudflare Edge:** Aktive MDX-Seiten enthalten keine aktuelle Kong-Pfadbeschreibung; neue Public-API-Doku muss Cloudflare Edge als kanonisch darstellen.
- **Altes README (bis 2026-04-18):** hatte massive Pfad-Drifts (referenzierte `tools/`, `saas/` Ordner, die nicht existieren). Ersetzt.

## Tests

- `playwright.config.ts` + E2E-Tests vermutlich fuer Link-/Rendering-Checks. Aktueller Testabdeckungsstand nicht dokumentiert.

## Letzte groessere Aenderungen

- 2026-04-18: Repo-Hygiene-Audit (Phase 3). Alte Namen `kombistack/kombisim/kombisphere` → `kombifytechstack/kombifysim/kombifycloud` in `api/`-Pfaden, `docs.json`, Cross-References. Redirects eingerichtet. README/CLAUDE/AGENTS komplett neu. STATUS+ROADMAP erstellt. `DOCS_STANDARDS.md`-Duplikat geloescht (Verweis auf Core).
- 2026-04-17: `docs(api): reflect Cloudflare edge + Auth0 validation`
- 2026-04-17: `docs: migrate identity docs to auth0`
- 2026-04-17: Rename kombiai → kombifyai API-Segment
