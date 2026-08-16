import { describe, it, expect } from 'vitest';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { SchematicAnnotator } from '../schematic/annotator';
import { createDemoProject } from '../examples/demoProject';

describe('Schematic Connectivity & Netlist Tests', () => {
  it('should extract connected nets from wires, pins, and labels', () => {
    const demo = createDemoProject();
    const sheet = demo.schematic.sheets[0];
    const analysis = NetConnectivitySolver.solveSheet(sheet);

    expect(analysis.netGraph.nets).toBeDefined();
    // Verify power rails exist
    expect(analysis.netGraph.nets['VBUS']).toBeDefined();
    expect(analysis.netGraph.nets['+3.3V']).toBeDefined();
    expect(analysis.netGraph.nets['GND']).toBeDefined();

    // Verify I2C nets
    expect(analysis.netGraph.nets['I2C_SCL']).toBeDefined();
    expect(analysis.netGraph.nets['I2C_SDA']).toBeDefined();
  });

  it('should annotate unnumbered references properly without duplicates', () => {
    const demo = createDemoProject();
    let sheet = demo.schematic.sheets[0];

    // Reset annotation to 'R?', 'C?', 'U?'
    sheet = SchematicAnnotator.resetAnnotation(sheet);
    expect(sheet.symbols.some((s) => s.reference.includes('?'))).toBe(true);

    // Renumber
    sheet = SchematicAnnotator.annotate(sheet);
    const refs = sheet.symbols.map((s) => s.reference);
    const uniqueRefs = new Set(refs);

    expect(refs.length).toBe(uniqueRefs.size);
    expect(refs.some((r) => r.includes('?'))).toBe(false);
  });
});
