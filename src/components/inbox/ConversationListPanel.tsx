import React, { useState } from 'react';
import type { ConversationItem, FilterState, InboxStats } from '../../types/inbox';
import {
  Search,
  SlidersHorizontal,
  MessageSquare,
  Bot,
  UserCheck,
  CheckCircle2,
  X,
  Clock,
} from 'lucide-react';

interface ConversationListPanelProps {
  conversations: ConversationItem[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  stats: InboxStats;
  isLoading: boolean;
}

// Format relative time helper
function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}

// Channel Icon helper
function renderChannelIcon(channel: string) {
  const ch = channel.toLowerCase();
  if (ch.includes('whatsapp')) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">WhatsApp</span>;
  }
  if (ch.includes('facebook')) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">FB</span>;
  }
  if (ch.includes('instagram')) {
    return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-100 text-pink-800">IG</span>;
  }
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">Web</span>;
}

// Status badge component with distinct colors & indicators
function renderStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'ai':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0E5] text-[#FF8A2A] text-[10px] font-bold">
          <Bot className="w-3 h-3" /> AI Handling
        </span>
      );
    case 'human':
    case 'assigned':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
          <UserCheck className="w-3 h-3" /> Assigned
        </span>
      );
    case 'waiting':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
          <Clock className="w-3 h-3" /> Waiting
        </span>
      );
    case 'resolved':
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3" /> Resolved
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
          <MessageSquare className="w-3 h-3" /> Open
        </span>
      );
  }
}

export const ConversationListPanel: React.FC<ConversationListPanelProps> = ({
  conversations,
  selectedId,
  onSelectConversation,
  filters,
  onFilterChange,
  stats,
  isLoading,
}) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const tabs: Array<{ id: FilterState['tab']; label: string; count: number }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'open', label: 'Open', count: stats.open },
    { id: 'assigned', label: 'Assigned', count: stats.assigned },
    { id: 'ai', label: 'AI', count: stats.ai },
    { id: 'resolved', label: 'Resolved', count: stats.resolved },
  ];

  const activeFilterCount =
    (filters.channel ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.assignee ? 1 : 0) +
    (filters.aiOnly ? 1 : 0) +
    (filters.unread ? 1 : 0);

  return (
    <div className="w-full md:w-[340px] lg:w-[380px] shrink-0 border-r border-[#E8E8E5] bg-white flex flex-col h-full z-10">
      {/* Header & Search Bar */}
      <div className="p-3.5 border-b border-[#E8E8E5] space-y-3 bg-[#FAF9F6]/50">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-base text-[#171717] tracking-tight">Conversations</h2>
          <button
            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              activeFilterCount > 0
                ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#FF8A2A]'
                : 'bg-white border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717]'
            }`}
            title="Filter conversations"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FF8A2A] text-white text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, msg..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-9 pr-8 py-2 bg-white border border-[#E8E8E5] rounded-xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map((tab) => {
            const isActive = filters.tab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange({ tab: tab.id })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#E8E8E5]/50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-[#FF8A2A] text-white font-extrabold' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Filter Modal / Popover */}
      {isFilterModalOpen && (
        <div className="p-4 bg-white border-b border-[#E8E8E5] shadow-md space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#171717]">Advanced Filters</span>
            <button
              onClick={() =>
                onFilterChange({
                  channel: undefined,
                  status: undefined,
                  assignee: undefined,
                  aiOnly: false,
                  unread: false,
                })
              }
              className="text-[11px] font-semibold text-[#FF8A2A] hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Channel filter */}
            <div>
              <label className="block text-[10px] font-semibold text-[#6B6B6B] mb-1">Channel</label>
              <select
                value={filters.channel || ''}
                onChange={(e) => onFilterChange({ channel: e.target.value || undefined })}
                className="w-full p-1.5 rounded-lg border border-[#E8E8E5] bg-[#FAF9F6] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              >
                <option value="">All Channels</option>
                <option value="Website">Website</option>
                <option value="Facebook">Facebook</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>

            {/* Assignee filter */}
            <div>
              <label className="block text-[10px] font-semibold text-[#6B6B6B] mb-1">Assigned To</label>
              <select
                value={filters.assignee || ''}
                onChange={(e) => onFilterChange({ assignee: e.target.value || undefined })}
                className="w-full p-1.5 rounded-lg border border-[#E8E8E5] bg-[#FAF9F6] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              >
                <option value="">Anyone</option>
                <option value="me">Me</option>
                <option value="ai">Xia AI</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center gap-4 text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#171717]">
              <input
                type="checkbox"
                checked={filters.unread}
                onChange={(e) => onFilterChange({ unread: e.target.checked })}
                className="accent-[#FF8A2A] rounded cursor-pointer"
              />
              Unread only
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#171717]">
              <input
                type="checkbox"
                checked={filters.aiOnly}
                onChange={(e) => onFilterChange({ aiOnly: e.target.checked })}
                className="accent-[#FF8A2A] rounded cursor-pointer"
              />
              AI Active only
            </label>
          </div>
        </div>
      )}

      {/* Conversation Cards List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E5]/60">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center space-y-3 my-auto">
            <div className="w-12 h-12 rounded-full bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#171717]">No conversations found</h3>
            <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto">
              {filters.search || activeFilterCount > 0
                ? 'Try broadening your search or resetting active filters.'
                : 'Connect your website widget or WhatsApp channel to receive customer messages.'}
            </p>
          </div>
        ) : (
          conversations.map((item) => {
            const isSelected = item.id === selectedId;

            return (
              <div
                key={item.id}
                onClick={() => onSelectConversation(item.id)}
                className={`p-3.5 cursor-pointer transition-all duration-150 relative ${
                  isSelected
                    ? 'bg-[#FFF0E5]/60 border-l-4 border-[#FF8A2A]'
                    : 'hover:bg-[#FAF9F6] border-l-4 border-transparent'
                }`}
              >
                {/* Top row: Customer Name + Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-xs text-[#171717] truncate">{item.customerName}</span>
                    {renderChannelIcon(item.channel)}
                  </div>
                  <span className="text-[10px] font-medium text-[#6B6B6B] shrink-0">
                    {formatRelativeTime(item.updatedAt || item.createdAt)}
                  </span>
                </div>

                {/* Second row: Last Message preview */}
                <p className={`text-xs line-clamp-2 mb-2 ${item.unreadCount > 0 ? 'font-semibold text-[#171717]' : 'text-[#6B6B6B]'}`}>
                  {item.lastMessage}
                </p>

                {/* Bottom row: Status badge + Assignee + Unread Count */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(item.status)}
                    <span className="text-[10px] font-medium text-[#6B6B6B] truncate max-w-[100px]">
                      {item.assignee}
                    </span>
                  </div>

                  {item.unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FF8A2A] text-white font-extrabold text-[10px] animate-pulse">
                      {item.unreadCount} new
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
