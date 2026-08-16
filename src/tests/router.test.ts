import { describe, it, expect } from 'vitest';
import { InteractiveRouter } from '../router/router';
import { LengthTuner } from '../router/lengthTuning';
import { DiffPairRouter } from '../router/diffPair';
import { MNASimulationEngine } from '../simulation/mnaSolver';
import { GerberGenerator } from '../manufacturing/gerberGenerator';
import { ExcellonDrillGenerator } from '../manufacturing/excellonDrill';
import { BOMGenerator, PickAndPlaceGenerator } from '../manufacturing/bomGenerator';
import { createDemoProject } from '../examples/demoProject';

describe('PCB Router, Simulation & Manufacturing Output Tests', () => {
  it('should compute valid 45-degree octilinear routing paths', () => {
    const p1 = { x: 10, y: 10 };
    const p2 = { x: 30, y: 20 };
    const segments = InteractiveRouter.compute45DegreePath(p1, p2, 0);

    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments[0].x1).toBe(10);
    expect(segments[0].y1).toBe(10);

    // End of last segment must reach p2
    const lastSeg = segments[segments.length - 1];
    expect(lastSeg.x2).toBe(30);
    expect(lastSeg.y2).toBe(20);
  });

  it('should generate serpentine length tuning meanders', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 20, y: 0 };
    const targetExtra = 15; // 15mm extra length
    const meanders = LengthTuner.generateSerpentine(p1, p2, targetExtra, 2.0, 1.0);

    expect(meanders.length).toBeGreaterThan(0);
  });

  it('should solve SPICE transient waveforms with valid non-zero voltages', () => {
    const demo = createDemoProject();
    const results = MNASimulationEngine.run(demo, {
      type: 'transient',
      stopTime: 0.005,
      timeStep: 1e-5,
      probes: [],
    });

    expect(results.timeline.length).toBeGreaterThan(100);
    expect(results.traces['+3.3V']).toBeDefined();
    // Verify LDO settled to 3.3V
    const lastV3v3 = results.traces['+3.3V'][results.traces['+3.3V'].length - 1];
    expect(lastV3v3).toBeCloseTo(3.3, 1);
  });

  it('should generate valid RS-274X Gerber and Excellon drill syntax', () => {
    const demo = createDemoProject();
    const fcuGerber = GerberGenerator.generateLayer(demo, 'F.Cu');

    expect(fcuGerber).toContain('%FSLAX46Y46*%');
    expect(fcuGerber).toContain('%MOMM*%');
    expect(fcuGerber).toContain('M02*'); // End of program

    const excellon = ExcellonDrillGenerator.generate(demo);
    expect(excellon).toContain('M48');
    expect(excellon).toContain('METRIC');
    expect(excellon).toContain('M30'); // End of drill program
  });

  it('should generate accurate Bill of Materials and Pick and Place CSVs', () => {
    const demo = createDemoProject();
    const bom = BOMGenerator.generateBOM(demo);
    expect(bom.length).toBeGreaterThan(0);

    const bomCsv = BOMGenerator.exportCSV(demo);
    expect(bomCsv).toContain('Reference');
    expect(bomCsv).toContain('Quantity');
    expect(bomCsv).toContain('STM32F401');

    const pnpCsv = PickAndPlaceGenerator.generate(demo);
    expect(pnpCsv).toContain('Designator');
    expect(pnpCsv).toContain('Mid X');
    expect(pnpCsv).toContain('U1');
  });
});
