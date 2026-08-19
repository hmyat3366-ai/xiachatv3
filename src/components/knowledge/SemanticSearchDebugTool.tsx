import React, { useState } from 'react';
import type { RAGSearchResult } from '../../types/knowledge';
import {
  Search,
  Sparkles,
  X,
  BookOpen,
  Loader2,
} from 'lucide-react';

interface SemanticSearchDebugToolProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
}

export const SemanticSearchDebugTool: React.FC<SemanticSearchDebugToolProps> = ({
  isOpen,
  onClose,
  workspaceId,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RAGSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query.trim() || isSearching) return;
    try {
      setIsSearching(true);
      setSearchedQuery(query.trim());
      const res = await fetch(`/api/knowledge-base/search?workspaceId=${workspaceId || ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: query.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#171717]">
            <Sparkles className="w-5 h-5 text-[#FF8A2A]" />
            <span>Semantic RAG Search Debug Tool</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#6B6B6B]">
          Enter a customer question to test how Xia Chat RAG retrieves relevant knowledge vector chunks.
        </p>

        {/* Search Input Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="e.g. How long does shipping take?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-2xl text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </div>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pt-2">
          {isSearching ? (
            <div className="flex items-center justify-center p-8 text-xs text-[#6B6B6B] gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#FF8A2A]" />
              <span>Searching workspace vector chunks...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B6B6B] space-y-2">
              <BookOpen className="w-8 h-8 text-[#FF8A2A] mx-auto opacity-50" />
              <p>{searchedQuery ? 'No matching knowledge chunks found.' : 'Enter a search prompt above to test RAG retrieval.'}</p>
            </div>
          ) : (
            results.map((res) => (
              <div key={res.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#171717] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#FF8A2A]" />
                    {res.sourceName} <span className="text-[10px] text-[#6B6B6B]">({res.sourceType})</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                    {res.similarityScore}% Match
                  </span>
                </div>
                <p className="text-xs text-[#171717] leading-relaxed font-mono whitespace-pre-wrap">{res.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
