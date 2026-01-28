/**
 * Webhook Signature Verification Module
 * 
 * @module @kombify/shared/webhooks
 * @version 1.0.0
 * 
 * @example
 * ```typescript
 * import { 
 *   verifyStripeWebhook, 
 *   verifyZitadelWebhook,
 *   generateStripeTestSignature,
 *   generateZitadelTestSignature 
 * } from '@kombify/shared/webhooks';
 * ```
 */

// Main verification functions
export {
  verifyStripeWebhook,
  verifyStripeWebhookManual,
  verifyZitadelWebhook,
} from './verify';

// Test utilities
export {
  generateStripeTestSignature,
  generateZitadelTestSignature,
} from './verify';

// Error classes
export {
  WebhookVerificationError,
  InvalidSignatureError,
  TimestampExpiredError,
  ConfigurationError,
} from './verify';

// Types
export type {
  VerificationResult,
  StripeWebhookEvent,
  ZitadelWebhookPayload,
} from './verify';

// Constants
export {
  MAX_WEBHOOK_AGE_SECONDS,
  ZITADEL_SIGNATURE_VERSION,
  STRIPE_SIGNATURE_HEADER,
  ZITADEL_SIGNATURE_HEADER,
  ZITADEL_TIMESTAMP_HEADER,
} from './verify';

// Default export
export { default } from './verify';
