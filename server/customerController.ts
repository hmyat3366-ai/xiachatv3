import { Response } from 'express';
import crypto from 'crypto';
import { db, DbCustomer, DbCustomerNote, DbConversation, DbWorkspace } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';

// Auto-seed and sync customer contacts for workspace
function ensureSyncedCustomers(workspaceId: string) {
  // First check if customers table has any records for this workspace
  const custCountStmt = db.prepare('SELECT COUNT(*) as count FROM customers WHERE workspace_id = ?');
  const custCount = (custCountStmt.get(workspaceId) as { count: number }).count;

  if (custCount === 0) {
    const now = new Date().toISOString();
    const sampleCustomers = [
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com',
        phone: '+1 (555) 234-5678',
        company: 'Acme Corp',
        location: 'San Francisco, CA',
        avatar: 'S',
        status: 'active',
        tags: JSON.stringify(['VIP', 'Enterprise']),
        lastActiveAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        name: 'Michael Chen',
        email: 'm.chen@example.com',
        phone: '+1 (555) 876-5432',
        company: 'TechCorp',
        location: 'Austin, TX',
        avatar: 'M',
        status: 'active',
        tags: JSON.stringify(['High Value', 'Urgent']),
        lastActiveAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@example.com',
        phone: '+1 (555) 345-6789',
        company: 'Retail Group',
        location: 'Chicago, IL',
        avatar: 'E',
        status: 'active',
        tags: JSON.stringify(['Returning']),
        lastActiveAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        name: 'David Miller',
        email: 'dave.m@example.com',
        phone: '+1 (555) 987-6543',
        company: 'Global Logistics',
        location: 'New York, NY',
        avatar: 'D',
        status: 'active',
        tags: JSON.stringify(['Lead', 'Enterprise']),
        lastActiveAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        name: 'Sophia Martinez',
        email: 'sophia.m@example.com',
        phone: '+1 (555) 456-7890',
        company: 'Design Studio',
        location: 'Miami, FL',
        avatar: 'S',
        status: 'new',
        tags: JSON.stringify(['New Customer']),
        lastActiveAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
    ];

    const insertCust = db.prepare(`
      INSERT INTO customers (
        id, workspace_id, name, email, phone, company, location, avatar, status, tags, created_at, updated_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleCustomers.forEach((c) => {
      const custId = crypto.randomUUID();
      insertCust.run(
        custId,
        workspaceId,
        c.name,
        c.email,
        c.phone,
        c.company,
        c.location,
        c.avatar,
        c.status,
        c.tags,
        now,
        now,
        c.lastActiveAt
      );

      if (c.name.includes('Sarah')) {
        db.prepare(`
          INSERT OR IGNORE INTO customer_notes (id, workspace_id, customer_id, author_id, author_name, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          workspaceId,
          custId,
          'user-1',
          'Alex Rivera',
          'Customer prefers email communication and requires enterprise SLA response times.',
          now,
          now
        );
      }
    });
  }

  // Also ensure seed conversations exist for workspace so Inbox & Customer history match
  const convCountStmt = db.prepare('SELECT COUNT(*) as count FROM conversations WHERE workspace_id = ?');
  const convCount = (convCountStmt.get(workspaceId) as { count: number }).count;
  if (convCount === 0) {
    const minMs = 60 * 1000;
    const sampleConversations = [
      {
        customer_name: 'Sarah Johnson',
        customer_email: 'sarah.j@example.com',
        channel: 'Website',
        status: 'ai',
        assignee: 'Xia AI',
        last_message: 'Can I change my delivery address for order #48291?',
        offsetMs: 2 * minMs,
      },
      {
        customer_name: 'Michael Chen',
        customer_email: 'm.chen@example.com',
        channel: 'Facebook',
        status: 'human',
        assignee: 'Alex Rivera',
        last_message: "I haven't received my order yet and tracking is stuck.",
        offsetMs: 8 * minMs,
      },
      {
        customer_name: 'Emily Davis',
        customer_email: 'emily.davis@example.com',
        channel: 'Website',
        status: 'resolved',
        assignee: 'Xia AI',
        last_message: "What's the return policy for international purchases?",
        offsetMs: 15 * minMs,
      },
      {
        customer_name: 'David Miller',
        customer_email: 'dave.m@example.com',
        channel: 'WhatsApp',
        status: 'human',
        assignee: null,
        last_message: 'Do you offer bulk discounts for 500+ licenses?',
        offsetMs: 27 * minMs,
      },
    ];

    const insertConv = db.prepare(`
      INSERT INTO conversations (
        id, workspace_id, customer_name, customer_email, channel, status, assignee,
        last_message, needs_attention, attention_reason, confidence_score, sentiment, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 0.95, 'neutral', ?, ?)
    `);

    sampleConversations.forEach((c) => {
      const nowIso = new Date(Date.now() - c.offsetMs).toISOString();
      insertConv.run(
        crypto.randomUUID(),
        workspaceId,
        c.customer_name,
        c.customer_email,
        c.channel,
        c.status,
        c.assignee,
        c.last_message,
        nowIso,
        nowIso
      );
    });
  }
}

