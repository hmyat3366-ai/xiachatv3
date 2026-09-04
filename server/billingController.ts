import { Request, Response } from 'express';
import crypto from 'crypto';
import { db, DbWorkspace, DbSubscription, DbPlan, DbInvoice, DbPlanLimits } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import {
  getWorkspaceForUser,
  getUserWorkspaceRole,
  getOrCreateWorkspaceSubscription,
  getWorkspaceUsageMetrics,
  validateDowngradeResources,
} from './planLimitMiddleware.js';
import {
  stripe,
  isStripeConfigured,
  createBillingCheckoutSession,
  createBillingPortalSession,
  verifyStripeWebhookEvent,
} from './stripeService.js';

// GET /api/billing/overview
export const getBillingOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    // Role authorization check
    const userRole = getUserWorkspaceRole(req.user.id, workspace);
    const canManageBilling = userRole === 'owner' || userRole === 'admin';

    // Get active subscription and plan definition
    const { subscription, plan, limits } = getOrCreateWorkspaceSubscription(workspace.id);

    // Calculate real usage metrics
    const usageMetrics = getWorkspaceUsageMetrics(workspace.id, subscription.current_period_start);

    // Format plans list for comparison table
    const rawPlans = db.prepare('SELECT * FROM plans WHERE active = 1 ORDER BY price_monthly ASC').all() as DbPlan[];
    const plans = rawPlans.map((p) => ({
      id: p.id,
      name: p.name,
      stripeProductId: p.stripe_product_id,
      stripePriceIdMonthly: p.stripe_price_id_monthly,
      stripePriceIdAnnual: p.stripe_price_id_annual,
      priceMonthly: p.price_monthly,
      priceAnnual: p.price_annual,
      currency: p.currency,
      description: p.description,
      limits: JSON.parse(p.limits) as DbPlanLimits,
      features: JSON.parse(p.features) as string[],
      popular: p.id === 'pro',
      badge: p.id === 'pro' ? 'Most Popular' : undefined,
    }));

    // Query historical invoices for workspace
    const rawInvoices = db.prepare(`
      SELECT * FROM invoices
      WHERE workspace_id = ?
      ORDER BY period_start DESC, created_at DESC
      LIMIT 20
    `).all(workspace.id) as DbInvoice[];

    const invoices = rawInvoices.map((inv) => ({
      id: inv.id,
      stripeInvoiceId: inv.stripe_invoice_id,
      invoiceNumber: inv.invoice_number || `INV-${inv.id.substring(0, 8).toUpperCase()}`,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      pdfUrl: inv.pdf_url,
      periodStart: inv.period_start,
      periodEnd: inv.period_end,
      createdAt: inv.created_at,
    }));

    // Calculate trial state
    let trialDaysRemaining = 0;
    if (subscription.status === 'trialing' && subscription.trial_ends_at) {
      const diffMs = new Date(subscription.trial_ends_at).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return res.status(200).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        userRole,
        canManageBilling,
      },
      subscription: {
        id: subscription.id,
        planId: subscription.plan_id,
        planName: plan.name,
        priceMonthly: plan.price_monthly,
        priceAnnual: plan.price_annual,
        currency: plan.currency,
        status: subscription.status, // 'active' | 'trialing' | 'past_due' | 'canceled' | 'canceling' | 'incomplete' | 'payment_failed'
        billingInterval: subscription.billing_interval,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        trialEndsAt: subscription.trial_ends_at,
        trialDaysRemaining,
        paymentMethod: subscription.payment_method_last4
          ? {
              brand: subscription.payment_method_brand || 'Visa',
              last4: subscription.payment_method_last4,
              expMonth: subscription.payment_method_exp_month,
              expYear: subscription.payment_method_exp_year,
            }
          : null,
      },
      limits,
      usage: usageMetrics,
      plans,
      invoices,
    });
  } catch (err) {
    console.error('Error fetching billing overview:', err);
    return res.status(500).json({ error: 'Failed to retrieve workspace billing information.' });
  }
};

