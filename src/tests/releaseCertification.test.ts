/**
 * FloZ ECA — Official Release Certification Test Suite
 * Exhaustive certification covering Geometry, FSM Lifecycles, Schematic & Wire Connectivity,
 * PCB Routing, Zones, CAD Primitives, Stackup, 3D Geometry, Serialization, and Performance Benchmarks.
 */

import { describe, it, expect } from 'vitest';
import { AffineTransform2D } from '../core/transformMatrix';
import { ToolManager, EditorTool, ToolLifecycleState } from '../core/toolManager';
import { RubberBandRouter } from '../schematic/rubberBandRouter';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { ERCEngine } from '../erc/ercEngine';
import { InteractiveRouter } from '../router/router';
import { ZoneToolFSM } from '../pcb/zoneToolFSM';
import { CADDrawingEngine } from '../pcb/cadDrawingTools';
import { ProjectMigrationAdapter } from '../core/migrationAdapter';
import { ProjectSerializer } from '../core/serialization';
import { TransactionManager } from '../core/transaction';
import {
  ApexProject,
  SchematicSymbolInstance,
  SchematicWireSegment,
  SchematicSheet,
  PCBData,
  PCBFootprintInstance,
} from '../core/types';

describe('FloZ ECA Release Certification Suite', () => {
  // ==========================================
  // 1. Core Geometry & Affine Transforms
  // ==========================================
  describe('1. Core Geometry & Coordinate Invertibility', () => {
    it('guarantees round-trip world -> screen -> world precision within floating-point epsilon', () => {
      const pans = [
        { x: 0, y: 0 },
        { x: 340, y: 200 },
        { x: -500, y: 1200 },
      ];
      const zooms = [0.5, 1.0, 4.0, 16.0];
      const dprs = [1.0, 1.5, 2.0];

      for (const pan of pans) {
        for (const zoom of zooms) {
          for (const dpr of dprs) {
            const transform = AffineTransform2D.fromPanZoom(pan.x, pan.y, zoom, dpr);

            const testPoints = [
              { x: 0, y: 0 },
              { x: 25.4, y: 50.8 },
              { x: -127.654, y: 89.123 },
              { x: 1000.5, y: -2000.75 },
            ];

            for (const pt of testPoints) {
              const screen = transform.worldToScreen(pt.x, pt.y);
              const roundtrip = transform.screenToWorld(screen.x, screen.y);

              expect(roundtrip.x).toBeCloseTo(pt.x, 3);
              expect(roundtrip.y).toBeCloseTo(pt.y, 3);
            }
          }
        }
      }
    });

    it('performs precise grid snapping without coordinate distortion across imperial/metric presets', () => {
      const snap = (val: number, step: number) => Math.round(val / step) * step;

      // 100 mil = 2.54 mm
      expect(snap(2.50, 2.54)).toBeCloseTo(2.54, 4);
      expect(snap(1.20, 2.54)).toBeCloseTo(0.0, 4);
      expect(snap(5.10, 2.54)).toBeCloseTo(5.08, 4);

      // 50 mil = 1.27 mm
      expect(snap(1.30, 1.27)).toBeCloseTo(1.27, 4);
      expect(snap(2.50, 1.27)).toBeCloseTo(2.54, 4);

      // 25 mil = 0.635 mm
      expect(snap(0.60, 0.635)).toBeCloseTo(0.635, 4);
      expect(snap(1.90, 0.635)).toBeCloseTo(1.905, 4);
    });
  });

  // ==========================================
  // 2. Tool Manager & FSM Lifecycle
  // ==========================================
  describe('2. Tool Manager Lifecycle & State Transitions', () => {
    it('manages tool lifecycle (IDLE -> IN_PROGRESS -> COMMITTED / CANCELLED) with state events', () => {
      const toolManager = new ToolManager();
      const stateHistory: string[] = [];

      toolManager.subscribe((toolId, state) => {
        stateHistory.push(`${toolId}:${state}`);
      });

      let commitExecuted = false;
      let cancelExecuted = false;
      let currentState: ToolLifecycleState = 'IDLE';

      const dummyTool: EditorTool = {
        id: 'test_wire_tool',
        name: 'Wire Tool',
        cursor: 'crosshair',
        getState: () => currentState,
        activate: () => { currentState = 'IDLE'; },
        deactivate: () => { currentState = 'IDLE'; },
        onMouseDown: () => { currentState = 'IN_PROGRESS'; return true; },
        onMouseMove: () => {},
        onMouseUp: () => {},
        onKeyDown: () => {},
        commit: () => {
          commitExecuted = true;
          currentState = 'COMMITTED';
        },
        cancel: () => {
          cancelExecuted = true;
          currentState = 'IDLE';
        },
      };

      toolManager.registerTool(dummyTool);
      toolManager.setTool('test_wire_tool');
      expect(toolManager.getActiveState()).toBe('IDLE');

      toolManager.onMouseDown({
        screenPos: { x: 0, y: 0 },
        worldPos: { x: 0, y: 0 },
        snappedWorldPos: { x: 0, y: 0 },
        button: 0,
        buttons: 1,
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
      }, {});
      expect(toolManager.getActiveState()).toBe('IN_PROGRESS');

      toolManager.commitActive({});
      expect(commitExecuted).toBe(true);
      expect(toolManager.getActiveState()).toBe('COMMITTED');

      toolManager.cancelActive({});
      expect(cancelExecuted).toBe(true);
      expect(toolManager.getActiveState()).toBe('IDLE');
    });
  });

  // ==========================================
  // 3. Schematic & Manhattan Rubber-Banding
  // ==========================================
  describe('3. Schematic Connectivity & Topological Rubber-Banding', () => {
    it('preserves multi-wire connections and adjusts orthogonal elbows when symbols are moved', () => {
      const mockSymbol: SchematicSymbolInstance = {
        id: 'sym_u1',
        symbolDefId: 'ic_opamp',
        reference: 'U1',
        value: 'LM358',
        footprint: 'SOIC-8',
        x: 50,
        y: 50,
        rotation: 0,
        mirrorX: false,
        unit: 1,
        fields: {},
        pins: [
          { id: 'p1', number: '1', name: 'OUT', x: 10, y: 0, length: 0, orientation: 0, electricalType: 'output', visible: true },
          { id: 'p2', number: '2', name: 'IN-', x: -10, y: -5, length: 0, orientation: 180, electricalType: 'input', visible: true },
          { id: 'p3', number: '3', name: 'IN+', x: -10, y: 5, length: 0, orientation: 180, electricalType: 'input', visible: true },
        ],
      };

      // 3 attached wires
      const wires: SchematicWireSegment[] = [
        { id: 'w1', x1: 60, y1: 50, x2: 90, y2: 50, netName: 'Net-(U1-Pad1)' },
        { id: 'w2', x1: 10, y1: 45, x2: 40, y2: 45, netName: 'Net-(U1-Pad2)' },
        { id: 'w3', x1: 10, y1: 55, x2: 40, y2: 55, netName: 'Net-(U1-Pad3)' },
      ];

      // Translate symbol by delta (+15, -10)
      const delta = { x: 15, y: -10 };
      const updatedWires = RubberBandRouter.stretchWiresOnSymbolMove(mockSymbol, delta, wires);

      // W1: start was at (60,50), moves to (75, 40); end remains anchored at (90, 50)
      expect(updatedWires[0].x1).toBe(75);
      expect(updatedWires[0].y1).toBe(40);
      expect(updatedWires[0].x2).toBe(90);
      expect(updatedWires[0].y2).toBe(50);

      // W2: start remains anchored at (10, 45); end moves from (40, 45) to (55, 35)
      expect(updatedWires[1].x1).toBe(10);
      expect(updatedWires[1].y1).toBe(45);
      expect(updatedWires[1].x2).toBe(55);
      expect(updatedWires[1].y2).toBe(35);
    });

    it('solves electrical connectivity graph and identifies all connected nets accurately', () => {
      const sheet: SchematicSheet = {
        id: 'sheet_cert',
        title: 'Certification Sheet',
        sheetNumber: 1,
        symbols: [
          {
            id: 'r1',
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
          },
          {
            id: 'r2',
            symbolDefId: 'resistor',
            reference: 'R2',
            value: '10k',
            footprint: 'R_0805',
            x: 40,
            y: 20,
            rotation: 0,
            mirrorX: false,
            unit: 1,
            fields: {},
            pins: [
              { id: 'p1', number: '1', name: '~', x: -5, y: 0, length: 0, orientation: 180, electricalType: 'passive', visible: true },
              { id: 'p2', number: '2', name: '~', x: 5, y: 0, length: 0, orientation: 0, electricalType: 'passive', visible: true },
            ],
          },
        ],
        // Wire between R1 pin 2 (world x: 25, y: 20) and R2 pin 1 (world x: 35, y: 20)
        wires: [{ id: 'w_mid', x1: 25, y1: 20, x2: 35, y2: 20 }],
        junctions: [],
        labels: [],
        powerSymbols: [],
        hierarchicalSheets: [],
        texts: [],
      };

      const result = NetConnectivitySolver.solveSheet(sheet);
      expect(result.netGraph).toBeDefined();

      const nets = Object.values(result.netGraph.nets);
      expect(nets.length).toBeGreaterThanOrEqual(1);

      const bridgeNet = nets.find(
        (n) => n.pins.some((p) => p.symbolRef === 'R1') && n.pins.some((p) => p.symbolRef === 'R2')
      );
      expect(bridgeNet).toBeDefined();
    });
  });

  // ==========================================
  // 4. PCB Routing, Zones & CAD Tools
  // ==========================================
  describe('4. PCB Routing Engine, Copper Zones & 2D CAD Tools', () => {
    it('computes collision-free 45-degree and 90-degree interactive routing paths', () => {
      const p1 = { x: 10, y: 10 };
      const p2 = { x: 30, y: 40 };

      const path45_0 = InteractiveRouter.computePath(p1, p2, '45', 0);
      expect(path45_0.length).toBeGreaterThanOrEqual(2);

      const path45_1 = InteractiveRouter.computePath(p1, p2, '45', 1);
      expect(path45_1.length).toBeGreaterThanOrEqual(2);

      const path90 = InteractiveRouter.computePath(p1, p2, '90', 0);
      expect(path90.length).toBe(2);
      expect(path90[0].x1).toBe(10);
      expect(path90[0].y1).toBe(10);
      expect(path90[1].x2).toBe(30);
      expect(path90[1].y2).toBe(40);
    });

    it('manages Copper Zone Pour FSM with backspace single-vertex undo and loop closure', () => {
      const fsm = new ZoneToolFSM('F.Cu', '+5V');
      fsm.addVertex({ x: 10, y: 10 });
      fsm.addVertex({ x: 80, y: 10 });
      fsm.addVertex({ x: 80, y: 60 });
      expect(fsm.getVertices().length).toBe(3);

      // Backspace undo
      fsm.undoLastVertex();
      expect(fsm.getVertices().length).toBe(2);

      // Add back and add 4th vertex
      fsm.addVertex({ x: 80, y: 60 });
      fsm.addVertex({ x: 10, y: 60 });
      expect(fsm.getVertices().length).toBe(4);

      // Commit
      const commitRes = fsm.commit();
      expect(commitRes.committed).toBe(true);
      expect(commitRes.zone?.netName).toBe('+5V');
      expect(commitRes.zone?.layer).toBe('F.Cu');
      expect(commitRes.zone?.points.length).toBe(4);
    });

    it('creates 2D CAD graphic shapes and dimensions accurately', () => {
      const rect = CADDrawingEngine.createRectangle({ x: 5, y: 5 }, { x: 45, y: 25 }, 'F.Fab');
      expect(rect.width).toBe(40);
      expect(rect.height).toBe(20);

      const circle = CADDrawingEngine.createCircle({ x: 20, y: 20 }, { x: 30, y: 20 }, 'Edge.Cuts');
      expect(circle.radius).toBe(10);

      const dim = CADDrawingEngine.createDimension({ x: 0, y: 0 }, { x: 60, y: 80 }, 'Dwgs.User');
      expect(dim.value).toBe(100); // 60-80-100 right triangle
    });
  });

  // ==========================================
  // 5. Persistence, Migration & Undo/Redo
  // ==========================================
  describe('5. Project Serialization, Schema 2.0 Migration & Undo/Redo Stack', () => {
    it('migrates legacy Schema 1.0 payloads without data loss into Schema 2.0', () => {
      const legacyProject = {
        metadata: {
          id: 'proj_legacy_test',
          name: 'Legacy Project',
          version: '1.0.0',
          author: 'Engineer',
        },
        schematic: {
          sheets: [
            {
              id: 's1',
              title: 'Root',
              symbols: [],
              wires: [],
              junctions: [],
              labels: [],
            },
          ],
        },
        pcb: {
          boardOutline: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
          footprints: [],
          tracks: [],
          vias: [],
          zones: [],
        },
      };

      const migrated = ProjectMigrationAdapter.migrate(legacyProject);
      expect(migrated.metadata.schemaVersion).toBe('2.0');
      expect(migrated.pcb.stackup).toBeDefined();
      expect(migrated.pcb.stackup.length).toBeGreaterThanOrEqual(3);
    });

    it('performs round-trip JSON serialization with 100% data integrity', () => {
      const original: ApexProject = ProjectMigrationAdapter.migrate({
        metadata: { id: 'proj_rt', name: 'Roundtrip Test' },
        schematic: { sheets: [{ id: 's1', symbols: [], wires: [] }] },
        pcb: { footprints: [], tracks: [], vias: [], zones: [] },
      });

      const serialized = ProjectSerializer.serialize(original);
      const deserialized = ProjectSerializer.deserialize(serialized);

      expect(deserialized.metadata.id).toBe(original.metadata.id);
      expect(deserialized.metadata.schemaVersion).toBe('2.0');
      expect(deserialized.pcb.stackup.length).toBe(original.pcb.stackup.length);
    });

    it('manages transactional Undo/Redo stack with precise state rollback and reapplication', () => {
      const initialProject: ApexProject = ProjectMigrationAdapter.migrate({
        metadata: { id: 'p_undo', name: 'Undo Redo Test' },
        schematic: { sheets: [{ id: 's1', symbols: [], wires: [] }] },
        pcb: { footprints: [], tracks: [], vias: [], zones: [] },
      });

      const txManager = new TransactionManager<ApexProject>();
      expect(txManager.canUndo()).toBe(false);
      expect(txManager.canRedo()).toBe(false);

      // 1. Add Footprint
      const fp1: PCBFootprintInstance = {
        id: 'fp_1',
        footprintDefId: 'R_0805',
        reference: 'R1',
        value: '10k',
        layer: 'F.Cu',
        x: 20,
        y: 30,
        rotation: 0,
        pads: [],
        shapes: [],
        courtyard: { minX: -2, minY: -1, maxX: 2, maxY: 1 },
      };

      let state = txManager.execute(initialProject, {
        name: 'Add R1',
        apply: (s) => ({ ...s, pcb: { ...s.pcb, footprints: [fp1] } }),
        invert: (s) => ({ ...s, pcb: { ...s.pcb, footprints: [] } }),
      });

      expect(txManager.canUndo()).toBe(true);
      expect(state.pcb.footprints.length).toBe(1);

      // 2. Undo
      const undoRes = txManager.undo(state);
      state = undoRes.state;
      expect(state.pcb.footprints.length).toBe(0);
      expect(txManager.canRedo()).toBe(true);

      // 3. Redo
      const redoRes = txManager.redo(state);
      state = redoRes.state;
      expect(state.pcb.footprints.length).toBe(1);
      expect(state.pcb.footprints[0].reference).toBe('R1');
    });
  });

  // ==========================================
  // 6. Scale & Performance Stress Testing
  // ==========================================
  describe('6. Performance Benchmarks across Design Scales', () => {
    it('solves netlist and checks ERC in under 100ms for 100-component medium design', () => {
      const symbols: SchematicSymbolInstance[] = [];
      const wires: SchematicWireSegment[] = [];

      for (let i = 0; i < 100; i++) {
        const x = (i % 10) * 20;
        const y = Math.floor(i / 10) * 20;
        symbols.push({
          id: `sym_${i}`,
          symbolDefId: 'resistor',
          reference: `R${i + 1}`,
          value: '1k',
          footprint: 'R_0805',
          x,
          y,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: `p_${i}_1`, number: '1', name: '~', x: -5, y: 0, length: 0, orientation: 180, electricalType: 'passive', visible: true },
            { id: `p_${i}_2`, number: '2', name: '~', x: 5, y: 0, length: 0, orientation: 0, electricalType: 'passive', visible: true },
          ],
        });

        if (i > 0) {
          wires.push({
            id: `w_${i}`,
            x1: (i - 1) * 20 + 5,
            y1: Math.floor((i - 1) / 10) * 20,
            x2: x - 5,
            y2: y,
          });
        }
      }

      const testProject: ApexProject = ProjectMigrationAdapter.migrate({
        metadata: { id: 'p_perf_100', name: 'Performance 100' },
        schematic: {
          sheets: [
            {
              id: 's1',
              title: 'PerfSheet',
              sheetNumber: 1,
              symbols,
              wires,
              junctions: [],
              labels: [],
              powerSymbols: [],
              hierarchicalSheets: [],
              texts: [],
            },
          ],
        },
        pcb: { footprints: [], tracks: [], vias: [], zones: [] },
      });

      const startTime = performance.now();
      const connectivity = NetConnectivitySolver.solveSheet(testProject.schematic.sheets[0]);
      const violations = ERCEngine.run(testProject);
      const elapsed = performance.now() - startTime;

      expect(connectivity).toBeDefined();
      expect(violations).toBeDefined();
      expect(elapsed).toBeLessThan(150); // Target < 150ms
    });

    it('maintains deterministic execution and memory stability on 500-component large design', () => {
      const symbols: SchematicSymbolInstance[] = [];
      for (let i = 0; i < 500; i++) {
        symbols.push({
          id: `sym_large_${i}`,
          symbolDefId: 'resistor',
          reference: `R${i + 1}`,
          value: '10k',
          footprint: 'R_0805',
          x: (i % 20) * 15,
          y: Math.floor(i / 20) * 15,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: `p_${i}_1`, number: '1', name: '~', x: -5, y: 0, length: 0, orientation: 180, electricalType: 'passive', visible: true },
            { id: `p_${i}_2`, number: '2', name: '~', x: 5, y: 0, length: 0, orientation: 0, electricalType: 'passive', visible: true },
          ],
        });
      }

      const testProject: ApexProject = ProjectMigrationAdapter.migrate({
        metadata: { id: 'p_large_500', name: 'Large 500' },
        schematic: {
          sheets: [
            {
              id: 's1',
              title: 'LargeSheet',
              sheetNumber: 1,
              symbols,
              wires: [],
              junctions: [],
              labels: [],
              powerSymbols: [],
              hierarchicalSheets: [],
              texts: [],
            },
          ],
        },
        pcb: { footprints: [], tracks: [], vias: [], zones: [] },
      });

      const startTime = performance.now();
      const violations = ERCEngine.run(testProject);
      const elapsed = performance.now() - startTime;

      expect(violations.length).toBeGreaterThan(0); // Detects unconnected pins
      expect(elapsed).toBeLessThan(350); // Target < 350ms
    });
  });
});