// GET /api/customers
export const getCustomers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(200).json({ customers: [], total: 0, page: 1, totalPages: 1, stats: { total: 0, active: 0, new: 0, vip: 0 } });

    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const filter = ((req.query.filter as string) || 'all').toLowerCase();
    const sort = ((req.query.sort as string) || 'recently_active').toLowerCase();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 10));

    let rawCustomers = db.prepare(`
      SELECT * FROM customers
      WHERE workspace_id = ?
    `).all(workspace.id) as DbCustomer[];

    // Calculate aggregated conversation metrics per customer
    const allConvs = db.prepare(`
      SELECT id, workspace_id, customer_name, customer_email, status, channel, updated_at
      FROM conversations
      WHERE workspace_id = ?
    `).all(workspace.id) as DbConversation[];

    let customerList = rawCustomers.map((c) => {
      const matchedConvs = allConvs.filter(
        (conv) => (c.email && conv.customer_email === c.email) || conv.customer_name.toLowerCase() === c.name.toLowerCase()
      );

      const parsedTags: string[] = c.tags ? JSON.parse(c.tags) : [];
      const totalConversations = matchedConvs.length;
      const lastConv = matchedConvs[0] || null;

      return {
        id: c.id,
        workspaceId: c.workspace_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        location: c.location,
        avatar: c.avatar || c.name.charAt(0).toUpperCase(),
        status: c.status, // 'new' | 'active' | 'returning' | 'blocked'
        tags: parsedTags,
        totalConversations,
        lastConversation: lastConv ? { id: lastConv.id, channel: lastConv.channel, lastMessage: lastConv.last_message, status: lastConv.status } : null,
        lastActiveAt: c.last_active_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
    });

    // Stats calculations
    const stats = {
      total: customerList.length,
      active: customerList.filter((c) => c.status === 'active').length,
      new: customerList.filter((c) => c.status === 'new' || c.tags.includes('New Customer')).length,
      vip: customerList.filter((c) => c.tags.includes('VIP') || c.tags.includes('Enterprise')).length,
    };

    // Apply Filter
    if (filter === 'active') {
      customerList = customerList.filter((c) => c.status === 'active');
    } else if (filter === 'new') {
      customerList = customerList.filter((c) => c.status === 'new' || c.tags.includes('New Customer'));
    } else if (filter === 'returning') {
      customerList = customerList.filter((c) => c.totalConversations > 1);
    } else if (filter === 'vip') {
      customerList = customerList.filter((c) => c.tags.includes('VIP') || c.tags.includes('Enterprise'));
    }

    // Apply Search
    if (search) {
      customerList = customerList.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.email && c.email.toLowerCase().includes(search)) ||
          (c.phone && c.phone.toLowerCase().includes(search)) ||
          c.id.toLowerCase().includes(search)
      );
    }

    // Apply Sorting
    if (sort === 'recently_added') {
      customerList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'most_conversations') {
      customerList.sort((a, b) => b.totalConversations - a.totalConversations);
    } else if (sort === 'name_asc') {
      customerList.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'name_desc') {
      customerList.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      // Default: recently_active
      customerList.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
    }

    // Pagination
    const total = customerList.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedCustomers = customerList.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      customers: paginatedCustomers,
      total,
      page,
      totalPages,
      stats,
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ error: 'Failed to fetch customer list.' });
  }
};

