import React, { useState } from 'react';
import { AISettings, AIProviderType, ContextLevel } from './types';
import { AIProviderFactory } from './providers/aiProvider';
import {
  Sparkles,
  Server,
  Key,
  Cpu,
  Layers,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

interface Props {
  isOpen?: boolean;
  onClose: () => void;
  settings: AISettings;
  onSaveSettings: (newSettings: AISettings) => void;
}

export const AISettingsModal: React.FC<Props> = ({
  isOpen = true,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AISettings>({ ...settings });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; result?: { ok: boolean; message: string } }>({
    testing: false,
  });
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    try {
      const provider = AIProviderFactory.createProvider(localSettings);
      const res = await provider.testConnection();
      const models = await provider.listModels();
      setDiscoveredModels(models);
      setTestStatus({ testing: false, result: res });
    } catch (err: any) {
      setTestStatus({ testing: false, result: { ok: false, message: err.message } });
    }
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="ai-settings-title"
      aria-modal="true"
      className="fixed inset-0 bg-theme-modalBackdrop z-50 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border rounded-sm shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 text-cad-text">
        {/* Header */}
        <div className="h-9 bg-cad-header border-b border-cad-border px-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
              <Sparkles size={13} />
            </div>
            <div>
              <h2 id="ai-settings-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading font-sans">
                FloZ AI Assistant Settings
              </h2>
              <p className="text-[10px] text-cad-textMuted font-mono">Provider &amp; Context Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-3 max-h-[75vh] overflow-y-auto text-xs font-sans">
          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-cad-textHeading font-semibold flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-600 dark:text-blue-400" /> Active FloZ Neural Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setLocalSettings({
                    ...localSettings,
                    model: 'floz-super',
                  })
                }
                className={`p-2.5 rounded-xs border text-left transition-colors duration-fast ${
                  (localSettings.model || 'floz-super') === 'floz-super'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-cad-border bg-cad-subpanel hover:border-cad-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-cad-textHeading">FloZ Super</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-xs bg-blue-600 text-white font-bold">Fast</span>
                </div>
                <p className="text-[10px] text-cad-textMuted mt-1 leading-snug">
                  High-speed deterministic design generation, part recommendations, and ERC reviews.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setLocalSettings({
                    ...localSettings,
                    model: 'floz-ultra',
                  })
                }
                className={`p-2.5 rounded-xs border text-left transition-colors duration-fast ${
                  localSettings.model === 'floz-ultra'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-cad-border bg-cad-subpanel hover:border-cad-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-cad-textHeading">FloZ Ultra</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-xs bg-amber-600 text-white font-bold">Deep</span>
                </div>
                <p className="text-[10px] text-cad-textMuted mt-1 leading-snug">
                  Deep reasoning for complex differential pairs, DRC routing strategies, and multi-step refactoring.
                </p>
              </button>
            </div>
          </div>

          {/* Context Level */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-cad-textHeading font-semibold flex items-center gap-1.5">
              <Layers size={13} className="text-blue-600 dark:text-blue-400" /> Context Attachment Level
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['minimal', 'standard', 'full'] as ContextLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, contextLevel: lvl })}
                  className={`py-1 text-xs rounded-xs font-mono uppercase font-semibold border transition-colors duration-fast ${
                    localSettings.contextLevel === lvl
                      ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                      : 'border-cad-border bg-cad-subpanel text-cad-text hover:bg-cad-surfaceHover'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Context Options */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-cad-textHeading font-semibold block">Included EDA Subsystems:</span>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-cad-text">
              {[
                { key: 'schematic', label: 'Schematic Netlist' },
                { key: 'pcb', label: 'PCB Layout Geometry' },
                { key: 'erc', label: 'ERC Violations' },
                { key: 'drc', label: 'DRC Violations' },
                { key: 'history', label: 'Chat Context History' },
              ].map((item) => (
                <label key={item.key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(localSettings.attachContext as any)[item.key]}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        attachContext: {
                          ...localSettings.attachContext,
                          [item.key]: e.target.checked,
                        },
                      })
                    }
                    className="rounded-xs text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Connection Status Check */}
          <div className="pt-2 border-t border-cad-border flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus.testing}
              className="px-2 py-0.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text border border-cad-border rounded-xs text-[11px] flex items-center gap-1.5 font-medium transition-colors duration-fast"
            >
              {testStatus.testing ? <RefreshCw size={11} className="animate-spin" /> : <ShieldCheck size={11} className="text-emerald-500" />}
              <span>Test Neural Link</span>
            </button>

            {testStatus.result && (
              <div
                className={`text-[11px] font-mono flex items-center gap-1 ${
                  testStatus.result.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                }`}
              >
                {testStatus.result.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span className="truncate max-w-[200px]">{testStatus.result.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-9 bg-cad-header border-t border-cad-border px-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus.testing}
            className="px-2 py-0.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-xs font-mono font-medium flex items-center gap-1.5 border border-cad-border transition-colors duration-fast"
          >
            <RefreshCw size={11} className={testStatus.testing ? 'animate-spin text-blue-500' : 'text-cad-textMuted'} />
            <span>{testStatus.testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={onClose}
              className="px-2.5 py-0.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-xs border border-cad-border transition-colors duration-fast font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium shadow-xs transition-colors duration-fast focus-visible:outline-none"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
