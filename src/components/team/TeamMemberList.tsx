import React, { useState } from 'react';
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
  Key,
  Trash2,
  Activity,
  Sliders,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// Role badge helper with distinct styling
function renderRoleBadge(role: string) {
  switch ((role || '').toLowerCase()) {
    case 'owner':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-200 shadow-2xs">
          <Crown className="w-3 h-3 text-purple-600" /> Owner
        </span>
      );
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-200 shadow-2xs">
          <Shield className="w-3 h-3 text-blue-600" /> Admin
        </span>
      );
    case 'manager':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200 shadow-2xs">
          <Briefcase className="w-3 h-3 text-amber-600" /> Manager
        </span>
      );
    case 'support':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black border border-indigo-200 shadow-2xs">
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

// Status badge helper
function renderMemberStatus(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-200">
          <Clock className="w-2.5 h-2.5" /> Pending
        </span>
      );
    case 'suspended':
    case 'inactive':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-red-50 text-red-700 text-[10px] font-black border border-red-200">
          Suspended
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
          {status}
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
  onChangeRoleClick,
  onManagePermissionsClick,
  onToggleStatusClick,
  onRemoveMemberClick,
  onResendInvite,
  onCancelInvite,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'audit'>('members');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const canManageTeam = actorRole === 'owner' || actorRole === 'admin';

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterOption === 'all' || m.role === filterOption || m.status === filterOption;
    return matchesSearch && matchesFilter;
  });

  const handleResend = async (invId: string) => {
    try {
      setResendingId(invId);
      await onResendInvite(invId);
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & PRIMARY ACTION
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">Team & Access</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black">
              {stats.totalMembers} Members
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Manage workspace members, role assignments, permissions, invitations, and security audit logs.
          </p>
        </div>

        {canManageTeam && (
          <button
            onClick={onInviteClick}
            className="px-4 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] active:bg-[#C2550A] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Teammate</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. METRICS STATS SUMMARY
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Active Workspace Members</p>
            <p className="text-xl font-black text-[#171717]">
              {stats.activeMembers} <span className="text-xs text-gray-400 font-normal">/ {stats.totalMembers} Total</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shadow-2xs">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Pending Email Invites</p>
            <p className="text-xl font-black text-[#171717]">{stats.pendingInvitations || invitations.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Security Audit Logs</p>
            <p className="text-xl font-black text-[#171717]">{auditLogs.length} Events</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TABS SWITCHER (MEMBERS / PENDING INVITES / AUDIT LOGS)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-[#E8E8E5] shadow-2xs overflow-x-auto no-scrollbar">
        {[
          { id: 'members', label: `Team Members (${members.length})`, icon: Users },
          { id: 'invites', label: `Pending Invites (${invitations.length})`, icon: Mail },
          { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. TAB 1: TEAM MEMBERS LIST
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Search & Role Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-[#E8E8E5] shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search teammates by name or email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] focus:bg-white border border-[#E8E8E5] rounded-xl text-xs text-[#171717] placeholder:text-gray-400 focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 self-stretch sm:self-auto overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Roles' },
                { id: 'admin', label: 'Admins' },
                { id: 'manager', label: 'Managers' },
                { id: 'support', label: 'Support' },
                { id: 'member', label: 'Members' },
              ].map((r) => {
                const isSelected = filterOption === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => onFilterChange(r.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#171717] text-white shadow-2xs'
                        : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Members Table */}
          {isLoading ? (
            <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-[#E8E8E5]">
              <div className="w-7 h-7 border-2 border-[#FF8A2A] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#6B6B6B] font-medium">Syncing team members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-[#E8E8E5]">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-2xs">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#171717]">No team members match query</h3>
              <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto">
                Try adjusting your search terms or role filters.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8E8E5] overflow-hidden shadow-2xs">
              <div className="divide-y divide-[#E8E8E5]">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#FAF9F6] transition-colors"
                  >
                    {/* User Info & Avatar */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                        {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs sm:text-sm text-[#171717] truncate">
                            {member.name}
                          </h3>
                          {member.isCurrentUser && (
                            <span className="px-2 py-0.2 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6B6B6B] truncate font-medium">{member.email}</p>
                      </div>
                    </div>

                    {/* Role & Status & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:block">{renderRoleBadge(member.role)}</div>
                      <div className="hidden md:block">{renderMemberStatus(member.status)}</div>

                      {/* Actions Menu */}
                      {canManageTeam && !member.isCurrentUser && member.role !== 'owner' && (
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === member.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E8E8E5] rounded-2xl shadow-xl p-1.5 z-30 space-y-0.5">
                              <button
                                onClick={() => {
                                  onChangeRoleClick(member);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 cursor-pointer"
                              >
                                <Shield className="w-3.5 h-3.5 text-[#FF8A2A]" />
                                <span>Change Role</span>
                              </button>

                              <button
                                onClick={() => {
                                  onManagePermissionsClick(member);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 cursor-pointer"
                              >
                                <Key className="w-3.5 h-3.5 text-blue-600" />
                                <span>Edit Permissions</span>
                              </button>

                              <button
                                onClick={() => {
                                  onToggleStatusClick(member);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#171717] hover:bg-[#FAF9F6] flex items-center gap-2 cursor-pointer"
                              >
                                <UserX className="w-3.5 h-3.5 text-amber-600" />
                                <span>{member.status === 'active' ? 'Suspend Access' : 'Reactivate'}</span>
                              </button>

                              <div className="border-t border-[#E8E8E5] my-1" />

                              <button
                                onClick={() => {
                                  onRemoveMemberClick(member);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove Member</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. TAB 2: PENDING INVITATIONS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <div className="p-16 text-center space-y-4 bg-white rounded-3xl border border-[#E8E8E5]">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center mx-auto shadow-2xs">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#171717]">No pending invitations</h3>
              <p className="text-xs text-[#6B6B6B] max-w-xs mx-auto">
                Invite team members by email to collaborate on customer support and knowledge bases.
              </p>
              {canManageTeam && (
                <button
                  onClick={onInviteClick}
                  className="px-4 py-2 rounded-xl bg-[#FF8A2A] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Teammate</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8E8E5] overflow-hidden shadow-2xs divide-y divide-[#E8E8E5]">
              {invitations.map((inv) => (
                <div key={inv.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs sm:text-sm text-[#171717]">{inv.email}</p>
                      {renderRoleBadge(inv.role)}
                    </div>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                      Invited by {inv.invitedByName || 'Admin'} · Sent on{' '}
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {canManageTeam && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResend(inv.id)}
                        disabled={resendingId === inv.id}
                        className="px-3 py-1.5 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] transition-colors cursor-pointer"
                      >
                        {resendingId === inv.id ? 'Sending...' : 'Resend'}
                      </button>

                      <button
                        onClick={() => onCancelInvite(inv)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Cancel Invitation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. TAB 3: AUDIT LOGS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {auditLogs.length === 0 ? (
            <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-[#E8E8E5]">
              <History className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-[#6B6B6B]">No security audit events recorded yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8E8E5] overflow-hidden shadow-2xs divide-y divide-[#E8E8E5]">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#171717]">{log.actorName || 'Workspace Member'}</span>
                      <span className="px-2 py-0.2 rounded bg-blue-50 text-blue-700 font-mono text-[10px]">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-[#6B6B6B]">{log.details || `Modified permissions for ${log.targetName}`}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
