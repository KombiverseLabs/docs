# kombify Mintlify Documentation Structure

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Status:** Proposal

---

## Overview

Dieses Dokument definiert die Struktur der öffentlichen kombify-Dokumentation auf Mintlify.

### Design Principles

1. **SaaS first** — kombify Sphere als Haupt-Produkt prominenter
2. **Developer-friendly** — Klare API-Referenzen für jedes Tool
3. **Self-host possible** — Open Core Tools mit Self-Hosting-Guides
4. **Progressive disclosure** — Von einfach (Getting Started) zu komplex (API Reference)

---

## Navigation Structure

```
docs.kombify.dev
│
├── 📚 Getting Started
│   ├── What is kombify?
│   ├── Quick Start (Sphere)
│   └── Quick Start (Self-Hosted)
│
├── 🌐 kombify Sphere (SaaS)
│   ├── Overview
│   ├── Authentication
│   │   ├── Single Sign-On (Zitadel)
│   │   └── API Tokens
│   ├── Dashboard Guide
│   ├── Stack Management
│   ├── Simulations
│   ├── Billing & Plans
│   └── Team Management
│
├── 🔧 Open Core Tools
│   │
│   ├── kombify Stack
│   │   ├── Overview
│   │   ├── Installation
│   │   │   ├── Docker
│   │   │   ├── Kubernetes
│   │   │   └── Bare Metal
│   │   ├── Configuration
│   │   ├── Agent Setup
│   │   ├── Unifier Engine
│   │   └── Troubleshooting
│   │
│   ├── kombify Sim
│   │   ├── Overview
│   │   ├── Installation
│   │   │   ├── Docker
│   │   │   └── Docker Compose
│   │   ├── Configuration
│   │   ├── Templates
│   │   ├── SSH Access
│   │   └── Troubleshooting
│   │
│   └── kombify StackKits
│       ├── Overview
│       ├── Installation
│       ├── Writing CUE Schemas
│       ├── Built-in StackKits
│       │   ├── base-homelab
│       │   ├── ha-homelab
│       │   └── modern-homelab
│       └── Custom StackKits
│
├── 📖 API Reference
│   ├── Authentication
│   │
│   ├── kombify Stack API
│   │   ├── Stacks
│   │   ├── Nodes
│   │   ├── Jobs
│   │   └── Events (SSE)
│   │
│   ├── kombify Sim API
│   │   ├── Simulations
│   │   ├── Nodes
│   │   ├── Templates
│   │   └── SSH
│   │
│   └── kombify StackKits API
│       ├── StackKits
│       ├── Validation
│       └── Generation
│
├── 🎓 Concepts
│   ├── Architecture Overview
│   ├── Spec-Driven Infrastructure
│   ├── Unifier Pattern
│   ├── StackKits Explained
│   └── Security Model
│
├── 🤝 Integrations
│   ├── Zitadel (SSO)
│   ├── Stripe (Billing)
│   ├── GitHub Actions
│   ├── Coolify
│   └── Proxmox
│
└── 📣 Resources
    ├── Changelog
    ├── Roadmap
    ├── Contributing
    └── Community
```

---

## mint.json Configuration

