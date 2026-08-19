/**
 * Xia Chat — Billing & Subscription Module Integration Test Suite
 *
 * Run with: npx tsx --test server/billing.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';

interface ApiResponse {
  status: number;
  body: Record<string, any>;
  cookieHeader: string | null;
}

async function api(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  cookieHeader?: string
): Promise<ApiResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const opts: RequestInit = {
    method,
    headers,
  };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const setCookie = res.headers.get('set-cookie');
  let data: Record<string, any> = {};
  try {
    data = await res.json();
  } catch {
    // raw text or empty response
  }

  return {
    status: res.status,
    body: data,
    cookieHeader: setCookie,
  };
}

describe('Billing & Subscription Module Integration Tests', () => {
  let authCookie: string | null = null;
  const testEmail = `billing_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  it('1. Health Check Endpoint', async () => {
    const res = await api('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('2. Unauthenticated access to /api/billing/overview should return 401', async () => {
    const res = await api('GET', '/api/billing/overview');
    assert.equal(res.status, 401);
  });

  it('3. User Registration & Login for Billing Tests', async () => {
    const signupRes = await api('POST', '/api/auth/signup', {
      name: 'Billing Admin',
      email: testEmail,
      password: testPassword,
      confirmPassword: testPassword,
    });
    assert.equal(signupRes.status, 201);
    authCookie = signupRes.cookieHeader;
    assert.ok(authCookie);
  });

  it('4. GET /api/billing/overview returns real active workspace subscription state', async () => {
    assert.ok(authCookie);
    const res = await api('GET', '/api/billing/overview', undefined, authCookie!);
    assert.equal(res.status, 200);

    const data = res.body;
    assert.ok(data.workspace);
    assert.ok(data.subscription);
    assert.ok(data.limits);
    assert.ok(data.usage);
    assert.ok(Array.isArray(data.plans));
    assert.ok(Array.isArray(data.invoices));

    assert.equal(data.workspace.canManageBilling, true);
    assert.equal(data.subscription.planId, 'free');
    assert.equal(data.subscription.status, 'active');
  });

  it('5. POST /api/billing/checkout-session creates Checkout Session URL', async () => {
    assert.ok(authCookie);
    const res = await api('POST', '/api/billing/checkout-session', {
      planId: 'pro',
      billingInterval: 'monthly',
    }, authCookie!);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.checkoutUrl);
  });

  it('6. POST /api/billing/change-plan performs plan upgrade to Pro', async () => {
    assert.ok(authCookie);
    const res = await api('POST', '/api/billing/change-plan', {
      targetPlanId: 'pro',
      billingInterval: 'monthly',
    }, authCookie!);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.plan.id, 'pro');

    // Verify subscription state updated
    const overview = await api('GET', '/api/billing/overview', undefined, authCookie!);
    assert.equal(overview.body.subscription.planId, 'pro');
    assert.equal(overview.body.limits.max_agents, 10);
    assert.equal(overview.body.limits.max_conversations, 5000);
  });

  it('7. POST /api/billing/cancel schedules cancellation at period end', async () => {
    assert.ok(authCookie);
    const res = await api('POST', '/api/billing/cancel', {}, authCookie!);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const overview = await api('GET', '/api/billing/overview', undefined, authCookie!);
    assert.equal(overview.body.subscription.cancelAtPeriodEnd, true);
  });

  it('8. POST /api/billing/resume reinstates active subscription', async () => {
    assert.ok(authCookie);
    const res = await api('POST', '/api/billing/resume', {}, authCookie!);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const overview = await api('GET', '/api/billing/overview', undefined, authCookie!);
    assert.equal(overview.body.subscription.cancelAtPeriodEnd, false);
    assert.equal(overview.body.subscription.status, 'active');
  });

  it('9. POST /api/webhooks/stripe handles webhook idempotency', async () => {
    const mockWebhookPayload = {
      id: `evt_test_${Date.now()}`,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          status: 'active',
          cancel_at_period_end: false,
        },
      },
    };

    const res1 = await api('POST', '/api/webhooks/stripe', mockWebhookPayload);
    assert.equal(res1.status, 200);
    assert.equal(res1.body.received, true);

    // Second call with same event ID should return duplicate: true
    const res2 = await api('POST', '/api/webhooks/stripe', mockWebhookPayload);
    assert.equal(res2.status, 200);
    assert.equal(res2.body.duplicate, true);
  });
});
