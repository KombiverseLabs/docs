# Repository-Level Architecture Plans

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Target:** kombify Multi-Repo Architecture

---

## Overview

This document provides detailed architecture plans for each repository in the kombify ecosystem, aligned with the target multi-tenant SaaS architecture.

---

## 1. KombiSphere-Cloud (SaaS Portal)

### Current State
- Next.js application with Prisma ORM
- PostgreSQL database for user/subscription data
- Zitadel integration for authentication
- Stripe integration for billing

### Target Architecture Changes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     KombiSphere-Cloud Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Next.js    │───▶│    Prisma    │───▶│  PostgreSQL  │              │
│  │   Frontend   │    │    Client    │    │   (Azure)    │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│         │                                                             │
│         │ External Services                                           │
│         ▼                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Zitadel    │    │    Stripe    │    │    Kong      │              │
│  │    (OIDC)    │    │   (Billing)  │    │  (Proxy to   │              │
│  │              │    │              │    │   Stack/Sim) │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Schema Additions

```prisma
// Add to existing schema.prisma

model Tenant {
  id                String   @id @default(uuid())
  slug              String   @unique
  name              String
  zitadelOrgId      String   @unique
  
  // Instance assignment
  instanceId        String?
  instance          KombiStackInstance? @relation(fields: [instanceId], references: [id])
  
  // Subscription
  plan              Plan     @default(FREE)
  subscriptionStatus String  @default(ACTIVE)
  
  // Limits
  maxUsers          Int      @default(5)
  maxNodes          Int      @default(3)
  
  // Relations
  users             User[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model User {
  // Existing fields...
  
  // Add tenant relation
  tenantId          String?
  tenant            Tenant?  @relation(fields: [tenantId], references: [id])
  
  // Homelab access
  isHomelabAdmin    Boolean  @default(true)
  homelabRole       String   @default("admin") // admin, member, viewer
}

model KombiStackInstance {
  id                String   @id @default(uuid())
  name              String
  region            String
  status            InstanceStatus @default(PROVISIONING)
  
  // Multi-tenancy
  maxTenants        Int      @default(50)
  currentTenants    Int      @default(0)
  deploymentMode    DeploymentMode @default(SHARED)
  
  // Networking
  internalEndpoint  String
  publicEndpoint    String?
  
  // Relations
  tenants           Tenant[]
  healthChecks      InstanceHealthCheck[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model InstanceHealthCheck {
  id                String   @id @default(uuid())
  instanceId        String
  instance          KombiStackInstance @relation(fields: [instanceId], references: [id])
  
  timestamp         DateTime @default(now())
  status            HealthStatus
  
  // Component status
  database          ComponentStatus
  api               ComponentStatus
  agents            ComponentStatus
  
  // Resource usage
  cpuPercent        Float?
  memoryPercent     Float?
  storagePercent    Float?
  
  @@index([instanceId, timestamp])
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

enum InstanceStatus {
  PROVISIONING
  ACTIVE
  SUSPENDED
  DECOMMISSIONING
}

enum DeploymentMode {
  SHARED      // Multi-tenant, 50 tenants max
  DEDICATED   // Single tenant, full resources
}

enum HealthStatus {
  HEALTHY
  DEGRADED
  UNHEALTHY
  UNKNOWN
}

enum ComponentStatus {
  OK
  ERROR
  TIMEOUT
}
```

### API Routes to Add

```typescript
// app/api/tenant/route.ts
// POST /api/tenant - Create new tenant
// GET /api/tenant - Get current user's tenant

// app/api/tenant/launch/route.ts
// POST /api/tenant/launch - Launch homelab (redirects to Stack)

// app/api/admin/instances/route.ts
// GET /api/admin/instances - List all Stack instances (admin only)
// POST /api/admin/instances - Provision new instance (admin only)

// app/api/admin/instances/[id]/health/route.ts
// GET /api/admin/instances/[id]/health - Get instance health
```

### Key Components to Implement

