import { Response } from 'express';
import crypto from 'crypto';
import { db, DbTeamConversation, DbTeamParticipant, DbTeamMessage, DbWorkspaceMember, DbUser } from './db.js';
import { AuthRequest } from './authMiddleware.js';
import { getWorkspaceForUser } from './planLimitMiddleware.js';

// Helper to verify active workspace membership
function getActiveWorkspaceMember(userId: string, workspaceId: string): DbWorkspaceMember | null {
  const member = db.prepare(`
    SELECT * FROM workspace_members
    WHERE workspace_id = ? AND user_id = ? AND status = 'active'
  `).get(workspaceId, userId) as DbWorkspaceMember | undefined;

  return member || null;
}

// GET /api/team-chat/workspace-members
// Returns active workspace members for starting a new DM/Group chat
export const getTeamChatWorkspaceMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Verify requesting user is an ACTIVE member
    const activeMember = getActiveWorkspaceMember(req.user.id, workspace.id);
    if (!activeMember) {
      return res.status(403).json({ error: 'Access denied. Active workspace membership required.' });
    }

    // Fetch all active members in this workspace
    const rawMembers = db.prepare(`
      SELECT m.id as memberId, m.role, u.id as userId, u.name, u.email, u.last_login_at
      FROM workspace_members m
      JOIN users u ON m.user_id = u.id
      WHERE m.workspace_id = ? AND m.status = 'active'
      ORDER BY u.name ASC
    `).all(workspace.id) as Array<{
      memberId: string;
      role: string;
      userId: string;
      name: string;
      email: string;
      last_login_at: string;
    }>;

    const members = rawMembers.map((m) => ({
      id: m.userId,
      memberId: m.memberId,
      name: m.name,
      email: m.email,
      avatar: m.name.charAt(0).toUpperCase(),
      role: m.role,
      isCurrentUser: m.userId === req.user?.id,
    }));

    return res.status(200).json({ members });
  } catch (err) {
    console.error('Error fetching team chat members:', err);
    return res.status(500).json({ error: 'Failed to fetch workspace members.' });
  }
};

// GET /api/team-chat/conversations
// Returns team conversations for current user in current workspace
export const getTeamConversations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(200).json({ conversations: [] });

    // Verify requesting user is an ACTIVE member
    const activeMember = getActiveWorkspaceMember(req.user.id, workspace.id);
    if (!activeMember) {
      return res.status(403).json({ error: 'Access denied. Active workspace membership required.' });
    }

    // Fetch conversations user participates in within this workspace
    const rawConvs = db.prepare(`
      SELECT c.*, p.last_read_at
      FROM team_conversations c
      JOIN team_conversation_participants p ON c.id = p.conversation_id
      WHERE c.workspace_id = ? AND p.user_id = ?
      ORDER BY c.last_message_at DESC
    `).all(workspace.id, req.user.id) as Array<DbTeamConversation & { last_read_at: string | null }>;

    const conversations = rawConvs.map((conv) => {
      // Get all participants for this conversation
      const participants = db.prepare(`
        SELECT u.id as userId, u.name, u.email
        FROM team_conversation_participants p
        JOIN users u ON p.user_id = u.id
        WHERE p.conversation_id = ?
      `).all(conv.id) as Array<{ userId: string; name: string; email: string }>;

      // Calculate unread count
      let unreadCount = 0;
      if (conv.last_read_at) {
        unreadCount = (db.prepare(`
          SELECT COUNT(*) as count FROM team_messages
          WHERE conversation_id = ? AND created_at > ? AND sender_id != ?
        `).get(conv.id, conv.last_read_at, req.user!.id) as { count: number }).count;
      } else {
        unreadCount = (db.prepare(`
          SELECT COUNT(*) as count FROM team_messages
          WHERE conversation_id = ? AND sender_id != ?
        `).get(conv.id, req.user!.id) as { count: number }).count;
      }

      // Title/Name for DM or Group
      let title = conv.title;
      let otherUser: { userId: string; name: string; email: string } | undefined;
      if (conv.type === 'direct') {
        otherUser = participants.find((p) => p.userId !== req.user!.id) || participants[0];
        title = otherUser ? otherUser.name : 'Direct Message';
      }

      return {
        id: conv.id,
        workspaceId: conv.workspace_id,
        type: conv.type,
        title,
        lastMessage: conv.last_message,
        lastMessageAt: conv.last_message_at,
        unreadCount,
        participants: participants.map((p) => ({
          userId: p.userId,
          name: p.name,
          email: p.email,
          avatar: p.name.charAt(0).toUpperCase(),
        })),
        otherUser: otherUser
          ? {
              userId: otherUser.userId,
              name: otherUser.name,
              email: otherUser.email,
              avatar: otherUser.name.charAt(0).toUpperCase(),
            }
          : undefined,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      };
    });

    return res.status(200).json({ conversations });
  } catch (err) {
    console.error('Error fetching team conversations:', err);
    return res.status(500).json({ error: 'Failed to fetch team conversations.' });
  }
};

