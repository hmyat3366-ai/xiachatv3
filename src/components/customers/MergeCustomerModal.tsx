import React, { useState } from 'react';
import type { Customer } from '../../types/customer';
import { Users, X, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

interface MergeCustomerModalProps {
  isOpen: boolean;
  currentCustomer: Customer;
  allCustomers: Customer[];
  onClose: () => void;
  onConfirmMerge: (primaryId: string, secondaryId: string) => Promise<void>;
  isMerging: boolean;
}

export const MergeCustomerModal: React.FC<MergeCustomerModalProps> = ({
  isOpen,
  currentCustomer,
  allCustomers,
  onClose,
  onConfirmMerge,
  isMerging,
}) => {
  const [selectedSecondaryId, setSelectedSecondaryId] = useState<string>('');

  if (!isOpen) return null;

  const candidateCustomers = allCustomers.filter((c) => c.id !== currentCustomer.id);

  const handleMerge = async () => {
    if (!selectedSecondaryId || isMerging) return;
    await onConfirmMerge(currentCustomer.id, selectedSecondaryId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-lg w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#171717]">
            <Users className="w-5 h-5 text-[#FF8A2A]" />
            <span>Merge Duplicate Customers</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Merging combines conversation history, tags, and internal notes into the primary customer profile.</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1">Primary Customer Profile</label>
            <div className="p-3 rounded-2xl bg-[#FFF0E5] border border-[#FF8A2A]/40 text-xs font-bold text-[#171717] flex items-center justify-between">
              <span>{currentCustomer.name} ({currentCustomer.email || 'No email'})</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FF8A2A] text-white text-[10px]">Primary</span>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-[#FF8A2A]" />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Select Secondary Customer to Merge</label>
            <select
              value={selectedSecondaryId}
              onChange={(e) => setSelectedSecondaryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            >
              <option value="">-- Choose duplicate customer --</option>
              {candidateCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email || 'No email'}) • {c.totalConversations} chats
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E8E5]">
          <button
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2.5 rounded-2xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={!selectedSecondaryId || isMerging}
            className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{isMerging ? 'Merging Profiles...' : 'Merge Profiles'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
