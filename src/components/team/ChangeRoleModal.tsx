import React, { useState, useEffect } from 'react';
import type { WorkspaceMember, WorkspaceRole } from '../../types/team';
import { X, AlertTriangle, Check, Loader2 } from 'lucide-react';

interface ChangeRoleModalProps {
  isOpen: boolean;
  member: WorkspaceMember | null;
  onClose: () => void;
  onConfirm: (role: WorkspaceRole, isTransferOwner: boolean) => Promise<void>;
  isSaving: boolean;
}

export const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  isOpen,
  member,
  onClose,
  onConfirm,
  isSaving,
}) => {
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('member');
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const isCurrentOwner = member.role === 'owner';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(selectedRole, selectedRole === 'owner');
  };

  const getPermissionSummaryItems = (role: WorkspaceRole) => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Manage workspace settings & channels', allowed: true },
          { label: 'Manage team members & positions', allowed: true },
          { label: 'Manage AI Agents & Knowledge Base', allowed: true },
          { label: 'View performance analytics', allowed: true },
          { label: 'Manage workspace billing', allowed: false },
          { label: 'Demote primary workspace owner', allowed: false },
        ];
      case 'manager':
        return [
          { label: 'Manage inbox conversations', allowed: true },
          { label: 'Manage customer profiles & notes', allowed: true },
          { label: 'View team analytics & reports', allowed: true },
          { label: 'Manage workspace billing', allowed: false },
          { label: 'Manage workspace owner', allowed: false },
        ];
      case 'support':
        return [
          { label: 'Handle assigned conversations', allowed: true },
          { label: 'View customer profiles', allowed: true },
          { label: 'View Knowledge Base resources', allowed: true },
          { label: 'Manage team members', allowed: false },
          { label: 'Manage workspace billing', allowed: false },
        ];
      case 'member':
        return [
          { label: 'Participate in assigned chats & Team Chat', allowed: true },
          { label: 'Access basic workspace inbox view', allowed: true },
          { label: 'Manage customer database', allowed: false },
          { label: 'Manage team members or roles', allowed: false },
          { label: 'Manage workspace billing', allowed: false },
        ];
      case 'owner':
        return [
          { label: 'Full primary workspace control', allowed: true },
          { label: 'Manage all team members & roles', allowed: true },
          { label: 'Manage workspace billing & subscription', allowed: true },
          { label: 'Transfer ownership or delete workspace', allowed: true },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-md w-full p-6 sm:p-8 shadow-xl space-y-5">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] font-bold flex items-center justify-center text-sm border border-[#FF8A2A]/20">
              {member.avatar || member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#171717]">Edit Member</h2>
              <p className="text-xs font-bold text-[#171717]">{member.name}</p>
              <p className="text-[11px] text-[#6B6B6B]">{member.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isCurrentOwner ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-extrabold block flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Primary Workspace Owner
              </span>
              <p className="text-[11px] leading-relaxed">
                This user is the primary workspace Owner. To transfer ownership, select Owner role below and confirm the transfer.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#171717]">
                Position / Role:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <label
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === 'admin' ? 'bg-[#FFF0E5] border-[#FF8A2A]' : 'border-[#E8E8E5] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-[#171717] block">Admin</span>
                    <span className="text-[10px] text-[#6B6B6B]">Full management access (Channels, AI, Knowledge, Team)</span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'admin'}
                    onChange={() => setSelectedRole('admin')}
                    className="w-4 h-4 accent-[#FF8A2A]"
                  />
                </label>

                <label
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === 'manager' ? 'bg-[#FFF0E5] border-[#FF8A2A]' : 'border-[#E8E8E5] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-[#171717] block">Manager</span>
                    <span className="text-[10px] text-[#6B6B6B]">Manage inbox operations, customers & analytics</span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'manager'}
                    onChange={() => setSelectedRole('manager')}
                    className="w-4 h-4 accent-[#FF8A2A]"
                  />
                </label>

                <label
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === 'support' ? 'bg-[#FFF0E5] border-[#FF8A2A]' : 'border-[#E8E8E5] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-[#171717] block">Support</span>
                    <span className="text-[10px] text-[#6B6B6B]">Handle assigned chats & view knowledge base</span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'support'}
                    onChange={() => setSelectedRole('support')}
                    className="w-4 h-4 accent-[#FF8A2A]"
                  />
                </label>

                <label
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === 'member' ? 'bg-[#FFF0E5] border-[#FF8A2A]' : 'border-[#E8E8E5] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-[#171717] block">Member</span>
                    <span className="text-[10px] text-[#6B6B6B]">Standard workspace participant & Team Chat access</span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'member'}
                    onChange={() => setSelectedRole('member')}
                    className="w-4 h-4 accent-[#FF8A2A]"
                  />
                </label>

                <label
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedRole === 'owner' ? 'bg-[#FFF0E5] border-[#FF8A2A]' : 'border-[#E8E8E5] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs text-purple-700 block">Owner (Transfer Ownership)</span>
                    <span className="text-[10px] text-[#6B6B6B]">Grant primary ownership of workspace</span>
                  </div>
                  <input
                    type="radio"
                    name="role"
                    checked={selectedRole === 'owner'}
                    onChange={() => setSelectedRole('owner')}
                    className="w-4 h-4 accent-[#FF8A2A]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Dynamic Permission Summary with ✓ and ✕ */}
          <div className="p-3 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl space-y-1.5">
            <div className="text-xs font-bold text-[#171717] capitalize">
              {selectedRole} Position Summary:
            </div>
            <div className="space-y-1">
              {getPermissionSummaryItems(selectedRole).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px]">
                  {item.allowed ? (
                    <span className="text-emerald-600 font-bold">✓</span>
                  ) : (
                    <span className="text-rose-500 font-bold">✕</span>
                  )}
                  <span className={item.allowed ? 'text-[#171717] font-medium' : 'text-[#6B6B6B]'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {selectedRole === 'owner' && !isCurrentOwner && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Transfer Workspace Ownership?
              </p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                This will give full workspace control to {member.name} and change your role to Admin.
              </p>
              <label className="flex items-center gap-2 pt-1 font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmTransfer}
                  onChange={(e) => setConfirmTransfer(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A]"
                />
                <span>I understand and confirm ownership transfer</span>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (selectedRole === 'owner' && !isCurrentOwner && !confirmTransfer)}
              className="px-5 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#e0771e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


