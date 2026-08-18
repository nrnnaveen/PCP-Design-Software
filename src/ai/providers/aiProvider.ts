/**
 * FloZ ECA - AI Provider Interface & Factory (Phase 2)
 * Provider abstraction supporting AbortSignal cancellation, capability discovery, and connection health checks.
 */

import { ApexProject } from '../../core/types';
import { AISettings, ChatMessage, ActionProposal, ToolActivity, FullEngineeringContext } from '../types';
import { LocalEngineeringEngine } from './localEngine';
import { OpenRouterProvider } from './openRouterProvider';
import { OllamaProvider } from './ollamaProvider';

export interface ProviderResponse {
  text: string;
  proposals?: ActionProposal[];
  toolActivities?: ToolActivity[];
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  supportsCancellation: boolean;
  isOfflineCapable: boolean;
  isPrivateLocal: boolean;
}

export interface IAIProvider {
  name: string;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  listModels(): Promise<string[]>;
  getCapabilities(): ProviderCapabilities;
  chatStream(
    messages: ChatMessage[],
    context: FullEngineeringContext,
    project: ApexProject,
    onChunk: (chunk: string) => void,
    onToolActivity: (activity: ToolActivity) => void,
    abortSignal?: AbortSignal
  ): Promise<ProviderResponse>;
}

export class AIProviderFactory {
  public static createProvider(settings: AISettings): IAIProvider {
    switch (settings.provider) {
      case 'openrouter':
        return new OpenRouterProvider(settings);
      case 'ollama':
        return new OllamaProvider(settings);
      case 'local':
      default:
        return new LocalEngineeringEngine();
    }
  }
}
