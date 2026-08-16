/**
 * Apex EDA - Serpentine Length Tuning Engine
 * Computes exact track route length and generates accordion serpentine meanders.
 */

import { PCBTrackSegment, Point2D } from '../core/types';

export interface TuningResult {
  currentLength: number; // in mm
  targetLength: number;
  skew: number; // targetLength - currentLength
  meanders: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

export class LengthTuner {
  public static calculateNetLength(tracks: PCBTrackSegment[], netName: string): number {
    let totalLength = 0;
    tracks.forEach((t) => {
      if (t.netName === netName) {
        totalLength += Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
      }
    });
    return totalLength;
  }

  /**
   * Generates serpentine meander segments along a track to reach target length
   */
  public static generateSerpentine(
    p1: Point2D,
    p2: Point2D,
    targetExtraLength: number,
    amplitude: number = 2.0, // peak height in mm
    pitch: number = 1.0 // meander spacing in mm
  ): Array<{ x1: number; y1: number; x2: number; y2: number }> {
    if (targetExtraLength <= 0) return [];

    const baseLength = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (baseLength < pitch * 2) return [];

    const numCycles = Math.min(
      Math.floor((baseLength - pitch) / pitch),
      Math.ceil(targetExtraLength / (2 * amplitude))
    );

    if (numCycles <= 0) return [];

    const ux = (p2.x - p1.x) / baseLength;
    const uy = (p2.y - p1.y) / baseLength;
    // Normal vector
    const nx = -uy;
    const ny = ux;

    const meanders: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    let currentX = p1.x + ux * pitch;
    let currentY = p1.y + uy * pitch;

    for (let i = 0; i < numCycles; i++) {
      const sign = i % 2 === 0 ? 1 : -1;
      const peakX = currentX + nx * amplitude * sign;
      const peakY = currentY + ny * amplitude * sign;
      const nextBaseX = currentX + ux * pitch;
      const nextBaseY = currentY + uy * pitch;

      meanders.push({ x1: currentX, y1: currentY, x2: peakX, y2: peakY });
      meanders.push({ x1: peakX, y1: peakY, x2: nextBaseX, y2: nextBaseY });

      currentX = nextBaseX;
      currentY = nextBaseY;
    }

    return meanders;
  }
}
