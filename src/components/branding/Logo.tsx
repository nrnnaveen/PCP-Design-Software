/**
 * FloZ ECA — Official Brand Lockup
 * Combines the geometric PCB LogoMark with the precision typography wordmark.
 * Standardized across navbar, splash, landing, and auth dialogs.
 */

import React from 'react';
import { LogoMark } from './LogoMark';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark-only';
  subtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'full',
  subtitle = false,
  className = '',
  onClick,
}) => {
  const markSizeMap = {
    sm: 18,
    md: 24,
    lg: 32,
    xl: 48,
  };

  const titleSizeMap = {
    sm: 'text-xs tracking-tight',
    md: 'text-sm font-semibold tracking-tight',
    lg: 'text-base font-semibold tracking-tight',
    xl: 'text-xl font-bold tracking-tight',
  };

  const subtitleSizeMap = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-[11px]',
    xl: 'text-xs',
  };

  const markSize = markSizeMap[size] || 24;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <LogoMark size={markSize} />

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`text-cad-textHeading font-semibold ${titleSizeMap[size]}`}>
              FloZ
            </span>
            <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded-xs bg-accent-subtle text-accent-primary border border-accent-primary/20">
              ECA
            </span>
          </div>

          {subtitle && (
            <span className={`text-cad-textMuted font-mono uppercase tracking-wider mt-0.5 ${subtitleSizeMap[size]}`}>
              Electronic Circuit Architect
            </span>
          )}
        </div>
      )}
    </div>
  );
};
