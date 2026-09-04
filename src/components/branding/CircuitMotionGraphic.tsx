/**
 * FloZ ECA — Kinetic Circuit Motion Graphic
 * Hardware-grade interactive PCB trace simulation.
 * Procedurally draws 45-degree octilinear tracks, SMD component pads,
 * microvias, and kinetic electron/signal pulses flowing across circuit nets.
 * High-DPI accelerated, responsive, respects prefers-reduced-motion.
 */

import React, { useRef, useEffect } from 'react';
import { useReducedMotion } from '../../lib/motion/useReducedMotion';

interface TraceSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
}

interface CircuitNet {
  id: number;
  segments: TraceSegment[];
  totalLength: number;
  color: string;
  width: number;
  pulsePos: number;
  pulseSpeed: number;
  pulseLength: number;
}

interface ComponentPad {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'pad' | 'via' | 'chip';
  label?: string;
}

interface Props {
  className?: string;
  density?: 'low' | 'medium' | 'high';
  interactive?: boolean;
  opacity?: number;
}

export const CircuitMotionGraphic: React.FC<Props> = ({
  className = '',
  density = 'medium',
  interactive = true,
  opacity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrame: number;
    let width = 0;
    let height = 0;

    let nets: CircuitNet[] = [];
    let pads: ComponentPad[] = [];

    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.classList.contains('light') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Color definitions for engineering CAD (clean, non-neon, professional)
    const traceColors = isDark
      ? ['#2563eb', '#38bdf8', '#60a5fa', '#0ea5e9']
      : ['#0284c7', '#2563eb', '#0369a1', '#1d4ed8'];
    const padStroke = isDark ? '#3f3f46' : '#cbd5e1';
    const padFill = isDark ? '#18181b' : '#f8fafc';
    const viaBorder = isDark ? '#71717a' : '#94a3b8';
    const gridDot = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

    const generateCircuit = (w: number, h: number) => {
      nets = [];
      pads = [];

      const padCount = density === 'low' ? 12 : density === 'high' ? 36 : 22;
      const netCount = density === 'low' ? 16 : density === 'high' ? 42 : 28;

      // 1. Generate major component clusters / IC footprints
      const clusterCount = Math.max(2, Math.floor(w / 400));
      for (let c = 0; c < clusterCount; c++) {
        const cx = (w / (clusterCount + 1)) * (c + 1) + (Math.random() - 0.5) * 80;
        const cy = h * 0.4 + (Math.random() - 0.5) * (h * 0.4);

        // Chip body
        pads.push({
          x: cx,
          y: cy,
          w: 64,
          h: 64,
          type: 'chip',
          label: `U${c + 1}`,
        });

        // Surrounding pins (QFP style)
        for (let p = 0; p < 8; p++) {
          const pinOffset = -28 + p * 8;
          pads.push({ x: cx + pinOffset, y: cy - 40, w: 4, h: 10, type: 'pad' });
          pads.push({ x: cx + pinOffset, y: cy + 40, w: 4, h: 10, type: 'pad' });
          pads.push({ x: cx - 40, y: cy + pinOffset, w: 10, h: 4, type: 'pad' });
          pads.push({ x: cx + 40, y: cy + pinOffset, w: 10, h: 4, type: 'pad' });
        }
      }

      // 2. Generate discrete pads and microvias
      for (let i = 0; i < padCount; i++) {
        const x = 40 + Math.random() * (w - 80);
        const y = 40 + Math.random() * (h - 80);
        const isVia = Math.random() > 0.4;
        pads.push({
          x,
          y,
          w: isVia ? 8 : 12,
          h: isVia ? 8 : 8,
          type: isVia ? 'via' : 'pad',
        });
      }

      // 3. Generate 45° octilinear routing tracks
      const createOctilinearPath = (x1: number, y1: number, x2: number, y2: number): TraceSegment[] => {
        const segments: TraceSegment[] = [];
        const dx = x2 - x1;
        const dy = y2 - y1;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        let curX = x1;
        let curY = y1;

        if (absDx > absDy) {
          // Horizontal primary then 45° bevel
          const bevelLen = absDy;
          const directLen = absDx - absDy;
          const dirX = Math.sign(dx);
          const dirY = Math.sign(dy);

          const midX = curX + dirX * directLen;
          segments.push({
            x1: curX,
            y1: curY,
            x2: midX,
            y2: curY,
            length: directLen,
          });

          segments.push({
            x1: midX,
            y1: curY,
            x2: x2,
            y2: y2,
            length: bevelLen * Math.SQRT2,
          });
        } else {
          // Vertical primary then 45° bevel
          const bevelLen = absDx;
          const directLen = absDy - absDx;
          const dirX = Math.sign(dx);
          const dirY = Math.sign(dy);

          const midY = curY + dirY * directLen;
          segments.push({
            x1: curX,
            y1: curY,
            x2: curX,
            y2: midY,
            length: directLen,
          });

          segments.push({
            x1: curX,
            y1: midY,
            x2: x2,
            y2: y2,
            length: bevelLen * Math.SQRT2,
          });
        }

        return segments;
      };

      for (let n = 0; n < netCount; n++) {
        const startPad = pads[Math.floor(Math.random() * pads.length)];
        const endPad = pads[Math.floor(Math.random() * pads.length)];

        if (!startPad || !endPad || startPad === endPad) continue;

        const segments = createOctilinearPath(startPad.x, startPad.y, endPad.x, endPad.y);
        const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);

        if (totalLength < 10) continue;

        nets.push({
          id: n,
          segments,
          totalLength,
          color: traceColors[n % traceColors.length],
          width: Math.random() > 0.75 ? 2 : 1.2,
          pulsePos: Math.random(),
          pulseSpeed: 0.0015 + Math.random() * 0.002,
          pulseLength: 24 + Math.random() * 32,
        });
      }
    };

    const handleResize = () => {
      const parent = containerRef.current;
      if (!parent) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
      generateCircuit(width, height);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Animation Loop
    let lastTime = performance.now();

    const render = (now: number) => {
      const delta = Math.min(now - lastTime, 50);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // A. Engineering Grid Dots (16x16 standard raster)
      ctx.fillStyle = gridDot;
      const gridSize = 24;
      for (let gx = 0; gx < width; gx += gridSize) {
        for (let gy = 0; gy < height; gy += gridSize) {
          ctx.fillRect(gx, gy, 1.2, 1.2);
        }
      }

      // B. Draw Static Copper Tracks
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const net of nets) {
        ctx.strokeStyle = isDark ? 'rgba(39, 39, 42, 0.7)' : 'rgba(203, 213, 225, 0.6)';
        ctx.lineWidth = net.width;

        ctx.beginPath();
        for (let s = 0; s < net.segments.length; s++) {
          const seg = net.segments[s];
          if (s === 0) ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
      }

      // C. Draw Dynamic Signal Pulses (Skipped if prefers-reduced-motion)
      if (!reducedMotion) {
        for (const net of nets) {
          // Speed up slightly if mouse is nearby
          let speed = net.pulseSpeed;
          if (interactive && mouseRef.current.active) {
            const firstSeg = net.segments[0];
            const dist = Math.hypot(firstSeg.x1 - mouseRef.current.x, firstSeg.y1 - mouseRef.current.y);
            if (dist < 200) {
              speed *= 1.8;
            }
          }

          net.pulsePos = (net.pulsePos + speed * (delta / 16)) % 1;

          const currentDist = net.pulsePos * net.totalLength;
          let accDist = 0;

          for (const seg of net.segments) {
            if (currentDist >= accDist && currentDist <= accDist + seg.length) {
              const segProgress = (currentDist - accDist) / (seg.length || 1);
              const px = seg.x1 + (seg.x2 - seg.x1) * segProgress;
              const py = seg.y1 + (seg.y2 - seg.y1) * segProgress;

              // Crisp signal point
              ctx.fillStyle = net.color;
              ctx.beginPath();
              ctx.arc(px, py, net.width + 1.2, 0, Math.PI * 2);
              ctx.fill();

              // Tail
              const tailLen = 14;
              const tailDist = Math.max(0, currentDist - tailLen);
              if (tailDist >= accDist) {
                const tailProgress = (tailDist - accDist) / (seg.length || 1);
                const tx = seg.x1 + (seg.x2 - seg.x1) * tailProgress;
                const ty = seg.y1 + (seg.y2 - seg.y1) * tailProgress;

                ctx.strokeStyle = net.color;
                ctx.lineWidth = net.width * 1.5;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(px, py);
                ctx.stroke();
              }
              break;
            }
            accDist += seg.length;
          }
        }
      }

      // D. Draw Component Pads and Microvias
      for (const pad of pads) {
        if (pad.type === 'chip') {
          // IC Body
          ctx.fillStyle = isDark ? '#141416' : '#f1f5f9';
          ctx.strokeStyle = isDark ? '#27272a' : '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h, 4);
          ctx.fill();
          ctx.stroke();

          // Pin 1 Indicator
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(pad.x - pad.w / 2 + 8, pad.y - pad.h / 2 + 8, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Chip RefDes text
          if (pad.label) {
            ctx.fillStyle = isDark ? '#71717a' : '#64748b';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pad.label, pad.x, pad.y);
          }
        } else if (pad.type === 'via') {
          // Annular ring via
          ctx.fillStyle = padFill;
          ctx.strokeStyle = viaBorder;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pad.x, pad.y, pad.w / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Via hole
          ctx.fillStyle = isDark ? '#09090b' : '#e2e8f0';
          ctx.beginPath();
          ctx.arc(pad.x, pad.y, pad.w / 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Rectangular SMD Pad
          ctx.fillStyle = isDark ? '#27272a' : '#e2e8f0';
          ctx.strokeStyle = padStroke;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.rect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h);
          ctx.fill();
          ctx.stroke();
        }
      }

      if (!reducedMotion) {
        animFrame = requestAnimationFrame(render);
      }
    };

    animFrame = requestAnimationFrame(render);

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animFrame);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [density, interactive, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
