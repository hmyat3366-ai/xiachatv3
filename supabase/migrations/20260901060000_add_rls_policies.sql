-- ============================================================
-- Xia Chat v3 — Supabase RLS Security Policies
-- Migration: 20260901060000_add_rls_policies.sql
-- Strategy: Tenant isolation by workspace_id + self-read for users
-- IMPORTANT: Backend uses pg.Pool with service_role (bypasses RLS).
--   These policies protect the Supabase Data API (anon/authenticated clients).
-- ============================================================

-- Helper function: check if the calling Supabase auth user is
-- an active member of a given workspace (via workspace_members table).
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ws_id
      AND u.id = (auth.jwt() ->> 'sub')
      AND wm.status = 'active'
  );
$$;

-- Helper function: check if caller is owner or admin of workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ws_id
      AND u.id = (auth.jwt() ->> 'sub')
      AND wm.role IN ('owner', 'admin')
      AND wm.status = 'active'
  );
$$;

-- Helper: get the internal user id from JWT sub claim
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT id FROM public.users WHERE id = (auth.jwt() ->> 'sub') LIMIT 1;
$$;

-- ============================================================
-- 1. USERS — self-read, self-update only
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
ON public.users FOR SELECT TO authenticated
USING ( id = public.current_user_id() );

CREATE POLICY "users_update_own"
ON public.users FOR UPDATE TO authenticated
USING ( id = public.current_user_id() )
WITH CHECK ( id = public.current_user_id() );

-- ============================================================
-- 2. WORKSPACES — member-read, admin-update/delete, self-insert
-- ============================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_select_member"
ON public.workspaces FOR SELECT TO authenticated
USING ( public.is_workspace_member(id) );

CREATE POLICY "workspaces_insert_self"
ON public.workspaces FOR INSERT TO authenticated
WITH CHECK ( user_id = public.current_user_id() );

CREATE POLICY "workspaces_update_admin"
ON public.workspaces FOR UPDATE TO authenticated
USING ( public.is_workspace_admin(id) )
WITH CHECK ( public.is_workspace_admin(id) );

CREATE POLICY "workspaces_delete_admin"
ON public.workspaces FOR DELETE TO authenticated
USING ( public.is_workspace_admin(id) );

-- ============================================================
-- 3. WORKSPACE_MEMBERS
-- ============================================================
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_member"
ON public.workspace_members FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "workspace_members_update_admin"
ON public.workspace_members FOR UPDATE TO authenticated
USING ( public.is_workspace_admin(workspace_id) )
WITH CHECK ( public.is_workspace_admin(workspace_id) );

CREATE POLICY "workspace_members_delete_admin"
ON public.workspace_members FOR DELETE TO authenticated
USING ( public.is_workspace_admin(workspace_id) );

-- ============================================================
-- 4. WORKSPACE_INVITATIONS
-- ============================================================
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_invitations_select_admin"
ON public.workspace_invitations FOR SELECT TO authenticated
USING ( public.is_workspace_admin(workspace_id) );

CREATE POLICY "workspace_invitations_insert_admin"
ON public.workspace_invitations FOR INSERT TO authenticated
WITH CHECK ( public.is_workspace_admin(workspace_id) );

CREATE POLICY "workspace_invitations_update_admin"
ON public.workspace_invitations FOR UPDATE TO authenticated
USING ( public.is_workspace_admin(workspace_id) )
WITH CHECK ( public.is_workspace_admin(workspace_id) );

CREATE POLICY "workspace_invitations_delete_admin"
ON public.workspace_invitations FOR DELETE TO authenticated
USING ( public.is_workspace_admin(workspace_id) );

-- ============================================================
-- 5. CONVERSATIONS
-- ============================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_member"
ON public.conversations FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "conversations_update_member"
ON public.conversations FOR UPDATE TO authenticated
USING ( public.is_workspace_member(workspace_id) )
WITH CHECK ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 6. MESSAGES
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_member"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND public.is_workspace_member(c.workspace_id)
  )
);

-- ============================================================
-- 7. KNOWLEDGE_SOURCES
-- ============================================================
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_sources_select_member"
ON public.knowledge_sources FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "knowledge_sources_update_member"
ON public.knowledge_sources FOR UPDATE TO authenticated
USING ( public.is_workspace_member(workspace_id) )
WITH CHECK ( public.is_workspace_member(workspace_id) );

