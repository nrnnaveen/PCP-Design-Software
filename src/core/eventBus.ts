/**
 * Apex EDA - Global Cross-Probing Event Bus
 * Synchronizes selection, focus, navigation, and cross-probing across editors.
 */

export type EDAEventType =
  | 'SELECT_SYMBOL'
  | 'SELECT_FOOTPRINT'
  | 'SELECT_NET'
  | 'CROSS_PROBE'
  | 'NAVIGATE_TO_COORDS'
  | 'HIGHLIGHT_VIOLATION'
  | 'REQUEST_PCB_SYNC'
  | 'REQUEST_SIMULATION_PROBE'
  | 'PROJECT_MODIFIED'
  | 'ACTIVE_LAYER_CHANGED'
  | 'TOOL_CHANGED';

export interface EDAEventPayload {
  SELECT_SYMBOL: { symbolId?: string; reference?: string; sheetId?: string };
  SELECT_FOOTPRINT: { footprintId?: string; reference?: string };
  SELECT_NET: { netName: string };
  CROSS_PROBE: { source: 'schematic' | 'pcb' | '3d' | 'erc' | 'drc'; reference?: string; netName?: string; x?: number; y?: number };
  NAVIGATE_TO_COORDS: { editor: 'schematic' | 'pcb' | 'gerber'; x: number; y: number; zoom?: number };
  HIGHLIGHT_VIOLATION: { violationId: string; x: number; y: number; objectIds: string[] };
  REQUEST_PCB_SYNC: void;
  REQUEST_SIMULATION_PROBE: { netName: string; type: 'voltage' | 'current' };
  PROJECT_MODIFIED: { actionName: string };
  ACTIVE_LAYER_CHANGED: { layerId: string };
  TOOL_CHANGED: { tool: string };
}

type Callback<T> = (data: T) => void;

class EDAEventBus {
  private listeners: Map<EDAEventType, Set<Callback<any>>> = new Map();

  public on<K extends EDAEventType>(event: K, callback: Callback<EDAEventPayload[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unbind function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public emit<K extends EDAEventType>(event: K, payload?: EDAEventPayload[K]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      });
    }
  }
}

export const eventBus = new EDAEventBus();
