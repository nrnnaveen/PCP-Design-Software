/**
 * FloZ ECA - Schematic Geometry & Math Helpers
 * Exact world-space pin calculations, bounding boxes, magnetic snapping, and auto-referencing.
 */

import {
  Point2D,
  SchematicSymbolInstance,
  SchematicPin,
  SchematicWireSegment,
  BoundingBox2D,
} from '../core/types';

export class SchematicHelper {
  /**
   * Calculates the exact world-space position of a symbol's pin connection tip.
   * Takes into account symbol position, rotation (0, 90, 180, 270), mirrorX,
   * pin base offset, pin length, and pin orientation.
   */
  public static getSymbolPinWorldPosition(
    sym: SchematicSymbolInstance,
    pin: SchematicPin
  ): Point2D {
    let px = pin.x;
    let py = pin.y;

    if (sym.mirrorX) {
      px = -px;
    }

    // Rotate pin base offset
    const symRad = (sym.rotation * Math.PI) / 180;
    const rx = px * Math.cos(symRad) - py * Math.sin(symRad);
    const ry = px * Math.sin(symRad) + py * Math.cos(symRad);

    // Calculate pin connection lead tip offset
    let pinOrient = pin.orientation || 0;
    if (sym.mirrorX) {
      if (pinOrient === 0) pinOrient = 180;
      else if (pinOrient === 180) pinOrient = 0;
    }
    const totalPinOrient = (pinOrient + sym.rotation) % 360;
    const pinRad = (totalPinOrient * Math.PI) / 180;
    const pinLen = pin.length !== undefined ? pin.length : 3.81;

    const tipOffsetX = Math.cos(pinRad) * pinLen;
    const tipOffsetY = Math.sin(pinRad) * pinLen;

    return {
      x: Math.round((sym.x + rx + tipOffsetX) * 1000) / 1000,
      y: Math.round((sym.y + ry + tipOffsetY) * 1000) / 1000,
    };
  }

  /**
   * Calculates world-space bounding box for a schematic symbol instance.
   */
  public static getSymbolBoundingBox(sym: SchematicSymbolInstance): BoundingBox2D {
    const hw = 12.0;
    const hh = Math.max(12.0, (sym.pins.length * 3.5) / 2);
    return {
      minX: sym.x - hw,
      maxX: sym.x + hw,
      minY: sym.y - hh,
      maxY: sym.y + hh,
    };
  }

  /**
   * Finds the closest symbol pin to a given world coordinate within a max snap distance.
   */
  public static findClosestPin(
    point: Point2D,
    symbols: SchematicSymbolInstance[],
    maxDistance = 2.5
  ): {
    pin: SchematicPin;
    symbol: SchematicSymbolInstance;
    worldPos: Point2D;
    distance: number;
  } | null {
    let closest: {
      pin: SchematicPin;
      symbol: SchematicSymbolInstance;
      worldPos: Point2D;
      distance: number;
    } | null = null;
    let minDist = maxDistance;

    for (const sym of symbols) {
      for (const pin of sym.pins) {
        const pinPos = this.getSymbolPinWorldPosition(sym, pin);
        const dist = Math.hypot(point.x - pinPos.x, point.y - pinPos.y);
        if (dist <= minDist) {
          minDist = dist;
          closest = {
            pin,
            symbol: sym,
            worldPos: pinPos,
            distance: dist,
          };
        }
      }
    }

    return closest;
  }

  /**
   * Finds the closest wire endpoint to a given world coordinate.
   */
  public static findClosestWireEndpoint(
    point: Point2D,
    wires: SchematicWireSegment[],
    maxDistance = 2.0
  ): {
    wire: SchematicWireSegment;
    point: Point2D;
    isStart: boolean;
    distance: number;
  } | null {
    let closest: {
      wire: SchematicWireSegment;
      point: Point2D;
      isStart: boolean;
      distance: number;
    } | null = null;
    let minDist = maxDistance;

    for (const wire of wires) {
      const d1 = Math.hypot(point.x - wire.x1, point.y - wire.y1);
      if (d1 < minDist) {
        minDist = d1;
        closest = {
          wire,
          point: { x: wire.x1, y: wire.y1 },
          isStart: true,
          distance: d1,
        };
      }

      const d2 = Math.hypot(point.x - wire.x2, point.y - wire.y2);
      if (d2 < minDist) {
        minDist = d2;
        closest = {
          wire,
          point: { x: wire.x2, y: wire.y2 },
          isStart: false,
          distance: d2,
        };
      }
    }

    return closest;
  }

  /**
   * Generates the next unused reference designator for a component prefix (e.g. R1, R2, C1, U1).
   */
  public static getNextReference(
    prefix: string,
    existingSymbols: SchematicSymbolInstance[]
  ): string {
    const cleanPrefix = (prefix || 'U').replace(/[^a-zA-Z]/g, '') || 'U';
    const usedNumbers = new Set<number>();

    const regex = new RegExp(`^${cleanPrefix}(\\d+)$`);
    existingSymbols.forEach((s) => {
      const match = s.reference.match(regex);
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    });

    let nextNum = 1;
    while (usedNumbers.has(nextNum)) {
      nextNum++;
    }

    return `${cleanPrefix}${nextNum}`;
  }
}
