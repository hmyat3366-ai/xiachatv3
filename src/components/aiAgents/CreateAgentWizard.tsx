import React, { useState } from 'react';
import type { AIAgentTone, ResponseStyle } from '../../types/aiAgent';
import {
  ArrowLeft,
  BookOpen,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Smile,
  Briefcase,
  Coffee,
  HeartHandshake,
  Zap,
  Globe,
  Share2,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CreateAgentWizardProps {
  onBack: () => void;
  onSave: (agentData: any) => Promise<void>;
  isSaving: boolean;
}

export const CreateAgentWizard: React.FC<CreateAgentWizardProps> = ({
  onBack,
  onSave,
  isSaving,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('bot');
  const [tone, setTone] = useState<AIAgentTone>('Friendly');
  const [customInstructions, setCustomInstructions] = useState(
    'Be friendly, concise, and helpful.\nAlways confirm delivery address details before modifying an order.\nAsk clarifying questions whenever customer intent is ambiguous.'
  );

  // Knowledge Sources Selection
  const [selectedKnowledge, setSelectedKnowledge] = useState<string[]>([
    'faq',
    'returns',
    'shipping',
    'company',
  ]);

  // Behavior
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('Balanced');

  // Human Handoff
  const [humanHandoffEnabled, setHumanHandoffEnabled] = useState(true);
  const [handoffConditions, setHandoffConditions] = useState<string[]>([
    'customer_asks',
    'low_confidence',
    'frustrated',
  ]);
  const [handoffMessage, setHandoffMessage] = useState(
    "I'll connect you with a member of our team who can help."
  );

  // Safety Rules
  const [safetyRules, setSafetyRules] = useState<string[]>([
    'do_not_invent',
    'no_outside_knowledge',
    'protect_instructions',
    'protect_customer_info',
  ]);

  // Channels
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'web',
    'facebook',
    'whatsapp',
  ]);

  // Validation Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleKnowledge = (id: string) => {
    setSelectedKnowledge((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  const handleToggleCondition = (id: string) => {
    setHandoffConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleToggleRule = (id: string) => {
    setSafetyRules((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleToggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Agent name is required.');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        avatar,
        status: 'active',
        tone,
        customInstructions,
        responseStyle,
        autoReplyEnabled,
        humanHandoffEnabled,
        handoffConditions,
        handoffMessage,
        knowledgeSources: selectedKnowledge,
        channels: selectedChannels,
        customRules: safetyRules,
      });
    } catch {
      setErrorMessage('Failed to create AI agent. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-2xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#171717]">Create AI Assistant Agent</h1>
            <p className="text-xs text-[#6B6B6B]">
              Configure assistant persona, knowledge access, system prompts, and human handoff rules.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1 — BASIC INFORMATION */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8E5]">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] font-black text-sm flex items-center justify-center">
              1
            </div>
            <h2 className="font-black text-base text-[#171717]">Basic Information & Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-[#171717]">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Xia Customer Concierge"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15 font-semibold"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-bold text-[#171717]">Description</label>
              <input
                type="text"
                placeholder="Handles common customer inquiries, returns, and order updates autonomously."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2 — PERSONALITY & TONE */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8E5]">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] font-black text-sm flex items-center justify-center">
              2
            </div>
            <h2 className="font-black text-base text-[#171717]">Personality, Tone & System Instructions</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#171717] mb-2">Tone of Voice</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'Friendly', label: 'Friendly', icon: Smile },
                { id: 'Professional', label: 'Professional', icon: Briefcase },
                { id: 'Casual', label: 'Casual', icon: Coffee },
                { id: 'Concise', label: 'Concise', icon: Zap },
                { id: 'Empathetic', label: 'Empathetic', icon: HeartHandshake },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = tone === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setTone(t.id as any)}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF0E5] border-[#FF8A2A] text-[#171717] ring-2 ring-[#FF8A2A]/20'
                        : 'bg-[#FAF9F6] border-[#E8E8E5] text-[#6B6B6B] hover:bg-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                    <span className="text-xs font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-bold text-[#171717]">System Prompt & Custom Instructions</label>
            <textarea
              rows={4}
              placeholder="How should this AI communicate with customers?"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] focus:ring-2 focus:ring-[#FF8A2A]/15 font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* SECTION 3 — KNOWLEDGE SOURCES */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8E5]">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] font-black text-sm flex items-center justify-center">
              3
            </div>
            <div>
              <h2 className="font-black text-base text-[#171717]">Knowledge Sources Routing</h2>
              <p className="text-xs text-[#6B6B6B]">Select which documents and website crawlers this assistant can query.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'faq', name: 'Product FAQ & Policies', type: 'FAQ Collection', count: '14 chunks' },
              { id: 'returns', name: 'Return & Refund Policy', type: 'Policy Doc', count: '8 chunks' },
              { id: 'shipping', name: 'Shipping & Delivery Rates', type: 'Document', count: '12 chunks' },
              { id: 'company', name: 'Company & Licensing Info', type: 'Website URL', count: '42 chunks' },
            ].map((source) => {
              const isChecked = selectedKnowledge.includes(source.id);
              return (
                <div
                  key={source.id}
                  onClick={() => handleToggleKnowledge(source.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isChecked
                      ? 'bg-[#FFF0E5]/70 border-[#FF8A2A] shadow-2xs'
                      : 'bg-[#FAF9F6] border-[#E8E8E5] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center text-[#FF8A2A]">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#171717]">{source.name}</p>
                      <p className="text-[10px] text-[#6B6B6B]">{source.type} • {source.count}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="accent-[#FF8A2A] w-4 h-4 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4 — AUTOMATION & HUMAN HANDOFF */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8E5]">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] font-black text-sm flex items-center justify-center">
              4
            </div>
            <h2 className="font-black text-base text-[#171717]">Automation & Human Handoff Triggers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer hover:bg-white">
              <div>
                <p className="text-xs font-bold text-[#171717]">Auto-Reply Enabled</p>
                <p className="text-[10px] text-gray-500">Autonomous response to inquiries</p>
              </div>
              <input
                type="checkbox"
                checked={autoReplyEnabled}
                onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                className="accent-[#FF8A2A] w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer hover:bg-white">
              <div>
                <p className="text-xs font-bold text-[#171717]">Human Handoff Enabled</p>
                <p className="text-[10px] text-gray-500">Auto-escalate on low confidence</p>
              </div>
              <input
                type="checkbox"
                checked={humanHandoffEnabled}
                onChange={(e) => setHumanHandoffEnabled(e.target.checked)}
                className="accent-[#FF8A2A] w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-[#171717]">Handoff Transfer Message</label>
            <input
              type="text"
              value={handoffMessage}
              onChange={(e) => setHandoffMessage(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#E8E8E5] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>
        </div>

        {/* SECTION 5 — CHANNEL DEPLOYMENT */}
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E8E5]">
            <div className="w-8 h-8 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] font-black text-sm flex items-center justify-center">
              5
            </div>
            <h2 className="font-black text-base text-[#171717]">Deploy to Channels</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'web', name: 'Website Live Chat', icon: Globe },
              { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageSquare },
              { id: 'facebook', name: 'Facebook Messenger', icon: Share2 },
              { id: 'instagram', name: 'Instagram DM', icon: Share2 },
            ].map((ch) => {
              const isSelected = selectedChannels.includes(ch.id);
              const Icon = ch.icon;
              return (
                <div
                  key={ch.id}
                  onClick={() => handleToggleChannel(ch.id)}
                  className={`p-3.5 rounded-2xl border text-center cursor-pointer transition-all flex flex-col items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#FFF0E5] border-[#FF8A2A] shadow-2xs'
                      : 'bg-[#FAF9F6] border-[#E8E8E5] hover:bg-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-[#FF8A2A]' : 'text-gray-400'}`} />
                  <p className="text-xs font-bold text-[#171717]">{ch.name}</p>
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {isSelected ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E8E5]">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-[#E8E8E5] hover:bg-white text-xs font-bold text-[#171717] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deploying Agent...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Create & Deploy AI Agent</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
