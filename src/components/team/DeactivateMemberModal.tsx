import React from 'react';
import type { WorkspaceMember } from '../../types/team';
import { UserX, UserCheck, X, AlertTriangle, Loader2 } from 'lucide-react';

interface DeactivateMemberModalProps {
  isOpen: boolean;
  member: WorkspaceMember | null;
  onClose: () => void;
  onConfirm: (member: WorkspaceMember, targetStatus: 'suspended' | 'active') => Promise<void>;
  isProcessing: boolean;
}

export const DeactivateMemberModal: React.FC<DeactivateMemberModalProps> = ({
  isOpen,
  member,
  onClose,
  onConfirm,
  isProcessing,
}) => {
  if (!isOpen || !member) return null;

  const isDeactivating = member.status === 'active';
  const targetStatus = isDeactivating ? 'suspended' : 'active';

  const handleConfirm = async () => {
    await onConfirm(member, targetStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-md w-full p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                isDeactivating ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {isDeactivating ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#171717]">
                {isDeactivating ? `Deactivate ${member.name}?` : `Reactivate ${member.name}?`}
              </h2>
              <p className="text-xs text-[#6B6B6B]">{member.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
          isDeactivating ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-green-50 border-green-200 text-green-900'
        }`}>
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{isDeactivating ? 'Deactivation Warning' : 'Reactivation Info'}</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {isDeactivating
              ? 'Deactivated members cannot access this workspace or Team Chat until they are reactivated. Their account data remains saved in the workspace.'
              : 'Reactivating this member will restore their full access to this workspace and internal Team Chat.'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E8E5]">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B6B6B] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors ${
              isDeactivating ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isProcessing ? 'Updating...' : isDeactivating ? 'Deactivate member' : 'Reactivate member'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
