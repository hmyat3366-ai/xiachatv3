import React, { useState } from 'react';
import type { UserProfileData } from '../../types/settings';
import { User, Mail, Briefcase, Phone, Save, Check, Loader2, Lock } from 'lucide-react';

interface ProfileTabProps {
  profile: UserProfileData | null;
  onSave: (name: string, jobTitle: string, phone: string) => Promise<boolean>;
  isSaving: boolean;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, onSave, isSaving }) => {
  const [name, setName] = useState(profile?.name || '');
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(name, jobTitle, phone);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">Personal Profile</h2>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Manage your personal account details and communication preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-6">
        {/* Avatar & Initials Preview */}
        <div className="flex items-center gap-4 pb-4 border-b border-[#E8E8E5]">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF0E5] text-[#FF8A2A] font-extrabold text-2xl flex items-center justify-center border border-[#E8E8E5] shadow-2xs">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[#171717]">{name || 'User Name'}</h3>
            <p className="text-xs text-[#6B6B6B]">{profile?.email}</p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 capitalize">
              {profile?.authProvider || 'local'} account
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Email Address (Primary)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-gray-100 border border-[#E8E8E5] text-xs text-gray-500 cursor-not-allowed"
              />
              <Lock className="w-3.5 h-3.5 text-gray-400 absolute right-3.5 top-3.5" />
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Contact system administrator to request primary email changes.</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Job Title</label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Support Operations Lead"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
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
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : savedSuccess ? 'Saved Profile!' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
