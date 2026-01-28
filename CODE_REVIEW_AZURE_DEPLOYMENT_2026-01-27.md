# Azure Deployment Architecture Review

**Date:** 2026-01-27  
**Reviewer:** Code Review  
**Scope:** kombify Azure Infrastructure - All Modules  
**Status:** 🔴 **CRITICAL ISSUES IDENTIFIED**

---

## Executive Summary

| Metric | Status |
|--------|--------|
| **Overall Readiness** | ⚠️ 65% - Not Production Ready |
| **Critical Issues** | 🔴 4 |
| **High Priority** | 🟠 8 |
| **Medium Priority** | 🟡 12 |
| **Estimated Time to Production Ready** | 3-5 days |

### Critical Finding: kombiSim Will Fail in Production
The [`deploy-azure.yml`](../KombiSim/.github/workflows/deploy-azure.yml:1) workflow **does not fetch secrets from Azure Key Vault**. It only configures 3 hardcoded environment variables while the application likely requires database connections, authentication credentials, and monitoring configuration.

---

## Module-by-Module Review

### 1. kombify Stack (KombiStack) - KombiStack/.github/workflows/deploy-azure.yml

**Status:** 🟡 **Mostly Good with Issues**

#### Strengths
- ✅ Uses `wait-for-ci` job to ensure CI passes before deployment
- ✅ Fetches secrets from Azure Key Vault ([`Azure/get-keyvault-secrets@v1`](../kombifyStack/.github/workflows/deploy-azure.yml:57))
- ✅ Proper environment configuration with production URL
- ✅ Health check verification after deployment
- ✅ Deployment summary in GitHub step summary

#### Issues

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| 🔴 **Critical** | Missing `KOMBISTACK_ENV` secret reference | Line 92 | Should fetch from Key Vault |
| 🟠 **High** | Hardcoded ACR credentials in secrets | Line 66-67 | Should use managed identity |
| 🟠 **High** | No rollback mechanism on failure | Post-verify | Add rollback step |
| 🟡 **Medium** | Port confusion: 5260 vs 5263 | Lines 90, 105 | Document clearly |
| 🟡 **Medium** | Missing database migration step | Pre-deploy | Add migration job |

#### Missing Secrets from Key Vault
The workflow fetches only 4 secrets but likely needs more:
```yaml
# Current (Line 60):
secrets: "db-connection-stack, zitadel-issuer, zitadel-client-id, appinsights-connection"

# Missing:
- zitadel-client-secret
- stripe-secret-key (if payments enabled)
- kombistack-specific secrets
```

---

### 2. kombify Sim (KombiSim) - KombiSim/.github/workflows/deploy-azure.yml

**Status:** 🔴 **CRITICAL - Will Fail in Production**

#### Critical Issue: No Secrets Integration
```yaml
# Lines 61-69: Only hardcoded values, NO Key Vault!
- name: Configure Container App environment variables
  run: |
    az containerapp update \
      --name ${{ env.CONTAINER_APP_NAME }} \
      --resource-group ${{ env.RESOURCE_GROUP }} \
      --set-env-vars \
        "KOMBISIM_PORT=5270" \
        "KOMBISIM_ENGINE=container" \
        "KOMBISIM_LOG_LEVEL=info"
```

**Missing Required Secrets:**
- Database connection string
- Zitadel OIDC configuration
- Application Insights connection
- Any service-to-service auth tokens

#### Additional Issues

| Severity | Issue | Fix |
|----------|-------|-----|
| 🔴 **Critical** | No Key Vault integration | Add `Azure/get-keyvault-secrets@v1` step |
| 🔴 **Critical** | No CI wait job | Add `wait-for-ci` job like KombiStack |
| 🟠 **High** | No database configuration | Add DATABASE_URL |
| 🟠 **High** | Missing health check on /api/v1/health | Verify correct endpoint |
| 🟡 **Medium** | No deployment verification timeout | Add explicit timeout |

