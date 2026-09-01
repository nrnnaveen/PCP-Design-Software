/**
 * FloZ ECA — Microsoft Fluent About & System Information Dialog
 */

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="about-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 select-none p-4"
    >
      <div className="bg-cad-panel border border-cad-border w-[560px] max-w-full rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              F
            </div>
            <div>
              <h2 id="about-dialog-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading">
                {siteConfig.siteName} — Electronic Circuit Architect
              </h2>
              <p className="text-[10px] text-cad-textMuted font-mono">Professional Desktop EDA &amp; PCB Suite v{siteConfig.version}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs text-cad-text">
          <p className="leading-relaxed">
            <strong className="text-cad-textHeading font-semibold">{siteConfig.siteName} (Electronic Circuit Architect)</strong> is a professional Electronic Design Automation platform providing end-to-end design from schematic capture to multi-layer PCB layout, 3D visualization, SPICE simulation, and manufacturing outputs.
          </p>

          <div className="space-y-1.5 border border-cad-border rounded p-3 bg-cad-subpanel font-mono text-[11px]">
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Full KiCad Library Import (.kicad_sym, .kicad_mod, .pretty)</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Interactive 45° Octilinear Router &amp; Dynamic MST Ratsnest</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Schematic ↔ PCB Forward/Back ECO Synchronization</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>MNA SPICE Circuit Simulation &amp; Multi-channel Oscilloscope</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Hardware-Accelerated WebGL 3D Board Viewer (Three.js)</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Standard RS-274X Gerber &amp; Excellon NC Drill Exporter</span>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-cad-textMuted font-mono flex items-center justify-between border-t border-cad-border">
            <span>Engine: FloZ Core v{siteConfig.version}</span>
            <span>License: Proprietary / {siteConfig.companyName}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 bg-cad-header border-t border-cad-border px-5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-sm transition-colors focus-visible:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
