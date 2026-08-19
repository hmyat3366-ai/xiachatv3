import React, { useState, useEffect } from 'react';
import { X, Search, Users, User, Loader2, Check } from 'lucide-react';

interface TeamMemberItem {
  id: string; // userId
  memberId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  isCurrentUser: boolean;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  onStartConversation: (params: { recipientUserId?: string; memberIds?: string[]; title?: string }) => Promise<boolean>;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onStartConversation,
}) => {
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedUserIds([]);
      setGroupTitle('');
      setError(null);
      return;
    }

    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        let url = '/api/team-chat/workspace-members';
        if (workspaceId) url += `?workspaceId=${workspaceId}`;

        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load team members.');
        }
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching workspace members.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  const eligibleMembers = members.filter((m) => !m.isCurrentUser);

  const filteredMembers = eligibleMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleMember = (userId: string) => {
    if (mode === 'direct') {
      setSelectedUserIds([userId]);
    } else {
      if (selectedUserIds.includes(userId)) {
        setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
      } else {
        setSelectedUserIds([...selectedUserIds, userId]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setError('Please select at least one team member.');
      return;
    }

    if (mode === 'group' && selectedUserIds.length > 1 && !groupTitle.trim()) {
      setError('Please enter a group title for this conversation.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let success = false;
      if (mode === 'direct' || selectedUserIds.length === 1) {
        success = await onStartConversation({ recipientUserId: selectedUserIds[0] });
      } else {
        success = await onStartConversation({
          memberIds: selectedUserIds,
          title: groupTitle.trim(),
        });
      }

      if (success) {
        onClose();
      } else {
        setError('Failed to start conversation. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <h2 className="text-base font-bold text-[#171717]">New Team Conversation</h2>
            <p className="text-xs text-[#6B6B6B]">Start an internal chat with workspace team members.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-[#171717] hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-4 flex gap-2 border-b border-[#E8E8E5] bg-white">
          <button
            type="button"
            onClick={() => {
              setMode('direct');
              setSelectedUserIds([]);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              mode === 'direct'
                ? 'border-[#FF8A2A] text-[#FF8A2A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#171717]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Direct Message
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('group');
              setSelectedUserIds([]);
            }}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors flex items-center gap-2 border-b-2 cursor-pointer ${
              mode === 'group'
                ? 'border-[#FF8A2A] text-[#FF8A2A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#171717]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Group Conversation
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col min-h-0 space-y-4">
          {/* Group Title Input (only if mode is group) */}
          {mode === 'group' && (
            <div>
              <label className="block text-xs font-bold text-[#171717] mb-1.5">Group Title</label>
              <input
                type="text"
                placeholder="e.g. Support Operations, Sales Sync..."
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E8E5] text-xs focus:outline-none focus:border-[#FF8A2A] bg-[#FAF9F6]"
              />
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search team members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E8E8E5] text-xs focus:outline-none focus:border-[#FF8A2A] bg-[#FAF9F6]"
            />
          </div>

          {/* Members Selector List */}
          <div className="flex-1 min-h-[200px] overflow-y-auto border border-[#E8E8E5] rounded-xl p-2 space-y-1 bg-[#FAF9F6]">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
                Loading workspace members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                <Users className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-bold text-[#171717]">No team members found</p>
                <p className="text-[11px] text-[#6B6B6B]">
                  {searchQuery ? 'Try a different search query.' : 'Invite team members from the Team Members page first.'}
                </p>
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isSelected = selectedUserIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => handleToggleMember(member.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#FFF0E5] border border-[#FF8A2A]/40'
                        : 'bg-white hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#171717] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {member.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#171717] truncate">{member.name}</p>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 capitalize">
                            {member.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] truncate">{member.email}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#FF8A2A] text-white' : 'border border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedUserIds.length === 0}
              className="px-5 py-2 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold hover:bg-[#e0771e] transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Start Conversation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