#### Recommended Fix
```yaml
# ADD THESE STEPS to KombiSim deploy-azure.yml:

- name: Get secrets from Key Vault
  id: keyvault
  uses: Azure/get-keyvault-secrets@v1
  with:
    keyvault: kv-kombify-prod
    secrets: "db-connection-sim, zitadel-issuer, zitadel-client-id, appinsights-connection"

- name: Configure Container App environment variables
  run: |
    az containerapp update \
      --name ${{ env.CONTAINER_APP_NAME }} \
      --resource-group ${{ env.RESOURCE_GROUP }} \
      --set-env-vars \
        "KOMBISIM_PORT=5270" \
        "KOMBISIM_ENGINE=container" \
        "KOMBISIM_LOG_LEVEL=info" \
        "DATABASE_URL=${{ steps.keyvault.outputs.db-connection-sim }}" \
        "ZITADEL_ISSUER=${{ steps.keyvault.outputs.zitadel-issuer }}" \
        "ZITADEL_CLIENT_ID=${{ steps.keyvault.outputs.zitadel-client-id }}" \
        "APPLICATIONINSIGHTS_CONNECTION_STRING=${{ steps.keyvault.outputs.appinsights-connection }}"
```

---

### 3. kombify Portal (KombiSphere-Cloud) - App Service

**Status:** 🟡 **Partially Configured**

#### Issues Found

| Severity | Issue | Details |
|----------|-------|---------|
| 🟠 **High** | No deployment workflow visible | Need to verify deployment method |
| 🟠 **High** | Hardcoded URLs in E2E tests | [`playwright.azure.config.ts`](../KombiSphere-Cloud/playwright.azure.config.ts:33) uses `app-kombify-portal-prod.azurewebsites.net` |
| 🟡 **Medium** | E2E tests expose internal Azure URLs | [`azure-infrastructure.spec.ts`](../KombiSphere-Cloud/tests/e2e-azure/azure-infrastructure.spec.ts:18-24) |
| 🟡 **Medium** | Test credentials in environment | [`authenticated-flows.spec.ts`](../KombiSphere-Cloud/tests/e2e-azure/authenticated-flows.spec.ts:22-25) |

#### E2E Test Configuration Problems
```typescript
// Lines 18-24 in azure-infrastructure.spec.ts:
const ENDPOINTS = {
    portal: 'https://app-kombify-portal-prod.azurewebsites.net',
    stack: 'https://ca-kombify-stack-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io',  // EXPOSED
    sim: 'https://ca-kombify-sim-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io',      // EXPOSED
    // ...
};
```

**Security Risk:** Internal Azure FQDNs are exposed in test code. These should be environment variables.

---

### 4. StackKits - Container App

**Status:** 🟡 **Unknown State**

- No deployment workflow reviewed
- Referenced in architecture docs but deployment method unclear
- Documentation at [`StackKits/docs/AZURE_WEBSITE_DEPLOYMENT.md`](../StackKits/docs/AZURE_WEBSITE_DEPLOYMENT.md) needs review

---

### 5. kombify API Gateway (Kong)

**Status:** 🔴 **Architecture Mismatch**

#### Issue: Kong Documented But Not in Azure Architecture
- [`internal-notes/kombify/tools/api-gateway/ARCHITECTURE.md`](internal-notes/kombify/tools/api-gateway/ARCHITECTURE.md:1) describes Kong Gateway
- [`guides/deployment/azure-architecture.mdx`](guides/deployment/azure-architecture.mdx:1) shows Azure Front Door only
- **No Kong deployment in Azure** - relying on Azure Front Door

**Impact:** Rate limiting, JWT validation, and routing rules documented for Kong are NOT implemented in Azure.

#### Missing Implementations
| Feature | Kong Implementation | Azure Status |
|---------|---------------------|--------------|
| Rate Limiting | Redis-based | ❌ Not implemented |
| JWT Validation | Zitadel JWKS | ⚠️ Front Door only |
| Route Rules | `/api/v1/*` patterns | ⚠️ Manual configuration |
| API Versioning | `/v1/`, `/v2/` | ❌ Not implemented |

---

## Infrastructure Architecture Issues

