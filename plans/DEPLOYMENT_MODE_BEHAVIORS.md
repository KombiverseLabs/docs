# Deployment Mode Behavioral Specification

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Purpose:** Define how `deploymentMode` drives behavioral differences across the codebase

---

## Overview

The kombify platform supports three deployment modes, each with distinct behavioral characteristics:

1. **Self-Hosted** (`self-hosted`): User runs on their own infrastructure
2. **SaaS Shared** (`saas-shared`): Multi-tenant SaaS (50 tenants max)
3. **SaaS Dedicated** (`saas-dedicated`): Single-tenant enterprise

The `deploymentMode` configuration MUST drive behavioral differences throughout the application - it cannot be a passive setting.

---

## Behavioral Matrix

| Feature | Self-Hosted | SaaS Shared | SaaS Dedicated |
|---------|-------------|-------------|----------------|
| **Authentication** | Local PB auth | Kong OIDC only | Kong OIDC only |
| **Multi-tenancy** | Disabled | Enabled (50 max) | Disabled (1 tenant) |
| **User Management** | Built-in registration | Zitadel SSO only | Zitadel SSO only |
| **API Gateway** | Optional Kong | Required Kong | Required Kong |
| **Billing** | None | Stripe integrated | Stripe integrated |
| **StackKits Access** | Git clone | API + Git | API + Git |
| **Support Level** | Community | Standard | Premium |
| **Custom Domain** | User configures | Subdomain only | Supported |
| **VPN/Private Endpoint** | Self-managed | Not available | Available |
| **Updates** | Manual | Auto-managed | Scheduled maintenance |
| **Resource Guarantees** | Best effort | Shared pool | Dedicated allocation |
| **Backup Strategy** | User responsibility | Platform managed | Platform managed |
| **Audit Logging** | Optional | Required | Required |
| **Rate Limiting** | None | Plan-based | Custom limits |

---

## Code-Level Implementation

### 1. Configuration Type

```go
// pkg/config/deployment.go
package config

import (
    "os"
    "strings"
)

type DeploymentMode string

const (
    ModeSelfHosted    DeploymentMode = "self-hosted"
    ModeSaaSShared    DeploymentMode = "saas-shared"
    ModeSaaSDedicated DeploymentMode = "saas-dedicated"
)

// DeploymentConfig holds mode-specific settings
type DeploymentConfig struct {
    Mode            DeploymentMode
    IsMultiTenant   bool
    RequireKongAuth bool
    AllowLocalAuth  bool
    IsBillingEnabled bool
    MaxTenants      int
    Features        DeploymentFeatures
}

type DeploymentFeatures struct {
    MultiTenancy      bool
    KongIntegration   bool
    StripeBilling     bool
    CustomDomains     bool
    PrivateEndpoints  bool
    AuditLogging      bool
    PlatformManaged   bool
}

// LoadDeploymentConfig reads from environment
func LoadDeploymentConfig() *DeploymentConfig {
    mode := DeploymentMode(os.Getenv("KOMBIFY_DEPLOYMENT_MODE"))
    if mode == "" {
        mode = ModeSelfHosted // Default
    }
    
    return &DeploymentConfig{
        Mode:             mode,
        IsMultiTenant:    mode == ModeSaaSShared,
        RequireKongAuth:  mode == ModeSaaSShared || mode == ModeSaaSDedicated,
        AllowLocalAuth:   mode == ModeSelfHosted,
        IsBillingEnabled: mode == ModeSaaSShared || mode == ModeSaaSDedicated,
        MaxTenants:       mode.MaxTenants(),
        Features:         mode.Features(),
    }
}

// MaxTenants returns tenant limit for mode
func (m DeploymentMode) MaxTenants() int {
    switch m {
    case ModeSaaSShared:
        return 50
    case ModeSaaSDedicated:
        return 1
    default:
        return 1
    }
}

// Features returns feature flags for mode
func (m DeploymentMode) Features() DeploymentFeatures {
    switch m {
    case ModeSelfHosted:
        return DeploymentFeatures{
            MultiTenancy:     false,
            KongIntegration:  false,
            StripeBilling:    false,
            CustomDomains:    true,
            PrivateEndpoints: true,
            AuditLogging:     false,
            PlatformManaged:  false,
        }
    case ModeSaaSShared:
        return DeploymentFeatures{
            MultiTenancy:     true,
            KongIntegration:  true,
            StripeBilling:    true,
            CustomDomains:    false,
            PrivateEndpoints: false,
            AuditLogging:     true,
            PlatformManaged:  true,
        }
    case ModeSaaSDedicated:
        return DeploymentFeatures{
            MultiTenancy:     false,
            KongIntegration:  true,
            StripeBilling:    true,
            CustomDomains:    true,
            PrivateEndpoints: true,
            AuditLogging:     true,
            PlatformManaged:  true,
        }
    default:
        return DeploymentFeatures{}
    }
}

// String returns string representation
func (m DeploymentMode) String() string {
    return string(m)
}
```

