# Kong Gateway Infrastructure Deployment Plan

> **Version:** 1.0.0  
> **Date:** 2026-01-28  
> **Status:** Draft  
> **Environment:** Azure Container Apps (Production)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Components](#infrastructure-components)
3. [Azure CLI Deployment Commands](#azure-cli-deployment-commands)
4. [Bicep Infrastructure-as-Code](#bicep-infrastructure-as-code)
5. [Kong Configuration](#kong-configuration)
6. [Key Vault Integration](#key-vault-integration)
7. [Service Mesh Routing](#service-mesh-routing)
8. [Health Checks & Monitoring](#health-checks--monitoring)
9. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Web App    │  │  Mobile Apps │  │   CLI Tools  │  │   External API Clients   │ │
│  │  kombify.io  │  │              │  │              │  │                          │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘ │
│         └─────────────────┴─────────────────┴──────────────────────┘                  │
│                                     │                                                 │
│                                     ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                      Azure Front Door (Global Edge)                             │ │
│  │  • SSL Termination    • WAF Protection    • DDoS Mitigation    • CDN           │ │
│  │  • Custom Domains: api.kombify.io, *.kombify.io                               │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                     │                                                 │
│                                     ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                      Kong Gateway (Container App)                               │ │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │                           PLUGINS                                       │    │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │    │ │
│  │  │  │   JWT    │ │   Rate   │ │   CORS   │ │ Request  │ │ Prometheus│      │    │ │
│  │  │  │  Verify  │ │  Limit   │ │          │ │Transform │ │  Metrics  │      │    │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │    │ │
│  │  └────────────────────────────────────────────────────────────────────────┘    │ │
│  │  Replicas: 2-5 (HA)    Port: 8000 (proxy) / 8001 (admin)                       │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                     │                                                 │
│         ┌───────────────────────────┼───────────────────────────┐                     │
│         │                           │                           │                     │
│         ▼                           ▼                           ▼                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────────────────┐ │
│  │   KombiStack     │  │   KombiSim       │  │   Administration                    │ │
│  │   :5260          │  │   :5270          │  │   :5380                             │ │
│  │                  │  │                  │  │                                     │ │
│  │ Stack Core API   │  │ Sim Engine API   │  │ Tools API + Internal Services       │ │
│  └──────────────────┘  └──────────────────┘  └─────────────────────────────────────┘ │
│         │                           │                           │                     │
│         └───────────────────────────┼───────────────────────────┘                     │
│                                     │                                                 │
│                                     ▼                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           SHARED SERVICES                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐ │ │
│  │  │  PostgreSQL │  │  Key Vault  │  │   Redis     │  │   Zitadel (OIDC)      │ │ │
│  │  │  (Kong DB)  │  │  (Secrets)  │  │  (Cache)    │  │   (auth.kombify.io)   │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
┌────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ Client │───▶│Front Door  │───▶│   Kong     │───▶│  Backend   │───▶│ PostgreSQL │
│        │ 1  │            │ 2  │  Gateway   │ 3  │  Service   │ 4  │   (Data)   │
└────────┘    └────────────┘    └────────────┘    └────────────┘    └────────────┘
                                     │
                                     │ 2a. Validate JWT via Zitadel JWKS
                                     ▼
                              ┌────────────┐
                              │  Zitadel   │
                              │   (OIDC)   │
                              └────────────┘
```

| Step | Action | Details |
|------|--------|---------|
| 1 | Client request | HTTPS to `api.kombify.io` |
| 2 | Front Door routing | WAF inspection, SSL termination, route to Kong |
| 2a | JWT validation | Kong validates token with Zitadel JWKS endpoint |
| 3 | Kong forwarding | Adds `X-User-*` headers, applies rate limits |
| 4 | Service processing | Backend handles request, returns response |

---

## Infrastructure Components

### Resource Naming Convention

| Component | Resource Type | Name Pattern | Example |
|-----------|---------------|--------------|---------|
| Resource Group | `Microsoft.Resources/resourceGroups` | `rg-kombify-{env}` | `rg-kombify-prod` |
| Container App Environment | `Microsoft.App/managedEnvironments` | `cae-kombify-{env}` | `cae-kombify-prod` |
| Kong Container App | `Microsoft.App/containerApps` | `ca-kombify-kong-{env}` | `ca-kombify-kong-prod` |
| PostgreSQL Server | `Microsoft.DBforPostgreSQL/flexibleServers` | `psql-kombify-{env}` | `psql-kombify-prod` |
| Key Vault | `Microsoft.KeyVault/vaults` | `kv-kombify-{env}` | `kv-kombify-prod` |
| Redis Cache | `Microsoft.Cache/redis` | `redis-kombify-{env}` | `redis-kombify-prod` |
| Managed Identity | `Microsoft.ManagedIdentity/userAssignedIdentities` | `id-kombify-kong-{env}` | `id-kombify-kong-prod` |
| Front Door Profile | `Microsoft.Cdn/profiles` | `afd-kombify-{env}` | `afd-kombify-prod` |

### Service Port Mapping

| Service | Container App | Internal Port | External Port | Kong Route |
|---------|---------------|---------------|---------------|------------|
| KombiStack | `ca-kombify-stack-prod` | 5260 | - | `/v1/stacks/*` |
| KombiSim | `ca-kombify-sim-prod` | 5270 | - | `/v1/simulations/*` |
| Administration | `ca-kombify-admin-prod` | 5380 | - | `/v1/admin/*`, `/v1/catalog/*` |
| Kong Proxy | `ca-kombify-kong-prod` | 8000 | 443 (via Front Door) | - |
| Kong Admin | `ca-kombify-kong-prod` | 8001 | Internal only | `/status` |

---

## Azure CLI Deployment Commands

### Prerequisites

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "kombify-production"

# Set variables
ENV="prod"
LOCATION="westeurope"
RG="rg-kombify-${ENV}"
```

### Step 1: Create Resource Group

```bash
az group create \
  --name ${RG} \
  --location ${LOCATION}
```

### Step 2: Create PostgreSQL Flexible Server

```bash
# Create PostgreSQL server
az postgres flexible-server create \
  --resource-group ${RG} \
  --name psql-kombify-${ENV} \
  --location ${LOCATION} \
  --tier GeneralPurpose \
  --sku-name Standard_D2s_v3 \
  --storage-size 128 \
  --version 15 \
  --admin-user kongadmin \
  --admin-password $(openssl rand -base64 32) \
  --public-access Disabled \
  --vnet kombify-vnet \
  --subnet postgres-subnet

# Create Kong database
az postgres flexible-server db create \
  --resource-group ${RG} \
  --server-name psql-kombify-${ENV} \
  --database-name kong

# Store credentials in Key Vault
az keyvault secret set \
  --vault-name kv-kombify-${ENV} \
  --name kong-pg-host \
  --value "psql-kombify-${ENV}.postgres.database.azure.com"

az keyvault secret set \
  --vault-name kv-kombify-${ENV} \
  --name kong-pg-user \
  --value "kongadmin"

az keyvault secret set \
  --vault-name kv-kombify-${ENV} \
  --name kong-pg-password \
  --value "${PG_PASSWORD}"
```

### Step 3: Create Redis Cache for Rate Limiting

```bash
az redis create \
  --resource-group ${RG} \
  --name redis-kombify-${ENV} \
  --location ${LOCATION} \
  --sku Basic \
  --vm-size c0

# Get connection string
REDIS_KEY=$(az redis list-keys \
  --resource-group ${RG} \
  --name redis-kombify-${ENV} \
  --query primaryKey -o tsv)

az keyvault secret set \
  --vault-name kv-kombify-${ENV} \
  --name redis-password \
  --value "${REDIS_KEY}"
```

### Step 4: Create Managed Identity for Kong

```bash
# Create user-assigned managed identity
az identity create \
  --resource-group ${RG} \
  --name id-kombify-kong-${ENV} \
  --location ${LOCATION}

# Get identity details
IDENTITY_ID=$(az identity show \
  --resource-group ${RG} \
  --name id-kombify-kong-${ENV} \
  --query id -o tsv)

PRINCIPAL_ID=$(az identity show \
  --resource-group ${RG} \
  --name id-kombify-kong-${ENV} \
  --query principalId -o tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name kv-kombify-${ENV} \
  --object-id ${PRINCIPAL_ID} \
  --secret-permissions get list
```

### Step 5: Create Container App Environment

```bash
# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group ${RG} \
  --name log-kombify-${ENV} \
  --location ${LOCATION}

WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group ${RG} \
  --name log-kombify-${ENV} \
  --query customerId -o tsv)

WORKSPACE_KEY=$(az monitor log-analytics workspace get-shared-keys \
  --resource-group ${RG} \
  --name log-kombify-${ENV} \
  --query primarySharedKey -o tsv)

# Create Container App Environment
az containerapp env create \
  --resource-group ${RG} \
  --name cae-kombify-${ENV} \
  --location ${LOCATION} \
  --logs-workspace-id ${WORKSPACE_ID} \
  --logs-workspace-key ${WORKSPACE_KEY}
```

### Step 6: Deploy Kong Container App

```bash
# Create Kong Container App
az containerapp create \
  --resource-group ${RG} \
  --name ca-kombify-kong-${ENV} \
  --environment cae-kombify-${ENV} \
  --image kong:3.9 \
  --target-port 8000 \
  --ingress external \
  --min-replicas 2 \
  --max-replicas 5 \
  --cpu 1 \
  --memory 2Gi \
  --user-assigned-identities ${IDENTITY_ID} \
  --secrets \
    "kong-pg-password=secretref:kong-pg-password" \
    "redis-password=secretref:redis-password" \
  --env-vars \
    "KONG_DATABASE=postgres" \
    "KONG_PG_HOST=secretref:kong-pg-host" \
    "KONG_PG_USER=secretref:kong-pg-user" \
    "KONG_PG_PASSWORD=secretref:kong-pg-password" \
    "KONG_PG_DATABASE=kong" \
    "KONG_PLUGINS=bundled,jwt,rate-limiting,cors,request-transformer,prometheus" \
    "KONG_PROXY_LISTEN=0.0.0.0:8000" \
    "KONG_ADMIN_LISTEN=0.0.0.0:8001" \
    "KONG_PROXY_ACCESS_LOG=/dev/stdout" \
    "KONG_ADMIN_ACCESS_LOG=/dev/stdout" \
    "KONG_PROXY_ERROR_LOG=/dev/stderr" \
    "KONG_ADMIN_ERROR_LOG=/dev/stderr" \
    "KONG_LOG_LEVEL=info" \
    "REDIS_HOST=redis-kombify-${ENV}.redis.cache.windows.net" \
    "REDIS_PASSWORD=secretref:redis-password" \
    "ZITADEL_ISSUER=https://auth.kombify.io" \
    "ZITADEL_JWKS_URL=https://auth.kombify.io/oauth/v2/keys"
```

### Step 7: Run Kong Migrations

```bash
# Run migrations as a one-time job
az containerapp job create \
  --resource-group ${RG} \
  --name kong-migrations \
  --environment cae-kombify-${ENV} \
  --image kong:3.9 \
  --cpu 0.5 \
  --memory 1Gi \
  --user-assigned-identities ${IDENTITY_ID} \
  --secrets \
    "kong-pg-password=secretref:kong-pg-password" \
  --env-vars \
    "KONG_DATABASE=postgres" \
    "KONG_PG_HOST=secretref:kong-pg-host" \
    "KONG_PG_USER=secretref:kong-pg-user" \
    "KONG_PG_PASSWORD=secretref:kong-pg-password" \
    "KONG_PG_DATABASE=kong" \
  --trigger-type Manual

# Execute migration job
az containerapp job execution start \
  --resource-group ${RG} \
  --name kong-migrations \
  --command "kong migrations bootstrap"
```

### Step 8: Configure Azure Front Door

```bash
# Create Front Door profile
az afd profile create \
  --resource-group ${RG} \
  --profile-name afd-kombify-${ENV} \
  --sku Premium_AzureFrontDoor

# Create origin group
az afd origin-group create \
  --resource-group ${RG} \
  --profile-name afd-kombify-${ENV} \
  --origin-group-name kong-origin-group \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 30 \
  --probe-path /health \
  --sample-size 4 \
  --successful-samples-required 3 \
  --additional-latency-in-milliseconds 50

# Get Kong FQDN
KONG_FQDN=$(az containerapp show \
  --resource-group ${RG} \
  --name ca-kombify-kong-${ENV} \
  --query properties.configuration.ingress.fqdn -o tsv)

# Add Kong as origin
az afd origin create \
  --resource-group ${RG} \
  --profile-name afd-kombify-${ENV} \
  --origin-group-name kong-origin-group \
  --origin-name kong-origin \
  --host-name ${KONG_FQDN} \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 100

# Create endpoint
az afd endpoint create \
  --resource-group ${RG} \
  --profile-name afd-kombify-${ENV} \
  --endpoint-name api-kombify \
  --enabled-state Enabled

# Create route
az afd route create \
  --resource-group ${RG} \
  --profile-name afd-kombify-${ENV} \
  --endpoint-name api-kombify \
  --route-name api-route \
  --origin-group kong-origin-group \
  --supported-protocols Https \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --patterns-to-match "/*"
```

---

## Bicep Infrastructure-as-Code

### Main Template: `main.bicep`

```bicep
// main.bicep
@description('Environment name')
param environment string = 'prod'

@description('Azure region')
param location string = resourceGroup().location

@description('Kong Docker image tag')
param kongImage string = 'kong:3.9'

// Variables
var prefix = 'kombify-${environment}'

// PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: 'psql-${prefix}'
  location: location
  sku: {
    name: 'Standard_D2s_v3'
    tier: 'GeneralPurpose'
  }
  properties: {
    version: '15'
    administratorLogin: 'kongadmin'
    administratorLoginPassword: keyVault.getSecret('kong-pg-password')
    storage: {
      storageSizeGB: 128
    }
    highAvailability: {
      mode: 'ZoneRedundant'
    }
    network: {
      publicNetworkAccess: 'Disabled'
    }
  }
}

// Kong Database
resource kongDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: postgresServer
  name: 'kong'
  properties: {}
}

// Managed Identity for Kong
resource kongIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-kong-${prefix}'
  location: location
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: 'kv-${prefix}'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: kongIdentity.properties.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${prefix}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

// Container App Environment
resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'cae-${prefix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Redis Cache for Rate Limiting
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: 'redis-${prefix}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
  }
}

// Kong Container App
resource kongApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'ca-kong-${prefix}'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${kongIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8000
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      secrets: [
        {
          name: 'kong-pg-host'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-pg-host'
          identity: kongIdentity.id
        }
        {
          name: 'kong-pg-user'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-pg-user'
          identity: kongIdentity.id
        }
        {
          name: 'kong-pg-password'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/kong-pg-password'
          identity: kongIdentity.id
        }
        {
          name: 'redis-password'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/redis-password'
          identity: kongIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'kong'
          image: kongImage
          resources: {
            cpu: json('1')
            memory: '2Gi'
          }
          env: [
            {
              name: 'KONG_DATABASE'
              value: 'postgres'
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
              value: 'kong'
            }
            {
              name: 'KONG_PLUGINS'
              value: 'bundled,jwt,rate-limiting,cors,request-transformer,prometheus'
            }
            {
              name: 'KONG_PROXY_LISTEN'
              value: '0.0.0.0:8000'
            }
            {
              name: 'KONG_ADMIN_LISTEN'
              value: '0.0.0.0:8001'
            }
            {
              name: 'KONG_PROXY_ACCESS_LOG'
              value: '/dev/stdout'
            }
            {
              name: 'KONG_ADMIN_ACCESS_LOG'
              value: '/dev/stdout'
            }
            {
              name: 'KONG_PROXY_ERROR_LOG'
              value: '/dev/stderr'
            }
            {
              name: 'KONG_ADMIN_ERROR_LOG'
              value: '/dev/stderr'
            }
            {
              name: 'KONG_LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'REDIS_HOST'
              value: redisCache.properties.hostName
            }
            {
              name: 'REDIS_PASSWORD'
              secretRef: 'redis-password'
            }
            {
              name: 'ZITADEL_ISSUER'
              value: 'https://auth.kombify.io'
            }
            {
              name: 'ZITADEL_JWKS_URL'
              value: 'https://auth.kombify.io/oauth/v2/keys'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/status'
                port: 8001
              }
              initialDelaySeconds: 30
              periodSeconds: 10
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/status'
                port: 8001
              }
              initialDelaySeconds: 5
              periodSeconds: 5
            }
          ]
        }
      ]
      scale: {
        minReplicas: 2
        maxReplicas: 5
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output kongFqdn string = kongApp.properties.configuration.ingress.fqdn
output postgresHost string = postgresServer.properties.fullyQualifiedDomainName
output redisHost string = redisCache.properties.hostName
output keyVaultUri string = keyVault.properties.vaultUri
```

### Key Vault Secrets Template: `secrets.bicep`

```bicep
// secrets.bicep
@description('Environment name')
param environment string = 'prod'

@description('PostgreSQL admin password')
@secure()
param pgPassword string

@description('Redis access key')
@secure()
param redisKey string

var prefix = 'kombify-${environment}'

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' existing = {
  name: 'kv-${prefix}'
}

// PostgreSQL secrets
resource secretPgHost 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'kong-pg-host'
  properties: {
    value: 'psql-${prefix}.postgres.database.azure.com'
  }
}

resource secretPgUser 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'kong-pg-user'
  properties: {
    value: 'kongadmin'
  }
}

resource secretPgPassword 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'kong-pg-password'
  properties: {
    value: pgPassword
  }
}

// Redis secrets
resource secretRedisPassword 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'redis-password'
  properties: {
    value: redisKey
  }
}

// Kong-specific secrets
resource secretKongAdminToken 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  parent: keyVault
  name: 'kong-admin-token'
  properties: {
    value: uniqueString(resourceGroup().id, 'kong-admin')
  }
}
```

---

## Kong Configuration

### Declarative Configuration: `kong-config.yaml`

```yaml
# kong-config.yaml
_format_version: "3.0"
_transform: true

# ============================================
# SERVICES
# ============================================

services:
  # Administration Service (Tool Catalog, User Management)
  - name: administration
    url: http://ca-kombify-admin-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5380
    protocol: http
    connect_timeout: 60000
    write_timeout: 60000
    read_timeout: 60000
    routes:
      - name: admin-routes
        paths:
          - /v1/admin
          - /v1/tools
        strip_path: false
        preserve_host: false
        methods:
          - GET
          - POST
          - PUT
          - PATCH
          - DELETE
      - name: internal-routes
        paths:
          - /api/internal
        strip_path: false
        preserve_host: false
    plugins:
      - name: jwt
        config:
          uri_param_names: []
          cookie_names: []
          key_claim_name: iss
          secret_is_base64: false
          claims_to_verify:
            - exp
            - iss
          maximum_expiration: 3600
      - name: rate-limiting
        config:
          minute: 100
          hour: 5000
          policy: redis
          redis_host: ${REDIS_HOST}
          redis_password: ${REDIS_PASSWORD}
          fault_tolerant: true
          hide_client_headers: false
      - name: request-transformer
        config:
          add:
            headers:
              - X-Forwarded-By:Kong

  # Public Catalog (No authentication required)
  - name: catalog-public
    url: http://ca-kombify-admin-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5380
    protocol: http
    routes:
      - name: catalog-public-route
        paths:
          - /v1/catalog/public
        strip_path: false
        preserve_host: false
        methods:
          - GET
    plugins:
      - name: rate-limiting
        config:
          minute: 500
          hour: 10000
          policy: redis
          redis_host: ${REDIS_HOST}
          redis_password: ${REDIS_PASSWORD}
          fault_tolerant: true
          hide_client_headers: false
      - name: cors
        config:
          origins:
            - "https://kombify.io"
            - "https://*.kombify.io"
            - "https://app.kombify.io"
          methods:
            - GET
            - OPTIONS
          headers:
            - Content-Type
            - Authorization
          max_age: 3600
          credentials: false

  # KombiStack Service
  - name: kombistack
    url: http://ca-kombify-stack-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5260
    protocol: http
    connect_timeout: 60000
    write_timeout: 120000
    read_timeout: 120000
    routes:
      - name: kombistack-routes
        paths:
          - /v1/stacks
          - /v1/orchestrator
          - /api/v1/stacks
        strip_path: false
        preserve_host: false
        methods:
          - GET
          - POST
          - PUT
          - PATCH
          - DELETE
    plugins:
      - name: jwt
        config:
          uri_param_names: []
          cookie_names: []
          key_claim_name: iss
          secret_is_base64: false
          claims_to_verify:
            - exp
            - iss
      - name: rate-limiting
        config:
          minute: 200
          hour: 10000
          policy: redis
          redis_host: ${REDIS_HOST}
          redis_password: ${REDIS_PASSWORD}
          fault_tolerant: true
          hide_client_headers: false
      - name: request-transformer
        config:
          add:
            headers:
              - X-Service-Name:KombiStack
              - X-Forwarded-By:Kong

  # KombiSim Service
  - name: kombisim
    url: http://ca-kombify-sim-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5270
    protocol: http
    connect_timeout: 60000
    write_timeout: 60000
    read_timeout: 60000
    routes:
      - name: kombisim-routes
        paths:
          - /v1/simulations
          - /v1/nodes
          - /api/v1/simulations
        strip_path: false
        preserve_host: false
        methods:
          - GET
          - POST
          - PUT
          - PATCH
          - DELETE
    plugins:
      - name: jwt
        config:
          uri_param_names: []
          cookie_names: []
          key_claim_name: iss
          secret_is_base64: false
          claims_to_verify:
            - exp
            - iss
      - name: rate-limiting
        config:
          minute: 50
          hour: 2000
          policy: redis
          redis_host: ${REDIS_HOST}
          redis_password: ${REDIS_PASSWORD}
          fault_tolerant: true
          hide_client_headers: false
      - name: request-transformer
        config:
          add:
            headers:
              - X-Service-Name:KombiSim
              - X-Forwarded-By:Kong

  # KombiSphere Portal (App Service)
  - name: kombisphere
    url: http://app-kombify-portal-prod.azurewebsites.net
    protocol: http
    routes:
      - name: portal-routes
        paths:
          - /v1/portal
          - /api/internal/sso
        strip_path: false
        preserve_host: false
    plugins:
      - name: rate-limiting
        config:
          minute: 300
          hour: 10000
          policy: redis
          redis_host: ${REDIS_HOST}
          redis_password: ${REDIS_PASSWORD}
          fault_tolerant: true

  # Health Check Service (internal)
  - name: health
    url: http://localhost:8001
    protocol: http
    routes:
      - name: health-route
        paths:
          - /health
        strip_path: false
        plugins:
          - name: key-auth
            enabled: false
          - name: jwt
            enabled: false

# ============================================
# GLOBAL PLUGINS
# ============================================

plugins:
  # Global CORS Configuration
  - name: cors
    config:
      origins:
        - "https://kombify.io"
        - "https://*.kombify.io"
        - "https://app.kombify.io"
        - "http://localhost:5173"
        - "http://localhost:3000"
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Authorization
        - Content-Type
        - X-Request-ID
        - X-User-ID
        - X-User-Email
        - X-User-Roles
        - X-Org-ID
        - X-Forwarded-By
      exposed_headers:
        - X-RateLimit-Limit
        - X-RateLimit-Remaining
        - X-RateLimit-Reset
        - X-Request-ID
      max_age: 3600
      credentials: true

  # Prometheus Metrics
  - name: prometheus
    config:
      per_consumer: true
      status_code_metrics: true
      latency_metrics: true
      bandwidth_metrics: true
      upstream_health_metrics: true

  # Request ID Generation
  - name: correlation-id
    config:
      header_name: X-Request-ID
      generator: uuid
      echo_downstream: true

# ============================================
# JWT CONSUMERS (Zitadel)
# ============================================

consumers:
  - username: zitadel-jwt
    custom_id: zitadel-oidc-provider
    jwt_secrets:
      - algorithm: RS256
        key: https://auth.kombify.io
        rsa_public_key: |
          -----BEGIN PUBLIC KEY-----
          # Fetched dynamically from Zitadel JWKS endpoint
          # https://auth.kombify.io/oauth/v2/keys
          -----END PUBLIC KEY-----

# ============================================
# UPSTREAM HEALTH CHECKS
# ============================================

upstreams:
  - name: administration-upstream
    targets:
      - target: ca-kombify-admin-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5380
        weight: 100
    healthchecks:
      active:
        http_path: /health
        timeout: 10
        interval: 30
        unhealthy:
          http_statuses:
            - 429
            - 500
            - 502
            - 503
          tcp_failures: 2
          timeouts: 2
          http_failures: 2
          interval: 10
        healthy:
          http_statuses:
            - 200
            - 302
          successes: 2
          interval: 10

  - name: kombistack-upstream
    targets:
      - target: ca-kombify-stack-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5260
        weight: 100
    healthchecks:
      active:
        http_path: /health
        timeout: 10
        interval: 30

  - name: kombisim-upstream
    targets:
      - target: ca-kombify-sim-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:5270
        weight: 100
    healthchecks:
      active:
        http_path: /health
        timeout: 10
        interval: 30
```

### Configuration Deployment Script: `deploy-config.sh`

```bash
#!/bin/bash
# deploy-config.sh - Deploy Kong configuration using deck

set -e

ENV=${1:-prod}
KONG_ADMIN_URL=${KONG_ADMIN_URL:-"http://localhost:8001"}

echo "Deploying Kong configuration for environment: ${ENV}"

# Check if deck is installed
if ! command -v deck &> /dev/null; then
    echo "Installing deck..."
    # macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew tap kong/deck
        brew install deck
    # Linux
    else
        curl -sL https://github.com/kong/deck/releases/download/v1.35.0/deck_1.35.0_linux_amd64.tar.gz | tar -xz
        sudo mv deck /usr/local/bin/
    fi
fi

# Validate configuration
echo "Validating configuration..."
deck validate -s kong-config.yaml

# Sync configuration to Kong
echo "Syncing configuration to Kong..."
deck sync -s kong-config.yaml --kong-addr ${KONG_ADMIN_URL}

# Verify configuration
echo "Verifying services..."
curl -s ${KONG_ADMIN_URL}/services | jq '.data[].name'

echo "Verifying routes..."
curl -s ${KONG_ADMIN_URL}/routes | jq '.data[].name'

echo "Configuration deployed successfully!"
```

---

## Key Vault Integration

### Required Secrets

| Secret Name | Purpose | Used By | Source |
|-------------|---------|---------|--------|
| `kong-pg-host` | PostgreSQL server hostname | Kong Container App | Auto-generated |
| `kong-pg-user` | PostgreSQL admin username | Kong Container App | Static: `kongadmin` |
| `kong-pg-password` | PostgreSQL admin password | Kong Container App | Manual/Generated |
| `redis-password` | Redis access key | Kong Container App | Azure Redis |
| `kong-admin-token` | Kong admin API token | Kong Admin API | Generated |
| `zitadel-issuer` | OIDC issuer URL | Kong JWT plugin | Static: `https://auth.kombify.io` |
| `zitadel-client-id` | Zitadel client ID | Kong JWT validation | Zitadel Console |

### Environment Variable Mapping

```yaml
# Kong Container App Environment Variables
# Maps Key Vault secrets to container environment

KONG_DATABASE: postgres                                    # Static value
KONG_PG_HOST: secretref:kong-pg-host                       # From Key Vault
KONG_PG_USER: secretref:kong-pg-user                       # From Key Vault
KONG_PG_PASSWORD: secretref:kong-pg-password               # From Key Vault
KONG_PG_DATABASE: kong                                     # Static value
KONG_PG_PORT: 5432                                         # Static value
KONG_PG_SSL: "on"                                          # Static value
KONG_PG_SSL_VERIFY: "off"                                  # Static value (trust Azure CA)
KONG_PLUGINS: bundled,jwt,rate-limiting,cors,request-transformer,prometheus  # Static value
KONG_PROXY_LISTEN: 0.0.0.0:8000                            # Static value
KONG_ADMIN_LISTEN: 0.0.0.0:8001                            # Static value
KONG_ADMIN_GUI_URL: https://admin.kombify.io               # Static value
KONG_ADMIN_API_URI: https://admin.kombify.io               # Static value
KONG_PROXY_ACCESS_LOG: /dev/stdout                         # Static value
KONG_ADMIN_ACCESS_LOG: /dev/stdout                         # Static value
KONG_PROXY_ERROR_LOG: /dev/stderr                          # Static value
KONG_ADMIN_ERROR_LOG: /dev/stderr                          # Static value
KONG_LOG_LEVEL: info                                       # Static value
REDIS_HOST: redis-kombify-prod.redis.cache.windows.net     # From Redis resource
REDIS_PORT: 6380                                           # Static value (SSL)
REDIS_PASSWORD: secretref:redis-password                   # From Key Vault
REDIS_SSL: "true"                                          # Static value
ZITADEL_ISSUER: https://auth.kombify.io                    # Static value
ZITADEL_JWKS_URL: https://auth.kombify.io/oauth/v2/keys    # Static value
```

### Managed Identity Configuration

```bash
# Assign Key Vault Reader role to managed identity
az role assignment create \
  --assignee-object-id ${PRINCIPAL_ID} \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.KeyVault/vaults/kv-kombify-${ENV}

# Alternative: Use Key Vault access policies
az keyvault set-policy \
  --name kv-kombify-${ENV} \
  --object-id ${PRINCIPAL_ID} \
  --secret-permissions get list
```

---

## Service Mesh Routing

### Internal Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SERVICE MESH ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  External Traffic                                                            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌──────────────────┐                                                       │
│  │  Azure Front Door│                                                       │
│  └────────┬─────────┘                                                       │
│           │ HTTPS (Edge)                                                     │
│           ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │   Kong Gateway   │◄──── JWT Validation, Rate Limiting, CORS              │
│  │   Port: 8000     │                                                       │
│  └────────┬─────────┘                                                       │
│           │ HTTP (Internal)                                                  │
│           ├─────────────────┬─────────────────┬─────────────┐               │
│           ▼                 ▼                 ▼             ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  KombiStack  │  │   KombiSim   │  │ Admin Center │  │ KombiSphere  │    │
│  │  :5260       │  │   :5270      │  │   :5380      │  │   :8080      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│        │                  │                  │             │                │
│        └──────────────────┴──────────────────┴─────────────┘                │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      SHARED SERVICES                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │  PostgreSQL │  │   Redis     │  │  Key Vault  │  │  Zitadel   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Internal Service-to-Service Routing

| Source | Destination | Route | Auth | Purpose |
|--------|-------------|-------|------|---------|
| Kong | KombiStack | `/v1/stacks/*` | JWT | Stack operations |
| Kong | KombiStack | `/v1/orchestrator/*` | JWT | AI orchestration |
| Kong | KombiSim | `/v1/simulations/*` | JWT | Simulation management |
| Kong | Administration | `/v1/admin/*` | JWT (Admin) | Admin operations |
| Kong | Administration | `/v1/catalog/public/*` | None | Public catalog |
| Kong | KombiSphere | `/v1/portal/*` | JWT | Portal API proxy |
| KombiSphere | Administration | `/api/internal/*` | Service JWT | Internal sync |

### mTLS Configuration (Future)

```yaml
# mTLS between Kong and upstream services (planned)
# Requires: Azure Service Mesh or custom CA

services:
  - name: kombistack
    url: https://ca-kombify-stack-prod.internal:5260
    protocol: https
    client_certificate:
      cert: /etc/kong/certs/client.crt
      key: /etc/kong/certs/client.key
    tls_verify: true
    tls_verify_depth: 2
    ca_certificates:
      - 123e4567-e89b-12d3-a456-426614174000
```

---

## Health Checks & Monitoring

### Kong Health Endpoints

| Endpoint | Port | Purpose | Access |
|----------|------|---------|--------|
| `/health` | 8000 (Proxy) | Basic health check | Public |
| `/status` | 8001 (Admin) | Detailed status | Internal only |
| `/metrics` | 8001 (Admin) | Prometheus metrics | Internal only |

### Container App Health Probes

```yaml
# Liveness Probe - Restarts container if unhealthy
livenessProbe:
  httpGet:
    path: /status
    port: 8001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# Readiness Probe - Removes from load balancer if not ready
readinessProbe:
  httpGet:
    path: /status
    port: 8001
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

# Startup Probe - Gives time for slow startup
startupProbe:
  httpGet:
    path: /status
    port: 8001
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 12  # 60 seconds total
```

### Azure Monitor Alerts

```bash
# Create alert for high error rate
az monitor metrics alert create \
  --resource-group ${RG} \
  --name "kong-high-error-rate" \
  --scopes /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.App/containerApps/ca-kombify-kong-${ENV} \
  --condition "count requests > 100 where statusCode == 5xx" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/microsoft.insights/actionGroups/kombify-alerts

# Create alert for high latency
az monitor metrics alert create \
  --resource-group ${RG} \
  --name "kong-high-latency" \
  --scopes /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.App/containerApps/ca-kombify-kong-${ENV} \
  --condition "avg responseTime > 1000" \
  --window-size 5m \
  --evaluation-frequency 1m
```

### Prometheus Metrics Export

```yaml
# Prometheus scrape configuration
scrape_configs:
  - job_name: 'kong'
    static_configs:
      - targets: ['ca-kombify-kong-prod.gentlemoss-1ad74075.westeurope.azurecontainerapps.io:8001']
    metrics_path: /metrics
    scheme: https
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Azure subscription and resource group created
- [ ] Key Vault provisioned with all required secrets
- [ ] PostgreSQL Flexible Server deployed with `kong` database
- [ ] Redis Cache provisioned for rate limiting
- [ ] Managed identity created and granted Key Vault access
- [ ] Container App Environment provisioned
- [ ] DNS records configured for `api.kombify.io`

### Kong Deployment

- [ ] Container App created with correct image and configuration
- [ ] Environment variables mapped from Key Vault secrets
- [ ] Health probes configured (liveness, readiness, startup)
- [ ] Scaling rules configured (min: 2, max: 5 replicas)
- [ ] Database migrations executed successfully
- [ ] Kong Admin API accessible internally

### Configuration

- [ ] Declarative configuration validated with `deck`
- [ ] Services configured for all upstream backends
- [ ] Routes defined with proper path matching
- [ ] JWT plugin configured with Zitadel JWKS endpoint
- [ ] Rate limiting configured per endpoint tier
- [ ] CORS plugin configured for allowed origins
- [ ] Request transformer adding X-User-* headers
- [ ] Prometheus metrics plugin enabled

### Integration

- [ ] Azure Front Door origin group pointing to Kong
- [ ] WAF policy applied to Front Door
- [ ] SSL certificate configured for custom domain
- [ ] Health check endpoint responding correctly
- [ ] JWT validation working with Zitadel tokens
- [ ] Rate limiting enforced correctly
- [ ] Headers transformed and passed to upstream

### Post-Deployment

- [ ] Smoke tests passing for all routes
- [ ] Load testing completed (verify auto-scaling)
- [ ] Failover testing completed
- [ ] Monitoring dashboards configured
- [ ] Alert rules active and tested
- [ ] Documentation updated
- [ ] Runbook created for common issues

---

## Quick Reference Commands

```bash
# View Kong logs
az containerapp logs show --name ca-kombify-kong-prod --resource-group rg-kombify-prod --follow

# Restart Kong
az containerapp revision restart \
  --name ca-kombify-kong-prod \
  --resource-group rg-kombify-prod \
  --revision $(az containerapp show --name ca-kombify-kong-prod --resource-group rg-kombify-prod --query properties.latestRevisionName -o tsv)

# Scale manually (emergency)
az containerapp update \
  --name ca-kombify-kong-prod \
  --resource-group rg-kombify-prod \
  --min-replicas 5 \
  --max-replicas 10

# Check Kong status
kubectl port-forward svc/kong-admin 8001:8001
curl http://localhost:8001/status | jq

# Sync configuration
deck sync -s kong-config.yaml --kong-addr http://localhost:8001

# View PostgreSQL connections
az postgres flexible-server execute \
  --name psql-kombify-prod \
  --resource-group rg-kombify-prod \
  --database-name kong \
  --query-text "SELECT * FROM pg_stat_activity WHERE datname = 'kong';"
```

---

## References

- [Azure Kong Architecture Guide](../../guides/deployment/azure-kong-architecture)
- [Inter-Module Contracts](./INTER_MODULE_CONTRACTS.md)
- [Azure Key Vault Secrets](./AZURE_KEYVAULT_SECRETS.md)
- [Kong Gateway Documentation](https://docs.konghq.com/)
- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)

---

*Document Version: 1.0.0*  
*Last Updated: 2026-01-28*  
*Author: kombify Platform Team*
