import React from 'react';

export interface LogoProps {
  /**
   * Logo display variant:
   * - 'full': Icon + XiaChat Wordmark
   * - 'icon': Standalone abstract geometric icon mark
   * - 'wordmark': Wordmark text only
   */
  variant?: 'full' | 'icon' | 'wordmark';
  /**
   * Color theme mode:
   * - 'light': Dark text/icon for light backgrounds
   * - 'dark': Light text/icon for dark backgrounds
   * - 'orange': Primary brand orange text/icon
   */
  colorMode?: 'light' | 'dark' | 'orange';
  /**
   * Custom height/size in pixels or preset sizes
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  onClick?: () => void;
}

/**
 * XiaChat Abstract Geometric Icon Symbol
 * High-precision vector geometry representing AI + Human communication streams
 * with a subtle hidden negative-space "X".
 */
export const LogoIcon: React.FC<{
  size?: number;
  color?: string;
  accentColor?: string;
  className?: string;
}> = ({ size = 32, color = '#FF8A2A', accentColor = '#1E1E1E', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`}
      aria-label="XiaChat Icon"
    >
      {/* Primary Signal Stream (Center Diagonal Capsule) */}
      <rect x="16" y="42" width="68" height="16" rx="8" transform="rotate(-45 50 50)" fill={color} />
      
      {/* Upper Converging Communication Capsule */}
      <rect x="14" y="24" width="34" height="16" rx="8" transform="rotate(45 31 32)" fill={accentColor} />
      
      {/* Lower AI Stream Capsule */}
      <rect x="52" y="62" width="34" height="16" rx="8" transform="rotate(45 69 70)" fill={color} opacity="0.9" />
    </svg>
  );
};

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  colorMode = 'light',
  size = 'md',
  className = '',
  onClick,
}) => {
  const getIconSize = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm':
        return 24;
      case 'lg':
        return 40;
      case 'xl':
        return 48;
      case 'md':
      default:
        return 32;
    }
  };

  const iconPx = getIconSize();

  const textColorClass =
    colorMode === 'dark'
      ? 'text-white'
      : colorMode === 'orange'
      ? 'text-[#FF8A2A]'
      : 'text-[#1E1E1E]';

  const iconPrimaryColor = '#FF8A2A';
  const iconAccentColor = colorMode === 'dark' ? '#FFFFFF' : '#1E1E1E';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${
        onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
      } ${className}`}
    >
      {(variant === 'full' || variant === 'icon') && (
        <LogoIcon size={iconPx} color={iconPrimaryColor} accentColor={iconAccentColor} />
      )}

      {(variant === 'full' || variant === 'wordmark') && (
        <span
          className={`font-black tracking-tight flex items-center leading-none ${textColorClass}`}
          style={{
            fontSize: `${Math.round(iconPx * 0.68)}px`,
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          <span className={colorMode === 'dark' ? 'text-white' : 'text-[#1E1E1E]'}>Xia</span>
          <span className="text-[#FF8A2A]">Chat</span>
        </span>
      )}
    </div>
  );
};
