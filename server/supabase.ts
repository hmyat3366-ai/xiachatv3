import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

// Ensure globalThis.WebSocket exists to prevent @supabase/realtime-js crash in environments without native WebSocket
if (typeof globalThis.WebSocket === 'undefined') {
  class NoopWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readyState = 3;
    onopen = null;
    onclose = null;
    onerror = null;
    onmessage = null;
    close() {}
    send() {}
  }
  (globalThis as any).WebSocket = NoopWebSocket;
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '[JWT_2]';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// Supabase JS clients (for Data API)
export const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Direct Postgres pool (for server-side queries, same as Supabase DB)
export const pgPool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false,
});

// Helpers
export async function testSupabaseConnection() {
  try {
    const client = await pgPool.connect();
    const r1 = await client.query('SELECT 1 as ok');
    const r2 = await client.query("SELECT count(*) as tables FROM information_schema.tables WHERE table_schema='public'");
    client.release();
    // Try Supabase Data API
    const { data, error } = await supabaseAnon.from('users').select('id').limit(1);
    return {
      pgOk: r1.rows[0]?.ok === 1,
      tables: Number(r2.rows[0]?.tables || 0),
      dataApiOk: !error || (error as any)?.code === 'PGRST116', // no rows is ok, table not exposed is error
      dataApiError: error?.message || null,
      url: SUPABASE_URL,
      dbUrlHost: DATABASE_URL.split('@').pop()?.split('/')[0] || 'local',
    };
  } catch (e: any) {
    return { pgOk: false, error: e.message, url: SUPABASE_URL };
  }
}

export const projectId = 'xiachatV3';

// ============================================================
// Asynchronous Supabase Cloud PostgreSQL Sync Helpers
// Ensures visitor conversations and messages are persisted in
// cloud Supabase, immune to Render ephemeral disk restarts.
// ============================================================

