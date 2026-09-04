/**
 * FloZ — AI Prompt-to-PCB Dashboard
 * Turn user prompts into real, manufactured PCB designs.
 * Minimalist full-screen layout with instant AI circuit synthesis,
 * active design quick-resume, Supabase cloud project storage & synchronization.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApexProject } from '../core/types';
import { createBlankProject } from '../examples/demoProject';
import { ProjectSerializer } from '../core/serialization';
import { AuthService, User } from '../core/auth';
import { CloudProjectService, CloudProjectRecord } from '../core/cloudProjects';
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
  Sparkles,
  Zap,
  Loader2,
  Info,
  HelpCircle,
  Cloud,
  CloudCheck,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AppThemeId } from '../theme/themeManager';

interface DashboardProps {
  currentProject: ApexProject;
  onOpenProject: (project: ApexProject) => void;
  onOpenWorkspaceTab: (tab: 'schematic' | 'pcb' | '3d' | 'simulation' | 'gerbview' | 'calculator') => void;
  onOpenLanding: () => void;
  onOpenPromptSession?: (prompt: string) => void;
  onOpenSettings?: () => void;
  onOpenLibraryManager?: () => void;
  onOpenCircuitLab?: () => void;
  onOpenAuthModal?: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenTerms?: () => void;
  onOpenAbout?: () => void;
  onOpenFAQ?: () => void;
  onOpenContact?: () => void;
  theme?: AppThemeId;
  onToggleTheme?: () => void;
}

interface ProjectItem {
  id: string;
  name: string;
  category: 'active' | 'custom';
  description: string;
  layers: 2 | 4 | 6 | 8;
  partsCount: number;
  lastModified: string;
  isActive?: boolean;
  isCloud?: boolean;
  generator?: () => ApexProject;
}

const SAMPLE_PROMPTS = [
  { label: '⚡ ESP32-S3 IoT Node', prompt: 'ESP32-S3 with USB-C, LiPo charger, and I2C temperature sensor' },
  { label: '🦾 STM32 Motor Driver', prompt: 'STM32 Cortex-M4 with dual H-bridge motor driver and CAN bus' },
  { label: '🔋 12V Buck Converter', prompt: '12V to 5V 3A step-down switching regulator with low noise' },
  { label: '🔌 USB-C Power Hub', prompt: 'USB-C Power Delivery controller with 20V negotiation and ESD protection' },
];

export const Dashboard: React.FC<DashboardProps> = ({
  currentProject,
  onOpenProject,
  onOpenWorkspaceTab,
  onOpenLanding,
  onOpenPromptSession,
  onOpenSettings,
  onOpenLibraryManager,
  onOpenCircuitLab,
  onOpenAuthModal,
  onOpenPrivacyPolicy,
  onOpenTerms,
  onOpenAbout,
  onOpenFAQ,
  onOpenContact,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [user, setUser] = useState<User>(() => AuthService.getUser());

  // Cloud Project State
  const [cloudProjects, setCloudProjects] = useState<CloudProjectRecord[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [cloudToast, setCloudToast] = useState<string | null>(null);

  // AI Prompt Bar State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // New Project State
  const [projectName, setProjectName] = useState('New Circuit Design');
  const [projectLayers, setProjectLayers] = useState<2 | 4 | 6 | 8>(2);

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    return unsub;
  }, []);

  // Fetch Cloud Projects from Supabase
  const loadCloudProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const records = await CloudProjectService.listProjects();
      setCloudProjects(records);
    } catch (err) {
      console.warn('Could not load cloud projects:', err);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadCloudProjects();
  }, [loadCloudProjects, user.id]);

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

  // Handle Prompt-to-PCB AI Synthesis
  const handleSynthesizePrompt = (customPrompt?: string) => {
    const query = (customPrompt || aiPrompt).trim();
    if (!query) return;

    if (onOpenPromptSession) {
      onOpenPromptSession(query);
      return;
    }

    setIsSynthesizing(true);
    setTimeout(() => {
      const fresh = createBlankProject(query.slice(0, 30));
      fresh.metadata.description = query;
      fresh.metadata.author = user.name || 'FloZ Designer';

      onOpenProject(fresh);
      setIsSynthesizing(false);
      onOpenWorkspaceTab('schematic');
    }, 300);
  };

  // Active & Cloud Projects list
  const myProjects: ProjectItem[] = useMemo(() => {
    const list: ProjectItem[] = [];
    const seenIds = new Set<string>();

    if (currentProject?.metadata) {
      const currentId = currentProject.metadata.id || 'active';
      seenIds.add(currentId);
      list.push({
        id: currentId,
        name: currentProject.metadata.name || 'My Circuit Board',
        category: 'active',
        description: currentProject.metadata.description || 'Current active schematic and PCB layout.',
        layers: 2,
        partsCount: currentProject.pcb.footprints.length,
        lastModified: 'Active Now',
        isActive: true,
        isCloud: false,
        generator: () => currentProject,
      });
    }

    // Add Supabase Cloud Projects
    cloudProjects.forEach((cp) => {
      if (!seenIds.has(cp.id)) {
        seenIds.add(cp.id);
        list.push({
          id: cp.id,
          name: cp.name,
          category: 'custom',
          description: cp.description || 'Cloud-synced circuit design.',
          layers: cp.layers,
          partsCount: cp.partsCount,
          lastModified: new Date(cp.updatedAt).toLocaleDateString(),
          isActive: false,
          isCloud: true,
        });
      }
    });

    return list;
  }, [currentProject, cloudProjects]);

  const items = useMemo(() => {
    if (!searchQuery.trim()) return myProjects;
    const q = searchQuery.toLowerCase();
    return myProjects.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }, [myProjects, searchQuery]);

  const handleOpenItem = async (item: ProjectItem) => {
    if (item.generator) {
      onOpenProject(item.generator());
      onOpenWorkspaceTab('schematic');
      return;
    }

    // Load from Cloud
    try {
      setLoadingProjects(true);
      const loaded = await CloudProjectService.loadProject(item.id);
      onOpenProject(loaded);
      onOpenWorkspaceTab('schematic');
    } catch (err: any) {
      alert(`Could not open project: ${err.message}`);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSaveActiveToCloud = async () => {
    if (!currentProject) return;
    setIsSavingCloud(true);
    try {
      const res = await CloudProjectService.saveProject(currentProject);
      if (res.isCloud) {
        setCloudToast('Project saved to FloZ Cloud.');
        await loadCloudProjects();
      } else {
        setCloudToast('Saved locally. Sign in to sync across devices.');
      }
    } catch (err: any) {
      setCloudToast(`Save error: ${err.message}`);
    } finally {
      setIsSavingCloud(false);
      setTimeout(() => setCloudToast(null), 4000);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, item: ProjectItem) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      await CloudProjectService.deleteProject(item.id);
      setCloudProjects((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = projectName.trim() || 'Untitled Board';
    const fresh = createBlankProject(trimmed);
    fresh.metadata.author = user.name || 'FloZ Designer';

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
        const text = event.target?.result as string;
        const imported = ProjectSerializer.deserialize(text);
        onOpenProject(imported);
        onOpenWorkspaceTab('schematic');
      } catch (err: any) {
        alert(err.message || 'Failed to parse FloZ project file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-cad-bg text-cad-text overflow-hidden font-sans select-none">
      {/* 1. Header Bar */}
      <header className="h-14 border-b border-cad-border bg-cad-panel px-4 sm:px-6 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-6">
          <Logo size="sm" subtitle={false} onClick={onOpenLanding} />

          {/* Quick Search */}
          <div className="relative w-56 sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cad-textMuted pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects..."
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
            <span>Blank Board</span>
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
            <span className="font-medium text-cad-text max-w-[120px] truncate">
              {user.name || 'FloZ Designer'}
            </span>
            {user.isGuest ? (
              onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="text-blue-500 hover:text-blue-400 font-medium ml-1 transition-colors text-[11px]"
                >
                  Sign In
                </button>
              )
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
        <aside className="w-56 border-r border-cad-border bg-cad-subpanel p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <div
                className="w-full px-3 py-2 rounded-md text-xs font-semibold flex items-center gap-2.5 bg-blue-600 text-white shadow-xs"
              >
                <FolderOpen size={15} />
                <span>My Projects</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white/90">
                  {myProjects.length}
                </span>
              </div>
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
              {onOpenAbout && (
                <button
                  onClick={onOpenAbout}
                  className="w-full px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 text-cad-text hover:bg-cad-surfaceHover transition-colors duration-fast"
                >
                  <Info size={15} />
                  <span>About FloZ ECA</span>
                </button>
              )}
              {onOpenFAQ && (
                <button
                  onClick={onOpenFAQ}
                  className="w-full px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2.5 text-cad-text hover:bg-cad-surfaceHover transition-colors duration-fast"
                >
                  <HelpCircle size={15} />
                  <span>FAQ & Support</span>
                </button>
              )}
            </div>
          </div>

          {/* FloZ Workspace & Cloud Status */}
          <div className="pt-4 border-t border-cad-border flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-cad-text flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>FloZ Workspace</span>
              </span>
              <span className="text-[10px] font-mono text-cad-textMuted">
                {user.isGuest ? 'Guest' : 'Cloud Synced'}
              </span>
            </div>
            <div className="text-[10px] text-cad-textMuted leading-tight">
              {user.isGuest
                ? 'Sign in to sync your circuits across devices.'
                : 'Projects synchronized with your FloZ account.'}
            </div>
          </div>

          {(onOpenTerms || onOpenPrivacyPolicy || onOpenContact) && (
            <div className="flex items-center gap-2 text-[10px] text-cad-textMuted pt-2 border-t border-cad-border/50 flex-wrap">
              {onOpenTerms && (
                <button onClick={onOpenTerms} className="hover:text-cad-text transition-colors">
                  Terms
                </button>
              )}
                {onOpenTerms && onOpenPrivacyPolicy && <span>·</span>}
                {onOpenPrivacyPolicy && (
                  <button onClick={onOpenPrivacyPolicy} className="hover:text-cad-text transition-colors">
                    Privacy
                  </button>
                )}
                {onOpenContact && (
                  <>
                    <span>·</span>
                    <button onClick={onOpenContact} className="hover:text-cad-text transition-colors">
                      Contact
                    </button>
                  </>
                )}
              </div>
            )}
        </aside>

        {/* Content Canvas */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-cad-bg p-6 space-y-6">
          {/* Toast Notification */}
          {cloudToast && (
            <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in duration-150">
              <span className="flex items-center gap-2">
                <CloudCheck size={16} />
                <span>{cloudToast}</span>
              </span>
              <button onClick={() => setCloudToast(null)} className="text-emerald-400/70 hover:text-emerald-300">
                &times;
              </button>
            </div>
          )}

          {/* A. Prominent AI Prompt-to-PCB Generator Hero Card */}
          <div className="bg-gradient-to-r from-blue-900/20 via-cad-panel to-cad-panel border border-blue-500/30 rounded-xl p-5 shadow-md space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                <Sparkles size={15} />
                <span>AI Prompt to Real PCB</span>
              </div>
              <span className="text-[10px] text-cad-textMuted font-mono">
                Natural Language Compiler
              </span>
            </div>

            <div className="relative">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSynthesizePrompt();
                  }
                }}
                rows={2}
                placeholder="Describe your electronics project in plain language (e.g. 'USB-C LiPo power board with 3.3V LDO, charge LED, and battery monitor')..."
                className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-lg p-3 text-xs text-cad-inputText placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
              />

              <button
                type="button"
                onClick={() => handleSynthesizePrompt()}
                disabled={!aiPrompt.trim() || isSynthesizing}
                className="absolute right-2.5 bottom-3.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold rounded-md text-xs flex items-center gap-1.5 shadow-sm transition-all duration-fast eng-tactile"
              >
                {isSynthesizing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} />
                    <span>Generate PCB</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[11px] text-cad-textMuted font-medium">Try:</span>
              {SAMPLE_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSynthesizePrompt(p.prompt)}
                  className="px-2.5 py-1 rounded-md text-[11px] bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-textMuted hover:text-cad-text transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* B. Active Project Quick-Resume Hero */}
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
                  onClick={handleSaveActiveToCloud}
                  disabled={isSavingCloud}
                  className="px-3.5 py-2 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-text rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors duration-fast eng-tactile"
                  title="Save current circuit to cloud"
                >
                  {isSavingCloud ? (
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                  ) : (
                    <Cloud size={14} className="text-blue-500" />
                  )}
                  <span>{isSavingCloud ? 'Saving...' : 'Save to Cloud'}</span>
                </button>

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
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-sm font-semibold text-cad-textHeading">
                  Saved &amp; Cloud Projects
                </h3>
                <p className="text-xs text-cad-textMuted">
                  Your saved and synchronized circuit designs.
                </p>
              </div>

              <button
                onClick={loadCloudProjects}
                disabled={loadingProjects}
                className="p-1.5 rounded-md hover:bg-cad-surfaceHover text-cad-textMuted hover:text-cad-text transition-colors"
                title="Refresh Cloud Projects"
              >
                <RefreshCw size={13} className={loadingProjects ? 'animate-spin text-blue-500' : ''} />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-cad-subpanel border border-cad-border rounded-md p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid' ? 'bg-cad-panel text-blue-500 shadow-xs' : 'text-cad-textMuted hover:text-cad-text'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list' ? 'bg-cad-panel text-blue-500 shadow-xs' : 'text-cad-textMuted hover:text-cad-text'
                }`}
                title="List View"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* Grid / List Cards */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-cad-border rounded-lg bg-cad-panel text-center space-y-3">
              <FolderOpen size={28} className="text-cad-textMuted opacity-40" />
              <div className="text-xs text-cad-textMuted">No projects found. Create a new design or prompt FloZ AI above.</div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="bg-cad-panel border border-cad-border hover:border-blue-500/60 rounded-lg p-5 cursor-pointer transition-all duration-150 flex flex-col justify-between group shadow-xs hover:shadow-md hover:-translate-y-0.5 eng-tactile"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-cad-subpanel border border-cad-border text-cad-textMuted">
                          {item.layers} Layers
                        </span>
                        {item.isCloud && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
                            <Cloud size={10} /> Cloud
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.isActive && (
                          <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                        {item.isCloud && (
                          <button
                            onClick={(e) => handleDeleteItem(e, item)}
                            className="p-1 text-cad-textMuted hover:text-red-400 transition-colors"
                            title="Delete project"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
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
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-cad-panel border border-cad-border rounded-lg overflow-hidden divide-y divide-cad-border shadow-xs">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="p-3.5 hover:bg-cad-surfaceHover cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Cpu size={16} className="text-blue-500" />
                    <div>
                      <div className="text-xs font-semibold text-cad-textHeading flex items-center gap-2">
                        <span>{item.name}</span>
                        {item.isCloud && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
                            <Cloud size={10} /> Cloud
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-cad-textMuted">{item.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-cad-textMuted">{item.layers} Layers</span>
                    {item.isCloud && (
                      <button
                        onClick={(e) => handleDeleteItem(e, item)}
                        className="p-1 text-cad-textMuted hover:text-red-400 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button className="px-2.5 py-1 bg-cad-subpanel hover:bg-blue-600 hover:text-white border border-cad-border rounded text-xs transition-colors">
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Clean New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-cad-panel border border-cad-border w-full max-w-sm rounded-lg shadow-xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="border-b border-cad-border pb-2">
              <h3 className="text-sm font-semibold text-cad-textHeading">New Blank Board</h3>
              <p className="text-xs text-cad-textMuted">Create a fresh blank circuit canvas.</p>
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
