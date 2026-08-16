/**
 * Apex EDA - SPICE Simulation Oscilloscope & Waveform Viewer
 * Interactive multi-channel waveform viewer with time-domain curves, cursors, and simulation configuration.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ApexProject, SimulationResults, SimulationType } from '../core/types';
import { MNASimulationEngine } from './mnaSolver';
import { Play, Activity, Sliders, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Props {
  project: ApexProject;
}

const TRACE_COLORS: Record<string, string> = {
  VBUS: '#ef4444',
  '+3.3V': '#3b82f6',
  LED_STATUS: '#10b981',
  I2C_SCL: '#f59e0b',
  I2C_SDA: '#a855f7',
  VIN: '#ef4444',
  VOUT_LDO: '#3b82f6',
  LED_CURRENT_mA: '#10b981',
};

export const SimulationPanel: React.FC<Props> = ({ project }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [simType, setSimType] = useState<SimulationType>('transient');
  const [stopTime, setStopTime] = useState<number>(0.005); // 5ms
  const [timeStep, setTimeStep] = useState<number>(1e-5); // 10us
  const [simResults, setSimResults] = useState<SimulationResults | null>(null);
  const [activeTraces, setActiveTraces] = useState<Record<string, boolean>>({
    VBUS: true,
    '+3.3V': true,
    LED_STATUS: true,
    I2C_SCL: true,
    I2C_SDA: true,
  });

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Run initial simulation
  const handleRunSim = () => {
    const results = MNASimulationEngine.run(project, {
      type: simType,
      stopTime,
      timeStep,
      probes: [],
    });
    setSimResults(results);
  };

  useEffect(() => {
    handleRunSim();
  }, [simType]);

  // Render Oscilloscope Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simResults) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 700;
    const height = canvas.parentElement?.clientHeight || 400;
    canvas.width = width;
    canvas.height = height;

    // Dark Scope Background
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, width, height);

    const margin = { top: 30, right: 30, bottom: 40, left: 60 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    // Draw Grid Lines
    ctx.strokeStyle = '#1e2633';
    ctx.lineWidth = 1;

    // Horizontal Grid (Voltage 0V to 5.5V)
    const maxV = 5.5;
    const minV = -0.5;
    const numYDivs = 6;
    for (let i = 0; i <= numYDivs; i++) {
      const y = margin.top + (plotH / numYDivs) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + plotW, y);
      ctx.stroke();

      const vVal = maxV - (i / numYDivs) * (maxV - minV);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${vVal.toFixed(1)} V`, margin.left - 8, y + 3);
    }

    // Vertical Grid (Time in ms)
    const tMax = simResults.timeline[simResults.timeline.length - 1] || 0.005;
    const numXDivs = 8;
    for (let i = 0; i <= numXDivs; i++) {
      const x = margin.left + (plotW / numXDivs) * i;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + plotH);
      ctx.stroke();

      const tVal = (i / numXDivs) * tMax * 1000; // ms
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${tVal.toFixed(1)} ms`, x, margin.top + plotH + 16);
    }

    // Plot Traces
    const timeline = simResults.timeline;

    Object.entries(simResults.traces).forEach(([traceName, values]) => {
      if (!activeTraces[traceName]) return;

      const color = TRACE_COLORS[traceName] || '#38bdf8';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();

      for (let i = 0; i < values.length; i++) {
        const t = timeline[i];
        const v = values[i];

        const px = margin.left + (t / tMax) * plotW;
        const py = margin.top + (1 - (v - minV) / (maxV - minV)) * plotH;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    });

    // Crosshair Cursor Readout
    if (cursorPos) {
      const mouseX = Math.max(margin.left, Math.min(margin.left + plotW, cursorPos.x));
      const tHover = ((mouseX - margin.left) / plotW) * tMax;

      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(mouseX, margin.top);
      ctx.lineTo(mouseX, margin.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Interpolate voltage values at tHover
      const idx = Math.min(
        timeline.length - 1,
        Math.max(0, Math.floor((tHover / tMax) * timeline.length))
      );

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.fillRect(mouseX + 10, margin.top + 10, 160, 100);
      ctx.strokeRect(mouseX + 10, margin.top + 10, 160, 100);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`T = ${(tHover * 1000).toFixed(3)} ms`, mouseX + 18, margin.top + 26);

      let lineY = margin.top + 42;
      Object.entries(simResults.traces).forEach(([traceName, values]) => {
        if (!activeTraces[traceName]) return;
        ctx.fillStyle = TRACE_COLORS[traceName] || '#38bdf8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${traceName}: ${values[idx]?.toFixed(3)} V`, mouseX + 18, lineY);
        lineY += 14;
      });
    }
  }, [simResults, activeTraces, cursorPos]);

  return (
    <div className="relative w-full h-full flex flex-col bg-cad-bg select-none">
      {/* Simulation Top Control Bar */}
      <div className="h-11 bg-cad-panel border-b border-cad-border px-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Activity size={16} className="text-emerald-400" />
            SPICE Circuit Simulator
          </span>

          <div className="h-4 w-px bg-cad-border" />

          {/* Mode Selector */}
          <div className="flex items-center space-x-1 bg-cad-subpanel p-0.5 rounded border border-cad-border">
            <button
              onClick={() => setSimType('transient')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                simType === 'transient' ? 'bg-blue-600 text-white' : 'text-cad-textMuted hover:text-white'
              }`}
            >
              Transient Time-Domain
            </button>
            <button
              onClick={() => setSimType('dc_sweep')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                simType === 'dc_sweep' ? 'bg-blue-600 text-white' : 'text-cad-textMuted hover:text-white'
              }`}
            >
              DC Voltage Sweep
            </button>
          </div>

          <button
            onClick={handleRunSim}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Play size={13} fill="currentColor" />
            Run Simulation
          </button>
        </div>

        {/* Trace Toggles */}
        <div className="flex items-center space-x-2">
          {simResults &&
            Object.keys(simResults.traces).map((traceName) => (
              <button
                key={traceName}
                onClick={() =>
                  setActiveTraces((prev) => ({ ...prev, [traceName]: !prev[traceName] }))
                }
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition-all ${
                  activeTraces[traceName]
                    ? 'border shadow-sm'
                    : 'opacity-40 line-through bg-cad-subpanel text-cad-textMuted'
                }`}
                style={{
                  color: activeTraces[traceName] ? TRACE_COLORS[traceName] : undefined,
                  borderColor: activeTraces[traceName] ? TRACE_COLORS[traceName] : 'transparent',
                  backgroundColor: activeTraces[traceName]
                    ? `${TRACE_COLORS[traceName]}15`
                    : undefined,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: TRACE_COLORS[traceName] }}
                />
                {traceName}
              </button>
            ))}
        </div>
      </div>

      {/* Oscilloscope Canvas Area */}
      <div
        className="flex-1 w-full h-full relative"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setCursorPos(null)}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};