1. **TenantContext Provider**: React context for tenant information
2. **InstanceSelector**: UI for assigning tenants to instances
3. **LaunchButton**: Handles SSO exchange and Stack redirection
4. **HealthDashboard**: Real-time instance monitoring

---

## 2. KombiSphere-Admin (Admin Center)

### Current State
- Prisma schema comprehensive but implementation unclear
- May still reference PocketBase per CONSISTENCY_AUDIT

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    KombiSphere-Admin Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   SvelteKit  │───▶│    Prisma    │───▶│  PostgreSQL  │              │
│  │   Dashboard  │    │    Client    │    │   (Shared    │              │
│  │              │    │              │    │   with Cloud)│              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│         │                   │                                          │
│         │                   ▼                                          │
│         │            ┌──────────────┐                                  │
│         │            │  Tool Eval   │                                  │
│         │            │  AI Pipeline │                                  │
│         │            └──────────────┘                                  │
│         │                                                              │
│         ▼                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Azure ARM  │    │    Kong      │    │   Zitadel    │              │
│  │   (Provision)│    │  (Configure) │    │  (Manage)    │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Responsibilities

1. **Tool Catalog Management**
   - CRUD operations on tools, categories, versions
   - AI evaluation pipeline integration
   - Tool discovery and crawling

2. **Instance Lifecycle Management**
   - Provision new Stack/Sim instances via Azure ARM
   - Monitor instance health and capacity
   - Scale instances based on tenant load

3. **Platform Configuration**
   - Feature flag management
   - Rate limiting configuration
   - Kong route management

4. **User & Organization Administration**
   - View all users/tenants
   - Impersonation for support
   - Suspension/deletion workflows

### API Endpoints

```typescript
// Internal API (service-to-service)
// All routes under /api/internal/*

// User management
GET    /api/internal/users/:sub          // Get user by Zitadel sub
POST   /api/internal/users               // Create/update user
GET    /api/internal/users/:sub/tenants  // Get user's tenants

// Feature flags
GET    /api/internal/feature-flags?sub=&org=
POST   /api/internal/feature-flags/:sub  // Update user flags

// Instance management
GET    /api/internal/instances            // List all instances
POST   /api/internal/instances            // Create instance
GET    /api/internal/instances/:id/health
POST   /api/internal/instances/:id/scale

// Tool catalog
GET    /api/internal/tools               // List all tools
GET    /api/internal/tools/:id            // Get tool details
POST   /api/internal/tools/:id/evaluate   // Trigger AI evaluation

// Admin-only routes
GET    /api/admin/metrics/billing         // Billing dashboard data
GET    /api/admin/metrics/usage           // Platform usage stats
POST   /api/admin/users/:id/impersonate   // Support impersonation
```

---

## 3. KombiSphere-API (Kong Gateway)

### Current State
- Bicep templates for Azure deployment
- kong-config.yaml with service definitions
- Not yet deployed

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Kong Gateway Architecture                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  Azure Front │───▶│     Kong     │───▶│   Upstream   │              │
│  │    Door      │    │   Gateway    │    │   Services   │              │
│  │              │    │              │    │              │              │
│  └──────────────┘    └──────┬───────┘    └──────┬───────┘              │
│                             │                   │                       │
│                             ▼                   ▼                       │
│                    ┌──────────────┐    ┌──────────────┐                │
│                    │   Plugins    │    │   Services   │                │
│                    │  - JWT       │    │  - Admin     │                │
│                    │  - Rate      │    │  - Stack     │                │
│                    │    Limiting  │    │  - Sim       │                │
│                    │  - Transform │    │  - Sphere    │                │
│                    │  - CORS      │    │  - StackKits │                │
│                    └──────────────┘    └──────────────┘                │
│                                                                          │
│  Backend Services:                                                       │
│  - Azure Container Apps for Kong (2-5 replicas)                         │
│  - Azure Database for PostgreSQL (Kong config store)                    │
│  - Azure Cache for Redis (rate limiting)                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Enhanced Kong Configuration

