/**
 * FloZ — Modern Product Landing Page
 * Fast, fluid, human-first presentation.
 * Clean typography, interactive 3D board tilt, 3-mode live showcase,
 * animated circuit pulses, zero AI fluff or engineering jargon.
 */

import React, { useState, useRef } from 'react';
import { Logo } from '../components/branding/Logo';
import { CircuitMotionGraphic } from '../components/branding/CircuitMotionGraphic';
import {
  Layers,
  Box,
  FileCode,
  Download,
  ArrowRight,
  User,
  LayoutDashboard,
  Cpu,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

interface LandingProps {
  onOpenWorkspace: () => void;
  onOpenDashboard?: () => void;
  onOpenGuest: () => void;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTerms: () => void;
  onOpenAbout: () => void;
}

export const Landing: React.FC<LandingProps> = ({
  onOpenWorkspace,
  onOpenDashboard,
  onOpenGuest,
  onOpenLogin,
  onOpenSignup,
  onOpenPrivacyPolicy,
  onOpenTerms,
  onOpenAbout,
}) => {
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'pcb' | 'schematic' | '3d'>('pcb');
  
  // Interactive 3D Card Tilt State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number; isHovered: boolean }>({
    x: 0,
    y: 0,
    isHovered: false,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Max tilt 7 degrees
    const tiltX = ((y - centerY) / centerY) * -5;
    const tiltY = ((x - centerX) / centerX) * 5;
    
    setTilt({ x: tiltX, y: tiltY, isHovered: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, isHovered: false });
  };

  return (
    <div className="min-h-screen w-full bg-cad-bg text-cad-text select-none flex flex-col overflow-y-auto relative font-sans scroll-smooth">
      {/* 1. Sleek Modern Navigation */}
      <header className="h-14 border-b border-cad-border bg-cad-panel/85 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo size="md" />

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-cad-textMuted">
            <a href="#features" className="hover:text-cad-text transition-colors duration-fast">
              Features
            </a>
            <a href="#showcase" className="hover:text-cad-text transition-colors duration-fast">
              Showcase
            </a>
            <button onClick={onOpenAbout} className="hover:text-cad-text transition-colors duration-fast">
              About
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <button
            onClick={onOpenLogin}
            className="px-3 py-1.5 text-cad-text hover:text-cad-textHeading font-medium transition-colors duration-fast eng-tactile"
          >
            Sign In
          </button>
          <button
            onClick={onOpenSignup}
            className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text font-medium rounded-md transition-colors duration-fast eng-tactile"
          >
            Sign Up
          </button>
          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text font-medium rounded-md flex items-center gap-1.5 transition-colors duration-fast eng-tactile"
            >
              <LayoutDashboard size={13} className="text-blue-500" />
              <span>Dashboard</span>
            </button>
          )}
          <button
            onClick={onOpenWorkspace}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md flex items-center gap-1.5 shadow-xs transition-colors duration-fast eng-tactile"
          >
            <span>Launch App</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* 2. Hero Section with Interactive Kinetic Background */}
      <section className="relative pt-14 sm:pt-20 pb-20 px-4 sm:px-8 max-w-5xl mx-auto w-full flex flex-col items-center text-center">
        {/* Ambient kinetic circuit simulation */}
        <CircuitMotionGraphic opacity={0.25} density="medium" interactive={true} />

        {/* Clean pill badge */}
        <div className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cad-panel/90 border border-cad-border text-xs text-cad-textMuted mb-6 backdrop-blur-xs shadow-xs animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-cad-text">FloZ Studio</span>
          <span className="text-cad-border">·</span>
          <span>Fast, Visual Circuit Design</span>
        </div>

        {/* Headline */}
        <h1 className="relative text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-cad-textHeading max-w-3xl leading-[1.15]">
          Circuit design, beautifully simple.
        </h1>

        {/* Subtitle */}
        <p className="relative mt-4 text-sm sm:text-base text-cad-textMuted max-w-xl leading-relaxed">
          Draw schematics, route circuit boards, and inspect in real-time 3D. Everything runs instantly in your browser or on your desktop.
        </p>

        {/* Primary CTA Buttons */}
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3 z-10">
          <button
            onClick={onOpenWorkspace}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-md flex items-center gap-2 shadow-xs transition-all duration-fast eng-tactile"
          >
            <span>Open Workspace</span>
            <ArrowRight size={15} />
          </button>

          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="px-4 py-2.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text text-sm font-medium rounded-md border border-cad-border flex items-center gap-2 transition-colors duration-fast eng-tactile"
            >
              <LayoutDashboard size={15} className="text-blue-500" />
              <span>Dashboard</span>
            </button>
          )}

          <button
            onClick={onOpenGuest}
            className="px-4 py-2.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text text-sm font-medium rounded-md border border-cad-border flex items-center gap-2 transition-colors duration-fast eng-tactile"
          >
            <User size={15} className="text-emerald-500" />
            <span>Try without account</span>
          </button>
        </div>

        {/* Interactive 3D Board Showcase with View Mode Switcher */}
        <div
          id="showcase"
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: tilt.isHovered
              ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.01, 1.01, 1.01)`
              : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
            transition: tilt.isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
          }}
          className="relative mt-12 w-full max-w-3xl bg-cad-panel border border-cad-border rounded-lg shadow-2xl overflow-hidden text-left z-10 will-change-transform"
        >
          {/* Card Top Chrome & Interactive Mode Switcher */}
          <div className="h-10 bg-cad-header border-b border-cad-border px-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-cad-textMuted font-mono text-[11px] ml-2 hidden sm:inline">
                controller.floz · Active Design
              </span>
            </div>

            {/* Interactive Showcase Tabs */}
            <div className="flex items-center bg-cad-subpanel border border-cad-border rounded-md p-0.5 text-[11px]">
              <button
                onClick={() => setActiveShowcaseTab('pcb')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 font-medium ${
                  activeShowcaseTab === 'pcb'
                    ? 'bg-cad-panel text-blue-500 shadow-xs'
                    : 'text-cad-textMuted hover:text-cad-text'
                }`}
              >
                <Layers size={12} />
                <span>PCB View</span>
              </button>
              <button
                onClick={() => setActiveShowcaseTab('schematic')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 font-medium ${
                  activeShowcaseTab === 'schematic'
                    ? 'bg-cad-panel text-blue-500 shadow-xs'
                    : 'text-cad-textMuted hover:text-cad-text'
                }`}
              >
                <FileCode size={12} />
                <span>Schematic</span>
              </button>
              <button
                onClick={() => setActiveShowcaseTab('3d')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 font-medium ${
                  activeShowcaseTab === '3d'
                    ? 'bg-cad-panel text-blue-500 shadow-xs'
                    : 'text-cad-textMuted hover:text-cad-text'
                }`}
              >
                <Box size={12} />
                <span>3D View</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen View */}
          <div className="h-64 sm:h-76 bg-[#101114] relative overflow-hidden flex items-center justify-center p-6">
            {/* Ambient subtle grid dots */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'radial-gradient(#3a3e4b 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* View Mode 1: PCB View */}
            {activeShowcaseTab === 'pcb' && (
              <div className="relative w-full max-w-md h-56 border border-emerald-600/60 rounded-xs bg-[#09120d] p-4 flex flex-col justify-between shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start font-mono text-[10px] text-white/60">
                  <span>FloZ Controller</span>
                  <span className="text-emerald-400">Top Copper</span>
                </div>

                {/* Animated Vector Circuit Traces */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 440 220">
                  {/* Traces with subtle pulse glow */}
                  <path d="M 50 70 L 120 70 L 150 100 L 220 100" stroke="#e05638" strokeWidth="2.5" fill="none" />
                  <path d="M 50 95 L 100 95 L 130 125 L 220 125" stroke="#e05638" strokeWidth="2.5" fill="none" />
                  <path d="M 220 125 L 290 125 L 320 155 L 380 155" stroke="#e05638" strokeWidth="2.5" fill="none" />
                  <path d="M 80 155 L 150 155 L 180 125 L 260 125" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 2" fill="none" />

                  {/* Animated Electron Packets */}
                  <circle cx="150" cy="100" r="3.5" fill="#f59e0b" className="animate-ping opacity-75" />
                  <circle cx="150" cy="100" r="3.5" fill="#f59e0b" />
                  <circle cx="290" cy="125" r="3.5" fill="#f59e0b" />

                  {/* Microcontroller IC */}
                  <rect x="200" y="85" width="55" height="55" rx="3" fill="#181a1f" stroke="#475569" strokeWidth="1.5" />
                  <text x="227" y="117" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace" fontWeight="bold">MCU</text>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <rect key={`p-t-${i}`} x={206 + i * 8} y="82" width="3" height="3" fill="#e05638" />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <rect key={`p-b-${i}`} x={206 + i * 8} y="140" width="3" height="3" fill="#e05638" />
                  ))}

                  {/* Connectors & Passives */}
                  <rect x="25" y="65" width="22" height="40" rx="2" fill="#242831" stroke="#64748b" strokeWidth="1" />
                  <text x="36" y="88" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace">USB</text>

                  <rect x="110" y="66" width="9" height="6" rx="1" fill="#475569" />
                  <rect x="330" y="151" width="9" height="6" rx="1" fill="#475569" />
                </svg>

                <div className="flex justify-between items-end font-mono text-[9px] text-white/40">
                  <span>2 Layers</span>
                  <span className="text-emerald-400">Connected</span>
                </div>
              </div>
            )}

            {/* View Mode 2: Schematic View */}
            {activeShowcaseTab === 'schematic' && (
              <div className="relative w-full max-w-md h-56 border border-cad-border rounded-xs bg-[#16171b] p-4 flex flex-col justify-between shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start font-mono text-[10px] text-cad-textMuted">
                  <span>Sheet 1 / Power &amp; MCU</span>
                  <span className="text-blue-400 font-medium">Schematic</span>
                </div>

                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 440 220">
                  {/* Schematic wires */}
                  <path d="M 50 110 L 160 110" stroke="#3b82f6" strokeWidth="2" fill="none" />
                  <path d="M 160 110 L 160 80 L 220 80" stroke="#3b82f6" strokeWidth="2" fill="none" />
                  <path d="M 160 110 L 160 140 L 220 140" stroke="#3b82f6" strokeWidth="2" fill="none" />
                  <path d="M 280 80 L 360 80" stroke="#3b82f6" strokeWidth="2" fill="none" />
                  <path d="M 280 140 L 360 140" stroke="#3b82f6" strokeWidth="2" fill="none" />

                  {/* Junction dots */}
                  <circle cx="160" cy="110" r="3" fill="#3b82f6" />

                  {/* Resistor R1 */}
                  <rect x="220" y="73" width="60" height="14" fill="#1f232d" stroke="#60a5fa" strokeWidth="1.5" rx="2" />
                  <text x="250" y="84" textAnchor="middle" fill="#93c5fd" fontSize="9" fontFamily="monospace">R1 · 10k</text>

                  {/* Capacitor C1 */}
                  <rect x="220" y="133" width="60" height="14" fill="#1f232d" stroke="#60a5fa" strokeWidth="1.5" rx="2" />
                  <text x="250" y="144" textAnchor="middle" fill="#93c5fd" fontSize="9" fontFamily="monospace">C1 · 100nF</text>

                  {/* Net Labels */}
                  <text x="50" y="103" fill="#34d399" fontSize="9" fontFamily="monospace">VCC (+3.3V)</text>
                  <text x="365" y="84" fill="#38bdf8" fontSize="9" fontFamily="monospace">GPIO_0</text>
                  <text x="365" y="144" fill="#a78bfa" fontSize="9" fontFamily="monospace">GND</text>
                </svg>

                <div className="flex justify-between items-end font-mono text-[9px] text-cad-textMuted">
                  <span>Net: +3.3V</span>
                  <span className="text-blue-400">0 Errors</span>
                </div>
              </div>
            )}

            {/* View Mode 3: 3D View */}
            {activeShowcaseTab === '3d' && (
              <div className="relative w-full max-w-md h-56 flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                {/* Simulated 3D isometric PCB board */}
                <div
                  className="w-72 h-44 rounded-sm border border-emerald-500/70 shadow-2xl relative flex flex-col justify-between p-4"
                  style={{
                    background: 'linear-gradient(135deg, #0d2616 0%, #05140b 100%)',
                    transform: 'rotateX(25deg) rotateZ(-18deg)',
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <div className="flex justify-between items-start font-mono text-[9px] text-emerald-400/80">
                    <span>FloZ 3D</span>
                    <span>Realistic PBR</span>
                  </div>

                  {/* 3D Chip */}
                  <div
                    className="w-14 h-14 bg-zinc-800 border border-zinc-600 rounded-xs mx-auto flex items-center justify-center text-[9px] font-mono text-white/80 shadow-lg"
                    style={{ transform: 'translateZ(10px)' }}
                  >
                    MCU
                  </div>

                  <div className="flex justify-between items-end font-mono text-[8px] text-emerald-400/50">
                    <span>Gold Finish</span>
                    <span>3D Inspection</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Clean Feature Cards (Zero Fluff, Smooth Motion) */}
      <section id="features" className="py-20 px-4 sm:px-8 border-t border-cad-border bg-cad-panel">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-500 font-mono">
              Features
            </h2>
            <p className="text-2xl sm:text-3xl font-bold text-cad-textHeading tracking-tight">
              Everything you need to design circuits
            </p>
            <p className="text-xs sm:text-sm text-cad-textMuted max-w-lg mx-auto">
              Fast, visual, and modern tools built for modern hardware creators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Schematics */}
            <div className="p-5 bg-cad-subpanel border border-cad-border rounded-md space-y-3 hover:border-blue-500/60 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform">
                <FileCode size={16} />
              </div>
              <h3 className="text-sm font-semibold text-cad-textHeading group-hover:text-blue-500 transition-colors">
                Schematic Editor
              </h3>
              <p className="text-xs text-cad-textMuted leading-relaxed">
                Drag-and-drop symbols, connect wires intuitively, and label nets with ease.
              </p>
            </div>

            {/* 2. PCB Layout */}
            <div className="p-5 bg-cad-subpanel border border-cad-border rounded-md space-y-3 hover:border-emerald-500/60 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform">
                <Layers size={16} />
              </div>
              <h3 className="text-sm font-semibold text-cad-textHeading group-hover:text-emerald-500 transition-colors">
                PCB Layout
              </h3>
              <p className="text-xs text-cad-textMuted leading-relaxed">
                Smooth multi-layer routing with live clearances, snap guides, and trace tuning.
              </p>
            </div>

            {/* 3. 3D Preview */}
            <div className="p-5 bg-cad-subpanel border border-cad-border rounded-md space-y-3 hover:border-cyan-500/60 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:scale-105 transition-transform">
                <Box size={16} />
              </div>
              <h3 className="text-sm font-semibold text-cad-textHeading group-hover:text-cyan-500 transition-colors">
                3D Inspection
              </h3>
              <p className="text-xs text-cad-textMuted leading-relaxed">
                Inspect your board from any angle with realistic lighting, copper traces, and component models.
              </p>
            </div>

            {/* 4. Instant Export */}
            <div className="p-5 bg-cad-subpanel border border-cad-border rounded-md space-y-3 hover:border-amber-500/60 hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
              <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                <Download size={16} />
              </div>
              <h3 className="text-sm font-semibold text-cad-textHeading group-hover:text-amber-500 transition-colors">
                Instant Export
              </h3>
              <p className="text-xs text-cad-textMuted leading-relaxed">
                Generate clean manufacturing files and documentation ready for board production.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Minimal Footer */}
      <footer className="mt-auto border-t border-cad-border bg-cad-panel py-6 px-4 sm:px-8 text-xs text-cad-textMuted">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span>·</span>
            <span>&copy; {new Date().getFullYear()} {siteConfig.companyName}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={onOpenTerms} className="hover:text-cad-text transition-colors duration-fast">
              Terms
            </button>
            <span>·</span>
            <button onClick={onOpenPrivacyPolicy} className="hover:text-cad-text transition-colors duration-fast">
              Privacy
            </button>
            <span>·</span>
            <button onClick={onOpenAbout} className="hover:text-cad-text transition-colors duration-fast">
              About
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
