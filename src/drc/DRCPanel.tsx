/**
 * Apex EDA - Design Rules Checker (DRC) Panel
 * Interactive physical layout rule inspector with clickable navigation and violation markers.
 */

import React, { useState } from 'react';
import { ApexProject, DiagnosticViolation } from '../core/types';
import { DRCEngine } from './drcEngine';
import { eventBus } from '../core/eventBus';
import { ShieldAlert, XCircle, CheckCircle2, Play, AlertTriangle } from 'lucide-react';

interface Props {
  project: ApexProject;
  onNavigateToCoords?: (x: number, y: number) => void;
}

export const DRCPanel: React.FC<Props> = ({ project, onNavigateToCoords }) => {
  const [violations, setViolations] = useState<DiagnosticViolation[]>(() => DRCEngine.run(project));
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null);

  const handleRunDRC = () => {
    const results = DRCEngine.run(project);
    setViolations(results);
  };

  const handleSelectViolation = (v: DiagnosticViolation) => {
    setSelectedViolationId(v.id);
    if (onNavigateToCoords) {
      onNavigateToCoords(v.x, v.y);
    }
    eventBus.emit('HIGHLIGHT_VIOLATION', {
      violationId: v.id,
      x: v.x,
      y: v.y,
      objectIds: v.objectIds,
    });
  };

  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warning');

  return (
    <div className="w-full h-full flex flex-col bg-cad-panel border-l border-cad-border select-none">
      {/* Header */}
      <div className="h-10 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert size={15} className="text-blue-500 dark:text-blue-400" />
          <span className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider">
            Design Rules Check (DRC)
          </span>
        </div>

        <button
          onClick={handleRunDRC}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm"
        >
          <Play size={11} fill="currentColor" />
          Run DRC
        </button>
      </div>

      {/* Summary */}
      <div className="p-2.5 bg-cad-subpanel border-b border-cad-border flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
            <XCircle size={13} /> {errors.length} Errors
          </span>
          <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
            <AlertTriangle size={13} /> {warnings.length} Warnings
          </span>
        </div>
        {violations.length === 0 && (
          <span className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
            <CheckCircle2 size={13} /> Clean
          </span>
        )}
      </div>

      {/* Violations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 text-cad-text">
        {violations.map((v) => {
          const isSelected = selectedViolationId === v.id;
          return (
            <div
              key={v.id}
              onClick={() => handleSelectViolation(v)}
              className={`p-2.5 rounded cursor-pointer border transition-colors ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500/50'
                  : 'bg-cad-subpanel hover:bg-cad-border border-cad-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-1.5">
                  {v.severity === 'error' ? (
                    <XCircle size={13} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <span className="font-bold text-xs text-cad-text">{v.title}</span>
                </div>
                <span className="text-[10px] font-mono px-1 bg-cad-border text-cad-textMuted rounded">
                  {v.code}
                </span>
              </div>
              <p className="text-[11px] text-cad-textMuted mt-1 leading-snug">{v.description}</p>
              <div className="text-[10px] text-blue-400 mt-1 font-mono flex items-center gap-1">
                <span>Location: ({v.x.toFixed(2)}, {v.y.toFixed(2)}) mm</span>
              </div>
            </div>
          );
        })}

        {violations.length === 0 && (
          <div className="text-center py-12 text-cad-textMuted text-xs font-mono">
            No design rule violations detected.
          </div>
        )}
      </div>
    </div>
  );
};
