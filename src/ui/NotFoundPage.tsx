/**
 * FloZ ECA — Microsoft Fluent 404 Page Not Found Component
 * Professional, branded fallback for unknown routes with fast navigation recovery.
 */

import React, { useEffect } from 'react';
import { SEOEngine } from '../core/seo';
import {
  FileQuestion,
  Home,
  Layers,
  Cpu,
  Calculator,
  Activity,
} from 'lucide-react';

interface Props {
  onNavigateHome: () => void;
  onNavigateTab?: (tab: 'schematic' | 'pcb' | '3d' | 'simulation' | 'gerbview' | 'calculator') => void;
}

export const NotFoundPage: React.FC<Props> = ({ onNavigateHome, onNavigateTab }) => {
  useEffect(() => {
    SEOEngine.updateMeta({
      title: 'Page Not Found (404)',
      description: 'The requested page or EDA design resource could not be found. Return to FloZ ECA dashboard or launch your CAD workspace.',
      noIndex: true,
      canonicalPath: '/404',
    });
  }, []);

  return (
    <main className="min-h-screen w-full bg-cad-bg text-cad-text flex flex-col items-center justify-center p-4 select-none">
      <div className="max-w-md w-full bg-cad-panel border border-cad-border rounded-lg p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-100">
        {/* Visual Badge */}
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400">
          <FileQuestion size={24} />
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
            Error 404
          </span>
          <h1 className="text-lg font-semibold text-cad-textHeading">Page Not Found</h1>
          <p className="text-xs text-cad-textMuted max-w-sm mx-auto leading-relaxed">
            The requested CAD route, project, or file resource does not exist or may have been moved.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="pt-1 flex items-center justify-center">
          <button
            onClick={onNavigateHome}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded shadow-sm flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none"
          >
            <Home size={14} />
            <span>Return to Dashboard</span>
          </button>
        </div>

        {/* Quick CAD Navigation Links */}
        <div className="pt-3 border-t border-cad-border text-left">
          <h2 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cad-textMuted mb-2">
            Quick Launch Workspaces
          </h2>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              onClick={() => onNavigateTab?.('schematic')}
              className="p-2 rounded bg-cad-subpanel border border-cad-border hover:bg-cad-surfaceHover text-left flex items-center gap-2 text-cad-text transition-colors focus-visible:outline-none"
            >
              <Cpu size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Schematic Editor</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('pcb')}
              className="p-2 rounded bg-cad-subpanel border border-cad-border hover:bg-cad-surfaceHover text-left flex items-center gap-2 text-cad-text transition-colors focus-visible:outline-none"
            >
              <Layers size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>PCB Layout</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('simulation')}
              className="p-2 rounded bg-cad-subpanel border border-cad-border hover:bg-cad-surfaceHover text-left flex items-center gap-2 text-cad-text transition-colors focus-visible:outline-none"
            >
              <Activity size={13} className="text-amber-600 dark:text-amber-400" />
              <span>SPICE Simulation</span>
            </button>
            <button
              onClick={() => onNavigateTab?.('calculator')}
              className="p-2 rounded bg-cad-subpanel border border-cad-border hover:bg-cad-surfaceHover text-left flex items-center gap-2 text-cad-text transition-colors focus-visible:outline-none"
            >
              <Calculator size={13} className="text-cyan-600 dark:text-cyan-400" />
              <span>Impedance Calc</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