// POST /api/billing/checkout-session
export const createCheckoutSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { planId, workspaceId: requestedWsId } = req.body;
    const billingInterval = (req.body.billingInterval || req.body.interval || 'monthly') as 'monthly' | 'yearly';

    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Authorization: Owner or Admin only
    const userRole = getUserWorkspaceRole(req.user.id, workspace);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can update subscription plans.' });
    }

    const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(planId) as DbPlan | undefined;
    if (!plan) {
      return res.status(400).json({ error: 'Invalid or inactive plan selected.' });
    }

    const { subscription } = getOrCreateWorkspaceSubscription(workspace.id);

    const priceId = billingInterval === 'yearly' ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const amountInCents = Math.round((billingInterval === 'yearly' ? plan.price_annual * 12 : plan.price_monthly) * 100);

    const session = await createBillingCheckoutSession({
      workspaceId: workspace.id,
      customerEmail: req.user.email,
      planId: plan.id,
      priceId,
      billingInterval,
      successUrl: `${frontendUrl}/settings/billing`,
      cancelUrl: `${frontendUrl}/settings/billing`,
      existingStripeCustomerId: subscription.stripe_customer_id,
      planName: `Xia Chat ${plan.name} Plan`,
      unitAmount: amountInCents > 0 ? amountInCents : 1900,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      checkoutUrl: session.url,
      sessionId: session.sessionId,
    });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    return res.status(500).json({ error: 'Failed to initiate plan checkout session.' });
  }
};

