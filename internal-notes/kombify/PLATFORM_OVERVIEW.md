# kombify Platform Overview

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-23  
> **Status:** Production Ready

---

## Executive Summary

**kombify** ist das Ökosystem für **Homelab Infrastructure Management**. Es vereint Open-Source-Tools mit einer SaaS-Management-Schicht, die es Benutzern ermöglicht, Infrastruktur deklarativ zu definieren, zu simulieren, zu validieren und bereitzustellen.

### Vision Statement

*"One spec file, unified infrastructure — from planning to production."*

kombify befähigt Entwickler und Homelab-Enthusiasten:
- **Definieren** von Infrastruktur deklarativ via YAML/CUE-Spezifikationen
- **Simulieren** von Deployments vor der Bereitstellung auf echter Hardware
- **Validieren** von Konfigurationen gegen bewährte Schemata
- **Bereitstellen** auf lokalen Servern und Cloud-VPS nahtlos
- **Verwalten** von allem über ein einheitliches SaaS-Portal

---

## Platform Components

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KOMBIFY PLATFORM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────── SaaS Layer ──────────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │ kombify Sphere  │  │    kombify      │  │    kombify      │        │ │
│  │  │  (User Portal)  │  │ Administration  │  │      API        │        │ │
│  │  │                 │  │ (Admin Center)  │  │ (Kong Gateway)  │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────── Open Core Layer ─────────────────────────────────┐ │
│  │                                                                         │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │ kombify Stack   │  │  kombify Sim    │  │kombify StackKits│        │ │
│  │  │ (Orchestration) │  │  (Simulation)   │  │ (IaC Blueprints)│        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Matrix

| Component | Product Name | Repository | Role | License |
|-----------|--------------|------------|------|---------|
| **Stack** | kombify Stack | KombiStack | Hybrid Infrastructure Control Plane | MIT + AGPL-3.0 |
| **Sim** | kombify Sim | KombiSim | Infrastructure Simulation Engine | MIT |
| **StackKits** | kombify StackKits | StackKits | Declarative IaC Blueprints | MIT |
| **Sphere** | kombify Sphere | KombiSphere-Cloud | User Portal & Billing | Proprietary |
| **Administration** | kombify Administration | KombiSphere-Admin | Admin Center & Tools Catalog | BSL-1.1 |
| **API** | kombify API | KombiSphere-API | Central API Gateway | MIT |

---

## Technology Stack

### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Primary Language** | Go | 1.24+ | Backend services |
| **Frontend Framework** | SvelteKit | 2.x | Web applications |
| **Configuration Language** | CUE | 0.15+ | Schema validation |
| **IaC Engine** | OpenTofu | 1.9+ | Infrastructure provisioning |
| **Orchestration** | Terramate | latest | Advanced IaC orchestration |

### Database & Storage

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Platform Database** | PostgreSQL + Prisma | SaaS platform data |
| **Tool Database** | PocketBase (SQLite) | Embedded per-instance storage |
| **Search** | Meilisearch | Full-text search (Admin) |
| **Cache** | Redis | Rate limiting, sessions |

### Authentication & Security

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Identity Provider** | Zitadel Cloud | SSO, OIDC, MFA |
| **API Gateway** | Kong Gateway | JWT validation, routing |
| **Certificate Management** | mTLS (internal CA) | Agent communication |
| **Secrets Management** | Doppler | Environment secrets |

### External Integrations

| Service | Purpose |
|---------|---------|
| **Stripe** | Subscription billing |
| **GitHub** | Tool discovery, OAuth |
| **Hetzner** | Cloud provider integration |
| **Docker Hub** | Container registry |

---

## Service Architecture

### Service Ports (Development)

| Service | Port | Protocol | Component |
|---------|------|----------|-----------|
| kombify Stack - API | 5260 | HTTP | Core API + PocketBase |
| kombify Stack - UI | 5261 | HTTP | SvelteKit Dashboard |
| kombify Stack - gRPC | 5263 | gRPC/mTLS | Worker agents |
| kombify Sim - API | 5270 | HTTP | Simulation API |
| kombify Sim - UI | 5271 | HTTP | Simulation Dashboard |
| SSH Nodes | 2222-2322 | SSH | Simulated containers |

### Production Domains

| Service | Domain | Purpose |
|---------|--------|---------|
| **kombify Sphere** | app.kombisphere.io | User portal |
| **kombify Administration** | admin.kombisphere.io | Admin portal |
| **kombify API** | api.kombisphere.io | API gateway |
| **Authentication** | auth.kombisphere.io | Zitadel SSO |
| **Documentation** | docs.kombisphere.io | Mintlify docs |

---

## Data Flow Overview

### User Journey: From Intent to Infrastructure

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   1. Intent  │───▶│  2. Validate │───▶│  3. Simulate │───▶│  4. Deploy   │
│   (Wizard)   │    │   (Unifier)  │    │    (Sim)     │    │   (Stack)    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
  kombination.yaml  CUE Validation    Docker Containers   Real Infrastructure
```

### Spec Pipeline (Three-Stage)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Intent-Spec    │────▶│ Requirements-   │────▶│  Unified-Spec   │
│                 │     │     Spec        │     │                 │
│ User goals &    │     │ CPU, RAM,       │     │ Final validated │
│ high-level      │     │ storage,        │     │ configuration   │
│ constraints     │     │ network layout  │     │ for rollout     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Business Model

### Open Core Strategy

| Tier | Components | Availability |
|------|------------|--------------|
| **Open Source** | kombify Stack, kombify Sim, kombify StackKits | Free forever (MIT/AGPL) |
| **Source Available** | kombify Administration | BSL-1.1 → Apache 2.0 (4 years) |
| **Proprietary** | kombify Sphere | Subscription-based SaaS |

### Subscription Plans

| Plan | Price | Features |
|------|-------|----------|
| **Free** | €0/month | 1 homelab instance, community support |
| **Pro** | €9/month | 3 instances, priority support, advanced features |
| **Enterprise** | Custom | Unlimited, SLA, dedicated support |

---

## Target Users

### Primary Personas

1. **Homelab Hobbyist**
   - 1-5 servers at home
   - Values simplicity and documentation
   - Needs guided setup experience

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

## Key Design Principles

### 1. Spec-Driven Architecture

```
User Intent → kombination.yaml → Unifier → OpenTofu → Infrastructure
```

- User intent is never auto-modified
- All transformations produce separate artifacts
- Single source of truth in YAML/CUE

### 2. Single-Stack Per Instance

**1 kombify Stack = 1 Homelab**

- One instance manages exactly one homelab
- A homelab can span multiple physical servers
- Multi-homelab scenarios require multiple instances

### 3. Interface-First Design

- Business logic changes start with interfaces
- Implementations follow contracts
- Clear separation of concerns

### 4. Dual-Mode Deployment

| Mode | Tool | Use Case |
|------|------|----------|
| **Simple** | OpenTofu | Single-stack, simple setups |
| **Advanced** | Terramate | Multi-stack, drift detection |

---

## Related Documentation

- [Unified Architecture](./UNIFIED_ARCHITECTURE.md)
- [Inter-Module Contracts](./INTER_MODULE_CONTRACTS.md)
- [Tool-Specific Docs](./tools/)

---

*Last reviewed: 2026-01-23*
