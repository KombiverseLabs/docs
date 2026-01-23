# kombifySphere - Consistency & Architecture Fit Audit

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-23  
> **Status:** ACTION REQUIRED  
> **Auditor:** Automated Analysis + Manual Review

---

## Executive Summary

This document identifies **inconsistencies, contradictions, and technical debt** found across the repositories that make up (or integrate with) **kombifySphere**. Each issue is classified by severity and includes recommended actions.

### Severity Levels

| Level | Icon | Description | Action Timeline |
|-------|------|-------------|-----------------|
| **Critical** | 🔴 | Blocking architecture / integration issue | Immediate (< 1 week) |
| **High** | 🟠 | Significant inconsistency affecting integration | Short-term (1-2 weeks) |
| **Medium** | 🟡 | Technical debt or naming mismatch | Medium-term (1 month) |
| **Low** | 🟢 | Minor inconsistency or documentation gap | Long-term (backlog) |

---

**Scope note:** This audit focuses on **structural/architectural fit** and cross-repo consistency. Security-specific findings are intentionally out of scope here.

## 1. Architectural Inconsistencies

### 🟠 ARCH-001: Database Technology Mismatch

**Issue:** Documentation states "Single PostgreSQL for Cloud + Admin" but Admin code still references PocketBase.

**Locations:**
- `kombiSphereDocs/KombiSphere_Architecture.md`: "Admin owns PostgreSQL"
- `KombiSphere-Admin/go.mod`: `github.com/pocketbase/pocketbase v0.34.2`

**Status:** Architecture decision made, implementation incomplete.

**Recommendation:**
1. Complete Admin migration from PocketBase to PostgreSQL
2. Or update documentation to reflect hybrid approach (PostgreSQL for tools, PocketBase for local state)
3. Clarify which tables remain in PocketBase vs. PostgreSQL

---

### 🟠 ARCH-002: SSO Flow Implementation Gap

**Issue:** SSO bridge documentation exists but implementation is incomplete.

**Evidence:**
- Architecture doc: "Kong-mediated SSO exchange" ✅ Designed
- KombiStack: `/api/internal/sso/exchange` endpoint missing or incomplete
- Status in docs: "80% complete"

**Recommendation:**
1. Complete KombiStack SSO exchange endpoint
2. Add integration tests for full SSO flow
3. Update status to 100% when complete

---

### 🟠 ARCH-003: Feature Flag Distribution Unclear

**Issue:** Feature flags defined in Admin, but distribution mechanism to KombiStack is not implemented.

**Evidence:**
- `INTER_MODULE_CONTRACTS.md`: Defines push endpoint
- KombiStack: No `/api/internal/feature-flags/apply` endpoint found

**Recommendation:**
1. Implement feature flag receiver in KombiStack
2. Create sync service in Admin to push flags
3. Document sync frequency and conflict resolution

---

### 🟡 ARCH-004: Inconsistent Service Naming

**Issue:** Service naming varies across repositories.

| Component | go.mod Module | Docker Image | API Path |
|-----------|---------------|--------------|----------|
| KombiStack | `github.com/Soulcreek/KombiStack` | `ghcr.io/soulcreek/kombistack` | `/v1/orchestrator` |
| KombiSim | `github.com/kombisphere/kombisim` | `kombisphere/kombisim` | `/v1/simulation` |
| Admin | `github.com/kombistack/kombisphere` | `kombisphere-admin` | `/api/v1` |

**Recommendation:**
1. Standardize GitHub organization naming (future): `kombify/*` for open-source tools, `kombifySphere/*` for SaaS (repo names can remain unchanged until migration)
2. Standardize Docker image naming (future): `kombify/{service}:tag` and/or `kombifysphere/{service}:tag`
3. Consider renaming `orchestrator` path to `stack` for consistency

---

### 🟡 ARCH-005: Port Allocation Conflicts

**Issue:** Port assignments are inconsistent across documentation.

| Service | docker-compose.yml | README.md | Architecture.md |
|---------|-------------------|-----------|-----------------|
| KombiStack Core | 5260 | 5260 | 8080 |
| KombiStack Frontend | 5261 | 5261 | - |
| Admin Backend | 8090 | 8090 | 8090 |
| Kong | 8000 | 8000 | 8000 |

