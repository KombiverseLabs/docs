# Architecture Review Comparison: Opus vs Roo

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Purpose:** Compare Claude Opus 4.5 review with Roo's planning documents and identify gaps

---

## Executive Summary

Both reviews identified the same **3 CRITICAL gaps**:
1. Multi-tenancy data layer not implemented
2. SSO bridge (Kong → Stack) doesn't exist
3. Instance scaling not designed

**Roo's plans** provide more detailed implementation guidance (code examples, specific file changes).  
**Opus review** provides better specific code evidence and identifies additional architectural concerns.

**Recommendation:** Merge Opus's additional findings into Roo's plans for a comprehensive implementation roadmap.

---

## Detailed Comparison Matrix

| Area | Opus Review | Roo Plans | Gap |
|------|-------------|-----------|-----|
| **Multi-tenancy Model** | Suggests `tenant_id` field approach | Namespace-based collections | ⚠️ Different approaches - need alignment |
| **SSO Exchange** | Identifies as missing, no implementation | Full implementation code provided | ✅ Roo more detailed |
| **Kong Plugins** | Identifies **OIDC plugin missing** | Focuses on JWT plugin | 🔴 Opus found critical gap |
| **Deployment Mode** | Emphasizes `DEPLOYMENT_MODE` toggle drives behavior | Has flag but less behavioral detail | 🟡 Opus adds nuance |
| **ADRs** | Recommends **5 specific ADRs** | Has 3 ADRs section | 🟡 Opus more comprehensive |
| **Code Evidence** | `grep` commands showing missing code | Implementation guidance | ✅ Both valuable |
| **KombiSim Context** | "Zero user context" - severity highlighted | Notes multi-tenancy needed | 🟡 Opus emphasizes more |
| **StackKits Service** | Routes to **non-existent service** | Proposes API service | ✅ Both identify gap |
| **Webhook Verification** | Specific grep showing incomplete | Notes as HIGH gap | 🟢 Aligned |
| **Instance Auto-scaling** | Notes design missing | Designs health monitoring | 🟡 Opus adds quota enforcement |
| **Data Residency** | GDPR/compliance mentioned | Not covered | 🔴 Opus adds requirement |
| **Timeline** | 10-week phased | 8-10 week accelerated | 🟢 Aligned |

---

## Critical Gaps from Opus to Add

### 🔴 CRITICAL: Kong OIDC Plugin Missing

**Opus Finding:**
> "Kong OIDC plugin is missing entirely"  
> "Currently only JWT validation planned"

**Impact:** Cannot perform SSO token exchange properly without OIDC plugin for session management.

**Required Addition to Plans:**
```yaml
# Add to kong-config.yaml
plugins:
  - name: oidc
    service: kombistack
    config:
      client_id: ${ZITADEL_CLIENT_ID}
      client_secret: ${ZITADEL_CLIENT_SECRET}
      discovery: https://auth.kombify.io/.well-known/openid-configuration
      introspection_endpoint: https://auth.kombify.io/oauth/v2/introspect
      redirect_uri: https://api.kombify.io/auth/callback
      logout_redirect_uri: https://app.kombify.io
      scope: openid email profile
      ssl_verify: true
```

**Files to Update:**
- [`plans/TARGET_ARCHITECTURE_DESIGN.md`](plans/TARGET_ARCHITECTURE_DESIGN.md:196) - Add OIDC plugin section
- [`internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md`](internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md:773) - Add OIDC configuration
- [`infrastructure/kong/kong-config.yaml`](infrastructure/kong/kong-config.yaml:1) - Add OIDC plugin config

---

### 🔴 CRITICAL: Tenant Quota Enforcement Missing

**Opus Finding:**
> "Tenant quota enforcement is not designed"  
> "No mechanism to prevent tenant from exceeding maxUsers, maxNodes"

**Current State:** My plans define quotas in schema but don't specify enforcement mechanism.

