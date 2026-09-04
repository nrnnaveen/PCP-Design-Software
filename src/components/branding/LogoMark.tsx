/**
 * FloZ ECA — Geometric PCB Logomark
 * Built strictly from PCB circuit primitives: 45° routed trace, annular via rings, and solder terminal pads.
 * Forms an authentic "F" trace path that is crisp at 16px and scaleable to 200px+.
 */

import React from 'react';

export interface LogoMarkProps {
  size?: number | string;
  className?: string;
  color?: string;
  accentColor?: string;
  isAnimated?: boolean;
  strokeProgress?: number; // 0 to 1 for animated drawing sequence
}

export const LogoMark: React.FC<LogoMarkProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  accentColor = '#0078d4',
  isAnimated = false,
  strokeProgress = 1,
}) => {
  // Total stroke length for trace paths ~120px
  const dashOffset = isAnimated ? (1 - Math.min(Math.max(strokeProgress, 0), 1)) * 140 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="FloZ ECA Logo Mark"
    >
      {/* Background board surface for high contrast if needed, subtle round */}
      <rect
        x="1.5"
        y="1.5"
        width="29"
        height="29"
        rx="4"
        className="fill-cad-panel stroke-cad-border"
        strokeWidth="1"
      />

      {/* Grid crosshair corner markers (true CAD board outline feel) */}
      <path
        d="M3 7H6 M7 3V6 M25 3V6 M26 7H29 M3 25H6 M7 26V29 M25 29V26 M26 25H29"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeOpacity="0.25"
      />

      {/* Primary Copper Trace Path: Formed as an F-topology with 45° octilinear segment */}
      <path
        d="M9 25V8H23M9 16H19L22 19"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: isAnimated ? 140 : undefined,
          strokeDashoffset: isAnimated ? dashOffset : undefined,
          transition: isAnimated ? 'none' : 'stroke-dashoffset 150ms ease',
        }}
      />

      {/* Primary Top Annular Via Pad (Top-Right of F) */}
      <circle
        cx="23"
        cy="8"
        r="3"
        fill={accentColor}
        className={isAnimated && strokeProgress < 0.6 ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'}
      />
      <circle
        cx="23"
        cy="8"
        r="1.2"
        fill="var(--surface-base, #141518)"
        className={isAnimated && strokeProgress < 0.6 ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'}
      />

      {/* Mid Spur Via Pad (Middle leg of F) */}
      <circle
        cx="22"
        cy="19"
        r="2.5"
        fill={accentColor}
        className={isAnimated && strokeProgress < 0.85 ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'}
      />
      <circle
        cx="22"
        cy="19"
        r="1"
        fill="var(--surface-base, #141518)"
        className={isAnimated && strokeProgress < 0.85 ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'}
      />

      {/* Terminal Solder Joint Pad (Bottom of F spine) */}
      <rect
        x="7.25"
        y="23.5"
        width="3.5"
        height="3.5"
        rx="0.75"
        fill={accentColor}
        className={isAnimated && strokeProgress < 0.3 ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'}
      />
    </svg>
  );
};
