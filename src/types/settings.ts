export type SettingsTab =
  | 'profile'
  | 'notifications'
  | 'security'
  | 'workspace'
  | 'ai'
  | 'privacy'
  | 'account';

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  authProvider: string;
  jobTitle?: string;
  phone?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface NotificationPreferences {
  emailAssignedToMe: boolean;
  emailCustomerReplied: boolean;
  emailAiHandoff: boolean;
  emailTeamInvitation: boolean;
  emailChannelDisconnected: boolean;
  emailSystemAlerts: boolean;
  browserNewConversation: boolean;
  browserAiHandoff: boolean;
  browserMention: boolean;
  browserAssignment: boolean;
}

export interface WorkspaceAIDefaults {
  defaultStyle: 'concise' | 'balanced' | 'detailed';
  defaultTone: 'friendly' | 'professional' | 'casual';
  enableHandoff: boolean;
  safetyKnowledgeOnly: boolean;
  safetyNoHallucination: boolean;
}

export interface SettingsOverviewData {
  profile: UserProfileData;
  notifications: NotificationPreferences;
  aiDefaults: WorkspaceAIDefaults;
  workspace: { id: string; name: string; slug: string } | null;
}