**Recommendation:**
1. Audit all port references
2. Create canonical port map in one location
3. Use environment variables for all ports

---

## 2. API Contract Violations

### 🟠 API-001: Response Format Inconsistency

**Issue:** Different modules use different response formats.

**Cloud (TypeScript):**
```json
{ "data": {...}, "error": null }
```

**Admin (Go):**
```json
{ "result": {...}, "success": true }
```

**KombiStack (Go):**
```json
{ "items": [...], "totalItems": 100 }  // PocketBase format
```

**Recommendation:**
1. Define canonical response format in `INTER_MODULE_CONTRACTS.md`
2. Create response wrapper middleware in each service
3. Add contract tests to verify compliance

---

### 🟠 API-002: Error Code Mismatch

**Issue:** Error codes differ between modules.

| Error Type | Cloud | Admin | Documented |
|------------|-------|-------|------------|
| Unauthorized | `UNAUTHORIZED` | `auth_required` | `AUTH_REQUIRED` |
| Not Found | `NOT_FOUND` | `not_found` | `NOT_FOUND` |
| Validation | `VALIDATION_ERROR` | `invalid_input` | `VALIDATION_FAILED` |

**Recommendation:**
1. Define error code enum in shared specification
2. Update all modules to use consistent codes
3. Add linting/validation in CI

---

### 🟡 API-003: Missing API Versioning

**Issue:** KombiStack and KombiSim APIs don't include version prefix internally.

**Evidence:**
- Kong routes: `/v1/orchestrator/*` ✅
- KombiStack internal: `/api/stacks` (no version) ⚠️

**Recommendation:**
1. Add `/v1/` prefix to internal routes
2. Or document that Kong handles versioning

---

## 3. Naming & Convention Issues

### 🟡 NAME-001: Inconsistent Case Conventions

**Issue:** Mix of camelCase, snake_case, and kebab-case across projects.

| Context | KombiStack | KombiSim | Admin | Cloud |
|---------|------------|----------|-------|-------|
| API params | snake_case | snake_case | camelCase | camelCase |
| Database | snake_case | snake_case | snake_case | camelCase (Prisma) |
| Config files | camelCase | kebab-case | snake_case | camelCase |

**Recommendation:**
1. Define convention standard:
   - API parameters: `camelCase`
   - Database columns: `snake_case`
   - Config files: `camelCase`
2. Apply consistently across all repos

---

### 🟡 NAME-002: Inconsistent File Naming

**Issue:** Documentation files use different conventions.

| Pattern | Example | Repos Using |
|---------|---------|-------------|
| SCREAMING_SNAKE | `DECISION_LOG.md` | kombiSphereDocs |
| Title Case | `Architecture Overview.md` | None (good) |
| lowercase-kebab | `adding-service.md` | DocsnTools |
| UPPERCASE | `README.md`, `CONTRIBUTING.md` | All (standard) |

**Recommendation:**
1. Use `SCREAMING_SNAKE.md` for top-level docs (README, CONTRIBUTING, etc.)
2. Use `lowercase-kebab.md` for subdirectory docs
3. Update existing files for consistency

---

### 🟡 NAME-003: Module Import Path Inconsistency

**Issue:** Go module paths don't follow consistent organization.

| Repo | go.mod module |
|------|---------------|
| KombiStack | `github.com/Soulcreek/KombiStack` |
| KombiSim | `github.com/kombisphere/kombisim` |
| Admin | `github.com/kombistack/kombisphere` |
| StackKits | `github.com/kombihq/stackkits` |

**Recommendation:**
1. Standardize on `github.com/kombisphere/{repo}` for all
2. Update after finalizing GitHub organization

---

## 4. Technical Debt

### 🟡 DEBT-001: Duplicate Stripe Integration

**Issue:** Both Cloud and Admin have Stripe webhook handlers.

**Risk:** Duplicate processing of webhooks, potential race conditions.

**Recommendation:**
1. Designate single webhook handler (recommend Admin as canonical)
2. Cloud can call Admin API for billing data
3. Or use Stripe's webhook endpoint feature to route to single handler

---

### 🟡 DEBT-002: Embedded PocketBase in Multiple Services

**Issue:** Both KombiStack and Admin embed PocketBase, leading to:
- Different PocketBase versions
- Potential schema conflicts
- Increased binary sizes

