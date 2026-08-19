import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, DbWorkspace, DbSubscription, DbPlan, DbPlanLimits } from './db.js';
import { AuthRequest } from './authMiddleware.js';

// Helper to resolve workspace for user from request query/body or user default
export function getWorkspaceForUser(userId: string, requestedWsId?: string): DbWorkspace | null {
  if (requestedWsId) {
    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?').get(requestedWsId, userId) as DbWorkspace | undefined;
    if (ws) return ws;

    // Check if user is an active workspace member
    const member = db.prepare("SELECT workspace_id FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND status = 'active'").get(requestedWsId, userId) as { workspace_id: string } | undefined;
    if (member) {
      const memberWs = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(requestedWsId) as DbWorkspace | undefined;
      if (memberWs) return memberWs;
    }
  }

  // Fallback to primary owned workspace or first workspace user belongs to
  const defaultWs = db.prepare('SELECT * FROM workspaces WHERE user_id = ? ORDER BY created_at ASC LIMIT 1').get(userId) as DbWorkspace | undefined;
  if (defaultWs) return defaultWs;

  const memberWs = db.prepare(`
    SELECT w.* FROM workspaces w
    JOIN workspace_members m ON w.id = m.workspace_id
    WHERE m.user_id = ? AND m.status = 'active'
    ORDER BY m.created_at ASC LIMIT 1
  `).get(userId) as DbWorkspace | undefined;

  if (memberWs) return memberWs;

  // Auto-seed primary default workspace for new user if no workspace exists yet
  const now = new Date().toISOString();
  const wsId = `ws_${crypto.randomUUID()}`;
  const slug = `workspace-${crypto.randomBytes(4).toString('hex')}`;

  db.prepare(`
    INSERT INTO workspaces (id, user_id, name, slug, business_type, created_at, updated_at)
    VALUES (?, ?, 'My Workspace', ?, 'SaaS', ?, ?)
  `).run(wsId, userId, slug, now, now);

  // Seed owner as workspace member
  db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
  `).run(crypto.randomUUID(), wsId, userId, now, now, now);

  return db.prepare('SELECT * FROM workspaces WHERE id = ?').get(wsId) as DbWorkspace;
}

// Get user role in workspace ('owner', 'admin', 'member')
export function getUserWorkspaceRole(userId: string, workspace: DbWorkspace): 'owner' | 'admin' | 'member' {
  if (workspace.user_id === userId) return 'owner';
  const member = db.prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspace.id, userId) as { role: string } | undefined;
  if (member) {
    if (member.role === 'owner') return 'owner';
    if (member.role === 'admin') return 'admin';
  }
  return 'member';
}

// Ensure workspace subscription exists (auto-seed Free plan subscription if missing)
export function getOrCreateWorkspaceSubscription(workspaceId: string): { subscription: DbSubscription; plan: DbPlan; limits: DbPlanLimits } {
  let sub = db.prepare('SELECT * FROM subscriptions WHERE workspace_id = ?').get(workspaceId) as DbSubscription | undefined;

  const now = new Date();
  if (!sub) {
    const periodStart = now.toISOString();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
    const subId = `sub_${crypto.randomUUID()}`;

    db.prepare(`
      INSERT INTO subscriptions (
        id, workspace_id, stripe_customer_id, stripe_subscription_id, plan_id, status,
        billing_interval, current_period_start, current_period_end, cancel_at_period_end,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'free', 'active', 'monthly', ?, ?, 0, ?, ?)
    `).run(subId, workspaceId, `cus_mock_${workspaceId.substring(0, 8)}`, `sub_mock_${workspaceId.substring(0, 8)}`, periodStart, periodEnd, periodStart, periodStart);

    sub = db.prepare('SELECT * FROM subscriptions WHERE workspace_id = ?').get(workspaceId) as DbSubscription;
  }

  let plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(sub.plan_id) as DbPlan | undefined;
  if (!plan) {
    plan = db.prepare("SELECT * FROM plans WHERE id = 'free'").get() as DbPlan;
  }

  let limits: DbPlanLimits;
  try {
    limits = JSON.parse(plan.limits);
  } catch {
    limits = {
      max_agents: 1,
      max_members: 2,
      max_conversations: 100,
      max_knowledge_sources: 2,
      max_channels: 1,
      ai_usage_limit: 1000,
      storage_mb: 100,
    };
  }

  return { subscription: sub, plan, limits };
}

// Aggregates real current usage from database for a workspace
export function getWorkspaceUsageMetrics(workspaceId: string, currentPeriodStart?: string) {
  // 1. AI Agents Count
  const agentsCount = (db.prepare('SELECT COUNT(*) as count FROM ai_assistants WHERE workspace_id = ?').get(workspaceId) as { count: number }).count;

  // 2. Team Members Count (active workspace members + pending invitations)
  const activeMembersCount = (db.prepare("SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND status = 'active'").get(workspaceId) as { count: number }).count;
  const pendingInvitesCount = (db.prepare("SELECT COUNT(*) as count FROM workspace_invitations WHERE workspace_id = ? AND status = 'pending'").get(workspaceId) as { count: number }).count;
  const totalTeamMembers = Math.max(1, activeMembersCount) + pendingInvitesCount;

  // 3. Conversations handled in current period
  let periodStart = currentPeriodStart;
  if (!periodStart) {
    // Default to start of current month if not passed
    const now = new Date();
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  const conversationsCount = (db.prepare(`
    SELECT COUNT(*) as count FROM conversations
    WHERE workspace_id = ? AND created_at >= ?
  `).get(workspaceId, periodStart) as { count: number }).count;

  // 4. Knowledge Sources Count
  const knowledgeSourcesCount = (db.prepare('SELECT COUNT(*) as count FROM knowledge_sources WHERE workspace_id = ?').get(workspaceId) as { count: number }).count;

  // 5. Channels Count
  const channelsCount = (db.prepare("SELECT COUNT(*) as count FROM channels WHERE workspace_id = ? AND status = 'connected'").get(workspaceId) as { count: number }).count;

  return {
    agents: agentsCount,
    teamMembers: totalTeamMembers,
    conversations: conversationsCount,
    knowledgeSources: knowledgeSourcesCount,
    channels: channelsCount,
  };
}

// Downgrade compatibility validator
export function validateDowngradeResources(workspaceId: string, targetPlanId: string) {
  const targetPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(targetPlanId) as DbPlan | undefined;
  if (!targetPlan) {
    return { compatible: false, conflicts: [{ resource: 'Plan', current: 0, allowed: 0, message: 'Invalid target plan' }] };
  }

  const targetLimits: DbPlanLimits = JSON.parse(targetPlan.limits);
  const usage = getWorkspaceUsageMetrics(workspaceId);

  const conflicts: Array<{ resource: string; current: number; allowed: number; message: string }> = [];

  if (targetLimits.max_agents !== -1 && usage.agents > targetLimits.max_agents) {
    conflicts.push({
      resource: 'AI Agents',
      current: usage.agents,
      allowed: targetLimits.max_agents,
      message: `You currently have ${usage.agents} AI Agents, but the ${targetPlan.name} plan only permits ${targetLimits.max_agents}.`,
    });
  }

  if (targetLimits.max_members !== -1 && usage.teamMembers > targetLimits.max_members) {
    conflicts.push({
      resource: 'Team Members',
      current: usage.teamMembers,
      allowed: targetLimits.max_members,
      message: `You currently have ${usage.teamMembers} Team Members/Invites, but the ${targetPlan.name} plan only permits ${targetLimits.max_members}.`,
    });
  }

  if (targetLimits.max_knowledge_sources !== -1 && usage.knowledgeSources > targetLimits.max_knowledge_sources) {
    conflicts.push({
      resource: 'Knowledge Base Sources',
      current: usage.knowledgeSources,
      allowed: targetLimits.max_knowledge_sources,
      message: `You currently have ${usage.knowledgeSources} Knowledge Sources, but the ${targetPlan.name} plan only permits ${targetLimits.max_knowledge_sources}.`,
    });
  }

  if (targetLimits.max_channels !== -1 && usage.channels > targetLimits.max_channels) {
    conflicts.push({
      resource: 'Connected Channels',
      current: usage.channels,
      allowed: targetLimits.max_channels,
      message: `You currently have ${usage.channels} Connected Channels, but the ${targetPlan.name} plan only permits ${targetLimits.max_channels}.`,
    });
  }

  return {
    compatible: conflicts.length === 0,
    conflicts,
  };
}

// Plan Limit Enforcement Middleware for AI Agents
export const checkAiAgentLimit = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  const ws = getWorkspaceForUser(req.user.id, (req.query.workspaceId || req.body.workspaceId) as string);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });

  const { limits } = getOrCreateWorkspaceSubscription(ws.id);
  if (limits.max_agents === -1) return next();

  const currentCount = (db.prepare('SELECT COUNT(*) as count FROM ai_assistants WHERE workspace_id = ?').get(ws.id) as { count: number }).count;
  if (currentCount >= limits.max_agents) {
    return res.status(403).json({
      error: `AI Agent limit reached (${currentCount}/${limits.max_agents}). Upgrade your plan to create more agents.`,
      code: 'PLAN_LIMIT_REACHED',
      limitType: 'max_agents',
      current: currentCount,
      allowed: limits.max_agents,
    });
  }

  next();
};

// Plan Limit Enforcement Middleware for Team Members
export const checkTeamMemberLimit = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  const ws = getWorkspaceForUser(req.user.id, (req.query.workspaceId || req.body.workspaceId) as string);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });

  const { limits } = getOrCreateWorkspaceSubscription(ws.id);
  if (limits.max_members === -1) return next();

  const activeMembersCount = (db.prepare("SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND status = 'active'").get(ws.id) as { count: number }).count;
  const pendingInvitesCount = (db.prepare("SELECT COUNT(*) as count FROM workspace_invitations WHERE workspace_id = ? AND status = 'pending'").get(ws.id) as { count: number }).count;
  const total = Math.max(1, activeMembersCount) + pendingInvitesCount;

  if (total >= limits.max_members) {
    return res.status(403).json({
      error: `Team Member limit reached (${total}/${limits.max_members}). Upgrade your plan to invite more team members.`,
      code: 'PLAN_LIMIT_REACHED',
      limitType: 'max_members',
      current: total,
      allowed: limits.max_members,
    });
  }

  next();
};

// Plan Limit Enforcement Middleware for Knowledge Base Sources
export const checkKnowledgeLimit = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  const ws = getWorkspaceForUser(req.user.id, (req.query.workspaceId || req.body.workspaceId) as string);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });

  const { limits } = getOrCreateWorkspaceSubscription(ws.id);
  if (limits.max_knowledge_sources === -1) return next();

  const currentCount = (db.prepare('SELECT COUNT(*) as count FROM knowledge_sources WHERE workspace_id = ?').get(ws.id) as { count: number }).count;
  if (currentCount >= limits.max_knowledge_sources) {
    return res.status(403).json({
      error: `Knowledge Base limit reached (${currentCount}/${limits.max_knowledge_sources}). Upgrade your plan to add more knowledge sources.`,
      code: 'PLAN_LIMIT_REACHED',
      limitType: 'max_knowledge_sources',
      current: currentCount,
      allowed: limits.max_knowledge_sources,
    });
  }

  next();
};

// Plan Limit Enforcement Middleware for Channels
export const checkChannelLimit = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  const ws = getWorkspaceForUser(req.user.id, (req.query.workspaceId || req.body.workspaceId) as string);
  if (!ws) return res.status(404).json({ error: 'Workspace not found.' });

  const { limits } = getOrCreateWorkspaceSubscription(ws.id);
  if (limits.max_channels === -1) return next();

  const currentCount = (db.prepare("SELECT COUNT(*) as count FROM channels WHERE workspace_id = ? AND status = 'connected'").get(ws.id) as { count: number }).count;
  if (currentCount >= limits.max_channels) {
    return res.status(403).json({
      error: `Channel limit reached (${currentCount}/${limits.max_channels}). Upgrade your plan to connect more channels.`,
      code: 'PLAN_LIMIT_REACHED',
      limitType: 'max_channels',
      current: currentCount,
      allowed: limits.max_channels,
    });
  }

  next();
};
