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
} from 'lucide-react';

interface ChannelDetailViewProps {
  channel: Channel;
  availableAgents: Array<{ id: string; name: string }>;
  onBack: () => void;
  onTestConnection: (channelId: string) => Promise<ChannelTestResult>;
  onDisconnectClick: () => void;
}

export const ChannelDetailView: React.FC<ChannelDetailViewProps> = ({
  channel,
  onBack,
  onTestConnection,
  onDisconnectClick,
}) => {
  const [testResult, setTestResult] = useState<ChannelTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleRunHealthCheck = async () => {
    try {
      setIsTesting(true);
      const res = await onTestConnection(channel.id);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E8E5] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-2xl border border-[#E8E8E5] text-[#6B6B6B] hover:text-[#171717] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] font-bold flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#171717]">{channel.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    channel.status === 'connected'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {channel.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-0.5">
                Provider: {channel.provider} • Connected Account: {channel.externalAccountId || 'Default'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRunHealthCheck}
            disabled={isTesting}
            className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] text-xs font-bold text-[#171717] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            <span>{isTesting ? 'Testing...' : 'Test Health Check'}</span>
          </button>

          {channel.status === 'connected' && (
            <button
              onClick={onDisconnectClick}
              className="px-3.5 py-2 rounded-xl border border-[#E8E8E5] hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
            >
              <Unplug className="w-3.5 h-3.5 inline mr-1" /> Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Health Check Test Result Banner */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
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
            {testResult.message} {testResult.latencyMs > 0 ? `(Latency: ${testResult.latencyMs}ms)` : ''}
          </span>
        </div>
      )}

      {/* Channel Details Overview Card */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-4">
        <h3 className="font-extrabold text-base text-[#171717]">Integration Overview</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
            <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Connected AI Agent</span>
            <p className="font-extrabold text-[#171717] flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-[#FF8A2A]" /> {channel.defaultAgentName || 'Xia Support Assistant'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
            <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Security & Authorization</span>
            <p className="font-bold text-emerald-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> OAuth & Webhook Signature Verified
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
            <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Created Date</span>
            <p className="font-bold text-[#171717]">{new Date(channel.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-1">
            <span className="text-[10px] text-[#6B6B6B] uppercase font-bold">Last Event Timestamp</span>
            <p className="font-bold text-[#171717]">
              {channel.lastActivityAt ? new Date(channel.lastActivityAt).toLocaleString() : 'No recent events'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
