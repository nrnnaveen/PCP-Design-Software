import { describe, it, expect } from 'vitest';
import { libraryRegistry } from '../library/libraryRegistry';
import { ERCEngine } from '../erc/ercEngine';
import { createDemoProject } from '../examples/demoProject';

describe('Symbol Library, Drag/Drop & Live ERC Diagnostics Tests', () => {
  it('should retrieve symbols from library registry by category and keyword', () => {
    const allSyms = libraryRegistry.getAllSymbols();
    expect(allSyms.length).toBeGreaterThan(5);

    const mcu = allSyms.find((s) => s.name.includes('STM32') || s.category.includes('MCU'));
    expect(mcu).toBeDefined();

    const passives = allSyms.filter((s) => s.category === 'Passives' || s.library === 'Passives' || s.name === 'R');
    expect(passives.length).toBeGreaterThan(0);
  });

  it('should detect output-to-output contention and power connection conflicts in ERC', () => {
    const project = createDemoProject();
    const sheet = project.schematic.sheets[0];

    // Intentionally add two output pins wired together
    sheet.symbols.push({
      id: 'sym_test_out1',
      symbolDefId: 'sym_gate1',
      reference: 'U99',
      value: 'Driver1',
      footprint: '',
      x: 200,
      y: 200,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      fields: {},
      pins: [
        { id: 'p_out1', number: '1', name: 'OUT1', electricalType: 'output', x: 0, y: 0, length: 0, orientation: 0, visible: true },
      ],
    });

    sheet.symbols.push({
      id: 'sym_test_out2',
      symbolDefId: 'sym_gate2',
      reference: 'U100',
      value: 'Driver2',
      footprint: '',
      x: 220,
      y: 200,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      fields: {},
      pins: [
        { id: 'p_out2', number: '1', name: 'OUT2', electricalType: 'output', x: 0, y: 0, length: 0, orientation: 0, visible: true },
      ],
    });

    sheet.wires.push({
      id: 'w_conflict',
      x1: 200,
      y1: 200,
      x2: 220,
      y2: 200,
    });

    const violations = ERCEngine.run(project);
    const outputConflict = violations.find((v) => v.code === 'ERC003' || v.severity === 'error');
    expect(outputConflict).toBeDefined();
    expect(outputConflict?.description).toContain('output');
  });
});