```yaml
# kong-config.yaml - Production Multi-Tenant Configuration
_format_version: "3.0"
_transform: true

services:
  # Administration Service
  - name: administration
    url: http://${ADMIN_SERVICE_HOST}:${ADMIN_SERVICE_PORT}
    # ... existing config

  # KombiStack Service (Multi-Tenant)
  - name: kombistack
    url: http://${STACK_SERVICE_HOST}:${STACK_SERVICE_PORT}
    connect_timeout: 60000
    write_timeout: 120000
    read_timeout: 120000
    retries: 3
    tags:
      - production
      - kombistack
      - multi-tenant

  # KombiSim Service (Multi-Tenant)
  - name: kombisim
    url: http://${SIM_SERVICE_HOST}:${SIM_SERVICE_PORT}
    tags:
      - production
      - kombisim
      - multi-tenant

  # KombiSphere Portal
  - name: kombisphere
    url: http://${SPHERE_SERVICE_HOST}:${SPHERE_SERVICE_PORT}
    tags:
      - production
      - kombisphere

  # StackKits API
  - name: stackkits
    url: http://${STACKKITS_SERVICE_HOST}:${STACKKITS_SERVICE_PORT}
    tags:
      - production
      - stackkits

routes:
  # Admin routes (existing)
  - name: admin-routes
    service: administration
    paths:
      - /v1/admin
      - /v1/tools
      - /v1/catalog/internal
    strip_path: false

  # Public catalog (no auth)
  - name: catalog-public-routes
    service: administration
    paths:
      - /v1/catalog/public
    methods: [GET, OPTIONS]

  # KombiStack routes with tenant handling
  - name: kombistack-routes
    service: kombistack
    paths:
      - /v1/stacks
      - /v1/orchestrator
      - /v1/jobs
      - /v1/tenant
    strip_path: false
    preserve_host: false

  # KombiSim routes
  - name: kombisim-routes
    service: kombisim
    paths:
      - /v1/simulations
      - /v1/nodes
      - /v1/templates
    strip_path: false

  # KombiSphere routes
  - name: kombisphere-routes
    service: kombisphere
    paths:
      - /v1/portal
      - /api/internal/sso
      - /api/sso
    strip_path: false

  # StackKits routes
  - name: stackkits-routes
    service: stackkits
    paths:
      - /v1/stackkits
    strip_path: false

  # Health checks (public)
  - name: health-route
    service: kong-admin
    paths:
      - /health
    methods: [GET]

plugins:
  # Global CORS (existing)
  - name: cors
    config:
      origins:
        - "https://app.kombify.io"
        - "https://admin.kombify.io"
        - "https://api.kombify.io"
      methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
      headers:
        - Authorization
        - Content-Type
        - X-Request-ID
        - X-User-ID
        - X-User-Email
        - X-Tenant-ID
      credentials: true

  # Global request ID
  - name: correlation-id
    config:
      header_name: X-Request-ID
      generator: uuid
      echo_downstream: true

  # Global Prometheus metrics
  - name: prometheus
    config:
      per_consumer: true
      status_code_metrics: true
      latency_metrics: true

  # JWT validation for protected routes
  - name: jwt
    service: kombistack
    config:
      uri_param_names: []
      cookie_names: []
      key_claim_name: iss
      secret_is_base64: false
      claims_to_verify:
        - exp
        - iss
      maximum_expiration: 3600

  # Rate limiting by plan (advanced)
  - name: rate-limiting-advanced
    service: kombistack
    config:
      limit: [100, 500, 1000, 10000]  # free, pro, enterprise, admin
      window_size: [60, 60, 60, 60]
      window_type: sliding
      identifier: jwt_claim_plan
      redis_host: ${REDIS_HOST}
      redis_port: ${REDIS_PORT}
      redis_password: ${REDIS_PASSWORD}
      fault_tolerant: true

  # Request transformer - adds tenant context
  - name: request-transformer
    service: kombistack
    config:
      add:
        headers:
          - X-Forwarded-By:Kong
          - X-Service-Name:KombiStack
      replace:
        headers:
          - X-User-ID:$(jwt_claims.sub)
          - X-User-Email:$(jwt_claims.email)
          - X-User-Name:$(jwt_claims.name)
          - X-Org-ID:$(jwt_claims."urn:zitadel:iam:org:id")
          - X-User-Roles:$(jwt_claims."urn:zitadel:iam:org:project:roles")
          - X-Subscription-Plan:$(jwt_claims.plan)

  # Same plugins for kombisim, kombisphere, stackkits...
  # (omitted for brevity)

upstreams:
  - name: kombistack-upstream
    targets:
      - target: ${STACK_SERVICE_HOST}:${STACK_SERVICE_PORT}
        weight: 100
    healthchecks:
      active:
        http_path: /health
        timeout: 10
        interval: 30
        unhealthy:
          http_statuses: [429, 500, 502, 503]
          tcp_failures: 2
          timeouts: 2
          http_failures: 2
          interval: 10
        healthy:
          http_statuses: [200, 302]
          successes: 2
          interval: 10

  # Additional upstreams for sim, admin, sphere...
```

