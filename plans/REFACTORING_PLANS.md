# kombify Refactoring Plans

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Scope:** Per-Repository Implementation Guide

---

## Overview

This document provides detailed refactoring plans for each repository to transition from the current single-tenant architecture to the target multi-tenant SaaS architecture.

---

## 1. KombiStack Refactoring

### Current State
- Single-tenant: "1 Stack = 1 Homelab"
- Flat PocketBase collections
- No SSO exchange endpoint

### Target State
- Multi-tenant: Up to 50 tenants per instance
- Namespace-based collection isolation
- Kong-mediated SSO exchange

### Refactoring Tasks

#### Task 1.1: Create Tenant Package

**Location:** `pkg/tenant/`

**Files to Create:**
```
pkg/tenant/
├── middleware.go          # Tenant resolution from headers
├── service.go             # Tenant CRUD operations
├── namespace.go           # Collection name helpers
├── sso.go                 # SSO exchange handler
└── tenant_test.go         # Unit tests
```

**Key Code Changes:**

```go
// pkg/tenant/middleware.go
package tenant

type TenantContext struct {
    ID       string
    Slug     string
    Plan     string
    MaxUsers int
}

func Middleware(app *pocketbase.PocketBase) echo.MiddlewareFunc {
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            tenantSlug := extractTenantSlug(c)
            tenant, err := getTenant(app, tenantSlug)
            if err != nil {
                return c.JSON(404, map[string]string{"error": "Tenant not found"})
            }
            c.Set("tenant", tenant)
            return next(c)
        }
    }
}

func GetCollectionName(c echo.Context, base string) string {
    tenant := c.Get("tenant").(*TenantContext)
    return fmt.Sprintf("%s_%s", base, tenant.Slug)
}
```

**Estimated Effort:** 2-3 days
**Dependencies:** None

---

#### Task 1.2: Implement SSO Exchange Endpoint

**Location:** New endpoint `POST /api/internal/sso/exchange`

**Files to Modify:**
- `pkg/api/server.go` - Add route
- `pkg/tenant/sso.go` - Implement handler (from Task 1.1)

**Code Implementation:**

```go
// pkg/api/server.go
func (s *Server) setupRoutes() {
    // ... existing routes
    
    // SSO exchange (internal, Kong-only)
    s.e.POST("/api/internal/sso/exchange", 
        tenant.HandleSSOExchange(s.app))
}
```

**Database Migrations:**
```javascript
// New collections to create
{
  "name": "_tenants",
  "fields": [
    { "name": "slug", "type": "text", "required": true, "unique": true },
    { "name": "name", "type": "text", "required": true },
    { "name": "zitadelOrgId", "type": "text", "required": true, "unique": true },
    { "name": "plan", "type": "select", "options": { "values": ["free", "pro", "enterprise"] } },
    { "name": "maxUsers", "type": "number", "default": 5 },
    { "name": "maxNodes", "type": "number", "default": 3 },
    { "name": "status", "type": "select", "options": { "values": ["active", "suspended", "deleted"] } }
  ]
}

{
  "name": "_sso_mappings",
  "fields": [
    { "name": "zitadelSub", "type": "text", "required": true, "indexed": true },
    { "name": "tenantId", "type": "relation", "options": { "collectionId": "_tenants" } },
    { "name": "pbUserId", "type": "text", "required": true },
    { "name": "isAdmin", "type": "bool", "default": true },
    { "name": "lastLogin", "type": "date" }
  ]
}
```

**Testing:**
- Unit tests for SSO exchange
- Integration test with mock Kong headers
- End-to-end test via Kong

**Estimated Effort:** 3-4 days
**Dependencies:** Task 1.1

---

#### Task 1.3: Migrate Existing Collections to Namespace Pattern

**Location:** All collection queries

**Files to Modify:**
- `pkg/core/*.go` - Update collection names
- `pkg/orchestrator/*.go` - Update collection names
- `internal/migrations/*.go` - Add namespace support

**Refactoring Pattern:**

```go
// BEFORE (single-tenant)
records, err := app.Dao().FindRecordsByExpr("users", 
    dbx.HashExp{"email": email})

// AFTER (multi-tenant)
collectionName := tenant.GetCollectionName(c, "users")
records, err := app.Dao().FindRecordsByExpr(collectionName, 
    dbx.HashExp{"email": email})
```

