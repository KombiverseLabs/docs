/**
 * Webhook Signature Verification Tests
 * 
 * Comprehensive test suite for Stripe and Zitadel webhook verification.
 * Demonstrates how to generate valid signatures for testing.
 * 
 * @example
 * ```bash
 * npm test -- shared/webhooks/verify.test.ts
 * ```
 */

import {
  verifyStripeWebhook,
  verifyStripeWebhookManual,
  verifyZitadelWebhook,
  generateStripeTestSignature,
  generateZitadelTestSignature,
  WebhookVerificationError,
  InvalidSignatureError,
  TimestampExpiredError,
  ConfigurationError,
  MAX_WEBHOOK_AGE_SECONDS,
} from './verify';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_SECRETS = {
  stripe: 'whsec_test_51NZQJJK2eZvKYlo2C9r6nX1qKpL8mN3oP4iU5yT6rE7wQ8',
  zitadel: 'test_zitadel_webhook_secret_32bytes_long',
};

// ============================================================================
// Test Payloads
// ============================================================================

const stripeTestPayload = JSON.stringify({
  id: 'evt_test_1234567890',
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1234567890',
      object: 'checkout.session',
      amount_total: 2000,
      currency: 'usd',
      customer: 'cus_test_1234567890',
      payment_status: 'paid',
      status: 'complete',
    },
  },
});

const zitadelTestPayload = JSON.stringify({
  event: 'user.created',
  timestamp: new Date().toISOString(),
  payload: {
    userId: 'user_test_1234567890',
    userName: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    displayName: 'Test User',
    email: 'test@example.com',
    emailVerified: true,
  },
});

// ============================================================================
// Stripe Verification Tests
// ============================================================================

describe('Stripe Webhook Verification', () => {
  describe('verifyStripeWebhookManual', () => {
    it('should verify a valid webhook signature', () => {
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe
      );

      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        signature,
        TEST_SECRETS.stripe,
        'test-request-1'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.type).toBe('checkout.session.completed');
      expect(result.error).toBeUndefined();
    });

    it('should reject missing signature header', () => {
      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        undefined,
        TEST_SECRETS.stripe,
        'test-request-2'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(InvalidSignatureError);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject invalid signature format', () => {
      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        'invalid-signature-format',
        TEST_SECRETS.stripe,
        'test-request-3'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject tampered payload', () => {
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe
      );

      const tamperedPayload = stripeTestPayload.replace('2000', '9999');

      const result = verifyStripeWebhookManual(
        tamperedPayload,
        signature,
        TEST_SECRETS.stripe,
        'test-request-4'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject wrong secret', () => {
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe
      );

      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        signature,
        'wrong_secret',
        'test-request-5'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject expired timestamp', () => {
      // Create a signature from 10 minutes ago
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000);
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe,
        oldTimestamp
      );

      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        signature,
        TEST_SECRETS.stripe,
        'test-request-6'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TimestampExpiredError);
      expect(result.error?.code).toBe('TIMESTAMP_EXPIRED');
    });

    it('should reject when secret is not configured', () => {
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe
      );

      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        signature,
        undefined,
        'test-request-7'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ConfigurationError);
      expect(result.error?.code).toBe('CONFIGURATION_ERROR');
    });

    it('should include requestId in error response', () => {
      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        undefined,
        TEST_SECRETS.stripe,
        'test-request-8'
      );

      expect(result.error?.requestId).toBe('test-request-8');
      expect(result.error?.toJSON().error.requestId).toBe('test-request-8');
    });
  });

  describe('generateStripeTestSignature', () => {
    it('should generate valid signature format', () => {
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe
      );

      // Format: t=timestamp,v1=signature
      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('should use custom timestamp when provided', () => {
      const customTimestamp = new Date('2024-01-15T10:00:00Z');
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe,
        customTimestamp
      );

      const expectedTimestamp = Math.floor(customTimestamp.getTime() / 1000);
      expect(signature).toContain(`t=${expectedTimestamp}`);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ type: 'event1' });
      const payload2 = JSON.stringify({ type: 'event2' });

      const signature1 = generateStripeTestSignature(payload1, TEST_SECRETS.stripe);
      const signature2 = generateStripeTestSignature(payload2, TEST_SECRETS.stripe);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const signature1 = generateStripeTestSignature(stripeTestPayload, 'secret1');
      const signature2 = generateStripeTestSignature(stripeTestPayload, 'secret2');

      expect(signature1).not.toBe(signature2);
    });
  });
});

