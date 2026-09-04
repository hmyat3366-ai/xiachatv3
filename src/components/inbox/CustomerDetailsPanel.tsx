import React, { useState, useEffect } from 'react';
import type { CustomerProfile, ConversationItem, MessageItem } from '../../types/inbox';
import { CustomerProfileCard } from './CustomerProfileCard';
import { AIInsightCard } from './AIInsightCard';
import { ConversationTimeline } from './ConversationTimeline';
import {
  Tag,
  FileText,
  Plus,
  X,
  Check,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomerDetailsPanelProps {
  customer: CustomerProfile | null;
  conversation?: ConversationItem | null;
  messages?: MessageItem[];
  onUpdateTags: (tags: string[]) => Promise<void>;
  onUpdateNotes: (notes: string) => Promise<void>;
  onClose?: () => void;
}

export const CustomerDetailsPanel: React.FC<CustomerDetailsPanelProps> = ({
  customer,
  conversation,
  messages = [],
  onUpdateTags,
  onUpdateNotes,
  onClose,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [notesText, setNotesText] = useState(customer?.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (customer) {
      setNotesText(customer.notes || '');
    }
  }, [customer]);

  if (!customer) {
    return null;
  }

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!customer.tags.includes(cleanTag)) {
      const updated = [...customer.tags, cleanTag];
      await onUpdateTags(updated);
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updated = customer.tags.filter((t) => t !== tagToRemove);
    await onUpdateTags(updated);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateNotes(notesText);
    setIsSavingNotes(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const previousConversations = customer.previousConversations || [
    {
      id: 'prev-1',
      title: 'Order Status Inquiry',
      status: 'Resolved',
      channel: customer.channel || 'Live Chat',
      date: 'Yesterday',
    },
    {
      id: 'prev-2',
      title: 'Coffee Blend Recommendation',
      status: 'Resolved',
      channel: 'Website',
      date: 'Aug 28',
    },
  ];

  return (
    <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 border-l border-[#E8E8E5] bg-white flex flex-col h-full min-h-0 overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. PANEL HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6]/80 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">Customer Details</h3>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Contact" />
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0">
        {/* ─────────────────────────────────────────────────────────────
            2. CUSTOMER INFO CARD (Section: Customer Info)
           ───────────────────────────────────────────────────────────── */}
        <CustomerProfileCard customer={customer} />

        {/* ─────────────────────────────────────────────────────────────
            3. AI INTELLIGENCE CARD (Section: AI Intelligence)
           ───────────────────────────────────────────────────────────── */}
        <AIInsightCard
          intent={customer.intent || conversation?.intent}
          sentiment={customer.sentiment || conversation?.sentiment}
          aiSummary={customer.aiSummary || conversation?.aiSummary}
          confidenceScore={customer.confidenceScore || conversation?.confidenceScore}
          recommendedAction={customer.recommendedAction || conversation?.recommendedAction}
        />

        {/* ─────────────────────────────────────────────────────────────
            4. CUSTOMER TAGS
           ───────────────────────────────────────────────────────────── */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#FF8A3D]" /> Customer Tags
            </span>

            {!isAddingTag && (
              <button
                onClick={() => setIsAddingTag(true)}
                className="text-[11px] text-[#FF8A3D] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[26px]">
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-700"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-400 hover:text-rose-500 cursor-pointer ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>

          <AnimatePresence>
            {isAddingTag && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 pt-1"
              >
                <input
                  type="text"
                  placeholder="e.g. VIP, Coffee Shop"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF8A3D] bg-slate-50 focus:bg-white"
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  className="px-2.5 py-1 rounded-lg bg-[#FF8A3D] hover:bg-[#E6782E] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingTag(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. TEAM INTERNAL NOTES
           ───────────────────────────────────────────────────────────── */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF8A3D]" /> Internal Notes
            </span>

            {savedSuccess && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <textarea
            rows={2}
            placeholder="Notes on customer preferences, VIP status..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#FF8A3D] focus:bg-white transition-all resize-none leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              {isSavingNotes ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            6. CONVERSATION TIMELINE (Live Events)
           ───────────────────────────────────────────────────────────── */}
        {conversation && (
          <ConversationTimeline conversation={conversation} messages={messages} />
        )}

        {/* ─────────────────────────────────────────────────────────────
            7. CONVERSATION HISTORY (Previous Chats)
           ───────────────────────────────────────────────────────────── */}
        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Conversation History
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {previousConversations.length} total
            </span>
          </div>

          <div className="space-y-1.5">
            {previousConversations.map((conv) => (
              <div
                key={conv.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between hover:bg-white hover:border-slate-300 transition-colors"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-semibold text-slate-800 truncate">{conv.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{conv.channel} • {conv.date}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  {conv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
