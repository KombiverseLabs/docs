# kombifySphere - Unified Development Guide

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-16  
> **Purpose:** Single source of truth for cross-module development

---

## Quick Reference

### Module Summary

| Module | Purpose | Tech Stack | Database | Port |
|--------|---------|------------|----------|------|
| **kombifySphere Cloud** | User portal, billing | SvelteKit, Prisma | PostgreSQL | 3000 |
| **kombify Administration** | Platform backend, tools, flags, user admin | Go | PostgreSQL (shared from Cloud) | 8090 |
| **kombify API** | Gateway, routing | Kong 3.9 | None | 8000/8443 |
| **kombify Stack** | Orchestration (homelab) | Go + PocketBase | Embedded SQLite | 8080/50051 |
| **kombify Sim** | Simulation | TBD | TBD | 8081 |
| **kombify StackKits** | IaC templates | CUE (separate repo) | Git/Registry | n/a |

### Key URLs

| Service | Development | Production |
|---------|-------------|------------|
| Cloud Portal | `http://localhost:3000` | `https://kombisphere.io` |
| Admin Portal | `http://localhost:8090` | `https://admin.kombisphere.io` |
| API Gateway | `http://localhost:8000` | `https://api.kombisphere.io` |
| Zitadel | - | `https://auth.kombisphere.io` |

---

## Who Owns What?

### Data Ownership

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA OWNERSHIP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ZITADEL (Source of Truth for Identity)                         │
│  ├── User authentication                                        │
│  ├── User profiles (name, email)                                │
│  ├── Roles and permissions                                      │
│  ├── Organizations                                              │
│  └── Sessions, MFA                                              │
│                                                                  │
│  PLATFORM PostgreSQL (Single Source of Truth Administration & Service)                   │
│  ├── Tools catalog + patterns                                   │
│  ├── AI tool evaluation (incl. embeddings via pgvector)         │
│  ├── Feature flags + entitlements                               │
│  ├── Portal state (notifications/audit; optional)               │
│  └── Stripe/Zitadel mirrors (optional; Stripe/Zitadel remain SoT)│
│                                                                  │
│  KOMBISTACK PocketBase (Source of Truth for Homelab State)      │
│  ├── stacks/nodes/workers/jobs/services                         │
│  ├── wallet/activity_log                                        │
│  └── applied feature_preferences (synced from platform flags)    │
│                                                                  │
│  STRIPE (Source of Truth for Billing)                           │
│  ├── Customers                                                  │
│  ├── Subscriptions                                              │
│  ├── Payment methods                                            │
│  └── Invoices                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Feature Ownership

| Feature | Primary Owner | Secondary |
|---------|---------------|-----------|
| User login/logout | Cloud | Zitadel |
| User profile edit | Cloud | Zitadel |
| Subscription checkout | Cloud | Stripe |
| Subscription management | Cloud | Stripe Portal |
| User administration | Admin | Zitadel API |
| MFA management | Admin | Zitadel API |
| User impersonation | Admin | Zitadel API |
| Billing dashboard | Admin | Stripe API |
| Tools catalog | Admin | - |
| API routing | API | - |
| JWT validation | API | Zitadel JWKS |

---

## Integration Patterns

### 1. User Signs Up

```
1. User visits kombisphere.io
2. Clicks "Sign Up" → Redirect to Zitadel
3. Zitadel creates user, returns to Cloud with JWT
4. Admin ensures a platform user row exists (keyed by Zitadel `sub`) (optional)
5. User sees dashboard
```

### 2. User Subscribes

```
1. User on /billing clicks "Upgrade to Pro"
2. Cloud creates Stripe Checkout Session
3. Redirect to Stripe Checkout
4. User completes payment
5. Stripe sends webhook to Admin (recommended)
6. Admin:
  a. Mirrors subscription state in PostgreSQL (optional)
  b. Updates user metadata/roles in Zitadel (if used for entitlements)
7. User has Pro access
```

### 3. Admin Manages User

```
1. Admin logs into admin.kombisphere.io
2. Zitadel validates admin role
3. Admin views user list (from Zitadel API) and platform state (Postgres)
4. Admin locks user → Admin calls Zitadel Management API
5. Admin views billing → Admin calls Stripe API (read-only)
```

### 4. API Request Flow

```
1. Client sends request to api.kombisphere.io
2. Kong validates JWT (Zitadel JWKS)
3. Kong extracts claims → X-User-ID, X-Org-ID headers
4. Kong applies rate limiting
5. Kong routes to backend service
6. Backend uses headers for authorization
7. Response flows back through Kong

### 5. SSO Into KombiStack

```
1. User is signed into Cloud (Zitadel)
2. User clicks "Open KombiStack"
3. Kong validates Zitadel JWT
4. Kong calls KombiStack internal `/api/internal/sso/exchange`
5. KombiStack returns a PocketBase session (cookie/token)
6. Browser is redirected into KombiStack UI
```
```

---

## Development Setup

### Prerequisites

```bash
# Required
- Node.js 20+
- Go 1.24+
- Docker & Docker Compose
- PostgreSQL 16 (or Docker)

# Accounts needed
- Zitadel Cloud account
- Stripe account (test mode)
```

