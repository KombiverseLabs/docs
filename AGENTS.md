# AGENTS.md — mintlify-docs

<!-- BEGIN GENERATED: planning-policy kombify-agent-policy-sync -->
> Generated from `AGENTS.md` in the kombify workspace root. Do not edit this
> block in child repos; update the root policy and run
> `mise run agents:planning:sync`.

## Planning System Policy

- The workspace root `AGENTS.md` `## Planning System Policy` section is the
  canonical source for generated planning-policy blocks in repo-local
  `AGENTS.md` files. Edit the workspace root policy first, then run
  `mise run agents:planning:sync`. Do not hand-edit the generated blocks in
  child repos.
- Linear is the canonical portfolio and roadmap planning system: high-level epics, cross-repo priorities, phase gates, ownership, and blockers. It is the single source of truth for what to build and when. Full taxonomy and workflow: `LINEAR-PLANNING-STANDARD.md`.
- Workspace: Kombiverse Labs (team KOM). Every Development-project issue carries exactly one `area:*` label; detailed AI component tracking lives in the separate kombify-AI project.
- Repo-local `ROADMAP.md` and optional `docs/roadmap/v0.x.0-*.md` files remain the canonical repo milestone scope and release-gate documents.
- Beads is the canonical execution tracker inside each repo. Keep detailed tasks, subtasks, bugs, bugfixes, dependencies, and technical-depth follow-ups in Beads only.
- Linear and Beads are cross-referenced, not synced: a Linear issue may cite Beads IDs and a Beads issue may cite a Linear ID. Either can exist without the other.
- Check/update Linear at session boundaries (start and end), not on every Beads operation. Do not recreate one-way or bidirectional roadmap syncs between Beads, Linear, and repo docs beyond the two sanctioned generated read views below.
- Sanctioned one-way read views (User-Decision 2026-06-10, see `STANDARDS_ENFORCEMENT.md`): (1) `roadmap-sync` mirrors each ROADMAP.md milestone into one Linear issue (`[<repo>] M<r> · v0.x.0 — <Name>`, label `roadmap:milestone`; the derived rank M1..M5 is the execution order of the active milestones); (2) `roadmap-open-issues` renders open Beads issues into the marked `## Open Issues` block inside ROADMAP.md. Both are derived views — never edit them manually, never sync back.
- Session close with milestone-relevant work: update the Scope/Exit-gate checkboxes in the touched repo's repo-local `ROADMAP.md`, then run `mise run roadmap:update -- -Repo <repo>` from the workspace root (refreshes the Open-Issues block; add `-Sync` to push the Linear mirror).
<!-- END GENERATED: planning-policy kombify-agent-policy-sync -->

Generische AI-Agent-Instruktionen (Copilot, Codex, Gemini, Claude). Synchron halten mit `CLAUDE.md`.

## Normative Quellen

Siehe `CLAUDE.md` Abschnitt "Normative Quellen (Core)". Gleiche Liste, gleiche Bindung.

## Repo-Kontext

Tier-1 Public Documentation fuer die kombify-Plattform (Mintlify). Kein Source-Code, kein Test-Code. Content in MDX + `docs.json`-Nav.

## Task-Tracking

- **Beads** (`.beads/`) ist local source of truth fuer Repo-Tasks.
- Cross-Repo oder Milestone-Tasks in GitHub Projects (KombiverseLabs Roadmap).
- Beads-Issue zuerst ansehen, bevor eigenstaendig Content geaendert wird:
  ```
  bd list                         # offene Tasks
  bd ready                        # verfuegbare Arbeit
  bd show <id>                    # Details
  bd update <id> --status in_progress
  bd close <id>
  bd sync                         # vor Commit
  ```

## Do / Dont

**Do:**
- Neue Seiten ueber `_templates/` starten.
- `docs.json` mit aktualisieren (Nav registrieren, sonst 404).
- Brand-Naming pruefen (siehe DOCS_STANDARDS §6).
- Bei API-Aenderungen: `redirects`-Array in `docs.json` pflegen.
- Tier-Disziplin halten: nur Public-Content hier.

**Dont:**
- Keine alten Produkt-Namen einfuehren (`kombistack`, `kombisim`, `kombisphere`).
- Keine Duplikate von Core-Standards (lokale DOCS_STANDARDS.md-Kopie wurde 2026-04-18 geloescht).
- Keine Business-Content (Pricing-Strategie, Customer-Daten) — gehoert nach Notion.
- Keine internal-only Flows, Secrets oder URLs publizieren.

kombify standards live in the parent workspace `kombify` root: `../ARCH_STANDARD.md`, `../ARCH_STANDARD.schema.json`, `../ARCH_UI_GENERATION_PROMPT.md`.

## RepoWise Code-Wiki Policy

- This repo participates in the kombify RepoWise Dual-Index model (`kombify-Core/standards/CODE-INTELLIGENCE-STANDARD.md`): local indices are valid for active development; the IONOS Dev server index is the shared 24/7 baseline for Daily Drops, remote agents, and gateway-backed queries.
- Local `.repowise/` data is a development cache. Keep it out of Git and do not treat its presence as a docs-hygiene or repo-audit finding.
- Local sessions may use local `repowise` MCP output for branch-aware work (`source=local`). Scheduled routines, shared reports, and remote-agent context must use `kombify-tools` / `kombify-knowledge` or the server baseline (`source=server`).
- When using RepoWise as evidence, include the source (`local` or `server`), repo, branch/SHA, and `indexed_at` when available. If local and server disagree, read the cited files directly and report the drift.
