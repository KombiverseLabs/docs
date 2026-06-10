# AGENTS.md — mintlify-docs

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
