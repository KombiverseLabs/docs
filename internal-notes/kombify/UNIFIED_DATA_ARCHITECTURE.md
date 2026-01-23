# kombifySphere Unified Data Architecture

> **Version:** 3.1  
> **Date:** 2026-01-16  
> **Status:** UPDATED (cleanup + alignment)

## Executive Summary

This document defines the **single source of truth** for each data domain, eliminating redundant storage and simplifying sync complexity.

## Problem Statement

Current/legacy architecture has **too many overlapping data stores**:
- Zitadel (identity)
- Cloud PostgreSQL (SaaS data)
- Admin PocketBase (tools + subscription mirror) (legacy)
- KombiStack PocketBase (homelab data)

**Pain points:**
- User data replicated across Zitadel ↔ Prisma ↔ KombiStack PocketBase
- Subscription status in 3 places: Stripe → Zitadel metadata → Admin PB → Cloud Prisma
- No clear "source of truth" for each domain

---

## Unified Architecture (Target State)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ZITADEL (Managed Cloud)                           │
│                        Single Source of Truth: IDENTITY                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  • All humans (end-users, company users, admins)                            │
│  • OIDC authentication for Cloud + Admin                                    │
│  • Organization structure (companies/teams)                                 │
│  • RBAC via Zitadel Roles                                                   │
│  • Optional metadata: stripe_customer_id, subscription tier                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ OIDC/JWT
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STRIPE (External)                              │
│                      Single Source of Truth: BILLING                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Subscriptions (canonical state)                                          │
│  • Invoices & payment history                                               │
│  • Customer portal for self-service                                         │
│  • Webhooks update Postgres and/or Zitadel metadata                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ internal APIs
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 KOMBISPHERE POSTGRESQL (SINGLE DATABASE)                    │
│              Single Source of Truth: PLATFORM + TOOLS + FLAGS               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Managed by: Admin-Center backend (canonical writer)                        │
│  Read by: Cloud portal (via Admin API; direct DB access optional)           │
│                                                                             │
│  Stores:                                                                    │
│  • Tools catalog (tools, categories, patterns, relations)                   │
│  • AI tool evaluation (including embeddings via pgvector)                   │
│  • Feature flags (per user/org)                                             │
│  • Usage/billing mirror (optional; Stripe stays canonical)                  │
│  • Audit logs / notifications / portal data (optional)                      │
│                                                                             │
│  Keys:                                                                      │
│  • All user references keyed by Zitadel `sub` (string)                      │
│  • All org references keyed by Zitadel org id                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ (service-to-service)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KOMBISTACK POCKETBASE                               │
│           Single Source of Truth: HOMELAB OPERATIONAL STATE (per instance)  │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Required: PocketBase is deeply integrated (cannot be removed)            │
│  • Stores: stacks, nodes, workers, jobs, services, wallet, activity_log     │
│  • Auth: PocketBase auth (local)                                            │
│                                                                             │
│  SaaS integration:                                                          │
│  • KombiSphere does NOT do OIDC inside KombiStack                            │
│  • Kong validates Zitadel token and performs an SSO exchange                 │
│    to obtain a PocketBase session/token for the browser                      │
└─────────────────────────────────────────────────────────────────────────────┘

```

---

## Data Ownership Matrix (Final)

| Data Domain | Source of Truth | Other Stores | Sync Direction |
|-------------|-----------------|--------------|----------------|
| **User Identity** | Zitadel | Postgres (foreign key by `sub`) | Zitadel → Postgres (on-demand / sync) |
| **User Roles/Permissions** | Zitadel | Postgres (cached entitlements optional) | Zitadel → Postgres (optional cache) |
| **Subscriptions** | Stripe | Postgres and/or Zitadel metadata (mirror) | Stripe → Postgres/Zitadel (webhook) |
| **Invoices** | Stripe | Postgres (optional mirror) | Stripe → Postgres (optional) |
| **Tools Catalog** | Postgres | None | N/A |
| **AI Tool Evaluation + Embeddings** | Postgres | None | N/A |
| **Feature Flags** | Postgres | KombiStack PB (applied state/cache) | Postgres → KombiStack PB (sync) |
| **Homelab Data** | KombiStack PB | Postgres (optional pointers/usage) | KombiStack → Postgres (usage export optional) |

---

## User Management Flow (Simplified)

### Registration Flow
```
1. User signs up via KombiSphere-Cloud
2. Cloud redirects to Zitadel for account creation (OIDC)
3. Zitadel creates user, assigns default role (user)
4. Cloud receives JWT, creates session
5. Admin-center stores any app-specific state in Postgres keyed by Zitadel `sub`
6. KombiStack remains PocketBase-auth native; SSO is handled via Kong (see below)
```

### Subscription Flow (Simplified)
```
1. User clicks "Upgrade" in Cloud
2. Cloud redirects to Stripe Checkout
3. Stripe processes payment
4. Stripe webhook fires:
   - Webhook handler in Cloud (or Admin)
   - Updates Zitadel user metadata: subscription_tier = "pro"
   - NO local database writes needed
