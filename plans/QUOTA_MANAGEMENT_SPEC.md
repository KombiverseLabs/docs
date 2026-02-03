# Quota Management Specification

> **Version:** 1.0.0  
> **Created:** 2026-01-28  
> **Status:** REQUIRED FOR SAAS LAUNCH

---

## Overview

Quota management ensures tenants cannot exceed their plan limits. This is critical for SaaS viability - without enforcement, tenants could consume unlimited resources.

---

## Quota Types

| Resource | Free | Pro | Enterprise | Enforcement Point |
|----------|------|-----|------------|-------------------|
| **Users** | 3 | 10 | Unlimited | User creation API |
| **Nodes** | 3 | 10 | 50 | Node registration |
| **Stacks** | 2 | 5 | 20 | Stack creation |
| **Simulations** | 1 | 3 | 10 | Simulation start |
| **Storage** | 10 GB | 100 GB | 1 TB | File upload |
| **API Calls** | 100/min | 500/min | 5000/min | Kong rate limiting |

---

## Implementation

### 1. Quota Manager Service

```go
// pkg/quota/manager.go
package quota

import (
    "fmt"
    "github.com/pocketbase/pocketbase"
)

type Manager struct {
    app *pocketbase.PocketBase
}

func NewManager(app *pocketbase.PocketBase) *Manager {
    return &Manager{app: app}
}

// ResourceType defines the resource being checked
type ResourceType string

const (
    ResourceUsers       ResourceType = "users"
    ResourceNodes       ResourceType = "nodes"
    ResourceStacks      ResourceType = "stacks"
    ResourceSimulations ResourceType = "simulations"
    ResourceStorage     ResourceType = "storage"
)

// CheckResult returns quota status
type CheckResult struct {
    Allowed      bool   `json:"allowed"`
    CurrentUsage int    `json:"currentUsage"`
    Limit        int    `json:"limit"`
    Remaining    int    `json:"remaining"`
    Error        string `json:"error,omitempty"`
}

// CheckQuota verifies if operation is within tenant limits
func (m *Manager) CheckQuota(tenantSlug string, resource ResourceType, increment int) (*CheckResult, error) {
    // Get tenant config
    tenant, err := m.getTenant(tenantSlug)
    if err != nil {
        return nil, fmt.Errorf("tenant not found: %w", err)
    }
    
    // Get limit based on plan
    limit := m.getPlanLimit(tenant.Plan, resource)
    
    // Get current usage
    current, err := m.getCurrentUsage(tenantSlug, resource)
    if err != nil {
        return nil, fmt.Errorf("failed to get usage: %w", err)
    }
    
    // Check if operation would exceed limit
    if current+increment > limit {
        return &CheckResult{
            Allowed:      false,
            CurrentUsage: current,
            Limit:        limit,
            Remaining:    limit - current,
            Error:        fmt.Sprintf("%s quota exceeded: %d/%d", resource, current, limit),
        }, nil
    }
    
    return &CheckResult{
        Allowed:      true,
        CurrentUsage: current,
        Limit:        limit,
        Remaining:    limit - current - increment,
    }, nil
}

func (m *Manager) getPlanLimit(plan string, resource ResourceType) int {
    limits := map[string]map[ResourceType]int{
        "free": {
            ResourceUsers:       3,
            ResourceNodes:       3,
            ResourceStacks:      2,
            ResourceSimulations: 1,
            ResourceStorage:     10,
        },
        "pro": {
            ResourceUsers:       10,
            ResourceNodes:       10,
            ResourceStacks:      5,
            ResourceSimulations: 3,
            ResourceStorage:     100,
        },
        "enterprise": {
            ResourceUsers:       -1, // Unlimited
            ResourceNodes:       50,
            ResourceStacks:      20,
            ResourceSimulations: 10,
            ResourceStorage:     1000,
        },
    }
    
    if planLimits, ok := limits[plan]; ok {
        if limit, ok := planLimits[resource]; ok {
            return limit
        }
    }
    return 0
}

func (m *Manager) getCurrentUsage(tenantSlug string, resource ResourceType) (int, error) {
    collectionName := fmt.Sprintf("%s_%s", resource, tenantSlug)
    
    // Special handling for storage (sum of file sizes)
    if resource == ResourceStorage {
        return m.getStorageUsage(tenantSlug)
    }
    
    // Count records in namespaced collection
    records, err := m.app.Dao().FindRecordsByExpr(collectionName)
    if err != nil {
        return 0, err
    }
    
    return len(records), nil
}

func (m *Manager) getStorageUsage(tenantSlug string) (int, error) {
    // Query file storage for tenant
    // Implementation depends on storage backend
    return 0, nil
}

func (m *Manager) getTenant(tenantSlug string) (*Tenant, error) {
    // Fetch from _tenants collection
    record, err := m.app.Dao().FindFirstRecordByData("_tenants", "slug", tenantSlug)
    if err != nil {
        return nil, err
    }
    
    return &Tenant{
        ID:   record.Id,
        Slug: record.GetString("slug"),
        Plan: record.GetString("plan"),
    }, nil
}

type Tenant struct {
    ID   string
    Slug string
    Plan string
}
```

