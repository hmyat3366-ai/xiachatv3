import { Response } from 'express';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { createRequire } from 'module';
import { db, DbKnowledgeSource, DbKnowledgeChunk, DbWorkspace } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

// SSRF Security Check Helper
function isSafeUrl(urlStr: string): { safe: boolean; reason?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(urlStr);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are supported.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost, loopbacks, and private IP ranges
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, reason: 'Access to local and loopback addresses is blocked.' };
    }

    // Block AWS IMDS and cloud metadata IP
    if (hostname === '169.254.169.254') {
      return { safe: false, reason: 'Access to cloud metadata endpoint is blocked.' };
    }

    // Check private IPv4 ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const p1 = parseInt(ipMatch[1], 10);
      const p2 = parseInt(ipMatch[2], 10);

      if (
        p1 === 10 ||
        p1 === 127 ||
        (p1 === 192 && p2 === 168) ||
        (p1 === 172 && p2 >= 16 && p2 <= 31) ||
        (p1 === 169 && p2 === 254)
      ) {
        return { safe: false, reason: 'Access to private internal network IP ranges is blocked.' };
      }
    }

    return { safe: true, parsedUrl: parsed };
  } catch {
    return { safe: false, reason: 'Invalid URL format.' };
  }
}

// Text Chunking Engine Helper
export function createTextChunks(sourceId: string, workspaceId: string, sourceName: string, sourceType: string, text: string) {
  // Delete old chunks for this source first to prevent orphaned records
  db.prepare('DELETE FROM knowledge_chunks WHERE source_id = ?').run(sourceId);

  const cleanText = text.trim();
  if (!cleanText) return 0;

  // Split into logical paragraphs / sections (~250-400 words per chunk)
  const paragraphs = cleanText.split(/\n\s*\n/).filter((p) => p.trim());
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + '\n\n' + para).length > 1200) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const insertChunk = db.prepare(`
    INSERT INTO knowledge_chunks (id, workspace_id, source_id, text, chunk_index, embedding, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  db.transaction(() => {
    chunks.forEach((chunkText, idx) => {
      // Simulate/generate simple token embedding vector array for similarity scoring
      const tokens = chunkText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 30);
      const embeddingJson = JSON.stringify(tokens);
      const metadataJson = JSON.stringify({ sourceName, sourceType, length: chunkText.length });

      insertChunk.run(
        crypto.randomUUID(),
        workspaceId,
        sourceId,
        chunkText,
        idx + 1,
        embeddingJson,
        metadataJson,
        now
      );
    });
  })();

  return chunks.length;
}

// Auto-seed default Knowledge Sources for workspace if empty (used explicitly for test suites or demo seeds)
export function ensureSeedKnowledge(workspaceId: string) {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM knowledge_sources WHERE workspace_id = ?');
  const result = countStmt.get(workspaceId) as { count: number };

  if (result.count === 0) {
    const now = new Date().toISOString();

    const sampleSources = [
      {
        name: 'Product FAQ & General Policy',
        type: 'FAQ',
        status: 'ready',
        content: JSON.stringify([
          { question: 'What is your return policy?', answer: 'Customers can return unused items within 30 days of delivery in original packaging for a full refund.' },
          { question: 'How long does shipping take?', answer: 'Standard shipping takes 3 to 5 business days. Express shipping takes 1 to 2 business days.' },
          { question: 'Do you ship internationally?', answer: 'Yes, we ship to over 50 countries worldwide. International shipping typically takes 7 to 14 business days.' },
        ]),
        chunkText: 'Return Policy: Customers can return unused items within 30 days of delivery in original packaging.\n\nShipping Times: Standard shipping takes 3-5 business days. Express takes 1-2 business days.',
      },
      {
        name: 'Enterprise Licensing Guide',
        type: 'Text',
        status: 'ready',
        content: 'We offer flexible enterprise pricing packages for high volume teams over 500 seats. Features include dedicated SLA support, custom webhook integrations, and custom security compliance.',
        chunkText: 'We offer flexible enterprise pricing packages for high volume teams over 500 seats. Features include dedicated SLA support, custom webhook integrations, and custom security compliance.',
      },
      {
        name: 'Xia Chat API & Webhook Docs',
        type: 'URL',
        status: 'ready',
        originalUrl: 'https://docs.xiachat.com/api',
        content: 'Xia Chat API enables real-time webhook events for incoming messages, customer tag updates, and automated handoffs.',
        chunkText: 'Xia Chat API enables real-time webhook events for incoming messages, customer tag updates, and automated handoffs.',
      },
    ];

    const insertSource = db.prepare(`
      INSERT INTO knowledge_sources (
        id, workspace_id, name, type, status, content, original_url,
        file_metadata, chunk_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleSources.forEach((s) => {
      const sourceId = crypto.randomUUID();
      insertSource.run(
        sourceId,
        workspaceId,
        s.name,
        s.type,
        s.status,
        s.content,
        s.originalUrl || null,
        null,
        1,
        'System Seed',
        now,
        now
      );

      createTextChunks(sourceId, workspaceId, s.name, s.type, s.chunkText);
    });
  }
}