---

## 4. KombiStack (Core Platform)

### Current State
- Single-tenant: "1 Stack = 1 Homelab"
- Go + PocketBase + SvelteKit
- No multi-tenancy support

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     KombiStack Multi-Tenant Architecture                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Kong-Mediated SSO Layer                        │  │
│  │                                                                    │  │
│  │   POST /api/internal/sso/exchange                                  │  │
│  │   - Validates Kong headers                                         │  │
│  │   - Creates/updates tenant                                         │  │
│  │   - Creates PB user in namespace                                   │  │
│  │   - Returns auth token                                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   Tenant Resolution Middleware                     │  │
│  │                                                                    │  │
│  │   - Extracts X-Tenant-ID header                                    │  │
│  │   - Routes to correct namespace                                    │  │
│  │   - Validates tenant access                                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  PocketBase (Per-Tenant Namespaces)                │  │
│  │                                                                    │  │
│  │  Shared:               Tenant A:          Tenant B:               │  │
│  │  - _tenants            - users_a          - users_b               │  │
│  │  - _sso_mappings       - stacks_a         - stacks_b              │  │
│  │  - _instance_config    - nodes_a          - nodes_b               │  │
│  │                        - jobs_a           - jobs_b                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Core Services                                 │  │
│  │                                                                    │  │
│  │   - Unifier Engine (CUE validation)                               │  │
│  │   - Worker/Agent Management                                       │  │
│  │   - OpenTofu Runner                                               │  │
│  │   - Job Queue                                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Database Schema (PocketBase Collections)

```javascript
// Shared collections (exist once)

// _tenants - Tenant metadata
{
  "id": "string",
  "slug": "string (unique)",
  "name": "string",
  "zitadelOrgId": "string",
  "plan": "select: free|pro|enterprise",
  "maxUsers": "number",
  "maxNodes": "number",
  "status": "select: active|suspended|deleted",
  "created": "date",
  "updated": "date"
}

// _sso_mappings - Zitadel to tenant mapping
{
  "id": "string",
  "zitadelSub": "string (indexed)",
  "tenantId": "relation:_tenants",
  "pbUserId": "string",
  "isAdmin": "bool",
  "lastLogin": "date"
}

// _instance_config - Instance-wide settings
{
  "id": "string",
  "deploymentMode": "select: shared|dedicated",
  "maxTenants": "number",
  "features": "json"
}

// Per-tenant collections (created dynamically as {collection}_{tenant_slug})

// users_{slug} - Homelab members within tenant
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "select: admin|member|viewer",
  "ssoSub": "string",
  "ssoProvider": "string",
  "permissions": "json",
  "created": "date",
  "updated": "date"
}

// stacks_{slug} - Infrastructure stacks
{
  "id": "string",
  "name": "string",
  "ownerId": "relation:users_{slug}",
  "members": "json (array of user IDs)",
  "configuration": "json (kombination.yaml)",
  "status": "select: draft|active|error",
  "created": "date",
  "updated": "date"
}

// nodes_{slug} - Managed nodes
{
  "id": "string",
  "name": "string",
  "stackId": "relation:stacks_{slug}",
  "type": "select: vps|local",
  "resources": "json",
  "status": "select: online|offline|error",
  "lastSeen": "date"
}

// jobs_{slug} - Async jobs
{
  "id": "string",
  "type": "string",
  "status": "select: pending|running|completed|failed",
  "payload": "json",
  "result": "json",
  "created": "date",
  "started": "date",
  "completed": "date"
}
```

