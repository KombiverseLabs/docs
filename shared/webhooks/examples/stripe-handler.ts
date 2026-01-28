/**
 * Stripe Webhook Handler Example
 * 
 * This example shows how to implement a secure Stripe webhook endpoint
 * for KombiSphere-Cloud or Administration services.
 * 
 * @see https://stripe.com/docs/webhooks/quickstart
 * @see ../../internal-notes/kombify/INTER_MODULE_CONTRACTS.md - Contract 3
 */

import { Router, Request, Response } from 'express';
import { 
  verifyStripeWebhook, 
  StripeWebhookEvent,
  InvalidSignatureError,
  TimestampExpiredError,
  ConfigurationError,
} from '../verify';

// ============================================================================
// Configuration
// ============================================================================

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================================================
// Types
// ============================================================================

interface StripeSessionObject {
  id: string;
  client_reference_id?: string;
  customer?: string;
  subscription?: string;
  status: string;
  metadata: Record<string, string>;
}

interface StripeSubscriptionObject {
  id: string;
  customer: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  items: {
    data: Array<{
      price: { id: string; product: string };
      quantity: number;
    }>;
  };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  metadata: Record<string, string>;
}

// ============================================================================
// Database Operations (example interfaces)
// ============================================================================

async function createSubscription(data: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  userId: string;
  plan: string;
  status: string;
}): Promise<void> {
  // Implementation: Insert into PostgreSQL
  console.log('Creating subscription:', data);
}

async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string
): Promise<void> {
  // Implementation: Update subscription in PostgreSQL
  console.log('Updating subscription status:', { stripeSubscriptionId, status });
}

async function cancelSubscription(stripeSubscriptionId: string): Promise<void> {
  // Implementation: Mark subscription as canceled
  console.log('Canceling subscription:', stripeSubscriptionId);
}

async function createInvoice(data: {
  stripeInvoiceId: string;
  stripeCustomerId: string;
  amount: number;
  status: string;
}): Promise<void> {
  // Implementation: Insert invoice record
  console.log('Creating invoice:', data);
}

// ============================================================================
// Event Handlers
// ============================================================================

async function handleCheckoutSessionCompleted(
  session: StripeSessionObject
): Promise<void> {
  console.log('Processing checkout.session.completed', { sessionId: session.id });

  if (!session.subscription) {
    console.warn('No subscription in checkout session');
    return;
  }

  if (!session.client_reference_id) {
    console.warn('No client_reference_id in checkout session');
    return;
  }

  // Create subscription in database
  await createSubscription({
    stripeCustomerId: session.customer!,
    stripeSubscriptionId: session.subscription,
    userId: session.client_reference_id,
    plan: session.metadata.plan || 'unknown',
    status: 'active',
  });

  // Sync to Administration if this is Cloud
  await syncToAdministration({
    type: 'subscription.created',
    userId: session.client_reference_id,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    plan: session.metadata.plan,
  });
}

async function handleSubscriptionCreated(
  subscription: StripeSubscriptionObject
): Promise<void> {
  console.log('Processing customer.subscription.created', { 
    subscriptionId: subscription.id 
  });

  const plan = subscription.items.data[0]?.price.product || 'unknown';

  await createSubscription({
    stripeCustomerId: subscription.customer,
    stripeSubscriptionId: subscription.id,
    userId: subscription.metadata.userId || 'unknown',
    plan,
    status: subscription.status,
  });
}

async function handleSubscriptionUpdated(
  subscription: StripeSubscriptionObject
): Promise<void> {
  console.log('Processing customer.subscription.updated', { 
    subscriptionId: subscription.id 
  });

  await updateSubscriptionStatus(subscription.id, subscription.status);

  // Handle cancellation
  if (subscription.cancel_at_period_end) {
    console.log('Subscription set to cancel at period end');
  }
}

async function handleSubscriptionDeleted(
  subscription: StripeSubscriptionObject
): Promise<void> {
  console.log('Processing customer.subscription.deleted', { 
    subscriptionId: subscription.id 
  });

  await cancelSubscription(subscription.id);
}

