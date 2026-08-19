export type ConversationStatus = 'open' | 'ai' | 'human' | 'assigned' | 'waiting' | 'resolved' | 'closed';

export type ChannelType = 'Website' | 'Facebook' | 'WhatsApp' | 'Instagram' | 'Email';

export interface ConversationItem {
  id: string;
  workspaceId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone?: string | null;
  channel: ChannelType | string;
  status: ConversationStatus;
  assignee: string;
  lastMessage: string;
  needsAttention: boolean;
  attentionReason?: string | null;
  confidenceScore: number;
  sentiment: string;
  unreadCount: number;
  tags: string[];
  notes?: string;
  aiStatus?: string;
  draftMessage?: string | null;
  firstSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'ai' | 'agent' | 'system';
  senderName: string | null;
  content: string;
  isInternalNote?: boolean;
  attachments?: Array<{ name: string; url: string; size?: string }>;
  createdAt: string;
}

export interface CustomerProfile {
  name: string;
  email: string | null;
  phone: string | null;
  channel: string;
  firstSeen: string;
  lastActive: string;
  totalConversations: number;
  tags: string[];
  notes: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface InboxStats {
  total: number;
  open: number;
  assigned: number;
  ai: number;
  resolved: number;
}

export interface FilterState {
  search: string;
  tab: 'all' | 'open' | 'assigned' | 'ai' | 'resolved';
  channel?: string;
  status?: string;
  assignee?: string;
  aiOnly: boolean;
  unread: boolean;
}
