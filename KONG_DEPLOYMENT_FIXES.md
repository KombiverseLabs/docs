# Kong Gateway Deployment Fixes Required

> **Date:** 2026-01-28
> **Status:** 🔴 BLOCKED - Manual intervention required

## Current State

Kong Container App is deployed but failing to start due to database bootstrapping issues.

### Identified Issues

1. **PostgreSQL Host Mismatch**
   - Key Vault secret `kong-pg-host` points to: `psql-kombify-prod.postgres.database.azure.com`
   - Actual PostgreSQL server: `psql-kombify-db.postgres.database.azure.com`
   - **Fix:** Update Key Vault secret

2. **PostgreSQL Username Mismatch**
   - Key Vault secret `kong-pg-user` contains: `kongadmin`
   - Actual PostgreSQL admin: `kombifyadmin`
   - **Fix:** Update Key Vault secret

3. **PostgreSQL Password Mismatch**
   - Key Vault secret `kong-pg-password` contains wrong password
   - **Fix:** Update Key Vault secret with correct password

4. **Missing Kong Database**
   - Database `kong` was created manually
   - **Fix:** Add database creation to Bicep template

5. **Database Bootstrapping Required**
   - Kong migrations need to be run: `kong migrations bootstrap`
   - **Fix:** Add init container or job for migrations

6. **Redis Configuration**
   - Redis hostname needs verification in Key Vault

## Required Key Vault Secret Updates

```bash
# Update PostgreSQL host
az keyvault secret set --vault-name kv-kombify-prod --name kong-pg-host \
  --value "psql-kombify-db.postgres.database.azure.com"

# Update PostgreSQL user
az keyvault secret set --vault-name kv-kombify-prod --name kong-pg-user \
  --value "kombifyadmin"

# Update PostgreSQL password (use strong generated password)
az keyvault secret set --vault-name kv-kombify-prod --name kong-pg-password \
  --value "<generated-password>"

# Verify Redis host
az keyvault secret show --vault-name kv-kombify-prod --name redis-host
```

## Bicep Template Updates Required

### 1. Add PostgreSQL Database Resource for Kong

```bicep
resource kongDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'kong'
  properties: {}
}
```

### 2. Update Key Vault Secret References

In `infrastructure/bicep/main.bicep`:

```bicep
resource secretPostgresHost 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-pg-host'
  properties: {
    value: '${resourceNames.postgres}.postgres.database.azure.com'
  }
}

resource secretPostgresUser 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-pg-user'
  properties: {
    value: postgresAdminUser  // Use the same admin user
  }
}

resource secretPostgresPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'kong-pg-password'
  properties: {
    value: postgresAdminPassword  // Use the same admin password
  }
}
```

### 3. Add Kong Migrations Init Container

In `infrastructure/bicep/kong-app.bicep`, add to `template.initContainers`:

```bicep
initContainers: [
  {
    name: 'kong-migrations'
    image: kongImage
    command: ['kong', 'migrations', 'bootstrap']
    env: [
      {
        name: 'KONG_DATABASE'
        value: kongDatabase
      }
      {
        name: 'KONG_PG_HOST'
        secretRef: 'kong-pg-host'
      }
      {
        name: 'KONG_PG_USER'
        secretRef: 'kong-pg-user'
      }
      {
        name: 'KONG_PG_PASSWORD'
        secretRef: 'kong-pg-password'
      }
      {
        name: 'KONG_PG_DATABASE'
        secretRef: 'kong-pg-database'
      }
      {
        name: 'KONG_PG_PORT'
        value: kongPostgresPort
      }
      {
        name: 'KONG_PG_SSL'
        value: kongPostgresSsl
      }
      {
        name: 'KONG_PG_SSL_VERIFY'
        value: kongPostgresSslVerify
      }
    ]
    resources: {
      cpu: json('0.5')
      memory: '1Gi'
    }
  }
]
```

### 4. Fix Container App Dependencies

Add explicit dependency on kongDatabase:

```bicep
dependsOn: [
  kongDatabase
  secretPostgresPassword
  secretRedisPassword
]
```

## Deployment Script Updates

Update `infrastructure/kong/deploy.sh` to use Key Vault secrets exclusively:

```bash
# Fetch all secrets from Key Vault
fetch_keyvault_secrets() {
    log_info "Fetching secrets from Azure Key Vault..."
    
    export KONG_PG_HOST=$(az keyvault secret show --vault-name kv-kombify-prod --name kong-pg-host --query value -o tsv)
    export KONG_PG_USER=$(az keyvault secret show --vault-name kv-kombify-prod --name kong-pg-user --query value -o tsv)
    export KONG_PG_PASSWORD=$(az keyvault secret show --vault-name kv-kombify-prod --name kong-pg-password --query value -o tsv)
    export KONG_PG_DATABASE=$(az keyvault secret show --vault-name kv-kombify-prod --name kong-pg-database --query value -o tsv)
    export REDIS_HOST=$(az keyvault secret show --vault-name kv-kombify-prod --name redis-host --query value -o tsv)
    export REDIS_PASSWORD=$(az keyvault secret show --vault-name kv-kombify-prod --name redis-password --query value -o tsv)
    
    log_success "Secrets fetched from Key Vault"
}
```

## Prisma ORM Integration

For backend services that need PostgreSQL connections, use Prisma with connection string from Key Vault:

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
# DATABASE_URL format from Key Vault
postgresql://kombifyadmin:<password>@psql-kombify-db.postgres.database.azure.com:5432/kombify_stack?sslmode=require
```

## Recommended Actions

1. **Immediate:** Update Key Vault secrets with correct values
2. **Short-term:** Run Kong migrations manually to bootstrap database
3. **Medium-term:** Update Bicep templates to include init container for migrations
4. **Long-term:** Implement secret rotation automation

## Verification Steps

```bash
# 1. Verify Kong health
curl https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io/health

# 2. Check Kong Admin API
curl https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:8001/status

# 3. List services
curl https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:8001/services

# 4. List routes
curl https://ca-kong-kombify-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:8001/routes
```

## Next Steps

1. Grant Key Vault secret write permissions to deployment identity
2. Update all Key Vault secrets with correct values
3. Run Kong migrations manually
4. Restart Kong Container App
5. Verify deployment
6. Update Bicep templates to prevent future issues
