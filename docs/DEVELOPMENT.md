---
title: Development
last_verified: 2026-06-08
---

# Development

How to run, build, and preview this docs site locally. This repo is a
**[Mintlify](https://mintlify.com/)** site; `docs.json` is the source of truth
for navigation. See [README.md](README.md) for the repo structure and
[TESTING.md](TESTING.md) for validation/quality gates.

**Prerequisites:** Node `>=24` and Bun `1.3.13` (pinned in `mise.toml`; also
`engines` in `package.json`). Run `mise install` to provision the toolchain.

<!-- auto-populated from package.json [scripts] + mise.toml [tasks.*]: verify and update -->

## npm scripts (`package.json`)

| Command | What it does |
|---|---|
| `npm run dev` | Start the Mintlify local preview server (`mintlify dev`) |
| `npm run build` | Build the static docs site (`mintlify build`) |
| `npm run report` | Run all validation + quality checks (`validate` + `quality`) |
| `npm run format` | Format `**/*.{js,ts,json,mdx}` with Prettier |
| `npm run typecheck` | TypeScript `tsc --noEmit` |
| `npm run changelog` | Regenerate `changelog.mdx` (`scripts/automation`) |

## mise tasks (`mise.toml`)

| Task | What it does |
|---|---|
| `mise run lint` | Lint/type checks (falls back to `typecheck` if no `lint`) |
| `mise run build` | Build project (`npm run build --if-present`) |
| `mise run check` | Fast local gate: `lint` + `test` + `build` |
| `mise run preview:local` | Local preview gate (depends on `build`) |
| `mise run preflight:quick` | Quick preflight without external deploy |
| `mise run preflight:release` | Release preflight: quick gate + local preview |
| `mise run preflight:deploy` | Hard deploy gate: clean git + writes preflight receipt |
| `mise run release:dispatch` | Dispatch remote release/deploy workflow for the preflighted SHA |

<!-- end auto-populated -->

## Adding a page

Every new `.mdx` page MUST be registered in `docs.json` → `navigation`, or it
404s. Use the `_templates/` MDX templates and the repo slash-commands
(`.claude/commands/`: `/new-page`, `/update-nav`). Brand naming is `kombify`
(lowercase k); writing rules live in `kombify Core/standards/DOCS_STANDARDS.md`.
