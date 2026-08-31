import React from 'react';
import { Loader2 } from 'lucide-react';

interface GoogleAuthButtonProps {
  intent?: 'login' | 'signup';
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  intent = 'login',
  isLoading = false,
  disabled = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="w-full py-2.5 px-4 rounded-xl border border-[#E8E8E5] bg-white hover:bg-[#FAF9F6] active:bg-[#F2F2F0] text-[#171717] font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-3 shadow-2xs hover:shadow-xs hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-[#FF8A2A]" />
      ) : (
        <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.36 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
      )}
      <span>{intent === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
    </button>
  );
};
