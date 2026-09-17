import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, DbWorkspace } from './db.js';
import { deleteWorkspace } from './workspaceSettingsController.js';
import { AuthRequest } from './authMiddleware.js';

describe('Workspace Deletion Backend Unit Tests', () => {
  const ownerUserId = `user_del_owner_${crypto.randomUUID()}`;
  const memberUserId = `user_del_member_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const ws1Id = `ws_main_${crypto.randomUUID()}`;
  const ws2Id = `ws_delete_target_${crypto.randomUUID()}`;

  // Helper mock response
  function createMockRes() {
    return {
      statusCode: 200,
      jsonPayload: null as any,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.jsonPayload = data;
        return this;
      },
    };
  }

  it('Setup: creates users, 2 workspaces, dependent resources for ws2, and member relationships', () => {
    // 1. Insert owner user
    db.prepare(`
      INSERT INTO users (id, name, email, auth_provider, email_verified, onboarding_completed, created_at, updated_at, last_login_at)
      VALUES (?, 'Owner User', ?, 'local', 1, 1, ?, ?, ?)
    `).run(ownerUserId, `${ownerUserId}@example.com`, now, now, now);

    // 2. Insert member user
    db.prepare(`
      INSERT INTO users (id, name, email, auth_provider, email_verified, onboarding_completed, created_at, updated_at, last_login_at)
      VALUES (?, 'Member User', ?, 'local', 1, 1, ?, ?, ?)
    `).run(memberUserId, `${memberUserId}@example.com`, now, now, now);

    // 3. Insert ws1 (Primary Workspace)
    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at)
      VALUES (?, ?, 'Primary Workspace', ?, ?, ?)
    `).run(ws1Id, ownerUserId, `primary-${crypto.randomBytes(2).toString('hex')}`, now, now);

    // 4. Insert ws2 (Target Workspace to delete)
    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at)
      VALUES (?, ?, 'Workspace to Delete', ?, ?, ?)
    `).run(ws2Id, ownerUserId, `to-delete-${crypto.randomBytes(2).toString('hex')}`, now, now);

    // 5. Insert owner membership for ws1 and ws2
    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), ws1Id, ownerUserId, now, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), ws2Id, ownerUserId, now, now, now);

    // 6. Insert memberUser as regular 'member' in ws2
    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'member', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), ws2Id, memberUserId, now, now, now);

    // 7. Seed dependent records in ws2
    // AI Assistant
    db.prepare(`
      INSERT INTO ai_assistants (id, workspace_id, name, created_at, updated_at)
      VALUES (?, ?, 'Test Bot', ?, ?)
    `).run(crypto.randomUUID(), ws2Id, now, now);

    // Channel
    db.prepare(`
      INSERT INTO channels (id, workspace_id, type, name, status, provider, created_at, updated_at)
      VALUES (?, ?, 'website', 'Web Chat', 'connected', 'custom', ?, ?)
    `).run(crypto.randomUUID(), ws2Id, now, now);

    // Conversation & Message
    const convId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO conversations (id, workspace_id, customer_name, last_message, created_at, updated_at)
      VALUES (?, ?, 'Alice Test', 'Hello', ?, ?)
    `).run(convId, ws2Id, now, now);

    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, content, created_at)
      VALUES (?, ?, 'customer', 'Hello world', ?)
    `).run(crypto.randomUUID(), convId, now);

    // Verify setup
    const ownerWsList = db.prepare('SELECT * FROM workspaces WHERE user_id = ?').all(ownerUserId) as DbWorkspace[];
    assert.equal(ownerWsList.length, 2, 'Owner should have 2 workspaces');
  });

  it('1. Non-owner user cannot delete workspace (403 Forbidden)', async () => {
    const mockReq = {
      user: { id: memberUserId, email: `${memberUserId}@example.com` },
      query: { workspaceId: ws2Id },
    } as unknown as AuthRequest;
    const mockRes = createMockRes();

    await deleteWorkspace(mockReq, mockRes as any);

    assert.equal(mockRes.statusCode, 403, 'Should return 403 Forbidden for non-owner');
    assert.match(mockRes.jsonPayload.error, /Only the workspace owner can delete/);
  });

  it('2. User cannot delete their only remaining workspace (400 Bad Request)', async () => {
    // Single workspace user
    const soloUserId = `user_solo_${crypto.randomUUID()}`;
    const soloWsId = `ws_solo_${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO users (id, name, email, auth_provider, email_verified, onboarding_completed, created_at, updated_at, last_login_at)
      VALUES (?, 'Solo User', ?, 'local', 1, 1, ?, ?, ?)
    `).run(soloUserId, `${soloUserId}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at)
      VALUES (?, ?, 'Solo Workspace', ?, ?, ?)
    `).run(soloWsId, soloUserId, `solo-${crypto.randomBytes(2).toString('hex')}`, now, now);

    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), soloWsId, soloUserId, now, now, now);

    const mockReq = {
      user: { id: soloUserId, email: `${soloUserId}@example.com` },
      query: { workspaceId: soloWsId },
    } as unknown as AuthRequest;
    const mockRes = createMockRes();

    await deleteWorkspace(mockReq, mockRes as any);

    assert.equal(mockRes.statusCode, 400, 'Should return 400 when attempting to delete only workspace');
    assert.match(mockRes.jsonPayload.error, /Cannot delete your only remaining workspace/);
  });

  it('3. Owner can delete target workspace when multiple exist (200 OK)', async () => {
    const mockReq = {
      user: { id: ownerUserId, email: `${ownerUserId}@example.com` },
      query: { workspaceId: ws2Id },
    } as unknown as AuthRequest;
    const mockRes = createMockRes();

    await deleteWorkspace(mockReq, mockRes as any);

    assert.equal(mockRes.statusCode, 200, 'Should return 200 OK on successful deletion');
    assert.equal(mockRes.jsonPayload.success, true);
  });

  it('4. Dependent resources of deleted workspace are cleanly purged from DB', () => {
    // Verify workspace record is gone
    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(ws2Id);
    assert.equal(ws, undefined, 'Workspace row must be deleted');

    // Verify AI assistants in ws2 are gone
    const aiList = db.prepare('SELECT * FROM ai_assistants WHERE workspace_id = ?').all(ws2Id);
    assert.equal(aiList.length, 0, 'AI assistants must be purged');

    // Verify channels in ws2 are gone
    const chList = db.prepare('SELECT * FROM channels WHERE workspace_id = ?').all(ws2Id);
    assert.equal(chList.length, 0, 'Channels must be purged');

    // Verify conversations in ws2 are gone
    const convList = db.prepare('SELECT * FROM conversations WHERE workspace_id = ?').all(ws2Id);
    assert.equal(convList.length, 0, 'Conversations must be purged');

    // Verify memberships in ws2 are gone
    const memList = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ?').all(ws2Id);
    assert.equal(memList.length, 0, 'Memberships must be purged');

    // Verify owner still has Primary Workspace (ws1)
    const remainingWs = db.prepare('SELECT * FROM workspaces WHERE user_id = ?').all(ownerUserId) as DbWorkspace[];
    assert.equal(remainingWs.length, 1, 'Owner should still have 1 remaining workspace');
    assert.equal(remainingWs[0].id, ws1Id, 'Remaining workspace must be ws1');
  });
});
