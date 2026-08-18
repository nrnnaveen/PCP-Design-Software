/**
 * FloZ EDA - Multi-Unit Symbol & Library Import Test Suite
 * Tests generic multi-unit symbol parsing, units preservation, pin identity,
 * PCB footprint unification, pin-to-pad mapping, and AI workflow integration.
 */

import { describe, it, expect } from 'vitest';
import { KiCadSymbolParser, KiCadFootprintParser } from '../library/kicadParser';
import { createEmptyProject } from '../examples/demoProject';
import { AITools } from '../ai/aiTools';
import { AutoPlacer } from '../pcb/autoPlacer';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';
import { BOMGenerator } from '../manufacturing/bomGenerator';
import { KiCadExporter } from '../manufacturing/kicadExporter';
import { PinMappingValidator } from '../library/assetResolver';
import { libraryRegistry } from '../library/libraryRegistry';
import { footprintLibrary } from '../library/footprintLibrary';

describe('FloZ EDA — Multi-Unit Symbol & Library Import', () => {
  const cd4010KicadSym = `(kicad_symbol_lib (version 20211014) (generator "kicad_symbol_editor")
    (symbol "4xxx:4010" (in_bom yes) (on_board yes)
      (property "Reference" "U" (id 0) (at -10.16 7.62 0))
      (property "Value" "4010" (id 1) (at 0 8.89 0))
      (property "Footprint" "Package_DIP:DIP-16_W7.62mm" (id 2) (at 0 0 0))
      (property "Datasheet" "http://www.intersil.com/content/dam/Intersil/documents/cd40/cd4009ub-10b.pdf")
      (property "Description" "Hex Non-Inverting Buffer")
      (symbol "4010_0_1"
        (rectangle (start -5.08 6.35) (end 5.08 -6.35) (stroke (width 0.254)))
      )
      (symbol "4010_1_1"
        (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)))
        (pin input line (at -10.16 0 0) (length 5.08) (name "IN_A" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
        (pin output line (at 10.16 0 180) (length 5.08) (name "OUT_A" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
      )
      (symbol "4010_2_1"
        (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)))
        (pin input line (at -10.16 0 0) (length 5.08) (name "IN_B") (number "5"))
        (pin output line (at 10.16 0 180) (length 5.08) (name "OUT_B") (number "4"))
      )
      (symbol "4010_3_1"
        (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)))
        (pin input line (at -10.16 0 0) (length 5.08) (name "IN_C") (number "7"))
        (pin output line (at 10.16 0 180) (length 5.08) (name "OUT_C") (number "6"))
      )
      (symbol "4010_4_1"
        (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)))
        (pin input line (at -10.16 0 0) (length 5.08) (name "IN_D") (number "9"))
        (pin output line (at 10.16 0 180) (length 5.08) (name "OUT_D") (number "10"))
      )
      (symbol "4010_5_1"
        (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)))
        (pin input line (at -10.16 0 0) (length 5.08) (name "IN_E") (number "11"))
        (pin output line (at 10.16 0 180) (length 5.08) (name "OUT_E") (number "12"))
      )
      (symbol "4010_6_1"
        (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)))
        (pin input line (at -10.16 0 0) (length 5.08) (name "IN_F") (number "14"))
        (pin output line (at 10.16 0 180) (length 5.08) (name "OUT_F") (number "15"))
      )
      (symbol "4010_7_1"
        (pin power_in line (at 0 7.62 270) (length 5.08) (name "VDD") (number "1"))
        (pin power_in line (at 0 7.62 270) (length 5.08) (name "VCC") (number "16"))
        (pin power_in line (at 0 -7.62 90) (length 5.08) (name "VSS") (number "8"))
      )
    )
  )`;

  it('1. Imports single-unit symbol correctly without collapsing or errors', () => {
    const singleSym = `(kicad_symbol_lib (version 20211014) (generator "kicad_symbol_editor")
      (symbol "Device:R"
        (property "Reference" "R") (property "Value" "R") (property "Footprint" "Resistor_SMD:R_0805_2012Metric")
        (symbol "R_0_1" (rectangle (start -1 2) (end 1 -2) (stroke (width 0.25))))
        (symbol "R_1_1"
          (pin passive line (at 0 4 270) (length 2) (name "~") (number "1"))
          (pin passive line (at 0 -4 90) (length 2) (name "~") (number "2"))
        )
      )
    )`;

    const parsed = KiCadSymbolParser.parse(singleSym, 'Device');
    expect(parsed.errors.length).toBe(0);
    expect(parsed.symbols.length).toBe(1);

    const r = parsed.symbols[0];
    expect(r.name).toBe('R');
    expect(r.unitCount).toBe(1);
    expect(r.pins.length).toBe(2);
    expect(r.shapes.length).toBeGreaterThanOrEqual(1);
  });

  it('2. Imports 4010 multi-unit symbol with all 7 units, retaining exact pin identities and non-sequential pins', () => {
    const parsed = KiCadSymbolParser.parse(cd4010KicadSym, '4xxx');
    expect(parsed.errors.length).toBe(0);
    expect(parsed.symbols.length).toBe(1);

    const s4010 = parsed.symbols[0];
    expect(s4010.name).toBe('4010');
    expect(s4010.unitCount).toBe(7);
    expect(s4010.units?.length).toBe(7);

    // Verify Unit A has pins 3 (IN) and 2 (OUT)
    const unitA = s4010.units![0];
    expect(unitA.unit).toBe(1);
    expect(unitA.name).toBe('A');
    expect(unitA.pins.map((p) => p.number)).toEqual(['3', '2']);

    // Verify Unit F has pins 14 (IN) and 15 (OUT)
    const unitF = s4010.units![5];
    expect(unitF.unit).toBe(6);
    expect(unitF.name).toBe('F');
    expect(unitF.pins.map((p) => p.number)).toEqual(['14', '15']);

    // Verify Power unit has pins 1 (VDD), 16 (VCC), 8 (VSS)
    const powerUnit = s4010.units![6];
    expect(powerUnit.unit).toBe(7);
    expect(powerUnit.isPower).toBe(true);
    expect(powerUnit.pins.map((p) => p.number)).toEqual(['1', '16', '8']);

    // Verify total pins collected
    expect(s4010.pins.length).toBe(15);
  });

  it('3. Imports 7400 Quad NAND and LM358 Dual Op-Amp multi-unit symbols', () => {
    const s7400 = libraryRegistry.getSymbolById('74xx_7400');
    expect(s7400).toBeDefined();
    expect(s7400!.unitCount).toBe(5);
    expect(s7400!.units?.length).toBe(5);

    const lm358 = libraryRegistry.getSymbolById('linear_lm358');
    expect(lm358).toBeDefined();
    expect(lm358!.unitCount).toBe(3);
    expect(lm358!.units?.length).toBe(3);
    expect(lm358!.units![0].pins.map((p) => p.number)).toEqual(['2', '3', '1']);
    expect(lm358!.units![1].pins.map((p) => p.number)).toEqual(['6', '5', '7']);
  });

  it('4. Ensures multiple units belonging to the same logical component resolve to exactly ONE PCB footprint', () => {
    const project = createEmptyProject();
    const sheet = project.schematic.sheets[0];
    const s4010 = libraryRegistry.getSymbolById('4xxx_4010')!;

    // Place Unit A and Unit B for logical component U1
    sheet.symbols.push({
      id: 'sym_u1a',
      symbolDefId: s4010.id,
      reference: 'U1',
      value: '4010',
      footprint: 'Package_DIP:DIP-16_W7.62mm',
      x: 30,
      y: 30,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      unitSuffix: 'A',
      fields: {},
      pins: JSON.parse(JSON.stringify(s4010.units![0].pins)),
    });

    sheet.symbols.push({
      id: 'sym_u1b',
      symbolDefId: s4010.id,
      reference: 'U1',
      value: '4010',
      footprint: 'Package_DIP:DIP-16_W7.62mm',
      x: 60,
      y: 30,
      rotation: 0,
      mirrorX: false,
      unit: 2,
      unitSuffix: 'B',
      fields: {},
      pins: JSON.parse(JSON.stringify(s4010.units![1].pins)),
    });

    // Run PCB placement
    const placed = AutoPlacer.placeComponents(project);
    const u1Footprints = placed.pcb.footprints.filter((fp) => fp.reference === 'U1');

    // MUST be exactly ONE footprint on PCB!
    expect(u1Footprints.length).toBe(1);
    expect(u1Footprints[0].pads.length).toBe(16);
  });

  it('5. Validates pin-to-pad compatibility for multi-unit 4010 with DIP-16 and SOIC-16 footprints', () => {
    const s4010 = libraryRegistry.getSymbolById('4xxx_4010')!;
    const dip16 = footprintLibrary.getFootprint('Package_DIP:DIP-16_W7.62mm')!;
    const soic16 = footprintLibrary.getFootprint('Package_SO:SOIC-16_3.9x9.9mm_P1.27mm')!;

    expect(dip16).toBeDefined();
    expect(soic16).toBeDefined();

    const dip16Validation = PinMappingValidator.validate(s4010, dip16);
    expect(dip16Validation.compatible).toBe(true);

    const soic16Validation = PinMappingValidator.validate(s4010, soic16);
    expect(soic16Validation.compatible).toBe(true);
  });

  it('6. Generates BOM with correct quantity for multi-unit components', () => {
    const project = createEmptyProject();
    const sheet = project.schematic.sheets[0];
    const s4010 = libraryRegistry.getSymbolById('4xxx_4010')!;

    // Place 3 units for U1
    for (let u = 1; u <= 3; u++) {
      sheet.symbols.push({
        id: `sym_u1_${u}`,
        symbolDefId: s4010.id,
        reference: 'U1',
        value: '4010',
        footprint: 'Package_DIP:DIP-16_W7.62mm',
        x: 30 * u,
        y: 30,
        rotation: 0,
        mirrorX: false,
        unit: u,
        unitSuffix: String.fromCharCode(64 + u),
        fields: {},
        pins: JSON.parse(JSON.stringify(s4010.units![u - 1].pins)),
      });
    }

    const bom = BOMGenerator.generateBOM(project);
    expect(bom.length).toBe(1);
    expect(bom[0].reference).toBe('U1');
    expect(bom[0].quantity).toBe(1); // Exactly 1 IC component
  });

  it('7. Executes full autonomous AI EDA workflow for 4010 circuit', () => {
    const project = createEmptyProject();
    const prompt = 'Create a circuit using a 4010 hex buffer.';
    const proposal = AITools.proposeGenerateCompleteCircuitAndPCB(prompt, project);
    expect(proposal).toBeDefined();

    const result = proposal!.applyAction(project);
    expect(result.schematic.sheets[0].symbols.length).toBeGreaterThanOrEqual(4);

    // Verify U1 has multiple units in schematic
    const u1Units = result.schematic.sheets[0].symbols.filter((s) => s.reference === 'U1');
    expect(u1Units.length).toBeGreaterThanOrEqual(2);

    // Verify PCB has exactly ONE U1 footprint
    const u1Pcbs = result.pcb.footprints.filter((fp) => fp.reference === 'U1');
    expect(u1Pcbs.length).toBe(1);

    // Verify ERC & DRC
    const erc = ERCEngine.run(result);
    const drc = DRCEngine.run(result);
    expect(erc.filter((e) => e.severity === 'error').length).toBe(0);

    // Verify KiCad export
    const kicadSch = KiCadExporter.exportSchematic(result);
    const kicadPcb = KiCadExporter.exportPCB(result);
    expect(kicadSch).toContain('4010');
    expect(kicadPcb).toContain('(footprint "Package_DIP:DIP-16_W7.62mm"');
  });
});