// POST /api/billing/change-plan (Direct Upgrade or Downgrade)
export const changePlan = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { targetPlanId, billingInterval = 'monthly', workspaceId: requestedWsId } = req.body;

    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Role check
    const userRole = getUserWorkspaceRole(req.user.id, workspace);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can modify plan tiers.' });
    }

    const targetPlan = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(targetPlanId) as DbPlan | undefined;
    if (!targetPlan) {
      return res.status(400).json({ error: 'Selected target plan is invalid.' });
    }

    const { subscription, plan: currentPlan } = getOrCreateWorkspaceSubscription(workspace.id);

    // Check resource compatibility if downgrading
    const isDowngrade = targetPlan.price_monthly < currentPlan.price_monthly;
    if (isDowngrade) {
      const validation = validateDowngradeResources(workspace.id, targetPlanId);
      if (!validation.compatible) {
        return res.status(400).json({
          error: 'Your current workspace usage exceeds the limits of the target plan.',
          code: 'DOWNGRADE_LIMIT_CONFLICT',
          conflicts: validation.conflicts,
        });
      }
    }

    const now = new Date();
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getTime() + (billingInterval === 'yearly' ? 365 : 30) * 24 * 3600 * 1000).toISOString();

    // Update Subscription Record
    db.prepare(`
      UPDATE subscriptions
      SET plan_id = ?,
          status = 'active',
          billing_interval = ?,
          current_period_start = ?,
          current_period_end = ?,
          cancel_at_period_end = 0,
          updated_at = ?
      WHERE workspace_id = ?
    `).run(targetPlanId, billingInterval, periodStart, periodEnd, periodStart, workspace.id);

    // Create Audit Billing Event
    db.prepare(`
      INSERT INTO billing_events (id, workspace_id, event_type, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      workspace.id,
      isDowngrade ? 'plan_downgraded' : 'plan_upgraded',
      JSON.stringify({ from: currentPlan.id, to: targetPlanId, interval: billingInterval }),
      periodStart
    );

    // Create simulated invoice entry if paid plan
    if (targetPlan.price_monthly > 0) {
      const amount = billingInterval === 'yearly' ? targetPlan.price_annual * 12 : targetPlan.price_monthly;
      db.prepare(`
        INSERT INTO invoices (
          id, workspace_id, stripe_invoice_id, invoice_number, amount_paid, currency,
          status, hosted_invoice_url, period_start, period_end, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        workspace.id,
        `inv_${crypto.randomBytes(8).toString('hex')}`,
        `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        amount,
        targetPlan.currency,
        'https://stripe.com',
        periodStart,
        periodEnd,
        periodStart
      );
    }

    return res.status(200).json({
      success: true,
      message: `Plan successfully ${isDowngrade ? 'downgraded' : 'upgraded'} to ${targetPlan.name}.`,
      plan: {
        id: targetPlan.id,
        name: targetPlan.name,
        interval: billingInterval,
      },
    });
  } catch (err) {
    console.error('Error changing plan:', err);
    return res.status(500).json({ error: 'Failed to update subscription plan.' });
  }
};

// POST /api/billing/customer-portal
export const createCustomerPortalSession = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.body?.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const userRole = getUserWorkspaceRole(req.user.id, workspace);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can access billing portal.' });
    }

    const { subscription } = getOrCreateWorkspaceSubscription(workspace.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const portal = await createBillingPortalSession({
      workspaceId: workspace.id,
      stripeCustomerId: subscription.stripe_customer_id || `cus_mock_${workspace.id.substring(0, 8)}`,
      returnUrl: `${frontendUrl}/settings/billing`,
    });

    return res.status(200).json({
      success: true,
      url: portal.url,
    });
  } catch (err) {
    console.error('Error opening billing customer portal:', err);
    return res.status(500).json({ error: 'Failed to generate Customer Portal link.' });
  }
};

// POST /api/billing/cancel
export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.body?.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const userRole = getUserWorkspaceRole(req.user.id, workspace);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can cancel subscription.' });
    }

    const { subscription } = getOrCreateWorkspaceSubscription(workspace.id);
    const now = new Date().toISOString();

    // Mark subscription to cancel at end of period
    db.prepare(`
      UPDATE subscriptions
      SET cancel_at_period_end = 1,
          status = 'canceling',
          updated_at = ?
      WHERE workspace_id = ?
    `).run(now, workspace.id);

    // Audit event
    db.prepare(`
      INSERT INTO billing_events (id, workspace_id, event_type, details, created_at)
      VALUES (?, ?, 'subscription_canceled', ?, ?)
    `).run(crypto.randomUUID(), workspace.id, JSON.stringify({ cancelAtPeriodEnd: true, effectiveDate: subscription.current_period_end }), now);

    return res.status(200).json({
      success: true,
      message: 'Subscription scheduled to cancel at the end of current billing period.',
      effectiveDate: subscription.current_period_end,
    });
  } catch (err) {
    console.error('Error canceling subscription:', err);
    return res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
};

// POST /api/billing/resume
export const resumeSubscription = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.body?.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const userRole = getUserWorkspaceRole(req.user.id, workspace);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can resume subscription.' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE subscriptions
      SET cancel_at_period_end = 0,
          status = 'active',
          updated_at = ?
      WHERE workspace_id = ?
    `).run(now, workspace.id);

    // Audit event
    db.prepare(`
      INSERT INTO billing_events (id, workspace_id, event_type, details, created_at)
      VALUES (?, ?, 'subscription_resumed', ?, ?)
    `).run(crypto.randomUUID(), workspace.id, JSON.stringify({ cancelAtPeriodEnd: false }), now);

    return res.status(200).json({
      success: true,
      message: 'Subscription resumed successfully.',
    });
  } catch (err) {
    console.error('Error resuming subscription:', err);
    return res.status(500).json({ error: 'Failed to resume subscription.' });
  }
};

