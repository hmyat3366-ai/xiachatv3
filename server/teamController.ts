import { Request, Response } from 'express';
import crypto from 'crypto';
import { db, DbWorkspace, DbWorkspaceMember, DbWorkspaceInvitation, DbUser } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser, getUserWorkspaceRole } from './planLimitMiddleware.js';

// Auto-seed workspace owner as primary team member if workspace_members is empty
function ensureSeedTeamOwner(workspaceId: string, ownerUserId: string) {
  const count = (db.prepare('SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ?').get(workspaceId) as { count: number }).count;

  if (count === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
      VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
    `).run(crypto.randomUUID(), workspaceId, ownerUserId, now, now, now);
  }
}

// GET /api/team/members
export const getTeamMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace || (requestedWsId && workspace.id !== requestedWsId)) {
      return res.status(403).json({ error: 'Access denied to requested workspace.' });
    }

    ensureSeedTeamOwner(workspace.id, workspace.user_id);

    const actorRole = getUserWorkspaceRole(req.user.id, workspace);
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const filter = ((req.query.filter as string) || 'all').toLowerCase();

    // Query active members with user profile metadata
    const rawMembers = db.prepare(`
      SELECT m.*, u.name, u.email, u.last_login_at
      FROM workspace_members m
      JOIN users u ON m.user_id = u.id
      WHERE m.workspace_id = ?
      ORDER BY m.created_at ASC
    `).all(workspace.id) as Array<DbWorkspaceMember & { name: string; email: string; last_login_at: string }>;

    let members = rawMembers.map((m) => ({
      id: m.id,
      userId: m.user_id,
      workspaceId: m.workspace_id,
      name: m.name,
      email: m.email,
      avatar: m.name.charAt(0).toUpperCase(),
      role: m.role, // 'owner' | 'admin' | 'member'
      status: m.status, // 'active' | 'pending' | 'suspended'
      joinedAt: m.joined_at,
      lastActiveAt: m.last_login_at || m.joined_at,
      isCurrentUser: m.user_id === req.user?.id,
    }));

    // Query pending invitations
    const rawInvitations = db.prepare(`
      SELECT * FROM workspace_invitations
      WHERE workspace_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).all(workspace.id) as DbWorkspaceInvitation[];

    const invitations = rawInvitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: new Date(inv.expires_at).getTime() < Date.now() ? 'expired' : inv.status,
      invitedByName: inv.invited_by_name,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
    }));

    // Search filter
    if (search) {
      members = members.filter(
        (m) => m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search)
      );
    }

    // Role / status filter
    if (filter === 'active') {
      members = members.filter((m) => m.status === 'active');
    } else if (filter === 'inactive' || filter === 'suspended') {
      members = members.filter((m) => m.status === 'suspended' || m.status === 'inactive');
    } else if (filter === 'admins') {
      members = members.filter((m) => m.role === 'owner' || m.role === 'admin');
    } else if (filter === 'managers') {
      members = members.filter((m) => m.role === 'manager');
    } else if (filter === 'support') {
      members = members.filter((m) => m.role === 'support');
    } else if (filter === 'members') {
      members = members.filter((m) => m.role === 'member');
    }

    return res.status(200).json({
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, ownerUserId: workspace.user_id },
      actorRole,
      members,
      invitations,
      stats: {
        totalMembers: members.length,
        activeMembers: members.filter((m) => m.status === 'active').length,
        pendingInvitations: invitations.length,
      },
    });
  } catch (err) {
    console.error('Error fetching team members:', err);
    return res.status(500).json({ error: 'Failed to fetch workspace team members.' });
  }
};

// Audit Log Helper
export function logTeamAudit(
  workspaceId: string,
  actorId: string,
  actorName: string,
  action: string,
  targetId: string,
  targetName: string,
  details: string
) {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO team_audit_logs (id, workspace_id, actor_id, actor_name, action, target_id, target_name, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), workspaceId, actorId, actorName, action, targetId, targetName, details, now);
  } catch (err) {
    console.error('Error recording team audit log:', err);
  }
}

