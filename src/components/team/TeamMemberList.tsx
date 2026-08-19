import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { WorkspaceMember, WorkspaceInvitation, TeamAuditLog } from '../../types/team';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Shield,
  CheckCircle2,
  RotateCcw,
  X,
  UserX,
  Crown,
  Lock,
  Briefcase,
  User,
  ShieldAlert,
  History,
  MoreVertical,
  Eye,
  Key,
  Trash2,
} from 'lucide-react';

interface TeamMemberListProps {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  auditLogs?: TeamAuditLog[];
  stats: { totalMembers: number; activeMembers: number; pendingInvitations: number };
  searchQuery: string;
  filterOption: string;
  actorRole?: 'owner' | 'admin' | 'manager' | 'support' | 'member';
  onSearchChange: (q: string) => void;
  onFilterChange: (f: string) => void;
  onInviteClick: () => void;
  onMemberClick?: (member: WorkspaceMember) => void;
  onChangeRoleClick: (member: WorkspaceMember) => void;
  onManagePermissionsClick: (member: WorkspaceMember) => void;
  onToggleStatusClick: (member: WorkspaceMember) => void;
  onRemoveMemberClick: (member: WorkspaceMember) => void;
  onResendInvite: (invitationId: string) => Promise<void>;
  onCancelInvite: (invitation: WorkspaceInvitation) => void;
  isLoading: boolean;
}

interface MenuPos {
  top: number;
  left: number;
  positionAbove: boolean;
}

// Position/Role badge helper
function renderRoleBadge(role: string) {
  switch (role.toLowerCase()) {
    case 'owner':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200">
          <Crown className="w-3 h-3 text-purple-600" /> Owner
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
          <Shield className="w-3 h-3 text-blue-600" /> Admin
        </span>
      );
    case 'manager':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
          <Briefcase className="w-3 h-3 text-amber-600" /> Manager
        </span>
      );
    case 'support':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200">
          <User className="w-3 h-3 text-indigo-600" /> Support
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold border border-gray-200">
          Member
        </span>
      );
  }
}

