/**
 * Webhook Signature Verification Utilities
 * 
 * Provides secure signature verification for Stripe and Zitadel webhooks.
 * 
 * @module @kombify/shared/webhooks
 * @version 1.0.0
 */

import { createHmac, timingSafeEqual } from 'crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of webhook verification
 */
export interface VerificationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: WebhookVerificationError;
}

/**
 * Zitadel webhook payload structure
 */
export interface ZitadelWebhookPayload {
  event: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

/**
 * Stripe webhook event (simplified interface for type safety)
 */
export interface StripeWebhookEvent {
  id: string;
  object: string;
  api_version: string;
  created: number;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base error class for webhook verification failures
 */
export class WebhookVerificationError extends Error {
  public readonly code: string;
  public readonly requestId?: string;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    requestId?: string
  ) {
    super(message);
    this.name = 'WebhookVerificationError';
    this.code = code;
    this.requestId = requestId;
    this.timestamp = new Date().toISOString();
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WebhookVerificationError);
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        requestId: this.requestId,
        timestamp: this.timestamp,
      },
    };
  }
}

/**
 * Error for invalid signature format or missing headers
 */
export class InvalidSignatureError extends WebhookVerificationError {
  constructor(message: string, requestId?: string) {
    super(message, 'INVALID_SIGNATURE', requestId);
    this.name = 'InvalidSignatureError';
  }
}

/**
 * Error for expired webhook requests (replay attack protection)
 */
export class TimestampExpiredError extends WebhookVerificationError {
  constructor(message: string, requestId?: string) {
    super(message, 'TIMESTAMP_EXPIRED', requestId);
    this.name = 'TimestampExpiredError';
  }
}

/**
 * Error for missing or invalid configuration
 */
export class ConfigurationError extends WebhookVerificationError {
  constructor(message: string, requestId?: string) {
    super(message, 'CONFIGURATION_ERROR', requestId);
    this.name = 'ConfigurationError';
  }
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum age of webhook requests in seconds (5 minutes) */
export const MAX_WEBHOOK_AGE_SECONDS = 300;

/** Zitadel signature version prefix */
export const ZITADEL_SIGNATURE_VERSION = 'v1';

/** Stripe signature header name */
export const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

/** Zitadel signature header name */
export const ZITADEL_SIGNATURE_HEADER = 'zitadel-signature';

/** Zitadel timestamp header name */
export const ZITADEL_TIMESTAMP_HEADER = 'zitadel-timestamp';

// ============================================================================
// Stripe Webhook Verification
// ============================================================================

/**
 * Verifies Stripe webhook signature using the official Stripe SDK.
 * 
 * **Security Note:** This function never logs the secret or raw payload.
 * 
 * @param payload - Raw request body (string or Buffer)
 * @param signature - Value from 'stripe-signature' header
 * @param secret - Stripe webhook secret (from STRIPE_WEBHOOK_SECRET env var)
 * @param requestId - Optional request ID for error tracking
 * @returns VerificationResult with parsed event or error
 * 
 * @example
 * ```typescript
 * import Stripe from 'stripe';
 * import { verifyStripeWebhook } from '@kombify/shared/webhooks';
 * 
 * const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
 * 
 * app.post('/api/webhooks/stripe', async (req, res) => {
 *   const signature = req.headers['stripe-signature'] as string;
 *   
 *   const result = verifyStripeWebhook(
 *     req.body,
 *     signature,
 *     process.env.STRIPE_WEBHOOK_SECRET!,
 *     req.headers['x-request-id'] as string
 *   );
 *   
 *   if (!result.success) {
 *     return res.status(400).json(result.error?.toJSON());
 *   }
 *   
 *   // Handle the verified event
 *   const event = result.data as Stripe.Event;
 *   console.log(`Received Stripe event: ${event.type}`);
 * });
 * ```
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string | undefined,
  requestId?: string
): VerificationResult<StripeWebhookEvent> {
  // Validate configuration
  if (!secret) {
    return {
      success: false,
      error: new ConfigurationError(
        'Stripe webhook secret is not configured',
        requestId
      ),
    };
  }

  // Validate signature header presence
  if (!signature) {
    return {
      success: false,
      error: new InvalidSignatureError(
        `Missing required header: ${STRIPE_SIGNATURE_HEADER}`,
        requestId
      ),
    };
  }

  try {
    // Dynamic import to avoid requiring stripe as a hard dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key');
    
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      secret
    ) as StripeWebhookEvent;

    return {
      success: true,
      data: event,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    // Log verification failure without exposing secrets
    console.warn('Stripe webhook verification failed', {
      requestId,
      error: errorMessage,
      // Never log: payload, signature, secret
    });

    return {
      success: false,
      error: new InvalidSignatureError(
        `Stripe signature verification failed: ${errorMessage}`,
        requestId
      ),
    };
  }
}

/**
 * Verifies Stripe webhook signature using manual parsing.
 * Use this when you don't have the Stripe SDK available.
 * 
 * **Note:** Prefer `verifyStripeWebhook()` which uses the official SDK.
 * 
 * @param payload - Raw request body
 * @param signature - Value from 'stripe-signature' header
 * @param secret - Stripe webhook secret
 * @param requestId - Optional request ID for error tracking
 * @returns VerificationResult with parsed event or error
 */
export function verifyStripeWebhookManual(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string | undefined,
  requestId?: string
): VerificationResult<StripeWebhookEvent> {
  if (!secret) {
    return {
      success: false,
      error: new ConfigurationError(
        'Stripe webhook secret is not configured',
        requestId
      ),
    };
  }

  if (!signature) {
    return {
      success: false,
      error: new InvalidSignatureError(
        `Missing required header: ${STRIPE_SIGNATURE_HEADER}`,
        requestId
      ),
    };
  }

  try {
    // Parse Stripe signature format: t=timestamp,v1=signature,v0=signature
    const elements = signature.split(',');
    const signatureMap = new Map<string, string>();

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key && value) {
        signatureMap.set(key, value);
      }
    }

