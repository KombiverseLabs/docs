# KombiSphere Architecture Decision Log

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-16  
> **Status:** Living Document

---

## Overview

This document records significant architectural decisions made for the KombiSphere platform. Each decision follows the ADR (Architecture Decision Record) format.

---

## ADR-001: Central Database Location

**Date:** 2026-01-16  
**Status:** APPROVED  
**Deciders:** Architecture Review  

### Context

KombiSphere has three main modules (Cloud, Admin, API) that need access to user and subscription data. We need to decide where the canonical user data lives.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: Cloud PostgreSQL** | User data with user-facing service; Prisma ORM ready; Scalable | Admin needs sync |
| **B: Admin PocketBase** | Single source; Simple | SQLite scaling limits; Wrong ownership |
| **C: Shared PostgreSQL** | Single database | Complex coordination; Tighter coupling |
| **D: Zitadel as Primary** | Auth-native; Already exists | Limited data model; Lock-in |

### Decision

**Option C: Shared PostgreSQL (single platform database used by Cloud + Admin)**

### Rationale

1. **Single Source of Truth:** One PostgreSQL for platform backend data (tools, flags, portal state)
2. **Existing Work:** Prisma schema and Postgres tooling already exist
3. **Admin-Center Ownership:** Admin owns backend logic for user management and feature flags
4. **Less Drift:** Removes Cloud↔Admin sync complexity

### Consequences

- Cloud and Admin share the same PostgreSQL database (schema managed centrally)
- Admin-Center becomes canonical writer for platform tables
- Cloud reads/writes via Admin APIs (direct DB access is optional)
- User identity remains in Zitadel; Postgres stores app-specific profile/preferences keyed by Zitadel `sub`

---

## ADR-002: Admin Database Technology

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

The Admin module needs a database for tools catalog, patterns, crawler data, feature flags, and AI tool evaluation.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: PocketBase (SQLite)** | Simple for internal CRUD | Not suitable as shared platform source of truth |
| **B: PostgreSQL (single platform DB)** | Scalable; supports pgvector; matches Prisma | Requires migration from PocketBase |

### Decision

**Option B: PostgreSQL (single platform DB). No Admin PocketBase instance.**

### Rationale

1. **One Database:** Removes second database and sync drift
2. **AI + Search:** pgvector/FTS fits Postgres far better than PocketBase
3. **Feature Flags:** Centralized flags and entitlements live in Postgres
4. **User Management:** Admin logic needs tight coupling to platform data

### Consequences

- Migrate Admin PocketBase collections into PostgreSQL tables
- Admin remains independently deployable, but depends on Postgres
- PocketBase remains only inside KombiStack instances (product requirement)

---

## ADR-003: Authentication Provider

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Need a unified authentication solution for all modules.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: Zitadel Cloud** | Already integrated; Enterprise SSO; OIDC | Learning curve |
| **B: Auth0** | Popular; Well-documented | Cost at scale |
| **C: Keycloak** | Self-hosted; Full control | Ops overhead |
| **D: Custom** | Full control | Security risk; Time |

### Decision

**Option A: Zitadel Cloud**

### Rationale

1. **Already Integrated:** Both Cloud and Admin use Zitadel
2. **Enterprise Features:** SSO, MFA, organizations built-in
3. **Cost-Effective:** Free tier sufficient for early stage
4. **Modern:** OIDC-native, good API

### Consequences

- All modules authenticate via Zitadel OIDC
- Kong validates JWT tokens from Zitadel
- Role management centralized in Zitadel
- Admin manages users via Zitadel Management API

---

## ADR-004: API Gateway Choice

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Need an API gateway for routing, auth validation, and rate limiting.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: Kong** | Already configured; Declarative; Feature-rich | Learning curve |
| **B: Traefik** | Simple; Docker-native | Less features |
| **C: Nginx** | Fast; Familiar | Manual config |
| **D: AWS API Gateway** | Managed | Vendor lock-in; Cost |

### Decision

**Option A: Kong Gateway**

### Rationale

1. **Already Configured:** 800+ lines of kong.yml ready
2. **Declarative:** GitOps with decK
3. **JWT Plugin:** Built-in Zitadel integration
4. **gRPC Support:** Needed for worker connections

