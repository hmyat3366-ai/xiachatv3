/**
 * Xia Chat — Phase 2 Dashboard Backend Integration Test Suite
 *
 * Tests real database queries, metrics calculation, period filtering,
 * workspace security isolation, empty states, and workspace creation.
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

describe('PHASE 2 — DASHBOARD BACKEND INTEGRATION TESTS', () => {
  let userAId: string;
  let userBId: string;
  let wsAId: string;
  let wsBId: string;
  let userACookie: string;
  let userBCookie: string;

  it('1. Setup User A (Workspace A) and User B (Workspace B)', async () => {
    const now = new Date().toISOString();
    const ts = Date.now();
    userAId = crypto.randomUUID();
    userBId = crypto.randomUUID();
    wsAId = crypto.randomUUID();
    wsBId = crypto.randomUUID();

    // Create User A & Workspace A
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Dash User A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `dash_a_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Dash Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `dash-ws-a-${ts}`, userAId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsAId, userAId, now, now, now);

    // Create User B & Workspace B
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Dash User B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `dash_b_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Dash Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `dash-ws-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    userACookie = createAuthCookie(userAId);
    userBCookie = createAuthCookie(userBId);

    assert.ok(userACookie);
    assert.ok(userBCookie);
  });

  it('2. Unauthenticated GET /api/dashboard/overview returns 401', async () => {
    const res = await api('GET', '/api/dashboard/overview');
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error);
  });

  it('3. Empty workspace returns isEmpty: true with null metrics and empty arrays', async () => {
    const res = await api('GET', '/api/dashboard/overview', undefined, userACookie);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.workspace.id, wsAId);
    assert.strictEqual(res.body.isEmpty, true);
    assert.strictEqual(res.body.metrics, null);
    assert.deepStrictEqual(res.body.activityChart, []);
    assert.deepStrictEqual(res.body.recentConversations, []);
    assert.deepStrictEqual(res.body.needsAttention, []);
  });

  it('4. Workspace Security Isolation: User A cannot query User B Dashboard data (returns 403)', async () => {
    const res = await api('GET', `/api/dashboard/overview?workspaceId=${wsBId}`, undefined, userACookie);
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error.includes('Access denied'));
  });

  it('5. Real Database Metrics Calculation for Workspace A', async () => {
    const now = Date.now();
    const min = 60 * 1000;
    const hour = 60 * min;

    // Seed 4 real conversations for Workspace A
    const conversations = [
      {
        id: crypto.randomUUID(),
        workspace_id: wsAId,
        customer_name: 'Customer 1 (Resolved)',
        customer_email: 'c1@example.com',
        channel: 'Website',
        status: 'resolved',
        assignee: 'Xia AI',
        last_message: 'Thank you for your help!',
        needs_attention: 0,
        attention_reason: null,
        created_at: new Date(now - 10 * min).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        workspace_id: wsAId,
        customer_name: 'Customer 2 (Human Handoff)',
        customer_email: 'c2@example.com',
        channel: 'WhatsApp',
        status: 'human',
        assignee: 'Agent Bob',
        last_message: 'I need a refund immediately.',
        needs_attention: 1,
        attention_reason: 'Escalated by customer',
        created_at: new Date(now - 2 * hour).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        workspace_id: wsAId,
        customer_name: 'Customer 3 (AI Active)',
        customer_email: 'c3@example.com',
        channel: 'Website',
        status: 'ai',
        assignee: 'Xia AI',
        last_message: 'Where is my order package?',
        needs_attention: 0,
        attention_reason: null,
        created_at: new Date(now - 5 * hour).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        workspace_id: wsAId,
        customer_name: 'Customer 4 (Resolved)',
        customer_email: 'c4@example.com',
        channel: 'Facebook',
        status: 'resolved',
        assignee: 'Xia AI',
        last_message: 'Resolved via knowledge base.',
        needs_attention: 0,
        attention_reason: null,
        created_at: new Date(now - 12 * hour).toISOString(),
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO conversations (
        id, workspace_id, customer_name, customer_email, channel, status, assignee,
        last_message, needs_attention, attention_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of conversations) {
      insertStmt.run(
        c.id,
        c.workspace_id,
        c.customer_name,
        c.customer_email,
        c.channel,
        c.status,
        c.assignee,
        c.last_message,
        c.needs_attention,
        c.attention_reason,
        c.created_at,
        c.created_at
      );
    }

    // Fetch Dashboard Overview for Workspace A
    const res = await api('GET', '/api/dashboard/overview?period=7d', undefined, userACookie);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.isEmpty, false);

    // Verify Real Metrics
    const metrics = res.body.metrics;
    assert.ok(metrics);
    assert.strictEqual(metrics.totalConversations.rawCount, 4);
    assert.strictEqual(metrics.totalConversations.value, '4');

    // Open Conversations: status in ('ai', 'human', 'open', 'assigned', 'waiting') -> 2 (Customer 2 human, Customer 3 ai)
    assert.strictEqual(metrics.openConversations.rawCount, 2);
    assert.strictEqual(metrics.openConversations.value, '2');
    assert.strictEqual(metrics.openConversations.attentionSubtext, '1 need attention');

    // AI Resolved Rate: 3 resolved/ai (C1, C3, C4) out of 4 = 75%
    assert.strictEqual(metrics.aiResolvedRate.rate, 75);
    assert.strictEqual(metrics.aiResolvedRate.value, '75%');

    // Human Handoffs: 1 (Customer 2)
    assert.strictEqual(metrics.humanHandoffs.rawCount, 1);
    assert.strictEqual(metrics.humanHandoffs.value, '1');

    // Recent Conversations: length 4 (most recent first)
    assert.strictEqual(res.body.recentConversations.length, 4);
    assert.strictEqual(res.body.recentConversations[0].customerName, 'Customer 1 (Resolved)');

    // Needs Attention: length 1 (Customer 2)
    assert.strictEqual(res.body.needsAttention.length, 1);
    assert.strictEqual(res.body.needsAttention[0].customerName, 'Customer 2 (Human Handoff)');
    assert.strictEqual(res.body.needsAttention[0].reason, 'Escalated by customer');
  });

  it('6. Period Filter Test (today vs 7d vs 30d)', async () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Add an older conversation from 10 days ago
    const oldConvId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO conversations (id, workspace_id, customer_name, channel, status, last_message, created_at, updated_at)
      VALUES (?, ?, 'Old Customer', 'Website', 'resolved', 'Old message', ?, ?)
    `).run(oldConvId, wsAId, new Date(now - 10 * dayMs).toISOString(), new Date(now - 10 * dayMs).toISOString());

    // Query 7d (should not include old 10-day-old conversation)
    const res7d = await api('GET', '/api/dashboard/overview?period=7d', undefined, userACookie);
    assert.strictEqual(res7d.status, 200);
    assert.strictEqual(res7d.body.metrics.totalConversations.rawCount, 4);

    // Query 30d (should include all 5 conversations)
    const res30d = await api('GET', '/api/dashboard/overview?period=30d', undefined, userACookie);
    assert.strictEqual(res30d.status, 200);
    assert.strictEqual(res30d.body.metrics.totalConversations.rawCount, 5);
  });

  it('7. POST /api/dashboard/workspaces Creates New Workspace & Member Record', async () => {
    const res = await api('POST', '/api/dashboard/workspaces', { name: 'New Test Workspace' }, userACookie);
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.workspace.id);
    assert.strictEqual(res.body.workspace.name, 'New Test Workspace');

    // Verify creator is stored in workspace_members as owner
    const member = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(res.body.workspace.id, userAId) as any;
    assert.ok(member);
    assert.strictEqual(member.role, 'owner');
    assert.strictEqual(member.status, 'active');
  });
});