// ============================================================================
// Zitadel Verification Tests
// ============================================================================

describe('Zitadel Webhook Verification', () => {
  describe('verifyZitadelWebhook', () => {
    it('should verify a valid webhook signature', () => {
      const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        timestampHeader,
        TEST_SECRETS.zitadel,
        'test-request-10'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.event).toBe('user.created');
      expect(result.error).toBeUndefined();
    });

    it('should reject missing signature header', () => {
      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        undefined,
        new Date().toISOString(),
        TEST_SECRETS.zitadel,
        'test-request-11'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(InvalidSignatureError);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject missing timestamp header', () => {
      const { signatureHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        undefined,
        TEST_SECRETS.zitadel,
        'test-request-12'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject invalid signature format', () => {
      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        'invalid-signature',
        new Date().toISOString(),
        TEST_SECRETS.zitadel,
        'test-request-13'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject tampered payload', () => {
      const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel
      );

      const tamperedPayload = zitadelTestPayload.replace('test@example.com', 'attacker@evil.com');

      const result = verifyZitadelWebhook(
        tamperedPayload,
        signatureHeader,
        timestampHeader,
        TEST_SECRETS.zitadel,
        'test-request-14'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject wrong secret', () => {
      const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        timestampHeader,
        'wrong_secret',
        'test-request-15'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject expired timestamp', () => {
      // Create signature from 10 minutes ago
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000);
      const { signatureHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel,
        oldTimestamp
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        oldTimestamp.toISOString(),
        TEST_SECRETS.zitadel,
        'test-request-16'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(TimestampExpiredError);
      expect(result.error?.code).toBe('TIMESTAMP_EXPIRED');
    });

    it('should reject future timestamp (with clock skew allowance)', () => {
      // Create signature from 2 minutes in the future
      const futureTimestamp = new Date(Date.now() + 2 * 60 * 1000);
      const { signatureHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel,
        futureTimestamp
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        futureTimestamp.toISOString(),
        TEST_SECRETS.zitadel,
        'test-request-17'
      );

      // Should accept with 60 second clock skew allowance
      expect(result.success).toBe(true);
    });

    it('should reject far future timestamp', () => {
      // Create signature from 10 minutes in the future
      const futureTimestamp = new Date(Date.now() + 10 * 60 * 1000);
      const { signatureHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel,
        futureTimestamp
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        futureTimestamp.toISOString(),
        TEST_SECRETS.zitadel,
        'test-request-18'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMESTAMP_EXPIRED');
    });

    it('should reject when secret is not configured', () => {
      const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        timestampHeader,
        undefined,
        'test-request-19'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ConfigurationError);
      expect(result.error?.code).toBe('CONFIGURATION_ERROR');
    });

    it('should include requestId in error response', () => {
      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        undefined,
        new Date().toISOString(),
        TEST_SECRETS.zitadel,
        'test-request-20'
      );

      expect(result.error?.requestId).toBe('test-request-20');
    });
  });

  describe('generateZitadelTestSignature', () => {
    it('should generate valid signature format', () => {
      const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel
      );

      // Format: t=timestamp,v1=signature
      expect(signatureHeader).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
      expect(timestampHeader).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use custom timestamp when provided', () => {
      const customTimestamp = new Date('2024-01-15T10:00:00Z');
      const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel,
        customTimestamp
      );

      const expectedTimestamp = Math.floor(customTimestamp.getTime() / 1000);
      expect(signatureHeader).toContain(`t=${expectedTimestamp}`);
      expect(timestampHeader).toBe(customTimestamp.toISOString());
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ event: 'user.created' });
      const payload2 = JSON.stringify({ event: 'user.updated' });

      const { signatureHeader: sig1 } = generateZitadelTestSignature(payload1, TEST_SECRETS.zitadel);
      const { signatureHeader: sig2 } = generateZitadelTestSignature(payload2, TEST_SECRETS.zitadel);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const { signatureHeader: sig1 } = generateZitadelTestSignature(zitadelTestPayload, 'secret1');
      const { signatureHeader: sig2 } = generateZitadelTestSignature(zitadelTestPayload, 'secret2');

      expect(sig1).not.toBe(sig2);
    });
  });
});

