import React from 'react';
import type { NeedsAttentionItem } from '../../types/dashboard';
import { AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';

interface NeedsAttentionProps {
  items: NeedsAttentionItem[];
  onNavigate: (path: string) => void;
}

export const NeedsAttention: React.FC<NeedsAttentionProps> = ({ items, onNavigate }) => {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-4 shadow-2xs">
      {/* Header & CTA */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#171717]">Needs Attention</h3>
            <p className="text-xs text-[#6B6B6B]">Conversations requiring human intervention</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/inbox')}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#FF8A2A] hover:text-[#D96512] transition-colors cursor-pointer group"
        >
          <span>Review Inbox</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 bg-[#FAF9F6] rounded-2xl">
            🎉 All caught up! No conversations require immediate attention.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onNavigate('/inbox')}
              className="p-3.5 rounded-2xl bg-[#FFF0E5]/30 border border-[#FF8A2A]/20 hover:border-[#FF8A2A] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {item.customerName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#171717]">{item.customerName}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {item.channel}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium mt-0.5">{item.reason}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
                <span className="text-[10px] text-[#6B6B6B] font-mono">{item.timeAgo}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#FF8A2A] group-hover:underline">
                  <UserCheck className="w-3.5 h-3.5" />
                  Take Over
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