### Go Package Structure Additions

```
KombiStack/
├── cmd/kombistack/
│   └── main.go
├── pkg/
│   ├── api/                    # Existing
│   ├── core/                   # Existing
│   ├── grpcserver/             # Existing
│   ├── unifier/                # Existing
│   ├── tofu/                   # Existing
│   ├── jobs/                   # Existing
│   ├── auth/                   # Existing
│   └── tenant/                 # NEW: Multi-tenancy support
│       ├── middleware.go       # Tenant resolution middleware
│       ├── service.go          # Tenant CRUD operations
│       ├── namespace.go        # Collection namespace helpers
│       └── sso.go              # SSO exchange handler
├── internal/
│   ├── migrations/             # Existing + new tenant migrations
│   ├── orchestrator/           # Existing
│   └── pb/                     # PocketBase extensions
│       └── collections.go      # Dynamic collection management
└── app/                        # SvelteKit frontend
    └── src/
        ├── lib/
        │   ├── api.ts          # Existing
        │   └── tenant.ts       # NEW: Tenant context
        └── routes/
            ├── +layout.ts      # Tenant resolution
            └── tenant/
                └── [slug]/     # Tenant-scoped routes
                    └── +page.svelte
```

### Key Implementation Files

```go
// pkg/tenant/middleware.go
package tenant

import (
	"net/http"
	"strings"
	
	"github.com/labstack/echo/v5"
	"github.com/pocketbase/pocketbase"
)

// TenantMiddleware extracts tenant from request and sets context
func TenantMiddleware(app *pocketbase.PocketBase) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// Extract tenant from header
			tenantSlug := c.Request().Header.Get("X-Tenant-ID")
			if tenantSlug == "" {
				// Try to extract from path: /tenant/{slug}/...
				path := c.Request().URL.Path
				if strings.HasPrefix(path, "/tenant/") {
					parts := strings.Split(path, "/")
					if len(parts) >= 3 {
						tenantSlug = parts[2]
					}
				}
			}
			
			if tenantSlug == "" {
				return c.JSON(http.StatusBadRequest, map[string]string{
					"error": "Tenant ID required",
				})
			}
			
			// Validate tenant exists
			tenant, err := getTenantBySlug(app, tenantSlug)
			if err != nil {
				return c.JSON(http.StatusNotFound, map[string]string{
					"error": "Tenant not found",
				})
			}
			
			// Set tenant in context
			c.Set("tenant", tenant)
			c.Set("tenantSlug", tenantSlug)
			
			return next(c)
		}
	}
}

// GetCollectionName returns the namespaced collection name
func GetCollectionName(c echo.Context, baseName string) string {
	tenantSlug := c.Get("tenantSlug").(string)
	return fmt.Sprintf("%s_%s", baseName, tenantSlug)
}
```

