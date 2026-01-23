# kombify Documentation (Mintlify)

## Project Context

This is the public documentation site for the kombify platform, built with Mintlify.
kombify is a multi-tool infrastructure platform with 6 components: Stack, Sim, StackKits, Sphere, Administration, and API Gateway.

- **Config file:** `docs.json` (newer Mintlify format, NOT mint.json)
- **Content format:** MDX files with YAML frontmatter
- **Brand rules:** Always "kombify" (lowercase k). Tool names: "kombify Stack", "kombify Sim", etc.
- **Spec file:** The user config file is called `kombination.yaml`

## Directory Structure

```
docs/
├── Root pages (introduction, quickstart, ecosystem, etc.)
├── stack/          ← kombify Stack docs
├── sim/            ← kombify Sim docs
├── stackkits/      ← kombify StackKits docs
├── sphere/         ← kombify Sphere docs
├── concepts/       ← Architecture and design concepts
├── guides/         ← Deployment, auth, self-hosting guides
├── api-reference/  ← API docs (OpenAPI + manual MDX)
├── saas/           ← SaaS-specific (admin, api, cloud)
├── ai-tools/       ← AI tool setup guides
├── integrations/   ← Third-party integration guides
├── snippets/       ← Reusable MDX fragments
├── _templates/     ← Page templates (NOT published)
├── internal-notes/ ← Source material (NEVER publish directly)
├── tools/          ← DEPRECATED - do NOT add pages here
└── essentials/     ← Mintlify component examples (reference only)
```

## docs.json Structure

The config has these top-level keys:
- `tabs` - Array of product-area tabs, each with `tab`, `icon`, `pages` (array of groups)
- `navigation.pages` - Main sidebar groups (Getting Started, Concepts, Integrations, Resources)
- `anchors` - External link buttons (GitHub, Discord, Blog)
- `topbarLinks` / `topbarCtaButton` - Top navigation
- `footerSocials` - Social links

### Adding a new page

1. Create the `.mdx` file in the correct directory
2. Add the path (without `.mdx`) to `docs.json` in the appropriate tab/group
3. Include required frontmatter (title + description)
4. Run `npm run validate:all`

### Adding a new group within a tab

Add a new object to the tab's `pages` array:
```json
{
  "group": "Group Name",
  "pages": ["path/to/page1", "path/to/page2"]
}
```

### Adding a new tab

Add to the `tabs` array:
```json
{
  "tab": "Display Name",
  "icon": "font-awesome-icon",
  "pages": [{ "group": "Overview", "pages": ["dir/overview"] }]
}
```

## Frontmatter Requirements

Every `.mdx` page MUST have:
```yaml
---
title: Clear descriptive title
description: One-line summary for SEO and navigation
---
```

Optional fields:
```yaml
icon: font-awesome-icon-name  # For overview/landing pages only
```

## Mintlify Components

Components used in this project (use existing pages as reference):
- `<Card title="" icon="" href="">` / `<CardGroup cols={2}>` - Navigation cards
- `<Accordion title="">` / `<AccordionGroup>` - Collapsible sections
- `<Tabs>` / `<Tab title="">` - Tabbed content
- `<Steps>` / `<Step title="">` - Numbered procedures
- `<CodeGroup>` - Side-by-side code examples
- `<ParamField path="" type="">` - API parameter docs
- `<ResponseField name="" type="">` - API response docs
- `<RequestExample>` / `<ResponseExample>` - API examples
- `<Warning>` / `<Note>` / `<Info>` / `<Tip>` - Callout boxes

## Writing Standards