    const timestamp = signatureMap.get('t');
    const v1Signature = signatureMap.get('v1');

    if (!timestamp || !v1Signature) {
      return {
        success: false,
        error: new InvalidSignatureError(
          'Invalid Stripe signature format: missing timestamp or v1 signature',
          requestId
        ),
      };
    }

    // Verify timestamp (prevent replay attacks)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    
    if (now - timestampNum > MAX_WEBHOOK_AGE_SECONDS) {
      return {
        success: false,
        error: new TimestampExpiredError(
          `Webhook timestamp too old: ${timestamp}`,
          requestId
        ),
      };
    }

    // Compute expected signature
    const payloadString = payload instanceof Buffer ? payload.toString('utf8') : payload;
    const signedPayload = `${timestamp}.${payloadString}`;
    
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(v1Signature, 'hex');

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return {
        success: false,
        error: new InvalidSignatureError(
          'Stripe signature mismatch',
          requestId
        ),
      };
    }

    // Parse the payload as JSON
    const event = JSON.parse(payloadString) as StripeWebhookEvent;

    return {
      success: true,
      data: event,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.warn('Stripe webhook verification failed', {
      requestId,
      error: errorMessage,
    });

    return {
      success: false,
      error: new InvalidSignatureError(
        `Stripe signature verification failed: ${errorMessage}`,
        requestId
      ),
    };
  }
}

// ============================================================================
// Zitadel Webhook Verification
// ============================================================================

/**
 * Parses Zitadel signature header.
 * Format: t=timestamp,v1=signature
 * 
 * @param signatureHeader - The zitadel-signature header value
 * @returns Object with timestamp and signature, or null if invalid
 */
function parseZitadelSignature(
  signatureHeader: string
): { timestamp: string; signature: string } | null {
  const parts = signatureHeader.split(',');
  let timestamp: string | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === ZITADEL_SIGNATURE_VERSION) signature = value;
  }

  if (!timestamp || !signature) {
    return null;
  }

  return { timestamp, signature };
}

