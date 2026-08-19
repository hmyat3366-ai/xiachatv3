import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, DbUser, DbWorkspace, DbUserSettings, DbWorkspaceAISettings } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';

// GET /api/settings/me
export const getUserSettingsOverview = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const user = db.prepare('SELECT id, name, email, auth_provider, job_title, phone, created_at, last_login_at FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);

    // Fetch user notification preferences
    const dbUserSettings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id) as DbUserSettings | undefined;
    let notificationPreferences = {
      emailAssignedToMe: true,
      emailCustomerReplied: true,
      emailAiHandoff: true,
      emailTeamInvitation: true,
      emailChannelDisconnected: true,
      emailSystemAlerts: true,
      browserNewConversation: true,
      browserAiHandoff: true,
      browserMention: true,
      browserAssignment: true,
    };

    if (dbUserSettings?.notification_preferences) {
      try {
        notificationPreferences = { ...notificationPreferences, ...JSON.parse(dbUserSettings.notification_preferences) };
      } catch (e) {
        // Use defaults if parse fails
      }
    }

    // Fetch workspace AI defaults
    let aiDefaults = {
      defaultStyle: 'balanced',
      defaultTone: 'friendly',
      enableHandoff: true,
      safetyKnowledgeOnly: true,
      safetyNoHallucination: true,
    };

    if (workspace) {
      const dbAiSettings = db.prepare('SELECT * FROM workspace_ai_settings WHERE workspace_id = ?').get(workspace.id) as DbWorkspaceAISettings | undefined;
      if (dbAiSettings) {
        aiDefaults = {
          defaultStyle: dbAiSettings.default_style || 'balanced',
          defaultTone: dbAiSettings.default_tone || 'friendly',
          enableHandoff: Boolean(dbAiSettings.enable_handoff),
          safetyKnowledgeOnly: Boolean(dbAiSettings.safety_knowledge_only),
          safetyNoHallucination: Boolean(dbAiSettings.safety_no_hallucination),
        };
      }
    }

    return res.status(200).json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        authProvider: user.auth_provider,
        jobTitle: user.job_title || 'Support Lead',
        phone: user.phone || '+1 (555) 019-2834',
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
      notifications: notificationPreferences,
      aiDefaults,
      workspace: workspace ? { id: workspace.id, name: workspace.name, slug: workspace.slug } : null,
    });
  } catch (err) {
    console.error('Error fetching settings overview:', err);
    return res.status(500).json({ error: 'Failed to fetch user settings.' });
  }
};

// PUT /api/settings/profile
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { name, jobTitle, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users
      SET name = ?, job_title = ?, phone = ?, updated_at = ?
      WHERE id = ?
    `).run(name.trim(), jobTitle || null, phone || null, now, req.user.id);

    return res.status(200).json({
      success: true,
      profile: {
        id: req.user.id,
        name: name.trim(),
        email: req.user.email,
        jobTitle,
        phone,
      },
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    return res.status(500).json({ error: 'Failed to save profile changes.' });
  }
};

// PUT /api/settings/notifications
export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const preferences = req.body;
    const prefJson = JSON.stringify(preferences);
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT user_id FROM user_settings WHERE user_id = ?').get(req.user.id);
    if (existing) {
      db.prepare('UPDATE user_settings SET notification_preferences = ?, updated_at = ? WHERE user_id = ?').run(prefJson, now, req.user.id);
    } else {
      db.prepare('INSERT INTO user_settings (user_id, notification_preferences, created_at, updated_at) VALUES (?, ?, ?, ?)').run(req.user.id, prefJson, now, now);
    }

    return res.status(200).json({ success: true, preferences });
  } catch (err) {
    console.error('Error updating notification preferences:', err);
    return res.status(500).json({ error: 'Failed to save notification preferences.' });
  }
};

// POST /api/settings/change-password
export const changeUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const user = db.prepare('SELECT password_hash, auth_provider FROM users WHERE id = ?').get(req.user.id) as DbUser | undefined;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.auth_provider === 'google' && !user.password_hash) {
      return res.status(400).json({ error: 'Google authenticated accounts do not use local passwords.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash || '');
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password entered is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, req.user.id);

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
};

// PUT /api/settings/ai-defaults
export const updateWorkspaceAIDefaults = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const { defaultStyle, defaultTone, enableHandoff, safetyKnowledgeOnly, safetyNoHallucination } = req.body;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT workspace_id FROM workspace_ai_settings WHERE workspace_id = ?').get(workspace.id);
    if (existing) {
      db.prepare(`
        UPDATE workspace_ai_settings
        SET default_style = ?, default_tone = ?, enable_handoff = ?, safety_knowledge_only = ?, safety_no_hallucination = ?, updated_at = ?
        WHERE workspace_id = ?
      `).run(defaultStyle || 'balanced', defaultTone || 'friendly', enableHandoff ? 1 : 0, safetyKnowledgeOnly ? 1 : 0, safetyNoHallucination ? 1 : 0, now, workspace.id);
    } else {
      db.prepare(`
        INSERT INTO workspace_ai_settings (workspace_id, default_style, default_tone, enable_handoff, safety_knowledge_only, safety_no_hallucination, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(workspace.id, defaultStyle || 'balanced', defaultTone || 'friendly', enableHandoff ? 1 : 0, safetyKnowledgeOnly ? 1 : 0, safetyNoHallucination ? 1 : 0, now);
    }

    return res.status(200).json({
      success: true,
      aiDefaults: { defaultStyle, defaultTone, enableHandoff, safetyKnowledgeOnly, safetyNoHallucination },
    });
  } catch (err) {
    console.error('Error updating workspace AI defaults:', err);
    return res.status(500).json({ error: 'Failed to save workspace AI defaults.' });
  }
};

// GET /api/settings/export-user-data.json
export const exportUserDataJSON = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const user = db.prepare('SELECT id, name, email, auth_provider, created_at, updated_at, last_login_at FROM users WHERE id = ?').get(req.user.id);
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);

    const exportData = {
      exportMetadata: {
        platform: 'Xia Chat AI Customer Platform',
        exportedAt: new Date().toISOString(),
        userAccountId: req.user.id,
      },
      userProfile: user,
      workspace: workspace ? { id: workspace.id, name: workspace.name, slug: workspace.slug } : null,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="xiachat_user_data_${req.user.id.slice(0, 8)}.json"`);
    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error('Error exporting user data JSON:', err);
    return res.status(500).json({ error: 'Failed to export user account data.' });
  }
};

// DELETE /api/settings/account
export const deleteUserAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { confirmText, currentPassword } = req.body;
    if (confirmText !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation string "DELETE" is required.' });
    }

    const user = db.prepare('SELECT password_hash, auth_provider FROM users WHERE id = ?').get(req.user.id) as DbUser | undefined;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.auth_provider === 'local' && user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to confirm account deletion.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Incorrect password entered.' });
      }
    }

    // Perform account deletion
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    res.clearCookie('xiachat_token');

    return res.status(200).json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user account:', err);
    return res.status(500).json({ error: 'Failed to delete user account.' });
  }
};
