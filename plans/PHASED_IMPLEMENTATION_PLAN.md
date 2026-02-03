# kombify Phased Implementation Plan

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Timeline:** 8-10 Weeks (Accelerated)

---

## Executive Summary

This document provides a detailed implementation roadmap for transitioning kombify from single-tenant to multi-tenant SaaS architecture. The plan is organized into 5 phases over 8-10 weeks, prioritizing critical path items for SaaS launch.

**Critical Path:**
1. Kong Gateway Deployment (Week 1)
2. SSO Exchange Implementation (Week 2)
3. Tenant Namespace Architecture (Weeks 3-4)
4. Integration Testing (Week 5)
5. Production Deployment (Week 6)

---

## Phase 1: Foundation (Week 1)

**Goal:** Deploy Kong Gateway and establish authentication infrastructure

### Day 1-2: Kong Gateway Deployment

**Repository:** `kombify/infrastructure/`

**Tasks:**
```bash
# Deploy Kong to Azure
$ cd infrastructure/bicep
$ az deployment group create \
    --resource-group kombify-prod \
    --template-file main.bicep \
    --parameters @deploy-params.json

# Verify deployment
$ az containerapp show \
    --name kong-gateway \
    --resource-group kombify-prod
```

**Deliverables:**
- [ ] Kong Gateway running on Azure Container Apps
- [ ] PostgreSQL backend for Kong
- [ ] Redis cache for rate limiting
- [ ] Front Door routing configured
- [ ] Health check endpoints responding

**Owner:** Platform Team
**Dependencies:** None

---

### Day 3-4: Zitadel Integration

**Repository:** `kombify/infrastructure/kong/`

**Tasks:**
```yaml
# Update kong-config.yaml with Zitadel JWKS
plugins:
  - name: jwt
    config:
      uri_param_names: []
      key_claim_name: iss
      claims_to_verify:
        - exp
        - iss
      # Zitadel JWKS endpoint
      rsa_public_key: |
        # Fetched from https://auth.kombify.io/oauth/v2/keys
```

**Deliverables:**
- [ ] JWT validation working
- [ ] Header transformation tested
- [ ] Rate limiting by plan configured
- [ ] CORS for portal domains

**Owner:** Platform Team
**Dependencies:** Kong deployed

---

### Day 5: Service Registration

**Tasks:**
- [ ] Register Admin service routes
- [ ] Register Cloud service routes
- [ ] Register Stack service routes (staging)
- [ ] Test end-to-end routing
- [ ] Document Kong admin URLs

**Testing:**
```bash
# Test JWT validation
curl -H "Authorization: Bearer $JWT" \
    https://api.kombify.io/v1/portal/health

# Verify headers
curl -H "Authorization: Bearer $JWT" \
    https://api.kombify.io/v1/admin/tools \
    -v  # Check X-User-* headers in logs
```

**Owner:** Platform Team
**Dependencies:** Kong configured

---

## Phase 2: SSO & Core Services (Weeks 2-3)

**Goal:** Implement SSO exchange and prepare core services

### Week 2, Day 1-2: KombiStack SSO Exchange

**Repository:** `KombiStack/`

**Tasks:**
```go
// pkg/tenant/sso.go - Implementation
// Create: POST /api/internal/sso/exchange

// 1. Accept Kong headers
// 2. Find/create tenant by X-Org-ID
// 3. Find/create user in tenant namespace
// 4. Generate PB auth token
// 5. Return token + redirect URL
```

**Deliverables:**
- [ ] SSO exchange endpoint implemented
- [ ] Tenant lookup by Zitadel org ID
- [ ] User provisioning in namespace
- [ ] Auth token generation
- [ ] Unit tests passing

**Owner:** Stack Team
**Dependencies:** Kong headers defined

---

### Week 2, Day 3-4: Tenant Middleware

**Repository:** `KombiStack/`

**Tasks:**
```go
// pkg/tenant/middleware.go
// - Extract X-Tenant-ID header
// - Validate tenant access
// - Set collection namespace context
```

**Database Migrations:**
```javascript
// Create _tenants collection
// Create _sso_mappings collection
```

**Deliverables:**
- [ ] Tenant middleware implemented
- [ ] Collection namespace helpers
- [ ] Shared collections created
- [ ] Middleware tests passing

**Owner:** Stack Team
**Dependencies:** SSO exchange

---

### Week 2, Day 5: Health Endpoints

**Repository:** `KombiStack/`, `KombiSim/`, `KombiSphere-Admin/`

**Tasks:**
```go
// GET /health - Health check
// GET /ready - Readiness probe

// Implement in all services:
// - KombiStack
// - KombiSim
// - Admin Center
```

**Deliverables:**
- [ ] Health endpoints in all services
- [ ] Kubernetes/ACA health probes configured
- [ ] Monitoring alerts set up

