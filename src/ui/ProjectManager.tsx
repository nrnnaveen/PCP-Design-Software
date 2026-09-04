/**
 * FloZ ECA — Professional Desktop Engineering Project Hub & Start Window
 * Visual Studio / Altium-inspired project navigator, solution manager,
 * dense engineering tables, verified hardware templates, and instant workspace launch.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ApexProject } from '../core/types';
import { createBlankProject } from '../examples/demoProject';
import { ProjectSerializer } from '../core/serialization';
import { AuthService, User } from '../core/auth';
import { siteConfig } from '../config/siteConfig';
import { LogoMark } from '../components/branding/LogoMark';
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
  Search,
  Check,
  Download,
  Filter,
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

interface ProjectRecord {
  id: string;
  name: string;
  type: string;
  category: 'active' | 'template' | 'example';
  description: string;
  componentsCount: number;
  netsCount: number;
  tracesCount: number;
  layers: number;
  lastModified: string;
  isActive?: boolean;
  generator?: () => ApexProject;
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
  const [selectedSection, setSelectedSection] = useState<'all' | 'recent' | 'templates' | 'new'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPrjName, setNewPrjName] = useState('New_FloZ_Design');
  const [layerCount, setLayerCount] = useState<2 | 4 | 6 | 8>(2);
  const [prjNameError, setPrjNameError] = useState<string | null>(null);
  const [user, setUser] = useState<User>(() => AuthService.getUser());

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    return unsub;
  }, []);

  // Real active project records (zero hardcoded fake/demo projects)
  const projectsList: ProjectRecord[] = useMemo(() => {
    const records: ProjectRecord[] = [];
    if (currentProject?.metadata) {
      records.push({
        id: currentProject.metadata.id || 'active_project',
        name: currentProject.metadata.name || 'Active Project',
        type: 'FloZ ECA Design',
        category: 'active',
        description: currentProject.metadata.description || 'Current active schematic & PCB design.',
        componentsCount: currentProject.pcb.footprints.length,
        netsCount: Object.keys(currentProject.netGraph.nets).length,
        tracesCount: currentProject.pcb.tracks.length,
        layers: 2,
        lastModified: 'Just now',
        isActive: true,
      });
    }
    return records;
  }, [currentProject]);

  const filteredProjects = useMemo(() => {
    return projectsList.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projectsList, searchQuery]);

  const handleCreateNew = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPrjName.trim();
    if (!trimmed) {
      setPrjNameError('Project name cannot be empty.');
      return;
    }
    setPrjNameError(null);
    const freshProject = createBlankProject(trimmed);
    freshProject.metadata.author = user.name || 'FloZ Designer';
    onOpenProject(freshProject);
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
      role="dialog"
      aria-labelledby="prj-manager-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop select-none p-2 sm:p-4 md:p-6"
    >
      <div className="bg-cad-panel border border-cad-border w-full max-w-5xl h-full max-h-[720px] rounded-sm shadow-xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-75">
        {/* 1. Header Command Strip */}
        <header className="h-9 bg-cad-header border-b border-cad-border px-3 sm:px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <LogoMark size={16} />
            <div className="flex items-baseline space-x-2">
              <span id="prj-manager-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading tracking-tight">
                FloZ ECA Start Window
              </span>
              <span className="text-[10px] text-cad-textMuted font-mono hidden sm:inline">
                Solution Explorer &amp; Project Navigator
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* User Session */}
            <div className="hidden sm:flex items-center space-x-2 bg-cad-subpanel px-2 py-0.5 rounded-xs border border-cad-border text-xs font-mono">
              <UserIcon size={11} className="text-cad-textMuted" />
              <span className="font-medium text-[11px] text-cad-text">{user.name}</span>
              {user.isGuest ? (
                <button
                  onClick={onOpenAuthModal}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-[10px]"
                >
                  Sign In
                </button>
              ) : (
                <button
                  onClick={() => AuthService.logout()}
                  className="text-cad-textMuted hover:text-cad-text"
                  title="Sign Out"
                >
                  <LogOut size={11} />
                </button>
              )}
            </div>

            {/* Launch Workspace Button */}
            <button
              onClick={onClose}
              className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs font-medium flex items-center gap-1.5 transition-colors duration-fast shadow-xs"
            >
              <span>Open Active Workspace</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </header>

        {/* 2. Workspace Body: Left Solution Actions + Right Dense Table */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Action Pane */}
          <aside className="w-52 border-r border-cad-border bg-cad-subpanel p-2 flex flex-col justify-between shrink-0">
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-cad-textMuted uppercase tracking-wider font-mono">
                Start Actions
              </div>

              <button
                onClick={() => setSelectedSection('new')}
                className={`w-full px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-2 transition-colors duration-fast ${
                  selectedSection === 'new'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <Plus size={13} />
                <span>New Blank PCB</span>
              </button>

              <label className="w-full px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-2 text-cad-text hover:bg-cad-surfaceHover cursor-pointer transition-colors duration-fast">
                <Upload size={13} className="text-emerald-600 dark:text-emerald-400" />
                <span>Open Project File</span>
                <input
                  type="file"
                  accept=".json,.apexprj,.flozprj"
                  onChange={handleImportFile}
                  className="sr-only"
                />
              </label>

              <div className="my-1.5 border-t border-cad-border" />

              <div className="px-2 py-1 text-[10px] font-semibold text-cad-textMuted uppercase tracking-wider font-mono">
                Navigator Views
              </div>

              <button
                onClick={() => setSelectedSection('all')}
                className={`w-full px-2.5 py-1 rounded-xs text-xs font-medium flex items-center justify-between transition-colors duration-fast ${
                  selectedSection === 'all'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={13} />
                  <span>All Projects</span>
                </span>
                <span className="text-[10px] font-mono opacity-70">{projectsList.length}</span>
              </button>

              <button
                onClick={() => setSelectedSection('recent')}
                className={`w-full px-2.5 py-1 rounded-xs text-xs font-medium flex items-center justify-between transition-colors duration-fast ${
                  selectedSection === 'recent'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Clock size={13} />
                  <span>Recent / Active</span>
                </span>
                <span className="text-[10px] font-mono opacity-70">{projectsList.length}</span>
              </button>

              <div className="my-1.5 border-t border-cad-border" />

              <div className="px-2 py-1 text-[10px] font-semibold text-cad-textMuted uppercase tracking-wider font-mono">
                Engineering Tools
              </div>

              {onOpenCircuitLab && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenCircuitLab();
                  }}
                  className="w-full px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-2 text-cad-text hover:bg-cad-surfaceHover transition-colors duration-fast"
                >
                  <Activity size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Live Circuit Lab</span>
                </button>
              )}

              {onOpenLibraryManager && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenLibraryManager();
                  }}
                  className="w-full px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-2 text-cad-text hover:bg-cad-surfaceHover transition-colors duration-fast"
                >
                  <Layers size={13} className="text-amber-600 dark:text-amber-400" />
                  <span>Library Manager</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="w-full px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-2 text-cad-text hover:bg-cad-surfaceHover transition-colors duration-fast"
                >
                  <Settings size={13} />
                  <span>Preferences</span>
                </button>
              )}
            </div>

            {/* Quick Legal / Version */}
            <div className="pt-2 border-t border-cad-border text-[10px] text-cad-textMuted space-y-1 font-mono">
              <div className="flex items-center justify-between">
                <button onClick={onOpenPrivacyPolicy} className="hover:text-blue-600 dark:hover:text-blue-400">
                  Privacy
                </button>
                <span>·</span>
                <button onClick={onOpenTerms} className="hover:text-blue-600 dark:hover:text-blue-400">
                  Terms
                </button>
                <span>·</span>
                <button onClick={onOpenAbout} className="hover:text-blue-600 dark:hover:text-blue-400">
                  About
                </button>
              </div>
            </div>
          </aside>

          {/* Right Main Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-cad-bg p-3 sm:p-4">
            {selectedSection === 'new' ? (
              /* Inline New Project Form */
              <div className="max-w-lg space-y-3">
                <div className="border-b border-cad-border pb-2">
                  <h2 className="text-sm font-semibold text-cad-textHeading">Create New Blank Design</h2>
                  <p className="text-xs text-cad-textMuted mt-0.5">
                    Configure initial schematic sheets, PCB layer stackup, and default units.
                  </p>
                </div>

                <form onSubmit={handleCreateNew} className="space-y-3 bg-cad-panel p-3 rounded-xs border border-cad-border">
                  <div>
                    <label className="text-xs font-medium text-cad-text block mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={newPrjName}
                      onChange={(e) => {
                        setNewPrjName(e.target.value);
                        setPrjNameError(null);
                      }}
                      className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-xs px-2.5 py-1 text-xs text-cad-inputText font-mono focus:outline-none focus:border-blue-500"
                      required
                    />
                    {prjNameError && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} />
                        <span>{prjNameError}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-cad-text block mb-1">
                      PCB Layer Stackup
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {([2, 4, 6, 8] as const).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setLayerCount(cnt)}
                          className={`py-1 rounded-xs text-xs font-mono font-medium border text-center transition-colors duration-fast ${
                            layerCount === cnt
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-cad-subpanel text-cad-text border-cad-border hover:bg-cad-surfaceHover'
                          }`}
                        >
                          {cnt} Layers
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-cad-text block mb-1">Standard Coordinate Units</label>
                    <div className="px-2.5 py-1 bg-cad-subpanel rounded-xs border border-cad-border text-xs font-mono text-cad-text">
                      Metric (Millimeters / mm) · IPC-7351 Standard
                    </div>
                  </div>

                  <div className="pt-1.5 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSection('all')}
                      className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-xs font-medium border border-cad-border transition-colors duration-fast"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xs text-xs shadow-xs transition-colors duration-fast"
                    >
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Dense Technical Projects Table */
              <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                {/* Search & Filter Bar */}
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="relative flex-1 max-w-md">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cad-textMuted" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-cad-inputBg border border-cad-inputBorder rounded-xs text-xs text-cad-inputText font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="text-xs text-cad-textMuted font-mono">
                    <span>{filteredProjects.length} projects found</span>
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-y-auto border border-cad-border rounded-xs bg-cad-panel">
                  {filteredProjects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-cad-textHeading">
                          {searchQuery.trim() ? 'No matching projects found' : 'No projects yet'}
                        </div>
                        <p className="text-xs text-cad-textMuted font-mono max-w-xs">
                          {searchQuery.trim()
                            ? `No projects matched "${searchQuery}".`
                            : 'Create a project to get started.'}
                        </p>
                      </div>
                      {searchQuery.trim() ? (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="px-2.5 py-1 text-xs text-blue-500 hover:underline font-mono"
                        >
                          Clear search filter
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedSection('new')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium transition-colors"
                        >
                          Create New Project
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-cad-header border-b border-cad-border text-[10px] font-mono text-cad-textMuted">
                          <th className="py-1 px-3 font-semibold w-24">STATUS</th>
                          <th className="py-1 px-3 font-semibold">PROJECT NAME</th>
                          <th className="py-1 px-3 font-semibold">ARCHITECTURE / SPECS</th>
                          <th className="py-1 px-3 font-semibold text-center w-24">COMPONENTS</th>
                          <th className="py-1 px-3 font-semibold text-center w-20">NETS</th>
                          <th className="py-1 px-3 font-semibold text-center w-20">TRACES</th>
                          <th className="py-1 px-3 font-semibold w-28">MODIFIED</th>
                          <th className="py-1 px-3 font-semibold text-right w-24">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cad-border/60">
                        {filteredProjects.map((p) => (
                          <tr
                            key={p.id}
                            onDoubleClick={() => {
                              if (p.generator) {
                                onOpenProject(p.generator());
                              }
                              onClose();
                            }}
                            className="hover:bg-cad-surfaceHover cursor-pointer transition-colors duration-fast group"
                          >
                            <td className="py-1.5 px-3">
                              {p.isActive ? (
                                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-cad-textMuted">
                                  Saved
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3">
                              <div className="font-semibold text-cad-textHeading flex items-center gap-1.5">
                                {p.isActive ? <Cpu size={13} className="text-blue-600 dark:text-blue-400 shrink-0" /> : <FileCode size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                <span>{p.name}</span>
                              </div>
                              <div className="text-[11px] text-cad-textMuted truncate max-w-sm mt-0.5">
                                {p.description}
                              </div>
                            </td>
                            <td className="py-1.5 px-3 font-mono text-[11px] text-cad-text">
                              <div>{p.type}</div>
                              <div className="text-[10px] text-cad-textMuted">{p.layers} Layer Stackup</div>
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[11px]">
                              {p.componentsCount}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[11px]">
                              {p.netsCount}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[11px]">
                              {p.tracesCount}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-[11px] text-cad-textMuted">
                              {p.lastModified}
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (p.generator) {
                                    onOpenProject(p.generator());
                                  }
                                  onClose();
                                }}
                                className="px-2.5 py-0.5 bg-cad-subpanel hover:bg-blue-600 hover:text-white border border-cad-border rounded-xs text-[11px] font-medium transition-colors duration-fast"
                              >
                                {p.isActive ? 'Resume' : 'Open'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>

        {/* 3. Footer Strip */}
        <footer className="h-6 bg-cad-header border-t border-cad-border px-3 sm:px-4 flex items-center justify-between text-[10px] text-cad-textMuted font-mono shrink-0">
          <div>
            <span>FloZ ECA Project Manager</span>
          </div>
          <div>
            <span>Double-click any project row to load into workspace</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
