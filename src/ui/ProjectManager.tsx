/**
 * FloZ ECA — Microsoft Fluent Project Manager Dashboard
 * Project creation, template library, file import/export, user session,
 * live circuit code lab, and recent design workspace with full mobile & accessibility support.
 */

import React, { useState, useEffect } from 'react';
import { ApexProject } from '../core/types';
import { createDemoProject } from '../examples/demoProject';
import { ProjectSerializer } from '../core/serialization';
import { AuthService, User } from '../core/auth';
import { siteConfig } from '../config/siteConfig';
import {
  FolderOpen,
  Plus,
  FileCode,
  Upload,
  Cpu,
  Layers,
  Sparkles,
  Clock,
  ChevronRight,
  Settings,
  Activity,
  User as UserIcon,
  LogOut,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface Props {
  currentProject: ApexProject;
  onOpenProject: (project: ApexProject) => void;
  onClose: () => void;
  onOpenLibraryManager?: () => void;
  onOpenSettings?: () => void;
  onOpenCircuitLab?: () => void;
  onOpenAuthModal?: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenTerms?: () => void;
  onOpenAbout?: () => void;
}

export const ProjectManager: React.FC<Props> = ({
  currentProject,
  onOpenProject,
  onClose,
  onOpenLibraryManager,
  onOpenSettings,
  onOpenCircuitLab,
  onOpenAuthModal,
  onOpenPrivacyPolicy,
  onOpenTerms,
  onOpenAbout,
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'templates' | 'new'>('recent');
  const [newPrjName, setNewPrjName] = useState('New_FloZ_Design');
  const [prjNameError, setPrjNameError] = useState<string | null>(null);
  const [user, setUser] = useState<User>(() => AuthService.getUser());

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    return unsub;
  }, []);

  const handleCreateNew = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPrjName.trim();
    if (!trimmed) {
      setPrjNameError('Project name cannot be empty.');
      return;
    }
    setPrjNameError(null);

    const freshProject = createDemoProject();
    freshProject.metadata.id = `proj_${Date.now()}`;
    freshProject.metadata.name = trimmed;
    freshProject.metadata.author = user.name || 'FloZ ECA Engineer';
    freshProject.schematic.sheets[0].symbols = [];
    freshProject.schematic.sheets[0].wires = [];
    freshProject.schematic.sheets[0].junctions = [];
    freshProject.schematic.sheets[0].labels = [];
    freshProject.pcb.footprints = [];
    freshProject.pcb.tracks = [];
    freshProject.pcb.vias = [];
    freshProject.netGraph = { nets: {} };

    onOpenProject(freshProject);
    onClose();
  };

  const handleLoadDemo = () => {
    const demo = createDemoProject();
    onOpenProject(demo);
    onClose();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = ProjectSerializer.deserialize(content);
        onOpenProject(imported);
        onClose();
      } catch (err: any) {
        alert(`Failed to import project: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="region"
      aria-label="Project Manager Dashboard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 select-none p-3 sm:p-5 md:p-8"
    >
      <div className="bg-cad-panel border border-cad-border w-full max-w-5xl h-full max-h-[680px] rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Semantic Header */}
        <header className="h-12 bg-cad-header border-b border-cad-border px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              F
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-semibold text-cad-textHeading tracking-tight">
                {siteConfig.siteName} — Electronic Circuit Architect
              </h1>
              <p className="text-[10px] text-cad-textMuted font-mono">
                Professional EDA &amp; PCB Suite v{siteConfig.version}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* User Session Pill */}
            <div className="hidden md:flex items-center space-x-2 bg-cad-subpanel px-2.5 py-1 rounded border border-cad-border text-xs">
              <UserIcon size={12} className="text-cad-textMuted" />
              <span className="font-medium text-cad-text">{user.name}</span>
              {user.isGuest ? (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 text-[10px] font-mono">
                  Guest
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
                  Signed In
                </span>
              )}
              {user.isGuest ? (
                <button
                  onClick={onOpenAuthModal}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-medium text-[11px] focus-visible:outline-none"
                >
                  Sign In
                </button>
              ) : (
                <button
                  onClick={() => AuthService.logout()}
                  className="ml-1 text-cad-textMuted hover:text-cad-text focus-visible:outline-none"
                  title="Sign Out"
                >
                  <LogOut size={12} />
                </button>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={onClose}
              className="text-xs px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center gap-1.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span>Open Workspace</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </header>

        {/* Mobile Tab Strip */}
        <nav
          aria-label="Dashboard Navigation"
          className="flex md:hidden bg-cad-subpanel border-b border-cad-border overflow-x-auto p-1.5 gap-1 shrink-0"
        >
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shrink-0 ${
              activeTab === 'recent' ? 'bg-blue-600 text-white shadow-sm' : 'text-cad-textMuted hover:bg-cad-surfaceHover'
            }`}
          >
            <Clock size={13} />
            <span>Recent</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shrink-0 ${
              activeTab === 'templates' ? 'bg-blue-600 text-white shadow-sm' : 'text-cad-textMuted hover:bg-cad-surfaceHover'
            }`}
          >
            <Sparkles size={13} />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shrink-0 ${
              activeTab === 'new' ? 'bg-blue-600 text-white shadow-sm' : 'text-cad-textMuted hover:bg-cad-surfaceHover'
            }`}
          >
            <Plus size={13} />
            <span>New Design</span>
          </button>
        </nav>

        {/* 2-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation (Desktop) */}
          <nav
            aria-label="Desktop Workspace Sections"
            className="hidden md:flex flex-col justify-between w-56 border-r border-cad-border bg-cad-subpanel p-2.5 shrink-0"
          >
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveTab('recent')}
                className={`w-full px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                  activeTab === 'recent'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <Clock size={14} />
                <span>Recent Projects</span>
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className={`w-full px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                  activeTab === 'templates'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <Sparkles size={14} />
                <span>Design Templates</span>
              </button>

              <button
                onClick={() => setActiveTab('new')}
                className={`w-full px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                  activeTab === 'new'
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <Plus size={14} />
                <span>New Project</span>
              </button>

              <div className="my-2 border-t border-cad-border" />

              {onOpenCircuitLab && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCircuitLab();
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 text-cad-text hover:bg-cad-surfaceHover transition-colors focus-visible:outline-none"
                >
                  <Activity size={14} className="text-emerald-500 dark:text-emerald-400" />
                  <span>Live Circuit Lab</span>
                </button>
              )}

              {onOpenLibraryManager && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLibraryManager();
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 text-cad-text hover:bg-cad-surfaceHover transition-colors focus-visible:outline-none"
                >
                  <Layers size={14} className="text-amber-500 dark:text-amber-400" />
                  <span>Library Manager</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="w-full px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 text-cad-text hover:bg-cad-surfaceHover transition-colors focus-visible:outline-none"
                >
                  <Settings size={14} className="text-blue-500 dark:text-blue-400" />
                  <span>Preferences</span>
                </button>
              )}

              <div className="pt-2">
                <label className="w-full px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-2 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text cursor-pointer border border-cad-border transition-colors focus-within:ring-1 focus-within:ring-blue-500 shadow-sm">
                  <Upload size={14} className="text-emerald-500 dark:text-emerald-400" />
                  <span>Import File (.json)</span>
                  <input
                    type="file"
                    accept=".json,.apexprj,.flozprj"
                    onChange={handleImportFile}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Quick Links / Legal */}
            <div className="pt-2 border-t border-cad-border text-[10px] text-cad-textMuted space-y-1 font-mono">
              <div className="flex items-center justify-between">
                <button onClick={onOpenPrivacyPolicy} className="hover:text-blue-500 transition-colors">
                  Privacy
                </button>
                <span>·</span>
                <button onClick={onOpenTerms} className="hover:text-blue-500 transition-colors">
                  Terms
                </button>
                <span>·</span>
                <button onClick={onOpenAbout} className="hover:text-blue-500 transition-colors">
                  About
                </button>
              </div>
            </div>
          </nav>

          {/* Right Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-cad-bg">
            {activeTab === 'recent' && (
              <section className="space-y-3 max-w-3xl">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-cad-textMuted font-mono">
                  Active &amp; Recent Projects
                </h2>

                {/* Active Project Card */}
                <div
                  onClick={onClose}
                  className="p-4 bg-cad-panel border border-cad-border hover:border-blue-500 dark:hover:border-blue-500 rounded-md cursor-pointer transition-all shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                    <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20 shrink-0 mt-0.5 sm:mt-0">
                      <Cpu size={22} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-sm text-cad-textHeading group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {currentProject.metadata.name}
                        </h3>
                        <span className="px-1.5 py-0.2 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-mono font-medium">
                          Active Project
                        </span>
                      </div>
                      <p className="text-xs text-cad-textMuted mt-0.5">
                        {currentProject.metadata.description || 'Custom multi-layer PCB design with schematic netlist.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-cad-textMuted font-mono mt-2">
                        <span>{currentProject.pcb.footprints.length} Components</span>
                        <span>•</span>
                        <span>{Object.keys(currentProject.netGraph.nets).length} Nets</span>
                        <span>•</span>
                        <span>{currentProject.pcb.tracks.length} Routed Traces</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-cad-textMuted group-hover:text-cad-text transition-colors shrink-0" />
                </div>

                {/* Live Circuit Lab Quick Card */}
                {onOpenCircuitLab && (
                  <div
                    onClick={() => {
                      onClose();
                      onOpenCircuitLab();
                    }}
                    className="p-3.5 bg-cad-panel border border-cad-border hover:border-emerald-500/50 rounded-md cursor-pointer transition-all shadow-sm flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20 shrink-0">
                        <Activity size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs text-cad-textHeading group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Live Circuit Code Lab &amp; Oscilloscope
                        </h3>
                        <p className="text-[11px] text-cad-textMuted">
                          Interactive JavaScript/Python netlist solver with real-time waveform inspection.
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-cad-textMuted group-hover:text-cad-text transition-colors shrink-0" />
                  </div>
                )}
              </section>
            )}

            {activeTab === 'templates' && (
              <section className="space-y-3 max-w-3xl">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-cad-textMuted font-mono">
                  Verified Hardware Templates
                </h2>

                <div
                  onClick={handleLoadDemo}
                  className="p-4 bg-cad-panel border border-cad-border hover:border-emerald-500/60 rounded-md cursor-pointer transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20 shrink-0 mt-0.5 sm:mt-0">
                      <Layers size={22} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-cad-textHeading group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        FloZ IoT Sensor Node v1.0
                      </h3>
                      <p className="text-xs text-cad-textMuted mt-0.5 leading-relaxed">
                        STM32F401 MCU + USB-C 5V Input + AP2112K 3.3V LDO + SHT31 I2C Sensor + Status LED + Differential Traces + Ground Plane.
                      </p>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium mt-2 flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        <span>Includes Schematic, PCB Layout, SPICE Models &amp; RS-274X Gerbers</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadDemo();
                    }}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium shadow-sm shrink-0 transition-colors focus-visible:outline-none"
                  >
                    Load Template
                  </button>
                </div>
              </section>
            )}

            {activeTab === 'new' && (
              <section className="max-w-md space-y-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-cad-textMuted font-mono">
                  Create Blank PCB Project
                </h2>

                <form onSubmit={handleCreateNew} className="space-y-3 bg-cad-panel p-4 rounded-md border border-cad-border shadow-sm">
                  <div>
                    <label htmlFor="prj-name-input" className="text-xs text-cad-text block mb-1 font-medium">
                      Project Name
                    </label>
                    <input
                      id="prj-name-input"
                      type="text"
                      value={newPrjName}
                      onChange={(e) => {
                        setNewPrjName(e.target.value);
                        setPrjNameError(null);
                      }}
                      className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:outline-none focus:border-blue-500"
                      required
                    />
                    {prjNameError && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1" role="alert">
                        <AlertCircle size={12} />
                        <span>{prjNameError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-cad-text block mb-1 font-medium">Default Unit System</label>
                    <div className="p-2 bg-cad-subpanel rounded border border-cad-border text-xs font-mono text-cad-text">
                      Metric (Millimeters / mm) · IPC-7351 Standard
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded text-xs shadow-sm transition-colors focus-visible:outline-none"
                  >
                    Create Project Workspace
                  </button>
                </form>
              </section>
            )}
          </main>
        </div>

        {/* Semantic Footer */}
        <footer className="h-9 bg-cad-header border-t border-cad-border px-4 sm:px-6 flex items-center justify-between text-[11px] text-cad-textMuted font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span>{siteConfig.companyName}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Local-First EDA</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={onOpenPrivacyPolicy} className="hover:text-blue-500 transition-colors">
              Privacy
            </button>
            <span>·</span>
            <button onClick={onOpenTerms} className="hover:text-blue-500 transition-colors">
              Terms
            </button>
            {siteConfig.contactEmail && (
              <>
                <span>·</span>
                <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-blue-500 transition-colors">
                  {siteConfig.contactEmail}
                </a>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
