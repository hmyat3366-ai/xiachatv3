import React, { useState } from 'react';
import type { ConversationItem, FilterState, InboxStats } from '../../types/inbox';
import type { SSEStatus } from '../../utils/useSSE';
import {
  Search,
  SlidersHorizontal,
  MessageSquare,
  Bot,
  UserCheck,
  CheckCircle2,
  X,
  Clock,
  AlertTriangle,
  Globe,
  Share2,
  Send,
  Mail,
  Flame,
  Check,
  RotateCcw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationListPanelProps {
  conversations: ConversationItem[];
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  stats: InboxStats;
  isLoading: boolean;
  /** SSE realtime connection status — for live indicator badge */
  sseStatus?: SSEStatus;
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
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

// Channel Icon with distinct brand badge helper
function renderChannelBadge(channel: string) {
  const ch = (channel || '').toLowerCase();
  if (ch.includes('whatsapp')) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
      </span>
    );
  }
  if (ch.includes('facebook') || ch.includes('messenger')) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <Send className="w-2.5 h-2.5" /> Messenger
      </span>
    );
  }
  if (ch.includes('instagram')) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
        <Share2 className="w-2.5 h-2.5" /> Instagram
      </span>
    );
  }
  if (ch.includes('email')) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
        <Mail className="w-2.5 h-2.5" /> Email
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
      <Globe className="w-2.5 h-2.5" /> Live Chat
    </span>
  );
}

