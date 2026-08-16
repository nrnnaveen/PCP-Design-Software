/**
 * FloZ ECA - About & System Information Dialog
 */

import React from 'react';
import { Layers, CheckCircle2, Cpu, Shield, Zap, X, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md select-none">
      <div className="bg-cad-panel border border-cad-border w-[580px] rounded-xl shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-14 bg-cad-header border-b border-cad-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md">
              F
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">FloZ ECA — Electronic Circuit Architect</h2>
              <p className="text-[11px] text-cad-textMuted font-mono">Professional Desktop EDA & PCB Suite v1.0.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300">
          <p className="leading-relaxed">
            <strong className="text-white font-semibold">FloZ ECA (Electronic Circuit Architect)</strong> is a desktop-class Electronic Design Automation platform providing end-to-end design from schematic capture to multi-layer PCB layout, 3D visualization, SPICE simulation, and manufacturing outputs.
          </p>

          <div className="space-y-2 border border-cad-border rounded-lg p-3 bg-cad-bg/40 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Full KiCad Library Import (.kicad_sym, .kicad_mod, .pretty)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Interactive 45° Octilinear Router & Dynamic MST Ratsnest</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Schematic ↔ PCB Forward/Back ECO Synchronization</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>MNA SPICE Circuit Simulation & Multi-channel Oscilloscope</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Hardware-Accelerated WebGL 3D Board Viewer (Three.js)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Standard RS-274X Gerber & Excellon NC Drill Exporter</span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-cad-textMuted font-mono flex items-center justify-between border-t border-cad-border">
            <span>Engine: FloZ Core v1.0.0</span>
            <span>License: Proprietary / FloZ Engineering</span>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-cad-header border-t border-cad-border px-6 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
