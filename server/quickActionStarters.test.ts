import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { db, DbKnowledgeSource, DbKnowledgeChunk } from './db.js';
import { generateQuickActionStarters } from './channelController.js';

describe('Quick Action Buttons Auto-Generation Tests', () => {
  const testUserId = `user_starters_${crypto.randomUUID()}`;
  const wsId = `ws_starters_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  it('Setup: creates test user and workspace', () => {
    db.prepare(`
      INSERT INTO users (id, name, email, auth_provider, email_verified, onboarding_completed, created_at, updated_at, last_login_at)
      VALUES (?, 'Starters Test User', ?, 'local', 1, 1, ?, ?, ?)
    `).run(testUserId, `${testUserId}@example.com`, now, now, now);

    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at)
      VALUES (?, ?, 'Starters Coffee Roasters', ?, ?, ?)
    `).run(wsId, testUserId, `starters-${crypto.randomBytes(2).toString('hex')}`, now, now);
  });

  it('1. Generates 4 quick action starters from active workspace knowledge source', async () => {
    // Insert a coffee shop knowledge source into this workspace
    const sourceId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO knowledge_sources (id, workspace_id, name, type, status, content, original_url, file_metadata, chunk_count, created_by, created_at, updated_at)
      VALUES (?, ?, 'Coffee Menu & Policies', 'Document', 'ready', ?, NULL, '{}', 1, 'Test', ?, ?)
    `).run(
      sourceId,
      wsId,
      `Brew & Bean Specialty Coffee. We serve espresso, pour-overs, pastries, and signature roasted beans.
Opening hours are Monday to Sunday 7am to 8pm.
You can track orders online or place takeout orders.`,
      now,
      now
    );

    let responseData: any = null;
    let statusCode = 200;

    const mockReq: any = {
      user: { id: testUserId, name: 'Starters Test User', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: { sourceId },
    };

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
    };

    await generateQuickActionStarters(mockReq, mockRes);

    assert.equal(statusCode, 200, 'Must return HTTP 200');
    assert.ok(responseData.success, 'Success must be true');
    assert.equal(responseData.starters.length, 4, 'Must generate exactly 4 conversation starters');
    assert.ok(responseData.starters[0].label, 'Starter must have label');
    assert.ok(responseData.starters[0].prompt, 'Starter must have prompt');
    assert.equal(responseData.sourceName, 'Coffee Menu & Policies');
  });

  it('2. Generates starters from uploaded document text and saves to Knowledge Base when requested', async () => {
    const fileText = `Acme Dental & Wellness Clinic.
We offer teeth cleaning, braces, root canals, and cosmetic dentistry.
Clinic hours: Monday-Friday 9am to 6pm.
Call emergency line for weekend appointments.
Consultation fees start at $50. We accept major dental insurances.`;

    const fileName = 'Clinic_Services_Guide.txt';

    let responseData: any = null;
    let statusCode = 200;

    const mockReq: any = {
      user: { id: testUserId, name: 'Starters Test User', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: {
        fileText,
        fileName,
        saveToKnowledgeBase: true,
      },
    };

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
    };

    await generateQuickActionStarters(mockReq, mockRes);

    assert.equal(statusCode, 200, 'Must return HTTP 200');
    assert.ok(responseData.success, 'Success must be true');
    assert.equal(responseData.starters.length, 4, 'Must return 4 starters');
    assert.ok(responseData.savedToKnowledgeBase, 'savedToKnowledgeBase must be true');

    // Verify it was saved to knowledge_sources
    const saved = db.prepare('SELECT * FROM knowledge_sources WHERE workspace_id = ? AND name = ?').get(wsId, fileName) as DbKnowledgeSource | undefined;
    assert.ok(saved, 'Document must be persisted in knowledge_sources');
    assert.equal(saved?.name, fileName);
    assert.ok(saved && saved.chunk_count > 0, 'Must have generated chunks');

    // Verify chunks exist
    const chunks = db.prepare('SELECT * FROM knowledge_chunks WHERE source_id = ?').all(saved.id) as DbKnowledgeChunk[];
    assert.ok(chunks.length > 0, 'Knowledge chunks must be created in DB');
  });

  it('3. Generates starters from explicit FAQ questions in text', async () => {
    const faqText = `
Q: How do I track my delivery?
You can track using your tracking number sent via email.

Q: What is your refund policy?
We offer 30-day money back guarantee for all orders.

Q: Do you offer international shipping?
Yes, we ship to over 50 countries worldwide.

Q: How can I contact human support?
You can email support@example.com or use live chat.
`;

    let responseData: any = null;
    let statusCode = 200;

    const mockReq: any = {
      user: { id: testUserId, name: 'Starters Test User', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: {
        fileText: faqText,
        fileName: 'Company_FAQs.md',
        saveToKnowledgeBase: false,
      },
    };

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
    };

    await generateQuickActionStarters(mockReq, mockRes);

    assert.equal(statusCode, 200, 'Must return HTTP 200');
    assert.ok(responseData.success, 'Success must be true');
    assert.equal(responseData.starters.length, 4, 'Must return 4 starters extracted from FAQs');
    assert.ok(responseData.starters.some((s: any) => s.prompt.includes('track') || s.prompt.includes('delivery')));
  });

  it('4. Enforces workspace isolation (cannot access another workspace knowledge)', async () => {
    // Another workspace
    const otherWsId = `ws_other_${crypto.randomUUID()}`;
    const otherSourceId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at)
      VALUES (?, 'another_user', 'Other Company', ?, ?, ?)
    `).run(otherWsId, `other-co-${crypto.randomUUID()}`, now, now);

    db.prepare(`
      INSERT INTO knowledge_sources (id, workspace_id, name, type, status, content, original_url, file_metadata, chunk_count, created_by, created_at, updated_at)
      VALUES (?, ?, 'Secret Docs', 'Document', 'ready', 'Confidential', NULL, '{}', 1, 'Other', ?, ?)
    `).run(otherSourceId, otherWsId, now, now);

    let responseData: any = null;
    let statusCode = 200;

    // Test user tries to pass otherSourceId while in their own workspace
    const mockReq: any = {
      user: { id: testUserId, name: 'Starters Test User', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: { sourceId: otherSourceId },
    };

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
    };

    await generateQuickActionStarters(mockReq, mockRes);

    assert.equal(statusCode, 200);
    // Should NOT use Secret Docs, should fallback to test user's own sources
    assert.notEqual(responseData.sourceName, 'Secret Docs', 'Must not leak other workspace knowledge source');
  });
});
