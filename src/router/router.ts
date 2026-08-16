/**
 * Apex EDA - Interactive 45-Degree Octilinear PCB Router
 * Computes 45° multi-segment track paths, collision detection, and clearance halos.
 */

import {
  PCBData,
  PCBTrackSegment,
  Point2D,
  PCBLayerId,
  DesignRules,
} from '../core/types';

export interface RouteSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CollisionViolation {
  x: number;
  y: number;
  obstacleType: 'pad' | 'track' | 'via';
  obstacleNet: string;
  distance: number;
  requiredClearance: number;
}

export class InteractiveRouter {
  /**
   * Computes 45-degree octilinear route segments from start point to current mouse position.
   * Posture 0: Orthogonal first, then 45-degree diagonal.
   * Posture 1: 45-degree diagonal first, then orthogonal.
   */
  public static compute45DegreePath(
    start: Point2D,
    end: Point2D,
    posture: 0 | 1 = 0
  ): RouteSegment[] {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // If perfectly aligned horizontally, vertically, or 45-degree
    if (absDx === 0 || absDy === 0 || Math.abs(absDx - absDy) < 1e-4) {
      return [{ x1: start.x, y1: start.y, x2: end.x, y2: end.y }];
    }

    const segments: RouteSegment[] = [];

    if (posture === 0) {
      // Horizontal/Vertical dominant first
      if (absDx > absDy) {
        // First segment horizontal, second segment 45 deg
        const intermediateX = end.x - Math.sign(dx) * absDy;
        segments.push({ x1: start.x, y1: start.y, x2: intermediateX, y2: start.y });
        segments.push({ x1: intermediateX, y1: start.y, x2: end.x, y2: end.y });
      } else {
        // First segment vertical, second segment 45 deg
        const intermediateY = end.y - Math.sign(dy) * absDx;
        segments.push({ x1: start.x, y1: start.y, x2: start.x, y2: intermediateY });
        segments.push({ x1: start.x, y1: intermediateY, x2: end.x, y2: end.y });
      }
    } else {
      // 45-degree diagonal first
      const diagonalDist = Math.min(absDx, absDy);
      const intermediateX = start.x + Math.sign(dx) * diagonalDist;
      const intermediateY = start.y + Math.sign(dy) * diagonalDist;
      segments.push({ x1: start.x, y1: start.y, x2: intermediateX, y2: intermediateY });
      segments.push({ x1: intermediateX, y1: intermediateY, x2: end.x, y2: end.y });
    }

    return segments;
  }

  /**
   * Checks collisions of active route against other nets in PCB
   */
  public static checkCollisions(
    segments: RouteSegment[],
    netName: string,
    layer: PCBLayerId,
    trackWidth: number,
    pcb: PCBData,
    rules: DesignRules
  ): CollisionViolation[] {
    const clearance = rules.defaultNetClass.clearance;
    const violations: CollisionViolation[] = [];

    // Helper distance point to line segment
    const distPointToSegment = (p: Point2D, s: RouteSegment): number => {
      const l2 = (s.x2 - s.x1) ** 2 + (s.y2 - s.y1) ** 2;
      if (l2 === 0) return Math.hypot(p.x - s.x1, p.y - s.y1);
      let t = ((p.x - s.x1) * (s.x2 - s.x1) + (p.y - s.y1) * (s.y2 - s.y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = s.x1 + t * (s.x2 - s.x1);
      const projY = s.y1 + t * (s.y2 - s.y1);
      return Math.hypot(p.x - projX, p.y - projY);
    };

    // 1. Check against foreign pads
    pcb.footprints.forEach((fp) => {
      const rad = (fp.rotation * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      fp.pads.forEach((pad) => {
        if (pad.netName === netName || !pad.layers.includes(layer)) return;

        const rx = pad.x * cosR - pad.y * sinR;
        const ry = pad.x * sinR + pad.y * cosR;
        const padAbs: Point2D = { x: fp.x + rx, y: fp.y + ry };
        const padRadius = Math.max(pad.width, pad.height) / 2;

        segments.forEach((seg) => {
          const dist = distPointToSegment(padAbs, seg);
          const reqClearance = clearance + trackWidth / 2 + padRadius;
          if (dist < reqClearance) {
            violations.push({
              x: padAbs.x,
              y: padAbs.y,
              obstacleType: 'pad',
              obstacleNet: pad.netName || 'None',
              distance: dist,
              requiredClearance: reqClearance,
            });
          }
        });
      });
    });

    // 2. Check against foreign tracks
    pcb.tracks.forEach((track) => {
      if (track.netName === netName || track.layer !== layer) return;

      segments.forEach((seg) => {
        // Midpoint check for trace proximity
        const mid: Point2D = { x: (track.x1 + track.x2) / 2, y: (track.y1 + track.y2) / 2 };
        const dist = distPointToSegment(mid, seg);
        const reqClearance = clearance + (trackWidth + track.width) / 2;
        if (dist < reqClearance) {
          violations.push({
            x: mid.x,
            y: mid.y,
            obstacleType: 'track',
            obstacleNet: track.netName,
            distance: dist,
            requiredClearance: reqClearance,
          });
        }
      });
    });

    return violations;
  }
}
