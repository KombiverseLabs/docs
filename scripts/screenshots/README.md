# Screenshot & Documentation Automation

This directory contains tools for automating documentation screenshots and process documentation.

## Overview

kombify uses two complementary approaches for documentation visuals:

| Tool | Use Case | Automation Level |
|------|----------|------------------|
| **Playwright** | Product UI screenshots | Fully automated |
| **Scribe** | Step-by-step tutorials | Semi-automated |

## Quick Start

### Playwright Screenshots (Automated)

```bash
cd scripts/screenshots

# Install dependencies
npm install
npx playwright install chromium

# Capture all screenshots (dark mode)
npm run screenshots

# Capture light mode variants
npm run screenshots:light

# Capture mobile screenshots
npm run screenshots:mobile
```

### Environment Variables

For authenticated screenshots, set these environment variables:

```bash
# Sphere (production)
export SPHERE_URL="https://app.kombisphere.io"
export SPHERE_AUTH_TOKEN="your-auth-token"

# Stack (local development)
export STACK_URL="http://localhost:5260"

# Sim (local development)  
export SIM_URL="http://localhost:5271"
```

## Scribe Integration

[Scribe](https://scribehow.com/) is used for step-by-step process documentation with annotated screenshots.

### When to Use Scribe

- **User onboarding flows** - "How to create your first stack"
- **Multi-step processes** - "Setting up SSO with Zitadel"
- **Admin workflows** - "Managing team permissions"

### Scribe Workflow

1. Install the [Scribe Chrome Extension](https://chrome.google.com/webstore/detail/scribe)
2. Click "Start Recording" before performing the workflow
3. Complete the workflow in the kombify UI
4. Scribe automatically captures each click with screenshots
5. Export as:
   - **Embed code** - for interactive tutorials in docs
   - **Markdown** - for static documentation
   - **PDF** - for downloadable guides

### Scribe → Mintlify Integration

Export Scribe guides as Markdown and place them in `/guides/tutorials/`:

```mdx
---
title: "Create your first homelab"
description: "Step-by-step guide to deploying your first stack"
---

{/* Scribe embed - interactive version */}
<iframe 
  src="https://scribehow.com/embed/YOUR_SCRIBE_ID"
  width="100%"
  height="640"
  frameBorder="0"
  allowFullScreen
/>

{/* Or use the Scribe-generated markdown below */}
```

## Directory Structure

```
scripts/screenshots/
├── playwright.config.ts    # Playwright configuration
├── package.json            # Dependencies
├── tests/
│   └── capture.spec.ts     # Screenshot test definitions
└── README.md               # This file

images/screenshots/
├── sphere-dashboard.png    # Generated screenshots
├── stack-nodes.png
├── sim-templates.png
└── ...
```

## CI/CD Integration

Screenshots are automatically updated:

1. **On release** - Full screenshot refresh
2. **On PR** - Visual diff comparison
3. **Weekly** - Scheduled update to catch UI drift

See `.github/workflows/screenshots.yml` for the automation.

## Adding New Screenshots

1. Add a new test to `tests/capture.spec.ts`:

```typescript
test('capture new feature', async ({ page }) => {
  await page.goto(`${SPHERE_URL}/new-feature`);
  await captureScreenshot(page, 'sphere-new-feature', {
    waitFor: '[data-testid="feature-content"]',
  });
});
```

2. Run locally to verify:

```bash
npm run screenshots
```

3. Reference in documentation:

```mdx
<Frame>
  <img src="/images/screenshots/sphere-new-feature.png" alt="New Feature" />
</Frame>
```

## Best Practices

### Screenshot Naming

- Use kebab-case: `sphere-dashboard.png`
- Prefix with product: `sphere-`, `stack-`, `sim-`
- Be descriptive: `sphere-subscription-upgrade-modal.png`

### Consistent Styling

- Default viewport: 1280x720
- Dark mode preferred (matches docs theme)
- Hide dynamic content (timestamps, user avatars)

### Scribe Best Practices

- Record at 1280x720 resolution
- Use clean test accounts (no personal data)
- Annotate important UI elements
- Keep workflows focused (5-10 steps max)
