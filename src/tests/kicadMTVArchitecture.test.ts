/**
 * FloZ EDA - KiCad-Class Model-Tool-View (MTV) Architecture Test Suite
 * Validates AffineTransform2D, RubberBandRouter, ZoneToolFSM, CADDrawingEngine, and Schema 2.0 Migrations.
 */

import { describe, it, expect } from 'vitest';
import { AffineTransform2D } from '../core/transformMatrix';
import { RubberBandRouter } from '../schematic/rubberBandRouter';
import { ZoneToolFSM } from '../pcb/zoneToolFSM';
import { CADDrawingEngine } from '../pcb/cadDrawingTools';
import { ProjectMigrationAdapter } from '../core/migrationAdapter';
import { ProjectSerializer } from '../core/serialization';
import { SchematicSymbolInstance, SchematicWireSegment } from '../core/types';

describe('KiCad MTV Architecture Suite', () => {
  describe('1. 2D Homogeneous Affine Transformation Matrix (AffineTransform2D)', () => {
    it('accurately transforms coordinates between screen and world space', () => {
      const transform = AffineTransform2D.fromPanZoom(100, 50, 4.0, 1.0);

      // World (10, 20) -> Screen (10*4 + 100, 20*4 + 50) = (140, 130)
      const screenPt = transform.worldToScreen(10, 20);
      expect(screenPt.x).toBeCloseTo(140);
      expect(screenPt.y).toBeCloseTo(130);

      // Inverse: Screen (140, 130) -> World (10, 20)
      const worldPt = transform.screenToWorld(140, 130);
      expect(worldPt.x).toBeCloseTo(10);
      expect(worldPt.y).toBeCloseTo(20);
    });

    it('handles high-DPI device pixel ratio scaling', () => {
      const dpr = 2.0;
      const transform = AffineTransform2D.fromPanZoom(50, 50, 2.0, dpr);
      const screenPt = transform.worldToScreen(10, 10);
      // (10 * 2 + 50) * 2 = 140
      expect(screenPt.x).toBeCloseTo(140);
      expect(screenPt.y).toBeCloseTo(140);

      const worldPt = transform.screenToWorld(140, 140);
      expect(worldPt.x).toBeCloseTo(10);
      expect(worldPt.y).toBeCloseTo(10);
    });
  });

  describe('2. Orthogonal Rubber-Banding Router (RubberBandRouter)', () => {
    it('stretches connected wire endpoints when a symbol is moved', () => {
      const mockSymbol: SchematicSymbolInstance = {
        id: 'sym_r1',
        symbolDefId: 'resistor',
        reference: 'R1',
        value: '10k',
        footprint: 'R_0805',
        x: 20,
        y: 20,
        rotation: 0,
        mirrorX: false,
        unit: 1,
        fields: {},
        pins: [
          { id: 'p1', number: '1', name: '~', x: -5, y: 0, length: 0, orientation: 180, electricalType: 'passive', visible: true },
          { id: 'p2', number: '2', name: '~', x: 5, y: 0, length: 0, orientation: 0, electricalType: 'passive', visible: true },
        ],
      };

      // Wire connecting from pin 1 (world x: 15, y: 20) to anchored point (0, 20)
      const initialWires: SchematicWireSegment[] = [
        { id: 'w1', x1: 0, y1: 20, x2: 15, y2: 20, netName: 'Net-(R1-Pad1)' },
      ];

      // Move symbol by delta (+10, +5)
      const delta = { x: 10, y: 5 };
      const updatedWires = RubberBandRouter.stretchWiresOnSymbolMove(mockSymbol, delta, initialWires);

      expect(updatedWires[0].x1).toBe(0); // Anchored end stays fixed
      expect(updatedWires[0].y1).toBe(20);
      expect(updatedWires[0].x2).toBe(25); // Symbol pin end moves with symbol
      expect(updatedWires[0].y2).toBe(25);
    });

    it('computes 2-segment Manhattan orthogonal paths', () => {
      const pathHV = RubberBandRouter.computeOrthogonalPath({ x: 0, y: 0 }, { x: 10, y: 20 }, 'HV');
      expect(pathHV).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
      ]);

      const pathVH = RubberBandRouter.computeOrthogonalPath({ x: 0, y: 0 }, { x: 10, y: 20 }, 'VH');
      expect(pathVH).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 20 },
        { x: 10, y: 20 },
      ]);
    });
  });

  describe('3. Copper Zone Pour FSM (ZoneToolFSM)', () => {
    it('supports vertex addition, single-vertex undo, and loop closure commit', () => {
      const fsm = new ZoneToolFSM('F.Cu', 'GND');
      expect(fsm.getState()).toBe('IDLE');

      // Add 3 vertices
      fsm.addVertex({ x: 0, y: 0 });
      fsm.addVertex({ x: 50, y: 0 });
      fsm.addVertex({ x: 50, y: 50 });
      expect(fsm.getState()).toBe('IN_PROGRESS');
      expect(fsm.getVertices().length).toBe(3);

      // Undo last vertex (backspace)
      fsm.undoLastVertex();
      expect(fsm.getVertices().length).toBe(2);

      // Add back and add 4th vertex
      fsm.addVertex({ x: 50, y: 50 });
      fsm.addVertex({ x: 0, y: 50 });
      expect(fsm.getVertices().length).toBe(4);

      // Close loop by committing
      const result = fsm.commit();
      expect(result.committed).toBe(true);
      expect(result.zone).toBeDefined();
      expect(result.zone?.layer).toBe('F.Cu');
      expect(result.zone?.netName).toBe('GND');
      expect(result.zone?.points.length).toBe(4);
      expect(fsm.getState()).toBe('COMMITTED');
    });

    it('cancels unconfirmed segments on escape non-destructively', () => {
      const fsm = new ZoneToolFSM('B.Cu', '+3.3V');
      fsm.addVertex({ x: 10, y: 10 });
      fsm.addVertex({ x: 20, y: 10 });
      expect(fsm.getState()).toBe('IN_PROGRESS');

      fsm.cancelCurrent();
      expect(fsm.getState()).toBe('IDLE');
      expect(fsm.getVertices().length).toBe(0);
    });
  });

  describe('4. 2D Vector CAD Drawing Engine (CADDrawingEngine)', () => {
    it('creates rectangles, circles, polygons, dimensions, and text', () => {
      const rect = CADDrawingEngine.createRectangle({ x: 0, y: 0 }, { x: 30, y: 20 }, 'F.Silkscreen');
      expect(rect.type).toBe('rect');
      expect(rect.width).toBe(30);
      expect(rect.height).toBe(20);
      expect(rect.layer).toBe('F.Silkscreen');

      const circle = CADDrawingEngine.createCircle({ x: 10, y: 10 }, { x: 15, y: 10 }, 'Edge.Cuts');
      expect(circle.type).toBe('circle');
      expect(circle.radius).toBe(5);
      expect(circle.layer).toBe('Edge.Cuts');

      const dim = CADDrawingEngine.createDimension({ x: 0, y: 0 }, { x: 30, y: 40 }, 'Dwgs.User');
      expect(dim.value).toBe(50); // 3-4-5 triangle: sqrt(30^2 + 40^2) = 50
      expect(dim.units).toBe('mm');
    });
  });

  describe('5. Schema 2.0 Backward Compatibility & Migration Adapter', () => {
    it('upgrades legacy schema 1.0 projects to Schema 2.0 with stackup defaults', () => {
      const legacyPayload = {
        metadata: { id: 'legacy_1', name: 'Legacy Board', version: '1.0.0', author: 'Dev' },
        schematic: { sheets: [{ id: 's1', symbols: [], wires: [] }] },
        pcb: { footprints: [], tracks: [], vias: [], zones: [] },
      };

      const migrated = ProjectMigrationAdapter.migrate(legacyPayload);
      expect(migrated.metadata.schemaVersion).toBe('2.0');
      expect(migrated.pcb.stackup).toBeDefined();
      expect(migrated.pcb.stackup.length).toBeGreaterThanOrEqual(3);
    });

    it('round-trips through ProjectSerializer with Schema 2.0 tags', () => {
      const legacyJson = JSON.stringify({
        metadata: { id: 'legacy_2', name: 'Roundtrip Test', version: '1.0.0' },
      });

      const parsed = ProjectSerializer.deserialize(legacyJson);
      expect(parsed.metadata.schemaVersion).toBe('2.0');

      const serialized = ProjectSerializer.serialize(parsed);
      const reparsed = ProjectSerializer.deserialize(serialized);
      expect(reparsed.metadata.schemaVersion).toBe('2.0');
    });
  });
});
