/**
 * FloZ ECA - Desktop Project Manager Dashboard
 * Project creation, template library, file import/export, user session,
 * live circuit code lab, and recent design workspace.
 */

import React, { useState, useEffect } from 'react';
import { ApexProject } from '../core/types';
import { createDemoProject } from '../examples/demoProject';
import { ProjectSerializer } from '../core/serialization';
import { AuthService, User } from '../core/auth';
import {
  FolderOpen,
  Plus,
  FileCode,
  Upload,
  Cpu,
  Layers,
  Sparkles,
  HardDrive,
  Clock,
  ChevronRight,
  HelpCircle,
  Settings,
  Activity,
  User as UserIcon,
  LogIn,
  LogOut,
  ArrowRight,
} from 'lucide-react';

interface Props {
  currentProject: ApexProject;
  onOpenProject: (project: ApexProject) => void;
  onClose: () => void;
  onOpenLibraryManager?: () => void;
  onOpenSettings?: () => void;
  onOpenCircuitLab?: () => void;
  onOpenAuthModal?: () => void;
}

export const ProjectManager: React.FC<Props> = ({
  currentProject,
  onOpenProject,
  onClose,
  onOpenLibraryManager,
  onOpenSettings,
  onOpenCircuitLab,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'templates' | 'new'>('recent');
  const [newPrjName, setNewPrjName] = useState('New_FloZ_Design');
  const [user, setUser] = useState<User>(() => AuthService.getUser());

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    return unsub;
  }, []);

  const handleCreateNew = () => {
    const freshProject = createDemoProject();
    freshProject.metadata.id = `proj_${Date.now()}`;
    freshProject.metadata.name = newPrjName;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md select-none p-4">
      <div className="bg-cad-panel border border-cad-border w-[960px] max-w-full h-[620px] max-h-full rounded-xl shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-14 bg-cad-header border-b border-cad-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md">
              F
            </div>
            <div>
              <h1 className="text-sm font-bold text-cad-text tracking-wide">FloZ ECA — Electronic Circuit Architect</h1>
              <p className="text-[11px] text-cad-textMuted font-mono">Professional Desktop Electronics Design Suite v1.0.0</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* User Session Pill */}
            <div className="flex items-center space-x-2 bg-cad-subpanel px-3 py-1 rounded-lg border border-cad-border text-xs">
              <UserIcon size={13} className="text-cad-textMuted" />
              <span className="font-semibold text-cad-text">{user.name}</span>
              {user.isGuest ? (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 text-[10px] font-mono">
                  Guest
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[10px] font-mono">
                  Signed In
                </span>
              )}
              {user.isGuest ? (
                <button
                  onClick={onOpenAuthModal}
                  className="ml-1 text-blue-500 hover:text-blue-400 font-semibold text-[11px]"
                >
                  Sign In
                </button>
              ) : (
                <button
                  onClick={() => AuthService.logout()}
                  className="ml-1 text-cad-textMuted hover:text-cad-text"
                  title="Sign Out"
                >
                  <LogOut size={12} />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-xs px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              Open Workspace
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 2-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <div className="w-60 border-r border-cad-border bg-cad-bg/40 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('recent')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'recent' ? 'bg-blue-600 text-white shadow-sm' : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-subpanel'
              }`}
            >
              <Clock size={15} />
              Recent Projects
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'templates' ? 'bg-blue-600 text-white shadow-sm' : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-subpanel'
              }`}
            >
              <Sparkles size={15} />
              Design Templates
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                activeTab === 'new' ? 'bg-blue-600 text-white shadow-sm' : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-subpanel'
              }`}
            >
              <Plus size={15} />
              New Project
            </button>

            {onOpenCircuitLab && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCircuitLab();
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 text-cad-textMuted hover:text-cad-text hover:bg-cad-subpanel transition-colors"
              >
                <Activity size={15} className="text-emerald-500 dark:text-emerald-400" />
                Live Circuit Lab
              </button>
            )}

            {onOpenLibraryManager && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLibraryManager();
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 text-cad-textMuted hover:text-cad-text hover:bg-cad-subpanel transition-colors"
              >
                <Layers size={15} className="text-amber-500 dark:text-amber-400" />
                Library Manager
              </button>
            )}

            {onOpenSettings && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 text-cad-textMuted hover:text-cad-text hover:bg-cad-subpanel transition-colors"
              >
                <Settings size={15} className="text-blue-500 dark:text-blue-400" />
                Preferences & Settings
              </button>
            )}

            <div className="pt-4 border-t border-cad-border mt-4 space-y-2">
              <label className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 bg-cad-subpanel hover:bg-cad-border text-cad-text cursor-pointer border border-cad-border transition-colors">
                <Upload size={15} className="text-emerald-500 dark:text-emerald-400" />
                Import Project File
                <input type="file" accept=".json,.apexprj,.flozprj" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-cad-bg/20">
            {activeTab === 'recent' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-cad-textMuted font-mono">
                    Active & Recent Projects
                  </h2>
                </div>

                {/* Active Project Card */}
                <div
                  onClick={onClose}
                  className="p-4 bg-cad-panel border border-blue-500/40 rounded-xl hover:border-blue-400 cursor-pointer transition-all shadow-md flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600/20 text-blue-500 dark:text-blue-400 rounded-lg">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-cad-text">{currentProject.metadata.name}</h3>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-mono font-semibold">
                          Current Open
                        </span>
                      </div>
                      <p className="text-xs text-cad-textMuted mt-1">{currentProject.metadata.description}</p>
                      <div className="flex items-center gap-4 text-[11px] text-cad-textMuted font-mono mt-2">
                        <span>{currentProject.pcb.footprints.length} Components</span>
                        <span>•</span>
                        <span>{Object.keys(currentProject.netGraph.nets).length} Nets</span>
                        <span>•</span>
                        <span>{currentProject.pcb.tracks.length} Routed Traces</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-cad-textMuted" />
                </div>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-cad-textMuted font-mono">
                  Verified Engineering Templates
                </h2>

                <div
                  onClick={handleLoadDemo}
                  className="p-4 bg-cad-panel border border-cad-border hover:border-emerald-500/50 rounded-xl cursor-pointer transition-all shadow-md flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-600/20 text-emerald-500 dark:text-emerald-400 rounded-lg">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-cad-text">FloZ IoT Sensor Node v1.0</h3>
                      <p className="text-xs text-cad-textMuted mt-1">
                        STM32F401 MCU + USB-C 5V Input + AP2112K 3.3V LDO + SHT31 I2C Sensor + Status LED + Traces + Ground Pour.
                      </p>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold mt-2">
                        Includes Full Schematic, PCB Layout, SPICE Models & Gerber Files
                      </div>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm">
                    Load Template
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'new' && (
              <div className="max-w-md space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-cad-textMuted font-mono">
                  Create Blank PCB Project
                </h2>

                <div className="space-y-3 bg-cad-panel p-5 rounded-xl border border-cad-border">
                  <div>
                    <label className="text-xs text-cad-text block mb-1 font-medium">Project Name</label>
                    <input
                      type="text"
                      value={newPrjName}
                      onChange={(e) => setNewPrjName(e.target.value)}
                      className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-xs text-cad-text font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-cad-text block mb-1 font-medium">Default Unit System</label>
                    <div className="p-2 bg-cad-bg rounded border border-cad-border text-xs font-mono text-cad-text">
                      Metric (Millimeters / mm)
                    </div>
                  </div>

                  <button
                    onClick={handleCreateNew}
                    className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs shadow-md transition-colors"
                  >
                    Create Project Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
