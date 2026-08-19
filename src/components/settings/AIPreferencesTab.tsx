import React, { useState } from 'react';
import type { WorkspaceAIDefaults } from '../../types/settings';
import { Sparkles, Shield, Save, Check, Loader2, Info } from 'lucide-react';

interface AIPreferencesTabProps {
  aiDefaults: WorkspaceAIDefaults | null;
  onSave: (defaults: WorkspaceAIDefaults) => Promise<boolean>;
  isSaving: boolean;
}

export const AIPreferencesTab: React.FC<AIPreferencesTabProps> = ({ aiDefaults, onSave, isSaving }) => {
  const [defaults, setDefaults] = useState<WorkspaceAIDefaults>(
    aiDefaults || {
      defaultStyle: 'balanced',
      defaultTone: 'friendly',
      enableHandoff: true,
      safetyKnowledgeOnly: true,
      safetyNoHallucination: true,
    }
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(defaults);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#171717] tracking-tight">Workspace AI Preferences</h2>
        <p className="text-xs text-[#6B6B6B] mt-0.5">Set workspace-level AI defaults for customer support conversations.</p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
        <Info className="w-5 h-5 text-amber-600 shrink-0" />
        <span>
          <strong>Priority Rule:</strong> These are workspace default preferences. Specific AI Agent configurations set in the AI Agents module take precedence over these defaults.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Response Style & Tone Defaults */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
            <Sparkles className="w-5 h-5 text-[#FF8A2A]" />
            <h3 className="font-extrabold text-base text-[#171717]">Default Response Style & Tone</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Style */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#171717]">Response Verbosity</label>
              <div className="space-y-2">
                {[
                  { value: 'concise', label: 'Concise', desc: 'Short, direct answers' },
                  { value: 'balanced', label: 'Balanced', desc: 'Clear & thorough (Recommended)' },
                  { value: 'detailed', label: 'Detailed', desc: 'Comprehensive step-by-step responses' },
                ].map((s) => (
                  <label key={s.value} className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E8E5] cursor-pointer hover:bg-[#FAF9F6]">
                    <div>
                      <span className="font-extrabold text-xs text-[#171717] block">{s.label}</span>
                      <span className="text-[10px] text-[#6B6B6B]">{s.desc}</span>
                    </div>
                    <input
                      type="radio"
                      name="style"
                      checked={defaults.defaultStyle === s.value}
                      onChange={() => setDefaults((p) => ({ ...p, defaultStyle: s.value as any }))}
                      className="w-4 h-4 accent-[#FF8A2A]"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#171717]">Default Brand Tone</label>
              <div className="space-y-2">
                {[
                  { value: 'friendly', label: 'Friendly', desc: 'Warm, empathetic & helpful' },
                  { value: 'professional', label: 'Professional', desc: 'Formal, polite & concise' },
                  { value: 'casual', label: 'Casual', desc: 'Relaxed & approachable' },
                ].map((t) => (
                  <label key={t.value} className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E8E5] cursor-pointer hover:bg-[#FAF9F6]">
                    <div>
                      <span className="font-extrabold text-xs text-[#171717] block">{t.label}</span>
                      <span className="text-[10px] text-[#6B6B6B]">{t.desc}</span>
                    </div>
                    <input
                      type="radio"
                      name="tone"
                      checked={defaults.defaultTone === t.value}
                      onChange={() => setDefaults((p) => ({ ...p, defaultTone: t.value as any }))}
                      className="w-4 h-4 accent-[#FF8A2A]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Safety Defaults */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E8E8E5] pb-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-base text-[#171717]">AI Safety & Grounding Defaults</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E8E5] cursor-pointer hover:bg-[#FAF9F6]">
              <div>
                <span className="font-extrabold text-xs text-[#171717] block">Prefer Configured Knowledge Base</span>
                <span className="text-[11px] text-[#6B6B6B]">Always ground AI responses in workspace Knowledge Base sources</span>
              </div>
              <input
                type="checkbox"
                checked={defaults.safetyKnowledgeOnly}
                onChange={(e) => setDefaults((p) => ({ ...p, safetyKnowledgeOnly: e.target.checked }))}
                className="w-4 h-4 accent-[#FF8A2A] rounded-md"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E8E5] cursor-pointer hover:bg-[#FAF9F6]">
              <div>
                <span className="font-extrabold text-xs text-[#171717] block">Strict Zero-Hallucination Policy</span>
                <span className="text-[11px] text-[#6B6B6B]">Instruct AI to admit uncertainty rather than inventing answers</span>
              </div>
              <input
                type="checkbox"
                checked={defaults.safetyNoHallucination}
                onChange={(e) => setDefaults((p) => ({ ...p, safetyNoHallucination: e.target.checked }))}
                className="w-4 h-4 accent-[#FF8A2A] rounded-md"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E8E5] cursor-pointer hover:bg-[#FAF9F6]">
              <div>
                <span className="font-extrabold text-xs text-[#171717] block">Automatic Human Handoff</span>
                <span className="text-[11px] text-[#6B6B6B]">Trigger human handoff when customer sentiment drops or AI confidence is low</span>
              </div>
              <input
                type="checkbox"
                checked={defaults.enableHandoff}
                onChange={(e) => setDefaults((p) => ({ ...p, enableHandoff: e.target.checked }))}
                className="w-4 h-4 accent-[#FF8A2A] rounded-md"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : savedSuccess ? 'Saved AI Defaults!' : 'Save AI Defaults'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
