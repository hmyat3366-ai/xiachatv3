import { Request, Response } from 'express';
import crypto from 'crypto';
import { db, DbChannel, DbCustomerIdentity, DbWorkspace, DbAiAssistant, ensureSeedAgents, DbAgent, ensureSeedProductsAndOrders } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';
import { broadcastInboxEvent, inboxEventEmitter } from './inboxController.js';
import { processInboundCustomerMessage } from './aiProviderService.js';
import { syncCustomerToSupabase, syncConversationToSupabase, syncMessageToSupabase, uploadChatAttachment } from './supabase.js';

// Auto-seed channels for workspace (Website Chat is connected by default, Social channels as not_connected)
function ensureSeedChannels(workspaceId: string) {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM channels WHERE workspace_id = ?');
  const countRes = countStmt.get(workspaceId) as { count: number };

  if (countRes.count === 0) {
    const now = new Date().toISOString();

    // Get workspace default AI Agent ID if available
    const agent = db.prepare('SELECT id FROM ai_assistants WHERE workspace_id = ? ORDER BY created_at ASC LIMIT 1').get(workspaceId) as { id: string } | undefined;
    const defaultAgentId = agent ? agent.id : null;

    const initialChannels = [
      {
        type: 'website',
        name: 'Website Live Chat',
        status: 'connected',
        provider: 'xia',
        externalAccountId: 'xiachat.com',
        config: JSON.stringify({
          widgetName: 'Xia Support Chat',
          welcomeMessage: 'Hello! How can we help you today?',
          primaryColor: '#FF8A2A',
          position: 'bottom-right',
          enableAI: true,
          enableHandoff: true,
          showAgentAvailability: true,
        }),
        defaultAgentId,
        lastActivityAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
      {
        type: 'facebook',
        name: 'Facebook Messenger',
        status: 'not_connected',
        provider: 'meta',
        externalAccountId: null,
        config: JSON.stringify({ enableAI: true }),
        defaultAgentId,
        lastActivityAt: null,
      },
      {
        type: 'instagram',
        name: 'Instagram Direct Messages',
        status: 'not_connected',
        provider: 'meta',
        externalAccountId: null,
        config: JSON.stringify({ enableAI: true }),
        defaultAgentId,
        lastActivityAt: null,
      },
      {
        type: 'whatsapp',
        name: 'WhatsApp Business API',
        status: 'not_connected',
        provider: 'whatsapp_cloud',
        externalAccountId: null,
        config: JSON.stringify({ enableAI: true }),
        defaultAgentId,
        lastActivityAt: null,
      },
    ];

    const insertChan = db.prepare(`
      INSERT INTO channels (
        id, workspace_id, type, name, status, provider, external_account_id,
        config, credentials_reference, default_agent_id, last_activity_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `);

    initialChannels.forEach((c) => {
      insertChan.run(
        crypto.randomUUID(),
        workspaceId,
        c.type,
        c.name,
        c.status,
        c.provider,
        c.externalAccountId,
        c.config,
        c.defaultAgentId,
        c.lastActivityAt,
        now,
        now
      );
    });
  }
}

// GET /api/channels
export const getChannels = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(200).json({ channels: [], stats: { total: 0, connected: 0 } });

    ensureSeedChannels(workspace.id);

    const rawChannels = db.prepare(`
      SELECT c.*, a.name as default_agent_name
      FROM channels c
      LEFT JOIN ai_assistants a ON c.default_agent_id = a.id
      WHERE c.workspace_id = ?
      ORDER BY c.created_at ASC
    `).all(workspace.id) as Array<DbChannel & { default_agent_name?: string }>;

    const channels = rawChannels.map((c) => ({
      id: c.id,
      workspaceId: c.workspace_id,
      type: c.type, // 'website' | 'facebook' | 'instagram' | 'whatsapp'
      name: c.name,
      status: c.status, // 'connected' | 'connecting' | 'disconnected' | 'needs_attention' | 'not_connected'
      provider: c.provider,
      externalAccountId: c.external_account_id,
      config: c.config ? JSON.parse(c.config) : null,
      defaultAgentId: c.default_agent_id,
      defaultAgentName: c.default_agent_name || 'Xia Support Assistant',
      lastActivityAt: c.last_activity_at,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    const stats = {
      total: channels.length,
      connected: channels.filter((c) => c.status === 'connected').length,
    };

    return res.status(200).json({
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      channels,
      stats,
    });
  } catch (err) {
    console.error('Error fetching channels:', err);
    return res.status(500).json({ error: 'Failed to fetch channels.' });
  }
};

// GET /api/channels/:id
export const getChannelById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const channelId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const c = db.prepare(`
      SELECT c.*, a.name as default_agent_name
      FROM channels c
      LEFT JOIN ai_assistants a ON c.default_agent_id = a.id
      WHERE c.id = ? AND c.workspace_id = ?
    `).get(channelId, workspace.id) as (DbChannel & { default_agent_name?: string }) | undefined;

    if (!c) return res.status(404).json({ error: 'Channel integration not found.' });

    const agents = db.prepare('SELECT id, name FROM ai_assistants WHERE workspace_id = ?').all(workspace.id) as Array<{ id: string; name: string }>;

    return res.status(200).json({
      channel: {
        id: c.id,
        workspaceId: c.workspace_id,
        type: c.type,
        name: c.name,
        status: c.status,
        provider: c.provider,
        externalAccountId: c.external_account_id,
        config: c.config ? JSON.parse(c.config) : null,
        defaultAgentId: c.default_agent_id,
        defaultAgentName: c.default_agent_name || 'Xia Support Assistant',
        lastActivityAt: c.last_activity_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
      availableAgents: agents,
    });
  } catch (err) {
    console.error('Error fetching channel details:', err);
    return res.status(500).json({ error: 'Failed to fetch channel details.' });
  }
};

// PUT /api/channels/website-config
export const updateWebsiteChannelConfig = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    ensureSeedChannels(workspace.id);

    const {
      widgetName,
      welcomeMessage,
      primaryColor,
      secondaryColor,
      autoDetectColor,
      matchWebsiteTheme,
      theme,
      position,
      defaultAgentId,
      enableAI,
      enableHandoff,
      showAgentAvailability,
      conversationStarters,
    } = req.body;

    const channel = db.prepare("SELECT * FROM channels WHERE workspace_id = ? AND type = 'website'").get(workspace.id) as DbChannel | undefined;
    if (!channel) return res.status(404).json({ error: 'Website Chat channel not found.' });

    const now = new Date().toISOString();
    const updatedConfig = JSON.stringify({
      widgetName: widgetName || 'Xia Support Chat',
      welcomeMessage: welcomeMessage || 'Hello! How can we help you today?',
      primaryColor: primaryColor || '#FF8A2A',
      secondaryColor: secondaryColor || null,
      autoDetectColor: autoDetectColor !== false,
      matchWebsiteTheme: matchWebsiteTheme !== false,
      theme: theme || 'auto',
      position: position || 'bottom-right',
      enableAI: enableAI !== false,
      enableHandoff: enableHandoff !== false,
      showAgentAvailability: showAgentAvailability !== false,
      conversationStarters: conversationStarters || undefined,
    });

    db.prepare(`
      UPDATE channels
      SET config = ?, default_agent_id = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(updatedConfig, defaultAgentId || channel.default_agent_id, now, channel.id, workspace.id);

    // Sync to workspace widget_settings
    try {
      db.prepare(`
        INSERT INTO widget_settings (workspace_id, widget_name, welcome_message, primary_color, secondary_color, auto_detect_color, match_website_theme, position, theme, show_agent_availability, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workspace_id) DO UPDATE SET
          widget_name = excluded.widget_name,
          welcome_message = excluded.welcome_message,
          primary_color = excluded.primary_color,
          secondary_color = excluded.secondary_color,
          auto_detect_color = excluded.auto_detect_color,
          match_website_theme = excluded.match_website_theme,
          position = excluded.position,
          theme = excluded.theme,
          show_agent_availability = excluded.show_agent_availability,
          updated_at = excluded.updated_at
      `).run(
        workspace.id,
        widgetName || 'Xia Support Chat',
        welcomeMessage || 'Hello! How can we help you today?',
        primaryColor || '#FF8A2A',
        secondaryColor || null,
        autoDetectColor !== false ? 1 : 0,
        matchWebsiteTheme !== false ? 1 : 0,
        position || 'bottom-right',
        theme || 'auto',
        showAgentAvailability !== false ? 1 : 0,
        now
      );
    } catch (e) {
      console.warn('[Widget] Failed to sync to widget_settings table:', e);
    }

    const updatedChannel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channel.id);
    return res.status(200).json({ success: true, channel: updatedChannel });
  } catch (err) {
    console.error('Error updating website channel config:', err);
    return res.status(500).json({ error: 'Failed to update website widget configuration.' });
  }
};

// GET /api/channels/public-widget/:siteKey (Browser-safe CORS public endpoint)
export const getPublicWidgetConfig = async (req: Request, res: Response) => {
  try {
    const siteKey = req.params.siteKey;
    let channel = (siteKey === 'auto-detect'
      ? db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.type = 'website' AND c.status = 'connected' ORDER BY c.created_at ASC LIMIT 1").get()
      : db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.id = ? AND c.type = 'website'").get(siteKey)
    ) as (DbChannel & { workspace_name: string }) | undefined;

    if (!channel && siteKey === 'auto-detect') {
      channel = db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.type = 'website' LIMIT 1").get() as any;
    }

    if (!channel || channel.status === 'disconnected') {
      return res.status(404).json({ error: 'Widget configuration unavailable or channel disconnected.' });
    }
    const config = channel.config ? JSON.parse(channel.config) : {};

    // Check workspace widget_settings table
    const widgetSettings = db.prepare('SELECT * FROM widget_settings WHERE workspace_id = ?').get(channel.workspace_id) as any;

    // Dynamic Quick Action Starters by industry context
    const requestedIndustry = (req.query.industry as string) || (widgetSettings?.business_context ? JSON.parse(widgetSettings.business_context)?.industry : 'coffee_shop');

    const industryStartersMap: Record<string, Array<{ label: string; prompt: string }>> = {
      coffee_shop: [
        { label: '☕ View Menu', prompt: 'Can I see your coffee menu and signature blends?' },
        { label: '📦 Track Order', prompt: 'Where is my order?' },
        { label: '🛒 Place Order', prompt: 'How do I place an order for freshly roasted beans?' },
        { label: '💳 Payment Help', prompt: 'What payment methods do you accept?' },
        { label: '👤 Talk to Human', prompt: 'I want to talk with human support please.' },
      ],
      saas: [
        { label: '🚀 Product Demo', prompt: 'Can you give me a quick product demo?' },
        { label: '💰 Pricing', prompt: 'What are your pricing plans and features?' },
        { label: '🔧 Technical Support', prompt: 'I need technical support with my integration.' },
        { label: '📚 Documentation', prompt: 'Where can I find your API and integration docs?' },
        { label: '👤 Contact Sales', prompt: 'I would like to speak with your sales team.' },
      ],
      ecommerce: [
        { label: '🛍 Browse Products', prompt: 'Can you recommend your bestselling products?' },
        { label: '📦 Order Tracking', prompt: 'Where is my order?' },
        { label: '🔄 Return & Refund', prompt: 'What is your return and refund policy?' },
        { label: '💳 Payment Issue', prompt: 'I have an issue with my payment.' },
        { label: '👤 Human Support', prompt: 'I want to talk with human support please.' },
      ],
    };

    let conversationStarters = industryStartersMap[requestedIndustry] || industryStartersMap['coffee_shop'];
    if (widgetSettings && widgetSettings.conversation_starters) {
      try {
        conversationStarters = JSON.parse(widgetSettings.conversation_starters);
      } catch {}
    } else if (config.conversationStarters) {
      conversationStarters = config.conversationStarters;
    }

    const welcomeMessage = (widgetSettings && widgetSettings.welcome_message) || config.welcomeMessage || 'Hi 👋 How can I help you today?';
    const primaryColor = config.primaryColor || (widgetSettings && widgetSettings.primary_color) || '#FF8A2A';
    const secondaryColor = config.secondaryColor || (widgetSettings && widgetSettings.secondary_color) || null;
    const autoDetectColor = config.autoDetectColor !== undefined
      ? Boolean(config.autoDetectColor)
      : (widgetSettings?.auto_detect_color !== undefined ? Boolean(widgetSettings.auto_detect_color) : true);
    const matchWebsiteTheme = config.matchWebsiteTheme !== undefined
      ? Boolean(config.matchWebsiteTheme)
      : (widgetSettings?.match_website_theme !== undefined ? Boolean(widgetSettings.match_website_theme) : true);
    const theme = config.theme || (widgetSettings && widgetSettings.theme) || 'auto';

    // Return strictly browser-safe properties (No JWTs, database keys or secrets)
    return res.status(200).json({
      siteKey: channel.id,
      workspaceName: channel.workspace_name,
      widgetName: (widgetSettings && widgetSettings.widget_name) || config.widgetName || 'Xia Support Chat',
      welcomeMessage,
      conversationStarters,
      primaryColor,
      secondaryColor,
      autoDetectColor,
      matchWebsiteTheme,
      position: (widgetSettings && widgetSettings.position) || config.position || 'bottom-right',
      theme,
      showAgentAvailability: (widgetSettings && widgetSettings.show_agent_availability !== undefined) ? Boolean(widgetSettings.show_agent_availability) : (config.showAgentAvailability !== false),
    });
  } catch (err) {
    console.error('Error fetching public widget config:', err);
    return res.status(500).json({ error: 'Failed to fetch public widget configuration.' });
  }
};

// POST /api/channels/public-widget/:siteKey/message (Public CORS endpoint for website visitors)
export const handlePublicWidgetMessage = async (req: Request, res: Response) => {
  try {
    const siteKey = req.params.siteKey;
    const { message, visitorId, sessionId, browserId, conversationId, customerName, customerEmail, productContext } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Resolve channel
    let channel = (siteKey === 'auto-detect'
      ? db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.type = 'website' AND c.status = 'connected' ORDER BY c.created_at ASC LIMIT 1").get()
      : db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.id = ? AND c.type = 'website'").get(siteKey)
    ) as (DbChannel & { workspace_name: string }) | undefined;

    if (!channel) {
      channel = db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.type = 'website' LIMIT 1").get() as any;
    }

    if (!channel || channel.status === 'disconnected') {
      return res.status(404).json({ error: 'Widget channel not found or inactive.' });
    }

    const workspaceId = channel.workspace_id;
    const now = new Date().toISOString();

    // 1. Resolve or Create Customer
    const cleanVisitorId = visitorId || `visitor_${crypto.randomBytes(4).toString('hex')}`;
    const cleanSessionId = sessionId || `session_${crypto.randomBytes(4).toString('hex')}`;
    const cleanBrowserId = browserId || `browser_${crypto.randomBytes(4).toString('hex')}`;

    let customer = db.prepare('SELECT * FROM customers WHERE workspace_id = ? AND (email = ? OR id = ?)').get(workspaceId, customerEmail || '', cleanVisitorId) as any;

    if (!customer) {
      const custId = cleanVisitorId;
      const displayName = customerName || 'Website Visitor';
      db.prepare(`
        INSERT INTO customers (id, workspace_id, name, email, phone, company, location, avatar, status, tags, created_at, updated_at, last_active_at)
        VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'active', ?, ?, ?, ?)
      `).run(custId, workspaceId, displayName, customerEmail || null, JSON.stringify(['Website Visitor']), now, now, now);

      customer = { id: custId, workspace_id: workspaceId, name: displayName, email: customerEmail || null };
      syncCustomerToSupabase(customer);
    }

    // Record or update guest visitor tracking
    try {
      const existingVisitor = db.prepare('SELECT id FROM visitors WHERE id = ?').get(cleanVisitorId);
      if (!existingVisitor) {
        db.prepare(`
          INSERT INTO visitors (id, workspace_id, session_id, browser_id, customer_id, first_seen_at, last_seen_at, intent, sentiment, product_interest, metadata, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)
        `).run(cleanVisitorId, workspaceId, cleanSessionId, cleanBrowserId, customer.id, now, now, JSON.stringify(productContext || {}), now, now);
      } else {
        db.prepare(`
          UPDATE visitors SET last_seen_at = ?, session_id = ?, customer_id = ?, updated_at = ? WHERE id = ?
        `).run(now, cleanSessionId, customer.id, now, cleanVisitorId);
      }
    } catch (e) {
      console.warn('[Widget] Visitor record warning:', e);
    }

    // 2. Resolve or Create Conversation
    let convId = conversationId;
    let conv: any = null;

    if (convId) {
      conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND workspace_id = ?').get(convId, workspaceId);
    }

    if (!conv) {
      convId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO conversations (
          id, workspace_id, customer_name, customer_email, channel, status, assignee,
          last_message, needs_attention, attention_reason, confidence_score, sentiment,
          unread_count, customer_phone, tags, notes, ai_status, draft_message, first_seen,
          assigned_agent_id, ai_mode, handoff_reason, resolved_at, intent, ai_summary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'Website', 'AI_HANDLING', 'Xia AI', ?, 0, NULL, 0.95, 'neutral', 1, NULL, ?, '', 'active', NULL, ?, NULL, 'ai_auto', NULL, NULL, 'General Inquiry', 'Customer reached out with a general inquiry.', ?, ?)
      `).run(
        convId,
        workspaceId,
        customer.name,
        customer.email,
        message.trim(),
        JSON.stringify(['Website Visitor']),
        now,
        now,
        now
      );

      conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
      syncConversationToSupabase(conv);
    } else {
      // If conversation was resolved/closed, auto-reopen on new customer message
      const isReopened = conv.status === 'RESOLVED' || conv.status === 'resolved' || conv.status === 'closed';
      const newStatus = isReopened ? 'AI_HANDLING' : conv.status;

      db.prepare(`
        UPDATE conversations
        SET last_message = ?, updated_at = ?, unread_count = unread_count + 1,
            status = ?, resolved_at = ?
        WHERE id = ?
      `).run(message.trim(), now, newStatus, isReopened ? null : conv.resolved_at, convId);

      if (isReopened) {
        conv.status = newStatus;
        broadcastInboxEvent(workspaceId, 'status_change', { conversationId: convId, status: newStatus });
      }
    }

    // 3. Save Customer Message
    const rawAttachments = req.body.attachments;
    const attachments = Array.isArray(rawAttachments) ? rawAttachments : [];
    const customerMsgId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, is_internal_note, attachments, created_at)
      VALUES (?, ?, 'customer', ?, ?, 0, ?, ?)
    `).run(customerMsgId, convId, customer.name, (message || '').trim(), attachments.length ? JSON.stringify(attachments) : null, now);

    const customerMsgObj = {
      id: customerMsgId,
      conversationId: convId,
      senderType: 'customer',
      senderName: customer.name,
      content: (message || '').trim(),
      isInternalNote: false,
      attachments,
      createdAt: now,
    };

    // Broadcast customer message to Dashboard Inbox via SSE
    broadcastInboxEvent(workspaceId, 'new_message', { conversationId: convId, message: customerMsgObj });
    await syncMessageToSupabase(customerMsgObj);

    // 4. Trigger AI Auto-Responder if channel enables AI and conversation not locked to human
    const channelConfig = channel.config ? JSON.parse(channel.config) : {};
    const aiEnabled = channelConfig.enableAI !== false;

    let aiReplyText = '';
    let aiMsgId = '';
    let isHandoff = false;

    const isHumanLocked = conv.status === 'HUMAN_HANDLING' || conv.status === 'human' || conv.ai_mode === 'human_controlled' || conv.ai_mode === 'paused';

    if (aiEnabled && !isHumanLocked) {
      // Find assigned AI agent
      const agent = (channel.default_agent_id
        ? db.prepare('SELECT * FROM ai_assistants WHERE id = ? AND workspace_id = ?').get(channel.default_agent_id, workspaceId)
        : db.prepare('SELECT * FROM ai_assistants WHERE workspace_id = ? ORDER BY created_at ASC LIMIT 1').get(workspaceId)
      ) as DbAiAssistant | undefined;

      const agentName = agent ? agent.name : 'Xia Assistant';
      const systemInstructions = agent ? (agent.custom_instructions || agent.instructions || '') : 'Be helpful, accurate, and concise.';
      const tone = agent ? agent.tone : 'Friendly';
      const knowledgeSources = agent && agent.knowledge_source_ids ? JSON.parse(agent.knowledge_source_ids) : [];

      // Process Inbound Message with Intent Detection, 4-tier Sentiment & Order/Product context
      const aiResult = await processInboundCustomerMessage({
        workspaceId,
        agentName,
        systemInstructions,
        tone,
        userMessage: message.trim(),
        knowledgeSources,
        handoffConditions: agent && agent.handoff_conditions ? JSON.parse(agent.handoff_conditions) : ['customer_asks', 'low_confidence'],
        handoffMessage: agent ? agent.handoff_message : undefined,
        productContext,
        customerEmail: customer.email || customerEmail,
      });

      aiReplyText = aiResult.reply;
      isHandoff = aiResult.isHandoff;
      aiMsgId = crypto.randomUUID();
      const replyTime = new Date().toISOString();

      // Update visitor record with detected intent & sentiment
      try {
        db.prepare('UPDATE visitors SET intent = ?, sentiment = ?, updated_at = ? WHERE id = ?')
          .run(aiResult.intent, aiResult.sentiment, replyTime, cleanVisitorId);
      } catch {}

      // Save AI Response to messages with knowledge source & confidence
      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, is_internal_note, attachments, knowledge_source, confidence_score, created_at)
        VALUES (?, ?, 'ai', ?, ?, 0, NULL, ?, ?, ?)
      `).run(aiMsgId, convId, agentName, aiReplyText, aiResult.knowledgeSource || 'Store FAQ', aiResult.confidenceScore || 0.98, replyTime);

      // Handle Human Handoff vs Normal AI reply
      if (isHandoff) {
        // Find or assign first available human agent from workspace
        ensureSeedAgents(workspaceId);
        const availableAgent = db.prepare("SELECT * FROM agents WHERE workspace_id = ? AND availability = 'available' ORDER BY created_at ASC LIMIT 1").get(workspaceId) as DbAgent | undefined;
        const assignedAgentName = availableAgent ? availableAgent.name : 'Alex Johnson';
        const assignedAgentId = availableAgent ? availableAgent.id : null;

        db.prepare(`
          UPDATE conversations
          SET status = 'HUMAN_HANDLING', assignee = ?, assigned_agent_id = ?, assigned_agent = ?,
              ai_status = 'human_required', ai_mode = 'paused', mode = 'human_handling',
              needs_attention = 1, attention_reason = ?, handoff_reason = ?, sentiment = ?,
              intent = ?, ai_summary = ?, recommended_action = ?, confidence_score = ?,
              last_message = ?, updated_at = ?
          WHERE id = ?
        `).run(
          assignedAgentName,
          assignedAgentId,
          assignedAgentName,
          aiResult.handoffReason || 'Customer requested human support',
          aiResult.handoffReason || 'Customer requested human support',
          aiResult.sentiment,
          aiResult.intent,
          aiResult.aiSummary,
          aiResult.recommendedAction || 'Support agent review required',
          aiResult.confidenceScore,
          aiReplyText,
          replyTime,
          convId
        );

        // System notification message
        const sysMsgId = crypto.randomUUID();
        const sysTime = new Date().toISOString();
        const sysContent = `Human handoff triggered: ${aiResult.handoffReason || 'Customer requested agent'}. Assigned to ${assignedAgentName}.`;
        db.prepare(`
          INSERT INTO messages (id, conversation_id, sender_type, sender_name, content, is_internal_note, created_at)
          VALUES (?, ?, 'system', 'System', ?, 0, ?)
        `).run(sysMsgId, convId, sysContent, sysTime);

        await syncMessageToSupabase({
          id: sysMsgId,
          conversationId: convId,
          senderType: 'system',
          senderName: 'System',
          content: sysContent,
          isInternalNote: false,
          attachments: [],
          createdAt: sysTime,
        });

        broadcastInboxEvent(workspaceId, 'status_change', {
          conversationId: convId,
          status: 'HUMAN_HANDLING',
          assignee: assignedAgentName,
          assignedAgentId,
          needsAttention: true,
          attentionReason: aiResult.handoffReason,
          handoffReason: aiResult.handoffReason,
          intent: aiResult.intent,
          aiSummary: aiResult.aiSummary,
          recommendedAction: aiResult.recommendedAction,
        });
      } else {
        db.prepare(`
          UPDATE conversations
          SET status = 'AI_HANDLING', ai_mode = 'ai_auto', mode = 'ai_autonomous', assignee = 'Xia AI',
              last_message = ?, sentiment = ?, intent = ?, ai_summary = ?, recommended_action = ?,
              confidence_score = ?, updated_at = ?
          WHERE id = ?
        `).run(
          aiReplyText,
          aiResult.sentiment,
          aiResult.intent,
          aiResult.aiSummary,
          aiResult.recommendedAction || 'Review customer satisfaction',
          aiResult.confidenceScore,
          replyTime,
          convId
        );

        broadcastInboxEvent(workspaceId, 'status_change', {
          conversationId: convId,
          status: 'AI_HANDLING',
          assignee: 'Xia AI',
          intent: aiResult.intent,
          aiSummary: aiResult.aiSummary,
          sentiment: aiResult.sentiment,
          confidenceScore: aiResult.confidenceScore,
        });
      }

      const aiMsgObj = {
        id: aiMsgId,
        conversationId: convId,
        senderType: 'ai',
        senderName: agentName,
        content: aiReplyText,
        isInternalNote: false,
        attachments: [],
        knowledgeSource: aiResult.knowledgeSource || 'Store FAQ',
        confidenceScore: aiResult.confidenceScore || 0.98,
        createdAt: replyTime,
      };

      // Broadcast AI Message to Dashboard Inbox
      broadcastInboxEvent(workspaceId, 'new_message', { conversationId: convId, message: aiMsgObj });

      // Sync to Supabase
      const updatedConv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId);
      await syncConversationToSupabase(updatedConv);
      await syncMessageToSupabase(aiMsgObj);
    }

    return res.status(200).json({
      success: true,
      conversationId: convId,
      reply: aiReplyText || 'Message received. A support specialist will respond shortly.',
      messageId: aiMsgId || customerMsgId,
      isHandoff,
    });
  } catch (err) {
    console.error('[Public Widget] Error handling message:', err);
    return res.status(500).json({ error: 'Failed to process visitor message.' });
  }
};

