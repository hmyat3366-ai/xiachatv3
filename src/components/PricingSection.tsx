import React from 'react';
import {
  Check,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Mail,
  ShieldCheck,
  Zap,
  Building,
  Headphones,
  CheckCircle2,
} from 'lucide-react';

interface PricingSectionProps {
  onStartFree?: (planId?: string) => void;
  onContact?: (planId?: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onStartFree, onContact }) => {
  const handleInquire = (planId: string) => {
    if (onContact) {
      onContact(planId);
    } else if (onStartFree) {
      onStartFree(planId);
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter Plan',
      tagline: 'Ideal for small businesses and single stores',
      description: 'Essential AI customer concierge to handle frequent customer inquiries automatically 24/7.',
      capacityLabel: 'Starter Tier',
      popular: false,
      icon: Zap,
      features: [
        '1 Unified Inbox Dashboard',
        'Up to 1,000 AI Conversations / mo',
        '2 Human Agent Seats',
        'Website Live Chat Widget',
        'Knowledge Base RAG & FAQ Sync',
        'Order & Policy Q&A Automation',
        'Standard Email Support',
      ],
      ctaText: 'Inquire Starter',
    },
    {
      id: 'growth',
      name: 'Growth Plan',
      tagline: 'For growing retail stores and multi-channel brands',
      description: 'Comprehensive omni-channel customer suite with smart AI-to-human handoff triage and high volume.',
      capacityLabel: 'Best Value',
      popular: true,
      badge: 'Most Popular',
      icon: Sparkles,
      features: [
        'Multi-Channel Unified Inbox',
        'Up to 5,000 AI Conversations / mo',
        '5 Human Agent Seats',
        'WhatsApp + Facebook + Webchat Hub',
        'Smart AI to Human Handoff Triage',
        'Live Visitors Presence & CSAT Rating',
        'Unlimited Knowledge Base Documents',
        'Priority 24/7 Support Service',
      ],
      ctaText: 'Inquire Growth',
    },
    {
      id: 'enterprise',
      name: 'Custom Enterprise',
      tagline: 'For large enterprises, agencies, and high-volume brands',
      description: 'Bespoke AI configurations, custom volume limits, dedicated integrations, and personalized onboarding.',
      capacityLabel: 'Tailored Scope',
      popular: false,
      badge: 'Full Customization',
      icon: Building,
      features: [
        'Unlimited Channels & Inboxes',
        '25,000+ AI Conversations / mo',
        'Unlimited Human Agent Seats',
        'Custom Gemini AI Prompt Tuning',
        'Custom ERP, Shopify & CRM Webhooks',
        'Dedicated Account Manager',
        '99.9% Uptime Guarantee & SLA',
        'Custom Team Training & Setup',
      ],
      ctaText: 'Talk to Sales',
    },
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5] scroll-mt-24">
      {/* Section Header */}
      <div className="text-center max-w-[840px] mx-auto mb-16 sm:mb-20">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30 mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 fill-[#FF8A2A]" />
          <span>Flexible Plans & Inquiries</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight">
          Choose the Perfect Fit for Your Business
        </h2>

        <p className="text-base sm:text-lg text-[#6B6B6B] mt-5 font-normal max-w-[680px] mx-auto leading-relaxed">
          Choose a plan tailored to your team size and monthly conversation volume. Our sales specialists will help configure the ideal setup for your business.
        </p>

        {/* Highlight Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-8 text-xs font-bold text-[#171717]">
          <div className="flex items-center gap-2 bg-[#FAF9F6] px-3.5 py-1.5 rounded-full border border-[#E8E8E5]">
            <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
            <span>Instant Setup & Free Trial</span>
          </div>
          <div className="flex items-center gap-2 bg-[#FAF9F6] px-3.5 py-1.5 rounded-full border border-[#E8E8E5]">
            <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
            <span>No Credit Card Required</span>
          </div>
          <div className="flex items-center gap-2 bg-[#FAF9F6] px-3.5 py-1.5 rounded-full border border-[#E8E8E5]">
            <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
            <span>Response Within 15 Minutes</span>
          </div>
        </div>
      </div>

      {/* 3 Inquiry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const IconComponent = plan.icon;
          return (
            <div
              key={plan.id}
              className={`bg-white border rounded-[36px] p-8 sm:p-9 flex flex-col justify-between relative transition-all duration-300 hover:shadow-xl ${
                plan.popular
                  ? 'border-[#FF8A2A] ring-2 ring-[#FF8A2A]/25 shadow-[0_20px_50px_rgba(255,138,42,0.12)] md:-translate-y-2.5 bg-gradient-to-b from-[#FFFDFB] to-white'
                  : 'border-[#E8E8E5] subtle-card-shadow hover:border-gray-300'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF8A2A] text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>{plan.badge}</span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-2.5 py-0.5 rounded-md border border-[#FF8A2A]/20">
                    {plan.capacityLabel}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-center text-[#FF8A2A]">
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                <h3 className="text-2xl font-black text-[#171717] tracking-tight mb-1">{plan.name}</h3>
                <p className="text-[12px] font-bold text-[#FF8A2A] mb-2">{plan.tagline}</p>
                <p className="text-xs text-[#6B6B6B] mb-7 font-medium leading-relaxed">{plan.description}</p>

                {/* Inquire CTA Button */}
                <button
                  type="button"
                  onClick={() => handleInquire(plan.id)}
                  className={`w-full py-4 rounded-full font-black text-sm transition-all duration-200 flex items-center justify-center gap-2 mb-8 cursor-pointer shadow-sm ${
                    plan.popular
                      ? 'bg-[#FF8A2A] hover:bg-[#D96512] text-white shadow-[#FF8A2A]/25 hover:shadow-md'
                      : 'bg-[#171717] hover:bg-black text-white'
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Features List */}
                <div className="space-y-3 pt-6 border-t border-[#E8E8E5]">
                  <div className="text-[11px] font-black text-[#171717] uppercase tracking-wider mb-3">
                    Key Capabilities Included:
                  </div>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs text-[#171717] font-semibold leading-snug">
                      <Check className="w-4 h-4 text-[#FF8A2A] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 text-center text-[11px] text-[#6B6B6B] font-bold border-t border-[#E8E8E5]/50 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Custom Onboarding & Setup Support</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Consultation Bar below Cards */}
      <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#FAF9F6] via-white to-[#FAF9F6] border border-[#E8E8E5] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] border border-[#FF8A2A]/30 flex items-center justify-center shrink-0 text-[#FF8A2A] mx-auto sm:mx-0">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-[#171717]">
              Need a Custom Solution or High-Volume Enterprise Setup?
            </h4>
            <p className="text-xs text-[#6B6B6B] mt-1 font-medium">
              Chat directly with our enterprise team for bespoke custom prompts, integrations, and tailored SLA agreements.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleInquire('enterprise')}
            className="px-6 py-3 rounded-full bg-[#171717] hover:bg-black text-white font-black text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Mail className="w-4 h-4 text-[#FF8A2A]" />
            <span>Contact Sales Team</span>
          </button>

          <a
            href="https://t.me/xiachat_support"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 rounded-full bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Telegram Direct</span>
          </a>
        </div>
      </div>
    </section>
  );
};
