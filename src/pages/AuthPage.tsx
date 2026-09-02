import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  AtSign,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Logo, LogoIcon } from '../components/Logo';
import { OtpInput } from '../components/auth/OtpInput';
import { PasswordStrengthMeter } from '../components/auth/PasswordStrengthMeter';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';
import { AuthBrandShowcase } from '../components/auth/AuthBrandShowcase';
import { PendingGoogleModal } from '../components/auth/PendingGoogleModal';

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
  const {
    user,
    login,
    signup,
    confirmGoogleSignup,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    setupPassword,
    isAuthenticated,
  } = useAuth();

  const [mode, setMode] = useState<AuthPageMode>(initialMode);

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // Email or Username for Login
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(resetToken);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 3-Step Forgot Password States
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedResetToken, setVerifiedResetToken] = useState('');
  const [codeDevHint, setCodeDevHint] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
      if (user.onboardingCompleted) {
        onNavigate('/dashboard');
      } else {
        onNavigate('/onboarding');
      }
    }
  }, [isAuthenticated, user, onNavigate]);

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
      setResendCooldown(60); // 60s cooldown
    } else {
      setFormError(result.error || 'Failed to send verification code.');
    }
  };

  // Step 2: Verify 6-digit code
  const handleVerifyCodeSubmit = async (e?: React.FormEvent, customCode?: string) => {
    if (e) e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const codeToVerify = customCode || verificationCode;

    if (!codeToVerify.trim() || codeToVerify.trim().length !== 6) {
      setFieldErrors({ code: 'Please enter the 6-digit verification code.' });
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    const result = await verifyResetCode(email, codeToVerify);
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
      }, 1400);
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
    <div className="min-h-screen w-full bg-[#FAF9F6] text-[#171717] relative flex flex-col justify-between overflow-x-hidden selection:bg-[#FFF0E5] selection:text-[#D96512]">
      {/* ─────────────────────────────────────────────────────────────
          1. ATMOSPHERIC BACKGROUND (Soft Radial Gradients + Vector Grid)
         ───────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-[8%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#FFE8D6]/80 via-[#FFF0E5]/40 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-[15%] w-[500px] h-[500px] rounded-full bg-[#FF8A2A]/5 blur-3xl" />

        {/* Subtle Decorative Curves */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.12]" fill="none" stroke="currentColor">
          <path d="M-100,200 Q350,120 750,340 T1600,220" stroke="#FF8A2A" strokeWidth="1.5" strokeDasharray="6 6" />
          <path d="M-50,480 Q500,620 950,380 T1700,580" stroke="#D96512" strokeWidth="1" />
          <circle cx="320" cy="240" r="160" stroke="#FF8A2A" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="320" cy="240" r="4" fill="#FF8A2A" />
        </svg>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TOP HEADER: LOGO & BACK LINK
         ───────────────────────────────────────────────────────────── */}
      <header className="relative z-20 px-6 sm:px-12 pt-6 sm:pt-8 flex items-center justify-between pointer-events-auto">
        <Logo variant="full" size="md" onClick={() => onNavigate('/')} />

        <button
          onClick={() => onNavigate('/')}
          className="text-xs font-bold text-[#6B6B6B] hover:text-[#171717] transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 px-3 rounded-full hover:bg-white/80 border border-transparent hover:border-[#E8E8E5]"
        >
          <span>Back to main site</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT: TWO-COLUMN HERO + AUTH CARD
         ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-[1340px] w-full mx-auto px-6 sm:px-12 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        
        {/* Left Column: Brand Storytelling & Live Mockups */}
        <AuthBrandShowcase />

        {/* Right Column: Premium Auth Card */}
        <div className="w-full lg:w-[46%] flex justify-center lg:justify-end">
          <motion.div
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="w-full max-w-[440px] bg-white rounded-[28px] p-7 sm:p-9 shadow-[0_16px_50px_rgba(0,0,0,0.06)] border border-[#E8E8E5] relative"
          >
            {/* Header / Mode Indicator */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] mb-3.5 shadow-2xs">
                {mode === 'forgot_password' || mode === 'reset_password' ? (
                  <KeyRound className="w-5 h-5" />
                ) : (
                  <LogoIcon size={26} color="#FF8A2A" accentColor="#171717" />
                )}
              </div>

              <h2 className="text-2xl font-black text-[#171717] tracking-tight">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'forgot_password' && (
                  forgotStep === 1
                    ? 'Forgot Password?'
                    : forgotStep === 2
                    ? 'Verify Security Code'
                    : 'Set New Password'
                )}
                {mode === 'reset_password' && 'Reset Your Password'}
                {mode === 'set_password' && 'Create Local Password'}
              </h2>

              <p className="text-xs text-[#6B6B6B] mt-1.5 font-normal leading-relaxed">
                {mode === 'login' && 'Sign in to access your unified inbox, knowledge base & AI agents.'}
                {mode === 'signup' && 'Get started with a 14-day free trial. No credit card required.'}
                {mode === 'forgot_password' && (
                  forgotStep === 1
                    ? 'Enter your registered email to receive a 6-digit verification code.'
                    : forgotStep === 2
                    ? `Enter the 6-digit verification code sent to ${email || 'your email'}.`
                    : 'Choose a strong new password for your Xia Chat account.'
                )}
                {mode === 'reset_password' && 'Enter your new password below to secure your account.'}
                {mode === 'set_password' && 'Set a permanent password for direct email login.'}
              </p>
            </div>

            {/* Error Alert */}
            <AnimatePresence>
              {formError && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2.5 shadow-2xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1">{formError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Alert */}
            <AnimatePresence>
              {formSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="flex-1">{formSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Existing Google Account Alert Notice */}
            {existingGoogleEmail && (
              <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-bold">Google account linked</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    An account for <strong>{existingGoogleEmail}</strong> already exists. Please sign in below.
                  </p>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                MODE 1: LOGIN
               ══════════════════════════════════════════════════════════ */}
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
                          ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                  {(fieldErrors.identifier || fieldErrors.email) && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{fieldErrors.identifier || fieldErrors.email}</p>
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
                      className="text-[11px] font-bold text-[#FF8A2A] hover:text-[#D96512] transition-colors cursor-pointer"
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
                          ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-[11px] text-red-600 font-medium">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] active:bg-[#C2550A] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E8E8E5]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-3 text-[#8E8E93] font-bold">Or continue with</span>
                  </div>
                </div>

                {/* Google Auth Button */}
                <GoogleAuthButton
                  intent="login"
                  isLoading={isGoogleLoading}
                  disabled={isSubmitting}
                  onClick={() => handleGoogleAuth('login')}
                />

                {/* Switch to Signup */}
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
                    Sign up free
                  </button>
                </div>
              </form>
            )}

            {/* ══════════════════════════════════════════════════════════
                MODE 2: SIGNUP
               ══════════════════════════════════════════════════════════ */}
            {mode === 'signup' && (
              <form onSubmit={handleSignupSubmit} className="space-y-3.5" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setFieldErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        placeholder="Sarah Jenkins"
                        className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                          fieldErrors.name
                            ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                            : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15'
                        }`}
                        disabled={isSubmitting}
                        autoFocus
                      />
                    </div>
                    {fieldErrors.name && <p className="mt-1 text-[10px] text-red-600">{fieldErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <AtSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                          setFieldErrors((prev) => ({ ...prev, username: '' }));
                        }}
                        placeholder="sarah_j"
                        className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                          fieldErrors.username
                            ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                            : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15'
                        }`}
                        disabled={isSubmitting}
                      />
                    </div>
                    {fieldErrors.username && <p className="mt-1 text-[10px] text-red-600">{fieldErrors.username}</p>}
                  </div>
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
                          ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15'
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
                          ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} />
                  {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-10 py-2 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.confirmPassword
                          ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Start 14-Day Free Trial</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E8E8E5]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-3 text-[#8E8E93] font-bold">Or sign up with</span>
                  </div>
                </div>

                <GoogleAuthButton
                  intent="signup"
                  isLoading={isGoogleLoading}
                  disabled={isSubmitting}
                  onClick={() => handleGoogleAuth('signup')}
                />

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

            {/* ══════════════════════════════════════════════════════════
                MODE 3: FORGOT PASSWORD (3-STEP WIZARD)
               ══════════════════════════════════════════════════════════ */}
            {mode === 'forgot_password' && (
              <div className="space-y-4">
                {/* Step Progress Indicators */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        step === forgotStep
                          ? 'w-8 bg-[#FF8A2A]'
                          : step < forgotStep
                          ? 'w-4 bg-emerald-500'
                          : 'w-4 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Step 1: Request Email */}
                {forgotStep === 1 && (
                  <form onSubmit={handleSendResetCodeSubmit} className="space-y-4" noValidate>
                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                        Account Email Address
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
                              ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                              : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                          }`}
                          disabled={isSubmitting}
                          autoFocus
                        />
                      </div>
                      {fieldErrors.email && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.email}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Security Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send 6-Digit Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="w-full py-2 text-xs font-semibold text-[#6B6B6B] hover:text-[#171717] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>
                  </form>
                )}

                {/* Step 2: Enter 6-Digit Verification Code */}
                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyCodeSubmit} className="space-y-4" noValidate>
                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider text-center mb-1">
                        Enter 6-Digit Security Code
                      </label>
                      <p className="text-[11px] text-gray-500 text-center mb-2">
                        We sent a code to <span className="font-semibold text-[#171717]">{email}</span>
                      </p>

                      <OtpInput
                        value={verificationCode}
                        onChange={(val) => {
                          setVerificationCode(val);
                          setFieldErrors((prev) => ({ ...prev, code: '' }));
                        }}
                        hasError={Boolean(fieldErrors.code)}
                        onComplete={(val) => handleVerifyCodeSubmit(undefined, val)}
                        disabled={isSubmitting}
                      />

                      {fieldErrors.code && (
                        <p className="mt-1 text-[11px] text-red-600 text-center font-medium">{fieldErrors.code}</p>
                      )}

                      {/* Dev Hint in local mode */}
                      {codeDevHint && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] text-center">
                          ⚡ <strong>Dev Hint:</strong> Code is <span className="font-mono font-bold tracking-widest">{codeDevHint}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || verificationCode.length !== 6}
                      className="w-full py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Continue</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="text-gray-500 hover:text-[#171717] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Change Email</span>
                      </button>

                      <button
                        type="button"
                        disabled={resendCooldown > 0 || isSubmitting}
                        onClick={handleSendResetCodeSubmit}
                        className="text-[#FF8A2A] hover:underline font-bold disabled:text-gray-400 disabled:no-underline cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                        <span>
                          {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3: Enter New Password */}
                {forgotStep === 3 && (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setFieldErrors((prev) => ({ ...prev, password: '' }));
                          }}
                          placeholder="Min. 8 characters"
                          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                            fieldErrors.password
                              ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                              : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                          }`}
                          disabled={isSubmitting}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={password} />
                      {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                          }}
                          placeholder="Re-enter password"
                          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                            fieldErrors.confirmPassword
                              ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                              : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                          }`}
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirmPassword}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Save & Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                MODE 4: RESET PASSWORD (DIRECT TOKEN)
               ══════════════════════════════════════════════════════════ */}
            {mode === 'reset_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      placeholder="Min. 8 characters"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.password
                          ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} />
                  {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.confirmPassword
                          ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Password & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ══════════════════════════════════════════════════════════
                MODE 5: SET PASSWORD (GOOGLE USERS)
               ══════════════════════════════════════════════════════════ */}
            {mode === 'set_password' && (
              <form onSubmit={handleSetPasswordSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      placeholder="Min. 8 characters"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.password
                          ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={password} />
                  {fieldErrors.password && <p className="mt-1 text-[11px] text-red-600">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                        fieldErrors.confirmPassword
                          ? 'border-red-400 focus:ring-3 focus:ring-red-100'
                          : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-3 focus:ring-[#FF8A2A]/15'
                      }`}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="mt-1 text-[11px] text-red-600">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Setting Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. FOOTER: TRUST BADGES & COPYRIGHT
         ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 sm:px-12 py-5 text-center text-xs text-[#8E8E93] border-t border-[#E8E8E5]/80 bg-white/40 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1340px] w-full mx-auto">
        <p>© {new Date().getFullYear()} Xia Chat Inc. All rights reserved.</p>
        <div className="flex items-center gap-4 text-[11px] font-medium text-[#6B6B6B]">
          <span className="hover:text-[#171717] cursor-pointer">Privacy Policy</span>
          <span>·</span>
          <span className="hover:text-[#171717] cursor-pointer">Terms of Service</span>
          <span>·</span>
          <span className="hover:text-[#171717] cursor-pointer">Security Overview</span>
        </div>
      </footer>

      {/* Pending Google Signup Modal */}
      {pendingTempToken && (
        <PendingGoogleModal
          isOpen={Boolean(pendingTempToken)}
          tempToken={pendingTempToken}
          defaultName={pendingGoogleName}
          defaultEmail={pendingGoogleEmail}
          onClose={() => setPendingTempToken(null)}
          onConfirm={async (token, chosenUsername, chosenName) => {
            const res = await confirmGoogleSignup(token);
            if (res.success) {
              setPendingTempToken(null);
              onNavigate('/set-password');
            }
            return res;
          }}
        />
      )}
    </div>
  );
};

export default AuthPage;
