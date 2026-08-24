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

describe('Core APIs & Workspace Isolation Integration Tests', () => {
  let userACookie: string;
  let userBCookie: string;
  let wsAId: string;
  let wsBId: string;
  let userAId: string;
  let userBId: string;

  it('1. Setup Workspace A and Workspace B with Users', async () => {
    const now = new Date().toISOString();
    const ts = Date.now();
    userAId = crypto.randomUUID();
    userBId = crypto.randomUUID();
    wsAId = crypto.randomUUID();
    wsBId = crypto.randomUUID();

    // User A & Workspace A
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'User A', ?, 'hash', ?, ?, ?)
    `).run(userAId, `usera_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `workspace-a-${ts}`, userAId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsAId, userAId, now, now, now);

    // User B & Workspace B
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'User B', ?, 'hash', ?, ?, ?)
    `).run(userBId, `userb_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `workspace-b-${ts}`, userBId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, userBId, now, now, now);

    userACookie = createAuthCookie(userAId);
    userBCookie = createAuthCookie(userBId);

    assert.ok(userACookie);
    assert.ok(userBCookie);
  });

  it('2. Workspace Isolation Enforcement: User A cannot query Workspace B data via query params', async () => {
    const res = await api('GET', `/api/inbox/conversations?workspaceId=${wsBId}`, undefined, userACookie);
    assert.ok([403, 404].includes(res.status), 'User A request for Workspace B must be rejected with 403 or 404');
  });

  it('3. Core Inbox APIs: Conversations, Messages, Takeover, Return to AI, Assignment, Status', async () => {
    // 3a. Get Inbox Conversations
    const convsRes = await api('GET', '/api/inbox/conversations', undefined, userACookie);
    assert.strictEqual(convsRes.status, 200);
    assert.ok(Array.isArray(convsRes.body.conversations));

    // Create a new conversation in Workspace A for testing
    const now = new Date().toISOString();
    const convId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO conversations (id, workspace_id, customer_name, customer_email, channel, status, last_message, created_at, updated_at)
      VALUES (?, ?, 'Alice Test', 'alice@test.com', 'Website', 'ai', 'Help with checkout', ?, ?)
    `).run(convId, wsAId, now, now);

    // 3b. Get Conversation Messages
    const msgRes = await api('GET', `/api/inbox/conversations/${convId}/messages`, undefined, userACookie);
    assert.strictEqual(msgRes.status, 200);
    assert.strictEqual(msgRes.body.conversation.id, convId);

    // 3c. Post Message
    const postRes = await api('POST', `/api/inbox/conversations/${convId}/messages`, { content: 'Agent response' }, userACookie);
    assert.strictEqual(postRes.status, 201);
    assert.strictEqual(postRes.body.message.content, 'Agent response');

    // 3d. Takeover Conversation (Human Handoff)
    const takeoverRes = await api('POST', `/api/inbox/conversations/${convId}/takeover`, undefined, userACookie);
    assert.strictEqual(takeoverRes.status, 200);
    assert.strictEqual(takeoverRes.body.status, 'human');

    // 3e. Return to AI
    const returnAiRes = await api('POST', `/api/inbox/conversations/${convId}/return-to-ai`, undefined, userACookie);
    assert.strictEqual(returnAiRes.status, 200);
    assert.strictEqual(returnAiRes.body.status, 'ai');

    // 3f. Update Assignment
    const assignRes = await api('POST', `/api/inbox/conversations/${convId}/assign`, { assignee: 'User A' }, userACookie);
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignRes.body.assignee, 'User A');

    // 3g. Update Status
    const statusRes = await api('POST', `/api/inbox/conversations/${convId}/status`, { status: 'resolved' }, userACookie);
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.status, 'resolved');

    // 3h. Update Customer Details (Tags and Notes)
    const detailsRes = await api('POST', `/api/inbox/conversations/${convId}/customer-details`, { tags: ['VIP'], notes: 'Important customer' }, userACookie);
    assert.strictEqual(detailsRes.status, 200);

    // 3i. Generate AI Draft
    const draftRes = await api('POST', `/api/inbox/conversations/${convId}/generate-ai-draft`, undefined, userACookie);
    assert.strictEqual(draftRes.status, 200);
    assert.ok(draftRes.body.draftMessage);
  });

  it('4. Core Customers APIs: CRUD, Notes, Block, Merge', async () => {
    // 4a. Create Customer
    const createRes = await api('POST', '/api/customers', { name: 'Customer Test', email: 'cust@test.com', phone: '+123456789' }, userACookie);
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.body.success, true);
    const customerId = createRes.body.id;
    assert.ok(customerId);

    // 4b. Get Customers List
    const getRes = await api('GET', '/api/customers', undefined, userACookie);
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.customers.length >= 1);

    // 4c. Get Customer By ID
    const getByIdRes = await api('GET', `/api/customers/${customerId}`, undefined, userACookie);
    assert.strictEqual(getByIdRes.status, 200);
    assert.strictEqual(getByIdRes.body.customer.name, 'Customer Test');

    // 4d. Update Customer
    const updateRes = await api('PUT', `/api/customers/${customerId}`, { company: 'Acme Corp' }, userACookie);
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);

    // 4e. Add Customer Note
    const noteRes = await api('POST', `/api/customers/${customerId}/notes`, { content: 'Test note' }, userACookie);
    assert.strictEqual(noteRes.status, 201);
    const noteId = noteRes.body.id;
    assert.ok(noteId);

    // 4f. Delete Customer Note
    const deleteNoteRes = await api('DELETE', `/api/customers/${customerId}/notes/${noteId}`, undefined, userACookie);
    assert.strictEqual(deleteNoteRes.status, 200);

    // 4g. Toggle Block Customer
    const blockRes = await api('POST', `/api/customers/${customerId}/block`, undefined, userACookie);
    assert.strictEqual(blockRes.status, 200);

    // 4h. Delete Customer
    const deleteRes = await api('DELETE', `/api/customers/${customerId}`, undefined, userACookie);
    assert.strictEqual(deleteRes.status, 200);
  });

  it('5. Core AI Agents APIs: CRUD, Status Toggle, Playground Test', async () => {
    // 5a. Create AI Agent
    const createRes = await api('POST', '/api/ai-agents', { name: 'Support Bot', instructions: 'Help users' }, userACookie);
    assert.strictEqual(createRes.status, 201);
    const agentId = createRes.body.agent.id;
    assert.ok(agentId);

    // 5b. Get AI Agents List
    const getRes = await api('GET', '/api/ai-agents', undefined, userACookie);
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.agents.length >= 1);

    // 5c. Get AI Agent By ID
    const getByIdRes = await api('GET', `/api/ai-agents/${agentId}`, undefined, userACookie);
    assert.strictEqual(getByIdRes.status, 200);
    assert.strictEqual(getByIdRes.body.agent.name, 'Support Bot');

    // 5d. Update AI Agent
    const updateRes = await api('PUT', `/api/ai-agents/${agentId}`, { tone: 'Professional' }, userACookie);
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);

    // 5e. Toggle AI Agent Status
    const toggleRes = await api('POST', `/api/ai-agents/${agentId}/status`, { status: 'paused' }, userACookie);
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.body.status, 'paused');

    // 5f. Playground Test
    const testRes = await api('POST', `/api/ai-agents/${agentId}/test`, { message: 'Hello bot' }, userACookie);
    assert.strictEqual(testRes.status, 200);
    assert.ok(testRes.body.reply);

    // 5g. Delete AI Agent
    const deleteRes = await api('DELETE', `/api/ai-agents/${agentId}`, undefined, userACookie);
    assert.strictEqual(deleteRes.status, 200);
  });

  it('6. Core Knowledge Base APIs: Text, FAQ, RAG Search, Delete', async () => {
    // 6a. Create Text Knowledge Source
    const textRes = await api('POST', '/api/knowledge-base/text', { name: 'Company Policy', content: 'Our return policy is 30 days.' }, userACookie);
    assert.strictEqual(textRes.status, 201);
    const sourceId = textRes.body.id;
    assert.ok(sourceId);

    // 6b. Create FAQ Knowledge Source
    const faqRes = await api('POST', '/api/knowledge-base/faq', { name: 'Pricing FAQ', faqs: [{ question: 'Is it free?', answer: 'Yes' }] }, userACookie);
    assert.strictEqual(faqRes.status, 201);

    // 6c. Get Knowledge Sources List
    const getRes = await api('GET', '/api/knowledge-base', undefined, userACookie);
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.sources.length >= 2);

    // 6d. Search RAG
    const searchRes = await api('POST', '/api/knowledge-base/search', { query: 'return policy' }, userACookie);
    assert.strictEqual(searchRes.status, 200);
    assert.ok(Array.isArray(searchRes.body.results));

    // 6e. Delete Knowledge Source
    const deleteRes = await api('DELETE', `/api/knowledge-base/${sourceId}`, undefined, userACookie);
    assert.strictEqual(deleteRes.status, 200);
  });

  it('7. Core Channels APIs: Website Config, Test Connection, Public Widget', async () => {
    // 7a. Get Channels
    const getRes = await api('GET', '/api/channels', undefined, userACookie);
    assert.strictEqual(getRes.status, 200);
    assert.ok(Array.isArray(getRes.body.channels));
    const websiteChannel = getRes.body.channels.find((c: any) => c.type === 'website');
    assert.ok(websiteChannel);

    // 7b. Update Website Config
    const updateRes = await api('PUT', '/api/channels/website-config', { widgetTitle: 'Support Chat', primaryColor: '#2563EB' }, userACookie);
    assert.strictEqual(updateRes.status, 200);

    // 7c. Test Connection
    const testRes = await api('POST', `/api/channels/${websiteChannel.id}/test`, undefined, userACookie);
    assert.strictEqual(testRes.status, 200);

    // 7d. Public Widget Config (No auth required)
    const publicRes = await api('GET', `/api/channels/public-widget/${websiteChannel.id}`);
    assert.strictEqual(publicRes.status, 200);
    assert.ok(publicRes.body.workspaceName);
  });

  it('8. Core Analytics APIs: Overview & Export CSV', async () => {
    // 8a. Get Analytics Overview
    const res = await api('GET', '/api/analytics', undefined, userACookie);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.kpis);

    // 8b. Export CSV
    const csvRes = await api('GET', '/api/analytics/export.csv', undefined, userACookie);
    assert.strictEqual(csvRes.status, 200);
  });

  it('9. Core Settings APIs: Workspace & User Settings', async () => {
    // 9a. Workspace Settings
    const getWsRes = await api('GET', '/api/settings/workspace', undefined, userACookie);
    assert.strictEqual(getWsRes.status, 200);

    const updateWsRes = await api('PUT', '/api/settings/workspace', { name: 'Workspace A Updated' }, userACookie);
    assert.strictEqual(updateWsRes.status, 200);

    // 9b. User Settings Overview
    const getUserRes = await api('GET', '/api/settings/me', undefined, userACookie);
    assert.strictEqual(getUserRes.status, 200);

    // 9c. Update User Profile
    const updateProfileRes = await api('PUT', '/api/settings/profile', { name: 'User A Updated' }, userACookie);
    assert.strictEqual(updateProfileRes.status, 200);
  });
});
