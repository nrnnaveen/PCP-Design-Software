/**
 * FloZ ECA - OpenRouter AI Provider Client (Phase 2)
 * Hardened client with AbortSignal cancellation, bounded exponential backoff, rate-limit UI notifications, and local fallback.
 */

import { ApexProject } from '../../core/types';
import { IAIProvider, ProviderResponse, ProviderCapabilities } from './aiProvider';
import { ChatMessage, FullEngineeringContext, ToolActivity, ActionProposal, AISettings } from '../types';
import { ContextBuilder } from '../contextBuilder';
import { LocalEngineeringEngine } from './localEngine';
import { ToolCallParser } from '../generation/toolCallParser';

export class OpenRouterProvider implements IAIProvider {
  public name = 'OpenRouter';
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsToolCalling: true,
      supportsCancellation: true,
      isOfflineCapable: false,
      isPrivateLocal: false,
    };
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
      return { ok: false, message: 'OpenRouter API Key is missing. Please enter your API key in Settings.' };
    }
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${this.settings.apiKey}` },
      });
      if (res.ok) {
        return { ok: true, message: 'OpenRouter API connection successful!' };
      }
      return { ok: false, message: `OpenRouter returned status ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { ok: false, message: `Failed to reach OpenRouter: ${err.message}` };
    }
  }

  public async listModels(): Promise<string[]> {
    return [
      'openrouter/free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'mistralai/mistral-7b-instruct:free',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
    ];
  }

  public async chatStream(
    messages: ChatMessage[],
    context: FullEngineeringContext,
    project: ApexProject,
    onChunk: (chunk: string) => void,
    onToolActivity: (activity: ToolActivity) => void,
    abortSignal?: AbortSignal
  ): Promise<ProviderResponse> {
    // If no API key provided, automatically run LocalEngineeringEngine
    if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
      onToolActivity({
        id: `act_${Date.now()}`,
        name: 'Local Engine Fallback',
        permission: 'ANALYZE',
        description: 'No OpenRouter API key found; running local offline engineering solver',
        status: 'completed',
      });
      return new LocalEngineeringEngine().chatStream(messages, context, project, onChunk, onToolActivity, abortSignal);
    }

    const contextText = ContextBuilder.formatContextPrompt(context);
    const systemPrompt = `You are FloZ AI, an expert electronic design automation (EDA) assistant for FloZ ECA.
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
    const maxAttempts = 2; // Bounded retry count

    while (attempts < maxAttempts) {
      if (abortSignal?.aborted) {
        throw new Error('Request was cancelled by user.');
      }

      try {
        onToolActivity({
          id: `act_${Date.now()}`,
          name: 'OpenRouter Request',
          permission: 'READ',
          description: `Sending prompt to ${this.settings.model || 'openrouter/free'}${attempts > 0 ? ` (Retry ${attempts})` : ''}`,
          status: 'running',
        });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.settings.apiKey}`,
            'HTTP-Referer': 'https://floz.eda',
            'X-Title': 'FloZ ECA',
          },
          body: JSON.stringify({
            model: this.settings.model || 'openrouter/free',
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
                description: `Rate limited. Retrying in ${attempts * 1.5}s...`,
                status: 'warning',
              });
              await new Promise((r) => setTimeout(r, attempts * 1500));
              continue;
            } else {
              onToolActivity({
                id: `act_${Date.now()}`,
                name: 'Rate Limit Reached',
                permission: 'READ',
                description: 'OpenRouter free rate limit reached; falling back to FloZ local engineering solver',
                status: 'warning',
              });
              return new LocalEngineeringEngine().chatStream(messages, context, project, onChunk, onToolActivity, abortSignal);
            }
          }
          throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        onToolActivity({
          id: `act_${Date.now()}`,
          name: 'Streaming Response',
          permission: 'READ',
          description: 'Receiving tokens from model',
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
