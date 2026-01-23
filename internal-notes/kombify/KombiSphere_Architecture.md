# kombifySphere Platform - Unified Architecture

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-16  
> **Authors:** Architecture Review  
> **Status:** APPROVED - Implementation Ready

---

## Executive Summary

kombifySphere is a SaaS platform providing centralized management for homelab automation tools (kombify Stack / KombiStack, kombify Sim / KombiSim, kombify StackKits / StackKits). This document defines the **canonical architecture** across all modules and serves as the single source of truth for architectural decisions.

### Key Architecture Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Platform Database** | Single PostgreSQL (shared by Cloud + Admin) | One source of truth for platform backend data (tools, flags, portal state) |
| **KombiStack Storage** | PocketBase (embedded SQLite) per KombiStack instance | Deeply integrated; holds homelab operational state |
| **Auth Provider** | Zitadel Cloud | Enterprise SSO, OIDC, multi-tenant ready |
| **Payment Provider** | Stripe | Industry standard, webhooks, customer portal |
| **API Gateway** | Kong | Central auth validation, rate limiting, routing |
| **KombiStack SSO** | Kong-mediated login exchange | SSO without adding OIDC into KombiStack |
| **Inter-Service Auth** | JWT + Service Accounts | Stateless, Zitadel-issued tokens |

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              KOMBISPHERE PLATFORM ARCHITECTURE                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                    USER LAYER                                                 │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │   │
│  │  │   Public Web    │    │  User Portal    │    │  Admin Portal   │    │  Core Tools     │   │   │
│  │  │ (kombisphere.io)│    │ (app.kombi...)  │    │ (admin.kombi...)│    │ (stack/sim/kit) │   │   │
│  │  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘   │   │
│  └───────────┼───────────────────────┼───────────────────────┼───────────────────────┼──────────┘   │
│              │                       │                       │                       │              │
│              └───────────────────────┼───────────────────────┼───────────────────────┘              │
│                                      │                       │                                       │
│  ┌───────────────────────────────────┼───────────────────────┼─────────────────────────────────┐    │
│  │                          AUTHENTICATION LAYER                                                │    │
│  │                        ┌──────────────────────────┐                                          │    │
│  │                        │     Zitadel Cloud        │                                          │    │
│  │                        │   (auth.kombisphere.io)  │                                          │    │
│  │                        │                          │                                          │    │
│  │                        │  • User Authentication   │                                          │    │
│  │                        │  • JWT Token Issuance    │                                          │    │
│  │                        │  • Role Management       │                                          │    │
│  │                        │  • Organization Mgmt     │                                          │    │
│  │                        │  • MFA/Security          │                                          │    │
│  │                        └──────────────────────────┘                                          │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                      │                       │                                       │
│  ┌───────────────────────────────────▼───────────────────────▼─────────────────────────────────┐    │
│  │                              API GATEWAY LAYER                                               │    │
│  │                      ┌──────────────────────────────┐                                        │    │
│  │                      │    Kong Gateway (API)        │                                        │    │
│  │                      │   (api.kombisphere.io)       │                                        │    │
│  │                      │                              │                                        │    │
│  │                      │  • JWT Validation (Zitadel)  │                                        │    │
│  │                      │  • API Key Authentication    │                                        │    │
│  │                      │  • Rate Limiting             │                                        │    │
│  │                      │  • Request Routing           │                                        │    │
│  │                      │  • CORS / Security Headers   │                                        │    │
│  │                      └──────────────────────────────┘                                        │    │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                      ┌───────────────┼───────────────┬───────────────┐                              │
│                      │               │               │               │                              │
│                      ▼               ▼               ▼               ▼                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              SERVICE LAYER                                                    │  │
│  │                                                                                               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │  │
│  │  │   Cloud Portal  │  │   Admin Center  │  │   kombiStack    │  │   kombiSim / stackKits  │  │  │
│  │  │   (SvelteKit)   │  │   (Go + Svelte) │  │   (HTTP/gRPC)   │  │      (HTTP)             │  │  │
│  │  │                 │  │                 │  │                 │  │                         │  │  │
│  │  │ • User Profile  │  │ • Tools Catalog │  │ • Workflows     │  │ • Simulations           │  │  │
│  │  │ • Subscriptions │  │ • SaaS Mgmt     │  │ • Workers       │  │ • IaC Templates         │  │  │
│  │  │ • Billing       │  │ • User Admin    │  │ • Deployments   │  │ • Stack Configs         │  │  │
│  │  │ • SSO Tokens    │  │ • Support       │  │ • Automation    │  │ • Validation            │  │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────┘  │  │
│  └───────────┼───────────────────────┼───────────────────┼───────────────────────┼──────────────┘  │
│              │                       │                   │                       │                  │
│  ┌───────────▼───────────────────────▼───────────────────▼───────────────────────▼──────────────┐  │
│  │                              DATA LAYER                                                       │  │
│  │                                                                                               │  │
│  │  │   PLATFORM DATABASE (SINGLE)  │     │   KOMBISTACK DATABASE          │                     │  │
│  │  │   PostgreSQL + Prisma schema  │     │   PocketBase (embedded SQLite) │                     │  │
│  │  │                               │     │                               │                     │  │
│  │  │   • Tools catalog + patterns  │     │   • stacks/nodes/workers/jobs  │                     │  │
│  │  │   • AI tool evaluation + RAG  │     │   • wallet/activity_log        │                     │  │
│  │  │   • Feature flags             │     │   • feature_preferences (applied)│                   │  │
│  │  │   • Notifications/audit (opt) │     │                               │                     │  │
│  │  └───────────────────────────────┘     └───────────────────────────────┘                     │  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Responsibilities

