import React from 'react';
import { RefreshCw, Clock, Inbox, MessageCircle, Mail, AlertTriangle } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  return (
    <section id="problem" className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5]">
      {/* Section Header */}
      <div className="text-center max-w-[840px] mx-auto mb-20">
        <span className="text-xs font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30">
          The Support Friction Gap
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          Your customers are everywhere. <br className="hidden sm:inline" />
          <span className="text-[#6B6B6B]">Your team shouldn't have to be.</span>
        </h2>
      </div>

      {/* Editorial Grid of 4 Distinct Problem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Too Many Inboxes */}
        <div className="bg-white border border-[#E8E8E5] rounded-[28px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Fragmented
              </span>
              <Mail className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-xl font-extrabold text-[#171717] mb-2">Too many inboxes</h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">Messages are scattered across different platforms.</p>
          </div>

          {/* Micro UI: Multiple Notification Badges */}
          <div className="bg-[#F7F7F5] p-3.5 rounded-2xl border border-[#E8E8E5] space-y-2 mt-6">
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-rose-200 text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <Mail className="w-3.5 h-3.5" />
                <span>Email: 14 unread</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200 text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp: 8 pending</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200 text-xs opacity-75">
              <div className="flex items-center gap-2 text-gray-600 font-medium">
                <Inbox className="w-3.5 h-3.5" />
                <span>Webchat: 5 open</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Repetitive Questions */}
        <div className="bg-white border border-[#E8E8E5] rounded-[28px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-2.5 py-1 rounded-full border border-[#FF8A2A]/30">
                Time Drain
              </span>
              <RefreshCw className="w-4 h-4 text-[#FF8A2A]" />
            </div>
            <h3 className="text-xl font-extrabold text-[#171717] mb-2">Repetitive questions</h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">Your team spends hours answering the same things.</p>
          </div>

          {/* Micro UI: Question Repeat Bubble */}
          <div className="bg-[#F7F7F5] p-3.5 rounded-2xl border border-[#E8E8E5] space-y-2 mt-6">
            <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs shadow-2xs">
              <div className="text-[10px] text-[#6B6B6B] font-bold uppercase tracking-wider">Customer Ask #104</div>
              <div className="font-extrabold text-[#171717] mt-0.5">"What is your return policy?"</div>
            </div>
            <div className="flex items-center justify-between px-1.5 text-[11px] text-[#D96512] font-black">
              <span>Repeated 42x this week</span>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
          </div>
        </div>

        {/* Card 3: Missed Conversations */}
        <div className="bg-white border border-[#E8E8E5] rounded-[28px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Lost Leads
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="text-xl font-extrabold text-[#171717] mb-2">Missed conversations</h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">Important customers can easily get lost in the noise.</p>
          </div>

          {/* Micro UI: Lost VIP Lead Alert */}
          <div className="bg-[#F7F7F5] p-3.5 rounded-2xl border border-[#E8E8E5] mt-6">
            <div className="bg-white p-3 rounded-xl border border-rose-200 text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#171717]">VIP Lead Lost</span>
                <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">Unanswered</span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-snug">"Ready to buy 50 units. Need quick confirmation."</p>
              <div className="text-[10px] text-rose-600 font-bold">Wait time: 4 hours 12 mins</div>
            </div>
          </div>
        </div>

        {/* Card 4: Slow Responses */}
        <div className="bg-white border border-[#E8E8E5] rounded-[28px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                Tool Switching
              </span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <h3 className="text-xl font-extrabold text-[#171717] mb-2">Slow responses</h3>
            <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">Switching between tools slows everyone down.</p>
          </div>

          {/* Micro UI: Context Delay Indicator */}
          <div className="bg-[#F7F7F5] p-3.5 rounded-2xl border border-[#E8E8E5] mt-6">
            <div className="bg-white p-3 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <div>
                  <div className="text-xs font-bold text-[#171717]">Context Switch Lag</div>
                  <div className="text-[10px] text-[#6B6B6B]">Avg delay: 18 mins/msg</div>
                </div>
              </div>
              <span className="text-xs font-black text-rose-600">-40%</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
