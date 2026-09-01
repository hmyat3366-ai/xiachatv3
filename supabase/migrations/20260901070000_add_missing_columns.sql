-- ============================================================
-- Xia Chat v3 — Missing Columns Alignment
-- Migration: 20260901070000_add_missing_columns.sql
-- Syncs Supabase schema with SQLite ALTER TABLE migrations
-- that were added incrementally during development.
-- ============================================================

-- ─── USERS ───────────────────────────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- ─── WORKSPACES ──────────────────────────────────────────────
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Yangon';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

-- ─── CONVERSATIONS ───────────────────────────────────────────
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS ai_status TEXT DEFAULT 'active';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS draft_message TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS first_seen TEXT;

-- ─── MESSAGES ────────────────────────────────────────────────
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_internal_note INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments TEXT;

-- ─── AI_ASSISTANTS ───────────────────────────────────────────
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'bot';
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS tone TEXT DEFAULT 'Friendly';
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS custom_instructions TEXT;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS response_style TEXT DEFAULT 'Balanced';
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS auto_reply_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS human_handoff_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS handoff_conditions TEXT;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS handoff_message TEXT DEFAULT 'I''ll connect you with a member of our team who can help.';
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS knowledge_source_ids TEXT;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS channel_ids TEXT;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS custom_rules TEXT;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS conversations_handled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.ai_assistants ADD COLUMN IF NOT EXISTS resolution_rate INTEGER NOT NULL DEFAULT 78;

-- ─── USERS — Auth fields added post-launch ───────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 1;

-- ─── PASSWORD_RESETS — OTP code support ──────────────────────
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS code_hash TEXT;
