/**
 * FloZ — AI PCB Design Software (Prompt to Real PCB)
 * Full-Screen Cinematic Video Landing Page.
 * Plays pcp_intro.mp4 in full-screen with sleek Sign In & Sign Up actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  LogIn,
  UserPlus,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

interface LandingProps {
  onOpenWorkspace: () => void;
  onOpenDashboard?: () => void;
  onOpenGuest?: () => void;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTerms: () => void;
  onOpenAbout: () => void;
}

export const Landing: React.FC<LandingProps> = ({
  onOpenWorkspace,
  onOpenDashboard,
  onOpenLogin,
  onOpenSignup,
  onOpenPrivacyPolicy,
  onOpenTerms,
  onOpenAbout,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [hasEnded, setHasEnded] = useState<boolean>(false);

  // Autoplay video on initial load
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, []);

  const handleToggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setHasEnded(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black text-white select-none flex flex-col font-sans">
      {/* 1. Full-Screen Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          loop
          onEnded={() => setHasEnded(true)}
          className="w-full h-full object-cover pointer-events-none"
        >
          <source src="/pcp_intro.mp4" type="video/mp4" />
          <source src="./pcp_intro.mp4" type="video/mp4" />
        </video>

        {/* Minimal subtle vignettes at top and bottom so the center video is 100% crisp and unobstructed */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
      </div>

      {/* 2. Top Navigation Bar with High-Visibility FloZ Branding */}
      <header className="relative z-20 h-20 px-6 sm:px-10 flex items-center justify-between">
        {/* Highly Visible FloZ Brand Lockup in Top-Left Corner */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-[0_0_22px_rgba(0,180,255,0.5)] flex items-center justify-center transition-transform duration-300 hover:scale-105">
            <div className="w-full h-full rounded-[10px] bg-black/80 backdrop-blur-sm flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,220,255,0.85)]" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              FloZ
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 tracking-wider shadow-[0_0_12px_rgba(0,200,255,0.35)]">
              AI EDA
            </span>
          </div>
        </div>

        {/* Audio & Video Controls */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 hover:border-white/40 text-white/90 hover:text-white transition-all shadow-lg hover:scale-105"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 hover:border-white/40 text-white/90 hover:text-white transition-all shadow-lg hover:scale-105"
            title="Replay Video"
            aria-label="Replay Video"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      {/* 3. Unobstructed Center View — Full Video Animation Only */}
      <main className="flex-1" />

      {/* 4. Bottom Actions: Login and Sign Up Buttons Only */}
      <div className="relative z-20 pb-8 sm:pb-10 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-xs sm:max-w-md justify-center">
          {/* Login Button */}
          <button
            type="button"
            onClick={onOpenLogin}
            className="w-full sm:w-1/2 py-3.5 px-6 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/25 hover:border-white/50 text-white font-semibold flex items-center justify-center gap-2.5 shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm sm:text-base group"
          >
            <LogIn size={18} className="text-white/80 group-hover:text-white transition-colors" />
            <span>Login</span>
          </button>

          {/* Sign Up Button */}
          <button
            type="button"
            onClick={onOpenSignup}
            className="w-full sm:w-1/2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/40 border border-cyan-400/30 transition-all duration-200 hover:scale-105 active:scale-95 text-sm sm:text-base"
          >
            <UserPlus size={18} />
            <span>Sign Up</span>
            <ArrowRight size={16} className="text-white/80" />
          </button>
        </div>
      </div>

      {/* 5. Minimal Legal Footer */}
      <footer className="relative z-20 h-12 px-6 sm:px-10 flex items-center justify-between text-[11px] text-white/50 border-t border-white/5 backdrop-blur-xs">
        <div>
          &copy; {new Date().getFullYear()} {siteConfig.companyName}. All rights reserved.
        </div>

        <div className="flex items-center gap-4">
          <button onClick={onOpenTerms} className="hover:text-white transition-colors">
            Terms
          </button>
          <span>·</span>
          <button onClick={onOpenPrivacyPolicy} className="hover:text-white transition-colors">
            Privacy
          </button>
          <span>·</span>
          <button onClick={onOpenAbout} className="hover:text-white transition-colors">
            About
          </button>
        </div>
      </footer>
    </div>
  );
};
