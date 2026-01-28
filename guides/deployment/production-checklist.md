# Production Deployment Checklist

> **Version:** 1.0  
> **Date:** 2026-01-28  
> **Applies to:** Kong Gateway on Azure Container Apps

Complete this checklist before and after deploying Kong Gateway to production.

---

## Pre-Deployment Checks

### Infrastructure Prerequisites

- [ ] Azure subscription active with sufficient quota
- [ ] Resource group `rg-kombify-prod` created
- [ ] Key Vault `kv-kombify-prod` provisioned with all required secrets
- [ ] PostgreSQL Flexible Server `psql-kombify-prod` deployed with:
  - [ ] Database `kong` created
  - [ ] High availability enabled (Zone Redundant)
  - [ ] Backup retention configured (35 days)
  - [ ] Private endpoint configured
- [ ] Redis Cache `redis-kombify-prod` deployed with:
  - [ ] Private endpoint configured
  - [ ] SSL-only access enabled
- [ ] Virtual Network with subnets for:
  - [ ] Container Apps
  - [ ] PostgreSQL delegation
  - [ ] Private endpoints
- [ ] Managed Identity `id-kong-kombify-prod` created
- [ ] Key Vault access policy granted to managed identity

### DNS and Networking

- [ ] DNS A record for `api.kombify.io` configured
- [ ] Azure Front Door profile `afd-kombify-prod` created
- [ ] Front Door origin group configured with Kong as backend
- [ ] SSL certificate configured for custom domain
- [ ] WAF policy applied to Front Door

### Container App Environment

- [ ] Container App Environment `cae-kombify-prod` provisioned
- [ ] Log Analytics workspace configured
- [ ] Application Insights connected
- [ ] VNet integration configured

### Secrets Validation

Verify all secrets exist in Key Vault:

```bash
# Required secrets checklist
az keyvault secret show --vault-name kv-kombify-prod --name kong-pg-host
az keyvault secret show --vault-name kv-kombify-prod --name kong-pg-user
az keyvault secret show --vault-name kv-kombify-prod --name kong-pg-password
az keyvault secret show --vault-name kv-kombify-prod --name redis-password
az keyvault secret show --vault-name kv-kombify-prod --name redis-host
az keyvault secret show --vault-name kv-kombify-prod --name kong-admin-token
```

---

## Deployment Steps

### 1. Deploy Infrastructure (Bicep)

```bash
# Set variables
ENV="prod"
RG="rg-kombify-${ENV}"
LOCATION="westeurope"

# Deploy main infrastructure
az deployment group create \
  --resource-group ${RG} \
  --template-file infrastructure/bicep/main.bicep \
  --parameters environment=${ENV} \
               postgresAdminPassword=$(openssl rand -base64 32)
```

- [ ] Bicep deployment completed successfully
- [ ] All resources provisioned without errors

### 2. Run Database Migrations

```bash
# Run Kong migrations
az containerapp job create \
  --resource-group ${RG} \
  --name kong-migrations \
  --environment cae-kombify-${ENV} \
  --image kong:3.9 \
  --cpu 0.5 \
  --memory 1Gi \
  --secrets "kong-pg-password=secretref:kong-pg-password" \
  --env-vars \
    "KONG_DATABASE=postgres" \
    "KONG_PG_HOST=secretref:kong-pg-host" \
    "KONG_PG_USER=secretref:kong-pg-user" \
    "KONG_PG_PASSWORD=secretref:kong-pg-password" \
    "KONG_PG_DATABASE=kong" \
  --trigger-type Manual

# Execute migration
az containerapp job execution start \
  --resource-group ${RG} \
  --name kong-migrations \
  --command "kong migrations bootstrap"
```

- [ ] Migrations completed successfully
- [ ] Database tables created

### 3. Deploy Kong Configuration

```bash
# Deploy via GitHub Actions or manually
cd infrastructure/kong

# Set environment variables
export KONG_ADMIN_URL="http://$(az containerapp show --name ca-kong-kombify-prod --resource-group ${RG} --query properties.configuration.ingress.fqdn -o tsv):8001"
export REDIS_HOST=$(az keyvault secret show --vault-name kv-kombify-prod --name redis-host --query value -o tsv)
export REDIS_PASSWORD=$(az keyvault secret show --vault-name kv-kombify-prod --name redis-password --query value -o tsv)
export REDIS_PORT=6380

# Deploy configuration
./deploy.sh prod ${KONG_ADMIN_URL}
```

- [ ] Configuration deployed successfully
- [ ] deck sync completed without errors

---

## Deployment Verification Steps

### 1. Health Check Verification

```bash
KONG_URL="https://api.kombify.io"

# Test health endpoint
curl -sf ${KONG_URL}/health
echo "✓ Health endpoint responding"

# Test Kong status (internal)
az containerapp exec --name ca-kong-kombify-prod --resource-group ${RG} --command "curl -s http://localhost:8001/status | jq .database.reachable"
```

- [ ] Health endpoint returns HTTP 200
- [ ] Kong status shows database as reachable
- [ ] No errors in container logs

### 2. Service Configuration Verification

```bash
# Get admin URL
ADMIN_URL="http://$(az containerapp show --name ca-kong-kombify-prod --resource-group ${RG} --query properties.configuration.ingress.fqdn -o tsv):8001"

# Verify all services are configured
curl -s ${ADMIN_URL}/services | jq '.data[].name'
```

Expected services:
- [ ] `administration`
- [ ] `kombistack`
- [ ] `kombisim`
- [ ] `kombisphere`
- [ ] `kong-admin`

### 3. Route Configuration Verification