- Second-person voice ("you")
- Sentence-case headings (not Title Case)
- Language tags on ALL code blocks (```yaml, ```bash, ```go, etc.)
- Internal links: relative paths without `.mdx` extension (e.g., `/concepts/architecture`)
- Prerequisites section at top of procedural pages
- English only for published content (internal-notes may be German)
- Code examples must be realistic and match actual API/CLI behavior

## Internal Notes as Source Material

The `internal-notes/` directory contains authoritative source docs:
- `internal-notes/kombify/tools/{tool}/` - Architecture per tool
- `internal-notes/kombify/INTER_MODULE_CONTRACTS.md` - API contracts
- `internal-notes/marketing/concepts/` - User-facing concept explanations
- `internal-notes/marketing/product-tours/` - Feature overviews
- `internal-notes/MASTER_INDEX.md` - Index with status of all docs

**Rules:** Read these for accuracy. NEVER copy-paste into published pages. Always rewrite for a public developer audience.

## Preview and Validation

```bash
npm run dev              # Local preview (localhost:3000)
npm run dev:clean        # Preview with cleared cache
npm run validate:all     # Run all validation checks
npm run validate:frontmatter  # Check frontmatter completeness
npm run validate:links        # Check internal links
npm run validate:orphans      # Find pages missing from navigation
npm run validate:navigation   # Find nav entries without pages
```

## Common Agent Tasks

### Write a new documentation page
1. Identify the correct directory from the structure above
2. Read `internal-notes/` for source material on the topic
3. Read an existing page in the same section as a structural template
4. Create the `.mdx` file with proper frontmatter
5. Add the page path to `docs.json` in the correct location
6. Run `npm run validate:all`

### Update an existing page
1. Read the current page content
2. Check `internal-notes/` for any newer/corrected information
3. Make minimal, focused changes
4. Verify internal links still resolve

### Add API endpoint documentation
1. Use `_templates/api-endpoint.mdx` as the base structure
2. Reference `internal-notes/kombify/tools/{tool}/` for endpoint details
3. Use ParamField, ResponseField, RequestExample, ResponseExample components
4. Add the page to the API Reference tab in docs.json

### Structural changes (new sections or tabs)
1. Review current `docs.json` structure
2. Follow existing patterns for group/tab structure
3. Create overview page first, then detail pages
4. Update `docs.json` navigation
5. Run `npm run validate:all`

## Slash Commands

Custom commands available via `/` in Claude Code:

| Command | Purpose |
|---------|---------|
| `/new-page` | Create a new documentation page from template + internal-notes |
| `/validate` | Run all validation checks and report issues |
| `/sync-from-notes` | Convert internal-notes into published pages |
| `/add-api-docs` | Create API endpoint reference pages |
| `/fill-navigation-gaps` | Create stub pages for missing docs.json entries |
| `/review-page` | Quality-check an existing page against standards |
| `/update-nav` | Add/remove/reorganize docs.json navigation |

## Recommended Agents

When using Claude Code's Task tool, prefer these specialized agents for docs work:

| Agent | When to Use |
|-------|-------------|
| `documentation-engineer` | Writing new pages, restructuring content, documentation systems |
| `technical-writer` | Improving prose quality, rewriting internal-notes for public audience |
| `frontend-developer` | Complex MDX component usage, debugging component rendering |
| `code-reviewer` | Reviewing docs.json structure, validating page quality |
| `api-documenter` | Creating OpenAPI specs, API reference pages |
| `refactoring-specialist` | Reorganizing directory structure, consolidating duplicate content |

## MCP Server

The Mintlify MCP server is configured in `.vscode/mcp.json` for IDE integration (Cursor, Windsurf). It provides Mintlify-aware context and completions.

## AI Tool Configuration

This repo includes instructions for multiple AI tools:
- **Claude Code:** This file (`CLAUDE.md`) + `.claude/commands/` slash commands
- **GitHub Copilot:** `.github/copilot-instructions.md`
- **Cursor:** `.cursorrules`
- **Mintlify MCP:** `.vscode/mcp.json`

All tools share the same conventions (frontmatter, components, brand rules, directory structure).

## Do NOT

- Publish `internal-notes/` content directly (always rewrite)
- Add pages to `/tools/` directory (legacy, use `/stack/`, `/sim/`, etc.)
- Use Title Case for headings
- Skip frontmatter on any `.mdx` file
- Use absolute URLs for internal documentation links
- Add files without updating `docs.json` navigation
- Modify `openapi.json` placeholder without real API specs
- Commit `node_modules/` or `.mintlify/`