**KombiStack:** `pocketbase v0.34.2`  
**Admin:** `pocketbase v0.34.2` (pinned, with replace directive)

**Recommendation:**
1. Complete Admin PostgreSQL migration (removes Admin's PocketBase)
2. KombiStack keeps PocketBase (product requirement)
3. Document version pinning strategy

---

### 🟡 DEBT-003: Missing Health Check Standardization

**Issue:** Health endpoints vary across services.

| Service | Health Endpoint | Response |
|---------|-----------------|----------|
| KombiStack | `/api/health` | `{"status":"ok"}` |
| KombiSim | `/health` | `{"healthy":true}` |
| Admin | `/health` | `{"status":"healthy"}` |
| Kong | `/health` | Kong-specific |

**Recommendation:**
1. Standardize on `/health` endpoint
2. Standard response: `{"status":"healthy","version":"1.0.0"}`
3. Add `/ready` for Kubernetes readiness probes

---

### 🟢 DEBT-004: Test Coverage Gaps

**Issue:** Test coverage varies significantly across repos.

| Repo | Unit Tests | Integration Tests | E2E Tests |
|------|------------|-------------------|-----------|
| KombiStack | ✅ Present | ✅ Present | ⚠️ Partial |
| KombiSim | ✅ Present | ⚠️ Partial | ❌ Missing |
| StackKits | ✅ Present | ✅ Present | N/A |
| Cloud | ✅ Present | ✅ Present | ✅ Present |
| Admin | ⚠️ Partial | ⚠️ Partial | ✅ Present |
| API | ⚠️ Config validation only | ❌ Missing | ❌ Missing |

**Recommendation:**
1. Add E2E tests for API Gateway
2. Increase Admin unit test coverage
3. Standardize test naming and structure

---

## 5. Documentation Gaps

### 🟡 DOC-001: Missing Installation Guide

**Issue:** No unified installation guide for full ecosystem.

**Recommendation:**
1. Create `INSTALLATION.md` in kombiSphereDocs
2. Cover: prerequisites, Docker Compose setup, manual setup
3. Include troubleshooting section

---

### 🟡 DOC-002: Outdated Status Indicators

**Issue:** Documentation contains stale completion percentages.

**Example from Architecture.md:**
```markdown
| **SSO Token Generation** | JWT tokens for core tools | ✅ 80% |
```

**Recommendation:**
1. Audit all status indicators monthly
2. Use simpler status: ✅ Complete | 🚧 In Progress | 🟡 Planned | ❌ Blocked
3. Link to GitHub issues for "In Progress" items

---

### 🟡 DOC-003: Missing Runbook for Operations

**Issue:** No operational runbook for production issues.

**Recommendation:**
1. Create `RUNBOOK.md` covering:
   - Service restart procedures
   - Database backup/restore
   - Secret rotation
   - Incident response
2. Include escalation contacts

---

## 6. Strategic Decisions Needed

### 🟠 DECISION-001: GitHub Organization Consolidation

**Question:** Should all repos move to a single GitHub organization?

**Current State:**
- `Soulcreek/KombiStack` (personal)
- `kombisphere/*` (some repos today; branding target is `kombify/*`)
- `kombihq/stackkits` (different org)
- Private repos (location unclear)

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| A: All to `kombify/` | Unified, brand-consistent | Migration effort |
| B: Keep separate | No migration needed | Confusing for contributors |
| C: Open-source to `kombify/`, SaaS to `kombifySphere/` (or private org) | Clear licensing + product split | Two orgs to manage |

**Recommendation:** Option C — Open source tools under `kombify/`, SaaS under `kombifySphere/` (or private org).

---

### 🟠 DECISION-002: PocketBase Future in Admin

**Question:** Should Admin complete PostgreSQL migration or keep PocketBase?

**Context:**
- Architecture docs say "single PostgreSQL"
- Admin code still uses PocketBase
- Tools catalog + AI evaluation would benefit from PostgreSQL (pgvector)

**Options:**
| Option | Effort | Benefits |
|--------|--------|----------|
| A: Complete migration | High (2-4 weeks) | Single database, pgvector, cleaner arch |
| B: Hybrid (Postgres + PocketBase) | Low | Keep working code, add Postgres for new features |
| C: Keep PocketBase only | None | No migration, but limits scalability |

**Recommendation:** Option A — Complete migration for cleaner architecture.

---

### 🟠 DECISION-003: Secrets Management Solution

**Question:** Which secrets management solution to adopt?

**Options:**
| Option | Cost | Complexity | Features |
|--------|------|------------|----------|
| Doppler | $0-18/mo | Low | Easy, good DX |
| Infisical | $0-8/mo | Low | Open-source option |
| HashiCorp Vault | Self-hosted | High | Enterprise features |
| AWS Secrets Manager | Pay-per-use | Medium | AWS-native |

**Recommendation:** Doppler (already documented in `DOPPLER_SECRETS_STRATEGY.md`). Proceed with implementation.

---

### 🟡 DECISION-004: Hosting Platform

**Question:** Where to host production infrastructure?

**Options:**
| Option | Cost/mo | Pros | Cons |
|--------|---------|------|------|
| Hetzner Cloud | ~$50-100 | Cost-effective, EU-based | Less managed services |
| Railway | ~$20-100 | Easy deployment | Vendor lock-in |
| Fly.io | ~$50-150 | Edge network, easy scale | New platform |
| AWS | ~$200-500 | Full ecosystem | Complex, expensive |

**Recommendation:** Hetzner Cloud for cost-effectiveness, with Cloudflare for CDN/edge.

---

## 7. Automation Recommendations

### CI/CD Documentation Generation

```yaml
# Example GitHub Action for docs generation
name: Generate Documentation
on:
  push:
    paths:
      - 'docs/**'
      - '**/*.md'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate Mermaid diagrams
        uses: mermaid-js/mermaid-cli@v2
        
      - name: Build documentation site
        run: |
          npm install -g mintlify
          mintlify build
          
      - name: Deploy to docs site
        uses: cloudflare/wrangler-action@v3
```

### Automated Consistency Checks

```yaml
# .github/workflows/consistency.yml
name: Consistency Check
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check API response formats
        run: ./scripts/check-api-contracts.sh
        
      - name: Validate port assignments
        run: ./scripts/check-ports.sh
```

### Recommended Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Mermaid.js** | Architecture diagrams | Markdown files |
| **Mintlify** | Documentation site | `/docs` repo |
| **Spectral** | OpenAPI linting | CI pipeline |

---

## 8. Next Steps Checklist

### Immediate (This Week)

- [ ] 🔴 Align on the SSO bridge flow (ARCH-002)
- [ ] 🔴 Publish a canonical port map and fix doc drift (ARCH-005)
- [ ] 🔴 Clarify data ownership (Postgres vs embedded PocketBase) (ARCH-001)

### Short-Term (Next 2 Weeks)

- [ ] 🟠 Complete SSO bridge implementation (ARCH-002)
- [ ] 🟠 Standardize API response formats (API-001)
- [ ] 🟠 Designate single Stripe webhook handler (DEBT-001)
- [ ] 🟠 Make decision on GitHub org consolidation (DECISION-001)

### Medium-Term (Next Month)

- [ ] 🟡 Complete Admin PostgreSQL migration (ARCH-001)
- [ ] 🟡 Standardize naming conventions (NAME-001, NAME-002)
- [ ] 🟡 Implement secrets management (DECISION-003)
- [ ] 🟡 Create unified installation guide (DOC-001)

### Long-Term (Backlog)

- [ ] 🟢 Increase test coverage across repos (DEBT-004)
- [ ] 🟢 Create operational runbook (DOC-003)
- [ ] 🟢 Set up automated documentation generation

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-01-23 | 1.0.0 | Initial consistency audit |

---

## Appendix: Audit Methodology

### Files Analyzed

| Repository | Files Reviewed |
|------------|----------------|
| KombiStack | README.md, go.mod, docker-compose.yml, DECISIONS.md |
| KombiSim | README.md, go.mod, docker-compose.yml |
| StackKits | README.md, go.mod, ADR/* |
| KombiSphere-Cloud | README.md, package.json, prisma/schema.prisma |
| KombiSphere-Admin | README.md, go.mod, docs/* |
| KombiSphere-API | README.md, kong/kong.yml, docs/* |
| kombiSphereDocs | All files |

### Tools Used

- Manual code review
- Grep pattern matching for inconsistencies
- Dependency analysis via go.mod/package.json
- Documentation cross-reference validation
