import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
  ];

  const score = checks.filter((c) => c.met).length;

  const getStrengthLabel = () => {
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', text: 'text-blue-600' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strength = getStrengthLabel();

  return (
    <div className="space-y-2 mt-2 pt-1">
      {/* 4-Bar Segment Meter */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              step <= score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
        <span className={`text-[10px] font-bold uppercase tracking-wider ml-1.5 shrink-0 ${strength.text}`}>
          {strength.label}
        </span>
      </div>

      {/* Mini Criteria Pills */}
      <div className="grid grid-cols-2 gap-1 pt-1">
        {checks.map((check, idx) => (
          <div key={idx} className="flex items-center gap-1 text-[10px]">
            {check.met ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-gray-300 shrink-0" />
            )}
            <span className={check.met ? 'text-[#171717] font-medium' : 'text-gray-400'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
