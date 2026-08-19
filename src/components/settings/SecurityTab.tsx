import React, { useState } from 'react';
import { Shield, Smartphone, Key, Save, Check, Loader2, AlertCircle } from 'lucide-react';

interface SecurityTabProps {
  onChangePassword: (curr: string, next: string) => Promise<{ success: boolean; message?: string }>;
  isSaving: boolean;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ onChangePassword, isSaving }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    const res = await onChangePassword(currentPassword, newPassword);
    if (res.success) {
      setSuccessMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setError(res.message || 'Failed to change password. Please verify current password.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">Security & Authentication</h2>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Manage your password, active sessions, and multi-factor authentication.</p>
      </div>

      {/* Change Password */}
      <form onSubmit={handleSubmitPassword} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
          <Key className="w-5 h-5 text-[#FF8A2A]" />
          <h3 className="font-extrabold text-base text-[#171717]">Change Password</h3>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </div>
      </form>

      {/* Active Sessions */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#FF8A2A]" />
            <h3 className="font-extrabold text-base text-[#171717]">Active Sessions</h3>
          </div>
          <button className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">
            Sign out of all other sessions
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              Current
            </div>
            <div>
              <p className="font-bold text-xs text-[#171717]">Windows PC — Chrome Web Browser</p>
              <p className="text-[11px] text-[#6B6B6B]">Active now (Current session)</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Active
          </span>
        </div>
      </div>

      {/* Two-Factor Authentication Status */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
          <Shield className="w-5 h-5 text-purple-600" />
          <h3 className="font-extrabold text-base text-[#171717]">Two-Factor Authentication (2FA)</h3>
        </div>
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-1">
          <span className="font-extrabold block">Status: Not Configured</span>
          <p className="text-[11px] text-purple-700 leading-relaxed">
            Additional account security (TOTP / Authenticator App) will be available here soon.
          </p>
        </div>
      </div>
    </div>
  );
};