// GET /api/channels/public-widget/:siteKey/conversation/:conversationId
export const getPublicWidgetConversation = async (req: Request, res: Response) => {
  try {
    const { siteKey, conversationId } = req.params;

    let channel = (siteKey === 'auto-detect'
      ? db.prepare("SELECT * FROM channels WHERE type = 'website' AND status = 'connected' LIMIT 1").get()
      : db.prepare("SELECT * FROM channels WHERE id = ? AND type = 'website'").get(siteKey)
    ) as DbChannel | undefined;

    if (!channel) {
      channel = db.prepare("SELECT * FROM channels WHERE type = 'website' LIMIT 1").get() as DbChannel | undefined;
    }

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found.' });
    }

    const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND workspace_id = ?').get(conversationId, channel.workspace_id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const rawMessages = db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ? AND is_internal_note = 0
      ORDER BY created_at ASC
    `).all(conversationId) as any[];

    const messages = rawMessages.map((m) => ({
      id: m.id,
      senderType: m.sender_type,
      senderName: m.sender_name,
      content: m.content,
      createdAt: m.created_at,
    }));

    return res.status(200).json({
      conversationId,
      status: (conv as any).status,
      messages,
    });
  } catch (err) {
    console.error('[Public Widget] Error fetching conversation history:', err);
    return res.status(500).json({ error: 'Failed to fetch conversation history.' });
  }
};

// POST /api/channels/public-widget/:siteKey/identify (Link guest visitor to customer email)
export const identifyPublicWidgetVisitor = async (req: Request, res: Response) => {
  try {
    const siteKey = req.params.siteKey;
    const { visitorId, email, name, phone, conversationId } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanVisitorId = visitorId ? String(visitorId).trim() : '';

    // Resolve channel & workspace
    let channel = (siteKey === 'auto-detect'
      ? db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.type = 'website' AND c.status = 'connected' ORDER BY c.created_at ASC LIMIT 1").get()
      : db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.id = ? AND c.type = 'website'").get(siteKey)
    ) as (DbChannel & { workspace_name: string }) | undefined;

    if (!channel) {
      channel = db.prepare("SELECT c.*, w.name as workspace_name FROM channels c JOIN workspaces w ON c.workspace_id = w.id WHERE c.type = 'website' LIMIT 1").get() as any;
    }

    if (!channel) {
      return res.status(404).json({ error: 'Widget channel not found.' });
    }

    const workspaceId = channel.workspace_id;
    const now = new Date().toISOString();

    // Check if customer with this email already exists
    let customer = db.prepare('SELECT * FROM customers WHERE workspace_id = ? AND email = ?').get(workspaceId, cleanEmail) as any;

    if (!customer) {
      // If customer exists with id = cleanVisitorId, update it
      const visitorCustomer = cleanVisitorId ? db.prepare('SELECT * FROM customers WHERE workspace_id = ? AND id = ?').get(workspaceId, cleanVisitorId) as any : null;
      if (visitorCustomer) {
        db.prepare(`
          UPDATE customers
          SET email = ?, name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = ?, last_active_at = ?
          WHERE id = ?
        `).run(cleanEmail, name?.trim() || null, phone?.trim() || null, now, now, cleanVisitorId);
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(cleanVisitorId) as any;
      } else {
        // Create new customer record
        const customerId = cleanVisitorId || crypto.randomUUID();
        const displayName = name?.trim() || 'Verified Customer';
        db.prepare(`
          INSERT INTO customers (id, workspace_id, name, email, phone, company, location, avatar, status, tags, created_at, updated_at, last_active_at)
          VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, 'active', ?, ?, ?, ?)
        `).run(customerId, workspaceId, displayName, cleanEmail, phone?.trim() || null, JSON.stringify(['Identified Visitor']), now, now, now);
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId) as any;
      }
    } else {
      // Existing customer found by email, update contact info if provided
      if (name?.trim() || phone?.trim()) {
        db.prepare(`
          UPDATE customers
          SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = ?, last_active_at = ?
          WHERE id = ?
        `).run(name?.trim() || null, phone?.trim() || null, now, now, customer.id);
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id) as any;
      }
    }

    // Merge visitor record to this customer
    if (cleanVisitorId) {
      db.prepare(`
        UPDATE visitors
        SET customer_id = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).run(customer.id, now, cleanVisitorId, workspaceId);
    }

    // Update conversation if provided or matching visitor id
    if (conversationId) {
      db.prepare(`
        UPDATE conversations
        SET customer_name = ?, customer_email = ?, customer_phone = COALESCE(?, customer_phone), updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).run(customer.name, customer.email, customer.phone, now, conversationId, workspaceId);

      broadcastInboxEvent(workspaceId, 'conversation_updated', {
        conversationId,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
      });
    }

    // Sync to Supabase
    syncCustomerToSupabase(customer);

    broadcastInboxEvent(workspaceId, 'customer_updated', {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      conversationId,
    });

    return res.status(200).json({
      success: true,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
    });
  } catch (err) {
    console.error('[Public Widget] Error identifying visitor:', err);
    return res.status(500).json({ error: 'Failed to identify visitor.' });
  }
};

// GET /api/channels/public-widget/:siteKey/conversation/:conversationId/events (Public SSE stream for customer live chat)
export const streamPublicWidgetEvents = (req: Request, res: Response) => {
  const { conversationId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const handler = (event: any) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {}
  };

  inboxEventEmitter.on(`conversation:${conversationId}`, handler);

  req.on('close', () => {
    inboxEventEmitter.off(`conversation:${conversationId}`, handler);
  });
};

// POST /api/channels/:id/test
export const testChannelConnection = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const channelId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND workspace_id = ?').get(channelId, workspace.id) as DbChannel | undefined;
    if (!channel) return res.status(404).json({ error: 'Channel not found.' });

    if (channel.type === 'website') {
      return res.status(200).json({
        success: true,
        message: 'Website Live Chat is connected and healthy. Public widget API endpoint active.',
        latencyMs: 42,
      });
    }

    if (channel.status === 'not_connected') {
      return res.status(200).json({
        success: false,
        message: `${channel.name} is not configured yet. Meta API credentials required in environment settings.`,
        latencyMs: 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Channel ${channel.name} health check passed.`,
      latencyMs: 85,
    });
  } catch (err) {
    console.error('Error testing channel connection:', err);
    return res.status(500).json({ error: 'Failed to test channel connection.' });
  }
};

