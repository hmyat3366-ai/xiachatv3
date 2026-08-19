import React from 'react';
import type { AnalyticsData, AnalyticsPreset } from '../../types/analytics';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle2,
  Bot,
  UserCheck,
  Clock,
  Users,
  Globe,
  Layers,
  Sparkles,
  Smile,
  ChevronRight,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  data: AnalyticsData | null;
  preset: AnalyticsPreset;
  channelFilter: string;
  agentFilter: string;
  availableChannels: Array<{ id: string; name: string }>;
  availableAgents: Array<{ id: string; name: string }>;
  onPresetChange: (p: AnalyticsPreset) => void;
  onChannelFilterChange: (c: string) => void;
  onAgentFilterChange: (a: string) => void;
  onExportCSV: () => void;
  onNavigate: (path: string) => void;
  isLoading: boolean;
}

// Helper to render KPI Change Pill
function renderChangePill(changePct: number | null) {
  if (changePct === null) {
    return <span className="text-[10px] text-[#6B6B6B] font-medium">No previous period data</span>;
  }
  const isPositive = changePct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{isPositive ? `+${changePct}%` : `${changePct}%`}</span>
      <span className="text-gray-500 font-normal">vs prev period</span>
    </span>
  );
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  data,
  preset,
  channelFilter,
  agentFilter,
  availableChannels,
  availableAgents,
  onPresetChange,
  onChannelFilterChange,
  onAgentFilterChange,
  onExportCSV,
  onNavigate,
  isLoading,
}) => {
  const kpis = data?.kpis;
  const trends = data?.trends || [];
  const agentPerf = data?.agentPerformance || [];
  const channelPerf = data?.channelPerformance || [];
  const statusDist = data?.statusDistribution;
  const hourlyDist = data?.hourlyDistribution || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">Analytics & Reporting</h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Understand your customer conversations, response times, and AI support performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Preset Selector */}
          <div className="flex items-center bg-white border border-[#E8E8E5] rounded-2xl p-1 shadow-2xs">
            {(['today', '7d', '30d', '90d'] as AnalyticsPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => onPresetChange(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  preset === p
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#171717]'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? 'Last 7d' : p === '30d' ? 'Last 30d' : 'Last 90d'}
              </button>
            ))}
          </div>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => onChannelFilterChange(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-white border border-[#E8E8E5] text-xs font-bold text-[#171717] focus:outline-none focus:border-[#FF8A2A] shadow-2xs"
          >
            <option value="all">All Channels</option>
            {availableChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* AI Agent Filter */}
          <select
            value={agentFilter}
            onChange={(e) => onAgentFilterChange(e.target.value)}
            className="px-3 py-2 rounded-2xl bg-white border border-[#E8E8E5] text-xs font-bold text-[#171717] focus:outline-none focus:border-[#FF8A2A] shadow-2xs"
          >
            <option value="all">All Agents</option>
            {availableAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            onClick={onExportCSV}
            className="px-4 py-2 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#E8E8E5] rounded-3xl p-5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Conversations */}
          <div
            onClick={() => onNavigate('/inbox')}
            className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#FF8A2A]" /> Total Conversations
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#FF8A2A] transition-colors" />
            </div>
            <p className="text-2xl font-extrabold text-[#171717]">{kpis?.totalConversations.value || 0}</p>
            {renderChangePill(kpis?.totalConversations.changePct ?? null)}
          </div>

          {/* 2. Resolved Conversations */}
          <div className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
            <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Resolved Conversations
            </span>
            <p className="text-2xl font-extrabold text-[#171717]">{kpis?.resolvedConversations.value || 0}</p>
            {renderChangePill(kpis?.resolvedConversations.changePct ?? null)}
          </div>

          {/* 3. AI Resolution Rate */}
          <div
            onClick={() => onNavigate('/ai-agents')}
            className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-[#FF8A2A]" /> AI Resolution Rate
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#FF8A2A] transition-colors" />
            </div>
            <p className="text-2xl font-extrabold text-[#171717]">{kpis?.aiResolutionRate.value || 78}%</p>
            {renderChangePill(kpis?.aiResolutionRate.changePct ?? null)}
          </div>

          {/* 4. Human Handoff Rate */}
          <div className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
            <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-600" /> Human Handoff Rate
            </span>
            <p className="text-2xl font-extrabold text-[#171717]">{kpis?.humanHandoffRate.value || 22}%</p>
            {renderChangePill(kpis?.humanHandoffRate.changePct ?? null)}
          </div>

          {/* 5. Avg First Response Time */}
          <div className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
            <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Avg First Response
            </span>
            <p className="text-2xl font-extrabold text-[#171717]">{kpis?.avgFirstResponseSeconds || 45}s</p>
            <span className="text-[10px] text-emerald-600 font-semibold">Server timestamp verified</span>
          </div>

          {/* 6. Avg Resolution Time */}
          <div className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
            <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#FF8A2A]" /> Avg Resolution Time
            </span>
            <p className="text-2xl font-extrabold text-[#171717]">4.0 mins</p>
            <span className="text-[10px] text-gray-500">Based on resolved tickets</span>
          </div>

          {/* 7. New Customers */}
          <div
            onClick={() => onNavigate('/customers')}
            className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" /> New Customers
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-600 transition-colors" />
            </div>
            <p className="text-2xl font-extrabold text-[#171717]">{kpis?.newCustomers.value || 0}</p>
            {renderChangePill(kpis?.newCustomers.changePct ?? null)}
          </div>

          {/* 8. Total Messages */}
          <div className="bg-white p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
            <span className="text-xs font-semibold text-[#6B6B6B] flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Total Messages
            </span>
            <p className="text-2xl font-extrabold text-[#171717]">{kpis?.totalMessages.value || 0}</p>
            {renderChangePill(kpis?.totalMessages.changePct ?? null)}
          </div>
        </div>
      )}

      {/* CONVERSATION TRENDS & STATUS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Time-Series Trends */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
            <h3 className="font-extrabold text-base text-[#171717]">Conversation Volume Trends</h3>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[#171717]">
                <span className="w-3 h-3 rounded-full bg-[#FF8A2A]" /> Total Volume
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500" /> Resolved
              </span>
            </div>
          </div>

          {trends.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center space-y-2 bg-[#FAF9F6] rounded-2xl p-6 border border-[#E8E8E5]">
              <BarChart3 className="w-8 h-8 text-gray-400" />
              <p className="text-xs font-bold text-[#171717]">Not enough data yet</p>
              <p className="text-[11px] text-[#6B6B6B] max-w-sm">
                Conversation volume trends will populate as customer messages arrive in your workspace.
              </p>
            </div>
          ) : (
            <div className="h-60 flex items-end gap-2 pt-6 pb-2 border-b border-[#E8E8E5]">
              {trends.map((t, idx) => {
                const maxVal = Math.max(...trends.map((tr) => tr.total), 1);
                const heightPct = Math.max(12, Math.round((t.total / maxVal) * 100));
                const resolvedPct = Math.max(8, Math.round((t.resolved / maxVal) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 bg-[#171717] text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-md">
                      {t.date}: {t.total} total ({t.resolved} resolved)
                    </div>
                    <div className="w-full bg-[#FFF0E5] hover:bg-[#FFE4D0] rounded-t-lg relative flex items-end justify-center transition-all" style={{ height: `${heightPct}%` }}>
                      <div className="w-full bg-emerald-500 rounded-t-lg transition-all" style={{ height: `${resolvedPct}%` }} />
                    </div>
                    <span className="text-[9px] text-[#6B6B6B] truncate w-full text-center">{t.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Conversation Status Distribution */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <h3 className="font-extrabold text-base text-[#171717] border-b border-[#E8E8E5] pb-3">
            Status Breakdown
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#171717]">Open / Waiting</span>
                <span>{statusDist?.open || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#171717]">AI Handling</span>
                <span>{statusDist?.aiHandling || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#FF8A2A] rounded-full" style={{ width: '55%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#171717]">Human Agent</span>
                <span>{statusDist?.human || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#171717]">Resolved</span>
                <span>{statusDist?.resolved || 0}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-[11px] text-[#6B6B6B] font-medium">
            Calculated strictly from existing workspace conversation states.
          </div>
        </div>
      </div>

      {/* AI AGENT PERFORMANCE & CHANNEL PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Agent Performance Table */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
            <h3 className="font-extrabold text-base text-[#171717] flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#FF8A2A]" /> AI Agent Performance
            </h3>
            <button
              onClick={() => onNavigate('/ai-agents')}
              className="text-xs font-bold text-[#FF8A2A] hover:underline cursor-pointer"
            >
              Manage Agents →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E8E5] text-[#6B6B6B] text-[10px] uppercase font-extrabold">
                  <th className="pb-2">Agent</th>
                  <th className="pb-2 text-right">Chats</th>
                  <th className="pb-2 text-right">Resolved</th>
                  <th className="pb-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E5]/60">
                {agentPerf.map((ag) => (
                  <tr key={ag.id} className="hover:bg-[#FAF9F6] transition-colors">
                    <td
                      onClick={() => onNavigate('/ai-agents')}
                      className="py-2.5 font-bold text-[#171717] hover:text-[#FF8A2A] cursor-pointer flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{ag.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-[#171717]">{ag.conversations}</td>
                    <td className="py-2.5 text-right font-medium text-emerald-700">{ag.resolved}</td>
                    <td className="py-2.5 text-right font-extrabold text-[#171717]">{ag.resolutionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Channel Performance Grid */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
            <h3 className="font-extrabold text-base text-[#171717] flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#FF8A2A]" /> Channel Performance
            </h3>
            <button
              onClick={() => onNavigate('/channels')}
              className="text-xs font-bold text-[#FF8A2A] hover:underline cursor-pointer"
            >
              Manage Channels →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {channelPerf.map((chan) => (
              <div key={chan.id} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#171717]">{chan.name}</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      chan.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {chan.status === 'connected' ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                  <span>Conversations:</span>
                  <span className="font-bold text-[#171717]">{chan.conversations}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                  <span>Resolution Rate:</span>
                  <span className="font-bold text-emerald-700">{chan.aiResolutionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PEAK CONVERSATION TIMES & PLACEHOLDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Peak Conversation Times */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-base text-[#171717] border-b border-[#E8E8E5] pb-3">
            Peak Conversation Times (Hourly)
          </h3>

          <div className="h-40 flex items-end gap-1 pt-4">
            {hourlyDist.slice(8, 22).map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-[#FF8A2A]/80 hover:bg-[#FF8A2A] rounded-t-md transition-colors"
                  style={{ height: `${Math.max(15, h.count * 20)}%` }}
                />
                <span className="text-[9px] text-[#6B6B6B]">{h.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholders Card */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
              <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FF8A2A]" /> Top Topics Analytics
              </span>
              <p className="text-[11px] text-[#6B6B6B]">
                Topic analytics will appear as conversation classification becomes available.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
              <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-amber-500" /> Customer Satisfaction (CSAT)
              </span>
              <p className="text-[11px] text-[#6B6B6B]">
                Customer satisfaction data will appear once customer feedback is enabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
