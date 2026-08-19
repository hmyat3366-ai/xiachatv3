import React from 'react';
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
} from 'lucide-react';

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
  switch (type.toLowerCase()) {
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
  switch (status.toLowerCase()) {
    case 'connected':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Connected
        </span>
      );
    case 'connecting':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold animate-pulse">
          Connecting...
        </span>
      );
    case 'needs_attention':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
          <AlertCircle className="w-3 h-3" /> Needs Attention
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 border border-[#E8E8E5] text-gray-500 text-[10px] font-bold">
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
  return (
    <div className="space-y-6">
      {/* Header Bar & Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">Channels & Integrations</h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] mt-0.5">
            Connect your customer communication channels and manage them from one place.
          </p>
        </div>

        <button
          onClick={onConnectChannelClick || onConfigureWebsite}
          className="px-4 py-2.5 rounded-2xl bg-[#FF8A2A] hover:bg-[#D96512] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Channel</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF0E5] text-[#FF8A2A] flex items-center justify-center font-bold">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Connected Channels</p>
            <p className="text-xl font-extrabold text-[#171717]">{stats.connected} / {stats.total} Active</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Integration Security</p>
            <p className="text-xl font-extrabold text-[#171717]">SSRF & OAuth Safe</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E8E8E5] shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#6B6B6B]">Normalized Messages</p>
            <p className="text-xl font-extrabold text-[#171717]">Unified Inbox</p>
          </div>
        </div>
      </div>

      {/* Channel Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-white border border-[#E8E8E5] rounded-3xl p-6 space-y-3">
              <div className="w-10 h-10 bg-gray-200 rounded-2xl" />
              <div className="h-4 bg-gray-200 rounded-lg w-1/2" />
              <div className="h-3 bg-gray-100 rounded-lg w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((channel) => {
            const isConnected = channel.status === 'connected';

            return (
              <div
                key={channel.id}
                className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] flex items-center justify-center shrink-0">
                        {renderChannelIcon(channel.type)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-[#171717]">{channel.name}</h3>
                        <p className="text-[11px] text-[#6B6B6B]">
                          {channel.externalAccountId || `${channel.type.toUpperCase()} Integration`}
                        </p>
                      </div>
                    </div>
                    {renderStatusBadge(channel.status)}
                  </div>

                  <div className="p-3 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5]/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B6B6B] flex items-center gap-1 font-semibold">
                        <Bot className="w-3.5 h-3.5 text-[#FF8A2A]" /> Connected AI Agent:
                      </span>
                      <span className="font-extrabold text-[#171717]">{channel.defaultAgentName || 'Xia Support'}</span>
                    </div>

                    {channel.lastActivityAt && (
                      <div className="flex items-center justify-between text-[11px] text-[#6B6B6B] pt-0.5">
                        <span>Last Activity:</span>
                        <span>{new Date(channel.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Channel Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E5]/70">
                  <button
                    onClick={() => onSelectChannel(channel.id)}
                    className="text-xs font-bold text-[#171717] hover:text-[#FF8A2A] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Details
                  </button>

                  <div className="flex items-center gap-2">
                    {channel.type === 'website' ? (
                      <button
                        onClick={onConfigureWebsite}
                        className="px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-[#262626] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        Configure Widget
                      </button>
                    ) : isConnected ? (
                      <button
                        onClick={() => onDisconnectClick(channel)}
                        className="px-3 py-1.5 rounded-xl border border-[#E8E8E5] hover:bg-red-50 text-gray-600 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Unplug className="w-3.5 h-3.5 inline mr-1" /> Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectChannel(channel.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#FFF0E5] text-[#FF8A2A] hover:bg-[#FFE4D0] text-xs font-bold transition-colors cursor-pointer"
                      >
                        Configure State
                      </button>
                    )}

                    {isConnected && (
                      <button
                        onClick={() => onTestChannel(channel.id)}
                        className="p-1.5 rounded-xl border border-[#E8E8E5] hover:bg-[#FAF9F6] text-gray-500 hover:text-[#171717] cursor-pointer"
                        title="Test Health Check"
                      >
                        <RotateCcw className="w-4 h-4" />
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