**Required Addition:**
```go
// pkg/tenant/quota.go - NEW FILE
package tenant

type QuotaManager struct {
    app *pocketbase.PocketBase
}

func (qm *QuotaManager) CheckQuota(tenantSlug string, resource string, increment int) error {
    tenant, err := getTenantBySlug(qm.app, tenantSlug)
    if err != nil {
        return err
    }
    
    switch resource {
    case "users":
        current := qm.countUsers(tenantSlug)
        if current+increment > tenant.MaxUsers {
            return fmt.Errorf("user quota exceeded: %d/%d", current, tenant.MaxUsers)
        }
    case "nodes":
        current := qm.countNodes(tenantSlug)
        if current+increment > tenant.MaxNodes {
            return fmt.Errorf("node quota exceeded: %d/%d", current, tenant.MaxNodes)
        }
    }
    return nil
}

// Middleware to enforce quotas on create operations
func QuotaMiddleware(app *pocketbase.PocketBase) echo.MiddlewareFunc {
    qm := &QuotaManager{app: app}
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            if c.Request().Method == "POST" {
                tenantSlug := c.Get("tenantSlug").(string)
                resource := extractResourceFromPath(c.Request().URL.Path)
                
                if err := qm.CheckQuota(tenantSlug, resource, 1); err != nil {
                    return c.JSON(http.StatusForbidden, map[string]string{
                        "error": err.Error(),
                        "code": "QUOTA_EXCEEDED",
                    })
                }
            }
            return next(c)
        }
    }
}
```

**Files to Update:**
- [`plans/REPO_ARCHITECTURE_PLANS.md`](plans/REPO_ARCHITECTURE_PLANS.md:671) - Add quota management section
- [`plans/REFACTORING_PLANS.md`](plans/REFACTORING_PLANS.md:29) - Add quota enforcement to Task 1.1

---

### 🟡 HIGH: Deployment Mode Behavioral Differences

**Opus Finding:**
> "The `DEPLOYMENT_MODE` toggle exists in config but doesn't drive behavioral differences"  
> "Need clear branching logic: self-hosted vs SaaS"

**My Plans:** Have `deploymentMode` field but insufficient detail on behavioral differences.

**Required Addition:**
```go
// pkg/config/deployment.go - NEW FILE
package config

type DeploymentMode string

const (
    ModeSelfHosted DeploymentMode = "self-hosted"
    ModeSaaS       DeploymentMode = "saas"
)

type DeploymentConfig struct {
    Mode DeploymentMode
    
    // Mode-specific settings
    SelfHosted SelfHostedConfig
    SaaS       SaaSConfig
}

func (dc *DeploymentConfig) IsMultiTenant() bool {
    return dc.Mode == ModeSaaS
}

func (dc *DeploymentConfig) RequireKongAuth() bool {
    return dc.Mode == ModeSaaS
}

func (dc *DeploymentConfig) AllowLocalAuth() bool {
    return dc.Mode == ModeSelfHosted
}

// Behavior matrix
type FeatureMatrix struct {
    Feature           string
    SelfHosted        bool
    SaaSShared        bool
    SaaSDedicated     bool
}

var FeatureSupport = []FeatureMatrix{
    {"local_auth", true, false, false},
    {"kong_sso", false, true, true},
    {"multi_tenant", false, true, true},
    {"tenant_isolation", false, true, true},
    {"instance_scaling", false, true, false},
    {"custom_domain", true, false, true},
    {"api_keys", true, true, true},
}
```

**Behavioral Differences Table:**

| Feature | Self-Hosted | SaaS Shared | SaaS Dedicated |
|---------|-------------|-------------|----------------|
| Authentication | Local PB auth | Kong SSO only | Kong SSO only |
| User Management | Single tenant | Multi-tenant | Single tenant |
| Instance Sharing | N/A | 50 tenants max | 1 tenant only |
| Resource Limits | Config file | Quota enforced | Custom limits |
| StackKits Access | Git clone | API + Git | API + Git |
| Billing | None | Stripe integrated | Stripe integrated |
| Support Level | Community | Standard | Premium |

**Files to Update:**
- [`plans/TARGET_ARCHITECTURE_DESIGN.md`](plans/TARGET_ARCHITECTURE_DESIGN.md:486) - Expand deployment modes section
- Add new file: `plans/DEPLOYMENT_MODE_BEHAVIORS.md`

---

### 🟡 HIGH: KombiSim "Zero User Context"

**Opus Finding:**
> "KombiSim has zero user context - only API key auth"  
> "Simulations are completely isolated from identity layer"

**Impact:** Cannot attribute simulation usage to tenants for billing/quotas.

**Required Addition:**
```go
// KombiSim tenant context middleware
// middleware/tenant.go

func TenantContextMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Extract tenant from Kong headers
        tenantSlug := c.GetHeader("X-Tenant-ID")
        if tenantSlug == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "Tenant context required"})
            return
        }
        
        // Validate tenant exists
        tenant, err := validateTenant(tenantSlug)
        if err != nil {
            c.AbortWithStatusJSON(403, gin.H{"error": "Invalid tenant"})
            return
        }
        
        // Check simulation quota
        activeSims := countActiveSimulations(tenantSlug)
        if activeSims >= tenant.MaxSimulations {
            c.AbortWithStatusJSON(429, gin.H{
                "error": "Simulation quota exceeded",
                "active": activeSims,
                "limit": tenant.MaxSimulations,
            })
            return
        }
        
        c.Set("tenant", tenant)
        c.Next()
    }
}

// Add tenant_id to all database operations
// models/simulation.go

type Simulation struct {
    ID        string    `json:"id" db:"id"`
    TenantID  string    `json:"tenant_id" db:"tenant_id"`  // NEW
    Name      string    `json:"name" db:"name"`
    Status    string    `json:"status" db:"status"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// All queries must filter by tenant_id