**Migration Script:**
```go
// internal/migrations/003_add_multi_tenancy.go
func init() {
    migrations.Register(func(db dbx.Builder) error {
        // Create default tenant for existing data
        // Rename existing collections to default tenant namespace
        // e.g., "users" -> "users_default"
        return nil
    }, func(db dbx.Builder) error {
        // Rollback
        return nil
    })
}
```

**Estimated Effort:** 2-3 days
**Dependencies:** Task 1.1

---

#### Task 1.4: Add Health Check Endpoints

**Location:** `pkg/api/health.go`

**Implementation:**

```go
// pkg/api/health.go
package api

import (
    "net/http"
    "github.com/labstack/echo/v5"
)

type HealthResponse struct {
    Status    string            `json:"status"`
    Version   string            `json:"version"`
    Timestamp string            `json:"timestamp"`
    Checks    HealthChecks      `json:"checks"`
}

type HealthChecks struct {
    Database string `json:"database"`
    Storage  string `json:"storage"`
    Memory   string `json:"memory"`
}

func (s *Server) handleHealth(c echo.Context) error {
    checks := HealthChecks{
        Database: checkDatabase(s.app),
        Storage:  checkStorage(),
        Memory:   checkMemory(),
    }
    
    status := "healthy"
    if checks.Database != "ok" || checks.Storage != "ok" {
        status = "degraded"
    }
    
    return c.JSON(http.StatusOK, HealthResponse{
        Status:    status,
        Version:   s.version,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Checks:    checks,
    })
}

func (s *Server) handleReady(c echo.Context) error {
    if !s.isReady() {
        return c.NoContent(http.StatusServiceUnavailable)
    }
    return c.NoContent(http.StatusOK)
}
```

**Routes:**
- `GET /health` - Health check
- `GET /ready` - Readiness probe

**Estimated Effort:** 1 day
**Dependencies:** None

---

## 2. KombiSphere-Cloud Refactoring

### Current State
- User/subscription management
- No tenant instance assignment
- No Stack launch integration

### Target State
- Tenant provisioning
- Instance assignment
- SSO launch flow

### Refactoring Tasks

#### Task 2.1: Add Tenant and Instance Models

**Location:** `prisma/schema.prisma`

**Schema Additions:** (See REPO_ARCHITECTURE_PLANS.md for full schema)

**Migration:**
```bash
npx prisma migrate dev --name add_tenant_instance_models
```

**Estimated Effort:** 1 day
**Dependencies:** None

---

#### Task 2.2: Implement Tenant Provisioning API

**Location:** `app/api/tenant/route.ts`

**Implementation:**

```typescript
// app/api/tenant/route.ts
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  
  const body = await req.json()
  const { name, slug } = body
  
  // 1. Find available Stack instance
  const instance = await prisma.kombiStackInstance.findFirst({
    where: {
      status: 'ACTIVE',
      deploymentMode: 'SHARED',
      currentTenants: { lt: prisma.kombiStackInstance.fields.maxTenants }
    },
    orderBy: { currentTenants: 'asc' }
  })
  
  if (!instance) {
    // Trigger new instance provisioning
    await provisionNewInstance()
    return new Response('No capacity, provisioning...', { status: 503 })
  }
  
  // 2. Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name,
      zitadelOrgId: session.user.orgId,
      instanceId: instance.id,
      plan: session.user.plan,
      maxUsers: getPlanLimits(session.user.plan).maxUsers
    }
  })
  
  // 3. Update instance tenant count
  await prisma.kombiStackInstance.update({
    where: { id: instance.id },
    data: { currentTenants: { increment: 1 } }
  })
  
  return Response.json(tenant)
}
```

**Estimated Effort:** 2-3 days
**Dependencies:** Task 2.1

---

#### Task 2.3: Implement Stack Launch Flow

**Location:** `app/api/tenant/launch/route.ts`

**Implementation:**

```typescript
// app/api/tenant/launch/route.ts
export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  
  // 1. Get user's tenant
  const tenant = await prisma.tenant.findFirst({
    where: { zitadelOrgId: session.user.orgId },
    include: { instance: true }
  })
  
  if (!tenant) {
    return new Response('No tenant found', { status: 404 })
  }
  
  // 2. Generate SSO token for Stack
  const ssoToken = await generateSSOToken(session.user, tenant)
  
  // 3. Redirect to Stack with token
  const stackUrl = `${tenant.instance.publicEndpoint}/api/internal/sso/exchange`
  
  return Response.json({
    redirectUrl: stackUrl,
    token: ssoToken
  })
}
```

**Estimated Effort:** 2 days
**Dependencies:** Task 2.2, KombiStack SSO endpoint

---

## 3. KombiSphere-Admin Refactoring

