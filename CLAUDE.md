# CLAUDE.md — mintlify-docs

**Repo-Typ:** Docs-only (Mintlify Tier 1, Public).
**Live:** https://docs.kombify.io

## Normative Quellen (Core)

Immer Core-Standards konsultieren, nicht duplizieren:

- [DOCS_STANDARDS.md](../kombify%20Core/standards/DOCS_STANDARDS.md) — 3-Tier-Doku-Modell, Diataxis-4-Level, Writing-Rules. Section 1 gilt fuer dieses Repo.
- [PRODUCT-SEGMENTATION.md](../kombify%20Core/standards/PRODUCT-SEGMENTATION.md) — Tools/SaaS/Homelab-Trennung. Bindend fuer Content-Entscheidungen (Feature-Gating? Nein. Pricing-Lock in Tools? Nein.).
- [DEVELOPMENT-STANDARDS.md](../kombify%20Core/standards/DEVELOPMENT-STANDARDS.md) — Repo-Konventionen, Brand/Naming (Section 6 von DOCS_STANDARDS).
- [PLATFORM-ARCHITECTURE.md](../kombify%20Core/standards/PLATFORM-ARCHITECTURE.md) — Systemlandkarte fuer technische Hintergrund-Konsistenz.
- [REPO-FILE-SCHEMA.md](../kombify%20Core/standards/REPO-FILE-SCHEMA.md) — 4+1-Schema, Pflicht-Files im Repo-Root.

## Repo-spezifische Regeln

- **Mintlify-Plattform:** `docs.json` ist Source of Truth fuer Nav. Jede neue Seite muss dort registriert werden, sonst 404.
- **Brand-Naming (Pflicht):** `kombify` lowercase, Tool-Namen wie in `PRODUCT-SEGMENTATION.md`. Keine Altnamen (`kombistack`, `kombisphere`, `kombisim`).
- **API-URL-Segmente:** `api/kombifyai/`, `api/kombifycloud/`, `api/kombifysim/`, `api/kombifytechstack/`. Alte Segmente (`kombistack`, `kombisim`, `kombisphere`) per `docs.json` → `redirects` abgefangen.
- **Tier-Disziplin:** Kein internal-only Content hier (das lebt in `kombify Core/internal-docs/`). Keine repo-spezifischen Interna (die leben in `<tool>/docs/` pro Tool-Repo, siehe Tier 3).
- **Images:** SVGs werden aus `kombify Core/internal-docs/diagrams/` manuell promoted nach `images/architecture/`. Saturday-Workflow (siehe DOCS_STANDARDS §9).
- **Task-Tracking:** Beads (`.beads/`) fuer Repo-lokale Tasks. Cross-Repo-Themen in GitHub Projects.

## Slash-Commands (`.claude/commands/`)

Repo-lokale Mintlify-Automation:
- `/new-page` — neue MDX-Seite nach Template anlegen + Nav registrieren
- `/update-nav` — `docs.json`-Navigation konsistent halten
- `/validate` — Link-Check, Schema-Validierung, Brand-Check
- `/review-page` — Content-Review-Workflow
- `/add-api-docs` — API-Endpoint in `api/` ergaenzen
- `/fill-navigation-gaps` — fehlende Seiten in Nav identifizieren
- `/sync-from-notes` — aus internen Notes publikationsreife MDX ableiten

## Out-of-Scope

- Keine Source-Code-Dokumentation (die gehoert in Tool-Repos `docs/`)
- Keine interne Architektur-Diskussion (das ist Tier 2 in Core/internal-docs)
- Keine Business-Content (Pricing-Strategie, Markt-Analyse) im Repo — lebt in Notion/Craft