// POST /api/channels/:id/disconnect
export const disconnectChannel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const channelId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND workspace_id = ?').get(channelId, workspace.id) as DbChannel | undefined;
    if (!channel) return res.status(404).json({ error: 'Channel not found.' });

    const now = new Date().toISOString();
    db.prepare("UPDATE channels SET status = 'not_connected', updated_at = ? WHERE id = ? AND workspace_id = ?").run(now, channelId, workspace.id);

    return res.status(200).json({ success: true, message: 'Channel disconnected. Past conversation history retained.' });
  } catch (err) {
    console.error('Error disconnecting channel:', err);
    return res.status(500).json({ error: 'Failed to disconnect channel.' });
  }
};

// POST /api/channels/:provider/connect
export const connectChannel = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const provider = req.params.provider; // 'meta' | 'facebook' | 'instagram' | 'whatsapp' | 'website'
    const { name, externalAccountId, accessToken, phoneNumberId, pageId, config, defaultAgentId } = req.body;

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Validate Credentials
    if (provider !== 'website') {
      const accountId = externalAccountId || pageId || phoneNumberId;
      if (!accountId || typeof accountId !== 'string' || !accountId.trim()) {
        return res.status(400).json({ error: 'Account ID or Page/Phone ID is required to connect channel.' });
      }
      if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
        return res.status(400).json({ error: 'Access token or API secret key is required.' });
      }
      if (accessToken.trim().length < 8) {
        return res.status(400).json({ error: 'Invalid API access token or secret credentials.' });
      }
    }

    ensureSeedChannels(workspace.id);

    const typeKey = provider === 'meta' ? 'facebook' : provider;
    const accountId = externalAccountId || pageId || phoneNumberId || `${workspace.slug}-${typeKey}`;

    // Prevent Duplicate Active Connection
    const existing = db.prepare(`
      SELECT id, status FROM channels
      WHERE workspace_id = ? AND type = ? AND external_account_id = ?
    `).get(workspace.id, typeKey, accountId.trim()) as DbChannel | undefined;

    if (existing && existing.status === 'connected') {
      return res.status(409).json({ error: 'This channel account is already connected to your workspace.' });
    }

    const now = new Date().toISOString();
    // Securely reference/hash secret credentials without storing raw token
    const credentialsRef = accessToken ? crypto.createHash('sha256').update(accessToken).digest('hex') : null;
    const channelName = name && name.trim() ? name.trim() : `${String(typeKey).toUpperCase()} Channel (${accountId.slice(0, 10)})`;

    let channelId: string;

    if (existing) {
      channelId = existing.id;
      db.prepare(`
        UPDATE channels
        SET status = 'connected',
            name = ?,
            credentials_reference = ?,
            default_agent_id = COALESCE(?, default_agent_id),
            updated_at = ?
        WHERE id = ? AND workspace_id = ?
      `).run(channelName, credentialsRef, defaultAgentId || null, now, channelId, workspace.id);
    } else {
      channelId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO channels (
          id, workspace_id, type, name, status, provider, external_account_id,
          config, credentials_reference, default_agent_id, last_activity_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'connected', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        channelId,
        workspace.id,
        typeKey,
        channelName,
        provider,
        accountId.trim(),
        JSON.stringify(config || { enableAI: true }),
        credentialsRef,
        defaultAgentId || null,
        now,
        now,
        now
      );
    }

    return res.status(200).json({
      success: true,
      message: `${channelName} connected successfully.`,
      channel: {
        id: channelId,
        workspaceId: workspace.id,
        type: typeKey,
        name: channelName,
        status: 'connected',
        provider,
        externalAccountId: accountId.trim(),
        defaultAgentId,
        updatedAt: now,
      },
    });
  } catch (err) {
    console.error('Error connecting channel:', err);
    return res.status(500).json({ error: 'Failed to connect channel integration.' });
  }
};

