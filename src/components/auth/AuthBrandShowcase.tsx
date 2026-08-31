import React from 'react';
import { Sparkles, Bot, UserCheck, ShieldCheck, Star, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const AuthBrandShowcase: React.FC = () => {
  return (
    <div className="w-full lg:w-[50%] flex flex-col justify-center space-y-7 py-2 selection:bg-[#FFF0E5]">
      {/* 1. Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF0E5] border border-[#FF8A2A]/25 text-[#D96512] text-xs font-bold uppercase tracking-wider self-start shadow-2xs"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#FF8A2A]" />
        <span>Next-Gen Autonomous Support</span>
      </motion.div>

      {/* 2. Main Title */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-3.5 max-w-xl"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-[#171717] tracking-tight leading-[1.12]">
          Customer conversations, <br />
          <span className="bg-gradient-to-r from-[#FF8A2A] via-[#E8680C] to-[#D96512] bg-clip-text text-transparent">
            made smarter.
          </span>
        </h1>
        <p className="text-sm sm:text-base text-[#6B6B6B] leading-relaxed max-w-lg font-normal">
          Connect WhatsApp, Instagram, Live Webchat, and Email in one unified workspace with custom-trained AI agents and human takeover.
        </p>
      </motion.div>

      {/* 3. Interactive Floating Conversation UI Mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-3 max-w-md pt-1 relative"
      >
        {/* Customer Incoming Message */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/95 border border-[#E8E8E5] shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5">
          <div className="w-9 h-9 rounded-xl bg-[#171717] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
            DM
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-bold text-[#171717] truncate">
                David Miller <span className="text-[10px] text-gray-400 font-normal">· WhatsApp</span>
              </p>
              <span className="text-[10px] text-gray-400 font-medium">Just now</span>
            </div>
            <p className="text-xs text-[#6B6B6B] truncate font-medium mt-0.5">
              "Hi, where can I track my enterprise subscription invoice?"
            </p>
          </div>
        </div>

        {/* AI Instant Smart Reply */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF5ED] via-[#FFF0E5]/80 to-white border border-[#FF8A2A]/30 shadow-sm backdrop-blur-md ml-4 sm:ml-7 transition-all duration-200 hover:-translate-y-0.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Bot className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-extrabold text-[#171717]">Xia AI Agent</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF8A2A]/20 text-[#D96512]">
                  Instant · 0.98 Conf.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Auto-Replied
              </span>
            </div>
            <p className="text-xs text-[#4A4A4A] leading-snug font-medium">
              "Your invoice is ready! You can download it directly from your Billing Portal or account settings."
            </p>
          </div>
        </div>

        {/* Agent Takeover Status Badge */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/90 border border-[#E8E8E5] text-xs text-[#6B6B6B] max-w-sm shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-[#171717] text-xs">Human Agent Handoff</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Standby Ready
          </span>
        </div>
      </motion.div>

      {/* 4. Live Metric Chips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-2 gap-3 max-w-md pt-1"
      >
        <div className="p-3 rounded-2xl bg-white/80 border border-[#E8E8E5] shadow-2xs">
          <div className="flex items-center gap-1.5 text-[#FF8A2A] mb-0.5">
            <Zap className="w-3.5 h-3.5 fill-[#FF8A2A]" />
            <span className="text-xs font-extrabold text-[#171717]">89% Resolved</span>
          </div>
          <p className="text-[11px] text-[#6B6B6B]">Automated without human intervention</p>
        </div>

        <div className="p-3 rounded-2xl bg-white/80 border border-[#E8E8E5] shadow-2xs">
          <div className="flex items-center gap-1.5 text-amber-500 mb-0.5">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="text-xs font-extrabold text-[#171717]">4.9 / 5.0 CSAT</span>
          </div>
          <p className="text-[11px] text-[#6B6B6B]">Customer satisfaction rating</p>
        </div>
      </motion.div>

      {/* 5. Trust & Security Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-center gap-2 text-xs font-semibold text-[#6B6B6B] pt-1"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Enterprise SOC2 Type II Certified & End-to-End Encryption</span>
      </motion.div>
    </div>
  );
};
