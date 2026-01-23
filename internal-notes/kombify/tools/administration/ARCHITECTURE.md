# kombify Administration - Technical Architecture

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-23  
> **Repository:** KombiSphere-Admin  
> **License:** BSL-1.1

---

## Module Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | kombify Administration |
| **Role** | Administration Center & Tools Catalog |
| **Primary Users** | Platform admins, Internal operators |
| **Tech Stack** | Go 1.24+, PocketBase, SvelteKit |

---

## Overview

**kombify Administration** ist das interne Admin-Backend des kombify-Ökosystems — zuständig für Tool-Katalog-Management, User-Administration, Support-Tickets und Feature-Flags.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Tools Catalog** | CRUD, Evaluation, Status-Management |
| **Category Management** | Taxonomie und Patterns |
| **Tool Discovery** | GitHub, Tavily, Crawl4AI Integration |
| **User Administration** | Via Zitadel Management API |
| **Support Tickets** | Internes Ticketing-System |
| **Feature Flags** | Platform-wide Feature Gates |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              KOMBIFY ADMINISTRATION                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              FRONTEND (SvelteKit)                         │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐ │   │
│  │  │  Admin     │ │  Tool      │ │  Service   │ │   Public Catalog       │ │   │
│  │  │  Dashboard │ │  Explorer  │ │  Console   │ │   (kombisphere.io)     │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│                                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                              API GATEWAY                                  │   │
│  │            (REST + SSE for real-time updates)                            │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│        ┌──────────────────────────────┼──────────────────────────────┐          │
│        │                              │                              │          │
│        ▼                              ▼                              ▼          │
│  ┌────────────────┐  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  │  ADMIN CENTER  │  │     SERVICE LAYER        │  │   DISCOVERY ENGINE     │  │
│  │                │  │                          │  │                        │  │
│  │  • Tool CRUD   │  │  • Auth (PocketBase)     │  │  • GitHub Crawler      │  │
│  │  • Pattern Mgmt│  │  • User Management       │  │  • npm/PyPI Adapter    │  │
│  │  • Categories  │  │  • Tenant Isolation      │  │  • Awesome List Parser │  │
│  │  • Evaluation  │  │  • Payment (Stripe)      │  │  • RSS/Changelog       │  │
│  │  • Config Gen  │  │  • Feature Gates         │  │  • Version Tracker     │  │
│  │                │  │                          │  │                        │  │
│  └────────────────┘  └──────────────────────────┘  └────────────────────────┘  │
│        │                              │                              │          │
│        └──────────────────────────────┼──────────────────────────────┘          │
│                                       │                                          │
│                                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                           DATA LAYER                                      │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────────┐ │   │
│  │  │ PocketBase │ │ Meilisearch│ │   Redis    │ │   Object Storage       │ │   │
│  │  │ (SQLite)   │ │  (Search)  │ │  (Cache)   │ │   (Logos, Assets)      │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Responsibilities

### Owns (Primary)

| Responsibility | Description | Status |
|----------------|-------------|--------|
| **Tools Catalog** | CRUD, evaluation, status | ✅ 100% |
| **Category/Pattern Management** | Taxonomy, patterns | ✅ 100% |
| **Tool Discovery/Crawling** | GitHub, Tavily, Crawl4AI | ✅ 100% |
| **User Administration** | Via Zitadel API | ✅ 95% |
| **Organization Management** | Via Zitadel API | ✅ 90% |
| **Billing Overview** | Read via Stripe API | ✅ 100% |
| **Support Tickets** | Internal ticketing | ✅ 80% |
| **Dashboard & Analytics** | Admin metrics | ✅ 85% |

### Does NOT Own

| Responsibility | Owner |
|----------------|-------|
| User authentication flow | Zitadel |
| Public API access | API Gateway |
| User-facing portal | Sphere |

---

## Tool Management

### Tool Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                        TOOL LIFECYCLE                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐│
│  │ Discover │──▶│ Evaluate │──▶│ Approve  │──▶│ Integrate    ││
│  │          │   │          │   │          │   │ (StackKit)   ││
│  └──────────┘   └──────────┘   └──────────┘   └──────────────┘│
│       │              │              │               │          │
│       ▼              ▼              ▼               ▼          │
│  • Auto-crawl   • Test deploy  • Status:      • Add to        │
│  • Manual add   • Rate (1-5)   • Official     • default-spec  │
│  • Import       • Pros/Cons    • Experimental • Generate CUE  │
│                 • Categories   • Deprecated                    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Tool Entity

