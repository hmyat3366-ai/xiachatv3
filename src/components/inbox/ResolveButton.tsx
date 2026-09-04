import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import type { ConversationStatus } from '../../types/inbox';

interface ResolveButtonProps {
  status: ConversationStatus | string;
  onResolve: () => Promise<void> | void;
  onReopen: () => Promise<void> | void;
  customerName?: string;
  disabled?: boolean;
  className?: string;
}

export const ResolveButton: React.FC<ResolveButtonProps> = ({
  status,
  onResolve,
  onReopen,
  customerName = 'this customer',
  disabled = false,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const norm = (status || '').toUpperCase();
  const isResolved = norm === 'RESOLVED' || norm === 'CLOSED';

  const handleConfirmResolve = async () => {
    try {
      setIsLoading(true);
      await onResolve();
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReopen = async () => {
    try {
      setIsLoading(true);
      await onReopen();
    } finally {
      setIsLoading(false);
    }
  };

  if (isResolved) {
    return (
      <button
        type="button"
        onClick={handleReopen}
        disabled={disabled || isLoading}
        className={`px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border border-slate-300 shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title="Reopen this resolved conversation"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
        ) : (
          <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
        )}
        <span>Reopen</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        disabled={disabled || isLoading}
        className={`px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title="Resolve this conversation"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Resolve</span>
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Resolve this conversation?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    This will mark the conversation with <strong className="text-slate-800">{customerName}</strong> as completed and move it to the Resolved queue. Conversation history will be preserved, and if the customer messages again, it will automatically reopen.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Resolve</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