// GET /api/customers/:id
export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const customerId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const c = db.prepare('SELECT * FROM customers WHERE id = ? AND workspace_id = ?').get(customerId, workspace.id) as DbCustomer | undefined;
    if (!c) return res.status(404).json({ error: 'Customer profile not found.' });

    // Fetch conversation history belonging to customer
    const conversations = db.prepare(`
      SELECT * FROM conversations
      WHERE workspace_id = ? AND (customer_email = ? OR LOWER(customer_name) = LOWER(?))
      ORDER BY updated_at DESC
    `).all(workspace.id, c.email, c.name) as DbConversation[];

    // Fetch internal workspace notes
    const rawNotes = db.prepare(`
      SELECT * FROM customer_notes
      WHERE customer_id = ? AND workspace_id = ?
      ORDER BY created_at DESC
    `).all(customerId, workspace.id) as DbCustomerNote[];

    const notes = rawNotes.map((n) => ({
      id: n.id,
      authorId: n.author_id,
      authorName: n.author_name,
      content: n.content,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    // Calculate metrics
    const totalConversations = conversations.length;
    const resolvedConversations = conversations.filter((conv) => conv.status === 'resolved' || conv.status === 'closed').length;
    const openConversations = conversations.filter((conv) => conv.status !== 'resolved' && conv.status !== 'closed').length;
    const aiHandled = conversations.filter((conv) => conv.status === 'ai' || conv.assignee === 'Xia AI').length;
    const humanHandled = conversations.filter((conv) => conv.status === 'human' || conv.status === 'assigned').length;

    // Derived Activity Timeline
    const activityTimeline = [
      { id: '1', title: 'Customer Created', description: `Registered profile via ${conversations[0]?.channel || 'Website'}`, timestamp: c.created_at, type: 'create' },
      ...conversations.map((conv) => ({
        id: `conv-${conv.id}`,
        title: `Started Conversation on ${conv.channel}`,
        description: `Last message: "${conv.last_message.slice(0, 50)}..."`,
        timestamp: conv.created_at,
        type: 'conversation',
      })),
    ];

    const parsedTags: string[] = c.tags ? JSON.parse(c.tags) : [];

    return res.status(200).json({
      customer: {
        id: c.id,
        workspaceId: c.workspace_id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        location: c.location,
        avatar: c.avatar || c.name.charAt(0).toUpperCase(),
        status: c.status,
        tags: parsedTags,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        lastActiveAt: c.last_active_at,
      },
      summary: {
        totalConversations,
        resolvedConversations,
        openConversations,
        aiHandled,
        humanHandled,
        lastActiveAt: c.last_active_at,
      },
      conversations: conversations.map((conv) => ({
        id: conv.id,
        channel: conv.channel,
        lastMessage: conv.last_message,
        status: conv.status,
        assignee: conv.assignee,
        confidenceScore: conv.confidence_score,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      })),
      notes,
      activityTimeline,
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    return res.status(500).json({ error: 'Failed to fetch customer profile.' });
  }
};

// POST /api/customers
export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { name, email, phone, company, location, tags } = req.body;
    if ((!name || !name.trim()) && (!email || !email.trim())) {
      return res.status(400).json({ error: 'Name or Email is required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Prevent duplicate customer creation for unique email within workspace
    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM customers WHERE workspace_id = ? AND LOWER(email) = ?').get(workspace.id, normalizedEmail) as { id: string } | undefined;
      if (existing) {
        return res.status(409).json({ error: 'A customer with this email address already exists in this workspace.' });
      }
    }

    const now = new Date().toISOString();
    const customerId = crypto.randomUUID();
    const parsedName = name && name.trim() ? name.trim() : email.split('@')[0];
    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(['New Customer']);
    const avatar = parsedName.charAt(0).toUpperCase();

    db.prepare(`
      INSERT INTO customers (
        id, workspace_id, name, email, phone, company, location, avatar, status, tags, created_at, updated_at, last_active_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)
    `).run(
      customerId,
      workspace.id,
      parsedName,
      email ? email.trim() : null,
      phone ? phone.trim() : null,
      company ? company.trim() : null,
      location ? location.trim() : null,
      avatar,
      tagsJson,
      now,
      now,
      now
    );

    const createdCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    return res.status(201).json({ success: true, id: customerId, customer: createdCustomer });
  } catch (err) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ error: 'Failed to create customer.' });
  }
};

