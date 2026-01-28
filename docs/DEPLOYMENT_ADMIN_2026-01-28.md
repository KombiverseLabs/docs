# KombiSphere-Admin Deployment Report

**Date:** 2026-01-28  
**Deployer:** Azure CLI / Bicep  
**Environment:** Production

## Summary

KombiSphere-Admin service successfully deployed to Azure Container Apps with Kong Gateway integration.

## Deployment Status

| Component | Status | Details |
|-----------|--------|---------|
| Container Image | [x] | `acrkombifyprod.azurecr.io/kombisphere-admin:latest` |
| Container App | [x] | `ca-kombify-admin-prod` running |
| Health Probes | [x] | Liveness, Readiness, Startup configured |
| Kong Routing | [x] | Environment variables configured |
| Key Vault Secrets | [x] | 3 new secrets created |
| Managed Identity | [x] | `id-kombify-admin-prod` with ACR pull access |

## Resource Details

### Container App
- **Name:** `ca-kombify-admin-prod`
- **FQDN:** `ca-kombify-admin-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io`
- **Port:** 8090 (PocketBase default)
- **Image:** `acrkombifyprod.azurecr.io/kombisphere-admin:latest`
- **Min Replicas:** 1
- **Max Replicas:** 2
- **CPU:** 0.5 cores
- **Memory:** 1Gi

### Health Probes
- **Startup:** `/health` - 5s initial, 5s interval, 30 failures allowed
- **Liveness:** `/health` - 30s initial, 30s interval
- **Readiness:** `/health` - 10s initial, 10s interval

### Auto-scaling Rules
- HTTP concurrent requests: 100
- CPU utilization: 70%

## Kong Gateway Configuration

Kong environment variables updated:
- `ADMIN_SERVICE_HOST`: `ca-kombify-admin-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io`
- `ADMIN_SERVICE_PORT`: `8090`

Kong routes configured (via kong-config.yaml):
- `/v1/admin/*` → Administration service
- `/v1/tools/*` → Administration service
- `/v1/catalog/internal/*` → Administration service
- `/v1/catalog/public/*` → Administration service (no auth)
- `/v1/catalog/categories/*` → Administration service (no auth)

## Key Vault Secrets Created

| Secret Name | Purpose |
|-------------|---------|
| `meilisearch-url` | Meilisearch instance URL |
| `meilisearch-api-key` | Meilisearch API key (placeholder) |
| `admin-api-key` | Service authentication key |

## Application Logs

```
Server started at http://127.0.0.1:8090
REST API:  http://127.0.0.1:8090/api/
Dashboard: http://127.0.0.1:8090/_/
Scheduler started successfully with workers=2
Crawler manager started
```

## Next Steps

1. **Complete Kong Service Configuration:**
   ```powershell
   # Run from inside Kong container or with deck CLI
   deck sync -s infrastructure/kong/kong-admin-service-config.yaml --kong-addr http://localhost:8001
   ```

2. **Update Meilisearch API Key:**
   ```bash
   az keyvault secret set --vault-name kv-kombify-prod --name meilisearch-api-key --value "<actual-key>"
   ```

3. **Configure DNS for admin.kombify.io:**
   - Add CNAME: `admin.kombify.io` → Front Door endpoint

4. **Verify Endpoints:**
   - Health: `http://ca-kombify-admin-prod.internal.gentlemoss-1ad74075.westeurope.azurecontainerapps.io/health`
   - API: `https://api.kombify.io/v1/admin`

## Files Created

- `infrastructure/bicep/admin-app.bicep` - Container App Bicep template
- `infrastructure/kong/kong-admin-service-config.yaml` - Kong service configuration
- `infrastructure/kong/apply-admin-config.ps1` - Kong configuration script

## Notes

- PocketBase uses default port 8090 (not the documented 5280)
- Container uses EmptyDir volume for `/data` (ephemeral storage)
- Managed identity has AcrPull and Key Vault secrets access
- Service is internal-only (no external ingress)
