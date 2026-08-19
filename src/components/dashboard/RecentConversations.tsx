import React from 'react';
import type { RecentConversationItem } from '../../types/dashboard';
import { MessageSquare, ArrowRight, Globe, MessageCircle } from 'lucide-react';

interface RecentConversationsProps {
  conversations: RecentConversationItem[];
  onNavigate: (path: string) => void;
}

export const RecentConversations: React.FC<RecentConversationsProps> = ({
  conversations,
  onNavigate,
}) => {
  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'facebook':
        return (
          <svg className="w-3.5 h-3.5 text-blue-600 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg className="w-3.5 h-3.5 text-pink-600 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        );
      case 'whatsapp':
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: 'AI' | 'Human' | 'Resolved') => {
    switch (status) {
      case 'AI':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FFF0E5] text-[#FF8A2A]">
            AI
          </span>
        );
      case 'Human':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            Human
          </span>
        );
      case 'Resolved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Resolved
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-4 shadow-2xs">
      {/* Header & CTA */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gray-100 text-[#171717] flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#171717]">Recent Conversations</h3>
            <p className="text-xs text-[#6B6B6B]">Latest incoming customer messages across channels</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/inbox')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF8A2A] hover:text-[#D96512] transition-colors cursor-pointer group"
        >
          <span>View all conversations</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E8E8E5] text-[#6B6B6B] uppercase tracking-wider font-semibold">
              <th className="pb-3 pl-2">Customer</th>
              <th className="pb-3">Message</th>
              <th className="pb-3">Channel</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Assignee</th>
              <th className="pb-3 text-right pr-2">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E8E5]/60">
            {conversations.map((item) => (
              <tr
                key={item.id}
                onClick={() => onNavigate('/inbox')}
                className="hover:bg-[#FAF9F6] transition-colors cursor-pointer group"
              >
                <td className="py-3.5 pl-2 font-bold text-[#171717]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#171717] text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {item.customerName.charAt(0)}
                    </div>
                    <span className="truncate max-w-[130px]">{item.customerName}</span>
                  </div>
                </td>
                <td className="py-3.5 text-[#171717] max-w-xs truncate pr-4">
                  "{item.message}"
                </td>
                <td className="py-3.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 font-medium text-[11px]">
                    {getChannelIcon(item.channel)}
                    <span>{item.channel}</span>
                  </span>
                </td>
                <td className="py-3.5">{getStatusBadge(item.status)}</td>
                <td className="py-3.5 font-medium text-[#6B6B6B]">{item.assignee}</td>
                <td className="py-3.5 text-right pr-2 text-[#6B6B6B] font-mono">{item.timeAgo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-3">
        {conversations.map((item) => (
          <div
            key={item.id}
            onClick={() => onNavigate('/inbox')}
            className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#171717] text-white font-bold flex items-center justify-center text-xs">
                  {item.customerName.charAt(0)}
                </div>
                <span className="font-bold text-sm text-[#171717]">{item.customerName}</span>
              </div>
              {getStatusBadge(item.status)}
            </div>

            <p className="text-xs text-[#171717] line-clamp-2">"{item.message}"</p>

            <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] pt-1 border-t border-gray-200">
              <span className="inline-flex items-center gap-1">
                {getChannelIcon(item.channel)}
                <span>{item.channel}</span>
              </span>
              <span>{item.timeAgo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
