import React, { useState } from 'react';
import type { WorkspaceSettings } from '../../types/team';
import { Building2, Save, Clock, ShieldCheck, Check, Loader2, Image as ImageIcon, AlertTriangle, Trash2, X } from 'lucide-react';

interface WorkspaceSettingsFormProps {
  settings: WorkspaceSettings | null;
  onSave: (updated: Partial<WorkspaceSettings>) => Promise<boolean>;
  isSaving: boolean;
  onDeleteWorkspace?: () => Promise<{ success: boolean; error?: string }>;
  canDelete?: boolean;
  totalWorkspacesCount?: number;
}

export const WorkspaceSettingsForm: React.FC<WorkspaceSettingsFormProps> = ({
  settings,
  onSave,
  isSaving,
  onDeleteWorkspace,
  canDelete = false,
  totalWorkspacesCount = 1,
}) => {
  const [name, setName] = useState(settings?.name || 'My Workspace');
  const [description, setDescription] = useState(settings?.description || 'AI-powered customer communication platform');
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [timezone, setTimezone] = useState(settings?.timezone || 'Asia/Yangon');
  const [language, setLanguage] = useState(settings?.language || 'English');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Keep internal name state in sync if settings update
  React.useEffect(() => {
    if (settings?.name) setName(settings.name);
    if (settings?.description !== undefined) setDescription(settings.description);
    if (settings?.logoUrl !== undefined) setLogoUrl(settings.logoUrl || '');
    if (settings?.timezone) setTimezone(settings.timezone);
    if (settings?.language) setLanguage(settings.language);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave({ name, description, logoUrl, timezone, language });
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const targetWorkspaceName = settings?.name || name || 'My Workspace';

  const handleDeleteConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmInput.trim() !== targetWorkspaceName.trim()) {
      setDeleteError(`Please type "${targetWorkspaceName}" exactly to confirm.`);
      return;
    }

    if (!onDeleteWorkspace) return;

    setIsDeleting(true);
    setDeleteError('');
    const res = await onDeleteWorkspace();
    setIsDeleting(false);

    if (res.success) {
      setShowDeleteModal(false);
    } else {
      setDeleteError(res.error || 'Failed to delete workspace. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">Workspace Administration</h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Configure your business workspace profile, timezone preferences, and branding.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs self-start sm:self-auto shrink-0 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : savedSuccess ? 'Saved Changes!' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Workspace Identity Section */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
            <Building2 className="w-5 h-5 text-[#FF8A2A]" />
            <h2 className="font-extrabold text-base text-[#171717]">Workspace Identity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Workspace Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Workspace URL Identifier (Slug)</label>
              <input
                type="text"
                disabled
                value={settings?.slug || 'xia-chat'}
                className="w-full px-4 py-2.5 rounded-2xl bg-gray-100 border border-[#E8E8E5] text-xs text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Workspace Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Workspace Logo URL</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] font-bold flex items-center justify-center border border-[#E8E8E5] shrink-0">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full rounded-2xl object-cover" /> : <ImageIcon className="w-5 h-5" />}
                </div>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Regional & Timezone Preferences */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
            <Clock className="w-5 h-5 text-[#FF8A2A]" />
            <h2 className="font-extrabold text-base text-[#171717]">Regional & Timezone Preferences</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Workspace Timezone (IANA)</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              >
                <option value="Asia/Yangon">Asia/Yangon (UTC +06:30)</option>
                <option value="Asia/Bangkok">Asia/Bangkok (UTC +07:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC +08:00)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC +09:00)</option>
                <option value="America/New_York">America/New_York (UTC -05:00)</option>
                <option value="Europe/London">Europe/London (UTC +00:00)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Default Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              >
                <option value="English">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Multi-tenant workspace isolation active. Authentication and IDOR permissions enforced on every request.</span>
        </div>

        {/* Danger Zone: Workspace Deletion */}
        <div className="bg-red-50/40 rounded-3xl border border-red-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-red-200 pb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-extrabold text-base text-red-900">Danger Zone</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-[#171717]">Delete This Workspace</h3>
              <p className="text-xs text-[#6B6B6B] max-w-xl leading-relaxed">
                Permanently delete <strong>{targetWorkspaceName}</strong> and all associated data, including AI assistants, chat conversations, knowledge documents, customer records, and team settings. This action is irreversible.
              </p>
              {!canDelete && (
                <p className="text-xs font-semibold text-amber-700 mt-1 flex items-center gap-1.5">
                  <span>ℹ️ You cannot delete your only workspace ({totalWorkspacesCount} total). Create another workspace first or delete your account in Central Settings.</span>
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={!canDelete}
              onClick={() => {
                setConfirmInput('');
                setDeleteError('');
                setShowDeleteModal(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-red-900">Confirm Workspace Deletion</h3>
                  <p className="text-xs text-[#6B6B6B]">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#171717] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#444] leading-relaxed">
                You are about to permanently delete <strong>{targetWorkspaceName}</strong>. All customer conversations, bots, and channels connected to this workspace will be immediately wiped.
              </p>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
                To confirm deletion, please type <span className="font-mono font-bold select-all underline">{targetWorkspaceName}</span> below:
              </div>

              <input
                type="text"
                placeholder={targetWorkspaceName}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-sm focus:outline-none focus:border-red-500 bg-[#FAF9F6]"
                autoFocus
              />

              {deleteError && <p className="text-xs text-red-600 font-medium">{deleteError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E8E5]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B6B6B] hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting || confirmInput.trim() !== targetWorkspaceName.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Workspace...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

