import React, { useState } from 'react';
import type { WebsiteWidgetConfig } from '../../types/channel';
import {
  ArrowLeft,
  Globe,
  Sliders,
  Palette,
  Bot,
  Code,
  Copy,
  Check,
  Send,
  Loader2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

interface WebsiteWidgetConfiguratorProps {
  channelId: string;
  initialConfig: WebsiteWidgetConfig;
  availableAgents: Array<{ id: string; name: string }>;
  defaultAgentId?: string | null;
  onBack: () => void;
  onSave: (config: WebsiteWidgetConfig, agentId?: string) => Promise<void>;
  isSaving: boolean;
}

export const WebsiteWidgetConfigurator: React.FC<WebsiteWidgetConfiguratorProps> = ({
  channelId,
  initialConfig,
  availableAgents,
  defaultAgentId,
  onBack,
  onSave,
  isSaving,
}) => {
  const [widgetName, setWidgetName] = useState(initialConfig.widgetName || 'Xia Support Chat');
  const [welcomeMessage, setWelcomeMessage] = useState(initialConfig.welcomeMessage || 'Hello! How can we help you today?');
  const [primaryColor, setPrimaryColor] = useState(initialConfig.primaryColor || '#FF8A2A');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(initialConfig.position || 'bottom-right');
  const [selectedAgentId, setSelectedAgentId] = useState(defaultAgentId || (availableAgents[0]?.id || ''));
  const [enableAI, setEnableAI] = useState(initialConfig.enableAI !== false);
  const [enableHandoff, setEnableHandoff] = useState(initialConfig.enableHandoff !== false);
  const [showAgentAvailability, setShowAgentAvailability] = useState(initialConfig.showAgentAvailability !== false);

  // Copy code state
  const [isCopied, setIsCopied] = useState(false);

  // Interactive Test Sandbox state
  const [testMessages, setTestMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    { sender: 'agent', text: welcomeMessage },
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);

  const embedCode = `<script src="${window.location.origin}/widget.js" data-site-key="${channelId}" async></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(
      {
        widgetName,
        welcomeMessage,
        primaryColor,
        position,
        enableAI,
        enableHandoff,
        showAgentAvailability,
      },
      selectedAgentId
    );
  };

  const handleSendTestMessage = () => {
    if (!testInput.trim() || isTestLoading) return;
    const userMsg = testInput.trim();
    setTestMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setTestInput('');
    setIsTestLoading(true);

    setTimeout(() => {
      setTestMessages((prev) => [
        ...prev,
        {
          sender: 'agent',
          text: `Thanks for asking! As an AI assistant configured for ${widgetName}, I'm here to help with your inquiry regarding "${userMsg}".`,
        },
      ]);
      setIsTestLoading(false);
    }, 600);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-2xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] font-bold flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-[#171717]">Website Live Chat Customizer</h1>
              <p className="text-xs text-[#6B6B6B]">
                Configure widget appearance, welcome greeting, AI agent assignment, and installation code.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 5 Configuration Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1 — GENERAL SETTINGS */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E8E5]">
              <Sliders className="w-5 h-5 text-[#FF8A2A]" />
              <h2 className="font-extrabold text-base text-[#171717]">1. General Settings</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Widget Title / Header Name</label>
                <input
                  type="text"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Welcome Message Greeting</label>
                <textarea
                  rows={2}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2 — APPEARANCE */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E8E5]">
              <Palette className="w-5 h-5 text-[#FF8A2A]" />
              <h2 className="font-extrabold text-base text-[#171717]">2. Appearance & Colors</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Primary Brand Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-[#E8E8E5]"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717] w-28"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#171717]">Widget Screen Position</label>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPosition('bottom-right')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      position === 'bottom-right'
                        ? 'bg-[#171717] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]'
                    }`}
                  >
                    Bottom Right
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition('bottom-left')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      position === 'bottom-left'
                        ? 'bg-[#171717] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]'
                    }`}
                  >
                    Bottom Left
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3 — AI AGENT ASSIGNMENT */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E8E5]">
              <Bot className="w-5 h-5 text-[#FF8A2A]" />
              <h2 className="font-extrabold text-base text-[#171717]">3. Connected AI Agent Assignment</h2>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#171717]">Select AI Agent Persona</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              >
                {availableAgents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 4 — BEHAVIOR */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8E8E5]">
              <MessageSquare className="w-5 h-5 text-[#FF8A2A]" />
              <h2 className="font-extrabold text-base text-[#171717]">4. Conversation Behavior</h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-[#171717] block">Enable AI Auto-Reply</span>
                  <span className="text-[10px] text-[#6B6B6B]">Allow assigned AI agent to answer visitor questions automatically</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableAI}
                  onChange={(e) => setEnableAI(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-[#171717] block">Enable Human Handoff</span>
                  <span className="text-[10px] text-[#6B6B6B]">Allow customer to request a live support team agent</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableHandoff}
                  onChange={(e) => setEnableHandoff(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-[#171717] block">Show Agent Availability Indicator</span>
                  <span className="text-[10px] text-[#6B6B6B]">Display online badge on widget header</span>
                </div>
                <input
                  type="checkbox"
                  checked={showAgentAvailability}
                  onChange={(e) => setShowAgentAvailability(e.target.checked)}
                  className="w-4 h-4 accent-[#FF8A2A] cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* SECTION 5 — INSTALLATION EMBED CODE */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-[#FF8A2A]" />
                <h2 className="font-extrabold text-base text-[#171717]">5. Embeddable Installation Code</h2>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] hover:bg-[#FFE4D0] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <p className="text-xs text-[#6B6B6B]">
              Copy and paste this snippet into the HTML of your website before the closing <code className="text-[#FF8A2A]">&lt;/body&gt;</code> tag.
            </p>

            <div className="p-4 rounded-2xl bg-[#171717] text-[#FAF9F6] text-xs font-mono overflow-x-auto leading-relaxed select-all">
              {embedCode}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Public key architecture protected against unauthorized database access.</span>
            </div>
          </div>
        </div>

        {/* Right Column: SECTION 6 — INTERACTIVE LIVE TEST SANDBOX */}
        <div className="space-y-4">
          <div className="sticky top-6 bg-white rounded-3xl border border-[#E8E8E5] shadow-lg overflow-hidden flex flex-col h-[520px]">
            {/* Simulated Live Widget Header */}
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs">{widgetName}</h3>
                  {showAgentAvailability && (
                    <p className="text-[10px] opacity-90 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
                    </p>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-bold opacity-80 uppercase">Live Preview</span>
            </div>

            {/* Test Messages Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF9F6]">
              {testMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'text-white font-medium rounded-br-xs'
                        : 'bg-white border border-[#E8E8E5] text-[#171717] rounded-bl-xs shadow-2xs'
                    }`}
                    style={msg.sender === 'user' ? { backgroundColor: primaryColor } : {}}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTestLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E8E8E5] p-3 rounded-2xl text-xs text-[#6B6B6B] flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8A2A]" /> AI Agent typing...
                  </div>
                </div>
              )}
            </div>

            {/* Test Input Box */}
            <div className="p-3 bg-white border-t border-[#E8E8E5] flex items-center gap-2">
              <input
                type="text"
                placeholder="Test chat with widget..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                className="flex-1 px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
              <button
                onClick={handleSendTestMessage}
                disabled={!testInput.trim() || isTestLoading}
                className="p-2 rounded-xl text-white cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
