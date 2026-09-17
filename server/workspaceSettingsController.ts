import { Response } from 'express';
import { db, DbWorkspace } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser, getUserWorkspaceRole } from './planLimitMiddleware.js';

// GET /api/settings/workspace
export const getWorkspaceSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    return res.status(200).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description || 'AI-powered customer communication platform',
        logoUrl: workspace.logo_url || null,
        timezone: workspace.timezone || 'Asia/Yangon',
        language: workspace.language || 'English',
        createdAt: workspace.created_at,
        updatedAt: workspace.updated_at,
      },
    });
  } catch (err) {
    console.error('Error fetching workspace settings:', err);
    return res.status(500).json({ error: 'Failed to fetch workspace settings.' });
  }
};

// PUT /api/settings/workspace
export const updateWorkspaceSettings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const { name, description, logoUrl, timezone, language } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE workspaces
      SET name = ?, description = ?, logo_url = ?, timezone = ?, language = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name.trim(),
      description !== undefined ? description : workspace.description,
      logoUrl !== undefined ? logoUrl : workspace.logo_url,
      timezone || workspace.timezone || 'Asia/Yangon',
      language || workspace.language || 'English',
      now,
      workspace.id
    );

    return res.status(200).json({
      success: true,
      workspace: {
        id: workspace.id,
        name: name.trim(),
        slug: workspace.slug,
        description,
        logoUrl,
        timezone,
        language,
      },
    });
  } catch (err) {
    console.error('Error updating workspace settings:', err);
    return res.status(500).json({ error: 'Failed to save workspace settings.' });
  }
};

// DELETE /api/settings/workspace
export const deleteWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Check user role: only owner can delete workspace
    const role = getUserWorkspaceRole(req.user.id, workspace);
    if (role !== 'owner') {
      return res.status(403).json({ error: 'Only the workspace owner can delete this workspace.' });
    }

    // Safety check: Ensure user has at least one other workspace
    const userWorkspaces = db.prepare(`
      SELECT DISTINCT w.id FROM workspaces w
      LEFT JOIN workspace_members m ON w.id = m.workspace_id
      WHERE w.user_id = ? OR (m.user_id = ? AND m.status = 'active')
    `).all(req.user.id, req.user.id) as { id: string }[];

    if (userWorkspaces.length <= 1) {
      return res.status(400).json({
        error: 'Cannot delete your only remaining workspace. You must have at least one active workspace in your account.',
      });
    }

    const wsId = workspace.id;

    // Purge team chat messages, participants, conversations
    db.prepare('DELETE FROM team_messages WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM team_conversation_participants WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM team_conversations WHERE workspace_id = ?').run(wsId);

    // Purge customer identities, notes, customers
    db.prepare('DELETE FROM customer_identities WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM customer_notes WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM customers WHERE workspace_id = ?').run(wsId);

    // Purge inbox messages & conversations
    db.prepare(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE workspace_id = ?
      )
    `).run(wsId);
    db.prepare('DELETE FROM conversations WHERE workspace_id = ?').run(wsId);

    // Purge knowledge chunks & sources
    db.prepare('DELETE FROM knowledge_chunks WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM knowledge_sources WHERE workspace_id = ?').run(wsId);

    // Purge channels & AI assistants & AI settings
    db.prepare('DELETE FROM channels WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM ai_assistants WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM workspace_ai_settings WHERE workspace_id = ?').run(wsId);

    // Purge billing events, invoices, subscriptions, audit logs
    db.prepare('DELETE FROM billing_events WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM invoices WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM team_audit_logs WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM subscriptions WHERE workspace_id = ?').run(wsId);

    // Purge invitations and members
    db.prepare('DELETE FROM workspace_invitations WHERE workspace_id = ?').run(wsId);
    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ?').run(wsId);

    // Finally delete the workspace row
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(wsId);

    return res.status(200).json({
      success: true,
      message: 'Workspace and all associated resources deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting workspace:', err);
    return res.status(500).json({ error: 'Failed to delete workspace.' });
  }
};

