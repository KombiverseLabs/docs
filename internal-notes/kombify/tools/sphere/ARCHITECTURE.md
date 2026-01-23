# kombify Sphere - Technical Architecture

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-23  
> **Repository:** KombiSphere-Cloud  
> **License:** Proprietary

---

## Module Identity

| Attribute | Value |
|-----------|-------|
| **Product Name** | kombify Sphere |
| **Role** | Customer-facing SaaS Portal |
| **Primary Users** | End users, Subscribers |
| **Tech Stack** | SvelteKit 2.x, TypeScript, Prisma, Stripe |

---

## Overview

**kombify Sphere** ist das SaaS-Portal des kombify-Ökosystems — die zentrale Anlaufstelle für Benutzer, um ihre Homelabs zu verwalten, Abonnements zu managen und SSO-Zugang zu den Core Tools zu erhalten.

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **User Portal** | Dashboard, Profil, Einstellungen |
| **Subscription Management** | Stripe-Integration für Billing |
| **SSO Gateway** | Zitadel OIDC für alle Tools |
| **Marketing Pages** | Landing, Pricing, Features |
| **Activity Logging** | Audit Trail für User Actions |

---

## System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KOMBIFY SPHERE CONTEXT                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────────┐           ┌─────────────────┐                        │
│    │   End Users     │           │   Admin Portal  │                        │
│    │   (Browser)     │           │ (Internal Sync) │                        │
│    └────────┬────────┘           └────────┬────────┘                        │
│             │                             │                                  │
│             ▼                             ▼                                  │
│    ┌────────────────────────────────────────────────────────┐               │
│    │                  kombify Sphere                         │               │
│    │                   (This Module)                         │               │
│    │                                                         │               │
│    │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │               │
│    │   │  Marketing  │  │   User      │  │   Billing   │   │               │
│    │   │   Pages     │  │   Portal    │  │   System    │   │               │
│    │   └─────────────┘  └─────────────┘  └─────────────┘   │               │
│    └──────────┬───────────────┬───────────────┬────────────┘               │
│               │               │               │                             │
│       ┌───────┴───────┐       │       ┌───────┴───────┐                    │
│       ▼               ▼       ▼       ▼               ▼                    │
│  ┌──────────┐   ┌──────────┐  │  ┌──────────┐   ┌──────────┐              │
│  │ Zitadel  │   │ PostgreSQL│  │  │  Stripe  │   │Kong (API)│              │
│  │ (Auth)   │   │(Database) │  │  │(Payments)│   │ Gateway  │              │
│  └──────────┘   └──────────┘  │  └──────────┘   └──────────┘              │
│                               │                                             │
│                               ▼                                             │
│                        ┌──────────────┐                                     │
│                        │  Core Tools  │                                     │
│                        │ (SSO Access) │                                     │
│                        └──────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Responsibilities

### Owns (Primary)

| Responsibility | Description | Status |
|----------------|-------------|--------|
| **User Database** | PostgreSQL - canonical user data | ✅ Schema ready |
| **User Profile** | Profile management, avatar, settings | ✅ 90% |
| **Subscriptions** | Stripe checkout, portal, lifecycle | ✅ 95% |
| **Invoices** | Invoice storage and history | ✅ 90% |
| **Usage Tracking** | API calls, project counts | ✅ 70% |
| **Activity Logs** | User action audit trail | ✅ 90% |
| **SSO Tokens** | JWT generation for core tools | ✅ 80% |
| **Marketing Pages** | Landing, pricing, features | ✅ 100% |

### Does NOT Own

| Responsibility | Owner |
|----------------|-------|
| User Authentication | Zitadel |
| Role Management | Zitadel |
| Tools Catalog | Administration |
| Admin Operations | Administration |
| API Routing | API Gateway |

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                                │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ Marketing Pages│ │  Dashboard     │ │  Billing       │ │  Settings    │ │
│  │ (/,/pricing,..)│ │  (/dashboard)  │ │  (/billing)    │ │  (/settings) │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                              API LAYER                                       │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ /api/profile   │ │ /api/billing   │ │ /api/sso       │ │ /api/audit   │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                            WEBHOOK LAYER                                     │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────────────┐│
│  │     /api/webhooks/stripe        │ │     /api/webhooks/zitadel          ││
│  │  • checkout.session.completed   │ │  • user.created                    ││
│  │  • subscription.created/updated │ │  • user.updated                    ││
│  │  • invoice.paid                 │ │  • user.deleted                    ││
│  └─────────────────────────────────┘ └─────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│                            SERVICE LAYER                                     │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ lib/server/    │ │ lib/server/    │ │ lib/server/    │ │ lib/server/  │ │
│  │ profile.ts     │ │ stripe.ts      │ │ sso-jwt.ts     │ │ audit.ts     │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DATA LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         Prisma ORM                                       ││
│  │  ┌───────┐ ┌──────────────┐ ┌─────────┐ ┌───────┐ ┌────────────────┐   ││
│  │  │ User  │ │ Subscription │ │ Invoice │ │ Usage │ │ ActivityLog    │   ││
│  │  └───────┘ └──────────────┘ └─────────┘ └───────┘ └────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Core Entities

