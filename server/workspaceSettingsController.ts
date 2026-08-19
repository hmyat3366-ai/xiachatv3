import { Response } from 'express';
import { db, DbWorkspace } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';

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
