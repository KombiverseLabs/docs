# kombify Sphere Ecosystem - Project Overview

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Status:** Living Document

---

## Executive Summary

**kombify Sphere** is the SaaS product and ecosystem hub for **homelab infrastructure management**. It combines the open-source **kombify** tools with a SaaS management layer, enabling users to define, simulate, validate, and deploy infrastructure using a unified specification-driven approach.

### Vision Statement

*"One spec file, unified infrastructure — from planning to production."*

kombifySphere empowers developers and homelab enthusiasts to:
- **Define** infrastructure declaratively via YAML/CUE specifications
- **Simulate** deployments before provisioning real hardware
- **Validate** configurations against battle-tested schemas
- **Deploy** to both local servers and cloud VPS seamlessly
- **Manage** everything through a unified SaaS portal

---

## Platform Components

The kombifySphere ecosystem consists of **6 interconnected repositories**.

### Naming & Branding

This documentation uses **product-facing names** while keeping **repository/technical names unchanged**.

| Product / Documentation Name | Repository (technical) | Role |
|---|---|---|
| **kombify Stack** | `KombiStack` | Hybrid Infrastructure Control Plane |
| **kombify Sim** | `KombiSim` | Infrastructure Simulation Engine |
| **kombify stackKits** | `StackKits` | Declarative IaC Blueprints |
| **kombify Sphere** | `KombiSphere-Cloud` | User Portal & Billing |
| **kombify Administration** | `KombiSphere-Admin` | Administration Center |
| **kombify API** | `KombiSphere-API` | API Gateway |

### Repositories

| Product Name | Repository (technical) | License | Tech Stack |
|------------|------|---------|------------|
| **kombify Stack** | **KombiStack** | MIT + AGPL-3.0 | Go, PocketBase, SvelteKit |
| **kombify Sim** | **KombiSim** | MIT | Go, Docker, SvelteKit |
| **kombify StackKits** | **StackKits** | MIT | CUE, OpenTofu, Go |
| **kombifySphere Cloud** | **KombiSphere-Cloud** | Proprietary | SvelteKit, Prisma, Stripe |
| **kombify Administration** | **KombiSphere-Admin** | BSL-1.1 | Go, PocketBase, SvelteKit |
| **kombify API** | **KombiSphere-API** | MIT | Kong, Docker |

### Architecture Tiers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KOMBIFYSPHERE PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────── SaaS Layer ──────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │ kombifySphere   │  │   kombify       │  │   kombify       │        │ │
│  │  │     Cloud       │  │ Administration  │  │      API        │        │ │
│  │  │ (User Portal)   │  │ (Admin Center)  │  │ (Kong Gateway)  │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────── Core Tools Layer ────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │ kombify Stack   │  │  kombify Sim    │  │ kombify StackKits│       │ │
│  │  │ (Orchestration) │  │  (Simulation)   │  │ (IaC Templates) │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Value Propositions

### For Homelab Enthusiasts

| Feature | Benefit |
|---------|---------|
| **Unified Spec File** | Define entire infrastructure in one `kombination.yaml` |
| **Simulation First** | Test configurations with KombiSim before real deployment |
| **Multi-Node Support** | Manage unlimited servers across locations |
| **Secure Networking** | Headscale VPN for mesh connectivity |

### For DevOps Teams

| Feature | Benefit |
|---------|---------|
| **IaC-First** | OpenTofu/Terraform compatibility |
| **CUE Validation** | Type-safe configuration with constraint enforcement |
| **GitOps Ready** | Declarative configs stored in version control |
| **CI/CD Integration** | CLI tools for automation pipelines |

### For Enterprise Users

| Feature | Benefit |
|---------|---------|
| **SaaS Management** | Centralized portal at `kombisphere.io` |
| **SSO Integration** | Zitadel OIDC with enterprise IdP support |
| **Subscription Tiers** | Free, Pro, Enterprise plans |
| **Multi-Tenant** | Organization and team management |

---

## Target Users

### Primary Personas

1. **Homelab Hobbyist**
   - Runs 1-5 servers at home
   - Wants simple setup without deep DevOps knowledge
   - Values documentation and community support

2. **Self-Hosting Developer**
   - Deploys personal projects on VPS + local hardware
   - Comfortable with CLI and configuration files
   - Needs hybrid cloud/local management

3. **Small Team / Startup**
   - 5-20 person team with limited DevOps resources
   - Needs reproducible infrastructure
   - Values automation and documentation

4. **Enterprise DevOps**
   - Large-scale homelab or edge deployments
   - Requires compliance, SSO, and audit trails
   - Needs SLA and dedicated support

---

## Business Model

### Open Core Strategy

| Tier | Components | Availability |
|------|------------|--------------|
| **Open Source** | KombiStack, KombiSim, StackKits | Free forever (MIT/AGPL) |
| **Source Available** | KombiSphere-Admin | BSL-1.1 → Apache 2.0 (4 years) |
| **SaaS** | KombiSphere-Cloud, KombiSphere-API | Subscription-based |

### Subscription Plans

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | 1 stack, community support, basic features |
| **Pro** | $29/mo | 5 stacks, priority support, full simulation |
| **Team** | $79/mo | 20 stacks, team collaboration, SSO |
| **Enterprise** | Custom | Unlimited, dedicated support, SLA |

---

## Technology Decisions

### Why These Technologies?

