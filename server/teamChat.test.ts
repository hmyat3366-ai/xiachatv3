import { describe, it } from 'node:test';
import assert from 'node:assert';
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

describe('Team Chat Module Integration Tests', () => {
  let cookieOwner: string;

  it('1. User Setup and Login as Workspace Owner', async () => {
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const email = `owner_chat_${Date.now()}@example.com`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'Owner Chat User', email, 'hash', now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(workspaceId, 'Chat WS', `chat-ws-${Date.now()}`, userId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), workspaceId, userId, now, now, now);

    cookieOwner = createAuthCookie(userId);
    assert.ok(cookieOwner, 'Cookie header should be set');
  });

  it('2. Fetch Team Chat Workspace Members', async () => {
    const res = await api('GET', '/api/team-chat/workspace-members', undefined, cookieOwner);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.members));
  });

  it('3. Fetch Team Chat Conversations (Initially empty)', async () => {
    const res = await api('GET', '/api/team-chat/conversations', undefined, cookieOwner);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.conversations));
  });

  it('4. Create Self DM Conversation', async () => {
    const membersRes = await api('GET', '/api/team-chat/workspace-members', undefined, cookieOwner);
    const ownerId = membersRes.body.members[0].id;

    const createRes = await api(
      'POST',
      '/api/team-chat/conversations',
      { recipientUserId: ownerId },
      cookieOwner
    );
    assert.strictEqual(createRes.status, 201);
    assert.ok(createRes.body.conversationId);
  });

  it('5. Post and Get Messages in Team Chat Conversation', async () => {
    const convsRes = await api('GET', '/api/team-chat/conversations', undefined, cookieOwner);
    assert.strictEqual(convsRes.status, 200);
    const convId = convsRes.body.conversations[0].id;

    const postRes = await api(
      'POST',
      `/api/team-chat/conversations/${convId}/messages`,
      { content: 'Hello internal team!' },
      cookieOwner
    );
    assert.strictEqual(postRes.status, 201);
    assert.strictEqual(postRes.body.message.content, 'Hello internal team!');

    const getRes = await api(
      'GET',
      `/api/team-chat/conversations/${convId}/messages`,
      undefined,
      cookieOwner
    );
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.messages.length >= 1);
  });

  it('6. Check Unread Count', async () => {
    const res = await api('GET', '/api/team-chat/unread-count', undefined, cookieOwner);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.body.unreadCount, 'number');
  });

  it('7. Unauthenticated User Access Denied', async () => {
    const res = await api('GET', '/api/team-chat/conversations');
    assert.strictEqual(res.status, 401);
  });
});
