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
} from 'lucide-react';

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
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalHandled = agents.reduce((acc, a) => acc + (a.conversationsHandled || 0), 0);
  const activeCount = agents.filter((a) => a.status === 'active').length;
  const avgResolution = agents.length > 0 ? Math.round(agents.reduce((acc, a) => acc + (a.resolutionRate || 78), 0) / agents.length) : 78;

  return (
    <div className="space-y-6">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">AI Agents</h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Create and manage AI assistants that help your team handle customer conversations.
          </p>
        </div>

        <button
          onClick={onCreateAgentClick}
          className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create AI Agent</span>
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Active AI Assistants</p>
            <p className="text-xl font-extrabold text-[#171717]">{activeCount} / {agents.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Conversations Handled</p>
            <p className="text-xl font-extrabold text-[#171717]">{totalHandled.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Avg Resolution Rate</p>
            <p className="text-xl font-extrabold text-[#171717]">{avgResolution}%</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search AI agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E8E5] rounded-2xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(['all', 'active', 'paused', 'draft'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-200" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
              <div className="h-10 bg-gray-100 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-extrabold text-[#171717]">
              {searchQuery ? 'No matching AI agents found' : 'Create your first AI agent'}
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              Let AI handle repetitive customer questions while your team focuses on conversations that need a human.
            </p>
          </div>
          <button
            onClick={onCreateAgentClick}
            className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create AI Agent</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => {
            const isMenuOpen = activeMenuId === agent.id;

            return (
              <div
                key={agent.id}
                className="bg-white rounded-3xl border border-[#E8E8E5] hover:border-[#FF8A2A]/50 p-6 shadow-2xs hover:shadow-md transition-all duration-200 space-y-5 relative flex flex-col justify-between"
              >
                {/* Top Row: Avatar + Name + Status + More Menu */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#171717] text-[#FF8A2A] font-extrabold flex items-center justify-center shrink-0 shadow-xs">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-base text-[#171717] truncate">{agent.name}</h3>
                        <p className="text-xs text-[#6B6B6B] truncate">
                          {agent.tone} Tone • {agent.responseStyle}
                        </p>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : agent.id)}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#E8E8E5] rounded-2xl shadow-lg p-1.5 z-20 space-y-1">
                          <button
                            onClick={() => {
                              onSelectAgent(agent.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FFF0E5] hover:text-[#FF8A2A] flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Open / Edit
                          </button>
                          <button
                            onClick={() => {
                              onDuplicateAgent(agent);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-500" /> Duplicate
                          </button>
                          <button
                            onClick={() => {
                              onToggleStatus(agent.id, agent.status);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            {agent.status === 'active' ? (
                              <>
                                <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Agent
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 text-emerald-600" /> Activate Agent
                              </>
                            )}
                          </button>
                          <div className="border-t border-[#E8E8E5] my-1" />
                          <button
                            onClick={() => {
                              onDeleteAgentClick(agent);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {agent.status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active
                      </span>
                    )}
                    {agent.status === 'paused' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        <Pause className="w-3 h-3" /> Paused
                      </span>
                    )}
                    {agent.status === 'draft' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
                        Draft Configuration
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#6B6B6B] line-clamp-2 leading-relaxed">
                    {agent.description}
                  </p>
                </div>

                {/* Bottom Row: Knowledge count + Handled + Resolution rate */}
                <div className="pt-4 border-t border-[#E8E8E5] space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5]">
                      <span className="text-[10px] font-semibold text-[#6B6B6B] block">Knowledge</span>
                      <span className="font-bold text-[#171717] flex items-center gap-1 mt-0.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#FF8A2A]" />
                        {agent.knowledgeSources?.length || 3} sources
                      </span>
                    </div>
                    <div className="p-2 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5]">
                      <span className="text-[10px] font-semibold text-[#6B6B6B] block">Resolution Rate</span>
                      <span className="font-bold text-emerald-700 mt-0.5 block">
                        {agent.resolutionRate}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectAgent(agent.id)}
                    className="w-full py-2.5 rounded-2xl bg-[#FAF9F6] hover:bg-[#FFF0E5] hover:text-[#FF8A2A] border border-[#E8E8E5] hover:border-[#FF8A2A]/40 text-xs font-bold text-[#171717] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Configure & Test Agent</span>
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
