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
      return { backendId: 'nvidia/nemotron-3-ultra-550b-a55b:free', displayName: 'FloZ Ultra' };
    }
    // Default to FloZ Super
    return { backendId: 'nvidia/nemotron-3-super-120b-a12b:free', displayName: 'FloZ Super' };
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    const key = this.resolveApiKey();
    if (!key) {
      return { ok: false, message: 'No FloZ AI API key configured.' };
    }
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { ok: true, message: 'FloZ AI Neural Service connected successfully.' };
      }
      return { ok: false, message: `Neural service status code: ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `Neural service connection error: ${err.message}` };
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
    const lastUserMsg = messages[messages.length - 1]?.content || '';

    // If no API key configured, generate directly via ToolCallParser without noisy traces
    if (!apiKey) {
      const parsed = ToolCallParser.parseResponse('', lastUserMsg, project);
      return { text: parsed.cleanText, proposals: parsed.proposals, toolActivities: [] };
    }

    const contextText = ContextBuilder.formatContextPrompt(context);
    const systemPrompt = `You are FloZ AI (${displayName}), a world-class Electronic Design Automation (EDA) Copilot for FloZ ECA.
You assist electrical engineers with schematic capture, PCB layout, 45° trace routing, and ERC/DRC diagnostics.
Respond directly and concisely in clean Markdown, similar to GitHub Copilot.
Do not use verbose boilerplate headers or repetitious disclaimers. Focus on actionable circuit design, exact component values, pinouts, and PCB layout guidelines.

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
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://floz.eda',
            'X-Title': 'FloZ AI',
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
          if (response.status === 429 && attempts < maxAttempts - 1) {
            attempts++;
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          throw new Error(`FloZ AI service returned HTTP ${response.status}`);
        }

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

        const parsed = ToolCallParser.parseResponse(fullText, lastUserMsg, project);
        return { text: parsed.cleanText, toolActivities: [], proposals: parsed.proposals };
      } catch (err: any) {
        if (abortSignal?.aborted || err.name === 'AbortError') {
          return { text: '*(Generation stopped by user)*', toolActivities: [] };
        }
        attempts++;
        if (attempts >= maxAttempts) {
          // If network or upstream issue, parse user intent cleanly without fake local error messages
          const fallbackParsed = ToolCallParser.parseResponse('', lastUserMsg, project);
          if (fallbackParsed.proposals && fallbackParsed.proposals.length > 0) {
            return {
              text: fallbackParsed.cleanText,
              toolActivities: [],
              proposals: fallbackParsed.proposals,
            };
          }
          return {
            text: `Unable to complete synthesis: ${err.message}. Please check your connection or try again.`,
            toolActivities: [],
          };
        }
      }
    }

    const fallbackParsed = ToolCallParser.parseResponse('', lastUserMsg, project);
    return { text: fallbackParsed.cleanText, toolActivities: [], proposals: fallbackParsed.proposals };
  }
}
