import React from 'react';
import { Bot, UserCheck, CheckCircle2, Clock, Inbox, Archive } from 'lucide-react';
import type { ConversationStatus } from '../../types/inbox';

interface ConversationStatusBadgeProps {
  status: ConversationStatus | string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const ConversationStatusBadge: React.FC<ConversationStatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const norm = (status || '').toUpperCase();

  let label = 'Open';
  let badgeClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-500';
  let Icon = Inbox;

  if (norm === 'AI_HANDLING' || norm === 'AI') {
    label = 'AI Handling';
    badgeClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    dotColor = 'bg-[#8B5CF6]';
    Icon = Bot;
  } else if (norm === 'HUMAN_HANDLING' || norm === 'HUMAN' || norm === 'ASSIGNED') {
    label = 'Human Handling';
    badgeClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-[#2563EB]';
    Icon = UserCheck;
  } else if (norm === 'RESOLVED') {
    label = 'Resolved';
    badgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-[#10B981]';
    Icon = CheckCircle2;
  } else if (norm === 'WAITING' || norm === 'WAITING_CUSTOMER') {
    label = 'Waiting Customer';
    badgeClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-[#F59E0B]';
    Icon = Clock;
  } else if (norm === 'CLOSED') {
    label = 'Closed';
    badgeClasses = 'bg-gray-100 text-gray-600 border-gray-200';
    dotColor = 'bg-gray-400';
    Icon = Archive;
  }

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-1 font-bold'
      : size === 'md'
      ? 'text-xs px-2.5 py-1 gap-1.5 font-bold'
      : 'text-[11px] px-2 py-0.5 gap-1.5 font-bold';

  const iconSizes = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center rounded-full border shrink-0 transition-colors ${sizeClasses} ${badgeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {showIcon && <Icon className={`${iconSizes} shrink-0 opacity-90`} />}
      <span>{label}</span>
    </span>
  );
};
