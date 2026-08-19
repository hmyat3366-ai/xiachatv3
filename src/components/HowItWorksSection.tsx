import React from 'react';
import { Network, GraduationCap, Cpu, TrendingUp, CheckCircle2 } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Connect',
      subtitle: 'Connect your channels.',
      description: 'Integrate WhatsApp, Shopify, Email, and Webchat in under 5 minutes with zero coding.',
      icon: <Network className="w-5 h-5 text-[#FF8A2A]" />,
      uiDetail: '4 Channels Synced'
    },
    {
      step: '02',
      title: 'Teach',
      subtitle: 'Give Xia your knowledge.',
      description: 'Upload FAQs, product catalogs, shipping rules, or website URLs so AI knows your business.',
      icon: <GraduationCap className="w-5 h-5 text-[#FF8A2A]" />,
      uiDetail: 'Auto-Indexed Docs'
    },
    {
      step: '03',
      title: 'Automate',
      subtitle: 'Let AI answer FAQs.',
      description: 'Xia AI replies to routine customer questions 24/7 with accurate, friendly facts.',
      icon: <Cpu className="w-5 h-5 text-[#FF8A2A]" />,
      uiDetail: '24/7 AI Coverage'
    },
    {
      step: '04',
      title: 'Grow',
      subtitle: 'Focus team on high-value.',
      description: 'Human agents step in only when complex or high-value sales opportunities arise.',
      icon: <TrendingUp className="w-5 h-5 text-[#FF8A2A]" />,
      uiDetail: '32% Faster Resolution'
    }
  ];

  return (
    <section id="how-it-works" className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5] scroll-mt-24">
      {/* Section Header */}
      <div className="text-center max-w-[840px] mx-auto mb-20">
        <span className="text-xs font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30">
          Four-Step Setup
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          Connect. Teach. Automate. Grow.
        </h2>
        <p className="text-lg sm:text-xl text-[#6B6B6B] mt-5 max-w-[660px] mx-auto font-normal">
          Transform your customer communication workflow in minutes without technical overhead.
        </p>
      </div>

      {/* Horizontal Desktop Grid with Subtle Connecting Lines */}
      <div className="relative">
        {/* Subtle Horizontal Desktop Line */}
        <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-[2px] bg-[#E8E8E5] -z-10" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="bg-white border border-[#E8E8E5] rounded-[32px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xl font-black text-[#FF8A2A] bg-[#FFF0E5] px-3.5 py-1 rounded-2xl border border-[#FF8A2A]/30">
                    {s.step}
                  </span>
                  <div className="w-11 h-11 rounded-2xl bg-[#F7F7F5] border border-[#E8E8E5] flex items-center justify-center shadow-2xs">
                    {s.icon}
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold text-[#171717] mb-1">{s.title}</h3>
                <div className="text-xs font-black text-[#D96512] mb-3">{s.subtitle}</div>
                <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed font-medium">{s.description}</p>
              </div>

              {/* Tiny Product UI Detail */}
              <div className="mt-8 pt-4 border-t border-[#E8E8E5] flex items-center justify-between text-[11px] font-bold text-emerald-800 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{s.uiDetail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
