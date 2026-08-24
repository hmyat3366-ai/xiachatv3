/**
 * Xia Chat — Phase 10 Analytics & Reporting Integration Test Suite
 *
 * Tests:
 * 1. Unauthenticated request to /api/analytics returns 401
 * 2. Empty Workspace Analytics returns isEmpty: true and zero KPI metrics
 * 3. Real Database Metrics Calculation against seeded conversations, messages, & customers
 * 4. Date Range Presets testing (today vs 7d vs 30d vs 90d)
 * 5. Channel and Agent filter parameters (channelId, agentId)
 * 6. Export CSV Generation (GET /api/analytics/export.csv) with text/csv content type
 * 7. Metric Consistency Check between Analytics KPIs and Dashboard Overview
 * 8. Workspace Security Isolation (User B cannot access User A Analytics, returns 403/404)
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
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }>((resolve, reject) => {
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
          let parsed = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            // Keep string if CSV or text
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('PHASE 10 — ANALYTICS INTEGRATION TESTS', () => {
  let userAId: string;
  let userBId: string;
  let wsAId: string;
  let wsBId: string;

  let cookieA: string;
  let cookieB: string;

  it('1. Setup User A (Workspace A) and User B (Workspace B)', async () => {
    const now = new Date().toISOString();
    const ts = Date.now();

    userAId = crypto.randomUUID();
    userBId = crypto.randomUUID();
    wsAId = crypto.randomUUID();
    wsBId = crypto.randomUUID();

    // User A + Workspace A
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Analytics Admin A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `analytics_admin_a_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Analytics Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `analytics-ws-a-${ts}`, userAId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsAId, userAId, now, now, now);

    // User B + Workspace B (Empty Workspace)
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Analytics Admin B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `analytics_admin_b_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Analytics Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `analytics-ws-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    cookieA = createAuthCookie(userAId);
    cookieB = createAuthCookie(userBId);

    assert.ok(cookieA);
    assert.ok(cookieB);
  });

  it('2. Unauthenticated GET /api/analytics returns 401', async () => {
    const res = await api('GET', `/api/analytics?workspaceId=${wsAId}`);
    assert.strictEqual(res.status, 401);
  });

  it('3. Empty Workspace Analytics Returns isEmpty: true with Zero Metrics', async () => {
    const res = await api('GET', `/api/analytics?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.isEmpty, true);
    assert.strictEqual(res.body.kpis.totalConversations.value, 0);
    assert.strictEqual(res.body.kpis.resolvedConversations.value, 0);
    assert.strictEqual(res.body.kpis.newCustomers.value, 0);
    assert.strictEqual(res.body.kpis.totalMessages.value, 0);
  });

  it('4. Real Database Analytics Calculation for Seeded Workspace Data', async () => {
    const now = new Date().toISOString();

    // Seed 3 Conversations in Workspace A
    const conv1Id = crypto.randomUUID();
    const conv2Id = crypto.randomUUID();
    const conv3Id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO conversations (id, workspace_id, customer_name, customer_email, channel, status, assignee, last_message, confidence_score, created_at, updated_at)
      VALUES (?, ?, 'Customer One', 'c1@example.com', 'website', 'resolved', 'Xia AI', 'Need refund help', 0.95, ?, ?)
    `).run(conv1Id, wsAId, now, now);

    db.prepare(`
      INSERT INTO conversations (id, workspace_id, customer_name, customer_email, channel, status, assignee, last_message, confidence_score, created_at, updated_at)
      VALUES (?, ?, 'Customer Two', 'c2@example.com', 'whatsapp', 'open', 'Xia AI', 'Tracking query', 0.60, ?, ?)
    `).run(conv2Id, wsAId, now, now);

    db.prepare(`
      INSERT INTO conversations (id, workspace_id, customer_name, customer_email, channel, status, assignee, last_message, confidence_score, created_at, updated_at)
      VALUES (?, ?, 'Customer Three', 'c3@example.com', 'facebook', 'resolved', 'John Agent', 'Product question', 0.88, ?, ?)
    `).run(conv3Id, wsAId, now, now);

    // Seed Messages
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, created_at)
      VALUES (?, ?, 'customer', 'Customer One', 'Need refund help', ?)
    `).run(crypto.randomUUID(), conv1Id, now);

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, created_at)
      VALUES (?, ?, 'agent', 'Xia AI', 'Your refund has been processed', ?)
    `).run(crypto.randomUUID(), conv1Id, now);

    const res = await api('GET', `/api/analytics?workspaceId=${wsAId}&preset=30d`, undefined, cookieA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.isEmpty, false);
    assert.strictEqual(res.body.kpis.totalConversations.value, 3);
    assert.strictEqual(res.body.kpis.resolvedConversations.value, 2);
    assert.strictEqual(res.body.kpis.totalMessages.value, 2);
    assert.ok(Array.isArray(res.body.trends));
  });

  it('5. Test Date Range Presets (today vs 7d vs 30d vs 90d)', async () => {
    const resToday = await api('GET', `/api/analytics?workspaceId=${wsAId}&preset=today`, undefined, cookieA);
    assert.strictEqual(resToday.status, 200);
    assert.strictEqual(resToday.body.dateBounds.durationDays, 1);

    const res7d = await api('GET', `/api/analytics?workspaceId=${wsAId}&preset=7d`, undefined, cookieA);
    assert.strictEqual(res7d.status, 200);
    assert.strictEqual(res7d.body.dateBounds.durationDays, 7);

    const res90d = await api('GET', `/api/analytics?workspaceId=${wsAId}&preset=90d`, undefined, cookieA);
    assert.strictEqual(res90d.status, 200);
    assert.strictEqual(res90d.body.dateBounds.durationDays, 90);
  });

  it('6. Channel and Agent Filter Query Parameters', async () => {
    const websiteRes = await api('GET', `/api/analytics?workspaceId=${wsAId}&channelId=website`, undefined, cookieA);
    assert.strictEqual(websiteRes.status, 200);
    assert.strictEqual(websiteRes.body.kpis.totalConversations.value, 1);

    const agentRes = await api('GET', `/api/analytics?workspaceId=${wsAId}&agentId=John Agent`, undefined, cookieA);
    assert.strictEqual(agentRes.status, 200);
    assert.strictEqual(agentRes.body.kpis.totalConversations.value, 1);
  });

  it('7. Export Analytics CSV (GET /api/analytics/export.csv)', async () => {
    const csvRes = await api('GET', `/api/analytics/export.csv?workspaceId=${wsAId}&preset=30d`, undefined, cookieA);
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type']?.includes('text/csv'));
    assert.ok(typeof csvRes.body === 'string');
    assert.ok(csvRes.body.includes('Conversation ID,Customer Name,Customer Email'));
    assert.ok(csvRes.body.includes('Customer One'));
  });

  it('8. Consistency Verification Between Analytics and Dashboard Overview', async () => {
    const analyticsRes = await api('GET', `/api/analytics?workspaceId=${wsAId}&preset=30d`, undefined, cookieA);
    const dashboardRes = await api('GET', `/api/dashboard/overview?workspaceId=${wsAId}&period=30d`, undefined, cookieA);

    assert.strictEqual(analyticsRes.status, 200);
    assert.strictEqual(dashboardRes.status, 200);

    // Total conversations in Analytics should match total Conversations in Dashboard
    assert.strictEqual(analyticsRes.body.kpis.totalConversations.value, Number(dashboardRes.body.metrics.totalConversations.value));
  });

  it('9. Workspace Security Isolation for Analytics Data', async () => {
    const crossGet = await api('GET', `/api/analytics?workspaceId=${wsAId}`, undefined, cookieB);
    assert.ok([403, 404].includes(crossGet.status));

    const crossCsv = await api('GET', `/api/analytics/export.csv?workspaceId=${wsAId}`, undefined, cookieB);
    assert.ok([403, 404].includes(crossCsv.status));
  });
});
