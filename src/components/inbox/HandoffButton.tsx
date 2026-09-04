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
        className={`px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-black active:bg-gray-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed group ${className}`}
        title="Take over this conversation from AI"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
        ) : (
          <UserCheck className="w-3.5 h-3.5 text-[#FF8A3D] transition-transform group-hover:scale-110" />
        )}
        <span>Take Over</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Return conversation to Xia AI autonomous handling"
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
      ) : (
        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
      )}
      <span>Return to AI</span>
    </button>
  );
};
