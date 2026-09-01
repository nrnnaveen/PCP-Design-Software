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
import { SchematicHelper } from '../schematic/helper';
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
import { SettingsModal } from './SettingsModal';
import { LiveCircuitLab } from '../simulation/LiveCircuitLab';
import { AuthModal } from './AuthModal';
import { AuthService, User } from '../core/auth';
import { AssetResolver } from '../library/assetResolver';
import { platform } from '../platform';
import { SEOEngine } from '../core/seo';
import { AnalyticsService } from '../core/analytics';
import { NotFoundPage } from './NotFoundPage';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsModal } from './TermsModal';
import { CookieConsentBanner } from './CookieConsentBanner';
import { ThankYouModal } from './ThankYouModal';

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
  LayoutDashboard,
  Settings as SettingsIcon,
  User as UserIcon,
} from 'lucide-react';

export type WorkspaceTab =
  | 'schematic'
  | 'pcb'
  | '3d'
  | 'simulation'
  | 'gerbview'
  | 'calculator';

interface ParsedRoute {
  tab: WorkspaceTab;
  showDashboard: boolean;
  showNotFound: boolean;
  showPrivacy: boolean;
  showTerms: boolean;
}

function parseInitialRoute(): ParsedRoute {
  try {
    const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
    const path = pathname !== '/' ? pathname : hash ? `/${hash}` : '/';

    if (path === '/' || path === '/dashboard' || path === '/projects') {
      return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: false, showTerms: false };
    }
    if (path === '/privacy') {
      return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: true, showTerms: false };
    }
    if (path === '/terms') {
      return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: false, showTerms: true };
    }
    if (path.startsWith('/workspace/pcb') || path === '/pcb') {
      return { tab: 'pcb', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false };
    }
    if (path.startsWith('/workspace/3d') || path === '/3d') {
      return { tab: '3d', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false };
    }
    if (path.startsWith('/workspace/simulation') || path === '/simulation') {
      return { tab: 'simulation', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false };
    }
    if (path.startsWith('/workspace/gerbview') || path === '/gerbview') {
      return { tab: 'gerbview', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false };
    }
    if (path.startsWith('/workspace/calculator') || path === '/calculator') {
      return { tab: 'calculator', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false };
    }
    if (path.startsWith('/workspace/schematic') || path === '/workspace' || path === '/schematic') {
      return { tab: 'schematic', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false };
    }
    // Unknown path -> Custom 404
    return { tab: 'schematic', showDashboard: false, showNotFound: true, showPrivacy: false, showTerms: false };
  } catch {
    return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: false, showTerms: false };
  }
}

import { AppThemeId, ThemeManager, AVAILABLE_THEMES } from '../theme/themeManager';

