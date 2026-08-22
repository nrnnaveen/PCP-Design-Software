/**
 * FloZ EDA - Copper Zone Pour Finite State Machine (ZONE_TOOL_FSM)
 * Ensures non-destructive point placement, single-vertex undo, loop closure, and polygon clipping.
 */

import { Point2D, PCBLayerId, PCBZone, DesignRules } from '../core/types';
import { ToolLifecycleState } from '../core/toolManager';
import { ZoneEngine } from './zoneEngine';

export interface ZoneFSMState {
  state: ToolLifecycleState;
  vertices: Point2D[];
  activeLayer: PCBLayerId;
  netName: string;
  cursorPos: Point2D | null;
}

export class ZoneToolFSM {
  private vertices: Point2D[] = [];
  private activeLayer: PCBLayerId = 'F.Cu';
  private netName = 'GND';
  private cursorPos: Point2D | null = null;
  private state: ToolLifecycleState = 'IDLE';

  constructor(activeLayer: PCBLayerId = 'F.Cu', netName = 'GND') {
    this.activeLayer = activeLayer;
    this.netName = netName;
  }

  public getState(): ToolLifecycleState {
    return this.state;
  }

  public getVertices(): Point2D[] {
    return [...this.vertices];
  }

  public setLayer(layer: PCBLayerId): void {
    this.activeLayer = layer;
  }

  public setNet(net: string): void {
    this.netName = net;
  }

  public updateCursor(pos: Point2D): void {
    this.cursorPos = pos;
  }

  /**
   * Single-click adds a vertex to the active polygon
   */
  public addVertex(point: Point2D): { committed: boolean; zone?: PCBZone } {
    // Check if clicking near the starting vertex to close the loop (if >= 3 points)
    if (this.vertices.length >= 3) {
      const start = this.vertices[0];
      const dist = Math.hypot(point.x - start.x, point.y - start.y);
      if (dist < 1.0) {
        return this.commit();
      }
    }

    this.vertices.push({ ...point });
    this.state = 'IN_PROGRESS';
    return { committed: false };
  }

  /**
   * Backspace / Delete: Undo only the immediately preceding vertex
   */
  public undoLastVertex(): boolean {
    if (this.vertices.length > 0) {
      this.vertices.pop();
      if (this.vertices.length === 0) {
        this.state = 'IDLE';
      }
      return true;
    }
    return false;
  }

  /**
   * Escape key: cancel only the current in-progress segment without destroying completed zones
   */
  public cancelCurrent(): void {
    this.vertices = [];
    this.cursorPos = null;
    this.state = 'IDLE';
  }

  /**
   * Commit the polygon boundary (double-click, right-click, or close-loop)
   */
  public commit(): { committed: boolean; zone?: PCBZone } {
    if (this.vertices.length < 3) {
      return { committed: false };
    }

    const zone: PCBZone = {
      id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      netId: `net_${this.netName.toLowerCase()}`,
      netName: this.netName,
      layer: this.activeLayer,
      priority: 1,
      clearance: 0.3,
      minWidth: 0.25,
      thermalReliefWidth: 0.3,
      thermalReliefGap: 0.3,
      points: [...this.vertices],
      isFilled: true,
      keepIslands: false,
    };

    this.vertices = [];
    this.cursorPos = null;
    this.state = 'COMMITTED';

    return { committed: true, zone };
  }
}