### 2. Authentication Middleware

```go
// pkg/auth/middleware.go
package auth

import (
    "net/http"
    "strings"
    
    "github.com/labstack/echo/v5"
    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/core"
)

// AuthMiddleware selects authentication strategy based on deployment mode
func AuthMiddleware(app *pocketbase.PocketBase, config *config.DeploymentConfig) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // Self-hosted: use standard PocketBase auth
            if config.AllowLocalAuth {
                return standardPBAuth(app, next)(c)
            }
            
            // SaaS: require Kong authentication
            if config.RequireKongAuth {
                return kongAuthMiddleware(next)(c)
            }
            
            return next(c)
        }
    }
}

// standardPBAuth uses PocketBase built-in authentication
func standardPBAuth(app *pocketbase.PocketBase, next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // Use PB's built-in auth middleware
        token := extractToken(c.Request())
        if token == "" {
            return c.JSON(http.StatusUnauthorized, map[string]string{
                "error": "Authentication required",
            })
        }
        
        // Validate with PB
        // ... PB auth logic
        
        return next(c)
    }
}

// kongAuthMiddleware validates Kong-forwarded headers
func kongAuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // Kong validates JWT and forwards claims as headers
        userID := c.Request().Header.Get("X-User-ID")
        if userID == "" {
            return c.JSON(http.StatusUnauthorized, map[string]string{
                "error": "Authentication required via Kong",
                "code": "KONG_AUTH_REQUIRED",
            })
        }
        
        // Extract all Kong headers
        c.Set("userID", userID)
        c.Set("userEmail", c.Request().Header.Get("X-User-Email"))
        c.Set("userName", c.Request().Header.Get("X-User-Name"))
        c.Set("orgID", c.Request().Header.Get("X-Org-ID"))
        c.Set("plan", c.Request().Header.Get("X-Subscription-Plan"))
        
        // For multi-tenant SaaS, extract tenant
        if c.Get("tenantSlug") == nil {
            c.Set("tenantSlug", c.Request().Header.Get("X-Tenant-ID"))
        }
        
        return next(c)
    }
}

func extractToken(r *http.Request) string {
    bearer := r.Header.Get("Authorization")
    if strings.HasPrefix(bearer, "Bearer ") {
        return bearer[7:]
    }
    return ""
}
```

### 3. User Registration Control

```go
// pkg/auth/registration.go
package auth

import (
    "net/http"
    
    "github.com/labstack/echo/v5"
    "github.com/pocketbase/pocketbase"
)

// RegistrationMiddleware controls user registration based on deployment mode
func RegistrationMiddleware(app *pocketbase.PocketBase, config *config.DeploymentConfig) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // Block registration if not allowed in this mode
            if !config.AllowLocalAuth && isRegistrationRequest(c) {
                return c.JSON(http.StatusForbidden, map[string]string{
                    "error": "Registration not available in this deployment mode",
                    "code": "REGISTRATION_DISABLED",
                    "redirect": "https://app.kombify.io/signup", // SaaS signup URL
                })
            }
            
            return next(c)
        }
    }
}

func isRegistrationRequest(c echo.Context) bool {
    return c.Request().Method == http.MethodPost && 
           (c.Request().URL.Path == "/api/users" || 
            c.Request().URL.Path == "/api/auth/register")
}
```

### 4. Multi-Tenancy Routing

