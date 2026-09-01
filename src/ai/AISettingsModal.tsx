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
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 text-cad-text">
        {/* Header */}
        <div className="h-11 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">
              <Sparkles size={14} />
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
            className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs font-sans">
          {/* Provider Selection */}
          <div className="space-y-1">
            <label className="text-[11px] text-cad-textHeading font-semibold flex items-center gap-1.5">
              <Server size={13} className="text-blue-600 dark:text-blue-400" /> AI Provider
            </label>
            <select
              value={localSettings.provider}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  provider: e.target.value as AIProviderType,
                  model:
                    e.target.value === 'openrouter'
                      ? 'openrouter/free'
                      : e.target.value === 'ollama'
                      ? 'llama3:latest'
                      : 'floz-local-eda-v2',
                })
              }
              className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1.5 text-cad-inputText text-xs focus:outline-none focus:border-blue-500 font-mono"
            >
              <option value="local">FloZ Local Engine (Offline / Deterministic)</option>
              <option value="openrouter">OpenRouter (Cloud LLMs / Free Models)</option>
              <option value="ollama">Ollama (Local Private Daemon: localhost:11434)</option>
            </select>
          </div>

          {/* OpenRouter API Key */}
          {localSettings.provider === 'openrouter' && (
            <div className="space-y-1">
              <label className="text-[11px] text-cad-textHeading font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key size={13} className="text-amber-600 dark:text-amber-400" /> OpenRouter API Key
                </span>
                <span className="text-[10px] text-cad-textMuted flex items-center gap-1 font-mono">
                  <ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                  Local Storage
                </span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-..."
                  value={localSettings.apiKey}
                  onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 pr-8 py-1.5 text-cad-inputText text-xs font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-cad-textMuted hover:text-cad-text"
                >
                  {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <p className="text-[10px] text-cad-textMuted">
                Get a free API key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">openrouter.ai/keys</a>
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-cad-textHeading font-semibold flex items-center gap-1.5">
                <Cpu size={13} className="text-emerald-600 dark:text-emerald-400" /> Model Name
              </label>
              {discoveredModels.length > 0 && (
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                  {discoveredModels.length} models discovered
                </span>
              )}
            </div>
            <input
              type="text"
              value={localSettings.model}
              onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
              className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1.5 text-cad-inputText text-xs font-mono focus:outline-none focus:border-blue-500"
            />
            {localSettings.provider === 'openrouter' && (
              <div className="flex flex-wrap gap-1 text-[10px] text-cad-textMuted pt-0.5">
                <span>Free Models:</span>
                {['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-exp:free'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, model: m })}
                    className="px-1.5 py-0.2 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border rounded text-blue-600 dark:text-blue-400 font-mono text-[10px]"
                  >
                    {m.split('/')[1] || m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Context Scope Granularity */}
          <div className="space-y-1">
            <label className="text-[11px] text-cad-textHeading font-semibold flex items-center gap-1.5">
              <Layers size={13} className="text-purple-600 dark:text-purple-400" /> Context Depth Level
            </label>
            <select
              value={localSettings.contextLevel}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, contextLevel: e.target.value as ContextLevel })
              }
              className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1.5 text-cad-inputText text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="full">Full Context (Schematic + PCB + ERC/DRC + Selection)</option>
              <option value="schematic">Schematic Focus (Schematic Components &amp; Nets)</option>
              <option value="pcb">PCB Focus (Footprints, Board Size &amp; DRC)</option>
              <option value="diagnostic">Diagnostics Focus (ERC &amp; DRC Only)</option>
              <option value="minimal">Minimal (Current Selection Only)</option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-cad-textHeading font-semibold">Temperature ({localSettings.temperature})</label>
              <span className="text-cad-textMuted text-[10px] font-mono">Deterministic: 0.0 - 0.3</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={localSettings.temperature}
              onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Test Connection Output */}
          {testStatus.result && (
            <div
              className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
                testStatus.result.ok
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
              }`}
            >
              {testStatus.result.ok ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
              <span>{testStatus.result.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-11 bg-cad-header border-t border-cad-border px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus.testing}
            className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded text-xs font-mono font-medium flex items-center gap-1.5 border border-cad-border transition-colors"
          >
            <RefreshCw size={12} className={testStatus.testing ? 'animate-spin text-blue-500' : 'text-cad-textMuted'} />
            <span>{testStatus.testing ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded text-xs border border-cad-border transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-sm transition-colors focus-visible:outline-none"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