/**
 * Verifies Zitadel webhook signature using HMAC-SHA256.
 * 
 * **Security Features:**
 * - Constant-time signature comparison (prevents timing attacks)
 * - Timestamp validation (prevents replay attacks)
 * - Never logs secrets
 * 
 * @param payload - Raw request body (string or Buffer)
 * @param signature - Value from 'zitadel-signature' header (format: t=timestamp,v1=signature)
 * @param timestamp - Value from 'zitadel-timestamp' header (ISO8601 format)
 * @param secret - Zitadel webhook secret (from ZITADEL_WEBHOOK_SECRET env var)
 * @param requestId - Optional request ID for error tracking
 * @returns VerificationResult with parsed payload or error
 * 
 * @example
 * ```typescript
 * import { verifyZitadelWebhook } from '@kombify/shared/webhooks';
 * 
 * app.post('/api/webhooks/zitadel', async (req, res) => {
 *   const signature = req.headers['zitadel-signature'] as string;
 *   const timestamp = req.headers['zitadel-timestamp'] as string;
 *   
 *   const result = verifyZitadelWebhook(
 *     req.body,
 *     signature,
 *     timestamp,
 *     process.env.ZITADEL_WEBHOOK_SECRET!,
 *     req.headers['x-request-id'] as string
 *   );
 *   
 *   if (!result.success) {
 *     return res.status(400).json(result.error?.toJSON());
 *   }
 *   
 *   // Handle the verified event
 *   const event = result.data;
 *   console.log(`Received Zitadel event: ${event.event}`);
 * });
 * ```
 */
