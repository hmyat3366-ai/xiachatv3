import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 rounded-xl" />
          <div className="h-4 w-72 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-xl" />
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#E8E8E5] space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-gray-200 rounded-md" />
              <div className="w-8 h-8 rounded-xl bg-gray-100" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded-lg" />
            <div className="h-3 w-32 bg-gray-100 rounded-md" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded-lg" />
        <div className="h-56 bg-[#FAF9F6] rounded-2xl border border-[#E8E8E5] w-full" />
      </div>

      {/* Conversations Skeleton */}
      <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 space-y-4">
        <div className="h-6 w-48 bg-gray-200 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[#FAF9F6] rounded-xl border border-[#E8E8E5] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};
