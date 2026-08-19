import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Lock, Loader2 } from 'lucide-react';

interface AccountTabProps {
  onDeleteAccount: (confirmText: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  isDeleting: boolean;
}

export const AccountTab: React.FC<AccountTabProps> = ({ onDeleteAccount, isDeleting }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (confirmInput.trim() !== 'DELETE') {
      setError('You must type "DELETE" exactly to confirm.');
      return;
    }

    const res = await onDeleteAccount(confirmInput.trim(), passwordInput);
    if (!res.success) {
      setError(res.message || 'Failed to delete account. Verify your password.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">Account Administration</h2>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Manage destructive account actions and workspace membership removal.</p>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-extrabold text-base text-rose-900">Danger Zone</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
          <div className="space-y-1">
            <h4 className="font-extrabold text-sm text-rose-900">Delete Account</h4>
            <p className="text-xs text-rose-700 max-w-md">
              Permanently delete your Xia Chat user account. This action is irreversible and revokes your workspace permissions.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-md w-full p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#171717]">Delete Account</h3>
                  <p className="text-xs text-rose-600 font-bold">Irreversible Action</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-[#171717] hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                  {error}
                </div>
              )}

              <p className="text-xs text-[#6B6B6B] leading-relaxed">
                To confirm account deletion, please type <strong className="text-rose-600">DELETE</strong> in uppercase below and enter your current password.
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Type DELETE to confirm</label>
                <input
                  type="text"
                  required
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717] focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || confirmInput.trim() !== 'DELETE'}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>{isDeleting ? 'Deleting Account...' : 'Permanently Delete'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
