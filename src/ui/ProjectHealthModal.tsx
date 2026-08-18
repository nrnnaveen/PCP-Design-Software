/**
 * FloZ EDA - Project Health & Validation Dashboard Modal
 * Displays real-time health checks across 8 design pillars.
 */

import React from 'react';
import { ApexProject } from '../core/types';
import { ProjectHealthEvaluator, HealthCheckItem } from '../validation/projectHealth';
import { AutoFixEngine } from '../validation/autoFixEngine';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wrench,
  ShieldCheck,
  Download,
  Layers,
  Cpu,
  Zap,
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
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const health = ProjectHealthEvaluator.evaluate(project);

  const handleAutoFix = () => {
    onUpdateProject((prev) => {
      return AutoFixEngine.autoFixProject(prev).updatedProject;
    }, 'Auto-Fix Diagnostics');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-cad-panel border border-cad-border w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 px-5 bg-cad-subpanel border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className={health.readyForExport ? 'text-emerald-400' : 'text-amber-400'} />
            <div>
              <h2 className="text-sm font-bold text-white">Project Health & Validation Dashboard</h2>
              <p className="text-[11px] text-cad-textMuted">Design verification & manufacturing readiness audit</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                health.readyForExport
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {health.overallScore}% READY {health.readyForExport && '• EXPORTABLE'}
            </span>
            <button onClick={onClose} className="text-cad-textMuted hover:text-white text-lg">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-lg border flex items-center justify-between ${
              health.readyForExport
                ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-600/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {health.readyForExport ? (
                <CheckCircle2 size={24} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={24} className="text-amber-400" />
              )}
              <div>
                <div className="font-bold text-sm text-white">
                  {health.readyForExport
                    ? 'Project is Clean & Ready for Fabrication'
                    : `${health.criticalIssuesCount} Critical Issue(s), ${health.warningsCount} Warning(s) Detected`}
                </div>
                <div className="text-[11px] opacity-80">
                  {health.readyForExport
                    ? 'All 8 design pillars passed electrical, layout, and manufacturing validation.'
                    : 'Resolve issues or run Auto-Fix to achieve production-ready state.'}
                </div>
              </div>
            </div>

            {!health.readyForExport && (
              <button
                onClick={handleAutoFix}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow"
              >
                <Wrench size={13} /> Fix Automatically
              </button>
            )}
          </div>

          {/* 8 Health Pillars Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {health.checks.map((check) => (
              <div
                key={check.key}
                className="p-3 bg-cad-subpanel border border-cad-border rounded-lg flex items-start gap-2.5"
              >
                {check.status === 'passed' && <CheckCircle2 size={16} className="text-emerald-400 mt-0.5" />}
                {check.status === 'warning' && <AlertTriangle size={16} className="text-amber-400 mt-0.5" />}
                {check.status === 'failed' && <XCircle size={16} className="text-red-400 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white flex items-center justify-between">
                    <span>{check.label}</span>
                    <span
                      className={`text-[10px] font-mono uppercase ${
                        check.status === 'passed'
                          ? 'text-emerald-400'
                          : check.status === 'warning'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {check.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-cad-textMuted truncate">{check.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-5 bg-cad-subpanel border-t border-cad-border flex items-center justify-between text-xs">
          <span className="text-cad-textMuted text-[11px]">
            Authoritative state: {project.metadata.name} (v{project.metadata.version})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-cad-panel hover:bg-cad-border text-slate-300 rounded font-semibold border border-cad-border"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
