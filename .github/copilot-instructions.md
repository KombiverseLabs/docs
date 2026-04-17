# GitHub Copilot Instructions — mintlify-docs

Dieses File spiegelt die Kerninhalte aus `AGENTS.md` und `CLAUDE.md` in der Copilot-Konvention. Bei Konflikten gilt: User-Global-CLAUDE.md > AGENTS.md > dieses File.

## Project Context

Tier-1 Public Documentation fuer die kombify-Plattform, gebaut mit Mintlify. Content in MDX mit YAML-Frontmatter. Site-Config in `docs.json`. Deploy automatisch auf `docs.kombify.io` bei main-Push.

## Normative Quellen (Core)

- `../kombify Core/standards/DOCS_STANDARDS.md` — 3-Tier-Doku-Modell, Diataxis-4-Level, Writing-Rules
- `../kombify Core/standards/PRODUCT-SEGMENTATION.md` — Tools/SaaS/Homelab-Trennung, bindend fuer Content
- `../kombify Core/standards/DEVELOPMENT-STANDARDS.md` — Repo-Konventionen

## Brand-Naming (verbindlich)

- "kombify" immer lowercase
- Tool-Namen: `kombify-TechStack`, `kombify-Sim`, `kombify-StackKits`, `kombify-AI`, `kombify Cloud`
- **Nicht** verwenden: `kombistack`, `kombisim`, `kombisphere`, `kombi*` (Altnamen, 2026-04 entfernt)
- Config-Datei: `kombination.yaml`

## MDX-Format

Jede Seite startet mit YAML-Frontmatter:
```yaml
---
title: "Titel in sentence case"
description: "Ein-Satz-Summary fuer SEO"
---
```

## Writing-Style

- Second-person ("you", nicht "we")
- Sentence-case Headings
- Code-Bloecke mit Language-Tag (```yaml, ```bash, ```go)
- Interne Links relativ ohne `.mdx`
- Prerequisites-Section am Top prozeduraler Seiten
- Keine Emojis im Content

## Mintlify-Komponenten

`<Card>`, `<CardGroup>`, `<Steps>` + `<Step>`, `<Tabs>` + `<Tab>`, `<Accordion>`, `<Note>`, `<Warning>`, `<Tip>`, `<CodeGroup>`, `<ParamField>`, `<ResponseField>`.

## Verzeichnis-Struktur (Ist-Zustand)

- `ai/`, `ai-tools/` — kombify-AI + AI-Tool-Integrationen
- `api/kombifyai|kombifycloud|kombifysim|kombifytechstack/` — API Reference
- `cloud/` — kombify Cloud Portal
- `concepts/` — Architektur-/Design-Konzepte
- `guides/` — How-To (Auth, Deployment, Self-Hosting, StackKits, Troubleshooting)
- `integrations/` — Auth0, Coolify, Proxmox
- `sim/`, `stack/`, `stackkits/` — OSS-Tool-Docs
- `comparisons/`, `faq/`, `glossary/` — sekundaer
- `_templates/` — MDX-Vorlagen
- `images/`, `logo/` — Assets

## docs.json-Navigation

Bei neuen Seiten Nav mit aktualisieren — sonst 404:
- `tabs[].pages[].pages[]` — Tab-Inhalt
- `redirects[]` — fuer umbenannte Pfade (z.B. Altnamen-Weiterleitung)

## Code-Beispiele

- Realistische Werte passend zu aktuellen kombify-APIs
- Mehrsprachig wo sinnvoll (bash, JS, Python, Go)
- Request + Response bei API-Beispielen
- Config-Beispiele nutzen `kombination.yaml`

## Do NOT

- Title-Case-Headings verwenden
- Frontmatter auslassen
- Absolute URLs fuer interne Links
- Alte Tool-Namen einfuehren (`kombistack`, `kombisim`, `kombisphere`, `kombi*`)
- Business-Content (Pricing, Marketing-Strategie) publizieren — gehoert nach Notion
- Core-Standards duplizieren — auf sie verlinken
- Automatisch pushen. `git push` auf `main` nur auf explizite User-Anweisung.

## Task-Tracking (Beads)

`bd list`, `bd ready`, `bd show <id>`, `bd update <id> --status in_progress`, `bd close <id>`, `bd sync`. Cross-Repo-Themen in GitHub Projects.
