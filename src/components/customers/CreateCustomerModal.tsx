import React, { useState } from 'react';
import { UserPlus, X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: { name: string; email?: string; phone?: string; company?: string; location?: string }) => Promise<void>;
  isSaving: boolean;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() && !email.trim()) {
      setErrorMsg('Please provide a Name or Email address.');
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        location: location.trim() || undefined,
      });
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setLocation('');
      onClose();
    } catch {
      setErrorMsg('Failed to create customer record.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-md w-full p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#171717]">
            <UserPlus className="w-5 h-5 text-[#FF8A2A]" />
            <span>Add Customer Record</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Customer Name *</label>
            <input
              type="text"
              placeholder="e.g. Sarah Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Email Address</label>
            <input
              type="email"
              placeholder="sarah@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Phone Number</label>
              <input
                type="text"
                placeholder="+1 (555) 234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Company</label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Location</label>
            <input
              type="text"
              placeholder="San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSaving ? 'Creating...' : 'Create Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
