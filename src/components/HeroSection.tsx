import React from 'react';
import { ArrowRight, Sparkles, CheckCircle2, Globe, Camera, Share2 } from 'lucide-react';

interface HeroSectionProps {
  onStartFree?: () => void;
  onBookDemo?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartFree, onBookDemo }) => {
  return (
    <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-32 px-4 sm:px-8 max-w-[1280px] mx-auto overflow-hidden">
      {/* Background Subtle Editorial Grid */}
      <div className="absolute inset-0 bg-editorial-grid opacity-35 pointer-events-none -z-10 rounded-[40px]" />

      <div className="text-center max-w-[960px] mx-auto flex flex-col items-center">
        {/* Announcement Pill */}
        <a 
          href="#features" 
          className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-white border border-[#E8E8E5] text-xs sm:text-sm font-semibold text-[#6B6B6B] hover:border-[#FF8A2A] hover:text-[#171717] transition-all shadow-xs mb-8 group cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A2A] animate-pulse" />
          <span>AI-powered customer support</span>
          <span className="text-[#FF8A2A] font-bold group-hover:translate-x-1 transition-transform">→</span>
        </a>

        {/* Hero Headline (72px - 88px Desktop Scale) */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[84px] font-black text-[#171717] tracking-tight leading-[0.98] mb-8">
          Customer support that <br className="hidden sm:inline" />
          works like an{' '}
          <span className="relative inline-block px-4 py-1.5 rounded-2xl sm:rounded-3xl bg-[#FFF0E5] text-[#D96512] border border-[#FF8A2A]/30 font-black my-1 sm:my-0 shadow-xs">
            extra teammate.
          </span>
        </h1>

        {/* Supporting Paragraph */}
        <p className="text-lg sm:text-2xl text-[#6B6B6B] font-normal leading-relaxed max-w-[780px] mb-10">
          Bring your customer conversations into one place. Xia Chat combines AI-powered support with your team so you can respond faster, stay organized, and never miss a conversation.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-14">
          <button
            onClick={onStartFree}
            className="w-full sm:w-auto px-9 py-4.5 rounded-full bg-[#FF8A2A] hover:bg-[#D96512] text-white text-base font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group active:scale-95 cursor-pointer"
          >
            <span>Start Free</span>
            <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onBookDemo}
            className="w-full sm:w-auto px-9 py-4.5 rounded-full bg-white border border-[#E8E8E5] hover:bg-[#F7F7F5] hover:border-[#171717]/20 text-[#171717] text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>See How It Works</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-semibold text-[#6B6B6B] mb-14">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
            <span>5-minute setup</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF8A2A]" />
            <span>Multi-channel ready</span>
          </div>
        </div>
      </div>

      {/* Hero Visual Composition (3 Floating Cards) */}
      <div className="mt-2 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch max-w-[1240px] mx-auto">
          
          {/* CARD 1 — UNIFIED INBOX */}
          <div className="bg-white border border-[#E8E8E5] rounded-[32px] p-6 sm:p-7 subtle-card-shadow hover-card-shadow md:-rotate-1 animate-float-slow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-3 py-1 rounded-full border border-[#FF8A2A]/20">
                  UNIFIED INBOX
                </span>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                  ● Live Sync
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-[#171717] mb-1">Every conversation, together.</h3>
              <p className="text-xs text-[#6B6B6B] mb-5">Website, Instagram & Facebook in one place</p>
            </div>

            <div className="bg-[#F7F7F5] rounded-2xl p-3.5 border border-[#E8E8E5] space-y-3">
              <div className="bg-white rounded-xl p-3 border border-[#E8E8E5] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#171717] text-white font-bold text-xs flex items-center justify-center">
                    ES
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#171717]">Emma Stone</div>
                    <div className="text-[11px] text-[#6B6B6B]">When will order #8492 ship?</div>
                  </div>
                </div>
                <span className="text-[10px] bg-[#FFF0E5] text-[#D96512] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Web
                </span>
              </div>

              <div className="bg-white rounded-xl p-3 border border-[#E8E8E5] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center">
                    MR
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#171717]">Maya Rodriguez</div>
                    <div className="text-[11px] text-[#6B6B6B]">Is the linen dress in stock?</div>
                  </div>
                </div>
                <span className="text-[10px] bg-pink-50 text-pink-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Insta
                </span>
              </div>

              <div className="bg-white rounded-xl p-3 border border-[#E8E8E5] flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    KL
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-[#171717]">Kevin Lee</div>
                    <div className="text-[11px] text-[#6B6B6B]">Do you offer agency pricing?</div>
                  </div>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Share2 className="w-3 h-3" /> FB
                </span>
              </div>
            </div>
          </div>

          {/* CARD 2 — AI SUPPORT */}
          <div className="bg-white border border-[#FF8A2A]/40 rounded-[32px] p-6 sm:p-7 subtle-card-shadow hover-card-shadow md:-translate-y-3 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#FFF0E5] rounded-bl-full pointer-events-none opacity-60" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-3 py-1 rounded-full border border-[#FF8A2A]/30 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF8A2A]" />
                  AI SUPPORT
                </span>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Instant Reply
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-[#171717] mb-1">Answers repetitive questions.</h3>
              <p className="text-xs text-[#6B6B6B] mb-5">Trained on your knowledge base in seconds</p>
            </div>

            <div className="bg-[#F7F7F5] rounded-2xl p-4 border border-[#E8E8E5] space-y-3">
              <div className="flex items-start gap-2.5 max-w-[90%]">
                <div className="w-7 h-7 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                  C
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-xs border border-[#E8E8E5] text-xs font-medium text-[#171717] shadow-xs">
                  "Do you deliver on weekends?"
                </div>
              </div>

              <div className="flex items-start gap-2.5 max-w-[94%] ml-auto justify-end">
                <div className="bg-[#FFF0E5] p-3 rounded-2xl rounded-tr-xs border border-[#FF8A2A]/40 text-xs text-[#171717] shadow-xs">
                  <div className="flex items-center gap-1 mb-1 text-[10px] font-black text-[#D96512]">
                    <Sparkles className="w-3 h-3 fill-[#FF8A2A] text-[#FF8A2A]" />
                    Xia AI Indicator
                  </div>
                  "Yes. Weekend delivery is available for selected locations."
                </div>
                <div className="w-7 h-7 rounded-full bg-[#FF8A2A] flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                  Xia
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3 — SMART INSIGHTS */}
          <div className="bg-white border border-[#E8E8E5] rounded-[32px] p-6 sm:p-7 subtle-card-shadow hover-card-shadow md:rotate-1 animate-float-reverse flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-3 py-1 rounded-full border border-[#FF8A2A]/20">
                  SMART INSIGHTS
                </span>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  +24% CSAT
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-[#171717] mb-1">See how your team performs.</h3>
              <p className="text-xs text-[#6B6B6B] mb-5">Real-time metrics & response analytics</p>
            </div>

            <div className="bg-[#F7F7F5] rounded-2xl p-4 sm:p-5 border border-[#E8E8E5]">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-xs text-[#6B6B6B] font-semibold">Average Response Time</div>
                  <div className="text-3xl font-black text-[#171717]">32% faster</div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-md">
                  1.4 min avg
                </span>
              </div>

              <div className="h-20 flex items-end justify-between gap-2.5 pt-3 border-t border-[#E8E8E5]">
                <div className="flex-1 bg-[#E8E8E5] rounded-t-md h-[40%]" />
                <div className="flex-1 bg-[#E8E8E5] rounded-t-md h-[60%]" />
                <div className="flex-1 bg-[#E8E8E5] rounded-t-md h-[50%]" />
                <div className="flex-1 bg-[#FF8A2A]/40 rounded-t-md h-[78%]" />
                <div className="flex-1 bg-[#FF8A2A] rounded-t-md h-[100%]" />
              </div>
              <div className="flex justify-between text-[10px] text-[#6B6B6B] mt-2 font-bold">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Today</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
