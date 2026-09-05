import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Globe,
  Clock,
  ExternalLink,
  MessageSquarePlus,
  RefreshCw,
  X,
  Sparkles,
  Users,
  Compass,
  Monitor,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

export interface LiveVisitor {
  id: string;
  workspace_id: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  current_page?: string | null;
  page_title?: string | null;
  time_spent_seconds?: number | null;
  last_seen_at: string;
  browser_id?: string | null;
  ip_address?: string | null;
}

interface LiveVisitorsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSelectConversation: (conversationId: string) => void;
}

export const LiveVisitorsDrawer: React.FC<LiveVisitorsDrawerProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onSelectConversation,
}) => {
  const [visitors, setVisitors] = useState<LiveVisitor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initiatingId, setInitiatingId] = useState<string | null>(null);
  const [customMsgId, setCustomMsgId] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');

  const fetchVisitors = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const res = await apiFetch(`/api/visitors/live?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setVisitors(data.visitors || []);
      }
    } catch (err) {
      console.error('Failed to load live visitors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) {
      fetchVisitors();
      const interval = setInterval(fetchVisitors, 10000); // 10s auto-refresh
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchVisitors]);

  const handleStartChat = async (visitor: LiveVisitor, overrideMessage?: string) => {
    try {
      setInitiatingId(visitor.id);
      const res = await apiFetch(`/api/visitors/${visitor.id}/initiate-chat?workspaceId=${workspaceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initialMessage: overrideMessage || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onClose();
        if (data.conversationId) {
          onSelectConversation(data.conversationId);
        }
      }
    } catch (err) {
      console.error('Failed to initiate proactive chat:', err);
    } finally {
      setInitiatingId(null);
      setCustomMsgId(null);
      setCustomText('');
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '< 1m';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5 animate-pulse text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">Live Website Visitors</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {visitors.length} Online
                </span>
              </div>
              <p className="text-xs text-slate-500">Live browsing presence on your website</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={fetchVisitors}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Refresh now"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visitor List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {visitors.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No active visitors right now</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                When customers visit your website with the Xia Chat Widget installed, their active page browsing and duration will appear here in real-time.
              </p>
            </div>
          ) : (
            visitors.map((v) => {
              const displayName = v.customer_name || `Visitor #${v.id.substring(0, 6)}`;
              const isCustomizing = customMsgId === v.id;
              const isInitiating = initiatingId === v.id;

              return (
                <div
                  key={v.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-2.5"
                >
                  {/* Visitor Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{displayName}</div>
                        {v.customer_email && (
                          <div className="text-[11px] text-slate-400 truncate">{v.customer_email}</div>
                        )}
                      </div>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatDuration(v.time_spent_seconds)}
                    </span>
                  </div>

                  {/* Current Page card */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 truncate">
                      <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{v.page_title || 'Browsing Website'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono truncate">
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate">{v.current_page || '/'}</span>
                    </div>
                  </div>

                  {/* Proactive Trigger Controls */}
                  {isCustomizing ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder={`Hi there! I noticed you are viewing ${v.page_title || 'our website'}. Need any assistance?`}
                        rows={2}
                        className="w-full text-xs p-2.5 rounded-xl border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none bg-blue-50/20"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomMsgId(null)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartChat(v, customText)}
                          disabled={isInitiating}
                          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                        >
                          {isInitiating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Send & Open Chat
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleStartChat(v)}
                        disabled={isInitiating}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                      >
                        {isInitiating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>Proactive Chat</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomMsgId(v.id);
                          setCustomText(
                            `Hi there! 👋 I noticed you're exploring ${v.page_title || 'our site'}. Can I help answer any questions?`
                          );
                        }}
                        className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                        title="Customize initial message"
                      >
                        Customize
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Active within past 5 minutes</span>
          <span className="font-semibold text-slate-700">Auto-refresh: 10s</span>
        </div>
      </div>
    </div>
  );
};
