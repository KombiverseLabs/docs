---
title: Testing
last_verified: 2026-06-08
---

# Testing

How the docs build is validated. Tooling is **[Mintlify](https://mintlify.com/)**
(build) plus **[Playwright](https://playwright.dev/)** (E2E) and Node-based
validators under `scripts/`. See [DEVELOPMENT.md](DEVELOPMENT.md) for the run/build
commands and [README.md](README.md) for repo structure.

<!-- auto-populated from package.json [scripts]: verify and update -->

## Test, lint & validation commands

| Command | What it validates |
|---|---|
| `npm test` | Playwright E2E suite (`playwright.config.ts`) |
| `npm run test:chromium` / `:firefox` / `:webkit` | Single-browser E2E run |
| `npm run lint` | ESLint over `scripts/**/*.js`, `tests/**/*.ts` |
| `npm run typecheck` | TypeScript `tsc --noEmit` |
| `npm run validate` | Frontmatter + links + navigation (composite) |
| `npm run validate:frontmatter` | `scripts/validate-frontmatter.js` |
| `npm run validate:links` | Internal link check (`scripts/check-links.js`) |
| `npm run validate:orphans` | Orphaned-page check (`scripts/check-orphaned-pages.js`) |
| `npm run validate:navigation` | Nav coverage vs `docs.json` |
| `npm run quality` | Readability + SEO + code-example validation (composite) |
| `npm run quality:links-external` | External-link liveness check |
| `npm run report` | Full gate: `validate` + `quality` |

<!-- end auto-populated -->

## Local gate (LOCAL-E2E-DEPLOYMENT-STANDARD)

Per the workspace `LOCAL-E2E-DEPLOYMENT-STANDARD.md`, run the local gate before
any deploy — CI never replaces it. The `mise.toml` preflight chain enforces this:

- `mise run check` — fast gate (`lint` + `test` + `build`).
- `mise run preflight:release` — quick gate + local preview.
- `mise run preflight:deploy` — hard gate: requires clean git state and writes a
  local preflight receipt before remote dispatch.

A green `npm run report` plus `mise run preflight:release` is the minimum before
pushing. Deploy is blocked if the local gate is missing or red.
