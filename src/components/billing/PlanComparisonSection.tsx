import React, { useState } from 'react';
import type { BillingOverview, PlanDefinition, BillingInterval } from '../../types/billing';
import {
  Check,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface PlanComparisonSectionProps {
  overview: BillingOverview;
  onSelectPlan: (planId: string, interval: BillingInterval) => void;
  isLoadingPlanId: string | null;
  sectionRef?: React.RefObject<HTMLDivElement | null>;
}

export const PlanComparisonSection: React.FC<PlanComparisonSectionProps> = ({
  overview,
  onSelectPlan,
  isLoadingPlanId,
  sectionRef,
}) => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(
    overview.subscription.billingInterval || 'monthly'
  );

  const { subscription, plans, workspace } = overview;
  const currentPlanId = subscription.planId;

  return (
    <div ref={sectionRef} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-8">
      {/* Header & Interval Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[11px] font-extrabold text-[#FF8A2A] uppercase tracking-wider">
            Plans & Pricing
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight mt-1">
            Choose the Right Plan for Your Workspace
          </h3>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-1">
            Scale seamlessly as your AI conversation volume and team grow.
          </p>
        </div>

        {/* Billing Interval Toggle Pill */}
        <div className="bg-[#FAF9F6] border border-[#E8E8E5] p-1 rounded-2xl inline-flex items-center shrink-0 self-start md:self-auto">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingInterval === 'monthly'
                ? 'bg-[#171717] text-white shadow-2xs'
                : 'text-[#6B6B6B] hover:text-[#171717]'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              billingInterval === 'yearly'
                ? 'bg-[#FF8A2A] text-white shadow-2xs'
                : 'text-[#6B6B6B] hover:text-[#171717]'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan: PlanDefinition) => {
          const isCurrent = plan.id === currentPlanId;
          const isPro = plan.id === 'pro';
          const isEnterprise = plan.id === 'enterprise';
          const isFree = plan.id === 'free';

          const price = billingInterval === 'yearly' ? plan.priceAnnual : plan.priceMonthly;

          const isCurrentlyUpgrading = isLoadingPlanId === plan.id;

          // Determine button label & state
          let buttonLabel = 'Select Plan';
          let isDowngrade = false;

          if (isCurrent) {
            buttonLabel = 'Current Plan';
          } else if (isEnterprise) {
            buttonLabel = 'Contact Us';
          } else {
            const currentPlanIndex = plans.findIndex((p) => p.id === currentPlanId);
            const targetPlanIndex = plans.findIndex((p) => p.id === plan.id);
            if (targetPlanIndex < currentPlanIndex) {
              buttonLabel = 'Downgrade';
              isDowngrade = true;
            } else {
              buttonLabel = 'Upgrade';
            }
          }

          return (
            <div
              key={plan.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between transition-all relative ${
                isPro
                  ? 'border-[#FF8A2A] bg-white shadow-md ring-2 ring-[#FF8A2A]/20'
                  : isCurrent
                  ? 'border-[#171717] bg-white shadow-xs'
                  : 'border-[#E8E8E5] bg-white hover:border-gray-300 shadow-2xs'
              }`}
            >
              {/* Popular / Current Pill Badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FF8A2A] text-white text-[10px] font-extrabold tracking-wider uppercase shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{plan.badge || 'Most Popular'}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-xl font-extrabold text-[#171717]">{plan.name}</h4>
                  <p className="text-xs text-[#6B6B6B] mt-1 line-clamp-2 min-h-[32px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pt-2 pb-3 border-b border-[#E8E8E5]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#171717] tracking-tight">
                      ${price}
                    </span>
                    <span className="text-xs text-[#6B6B6B] font-bold">
                      {isFree ? '/ forever' : '/ month'}
                    </span>
                  </div>
                  {!isFree && billingInterval === 'yearly' && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                      Billed annually (${price * 12}/yr)
                    </p>
                  )}
                </div>

                {/* Included Features List */}
                <div className="space-y-2.5 pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Included Features
                  </p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[#171717]">
                        <Check className="w-4 h-4 text-[#FF8A2A] shrink-0 mt-0.5" />
                        <span className="font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Card Action Button */}
              <div className="pt-6 mt-6 border-t border-[#E8E8E5]">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-xs font-bold cursor-not-allowed text-center"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => onSelectPlan(plan.id, billingInterval)}
                    disabled={Boolean(isLoadingPlanId) || !workspace.canManageBilling}
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isPro
                        ? 'bg-[#FF8A2A] hover:bg-[#D96512] text-white shadow-xs'
                        : isDowngrade
                        ? 'bg-gray-100 hover:bg-gray-200 text-[#171717]'
                        : 'bg-[#171717] hover:bg-black text-white'
                    } ${!workspace.canManageBilling ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isCurrentlyUpgrading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{buttonLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Responsive Detailed Limits Comparison Table */}
      <div className="pt-6 border-t border-[#E8E8E5] space-y-4">
        <h4 className="text-lg font-extrabold text-[#171717]">Plan Capacity & Limits Comparison</h4>

        {/* Scrollable Container on Mobile */}
        <div className="overflow-x-auto rounded-2xl border border-[#E8E8E5] bg-[#FAF9F6]">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-[#E8E8E5] bg-white text-xs font-bold text-[#6B6B6B]">
                <th className="p-4">Capacity Feature</th>
                <th className="p-4 text-center">Free</th>
                <th className="p-4 text-center">Starter</th>
                <th className="p-4 text-center text-[#FF8A2A]">Pro</th>
                <th className="p-4 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E8E5] text-xs text-[#171717]">
              <tr>
                <td className="p-4 font-bold">AI Assistant Agents</td>
                <td className="p-4 text-center font-medium">1</td>
                <td className="p-4 text-center font-medium">3</td>
                <td className="p-4 text-center font-extrabold text-[#FF8A2A]">10</td>
                <td className="p-4 text-center font-extrabold">Unlimited</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">Team Members</td>
                <td className="p-4 text-center font-medium">2</td>
                <td className="p-4 text-center font-medium">5</td>
                <td className="p-4 text-center font-extrabold text-[#FF8A2A]">10</td>
                <td className="p-4 text-center font-extrabold">Unlimited</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">Monthly Conversations</td>
                <td className="p-4 text-center font-medium">100</td>
                <td className="p-4 text-center font-medium">1,500</td>
                <td className="p-4 text-center font-extrabold text-[#FF8A2A]">5,000</td>
                <td className="p-4 text-center font-extrabold">Unlimited</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">Knowledge Base Sources</td>
                <td className="p-4 text-center font-medium">2</td>
                <td className="p-4 text-center font-medium">10</td>
                <td className="p-4 text-center font-extrabold text-[#FF8A2A]">20</td>
                <td className="p-4 text-center font-extrabold">Unlimited</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">Integrations & Channels</td>
                <td className="p-4 text-center font-medium">1 (Website)</td>
                <td className="p-4 text-center font-medium">3 (Web + Email)</td>
                <td className="p-4 text-center font-extrabold text-[#FF8A2A]">5 (Meta, WhatsApp)</td>
                <td className="p-4 text-center font-extrabold">All Channels</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">AI Usage & Tokens</td>
                <td className="p-4 text-center font-medium">1,000</td>
                <td className="p-4 text-center font-medium">10,000</td>
                <td className="p-4 text-center font-extrabold text-[#FF8A2A]">50,000</td>
                <td className="p-4 text-center font-extrabold">Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
