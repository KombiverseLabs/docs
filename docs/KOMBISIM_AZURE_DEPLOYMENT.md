# KombiSim Azure Deployment Report

**Date:** 2026-01-28  
**Status:** ✅ COMPLETE (with Kong routing pending cluster access)  
**Target:** sim.kombify.io

---

## Summary

Successfully deployed KombiSim simulation service to Azure Container Apps with mock engine support for API/documentation purposes.

## Deployment Status

### ✅ Completed

1. **Container Image**
   - Built and pushed to `acrkombifyprod.azurecr.io/kombisim:latest`
   - Multi-stage Dockerfile (Go backend + SvelteKit frontend)
   - Added mock engine implementation for Azure deployment

2. **Azure Container App**
   - Container App: `ca-kombify-sim-prod`
   - Resource Group: `rg-kombify-prod`
   - Location: `West Europe`
   - Internal FQDN: `ca-kombify-sim-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io`
   - Port: `5270`
   - Ingress: Internal only (accessed via Kong Gateway)

3. **Configuration**
   - Environment: `production`
   - Engine: `mock` (simulation mode, no Docker required)
   - Data Directory: `/data`
   - Log Level: `info`
   - Auto-scaling: 1-2 replicas

4. **ACR Integration**
   - System-assigned managed identity enabled
   - AcrPull role assigned
   - Registry authentication configured

5. **Health Probes**
   - Endpoint: `/health` and `/api/v1/health`
   - Service responding successfully

### ⏳ Pending (Requires Cluster Access)

**Kong Gateway Routing**

The Kong configuration file has been prepared at [`infrastructure/kong/kong-kombisim-config.yaml`](infrastructure/kong/kong-kombisim-config.yaml). Routes need to be applied from within the cluster.

**Manual Configuration Steps:**

```bash
# 1. Access the Kong container
kubectl exec -n kong deploy/kong -it -- /bin/bash

# 2. Create the KombiSim service
curl -X POST http://localhost:8001/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "kombisim",
    "url": "http://ca-kombify-sim-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5270"
  }'

# 3. Create routes for health check
curl -X POST http://localhost:8001/services/kombisim/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "kombisim-health",
    "paths": ["/health","/api/v1/health"],
    "strip_path": false
  }'

# 4. Create routes for API endpoints
curl -X POST http://localhost:8001/services/kombisim/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "kombisim-api",
    "paths": ["/api/v1/sim","/api/v1/simulations","/api/v1/nodes","/api/v1/templates","/api/v1/discovery"],
    "strip_path": false
  }'

# 5. Verify configuration
curl http://localhost:8001/services/kombisim
```

---

## Changes Made to KombiSim

### New File: `pkg/engine/mock.go`

Created a mock engine implementation that simulates node operations without requiring Docker daemon access:

- Simulates node CRUD operations
- Returns mock SSH connection details
- Provides simulated stats and logs
- Supports network simulation (no-op for latency)

### Modified: `pkg/engine/engine.go`

Added mock engine to the factory:

```go
case "mock":
    return NewMockEngine()
```

---

## Verification

### Container App Status

```bash
az containerapp show \
  --name ca-kombify-sim-prod \
  --resource-group rg-kombify-prod \
  --query "properties.runningStatus"
# Output: "Running"
```

### Service Logs

```
✅ Discovery service enabled
🚀 KombiSim starting port=5270
📦 Engine type=mock
📁 Data directory path=/data
💾 Database path=/data/kombisim.db
🔧 Log level level=info
```

### Health Check

```bash
# From within the cluster:
curl http://ca-kombify-sim-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5270/health
```

---

## API Endpoints Available

Once Kong routing is configured, the following endpoints will be accessible at `https://sim.kombify.io`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/health` | GET | Detailed health status |
| `/api/v1/simulations` | GET, POST | List/create simulations |
| `/api/v1/simulations/{id}` | GET, PUT, DELETE | Manage simulation |
| `/api/v1/nodes` | GET, POST | List/create nodes |
| `/api/v1/nodes/{id}` | GET, PUT, DELETE | Manage node |
| `/api/v1/templates` | GET, POST | List/create templates |
| `/api/v1/discovery` | GET | Service discovery |

---

## Limitations

### Mock Engine

Since Azure Container Apps doesn't provide Docker daemon access:
- Node operations are simulated (mock responses)
- No actual containers are created
- SSH connections return mock credentials
- Stats/logs are generated data
- Network latency controls are no-op

For full simulation capabilities with real containers, consider:
- Azure Kubernetes Service (AKS) with privileged containers
- Self-hosted deployment on VMs with Docker
- External container runtime integration

---

## Next Steps

1. **Apply Kong Configuration** (requires kubectl access to cluster)
2. **Test API Endpoints** via sim.kombify.io
3. **Set up persistent storage** if SQLite data needs to persist
4. **Configure monitoring** with Azure Monitor

---

## Resource IDs

```
Container App:
/subscriptions/5206295e-ad2e-4a42-960f-8632ef857314/resourceGroups/rg-kombify-prod/providers/Microsoft.App/containerapps/ca-kombify-sim-prod

Container Environment:
/subscriptions/5206295e-ad2e-4a42-960f-8632ef857314/resourceGroups/rg-kombify-prod/providers/Microsoft.App/managedEnvironments/cae-kombify-prod

Managed Identity Principal ID:
d8985c81-ce10-43ef-9732-cd1e28fcd8f9
```