```go
// pkg/tenant/sso.go
package tenant

import (
	"net/http"
	"time"
	
	"github.com/labstack/echo/v5"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/models"
)

// SSOExchangeRequest from Kong headers
type SSOExchangeRequest struct {
	ZitadelSub string `header:"X-User-ID"`
	Email      string `header:"X-User-Email"`
	Name       string `header:"X-User-Name"`
	OrgID      string `header:"X-Org-ID"`
	Plan       string `header:"X-Subscription-Plan"`
}

// SSOExchangeResponse with PB token
type SSOExchangeResponse struct {
	Token       string    `json:"token"`
	TenantID    string    `json:"tenantId"`
	TenantSlug  string    `json:"tenantSlug"`
	UserID      string    `json:"userId"`
	Email       string    `json:"email"`
	Role        string    `json:"role"`
	ExpiresAt   time.Time `json:"expiresAt"`
}

// HandleSSOExchange processes Kong-mediated SSO
func HandleSSOExchange(app *pocketbase.PocketBase) echo.HandlerFunc {
	return func(c echo.Context) error {
		var req SSOExchangeRequest
		if err := c.Bind(&req); err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Invalid request",
			})
		}
		
		// Find or create tenant
		tenant, err := findOrCreateTenant(app, req.OrgID, req.Plan)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to provision tenant",
			})
		}
		
		// Find or create user in tenant namespace
		user, err := findOrCreateUser(app, tenant, req)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to provision user",
			})
		}
		
		// Generate PB auth token
		token, expiresAt, err := generateAuthToken(app, user)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to generate token",
			})
		}
		
		// Record SSO mapping
		recordSSOMapping(app, req.ZitadelSub, tenant.ID, user.ID)
		
		return c.JSON(http.StatusOK, SSOExchangeResponse{
			Token:      token,
			TenantID:   tenant.ID,
			TenantSlug: tenant.Slug,
			UserID:     user.ID,
			Email:      user.Email,
			Role:       user.GetString("role"),
			ExpiresAt:  expiresAt,
		})
	}
}
```

---

## 5. KombiSim (Simulation Engine)

### Current State
- Single-tenant Docker-based simulation
- SQLite persistence
- No tenant isolation

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     KombiSim Multi-Tenant Architecture                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    API Layer (SvelteKit + Go)                      │  │
│  │                                                                    │  │
│  │  - Tenant-aware request routing                                   │  │
│  │  - Resource quota enforcement                                     │  │
│  │  - Simulation group isolation                                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   Simulation Orchestrator                          │  │
│  │                                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │ Tenant A │  │ Tenant B │  │ Tenant C │  │ Tenant D │          │  │
│  │  │ Group    │  │ Group    │  │ Group    │  │ Group    │          │  │
│  │  │          │  │          │  │          │  │          │          │  │
│  │  │ [Node 1] │  │ [Node 1] │  │ [Node 1] │  │ [Node 1] │          │  │
│  │  │ [Node 2] │  │ [Node 2] │  │          │  │ [Node 2] │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │  │
│  │                                                                    │  │
│  │  Isolation: Docker networks per tenant                            │  │
│  │  Naming: {tenant_slug}_{simulation_id}_{node_id}                  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Docker Engine                                   │  │
│  │                                                                    │  │
│  │  Network: kombisim_tenant_a_net                                   │  │
│  │  Network: kombisim_tenant_b_net                                   │  │
│  │  Container: tenant_a_sim1_node1                                   │  │
│  │  Container: tenant_b_sim1_node1                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tenant Isolation Strategy

1. **Network Isolation**: Each tenant gets a dedicated Docker network
2. **Naming Convention**: Container names prefixed with tenant slug
3. **Resource Quotas**: CPU/memory limits per tenant
4. **SSH Port Allocation**: Port ranges allocated per tenant (e.g., tenant A: 2222-2249, tenant B: 2250-2274)

### Database Schema

```sql
-- Shared tables
CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    max_simulations INTEGER DEFAULT 3,
    max_nodes_per_sim INTEGER DEFAULT 5,
    resource_quota_cpu REAL DEFAULT 4.0,
    resource_quota_memory_gb INTEGER DEFAULT 8,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-scoped tables (data isolation via tenant_id)
CREATE TABLE simulations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'stopped',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    simulation_id TEXT NOT NULL REFERENCES simulations(id),
    name TEXT NOT NULL,
    container_id TEXT,
    ssh_port INTEGER,
    status TEXT DEFAULT 'stopped',
    resources_cpu REAL,
    resources_memory TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for tenant isolation
CREATE INDEX idx_simulations_tenant ON simulations(tenant_id);
CREATE INDEX idx_nodes_tenant ON nodes(tenant_id);
```

