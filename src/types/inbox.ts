export type ConversationStatus =
  | 'OPEN'
  | 'AI_HANDLING'
  | 'HUMAN_HANDLING'
  | 'WAITING_CUSTOMER'
  | 'WAITING'
  | 'RESOLVED'
  | 'CLOSED'
  | 'open'
  | 'ai'
  | 'human'
  | 'assigned'
  | 'waiting'
  | 'resolved'
  | 'closed';

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
  assignedAgentId?: string | null;
  assignedAgent?: string | null;
  aiMode?: 'ai_auto' | 'human_controlled' | 'paused' | 'resumed' | string;
  mode?: string | null;
  handoffReason?: string | null;
  resolvedAt?: string | null;
  intent?: string | null;
  aiSummary?: string | null;
  recommendedAction?: string | null;
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
  attachments?: Array<{ name?: string; fileName?: string; url: string; size?: string | number; contentType?: string }> | string[];
  knowledgeSource?: string | null;
  confidenceScore?: number | null;
  createdAt: string;
}

export interface CustomerProfile {
  name: string;
  email: string | null;
  phone: string | null;
  location?: string | null;
  channel: string;
  firstSeen: string;
  lastActive: string;
  totalConversations: number;
  tags: string[];
  notes: string;
  intent?: string | null;
  sentiment?: string | null;
  aiSummary?: string | null;
  recommendedAction?: string | null;
  confidenceScore?: number;
  previousConversations?: Array<{
    id: string;
    title: string;
    status: string;
    channel: string;
    date: string;
  }>;
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
  waiting?: number;
  resolved: number;
}

export interface FilterState {
  search: string;
  tab: 'all' | 'open' | 'assigned' | 'ai' | 'waiting' | 'resolved';
  channel?: string;
  status?: string;
  assignee?: string;
  aiOnly: boolean;
  unread: boolean;
}