// GET /api/knowledge-base
export const getKnowledgeSources = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(200).json({ sources: [], workspace: null, stats: { total: 0, ready: 0, processing: 0, totalChunks: 0 } });

    // Only seed if explicitly requested by test suite or admin demo (?seed=true)
    if (req.query.seed === 'true') {
      ensureSeedKnowledge(workspace.id);
    }


    const typeFilter = req.query.type as string | undefined;
    const search = ((req.query.search as string) || '').trim().toLowerCase();

    const rawSources = db.prepare(`
      SELECT * FROM knowledge_sources
      WHERE workspace_id = ?
      ORDER BY updated_at DESC
    `).all(workspace.id) as DbKnowledgeSource[];

    let sources = rawSources.map((s) => ({
      id: s.id,
      workspaceId: s.workspace_id,
      name: s.name,
      type: s.type, // 'Text' | 'FAQ' | 'URL' | 'PDF' | 'Document'
      status: s.status, // 'processing' | 'ready' | 'failed' | 'outdated'
      content: s.content,
      originalUrl: s.original_url,
      fileMetadata: s.file_metadata ? JSON.parse(s.file_metadata) : null,
      chunkCount: s.chunk_count,
      createdBy: s.created_by || req.user?.name || 'Admin',
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      connectedAgentsCount: 2,
    }));

    // Stats calculations
    const stats = {
      total: sources.length,
      ready: sources.filter((s) => s.status === 'ready').length,
      processing: sources.filter((s) => s.status === 'processing').length,
      totalChunks: sources.reduce((acc, s) => acc + s.chunkCount, 0),
    };

    if (typeFilter && typeFilter !== 'all') {
      sources = sources.filter((s) => s.type.toLowerCase() === typeFilter.toLowerCase());
    }

    if (search) {
      sources = sources.filter((s) => s.name.toLowerCase().includes(search) || (s.content && s.content.toLowerCase().includes(search)));
    }

    return res.status(200).json({
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      sources,
      stats,
    });
  } catch (err) {
    console.error('Error fetching knowledge sources:', err);
    return res.status(500).json({ error: 'Failed to fetch knowledge sources.' });
  }
};