### 1. KombiSphere-Cloud (User Portal)

**Primary Role:** Customer-facing SaaS portal

| Responsibility | Scope | Status |
|----------------|-------|--------|
| **User Authentication** | Zitadel OIDC login/logout | ✅ Complete |
| **User Profile Management** | Profile, avatar, settings | ✅ 90% |
| **Subscription Management** | Stripe checkout, portal | ✅ 95% |
| **Billing History** | Invoices, payments | ✅ 90% |
| **SSO Token Generation** | JWT tokens for core tools | ✅ 80% |
| **Usage Tracking** | API calls, projects | ✅ 70% |
| **Activity Logging** | User actions audit | ✅ 90% |
| **Marketing Pages** | Landing, pricing, features | ✅ Complete |

**Owns:**
- User-facing UI and portal routes
- Stripe checkout UX and customer portal integration
- Session handling for the web app

**Does NOT Own:**
- Canonical platform database writes (→ Admin)
- User management (→ Admin via Zitadel)
- API routing/gateway (→ API)
- Core tool business logic (→ kombiStack/Sim/Kits)

---

### 2. KombiSphere-Admin (Administration Center)

**Primary Role:** Internal administration and tools management

| Responsibility | Scope | Status |
|----------------|-------|--------|
| **Tools Catalog Management** | CRUD, evaluation, status | ✅ 100% |
| **Category/Pattern Management** | Taxonomy, patterns | ✅ 100% |
| **Tool Discovery/Crawling** | GitHub, Tavily, Crawl4AI | ✅ 100% |
| **User Administration** | Via Zitadel API | ✅ 95% |
| **Organization Management** | Via Zitadel API | ✅ 90% |
| **Billing Overview** | Read via Stripe API | ✅ 100% |
| **Support Tickets** | Internal ticketing | ✅ 80% |
| **Dashboard & Analytics** | Admin metrics | ✅ 85% |

**Owns:**
- Canonical platform backend API
- Single PostgreSQL database schema and writes (tools, patterns, evaluations, feature flags)
- User management via Zitadel Management API (RBAC, orgs, admin users)
- Tool discovery and crawling
- Admin-only API endpoints

**Does NOT Own:**
- User authentication flow (→ Zitadel)
- Public API access (→ API Gateway)

---

### 3. KombiSphere-API (Gateway)

**Primary Role:** Central API gateway and traffic management

