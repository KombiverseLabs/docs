# kombify Inter-Module Contracts

> **Version:** 3.0.0  
> **Last Updated:** 2026-01-23  
> **Status:** UPDATED (aligned with kombify naming convention)

---

## Overview

This document defines the API contracts and communication standards between kombify modules. Each module MUST follow these contracts to ensure interoperability.

---

## Module Communication Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KONG GATEWAY ARCHITECTURE                            │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐│
│  │   Sphere    │◄───►│    Admin    │◄───►│    Kong     │◄───►│ Core Tools  ││
│  │  (Portal)   │     │  (Center)   │     │  Gateway    │     │ (Stack/Sim) ││
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └─────────────┘│
│         │                   │                   │                            │
│         │                   │                   │                            │
│         └───────────────────┴───────────────────┘                            │
│                              │                                               │
│                       ┌──────┴──────┐                                        │
│                       │   Zitadel   │                                        │
│                       │   (OIDC)    │                                        │
│                       └─────────────┘                                        │
│                                                                              │
│  Legend:                                                                     │
│  ───► = HTTP/HTTPS via Kong                                                  │
│  ◄───► = Internal service communication                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

| From → To | Protocol | Auth | Purpose | Notes |
|-----------|----------|------|---------|-------|
| **Client → Kong** | HTTPS | JWT (via Zitadel) | API requests | Kong validates tokens |
| **Kong → Services** | HTTP | mTLS/Internal | Request forwarding | Kong adds X-User-* headers |
| Sphere → Zitadel | OIDC | Client Credentials | User login, token refresh | Direct for auth flow |
| Sphere → Stripe | HTTPS | API Key | Checkout, portal, webhooks | Direct, not via Kong |
| Administration → Zitadel | HTTPS | Service Account | User management | Direct |
| Administration → Stripe | HTTPS | API Key (read/write) | Billing webhooks + customer operations | Direct |
| Sphere → Administration | Internal HTTP | Service JWT | Read/write platform data (tools, flags, profile, etc.) | Via Kong internal route |

---

## Contract 1: Sphere ↔ Administration Platform API

**Principle:** Administration is the canonical writer to the single PostgreSQL database. Sphere uses Administration APIs to read/write platform data.

### 1.1 User Profile Read (Sphere → Administration)

**Purpose:** Cloud portal renders user profile and app-specific settings stored in PostgreSQL.

**Endpoint:** `GET /api/internal/users/{sub}`

**Auth:** Internal service JWT (Cloud → Admin)

```typescript
// Response
interface UserProfileResponse {
  sub: string;           // Zitadel subject (canonical user key)
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
  createdAt: string;     // ISO8601
  updatedAt: string;     // ISO8601
}
```

**Notes:**
- Identity remains in Zitadel; Postgres stores app-specific profile/preferences keyed by `sub`.
- Admin can optionally keep a cached copy of email/name for UX, but it must be treated as non-authoritative.

### 1.2 Feature Flags Read (Cloud → Admin)

**Purpose:** Cloud needs feature flags to gate UI and entitlements.

**Endpoint:** `GET /api/internal/feature-flags?sub={sub}&org={orgId}`

```typescript
// Response
interface FeatureFlagsResponse {
  sub: string;
  orgId?: string;
  flags: Record<string, boolean | string | number>;
  updatedAt: string;
}
```

**Notes:**
- Canonical flags live in PostgreSQL (Admin-Center).
- KombiStack can optionally receive a synced subset (see Contract 5).

### 1.3 Billing Metrics (Admin → Cloud)

**Purpose:** Provide aggregated billing metrics for admin dashboard

**Endpoint:** `GET /api/internal/metrics/billing`

