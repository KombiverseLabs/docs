# ROADMAP — mintlify-docs

Geplante Arbeiten. Ist-Zustand lebt in `STATUS.md`.

## P0 (aktiv, naechste Session)

### Content-Aktualitaet nach Auth0- und Cloudflare-Cutover
- **Auth0:** Alle Guides unter `guides/auth/*` gegen aktuellen Auth0-Flow pruefen. Universal Login als Default dokumentiert? SSO-Integration aktuell?
- **Cloudflare Edge:** Public docs bleiben Cloudflare-Edge-first. Keine aktiven MDX-Seiten duerfen Kong als aktuellen Public-API-Pfad darstellen (Cloudflare Edge ist kanonisch).
- **Verantwortlich:** koordiniert mit Core-Standards-Aenderungen (siehe PLATFORM-ARCHITECTURE §2 Decisions 1+2).
- **Aufwand:** 3-5h.

### Code-vs-Doc-Gap bei Tool-Naming schliessen
- Nach Audits der Tool-Repos (kombify-TechStack, kombify-Sim) entscheiden, ob alte code-level Identifier (`kombistack.yaml`, `KOMBISTACK_PORT`, Docker-Service `kombisim`) umbenannt oder beibehalten werden.
- Danach alle MDX-Referenzen synchronisieren: `quickstart-selfhosted.mdx`, `changelog.mdx` (historisch), ggf. weitere.
- **Aufwand:** 2-3h (nach Tool-Repo-Audits).

## P1 (naechstes Quartal)

### Content-Gaps aus altem README abarbeiten
Historisch offene TODOs (Stand April 2026) bewerten, aktualisieren oder schliessen:
- API-Reference: Detailtiefe pro Tool pruefen, wo noetig OpenAPI-Spec hinterlegen.
- StackKits: Content-Aktualitaet (available-kits, creating-stackkits, cli-reference).
- Self-Hosting-Guides: end-to-end-Testung durch einen Self-Hoster.
- Screenshots: mehr UI-Walkthroughs.
- **Aufwand:** 10-15h verteilt.

### Diagram-Promotion aus Tier-2
Saturday-Workflow aus DOCS_STANDARDS §9 systematisieren: Excalidraw aus `kombify Core/internal-docs/diagrams/` nach `images/architecture/` exportieren. Welche Diagramme sind Tier-1-relevant?
- **Aufwand:** 2-3h initial, danach wiederkehrend.

### Redirects-Pflege
Nach jedem URL-Rename: `docs.json` → `redirects` aktualisieren. Monitoring via Mintlify-Analytics auf 404.
- **Aufwand:** kontinuierlich.

### Structured OpenAPI-Import
Wenn Gateway/Services OpenAPI-Specs publizieren, via Mintlify-OpenAPI-Integration importieren statt MDX handgepflegt.
- **Aufwand:** 4-6h pro Service.

## P2 (spaeter / explorativ)

### i18n (EN/DE)
Aktuell primaer EN mit vereinzelten DE-Stellen. Entscheidung ob voll-DE-Pfad oder EN-only.

### Community-Contributions
PR-Template, Contribution-Guide, Style-Linting (Vale?). Erst sinnvoll wenn externe Beitragende erwartet werden.

### Search-Analytics-Review
Mintlify Search-Analytics auswerten: welche Begriffe werden gesucht ohne Treffer? Content-Gap-Indikator.

## Explizit NICHT geplant

- Vermischung Tier 1 / Tier 2 (internal-docs bleibt separat, Aufgabe nicht "mergen")
- Rueckkehr zu alten Produkt-Namen (`kombistack`, `kombisphere`, etc.)
- Business-Content (Pricing-Strategie, Market-Analysis) im Repo
- Eigener Hosting-Stack statt Mintlify (Feature-Set reicht, Wartungs-Overhead nicht gerechtfertigt)
