import Stripe from 'stripe';
import crypto from 'crypto';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2026-01-28' as any,
    })
  : null;

export const isStripeConfigured = Boolean(stripeSecretKey);

// Helper to create Stripe Customer
export async function createOrGetStripeCustomer(workspaceId: string, email: string, name: string, existingStripeCustomerId?: string | null): Promise<string> {
  if (existingStripeCustomerId && !existingStripeCustomerId.startsWith('cus_mock_')) {
    return existingStripeCustomerId;
  }

  if (stripe) {
    try {
      const customer = await stripe.customers.create({
        email,
        name: `${name} (${workspaceId})`,
        metadata: {
          workspaceId,
        },
      });
      return customer.id;
    } catch (err) {
      console.error('Failed to create Stripe customer:', err);
    }
  }

  // Fallback mock customer ID for development / test mode
  return `cus_mock_${workspaceId.substring(0, 8)}`;
}

// Helper to create Checkout Session
export async function createBillingCheckoutSession(params: {
  workspaceId: string;
  customerEmail: string;
  planId: string;
  priceId?: string | null;
  billingInterval: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
  existingStripeCustomerId?: string | null;
}): Promise<{ url: string; sessionId: string }> {
  const { workspaceId, customerEmail, planId, priceId, billingInterval, successUrl, cancelUrl, existingStripeCustomerId } = params;

  const customerId = await createOrGetStripeCustomer(workspaceId, customerEmail, `Workspace Owner`, existingStripeCustomerId);

  if (stripe && priceId && !priceId.startsWith('price_xia_')) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          workspaceId,
          planId,
          billingInterval,
        },
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&checkout=success`,
        cancel_url: `${cancelUrl}?checkout=cancelled`,
      });

      return {
        url: session.url || successUrl,
        sessionId: session.id,
      };
    } catch (err) {
      console.error('Stripe checkout session error:', err);
    }
  }

  // Development simulation mode: Generate redirect URL directly to success URL with mock session
  const mockSessionId = `cs_mock_${crypto.randomBytes(12).toString('hex')}`;
  const mockCheckoutUrl = `${successUrl}?mock_checkout=true&planId=${planId}&interval=${billingInterval}&session_id=${mockSessionId}`;

  return {
    url: mockCheckoutUrl,
    sessionId: mockSessionId,
  };
}

// Helper to create Customer Portal Session
export async function createBillingPortalSession(params: {
  workspaceId: string;
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const { stripeCustomerId, returnUrl } = params;

  if (stripe && stripeCustomerId && !stripeCustomerId.startsWith('cus_mock_')) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (err) {
      console.error('Stripe Customer Portal error:', err);
    }
  }

  // Fallback return URL if portal creation in dev environment is requested
  return { url: `${returnUrl}?portal_mock=true` };
}

// Helper to construct and verify Webhook event
export function verifyStripeWebhookEvent(payload: string | Buffer, signature: string, webhookSecret: string): Stripe.Event | null {
  if (!stripe || !webhookSecret) {
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return null;
  }
}
