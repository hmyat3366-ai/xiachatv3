import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../dashboard/Sidebar';
import { TopHeader } from '../dashboard/TopHeader';
import { WorkspaceSwitcherModal } from '../dashboard/WorkspaceSwitcherModal';
import { ConversationListPanel } from './ConversationListPanel';
import { ChatThreadPanel } from './ChatThreadPanel';
import { CustomerDetailsPanel } from './CustomerDetailsPanel';
import type { ConversationItem, MessageItem, CustomerProfile, FilterState, TeamMember, InboxStats } from '../../types/inbox';
import type { WorkspaceItem } from '../../types/dashboard';
import { apiFetch } from '../../utils/api';
import { useSSE } from '../../utils/useSSE';

interface InboxLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const InboxLayout: React.FC<InboxLayoutProps> = ({ currentPath, onNavigate }) => {
  // Mobile navigation & workspace modal state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // Responsive panel state
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'thread' | 'customer'>('list');

  // Workspaces & active workspace selection
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceItem | null>(null);

  // Conversations Data State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<InboxStats>({ total: 0, open: 0, assigned: 0, ai: 0, resolved: 0 });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    tab: 'all',
    aiOnly: false,
    unread: false,
  });

  // Active Thread Data State
  const [activeMessages, setActiveMessages] = useState<MessageItem[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<CustomerProfile | null>(null);

  // Loading & Error states
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Fetch Conversations List
  const fetchConversations = useCallback(async (wsId?: string | null, f?: FilterState, silent: boolean = false) => {
    try {
      if (!silent) setIsLoadingList(true);
      const activeFilters = f || filters;

      let url = `/api/inbox/conversations?tab=${activeFilters.tab}&search=${encodeURIComponent(activeFilters.search)}`;
      if (wsId) url += `&workspaceId=${wsId}`;
      if (activeFilters.channel) url += `&channel=${encodeURIComponent(activeFilters.channel)}`;
      if (activeFilters.status) url += `&status=${encodeURIComponent(activeFilters.status)}`;
      if (activeFilters.assignee) url += `&assignee=${encodeURIComponent(activeFilters.assignee)}`;
      if (activeFilters.aiOnly) url += `&aiOnly=true`;
      if (activeFilters.unread) url += `&unread=true`;

      const res = await apiFetch(url, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to fetch conversations');

      const data = await res.json();
      setConversations(data.conversations || []);
      setStats(data.stats || { total: 0, open: 0, assigned: 0, ai: 0, resolved: 0 });
      setTeamMembers(data.teamMembers || []);

      if (data.workspace && !currentWorkspace) {
        setCurrentWorkspace(data.workspace);
      }
      if (data.workspaces) {
        setWorkspaces(data.workspaces);
      }

      // Auto-select first conversation if none selected
      if (!selectedId && data.conversations && data.conversations.length > 0) {
        setSelectedId(data.conversations[0].id);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      if (!silent) setIsLoadingList(false);
    }
  }, [filters, currentWorkspace, selectedId]);

  // Fetch Thread Messages for selected conversation
  const fetchThreadMessages = useCallback(async (convId: string, wsId?: string | null, silent: boolean = false) => {
    try {
      if (!silent) setIsLoadingThread(true);
      let url = `/api/inbox/conversations/${convId}/messages`;
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to fetch messages');

      const data = await res.json();
      setActiveMessages(data.messages || []);
      setActiveCustomer(data.customer || null);

      // Update unread count locally for selected conversation item
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Error loading thread messages:', err);
    } finally {
      if (!silent) setIsLoadingThread(false);
    }
  }, []);

  // Initial load & trigger on filters / workspace change
  useEffect(() => {
    fetchConversations(currentWorkspace?.id, filters);
  }, [fetchConversations, currentWorkspace?.id, filters]);

  useEffect(() => {
    if (selectedId) {
      fetchThreadMessages(selectedId, currentWorkspace?.id);
    }
  }, [selectedId, fetchThreadMessages, currentWorkspace?.id]);

  // Auto-sync polling backup (guarantees conversations & messages stay 100% updated without page refresh)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    const pollInterval = setInterval(() => {
      fetchConversations(currentWorkspace.id, filters, true);
      if (selectedId) {
        fetchThreadMessages(selectedId, currentWorkspace.id, true);
      }
    }, 2500);
    return () => clearInterval(pollInterval);
  }, [currentWorkspace?.id, selectedId, filters, fetchConversations, fetchThreadMessages]);

  // Server-Sent Events (SSE) Real-Time Stream — using useSSE hook with auto-reconnect
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const sseUrl = currentWorkspace?.id
    ? `${API_BASE}/api/inbox/events?workspaceId=${currentWorkspace.id}`
    : null;

  const sseStatus = useSSE(sseUrl, {
    enabled: !!currentWorkspace?.id,
    onEvent: (event) => {
      if (event.type === 'new_message') {
        const { conversationId, message } = event.payload as { conversationId: string; message: MessageItem };
        if (conversationId === selectedId) {
          setActiveMessages((prev) => [...prev, message]);
        }
        fetchConversations(currentWorkspace?.id, filters);
      } else if (event.type === 'status_change' || event.type === 'assignment_update') {
        const { conversationId, systemMessage } = event.payload as { conversationId: string; systemMessage?: MessageItem };
        if (conversationId === selectedId && systemMessage) {
          setActiveMessages((prev) => [...prev, systemMessage]);
        }
        fetchConversations(currentWorkspace?.id, filters);
      }
    },
  });

  // Handle Workspace Switch
  const handleSelectWorkspace = (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      setSelectedId(null);
      fetchConversations(workspaceId, filters);
    }
  };

  const handleCreateWorkspace = async (name: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/dashboard/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const resData = await res.json();
        setCurrentWorkspace(resData.workspace);
        fetchConversations(resData.workspace.id, filters);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Actions on Active Conversation
  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileView('thread');
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleSendMessage = async (content: string, isInternalNote: boolean, attachments?: string[]) => {
    if (!selectedId) return;
    const res = await apiFetch(`/api/inbox/conversations/${selectedId}/messages?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, isInternalNote, attachments }),
    });
    if (res.ok) {
      const data = await res.json();
      setActiveMessages((prev) => [...prev, data.message]);
      fetchConversations(currentWorkspace?.id, filters);
    }
  };

  const handleTakeover = async () => {
    if (!selectedId) return;
    const res = await apiFetch(`/api/inbox/conversations/${selectedId}/takeover?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, status: (data.status || 'HUMAN_HANDLING') as any, assignee: data.assignee, mode: 'human_handling' }
            : c
        )
      );
      if (data.systemMessage) {
        setActiveMessages((prev) => [...prev, data.systemMessage]);
      }
    }
  };

  const handleReturnToAI = async () => {
    if (!selectedId) return;
    const res = await apiFetch(`/api/inbox/conversations/${selectedId}/return-to-ai?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, status: (data.status || 'AI_HANDLING') as any, assignee: 'Xia AI', mode: 'ai_autonomous' }
            : c
        )
      );
      if (data.systemMessage) {
        setActiveMessages((prev) => [...prev, data.systemMessage]);
      }
    }
  };

  const handleAssign = async (assignee: string) => {
    if (!selectedId) return;
    const res = await apiFetch(`/api/inbox/conversations/${selectedId}/assign?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee }),
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, assignee: data.assignee } : c))
      );
      if (data.systemMessage) {
        setActiveMessages((prev) => [...prev, data.systemMessage]);
      }
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedId) return;
    const res = await apiFetch(`/api/inbox/conversations/${selectedId}/status?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, status: data.status as any } : c))
      );
      if (data.systemMessage) {
        setActiveMessages((prev) => [...prev, data.systemMessage]);
      }
    }
  };

  const handleUpdateTags = async (tags: string[]) => {
    if (!selectedId || !activeCustomer) return;
    setActiveCustomer({ ...activeCustomer, tags });
    await apiFetch(`/api/inbox/conversations/${selectedId}/customer-details?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!selectedId || !activeCustomer) return;
    setActiveCustomer({ ...activeCustomer, notes });
    await apiFetch(`/api/inbox/conversations/${selectedId}/customer-details?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  };

  const handleGenerateAIDraft = async () => {
    if (!selectedId) return;
    const res = await apiFetch(`/api/inbox/conversations/${selectedId}/generate-ai-draft?workspaceId=${currentWorkspace?.id || ''}`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, draftMessage: data.draftMessage } : c))
      );
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null;

  return (
    <div className="h-screen bg-[#F7F7F5] text-[#171717] flex flex-col overflow-hidden font-sans selection:bg-[#FFF0E5] selection:text-[#D96512]">
      {/* Top Header */}
      <TopHeader
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        currentWorkspace={currentWorkspace}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          currentWorkspace={currentWorkspace}
          onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* 3-Panel Desktop Layout / Mobile Responsive Switcher */}
        <div className="flex-1 flex overflow-hidden min-w-0 min-h-0">
          {/* Panel 1: Conversation List */}
          <div className={`${mobileView === 'list' ? 'flex' : 'hidden md:flex'} flex-col h-full shrink-0 min-h-0 overflow-hidden`}>
            <ConversationListPanel
              conversations={conversations}
              selectedId={selectedId}
              onSelectConversation={handleSelectConversation}
              filters={filters}
              onFilterChange={handleFilterChange}
              stats={stats}
              isLoading={isLoadingList}
              sseStatus={sseStatus}
            />
          </div>

          {/* Panel 2: Chat Thread */}
          <div className={`${mobileView === 'thread' ? 'flex' : 'hidden md:flex'} flex-col flex-1 h-full min-w-0 min-h-0 overflow-hidden relative`}>
            {/* Mobile Back Button to list */}
            <div className="md:hidden p-2 bg-white border-b border-[#E8E8E5] flex items-center justify-between shrink-0 z-10">
              <button
                onClick={() => setMobileView('list')}
                className="text-xs font-bold text-[#FF8A2A] hover:underline"
              >
                ← Back to Conversations
              </button>
              {isCustomerPanelOpen && (
                <button
                  onClick={() => setMobileView('customer')}
                  className="text-xs font-bold text-gray-600"
                >
                  Customer Info →
                </button>
              )}
            </div>

            <ChatThreadPanel
              conversation={selectedConversation}
              messages={activeMessages}
              teamMembers={teamMembers}
              onSendMessage={handleSendMessage}
              onTakeover={handleTakeover}
              onReturnToAI={handleReturnToAI}
              onAssign={handleAssign}
              onStatusChange={handleStatusChange}
              onGenerateAIDraft={handleGenerateAIDraft}
              isCustomerPanelOpen={isCustomerPanelOpen}
              onToggleCustomerPanel={() => setIsCustomerPanelOpen(!isCustomerPanelOpen)}
              isLoading={isLoadingThread}
            />
          </div>

          {/* Panel 3: Customer Details Panel */}
          {isCustomerPanelOpen && (
            <div className={`${mobileView === 'customer' ? 'flex' : 'hidden lg:flex'} flex-col h-full shrink-0 min-h-0 overflow-hidden`}>
              {mobileView === 'customer' && (
                <div className="lg:hidden p-2 bg-white border-b border-[#E8E8E5] shrink-0">
                  <button
                    onClick={() => setMobileView('thread')}
                    className="text-xs font-bold text-[#FF8A2A]"
                  >
                    ← Back to Thread
                  </button>
                </div>
              )}
              <CustomerDetailsPanel
                customer={activeCustomer}
                conversation={selectedConversation}
                messages={activeMessages}
                onUpdateTags={handleUpdateTags}
                onUpdateNotes={handleUpdateNotes}
                onClose={() => setMobileView('thread')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Workspace Switcher Modal */}
      <WorkspaceSwitcherModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspace={handleCreateWorkspace}
      />
    </div>
  );
};
