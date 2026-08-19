import React, { useState } from 'react';
import type { KnowledgeSource } from '../../types/knowledge';
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  FileText,
  HelpCircle,
  Globe,
  File,
  RotateCcw,
  Trash2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Bot,
} from 'lucide-react';

interface KnowledgeListProps {
  sources: KnowledgeSource[];
  stats: { total: number; ready: number; processing: number; totalChunks: number };
  onSelectSource: (sourceId: string) => void;
  onAddKnowledgeClick: () => void;
  onOpenRAGDebugClick: () => void;
  onReprocessSource: (sourceId: string) => Promise<void>;
  onDeleteSourceClick: (source: KnowledgeSource) => void;
  isLoading: boolean;
}

// Icon helper for source types
function renderTypeIcon(type: string) {
  switch (type.toUpperCase()) {
    case 'FAQ':
      return <HelpCircle className="w-4 h-4 text-purple-600" />;
    case 'URL':
      return <Globe className="w-4 h-4 text-blue-600" />;
    case 'PDF':
    case 'DOCUMENT':
      return <File className="w-4 h-4 text-emerald-600" />;
    default:
      return <FileText className="w-4 h-4 text-[#FF8A2A]" />;
  }
}

// Status badge helper
function renderStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold animate-pulse">
          <Clock className="w-3 h-3" /> Processing...
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
          <AlertTriangle className="w-3 h-3" /> Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-[10px] font-bold">
          Outdated
        </span>
      );
  }
}

export const KnowledgeList: React.FC<KnowledgeListProps> = ({
  sources,
  stats,
  onSelectSource,
  onAddKnowledgeClick,
  onOpenRAGDebugClick,
  onReprocessSource,
  onDeleteSourceClick,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const filteredSources = sources.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || s.type.toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">Knowledge Base</h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Give your AI agents the information they need to answer customers accurately.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenRAGDebugClick}
            className="px-3.5 py-2.5 rounded-2xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-[#171717] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
            <span>Test RAG Search</span>
          </button>

          <button
            onClick={onAddKnowledgeClick}
            className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Knowledge Sources</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.ready} / {stats.total} Ready</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Indexed Vector Chunks</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.totalChunks} chunks</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">AI Knowledge Coverage</p>
            <p className="text-xl font-extrabold text-[#171717]">100% Active</p>
          </div>
        </div>
      </div>

      {/* Search & Type Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search knowledge sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E8E8E5] rounded-2xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar self-end sm:self-auto">
          {(['all', 'text', 'faq', 'url', 'pdf', 'document'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                typeFilter === t
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sources List / Table View */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-12 text-center space-y-4 shadow-2xs">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-extrabold text-[#171717]">Build your AI's knowledge</h3>
            <p className="text-xs text-[#6B6B6B]">
              Add your FAQs, policies, product information, and website content so your AI agents can answer customers with confidence.
            </p>
          </div>
          <button
            onClick={onAddKnowledgeClick}
            className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#171717]">
              <thead className="bg-[#FAF9F6] border-b border-[#E8E8E5] text-[11px] font-extrabold text-[#6B6B6B] uppercase tracking-wider">
                <tr>
                  <th className="p-4">Knowledge Source</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Chunks</th>
                  <th className="p-4">Connected Agents</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E8E5]/70">
                {filteredSources.map((source) => {
                  const isMenuOpen = activeMenuId === source.id;

                  return (
                    <tr key={source.id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-center shrink-0">
                            {renderTypeIcon(source.type)}
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectSource(source.id)}
                              className="font-extrabold text-xs text-[#171717] hover:text-[#FF8A2A] text-left transition-colors cursor-pointer block"
                            >
                              {source.name}
                            </button>
                            {source.originalUrl && (
                              <p className="text-[10px] text-[#6B6B6B] truncate max-w-xs">{source.originalUrl}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-xl bg-gray-100 border border-[#E8E8E5] text-[11px] font-bold">
                          {source.type}
                        </span>
                      </td>

                      <td className="p-4">{renderStatusBadge(source.status)}</td>

                      <td className="p-4 font-bold text-[#171717]">{source.chunkCount} chunks</td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#6B6B6B]">
                          <Bot className="w-3.5 h-3.5 text-[#FF8A2A]" /> 2 Agents
                        </span>
                      </td>

                      <td className="p-4 text-[#6B6B6B]">
                        {new Date(source.updatedAt || source.createdAt).toLocaleDateString()}
                      </td>

                      <td className="p-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveMenuId(isMenuOpen ? null : source.id)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#E8E8E5] rounded-2xl shadow-lg p-1.5 z-20 space-y-1 text-left">
                              <button
                                onClick={() => {
                                  onSelectSource(source.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FFF0E5] hover:text-[#FF8A2A] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View / Edit
                              </button>

                              <button
                                onClick={() => {
                                  onReprocessSource(source.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-gray-500" /> Re-process
                              </button>

                              <div className="border-t border-[#E8E8E5] my-1" />

                              <button
                                onClick={() => {
                                  onDeleteSourceClick(source);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
