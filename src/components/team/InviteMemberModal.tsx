import React, { useState } from 'react';
import type { WorkspaceRole } from '../../types/team';
import { UserPlus, X, Mail, Send, Loader2, Shield, Briefcase, User } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendInvite: (email: string, role: WorkspaceRole, message?: string) => Promise<boolean>;
  isSending: boolean;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSendInvite,
  isSending,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const success = await onSendInvite(email.trim(), role, message.trim());
    if (success) {
      setEmail('');
      setMessage('');
      onClose();
    } else {
      setError('Failed to send invitation. Member may already exist or invitation is pending.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#171717]">Invite Team Member</h2>
              <p className="text-xs text-[#6B6B6B]">Collaborate on customer support conversations.</p>
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
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#171717]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] font-semibold"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#171717]">Assign Role</label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'member', label: 'Member', desc: 'Assigned chats', icon: User },
                { id: 'support', label: 'Support', desc: 'Customer reply & CRM', icon: User },
                { id: 'manager', label: 'Manager', desc: 'Team & inbox mgmt', icon: Briefcase },
                { id: 'admin', label: 'Admin', desc: 'Full workspace control', icon: Shield },
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as any)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-2 ring-[#FF8A2A]/20 shadow-2xs'
                        : 'bg-[#FAF9F6] border-[#E8E8E5] text-[#6B6B6B] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                      <span className="font-bold text-xs text-[#171717]">{r.label}</span>
                    </div>
                    <span className="text-[10px] text-[#6B6B6B] line-clamp-1">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#171717]">Personal Message (Optional)</label>
            <textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Welcome to our customer support team workspace!"
              className="w-full p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isSending ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
