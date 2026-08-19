import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ConversationList, type TeamConversationItem } from '../components/teamChat/ConversationList';
import { ChatArea, type TeamMessageItem, type ConversationDetail } from '../components/teamChat/ChatArea';
import { NewConversationModal } from '../components/teamChat/NewConversationModal';
import type { WorkspaceItem } from '../types/dashboard';

interface TeamChatPageProps {
  onNavigate: (path: string) => void;
}

export const TeamChatPage: React.FC<TeamChatPageProps> = ({ onNavigate }) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceItem | null>(null);

  const [conversations, setConversations] = useState<TeamConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<TeamMessageItem[]>([]);

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Fetch workspace list & current workspace
  const fetchConversations = useCallback(async (wsId?: string | null) => {
    try {
      setIsLoadingConversations(true);
      let url = '/api/team-chat/conversations';
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching team conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initWorkspaceAndConvs = async () => {
      try {
        const res = await fetch('/api/dashboard/overview', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.workspaces) setWorkspaces(data.workspaces);
          if (data.workspace) {
            setCurrentWorkspace(data.workspace);
            fetchConversations(data.workspace.id);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching overview for workspace info:', err);
      }
      fetchConversations(null);
    };

    initWorkspaceAndConvs();
  }, [fetchConversations]);

  // Fetch messages when selectedConversationId changes
  const fetchMessages = useCallback(
    async (convId: string, wsId?: string | null) => {
      try {
        setIsLoadingMessages(true);
        let url = `/api/team-chat/conversations/${convId}/messages`;
        if (wsId) url += `?workspaceId=${wsId}`;

        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setActiveConversation(data.conversation || null);
          setMessages(data.messages || []);
          // Also update unread count locally for this conversation
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Error fetching conversation messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId, currentWorkspace?.id);
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [selectedConversationId, currentWorkspace?.id, fetchMessages]);

  const handleSelectConversation = (convId: string) => {
    setSelectedConversationId(convId);
    setMobileView('chat');
  };

  const handleStartConversation = async (params: { recipientUserId?: string; memberIds?: string[]; title?: string }) => {
    try {
      let url = '/api/team-chat/conversations';
      if (currentWorkspace?.id) url += `?workspaceId=${currentWorkspace.id}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchConversations(currentWorkspace?.id);
        if (data.conversationId) {
          setSelectedConversationId(data.conversationId);
          setMobileView('chat');
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error starting conversation:', err);
      return false;
    }
  };

  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (!selectedConversationId) return false;

    try {
      let url = `/api/team-chat/conversations/${selectedConversationId}/messages`;
      if (currentWorkspace?.id) url += `?workspaceId=${currentWorkspace.id}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          // Update last message in conversation list
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversationId
                ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
                : c
            )
          );
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    }
  };

  return (
    <DashboardLayout
      currentPath="/team-chat"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          setSelectedConversationId(null);
          fetchConversations(id);
        }
      }}
      onCreateWorkspace={async (name) => {
        const res = await fetch('/api/dashboard/workspaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentWorkspace(data.workspace);
          fetchConversations(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      <div className="bg-white border border-[#E8E8E5] rounded-2xl overflow-hidden shadow-xs h-[calc(100vh-140px)] min-h-[500px] flex flex-col md:flex-row">
        {/* Mobile View logic: show list on small screens if mobileView === 'list' */}
        <div className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} h-full shrink-0 w-full md:w-auto`}>
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onOpenNewConversation={() => setIsNewModalOpen(true)}
            isLoading={isLoadingConversations}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Mobile View logic: show chat on small screens if mobileView === 'chat' */}
        <div className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 h-full min-w-0`}>
          <ChatArea
            conversation={activeConversation}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            onSendMessage={handleSendMessage}
            onBackToConversations={() => setMobileView('list')}
            onRefreshMessages={() => {
              if (selectedConversationId) {
                fetchMessages(selectedConversationId, currentWorkspace?.id);
              }
            }}
          />
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        workspaceId={currentWorkspace?.id}
        onStartConversation={handleStartConversation}
      />
    </DashboardLayout>
  );
};