### 2. Quota Middleware

```go
// pkg/quota/middleware.go
package quota

import (
    "net/http"
    "strings"
    
    "github.com/labstack/echo/v5"
    "github.com/pocketbase/pocketbase"
)

// Middleware enforces quota limits on create operations
func Middleware(app *pocketbase.PocketBase) echo.MiddlewareFunc {
    manager := NewManager(app)
    
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // Only enforce on creation operations
            if c.Request().Method != http.MethodPost {
                return next(c)
            }
            
            // Extract tenant from context
            tenantSlug, ok := c.Get("tenantSlug").(string)
            if !ok || tenantSlug == "" {
                return c.JSON(http.StatusBadRequest, map[string]string{
                    "error": "Tenant context required",
                })
            }
            
            // Determine resource type from path
            resource := extractResourceFromPath(c.Request().URL.Path)
            if resource == "" {
                // Path doesn't represent a quota-limited resource
                return next(c)
            }
            
            // Check quota
            result, err := manager.CheckQuota(tenantSlug, resource, 1)
            if err != nil {
                return c.JSON(http.StatusInternalServerError, map[string]string{
                    "error": "Quota check failed",
                })
            }
            
            if !result.Allowed {
                return c.JSON(http.StatusForbidden, map[string]interface{}{
                    "error":     result.Error,
                    "code":      "QUOTA_EXCEEDED",
                    "resource":  resource,
                    "current":   result.CurrentUsage,
                    "limit":     result.Limit,
                    "remaining": result.Remaining,
                })
            }
            
            // Add quota headers to response
            c.Response().Header().Set("X-Quota-Limit", fmt.Sprintf("%d", result.Limit))
            c.Response().Header().Set("X-Quota-Used", fmt.Sprintf("%d", result.CurrentUsage))
            c.Response().Header().Set("X-Quota-Remaining", fmt.Sprintf("%d", result.Remaining))
            
            return next(c)
        }
    }
}

func extractResourceFromPath(path string) ResourceType {
    // Map API paths to resource types
    switch {
    case strings.Contains(path, "/users"):
        return ResourceUsers
    case strings.Contains(path, "/nodes"):
        return ResourceNodes
    case strings.Contains(path, "/stacks"):
        return ResourceStacks
    case strings.Contains(path, "/simulations"):
        return ResourceSimulations
    default:
        return ""
    }
}
```

### 3. Storage Quota Enforcement

