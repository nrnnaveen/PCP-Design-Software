/**
 * FloZ ECA — Signature Code-Driven Splash & Entry Sequence
 * Draws the PCB trace mark via SVG stroke-dashoffset, resolves the wordmark, and gracefully reveals the workspace.
 * Session-gated via sessionStorage and instantly skippable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LogoMark } from './LogoMark';
import { useReducedMotion } from '../../lib/motion/useReducedMotion';
import { CircuitMotionGraphic } from './CircuitMotionGraphic';

const SPLASH_SESSION_KEY = 'floz_splash_v1_seen';

interface SplashIntroProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete, forceShow = false }) => {
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    try {
      if (typeof window !== 'undefined' && window.location.search.includes('nosplash')) return false;
      return !sessionStorage.getItem(SPLASH_SESSION_KEY);
    } catch {
      return false;
    }
  });

  const [strokeProgress, setStrokeProgress] = useState<number>(0);
  const [showWordmark, setShowWordmark] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const finishSplash = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
    } catch {}
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);

  // Handle skip via any keypress or click
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Escape', 'Space', 'Enter'].includes(e.key)) {
        finishSplash();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, finishSplash]);

  // Main animation timer sequence
  useEffect(() => {
    if (!isVisible) return;

    if (reducedMotion) {
      // Reduced motion: static fade in, short hold, fade out
      setStrokeProgress(1);
      setShowWordmark(true);
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(finishSplash, 200);
      }, 700);
      return () => clearTimeout(timer);
    }

    // Step 1: Animate trace draw (0 -> 1 over 750ms)
    const startTime = performance.now();
    const duration = 750;

    let animFrame: number;
    const animateTrace = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Quad ease-out
      const eased = 1 - Math.pow(1 - progress, 2);
      setStrokeProgress(eased);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animateTrace);
      } else {
        // Step 2: Reveal wordmark
        setShowWordmark(true);

        // Step 3: Hold briefly, then fade out
        setTimeout(() => {
          setIsFadingOut(true);
          // Step 4: Finish and unmount
          setTimeout(finishSplash, 300);
        }, 550);
      }
    };

    animFrame = requestAnimationFrame(animateTrace);
    return () => cancelAnimationFrame(animFrame);
  }, [isVisible, reducedMotion, finishSplash]);

  if (!isVisible) return null;

  return (
    <div
      onClick={finishSplash}
      role="banner"
      aria-label="Application Loading Splash"
      className={`fixed inset-0 z-[100] bg-cad-bg flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background CAD Subgrid Pattern */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(var(--cad-border) 1px, transparent 1px), radial-gradient(var(--cad-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />

      {/* Kinetic Circuit Motion Graphic */}
      <CircuitMotionGraphic opacity={0.45} density="high" interactive={false} />

      {/* Main Lockup Container */}
      <div className="relative flex flex-col items-center space-y-4">
        <div className="relative p-2">
          <LogoMark
            size={72}
            isAnimated={!reducedMotion}
            strokeProgress={strokeProgress}
            accentColor="#0078d4"
          />
        </div>

        {/* Wordmark Fade In */}
        <div
          className={`flex flex-col items-center text-center transition-all duration-300 ${
            showWordmark ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-cad-textHeading">
              FloZ
            </span>
            <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded-xs bg-accent-subtle text-accent-primary border border-accent-primary/25">
              ECA
            </span>
          </div>
          <span className="text-[11px] font-mono text-cad-textMuted tracking-wider uppercase mt-1">
            Electronic Circuit Architect
          </span>
        </div>

        {/* Skippable prompt hint */}
        <div
          className={`absolute -bottom-16 text-[10px] font-mono text-cad-textMuted tracking-widest uppercase transition-opacity duration-300 ${
            showWordmark ? 'opacity-60' : 'opacity-0'
          }`}
        >
          Click or press Esc to skip
        </div>
      </div>
    </div>
  );
};
