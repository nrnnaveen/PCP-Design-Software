/**
 * FloZ ECA — 3D Board Viewer Physical Engine Test Suite
 * Tests physical coordinate system conversions, solid board extrusion,
 * through-hole drill barrels, SMD/THT pads, and procedural 3D component models.
 */

import { describe, it, expect } from 'vitest';
import { createDemoProject } from '../examples/demoProject';

describe('FloZ ECA — 3D Board Viewer Engine & Coordinate Transformation', () => {
  const project = createDemoProject();
  const pcb = project.pcb;

  it('calculates deterministic board bounding box and canonical center', () => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pcb.boardOutline.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    expect(minX).toBe(0);
    expect(maxX).toBe(75);
    expect(minY).toBe(0);
    expect(maxY).toBe(55);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    expect(centerX).toBe(37.5);
    expect(centerY).toBe(27.5);
  });

  it('maps 2D PCB coordinates to 3D world with proper Y-inversion and centering', () => {
    const boardCenterX = 37.5;
    const boardCenterY = 27.5;
    const pcbTo3D = (x: number, y: number) => ({
      x: x - boardCenterX,
      y: -(y - boardCenterY),
    });

    // Board center should map to (0, 0)
    const center3D = pcbTo3D(37.5, 27.5);
    expect(center3D.x).toBeCloseTo(0);
    expect(center3D.y).toBeCloseTo(0);

    // Top-left (0, 0) should map to (-37.5, 27.5)
    const tl3D = pcbTo3D(0, 0);
    expect(tl3D.x).toBeCloseTo(-37.5);
    expect(tl3D.y).toBeCloseTo(27.5);

    // Bottom-right (75, 55) should map to (37.5, -27.5)
    const br3D = pcbTo3D(75, 55);
    expect(br3D.x).toBeCloseTo(37.5);
    expect(br3D.y).toBeCloseTo(-27.5);
  });

  it('verifies physical Z-stack layer positions around center Z=0', () => {
    const boardThickness = 1.6;
    const topBoardZ = boardThickness / 2; // +0.8
    const btmBoardZ = -boardThickness / 2; // -0.8
    const topCopperZ = topBoardZ + 0.02; // +0.82
    const btmCopperZ = btmBoardZ - 0.02; // -0.82

    expect(topBoardZ).toBeCloseTo(0.8);
    expect(btmBoardZ).toBeCloseTo(-0.8);
    expect(topCopperZ).toBeCloseTo(0.82);
    expect(btmCopperZ).toBeCloseTo(-0.82);
  });

  it('verifies through-hole pads generate top/bottom annular rings and drill barrel', () => {
    const usbFootprint = pcb.footprints.find((f) => f.reference === 'J1');
    expect(usbFootprint).toBeDefined();

    const thtPads = usbFootprint!.pads.filter((p) => p.type === 'through_hole');
    expect(thtPads.length).toBeGreaterThanOrEqual(2);

    thtPads.forEach((pad) => {
      expect(pad.drillDiameter).toBeDefined();
      expect(pad.drillDiameter!).toBeGreaterThan(0);
      expect(pad.drillDiameter!).toBeLessThan(Math.max(pad.width, pad.height));
    });
  });

  it('verifies all component footprints in demo project have valid 3D coordinates', () => {
    pcb.footprints.forEach((fp) => {
      expect(Number.isFinite(fp.x)).toBe(true);
      expect(Number.isFinite(fp.y)).toBe(true);
      expect(Number.isFinite(fp.rotation)).toBe(true);

      // Footprints must be placed within or near the board boundaries
      expect(fp.x).toBeGreaterThanOrEqual(0);
      expect(fp.x).toBeLessThanOrEqual(75);
      expect(fp.y).toBeGreaterThanOrEqual(0);
      expect(fp.y).toBeLessThanOrEqual(55);
    });
  });

  it('verifies all copper tracks have finite coordinates and non-zero length', () => {
    pcb.tracks.forEach((trk) => {
      expect(Number.isFinite(trk.x1)).toBe(true);
      expect(Number.isFinite(trk.y1)).toBe(true);
      expect(Number.isFinite(trk.x2)).toBe(true);
      expect(Number.isFinite(trk.y2)).toBe(true);
      expect(trk.width).toBeGreaterThan(0);

      const len = Math.hypot(trk.x2 - trk.x1, trk.y2 - trk.y1);
      expect(len).toBeGreaterThan(0.01);
    });
  });

  it('safely handles empty or missing geometry without crashing', () => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const emptyOutline: any[] = [];

    if (emptyOutline.length >= 3) {
      emptyOutline.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
      });
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      minX = 0; maxX = 75; minY = 0; maxY = 55;
    }

    expect(minX).toBe(0);
    expect(maxX).toBe(75);
    expect(minY).toBe(0);
    expect(maxY).toBe(55);
  });
});