```typescript
// User (synced from Zitadel)
interface User {
  id: string;           // UUID
  email: string;        // Unique
  name?: string;
  avatarUrl?: string;
  stripeCustomerId?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription
interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: SubscriptionStatus;
  plan: Plan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// Invoice
interface Invoice {
  id: string;
  userId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  invoicePdf?: string;
  paidAt?: Date;
}

// Usage
interface Usage {
  id: string;
  userId: string;
  period: string;      // YYYY-MM
  apiCalls: number;
  projectCount: number;
}

// ActivityLog
interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata: object;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
```

### Enums

```typescript
enum UserRole {
  USER = 'USER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN'
}

enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE'
}

enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}
```

---

## Authentication Flow

### Zitadel OIDC Integration

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   User         │────▶│ kombify Sphere │────▶│    Zitadel     │
│   (Browser)    │     │   (Auth.js)    │     │     OIDC       │
└────────────────┘     └────────────────┘     └────────────────┘
       │                                              │
       │              ┌───────────────────────────────┘
       │              ▼
       │       ┌────────────────┐
       └──────▶│  JWT Token     │
               │  + Session     │
               └────────────────┘
```

### SSO to Core Tools

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ User clicks    │────▶│ Sphere         │────▶│ Kong Gateway   │
│ "Open Stack"   │     │ generates JWT  │     │ validates JWT  │
└────────────────┘     └────────────────┘     └────────────────┘
                                                      │
                                                      ▼
                                               ┌────────────────┐
                                               │ kombify Stack  │
                                               │ SSO Exchange   │
                                               └────────────────┘
```

---

## Stripe Integration

### Checkout Flow

```
User clicks "Upgrade" → Stripe Checkout Session → Payment → Webhook → Update DB
```

### Supported Events

| Event | Handler Action |
|-------|----------------|
| `checkout.session.completed` | Create subscription |
| `customer.subscription.created` | Store subscription |
| `customer.subscription.updated` | Update status |
| `customer.subscription.deleted` | Mark canceled |
| `invoice.paid` | Create invoice record |
| `invoice.payment_failed` | Update to PAST_DUE |

### Pricing Configuration

```typescript
const PLANS = {
  FREE: {
    priceId: null,
    features: ['1 homelab', 'Community support']
  },
  PRO: {
    priceId: 'price_xxx',
    price: 9,
    features: ['3 homelabs', 'Priority support', 'Advanced features']
  },
  ENTERPRISE: {
    priceId: 'price_yyy',
    features: ['Unlimited', 'SLA', 'Dedicated support']
  }
};
```

---

## Directory Structure

```
KombiSphere-Cloud/
├── src/
│   ├── routes/
│   │   ├── (marketing)/      # Public pages
│   │   │   ├── +page.svelte  # Landing
│   │   │   ├── pricing/
│   │   │   └── features/
│   │   ├── (app)/            # Authenticated pages
│   │   │   ├── dashboard/
│   │   │   ├── billing/
│   │   │   └── settings/
│   │   └── api/
│   │       ├── profile/
│   │       ├── billing/
│   │       ├── sso/
│   │       └── webhooks/
│   │
│   ├── lib/
│   │   ├── server/           # Server-only code
│   │   │   ├── db.ts
│   │   │   ├── stripe.ts
│   │   │   ├── auth.ts
│   │   │   └── sso-jwt.ts
│   │   └── components/
│   │
│   └── hooks.server.ts       # Auth middleware
│
├── prisma/
│   └── schema.prisma
│
└── static/
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `ZITADEL_ISSUER` | OIDC issuer URL |
| `ZITADEL_CLIENT_ID` | OIDC client ID |
| `ZITADEL_CLIENT_SECRET` | OIDC secret |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `JWT_SIGNING_KEY` | SSO token signing |

---

## API Reference

### Profile Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/profile` | GET | Get current user profile |
| `/api/profile` | PATCH | Update profile |
| `/api/profile/avatar` | POST | Upload avatar |

### Billing Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/billing/subscription` | GET | Get subscription status |
| `/api/billing/checkout` | POST | Create checkout session |
| `/api/billing/portal` | POST | Get customer portal URL |
| `/api/billing/invoices` | GET | List invoices |

### SSO Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sso/token` | POST | Generate SSO token for tool |
| `/api/sso/validate` | POST | Validate SSO token |

---

## Related Documentation

- [kombify Administration](../administration/ARCHITECTURE.md) - Admin Backend
- [kombify API](../api-gateway/ARCHITECTURE.md) - API Gateway
- [Inter-Module Contracts](../../INTER_MODULE_CONTRACTS.md) - API Contracts

---

*Last reviewed: 2026-01-23*
