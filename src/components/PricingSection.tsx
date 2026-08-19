import React, { useState } from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

interface PricingSectionProps {
  onStartFree?: () => void;
  onContact?: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onStartFree, onContact }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'For small teams getting started.',
      priceMonthly: '$29',
      priceAnnual: '$19',
      cta: 'Start Free',
      popular: false,
      features: [
        '1 Unified Inbox',
        'Up to 1,000 AI Conversations/mo',
        '2 Human Agent Seats',
        'Basic Knowledge Base Sync',
        'Email & Webchat Channels',
        'Standard Support'
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      description: 'For growing businesses and agencies.',
      priceMonthly: '$79',
      priceAnnual: '$59',
      cta: 'Start Free',
      popular: true,
      badge: 'Recommended',
      features: [
        'Multi-Channel Unified Inbox',
        'Up to 5,000 AI Conversations/mo',
        '5 Human Agent Seats',
        'Unlimited Knowledge Base Sync',
        'WhatsApp + Shopify + Webchat + Email',
        'Smart Human Handoff Triage',
        'Priority 24/7 Support'
      ]
    },
    {
      id: 'scale',
      name: 'Scale',
      description: 'For teams managing larger customer volumes.',
      priceMonthly: '$199',
      priceAnnual: '$149',
      cta: 'Contact us',
      popular: false,
      features: [
        'Unlimited Channels & Inboxes',
        '25,000+ AI Conversations/mo',
        '15+ Human Agent Seats',
        'Custom Knowledge Embeddings',
        'Custom CRM & API Integrations',
        'Dedicated Success Manager',
        '99.9% Uptime SLA'
      ]
    }
  ];

  return (
    <section id="pricing" className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5] scroll-mt-24">
      {/* Section Header */}
      <div className="text-center max-w-[840px] mx-auto mb-16">
        <span className="text-xs font-black uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30">
          Transparent Pricing
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          Simple plans for growing teams.
        </h2>
        <p className="text-lg sm:text-xl text-[#6B6B6B] mt-5 font-normal">
          Start with a 14-day free trial. No credit card required.
        </p>

        {/* Monthly / Annual Toggle */}
        <div className="mt-10 inline-flex items-center gap-3 bg-white border border-[#E8E8E5] p-2 rounded-full shadow-2xs">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-colors ${
              billingCycle === 'monthly' ? 'bg-[#171717] text-white shadow-xs' : 'text-[#6B6B6B] hover:text-[#171717]'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-colors flex items-center gap-2 ${
              billingCycle === 'annual' ? 'bg-[#FF8A2A] text-white shadow-xs' : 'text-[#6B6B6B] hover:text-[#171717]'
            }`}
          >
            <span>Annual Billing</span>
            <span className="bg-white text-[#D96512] text-[10px] font-black px-2 py-0.5 rounded-full">
              Save 25%
            </span>
          </button>
        </div>
      </div>

      {/* 3 Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white border rounded-[36px] p-8 sm:p-9 flex flex-col justify-between relative transition-all duration-300 ${
              plan.popular
                ? 'border-[#FF8A2A] ring-2 ring-[#FF8A2A]/20 shadow-[0_16px_50px_rgba(255,138,42,0.1)] md:-translate-y-2'
                : 'border-[#E8E8E5] subtle-card-shadow hover-card-shadow'
            }`}
          >
            {/* Recommended Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF8A2A] text-white text-xs font-black px-4 py-1.5 rounded-full shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>{plan.badge}</span>
              </div>
            )}

            <div>
              <h3 className="text-2xl font-black text-[#171717] mb-1">{plan.name}</h3>
              <p className="text-xs text-[#6B6B6B] mb-6 font-medium">{plan.description}</p>

              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-4xl sm:text-5xl font-black text-[#171717]">
                  {billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly}
                </span>
                <span className="text-xs font-bold text-[#6B6B6B]">/ month</span>
              </div>

              {/* CTA Button */}
              <button
                onClick={plan.cta === 'Contact us' ? onContact : onStartFree}
                className={`w-full py-4 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 mb-8 cursor-pointer ${
                  plan.popular
                    ? 'bg-[#FF8A2A] hover:bg-[#D96512] text-white shadow-md'
                    : 'bg-[#F7F7F5] hover:bg-[#171717] hover:text-white border border-[#E8E8E5] text-[#171717]'
                }`}
              >
                <span>{plan.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Feature List */}
              <div className="space-y-3 pt-6 border-t border-[#E8E8E5]">
                <div className="text-xs font-black text-[#171717] uppercase tracking-wider mb-3">Included Features:</div>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs text-[#171717] font-semibold">
                    <Check className="w-4 h-4 text-[#FF8A2A] flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 text-center text-[11px] text-[#6B6B6B] font-bold">
              14-day free trial • Cancel anytime
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
