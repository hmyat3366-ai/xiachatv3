import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2, Loader2, KeyRound, Eye, EyeOff, Sparkles, MessageSquare, Bot, UserCheck, ShieldCheck } from 'lucide-react';
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
  const { user, login, signup, forgotPassword, resetPassword, setupPassword, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthPageMode>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(resetToken);
  const [showPassword, setShowPassword] = useState(false);

  // Field Errors & UI States
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setFormError(null);
    setFormSuccess(null);
    setFieldErrors({});
  }, [initialMode]);

  useEffect(() => {
    if (resetToken) {
      setToken(resetToken);
      setMode('reset_password');
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

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    window.location.href = '/api/auth/google';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const errors: { [key: string]: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address.';
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

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess('Signed in successfully! Redirecting...');
      setTimeout(() => {
        // Will be handled by useEffect or navigate
        onNavigate(user?.onboardingCompleted ? '/dashboard' : '/onboarding');
      }, 400);
    } else {
      setFormError(result.error || 'Email or password is incorrect.');
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

    const result = await signup(name, email, password, confirmPassword);
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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
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
      setFormSuccess(result.message || 'If an account matches that email address, password reset instructions have been sent.');
    } else {
      setFormError(result.error || 'Failed to process request.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const errors: { [key: string]: string } = {};

    if (!token.trim()) {
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

    const result = await resetPassword(token, password, confirmPassword);
    setIsSubmitting(false);

    if (result.success) {
      setFormSuccess(result.message || 'Password reset successfully! You can now sign in.');
      setTimeout(() => {
        setMode('login');
      }, 1800);
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
                {mode === 'forgot_password' && 'Reset Password'}
                {mode === 'reset_password' && 'Set New Password'}
              </h2>
              <p className="text-xs text-[#6B6B6B] mt-1.5">
                {mode === 'login' && 'Sign in to manage your Xia Chat inbox & AI agents.'}
                {mode === 'signup' && 'Join thousands of teams handling customer chat seamlessly.'}
                {mode === 'forgot_password' && 'Enter your work email to receive reset instructions.'}
                {mode === 'reset_password' && 'Enter your new password below.'}
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
                    Email Address
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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
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
                  onClick={handleGoogleAuth}
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
                  onClick={handleGoogleAuth}
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

            {/* ─── 3. FORGOT PASSWORD MODE ─── */}
            {mode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" noValidate>
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
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <span>Send Reset Email →</span>
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

            {/* ─── 4. RESET PASSWORD MODE ─── */}
            {mode === 'reset_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5" noValidate>
                {!resetToken && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                      Reset Token
                    </label>
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste token received in reset email"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-medium bg-[#FAF9F6] outline-none"
                      disabled={isSubmitting}
                    />
                    {fieldErrors.token && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.token}</p>}
                  </div>
                )}

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

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs font-bold text-[#6B6B6B] hover:text-[#171717] cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
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
          4. FOOTER: MINIMALIST PRODUCT PRIVACY / COPYRIGHT
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