async function handleInvoicePaid(
  invoice: {
    id: string;
    customer: string;
    amount_paid: number;
    status: string;
    subscription?: string;
  }
): Promise<void> {
  console.log('Processing invoice.paid', { invoiceId: invoice.id });

  await createInvoice({
    stripeInvoiceId: invoice.id,
    stripeCustomerId: invoice.customer,
    amount: invoice.amount_paid,
    status: 'paid',
  });
}

async function handleInvoicePaymentFailed(
  invoice: {
    id: string;
    customer: string;
    subscription?: string;
    next_payment_attempt: number | null;
  }
): Promise<void> {
  console.log('Processing invoice.payment_failed', { invoiceId: invoice.id });

  if (invoice.subscription) {
    await updateSubscriptionStatus(invoice.subscription, 'past_due');
  }

  // Notify user about payment failure
  await notifyPaymentFailure(invoice.customer);
}

async function handleCustomerUpdated(
  customer: {
    id: string;
    email?: string;
    name?: string;
    metadata: Record<string, string>;
  }
): Promise<void> {
  console.log('Processing customer.updated', { customerId: customer.id });

  // Sync customer details to database
  await syncCustomerDetails(customer.id, {
    email: customer.email,
    name: customer.name,
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

async function notifyPaymentFailure(customerId: string): Promise<void> {
  // Implementation: Send email notification
  console.log('Notifying payment failure for customer:', customerId);
}

async function syncCustomerDetails(
  customerId: string,
  details: { email?: string; name?: string }
): Promise<void> {
  // Implementation: Update customer in database
  console.log('Syncing customer details:', { customerId, details });
}

// ============================================================================
// Main Webhook Handler
// ============================================================================

const router = Router();

/**
 * POST /api/webhooks/stripe
 * 
 * Handles incoming Stripe webhook events.
 * 
 * **Important:** Use express.raw() middleware before this handler to ensure
 * the raw body is available for signature verification.
 */
router.post('/', async (req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  const signature = req.headers['stripe-signature'] as string;

  // Verify webhook signature
  const result = verifyStripeWebhook(
    req.body,
    signature,
    STRIPE_WEBHOOK_SECRET,
    requestId
  );

  if (!result.success) {
    const error = result.error!;
    
    // Log structured error
    console.warn('Stripe webhook verification failed', {
      requestId,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      // Never log: signature, secret, payload
    });

    // Return structured error response
    return res.status(400).json(error.toJSON());
  }

  const event = result.data as StripeWebhookEvent;

  console.log('Stripe webhook received', {
    requestId,
    eventType: event.type,
    eventId: event.id,
  });

  try {
    // Handle the event based on type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as StripeSessionObject);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as StripeSubscriptionObject);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as StripeSubscriptionObject);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as StripeSubscriptionObject);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as { id: string; customer: string; amount_paid: number; status: string; subscription?: string });
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as { id: string; customer: string; subscription?: string; next_payment_attempt: number | null });
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as { id: string; email?: string; name?: string; metadata: Record<string, string> });
        break;

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    // Acknowledge receipt
    res.json({ received: true, requestId });
  } catch (error: unknown) {
    // Log error but still return 200 to prevent Stripe retries
    // for unrecoverable errors
    console.error('Error processing Stripe webhook', {
      requestId,
      eventType: event.type,
      eventId: event.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return 200 to acknowledge receipt (Stripe will retry on 5xx)
    res.json({ received: true, requestId, warning: 'Processing error logged' });
  }
});

/**
 * GET /api/webhooks/stripe/health
 * 
 * Health check endpoint for Stripe webhook configuration.
 */
router.get('/health', (_req: Request, res: Response) => {
  const checks = {
    webhookSecretConfigured: !!STRIPE_WEBHOOK_SECRET,
    environment: process.env.NODE_ENV || 'development',
  };

  const status = checks.webhookSecretConfigured ? 200 : 503;
  
  res.status(status).json({
    status: checks.webhookSecretConfigured ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
export { router as stripeWebhookRouter };
