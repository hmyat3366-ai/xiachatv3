import React, { useState } from 'react';
import { X, ArrowRight, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'start_free' | 'book_demo';
}

export const LeadModal: React.FC<LeadModalProps> = ({ isOpen, onClose, initialMode = 'start_free' }) => {
  const [email, setEmail] = useState('');
  const [teamSize, setTeamSize] = useState('1-5');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-[#E8E8E5] rounded-[32px] max-w-[500px] w-full p-6 sm:p-8 subtle-card-shadow relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-[#171717] hover:bg-[#F7F7F5] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black mb-3 border border-[#FF8A2A]/30">
                <Sparkles className="w-3.5 h-3.5 fill-[#FF8A2A]" />
                <span>{initialMode === 'book_demo' ? '1-on-1 Product Demo' : '14-Day Free Access'}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                {initialMode === 'book_demo' ? 'Book a Xia Chat Demo' : 'Start your free trial'}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-2 leading-relaxed">
                {initialMode === 'book_demo'
                  ? 'See how Xia Chat unifies your channels and AI support. We will prepare a customized walkthrough.'
                  : 'Get instant access to your multi-channel inbox and AI support assistant. No credit card required.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#171717] uppercase tracking-wider mb-1.5">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-3 bg-[#F7F7F5] border border-[#E8E8E5] rounded-xl text-sm focus:outline-none focus:border-[#FF8A2A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#171717] uppercase tracking-wider mb-1.5">
                  Team Size
                </label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full px-4 py-3 bg-[#F7F7F5] border border-[#E8E8E5] rounded-xl text-sm focus:outline-none focus:border-[#FF8A2A] font-medium text-[#171717]"
                >
                  <option value="1-5">1 - 5 team members</option>
                  <option value="6-20">6 - 20 team members</option>
                  <option value="21-50">21 - 50 team members</option>
                  <option value="50+">50+ team members</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-base font-black shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2"
              >
                <span>{initialMode === 'book_demo' ? 'Schedule Demo Call' : 'Get Instant Access'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-[#6B6B6B] font-semibold pt-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF8A2A]" /> No credit card
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF8A2A]" /> Cancel anytime
                </span>
              </div>
            </form>
          </div>
        ) : (
          /* Confirmation State */
          <div className="py-6 text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-[#FFF0E5] text-[#FF8A2A] mx-auto flex items-center justify-center border border-[#FF8A2A]/40 shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-[#FF8A2A]" />
            </div>

            <h3 className="text-2xl font-black text-[#171717]">You're on the list!</h3>
            <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-[380px] mx-auto font-medium">
              We've reserved your access spot for <span className="font-extrabold text-[#171717]">{email}</span>. Our team will reach out shortly with your workspace credentials.
            </p>

            <button
              onClick={handleResetAndClose}
              className="px-8 py-3 rounded-full bg-[#171717] text-white text-xs font-bold shadow-xs hover:bg-gray-800 transition-colors"
            >
              Back to Landing Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
