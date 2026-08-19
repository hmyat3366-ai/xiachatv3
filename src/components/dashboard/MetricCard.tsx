import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  trend?: string;
  attentionSubtext?: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  attentionSubtext,
  icon: Icon,
  iconBg = 'bg-[#FFF0E5]',
  iconColor = 'text-[#FF8A2A]',
}) => {
  const isNegativeTrend = trend ? trend.startsWith('-') : false;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E8E8E5] shadow-2xs hover:border-gray-300 transition-all duration-150 flex flex-col justify-between space-y-3">
      {/* Top Title & Subtle Icon */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#6B6B6B] tracking-tight">{title}</span>
        <div className={`p-2 rounded-xl ${iconBg} ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Main Value Number */}
      <div className="space-y-1">
        <p className="text-2xl sm:text-3xl font-extrabold text-[#171717] tracking-tight">{value}</p>

        {/* Trend Indicator or Subtext */}
        {trend && (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {isNegativeTrend ? (
              <span className="text-amber-600 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {trend}
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {trend}
              </span>
            )}
          </div>
        )}

        {attentionSubtext && (
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            {attentionSubtext}
          </p>
        )}
      </div>
    </div>
  );
};