```typescript
// Response
interface BillingMetricsResponse {
  mrr: number;                    // Monthly Recurring Revenue in cents
  activeSubscriptions: number;
  churnRate: number;              // Percentage
  planDistribution: {
    free: number;
    pro: number;
    enterprise: number;
  };
  recentSignups: number;          // Last 30 days
  updatedAt: string;              // ISO8601
}

---

---

## Contract 2: Kong JWT Claims

### 2.1 JWT Token Structure

**Issuer:** Zitadel Cloud (`auth.kombisphere.io`)

```json
{
  "iss": "https://auth.kombisphere.io",
  "sub": "user_uuid",
  "aud": ["kombisphere-api", "kombisphere-cloud"],
  "exp": 1704067200,
  "iat": 1704063600,
  "azp": "kombisphere-cloud",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "urn:zitadel:iam:org:id": "org_uuid",
  "urn:zitadel:iam:org:project:roles": {
    "subscriber_pro": {},
    "user": {}
  }
}
```

### 2.2 Kong Header Transformation

Kong extracts JWT claims and forwards as headers:

| JWT Claim | Header | Example |
|-----------|--------|---------|
| `sub` | `X-User-ID` | `550e8400-e29b-41d4-a716-446655440000` |
| `urn:zitadel:iam:org:id` | `X-Org-ID` | `org_123456` |
| `email` | `X-User-Email` | `user@example.com` |
| `urn:zitadel:iam:org:project:roles` | `X-User-Roles` | `subscriber_pro,user` |
| `name` | `X-User-Name` | `John Doe` |

### 2.3 Role Mapping

| Zitadel Role | Cloud Role | Kong Rate Limit | API Access |
|--------------|------------|-----------------|------------|
| `user` | USER | 100 req/min | Public APIs |
| `subscriber_pro` | USER + PRO | 500 req/min | Extended APIs |
| `subscriber_enterprise` | USER + ENTERPRISE | 10000 req/min | Full API access |
| `manager` | MANAGER | 500 req/min | Team APIs |
| `admin` | ADMIN | 1000 req/min | All |
| `kombisphere_admin` | SUPER_ADMIN | Unlimited | All + Admin APIs |

### 2.4 Kong Rate Limiting by Endpoint

| Endpoint Pattern | Free | Pro | Enterprise |
|------------------|------|-----|------------|
| `/v1/stacks/*` | 100/min | 500/min | Unlimited |
| `/v1/simulations/*` | 50/min | 200/min | 1000/min |
| `/v1/admin/*` | 10/min | 100/min | 500/min |
| `/v1/catalog/*` | 500/min | 1000/min | 5000/min |
| `/v1/billing/*` | 50/min | 100/min | 500/min |


---

## Contract 3: Stripe Webhooks

### 3.1 Cloud Webhook Handler

**Endpoint:** `POST /api/webhooks/stripe`

**Required Events:**

| Event | Handler Action |
|-------|----------------|
| `checkout.session.completed` | Create subscription in DB, sync to Admin |
| `customer.subscription.created` | Create subscription record |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Mark subscription as canceled |
| `invoice.paid` | Create invoice record |
| `invoice.payment_failed` | Update subscription to `PAST_DUE` |
| `customer.updated` | Sync customer details |

**Signature Verification:**

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sig = request.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  request.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 3.2 Admin Webhook Handler (Recommended)

**Endpoint:** `POST /api/webhooks/stripe`

**Purpose:** Canonical webhook handling that writes to PostgreSQL (single database) and optionally updates Zitadel metadata.

**Events:** Same as Cloud

**Rule:** Stripe remains canonical; Postgres stores a mirror suitable for UI/analytics.

---

## Contract 4: Zitadel Webhooks

### 4.1 Cloud Webhook Handler

**Endpoint:** `POST /api/webhooks/zitadel`

**Required Events:**

| Event | Handler Action |
|-------|----------------|
| `user.created` | Create/ensure user row in Postgres (Admin service) |
| `user.updated` | Update cached profile fields (optional) |
| `user.deleted` | Soft-delete or anonymize app data |
| `user.deactivated` | Suspend access (deny by role/flag) |
| `user.reactivated` | Restore access |

---

## Contract 5: Feature Flags → KombiStack (Sync)

**Purpose:** Apply platform feature flags inside the KombiStack instance without replacing its PocketBase auth.

### 5.1 Admin → KombiStack Flag Push

**Endpoint:** `POST /api/internal/feature-flags/apply`

**Auth:** Service token (Admin → KombiStack) via Kong internal route

```json
{
  "sub": "zitadel-user-sub",
  "flags": {
    "ai_enabled": true,
    "healing_agent_enabled": false,
    "beta_ui": true
  }
}
```

**Expected Behavior:**
- KombiStack stores the flags in a PocketBase collection (e.g. `feature_preferences`) associated with the PocketBase user mapped to `sub`.
- If no user exists yet, KombiStack may create a placeholder user and mark it as externally managed.

---

## Contract 6: KombiSphere SSO → KombiStack (Kong-Mediated Login Exchange)

**Goal:** A signed-in KombiSphere user gets automatically logged into KombiStack.

### 6.1 Browser Start

**Endpoint:** `GET /kombistack/sso/start`

**Auth:** User JWT (Zitadel). Validated by Kong.

### 6.2 Kong Upstream Exchange

Kong forwards to a KombiStack internal endpoint with injected identity headers:

- `X-User-Sub`: Zitadel `sub`
- `X-User-Email`
- `X-Org-Id`
- `X-User-Roles`

**Endpoint:** `POST /api/internal/sso/exchange`

**Auth:** Kong-only (network policy) + optional shared secret header

**Response:**
- Sets PocketBase auth cookie or returns a short-lived token, then redirects user to KombiStack UI.

**Important:** KombiStack does **not** implement Zitadel OIDC. This is an internal login bridge.

**Signature Verification:**

```typescript
// TODO: Implement signature verification
// https://zitadel.com/docs/guides/integrate/webhooks#signature-verification
const signature = request.headers['zitadel-signature'];
const timestamp = request.headers['zitadel-timestamp'];
// Verify HMAC-SHA256
```

---

## Contract 5: SSO Token Generation

### 5.1 Cloud → Core Tools SSO

**Purpose:** Allow users to access kombiStack, kombiSim, stackKits via SSO

**Endpoint:** `POST /api/sso/token`

```typescript
// Request
interface SSOTokenRequest {
  targetService: 'kombistack' | 'kombisim' | 'stackkits';
  returnUrl?: string;
}

// Response
interface SSOTokenResponse {
  token: string;          // Short-lived JWT (5 min)
  redirectUrl: string;    // Target service URL with token
  expiresAt: string;      // ISO8601
}
```

**Token Structure:**

```json
{
  "iss": "kombisphere-cloud",
  "sub": "user_uuid",
  "aud": "kombistack",  // Target service
  "exp": 1704064200,    // 5 minutes from issue
  "iat": 1704063900,
  "plan": "PRO",
  "org_id": "org_uuid",
  "permissions": ["workflows.read", "workflows.write", "workers.read"]
}
```

### 5.2 Plan-Based Access Control

| Plan | kombiStack | kombiSim | stackKits |
|------|------------|----------|-----------|
| FREE | Read-only | 3 sims/month | Public kits |
| PRO | Full access | Unlimited | All kits |
| ENTERPRISE | Full + priority | Unlimited + dedicated | Custom kits |

---

## Contract 6: Health & Status

### 6.1 Health Check Endpoint

Each module MUST expose:

**Endpoint:** `GET /health`

```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  checks: {
    database?: 'ok' | 'error';
    redis?: 'ok' | 'error';
    zitadel?: 'ok' | 'error';
    stripe?: 'ok' | 'error';
  };
}
```

### 6.2 Readiness Check

**Endpoint:** `GET /ready`

Returns `200 OK` when service can accept traffic, `503` otherwise.

### 6.3 Module Status Endpoint (Admin Only)

**Endpoint:** `GET /api/admin/status`

**Auth:** Admin JWT required

```typescript
interface ModuleStatusResponse {
  module: 'cloud' | 'admin' | 'api';
  version: string;
  uptime: number;           // Seconds
  requestsTotal: number;
  requestsPerMinute: number;
  errorRate: number;        // Percentage
  lastDeployment: string;   // ISO8601
}
```

---

## Contract 7: Error Responses

### 7.1 Standard Error Format

All modules MUST return errors in this format:

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable code
    message: string;        // Human-readable message
    details?: Record<string, unknown>;  // Additional context
    requestId?: string;     // For debugging
    timestamp: string;      // ISO8601
  };
}
```

### 7.2 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_REQUIRED` | 401 | No authentication provided |
| `AUTH_INVALID` | 401 | Invalid or expired token |
| `AUTH_INSUFFICIENT` | 403 | Valid token, insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_FAILED` | 400 | Input validation error |
| `CONFLICT` | 409 | Resource conflict (duplicate, etc.) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Downstream service unavailable |

### 7.3 Validation Error Details

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid request body",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "name": "Name is required"
      }
    },
    "requestId": "req_abc123",
    "timestamp": "2026-01-16T10:30:00Z"
  }
}
```

---

## Contract 8: Rate Limiting

### 8.1 Rate Limit Headers

All responses MUST include:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

### 8.2 Rate Limits by Endpoint

| Endpoint Pattern | Limit | Window |
|------------------|-------|--------|
| `/api/auth/*` | 20 | 1 minute |
| `/api/webhooks/*` | 1000 | 1 minute |
| `/v1/orchestrator/*` | 300 | 1 minute |
| `/v1/orchestrator/ai/*` | 60 | 1 minute |
| `/v1/simulation/*` | 100 | 1 minute |
| `/v1/stackkits/*` | 300 | 1 minute |
| Default | 100 | 1 minute |

### 8.3 Rate Limit by Plan

| Plan | Multiplier |
|------|------------|
| FREE | 1x |
| PRO | 5x |
| ENTERPRISE | 20x |

---

## Contract 9: Logging Standards

### 9.1 Log Format

All modules MUST use structured JSON logging:

```json
{
  "timestamp": "2026-01-16T10:30:00.123Z",
  "level": "info",
  "message": "Request completed",
  "service": "cloud",
  "requestId": "req_abc123",
  "userId": "user_xyz",
  "method": "POST",
  "path": "/api/subscriptions",
  "statusCode": 201,
  "durationMs": 45,
  "metadata": {}
}
```

### 9.2 Required Log Fields

| Field | Required | Description |
|-------|----------|-------------|
| `timestamp` | ✅ | ISO8601 with milliseconds |
| `level` | ✅ | debug, info, warn, error |
| `message` | ✅ | Human-readable description |
| `service` | ✅ | Module name |
| `requestId` | ⚠️ | When processing requests |
| `userId` | ⚠️ | When user context available |

### 9.3 Audit Log Events

Critical actions MUST be audit logged:

| Event | Module | Fields |
|-------|--------|--------|
| `user.login` | Cloud | userId, ip, userAgent |
| `user.logout` | Cloud | userId |
| `subscription.created` | Cloud | userId, plan, amount |
| `subscription.canceled` | Cloud | userId, reason |
| `admin.user.impersonated` | Admin | adminId, targetUserId |
| `admin.user.locked` | Admin | adminId, targetUserId, reason |
| `admin.mfa.reset` | Admin | adminId, targetUserId |

---

## Contract 10: Versioning

### 10.1 API Versioning

- All public APIs use path versioning: `/v1/...`
- Breaking changes require new version: `/v2/...`
- Deprecation notice: 6 months before removal
- Sunset header when deprecating:

```http
Sunset: Sat, 01 Jul 2026 00:00:00 GMT
Deprecation: true
Link: </v2/resource>; rel="successor-version"
```

### 10.2 Internal API Versioning

- Internal APIs (`/api/internal/*`) are not versioned
- Changes coordinated across modules
- Backward compatibility maintained within sprint

---

## Implementation Checklist

### Kong Gateway (CRITICAL - Deploy First)

- [ ] Deploy Kong to Azure Container App
- [ ] Configure JWT plugin with Zitadel JWKS endpoint
- [ ] Configure rate limiting plugin by consumer tier
- [ ] Configure header transformation (JWT → X-User-*)
- [ ] Set up upstream services (Admin, Core Tools)
- [ ] Configure health check endpoints
- [ ] Set up internal routes for service-to-service
- [ ] Test token validation and claim extraction
- [ ] Configure CORS for portal domains
- [ ] Set up request/response transformation

### Cloud Module (KombiSphere Portal)

- [ ] Update to read X-User-* headers from Kong
- [ ] Remove direct Zitadel token validation (Kong handles it)
- [ ] Implement `/api/internal/sync/users` endpoint
- [ ] Implement `/api/internal/sync/subscriptions` endpoint
- [ ] Add Stripe webhook signature verification
- [ ] Add Zitadel webhook signature verification
- [ ] Implement SSO token generation for core tools
- [ ] Add rate limit headers to responses
- [ ] Standardize error responses
- [ ] Add structured logging

### Admin Module (Administration Center)

- [ ] Update to read X-User-* headers from Kong
- [ ] Implement user sync consumer
- [ ] Implement subscription sync consumer
- [ ] Add `/api/admin/status` endpoint
- [ ] Standardize error responses
- [ ] Add rate limiting middleware (for non-Kong requests)
- [ ] Add structured logging

### Core Tools (KombiStack, KombiSim)

- [ ] Update to read X-User-* headers from Kong
- [ ] Configure internal route authentication
- [ ] Implement health check endpoints at `/health`
- [ ] Update Key Vault integration for secrets
- [ ] Add structured logging with request IDs

### Azure Infrastructure

- [ ] Configure Azure Front Door → Kong routing
- [ ] Set up Key Vault with all required secrets
- [ ] Configure managed identities for Container Apps
- [ ] Set up PostgreSQL Flexible Server
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation (Azure Monitor)

### Security & Compliance

- [ ] Enable mTLS between Kong and upstream services
- [ ] Configure Web Application Firewall rules
- [ ] Set up DDoS protection
- [ ] Implement audit logging for all admin actions
- [ ] Configure secret rotation policy
- [ ] Set up security scanning in CI/CD

### Testing

- [ ] E2E tests use environment variables for URLs
- [ ] Kong routing tests for all services
- [ ] JWT validation tests (valid, expired, invalid)
- [ ] Rate limiting tests by plan tier
- [ ] Webhook signature verification tests
- [ ] SSO flow end-to-end tests
- [ ] Load testing for Kong gateway
- [ ] Failover and rollback tests

---

## Changelog

| Date | Version | Change |
|------|---------|--------|
| 2026-01-16 | 1.0.0 | Initial contracts document |
