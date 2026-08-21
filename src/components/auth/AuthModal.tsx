import React, { useState, useEffect } from 'react';
import { LogoIcon } from '../Logo';
import { X, Mail, Lock, User as UserIcon, ArrowRight, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type AuthMode = 'login' | 'signup' | 'forgot_password' | 'reset_password' | 'set_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  resetToken?: string;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  resetToken = '',
  onSuccess,
}) => {
  const { login, signup, forgotPassword, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState(resetToken);

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
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (resetToken) {
      setToken(resetToken);
      setMode('reset_password');
    }
  }, [resetToken]);

  if (!isOpen) return null;

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    const apiBase = import.meta.env.VITE_API_URL || 'https://xiachatv3-production.up.railway.app';
    window.location.href = `${apiBase}/api/auth/google`;
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
        onClose();
        if (onSuccess) onSuccess();
      }, 500);
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
      setFormSuccess('Account created! Welcome to Xia Chat.');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 500);
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
      }, 2000);
    } else {
      setFormError(result.error || 'Failed to reset password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E8E8E5] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 hover:bg-[#F7F7F5] rounded-full transition-colors"
          aria-label="Close Auth Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] mb-3">
            {mode === 'forgot_password' || mode === 'reset_password' ? (
              <KeyRound className="w-6 h-6" />
            ) : (
              <LogoIcon size={28} color="#FF8A2A" accentColor="#1E1E1E" />
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-[#171717] tracking-tight">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot_password' && 'Reset Your Password'}
            {mode === 'reset_password' && 'Set New Password'}
          </h2>
          <p className="text-sm text-[#6B6B6B] mt-1">
            {mode === 'login' && 'Log in to manage your Xia Chat inbox & AI agents'}
            {mode === 'signup' && 'Join thousands of teams handling customer chat seamlessly'}
            {mode === 'forgot_password' && 'Enter your account email to receive reset instructions'}
            {mode === 'reset_password' && 'Enter your new password below'}
          </p>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {formSuccess && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* LOGIN MODE */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="name@company.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                    fieldErrors.email
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#171717] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="text-xs font-semibold text-[#FF8A2A] hover:text-[#D96512] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                    fieldErrors.password
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-[#8E8E93] font-medium">Or</span>
              </div>
            </div>

            {/* Secondary CTA: Google Auth */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full py-3 rounded-full border border-[#E8E8E5] bg-white hover:bg-[#F7F7F5] text-[#171717] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer"
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
                className="text-xs font-bold text-[#FF8A2A] hover:underline"
              >
                Sign up
              </button>
            </div>
          </form>
        )}

        {/* SIGNUP MODE */}
        {mode === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="space-y-3.5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Sarah Jenkins"
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                    fieldErrors.name
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1 uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="sarah@company.com"
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                    fieldErrors.email
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="Min. 8 characters"
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                    fieldErrors.password
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter password"
                  className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                    fieldErrors.confirmPassword
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-1"
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
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-[#8E8E93] font-medium">Or</span>
              </div>
            </div>

            {/* Secondary CTA: Google Auth */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full py-2.5 rounded-full border border-[#E8E8E5] bg-white hover:bg-[#F7F7F5] text-[#171717] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer"
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
                className="text-xs font-bold text-[#FF8A2A] hover:underline"
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD MODE */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5 uppercase tracking-wider">
                Your Account Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="name@company.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium bg-[#FAF9F6] focus:bg-white transition-all outline-none ${
                    fieldErrors.email
                      ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                      : 'border-[#E8E8E5] focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20'
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Email...</span>
                </>
              ) : (
                <span>Send Reset Email</span>
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
                className="text-xs font-bold text-[#6B6B6B] hover:text-[#171717]"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD MODE */}
        {mode === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
            {!resetToken && (
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1 uppercase tracking-wider">
                  Reset Token
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token received in reset link"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] outline-none"
                  disabled={isSubmitting}
                />
                {fieldErrors.token && <p className="mt-1 text-xs text-red-600">{fieldErrors.token}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] outline-none"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E8E8E5] text-sm font-medium bg-[#FAF9F6] outline-none"
                  disabled={isSubmitting}
                />
              </div>
              {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-bold text-[#6B6B6B] hover:text-[#171717]"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