func ListSimulations(tenantID string) ([]Simulation, error) {
    return db.Query("SELECT * FROM simulations WHERE tenant_id = ?", tenantID)
}
```

**Files to Update:**
- [`plans/REPO_ARCHITECTURE_PLANS.md`](plans/REPO_ARCHITECTURE_PLANS.md:853) - Expand KombiSim section with user context

---

### 🟡 HIGH: StackKits Kong Routes to Non-Existent Service

**Opus Finding:**
> "StackKits has Kong routes configured but no actual service implementation"  
> "The service 'stackkits' is referenced but doesn't exist"

**My Plans:** Proposed API service but didn't explicitly note the gap.

**Required Addition:**
```yaml
# Current (broken) kong-config.yaml:
services:
  - name: stackkits
    url: http://${STACKKITS_SERVICE_HOST}:${STACKKITS_SERVICE_PORT}  # These vars don't exist

# Required: Create StackKits API service first
cmd/stackkits-api/main.go  # NEW FILE

# Then update Kong config:
services:
  - name: stackkits
    url: http://stackkits-api.kombify.svc.cluster.local:8080
```

**Implementation Order:**
1. Build StackKits API service (`cmd/stackkits-api/`)
2. Deploy to Azure Container Apps
3. Update Kong configuration with actual service URL
4. Test end-to-end

**Files to Update:**
- [`plans/PHASED_IMPLEMENTATION_PLAN.md`](plans/PHASED_IMPLEMENTATION_PLAN.md:390) - Move StackKits API earlier in timeline
- [`plans/GAP_ANALYSIS.md`](plans/GAP_ANALYSIS.md:201) - Mark as CRITICAL, not HIGH

---

### 🟡 MEDIUM: Additional ADRs Needed

**Opus Recommends:** 5 ADRs
1. ADR-001: Namespace-based multi-tenancy (✅ I have this)
2. ADR-002: Hybrid StackKits distribution (✅ I have this)
3. ADR-003: Kong-mediated SSO (✅ I have this as ADR-003)
4. **ADR-004: Instance scaling strategy** (❌ Missing)
5. **ADR-005: Database per tenant vs shared** (❌ Missing)

**Required Addition:**

```markdown
## ADR-004: Instance Scaling Strategy

### Status: Proposed

### Context
Need to decide how to scale Stack instances as tenant count grows.

### Options Considered
1. **Vertical Scaling**: Increase container resources
   - Pros: Simple
   - Cons: Limited by single-node max, no isolation

2. **Horizontal Sharding**: Multiple shared instances
   - Pros: Good isolation, cost-effective
   - Cons: Complex routing

3. **Dedicated Instances**: One tenant per instance
   - Pros: Maximum isolation
   - Cons: Expensive for small tenants

### Decision
Implement **horizontal sharding with dedicated option**:
- Default: Shared instances (50 tenants max)
- Enterprise: Dedicated instances
- Auto-sharding when shared instance reaches 45 tenants

### Consequences
- Need instance selection algorithm
- Need tenant migration capability
- Higher operational complexity

---

## ADR-005: Database Strategy per Tenant

### Status: Proposed

### Context
How to isolate tenant data in PocketBase.

### Options Considered
1. **Database per tenant**: Separate SQLite files
   - Pros: Complete isolation
   - Cons: Resource overhead, backup complexity

2. **Schema per tenant**: PostgreSQL schemas
   - Pros: Good isolation, shared resources
   - Cons: Requires PostgreSQL migration

3. **Namespace prefix**: Collection name prefixes
   - Pros: Simple, works with PocketBase
   - Cons: Shared connection pool

### Decision
Use **namespace prefix** (Option 3) for v1:
- Collections named `{table}_{tenant_slug}`
- Migrate to PostgreSQL schemas in v2

### Consequences
- Must update all queries to use namespaced names
- Middleware must inject tenant context
- Backup strategy must filter by prefix
```

**Files to Update:**
- [`plans/TARGET_ARCHITECTURE_DESIGN.md`](plans/TARGET_ARCHITECTURE_DESIGN.md:545) - Add ADR-004 and ADR-005

---

### 🟢 LOW: Specific Code Evidence

**Opus Provides:**
```bash
# Evidence that SSO doesn't exist
grep -r "sso" pkg/ cmd/ internal/
# Returns: 0 matches

