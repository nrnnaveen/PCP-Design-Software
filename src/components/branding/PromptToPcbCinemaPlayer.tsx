/**
 * FloZ — Prompt-to-PCB Cinematic Video Animation Player
 * Automatic, full-screen video-style motion graphic demonstrating:
 * 1. User Prompt Ingestion & Intent Analysis
 * 2. Schematic Netlist Graph Synthesis
 * 3. Autonomous 45° Multi-Layer PCB Trace Routing
 * 4. Photorealistic 3D Manufactured Board Render
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Cpu,
  Layers,
  Box,
  FileCode,
  ArrowRight,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  mcu: string;
  components: string[];
  rails: string[];
  boardTitle: string;
}

interface CinemaPlayerProps {
  presets: PromptPreset[];
  selectedPreset: PromptPreset;
  onSelectPreset: (preset: PromptPreset) => void;
  onLaunchStudio: () => void;
}

export const PromptToPcbCinemaPlayer: React.FC<CinemaPlayerProps> = ({
  presets,
  selectedPreset,
  onSelectPreset,
  onLaunchStudio,
}) => {
  // Video progress: 0 to 100 (%)
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const durationMs = 14000; // 14 seconds full cycle

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setProgress((prev) => {
        const next = prev + (delta / durationMs) * 100;
        return next >= 100 ? 0 : next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  // Current Scene: 1 (Prompt), 2 (Schematic), 3 (PCB Routing), 4 (3D Board)
  const currentScene =
    progress < 25 ? 1 : progress < 50 ? 2 : progress < 75 ? 3 : 4;

  // Scene sub-progress (0 to 1 within each scene)
  const sceneProgress = (progress % 25) / 25;

  // Formatted seconds
  const currentSec = Math.floor((progress / 100) * (durationMs / 1000));
  const totalSec = Math.floor(durationMs / 1000);
  const timeDisplay = `00:${currentSec.toString().padStart(2, '0')} / 00:${totalSec.toString().padStart(2, '0')}`;

  // Typed text for Scene 1
  const typedLength = Math.floor(selectedPreset.prompt.length * Math.min(1, sceneProgress * 1.5));
  const typedText = selectedPreset.prompt.slice(0, typedLength);

  const handleRestart = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newPercent = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    setProgress(newPercent);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-xl border border-cad-border bg-[#0a0c10] shadow-2xl overflow-hidden flex flex-col z-10 text-cad-text">
      {/* 1. Cinematic Video Top HUD Bar */}
      <div className="h-11 bg-[#10131a] border-b border-cad-border/80 px-4 flex items-center justify-between text-xs font-mono select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold tracking-wider text-cad-textHeading text-[11px] uppercase">
              Live Video Preview
            </span>
          </div>

          <span className="text-cad-border">|</span>

          {/* Current Active Scene Title */}
          <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-semibold">
            {currentScene === 1 && (
              <>
                <Sparkles size={13} />
                <span>01. Prompt Ingestion &amp; Intent Analysis</span>
              </>
            )}
            {currentScene === 2 && (
              <>
                <FileCode size={13} />
                <span>02. Schematic Netlist Graph Synthesis</span>
              </>
            )}
            {currentScene === 3 && (
              <>
                <Layers size={13} />
                <span>03. Autonomous 45° PCB Trace Routing</span>
              </>
            )}
            {currentScene === 4 && (
              <>
                <Box size={13} />
                <span>04. Photorealistic 3D PCB Fabrication</span>
              </>
            )}
          </div>
        </div>

        {/* Video Controls & Time */}
        <div className="flex items-center gap-3 text-cad-textMuted text-[11px]">
          <span>{timeDisplay}</span>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 hover:text-cad-text hover:bg-cad-surfaceHover rounded transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          <button
            onClick={handleRestart}
            className="p-1 hover:text-cad-text hover:bg-cad-surfaceHover rounded transition-colors"
            title="Replay from start"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* 2. Interactive Video Scrub Bar */}
      <div
        onClick={handleScrub}
        className="w-full h-1.5 bg-cad-border/40 hover:h-2 transition-all cursor-pointer relative"
      >
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-emerald-500 to-cyan-400 relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md -mr-1" />
        </div>
      </div>

      {/* 3. The Video Screen Display Viewport */}
      <div className="h-80 sm:h-96 relative overflow-hidden flex items-center justify-center p-6 bg-[#08090d]">
        {/* Subtle dot matrix engineering grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#3a3e4b 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* SCENE 1: NATURAL LANGUAGE PROMPT INGESTION & DECONSTRUCTION */}
        {currentScene === 1 && (
          <div className="w-full max-w-2xl bg-[#12151d] border border-blue-500/30 rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
            {/* Terminal Topbar */}
            <div className="flex items-center justify-between border-b border-cad-border/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-cad-textMuted ml-2">
                  FloZ AI &gt; Prompt Compiler
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                Natural Language Ingestion
              </span>
            </div>

            {/* Prompt Typing Box */}
            <div className="bg-[#0b0d13] p-3.5 rounded-lg border border-cad-border font-mono text-xs sm:text-sm text-cad-text leading-relaxed flex items-start gap-2 shadow-inner min-h-[60px]">
              <Sparkles size={16} className="text-blue-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span>{typedText}</span>
                <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
              </div>
            </div>

            {/* Extracted Neural Entities */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-mono uppercase text-cad-textMuted tracking-wider">
                Deconstructed Architecture Intent:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPreset.components.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[11px] font-mono flex items-center gap-1.5 animate-in zoom-in-95 duration-150"
                  >
                    <CheckCircle2 size={11} className="text-emerald-400" />
                    <span>{c}</span>
                  </span>
                ))}
                {selectedPreset.rails.map((r, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5 animate-in zoom-in-95 duration-150"
                  >
                    <Zap size={11} className="text-amber-400" />
                    <span>{r}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCENE 2: SCHEMATIC NETLIST GRAPH SYNTHESIS */}
        {currentScene === 2 && (
          <div className="relative w-full max-w-2xl h-72 border border-blue-500/40 rounded-xl bg-[#0e1118] p-5 flex flex-col justify-between shadow-2xl animate-in fade-in duration-300">
            <div className="flex justify-between items-start font-mono text-xs z-10">
              <div className="flex items-center gap-2">
                <FileCode size={15} className="text-blue-400" />
                <span className="font-semibold text-cad-textHeading">Schematic Synthesis Engine</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                ERC: 0 Conflicts
              </span>
            </div>

            {/* Dynamic Animated Schematic Canvas */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 280">
              {/* Power Rail */}
              <line x1="80" y1="140" x2="200" y2="140" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
              <line x1="200" y1="140" x2="200" y2="90" stroke="#3b82f6" strokeWidth="2" />
              <line x1="200" y1="90" x2="270" y2="90" stroke="#3b82f6" strokeWidth="2" />
              <line x1="200" y1="140" x2="200" y2="190" stroke="#3b82f6" strokeWidth="2" />
              <line x1="200" y1="190" x2="270" y2="190" stroke="#3b82f6" strokeWidth="2" />

              <line x1="350" y1="90" x2="430" y2="90" stroke="#10b981" strokeWidth="2" />
              <line x1="350" y1="190" x2="430" y2="190" stroke="#a855f7" strokeWidth="2" />

              {/* Junction dots */}
              <circle cx="200" cy="140" r="4" fill="#3b82f6" />

              {/* Component: USB-C In */}
              <rect x="30" y="115" width="50" height="50" rx="4" fill="#181c26" stroke="#475569" strokeWidth="1.5" />
              <text x="55" y="144" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace" fontWeight="bold">USB-C</text>

              {/* Component: LDO Regulator */}
              <rect x="270" y="65" width="80" height="50" rx="4" fill="#181c26" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="310" y="90" textAnchor="middle" fill="#93c5fd" fontSize="10" fontFamily="monospace" fontWeight="bold">LDO 3.3V</text>
              <text x="310" y="103" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">AP2112K</text>

              {/* Component: I2C Sensor */}
              <rect x="270" y="165" width="80" height="50" rx="4" fill="#181c26" stroke="#a855f7" strokeWidth="1.5" />
              <text x="310" y="190" textAnchor="middle" fill="#d8b4fe" fontSize="10" fontFamily="monospace" fontWeight="bold">SENSOR</text>
              <text x="310" y="203" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">SHT31 I2C</text>

              {/* Component: Main MCU */}
              <rect x="430" y="70" width="120" height="140" rx="6" fill="#181c26" stroke="#10b981" strokeWidth="2" />
              <text x="490" y="135" textAnchor="middle" fill="#6ee7b7" fontSize="12" fontFamily="monospace" fontWeight="bold">
                {selectedPreset.mcu.split(' ')[0]}
              </text>
              <text x="490" y="152" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">Core Controller</text>

              {/* Laser Net Tags */}
              <text x="140" y="132" fill="#60a5fa" fontSize="9" fontFamily="monospace" textAnchor="middle">VBUS (5V)</text>
              <text x="390" y="82" fill="#34d399" fontSize="9" fontFamily="monospace" textAnchor="middle">+3.3V</text>
              <text x="390" y="182" fill="#c084fc" fontSize="9" fontFamily="monospace" textAnchor="middle">I2C_BUS</text>
            </svg>

            <div className="flex justify-between items-end font-mono text-[10px] text-cad-textMuted z-10 border-t border-cad-border/60 pt-2">
              <span>Synthesized Netlist: 24 Connections</span>
              <span className="text-blue-400">Zero Unconnected Pins</span>
            </div>
          </div>
        )}

        {/* SCENE 3: AUTONOMOUS 45° PCB TRACE ROUTING */}
        {currentScene === 3 && (
          <div className="relative w-full max-w-2xl h-72 border border-emerald-500/50 rounded-xl bg-[#07130b] p-5 flex flex-col justify-between shadow-2xl animate-in fade-in duration-300">
            <div className="flex justify-between items-start font-mono text-xs z-10">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-emerald-400" />
                <span className="font-semibold text-emerald-300">{selectedPreset.boardTitle}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                DRC Passed · 45° Octilinear
              </span>
            </div>

            {/* 45 Degree Routed Tracks & Components */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 280">
              {/* Ground Polygon Grid Pattern */}
              <rect x="40" y="40" width="520" height="200" rx="8" fill="#0b1e12" stroke="#10b981" strokeWidth="2" />

              {/* 45 Degree Copper Traces Top Layer (Red/Copper) */}
              <path d="M 80 140 L 160 140 L 200 100 L 280 100" stroke="#f97316" strokeWidth="3" fill="none" />
              <path d="M 80 160 L 150 160 L 190 200 L 280 200" stroke="#f97316" strokeWidth="3" fill="none" />
              <path d="M 280 100 L 340 100 L 380 140 L 460 140" stroke="#f97316" strokeWidth="3" fill="none" />
              <path d="M 280 200 L 350 200 L 390 160 L 460 160" stroke="#f97316" strokeWidth="3" fill="none" />

              {/* Bottom Layer Traces (Blue) */}
              <path d="M 120 80 L 220 80 L 260 120 L 400 120" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6 3" fill="none" />

              {/* Traveling electron packets */}
              <circle cx="200" cy="100" r="4.5" fill="#fbbf24" className="animate-ping opacity-80" />
              <circle cx="200" cy="100" r="3.5" fill="#fbbf24" />
              <circle cx="380" cy="140" r="3.5" fill="#fbbf24" />

              {/* Vias */}
              <circle cx="160" cy="140" r="5" fill="#d97706" stroke="#fef08a" strokeWidth="1.5" />
              <circle cx="160" cy="140" r="2" fill="#051208" />
              <circle cx="340" cy="100" r="5" fill="#d97706" stroke="#fef08a" strokeWidth="1.5" />
              <circle cx="340" cy="100" r="2" fill="#051208" />

              {/* Center MCU QFN Package */}
              <rect x="450" y="110" width="70" height="70" rx="3" fill="#181a1f" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="485" y="148" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="monospace" fontWeight="bold">MCU</text>
              {Array.from({ length: 8 }).map((_, i) => (
                <rect key={`qfn-t-${i}`} x={456 + i * 7.5} y="106" width="4" height="4" fill="#fbbf24" />
              ))}
              {Array.from({ length: 8 }).map((_, i) => (
                <rect key={`qfn-b-${i}`} x={456 + i * 7.5} y="180" width="4" height="4" fill="#fbbf24" />
              ))}

              {/* USB Connector Footprint */}
              <rect x="55" y="125" width="25" height="50" rx="2" fill="#242831" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="67" y="153" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace">USB-C</text>

              {/* Surface mount components */}
              <rect x="230" y="93" width="16" height="14" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="230" y="193" width="16" height="14" rx="1" fill="#475569" stroke="#cbd5e1" strokeWidth="1" />
            </svg>

            <div className="flex justify-between items-end font-mono text-[10px] text-emerald-300/70 z-10 border-t border-emerald-900/60 pt-2">
              <span>Top &amp; Bottom Layers: 100% Routed</span>
              <span>Min Clearance: 0.15mm</span>
            </div>
          </div>
        )}

        {/* SCENE 4: PHOTOREALISTIC 3D PCB FABRICATION RENDER */}
        {currentScene === 4 && (
          <div className="relative w-full max-w-2xl h-72 flex items-center justify-center animate-in fade-in duration-300">
            {/* Realistic 3D Board with perspective rotation */}
            <div
              className="w-96 h-56 rounded-md border border-emerald-400/80 shadow-2xl relative flex flex-col justify-between p-5 transition-transform duration-300"
              style={{
                background: 'linear-gradient(135deg, #0e301d 0%, #06190e 100%)',
                transform: 'perspective(900px) rotateX(24deg) rotateZ(-16deg)',
                transformStyle: 'preserve-3d',
                boxShadow:
                  '0 35px 70px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(16, 185, 129, 0.3)',
              }}
            >
              {/* Board Header Silkscreen */}
              <div className="flex justify-between items-start font-mono text-[10px] text-emerald-300">
                <span className="font-bold tracking-wider">{selectedPreset.boardTitle}</span>
                <span className="text-emerald-400 font-semibold">ENIG Gold Finish</span>
              </div>

              {/* 3D Elevated Main Microcontroller Chip */}
              <div
                className="w-20 h-20 bg-zinc-900 border border-zinc-600 rounded-xs mx-auto flex flex-col items-center justify-center text-[10px] font-mono text-white/95 shadow-2xl relative"
                style={{ transform: 'translateZ(14px)' }}
              >
                <Cpu size={18} className="text-blue-400 mb-1" />
                <span className="font-bold">{selectedPreset.mcu.split(' ')[0]}</span>
                <span className="text-[8px] text-zinc-400">FloZ Synthesized</span>

                {/* Blinking green SMD status LED */}
                <div className="absolute -bottom-4 right-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Board Footer Silkscreen & Gold Contacts */}
              <div className="flex justify-between items-end font-mono text-[9px] text-emerald-300/80">
                <span>Rev 1.0 · RoHS Compliant</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Gerbers Packaged
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Video Action Bottom Bar */}
      <div className="h-14 bg-[#10131a] border-t border-cad-border px-5 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="text-cad-textMuted">Design:</span>
          <span className="font-semibold text-cad-textHeading">
            {selectedPreset.name}
          </span>
        </div>

        {/* Preset Selector Chips */}
        <div className="hidden sm:flex items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelectPreset(p);
                handleRestart();
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                selectedPreset.id === p.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-cad-textMuted hover:text-cad-text bg-[#161a24] hover:bg-cad-surfaceHover'
              }`}
            >
              {p.id.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Launch Studio CTA */}
        <button
          onClick={onLaunchStudio}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors eng-tactile"
        >
          <span>Open in Studio</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};
