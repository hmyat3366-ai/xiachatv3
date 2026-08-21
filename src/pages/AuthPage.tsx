import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2, Loader2, KeyRound, Eye, EyeOff, Sparkles, MessageSquare, Bot, UserCheck, ShieldCheck, AtSign, UserPlus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo, LogoIcon } from '../components/Logo';

export type AuthPageMode = 'login' | 'signup' | 'forgot_password' | 'reset_password' | 'set_password';

interface AuthPageProps {
  initialMode?: AuthPageMode;
  resetToken?: string;
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  resetToken = '',
  onNavigate,
}) => {
  const { user, login, signup, confirmGoogleSignup, forgotPassword, verifyResetCode, resetPassword, setupPassword, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthPageMode>(initialMode);

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // Email or Username for Login
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // Username for Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(resetToken);
  const [showPassword, setShowPassword] = useState(false);

  // 3-Step Forgot Password States
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedResetToken, setVerifiedResetToken] = useState('');
  const [codeDevHint, setCodeDevHint] = useState<string | null>(null);

  // Pending Google Signup & Existing Account Modals
  const [pendingTempToken, setPendingTempToken] = useState<string | null>(null);
  const [pendingGoogleName, setPendingGoogleName] = useState<string>('');
  const [pendingGoogleEmail, setPendingGoogleEmail] = useState<string>('');
  const [existingGoogleEmail, setExistingGoogleEmail] = useState<string | null>(null);

  // Field Errors & UI States
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Parse URL Parameters for Google Pending Signup & Existing Account Notice & Reset Token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googlePending = params.get('google_signup_pending') === 'true';
    const tempToken = params.get('temp_token');
    const gEmail = params.get('email');
    const gName = params.get('name');
    const accountExists = params.get('google_account_exists') === 'true';
    const authError = params.get('auth_error');

    if (googlePending && tempToken) {
      setPendingTempToken(tempToken);
      if (gEmail) setPendingGoogleEmail(gEmail);
      if (gName) setPendingGoogleName(gName);
    }

    if (accountExists && gEmail) {
      setExistingGoogleEmail(gEmail);
    }

    // Display user-friendly error messages for OAuth failures
    if (authError) {
      const errorMessages: Record<string, string> = {
        oauth_cancelled: 'Google sign-in was cancelled. Please try again.',
        invalid_state: 'Authentication session expired. Please try again.',
        invalid_code: 'Authentication failed. Please try signing in again.',
        token_exchange_failed: 'Could not verify your Google account. Please try again.',
        token_missing: 'Google authentication failed. Please try again.',
        userinfo_failed: 'Could not retrieve your Google profile. Please try again.',
        server_error: 'A server error occurred. Please try again.',
      };
      setFormError(errorMessages[authError] || 'Google sign-in failed. Please try again.');
      // Clean the auth_error param from URL
      params.delete('auth_error');
      const cleanSearch = params.toString();
      const newUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    setMode(initialMode);
    setFormError(null);
    setFormSuccess(null);
    setFieldErrors({});
    setForgotStep(1);
  }, [initialMode]);

  useEffect(() => {
    if (resetToken) {
      setToken(resetToken);
      setVerifiedResetToken(resetToken);
      setForgotStep(3);
      setMode('forgot_password');
    }
  }, [resetToken]);

  // If already authenticated, redirect appropriately
  useEffect(() => {
    if (isAuthenticated && user) {
      if (mode === 'set_password') {
        if (user.hasPassword) {
          onNavigate(user.onboardingCompleted ? '/dashboard' : '/onboarding');
        }
      } else {
        if (!user.onboardingCompleted) {
          onNavigate('/onboarding');
        } else {
          onNavigate('/dashboard');
        }
      }
    }
  }, [isAuthenticated, user, mode, onNavigate]);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleGoogleAuth = (intent: 'login' | 'signup' = 'login') => {
    setIsGoogleLoading(true);
    window.location.href = `/api/auth/google?intent=${intent}`;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const errors: { [key: string]: string } = {};

    const loginIdentifier = (identifier || email).trim();

    if (!loginIdentifier) {
      errors.identifier = 'Email or Username is required.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await login(loginIdentifier, password);
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess('Signed in successfully! Redirecting...');
      setTimeout(() => {
        onNavigate(user?.onboardingCompleted ? '/dashboard' : '/onboarding');
      }, 400);
    } else {
      setFormError(result.error || 'Email/username or password is incorrect.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const errors: { [key: string]: string } = {};

    if (!name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!username.trim()) {
      errors.username = 'Username is required.';
    } else if (username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    }

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await signup(name, username, email, password, confirmPassword);
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess('Account created! Setting up your workspace...');
      setTimeout(() => {
        onNavigate('/onboarding');
      }, 400);
    } else {
      setFormError(result.error || 'Failed to create account.');
    }
  };

  // Step 1: Send verification code to email
  const handleSendResetCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!email.trim() || !validateEmail(email)) {
      setFieldErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await forgotPassword(email);
    setIsSubmitting(false);

    if (result.success) {
      if (result.codeDev) {
        setCodeDevHint(result.codeDev);
      }
      setFormSuccess(result.message || 'Verification code sent to your email.');
      setForgotStep(2);
    } else {
      setFormError(result.error || 'Failed to send verification code.');
    }
  };

  // Step 2: Verify 6-digit code
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!verificationCode.trim() || verificationCode.trim().length !== 6) {
      setFieldErrors({ code: 'Please enter the 6-digit verification code.' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await verifyResetCode(email, verificationCode);
    setIsSubmitting(false);

    if (result.success && result.resetToken) {
      setVerifiedResetToken(result.resetToken);
      setFormSuccess('Verification code confirmed! Enter your new password below.');
      setForgotStep(3);
    } else {
      setFormError(result.error || 'Invalid or expired verification code.');
    }
  };

  // Step 3: Reset Password with Verified Token
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const errors: { [key: string]: string } = {};

    const activeToken = verifiedResetToken || token;

    if (!activeToken.trim()) {
      errors.token = 'Password reset token is missing or invalid.';
    }

    if (!password) {
      errors.password = 'New password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await resetPassword(activeToken, password, confirmPassword);
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess(result.message || 'Password reset successfully! Redirecting to sign in...');
      setTimeout(() => {
        setMode('login');
        setForgotStep(1);
      }, 1500);
    } else {
      setFormError(result.error || 'Failed to reset password.');
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const errors: { [key: string]: string } = {};

    if (!password) {
      errors.password = 'New password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await setupPassword(password, confirmPassword);
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess('Password set successfully! Redirecting...');
      setTimeout(() => {
        onNavigate(user?.onboardingCompleted ? '/dashboard' : '/onboarding');
      }, 1200);
    } else {
      setFormError(result.error || 'Failed to set password.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F7F5] text-[#171717] relative flex flex-col justify-between overflow-x-hidden selection:bg-[#FFF0E5] selection:text-[#D96512]">
      
      {/* ─────────────────────────────────────────────────────────────
          1. ATMOSPHERIC WARM CONVERSATIONAL BACKGROUND (SVG + Canvas Elements)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft Circular Radial Gradients */}
        <div className="absolute -top-32 left-[10%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-[#FFF0E5] to-transparent opacity-80 blur-3xl"></div>
        <div className="absolute bottom-0 left-[25%] w-[450px] h-[450px] rounded-full bg-[#FF8A2A]/5 blur-3xl"></div>
        
        {/* Decorative Thin Curved Conversation Flow Vectors */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.14]" fill="none" stroke="currentColor">
          <path d="M-100,180 Q300,100 700,320 T1500,200" stroke="#FF8A2A" strokeWidth="1.5" fill="none" strokeDasharray="6 6" />
          <path d="M-50,450 Q450,600 900,350 T1600,550" stroke="#D96512" strokeWidth="1" fill="none" />
          <circle cx="280" cy="220" r="140" stroke="#FF8A2A" strokeWidth="1" strokeDasharray="4 4" fill="none" />
          <circle cx="280" cy="220" r="4" fill="#FF8A2A" />
          <circle cx="720" cy="480" r="90" stroke="#FF8A2A" strokeWidth="1" fill="none" />
        </svg>

        {/* Floating Subtle Ambient Icons */}
        <div className="absolute top-[28%] left-[8%] p-3 rounded-2xl bg-white/40 backdrop-blur-xs border border-white/60 shadow-xs hidden lg:block animate-pulse">
          <MessageSquare className="w-5 h-5 text-[#FF8A2A]" />
        </div>
        <div className="absolute bottom-[22%] left-[42%] p-2.5 rounded-2xl bg-white/40 backdrop-blur-xs border border-white/60 shadow-xs hidden lg:block">
          <Bot className="w-4 h-4 text-[#D96512]" />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP LEFT: LOGO (Generous Spacing, Edge Aligned)
         ───────────────────────────────────────────────────────────── */}
      <header className="relative z-20 px-6 sm:px-12 pt-6 sm:pt-8 flex items-center justify-between pointer-events-auto">
        <Logo variant="full" size="md" onClick={() => onNavigate('/')} />

        {/* Back to Site link */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/');
          }}
          className="text-xs font-semibold text-[#6B6B6B] hover:text-[#171717] transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>Back to main site</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN LAYOUT: TWO-COLUMN COMPOSITION (NAVOS REFERENCE COMPOSITION)
         ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-[1360px] w-full mx-auto px-6 sm:px-12 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        
        {/* ─── LEFT BRAND AREA (Large Brand Typography & Product UI Snippets) ─── */}
        <div className="w-full lg:w-[50%] flex flex-col justify-center space-y-8 py-4">
          
          {/* Main Headline & Identity */}
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0E5] border border-[#FF8A2A]/20 text-[#D96512] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#FF8A2A]" />
              <span>Next-Gen Intelligent Inbox</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-[#171717] tracking-tight leading-[1.12]">
              Customer conversations, <br />
              <span className="text-[#FF8A2A]">made smarter.</span>
            </h1>
            
            <p className="text-base sm:text-lg text-[#6B6B6B] leading-relaxed max-w-lg">
              Unify WhatsApp, Instagram, and Webchat into one autonomous workspace powered by custom trained Xia AI agents.
            </p>
          </div>

          {/* Floating Product UI Fragments (Clean Minimalism, Communicates Product) */}
          <div className="space-y-3 max-w-md pt-2">
            
            {/* Customer Message Pill */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/90 border border-[#E8E8E5] shadow-xs backdrop-blur-md transition-transform hover:-translate-y-0.5 duration-200">
              <div className="w-8 h-8 rounded-full bg-[#171717] text-white font-bold text-xs flex items-center justify-center shrink-0">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#171717]">David M. <span className="text-[10px] text-gray-400 font-normal">· WhatsApp</span></p>
                <p className="text-xs text-[#6B6B6B] truncate font-medium">"Where is my order #84920?"</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0">
                Inquiry
              </span>
            </div>

            {/* AI Automated Response Pill */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-[#FFF0E5] to-white border border-[#FF8A2A]/30 shadow-xs backdrop-blur-md ml-4 sm:ml-6 transition-transform hover:-translate-y-0.5 duration-200">
              <div className="w-8 h-8 rounded-full bg-[#FF8A2A] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-[#171717]">Xia AI Agent</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FF8A2A]/20 text-[#D96512]">Instant</span>
                </div>
                <p className="text-xs text-[#6B6B6B] truncate font-medium">"Your order is out for delivery! Tracking ID: #84920."</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                AI Replied
              </span>
            </div>

            {/* Human Handoff Status Tag */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/80 border border-[#E8E8E5] text-xs text-[#6B6B6B] max-w-xs shadow-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-[#171717]">Seamless Human Takeover</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600">Active</span>
            </div>

          </div>

          {/* Security Badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6B6B] pt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>SOC2 Type II & End-to-End Encrypted Architecture</span>
          </div>

        </div>

        {/* ─── RIGHT SIDE: COMPACT AUTHENTICATION CARD (NAVOS STYLE) ─── */}
        <div className="w-full lg:w-[45%] flex justify-center lg:justify-end">
          
          <div className="w-full max-w-[420px] bg-white rounded-[24px] p-7 sm:p-9 shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#E8E8E5] relative transition-all">
            
            {/* Header / Brand Icon inside Card */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] mb-3 shadow-xs">
                {mode === 'forgot_password' || mode === 'reset_password' ? (
                  <KeyRound className="w-5 h-5" />
                ) : (
                  <LogoIcon size={24} color="#FF8A2A" accentColor="#1E1E1E" />
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-[#171717] tracking-tight">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'forgot_password' && (
                  forgotStep === 1 ? 'Reset Password' : forgotStep === 2 ? 'Verification Code' : 'Make New Password'
                )}
                {mode === 'reset_password' && 'Set New Password'}
                {mode === 'set_password' && 'Set New Password'}
              </h2>
              <p className="text-xs text-[#6B6B6B] mt-1.5">
                {mode === 'login' && 'Sign in to manage your Xia Chat inbox & AI agents.'}
                {mode === 'signup' && 'Join thousands of teams handling customer chat seamlessly.'}
                {mode === 'forgot_password' && (
                  forgotStep === 1
                    ? 'Enter your account email to receive a verification code.'
                    : forgotStep === 2
                    ? `Enter the 6-digit verification code sent to ${email || 'your email'}.`
                    : 'Create a new password for your account.'
                )}
                {mode === 'reset_password' && 'Enter your new password below.'}
                {mode === 'set_password' && 'Enter your new password below.'}
              </p>
            </div>

            {/* Global Error Banner */}
            {formError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Global Success Banner */}
            {formSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* ─── 1. LOGIN MODE ─── */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={identifier || email}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setEmail(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, identifier: '', email: '' }));
                      }}
                      placeholder="name@company.com or username"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.identifier || fieldErrors.email
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {(fieldErrors.identifier || fieldErrors.email) && (
                    <p className="mt-1 text-[11px] text-red-600">{fieldErrors.identifier || fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setForgotStep(1);
                        setFormError(null);
                        setFormSuccess(null);
                      }}
                      className="text-[11px] font-semibold text-[#FF8A2A] hover:text-[#D96512] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      placeholder="••••••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.password
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                      }`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                </div>

                {/* Primary CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E8E8E5]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-3 text-[#8E8E93] font-semibold">Or</span>
                  </div>
                </div>

                {/* Secondary CTA: Google Auth */}
                <button
                  type="button"
                  onClick={() => handleGoogleAuth('login')}
                  disabled={isGoogleLoading || isSubmitting}
                  className="w-full py-2.5 rounded-full border border-[#E8E8E5] bg-white hover:bg-[#F7F7F5] text-[#171717] font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-60 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.36 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                {/* Switch Mode Link */}
                <div className="text-center pt-2">
                  <span className="text-xs text-[#6B6B6B]">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setFormError(null);
                      setFormSuccess(null);
                    }}
                    className="text-xs font-bold text-[#FF8A2A] hover:underline cursor-pointer"
                  >
                    Sign up
                  </button>
                </div>
              </form>
            )}

            {/* ─── 2. SIGNUP MODE ─── */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3" noValidate>
                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      placeholder="Sarah Jenkins"
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.name
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.name && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, username: '' }));
                      }}
                      placeholder="sarah_jenkins"
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.username
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.username && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.username}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="sarah@company.com"
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.email
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      placeholder="Min. 8 characters"
                      className={`w-full pl-10 pr-10 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.password
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                      }`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.confirmPassword
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirmPassword}</p>}
                </div>

                {/* Primary CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E8E8E5]"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-3 text-[#8E8E93] font-semibold">Or</span>
                  </div>
                </div>

                {/* Secondary CTA: Google Auth */}
                <button
                  type="button"
                  onClick={() => handleGoogleAuth('signup')}
                  disabled={isGoogleLoading || isSubmitting}
                  className="w-full py-2.5 rounded-full border border-[#E8E8E5] bg-white hover:bg-[#F7F7F5] text-[#171717] font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-60 cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.36 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                {/* Switch Mode Link */}
                <div className="text-center pt-2">
                  <span className="text-xs text-[#6B6B6B]">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setFormError(null);
                      setFormSuccess(null);
                    }}
                    className="text-xs font-bold text-[#FF8A2A] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* ─── 3. FORGOT PASSWORD MODE (3-STEP FLOW) ─── */}
            {mode === 'forgot_password' && (
              <div>
                {/* STEP 1: Send Verification Code */}
                {forgotStep === 1 && (
                  <form onSubmit={handleSendResetCodeSubmit} className="space-y-4" noValidate>
                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                        Your Account Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setFieldErrors((prev) => ({ ...prev, email: '' }));
                          }}
                          placeholder="name@company.com"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                            fieldErrors.email
                              ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                              : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                          }`}
                          disabled={isSubmitting}
                        />
                      </div>
                      {fieldErrors.email && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.email}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Code...</span>
                        </>
                      ) : (
                        <span>Send Code →</span>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setFormError(null);
                          setFormSuccess(null);
                        }}
                        className="text-xs font-bold text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
                      >
                        ← Back to Sign In
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: Enter Verification Code */}
                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyCodeSubmit} className="space-y-4" noValidate>
                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => {
                          setVerificationCode(e.target.value.replace(/[^0-9]/g, ''));
                          setFieldErrors((prev) => ({ ...prev, code: '' }));
                        }}
                        placeholder="123456"
                        className={`w-full text-center tracking-[0.4em] font-mono text-lg py-3 rounded-xl border font-bold bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                          fieldErrors.code
                            ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                            : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                        }`}
                        disabled={isSubmitting}
                      />
                      {fieldErrors.code && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.code}</p>}
                      {codeDevHint && (
                        <p className="mt-2 text-[10px] font-mono bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 text-center">
                          Dev Hint Code: <strong>{codeDevHint}</strong>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <span>Continue →</span>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="font-semibold text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
                      >
                        ← Resend Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="font-semibold text-[#FF8A2A] hover:underline cursor-pointer"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: Enter New Password */}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5" noValidate>
                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-medium bg-[#FAF9F6] outline-none"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-medium bg-[#FAF9F6] outline-none"
                          disabled={isSubmitting}
                        />
                      </div>
                      {fieldErrors.confirmPassword && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirmPassword}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Resetting Password...</span>
                        </>
                      ) : (
                        <span>Reset Password →</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ─── 5. SET PASSWORD MODE (AUTHENTICATED GOOGLE USER FIRST-TIME PASSWORD) ─── */}
            {mode === 'set_password' && (
              <form onSubmit={handleSetPasswordSubmit} className="space-y-3.5" noValidate>
                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-medium bg-[#FAF9F6] outline-none focus:border-[#FF8A2A] transition-colors"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-medium bg-[#FAF9F6] outline-none focus:border-[#FF8A2A] transition-colors"
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Password...</span>
                    </>
                  ) : (
                    <span>Save Password →</span>
                  )}
                </button>
              </form>
            )}

          </div>

        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. SIGNUP CONFIRMATION MODAL (FOR NEW GOOGLE USERS FROM LOGIN)
         ───────────────────────────────────────────────────────────── */}
      {pendingTempToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E8E8E5] relative text-center">
            <button
              onClick={() => {
                setPendingTempToken(null);
                onNavigate('/login');
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <UserPlus className="w-6 h-6 text-[#FF8A2A]" />
            </div>

            <h3 className="text-xl font-extrabold text-[#171717] tracking-tight">Looks like you're new to XiaChat</h3>
            
            <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
              You don't have an account yet. Create your XiaChat account with this Google account to get started.
            </p>

            {pendingGoogleEmail && (
              <div className="my-4 p-3 bg-[#FAF9F6] border border-[#E8E8E5] rounded-2xl text-left text-xs">
                <p className="font-bold text-[#171717]">{pendingGoogleName || 'Google Account'}</p>
                <p className="text-[#6B6B6B]">{pendingGoogleEmail}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  const res = await confirmGoogleSignup(pendingTempToken);
                  setIsSubmitting(false);
                  if (res.success) {
                    setPendingTempToken(null);
                    onNavigate('/set-password');
                  } else {
                    setFormError(res.error || 'Failed to confirm Google signup.');
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Continue Sign Up</span>
                )}
              </button>

              <button
                onClick={() => {
                  setPendingTempToken(null);
                  onNavigate('/login');
                }}
                className="w-full py-2.5 rounded-full border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. EXISTING GOOGLE ACCOUNT NOTICE (FOR GOOGLE SIGNUP ON SIGNUP PAGE)
         ───────────────────────────────────────────────────────────── */}
      {existingGoogleEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E8E8E5] relative text-center">
            <button
              onClick={() => {
                setExistingGoogleEmail(null);
                setMode('login');
                onNavigate('/login');
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#FF8A2A]" />
            </div>

            <h3 className="text-xl font-extrabold text-[#171717] tracking-tight">Account Already Connected</h3>
            
            <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
              This Google account (<span className="font-semibold text-[#171717]">{existingGoogleEmail}</span>) is already connected to XiaChat.
            </p>

            <p className="text-xs text-[#6B6B6B] mt-1.5">
              Please sign in using Google from the Login page.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setExistingGoogleEmail(null);
                  setMode('login');
                  onNavigate('/login');
                }}
                className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Login</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. FOOTER: MINIMALIST PRODUCT PRIVACY / COPYRIGHT
         ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 sm:px-12 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8E8E93] border-t border-[#E8E8E5]/60 bg-white/40 backdrop-blur-xs">
        <p>© {new Date().getFullYear()} Xia Chat Inc. All rights reserved.</p>
        <div className="flex items-center gap-6 mt-2 sm:mt-0">
          <a href="#" className="hover:text-[#171717] transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-[#171717] transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-[#171717] transition-colors">Security Overview</a>
        </div>
      </footer>

    </div>
  );
};
