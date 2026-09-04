/**
 * FloZ — Modern Clean Full-Screen Dashboard
 * Neat, uncluttered project navigator and starter templates.
 * Clean design, zero AI jargon or clutter, instant workflow.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ApexProject } from '../core/types';
import { createDemoProject } from '../examples/demoProject';
import { ProjectSerializer } from '../core/serialization';
import { AuthService, User } from '../core/auth';
import { Logo } from '../components/branding/Logo';
import {
  FolderOpen,
  Plus,
  Upload,
  Cpu,
  Layers,
  Settings,
  User as UserIcon,
  LogOut,
  ArrowRight,
  Search,
  LayoutGrid,
  List,
  Sun,
  Moon,
  Box,
  FileText,
  Compass,
} from 'lucide-react';
import { AppThemeId } from '../theme/themeManager';

interface DashboardProps {
  currentProject: ApexProject;
  onOpenProject: (project: ApexProject) => void;
  onOpenWorkspaceTab: (tab: 'schematic' | 'pcb' | '3d' | 'simulation' | 'gerbview' | 'calculator') => void;
  onOpenLanding: () => void;
  onOpenSettings?: () => void;
  onOpenLibraryManager?: () => void;
  onOpenCircuitLab?: () => void;
  onOpenAuthModal?: () => void;
  theme?: AppThemeId;
  onToggleTheme?: () => void;
}

interface ProjectItem {
  id: string;
  name: string;
  category: 'active' | 'template' | 'custom';
  description: string;
  layers: 2 | 4 | 6 | 8;
  partsCount: number;
  lastModified: string;
  isActive?: boolean;
  generator?: () => ApexProject;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentProject,
  onOpenProject,
  onOpenWorkspaceTab,
  onOpenLanding,
  onOpenSettings,
  onOpenAuthModal,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'templates'>('projects');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [user, setUser] = useState<User>(() => AuthService.getUser());

  // New Project State
  const [projectName, setProjectName] = useState('New Circuit Design');
  const [projectLayers, setProjectLayers] = useState<2 | 4 | 6 | 8>(2);

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    return unsub;
  }, []);

  // Keyboard shortcut listener for Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showNewModal) {
        setShowNewModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNewModal]);

  // Clean Hardware Starter Templates
  const templates: ProjectItem[] = useMemo(() => [
    {
      id: 'template_stm32',
      name: 'Microcontroller Board',
      category: 'template',
      description: '32-bit controller board with USB-C connector and 3.3V power regulator.',
      layers: 2,
      partsCount: 16,
      lastModified: 'Template',
      generator: () => createDemoProject(),
    },
    {
      id: 'template_buck',
      name: 'Power Converter',
      category: 'template',
      description: 'Step-down voltage switching regulator with input filter capacitors.',
      layers: 4,
      partsCount: 12,
      lastModified: 'Template',
      generator: () => {
        const p = createDemoProject();
        p.metadata.id = `power_${Date.now()}`;
        p.metadata.name = 'Power Converter';
        p.metadata.description = 'Step-down voltage switching regulator.';
        return p;
      },
    },
    {
      id: 'template_ble',
      name: 'Wireless Sensor',
      category: 'template',
      description: 'Low-power telemetry sensor board with battery supervisor.',
      layers: 2,
      partsCount: 14,
      lastModified: 'Template',
      generator: () => {
        const p = createDemoProject();
        p.metadata.id = `sensor_${Date.now()}`;
        p.metadata.name = 'Wireless Sensor';
        p.metadata.description = 'Low-power telemetry sensor board.';
        return p;
      },
    },
    {
      id: 'template_usbpd',
      name: 'USB-C Module',
      category: 'template',
      description: 'USB-C power hub controller module with circuit protection.',
      layers: 4,
      partsCount: 18,
      lastModified: 'Template',
      generator: () => {
        const p = createDemoProject();
        p.metadata.id = `usbc_${Date.now()}`;
        p.metadata.name = 'USB-C Module';
        p.metadata.description = 'USB-C power hub controller module.';
        return p;
      },
    },
  ], []);

  // Active Projects
  const myProjects: ProjectItem[] = useMemo(() => {
    const list: ProjectItem[] = [];
    if (currentProject?.metadata) {
      list.push({
        id: currentProject.metadata.id || 'active',
        name: currentProject.metadata.name || 'My Circuit Board',
        category: 'active',
        description: currentProject.metadata.description || 'Current active schematic and PCB layout.',
        layers: 2,
        partsCount: currentProject.pcb.footprints.length,
        lastModified: 'Active Now',
        isActive: true,
        generator: () => currentProject,
      });
    }
    return list;
  }, [currentProject]);

  const items = useMemo(() => {
    const base = activeTab === 'projects' ? myProjects : templates;
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [activeTab, myProjects, templates, searchQuery]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = projectName.trim() || 'Untitled Board';

    const fresh = createDemoProject();
    fresh.metadata.id = `proj_${Date.now()}`;
    fresh.metadata.name = trimmed;
    fresh.metadata.author = user.name || 'Designer';
    fresh.schematic.sheets[0].symbols = [];
    fresh.schematic.sheets[0].wires = [];
    fresh.schematic.sheets[0].junctions = [];
    fresh.schematic.sheets[0].labels = [];
    fresh.pcb.footprints = [];
    fresh.pcb.tracks = [];
    fresh.pcb.vias = [];
    fresh.pcb.zones = [];
    fresh.netGraph = { nets: {} };

    onOpenProject(fresh);
    setShowNewModal(false);
    onOpenWorkspaceTab('schematic');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = ProjectSerializer.deserialize(content);
        onOpenProject(imported);
        onOpenWorkspaceTab('schematic');
      } catch (err: any) {
        alert(`Failed to import file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen w-screen bg-cad-bg text-cad-text flex flex-col select-none overflow-hidden font-sans">
      {/* 1. Clean Top Bar */}
      <header className="h-14 bg-cad-panel border-b border-cad-border px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" onClick={onOpenLanding} />
            <span className="text-cad-border text-sm hidden sm:inline">/</span>
            <span className="text-xs font-semibold text-cad-textHeading hidden sm:inline">
              Dashboard
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-56 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cad-textMuted pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects or templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-cad-inputBg border border-cad-inputBorder rounded-md text-xs text-cad-inputText placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Project Button */}
          <button
            onClick={() => setShowNewModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors duration-fast eng-tactile"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>

          {/* Import File */}
          <label className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors duration-fast eng-tactile">
            <Upload size={14} className="text-emerald-500" />
            <span className="hidden sm:inline">Import</span>
            <input
              type="file"
              accept=".json,.apexprj,.flozprj"
              onChange={handleImport}
              className="sr-only"
            />
          </label>

          {/* Theme Switcher */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 text-cad-text hover:bg-cad-surfaceHover rounded-md border border-cad-border transition-colors duration-fast eng-tactile"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}

          {/* User Session */}
          <div className="flex items-center gap-2 bg-cad-subpanel px-3 py-1.5 rounded-md border border-cad-border text-xs">
            <UserIcon size={13} className="text-cad-textMuted" />
            <span className="font-medium text-cad-text max-w-[100px] truncate">
              {user.name}
            </span>
            {user.isGuest ? (
              <button
                onClick={onOpenAuthModal}
                className="text-blue-500 hover:underline font-semibold ml-1 text-[11px]"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => AuthService.logout()}
                className="text-cad-textMuted hover:text-red-400 ml-1 transition-colors"
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            )}
          </div>

          {/* Open CAD Button */}
          <button
            onClick={() => onOpenWorkspaceTab('schematic')}
            className="px-3.5 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text font-medium text-xs rounded-md flex items-center gap-1.5 transition-colors duration-fast eng-tactile"
          >
            <span>Open CAD</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Clean Minimal Sidebar */}
        <aside className="w-52 border-r border-cad-border bg-cad-subpanel p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('projects')}
                className={`w-full px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 transition-colors duration-fast ${
                  activeTab === 'projects'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <FolderOpen size={15} />
                <span>My Projects</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white/90">
                  {myProjects.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('templates')}
                className={`w-full px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 transition-colors duration-fast ${
                  activeTab === 'templates'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <Compass size={15} />
                <span>Templates</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white/90">
                  {templates.length}
                </span>
              </button>
            </div>

            <div className="space-y-1 pt-4 border-t border-cad-border">
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="w-full px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 text-cad-text hover:bg-cad-surfaceHover transition-colors duration-fast"
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-cad-textMuted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Local &amp; Ready</span>
          </div>
        </aside>

        {/* Content Canvas */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-cad-bg p-6 space-y-6">
          {/* Active Project Hero Banner */}
          {currentProject?.metadata && (
            <div className="bg-cad-panel border border-cad-border rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Current Board</span>
                </div>

                <h2 className="text-lg font-bold text-cad-textHeading flex items-center gap-2">
                  <Cpu size={18} className="text-blue-500 shrink-0" />
                  <span>{currentProject.metadata.name || 'Untitled Board'}</span>
                </h2>

                <p className="text-xs text-cad-textMuted max-w-lg">
                  {currentProject.metadata.description || 'Active schematic and layout design.'}
                </p>

                <div className="flex items-center gap-4 text-xs text-cad-textMuted pt-1">
                  <span>{currentProject.pcb.footprints.length} components</span>
                  <span>·</span>
                  <span>{currentProject.pcb.tracks.length} traces</span>
                  <span>·</span>
                  <span>2 Layers</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenWorkspaceTab('schematic')}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors duration-fast eng-tactile"
                >
                  <FileText size={14} />
                  <span>Schematic</span>
                </button>

                <button
                  onClick={() => onOpenWorkspaceTab('pcb')}
                  className="px-3.5 py-2 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-fast eng-tactile"
                >
                  <Layers size={14} className="text-blue-500" />
                  <span>PCB Layout</span>
                </button>

                <button
                  onClick={() => onOpenWorkspaceTab('3d')}
                  className="px-3.5 py-2 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-fast eng-tactile"
                >
                  <Box size={14} className="text-cyan-500" />
                  <span>3D View</span>
                </button>
              </div>
            </div>
          )}

          {/* Section Header */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h3 className="text-sm font-semibold text-cad-textHeading">
                {activeTab === 'projects' ? 'Projects' : 'Starter Templates'}
              </h3>
              <p className="text-xs text-cad-textMuted">
                {activeTab === 'projects'
                  ? 'Your saved circuit designs.'
                  : 'Start from a ready-to-use reference board.'}
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-cad-subpanel border border-cad-border rounded-md p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-cad-panel text-blue-500 shadow-xs' : 'text-cad-textMuted hover:text-cad-text'
                }`}
                title="Grid"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-cad-panel text-blue-500 shadow-xs' : 'text-cad-textMuted hover:text-cad-text'
                }`}
                title="List"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Grid / List Cards */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-cad-border rounded-lg bg-cad-panel text-center space-y-3">
              <FolderOpen size={28} className="text-cad-textMuted opacity-40" />
              <div className="text-xs text-cad-textMuted">No projects found.</div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.generator) onOpenProject(item.generator());
                    onOpenWorkspaceTab('schematic');
                  }}
                  className="bg-cad-panel border border-cad-border hover:border-blue-500/60 rounded-lg p-5 cursor-pointer transition-all duration-150 flex flex-col justify-between group shadow-xs hover:shadow-md hover:-translate-y-0.5 eng-tactile"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-cad-subpanel border border-cad-border text-cad-textMuted">
                        {item.layers} Layers
                      </span>
                      {item.isActive && (
                        <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-cad-textHeading group-hover:text-blue-500 transition-colors flex items-center gap-2">
                      <Cpu size={15} className="text-blue-500 shrink-0" />
                      <span>{item.name}</span>
                    </h4>

                    <p className="text-xs text-cad-textMuted line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-cad-border flex items-center justify-between text-xs text-cad-textMuted">
                    <span>{item.partsCount} components</span>
                    <span className="group-hover:translate-x-0.5 transition-transform text-cad-text font-medium flex items-center gap-1">
                      <span>Open</span>
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-cad-border rounded-lg bg-cad-panel overflow-hidden">
              <div className="divide-y divide-cad-border">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.generator) onOpenProject(item.generator());
                      onOpenWorkspaceTab('schematic');
                    }}
                    className="p-3.5 hover:bg-cad-surfaceHover cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Cpu size={16} className="text-blue-500" />
                      <div>
                        <div className="text-xs font-semibold text-cad-textHeading">{item.name}</div>
                        <div className="text-[11px] text-cad-textMuted">{item.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-cad-textMuted">{item.layers} Layers</span>
                      <button className="px-2.5 py-1 bg-cad-subpanel hover:bg-blue-600 hover:text-white border border-cad-border rounded text-xs transition-colors">
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Clean New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-cad-panel border border-cad-border w-full max-w-sm rounded-lg shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="border-b border-cad-border pb-2">
              <h3 className="text-sm font-semibold text-cad-textHeading">New Project</h3>
              <p className="text-xs text-cad-textMuted">Create a fresh blank circuit design.</p>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-cad-text font-medium text-[11px]">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  autoFocus
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-md px-3 py-1.5 text-xs text-cad-inputText focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-cad-text font-medium text-[11px]">
                  Board Layers
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([2, 4, 6, 8] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setProjectLayers(cnt)}
                      className={`py-1.5 rounded-md text-xs font-medium border text-center transition-colors ${
                        projectLayers === cnt
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-cad-subpanel text-cad-text border-cad-border hover:bg-cad-surfaceHover'
                      }`}
                    >
                      {cnt}L
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-md text-xs font-medium border border-cad-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-md text-xs shadow-xs transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
