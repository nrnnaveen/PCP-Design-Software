/**
 * Apex EDA - Dynamic Ratsnest Minimum Spanning Tree (MST) Generator
 * Computes shortest unrouted airwires between connected net pads.
 */

import { PCBData, Point2D } from '../core/types';

export interface RatsnestLine {
  id: string;
  netName: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export class RatsnestGenerator {
  public static generate(pcb: PCBData): RatsnestLine[] {
    const lines: RatsnestLine[] = [];

    // Group pad positions by Net Name
    const padsByNet: Map<string, Array<{ x: number; y: number; padId: string; fpRef: string }>> = new Map();

    pcb.footprints.forEach((fp) => {
      const rad = (fp.rotation * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      fp.pads.forEach((pad) => {
        if (!pad.netName || pad.netName.trim() === '') return;

        // Calculate absolute pad coordinate on PCB
        const rx = pad.x * cosR - pad.y * sinR;
        const ry = pad.x * sinR + pad.y * cosR;
        const absX = fp.x + rx;
        const absY = fp.y + ry;

        if (!padsByNet.has(pad.netName)) {
          padsByNet.set(pad.netName, []);
        }

        padsByNet.get(pad.netName)!.push({
          x: absX,
          y: absY,
          padId: pad.id,
          fpRef: fp.reference,
        });
      });
    });

    // For each net with >= 2 pads, compute Minimum Spanning Tree (MST)
    padsByNet.forEach((pads, netName) => {
      if (pads.length < 2) return;

      // Check which pads are already connected by existing copper tracks
      const isPadConnected = (p1: Point2D, p2: Point2D): boolean => {
        // Direct track connection check (within tolerance)
        return pcb.tracks.some((t) => {
          if (t.netName !== netName) return false;
          const d1 = Math.hypot(t.x1 - p1.x, t.y1 - p1.y);
          const d2 = Math.hypot(t.x2 - p2.x, t.y2 - p2.y);
          const d3 = Math.hypot(t.x1 - p2.x, t.y1 - p2.y);
          const d4 = Math.hypot(t.x2 - p1.x, t.y2 - p1.y);
          return (d1 < 0.8 && d2 < 0.8) || (d3 < 0.8 && d4 < 0.8);
        });
      };

      // Prim's MST Algorithm for remaining unrouted connections
      const inTree = new Array(pads.length).fill(false);
      inTree[0] = true;
      let connectedCount = 1;

      while (connectedCount < pads.length) {
        let minDist = Infinity;
        let bestU = -1;
        let bestV = -1;

        for (let u = 0; u < pads.length; u++) {
          if (!inTree[u]) continue;
          for (let v = 0; v < pads.length; v++) {
            if (inTree[v]) continue;

            const dist = Math.hypot(pads[u].x - pads[v].x, pads[u].y - pads[v].y);
            if (dist < minDist) {
              minDist = dist;
              bestU = u;
              bestV = v;
            }
          }
        }

        if (bestV !== -1 && bestU !== -1) {
          inTree[bestV] = true;
          connectedCount++;

          // If not already routed with tracks, emit ratsnest line
          if (!isPadConnected(pads[bestU], pads[bestV])) {
            lines.push({
              id: `rat_${netName}_${bestU}_${bestV}`,
              netName,
              x1: pads[bestU].x,
              y1: pads[bestU].y,
              x2: pads[bestV].x,
              y2: pads[bestV].y,
            });
          }
        } else {
          break;
        }
      }
    });

    return lines;
  }
}
