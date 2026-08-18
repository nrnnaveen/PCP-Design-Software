/**
 * FloZ ECA - Main Desktop Application Shell
 * Tabbed CAD workspace, menu bar, dockable tool panels, undo/redo manager, library manager, and cross-probing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ApexProject } from '../core/types';
import { createDemoProject } from '../examples/demoProject';
import { TransactionManager } from '../core/transaction';
import { ProjectSerializer } from '../core/serialization';
import { ECOEngine } from '../sync/ecoEngine';
import { eventBus } from '../core/eventBus';

// Editors & Panels
import { SchematicEditor } from '../schematic/SchematicEditor';
import { PCBEditor } from '../pcb/PCBEditor';
import { Board3DViewer } from '../three3d/Board3DViewer';
import { SimulationPanel } from '../simulation/SimulationPanel';
import { GerberViewer } from '../gerbview/GerberViewer';
import { Calculators } from '../calculator/Calculators';
import { SymbolChooser } from '../library/SymbolChooser';
import { FootprintAssignment } from '../library/FootprintAssignment';
import { LibraryManager } from '../library/LibraryManager';
import { ImportPreviewModal } from '../library/ImportPreviewModal';
import { LibraryImportAnalyzer, ImportAnalysisSummary } from '../library/importAnalyzer';
import { PropertiesPanel } from './PropertiesPanel';
import { ERCPanel } from '../erc/ERCPanel';
import { DRCPanel } from '../drc/DRCPanel';
import { FloZAIPanel } from '../ai/FloZAIPanel';
import { ManufacturingModal } from '../manufacturing/ManufacturingModal';
import { ProjectManager } from './ProjectManager';
import { AboutModal } from './AboutModal';
import { ProjectHealthModal } from './ProjectHealthModal';
import { MissingAssetsModal } from './MissingAssetsModal';
import { AssetResolver } from '../library/assetResolver';

// Icons
import {
  FileText,
  Layers,
  Box,
  Activity,
  Calculator,
  FileCode,
  Undo2,
  Redo2,
  Save,
  Download,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  FolderOpen,
  RefreshCw,
  Cpu,
  Zap,
  CheckCircle2,
  Info,
  Package,
  Sparkles,
  Sun,
  Moon,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export type WorkspaceTab =
  | 'schematic'
  | 'pcb'
  | '3d'
  | 'simulation'
  | 'gerbview'
  | 'calculator';

export const AppShell: React.FC = () => {
  // 1. Authoritative Project State
  const [project, setProject] = useState<ApexProject>(() => {
    const autosaved = ProjectSerializer.loadFromAutosave();
    return autosaved || createDemoProject();
  });

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('floz-eda-theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('floz-eda-theme', theme);
  }, [theme]);

  // Undo/Redo Engine
  const [transactionMgr] = useState(() => new TransactionManager<ApexProject>(100));
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('schematic');
  const [rightPanel, setRightPanel] = useState<'properties' | 'erc' | 'drc' | 'ai'>('properties');
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(false);

  // Resizable Right Sidebar Width (Draggable Splitter)
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('floz_right_panel_width');
      if (saved) return Math.min(850, Math.max(300, parseInt(saved, 10)));
    } catch {}
    return 420;
  });
  const [isDraggingRightSplitter, setIsDraggingRightSplitter] = useState<boolean>(false);

  useEffect(() => {
    if (!isDraggingRightSplitter) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(850, Math.max(300, window.innerWidth - e.clientX));
      setRightPanelWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsDraggingRightSplitter(false);
      localStorage.setItem('floz_right_panel_width', rightPanelWidth.toString());
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingRightSplitter, rightPanelWidth]);

  // Modals & Dialogs
  const [showSymbolChooser, setShowSymbolChooser] = useState<boolean>(false);
  const [showFootprintAssignment, setShowFootprintAssignment] = useState<boolean>(false);
  const [showLibraryManager, setShowLibraryManager] = useState<boolean>(false);
  const [showMfgModal, setShowMfgModal] = useState<boolean>(false);
  const [showProjectManager, setShowProjectManager] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showHealthModal, setShowHealthModal] = useState<boolean>(false);
  const [showMissingAssetsModal, setShowMissingAssetsModal] = useState<boolean>(false);

  // Drag & drop import analysis modal
  const [dropImportAnalysis, setDropImportAnalysis] = useState<ImportAnalysisSummary | null>(null);

  // Selection state for inspector
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | undefined>();
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | undefined>();

  // Toast Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // State Update Handler with Transaction Recording
  const updateProject = useCallback(
    (updater: (prev: ApexProject) => ApexProject, actionName?: string) => {
      setProject((prev) => {
        const next = updater(prev);
        if (actionName) {
          transactionMgr.execute(prev, {
            name: actionName,
            apply: () => next,
            invert: () => prev,
          });
          showToast(`Action: ${actionName}`);
        }
        ProjectSerializer.saveToAutosave(next);
        return next;
      });
    },
    [transactionMgr]
  );

  // Undo / Redo Actions
  const handleUndo = () => {
    if (transactionMgr.canUndo()) {
      const { state, undoneAction } = transactionMgr.undo(project);
      setProject(state);
      ProjectSerializer.saveToAutosave(state);
      showToast(`Undo: ${undoneAction?.name || 'Action'}`);
    }
  };

  const handleRedo = () => {
    if (transactionMgr.canRedo()) {
      const { state, redoneAction } = transactionMgr.redo(project);
      setProject(state);
      ProjectSerializer.saveToAutosave(state);
      showToast(`Redo: ${redoneAction?.name || 'Action'}`);
    }
  };

  // Schematic ↔ PCB Forward Sync (ECO)
  const handleSyncPCB = () => {
    const report = ECOEngine.generateReport(project);
    const updated = ECOEngine.applySync(project);
    updateProject(() => updated, 'Sync PCB from Schematic');
    showToast(
      `Synchronized PCB: +${report.newFootprintsCount} parts, -${report.removedFootprintsCount} parts`
    );
    setActiveTab('pcb');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.shiftKey && e.key === 'z'))
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        ProjectSerializer.exportToFile(project);
        showToast('Project File Saved');
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleSyncPCB();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [project, handleUndo, handleRedo]);

  // Global Drag & Drop Handler for Library Files (.kicad_sym, .kicad_mod)
  useEffect(() => {
    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const fileList = Array.from(e.dataTransfer.files);
        const hasLibFile = fileList.some((f) => {
          const l = f.name.toLowerCase();
          return l.endsWith('.kicad_sym') || l.endsWith('.kicad_mod') || l.endsWith('.pretty');
        });

        if (hasLibFile) {
          const analysis = await LibraryImportAnalyzer.analyzeFiles(fileList);
          setDropImportAnalysis(analysis);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  // EventBus Cross-probing Listeners
  useEffect(() => {
    const unsub1 = eventBus.on('SELECT_SYMBOL', (data) => {
      setSelectedSymbolId(data.symbolId);
      setSelectedFootprintId(undefined);
    });
    const unsub2 = eventBus.on('SELECT_FOOTPRINT', (data) => {
      setSelectedFootprintId(data.footprintId);
      setSelectedSymbolId(undefined);
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-cad-bg text-cad-text select-none overflow-hidden font-sans">
      {/* 1. Top CAD Menu Bar */}
      <header className="h-9 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          {/* Logo & Product Title */}
          <div
            onClick={() => setShowProjectManager(true)}
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              F
            </div>
            <span className="font-bold text-white tracking-wide">FloZ ECA</span>
          </div>

          <div className="h-3.5 w-px bg-cad-border" />

          {/* Project Title Readout */}
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className="text-white font-semibold">{project.metadata.name}</span>
            <span className="text-cad-textMuted text-[10px]">v{project.metadata.version}</span>
          </div>

          <div className="h-3.5 w-px bg-cad-border" />

          {/* Quick Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowProjectManager(true)}
              title="Project Manager"
              className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white"
            >
              <FolderOpen size={14} />
            </button>

            <button
              onClick={() => {
                ProjectSerializer.exportToFile(project);
                showToast('Project Exported');
              }}
              title="Save Project (Ctrl+S)"
              className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white"
            >
              <Save size={14} />
            </button>

            <button
              onClick={handleUndo}
              disabled={!transactionMgr.canUndo()}
              title="Undo (Ctrl+Z)"
              className="p-1 hover:bg-cad-subpanel rounded disabled:opacity-30 text-cad-textMuted hover:text-white"
            >
              <Undo2 size={14} />
            </button>

            <button
              onClick={handleRedo}
              disabled={!transactionMgr.canRedo()}
              title="Redo (Ctrl+Y)"
              className="p-1 hover:bg-cad-subpanel rounded disabled:opacity-30 text-cad-textMuted hover:text-white"
            >
              <Redo2 size={14} />
            </button>
          </div>
        </div>

        {/* Center/Right Workflow Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSyncPCB}
            title="Update PCB from Schematic (F8)"
            className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-border text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1.5 border border-cad-border shadow-sm transition-colors"
          >
            <RefreshCw size={12} className="text-blue-400" />
            Sync PCB (F8)
          </button>

          <button
            onClick={() => setShowLibraryManager(true)}
            title="Open Component Library Manager"
            className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-border text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <Layers size={12} className="text-emerald-400" />
            Libraries
          </button>

          <button
            onClick={() => setShowFootprintAssignment(true)}
            className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-border text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1.5 border border-cad-border"
          >
            <Cpu size={12} className="text-amber-400" />
            Assign Footprints
          </button>

          {/* Missing Assets Manager */}
          {(() => {
            const scan = AssetResolver.scanProject(project);
            return (
              <button
                onClick={() => setShowMissingAssetsModal(true)}
                title="Manage and resolve missing component symbols and footprints"
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                  scan.missingCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-cad-subpanel text-slate-200 border-cad-border hover:bg-cad-border'
                }`}
              >
                <AlertCircle size={12} className={scan.missingCount > 0 ? 'text-amber-400' : 'text-slate-400'} />
                <span>Assets</span>
                {scan.missingCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-full">
                    {scan.missingCount}
                  </span>
                )}
              </button>
            );
          })()}

          {/* Project Health & Diagnostics Dashboard */}
          <button
            onClick={() => setShowHealthModal(true)}
            title="Open Project Health & Verification Dashboard"
            className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-border text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <ShieldCheck size={12} className="text-emerald-400" />
            Health
          </button>

          <button
            onClick={() => setShowMfgModal(true)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download size={12} />
            Export Gerber ZIP
          </button>

          <button
            onClick={() => {
              setRightPanel('ai');
              setRightPanelCollapsed(false);
            }}
            title="FloZ AI - Electronic Design Assistant"
            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-[11px] font-semibold flex items-center gap-1.5 border border-blue-500/40 shadow-sm transition-colors"
          >
            <Sparkles size={12} className="text-blue-400" />
            FloZ AI
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            className="p-1.5 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white border border-transparent hover:border-cad-border transition-colors ml-1"
          >
            {theme === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-blue-400" />}
          </button>

          <button
            onClick={() => setShowAboutModal(true)}
            title="About FloZ ECA"
            className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white ml-0.5"
          >
            <Info size={14} />
          </button>
        </div>
      </header>

      {/* 2. Workspace Navigation Tab Bar */}
      <nav className="h-9 bg-cad-panel border-b border-cad-border px-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          {[
            { id: 'schematic', label: 'Schematic Capture', icon: FileText },
            { id: 'pcb', label: 'PCB Layout', icon: Layers },
            { id: '3d', label: '3D Board Viewer', icon: Box },
            { id: 'simulation', label: 'SPICE Simulation', icon: Activity },
            { id: 'gerbview', label: 'Gerber Viewer', icon: FileCode },
            { id: 'calculator', label: 'PCB Calculators', icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`px-3 py-1.5 rounded-t-md font-semibold text-xs flex items-center gap-1.5 transition-colors border-t-2 ${
                  isActive
                    ? 'bg-cad-bg text-white border-blue-500 shadow-sm'
                    : 'text-cad-textMuted hover:text-white border-transparent hover:bg-cad-subpanel'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-blue-400' : undefined} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Dock Switcher */}
        <div className="flex items-center space-x-1 bg-cad-subpanel p-0.5 rounded border border-cad-border">
          <button
            onClick={() => {
              if (rightPanel === 'properties' && !rightPanelCollapsed) {
                setRightPanelCollapsed(true);
              } else {
                setRightPanel('properties');
                setRightPanelCollapsed(false);
              }
            }}
            title="Properties Inspector (Toggle)"
            className={`p-1 rounded ${
              !rightPanelCollapsed && rightPanel === 'properties' ? 'bg-blue-600 text-white' : 'text-cad-textMuted hover:text-white'
            }`}
          >
            <Sliders size={13} />
          </button>
          <button
            onClick={() => {
              if (rightPanel === 'erc' && !rightPanelCollapsed) {
                setRightPanelCollapsed(true);
              } else {
                setRightPanel('erc');
                setRightPanelCollapsed(false);
              }
            }}
            title="Electrical Rules Check (Toggle)"
            className={`p-1 rounded ${
              !rightPanelCollapsed && rightPanel === 'erc' ? 'bg-amber-600 text-white' : 'text-cad-textMuted hover:text-white'
            }`}
          >
            <AlertTriangle size={13} />
          </button>
          <button
            onClick={() => {
              if (rightPanel === 'drc' && !rightPanelCollapsed) {
                setRightPanelCollapsed(true);
              } else {
                setRightPanel('drc');
                setRightPanelCollapsed(false);
              }
            }}
            title="Design Rules Check (Toggle)"
            className={`p-1 rounded ${
              !rightPanelCollapsed && rightPanel === 'drc' ? 'bg-blue-600 text-white' : 'text-cad-textMuted hover:text-white'
            }`}
          >
            <ShieldAlert size={13} />
          </button>
          <button
            onClick={() => {
              if (rightPanel === 'ai' && !rightPanelCollapsed) {
                setRightPanelCollapsed(true);
              } else {
                setRightPanel('ai');
                setRightPanelCollapsed(false);
              }
            }}
            title="FloZ AI - Electronic Design Assistant (Toggle)"
            className={`p-1 rounded ${
              !rightPanelCollapsed && rightPanel === 'ai' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-white'
            }`}
          >
            <Sparkles size={13} />
          </button>
        </div>
      </nav>

      {/* 3. Central Working Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Editor Area */}
        <div className="flex-1 h-full relative">
          {activeTab === 'schematic' && (
            <SchematicEditor
              project={project}
              onUpdateProject={updateProject}
              onOpenSymbolChooser={() => setShowSymbolChooser(true)}
            />
          )}

          {activeTab === 'pcb' && (
            <PCBEditor
              project={project}
              onUpdateProject={updateProject}
              onRunDRC={() => {
                setRightPanel('drc');
                setRightPanelCollapsed(false);
              }}
            />
          )}

          {activeTab === '3d' && <Board3DViewer project={project} />}

          {activeTab === 'simulation' && <SimulationPanel project={project} />}

          {activeTab === 'gerbview' && <GerberViewer project={project} />}

          {activeTab === 'calculator' && <Calculators />}
        </div>

        {/* Right Dock Panel (Fluidly Resizable Width) */}
        {!rightPanelCollapsed && activeTab !== 'simulation' && activeTab !== 'gerbview' && activeTab !== 'calculator' && (
          <aside
            style={{ width: `${rightPanel === 'ai' ? rightPanelWidth : Math.min(380, rightPanelWidth)}px` }}
            className="h-full flex flex-col relative shrink-0 select-none bg-cad-panel border-l border-cad-border"
          >
            {/* Draggable Left Border Splitter Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingRightSplitter(true);
              }}
              title="Drag left/right to resize sidebar"
              className="absolute top-0 bottom-0 -left-1.5 w-3 cursor-col-resize z-40 group flex items-center justify-center hover:bg-blue-500/20 transition-colors"
            >
              <div className="w-0.5 h-14 rounded bg-cad-border group-hover:bg-blue-400 group-hover:w-1 transition-all" />
            </div>

            {rightPanel === 'properties' && (
              <PropertiesPanel
                project={project}
                selectedSymbolId={selectedSymbolId}
                selectedFootprintId={selectedFootprintId}
                onUpdateProject={updateProject}
              />
            )}
            {rightPanel === 'erc' && <ERCPanel project={project} />}
            {rightPanel === 'drc' && <DRCPanel project={project} />}
            {rightPanel === 'ai' && (
              <FloZAIPanel
                project={project}
                selectedSymbolId={selectedSymbolId}
                selectedFootprintId={selectedFootprintId}
                onUpdateProject={updateProject}
                panelWidth={rightPanelWidth}
                onSetPanelWidth={(w) => {
                  setRightPanelWidth(w);
                  localStorage.setItem('floz_right_panel_width', w.toString());
                }}
              />
            )}
          </aside>
        )}
      </main>

      {/* 4. Bottom Status Bar */}
      <footer className="h-6 bg-cad-header border-t border-cad-border px-3 flex items-center justify-between text-[11px] text-cad-textMuted font-mono select-none">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1 text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400" /> Ready
          </span>
          <span>Units: {project.metadata.units}</span>
          <span>Grid: 0.5mm / 20mil</span>
          <span>Components: {project.pcb.footprints.length}</span>
          <span>Nets: {Object.keys(project.netGraph.nets).length}</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-slate-400">FloZ ECA Engine v1.0.0 — Electronic Circuit Architect</span>
        </div>
      </footer>

      {/* Toast Popup */}
      {toastMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-cad-panel border border-blue-500/50 text-white px-4 py-2 rounded-lg shadow-2xl text-xs font-mono flex items-center gap-2 z-50 animate-bounce">
          <CheckCircle2 size={14} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Modals */}
      <SymbolChooser
        isOpen={showSymbolChooser}
        onClose={() => setShowSymbolChooser(false)}
        onSelectSymbol={(symDef) => {
          const newSym = {
            id: `sym_${Date.now()}`,
            symbolDefId: symDef.id,
            reference: `${symDef.defaultPrefix}?`,
            value: symDef.name,
            footprint: symDef.defaultFootprint || '',
            x: 100,
            y: 80,
            rotation: 0 as any,
            mirrorX: false,
            unit: 1,
            fields: { Description: symDef.description },
            pins: JSON.parse(JSON.stringify(symDef.pins)),
          };

          updateProject((prev) => {
            const sheet =
              prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) ||
              prev.schematic.sheets[0];
            return {
              ...prev,
              schematic: {
                ...prev.schematic,
                sheets: prev.schematic.sheets.map((s) =>
                  s.id === sheet.id ? { ...s, symbols: [...s.symbols, newSym] } : s
                ),
              },
            };
          }, `Place ${symDef.name}`);
        }}
      />

      <FootprintAssignment
        project={project}
        isOpen={showFootprintAssignment}
        onClose={() => setShowFootprintAssignment(false)}
        onUpdateProject={updateProject}
      />

      <LibraryManager
        isOpen={showLibraryManager}
        onClose={() => setShowLibraryManager(false)}
      />

      <ManufacturingModal
        project={project}
        isOpen={showMfgModal}
        onClose={() => setShowMfgModal(false)}
      />

      {showProjectManager && (
        <ProjectManager
          currentProject={project}
          onOpenProject={(p) => setProject(p)}
          onClose={() => setShowProjectManager(false)}
          onOpenLibraryManager={() => setShowLibraryManager(true)}
        />
      )}

      {showAboutModal && (
        <AboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />
      )}

      {showHealthModal && (
        <ProjectHealthModal
          isOpen={showHealthModal}
          onClose={() => setShowHealthModal(false)}
          project={project}
          onUpdateProject={updateProject}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {showMissingAssetsModal && (
        <MissingAssetsModal
          isOpen={showMissingAssetsModal}
          onClose={() => setShowMissingAssetsModal(false)}
          project={project}
          onUpdateProject={updateProject}
        />
      )}

      {/* Drag & Drop Import Preview Modal */}
      {dropImportAnalysis && (
        <ImportPreviewModal
          analysis={dropImportAnalysis}
          isOpen={Boolean(dropImportAnalysis)}
          onClose={() => setDropImportAnalysis(null)}
          onImportComplete={(summary) => {
            showToast(`Imported ${summary.importedCount} items into FloZ ECA`);
          }}
        />
      )}
    </div>
  );
};