// GET /api/team/audit-logs
export const getTeamAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace || (requestedWsId && workspace.id !== requestedWsId)) {
      return res.status(403).json({ error: 'Access denied to requested workspace.' });
    }

    const logs = db.prepare(`
      SELECT * FROM team_audit_logs
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(workspace.id);

    return res.status(200).json({ logs });
  } catch (err) {
    console.error('Error fetching team audit logs:', err);
    return res.status(500).json({ error: 'Failed to fetch team audit logs.' });
  }
};

// POST /api/team/invitations
export const inviteTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { email, role, message } = req.body;
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const actorRole = getUserWorkspaceRole(req.user.id, workspace);
    if (actorRole === 'member') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can invite team members.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user is already a workspace member
    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail) as DbUser | undefined;
    if (existingUser) {
      const isMember = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspace.id, existingUser.id);
      if (isMember) {
        return res.status(400).json({ error: 'This person is already a member.' });
      }
    }

    // Check if pending invitation already exists
    const existingInvite = db.prepare("SELECT id FROM workspace_invitations WHERE workspace_id = ? AND LOWER(email) = ? AND status = 'pending'").get(workspace.id, cleanEmail);
    if (existingInvite) {
      return res.status(400).json({ error: 'An invitation has already been sent to this email.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString(); // 7 Days expiration
    const inviteId = crypto.randomUUID();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    db.prepare(`
      INSERT INTO workspace_invitations (
        id, workspace_id, email, role, token_hash, invited_by_id, invited_by_name, status, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      inviteId,
      workspace.id,
      cleanEmail,
      role === 'admin' ? 'admin' : 'member',
      tokenHash,
      req.user.id,
      req.user.name,
      expiresAt,
      now.toISOString()
    );

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${cleanEmail}.`,
      invitationId: inviteId,
      inviteToken: rawToken,
      inviteUrl: `/accept-invite?token=${rawToken}`,
    });
  } catch (err) {
    console.error('Error sending team invitation:', err);
    return res.status(500).json({ error: 'Failed to send team invitation.' });
  }
};

// POST /api/team/invitations/:id/resend
export const resendInvitation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const inviteId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const actorRole = getUserWorkspaceRole(req.user.id, workspace);
    if (actorRole === 'member') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can manage invitations.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();

    const result = db.prepare("UPDATE workspace_invitations SET expires_at = ?, created_at = ? WHERE id = ? AND workspace_id = ? AND status = 'pending'").run(
      expiresAt,
      now.toISOString(),
      inviteId,
      workspace.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Pending invitation not found.' });
    }

    return res.status(200).json({ success: true, message: 'Invitation sent.' });
  } catch (err) {
    console.error('Error resending invitation:', err);
    return res.status(500).json({ error: 'Failed to resend invitation.' });
  }
};

// DELETE /api/team/invitations/:id
export const cancelInvitation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const inviteId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const actorRole = getUserWorkspaceRole(req.user.id, workspace);
    if (actorRole === 'member') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can cancel invitations.' });
    }

    db.prepare("UPDATE workspace_invitations SET status = 'cancelled', cancelled_at = ? WHERE id = ? AND workspace_id = ?").run(
      new Date().toISOString(),
      inviteId,
      workspace.id
    );

    return res.status(200).json({ success: true, message: 'Invitation cancelled.' });
  } catch (err) {
    console.error('Error cancelling invitation:', err);
    return res.status(500).json({ error: 'Failed to cancel invitation.' });
  }
};

// PUT /api/team/members/:id/role
export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const memberId = req.params.id;
    const { role, isTransferOwner } = req.body;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace || (requestedWsId && workspace.id !== requestedWsId)) {
      return res.status(403).json({ error: 'Access denied to requested workspace.' });
    }

    const actorRole = getUserWorkspaceRole(req.user.id, workspace);
    if (actorRole === 'member' || actorRole === 'support') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can update member roles.' });
    }

    const member = db.prepare('SELECT * FROM workspace_members WHERE id = ? AND workspace_id = ?').get(memberId, workspace.id) as DbWorkspaceMember | undefined;
    if (!member) return res.status(404).json({ error: 'Team member not found.' });

    const targetUser = db.prepare('SELECT name FROM users WHERE id = ?').get(member.user_id) as { name: string } | undefined;
    const targetName = targetUser?.name || 'Member';

    // Protect Workspace Owner
    if (member.role === 'owner' || member.user_id === workspace.user_id) {
      if (workspace.user_id !== req.user.id || (!isTransferOwner && role !== 'owner')) {
        return res.status(403).json({ error: 'Cannot downgrade or modify the workspace Owner. Transfer ownership first.' });
      }
    }

    // Admin cannot modify another Admin's position (only Owner can)
    if (actorRole === 'admin' && member.role === 'admin' && member.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the workspace Owner can modify an Admin.' });
    }

    const now = new Date().toISOString();

    // Dedicated Owner Transfer Flow
    if (role === 'owner' || isTransferOwner) {
      if (workspace.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Only the current workspace Owner can transfer ownership.' });
      }

      // Demote current owner to Admin and promote target member to Owner
      db.prepare('UPDATE workspaces SET user_id = ?, updated_at = ? WHERE id = ?').run(member.user_id, now, workspace.id);
      db.prepare("UPDATE workspace_members SET role = 'admin', updated_at = ? WHERE workspace_id = ? AND user_id = ?").run(now, workspace.id, req.user.id);
      db.prepare("UPDATE workspace_members SET role = 'owner', updated_at = ? WHERE id = ? AND workspace_id = ?").run(now, memberId, workspace.id);

      logTeamAudit(workspace.id, req.user.id, req.user.name, 'owner_transferred', member.user_id, targetName, 'Transferred workspace ownership');

      return res.status(200).json({ success: true, message: 'Workspace ownership transferred successfully.' });
    }

    // Supported positions: admin, manager, support, member
    const allowedRoles = ['admin', 'manager', 'support', 'member'];
    const validRole = allowedRoles.includes(role) ? role : 'member';

    db.prepare('UPDATE workspace_members SET role = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').run(validRole, now, memberId, workspace.id);

    logTeamAudit(
      workspace.id,
      req.user.id,
      req.user.name,
      'position_changed',
      member.user_id,
      targetName,
      `Position updated from ${member.role} to ${validRole}`
    );

    return res.status(200).json({ success: true, message: 'Position updated successfully.' });
  } catch (err) {
    console.error('Error updating member role:', err);
    return res.status(500).json({ error: 'Failed to update member position.' });
  }
};

// PUT /api/team/members/:id/status (Deactivate / Reactivate)
export const toggleMemberStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const memberId = req.params.id;
    const { status } = req.body; // 'suspended' | 'active' | 'inactive'
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace || (requestedWsId && workspace.id !== requestedWsId)) {
      return res.status(403).json({ error: 'Access denied to requested workspace.' });
    }

    const actorRole = getUserWorkspaceRole(req.user.id, workspace);
    if (actorRole === 'member' || actorRole === 'support') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can manage member status.' });
    }

    const member = db.prepare('SELECT * FROM workspace_members WHERE id = ? AND workspace_id = ?').get(memberId, workspace.id) as DbWorkspaceMember | undefined;
    if (!member) return res.status(404).json({ error: 'Team member not found.' });

    const targetUser = db.prepare('SELECT name FROM users WHERE id = ?').get(member.user_id) as { name: string } | undefined;
    const targetName = targetUser?.name || 'Member';

    // Protect Workspace Owner from deactivation
    if (member.role === 'owner' || member.user_id === workspace.user_id) {
      return res.status(403).json({ error: 'Cannot deactivate the primary workspace Owner.' });
    }

    // Admin cannot deactivate another Admin
    if (actorRole === 'admin' && member.role === 'admin') {
      return res.status(403).json({ error: 'Only the workspace Owner can deactivate an Admin.' });
    }

    const targetStatus = status === 'active' ? 'active' : 'suspended';
    const now = new Date().toISOString();

    db.prepare('UPDATE workspace_members SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').run(
      targetStatus,
      now,
      memberId,
      workspace.id
    );

    const actionName = targetStatus === 'suspended' ? 'member_deactivated' : 'member_reactivated';
    const detailMsg = targetStatus === 'suspended' ? 'Deactivated member access' : 'Reactivated member access';

    logTeamAudit(workspace.id, req.user.id, req.user.name, actionName, member.user_id, targetName, detailMsg);

    return res.status(200).json({
      success: true,
      message: targetStatus === 'suspended' ? 'Member deactivated.' : 'Member reactivated.',
    });
  } catch (err) {
    console.error('Error toggling member status:', err);
    return res.status(500).json({ error: 'Failed to update member status.' });
  }
};

// DELETE /api/team/members/:id
export const removeTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const memberId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace || (requestedWsId && workspace.id !== requestedWsId)) {
      return res.status(403).json({ error: 'Access denied to requested workspace.' });
    }

    const actorRole = getUserWorkspaceRole(req.user.id, workspace);
    if (actorRole === 'member' || actorRole === 'support') {
      return res.status(403).json({ error: 'Only workspace Owners and Admins can remove team members.' });
    }

    const member = db.prepare('SELECT * FROM workspace_members WHERE id = ? AND workspace_id = ?').get(memberId, workspace.id) as DbWorkspaceMember | undefined;
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    const targetUser = db.prepare('SELECT name FROM users WHERE id = ?').get(member.user_id) as { name: string } | undefined;
    const targetName = targetUser?.name || 'Member';

    // Protect workspace Owner
    if (member.role === 'owner' || member.user_id === workspace.user_id) {
      return res.status(400).json({ error: 'Cannot remove the primary workspace Owner. Transfer ownership first.' });
    }

    // Admin cannot remove another admin (only Owner can remove admins)
    if (actorRole === 'admin' && member.role === 'admin') {
      return res.status(403).json({ error: 'Only the workspace Owner can remove an Admin.' });
    }

    // Remove workspace membership only (retaining past messages & customer history)
    db.prepare('DELETE FROM workspace_members WHERE id = ? AND workspace_id = ?').run(memberId, workspace.id);

    logTeamAudit(workspace.id, req.user.id, req.user.name, 'member_removed', member.user_id, targetName, 'Removed member from workspace');

    return res.status(200).json({ success: true, message: 'Team member removed from workspace.' });
  } catch (err) {
    console.error('Error removing team member:', err);
    return res.status(500).json({ error: 'Failed to remove team member.' });
  }
};

// POST /api/team/invitations/accept
export const acceptInvitation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invitation token is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = db.prepare("SELECT * FROM workspace_invitations WHERE token_hash = ? AND status = 'pending'").get(tokenHash) as DbWorkspaceInvitation | undefined;

    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invitation token.' });
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      db.prepare("UPDATE workspace_invitations SET status = 'expired' WHERE id = ?").run(invite.id);
      return res.status(400).json({ error: 'Invitation has expired.' });
    }

    const now = new Date().toISOString();

    // Check if user is already a member
    const existingMember = db.prepare('SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(invite.workspace_id, req.user.id);

    if (!existingMember) {
      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(crypto.randomUUID(), invite.workspace_id, req.user.id, invite.role, now, now, now);
    }

    db.prepare("UPDATE workspace_invitations SET status = 'accepted' WHERE id = ?").run(invite.id);

    return res.status(200).json({
      success: true,
      message: 'Invitation accepted! You are now a member of this workspace.',
      workspaceId: invite.workspace_id,
    });
  } catch (err) {
    console.error('Error accepting invitation:', err);
    return res.status(500).json({ error: 'Failed to accept invitation.' });
  }
};
