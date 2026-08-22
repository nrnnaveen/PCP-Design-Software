/**
 * FloZ EDA - KiCad-Style Model-Tool-View (MTV) ToolManager & FSM Engine
 * Provides an isolated finite state machine for interactive operations (Routing, Wire Drawing,
 * Selection, Component Transforms, Zone Pours, and CAD Drawing).
 */

import { Point2D } from './types';

export type ToolLifecycleState = 'IDLE' | 'IN_PROGRESS' | 'SUSPENDED' | 'COMMITTED';

export interface ToolEventContext {
  screenPos: Point2D;
  worldPos: Point2D;
  snappedWorldPos: Point2D;
  button: number;
  buttons: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  key?: string;
  rawEvent?: MouseEvent | KeyboardEvent;
}

export interface EditorTool<TContext = any> {
  readonly id: string;
  readonly name: string;
  readonly cursor: string;
  getState(): ToolLifecycleState;
  activate(context?: TContext): void;
  deactivate(): void;
  onMouseDown(event: ToolEventContext, context: TContext): boolean | void;
  onMouseMove(event: ToolEventContext, context: TContext): boolean | void;
  onMouseUp(event: ToolEventContext, context: TContext): boolean | void;
  onKeyDown(event: ToolEventContext, context: TContext): boolean | void;
  onRenderOverlay?(ctx: CanvasRenderingContext2D, context: TContext): void;
  commit(context: TContext): void;
  cancel(context: TContext): void;
}

export class ToolManager<TContext = any> {
  private tools: Map<string, EditorTool<TContext>> = new Map();
  private activeTool: EditorTool<TContext> | null = null;
  private defaultToolId = 'select';
  private listeners: Array<(toolId: string, state: ToolLifecycleState) => void> = [];

  public registerTool(tool: EditorTool<TContext>): void {
    this.tools.set(tool.id, tool);
  }

  public setDefaultTool(toolId: string): void {
    this.defaultToolId = toolId;
  }

  public getActiveTool(): EditorTool<TContext> | null {
    return this.activeTool;
  }

  public getActiveToolId(): string {
    return this.activeTool ? this.activeTool.id : this.defaultToolId;
  }

  public getActiveState(): ToolLifecycleState {
    return this.activeTool ? this.activeTool.getState() : 'IDLE';
  }

  public setTool(toolId: string, context?: TContext): EditorTool<TContext> | null {
    if (this.activeTool && this.activeTool.id === toolId) {
      return this.activeTool;
    }

    if (this.activeTool) {
      this.activeTool.deactivate();
    }

    const nextTool = this.tools.get(toolId) || this.tools.get(this.defaultToolId) || null;
    this.activeTool = nextTool;

    if (this.activeTool) {
      this.activeTool.activate(context);
      this.notifyStateChange();
    }

    return this.activeTool;
  }

  public resetToDefault(context?: TContext): void {
    this.setTool(this.defaultToolId, context);
  }

  public onMouseDown(event: ToolEventContext, context: TContext): boolean {
    if (!this.activeTool) return false;
    const handled = this.activeTool.onMouseDown(event, context);
    this.notifyStateChange();
    return !!handled;
  }

  public onMouseMove(event: ToolEventContext, context: TContext): boolean {
    if (!this.activeTool) return false;
    const handled = this.activeTool.onMouseMove(event, context);
    return !!handled;
  }

  public onMouseUp(event: ToolEventContext, context: TContext): boolean {
    if (!this.activeTool) return false;
    const handled = this.activeTool.onMouseUp(event, context);
    this.notifyStateChange();
    return !!handled;
  }

  public onKeyDown(event: ToolEventContext, context: TContext): boolean {
    if (!this.activeTool) return false;
    const handled = this.activeTool.onKeyDown(event, context);
    this.notifyStateChange();
    return !!handled;
  }

  public cancelActive(context: TContext): void {
    if (this.activeTool) {
      this.activeTool.cancel(context);
      this.notifyStateChange();
    }
  }

  public commitActive(context: TContext): void {
    if (this.activeTool) {
      this.activeTool.commit(context);
      this.notifyStateChange();
    }
  }

  public subscribe(listener: (toolId: string, state: ToolLifecycleState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyStateChange(): void {
    if (!this.activeTool) return;
    const id = this.activeTool.id;
    const state = this.activeTool.getState();
    this.listeners.forEach((l) => l(id, state));
  }
}
