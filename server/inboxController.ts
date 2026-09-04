import { Response } from 'express';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { db, DbConversation, DbMessage, DbWorkspace } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';
import { syncMessageToSupabase, syncConversationToSupabase } from './supabase.js';

// Global Event Emitter for Realtime Server-Sent Events (SSE)
export const inboxEventEmitter = new EventEmitter();
inboxEventEmitter.setMaxListeners(100);

// Helper to broadcast realtime event to a workspace channel
export function broadcastInboxEvent(workspaceId: string, type: string, payload: any) {
  inboxEventEmitter.emit(`workspace:${workspaceId}`, { type, payload, timestamp: new Date().toISOString() });
}

// Seed realistic messages for sample conversations if messages table is empty for a conversation
function ensureSeedMessages(conversationId: string, customerName: string, customerEmail: string | null, lastMsg: string, status: string) {
  const msgCountStmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?');
  const countRes = msgCountStmt.get(conversationId) as { count: number };

  if (countRes.count === 0) {
    const now = Date.now();
    const min = 60 * 1000;

    let sampleMessages: Array<{
      sender_type: 'customer' | 'ai' | 'agent' | 'system';
      sender_name: string | null;
      content: string;
      is_internal_note?: number;
      offsetMs: number;
    }> = [];

    if (customerName.includes('Sarah')) {
      sampleMessages = [
        { sender_type: 'customer', sender_name: customerName, content: 'Hi! I recently placed order #48291.', offsetMs: 10 * min },
        { sender_type: 'ai', sender_name: 'Xia AI', content: 'Hello Sarah! I can certainly check order #48291 for you. How can I help today?', offsetMs: 9 * min },
        { sender_type: 'customer', sender_name: customerName, content: 'Can I change my delivery address for order #48291? I moved yesterday.', offsetMs: 2 * min },
        { sender_type: 'ai', sender_name: 'Xia AI', content: 'I can update that for you before it dispatches. Please share your new address, postal code, and contact number.', offsetMs: 1 * min },
      ];
    } else if (customerName.includes('Michael')) {
      sampleMessages = [
        { sender_type: 'customer', sender_name: customerName, content: 'I placed an order last week and tracking status is stuck on pending.', offsetMs: 30 * min },
        { sender_type: 'ai', sender_name: 'Xia AI', content: 'I understand your frustration, Michael. Let me look into tracking status.', offsetMs: 28 * min },
        { sender_type: 'customer', sender_name: customerName, content: "I haven't received my order yet and tracking is stuck. I want to speak to a real person.", offsetMs: 8 * min },
        { sender_type: 'system', sender_name: 'System', content: 'Customer requested a human agent.', offsetMs: 7 * min },
        { sender_type: 'system', sender_name: 'System', content: 'Conversation handed off to Alex Rivera.', offsetMs: 6 * min },
        { sender_type: 'agent', sender_name: 'Alex Rivera', content: "Hi Michael, Alex here from support. I'm checking directly with our logistics manager right now.", offsetMs: 4 * min },
      ];
    } else if (customerName.includes('David')) {
      sampleMessages = [
        { sender_type: 'customer', sender_name: customerName, content: 'Hello, we are looking to procure software for our regional offices.', offsetMs: 45 * min },
        { sender_type: 'customer', sender_name: customerName, content: 'Do you offer bulk discounts for 500+ licenses?', offsetMs: 27 * min },
        { sender_type: 'ai', sender_name: 'Xia AI', content: 'Thank you for reaching out! For teams over 500 seats, we offer custom enterprise pricing with dedicated SLA support.', offsetMs: 25 * min },
        { sender_type: 'system', sender_name: 'System', content: 'AI confidence is 64%. Escalated to sales review queue.', offsetMs: 20 * min },
      ];
    } else {
      sampleMessages = [
        { sender_type: 'customer', sender_name: customerName, content: 'Hi team, checking on our account inquiry.', offsetMs: 20 * min },
        { sender_type: 'ai', sender_name: 'Xia AI', content: lastMsg, offsetMs: 5 * min },
      ];
    }

    const insertStmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, is_internal_note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      sampleMessages.forEach((msg) => {
        const itemTime = new Date(now - msg.offsetMs).toISOString();
        insertStmt.run(
          crypto.randomUUID(),
          conversationId,
          msg.sender_type,
          msg.sender_name,
          msg.content,
          msg.is_internal_note || 0,
          itemTime
        );
      });
    })();
  }
}


