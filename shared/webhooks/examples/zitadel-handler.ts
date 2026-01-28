/**
 * Zitadel Webhook Handler Example
 * 
 * This example shows how to implement a secure Zitadel webhook endpoint
 * for KombiSphere-Cloud or Administration services.
 * 
 * @see https://zitadel.com/docs/guides/integrate/webhooks
 * @see ../../internal-notes/kombify/INTER_MODULE_CONTRACTS.md - Contract 4
 */

import { Router, Request, Response } from 'express';
import { 
  verifyZitadelWebhook, 
  ZitadelWebhookPayload,
  InvalidSignatureError,
  TimestampExpiredError,
  ConfigurationError,
} from '../verify';

// ============================================================================
// Configuration
// ============================================================================

const ZITADEL_WEBHOOK_SECRET = process.env.ZITADEL_WEBHOOK_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================================================
// Types
// ============================================================================

interface ZitadelUserPayload {
  userId: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  preferredLoginName?: string;
  metadata?: Record<string, string>;
}

// ============================================================================
// Database Operations (example interfaces)
// ============================================================================

async function ensureUserInDatabase(data: {
  userId: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
}): Promise<void> {
  // Implementation: Upsert user into PostgreSQL
  // See INTER_MODULE_CONTRACTS.md Contract 4.1
  console.log('Ensuring user in database:', data);
}

async function updateUserProfile(
  userId: string,
  updates: Partial<ZitadelUserPayload>
): Promise<void> {
  // Implementation: Update cached profile fields
  console.log('Updating user profile:', { userId, updates });
}

async function softDeleteUser(userId: string): Promise<void> {
  // Implementation: Soft-delete or anonymize user data
  console.log('Soft-deleting user:', userId);
}

async function suspendUserAccess(userId: string): Promise<void> {
  // Implementation: Suspend user access (set flag or remove roles)
  console.log('Suspending user access:', userId);
}

