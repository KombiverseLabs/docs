# kombify-test: Central Screenshot Review Center

**Date:** 2026-05-25
**Status:** Approved
**Author:** Marcel + Claude

## Problem

kombify has 17+ tool repos, each with their own Playwright test suites producing screenshots against production URLs. There is no central place to review all screenshot evidence across the platform. Reviewing test results requires navigating into each repo individually.

## Decision

Create `kombify-test` — a lightweight SvelteKit dashboard that reads screenshots directly from sibling tool repos via filesystem. Zero copies, zero storage duplication. Always live.

## Architecture

### Core Principle: Viewer Only

kombify-test owns zero test logic and zero screenshot storage. It is a pure viewer that reads from the filesystem paths where tool repos deposit their Playwright output.

```
kombify-Cloud/screenshots/latest/     ← Playwright writes here
kombify-Techstack/screenshots/latest/ ← Playwright writes here
kombify-Desk/screenshots/latest/      ← Playwright writes here
  ...
kombify-test/dashboard/               ← SvelteKit reads from all of the above
```

### Screenshot Contract (Tool Repos)

Every participating tool repo MUST provide:

```
<repo>/screenshots/latest/
  ├── manifest.json
  ├── <name>.png
  └── ...
```

#### manifest.json Schema

```json
{
  "repo": "kombify-Cloud",
  "tested_at": "2026-05-25T10:30:00Z",
  "base_url": "https://kombify.io",
  "playwright_version": "1.50.0",
  "viewport_default": { "width": 1280, "height": 720 },
  "screenshots": [
    {
      "name": "homepage-desktop",
      "file": "homepage-desktop.png",
      "url": "/",
      "viewport": { "width": 1280, "height": 720 },
      "theme": "light",
      "status": "captured",
      "description": "Homepage above-the-fold, desktop viewport"
    }
  ]
}
```

**Field rules:**
- `name`: kebab-case, unique within manifest. Pattern: `<page>-<viewport>[-<variant>]`
- `file`: filename relative to `screenshots/latest/`
- `url`: path relative to `base_url`
- `viewport`: explicit per screenshot (overrides `viewport_default` if different)
- `theme`: `"light"` | `"dark"` | omit if not applicable
- `status`: `"captured"` (screenshot taken) | `"failed"` (page load or assertion failed) | `"skipped"`
- `description`: one-line human-readable purpose

#### Screenshot Naming Convention

```
<page>-<viewport>[-<variant>].png

Examples:
  homepage-desktop.png
  homepage-mobile.png
  homepage-desktop-dark.png
  dashboard-desktop-logged-in.png
  pricing-tablet.png
```

Viewports: `desktop` (1280x720), `tablet` (768x1024), `mobile` (375x667).

#### .gitignore Rule for Tool Repos

```gitignore
# Screenshots are test artifacts, not source code
# They get regenerated on every test run
screenshots/latest/*.png

# Manifest IS committed (defines what should be tested)
!screenshots/latest/manifest.json
```

PNGs are gitignored — they exist only on the filesystem after a test run. The manifest.json IS committed because it defines the test contract.

### kombify-test Repo Structure

```
kombify-test/
  ├── CLAUDE.md
  ├── README.md
  ├── package.json
  ├── svelte.config.js
  ├── vite.config.ts
  ├── tsconfig.json
  ├── registry/
  │   └── tools.json              # Tool registry: IDs, names, paths
  ├── src/
  │   ├── app.html
  │   ├── app.css
  │   ├── lib/
  │   │   ├── types.ts            # Manifest + Registry TypeScript types
  │   │   ├── registry.ts         # Reads tools.json, resolves paths
  │   │   └── components/
  │   │       ├── ToolCard.svelte  # Overview tile per tool
  │   │       ├── ScreenshotGrid.svelte
  │   │       └── ScreenshotViewer.svelte  # Fullscreen lightbox
  │   └── routes/
  │       ├── +layout.svelte
  │       ├── +page.svelte                 # Overview: all tools grid
  │       ├── +page.server.ts              # Loads all manifests
  │       ├── [tool]/
  │       │   ├── +page.svelte             # Detail: all screenshots for one tool
  │       │   └── +page.server.ts          # Loads single manifest
  │       └── api/
  │           └── screenshots/[tool]/[file]/
  │               └── +server.ts           # Streams PNG from filesystem
  └── standards/
      └── SCREENSHOT-VALIDATION-STANDARD.md
```