| Responsibility | Scope | Status |
|----------------|-------|--------|
| **JWT Validation** | Zitadel token verification | ✅ 95% |
| **API Key Authentication** | Service accounts, external APIs | ✅ 90% |
| **Rate Limiting** | Per-route, per-consumer | ✅ 85% |
| **Request Routing** | All /v1/* paths | ✅ 100% |
| **CORS Management** | Cross-origin policies | ✅ 100% |
| **Security Headers** | HSTS, XSS, etc. | ✅ 100% |
| **gRPC Routing** | Worker connections | ✅ 100% |

**Owns:**
- Kong declarative configuration
- Route definitions for all services
- Consumer/credential management
- Request/response transformation

**Does NOT Own:**
- User data (→ Cloud)
- Business logic (→ Backend services)
- Token issuance (→ Zitadel)

---

### 4. Core Tools (kombiStack, kombiSim, stackKits)

**Primary Role:** Homelab automation business logic

| Tool | Purpose | API Path |
|------|---------|----------|
| **kombiStack** | Workflow orchestration, worker management | `/v1/orchestrator/*` |
| **kombiSim** | Stack simulation and testing | `/v1/simulation/*` |
| **stackKits** | IaC templates and CUE configurations (separate repo; CUE; future paid kits) | `/v1/stackkits/*` |

**Common Responsibilities:**
- Receive authenticated requests (JWT validated by Kong)
- Use `X-User-ID` (Zitadel `sub`) and `X-Org-ID` headers for context
- Store tool-specific operational data locally
- Support feature-flag application from Admin (via Kong internal routes)

---

## Data Flow Diagrams

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Cloud   │────▶│ Zitadel  │────▶│  Cloud   │
│ Browser  │     │ (Login)  │     │ (OIDC)   │     │ (Callback)│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
                                                  ┌──────────┐
                                                  │ Session  │
                                                  │ Created  │
                                                  │(portal)  │
                                                  └──────────┘

### SSO Flow: KombiSphere → KombiStack (No OIDC in KombiStack)

1. User is logged into Cloud via Zitadel
2. User clicks "Open KombiStack"
3. Browser hits a Kong route that validates Zitadel JWT
4. Kong calls a KombiStack internal endpoint to exchange identity for a PocketBase session
5. Browser is redirected into KombiStack with a valid PocketBase session
```

### API Request Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Kong    │────▶│ Zitadel  │────▶│ Backend  │
│ (JWT)    │     │ Gateway  │     │(Validate)│     │ Service  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
      │               │                                  │
      │               │  Extract Claims:                 │
      │               │  - X-User-ID                     │
      │               │  - X-Org-ID                      │
      │               │  - X-User-Email                  │
      │               │  - X-User-Roles                  │
      │               └──────────────────────────────────┘
```

### Subscription Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Cloud   │────▶│  Stripe  │────▶│ Checkout │
│ (Portal) │     │(Checkout)│     │ Session  │     │ Complete │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                      ┌──────────────────────────────────┘
                      ▼
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │◀────│  Stripe  │     │  Admin   │────▶│ Zitadel  │
│(Webhook) │     │ Webhook  │     │(Update DB)│    │(Roles/Meta)│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Admin Tool Management Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Admin   │────▶│  Admin   │────▶│ Zitadel  │
│ (Login)  │     │ Portal   │     │ (OIDC)   │
└──────────┘     └──────────┘     └──────────┘
      │               │
      │               ▼
      │         ┌──────────┐     ┌──────────┐
      │         │ Admin    │────▶│ Postgres  │
      │         │ Actions  │     │ (Platform)│
      │         └──────────┘     └──────────┘
      │               │
      │               ▼
      │         ┌──────────┐     ┌──────────┐
      │         │ User Mgmt│────▶│ Zitadel  │
      │         │ (MFA,etc)│     │ Admin API│
      └─────────┴──────────┘     └──────────┘
```

---

## Database Architecture

### Platform PostgreSQL Schema (Prisma)

```prisma
// SINGLE PLATFORM DATA STORE (SHARED)
// Schema source: KombiSphere-Cloud/prisma/schema.prisma (Prisma migrations)
// Canonical writer: KombiSphere-Admin (API)

// NOTE: Identity is Zitadel. Platform tables should key by `sub`.

model User {
  id          String   @id @default(uuid())
  sub         String   @unique // Zitadel subject
  email       String?
  name        String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model FeatureFlag {
  id        String   @id @default(uuid())
  key       String   @unique
  createdAt DateTime @default(now())
}

model FeatureFlagAssignment {
  id         String   @id @default(uuid())
  flagKey    String
  sub        String?
  orgId      String?
  valueBool  Boolean?
  valueText  String?
  valueNum   Float?
  updatedAt  DateTime @updatedAt

  @@index([sub])
  @@index([orgId])
  @@index([flagKey])
}
```

### KombiStack PocketBase Schema (Operational)

KombiStack keeps PocketBase as its embedded store for homelab operational state. KombiSphere does not replace this.

### Data Ownership Matrix

| Data Type | Owner | Used By | Notes |
|-----------|-------|---------|-------|
| Identity + RBAC | Zitadel | Cloud/Admin/Kong | Canonical |
| Tools catalog + evaluations | Platform Postgres (Admin) | Cloud/Admin | Canonical |
| Feature flags | Platform Postgres (Admin) | Cloud/KombiStack | Admin pushes to KombiStack as needed |
| Billing | Stripe | Cloud/Admin | Stripe canonical; DB mirror optional |
| Homelab operational state | KombiStack PocketBase | KombiStack | Canonical per instance |

---

## Integration Status Matrix

### Zitadel Integration

| Module | Integration Point | Status | Notes |
|--------|-------------------|--------|-------|
| **Cloud** | OIDC Login (Auth.js) | ✅ Complete | 7-day JWT sessions |
| **Cloud** | User Sync Webhook | ✅ Complete | ⚠️ Signature verify TODO |
| **Cloud** | Role Extraction | ✅ Complete | From JWT claims |
| **Cloud** | Admin Token API | ✅ Complete | For user updates |
| **Admin** | OIDC Login | ✅ Complete | Admin-only roles |
| **Admin** | Management API | ✅ Complete | ~40 API functions |
| **Admin** | User Impersonation | ✅ Complete | With audit log |
| **Admin** | MFA Management | ✅ Complete | List/reset |
| **Admin** | Session Management | ✅ Complete | Revoke sessions |
| **API** | JWT Validation | ✅ Complete | ⚠️ iss_claim TODO |
| **API** | Service Accounts | ✅ Complete | For internal auth |

### Stripe Integration

| Module | Integration Point | Status | Notes |
|--------|-------------------|--------|-------|
| **Cloud** | Checkout Session | ✅ Complete | Free/Pro/Enterprise |
| **Cloud** | Customer Portal | ✅ Complete | Manage subscriptions |
| **Cloud** | Webhook Handler | ✅ Complete | Optional; recommended to route to Admin |
| **Admin** | Webhook Handler | ✅ Complete | Writes to Platform Postgres |
| **Admin** | Read-only Access | ✅ Complete | Dashboard data |
| **Admin** | Customer Lookup | ✅ Complete | For support |

### Inter-Module Communication

| From | To | Method | Purpose |
|------|----|--------|---------|
| Cloud → Admin | Internal HTTP | Platform APIs | Tools, flags, profile, portal state |
| Admin → KombiStack | Internal HTTP | Flag apply + SSO exchange | Feature flags + SSO bridge |
| Admin → Zitadel | Management API | User admin actions | MFA, lock, impersonate |
| Admin → Stripe | Read/Write API | Billing ops | Webhooks + support |
| Cloud → Zitadel | OIDC + Webhook | Auth + sync | Login, profile sync |
| Cloud → Stripe | API + Webhook | Billing | Full lifecycle |
| Kong → All Services | HTTP/gRPC | Routing | Request forwarding |
| Kong → Zitadel | JWKS | Token validation | Every request |

---

## Security Architecture

### Authentication Layers

```
Layer 1: Zitadel (Identity Provider)
├── User authentication (OIDC)
├── JWT token issuance
├── MFA enforcement
└── Session management

Layer 2: Kong Gateway (API Security)
├── JWT validation (all routes)
├── API key validation (service accounts)
├── Rate limiting
└── Security headers

Layer 3: Application (Business Logic)
├── Role-based access control (RBAC)
├── Resource-level permissions
├── Audit logging
└── Input validation
```

### Security Checklist

| Security Control | Cloud | Admin | API |
|------------------|-------|-------|-----|
| HTTPS Enforcement | ⚠️ TODO | ⚠️ TODO | ⚠️ TODO |
| JWT Validation | ✅ | ✅ | ✅ |
| CSRF Protection | ✅ | ⚠️ Partial | N/A |
| Rate Limiting | ✅ (in-memory) | ❌ Missing | ✅ |
| Input Validation | ✅ Zod | ⚠️ Partial | N/A |
| Security Headers | ✅ | ✅ | ✅ |
| Audit Logging | ✅ | ✅ | ⚠️ Partial |
| Secrets Management | ⚠️ .env | ⚠️ .env | ⚠️ .env |

### Critical Security Issues (P0)

1. **Admin:** Exposed Stripe keys in `.env` (rotate immediately)
2. **Admin:** `ENABLE_AUTH=false` in development config
3. **Admin:** Default superuser password (`kombisphere`)
4. **API:** JWT `iss_claim` commented out (enable for production)
5. **API:** TLS certificates missing in `kong/certs/`
6. **All:** No centralized secrets management (consider Vault/Infisical)

---

## Deployment Architecture

### Production Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION ENVIRONMENT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        CDN / Load Balancer                          │    │
│  │                     (Cloudflare / Nginx / Traefik)                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         ▼                            ▼                            ▼         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ kombisphere.io  │     │ api.kombisphere │     │admin.kombisphere│       │
│  │   (Cloud)       │     │   (Kong)        │     │   (Admin)       │       │
│  │                 │     │                 │     │                 │       │
│  │  Docker: 3000   │     │  Docker: 8000   │     │  Docker: 8090   │       │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘       │
│           │                       │                       │                 │
│  ┌────────▼────────┐     ┌────────┴────────┐     ┌────────▼────────┐       │
│  │   PostgreSQL    │     │   Core Tools    │     │   PocketBase    │       │
│  │   (Managed)     │     │ Stack/Sim/Kits  │     │   (SQLite)      │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Docker Compose Services

```yaml
# Combined docker-compose.yml (reference)
services:
  # === KombiSphere-Cloud ===
  cloud:
    build: ./KombiSphere-Cloud
    ports: ["3000:3000"]
    depends_on: [postgres]
    environment:
      - DATABASE_URL=postgresql://...
      - ZITADEL_ISSUER=https://auth.kombisphere.io
      
  postgres:
    image: postgres:16
    volumes: [postgres_data:/var/lib/postgresql/data]
    
  # === KombiSphere-Admin ===
  admin:
    build: ./KombiSphere-Admin
    ports: ["8090:8090"]
    volumes: [pocketbase_data:/pb_data]
    environment:
      - ENABLE_AUTH=true
      - ZITADEL_ISSUER=https://auth.kombisphere.io
      
  # === KombiSphere-API ===
  kong:
    image: kong:3.9
    ports: ["8000:8000", "8443:8443"]
    volumes: [./kong/kong.yml:/kong.yml:ro]
    environment:
      - KONG_DATABASE=off
      - KONG_DECLARATIVE_CONFIG=/kong.yml
      
  # === Core Tools ===
  kombistack:
    image: kombisphere/kombistack:latest
    ports: ["8080:8080", "50051:50051"]
    
  kombisim:
    image: kombisphere/kombisim:latest
    ports: ["8081:8081"]
    
  stackkits:
    image: kombisphere/stackkits:latest
    ports: ["8082:8082"]
```

---

## API Standards

### URL Conventions

| Service | Base URL | Example |
|---------|----------|---------|
| Public API | `https://api.kombisphere.io/v1` | `/v1/orchestrator/workflows` |
| Cloud Portal | `https://kombisphere.io` | `/dashboard` |
| Admin Portal | `https://admin.kombisphere.io` | `/admin/tools` |
| Auth | `https://auth.kombisphere.io` | OIDC endpoints |

### Request Headers

```http
# Required for authenticated requests
Authorization: Bearer <jwt_token>

# Or API key authentication
X-Api-Key: <api_key>

# Added by Kong after JWT validation
X-User-ID: <user_uuid>
X-Org-ID: <org_uuid>
X-User-Email: <email>
X-User-Roles: <comma_separated_roles>

# Request tracing
X-Request-ID: <uuid>
X-Correlation-ID: <uuid>
```

### Response Format

```json
{
  "data": { ... },           // Success response data
  "meta": {                  // Pagination/metadata
    "page": 1,
    "limit": 20,
    "total": 100
  },
  "error": {                 // Error response (mutually exclusive with data)
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Migration Path

### Current State → Target State

```
CURRENT STATE (2026-01-16)
├── Cloud: 85% complete (Prisma schema ready, needs integration)
├── Admin: 95% complete (working, security fixes needed)
├── API: 90% complete (production config needed)
└── Integration: 60% complete (modules work, not fully connected)

TARGET STATE (Q2 2026)
├── Cloud: 100% (database fully integrated)
├── Admin: 100% (security hardened)
├── API: 100% (production-ready)
└── Integration: 100% (all modules communicating)
```

### Phase 1: Security Hardening (Week 1-2)
- [ ] Rotate exposed Stripe keys
- [ ] Enable auth in Admin
- [ ] Configure Kong JWT issuer
- [ ] Add TLS certificates
- [ ] Implement secrets management

### Phase 2: Database Integration (Week 3-4)
- [ ] Deploy PostgreSQL (Cloud)
- [ ] Run Prisma migrations
- [ ] Connect Cloud UI to database
- [ ] Verify Stripe webhooks persist data

### Phase 3: Inter-Module Integration (Week 5-6)
- [ ] Admin → Cloud sync endpoint
- [ ] Unified health monitoring
- [ ] Centralized logging
- [ ] Deployment automation

---

## Decision Points (Requires Input)

See [DECISION_LOG.md](./DECISION_LOG.md) for detailed decision records.

### Decisions Made (Assumptions)

1. **Central Database Location:** Cloud PostgreSQL ✅
   - Rationale: User data belongs with user-facing service
   
2. **Admin Database:** PocketBase remains separate ✅
   - Rationale: Internal tools data isolated from user data

3. **Auth Provider:** Zitadel Cloud ✅
   - Rationale: Already integrated, enterprise-ready

4. **Payment Provider:** Stripe ✅
   - Rationale: Already integrated, industry standard

### Decisions Needed

| # | Decision | Options | Recommendation | Impact |
|---|----------|---------|----------------|--------|
| 1 | **Secrets Management** | Vault / Infisical / AWS SM | Infisical (free tier) | High - Security |
| 2 | **Hosting Provider** | Hetzner / Railway / Fly.io | Hetzner Cloud | Medium - Cost |
| 3 | **PostgreSQL Hosting** | Self-managed / Managed | Managed (Supabase/Neon) | Medium - Ops |
| 4 | **CDN/Edge** | Cloudflare / Vercel Edge | Cloudflare | Low - Performance |
| 5 | **Logging Stack** | Loki / Datadog / Axiom | Axiom (free tier) | Medium - Observability |
| 6 | **Redis Needed?** | Yes (sessions) / No | Yes (rate limiting) | Medium - Scalability |
| 7 | **Admin Public Access?** | VPN only / Public | VPN only | High - Security |

---

## Related Documents

- [INTER_MODULE_CONTRACTS.md](./INTER_MODULE_CONTRACTS.md) - API contracts between modules
- [DECISION_LOG.md](./DECISION_LOG.md) - Architecture decision records
- [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md) - Security requirements
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment procedures

### Module-Specific Documents

- [Cloud: ARCHITECTURE.md](../KombiSphere-Cloud/docs/ARCHITECTURE.md)
- [Cloud: ROADMAP.md](../KombiSphere-Cloud/docs/ROADMAP.md)
- [Admin: ARCHITECTURE.md](../KombiSphere-Admin/docs/ARCHITECTURE.md)
- [Admin: ROADMAP.md](../KombiSphere-Admin/docs/ROADMAP.md)
- [API: ARCHITECTURE.md](../KombiSphere-API/docs/ARCHITECTURE.md)
- [API: ROADMAP.md](../KombiSphere-API/docs/ROADMAP.md)

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-01-16 | 1.0.0 | Initial unified architecture document |