```json
{
  "$schema": "https://mintlify.com/schema.json",
  "name": "kombify",
  "logo": {
    "dark": "/logo/kombify-dark.svg",
    "light": "/logo/kombify-light.svg"
  },
  "favicon": "/favicon.svg",
  "colors": {
    "primary": "#6366F1",
    "light": "#818CF8",
    "dark": "#4F46E5",
    "anchors": {
      "from": "#6366F1",
      "to": "#8B5CF6"
    }
  },
  "topbarLinks": [
    {
      "name": "Support",
      "url": "mailto:support@kombify.dev"
    }
  ],
  "topbarCtaButton": {
    "name": "Dashboard",
    "url": "https://app.kombisphere.io"
  },
  "tabs": [
    {
      "name": "API Reference",
      "url": "api-reference"
    }
  ],
  "anchors": [
    {
      "name": "GitHub",
      "icon": "github",
      "url": "https://github.com/kombify"
    },
    {
      "name": "Community",
      "icon": "discord",
      "url": "https://discord.gg/kombify"
    },
    {
      "name": "Blog",
      "icon": "newspaper",
      "url": "https://kombify.dev/blog"
    }
  ],
  "navigation": [
    {
      "group": "Getting Started",
      "pages": [
        "introduction",
        "quickstart",
        "quickstart-selfhosted"
      ]
    },
    {
      "group": "kombify Sphere",
      "pages": [
        "sphere/overview",
        {
          "group": "Authentication",
          "pages": [
            "sphere/auth/sso",
            "sphere/auth/api-tokens"
          ]
        },
        "sphere/dashboard",
        "sphere/stacks",
        "sphere/simulations",
        "sphere/billing",
        "sphere/teams"
      ]
    },
    {
      "group": "kombify Stack",
      "pages": [
        "stack/overview",
        {
          "group": "Installation",
          "pages": [
            "stack/install/docker",
            "stack/install/kubernetes",
            "stack/install/bare-metal"
          ]
        },
        "stack/configuration",
        "stack/agents",
        "stack/unifier",
        "stack/troubleshooting"
      ]
    },
    {
      "group": "kombify Sim",
      "pages": [
        "sim/overview",
        {
          "group": "Installation",
          "pages": [
            "sim/install/docker",
            "sim/install/compose"
          ]
        },
        "sim/configuration",
        "sim/templates",
        "sim/ssh",
        "sim/troubleshooting"
      ]
    },
    {
      "group": "kombify StackKits",
      "pages": [
        "stackkits/overview",
        "stackkits/installation",
        "stackkits/writing-cue",
        {
          "group": "Built-in StackKits",
          "pages": [
            "stackkits/builtin/base-homelab",
            "stackkits/builtin/ha-homelab",
            "stackkits/builtin/modern-homelab"
          ]
        },
        "stackkits/custom"
      ]
    },
    {
      "group": "Concepts",
      "pages": [
        "concepts/architecture",
        "concepts/spec-driven",
        "concepts/unifier",
        "concepts/stackkits-explained",
        "concepts/security"
      ]
    },
    {
      "group": "Integrations",
      "pages": [
        "integrations/zitadel",
        "integrations/stripe",
        "integrations/github-actions",
        "integrations/coolify",
        "integrations/proxmox"
      ]
    },
    {
      "group": "Resources",
      "pages": [
        "changelog",
        "roadmap",
        "contributing",
        "community"
      ]
    }
  ],
  "footerSocials": {
    "x": "https://x.com/kombifydev",
    "github": "https://github.com/kombify",
    "discord": "https://discord.gg/kombify"
  },
  "api": {
    "baseUrl": "https://api.kombisphere.io",
    "auth": {
      "method": "bearer"
    }
  },
  "openapi": [
    "api-reference/openapi-stack.json",
    "api-reference/openapi-sim.json",
    "api-reference/openapi-stackkits.json"
  ]
}
```

---

## API Reference Tab Structure

```
api-reference/
│
├── introduction.mdx
├── authentication.mdx
│
├── stack/
│   ├── overview.mdx
│   ├── stacks-list.mdx
│   ├── stacks-create.mdx
│   ├── stacks-get.mdx
│   ├── stacks-update.mdx
│   ├── stacks-delete.mdx
│   ├── nodes-list.mdx
│   ├── nodes-get.mdx
│   ├── jobs-list.mdx
│   ├── jobs-get.mdx
│   └── events-sse.mdx
│
├── sim/
│   ├── overview.mdx
│   ├── simulations-list.mdx
│   ├── simulations-create.mdx
│   ├── simulations-get.mdx
│   ├── simulations-delete.mdx
│   ├── nodes-list.mdx
│   ├── nodes-get.mdx
│   ├── templates-list.mdx
│   └── ssh-access.mdx
│
└── stackkits/
    ├── overview.mdx
    ├── stackkits-list.mdx
    ├── stackkits-get.mdx
    ├── validate.mdx
    └── generate.mdx
```

---

## OpenAPI Specifications

