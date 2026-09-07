import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Send,
  MessageSquare,
  Mail,
  Building2,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface PlanInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlanId?: string;
  workspaceName?: string;
  workspaceId?: string;
  userEmail?: string;
  userName?: string;
}

const AVAILABLE_PLANS = [
  {
    id: 'starter',
    name: 'Starter Plan',
    highlight: '1,000 AI Chats • 2 Seats',
    color: 'border-blue-200 bg-blue-50/50 text-blue-700',
  },
  {
    id: 'growth',
    name: 'Growth Plan',
    highlight: '5,000 AI Chats • 5 Seats • Multi-Channel',
    badge: 'Popular',
    color: 'border-[#FF8A2A] bg-[#FFF0E5]/50 text-[#D96512]',
  },
  {
    id: 'enterprise',
    name: 'Custom Enterprise',
    highlight: '25,000+ AI Chats • Custom SLAs',
    color: 'border-purple-200 bg-purple-50/50 text-purple-700',
  },
];

export const PlanInquiryModal: React.FC<PlanInquiryModalProps> = ({
  isOpen,
  onClose,
  defaultPlanId = 'growth',
  workspaceName = '',
  workspaceId = '',
  userEmail = '',
  userName = '',
}) => {
  const [selectedPlan, setSelectedPlan] = useState(defaultPlanId);
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(workspaceName);
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (defaultPlanId) setSelectedPlan(defaultPlanId);
      if (userName && !name) setName(userName);
      if (userEmail && !email) setEmail(userEmail);
      if (workspaceName && !company) setCompany(workspaceName);
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen, defaultPlanId, userName, userEmail, workspaceName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/api/billing/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
          planId: selectedPlan,
          message: message.trim(),
          workspaceId: workspaceId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit inquiry.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Could not send inquiry. Please reach us directly via Telegram or email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#171717]/65 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-white border border-[#E8E8E5] rounded-[32px] max-w-[560px] w-full p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.18)] relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#6B6B6B] hover:text-[#171717] hover:bg-[#F7F7F5] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black mb-3 border border-[#FF8A2A]/30">
                <Sparkles className="w-3.5 h-3.5 fill-[#FF8A2A]" />
                <span>Direct Sales & Plan Inquiry • စုံစမ်းရန်</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                Get a Custom Plan Quote
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] mt-2 leading-relaxed font-medium">
                အစီအစဉ်အသစ်ပြောင်းလဲလိုပါက (သို့မဟုတ်) အသေးစိတ်စုံစမ်းလိုပါက အချက်အလက်များ ဖြည့်စွက်ပေးပါ။ ကျွန်ုပ်တို့ Sales Team မှ ၁၅ မိနစ်အတွင်း အမြန်ဆုံး ဆက်သွယ်ပေးပါမည်။
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Plan Selector */}
            <div className="mb-5">
              <label className="block text-xs font-black text-[#171717] uppercase tracking-wider mb-2">
                Interested Plan / စိတ်ဝင်စားသော အစီအစဉ်
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {AVAILABLE_PLANS.map((p) => {
                  const isSelected = selectedPlan === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-3 rounded-2xl text-left border transition-all duration-200 cursor-pointer relative ${
                        isSelected
                          ? 'border-[#FF8A2A] ring-2 ring-[#FF8A2A]/20 bg-[#FFFBF7] shadow-xs'
                          : 'border-[#E8E8E5] hover:border-gray-300 bg-[#FAF9F6]'
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute -top-2 right-2 bg-[#FF8A2A] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                          {p.badge}
                        </span>
                      )}
                      <div className="text-xs font-black text-[#171717]">{p.name}</div>
                      <div className="text-[10px] text-[#6B6B6B] mt-1 font-semibold leading-snug">
                        {p.highlight}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inquiry Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Your Name / အမည် <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ko Min"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A] transition-colors"
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
                      placeholder="e.g. Velvet Roast Cafe"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A] transition-colors"
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
                      placeholder="e.g. 09xxxxxxxxx or @telegram"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Requirements / မေးမြန်းလိုသောအချက်အလက် (Optional)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your team size, monthly chat volume, or special integration needs..."
                  className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#FF8A2A] transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Inquiry • စုံစမ်းရန် ပို့မည်</span>
                  </>
                )}
              </button>
            </form>

            {/* Direct Contact Bar */}
            <div className="mt-5 pt-4 border-t border-[#E8E8E5] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#6B6B6B] font-medium">
                <Headphones className="w-4 h-4 text-[#FF8A2A]" />
                <span>Direct Support:</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="mailto:sales@xiachat.ai"
                  className="px-3 py-1 rounded-lg bg-[#FAF9F6] border border-[#E8E8E5] hover:border-gray-300 text-[#171717] font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3 h-3 text-[#FF8A2A]" />
                  <span>sales@xiachat.ai</span>
                </a>
                <a
                  href="https://t.me/xiachat_support"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Telegram</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="py-8 text-center space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#171717]">
                Inquiry Received Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] max-w-[400px] mx-auto font-medium leading-relaxed">
                စုံစမ်းမေးမြန်းမှုအား လက်ခံရရှိပြီးဖြစ်ပါသည်။ ကျွန်ုပ်တို့၏ Support Team မှ <span className="font-bold text-[#171717]">{email}</span> (သို့မဟုတ်) ဖုန်းနံပါတ်သို့ အမြန်ဆုံး အကြောင်းပြန်ပေးပါမည်။
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-left max-w-sm mx-auto space-y-2 text-xs">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Selected Plan:</span>
                <span className="font-bold text-[#171717] capitalize">{selectedPlan} Plan</span>
              </div>
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Expected Response:</span>
                <span className="font-bold text-emerald-600">Within 15 - 30 minutes</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-3 rounded-full bg-[#171717] hover:bg-black text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