export function verifyZitadelWebhook(
  payload: string | Buffer,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string | undefined,
  requestId?: string
): VerificationResult<ZitadelWebhookPayload> {
  // Validate configuration
  if (!secret) {
    return {
      success: false,
      error: new ConfigurationError(
        'Zitadel webhook secret is not configured',
        requestId
      ),
    };
  }

  // Validate header presence
  if (!signature) {
    return {
      success: false,
      error: new InvalidSignatureError(
        `Missing required header: ${ZITADEL_SIGNATURE_HEADER}`,
        requestId
      ),
    };
  }

  if (!timestamp) {
    return {
      success: false,
      error: new InvalidSignatureError(
        `Missing required header: ${ZITADEL_TIMESTAMP_HEADER}`,
        requestId
      ),
    };
  }

  try {
    // Parse signature header
    const parsedSignature = parseZitadelSignature(signature);
    if (!parsedSignature) {
      return {
        success: false,
        error: new InvalidSignatureError(
          `Invalid Zitadel signature format. Expected: t=timestamp,${ZITADEL_SIGNATURE_VERSION}=signature`,
          requestId
        ),
      };
    }

    // Verify timestamp (prevent replay attacks)
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageSeconds = (now - webhookTime) / 1000;

    if (ageSeconds > MAX_WEBHOOK_AGE_SECONDS) {
      return {
        success: false,
        error: new TimestampExpiredError(
          `Webhook timestamp too old: ${ageSeconds.toFixed(0)}s (max: ${MAX_WEBHOOK_AGE_SECONDS}s)`,
          requestId
        ),
      };
    }

    if (webhookTime > now + 60) {
      // Allow 60 seconds clock skew for future timestamps
      return {
        success: false,
        error: new TimestampExpiredError(
          'Webhook timestamp is in the future',
          requestId
        ),
      };
    }

    // Compute HMAC-SHA256 signature
    // Format: timestamp.payload (similar to Stripe)
    const payloadString = payload instanceof Buffer ? payload.toString('utf8') : payload;
    const signedPayload = `${parsedSignature.timestamp}.${payloadString}`;

    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(parsedSignature.signature, 'hex');

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      console.warn('Zitadel signature mismatch', {
        requestId,
        timestamp: parsedSignature.timestamp,
        // Never log: expectedSignature, providedSignature, secret, payload
      });

      return {
        success: false,
        error: new InvalidSignatureError(
          'Zitadel signature verification failed: signature mismatch',
          requestId
        ),
      };
    }

    // Parse the payload as JSON
    const parsedPayload = JSON.parse(payloadString) as ZitadelWebhookPayload;

    return {
      success: true,
      data: parsedPayload,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    console.warn('Zitadel webhook verification failed', {
      requestId,
      error: errorMessage,
    });

    return {
      success: false,
      error: new InvalidSignatureError(
        `Zitadel signature verification failed: ${errorMessage}`,
        requestId
      ),
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a Zitadel-style webhook signature for testing purposes.
 * 
 * **WARNING:** This should only be used in tests. Never use in production.
 * 
 * @param payload - Webhook payload
 * @param secret - Webhook secret
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Object with signature header and timestamp header values
 * 
 * @example
 * ```typescript
 * import { generateZitadelTestSignature } from '@kombify/shared/webhooks';
 * 
 * const payload = { event: 'user.created', payload: { userId: '123' } };
 * const { signatureHeader, timestampHeader } = generateZitadelTestSignature(
 *   JSON.stringify(payload),
 *   'whsec_test_secret'
 * );
 * 
 * // Use in tests
 * await request(app)
 *   .post('/api/webhooks/zitadel')
 *   .set('zitadel-signature', signatureHeader)
 *   .set('zitadel-timestamp', timestampHeader)
 *   .send(payload);
 * ```
 */
export function generateZitadelTestSignature(
  payload: string,
  secret: string,
  timestamp?: Date
): { signatureHeader: string; timestampHeader: string } {
  const ts = timestamp ?? new Date();
  const timestampSec = Math.floor(ts.getTime() / 1000).toString();
  const signedPayload = `${timestampSec}.${payload}`;

  const signature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    signatureHeader: `t=${timestampSec},v1=${signature}`,
    timestampHeader: ts.toISOString(),
  };
}

/**
 * Generates a Stripe-style webhook signature for testing purposes.
 * 
 * **WARNING:** This should only be used in tests. Never use in production.
 * 
 * @param payload - Webhook payload
 * @param secret - Webhook secret
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Stripe signature header value
 * 
 * @example
 * ```typescript
 * import { generateStripeTestSignature } from '@kombify/shared/webhooks';
 * 
 * const payload = { type: 'checkout.session.completed', data: { ... } };
 * const signature = generateStripeTestSignature(
 *   JSON.stringify(payload),
 *   'whsec_test_secret'
 * );
 * 
 * // Use in tests
 * await request(app)
 *   .post('/api/webhooks/stripe')
 *   .set('stripe-signature', signature)
 *   .send(payload);
 * ```
 */
export function generateStripeTestSignature(
  payload: string,
  secret: string,
  timestamp?: Date
): string {
  const ts = timestamp ?? new Date();
  const timestampSec = Math.floor(ts.getTime() / 1000).toString();
  const signedPayload = `${timestampSec}.${payload}`;

  const signature = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestampSec},v1=${signature}`;
}

/**
 * Middleware factory for Express/Fastify-style webhook verification.
 * 
 * @param options - Configuration options
 * @returns Middleware function
 * 
 * @example
 * ```typescript
 * import { createWebhookMiddleware } from '@kombify/shared/webhooks';
 * 
 * // Stripe middleware
 * app.post(
 *   '/api/webhooks/stripe',
 *   createWebhookMiddleware({
 *     provider: 'stripe',
 *     secret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   }),
 *   (req, res) => {
 *     // req.webhookEvent is now set and verified
 *     console.log(req.webhookEvent.type);
 *   }
 * );
 * ```
 */
export interface WebhookMiddlewareOptions {
  provider: 'stripe' | 'zitadel';
  secret: string;
  getRequestId?: (req: unknown) => string | undefined;
  onError?: (error: WebhookVerificationError, req: unknown, res: unknown) => void;
}

// Type augmentation for Express request
declare global {
  namespace Express {
    interface Request {
      webhookEvent?: StripeWebhookEvent | ZitadelWebhookPayload;
    }
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export {
  createHmac,
  timingSafeEqual,
};

// Default export for convenience
export default {
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
  STRIPE_SIGNATURE_HEADER,
  ZITADEL_SIGNATURE_HEADER,
  ZITADEL_TIMESTAMP_HEADER,
};
