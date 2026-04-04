# kombify Documentation Standards

**Last updated**: 2026-03-31
**Owner**: kombify Core team
**Applies to**: All kombify repositories
**Location**: `kombify Core/standards/DOCS_STANDARDS.md` (canonical)

---

## Documentation Architecture Overview

kombify documentation is organized into **three tiers** with clear ownership and audience:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TIER 1: PUBLIC (Mintlify — docs repo)            │
│                                                                     │
│  Level 1: Overview & Quick Start — per tool                         │
│  Level 2: How-To Guides — grundlegende Konzepte, nicht-technisch    │
│  Level 3: Explanations — fortgeschrittene Homelab-Konzepte          │
│  Level 4: Reference — API, Funktionsreferenz, FAQ                   │
│  Excalidraw: Selected architecture diagrams (exported as images)    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│           TIER 2: INTERNAL (MkDocs — kombify Core/internal-docs/)   │
│                                                                     │
│  Complete platform documentation: architecture, tools, operations,  │
│  deployment workflows, CI/CD, standards, dependencies, ADRs,        │
│  Excalidraw diagrams gallery, work processes, runbooks              │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│           TIER 3: PER-REPO (docs/ folder in each tool repo)         │
│                                                                     │
│  Tool-specific: ADRs, dev setup, architecture, deployment,          │
│  testing, configuration, API surface                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Key principle**: Information flows DOWN, never UP.
- Tier 1 (public) contains only user-facing content
- Tier 2 (internal) is the complete technical truth
- Tier 3 (per-repo) contains tool-specific details that supplement Tier 2

---

## 1. Tier 1 — Public Documentation (Mintlify)

**Repository**: separate `docs` repo
**URL**: `docs.kombify.io`
**Audience**: Users, evaluators, self-hosters, integrators

### Content Levels (Diataxis-inspired)

Public docs follow a 4-level model that progressively deepens the technical detail. Each tool section in Mintlify mirrors this structure.

#### Level 1 — Overview & Quick Start

The entry point for each tool and the platform as a whole. Answers "What is this?" and "How do I get started in 5 minutes?"

| Content | Pages | Purpose |
|---------|-------|---------|
| Platform overview | `index.mdx` | What kombify is and why it exists |
| Tool ecosystem | `ecosystem.mdx` | How Stack, Sim, StackKits, Cloud connect |
| Per-tool overview | `stack/index.mdx`, `sim/index.mdx`, etc. | What each tool does, key features |
| Quick Start | `stack/quickstart.mdx`, `sim/quickstart.mdx`, etc. | First project in under 10 minutes |
| Comparison pages | `comparisons/*` | vs Portainer, vs Proxmox, etc. |

**Tone**: Marketing-friendly but honest. "Here's what you get and how to try it."
**Rule**: Minimal technical detail, Docker Compose is the deepest it goes.

**Public URLs** (maintained by Coolify):
- `kombify.io` — primary public surface
- `app.kombify.io` — portal alias when active
- `techstack.kombify.io` — Stack app
- `simulate.kombify.io` — Sim app
- `stackkits.kombify.io` — StackKits marketing
- `api.kombify.io` — API gateway

#### Level 2 — How-To Guides (Non-Technical)

Task-oriented guides for users who know what they want to do but need step-by-step instructions. Explains basic concepts without assuming technical background.

| Section | Content | Audience |
|---------|---------|----------|
| Getting Started | SaaS onboarding, first project setup | New users |
| Cloud Portal | Dashboard navigation, tool launcher, teams, billing | SaaS users |
| Stack Guides | Creating stacks, configuration wizard, templates | Stack users |
| Sim Guides | Running simulations, choosing engines, templates | Sim users |
| StackKits Guides | Choosing kits, customization basics, applying kits | Kit users |
| Self-Hosting Basics | High-level setup, Docker Compose, requirements | Evaluators |
| Troubleshooting | Common issues, FAQ per tool | All users |

**Tone**: Friendly, task-oriented. "Here's how to do X."
**Rule**: No source code, no architecture diagrams, no internal details. Screenshots and UI walkthroughs are encouraged.

#### Level 3 — Explanations (Fortgeschrittene Konzepte)

Concept-oriented content for users who want to understand *why* things work the way they do. Covers Homelab standards, architecture decisions, and best practices with alternatives.

