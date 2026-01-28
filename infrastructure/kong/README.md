# Kong Gateway Deployment

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-28  
> **Environment:** Azure Container Apps (Production)

---

## Overview

This directory contains the Kong Gateway declarative configuration and deployment scripts for the kombify platform. Kong acts as the API Gateway, handling authentication, rate limiting, request transformation, and routing to backend services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KONG GATEWAY                                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         PLUGINS                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │   │
│  │  │   JWT    │  │   Rate   │  │   CORS   │  │ Request  │              │   │
│  │  │  Verify  │  │  Limit   │  │          │  │Transform │              │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Replicas: 2-5 (HA)    Port: 8000 (proxy) / 8001 (admin)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
   ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
   │ Administration│          │  KombiStack  │           │   KombiSim   │
   │    :5380      │          │    :5260     │           │    :5270     │
   └──────────────┘           └──────────────┘           └──────────────┘
                                                                   │
                                                                   ▼
                                                          ┌──────────────┐
                                                          │  KombiSphere │
                                                          │    :8080     │
                                                          └──────────────┘
```

## File Structure

```
infrastructure/kong/
├── README.md              # This file
├── kong-config.yaml       # Declarative Kong configuration
├── deploy.sh              # Deployment script using deck
└── backups/               # Configuration backups (auto-generated)
```

## Quick Start

### Prerequisites

- [deck](https://github.com/Kong/deck) CLI (v1.38.0+)
- Azure CLI (for Azure deployments)
- Access to Kong Admin API

### Environment Variables

The following environment variables are required for deployment:

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | - | Redis hostname for rate limiting |
| `REDIS_PORT` | 6380 | Redis port |
| `REDIS_PASSWORD` | - | Redis password |
| `ADMIN_SERVICE_HOST` | `ca-kombify-admin-prod` | Administration service hostname |
| `ADMIN_SERVICE_PORT` | 5380 | Administration service port |
| `STACK_SERVICE_HOST` | `ca-kombify-stack-prod` | KombiStack service hostname |
| `STACK_SERVICE_PORT` | 5260 | KombiStack service port |
| `SIM_SERVICE_HOST` | `ca-kombify-sim-prod` | KombiSim service hostname |
| `SIM_SERVICE_PORT` | 5270 | KombiSim service port |
| `SPHERE_SERVICE_HOST` | `ca-kombify-sphere-prod` | KombiSphere service hostname |
| `SPHERE_SERVICE_PORT` | 8080 | KombiSphere service port |
| `KONG_ADMIN_URL` | `http://localhost:8001` | Kong Admin API URL |

### Local Deployment

1. **Install deck:**

   ```bash
   # macOS
   brew tap kong/deck
   brew install deck

   # Linux
   curl -sL https://github.com/kong/deck/releases/download/v1.38.0/deck_1.38.0_linux_amd64.tar.gz | tar -xz
   sudo mv deck /usr/local/bin/
   ```

2. **Set environment variables:**

   ```bash
   export REDIS_HOST=redis-kombify-prod.redis.cache.windows.net
   export REDIS_PASSWORD=your-redis-password
   export KONG_ADMIN_URL=http://localhost:8001
   ```

3. **Deploy configuration:**

   ```bash
   ./deploy.sh prod
   ```

### Automated Deployment (GitHub Actions)

The deployment is automated via GitHub Actions:

1. **Trigger deployment:**
   - Push changes to `main` branch affecting `infrastructure/kong/**`
   - Or manually trigger via GitHub UI: Actions → Deploy Kong Gateway → Run workflow

2. **Required GitHub Secrets:**
   - `AZURE_CLIENT_ID` - Azure Service Principal Client ID
   - `AZURE_SUBSCRIPTION_ID` - Azure Subscription ID
   - `AZURE_TENANT_ID` - Azure Tenant ID

3. **Workflow steps:**
   - Validate configuration syntax
   - Authenticate with Azure (OIDC)
   - Fetch secrets from Key Vault
   - Dry-run deployment (plan)
   - Deploy configuration
   - Verify deployment
   - Run smoke tests
   - Notify on completion

## Configuration Details

### Services

| Service | Upstream | Routes | Authentication |
|---------|----------|--------|----------------|
| Administration | `ca-kombify-admin-prod:5380` | `/v1/admin`, `/v1/tools` | JWT |
| KombiStack | `ca-kombify-stack-prod:5260` | `/v1/stacks`, `/v1/orchestrator` | JWT |
| KombiSim | `ca-kombify-sim-prod:5270` | `/v1/simulations`, `/v1/nodes` | JWT |
| KombiSphere | `ca-kombify-sphere-prod:8080` | `/v1/portal` | JWT |
| Public Catalog | `ca-kombify-admin-prod:5380` | `/v1/catalog/public` | None |

### JWT Authentication (Zitadel)

- **Issuer:** `https://auth.kombisphere.io`
- **JWKS URL:** `https://auth.kombisphere.io/oauth/v2/keys`
- **Algorithm:** RS256
- **Claims Verified:** `exp`, `iss`

Kong extracts JWT claims and forwards them as headers:

| JWT Claim | Header |
|-----------|--------|
| `sub` | `X-User-ID` |
| `email` | `X-User-Email` |
| `name` | `X-User-Name` |
| `urn:zitadel:iam:org:id` | `X-Org-ID` |
| `urn:zitadel:iam:org:project:roles` | `X-User-Roles` |
| `plan` | `X-Subscription-Plan` |

