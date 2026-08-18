/**
 * FloZ ECA - Local Ollama Provider Client (Phase 2)
 * Connects to local Ollama daemon for private offline LLM inference with AbortSignal cancellation.
 */

import { ApexProject } from '../../core/types';
import { IAIProvider, ProviderResponse, ProviderCapabilities } from './aiProvider';
import { ChatMessage, FullEngineeringContext, ToolActivity, AISettings } from '../types';
import { ContextBuilder } from '../contextBuilder';
import { LocalEngineeringEngine } from './localEngine';
import { ToolCallParser } from '../generation/toolCallParser';

export class OllamaProvider implements IAIProvider {
  public name = 'Ollama (Local)';
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  private get endpoint(): string {
    return this.settings.baseUrl || 'http://localhost:11434';
  }

  public getCapabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsToolCalling: true,
      supportsCancellation: true,
      isOfflineCapable: true,
      isPrivateLocal: true,
    };
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`);
      if (res.ok) {
        const json = await res.json();
        const count = json.models?.length || 0;
        return { ok: true, message: `Ollama is running with ${count} installed model(s).` };
      }
      return { ok: false, message: `Ollama endpoint returned status ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `Cannot connect to Ollama at ${this.endpoint}. Ensure ollama is running.` };
    }
  }

  public async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.endpoint}/api/tags`);
      if (res.ok) {
        const json = await res.json();
        return (json.models || []).map((m: any) => m.name);
      }
    } catch {}
    return ['llama3:latest', 'mistral:latest', 'qwen2.5-coder:latest', 'codellama:latest'];
  }

  public async chatStream(
    messages: ChatMessage[],
    context: FullEngineeringContext,
    project: ApexProject,
    onChunk: (chunk: string) => void,
    onToolActivity: (activity: ToolActivity) => void,
    abortSignal?: AbortSignal
  ): Promise<ProviderResponse> {
    const contextText = ContextBuilder.formatContextPrompt(context);
    const systemPrompt = `You are FloZ AI, a professional electronic design automation (EDA) assistant for FloZ ECA.
Always format engineering answers with standard headers:
## Finding
(Concise summary)
## Evidence
(Specific references, pins, coordinates from context)
## Recommendation
(Actionable engineering advice)

Current Project Context:
${contextText}`;

    try {
      if (abortSignal?.aborted) {
        throw new Error('Request was cancelled.');
      }

      onToolActivity({
        id: `act_${Date.now()}`,
        name: 'Ollama Request',
        permission: 'READ',
        description: `Querying local model ${this.settings.model || 'llama3'}`,
        status: 'running',
      });

      const res = await fetch(`${this.endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.settings.model || 'llama3',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
        signal: abortSignal,
      });

      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}: ${res.statusText}`);
      }

      let fullText = '';
      const reader = res.body?.getReader();
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
            const raw = decoder.decode(value);
            const lines = raw.split('\n').filter((l) => l.trim().length > 0);
            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                const token = json.message?.content || '';
                if (token) {
                  fullText += token;
                  onChunk(token);
                }
              } catch {}
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
      console.warn('Ollama streaming failed, using local offline engine:', err);
      onToolActivity({
        id: `act_${Date.now()}`,
        name: 'Ollama Offline',
        permission: 'ANALYZE',
        description: `Ollama unavailable (${err.message}). Using local rule engine.`,
        status: 'warning',
      });
      return new LocalEngineeringEngine().chatStream(messages, context, project, onChunk, onToolActivity, abortSignal);
    }
  }
}