---

## 6. StackKits (IaC Blueprints)

### Current State
- Git repository with CUE schemas
- CLI tool in Go
- No API layer

### Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     StackKits Distribution Architecture                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐          ┌──────────────────┐                    │
│  │   Git Repository │          │   Kong API       │                    │
│  │   (Source of     │          │   (SaaS Access)  │                    │
│  │    Truth)        │          │                  │                    │
│  │                  │          │  - /v1/stackkits │                    │
│  │  github.com/...  │          │  - Auth required │                    │
│  │                  │◄────────▶│  - Plan-based    │                    │
│  │  /kits/          │   sync   │    access        │                    │
│  │  /base/          │          │                  │                    │
│  │  /schemas/       │          │                  │                    │
│  └────────┬─────────┘          └────────┬─────────┘                    │
│           │                             │                                │
│           │                             │                                │
│  ┌────────▼─────────┐          ┌────────▼─────────┐                    │
│  │   CLI Tool       │          │   Admin Catalog  │                    │
│  │                  │          │   Sync           │                    │
│  │  $ stackkit init │          │                  │                    │
│  │    --source=git  │          │  Admin Center    │                    │
│  │    --kit=base    │          │  reads from API  │                    │
│  │                  │          │  or git          │                    │
│  └──────────────────┘          └──────────────────┘                    │
│                                                                          │
│  Unified CUE validation for both paths                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### API Service

```go
// cmd/stackkits-api/main.go
// Lightweight HTTP service for StackKits API

package main

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	
	// Middleware
	r.Use(corsMiddleware())
	r.Use(authMiddleware()) // Validate Kong headers
	r.use(planMiddleware()) // Check plan entitlement
	
	// Routes
	api := r.Group("/v1/stackkits")
	{
		api.GET("", listStackKits)
		api.GET("/:id", getStackKit)
		api.GET("/:id/download", downloadStackKit)
		api.POST("/:id/validate", validateSpec)
	}
	
	r.Run(":8080")
}

func listStackKits(c *gin.Context) {
	plan := c.GetString("plan") // From X-Subscription-Plan header
	
	kits, err := registry.ListKits(plan)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"kits": kits})
}

func downloadStackKit(c *gin.Context) {
	id := c.Param("id")
	plan := c.GetString("plan")
	
	// Check entitlement
	kit, err := registry.GetKit(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kit not found"})
		return
	}
	
	if !kit.IsAvailableForPlan(plan) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Plan upgrade required"})
		return
	}
	
	// Return tarball
	c.File(kit.TarballPath())
}
```

### Repository Structure

```
StackKits/
├── kits/                      # Blueprints
│   ├── base-homelab/
│   │   ├── stackfile.cue
│   │   ├── tofu/
│   │   └── README.md
│   ├── modern-homelab/
│   └── ha-homelab/
├── base/                      # CUE schemas
│   ├── stackkit.cue
│   ├── service.cue
│   └── validation.cue
├── api/                       # API service (NEW)
│   ├── main.go
│   ├── handlers.go
│   └── middleware.go
├── cmd/
│   ├── stackkit/              # CLI tool
│   │   └── main.go
│   └── stackkits-api/         # API server
│       └── main.go
├── internal/
│   ├── cue/                   # Validation
│   ├── registry/              # Kit registry
│   └── packager/              # Tarball creation
└── tests/
```

---

## Integration Summary

| From | To | Protocol | Purpose |
|------|-----|----------|---------|
| Cloud | Admin | HTTP + JWT | Platform data |
| Kong | Stack | HTTP + Headers | Tenant routing |
| Kong | Sim | HTTP + Headers | Simulation access |
| Kong | StackKits | HTTP + Headers | Kit download |
| Stack | PB | Internal | Data storage |
| Stack | StackKits | Git/HTTP | Blueprints |
| Admin | Azure | ARM API | Instance provisioning |
| Admin | Kong | HTTP | Route configuration |

---

*Next: See BIG_PICTURE_ARCHITECTURE.md for system-wide diagrams*
