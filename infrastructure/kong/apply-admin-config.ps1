# Apply Kong Gateway configuration for KombiSphere-Admin
# This script configures the administration service in Kong

param(
    [string]$KongAdminUrl = "http://ca-kong-kombify-prod:8001"
)

$ErrorActionPreference = "Stop"

Write-Host "Applying Kong Gateway configuration for KombiSphere-Admin..."

# Administration service configuration
$adminService = @{
    name = "administration"
    url = "http://ca-kombify-admin-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:8090"
    protocol = "http"
    connect_timeout = 60000
    write_timeout = 60000
    read_timeout = 60000
    retries = 3
} | ConvertTo-Json

# Routes
$adminRoutes = @{
    name = "admin-routes"
    service = @{ name = "administration" }
    paths = @("/v1/admin", "/v1/tools", "/v1/catalog/internal")
    strip_path = $false
    preserve_host = $false
    methods = @("GET", "POST", "PUT", "PATCH", "DELETE")
} | ConvertTo-Json -Depth 10

$catalogRoutes = @{
    name = "catalog-public-routes"
    service = @{ name = "administration" }
    paths = @("/v1/catalog/public", "/v1/catalog/categories")
    strip_path = $false
    preserve_host = $false
    methods = @("GET", "OPTIONS")
} | ConvertTo-Json -Depth 10

# Upstream with health checks
$upstream = @{
    name = "administration-upstream"
    targets = @(
        @{
            target = "ca-kombify-admin-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:8090"
            weight = 100
        }
    )
    healthchecks = @{
        active = @{
            http_path = "/health"
            timeout = 10
            interval = 30
            unhealthy = @{
                http_statuses = @(429, 500, 502, 503)
                tcp_failures = 2
                timeouts = 2
                http_failures = 2
                interval = 10
            }
            healthy = @{
                http_statuses = @(200, 302)
                successes = 2
                interval = 10
            }
        }
    }
} | ConvertTo-Json -Depth 10

Write-Host "1. Creating/updating administration service..."
try {
    Invoke-RestMethod -Uri "$KongAdminUrl/services/administration" -Method Put -Body $adminService -ContentType "application/json" | Out-Null
    Write-Host "   [OK] Service configured"
} catch {
    Write-Error "   [FAIL] Failed to configure service: $_"
    exit 1
}

Write-Host "2. Creating/updating admin routes..."
try {
    Invoke-RestMethod -Uri "$KongAdminUrl/routes/admin-routes" -Method Put -Body $adminRoutes -ContentType "application/json" | Out-Null
    Write-Host "   [OK] Admin routes configured"
} catch {
    Write-Error "   [FAIL] Failed to configure admin routes: $_"
    exit 1
}

Write-Host "3. Creating/updating catalog routes..."
try {
    Invoke-RestMethod -Uri "$KongAdminUrl/routes/catalog-public-routes" -Method Put -Body $catalogRoutes -ContentType "application/json" | Out-Null
    Write-Host "   [OK] Catalog routes configured"
} catch {
    Write-Error "   [FAIL] Failed to configure catalog routes: $_"
    exit 1
}

Write-Host "4. Creating/updating upstream..."
try {
    Invoke-RestMethod -Uri "$KongAdminUrl/upstreams/administration-upstream" -Method Put -Body $upstream -ContentType "application/json" | Out-Null
    Write-Host "   [OK] Upstream configured"
} catch {
    Write-Error "   [FAIL] Failed to configure upstream: $_"
    exit 1
}

Write-Host "`nKong configuration applied successfully!"
Write-Host "KombiSphere-Admin is now accessible via Kong Gateway at:"
Write-Host "  - https://api.kombify.io/v1/admin/*"
Write-Host "  - https://api.kombify.io/v1/tools/*"