export const TeamMemberList: React.FC<TeamMemberListProps> = ({
  members,
  invitations,
  auditLogs = [],
  stats,
  searchQuery,
  filterOption,
  actorRole = 'owner',
  onSearchChange,
  onFilterChange,
  onInviteClick,
  onMemberClick,
  onChangeRoleClick,
  onManagePermissionsClick,
  onToggleStatusClick,
  onRemoveMemberClick,
  onResendInvite,
  onCancelInvite,
  isLoading,
}) => {
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'audit'>('members');

  // Portal Dropdown State & Refs
  const [activeMenuMember, setActiveMenuMember] = useState<WorkspaceMember | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, left: 0, positionAbove: false });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  const canManageTeam = actorRole === 'owner' || actorRole === 'admin';

  const calculateMenuPosition = (triggerEl: HTMLButtonElement) => {
    const rect = triggerEl.getBoundingClientRect();
    const menuWidth = 192; // 12rem (w-48)
    const estimatedMenuHeight = 210;

    const spaceBelow = window.innerHeight - rect.bottom;
    const positionAbove = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

    const top = positionAbove
      ? Math.max(10, rect.top - estimatedMenuHeight - 6)
      : Math.min(window.innerHeight - estimatedMenuHeight - 10, rect.bottom + 6);

    const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.right - menuWidth));

    return { top, left, positionAbove };
  };

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, member: WorkspaceMember) => {
    e.stopPropagation();
    if (activeMenuMember?.id === member.id) {
      setActiveMenuMember(null);
      return;
    }

    const trigger = e.currentTarget;
    activeTriggerRef.current = trigger;
    const pos = calculateMenuPosition(trigger);
    setMenuPos(pos);
    setActiveMenuMember(member);
  };

  useEffect(() => {
    if (!activeMenuMember) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        activeTriggerRef.current &&
        !activeTriggerRef.current.contains(event.target as Node)
      ) {
        setActiveMenuMember(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveMenuMember(null);
      }
    }

    function handleScrollOrResize() {
      if (activeTriggerRef.current) {
        const pos = calculateMenuPosition(activeTriggerRef.current);
        setMenuPos(pos);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeMenuMember]);

  const handleResend = async (id: string) => {
    setResendingId(id);
    try {
      await onResendInvite(id);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">Workspace Team Management</h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Manage workspace personnel, positions, permissions, and team access.
          </p>
        </div>

        {canManageTeam ? (
          <button
            onClick={onInviteClick}
            className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#e0771e] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Member</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold text-gray-600 flex items-center gap-1.5 self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5" /> Read-only Access ({actorRole.toUpperCase()})
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Active Members</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.activeMembers} Active</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Pending Invitations</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.pendingInvitations} Pending</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Your Position</p>
            <p className="text-xl font-extrabold text-[#171717] capitalize">{actorRole}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs (Members vs Audit Log) */}
      <div className="flex border-b border-[#E8E8E5] gap-4">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'members'
              ? 'border-[#FF8A2A] text-[#FF8A2A]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#171717]'
          }`}
        >
          <Users className="w-4 h-4" />
          Team Members ({members.length})
        </button>
        {auditLogs.length > 0 && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-[#FF8A2A] text-[#FF8A2A]'
                : 'border-transparent text-[#6B6B6B] hover:text-[#171717]'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Logs ({auditLogs.length})
          </button>
        )}
      </div>

      {activeTab === 'members' && (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E8E8E5] shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search members by name or email..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'active', 'inactive', 'admins', 'managers', 'support', 'members'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => onFilterChange(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer capitalize ${
                    filterOption === f
                      ? 'bg-[#171717] text-white shadow-2xs'
                      : 'bg-[#FAF9F6] text-[#6B6B6B] hover:text-[#171717] border border-[#E8E8E5]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* ACTIVE TEAM MEMBERS LIST */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-[#E8E8E5] flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[#171717]">Workspace Members</h3>
              <span className="text-xs font-bold text-[#6B6B6B]">{members.length} Total</span>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-2xl" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-[#FF8A2A] mx-auto" />
                <h4 className="font-bold text-sm text-[#171717]">No team members yet.</h4>
                <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto">
                  Invite your team to collaborate in Xia Chat customer support conversations.
                </p>
                {canManageTeam && (
                  <button
                    onClick={onInviteClick}
                    className="px-4 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#e0771e] text-white text-xs font-bold cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 inline mr-1" /> Invite Member
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E8E5] bg-[#FAF9F6] text-[#6B6B6B] text-[10px] uppercase font-extrabold">
                        <th className="p-4">Member</th>
                        <th className="p-4">Position / Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Joined Date</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E5]/70">
                      {members.map((m) => {
                        const isActive = m.status === 'active';
                        return (
                          <tr
                            key={m.id}
                            onClick={() => onMemberClick && onMemberClick(m)}
                            className="hover:bg-[#FAF9F6]/80 transition-colors cursor-pointer"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-2xl bg-[#171717] text-white font-bold flex items-center justify-center text-xs">
                                  {m.avatar}
                                </div>
                                <div>
                                  <p className="font-extrabold text-[#171717]">
                                    {m.name} {m.isCurrentUser && '(You)'}
                                  </p>
                                  <p className="text-[11px] text-[#6B6B6B]">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">{renderRoleBadge(m.role)}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                                  </>
                                ) : (
                                  <>
                                    <ShieldAlert className="w-3 h-3 text-amber-600" /> Inactive
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="p-4 text-[#6B6B6B]">
                              {new Date(m.joinedAt).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => handleOpenMenu(e, m)}
                                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                                  activeMenuMember?.id === m.id
                                    ? 'bg-[#FFF0E5] text-[#FF8A2A]'
                                    : 'text-gray-500 hover:text-[#171717] hover:bg-gray-100'
                                }`}
                                title="Member Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View (390x844 & 375x812 Viewports) */}
                <div className="md:hidden divide-y divide-[#E8E8E5]">
                  {members.map((m) => {
                    const isActive = m.status === 'active';
                    return (
                      <div
                        key={m.id}
                        onClick={() => onMemberClick && onMemberClick(m)}
                        className="p-4 space-y-3 cursor-pointer hover:bg-[#FAF9F6] relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#171717] text-white font-extrabold flex items-center justify-center text-sm">
                              {m.avatar}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-[#171717] text-sm">
                                {m.name} {m.isCurrentUser && '(You)'}
                              </h4>
                              <p className="text-xs text-[#6B6B6B]">{m.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderRoleBadge(m.role)}
                            <button
                              onClick={(e) => handleOpenMenu(e, m)}
                              className={`p-1 rounded-xl transition-colors cursor-pointer ${
                                activeMenuMember?.id === m.id
                                  ? 'bg-[#FFF0E5] text-[#FF8A2A]'
                                  : 'text-gray-500 hover:text-[#171717] hover:bg-gray-100'
                              }`}
                              title="Member Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#6B6B6B] pt-1">
                          <span>Joined: {new Date(m.joinedAt).toLocaleDateString()}</span>
                          <span
                            className={`font-bold flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* PENDING INVITATIONS LIST */}
          {invitations.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-[#E8E8E5] flex items-center justify-between">
                <h3 className="font-extrabold text-base text-[#171717] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600" /> Pending Invitations
                </h3>
                <span className="text-xs font-bold text-[#6B6B6B]">{invitations.length} Pending</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E8E5] bg-[#FAF9F6] text-[#6B6B6B] text-[10px] uppercase font-extrabold">
                      <th className="p-4">Invited Email</th>
                      <th className="p-4">Position</th>
                      <th className="p-4">Invited By</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E8E5]/70">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                        <td className="p-4 font-extrabold text-[#171717]">{inv.email}</td>
                        <td className="p-4">{renderRoleBadge(inv.role)}</td>
                        <td className="p-4 text-[#6B6B6B]">{inv.invitedByName}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              inv.status === 'expired' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status === 'expired' ? 'Expired' : 'Pending Invitation'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {canManageTeam && (
                            <>
                              <button
                                onClick={() => handleResend(inv.id)}
                                disabled={resendingId === inv.id}
                                className="px-2.5 py-1 rounded-xl border border-[#E8E8E5] hover:bg-white text-xs font-bold text-[#171717] cursor-pointer disabled:opacity-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                                {resendingId === inv.id ? 'Sending...' : 'Resend'}
                              </button>
                              <button
                                onClick={() => onCancelInvite(inv)}
                                className="p-1.5 rounded-xl border border-[#E8E8E5] hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer"
                                title="Cancel Invitation"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-[#E8E8E5] flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[#171717] flex items-center gap-2">
              <History className="w-4 h-4 text-[#FF8A2A]" /> Workspace Team Audit History
            </h3>
            <span className="text-xs font-bold text-[#6B6B6B]">{auditLogs.length} Events</span>
          </div>

          <div className="divide-y divide-[#E8E8E5] text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-[#FAF9F6]">
                <div className="space-y-0.5">
                  <p className="font-bold text-[#171717]">
                    <span className="text-[#FF8A2A]">{log.actorName}</span>: {log.details} (<span className="capitalize">{log.targetName}</span>)
                  </p>
                  <p className="text-[11px] text-[#6B6B6B] font-mono capitalize">Action: {log.action.replace('_', ' ')}</p>
                </div>
                <span className="text-[10px] text-[#6B6B6B] shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REACT PORTAL ACTION DROPDOWN */}
      {activeMenuMember &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
            }}
            className="fixed w-48 bg-white border border-[#E8E8E5] rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 text-left animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const m = activeMenuMember;
                setActiveMenuMember(null);
                if (onMemberClick) onMemberClick(m);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-gray-500" /> View Member
            </button>

            {canManageTeam && activeMenuMember.role !== 'owner' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const m = activeMenuMember;
                    setActiveMenuMember(null);
                    onChangeRoleClick(m);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FFF0E5] hover:text-[#FF8A2A] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#FF8A2A]" /> Edit Position
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const m = activeMenuMember;
                    setActiveMenuMember(null);
                    onManagePermissionsClick(m);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-blue-600" /> Manage Permissions
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const m = activeMenuMember;
                    setActiveMenuMember(null);
                    onToggleStatusClick(m);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    activeMenuMember.status === 'active'
                      ? 'text-amber-700 hover:bg-amber-50'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {activeMenuMember.status === 'active' ? (
                    <>
                      <UserX className="w-3.5 h-3.5 text-amber-600" /> Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reactivate
                    </>
                  )}
                </button>

                <div className="border-t border-[#E8E8E5] my-1" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const m = activeMenuMember;
                    setActiveMenuMember(null);
                    onRemoveMemberClick(m);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Remove Member
                </button>
              </>
            )}

            {activeMenuMember.role === 'owner' && (
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-purple-700 bg-purple-50 rounded-xl flex items-center gap-1 border border-purple-200">
                <Crown className="w-3 h-3 text-purple-600" /> Primary Owner
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};


