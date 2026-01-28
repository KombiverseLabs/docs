# Kong Gateway + Zitadel SSO E2E Test Report

> **Date:** 2026-01-28  
> **Environment:** Azure Container Apps (Production)  
> **Test Framework:** Playwright  
> **Report Version:** 1.0.0

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 18 |
| **Passed** | 0 |
| **Failed** | 16 |
| **Skipped** | 2 |
| **Success Rate** | 0% |

### Critical Issues Identified

1. **Kong Gateway Not Responding** - PostgreSQL authentication failure
2. **KombiSphere App Not Deployed** - DNS not resolved (app.kombify.io)
3. **Zitadel JWKS Endpoint** - Network connectivity issues
4. **Missing Key Vault Access** - Cannot retrieve required secrets

---

## Test Results by Category

### 1. Kong Gateway Health & Configuration (4 tests)

| Test | Status | Issue |
|------|--------|-------|
| Kong health endpoint should respond | ❌ FAILED | Connection timeout (status: 0) |
| Kong services endpoint should list configured services | ❌ FAILED | Timeout 15000ms exceeded |
| Kong routes endpoint should list configured routes | ❌ FAILED | Timeout 15000ms exceeded |
| Zitadel JWKS endpoint should be accessible | ⏭️ SKIPPED | Network connectivity issue |

**Root Cause:** Kong Container App is failing to start due to PostgreSQL authentication issues.

**Log Evidence:**
```
F 2026/01/28 10:49:39 [error] 1#0: init_by_lua error: 
/usr/local/share/lua/5.1/kong/init.lua:661: [PostgreSQL error] 
failed to retrieve PostgreSQL server_version_num: authentication exchange unsuccessful
```

### 2. Zitadel Authentication Flows (4 tests)

| Test | Status | Issue |
|------|--------|-------|
| User can navigate to login page | ❌ FAILED | ERR_NAME_NOT_RESOLVED |
| Registration flow creates new user | ❌ FAILED | ERR_NAME_NOT_RESOLVED |
| Login flow authenticates existing user | ❌ FAILED | ERR_NAME_NOT_RESOLVED |
| JWT token can be extracted and validated | ❌ FAILED | ERR_NAME_NOT_RESOLVED |

**Root Cause:** KombiSphere application is not deployed at https://app.kombify.io

### 3. Kong JWT Validation (3 tests)

| Test | Status | Issue |
|------|--------|-------|
| API call without JWT returns 401 | ❌ FAILED | Connection timeout |
| API call with invalid JWT returns 401 | ❌ FAILED | Connection timeout |
| Public catalog endpoint works without JWT | ❌ FAILED | Connection timeout |

**Root Cause:** Kong Gateway is not accessible due to PostgreSQL connection failure

### 4. Dashboard Access Control (2 tests)

| Test | Status | Issue |
|------|--------|-------|
| Unauthenticated user is redirected to login | ❌ FAILED | SecurityError: localStorage access denied |
| Dashboard shows user info when authenticated | ❌ FAILED | ERR_NAME_NOT_RESOLVED |

**Root Cause:** Application not deployed, and cross-origin issues with localStorage

### 5. Performance Metrics (3 tests)

| Test | Status | Issue |
|------|--------|-------|
| Kong health endpoint response time < 500ms | ❌ FAILED | Timeout |
| Public catalog endpoint response time < 1000ms | ❌ FAILED | Timeout |
| Zitadel JWKS endpoint response time < 1000ms | ⏭️ SKIPPED | Network issue |

**Root Cause:** Services not accessible

### 6. Complete E2E Flow (2 tests)

| Test | Status | Issue |
|------|--------|-------|
| Full authentication flow metrics | ❌ FAILED | Flow failed - page not accessible |
| Session persistence across page refreshes | ❌ FAILED | ERR_NAME_NOT_RESOLVED |

---

## Infrastructure Status

### Kong Gateway Container App

```bash
# Container App Status
Name: ca-kong-kombify-prod
Provisioning State: Succeeded
FQDN: ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io
```

**Issue:** Container starts but fails to initialize due to PostgreSQL authentication.

**Environment Variables Configured:**
- REDIS_HOST: secretRef (redis-host)
- REDIS_PORT: 6380
- REDIS_PASSWORD: secretRef (redis-password)
- REDIS_SSL: true
- KONG_PG_HOST: secretRef (kong-pg-host)
- KONG_PG_USER: secretRef (kong-pg-user)
- KONG_PG_PASSWORD: secretRef (kong-pg-password)
- KONG_PG_DATABASE: secretRef (kong-pg-database)

### Required Secrets (Missing from Key Vault)

The following secrets need to be created in Azure Key Vault `kv-kombify-prod`:

| Secret Name | Purpose | Status |
|-------------|---------|--------|
| kong-admin-token | Kong admin API token | ❌ Missing |
| kong-pg-host | PostgreSQL host | ❌ Missing |
| kong-pg-user | PostgreSQL username | ❌ Missing |
| kong-pg-password | PostgreSQL password | ❌ Missing |
| kong-pg-database | PostgreSQL database | ❌ Missing |
| redis-host | Redis host | ❌ Missing |
| redis-password | Redis password | ❌ Missing |

---

## Configuration Fixes Required

### 1. Fix Kong PostgreSQL Connection

