# kombify Secrets Management - Azure Key Vault

> **Version:** 2.0  
> **Date:** 2026-01-27  
> **Status:** ✅ MIGRATED - Azure Key Vault is now primary
> **Previous:** Doppler (deprecated)

## Migration Status

All secrets have been migrated from Doppler to **Azure Key Vault** (`kv-kombify-prod`).

### Why Azure Key Vault?

1. **Unified Platform**: Single Azure subscription for all infrastructure
2. **Cost**: Included in Azure spending (vs separate Doppler subscription)
3. **Integration**: Native integration with Azure Container Apps, App Service
4. **Security**: RBAC, managed identities, audit logging

---

## Azure Key Vault Structure

```
kv-kombify-prod (Azure Key Vault)
│
├── Authentication Secrets
│   ├── zitadel-issuer
│   ├── zitadel-client-id
│   ├── zitadel-client-secret
│   ├── zitadel-project-id
│   ├── zitadel-service-id
│   ├── zitadel-service-pat
│   ├── zitadel-admin-token
│   └── zitadel-webhook-secret
│
├── Payment Secrets
│   ├── stripe-secret-key
│   ├── stripe-publishable-key
│   ├── stripe-webhook-secret
│   ├── stripe-price-free
│   ├── stripe-price-pro
│   └── stripe-price-enterprise
│
├── Database Secrets
│   ├── db-admin-user
│   ├── db-admin-password
│   ├── db-server
│   ├── db-connection-portal
│   └── database-url
│
├── Infrastructure Secrets
│   ├── acr-server
│   ├── acr-password
│   ├── azure-credentials
│   └── appinsights-connection
│
├── Application Secrets
│   ├── auth-secret
│   ├── github-pat
│   ├── kombistack-url
│   ├── kombisim-url
│   └── stackkits-url
│
├── Email/SMTP Secrets
│   ├── smtp-host
│   ├── smtp-port
│   ├── smtp-user
│   └── smtp-from
│
└── URL Configuration
    ├── public-app-url
    ├── public-base-url
    └── admin-notify-to
```

---

## Accessing Secrets

### In GitHub Actions

```yaml
- name: Login to Azure
  uses: azure/login@v2
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Get secrets from Key Vault
  id: keyvault
  uses: Azure/get-keyvault-secrets@v1
  with:
    keyvault: kv-kombify-prod
    secrets: 'stripe-secret-key, zitadel-issuer, database-url'

- name: Use secrets
  run: |
    echo "Using Stripe key: ${{ steps.keyvault.outputs.stripe-secret-key }}"
```

### In Azure Container Apps (Managed Identity)

Container Apps use managed identity to access Key Vault:

```bash
# Container App configuration
az containerapp update \
  --name ca-kombify-stack-prod \
  --resource-group rg-kombify-prod \
  --set-env-vars \
    "STRIPE_KEY=secretref:stripe-secret-key"
```

### In Azure App Service (Managed Identity)

```bash
# App Service uses Key Vault references
az webapp config appsettings set \
  --name app-kombify-portal-prod \
  --resource-group rg-kombify-prod \
  --settings \
    "STRIPE_SECRET_KEY=@Microsoft.KeyVault(VaultName=kv-kombify-prod;SecretName=stripe-secret-key)"
```

### Local Development

For local development, use Azure CLI:

```bash
# Login to Azure
az login

# Get a secret
az keyvault secret show --vault-name kv-kombify-prod --name stripe-secret-key --query value -o tsv

# Export all secrets to .env (for local dev only)
./scripts/export-secrets-to-env.ps1
```

---

## Secret Rotation

### Automatic Rotation (Future)

Key Vault supports automatic rotation for:
- Storage account keys
- SQL Server passwords

### Manual Rotation Checklist

1. Generate new secret value
2. Set new version in Key Vault:
   ```bash
   az keyvault secret set --vault-name kv-kombify-prod --name <secret-name> --value <new-value>
   ```
3. Restart affected services:
   ```bash
   az webapp restart --name app-kombify-portal-prod --resource-group rg-kombify-prod
   az containerapp revision restart --name ca-kombify-stack-prod --resource-group rg-kombify-prod --revision <latest>
   ```
4. Verify services are healthy

---

## Deprecated: Doppler Configuration

> ⚠️ **DEPRECATED**: The following Doppler configuration is no longer used.
> All secrets have been migrated to Azure Key Vault.
> Doppler workspace can be archived/deleted.

Previously used:
- Project: `kombisphere-cloud`
- Project: `kombisphere-admin`
- Project: `kombisphere-api`
- Project: `kombistack`

---

## Audit & Compliance

Key Vault provides:
- Full audit logging via Azure Monitor
- RBAC access control
- Soft-delete and purge protection
- Network access restrictions (future)

View audit logs:
```bash
az monitor activity-log list --resource-group rg-kombify-prod --resource-type Microsoft.KeyVault/vaults
```
