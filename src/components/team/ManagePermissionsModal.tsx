import React, { useState, useEffect } from 'react';
import type { WorkspaceMember } from '../../types/team';
import { Key, X, Shield, Check, Info, Loader2 } from 'lucide-react';

interface ManagePermissionsModalProps {
  isOpen: boolean;
  member: WorkspaceMember | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

interface PermissionCategory {
  category: string;
  items: { key: string; label: string }[];
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    category: 'INBOX',
    items: [
      { key: 'inbox_view', label: 'View conversations' },
      { key: 'inbox_reply', label: 'Reply to customers' },
      { key: 'inbox_assign', label: 'Assign conversations' },
    ],
  },
  {
    category: 'CUSTOMERS',
    items: [
      { key: 'customers_view', label: 'View customers' },
      { key: 'customers_edit', label: 'Edit customers' },
    ],
  },
  {
    category: 'AI',
    items: [
      { key: 'ai_manage_agents', label: 'Manage AI Agents' },
      { key: 'ai_edit_kb', label: 'Edit Knowledge Base' },
    ],
  },
  {
    category: 'ANALYTICS',
    items: [{ key: 'analytics_view', label: 'View analytics' }],
  },
  {
    category: 'TEAM',
    items: [
      { key: 'team_view', label: 'View team members' },
      { key: 'team_invite', label: 'Invite members' },
      { key: 'team_manage_roles', label: 'Manage member roles' },
    ],
  },
  {
    category: 'WORKSPACE',
    items: [
      { key: 'workspace_settings', label: 'Manage workspace settings' },
      { key: 'workspace_billing', label: 'Manage billing' },
    ],
  },
];

function getEffectivePermissionsForRole(role: string): Record<string, boolean> {
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';

  return {
    inbox_view: true,
    inbox_reply: true,
    inbox_assign: isOwner || isAdmin || isManager,
    customers_view: true,
    customers_edit: isOwner || isAdmin || isManager,
    ai_manage_agents: isOwner || isAdmin,
    ai_edit_kb: isOwner || isAdmin,
    analytics_view: isOwner || isAdmin || isManager,
    team_view: true,
    team_invite: isOwner || isAdmin,
    team_manage_roles: isOwner || isAdmin,
    workspace_settings: isOwner || isAdmin,
    workspace_billing: isOwner,
  };
}

export const ManagePermissionsModal: React.FC<ManagePermissionsModalProps> = ({
  isOpen,
  member,
  onClose,
  onSave,
  isSaving,
}) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (member) {
      setPermissions(getEffectivePermissionsForRole(member.role));
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleToggle = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-xl w-full p-6 sm:p-8 shadow-xl space-y-5 max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#171717]">Manage Permissions</h2>
              <p className="text-xs text-[#6B6B6B]">
                {member.name} ({member.email}) • <span className="capitalize text-[#FF8A2A] font-bold">{member.role}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-3 bg-[#FAF9F6] border border-[#E8E8E5] rounded-2xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#171717]">
            <Info className="w-3.5 h-3.5 text-[#FF8A2A]" />
            <span>Role-Based Permission Derived</span>
          </div>
          <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
            Effective permissions are currently derived from the <span className="font-bold capitalize text-[#171717]">{member.role}</span> position. Custom granular overrides will be persisted per workspace.
          </p>
        </div>

        {/* Permission Categories List */}
        <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PERMISSION_CATEGORIES.map((cat) => (
              <div key={cat.category} className="p-3.5 rounded-2xl border border-[#E8E8E5] bg-[#FAF9F6]/50 space-y-2">
                <h4 className="text-[11px] font-extrabold text-[#171717] tracking-wider uppercase border-b border-[#E8E8E5] pb-1.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#FF8A2A]" /> {cat.category}
                </h4>
                <div className="space-y-1.5">
                  {cat.items.map((item) => {
                    const isChecked = Boolean(permissions[item.key]);
                    return (
                      <label
                        key={item.key}
                        className="flex items-center justify-between text-xs text-[#171717] cursor-pointer hover:bg-white p-1 rounded-lg transition-colors"
                      >
                        <span className="font-medium text-[11px]">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(item.key)}
                          className="w-4 h-4 accent-[#FF8A2A] rounded cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8E5]">
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
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#e0771e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Permissions'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