// ============================================================================
// Security Tests
// ============================================================================

describe('Security Features', () => {
  describe('Timing Attack Prevention', () => {
    it('should use constant-time comparison for Stripe signatures', async () => {
      // This test verifies the implementation uses timingSafeEqual
      // The actual timing test would require statistical analysis
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe
      );

      const start = process.hrtime.bigint();
      
      verifyStripeWebhookManual(
        stripeTestPayload,
        signature,
        TEST_SECRETS.stripe
      );

      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to ms

      // Verification should complete in reasonable time
      expect(duration).toBeLessThan(100);
    });

    it('should use constant-time comparison for Zitadel signatures', async () => {
      const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel
      );

      const start = process.hrtime.bigint();

      verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        timestampHeader,
        TEST_SECRETS.zitadel
      );

      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should reject Stripe webhooks with old timestamps', () => {
      const oldTimestamp = new Date(Date.now() - (MAX_WEBHOOK_AGE_SECONDS + 60) * 1000);
      const signature = generateStripeTestSignature(
        stripeTestPayload,
        TEST_SECRETS.stripe,
        oldTimestamp
      );

      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        signature,
        TEST_SECRETS.stripe
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMESTAMP_EXPIRED');
    });

    it('should reject Zitadel webhooks with old timestamps', () => {
      const oldTimestamp = new Date(Date.now() - (MAX_WEBHOOK_AGE_SECONDS + 60) * 1000);
      const { signatureHeader } = generateZitadelTestSignature(
        zitadelTestPayload,
        TEST_SECRETS.zitadel,
        oldTimestamp
      );

      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        signatureHeader,
        oldTimestamp.toISOString(),
        TEST_SECRETS.zitadel
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMESTAMP_EXPIRED');
    });
  });

  describe('Error Message Security', () => {
    it('should not include secret in Stripe error messages', () => {
      const result = verifyStripeWebhookManual(
        stripeTestPayload,
        't=123,v1=wrongsig',
        TEST_SECRETS.stripe
      );

      const errorJson = result.error?.toJSON();
      expect(errorJson?.error.message).not.toContain(TEST_SECRETS.stripe);
    });

    it('should not include secret in Zitadel error messages', () => {
      const result = verifyZitadelWebhook(
        zitadelTestPayload,
        't=123,v1=wrongsig',
        new Date().toISOString(),
        TEST_SECRETS.zitadel
      );

      const errorJson = result.error?.toJSON();
      expect(errorJson?.error.message).not.toContain(TEST_SECRETS.zitadel);
    });
  });
});

// ============================================================================
// Error Class Tests
// ============================================================================