export const AppShell: React.FC = () => {
  // 1. Authoritative Project State
  const [project, setProject] = useState<ApexProject>(() => {
    const autosaved = ProjectSerializer.loadFromAutosave();
    return autosaved || createDemoProject();
  });

  // Routing State: Dashboard is the default landing page on startup
  const initialRoute = parseInitialRoute();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialRoute.tab);
  const [showProjectManager, setShowProjectManager] = useState<boolean>(initialRoute.showDashboard);
  const [showNotFound, setShowNotFound] = useState<boolean>(initialRoute.showNotFound);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(initialRoute.showPrivacy);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(initialRoute.showTerms);
  const [showThankYouModal, setShowThankYouModal] = useState<boolean>(false);
  const [thankYouInfo, setThankYouInfo] = useState<{ title: string; message: string; details?: string }>({
    title: 'Manufacturing Output Generated',
    message: 'RS-274X Gerber & Excellon drill files packaged successfully.',
  });

  // User Authentication & Modals State
  const [user, setUser] = useState<User>(() => AuthService.getUser());
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showCircuitLab, setShowCircuitLab] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    return unsub;
  }, []);

  // Sync route on popstate
  useEffect(() => {
    const handlePopState = () => {
      const route = parseInitialRoute();
      setActiveTab(route.tab);
      setShowProjectManager(route.showDashboard);
      setShowNotFound(route.showNotFound);
      setShowPrivacyModal(route.showPrivacy);
      setShowTermsModal(route.showTerms);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize SEO metadata & Analytics on route/tab change
  useEffect(() => {
    if (showNotFound) {
      SEOEngine.updateMeta({
        title: 'Page Not Found (404)',
        description: 'The requested CAD design route could not be found.',
        canonicalPath: '/404',
        noIndex: true,
      });
      AnalyticsService.trackPageView('/404', 'Page Not Found');
    } else if (showProjectManager) {
      SEOEngine.updateMeta({
        title: 'Project Dashboard & Templates',
        description: 'Create, open, and manage FloZ ECA multi-layer PCB design projects with verified hardware templates.',
        canonicalPath: '/dashboard',
      });
      AnalyticsService.trackPageView('/dashboard', 'Project Dashboard');
    } else {
      const tabMeta: Record<WorkspaceTab, { title: string; description: string; path: string }> = {
        schematic: {
          title: 'Schematic Capture & Hierarchical Sheet Editor',
          description: 'Design complex multi-sheet schematics with KiCad symbol libraries, wire rubber-banding, and Electrical Rule Checks (ERC).',
          path: '/workspace/schematic',
        },
        pcb: {
          title: 'PCB Layout & 8-Layer Interactive Router',
          description: 'Route multi-layer PCBs with 45-degree octilinear routing, differential pairs, length tuning, and live Design Rule Checks (DRC).',
          path: '/workspace/pcb',
        },
        '3d': {
          title: '3D WebGL Board & Substrate Raytracing Viewer',
          description: 'Inspect your populated PCB in hardware-accelerated 3D WebGL with physical materials and layer stackup visualization.',
          path: '/workspace/3d',
        },
        simulation: {
          title: 'SPICE & MNA Circuit Simulation Engine',
          description: 'Simulate analog and digital circuits using real-time Modified Nodal Analysis (MNA) and multi-channel oscilloscope waveforms.',
          path: '/workspace/simulation',
        },
        gerbview: {
          title: 'Gerber RS-274X & Excellon Drill Vector Viewer',
          description: 'Inspect and verify manufacturing-ready Gerber RS-274X aperture files and Excellon NC drill outputs before physical fabrication.',
          path: '/workspace/gerbview',
        },
        calculator: {
          title: 'IPC-2152 & IPC-2141 PCB Impedance Calculators',
          description: 'Calculate trace current capacity, temperature rise, microstrip impedance, and differential pair impedance matching.',
          path: '/workspace/calculator',
        },
      };

      const meta = tabMeta[activeTab] || tabMeta.schematic;
      SEOEngine.updateMeta({
        title: meta.title,
        description: meta.description,
        canonicalPath: meta.path,
      });
      AnalyticsService.trackPageView(meta.path, meta.title);
    }
  }, [activeTab, showProjectManager, showNotFound]);

  const navigateToTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    setShowProjectManager(false);
    const targetUrl = `/workspace/${tab}`;
    if (window.location.protocol !== 'file:' && window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  const openDashboard = () => {
    setShowProjectManager(true);
    if (window.location.protocol !== 'file:' && window.location.pathname !== '/dashboard') {
      window.history.pushState(null, '', '/dashboard');
    }
  };

  const closeDashboard = () => {
    setShowProjectManager(false);
    const targetUrl = `/workspace/${activeTab}`;
    if (
      window.location.protocol !== 'file:' &&
      window.location.pathname !== targetUrl &&
      window.location.pathname !== '/workspace'
    ) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  // Centralized Theme Management (Dark / Light)
  const [theme, setThemeState] = useState<AppThemeId>(() => ThemeManager.getInitialTheme());

  useEffect(() => {
    ThemeManager.applyTheme(theme);
    const unsub = ThemeManager.subscribe((t) => setThemeState(t));
    return unsub;
  }, [theme]);

  const handleSetTheme = (newTheme: AppThemeId) => {
    ThemeManager.applyTheme(newTheme);
    setThemeState(newTheme);
  };

  // Undo/Redo Engine
  const [transactionMgr] = useState(() => new TransactionManager<ApexProject>(100));
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

  // Global Keyboard & Platform Menu Action Handlers
  useEffect(() => {
    const handleAction = async (action: string) => {
      switch (action) {
        case 'undo':
          handleUndo();
          break;
        case 'redo':
          handleRedo();
          break;
        case 'save':
        case 'save-project':
          await platform.saveProject(project);
          showToast('Project Saved (.floz)');
          break;
        case 'save-as':
        case 'save-project-as':
          await platform.saveProjectAs(project);
          showToast('Project Saved As (.floz)');
          break;
        case 'open':
        case 'open-project': {
          const opened = await platform.openProject();
          if (opened?.project) {
            setProject(opened.project);
            showToast(`Opened: ${opened.fileName}`);
          }
          break;
        }
        case 'new-project':
          setProject(createDemoProject());
          showToast('Created New Project');
          break;
        case 'export-gerber':
          setShowMfgModal(true);
          break;
        case 'tab-schematic':
          setActiveTab('schematic');
          break;
        case 'tab-pcb':
          setActiveTab('pcb');
          break;
        case 'tab-3d':
          setActiveTab('3d');
          break;
        case 'run-drc':
          setRightPanel('drc');
          setRightPanelCollapsed(false);
          break;
        case 'help-about':
          setShowAboutModal(true);
          break;
      }
    };

    const unsubscribeMenu = platform.onMenuAction(handleAction);

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
        platform.saveProject(project).then(() => showToast('Project Saved (.floz)'));
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleSyncPCB();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeys);
      unsubscribeMenu();
    };
  }, [project, handleUndo, handleRedo, handleSyncPCB]);

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

  if (showNotFound) {
    return (
      <div className="h-screen w-screen flex flex-col bg-cad-bg text-cad-text">
        <NotFoundPage
          onNavigateHome={() => {
            setShowNotFound(false);
            openDashboard();
          }}
          onNavigateTab={(tab) => {
            setShowNotFound(false);
            navigateToTab(tab);
          }}
        />
        <CookieConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyModal(true)} />
        {showPrivacyModal && (
          <PrivacyPolicyModal
            isOpen={showPrivacyModal}
            onClose={() => setShowPrivacyModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-cad-bg text-cad-text select-none overflow-hidden font-sans">
      {/* 1. Top CAD Menu Bar */}
      <header className="h-9 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center space-x-3">
          {/* Logo & Product Title */}
          <div
            onClick={openDashboard}
            className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="Open Project Dashboard"
          >
            <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              F
            </div>
            <span className="font-semibold text-cad-textHeading tracking-wide">FloZ ECA</span>
          </div>

          <div className="h-3.5 w-px bg-cad-border" />

          {/* Project Title Readout */}
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className="text-cad-textHeading font-semibold">{project.metadata.name}</span>
            <span className="text-cad-textMuted text-[10px]">v{project.metadata.version}</span>
          </div>

          {/* Dashboard Navigation Button */}
          <button
            onClick={openDashboard}
            title="Open Projects Dashboard"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors shadow-sm"
          >
            <LayoutDashboard size={12} className="text-blue-600 dark:text-blue-400" />
            <span>Dashboard</span>
          </button>

          <div className="h-3.5 w-px bg-cad-border" />

          {/* Quick Actions */}
          <div className="flex items-center space-x-0.5">
            <button
              onClick={() => {
                ProjectSerializer.exportToFile(project);
                showToast('Project Exported');
              }}
              title="Save Project (Ctrl+S)"
              className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors"
            >
              <Save size={13} />
            </button>

            <button
              onClick={handleUndo}
              disabled={!transactionMgr.canUndo()}
              title="Undo (Ctrl+Z)"
              className="p-1 hover:bg-cad-surfaceHover rounded disabled:opacity-30 text-cad-textMuted hover:text-cad-text transition-colors"
            >
              <Undo2 size={13} />
            </button>

            <button
              onClick={handleRedo}
              disabled={!transactionMgr.canRedo()}
              title="Redo (Ctrl+Y)"
              className="p-1 hover:bg-cad-surfaceHover rounded disabled:opacity-30 text-cad-textMuted hover:text-cad-text transition-colors"
            >
              <Redo2 size={13} />
            </button>
          </div>
        </div>

        {/* Center/Right Workflow Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleSyncPCB}
            title="Update PCB from Schematic (F8)"
            className="px-2.5 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border shadow-sm transition-colors"
          >
            <RefreshCw size={12} className="text-blue-600 dark:text-blue-400" />
            <span>Sync PCB (F8)</span>
          </button>

          <button
            onClick={() => setShowLibraryManager(true)}
            title="Open Component Library Manager"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <Layers size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span>Libraries</span>
          </button>

          <button
            onClick={() => setShowFootprintAssignment(true)}
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <Cpu size={12} className="text-amber-600 dark:text-amber-400" />
            <span>Footprints</span>
          </button>

          {/* Missing Assets Manager */}
          {(() => {
            const scan = AssetResolver.scanProject(project);
            return (
              <button
                onClick={() => setShowMissingAssetsModal(true)}
                title="Manage and resolve missing component symbols and footprints"
                className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1.5 border transition-colors ${
                  scan.missingCount > 0
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/20 font-semibold'
                    : 'bg-cad-panel text-cad-text border-cad-border hover:bg-cad-surfaceHover'
                }`}
              >
                <AlertCircle size={12} className={scan.missingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-cad-textMuted'} />
                <span>Assets</span>
                {scan.missingCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-full">
                    {scan.missingCount}
                  </span>
                )}
              </button>
            );
          })()}

          {/* Live Circuit Lab */}
          <button
            onClick={() => setShowCircuitLab(true)}
            title="Open Live Circuit Lab (Code & Embedded Testing)"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <Activity size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span>Circuit Lab</span>
          </button>

          {/* Project Health & Diagnostics Dashboard */}
          <button
            onClick={() => setShowHealthModal(true)}
            title="Open Project Health & Verification Dashboard"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span>Health</span>
          </button>

          <div className="h-3.5 w-px bg-cad-border mx-0.5" />

          {/* Export Fabrication Package ZIP */}
          <button
            onClick={() => setShowMfgModal(true)}
            className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download size={12} />
            <span>Export Gerber ZIP</span>
          </button>

          {/* AI Assistant Hub */}
          <button
            onClick={() => {
              setRightPanel('ai');
              setRightPanelCollapsed(false);
            }}
            title="AI Electronic Design Assistant"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border shadow-sm transition-colors"
          >
            <Cpu size={12} className="text-blue-600 dark:text-blue-400" />
            <span>AI Assistant</span>
          </button>

          {/* User Account / Guest Button */}
          <button
            onClick={() => {
              if (user.isGuest) {
                setShowAuthModal(true);
              } else {
                setShowSettingsModal(true);
              }
            }}
            title={user.isGuest ? 'Guest Mode (Click to Sign In)' : `Logged in as ${user.name}`}
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <UserIcon size={12} className={user.isGuest ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
            <span>{user.isGuest ? 'Guest' : user.name}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Application Preferences & Settings"
            className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors"
          >
            <SettingsIcon size={13} />
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => handleSetTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-1.5 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors flex items-center justify-center focus-visible:outline-none"
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-blue-600" />}
          </button>

          <button
            onClick={() => setShowAboutModal(true)}
            title="About FloZ ECA"
            className="p-1.5 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors focus-visible:outline-none"
          >
            <Info size={14} />
          </button>
        </div>
      </header>

      {/* 2. Workspace Navigation Tab Bar */}
      <nav className="h-8 bg-cad-panel border-b border-cad-border px-3 flex items-center justify-between text-xs">
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
                onClick={() => navigateToTab(tab.id as WorkspaceTab)}
                className={`px-3 py-1 rounded-t font-medium text-xs flex items-center gap-1.5 transition-colors border-t-2 ${
                  isActive
                    ? 'bg-cad-bg text-cad-textHeading border-blue-600 font-semibold shadow-sm'
                    : 'text-cad-textMuted hover:text-cad-text border-transparent hover:bg-cad-surfaceHover'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-blue-600 dark:text-blue-400' : undefined} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Dock Switcher */}
        <div className="flex items-center space-x-0.5 bg-cad-subpanel p-0.5 rounded border border-cad-border">
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
            className={`p-1 rounded transition-colors ${
              !rightPanelCollapsed && rightPanel === 'properties' ? 'bg-blue-600 text-white' : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-surfaceHover'
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
            title="ERC - Electrical Rules Checker (Toggle)"
            className={`p-1 rounded transition-colors ${
              !rightPanelCollapsed && rightPanel === 'erc' ? 'bg-blue-600 text-white' : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-surfaceHover'
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
            title="DRC - Design Rules Checker (Toggle)"
            className={`p-1 rounded transition-colors ${
              !rightPanelCollapsed && rightPanel === 'drc' ? 'bg-blue-600 text-white' : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-surfaceHover'
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
            className={`p-1 rounded transition-colors ${
              !rightPanelCollapsed && rightPanel === 'ai' ? 'bg-blue-600 text-white' : 'text-blue-600 dark:text-blue-400 hover:text-cad-text hover:bg-cad-surfaceHover'
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
              theme={theme}
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
              theme={theme}
            />
          )}

          {activeTab === '3d' && <Board3DViewer project={project} theme={theme} />}

          {activeTab === 'simulation' && <SimulationPanel project={project} />}

          {activeTab === 'gerbview' && <GerberViewer project={project} />}

          {activeTab === 'calculator' && <Calculators />}

          {/* Floating AI Assistant Hub (Non-blocking, Isolated Event Bubbling) */}
          {(activeTab === 'schematic' || activeTab === 'pcb') && (
            <div
              className="absolute bottom-5 right-5 z-30 pointer-events-auto"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  if (rightPanel === 'ai' && !rightPanelCollapsed) {
                    setRightPanelCollapsed(true);
                  } else {
                    setRightPanel('ai');
                    setRightPanelCollapsed(false);
                  }
                }}
                title="FloZ AI Assistant (Copilot)"
                className="flex items-center gap-2 px-3 py-1.5 bg-cad-panel hover:bg-cad-subpanel text-cad-text hover:text-white rounded-lg shadow-md border border-cad-border hover:border-blue-500/50 transition-colors text-xs font-semibold select-none cursor-pointer"
              >
                <Sparkles size={14} className="text-blue-400" />
                <span>AI Copilot</span>
              </button>
            </div>
          )}
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
          <span className="flex items-center gap-1 text-cad-text">
            <div className="w-2 h-2 rounded-full bg-emerald-400" /> Ready
          </span>
          <span>Units: {project.metadata.units}</span>
          <span>Grid: 0.5mm / 20mil</span>
          <span>Components: {project.pcb.footprints.length}</span>
          <span>Nets: {Object.keys(project.netGraph.nets).length}</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-cad-textMuted">FloZ ECA Engine v1.0.0 — Electronic Circuit Architect</span>
        </div>
      </footer>

      {/* Toast Popup */}
      {toastMsg && (
        <div className="fixed bottom-10 right-6 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-xl text-xs font-semibold z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          {toastMsg}
        </div>
      )}

      {/* Modal Dialogs */}
      <SymbolChooser
        isOpen={showSymbolChooser}
        onClose={() => setShowSymbolChooser(false)}
        onSelectSymbol={(symDef, unitIdx) => {
          updateProject((prev) => {
            const sheet =
              prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) ||
              prev.schematic.sheets[0];
            const nextRef = SchematicHelper.getNextReference(symDef.defaultPrefix, sheet.symbols);
            const uIndex = unitIdx !== undefined && unitIdx >= 0 ? unitIdx : 0;
            const chosenUnit = symDef.units && symDef.units.length > 0 ? (symDef.units[uIndex] || symDef.units[0]) : null;
            const pins = chosenUnit ? chosenUnit.pins : symDef.pins;
            const newSym = {
              id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              symbolDefId: symDef.id,
              reference: nextRef,
              value: symDef.name,
              footprint: symDef.defaultFootprint || '',
              x: 100,
              y: 80,
              rotation: 0 as any,
              mirrorX: false,
              unit: chosenUnit ? chosenUnit.unit : 1,
              unitSuffix: chosenUnit?.name,
              fields: { Description: symDef.description },
              pins: JSON.parse(JSON.stringify(pins)),
            };
            return {
              ...prev,
              schematic: {
                ...prev.schematic,
                sheets: prev.schematic.sheets.map((s) =>
                  s.id === sheet.id ? { ...s, symbols: [...s.symbols, newSym] } : s
                ),
              },
            };
          }, `Place ${symDef.name}${symDef.units && symDef.units.length > 1 ? ` (Unit ${symDef.units[unitIdx || 0]?.name || ''})` : ''}`);
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
          onOpenProject={(p) => {
            setProject(p);
            closeDashboard();
          }}
          onClose={closeDashboard}
          onOpenLibraryManager={() => {
            closeDashboard();
            setShowLibraryManager(true);
          }}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenCircuitLab={() => setShowCircuitLab(true)}
          onOpenAuthModal={() => setShowAuthModal(true)}
          onOpenPrivacyPolicy={() => setShowPrivacyModal(true)}
          onOpenTerms={() => setShowTermsModal(true)}
          onOpenAbout={() => setShowAboutModal(true)}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          project={project}
          onUpdateProject={updateProject}
          theme={theme}
          onSetTheme={handleSetTheme}
          onOpenAuthModal={() => {
            setShowSettingsModal(false);
            setShowAuthModal(true);
          }}
        />
      )}

      {showCircuitLab && (
        <LiveCircuitLab
          project={project}
          isOpen={showCircuitLab}
          onClose={() => setShowCircuitLab(false)}
        />
      )}

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(u) => {
            setUser(u);
            showToast(`Signed in as ${u.name}`);
          }}
        />
      )}

      {showAboutModal && (
        <AboutModal
          isOpen={showAboutModal}
          onClose={() => setShowAboutModal(false)}
        />
      )}

      {showPrivacyModal && (
        <PrivacyPolicyModal
          isOpen={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
        />
      )}

      {showTermsModal && (
        <TermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      {showThankYouModal && (
        <ThankYouModal
          isOpen={showThankYouModal}
          title={thankYouInfo.title}
          message={thankYouInfo.message}
          actionDetails={thankYouInfo.details}
          onClose={() => setShowThankYouModal(false)}
          onNavigateHome={() => {
            setShowThankYouModal(false);
            openDashboard();
          }}
        />
      )}

      <CookieConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyModal(true)} />

      {showHealthModal && (
        <ProjectHealthModal
          isOpen={showHealthModal}
          onClose={() => setShowHealthModal(false)}
          project={project}
          onUpdateProject={updateProject}
          onNavigateTab={(tab) => navigateToTab(tab)}
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