```go
// pkg/tenant/middleware.go
package tenant

import (
    "net/http"
    "strings"
    
    "github.com/labstack/echo/v5"
    "github.com/pocketbase/pocketbase"
)

// Middleware handles tenant resolution based on deployment mode
func Middleware(app *pocketbase.PocketBase, config *config.DeploymentConfig) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // Self-hosted: single tenant, no routing needed
            if !config.Features.MultiTenancy {
                c.Set("tenantSlug", "default")
                return next(c)
            }
            
            // Multi-tenant SaaS: extract tenant from request
            tenantSlug := extractTenantSlug(c)
            if tenantSlug == "" {
                return c.JSON(http.StatusBadRequest, map[string]string{
                    "error": "Tenant ID required",
                    "code": "TENANT_REQUIRED",
                })
            }
            
            // Validate tenant exists
            if !tenantExists(app, tenantSlug) {
                return c.JSON(http.StatusNotFound, map[string]string{
                    "error": "Tenant not found",
                    "code": "TENANT_NOT_FOUND",
                })
            }
            
            c.Set("tenantSlug", tenantSlug)
            return next(c)
        }
    }
}

func extractTenantSlug(c echo.Context) string {
    // Priority 1: X-Tenant-ID header (from Kong)
    if slug := c.Request().Header.Get("X-Tenant-ID"); slug != "" {
        return slug
    }
    
    // Priority 2: URL path /tenant/{slug}/
    path := c.Request().URL.Path
    if strings.HasPrefix(path, "/tenant/") {
        parts := strings.Split(path, "/")
        if len(parts) >= 3 {
            return parts[2]
        }
    }
    
    // Priority 3: Query parameter
    if slug := c.QueryParam("tenant"); slug != "" {
        return slug
    }
    
    return ""
}

func tenantExists(app *pocketbase.PocketBase, slug string) bool {
    // Check _tenants collection
    record, err := app.Dao().FindFirstRecordByData("_tenants", "slug", slug)
    return err == nil && record != nil
}
```

---

## Configuration File Examples

### Self-Hosted Mode

```yaml
# /opt/kombify/config/kombistack.yaml
deployment:
  mode: self-hosted
  
auth:
  type: local
  allow_registration: true
  password_policy: 
    min_length: 8
    require_special: true
  
multi_tenancy:
  enabled: false

api:
  kong:
    enabled: false
  rate_limiting:
    enabled: false

stackkits:
  source: git
  repository: https://github.com/kombify/stackkits
  update_check: true
  auto_update: false

billing:
  enabled: false

notifications:
  email:
    smtp_host: user-configured
    smtp_port: 587

backup:
  strategy: user_responsibility
  schedule: "0 2 * * *"  # User configures cron
```

### SaaS Shared Mode

```yaml
# Environment-based config for Azure Container Apps
deployment:
  mode: saas-shared
  
auth:
  type: kong_oidc
  allow_registration: false
  zitadel:
    issuer: https://auth.kombify.io
    introspection_endpoint: https://auth.kombify.io/oauth/v2/introspect

multi_tenancy:
  enabled: true
  max_tenants: 50
  isolation: namespace
  provisioning: automatic

api:
  kong:
    enabled: true
    required_headers:
      - X-User-ID
      - X-User-Email
      - X-Org-ID
      - X-Tenant-ID
  rate_limiting:
    enabled: true
    by_plan: true

stackkits:
  source: api
  api_endpoint: https://api.kombify.io/v1/stackkits
  cache_ttl: 3600

billing:
  enabled: true
  provider: stripe
  webhook_secret: ${STRIPE_WEBHOOK_SECRET}

notifications:
  email:
    provider: sendgrid
    api_key: ${SENDGRID_API_KEY}
    from: noreply@kombify.io

backup:
  strategy: platform_managed
  retention_days: 30
  encryption: true

audit:
  enabled: true
  retention_days: 90
  log_admin_actions: true
```

### SaaS Dedicated Mode