| Section | Content | Audience |
|---------|---------|----------|
| Homelab Standards | Why we deploy this way, security model, network design | Self-hosters |
| Architecture Concepts | Spec-driven design, Unifier, CUE, provisioning flow | Contributors |
| Deployment Models | SaaS vs. self-hosted vs. hybrid, trade-offs | Power users |
| Infrastructure Patterns | DNS setup, reverse proxy, TLS, multi-node | Homelab operators |
| Custom Setups | Multi-node clusters, hybrid cloud, custom engines | Power users |
| Security Concepts | Zero-trust approach, secrets management, identity | Security-aware users |

**Tone**: Educational, explaining *why* not just *how*. "Here's why we do X, and here are alternatives."
**Rule**: Conceptual depth is welcome, but no internal implementation details. Excalidraw architecture diagrams (exported from Tier 2) are encouraged here.

#### Level 4 — Reference (Technische Dokumentation)

Fact-oriented reference documentation for developers, integrators, and advanced operators.

| Section | Content | Audience |
|---------|---------|----------|
| API Reference | REST/gRPC endpoints, authentication, SDKs | Integrators |
| Configuration Reference | All env vars, advanced config options per tool | Operators |
| CLI Reference | Command-line tools, flags, output formats | Developers |
| Function Reference | SDK methods, types, return values | SDK users |
| Glossary | Platform-specific terminology | All users |
| FAQ | Frequently asked questions, organized by topic | All users |
| Release Notes | Version history, breaking changes, migration guides | Operators |

**Tone**: Precise, technical, scannable. Code examples, tables, reference lists.
**Rule**: Pure reference — no tutorials, no opinions. Link to Level 2 (How-To) or Level 3 (Explanation) for context.

### Mintlify Navigation Structure

```json
{
  "tabs": [
    { "tab": "Overview",      "icon": "house"         },
    { "tab": "Guides",        "icon": "book"          },
    { "tab": "Stack",         "icon": "server"        },
    { "tab": "Sim",           "icon": "flask"         },
    { "tab": "StackKits",     "icon": "boxes-stacked" },
    { "tab": "Cloud",         "icon": "cloud"         },
    { "tab": "Concepts",      "icon": "lightbulb"     },
    { "tab": "API Reference", "icon": "code"          }
  ]
}
```

Each tool tab mirrors the 4-level structure internally:
- **Overview tab**: Level 1 (platform overview, ecosystem, comparisons)
- **Guides tab**: Level 2 (getting started, how-tos, self-hosting basics)
- **Tool tabs** (Stack/Sim/StackKits/Cloud): Level 1 overview + Level 2 how-tos per tool
- **Concepts tab**: Level 3 (architecture explanations, homelab standards, deployment models)
- **API Reference tab**: Level 4 (reference documentation, config, FAQ)

### Mintlify Writing Rules

1. Every `.mdx` file starts with frontmatter (`title`, `description`)
2. Second-person voice ("you", not "we")
3. Sentence-case headings
4. All code blocks have language tags
5. Internal links use relative paths without `.mdx`
6. Use Mintlify components: `<Card>`, `<Steps>`, `<Tabs>`, `<Note>`, `<Warning>`
7. Brand: always "kombify" (lowercase k)

---

## 2. Tier 2 — Internal Documentation (MkDocs)

**Repository**: `kombify Core` → `internal-docs/`
**URL**: Served locally via `mkdocs serve` or on internal domain
**Audience**: kombify developers, operators
**Theme**: Material for MkDocs (dark/light toggle)

This is the **complete technical truth** for the kombify platform. Everything that a developer or operator needs to understand, deploy, operate, or extend kombify lives here.

### Content Scope

Internal docs cover these areas comprehensively:

| Section | What it contains | Examples |
|---------|-----------------|----------|
| **Getting Started** | Onboarding, environment setup, repo map, coding standards | How to set up a dev machine, how packages work |
| **Architecture** | Platform design, system landscape, data flows, security, ADRs | Status quo, tool boundaries, API contracts, identity architecture |
| **API Reference** | Complete API surface for all tools | Stack, Sim, StackKits endpoints with auth details |
| **Tools** | Deep internals for each tool | Architecture, configuration, feature targets per tool |
| **Infrastructure** | Server landscape, DNS/routing, CI/CD, environments | IONOS/Hostinger setup, Cloudflare, GitHub Actions |
| **Operations** | Deployment, monitoring, runbooks, recovery, updates | How to deploy each tool, incident response, DB ops |
| **Dependencies** | Go modules, npm packages, external services | Zitadel, Stripe, Doppler integration details |
| **Standards** | URL standards, health contracts, API design, testing | Platform-wide conventions enforced across repos |
| **Diagrams Gallery** | All Excalidraw architecture diagrams | Platform overview, tool interactions, deployment flows |

