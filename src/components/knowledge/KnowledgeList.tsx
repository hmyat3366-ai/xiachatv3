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
  Database,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  switch ((type || '').toUpperCase()) {
    case 'FAQ':
      return <HelpCircle className="w-5 h-5 text-purple-600" />;
    case 'URL':
      return <Globe className="w-5 h-5 text-blue-600" />;
    case 'PDF':
    case 'DOCUMENT':
      return <File className="w-5 h-5 text-emerald-600" />;
    default:
      return <FileText className="w-5 h-5 text-[#FF8A2A]" />;
  }
}

// Status badge helper
function renderStatusBadge(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ready in RAG
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black animate-pulse">
          <Clock className="w-3 h-3 text-amber-600" /> Vectorizing...
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-black">
          <AlertTriangle className="w-3 h-3 text-red-600" /> Indexing Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] font-black">
          Pending
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
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const filteredSources = sources.filter((s) => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || (s.type || '').toLowerCase() === typeFilter.toLowerCase();
    return matchesSearch && matchesType;
  });

  const handleReprocess = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setReprocessingId(id);
      await onReprocessSource(id);
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP HEADER & ACTION BUTTONS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">Knowledge Base & RAG</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black">
              {stats.total} Sources
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Ingest FAQs, documents, and websites into vector chunks for real-time AI semantic search.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={onOpenRAGDebugClick}
            className="px-3.5 py-2.5 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
            <span>RAG Query Debugger</span>
          </button>

          <button
            onClick={onAddKnowledgeClick}
            className="px-4 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] active:bg-[#C2550A] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRICS STATS BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#6B6B6B]">Total Sources</p>
            <p className="text-xl font-black text-[#171717]">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#6B6B6B]">Ready in RAG</p>
            <p className="text-xl font-black text-emerald-600">{stats.ready}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#6B6B6B]">Vector Chunks</p>
            <p className="text-xl font-black text-[#171717]">{stats.totalChunks}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#6B6B6B]">Connected Agents</p>
            <p className="text-xl font-black text-[#171717]">All Active</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SEARCH & TYPE FILTER CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-[#E8E8E5] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search documents, FAQs, URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] focus:bg-white border border-[#E8E8E5] rounded-xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 self-stretch sm:self-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Types' },
            { id: 'faq', label: 'FAQs' },
            { id: 'url', label: 'Websites' },
            { id: 'pdf', label: 'Documents' },
            { id: 'text', label: 'Text' },
          ].map((t) => {
            const isSelected = typeFilter === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. KNOWLEDGE CARDS GRID
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-[#E8E8E5]">
          <div className="w-7 h-7 border-2 border-[#FF8A2A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B6B6B] font-medium">Loading knowledge index...</p>
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-[#E8E8E5]">
          <div className="w-14 h-14 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#171717]">No Knowledge Sources Found</h3>
            <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto leading-relaxed">
              Add FAQs, website URLs, or company documents to train your AI assistants on accurate customer responses.
            </p>
          </div>
          <button
            onClick={onAddKnowledgeClick}
            className="px-4 py-2 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Knowledge Source</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((source) => {
            const isReprocessing = reprocessingId === source.id;

            return (
              <div
                key={source.id}
                onClick={() => onSelectSource(source.id)}
                className="bg-white rounded-3xl border border-[#E8E8E5] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all flex flex-col justify-between cursor-pointer group relative"
              >
                <div>
                  {/* Top Bar: Icon + Status + Dropdown */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        {renderTypeIcon(source.type)}
                      </div>

                      <div>
                        <h3 className="font-black text-sm text-[#171717] line-clamp-1 group-hover:text-[#FF8A2A] transition-colors">
                          {source.name}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {source.type.toUpperCase()} · Ingested by {source.createdBy || 'Admin'}
                        </p>
                      </div>
                    </div>

                    {/* Action Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === source.id ? null : source.id)}
                        className="p-1.5 text-gray-400 hover:text-[#171717] rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === source.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E8E8E5] rounded-2xl shadow-xl p-1.5 z-30 space-y-0.5">
                          <button
                            onClick={(e) => {
                              handleReprocess(source.id, e);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#FF8A2A]" />
                            <span>Reprocess Chunks</span>
                          </button>

                          <div className="border-t border-[#E8E8E5] my-1" />

                          <button
                            onClick={() => {
                              onDeleteSourceClick(source);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Source</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status & Chunk Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {renderStatusBadge(source.status)}
                    <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E8E8E5] text-[10px] font-bold text-[#6B6B6B] flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5 text-[#FF8A2A]" />
                      <span>{source.chunkCount || 0} Vector Chunks</span>
                    </span>
                  </div>

                  {/* Source Preview snippet / URL */}
                  {source.originalUrl ? (
                    <p className="text-xs text-blue-600 truncate font-mono bg-blue-50/50 p-2 rounded-xl border border-blue-100 mb-3">
                      {source.originalUrl}
                    </p>
                  ) : (
                    <p className="text-xs text-[#6B6B6B] line-clamp-2 leading-relaxed mb-3">
                      {typeof source.content === 'string'
                        ? source.content.slice(0, 120)
                        : `${(source.content || []).length} Q&A Pairs indexed.`}
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-[#E8E8E5] flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(source.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleReprocess(source.id, e)}
                      disabled={isReprocessing}
                      className="p-1.5 text-gray-400 hover:text-[#FF8A2A] rounded-lg transition-colors cursor-pointer"
                      title="Reprocess Source"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin text-[#FF8A2A]' : ''}`} />
                    </button>

                    <span className="text-xs font-bold text-[#FF8A2A] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <span>View Chunks</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
