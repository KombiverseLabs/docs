# kombify Architecture Gap Analysis

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Status:** CRITICAL FINDINGS

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 **CRITICAL** | 6 | Blocks SaaS launch, requires immediate attention |
| 🟠 **HIGH** | 6 | Significant impact, should be addressed in Phase 1 |
| 🟡 **MEDIUM** | 5 | Can be deferred but will accumulate technical debt |
| 🟢 **LOW** | 3 | Nice-to-have improvements |

> **Note:** This gap analysis incorporates findings from both Roo's architecture review and Opus 4.5's architecture review.

---

## 🔴 Critical Gaps (Must Fix Before Launch)

### CRIT-001: SSO Exchange Endpoint Not Implemented

**Current State:**
- Kong configuration exists for JWT validation and header transformation
- [`INTER_MODULE_CONTRACTS.md`](internal-notes/kombify/INTER_MODULE_CONTRACTS.md) Contract 6 defines the SSO flow
- **Missing:** `/api/internal/sso/exchange` endpoint in KombiStack

**Impact:**
- SaaS users cannot access their KombiStack instances
- Two-layer user system is non-functional
- Entire SaaS value proposition blocked

**Evidence:**
```
From CONSISTENCY_AUDIT.md:
"SSO bridge documented but incomplete - estimated 80% complete"
"Implementation gap: KombiStack SSO exchange endpoint not built"
```

**Required Work:**
1. Create `POST /api/internal/sso/exchange` handler in KombiStack
2. Implement tenant lookup by Zitadel org ID
3. Implement user creation in tenant namespace
4. Generate PocketBase auth tokens
5. Create `_sso_mappings` collection

**Effort:** 3-4 days
**Priority:** P0 - Blocks all SaaS functionality

---

### CRIT-002: Multi-Tenancy Data Layer Missing

**Current State:**
- KombiStack designed for "1 Stack = 1 Homelab"
- No tenant isolation mechanism exists
- PocketBase collections are flat

**Impact:**
- Cannot support "50 admins per instance" requirement
- Data leakage risk between tenants
- No path to SaaS multi-tenancy

**Evidence:**
```go
// From KombiStack ARCHITECTURE.md:
// "1 kombify Stack = 1 Homelab"
// "Multi-Homelab-Szenarien erfordern mehrere Instanzen"
```

**Required Work:**
1. Design namespace-based collection naming
2. Create tenant middleware for request routing
3. Migrate existing collections to per-tenant pattern
4. Build tenant provisioning API
5. Update all queries to include tenant filter

**Effort:** 1-2 weeks
**Priority:** P0 - Core SaaS requirement

---

### CRIT-003: Kong Gateway Not Deployed

**Current State:**
- Comprehensive Bicep templates exist ([`main.bicep`](infrastructure/bicep/main.bicep))
- Kong configuration file exists ([`kong-config.yaml`](infrastructure/kong/kong-config.yaml))
- Infrastructure plan documented ([`KONG_INFRASTRUCTURE_PLAN.md`](internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md))
- **Missing:** Actual deployment to Azure

**Impact:**
- No central authentication/authorization point
- Services exposed directly without JWT validation
- No rate limiting or request transformation
- SSO flow cannot function

**Evidence:**
```
From INTER_MODULE_CONTRACTS.md Implementation Checklist:
- [ ] Deploy Kong to Azure Container App
- [ ] Configure JWT plugin with Zitadel JWKS endpoint
- [ ] Test token validation and claim extraction
```

**Required Work:**
1. Deploy Kong to Azure Container Apps
2. Configure Zitadel JWKS endpoint
3. Set up PostgreSQL backend for Kong
4. Configure Redis for rate limiting
5. Set up Front Door routing
6. Test all service routes

**Effort:** 2-3 days
**Priority:** P0 - Infrastructure foundation

---

### CRIT-004: Admin Module Database Misalignment

**Current State:**
- [`CONSISTENCY_AUDIT.md`](internal-notes/kombify/CONSISTENCY_AUDIT.md) ARCH-001: "Admin still references PocketBase but docs say PostgreSQL"
- Prisma schema exists with comprehensive models
- Implementation status unclear

**Impact:**
- Cannot reliably manage tenant instances
- Health monitoring capabilities blocked
- Platform administration at risk

**Evidence:**
```
From CONSISTENCY_AUDIT.md:
"Status: CONFIRMED - Documentation inconsistency"
"Administration module documentation references PocketBase 
for local deployment, but architecture specifies PostgreSQL 
for platform"
```

