import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// ─── Database Selection ───────────────────────────────────────────────────────
// If DATABASE_URL (Supabase/Postgres) is set → skip SQLite entirely (prevents SIGSEGV on Render)
// If no DATABASE_URL → use better-sqlite3 (local dev only)
const USE_PG = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 10);

// No-op db stub for production (when using Postgres via authController / pg pool)
function createNoOpDb() {
  const noop = (..._args: any[]) => null;
  const noopStmt = { get: noop, all: () => [], run: noop };
  return {
    prepare: (_sql: string) => noopStmt,
    exec: noop,
    pragma: noop,
    close: noop,
  };
}

let _db: any = null;

if (!USE_PG) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  try {
    const _require = createRequire(import.meta.url);
    const BetterSqlite3 = _require('better-sqlite3');
    _db = new BetterSqlite3(path.join(dataDir, 'xiachat.db'));
    _db.pragma('journal_mode = WAL');
    console.log('[DB] Using better-sqlite3 WAL (local dev)');
  } catch (e) {
    console.warn('[DB] better-sqlite3 failed to load, using no-op db (pg mode):', e);
  }
} else {
  console.log('[DB] DATABASE_URL detected → pg Pool mode (Supabase). SQLite not loaded.');
}

export const db: any = _db ?? createNoOpDb();

