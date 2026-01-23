# KombiSphere Secrets Management with Doppler

> **Version:** 1.1  
> **Date:** 2026-01-16  
> **Tool:** Doppler (primary), Azure Key Vault (future enterprise option)

## Overview

All KombiSphere modules will use **Doppler** for centralized secrets management. This eliminates:
- Hardcoded secrets in `.env` files
- Secret sprawl across different deployment environments
- Manual secret rotation pain

## Doppler Project Structure

```
KombiSphere (Doppler Workspace)
│
├── kombisphere-cloud/
│   ├── dev          # Local development
│   ├── staging      # Pre-production
│   └── prod         # Production
│
├── kombisphere-admin/
│   ├── dev
│   ├── staging
│   └── prod
│
├── kombisphere-api/
│   ├── dev
│   ├── staging
│   └── prod
│
├── kombistack/
│   ├── dev          # Local development
│   ├── staging      
│   └── prod         
│
└── shared/          # Cross-module secrets
    ├── dev
    ├── staging
    └── prod
```

---

## Secrets Inventory

### Shared Secrets (All Modules)

| Secret | Description | Doppler Key |
|--------|-------------|-------------|
| Zitadel Issuer URL | OIDC issuer | `ZITADEL_ISSUER` |
| Zitadel Client ID (Cloud) | OIDC client for Cloud | `ZITADEL_CLIENT_ID_CLOUD` |
| Zitadel Client ID (Admin) | OIDC client for Admin | `ZITADEL_CLIENT_ID_ADMIN` |
| Zitadel Service Account | Machine-to-machine auth | `ZITADEL_SERVICE_ACCOUNT_JSON` |
| Stripe Secret Key | Billing API | `STRIPE_SECRET_KEY` |
| Stripe Webhook Secret | Webhook verification | `STRIPE_WEBHOOK_SECRET` |
| Stripe Publishable Key | Frontend Stripe.js | `STRIPE_PUBLISHABLE_KEY` |
| KombiStack SSO Shared Secret | Kong → KombiStack internal trust | `KOMBISTACK_SSO_SHARED_SECRET` |

### KombiSphere-Cloud Secrets

| Secret | Description | Doppler Key |
|--------|-------------|-------------|
| Database URL | PostgreSQL connection | `DATABASE_URL` |
| Auth.js Secret | Session encryption | `AUTH_SECRET` |
| CSRF Secret | CSRF token signing | `CSRF_SECRET` |

### KombiSphere-Admin Secrets

| Secret | Description | Doppler Key |
|--------|-------------|-------------|
| Platform Database URL | Shared PostgreSQL connection | `DATABASE_URL` |
| KombiStack API URL | Target KombiStack instance | `KOMBISTACK_API_URL` |
| KombiStack Service Token | Service-to-service to KombiStack | `KOMBISTACK_SERVICE_TOKEN` |

### KombiSphere-API (Kong) Secrets

| Secret | Description | Doppler Key |
|--------|-------------|-------------|
| Kong Admin Token | Admin API auth | `KONG_ADMIN_TOKEN` |
| Zitadel JWKS URL | JWT validation | `ZITADEL_JWKS_URL` |
| Rate Limit Redis URL | (Future) Redis for rate limiting | `REDIS_URL` |

### KombiStack Secrets

| Secret | Description | Doppler Key |
|--------|-------------|-------------|
| PocketBase Superuser Email | Admin account | `PB_SUPERUSER_EMAIL` |
| PocketBase Superuser Password | Admin password | `PB_SUPERUSER_PASSWORD` |
| gRPC CA Certificate | Agent mTLS root CA | `GRPC_CA_CERT` |
| gRPC Server Certificate | Server TLS cert | `GRPC_SERVER_CERT` |
| gRPC Server Key | Server TLS private key | `GRPC_SERVER_KEY` |
| Ollama API Key | (If cloud Ollama) | `OLLAMA_API_KEY` |
| OpenAI API Key | Cloud AI provider | `OPENAI_API_KEY` |
| Google AI API Key | Cloud AI provider | `GOOGLE_AI_API_KEY` |
| S3 Access Key | Backup storage | `S3_ACCESS_KEY` |
| S3 Secret Key | Backup storage | `S3_SECRET_KEY` |

---

## Integration Patterns

### 1. Local Development (doppler run)

```bash
# Install Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sh

# Login (already done in your terminal)
doppler login

# Set up project
cd KombiSphere-Cloud
doppler setup --project kombisphere-cloud --config dev

# Run with injected secrets
doppler run -- bun run dev
```

### 2. Docker Compose

```yaml
# docker-compose.yml
services:
  cloud:
    image: kombisphere-cloud
    environment:
      # Doppler injects all secrets as env vars
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_CLOUD}
    command: doppler run -- node build

  admin:
    image: kombisphere-admin
    environment:
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_ADMIN}
    command: doppler run -- ./kombistack-admin

  api:
    image: kong:3.9
    environment:
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_API}
    # Kong config loaded from Doppler
```

### 3. VPS Deployment (Ionos)

```bash
# On VPS, install Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sh

# Create service token (no interactive login needed)
# In Doppler dashboard: Generate service token for prod

# Add to systemd service
# /etc/systemd/system/kombisphere-cloud.service
[Service]
Environment=DOPPLER_TOKEN=dp.st.prod.xxxx
ExecStart=/usr/bin/doppler run -- /opt/kombisphere/cloud/start.sh
```

