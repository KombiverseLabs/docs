# KombiSphere Documentation

Production-ready Mintlify documentation for the KombiSphere multi-repo SaaS platform.

## Documentation Structure

### ✅ Core Pages (Main Navigation)
- `introduction.mdx` - Welcome page
- `quickstart.mdx` - 5-minute quick start
- `ecosystem.mdx` - Complete ecosystem overview

### ✅ Core Concepts
- `concepts/spec-driven-architecture.mdx` - Unifier pipeline and two-file system
- `concepts/hybrid-infrastructure.mdx` - Cloud + local management
- `concepts/stackkits-system.mdx` - 3-layer architecture
- `concepts/simulation-first.mdx` - Testing philosophy

### ✅ KombiStack (Open Core Tool)
- `tools/kombistack/overview.mdx` - Complete overview
- `tools/kombistack/quickstart.mdx` - Deployment guide
- `tools/kombistack/installation.mdx` - Installation methods
- `tools/kombistack/architecture.mdx` - System design
- `tools/kombistack/configuration.mdx` - Configuration reference
- `tools/kombistack/api-reference.mdx` - ⚠️ TODO

### ✅ KombiSim (Open Core Tool)
- `tools/kombisim/overview.mdx` - Complete overview
- `tools/kombisim/quickstart.mdx` - Quick start guide
- `tools/kombisim/installation.mdx` - Installation guide
- `tools/kombisim/templates.mdx` - Pre-built templates
- `tools/kombisim/api-reference.mdx` - ⚠️ TODO

### ✅ StackKits (Open Core Tool)
- `tools/stackkits/overview.mdx` - Complete overview
- `tools/stackkits/quickstart.mdx` - ⚠️ TODO
- `tools/stackkits/available-kits.mdx` - ⚠️ TODO
- `tools/stackkits/creating-stackkits.mdx` - ⚠️ TODO
- `tools/stackkits/cli-reference.mdx` - ⚠️ TODO

### ✅ SaaS Platform - Cloud
- `saas/cloud/overview.mdx` - Complete overview
- `saas/cloud/getting-started.mdx` - ⚠️ TODO
- `saas/cloud/authentication.mdx` - ⚠️ TODO
- `saas/cloud/subscriptions.mdx` - ⚠️ TODO
- `saas/cloud/tool-launcher.mdx` - ⚠️ TODO

### ✅ SaaS Platform - Admin
- `saas/admin/overview.mdx` - Complete overview
- `saas/admin/tool-evaluation.mdx` - ⚠️ TODO
- `saas/admin/pattern-management.mdx` - ⚠️ TODO
- `saas/admin/stackkit-management.mdx` - ⚠️ TODO

### ⚠️ SaaS Platform - API Gateway
- `saas/api/overview.mdx` - TODO
- `saas/api/authentication.mdx` - TODO
- `saas/api/rate-limits.mdx` - TODO
- `saas/api/endpoints.mdx` - TODO

### ✅ Guides
- `guides/architecture.mdx` - Architecture guide (stub)
- `guides/introduction.mdx` - ⚠️ TODO
- `guides/choosing-deployment.mdx` - ⚠️ TODO
- `guides/self-hosting/*` - ⚠️ TODO
- `guides/auth/*` - ⚠️ TODO
- `guides/deployment/*` - ⚠️ TODO

### ⚠️ API Reference
- `api/kombistack/*` - TODO
- `api/kombisim/*` - TODO
- `api/kombisphere/*` - TODO

## Troubleshooting 404 Errors

If you're seeing 404 errors for `ecosystem` or `guides/architecture`:

1. **Restart Mintlify preview:**
   ```bash
   # Stop the preview
   Ctrl+C
   
   # Clear cache and restart
   mintlify dev --clear-cache
   ```

2. **Verify files exist:**
   ```bash
   ls -la ecosystem.mdx
   ls -la guides/architecture.mdx
   ```

3. **Check docs.json navigation:**
   - Main navigation references: `ecosystem`
   - Guides tab references: `guides/architecture`

4. **Force rebuild:**
   ```bash
   rm -rf .mintlify
   mintlify dev
   ```

## What's Been Created

### Complete Pages (Ready for Production)
- Introduction and quick start
- Ecosystem overview with architecture diagrams
- All 4 core concept pages
- KombiStack: overview, quickstart, installation, architecture, configuration
- KombiSim: overview, quickstart, installation, templates
- StackKits: overview
- SaaS Cloud: overview
- SaaS Admin: overview

### Pages Needing Content
- API reference pages for all tools
- Remaining StackKits pages
- Remaining SaaS pages
- Guide pages (self-hosting, auth, deployment)

## Next Steps

1. **Fix 404 errors:** Restart Mintlify preview
2. **Complete remaining pages:** Use existing pages as templates
3. **Add API documentation:** Create OpenAPI specs or manual API docs
4. **Add screenshots:** Enhance with UI screenshots
5. **Review and polish:** Check all cross-links work

## Key Features Implemented

✅ Proper Mintlify components (Card, CardGroup, Accordion, CodeGroup, Tabs, Steps)
✅ Consistent formatting and structure
✅ Cross-linking between pages
✅ Code examples with syntax highlighting
✅ Mermaid diagrams for flows
✅ Proper frontmatter (title, description)
✅ Navigation structure with tabs and groups
✅ Icons from Lucide library

## License

Documentation follows the same licenses as the respective components.