```bash
# Create PostgreSQL database for Kong
az postgres flexible-server db create \
  --resource-group rg-kombify-prod \
  --server-name psql-kombify-prod \
  --database-name kong

# Create Kong user
az postgres flexible-server execute \
  --name psql-kombify-prod \
  --resource-group rg-kombify-prod \
  --admin-user postgres \
  --admin-password <admin-password> \
  --query "CREATE USER kong WITH PASSWORD '<password>'; GRANT ALL PRIVILEGES ON DATABASE kong TO kong;"

# Store secrets in Key Vault
az keyvault secret set --vault-name kv-kombify-prod --name kong-pg-host --value psql-kombify-prod.postgres.database.azure.com
az keyvault secret set --vault-name kv-kombify-prod --name kong-pg-user --value kong
az keyvault secret set --vault-name kv-kombify-prod --name kong-pg-password --value <password>
az keyvault secret set --vault-name kv-kombify-prod --name kong-pg-database --value kong
```

### 2. Fix Redis Configuration

```bash
# Store Redis secrets
az keyvault secret set --vault-name kv-kombify-prod --name redis-host --value redis-kombify-prod.redis.cache.windows.net
az keyvault secret set --vault-name kv-kombify-prod --name redis-password --value <primary-access-key>
```

### 3. Grant Key Vault Access to Managed Identity

```bash
# Get managed identity principal ID
az identity show --name id-kong-kombify-prod --resource-group rg-kombify-prod --query principalId -o tsv

# Grant Key Vault secrets user role
az keyvault set-policy \
  --name kv-kombify-prod \
  --object-id <principal-id> \
  --secret-permissions get list
```

### 4. Deploy KombiSphere Application

The application at https://app.kombify.io needs to be deployed:

```bash
# Deploy KombiSphere-Cloud to Azure
# (This requires the application code and deployment pipeline)
```

---

## E2E Test Suite Files Created

| File | Description |
|------|-------------|
| [`tests/e2e/kong-zitadel-flow.spec.ts`](tests/e2e/kong-zitadel-flow.spec.ts) | Main E2E test suite |
| [`tests/e2e/helpers/auth.ts`](tests/e2e/helpers/auth.ts) | Authentication helpers |
| [`playwright.config.ts`](playwright.config.ts) | Playwright configuration |
| [`.env.example`](.env.example) | Environment variables template |
| [`package.json`](package.json) | Dependencies and scripts |

### Test Suite Coverage

- ✅ Kong Gateway health checks
- ✅ Service and route validation
- ✅ Zitadel JWKS endpoint
- ✅ User registration flow
- ✅ User login flow
- ✅ JWT token validation
- ✅ Protected API access (401/403)
- ✅ Public endpoint access
- ✅ Dashboard access control
- ✅ Performance metrics
- ✅ Session persistence

---

## Performance Baseline

Once services are operational, the following performance targets should be met:

| Endpoint | Target | Description |
|----------|--------|-------------|
| Kong Health | < 500ms | Health check response |
| Kong API (authenticated) | < 1000ms | Protected API calls |
| Kong API (public) | < 500ms | Public catalog calls |
| Zitadel JWKS | < 1000ms | Key fetch for JWT validation |
| Auth Flow | < 5000ms | Complete login flow |

---

## Next Steps

### Immediate (Blocking)

1. **Create missing Key Vault secrets**
   - kong-pg-host, kong-pg-user, kong-pg-password, kong-pg-database
   - redis-host, redis-password
   - kong-admin-token

2. **Grant Key Vault access to managed identity**
   - Principal ID: id-kong-kombify-prod

3. **Restart Kong Container App**
   - Redeploy to pick up new secrets

4. **Deploy KombiSphere Application**
   - Configure DNS for app.kombify.io
   - Deploy application code

### Short-term

5. **Run E2E tests again** after infrastructure fixes
6. **Fix any failing tests** related to authentication flows
7. **Add CI/CD pipeline** for automated testing

### Long-term

8. **Add load testing** for Kong Gateway
9. **Implement monitoring** for Kong and Zitadel
10. **Document troubleshooting guide**

---

## Commands Reference

### Deploy Kong Configuration (After Fixes)

```bash
# Set environment variables
export REDIS_HOST=redis-kombify-prod.redis.cache.windows.net
export REDIS_PASSWORD=<from-keyvault>
export KONG_ADMIN_URL=https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:8001

# Deploy configuration
cd infrastructure/kong
./deploy.sh prod
```

### Run E2E Tests

```bash
# Install dependencies
npm install
npx playwright install

# Set environment
cp .env.example .env
# Edit .env with actual values

# Run tests
npm test

# Run specific test
npx playwright test tests/e2e/kong-zitadel-flow.spec.ts --project=chromium

# Run with UI
npm run test:ui
```

### Check Kong Status

```bash
# Health check
curl https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io/health

# Services
curl https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io/services

# Routes
curl https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io/routes
```

---

## Conclusion

The E2E test suite has been successfully created and is ready for use. However, the infrastructure has critical issues that prevent the tests from passing:

1. **Kong Gateway** is not operational due to missing PostgreSQL secrets in Key Vault
2. **KombiSphere Application** is not deployed
3. **Redis secrets** are missing from Key Vault

Once these infrastructure issues are resolved by creating the required Key Vault secrets and deploying the application, the E2E tests should pass and provide comprehensive validation of the Kong-Zitadel SSO integration.

---

*Report generated by kombify Platform Team*