### tools.json Registry

```json
{
  "tools": [
    {
      "id": "kombify-cloud",
      "name": "kombify Cloud",
      "repo_dir": "kombify-Cloud",
      "production_url": "https://kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-techstack",
      "name": "kombify Techstack",
      "repo_dir": "kombify-Techstack",
      "production_url": "https://techstack.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-desk",
      "name": "kombify Desk",
      "repo_dir": "kombify-Desk",
      "production_url": "https://desk.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-me",
      "name": "kombify Me",
      "repo_dir": "kombify-Me",
      "production_url": "https://me.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-simulate",
      "name": "kombify Simulate",
      "repo_dir": "kombify-simulate",
      "production_url": "https://simulate.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-blog",
      "name": "kombify Blog",
      "repo_dir": "kombify-Blog",
      "production_url": "https://blog.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-brand",
      "name": "kombify Brand",
      "repo_dir": "kombify-Brand",
      "production_url": "https://brand.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-gateway",
      "name": "kombify Gateway",
      "repo_dir": "kombify-Gateway",
      "production_url": "https://api.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-ai",
      "name": "kombify AI",
      "repo_dir": "kombify-AI",
      "production_url": "https://ai.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-stackkits",
      "name": "kombify StackKits",
      "repo_dir": "kombify-StackKits",
      "production_url": "https://stackkits.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-speechkit",
      "name": "kombify SpeechKit",
      "repo_dir": "kombify-SpeechKit",
      "production_url": "https://speechkit.kombify.io",
      "screenshots_path": "screenshots/latest"
    },
    {
      "id": "kombify-administration",
      "name": "kombify Administration",
      "repo_dir": "kombify-Administration",
      "production_url": "https://admin.kombify.io",
      "screenshots_path": "screenshots/latest"
    }
  ]
}
```

### API Route: Screenshot Streaming

`/api/screenshots/[tool]/[file]/+server.ts` resolves the tool ID via registry, constructs the filesystem path, and streams the PNG with correct content-type. Returns 404 if the file doesn't exist (test hasn't run yet).

Path resolution: `path.resolve(MONOREPO_ROOT, tool.repo_dir, tool.screenshots_path, file)`

Security: only serves files from registered tool paths, only `.png`/`.jpg`/`.webp` extensions, no path traversal.

### Dashboard Pages

**Overview (`/`):**
- Grid of ToolCards — one per registered tool
- Each card shows: tool name, production URL, first screenshot as thumbnail, `tested_at` timestamp, count of screenshots, count of failures
- Color-coded border: green (all captured), yellow (some skipped), red (any failed), gray (no test run yet)
- Click → navigates to detail page

**Detail (`/[tool]`):**
- Tool name + production URL as header
- `tested_at` + Playwright version
- Screenshot grid: all screenshots at readable size
- Click screenshot → lightbox with full-resolution image
- Metadata below each screenshot: URL tested, viewport, theme, status
- Back navigation to overview

### Refresh Behavior

- Page load fetches fresh manifest data (SvelteKit `+page.server.ts` reads from filesystem on every request in dev mode)
- No caching of screenshots — browser fetches fresh from API route
- Optional: `<meta http-equiv="refresh" content="30">` toggle for auto-refresh during active test runs

## What This Design Does NOT Cover

- **Test execution:** stays in tool repos, triggered by their own CI/scripts
- **Visual regression diffing:** tool repos handle their own `toHaveScreenshot()` comparisons
- **Remote/deployed access:** this is a local dev tool first. Deployment (e.g. to test.kombify.dev) is a future enhancement
- **Historical comparison:** shows only `latest/`. Screenshot history tracking is out of scope for v1
- **Auth:** none needed, internal tool

## Initial Rollout

Phase 1: Set up kombify-test repo with dashboard, implement for kombify-Cloud and kombify-Techstack (already have Playwright suites).

Phase 2: Add `screenshots/latest/` + manifest.json to remaining tool repos as their Playwright suites get created.

Phase 3 (future): Auto-refresh via WebSocket, historical runs, deployment to test.kombify.dev.