```bash
# Verify all routes
curl -s ${ADMIN_URL}/routes | jq '.data[].name'
```

Expected routes:
- [ ] `admin-routes`
- [ ] `catalog-public-routes`
- [ ] `kombistack-routes`
- [ ] `kombisim-routes`
- [ ] `kombisphere-routes`
- [ ] `health-route`

### 4. Plugin Configuration Verification

```bash
# Verify plugins
curl -s ${ADMIN_URL}/plugins | jq '.data[].name'
```

Expected plugins:
- [ ] `cors` (global)
- [ ] `correlation-id` (global)
- [ ] `prometheus` (global)
- [ ] `jwt` (per service)
- [ ] `rate-limiting-advanced` (per service)
- [ ] `request-transformer` (per service)

---

## Post-Deployment Smoke Tests

### 1. Public Endpoints (No Auth)

```bash
KONG_URL="https://api.kombify.io"

# Test health endpoint
curl -sf ${KONG_URL}/health && echo "✓ Health endpoint OK"

# Test public catalog (may return 401 or 404 if not implemented)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${KONG_URL}/v1/catalog/public)
echo "Public catalog: HTTP ${HTTP_CODE}"
```

- [ ] `/health` returns HTTP 200
- [ ] `/v1/catalog/public` accessible (HTTP 200, 401, or 404)

### 2. JWT Protection Tests

```bash
# Test protected endpoint without token (should return 401)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${KONG_URL}/v1/stacks)
if [[ "$HTTP_CODE" == "401" ]]; then
  echo "✓ JWT protection working"
else
  echo "✗ JWT protection test failed (HTTP ${HTTP_CODE})"
fi
```

- [ ] `/v1/stacks` without token returns HTTP 401
- [ ] `/v1/admin` without token returns HTTP 401
- [ ] `/v1/simulations` without token returns HTTP 401

### 3. CORS Tests

```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: https://app.kombify.io" \
  -H "Access-Control-Request-Method: GET" \
  -I ${KONG_URL}/v1/catalog/public | grep -i "access-control"
```

- [ ] CORS headers present in response
- [ ] `Access-Control-Allow-Origin` header set correctly

### 4. Rate Limiting Tests

```bash
# Make multiple requests and check for rate limit headers
for i in {1..5}; do
  curl -s -I ${KONG_URL}/v1/catalog/public | grep -i "X-RateLimit"
done
```

- [ ] `X-RateLimit-Limit` header present
- [ ] `X-RateLimit-Remaining` header present

### 5. Request Headers Test

With a valid JWT token:

```bash
# Test that upstream receives transformed headers
curl -H "Authorization: Bearer ${VALID_TOKEN}" \
  -v ${KONG_URL}/v1/admin/health 2>&1 | grep -i "X-User"
```

- [ ] `X-User-ID` header passed to upstream
- [ ] `X-User-Email` header passed to upstream
- [ ] `X-Forwarded-By: Kong` header present

---

## Monitoring & Alerting Verification

### 1. Log Analytics

```bash
# Check logs are flowing
az monitor log-analytics query \
  --workspace $(az monitor log-analytics workspace show --resource-group ${RG} --name log-kombify-prod --query customerId -o tsv) \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerAppName_s == 'ca-kong-kombify-prod' | take 10"
```

- [ ] Container logs visible in Log Analytics
- [ ] No critical errors in logs

### 2. Application Insights

- [ ] Requests appearing in Application Insights
- [ ] Dependency calls tracked
- [ ] Exceptions logged

### 3. Metrics

```bash
# Check container metrics
az monitor metrics list \
  --resource $(az containerapp show --name ca-kong-kombify-prod --resource-group ${RG} --query id -o tsv) \
  --metric "Usage"
```

- [ ] CPU metrics available
- [ ] Memory metrics available
- [ ] Request count metrics available

### 4. Alerts (if configured)

- [ ] High error rate alert configured
- [ ] High latency alert configured
- [ ] Container restart alert configured

---

## Security Verification

### 1. Network Security

- [ ] NSG rules applied correctly
- [ ] Kong Admin port (8001) not accessible from internet
- [ ] PostgreSQL private endpoint only
- [ ] Redis private endpoint only

### 2. Identity & Access

- [ ] Managed identity has minimal required permissions
- [ ] No service principals with excessive permissions
- [ ] Key Vault audit logging enabled

### 3. SSL/TLS

- [ ] Front Door uses valid SSL certificate
- [ ] Minimum TLS 1.2 enforced
- [ ] HSTS headers present

---

## Rollback Procedure (if needed)

If deployment fails:

```bash
# 1. Revert to previous configuration
deck sync -s infrastructure/kong/backups/kong-config-previous.yaml \
  --kong-addr ${ADMIN_URL} --force

# 2. Restart Kong container
az containerapp revision restart \
  --name ca-kong-kombify-prod \
  --resource-group ${RG} \
  --revision $(az containerapp show --name ca-kong-kombify-prod --resource-group ${RG} --query properties.latestRevisionName -o tsv)

# 3. Verify rollback
curl -sf ${KONG_URL}/health && echo "✓ Rollback successful"
```

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Infrastructure Lead | | | |
| Security Reviewer | | | |
| DevOps Engineer | | | |
| QA Lead | | | |

---

## References

- [Kong Infrastructure Plan](../../internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md)
- [Azure Kong Architecture](./azure-kong-architecture.mdx)
- [Azure Key Vault Secrets](../../internal-notes/kombify/AZURE_KEYVAULT_SECRETS.md)
- [GitHub Actions Workflow](../../.github/workflows/deploy-kong.yml)

---

*Document Version: 1.0*  
*Last Updated: 2026-01-28*
