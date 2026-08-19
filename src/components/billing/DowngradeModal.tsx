import React from 'react';
import type { DowngradeConflict } from '../../types/billing';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface DowngradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDowngrade: () => void;
  targetPlanName: string;
  conflicts: DowngradeConflict[];
  isDowngrading: boolean;
}

export const DowngradeModal: React.FC<DowngradeModalProps> = ({
  isOpen,
  onClose,
  onConfirmDowngrade,
  targetPlanName,
  conflicts,
  isDowngrading,
}) => {
  if (!isOpen) return null;

  const hasConflicts = conflicts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-xl space-y-6 z-10">
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
          <h3 className="text-xl font-extrabold text-[#171717]">
            Downgrade to {targetPlanName} Plan?
          </h3>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            Your current plan includes features and resource capacities that may not be available on the {targetPlanName} plan.
          </p>
        </div>

        {hasConflicts ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="text-xs font-extrabold">Resource Limit Conflicts Detected</p>
            </div>
            <p className="text-xs text-rose-700">
              You must resolve the following active resources before downgrading to {targetPlanName}:
            </p>
            <ul className="space-y-2">
              {conflicts.map((c, idx) => (
                <li key={idx} className="p-2.5 rounded-xl bg-white/80 border border-rose-200 text-xs">
                  <div className="font-extrabold text-rose-900">{c.resource}</div>
                  <div className="text-[11px] text-rose-700 mt-0.5">
                    Currently using <span className="font-bold">{c.current}</span>, but target plan allows max <span className="font-bold">{c.allowed}</span>.
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#6B6B6B]">
            All current active resources fall within the limits of the {targetPlanName} plan.
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isDowngrading}
            className="flex-1 py-2.5 rounded-xl bg-white border border-[#E8E8E5] hover:bg-[#FAF9F6] text-[#171717] text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmDowngrade}
            disabled={hasConflicts || isDowngrading}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              hasConflicts
                ? 'bg-gray-300 opacity-50 cursor-not-allowed'
                : 'bg-[#171717] hover:bg-black'
            }`}
          >
            {isDowngrading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Confirm Downgrade</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