### 4. GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-cloud:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v3
        
      - name: Deploy with secrets
        run: doppler run -- ./deploy.sh
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_PROD }}
```

---

## Secret Rotation Strategy

### Automatic Rotation (Doppler Sync)

Doppler can sync with external providers. Enable for:

| Secret | Provider | Rotation Period |
|--------|----------|-----------------|
| Database credentials | PostgreSQL | 90 days |
| Stripe keys | Manual (alert) | On breach |
| Zitadel service account | Zitadel | 180 days |

### Manual Rotation Checklist

When rotating secrets:

1. **Generate new secret** in Doppler (staging first)
2. **Deploy staging** and verify
3. **Rotate production** in Doppler
4. **Monitor** for auth failures
5. **Revoke old secret** after 24h buffer

---

## Environment-Specific Overrides

### Development

```
# kombisphere-cloud/dev
DATABASE_URL=postgresql://localhost:5432/kombisphere_dev
ZITADEL_ISSUER=https://dev.zitadel.cloud
STRIPE_SECRET_KEY=sk_test_xxxx
```

### Staging

```
# kombisphere-cloud/staging
DATABASE_URL=postgresql://staging-db:5432/kombisphere
ZITADEL_ISSUER=https://staging.zitadel.cloud
STRIPE_SECRET_KEY=sk_test_xxxx  # Still test mode
```

### Production

```
# kombisphere-cloud/prod
DATABASE_URL=postgresql://prod-db:5432/kombisphere
ZITADEL_ISSUER=https://kombisphere.zitadel.cloud
STRIPE_SECRET_KEY=sk_live_xxxx  # Live mode!
```

---

## Module-Specific Setup

### KombiSphere-Cloud

```typescript
// src/lib/server/config.ts
// Doppler injects as process.env - no changes needed!
export const config = {
  database: process.env.DATABASE_URL!,
  auth: {
    secret: process.env.AUTH_SECRET!,
    zitadel: {
      issuer: process.env.ZITADEL_ISSUER!,
      clientId: process.env.ZITADEL_CLIENT_ID_CLOUD!,
    },
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
};
```

### KombiSphere-Admin

```go
// pkg/config/config.go
type Config struct {
  // Doppler injects via os.Getenv()
  DatabaseURL           string `env:"DATABASE_URL"`
  Zitadel               ZitadelConfig
  KombiStackAPIURL      string `env:"KOMBISTACK_API_URL"`
  KombiStackServiceToken string `env:"KOMBISTACK_SERVICE_TOKEN"`
}

func Load() (*Config, error) {
  return &Config{
    DatabaseURL:            os.Getenv("DATABASE_URL"),
    KombiStackAPIURL:       os.Getenv("KOMBISTACK_API_URL"),
    KombiStackServiceToken: os.Getenv("KOMBISTACK_SERVICE_TOKEN"),
  }, nil
}
```

### KombiStack

```go
// pkg/config/config.go
// KombiStack does not run OIDC; Kong validates Zitadel JWT and calls internal endpoints.

type Config struct {
  PocketBaseSuperuserEmail    string `env:"PB_SUPERUSER_EMAIL"`
  PocketBaseSuperuserPassword string `env:"PB_SUPERUSER_PASSWORD"`

  // Used to protect /api/internal/* endpoints from direct access.
  // Kong injects/forwards this as a shared secret header.
  SSOSharedSecret string `env:"KOMBISTACK_SSO_SHARED_SECRET"`
}
```

---

## Security Best Practices

### 1. Never Commit Secrets

```gitignore
# .gitignore (all repos)
.env
.env.local
.env.*.local
*.pem
*.key
doppler.yaml  # Local Doppler config (optional)
```

### 2. Use Doppler's Access Controls

| Role | Access |
|------|--------|
| Developer | Read dev, staging |
| DevOps | Read/write all |
| Admin | Full access + audit |

### 3. Audit Logging

Doppler provides automatic audit logs for:
- Secret access
- Secret changes
- User access changes

Review monthly in Doppler dashboard.

---

## Migration from .env Files

### Step 1: Export Current Secrets

```bash
# From each repo
cd KombiSphere-Admin
cat .env | doppler secrets upload --project kombisphere-admin --config dev
```

### Step 2: Remove .env Files

```bash
rm .env .env.local
git rm --cached .env  # If accidentally committed
```

### Step 3: Update Scripts

```bash
# Before
source .env && go run cmd/main.go

# After
doppler run -- go run cmd/main.go
```

### Step 4: Update Docker Compose

```yaml
# Before
services:
  admin:
    env_file: .env

# After
services:
  admin:
    environment:
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_ADMIN}
    command: doppler run -- ./start.sh
```

---

## Azure Key Vault (Future Enterprise Option)

For enterprise customers who require:
- Azure compliance
- HSM-backed keys
- Azure AD integration

Doppler can sync with Azure Key Vault:

```yaml
# Doppler sync config
integrations:
  - type: azure-key-vault
    vault_url: https://kombisphere.vault.azure.net
    sync_secrets:
      - STRIPE_SECRET_KEY
      - DATABASE_URL
```

---

## Quick Reference

### Common Commands

```bash
# Login
doppler login

# Setup project
doppler setup

# Run with secrets
doppler run -- <command>

# View secrets (masked)
doppler secrets

# Download secrets (for debugging)
doppler secrets download --no-file --format env

# Switch config
doppler configure set config prod
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `DOPPLER_TOKEN not set` | Run `doppler login` or set service token |
| `Project not found` | Run `doppler setup` in project directory |
| `Permission denied` | Check Doppler dashboard access controls |
| `Secret not found` | Verify secret exists in current config (dev/staging/prod) |

---

## Next Steps

1. **Set up Doppler projects** in dashboard
2. **Migrate existing .env** files to Doppler
3. **Update docker-compose.yml** files
4. **Rotate compromised secrets** (Admin Stripe keys)
5. **Configure CI/CD** with Doppler tokens
