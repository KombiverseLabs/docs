# Webhook Signature Verification

Production-ready webhook signature verification for Stripe and Zitadel.

## Overview

This module provides secure signature verification for incoming webhooks, protecting your application against spoofing and replay attacks.

**Security Features:**
- ✅ Constant-time signature comparison (prevents timing attacks)
- ✅ Timestamp validation with 5-minute expiration (prevents replay attacks)
- ✅ Structured error responses with request IDs
- ✅ Secrets are never logged

## Installation

```bash
npm install @kombify/shared
```

**Peer Dependencies:**
```bash
npm install stripe  # Optional - for SDK-based Stripe verification
```

## Quick Start

### Environment Variables

```bash
# Stripe
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SECRET_KEY=sk_...  # Required for SDK-based verification

# Zitadel
ZITADEL_WEBHOOK_SECRET=your-webhook-secret
```

### Stripe Webhook Handler

```typescript
import { verifyStripeWebhook } from '@kombify/shared/webhooks';
import type { StripeWebhookEvent } from '@kombify/shared/webhooks';

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  const requestId = req.headers['x-request-id'] as string;

  const result = verifyStripeWebhook(
    req.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
    requestId
  );

  if (!result.success) {
    console.warn('Stripe webhook rejected', {
      requestId,
      code: result.error?.code,
      message: result.error?.message,
    });
    return res.status(400).json(result.error?.toJSON());
  }

  const event = result.data as StripeWebhookEvent;

  // Handle the verified event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    // ... handle other events
  }

  res.json({ received: true });
});
```

### Zitadel Webhook Handler

```typescript
import { verifyZitadelWebhook } from '@kombify/shared/webhooks';
import type { ZitadelWebhookPayload } from '@kombify/shared/webhooks';

app.post('/api/webhooks/zitadel', express.json(), (req, res) => {
  const signature = req.headers['zitadel-signature'] as string;
  const timestamp = req.headers['zitadel-timestamp'] as string;
  const requestId = req.headers['x-request-id'] as string;

  const result = verifyZitadelWebhook(
    JSON.stringify(req.body),
    signature,
    timestamp,
    process.env.ZITADEL_WEBHOOK_SECRET,
    requestId
  );

  if (!result.success) {
    console.warn('Zitadel webhook rejected', {
      requestId,
      code: result.error?.code,
      message: result.error?.message,
    });
    return res.status(400).json(result.error?.toJSON());
  }

  const event = result.data as ZitadelWebhookPayload;

  // Handle the verified event
  switch (event.event) {
    case 'user.created':
      await handleUserCreated(event.payload);
      break;
    case 'user.updated':
      await handleUserUpdated(event.payload);
      break;
    // ... handle other events
  }

  res.json({ received: true });
});
```

## API Reference

### `verifyStripeWebhook(payload, signature, secret, requestId?)`

Verifies Stripe webhook signature using the official Stripe SDK.

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `string \| Buffer` | Raw request body |
| `signature` | `string` | Value from `stripe-signature` header |
| `secret` | `string` | Stripe webhook secret |
| `requestId` | `string` | Optional request ID for error tracking |

**Returns:** `VerificationResult<StripeWebhookEvent>`

### `verifyZitadelWebhook(payload, signature, timestamp, secret, requestId?)`

Verifies Zitadel webhook signature using HMAC-SHA256.

| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `string \| Buffer` | Raw request body |
| `signature` | `string` | Value from `zitadel-signature` header |
| `timestamp` | `string` | Value from `zitadel-timestamp` header (ISO8601) |
| `secret` | `string` | Zitadel webhook secret |
| `requestId` | `string` | Optional request ID for error tracking |

**Returns:** `VerificationResult<ZitadelWebhookPayload>`

### Error Classes

All errors extend `WebhookVerificationError`:

```typescript
class WebhookVerificationError extends Error {
  code: string;           // Machine-readable error code
  requestId?: string;     // Request ID for debugging
  timestamp: string;      // ISO8601 timestamp
  
  toJSON(): ErrorResponse; // Returns serializable error object
}
```

**Error Types:**

