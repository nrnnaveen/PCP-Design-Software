/**
 * FloZ ECA - AI Assistant Settings Modal (Phase 2)
 * Provider configuration, API key management with secure storage abstractions,
 * context level granularity, and local Ollama model auto-discovery.
 */

import React, { useState } from 'react';
import { AISettings, AIProviderType, ContextLevel } from './types';
import { AIProviderFactory } from './providers/aiProvider';
import { secureStorage } from '../core/secureStorage';
import {
  X,
  Key,
  Cpu,
  Server,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface Props {
  settings: AISettings;
  onSaveSettings: (newSettings: AISettings) => void;
  onClose: () => void;
}

export const AISettingsModal: React.FC<Props> = ({ settings, onSaveSettings, onClose }) => {
  const [localSettings, setLocalSettings] = useState<AISettings>({ ...settings });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; result?: { ok: boolean; message: string } }>({
    testing: false,
  });

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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-cad-panel border border-cad-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col select-none animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono">FloZ AI Assistant Settings</h2>
              <p className="text-[10px] text-cad-textMuted font-mono">Provider & Context Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs font-mono">
          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <Server size={13} className="text-blue-400" /> AI Provider
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
              className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="local">FloZ Local Engine (Offline / Deterministic)</option>
              <option value="openrouter">OpenRouter (Cloud LLMs / Free Models)</option>
              <option value="ollama">Ollama (Local Private Daemon: localhost:11434)</option>
            </select>
          </div>

          {/* OpenRouter API Key */}
          {localSettings.provider === 'openrouter' && (
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-300 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key size={13} className="text-amber-400" /> OpenRouter API Key
                </span>
                <span className="text-[10px] text-cad-textMuted flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-400" />
                  {secureStorage.isHardwareSecured() ? 'OS Secure Storage' : 'Dev LocalStorage'}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-..."
                  value={localSettings.apiKey}
                  onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                  className="w-full bg-cad-bg border border-cad-border rounded px-3 pr-9 py-1.5 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Get a free API key at <span className="text-blue-400 underline cursor-pointer">openrouter.ai/keys</span>
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                <Cpu size={13} className="text-emerald-400" /> Model Name
              </label>
              {discoveredModels.length > 0 && (
                <span className="text-[10px] text-blue-400">
                  {discoveredModels.length} models discovered
                </span>
              )}
            </div>
            <input
              type="text"
              value={localSettings.model}
              onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
              className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
            />
            {localSettings.provider === 'openrouter' && (
              <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 pt-0.5">
                <span>Free Models:</span>
                {['openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-exp:free'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, model: m })}
                    className="px-1.5 py-0.5 bg-cad-subpanel hover:bg-cad-border rounded text-blue-400 hover:text-white"
                  >
                    {m.split('/')[1] || m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Context Scope Granularity */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <Layers size={13} className="text-purple-400" /> Context Depth Level
            </label>
            <select
              value={localSettings.contextLevel}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, contextLevel: e.target.value as ContextLevel })
              }
              className="w-full bg-cad-bg border border-cad-border rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="full">Full Context (Schematic + PCB + ERC/DRC + Selection)</option>
              <option value="schematic">Schematic Focus (Schematic Components & Nets)</option>
              <option value="pcb">PCB Focus (Footprints, Board Size & DRC)</option>
              <option value="diagnostic">Diagnostics Focus (ERC & DRC Only)</option>
              <option value="minimal">Minimal (Current Selection Only)</option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-slate-300 font-semibold">Temperature (Deterministic: 0.0 - 0.3)</label>
              <span className="text-cad-textMuted">{localSettings.temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={localSettings.temperature}
              onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
              className="w-full accent-blue-500 bg-cad-bg"
            />
          </div>

          {/* Test Connection Output */}
          {testStatus.result && (
            <div
              className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
                testStatus.result.ok
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {testStatus.result.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
              <span>{testStatus.result.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-cad-header border-t border-cad-border px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testStatus.testing}
            className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-border text-slate-200 rounded text-xs font-mono font-semibold flex items-center gap-1.5 border border-cad-border"
          >
            <RefreshCw size={12} className={testStatus.testing ? 'animate-spin text-blue-400' : 'text-slate-400'} />
            {testStatus.testing ? 'Testing...' : 'Test Connection'}
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 hover:bg-cad-subpanel text-cad-textMuted hover:text-white rounded text-xs font-mono"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-semibold shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
