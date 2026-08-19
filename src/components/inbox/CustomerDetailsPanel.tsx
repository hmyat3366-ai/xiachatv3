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
} from 'lucide-react';

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
    <div className="w-full md:w-[300px] lg:w-[340px] shrink-0 border-l border-[#E8E8E5] bg-white flex flex-col h-full overflow-y-auto">
      {/* Panel Header */}
      <div className="p-4 border-b border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6]">
        <h3 className="font-extrabold text-sm text-[#171717]">Customer Details</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-[#171717] md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Customer Profile Avatar Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-[#FF8A2A] text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-xs">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-extrabold text-base text-[#171717]">{customer.name}</h4>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#FF8A2A] text-[10px] font-extrabold mt-1">
              {customer.channel} Customer
            </span>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2.5 text-xs">
          <div className="flex items-center gap-2 text-[#171717]">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="truncate font-semibold">{customer.email || 'No email specified'}</span>
          </div>
          <div className="flex items-center gap-2 text-[#171717]">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-semibold">{customer.phone || 'No phone specified'}</span>
          </div>
          <div className="flex items-center gap-2 text-[#171717]">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-[#6B6B6B]">First Seen: </span>
            <span className="font-semibold">{new Date(customer.firstSeen).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-[#171717]">
            <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-[#6B6B6B]">Total Conversations: </span>
            <span className="font-extrabold text-[#FF8A2A]">{customer.totalConversations}</span>
          </div>
        </div>

        {/* Tags Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
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
            {customer.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-xl bg-gray-100 border border-[#E8E8E5] text-[11px] font-bold text-[#171717] flex items-center gap-1"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600 cursor-pointer ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {isAddingTag && (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Tag name (e.g. VIP)"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 px-2.5 py-1 text-xs border border-[#E8E8E5] rounded-xl focus:outline-none focus:border-[#FF8A2A]"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="px-2.5 py-1 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {/* Customer Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF8A2A]" /> Team Notes
            </span>
            {savedSuccess && (
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <textarea
            rows={4}
            placeholder="Add internal notes about customer preferences, order history, or special instructions..."
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            className="w-full p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="px-3 py-1.5 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-bold cursor-pointer transition-colors"
            >
              {isSavingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* AI Summary Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF0E5] to-amber-50/60 border border-[#FF8A2A]/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF8A2A]">
            <Sparkles className="w-4 h-4" /> AI Conversation Summary
          </div>
          <p className="text-xs text-[#171717] leading-relaxed font-medium">
            Customer inquiries pertain primarily to order status, delivery address modifications, and enterprise license options. Sentiment is overall positive with zero unresolved escalations.
          </p>
        </div>
      </div>
    </div>
  );
};
