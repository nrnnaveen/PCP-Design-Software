/**
 * FloZ ECA - AI Assistant & Copilot Type Definitions (Phase 2)
 * Robust data structures for tool permissions, context scoping, action validation, and circuit generation.
 */

import { ApexProject, Point2D } from '../core/types';

export type AIProviderType = 'openrouter' | 'ollama' | 'custom' | 'local';

export type FloZModelId = 'floz-super' | 'floz-ultra';

export interface FloZModelDefinition {
  id: FloZModelId;
  name: string;
  backendModel: string;
  badge: string;
  tagline: string;
  description: string;
}

export const FLOZ_AI_MODELS: FloZModelDefinition[] = [
  {
    id: 'floz-super',
    name: 'FloZ Super',
    backendModel: 'nvidia/nemotron-3-super-120b-a12b:free',
    badge: 'Super',
    tagline: 'Fast & Deterministic',
    description: 'Interactive circuit synthesis, net analysis & instant ERC validation',
  },
  {
    id: 'floz-ultra',
    name: 'FloZ Ultra',
    backendModel: 'nvidia/nemtron-4-340b-instruct',
    badge: 'Ultra',
    tagline: 'Deep Reasoning',
    description: 'Complex multi-sheet EDA architecture, autorouting & deep DRC solving',
  },
];

export function getFloZAIKey(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (import.meta.env.VITE_OPENROUTER_API_KEY) return import.meta.env.VITE_OPENROUTER_API_KEY;
      if (import.meta.env.VITE_FLOZ_AI_API_KEY) return import.meta.env.VITE_FLOZ_AI_API_KEY;
      if (import.meta.env.VITE_AI_API_KEY) return import.meta.env.VITE_AI_API_KEY;
      if (import.meta.env.OPENROUTER_API_KEY) return import.meta.env.OPENROUTER_API_KEY;
    }
  } catch {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
      if (process.env.VITE_OPENROUTER_API_KEY) return process.env.VITE_OPENROUTER_API_KEY;
      if (process.env.FLOZ_AI_API_KEY) return process.env.FLOZ_AI_API_KEY;
    }
  } catch {}

  try {
    const saved = localStorage.getItem('floz_ai_api_key');
    if (saved && saved.trim()) return saved.trim();
  } catch {}

  return '';
}

export type ToolPermission = 'READ' | 'ANALYZE' | 'VISUALIZE' | 'MUTATE' | 'DESTRUCTIVE';

export type ContextLevel = 'minimal' | 'schematic' | 'pcb' | 'diagnostic' | 'full';

export interface AISettings {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature: number;
  contextLevel: ContextLevel;
  attachContext: {
    schematic: boolean;
    pcb: boolean;
    erc: boolean;
    drc: boolean;
    selection: boolean;
  };
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openrouter',
  apiKey: '',
  model: 'floz-super',
  baseUrl: 'https://openrouter.ai/api/v1',
  temperature: 0.15, // Low temperature preferred for deterministic engineering
  contextLevel: 'full',
  attachContext: {
    schematic: true,
    pcb: true,
    erc: true,
    drc: true,
    selection: true,
  },
};

export type ActionCategory =
  | 'place_symbol'
  | 'move_symbol'
  | 'rotate_symbol'
  | 'delete_symbol'
  | 'create_wire'
  | 'delete_wire'
  | 'add_decoupling_cap'
  | 'voltage_divider'
  | 'rc_filter'
  | 'i2c_pullups'
  | 'led_circuit'
  | 'full_circuit_generation'
  | 'full_circuit_pcb_generation'
  | 'auto_route'
  | 'sync_schematic_to_pcb'
  | 'create_zone'
  | 'auto_fix_diagnostics'
  | 'connector_header'
  | 'connect_pins'
  | 'change_value'
  | 'change_reference'
  | 'assign_footprint'
  | 'create_net_label'
  | 'delete_net_label'
  | 'place_footprint'
  | 'create_track'
  | 'create_via';

export interface ActionDiff {
  addedComponents?: Array<{ reference: string; value: string; footprint?: string; position: Point2D }>;
  modifiedComponents?: Array<{ reference: string; field: string; oldValue: any; newValue: any }>;
  removedComponents?: string[];
  addedWires?: Array<{ from: string; to: string; netName?: string }>;
  removedWires?: string[];
  connectedNets?: string[];
  notes?: string[];
}

export interface ValidationResult {
  valid: boolean;
  isValid?: boolean;
  issues: string[];
  warnings: string[];
  ercImpact?: string;
}

export interface ActionProposal {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  permission: ToolPermission;
  diff: ActionDiff;
  status: 'pending' | 'applied' | 'rejected' | 'invalid';
  validation?: ValidationResult;
  applyAction: (project: ApexProject) => ApexProject;
}

export interface ToolActivity {
  id: string;
  name: string;
  permission: ToolPermission;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'warning';
  outputSnippet?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  proposals?: ActionProposal[];
  toolActivities?: ToolActivity[];
  isStreaming?: boolean;
}

export interface SchematicSummaryContext {
  componentCount: number;
  components: Array<{
    reference: string;
    value: string;
    footprint: string;
    category?: string;
    position: { x: number; y: number };
    pins: Array<{ number: string; name: string; electricalType: string }>;
  }>;
  nets: Array<{
    name: string;
    isPower: boolean;
    pinCount: number;
    pins: string[]; // e.g. ["U1:1", "C1:1"]
  }>;
  labels: string[];
  powerRails: string[];
  ercViolations: Array<{ code: string; severity: string; title: string; description: string; x: number; y: number }>;
}

export interface PCBSummaryContext {
  boardDimensions: { width: number; height: number };
  layersCount: number;
  footprintCount: number;
  footprints: Array<{ reference: string; value: string; footprint: string; layer: string; position: { x: number; y: number } }>;
  trackCount: number;
  viaCount: number;
  zoneCount: number;
  drcViolations: Array<{ code: string; title: string; description: string; x: number; y: number }>;
}

export interface FullEngineeringContext {
  projectName: string;
  units: string;
  activeSheetTitle: string;
  selectedObject?: {
    type: 'symbol' | 'wire' | 'footprint' | 'net';
    id: string;
    reference?: string;
    netName?: string;
    details: any;
  };
  schematic?: SchematicSummaryContext;
  pcb?: PCBSummaryContext;
}
