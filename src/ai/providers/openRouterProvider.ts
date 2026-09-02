/**
 * FloZ ECA - FloZ AI Cloud Provider Client (Phase 2)
 * High-performance engineering inference utilizing NVIDIA Nemtron (FloZ Super & FloZ Ultra)
 * with automatic environment API key discovery, streaming, and deterministic local fallback.
 */

import { ApexProject } from '../../core/types';
import { IAIProvider, ProviderResponse, ProviderCapabilities } from './aiProvider';
import {
  ChatMessage,
  FullEngineeringContext,
  ToolActivity,
  AISettings,
  FLOZ_AI_MODELS,
  getFloZAIKey,
} from '../types';
import { ContextBuilder } from '../contextBuilder';
import { LocalEngineeringEngine } from './localEngine';
import { ToolCallParser } from '../generation/toolCallParser';

export class OpenRouterProvider implements IAIProvider {
  public name = 'FloZ AI';
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsToolCalling: true,
      supportsCancellation: true,
      isOfflineCapable: true,
      isPrivateLocal: false,
    };
  }

  private resolveApiKey(): string {
    if (this.settings.apiKey && this.settings.apiKey.trim()) {
      return this.settings.apiKey.trim();
    }
    return getFloZAIKey();
  }

  private resolveBackendModel(): { backendId: string; displayName: string } {
    const raw = (this.settings.model || 'floz-super').toLowerCase();
    if (
      raw === 'floz-ultra' ||
      raw.includes('ultra') ||
      raw.includes('nemtron-4') ||
      raw.includes('nemotron-4') ||
      raw.includes('nemotron-3-ultra')
    ) {
      return { backendId: 'nvidia/nemtron-4-340b-instruct', displayName: 'FloZ Ultra' };
    }
    // Default to FloZ Super
    return { backendId: 'nvidia/nemotron-3-super-120b-a12b:free', displayName: 'FloZ Super' };
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    const key = this.resolveApiKey();
    if (!key) {
      return { ok: true, message: 'FloZ Local Inference Engine active (100% offline & deterministic).' };
    }
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { ok: true, message: 'FloZ AI Neural Service connected successfully.' };
      }
      return { ok: false, message: `FloZ AI status code: ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `FloZ AI connection: ${err.message}` };
    }
  }

  public async listModels(): Promise<string[]> {
    return ['floz-super', 'floz-ultra'];
  }

  public async chatStream(
    messages: ChatMessage[],
    context: FullEngineeringContext,
    project: ApexProject,
    onChunk: (chunk: string) => void,
    onToolActivity: (activity: ToolActivity) => void,
    abortSignal?: AbortSignal
  ): Promise<ProviderResponse> {
    const apiKey = this.resolveApiKey();
    const { backendId, displayName } = this.resolveBackendModel();

    // If no API key found in env or storage, fall back seamlessly to FloZ Local Engineering Engine
    if (!apiKey) {
      onToolActivity({
        id: `act_${Date.now()}`,
        name: 'FloZ Local Engine',
        permission: 'ANALYZE',
        description: 'Running deterministic offline CAD rule solver & netlist compiler',
        status: 'completed',
      });
      return new LocalEngineeringEngine().chatStream(messages, context, project, onChunk, onToolActivity, abortSignal);
    }

    const contextText = ContextBuilder.formatContextPrompt(context);
    const systemPrompt = `You are FloZ AI (${displayName}), a senior Electronic Design Automation (EDA) engineer for FloZ ECA.
You analyze schematics, PCB layouts, electrical rule check (ERC) results, design rule check (DRC) results, and component libraries.
Always format engineering answers with standard headers:
## Finding
(Concise summary of findings)
## Evidence
(Specific component references, pins, coordinates, net names, or ERC codes from the provided context)
## Recommendation
(Actionable engineering advice)

Do NOT hallucinate connections or components that are not in the context.
Current Project Context:
${contextText}`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      if (abortSignal?.aborted) {
        throw new Error('Request was cancelled by user.');
      }

      try {
        onToolActivity({
          id: `act_${Date.now()}`,
          name: `${displayName} Inference`,
          permission: 'READ',
          description: `Synthesizing with ${displayName}${attempts > 0 ? ` (Retry ${attempts})` : ''}...`,
          status: 'running',
        });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://floz.eda',
            'X-Title': 'FloZ ECA',
          },
          body: JSON.stringify({
            model: backendId,
            messages: apiMessages,
            temperature: this.settings.temperature ?? 0.15,
            stream: true,
          }),
          signal: abortSignal,
        });

        if (!response.ok) {
          if (response.status === 429) {
            attempts++;
            if (attempts < maxAttempts) {
              onToolActivity({
                id: `act_${Date.now()}`,
                name: 'Rate Limit Backoff',
                permission: 'READ',
                description: `Retrying in ${attempts * 1.5}s...`,
                status: 'warning',
              });
              await new Promise((r) => setTimeout(r, attempts * 1500));
              continue;
            } else {
              onToolActivity({
                id: `act_${Date.now()}`,
                name: 'Local Solver Fallback',
                permission: 'READ',
                description: 'Switching to FloZ deterministic CAD solver',
                status: 'warning',
              });
              return new LocalEngineeringEngine().chatStream(messages, context, project, onChunk, onToolActivity, abortSignal);
            }
          }
          throw new Error(`FloZ AI service returned error: ${response.status} ${response.statusText}`);
        }

        onToolActivity({
          id: `act_${Date.now()}`,
          name: 'Streaming Response',
          permission: 'READ',
          description: `Receiving stream from ${displayName}`,
          status: 'completed',
        });

        let fullText = '';
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let done = false;
          while (!done) {
            if (abortSignal?.aborted) {
              reader.cancel();
              throw new Error('Streaming cancelled.');
            }

            const { value, done: isDone } = await reader.read();
            done = isDone;
            if (value) {
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.replace('data: ', '').trim();
                  if (dataStr === '[DONE]') break;
                  try {
                    const json = JSON.parse(dataStr);
                    const token = json.choices?.[0]?.delta?.content || '';
                    if (token) {
                      fullText += token;
                      onChunk(token);
                    }
                  } catch {}
                }
              }
            }
          }
        }

        const lastUserMsg = messages[messages.length - 1]?.content || '';
        const parsed = ToolCallParser.parseResponse(fullText, lastUserMsg, project);
        return { text: parsed.cleanText, toolActivities: parsed.toolActivities, proposals: parsed.proposals };
      } catch (err: any) {
        if (abortSignal?.aborted || err.name === 'AbortError') {
          return { text: '*(Generation stopped by user)*', toolActivities: [] };
        }
        console.warn('OpenRouter stream attempt failed:', err);
        attempts++;
        if (attempts >= maxAttempts) {
          onToolActivity({
            id: `act_${Date.now()}`,
            name: 'Fallback Triggered',
            permission: 'ANALYZE',
            description: `Network error (${err.message}). Running local offline solver.`,
            status: 'warning',
          });
          return new LocalEngineeringEngine().chatStream(messages, context, project, onChunk, onToolActivity, abortSignal);
        }
      }
    }

    return new LocalEngineeringEngine().chatStream(messages, context, project, onChunk, onToolActivity, abortSignal);
  }
}