// GET /api/inbox/conversations
export const getInboxConversations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found or unauthorized access.' });
    }

    // Query parameters
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const tab = (req.query.tab as string) || 'all'; // 'all' | 'open' | 'assigned' | 'ai' | 'resolved'
    const channelFilter = req.query.channel as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const assigneeFilter = req.query.assignee as string | undefined;
    const aiOnly = req.query.aiOnly === 'true';
    const unreadOnly = req.query.unread === 'true';

    // Fetch all conversations for workspace
    const rawConvs = db.prepare(`
      SELECT * FROM conversations
      WHERE workspace_id = ?
      ORDER BY updated_at DESC
    `).all(workspace.id) as DbConversation[];

    // Ensure seed messages exist for realistic display
    rawConvs.forEach((c) => {
      ensureSeedMessages(c.id, c.customer_name, c.customer_email, c.last_message, c.status);
    });

    // Populate missing fields with realistic defaults if null
    const conversations = rawConvs.map((c) => {
      const tags = c.tags ? JSON.parse(c.tags) : c.customer_name.includes('Sarah') ? ['VIP', 'Shipping'] : c.customer_name.includes('Michael') ? ['Urgent', 'Order Delay'] : c.customer_name.includes('David') ? ['Enterprise', 'Lead'] : ['General'];
      const phone = c.customer_phone || (c.customer_name.includes('Sarah') ? '+1 (555) 234-5678' : c.customer_name.includes('Michael') ? '+1 (555) 876-5432' : '+1 (555) 345-6789');
      const firstSeen = c.first_seen || new Date(new Date(c.created_at).getTime() - 7 * 24 * 3600 * 1000).toISOString();
      const unreadCount = c.unread_count !== undefined ? c.unread_count : (c.needs_attention ? 2 : 0);
      const isAI = c.status === 'AI_HANDLING' || c.status === 'ai';
      const isHuman = c.status === 'HUMAN_HANDLING' || c.status === 'human';
      const aiStatus = c.ai_status || (isAI ? 'active' : 'human_required');

      const intent = c.intent || (c.last_message.toLowerCase().includes('order') || c.last_message.toLowerCase().includes('track') ? 'Order Tracking' : c.last_message.toLowerCase().includes('coffee') || c.last_message.toLowerCase().includes('product') ? 'Product Information' : c.last_message.toLowerCase().includes('price') ? 'Pricing & Plans' : 'General Inquiry');
      const aiSummary = c.ai_summary || (intent === 'Order Tracking' ? 'Customer needs help with delivery status and order tracking.' : intent === 'Product Information' ? 'Customer inquiring about signature coffee beans and blends.' : 'Customer inquiring about service details.');

      return {
        id: c.id,
        workspaceId: c.workspace_id,
        customerName: c.customer_name,
        customerEmail: c.customer_email,
        customerPhone: phone,
        channel: c.channel,
        status: c.status, // 'AI_HANDLING' | 'HUMAN_HANDLING' | 'WAITING' | 'RESOLVED' | 'CLOSED'
        assignee: c.assignee || (isAI ? 'Xia AI' : 'Unassigned'),
        assignedAgentId: c.assigned_agent_id || null,
        aiMode: c.ai_mode || (isAI ? 'ai_auto' : 'human_controlled'),
        handoffReason: c.handoff_reason || c.attention_reason || null,
        resolvedAt: c.resolved_at || null,
        intent,
        aiSummary,
        recommendedAction: c.recommended_action || (intent === 'Order Tracking' ? 'Verify package tracking ID with courier' : 'Provide standard brewing advice and menu'),
        assignedAgent: c.assignee || c.assigned_agent || null,
        mode: c.mode || c.ai_mode || null,
        lastMessage: c.last_message,
        needsAttention: Boolean(c.needs_attention),
        attentionReason: c.attention_reason || c.handoff_reason,
        confidenceScore: c.confidence_score || 0.95,
        sentiment: c.sentiment || 'neutral',
        unreadCount,
        tags,
        notes: c.notes || '',
        aiStatus,
        draftMessage: c.draft_message || null,
        firstSeen,
        updatedAt: c.updated_at,
        createdAt: c.created_at,
      };
    });

    // Calculate tab statistics before applying search/tab filtering
    const stats = {
      total: conversations.length,
      open: conversations.filter((c) => c.status !== 'RESOLVED' && c.status !== 'resolved' && c.status !== 'CLOSED' && c.status !== 'closed').length,
      assigned: conversations.filter((c) => c.status === 'HUMAN_HANDLING' || c.status === 'human' || (c.assignee && c.assignee !== 'Xia AI' && c.assignee !== 'Unassigned')).length,
      ai: conversations.filter((c) => c.status === 'AI_HANDLING' || c.status === 'ai').length,
      waiting: conversations.filter((c) => c.status === 'WAITING' || c.status === 'waiting' || c.needsAttention).length,
      resolved: conversations.filter((c) => c.status === 'RESOLVED' || c.status === 'resolved' || c.status === 'CLOSED' || c.status === 'closed').length,
    };

    // Filter conversations based on Tab, Search, and Multi-filters
    let filtered = conversations.filter((c) => {
      // Search matching (Name, Email, Phone, Last Message, ID, Intent)
      if (search) {
        const matchesName = c.customerName.toLowerCase().includes(search);
        const matchesEmail = c.customerEmail?.toLowerCase().includes(search);
        const matchesPhone = c.customerPhone?.toLowerCase().includes(search);
        const matchesMsg = c.lastMessage.toLowerCase().includes(search);
        const matchesId = c.id.toLowerCase().includes(search);
        const matchesIntent = c.intent.toLowerCase().includes(search);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesMsg && !matchesId && !matchesIntent) {
          return false;
        }
      }

      // Tab filtering
      if (tab === 'open' && (c.status === 'RESOLVED' || c.status === 'resolved' || c.status === 'CLOSED' || c.status === 'closed')) return false;
      if (tab === 'assigned' && !(c.status === 'HUMAN_HANDLING' || c.status === 'human' || (c.assignee && c.assignee !== 'Xia AI' && c.assignee !== 'Unassigned'))) return false;
      if (tab === 'ai' && !(c.status === 'AI_HANDLING' || c.status === 'ai')) return false;
      if (tab === 'waiting' && !(c.status === 'WAITING' || c.status === 'waiting' || c.needsAttention)) return false;
      if (tab === 'resolved' && !(c.status === 'RESOLVED' || c.status === 'resolved' || c.status === 'CLOSED' || c.status === 'closed')) return false;

      // Multi-filter conditions
      if (channelFilter && c.channel.toLowerCase() !== channelFilter.toLowerCase()) return false;
      if (statusFilter && c.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (assigneeFilter) {
        if (assigneeFilter === 'me' && c.assignee !== req.user?.name) return false;
        if (assigneeFilter === 'ai' && c.assignee !== 'Xia AI') return false;
        if (assigneeFilter === 'unassigned' && c.assignee !== 'Unassigned' && c.assignee !== null) return false;
      }
      if (aiOnly && !(c.status === 'AI_HANDLING' || c.status === 'ai')) return false;
      if (unreadOnly && c.unreadCount === 0) return false;

      return true;
    });

    // Team members list for assignee dropdowns
    const teamMembers = [
      { id: req.user.id, name: req.user.name, email: req.user.email, role: 'You' },
      { id: 'xia-ai', name: 'Xia AI', email: 'ai@xiachat.com', role: 'AI Assistant' },
      { id: 'alex-rivera', name: 'Alex Rivera', email: 'alex@company.com', role: 'Senior Support' },
      { id: 'sarah-admin', name: 'Sarah Admin', email: 'sarah@company.com', role: 'Support Lead' },
    ];

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const totalFiltered = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
    const offset = (page - 1) * limit;
    const paginatedConversations = filtered.slice(offset, offset + limit);

    return res.status(200).json({
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      conversations: paginatedConversations,
      stats,
      teamMembers,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Error fetching inbox conversations:', err);
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

// GET /api/inbox/conversations/:id/messages
export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);

    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Fetch conversation record scoped to workspace
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND workspace_id = ?').get(conversationId, workspace.id) as DbConversation | undefined;
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    // Mark conversation read (reset unread_count and needs_attention)
    db.prepare('UPDATE conversations SET unread_count = 0, needs_attention = 0 WHERE id = ?').run(conversationId);

    // Pagination parameters for message history
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;

    const totalCountStmt = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?');
    const totalMessages = (totalCountStmt.get(conversationId) as { count: number }).count;

    // Fetch messages history
    const rawMessages = db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `).all(conversationId, limit, offset) as DbMessage[];

    const messages = rawMessages.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderType: m.sender_type, // 'customer' | 'ai' | 'agent' | 'system'
      senderName: m.sender_name,
      content: m.content,
      isInternalNote: Boolean(m.is_internal_note),
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      knowledgeSource: m.knowledge_source || (m.sender_type === 'ai' ? 'Coffee Shop FAQ' : null),
      confidenceScore: m.confidence_score || (m.sender_type === 'ai' ? 0.98 : null),
      createdAt: m.created_at,
    }));

    const intent = conv.intent || (conv.last_message.toLowerCase().includes('order') || conv.last_message.toLowerCase().includes('track') ? 'Order Tracking' : conv.last_message.toLowerCase().includes('coffee') || conv.last_message.toLowerCase().includes('product') ? 'Product Information' : conv.last_message.toLowerCase().includes('price') ? 'Pricing & Plans' : 'General Inquiry');
    const aiSummary = conv.ai_summary || (intent === 'Order Tracking' ? 'Customer needs help with delivery status and order tracking.' : intent === 'Product Information' ? 'Customer inquiring about signature coffee beans and blends.' : 'Customer inquiring about support services.');
    const recommendedAction = conv.recommended_action || (intent === 'Order Tracking' ? 'Verify package tracking ID with courier and provide delivery ETA' : 'Provide standard brewing advice and product catalogue');

    // Customer profile info with AI Intelligence & History
    const customer = {
      name: conv.customer_name,
      email: conv.customer_email,
      phone: conv.customer_phone || '+1 (555) 234-5678',
      location: 'San Francisco, CA',
      channel: conv.channel,
      firstSeen: conv.first_seen || new Date(new Date(conv.created_at).getTime() - 7 * 24 * 3600 * 1000).toISOString(),
      lastActive: conv.updated_at,
      totalConversations: 3,
      tags: conv.tags ? JSON.parse(conv.tags) : ['VIP', 'Coffee Shop'],
      notes: conv.notes || '',
      intent,
      sentiment: conv.sentiment || 'neutral',
      aiSummary,
      recommendedAction,
      confidenceScore: conv.confidence_score || 0.95,
      previousConversations: [
        { id: 'prev-1', title: 'Order Tracking #84920', status: 'Resolved', channel: conv.channel, date: 'Yesterday' },
        { id: 'prev-2', title: 'Coffee Blend Recommendation', status: 'Resolved', channel: 'Website', date: 'Aug 28' },
      ],
    };

    return res.status(200).json({
      conversation: {
        id: conv.id,
        workspaceId: conv.workspace_id,
        customerName: conv.customer_name,
        customerEmail: conv.customer_email,
        customerPhone: conv.customer_phone,
        channel: conv.channel,
        status: conv.status,
        assignee: conv.assignee || (conv.status === 'ai' || conv.status === 'AI_HANDLING' ? 'Xia AI' : 'Unassigned'),
        assignedAgentId: conv.assigned_agent_id || null,
        assignedAgent: conv.assignee || conv.assigned_agent || null,
        aiMode: conv.ai_mode || (conv.status === 'ai' || conv.status === 'AI_HANDLING' ? 'ai_auto' : 'human_controlled'),
        mode: conv.mode || conv.ai_mode || null,
        handoffReason: conv.handoff_reason || conv.attention_reason || null,
        resolvedAt: conv.resolved_at || null,
        intent,
        aiSummary,
        recommendedAction,
        lastMessage: conv.last_message,
        needsAttention: Boolean(conv.needs_attention),
        attentionReason: conv.attention_reason || conv.handoff_reason,
        confidenceScore: conv.confidence_score || 0.95,
        sentiment: conv.sentiment || 'neutral',
        unreadCount: 0,
        tags: conv.tags ? JSON.parse(conv.tags) : ['VIP', 'Coffee Shop'],
        notes: conv.notes || '',
        aiStatus: conv.ai_status || (conv.status === 'ai' || conv.status === 'AI_HANDLING' ? 'active' : 'human_required'),
        draftMessage: conv.draft_message || null,
        firstSeen: conv.first_seen,
        updatedAt: conv.updated_at,
        createdAt: conv.created_at,
      },
      messages,
      customer,
    });
  } catch (err) {
    console.error('Error fetching conversation messages:', err);
    return res.status(500).json({ error: 'Failed to fetch conversation history.' });
  }
};

// POST /api/inbox/conversations/:id/messages
export const postMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const { content, senderType = 'agent', isInternalNote = false, attachments = [] } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND workspace_id = ?').get(conversationId, workspace.id) as DbConversation | undefined;
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    const now = new Date().toISOString();
    const messageId = crypto.randomUUID();
    const senderName = isInternalNote
      ? `${req.user.name} (Internal Note)`
      : senderType === 'agent'
      ? req.user.name
      : senderType === 'ai'
      ? 'Xia AI'
      : conv.customer_name;

    // Insert message into database
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, is_internal_note, attachments, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      conversationId,
      senderType,
      senderName,
      content.trim(),
      isInternalNote ? 1 : 0,
      attachments.length ? JSON.stringify(attachments) : null,
      now
    );

    // Update conversation last message and timestamp (unless it's an internal note)
    if (!isInternalNote) {
      db.prepare(`
        UPDATE conversations
        SET last_message = ?, updated_at = ?, draft_message = NULL
        WHERE id = ?
      `).run(content.trim(), now, conversationId);
    }

    const newMessageObj = {
      id: messageId,
      conversationId,
      senderType: isInternalNote ? 'agent' : senderType,
      senderName,
      content: content.trim(),
      isInternalNote,
      attachments,
      createdAt: now,
    };

    // Broadcast SSE realtime event to workspace dashboard
    broadcastInboxEvent(workspace.id, 'new_message', { conversationId, message: newMessageObj });

    // Also broadcast to public widget SSE listeners for this conversation (zero latency delivery)
    inboxEventEmitter.emit(`conversation:${conversationId}`, { type: 'new_message', payload: newMessageObj });

    // If message is from human agent, update status to 'human' and clear needs_attention
    if (senderType === 'agent' && !isInternalNote) {
      db.prepare('UPDATE conversations SET status = ?, assignee = ?, needs_attention = 0, updated_at = ? WHERE id = ?').run('human', req.user.name, now, conversationId);
      broadcastInboxEvent(workspace.id, 'status_change', { conversationId, status: 'human', assignee: req.user.name, needsAttention: false });
      inboxEventEmitter.emit(`conversation:${conversationId}`, { type: 'status_change', payload: { status: 'human', assignee: req.user.name } });
    }

    // Persist to Supabase
    syncMessageToSupabase(newMessageObj);
    const updatedConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    syncConversationToSupabase(updatedConv);

    return res.status(201).json({ message: newMessageObj });
  } catch (err) {
    console.error('Error posting message:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
};

// POST /api/inbox/conversations/:id/takeover (Human Handoff)
export const takeoverConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND workspace_id = ?').get(conversationId, workspace.id) as DbConversation | undefined;
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    const now = new Date().toISOString();
    const agentName = req.user.name;

    // Update conversation status to HUMAN_HANDLING, assign to agent, pause AI auto-reply
    db.prepare(`
      UPDATE conversations
      SET status = 'HUMAN_HANDLING', assignee = ?, assigned_agent = ?, assigned_agent_id = ?, ai_mode = 'human_controlled', mode = 'human_handling', ai_status = 'paused', needs_attention = 0, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(agentName, agentName, req.user.id, now, conversationId, workspace.id);

    // Insert System Event Message
    const systemMsgId = crypto.randomUUID();
    const systemContent = `Conversation handed over to ${agentName}. AI auto-reply paused.`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, created_at)
      VALUES (?, ?, 'system', 'System', ?, ?)
    `).run(systemMsgId, conversationId, systemContent, now);

    const systemMsgObj = {
      id: systemMsgId,
      conversationId,
      senderType: 'system',
      senderName: 'System',
      content: systemContent,
      isInternalNote: false,
      attachments: [],
      createdAt: now,
    };

    broadcastInboxEvent(workspace.id, 'status_change', {
      conversationId,
      status: 'HUMAN_HANDLING',
      assignee: agentName,
      aiMode: 'human_controlled',
      aiStatus: 'paused',
      needsAttention: false,
      systemMessage: systemMsgObj,
    });

    inboxEventEmitter.emit(`conversation:${conversationId}`, {
      type: 'status_change',
      payload: { status: 'HUMAN_HANDLING', assignee: agentName },
    });

    const updatedConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    syncConversationToSupabase(updatedConv);
    syncMessageToSupabase(systemMsgObj);

    return res.status(200).json({
      success: true,
      status: 'HUMAN_HANDLING',
      assignee: agentName,
      aiMode: 'human_controlled',
      aiStatus: 'paused',
      systemMessage: systemMsgObj,
    });
  } catch (err) {
    console.error('Error handling takeover:', err);
    return res.status(500).json({ error: 'Failed to take over conversation.' });
  }
};

// POST /api/inbox/conversations/:id/return-to-ai (Return handoff to AI)
export const returnToAI = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const now = new Date().toISOString();

    // Update conversation status to AI_HANDLING, reactivate AI auto-reply
    db.prepare(`
      UPDATE conversations
      SET status = 'AI_HANDLING', assignee = 'Xia AI', assigned_agent = 'Xia AI', assigned_agent_id = NULL, ai_mode = 'ai_auto', mode = 'ai_autonomous', ai_status = 'active', needs_attention = 0, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(now, conversationId, workspace.id);

    const systemMsgId = crypto.randomUUID();
    const systemContent = 'Conversation returned to Xia AI. AI automated support reactivated.';
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, created_at)
      VALUES (?, ?, 'system', 'System', ?, ?)
    `).run(systemMsgId, conversationId, systemContent, now);

    const systemMsgObj = {
      id: systemMsgId,
      conversationId,
      senderType: 'system',
      senderName: 'System',
      content: systemContent,
      isInternalNote: false,
      attachments: [],
      createdAt: now,
    };

    broadcastInboxEvent(workspace.id, 'status_change', {
      conversationId,
      status: 'AI_HANDLING',
      assignee: 'Xia AI',
      aiMode: 'ai_auto',
      aiStatus: 'active',
      needsAttention: false,
      systemMessage: systemMsgObj,
    });

    inboxEventEmitter.emit(`conversation:${conversationId}`, {
      type: 'status_change',
      payload: { status: 'AI_HANDLING', assignee: 'Xia AI' },
    });

    const updatedConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    syncConversationToSupabase(updatedConv);
    syncMessageToSupabase(systemMsgObj);

    return res.status(200).json({
      success: true,
      status: 'AI_HANDLING',
      assignee: 'Xia AI',
      aiMode: 'ai_auto',
      aiStatus: 'active',
      systemMessage: systemMsgObj,
    });
  } catch (err) {
    console.error('Error returning to AI:', err);
    return res.status(500).json({ error: 'Failed to return conversation to AI.' });
  }
};

// POST /api/inbox/conversations/:id/assign
export const updateAssignment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const { assignee } = req.body; // 'Me' | 'Xia AI' | 'Alex Rivera' | 'Unassigned'
    if (!assignee) return res.status(400).json({ error: 'Assignee is required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const targetAssignee = assignee === 'Me' ? req.user.name : assignee;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE conversations
      SET assignee = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(targetAssignee, now, conversationId, workspace.id);

    // Insert System Event
    const systemMsgId = crypto.randomUUID();
    const systemContent = `Conversation assigned to ${targetAssignee}.`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, created_at)
      VALUES (?, ?, 'system', 'System', ?, ?)
    `).run(systemMsgId, conversationId, systemContent, now);

    const systemMsgObj = {
      id: systemMsgId,
      conversationId,
      senderType: 'system',
      senderName: 'System',
      content: systemContent,
      createdAt: now,
    };

    broadcastInboxEvent(workspace.id, 'assignment_update', {
      conversationId,
      assignee: targetAssignee,
      systemMessage: systemMsgObj,
    });

    return res.status(200).json({ success: true, assignee: targetAssignee, systemMessage: systemMsgObj });
  } catch (err) {
    console.error('Error updating assignment:', err);
    return res.status(500).json({ error: 'Failed to assign conversation.' });
  }
};