```typescript
interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string;
  
  // Source info
  githubUrl?: string;
  dockerImage?: string;
  website?: string;
  
  // Categorization
  categoryId: string;
  subcategoryId?: string;
  tags: string[];
  
  // Evaluation
  status: 'draft' | 'experimental' | 'official' | 'deprecated';
  rating: number;        // 1-5
  pros: string[];
  cons: string[];
  
  // Metadata
  lastVersionCheck: Date;
  latestVersion?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Category Taxonomy

### Supported Categories

```yaml
categories:
  - id: network
    name: Network & Routing
    subcategories:
      - reverse-proxy       # Traefik, Caddy
      - dns                 # Pi-hole, AdGuard Home
      - vpn                 # Tailscale, WireGuard
      - tunneling           # Cloudflare Tunnel
      - load-balancing      # HAProxy, nginx

  - id: storage
    name: Storage & Backup
    subcategories:
      - nas                 # TrueNAS, OpenMediaVault
      - distributed         # GlusterFS, Ceph
      - backup              # Restic, Borg

  - id: auth
    name: Authentication
    subcategories:
      - sso                 # Authentik, Authelia
      - simple-auth         # TinyAuth
      - secrets             # Vault, Infisical

  - id: orchestration
    name: Container Orchestration
    subcategories:
      - docker-management   # Coolify, Dokploy
      - kubernetes          # K3s, Rancher

  - id: monitoring
    name: Monitoring
    subcategories:
      - metrics             # Prometheus
      - visualization       # Grafana
      - logging             # Loki

  - id: media
    name: Media & Entertainment
    subcategories:
      - media-server        # Jellyfin, Plex
      - photos              # Immich

  - id: ai
    name: AI & Machine Learning
    subcategories:
      - llm-runtime         # Ollama
      - llm-ui              # Open WebUI
```

---

## Discovery Engine

### Supported Sources

| Source | Method | Purpose |
|--------|--------|---------|
| **GitHub** | API | Repository discovery |
| **npm/PyPI** | API | Package metadata |
| **Awesome Lists** | Parser | Curated tool lists |
| **RSS/Changelog** | Fetcher | Version tracking |
| **Tavily** | API | AI-powered search |
| **Crawl4AI** | Crawler | Website scraping |

### Discovery Flow

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Trigger       │────▶│  Fetch/Crawl   │────▶│  Normalize     │
│  (manual/cron) │     │  from source   │     │  to Tool       │
└────────────────┘     └────────────────┘     └────────────────┘
                                                      │
                                                      ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Store         │◀────│  Deduplicate   │◀────│  Categorize    │
│  in DB         │     │                │     │  (AI-assisted) │
└────────────────┘     └────────────────┘     └────────────────┘
```

---

## API Reference

### Tool Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tools` | GET | List all tools |
| `/api/tools` | POST | Create tool |
| `/api/tools/{id}` | GET | Get tool details |
| `/api/tools/{id}` | PATCH | Update tool |
| `/api/tools/{id}` | DELETE | Delete tool |
| `/api/tools/{id}/evaluate` | POST | Submit evaluation |

### Category Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/categories` | GET | List categories |
| `/api/categories/{id}/tools` | GET | Tools by category |

### Pattern Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/patterns` | GET | List patterns |
| `/api/patterns` | POST | Create pattern |
| `/api/patterns/{id}` | GET | Get pattern |

### Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/users` | GET | List users (Zitadel) |
| `/api/admin/users/{id}` | GET | User details |
| `/api/admin/users/{id}/roles` | PATCH | Update roles |
| `/api/admin/feature-flags` | GET/POST | Manage flags |

---

## Directory Structure

```
KombiSphere-Admin/
├── cmd/
│   └── admin/
│       └── main.go           # Entry point
│
├── pkg/
│   ├── api/
│   │   ├── handlers.go       # HTTP handlers
│   │   └── server.go         # Server setup
│   │
│   ├── tools/
│   │   ├── service.go        # Tool business logic
│   │   └── repository.go     # Data access
│   │
│   ├── discovery/
│   │   ├── github.go         # GitHub crawler
│   │   ├── tavily.go         # Tavily integration
│   │   └── crawl4ai.go       # Crawl4AI wrapper
│   │
│   └── admin/
│       ├── zitadel.go        # Zitadel Management API
│       └── stripe.go         # Stripe read access
│
├── app/                      # SvelteKit frontend
│   └── src/
│       ├── routes/
│       │   ├── dashboard/
│       │   ├── tools/
│       │   ├── users/
│       │   └── settings/
│       └── lib/
│
└── pb_data/                  # PocketBase data
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `POCKETBASE_URL` | PocketBase connection |
| `ZITADEL_MANAGEMENT_KEY` | Zitadel API key |
| `STRIPE_SECRET_KEY` | Stripe read access |
| `GITHUB_TOKEN` | GitHub API access |
| `TAVILY_API_KEY` | Tavily search |
| `MEILISEARCH_URL` | Search engine |
| `MEILISEARCH_KEY` | Search API key |

---

## Integration with Sphere

### Internal API Contract

kombify Sphere verwendet Administration-APIs für:

```typescript
// Read tools catalog
GET /api/internal/tools?category=monitoring

// Read feature flags
GET /api/internal/feature-flags?sub={zitadel_sub}

// User profile sync
POST /api/internal/users/sync
```

Diese Endpoints sind nur für interne Service-to-Service-Kommunikation.

---

## Related Documentation

- [kombify Sphere](../sphere/ARCHITECTURE.md) - User Portal
- [kombify API](../api-gateway/ARCHITECTURE.md) - API Gateway
- [Inter-Module Contracts](../../INTER_MODULE_CONTRACTS.md) - API Contracts

---

*Last reviewed: 2026-01-23*
