/**
 * FloZ EDA - Application Settings Modal
 * Comprehensive configuration for Appearance, Account, Editor, AI, and Storage Preferences.
 */

import React, { useState, useEffect } from 'react';
import { ApexProject } from '../core/types';
import { AuthService, User } from '../core/auth';
import { secureStorage } from '../core/secureStorage';
import {
  Settings,
  Sun,
  Moon,
  User as UserIcon,
  Sliders,
  Sparkles,
  Database,
  RotateCcw,
  Check,
  X,
  LogOut,
  LogIn,
  Layers,
} from 'lucide-react';
import { AppThemeId, AVAILABLE_THEMES } from '../theme/themeManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project: ApexProject;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  theme: AppThemeId;
  onSetTheme: (theme: AppThemeId) => void;
  onOpenAuthModal?: () => void;
}

type SettingsTab = 'appearance' | 'account' | 'editor' | 'ai' | 'application';

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  theme,
  onSetTheme,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [user, setUser] = useState<User>(() => AuthService.getUser());

  // Editor settings state (synced with project settings & localStorage)
  const [schematicGrid, setSchematicGrid] = useState<number>(project.settings.gridSpacingSchematic || 2.54);
  const [pcbGrid, setPcbGrid] = useState<number>(project.settings.gridSpacingPCB || 0.5);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(project.settings.snapToGrid !== false);
  const [defaultUnits, setDefaultUnits] = useState<'mm' | 'mil'>(
    project.metadata.units === 'inch' ? 'mil' : project.metadata.units || 'mm'
  );

  // AI settings
  const [aiProvider, setAiProvider] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('floz_ai_provider');
      return saved || 'floz_local';
    } catch {
      return 'floz_local';
    }
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('floz_ai_model');
      return saved || 'claude-3-5-sonnet';
    } catch {
      return 'claude-3-5-sonnet';
    }
  });
  const [apiKey, setApiKey] = useState<string>('');

  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    secureStorage.getItem('floz_ai_api_key').then((k) => {
      if (k) setApiKey(k);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSaveEditorSettings = () => {
    onUpdateProject((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        units: defaultUnits,
      },
      settings: {
        ...prev.settings,
        gridSpacingSchematic: schematicGrid,
        gridSpacingPCB: pcbGrid,
        snapToGrid: snapEnabled,
      },
    }), 'Update Editor Preferences');
    showSavedNotification();
  };

  const handleSaveAISettings = () => {
    localStorage.setItem('floz_ai_provider', aiProvider);
    localStorage.setItem('floz_ai_model', aiModel);
    if (apiKey) {
      secureStorage.setItem('floz_ai_api_key', apiKey);
    } else {
      secureStorage.removeItem('floz_ai_api_key');
    }
    showSavedNotification();
  };

  const handleResetPreferences = () => {
    if (confirm('Are you sure you want to reset all preferences to default values?')) {
      onSetTheme('dark');
      setSchematicGrid(2.54);
      setPcbGrid(0.5);
      setSnapEnabled(true);
      setDefaultUnits('mm');
      setAiProvider('floz_local');
      setAiModel('claude-3-5-sonnet');
      setApiKey('');
      localStorage.removeItem('floz_ai_provider');
      localStorage.removeItem('floz_ai_model');
      secureStorage.removeItem('floz_ai_api_key');
      showSavedNotification();
    }
  };

  const showSavedNotification = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md select-none p-4">
      <div className="bg-cad-panel border border-cad-border w-[760px] max-w-full h-[540px] max-h-full rounded-xl shadow-2xl overflow-hidden flex flex-col text-cad-text">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings size={16} className="text-blue-500 dark:text-blue-400" />
            <span className="font-bold text-sm text-cad-text">Preferences & Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-cad-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <div className="w-48 border-r border-cad-border bg-cad-bg/40 p-2.5 space-y-1">
            {[
              { id: 'appearance', label: 'Appearance', icon: Sun },
              { id: 'account', label: 'Account', icon: UserIcon },
              { id: 'editor', label: 'Editor & Grid', icon: Sliders },
              { id: 'ai', label: 'AI Copilot', icon: Sparkles },
              { id: 'application', label: 'Application', icon: Database },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-subpanel'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 p-5 overflow-y-auto bg-cad-bg/20">
            {/* 1. Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider mb-1">
                    Theme & Color Palette
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Select your preferred visual style for schematic, layout, and CAD tool panels.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                  {AVAILABLE_THEMES.map((th) => {
                    const isSelected = theme === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() => onSetTheme(th.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cad-subpanel border-blue-500 ring-2 ring-blue-500/30'
                            : 'bg-cad-panel hover:bg-cad-subpanel border-cad-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 font-bold text-xs text-cad-text">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-cad-border"
                              style={{ backgroundColor: th.previewColor }}
                            />
                            {th.name}
                          </div>
                          {isSelected && <Check size={14} className="text-blue-500" />}
                        </div>
                        <p className="text-[11px] text-cad-textMuted">{th.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider mb-1">
                    User Session & Profile
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Manage your current engineering user identity and workspace mode.
                  </p>
                </div>

                <div className="p-4 bg-cad-panel rounded-xl border border-cad-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-500 dark:text-blue-400 font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-cad-text flex items-center gap-2">
                          {user.name}
                          {user.isGuest ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 text-[10px] font-mono">
                              Guest Mode
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-[10px] font-mono">
                              Authenticated
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-cad-textMuted font-mono">{user.email}</div>
                      </div>
                    </div>

                    {user.isGuest ? (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAuthModal?.();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <LogIn size={13} />
                        Sign In
                      </button>
                    ) : (
                      <button
                        onClick={() => AuthService.logout()}
                        className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-border border border-cad-border text-cad-text rounded text-xs font-semibold flex items-center gap-1.5"
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-cad-textMuted pt-2 border-t border-cad-border">
                    {user.isGuest
                      ? 'You are in Guest Mode. All design files are safely saved in your browser local storage.'
                      : 'You are signed in. Your profile is linked to local projects and workspace presets.'}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Editor & Grid Tab */}
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider mb-1">
                    CAD Grid & Geometry Preferences
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Customize editor snapping, routing grid increments, and default measurement units.
                  </p>
                </div>

                <div className="space-y-3 bg-cad-panel p-4 rounded-xl border border-cad-border text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-cad-text font-medium mb-1">Schematic Grid (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={schematicGrid}
                        onChange={(e) => setSchematicGrid(parseFloat(e.target.value) || 2.54)}
                        className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-cad-text font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-cad-text font-medium mb-1">PCB Layout Grid (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={pcbGrid}
                        onChange={(e) => setPcbGrid(parseFloat(e.target.value) || 0.5)}
                        className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-cad-text font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-cad-text font-medium mb-1">Default Unit System</label>
                      <select
                        value={defaultUnits}
                        onChange={(e) => setDefaultUnits(e.target.value as 'mm' | 'mil')}
                        className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-cad-text font-mono"
                      >
                        <option value="mm">Metric (mm)</option>
                        <option value="mil">Imperial (mil / thou)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="snap_grid_check"
                        checked={snapEnabled}
                        onChange={(e) => setSnapEnabled(e.target.checked)}
                        className="rounded border-cad-border"
                      />
                      <label htmlFor="snap_grid_check" className="text-cad-text font-medium cursor-pointer">
                        Enable Magnetic Grid Snapping
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-cad-border flex justify-end">
                    <button
                      onClick={handleSaveEditorSettings}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-sm flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      Save Editor Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. AI Copilot Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider mb-1">
                    AI EDA Copilot Configuration
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Select your AI synthesis backend provider and API authentication keys.
                  </p>
                </div>

                <div className="space-y-3 bg-cad-panel p-4 rounded-xl border border-cad-border text-xs">
                  <div>
                    <label className="block text-cad-text font-medium mb-1">Inference Provider</label>
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value)}
                      className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-cad-text font-mono"
                    >
                      <option value="floz_local">FloZ Local Rule-Based Engine (Offline / Instant)</option>
                      <option value="openrouter">OpenRouter API (Cloud Multi-Model)</option>
                      <option value="ollama">Ollama Local LLM (localhost:11434)</option>
                    </select>
                  </div>

                  {aiProvider === 'openrouter' && (
                    <>
                      <div>
                        <label className="block text-cad-text font-medium mb-1">OpenRouter Model</label>
                        <input
                          type="text"
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          placeholder="anthropic/claude-3.5-sonnet"
                          className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-cad-text font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-cad-text font-medium mb-1">OpenRouter API Key</label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="sk-or-v1-..."
                          className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-cad-text font-mono"
                        />
                        <span className="text-[10px] text-cad-textMuted mt-1 block">
                          Your key is stored securely in your browser session using AES-GCM encryption.
                        </span>
                      </div>
                    </>
                  )}

                  <div className="pt-3 border-t border-cad-border flex justify-end">
                    <button
                      onClick={handleSaveAISettings}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow-sm flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      Save AI Settings
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Application Tab */}
            {activeTab === 'application' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider mb-1">
                    System Information & Diagnostics
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Build versions, local storage cache statistics, and preference management.
                  </p>
                </div>

                <div className="p-4 bg-cad-panel rounded-xl border border-cad-border space-y-3 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-cad-border">
                    <span className="text-cad-textMuted">Application Name:</span>
                    <span className="font-bold text-cad-text">FloZ EDA (Electronic Circuit Architect)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cad-border">
                    <span className="text-cad-textMuted">Version:</span>
                    <span className="text-cad-text">v1.0.0 Production Hardened</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cad-border">
                    <span className="text-cad-textMuted">Project Footprints:</span>
                    <span className="text-cad-text">{project.pcb.footprints.length} loaded</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cad-border">
                    <span className="text-cad-textMuted">Electrical Nets:</span>
                    <span className="text-cad-text">{Object.keys(project.netGraph.nets).length} nets</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleResetPreferences}
                    className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 dark:text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw size={14} />
                    Reset All Preferences to Factory Defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer notification */}
        {savedNotice && (
          <div className="h-8 bg-emerald-600 text-white text-xs font-semibold px-4 flex items-center justify-between animate-fadeIn">
            <span>Preferences saved successfully.</span>
            <Check size={14} />
          </div>
        )}
      </div>
    </div>
  );
};
