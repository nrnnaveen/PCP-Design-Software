import { describe, it, expect } from 'vitest';
import { SchematicHelper } from '../schematic/helper';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { SchematicSymbolInstance, SchematicSheet } from '../core/types';

describe('Schematic Geometry, Pin Position & Connectivity Tests', () => {
  it('should accurately calculate world-space pin coordinates with rotation (0, 90, 180, 270) and mirror', () => {
    const sym: SchematicSymbolInstance = {
      id: 'sym_test_r1',
      symbolDefId: 'sym_r',
      reference: 'R1',
      value: '10k',
      footprint: 'Resistor_SMD:R_0805',
      x: 100,
      y: 50,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      fields: {},
      pins: [
        { id: 'p1', number: '1', name: '~', electricalType: 'passive', x: -5, y: 0, length: 3.81, orientation: 180, visible: true },
        { id: 'p2', number: '2', name: '~', electricalType: 'passive', x: 5, y: 0, length: 3.81, orientation: 0, visible: true },
      ],
    };

    // 0 degrees rotation
    const pos1 = SchematicHelper.getSymbolPinWorldPosition(sym, sym.pins[0]);
    expect(pos1.x).toBeCloseTo(91.19, 2);
    expect(pos1.y).toBeCloseTo(50, 2);

    const pos2 = SchematicHelper.getSymbolPinWorldPosition(sym, sym.pins[1]);
    expect(pos2.x).toBeCloseTo(108.81, 2);
    expect(pos2.y).toBeCloseTo(50, 2);

    // 90 degrees rotation
    const symRot90 = { ...sym, rotation: 90 as const };
    const pos1Rot90 = SchematicHelper.getSymbolPinWorldPosition(symRot90, sym.pins[0]);
    expect(pos1Rot90.x).toBeCloseTo(100, 2);
    expect(pos1Rot90.y).toBeCloseTo(50 - 5 - 3.81, 2);

    // 180 degrees rotation
    const symRot180 = { ...sym, rotation: 180 as const };
    const pos1Rot180 = SchematicHelper.getSymbolPinWorldPosition(symRot180, sym.pins[0]);
    expect(pos1Rot180.x).toBeCloseTo(100 + 5 + 3.81, 2);
    expect(pos1Rot180.y).toBeCloseTo(50, 2);

    // 270 degrees rotation
    const symRot270 = { ...sym, rotation: 270 as const };
    const pos1Rot270 = SchematicHelper.getSymbolPinWorldPosition(symRot270, sym.pins[0]);
    expect(pos1Rot270.x).toBeCloseTo(100, 2);
    expect(pos1Rot270.y).toBeCloseTo(50 + 5 + 3.81, 2);

    // Mirrored X at 0 degrees
    const symMirror = { ...sym, mirrorX: true };
    const pos1Mirror = SchematicHelper.getSymbolPinWorldPosition(symMirror, sym.pins[0]);
    expect(pos1Mirror.x).toBeCloseTo(100 + 5 + 3.81, 2);
    expect(pos1Mirror.y).toBeCloseTo(50, 2);
  });

  it('should find closest pin within magnetic snap threshold', () => {
    const sym: SchematicSymbolInstance = {
      id: 'sym_test_r1',
      symbolDefId: 'sym_r',
      reference: 'R1',
      value: '10k',
      footprint: '',
      x: 50,
      y: 50,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      fields: {},
      pins: [
        { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: -5, y: 0, length: 3.81, orientation: 180, visible: true },
        { id: 'p2', number: '2', name: '2', electricalType: 'passive', x: 5, y: 0, length: 3.81, orientation: 0, visible: true },
      ],
    };

    const pinPos = SchematicHelper.getSymbolPinWorldPosition(sym, sym.pins[0]);
    const snap = SchematicHelper.findClosestPin({ x: pinPos.x + 0.5, y: pinPos.y - 0.5 }, [sym], 2.0);
    expect(snap).toBeDefined();
    expect(snap?.pin.number).toBe('1');
    expect(snap?.symbol.reference).toBe('R1');
  });

  it('should ensure crossing orthogonal wires do NOT connect unless explicit junction exists', () => {
    const sheet: SchematicSheet = {
      id: 'sheet_1',
      title: 'Root',
      sheetNumber: 1,
      hierarchicalSheets: [],
      texts: [],
      symbols: [
        {
          id: 'sym_r1',
          symbolDefId: 'sym_r',
          reference: 'R1',
          value: '1k',
          footprint: '',
          x: 10,
          y: 50,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: 0, y: 0, length: 0, orientation: 0, visible: true },
          ],
        },
        {
          id: 'sym_r2',
          symbolDefId: 'sym_r',
          reference: 'R2',
          value: '1k',
          footprint: '',
          x: 90,
          y: 50,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: 0, y: 0, length: 0, orientation: 0, visible: true },
          ],
        },
        {
          id: 'sym_c1',
          symbolDefId: 'sym_c',
          reference: 'C1',
          value: '100nF',
          footprint: '',
          x: 50,
          y: 10,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: 0, y: 0, length: 0, orientation: 0, visible: true },
          ],
        },
        {
          id: 'sym_c2',
          symbolDefId: 'sym_c',
          reference: 'C2',
          value: '100nF',
          footprint: '',
          x: 50,
          y: 90,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: 0, y: 0, length: 0, orientation: 0, visible: true },
          ],
        },
      ],
      wires: [
        // Horizontal wire from R1 to R2
        { id: 'w_horiz', x1: 10, y1: 50, x2: 90, y2: 50 },
        // Vertical wire from C1 to C2 crossing at (50, 50)
        { id: 'w_vert', x1: 50, y1: 10, x2: 50, y2: 90 },
      ],
      junctions: [],
      labels: [],
      powerSymbols: [],
    };

    const resWithoutJunc = NetConnectivitySolver.solveSheet(sheet);
    const netCountWithout = Object.keys(resWithoutJunc.netGraph.nets).length;
    // Must be 2 separate distinct nets
    expect(netCountWithout).toBe(2);

    // Now add explicit junction at (50, 50)
    const sheetWithJunc: SchematicSheet = {
      ...sheet,
      junctions: [{ id: 'junc_1', x: 50, y: 50 }],
    };

    const resWithJunc = NetConnectivitySolver.solveSheet(sheetWithJunc);
    const netCountWith = Object.keys(resWithJunc.netGraph.nets).length;
    // Now unified into 1 net
    expect(netCountWith).toBe(1);
  });

  it('should propagate global net labels across disjoint wires', () => {
    const sheet: SchematicSheet = {
      id: 'sheet_1',
      title: 'Root',
      sheetNumber: 1,
      hierarchicalSheets: [],
      texts: [],
      symbols: [
        {
          id: 'sym_u1',
          symbolDefId: 'sym_mcu',
          reference: 'U1',
          value: 'MCU',
          footprint: '',
          x: 10,
          y: 10,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: 'p1', number: '1', name: 'SDA', electricalType: 'bidirectional', x: 0, y: 0, length: 0, orientation: 0, visible: true },
          ],
        },
        {
          id: 'sym_u2',
          symbolDefId: 'sym_sensor',
          reference: 'U2',
          value: 'Sensor',
          footprint: '',
          x: 100,
          y: 100,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [
            { id: 'p1', number: '1', name: 'SDA', electricalType: 'bidirectional', x: 0, y: 0, length: 0, orientation: 0, visible: true },
          ],
        },
      ],
      wires: [
        { id: 'w1', x1: 10, y1: 10, x2: 20, y2: 10 },
        { id: 'w2', x1: 100, y1: 100, x2: 110, y2: 100 },
      ],
      junctions: [],
      labels: [
        { id: 'lbl1', text: 'I2C_SDA', x: 20, y: 10, type: 'global', orientation: 0 },
        { id: 'lbl2', text: 'I2C_SDA', x: 110, y: 100, type: 'global', orientation: 0 },
      ],
      powerSymbols: [],
    };

    const res = NetConnectivitySolver.solveSheet(sheet);
    expect(res.netGraph.nets['I2C_SDA']).toBeDefined();
    expect(res.netGraph.nets['I2C_SDA'].pins.length).toBe(2);
    expect(res.netGraph.nets['I2C_SDA'].pins.some((p) => p.symbolRef === 'U1')).toBe(true);
    expect(res.netGraph.nets['I2C_SDA'].pins.some((p) => p.symbolRef === 'U2')).toBe(true);
  });

  it('should automatically increment reference designator for repeated placement', () => {
    const symbols: SchematicSymbolInstance[] = [
      { id: 's1', symbolDefId: '', reference: 'R1', value: '', footprint: '', x: 0, y: 0, rotation: 0, mirrorX: false, unit: 1, fields: {}, pins: [] },
      { id: 's2', symbolDefId: '', reference: 'R2', value: '', footprint: '', x: 0, y: 0, rotation: 0, mirrorX: false, unit: 1, fields: {}, pins: [] },
      { id: 's3', symbolDefId: '', reference: 'C1', value: '', footprint: '', x: 0, y: 0, rotation: 0, mirrorX: false, unit: 1, fields: {}, pins: [] },
    ];

    const nextR = SchematicHelper.getNextReference('R', symbols);
    expect(nextR).toBe('R3');

    const nextC = SchematicHelper.getNextReference('C', symbols);
    expect(nextC).toBe('C2');

    const nextU = SchematicHelper.getNextReference('U', symbols);
    expect(nextU).toBe('U1');
  });
});
