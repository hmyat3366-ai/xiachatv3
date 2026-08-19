import React, { useState } from 'react';
import type { ActivityChartPoint, DateRangePeriod } from '../../types/dashboard';

interface ChartPointWithCoords extends ActivityChartPoint {
  x: number;
  yConversations: number;
  yAi: number;
  yHuman: number;
}

interface ConversationActivityProps {
  data: ActivityChartPoint[];
  period: DateRangePeriod;
  onPeriodChange: (period: DateRangePeriod) => void;
}

export const ConversationActivity: React.FC<ConversationActivityProps> = ({
  data,
  period,
  onPeriodChange,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ChartPointWithCoords | null>(null);

  if (!data || data.length === 0) return null;

  // Chart dimensions
  const width = 800;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate max value for y-axis
  const maxVal = Math.max(...data.map((d) => d.conversations), 50);

  // Generate SVG coordinates
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1 || 1)) * chartWidth;
    const yConversations = paddingTop + chartHeight - (d.conversations / maxVal) * chartHeight;
    const yAi = paddingTop + chartHeight - (d.aiResolved / maxVal) * chartHeight;
    const yHuman = paddingTop + chartHeight - (d.humanHandled / maxVal) * chartHeight;
    return { ...d, x, yConversations, yAi, yHuman };
  });

  const totalPath = points.reduce(
    (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yConversations}`,
    ''
  );

  const totalAreaPath = `${totalPath} L ${points[points.length - 1].x} ${
    height - paddingBottom
  } L ${paddingLeft} ${height - paddingBottom} Z`;

  const aiPath = points.reduce(
    (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yAi}`,
    ''
  );

  const humanPath = points.reduce(
    (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.yHuman}`,
    ''
  );

  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-6 shadow-2xs">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E8E5]">
        <div>
          <h3 className="font-bold text-lg text-[#171717]">Conversation Activity</h3>
          <p className="text-xs text-[#6B6B6B]">
            Daily trend of total inbound chats, AI auto-resolutions, and human agent handoffs
          </p>
        </div>

        {/* Legend & Period Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 text-xs font-semibold text-[#6B6B6B]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#171717]" />
              <span>Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A2A]" />
              <span>AI Resolved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Human Handled</span>
            </div>
          </div>

          {/* Period Selector Toggle */}
          <div className="bg-[#FAF9F6] p-1 rounded-xl border border-[#E8E8E5] flex items-center gap-1">
            <button
              onClick={() => onPeriodChange('7d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === '7d'
                  ? 'bg-white text-[#FF8A2A] shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              7 days
            </button>
            <button
              onClick={() => onPeriodChange('30d')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === '30d'
                  ? 'bg-white text-[#FF8A2A] shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#171717]'
              }`}
            >
              30 days
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#171717" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#171717" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E8E8E5"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#6B6B6B"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={totalAreaPath} fill="url(#totalGradient)" />

          {/* Lines */}
          <path d={totalPath} fill="none" stroke="#171717" strokeWidth="2.5" strokeLinecap="round" />
          <path d={aiPath} fill="none" stroke="#FF8A2A" strokeWidth="2" strokeLinecap="round" />
          <path d={humanPath} fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="3 3" strokeLinecap="round" />

          {/* Interactive Data Dots & Hover trigger */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)}>
              <circle cx={p.x} cy={p.yConversations} r="4" fill="#171717" />
              <circle cx={p.x} cy={p.yAi} r="3.5" fill="#FF8A2A" />

              {/* Invisible touch target for easy hover */}
              <rect
                x={p.x - (chartWidth / points.length) / 2}
                y={paddingTop}
                width={chartWidth / points.length}
                height={chartHeight}
                fill="transparent"
              />
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute top-4 bg-[#171717] text-white p-3 rounded-2xl shadow-xl text-xs space-y-1 z-20 pointer-events-none transform -translate-x-1/2 transition-all duration-150"
            style={{ left: `${((hoveredPoint.x - paddingLeft) / chartWidth) * 100}%` }}
          >
            <p className="font-bold text-gray-300 border-b border-gray-700 pb-1">{hoveredPoint.date}</p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Total Chats:</span>
              <span className="font-bold">{hoveredPoint.conversations}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#FF8A2A]">AI Resolved:</span>
              <span className="font-bold">{hoveredPoint.aiResolved}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-amber-400">Human Handled:</span>
              <span className="font-bold">{hoveredPoint.humanHandled}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
