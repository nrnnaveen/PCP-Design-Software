/**
 * FloZ ECA - Main Desktop Application Shell
 * Tabbed CAD workspace, menu bar, dockable tool panels, undo/redo manager, library manager, and cross-probing.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Logo } from '../components/branding/Logo';
import { SplashIntro } from '../components/branding/SplashIntro';
import { Landing } from '../pages/Landing';
import { Login } from '../pages/auth/Login';
import { Signup } from '../pages/auth/Signup';
import { Dashboard } from '../pages/Dashboard';
import { CommandPalette, CommandItem } from '../components/common/CommandPalette';

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
  Search,
  ExternalLink,
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
  ChevronDown,
  Check,
  FilePlus,
  Play,
  Terminal,
  HelpCircle,
  Wrench,
  Plus,
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
  showLanding: boolean;
  showLogin: boolean;
  showSignup: boolean;
}

function parseInitialRoute(): ParsedRoute {
  try {
    const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
    const path = pathname !== '/' ? pathname : hash ? `/${hash}` : '/';

    if (path === '/' || path === '/landing') {
      return { tab: 'schematic', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: true, showLogin: false, showSignup: false };
    }
    if (path === '/login') {
      return { tab: 'schematic', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: true, showSignup: false };
    }
    if (path === '/signup') {
      return { tab: 'schematic', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: true };
    }
    if (path === '/dashboard' || path === '/projects') {
      return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path === '/privacy') {
      return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: true, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path === '/terms') {
      return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: false, showTerms: true, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path.startsWith('/workspace/pcb') || path === '/pcb') {
      return { tab: 'pcb', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path.startsWith('/workspace/3d') || path === '/3d') {
      return { tab: '3d', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path.startsWith('/workspace/simulation') || path === '/simulation') {
      return { tab: 'simulation', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path.startsWith('/workspace/gerbview') || path === '/gerbview') {
      return { tab: 'gerbview', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path.startsWith('/workspace/calculator') || path === '/calculator') {
      return { tab: 'calculator', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    if (path.startsWith('/workspace/schematic') || path === '/workspace' || path === '/schematic') {
      return { tab: 'schematic', showDashboard: false, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
    }
    // Unknown path -> Custom 404
    return { tab: 'schematic', showDashboard: false, showNotFound: true, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
  } catch {
    return { tab: 'schematic', showDashboard: true, showNotFound: false, showPrivacy: false, showTerms: false, showLanding: false, showLogin: false, showSignup: false };
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
  const [showLanding, setShowLanding] = useState<boolean>(initialRoute.showLanding);
  const [showLogin, setShowLogin] = useState<boolean>(initialRoute.showLogin);
  const [showSignup, setShowSignup] = useState<boolean>(initialRoute.showSignup);
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
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
      setShowLanding(route.showLanding);
      setShowLogin(route.showLogin);
      setShowSignup(route.showSignup);
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
  // Right Panel State with URL override & responsive defaults
  const [rightPanel, setRightPanel] = useState<'properties' | 'erc' | 'drc' | 'ai'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('panel');
      if (p === 'erc' || p === 'drc' || p === 'ai' || p === 'properties') return p;
    }
    return 'properties';
  });

  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('right_panel') === 'collapsed' || params.get('panel') === 'none') return true;
      if (params.get('right_panel') === 'open') return false;
      if (window.innerWidth < 900) return true;
    }
    return false;
  });

  // Resizable Right Sidebar Width (Draggable Splitter)
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlW = params.get('panel_width');
        if (urlW) return parseInt(urlW, 10);
      }
      const saved = localStorage.getItem('floz_right_panel_width');
      if (saved) return Math.min(850, Math.max(260, parseInt(saved, 10)));
    } catch {}
    return 360;
  });
  const [isDraggingRightSplitter, setIsDraggingRightSplitter] = useState<boolean>(false);

  useEffect(() => {
    if (!isDraggingRightSplitter) return;
    const handleMouseMove = (e: MouseEvent) => {
      const maxW = Math.max(300, window.innerWidth - 320);
      const newWidth = Math.min(maxW, Math.max(260, window.innerWidth - e.clientX));
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

  // Top Menu Bar state (File, Edit, View, Project, Tools, Inspect, Help)
  const [activeMenu, setActiveMenu] = useState<'file' | 'edit' | 'view' | 'project' | 'tools' | 'inspect' | 'help' | null>(null);

  useEffect(() => {
    if (!activeMenu) return;
    const handleCloseMenu = () => setActiveMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [activeMenu]);

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

  // Global shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const commandList: CommandItem[] = useMemo(
    () => [
      { id: 'ws_schematic', title: 'Schematic Editor', category: 'Workspace', shortcut: 'F1', icon: Cpu, action: () => navigateToTab('schematic') },
      { id: 'ws_pcb', title: 'PCB Layout Editor', category: 'Workspace', shortcut: 'F2', icon: Layers, action: () => navigateToTab('pcb') },
      { id: 'ws_3d', title: '3D Board Viewer', category: 'Workspace', shortcut: 'F3', icon: Box, action: () => navigateToTab('3d') },
      { id: 'ws_simulation', title: 'SPICE Simulation & Oscilloscope', category: 'Workspace', shortcut: 'F4', icon: Activity, action: () => navigateToTab('simulation') },
      { id: 'ws_gerbview', title: 'Gerber & Drill Vector Viewer', category: 'Workspace', shortcut: 'F5', icon: FileCode, action: () => navigateToTab('gerbview') },
      { id: 'ws_calculator', title: 'Impedance & Trace Calculators', category: 'Workspace', shortcut: 'F6', icon: Calculator, action: () => navigateToTab('calculator') },
      { id: 'act_dashboard', title: 'Start Window / Solution Hub', category: 'Project', shortcut: 'Ctrl+O', icon: LayoutDashboard, action: openDashboard },
      { id: 'act_new', title: 'New Blank Solution...', category: 'Project', icon: Plus, action: () => { openDashboard(); } },
      { id: 'act_drc', title: 'Run Design Rule Check (DRC)', category: 'Tool', icon: ShieldCheck, action: () => { setRightPanel('drc'); setRightPanelCollapsed(false); } },
      { id: 'act_erc', title: 'Run Electrical Rule Check (ERC)', category: 'Tool', icon: ShieldAlert, action: () => { setRightPanel('erc'); setRightPanelCollapsed(false); } },
      { id: 'act_mfg', title: 'Export Gerber Package ZIP', category: 'Tool', shortcut: 'Ctrl+E', icon: Download, action: () => setShowMfgModal(true) },
      { id: 'act_lib', title: 'Component Library Manager', category: 'Tool', icon: Package, action: () => setShowLibraryManager(true) },
      { id: 'act_stackup', title: 'Board Stackup & Physical Specs', category: 'Tool', icon: Sliders, action: () => setShowSettingsModal(true) },
      { id: 'act_health', title: 'Project Health & Diagnostics', category: 'Tool', icon: ShieldCheck, action: () => setShowHealthModal(true) },
      { id: 'act_missing', title: 'Missing Asset Resolver', category: 'Tool', icon: Wrench, action: () => setShowMissingAssetsModal(true) },
      { id: 'act_theme', title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`, category: 'System', icon: theme === 'dark' ? Sun : Moon, action: () => handleSetTheme(theme === 'dark' ? 'light' : 'dark') },
      { id: 'act_settings', title: 'CAD Workspace Settings...', category: 'System', icon: SettingsIcon, action: () => setShowSettingsModal(true) },
      { id: 'act_landing', title: 'Public Product Landing Page', category: 'System', icon: ExternalLink, action: () => setShowLanding(true) },
    ],
    [theme]
  );

  if (showLanding) {
    return (
      <div className="h-screen w-screen flex flex-col bg-cad-bg text-cad-text">
        <SplashIntro />
        <Landing
          onOpenWorkspace={() => {
            setShowLanding(false);
            setShowProjectManager(false);
            navigateToTab('schematic');
          }}
          onOpenDashboard={() => {
            setShowLanding(false);
            openDashboard();
          }}
          onOpenGuest={() => {
            AuthService.loginAsGuest();
            setShowLanding(false);
            setShowProjectManager(false);
            navigateToTab('schematic');
          }}
          onOpenLogin={() => {
            setShowLanding(false);
            setShowLogin(true);
            if (window.location.protocol !== 'file:') {
              window.history.pushState(null, '', '/login');
            }
          }}
          onOpenSignup={() => {
            setShowLanding(false);
            setShowSignup(true);
            if (window.location.protocol !== 'file:') {
              window.history.pushState(null, '', '/signup');
            }
          }}
          onOpenPrivacyPolicy={() => setShowPrivacyModal(true)}
          onOpenTerms={() => setShowTermsModal(true)}
          onOpenAbout={() => setShowAboutModal(true)}
        />
        {showPrivacyModal && (
          <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
        )}
        {showTermsModal && (
          <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        )}
        {showAboutModal && (
          <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
        )}
        <CookieConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyModal(true)} />
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="h-screen w-screen flex flex-col bg-cad-bg text-cad-text">
        <Login
          onAuthSuccess={(u) => {
            setUser(u);
            setShowLogin(false);
            openDashboard();
          }}
          onSwitchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
          onContinueAsGuest={() => {
            AuthService.loginAsGuest();
            setShowLogin(false);
            openDashboard();
          }}
          onNavigateHome={() => {
            setShowLogin(false);
            setShowLanding(true);
          }}
        />
        <CookieConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyModal(true)} />
      </div>
    );
  }

  if (showSignup) {
    return (
      <div className="h-screen w-screen flex flex-col bg-cad-bg text-cad-text">
        <Signup
          onAuthSuccess={(u) => {
            setUser(u);
            setShowSignup(false);
            openDashboard();
          }}
          onSwitchToLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
          onContinueAsGuest={() => {
            AuthService.loginAsGuest();
            setShowSignup(false);
            openDashboard();
          }}
          onNavigateHome={() => {
            setShowSignup(false);
            setShowLanding(true);
          }}
        />
        <CookieConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyModal(true)} />
      </div>
    );
  }

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

  if (showProjectManager) {
    return (
      <div className="h-screen w-screen flex flex-col bg-cad-bg text-cad-text">
        <Dashboard
          currentProject={project}
          onOpenProject={(p) => {
            setProject(p);
            updateProject(() => p, 'Load Project');
          }}
          onOpenWorkspaceTab={(tab) => {
            navigateToTab(tab);
          }}
          onOpenLanding={() => {
            setShowProjectManager(false);
            setShowLanding(true);
            if (window.location.protocol !== 'file:') {
              window.history.pushState(null, '', '/landing');
            }
          }}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenLibraryManager={() => {
            setShowProjectManager(false);
            setShowLibraryManager(true);
          }}
          onOpenCircuitLab={() => setShowCircuitLab(true)}
          onOpenAuthModal={() => setShowAuthModal(true)}
          theme={theme}
          onToggleTheme={() => handleSetTheme(theme === 'dark' ? 'light' : 'dark')}
        />
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
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onAuthSuccess={(u) => {
              setUser(u);
              setShowAuthModal(false);
            }}
          />
        )}
        {showCircuitLab && (
          <LiveCircuitLab
            isOpen={showCircuitLab}
            onClose={() => setShowCircuitLab(false)}
            project={project}
          />
        )}
        {showPrivacyModal && (
          <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
        )}
        {showTermsModal && (
          <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        )}
        {showAboutModal && (
          <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
        )}
        <CookieConsentBanner onOpenPrivacyPolicy={() => setShowPrivacyModal(true)} />
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-cad-bg text-cad-text select-none overflow-hidden font-sans">
      <SplashIntro />
      {/* 1. Desktop Application Menu Bar */}
      <div className="h-7 bg-cad-header border-b border-cad-border px-2 flex items-center justify-between text-xs select-none z-50 shrink-0 min-w-0">
        <div className="flex items-center space-x-0.5">
          {/* Brand Mark */}
          <div
            onClick={openDashboard}
            className="flex items-center px-1.5 py-0.5 rounded-xs hover:bg-cad-surfaceHover cursor-pointer transition-colors duration-fast mr-1"
            title="FloZ ECA Start Window (Ctrl+O)"
          >
            <Logo size="sm" />
          </div>

          {/* Menu Dropdowns */}
          {[
            {
              id: 'file',
              label: 'File',
              items: [
                { label: 'Start Window / Projects...', icon: LayoutDashboard, shortcut: 'Ctrl+O', action: openDashboard },
                {
                  label: 'Save Project',
                  icon: Save,
                  shortcut: 'Ctrl+S',
                  action: () => {
                    ProjectSerializer.exportToFile(project);
                    showToast('Project Exported to Disk');
                  },
                },
                { type: 'separator' },
                {
                  label: 'Export Gerber Package ZIP...',
                  icon: Download,
                  shortcut: 'Ctrl+E',
                  action: () => setShowMfgModal(true),
                },
                { type: 'separator' },
                { label: 'Project Settings...', icon: SettingsIcon, action: () => setShowSettingsModal(true) },
              ],
            },
            {
              id: 'edit',
              label: 'Edit',
              items: [
                { label: 'Undo', icon: Undo2, shortcut: 'Ctrl+Z', disabled: !transactionMgr.canUndo(), action: handleUndo },
                { label: 'Redo', icon: Redo2, shortcut: 'Ctrl+Y', disabled: !transactionMgr.canRedo(), action: handleRedo },
                { type: 'separator' },
                { label: 'Preferences...', icon: SettingsIcon, action: () => setShowSettingsModal(true) },
              ],
            },
            {
              id: 'view',
              label: 'View',
              items: [
                { label: 'Schematic Capture', icon: FileText, shortcut: 'F2', action: () => navigateToTab('schematic') },
                { label: 'PCB Layout Editor', icon: Layers, shortcut: 'F3', action: () => navigateToTab('pcb') },
                { label: '3D Board Viewer', icon: Box, shortcut: 'F4', action: () => navigateToTab('3d') },
                { label: 'SPICE Simulation', icon: Activity, shortcut: 'F5', action: () => navigateToTab('simulation') },
                { label: 'Gerber RS-274X Viewer', icon: FileCode, shortcut: 'F6', action: () => navigateToTab('gerbview') },
                { label: 'PCB Calculators', icon: Calculator, shortcut: 'F7', action: () => navigateToTab('calculator') },
                { type: 'separator' },
                {
                  label: 'Toggle Properties Inspector',
                  icon: Sliders,
                  action: () => {
                    setRightPanel('properties');
                    setRightPanelCollapsed((prev) => !prev);
                  },
                },
                {
                  label: 'Toggle Electrical Rules (ERC)',
                  icon: AlertTriangle,
                  action: () => {
                    setRightPanel('erc');
                    setRightPanelCollapsed((prev) => !prev);
                  },
                },
                {
                  label: 'Toggle Design Rules (DRC)',
                  icon: ShieldAlert,
                  action: () => {
                    setRightPanel('drc');
                    setRightPanelCollapsed((prev) => !prev);
                  },
                },
              ],
            },
            {
              id: 'project',
              label: 'Project',
              items: [
                { label: 'Synchronize PCB from Schematic', icon: RefreshCw, shortcut: 'F8', action: handleSyncPCB },
                { label: 'Project Health & Verification...', icon: ShieldCheck, action: () => setShowHealthModal(true) },
                { label: 'Missing Assets Resolver...', icon: AlertCircle, action: () => setShowMissingAssetsModal(true) },
                { type: 'separator' },
                { label: 'Component Library Manager...', icon: Layers, action: () => setShowLibraryManager(true) },
                { label: 'Footprint Assignment Table...', icon: Cpu, action: () => setShowFootprintAssignment(true) },
              ],
            },
            {
              id: 'tools',
              label: 'Tools',
              items: [
                { label: 'Live Circuit Lab (Embedded Testing)...', icon: Activity, action: () => setShowCircuitLab(true) },
                { label: 'Symbol Chooser...', icon: Plus, action: () => setShowSymbolChooser(true) },
                { label: 'PCB Impedance Calculators...', icon: Calculator, action: () => navigateToTab('calculator') },
              ],
            },
            {
              id: 'inspect',
              label: 'Inspect',
              items: [
                {
                  label: 'Run Electrical Rules Check (ERC)',
                  icon: AlertTriangle,
                  action: () => {
                    setRightPanel('erc');
                    setRightPanelCollapsed(false);
                  },
                },
                {
                  label: 'Run PCB Design Rules Check (DRC)',
                  icon: ShieldAlert,
                  action: () => {
                    setRightPanel('drc');
                    setRightPanelCollapsed(false);
                  },
                },
              ],
            },
            {
              id: 'help',
              label: 'Help',
              items: [
                { label: 'Command Palette...', icon: Terminal, shortcut: 'Ctrl+K', action: () => setShowCommandPalette(true) },
                { label: 'Product Landing Page...', icon: ExternalLink, action: () => setShowLanding(true) },
                { type: 'separator' },
                { label: 'About FloZ ECA...', icon: Info, action: () => setShowAboutModal(true) },
                { label: 'Privacy Policy...', icon: ShieldCheck, action: () => setShowPrivacyModal(true) },
                { label: 'Terms of Service...', icon: FileText, action: () => setShowTermsModal(true) },
              ],
            },
          ].map((menu) => (
            <div key={menu.id} className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenu(activeMenu === menu.id ? null : (menu.id as any));
                }}
                onMouseEnter={() => {
                  if (activeMenu) setActiveMenu(menu.id as any);
                }}
                className={`px-2 py-0.5 rounded-xs text-[11px] font-medium transition-colors duration-fast ${
                  activeMenu === menu.id
                    ? 'bg-cad-surfaceActive text-cad-textHeading'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                {menu.label}
              </button>

              {activeMenu === menu.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute left-0 top-full mt-0.5 w-60 bg-cad-panel border border-cad-border rounded-sm shadow-lg py-0.5 z-50 text-[11px] font-sans animate-in fade-in zoom-in-95 duration-75"
                >
                  {menu.items.map((item: any, idx) => {
                    if (item.type === 'separator') {
                      return <div key={idx} className="h-px bg-cad-border my-0.5" />;
                    }
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        disabled={item.disabled}
                        onClick={() => {
                          setActiveMenu(null);
                          if (item.action) item.action();
                        }}
                        className="w-full px-2.5 py-1 text-left flex items-center justify-between hover:bg-blue-600 hover:text-white transition-colors duration-fast text-cad-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-cad-text"
                      >
                        <span className="flex items-center gap-2 truncate">
                          {Icon && <Icon size={12} className="shrink-0" />}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.shortcut && (
                          <span className="text-[10px] opacity-60 font-mono ml-2 shrink-0">{item.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Application Actions */}
        <div className="flex items-center space-x-1 font-mono text-[11px]">
          <span className="text-cad-textHeading font-semibold truncate max-w-[180px] sm:max-w-xs">{project.metadata.name}</span>
          <span className="text-cad-textMuted text-[10px]">v{project.metadata.version}</span>
        </div>
      </div>

      {/* 2. Workstation Tab Bar & Quick Controls */}
      <header className="h-8 bg-cad-panel border-b border-cad-border px-2 flex items-center justify-between text-xs select-none shrink-0 min-w-0 overflow-x-auto no-scrollbar">
        {/* Workstation Tab Switcher */}
        <div className="flex items-center h-full shrink-0">
          {[
            { id: 'schematic', label: 'Schematic Capture', icon: FileText },
            { id: 'pcb', label: 'PCB Layout', icon: Layers },
            { id: '3d', label: '3D Board Viewer', icon: Box },
            { id: 'simulation', label: 'SPICE Sim', icon: Activity },
            { id: 'gerbview', label: 'Gerber Viewer', icon: FileCode },
            { id: 'calculator', label: 'Calculators', icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigateToTab(tab.id as WorkspaceTab)}
                className={`h-full px-3 text-xs font-medium flex items-center gap-1.5 transition-colors duration-fast border-b-2 border-r border-cad-border/30 shrink-0 ${
                  isActive
                    ? 'bg-cad-bg text-cad-textHeading border-b-blue-600 font-semibold'
                    : 'text-cad-textMuted border-b-transparent hover:text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-cad-textMuted'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          {/* Quick Save */}
          <button
            onClick={() => {
              ProjectSerializer.exportToFile(project);
              showToast('Project Exported');
            }}
            title="Save Project (Ctrl+S)"
            aria-label="Save Project (Ctrl+S)"
            className="p-1.5 hover:bg-cad-surfaceHover rounded-xs text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
          >
            <Save size={13} />
          </button>

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={!transactionMgr.canUndo()}
            title="Undo (Ctrl+Z)"
            aria-label="Undo (Ctrl+Z)"
            className="p-1.5 hover:bg-cad-surfaceHover rounded-xs disabled:opacity-30 text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
          >
            <Undo2 size={13} />
          </button>

          <button
            onClick={handleRedo}
            disabled={!transactionMgr.canRedo()}
            title="Redo (Ctrl+Y)"
            aria-label="Redo (Ctrl+Y)"
            className="p-1.5 hover:bg-cad-surfaceHover rounded-xs disabled:opacity-30 text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
          >
            <Redo2 size={13} />
          </button>

          <div className="h-3.5 w-px bg-cad-border mx-1" />

          {/* Command Palette Trigger */}
          <button
            onClick={() => setShowCommandPalette(true)}
            title="Open Command Palette (Ctrl+K)"
            aria-label="Open Command Palette (Ctrl+K)"
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-cad-textMuted hover:text-cad-text text-[11px] font-mono transition-colors duration-fast"
          >
            <Search size={11} />
            <span className="hidden md:inline">Commands</span>
            <kbd className="text-[9px] bg-cad-panel px-1 py-0.2 rounded-xs border border-cad-border">⌘K</kbd>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => handleSetTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="p-1.5 hover:bg-cad-surfaceHover rounded-xs text-cad-text hover:text-cad-textHeading transition-colors duration-fast flex items-center justify-center focus-visible:outline-none"
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-blue-600" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Preferences & Settings"
            aria-label="Preferences & Settings"
            className="p-1.5 hover:bg-cad-surfaceHover rounded-xs text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
          >
            <SettingsIcon size={13} />
          </button>

          {/* User Account */}
          <button
            onClick={() => {
              if (user.isGuest) {
                setShowAuthModal(true);
              } else {
                setShowSettingsModal(true);
              }
            }}
            title={user.isGuest ? 'Guest Mode (Click to Sign In)' : `Logged in as ${user.name}`}
            aria-label={user.isGuest ? 'Guest Mode (Click to Sign In)' : `Logged in as ${user.name}`}
            className="px-2 py-0.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors duration-fast"
          >
            <UserIcon size={11} className={user.isGuest ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
            <span className="truncate max-w-[80px]">{user.isGuest ? 'Guest' : user.name}</span>
          </button>
        </div>
      </header>

      {/* 3. Workspace Sub-Toolbar */}
      <div className="h-7.5 bg-cad-header border-b border-cad-border px-2 flex items-center justify-between text-xs select-none shrink-0 min-w-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1 shrink-0">
          {/* Sync PCB */}
          <button
            onClick={handleSyncPCB}
            title="Update PCB from Schematic (F8)"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors duration-fast"
          >
            <RefreshCw size={11} className="text-blue-600 dark:text-blue-400" />
            <span>Sync PCB (F8)</span>
          </button>

          <div className="h-3.5 w-px bg-cad-border mx-0.5" />

          {/* Libraries */}
          <button
            onClick={() => setShowLibraryManager(true)}
            title="Open Component Library Manager"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors duration-fast"
          >
            <Layers size={11} className="text-emerald-600 dark:text-emerald-400" />
            <span>Libraries</span>
          </button>

          {/* Footprints */}
          <button
            onClick={() => setShowFootprintAssignment(true)}
            title="Assign Footprints to Components"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-[11px] font-medium flex items-center gap-1.5 border border-cad-border transition-colors duration-fast"
          >
            <Cpu size={11} className="text-amber-600 dark:text-amber-400" />
            <span>Footprints</span>
          </button>

          {/* Missing Assets Scan */}
          {(() => {
            const scan = AssetResolver.scanProject(project);
            return (
              <button
                onClick={() => setShowMissingAssetsModal(true)}
                title="Scan and resolve missing symbols or footprints"
                className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1.5 border transition-colors duration-fast ${
                  scan.missingCount > 0
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25 font-semibold'
                    : 'bg-cad-panel text-cad-text border-cad-border hover:bg-cad-surfaceHover'
                }`}
              >
                <AlertCircle size={11} className={scan.missingCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-cad-textMuted'} />
                <span>Assets</span>
                {scan.missingCount > 0 && (
                  <span className="px-1 py-0.1 bg-amber-500 text-slate-950 font-bold text-[9px] rounded-xs font-mono">
                    {scan.missingCount}
                  </span>
                )}
              </button>
            );
          })()}

          <div className="h-3.5 w-px bg-cad-border mx-0.5" />

          {/* Export Gerber Package */}
          <button
            onClick={() => setShowMfgModal(true)}
            title="Generate RS-274X Gerber & Drill Package"
            className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xs text-[11px] font-medium flex items-center gap-1.5 transition-colors duration-fast"
          >
            <Download size={11} />
            <span>Export Gerber ZIP</span>
          </button>
        </div>

        {/* Right Dock Switcher Toolbar */}
        <div className="flex items-center space-x-0.5 bg-cad-subpanel p-0.5 rounded-xs border border-cad-border shrink-0 ml-2">
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
            className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1 transition-colors duration-fast ${
              !rightPanelCollapsed && rightPanel === 'properties'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-cad-text hover:bg-cad-surfaceHover'
            }`}
          >
            <Sliders size={11} />
            <span>Inspector</span>
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
            title="Electrical Rules Check (ERC)"
            className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1 transition-colors duration-fast ${
              !rightPanelCollapsed && rightPanel === 'erc'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-cad-text hover:bg-cad-surfaceHover'
            }`}
          >
            <AlertTriangle size={11} />
            <span>ERC</span>
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
            title="Design Rules Check (DRC)"
            className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1 transition-colors duration-fast ${
              !rightPanelCollapsed && rightPanel === 'drc'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-cad-text hover:bg-cad-surfaceHover'
            }`}
          >
            <ShieldAlert size={11} />
            <span>DRC</span>
          </button>

        </div>
      </div>

      {/* 4. Central Working Area */}
      <main className="flex-1 flex overflow-hidden relative min-w-0 min-h-0">
        {/* Editor Area */}
        <div className="flex-1 h-full relative min-w-0 min-h-0 flex flex-col overflow-hidden">
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
        </div>

        {/* Right Dock Panel (Fluidly Resizable Width) */}
        {!rightPanelCollapsed && activeTab !== 'simulation' && activeTab !== 'gerbview' && activeTab !== 'calculator' && (
          <aside
            style={{
              width: `${Math.min(
                Math.max(260, rightPanelWidth),
                Math.max(280, typeof window !== 'undefined' ? window.innerWidth - 300 : 500)
              )}px`,
            }}
            className="h-full flex flex-col relative shrink-0 select-none bg-cad-panel border-l border-cad-border min-w-0 overflow-hidden"
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
            {rightPanel === 'erc' && (
              <ERCPanel
                project={project}
                onAskFloZAI={(_query) => {
                  setRightPanel('ai');
                  setRightPanelCollapsed(false);
                }}
              />
            )}
            {rightPanel === 'drc' && (
              <DRCPanel
                project={project}
                onAskFloZAI={(_query) => {
                  setRightPanel('ai');
                  setRightPanelCollapsed(false);
                }}
              />
            )}
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

      {/* 5. Bottom Status Bar */}
      <footer className="h-6 bg-cad-header border-t border-cad-border px-3 flex items-center justify-between text-[11px] text-cad-textMuted font-mono select-none shrink-0 min-w-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-4 shrink-0">
          <span className="text-cad-text font-medium">Units: {project.metadata.units}</span>
          <span>Grid: 0.5mm / 20mil</span>
          <span>Components: {project.pcb.footprints.length}</span>
          <span>Nets: {Object.keys(project.netGraph.nets).length}</span>
          <span>Tracks: {project.pcb.tracks.length}</span>
          <span>Vias: {project.pcb.vias.length}</span>
        </div>

        <div className="flex items-center space-x-4 shrink-0 ml-4">
          <span>Sheet: 1/1</span>
          <span>Layer: F.Cu</span>
        </div>
      </footer>

      {/* Toast Popup */}
      {toastMsg && (
        <div className="fixed bottom-8 right-5 bg-cad-panel text-cad-text border border-cad-border px-3 py-1.5 rounded-xs shadow-md text-xs font-medium z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-100 font-mono">
          <CheckCircle2 size={13} className="text-emerald-500" />
          <span>{toastMsg}</span>
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

      {/* Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commandList}
      />
    </div>
  );
};