export async function syncWorkspaceToSupabase(ws: any) {
  try {
    if (!ws || !ws.id) return;
    // Ensure foreign key user exists in users table on Supabase first
    if (ws.user_id) {
      await supabaseService.from('users').upsert(
        {
          id: ws.user_id,
          name: 'Workspace Admin',
          email: `${ws.slug || ws.id}@placeholder.xiachat.ai`,
          created_at: ws.created_at || new Date().toISOString(),
          updated_at: ws.updated_at || new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    }
    await supabaseService.from('workspaces').upsert(
      {
        id: ws.id,
        user_id: ws.user_id,
        name: ws.name,
        slug: ws.slug,
        business_type: ws.business_type || null,
        customer_channels: ws.customer_channels || null,
        created_at: ws.created_at || new Date().toISOString(),
        updated_at: ws.updated_at || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err: any) {
    console.warn('[Supabase Sync] Workspace sync warning:', err.message || err);
  }
}

export async function ensureWorkspaceInSupabase(workspaceId: string) {
  try {
    const { db } = await import('./db.js');
    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspaceId) as any;
    if (ws) {
      await syncWorkspaceToSupabase(ws);
    }
  } catch (err: any) {
    console.warn('[Supabase Sync] ensureWorkspaceInSupabase error:', err.message);
  }
}

export async function syncCustomerToSupabase(c: any) {
  try {
    if (!c || !c.id) return;
    if (c.workspace_id) {
      await ensureWorkspaceInSupabase(c.workspace_id);
    }
    await supabaseService.from('customers').upsert(
      {
        id: c.id,
        workspace_id: c.workspace_id,
        name: c.name,
        email: c.email || null,
        phone: c.phone || null,
        company: c.company || null,
        location: c.location || null,
        avatar: c.avatar || null,
        status: c.status || 'active',
        tags: c.tags || null,
        created_at: c.created_at || new Date().toISOString(),
        updated_at: c.updated_at || new Date().toISOString(),
        last_active_at: c.last_active_at || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err: any) {
    console.warn('[Supabase Sync] Customer sync warning:', err.message || err);
  }
}

export async function syncConversationToSupabase(conv: any) {
  try {
    if (!conv || !conv.id) return;
    if (conv.workspace_id) {
      await ensureWorkspaceInSupabase(conv.workspace_id);
    }
    await supabaseService.from('conversations').upsert(
      {
        id: conv.id,
        workspace_id: conv.workspace_id,
        customer_name: conv.customer_name,
        customer_email: conv.customer_email || null,
        channel: conv.channel || 'Website',
        status: conv.status || 'ai',
        assignee: conv.assignee || 'Xia AI',
        last_message: conv.last_message,
        needs_attention: conv.needs_attention ? 1 : 0,
        attention_reason: conv.attention_reason || null,
        confidence_score: conv.confidence_score || 0.95,
        sentiment: conv.sentiment || 'neutral',
        unread_count: conv.unread_count || 0,
        customer_phone: conv.customer_phone || null,
        tags: typeof conv.tags === 'string' ? conv.tags : JSON.stringify(conv.tags || []),
        notes: conv.notes || null,
        ai_status: conv.ai_status || 'active',
        draft_message: conv.draft_message || null,
        first_seen: conv.first_seen || conv.created_at,
        created_at: conv.created_at || new Date().toISOString(),
        updated_at: conv.updated_at || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err: any) {
    console.warn('[Supabase Sync] Conversation sync warning:', err.message || err);
  }
}

export async function syncMessageToSupabase(msg: any) {
  try {
    if (!msg || !msg.id) return;
    const conversationId = msg.conversation_id || msg.conversationId;
    if (!conversationId) return;

    await supabaseService.from('messages').upsert(
      {
        id: msg.id,
        conversation_id: conversationId,
        sender_type: msg.sender_type || msg.senderType || 'customer',
        sender_name: msg.sender_name || msg.senderName || null,
        content: msg.content,
        is_internal_note: (msg.is_internal_note || msg.isInternalNote) ? 1 : 0,
        attachments: typeof msg.attachments === 'string' ? msg.attachments : JSON.stringify(msg.attachments || []),
        created_at: msg.created_at || msg.createdAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err: any) {
    console.warn('[Supabase Sync] Message sync warning:', err.message || err);
  }
}

// ============================================================
// Supabase Cloud Storage Engine (Chat Screenshots & Attachments)
// ============================================================

export const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';

export async function ensureStorageBucket(): Promise<boolean> {
  try {
    const { data: buckets, error } = await supabaseService.storage.listBuckets();
    if (error) {
      console.warn('[Supabase Storage] List buckets warning:', error.message);
      return false;
    }
    const exists = buckets && buckets.some((b) => b.name === CHAT_ATTACHMENTS_BUCKET);
    if (!exists) {
      console.log(`[Supabase Storage] Creating public bucket '${CHAT_ATTACHMENTS_BUCKET}'...`);
      const { error: createErr } = await supabaseService.storage.createBucket(CHAT_ATTACHMENTS_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
        allowedMimeTypes: [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'image/webp',
          'image/gif',
          'application/pdf',
          'text/plain',
        ],
      });
      if (createErr) {
        console.error('[Supabase Storage] Failed to create bucket:', createErr.message);
        return false;
      }
      console.log(`[Supabase Storage] Bucket '${CHAT_ATTACHMENTS_BUCKET}' created successfully with public access.`);
    }
    return true;
  } catch (err: any) {
    console.error('[Supabase Storage] ensureStorageBucket error:', err.message);
    return false;
  }
}

export interface UploadAttachmentResult {
  url: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export async function uploadChatAttachment(
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string,
  workspaceId: string = 'default'
): Promise<UploadAttachmentResult> {
  await ensureStorageBucket();

  const sanitizedName = (originalFilename || 'attachment').replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = sanitizedName.split('.').pop() || 'png';
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const filePath = `workspaces/${workspaceId}/${uniqueId}.${ext}`;

  const { error } = await supabaseService.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  const { data: publicData } = supabaseService.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .getPublicUrl(filePath);

  return {
    url: publicData.publicUrl,
    fileName: originalFilename || sanitizedName,
    fileSize: fileBuffer.length,
    contentType: contentType || 'application/octet-stream',
  };
}

