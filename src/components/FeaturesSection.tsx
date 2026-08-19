import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  UserCheck, 
  Users, 
  BarChart2,
  ArrowUpRight,
  Inbox
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-28 px-4 sm:px-8 max-w-[1280px] mx-auto border-t border-[#E8E8E5] scroll-mt-24">
      {/* Section Header */}
      <div className="text-center max-w-[860px] mx-auto mb-20">
        <span className="text-xs font-black uppercase tracking-wider text-[#FF8A2A] bg-[#FFF0E5] px-4 py-1.5 rounded-full border border-[#FF8A2A]/30">
          Complete Platform Capabilities
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#171717] tracking-tight leading-tight mt-5">
          Everything you need to deliver <br className="hidden sm:inline" />
          <span className="text-[#FF8A2A]">exceptional customer care.</span>
        </h2>
      </div>

      {/* Asymmetric Grid */}
      <div className="space-y-6">
        
        {/* ROW 1: Large Unified Inbox (2 cols) + Small AI Support (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feature 1: Unified Inbox (Large - 2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E8E8E5] rounded-[32px] p-8 sm:p-10 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-3 py-1 rounded-full border border-[#FF8A2A]/20">
                  FLAGSHIP FEATURE
                </span>
                <ArrowUpRight className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mb-2">Unified Inbox</h3>
              <p className="text-sm sm:text-base text-[#6B6B6B] leading-relaxed max-w-[620px]">
                Manage customer conversations from WhatsApp, Webchat, Email, and Instagram in one organized workspace with zero tool switching.
              </p>
            </div>

            {/* UI Preview Box */}
            <div className="bg-[#F7F7F5] rounded-2xl p-4 border border-[#E8E8E5] mt-8">
              <div className="bg-white p-3.5 rounded-xl border border-[#E8E8E5] flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FF8A2A] text-white flex items-center justify-center font-bold text-xs">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#171717]">Central Stream Active</div>
                    <div className="text-[11px] text-[#6B6B6B]">4 Channels Connected • Real-time Triage</div>
                  </div>
                </div>
                <span className="text-xs bg-[#FFF0E5] text-[#D96512] font-black px-3 py-1 rounded-full border border-[#FF8A2A]/30">
                  Live Stream
                </span>
              </div>
            </div>
          </div>

          {/* Feature 2: AI Customer Support (Small - 1 Col) */}
          <div className="bg-white border border-[#E8E8E5] rounded-[32px] p-8 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#D96512] bg-[#FFF0E5] px-3 py-1 rounded-full border border-[#FF8A2A]/20">
                  AUTOMATION
                </span>
                <ArrowUpRight className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#171717] mb-2">AI Customer Support</h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                Let AI answer common repetitive questions instantly 24/7.
              </p>
            </div>

            <div className="bg-[#F7F7F5] rounded-2xl p-3.5 border border-[#E8E8E5] mt-6">
              <div className="bg-[#FFF0E5] p-3 rounded-xl border border-[#FF8A2A]/30 text-xs flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 text-[#D96512] font-black">
                  <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
                  <span>Instant Reply Speed: 1.2s</span>
                </div>
                <span className="text-[10px] font-black bg-white text-[#171717] px-2 py-0.5 rounded">99.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: 3 Columns (Knowledge Base, Human Handoff, Team Collaboration) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 3: Knowledge Base */}
          <div className="bg-white border border-[#E8E8E5] rounded-[32px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  LEARNING
                </span>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
              <h3 className="text-lg font-extrabold text-[#171717] mb-2">Knowledge Base</h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                Give AI the information it needs to answer accurately from your docs.
              </p>
            </div>

            <div className="bg-[#F7F7F5] rounded-2xl p-3 border border-[#E8E8E5] mt-6">
              <div className="bg-white p-2.5 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 text-[#171717] font-bold">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>32 Docs Synced</span>
                </div>
                <span className="text-[9px] text-purple-700 font-extrabold bg-purple-50 px-2 py-0.5 rounded">Auto-Sync</span>
              </div>
            </div>
          </div>

          {/* Feature 4: Human Handoff */}
          <div className="bg-white border border-[#E8E8E5] rounded-[32px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  CONTROL
                </span>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
              <h3 className="text-lg font-extrabold text-[#171717] mb-2">Human Handoff</h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                Move conversations to a real agent whenever needed with one click.
              </p>
            </div>

            <div className="bg-[#F7F7F5] rounded-2xl p-3 border border-[#E8E8E5] mt-6">
              <div className="bg-white p-2.5 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 text-[#171717] font-bold">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Agent Takeover</span>
                </div>
                <span className="text-[9px] text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded">Full Context</span>
              </div>
            </div>
          </div>

          {/* Feature 5: Team Collaboration */}
          <div className="bg-white border border-[#E8E8E5] rounded-[32px] p-7 subtle-card-shadow hover-card-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  TEAMWORK
                </span>
                <ArrowUpRight className="w-4 h-4 text-gray-400" />
              </div>
              <h3 className="text-lg font-extrabold text-[#171717] mb-2">Team Collaboration</h3>
              <p className="text-xs sm:text-sm text-[#6B6B6B] leading-relaxed">
                Assign conversations and work together without losing context.
              </p>
            </div>

            <div className="bg-[#F7F7F5] rounded-2xl p-3 border border-[#E8E8E5] mt-6">
              <div className="bg-white p-2.5 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 text-[#171717] font-bold">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Internal Notes</span>
                </div>
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full bg-[#171717] text-[9px] text-white flex items-center justify-center font-bold">A</div>
                  <div className="w-5 h-5 rounded-full bg-[#FF8A2A] text-[9px] text-white flex items-center justify-center font-bold">B</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Large Conversation Analytics (Full Width) */}
        <div className="bg-white border border-[#E8E8E5] rounded-[32px] p-8 sm:p-10 subtle-card-shadow hover-card-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-[620px]">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-3">
              REAL-TIME INSIGHTS
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#171717] mb-2">Conversation Analytics</h3>
            <p className="text-sm sm:text-base text-[#6B6B6B] leading-relaxed">
              Understand response times, workload distribution, and customer satisfaction activity at a single glance.
            </p>
          </div>

          <div className="bg-[#F7F7F5] p-4 sm:p-5 rounded-2xl border border-[#E8E8E5] w-full md:w-80 flex-shrink-0">
            <div className="bg-white p-3.5 rounded-xl border border-[#E8E8E5] text-xs flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-[#171717]">Resolution Rate</span>
              </div>
              <span className="text-sm font-black text-emerald-600">94.8%</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
