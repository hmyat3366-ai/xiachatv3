import React from 'react';
import { Search, Plus, MessageSquare, Users } from 'lucide-react';

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
  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 border-r border-[#E8E8E5] bg-white flex flex-col h-full shrink-0">
      {/* Top Header & New Conversation Button */}
      <div className="p-4 border-b border-[#E8E8E5] space-y-3 bg-[#FAF9F6]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base text-[#171717]">Team Chat</h2>
            <p className="text-[11px] text-[#6B6B6B]">Internal team communication</p>
          </div>
          <button
            onClick={onOpenNewConversation}
            className="p-2 rounded-xl bg-[#FF8A2A] text-white hover:bg-[#e0771e] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs text-xs font-bold"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-[#E8E8E5] text-xs focus:outline-none focus:border-[#FF8A2A] bg-white"
          />
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
        {isLoading ? (
          // Skeleton Loader
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-gray-100 animate-pulse space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-24 h-3 bg-gray-200 rounded" />
                    <div className="w-36 h-2.5 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          // Empty State
          <div className="h-64 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-bold text-[#171717] mb-1">No conversations yet</h3>
            <p className="text-[11px] text-[#6B6B6B] mb-4">
              Start a conversation with someone on your team.
            </p>
            <button
              onClick={onOpenNewConversation}
              className="px-4 py-2 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold hover:bg-[#e0771e] transition-colors cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversationId === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-150 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#FFF0E5] border-[#FF8A2A]/40 shadow-xs'
                    : 'bg-white hover:bg-[#FAF9F6] border-transparent'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar / Icon */}
                  <div className="relative shrink-0">
                    {conv.type === 'group' ? (
                      <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#171717] text-white font-bold text-xs flex items-center justify-center">
                        {conv.otherUser?.avatar || conv.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Conversation Title & Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-bold text-[#171717] truncate">{conv.title}</p>
                      <span className="text-[10px] text-[#6B6B6B] shrink-0">
                        {formatTimeAgo(conv.lastMessageAt || conv.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-[#6B6B6B] truncate">
                        {conv.lastMessage || 'No messages yet'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF8A2A] text-white shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