CREATE POLICY "knowledge_sources_delete_member"
ON public.knowledge_sources FOR DELETE TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 8. KNOWLEDGE_CHUNKS
-- ============================================================
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_chunks_select_member"
ON public.knowledge_chunks FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 9. CUSTOMERS
-- ============================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_member"
ON public.customers FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "customers_update_member"
ON public.customers FOR UPDATE TO authenticated
USING ( public.is_workspace_member(workspace_id) )
WITH CHECK ( public.is_workspace_member(workspace_id) );

CREATE POLICY "customers_delete_member"
ON public.customers FOR DELETE TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 10. CUSTOMER_NOTES
-- ============================================================
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_notes_select_member"
ON public.customer_notes FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "customer_notes_insert_member"
ON public.customer_notes FOR INSERT TO authenticated
WITH CHECK ( public.is_workspace_member(workspace_id) );

CREATE POLICY "customer_notes_delete_member"
ON public.customer_notes FOR DELETE TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 11. CHANNELS
-- ============================================================
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_select_member"
ON public.channels FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "channels_update_admin"
ON public.channels FOR UPDATE TO authenticated
USING ( public.is_workspace_admin(workspace_id) )
WITH CHECK ( public.is_workspace_admin(workspace_id) );

-- ============================================================
-- 12. CUSTOMER_IDENTITIES
-- ============================================================
ALTER TABLE public.customer_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_identities_select_member"
ON public.customer_identities FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 13. AI_ASSISTANTS
-- ============================================================
ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_assistants_select_member"
ON public.ai_assistants FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "ai_assistants_update_member"
ON public.ai_assistants FOR UPDATE TO authenticated
USING ( public.is_workspace_member(workspace_id) )
WITH CHECK ( public.is_workspace_member(workspace_id) );

CREATE POLICY "ai_assistants_delete_admin"
ON public.ai_assistants FOR DELETE TO authenticated
USING ( public.is_workspace_admin(workspace_id) );

-- ============================================================
-- 14. TEAM_CONVERSATIONS
-- ============================================================
ALTER TABLE public.team_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_conversations_select_member"
ON public.team_conversations FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 15. TEAM_MESSAGES
-- ============================================================
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_messages_select_member"
ON public.team_messages FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 16. TEAM_CONVERSATION_PARTICIPANTS
-- ============================================================
ALTER TABLE public.team_conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_conversation_participants_select_member"
ON public.team_conversation_participants FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 17. TEAM_AUDIT_LOGS
-- ============================================================
ALTER TABLE public.team_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_audit_logs_select_admin"
ON public.team_audit_logs FOR SELECT TO authenticated
USING ( public.is_workspace_admin(workspace_id) );

-- ============================================================
-- 18. USER_SETTINGS
-- ============================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own"
ON public.user_settings FOR SELECT TO authenticated
USING ( user_id = public.current_user_id() );

CREATE POLICY "user_settings_insert_own"
ON public.user_settings FOR INSERT TO authenticated
WITH CHECK ( user_id = public.current_user_id() );

CREATE POLICY "user_settings_update_own"
ON public.user_settings FOR UPDATE TO authenticated
USING ( user_id = public.current_user_id() )
WITH CHECK ( user_id = public.current_user_id() );

-- ============================================================
-- 19. WORKSPACE_AI_SETTINGS
-- ============================================================
ALTER TABLE public.workspace_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_ai_settings_select_member"
ON public.workspace_ai_settings FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

CREATE POLICY "workspace_ai_settings_update_admin"
ON public.workspace_ai_settings FOR UPDATE TO authenticated
USING ( public.is_workspace_admin(workspace_id) )
WITH CHECK ( public.is_workspace_admin(workspace_id) );

-- ============================================================
-- 20. SUBSCRIPTIONS
-- ============================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_member"
ON public.subscriptions FOR SELECT TO authenticated
USING ( public.is_workspace_member(workspace_id) );

-- ============================================================
-- 21. PLANS — public read (pricing page, anon accessible)
-- ============================================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_public"
ON public.plans FOR SELECT TO anon, authenticated
USING ( active = 1 );

-- ============================================================
-- 22. INVOICES — admin-read only
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_admin"
ON public.invoices FOR SELECT TO authenticated
USING ( public.is_workspace_admin(workspace_id) );

-- ============================================================
-- 23-27. BACKEND-ONLY TABLES — Enable RLS, no client policies
--   Service role bypasses RLS automatically.
-- ============================================================
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_google_signups ENABLE ROW LEVEL SECURITY;
