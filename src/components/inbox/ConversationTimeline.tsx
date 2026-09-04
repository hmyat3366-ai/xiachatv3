import React from 'react';
import { Bot, UserCheck, CheckCircle2, AlertTriangle, MessageSquare, Clock, RotateCcw } from 'lucide-react';
import type { ConversationItem, MessageItem } from '../../types/inbox';

interface ConversationTimelineProps {
  conversation: ConversationItem;
  messages: MessageItem[];
  className?: string;
}

interface TimelineEvent {
  id: string;
  type: 'start' | 'ai' | 'handoff' | 'agent' | 'resume' | 'resolved';
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  dotColor: string;
  bgColor: string;
}

export const ConversationTimeline: React.FC<ConversationTimelineProps> = ({
  conversation,
  messages,
  className = '',
}) => {
  const events: TimelineEvent[] = [];

  // 1. Conversation Started Event
  events.push({
    id: 'ev-start',
    type: 'start',
    title: 'Conversation Started',
    description: `Customer initiated chat via ${conversation.channel || 'Website'}`,
    time: conversation.createdAt,
    icon: MessageSquare,
    dotColor: 'bg-slate-400 text-white',
    bgColor: 'border-slate-200',
  });

  // 2. AI Autonomous Response Event
  const firstAIMsg = messages.find((m) => m.senderType === 'ai');
  if (firstAIMsg) {
    events.push({
      id: 'ev-ai',
      type: 'ai',
      title: 'AI Autonomous Mode',
      description: `Xia AI answered using ${firstAIMsg.knowledgeSource || 'Store FAQ'} (${Math.round((firstAIMsg.confidenceScore || 0.95) * 100)}% confidence)`,
      time: firstAIMsg.createdAt,
      icon: Bot,
      dotColor: 'bg-[#8B5CF6] text-white',
      bgColor: 'border-purple-200',
    });
  }

  // 3. System Handoff / Escalation Event
  const handoffMsg = messages.find((m) => m.senderType === 'system' && m.content.toLowerCase().includes('handoff'));
  if (handoffMsg || conversation.handoffReason) {
    events.push({
      id: 'ev-handoff',
      type: 'handoff',
      title: 'Handoff Escalation',
      description: conversation.handoffReason || handoffMsg?.content || 'Customer requested human agent',
      time: handoffMsg ? handoffMsg.createdAt : conversation.updatedAt,
      icon: AlertTriangle,
      dotColor: 'bg-[#F59E0B] text-white',
      bgColor: 'border-amber-200',
    });
  }

  // 4. Human Takeover / Agent Reply Event
  const firstAgentMsg = messages.find((m) => m.senderType === 'agent');
  if (firstAgentMsg) {
    events.push({
      id: 'ev-agent',
      type: 'agent',
      title: 'Human Agent Handling',
      description: `${firstAgentMsg.senderName || conversation.assignee || 'Support Agent'} sent reply`,
      time: firstAgentMsg.createdAt,
      icon: UserCheck,
      dotColor: 'bg-[#2563EB] text-white',
      bgColor: 'border-blue-200',
    });
  }

  // 5. Returned to AI Event
  const resumeMsg = messages.find((m) => m.senderType === 'system' && m.content.toLowerCase().includes('returned to xia ai'));
  if (resumeMsg) {
    events.push({
      id: 'ev-resume',
      type: 'resume',
      title: 'Returned to AI',
      description: 'Conversation returned to Xia AI autonomous handling',
      time: resumeMsg.createdAt,
      icon: RotateCcw,
      dotColor: 'bg-[#8B5CF6] text-white',
      bgColor: 'border-purple-200',
    });
  }

  // 6. Resolved Event
  const isResolved = (conversation.status || '').toUpperCase() === 'RESOLVED';
  if (isResolved || conversation.resolvedAt) {
    events.push({
      id: 'ev-resolved',
      type: 'resolved',
      title: 'Conversation Resolved',
      description: 'Marked as completed and archived',
      time: conversation.resolvedAt || conversation.updatedAt,
      icon: CheckCircle2,
      dotColor: 'bg-[#10B981] text-white',
      bgColor: 'border-emerald-200',
    });
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Timeline History</span>
        </h4>
        <span className="text-[10px] text-slate-400 font-medium">{events.length} events</span>
      </div>

      <div className="relative pl-4 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((ev) => {
          const Icon = ev.icon;
          return (
            <div key={ev.id} className="relative group">
              {/* Timeline marker */}
              <div
                className={`absolute -left-4 top-0.5 w-4.5 h-4.5 rounded-full ${ev.dotColor} flex items-center justify-center ring-4 ring-white shadow-2xs`}
              >
                <Icon className="w-2.5 h-2.5" />
              </div>

              {/* Event Content */}
              <div className="pl-3 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-bold text-slate-800 leading-none">{ev.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{formatTime(ev.time)}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug mt-1">{ev.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
