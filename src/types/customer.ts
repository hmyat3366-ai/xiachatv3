export type CustomerStatus = 'new' | 'active' | 'returning' | 'blocked';

export type CustomerFilterOption = 'all' | 'active' | 'new' | 'returning' | 'vip';

export type CustomerSortOption =
  | 'recently_active'
  | 'recently_added'
  | 'most_conversations'
  | 'name_asc'
  | 'name_desc';

export interface CustomerNote {
  id: string;
  authorId?: string | null;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerConversationSummary {
  id: string;
  channel: string;
  lastMessage: string;
  status: string;
  assignee?: string | null;
  confidenceScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'create' | 'conversation' | 'tag' | 'note' | 'status';
}

export interface Customer {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company?: string | null;
  location?: string | null;
  avatar?: string;
  status: CustomerStatus;
  tags: string[];
  totalConversations: number;
  lastConversation?: CustomerConversationSummary | null;
  lastActiveAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerProfileSummary {
  totalConversations: number;
  resolvedConversations: number;
  openConversations: number;
  aiHandled: number;
  humanHandled: number;
  lastActiveAt: string;
}