// Initialize schema (SQLite only — skipped in pg mode)
if (!USE_PG && _db) db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'local',
    google_id TEXT UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    onboarding_step INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pending_google_signups (
    id TEXT PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    google_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    business_type TEXT,
    customer_channels TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_assistants (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Xia Assistant',
    instructions TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    code_hash TEXT,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    channel TEXT NOT NULL DEFAULT 'Website',
    status TEXT NOT NULL DEFAULT 'ai',
    assignee TEXT,
    last_message TEXT NOT NULL,
    needs_attention INTEGER NOT NULL DEFAULT 0,
    attention_reason TEXT,
    confidence_score REAL DEFAULT 0.95,
    sentiment TEXT DEFAULT 'neutral',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    sender_name TEXT,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS knowledge_sources (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    content TEXT,
    original_url TEXT,
    file_metadata TEXT,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(source_id) REFERENCES knowledge_sources(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    location TEXT,
    avatar TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customer_notes (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    author_id TEXT,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_connected',
    provider TEXT NOT NULL,
    external_account_id TEXT,
    config TEXT,
    credentials_reference TEXT,
    default_agent_id TEXT,
    last_activity_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customer_identities (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    external_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY(channel_id) REFERENCES channels(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    joined_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_invitations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    token_hash TEXT NOT NULL,
    invited_by_id TEXT NOT NULL,
    invited_by_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TEXT NOT NULL,
    accepted_at TEXT,
    cancelled_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    notification_preferences TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_ai_settings (
    workspace_id TEXT PRIMARY KEY,
    default_style TEXT DEFAULT 'balanced',
    default_tone TEXT DEFAULT 'friendly',
    enable_handoff INTEGER DEFAULT 1,
    safety_knowledge_only INTEGER DEFAULT 1,
    safety_no_hallucination INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stripe_product_id TEXT,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    price_monthly REAL NOT NULL DEFAULT 0,
    price_annual REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    description TEXT,
    limits TEXT NOT NULL,
    features TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_id TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    billing_interval TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    trial_ends_at TEXT,
    payment_method_brand TEXT,
    payment_method_last4 TEXT,
    payment_method_exp_month INTEGER,
    payment_method_exp_year INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(plan_id) REFERENCES plans(id)
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    stripe_invoice_id TEXT UNIQUE,
    invoice_number TEXT,
    amount_paid REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'paid',
    hosted_invoice_url TEXT,
    pdf_url TEXT,
    period_start TEXT,
    period_end TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TEXT NOT NULL,
    payload TEXT
  );

  CREATE TABLE IF NOT EXISTS billing_events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_conversations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'direct',
    title TEXT,
    created_by TEXT NOT NULL,
    last_message TEXT NOT NULL DEFAULT '',
    last_message_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_conversation_participants (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    last_read_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(conversation_id) REFERENCES team_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_messages (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY(conversation_id) REFERENCES team_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_audit_logs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_team_audit_workspace ON team_audit_logs(workspace_id);

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
  CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);
  CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
  CREATE INDEX IF NOT EXISTS idx_ai_assistants_workspace_id ON ai_assistants(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);
  CREATE INDEX IF NOT EXISTS idx_email_verifications_token_hash ON email_verifications(token_hash);
  CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_knowledge_sources_workspace_id ON knowledge_sources(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_id ON knowledge_chunks(source_id);
  CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_workspace_id ON knowledge_chunks(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON customers(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_customers_last_active ON customers(last_active_at);
  CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
  CREATE INDEX IF NOT EXISTS idx_channels_workspace_id ON channels(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);
  CREATE INDEX IF NOT EXISTS idx_customer_identities_external ON customer_identities(external_user_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token_hash);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON subscriptions(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_workspace ON invoices(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_billing_events_workspace ON billing_events(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_team_conversations_workspace ON team_conversations(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_team_participants_conv ON team_conversation_participants(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_team_participants_user ON team_conversation_participants(user_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_ws_created ON conversations(workspace_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_conversations_ws_status ON conversations(workspace_id, status);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user_status ON workspace_members(user_id, status);
`);

// Safe column migrations for existing SQLite databases (local dev only)
if (!USE_PG && _db) try {
  db.exec(`ALTER TABLE users ADD COLUMN job_title TEXT;`);
} catch {
  // Column already exists
}

// Remaining migrations (SQLite local dev only)
if (!USE_PG && _db) {
  try { db.exec(`ALTER TABLE users ADD COLUMN phone TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { db.exec(`ALTER TABLE workspaces ADD COLUMN description TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE workspaces ADD COLUMN logo_url TEXT;`); } catch {}
  try { db.exec(`ALTER TABLE workspaces ADD COLUMN timezone TEXT DEFAULT 'Asia/Yangon';`); } catch {}
  try { db.exec(`ALTER TABLE workspaces ADD COLUMN language TEXT DEFAULT 'English';`); } catch {}
  try { db.exec(`ALTER TABLE users ADD COLUMN onboarding_step INTEGER NOT NULL DEFAULT 1;`); } catch {}
}

// Inbox and AI Agent column migrations
const inboxMigrations = [
  `ALTER TABLE conversations ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE conversations ADD COLUMN customer_phone TEXT;`,
  `ALTER TABLE conversations ADD COLUMN tags TEXT;`,
  `ALTER TABLE conversations ADD COLUMN notes TEXT;`,
  `ALTER TABLE conversations ADD COLUMN ai_status TEXT DEFAULT 'active';`,
  `ALTER TABLE conversations ADD COLUMN draft_message TEXT;`,
  `ALTER TABLE conversations ADD COLUMN first_seen TEXT;`,
  `ALTER TABLE messages ADD COLUMN is_internal_note INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE messages ADD COLUMN attachments TEXT;`,

  // AI Assistant extensions
  `ALTER TABLE ai_assistants ADD COLUMN description TEXT;`,
  `ALTER TABLE ai_assistants ADD COLUMN avatar TEXT DEFAULT 'bot';`,
  `ALTER TABLE ai_assistants ADD COLUMN status TEXT DEFAULT 'active';`,
  `ALTER TABLE ai_assistants ADD COLUMN tone TEXT DEFAULT 'Friendly';`,
  `ALTER TABLE ai_assistants ADD COLUMN custom_instructions TEXT;`,
  `ALTER TABLE ai_assistants ADD COLUMN response_style TEXT DEFAULT 'Balanced';`,
  `ALTER TABLE ai_assistants ADD COLUMN auto_reply_enabled INTEGER NOT NULL DEFAULT 1;`,
  `ALTER TABLE ai_assistants ADD COLUMN human_handoff_enabled INTEGER NOT NULL DEFAULT 1;`,
  `ALTER TABLE ai_assistants ADD COLUMN handoff_conditions TEXT;`,
  `ALTER TABLE ai_assistants ADD COLUMN handoff_message TEXT DEFAULT "I'll connect you with a member of our team who can help.";`,
  `ALTER TABLE ai_assistants ADD COLUMN knowledge_source_ids TEXT;`,
  `ALTER TABLE ai_assistants ADD COLUMN channel_ids TEXT;`,
  `ALTER TABLE ai_assistants ADD COLUMN custom_rules TEXT;`,
  `ALTER TABLE ai_assistants ADD COLUMN conversations_handled INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE ai_assistants ADD COLUMN resolution_rate INTEGER NOT NULL DEFAULT 78;`,
];

const authMigrations = [
  'ALTER TABLE users ADD COLUMN username TEXT;',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);',
  'ALTER TABLE password_resets ADD COLUMN code_hash TEXT;',
];

if (!USE_PG && _db) {
  for (const sql of [...inboxMigrations, ...authMigrations]) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists or index exists
    }
  }
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  password_hash: string | null;
  auth_provider: 'local' | 'google' | 'both';
  google_id: string | null;
  email_verified: number;
  onboarding_completed: number;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

export interface DbWorkspace {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  business_type: string | null;
  customer_channels: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

export interface DbAiAssistant {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
  status: string; // 'active' | 'paused' | 'draft'
  tone: string;
  instructions?: string | null;
  custom_instructions?: string | null;
  response_style?: string | null;
  auto_reply_enabled?: number;
  human_handoff_enabled?: number;
  handoff_conditions?: string | null; // JSON array
  handoff_message?: string | null;
  knowledge_source_ids?: string | null; // JSON array
  channel_ids?: string | null; // JSON array
  custom_rules?: string | null; // JSON array
  conversations_handled?: number;
  resolution_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface DbPasswordReset {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface DbEmailVerification {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export interface DbConversation {
  id: string;
  workspace_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone?: string | null;
  channel: string;
  status: string; // 'ai' | 'human' | 'open' | 'assigned' | 'waiting' | 'resolved' | 'closed'
  assignee: string | null;
  last_message: string;
  needs_attention: number;
  attention_reason: string | null;
  confidence_score: number | null;
  sentiment: string | null;
  unread_count?: number;
  tags?: string | null;
  notes?: string | null;
  ai_status?: string | null;
  draft_message?: string | null;
  first_seen?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'ai' | 'agent' | 'system';
  sender_name: string | null;
  content: string;
  is_internal_note?: number;
  attachments?: string | null;
  created_at: string;
}

export interface DbKnowledgeSource {
  id: string;
  workspace_id: string;
  name: string;
  type: string; // 'Text' | 'FAQ' | 'URL' | 'PDF' | 'Document'
  status: string; // 'processing' | 'ready' | 'failed' | 'outdated'
  content: string | null;
  original_url: string | null;
  file_metadata: string | null; // JSON string
  chunk_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbKnowledgeChunk {
  id: string;
  workspace_id: string;
  source_id: string;
  text: string;
  chunk_index: number;
  embedding: string | null; // JSON string array or tokens
  metadata: string | null; // JSON string
  created_at: string;
}

export interface DbCustomer {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  location: string | null;
  avatar: string | null;
  status: string; // 'new' | 'active' | 'returning' | 'blocked'
  tags: string | null; // JSON string array
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

export interface DbCustomerNote {
  id: string;
  workspace_id: string;
  customer_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DbChannel {
  id: string;
  workspace_id: string;
  type: string; // 'website' | 'facebook' | 'instagram' | 'whatsapp'
  name: string;
  status: string; // 'connected' | 'connecting' | 'disconnected' | 'needs_attention' | 'not_connected'
  provider: string; // 'xia' | 'meta' | 'whatsapp_cloud'
  external_account_id: string | null;
  config: string | null; // JSON string
  credentials_reference: string | null;
  default_agent_id: string | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCustomerIdentity {
  id: string;
  workspace_id: string;
  customer_id: string;
  channel_id: string;
  provider: string;
  external_user_id: string;
  created_at: string;
}

export interface DbWorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string; // 'owner' | 'admin' | 'member'
  status: string; // 'active' | 'pending' | 'suspended'
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbWorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string; // 'admin' | 'member'
  token_hash: string;
  invited_by_id: string;
  invited_by_name: string;
  status: string; // 'pending' | 'accepted' | 'cancelled' | 'expired'
  expires_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface DbUserSettings {
  user_id: string;
  notification_preferences: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

export interface DbWorkspaceAISettings {
  workspace_id: string;
  default_style: string; // 'concise' | 'balanced' | 'detailed'
  default_tone: string; // 'friendly' | 'professional' | 'casual'
  enable_handoff: number;
  safety_knowledge_only: number;
  safety_no_hallucination: number;
  updated_at: string;
}

export interface DbPlanLimits {
  max_agents: number; // -1 for unlimited
  max_members: number; // -1 for unlimited
  max_conversations: number; // -1 for unlimited
  max_knowledge_sources: number; // -1 for unlimited
  max_channels: number; // -1 for unlimited
  ai_usage_limit: number; // -1 for unlimited
  storage_mb: number; // -1 for unlimited
}

export interface DbPlan {
  id: string; // 'free' | 'starter' | 'pro' | 'enterprise'
  name: string;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  price_monthly: number;
  price_annual: number;
  currency: string;
  description: string | null;
  limits: string; // JSON string of DbPlanLimits
  features: string; // JSON string of string[]
  active: number;
  created_at: string;
  updated_at: string;
}

export interface DbSubscription {
  id: string;
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'canceling' | 'incomplete' | 'payment_failed';
  billing_interval: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: number;
  trial_ends_at: string | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  payment_method_exp_month: number | null;
  payment_method_exp_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbInvoice {
  id: string;
  workspace_id: string;
  stripe_invoice_id: string | null;
  invoice_number: string | null;
  amount_paid: number;
  currency: string;
  status: 'paid' | 'open' | 'failed' | 'void';
  hosted_invoice_url: string | null;
  pdf_url: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface DbWebhookEvent {
  id: string;
  event_type: string;
  processed_at: string;
  payload: string | null;
}

export interface DbBillingEvent {
  id: string;
  workspace_id: string;
  event_type: string;
  details: string | null;
  created_at: string;
}

// Seed plans configuration into database if empty or missing
export function seedDefaultPlans() {
  const now = new Date().toISOString();

  const defaultPlans = [
    {
      id: 'free',
      name: 'Free',
      stripe_product_id: process.env.STRIPE_FREE_PRODUCT_ID || 'prod_xia_free',
      stripe_price_id_monthly: process.env.STRIPE_FREE_PRICE_ID || 'price_xia_free_monthly',
      stripe_price_id_annual: process.env.STRIPE_FREE_PRICE_ID || 'price_xia_free_annual',
      price_monthly: 0,
      price_annual: 0,
      currency: 'USD',
      description: 'Essential AI customer chat features for testing and individual builders.',
      limits: JSON.stringify({
        max_agents: 1,
        max_members: 2,
        max_conversations: 100,
        max_knowledge_sources: 2,
        max_channels: 1,
        ai_usage_limit: 1000,
        storage_mb: 100,
      }),
      features: JSON.stringify([
        '1 AI Assistant Agent',
        '2 Team Members',
        '100 Monthly Conversations',
        '2 Knowledge Base Sources',
        'Website Chat Widget Channel',
        'Community & Email Support',
      ]),
      active: 1,
    },
    {
      id: 'starter',
      name: 'Starter',
      stripe_product_id: process.env.STRIPE_STARTER_PRODUCT_ID || 'prod_xia_starter',
      stripe_price_id_monthly: process.env.STRIPE_STARTER_PRICE_MONTHLY || 'price_xia_starter_monthly',
      stripe_price_id_annual: process.env.STRIPE_STARTER_PRICE_ANNUAL || 'price_xia_starter_annual',
      price_monthly: 19,
      price_annual: 15, // $15/mo billed annually
      currency: 'USD',
      description: 'Ideal for growing startups and small businesses expanding AI support.',
      limits: JSON.stringify({
        max_agents: 3,
        max_members: 5,
        max_conversations: 1500,
        max_knowledge_sources: 10,
        max_channels: 3,
        ai_usage_limit: 10000,
        storage_mb: 500,
      }),
      features: JSON.stringify([
        '3 AI Assistant Agents',
        '5 Team Members',
        '1,500 Monthly Conversations',
        '10 Knowledge Base Sources',
        'Website & Email Channels',
        'Standard Analytics',
        'Standard Support Response',
      ]),
      active: 1,
    },
    {
      id: 'pro',
      name: 'Pro',
      stripe_product_id: process.env.STRIPE_PRO_PRODUCT_ID || 'prod_xia_pro',
      stripe_price_id_monthly: process.env.STRIPE_PRO_PRICE_MONTHLY || 'price_xia_pro_monthly',
      stripe_price_id_annual: process.env.STRIPE_PRO_PRICE_ANNUAL || 'price_xia_pro_annual',
      price_monthly: 49,
      price_annual: 39, // $39/mo billed annually
      currency: 'USD',
      description: 'Full-featured AI automation platform for high-volume customer teams.',
      limits: JSON.stringify({
        max_agents: 10,
        max_members: 10,
        max_conversations: 5000,
        max_knowledge_sources: 20,
        max_channels: 5,
        ai_usage_limit: 50000,
        storage_mb: 2000,
      }),
      features: JSON.stringify([
        '10 AI Assistant Agents',
        '10 Team Members',
        '5,000 Monthly Conversations',
        '20 Knowledge Base Sources',
        'WhatsApp, Meta & Website Channels',
        'Advanced RAG Knowledge Search',
        'AI Human Handoff Rules',
        'Priority Customer Support',
      ]),
      active: 1,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      stripe_product_id: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || 'prod_xia_enterprise',
      stripe_price_id_monthly: process.env.STRIPE_ENTERPRISE_PRICE_MONTHLY || 'price_xia_enterprise_monthly',
      stripe_price_id_annual: process.env.STRIPE_ENTERPRISE_PRICE_ANNUAL || 'price_xia_enterprise_annual',
      price_monthly: 199,
      price_annual: 159, // $159/mo billed annually
      currency: 'USD',
      description: 'Custom governance, unlimited scale, SLA guarantees, and dedicated account manager.',
      limits: JSON.stringify({
        max_agents: -1, // Unlimited
        max_members: -1,
        max_conversations: -1,
        max_knowledge_sources: -1,
        max_channels: -1,
        ai_usage_limit: -1,
        storage_mb: -1,
      }),
      features: JSON.stringify([
        'Unlimited AI Assistant Agents',
        'Unlimited Team Members',
        'Unlimited Monthly Conversations',
        'Unlimited Knowledge Sources',
        'All Channels & Custom API Integrations',
        'Dedicated SLA & 24/7 Phone Support',
        'Custom Data Retention & Isolation',
      ]),
      active: 1,
    },
  ];

  const insertStmt = db.prepare(`
    INSERT INTO plans (
      id, name, stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
      price_monthly, price_annual, currency, description, limits, features, active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      price_monthly = excluded.price_monthly,
      price_annual = excluded.price_annual,
      currency = excluded.currency,
      description = excluded.description,
      limits = excluded.limits,
      features = excluded.features,
      updated_at = excluded.updated_at
  `);

  for (const p of defaultPlans) {
    insertStmt.run(
      p.id,
      p.name,
      p.stripe_product_id,
      p.stripe_price_id_monthly,
      p.stripe_price_id_annual,
      p.price_monthly,
      p.price_annual,
      p.currency,
      p.description,
      p.limits,
      p.features,
      p.active,
      now,
      now
    );
  }
}

// Run seed immediately
seedDefaultPlans();

export interface DbTeamConversation {
  id: string;
  workspace_id: string;
  type: 'direct' | 'group';
  title: string | null;
  created_by: string;
  last_message: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbTeamParticipant {
  id: string;
  workspace_id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  created_at: string;
}

export interface DbTeamMessage {
  id: string;
  workspace_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DbTeamAuditLog {
  id: string;
  workspace_id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_id: string;
  target_name: string;
  details: string;
  created_at: string;
}
