---
title: Docs — Contributor Guide
last_verified: 2026-06-08
---

# Docs — Contributor Guide

Contributor-facing documentation for the kombify docs site. The published site
is a [Mintlify](https://mintlify.com) project: `docs.json` (repo root) is the
navigation + deploy source of truth, and content lives in `.mdx` files.

## Contents

| Doc | Purpose |
|-----|---------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Run, build, and preview the docs site locally |
| [TESTING.md](TESTING.md) | Validate the build, links, and content quality |

## Site structure

- `docs.json` — navigation, theming, and deploy config (Mintlify reads this).
- `.mdx` content pages, registered in `docs.json` to appear in the nav.
- The repo root is the docs root; this `docs/` folder holds contributor meta-docs.