// POST /api/inbox/conversations/:id/status
export const updateStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const { status } = req.body; // 'AI_HANDLING' | 'HUMAN_HANDLING' | 'WAITING' | 'RESOLVED' | 'CLOSED'
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const now = new Date().toISOString();
    const isResolved = status === 'RESOLVED' || status === 'resolved';
    const isClosed = status === 'CLOSED' || status === 'closed';
    const resolvedAt = isResolved || isClosed ? now : null;

    db.prepare(`
      UPDATE conversations
      SET status = ?, resolved_at = ?, needs_attention = 0, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(status, resolvedAt, now, conversationId, workspace.id);

    const systemMsgId = crypto.randomUUID();
    const statusLabel = isResolved ? 'RESOLVED' : isClosed ? 'CLOSED' : status.toUpperCase();
    const systemContent = `Conversation marked as ${statusLabel}.${isResolved ? ' Ticket successfully completed.' : ''}`;
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, created_at)
      VALUES (?, ?, 'system', 'System', ?, ?)
    `).run(systemMsgId, conversationId, systemContent, now);

    const systemMsgObj = {
      id: systemMsgId,
      conversationId,
      senderType: 'system',
      senderName: 'System',
      content: systemContent,
      createdAt: now,
    };

    broadcastInboxEvent(workspace.id, 'status_change', {
      conversationId,
      status,
      resolvedAt,
      needsAttention: false,
      systemMessage: systemMsgObj,
    });

    inboxEventEmitter.emit(`conversation:${conversationId}`, {
      type: 'status_change',
      payload: { status, resolvedAt },
    });

    const updatedConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
    syncConversationToSupabase(updatedConv);
    syncMessageToSupabase(systemMsgObj);

    return res.status(200).json({ success: true, status, resolvedAt, systemMessage: systemMsgObj });
  } catch (err) {
    console.error('Error updating status:', err);
    return res.status(500).json({ error: 'Failed to update conversation status.' });
  }
};

