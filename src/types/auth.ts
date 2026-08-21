export interface User {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  authProvider: 'local' | 'google' | 'both';
  hasPassword: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface OnboardingData {
  workspaceName?: string;
  workspaceSlug?: string;
  businessType?: string;
  customerChannels?: string[];
  assistantName?: string;
  assistantInstructions?: string;
}
