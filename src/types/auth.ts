export interface User {
  id: string;
  name: string;
  email: string;
  authProvider: 'local' | 'google' | 'both';
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