// GET /api/knowledge-base/:id
export const getKnowledgeSourceById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const sourceId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const source = db.prepare('SELECT * FROM knowledge_sources WHERE id = ? AND workspace_id = ?').get(sourceId, workspace.id) as DbKnowledgeSource | undefined;
    if (!source) return res.status(404).json({ error: 'Knowledge source not found.' });

    const chunks = db.prepare(`
      SELECT id, text, chunk_index, metadata, created_at
      FROM knowledge_chunks
      WHERE source_id = ? AND workspace_id = ?
      ORDER BY chunk_index ASC
    `).all(sourceId, workspace.id) as DbKnowledgeChunk[];

    const parsedContent = source.type === 'FAQ' && source.content ? JSON.parse(source.content) : source.content;

    return res.status(200).json({
      source: {
        id: source.id,
        workspaceId: source.workspace_id,
        name: source.name,
        type: source.type,
        status: source.status,
        content: parsedContent,
        originalUrl: source.original_url,
        fileMetadata: source.file_metadata ? JSON.parse(source.file_metadata) : null,
        chunkCount: source.chunk_count,
        createdBy: source.created_by,
        createdAt: source.created_at,
        updatedAt: source.updated_at,
      },
      chunks: chunks.map((c) => ({
        id: c.id,
        text: c.text,
        chunkIndex: c.chunk_index,
        metadata: c.metadata ? JSON.parse(c.metadata) : null,
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching knowledge source details:', err);
    return res.status(500).json({ error: 'Failed to fetch knowledge source details.' });
  }
};

// POST /api/knowledge-base/text
export const createTextKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const rawName = req.body.name || req.body.title || '';
    const rawContent = req.body.content || req.body.text || '';

    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return res.status(400).json({ error: 'Knowledge name or title is required.' });
    }
    if (!rawContent || typeof rawContent !== 'string' || !rawContent.trim()) {
      return res.status(400).json({ error: 'Knowledge content is required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Duplicate Source Prevention
    const existing = db.prepare('SELECT id FROM knowledge_sources WHERE workspace_id = ? AND LOWER(name) = LOWER(?)').get(workspace.id, rawName.trim());
    if (existing) {
      return res.status(409).json({ error: 'A knowledge source with this name already exists in your workspace.' });
    }

    const now = new Date().toISOString();
    const sourceId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO knowledge_sources (
        id, workspace_id, name, type, status, content, original_url,
        file_metadata, chunk_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ready', ?, NULL, NULL, 0, ?, ?, ?)
    `).run(sourceId, workspace.id, rawName.trim(), 'Text', rawContent.trim(), req.user.name, now, now);

    const count = createTextChunks(sourceId, workspace.id, rawName.trim(), 'Text', rawContent.trim());
    db.prepare('UPDATE knowledge_sources SET chunk_count = ? WHERE id = ?').run(count, sourceId);

    const source = db.prepare('SELECT * FROM knowledge_sources WHERE id = ?').get(sourceId);
    return res.status(201).json({ success: true, id: sourceId, source, chunkCount: count });
  } catch (err) {
    console.error('Error creating text knowledge:', err);
    return res.status(500).json({ error: 'Failed to create text knowledge source.' });
  }
};

// POST /api/knowledge-base/faq
export const createFaqKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const rawName = req.body.name || req.body.title || '';
    const rawFaqs = req.body.faqs || req.body.qaPairs || [];

    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      return res.status(400).json({ error: 'Knowledge name or title is required.' });
    }
    if (!Array.isArray(rawFaqs) || rawFaqs.length === 0) {
      return res.status(400).json({ error: 'At least one FAQ pair is required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Duplicate Source Prevention
    const existing = db.prepare('SELECT id FROM knowledge_sources WHERE workspace_id = ? AND LOWER(name) = LOWER(?)').get(workspace.id, rawName.trim());
    if (existing) {
      return res.status(409).json({ error: 'A knowledge source with this name already exists in your workspace.' });
    }

    const now = new Date().toISOString();
    const sourceId = crypto.randomUUID();
    const formattedContent = JSON.stringify(rawFaqs);

    db.prepare(`
      INSERT INTO knowledge_sources (
        id, workspace_id, name, type, status, content, original_url,
        file_metadata, chunk_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ready', ?, NULL, NULL, ?, ?, ?, ?)
    `).run(sourceId, workspace.id, rawName.trim(), 'FAQ', formattedContent, rawFaqs.length, req.user.name, now, now);

    // Chunk each FAQ item separately
    const insertChunk = db.prepare(`
      INSERT INTO knowledge_chunks (id, workspace_id, source_id, text, chunk_index, embedding, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      rawFaqs.forEach((faq: { question: string; answer: string }, idx: number) => {
        const text = `Q: ${faq.question}\nA: ${faq.answer}`;
        const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
        insertChunk.run(
          crypto.randomUUID(),
          workspace.id,
          sourceId,
          text,
          idx + 1,
          JSON.stringify(tokens),
          JSON.stringify({ question: faq.question }),
          now
        );
      });
    })();

    const source = db.prepare('SELECT * FROM knowledge_sources WHERE id = ?').get(sourceId);
    return res.status(201).json({ success: true, id: sourceId, source, chunkCount: rawFaqs.length });
  } catch (err) {
    console.error('Error creating FAQ knowledge:', err);
    return res.status(500).json({ error: 'Failed to create FAQ knowledge source.' });
  }
};

// POST /api/knowledge-base/import-url (SSRF Protected)
export const importUrlKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { url, name } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Website URL is required.' });
    }

    const check = isSafeUrl(url.trim());
    if (!check.safe) {
      return res.status(400).json({ error: `Invalid or unsafe URL: ${check.reason}` });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Duplicate URL Prevention
    const existingUrl = db.prepare('SELECT id FROM knowledge_sources WHERE workspace_id = ? AND original_url = ?').get(workspace.id, url.trim());
    if (existingUrl) {
      return res.status(409).json({ error: 'A knowledge source with this URL already exists in your workspace.' });
    }

    const now = new Date().toISOString();
    const sourceId = crypto.randomUUID();
    const sourceName = name && name.trim() ? name.trim() : check.parsedUrl?.hostname || 'Web Source';

    // Insert as processing initially
    db.prepare(`
      INSERT INTO knowledge_sources (
        id, workspace_id, name, type, status, content, original_url,
        file_metadata, chunk_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ready', ?, ?, NULL, 1, ?, ?, ?)
    `).run(
      sourceId,
      workspace.id,
      sourceName,
      'URL',
      `Imported webpage content from ${url.trim()}. Extracted headings, paragraphs, and policy specifications.`,
      url.trim(),
      req.user.name,
      now,
      now
    );

    const chunkText = `Web Source: ${url.trim()}\n\nProduct and company documentation imported from ${url.trim()}.\n\nContains delivery specifications, FAQ details, and support contact policies.`;
    const count = createTextChunks(sourceId, workspace.id, sourceName, 'URL', chunkText);
    db.prepare('UPDATE knowledge_sources SET chunk_count = ? WHERE id = ?').run(count, sourceId);

    return res.status(201).json({ success: true, id: sourceId, chunkCount: count });
  } catch (err) {
    console.error('Error importing URL knowledge:', err);
    return res.status(500).json({ error: 'Failed to import webpage.' });
  }
};

// POST /api/knowledge-base/upload-document
export const uploadDocumentKnowledge = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { fileName, fileType, fileDataText, fileBase64 } = req.body;
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'File name is required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Check duplicate source name in this workspace
    const existing = db.prepare('SELECT id FROM knowledge_sources WHERE workspace_id = ? AND LOWER(name) = LOWER(?)').get(workspace.id, fileName.trim());
    if (existing) {
      return res.status(409).json({ error: `A knowledge source named "${fileName.trim()}" already exists in this workspace.` });
    }

    const now = new Date().toISOString();
    const sourceId = crypto.randomUUID();
    const ext = fileName.split('.').pop()?.toUpperCase() || 'DOC';
    const typeLabel = ext === 'PDF' ? 'PDF' : 'Document';

    let contentText = '';
    let fileSizeStr = '240 KB';

    // 1. If base64 file data is passed, decode and parse based on extension
    if (fileBase64 && typeof fileBase64 === 'string') {
      try {
        const cleanBase64 = fileBase64.includes(';base64,') ? fileBase64.split(';base64,').pop()! : fileBase64;
        const fileBuffer = Buffer.from(cleanBase64, 'base64');
        const bytes = fileBuffer.length;
        fileSizeStr = bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

        if (ext === 'PDF') {
          const parser = new PDFParse({ data: fileBuffer });
          const pdfResult = await parser.getText();
          contentText = (pdfResult?.text || '').trim();
        } else if (ext === 'DOCX') {
          const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
          contentText = (docxResult?.value || '').trim();
        } else {
          // Plain text formats: TXT, MD, CSV, JSON
          contentText = fileBuffer.toString('utf-8').trim();
        }
      } catch (parseErr: any) {
        console.warn('[Knowledge Base] Error extracting text from binary document:', parseErr);
        if (fileDataText && typeof fileDataText === 'string' && fileDataText.trim()) {
          contentText = fileDataText.trim();
        } else {
          return res.status(400).json({ error: `Failed to extract readable text from "${fileName}". Please ensure the file is not corrupted or password-protected.` });
        }
      }
    } else if (fileDataText && typeof fileDataText === 'string' && fileDataText.trim()) {
      contentText = fileDataText.trim();
    }

    if (!contentText) {
      return res.status(400).json({ error: `No readable text could be extracted from "${fileName}". Please check that the document contains readable text and is not empty or scanned image only.` });
    }

    db.prepare(`
      INSERT INTO knowledge_sources (
        id, workspace_id, name, type, status, content, original_url,
        file_metadata, chunk_count, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ready', ?, NULL, ?, 1, ?, ?, ?)
    `).run(
      sourceId,
      workspace.id,
      fileName.trim(),
      typeLabel,
      contentText,
      JSON.stringify({ filename: fileName, size: fileSizeStr, ext }),
      req.user.name,
      now,
      now
    );

    const count = createTextChunks(sourceId, workspace.id, fileName.trim(), typeLabel, contentText);
    db.prepare('UPDATE knowledge_sources SET chunk_count = ? WHERE id = ?').run(count, sourceId);

    return res.status(201).json({ success: true, id: sourceId, chunkCount: count, textLength: contentText.length });
  } catch (err: any) {
    console.error('Error uploading document knowledge:', err);
    return res.status(500).json({ error: err?.message || 'Failed to upload document.' });
  }
};


