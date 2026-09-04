/**
 * FloZ EDA - Manufacturing-Grade Validation Test Suite
 * Tests Gerber RS-274X, Excellon Drill, BOM, Pick & Place, KiCad Interoperability,
 * DFM rule validation, Board Outline checks, and Export Blocking.
 */

import { describe, it, expect } from 'vitest';
import { createDemoProject, createEmptyProject } from '../examples/demoProject';
import { AITools } from '../ai/aiTools';
import { GerberGenerator } from '../manufacturing/gerberGenerator';
import { ExcellonDrillGenerator } from '../manufacturing/excellonDrill';
import { BOMGenerator, PickAndPlaceGenerator } from '../manufacturing/bomGenerator';
import { KiCadExporter } from '../manufacturing/kicadExporter';
import { ManufacturingReportGenerator } from '../manufacturing/manufacturingReport';
import { DRCEngine } from '../drc/drcEngine';
import { ERCEngine } from '../erc/ercEngine';

describe('FloZ EDA — Manufacturing-Grade Validation', () => {
  const esp32Prompt =
    'Create a small ESP32 sensor board with an ESP32 module, 3.3V voltage regulator, 100uF input capacitor, two 100nF decoupling capacitors, an I2C temperature sensor, one status LED with a 1k resistor, one push button with a 10k pull-up resistor, and a USB power input. Generate the schematic, assign footprints, generate the PCB, place and route components, run ERC and DRC, and show the 3D board.';

  const usbPrompt =
    'Create a complete 5V USB power indicator PCB. Use a 5V input connector, 1A polyfuse, 1N5819 reverse polarity protection diode, 100uF electrolytic capacitor, 100nF ceramic capacitor, 1k resistor and red 5mm LED. Generate the schematic, assign valid footprints, create the PCB, place components, route all connections, add a GND plane, run ERC and DRC, fix safe errors, and show the final 3D PCB.';

  it('1. Generates valid RS-274X Gerber layers with aperture definitions and coordinates', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    const fCu = GerberGenerator.generateLayer(generated, 'F.Cu');
    const bCu = GerberGenerator.generateLayer(generated, 'B.Cu');
    const fMask = GerberGenerator.generateLayer(generated, 'F.Mask');
    const bMask = GerberGenerator.generateLayer(generated, 'B.Mask');
    const fSilk = GerberGenerator.generateLayer(generated, 'F.Silkscreen');
    const edgeCuts = GerberGenerator.generateLayer(generated, 'Edge.Cuts');

    // Header & Format checks
    [fCu, bCu, fMask, bMask, fSilk, edgeCuts].forEach((gbr) => {
      expect(gbr).toContain('G04 FloZ ECA RS-274X Gerber Generator');
      expect(gbr).toContain('%FSLAX46Y46*%');
      expect(gbr).toContain('%MOMM*%');
      expect(gbr).toContain('M02*');
    });

    // Content checks
    expect(fCu).toContain('D11*'); // Aperture selection (0.25mm trace)
    expect(fCu).toContain('X'); // X coordinate
    expect(fCu).toContain('Y'); // Y coordinate
    expect(fCu).toContain('D01*'); // Linear interpolation line draw
    expect(fCu).toContain('G36*'); // Zone filled polygon start
    expect(fCu).toContain('G37*'); // Zone filled polygon end

    expect(edgeCuts).toContain('D10*');
    expect(fSilk).toContain('D10*');
    expect(fMask).toContain('D17*'); // Through hole mask openings
  });

  it('2. Generates Excellon NC Drill file with correct tool definitions and coordinates', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(usbPrompt, project)!.applyAction(project);

    const drl = ExcellonDrillGenerator.generate(generated);

    expect(drl).toContain('; FloZ ECA Excellon NC Drill File');
    expect(drl).toContain('METRIC,TZ');
    expect(drl).toContain('T01C');
    expect(drl).toContain('G90');
    expect(drl).toContain('G05');
    expect(drl).toContain('X');
    expect(drl).toContain('Y');
    expect(drl).toContain('M30');
  });

  it('3. Generates structured BOM grouped by Value and Footprint', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    const bom = BOMGenerator.generateBOM(generated);
    expect(bom.length).toBeGreaterThanOrEqual(7);

    // Verify 100nF decoupling capacitors are grouped together
    const cap100n = bom.find((b) => b.value === '100nF');
    expect(cap100n).toBeDefined();
    expect(cap100n!.quantity).toBeGreaterThanOrEqual(2);

    const csv = BOMGenerator.exportCSV(generated);
    expect(csv).toContain('"Reference","Quantity","Value","Footprint"');
    expect(csv).toContain('100nF');
  });

  it('4. Generates SMT Centroid Pick and Place CSV with valid positions and rotations', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    const pnp = PickAndPlaceGenerator.generate(generated);
    expect(pnp).toContain('"Designator","Val","Package","Mid X","Mid Y","Rotation","Layer"');
    expect(pnp).toContain('ESP32');
    expect(pnp).toContain('Top');
  });

  it('5. Exports valid KiCad v7/v8/v9 compatible .kicad_sch and .kicad_pcb S-expressions', () => {
    const project = createEmptyProject();
    project.metadata.name = 'ESP32_SENSOR_NODE';
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    const kicadSch = KiCadExporter.exportSchematic(generated);
    const kicadPcb = KiCadExporter.exportPCB(generated);

    // Schematic sexpr validation
    expect(kicadSch.startsWith('(kicad_sch')).toBe(true);
    expect(kicadSch).toContain('(generator "FloZ EDA")');
    expect(kicadSch).toContain('(symbol');
    expect(kicadSch).toContain('(property "Reference"');
    expect(kicadSch).toContain('(wire');

    // PCB sexpr validation
    expect(kicadPcb.startsWith('(kicad_pcb')).toBe(true);
    expect(kicadPcb).toContain('(generator "FloZ EDA")');
    expect(kicadPcb).toContain('(layers');
    expect(kicadPcb).toContain('(net 1 "');
    expect(kicadPcb).toContain('(footprint "');
    expect(kicadPcb).toContain('(segment (start');
    expect(kicadPcb).toContain('(zone (net');
    expect(kicadPcb).toContain('(gr_line (start');
  });

  it('6. Generates comprehensive Manufacturing Fabrication Metrics & DFM Report', () => {
    const project = createEmptyProject();
    project.metadata.name = 'ESP32_SENSOR_NODE';
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    const metrics = ManufacturingReportGenerator.generateMetrics(generated);
    expect(metrics.projectName).toBe('ESP32_SENSOR_NODE');
    expect(metrics.boardWidthMm).toBeGreaterThan(30);
    expect(metrics.boardHeightMm).toBeGreaterThan(20);
    expect(metrics.componentCount).toBe(11);
    expect(metrics.padCount).toBeGreaterThan(20);
    expect(metrics.trackSegmentCount).toBeGreaterThan(0);
    expect(metrics.totalTrackLengthMm).toBeGreaterThan(10);
    expect(metrics.copperZoneCount).toBe(2);

    const textReport = ManufacturingReportGenerator.generateTextReport(generated);
    expect(textReport).toContain('FLOZ EDA — MANUFACTURING FABRICATION REPORT');
    expect(textReport).toContain('BOARD SPECIFICATIONS');
    expect(textReport).toContain('ROUTING & DRILL METRICS');
    expect(textReport).toContain('DESIGN FOR MANUFACTURING (DFM) VALIDATION');
  });

  it('7. Enforces Export Blocking when project has missing outline or unrouted connections', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    // Intentionally break board outline
    const invalidOutlinePrj = {
      ...generated,
      pcb: {
        ...generated.pcb,
        boardOutline: [],
      },
    };

    const outlineMetrics = ManufacturingReportGenerator.generateMetrics(invalidOutlinePrj);
    expect(outlineMetrics.isManufacturable).toBe(false);
    expect(outlineMetrics.blockReason).toContain('Board outline');

    // Intentionally strip tracks to create unrouted connections
    const unroutedPrj = {
      ...generated,
      pcb: {
        ...generated.pcb,
        tracks: [],
      },
    };

    const unroutedMetrics = ManufacturingReportGenerator.generateMetrics(unroutedPrj);
    expect(unroutedMetrics.isManufacturable).toBe(false);
    expect(unroutedMetrics.blockReason).toContain('unrouted electrical connection');
  });
});
