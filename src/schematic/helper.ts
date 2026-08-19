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
  SymbolGraphicShape,
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
  public static getSymbolBoundingBox(sym: SchematicSymbolInstance, customShapes?: SymbolGraphicShape[]): BoundingBox2D {
    let minX = sym.x - 5;
    let maxX = sym.x + 5;
    let minY = sym.y - 5;
    let maxY = sym.y + 5;

    // 1. Include all pin world endpoints and leads
    if (sym.pins && sym.pins.length > 0) {
      sym.pins.forEach((pin) => {
        const pinPos = this.getSymbolPinWorldPosition(sym, pin);
        minX = Math.min(minX, pinPos.x - 1.5);
        maxX = Math.max(maxX, pinPos.x + 1.5);
        minY = Math.min(minY, pinPos.y - 1.5);
        maxY = Math.max(maxY, pinPos.y + 1.5);
      });
    }

    // 2. Include shapes if available
    if (customShapes && customShapes.length > 0) {
      const symRad = (sym.rotation * Math.PI) / 180;
      const cos = Math.cos(symRad);
      const sin = Math.sin(symRad);

      const transformPt = (x: number, y: number): Point2D => {
        let px = sym.mirrorX ? -x : x;
        let py = y;
        return {
          x: sym.x + px * cos - py * sin,
          y: sym.y + px * sin + py * cos,
        };
      };

      customShapes.forEach((s) => {
        if (s.type === 'rectangle' && s.width && s.height) {
          const sx = s.x || 0;
          const sy = s.y || 0;
          const w2 = s.width / 2;
          const h2 = s.height / 2;
          const corners = [
            transformPt(sx - w2, sy - h2),
            transformPt(sx + w2, sy - h2),
            transformPt(sx + w2, sy + h2),
            transformPt(sx - w2, sy + h2),
          ];
          corners.forEach((c) => {
            minX = Math.min(minX, c.x);
            maxX = Math.max(maxX, c.x);
            minY = Math.min(minY, c.y);
            maxY = Math.max(maxY, c.y);
          });
        } else if ((s.type === 'line' || s.type === 'polygon' || s.type === 'bezier') && s.points) {
          s.points.forEach((p: Point2D) => {
            const tp = transformPt(p.x, p.y);
            minX = Math.min(minX, tp.x);
            maxX = Math.max(maxX, tp.x);
            minY = Math.min(minY, tp.y);
            maxY = Math.max(maxY, tp.y);
          });
        } else if (s.type === 'circle' && s.radius) {
          const tp = transformPt(s.x || 0, s.y || 0);
          minX = Math.min(minX, tp.x - s.radius);
          maxX = Math.max(maxX, tp.x + s.radius);
          minY = Math.min(minY, tp.y - s.radius);
          maxY = Math.max(maxY, tp.y + s.radius);
        } else if (s.type === 'arc' && s.radius) {
          const tp = transformPt(s.x || 0, s.y || 0);
          minX = Math.min(minX, tp.x - s.radius);
          maxX = Math.max(maxX, tp.x + s.radius);
          minY = Math.min(minY, tp.y - s.radius);
          maxY = Math.max(maxY, tp.y + s.radius);
        }
      });
    }

    return {
      minX: Math.round(minX * 10) / 10,
      maxX: Math.round(maxX * 10) / 10,
      minY: Math.round(minY * 10) / 10,
      maxY: Math.round(maxY * 10) / 10,
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
