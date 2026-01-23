# kombifySphere - Component Guide

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Purpose:** Detailed technical guide for each ecosystem component

---

## Table of Contents

1. [KombiStack](#1-kombistack)
2. [KombiSim](#2-kombisim)
3. [StackKits](#3-stackkits)
4. [KombiSphere-Cloud (kombifySphere Cloud)](#4-kombisphere-cloud)
5. [KombiSphere-Admin (kombify Administration)](#5-kombisphere-admin)
6. [KombiSphere-API (kombify API)](#6-kombisphere-api)
7. [Component Interaction Matrix](#7-component-interaction-matrix)

---

## 1. KombiStack

### Overview

**KombiStack** (kombify Stack) is the **Hybrid Infrastructure Control Plane** — the core orchestration engine that unifies cloud and home infrastructure management.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Spec-Driven Deployment** | Define infrastructure in `kombination.yaml` |
| **Unifier Engine** | Resolves spec to valid OpenTofu configurations |
| **Worker Management** | gRPC agents on remote nodes |
| **Workflow Orchestration** | Multi-step deployment automation |
| **CUE Validation** | Schema-based configuration validation |

### Technical Specifications

| Attribute | Value |
|-----------|-------|
| **Language** | Go 1.24+ |
| **Database** | PocketBase (embedded SQLite) |
| **Frontend** | SvelteKit |
| **API** | REST (HTTP) + gRPC |
| **License** | MIT (core) + AGPL-3.0 (certain components) |

### Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Core API | 5260 | HTTP | REST API + PocketBase Admin |
| Frontend | 5261 | HTTP | SvelteKit Dashboard |
| gRPC | 5263 | gRPC/mTLS | Worker agent communication |

### Dependencies

```go
// Key Go dependencies (from go.mod)
cuelang.org/go v0.15.1                    // CUE language support
github.com/pocketbase/pocketbase v0.34.2  // Embedded database
github.com/docker/docker v28.5.2          // Docker SDK
google.golang.org/grpc v1.77.0            // gRPC framework
github.com/aws/aws-sdk-go-v2              // AWS integration
github.com/Azure/azure-sdk-for-go         // Azure integration
```

### API Endpoints (Public via Kong)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/orchestrator/workflows` | GET/POST | Workflow management |
| `/v1/orchestrator/stacks` | GET/POST | Stack configurations |
| `/v1/orchestrator/nodes` | GET/POST | Node management |
| `/v1/orchestrator/workers` | GET/POST | Worker status |
| `/v1/orchestrator/jobs` | GET/POST | Job execution |

### Internal Endpoints (Admin Only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/internal/sso/exchange` | POST | Kong SSO token exchange |
| `/api/internal/feature-flags/apply` | POST | Apply platform feature flags |

### Architecture

```
KombiStack Architecture
├── cmd/kombistack/          # CLI entry point
├── internal/
│   ├── orchestrator/        # Workflow engine
│   ├── unifier/             # Spec resolution
│   ├── workers/             # gRPC agent management
│   └── provisioner/         # OpenTofu execution
├── app/                     # SvelteKit frontend
├── pb_data/                 # PocketBase data directory
└── pb_migrations/           # Database migrations
```

### Usage Example

```bash
# Start KombiStack
./kombistack serve

# Or via Docker
docker run -p 5260:5260 -p 5263:5263 \
  -v kombistack-data:/app/pb_data \
  ghcr.io/soulcreek/kombistack:latest
```

---

## 2. KombiSim

### Overview

**KombiSim** (kombify Sim) is the **Infrastructure Simulation Engine** — test homelab configurations before deploying to real hardware using lightweight Docker containers.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Docker Simulation** | Lightweight "VMs" using Docker containers |
| **Real SSH Access** | SSH into simulated nodes (ports 2222-2322) |
| **Simulation Groups** | Organize nodes into logical simulations |
| **Template Library** | Pre-built templates for common setups |
| **Node Types** | Distinguish VPS vs local server simulations |

### Technical Specifications

| Attribute | Value |
|-----------|-------|
| **Language** | Go 1.24+ |
| **Database** | SQLite (embedded) |
| **Frontend** | SvelteKit |
| **API** | REST (HTTP) |
| **Container Runtime** | Docker (via Docker SDK) |
| **License** | MIT |

### Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Backend API | 5270 | HTTP | REST API |
| Frontend | 5271 | HTTP | SvelteKit Dashboard |
| SSH (Nodes) | 2222-2322 | SSH | Container SSH access |

### Dependencies

```go
// Key Go dependencies (from go.mod)
github.com/docker/docker v27.4.1  // Docker SDK
github.com/google/uuid v1.6.0     // UUID generation
modernc.org/sqlite v1.40.1        // SQLite driver
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/simulations` | GET/POST | Simulation CRUD |
| `/api/v1/simulations/{id}/start` | POST | Start all nodes |
| `/api/v1/simulations/{id}/stop` | POST | Stop all nodes |
| `/api/v1/nodes` | GET/POST | Node management |
| `/api/v1/nodes/{id}/ssh` | GET | Get SSH connection details |
| `/api/v1/templates` | GET | List available templates |
| `/api/v1/templates/{name}/apply` | POST | Apply template |

### Built-in Templates

| Template | Category | Nodes | Description |
|----------|----------|-------|-------------|
| `single-node` | development | 1 | Minimal single server |
| `homelab-basic` | homelab | 2 | Web server + Database |
| `homelab-advanced` | homelab | 5 | Full homelab stack |
| `hybrid-setup` | homelab | 5 | VPS + Local combined |
| `dev-environment` | development | 2 | Dev server + database |
| `ha-setup` | homelab | 5 | Load balancer + HA |

### Usage Example

```bash
# Create a simulation from template
curl -X POST http://localhost:5270/api/v1/templates/homelab-basic/apply \
  -H "Content-Type: application/json" \
  -d '{"simulation_name": "test-lab", "auto_start": true}'

# SSH into a node
ssh -p 2222 root@localhost
# Password: kombisim
```

---

## 3. StackKits

### Overview

**StackKits** (kombify StackKits) are **Declarative Infrastructure Blueprints** — validated IaC templates using CUE schemas and OpenTofu execution.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **CUE Validation** | Type-safe configuration with constraints |
| **IaC-First** | OpenTofu as execution engine |
| **3-Layer Architecture** | Core → Platforms → StackKits |
| **Multi-OS Support** | Ubuntu, Debian variants |
| **CLI & Integration** | Standalone or via KombiStack |

### Technical Specifications

| Attribute | Value |
|-----------|-------|
| **Language** | Go 1.22+, CUE 0.9+ |
| **IaC Engine** | OpenTofu 1.6+ |
| **CLI** | `stackkit` binary |
| **License** | MIT |

### 3-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: STACKKITS                                         │
│  • base-homelab: Single-node Docker + Dokploy               │
│  • modern-homelab: Multi-node Docker + Dokploy              │
│  • ha-homelab: Docker Swarm HA (3+ Nodes)                   │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: PLATFORMS                                         │
│  • docker/: Docker + Traefik + Swarm                        │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: CORE (base/)                                      │
│  • Bootstrap, Security, Network, Observability              │
└─────────────────────────────────────────────────────────────┘
```

### Available StackKits

| StackKit | Description | Nodes | Status |
|----------|-------------|-------|--------|
| **base-homelab** | Single server, local only | 1 | ✅ Available |
| **modern-homelab** | Multi-node Docker + Dokploy | 2+ | 🚧 Schema Only |
| **ha-homelab** | Docker Swarm HA Cluster | 3+ | 🚧 Schema Only |

### CLI Commands

```bash
# Initialize a new stackkit
stackkit init base-homelab

# Validate and prepare
stackkit prepare

# Generate OpenTofu files
stackkit generate

# Plan and apply
stackkit plan
stackkit apply
```

### Repository Structure

```
StackKits/
├── base/                 # Layer 1: Core (shared)
│   ├── stackkit.cue      # Base CUE schema
│   └── doc.cue           # Documentation schema
├── base-homelab/         # Layer 3: StackKit
├── modern-homelab/       # Layer 3: StackKit
├── ha-homelab/           # Layer 3: StackKit
├── platforms/            # Layer 2: Platform configs
│   └── docker/           # Docker platform
├── cmd/                  # CLI source
├── internal/             # Internal packages
├── tests/                # Integration tests
└── ADR/                  # Architecture decisions
```

---

## 4. KombiSphere-Cloud

### Overview

**KombiSphere-Cloud** (kombifySphere Cloud) is the **User Portal** — the customer-facing SaaS application for managing subscriptions, accessing tools, and user settings.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **User Authentication** | Zitadel OIDC login/logout |
| **SSO Token Generation** | JWT tokens for core tools |
| **Subscription Management** | Stripe checkout and billing |
| **User Dashboard** | Profile, settings, activity |
| **Marketing Pages** | Landing, pricing, features |

### Technical Specifications

| Attribute | Value |
|-----------|-------|
| **Framework** | SvelteKit |
| **Language** | TypeScript |
| **Database** | PostgreSQL (via Prisma) |
| **Auth** | Auth.js + Zitadel OIDC |
| **Payments** | Stripe |
| **UI Library** | shadcn-svelte, TailwindCSS |
| **License** | Proprietary |

### Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Portal | 3000 | HTTP | SvelteKit application |

### Dependencies

```json
// Key dependencies (from package.json)
{
  "@sveltejs/kit": "^2.0.0",
  "@prisma/client": "^6.0.0",
  "stripe": "^14.0.0",
  "tailwindcss": "^3.4.0"
}
```

### Data Ownership

| Data Type | Location | Notes |
|-----------|----------|-------|
| User Sessions | PostgreSQL | Auth.js sessions |
| User Preferences | PostgreSQL | App-specific settings |
| Billing Data | Stripe (canonical) | Mirror in PostgreSQL optional |
| Identity | Zitadel (canonical) | Retrieved via OIDC |

### Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/auth/signin` | Login initiation |
| `/auth/callback/zitadel` | OIDC callback |
| `/dashboard` | User dashboard |
| `/settings` | User settings |
| `/billing` | Subscription management |
| `/tools` | Tool launcher |
| `/api/billing/webhook` | Stripe webhooks |

### SSO Flow to Core Tools

```
1. User clicks "Open KombiStack" in Cloud portal
2. Cloud generates SSO parameters (id_token, access_token)
3. Redirect to Kong route: /auth/sso/kombistack
4. Kong validates Zitadel JWT
5. Kong calls KombiStack /api/internal/sso/exchange
6. KombiStack returns PocketBase session token
7. User redirected into KombiStack with valid session
```

---

## 5. KombiSphere-Admin

### Overview

**KombiSphere-Admin** (kombify Administration) is the **Administration Center** — internal platform for managing tools catalog, users, and platform operations.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Tools Catalog Management** | CRUD, evaluation, categorization |
| **User Administration** | Via Zitadel Management API |
| **Discovery Engine** | GitHub/npm crawler |
| **Feature Flags** | Platform-wide flag management |
| **Billing Dashboard** | Read-only Stripe overview |

### Technical Specifications

| Attribute | Value |
|-----------|-------|
| **Backend** | Go 1.24+ |
| **Database** | PostgreSQL (shared with Cloud) |
| **Frontend** | SvelteKit |
| **Search** | Meilisearch |
| **License** | BSL-1.1 (→ Apache 2.0 after 4 years) |

### Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| Backend API | 8090 | HTTP | Go API server |
| Frontend | 8091 | HTTP | SvelteKit admin UI |

### Dependencies

```go
// Key Go dependencies (from go.mod)
github.com/labstack/echo/v5            // Web framework
github.com/pocketbase/pocketbase       // PocketBase SDK
github.com/meilisearch/meilisearch-go  // Search engine
github.com/steebchen/prisma-client-go  // Prisma client
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/tools` | GET/POST | Tools catalog |
| `/api/v1/categories` | GET/POST | Category management |
| `/api/v1/patterns` | GET/POST | Pattern management |
| `/api/v1/users` | GET | User listing (via Zitadel) |
| `/api/v1/feature-flags` | GET/POST | Flag management |
| `/api/internal/users/{sub}` | GET | User profile (for Cloud) |
| `/api/internal/feature-flags` | GET | Flags for user/org |

### Admin Capabilities

| Feature | Implementation | Status |
|---------|----------------|--------|
| Tool Discovery | GitHub + Tavily + Crawl4AI | ✅ Complete |
| Tool Evaluation | Scoring + AI analysis | ✅ Complete |
| User Management | Zitadel Management API | ✅ Complete |
| MFA Management | List/reset via Zitadel | ✅ Complete |
| Impersonation | With audit log | ✅ Complete |
| Billing Overview | Stripe API (read-only) | ✅ Complete |

---

## 6. KombiSphere-API

### Overview

**KombiSphere-API** (kombify API) is the **Central API Gateway** — Kong-based routing, authentication, and rate limiting for all services.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **JWT Validation** | Zitadel token verification |
| **API Key Auth** | Service accounts |
| **Rate Limiting** | Per-route, per-consumer |
| **Request Routing** | All /v1/* paths |
| **gRPC Routing** | Worker connections |

### Technical Specifications

| Attribute | Value |
|-----------|-------|
| **Gateway** | Kong OSS 3.9 |
| **Configuration** | Declarative (decK) |
| **License** | MIT |

### Service Ports

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| HTTP Proxy | 8000 | HTTP | Public API |
| HTTPS Proxy | 8443 | HTTPS | Secure API |
| gRPC Proxy | 9080 | gRPC | Worker connections |
| gRPC-TLS | 9443 | gRPC/TLS | Secure workers |
| Admin API | 8001 | HTTP | Internal only |

### Route Configuration

| Route Prefix | Upstream Service | Auth |
|--------------|------------------|------|
| `/v1/orchestrator/*` | kombistack:8080 | JWT |
| `/v1/simulation/*` | kombisim:8081 | JWT |
| `/v1/stackkits/*` | stackkits:8082 | JWT |
| `/health` | Built-in | None |

### Kong Plugins Enabled

| Plugin | Purpose | Scope |
|--------|---------|-------|
| `jwt` | Zitadel token validation | Global |
| `key-auth` | API key authentication | Per-route |
| `rate-limiting` | Request throttling | Per-consumer |
| `request-transformer` | Header injection | Global |
| `cors` | Cross-origin policies | Global |
| `response-transformer` | Security headers | Global |

### Header Transformation

Kong extracts JWT claims and forwards as headers:

| JWT Claim | Header |
|-----------|--------|
| `sub` | `X-User-ID` |
| `urn:zitadel:iam:org:id` | `X-Org-ID` |
| `email` | `X-User-Email` |
| `urn:zitadel:iam:org:project:roles` | `X-User-Roles` |
| `name` | `X-User-Name` |

---

## 7. Component Interaction Matrix

### Communication Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPONENT INTERACTIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐          ┌─────────┐          ┌─────────┐                      │
│  │ Browser │────────▶│  Cloud  │─────────▶│ Zitadel │                      │
│  └─────────┘   OIDC   └────┬────┘   Auth   └─────────┘                      │
│       │                    │                                                 │
│       │                    │ Internal API                                    │
│       │                    ▼                                                 │
│       │              ┌─────────┐          ┌─────────┐                       │
│       │              │  Admin  │─────────▶│Postgres │                       │
│       │              └────┬────┘   SQL    └─────────┘                       │
│       │                   │                                                  │
│       │                   │ Webhooks                                         │
│       │                   ▼                                                  │
│       │              ┌─────────┐                                            │
│       │              │ Stripe  │                                            │
│       │              └─────────┘                                            │
│       │                                                                      │
│       │ API Requests (JWT)                                                   │
│       ▼                                                                      │
│  ┌─────────┐          ┌───────────────────────────────────────┐             │
│  │  Kong   │─────────▶│           Core Tools                   │             │
│  │   API   │  Route   │  ┌─────────┐ ┌────────┐ ┌──────────┐  │             │
│  └─────────┘          │  │KombiStack│ │KombiSim│ │StackKits │  │             │
│       │               │  └─────────┘ └────────┘ └──────────┘  │             │
│       │               └───────────────────────────────────────┘             │
│       │                                                                      │
│       │ JWT Validation                                                       │
│       ▼                                                                      │
│  ┌─────────┐                                                                │
│  │ Zitadel │ (JWKS)                                                         │
│  └─────────┘                                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

| From | To | Data | Protocol |
|------|----|------|----------|
| Browser → Cloud | Session, UI | HTTPS |
| Cloud → Zitadel | Auth tokens | OIDC |
| Cloud → Admin | Platform data | Internal HTTP |
| Cloud → Stripe | Billing | HTTPS API |
| Admin → Postgres | Tools, flags | SQL |
| Admin → Zitadel | User management | Management API |
| Admin → KombiStack | Feature flags | Internal HTTP |
| Browser → Kong | API requests | HTTPS + JWT |
| Kong → Zitadel | Token validation | JWKS |
| Kong → Core Tools | Proxied requests | HTTP/gRPC |

### Dependency Graph

```
External Dependencies:
├── Zitadel Cloud (auth.kombisphere.io)
│   └── Used by: Cloud, Admin, Kong
├── Stripe (api.stripe.com)
│   └── Used by: Cloud, Admin
├── Docker Engine
│   └── Used by: KombiStack, KombiSim
└── PostgreSQL
    └── Used by: Cloud, Admin (shared)

Internal Dependencies:
├── Kong API Gateway
│   └── Routes to: KombiStack, KombiSim, StackKits
├── KombiSphere-Cloud
│   └── Depends on: Admin API, Zitadel, Stripe
├── KombiSphere-Admin
│   └── Depends on: Postgres, Zitadel, Stripe
├── KombiStack
│   └── Depends on: PocketBase (embedded), Docker
├── KombiSim
│   └── Depends on: SQLite (embedded), Docker
└── StackKits
    └── Depends on: CUE, OpenTofu
```

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-01-23 | 1.0.0 | Initial component guide |