### kombify Stack API (openapi-stack.json)

```yaml
openapi: 3.1.0
info:
  title: kombify Stack API
  version: 1.0.0
  description: Infrastructure control plane API
servers:
  - url: https://api.kombisphere.io/v1/stack
paths:
  /stacks:
    get:
      summary: List stacks
      operationId: listStacks
      tags: [Stacks]
    post:
      summary: Create stack
      operationId: createStack
      tags: [Stacks]
  /stacks/{id}:
    get:
      summary: Get stack
      operationId: getStack
      tags: [Stacks]
  /nodes:
    get:
      summary: List nodes
      operationId: listNodes
      tags: [Nodes]
  /jobs:
    get:
      summary: List jobs
      operationId: listJobs
      tags: [Jobs]
```

### kombify Sim API (openapi-sim.json)

```yaml
openapi: 3.1.0
info:
  title: kombify Sim API
  version: 1.0.0
  description: Infrastructure simulation API
servers:
  - url: https://api.kombisphere.io/v1/sim
paths:
  /simulations:
    get:
      summary: List simulations
      operationId: listSimulations
      tags: [Simulations]
    post:
      summary: Create simulation
      operationId: createSimulation
      tags: [Simulations]
  /simulations/{id}:
    get:
      summary: Get simulation
      operationId: getSimulation
      tags: [Simulations]
    delete:
      summary: Delete simulation
      operationId: deleteSimulation
      tags: [Simulations]
  /templates:
    get:
      summary: List templates
      operationId: listTemplates
      tags: [Templates]
```

### kombify StackKits API (openapi-stackkits.json)

```yaml
openapi: 3.1.0
info:
  title: kombify StackKits API
  version: 1.0.0
  description: StackKit management and validation API
servers:
  - url: https://api.kombisphere.io/v1/stackkits
paths:
  /stackkits:
    get:
      summary: List StackKits
      operationId: listStackKits
      tags: [StackKits]
  /stackkits/{id}:
    get:
      summary: Get StackKit
      operationId: getStackKit
      tags: [StackKits]
  /validate:
    post:
      summary: Validate configuration
      operationId: validateConfig
      tags: [Validation]
  /generate:
    post:
      summary: Generate IaC
      operationId: generateIaC
      tags: [Generation]
```

---

## Page Templates

### Tool Overview Page

```mdx
---
title: 'kombify Stack'
description: 'Hybrid infrastructure control plane'
icon: 'server'
---

<Card title="What is kombify Stack?" icon="circle-info">
  kombify Stack is an open-source infrastructure control plane that manages
  your homelab nodes through a unified spec-driven workflow.
</Card>

## Key Features

<CardGroup cols={2}>
  <Card title="Spec-Driven" icon="file-code">
    Define your infrastructure in YAML, let Stack handle the rest.
  </Card>
  <Card title="Agent-Based" icon="robot">
    Lightweight agents connect nodes to the control plane.
  </Card>
  <Card title="Multi-Engine" icon="gears">
    Support for Proxmox, Docker, and cloud providers.
  </Card>
  <Card title="Open Source" icon="code-branch">
    MIT licensed core with optional enterprise features.
  </Card>
</CardGroup>

## Quick Links

<CardGroup cols={3}>
  <Card title="Installation" icon="download" href="/stack/install/docker">
    Get started with Docker
  </Card>
  <Card title="Configuration" icon="sliders" href="/stack/configuration">
    Configure your instance
  </Card>
  <Card title="API Reference" icon="code" href="/api-reference/stack/overview">
    Explore the API
  </Card>
</CardGroup>
```

### API Endpoint Page

```mdx
---
title: 'Create Stack'
api: 'POST https://api.kombisphere.io/v1/stack/stacks'
description: 'Create a new stack instance'
---

## Request Body

<ParamField body="name" type="string" required>
  Name of the stack
</ParamField>

<ParamField body="stackkit_id" type="string" required>
  StackKit template to use
</ParamField>

<ParamField body="config" type="object">
  Stack configuration
</ParamField>

## Response

<ResponseField name="id" type="string">
  Unique stack identifier
</ResponseField>

<ResponseField name="status" type="string">
  Current status (pending, provisioning, running, failed)
</ResponseField>

<RequestExample>
```bash
curl -X POST https://api.kombisphere.io/v1/stack/stacks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-homelab",
    "stackkit_id": "base-homelab",
    "config": {
      "domain": "home.local"
    }
  }'
