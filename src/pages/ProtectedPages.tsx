import React from 'react';
import { InboxLayout } from '../components/inbox/InboxLayout';
import { apiFetch } from '../utils/api';


// 1. Unified Inbox
export const InboxPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <InboxLayout currentPath="/inbox" onNavigate={onNavigate} />
);


import { KnowledgeList } from '../components/knowledge/KnowledgeList';
import { AddKnowledgeWizard } from '../components/knowledge/AddKnowledgeWizard';
import { KnowledgeDetailView } from '../components/knowledge/KnowledgeDetailView';
import { SemanticSearchDebugTool } from '../components/knowledge/SemanticSearchDebugTool';
import { DeleteKnowledgeModal } from '../components/knowledge/DeleteKnowledgeModal';
import type { KnowledgeSource, KnowledgeChunkItem, FaqPair } from '../types/knowledge';

// 2. Knowledge Base SaaS Module Page
export const KnowledgeBasePage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = React.useState<'list' | 'new' | 'detail'>('list');
  const [selectedSourceId, setSelectedSourceId] = React.useState<string | null>(null);

  // Workspaces state
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  // Sources state
  const [sources, setSources] = React.useState<KnowledgeSource[]>([]);
  const [stats, setStats] = React.useState({ total: 0, ready: 0, processing: 0, totalChunks: 0 });
  const [selectedSource, setSelectedSource] = React.useState<KnowledgeSource | null>(null);
  const [chunks, setChunks] = React.useState<KnowledgeChunkItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  // Modal & RAG Debug tool states
  const [sourceToDelete, setSourceToDelete] = React.useState<KnowledgeSource | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [isRAGDebugOpen, setIsRAGDebugOpen] = React.useState<boolean>(false);

  // Fetch sources list
  const fetchSources = React.useCallback(async (wsId?: string | null) => {
    try {
      let url = '/api/knowledge-base';
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
        setStats(data.stats || { total: 0, ready: 0, processing: 0, totalChunks: 0 });
        setCurrentWorkspace((prev) => prev || data.workspace || null);
        if (data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      }
    } catch (err) {
      console.error('Error loading knowledge sources:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch single source detail & chunks
  const fetchSourceDetail = React.useCallback(async (sourceId: string, wsId?: string | null) => {
    try {
      setIsLoading(true);
      let url = `/api/knowledge-base/${sourceId}`;
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setSelectedSource(data.source || null);
        setChunks(data.chunks || []);
      }
    } catch (err) {
      console.error('Error loading source details:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const wsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchSources(wsId);
  }, [fetchSources, wsId]);

  React.useEffect(() => {
    if (selectedSourceId) {
      fetchSourceDetail(selectedSourceId, wsId);
    }
  }, [selectedSourceId, fetchSourceDetail, wsId]);

  const handleSelectSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
    setViewMode('detail');
  };

  const handleSaveText = async (name: string, content: string) => {
    try {
      setIsSaving(true);
      const url = `/api/knowledge-base/text${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content }),
      });
      if (res.ok) {
        await fetchSources(currentWorkspace?.id);
        setViewMode('list');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFaq = async (name: string, faqs: FaqPair[]) => {
    try {
      setIsSaving(true);
      const url = `/api/knowledge-base/faq${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, faqs }),
      });
      if (res.ok) {
        await fetchSources(currentWorkspace?.id);
        setViewMode('list');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUrl = async (urlStr: string, name?: string) => {
    try {
      setIsSaving(true);
      const apiUrl = `/api/knowledge-base/import-url${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlStr, name }),
      });
      if (res.ok) {
        await fetchSources(currentWorkspace?.id);
        setViewMode('list');
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to import URL.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async (fileName: string, fileType: string, fileDataText?: string) => {
    try {
      setIsSaving(true);
      const url = `/api/knowledge-base/upload-document${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileType, fileDataText }),
      });
      if (res.ok) {
        await fetchSources(currentWorkspace?.id);
        setViewMode('list');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReprocess = async (sourceId: string) => {
    const url = `/api/knowledge-base/${sourceId}/reprocess${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, { method: 'POST' });
    if (res.ok) {
      fetchSources(currentWorkspace?.id);
      if (selectedSourceId === sourceId) {
        fetchSourceDetail(sourceId, currentWorkspace?.id);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sourceToDelete) return;
    try {
      setIsDeleting(true);
      const url = `/api/knowledge-base/${sourceToDelete.id}${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== sourceToDelete.id));
        setSourceToDelete(null);
        if (selectedSourceId === sourceToDelete.id) {
          setSelectedSourceId(null);
          setViewMode('list');
        }
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout
      currentPath="/knowledge-base"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchSources(id);
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
          fetchSources(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      {viewMode === 'list' && (
        <KnowledgeList
          sources={sources}
          stats={stats}
          onSelectSource={handleSelectSource}
          onAddKnowledgeClick={() => setViewMode('new')}
          onOpenRAGDebugClick={() => setIsRAGDebugOpen(true)}
          onReprocessSource={handleReprocess}
          onDeleteSourceClick={(source) => setSourceToDelete(source)}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'new' && (
        <AddKnowledgeWizard
          onBack={() => setViewMode('list')}
          onSaveText={handleSaveText}
          onSaveFaq={handleSaveFaq}
          onSaveUrl={handleSaveUrl}
          onSaveDocument={handleSaveDocument}
          isSaving={isSaving}
        />
      )}

      {viewMode === 'detail' && selectedSource && (
        <KnowledgeDetailView
          source={selectedSource}
          chunks={chunks}
          onBack={() => setViewMode('list')}
          onReprocess={() => handleReprocess(selectedSource.id)}
          onDeleteClick={() => setSourceToDelete(selectedSource)}
          onSaveEdit={async (updatedContent) => {
            const url = `/api/knowledge-base/${selectedSource.id}${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
            const res = await apiFetch(url, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: selectedSource.name, content: updatedContent }),
            });
            if (res.ok) {
              fetchSourceDetail(selectedSource.id, currentWorkspace?.id);
              fetchSources(currentWorkspace?.id);
            }
          }}
        />
      )}

      {/* RAG Search Debug Modal */}
      <SemanticSearchDebugTool
        isOpen={isRAGDebugOpen}
        onClose={() => setIsRAGDebugOpen(false)}
        workspaceId={currentWorkspace?.id}
      />

      {/* Delete Confirmation Modal */}
      <DeleteKnowledgeModal
        isOpen={Boolean(sourceToDelete)}
        sourceName={sourceToDelete?.name || ''}
        onClose={() => setSourceToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};


import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import type { AnalyticsData, AnalyticsPreset } from '../types/analytics';

// 3. Analytics SaaS Reporting Module Page
export const AnalyticsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData | null>(null);
  const [preset, setPreset] = React.useState<AnalyticsPreset>('30d');
  const [channelFilter, setChannelFilter] = React.useState<string>('all');
  const [agentFilter, setAgentFilter] = React.useState<string>('all');

  const [availableChannels, setAvailableChannels] = React.useState<Array<{ id: string; name: string }>>([]);
  const [availableAgents, setAvailableAgents] = React.useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Fetch analytics overview
  const fetchAnalytics = React.useCallback(
    async (wsId?: string | null, p = preset, chan = channelFilter, ag = agentFilter) => {
      try {
        let url = `/api/analytics?preset=${p}&channelId=${chan}&agentId=${ag}`;
        if (wsId) url += `&workspaceId=${wsId}`;

        const res = await apiFetch(url, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
          setCurrentWorkspace((prev) => prev || data.workspace || null);
          if (data.workspaces) {
            setWorkspaces(data.workspaces);
          }
          if (data.agentPerformance) {
            setAvailableAgents(data.agentPerformance.map((a: any) => ({ id: a.id, name: a.name })));
          }
          if (data.channelPerformance) {
            setAvailableChannels(data.channelPerformance.map((c: any) => ({ id: c.id, name: c.name })));
          }
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [preset, channelFilter, agentFilter]
  );

  const analyticsWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchAnalytics(analyticsWsId);
  }, [fetchAnalytics, analyticsWsId]);

  const handleExportCSV = async () => {
    try {
      let url = `/api/analytics/export.csv?preset=${preset}&channelId=${channelFilter}&agentId=${agentFilter}`;
      if (analyticsWsId) url += `&workspaceId=${analyticsWsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `xiachat_analytics_${preset}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('Error downloading CSV export:', err);
    }
  };

  return (
    <DashboardLayout
      currentPath="/analytics"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchAnalytics(id);
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
          fetchAnalytics(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      <AnalyticsDashboard
        data={analyticsData}
        preset={preset}
        channelFilter={channelFilter}
        agentFilter={agentFilter}
        availableChannels={availableChannels}
        availableAgents={availableAgents}
        onPresetChange={(p) => {
          setPreset(p);
          fetchAnalytics(analyticsWsId, p, channelFilter, agentFilter);
        }}
        onChannelFilterChange={(c) => {
          setChannelFilter(c);
          fetchAnalytics(analyticsWsId, preset, c, agentFilter);
        }}
        onAgentFilterChange={(a) => {
          setAgentFilter(a);
          fetchAnalytics(analyticsWsId, preset, channelFilter, a);
        }}
        onExportCSV={handleExportCSV}
        onNavigate={onNavigate}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
};

import { TeamMemberList } from '../components/team/TeamMemberList';
import { InviteMemberModal } from '../components/team/InviteMemberModal';
import { ChangeRoleModal } from '../components/team/ChangeRoleModal';
import { RemoveMemberModal } from '../components/team/RemoveMemberModal';
import { MemberDetailsDrawer } from '../components/team/MemberDetailsDrawer';
import { CancelInviteModal } from '../components/team/CancelInviteModal';
import { DeactivateMemberModal } from '../components/team/DeactivateMemberModal';
import { ManagePermissionsModal } from '../components/team/ManagePermissionsModal';
import { ToastNotification, type ToastMessage } from '../components/team/ToastNotification';
import { WorkspaceSettingsForm } from '../components/workspace/WorkspaceSettingsForm';
import type { WorkspaceMember, WorkspaceInvitation, WorkspaceRole, WorkspaceSettings, TeamAuditLog } from '../types/team';

// 4. Team Members & Roles Page
export const TeamPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  const [members, setMembers] = React.useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = React.useState<WorkspaceInvitation[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<TeamAuditLog[]>([]);
  const [stats, setStats] = React.useState({ totalMembers: 0, activeMembers: 0, pendingInvitations: 0 });
  const [actorRole, setActorRole] = React.useState<'owner' | 'admin' | 'manager' | 'support' | 'member'>('owner');

  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterOption, setFilterOption] = React.useState('all');
  const [isLoading, setIsLoading] = React.useState(true);

  // Drawer & Modals state
  const [selectedMemberDrawer, setSelectedMemberDrawer] = React.useState<WorkspaceMember | null>(null);
  const [invitationToCancel, setInvitationToCancel] = React.useState<WorkspaceInvitation | null>(null);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [isSendingInvite, setIsSendingInvite] = React.useState(false);

  const [memberToEditRole, setMemberToEditRole] = React.useState<WorkspaceMember | null>(null);
  const [isSavingRole, setIsSavingRole] = React.useState(false);

  const [memberToManagePermissions, setMemberToManagePermissions] = React.useState<WorkspaceMember | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = React.useState(false);

  const [memberToToggleStatus, setMemberToToggleStatus] = React.useState<WorkspaceMember | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = React.useState(false);

  const [memberToRemove, setMemberToRemove] = React.useState<WorkspaceMember | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);

  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch team members, invitations, and audit logs
  const fetchTeamData = React.useCallback(
    async (wsId?: string | null, search = searchQuery, filter = filterOption) => {
      try {
        let url = `/api/team/members?search=${encodeURIComponent(search)}&filter=${filter}`;
        if (wsId) url += `&workspaceId=${wsId}`;

        const res = await apiFetch(url, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
          setInvitations(data.invitations || []);
          setStats(data.stats || { totalMembers: 0, activeMembers: 0, pendingInvitations: 0 });
          if (data.actorRole) setActorRole(data.actorRole);
          setCurrentWorkspace((prev) => prev || data.workspace || null);
          if (data.workspaces) {
            setWorkspaces(data.workspaces);
          }
        }

        // Fetch audit logs
        let auditUrl = '/api/team/audit-logs';
        if (wsId) auditUrl += `?workspaceId=${wsId}`;
        const auditRes = await apiFetch(auditUrl, { method: 'GET' });
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setAuditLogs(auditData.logs || []);
        }
      } catch (err) {
        console.error('Error fetching team members:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, filterOption]
  );

  const teamWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchTeamData(teamWsId);
  }, [fetchTeamData, teamWsId]);

  // Handlers
  const handleSendInvite = async (email: string, role: WorkspaceRole, message?: string) => {
    setIsSendingInvite(true);
    try {
      let url = `/api/team/invitations`;
      if (teamWsId) url += `?workspaceId=${teamWsId}`;

      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, message }),
      });

      if (res.ok) {
        await fetchTeamData(teamWsId);
        addToast('success', 'Invitation sent to member.');
        return true;
      }
      addToast('error', 'Failed to send invitation. Please try again.');
      return false;
    } catch (err) {
      console.error('Error sending invitation:', err);
      addToast('error', 'Failed to send invitation. Please try again.');
      return false;
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleUpdateRole = async (role: WorkspaceRole, isTransferOwner: boolean) => {
    if (!memberToEditRole) return;
    setIsSavingRole(true);
    try {
      let url = `/api/team/members/${memberToEditRole.id}/role`;
      if (teamWsId) url += `?workspaceId=${teamWsId}`;

      const res = await apiFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, isTransferOwner }),
      });

      if (res.ok) {
        // Update local member row state immediately
        setMembers((prev) =>
          prev.map((m) => (m.id === memberToEditRole.id ? { ...m, role: isTransferOwner ? 'owner' : role } : m))
        );
        await fetchTeamData(teamWsId);
        addToast('success', 'Member position updated.');
        setMemberToEditRole(null);
      } else {
        addToast('error', 'Unable to update member position. Please try again.');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      addToast('error', 'Unable to update member position. Please try again.');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!memberToManagePermissions) return;
    setIsSavingPermissions(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      addToast('success', 'Permissions updated.');
      setMemberToManagePermissions(null);
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleToggleStatus = async (member: WorkspaceMember, targetStatus: 'suspended' | 'active') => {
    setIsTogglingStatus(true);
    try {
      let url = `/api/team/members/${member.id}/status`;
      if (teamWsId) url += `?workspaceId=${teamWsId}`;

      const res = await apiFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (res.ok) {
        // Immediate local status update
        setMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, status: targetStatus } : m))
        );
        await fetchTeamData(teamWsId);
        if (targetStatus === 'suspended') {
          addToast('success', 'Member deactivated.');
        } else {
          addToast('success', 'Member reactivated.');
        }
      } else {
        addToast('error', 'Failed to update member status.');
      }
    } catch (err) {
      console.error('Error toggling member status:', err);
      addToast('error', 'Failed to update member status.');
    } finally {
      setIsTogglingStatus(false);
      setMemberToToggleStatus(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      let url = `/api/team/members/${memberToRemove.id}`;
      if (teamWsId) url += `?workspaceId=${teamWsId}`;

      const res = await apiFetch(url, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Immediate local list removal
        setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        await fetchTeamData(teamWsId);
        addToast('success', 'Member removed from workspace.');
      } else {
        addToast('error', 'Failed to remove member from workspace.');
      }
    } catch (err) {
      console.error('Error removing member:', err);
      addToast('error', 'Failed to remove member from workspace.');
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    try {
      let url = `/api/team/invitations/${invitationId}/resend`;
      if (teamWsId) url += `?workspaceId=${teamWsId}`;
      const res = await apiFetch(url, { method: 'POST' });
      if (res.ok) {
        addToast('success', 'Invitation resent.');
      }
      await fetchTeamData(teamWsId);
    } catch (err) {
      console.error('Error resending invite:', err);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    try {
      let url = `/api/team/invitations/${invitationId}`;
      if (teamWsId) url += `?workspaceId=${teamWsId}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      if (res.ok) {
        addToast('success', 'Invitation cancelled.');
      }
      await fetchTeamData(teamWsId);
    } catch (err) {
      console.error('Error cancelling invite:', err);
    }
  };

  return (
    <DashboardLayout
      currentPath="/team-members"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchTeamData(id);
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
          fetchTeamData(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      <TeamMemberList
        members={members}
        invitations={invitations}
        auditLogs={auditLogs}
        stats={stats}
        searchQuery={searchQuery}
        filterOption={filterOption}
        actorRole={actorRole}
        onSearchChange={(q) => {
          setSearchQuery(q);
          fetchTeamData(teamWsId, q, filterOption);
        }}
        onFilterChange={(f) => {
          setFilterOption(f);
          fetchTeamData(teamWsId, searchQuery, f);
        }}
        onInviteClick={() => setIsInviteOpen(true)}
        onMemberClick={(m) => setSelectedMemberDrawer(m)}
        onChangeRoleClick={(m) => setMemberToEditRole(m)}
        onManagePermissionsClick={(m) => setMemberToManagePermissions(m)}
        onToggleStatusClick={(m) => setMemberToToggleStatus(m)}
        onRemoveMemberClick={(m) => setMemberToRemove(m)}
        onResendInvite={handleResendInvite}
        onCancelInvite={(inv) => setInvitationToCancel(inv)}
        isLoading={isLoading}
      />

      {/* Member Details Drawer */}
      <MemberDetailsDrawer
        isOpen={Boolean(selectedMemberDrawer)}
        member={selectedMemberDrawer}
        onClose={() => setSelectedMemberDrawer(null)}
        onChangeRole={(m) => setMemberToEditRole(m)}
        onToggleStatus={(m) => setMemberToToggleStatus(m)}
        onRemoveMember={(m) => setMemberToRemove(m)}
        canManage={actorRole === 'owner' || actorRole === 'admin'}
      />

      {/* Cancel Invitation Confirmation Modal */}
      <CancelInviteModal
        isOpen={Boolean(invitationToCancel)}
        invitation={invitationToCancel}
        onClose={() => setInvitationToCancel(null)}
        onConfirmCancel={handleCancelInvite}
      />

      {/* Modals */}
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSendInvite={handleSendInvite}
        isSending={isSendingInvite}
      />

      <ChangeRoleModal
        isOpen={Boolean(memberToEditRole)}
        member={memberToEditRole}
        onClose={() => setMemberToEditRole(null)}
        onConfirm={handleUpdateRole}
        isSaving={isSavingRole}
      />

      <ManagePermissionsModal
        isOpen={Boolean(memberToManagePermissions)}
        member={memberToManagePermissions}
        onClose={() => setMemberToManagePermissions(null)}
        onSave={handleSavePermissions}
        isSaving={isSavingPermissions}
      />

      <DeactivateMemberModal
        isOpen={Boolean(memberToToggleStatus)}
        member={memberToToggleStatus}
        onClose={() => setMemberToToggleStatus(null)}
        onConfirm={handleToggleStatus}
        isProcessing={isTogglingStatus}
      />

      <RemoveMemberModal
        isOpen={Boolean(memberToRemove)}
        memberName={memberToRemove?.name || ''}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        isRemoving={isRemoving}
      />

      <ToastNotification toasts={toasts} onDismiss={removeToast} />
    </DashboardLayout>
  );
};

import type { BillingOverview, BillingInterval, DowngradeConflict } from '../types/billing';
import { CurrentPlanCard } from '../components/billing/CurrentPlanCard';
import { UsageSection } from '../components/billing/UsageSection';
import { PlanComparisonSection } from '../components/billing/PlanComparisonSection';
import { PaymentMethodSection } from '../components/billing/PaymentMethodSection';
import { InvoiceHistoryTable } from '../components/billing/InvoiceHistoryTable';
import { CancelModal } from '../components/billing/CancelModal';
import { DowngradeModal } from '../components/billing/DowngradeModal';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

// 5. Billing Page
export const BillingPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  const [overview, setOverview] = React.useState<BillingOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modal & Loading States
  const [isLoadingPlanId, setIsLoadingPlanId] = React.useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [isDowngradeModalOpen, setIsDowngradeModalOpen] = React.useState(false);
  const [targetDowngradePlan, setTargetDowngradePlan] = React.useState<{ id: string; name: string; interval: BillingInterval } | null>(null);
  const [downgradeConflicts, setDowngradeConflicts] = React.useState<DowngradeConflict[]>([]);

  const plansSectionRef = React.useRef<HTMLDivElement>(null);

  const fetchBillingOverview = React.useCallback(async (wsId?: string | null) => {
    try {
      setIsLoading(true);
      setError(null);
      let url = '/api/billing/overview';
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load billing details.');
      }
      const data = await res.json();
      setOverview(data);

      // Fetch user's workspaces for WorkspaceSwitcher context
      let teamUrl = '/api/team/members';
      if (wsId) teamUrl += `?workspaceId=${wsId}`;
      const wsRes = await fetch(teamUrl, { credentials: 'include' });
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        if (wsData.workspaces) setWorkspaces(wsData.workspaces);
        setCurrentWorkspace((prev) => prev || wsData.workspace || (wsData.workspaces && wsData.workspaces[0]) || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load billing state.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const billingWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchBillingOverview(billingWsId);

    // Check for success feedback from checkout redirect URL
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('checkout') === 'success' || searchParams.get('mock_checkout') === 'true') {
      setSuccessMessage('Your subscription has been successfully updated!');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchBillingOverview, billingWsId]);

  const handleScrollToPlans = () => {
    if (plansSectionRef.current) {
      plansSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenPortal = async () => {
    try {
      setIsActionLoading(true);
      setError(null);
      let portalUrl = '/api/billing/customer-portal';
      if (billingWsId) portalUrl += `?workspaceId=${billingWsId}`;

      const res = await fetch(portalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate billing portal link.');

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Customer portal unavailable.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string, interval: BillingInterval) => {
    if (!overview) return;
    setIsLoadingPlanId(planId);
    setError(null);
    try {
      let checkoutUrl = '/api/billing/checkout-session';
      if (billingWsId) checkoutUrl += `?workspaceId=${billingWsId}`;

      const res = await fetch(checkoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Check for downgrade conflicts
        if (res.status === 409 && data.conflicts) {
          setDowngradeConflicts(data.conflicts);
          setTargetDowngradePlan({
            id: planId,
            name: data.planName || planId.toUpperCase(),
            interval,
          });
          setIsDowngradeModalOpen(true);
          return;
        }
        throw new Error(data.error || 'Failed to initialize subscription checkout.');
      }

      if (data.mock) {
        setSuccessMessage(`Plan updated to ${planId.toUpperCase()} (${interval}).`);
        await fetchBillingOverview(billingWsId);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || 'Subscription change failed. Please try again.');
    } finally {
      setIsLoadingPlanId(null);
    }
  };

  const handleConfirmDowngrade = async () => {
    if (!targetDowngradePlan) return;
    setIsActionLoading(true);
    setError(null);
    try {
      let changePlanUrl = '/api/billing/change-plan';
      if (billingWsId) changePlanUrl += `?workspaceId=${billingWsId}`;

      const res = await fetch(changePlanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: targetDowngradePlan.id,
          interval: targetDowngradePlan.interval,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to downgrade plan.');

      setSuccessMessage(`Plan successfully changed to ${targetDowngradePlan.name}.`);
      setIsDowngradeModalOpen(false);
      setTargetDowngradePlan(null);
      await fetchBillingOverview(billingWsId);
    } catch (err: any) {
      setError(err.message || 'Downgrade failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmCancel = async (reason?: string) => {
    setIsActionLoading(true);
    setError(null);
    try {
      let cancelUrl = '/api/billing/cancel';
      if (billingWsId) cancelUrl += `?workspaceId=${billingWsId}`;

      const res = await fetch(cancelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription.');

      setSuccessMessage('Subscription set to cancel at end of current period.');
      setIsCancelModalOpen(false);
      await fetchBillingOverview(billingWsId);
    } catch (err: any) {
      setError(err.message || 'Subscription cancellation failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsActionLoading(true);
    setError(null);
    try {
      let resumeUrl = '/api/billing/resume';
      if (billingWsId) resumeUrl += `?workspaceId=${billingWsId}`;

      const res = await fetch(resumeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resume subscription.');

      setSuccessMessage('Subscription reinstated successfully.');
      await fetchBillingOverview(billingWsId);
    } catch (err: any) {
      setError(err.message || 'Failed to resume subscription.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <DashboardLayout
      currentPath="/billing"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchBillingOverview(id);
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
          fetchBillingOverview(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      <div className="space-y-8 pb-16">
        {/* Success Alert Toast Banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-extrabold">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert Toast Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="text-xs font-extrabold">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-rose-700 font-bold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            <div className="h-56 bg-white rounded-3xl border border-[#E8E8E5] animate-pulse p-6" />
            <div className="h-64 bg-white rounded-3xl border border-[#E8E8E5] animate-pulse p-6" />
            <div className="h-96 bg-white rounded-3xl border border-[#E8E8E5] animate-pulse p-6" />
          </div>
        ) : overview ? (
          <>
            {/* Permission Restriction Notice for Member Roles */}
            {!overview.workspace.canManageBilling && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs font-medium">
                  You are viewing billing in read-only mode as a workspace <span className="font-bold uppercase">{overview.workspace.userRole}</span>. Only workspace Owners and Admins can change plans or manage payment methods.
                </p>
              </div>
            )}

            {/* 1. Top Current Plan Summary */}
            <CurrentPlanCard
              overview={overview}
              onOpenPortal={handleOpenPortal}
              onScrollToPlans={handleScrollToPlans}
              onResumeSubscription={handleResumeSubscription}
              isActionLoading={isActionLoading}
            />

            {/* 2. Usage & Capacity Metrics */}
            <UsageSection
              usage={overview.usage}
              limits={overview.limits}
              onScrollToPlans={handleScrollToPlans}
              canManageBilling={overview.workspace.canManageBilling}
            />

            {/* 3. Pricing Cards & Capacity Comparison Table */}
            <PlanComparisonSection
              overview={overview}
              onSelectPlan={handleSelectPlan}
              isLoadingPlanId={isLoadingPlanId}
              sectionRef={plansSectionRef}
            />

            {/* 4. Payment Method Card */}
            <PaymentMethodSection
              paymentMethod={overview.subscription.paymentMethod}
              onOpenPortal={handleOpenPortal}
              canManageBilling={overview.workspace.canManageBilling}
              isActionLoading={isActionLoading}
            />

            {/* 5. Historical Invoices & Receipts */}
            <InvoiceHistoryTable invoices={overview.invoices} />

            {/* 6. Cancel Subscription Secondary Action */}
            {overview.workspace.canManageBilling &&
              overview.subscription.planId !== 'free' &&
              !overview.subscription.cancelAtPeriodEnd && (
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="text-xs text-gray-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                  >
                    Cancel subscription
                  </button>
                </div>
              )}

            {/* Modals */}
            <CancelModal
              isOpen={isCancelModalOpen}
              onClose={() => setIsCancelModalOpen(false)}
              onConfirmCancel={handleConfirmCancel}
              isCanceling={isActionLoading}
              effectiveDate={overview.subscription.currentPeriodEnd}
            />

            <DowngradeModal
              isOpen={isDowngradeModalOpen}
              onClose={() => {
                setIsDowngradeModalOpen(false);
                setTargetDowngradePlan(null);
              }}
              onConfirmDowngrade={handleConfirmDowngrade}
              targetPlanName={targetDowngradePlan?.name || 'Target'}
              conflicts={downgradeConflicts}
              isDowngrading={isActionLoading}
            />
          </>
        ) : (
          <div className="p-8 bg-white rounded-3xl border border-[#E8E8E5] text-center space-y-3">
            <p className="text-sm font-bold text-[#171717]">Unable to load subscription details.</p>
            <button
              onClick={() => fetchBillingOverview(billingWsId)}
              className="px-4 py-2 rounded-xl bg-[#171717] text-white text-xs font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

import { SettingsLayout } from '../components/settings/SettingsLayout';
import type { SettingsTab, SettingsOverviewData, NotificationPreferences, WorkspaceAIDefaults } from '../types/settings';

// 6. Workspace Administration Settings Page (/settings/workspace)
export const WorkspaceSettingsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  const [settings, setSettings] = React.useState<WorkspaceSettings | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const fetchSettings = React.useCallback(async (wsId?: string | null) => {
    try {
      let url = `/api/settings/workspace`;
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.workspace);
        setCurrentWorkspace((prev) => prev || data.workspace || null);
        if (data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      }
    } catch (err) {
      console.error('Error loading workspace settings:', err);
    }
  }, []);

  const settingsWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchSettings(settingsWsId);
  }, [fetchSettings, settingsWsId]);

  const handleSaveSettings = async (updated: Partial<WorkspaceSettings>) => {
    setIsSaving(true);
    try {
      let url = `/api/settings/workspace`;
      if (settingsWsId) url += `?workspaceId=${settingsWsId}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.workspace);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving workspace settings:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout
      currentPath="/settings"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchSettings(id);
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
          fetchSettings(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      <WorkspaceSettingsForm
        settings={settings}
        onSave={handleSaveSettings}
        isSaving={isSaving}
      />
    </DashboardLayout>
  );
};

// 7. Central Settings Page (/settings)
export const SettingsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  const getInitialTab = (): SettingsTab => {
    const path = window.location.pathname;
    if (path.includes('/workspace')) return 'workspace';
    if (path.includes('/notifications')) return 'notifications';
    if (path.includes('/security')) return 'security';
    if (path.includes('/ai')) return 'ai';
    if (path.includes('/privacy')) return 'privacy';
    if (path.includes('/account')) return 'account';
    return 'profile';
  };

  const [activeTab, setActiveTab] = React.useState<SettingsTab>(getInitialTab);
  const [overviewData, setOverviewData] = React.useState<SettingsOverviewData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch central settings
  const fetchCentralSettings = React.useCallback(async (wsId?: string | null) => {
    try {
      let url = `/api/settings/me`;
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOverviewData(data);
        setCurrentWorkspace((prev) => prev || data.workspace || null);
        if (data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      }
    } catch (err) {
      console.error('Error loading user settings overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const centralWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchCentralSettings(centralWsId);
  }, [fetchCentralSettings, centralWsId]);

  // Handlers
  const handleSaveProfile = async (name: string, jobTitle: string, phone: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, jobTitle, phone }),
      });
      if (res.ok) {
        await fetchCentralSettings(centralWsId);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating profile:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async (prefs: NotificationPreferences) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        await fetchCentralSettings(centralWsId);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating notifications:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (curr: string, next: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: curr, newPassword: next }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: 'Failed to update password.' };
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAIDefaults = async (defaults: WorkspaceAIDefaults) => {
    setIsSaving(true);
    try {
      let url = `/api/settings/ai-defaults`;
      if (centralWsId) url += `?workspaceId=${centralWsId}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(defaults),
      });
      if (res.ok) {
        await fetchCentralSettings(centralWsId);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving AI defaults:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    let url = `/api/settings/export-user-data.json`;
    if (centralWsId) url += `?workspaceId=${centralWsId}`;
    window.open(url, '_blank');
  };

  const handleDeleteAccount = async (confirmText: string, password?: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmText, currentPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        onNavigate('/login');
        return { success: true };
      }
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: 'Account deletion failed.' };
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout
      currentPath="/settings"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchCentralSettings(id);
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
          fetchCentralSettings(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      <SettingsLayout
        data={overviewData}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSaveProfile={handleSaveProfile}
        onSaveNotifications={handleSaveNotifications}
        onChangePassword={handleChangePassword}
        onSaveAIDefaults={handleSaveAIDefaults}
        onExportData={handleExportData}
        onDeleteAccount={handleDeleteAccount}
        onNavigate={onNavigate}
        isLoading={isLoading}
        isSaving={isSaving}
      />
    </DashboardLayout>
  );
};

import { CustomerList } from '../components/customers/CustomerList';
import { CustomerDetailView } from '../components/customers/CustomerDetailView';
import { CreateCustomerModal } from '../components/customers/CreateCustomerModal';
import { MergeCustomerModal } from '../components/customers/MergeCustomerModal';
import { DeleteCustomerModal } from '../components/customers/DeleteCustomerModal';
import type {
  Customer,
  CustomerConversationSummary,
  CustomerNote,
  CustomerActivity,
  CustomerProfileSummary,
  CustomerFilterOption,
  CustomerSortOption,
} from '../types/customer';

// 7. Customers SaaS CRM Module Page
export const CustomersPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = React.useState<'list' | 'detail'>('list');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);

  // Workspaces state
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  // Customers state
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [total, setTotal] = React.useState<number>(0);
  const [page, setPage] = React.useState<number>(1);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [stats, setStats] = React.useState({ total: 0, active: 0, new: 0, vip: 0 });

  // Query params
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [filterOption, setFilterOption] = React.useState<CustomerFilterOption>('all');
  const [sortOption, setSortOption] = React.useState<CustomerSortOption>('recently_active');

  // Customer Detail state
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [summary, setSummary] = React.useState<CustomerProfileSummary>({
    totalConversations: 0,
    resolvedConversations: 0,
    openConversations: 0,
    aiHandled: 0,
    humanHandled: 0,
    lastActiveAt: new Date().toISOString(),
  });
  const [conversations, setConversations] = React.useState<CustomerConversationSummary[]>([]);
  const [notes, setNotes] = React.useState<CustomerNote[]>([]);
  const [activityTimeline, setActivityTimeline] = React.useState<CustomerActivity[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState<boolean>(false);
  const [isMergeOpen, setIsMergeOpen] = React.useState<boolean>(false);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [isMerging, setIsMerging] = React.useState<boolean>(false);

  // Fetch customers list
  const fetchCustomers = React.useCallback(
    async (wsId?: string | null, p = page, s = searchQuery, f = filterOption, sort = sortOption) => {
      try {
        let url = `/api/customers?page=${p}&limit=10&search=${encodeURIComponent(s)}&filter=${f}&sort=${sort}`;
        if (wsId) url += `&workspaceId=${wsId}`;

        const res = await apiFetch(url, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.customers || []);
          setTotal(data.total || 0);
          setPage(data.page || 1);
          setTotalPages(data.totalPages || 1);
          setStats(data.stats || { total: 0, active: 0, new: 0, vip: 0 });
          setCurrentWorkspace((prev) => prev || data.workspace || null);
          if (data.workspaces) {
            setWorkspaces(data.workspaces);
          }
        }
      } catch (err) {
        console.error('Error loading customers list:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [page, searchQuery, filterOption, sortOption]
  );

  // Fetch single customer detail profile
  const fetchCustomerDetail = React.useCallback(async (customerId: string, wsId?: string | null) => {
    try {
      setIsLoading(true);
      let url = `/api/customers/${customerId}`;
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomer(data.customer || null);
        setSummary(data.summary || { totalConversations: 0, resolvedConversations: 0, openConversations: 0, aiHandled: 0, humanHandled: 0, lastActiveAt: new Date().toISOString() });
        setConversations(data.conversations || []);
        setNotes(data.notes || []);
        setActivityTimeline(data.activityTimeline || []);
      }
    } catch (err) {
      console.error('Error loading customer profile details:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const custWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchCustomers(custWsId);
  }, [fetchCustomers, custWsId]);

  React.useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetail(selectedCustomerId, custWsId);
    }
  }, [selectedCustomerId, fetchCustomerDetail, custWsId]);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setViewMode('detail');
  };

  const handleCreateCustomer = async (data: { name: string; email?: string; phone?: string; company?: string; location?: string }) => {
    try {
      setIsSaving(true);
      const url = `/api/customers${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchCustomers(currentWorkspace?.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCustomer = async (updatedData: Partial<Customer>) => {
    if (!selectedCustomerId) return;
    const url = `/api/customers/${selectedCustomerId}${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });

    if (res.ok) {
      fetchCustomerDetail(selectedCustomerId, currentWorkspace?.id);
      fetchCustomers(currentWorkspace?.id);
    }
  };

  const handleAddNote = async (content: string) => {
    if (!selectedCustomerId) return;
    const url = `/api/customers/${selectedCustomerId}/notes${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      fetchCustomerDetail(selectedCustomerId, currentWorkspace?.id);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedCustomerId) return;
    const url = `/api/customers/${selectedCustomerId}/notes/${noteId}${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, { method: 'DELETE' });

    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  };

  const handleToggleBlock = async (custId?: string) => {
    const targetId = custId || selectedCustomerId;
    if (!targetId) return;
    const url = `/api/customers/${targetId}/block${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, { method: 'POST' });

    if (res.ok) {
      fetchCustomers(currentWorkspace?.id);
      if (selectedCustomerId === targetId) {
        fetchCustomerDetail(targetId, currentWorkspace?.id);
      }
    }
  };

  const handleMergeCustomers = async (primaryId: string, secondaryId: string) => {
    try {
      setIsMerging(true);
      const url = `/api/customers/merge${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryCustomerId: primaryId, secondaryCustomerId: secondaryId }),
      });

      if (res.ok) {
        setIsMergeOpen(false);
        fetchCustomerDetail(primaryId, currentWorkspace?.id);
        fetchCustomers(currentWorkspace?.id);
      }
    } finally {
      setIsMerging(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    try {
      setIsDeleting(true);
      const url = `/api/customers/${customerToDelete.id}${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, { method: 'DELETE' });

      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
        setCustomerToDelete(null);
        if (selectedCustomerId === customerToDelete.id) {
          setSelectedCustomerId(null);
          setViewMode('list');
        }
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout
      currentPath="/customers"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchCustomers(id);
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
          fetchCustomers(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      {viewMode === 'list' && (
        <CustomerList
          customers={customers}
          total={total}
          page={page}
          totalPages={totalPages}
          stats={stats}
          onSelectCustomer={handleSelectCustomer}
          onAddCustomerClick={() => setIsCreateOpen(true)}
          onSearchChange={(q) => {
            setSearchQuery(q);
            fetchCustomers(currentWorkspace?.id, 1, q, filterOption, sortOption);
          }}
          onFilterChange={(f) => {
            setFilterOption(f);
            fetchCustomers(currentWorkspace?.id, 1, searchQuery, f, sortOption);
          }}
          onSortChange={(s) => {
            setSortOption(s);
            fetchCustomers(currentWorkspace?.id, page, searchQuery, filterOption, s);
          }}
          onPageChange={(p) => {
            setPage(p);
            fetchCustomers(currentWorkspace?.id, p, searchQuery, filterOption, sortOption);
          }}
          onToggleBlock={handleToggleBlock}
          onDeleteClick={(cust) => setCustomerToDelete(cust)}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'detail' && selectedCustomer && (
        <CustomerDetailView
          customer={selectedCustomer}
          summary={summary}
          conversations={conversations}
          notes={notes}
          activityTimeline={activityTimeline}
          allCustomers={customers}
          onBack={() => setViewMode('list')}
          onNavigate={onNavigate}
          onUpdateCustomer={handleUpdateCustomer}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onToggleBlock={() => handleToggleBlock(selectedCustomer.id)}
          onOpenMergeModal={() => setIsMergeOpen(true)}
          onDeleteClick={() => setCustomerToDelete(selectedCustomer)}
        />
      )}

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreateCustomer}
        isSaving={isSaving}
      />

      {/* Merge Customer Modal */}
      {selectedCustomer && (
        <MergeCustomerModal
          isOpen={isMergeOpen}
          currentCustomer={selectedCustomer}
          allCustomers={customers}
          onClose={() => setIsMergeOpen(false)}
          onConfirmMerge={handleMergeCustomers}
          isMerging={isMerging}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteCustomerModal
        isOpen={Boolean(customerToDelete)}
        customerName={customerToDelete?.name || ''}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};


import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { AgentList } from '../components/aiAgents/AgentList';
import { CreateAgentWizard } from '../components/aiAgents/CreateAgentWizard';
import { AgentDetailView } from '../components/aiAgents/AgentDetailView';
import { DeleteAgentModal } from '../components/aiAgents/DeleteAgentModal';
import type { AIAgent } from '../types/aiAgent';
import type { WorkspaceItem } from '../types/dashboard';

// 8. AI Agents SaaS Module Page
export const AIAgentsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = React.useState<'list' | 'new' | 'detail'>('list');
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);

  // Workspaces state
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  // Agents state
  const [agents, setAgents] = React.useState<AIAgent[]>([]);
  const [recentConvs, setRecentConvs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  // Delete modal state
  const [agentToDelete, setAgentToDelete] = React.useState<AIAgent | null>(null);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  // Fetch agents list
  const fetchAgents = React.useCallback(async (wsId?: string | null) => {
    try {
      let url = '/api/ai-agents';
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setCurrentWorkspace((prev) => prev || data.workspace || null);
        if (data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      }
    } catch (err) {
      console.error('Error loading AI agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch single agent detail
  const fetchAgentDetail = React.useCallback(async (agentId: string, wsId?: string | null) => {
    try {
      setIsLoading(true);
      let url = `/api/ai-agents/${agentId}`;
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setRecentConvs(data.recentConversations || []);
      }
    } catch (err) {
      console.error('Error loading agent details:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const agentWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchAgents(agentWsId);
  }, [fetchAgents, agentWsId]);

  React.useEffect(() => {
    if (selectedAgentId) {
      fetchAgentDetail(selectedAgentId, agentWsId);
    }
  }, [selectedAgentId, fetchAgentDetail, agentWsId]);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setViewMode('detail');
  };

  const handleCreateAgent = async (agentData: any) => {
    try {
      setIsSaving(true);
      const url = `/api/ai-agents${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });

      if (res.ok) {
        await fetchAgents(currentWorkspace?.id);
        setViewMode('list');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAgent = async (updatedData: Partial<AIAgent>) => {
    if (!selectedAgentId) return;
    const url = `/api/ai-agents/${selectedAgentId}${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });

    if (res.ok) {
      fetchAgents(currentWorkspace?.id);
    }
  };

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    const url = `/api/ai-agents/${agentId}/status${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (res.ok) {
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, status: nextStatus as any } : a))
      );
    }
  };

  const handleDuplicateAgent = async (agent: AIAgent) => {
    const duplicateData = {
      name: `${agent.name} (Copy)`,
      description: agent.description,
      avatar: agent.avatar,
      status: 'draft',
      tone: agent.tone,
      customInstructions: agent.customInstructions,
      responseStyle: agent.responseStyle,
      autoReplyEnabled: agent.autoReplyEnabled,
      humanHandoffEnabled: agent.humanHandoffEnabled,
      handoffConditions: agent.handoffConditions,
      handoffMessage: agent.handoffMessage,
      knowledgeSources: agent.knowledgeSources,
      channels: agent.channels,
      customRules: agent.customRules,
    };
    await handleCreateAgent(duplicateData);
  };

  const handleDeleteConfirm = async () => {
    if (!agentToDelete) return;
    try {
      setIsDeleting(true);
      const url = `/api/ai-agents/${agentToDelete.id}${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id));
        setAgentToDelete(null);
        if (selectedAgentId === agentToDelete.id) {
          setSelectedAgentId(null);
          setViewMode('list');
        }
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  return (
    <DashboardLayout
      currentPath="/ai-agents"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchAgents(id);
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
          fetchAgents(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      {viewMode === 'list' && (
        <AgentList
          agents={agents}
          onSelectAgent={handleSelectAgent}
          onCreateAgentClick={() => setViewMode('new')}
          onToggleStatus={handleToggleStatus}
          onDuplicateAgent={handleDuplicateAgent}
          onDeleteAgentClick={(agent) => setAgentToDelete(agent)}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'new' && (
        <CreateAgentWizard
          onBack={() => setViewMode('list')}
          onSave={handleCreateAgent}
          isSaving={isSaving}
        />
      )}

      {viewMode === 'detail' && selectedAgent && (
        <AgentDetailView
          agent={selectedAgent}
          recentConversations={recentConvs}
          onBack={() => setViewMode('list')}
          onNavigate={onNavigate}
          onUpdateAgent={handleUpdateAgent}
          onToggleStatus={handleToggleStatus}
          onDeleteClick={() => setAgentToDelete(selectedAgent)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteAgentModal
        isOpen={Boolean(agentToDelete)}
        agentName={agentToDelete?.name || ''}
        onClose={() => setAgentToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};

import { ChannelList } from '../components/channels/ChannelList';
import { WebsiteWidgetConfigurator } from '../components/channels/WebsiteWidgetConfigurator';
import { ChannelDetailView } from '../components/channels/ChannelDetailView';
import { DisconnectChannelModal } from '../components/channels/DisconnectChannelModal';
import { ConnectChannelModal } from '../components/channels/ConnectChannelModal';
import type { Channel, WebsiteWidgetConfig, ChannelTestResult } from '../types/channel';

// 9. Channels & Integrations SaaS Module Page
export const ChannelsPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = React.useState<'list' | 'website_config' | 'detail'>('list');
  const [selectedChannelId, setSelectedChannelId] = React.useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = React.useState<boolean>(false);

  // Workspaces state
  const [workspaces, setWorkspaces] = React.useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = React.useState<WorkspaceItem | null>(null);

  // Channels state
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [stats, setStats] = React.useState({ total: 0, connected: 0 });
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(null);
  const [availableAgents, setAvailableAgents] = React.useState<Array<{ id: string; name: string }>>([]);

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [channelToDisconnect, setChannelToDisconnect] = React.useState<Channel | null>(null);
  const [isDisconnecting, setIsDisconnecting] = React.useState<boolean>(false);

  // Auto-detect route URL
  React.useEffect(() => {
    if (window.location.pathname === '/channels/website') {
      setViewMode('website_config');
    }
  }, []);

  // Fetch channels list
  const fetchChannels = React.useCallback(async (wsId?: string | null) => {
    try {
      let url = '/api/channels';
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        setStats(data.stats || { total: 0, connected: 0 });
        setCurrentWorkspace((prev) => prev || data.workspace || null);
        if (data.workspaces) {
          setWorkspaces(data.workspaces);
        }
      }
    } catch (err) {
      console.error('Error loading channels list:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch single channel detail
  const fetchChannelDetail = React.useCallback(async (channelId: string, wsId?: string | null) => {
    try {
      setIsLoading(true);
      let url = `/api/channels/${channelId}`;
      if (wsId) url += `?workspaceId=${wsId}`;

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setSelectedChannel(data.channel || null);
        setAvailableAgents(data.availableAgents || []);
      }
    } catch (err) {
      console.error('Error loading channel detail:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const chanWsId = currentWorkspace?.id;

  React.useEffect(() => {
    fetchChannels(chanWsId);
  }, [fetchChannels, chanWsId]);

  React.useEffect(() => {
    if (selectedChannelId) {
      fetchChannelDetail(selectedChannelId, chanWsId);
    }
  }, [selectedChannelId, fetchChannelDetail, chanWsId]);

  const handleSelectChannel = (id: string) => {
    const target = channels.find((c) => c.id === id);
    if (target?.type === 'website') {
      setSelectedChannelId(id);
      setViewMode('website_config');
    } else {
      setSelectedChannelId(id);
      setViewMode('detail');
    }
  };

  const handleSaveWebsiteConfig = async (config: WebsiteWidgetConfig, defaultAgentId?: string) => {
    try {
      setIsSaving(true);
      const url = `/api/channels/website-config${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, defaultAgentId }),
      });

      if (res.ok) {
        await fetchChannels(currentWorkspace?.id);
        setViewMode('list');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestChannel = async (channelId: string): Promise<ChannelTestResult> => {
    const url = `/api/channels/${channelId}/test${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
    const res = await apiFetch(url, { method: 'POST' });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, message: 'Health check failed to communicate with backend service.', latencyMs: 0 };
  };

  const handleDisconnectConfirm = async () => {
    if (!channelToDisconnect) return;
    try {
      setIsDisconnecting(true);
      const url = `/api/channels/${channelToDisconnect.id}/disconnect${currentWorkspace?.id ? `?workspaceId=${currentWorkspace.id}` : ''}`;
      const res = await apiFetch(url, { method: 'POST' });

      if (res.ok) {
        setChannelToDisconnect(null);
        await fetchChannels(currentWorkspace?.id);
        if (selectedChannelId === channelToDisconnect.id) {
          setViewMode('list');
        }
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const websiteChannel = channels.find((c) => c.type === 'website') || channels[0];

  return (
    <DashboardLayout
      currentPath="/channels"
      onNavigate={onNavigate}
      workspaces={workspaces}
      currentWorkspace={currentWorkspace}
      onSelectWorkspace={(id) => {
        const ws = workspaces.find((w) => w.id === id);
        if (ws) {
          setCurrentWorkspace(ws);
          fetchChannels(id);
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
          fetchChannels(data.workspace.id);
          return true;
        }
        return false;
      }}
    >
      {viewMode === 'list' && (
        <ChannelList
          channels={channels}
          stats={stats}
          onSelectChannel={handleSelectChannel}
          onConfigureWebsite={() => {
            if (websiteChannel) {
              setSelectedChannelId(websiteChannel.id);
              setViewMode('website_config');
            }
          }}
          onConnectChannelClick={() => setIsConnectModalOpen(true)}
          onTestChannel={async (id) => {
            await handleTestChannel(id);
          }}
          onDisconnectClick={(channel) => setChannelToDisconnect(channel)}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'website_config' && websiteChannel && (
        <WebsiteWidgetConfigurator
          channelId={websiteChannel.id}
          initialConfig={
            websiteChannel.config || {
              widgetName: 'Xia Support Chat',
              welcomeMessage: 'Hello! How can we help you today?',
              primaryColor: '#FF8A2A',
              position: 'bottom-right',
              enableAI: true,
              enableHandoff: true,
              showAgentAvailability: true,
            }
          }
          availableAgents={availableAgents}
          defaultAgentId={websiteChannel.defaultAgentId}
          onBack={() => setViewMode('list')}
          onSave={handleSaveWebsiteConfig}
          isSaving={isSaving}
        />
      )}

      {viewMode === 'detail' && selectedChannel && (
        <ChannelDetailView
          channel={selectedChannel}
          availableAgents={availableAgents}
          onBack={() => setViewMode('list')}
          onTestConnection={handleTestChannel}
          onDisconnectClick={() => setChannelToDisconnect(selectedChannel)}
        />
      )}

      {/* Connect Channel Modal Wizard */}
      <ConnectChannelModal
        isOpen={isConnectModalOpen}
        channels={channels}
        availableAgents={availableAgents}
        onClose={() => setIsConnectModalOpen(false)}
        onNavigate={onNavigate}
        onConnectWebsite={async (_wName, _wUrl, agId, config) => {
          await handleSaveWebsiteConfig(config, agId);
          return true;
        }}
      />

      {/* Disconnect Confirmation Modal */}
      <DisconnectChannelModal
        isOpen={Boolean(channelToDisconnect)}
        channelName={channelToDisconnect?.name || ''}
        onClose={() => setChannelToDisconnect(null)}
        onConfirm={handleDisconnectConfirm}
        isDisconnecting={isDisconnecting}
      />
    </DashboardLayout>
  );
};