### Consequences

- All public APIs route through Kong
- Kong handles JWT validation, rate limiting
- Kong configuration managed in KombiSphere-API repo
- No direct access to backend services from internet

---

## ADR-005: Payment Provider

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Need payment processing for SaaS subscriptions.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: Stripe** | Industry standard; Good API; Customer Portal | Fees |
| **B: Paddle** | VAT handling; MoR | Less control |
| **C: LemonSqueezy** | Simple; MoR | Limited features |

### Decision

**Option A: Stripe**

### Rationale

1. **Already Integrated:** Both Cloud and Admin have Stripe code
2. **Customer Portal:** Self-service billing management
3. **Webhooks:** Comprehensive event system
4. **Flexibility:** Full control over pricing/plans

### Consequences

- Cloud handles Stripe checkout and webhooks
- Admin has read-only Stripe access for dashboard
- Customer portal for self-service billing changes
- Must handle tax/VAT separately (future)

---

## ADR-006: Inter-Module Communication

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Modules need to communicate for data sync and operations.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: Direct HTTP (Internal)** | Simple; Synchronous | Coupling |
| **B: Message Queue** | Async; Resilient | Complexity |
| **C: Shared Database** | Simple reads | Tight coupling |
| **D: Event Sourcing** | Audit; Replay | Over-engineering |

### Decision

**Option A: Direct HTTP with fallback to polling**

### Rationale

1. **Simplicity:** HTTP is understood, debuggable
2. **Low Volume:** Sync operations are infrequent
3. **Fallback:** Admin can poll Cloud if push fails
4. **Future-Proof:** Can add message queue later if needed

### Consequences

- Cloud pushes sync events to Admin
- Admin can poll Cloud for metrics
- Internal endpoints use service JWT
- Retry logic required for resilience

---

## ADR-007: Database ORM Choice (Cloud)

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Need a schema/migrations strategy for the single PostgreSQL platform database.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A: Prisma** | Type-safe; Migrations; Already setup | Query limitations |
| **B: Drizzle** | Lightweight; SQL-like | Less ecosystem |
| **C: EdgeDB** | Modern; Graph queries | Learning curve |
| **D: Raw SQL** | Full control | No type safety |

### Decision

**Option A: Prisma remains the schema/migrations source for the platform Postgres.**

### Rationale

1. **Already Implemented:** Schema with 8 models exists
2. **Type Safety:** Generated TypeScript client
3. **Migrations:** Built-in migration system
4. **Ecosystem:** Wide SvelteKit adoption

### Consequences

- Keep Prisma schema as the canonical schema definition
- Admin (Go) may use `pgx`/`sqlc` against the same DB (no need to adopt Prisma in Go)
- Cloud uses Prisma client where it makes sense, or calls Admin APIs

---

## Newly Approved Decisions (2026-01-16)

### ADR-008: Secrets Management

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

All modules have secrets in `.env` files. Need secure, centralized management.

### Decision

**Doppler (primary), Azure Key Vault (future enterprise option)**

### Rationale

1. **Already Connected:** Doppler extension active in VS Code
2. **Multi-Environment:** dev/staging/prod configs built-in
3. **CI/CD Integration:** GitHub Actions, Docker support
4. **Azure Fallback:** Key Vault available for enterprise compliance
5. **Team Features:** Access controls, audit logs

### Consequences

- All `.env` files migrated to Doppler
- Service tokens for CI/CD and production
- Azure Key Vault sync available for enterprise customers
- See [DOPPLER_SECRETS_STRATEGY.md](DOPPLER_SECRETS_STRATEGY.md) for details

---

### ADR-009: Hosting Provider

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Need hosting for initial SaaS launch (1 month after open-source release).

### Decision

**Ionos VPS → DigitalOcean/Azure (enterprise tier)**

### Rationale

1. **Cost Control:** Start with affordable VPS
2. **Single Instance:** All users on shared instance initially
3. **Scale Path:** Move to dedicated per-company instances later
4. **Enterprise:** DigitalOcean or Azure for company plans

### Consequences