```
</RequestExample>

<ResponseExample>
```json
{
  "id": "stack_abc123",
  "name": "my-homelab",
  "status": "provisioning",
  "created_at": "2026-01-23T10:00:00Z"
}
```
</ResponseExample>
```

---

## Directory Structure

```
docs/
├── mint.json
├── logo/
│   ├── kombify-dark.svg
│   └── kombify-light.svg
├── favicon.svg
│
├── introduction.mdx
├── quickstart.mdx
├── quickstart-selfhosted.mdx
│
├── sphere/
│   ├── overview.mdx
│   ├── auth/
│   │   ├── sso.mdx
│   │   └── api-tokens.mdx
│   ├── dashboard.mdx
│   ├── stacks.mdx
│   ├── simulations.mdx
│   ├── billing.mdx
│   └── teams.mdx
│
├── stack/
│   ├── overview.mdx
│   ├── install/
│   │   ├── docker.mdx
│   │   ├── kubernetes.mdx
│   │   └── bare-metal.mdx
│   ├── configuration.mdx
│   ├── agents.mdx
│   ├── unifier.mdx
│   └── troubleshooting.mdx
│
├── sim/
│   ├── overview.mdx
│   ├── install/
│   │   ├── docker.mdx
│   │   └── compose.mdx
│   ├── configuration.mdx
│   ├── templates.mdx
│   ├── ssh.mdx
│   └── troubleshooting.mdx
│
├── stackkits/
│   ├── overview.mdx
│   ├── installation.mdx
│   ├── writing-cue.mdx
│   ├── builtin/
│   │   ├── base-homelab.mdx
│   │   ├── ha-homelab.mdx
│   │   └── modern-homelab.mdx
│   └── custom.mdx
│
├── concepts/
│   ├── architecture.mdx
│   ├── spec-driven.mdx
│   ├── unifier.mdx
│   ├── stackkits-explained.mdx
│   └── security.mdx
│
├── integrations/
│   ├── zitadel.mdx
│   ├── stripe.mdx
│   ├── github-actions.mdx
│   ├── coolify.mdx
│   └── proxmox.mdx
│
├── api-reference/
│   ├── introduction.mdx
│   ├── authentication.mdx
│   ├── openapi-stack.json
│   ├── openapi-sim.json
│   ├── openapi-stackkits.json
│   ├── stack/
│   │   └── *.mdx
│   ├── sim/
│   │   └── *.mdx
│   └── stackkits/
│       └── *.mdx
│
├── changelog.mdx
├── roadmap.mdx
├── contributing.mdx
└── community.mdx
```

---

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Set up Mintlify project
- [ ] Create mint.json
- [ ] Add logos and branding
- [ ] Create navigation structure

### Phase 2: Getting Started
- [ ] Write introduction.mdx
- [ ] Write quickstart.mdx (Sphere)
- [ ] Write quickstart-selfhosted.mdx

### Phase 3: Sphere Documentation
- [ ] Sphere overview
- [ ] Authentication guides
- [ ] Dashboard guide
- [ ] Feature documentation

### Phase 4: Open Core Tools
- [ ] Stack documentation (all pages)
- [ ] Sim documentation (all pages)
- [ ] StackKits documentation (all pages)

### Phase 5: API Reference
- [ ] Generate OpenAPI specs from code
- [ ] Create API authentication page
- [ ] Generate endpoint pages

### Phase 6: Concepts & Integrations
- [ ] Architecture overview
- [ ] Concept pages
- [ ] Integration guides

### Phase 7: Resources
- [ ] Changelog (auto-generate from CHANGELOG.md)
- [ ] Roadmap
- [ ] Contributing guide
- [ ] Community links

---

*Last reviewed: 2026-01-23*
