import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-white rounded-3xl border border-[#E8E8E5] p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-2xs">
      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-[#171717]">Something went wrong</h3>
        <p className="text-xs text-[#6B6B6B]">
          {message || 'Unable to fetch dashboard metrics right now.'}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try again</span>
      </button>
    </div>
  );
};