```go
// pkg/quota/storage.go
package quota

import (
    "fmt"
    "io"
    
    "github.com/labstack/echo/v5"
    "github.com/pocketbase/pocketbase"
)

// StorageMiddleware enforces storage quotas on file uploads
func StorageMiddleware(app *pocketbase.PocketBase, maxUploadSize int64) echo.MiddlewareFunc {
    manager := NewManager(app)
    
    return func(next echo.HandlerFunc) echo.HandlerFunc {
        return func(c echo.Context) error {
            // Get file size from request
            contentLength := c.Request().ContentLength
            if contentLength > maxUploadSize {
                return c.JSON(http.StatusRequestEntityTooLarge, map[string]string{
                    "error": fmt.Sprintf("File too large. Max size: %d bytes", maxUploadSize),
                })
            }
            
            tenantSlug := c.Get("tenantSlug").(string)
            
            // Check if upload would exceed quota
            result, err := manager.CheckQuota(tenantSlug, ResourceStorage, int(contentLength))
            if err != nil {
                return c.JSON(http.StatusInternalServerError, map[string]string{
                    "error": "Storage quota check failed",
                })
            }
            
            if !result.Allowed {
                return c.JSON(http.StatusForbidden, map[string]interface{}{
                    "error":    "Storage quota exceeded",
                    "code":     "STORAGE_QUOTA_EXCEEDED",
                    "limit":    result.Limit,
                    "used":     result.CurrentUsage,
                    "upload":   contentLength,
                })
            }
            
            return next(c)
        }
    }
}
```

### 4. API Integration

```go
// cmd/kombistack/main.go

func main() {
    app := pocketbase.New()
    
    // ... existing setup ...
    
    // Add quota middleware
    app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
        // Apply quota middleware to API routes
        e.Router.Use(quota.Middleware(app))
        
        // Apply storage quota to file upload routes
        e.Router.POST("/api/files/*", 
            handler,
            quota.StorageMiddleware(app, 100*1024*1024), // 100MB max
        )
        
        return nil
    })
    
    // ...
}
```

---

## API Responses

### Quota Headers

All API responses include quota status headers:

```http
HTTP/1.1 200 OK
X-Quota-Limit: 10
X-Quota-Used: 3
X-Quota-Remaining: 7
Content-Type: application/json
```

### Quota Exceeded Error

```json
{
  "error": "users quota exceeded: 10/10",
  "code": "QUOTA_EXCEEDED",
  "resource": "users",
  "current": 10,
  "limit": 10,
  "remaining": 0,
  "upgradeUrl": "https://app.kombify.io/upgrade"
}
```

---

## Database Schema

Add quota tracking to tenant record:

```javascript
// _tenants collection - add fields
{
  "usage": {
    "users": 3,
    "nodes": 2,
    "stacks": 1,
    "storageBytes": 524288000
  },
  "lastUsageUpdate": "2026-01-28T20:00:00Z"
}
```

---

## Monitoring

### Metrics to Track

1. **Quota utilization by tenant**
   - Alert at 80% of any quota
   - Alert at 100% (block operations)

2. **Quota override events**
   - Log all manual quota overrides by admins
   - Track reason for override

3. **Upgrade conversions**
   - Track how often quota exceeded → upgrade
   - Measure revenue impact

---

## Testing

### Unit Tests

```go
// pkg/quota/manager_test.go

func TestCheckQuota(t *testing.T) {
    tests := []struct {
        name      string
        plan      string
        resource  ResourceType
        current   int
        increment int
        wantAllow bool
    }{
        {
            name:      "free user under limit",
            plan:      "free",
            resource:  ResourceUsers,
            current:   2,
            increment: 1,
            wantAllow: true,
        },
        {
            name:      "free user at limit",
            plan:      "free",
            resource:  ResourceUsers,
            current:   3,
            increment: 1,
            wantAllow: false,
        },
        {
            name:      "enterprise unlimited",
            plan:      "enterprise",
            resource:  ResourceUsers,
            current:   1000,
            increment: 1,
            wantAllow: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation
        })
    }
}
```

---

*See REPO_ARCHITECTURE_PLANS.md for integration details*