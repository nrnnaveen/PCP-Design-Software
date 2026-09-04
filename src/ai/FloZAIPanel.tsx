/**
 * FloZ ECA - FloZ AI Panel (FloZ AI Phase 2)
 * Production-grade AI engineering assistant with AbortController cancellation, pre/post-apply validation,
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
  FLOZ_AI_MODELS,
  FloZModelId,
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
  ChevronDown,
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
      content: `## FloZ AI
Engineering assistant for schematic capture, PCB layout, ERC/DRC diagnostics, and circuit analysis.

Ask questions about your design, inspect nets and components, or choose a quick action below:`,
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

  // Listen for global prompt submissions (from Dashboard prompt-to-pcb bar)
  useEffect(() => {
    const unsub = eventBus.on('FLOZ_AI_SUBMIT_PROMPT', (payload) => {
      if (payload && payload.prompt && payload.prompt.trim()) {
        handleSendMessage(payload.prompt.trim());
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isStreaming, settings, project]);

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
        setPostApplyNotice(`Cannot apply invalid action: ${preValidation.issues.join('; ')}`);
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
      setPostApplyNotice(`Failed to apply proposed modification: ${err.message}`);
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
    <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col select-none overflow-hidden text-xs font-sans">
      {/* 1. Header (GitHub Copilot Style: Name only) */}
      <div className="h-9 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Sparkles size={14} className="text-blue-500" />
          <span className="font-semibold text-cad-textHeading tracking-wide text-xs">
            FloZ AI
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleNewChat}
            title="New Chat"
            className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Post-Apply Notification Banner */}
      {postApplyNotice && (
        <div className="px-3 py-1 bg-amber-500/15 border-b border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] font-mono flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={12} className="shrink-0 text-amber-500" />
            {postApplyNotice}
          </span>
          <button onClick={() => setPostApplyNotice(null)} className="hover:text-cad-textHeading">
            <X size={12} />
          </button>
        </div>
      )}

      {/* 2. Messages Stream Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-cad-bg">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1 ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Header */}
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-cad-textMuted px-1">
                <span className="font-semibold text-cad-textHeading">{isUser ? 'You' : 'FloZ AI'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3 rounded-lg max-w-[95%] border leading-relaxed text-xs ${
                  isUser
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-cad-panel border-cad-border text-cad-text shadow-xs'
                }`}
              >
                {/* Formatted Markdown Content */}
                <div className="space-y-1.5 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {msg.content}
                </div>

                {/* Action Proposals Cards */}
                {msg.proposals && msg.proposals.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-cad-border space-y-2">
                    {msg.proposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-2.5 rounded-lg bg-cad-subpanel border border-blue-500/40 space-y-2 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Zap size={13} /> {prop.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              prop.status === 'applied'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : prop.status === 'rejected'
                                ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {prop.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-cad-text font-sans">{prop.description}</p>

                        {/* Visual Diff Box */}
                        <div className="bg-cad-panel p-2 rounded border border-cad-border text-[10px] space-y-1">
                          <div className="text-cad-textMuted uppercase font-bold text-[9px]">
                            Proposed Modifications:
                          </div>
                          {prop.diff.addedComponents?.map((c) => (
                            <div key={c.reference} className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              + ADD Component: <span className="font-bold">{c.reference}</span> ({c.value}) at ({c.position.x}, {c.position.y}) mm
                            </div>
                          ))}
                          {prop.diff.connectedNets?.map((net) => (
                            <div key={net} className="text-blue-600 dark:text-blue-400 font-semibold">
                              ~ CONNECT Net: <span className="font-bold">{net}</span>
                            </div>
                          ))}
                          {prop.diff.notes?.map((n, idx) => (
                            <div key={idx} className="text-cad-textMuted italic">
                              • {n}
                            </div>
                          ))}
                        </div>

                        {/* Pre-Validation Status Badge */}
                        {prop.validation && (
                          <div
                            className={`px-2 py-1 rounded text-[10px] flex items-center gap-1.5 border ${
                              prop.validation.valid
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium'
                                : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300 font-medium'
                            }`}
                          >
                            {prop.validation.valid ? (
                              <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle size={12} className="text-red-600 dark:text-red-400 shrink-0" />
                            )}
                            <span>{prop.validation.ercImpact || 'Validated'}</span>
                          </div>
                        )}

                        {/* Approval Controls */}
                        {prop.status === 'pending' && (
                          <div className="flex items-center justify-end space-x-2 pt-1">
                            <button
                              onClick={() => handleRejectProposal(prop, msg.id)}
                              className="px-2.5 py-1 hover:bg-cad-surfaceHover text-cad-text border border-cad-border rounded text-[11px] flex items-center gap-1 font-medium transition-colors"
                            >
                              <X size={12} /> Cancel
                            </button>
                            <button
                              onClick={() => handleApplyProposal(prop, msg.id)}
                              disabled={prop.validation && !prop.validation.valid}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-colors"
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

        {/* Live Copilot Thinking Indicator */}
        {isStreaming && (
          <div className="p-2.5 rounded-lg bg-cad-panel border border-cad-border text-xs flex items-center justify-between text-cad-textMuted">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="font-mono text-[11px]">FloZ AI is synthesizing...</span>
            </div>
            <button
              onClick={handleStopGenerating}
              className="px-2 py-0.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded text-[10px] font-mono flex items-center gap-1 transition-colors"
            >
              <Square size={10} /> Stop
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Copilot Input Area with Integrated Model Selector */}
      <div className="p-2.5 bg-cad-panel border-t border-cad-border">
        <div className="relative rounded-lg border border-cad-inputBorder bg-cad-inputBg focus-within:border-blue-500 transition-colors shadow-xs flex flex-col">
          <textarea
            rows={2}
            placeholder="Ask FloZ AI or describe a circuit to generate..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isStreaming}
            className="w-full bg-transparent px-3 pt-2.5 pb-1 text-xs text-cad-inputText placeholder:text-cad-textMuted focus:outline-none resize-none font-sans leading-relaxed"
          />

          {/* Integrated Input Footer Toolbar */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-cad-border/50 text-[11px]">
            {/* Model Selector */}
            <div className="flex items-center bg-cad-subpanel border border-cad-border rounded p-0.5">
              {FLOZ_AI_MODELS.map((m) => {
                const isSelected = (settings.model || 'floz-super') === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      const next = { ...settings, model: m.id };
                      handleSaveSettings(next);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-cad-textMuted hover:text-cad-text'
                    }`}
                    title={`${m.name} - ${m.description}`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Settings & Send */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-1 text-cad-textMuted hover:text-cad-text rounded transition-colors"
                title="FloZ AI Settings"
              >
                <Settings size={13} />
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  title="Stop Generating"
                  className="p-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                >
                  <Square size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputPrompt.trim()}
                  title="Send message"
                  className="p-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded transition-colors"
                >
                  <Send size={13} />
                </button>
              )}
            </div>
          </div>
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
