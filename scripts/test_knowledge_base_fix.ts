import assert from 'node:assert/strict';
import crypto from 'crypto';
import { createRequire } from 'module';
import { db } from '../server/db.js';
import {
  getKnowledgeSources,
  uploadDocumentKnowledge,
  performRagSearch,
} from '../server/knowledgeController.js';

const require = createRequire(import.meta.url);
const PDFDocument = require('pdfkit');

async function createSamplePdfBuffer(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', (b: Buffer) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    doc.text(text);
    doc.end();
  });
}

async function runTests() {
  console.log('--- STARTING KNOWLEDGE BASE VERIFICATION ---');

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const wsId = crypto.randomUUID();

  // 1. Create a fresh User and Workspace
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at, updated_at, last_login_at)
    VALUES (?, 'KB Tester', ?, 'hash', ?, ?, ?)
  `).run(userId, `kb_tester_${Date.now()}@example.com`, now, now, now);

  db.prepare(`
    INSERT INTO workspaces (id, name, slug, user_id, created_at, updated_at)
    VALUES (?, 'Fresh Tester Workspace', ?, ?, ?, ?)
  `).run(wsId, `fresh-tester-${Date.now()}`, userId, now, now);

  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
  `).run(crypto.randomUUID(), wsId, userId, now, now, now);

  // 2. Test: Real Account / New Workspace starts fresh (0 sources)
  let mockResJson: any = null;
  let mockStatus = 200;
  const mockRes = {
    status: (code: number) => { mockStatus = code; return mockRes; },
    json: (data: any) => { mockResJson = data; return mockRes; },
  };

  await getKnowledgeSources(
    { user: { id: userId, name: 'KB Tester', email: 'test@example.com' }, query: { workspaceId: wsId } } as any,
    mockRes as any
  );

  assert.strictEqual(mockStatus, 200);
  assert.strictEqual(mockResJson.sources.length, 0, 'Fresh workspace must have 0 sources (no auto-seeding)');
  assert.strictEqual(mockResJson.stats.total, 0);
  console.log('✅ 1. Fresh Workspace Verified: 0 dummy sources loaded.');

  // 3. Test: Real PDF Upload & Text Extraction
  const pdfSampleContent = 'iSoak Portfolio Projects Documentation: Includes full-stack Next.js and AI customer support concierges with custom RAG integration.';
  const pdfBuffer = await createSamplePdfBuffer(pdfSampleContent);
  const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

  let uploadResJson: any = null;
  let uploadStatus = 200;
  const mockUploadRes = {
    status: (code: number) => { uploadStatus = code; return mockUploadRes; },
    json: (data: any) => { uploadResJson = data; return mockUploadRes; },
  };

  await uploadDocumentKnowledge(
    {
      user: { id: userId, name: 'KB Tester', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: {
        fileName: 'iSoak_Portfolio_Projects_Documentation.pdf',
        fileType: 'PDF',
        fileBase64: pdfBase64,
      },
    } as any,
    mockUploadRes as any
  );

  assert.strictEqual(uploadStatus, 201, `Upload status should be 201, got ${uploadStatus}`);
  assert.ok(uploadResJson.success);
  assert.ok(uploadResJson.chunkCount >= 1);
  assert.ok(uploadResJson.textLength > 30);
  console.log(`✅ 2. PDF Parsing & Extraction Verified: extracted ${uploadResJson.textLength} chars, created ${uploadResJson.chunkCount} vector chunks.`);

  // 4. Test: Stored Content Verification in DB
  const storedSource = db.prepare('SELECT * FROM knowledge_sources WHERE id = ?').get(uploadResJson.id) as any;
  assert.ok(storedSource, 'Knowledge source must exist in database');
  assert.ok(storedSource.content.includes('iSoak Portfolio Projects'), 'Extracted PDF text must be in content');

  const storedChunks = db.prepare('SELECT * FROM knowledge_chunks WHERE source_id = ?').all(uploadResJson.id) as any[];
  assert.ok(storedChunks.length >= 1, 'Vector chunks must be persisted in database');
  assert.ok(storedChunks[0].text.includes('iSoak'), 'Vector chunk text must contain document text');
  console.log('✅ 3. Database Persistence Verified: Source and Chunks contain actual document text.');

  // 5. Test: RAG Semantic Search on Uploaded Document Content
  const ragResults = performRagSearch(wsId, 'iSoak portfolio concierges', 3);
  assert.ok(ragResults.length >= 1, 'RAG search must find chunks for matching query');
  assert.ok(ragResults[0].text.includes('iSoak'));
  assert.ok(ragResults[0].similarityScore > 60, `Similarity score should be high, got ${ragResults[0].similarityScore}`);
  console.log(`✅ 4. RAG Retrieval Verified: matched "${ragResults[0].sourceName}" with score ${ragResults[0].similarityScore}%.`);

  // 6. Test: Irrelevant Query should return empty
  const irrelevantResults = performRagSearch(wsId, 'astrophysics telescope quantum', 3);
  assert.strictEqual(irrelevantResults.length, 0, 'Irrelevant query should return 0 chunks');
  console.log('✅ 5. RAG Relevance Filter Verified: zero false positive chunks returned for irrelevant query.');

  // 7. Test: Text file upload
  let txtResJson: any = null;
  let txtStatus = 200;
  const mockTxtRes = {
    status: (code: number) => { txtStatus = code; return mockTxtRes; },
    json: (data: any) => { txtResJson = data; return mockTxtRes; },
  };

  await uploadDocumentKnowledge(
    {
      user: { id: userId, name: 'KB Tester', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: {
        fileName: 'Return_Policy.txt',
        fileType: 'TXT',
        fileDataText: 'Items can be returned within 45 days of purchase for a full refund.',
      },
    } as any,
    mockTxtRes as any
  );
  assert.strictEqual(txtStatus, 201);
  console.log('✅ 6. Text Document Upload Verified.');

  // 8. Test: Empty content validation
  let errResJson: any = null;
  let errStatus = 200;
  const mockErrRes = {
    status: (code: number) => { errStatus = code; return mockErrRes; },
    json: (data: any) => { errResJson = data; return mockErrRes; },
  };

  await uploadDocumentKnowledge(
    {
      user: { id: userId, name: 'KB Tester', email: 'test@example.com' },
      query: { workspaceId: wsId },
      body: {
        fileName: 'Empty.txt',
        fileType: 'TXT',
        fileDataText: '   ',
      },
    } as any,
    mockErrRes as any
  );
  assert.strictEqual(errStatus, 400);
  assert.ok(errResJson.error.includes('No readable text'));
  console.log('✅ 7. Empty Document Validation Verified: cleanly rejected with helpful error.');

  console.log('--- ALL KNOWLEDGE BASE TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
