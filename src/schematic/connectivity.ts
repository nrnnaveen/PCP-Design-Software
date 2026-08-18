/**
 * FloZ ECA - Dynamic Schematic Net Connectivity Solver
 * Solves electrical graph topology from geometric intersections, junctions, labels, and pins.
 */

import {
  SchematicSheet,
  NetGraph,
  NetNode,
  NetPinRef,
  Point2D,
} from '../core/types';
import { SchematicHelper } from './helper';

export interface ConnectivityAnalysisResult {
  netGraph: NetGraph;
  danglingWires: Array<{ wireId: string; point: Point2D }>;
  unconnectedPins: Array<{ symbolId: string; symbolRef: string; pinNumber: string; pinName: string; point: Point2D }>;
  orphanJunctions: Array<{ junctionId: string; point: Point2D }>;
}

export class NetConnectivitySolver {
  public static ptKey(x: number, y: number, tolerance = 0.15): string {
    const rx = Math.round(x / tolerance) * tolerance;
    const ry = Math.round(y / tolerance) * tolerance;
    return `${rx.toFixed(2)},${ry.toFixed(2)}`;
  }

  public static solveSheet(sheet: SchematicSheet): ConnectivityAnalysisResult {
    // 1. Calculate authoritative absolute positions of all symbol pins
    interface ResolvedPin {
      symbolId: string;
      symbolRef: string;
      pinNumber: string;
      pinName: string;
      electricalType: string;
      point: Point2D;
      key: string;
    }

    const allPins: ResolvedPin[] = [];
    sheet.symbols.forEach((sym) => {
      sym.pins.forEach((pin) => {
        const pinPos = SchematicHelper.getSymbolPinWorldPosition(sym, pin);
        const key = this.ptKey(pinPos.x, pinPos.y);

        allPins.push({
          symbolId: sym.id,
          symbolRef: sym.reference,
          pinNumber: pin.number,
          pinName: pin.name,
          electricalType: pin.electricalType,
          point: pinPos,
          key,
        });
      });
    });

    // 2. Disjoint Set / Union-Find for node connectivity
    const parent: Map<string, string> = new Map();
    const find = (i: string): string => {
      if (!parent.has(i)) parent.set(i, i);
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i)!);
      parent.set(i, root);
      return root;
    };

    const union = (i: string, j: string) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent.set(rootI, rootJ);
      }
    };

    // 3. Connect wire endpoints
    sheet.wires.forEach((wire) => {
      const k1 = this.ptKey(wire.x1, wire.y1);
      const k2 = this.ptKey(wire.x2, wire.y2);
      union(k1, k2);
    });

    // 3b. Connect wires that intersect at explicit junctions
    sheet.junctions.forEach((junc) => {
      const jKey = this.ptKey(junc.x, junc.y);
      sheet.wires.forEach((wire) => {
        // Check if junction lies on wire segment
        const isStart = Math.hypot(wire.x1 - junc.x, wire.y1 - junc.y) < 0.2;
        const isEnd = Math.hypot(wire.x2 - junc.x, wire.y2 - junc.y) < 0.2;
        if (isStart || isEnd) {
          union(jKey, this.ptKey(wire.x1, wire.y1));
        } else {
          // Check if colinear along segment
          const minX = Math.min(wire.x1, wire.x2) - 0.2;
          const maxX = Math.max(wire.x1, wire.x2) + 0.2;
          const minY = Math.min(wire.y1, wire.y2) - 0.2;
          const maxY = Math.max(wire.y1, wire.y2) + 0.2;

          if (junc.x >= minX && junc.x <= maxX && junc.y >= minY && junc.y <= maxY) {
            const cross = Math.abs((wire.y2 - wire.y1) * junc.x - (wire.x2 - wire.x1) * junc.y + wire.x2 * wire.y1 - wire.y2 * wire.x1);
            const len = Math.hypot(wire.x2 - wire.x1, wire.y2 - wire.y1);
            if (len > 0 && cross / len < 0.2) {
              union(jKey, this.ptKey(wire.x1, wire.y1));
            }
          }
        }
      });
    });

    // 4. Map labels & power symbols to points
    const netLabelsByPoint: Map<string, string[]> = new Map();
    sheet.labels.forEach((lbl) => {
      const key = this.ptKey(lbl.x, lbl.y);
      if (!netLabelsByPoint.has(key)) netLabelsByPoint.set(key, []);
      netLabelsByPoint.get(key)!.push(lbl.text);
    });

    sheet.powerSymbols.forEach((pwr) => {
      const key = this.ptKey(pwr.x, pwr.y);
      if (!netLabelsByPoint.has(key)) netLabelsByPoint.set(key, []);
      netLabelsByPoint.get(key)!.push(pwr.netName);
    });

    // 5. Group pins and labels into connected components (nets)
    const netGroups: Map<string, { pins: NetPinRef[]; labels: string[]; isPower: boolean }> = new Map();

    allPins.forEach((pin) => {
      const rootKey = find(pin.key);
      if (!netGroups.has(rootKey)) {
        netGroups.set(rootKey, { pins: [], labels: [], isPower: false });
      }
      netGroups.get(rootKey)!.pins.push({
        symbolId: pin.symbolId,
        symbolRef: pin.symbolRef,
        pinNumber: pin.pinNumber,
        pinName: pin.pinName,
      });
    });

    // Add labels to respective roots
    netLabelsByPoint.forEach((labels, ptKey) => {
      const rootKey = find(ptKey);
      if (!netGroups.has(rootKey)) {
        netGroups.set(rootKey, { pins: [], labels: [], isPower: false });
      }
      netGroups.get(rootKey)!.labels.push(...labels);
    });

    // Also connect nets with identical global labels across disjoint wires
    const labelToRootMap: Map<string, string> = new Map();
    netGroups.forEach((group, rootKey) => {
      group.labels.forEach((lbl) => {
        if (labelToRootMap.has(lbl)) {
          union(rootKey, labelToRootMap.get(lbl)!);
        } else {
          labelToRootMap.set(lbl, rootKey);
        }
      });
    });

    // Final consolidated nets
    const finalNets: Record<string, NetNode> = {};
    const processedRoots: Set<string> = new Set();

    netGroups.forEach((_, initialRoot) => {
      const actualRoot = find(initialRoot);
      if (processedRoots.has(actualRoot)) return;
      processedRoots.add(actualRoot);

      // Collect all pins and labels sharing this final root
      const combinedPins: NetPinRef[] = [];
      const combinedLabels: string[] = [];

      netGroups.forEach((group, rKey) => {
        if (find(rKey) === actualRoot) {
          combinedPins.push(...group.pins);
          combinedLabels.push(...group.labels);
        }
      });

      if (combinedPins.length === 0 && combinedLabels.length === 0) return;

      // Determine authoritative net name
      let netName = '';
      let isPower = false;

      // Priority: Power names -> Labels -> Auto Generated
      const powerLabel = combinedLabels.find((l) =>
        ['GND', 'VCC', 'VDD', 'VSS', '+3.3V', '+5V', '+12V', 'VBUS', 'VBAT', '3V3', '5V'].includes(l)
      );

      if (powerLabel) {
        netName = powerLabel;
        isPower = true;
      } else if (combinedLabels.length > 0) {
        netName = combinedLabels[0];
      } else if (combinedPins.length > 0) {
        netName = `Net-(${combinedPins[0].symbolRef}-Pad${combinedPins[0].pinNumber})`;
      } else {
        netName = `Net-(Unconnected_${Math.random().toString(36).substr(2, 4)})`;
      }

      // Check if power rail
      if (['GND', 'VCC', 'VDD', 'VSS', '+3.3V', '+5V', '+12V', 'VBUS', 'VBAT'].includes(netName)) {
        isPower = true;
      }

      // De-duplicate pins
      const uniquePins: NetPinRef[] = [];
      const pinSignatures = new Set<string>();
      combinedPins.forEach((p) => {
        const sig = `${p.symbolRef}:${p.pinNumber}`;
        if (!pinSignatures.has(sig)) {
          pinSignatures.add(sig);
          uniquePins.push(p);
        }
      });

      finalNets[netName] = {
        id: `net_${netName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
        name: netName,
        isPower,
        pins: uniquePins,
        pads: [],
        netClass: isPower ? 'Power' : 'Default',
      };
    });

    // 6. ERC Pre-diagnostics: Dangling wires, unconnected pins, orphan junctions
    const unconnectedPins: ConnectivityAnalysisResult['unconnectedPins'] = [];
    allPins.forEach((pin) => {
      if (pin.electricalType === 'not_connected') return;
      const rootKey = find(pin.key);
      const group = netGroups.get(rootKey);
      const isConnected = group && (group.pins.length > 1 || group.labels.length > 0);
      if (!isConnected) {
        unconnectedPins.push({
          symbolId: pin.symbolId,
          symbolRef: pin.symbolRef,
          pinNumber: pin.pinNumber,
          pinName: pin.pinName,
          point: pin.point,
        });
      }
    });

    const orphanJunctions: ConnectivityAnalysisResult['orphanJunctions'] = [];
    sheet.junctions.forEach((junc) => {
      const key = this.ptKey(junc.x, junc.y);
      let hitCount = 0;
      sheet.wires.forEach((w) => {
        if (this.ptKey(w.x1, w.y1) === key || this.ptKey(w.x2, w.y2) === key) {
          hitCount++;
        }
      });
      if (hitCount < 2) {
        orphanJunctions.push({ junctionId: junc.id, point: { x: junc.x, y: junc.y } });
      }
    });

    return {
      netGraph: { nets: finalNets },
      danglingWires: [],
      unconnectedPins,
      orphanJunctions,
    };
  }
}