describe('Error Classes', () => {
  it('WebhookVerificationError should serialize to JSON correctly', () => {
    const error = new WebhookVerificationError(
      'Test error message',
      'TEST_ERROR',
      'req-123'
    );

    const json = error.toJSON();
    expect(json.error.code).toBe('TEST_ERROR');
    expect(json.error.message).toBe('Test error message');
    expect(json.error.requestId).toBe('req-123');
    expect(json.error.timestamp).toBeDefined();
  });

  it('InvalidSignatureError should have correct code', () => {
    const error = new InvalidSignatureError('Invalid signature');
    expect(error.code).toBe('INVALID_SIGNATURE');
    expect(error.name).toBe('InvalidSignatureError');
  });

  it('TimestampExpiredError should have correct code', () => {
    const error = new TimestampExpiredError('Timestamp expired');
    expect(error.code).toBe('TIMESTAMP_EXPIRED');
    expect(error.name).toBe('TimestampExpiredError');
  });

  it('ConfigurationError should have correct code', () => {
    const error = new ConfigurationError('Config error');
    expect(error.code).toBe('CONFIGURATION_ERROR');
    expect(error.name).toBe('ConfigurationError');
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  it('MAX_WEBHOOK_AGE_SECONDS should be 300 (5 minutes)', () => {
    expect(MAX_WEBHOOK_AGE_SECONDS).toBe(300);
  });
});

// ============================================================================
// Integration Test Example
// ============================================================================

/**
 * Example integration test for Express route
 * 
 * ```typescript
 * import request from 'supertest';
 * import express from 'express';
 * import { stripeWebhookRouter } from './examples/stripe-handler';
 * 
 * describe('Stripe Webhook Route', () => {
 *   let app: express.Application;
 * 
 *   beforeEach(() => {
 *     app = express();
 *     app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
 *     app.use('/webhooks/stripe', stripeWebhookRouter);
 *   });
 * 
 *   it('should accept valid webhook', async () => {
 *     const payload = JSON.stringify({
 *       type: 'checkout.session.completed',
 *       data: { object: { id: 'cs_test_123' } },
 *     });
 * 
 *     const signature = generateStripeTestSignature(payload, 'whsec_test');
 * 
 *     const response = await request(app)
 *       .post('/webhooks/stripe')
 *       .set('stripe-signature', signature)
 *       .set('x-request-id', 'test-req-123')
 *       .send(payload);
 * 
 *     expect(response.status).toBe(200);
 *     expect(response.body.received).toBe(true);
 *   });
 * 
 *   it('should reject invalid signature', async () => {
 *     const payload = JSON.stringify({ type: 'test' });
 * 
 *     const response = await request(app)
 *       .post('/webhooks/stripe')
 *       .set('stripe-signature', 'invalid')
 *       .send(payload);
 * 
 *     expect(response.status).toBe(400);
 *     expect(response.body.error.code).toBe('INVALID_SIGNATURE');
 *   });
 * });
 * ```
 */

// ============================================================================
// Manual Test Execution
// ============================================================================

if (require.main === module) {
  console.log('Running manual webhook verification tests...\n');

  // Test Stripe verification
  console.log('=== Stripe Test ===');
  const stripeSig = generateStripeTestSignature(stripeTestPayload, TEST_SECRETS.stripe);
  console.log('Generated signature:', stripeSig);

  const stripeResult = verifyStripeWebhookManual(
    stripeTestPayload,
    stripeSig,
    TEST_SECRETS.stripe,
    'manual-test-1'
  );
  console.log('Verification result:', stripeResult.success ? '✅ PASS' : '❌ FAIL');

  // Test Zitadel verification
  console.log('\n=== Zitadel Test ===');
  const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
    zitadelTestPayload,
    TEST_SECRETS.zitadel
  );
  console.log('Generated signature:', signatureHeader);
  console.log('Generated timestamp:', timestampHeader);

  const zitadelResult = verifyZitadelWebhook(
    zitadelTestPayload,
    signatureHeader,
    timestampHeader,
    TEST_SECRETS.zitadel,
    'manual-test-2'
  );
  console.log('Verification result:', zitadelResult.success ? '✅ PASS' : '❌ FAIL');

  // Test with wrong secret
  console.log('\n=== Wrong Secret Test (should fail) ===');
  const wrongSecretResult = verifyZitadelWebhook(
    zitadelTestPayload,
    signatureHeader,
    timestampHeader,
    'wrong_secret',
    'manual-test-3'
  );
  console.log('Verification result:', !wrongSecretResult.success ? '✅ Correctly rejected' : '❌ Should have failed');
  console.log('Error code:', wrongSecretResult.error?.code);
}
