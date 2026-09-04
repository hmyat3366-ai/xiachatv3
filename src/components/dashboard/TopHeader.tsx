import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { WorkspaceItem } from '../../types/dashboard';
import { Logo } from '../Logo';
import {
  Search,
  Bell,
  HelpCircle,
  Menu,
  Building2,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';

interface TopHeaderProps {
  onToggleMobileSidebar: () => void;
  currentWorkspace: WorkspaceItem | null;
  onOpenWorkspaceModal: () => void;
  onSearch?: (query: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobileSidebar,
  currentWorkspace,
  onOpenWorkspaceModal,
  onSearch,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const notifications = [
    { id: '1', title: 'Human handoff requested', desc: 'Michael Chen requested human agent on Facebook', time: '8m ago', unread: true },
    { id: '2', title: 'Knowledge Base Synced', desc: 'Website documentation scraped successfully (48 pages)', time: '2h ago', unread: false },
    { id: '3', title: 'AI Assistant Active', desc: 'Xia AI resolution rate reached 78% this week', time: '1d ago', unread: false },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <>
      <header className="bg-white border-b border-[#E8E8E5] px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-20">
        {/* Left: Mobile Menu Toggle & Workspace Switcher Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 text-gray-500 hover:text-[#171717] hover:bg-[#FAF9F6] rounded-xl md:hidden cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenWorkspaceModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E8E8E5] hover:border-gray-300 bg-[#FAF9F6] text-xs font-semibold text-[#171717] transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#FF8A2A]" />
            <span className="truncate max-w-[120px] sm:max-w-[160px]">
              {currentWorkspace?.name || 'Workspace'}
            </span>
          </button>
        </div>

        {/* Center: Search Input */}
        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search conversations, customers, knowledge..."
              className="w-full pl-9 pr-4 py-1.5 rounded-full border border-[#E8E8E5] text-xs font-medium bg-[#FAF9F6] focus:bg-white focus:outline-none focus:border-[#FF8A2A] transition-all"
            />
          </div>
        </div>

        {/* Right Action Icons & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-gray-500 hover:text-[#171717] hover:bg-[#F7F7F5] rounded-full relative cursor-pointer transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF8A2A]" />
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E8E8E5] shadow-lg p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5]">
                  <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FFF0E5] text-[#FF8A2A]">
                    1 Unread
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                        n.unread ? 'bg-[#FFF0E5]/40 border-[#FF8A2A]/30' : 'bg-[#FAF9F6] border-[#E8E8E5]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#171717]">{n.title}</span>
                        <span className="text-[10px] text-[#6B6B6B]">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-[#6B6B6B] leading-tight">{n.desc}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-full text-center text-xs font-semibold text-[#FF8A2A] hover:underline pt-1 cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-gray-500 hover:text-[#171717] hover:bg-[#F7F7F5] rounded-full cursor-pointer transition-colors"
            title="Help & Documentation"
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* User Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#FF8A2A] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
              <div className="flex items-center gap-2">
                <Logo variant="full" size="sm" />
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-gray-400 hover:text-[#171717] rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#6B6B6B]">
              <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
                <p className="font-bold text-[#171717] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Documentation & Guides
                </p>
                <p>Learn how to connect WhatsApp, Facebook, Instagram, and Custom Web widgets.</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
                <p className="font-bold text-[#171717] flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-[#FF8A2A]" />
                  24/7 AI Support Assistant
                </p>
                <p>Questions about knowledge base vectors or AI confidence threshold configuration?</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#171717] text-white text-xs font-bold hover:bg-black transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