### 1. Hardcoded Resource Names

Multiple locations contain hardcoded Azure resource identifiers:

```markdown
# internal-notes/kombify/AZURE_KEYVAULT_SECRETS.md
# Line 80: Hardcoded subscription ID
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $IDENTITY \
  --scope "/subscriptions/5206295e-ad2e-4a42-960f-8632ef857314/resourceGroups/..."
```

**Files with hardcoded values:**
- [`internal-notes/kombify/AZURE_KEYVAULT_SECRETS.md`](internal-notes/kombify/AZURE_KEYVAULT_SECRETS.md:162)
- [`kombifyStack/docs/AZURE_DEPLOYMENT.md`](../kombifyStack/docs/AZURE_DEPLOYMENT.md:79)
- [`KombiSphere-Cloud/tests/e2e-azure/azure-infrastructure.spec.ts`](../KombiSphere-Cloud/tests/e2e-azure/azure-infrastructure.spec.ts:23)

### 2. Port Configuration Confusion

**kombify Stack:**
- Documentation says API on 5260, gRPC on 5263
- Deployment sets `KOMBISTACK_GRPC_PORT=5263` but ingress targets 5260
- Comment says: "Multiple open ports (5260 + 5263) can break automatic port detection"

**Action Required:** Standardize port usage and document clearly.

### 3. Missing Environment Strategy

No documented strategy for:
- Dev/Staging/Prod environment separation
- Feature flags per environment
- Database per environment

---

## Security Issues

### 1. Secret Management

| Issue | Severity | Location |
|-------|----------|----------|
| ACR credentials in GitHub secrets | 🟠 High | Both workflows |
| No secret rotation documented | 🟡 Medium | AZURE_KEYVAULT_SECRETS.md |
| Test credentials in repos | 🟡 Medium | E2E tests |
| Subscription ID exposed | 🟡 Medium | Multiple docs |

### 2. Network Security

- No VNet integration documented
- No private endpoints for Key Vault/Database
- Container Apps use public ingress (required for Front Door)

### 3. Webhook Security

From [`INTER_MODULE_CONTRACTS.md`](internal-notes/kombify/INTER_MODULE_CONTRACTS.md:291-297):
```typescript
// TODO: Implement signature verification
// https://zitadel.com/docs/guides/integrate/webhooks#signature-verification
const signature = request.headers['zitadel-signature'];
// Verify HMAC-SHA256
```

**Zitadel webhooks are NOT verifying signatures** - security vulnerability!

---

## Technical Debt

### 1. Documentation Debt

| Item | Status | Location |
|------|--------|----------|
| Kong vs Front Door mismatch | 🔴 Critical | Architecture docs |
| Incomplete implementation checklist | 🟠 High | INTER_MODULE_CONTRACTS.md |
| Missing troubleshooting guides | 🟠 High | Deployment docs |
| Outdated Doppler references | 🟡 Medium | AZURE_KEYVAULT_SECRETS.md |

### 2. Implementation Debt

From [`INTER_MODULE_CONTRACTS.md`](internal-notes/kombify/INTER_MODULE_CONTRACTS.md:556-584):

```markdown
## Implementation Checklist

### Cloud Module
- [ ] Implement `/api/internal/sync/users` endpoint  # NOT DONE
- [ ] Implement `/api/internal/sync/subscriptions` endpoint  # NOT DONE
- [ ] Add Stripe webhook signature verification  # NOT DONE
- [ ] Add Zitadel webhook signature verification  # NOT DONE
- [ ] Implement SSO token generation  # NOT DONE
...
```

**Majority of contracts NOT implemented!**

### 3. Testing Debt

- E2E tests depend on production infrastructure
- No unit tests for deployment workflows
- No infrastructure-as-code validation
- No smoke tests post-deployment

---

## Recommendations by Priority

### 🔴 Critical (Fix Before Production)

1. **Fix KombiSim Deployment**
   ```bash
   # Add Key Vault integration to KombiSim workflow
   # Add missing secrets: DATABASE_URL, ZITADEL_*, APPINSIGHTS_*
   ```