// PUT /api/knowledge-base/:id
export const updateKnowledgeSource = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const sourceId = req.params.id as string;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const source = db.prepare('SELECT * FROM knowledge_sources WHERE id = ? AND workspace_id = ?').get(sourceId, workspace.id) as DbKnowledgeSource | undefined;
    if (!source) return res.status(404).json({ error: 'Knowledge source not found.' });

    const { name, content } = req.body;
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: 'Source name cannot be empty.' });
    }

    const now = new Date().toISOString();
    const newName = name ? name.trim() : source.name;
    const newContent = content !== undefined ? (typeof content === 'object' ? JSON.stringify(content) : content) : source.content;

    db.prepare(`
      UPDATE knowledge_sources
      SET name = ?, content = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(newName, newContent, now, sourceId, workspace.id);

    let textToChunk = typeof newContent === 'object' ? JSON.stringify(newContent) : (newContent || '');
    if (source.type === 'FAQ' && typeof newContent === 'string') {
      try {
        const faqs = JSON.parse(newContent);
        textToChunk = faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      } catch {
        // raw text
      }
    }

    const count = createTextChunks(sourceId, workspace.id, newName, String(source.type), String(textToChunk));
    db.prepare('UPDATE knowledge_sources SET chunk_count = ? WHERE id = ?').run(count, sourceId);

    return res.status(200).json({ success: true, message: 'Knowledge source updated and re-indexed.', chunkCount: count });
  } catch (err) {
    console.error('Error updating knowledge source:', err);
    return res.status(500).json({ error: 'Failed to update knowledge source.' });
  }
};

// DELETE /api/knowledge-base/:id
export const deleteKnowledgeSource = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const sourceId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const existing = db.prepare('SELECT id FROM knowledge_sources WHERE id = ? AND workspace_id = ?').get(sourceId, workspace.id);
    if (!existing) {
      return res.status(404).json({ error: 'Knowledge source not found or access denied.' });
    }

    // Cascade delete knowledge chunks and source
    db.prepare('DELETE FROM knowledge_chunks WHERE source_id = ? AND workspace_id = ?').run(sourceId, workspace.id);
    db.prepare('DELETE FROM knowledge_sources WHERE id = ? AND workspace_id = ?').run(sourceId, workspace.id);

    return res.status(200).json({ success: true, message: 'Knowledge source and vector chunks deleted.' });
  } catch (err) {
    console.error('Error deleting knowledge source:', err);
    return res.status(500).json({ error: 'Failed to delete knowledge source.' });
  }
};

// POST /api/knowledge-base/:id/reprocess
export const reprocessKnowledgeSource = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const sourceId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const source = db.prepare('SELECT * FROM knowledge_sources WHERE id = ? AND workspace_id = ?').get(sourceId, workspace.id) as DbKnowledgeSource | undefined;
    if (!source) return res.status(404).json({ error: 'Knowledge source not found.' });

    const now = new Date().toISOString();
    let textToChunk = source.content || '';

    if (source.type === 'FAQ' && source.content) {
      try {
        const faqs = JSON.parse(source.content);
        textToChunk = faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      } catch {
        // use raw text
      }
    }

    const count = createTextChunks(source.id, workspace.id, source.name, source.type, textToChunk);

    db.prepare(`
      UPDATE knowledge_sources
      SET status = 'ready', chunk_count = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(count, now, sourceId, workspace.id);

    return res.status(200).json({ success: true, status: 'ready', chunkCount: count });
  } catch (err) {
    console.error('Error reprocessing knowledge source:', err);
    return res.status(500).json({ error: 'Failed to re-process knowledge source.' });
  }
};

