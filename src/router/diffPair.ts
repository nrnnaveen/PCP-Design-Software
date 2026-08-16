/**
 * Apex EDA - Coupled Differential Pair Routing Engine
 * Routes parallel matched-impedance positive and negative traces with constant gap and skew tuning.
 */

import { Point2D } from '../core/types';
import { RouteSegment, InteractiveRouter } from './router';

export interface DiffPairRouteResult {
  pSegments: RouteSegment[];
  nSegments: RouteSegment[];
  pLength: number;
  nLength: number;
  skewMm: number;
}

export class DiffPairRouter {
  public static computeDiffPair(
    pStart: Point2D,
    nStart: Point2D,
    pEnd: Point2D,
    gap: number = 0.2, // gap between trace edges in mm
    width: number = 0.2,
    posture: 0 | 1 = 0
  ): DiffPairRouteResult {
    // Route Primary Positive Line
    const pSegments = InteractiveRouter.compute45DegreePath(pStart, pEnd, posture);

    // Calculate center offset vector from P to N
    const offsetDist = width + gap;
    const dx = nStart.x - pStart.x;
    const dy = nStart.y - pStart.y;
    const dLen = Math.hypot(dx, dy) || 1;
    const ox = (dx / dLen) * offsetDist;
    const oy = (dy / dLen) * offsetDist;

    // Parallel Negative Trace
    const nSegments: RouteSegment[] = pSegments.map((s) => ({
      x1: s.x1 + ox,
      y1: s.y1 + oy,
      x2: s.x2 + ox,
      y2: s.y2 + oy,
    }));

    let pLen = 0;
    pSegments.forEach((s) => (pLen += Math.hypot(s.x2 - s.x1, s.y2 - s.y1)));

    let nLen = 0;
    nSegments.forEach((s) => (nLen += Math.hypot(s.x2 - s.x1, s.y2 - s.y1)));

    return {
      pSegments,
      nSegments,
      pLength: pLen,
      nLength: nLen,
      skewMm: Math.abs(pLen - nLen),
    };
  }
}
