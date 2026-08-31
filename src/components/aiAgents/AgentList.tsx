import React, { useState } from 'react';
import type { AIAgent } from '../../types/aiAgent';
import {
  Bot,
  Plus,
  Search,
  MoreVertical,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Play,
  Pause,
  Copy,
  Trash2,
  ExternalLink,
  Sparkles,
  Zap,
  Radio,
  Sliders,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentListProps {
  agents: AIAgent[];
  onSelectAgent: (agentId: string) => void;
  onCreateAgentClick: () => void;
  onToggleStatus: (agentId: string, currentStatus: string) => void;
  onDuplicateAgent: (agent: AIAgent) => void;
  onDeleteAgentClick: (agent: AIAgent) => void;
  isLoading: boolean;
}

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  onSelectAgent,
  onCreateAgentClick,
  onToggleStatus,
  onDuplicateAgent,
  onDeleteAgentClick,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalHandled = agents.reduce((acc, a) => acc + (a.conversationsHandled || 0), 0);
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const avgResolution =
    agents.length > 0
      ? Math.round(agents.reduce((acc, a) => acc + (a.resolutionRate || 85), 0) / agents.length)
      : 85;

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & PRIMARY CTA
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">AI Assistant Agents</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black">
              {agents.length} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Configure autonomous AI assistants, custom system prompts, and knowledge base routing models.
          </p>
        </div>

        <button
          onClick={onCreateAgentClick}
          className="px-4 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] active:bg-[#C2550A] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create AI Agent</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRIC STAT CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold shadow-2xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Active Autonomous Agents</p>
            <p className="text-xl font-black text-[#171717]">
              {activeCount} <span className="text-xs text-gray-400 font-normal">/ {agents.length} configured</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Conversations Handled</p>
            <p className="text-xl font-black text-[#171717]">{totalHandled.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Avg Resolution Rate</p>
            <p className="text-xl font-black text-emerald-600">{avgResolution}%</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH & STATUS FILTER BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-[#E8E8E5] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search AI agents by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] focus:bg-white border border-[#E8E8E5] rounded-xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15 transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 self-stretch sm:self-auto overflow-x-auto no-scrollbar">
          {(['all', 'active', 'paused', 'draft'] as const).map((st) => {
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6]'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. AGENT CARDS GRID
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-[#E8E8E5]">
          <div className="w-7 h-7 border-2 border-[#FF8A2A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B6B6B] font-medium">Loading AI assistants...</p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-[#E8E8E5]">
          <div className="w-14 h-14 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-2xs">
            <Bot className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#171717]">No AI Agents Found</h3>
            <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto leading-relaxed">
              {searchQuery || statusFilter !== 'all'
                ? 'No agents matched your search filter criteria. Try clearing your filters.'
                : 'Create your first autonomous assistant to start handling customer conversations 24/7.'}
            </p>
          </div>
          {(!searchQuery && statusFilter === 'all') && (
            <button
              onClick={onCreateAgentClick}
              className="px-4 py-2 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Assistant</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const isActive = agent.status === 'active';
            const isPaused = agent.status === 'paused';

            return (
              <div
                key={agent.id}
                className="bg-white rounded-3xl border border-[#E8E8E5] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all flex flex-col justify-between relative group"
              >
                {/* Top Row: Avatar & Status & Menu */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white flex items-center justify-center shadow-xs">
                        <Bot className="w-6 h-6" />
                      </div>

                      <div>
                        <h3 className="font-black text-sm text-[#171717] line-clamp-1 group-hover:text-[#FF8A2A] transition-colors">
                          {agent.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-black ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isPaused
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-500 animate-pulse' : isPaused ? 'bg-amber-500' : 'bg-gray-400'
                              }`}
                            />
                            {agent.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Dropdown Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === agent.id ? null : agent.id)}
                        className="p-1.5 text-gray-400 hover:text-[#171717] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === agent.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E8E8E5] rounded-2xl shadow-xl p-1.5 z-30 space-y-0.5">
                          <button
                            onClick={() => {
                              onSelectAgent(agent.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Edit Agent</span>
                          </button>

                          <button
                            onClick={() => {
                              onDuplicateAgent(agent);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>

                          <button
                            onClick={() => {
                              onToggleStatus(agent.id, agent.status);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 cursor-pointer"
                          >
                            {isActive ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{isActive ? 'Pause Agent' : 'Activate'}</span>
                          </button>

                          <div className="border-t border-[#E8E8E5] my-1" />

                          <button
                            onClick={() => {
                              onDeleteAgentClick(agent);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Agent</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#6B6B6B] line-clamp-2 leading-relaxed mb-4">
                    {agent.description || agent.customInstructions || 'Autonomous customer support agent.'}
                  </p>

                  {/* Config Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E8E8E5] text-[10px] font-bold text-[#6B6B6B]">
                      Tone: {agent.tone || 'Friendly'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E8E8E5] text-[10px] font-bold text-[#6B6B6B]">
                      Style: {agent.responseStyle || 'Balanced'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700 flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" />
                      {(agent.knowledgeSources || []).length} Sources
                    </span>
                  </div>
                </div>

                {/* Bottom Stats & Clickable Config Trigger */}
                <div className="pt-3 border-t border-[#E8E8E5] flex items-center justify-between">
                  <div className="text-[11px] text-[#6B6B6B]">
                    <span className="font-bold text-[#171717]">{agent.conversationsHandled || 0}</span> chats handled
                  </div>

                  <button
                    onClick={() => onSelectAgent(agent.id)}
                    className="text-xs font-bold text-[#FF8A2A] hover:text-[#D96512] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Configure</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
