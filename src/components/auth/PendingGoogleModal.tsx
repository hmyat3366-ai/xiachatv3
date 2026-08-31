import React, { useState } from 'react';
import { X, User, AtSign, Loader2, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PendingGoogleModalProps {
  isOpen: boolean;
  tempToken: string;
  defaultName: string;
  defaultEmail: string;
  onClose: () => void;
  onConfirm: (tempToken: string, username: string, name?: string) => Promise<{ success: boolean; error?: string }>;
}

export const PendingGoogleModal: React.FC<PendingGoogleModalProps> = ({
  isOpen,
  tempToken,
  defaultName,
  defaultEmail,
  onClose,
  onConfirm,
}) => {
  const [name, setName] = useState(defaultName || '');
  const [username, setUsername] = useState(
    (defaultEmail.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '')
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please choose a username.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    const result = await onConfirm(tempToken, username.trim(), name.trim());
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Failed to complete Google setup.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-8 shadow-2xl border border-[#E8E8E5] relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-[#171717]">Almost there!</h3>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Choose your username to complete your Google account registration for{' '}
              <span className="font-semibold text-[#171717]">{defaultEmail}</span>.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E5] bg-[#FAF9F6] focus:bg-white text-xs font-medium focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                Choose Username
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8E8E5] bg-[#FAF9F6] focus:bg-white text-xs font-medium focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Lowercase letters, numbers, and underscores only.</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Confirming Setup...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
