# Configure Kong Gateway for KombiSphere-Admin
# Run this script after deploying the admin container app

param(
    [string]$KongAdminUrl = "http://ca-kong-kombify-prod:8001",
    [string]$AdminServiceHost = "ca-kombify-admin-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io",
    [int]$AdminServicePort = 5280
)

$ErrorActionPreference = "Stop"

Write-Host "Configuring Kong Gateway for KombiSphere-Admin..."
Write-Host "Kong Admin URL: $KongAdminUrl"
Write-Host "Admin Service: $AdminServiceHost`:$AdminServicePort"

# 1. Create/Update Administration Service
$serviceUrl = "$KongAdminUrl/services/administration"
$serviceData = @{
    name = "administration"
    url = "http://${AdminServiceHost}:${AdminServicePort}"
    connect_timeout = 60000
    write_timeout = 60000
    read_timeout = 60000
    retries = 3
} | ConvertTo-Json

try {
    Write-Host "Creating/updating administration service..."
    $response = Invoke-RestMethod -Uri $serviceUrl -Method Put -Body $serviceData -ContentType "application/json"
    Write-Host "Service configured successfully. ID: $($response.id)"
} catch {
    Write-Error "Failed to configure service: $_"
    exit 1
}

# 2. Create/Update Routes
$routes = @(
    @{
        name = "admin-routes"
        paths = @("/v1/admin", "/v1/tools")
        strip_path = $false
        preserve_host = $false
        methods = @("GET", "POST", "PUT", "PATCH", "DELETE")
    }
)

foreach ($route in $routes) {
    $routeUrl = "$KongAdminUrl/services/administration/routes/$($route.name)"
    $routeData = $route | ConvertTo-Json -Depth 10
    
    try {
        Write-Host "Creating/updating route: $($route.name)..."
        $response = Invoke-RestMethod -Uri $routeUrl -Method Put -Body $routeData -ContentType "application/json"
        Write-Host "Route configured successfully. ID: $($response.id)"
    } catch {
        Write-Error "Failed to configure route $($route.name): $_"
        exit 1
    }
}

# 3. Create/Update Upstream with health checks
$upstreamUrl = "$KongAdminUrl/upstreams/administration-upstream"
$upstreamData = @{
    name = "administration-upstream"
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

try {
    Write-Host "Creating/upstream upstream..."
    $response = Invoke-RestMethod -Uri $upstreamUrl -Method Put -Body $upstreamData -ContentType "application/json"
    Write-Host "Upstream configured successfully. ID: $($response.id)"
} catch {
    Write-Warning "Failed to configure upstream (may already exist): $_"
}

# 4. Add target to upstream
$targetUrl = "$KongAdminUrl/upstreams/administration-upstream/targets"
$targetData = @{
    target = "${AdminServiceHost}:${AdminServicePort}"
    weight = 100
} | ConvertTo-Json

try {
    Write-Host "Adding target to upstream..."
    $response = Invoke-RestMethod -Uri $targetUrl -Method Post -Body $targetData -ContentType "application/json"
    Write-Host "Target added successfully. ID: $($response.id)"
} catch {
    Write-Warning "Failed to add target (may already exist): $_"
}

Write-Host "`nKong configuration completed successfully!"
Write-Host "Administration service is now accessible through Kong Gateway."
