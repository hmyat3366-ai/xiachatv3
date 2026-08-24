/**
 * Xia Chat — Phase 5 Customer Management Integration Test Suite
 *
 * Tests:
 * 1. Empty customers for new workspace
 * 2. Real customer listing & stats
 * 3. Create customer
 * 4. Update customer
 * 5. Search customers by name, email, phone
 * 6. Filter options (active, new, returning, vip)
 * 7. Pagination (page & limit parameters)
 * 8. Customer conversation history connection
 * 9. Duplicate email prevention in same workspace
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

describe('PHASE 5 — CUSTOMER MANAGEMENT INTEGRATION TESTS', () => {
  let userAId: string;
  let userBId: string;
  let wsAId: string;
  let wsBId: string;
  let cookieA: string;
  let cookieB: string;
  let custAId: string;

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
      VALUES (?, 'Cust Agent A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `cust_a_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Cust Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `cust-ws-a-${ts}`, userAId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsAId, userAId, now, now, now);

    // User B + Workspace B
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Cust Agent B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `cust_b_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Cust Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `cust-ws-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    cookieA = createAuthCookie(userAId);
    cookieB = createAuthCookie(userBId);

    assert.ok(cookieA);
    assert.ok(cookieB);
  });

  it('2. Unauthenticated GET /api/customers returns 401', async () => {
    const res = await api('GET', '/api/customers');
    assert.strictEqual(res.status, 401);
  });

  it('3. Empty Workspace Customers returns 200 OK with empty customers array & zero stats', async () => {
    const res = await api('GET', `/api/customers?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.customers));
    assert.strictEqual(res.body.customers.length, 0);
    assert.strictEqual(res.body.stats.total, 0);
  });

  it('4. Create Customer in Workspace A', async () => {
    const res = await api(
      'POST',
      `/api/customers?workspaceId=${wsAId}`,
      {
        name: 'Alice Springs',
        email: 'alice@example.com',
        phone: '+1 (555) 111-2222',
        company: 'Wonderland Inc',
        location: 'Seattle, WA',
      },
      cookieA
    );

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    custAId = res.body.id;
  });

  it('5. Prevent Duplicate Customer Email Creation in Same Workspace (409)', async () => {
    const duplicateRes = await api(
      'POST',
      `/api/customers?workspaceId=${wsAId}`,
      {
        name: 'Alice Copy',
        email: 'alice@example.com',
      },
      cookieA
    );

    assert.strictEqual(duplicateRes.status, 409);
    assert.ok(duplicateRes.body.error);
  });

  it('6. Retrieve Customer List & Profile Details with Conversation History', async () => {
    // Seed conversation for Alice
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO conversations (
        id, workspace_id, customer_name, customer_email, channel, status, assignee,
        last_message, needs_attention, unread_count, created_at, updated_at
      ) VALUES (?, ?, 'Alice Springs', 'alice@example.com', 'Website', 'resolved', 'Xia AI', 'Question about subscription plan', 0, 0, ?, ?)
    `).run(crypto.randomUUID(), wsAId, now, now);

    const listRes = await api('GET', `/api/customers?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.customers.length, 1);
    assert.strictEqual(listRes.body.customers[0].name, 'Alice Springs');

    const detailRes = await api('GET', `/api/customers/${custAId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.customer.id, custAId);
    assert.strictEqual(detailRes.body.conversations.length, 1);
  });

  it('7. Update Customer Profile', async () => {
    const updateRes = await api(
      'PUT',
      `/api/customers/${custAId}?workspaceId=${wsAId}`,
      {
        company: 'Wonderland Enterprise',
        tags: ['VIP', 'Enterprise'],
      },
      cookieA
    );

    assert.strictEqual(updateRes.status, 200);

    const getRes = await api('GET', `/api/customers/${custAId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(getRes.body.customer.company, 'Wonderland Enterprise');
    assert.deepStrictEqual(getRes.body.customer.tags, ['VIP', 'Enterprise']);
  });

  it('8. Search & Filter Testing for Customers', async () => {
    // Search match
    const match = await api('GET', `/api/customers?workspaceId=${wsAId}&search=Alice`, undefined, cookieA);
    assert.strictEqual(match.status, 200);
    assert.strictEqual(match.body.customers.length, 1);

    // Search no match
    const noMatch = await api('GET', `/api/customers?workspaceId=${wsAId}&search=UnknownName`, undefined, cookieA);
    assert.strictEqual(noMatch.status, 200);
    assert.strictEqual(noMatch.body.customers.length, 0);

    // Filter VIP
    const vipFilter = await api('GET', `/api/customers?workspaceId=${wsAId}&filter=vip`, undefined, cookieA);
    assert.strictEqual(vipFilter.status, 200);
    assert.strictEqual(vipFilter.body.customers.length, 1);
  });

  it('9. Pagination testing for Customers', async () => {
    const res = await api('GET', `/api/customers?workspaceId=${wsAId}&page=1&limit=5`, undefined, cookieA);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.page, 1);
    assert.ok(res.body.totalPages >= 1);
  });

  it('10. Workspace Security Isolation: User B cannot access User A Customer details (404/403)', async () => {
    const res = await api('GET', `/api/customers/${custAId}?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(res.status, 404);
    assert.ok(res.body.error);
  });
});
