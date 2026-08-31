import React, { useState } from 'react';
import type { Channel } from '../../types/channel';
import {
  Globe,
  MessageSquare,
  Camera,
  Phone,
  CheckCircle2,
  AlertCircle,
  Plus,
  Activity,
  Bot,
  ExternalLink,
  RotateCcw,
  Unplug,
  ShieldCheck,
  Zap,
  Sliders,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ChannelListProps {
  channels: Channel[];
  stats: { total: number; connected: number };
  onSelectChannel: (channelId: string) => void;
  onConfigureWebsite: () => void;
  onConnectChannelClick?: () => void;
  onTestChannel: (channelId: string) => Promise<void>;
  onDisconnectClick: (channel: Channel) => void;
  isLoading: boolean;
}

// Icon helper for channel types
function renderChannelIcon(type: string) {
  switch ((type || '').toLowerCase()) {
    case 'facebook':
      return <MessageSquare className="w-5 h-5 text-blue-600" />;
    case 'instagram':
      return <Camera className="w-5 h-5 text-pink-600" />;
    case 'whatsapp':
      return <Phone className="w-5 h-5 text-emerald-600" />;
    default:
      return <Globe className="w-5 h-5 text-[#FF8A2A]" />;
  }
}

// Status badge helper
function renderStatusBadge(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'connected':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active & Connected
        </span>
      );
    case 'connecting':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black animate-pulse">
          Connecting...
        </span>
      );
    case 'needs_attention':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black">
          <AlertCircle className="w-3 h-3 text-amber-600" /> Re-Auth Required
        </span>
      );
    case 'disconnected':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
          Disconnected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E8E8E5] text-gray-500 text-[10px] font-bold">
          Not Connected
        </span>
      );
  }
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  stats,
  onSelectChannel,
  onConfigureWebsite,
  onConnectChannelClick,
  onTestChannel,
  onDisconnectClick,
  isLoading,
}) => {
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setTestingId(id);
      await onTestChannel(id);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BAR & PRIMARY CTA
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Channels & Integrations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#D96512] text-xs font-black">
              {stats.connected} / {stats.total} Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Connect customer communication endpoints to centralise conversations into your Unified Inbox.
          </p>
        </div>

        <button
          onClick={onConnectChannelClick || onConfigureWebsite}
          className="px-4 py-2.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] active:bg-[#C2550A] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Channel</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SUMMARY METRICS CARDS
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold shadow-2xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Live Connected Channels</p>
            <p className="text-xl font-black text-[#171717]">
              {stats.connected} <span className="text-xs text-gray-400 font-normal">/ {stats.total} Active</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-2xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Webhook Delivery Rate</p>
            <p className="text-xl font-black text-emerald-600">99.98%</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-2xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">AI Autonomous Coverage</p>
            <p className="text-xl font-black text-[#171717]">100% Omnichannel</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CHANNELS GRID
         ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-[#E8E8E5]">
          <div className="w-7 h-7 border-2 border-[#FF8A2A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B6B6B] font-medium">Checking integration statuses...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((channel) => {
            const isConnected = channel.status === 'connected';
            const isTesting = testingId === channel.id;

            return (
              <div
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className="bg-white rounded-3xl border border-[#E8E8E5] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top: Icon + Title + Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                        {renderChannelIcon(channel.type)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-[#171717] group-hover:text-[#FF8A2A] transition-colors">
                            {channel.name}
                          </h3>
                        </div>
                        <p className="text-[11px] text-[#6B6B6B] mt-0.5">
                          {channel.type === 'website' && 'Real-time embedded customer live chat widget'}
                          {channel.type === 'facebook' && 'Meta Facebook Page & Messenger automated messaging'}
                          {channel.type === 'instagram' && 'Instagram Direct Messages and Story Mentions'}
                          {channel.type === 'whatsapp' && 'Official WhatsApp Business Cloud API'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">{renderStatusBadge(channel.status)}</div>
                  </div>

                  {/* Details & Config Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-4 pt-1">
                    <span className="px-2.5 py-1 rounded-xl bg-[#FAF9F6] border border-[#E8E8E5] text-[10px] font-bold text-[#6B6B6B] flex items-center gap-1">
                      <Bot className="w-3 h-3 text-[#FF8A2A]" />
                      <span>Assigned: {channel.defaultAgentName || 'Xia AI Assistant'}</span>
                    </span>

                    {channel.externalAccountId && (
                      <span className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-[10px] font-mono text-blue-700">
                        ID: {channel.externalAccountId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="pt-3.5 border-t border-[#E8E8E5] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isConnected && (
                      <button
                        onClick={(e) => handleTest(channel.id, e)}
                        disabled={isTesting}
                        className="text-[11px] font-bold text-[#6B6B6B] hover:text-[#171717] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className={`w-3 h-3 ${isTesting ? 'animate-spin text-[#FF8A2A]' : ''}`} />
                        <span>{isTesting ? 'Checking...' : 'Health Check'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDisconnectClick(channel);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Disconnect Channel"
                        >
                          <Unplug className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onSelectChannel(channel.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Configure</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (channel.type === 'website') onConfigureWebsite();
                          else if (onConnectChannelClick) onConnectChannelClick();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
