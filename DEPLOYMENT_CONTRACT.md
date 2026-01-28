# Deployment Contract - kombify Docs

> **Version:** 1.0  
> **Last Updated:** 2026-01-28  
> **Component:** kombify Documentation (Mintlify)

---

## 🎯 Component Overview

**kombify Docs** is the central documentation site built with Mintlify, providing guides, API references, and tutorials for all kombify products.

| Property | Value |
|----------|-------|
| **Type** | Mintlify Documentation Site |
| **Production URL** | `https://docs.kombify.io` |
| **Hosting** | Mintlify Cloud |
| **Health Endpoint** | N/A (static site) |

---

## 🏗️ Architecture Position

```
┌─────────────────────────────────────────────────────────────┐
│                    kombify Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   All components reference:                                  │
│                                                              │
│   ┌──────────────────────────────────────────────────┐      │
│   │              kombify Docs                         │      │
│   │         (docs.kombify.io)                        │      │
│   │                                                   │      │
│   │  ◀── YOU ARE HERE                                │      │
│   │                                                   │      │
│   │  - API References                                │      │
│   │  - Guides & Tutorials                            │      │
│   │  - Architecture Concepts                         │      │
│   │  - Integration Docs                              │      │
│   └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Content Structure

```
docs/
├── stack/           # kombify Stack documentation
├── sim/             # kombify Sim documentation
├── stackkits/       # StackKits documentation
├── sphere/          # KombiSphere documentation
├── concepts/        # Architecture concepts
├── guides/          # Deployment & auth guides
├── api-reference/   # API endpoint docs
├── integrations/    # Third-party integrations
├── snippets/        # Reusable MDX fragments
├── internal-notes/  # Source material (NEVER publish)
├── docs.json        # Mintlify configuration
└── index.mdx        # Homepage
```

---

## 🚀 Deployment

### Hosting
Mintlify Cloud handles deployment automatically when changes are pushed to `main`.

### Trigger Conditions
- **Automatic:** Push to `main` branch
- **Preview:** Pull requests get preview URLs

### No Azure Resources Required
Documentation is hosted entirely on Mintlify Cloud.

---

## 🧪 CI/CD Workflows

### `.github/workflows/docs-validate.yml`
**Purpose:** Validate documentation content and links  
**Trigger:** All pushes and PRs

### `.github/workflows/docs-health.yml`
**Purpose:** Check documentation site health  
**Trigger:** Scheduled + manual

### No Required GitHub Secrets
Mintlify integration is configured via their dashboard.

---

## 📋 Pre-Publish Checklist

- [ ] All MDX files have proper frontmatter
- [ ] Internal links work (no broken links)
- [ ] Code examples have language tags
- [ ] Navigation updated in `docs.json`
- [ ] No content from `internal-notes/` published directly
- [ ] Brand guidelines followed (lowercase "kombify")

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Mintlify CLI

### Quick Start
```bash
# Install Mintlify CLI
npm i -g mintlify

# Start local dev server
mintlify dev

# Open http://localhost:3000
```

### Validation
```bash
# Check for broken links
mintlify broken-links

# Validate docs.json
mintlify check
```

---

## 📝 Content Guidelines

### Frontmatter Required
```yaml
---
title: "Page title in sentence case"
description: "One-line summary for SEO"
---
```

### Writing Style
- Second-person voice ("you", not "we")
- Sentence-case headings
- All code blocks need language tags
- Internal links use relative paths without `.mdx`

### Brand Rules
- Always "kombify" with lowercase k
- Tool names: "kombify Stack", "kombify Sim", etc.
- Config file: `kombination.yaml`

---

## 📚 Mintlify Components

```mdx
<Card title="Title" icon="icon-name" href="/path">
  Description text.
</Card>

<Steps>
  <Step title="Step name">
    Content here.
  </Step>
</Steps>

<Tabs>
  <Tab title="Tab 1">Content</Tab>
</Tabs>

<Note>Important information.</Note>
<Warning>Critical warning.</Warning>
<Tip>Helpful suggestion.</Tip>
```

---

## 🔗 Cross-Repository Dependencies

| Repo | Dependency Type | Notes |
|------|-----------------|-------|
| kombifyStack | API Docs | Stack API reference |
| KombiSim | API Docs | Sim API reference |
| StackKits | Template Docs | StackKit documentation |
| KombiSphere-Cloud | User Guides | Portal usage guides |

---

## 📞 Mintlify Support

- **Dashboard:** https://dashboard.mintlify.com
- **Documentation:** https://mintlify.com/docs
