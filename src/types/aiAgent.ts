export type AIAgentStatus = 'active' | 'paused' | 'draft';

export type AIAgentTone = 'Friendly' | 'Professional' | 'Casual' | 'Concise' | 'Empathetic';

export type ResponseStyle = 'Concise' | 'Balanced' | 'Detailed';

export interface KnowledgeSourceItem {
  id: string;
  name: string;
  type: string;
  updatedTime: string;
  enabled: boolean;
}

export interface ChannelItem {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  enabled: boolean;
}

export interface AIAgent {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  avatar: string;
  status: AIAgentStatus;
  tone: AIAgentTone;
  customInstructions: string;
  responseStyle: ResponseStyle;
  autoReplyEnabled: boolean;
  humanHandoffEnabled: boolean;
  handoffConditions: string[];
  handoffMessage: string;
  knowledgeSources: string[];
  channels: string[];
  customRules: string[];
  conversationsHandled: number;
  resolutionRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  knowledgeSourceUsed?: string;
  confidenceScore?: number;
  responseTimeMs?: number;
  timestamp: string;
}