**Required Work:**
1. Audit Admin module current database implementation
2. Migrate from PocketBase to PostgreSQL if needed
3. Align all models with Prisma schema
4. Update deployment configurations
5. Test health check APIs

**Effort:** 3-5 days
**Priority:** P0 - Platform reliability

---

### CRIT-005: Kong OIDC Plugin Missing

**Current State:**
- JWT validation plugin is configured
- **Missing:** OIDC plugin for SSO session management
- **Impact:** Cannot perform proper SSO token exchange with Zitadel

**Evidence:**
```bash
# Current kong-config.yaml only has:
grep -A 10 "name: jwt" infrastructure/kong/kong-config.yaml
# No OIDC plugin configuration present
```

**Required Work:**
1. Add OIDC plugin to Kong configuration
2. Configure Zitadel OIDC discovery endpoint
3. Set up Redis-backed sessions
4. Configure redirect URIs
5. Test authorization code flow

**Effort:** 1-2 days
**Priority:** P0 - Required for SSO flow

---

### CRIT-006: Tenant Quota Enforcement Missing

**Current State:**
- `maxUsers`, `maxNodes` fields defined in Tenant schema
- **Missing:** Enforcement mechanism for quota limits
- **Impact:** Tenants can exceed plan limits, breaking SaaS economics

**Evidence:**
```go
// From schema: maxUsers defined but never checked
// No quota middleware exists
// No enforcement in user creation endpoints
```

**Required Work:**
1. Create quota manager service
2. Implement quota checking middleware
3. Add quota headers to API responses
4. Block operations that exceed limits
5. Add quota usage to tenant dashboard

**Effort:** 2-3 days
**Priority:** P0 - Required for SaaS viability

---

## 🟠 High Priority Gaps

### HIGH-001: Feature Flag Distribution Not Implemented

**Current State:**
- Contract 5 defines feature flag sync from Admin to KombiStack
- [`INTER_MODULE_CONTRACTS.md`](internal-notes/kombify/INTER_MODULE_CONTRACTS.md): `POST /api/internal/feature-flags/apply`
- **Missing:** Endpoint implementation, sync mechanism

**Impact:**
- Cannot enable/disable features per tenant
- No A/B testing capability
- Plan-based feature gating broken

**Required Work:**
1. Implement feature flag storage in KombiStack
2. Build sync mechanism from Admin
3. Create middleware for feature checking
4. UI integration for feature toggles

**Effort:** 2-3 days
**Priority:** P1 - Feature parity

---

### HIGH-002: Health Check Endpoints Incomplete

**Current State:**
- Health endpoints defined in contracts
- [`INTER_MODULE_CONTRACTS.md`](internal-notes/kombify/INTER_MODULE_CONTRACTS.md): `GET /health`, `GET /ready`
- **Missing:** Consistent implementation across services

**Impact:**
- Cannot monitor instance health
- Auto-scaling and alerting blocked
- Operational visibility limited

**Required Work:**
1. Implement `/health` in KombiStack
2. Implement `/health` in KombiSim
3. Implement `/health` in Admin
4. Set up Azure Monitor integration
5. Configure alerting rules

**Effort:** 2-3 days
**Priority:** P1 - Operations readiness

---

### HIGH-003: StackKits API Not Exposed

**Current State:**
- StackKits exists as repository
- CUE validation ready
- **Missing:** Kong API routes, entitlement checking

**Impact:**
- SaaS users cannot browse StackKits
- Plan-based kit restrictions not enforceable
- CLI-only access limits adoption

**Required Work:**
1. Add StackKits service to Kong config
2. Implement `/v1/stackkits` endpoints
3. Add plan-based access control
4. Integrate with Admin for kit catalog

**Effort:** 2-3 days
**Priority:** P1 - User experience

---

### HIGH-004: KombiSim Multi-Tenancy Not Designed

**Current State:**
- KombiSim is single-tenant Docker-based
- No tenant isolation for simulations
- **Missing:** Multi-tenancy architecture

**Impact:**
- Sim resources shared across all users
- Security isolation concerns
- Cannot bill per-tenant for Sim usage

**Required Work:**
1. Design Sim tenant isolation (Docker networks/namespaces)
2. Implement tenant-scoped simulation groups
3. Add resource quotas per tenant
4. Update Kong routing for Sim

