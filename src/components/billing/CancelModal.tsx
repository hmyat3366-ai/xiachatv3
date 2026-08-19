import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: () => void;
  isCanceling: boolean;
  effectiveDate?: string;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  onConfirmCancel,
  isCanceling,
  effectiveDate,
}) => {
  if (!isOpen) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'the end of the current billing cycle';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-xl space-y-6 z-10">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-[#171717] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-[#171717]">Cancel your subscription?</h3>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            Your subscription will remain fully active with all plan features until{' '}
            <span className="font-bold text-[#171717]">{formatDate(effectiveDate)}</span>.
          </p>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            After this date, your workspace will automatically transition to the Free plan. No workspace data will be deleted.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isCanceling}
            className="flex-1 py-2.5 rounded-xl bg-white border border-[#E8E8E5] hover:bg-[#FAF9F6] text-[#171717] text-xs font-bold transition-all cursor-pointer"
          >
            Keep Subscription
          </button>
          <button
            onClick={onConfirmCancel}
            disabled={isCanceling}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isCanceling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Canceling...</span>
              </>
            ) : (
              <span>Cancel Subscription</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