5. All apps read subscription tier from Zitadel JWT claims
```

### Authentication Flow (All Modules)
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Cloud     │     │    Admin     │     │  KombiStack  │
│  (SvelteKit) │     │     (Go)     │     │     (Go)     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
    │ OIDC              │ OIDC              │ PocketBase auth
    │                    │                    │ (SSO via Kong exchange)
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                      ZITADEL                            │
│                                                         │
│  JWT Claims Include:                                    │
│  - sub (user ID)                                       │
│  - email                                                │
│  - urn:zitadel:iam:org:project:roles (RBAC roles)     │
│  - metadata.subscription_tier                          │
│  - metadata.stripe_customer_id                         │
└─────────────────────────────────────────────────────────┘
```

---

## Role-Based Access Control (Zitadel RBAC)

### Roles Definition (Single Source: Zitadel)

| Role | Access Level | Modules |
|------|--------------|---------|
| `user` | Basic end-user | Cloud (read own data) |
| `subscriber:free` | Free tier | Cloud, KombiStack (limited) |
| `subscriber:pro` | Pro tier | Cloud, KombiStack (full), KombiSim |
| `subscriber:team` | Team tier | + Team features |
| `subscriber:enterprise` | Enterprise | + SLA, dedicated instance |
| `admin:tools` | Tools catalog admin | Admin (write tools) |
| `admin:billing` | Billing admin | Admin (view all subs) |
| `admin:super` | Super admin | All modules (full access) |

### Implementation

**Cloud (SvelteKit):**
```typescript
// Read role from Zitadel JWT
const user = await auth.validateToken(request);
const roles = user['urn:zitadel:iam:org:project:roles'];
const subscriptionTier = user.metadata?.subscription_tier || 'free';
```

**Admin (Go):**
```go
// middleware/auth.go
func RequireRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        claims := c.MustGet("claims").(*ZitadelClaims)
        if !hasRole(claims.Roles, role) {
            c.AbortWithStatus(403)
            return
        }
        c.Next()
    }
}
```

**KombiStack (Go):**
```go
// KombiStack does NOT validate Zitadel tokens itself.
// Kong validates Zitadel JWT and forwards trusted identity headers.

type SSOExchangeInput struct {
    ExternalSub   string // from X-User-Sub
    ExternalEmail string // from X-User-Email
}
```

---

## What Gets Removed/Simplified

### Admin Database Consolidation

The Admin-Center no longer runs its own PocketBase for tools/billing mirror.

- Tools catalog and AI evaluations move to Postgres (single database)
- Existing Admin PocketBase data becomes a migration input (one-time export/import)

### Cloud Database Consolidation

Cloud does not own a separate Postgres database. It uses the same single Postgres database (via Admin API), plus browser sessions/CSRF can also live in the same database if desired.

---

## SSO Into KombiStack (Kong-Mediated)

**Goal:** If the user is signed into KombiSphere, clicking “Open KombiStack” results in an automatic PocketBase login inside KombiStack.

### Pattern: Login Exchange

1. Browser has a valid Zitadel session (Cloud)
2. User clicks “Open KombiStack”
3. Cloud opens a Kong-routed URL (e.g. `/kombistack/sso/start`)
4. Kong validates the Zitadel JWT and injects identity headers (e.g. `X-User-Sub`, `X-User-Email`)
5. Kong calls a KombiStack endpoint that performs a **trusted upstream login exchange** and returns a PocketBase session cookie/token

### Required Change in KombiStack (Roadmap Item)

Add a small endpoint (behind Kong only) that:
- Accepts identity headers from Kong
- Finds/creates a PocketBase user linked to the external `sub` (stored as a field)
- Creates a PocketBase session for the browser

This is **not** OIDC inside KombiStack; it’s a controlled “SSO bridge” via Kong.

### KombiSphere-Cloud Prisma Changes

