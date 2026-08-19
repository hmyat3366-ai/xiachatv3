import React from 'react';
import { Bot, BookOpen, UserPlus } from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (path: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const actions = [
    {
      title: 'New AI Agent',
      desc: 'Configure prompt instructions',
      icon: Bot,
      path: '/ai-agents',
    },
    {
      title: 'Add Knowledge',
      desc: 'Scrape URLs or upload PDFs',
      icon: BookOpen,
      path: '/knowledge-base',
    },
    {
      title: 'Invite Team Member',
      desc: 'Add human support agents',
      icon: UserPlus,
      path: '/team',
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-5 space-y-3 shadow-2xs">
      <h4 className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Quick Actions</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              onClick={() => onNavigate(action.path)}
              className="p-3.5 rounded-2xl border border-[#E8E8E5] hover:border-[#FF8A2A] hover:bg-[#FFF0E5]/30 text-left transition-all duration-150 cursor-pointer group flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-[#FFF0E5] text-gray-700 group-hover:text-[#FF8A2A] flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#171717] truncate">{action.title}</p>
                <p className="text-[10px] text-[#6B6B6B] truncate">{action.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
