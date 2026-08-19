import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface FinalCTASectionProps {
  onStartFree?: () => void;
}

export const FinalCTASection: React.FC<FinalCTASectionProps> = ({ onStartFree }) => {
  return (
    <section id="cta" className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto scroll-mt-24">
      <div className="bg-[#171717] rounded-[40px] sm:rounded-[48px] p-9 sm:p-20 text-center text-white relative overflow-hidden subtle-card-shadow">
        
        {/* Decorative Atmosphere Glow */}
        <div className="absolute -top-32 -right-32 w-[450px] h-[450px] bg-[#FF8A2A] rounded-full blur-[140px] opacity-20 pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[450px] h-[450px] bg-[#D96512] rounded-full blur-[140px] opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-[880px] mx-auto flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs sm:text-sm font-bold text-[#FF8A2A] mb-8 backdrop-blur-md">
            <Sparkles className="w-4 h-4 fill-current text-[#FF8A2A]" />
            <span>Ready for effortless support?</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-8">
            Stop switching between inboxes. <br />
            <span className="text-[#FF8A2A]">Start managing customer conversations smarter.</span>
          </h2>

          {/* Supporting Paragraph */}
          <p className="text-lg sm:text-2xl text-gray-300 font-normal leading-relaxed max-w-[700px] mb-12">
            Bring your team, your customers and your AI assistant together in one place.
          </p>

          {/* Primary CTA */}
          <div className="flex items-center justify-center w-full sm:w-auto mb-12">
            <button
              onClick={onStartFree}
              className="w-full sm:w-auto px-10 py-5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-base sm:text-lg font-black shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2.5 group active:scale-95 cursor-pointer"
            >
              <span>Start Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Trust points */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs sm:text-sm text-gray-400 font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
              <span>14-Day Free Trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
              <span>No Credit Card Required</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#FF8A2A]" />
              <span>GDPR & SOC2 Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
