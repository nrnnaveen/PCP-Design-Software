/**
 * FloZ ECA - Connection Planner
 * Generates orthogonal wire routing, net labels, and junctions between authoritative pin tip coordinates.
 */

import { Point2D, SchematicSymbolInstance, SchematicWireSegment, SchematicNetLabel, SchematicJunction } from '../../core/types';
import { SchematicHelper } from '../../schematic/helper';
import { PinResolver } from './pinResolver';
import { PlannedConnection } from './types';

export class ConnectionPlanner {
  /**
   * Routes orthogonal (Manhattan) wire segments between two endpoints
   */
  public static routeOrthogonalWire(p1: Point2D, p2: Point2D): SchematicWireSegment[] {
    const wires: SchematicWireSegment[] = [];

    // Direct horizontal or vertical wire
    if (Math.abs(p1.x - p2.x) < 0.1 || Math.abs(p1.y - p2.y) < 0.1) {
      wires.push({
        id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
      });
      return wires;
    }

    // Two-segment Manhattan routing (X first, then Y)
    const midX = p1.x + (p2.x - p1.x) / 2;

    wires.push({
      id: `w_${Date.now()}_h1_${Math.random().toString(36).substr(2, 4)}`,
      x1: p1.x,
      y1: p1.y,
      x2: midX,
      y2: p1.y,
    });

    wires.push({
      id: `w_${Date.now()}_v_${Math.random().toString(36).substr(2, 4)}`,
      x1: midX,
      y1: p1.y,
      x2: midX,
      y2: p2.y,
    });

    wires.push({
      id: `w_${Date.now()}_h2_${Math.random().toString(36).substr(2, 4)}`,
      x1: midX,
      y1: p2.y,
      x2: p2.x,
      y2: p2.y,
    });

    return wires;
  }

  /**
   * Plans all wires, net labels, and junctions for the circuit connections
   */
  public static planConnections(
    connections: PlannedConnection[],
    symbolMap: Map<string, SchematicSymbolInstance>
  ): { wires: SchematicWireSegment[]; labels: SchematicNetLabel[]; junctions: SchematicJunction[] } {
    const wires: SchematicWireSegment[] = [];
    const labels: SchematicNetLabel[] = [];
    const junctions: SchematicJunction[] = [];

    for (const conn of connections) {
      const fromSym = symbolMap.get(conn.from.componentId);
      const toSym = symbolMap.get(conn.to.componentId);

      if (!fromSym || !toSym) continue;

      const fromPin = PinResolver.resolvePin(fromSym as any, conn.from.pinNumberOrName);
      const toPin = PinResolver.resolvePin(toSym as any, conn.to.pinNumberOrName);

      if (!fromPin || !toPin) continue;

      const p1 = SchematicHelper.getSymbolPinWorldPosition(fromSym, fromPin);
      const p2 = SchematicHelper.getSymbolPinWorldPosition(toSym, toPin);

      // Route orthogonal wires
      const route = this.routeOrthogonalWire(p1, p2);
      wires.push(...route);

      // Add net label if named net
      if (conn.netName && conn.netName.trim() !== '') {
        let lblX = p1.x;
        let lblY = p1.y - 3;

        // Prevent label collision
        while (labels.some((l) => Math.hypot(l.x - lblX, l.y - lblY) < 7)) {
          lblX += 7;
          lblY += 4;
        }

        labels.push({
          id: `lbl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          text: conn.netName,
          x: lblX,
          y: lblY,
          type: conn.isPower ? 'global' : 'local',
          orientation: 0,
        });
      }
    }

    return { wires, labels, junctions };
  }
}
