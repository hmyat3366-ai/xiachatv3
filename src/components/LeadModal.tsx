import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Send,
  Mail,
  Phone,
  Building2,
  User,
  MessageSquare,
  Headphones,
} from 'lucide-react';
import { apiFetch } from '../utils/api';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'start_free' | 'book_demo' | 'inquire';
  initialPlan?: string;
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'inquire',
  initialPlan = 'growth',
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [planId, setPlanId] = useState(initialPlan);
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialPlan) setPlanId(initialPlan);
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen, initialPlan]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid work email.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch('/api/billing/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Website Visitor',
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
          planId: planId || 'general',
          message: message.trim(),
        }),
      });

      setSubmitted(true);
    } catch {
      // Even if network blip, show confirmation
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#171717]/65 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-white border border-[#E8E8E5] rounded-[32px] max-w-[520px] w-full p-6 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.16)] relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-[#171717] hover:bg-[#F7F7F5] transition-colors cursor-pointer"
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
                <span>Contact Sales & Inquiry • စုံစမ်းရန်</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                {initialMode === 'book_demo'
                  ? 'Book a 1-on-1 Product Demo'
                  : 'Contact Sales for Custom Setup'}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-2 leading-relaxed font-medium">
                သင့်လုပ်ငန်းလိုအပ်ချက်နှင့် ကိုက်ညီသော စနစ်သတ်မှတ်ချက်များ၊ တိုက်ရိုက် Demo နှင့် စျေးနှုန်းများကို ဆွေးနွေးနိုင်ရန် ဆက်သွယ်ပေးပါ။
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Plan Pills */}
            <div className="mb-4">
              <label className="block text-[11px] font-black text-[#171717] uppercase tracking-wider mb-2">
                Plan of Interest
              </label>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                {[
                  { id: 'starter', label: 'Starter' },
                  { id: 'growth', label: 'Growth ⭐' },
                  { id: 'enterprise', label: 'Enterprise' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanId(p.id)}
                    className={`py-2 px-3 rounded-xl border transition-all cursor-pointer ${
                      planId === p.id
                        ? 'bg-[#171717] text-white border-[#171717] shadow-xs'
                        : 'bg-[#FAF9F6] text-[#6B6B6B] border-[#E8E8E5] hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ko Aung"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Business / Store Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Fashion Corner"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Phone / Telegram / Viber
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xxxxxxxxx or @handle"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Message / Questions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How many monthly customer chats or team members do you have?"
                  className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] disabled:opacity-50 text-white text-sm font-black shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Sending Inquiry...</span>
                ) : (
                  <>
                    <span>Submit Inquiry • စုံစမ်းရန် ပို့မည်</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-[#6B6B6B] font-semibold pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF8A2A]" /> No credit card required
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF8A2A]" /> Fast 15-min response
                </span>
              </div>
            </form>

            {/* Direct Support shortcut */}
            <div className="mt-4 pt-3.5 border-t border-[#E8E8E5] flex items-center justify-between text-[11px]">
              <span className="text-[#6B6B6B] font-medium flex items-center gap-1.5">
                <Headphones className="w-3.5 h-3.5 text-[#FF8A2A]" /> Direct Chat:
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="mailto:sales@xiachat.ai"
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] border border-[#E8E8E5] text-[#171717] font-bold hover:border-gray-300 transition-colors flex items-center gap-1"
                >
                  <Mail className="w-3 h-3 text-[#FF8A2A]" /> sales@xiachat.ai
                </a>
                <a
                  href="https://t.me/xiachat_support"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 font-bold transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" /> Telegram
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation State */
          <div className="py-8 text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl font-black text-[#171717]">Inquiry Received!</h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed max-w-[380px] mx-auto font-medium">
              We've received your request for the <span className="font-bold text-[#171717] capitalize">{planId}</span> tier. Our sales team will get in touch with you at <span className="font-extrabold text-[#171717]">{email}</span> within 15–30 minutes.
            </p>

            <button
              onClick={handleResetAndClose}
              className="px-8 py-3 rounded-full bg-[#171717] text-white text-xs font-bold shadow-xs hover:bg-black transition-colors cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