| Class | Code | HTTP Status | Description |
|-------|------|-------------|-------------|
| `InvalidSignatureError` | `INVALID_SIGNATURE` | 400 | Signature missing, malformed, or incorrect |
| `TimestampExpiredError` | `TIMESTAMP_EXPIRED` | 400 | Request timestamp too old (>5 min) |
| `ConfigurationError` | `CONFIGURATION_ERROR` | 500 | Webhook secret not configured |

## Testing

### Generating Test Signatures

Use the test utilities to generate valid signatures for unit tests:

```typescript
import { 
  generateStripeTestSignature,
  generateZitadelTestSignature 
} from '@kombify/shared/webhooks';

describe('Stripe Webhooks', () => {
  it('should accept valid webhook', async () => {
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123' } },
    });

    const signature = generateStripeTestSignature(
      payload,
      'whsec_test_secret'
    );

    const result = await request(app)
      .post('/api/webhooks/stripe')
      .set('stripe-signature', signature)
      .send(payload);

    expect(result.status).toBe(200);
  });
});

describe('Zitadel Webhooks', () => {
  it('should accept valid webhook', async () => {
    const payload = JSON.stringify({
      event: 'user.created',
      payload: { userId: 'user_123' },
    });

    const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
      payload,
      'test_secret'
    );

    const result = await request(app)
      .post('/api/webhooks/zitadel')
      .set('zitadel-signature', signatureHeader)
      .set('zitadel-timestamp', timestampHeader)
      .send(payload);

    expect(result.status).toBe(200);
  });
});
```

### Testing Expired Timestamps

```typescript
import { generateStripeTestSignature } from '@kombify/shared/webhooks';

it('should reject expired webhook', async () => {
  const payload = JSON.stringify({ type: 'test' });
  
  // Create signature from 10 minutes ago
  const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000);
  const signature = generateStripeTestSignature(
    payload,
    'whsec_test_secret',
    oldTimestamp
  );

  const result = await request(app)
    .post('/api/webhooks/stripe')
    .set('stripe-signature', signature)
    .send(payload);

  expect(result.status).toBe(400);
  expect(result.body.error.code).toBe('TIMESTAMP_EXPIRED');
});
```

## Security Considerations

### 1. Never Log Secrets

✅ **Good:**
```typescript
console.warn('Webhook failed', { requestId, error: error.message });
```

❌ **Bad:**
```typescript
console.warn('Webhook failed', { signature, secret, payload });
```

### 2. Use Raw Body for Stripe

Stripe signatures are computed on the raw request body. Ensure Express doesn't parse JSON before verification:

```typescript
// Correct: Raw body
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handler);

// Wrong: Parsed body
app.post('/webhooks/stripe', express.json(), handler); // ❌ Signature will fail
```

### 3. Constant-Time Comparison

This library uses `crypto.timingSafeEqual()` for signature comparison to prevent timing attacks.

### 4. Timestamp Validation

Both Stripe and Zitadel verifications reject requests older than 5 minutes to prevent replay attacks.

### 5. Required Headers

| Provider | Required Headers |
|----------|------------------|
| Stripe | `stripe-signature` |
| Zitadel | `zitadel-signature`, `zitadel-timestamp` |

## Supported Events

### Stripe Events (Contract 3)

| Event | Handler Action |
|-------|----------------|
| `checkout.session.completed` | Create subscription in DB |
| `customer.subscription.created` | Create subscription record |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Mark subscription as canceled |
| `invoice.paid` | Create invoice record |
| `invoice.payment_failed` | Update subscription to `PAST_DUE` |
| `customer.updated` | Sync customer details |

### Zitadel Events (Contract 4)

| Event | Handler Action |
|-------|----------------|
| `user.created` | Create user row in Postgres |
| `user.updated` | Update cached profile fields |
| `user.deleted` | Soft-delete or anonymize app data |
| `user.deactivated` | Suspend access |
| `user.reactivated` | Restore access |

## Related Documentation

- [Stripe Webhook Signatures](https://stripe.com/docs/webhooks/signatures)
- [Zitadel Webhooks](https://zitadel.com/docs/guides/integrate/webhooks)
- [INTER_MODULE_CONTRACTS.md](../../internal-notes/kombify/INTER_MODULE_CONTRACTS.md) - Contract 3 (Stripe) and Contract 4 (Zitadel)

## License

MIT - Part of the kombify project.
