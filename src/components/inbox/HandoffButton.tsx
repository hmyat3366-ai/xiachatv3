import React, { useState } from 'react';
import { UserCheck, RotateCcw, Loader2 } from 'lucide-react';
import type { ConversationStatus } from '../../types/inbox';

interface HandoffButtonProps {
  status: ConversationStatus | string;
  onTakeover: () => Promise<void> | void;
  onReturnToAI: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export const HandoffButton: React.FC<HandoffButtonProps> = ({
  status,
  onTakeover,
  onReturnToAI,
  disabled = false,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const norm = (status || '').toUpperCase();
  const isAI = norm === 'AI_HANDLING' || norm === 'AI';

  const handleClick = async () => {
    if (isLoading || disabled) return;
    try {
      setIsLoading(true);
      if (isAI) {
        await onTakeover();
      } else {
        await onReturnToAI();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isAI) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`min-h-[38px] min-w-[38px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-black active:bg-gray-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed group shrink-0 ${className}`}
        title="Take over this conversation from AI"
        aria-label="Take over this conversation from AI"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin text-white" />
        ) : (
          <UserCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#FF8A3D] transition-transform group-hover:scale-110" />
        )}
        <span className="hidden sm:inline">Take Over</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`min-h-[38px] min-w-[38px] sm:min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 border border-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${className}`}
      title="Return conversation to Xia AI autonomous handling"
      aria-label="Return conversation to Xia AI autonomous handling"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin text-purple-600" />
      ) : (
        <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-purple-600" />
      )}
      <span className="hidden sm:inline">Return to AI</span>
    </button>
  );
};
