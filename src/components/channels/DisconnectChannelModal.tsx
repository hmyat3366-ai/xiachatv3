import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DisconnectChannelModalProps {
  isOpen: boolean;
  channelName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDisconnecting: boolean;
}

export const DisconnectChannelModal: React.FC<DisconnectChannelModalProps> = ({
  isOpen,
  channelName,
  onClose,
  onConfirm,
  isDisconnecting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-[#171717]">Disconnect "{channelName}"?</h3>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            New messages from this channel will no longer appear in Xia Chat. Existing conversation history will remain safely preserved in your Inbox.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDisconnecting}
            className="px-4 py-2 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDisconnecting}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect Channel'}
          </button>
        </div>
      </div>
    </div>
  );
};