**Effort:** 1 week
**Priority:** P1 - Post-launch requirement

---

### HIGH-005: Instance Provisioning Automation Missing

**Current State:**
- Azure Bicep templates exist
- Manual deployment documented
- **Missing:** Automated provisioning API

**Impact:**
- Admin cannot dynamically create Stack instances
- Scaling requires manual intervention
- Onboarding experience poor

**Required Work:**
1. Build instance provisioning API in Admin
2. Integrate with Azure ARM
3. Implement health checks post-provisioning
4. Create tenant → instance assignment logic

**Effort:** 1 week
**Priority:** P1 - Scalability

---

### HIGH-006: Webhook Signature Verification Incomplete

**Current State:**
- Stripe webhook handlers defined
- Zitadel webhook handlers defined
- **Missing:** Signature verification in implementations

**Impact:**
- Security vulnerability to spoofed webhooks
- Billing data integrity at risk
- User lifecycle events unreliable

**Evidence:**
```typescript
// From INTER_MODULE_CONTRACTS.md:
"// TODO: Implement signature verification
const signature = request.headers['zitadel-signature'];"
```

**Required Work:**
1. Implement Stripe signature verification
2. Implement Zitadel signature verification
3. Add replay attack prevention
4. Test webhook handling

**Effort:** 1-2 days
**Priority:** P1 - Security

---

## 🟡 Medium Priority Gaps

### MED-001: Rate Limiting Not Enforced by Plan

**Current State:**
- Kong config has rate limiting plugin
- **Missing:** Dynamic configuration by subscription tier
- **Missing:** Rate limit headers in responses

**Required Work:**
1. Implement plan-based rate limit configuration
2. Add consumption tracking
3. Return rate limit headers
4. Add quota exceeded messaging

---

### MED-002: mTLS Between Kong and Upstreams Not Configured

**Current State:**
- Kong → services communication is HTTP
- **Missing:** mTLS certificate configuration

**Impact:**
- Internal traffic not encrypted
- Service spoofing possible within VNet

---

### MED-003: Backup and Disaster Recovery Not Defined

**Current State:**
- No backup strategy documented
- **Missing:** Automated backups, point-in-time recovery

**Impact:**
- Data loss risk
- Compliance concerns for enterprise customers

---

### MED-004: Audit Logging Inconsistent

**Current State:**
- Audit events defined in contracts
- **Missing:** Consistent implementation across services

**Required Work:**
1. Implement audit log middleware
2. Centralize audit storage
3. Create audit log query API

---

### MED-005: CUE Schema Versioning Not Defined

**Current State:**
- StackKits uses CUE for validation
- **Missing:** Schema versioning strategy
- **Missing:** Migration path for existing specs

---

## 🟢 Low Priority Gaps

### LOW-001: Frontend Error Handling Inconsistent

- Standard error format defined but not universally implemented
- Some services return plain text errors

### LOW-002: Documentation Out of Sync

- Architecture docs exist but some reference old component names
- Code examples may be outdated

### LOW-003: Local Development Setup Complex

- Multiple services required for full stack
- Docker Compose setup incomplete

---

## Gap Closure Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] CRIT-003: Deploy Kong Gateway
- [ ] CRIT-001: Implement SSO exchange endpoint
- [ ] HIGH-006: Webhook signature verification
- [ ] HIGH-002: Health check endpoints

### Phase 2: Multi-Tenancy (Weeks 3-4)
- [ ] CRIT-002: Multi-tenancy data layer
- [ ] CRIT-004: Admin database alignment
- [ ] HIGH-001: Feature flag distribution

### Phase 3: Scale & Polish (Weeks 5-6)
- [ ] HIGH-005: Instance provisioning automation
- [ ] HIGH-003: StackKits API
- [ ] MED-001: Rate limiting enforcement

### Phase 4: Extended Features (Weeks 7-8)
- [ ] HIGH-004: KombiSim multi-tenancy
- [ ] MED-002: mTLS configuration
- [ ] MED-003: Backup strategy

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| SSO complexity delays launch | Medium | High | Start with simplified flow, iterate |
| PocketBase multi-tenancy limitations | Medium | High | Evaluate migration path to PostgreSQL |
| Kong performance bottlenecks | Low | Medium | Load testing before launch |
| Azure cost overruns | Medium | Medium | Set budgets, auto-scaling limits |

---

*See REFACTORING_PLANS.md for detailed implementation guidance*
