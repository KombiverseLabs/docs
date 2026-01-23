# kombify API Gateway - Technical Architecture

> **Version:** 3.9.x  
> **Last Updated:** 2026-01-23  
> **Repository:** KombiSphere-API  
> **License:** MIT

---

## Module Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | kombify API |
| **Role** | Central API Gateway |
| **Primary Users** | All kombify services, External API consumers |
| **Tech Stack** | Kong Gateway 3.9+, Lua, Docker |

---

## Overview

**kombify API** ist der zentrale API Gateway des kombify-Ökosystems — verantwortlich für Request-Routing, Authentifizierung, Rate Limiting und API-Versionierung.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Unified API Entry** | Single entry point for all services |
| **JWT Validation** | Zitadel token verification |
| **Rate Limiting** | Per-user and global limits |
| **Request Routing** | Service discovery & forwarding |
| **API Versioning** | `/v1/`, `/v2/` support |
| **Logging & Metrics** | Request tracing, Prometheus export |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 KOMBIFY API                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│    ┌────────────────────────────────────────────────────────────────────────┐   │
│    │                           INTERNET / CLIENTS                            │   │
│    │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │   │
│    │  │ Sphere  │ │ Mobile  │ │ CLI     │ │ Stack   │ │ External API    │  │   │
│    │  │ (Web)   │ │ Apps    │ │ Tools   │ │ Agents  │ │ Consumers       │  │   │
│    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │   │
│    └────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│                                       ▼                                          │
│    ┌────────────────────────────────────────────────────────────────────────┐   │
│    │                        KONG GATEWAY (3.9+)                              │   │
│    │  ┌────────────────────────────────────────────────────────────────┐    │   │
│    │  │                         PLUGINS                                 │    │   │
│    │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │    │   │
│    │  │  │  JWT    │ │  Rate   │ │  CORS   │ │ Logging │ │ Metrics │  │    │   │
│    │  │  │ Verify  │ │ Limit   │ │         │ │         │ │ Prom    │  │    │   │
│    │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │    │   │
│    │  └────────────────────────────────────────────────────────────────┘    │   │
│    │                                                                         │   │
│    │  ┌────────────────────────────────────────────────────────────────┐    │   │
│    │  │                        ROUTING RULES                            │    │   │
│    │  │                                                                 │    │   │
│    │  │  /api/v1/tools/*      →  Administration Backend                 │    │   │
│    │  │  /api/v1/stacks/*     →  Stack Core                            │    │   │
│    │  │  /api/v1/simulations/*→  Sim Engine                            │    │   │
│    │  │  /api/v1/stackkits/*  →  StackKits API                         │    │   │
│    │  │  /api/v1/users/*      →  Zitadel (passthrough)                 │    │   │
│    │  │  /api/v1/billing/*    →  Stripe Proxy                          │    │   │
│    │  │                                                                 │    │   │
│    │  └────────────────────────────────────────────────────────────────┘    │   │
│    └────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                          │
│        ┌──────────────────────────────┼──────────────────────────────┐          │
│        │                              │                              │          │
│        ▼                              ▼                              ▼          │
│  ┌────────────────┐  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  │    kombify     │  │      kombify Stack       │  │     kombify Sim        │  │
│  │ Administration │  │                          │  │                        │  │
│  │   :5380        │  │        :5260             │  │       :5270            │  │
│  └────────────────┘  └──────────────────────────┘  └────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Route Configuration

### Service Routes

| Path Pattern | Service | Auth Required | Rate Limit |
|--------------|---------|---------------|------------|
| `/api/v1/tools/*` | Administration | Yes (Admin) | 100/min |
| `/api/v1/catalog/*` | Administration | Public | 500/min |
| `/api/v1/stacks/*` | Stack Core | Yes | 200/min |
| `/api/v1/simulations/*` | Sim Engine | Yes | 50/min |
| `/api/v1/stackkits/*` | StackKits | Optional | 300/min |
| `/api/v1/users/*` | Zitadel Proxy | Yes | 100/min |
| `/api/v1/billing/*` | Stripe Proxy | Yes | 50/min |
| `/health` | Gateway | No | Unlimited |

### Kong Configuration

```yaml
# kong.yml
_format_version: "3.0"

services:
  # Administration Backend
  - name: administration
    url: http://admin:5380
    routes:
      - name: tools-route
        paths:
          - /api/v1/tools
        methods:
          - GET
          - POST
          - PATCH
          - DELETE
        plugins:
          - name: jwt
            config:
              key_claim_name: kid
          - name: rate-limiting
            config:
              minute: 100

  # Stack Core
  - name: stack
    url: http://stack:5260
    routes:
      - name: stacks-route
        paths:
          - /api/v1/stacks
        plugins:
          - name: jwt
          - name: rate-limiting
            config:
              minute: 200

  # Sim Engine
  - name: sim
    url: http://sim:5270
    routes:
      - name: simulations-route
        paths:
          - /api/v1/simulations
        plugins:
          - name: jwt
          - name: rate-limiting
            config:
              minute: 50

  # Public Catalog (no auth)
  - name: catalog
    url: http://admin:5380
    routes:
      - name: catalog-route
        paths:
          - /api/v1/catalog
        methods:
          - GET
        plugins:
          - name: rate-limiting
            config:
              minute: 500

plugins:
  # Global CORS
  - name: cors
    config:
      origins:
        - https://kombisphere.io
        - https://app.kombisphere.io
        - http://localhost:*
      methods:
        - GET
        - POST
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Authorization
        - Content-Type
      max_age: 3600

  # Global Logging
  - name: file-log
    config:
      path: /var/log/kong/requests.log

  # Prometheus Metrics
  - name: prometheus
    config:
      status_code_metrics: true
      latency_metrics: true
      per_consumer: true
```

---

## JWT Authentication

### Zitadel Integration

```yaml
# JWT Plugin Configuration
plugins:
  - name: jwt
    config:
      key_claim_name: kid
      claims_to_verify:
        - exp
        - iss
      uri_param_names:
        - jwt
      header_names:
        - Authorization
      maximum_expiration: 3600

# JWKS Consumer
consumers:
  - username: zitadel
    jwt_secrets:
      - algorithm: RS256
        key: |
          -----BEGIN PUBLIC KEY-----
          # Zitadel JWKS public key
          -----END PUBLIC KEY-----
```

### Token Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  Client    │────▶│  Zitadel   │────▶│   Kong     │────▶│  Backend   │
│            │ 1.  │            │ 2.  │ Gateway    │ 4.  │  Service   │
│            │Login│            │Token│            │Fwd  │            │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
                                            │
                                       3. Validate
                                          JWT
```

1. **Client** authenticates with Zitadel
2. **Zitadel** issues JWT access token
3. **Kong** validates JWT signature & claims
4. **Kong** forwards request to backend (with `X-User-Id` header)

---

## Rate Limiting

### Tiers

| Tier | Requests/min | Requests/day | Use Case |
|------|--------------|--------------|----------|
| **Anonymous** | 60 | 1,000 | Public catalog |
| **Free** | 100 | 5,000 | Registered users |
| **Pro** | 500 | 50,000 | Paid subscribers |
| **Enterprise** | Unlimited | Unlimited | Enterprise |

### Implementation

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 100
      hour: 5000
      day: 50000
      policy: redis
      redis_host: redis
      redis_port: 6379
      redis_database: 0
      fault_tolerant: true
      hide_client_headers: false
```

### Response Headers

```http
X-RateLimit-Limit-Minute: 100
X-RateLimit-Remaining-Minute: 87
X-RateLimit-Reset: 1706054400
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": 401,
    "message": "Invalid or expired token",
    "request_id": "abc123-def456",
    "timestamp": "2026-01-23T10:00:00Z"
  }
}
```

### Error Codes

| HTTP Status | Kong Code | Description |
|-------------|-----------|-------------|
| 401 | `jwt_missing` | No Authorization header |
| 401 | `jwt_invalid` | Invalid token signature |
| 401 | `jwt_expired` | Token expired |
| 429 | `rate_limited` | Rate limit exceeded |
| 502 | `upstream_error` | Backend unavailable |
| 503 | `service_unavailable` | Gateway overloaded |

---

## Monitoring & Observability

### Prometheus Metrics

```
# Request count by service
kong_http_requests_total{service="stack", status="200"}

# Latency histogram
kong_request_latency_ms_bucket{service="sim", le="100"}

# Rate limit hits
kong_rate_limiting_limit_hit_total{route="tools-route"}
```

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Gateway health |
| `/status` | Kong status |
| `/metrics` | Prometheus export |

---

## Directory Structure

```
KombiSphere-API/
├── kong/
│   ├── kong.yml              # Main Kong config
│   ├── plugins/
│   │   └── custom-auth/      # Custom Lua plugins
│   └── scripts/
│       └── init.sh           # Initialization
│
├── docker-compose.yml        # Kong + Redis
├── docker-compose.dev.yml    # Dev environment
│
├── scripts/
│   ├── seed-routes.sh        # Route seeding
│   └── test-gateway.sh       # Integration tests
│
└── docs/
    ├── API_REFERENCE.md      # API documentation
    └── RATE_LIMITS.md        # Rate limit policy
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `KONG_DATABASE` | `off` (declarative mode) |
| `KONG_DECLARATIVE_CONFIG` | `/kong/kong.yml` |
| `KONG_PROXY_LISTEN` | `0.0.0.0:8000` |
| `KONG_ADMIN_LISTEN` | `127.0.0.1:8001` |
| `KONG_LOG_LEVEL` | `info` |
| `ZITADEL_JWKS_URL` | JWKS endpoint |
| `REDIS_HOST` | Rate limiting backend |

---

## Docker Compose

```yaml
version: "3.8"

services:
  kong:
    image: kong:3.9
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_PROXY_LISTEN: 0.0.0.0:8000
      KONG_ADMIN_LISTEN: 127.0.0.1:8001
    volumes:
      - ./kong:/kong:ro
    ports:
      - "8000:8000"
    depends_on:
      - redis
    networks:
      - kombify-network

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - kombify-network

volumes:
  redis-data:

networks:
  kombify-network:
    external: true
```

---

## API Versioning Strategy

### Current Versions

| Version | Status | Sunset Date |
|---------|--------|-------------|
| `/api/v1/` | **Active** | - |
| `/api/v2/` | Preview | - |

### Deprecation Policy

1. Announce 6 months before sunset
2. Return `Sunset` header on deprecated endpoints
3. Provide migration guide

```http
Sunset: Sat, 01 Jan 2028 00:00:00 GMT
Deprecation: true
Link: <https://docs.kombify.dev/migration/v1-to-v2>; rel="successor-version"
```

---

## Related Documentation

- [kombify Stack](../stack/ARCHITECTURE.md) - Stack Core API
- [kombify Sim](../sim/ARCHITECTURE.md) - Simulation API
- [kombify Administration](../administration/ARCHITECTURE.md) - Tools API
- [Inter-Module Contracts](../../INTER_MODULE_CONTRACTS.md) - API Contracts

---

*Last reviewed: 2026-01-23*
