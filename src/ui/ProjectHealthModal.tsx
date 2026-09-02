/**
 * FloZ ECA — Microsoft Fluent Project Health & Diagnostics Dialog
 * Displays real-time health checks across 8 design pillars.
 */

import React from 'react';
import { ApexProject } from '../core/types';
import { ProjectHealthEvaluator } from '../validation/projectHealth';
import { AutoFixEngine } from '../validation/autoFixEngine';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  ShieldCheck,
  X,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  onNavigateTab?: (tab: 'schematic' | 'pcb' | '3d') => void;
}

export const ProjectHealthModal: React.FC<Props> = ({
  project,
  isOpen,
  onClose,
  onUpdateProject,
}) => {
  if (!isOpen) return null;

  const health = ProjectHealthEvaluator.evaluate(project);

  const handleAutoFix = () => {
    onUpdateProject((prev) => {
      return AutoFixEngine.autoFixProject(prev).updatedProject;
    }, 'Auto-Fix Diagnostics');
  };

  return (
    <div
      role="dialog"
      aria-labelledby="health-dialog-title"
      aria-modal="true"
      className="fixed inset-0 bg-theme-modalBackdrop flex items-center justify-center z-50 p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border w-full max-w-2xl rounded-sm shadow-xl overflow-hidden flex flex-col max-h-[85vh] text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-9 px-3.5 bg-cad-header border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={health.readyForExport ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
            <div>
              <h2 id="health-dialog-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading">
                Project Health &amp; Validation
              </h2>
              <p className="text-[10px] text-cad-textMuted">Design verification &amp; manufacturing readiness audit</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2 py-0.2 rounded-xs text-[10px] font-semibold font-mono ${
                health.readyForExport
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              }`}
            >
              {health.overallScore}% READY {health.readyForExport && '• EXPORTABLE'}
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {/* Status Banner */}
          <div
            className={`p-2.5 rounded-xs border flex items-center justify-between ${
              health.readyForExport
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {health.readyForExport ? (
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-xs text-cad-textHeading">
                  {health.readyForExport
                    ? 'Project is Clean & Ready for Fabrication'
                    : `${health.criticalIssuesCount} Critical Issue(s), ${health.warningsCount} Warning(s) Detected`}
                </div>
                <div className="text-[11px] text-cad-textMuted">
                  {health.readyForExport
                    ? 'All 8 design pillars passed electrical, layout, and manufacturing validation.'
                    : 'Resolve issues or run Auto-Fix to achieve production-ready state.'}
                </div>
              </div>
            </div>

            {!health.readyForExport && (
              <button
                onClick={handleAutoFix}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xs text-xs flex items-center gap-1.5 shadow-xs transition-colors duration-fast shrink-0 focus-visible:outline-none"
              >
                <Wrench size={12} />
                <span>Auto-Fix</span>
              </button>
            )}
          </div>

          {/* 8 Health Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {health.checks.map((check) => (
              <div
                key={check.key}
                className="p-2 bg-cad-subpanel border border-cad-border rounded-xs flex items-start gap-2"
              >
                {check.status === 'passed' && <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />}
                {check.status === 'warning' && <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />}
                {check.status === 'failed' && <XCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-cad-textHeading flex items-center justify-between text-xs">
                    <span>{check.label}</span>
                    <span
                      className={`text-[10px] font-mono font-semibold uppercase ${
                        check.status === 'passed'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : check.status === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-cad-textMuted truncate mt-0.5">{check.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="h-9 bg-cad-header border-t border-cad-border px-3.5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium shadow-xs transition-colors duration-fast focus-visible:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