// Status badge component with distinct colors & indicators
function renderStatusBadge(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'ai':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0E5] text-[#FF8A2A] text-[10px] font-extrabold border border-[#FF8A2A]/20">
          <Bot className="w-3 h-3" /> AI
        </span>
      );
    case 'human':
    case 'assigned':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
          <UserCheck className="w-3 h-3" /> Assigned
        </span>
      );
    case 'waiting':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-extrabold border border-amber-200">
          <Clock className="w-3 h-3" /> Waiting
        </span>
      );
    case 'resolved':
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
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
  sseStatus = 'disconnected',
}) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const tabs: Array<{ id: FilterState['tab']; label: string; count: number }> = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'open', label: 'Open', count: stats.open },
    { id: 'assigned', label: 'Assigned', count: stats.assigned },
    { id: 'ai', label: 'AI Handling', count: stats.ai },
    { id: 'resolved', label: 'Resolved', count: stats.resolved },
  ];

  const channelPills = [
    { id: undefined, label: 'All Channels' },
    { id: 'Website', label: 'Web' },
    { id: 'WhatsApp', label: 'WhatsApp' },
    { id: 'Facebook', label: 'Messenger' },
    { id: 'Instagram', label: 'Instagram' },
  ];

  const activeFilterCount =
    (filters.channel ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.assignee ? 1 : 0) +
    (filters.aiOnly ? 1 : 0) +
    (filters.unread ? 1 : 0);

  return (
    <div className="w-full md:w-[350px] lg:w-[380px] shrink-0 border-r border-[#E8E8E5] bg-white flex flex-col h-full z-10 select-none">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & SEARCH BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-[#E8E8E5] space-y-3 bg-[#FAF9F6]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-black text-base text-[#171717] tracking-tight">Unified Inbox</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#FFF0E5] text-[#D96512] text-[11px] font-black">
              {stats.total}
            </span>
            {/* SSE Realtime Connection Status Indicator */}
            <span
              title={
                sseStatus === 'connected'
                  ? 'Live — Realtime updates active'
                  : sseStatus === 'connecting'
                  ? 'Connecting to realtime...'
                  : 'Disconnected — Reconnecting...'
              }
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                sseStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : sseStatus === 'connecting'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              {sseStatus === 'connected' ? (
                <><Wifi className="w-2.5 h-2.5" /> Live</>
              ) : sseStatus === 'connecting' ? (
                <><span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Connecting…</>
              ) : (
                <><WifiOff className="w-2.5 h-2.5" /> Offline</>
              )}
            </span>
          </div>

          <button
            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeFilterCount > 0
                ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#D96512] ring-2 ring-[#FF8A2A]/20'
                : 'bg-white border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] hover:border-gray-300'
            }`}
            title="Filter conversations"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FF8A2A] text-white text-[9px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Input Field */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer, email, tags..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="w-full pl-10 pr-8 py-2 rounded-xl text-xs font-medium bg-white border border-[#E8E8E5] text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/20 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Channel Pills Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {channelPills.map((cp) => {
            const isSelected = filters.channel === cp.id;
            return (
              <button
                key={cp.label}
                onClick={() => onFilterChange({ channel: cp.id })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'bg-white border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] hover:bg-gray-50'
                }`}
              >
                {cp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. STATUS TABS (ALL / OPEN / ASSIGNED / AI / RESOLVED)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center border-b border-[#E8E8E5] px-2 bg-white overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = filters.tab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange({ tab: tab.id })}
              className={`px-3 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-[#FF8A2A] text-[#FF8A2A]'
                  : 'border-transparent text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-[#FFF0E5] text-[#D96512]' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ADVANCED FILTER MODAL / POPOVER
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[#E8E8E5] bg-[#FAF9F6] p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#171717]">
              <span>Advanced Filters</span>
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
                className="text-[11px] text-[#FF8A2A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset All
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E8E8E5] cursor-pointer hover:border-gray-300">
                <input
                  type="checkbox"
                  checked={filters.aiOnly}
                  onChange={(e) => onFilterChange({ aiOnly: e.target.checked })}
                  className="rounded text-[#FF8A2A] focus:ring-[#FF8A2A]"
                />
                <span className="font-semibold text-[#171717]">AI Handled Only</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-[#E8E8E5] cursor-pointer hover:border-gray-300">
                <input
                  type="checkbox"
                  checked={filters.unread}
                  onChange={(e) => onFilterChange({ unread: e.target.checked })}
                  className="rounded text-[#FF8A2A] focus:ring-[#FF8A2A]"
                />
                <span className="font-semibold text-[#171717]">Unread Only</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          4. CONVERSATION LIST ITEMS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E8E5]/70">
        {isLoading ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-[#FF8A2A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#6B6B6B] font-medium">Syncing conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-2xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#171717]">No conversations found</h3>
            <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto">
              {filters.search || activeFilterCount > 0
                ? 'Try adjusting your search terms or filters.'
                : 'When customers message via Website, WhatsApp, or Messenger, they will appear here.'}
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = selectedId === conv.id;
            const hasUnread = conv.unreadCount > 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3.5 transition-all duration-150 relative cursor-pointer block border-l-4 ${
                  isSelected
                    ? 'bg-[#FFF5ED]/80 border-l-[#FF8A2A] shadow-2xs'
                    : 'hover:bg-[#FAF9F6] border-l-transparent'
                }`}
              >
                {/* Needs Attention Alert Bar */}
                {conv.needsAttention && (
                  <div className="mb-2 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-600 animate-pulse shrink-0" />
                    <span className="truncate">{conv.attentionReason || 'Needs immediate agent response'}</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-1.5">
                  {/* Customer Info & Avatar */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                        isSelected
                          ? 'bg-[#171717] text-white'
                          : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#171717]'
                      }`}
                    >
                      {conv.customerName ? conv.customerName.charAt(0).toUpperCase() : 'C'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${hasUnread ? 'text-black' : 'text-[#171717]'}`}>
                          {conv.customerName}
                        </span>
                        {hasUnread && (
                          <span className="w-2 h-2 rounded-full bg-[#FF8A2A] animate-ping" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {conv.customerEmail || conv.customerPhone || 'Direct visitor'}
                      </p>
                    </div>
                  </div>

                  {/* Timestamp & Unread Badge */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {formatRelativeTime(conv.updatedAt || conv.createdAt)}
                    </span>
                    {hasUnread && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#FF8A2A] text-white text-[9px] font-black">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Preview */}
                <p className={`text-xs line-clamp-2 leading-snug mb-2.5 ${
                  hasUnread ? 'font-semibold text-[#171717]' : 'font-normal text-[#6B6B6B]'
                }`}>
                  {conv.lastMessage || 'No messages yet'}
                </p>

                {/* Footer Badges: Channel & Status & Tags */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {renderChannelBadge(conv.channel)}
                    {renderStatusBadge(conv.status)}
                  </div>

                  {conv.sentiment === 'positive' && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                      😊 Positive
                    </span>
                  )}
                  {conv.sentiment === 'urgent' && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> Urgent
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