// POST /api/webhooks/stripe
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  if (webhookSecret && sig) {
    const verifiedEvent = verifyStripeWebhookEvent(req.body, sig, webhookSecret);
    if (!verifiedEvent) {
      return res.status(400).send('Webhook Signature Verification Failed');
    }
    event = verifiedEvent;
  } else {
    // If webhook secret not configured, parse raw body JSON safely
    try {
      const rawText = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
      event = JSON.parse(rawText);
    } catch {
      event = req.body;
    }
  }

  if (!event || !event.id || !event.type) {
    return res.status(400).json({ error: 'Invalid Stripe event payload' });
  }

  // Webhook Idempotency Check
  const existingEvent = db.prepare('SELECT id FROM webhook_events WHERE id = ?').get(event.id);
  if (existingEvent) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const now = new Date().toISOString();

  // Record event in idempotency table
  db.prepare(`
    INSERT INTO webhook_events (id, event_type, processed_at, payload)
    VALUES (?, ?, ?, ?)
  `).run(event.id, event.type, now, JSON.stringify(event));

  try {
    const obj = event.data?.object || {};

    switch (event.type) {
      case 'checkout.session.completed': {
        const workspaceId = obj.metadata?.workspaceId;
        const planId = obj.metadata?.planId || 'pro';
        const interval = obj.metadata?.billingInterval || 'monthly';
        const customerId = obj.customer;
        const subscriptionId = obj.subscription;

        if (workspaceId) {
          const periodStart = now;
          const periodEnd = new Date(Date.now() + (interval === 'yearly' ? 365 : 30) * 24 * 3600 * 1000).toISOString();

          db.prepare(`
            UPDATE subscriptions
            SET stripe_customer_id = ?,
                stripe_subscription_id = ?,
                plan_id = ?,
                status = 'active',
                billing_interval = ?,
                current_period_start = ?,
                current_period_end = ?,
                cancel_at_period_end = 0,
                updated_at = ?
            WHERE workspace_id = ?
          `).run(customerId, subscriptionId, planId, interval, periodStart, periodEnd, now, workspaceId);

          db.prepare(`
            INSERT INTO billing_events (id, workspace_id, event_type, details, created_at)
            VALUES (?, ?, 'subscription_created', ?, ?)
          `).run(crypto.randomUUID(), workspaceId, JSON.stringify({ checkoutSessionId: event.id, planId }), now);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSubId = obj.id;
        const status = obj.status === 'active' ? 'active' : obj.status === 'past_due' ? 'past_due' : obj.status;
        const cancelAtPeriodEnd = obj.cancel_at_period_end ? 1 : 0;

        db.prepare(`
          UPDATE subscriptions
          SET status = ?,
              cancel_at_period_end = ?,
              updated_at = ?
          WHERE stripe_subscription_id = ?
        `).run(status, cancelAtPeriodEnd, now, stripeSubId);
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubId = obj.id;
        db.prepare(`
          UPDATE subscriptions
          SET plan_id = 'free',
              status = 'canceled',
              cancel_at_period_end = 0,
              updated_at = ?
          WHERE stripe_subscription_id = ?
        `).run(now, stripeSubId);
        break;
      }

      case 'invoice.paid': {
        const stripeCustId = obj.customer;
        const sub = db.prepare('SELECT workspace_id FROM subscriptions WHERE stripe_customer_id = ?').get(stripeCustId) as { workspace_id: string } | undefined;

        if (sub) {
          db.prepare(`
            INSERT INTO invoices (
              id, workspace_id, stripe_invoice_id, invoice_number, amount_paid, currency,
              status, hosted_invoice_url, pdf_url, period_start, period_end, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?)
            ON CONFLICT(stripe_invoice_id) DO UPDATE SET
              status = 'paid',
              amount_paid = excluded.amount_paid
          `).run(
            crypto.randomUUID(),
            sub.workspace_id,
            obj.id,
            obj.number || `INV-${obj.id.substring(0, 8)}`,
            (obj.amount_paid || 0) / 100,
            (obj.currency || 'usd').toUpperCase(),
            obj.hosted_invoice_url || null,
            obj.invoice_pdf || null,
            obj.period_start ? new Date(obj.period_start * 1000).toISOString() : now,
            obj.period_end ? new Date(obj.period_end * 1000).toISOString() : now,
            now
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const stripeCustId = obj.customer;
        const sub = db.prepare('SELECT workspace_id FROM subscriptions WHERE stripe_customer_id = ?').get(stripeCustId) as { workspace_id: string } | undefined;

        if (sub) {
          db.prepare(`
            UPDATE subscriptions
            SET status = 'payment_failed',
                updated_at = ?
            WHERE workspace_id = ?
          `).run(now, sub.workspace_id);

          db.prepare(`
            INSERT INTO billing_events (id, workspace_id, event_type, details, created_at)
            VALUES (?, ?, 'payment_failed', ?, ?)
          `).run(crypto.randomUUID(), sub.workspace_id, JSON.stringify({ invoiceId: obj.id, amount: obj.amount_due }), now);
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error processing Stripe webhook event:', err);
    return res.status(500).send('Webhook Processing Failure');
  }
};
