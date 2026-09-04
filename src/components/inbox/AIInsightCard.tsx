import React from 'react';
import { Sparkles, Smile, Meh, Frown, Compass, ShieldCheck } from 'lucide-react';

interface AIInsightCardProps {
  intent?: string | null;
  sentiment?: string | null;
  aiSummary?: string | null;
  confidenceScore?: number | null;
  recommendedAction?: string | null;
  className?: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  intent = 'General Inquiry',
  sentiment = 'neutral',
  aiSummary = 'Customer reached out for support.',
  confidenceScore = 0.95,
  recommendedAction = 'Provide helpful guidance and verify customer satisfaction.',
  className = '',
}) => {
  const normSentiment = (sentiment || 'neutral').toLowerCase();
  const scorePercent = Math.round((confidenceScore || 0.95) * 100);

  return (
    <div
      className={`rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/70 via-white to-orange-50/30 p-4 shadow-xs space-y-3.5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">AI Intelligence</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          {scorePercent}% confidence
        </span>
      </div>

      {/* Badges Row: Intent & Sentiment */}
      <div className="grid grid-cols-2 gap-2">
        {/* Intent */}
        <div className="p-2.5 rounded-lg bg-white/90 border border-slate-100 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Intent</p>
          <p className="text-xs font-bold text-slate-800 truncate" title={intent || 'General Inquiry'}>
            {intent || 'General Inquiry'}
          </p>
        </div>

        {/* Sentiment */}
        <div className="p-2.5 rounded-lg bg-white/90 border border-slate-100 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sentiment</p>
          <div className="flex items-center gap-1.5">
            {normSentiment === 'positive' ? (
              <>
                <Smile className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-700">Positive</span>
              </>
            ) : normSentiment === 'negative' ? (
              <>
                <Frown className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="text-xs font-bold text-red-700">Urgent / Angry</span>
              </>
            ) : (
              <>
                <Meh className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Neutral</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="p-2.5 rounded-lg bg-white/90 border border-slate-100 shadow-2xs space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Summary</p>
        <p className="text-xs text-slate-700 leading-relaxed font-normal">
          {aiSummary || 'Customer needs assistance with order tracking and delivery status.'}
        </p>
      </div>

      {/* Recommended Action */}
      <div className="p-2.5 rounded-lg bg-orange-50/60 border border-orange-200/80 shadow-2xs space-y-1">
        <div className="flex items-center gap-1.5 text-[#D96512]">
          <Compass className="w-3.5 h-3.5 shrink-0" />
          <p className="text-[10px] font-extrabold uppercase tracking-wider">Recommended Action</p>
        </div>
        <p className="text-xs font-medium text-slate-800 leading-snug">
          {recommendedAction}
        </p>
      </div>
    </div>
  );
};