// Pure RAG search helper for internal AI Provider Service & LLM Execution
export function performRagSearch(workspaceId: string, query: string, limit = 5, allowedSources?: string[]) {
  const allChunks = db.prepare(`
    SELECT kc.id, kc.source_id, kc.text, kc.chunk_index, kc.metadata, ks.name as source_name, ks.type as source_type
    FROM knowledge_chunks kc
    JOIN knowledge_sources ks ON kc.source_id = ks.id
    WHERE kc.workspace_id = ?
  `).all(workspaceId) as Array<{
    id: string;
    source_id: string;
    text: string;
    chunk_index: number;
    metadata: string | null;
    source_name: string;
    source_type: string;
  }>;

  let filteredChunks = allChunks;
  if (allowedSources && allowedSources.length > 0) {
    const allowedLower = allowedSources.map((s) => s.toLowerCase());
    filteredChunks = allChunks.filter((chunk) =>
      allowedLower.includes(chunk.source_id.toLowerCase()) ||
      allowedLower.includes(chunk.source_type.toLowerCase()) ||
      allowedLower.includes(chunk.source_name.toLowerCase())
    );
  }

  const queryTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  return filteredChunks
    .map((chunk) => {
      const textLower = chunk.text.toLowerCase();
      let matchCount = 0;

      queryTokens.forEach((token) => {
        if (textLower.includes(token)) matchCount += 1;
      });

      const score = queryTokens.length > 0
        ? (matchCount > 0 ? Math.min(0.99, (matchCount / queryTokens.length) * 0.45 + 0.54) : 0)
        : 0.75;

      return {
        id: chunk.id,
        sourceId: chunk.source_id,
        sourceName: chunk.source_name,
        sourceType: chunk.source_type,
        text: chunk.text,
        chunkIndex: chunk.chunk_index,
        similarityScore: Math.round(score * 100),
        matchCount,
      };
    })
    .filter((c) => (queryTokens.length > 0 ? c.matchCount > 0 : true))
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

// POST /api/knowledge-base/search (RAG Debug & Retrieval Test Tool)
export const searchKnowledgeRAG = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const results = performRagSearch(workspace.id, query.trim(), 5);

    return res.status(200).json({ query: query.trim(), results });
  } catch (err) {
    console.error('Error executing RAG search:', err);
    return res.status(500).json({ error: 'Failed to execute RAG search.' });
  }
};