**Owner:** All Teams
**Dependencies:** None

---

### Week 3, Day 1-2: Cloud Tenant Provisioning

**Repository:** `KombiSphere-Cloud/`

**Tasks:**
```typescript
// app/api/tenant/route.ts
// POST /api/tenant - Create tenant
// - Find available instance
// - Create tenant record
// - Update instance tenant count
```

**Database:**
```prisma
// Add Tenant and KombiStackInstance models
// Run migration
```

**Deliverables:**
- [ ] Tenant creation API
- [ ] Instance assignment logic
- [ ] Capacity checking
- [ ] UI for tenant creation

**Owner:** Cloud Team
**Dependencies:** Admin database aligned

---

### Week 3, Day 3-4: Stack Launch Flow

**Repository:** `KombiSphere-Cloud/`

**Tasks:**
```typescript
// app/api/tenant/launch/route.ts
// POST /api/tenant/launch
// - Get user's tenant
// - Call Stack SSO exchange
// - Return redirect URL

// UI: "Launch My Homelab" button
```

**Deliverables:**
- [ ] Launch API endpoint
- [ ] UI integration
- [ ] End-to-end flow tested
- [ ] Error handling

**Owner:** Cloud Team
**Dependencies:** Stack SSO exchange

---

### Week 3, Day 5: Admin Database Migration

**Repository:** `KombiSphere-Admin/`

**Tasks:**
```prisma
// Align with Cloud schema
// Add KombiStackInstance model
// Add health check models
// Add tool catalog models
```

**Verification:**
- [ ] All PB collections migrated to Prisma
- [ ] Data integrity verified
- [ ] APIs updated
- [ ] Tests passing

**Owner:** Admin Team
**Dependencies:** None

---

## Phase 3: Multi-Tenancy (Weeks 4-5)

**Goal:** Enable namespace-based multi-tenancy in Stack

### Week 4, Day 1-2: Collection Migration

**Repository:** `KombiStack/`

**Tasks:**
```go
// Update all collection queries
// FROM: app.Dao().FindRecordsByExpr("users", ...)
// TO: app.Dao().FindRecordsByExpr(GetCollectionName(c, "users"), ...)

// Collections to migrate:
// - users -> users_{tenant}
// - stacks -> stacks_{tenant}
// - nodes -> nodes_{tenant}
// - jobs -> jobs_{tenant}
```

**Migration Script:**
```go
// internal/migrations/003_multi_tenancy.go
// 1. Create default tenant
// 2. Rename existing collections
// 3. Update foreign keys
```

**Deliverables:**
- [ ] All queries namespaced
- [ ] Migration script tested
- [ ] Backward compatibility (default tenant)

**Owner:** Stack Team
**Dependencies:** Tenant middleware

---

### Week 4, Day 3-4: Feature Flag Sync

**Repository:** `KombiSphere-Admin/`, `KombiStack/`

**Tasks:**
```typescript
// Admin: POST /api/internal/feature-flags/:sub
// Push feature flags to Stack instance
```

```go
// Stack: POST /api/internal/feature-flags/apply
// Receive and store feature flags per tenant
```

**Deliverables:**
- [ ] Feature flag API in Admin
- [ ] Feature flag receiver in Stack
- [ ] Sync mechanism
- [ ] UI for flag management

**Owner:** Admin + Stack Teams
**Dependencies:** Admin DB migrated

---

### Week 4, Day 5: Sim Tenant Isolation

**Repository:** `KombiSim/`

**Tasks:**
```go
// Add tenant_id to all models
// Create Docker networks per tenant
// Container naming: {tenant}_{sim}_{node}
```

**Deliverables:**
- [ ] Tenant column added
- [ ] Queries filtered by tenant
- [ ] Docker network isolation
- [ ] SSH port allocation per tenant

**Owner:** Sim Team
**Dependencies:** None

---

### Week 5, Day 1-2: Instance Provisioning API

**Repository:** `KombiSphere-Admin/`

**Tasks:**
```typescript
// app/api/admin/instances/route.ts
// POST /api/admin/instances
// - Deploy via Azure ARM
// - Create instance record
// - Poll until ready
```

**Deliverables:**
- [ ] Instance provisioning API
- [ ] Azure ARM integration
- [ ] Health polling
- [ ] Admin UI for instances

**Owner:** Admin Team
**Dependencies:** Admin DB migrated

---

### Week 5, Day 3-4: StackKits API

**Repository:** `StackKits/`

**Tasks:**
```go
// cmd/stackkits-api/main.go
// Create lightweight API service
// - /v1/stackkits (list)
// - /v1/stackkits/:id (get)
// - /v1/stackkits/:id/download
// - Plan-based access control
```

**Deliverables:**
- [ ] API service created
- [ ] Kong routes configured
- [ ] Plan entitlements enforced
- [ ] Integration tested

