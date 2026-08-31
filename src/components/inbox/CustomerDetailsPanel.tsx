import React, { useState, useEffect } from 'react';
import type { CustomerProfile } from '../../types/inbox';
import {
  Mail,
  Phone,
  Calendar,
  Tag,
  FileText,
  Plus,
  X,
  Sparkles,
  MessageSquare,
  Check,
  Globe,
  Clock,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomerDetailsPanelProps {
  customer: CustomerProfile | null;
  onUpdateTags: (tags: string[]) => Promise<void>;
  onUpdateNotes: (notes: string) => Promise<void>;
  onClose?: () => void;
}

export const CustomerDetailsPanel: React.FC<CustomerDetailsPanelProps> = ({
  customer,
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

  return (
    <div className="w-full md:w-[320px] lg:w-[350px] shrink-0 border-l border-[#E8E8E5] bg-white flex flex-col h-full overflow-y-auto select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. PANEL HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="p-4 border-b border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6]/80 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-sm text-[#171717]">Customer Context</h3>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Contact" />
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-[#171717] md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. CUSTOMER PROFILE CARD
         ───────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-6 flex-1">
        
        {/* Profile Avatar & Primary Badge */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white font-black text-2xl flex items-center justify-center mx-auto shadow-sm">
            {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
          </div>

          <div>
            <h4 className="font-black text-base text-[#171717]">{customer.name}</h4>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#D96512] text-[10px] font-black mt-1 border border-[#FF8A2A]/20">
              <Globe className="w-3 h-3" /> {customer.channel} Customer
            </span>
          </div>
        </div>

        {/* Contact Details Card */}
        <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2.5 text-xs">
          <div className="flex items-center gap-2.5 text-[#171717]">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate font-semibold">{customer.email || 'No email on file'}</span>
          </div>

          <div className="flex items-center gap-2.5 text-[#171717]">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-semibold">{customer.phone || 'No phone on file'}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#E8E8E5]/60 text-[11px]">
            <span className="text-[#6B6B6B] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" /> First Seen:
            </span>
            <span className="font-semibold text-[#171717]">
              {customer.firstSeen ? new Date(customer.firstSeen).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#6B6B6B] flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" /> Total Threads:
            </span>
            <span className="font-black text-[#FF8A2A]">{customer.totalConversations || 1}</span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. CUSTOMER TAGS SECTION
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#FF8A2A]" /> Customer Tags
            </span>

            <button
              onClick={() => setIsAddingTag(true)}
              className="text-[11px] font-bold text-[#FF8A2A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Tag
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {customer.tags && customer.tags.length > 0 ? (
              customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-xl bg-gray-100 border border-[#E8E8E5] text-[11px] font-bold text-[#171717] flex items-center gap-1.5 shadow-2xs"
                >
                  <span>#{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <p className="text-[11px] text-gray-400 italic">No tags attached.</p>
            )}
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
                  placeholder="e.g. VIP, Enterprise"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 px-3 py-1.5 text-xs border border-[#E8E8E5] rounded-xl focus:outline-none focus:border-[#FF8A2A] bg-[#FAF9F6] focus:bg-white"
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingTag(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. TEAM INTERNAL NOTES
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#171717] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF8A2A]" /> Team Notes
            </span>

            {savedSuccess && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>

          <textarea
            rows={3}
            placeholder="Add internal notes on customer preferences, billing details, or account flags..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="w-full p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15 transition-all resize-none leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-black active:bg-gray-800 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs"
            >
              {isSavingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. AI INTELLIGENCE SUMMARY & CONVERSATION HISTORY
           ───────────────────────────────────────────────────────────── */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF0E5] via-white to-[#FFF5ED] border border-[#FF8A2A]/30 space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#D96512]">
            <Sparkles className="w-4 h-4 text-[#FF8A2A]" />
            <span>AI Context Intelligence</span>
          </div>
          <p className="text-[11px] text-[#4A4A4A] leading-relaxed font-medium">
            Customer inquiries pertain to order tracking and subscription plans. Sentiment is consistently positive with instant AI resolution.
          </p>
        </div>

        {/* Previous Chats History List */}
        <div className="space-y-2 pt-1 border-t border-[#E8E8E5]">
          <span className="text-[11px] font-black text-[#8E8E93] uppercase tracking-wider block">
            Previous Conversations
          </span>
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-[#171717]">Order Inquiry #84920</p>
                <p className="text-[10px] text-gray-400">Resolved via Live Chat</p>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Resolved
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
