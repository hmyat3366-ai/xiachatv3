import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  onComplete?: (value: string) => void;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  hasError = false,
  onComplete,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of single chars
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first input on mount if not disabled
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Handle typing single character
    const char = rawVal.slice(-1);

    if (char && !/^\d$/.test(char)) return; // Digits only

    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join('').slice(0, length);
    onChange(newValue);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newValue.length === length && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Jump back and delete
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newValue = newDigits.join('');
        onChange(newValue);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    const nextIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === length && onComplete) {
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3 my-3">
      {Array.from({ length }).map((_, index) => {
        const isFilled = Boolean(digits[index]);
        return (
          <input
            key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digits[index]}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl border transition-all duration-200 outline-none select-none shadow-xs ${
              hasError
                ? 'border-red-400 bg-red-50/50 text-red-700 focus:ring-4 focus:ring-red-100'
                : isFilled
                ? 'border-[#FF8A2A] bg-white text-[#171717] shadow-sm ring-2 ring-[#FF8A2A]/20'
                : 'border-[#E8E8E5] bg-[#FAF9F6] text-[#171717] focus:bg-white focus:border-[#FF8A2A] focus:ring-4 focus:ring-[#FF8A2A]/15'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        );
      })}
    </div>
  );
};
