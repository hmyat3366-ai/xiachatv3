/**
 * Xia Chat — Phase 9 Channel Management Integration Test Suite
 *
 * Tests:
 * 1. Default channel resolution & listing (GET /api/channels)
 * 2. Connect channel with valid credentials (POST /api/channels/:provider/connect)
 * 3. Prevent duplicate active channel connection (409 Conflict)
 * 4. Disconnect & reconnect channel lifecycle (POST /api/channels/:id/disconnect)
 * 5. Reject connection with invalid/missing credentials (400 Bad Request)
 * 6. Configure website chat widget & default AI agent assignment (PUT /api/channels/website-config)
 * 7. Fetch public CORS-safe website widget configuration (GET /api/channels/public-widget/:siteKey)
 * 8. Channel health check ping test (POST /api/channels/:id/test)
 * 9. Webhook challenge verification (GET /api/webhooks/:provider) & event receiver (POST /api/webhooks/:provider)
 * 10. Plan limit enforcement for channel connections (PLAN_LIMIT_REACHED)
 * 11. Workspace security isolation (cross-workspace channel access returns 403/404)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'xia_chat_dev_jwt_secret_key_8f9a2b7c4d1e';

function createAuthCookie(userId: string): string {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  return `auth_token=${token}`;
}

function api(method: string, path: string, body?: any, cookie?: string) {
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('PHASE 9 — CHANNEL MANAGEMENT INTEGRATION TESTS', () => {
  let userAId: string;
  let userBId: string;
  let wsAId: string;
  let wsBId: string;

  let cookieA: string;
  let cookieB: string;

  let websiteChanId: string;
  let whatsappChanId: string;

  it('1. Setup User A (Workspace A) and User B (Workspace B)', async () => {
    const now = new Date().toISOString();
    const ts = Date.now();

    userAId = crypto.randomUUID();
    userBId = crypto.randomUUID();
    wsAId = crypto.randomUUID();
    wsBId = crypto.randomUUID();

    // User A + Workspace A (Pro Plan for multi-channel support)
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Channel Admin A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `chan_admin_a_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Channel Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `chan-ws-a-${ts}`, userAId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsAId, userAId, now, now, now);

    db.prepare(`
      INSERT INTO subscriptions (
        id, workspace_id, stripe_customer_id, stripe_subscription_id, plan_id, status,
        billing_interval, current_period_start, current_period_end, cancel_at_period_end,
        created_at, updated_at
      ) VALUES (?, ?, 'cus_test', 'sub_test', 'pro', 'active', 'monthly', ?, ?, 0, ?, ?)
    `).run(crypto.randomUUID(), wsAId, now, now, now, now);

    // User B + Workspace B
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Channel Admin B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `chan_admin_b_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Channel Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `chan-ws-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    cookieA = createAuthCookie(userAId);
    cookieB = createAuthCookie(userBId);

    assert.ok(cookieA);
    assert.ok(cookieB);
  });

  it('2. List Workspace Channels (Auto-seeds default channels)', async () => {
    const res = await api('GET', `/api/channels?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.channels));
    assert.strictEqual(res.body.channels.length, 4);

    const website = res.body.channels.find((c: any) => c.type === 'website');
    assert.ok(website);
    assert.strictEqual(website.status, 'connected');
    websiteChanId = website.id;
  });

  it('3. Reject Connection Attempt with Missing/Invalid Credentials (400)', async () => {
    const res = await api(
      'POST',
      `/api/channels/whatsapp/connect?workspaceId=${wsAId}`,
      { phoneNumberId: '12345', accessToken: '' },
      cookieA
    );
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('4. Connect WhatsApp Business Channel (POST /api/channels/:provider/connect)', async () => {
    const res = await api(
      'POST',
      `/api/channels/whatsapp/connect?workspaceId=${wsAId}`,
      {
        phoneNumberId: '105829471928471',
        accessToken: 'EAAG1234567890SecretTokenValueHere',
        name: 'Official Customer Support WhatsApp',
      },
      cookieA
    );

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.channel.id);
    assert.strictEqual(res.body.channel.status, 'connected');
    whatsappChanId = res.body.channel.id;
  });

  it('5. Prevent Duplicate Channel Connection (409 Conflict)', async () => {
    const dupRes = await api(
      'POST',
      `/api/channels/whatsapp/connect?workspaceId=${wsAId}`,
      {
        phoneNumberId: '105829471928471',
        accessToken: 'EAAG1234567890SecretTokenValueHere',
      },
      cookieA
    );
    assert.strictEqual(dupRes.status, 409);
    assert.ok(dupRes.body.error);
  });

  it('6. Disconnect & Reconnect Channel Lifecycle', async () => {
    // Disconnect
    const disRes = await api('POST', `/api/channels/${whatsappChanId}/disconnect?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(disRes.status, 200);

    const getRes = await api('GET', `/api/channels/${whatsappChanId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.channel.status, 'not_connected');

    // Reconnect
    const reconRes = await api(
      'POST',
      `/api/channels/whatsapp/connect?workspaceId=${wsAId}`,
      {
        phoneNumberId: '105829471928471',
        accessToken: 'EAAG1234567890NewSecretTokenValue',
      },
      cookieA
    );
    assert.strictEqual(reconRes.status, 200);
    assert.strictEqual(reconRes.body.channel.status, 'connected');
  });

  it('7. Update Website Chat Widget Configuration (PUT /api/channels/website-config)', async () => {
    const configRes = await api(
      'PUT',
      `/api/channels/website-config?workspaceId=${wsAId}`,
      {
        widgetName: 'Xia VIP Concierge Chat',
        welcomeMessage: 'Welcome to VIP Support!',
        primaryColor: '#059669',
        position: 'bottom-left',
      },
      cookieA
    );
    assert.strictEqual(configRes.status, 200);
    assert.strictEqual(configRes.body.success, true);
  });

  it('8. Retrieve Public CORS-Safe Website Widget Config (GET /api/channels/public-widget/:siteKey)', async () => {
    const pubRes = await api('GET', `/api/channels/public-widget/${websiteChanId}`);
    assert.strictEqual(pubRes.status, 200);
    assert.strictEqual(pubRes.body.widgetName, 'Xia VIP Concierge Chat');
    assert.strictEqual(pubRes.body.primaryColor, '#059669');
    assert.strictEqual(pubRes.body.position, 'bottom-left');
    // Ensure no secret keys leak in public endpoint
    assert.strictEqual(pubRes.body.accessToken, undefined);
  });

  it('9. Channel Health Check Test (POST /api/channels/:id/test)', async () => {
    const testRes = await api('POST', `/api/channels/${websiteChanId}/test?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(testRes.status, 200);
    assert.strictEqual(testRes.body.success, true);
    assert.ok(typeof testRes.body.latencyMs === 'number');
  });

  it('10. Webhook Challenge Verification & Event Processing', async () => {
    // Challenge Verification
    const challengeRes = await api('GET', '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=xia_chat_webhook_verify_secret&hub.challenge=test_challenge_code_123');
    assert.strictEqual(challengeRes.status, 200);

    // Event Receiver
    const eventRes = await api('POST', '/api/webhooks/whatsapp', { object: 'whatsapp_business_account', entry: [] });
    assert.strictEqual(eventRes.status, 200);
    assert.strictEqual(eventRes.body.status, 'EVENT_RECEIVED');
  });

  it('11. Plan Limit Enforcement for Channel Connections (Free Plan Limit)', async () => {
    // Workspace B is on Free plan (max 1 channel: Website Live Chat default)
    const listRes = await api('GET', `/api/channels?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(listRes.status, 200);

    // Attempting to connect 2nd channel on Free plan -> 403 PLAN_LIMIT_REACHED
    const connectRes = await api(
      'POST',
      `/api/channels/facebook/connect?workspaceId=${wsBId}`,
      { pageId: '9876543210', accessToken: 'EAAG9876543210Token' },
      cookieB
    );
    assert.strictEqual(connectRes.status, 403);
    assert.strictEqual(connectRes.body.code, 'PLAN_LIMIT_REACHED');
  });

  it('12. Workspace Security Isolation: User B cannot access User A Channels', async () => {
    const crossGet = await api('GET', `/api/channels/${websiteChanId}?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(crossGet.status, 404);

    const crossDisconnect = await api('POST', `/api/channels/${websiteChanId}/disconnect?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(crossDisconnect.status, 404);
  });
});