### Diagrams and Excalidraw

Excalidraw diagrams are a first-class part of internal documentation:

- Source `.excalidraw` files live in `architecture/excalidraw/` (maintained by the daily architecture workflow)
- The **Diagrams Gallery** page (`diagrams-gallery.md`) embeds all current diagrams
- Diagrams are rendered as embedded images (PNG/SVG exports) in MkDocs pages
- Selected diagrams may be promoted to Tier 1 (Mintlify) as exported images

### Work Processes and Workflows

Internal docs MUST document the established work processes:

| Process | Location in MkDocs | Description |
|---------|-------------------|-------------|
| Deployment workflows | operations/ | How each tool gets from code to production (CI → Build → Deploy) |
| Scheduled automations | operations/ | Daily/weekly automated tasks (docs review, drift check, research, etc.) |
| Planning process | getting-started/ | 3-tier planning: GitHub Projects → Craft → Beads |
| Release process | standards/ | How versions are cut, published, deployed |
| Secrets management | standards/ | Doppler workflow, per-repo configs |
| Incident response | operations/ | Recovery runbooks, escalation paths |
| Code review process | standards/ | Review expectations, merge criteria |
| Documentation review | standards/ | How the daily docs-review workflow operates |

### MkDocs Configuration

- **Theme**: Material for MkDocs (dark/light toggle)
- **Language**: English (primary)
- **Features**: Instant navigation, code copy, search, Mermaid diagrams, tabs
- **Plugins**: Search, tags
- **Custom fences**: Mermaid diagram rendering

---

## 3. Tier 3 — Per-Repo Documentation

Each core tool repository (Stack, Sim, StackKits, Cloud, Gateway, DB, AI) must maintain a standardized `docs/` folder for tool-specific internal documentation.

**Important**: kombify Core does NOT have a `docs/` folder. All Core documentation lives in `internal-docs/` (Tier 2) and `standards/`.

### Required Files

Every core tool repo must have:

```
<repo>/
├── README.md                       # Public-facing repo overview
├── CONTRIBUTING.md                  # How to contribute
├── CHANGELOG.md                     # Version history
├── CLAUDE.md                        # AI agent instructions (repo-specific only)
├── docs/
│   ├── README.md                    # Docs index / table of contents
│   ├── DEVELOPMENT.md               # Dev environment setup
│   ├── ARCHITECTURE.md              # Tool architecture overview
│   ├── DEPLOYMENT.md                # How to deploy this tool
│   ├── TESTING.md                   # Testing strategy + how to run
│   ├── API.md                       # API surface (if applicable)
│   ├── CONFIGURATION.md             # All config options / env vars
│   └── ADR/                         # Architecture Decision Records
│       └── 001-template.md          # ADR template
```

### Optional Files (as needed)

```
docs/
├── DEPENDENCIES.md                  # External dependency details
├── SECURITY.md                      # Security considerations
├── MIGRATION.md                     # Migration guides
├── ROADMAP.md                       # Tool-specific roadmap
├── TROUBLESHOOTING.md               # Common issues + fixes
├── plans/                           # Implementation plans / design plans
└── reviews/                         # Audits, reviews, assessment docs
```

### README.md Template for Tool Repos

```markdown
# kombify {Tool Name}

{One-line description of what this tool does.}

**Part of the [kombify](https://kombify.io) platform.**

## What is kombify {Tool Name}?

{2-3 sentences explaining the tool's purpose and value.}

## Quick Start

{Minimal steps to get running — Docker preferred.}

## Documentation

| Resource | Link |
|----------|------|
| User Guide | [docs.kombify.io/{tool}](https://docs.kombify.io/{tool}) |
| API Reference | [docs.kombify.io/api/{tool}](https://docs.kombify.io/api/{tool}) |
| Development Setup | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

## License

{License info}
```

---

## 4. Planning & Task Tracking

Planning is intentionally split across three systems:

