# kombify Big Picture Architecture

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Scope:** Multi-Repo System Architecture

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   kombify Platform                                       │
│                              Hybrid SaaS + Self-Hosted                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │                              SaaS Layer (Azure)                                  │   │
│   │                                                                                  │   │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │   │
│   │  │   Azure      │    │    Kong      │    │  KombiStack │    │  KombiSim    │  │   │
│   │  │   Front Door │───▶│   Gateway    │───▶│  Instances  │───▶│  Instances   │  │   │
│   │  │              │    │              │    │  (Shared)   │    │  (Shared)    │  │   │
│   │  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │   │
│   │         │                   │                   │                   │          │   │
│   │         │                   │                   │                   │          │   │
│   │         ▼                   ▼                   ▼                   ▼          │   │
│   │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │   │
│   │  │  KombiSphere │    │   KombiSphere│    │  Azure DB    │    │  Azure Files │  │   │
│   │  │   Cloud      │◄──▶│   Admin      │    │  PostgreSQL  │    │  (Storage)   │  │   │
│   │  │  (Next.js)   │    │  (SvelteKit) │    │              │    │              │  │   │
│   │  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                               │
│   ┌──────────────────────────────────────┼──────────────────────────────────────────┐   │
│   │                              Identity Layer (Zitadel)                           │   │
│   │                                      │                                          │   │
│   │                           auth.kombify.io                                       │   │
│   │                        OIDC Provider + SSO Hub                                  │   │
│   └──────────────────────────────────────┼──────────────────────────────────────────┘   │
│                                          │                                               │
│   ┌──────────────────────────────────────┼──────────────────────────────────────────┐   │
│   │                         Billing Layer (Stripe)                                   │   │
│   │                                      │                                          │   │
│   │                        Subscription Management                                   │   │
│   └──────────────────────────────────────┼──────────────────────────────────────────┘   │
│                                          │                                               │
│   ┌──────────────────────────────────────┼──────────────────────────────────────────┐   │
│   │                         Self-Hosted Layer                                        │   │
│   │                                      │                                          │   │
│   │  ┌──────────────┐              ┌──────┴──────┐    ┌──────────────┐             │   │
│   │  │   GitHub     │              │  User's     │    │  User's      │             │   │
│   │  │   StackKits  │◄─────────────│  Server     │    │  Server      │             │   │
│   │  │   Repo       │   git clone  │  (Stack)    │    │  (Sim)       │             │   │
│   │  └──────────────┘              └─────────────┘    └──────────────┘             │   │
│   │                                                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SaaS User Journey                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │   User   │────▶│ Zitadel  │────▶│  Cloud   │────▶│   Kong   │────▶│  Stack   │     │
│   │          │     │   SSO    │     │  Portal  │     │  Gateway │     │ Instance │     │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘     │
│       │                                  │                 │                 │          │
│       │                                  │                 │                 │          │
│       │ 1. Login                         │                 │                 │          │
│       │─────────────────────────────────▶│                 │                 │          │
│       │                                  │                 │                 │          │
│       │ 2. JWT Token                     │                 │                 │          │
│       │◀─────────────────────────────────│                 │                 │          │
│       │                                  │                 │                 │          │
│       │                                  │ 3. Launch      │                 │          │
│       │                                  │    Homelab     │                 │          │
│       │                                  │────────────────▶│                 │          │
│       │                                  │                 │                 │          │
│       │                                  │                 │ 4. SSO Exchange │          │
│       │                                  │                 │    + Headers    │          │
│       │                                  │                 │────────────────▶│          │
│       │                                  │                 │                 │          │
│       │                                  │                 │                 │ 5. Create│
│       │                                  │                 │                 │    Tenant│
│       │                                  │                 │                 │    User  │
│       │                                  │                 │                 │────┬─────│
│       │                                  │                 │                 │    │     │
│       │                                  │                 │                 │    ▼     │
│       │                                  │                 │                 │ ┌────────┐│
│       │                                  │                 │                 │ │PocketBase
│       │                                  │                 │                 │ │Users_T ││
│       │                                  │                 │                 │ └────────┘│
│       │                                  │                 │ 6. Auth Token   │          │
│       │                                  │                 │◀────────────────│          │
│       │                                  │ 7. Redirect    │                 │          │
│       │                                  │◀────────────────│                 │          │
│       │ 8. Homelab Dashboard             │                 │                 │          │
│       │◀─────────────────────────────────│                 │                 │          │
│       │                                  │                 │                 │          │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         Two-Layer Authentication Architecture                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  LAYER 1: SaaS Identity (Zitadel + PostgreSQL)                                          │
│  ═══════════════════════════════════════════════                                        │
│                                                                                          │
│   ┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐          │
│   │   User   │────────▶│ Zitadel  │────────▶│   JWKS   │────────▶│   Kong   │          │
│   │          │  OAuth2 │  Server  │  Keys   │ Endpoint │ Validate│  Gateway │          │
│   └──────────┘         └──────────┘         └──────────┘         └────┬─────┘          │
│                                                                       │                  │
│                                                                       │ JWT Validated    │
│                                                                       │ Headers Injected │
│                                                                       ▼                  │
│                                                               ┌──────────────┐           │
│                                                               │  Extract to  │           │
│                                                               │ X-User-*     │           │
│                                                               └──────┬───────┘           │
│                                                                      │                    │
│                                                                      ▼                    │
│  LAYER 2: Homelab Identity (PocketBase per Tenant)                                       │
│  ══════════════════════════════════════════════════                                      │
│                                                                      │                    │
│                                                               ┌──────┴───────┐           │
│                                                               │  KombiStack   │           │
│                                                               │  SSO Exchange │           │
│                                                               │               │           │
│                                                               │  1. Lookup    │           │
│                                                               │     tenant by │           │
│                                                               │     X-Org-ID  │           │
│                                                               │               │           │
│                                                               │  2. Find/create│          │
│                                                               │     user in   │           │
│                                                               │     namespace │           │
│                                                               │               │           │
│                                                               │  3. Generate  │           │
│                                                               │     PB token  │           │
│                                                               └──────┬───────┘           │
│                                                                      │                    │
│                                                                      ▼                    │
│                                                               ┌──────────────┐           │
│                                                               │  PocketBase   │           │
│                                                               │  users_{slug} │           │
│                                                               └──────────────┘           │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tenant Namespace Isolation

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        KombiStack Instance - Tenant Isolation                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   Instance: kombistack-prod-we-01.azurecontainerapps.io                                  │
│   Deployment Mode: SHARED (max 50 tenants)                                               │
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│   │                      Shared Collections (Platform Data)                          │    │
│   │                                                                                  │    │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │    │
│   │  │  _tenants   │  │ _sso_mappings│  │ _instance_config│  │ _audit_logs │            │    │
│   │  │             │  │             │  │             │  │             │            │    │
│   │  │ Tenant A    │  │ Sub A ──▶   │  │ deployment: │  │ All tenant  │            │    │
│   │  │ Tenant B    │  │   Tenant A  │  │   shared    │  │ activities  │            │    │
│   │  │ Tenant C    │  │ Sub B ──▶   │  │ max_tenants:│  │             │            │    │
│   │  │ ...         │  │   Tenant B  │  │   50        │  │             │            │    │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │    │
│   └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                           │                                              │
│                                           │ Per-Tenant Namespaces                        │
│           ┌───────────────────────────────┼───────────────────────────────┐              │
│           │                               │                               │              │
│   ┌───────▼───────┐               ┌───────▼───────┐               ┌───────▼───────┐      │
│   │  Tenant A     │               │  Tenant B     │               │  Tenant C     │      │
│   │  Namespace    │               │  Namespace    │               │  Namespace    │      │
│   │               │               │               │               │               │      │
│   │ users_acme    │               │ users_bob     │               │ users_corp    │      │
│   │ stacks_acme   │               │ stacks_bob    │               │ stacks_corp   │      │
│   │ nodes_acme    │               │ nodes_bob     │               │ nodes_corp    │      │
│   │ jobs_acme     │               │ jobs_bob      │               │ jobs_corp     │      │
│   │ ...           │               │ ...           │               │ ...           │      │
│   └───────────────┘               └───────────────┘               └───────────────┘      │
│                                                                                          │
│   Query Pattern: db.collection("users_" + tenantSlug)                                    │
│   Authorization: Middleware validates X-Tenant-ID matches user's tenant                  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          Horizontal Scaling Architecture                                 │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│   │                            Global Load Balancer                                  │    │
│   │                         Azure Front Door / CDN                                   │    │
│   │                                                                                  │    │
│   │                         api.kombify.io                                           │    │
│   │                              │                                                   │    │
│   └──────────────────────────────┼───────────────────────────────────────────────────┘    │
│                                  │                                                       │
│   ┌──────────────────────────────┼───────────────────────────────────────────────────┐    │
│   │                              ▼                   Region: West Europe              │    │
│   │                    ┌─────────────────┐                                           │    │
│   │                    │  Kong Gateway   │                                           │    │
│   │                    │   (3 replicas)  │                                           │    │
│   │                    └────────┬────────┘                                           │    │
│   │                             │                                                     │    │
│   │         ┌───────────────────┼───────────────────┐                                 │    │
│   │         │                   │                   │                                 │    │
│   │  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐                          │    │
│   │  │ Stack Inst  │    │ Stack Inst  │    │ Stack Inst  │                          │    │
│   │  │  #1 (50)    │    │  #2 (50)    │    │  #3 (50)    │                          │    │
│   │  │             │    │             │    │             │                          │    │
│   │  │ Tenants:    │    │ Tenants:    │    │ Tenants:    │                          │    │
│   │  │ A, B, C...  │    │ M, N, O...  │    │ X, Y, Z...  │                          │    │
│   │  └─────────────┘    └─────────────┘    └─────────────┘                          │    │
│   │                                                                                  │    │
│   └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│   Auto-Scaling Triggers:                                                                 │
│   ───────────────────────                                                                │
│   • Current tenants >= 45 on any instance → Provision new instance                       │
│   • CPU > 70% for 5 min → Scale up instance                                              │
│   • Memory > 80% for 5 min → Scale up instance                                           │
│   • Failed health check → Mark unhealthy, route to healthy instances                     │
│                                                                                          │
│   Dedicated Instances (Enterprise):                                                      │
│   ─────────────────────────────────                                                      │
│   • deployment_mode = dedicated                                                          │
│   • max_tenants = 1                                                                      │
│   • Provisioned in separate resource group                                               │
│   • Custom domain support                                                                │
│   • VPN/private endpoint options                                                         │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Ownership Matrix

