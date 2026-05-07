# kombify Documentation (Public)

Tier-1 Public Documentation fuer die kombify-Plattform, gebaut mit [Mintlify](https://mintlify.com/).

**Live:** https://docs.kombify.io

Teil der 3-Tier-Doku-Architektur (siehe `kombify Core/standards/DOCS_STANDARDS.md`):
- **Tier 1 (dieses Repo):** Public Docs fuer Endnutzer und Selbst-Hoster
- **Tier 2:** `kombify Core/internal-docs/` (interne technische Doku, MkDocs)
- **Tier 3:** Per-Repo `docs/` je Tool (tool-spezifische Interna)

## Struktur (Ist-Zustand)

Top-Level-Ordner spiegeln Mintlify-Tabs (siehe `docs.json`):

| Ordner | Zweck |
|---|---|
| `ai/`, `ai-tools/` | kombify-AI + AI-Tool-Integrationen (Claude Code, Cursor, Windsurf) |
| `api/` | API Reference (`kombifyai`, `kombifycloud`, `kombifysim`, `kombifytechstack`) |
| `api-reference/` | OpenAPI / API-Dokumentation |
| `cloud/` | kombify Cloud Portal (SaaS) |
| `comparisons/` | vs. Portainer, Proxmox etc. |
| `concepts/` | Hybrid Infrastructure, Simulation-first, Spec-driven, StackKits-Modell |
| `faq/`, `glossary/` | FAQ + Begriffe |
| `guides/` | How-To Guides (Auth, Deployment, Self-Hosting, StackKits, Troubleshooting) |
| `integrations/` | Auth0, Coolify, Proxmox |
| `sim/` | kombify-Sim (OSS Tool) |
| `stack/` | kombify-TechStack (OSS Tool) |
| `stackkits/` | kombify-StackKits (OSS Tool) |
| `_templates/` | MDX-Vorlagen fuer neue Seiten (nicht publiziert) |
| `images/`, `logo/` | Assets |

Einstiegsseiten: `index.mdx`, `introduction.mdx`, `quickstart.mdx`, `quickstart-selfhosted.mdx`, `ecosystem.mdx`, `community.mdx`, `changelog.mdx`.

## Dev-Setup

Voraussetzungen: Node `>=24` (siehe `package.json` engines / `mise.toml`).

```bash
# Dependencies installieren
npm install

# Lokalen Preview-Server starten (Mintlify CLI als devDep / npx)
npm run dev
# laeuft auf http://localhost:3000

# Validierung & Quality-Checks
npm run validate   # frontmatter, links, navigation
npm run quality    # readability, SEO, code examples
npm test           # Playwright E2E
```

Bei 404-Fehlern Cache leeren:
```bash
npx mintlify dev --clear-cache
# oder
rm -rf .mintlify && npm run dev
```

## Schreibkonventionen

Folgt `kombify Core/standards/DOCS_STANDARDS.md` Section 1 (Tier 1):
- Diataxis-inspiriertes 4-Level-Modell pro Tool (Overview / How-To / Explanation / Reference)
- MDX-Frontmatter (`title`, `description`) Pflicht
- Second-person Voice ("you", nicht "we")
- Sentence-case Headings
- Code-Bloecke mit Language-Tag
- Mintlify-Komponenten: `<Card>`, `<CardGroup>`, `<Steps>`, `<Tabs>`, `<Note>`, `<Warning>`, `<CodeGroup>`
- Brand: immer "kombify" (lowercase k)
- Keine Internal-URLs, keine Secrets

Produkt-Ebenen-Trennung: siehe `kombify Core/standards/PRODUCT-SEGMENTATION.md`.

## Repo-Meta

- **Status:** `STATUS.md` (aktueller Stand, Was funktioniert, Known Issues)
- **Plan:** `ROADMAP.md` (geplante Inhalte)
- **AI-Kontext:** `CLAUDE.md` + `AGENTS.md`
- **Task-Tracking:** [Beads](https://github.com/stigraven/beads) (`.beads/`) fuer Repo-lokale Tasks
- **Slash-Commands:** `.claude/commands/` (Mintlify-spezifische Automation: new-page, validate, update-nav, etc.)

## Publishing

Push auf `main` triggert Mintlify-Deploy automatisch. Verification: https://docs.kombify.io.

Changelog-Eintraege in `changelog.mdx` pflegen.

## Lizenz

Siehe `LICENSE`. Doku-Content folgt derselben Lizenz wie die beschriebenen Komponenten.
