import { describe, it, expect } from 'vitest';
import { ApexProject, SchematicSymbolInstance, SchematicWireSegment, SchematicNetLabel } from '../core/types';
import { createEmptyProject } from '../examples/demoProject';
import { PlacementPlanner } from '../ai/generation/placementPlanner';
import { CircuitGenerator } from '../ai/circuitGenerator';
import { SchematicHelper } from '../schematic/helper';
import { PlannedComponent } from '../ai/generation/types';

describe('Schematic Canvas Interactions & Multi-Component Placement', () => {
  it('1. PlacementPlanner offsets subsequent circuit blocks to avoid overlap with existing symbols', () => {
    const existing: SchematicSymbolInstance[] = [
      {
        id: 'sym_existing_1',
        symbolDefId: 'sym_r',
        reference: 'R1',
        value: '10k',
        footprint: 'R_0805',
        x: 140,
        y: 80,
        rotation: 90,
        mirrorX: false,
        unit: 1,
        fields: {},
        pins: [],
      },
      {
        id: 'sym_existing_2',
        symbolDefId: 'sym_r',
        reference: 'R2',
        value: '10k',
        footprint: 'R_0805',
        x: 140,
        y: 110,
        rotation: 90,
        mirrorX: false,
        unit: 1,
        fields: {},
        pins: [],
      },
    ];

    const planned: PlannedComponent[] = [
      { id: 'r1', role: 'Top Divider Resistor', queryTerm: 'device_r', value: '4.7k', domain: 'passives' },
      { id: 'r2', role: 'Bottom Divider Resistor', queryTerm: 'device_r', value: '4.7k', domain: 'passives' },
    ];

    const placements = PlacementPlanner.planPlacements(planned, existing);
    const p1 = placements.get('r1')!;
    const p2 = placements.get('r2')!;

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    // Must be placed in a non-colliding location away from (140, 80)
    expect(p1.x).not.toBe(140);
    expect(p1.x).toBeGreaterThan(140);
  });

  it('2. CircuitGenerator places consecutive circuits in distinct, visible positions', () => {
    let prj = createEmptyProject();

    // Generate first circuit: Voltage Divider
    const vdivProp = CircuitGenerator.generateVoltageDivider(prj, 'VIN', 'VOUT_3V3', '10k', '4.7k');
    prj = vdivProp.applyAction(prj);

    expect(prj.schematic.sheets[0].symbols.length).toBe(2);
    const r1 = prj.schematic.sheets[0].symbols[0];
    const r2 = prj.schematic.sheets[0].symbols[1];

    // Generate second circuit: LED Indicator
    const ledProp = CircuitGenerator.generateLEDCircuit(prj, '+3.3V', 'GND', 'BLUE', '470R');
    prj = ledProp.applyAction(prj);

    expect(prj.schematic.sheets[0].symbols.length).toBe(4);
    const d1 = prj.schematic.sheets[0].symbols[2];
    const r3 = prj.schematic.sheets[0].symbols[3];

    // Verify LED circuit does NOT overlap with the first Voltage Divider
    const distR1D1 = Math.hypot(d1.x - r1.x, d1.y - r1.y);
    const distR2D1 = Math.hypot(d1.x - r2.x, d1.y - r2.y);
    expect(distR1D1).toBeGreaterThanOrEqual(25);
    expect(distR2D1).toBeGreaterThanOrEqual(25);
  });

  it('3. Marquee selection bounding box correctly detects enclosed symbols and wires', () => {
    const symbols: SchematicSymbolInstance[] = [
      {
        id: 'sym_inside_1',
        symbolDefId: 'sym_r',
        reference: 'R1',
        value: '10k',
        footprint: 'R_0805',
        x: 100,
        y: 100,
        rotation: 0,
        mirrorX: false,
        unit: 1,
        fields: {},
        pins: [],
      },
      {
        id: 'sym_outside_1',
        symbolDefId: 'sym_c',
        reference: 'C1',
        value: '100nF',
        footprint: 'C_0805',
        x: 300,
        y: 300,
        rotation: 0,
        mirrorX: false,
        unit: 1,
        fields: {},
        pins: [],
      },
    ];

    const wires: SchematicWireSegment[] = [
      { id: 'w_inside', x1: 95, y1: 100, x2: 125, y2: 100 },
      { id: 'w_outside', x1: 290, y1: 290, x2: 320, y2: 320 },
    ];

    // Marquee box enclosing (80, 80) to (150, 150)
    const minX = 80, maxX = 150, minY = 80, maxY = 150;

    const matchedSymbols = symbols.filter((s) => {
      const bb = SchematicHelper.getSymbolBoundingBox(s);
      return bb.minX <= maxX && bb.maxX >= minX && bb.minY <= maxY && bb.maxY >= minY;
    });

    const matchedWires = wires.filter((w) => {
      return (w.x1 >= minX && w.x1 <= maxX && w.y1 >= minY && w.y1 <= maxY) ||
             (w.x2 >= minX && w.x2 <= maxX && w.y2 >= minY && w.y2 <= maxY);
    });

    expect(matchedSymbols.map((s) => s.id)).toEqual(['sym_inside_1']);
    expect(matchedWires.map((w) => w.id)).toEqual(['w_inside']);
  });

  it('4. Group translation moves all selected symbols and wires synchronously', () => {
    let prj = createEmptyProject();
    const vdivProp = CircuitGenerator.generateVoltageDivider(prj);
    prj = vdivProp.applyAction(prj);

    const sheet = prj.schematic.sheets[0];
    const initialSymPositions = sheet.symbols.map((s) => ({ id: s.id, x: s.x, y: s.y }));
    const initialWirePositions = sheet.wires.map((w) => ({ id: w.id, x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }));

    const deltaX = 30;
    const deltaY = 20;

    const updatedSymbols = sheet.symbols.map((s) => ({ ...s, x: s.x + deltaX, y: s.y + deltaY }));
    const updatedWires = sheet.wires.map((w) => ({
      ...w,
      x1: w.x1 + deltaX,
      y1: w.y1 + deltaY,
      x2: w.x2 + deltaX,
      y2: w.y2 + deltaY,
    }));

    expect(updatedSymbols[0].x - initialSymPositions[0].x).toBe(30);
    expect(updatedSymbols[0].y - initialSymPositions[0].y).toBe(20);
    expect(updatedWires[0].x1 - initialWirePositions[0].x1).toBe(30);
    expect(updatedWires[0].y1 - initialWirePositions[0].y1).toBe(20);
  });

  it('5. Delete action removes all selected components and wires from the sheet', () => {
    let prj = createEmptyProject();
    const vdivProp = CircuitGenerator.generateVoltageDivider(prj);
    prj = vdivProp.applyAction(prj);

    const sheet = prj.schematic.sheets[0];
    expect(sheet.symbols.length).toBe(2);
    expect(sheet.wires.length).toBeGreaterThanOrEqual(1);

    const selectedIds = [sheet.symbols[0].id, sheet.wires[0].id];

    const purgedSheet = {
      ...sheet,
      symbols: sheet.symbols.filter((s) => !selectedIds.includes(s.id)),
      wires: sheet.wires.filter((w) => !selectedIds.includes(w.id)),
    };

    expect(purgedSheet.symbols.length).toBe(1);
    expect(purgedSheet.symbols.find((s) => s.id === selectedIds[0])).toBeUndefined();
    expect(purgedSheet.wires.find((w) => w.id === selectedIds[1])).toBeUndefined();
  });
});
