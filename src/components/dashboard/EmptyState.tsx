import React from 'react';
import { MessageSquare, Bot, BookOpen, Users, Plus } from 'lucide-react';

interface EmptyStateProps {
  workspaceName?: string;
  onNavigate: (path: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ workspaceName, onNavigate }) => {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6 shadow-2xs">
      <div className="w-16 h-16 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-xs">
        <MessageSquare className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#171717]">
          Welcome to {workspaceName || 'your new workspace'}!
        </h2>
        <p className="text-sm text-[#6B6B6B]">
          Connect your first customer communication channel to start receiving messages and let Xia AI assist your customers automatically.
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => onNavigate('/settings')}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Channel</span>
        </button>

        <button
          onClick={() => onNavigate('/knowledge-base')}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-[#171717] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4 text-gray-500" />
          <span>Add Knowledge Base</span>
        </button>
      </div>

      {/* Onboarding Checklist Guide */}
      <div className="pt-6 border-t border-[#E8E8E5] grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div
          onClick={() => onNavigate('/ai-agents')}
          className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] hover:border-[#FF8A2A] transition-colors cursor-pointer space-y-1"
        >
          <Bot className="w-5 h-5 text-[#FF8A2A]" />
          <h4 className="text-xs font-bold text-[#171717]">1. Create AI Agent</h4>
          <p className="text-[11px] text-[#6B6B6B]">Define guidelines & tone for automated answers</p>
        </div>

        <div
          onClick={() => onNavigate('/knowledge-base')}
          className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] hover:border-[#FF8A2A] transition-colors cursor-pointer space-y-1"
        >
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h4 className="text-xs font-bold text-[#171717]">2. Add Knowledge</h4>
          <p className="text-[11px] text-[#6B6B6B]">Upload docs or website links to train Xia AI</p>
        </div>

        <div
          onClick={() => onNavigate('/team')}
          className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] hover:border-[#FF8A2A] transition-colors cursor-pointer space-y-1"
        >
          <Users className="w-5 h-5 text-blue-600" />
          <h4 className="text-xs font-bold text-[#171717]">3. Invite Team</h4>
          <p className="text-[11px] text-[#6B6B6B]">Assign human support agents for handoffs</p>
        </div>
      </div>
    </div>
  );
};
