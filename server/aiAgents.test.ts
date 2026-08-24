/**
 * Xia Chat — Phase 7 AI Agents Integration Test Suite
 *
 * Tests:
 * 1. Default agent resolution & listing
 * 2. Create AI agent (POST /api/ai-agents)
 * 3. Update AI agent settings & system prompt (PUT /api/ai-agents/:id)
 * 4. Activate & deactivate agent status (POST /api/ai-agents/:id/status)
 * 5. Delete agent & sole default agent protection (DELETE /api/ai-agents/:id)
 * 6. Server-side LLM Playground Sandbox execution (POST /api/ai-agents/:id/test)
 * 7. Server-side AI Provider resiliency & fallback
 * 8. Plan limit enforcement (PLAN_LIMIT_REACHED)
 * 9. Unauthorized request rejection (401)
 * 10. Workspace security isolation (cross-workspace 403/404)
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

describe('PHASE 7 — AI AGENTS INTEGRATION TESTS', () => {
  let userAId: string;
  let userBId: string;
  let wsAId: string;
  let wsBId: string;

  let cookieA: string;
  let cookieB: string;

  let createdAgentId: string;
  let defaultAgentId: string;

  it('1. Setup User A (Workspace A) and User B (Workspace B)', async () => {
    const now = new Date().toISOString();
    const ts = Date.now();

    userAId = crypto.randomUUID();
    userBId = crypto.randomUUID();
    wsAId = crypto.randomUUID();
    wsBId = crypto.randomUUID();

    // User A + Workspace A (Pro Plan for multi-agent support)
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Agent Manager A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `agent_mgr_a_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Agent Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `agent-ws-a-${ts}`, userAId, now, now);

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
      VALUES (?, 'Agent Manager B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `agent_mgr_b_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Agent Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `agent-ws-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    cookieA = createAuthCookie(userAId);
    cookieB = createAuthCookie(userBId);

    assert.ok(cookieA);
    assert.ok(cookieB);
  });

  it('2. Unauthenticated GET /api/ai-agents returns 401', async () => {
    const res = await api('GET', '/api/ai-agents');
    assert.strictEqual(res.status, 401);
  });

  it('3. List AI Agents for Workspace A (Auto-seeds default agent)', async () => {
    const res = await api('GET', `/api/ai-agents?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.agents));
    assert.strictEqual(res.body.agents.length, 1);
    defaultAgentId = res.body.agents[0].id;
    assert.ok(defaultAgentId);
  });

  it('4. Create New AI Agent in Workspace A (POST /api/ai-agents)', async () => {
    const res = await api(
      'POST',
      `/api/ai-agents?workspaceId=${wsAId}`,
      {
        name: 'Returns Specialist Bot',
        description: 'Specializes in processing customer returns and exchange requests.',
        avatar: 'shield',
        status: 'active',
        tone: 'Professional',
        customInstructions: 'Verify order ID and original receipt before authorizing returns.',
        responseStyle: 'Detailed',
        autoReplyEnabled: true,
        humanHandoffEnabled: true,
        knowledgeSources: ['returns', 'faq'],
        channels: ['web', 'whatsapp'],
      },
      cookieA
    );

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.agent.id);
    assert.strictEqual(res.body.agent.name, 'Returns Specialist Bot');
    createdAgentId = res.body.agent.id;
  });

  it('5. Update AI Agent Configuration & Instructions (PUT /api/ai-agents/:id)', async () => {
    const updateRes = await api(
      'PUT',
      `/api/ai-agents/${createdAgentId}?workspaceId=${wsAId}`,
      {
        tone: 'Empathetic',
        customInstructions: 'Always apologize for any delivery delays before offering solutions.',
      },
      cookieA
    );

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);

    const getRes = await api('GET', `/api/ai-agents/${createdAgentId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.agent.tone, 'Empathetic');
  });

  it('6. Activate & Deactivate Agent Status (POST /api/ai-agents/:id/status)', async () => {
    const pauseRes = await api(
      'POST',
      `/api/ai-agents/${createdAgentId}/status?workspaceId=${wsAId}`,
      { status: 'paused' },
      cookieA
    );
    assert.strictEqual(pauseRes.status, 200);
    assert.strictEqual(pauseRes.body.status, 'paused');

    const activeRes = await api(
      'POST',
      `/api/ai-agents/${createdAgentId}/status?workspaceId=${wsAId}`,
      { status: 'active' },
      cookieA
    );
    assert.strictEqual(activeRes.status, 200);
    assert.strictEqual(activeRes.body.status, 'active');
  });

  it('7. Execute Server-Side LLM Sandbox Playground Test (POST /api/ai-agents/:id/test)', async () => {
    const testRes = await api(
      'POST',
      `/api/ai-agents/${createdAgentId}/test?workspaceId=${wsAId}`,
      { message: 'What is your return policy for damaged products?' },
      cookieA
    );

    assert.strictEqual(testRes.status, 200);
    assert.ok(testRes.body.reply);
    assert.ok(testRes.body.metadata.modelUsed);
    assert.ok(typeof testRes.body.metadata.responseTimeMs === 'number');
  });

  it('8. Sole Default Agent Delete Protection (DELETE /api/ai-agents/:id)', async () => {
    // Delete created second agent first
    const delSecond = await api('DELETE', `/api/ai-agents/${createdAgentId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(delSecond.status, 200);

    // Attempting to delete the sole remaining default agent -> 400 Bad Request
    const delSole = await api('DELETE', `/api/ai-agents/${defaultAgentId}?workspaceId=${wsAId}`, undefined, cookieA);
    assert.strictEqual(delSole.status, 400);
    assert.ok(delSole.body.error);
  });

  it('9. Plan Limit Enforcement for AI Agent Creation (Free Plan Limit)', async () => {
    // Workspace B is on Free plan (max 1 agent)
    const listRes = await api('GET', `/api/ai-agents?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.agents.length, 1);

    // Attempting to create second agent on Free plan -> 403 PLAN_LIMIT_REACHED
    const createRes = await api(
      'POST',
      `/api/ai-agents?workspaceId=${wsBId}`,
      { name: 'Exceeding Agent' },
      cookieB
    );
    assert.strictEqual(createRes.status, 403);
    assert.strictEqual(createRes.body.code, 'PLAN_LIMIT_REACHED');
  });

  it('10. Workspace Security Isolation: User B cannot access or test User A AI Agents', async () => {
    const crossGet = await api('GET', `/api/ai-agents/${defaultAgentId}?workspaceId=${wsBId}`, undefined, cookieB);
    assert.strictEqual(crossGet.status, 404);

    const crossTest = await api('POST', `/api/ai-agents/${defaultAgentId}/test?workspaceId=${wsBId}`, { message: 'hi' }, cookieB);
    assert.strictEqual(crossTest.status, 404);
  });
});