| Data Domain | Source of Truth | Replicated To | Access Pattern |
|-------------|-----------------|---------------|----------------|
| **User Identity** | Zitadel | PostgreSQL (cache) | Cloud reads X-User-* headers |
| **Subscriptions** | Stripe | PostgreSQL (mirror) | Webhook sync to Admin |
| **Tenant Metadata** | PostgreSQL (Admin) | KombiStack (_tenants collection) | Sync on tenant creation |
| **Homelab State** | PocketBase per Stack | PostgreSQL (optional export) | Stack is authoritative |
| **Tool Catalog** | PostgreSQL (Admin) | Kong cache | API reads from Admin |
| **Feature Flags** | PostgreSQL (Admin) | PocketBase (_feature_flags) | Sync via Contract 5 |
| **Audit Logs** | Per service | Azure Monitor | Centralized logging |

---

## Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              Complete Request Lifecycle                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  1. DNS Resolution                                                                       │
│     user ──▶ api.kombify.io ──▶ Azure Front Door                                       │
│                                                                                          │
│  2. Edge Routing                                                                         │
│     Front Door ──▶ Route to nearest region ──▶ Kong Gateway Container App              │
│                                                                                          │
│  3. Authentication (Kong)                                                                │
│     Kong ──▶ Validate JWT (Zitadel JWKS)                                               │
│          ──▶ Extract claims                                                            │
│          ──▶ Add X-User-* headers                                                      │
│          ──▶ Apply rate limiting by plan                                               │
│                                                                                          │
│  4. Routing Decision                                                                     │
│     Kong ──▶ Match path prefix:                                                        │
│          /v1/stacks/*    ──▶ KombiStack Instance                                       │
│          /v1/simulations/* ──▶ KombiSim Instance                                       │
│          /v1/admin/*     ──▶ Admin Center                                              │
│          /v1/portal/*    ──▶ Cloud Portal                                              │
│          /v1/stackkits/* ──▶ StackKits API                                             │
│                                                                                          │
│  5. Service Processing                                                                   │
│     Service ──▶ Extract X-Tenant-ID header                                             │
│             ──▶ Route to tenant namespace                                              │
│             ──▶ Query/Update PocketBase                                                │
│             ──▶ Return response                                                        │
│                                                                                          │
│  6. Response Path                                                                        │
│     Service ──▶ Kong ──▶ Add rate limit headers                                        │
│                       ──▶ Add request ID                                               │
│                       ──▶ Front Door ──▶ User                                          │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               Security Architecture                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│   Layer 1: Edge (Public Internet)                                                       │
│   ───────────────────────────────                                                       │
│   • DDoS protection (Azure Front Door)                                                  │
│   • WAF rules (SQL injection, XSS)                                                      │
│   • TLS 1.3 termination                                                                 │
│                                                                                          │
│   Layer 2: Gateway (Authentication)                                                     │
│   ─────────────────────────────────                                                     │
│   • JWT validation                                                                      │
│   • Rate limiting by plan                                                               │
│   • Request transformation                                                              │
│   • CORS enforcement                                                                    │
│                                                                                          │
│   Layer 3: Service (Authorization)                                                      │
│   ────────────────────────────────                                                      │
│   • Tenant isolation                                                                    │
│   • Role-based access control                                                           │
│   • Resource quotas                                                                     │
│                                                                                          │
│   Layer 4: Data (Encryption)                                                            │
│   ──────────────────────────                                                            │
│   • At-rest encryption (Azure-managed keys)                                             │
│   • In-transit encryption (TLS 1.3)                                                     │
│   • Field-level encryption for secrets                                                  │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

*See REPO_ARCHITECTURE_PLANS.md for component-level details*
