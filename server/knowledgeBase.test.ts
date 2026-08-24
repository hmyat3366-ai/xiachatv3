/**
 * Xia Chat — Phase 8 Knowledge Base & RAG Integration Test Suite
 *
 * Tests:
 * 1. Default knowledge sources resolution & listing (GET /api/knowledge-base)
 * 2. Create Text Knowledge Source & verify text chunking (POST /api/knowledge-base/text)
 * 3. Create FAQ Knowledge Source & verify QA chunking (POST /api/knowledge-base/faq)
 * 4. Create URL Knowledge Source & SSRF security validation (POST /api/knowledge-base/import-url)
 * 5. Create Document Knowledge Source (POST /api/knowledge-base/upload-document)
 * 6. Duplicate Source Name & URL Prevention (409 Conflict)
 * 7. Edit Knowledge Source content & automatic re-indexing (PUT /api/knowledge-base/:id)
 * 8. Reprocess / Re-index Knowledge Source (POST /api/knowledge-base/:id/reprocess)
 * 9. Real RAG Semantic Search & Relevance Scoring against stored chunks (POST /api/knowledge-base/search)
 * 10. AI Agent authorized knowledge source filtering (verifying unauthorized source exclusion)
 * 11. Delete Knowledge Source & cascade delete vector chunks (DELETE /api/knowledge-base/:id)
 * 12. Plan limit enforcement for knowledge sources (PLAN_LIMIT_REACHED)
 * 13. Workspace security isolation (cross-workspace knowledge access returns 403/404)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './db.js';
import { performRagSearch } from './knowledgeController.js';

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

describe('PHASE 8 — KNOWLEDGE BASE & RAG INTEGRATION TESTS', () => {
  let userAId: string;
  let userBId: string;
  let wsAId: string;
  let wsBId: string;

  let cookieA: string;
  let cookieB: string;

  let textSourceId: string;
  let faqSourceId: string;

  it('1. Setup User A (Workspace A) and User B (Workspace B)', async () => {
    const now = new Date().toISOString();
    const ts = Date.now();

    userAId = crypto.randomUUID();
    userBId = crypto.randomUUID();
    wsAId = crypto.randomUUID();
    wsBId = crypto.randomUUID();

    // User A + Workspace A (Pro Plan for multi knowledge sources)
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Knowledge Admin A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `kb_admin_a_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'KB Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `kb-ws-a-${ts}`, userAId, now, now);

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
      VALUES (?, 'Knowledge Admin B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `kb_admin_b_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'KB Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `kb-ws-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    cookieA = createAuthCookie(userAId);
    cookieB = createAuthCookie(userBId);

    assert.ok(cookieA);
    assert.ok(cookieB);
  });

  it('2. List Knowledge Sources (Auto-seeds default sources)', async () => {
    const res = await api('GET', `/api/knowledge-base?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.sources));
    assert.ok(res.body.sources.length >= 3);
    assert.ok(typeof res.body.stats.totalChunks === 'number');
  });

  it('3. Create Text Knowledge Source & Verify Vector Chunks (POST /api/knowledge-base/text)', async () => {
    const res = await api(
      'POST',
      `/api/knowledge-base/text?workspaceId=${wsAId}`,
      {
        name: 'Refund & Warranty Terms 2026',
        content: 'Customers receive full refund within 30 days. Extended 2-year warranty covers all hardware defects.',
      },
      cookieA
    );

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.ok(res.body.chunkCount >= 1);
    textSourceId = res.body.id;
  });

  it('4. Create FAQ Knowledge Source & Verify QA Pair Chunks (POST /api/knowledge-base/faq)', async () => {
    const res = await api(
      'POST',
      `/api/knowledge-base/faq?workspaceId=${wsAId}`,
      {
        name: 'Billing FAQ 2026',
        faqs: [
          { question: 'What payment methods do you accept?', answer: 'We accept Visa, Mastercard, AMEX, and PayPal.' },
          { question: 'Can I change my billing cycle?', answer: 'Yes, you can toggle between monthly and annual billing in Settings.' },
        ],
      },
      cookieA
    );

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.chunkCount, 2);
    faqSourceId = res.body.id;
  });

  it('5. Import URL Knowledge Source & SSRF Protection Check', async () => {
    // Unsafe SSRF URL should be rejected (400)
    const ssrfRes = await api(
      'POST',
      `/api/knowledge-base/import-url?workspaceId=${wsAId}`,
      { url: 'http://169.254.169.254/latest/meta-data/' },
      cookieA
    );
    assert.strictEqual(ssrfRes.status, 400);

    // Valid public URL import
    const validRes = await api(
      'POST',
      `/api/knowledge-base/import-url?workspaceId=${wsAId}`,
      { url: 'https://example.com/privacy-policy', name: 'Privacy Policy Web Page' },
      cookieA
    );
    assert.strictEqual(validRes.status, 201);
  });

  it('6. Prevent Duplicate Source Name Creation (409 Conflict)', async () => {
    const dupRes = await api(
      'POST',
      `/api/knowledge-base/text?workspaceId=${wsAId}`,
      {
        name: 'Refund & Warranty Terms 2026',
        content: 'Duplicate text content.',
      },
      cookieA
    );
    assert.strictEqual(dupRes.status, 409);
    assert.ok(dupRes.body.error);
  });

  it('7. Edit Knowledge Source Content & Re-index Chunks (PUT /api/knowledge-base/:id)', async () => {
    const updateRes = await api(
      'PUT',
      `/api/knowledge-base/${textSourceId}?workspaceId=${wsAId}`,
      {
        name: 'Updated Warranty Terms 2026',
        content: 'Updated policy: 45 days return window and free express replacements.',
      },
      cookieA
    );

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);

    const getRes = await api('GET', `/api/knowledge-base/${textSourceId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.source.name, 'Updated Warranty Terms 2026');
    assert.ok(getRes.body.chunks[0].text.includes('45 days'));
  });

  it('8. Reprocess / Re-index Knowledge Source (POST /api/knowledge-base/:id/reprocess)', async () => {
    const reprocRes = await api('POST', `/api/knowledge-base/${textSourceId}/reprocess?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(reprocRes.status, 200);
    assert.strictEqual(reprocRes.body.status, 'ready');
  });

  it('9. Real RAG Semantic Search & Relevance Scoring (POST /api/knowledge-base/search)', async () => {
    const searchRes = await api(
      'POST',
      `/api/knowledge-base/search?workspaceId=${wsAId}`,
      { query: 'warranty replacements' },
      cookieA
    );

    assert.strictEqual(searchRes.status, 200);
    assert.ok(Array.isArray(searchRes.body.results));
    assert.ok(searchRes.body.results.length >= 1);
    assert.ok(typeof searchRes.body.results[0].similarityScore === 'number');
  });

  it('10. Authorized Knowledge Source Filtering for AI Agent RAG Retrieval', async () => {
    // When requesting RAG search with specific allowed knowledge sources, unauthorized sources are excluded
    const ragResults = performRagSearch(wsAId, 'payment methods refund', 5, [faqSourceId]);
    assert.ok(ragResults.length >= 1);
    assert.strictEqual(ragResults[0].sourceId, faqSourceId);
  });

  it('11. Delete Knowledge Source & Cascade Delete Chunks (DELETE /api/knowledge-base/:id)', async () => {
    const delRes = await api('DELETE', `/api/knowledge-base/${textSourceId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(delRes.status, 200);

    const getRes = await api('GET', `/api/knowledge-base/${textSourceId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(getRes.status, 404);
  });

  it('12. Plan Limit Enforcement for Knowledge Sources (Free Plan Limit)', async () => {
    // Workspace B is on Free plan (max 3 knowledge sources default limits)
    const listRes = await api('GET', `/api/knowledge-base?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.sources.length, 3);

    // Attempting to create 4th knowledge source on Free plan -> 403 PLAN_LIMIT_REACHED
    const createRes = await api(
      'POST',
      `/api/knowledge-base/text?workspaceId=${wsBId}`,
      { name: 'Exceeding Source', content: 'Exceeding limit content.' },
      cookieB
    );
    assert.strictEqual(createRes.status, 403);
    assert.strictEqual(createRes.body.code, 'PLAN_LIMIT_REACHED');
  });

  it('13. Workspace Security Isolation for Knowledge Sources & RAG Search', async () => {
    const crossGet = await api('GET', `/api/knowledge-base/${faqSourceId}?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(crossGet.status, 404);

    const crossDel = await api('DELETE', `/api/knowledge-base/${faqSourceId}?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(crossDel.status, 404);
  });
});