- Initial deployment: 1 Ionos VPS (all services)
- Possible scale to 2-3 VPS if performance degrades
- Enterprise customers: Dedicated instance on DO/Azure
- Self-managed infrastructure (no PaaS lock-in)

---

### ADR-010: PostgreSQL Hosting

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Cloud module needs PostgreSQL for session/notification data.

### Decision

**Self-hosted on same VPS (initially)**

### Rationale

1. **Simplicity:** Single server for MVP
2. **Cost:** No additional database service fees
3. **Control:** Full access for debugging
4. **Future:** Can migrate to managed service later

### Consequences

- PostgreSQL on Ionos VPS alongside services
- Regular backups to S3/MinIO
- Consider Neon/Supabase if scaling issues arise
- No high-availability initially (acceptable for alpha)

---

### ADR-011: Admin Portal Access

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Admin portal needs secure access for internal company users.

### Decision

**Public with Zitadel RBAC (no VPN/IP whitelist)**

### Rationale

1. **Simplicity:** No VPN infrastructure needed
2. **Zitadel RBAC:** Already have role management
3. **Future-Proof:** Can add VPN later if needed
4. **Roles:** admin:tools, admin:billing, admin:super

### Consequences

- Admin portal publicly accessible (like Cloud)
- Zitadel enforces role-based access
- All admin users in same Zitadel organization
- Rate limiting and audit logging enabled

---

### ADR-012: Redis Usage

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Rate limiting currently in-memory, won't scale across instances.

### Decision

**No Redis initially, add later if needed**

### Rationale

1. **Complexity Reduction:** Fewer services to manage
2. **Single Instance:** In-memory is fine for 1 server
3. **Scale Trigger:** Add Redis when moving to multi-instance
4. **Focus:** Ship SaaS first, optimize later

### Consequences

- Rate limiting stays in-memory for MVP
- Kong rate limiting uses local counters
- Add Upstash Redis when scaling to 2+ instances
- Sessions stay in PocketBase/PostgreSQL

---

### ADR-013: Logging/Observability Stack

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Need logging and observability for production.

### Decision

**Grafana (prepared, but not deployed yet)**

### Rationale

1. **KombiStack Ready:** pkg/logger already structured
2. **Self-Hosted:** Can run on same VPS
3. **Full Stack:** Loki + Grafana for logs + dashboards
4. **Future:** Can add Prometheus for metrics

### Consequences

- Grafana deployment optional for alpha
- Structured logging via pkg/logger already in place
- Add Grafana stack when needed for debugging
- Consider Axiom if self-hosting becomes burden

---

### ADR-014: Data Architecture Consolidation

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

Four data stores with overlapping responsibilities causing confusion:
- Zitadel (identity)
- Cloud PostgreSQL (user data, subscriptions)
- Admin PocketBase (tools + subscription mirror)
- KombiStack PocketBase (homelab data)

### Decision

**Consolidate to 3 clear domains:**
1. **Zitadel** = Identity + RBAC
2. **Platform PostgreSQL (single DB)** = Tools + AI evaluations + feature flags + portal state
3. **KombiStack PocketBase** = Homelab operational state (per KombiStack instance)

### Rationale

1. **Single Truth:** Each domain has one canonical source
2. **Stripe → Zitadel Direct:** Remove intermediate subscription storage
3. **KombiStack Central:** Main product owns user's homelab data
4. **Admin Simplified:** Just tools catalog, no user/billing duplication

### Consequences

- Remove the Admin PocketBase instance (migrate data into Postgres)
- Keep KombiStack PocketBase as-is
- Implement Kong-mediated KombiStack SSO exchange (no OIDC inside KombiStack)
- Store feature flags canonically in Postgres; push/apply into KombiStack PB as needed
- See [UNIFIED_DATA_ARCHITECTURE.md](UNIFIED_DATA_ARCHITECTURE.md) for details

---

### ADR-015: KombiStack Integration (SSO Bridge)

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

KombiStack is 80% complete, designed as single-tenant (1 instance = 1 homelab). 
Need to integrate as main product in SaaS platform.

### Decision

**KombiStack remains PocketBase-auth native. SaaS SSO is via Kong-mediated login exchange.**

### Rationale