### Current State
- May still use PocketBase (per CONSISTENCY_AUDIT)
- Tool catalog management
- No instance health monitoring

### Target State
- PostgreSQL only (aligned with Cloud)
- Instance provisioning API
- Health dashboard

### Refactoring Tasks

#### Task 3.1: Migrate from PocketBase to PostgreSQL

**Location:** Entire Admin codebase

**Steps:**
1. Audit current database usage
2. Create Prisma models for existing PB collections
3. Migrate data
4. Update all queries

**Models to Add:**
```prisma
// Tool catalog models
model Tool {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  versions    ToolVersion[]
  evaluations AIEvaluation[]
  // ...
}

model Category {
  id    String @id @default(uuid())
  name  String @unique
  tools Tool[]
}

// Instance management
model KombiStackInstance {
  // See REPO_ARCHITECTURE_PLANS.md
}
```

**Estimated Effort:** 3-5 days
**Dependencies:** None

---

#### Task 3.2: Implement Instance Provisioning API

**Location:** `app/api/admin/instances/route.ts`

**Implementation:**

```typescript
// Azure ARM integration
import { ResourceManagementClient } from '@azure/arm-resources'

export async function POST(req: Request) {
  const session = await getServerSession()
  if (!isAdmin(session)) return new Response('Forbidden', { status: 403 })
  
  const { region, deploymentMode = 'SHARED' } = await req.json()
  
  // 1. Deploy via Azure ARM/Bicep
  const deployment = await deployStackInstance({
    region,
    deploymentMode,
    templateUrl: process.env.BICEP_TEMPLATE_URL
  })
  
  // 2. Create instance record
  const instance = await prisma.kombiStackInstance.create({
    data: {
      name: `kombistack-${region}-${Date.now()}`,
      region,
      deploymentMode,
      status: 'PROVISIONING',
      maxTenants: deploymentMode === 'SHARED' ? 50 : 1,
      internalEndpoint: deployment.outputs.internalEndpoint.value,
      publicEndpoint: deployment.outputs.publicEndpoint.value
    }
  })
  
  // 3. Poll until ready
  pollInstanceHealth(instance.id)
  
  return Response.json(instance)
}
```

**Estimated Effort:** 3-4 days
**Dependencies:** Task 3.1

---

## 4. KombiSim Refactoring

### Current State
- Single-tenant SQLite
- No tenant isolation in Docker

### Target State
- Tenant-scoped simulations
- Docker network isolation

### Refactoring Tasks

#### Task 4.1: Add Tenant Layer to Database

**Location:** `pkg/simulation/store.go`

**Schema Changes:**

```go
// Add tenant_id to all models
type Simulation struct {
    ID        string    `db:"id"`
    TenantID  string    `db:"tenant_id"`  // NEW
    Name      string    `db:"name"`
    // ...
}

type Node struct {
    ID           string `db:"id"`
    TenantID     string `db:"tenant_id"`     // NEW
    SimulationID string `db:"simulation_id"`
    // ...
}
```

**Query Changes:**
```go
// All queries must include tenant filter
func (s *Store) ListSimulations(tenantID string) ([]*Simulation, error) {
    return s.db.Query(`
        SELECT * FROM simulations 
        WHERE tenant_id = ?
    `, tenantID)
}
```

**Estimated Effort:** 2 days
**Dependencies:** None

---

#### Task 4.2: Implement Docker Network Isolation

**Location:** `pkg/engine/container.go`

**Implementation:**

```go
// pkg/engine/container.go

func (e *ContainerEngine) CreateNode(ctx context.Context, config NodeConfig) (*Node, error) {
    tenantID := ctx.Value("tenant_id").(string)
    
    // 1. Ensure tenant network exists
    networkName := fmt.Sprintf("kombisim_%s_net", tenantID)
    network, err := e.ensureNetwork(networkName)
    if err != nil {
        return nil, err
    }
    
    // 2. Create container with tenant isolation
    containerName := fmt.Sprintf("%s_%s_%s", 
        tenantID, config.SimulationID, config.ID)
    
    resp, err := e.client.ContainerCreate(ctx, 
        &container.Config{
            Image: config.Image,
            Labels: map[string]string{
                "kombisim.tenant": tenantID,
                "kombisim.simulation": config.SimulationID,
            },
        },
        &container.HostConfig{
            NetworkMode: container.NetworkMode(network.ID),
        }, nil, nil, containerName)
    
    // ...
}

func (e *ContainerEngine) ensureNetwork(name string) (*types.NetworkResource, error) {
    // Check if network exists
    networks, _ := e.client.NetworkList(ctx, types.NetworkListOptions{})
    for _, net := range networks {
        if net.Name == name {
            return &net, nil
        }
    }
    
    // Create new network
    resp, err := e.client.NetworkCreate(ctx, name, types.NetworkCreate{
        Driver: "bridge",
        Labels: map[string]string{
            "kombisim.managed": "true",
        },
    })
    // ...
}
```

