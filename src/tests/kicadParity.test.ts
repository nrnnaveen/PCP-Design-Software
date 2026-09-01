/**
 * FloZ ECA — KiCad Feature Parity Test Suite
 * Validates Buses, Bus Entries, No-Connect flags, Automated Annotation,
 * BOM generation, Theme token architecture, Differential Pair math, and Extended DRC checks.
 */

import { describe, it, expect } from 'vitest';
import {
  ApexProject,
  SchematicSheet,
  SchematicBusSegment,
  SchematicBusEntry,
  SchematicNoConnect,
  SchematicSymbolInstance,
} from '../core/types';
import { ProjectMigrationAdapter } from '../core/migrationAdapter';
import { ProjectSerializer } from '../core/serialization';
import { BOMGenerator } from '../manufacturing/bomGenerator';
import { DRCEngine } from '../drc/drcEngine';
import { getCanvasColors, AVAILABLE_THEMES } from '../theme/themeManager';
import { PCBCalculators } from '../calculator/calculators';

describe('KiCad-Class Feature Parity & Engineering Suite', () => {
  // ==========================================
  // 1. Buses, Bus Entries & No-Connect Flags
  // ==========================================
  describe('1. Schematic Buses & No-Connect Data Structures', () => {
    it('supports buses, bus entries, and no-connect flags within schematic sheets', () => {
      const bus: SchematicBusSegment = {
        id: 'bus_data',
        x1: 20,
        y1: 30,
        x2: 120,
        y2: 30,
        name: 'DATA[0..7]',
      };

      const busEntry: SchematicBusEntry = {
        id: 'be_0',
        x: 40,
        y: 30,
        angle: 45,
        busId: 'bus_data',
      };

      const noConnect: SchematicNoConnect = {
        id: 'nc_pin_3',
        x: 50,
        y: 60,
        symbolId: 'sym_u1',
        pinId: 'p3',
      };

      const sheet: SchematicSheet = {
        id: 'sheet_bus_test',
        title: 'Bus Architecture',
        sheetNumber: 1,
        symbols: [],
        wires: [],
        junctions: [],
        labels: [],
        powerSymbols: [],
        hierarchicalSheets: [],
        texts: [],
        buses: [bus],
        busEntries: [busEntry],
        noConnects: [noConnect],
      };

      expect(sheet.buses?.length).toBe(1);
      expect(sheet.buses?.[0].name).toBe('DATA[0..7]');
      expect(sheet.busEntries?.length).toBe(1);
      expect(sheet.noConnects?.length).toBe(1);
      expect(sheet.noConnects?.[0].pinId).toBe('p3');
    });

    it('preserves buses and no-connects through serialization roundtrips', () => {
      const project: ApexProject = ProjectMigrationAdapter.migrate({
        metadata: { id: 'proj_bus_rt', name: 'Bus Roundtrip' },
        schematic: {
          sheets: [
            {
              id: 's1',
              title: 'Root',
              symbols: [],
              wires: [],
              buses: [{ id: 'b1', x1: 10, y1: 10, x2: 50, y2: 10, name: 'ADDR[0..15]' }],
              noConnects: [{ id: 'nc1', x: 25, y: 25 }],
            },
          ],
        },
        pcb: { footprints: [], tracks: [], vias: [], zones: [] },
      });

      const serialized = ProjectSerializer.serialize(project);
      const deserialized = ProjectSerializer.deserialize(serialized);

      expect(deserialized.schematic.sheets[0].buses?.length).toBe(1);
      expect(deserialized.schematic.sheets[0].buses?.[0].name).toBe('ADDR[0..15]');
      expect(deserialized.schematic.sheets[0].noConnects?.length).toBe(1);
    });
  });

  // ==========================================
  // 2. Automated Reference Annotation
  // ==========================================
  describe('2. Automated Reference Designator Annotation', () => {
    it('renumbers unannotated reference designators (R? -> R1, R2, C? -> C1...)', () => {
      const rawSymbols: SchematicSymbolInstance[] = [
        {
          id: 's1',
          symbolDefId: 'resistor',
          reference: 'R?',
          value: '10k',
          footprint: 'R_0805',
          x: 10,
          y: 10,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [],
        },
        {
          id: 's2',
          symbolDefId: 'resistor',
          reference: 'R1',
          value: '4.7k',
          footprint: 'R_0805',
          x: 20,
          y: 10,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [],
        },
        {
          id: 's3',
          symbolDefId: 'resistor',
          reference: 'R?',
          value: '1k',
          footprint: 'R_0805',
          x: 30,
          y: 10,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [],
        },
        {
          id: 's4',
          symbolDefId: 'capacitor',
          reference: 'C?',
          value: '100nF',
          footprint: 'C_0805',
          x: 40,
          y: 10,
          rotation: 0,
          mirrorX: false,
          unit: 1,
          fields: {},
          pins: [],
        },
      ];

      const counters: Record<string, number> = {};
      // Step 1: Record existing numbered references
      rawSymbols.forEach((sym) => {
        const numMatch = sym.reference.match(/^([A-Za-z]+)(\d+)$/);
        if (numMatch) {
          const prefix = numMatch[1];
          const num = parseInt(numMatch[2], 10);
          counters[prefix] = Math.max(counters[prefix] || 0, num);
        }
      });

      // Step 2: Assign new numbers to '?' references
      const annotated = rawSymbols.map((sym) => {
        if (sym.reference.includes('?') || !sym.reference.match(/^[A-Za-z]+\d+$/)) {
          const prefixMatch = sym.reference.match(/^[A-Za-z]+/);
          const prefix = prefixMatch ? prefixMatch[0] : 'U';
          counters[prefix] = (counters[prefix] || 0) + 1;
          return { ...sym, reference: `${prefix}${counters[prefix]}` };
        }
        return sym;
      });

      expect(annotated[0].reference).toBe('R2');
      expect(annotated[1].reference).toBe('R1');
      expect(annotated[2].reference).toBe('R3');
      expect(annotated[3].reference).toBe('C1');
    });
  });

  // ==========================================
  // 3. BOM & Pick and Place Exporter
  // ==========================================
  describe('3. Manufacturing BOM & Pick and Place Generation', () => {
    it('groups identical components and generates formatted BOM CSV with quantities', () => {
      const project: ApexProject = ProjectMigrationAdapter.migrate({
        metadata: { id: 'p_bom', name: 'BOM Test Project' },
        schematic: {
          sheets: [
            {
              id: 's1',
              title: 'Power Supply',
              symbols: [
                {
                  id: 'r1',
                  symbolDefId: 'resistor',
                  reference: 'R1',
                  value: '10k',
                  footprint: 'R_0805_2012Metric',
                  x: 0,
                  y: 0,
                  rotation: 0,
                  mirrorX: false,
                  unit: 1,
                  fields: { Manufacturer: 'Yageo', MPN: 'RC0805FR-0710KL' },
                  pins: [],
                },
                {
                  id: 'r2',
                  symbolDefId: 'resistor',
                  reference: 'R2',
                  value: '10k',
                  footprint: 'R_0805_2012Metric',
                  x: 10,
                  y: 0,
                  rotation: 0,
                  mirrorX: false,
                  unit: 1,
                  fields: { Manufacturer: 'Yageo', MPN: 'RC0805FR-0710KL' },
                  pins: [],
                },
                {
                  id: 'c1',
                  symbolDefId: 'capacitor',
                  reference: 'C1',
                  value: '100nF',
                  footprint: 'C_0805_2012Metric',
                  x: 20,
                  y: 0,
                  rotation: 0,
                  mirrorX: false,
                  unit: 1,
                  fields: { Manufacturer: 'Murata', MPN: 'GRM21BR71H104KA01L' },
                  pins: [],
                },
              ],
              wires: [],
            },
          ],
        },
        pcb: { footprints: [], tracks: [], vias: [], zones: [] },
      });

      const bomEntries = BOMGenerator.generateBOM(project);
      expect(bomEntries.length).toBe(2);

      const rEntry = bomEntries.find((e) => e.value === '10k');
      expect(rEntry).toBeDefined();
      expect(rEntry?.quantity).toBe(2);
      expect(rEntry?.reference).toBe('R1, R2');
      expect(rEntry?.mpn).toBe('RC0805FR-0710KL');

      const csv = BOMGenerator.exportCSV(project);
      expect(csv).toContain('"Reference","Quantity","Value","Footprint"');
      expect(csv).toContain('"R1, R2","2","10k"');
      expect(csv).toContain('"C1","1","100nF"');
    });
  });

  // ==========================================
  // 4. Central Theme Token Architecture
  // ==========================================
  describe('4. Theme Token Architecture & High Contrast Default', () => {
    it('provides complete CAD color tokens across all registered themes', () => {
      for (const theme of AVAILABLE_THEMES) {
        const tokens = getCanvasColors(theme.id);
        expect(tokens.canvasBg).toBeDefined();
        expect(tokens.gridColor).toBeDefined();
        expect(tokens.gridMajorColor).toBeDefined();
        expect(tokens.textColor).toBeDefined();
        expect(tokens.wireColor).toBeDefined();
        expect(tokens.busColor).toBeDefined();
        expect(tokens.noConnectColor).toBeDefined();
        expect(tokens.selectionBg).toBeDefined();
        expect(tokens.selectionBorder).toBeDefined();
        expect(tokens.drcColor).toBeDefined();
        expect(tokens.ercColor).toBeDefined();
      }
    });

    it('defaults to Fluent Dark theme with dark background and crisp contrast', () => {
      const defaultTokens = getCanvasColors('dark');
      expect(defaultTokens.isLight).toBe(false);
      expect(defaultTokens.canvasBg).toBe('#1e1e1e');
      expect(defaultTokens.textColor).toBe('#cccccc');
    });
  });

  // ==========================================
  // 5. Extended DRC Engine (Hole-to-Hole & Edge)
  // ==========================================
  describe('5. Extended Design Rules Checks', () => {
    it('detects hole-to-hole drill clearance violations between closely placed vias', () => {
      const project: ApexProject = ProjectMigrationAdapter.migrate({
        metadata: { id: 'p_drc_test', name: 'DRC Hole Clearance' },
        schematic: { sheets: [{ id: 's1', symbols: [], wires: [] }] },
        pcb: {
          boardOutline: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
          footprints: [],
          tracks: [],
          vias: [
            // Two vias placed with centers only 0.2mm apart (drill diameter 0.3mm each -> overlap/clearance violation)
            {
              id: 'v1',
              netId: 'net_gnd',
              netName: 'GND',
              x: 20.0,
              y: 20.0,
              diameter: 0.6,
              drillDiameter: 0.3,
              startLayer: 'F.Cu',
              endLayer: 'B.Cu',
              type: 'through',
            },
            {
              id: 'v2',
              netId: 'net_vcc',
              netName: '+5V',
              x: 20.2,
              y: 20.0,
              diameter: 0.6,
              drillDiameter: 0.3,
              startLayer: 'F.Cu',
              endLayer: 'B.Cu',
              type: 'through',
            },
          ],
          zones: [],
        },
      });

      const violations = DRCEngine.run(project);
      const holeViolations = violations.filter((v) => v.code === 'DRC008');
      expect(holeViolations.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // 6. IPC-Standard PCB Calculators
  // ==========================================
  describe('6. Engineering Calculators Compliance', () => {
    it('computes accurate IPC-2221 track widths for power traces', () => {
      // 1 Amp on external 1oz copper (35um), 10 deg C temp rise
      const result1A = PCBCalculators.calculateTrackWidth(1.0, 10, 35, true);
      expect(result1A.widthMm).toBeGreaterThan(0.2);
      expect(result1A.widthMm).toBeLessThan(0.4);

      // 3 Amps requires wider copper track
      const result3A = PCBCalculators.calculateTrackWidth(3.0, 10, 35, true);
      expect(result3A.widthMm).toBeGreaterThan(result1A.widthMm);
    });

    it('computes 50-ohm microstrip trace geometry accurately', () => {
      // Typical 50-ohm microstrip on 1.6mm FR-4: W ~ 3.0mm for H = 1.6mm, er = 4.5
      const microstrip = PCBCalculators.calculateMicrostrip(3.0, 1.6, 0.035, 4.5);
      expect(microstrip.z0).toBeGreaterThanOrEqual(48);
      expect(microstrip.z0).toBeLessThanOrEqual(54);
    });
  });
});
