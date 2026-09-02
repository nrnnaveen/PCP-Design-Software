/**
 * FloZ ECA — Microsoft Fluent Application Settings & Preferences Dialog
 * Manages UI themes, CAD grids, hotkey shortcuts, AI API keys, and workspace telemetry.
 */

import React, { useState, useEffect } from 'react';
import { ApexProject } from '../core/types';
import { AppThemeId, AVAILABLE_THEMES } from '../theme/themeManager';
import { AuthService, User } from '../core/auth';
import {
  Settings,
  X,
  Sliders,
  Sparkles,
  Database,
  Check,
  RotateCcw,
  Sun,
  User as UserIcon,
  LogOut,
  Save,
  Key,
  Shield,
  Eye,
  EyeOff,
  Cpu,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  project?: ApexProject;
  onUpdateProject?: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
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

  // Grid & Snapping State
  const [gridSpacing, setGridSpacing] = useState<number>(() => {
    return parseFloat(localStorage.getItem('floz_grid_spacing') || '2.54');
  });
  const [snapEnabled, setSnapEnabled] = useState<boolean>(() => {
    return localStorage.getItem('floz_snap_enabled') !== 'false';
  });
  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(() => {
    return parseInt(localStorage.getItem('floz_autosave_interval') || '30', 10);
  });

  // AI Provider & API Key State
  const [aiProvider, setAiProvider] = useState<string>(() => {
    return localStorage.getItem('floz_ai_provider') || 'local';
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem('floz_ai_model') || 'anthropic/claude-3.5-sonnet';
  });
  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    return localStorage.getItem('floz_ai_api_key') || '';
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    const unsub = AuthService.subscribe((u) => setUser(u));
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSaveEditorSettings = () => {
    localStorage.setItem('floz_grid_spacing', gridSpacing.toString());
    localStorage.setItem('floz_snap_enabled', snapEnabled.toString());
    localStorage.setItem('floz_autosave_interval', autoSaveInterval.toString());
    showSavedNotification();
  };

  const handleSaveAISettings = () => {
    localStorage.setItem('floz_ai_provider', aiProvider);
    localStorage.setItem('floz_ai_model', aiModel);
    localStorage.setItem('floz_ai_api_key', aiApiKey);
    showSavedNotification();
  };

  const showSavedNotification = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="settings-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop select-none p-4"
    >
      <div className="bg-cad-panel border border-cad-border w-[760px] max-w-full h-[520px] max-h-full rounded-sm shadow-xl overflow-hidden flex flex-col text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-9 bg-cad-header border-b border-cad-border px-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings size={14} className="text-blue-600 dark:text-blue-400" />
            <h2 id="settings-dialog-title" className="font-semibold text-xs sm:text-sm text-cad-textHeading">
              Preferences &amp; Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <nav
            aria-label="Settings categories"
            className="w-44 border-r border-cad-border bg-cad-subpanel p-1.5 space-y-0.5 shrink-0"
          >
            {[
              { id: 'appearance', label: 'Appearance', icon: Sun },
              { id: 'account', label: 'Account', icon: UserIcon },
              { id: 'editor', label: 'Editor & Grid', icon: Sliders },
              { id: 'ai', label: 'AI Inference', icon: Sparkles },
              { id: 'application', label: 'Application', icon: Database },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as SettingsTab)}
                  className={`w-full px-2 py-1 rounded-xs text-xs font-medium flex items-center gap-2 transition-colors duration-fast focus-visible:outline-none ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-cad-text hover:bg-cad-surfaceHover'
                  }`}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Tab Content */}
          <main className="flex-1 p-4 overflow-y-auto bg-cad-bg">
            {/* 1. Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-3 max-w-xl">
                <div>
                  <h3 className="text-xs font-semibold text-cad-textHeading uppercase font-mono tracking-wider mb-0.5">
                    Theme &amp; Color Palette
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Select your preferred visual style for schematic, layout, and CAD tool panels.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {AVAILABLE_THEMES.map((th) => {
                    const isSelected = theme === th.id;
                    return (
                      <div
                        key={th.id}
                        onClick={() => onSetTheme(th.id)}
                        className={`p-2.5 rounded-xs border cursor-pointer transition-colors duration-fast ${
                          isSelected
                            ? 'bg-cad-subpanel border-blue-600 ring-2 ring-blue-500/25 shadow-xs'
                            : 'bg-cad-panel hover:bg-cad-surfaceHover border-cad-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 font-semibold text-xs text-cad-text">
                            <span
                              className="w-3 h-3 rounded-xs border border-cad-border"
                              style={{ backgroundColor: th.previewColor }}
                            />
                            <span>{th.name}</span>
                          </div>
                          {isSelected && <Check size={13} className="text-blue-600 dark:text-blue-400" />}
                        </div>
                        <p className="text-[11px] text-cad-textMuted leading-tight">{th.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-3.5 max-w-xl">
                <div>
                  <h3 className="text-xs font-semibold text-cad-textHeading uppercase font-mono tracking-wider mb-0.5">
                    User Session &amp; Profile
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Manage your current engineering user identity and workspace mode.
                  </p>
                </div>

                <div className="p-4 bg-cad-panel rounded-md border border-cad-border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-cad-text flex items-center gap-2">
                          <span>{user.name}</span>
                          {user.isGuest ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 text-[10px] font-mono">
                              Guest
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono">
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
                          if (onOpenAuthModal) onOpenAuthModal();
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-sm transition-colors"
                      >
                        Sign In / Register
                      </button>
                    ) : (
                      <button
                        onClick={() => AuthService.logout()}
                        className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text border border-cad-border rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <LogOut size={13} />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Editor & Grid Tab */}
            {activeTab === 'editor' && (
              <div className="space-y-3.5 max-w-xl">
                <div>
                  <h3 className="text-xs font-semibold text-cad-textHeading uppercase font-mono tracking-wider mb-0.5">
                    CAD Grid &amp; Snapping
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Configure geometric snap grids, units, and autosave behavior.
                  </p>
                </div>

                <div className="p-4 bg-cad-panel rounded-md border border-cad-border space-y-3 shadow-sm text-xs">
                  <div>
                    <label className="block font-medium text-cad-text mb-1">
                      Grid Spacing (mm)
                    </label>
                    <select
                      value={gridSpacing}
                      onChange={(e) => setGridSpacing(parseFloat(e.target.value))}
                      className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1.5 text-xs text-cad-inputText font-mono focus:outline-none focus:border-blue-500"
                    >
                      <option value="2.54">2.54 mm (100 mil - Standard KiCad)</option>
                      <option value="1.27">1.27 mm (50 mil)</option>
                      <option value="0.635">0.635 mm (25 mil)</option>
                      <option value="0.5">0.50 mm (Metric Fine)</option>
                      <option value="0.25">0.25 mm (Metric Ultra-Fine)</option>
                      <option value="0.1">0.10 mm (High Density Routing)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="font-medium text-cad-text">Snap to Grid Enabled</div>
                      <div className="text-[11px] text-cad-textMuted">Automatically align symbols, wires, and tracks to grid</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={snapEnabled}
                      onChange={(e) => setSnapEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="font-medium text-cad-text">Autosave Interval</div>
                      <div className="text-[11px] text-cad-textMuted">Seconds between background saves</div>
                    </div>
                    <select
                      value={autoSaveInterval}
                      onChange={(e) => setAutoSaveInterval(parseInt(e.target.value, 10))}
                      className="bg-cad-inputBg border border-cad-inputBorder rounded px-2 py-1 text-xs text-cad-inputText font-mono focus:outline-none"
                    >
                      <option value="10">10 seconds</option>
                      <option value="30">30 seconds</option>
                      <option value="60">1 minute</option>
                      <option value="300">5 minutes</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-cad-border flex justify-end">
                    <button
                      onClick={handleSaveEditorSettings}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Save size={13} />
                      <span>Save Editor Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. AI Inference Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-3.5 max-w-xl">
                <div>
                  <h3 className="text-xs font-semibold text-cad-textHeading uppercase font-mono tracking-wider mb-0.5">
                    FloZ AI Copilot Engine
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Configure high-performance FloZ neural models, reasoning depth, and context scoping.
                  </p>
                </div>

                <div className="p-4 bg-cad-panel rounded-md border border-cad-border space-y-3 shadow-sm text-xs">
                  <div>
                    <label className="block font-medium text-cad-text mb-1.5">Active Engineering Model</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAiModel('floz-super');
                          setAiProvider('openrouter');
                        }}
                        className={`p-3 rounded border text-left transition-all ${
                          aiModel === 'floz-super' || !aiModel || aiModel.includes('super')
                            ? 'bg-cad-subpanel border-blue-600 ring-1 ring-blue-500'
                            : 'bg-cad-panel border-cad-border hover:bg-cad-surfaceHover'
                        }`}
                      >
                        <div className="font-semibold text-cad-text flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-blue-500" />
                            <span>FloZ Super</span>
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-mono font-bold">
                            Default
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-cad-textMuted mt-1">Fast &amp; Deterministic</div>
                        <div className="text-[10px] text-cad-textMuted mt-0.5 leading-snug">
                          Interactive schematic synthesis, net analysis &amp; instant ERC validation.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiModel('floz-ultra');
                          setAiProvider('openrouter');
                        }}
                        className={`p-3 rounded border text-left transition-all ${
                          aiModel === 'floz-ultra' || aiModel.includes('ultra')
                            ? 'bg-cad-subpanel border-blue-600 ring-1 ring-blue-500'
                            : 'bg-cad-panel border-cad-border hover:bg-cad-surfaceHover'
                        }`}
                      >
                        <div className="font-semibold text-cad-text flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Cpu size={14} className="text-purple-500" />
                            <span>FloZ Ultra</span>
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[9px] font-mono font-bold">
                            Deep
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-cad-textMuted mt-1">Deep Reasoning</div>
                        <div className="text-[10px] text-cad-textMuted mt-0.5 leading-snug">
                          Multi-layer PCB architecture, autorouting &amp; complex DRC rule solving.
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-cad-border space-y-2 text-[11px] font-mono">
                    <div className="flex items-center justify-between text-cad-textMuted">
                      <span>Engine Service:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        FloZ Neural Network Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-cad-textMuted">
                      <span>Inference Key:</span>
                      <span className="text-cad-text font-medium">Auto-configured from environment</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-cad-border flex justify-end">
                    <button
                      onClick={handleSaveAISettings}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Save size={13} />
                      <span>Save AI Preferences</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Application Tab */}
            {activeTab === 'application' && (
              <div className="space-y-3.5 max-w-xl">
                <div>
                  <h3 className="text-xs font-semibold text-cad-textHeading uppercase font-mono tracking-wider mb-0.5">
                    Application Information &amp; Storage
                  </h3>
                  <p className="text-xs text-cad-textMuted">
                    Build metadata, storage engine, and local workspace diagnostics.
                  </p>
                </div>

                <div className="p-4 bg-cad-panel rounded-md border border-cad-border space-y-2.5 text-xs shadow-sm">
                  <div className="flex justify-between py-1 border-b border-cad-border">
                    <span className="text-cad-textMuted">Application Name</span>
                    <span className="font-semibold text-cad-text">FloZ ECA</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cad-border">
                    <span className="text-cad-textMuted">Architecture</span>
                    <span className="font-mono text-cad-text">KiCad-Class MTV Model-Tool-View</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-cad-border">
                    <span className="text-cad-textMuted">Storage Engine</span>
                    <span className="font-mono text-cad-text">Local-First IndexedDB / LocalStorage</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-cad-textMuted">Compliance Standard</span>
                    <span className="font-mono text-cad-text">IPC-7351 / IPC-2221</span>
                  </div>
                </div>
              </div>
            )}

            {savedNotice && (
              <div className="mt-3 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-100">
                <Check size={14} />
                <span>Settings saved successfully.</span>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
