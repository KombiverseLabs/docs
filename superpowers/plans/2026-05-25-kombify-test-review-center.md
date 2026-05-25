# kombify-test Review Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live screenshot review dashboard that reads directly from tool repo filesystems — zero copies, always current.

**Architecture:** SvelteKit app in `kombify-test/` with API routes that stream PNGs from sibling repo paths. A `tools.json` registry maps tool IDs to filesystem paths. Each tool repo provides `screenshots/latest/manifest.json` + PNGs.

**Tech Stack:** SvelteKit 2, Svelte 5, Tailwind v4, bun 1.3.13, adapter-node, TypeScript strict

---

### Task 1: Scaffold kombify-test SvelteKit Project

**Files:**
- Create: `kombify-test/package.json`
- Create: `kombify-test/svelte.config.js`
- Create: `kombify-test/vite.config.ts`
- Create: `kombify-test/tsconfig.json`
- Create: `kombify-test/src/app.html`
- Create: `kombify-test/src/app.css`
- Create: `kombify-test/CLAUDE.md`
- Create: `kombify-test/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "kombify-test",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 5299",
    "build": "vite build",
    "preview": "vite preview --port 5299",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5.5.4",
    "@sveltejs/kit": "^2.59.1",
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "svelte": "^5.48.5",
    "svelte-check": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.9.3",
    "vite": "^7.3.2"
  },
  "packageManager": "bun@1.3.13"
}
```

- [ ] **Step 2: Create svelte.config.js**

```js
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: 'build' }),
    alias: {
      $lib: './src/lib'
    }
  }
};

export default config;
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()]
});
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

- [ ] **Step 5: Create src/app.html**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

- [ ] **Step 6: Create src/app.css**

```css
@import 'tailwindcss';

:root {
  --color-bg: #0a0a0a;
  --color-surface: #141414;
  --color-surface-hover: #1a1a1a;
  --color-border: #262626;
  --color-text: #e5e5e5;
  --color-text-muted: #737373;
  --color-green: #22c55e;
  --color-yellow: #eab308;
  --color-red: #ef4444;
  --color-gray: #525252;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 7: Create .gitignore**

```gitignore
node_modules/
build/
.svelte-kit/
.env
.env.*
!.env.example
vite.config.ts.timestamp*
```

- [ ] **Step 8: Create CLAUDE.md**

```markdown
# kombify-test

Central screenshot review dashboard. Pure viewer — reads screenshots directly from sibling tool repo filesystems.

## Dev

```bash
bun install
bun run dev  # http://localhost:5299
```

## Architecture

- `registry/tools.json` — maps tool IDs to filesystem paths
- `src/routes/api/screenshots/` — streams PNGs from tool repos
- `src/routes/` — overview + detail pages
- Tool repos provide `screenshots/latest/manifest.json` + PNGs

## Rules

- NEVER copy screenshots into this repo
- NEVER store test artifacts here
- This repo is a viewer only — all test logic stays in tool repos
```

- [ ] **Step 9: Install dependencies and verify**

Run: `cd D:\Github\kombify\kombify-test && bun install`
Expected: lockfile generated, no errors

Run: `bun run check`
Expected: may warn about missing routes (expected at this stage)

- [ ] **Step 10: Commit**

```bash
git add package.json svelte.config.js vite.config.ts tsconfig.json src/app.html src/app.css .gitignore CLAUDE.md bun.lock
git commit -m "feat(kombify-test): scaffold SvelteKit project for screenshot review center"
```

---

### Task 2: TypeScript Types and Registry

**Files:**
- Create: `kombify-test/src/lib/types.ts`
- Create: `kombify-test/registry/tools.json`
- Create: `kombify-test/src/lib/registry.ts`

- [ ] **Step 1: Create src/lib/types.ts**

```ts
export interface ScreenshotEntry {
  name: string;
  file: string;
  url: string;
  viewport: { width: number; height: number };
  theme?: 'light' | 'dark';
  status: 'captured' | 'failed' | 'skipped';
  description: string;
}

export interface Manifest {
  repo: string;
  tested_at: string;
  base_url: string;
  playwright_version: string;
  viewport_default: { width: number; height: number };
  screenshots: ScreenshotEntry[];
}

export interface ToolRegistryEntry {
  id: string;
  name: string;
  repo_dir: string;
  production_url: string;
  screenshots_path: string;
}

export interface ToolRegistry {
  tools: ToolRegistryEntry[];
}

export interface ToolWithManifest {
  tool: ToolRegistryEntry;
  manifest: Manifest | null;
  error: string | null;
}
```

- [ ] **Step 2: Create registry/tools.json**

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
    },
    {
      "id": "kombify-gateway",
      "name": "kombify Gateway",
      "repo_dir": "kombify-Gateway",
      "production_url": "https://api.kombify.io",
      "screenshots_path": "screenshots/latest"
    }
  ]
}
```

- [ ] **Step 3: Create src/lib/registry.ts**

```ts
import { readFile } from 'node:fs/promises';
import { resolve, normalize } from 'node:path';
import type { ToolRegistry, ToolRegistryEntry, Manifest, ToolWithManifest } from './types.js';

const MONOREPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

let _registry: ToolRegistry | null = null;

export async function loadRegistry(): Promise<ToolRegistry> {
  if (_registry) return _registry;
  const raw = await readFile(resolve(import.meta.dirname, '..', '..', 'registry', 'tools.json'), 'utf-8');
  _registry = JSON.parse(raw) as ToolRegistry;
  return _registry;
}

export function resolveScreenshotsDir(tool: ToolRegistryEntry): string {
  return resolve(MONOREPO_ROOT, tool.repo_dir, tool.screenshots_path);
}

export function resolveScreenshotFile(tool: ToolRegistryEntry, filename: string): string | null {
  const normalized = normalize(filename);
  if (normalized.includes('..') || normalized.startsWith('/') || normalized.startsWith('\\')) {
    return null;
  }
  const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = normalized.slice(normalized.lastIndexOf('.')).toLowerCase();
  if (!allowed.includes(ext)) {
    return null;
  }
  return resolve(resolveScreenshotsDir(tool), normalized);
}

export async function loadManifest(tool: ToolRegistryEntry): Promise<Manifest | null> {
  try {
    const manifestPath = resolve(resolveScreenshotsDir(tool), 'manifest.json');
    const raw = await readFile(manifestPath, 'utf-8');
    return JSON.parse(raw) as Manifest;
  } catch {
    return null;
  }
}

export async function loadAllToolsWithManifests(): Promise<ToolWithManifest[]> {
  const registry = await loadRegistry();
  return Promise.all(
    registry.tools.map(async (tool) => {
      try {
        const manifest = await loadManifest(tool);
        return { tool, manifest, error: null };
      } catch (e) {
        return { tool, manifest: null, error: String(e) };
      }
    })
  );
}