async function restoreUserAccess(userId: string): Promise<void> {
  // Implementation: Restore user access
  console.log('Restoring user access:', userId);
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handleUserCreated(payload: ZitadelUserPayload): Promise<void> {
  console.log('Processing user.created', { userId: payload.userId });

  // Create or ensure user exists in database
  await ensureUserInDatabase({
    userId: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
    firstName: payload.firstName,
    lastName: payload.lastName,
    emailVerified: payload.emailVerified,
  });

  // Sync to Administration if this is Cloud
  await syncToAdministration({
    type: 'user.created',
    userId: payload.userId,
    email: payload.email,
    displayName: payload.displayName,
  });
}

async function handleUserUpdated(payload: ZitadelUserPayload): Promise<void> {
  console.log('Processing user.updated', { userId: payload.userId });

  // Update cached profile fields
  await updateUserProfile(payload.userId, {
    email: payload.email,
    displayName: payload.displayName,
    firstName: payload.firstName,
    lastName: payload.lastName,
    emailVerified: payload.emailVerified,
    userName: payload.userName,
    phone: payload.phone,
  });

  // Update Zitadel metadata if needed
  if (payload.metadata) {
    await syncUserMetadata(payload.userId, payload.metadata);
  }
}

async function handleUserDeleted(payload: ZitadelUserPayload): Promise<void> {
  console.log('Processing user.deleted', { userId: payload.userId });

  // Soft-delete or anonymize user data per GDPR requirements
  await softDeleteUser(payload.userId);

  // Clean up associated data
  await cleanupUserData(payload.userId);
}

async function handleUserDeactivated(payload: ZitadelUserPayload): Promise<void> {
  console.log('Processing user.deactivated', { userId: payload.userId });

  // Suspend user access immediately
  await suspendUserAccess(payload.userId);

  // Log for audit trail
  await logAuditEvent({
    action: 'user.deactivated',
    userId: payload.userId,
    timestamp: new Date().toISOString(),
  });
}

async function handleUserReactivated(payload: ZitadelUserPayload): Promise<void> {
  console.log('Processing user.reactivated', { userId: payload.userId });

  // Restore user access
  await restoreUserAccess(payload.userId);

  // Log for audit trail
  await logAuditEvent({
    action: 'user.reactivated',
    userId: payload.userId,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

async function syncToAdministration(data: Record<string, unknown>): Promise<void> {
  // Implementation: Send to Administration service via internal API
  // See INTER_MODULE_CONTRACTS.md Contract 1
  console.log('Syncing to Administration:', data);
}

async function syncUserMetadata(
  userId: string,
  metadata: Record<string, string>
): Promise<void> {
  // Implementation: Sync metadata to database
  console.log('Syncing user metadata:', { userId, metadata });
}

async function cleanupUserData(userId: string): Promise<void> {
  // Implementation: Clean up user data according to data retention policy
  console.log('Cleaning up user data:', userId);
}

async function logAuditEvent(event: {
  action: string;
  userId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  // Implementation: Log to audit log (PostgreSQL or external system)
  // See INTER_MODULE_CONTRACTS.md Contract 9.3
  console.log('Audit log:', event);
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

const router = Router();

/**
 * POST /api/webhooks/zitadel
 * 
 * Handles incoming Zitadel webhook events.
 * 
 * **Security Headers Required:**
 * - `zitadel-signature`: Format `t=timestamp,v1=signature`
 * - `zitadel-timestamp`: ISO8601 timestamp
 * 
 * **Note:** Unlike Stripe, Zitadel webhooks can use JSON body parsing
 * since the signature is computed on the serialized payload.
 */
router.post('/', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  const signature = req.headers['zitadel-signature'] as string;
  const timestamp = req.headers['zitadel-timestamp'] as string;

  // Verify webhook signature
  const result = verifyZitadelWebhook(
    JSON.stringify(req.body),
    signature,
    timestamp,
    ZITADEL_WEBHOOK_SECRET,
    requestId
  );

  if (!result.success) {
    const error = result.error!;
    
    // Log structured error
    console.warn('Zitadel webhook verification failed', {
      requestId,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      // Never log: signature, secret, payload
    });

    // Return structured error response
    return res.status(400).json(error.toJSON());
  }

  const event = result.data as ZitadelWebhookPayload;

  console.log('Zitadel webhook received', {
    requestId,
    eventType: event.event,
    webhookTimestamp: event.timestamp,
  });

  try {
    // Handle the event based on type
    switch (event.event) {
      case 'user.created':
        await handleUserCreated(event.payload as ZitadelUserPayload);
        break;

      case 'user.updated':
        await handleUserUpdated(event.payload as ZitadelUserPayload);
        break;

      case 'user.deleted':
        await handleUserDeleted(event.payload as ZitadelUserPayload);
        break;

      case 'user.deactivated':
        await handleUserDeactivated(event.payload as ZitadelUserPayload);
        break;

      case 'user.reactivated':
        await handleUserReactivated(event.payload as ZitadelUserPayload);
        break;

      default:
        console.log(`Unhandled Zitadel event type: ${event.event}`);
    }

    // Acknowledge receipt
    res.json({ received: true, requestId });
  } catch (error: unknown) {
    // Log error but still return 200 to prevent duplicate processing
    console.error('Error processing Zitadel webhook', {
      requestId,
      eventType: event.event,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return 200 to acknowledge receipt
    res.json({ received: true, requestId, warning: 'Processing error logged' });
  }
});

/**
 * GET /api/webhooks/zitadel/health
 * 
 * Health check endpoint for Zitadel webhook configuration.
 */
router.get('/health', (_req: Request, res: Response) => {
  const checks = {
    webhookSecretConfigured: !!ZITADEL_WEBHOOK_SECRET,
    environment: process.env.NODE_ENV || 'development',
  };

  const status = checks.webhookSecretConfigured ? 200 : 503;
  
  res.status(status).json({
    status: checks.webhookSecretConfigured ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Express App Setup Example
// ============================================================================

/**
 * Example: Setting up the webhook handlers in an Express app
 * 
 * ```typescript
 * import express from 'express';
 * import { stripeWebhookRouter } from './examples/stripe-handler';
 * import { zitadelWebhookRouter } from './examples/zitadel-handler';
 * 
 * const app = express();
 * 
 * // IMPORTANT: Stripe needs raw body for signature verification
 * app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
 * app.use('/api/webhooks/stripe', stripeWebhookRouter);
 * 
 * // Zitadel can use JSON parsing
 * app.use('/api/webhooks/zitadel', express.json());
 * app.use('/api/webhooks/zitadel', zitadelWebhookRouter);
 * 
 * app.listen(3000);
 * ```
 */

export default router;
export { router as zitadelWebhookRouter };