```prisma
// REMOVE these models (Zitadel/Stripe is source):
// - User              ❌ Use Zitadel
// - Subscription      ❌ Use Stripe
// - Invoice           ❌ Use Stripe
// - Usage             ❌ Decide: mirror to Postgres vs export from KombiStack

// KEEP these models:
model CSRFToken { /* ... */ }
model ActivityLog { /* ... */ }  // Portal-specific audit
model Notification { /* ... */ }

// OPTIONAL (decide based on feature):
model Project { /* ... */ }  // Or use KombiStack stacks
```

### KombiSphere-Admin Storage Changes (Platform Postgres)

The Admin-Center no longer runs PocketBase. It becomes the **canonical writer** to the single Platform PostgreSQL database.

- Tools + categories + patterns + relations live in Postgres
- AI evaluations (and optional embeddings via pgvector) live in Postgres
- Feature flags live in Postgres (per user/org), synced into KombiStack as applied state if needed
- Stripe remains canonical; Admin may mirror subscription state to Postgres and/or Zitadel metadata

---

## KombiStack Integration (No OIDC)

KombiStack keeps PocketBase auth. KombiSphere SSO is achieved via **Kong-mediated login exchange**.

### Internal Endpoints (behind Kong-only trust boundary)

- `POST /api/internal/sso/exchange`
  - Input: trusted identity headers from Kong (`X-User-Sub`, `X-User-Email`, optionally roles/tier)
  - Behavior: find/create PB user linked to external `sub`, create PB session, return cookie/token

- `POST /api/internal/feature-flags/apply`
  - Input: `sub` + resolved flags
  - Behavior: store applied flags snapshot in KombiStack PB (cache) and/or update user profile fields

---

## Stripe Sync (Practical)

Stripe stays canonical. Webhooks should primarily be processed by Admin-Center.

- Required: verify webhook signature, update platform state (Postgres) as needed
- Optional: update Zitadel metadata for fast entitlement checks from JWT
- Always: write an audit record (webhook log) in Postgres

---

## AI Gateway & Vector Storage

### Recommendation: SaaS-only Cloud AI Features

| Component | Self-Hosted | SaaS |
|-----------|-------------|------|
| Local Ollama | ✅ User runs own | ❌ Not available |
| Cloud AI (GPT/Gemini) | ❌ User provides key | ✅ Managed |
| RAG/Embeddings | ✅ Local file store | ✅ pgvector |
| AI Gateway (Kong) | ❌ | ✅ Rate limiting, billing |

### pgvector Integration (Platform Postgres)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,          -- Zitadel user ID (`sub`)
    content_type TEXT NOT NULL,       -- 'tool', 'evaluation', 'docs', 'chat_history'
    content_id TEXT NOT NULL,         -- Reference to source
    embedding vector(1536) NOT NULL,  -- Provider-dependent
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON embeddings (tenant_id);
```

---

## Migration Path (Recommended)

### Phase 1: Platform Postgres Baseline
1. Define Admin-owned schema + migrations for tools/evaluations/flags/audit
2. Point Admin backend to Postgres (`DATABASE_URL`), remove PocketBase runtime dependency

### Phase 2: Data Migration (One-time)
1. Export legacy Admin PocketBase collections
2. Import into Postgres tables (id mapping, created/updated timestamps preserved)

### Phase 3: KombiStack SSO Bridge
1. Add KombiStack internal `sso/exchange` endpoint behind Kong
2. Configure Kong route + identity header injection
3. End-to-end test: Cloud login → click “Open KombiStack” → PB session established

### Phase 4: Flags + AI
1. Implement flag resolution in Admin, push/apply into KombiStack
2. Add pgvector + embeddings storage in Platform Postgres (if SaaS AI enabled)

---

## Appendix: Store Inventory (Final)

### Zitadel (Managed)
- Users, organizations, roles, metadata (optional subscription mirror)

### Stripe (External)
- Customers, subscriptions, invoices, payment methods

### Platform PostgreSQL (Single DB)
- tools, categories, patterns, relations
- evaluations, crawls, ai_evaluations
- feature_flags, entitlements (optional cache)
- webhook_logs / audit logs
- embeddings (optional, pgvector)

### KombiStack PocketBase
- homelab operational state (stacks/nodes/jobs/services/etc.)
- per-user applied flags snapshot (optional cache)
- mapping external identity (`sub`) → PocketBase user

---

## Next Step

If you want, I can turn this into an implementation checklist per repo (Admin schema + Kong config + KombiStack internal endpoints) with exact file touchpoints.
