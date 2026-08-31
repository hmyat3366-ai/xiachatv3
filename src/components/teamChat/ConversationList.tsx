import React, { useState } from 'react';
import { Search, Plus, MessageSquare, Users, User, Hash } from 'lucide-react';

export interface TeamConversationItem {
  id: string;
  workspaceId: string;
  type: 'direct' | 'group';
  title: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    avatar: string;
  }>;
  otherUser?: {
    userId: string;
    name: string;
    email: string;
    avatar: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: TeamConversationItem[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewConversation: () => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function formatTimeAgo(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onOpenNewConversation,
  isLoading,
  searchQuery,
  onSearchChange,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'direct' | 'group'>('all');

  const filteredConversations = conversations.filter((c) => {
    const isDirect = c.type === 'direct';
    const displayTitle = isDirect ? c.otherUser?.name || c.title : c.title;
    const matchesSearch =
      (displayTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeFilter === 'all' || c.type === activeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="w-full md:w-80 lg:w-96 border-r border-[#E8E8E5] bg-white flex flex-col h-full shrink-0 select-none">
      {/* Top Header */}
      <div className="p-3.5 border-b border-[#E8E8E5] space-y-3 bg-[#FAF9F6]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-base text-[#171717]">Internal Team Chat</h2>
            <span className="px-2 py-0.2 rounded-full bg-[#FFF0E5] text-[#D96512] text-[10px] font-black">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={onOpenNewConversation}
            className="p-1.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white cursor-pointer transition-colors shadow-2xs"
            title="Start new direct message or group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search team conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white border border-[#E8E8E5] text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A]"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All Chats' },
            { id: 'direct', label: 'Direct Messages' },
            { id: 'group', label: 'Groups' },
          ].map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation List Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E5]/70">
        {isLoading ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-5 h-5 border-2 border-[#FF8A2A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#6B6B6B]">Loading chats...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-2xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-xs text-[#6B6B6B]">No team conversations found.</p>
            <button
              onClick={onOpenNewConversation}
              className="text-xs font-bold text-[#FF8A2A] hover:underline cursor-pointer"
            >
              + Start a new conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id;
            const isDirect = conv.type === 'direct';
            const displayTitle = isDirect ? conv.otherUser?.name || conv.title : conv.title;
            const hasUnread = conv.unreadCount > 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3.5 transition-colors relative cursor-pointer block border-l-4 ${
                  isSelected
                    ? 'bg-[#FFF5ED] border-l-[#FF8A2A]'
                    : 'hover:bg-[#FAF9F6] border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                        isDirect
                          ? 'bg-[#171717] text-white'
                          : 'bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white'
                      }`}
                    >
                      {isDirect ? (
                        displayTitle.charAt(0).toUpperCase()
                      ) : (
                        <Hash className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs truncate ${hasUnread ? 'font-black text-black' : 'font-bold text-[#171717]'}`}>
                        {displayTitle}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium truncate">
                        {isDirect ? 'Direct Message' : `${conv.participants?.length || 2} members`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    {formatTimeAgo(conv.lastMessageAt || conv.createdAt)}
                  </span>
                </div>

                {/* Message Preview */}
                <p className={`text-xs line-clamp-1 mt-1 ${hasUnread ? 'font-semibold text-[#171717]' : 'text-[#6B6B6B]'}`}>
                  {conv.lastMessage || 'No messages yet'}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