| Layer | System | Purpose |
|------|--------|---------|
| High-level | GitHub Projects | Cross-repo roadmap and portfolio tracking for kombify tools |
| Mid-level | Craft | Initiative notes, working context, and cross-repo breakdowns |
| Detailed execution | Beads (`.beads/`) | Repo-local tasks, subtasks, blockers, and execution history |

Rules:

- GitHub Projects is the canonical high-level planning layer.
- Craft is the canonical mid-level note and coordination layer.
- Beads is the canonical detailed task tracker inside each repo.
- Repo docs may contain implementation plans, ADRs, audits, and roadmaps.
- Repo docs are not the canonical active backlog if the same work is already tracked in Beads.

## 5. Cross-Reference Rules

### Where content lives

| Content Type | Location | Format |
|-------------|----------|--------|
| User guides, quickstarts | `docs` repo (Mintlify) | MDX |
| API reference (public) | `docs` repo (Mintlify) | MDX |
| Platform architecture (public) | `docs` repo (Mintlify) Level 2 | MDX |
| Platform architecture (complete) | `kombify Core/internal-docs/docs/architecture/` | Markdown |
| Excalidraw source files | `architecture/excalidraw/` | .excalidraw |
| Dev setup per tool | Tool repo `docs/DEVELOPMENT.md` | Markdown |
| Tool architecture | Tool repo `docs/ARCHITECTURE.md` | Markdown |
| Deployment runbooks | `kombify Core/internal-docs/docs/operations/` | Markdown |
| Tool deployment | Tool repo `docs/DEPLOYMENT.md` | Markdown |
| ADRs (tool-specific) | Tool repo `docs/ADR/` | Markdown |
| ADRs (cross-cutting) | `kombify Core/internal-docs/docs/architecture/decisions/` | Markdown |
| Development standards | `kombify Core/standards/DEVELOPMENT-STANDARDS.md` | Markdown |
| Documentation standards | `kombify Core/standards/DOCS_STANDARDS.md` | Markdown |
| Work processes | `kombify Core/internal-docs/docs/operations/` | Markdown |
| High-level roadmap | GitHub Projects | GitHub Project items |
| Mid-level initiative notes | Craft | Craft documents / notes |
| Detailed repo execution tasks | Repo `.beads/` | Beads issue data |

### Linking conventions

- Public docs (Mintlify) link to each other via relative paths (no `.mdx` extension)
- Public docs NEVER link to internal docs
- Internal docs (MkDocs) MAY link to public docs via full URL
- Per-repo docs link to public docs and internal docs via full URLs
- Each repo's README.md links to both public docs and local `docs/`

---

## 6. Naming and Brand Conventions

| Item | Correct | Incorrect |
|------|---------|-----------|
| Platform name | kombify | Kombify, KOMBIFY |
| Stack tool | kombify-TechStack | KombiStack, kombistack, kombify Stack |
| Sim tool | kombify Sim | KombiSim, kombisim |
| StackKits tool | kombify StackKits | Kombify stackkits |
| Cloud portal | kombify Cloud | KombiCloud |
| Config file | `kombination.yaml` | kombistack.yaml |
| API Gateway | kombify API | KombiAPI |

---

## 7. File Quality Checklist

Before merging documentation changes:

- [ ] Frontmatter present (MDX) or heading structure correct (MD)
- [ ] No broken internal links
- [ ] Code blocks have language tags
- [ ] Images have alt text
- [ ] Brand names use correct casing (Section 6)
- [ ] Content is in the right tier (public vs internal vs per-repo)
- [ ] No internal URLs/secrets in public docs
- [ ] Excalidraw diagrams exported if referenced in Markdown
- [ ] Spell-checked

---

## 8. Automated Documentation Review

The `kombify-docs-review` scheduled workflow runs daily at 21:00 and validates documentation against this standard and DEVELOPMENT-STANDARDS.md.

It checks:
- **Erreichbarkeit**: HTTP status of all public endpoints (.io and .space)
- **Required Files**: Per-repo compliance with Section 3
- **Brand/Naming**: Section 6 compliance across all repos
- **Versions**: Consistency of Go, Node, PostgreSQL, Bun versions
- **Link integrity**: Broken internal references
- **File quality**: Section 7 checklist items
- **Content placement**: Section 5 compliance
- **Cross-repo consistency**: Contradictions between repos

Results are logged in `architecture/DOCS_REVIEW_LOG.md` with per-date reports.