| Technology | Rationale |
|------------|-----------|
| **Go** | Performance, single binary deployment, strong concurrency |
| **SvelteKit** | Modern, fast UI framework with SSR capabilities |
| **PocketBase** | Embedded database for self-contained deployments |
| **PostgreSQL** | Robust relational DB for SaaS data |
| **CUE** | Type-safe configuration language with constraints |
| **OpenTofu** | Open-source IaC engine (Terraform fork) |
| **Kong** | Battle-tested API gateway with plugin ecosystem |
| **Zitadel** | Modern auth with enterprise SSO features |
| **Stripe** | Industry-standard payment processing |

### Key Architectural Decisions

1. **Spec-Driven Architecture**: Users define intent in YAML, system handles execution
2. **Single Binary Core**: KombiStack ships as one Go binary with embedded PocketBase
3. **Kong-Mediated SSO**: No OIDC complexity inside core tools
4. **Single Platform Database**: One PostgreSQL for Cloud + Admin (Prisma schema)
5. **Feature Flag Sync**: Platform flags pushed to KombiStack instances

For detailed ADRs, see [DECISION_LOG.md](./DECISION_LOG.md).

---

## External Integrations

### Authentication & Identity

| Provider | Purpose | Integration Status |
|----------|---------|-------------------|
| **Zitadel Cloud** | OIDC authentication, user management | ✅ Complete |
| **Google OAuth** | Social login option | 🟡 Planned |
| **GitHub OAuth** | Social login option | 🟡 Planned |

### Payment & Billing

| Provider | Purpose | Integration Status |
|----------|---------|-------------------|
| **Stripe** | Subscription billing, checkout | ✅ Complete |
| **Customer Portal** | Self-service billing management | ✅ Complete |

### Infrastructure Providers

| Provider | Purpose | Integration Status |
|----------|---------|-------------------|
| **Docker** | Container runtime | ✅ Complete |
| **OpenTofu** | IaC execution | ✅ Complete |
| **Hetzner Cloud** | VPS provisioning | 🟡 Planned |
| **AWS** | Cloud resources | 🟡 Planned |
| **Azure** | Cloud resources | 🟡 Planned |

### Observability

| Provider | Purpose | Integration Status |
|----------|---------|-------------------|
| **Prometheus** | Metrics collection | ✅ Complete |
| **Meilisearch** | Full-text search (Admin) | ✅ Complete |
| **Axiom** | Log aggregation | 🟡 Planned |

---

## Documentation Map

### Central Documentation (This Repository)

| Document | Purpose |
|----------|---------|
| [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | High-level vision and ecosystem summary |
| [KombiSphere_Architecture.md](./KombiSphere_Architecture.md) | Unified architecture specification |
| [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) | Detailed guide for each component |
| [FEATURE_CATALOG.md](./FEATURE_CATALOG.md) | Unified feature list across ecosystem |
| [INTER_MODULE_CONTRACTS.md](./INTER_MODULE_CONTRACTS.md) | API contracts between modules |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Setup and development workflow |
| [UNIFIED_DATA_ARCHITECTURE.md](./UNIFIED_DATA_ARCHITECTURE.md) | Data ownership and flow |
| [DOPPLER_SECRETS_STRATEGY.md](./DOPPLER_SECRETS_STRATEGY.md) | Secrets management |
| [DECISION_LOG.md](./DECISION_LOG.md) | Architecture decision records |
| [CONSISTENCY_AUDIT.md](./CONSISTENCY_AUDIT.md) | Identified issues and contradictions |

### Module-Specific Documentation

| Module | Key Documents |
|--------|---------------|
| **KombiStack** | `docs/DEVELOPMENT.md`, `docs/ROADMAP.md`, `DECISIONS.md` |
| **KombiSim** | `docs/ARCHITECTURE.md`, `docs/API.md`, `CONTRIBUTING.md` |
| **StackKits** | `docs/CLI.md`, `ADR/`, `base/doc.cue` |
| **KombiSphere-Cloud** | `docs/ARCHITECTURE.md`, `prisma/schema.prisma` |
| **KombiSphere-Admin** | `docs/ARCHITECTURE.md`, `docs/API.md` |
| **KombiSphere-API** | `docs/AUTHENTICATION.md`, `kong/kong.yml` |

---

## Quick Links

### Production URLs

| Service | URL |
|---------|-----|
| **User Portal** | https://kombisphere.io |
| **Admin Portal** | https://admin.kombisphere.io |
| **API Gateway** | https://api.kombisphere.io |
| **Auth** | https://auth.kombisphere.io |
| **Docs** | https://docs.kombisphere.io |

### Development URLs (Local)

| Service | URL |
|---------|-----|
| **Cloud Portal** | http://localhost:3000 |
| **Admin Portal** | http://localhost:8090 |
| **API Gateway** | http://localhost:8000 |
| **KombiStack** | http://localhost:5260 |
| **KombiSim** | http://localhost:5270 |

### Repositories

| Repo | GitHub |
|------|--------|
| **KombiStack** | https://github.com/Soulcreek/KombiStack |
| **KombiSim** | https://github.com/kombisphere/kombisim |
| **StackKits** | https://github.com/kombihq/stackkits |
| **KombiSphere-Cloud** | Private |
| **KombiSphere-Admin** | Private |
| **KombiSphere-API** | Private |

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-01-23 | 1.0.0 | Initial comprehensive project overview |
