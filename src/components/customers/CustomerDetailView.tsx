import React, { useState } from 'react';
import type { Customer, CustomerConversationSummary, CustomerNote, CustomerActivity, CustomerProfileSummary } from '../../types/customer';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  MapPin,
  MessageSquare,
  Clock,
  Tag,
  ShieldAlert,
  Trash2,
  Edit,
  Plus,
  Users,
  ExternalLink,
  Lock,
  Send,
  Loader2,
  Check,
} from 'lucide-react';

interface CustomerDetailViewProps {
  customer: Customer;
  summary: CustomerProfileSummary;
  conversations: CustomerConversationSummary[];
  notes: CustomerNote[];
  activityTimeline: CustomerActivity[];
  allCustomers: Customer[];
  onBack: () => void;
  onNavigate: (path: string) => void;
  onUpdateCustomer: (updatedData: Partial<Customer>) => Promise<void>;
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onToggleBlock: () => Promise<void>;
  onOpenMergeModal: () => void;
  onDeleteClick: () => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
  summary,
  conversations,
  notes,
  activityTimeline,
  onBack,
  onNavigate,
  onUpdateCustomer,
  onAddNote,
  onDeleteNote,
  onToggleBlock,
  onOpenMergeModal,
  onDeleteClick,
}) => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'notes' | 'info' | 'activity'>('conversations');

  // Contact Info Editing state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editEmail, setEditEmail] = useState(customer.email || '');
  const [editPhone, setEditPhone] = useState(customer.phone || '');
  const [editCompany, setEditCompany] = useState(customer.company || '');
  const [editLocation, setEditLocation] = useState(customer.location || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Tags state
  const [newTagInput, setNewTagInput] = useState('');

  // New Note state
  const [noteInput, setNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const handleSaveInfo = async () => {
    try {
      setIsSavingInfo(true);
      await onUpdateCustomer({
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        company: editCompany.trim() || null,
        location: editLocation.trim() || null,
      });
      setIsEditingInfo(false);
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim()) return;
    const nextTags = Array.from(new Set([...customer.tags, newTagInput.trim()]));
    await onUpdateCustomer({ tags: nextTags });
    setNewTagInput('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const nextTags = customer.tags.filter((t) => t !== tagToRemove);
    await onUpdateCustomer({ tags: nextTags });
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || isAddingNote) return;
    try {
      setIsAddingNote(true);
      await onAddNote(noteInput.trim());
      setNoteInput('');
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-2xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#171717] text-[#FF8A2A] font-black text-xl flex items-center justify-center">
              {customer.avatar || customer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#171717]">{customer.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    customer.status === 'blocked'
                      ? 'bg-red-100 text-red-800'
                      : customer.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {customer.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                {customer.email || 'No email registered'} • Customer since {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={onOpenMergeModal}
            className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#FF8A2A]" /> Merge
          </button>

          <button
            onClick={onToggleBlock}
            className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            {customer.status === 'blocked' ? 'Unblock' : 'Block'}
          </button>

          <button
            onClick={onDeleteClick}
            className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Delete Customer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-[#6B6B6B]">Total Chats</p>
          <p className="text-xl font-extrabold text-[#171717]">{summary.totalConversations}</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-[#6B6B6B]">Resolved</p>
          <p className="text-xl font-extrabold text-emerald-600">{summary.resolvedConversations}</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-[#6B6B6B]">AI vs Human</p>
          <p className="text-xl font-extrabold text-[#171717]">{summary.aiHandled} AI / {summary.humanHandled} Human</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-[#6B6B6B]">Last Active</p>
          <p className="text-xs font-bold text-[#171717]">
            {new Date(summary.lastActiveAt).toLocaleDateString()} {new Date(summary.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-2">
        {[
          { id: 'conversations', label: `Conversations (${conversations.length})`, icon: MessageSquare },
          { id: 'notes', label: `Team Notes (${notes.length})`, icon: Lock },
          { id: 'info', label: 'Contact Info', icon: Mail },
          { id: 'activity', label: 'Activity Timeline', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1 — CONVERSATION HISTORY (Deep Links directly into Inbox) */}
      {activeTab === 'conversations' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-base text-[#171717]">Customer Conversation History</h3>

          {conversations.length === 0 ? (
            <p className="text-xs text-[#6B6B6B]">No conversation history found for this customer.</p>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <div key={conv.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-gray-200 text-[#171717] font-bold text-[10px] uppercase">
                        {conv.channel}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          conv.status === 'ai' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {conv.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#6B6B6B]">Assigned to: {conv.assignee || 'Xia AI'}</span>
                    </div>
                    <p className="text-xs font-bold text-[#171717]">"{conv.lastMessage}"</p>
                    <p className="text-[10px] text-[#6B6B6B]">{new Date(conv.updatedAt).toLocaleString()}</p>
                  </div>

                  <button
                    onClick={() => onNavigate(`/inbox?conversationId=${conv.id}`)}
                    className="px-3.5 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs self-end sm:self-auto shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Inbox
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2 — INTERNAL WORKSPACE TEAM NOTES */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[#171717] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#FF8A2A]" /> Internal Workspace Team Notes
            </h3>
            <span className="text-[10px] text-[#6B6B6B]">Private to team • Never sent to customer or AI</span>
          </div>

          <form onSubmit={handleCreateNote} className="space-y-2">
            <textarea
              rows={3}
              placeholder="e.g. Customer prefers email communication and enterprise SLA response times..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!noteInput.trim() || isAddingNote}
                className="px-4 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isAddingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isAddingNote ? 'Saving...' : 'Add Note'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-3 pt-2">
            {notes.map((note) => (
              <div key={note.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#171717]">
                  <span>{note.authorName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6B6B6B]">{new Date(note.createdAt).toLocaleString()}</span>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="text-gray-400 hover:text-red-600 p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#171717] leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3 — CONTACT INFORMATION & TAGS */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
            <h3 className="font-extrabold text-base text-[#171717]">Contact Information & Profile Data</h3>
            <button
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className="px-3 py-1.5 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{isEditingInfo ? 'Cancel' : 'Edit Info'}</span>
            </button>
          </div>

          {isEditingInfo ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717]">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717]">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717]">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717]">Company</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#171717]">Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717]"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveInfo}
                  disabled={isSavingInfo}
                  className="px-4 py-2 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {isSavingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isSavingInfo ? 'Saving...' : 'Save Info'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF9F6]">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[10px] text-[#6B6B6B]">Email Address</p>
                  <p className="font-bold text-[#171717]">{customer.email || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF9F6]">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[10px] text-[#6B6B6B]">Phone Number</p>
                  <p className="font-bold text-[#171717]">{customer.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF9F6]">
                <Building className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[10px] text-[#6B6B6B]">Company</p>
                  <p className="font-bold text-[#171717]">{customer.company || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF9F6]">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-[10px] text-[#6B6B6B]">Location</p>
                  <p className="font-bold text-[#171717]">{customer.location || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tags Editor */}
          <div className="space-y-2 pt-2 border-t border-[#E8E8E5]">
            <h4 className="font-extrabold text-xs text-[#171717]">Customer Tags</h4>
            <div className="flex flex-wrap items-center gap-2">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] text-xs font-bold flex items-center gap-1.5"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-600 cursor-pointer ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="New tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="px-2.5 py-1 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] w-28"
                />
                <button
                  onClick={handleAddTag}
                  className="p-1 rounded-xl bg-[#FF8A2A] text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4 — ACTIVITY TIMELINE */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <h3 className="font-extrabold text-base text-[#171717]">Customer Activity Timeline</h3>

          <div className="space-y-4 relative border-l-2 border-[#E8E8E5] ml-4 pl-4 pt-2">
            {activityTimeline.map((item) => (
              <div key={item.id} className="relative space-y-1">
                <div className="w-3 h-3 rounded-full bg-[#FF8A2A] absolute -left-[23px] top-1 border-2 border-white" />
                <p className="text-xs font-extrabold text-[#171717]">{item.title}</p>
                <p className="text-xs text-[#6B6B6B]">{item.description}</p>
                <p className="text-[10px] text-[#6B6B6B]">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
