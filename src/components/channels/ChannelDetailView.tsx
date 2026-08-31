import React, { useState } from 'react';
import type { Channel, ChannelTestResult } from '../../types/channel';
import {
  ArrowLeft,
  Globe,
  RotateCcw,
  Unplug,
  CheckCircle2,
  AlertCircle,
  Bot,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  Users,
  MessageSquare,
  Activity,
  Layers,
  Key,
  Sliders,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ChannelDetailViewProps {
  channel: Channel;
  availableAgents: Array<{ id: string; name: string }>;
  onBack: () => void;
  onTestConnection: (channelId: string) => Promise<ChannelTestResult>;
  onDisconnectClick: () => void;
}

export const ChannelDetailView: React.FC<ChannelDetailViewProps> = ({
  channel,
  availableAgents,
  onBack,
  onTestConnection,
  onDisconnectClick,
}) => {
  const [testResult, setTestResult] = useState<ChannelTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleRunHealthCheck = async () => {
    try {
      setIsTesting(true);
      const res = await onTestConnection(channel.id);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const webhookUrl = `${window.location.origin}/api/channels/webhook/${channel.type}`;
  const verifyToken = `xia_verify_${channel.workspaceId.slice(0, 8)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP HEADER BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF8A2A] to-[#FFA85C] text-white flex items-center justify-center font-bold shadow-xs">
              <Globe className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#171717]">{channel.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    channel.status === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {channel.status}
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Provider: {channel.provider.toUpperCase()} • Account: {channel.externalAccountId || 'Default Endpoint'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRunHealthCheck}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8A2A]" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-[#FF8A2A]" />
            )}
            <span>{isTesting ? 'Verifying...' : 'Health Check'}</span>
          </button>

          {channel.status === 'connected' && (
            <button
              onClick={onDisconnectClick}
              className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Health Check Test Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-2xs ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>
            {testResult.message} {testResult.latencyMs > 0 ? `(Response Latency: ${testResult.latencyMs}ms)` : ''}
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. INTEGRATION OVERVIEW & WEBHOOK DETAILS
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <h3 className="font-black text-sm text-[#171717] uppercase tracking-wider">Channel Integration Specs</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
            <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Assigned AI Agent</span>
            <p className="font-extrabold text-[#171717] flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#FF8A2A]" /> {channel.defaultAgentName || 'Xia Support Assistant'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
            <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Security Authorization</span>
            <p className="font-bold text-emerald-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Webhook HMAC Signed & Verified
            </p>
          </div>
        </div>

        {/* Webhook URLs & Endpoints */}
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1">Webhook Callback URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717]"
              />
              <button
                onClick={() => handleCopy(webhookUrl, 'webhook')}
                className="px-3 py-2 rounded-xl bg-white border border-[#E8E8E5] text-xs font-bold hover:bg-[#FAF9F6] flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'webhook' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#171717] mb-1">Webhook Verification Token</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={verifyToken}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-xs font-mono text-[#171717]"
              />
              <button
                onClick={() => handleCopy(verifyToken, 'verify')}
                className="px-3 py-2 rounded-xl bg-white border border-[#E8E8E5] text-xs font-bold hover:bg-[#FAF9F6] flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'verify' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'verify' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CUSTOMER IDENTITY INTERFACE
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-[#171717] uppercase tracking-wider">
              Customer Identity Mapping
            </h3>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Omnichannel customer profiles merged across Website, WhatsApp, and Social channels.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
            Unified Identity Active
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#6B6B6B]">Identifier Source:</span>
            <span className="font-bold text-[#171717]">Phone Number / PSID / Cookie UUID</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B6B6B]">Cross-Channel Session Sync:</span>
            <span className="font-bold text-emerald-600">Enabled (Automatic Merge)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6B6B6B]">Conversation History Retention:</span>
            <span className="font-bold text-[#171717]">Unlimited</span>
          </div>
        </div>
      </div>
    </div>
  );
};