1. **Product Reality:** KombiStack auth is deeply integrated with PocketBase
2. **Minimal Intrusion:** No Zitadel/OIDC implementation inside KombiStack
3. **Good UX:** SSO from KombiSphere into KombiStack via gateway-controlled exchange
4. **Security Boundary:** Kong validates Zitadel JWT and only then calls internal exchange endpoint

### Consequences

- Add a KombiStack internal endpoint for SSO exchange (behind Kong only)
- Map Zitadel `sub` to a PocketBase user field (externally managed identity)
- Allow Admin to apply feature flags into KombiStack PB for that user
- See [UNIFIED_DATA_ARCHITECTURE.md](UNIFIED_DATA_ARCHITECTURE.md) for details

---

### ADR-016: AI Features Distribution

**Date:** 2026-01-16  
**Status:** APPROVED  

### Context

KombiStack has AI assistants (user chat, self-healing). 
Need to decide SaaS vs open-core distribution.

### Decision

**SaaS-only cloud AI; Self-hosted gets local Ollama**

### Rationale

1. **Cost Control:** Cloud AI (OpenAI/Gemini) has API costs
2. **SaaS Value:** Premium feature for paying users
3. **Open Core:** Ollama works locally without internet
4. **RAG:** pgvector for SaaS, file-based for self-hosted

### Consequences

- Self-hosted: Ollama auto-start, local embeddings
- SaaS: OpenAI/Gemini via API, pgvector embeddings
- Kong AI gateway routes for SaaS (rate limiting, billing)
- AI usage tracked in `usage_metrics` for billing

---

## Pending Decisions

### ADR-017: KombiSim Integration (PENDING)

**Status:** NEEDS_DECISION  
**Deadline:** 2026-02-01  

**Context:** KombiSim needs user management or 1 instance per user.

**Questions:**
- Is KombiSim a separate service or part of KombiStack?
- What data does KombiSim need?
- Should KombiSim share KombiStack's PocketBase?

**Decision Needed From:** Project owner

---

### ADR-018: StackKits Distribution (PENDING)

**Status:** NEEDS_DECISION  
**Deadline:** 2026-02-01  

**Context:** StackKits is "permanently available as logic for everyone."

**Status Update (2026-01-16):**

**Decided:** StackKits are an **own repo**, written in **CUE**, and **paid StackKits** are planned in the future.

**Remaining Questions:**
- How will paid StackKits be distributed (registry, Git, signed bundles)?
- How does KombiStack authenticate to fetch paid StackKits?

---

## Decision Process

1. **Proposal:** Anyone can propose a decision
2. **Discussion:** 1 week for async discussion
3. **Decision:** Project owner makes final call
4. **Documentation:** Update this log
5. **Implementation:** Create tickets/tasks

---

## Questions for Project Owner

### High Priority (This Week)

1. **KombiSim Integration (ADR-017):**
   - Is KombiSim part of KombiStack or separate?
   - Does it need its own instance per user?
   - Can it share KombiStack's PocketBase?

2. **StackKits Distribution (ADR-018):**
   - What format are StackKits (CUE files)?
   - Bundled with KombiStack or separate repo?
   - Any premium StackKits planned?

### Medium Priority (This Month)

3. **Multi-Region:** Is EU-only sufficient for alpha/beta?

4. **CDN:** Cloudflare for static assets?

5. **Email Provider:** For notifications (SendGrid, Resend, etc.)?

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-16 | Initial decision log with 7 approved ADRs |
| 2026-01-16 | Added 6 pending decisions requiring input |
| 2026-01-16 | **MAJOR UPDATE:** Approved ADR-008 through ADR-016 based on user input |
| 2026-01-16 | Doppler chosen for secrets management |
| 2026-01-16 | Ionos VPS → DO/Azure scaling path approved |
| 2026-01-16 | Data architecture consolidation approved (ADR-014) |
| 2026-01-16 | KombiStack SSO bridge (Kong-mediated) approved (ADR-015) |
| 2026-01-16 | Created UNIFIED_DATA_ARCHITECTURE.md |
| 2026-01-16 | Created DOPPLER_SECRETS_STRATEGY.md |