**Owner:** StackKits Team
**Dependencies:** None

---

### Week 5, Day 5: Integration Testing

**All Repositories**

**Test Scenarios:**
```bash
# 1. User registration → Tenant creation
curl -X POST https://app.kombify.io/api/auth/register
# Verify: Tenant created, instance assigned

# 2. SSO flow → Stack access
curl -X POST https://app.kombify.io/api/tenant/launch
# Verify: Redirects to Stack, authenticated

# 3. Multi-tenant isolation
curl -H "X-Tenant-ID: tenant-a" https://api.kombify.io/v1/stacks
# Verify: Only sees tenant-a data

# 4. Rate limiting
curl -H "Authorization: Bearer $FREE_JWT" \
    https://api.kombify.io/v1/stacks
# Verify: 100 req/min limit enforced

# 5. Feature flags
curl https://api.kombify.io/v1/portal/feature-flags
# Verify: Flags match user's plan
```

**Deliverables:**
- [ ] End-to-end tests passing
- [ ] Load tests completed
- [ ] Security scan clean
- [ ] Performance benchmarks met

**Owner:** QA + All Teams
**Dependencies:** All Phase 3 features

---

## Phase 4: Hardening (Week 6-7)

**Goal:** Security, performance, and operational readiness

### Week 6: Security & Compliance

**Tasks:**
- [ ] Webhook signature verification (Stripe, Zitadel)
- [ ] mTLS between Kong and upstreams
- [ ] Secret rotation automation
- [ ] Penetration testing
- [ ] Compliance audit (GDPR, SOC2 prep)

**Deliverables:**
- [ ] Security fixes implemented
- [ ] Audit logging complete
- [ ] Data retention policies
- [ ] Incident response plan

**Owner:** Security Team

---

### Week 7: Performance & Monitoring

**Tasks:**
- [ ] Database query optimization
- [ ] Kong caching configuration
- [ ] CDN setup for static assets
- [ ] Monitoring dashboards
- [ ] Alerting rules
- [ ] Runbook documentation

**Deliverables:**
- [ ] p95 latency < 200ms
- [ ] 99.9% uptime target
- [ ] Monitoring coverage 100%
- [ ] Alert fatigue eliminated

**Owner:** Platform + SRE Teams

---

## Phase 5: Production (Week 8+)

**Goal:** Production deployment and post-launch support

### Week 8: Production Deployment

**Deployment Sequence:**
```bash
# 1. Deploy Kong (if not already)
# 2. Deploy Admin Center updates
# 3. Deploy Cloud Portal updates
# 4. Deploy Stack instances (blue/green)
# 5. Deploy Sim updates
# 6. Deploy StackKits API
# 7. Update DNS/routing
# 8. Smoke tests
```

**Rollback Plan:**
- Database backups
- Feature flags for quick disable
- Hotfix deployment process

**Deliverables:**
- [ ] Production deployment complete
- [ ] Smoke tests passing
- [ ] Monitoring active
- [ ] On-call rotation ready

---

### Post-Launch (Ongoing)

**Week 9-10:**
- Bug fixes and stability
- Performance tuning
- User feedback integration
- Documentation updates

**Month 2+:**
- KombiSim multi-tenancy completion
- Advanced monitoring
- Cost optimization
- Feature enhancements

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SSO complexity | Medium | High | Start with simple flow, iterate |
| PB performance at scale | Medium | High | Monitor, plan migration to PostgreSQL |
| Kong latency | Low | Medium | Caching, connection pooling |
| Azure cost overruns | Medium | Medium | Budgets, auto-scaling limits |
| Team bandwidth | High | High | Prioritize critical path, defer nice-to-haves |

---

## Success Criteria

### Phase 1
- [ ] Kong responds to health checks
- [ ] JWT validation working
- [ ] All services registered

### Phase 2
- [ ] SSO exchange returns valid tokens
- [ ] Tenant creation creates namespace
- [ ] Stack launch redirects authenticated

### Phase 3
- [ ] Multi-tenant data isolation verified
- [ ] Feature flags sync correctly
- [ ] Instance provisioning creates resources

### Phase 4
- [ ] Security scan clean
- [ ] Performance targets met
- [ ] Monitoring complete

### Phase 5
- [ ] Production stable
- [ ] Users can onboard end-to-end
- [ ] Support processes working

---

## Resource Requirements

### Personnel
- 2 Backend Engineers (Stack, Sim)
- 1 Frontend Engineer (Cloud)
- 1 Platform Engineer (Kong, Azure)
- 0.5 DevOps Engineer (CI/CD, monitoring)
- 0.5 QA Engineer (testing)

### Infrastructure
- Azure Container Apps (Kong, Stack, Sim)
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Front Door
- Zitadel Cloud (existing)
- Stripe (existing)

---

*See REFACTORING_PLANS.md for detailed implementation guidance*
