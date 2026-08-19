import React from 'react';
import type { PlanLimits, UsageMetrics } from '../../types/billing';
import {
  MessageSquare,
  Bot,
  Users,
  Globe,
  BookOpen,
  AlertTriangle,
  ArrowUpRight,
  Infinity as InfinityIcon,
} from 'lucide-react';

interface UsageSectionProps {
  usage: UsageMetrics;
  limits: PlanLimits;
  onScrollToPlans: () => void;
  canManageBilling: boolean;
}

export const UsageSection: React.FC<UsageSectionProps> = ({
  usage,
  limits,
  onScrollToPlans,
  canManageBilling,
}) => {
  const usageItems = [
    {
      id: 'conversations',
      label: 'Monthly Conversations',
      icon: MessageSquare,
      current: usage.conversations,
      max: limits.max_conversations,
      unit: 'conversations',
    },
    {
      id: 'agents',
      label: 'AI Assistant Agents',
      icon: Bot,
      current: usage.agents,
      max: limits.max_agents,
      unit: 'agents',
    },
    {
      id: 'teamMembers',
      label: 'Team Members',
      icon: Users,
      current: usage.teamMembers,
      max: limits.max_members,
      unit: 'members',
    },
    {
      id: 'channels',
      label: 'Connected Channels',
      icon: Globe,
      current: usage.channels,
      max: limits.max_channels,
      unit: 'channels',
    },
    {
      id: 'knowledgeSources',
      label: 'Knowledge Base Sources',
      icon: BookOpen,
      current: usage.knowledgeSources,
      max: limits.max_knowledge_sources,
      unit: 'sources',
    },
  ];

  // Check if any resource is approaching or exceeding limit
  const approachingResource = usageItems.find(
    (item) => item.max !== -1 && item.current / item.max >= 0.8 && item.current < item.max
  );
  const exceededResource = usageItems.find(
    (item) => item.max !== -1 && item.current >= item.max
  );

  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 shadow-2xs space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[#171717] tracking-tight">Usage & Capacity</h3>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Real-time usage breakdown against active plan capacity limits.
          </p>
        </div>
      </div>

      {/* Warning Notice if Approaching Limit */}
      {approachingResource && !exceededResource && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold">
                Approaching {approachingResource.label} Limit
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                You're using {approachingResource.current.toLocaleString()} of {approachingResource.max.toLocaleString()} allowed {approachingResource.unit}. Upgrade your plan to prevent service restriction.
              </p>
            </div>
          </div>
          {canManageBilling && (
            <button
              onClick={onScrollToPlans}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
            >
              <span>Upgrade Plan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Alert Notice if Exceeded Limit */}
      {exceededResource && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-extrabold">
                {exceededResource.label} Limit Reached
              </p>
              <p className="text-xs text-rose-800 mt-0.5">
                You've reached your plan limit ({exceededResource.current.toLocaleString()} / {exceededResource.max.toLocaleString()} {exceededResource.unit}). Upgrade your plan to continue creating additional resources.
              </p>
            </div>
          </div>
          {canManageBilling && (
            <button
              onClick={onScrollToPlans}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
            >
              <span>Upgrade Plan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Usage Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {usageItems.map((item) => {
          const Icon = item.icon;
          const isUnlimited = item.max === -1;
          const percentage = isUnlimited ? 0 : Math.min(100, Math.round((item.current / item.max) * 100));

          let barColor = 'bg-[#FF8A2A]';
          let textColor = 'text-[#171717]';

          if (!isUnlimited) {
            if (percentage >= 100) {
              barColor = 'bg-rose-500';
              textColor = 'text-rose-600';
            } else if (percentage >= 80) {
              barColor = 'bg-amber-500';
              textColor = 'text-amber-600';
            }
          }

          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E5] space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-[#E8E8E5] flex items-center justify-center text-[#FF8A2A] shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#171717]">{item.label}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black text-[#171717]">
                    {item.current.toLocaleString()}
                  </span>
                  <span className={`text-xs font-bold ${textColor}`}>
                    {isUnlimited ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <InfinityIcon className="w-3.5 h-3.5" />
                        <span>Unlimited</span>
                      </span>
                    ) : (
                      `/ ${item.max.toLocaleString()}`
                    )}
                  </span>
                </div>

                {!isUnlimited ? (
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${barColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-2 rounded-full bg-emerald-100/60" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
