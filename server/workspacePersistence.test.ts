import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db, DbWorkspace } from './db.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';
import { authenticateToken } from './authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xia_chat_dev_jwt_secret_key_8f9a2b7c4d1e';

describe('Workspace Context & Persistence Regression Tests', () => {
  const testUserId = `user_test_${crypto.randomUUID()}`;
  const now = new Date();
  const olderDate = new Date(now.getTime() - 100000).toISOString();
  const newerDate = now.toISOString();

  const ws1Id = `ws_htwtd_${crypto.randomUUID()}`;
  const ws2Id = `ws_anizwiz_${crypto.randomUUID()}`;

  // Setup test user and two workspaces in database
  it('Setup: provisions test user with Workspace A (Anizwiz) and Workspace B (Htwtd Workspace)', () => {
    // Insert test user
    db.prepare(`
      INSERT INTO users (id, name, email, auth_provider, email_verified, onboarding_completed, created_at, updated_at, last_login_at)
      VALUES (?, 'Htwtd Test', ?, 'local', 1, 1, ?, ?, ?)
    `).run(testUserId, `${testUserId}@example.com`, olderDate, olderDate, olderDate);

    // Insert Workspace 1 (Older: "Htwtd's Workspace")
    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at)
      VALUES (?, ?, 'Htwtd''s Workspace', ?, ?, ?)
    `).run(ws1Id, testUserId, `htwtd-${crypto.randomBytes(2).toString('hex')}`, olderDate, olderDate);

    // Insert Workspace 2 (Newer: "Anizwiz")
    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at)
      VALUES (?, ?, 'Anizwiz', ?, ?, ?)
    `).run(ws2Id, testUserId, `anizwiz-${crypto.randomBytes(2).toString('hex')}`, newerDate, newerDate);

    // Verify both exist
    const list = db.prepare('SELECT * FROM workspaces WHERE user_id = ?').all(testUserId) as DbWorkspace[];
    assert.equal(list.length, 2, 'User must have exactly 2 workspaces');
  });

  it('1. Default fallback without workspaceId returns older workspace (reproducing root cause)', () => {
    const ws = getWorkspaceForUser(testUserId);
    assert.ok(ws, 'Workspace must be found');
    assert.equal(ws.id, ws1Id, 'Without requested ID, defaults to older workspace (Htwtd)');
    assert.equal(ws.name, "Htwtd's Workspace");
  });

  it('2. Explicit workspaceId request returns Workspace A (Anizwiz)', () => {
    const ws = getWorkspaceForUser(testUserId, ws2Id);
    assert.ok(ws, 'Workspace must be found');
    assert.equal(ws.id, ws2Id, 'When ws2Id requested, must return Workspace A (Anizwiz)');
    assert.equal(ws.name, 'Anizwiz');
  });

  it('3. authenticateToken middleware resolves X-Workspace-Id header into req.query.workspaceId', (t, done) => {
    const token = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: '1h' });

    const mockReq: any = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-workspace-id': ws2Id,
      },
      query: {},
      cookies: {},
    };

    const mockRes: any = {
      status: (code: number) => ({
        json: (data: any) => {
          done(new Error(`Unexpected status ${code}: ${JSON.stringify(data)}`));
        },
      }),
      clearCookie: () => {},
    };

    authenticateToken(mockReq, mockRes, () => {
      // Middleware should have resolved req.query.workspaceId from X-Workspace-Id header
      assert.equal(mockReq.query.workspaceId, ws2Id, 'req.query.workspaceId must match X-Workspace-Id');
      assert.equal(mockReq.user.id, testUserId, 'Authenticated user ID must match');

      // Now verify getWorkspaceForUser resolves the correct workspace using the query param populated from header
      const activeWs = getWorkspaceForUser(mockReq.user.id, mockReq.query.workspaceId);
      assert.ok(activeWs);
      assert.equal(activeWs.id, ws2Id);
      assert.equal(activeWs.name, 'Anizwiz');
      done();
    });
  });

  it('4. Explicit query param workspaceId takes precedence over X-Workspace-Id header', (t, done) => {
    const token = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: '1h' });

    const mockReq: any = {
      headers: {
        authorization: `Bearer ${token}`,
        'x-workspace-id': ws1Id,
      },
      query: {
        workspaceId: ws2Id,
      },
      cookies: {},
    };

    const mockRes: any = {
      status: () => ({ json: () => {} }),
      clearCookie: () => {},
    };

    authenticateToken(mockReq, mockRes, () => {
      assert.equal(mockReq.query.workspaceId, ws2Id, 'Explicit query param must not be overwritten');
      done();
    });
  });
});
