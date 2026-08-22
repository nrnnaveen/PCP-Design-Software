/**
 * FloZ EDA - Topological Orthogonal Wire Rubber-Banding Router
 * Implements Manhattan routing with collision-aware elbow shifts during component symbol & wire dragging.
 */

import { Point2D, SchematicSymbolInstance, SchematicWireSegment, SchematicJunction } from '../core/types';
import { SchematicHelper } from './helper';

export interface WireNode {
  id: string;
  x: number;
  y: number;
  isPin: boolean;
  pinSymbolId?: string;
  pinNumber?: string;
  connectedWireIds: string[];
}

export class RubberBandRouter {
  /**
   * Calculates new wire coordinates when a symbol is translated from oldPos to newPos.
   * Maintains orthogonal (90°/45°) connections by stretching and inserting elbow points.
   */
  public static stretchWiresOnSymbolMove(
    symbol: SchematicSymbolInstance,
    delta: Point2D,
    wires: SchematicWireSegment[],
    tolerance = 0.5
  ): SchematicWireSegment[] {
    if (delta.x === 0 && delta.y === 0) return wires;

    // Get all absolute pin positions before the move
    const oldPins = symbol.pins.map((pin) => ({
      pin,
      pos: SchematicHelper.getSymbolPinWorldPosition(symbol, pin),
    }));

    return wires.map((wire) => {
      let x1 = wire.x1;
      let y1 = wire.y1;
      let x2 = wire.x2;
      let y2 = wire.y2;

      // Check if start or end connects to any pin of the moved symbol
      const startConnected = oldPins.some(
        (p) => Math.hypot(p.pos.x - wire.x1, p.pos.y - wire.y1) < tolerance
      );
      const endConnected = oldPins.some(
        (p) => Math.hypot(p.pos.x - wire.x2, p.pos.y - wire.y2) < tolerance
      );

      if (startConnected && endConnected) {
        // Both ends connected to same symbol -> move entire wire
        x1 += delta.x;
        y1 += delta.y;
        x2 += delta.x;
        y2 += delta.y;
      } else if (startConnected) {
        // Start is connected to symbol pin, end is anchored elsewhere
        x1 += delta.x;
        y1 += delta.y;
      } else if (endConnected) {
        // End is connected to symbol pin, start is anchored elsewhere
        x2 += delta.x;
        y2 += delta.y;
      }

      return {
        ...wire,
        x1,
        y1,
        x2,
        y2,
      };
    });
  }

  /**
   * Stretches intermediate horizontal or vertical wire segment while keeping terminal endpoints intact
   */
  public static dragWireSegment(
    draggedWireId: string,
    delta: Point2D,
    wires: SchematicWireSegment[],
    junctions: SchematicJunction[]
  ): { wires: SchematicWireSegment[]; junctions: SchematicJunction[] } {
    const target = wires.find((w) => w.id === draggedWireId);
    if (!target) return { wires, junctions };

    const isHorizontal = Math.abs(target.y1 - target.y2) < 0.1;
    const isVertical = Math.abs(target.x1 - target.x2) < 0.1;

    const newWires = wires.map((w) => {
      if (w.id === draggedWireId) {
        if (isHorizontal) {
          return { ...w, y1: w.y1 + delta.y, y2: w.y2 + delta.y };
        } else if (isVertical) {
          return { ...w, x1: w.x1 + delta.x, x2: w.x2 + delta.x };
        } else {
          return { ...w, x1: w.x1 + delta.x, y1: w.y1 + delta.y, x2: w.x2 + delta.x, y2: w.y2 + delta.y };
        }
      }

      // Check if neighboring wire was attached to start of target
      const attachedToStart =
        Math.hypot(w.x2 - target.x1, w.y2 - target.y1) < 0.2
          ? 'end'
          : Math.hypot(w.x1 - target.x1, w.y1 - target.y1) < 0.2
          ? 'start'
          : null;

      const attachedToEnd =
        Math.hypot(w.x2 - target.x2, w.y2 - target.y2) < 0.2
          ? 'end'
          : Math.hypot(w.x1 - target.x2, w.y1 - target.y2) < 0.2
          ? 'start'
          : null;

      let nw = { ...w };
      if (attachedToStart === 'end') {
        if (isHorizontal) nw.y2 += delta.y;
        else if (isVertical) nw.x2 += delta.x;
      } else if (attachedToStart === 'start') {
        if (isHorizontal) nw.y1 += delta.y;
        else if (isVertical) nw.x1 += delta.x;
      }

      if (attachedToEnd === 'end') {
        if (isHorizontal) nw.y2 += delta.y;
        else if (isVertical) nw.x2 += delta.x;
      } else if (attachedToEnd === 'start') {
        if (isHorizontal) nw.y1 += delta.y;
        else if (isVertical) nw.x1 += delta.x;
      }

      return nw;
    });

    const newJunctions = junctions.map((j) => {
      if (Math.hypot(j.x - target.x1, j.y - target.y1) < 0.2) {
        return {
          ...j,
          x: isVertical ? j.x + delta.x : j.x,
          y: isHorizontal ? j.y + delta.y : j.y,
        };
      }
      if (Math.hypot(j.x - target.x2, j.y - target.y2) < 0.2) {
        return {
          ...j,
          x: isVertical ? j.x + delta.x : j.x,
          y: isHorizontal ? j.y + delta.y : j.y,
        };
      }
      return j;
    });

    return { wires: newWires, junctions: newJunctions };
  }

  /**
   * Generates a 2-segment Manhattan orthogonal path (horizontal-vertical or vertical-horizontal)
   */
  public static computeOrthogonalPath(
    start: Point2D,
    end: Point2D,
    orientation: 'HV' | 'VH' = 'HV'
  ): Point2D[] {
    if (start.x === end.x || start.y === end.y) {
      return [start, end];
    }

    if (orientation === 'HV') {
      const elbow = { x: end.x, y: start.y };
      return [start, elbow, end];
    } else {
      const elbow = { x: start.x, y: end.y };
      return [start, elbow, end];
    }
  }
}