```yaml
# Enterprise customer configuration
deployment:
  mode: saas-dedicated
  
auth:
  type: kong_oidc
  allow_registration: false
  zitadel:
    issuer: https://auth.kombify.io
    # Dedicated customers can use their own IdP
    custom_oidc: ${CUSTOM_IDP_CONFIG}

multi_tenancy:
  enabled: false
  tenant_id: ${TENANT_SLUG}

api:
  kong:
    enabled: true
  rate_limiting:
    enabled: true
    custom_limits:
      requests_per_minute: 10000
      burst: 1000

resources:
  dedicated: true
  guarantees:
    cpu: 4
    memory: 16Gi
    storage: 500Gi
  burstable: false

networking:
  private_endpoint: true
  custom_domain: ${CUSTOM_DOMAIN}
  ssl_cert: ${SSL_CERT_PATH}
  vpn_connection: ${VPN_CONFIG}

stackkits:
  source: api
  private_repository: true
  custom_kits: ${CUSTOM_KITS_PATH}

billing:
  enabled: true
  provider: stripe
  invoice_schedule: monthly
  dedicated_support: true

support:
  level: premium
  response_time_sla: 4h
  dedicated_channel: true

backup:
  strategy: platform_managed
  retention_days: 90
  point_in_time_recovery: true
  geo_redundant: true

audit:
  enabled: true
  retention_days: 365
  compliance_exports: true
  siem_integration: ${SIEM_ENDPOINT}
```

---

## Environment Variables

```bash
# Required for all modes
KOMBIFY_DEPLOYMENT_MODE=self-hosted|saas-shared|saas-dedicated
KOMBIFY_DATABASE_URL=...

# Required for SaaS modes
KONG_UPSTREAM_URL=http://localhost:8090
ZITADEL_ISSUER=https://auth.kombify.io
ZITADEL_CLIENT_ID=...
ZITADEL_CLIENT_SECRET=...

# Required for SaaS with billing
STRIPE_API_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Required for SaaS Dedicated
TENANT_SLUG=acme-corp
CUSTOM_DOMAIN=stack.acme.com

# Optional for all modes
KOMBIFY_LOG_LEVEL=info
KOMBIFY_METRICS_ENABLED=true
```

---

## Testing Deployment Modes

### Unit Tests

```go
// pkg/config/deployment_test.go

func TestDeploymentMode(t *testing.T) {
    tests := []struct {
        mode           DeploymentMode
        wantMultiTenant bool
        wantKongAuth    bool
        wantLocalAuth   bool
        maxTenants      int
    }{
        {
            mode:           ModeSelfHosted,
            wantMultiTenant: false,
            wantKongAuth:    false,
            wantLocalAuth:   true,
            maxTenants:      1,
        },
        {
            mode:           ModeSaaSShared,
            wantMultiTenant: true,
            wantKongAuth:    true,
            wantLocalAuth:   false,
            maxTenants:      50,
        },
        {
            mode:           ModeSaaSDedicated,
            wantMultiTenant: false,
            wantKongAuth:    true,
            wantLocalAuth:   false,
            maxTenants:      1,
        },
    }
    
    for _, tt := range tests {
        t.Run(string(tt.mode), func(t *testing.T) {
            config := &DeploymentConfig{
                Mode:            tt.mode,
                IsMultiTenant:   tt.mode.IsMultiTenant(),
                RequireKongAuth: tt.mode.RequireKongAuth(),
                AllowLocalAuth:  tt.mode.AllowLocalAuth(),
                MaxTenants:      tt.mode.MaxTenants(),
            }
            
            if config.IsMultiTenant != tt.wantMultiTenant {
                t.Errorf("IsMultiTenant = %v, want %v", config.IsMultiTenant, tt.wantMultiTenant)
            }
            if config.RequireKongAuth != tt.wantKongAuth {
                t.Errorf("RequireKongAuth = %v, want %v", config.RequireKongAuth, tt.wantKongAuth)
            }
            if config.AllowLocalAuth != tt.wantLocalAuth {
                t.Errorf("AllowLocalAuth = %v, want %v", config.AllowLocalAuth, tt.wantLocalAuth)
            }
            if config.MaxTenants != tt.maxTenants {
                t.Errorf("MaxTenants = %d, want %d", config.MaxTenants, tt.maxTenants)
            }
        })
    }
}
```

---

## Migration Between Modes

### Self-Hosted → SaaS

1. **Data Export**: Export PB collections
2. **Tenant Creation**: Create tenant in SaaS
3. **User Migration**: Map local users to Zitadel identities
4. **Data Import**: Import to namespaced collections
5. **DNS Cutover**: Update DNS to point to SaaS

### SaaS Shared → Dedicated

1. **Provision Instance**: Create dedicated infrastructure
2. **Tenant Migration**: Move tenant data to dedicated instance
3. **DNS Update**: Point tenant subdomain to dedicated instance
4. **Configuration**: Update to `saas-dedicated` mode

---

*See TARGET_ARCHITECTURE_DESIGN.md for architecture overview*