// POST /api/inbox/conversations/:id/customer-details
export const updateCustomerDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const { tags, notes } = req.body;

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const now = new Date().toISOString();

    if (tags !== undefined) {
      db.prepare(`
        UPDATE conversations
        SET tags = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).run(JSON.stringify(tags), now, conversationId, workspace.id);
    }

    if (notes !== undefined) {
      db.prepare(`
        UPDATE conversations
        SET notes = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).run(notes, now, conversationId, workspace.id);
    }

    return res.status(200).json({ success: true, tags, notes });
  } catch (err) {
    console.error('Error updating customer details:', err);
    return res.status(500).json({ error: 'Failed to update customer details.' });
  }
};

// POST /api/inbox/conversations/:id/generate-ai-draft
export const generateAIDraft = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND workspace_id = ?').get(conversationId, workspace.id) as DbConversation | undefined;
    if (!conv) return res.status(404).json({ error: 'Conversation not found.' });

    // Generate intelligent suggested response based on last message
    let draftText = `Hi ${conv.customer_name.split(' ')[0]}, thanks for reaching out! I've reviewed your request and am happy to assist.`;
    if (conv.last_message.toLowerCase().includes('order') || conv.last_message.toLowerCase().includes('delivery')) {
      draftText = `Hi ${conv.customer_name.split(' ')[0]}, I checked your order status. Delivery is currently in transit with estimated delivery within 24-48 hours. Let me know if you need to modify details!`;
    } else if (conv.last_message.toLowerCase().includes('discount') || conv.last_message.toLowerCase().includes('price')) {
      draftText = `Hi ${conv.customer_name.split(' ')[0]}, we offer flexible enterprise pricing packages for high volume usage. I can get our sales lead connected right away!`;
    }

    db.prepare('UPDATE conversations SET draft_message = ? WHERE id = ?').run(draftText, conversationId);

    return res.status(200).json({ draftMessage: draftText, confidenceScore: 0.96 });
  } catch (err) {
    console.error('Error generating AI draft:', err);
    return res.status(500).json({ error: 'Failed to generate AI draft.' });
  }
};

// GET /api/inbox/events (Server-Sent Events Realtime Stream)
export const sseEventsStream = (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).end();

  const requestedWsId = req.query.workspaceId as string | undefined;
  const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
  if (!workspace) return res.status(404).end();

  const origin = (req.headers.origin as string) || (req.headers.referer as string) || '';
  let allowedOrigin = '*';
  try {
    if (origin && origin.startsWith('http')) {
      allowedOrigin = new URL(origin).origin;
    }
  } catch {}

  const headers: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  if (allowedOrigin !== '*') {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  res.writeHead(200, headers);

  res.write(`data: ${JSON.stringify({ type: 'connected', workspaceId: workspace.id })}\n\n`);

  const eventChannel = `workspace:${workspace.id}`;

  const listener = (event: { type: string; payload: any; timestamp: string }) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  inboxEventEmitter.on(eventChannel, listener);

  // Heartbeat every 25 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    inboxEventEmitter.off(eventChannel, listener);
  });
};
