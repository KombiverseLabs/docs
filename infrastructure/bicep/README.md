# Kong Gateway Azure Infrastructure

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-28  
> **Environment:** Azure Container Apps + Azure Front Door

This directory contains the Azure Bicep infrastructure-as-code templates for deploying Kong Gateway and associated Azure resources.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│                    (Web, Mobile, CLI, External APIs)                         │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AZURE FRONT DOOR (Global Edge)                           │
│  • SSL Termination    • WAF Protection    • DDoS Mitigation    • CDN         │
│  • Custom Domain: api.kombify.io                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     KONG GATEWAY (Container App)                             │
│  • Replicas: 2-5 (HA)                                                        │
│  • Ports: 8000 (proxy) / 8001 (admin)                                        │
│  • Health Probes: Liveness, Readiness, Startup                               │
│  • Auto-scaling: CPU, Memory, HTTP requests                                  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │     Redis        │  │   Key Vault      │
│  (Kong Database) │  │  (Rate Limiting) │  │   (Secrets)      │
│   Private VNet   │  │  Private Endpoint│  │   Managed ID     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## File Structure

```
infrastructure/bicep/
├── README.md              # This file
├── main.bicep             # Main deployment template
├── kong-app.bicep         # Kong Container App module
├── frontdoor.bicep        # Azure Front Door + WAF module
├── monitoring.bicep       # Log Analytics, alerts, dashboards
├── deploy.sh              # Deployment script
├── parameters/
│   ├── prod.bicepparam    # Production parameters
│   ├── staging.bicepparam # Staging parameters
│   └── dev.bicepparam     # Development parameters
└── examples/              # Example configurations
    └── custom-domain.bicep
```

---

## Prerequisites

### Required Tools

- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) (2.50+)
- [Bicep CLI](https://docs.microsoft.com/azure/azure-resource-manager/bicep/install) (included with Azure CLI)
- [jq](https://stedolan.github.io/jq/download/) (optional, for JSON parsing)
- Bash shell (Git Bash, WSL, or macOS/Linux)

### Azure Requirements

- Azure subscription with appropriate quotas:
  - Container Apps: 1 environment
  - PostgreSQL Flexible Server: 1 server
  - Redis Cache: 1 instance
  - Front Door: 1 profile
  - Key Vault: 1 vault
- Azure RBAC permissions:
  - Contributor on resource group (or subscription)
  - User Access Administrator (for managed identity)

### DNS Configuration

Before deploying to production, configure DNS:

1. Create a CNAME record for `api.kombify.io` pointing to your Front Door endpoint
2. Verify domain ownership in Azure Front Door

---

## Quick Start

### 1. Login to Azure

```bash
az login
az account set --subscription "your-subscription-name"
```

### 2. Deploy Infrastructure

```bash
# Deploy to production
./deploy.sh prod westeurope

# Deploy to staging with auto-generated PostgreSQL password
./deploy.sh staging westeurope

# Validate only (no deployment)
VALIDATE_ONLY=true ./deploy.sh prod westeurope

# Dry run (what-if)
WHAT_IF=true ./deploy.sh prod westeurope

# Skip confirmation prompts
SKIP_CONFIRM=true ./deploy.sh prod westeurope
```

### 3. Manual Bicep Deployment

```bash
# Create resource group
az group create \
  --name rg-kombify-prod \
  --location westeurope

# Set PostgreSQL password
export POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Deploy with Bicep
az deployment group create \
  --resource-group rg-kombify-prod \
  --template-file main.bicep \
  --parameters \
    environment=prod \
    location=westeurope \
    postgresAdminPassword="$POSTGRES_PASSWORD"
```

---

## Parameters

### main.bicep

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `environment` | string | `'prod'` | Environment name (dev, staging, prod) |
| `location` | string | `resourceGroup().location` | Azure region |
| `kongImage` | string | `'kong:3.9'` | Kong Docker image tag |
| `postgresAdminUser` | string | `'kongadmin'` | PostgreSQL admin username |
| `postgresAdminPassword` | securestring | - | **Required** - PostgreSQL password |
| `redisSkuName` | string | `'Basic'` | Redis SKU (Basic, Standard, Premium) |
| `postgresTier` | string | `'GeneralPurpose'` | PostgreSQL tier |
| `postgresSkuName` | string | `'Standard_D2s_v3'` | PostgreSQL SKU |
| `postgresStorageSizeGB` | int | `128` | PostgreSQL storage size |
| `minReplicas` | int | `2` | Minimum Kong replicas |
| `maxReplicas` | int | `5` | Maximum Kong replicas |
| `kongCpu` | string | `'1'` | CPU per Kong container |
| `kongMemory` | string | `'2Gi'` | Memory per Kong container |
| `enablePrivateEndpoint` | bool | `true` | Enable private endpoints |
| `customDomain` | string | `'api.kombify.io'` | Custom domain for API |

---

## Health Checks

### Kong Health Endpoints

| Endpoint | Port | Path | Purpose | Access |
|----------|------|------|---------|--------|
| Proxy Health | 8000 | `/health` | Basic health check | Public |
| Admin Status | 8001 | `/status` | Detailed node info | Internal |
| Metrics | 8001 | `/metrics` | Prometheus metrics | Internal |

### Container App Health Probes

```yaml
# Liveness Probe
Type: Liveness
Path: /status
Port: 8001
Initial Delay: 30s
Period: 10s
Timeout: 5s
Failure Threshold: 3

# Readiness Probe
Type: Readiness
Path: /status
Port: 8001
Initial Delay: 5s
Period: 5s
Timeout: 3s
Failure Threshold: 3

# Startup Probe
Type: Startup
Path: /status
Port: 8001
Initial Delay: 10s
Period: 5s
Timeout: 3s
Failure Threshold: 12 (60s total)
```

---

## Monitoring & Alerts

### Alert Rules

| Alert | Severity | Condition | Action |
|-------|----------|-----------|--------|
| High Error Rate | Critical | >5% errors in 15 min | Email |
| High Response Time | Warning | >2s average | Email |
| Failed Health Checks | Critical | 3+ consecutive failures | Email |
| Container Restarts | Warning | 5+ restarts | Email |
| High CPU | Warning | >80% utilization | Email |
| High Memory | Warning | >85% utilization | Email |
| PostgreSQL CPU | Warning | >80% | Email |
| PostgreSQL Storage | Critical | >85% | Email |

### Log Analytics Queries

```kusto
// Request volume by time
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "ca-kong-kombify-prod"
| summarize Count = count() by bin(TimeGenerated, 5m)
| render timechart

// Error count
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "ca-kong-kombify-prod"
| where Log_s contains "error" or Log_s contains "ERROR"
| summarize Count = count() by bin(TimeGenerated, 5m)

// Response time analysis
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "ca-kong-kombify-prod"
| extend ResponseTime = extract(@"(\d+)ms", 1, Log_s)
| where isnotempty(ResponseTime)
| summarize avg(toint(ResponseTime)) by bin(TimeGenerated, 5m)
| render timechart
```

---

## Security

### Network Security

- **Private Endpoints**: PostgreSQL and Redis use private endpoints
- **NSG Rules**: Restrict traffic between subnets
- **VNet Integration**: Container Apps integrated with custom VNet
- **Admin API Protection**: Port 8001 not exposed externally

### WAF Policy

- **Managed Rules**:
  - Microsoft Default Rule Set (2.1)
  - Microsoft Bot Manager Rule Set (1.0)
- **Custom Rules**:
  - Rate limiting (1000 req/min)
  - IP allow/block lists
  - Suspicious user-agent blocking

### Identity & Access

- **Managed Identity**: User-assigned identity for Kong
- **Key Vault Access**: Identity granted `get` and `list` permissions
- **No Secrets in Code**: All secrets stored in Key Vault

---

## Outputs

After deployment, the following outputs are available:

```json
{
  "kongFqdn": "ca-kong-kombify-prod.xxx.westeurope.azurecontainerapps.io",
  "kongUrl": "https://ca-kong-kombify-prod.xxx.westeurope.azurecontainerapps.io",
  "postgresHost": "psql-kombify-prod.postgres.database.azure.com",
  "redisHost": "redis-kombify-prod.redis.cache.windows.net",
  "keyVaultUri": "https://kv-kombify-prod.vault.azure.net/",
  "keyVaultName": "kv-kombify-prod",
  "frontDoorHostname": "api-kombify.z01.azurefd.net",
  "managedIdentityClientId": "xxxxx"
}
```

---

## Troubleshooting

### Deployment Issues

```bash
# Check deployment status
az deployment group show \
  --resource-group rg-kombify-prod \
  --name kong-infra-prod-20260128120000 \
  --query properties.provisioningState

# View deployment logs
az deployment group show \
  --resource-group rg-kombify-prod \
  --name kong-infra-prod-20260128120000 \
  --query properties.error

# Validate Bicep template
az bicep build --file main.bicep
```

### Container App Issues

```bash
# View logs
az containerapp logs show \
  --name ca-kong-kombify-prod \
  --resource-group rg-kombify-prod \
  --follow

# Check container status
az containerapp show \
  --name ca-kong-kombify-prod \
  --resource-group rg-kombify-prod \
  --query properties.runningStatus

# Restart container
az containerapp revision restart \
  --name ca-kong-kombify-prod \
  --resource-group rg-kombify-prod \
  --revision <revision-name>
```

### Database Connection Issues

```bash
# Check PostgreSQL connectivity
az postgres flexible-server show \
  --name psql-kombify-prod \
  --resource-group rg-kombify-prod

# Test connection from Container App
az containerapp exec \
  --name ca-kong-kombify-prod \
  --resource-group rg-kombify-prod \
  --command "kong migrations list"
```

---

## Maintenance

### Scaling

```bash
# Manual scale (emergency)
az containerapp update \
  --name ca-kong-kombify-prod \
  --resource-group rg-kombify-prod \
  --min-replicas 5 \
  --max-replicas 10

# Update auto-scaling rules
az containerapp update \
  --name ca-kong-kombify-prod \
  --resource-group rg-kombify-prod \
  --scale-rule-name cpu-scaling \
  --scale-rule-type cpu \
  --scale-rule-metadata "type=Utilization" "value=80"
```

### Updates

```bash
# Update Kong image
az containerapp update \
  --name ca-kong-kombify-prod \
  --resource-group rg-kombify-prod \
  --image kong:3.10

# Rolling update (zero downtime)
az deployment group create \
  --resource-group rg-kombify-prod \
  --template-file main.bicep \
  --parameters \
    environment=prod \
    kongImage=kong:3.10
```

---

## Cost Optimization

### Development Environment

For dev/test environments, use smaller SKUs:

```bash
az deployment group create \
  --resource-group rg-kombify-dev \
  --template-file main.bicep \
  --parameters \
    environment=dev \
    postgresTier=Burstable \
    postgresSkuName=Standard_B1ms \
    redisSkuName=Basic \
    redisCapacity=0 \
    minReplicas=1 \
    maxReplicas=2
```

### Auto-shutdown

For non-production environments, consider:

```bash
# Scale to zero outside business hours
az containerapp update \
  --name ca-kong-kombify-dev \
  --resource-group rg-kombify-dev \
  --min-replicas 0
```

---

## References

- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [Azure Front Door Documentation](https://docs.microsoft.com/azure/frontdoor/)
- [Kong Gateway Documentation](https://docs.konghq.com/gateway/)
- [Internal: Kong Infrastructure Plan](../../internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md)
- [Internal: Kong Configuration](../kong/README.md)

---

## Contributing

When modifying these templates:

1. Test changes in dev environment first
2. Update this README with any new parameters or outputs
3. Run `az bicep build` to validate syntax
4. Use `WHAT_IF=true` to preview changes
5. Submit PR with clear description of changes

---

## License

Copyright © 2026 kombify Platform Team. All rights reserved.