export function findTool(registry: ToolRegistry, toolId: string): ToolRegistryEntry | undefined {
  return registry.tools.find((t) => t.id === toolId);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/registry.ts registry/tools.json
git commit -m "feat(kombify-test): add TypeScript types, tool registry, and manifest loader"
```

---

### Task 3: Screenshot Streaming API Route

**Files:**
- Create: `kombify-test/src/routes/api/screenshots/[tool]/[file]/+server.ts`

- [ ] **Step 1: Create the API route**

```ts
import { error } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import { loadRegistry, findTool, resolveScreenshotFile } from '$lib/registry.js';
import type { RequestHandler } from './$types.js';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

export const GET: RequestHandler = async ({ params }) => {
  const registry = await loadRegistry();
  const tool = findTool(registry, params.tool);
  if (!tool) {
    error(404, `Unknown tool: ${params.tool}`);
  }

  const filePath = resolveScreenshotFile(tool, params.file);
  if (!filePath) {
    error(400, 'Invalid filename');
  }

  try {
    await stat(filePath);
  } catch {
    error(404, `Screenshot not found: ${params.file}`);
  }

  const ext = params.file.slice(params.file.lastIndexOf('.')).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const data = await readFile(filePath);

  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
```

- [ ] **Step 2: Verify no caching headers**

The `Cache-Control: no-cache, no-store, must-revalidate` ensures the browser always fetches fresh screenshots. This is critical — the whole point is live data.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/screenshots/
git commit -m "feat(kombify-test): add screenshot streaming API with path traversal protection"
```

---

### Task 4: Manifest API Route

**Files:**
- Create: `kombify-test/src/routes/api/manifest/[tool]/+server.ts`

- [ ] **Step 1: Create the manifest API route**

```ts
import { error, json } from '@sveltejs/kit';
import { loadRegistry, findTool, loadManifest } from '$lib/registry.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
  const registry = await loadRegistry();
  const tool = findTool(registry, params.tool);
  if (!tool) {
    error(404, `Unknown tool: ${params.tool}`);
  }

  const manifest = await loadManifest(tool);
  if (!manifest) {
    error(404, `No manifest found for ${params.tool}. Run tests in ${tool.repo_dir} first.`);
  }

  return json(manifest, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/manifest/
git commit -m "feat(kombify-test): add manifest API route"
```

---

### Task 5: Layout and Overview Page

**Files:**
- Create: `kombify-test/src/routes/+layout.svelte`
- Create: `kombify-test/src/routes/+page.svelte`
- Create: `kombify-test/src/routes/+page.server.ts`
- Create: `kombify-test/src/lib/components/ToolCard.svelte`

- [ ] **Step 1: Create +layout.svelte**

```svelte
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div class="min-h-screen">
  <header class="border-b border-[var(--color-border)] px-6 py-4">
    <div class="mx-auto flex max-w-7xl items-center justify-between">
      <a href="/" class="text-lg font-semibold tracking-tight">kombify test center</a>
      <span class="text-sm text-[var(--color-text-muted)]">Screenshot Review Dashboard</span>
    </div>
  </header>
  <main class="mx-auto max-w-7xl px-6 py-8">
    {@render children()}
  </main>
</div>
```

- [ ] **Step 2: Create +page.server.ts**

```ts
import { loadAllToolsWithManifests } from '$lib/registry.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
  const tools = await loadAllToolsWithManifests();
  return { tools };
};
```

- [ ] **Step 3: Create ToolCard.svelte**

```svelte
<script lang="ts">
  import type { ToolWithManifest } from '$lib/types.js';

  let { data }: { data: ToolWithManifest } = $props();

  const hasManifest = $derived(data.manifest !== null);
  const screenshotCount = $derived(data.manifest?.screenshots.length ?? 0);
  const failedCount = $derived(
    data.manifest?.screenshots.filter((s) => s.status === 'failed').length ?? 0
  );
  const testedAt = $derived(
    data.manifest?.tested_at
      ? new Date(data.manifest.tested_at).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : null
  );
  const firstScreenshot = $derived(data.manifest?.screenshots.find((s) => s.status === 'captured'));
  const thumbnailUrl = $derived(
    firstScreenshot ? `/api/screenshots/${data.tool.id}/${firstScreenshot.file}` : null
  );

  const borderColor = $derived.by(() => {
    if (!hasManifest) return 'border-[var(--color-gray)]';
    if (failedCount > 0) return 'border-[var(--color-red)]';
    return 'border-[var(--color-green)]';
  });
</script>

<a
  href="/{data.tool.id}"
  class="group block overflow-hidden rounded-lg border {borderColor} bg-[var(--color-surface)] transition-colors hover:bg-[var(--color-surface-hover)]"
>
  <div class="aspect-video w-full overflow-hidden bg-black/20">
    {#if thumbnailUrl}
      <img
        src={thumbnailUrl}
        alt="{data.tool.name} screenshot"
        class="h-full w-full object-cover object-top"
      />
    {:else}
      <div class="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
        No screenshots yet
      </div>
    {/if}
  </div>
  <div class="p-4">
    <h3 class="font-medium">{data.tool.name}</h3>
    <p class="mt-1 text-xs text-[var(--color-text-muted)]">{data.tool.production_url}</p>
    {#if hasManifest}
      <div class="mt-2 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span>{screenshotCount} screenshots</span>
        {#if failedCount > 0}
          <span class="text-[var(--color-red)]">{failedCount} failed</span>
        {/if}
      </div>
      {#if testedAt}
        <p class="mt-1 text-xs text-[var(--color-text-muted)]">Last run: {testedAt}</p>
      {/if}
    {:else}
      <p class="mt-2 text-xs text-[var(--color-text-muted)]">Tests not yet run</p>
    {/if}
  </div>
</a>
```

- [ ] **Step 4: Create +page.svelte**

```svelte
<script lang="ts">
  let { data } = $props();

  const toolsWithScreenshots = $derived(data.tools.filter((t) => t.manifest !== null));
  const toolsWithoutScreenshots = $derived(data.tools.filter((t) => t.manifest === null));
</script>

<svelte:head>
  <title>kombify test center</title>
</svelte:head>

<div>
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-semibold">Platform Overview</h1>
    <span class="text-sm text-[var(--color-text-muted)]">
      {toolsWithScreenshots.length} / {data.tools.length} tools tested
    </span>
  </div>

  {#if toolsWithScreenshots.length > 0}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each toolsWithScreenshots as tool (tool.tool.id)}
        {@const { default: ToolCard } = await import('$lib/components/ToolCard.svelte')}
        <ToolCard data={tool} />
      {/each}
    </div>
  {/if}

  {#if toolsWithoutScreenshots.length > 0}
    <div class="mt-8">
      <h2 class="mb-4 text-lg font-medium text-[var(--color-text-muted)]">Pending</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each toolsWithoutScreenshots as tool (tool.tool.id)}
          {@const { default: ToolCard } = await import('$lib/components/ToolCard.svelte')}
          <ToolCard data={tool} />
        {/each}
      </div>
    </div>
  {/if}
</div>
```

**Note:** The `await import()` in `{#each}` won't work in Svelte 5 templates. Use a direct import instead:

```svelte
<script lang="ts">
  import ToolCard from '$lib/components/ToolCard.svelte';
  let { data } = $props();

  const toolsWithScreenshots = $derived(data.tools.filter((t) => t.manifest !== null));
  const toolsWithoutScreenshots = $derived(data.tools.filter((t) => t.manifest === null));
</script>

<svelte:head>
  <title>kombify test center</title>
</svelte:head>

<div>
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-semibold">Platform Overview</h1>
    <span class="text-sm text-[var(--color-text-muted)]">
      {toolsWithScreenshots.length} / {data.tools.length} tools tested
    </span>
  </div>

  {#if toolsWithScreenshots.length > 0}
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each toolsWithScreenshots as tool (tool.tool.id)}
        <ToolCard data={tool} />
      {/each}
    </div>
  {/if}

  {#if toolsWithoutScreenshots.length > 0}
    <div class="mt-8">
      <h2 class="mb-4 text-lg font-medium text-[var(--color-text-muted)]">Pending</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {#each toolsWithoutScreenshots as tool (tool.tool.id)}
          <ToolCard data={tool} />
        {/each}
      </div>
    </div>
  {/if}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/+layout.svelte src/routes/+page.svelte src/routes/+page.server.ts src/lib/components/ToolCard.svelte
git commit -m "feat(kombify-test): add layout, overview page, and ToolCard component"
```

---

### Task 6: Tool Detail Page

**Files:**
- Create: `kombify-test/src/routes/[tool]/+page.server.ts`
- Create: `kombify-test/src/routes/[tool]/+page.svelte`
- Create: `kombify-test/src/lib/components/ScreenshotGrid.svelte`
- Create: `kombify-test/src/lib/components/ScreenshotViewer.svelte`

- [ ] **Step 1: Create [tool]/+page.server.ts**

```ts
import { error } from '@sveltejs/kit';
import { loadRegistry, findTool, loadManifest } from '$lib/registry.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
  const registry = await loadRegistry();
  const tool = findTool(registry, params.tool);
  if (!tool) {
    error(404, `Unknown tool: ${params.tool}`);
  }

  const manifest = await loadManifest(tool);

  return {
    tool,
    manifest
  };
};
```

- [ ] **Step 2: Create ScreenshotGrid.svelte**

```svelte
<script lang="ts">
  import type { ScreenshotEntry } from '$lib/types.js';

  let {
    screenshots,
    toolId,
    onselect
  }: {
    screenshots: ScreenshotEntry[];
    toolId: string;
    onselect: (screenshot: ScreenshotEntry) => void;
  } = $props();

  function statusColor(status: string): string {
    if (status === 'captured') return 'border-[var(--color-green)]';
    if (status === 'failed') return 'border-[var(--color-red)]';
    return 'border-[var(--color-gray)]';
  }
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#each screenshots as screenshot (screenshot.name)}
    <button
      onclick={() => onselect(screenshot)}
      class="group overflow-hidden rounded-lg border {statusColor(screenshot.status)} bg-[var(--color-surface)] text-left transition-colors hover:bg-[var(--color-surface-hover)]"
    >
      <div class="aspect-video w-full overflow-hidden bg-black/20">
        {#if screenshot.status === 'captured'}
          <img
            src="/api/screenshots/{toolId}/{screenshot.file}"
            alt={screenshot.description}
            class="h-full w-full object-cover object-top"
          />
        {:else}
          <div
            class="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]"
          >
            {screenshot.status}
          </div>
        {/if}
      </div>
      <div class="p-3">
        <p class="text-sm font-medium">{screenshot.name}</p>
        <p class="mt-1 text-xs text-[var(--color-text-muted)]">{screenshot.description}</p>
        <div class="mt-1 flex gap-2 text-xs text-[var(--color-text-muted)]">
          <span>{screenshot.viewport.width}x{screenshot.viewport.height}</span>
          {#if screenshot.theme}
            <span>{screenshot.theme}</span>
          {/if}
          <span>{screenshot.url}</span>
        </div>
      </div>
    </button>
  {/each}
</div>
```

- [ ] **Step 3: Create ScreenshotViewer.svelte**

```svelte
<script lang="ts">
  import type { ScreenshotEntry } from '$lib/types.js';

  let {
    screenshot,
    toolId,
    onclose
  }: {
    screenshot: ScreenshotEntry | null;
    toolId: string;
    onclose: () => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

{#if screenshot}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8"
    role="dialog"
    aria-modal="true"
    onclick={onclose}
    onkeydown={handleKeydown}
  >
    <div class="relative max-h-full max-w-full" onclick|stopPropagation={() => {}}>
      <img
        src="/api/screenshots/{toolId}/{screenshot.file}"
        alt={screenshot.description}
        class="max-h-[90vh] max-w-[90vw] rounded-lg"
      />
      <div
        class="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/70 p-4 text-sm text-white"
      >
        <p class="font-medium">{screenshot.name}</p>
        <p class="mt-1 text-xs text-white/70">
          {screenshot.url} &middot; {screenshot.viewport.width}x{screenshot.viewport.height}
          {#if screenshot.theme}&middot; {screenshot.theme}{/if}
        </p>
      </div>
    </div>
    <button
      onclick={onclose}
      class="absolute right-6 top-6 text-2xl text-white/60 hover:text-white"
      aria-label="Close"
    >
      &times;
    </button>
  </div>
{/if}
```

- [ ] **Step 4: Create [tool]/+page.svelte**

```svelte
<script lang="ts">
  import ScreenshotGrid from '$lib/components/ScreenshotGrid.svelte';
  import ScreenshotViewer from '$lib/components/ScreenshotViewer.svelte';
  import type { ScreenshotEntry } from '$lib/types.js';

  let { data } = $props();
  let selectedScreenshot = $state<ScreenshotEntry | null>(null);

  const testedAt = $derived(
    data.manifest?.tested_at
      ? new Date(data.manifest.tested_at).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      : null
  );
</script>

<svelte:head>
  <title>{data.tool.name} — kombify test center</title>
</svelte:head>

<div>
  <div class="mb-6">
    <a href="/" class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
      &larr; Back to overview
    </a>
  </div>

  <div class="mb-6">
    <h1 class="text-2xl font-semibold">{data.tool.name}</h1>
    <p class="mt-1 text-sm text-[var(--color-text-muted)]">{data.tool.production_url}</p>
    {#if data.manifest}
      <div class="mt-2 flex gap-4 text-xs text-[var(--color-text-muted)]">
        <span>Last run: {testedAt}</span>
        <span>Playwright {data.manifest.playwright_version}</span>
        <span>{data.manifest.screenshots.length} screenshots</span>
      </div>
    {/if}
  </div>

  {#if data.manifest}
    <ScreenshotGrid
      screenshots={data.manifest.screenshots}
      toolId={data.tool.id}
      onselect={(s) => (selectedScreenshot = s)}
    />
    <ScreenshotViewer
      screenshot={selectedScreenshot}
      toolId={data.tool.id}
      onclose={() => (selectedScreenshot = null)}
    />
  {:else}
    <div class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
      <p class="text-[var(--color-text-muted)]">
        No test results available. Run the Playwright screenshot suite in {data.tool.repo_dir} first.
      </p>
    </div>
  {/if}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/\[tool\]/ src/lib/components/ScreenshotGrid.svelte src/lib/components/ScreenshotViewer.svelte
git commit -m "feat(kombify-test): add tool detail page with screenshot grid and lightbox viewer"
```

---

### Task 7: SCREENSHOT-VALIDATION-STANDARD.md

**Files:**
- Create: `kombify-test/standards/SCREENSHOT-VALIDATION-STANDARD.md`

- [ ] **Step 1: Write the standard**

```markdown
# Screenshot Validation Standard

**Version:** 1.0
**Date:** 2026-05-25
**Scope:** All kombify tool repos participating in the central test review center

## Purpose

Standardize how tool repos produce screenshot evidence for manual review.
The central review center (`kombify-test`) is a pure viewer — it reads
directly from tool repo filesystems. This standard defines the contract.

## Directory Contract

Every participating tool repo MUST provide:

    <repo>/screenshots/latest/
      ├── manifest.json
      ├── <name>.png
      └── ...

### .gitignore

PNGs are test artifacts — they belong on the filesystem, not in git history.
The manifest IS committed because it defines the test contract.

    # In <repo>/.gitignore
    screenshots/latest/*.png
    !screenshots/latest/manifest.json

## manifest.json Schema

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

### Field Rules

| Field | Required | Type | Rules |
|-------|----------|------|-------|
| `repo` | yes | string | Matches repo directory name |
| `tested_at` | yes | ISO 8601 | UTC timestamp of test run start |
| `base_url` | yes | URL | Production URL tested against |
| `playwright_version` | yes | semver | Playwright version used |
| `viewport_default` | yes | object | Default viewport (width x height) |
| `screenshots` | yes | array | At least one entry |
| `screenshots[].name` | yes | string | kebab-case, unique within manifest |
| `screenshots[].file` | yes | string | Filename relative to `screenshots/latest/` |
| `screenshots[].url` | yes | string | Path relative to `base_url` |
| `screenshots[].viewport` | yes | object | Width x height for this screenshot |
| `screenshots[].theme` | no | `"light"` / `"dark"` | Omit if not applicable |
| `screenshots[].status` | yes | enum | `"captured"` / `"failed"` / `"skipped"` |
| `screenshots[].description` | yes | string | One-line human-readable purpose |

## Screenshot Naming Convention

    <page>-<viewport>[-<variant>].png

### Standard Viewports

| Name | Width | Height |
|------|-------|--------|
| `desktop` | 1280 | 720 |
| `tablet` | 768 | 1024 |
| `mobile` | 375 | 667 |

### Examples

    homepage-desktop.png
    homepage-mobile.png
    homepage-desktop-dark.png
    dashboard-desktop-logged-in.png
    pricing-tablet.png
    signin-desktop.png

## Playwright Integration

### Recommended Spec Pattern

Create a dedicated spec file: `tests/e2e/screenshot-evidence.spec.ts`

```typescript
import { test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SCREENSHOTS_DIR = resolve(process.cwd(), 'screenshots', 'latest');
const BASE_URL = process.env.BASE_URL || 'https://your-production-url.io';

interface ScreenshotDef {
  name: string;
  url: string;
  viewport: { width: number; height: number };
  theme?: 'light' | 'dark';
  description: string;
}

const SCREENSHOTS: ScreenshotDef[] = [
  {
    name: 'homepage-desktop',
    url: '/',
    viewport: { width: 1280, height: 720 },
    theme: 'light',
    description: 'Homepage above-the-fold, desktop viewport'
  },
  {
    name: 'homepage-mobile',
    url: '/',
    viewport: { width: 375, height: 667 },
    theme: 'light',
    description: 'Homepage above-the-fold, mobile viewport'
  }
  // Add more as needed
];

test.describe('Screenshot Evidence', () => {
  const manifest = {
    repo: 'your-repo-name',
    tested_at: new Date().toISOString(),
    base_url: BASE_URL,
    playwright_version: require('@playwright/test/package.json').version,
    viewport_default: { width: 1280, height: 720 },
    screenshots: [] as Array<ScreenshotDef & { file: string; status: string }>
  };

  test.beforeAll(() => {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  });

  for (const def of SCREENSHOTS) {
    test(`capture ${def.name}`, async ({ page }) => {
      await page.setViewportSize(def.viewport);
      if (def.theme === 'dark') {
        await page.emulateMedia({ colorScheme: 'dark' });
      }

      const file = `${def.name}.png`;
      let status = 'captured';

      try {
        await page.goto(def.url, { waitUntil: 'networkidle' });
        await page.screenshot({
          path: resolve(SCREENSHOTS_DIR, file),
          fullPage: true
        });
      } catch {
        status = 'failed';
      }

      manifest.screenshots.push({ ...def, file, status });
    });
  }

  test.afterAll(() => {
    writeFileSync(
      resolve(SCREENSHOTS_DIR, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  });
});
```

### Running Against Production

Add a script to `package.json`:

```json
{
  "scripts": {
    "test:screenshots": "playwright test tests/e2e/screenshot-evidence.spec.ts --config playwright.live.config.ts"
  }
}
```

## Registration

To add a tool to the review center, add an entry to
`kombify-test/registry/tools.json`:

```json
{
  "id": "your-tool-id",
  "name": "Your Tool Name",
  "repo_dir": "your-repo-directory",
  "production_url": "https://your-tool.kombify.io",
  "screenshots_path": "screenshots/latest"
}
```

## What Stays in Tool Repos

- All test logic (Playwright specs, configs, assertions)
- Visual regression baselines (`toHaveScreenshot()` snapshots)
- CI pipeline configuration
- Test utilities and helpers

## What the Review Center Does

- Reads `screenshots/latest/manifest.json` from each registered tool repo
- Streams PNGs directly from the filesystem (no copies)
- Provides overview grid + per-tool detail view
- Shows status, timestamps, viewport info
- Zero own state — always reflects the current filesystem
```

- [ ] **Step 2: Commit**

```bash
git add standards/
git commit -m "docs(kombify-test): add SCREENSHOT-VALIDATION-STANDARD v1.0"
```

---

### Task 8: Set Up kombify-Cloud as First Consumer

**Files:**
- Create: `kombify-Cloud/screenshots/latest/manifest.json`
- Create: `kombify-Cloud/tests/e2e/screenshot-evidence.spec.ts`
- Modify: `kombify-Cloud/.gitignore` — add screenshots rule

- [ ] **Step 1: Create manifest.json template in kombify-Cloud**

```json
{
  "repo": "kombify-Cloud",
  "tested_at": "",
  "base_url": "https://kombify.io",
  "playwright_version": "",
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
    },
    {
      "name": "homepage-mobile",
      "file": "homepage-mobile.png",
      "url": "/",
      "viewport": { "width": 375, "height": 667 },
      "theme": "light",
      "status": "captured",
      "description": "Homepage above-the-fold, mobile viewport"
    },
    {
      "name": "homepage-desktop-dark",
      "file": "homepage-desktop-dark.png",
      "url": "/",
      "viewport": { "width": 1280, "height": 720 },
      "theme": "dark",
      "status": "captured",
      "description": "Homepage above-the-fold, dark mode"
    },
    {
      "name": "pricing-desktop",
      "file": "pricing-desktop.png",
      "url": "/pricing",
      "viewport": { "width": 1280, "height": 720 },
      "theme": "light",
      "status": "captured",
      "description": "Pricing page, desktop viewport"
    },
    {
      "name": "signin-desktop",
      "file": "signin-desktop.png",
      "url": "/signin",
      "viewport": { "width": 1280, "height": 720 },
      "theme": "light",
      "status": "captured",
      "description": "Sign-in page, desktop viewport"
    },
    {
      "name": "docs-desktop",
      "file": "docs-desktop.png",
      "url": "/docs",
      "viewport": { "width": 1280, "height": 720 },
      "theme": "light",
      "status": "captured",
      "description": "Documentation landing page"
    }
  ]
}
```

Note: `tested_at` and `playwright_version` are empty in the template — they get filled by the spec at runtime.

- [ ] **Step 2: Create screenshot-evidence.spec.ts in kombify-Cloud**

```ts
import { test } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCREENSHOTS_DIR = resolve(process.cwd(), 'screenshots', 'latest');
const MANIFEST_TEMPLATE_PATH = resolve(SCREENSHOTS_DIR, 'manifest.json');

interface ScreenshotDef {
  name: string;
  file: string;
  url: string;
  viewport: { width: number; height: number };
  theme?: 'light' | 'dark';
  status: string;
  description: string;
}

interface Manifest {
  repo: string;
  tested_at: string;
  base_url: string;
  playwright_version: string;
  viewport_default: { width: number; height: number };
  screenshots: ScreenshotDef[];
}

let manifest: Manifest;

test.beforeAll(() => {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const raw = readFileSync(MANIFEST_TEMPLATE_PATH, 'utf-8');
  manifest = JSON.parse(raw);
  manifest.tested_at = new Date().toISOString();
  manifest.playwright_version = require('@playwright/test/package.json').version;
});

test.describe('Screenshot Evidence', () => {
  test.afterAll(() => {
    writeFileSync(MANIFEST_TEMPLATE_PATH, JSON.stringify(manifest, null, 2));
  });

  test('capture all screenshots', async ({ page }) => {
    for (const entry of manifest.screenshots) {
      await page.setViewportSize(entry.viewport);

      if (entry.theme === 'dark') {
        await page.emulateMedia({ colorScheme: 'dark' });
      } else {
        await page.emulateMedia({ colorScheme: 'light' });
      }

      try {
        await page.goto(entry.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.screenshot({
          path: resolve(SCREENSHOTS_DIR, entry.file),
          fullPage: true
        });
        entry.status = 'captured';
      } catch (e) {
        entry.status = 'failed';
        console.error(`Failed to capture ${entry.name}: ${e}`);
      }
    }
  });
});
```

- [ ] **Step 3: Add gitignore rule to kombify-Cloud**

Append to `kombify-Cloud/.gitignore`:

```gitignore
# Screenshot evidence (PNGs regenerated by test runs)
screenshots/latest/*.png
```

- [ ] **Step 4: Run the screenshot evidence spec against production**

Run: `cd D:\Github\kombify\kombify-Cloud && npx playwright test tests/e2e/screenshot-evidence.spec.ts --config playwright.live.config.ts`

Expected: screenshots captured in `screenshots/latest/`, manifest.json updated with `tested_at` and `playwright_version`.

- [ ] **Step 5: Start kombify-test dev server and verify**

Run: `cd D:\Github\kombify\kombify-test && bun run dev`

Open: `http://localhost:5299`
Expected: kombify Cloud card visible with thumbnail, clicking it shows all 6 screenshots in detail view.

- [ ] **Step 6: Commit in kombify-Cloud**

```bash
cd D:\Github\kombify\kombify-Cloud
git add screenshots/latest/manifest.json tests/e2e/screenshot-evidence.spec.ts .gitignore
git commit -m "feat(cloud): add screenshot evidence spec per SCREENSHOT-VALIDATION-STANDARD"
```

---

### Task 9: Verify End-to-End Flow

- [ ] **Step 1: Verify the full chain works**

1. Start the dashboard: `cd D:\Github\kombify\kombify-test && bun run dev`
2. Open `http://localhost:5299` — should show all tools, Cloud with screenshots, rest as "pending"
3. Click on Cloud card — should show 6 screenshots in grid
4. Click on a screenshot — should open in lightbox with metadata
5. Press Escape — should close lightbox
6. Navigate back to overview

- [ ] **Step 2: Verify live-reload behavior**

1. Keep the dashboard open in browser
2. In another terminal, re-run the Cloud screenshot spec
3. Refresh the dashboard — screenshots and timestamp should update

- [ ] **Step 3: Final commit if any fixes needed**

```bash
cd D:\Github\kombify\kombify-test
git add -A
git commit -m "fix(kombify-test): adjustments from E2E verification"
```

Plan complete and saved to `docs/superpowers/plans/2026-05-25-kombify-test-review-center.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?