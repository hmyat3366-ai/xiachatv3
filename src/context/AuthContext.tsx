import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, AuthState, OnboardingData } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, username: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  confirmGoogleSignup: (tempToken: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; codeDev?: string; error?: string }>;
  verifyResetCode: (email: string, code: string) => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  setupPassword: (password: string, confirmPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resendVerification: () => Promise<{ success: boolean; message?: string; error?: string }>;
  saveOnboardingStep1: (workspaceName: string, workspaceSlug?: string) => Promise<{ success: boolean; workspace?: any; error?: string }>;
  saveOnboardingStep2: (businessType?: string, customerChannels?: string[]) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: (assistantName?: string, assistantInstructions?: string) => Promise<{ success: boolean; error?: string }>;
  fetchOnboardingData: () => Promise<OnboardingData | null>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || '';

// Dev-mode safety check: warn if VITE_API_URL is not set
if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn(
    '[AuthContext] VITE_API_URL is not set. API calls will use relative paths.\n' +
    'Add VITE_API_URL=http://localhost:5000 to your .env file to avoid CORS issues in dev.'
  );
}

// Helper: get stored auth token
function getStoredToken(): string | null {
  return localStorage.getItem('xia_auth_token');
}

// Helper: build auth headers
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // On mount: check for OAuth token in URL query param and store it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('xia_auth_token', urlToken);
      // Clean token from URL without reload
      params.delete('token');
      const cleanSearch = params.toString();
      const newUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
        localStorage.removeItem('xia_auth_token');
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (identifier: string, password: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (data.token) localStorage.setItem('xia_auth_token', data.token);

      if (!res.ok) {
        const errMessage = data.error || 'Email/username or password is incorrect.';
        setError(errMessage);
        return { success: false, error: errMessage };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      const errMessage = 'Network connection error. Please try again.';
      setError(errMessage);
      return { success: false, error: errMessage };
    }
  };

  const signup = async (name: string, username: string, email: string, password: string, confirmPassword: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ name, username, email, password, confirmPassword }),
      });

      const data = await res.json();
      if (data.token) localStorage.setItem('xia_auth_token', data.token);

      if (!res.ok) {
        const errMessage = data.error || 'Failed to create account.';
        setError(errMessage);
        return { success: false, error: errMessage };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      const errMessage = 'Network connection error. Please try again.';
      setError(errMessage);
      return { success: false, error: errMessage };
    }
  };

  const confirmGoogleSignup = async (tempToken: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google/confirm-signup`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ tempToken }),
      });

      const data = await res.json();
      if (data.token) localStorage.setItem('xia_auth_token', data.token);

      if (!res.ok) {
        const errMessage = data.error || 'Failed to confirm Google signup.';
        setError(errMessage);
        return { success: false, error: errMessage };
      }

      setUser(data.user);
      return { success: true, user: data.user, redirectTo: data.redirectTo };
    } catch {
      const errMessage = 'Network error during Google signup confirmation.';
      setError(errMessage);
      return { success: false, error: errMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
      });
      localStorage.removeItem('xia_auth_token');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message, codeDev: data.codeDev };
      } else {
        return { success: false, error: data.error || 'Failed to request password reset.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const verifyResetCode = async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-reset-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, resetToken: data.resetToken };
      } else {
        return { success: false, error: data.error || 'Invalid or expired verification code.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token: string, newPassword: string, confirmPassword: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to reset password.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const setupPassword = async (password: string, confirmPassword: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/set-password`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.user) setUser(data.user);
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to set password.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resendVerification = async () => {
    try {
      // FIX: Added authHeaders() — this endpoint requires authentication
      const res = await fetch(`${API_BASE}/api/auth/resend-verification`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
      });

      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Failed to resend verification email.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const saveOnboardingStep1 = async (workspaceName: string, workspaceSlug?: string) => {
    try {
      // FIX: Added authHeaders() — onboarding requires auth token
      const res = await fetch(`${API_BASE}/api/onboarding/step-1`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ workspaceName, workspaceSlug }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true, workspace: data.workspace };
      } else {
        return { success: false, error: data.error || 'Failed to save workspace.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const saveOnboardingStep2 = async (businessType?: string, customerChannels?: string[]) => {
    try {
      // FIX: Added authHeaders() — onboarding requires auth token
      const res = await fetch(`${API_BASE}/api/onboarding/step-2`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ businessType, customerChannels }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to save business preferences.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const completeOnboarding = async (assistantName?: string, assistantInstructions?: string) => {
    try {
      // FIX: Added authHeaders() — onboarding requires auth token
      const res = await fetch(`${API_BASE}/api/onboarding/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: JSON.stringify({ assistantName, assistantInstructions }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to complete onboarding.' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const fetchOnboardingData = async (): Promise<OnboardingData | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/data`, {
        method: 'GET',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        return {
          workspaceName: data.workspace?.name,
          workspaceSlug: data.workspace?.slug,
          businessType: data.workspace?.businessType,
          customerChannels: data.workspace?.customerChannels,
          assistantName: data.assistant?.name,
          assistantInstructions: data.assistant?.instructions,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
        confirmGoogleSignup,
        forgotPassword,
        verifyResetCode,
        resetPassword,
        setupPassword,
        resendVerification,
        saveOnboardingStep1,
        saveOnboardingStep2,
        completeOnboarding,
        fetchOnboardingData,
        refreshSession: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
