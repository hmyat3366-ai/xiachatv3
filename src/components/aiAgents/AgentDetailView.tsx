import React, { useState, useEffect } from 'react';
import type { AIAgent, TestChatMessage } from '../../types/aiAgent';
import {
  ArrowLeft,
  Bot,
  Sparkles,
  BookOpen,
  Sliders,
  UserCheck,
  Globe,
  Send,
  Loader2,
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Check,
  Zap,
  Trash2,
} from 'lucide-react';

interface AgentDetailViewProps {
  agent: AIAgent;
  recentConversations: any[];
  onBack: () => void;
  onNavigate: (path: string) => void;
  onUpdateAgent: (updatedData: Partial<AIAgent>) => Promise<void>;
  onToggleStatus: (agentId: string, currentStatus: string) => Promise<void>;
  onDeleteClick: () => void;
}

export const AgentDetailView: React.FC<AgentDetailViewProps> = ({
  agent,
  recentConversations,
  onBack,
  onNavigate,
  onUpdateAgent,
  onToggleStatus,
  onDeleteClick,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'instructions' | 'knowledge' | 'behavior' | 'channels' | 'test'>('overview');

  // Edit fields
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [tone, setTone] = useState(agent.tone);
  const [customInstructions, setCustomInstructions] = useState(agent.customInstructions);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(agent.autoReplyEnabled);
  const [humanHandoffEnabled, setHumanHandoffEnabled] = useState(agent.humanHandoffEnabled);
  const [handoffMessage, setHandoffMessage] = useState(agent.handoffMessage);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test Playground State
  const [testMessages, setTestMessages] = useState<TestChatMessage[]>([
    {
      id: '1',
      sender: 'agent',
      content: `Hello! I am ${agent.name}. Ask me any question to test how I respond using configured knowledge sources.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);

  useEffect(() => {
    setName(agent.name);
    setDescription(agent.description);
    setTone(agent.tone);
    setCustomInstructions(agent.customInstructions);
    setAutoReplyEnabled(agent.autoReplyEnabled);
    setHumanHandoffEnabled(agent.humanHandoffEnabled);
    setHandoffMessage(agent.handoffMessage);
  }, [agent]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onUpdateAgent({
        name,
        description,
        tone,
        customInstructions,
        autoReplyEnabled,
        humanHandoffEnabled,
        handoffMessage,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testInput.trim() || isTestLoading) return;

    const userMsg: TestChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: testInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTestMessages((prev) => [...prev, userMsg]);
    const currentInput = testInput.trim();
    setTestInput('');
    setIsTestLoading(true);

    try {
      const res = await fetch(`/api/ai-agents/${agent.id}/test?workspaceId=${agent.workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: currentInput }),
      });

      if (res.ok) {
        const data = await res.json();
        const agentReply: TestChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          content: data.reply,
          knowledgeSourceUsed: data.metadata.knowledgeSourceUsed,
          confidenceScore: data.metadata.confidenceScore,
          responseTimeMs: data.metadata.responseTimeMs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setTestMessages((prev) => [...prev, agentReply]);
      }
    } catch {
      // Fallback
    } finally {
      setIsTestLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-2xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#171717] text-[#FF8A2A] font-bold flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#171717]">{agent.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    agent.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {agent.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-0.5">{agent.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => onToggleStatus(agent.id, agent.status)}
            className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 cursor-pointer"
          >
            {agent.status === 'active' ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Agent
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600" /> Activate Agent
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : null}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Changes'}</span>
          </button>

          <button
            onClick={onDeleteClick}
            className="p-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            title="Delete Agent"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex items-center gap-1 border-b border-[#E8E8E5] overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: Sparkles },
          { id: 'instructions', label: 'Instructions', icon: Sliders },
          { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
          { id: 'behavior', label: 'Behavior', icon: UserCheck },
          { id: 'channels', label: 'Channels', icon: Globe },
          { id: 'test', label: 'Test Playground', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-[#FF8A2A] text-[#FF8A2A]'
                  : 'border-transparent text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1 — OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs">
              <span className="text-[10px] font-semibold text-[#6B6B6B] block">Conversations Handled</span>
              <p className="text-2xl font-extrabold text-[#171717] mt-1">{agent.conversationsHandled || 1248}</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs">
              <span className="text-[10px] font-semibold text-[#6B6B6B] block">Resolution Rate</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{agent.resolutionRate || 78}%</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs">
              <span className="text-[10px] font-semibold text-[#6B6B6B] block">Human Handoffs</span>
              <p className="text-2xl font-extrabold text-purple-700 mt-1">42</p>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs">
              <span className="text-[10px] font-semibold text-[#6B6B6B] block">Avg Response Time</span>
              <p className="text-2xl font-extrabold text-[#FF8A2A] mt-1">180ms</p>
            </div>
          </div>

          {/* Recent Conversations List */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[#171717]">Recent Handled Conversations</h3>
              <button
                onClick={() => onNavigate('/inbox')}
                className="text-xs font-bold text-[#FF8A2A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Go to Inbox <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#E8E8E5]">
              {recentConversations.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#171717]">{c.customer_name}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-700 font-semibold">{c.channel}</span>
                    </div>
                    <p className="text-xs text-[#6B6B6B] truncate">{c.last_message}</p>
                  </div>
                  <button
                    onClick={() => onNavigate('/inbox')}
                    className="px-3 py-1.5 rounded-xl border border-[#E8E8E5] hover:bg-[#FFF0E5] hover:text-[#FF8A2A] text-xs font-bold text-[#171717] transition-colors cursor-pointer shrink-0"
                  >
                    Open in Inbox
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 — INSTRUCTIONS */}
      {activeTab === 'instructions' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#171717]">Communication Tone</label>
            <div className="flex flex-wrap gap-2">
              {(['Friendly', 'Professional', 'Casual', 'Concise', 'Empathetic'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tone === t ? 'bg-[#FF8A2A] text-white shadow-2xs' : 'bg-[#FAF9F6] border border-[#E8E8E5] text-[#6B6B6B]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#171717]">Custom System Instructions</label>
            <textarea
              rows={6}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A] font-mono"
            />
          </div>
        </div>
      )}

      {/* TAB 3 — KNOWLEDGE */}
      {activeTab === 'knowledge' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <h3 className="font-extrabold text-base text-[#171717]">Connected Knowledge Sources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: 'faq', name: 'Product FAQ Database', pages: '12 document sources' },
              { id: 'returns', name: 'Return Policy Guidelines', pages: '4 policy pages' },
              { id: 'shipping', name: 'Shipping Rates & Carriers', pages: '8 guide pages' },
              { id: 'company', name: 'Company Identity & Terms', pages: 'Website URL crawler' },
            ].map((k) => (
              <div key={k.id} className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#171717]">{k.name}</p>
                    <p className="text-[10px] text-[#6B6B6B]">{k.pages}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4 — BEHAVIOR */}
      {activeTab === 'behavior' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5]">
            <div>
              <p className="text-xs font-bold text-[#171717]">AI Auto-Reply</p>
              <p className="text-[11px] text-[#6B6B6B]">Automatic response generation on eligible incoming messages.</p>
            </div>
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={(e) => setAutoReplyEnabled(e.target.checked)}
              className="accent-[#FF8A2A] w-5 h-5 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#171717]">Handoff Message</label>
            <input
              type="text"
              value={handoffMessage}
              onChange={(e) => setHandoffMessage(e.target.value)}
              className="w-full px-4 py-2 bg-[#FAF9F6] border border-[#E8E8E5] rounded-2xl text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
            />
          </div>
        </div>
      )}

      {/* TAB 5 — CHANNELS */}
      {activeTab === 'channels' && (
        <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4 animate-in fade-in duration-150">
          <h3 className="font-extrabold text-base text-[#171717]">Enabled Channels</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'Website Chat', status: 'Active' },
              { name: 'Facebook Messenger', status: 'Active' },
              { name: 'Instagram DM', status: 'Active' },
              { name: 'WhatsApp Business', status: 'Active' },
            ].map((ch) => (
              <div key={ch.name} className="p-4 rounded-2xl bg-[#FFF0E5] border border-[#FF8A2A]/40 text-center">
                <p className="text-xs font-bold text-[#171717]">{ch.name}</p>
                <span className="text-[10px] font-bold text-[#FF8A2A]">{ch.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6 — TEST PLAYGROUND (REQUIRED) */}
      {activeTab === 'test' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Left 1 Col: Agent Configuration Summary */}
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4 h-fit">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#FF8A2A]">
              <Sparkles className="w-4 h-4" /> Agent Sandbox Profile
            </div>
            <div className="space-y-2 text-xs border-t border-[#E8E8E5] pt-3">
              <div>
                <span className="text-[10px] font-semibold text-[#6B6B6B] block">Agent Name</span>
                <span className="font-bold text-[#171717]">{agent.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[#6B6B6B] block">Configured Tone</span>
                <span className="font-bold text-[#171717]">{tone}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[#6B6B6B] block">Confidence Threshold</span>
                <span className="font-bold text-emerald-700">70%</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-[#6B6B6B] block">Active Knowledge Sources</span>
                <span className="font-bold text-[#FF8A2A]">4 Sources Connected</span>
              </div>
            </div>
          </div>

          {/* Right 2 Cols: Sandbox Chat Area */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E8E8E5] shadow-2xs flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-4 border-b border-[#E8E8E5] flex items-center justify-between bg-[#FAF9F6] rounded-t-3xl">
              <div>
                <h3 className="font-extrabold text-sm text-[#171717]">Test Your AI Agent</h3>
                <p className="text-[11px] text-[#6B6B6B]">Sandbox test environment — does not send real messages to customers.</p>
              </div>
              <button
                onClick={() => setTestMessages([])}
                className="p-1.5 rounded-xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Chat
              </button>
            </div>

            {/* Test Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {testMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                      msg.sender === 'user' ? 'bg-[#FF8A2A] text-white' : 'bg-[#171717] text-[#FF8A2A]'
                    }`}
                  >
                    {msg.sender === 'user' ? 'You' : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1">
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#171717] text-white rounded-tr-none'
                          : 'bg-[#FFF0E5] border border-[#FF8A2A]/30 text-[#171717] rounded-tl-none font-medium'
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>

                    {/* Metadata tags for AI responses */}
                    {msg.sender === 'agent' && msg.knowledgeSourceUsed && (
                      <div className="flex items-center gap-2 pt-0.5 text-[9px] font-semibold text-[#6B6B6B]">
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {msg.knowledgeSourceUsed}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          Confidence: {Math.round((msg.confidenceScore || 0.98) * 100)}%
                        </span>
                        <span>{msg.responseTimeMs}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTestLoading && (
                <div className="flex items-center gap-2 text-xs text-[#6B6B6B] p-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
                  <span>Xia AI is thinking...</span>
                </div>
              )}
            </div>

            {/* Test Input Composer */}
            <div className="p-3 border-t border-[#E8E8E5] flex items-center gap-2 bg-[#FAF9F6] rounded-b-3xl">
              <input
                type="text"
                placeholder="Ask your AI agent something..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                className="flex-1 px-4 py-2 bg-white border border-[#E8E8E5] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#FF8A2A]"
              />
              <button
                onClick={handleSendTestMessage}
                disabled={!testInput.trim() || isTestLoading}
                className="px-4 py-2 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