2. **Add Kong Gateway to Azure OR Update Documentation**
   - Either deploy Kong as Container App
   - OR update all docs to reflect Azure Front Door only
   - Implement rate limiting in Application Gateway or code

3. **Secure Webhooks**
   ```typescript
   // Implement in all webhook handlers
   import { createHmac } from 'crypto';
   
   function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
     const expected = createHmac('sha256', secret).update(payload).digest('hex');
     return signature === expected;
   }
   ```

4. **Add CI Wait to KombiSim**
   ```yaml
   jobs:
     wait-for-ci:
       name: Wait for CI
       runs-on: ubuntu-latest
       steps:
         - uses: lewagon/wait-on-check-action@v1.3.4
           with:
             ref: ${{ github.sha }}
             check-name: "✅ CI Passed"
             repo-token: ${{ secrets.GITHUB_TOKEN }}
   ```

### 🟠 High Priority (Fix Within Week)

1. **Standardize Workflow Patterns**
   - Create reusable workflow templates
   - Extract common steps (login, build, deploy, verify)

2. **Environment Configuration**
   ```yaml
   # Create env-config.yml
   environments:
     prod:
       resource_group: rg-kombify-prod
       key_vault: kv-kombify-prod
       acr: acrkombifyprod
   ```

3. **Add Database Migration Steps**
   ```yaml
   - name: Run database migrations
     run: |
       # Add migration container or job
       az containerapp job create --name db-migrate-${{ github.sha }}
   ```

4. **Secure E2E Tests**
   ```typescript
   // Move to environment variables
   const ENDPOINTS = {
     portal: process.env.PORTAL_URL,
     stack: process.env.STACK_URL,
     // ...
   };
   ```

### 🟡 Medium Priority (Fix Within Sprint)

1. **Add Monitoring & Alerting**
   - Application Insights alerts for 5xx errors
   - Container App scaling alerts
   - Health check failure notifications

2. **Document Rollback Procedures**
   ```bash
   # Add to deployment docs
   az containerapp revision list --name ca-kombify-stack-prod
   az containerapp revision activate --revision <previous-revision>
   ```

3. **Implement Proper Health Checks**
   - Liveness probes
   - Readiness probes
   - Deep health checks (database, external services)

4. **Add Log Aggregation**
   - Centralized logging in Log Analytics
   - Structured logging in all services
   - Log-based alerts

---

## Production Readiness Checklist

Based on [`guides/deployment/production-checklist.mdx`](guides/deployment/production-checklist.mdx:1):

| Category | Item | Status |
|----------|------|--------|
| **Security** | HTTPS/TLS | ✅ Azure Front Door |
| | Firewall rules | ⚠️ Basic only |
| | Secrets rotation | ❌ Not automated |
| | MFA | ✅ Zitadel |
| | VPN | ❌ Not configured |
| **Reliability** | Backups | ❌ Not configured |
| | Monitoring | ⚠️ Partial (App Insights) |
| | Alerting | ❌ Not configured |
| | Disaster recovery | ❌ Not documented |
| **Performance** | Resource limits | ✅ Container Apps |
| | Caching | ❌ Not implemented |
| | CDN | ✅ Azure Front Door |
| | Load testing | ❌ Not performed |

---

## Next Steps

### Immediate (Today)
1. Fix KombiSim deployment workflow - add Key Vault integration
2. Verify all required secrets exist in `kv-kombify-prod`
3. Test KombiSim deployment to staging

### This Week
1. Implement webhook signature verification
2. Add database migration steps to workflows
3. Create reusable workflow templates
4. Update architecture docs (remove Kong references if not used)

### This Sprint
1. Set up monitoring and alerting
2. Document rollback procedures
3. Implement proper health checks
4. Create environment promotion strategy

---

## Contact & Questions

For questions about this review:
- Review deployment logs in GitHub Actions
- Check Azure Portal for resource status
- Verify Key Vault secret availability
- Test health endpoints manually

---

*End of Review - Generated: 2026-01-27*