// POST /api/team-chat/conversations
// Create a new direct or group conversation
export const createTeamConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Verify active membership
    const activeMember = getActiveWorkspaceMember(req.user.id, workspace.id);
    if (!activeMember) {
      return res.status(403).json({ error: 'Access denied. Active workspace membership required.' });
    }

    const { recipientUserId, memberIds, title, initialMessage } = req.body;

    let participantUserIds: string[] = [];
    let convType: 'direct' | 'group' = 'direct';

    if (recipientUserId) {
      // Direct message flow
      convType = 'direct';
      participantUserIds = Array.from(new Set([req.user.id, recipientUserId]));
    } else if (Array.isArray(memberIds) && memberIds.length > 0) {
      // Group message flow
      participantUserIds = Array.from(new Set([req.user.id, ...memberIds]));
      convType = participantUserIds.length > 2 ? 'group' : 'direct';
    } else {
      return res.status(400).json({ error: 'Recipient user ID or member IDs array required.' });
    }

    // Verify all participants are active members of this workspace
    for (const uId of participantUserIds) {
      const isMember = getActiveWorkspaceMember(uId, workspace.id);
      if (!isMember) {
        return res.status(400).json({ error: 'All participants must be active members of this workspace.' });
      }
    }

    const now = new Date().toISOString();

    // Deduplicate Direct Messages: check if DM conversation between these 2 users already exists
    if (convType === 'direct' && participantUserIds.length === 2) {
      const existingConv = db.prepare(`
        SELECT c.id FROM team_conversations c
        JOIN team_conversation_participants p1 ON c.id = p1.conversation_id AND p1.user_id = ?
        JOIN team_conversation_participants p2 ON c.id = p2.conversation_id AND p2.user_id = ?
        WHERE c.workspace_id = ? AND c.type = 'direct'
      `).get(participantUserIds[0], participantUserIds[1], workspace.id) as { id: string } | undefined;

      if (existingConv) {
        return res.status(200).json({ conversationId: existingConv.id, isExisting: true });
      }
    }

    // Create new conversation
    const convId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO team_conversations (id, workspace_id, type, title, created_by, last_message, last_message_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      convId,
      workspace.id,
      convType,
      title || null,
      req.user.id,
      initialMessage || '',
      now,
      now,
      now
    );

    // Insert participants
    const insertParticipantStmt = db.prepare(`
      INSERT INTO team_conversation_participants (id, workspace_id, conversation_id, user_id, last_read_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const uId of participantUserIds) {
      insertParticipantStmt.run(
        crypto.randomUUID(),
        workspace.id,
        convId,
        uId,
        now,
        now
      );
    }

    // If initial message provided, insert message
    if (initialMessage && initialMessage.trim()) {
      db.prepare(`
        INSERT INTO team_messages (id, workspace_id, conversation_id, sender_id, sender_name, sender_email, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        workspace.id,
        convId,
        req.user.id,
        req.user.name,
        req.user.email,
        initialMessage.trim(),
        now,
        now
      );
    }

    return res.status(201).json({ conversationId: convId, isExisting: false });
  } catch (err) {
    console.error('Error creating team conversation:', err);
    return res.status(500).json({ error: 'Failed to create team conversation.' });
  }
};

