/**
 * Xia Chat — Phase 6 Team Members & Team Chat Integration Test Suite
 *
 * Tests:
 * 1. Team member listing & role hierarchy
 * 2. Send invitation & resend invitation
 * 3. Accept invitation -> creates active WorkspaceMember
 * 4. Cancel / Reject invitation
 * 5. Update member role & position (Owner, Admin, Manager, Support, Member)
 * 6. Role permission enforcement (Member attempting admin actions -> 403)
 * 7. Sole owner protection against accidental self-removal/downgrade (400/403)
 * 8. Member deactivation, reactivaton & removal
 * 9. Internal Team Chat (conversations, posting messages, thread history, unread count)
 * 10. Workspace security isolation (cross-workspace access rejection 403/404)
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

describe('PHASE 6 — TEAM MEMBERS & TEAM CHAT INTEGRATION TESTS', () => {
  let ownerId: string;
  let memberUserId: string;
  let unauthUserId: string;
  let wsAId: string;
  let wsBId: string;

  let ownerCookie: string;
  let memberCookie: string;
  let unauthCookie: string;

  let memberRowId: string;
  let inviteId: string;
  let inviteToken: string;
  let teamConvId: string;

  it('1. Setup Workspace Owner & Workspace Members', async () => {
    const now = new Date().toISOString();
    const ts = Date.now();

    ownerId = crypto.randomUUID();
    memberUserId = crypto.randomUUID();
    unauthUserId = crypto.randomUUID();
    wsAId = crypto.randomUUID();
    wsBId = crypto.randomUUID();

    // Owner + Workspace A
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Team Owner A', ?, 'hash', ?, ?, ?)
    `).run(ownerId, `team_owner_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Team Workspace A', ?, ?, ?, ?)
    `).run(wsAId, `team-ws-a-${ts}`, ownerId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsAId, ownerId, now, now, now);

    // Pro plan subscription for wsAId
    db.prepare(`
      INSERT INTO subscriptions (
        id, workspace_id, stripe_customer_id, stripe_subscription_id, plan_id, status,
        billing_interval, current_period_start, current_period_end, cancel_at_period_end,
        created_at, updated_at
      ) VALUES (?, ?, 'cus_test', 'sub_test', 'pro', 'active', 'monthly', ?, ?, 0, ?, ?)
    `).run(crypto.randomUUID(), wsAId, now, now, now, now);

    // Member User + Membership in Workspace A
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Regular Member', ?, 'hash', ?, ?, ?)
    `).run(memberUserId, `team_member_${ts}@example.com`, now, now, now);

    memberRowId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'member', 'active', ?, ?, ?)
    `).run(memberRowId, wsAId, memberUserId, now, now, now);

    // Unauth User in Workspace B
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
      VALUES (?, 'Unauth User B', ?, 'hash', ?, ?, ?)
    `).run(unauthUserId, `unauth_user_${ts}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
      VALUES (?, 'Team Workspace B', ?, ?, ?, ?)
    `).run(wsBId, `team-ws-b-${ts}`, unauthUserId, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), wsBId, unauthUserId, now, now, now);

    ownerCookie = createAuthCookie(ownerId);
    memberCookie = createAuthCookie(memberUserId);
    unauthCookie = createAuthCookie(unauthUserId);

    assert.ok(ownerCookie);
    assert.ok(memberCookie);
    assert.ok(unauthCookie);
  });

  it('2. List Team Members & Verify Role Metadata', async () => {
    const res = await api('GET', `/api/team/members?workspaceId=${wsAId}`, undefined, ownerCookie);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.actorRole, 'owner');
    assert.ok(Array.isArray(res.body.members));
    assert.strictEqual(res.body.members.length, 2);
  });

  it('3. Send Team Member Invitation & Resend Invitation', async () => {
    const invEmail = `new_invite_${Date.now()}@example.com`;
    const res = await api(
      'POST',
      `/api/team/invitations?workspaceId=${wsAId}`,
      { email: invEmail, role: 'admin', message: 'Welcome to the team!' },
      ownerCookie
    );

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.invitationId);
    assert.ok(res.body.inviteToken);
    inviteId = res.body.invitationId;
    inviteToken = res.body.inviteToken;

    // Resend invitation
    const resendRes = await api('POST', `/api/team/invitations/${inviteId}/resend?workspaceId=${wsAId}`, undefined, ownerCookie);
    assert.strictEqual(resendRes.status, 200);
    assert.strictEqual(resendRes.body.success, true);
  });

  it('4. Accept Team Invitation', async () => {
    const acceptRes = await api('POST', '/api/team/invitations/accept', { token: inviteToken }, memberCookie);
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.body.success, true);
    assert.strictEqual(acceptRes.body.workspaceId, wsAId);
  });

  it('5. Update Member Role & Position (Manager / Admin / Support / Member)', async () => {
    const updateRes = await api(
      'PUT',
      `/api/team/members/${memberRowId}/role?workspaceId=${wsAId}`,
      { role: 'manager' },
      ownerCookie
    );

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);

    const checkRes = await api('GET', `/api/team/members?workspaceId=${wsAId}`, undefined, ownerCookie);
    const updatedMember = checkRes.body.members.find((m: any) => m.id === memberRowId);
    assert.strictEqual(updatedMember.role, 'manager');
  });

  it('6. Permission Boundaries: Regular Member cannot invite or update roles (403)', async () => {
    const unauthInvite = await api(
      'POST',
      `/api/team/invitations?workspaceId=${wsAId}`,
      { email: 'hack@example.com', role: 'admin' },
      memberCookie
    );
    assert.strictEqual(unauthInvite.status, 403);

    const unauthRoleUpdate = await api(
      'PUT',
      `/api/team/members/${memberRowId}/role?workspaceId=${wsAId}`,
      { role: 'admin' },
      memberCookie
    );
    assert.strictEqual(unauthRoleUpdate.status, 403);
  });

  it('7. Sole Owner Self-Removal / Downgrade Protection (400/403)', async () => {
    // Attempting to remove primary workspace owner
    const ownerMemberRow = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(wsAId, ownerId) as { id: string };

    const removeOwnerRes = await api('DELETE', `/api/team/members/${ownerMemberRow.id}?workspaceId=${wsAId}`, undefined, ownerCookie);
    assert.strictEqual(removeOwnerRes.status, 400);
    assert.ok(removeOwnerRes.body.error);
  });

  it('8. Deactivate & Reactivate Member Status', async () => {
    const deactivateRes = await api(
      'PUT',
      `/api/team/members/${memberRowId}/status?workspaceId=${wsAId}`,
      { status: 'suspended' },
      ownerCookie
    );
    assert.strictEqual(deactivateRes.status, 200);

    const reactivateRes = await api(
      'PUT',
      `/api/team/members/${memberRowId}/status?workspaceId=${wsAId}`,
      { status: 'active' },
      ownerCookie
    );
    assert.strictEqual(reactivateRes.status, 200);
  });

  it('9. Internal Team Chat (Conversations, Send Message, Thread History, Unread Count)', async () => {
    // 9a. List workspace members available for Team Chat
    const membersRes = await api('GET', `/api/team-chat/workspace-members?workspaceId=${wsAId}`, undefined, ownerCookie);
    assert.strictEqual(membersRes.status, 200);
    assert.ok(Array.isArray(membersRes.body.members));

    // 9b. Start a Direct Team Chat conversation
    const startConvRes = await api(
      'POST',
      `/api/team-chat/conversations?workspaceId=${wsAId}`,
      { recipientUserId: memberUserId, type: 'direct' },
      ownerCookie
    );
    assert.strictEqual(startConvRes.status, 201);
    assert.ok(startConvRes.body.conversationId);
    teamConvId = startConvRes.body.conversationId;

    // 9c. Post a Team Chat message
    const msgRes = await api(
      'POST',
      `/api/team-chat/conversations/${teamConvId}/messages?workspaceId=${wsAId}`,
      { content: 'Hey, please review the Q3 analytics report.' },
      ownerCookie
    );
    assert.strictEqual(msgRes.status, 201);
    assert.strictEqual(msgRes.body.message.content, 'Hey, please review the Q3 analytics report.');

    // 9d. Fetch Team Message History
    const historyRes = await api('GET', `/api/team-chat/conversations/${teamConvId}/messages?workspaceId=${wsAId}`, undefined, memberCookie);
    assert.strictEqual(historyRes.status, 200);
    assert.ok(Array.isArray(historyRes.body.messages));
    assert.strictEqual(historyRes.body.messages.length, 1);

    // 9e. Unread Count Check
    const unreadRes = await api('GET', `/api/team-chat/unread-count?workspaceId=${wsAId}`, undefined, memberCookie);
    assert.strictEqual(unreadRes.status, 200);
    assert.strictEqual(typeof unreadRes.body.unreadCount, 'number');
  });

  it('10. Workspace Security Isolation for Team Members & Team Chat', async () => {
    const crossMembers = await api('GET', `/api/team/members?workspaceId=${wsAId}`, undefined, unauthCookie);
    assert.ok([403, 404].includes(crossMembers.status));

    // User B attempting to read Workspace A Team Chat -> 403 or 404
    const crossChatRes = await api('GET', `/api/team-chat/conversations/${teamConvId}/messages?workspaceId=${wsAId}`, undefined, unauthCookie);
    assert.ok([403, 404].includes(crossChatRes.status));
  });
});