// PUT /api/customers/:id
export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const customerId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const { name, email, phone, company, location, status, tags } = req.body;

    const existing = db.prepare('SELECT * FROM customers WHERE id = ? AND workspace_id = ?').get(customerId, workspace.id) as DbCustomer | undefined;
    if (!existing) return res.status(404).json({ error: 'Customer profile not found.' });

    const now = new Date().toISOString();
    const updatedTags = tags ? JSON.stringify(tags) : existing.tags;

    db.prepare(`
      UPDATE customers
      SET name = ?, email = ?, phone = ?, company = ?, location = ?, status = ?, tags = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(
      name ? name.trim() : existing.name,
      email !== undefined ? (email ? email.trim() : null) : existing.email,
      phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
      company !== undefined ? (company ? company.trim() : null) : existing.company,
      location !== undefined ? (location ? location.trim() : null) : existing.location,
      status ? status : existing.status,
      updatedTags,
      now,
      customerId,
      workspace.id
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error updating customer:', err);
    return res.status(500).json({ error: 'Failed to update customer.' });
  }
};

// DELETE /api/customers/:id
export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const customerId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    db.prepare('DELETE FROM customer_notes WHERE customer_id = ? AND workspace_id = ?').run(customerId, workspace.id);
    const result = db.prepare('DELETE FROM customers WHERE id = ? AND workspace_id = ?').run(customerId, workspace.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found or access denied.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting customer:', err);
    return res.status(500).json({ error: 'Failed to delete customer.' });
  }
};

// POST /api/customers/:id/notes
export const addCustomerNote = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const customerId = req.params.id;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content cannot be empty.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const now = new Date().toISOString();
    const noteId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO customer_notes (id, workspace_id, customer_id, author_id, author_name, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      noteId,
      workspace.id,
      customerId,
      req.user.id,
      req.user.name,
      content.trim(),
      now,
      now
    );

    return res.status(201).json({ success: true, id: noteId });
  } catch (err) {
    console.error('Error adding customer note:', err);
    return res.status(500).json({ error: 'Failed to add customer note.' });
  }
};

// DELETE /api/customers/:id/notes/:noteId
export const deleteCustomerNote = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { id: customerId, noteId } = req.params;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    db.prepare('DELETE FROM customer_notes WHERE id = ? AND customer_id = ? AND workspace_id = ?').run(noteId, customerId, workspace.id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting customer note:', err);
    return res.status(500).json({ error: 'Failed to delete note.' });
  }
};

// POST /api/customers/:id/block
export const toggleBlockCustomer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const customerId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const existing = db.prepare('SELECT * FROM customers WHERE id = ? AND workspace_id = ?').get(customerId, workspace.id) as DbCustomer | undefined;
    if (!existing) return res.status(404).json({ error: 'Customer not found.' });

    const nextStatus = existing.status === 'blocked' ? 'active' : 'blocked';
    db.prepare('UPDATE customers SET status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').run(
      nextStatus,
      new Date().toISOString(),
      customerId,
      workspace.id
    );

    return res.status(200).json({ success: true, status: nextStatus });
  } catch (err) {
    console.error('Error toggling block customer:', err);
    return res.status(500).json({ error: 'Failed to toggle block customer.' });
  }
};

// POST /api/customers/merge
export const mergeCustomers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { primaryCustomerId, secondaryCustomerId } = req.body;
    if (!primaryCustomerId || !secondaryCustomerId || primaryCustomerId === secondaryCustomerId) {
      return res.status(400).json({ error: 'Valid primary and secondary customer IDs are required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const primary = db.prepare('SELECT * FROM customers WHERE id = ? AND workspace_id = ?').get(primaryCustomerId, workspace.id) as DbCustomer | undefined;
    const secondary = db.prepare('SELECT * FROM customers WHERE id = ? AND workspace_id = ?').get(secondaryCustomerId, workspace.id) as DbCustomer | undefined;

    if (!primary || !secondary) {
      return res.status(404).json({ error: 'One or both customers were not found.' });
    }

    // Merge tags
    const primaryTags: string[] = primary.tags ? JSON.parse(primary.tags) : [];
    const secondaryTags: string[] = secondary.tags ? JSON.parse(secondary.tags) : [];
    const mergedTags = Array.from(new Set([...primaryTags, ...secondaryTags]));

    // Re-assign conversations & notes from secondary to primary
    db.prepare('UPDATE conversations SET customer_name = ?, customer_email = ? WHERE workspace_id = ? AND (customer_email = ? OR customer_name = ?)').run(
      primary.name,
      primary.email,
      workspace.id,
      secondary.email,
      secondary.name
    );

    db.prepare('UPDATE customer_notes SET customer_id = ? WHERE customer_id = ? AND workspace_id = ?').run(
      primaryCustomerId,
      secondaryCustomerId,
      workspace.id
    );

    // Update primary customer tags & remove secondary
    db.prepare('UPDATE customers SET tags = ?, updated_at = ? WHERE id = ? AND workspace_id = ?').run(
      JSON.stringify(mergedTags),
      new Date().toISOString(),
      primaryCustomerId,
      workspace.id
    );

    db.prepare('DELETE FROM customers WHERE id = ? AND workspace_id = ?').run(secondaryCustomerId, workspace.id);

    return res.status(200).json({ success: true, primaryCustomerId });
  } catch (err) {
    console.error('Error merging customers:', err);
    return res.status(500).json({ error: 'Failed to merge customers.' });
  }
};