# Evidence that multi-tenancy doesn't exist
grep -r "tenant_id" internal/
# Returns: schema only, no implementation

# Evidence that Kong integration doesn't exist
grep -r "X-User" pkg/
# Returns: 0 matches
```

**Value:** These commands verify implementation status.

**Recommendation:** Add verification commands to implementation plan for each phase.

---

## Implementation Priority Updates

Based on Opus findings, reprioritize these items:

| Priority | Item | Original Priority | Reason |
|----------|------|-------------------|--------|
| **P0** | Kong OIDC Plugin | Not in plan | Required for SSO flow |
| **P0** | StackKits API Service | P2 (Week 5) | Kong routes reference non-existent service |
| **P0** | Tenant Quota Enforcement | Not in plan | Required for SaaS viability |
| **P1** | Deployment Mode Behaviors | P2 | Drives architectural decisions |
| **P1** | KombiSim User Context | P2 | Required for billing/quotas |
| **P1** | ADR-004, ADR-005 | Not in plan | Lock in scaling decisions |
| **P2** | Data Residency Compliance | Not in plan | GDPR requirements |

---

## File-by-File Update Recommendations

### 1. [`plans/TARGET_ARCHITECTURE_DESIGN.md`](plans/TARGET_ARCHITECTURE_DESIGN.md)
**Add:**
- Section 3.4: Kong OIDC Plugin Configuration
- Expand Section 6.1 with behavioral matrix
- ADR-004: Instance Scaling Strategy
- ADR-005: Database Strategy per Tenant

### 2. [`plans/GAP_ANALYSIS.md`](plans/GAP_ANALYSIS.md)
**Add:**
- CRIT-005: Kong OIDC Plugin Missing
- CRIT-006: Tenant Quota Enforcement Missing
- Update HIGH-003 to CRITICAL: StackKits Service Gap

### 3. [`plans/REFACTORING_PLANS.md`](plans/REFACTORING_PLANS.md)
**Add:**
- Task 1.5: Implement Quota Management
- Update Task 1.2 to include OIDC validation

### 4. [`plans/REPO_ARCHITECTURE_PLANS.md`](plans/REPO_ARCHITECTURE_PLANS.md)
**Add:**
- Expand Section 4 with quota manager
- Expand Section 5 with tenant context middleware
- Add deployment mode behavior matrix

### 5. [`plans/PHASED_IMPLEMENTATION_PLAN.md`](plans/PHASED_IMPLEMENTATION_PLAN.md)
**Update:**
- Week 1: Add OIDC plugin deployment
- Move StackKits API to Week 2 (was Week 5)
- Add verification commands after each phase

### 6. [`internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md`](internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md)
**Add:**
- OIDC plugin configuration section
- Client credential setup for Zitadel

### 7. [`infrastructure/kong/kong-config.yaml`](infrastructure/kong/kong-config.yaml)
**Add:**
- OIDC plugin configuration
- StackKits service (commented until implemented)

---

## Consolidated Critical Path (Updated)

```
Week 1: Kong Foundation
├── Deploy Kong Gateway
├── Configure JWT plugin
├── CONFIGURE OIDC PLUGIN (NEW - P0)
└── Deploy Redis for rate limiting

Week 2: Core Services
├── Implement SSO Exchange endpoint
├── Implement Tenant middleware
├── BUILD STACKKITS API (MOVED - P0)
└── Health endpoints

Week 3: Multi-Tenancy
├── Tenant provisioning API
├── IMPLEMENT QUOTA ENFORCEMENT (NEW - P0)
├── Collection migration
└── Feature flag sync

Week 4: Integration
├── KombiSim tenant context
├── Deployment mode behaviors
└── End-to-end testing
```

---

## Summary of Required Actions

1. **Immediate (This Week):**
   - Add OIDC plugin to Kong configuration
   - Create StackKits API service skeleton
   - Implement quota management middleware

2. **Short Term (Next 2 Weeks):**
   - Update all plans with Opus findings
   - Create ADR-004 and ADR-005
   - Implement deployment mode behaviors

3. **Medium Term (Month 1):**
   - Full StackKits API implementation
   - KombiSim tenant context
   - Data residency compliance design

4. **Documentation:**
   - Merge Opus evidence into Roo's detailed plans
   - Create consolidated implementation guide
   - Add verification commands to each phase

---

*Generated by comparing ../kombify/ARCHITECTURE_REVIEW_OPUS.md with plans/*