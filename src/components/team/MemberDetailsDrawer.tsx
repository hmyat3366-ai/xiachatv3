import React from 'react';
import type { WorkspaceMember } from '../../types/team';
import { X, Shield, Crown, User, Calendar, Clock, Mail, CheckCircle2, UserX, UserCheck, ShieldAlert, Briefcase } from 'lucide-react';

interface MemberDetailsDrawerProps {
  member: WorkspaceMember | null;
  isOpen: boolean;
  onClose: () => void;
  onChangeRole: (member: WorkspaceMember) => void;
  onToggleStatus: (member: WorkspaceMember) => void;
  onRemoveMember: (member: WorkspaceMember) => void;
  canManage: boolean;
}

export const MemberDetailsDrawer: React.FC<MemberDetailsDrawerProps> = ({
  member,
  isOpen,
  onClose,
  onChangeRole,
  onToggleStatus,
  onRemoveMember,
  canManage,
}) => {
  if (!isOpen || !member) return null;

  const isOwner = member.role === 'owner';
  const isActive = member.status === 'active';

  const renderRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
            <Crown className="w-3.5 h-3.5 text-purple-600" /> Primary Owner
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
            <Shield className="w-3.5 h-3.5 text-blue-600" /> Admin
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
            <Briefcase className="w-3.5 h-3.5 text-amber-600" /> Manager
          </span>
        );
      case 'support':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
            <User className="w-3.5 h-3.5 text-indigo-600" /> Support Agent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
            <User className="w-3.5 h-3.5 text-gray-500" /> Member
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto transform transition-transform duration-300">
        {/* Header */}
        <div>
          <div className="p-5 border-b border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6]">
            <h2 className="text-base font-extrabold text-[#171717]">Member Profile & Details</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Overview */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#171717] text-white text-xl font-extrabold flex items-center justify-center shadow-xs">
                {member.avatar || member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#171717]">
                  {member.name} {member.isCurrentUser && '(You)'}
                </h3>
                <p className="text-xs text-[#6B6B6B] flex items-center gap-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {member.email}
                </p>
                <div className="mt-2">{renderRoleBadge(member.role)}</div>
              </div>
            </div>

            <div className="border-t border-[#E8E8E5] pt-5 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5]">
                <div className="flex items-center gap-2 text-[#6B6B6B]">
                  {isActive ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-amber-600" />}
                  <span className="font-semibold">Workspace Status</span>
                </div>
                <span
                  className={`font-extrabold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full border ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {member.status === 'suspended' ? 'Inactive' : member.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5]">
                <div className="flex items-center gap-2 text-[#6B6B6B]">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Joined Workspace</span>
                </div>
                <span className="font-bold text-[#171717]">
                  {new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5]">
                <div className="flex items-center gap-2 text-[#6B6B6B]">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">Last Active</span>
                </div>
                <span className="font-bold text-[#171717]">
                  {new Date(member.lastActiveAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                  {new Date(member.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Role Permissions Summary */}
            <div className="p-4 rounded-xl bg-[#FFF0E5] border border-[#FF8A2A]/30 text-xs space-y-2">
              <p className="font-bold text-[#171717] flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#FF8A2A]" /> Workspace Permissions ({member.role.toUpperCase()})
              </p>
              <ul className="text-[11px] text-[#6B6B6B] space-y-1 list-disc pl-4">
                {isOwner && (
                  <>
                    <li>Full ownership & control over workspace settings and billing</li>
                    <li>Invite, promote, deactivate, or remove team members</li>
                    <li>Access all customer chats, knowledge sources, and analytics</li>
                  </>
                )}
                {member.role === 'admin' && (
                  <>
                    <li>Full management access to channels, AI agents, and knowledge sources</li>
                    <li>Manage team members and invite new personnel</li>
                    <li>View system reporting and analytics</li>
                  </>
                )}
                {member.role === 'manager' && (
                  <>
                    <li>Manage customer conversations & support operations</li>
                    <li>Manage customer profiles and notes</li>
                    <li>View team performance analytics</li>
                  </>
                )}
                {member.role === 'support' && (
                  <>
                    <li>Handle assigned customer chats in Inbox</li>
                    <li>View customer details and internal notes</li>
                    <li>Access Knowledge Base references</li>
                  </>
                )}
                {member.role === 'member' && (
                  <>
                    <li>Participate in assigned chats and internal Team Chat</li>
                    <li>Access basic workspace inbox view</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Action Controls Footer */}
        {canManage && !isOwner && (
          <div className="p-5 border-t border-[#E8E8E5] bg-[#FAF9F6] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onChangeRole(member);
                }}
                className="py-2 px-3 rounded-xl border border-[#E8E8E5] bg-white hover:bg-gray-50 font-bold text-xs text-[#171717] cursor-pointer transition-colors"
              >
                Change Position
              </button>
              <button
                onClick={() => {
                  onClose();
                  onToggleStatus(member);
                }}
                className={`py-2 px-3 rounded-xl border font-bold text-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                <span>{isActive ? 'Deactivate' : 'Reactivate'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onRemoveMember(member);
              }}
              className="w-full py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 font-bold text-xs text-red-700 cursor-pointer transition-colors"
            >
              Remove Member from Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
