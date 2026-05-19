---
title: docs Roadmap
last_verified: 2026-05-17
roadmap_standard: kombify-roadmap@v1
generator: kombify-roadmap-sync@v1
notion_repo_id: 35e1bfc2-ddb7-813b-8dfb-f1323ab7bc0f
track: v0-expansion
---

# docs Roadmap

## Current Focus
- **Target:** v0.4.0 - Public Docs Content Contract Repair
- **Outcome:** Public Mintlify docs reflect the current Auth0, Cloudflare Edge, Tool naming, StackKits, Techstack, and Simulate contracts without mixing in legacy planning prose.
- **Exit gate:** Active public docs no longer send users toward retired routes, stale names, or unverified Monthly Runtime flows.
- **Blocking bugs:** Beads label `blocks:v0.4.0`

## Expansion Track

| Version | Stage | State | Outcome |
|---|---|---|---|
| v0.1.0 | Mintlify Baseline | done | Public docs structure, navigation, quickstarts, and core guides exist. |
| v0.2.0 | Product Coverage | done | StackKits, Cloud, Simulate, AI, integrations, comparisons, and API reference sections exist. |
| v0.3.0 | Public Edge Cutover | partial | Cloudflare Edge, Auth0, and renamed product paths are represented but not fully reconciled. |
| v0.4.0 | Public Docs Content Contract Repair | current | Auth0, Cloudflare Edge, Tool naming, Monthly Runtime, and StackKits content match current product contracts. |
| v0.5.0 | Release And Rebuild Reliability | planned | Docs validation, screenshots, redirects, orphan checks, and deploy metadata are reliable. |
| v0.6.0 | API Reference Integration | planned | Gateway and service OpenAPI specs feed docs instead of hand-maintained stale API prose. |
| v0.7.0 | Self Hosting And Monthly Runtime Proof | planned | Self-hosting and Monthly Runtime guides are validated from real internal E2E evidence. |
| v0.8.0 | Discovery And Search Quality | planned | Search analytics, sitemap, redirects, and content gaps drive repeatable docs maintenance. |

## v0.4.0 - Public Docs Content Contract Repair

**Scope**
- [ ] Review `guides/auth/*` and integrations material against the current Auth0 Universal Login and SSO flow.
- [ ] Review Cloudflare Edge docs so active MDX pages do not present Kong as the current public API path.
- [ ] Reconcile tool naming in quickstarts, changelog, and tool docs after repo audits decide whether old code-level identifiers remain.
- [ ] Update StackKits docs for Base Kit, Node Hub, services, and local `*.home.localhost` behavior without overclaiming managed L3 support.
- [ ] Update Techstack docs so Monthly Runtime is described as the product control-plane model, not a finished stable release.
- [ ] Update Simulate docs so managed/BYOK and permanent/one-time runtime terminology matches the current provider boundary.
- [ ] Move remaining useful legacy P0/P1/P2 roadmap detail into Beads or Notion instead of keeping dated priority blocks.
- [ ] Keep business, pricing, and market strategy out of the public docs repo.
- [ ] Add or update Beads blockers with `bug` + `blocks:v0.4.0` for public-doc correctness issues that block this milestone.
- [ ] Preserve historical changelog wording only when it is clearly historical.
- [ ] Validate docs navigation after content moves or page deletions.
- [ ] Keep internal Core standards references as source context, not as public-doc implementation detail.

**Exit gate**
- [ ] Active Auth0 docs match the current login and SSO model.
- [ ] Active Cloudflare Edge docs no longer point users to retired Kong public API paths.
- [ ] Tool naming is consistent or explicitly marked historical.
- [ ] Monthly Runtime and StackKits docs do not overclaim unproven runtime or managed app-layer behavior.
- [ ] Navigation validation passes after page moves.
- [ ] No open P0/P1 Beads bugs with `blocks:v0.4.0`

## v0.5.0 - Release And Rebuild Reliability

**Scope**
- [ ] Make docs validation, orphan checks, code example validation, and Mintlify navigation checks reliable in the existing GitHub Actions path.
- [ ] Verify screenshot update workflow ownership and failure reporting.
- [ ] Keep redirects updated after page renames and removals.
- [ ] Add deploy metadata or build receipt checks so operators can identify the published docs commit.
- [ ] Add a docs health check that catches missing pages, broken internal links, and stale redirects.
- [ ] Define how public docs changes are coordinated with Core standards and product repo roadmap changes.
- [ ] Keep docs deploy and health checks on GitHub Actions unless explicitly changed.
- [ ] Track recurring docs maintenance tasks in Beads instead of reopening roadmap priority blocks.

**Exit gate**
- [ ] Existing GitHub Actions docs validation path is green or has explicit external blockers.
- [ ] Redirects are updated for renamed and removed public pages.
- [ ] Published docs commit or build receipt is inspectable.
- [ ] Broken links and orphaned pages are caught before publish where tooling allows.
- [ ] No open P0/P1 Beads bugs with `blocks:v0.5.0`

## V1 Definition
- **State:** Uncommitted.
- **Known prerequisites:** Public docs need stable Auth0, Cloudflare Edge, StackKits, Techstack, Simulate, API reference, validation, redirects, search, and deploy-health behavior before any stable docs contract is meaningful.
- **Open questions:** Which product repos own public docs source material, how often docs are audited, how OpenAPI imports are generated, and whether German content remains partial or becomes a supported locale.

## Later
- **v0.6.0:** Replace hand-maintained API reference gaps with service OpenAPI imports.
- **v0.7.0:** Validate self-hosting and Monthly Runtime guides against real internal E2E evidence.
- **v0.8.0:** Use search analytics, redirects, and sitemap checks to drive maintenance.

## Not Planned
- **Tier 1 and Tier 2 merge:** Internal docs and public docs stay separate.
- **Old product-name revival:** Retired names stay historical only.
- **Business strategy in public docs:** Pricing strategy, market analysis, and internal planning stay outside this repo.
- **Mintlify replacement:** Hosting stack changes are not part of the current docs roadmap.
