import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { WorkspaceItem } from '../../types/dashboard';
import { Logo } from '../Logo';
import {
  LayoutDashboard,
  Inbox,
  Users,
  Bot,
  BookOpen,
  Globe,
  BarChart3,
  UserCheck,
  MessageSquare,
  Settings,
  CreditCard,
  ChevronsUpDown,
  LogOut,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  currentWorkspace: WorkspaceItem | null;
  onOpenWorkspaceModal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  currentWorkspace,
  onOpenWorkspaceModal,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const [unreadTeamCount, setUnreadTeamCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/team-chat/unread-count', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data.unreadCount === 'number') {
            setUnreadTeamCount(data.unreadCount);
          }
        }
      } catch (e) {
        // Silently ignore background polling errors
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentWorkspace?.id]);

  const mainNavItems = [
    { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Inbox', path: '/inbox', icon: Inbox, badge: '12' },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'AI Agents', path: '/ai-agents', icon: Bot },
    { label: 'Knowledge Base', path: '/knowledge-base', icon: BookOpen },
    { label: 'Channels', path: '/channels', icon: Globe },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const teamNavItems = [
    { label: 'Team Members', path: '/team-members', icon: UserCheck },
    {
      label: 'Team Chat',
      path: '/team-chat',
      icon: MessageSquare,
      badge: unreadTeamCount > 0 ? String(unreadTeamCount) : undefined,
    },
  ];

  const secondaryNavItems = [
    { label: 'Billing & Plan', path: '/billing', icon: CreditCard },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    if (onCloseMobile) onCloseMobile();
  };

  const isNavActive = (itemPath: string) => {
    if (itemPath === '/team-members') {
      return currentPath === '/team-members' || currentPath === '/team';
    }
    if (itemPath === '/billing' || itemPath === '/settings/billing') {
      return currentPath === '/billing' || currentPath === '/settings/billing';
    }
    return currentPath === itemPath;
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-[#E8E8E5] w-64 shrink-0">
      {/* Brand Header & Mobile Close */}
      <div>
        <div className="p-5 border-b border-[#E8E8E5] flex items-center justify-between">
          <Logo
            variant="full"
            size="md"
            onClick={() => handleNavClick('/dashboard')}
          />
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-gray-400 hover:text-[#171717] md:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Primary Nav List */}
        <nav className="p-3.5 space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF0E5] text-[#FF8A2A] font-bold'
                    : 'text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#171717]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF8A2A] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-3 border-t border-[#E8E8E5]" />

          {teamNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF0E5] text-[#FF8A2A] font-bold'
                    : 'text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#171717]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF8A2A] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-3 border-t border-[#E8E8E5]" />

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF0E5] text-[#FF8A2A] font-bold'
                    : 'text-[#6B6B6B] hover:bg-[#F7F7F5] hover:text-[#171717]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Workspace Switcher & User Profile */}
      <div className="p-3.5 border-t border-[#E8E8E5] space-y-2 bg-[#FAF9F6]">
        {/* Workspace Switcher */}
        <button
          onClick={onOpenWorkspaceModal}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E8E8E5] hover:border-gray-300 text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#FF8A2A] text-white font-bold text-xs flex items-center justify-center shrink-0">
              {currentWorkspace ? currentWorkspace.name.charAt(0).toUpperCase() : 'W'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#171717] truncate">
                {currentWorkspace?.name || 'My Workspace'}
              </p>
              <p className="text-[10px] text-[#6B6B6B] truncate font-mono">
                {currentWorkspace ? `/${currentWorkspace.slug}` : 'Default'}
              </p>
            </div>
          </div>
          <ChevronsUpDown className="w-4 h-4 text-gray-400 shrink-0" />
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-[#E8E8E5]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#171717] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#171717] truncate">{user?.name}</p>
              <p className="text-[10px] text-[#6B6B6B] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 z-30">{sidebarContent}</aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
