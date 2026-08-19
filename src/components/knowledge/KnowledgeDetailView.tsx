import React, { useState } from 'react';
import type { KnowledgeSource, KnowledgeChunkItem, FaqPair } from '../../types/knowledge';
import {
  ArrowLeft,
  BookOpen,
  RotateCcw,
  Trash2,
  Edit,
  Globe,
  Layers,
  Check,
  Loader2,
} from 'lucide-react';

interface KnowledgeDetailViewProps {
  source: KnowledgeSource;
  chunks: KnowledgeChunkItem[];
  onBack: () => void;
  onReprocess: () => Promise<void>;
  onDeleteClick: () => void;
  onSaveEdit: (updatedContent: any) => Promise<void>;
}

export const KnowledgeDetailView: React.FC<KnowledgeDetailViewProps> = ({
  source,
  chunks,
  onBack,
  onReprocess,
  onDeleteClick,
  onSaveEdit,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(
    typeof source.content === 'string' ? source.content : JSON.stringify(source.content, null, 2)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveEdit(editText);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReprocessClick = async () => {
    try {
      setIsReprocessing(true);
      await onReprocess();
    } finally {
      setIsReprocessing(false);
    }
  };

  const isFaq = source.type === 'FAQ' && Array.isArray(source.content);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-2xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] font-bold flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#171717]">{source.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {source.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Type: {source.type} • {source.chunkCount} vector chunks • Created by {source.createdBy}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleReprocessClick}
            disabled={isReprocessing}
            className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
            <span>{isReprocessing ? 'Indexing...' : 'Re-process'}</span>
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
          </button>

          <button
            onClick={onDeleteClick}
            className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Delete Source"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Preview / Editor Card */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-[#171717]">Content Source Preview</h3>
          {source.originalUrl && (
            <a
              href={source.originalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" /> {source.originalUrl}
            </a>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              rows={8}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] font-mono leading-relaxed"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving...' : 'Save & Re-index'}</span>
              </button>
            </div>
          </div>
        ) : isFaq ? (
          <div className="space-y-3">
            {(source.content as FaqPair[]).map((faq, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
                <p className="text-xs font-extrabold text-[#FF8A2A]">Q: {faq.question}</p>
                <p className="text-xs font-medium text-[#171717] leading-relaxed">A: {faq.answer}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {typeof source.content === 'string' ? source.content : JSON.stringify(source.content)}
          </div>
        )}
      </div>

      {/* Indexed Vector Chunks Section */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-base text-[#171717]">
            <Layers className="w-5 h-5 text-[#FF8A2A]" />
            <span>Indexed RAG Vector Chunks ({chunks.length})</span>
          </div>
          <span className="text-xs text-[#6B6B6B]">Workspace Isolated</span>
        </div>

        <div className="space-y-3">
          {chunks.map((chunk) => (
            <div key={chunk.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#FF8A2A]">
                <span>Vector Chunk #{chunk.chunkIndex}</span>
                <span className="text-[#6B6B6B] font-mono">ID: {chunk.id.slice(0, 8)}</span>
              </div>
              <p className="text-xs text-[#171717] leading-relaxed font-mono whitespace-pre-wrap">{chunk.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
