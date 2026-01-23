# kombifySphere - Feature Catalog

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Purpose:** Unified feature listing across the entire ecosystem

---

## Table of Contents

1. [Core Tools Features](#1-core-tools-features)
2. [SaaS Platform Features](#2-saas-platform-features)
3. [Integration Features](#3-integration-features)
4. [Feature Availability Matrix](#4-feature-availability-matrix)
5. [Roadmap Features](#5-roadmap-features)

---

## 1. Core Tools Features

### KombiStack (kombify Stack) - Infrastructure Orchestration

#### Deployment & Provisioning

| Feature | Description | Status |
|---------|-------------|--------|
| **Spec-Driven Deployment** | Define infrastructure in `kombination.yaml` | ✅ Complete |
| **Unifier Engine** | Resolves user intent to OpenTofu config | ✅ Complete |
| **OpenTofu Integration** | IaC execution engine | ✅ Complete |
| **CUE Validation** | Schema-based configuration validation | ✅ Complete |
| **Multi-Node Management** | Manage unlimited servers | ✅ Complete |
| **Provider Support: Local** | Local server provisioning | ✅ Complete |
| **Provider Support: Hetzner** | Hetzner Cloud VPS | 🟡 Planned |
| **Provider Support: AWS** | AWS EC2 instances | 🟡 Planned |
| **Provider Support: Azure** | Azure VMs | 🟡 Planned |

#### Workflow & Automation

| Feature | Description | Status |
|---------|-------------|--------|
| **Workflow Definition** | YAML-based workflow specs | ✅ Complete |
| **Workflow Execution** | Multi-step automation | ✅ Complete |
| **Job Scheduling** | Background task execution | ✅ Complete |
| **Worker Agents** | gRPC agents on remote nodes | ✅ Complete |
| **Worker mTLS** | Secure agent communication | ✅ Complete |
| **Healing Agent** | Auto-recovery workflows | 🚧 In Progress |

#### Networking

| Feature | Description | Status |
|---------|-------------|--------|
| **Headscale VPN** | Self-hosted Tailscale mesh | ✅ Complete |
| **Network Discovery** | Zeroconf/mDNS | ✅ Complete |
| **SSH Management** | Key provisioning | ✅ Complete |

#### User Interface

| Feature | Description | Status |
|---------|-------------|--------|
| **Web Dashboard** | SvelteKit-based UI | ✅ Complete |
| **Setup Wizard** | Guided initial configuration | ✅ Complete |
| **Stack Visualization** | Infrastructure diagram view | 🚧 In Progress |
| **Real-time Logs** | Live execution logs | ✅ Complete |

---

### KombiSim (kombify Sim) - Simulation Engine

#### Simulation Core

| Feature | Description | Status |
|---------|-------------|--------|
| **Docker Simulation** | Lightweight container "VMs" | ✅ Complete |
| **Real SSH Access** | SSH into simulated nodes | ✅ Complete |
| **Simulation Groups** | Organize nodes logically | ✅ Complete |
| **Node Types** | VPS vs local distinction | ✅ Complete |
| **Simulation Lifecycle** | Start/stop/delete | ✅ Complete |
| **Resource Limits** | CPU/memory constraints | 🟡 Planned |

#### Template System

| Feature | Description | Status |
|---------|-------------|--------|
| **Template Library** | 6 built-in templates | ✅ Complete |
| **One-Click Apply** | Apply template instantly | ✅ Complete |
| **Custom Templates** | User-defined templates | 🟡 Planned |
| **Template Export** | Export running sim as template | 🟡 Planned |

#### User Interface

| Feature | Description | Status |
|---------|-------------|--------|
| **Web Dashboard** | SvelteKit UI | ✅ Complete |
| **Node Status View** | Real-time node states | ✅ Complete |
| **SSH Connection Info** | Quick connection details | ✅ Complete |
| **Simulation Statistics** | Resource usage metrics | 🚧 In Progress |

---

### StackKits (kombify StackKits) - IaC Blueprints

#### Configuration System

| Feature | Description | Status |
|---------|-------------|--------|
| **CUE Schemas** | Type-safe configuration | ✅ Complete |
| **3-Layer Architecture** | Core → Platform → StackKit | ✅ Complete |
| **Constraint Validation** | Policy enforcement | ✅ Complete |
| **Default Values** | Smart defaults | ✅ Complete |
| **Variant System** | OS-specific variants | ✅ Complete |

#### StackKit Library

| Feature | Description | Status |
|---------|-------------|--------|
| **base-homelab** | Single-node Docker setup | ✅ Complete |
| **modern-homelab** | Multi-node Docker + Dokploy | 🚧 Schema Only |
| **ha-homelab** | Docker Swarm HA cluster | 🚧 Schema Only |
| **cloud-hybrid** | Mixed cloud/local | 🟡 Planned |

#### CLI Tools

| Feature | Description | Status |
|---------|-------------|--------|
| **stackkit init** | Initialize new stackkit | ✅ Complete |
| **stackkit prepare** | Validate prerequisites | ✅ Complete |
| **stackkit generate** | Generate OpenTofu files | ✅ Complete |
| **stackkit plan** | Preview changes | ✅ Complete |
| **stackkit apply** | Apply configuration | ✅ Complete |
| **stackkit validate** | Validate spec file | ✅ Complete |

---

## 2. SaaS Platform Features

### KombiSphere-Cloud (kombifySphere Cloud) - User Portal

#### Authentication & Identity

| Feature | Description | Status |
|---------|-------------|--------|
| **Zitadel OIDC Login** | Enterprise SSO | ✅ Complete |
| **Session Management** | 7-day JWT sessions | ✅ Complete |
| **SSO Token Generation** | Tokens for core tools | ✅ 80% |
| **Social Login: Google** | OAuth integration | 🟡 Planned |
| **Social Login: GitHub** | OAuth integration | 🟡 Planned |
| **MFA Support** | Via Zitadel | ✅ Complete |

#### Subscription & Billing

| Feature | Description | Status |
|---------|-------------|--------|
| **Stripe Checkout** | Subscription purchase | ✅ Complete |
| **Customer Portal** | Self-service billing | ✅ Complete |
| **Plan: Free** | Basic tier ($0/mo) | ✅ Complete |
| **Plan: Pro** | Professional tier ($29/mo) | ✅ Complete |
| **Plan: Enterprise** | Enterprise tier (custom) | ✅ Complete |
| **Webhook Handling** | Subscription events | ✅ Complete |
| **Invoice History** | View past invoices | ✅ 90% |
| **Usage Tracking** | API call metering | 🚧 70% |

#### User Dashboard

| Feature | Description | Status |
|---------|-------------|--------|
| **Profile Management** | Edit profile, avatar | ✅ 90% |
| **Activity Log** | Recent actions audit | ✅ 90% |
| **Tool Launcher** | SSO access to tools | ✅ Complete |
| **Notifications** | In-app notifications | 🟡 Planned |

#### Marketing & Public Pages

| Feature | Description | Status |
|---------|-------------|--------|
| **Landing Page** | Marketing homepage | ✅ Complete |
| **Pricing Page** | Plan comparison | ✅ Complete |
| **Features Page** | Feature highlights | ✅ Complete |
| **Documentation** | Public docs site | 🚧 In Progress |

---

### KombiSphere-Admin (kombify Administration) - Administration

#### Tools Management

| Feature | Description | Status |
|---------|-------------|--------|
| **Tools Catalog** | Full tool database | ✅ 100% |
| **Category Management** | Taxonomy system | ✅ 100% |
| **Pattern Management** | Infrastructure patterns | ✅ 100% |
| **Tool Evaluation** | AI-assisted scoring | ✅ 100% |
| **Version Tracking** | Changelog monitoring | ✅ Complete |

#### Discovery Engine

| Feature | Description | Status |
|---------|-------------|--------|
| **GitHub Crawler** | Discover tools from GitHub | ✅ Complete |
| **npm/PyPI Tracking** | Package registry crawling | ✅ Complete |
| **Awesome List Parser** | Curated list ingestion | ✅ Complete |
| **AI Tool Analysis** | LLM-based evaluation | ✅ Complete |
| **Meilisearch Integration** | Full-text search | ✅ Complete |

#### User Administration

| Feature | Description | Status |
|---------|-------------|--------|
| **User List** | View all users | ✅ 95% |
| **User Details** | Profile inspection | ✅ Complete |
| **User Locking** | Suspend accounts | ✅ Complete |
| **MFA Reset** | Reset user MFA | ✅ Complete |
| **Session Revocation** | Force logout | ✅ Complete |
| **User Impersonation** | Support access (with audit) | ✅ Complete |

#### Organization Management

| Feature | Description | Status |
|---------|-------------|--------|
| **Org List** | View organizations | ✅ 90% |
| **Org Details** | Organization info | ✅ Complete |
| **Member Management** | Add/remove members | 🚧 In Progress |
| **Role Assignment** | Assign org roles | ✅ Complete |

#### Platform Operations

| Feature | Description | Status |
|---------|-------------|--------|
| **Feature Flags** | Platform-wide flags | ✅ Complete |
| **Billing Dashboard** | Stripe metrics | ✅ 100% |
| **Support Tickets** | Internal ticketing | ✅ 80% |
| **Admin Analytics** | Usage metrics | ✅ 85% |

---

### KombiSphere-API (kombify API) - Gateway

#### Security & Authentication

| Feature | Description | Status |
|---------|-------------|--------|
| **JWT Validation** | Zitadel token verification | ✅ 95% |
| **API Key Auth** | Service account tokens | ✅ 90% |
| **Rate Limiting** | Per-route throttling | ✅ 85% |
| **CORS Management** | Cross-origin policies | ✅ 100% |
| **Security Headers** | HSTS, XSS, etc. | ✅ 100% |

#### Routing & Proxying

| Feature | Description | Status |
|---------|-------------|--------|
| **HTTP Routing** | REST API routing | ✅ 100% |
| **gRPC Routing** | Worker connections | ✅ 100% |
| **Load Balancing** | Multi-instance support | 🟡 Planned |
| **Health Checks** | Upstream monitoring | ✅ Complete |

#### Request Transformation

| Feature | Description | Status |
|---------|-------------|--------|
| **Header Injection** | X-User-ID, X-Org-ID | ✅ Complete |
| **Request Logging** | Access logs | ✅ Complete |
| **Response Transform** | Header modification | ✅ Complete |

---

## 3. Integration Features

### Authentication Integration

| Feature | Components | Status |
|---------|------------|--------|
| **Zitadel OIDC** | Cloud, Admin | ✅ Complete |
| **Kong JWT Plugin** | API Gateway | ✅ Complete |
| **Service Accounts** | Internal comms | ✅ Complete |
| **SSO Bridge** | Cloud → KombiStack | ✅ 80% |

### Payment Integration

| Feature | Components | Status |
|---------|------------|--------|
| **Stripe Checkout** | Cloud | ✅ Complete |
| **Webhook Handler** | Cloud, Admin | ✅ Complete |
| **Customer Portal** | Cloud | ✅ Complete |
| **Billing Mirror** | Admin (optional) | ✅ Complete |

### Database Integration

| Feature | Components | Status |
|---------|------------|--------|
| **Shared PostgreSQL** | Cloud + Admin | ✅ Complete |
| **Prisma Schema** | Cloud | ✅ Complete |
| **PocketBase Embedded** | KombiStack | ✅ Complete |
| **SQLite Embedded** | KombiSim | ✅ Complete |

### Feature Flag Sync

| Feature | Components | Status |
|---------|------------|--------|
| **Flag Definition** | Admin | ✅ Complete |
| **Flag Distribution** | Admin → Cloud | ✅ Complete |
| **Flag Application** | Admin → KombiStack | 🚧 In Progress |

---

## 4. Feature Availability Matrix

### By Subscription Plan

| Feature | Free | Pro | Team | Enterprise |
|---------|:----:|:---:|:----:|:----------:|
| KombiStack (1 stack) | ✅ | ✅ | ✅ | ✅ |
| KombiStack (5 stacks) | ❌ | ✅ | ✅ | ✅ |
| KombiStack (20 stacks) | ❌ | ❌ | ✅ | ✅ |
| KombiStack (unlimited) | ❌ | ❌ | ❌ | ✅ |
| KombiSim (basic) | ✅ | ✅ | ✅ | ✅ |
| KombiSim (full) | ❌ | ✅ | ✅ | ✅ |
| StackKits (base) | ✅ | ✅ | ✅ | ✅ |
| StackKits (premium) | ❌ | ✅ | ✅ | ✅ |
| AI Features | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ✅ | ✅ | ✅ |
| Team Collaboration | ❌ | ❌ | ✅ | ✅ |
| SSO (Custom IdP) | ❌ | ❌ | ❌ | ✅ |
| SLA Guarantee | ❌ | ❌ | ❌ | ✅ |
| Dedicated Instance | ❌ | ❌ | ❌ | ✅ |

### By Component

| Feature Category | KombiStack | KombiSim | StackKits | Cloud | Admin | API |
|------------------|:----------:|:--------:|:---------:|:-----:|:-----:|:---:|
| Infrastructure Mgmt | ✅ | - | - | - | - | - |
| Simulation | - | ✅ | - | - | - | - |
| IaC Templates | - | - | ✅ | - | - | - |
| User Auth | - | - | - | ✅ | ✅ | ✅ |
| Billing | - | - | - | ✅ | ✅ | - |
| Tools Catalog | - | - | - | - | ✅ | - |
| User Admin | - | - | - | - | ✅ | - |
| API Routing | - | - | - | - | - | ✅ |
| Rate Limiting | - | - | - | - | - | ✅ |

---

## 5. Roadmap Features

### Q1 2026 (January - March)

| Feature | Component | Priority |
|---------|-----------|----------|
| Security hardening | All | P0 |
| Production deployment | All | P0 |
| Database integration complete | Cloud | P0 |
| SSO bridge complete | Cloud → KombiStack | P1 |
| Feature flag sync | Admin → KombiStack | P1 |

### Q2 2026 (April - June)

| Feature | Component | Priority |
|---------|-----------|----------|
| Cloud provider: Hetzner | KombiStack | P1 |
| modern-homelab StackKit | StackKits | P1 |
| Team collaboration | Cloud | P1 |
| Notifications system | Cloud | P2 |
| Advanced analytics | Admin | P2 |

### Q3 2026 (July - September)

| Feature | Component | Priority |
|---------|-----------|----------|
| Cloud provider: AWS | KombiStack | P1 |
| ha-homelab StackKit | StackKits | P1 |
| Marketplace: Premium StackKits | StackKits | P2 |
| Mobile-responsive UI | All | P2 |
| API v2 | API | P2 |

### Q4 2026 (October - December)

| Feature | Component | Priority |
|---------|-----------|----------|
| Cloud provider: Azure | KombiStack | P1 |
| Enterprise features | All | P1 |
| Plugin system | KombiStack | P2 |
| Community StackKits | StackKits | P2 |

---

## Feature Request Process

### Submitting Requests

1. **GitHub Issues**: Create issue in relevant repository
2. **Community Forum**: Discuss in community channels
3. **Enterprise**: Direct contact with support team

### Prioritization Criteria

| Criterion | Weight |
|-----------|--------|
| User demand (votes/requests) | 30% |
| Strategic alignment | 25% |
| Technical feasibility | 20% |
| Revenue impact | 15% |
| Security/compliance | 10% |

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-01-23 | 1.0.0 | Initial feature catalog |
