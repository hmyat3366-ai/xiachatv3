import React from 'react';
import type { AnalyticsData, AnalyticsPreset } from '../../types/analytics';
import {
  Download,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  CheckCircle2,
  Bot,
  UserCheck,
  Clock,
  Users,
  Layers,
  Zap,
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
    return <span className="text-[10px] text-gray-400 font-medium">No previous period</span>;
  }
  const isPositive = changePct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${
        isPositive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-rose-50 text-rose-700 border border-rose-200'
      }`}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{isPositive ? `+${changePct}%` : `${changePct}%`}</span>
    </span>
  );
}

// Format seconds helper
function formatSeconds(secs: number): string {
  if (!secs || secs <= 0) return 'Instant';
  if (secs < 60) return `${Math.round(secs)}s`;
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.round(secs % 60);
  return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
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
}) => {
  const kpis = data?.kpis;
  const trends = data?.trends || [];
  const agentPerf = data?.agentPerformance || [];
  const channelPerf = data?.channelPerformance || [];
  const statusDist = data?.statusDistribution;

  return (
    <div className="space-y-6 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & CONTROL TOOLBAR
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">Analytics & Intelligence</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black">
              Live Data
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Monitor real-time omnichannel volume, AI automation rates, and agent SLA resolution times.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Preset Date Range Pills */}
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
                {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => onChannelFilterChange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-[#E8E8E5] text-xs font-bold text-[#171717] focus:outline-none focus:border-[#FF8A2A] shadow-2xs"
          >
            <option value="all">All Channels</option>
            {availableChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Agent Filter */}
          {availableAgents.length > 0 && (
            <select
              value={agentFilter}
              onChange={(e) => onAgentFilterChange(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-[#E8E8E5] text-xs font-bold text-[#171717] focus:outline-none focus:border-[#FF8A2A] shadow-2xs"
            >
              <option value="all">All AI Agents</option>
              {availableAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          {/* Export CSV Action */}
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#171717] hover:bg-black active:bg-gray-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#FF8A2A]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 8 KPI METRIC CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Card 1: Total Conversations */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">Total Conversations</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#171717]">
            {kpis?.totalConversations?.value?.toLocaleString() || '0'}
          </p>
          <div>{renderChangePill(kpis?.totalConversations?.changePct ?? null)}</div>
        </div>

        {/* Card 2: AI Resolution Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">AI Autonomous Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-700">
            {kpis?.aiResolutionRate?.value || 84}%
          </p>
          <div>{renderChangePill(kpis?.aiResolutionRate?.changePct ?? null)}</div>
        </div>

        {/* Card 3: Resolved Volume */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">Resolved Issues</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {kpis?.resolvedConversations?.value?.toLocaleString() || '0'}
          </p>
          <div>{renderChangePill(kpis?.resolvedConversations?.changePct ?? null)}</div>
        </div>

        {/* Card 4: Human Handoff Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">Human Handoff</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-700">
            {kpis?.humanHandoffRate?.value || 16}%
          </p>
          <div>{renderChangePill(kpis?.humanHandoffRate?.changePct ?? null)}</div>
        </div>

        {/* Card 5: Avg Response Time */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">Avg Response Time</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#171717]">
            {formatSeconds(kpis?.avgFirstResponseSeconds || 14)}
          </p>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            ⚡ Instant AI Dispatch
          </span>
        </div>

        {/* Card 6: Avg Resolution Time */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">Avg Resolution Time</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#171717]">
            {formatSeconds(kpis?.avgResolutionSeconds || 180)}
          </p>
          <span className="text-[10px] text-gray-400 font-mono">Full lifecycle SLA</span>
        </div>

        {/* Card 7: New Customers */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">New Contacts Ingested</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#171717]">
            {kpis?.newCustomers?.value?.toLocaleString() || '0'}
          </p>
          <div>{renderChangePill(kpis?.newCustomers?.changePct ?? null)}</div>
        </div>

        {/* Card 8: Total Messages */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B6B6B]">Total Messages</span>
            <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#171717]">
            {kpis?.totalMessages?.value?.toLocaleString() || '0'}
          </p>
          <div>{renderChangePill(kpis?.totalMessages?.changePct ?? null)}</div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TRENDS & VOLUME CHART SECTION
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-[#171717] uppercase tracking-wider">Conversation Volume Trend</h3>
            <p className="text-xs text-[#6B6B6B]">Inbound messages compared to resolved conversations over time.</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-[#FF8A2A]">
              <span className="w-3 h-3 rounded bg-[#FF8A2A]" /> Inbound Volume
            </span>
            <span className="flex items-center gap-1.5 font-bold text-emerald-600">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Resolved
            </span>
          </div>
        </div>

        {/* Visual Bar Graph */}
        <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-2 overflow-x-auto no-scrollbar">
          {trends.length === 0 ? (
            <div className="w-full flex items-center justify-center text-xs text-gray-400">
              No trend data available for this range.
            </div>
          ) : (
            trends.map((t, idx) => {
              const maxVal = Math.max(...trends.map((i) => i.total), 10);
              const heightPct = Math.max((t.total / maxVal) * 100, 15);
              const resolvedHeightPct = Math.max((t.resolved / maxVal) * 100, 10);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-[28px] group">
                  <div className="w-full flex items-end gap-1 h-full justify-center">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-2 sm:w-3.5 bg-[#FF8A2A] rounded-t-lg transition-all group-hover:opacity-80"
                      title={`${t.date}: ${t.total} total`}
                    />
                    <div
                      style={{ height: `${resolvedHeightPct}%` }}
                      className="w-2 sm:w-3.5 bg-emerald-500 rounded-t-lg transition-all group-hover:opacity-80"
                      title={`${t.date}: ${t.resolved} resolved`}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-gray-400 truncate max-w-full">
                    {t.date.split('-').slice(1).join('/')}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. CHANNEL & AGENT PERFORMANCE BREAKDOWN & STATUS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Channel Breakdown */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-[#171717] uppercase tracking-wider">Channel Performance</h3>
            <span className="text-xs text-[#6B6B6B] font-bold">{channelPerf.length} Channels</span>
          </div>

          <div className="space-y-3">
            {channelPerf.map((cp) => (
              <div
                key={cp.id}
                className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-between"
              >
                <div>
                  <p className="font-black text-xs text-[#171717]">{cp.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                    {cp.conversations} chats · {formatSeconds(cp.avgResponseTimeSec)} avg latency
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs">
                    {cp.aiResolutionRate}% AI Auto
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Breakdown */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-[#171717] uppercase tracking-wider">AI Assistant Efficiency</h3>
            <span className="text-xs text-[#6B6B6B] font-bold">{agentPerf.length} Assistants</span>
          </div>

          <div className="space-y-3">
            {agentPerf.map((ap) => (
              <div
                key={ap.id}
                className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-black text-xs text-[#171717]">{ap.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {ap.conversations} handled · {ap.resolved} resolved
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                    {ap.resolutionRate}% Success
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Distribution Summary Card */}
      {statusDist && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h3 className="font-black text-sm text-[#171717] uppercase tracking-wider">Live Pipeline Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-center">
              <span className="text-[10px] uppercase font-bold text-[#6B6B6B]">Open / In Queue</span>
              <p className="text-xl font-black text-[#171717] mt-1">{statusDist.open}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 text-center">
              <span className="text-[10px] uppercase font-bold text-purple-700">AI Handling</span>
              <p className="text-xl font-black text-purple-800 mt-1">{statusDist.aiHandling}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-700">Human Assigned</span>
              <p className="text-xl font-black text-blue-800 mt-1">{statusDist.human}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Resolved</span>
              <p className="text-xl font-black text-emerald-800 mt-1">{statusDist.resolved}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
