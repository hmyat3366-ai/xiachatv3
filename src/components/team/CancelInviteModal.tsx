import React from 'react';
import type { WorkspaceInvitation } from '../../types/team';
import { AlertTriangle, X } from 'lucide-react';

interface CancelInviteModalProps {
  invitation: WorkspaceInvitation | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (id: string) => Promise<void>;
}

export const CancelInviteModal: React.FC<CancelInviteModalProps> = ({
  invitation,
  isOpen,
  onClose,
  onConfirmCancel,
}) => {
  const [isCancelling, setIsCancelling] = React.useState(false);

  if (!isOpen || !invitation) return null;

  const handleConfirm = async () => {
    setIsCancelling(true);
    try {
      await onConfirmCancel(invitation.id);
      onClose();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E8E8E5] space-y-5 transform transition-all">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-[#171717]">Cancel Invitation?</h3>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Are you sure you want to cancel the invitation sent to{' '}
            <strong className="text-[#171717] font-extrabold">{invitation.email}</strong>? The invitation link will immediately become invalid.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-xs font-bold text-[#6B6B6B] hover:text-[#171717] hover:bg-gray-50 cursor-pointer"
          >
            Keep Invitation
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCancelling}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
};