### Environment Files

Each module needs its own `.env` file. Templates provided in `.env.example`.

**Shared Environment Variables:**

```bash
# All modules need these
ZITADEL_ISSUER=https://your-instance.zitadel.cloud
ZITADEL_CLIENT_ID=your-client-id

# Cloud + Admin need these
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Starting Services

```bash
# Option 1: Individual services
cd KombiSphere-Cloud && npm run dev      # Port 3000
cd KombiSphere-Admin && make dev         # Port 8090
cd KombiSphere-API && docker compose up  # Port 8000

# Option 2: Full stack (Docker)
docker compose -f docker-compose.full.yml up
```

---

## Communication Standards

### HTTP APIs

All modules follow these standards:

```typescript
// Success response
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": { ... },
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| Code | HTTP | Usage |
|------|------|-------|
| `AUTH_REQUIRED` | 401 | No token provided |
| `AUTH_INVALID` | 401 | Invalid/expired token |
| `AUTH_INSUFFICIENT` | 403 | Valid token, wrong permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_FAILED` | 400 | Invalid input |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Headers

```http
# Required for authenticated requests
Authorization: Bearer <jwt_token>

# Or API key
X-Api-Key: <api_key>

# Injected by Kong (available to backends)
X-User-ID: <user_uuid>
X-Org-ID: <org_uuid>
X-User-Email: <email>
X-User-Roles: <role1,role2>

# Request tracing
X-Request-ID: <uuid>
```

---

## Security Requirements

### All Modules Must

1. **Validate all input** - Use Zod (TypeScript) or equivalent
2. **Log sensitive actions** - Audit trail for admin actions
3. **Use parameterized queries** - No SQL injection
4. **Sanitize output** - Prevent XSS
5. **Set security headers** - CSP, X-Frame-Options, HSTS

### Authentication Checklist

- [ ] JWT token validated (issuer, expiration, signature)
- [ ] Roles extracted from JWT claims
- [ ] Route protected based on role
- [ ] Audit log entry for sensitive operations

### Before Production

- [ ] No secrets in code or git
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] Auth enabled (no bypass flags)
- [ ] Default credentials changed

---

## Testing Standards

### Unit Tests

Each module should have:
- **Cloud:** Vitest for TypeScript
- **Admin:** Go testing package
- **API:** decK validation + integration tests

### Integration Tests

Test these flows:
1. User signup → login → dashboard
2. Checkout → subscription active
3. Admin lock user → user can't login
4. API rate limiting works

### Test Commands

```bash
# Cloud
cd KombiSphere-Cloud
npm run test        # Unit tests
npm run test:e2e    # E2E with Playwright

# Admin
cd KombiSphere-Admin
make test           # Go tests

# API
cd KombiSphere-API
deck validate -s kong/kong.yml  # Config validation
```

---

## Deployment Checklist

### Pre-Deploy

- [ ] All secrets in environment/secrets manager
- [ ] Database migrations applied
- [ ] TLS certificates valid
- [ ] Health checks passing
- [ ] Monitoring configured

### Deploy Order

1. **Database** - PostgreSQL for Cloud
2. **API Gateway** - Kong must be running
3. **Cloud** - User portal
4. **Admin** - Internal tools
5. **Core Tools** - kombiStack, etc.

### Post-Deploy

- [ ] Health endpoints responding
- [ ] Login flow working
- [ ] Checkout flow working
- [ ] Rate limits active
- [ ] Logs flowing to monitoring

---

## Troubleshooting

### Common Issues

| Problem | Module | Solution |
|---------|--------|----------|
| JWT validation fails | API | Check Zitadel JWKS URL |
| Stripe webhooks fail | Cloud | Check webhook secret |
| User not syncing | Admin | Check Cloud sync endpoint |
| Rate limited | API | Check consumer group |
| CORS errors | API | Check Kong CORS config |

### Debug Commands

```bash
# Check Kong status
curl http://localhost:8000/health

# Check Cloud status
curl http://localhost:3000/health

# Check Admin status
curl http://localhost:8090/health

# Validate Kong config
deck validate -s kong/kong.yml

# Check Prisma connection
cd KombiSphere-Cloud && npx prisma db pull
```

---

## Related Documents

| Document | Location |
|----------|----------|
| Unified Architecture | `kombiSphereDocs/KombiSphere_Architecture.md` |
| Inter-Module Contracts | `kombiSphereDocs/INTER_MODULE_CONTRACTS.md` |
| Decision Log | `kombiSphereDocs/DECISION_LOG.md` |
| Cloud Architecture | `KombiSphere-Cloud/docs/ARCHITECTURE.md` |
| Cloud Roadmap | `KombiSphere-Cloud/docs/ROADMAP.md` |
| Admin Architecture | `KombiSphere-Admin/docs/ARCHITECTURE_v2.md` |
| Admin Roadmap | `KombiSphere-Admin/docs/ROADMAP.md` |
| API Architecture | `KombiSphere-API/docs/ARCHITECTURE.md` |
| API Roadmap | `KombiSphere-API/docs/ROADMAP.md` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-16 | Initial unified development guide |
