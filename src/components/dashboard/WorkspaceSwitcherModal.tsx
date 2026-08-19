import React, { useState } from 'react';
import type { WorkspaceItem } from '../../types/dashboard';
import { Building2, Plus, Check, X, Loader2 } from 'lucide-react';

interface WorkspaceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: WorkspaceItem[];
  currentWorkspace: WorkspaceItem | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => Promise<boolean>;
}

export const WorkspaceSwitcherModal: React.FC<WorkspaceSwitcherModalProps> = ({
  isOpen,
  onClose,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    const success = await onCreateWorkspace(newWorkspaceName.trim());
    setIsSubmitting(false);
    if (success) {
      setNewWorkspaceName('');
      setIsCreating(false);
      onClose();
    } else {
      setError('Failed to create workspace. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#171717]">Select Workspace</h3>
              <p className="text-xs text-[#6B6B6B]">Switch between your team environments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#FAF9F6] text-gray-400 hover:text-[#171717] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isCreating ? (
          <div className="space-y-3">
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {workspaces.map((ws) => {
                const isSelected = currentWorkspace?.id === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      onSelectWorkspace(ws.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-[#FF8A2A] bg-[#FFF0E5]/60 text-[#171717] font-semibold'
                        : 'border-[#E8E8E5] hover:border-gray-300 bg-white text-[#171717]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-[#FF8A2A] text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold truncate max-w-[200px]">{ws.name}</p>
                        <p className="text-[11px] text-[#6B6B6B] font-mono">app.xiachat.com/{ws.slug}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#FF8A2A]" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-[#FF8A2A] text-[#FF8A2A] hover:bg-[#FFF0E5] text-xs font-bold transition-colors cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Workspace</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#171717] uppercase tracking-wider mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Agency Support"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8E8E5] text-sm focus:outline-none focus:border-[#FF8A2A] bg-[#FAF9F6]"
                autoFocus
              />
              {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setError('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B6B6B] hover:bg-[#FAF9F6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Workspace</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
