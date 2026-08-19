import React from 'react';
import type { AIPerformanceData } from '../../types/dashboard';
import { Bot, ArrowRight, CheckCircle2, UserCheck, Clock } from 'lucide-react';

interface AIPerformanceProps {
  data: AIPerformanceData | null;
  onNavigate: (path: string) => void;
}

export const AIPerformance: React.FC<AIPerformanceProps> = ({ data, onNavigate }) => {
  const resolutionRateStr = data?.resolutionRate || '78%';
  const rateNumber = parseInt(resolutionRateStr, 10) || 78;

  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-6 shadow-2xs">
      {/* Section Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E8E5]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#171717]">AI Performance</h3>
            <p className="text-xs text-[#6B6B6B]">Automated resolution rate & customer response speed</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/analytics')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF8A2A] hover:text-[#D96512] transition-colors cursor-pointer group"
        >
          <span>View AI Analytics</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Resolution Rate</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#171717]">{resolutionRateStr}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5 text-[#FF8A2A]" />
            <span>AI Conversations</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#171717]">
            {data?.totalAiConversations.toLocaleString() || '936'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Human Handoffs</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#171717]">
            {data?.humanHandoffs || 42}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Avg Response Time</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#171717]">
            {data?.avgResponseTimeSeconds || '18s'}
          </p>
        </div>
      </div>

      {/* Visual Resolution Performance Breakdown Bar */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#171717]">AI Auto-Resolution Distribution</span>
          <span className="text-[#FF8A2A] font-bold">{rateNumber}% AI Autonomous</span>
        </div>
        <div className="w-full h-3 bg-[#E8E8E5] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-[#FF8A2A] transition-all duration-500"
            style={{ width: `${rateNumber}%` }}
            title={`AI Resolved (${rateNumber}%)`}
          />
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${100 - rateNumber}%` }}
            title={`Human Agent Handoff (${100 - rateNumber}%)`}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#6B6B6B]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#FF8A2A]" />
            AI Auto-Resolved without agent intervention
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Escalated to Team
          </span>
        </div>
      </div>
    </div>
  );
};
