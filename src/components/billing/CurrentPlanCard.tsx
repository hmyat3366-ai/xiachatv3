import React from 'react';
import type { BillingOverview, SubscriptionStatus } from '../../types/billing';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Headphones,
  Mail,
  MessageSquare,
  Zap,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface CurrentPlanCardProps {
  overview: BillingOverview;
  onOpenInquiry: (planId?: string) => void;
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  overview,
  onOpenInquiry,
}) => {
  const { subscription, workspace, limits } = overview;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active Plan',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
      case 'trialing':
        return {
          label: 'Trial Period Active',
          style: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
          dot: 'bg-indigo-500',
        };
      default:
        return {
          label: 'Active Tier',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
    }
  };

  const statusInfo = getStatusBadge(subscription.status);
  const isFree = subscription.planId === 'free';

  return (
    <div className="bg-white rounded-[32px] border border-[#E8E8E5] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-6 relative overflow-hidden">
      {/* Decorative gradient blur in top-right */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#FFF0E5] via-transparent to-transparent rounded-bl-full pointer-events-none opacity-60" />

      {/* Header section with Current Plan and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8E8E5] relative z-10">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black text-[#FF8A2A] uppercase tracking-wider bg-[#FFF0E5] px-2.5 py-0.5 rounded-full border border-[#FF8A2A]/20">
              Current Active Plan
            </span>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold border ${statusInfo.style}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
              <span>{statusInfo.label}</span>
            </div>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#171717] tracking-tight flex items-center gap-2.5">
            <span>{subscription.planName} Tier</span>
            <span className="text-xs sm:text-sm font-semibold text-[#6B6B6B] bg-[#FAF9F6] px-3 py-1 rounded-xl border border-[#E8E8E5]">
              {workspace.name}
            </span>
          </h2>
        </div>

        {/* Right Action: Contact / Inquire Upgrade */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenInquiry('growth')}
            className="px-5 py-3 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-black shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-white" />
            <span>Inquire Plan Upgrade</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Plan Included Entitlements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5]">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center shrink-0 text-[#FF8A2A] shadow-2xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
              AI Conversations Included
            </p>
            <p className="text-sm font-black text-[#171717]">
              {limits.max_conversations >= 999999 ? 'Unlimited' : `${limits.max_conversations.toLocaleString()} / month`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5]">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center shrink-0 text-[#FF8A2A] shadow-2xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
              Human Agent Seats
            </p>
            <p className="text-sm font-black text-[#171717]">
              {limits.max_members >= 999999 ? 'Unlimited' : `${limits.max_members} Team Members`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5]">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center shrink-0 text-[#FF8A2A] shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
              Plan Activation
            </p>
            <p className="text-sm font-black text-[#171717]">
              {isFree ? 'Free Lifetime' : `Active (Renews ${formatDate(subscription.currentPeriodEnd)})`}
            </p>
          </div>
        </div>
      </div>

      {/* Direct Sales Support Assistance Strip */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#FFFBF7] to-[#FAF9F6] border border-[#FF8A2A]/20 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-[#171717]">
              Need more monthly chat capacity or custom agent seats?
            </span>
            <p className="text-[#6B6B6B] mt-0.5">
              Contact our sales & support team for immediate limit expansion or custom enterprise invoicing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="mailto:sales@xiachat.ai"
            className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E8E8E5] text-[#171717] font-bold hover:border-gray-300 transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-[#FF8A2A]" />
            <span>sales@xiachat.ai</span>
          </a>
          <a
            href="https://t.me/xiachat_support"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 font-bold transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </a>
        </div>
      </div>
    </div>
  );
};