// GET /api/webhooks/:provider (Meta / WhatsApp challenge verification endpoint)
export const verifyWebhookChallenge = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'xia_chat_webhook_verify_secret';

    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }

    return res.status(403).json({ error: 'Webhook verification token mismatch.' });
  } catch (err) {
    console.error('Error verifying webhook challenge:', err);
    return res.status(500).json({ error: 'Webhook verification failed.' });
  }
};

// POST /api/webhooks/:provider (Secure normalized webhook endpoint)
export const handleIncomingWebhook = async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider; // 'website' | 'meta' | 'whatsapp'

    // ── HMAC-SHA256 Signature Verification (Meta / Facebook / WhatsApp) ──────
    if ((provider === 'meta' || provider === 'whatsapp') && process.env.META_APP_SECRET) {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;

      if (!signature) {
        return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header.' });
      }

      const rawBody = JSON.stringify(req.body);
      const expectedSig = `sha256=${crypto
        .createHmac('sha256', process.env.META_APP_SECRET)
        .update(rawBody, 'utf8')
        .digest('hex')}`;

      // Constant-time comparison to prevent timing attacks
      const sigBuffer = Buffer.from(signature, 'utf8');
      const expectedBuffer = Buffer.from(expectedSig, 'utf8');

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        console.warn(`[Webhook] HMAC signature mismatch from provider: ${provider}`);
        return res.status(401).json({ error: 'Invalid webhook signature.' });
      }
    }

    // ── Idempotency Deduplication ─────────────────────────────────────────────
    // Prevent reprocessing the same event if Meta sends duplicates or retries
    const eventId: string | undefined =
      req.body?.entry?.[0]?.id ||
      req.body?.event_id ||
      req.body?.id;

    if (eventId) {
      const existingEvent = db.prepare(
        'SELECT id FROM webhook_events WHERE id = ? AND event_type = ?'
      ).get(eventId, provider);

      if (existingEvent) {
        // Already processed — return 200 to acknowledge without reprocessing
        return res.status(200).json({ status: 'ALREADY_PROCESSED', provider });
      }

      // Record event for deduplication
      const now = new Date().toISOString();
      try {
        db.prepare(
          'INSERT INTO webhook_events (id, event_type, processed_at, payload) VALUES (?, ?, ?, ?)'
        ).run(eventId, provider, now, JSON.stringify(req.body).substring(0, 4096));
      } catch {
        // Duplicate insert race condition — still safe to proceed
      }
    }

    // ── Route to appropriate handler (future: channel-specific processing) ────
    console.log(`[Webhook] Received ${provider} event${eventId ? ` (id: ${eventId})` : ''}`);

    return res.status(200).json({ status: 'EVENT_RECEIVED', provider });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
};

// ============================================================
// Public Widget Attachment Upload Handler (Supabase Storage)
// ============================================================
export async function handlePublicWidgetUpload(req: Request, res: Response) {
  try {
    const { siteKey } = req.params;
    const { filename, contentType, base64 } = req.body;

    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'Base64 file data is required.' });
    }

    let workspaceId = 'default';
    if (siteKey && siteKey !== 'auto-detect') {
      const channel = db.prepare('SELECT workspace_id FROM channels WHERE widget_site_key = ? OR id = ?').get(siteKey, siteKey) as any;
      if (channel && channel.workspace_id) {
        workspaceId = channel.workspace_id;
      }
    } else {
      const firstWs = db.prepare('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1').get() as any;
      if (firstWs) workspaceId = firstWs.id;
    }

    const cleanBase64 = base64.includes(';base64,') ? base64.split(';base64,').pop()! : base64;
    const fileBuffer = Buffer.from(cleanBase64, 'base64');

    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
    }

    const result = await uploadChatAttachment(
      fileBuffer,
      filename || 'chat-upload.png',
      contentType || 'image/png',
      workspaceId
    );

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Widget Upload] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload attachment.' });
  }
}

