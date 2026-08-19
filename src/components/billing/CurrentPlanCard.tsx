import React from 'react';
import type { BillingOverview, SubscriptionStatus } from '../../types/billing';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface CurrentPlanCardProps {
  overview: BillingOverview;
  onOpenPortal: () => void;
  onScrollToPlans: () => void;
  onResumeSubscription: () => void;
  isActionLoading: boolean;
}

export const CurrentPlanCard: React.FC<CurrentPlanCardProps> = ({
  overview,
  onOpenPortal,
  onScrollToPlans,
  onResumeSubscription,
  isActionLoading,
}) => {
  const { subscription, workspace } = overview;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: SubscriptionStatus, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return {
        label: 'Canceling',
        style: 'bg-amber-50 text-amber-800 border-amber-200/60',
        icon: Clock,
      };
    }

    switch (status) {
      case 'active':
        return {
          label: 'Active',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
          icon: CheckCircle2,
        };
      case 'trialing':
        return {
          label: 'Trialing',
          style: 'bg-indigo-50 text-indigo-800 border-indigo-200/60',
          icon: Sparkles,
        };
      case 'past_due':
      case 'payment_failed':
        return {
          label: status === 'payment_failed' ? 'Payment Failed' : 'Past Due',
          style: 'bg-rose-50 text-rose-800 border-rose-200/60 animate-pulse',
          icon: XCircle,
        };
      case 'canceled':
        return {
          label: 'Canceled',
          style: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: XCircle,
        };
      case 'incomplete':
        return {
          label: 'Incomplete',
          style: 'bg-amber-50 text-amber-800 border-amber-200/60',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'Active',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
          icon: CheckCircle2,
        };
    }
  };

  const statusInfo = getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd);
  const StatusIcon = statusInfo.icon;

  const isFree = subscription.planId === 'free';
  const displayPrice = isFree
    ? '$0'
    : subscription.billingInterval === 'yearly'
    ? `$${subscription.priceAnnual}`
    : `$${subscription.priceMonthly}`;

  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-6">
      {/* Header section with Plan title and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8E8E5]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-[#FF8A2A] uppercase tracking-wider">
              Current Plan
            </span>
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.style}`}
            >
              <StatusIcon className="w-3 h-3" />
              <span>{statusInfo.label}</span>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
            {subscription.planName} Plan
          </h2>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-2xl sm:text-3xl font-black text-[#171717]">
            {displayPrice}
            <span className="text-xs font-semibold text-[#6B6B6B]"> / month</span>
          </div>
          {!isFree && (
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Billed {subscription.billingInterval === 'yearly' ? 'annually' : 'monthly'}
            </p>
          )}
        </div>
      </div>

      {/* Subscription Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FAF9F6] p-4 rounded-2xl border border-[#E8E8E5]/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center shrink-0 text-[#FF8A2A]">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
              Billing Cycle
            </p>
            <p className="text-xs font-extrabold text-[#171717] capitalize">
              {isFree ? 'N/A (Free Tier)' : subscription.billingInterval}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center shrink-0 text-[#FF8A2A]">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
              {subscription.cancelAtPeriodEnd ? 'Expires On' : 'Next Billing Date'}
            </p>
            <p className="text-xs font-extrabold text-[#171717]">
              {isFree ? 'Never' : formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center shrink-0 text-[#FF8A2A]">
            <CreditCard className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
              Payment Method
            </p>
            <p className="text-xs font-extrabold text-[#171717]">
              {subscription.paymentMethod
                ? `${subscription.paymentMethod.brand} •••• ${subscription.paymentMethod.last4}`
                : 'No card saved'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Failure Warning Alert */}
      {(subscription.status === 'payment_failed' || subscription.status === 'past_due') && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold">Payment Processing Failed</p>
              <p className="text-xs text-rose-700 mt-0.5">
                We couldn't process your latest subscription payment. Please update your payment method to avoid service interruption.
              </p>
            </div>
          </div>
          {workspace.canManageBilling && (
            <button
              onClick={onOpenPortal}
              disabled={isActionLoading}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              Update Payment Method
            </button>
          )}
        </div>
      )}

      {/* Cancel At Period End Resumption Alert */}
      {subscription.cancelAtPeriodEnd && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold">Subscription Scheduled for Cancellation</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your subscription remains fully active until <span className="font-bold">{formatDate(subscription.currentPeriodEnd)}</span>. After this date, your workspace will revert to the Free tier.
              </p>
            </div>
          </div>
          {workspace.canManageBilling && (
            <button
              onClick={onResumeSubscription}
              disabled={isActionLoading}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Subscription</span>
            </button>
          )}
        </div>
      )}

      {/* Free Trial Banner */}
      {subscription.status === 'trialing' && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold">Free Trial Period Active</p>
              <p className="text-xs text-indigo-800 mt-0.5">
                You have <span className="font-bold">{subscription.trialDaysRemaining} days remaining</span> in your free trial (ends {formatDate(subscription.trialEndsAt || subscription.currentPeriodEnd)}).
              </p>
            </div>
          </div>
          {workspace.canManageBilling && (
            <button
              onClick={onScrollToPlans}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs"
            >
              Choose a Plan
            </button>
          )}
        </div>
      )}

      {/* Actions Toolbar */}
      {workspace.canManageBilling ? (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={onScrollToPlans}
            className="px-4 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>Change Plan / Upgrade</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {!isFree && (
            <button
              onClick={onOpenPortal}
              disabled={isActionLoading}
              className="px-4 py-2.5 rounded-xl bg-white border border-[#E8E8E5] hover:bg-[#FAF9F6] text-[#171717] text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4 text-[#6B6B6B]" />
              <span>Manage Billing & Invoices</span>
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#6B6B6B] italic">
          Note: Only workspace Owners and Admins have permission to modify subscriptions or billing payment methods.
        </p>
      )}
    </div>
  );
};
