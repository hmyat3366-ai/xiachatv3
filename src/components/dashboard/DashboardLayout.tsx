import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { WorkspaceSwitcherModal } from './WorkspaceSwitcherModal';
import type { WorkspaceItem } from '../../types/dashboard';

interface DashboardLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  workspaces: WorkspaceItem[];
  currentWorkspace: WorkspaceItem | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => Promise<boolean>;
  onSearch?: (query: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPath,
  onNavigate,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
  onSearch,
  children,
}) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#171717] flex flex-col md:flex-row font-sans selection:bg-[#FFF0E5] selection:text-[#D96512]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        currentWorkspace={currentWorkspace}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top App Header */}
        <TopHeader
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          currentWorkspace={currentWorkspace}
          onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
          onSearch={onSearch}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Workspace Switcher Modal */}
      <WorkspaceSwitcherModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={onCreateWorkspace}
      />
    </div>
  );
};