// GET /api/team-chat/conversations/:id/messages
// Fetch messages for a specific conversation
export const getTeamMessages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Verify active membership
    const activeMember = getActiveWorkspaceMember(req.user.id, workspace.id);
    if (!activeMember) {
      return res.status(403).json({ error: 'Access denied. Active workspace membership required.' });
    }

    // Verify user is a participant of this conversation
    const participant = db.prepare(`
      SELECT * FROM team_conversation_participants
      WHERE conversation_id = ? AND user_id = ? AND workspace_id = ?
    `).get(conversationId, req.user.id, workspace.id) as DbTeamParticipant | undefined;

    if (!participant) {
      return res.status(403).json({ error: 'Access denied. You are not a participant in this conversation.' });
    }

    // Update last_read_at timestamp for current user
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE team_conversation_participants
      SET last_read_at = ?
      WHERE conversation_id = ? AND user_id = ?
    `).run(now, conversationId, req.user.id);

    // Fetch conversation info
    const conversation = db.prepare(`
      SELECT * FROM team_conversations WHERE id = ? AND workspace_id = ?
    `).get(conversationId, workspace.id) as DbTeamConversation | undefined;

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    // Fetch all participants
    const participants = db.prepare(`
      SELECT u.id as userId, u.name, u.email, m.role
      FROM team_conversation_participants p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN workspace_members m ON m.workspace_id = p.workspace_id AND m.user_id = u.id
      WHERE p.conversation_id = ?
    `).all(conversationId) as Array<{ userId: string; name: string; email: string; role: string }>;

    // Fetch messages
    const rawMessages = db.prepare(`
      SELECT * FROM team_messages
      WHERE conversation_id = ? AND workspace_id = ?
      ORDER BY created_at ASC
    `).all(conversationId, workspace.id) as DbTeamMessage[];

    const messages = rawMessages.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      workspaceId: m.workspace_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderEmail: m.sender_email,
      senderAvatar: m.sender_name.charAt(0).toUpperCase(),
      content: m.content,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      isCurrentUser: m.sender_id === req.user?.id,
    }));

    return res.status(200).json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        title: conversation.title,
        participants: participants.map((p) => ({
          userId: p.userId,
          name: p.name,
          email: p.email,
          role: p.role || 'member',
          avatar: p.name.charAt(0).toUpperCase(),
        })),
      },
      messages,
    });
  } catch (err) {
    console.error('Error fetching team messages:', err);
    return res.status(500).json({ error: 'Failed to fetch team messages.' });
  }
};

// POST /api/team-chat/conversations/:id/messages
// Send a message in a conversation
export const postTeamMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const conversationId = req.params.id;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found.' });

    // Verify active membership
    const activeMember = getActiveWorkspaceMember(req.user.id, workspace.id);
    if (!activeMember) {
      return res.status(403).json({ error: 'Access denied. Active workspace membership required.' });
    }

    // Verify user is a participant
    const participant = db.prepare(`
      SELECT * FROM team_conversation_participants
      WHERE conversation_id = ? AND user_id = ? AND workspace_id = ?
    `).get(conversationId, req.user.id, workspace.id);

    if (!participant) {
      return res.status(403).json({ error: 'Access denied. You are not a participant in this conversation.' });
    }

    const now = new Date().toISOString();
    const messageId = crypto.randomUUID();
    const cleanContent = content.trim();

    // Insert message
    db.prepare(`
      INSERT INTO team_messages (id, workspace_id, conversation_id, sender_id, sender_name, sender_email, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      workspace.id,
      conversationId,
      req.user.id,
      req.user.name,
      req.user.email,
      cleanContent,
      now,
      now
    );

    // Update conversation last message & time
    db.prepare(`
      UPDATE team_conversations
      SET last_message = ?, last_message_at = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ?
    `).run(cleanContent, now, now, conversationId, workspace.id);

    // Update read status for sender
    db.prepare(`
      UPDATE team_conversation_participants
      SET last_read_at = ?
      WHERE conversation_id = ? AND user_id = ?
    `).run(now, conversationId, req.user.id);

    return res.status(201).json({
      message: {
        id: messageId,
        conversationId,
        workspaceId: workspace.id,
        senderId: req.user.id,
        senderName: req.user.name,
        senderEmail: req.user.email,
        senderAvatar: req.user.name.charAt(0).toUpperCase(),
        content: cleanContent,
        createdAt: now,
        updatedAt: now,
        isCurrentUser: true,
      },
    });
  } catch (err) {
    console.error('Error posting team message:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
};

// GET /api/team-chat/unread-count
// Returns total unread messages count for sidebar badge
export const getTeamChatUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const requestedWsId = req.query.workspaceId as string | undefined;
    const workspace = getWorkspaceForUser(req.user.id, requestedWsId);
    if (!workspace) return res.status(200).json({ unreadCount: 0 });

    const activeMember = getActiveWorkspaceMember(req.user.id, workspace.id);
    if (!activeMember) return res.status(200).json({ unreadCount: 0 });

    // Calculate total unread team messages across all user conversations in this workspace
    const rawConvs = db.prepare(`
      SELECT c.id, p.last_read_at
      FROM team_conversations c
      JOIN team_conversation_participants p ON c.id = p.conversation_id
      WHERE c.workspace_id = ? AND p.user_id = ?
    `).all(workspace.id, req.user.id) as Array<{ id: string; last_read_at: string | null }>;

    let totalUnread = 0;

    for (const conv of rawConvs) {
      if (conv.last_read_at) {
        const count = (db.prepare(`
          SELECT COUNT(*) as count FROM team_messages
          WHERE conversation_id = ? AND created_at > ? AND sender_id != ?
        `).get(conv.id, conv.last_read_at, req.user.id) as { count: number }).count;
        totalUnread += count;
      } else {
        const count = (db.prepare(`
          SELECT COUNT(*) as count FROM team_messages
          WHERE conversation_id = ? AND sender_id != ?
        `).get(conv.id, req.user.id) as { count: number }).count;
        totalUnread += count;
      }
    }

    return res.status(200).json({ unreadCount: totalUnread });
  } catch (err) {
    console.error('Error fetching team chat unread count:', err);
    return res.status(200).json({ unreadCount: 0 });
  }
};
