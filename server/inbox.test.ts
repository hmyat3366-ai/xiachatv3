/**
 * Xia Chat — Phase 4 Inbox & Conversation Integration Test Suite
 *
 * Tests:
 * 1. Empty inbox for new workspace
 * 2. Real conversation listing & stats
 * 3. Message sending & history retrieval
 * 4. Human takeover & Return-to-AI flow
 * 5. Assignee & Status updates
 * 6. Customer details (tags & notes)
 * 7. Unread -> Read transition
 * 8. Search & tab filtering
 * 9. Pagination (page & limit parameters)
 * 10. Workspace security isolation & 401 unauthenticated checks
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

describe('PHASE 4 — INBOX & CONVERSATION INTEGRATION TESTS', () => {
  let userAId: string;
  let userBId: string;
  let wsAId: string;
  let wsBId: string;
  let cookieA: string;
  let cookieB: string;
  let convAId: string;

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
      VALUES (?, 'Inbox Agent A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `inbox_a_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Inbox Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `inbox-ws-a-${ts}`, userAId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsAId, userAId, now, now, now);

    // User B + Workspace B
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Inbox Agent B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `inbox_b_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Inbox Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `inbox-ws-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    cookieA = createAuthCookie(userAId);
    cookieB = createAuthCookie(userBId);

    assert.ok(cookieA);
    assert.ok(cookieB);
  });

  it('2. Unauthenticated GET /api/inbox/conversations returns 401', async () => {
    const res = await api('GET', '/api/inbox/conversations');
    assert.strictEqual(res.status, 401);
  });

  it('3. Empty Workspace Inbox returns 200 OK with empty conversations array & zero stats', async () => {
    const res = await api('GET', `/api/inbox/conversations?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.conversations));
    assert.strictEqual(res.body.conversations.length, 0);
    assert.strictEqual(res.body.stats.total, 0);
  });

  it('4. Seed Conversation in Workspace A & verify retrieval', async () => {
    const now = new Date().toISOString();
    convAId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO conversations (
        id, workspace_id, customer_name, customer_email, channel, status, assignee,
        last_message, needs_attention, unread_count, created_at, updated_at
      ) VALUES (?, ?, 'Jane Doe', 'jane@example.com', 'Website', 'ai', 'Xia AI', 'Need assistance with order', 1, 2, ?, ?)
    `).run(convAId, wsAId, now, now);

    const res = await api('GET', `/api/inbox/conversations?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.conversations.length, 1);
    assert.strictEqual(res.body.conversations[0].id, convAId);
    assert.strictEqual(res.body.conversations[0].customerName, 'Jane Doe');
    assert.strictEqual(res.body.stats.total, 1);
  });

  it('5. Post Agent Message & verify thread history', async () => {
    const res = await api(
      'POST',
      `/api/inbox/conversations/${convAId}/messages?workspaceId=${wsAId}`,
      { content: 'Hello Jane, how can I help you today?', senderType: 'agent', isInternalNote: false },
      cookieA
    );

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.message.id);
    assert.strictEqual(res.body.message.content, 'Hello Jane, how can I help you today?');

    // Fetch messages history
    const threadRes = await api('GET', `/api/inbox/conversations/${convAId}/messages?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(threadRes.status, 200);
    assert.ok(threadRes.body.messages.length > 0);
    // Verified reading thread clears unread_count
    assert.strictEqual(threadRes.body.conversation.unreadCount, 0);
  });

  it('6. Human Takeover & Return to AI flow', async () => {
    // Takeover
    const takeoverRes = await api('POST', `/api/inbox/conversations/${convAId}/takeover?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(takeoverRes.status, 200);
    assert.strictEqual(takeoverRes.body.status, 'human');

    // Return to AI
    const returnRes = await api('POST', `/api/inbox/conversations/${convAId}/return-to-ai?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(returnRes.status, 200);
    assert.strictEqual(returnRes.body.status, 'ai');
  });

  it('7. Update Status, Assignee, and Customer Details', async () => {
    // Update Assignee
    const assignRes = await api('POST', `/api/inbox/conversations/${convAId}/assign?workspaceId=${wsAId}`, { assignee: 'Alex Rivera' }, cookieA);
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignRes.body.assignee, 'Alex Rivera');

    // Update Status
    const statusRes = await api('POST', `/api/inbox/conversations/${convAId}/status?workspaceId=${wsAId}`, { status: 'resolved' }, cookieA);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.status, 'resolved');

    // Update Tags & Notes
    const detailsRes = await api('POST', `/api/inbox/conversations/${convAId}/customer-details?workspaceId=${wsAId}`, { tags: ['VIP', 'Urgent'], notes: 'Customer requested priority shipping' }, cookieA);
    assert.strictEqual(detailsRes.status, 200);
  });

  it('8. Search & Tab Filter Testing', async () => {
    // Search matching
    const searchMatch = await api('GET', `/api/inbox/conversations?workspaceId=${wsAId}&search=Jane`, undefined, cookieA);
    assert.strictEqual(searchMatch.status, 200);
    assert.strictEqual(searchMatch.body.conversations.length, 1);

    // Search non-matching
    const searchNoMatch = await api('GET', `/api/inbox/conversations?workspaceId=${wsAId}&search=NonExistentCustomer`, undefined, cookieA);
    assert.strictEqual(searchNoMatch.status, 200);
    assert.strictEqual(searchNoMatch.body.conversations.length, 0);

    // Tab filter resolved
    const tabResolved = await api('GET', `/api/inbox/conversations?workspaceId=${wsAId}&tab=resolved`, undefined, cookieA);
    assert.strictEqual(tabResolved.status, 200);
    assert.strictEqual(tabResolved.body.conversations.length, 1);
  });

  it('9. Pagination testing for conversations and messages', async () => {
    const pagedConvs = await api('GET', `/api/inbox/conversations?workspaceId=${wsAId}&page=1&limit=10`, undefined, cookieA);
    assert.strictEqual(pagedConvs.status, 200);
    assert.ok(pagedConvs.body.pagination);
    assert.strictEqual(pagedConvs.body.pagination.page, 1);
    assert.strictEqual(pagedConvs.body.pagination.limit, 10);

    const pagedMsgs = await api('GET', `/api/inbox/conversations/${convAId}/messages?workspaceId=${wsAId}&page=1&limit=5`, undefined, cookieA);
    assert.strictEqual(pagedMsgs.status, 200);
  });

  it('10. Workspace Security Isolation: User B cannot access User A conversation history (404/403)', async () => {
    const res = await api('GET', `/api/inbox/conversations/${convAId}/messages?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });
});
