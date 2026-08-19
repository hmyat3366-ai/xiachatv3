export type ChannelType = 'website' | 'facebook' | 'instagram' | 'whatsapp';

export type ChannelStatus = 'connected' | 'connecting' | 'disconnected' | 'needs_attention' | 'not_connected';

export interface WebsiteWidgetConfig {
  widgetName: string;
  welcomeMessage: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  enableAI: boolean;
  enableHandoff: boolean;
  showAgentAvailability: boolean;
}

export interface Channel {
  id: string;
  workspaceId: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  provider: 'xia' | 'meta' | 'whatsapp_cloud';
  externalAccountId?: string | null;
  config?: WebsiteWidgetConfig | any;
  defaultAgentId?: string | null;
  defaultAgentName?: string | null;
  lastActivityAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
}
