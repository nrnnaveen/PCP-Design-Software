/**
 * FloZ ECA - Professional AI EDA Copilot Panel (FloZ AI Phase 2)
 * Production-grade engineering copilot with AbortController cancellation, pre/post-apply validation,
 * clickable cross-probing, permission badges, and multi-provider health indicators.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ApexProject } from '../core/types';
import {
  ChatMessage,
  AISettings,
  DEFAULT_AI_SETTINGS,
  ActionProposal,
  ToolActivity,
} from './types';
import { ContextBuilder } from './contextBuilder';
import { AIProviderFactory } from './providers/aiProvider';
import { AISettingsModal } from './AISettingsModal';
import { ActionValidator } from './actionValidator';
import { secureStorage } from '../core/secureStorage';
import { eventBus } from '../core/eventBus';
import {
  Sparkles,
  Cpu,
  Send,
  Square,
  Settings,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Check,
  X,
  RefreshCw,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  selectedSymbolId?: string;
  selectedFootprintId?: string;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  panelWidth?: number;
  onSetPanelWidth?: (w: number) => void;
}

export const FloZAIPanel: React.FC<Props> = ({
  project,
  selectedSymbolId,
  selectedFootprintId,
  onUpdateProject,
  panelWidth,
  onSetPanelWidth,
}) => {
  // 1. Settings State
  const [settings, setSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('floz_ai_settings_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_AI_SETTINGS;
  });

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // 2. Chat Conversation State
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg_welcome',
      role: 'assistant',
      content: `## FloZ AI — Electronic Design Assistant
I am your engineering copilot for schematic capture, PCB layout, ERC/DRC audits, and circuit synthesis.

Ask any question about your design, or click a suggestion below:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeToolActivities, setActiveToolActivities] = useState<ToolActivity[]>([]);
  const [postApplyNotice, setPostApplyNotice] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Save settings
  const handleSaveSettings = (newSettings: AISettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('floz_ai_settings_v1', JSON.stringify(newSettings));
      secureStorage.setItem('floz_ai_settings_v1', JSON.stringify(newSettings));
    } catch {}
  };

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, activeToolActivities]);

  // Stop / Cancel Streaming
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setActiveToolActivities([]);
  };

  // Send Message / Query AI
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: promptToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `msg_${Date.now()}_ai`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
      toolActivities: [],
      proposals: [],
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setInputPrompt('');
    setIsStreaming(true);
    setActiveToolActivities([]);
    setPostApplyNotice(null);

    // Setup AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 1. Build Context
    const context = ContextBuilder.buildFullEngineeringContext(
      project,
      selectedSymbolId,
      selectedFootprintId,
      settings
    );

    // 2. Instantiate Provider
    const provider = AIProviderFactory.createProvider(settings);

    let accumulatedText = '';
    const collectedActivities: ToolActivity[] = [];

    try {
      const response = await provider.chatStream(
        [...messages, userMsg],
        context,
        project,
        (chunk) => {
          accumulatedText += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: accumulatedText } : m))
          );
        },
        (activity) => {
          collectedActivities.push(activity);
          setActiveToolActivities([...collectedActivities]);
        },
        controller.signal
      );

      // Validate any returned proposals before showing
      const validatedProposals = (response.proposals || []).map((prop) => {
        const val = ActionValidator.preValidate(prop, project);
        return { ...prop, validation: val };
      });

      // Finalize Message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: response.text || accumulatedText,
                isStreaming: false,
                proposals: validatedProposals,
                toolActivities: collectedActivities,
              }
            : m
        )
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `## Notice\n${err.message}`,
                  isStreaming: false,
                  toolActivities: collectedActivities,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setActiveToolActivities([]);
      abortControllerRef.current = null;
    }
  };

  // Human Approval: Apply Action Proposal with Transaction Safety & Post-Validation
  const handleApplyProposal = (proposal: ActionProposal, messageId: string) => {
    try {
      const preValidation = ActionValidator.preValidate(proposal, project);
      if (!preValidation.valid) {
        alert(`Cannot apply invalid action:\n- ${preValidation.issues.join('\n- ')}`);
        return;
      }

      const prevProjectState = project;
      let updatedProjectState = project;

      onUpdateProject((prev) => {
        const updated = proposal.applyAction(prev);
        updatedProjectState = updated;
        return updated;
      }, proposal.title);

      // Post-apply validation check
      const postCheck = ActionValidator.postValidate(prevProjectState, updatedProjectState);
      if (!postCheck.clean) {
        setPostApplyNotice(postCheck.message);
      }

      // Mark proposal as applied
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === messageId && m.proposals) {
            return {
              ...m,
              proposals: m.proposals.map((p) =>
                p.id === proposal.id ? { ...p, status: 'applied' } : p
              ),
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      alert(`Failed to apply proposed modification: ${err.message}`);
    }
  };

  // Human Rejection: Cancel Action Proposal
  const handleRejectProposal = (proposal: ActionProposal, messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId && m.proposals) {
          return {
            ...m,
            proposals: m.proposals.map((p) =>
              p.id === proposal.id ? { ...p, status: 'rejected' } : p
            ),
          };
        }
        return m;
      })
    );
  };

  // Clear Chat History
  const handleNewChat = () => {
    setMessages([
      {
        id: `msg_welcome_${Date.now()}`,
        role: 'assistant',
        content: `## FloZ AI — New Session\nEngineering assistant ready. Ask about your design or synthesize circuits.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setPostApplyNotice(null);
  };

  return (
    <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col select-none overflow-hidden text-xs">
      {/* 1. Header */}
      <div className="h-10 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-blue-600/20 text-blue-500 dark:text-blue-400 border border-blue-500/30">
            <Cpu size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-cad-text uppercase font-mono tracking-wider text-[11px]">
                AI Assistant
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[9px] text-cad-textMuted font-mono block -mt-0.5">
              {settings.provider === 'openrouter'
                ? 'OpenRouter'
                : settings.provider === 'ollama'
                ? 'Ollama (Local)'
                : 'FloZ Engineering Engine'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Quick Width Presets */}
          {onSetPanelWidth && (
            <div className="flex items-center bg-cad-subpanel border border-cad-border rounded p-0.5 mr-1 text-[10px] font-mono">
              <button
                onClick={() => onSetPanelWidth(360)}
                title="Compact Width (360px)"
                className={`px-1.5 py-0.5 rounded ${
                  (panelWidth || 420) <= 380 ? 'bg-blue-600 text-white font-bold' : 'text-cad-textMuted hover:text-cad-text'
                }`}
              >
                S
              </button>
              <button
                onClick={() => onSetPanelWidth(480)}
                title="Medium Width (480px)"
                className={`px-1.5 py-0.5 rounded ${
                  (panelWidth || 420) > 380 && (panelWidth || 420) <= 560 ? 'bg-blue-600 text-white font-bold' : 'text-cad-textMuted hover:text-cad-text'
                }`}
              >
                M
              </button>
              <button
                onClick={() => onSetPanelWidth(640)}
                title="Wide Width (640px)"
                className={`px-1.5 py-0.5 rounded ${
                  (panelWidth || 420) > 560 ? 'bg-blue-600 text-white font-bold' : 'text-cad-textMuted hover:text-cad-text'
                }`}
              >
                L
              </button>
            </div>
          )}

          <button
            onClick={handleNewChat}
            title="New Chat Session"
            className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-cad-text"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            title="AI Assistant Settings"
            className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-cad-text"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* 2. Context Pills */}
      <div className="px-3 py-1.5 bg-cad-subpanel border-b border-cad-border flex items-center gap-1 overflow-x-auto text-[10px] font-mono no-scrollbar">
        <span className="text-cad-textMuted shrink-0">Context:</span>
        <span className="px-1.5 py-0.5 rounded bg-blue-950/40 border border-blue-500/30 text-blue-400 shrink-0">
          Schematic ({project.schematic.sheets[0].symbols.length} parts)
        </span>
        <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shrink-0">
          PCB ({project.pcb.footprints.length} footprints)
        </span>
        <span className="px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-400 shrink-0">
          ERC Active
        </span>
      </div>

      {/* Post-Apply Notification Banner */}
      {postApplyNotice && (
        <div className="px-3 py-1.5 bg-amber-950/70 border-b border-amber-500/40 text-amber-300 text-[10px] font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="shrink-0 text-amber-400" />
            {postApplyNotice}
          </span>
          <button onClick={() => setPostApplyNotice(null)} className="hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {/* 3. Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-cad-bg/25">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Header */}
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-cad-textMuted px-1">
                <span className="font-semibold text-cad-text">{isUser ? 'You' : 'AI Assistant'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3 rounded-lg max-w-[95%] border leading-relaxed text-xs ${
                  isUser
                    ? 'bg-blue-600/15 border-blue-500/40 text-cad-text'
                    : 'bg-cad-subpanel border-cad-border text-cad-text'
                }`}
              >
                {/* Tool Activities Chips */}
                {msg.toolActivities && msg.toolActivities.length > 0 && (
                  <div className="mb-2.5 pb-2 border-b border-cad-border space-y-1">
                    {msg.toolActivities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400"
                      >
                        {act.status === 'completed' ? (
                          <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                        ) : act.status === 'warning' ? (
                          <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                        ) : (
                          <RefreshCw size={11} className="animate-spin text-blue-400 shrink-0" />
                        )}
                        <span>{act.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formatted Markdown Content */}
                <div className="space-y-1.5 whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Action Proposals Cards */}
                {msg.proposals && msg.proposals.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-cad-border space-y-2">
                    {msg.proposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-2.5 rounded-lg bg-cad-bg border border-blue-500/40 space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-400 flex items-center gap-1">
                            <Zap size={13} /> {prop.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              prop.status === 'applied'
                                ? 'bg-emerald-900 text-emerald-300'
                                : prop.status === 'rejected'
                                ? 'bg-red-900 text-red-300'
                                : 'bg-amber-900 text-amber-300'
                            }`}
                          >
                            {prop.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-300 font-sans">{prop.description}</p>

                        {/* Visual Diff Box */}
                        <div className="bg-cad-subpanel p-2 rounded border border-cad-border text-[10px] space-y-1">
                          <div className="text-cad-textMuted uppercase font-bold text-[9px]">
                            Proposed Modification Diff:
                          </div>
                          {prop.diff.addedComponents?.map((c) => (
                            <div key={c.reference} className="text-emerald-400">
                              + ADD Component: <span className="font-bold">{c.reference}</span> ({c.value}) at ({c.position.x}, {c.position.y}) mm
                            </div>
                          ))}
                          {prop.diff.connectedNets?.map((net) => (
                            <div key={net} className="text-blue-400">
                              ~ CONNECT Net: <span className="font-bold">{net}</span>
                            </div>
                          ))}
                          {prop.diff.notes?.map((n, idx) => (
                            <div key={idx} className="text-slate-400 italic">
                              • {n}
                            </div>
                          ))}
                        </div>

                        {/* Pre-Validation Status Badge */}
                        {prop.validation && (
                          <div
                            className={`px-2 py-1 rounded text-[10px] flex items-center gap-1.5 border ${
                              prop.validation.valid
                                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                : 'bg-red-950/40 border-red-500/30 text-red-300'
                            }`}
                          >
                            {prop.validation.valid ? (
                              <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle size={12} className="text-red-400 shrink-0" />
                            )}
                            <span>{prop.validation.ercImpact || 'Validated'}</span>
                          </div>
                        )}

                        {/* Approval Controls */}
                        {prop.status === 'pending' && (
                          <div className="flex items-center justify-end space-x-2 pt-1">
                            <button
                              onClick={() => handleRejectProposal(prop, msg.id)}
                              className="px-2.5 py-1 hover:bg-cad-border text-slate-400 hover:text-white rounded text-[11px] flex items-center gap-1 font-semibold"
                            >
                              <X size={12} /> Cancel
                            </button>
                            <button
                              onClick={() => handleApplyProposal(prop, msg.id)}
                              disabled={prop.validation && !prop.validation.valid}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <Check size={12} /> Apply Change
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Active Tool Stream Indicator */}
        {isStreaming && (
          <div className="p-2 rounded bg-cad-subpanel border border-cad-border text-[10px] font-mono flex items-center justify-between text-slate-400">
            <div className="flex items-center gap-1.5">
              <RefreshCw size={11} className="animate-spin text-blue-400 shrink-0" />
              <span>FloZ AI is analyzing design...</span>
            </div>
            <button
              onClick={handleStopGenerating}
              className="px-2 py-0.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded text-[10px] font-mono flex items-center gap-1"
            >
              <Square size={10} /> Stop
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Suggestion Prompt Chips */}
      <div className="p-2 bg-cad-subpanel border-t border-cad-border space-y-1.5">
        <div className="flex flex-wrap gap-1 text-[10px] font-mono">
          {[
            'Explain this schematic',
            'Check for ERC issues',
            'Add 100nF cap to U1',
            'Generate voltage divider',
            'RC Low-Pass Filter',
            'I2C Pull-Ups',
            'Highlight +3.3V',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={isStreaming}
              className="px-2 py-0.5 rounded bg-cad-bg hover:bg-cad-border text-cad-text hover:text-blue-500 border border-cad-border transition-colors truncate font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask FloZ AI about your design..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isStreaming}
            className="w-full bg-cad-bg border border-cad-border rounded-lg pl-3 pr-10 py-2 text-xs text-cad-text font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500 shadow-inner"
          />
          {isStreaming ? (
            <button
              onClick={handleStopGenerating}
              title="Stop Generating"
              className="absolute right-1.5 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
            >
              <Square size={13} />
            </button>
          ) : (
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputPrompt.trim()}
              className="absolute right-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-md transition-colors"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 5. Settings Modal */}
      {showSettingsModal && (
        <AISettingsModal
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};