### Rate Limiting by Plan

| Service | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Administration | 50/min | 200/min | 500/min |
| KombiStack | 100/min | 500/min | 1000/min |
| KombiSim | 50/min | 200/min | 1000/min |
| KombiSphere | 300/min | 500/min | 1000/min |
| Public Catalog | 500/min | 500/min | 500/min |

Rate limiting uses Redis for distributed counting across Kong replicas.

### CORS Configuration

Allowed origins:
- `https://app.kombify.io`
- `https://admin.kombify.io`
- `https://api.kombify.io`
- `https://kombify.io`
- `https://*.kombify.io`
- `http://localhost:3000` (development)
- `http://localhost:5173` (development)

### Health Check Endpoints

| Endpoint | Port | Description |
|----------|------|-------------|
| `/health` | 8000 | Basic health check (public) |
| `/status` | 8001 | Detailed Kong status (internal) |
| `/metrics` | 8001 | Prometheus metrics (internal) |

## Deployment Script Usage

```bash
./deploy.sh [environment] [kong-admin-url]
```

### Examples

```bash
# Deploy to production (default)
./deploy.sh prod

# Deploy to staging with custom Kong URL
./deploy.sh staging http://kong-staging:8001

# Deploy with auto-rollback enabled
AUTO_ROLLBACK=true ./deploy.sh prod

# Deploy non-interactively (CI/CD)
SKIP_CONFIRM=true ./deploy.sh prod
```

### Features

- **Automatic deck installation:** Downloads and installs deck if not present
- **Environment variable substitution:** Replaces placeholders in config file
- **Configuration validation:** Validates YAML and Kong configuration before deployment
- **Dry-run mode:** Shows planned changes before applying
- **Backup creation:** Creates backup before deployment
- **Verification:** Checks services, routes, and health endpoints
- **Automatic rollback:** Restores previous configuration on failure (if enabled)

## Troubleshooting

### Common Issues

**1. Connection refused to Kong Admin API**

```bash
# Check if Kong is running
kubectl get pods -l app=kong

# Port forward for local access
kubectl port-forward svc/kong-admin 8001:8001

# Then use localhost
export KONG_ADMIN_URL=http://localhost:8001
```

**2. Redis connection errors**

```bash
# Verify Redis is accessible
telnet $REDIS_HOST $REDIS_PORT

# Check Redis password
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

**3. JWT validation failures**

```bash
# Verify Zitadel JWKS endpoint
curl https://auth.kombisphere.io/oauth/v2/keys | jq

# Check JWT token
curl -H "Authorization: Bearer $TOKEN" https://auth.kombisphere.io/oauth/v2/introspect
```

### Viewing Logs

```bash
# Azure Container App logs
az containerapp logs show \
  --name ca-kombify-kong-prod \
  --resource-group rg-kombify-prod \
  --follow

# Kong admin API logs
curl http://kong-admin:8001/services
```

### Rollback

To manually rollback to a previous configuration:

```bash
# List available backups
ls -la infrastructure/kong/backups/

# Restore specific backup
deck sync -s infrastructure/kong/backups/kong-config-20260128_120000.yaml --kong-addr $KONG_ADMIN_URL
```

## Security Considerations

1. **JWT Secret Management:** Kong validates JWTs using Zitadel's JWKS endpoint. No secrets are stored in Kong.

2. **Redis Security:** Redis connection uses SSL (port 6380) with password authentication.

3. **Admin API Protection:** Kong Admin API (port 8001) is NOT exposed externally; it's only accessible internally within the Container App environment.

4. **Rate Limiting:** Rate limits are enforced at the edge before requests reach backend services.

5. **Request Transformation:** Original Authorization header is renamed to `X-Original-Authorization` to prevent token leakage to upstream services.

## Monitoring

### Prometheus Metrics

Kong exposes Prometheus metrics at `http://kong-admin:8001/metrics`:

- `kong_http_requests_total` - Total HTTP requests
- `kong_latency_ms` - Request latency
- `kong_bandwidth_bytes` - Request/response bandwidth
- `kong_upstream_health` - Upstream health status

### Health Checks

Configure Azure Container App health probes:

```yaml
livenessProbe:
  httpGet:
    path: /status
    port: 8001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /status
    port: 8001
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Contributing

When modifying Kong configuration:

1. Test changes locally with `deck validate`
2. Use `deck diff` to review changes before applying
3. Update this README with any new environment variables or services
4. Submit a PR with clear description of changes

## References

- [Kong Gateway Documentation](https://docs.konghq.com/)
- [deck CLI Documentation](https://docs.konghq.com/deck/)
- [Kong Plugin Reference](https://docs.konghq.com/hub/)
- [Azure Container Apps](https://docs.microsoft.com/azure/container-apps/)
- [Internal: Kong Infrastructure Plan](../../internal-notes/kombify/KONG_INFRASTRUCTURE_PLAN.md)
- [Internal: Inter-Module Contracts](../../internal-notes/kombify/INTER_MODULE_CONTRACTS.md)

## Support

For issues or questions:
- Platform Team: platform@kombify.io
- Infrastructure Issues: Create ticket in Azure DevOps
- Emergency: Page on-call engineer

---

*Document Version: 1.0.0*  
*Last Updated: 2026-01-28*  
*Author: kombify Platform Team*