**Estimated Effort:** 2-3 days
**Dependencies:** Task 4.1

---

## 5. StackKits Refactoring

### Current State
- Repository only
- CLI tool
- No API layer

### Target State
- Git repository (source of truth)
- Kong API for SaaS
- Plan-based access control

### Refactoring Tasks

#### Task 5.1: Create API Service

**Location:** `cmd/stackkits-api/main.go`

**Implementation:**

```go
package main

import (
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    
    // Middleware
    r.Use(authMiddleware())  // Validate Kong headers
    r.Use(planMiddleware())  // Check entitlement
    
    // Routes
    api := r.Group("/v1/stackkits")
    {
        api.GET("", listKits)
        api.GET("/:id", getKit)
        api.GET("/:id/download", downloadKit)
        api.POST("/:id/validate", validateSpec)
    }
    
    r.Run(":8080")
}

func authMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetHeader("X-User-ID")
        if userID == "" {
            c.AbortWithStatus(401)
            return
        }
        c.Set("userID", userID)
        c.Set("plan", c.GetHeader("X-Subscription-Plan"))
        c.Next()
    }
}

func planMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        plan := c.GetString("plan")
        kitID := c.Param("id")
        
        kit, err := registry.GetKit(kitID)
        if err != nil {
            c.AbortWithStatus(404)
            return
        }
        
        if !kit.IsAvailableForPlan(plan) {
            c.AbortWithStatusJSON(403, gin.H{
                "error": "Plan upgrade required",
                "requiredPlan": kit.MinPlan,
            })
            return
        }
        c.Next()
    }
}
```

**Estimated Effort:** 2 days
**Dependencies:** None

---

## 6. Interface Contracts

### Contract Summary

| Contract | From | To | Endpoint | Status |
|----------|------|-----|----------|--------|
| C1 | Cloud | Admin | `GET /api/internal/users/:sub` | ✅ Defined |
| C2 | Kong | All | JWT Headers | ✅ Configured |
| C3 | Stripe | Cloud/Admin | `POST /api/webhooks/stripe` | ⚠️ Missing sig verify |
| C4 | Zitadel | Cloud/Admin | `POST /api/webhooks/zitadel` | ⚠️ Missing sig verify |
| C5 | Admin | Stack | `POST /api/internal/feature-flags/apply` | ❌ Not implemented |
| C6 | Kong | Stack | `POST /api/internal/sso/exchange` | ❌ Not implemented |

### New Contracts Required

```typescript
// Contract 7: StackKits Access Control
// Kong → StackKits
interface StackKitsAccessRequest {
  headers: {
    'X-User-ID': string;
    'X-Subscription-Plan': 'free' | 'pro' | 'enterprise';
  }
}

// Contract 8: Instance Health Reporting
// Stack/Admin → Admin
interface HealthReport {
  instanceId: string;
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    cpuPercent: number;
    memoryPercent: number;
    tenantCount: number;
  };
}
```

---

## 7. Migration Path

### Phase 1: Preparation (Week 1)
- [ ] Set up feature branches in all repos
- [ ] Create tenant middleware scaffolding
- [ ] Deploy Kong Gateway to staging
- [ ] Set up integration test environment

### Phase 2: Core Changes (Weeks 2-3)
- [ ] Implement SSO exchange in KombiStack
- [ ] Add tenant models to Cloud/Admin
- [ ] Migrate Admin to PostgreSQL
- [ ] Add health endpoints to all services

### Phase 3: Integration (Week 4)
- [ ] Connect Cloud → Stack via Kong
- [ ] Test tenant provisioning end-to-end
- [ ] Implement feature flag sync
- [ ] Add StackKits API

### Phase 4: Multi-Tenancy (Weeks 5-6)
- [ ] Enable namespace isolation in Stack
- [ ] Add Sim tenant isolation
- [ ] Implement instance provisioning
- [ ] Load testing

### Phase 5: Hardening (Weeks 7-8)
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation update
- [ ] Production deployment

---

*See PHASED_IMPLEMENTATION_PLAN.md for detailed timeline*
