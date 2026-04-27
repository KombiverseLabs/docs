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
