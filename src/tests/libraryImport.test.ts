import { describe, it, expect } from 'vitest';
import { LibraryImportAnalyzer } from '../library/importAnalyzer';
import { libraryRegistry } from '../library/libraryRegistry';
import { KiCadFootprintParser } from '../library/kicadParser';

describe('Library Import Analyzer & Registry Tests', () => {
  it('should classify multi-file uploads into symbols, footprints, and unsupported items', async () => {
    const symContent = `(kicad_symbol_lib (version 20211014)
      (symbol "Transistor:2N3904"
        (property "Reference" "Q")
        (property "Value" "2N3904")
        (pin input line (at -2.54 0 0) (name "B") (number "1"))
        (pin output line (at 2.54 2.54 180) (name "C") (number "2"))
        (pin passive line (at 2.54 -2.54 180) (name "E") (number "3"))
      ))`;

    const fpContent = `(footprint "Package_TO_SOT:TO-92" (layer "F.Cu")
      (pad "1" thru_hole circle (at -1.27 0) (size 1.5 1.5) (drill 0.8) (layers "F.Cu"))
      (pad "2" thru_hole circle (at 0 0) (size 1.5 1.5) (drill 0.8) (layers "F.Cu"))
      (pad "3" thru_hole circle (at 1.27 0) (size 1.5 1.5) (drill 0.8) (layers "F.Cu"))
    )`;

    const file1 = new File([symContent], 'Transistor.kicad_sym', { type: 'text/plain' });
    const file2 = new File([fpContent], 'TO-92.kicad_mod', { type: 'text/plain' });
    const file3 = new File(['random text'], 'notes.txt', { type: 'text/plain' });

    const summary = await LibraryImportAnalyzer.analyzeFiles([file1, file2, file3]);

    expect(summary.totalCount).toBe(3);
    expect(summary.symbolCount).toBe(1);
    expect(summary.footprintCount).toBe(1);
    expect(summary.unsupportedCount).toBe(1);

    const symItem = summary.items.find((i) => i.type === 'symbol');
    expect(symItem?.name).toBe('2N3904');
    expect(symItem?.status).toBe('valid');
    expect(symItem?.parsedSymbol?.pins.length).toBe(3);

    const fpItem = summary.items.find((i) => i.type === 'footprint');
    expect(fpItem?.name).toBe('TO-92');
    expect(fpItem?.status).toBe('valid');
    expect(fpItem?.parsedFootprint?.pads.length).toBe(3);

    const unsuppItem = summary.items.find((i) => i.type === 'unsupported');
    expect(unsuppItem?.status).toBe('error');
    expect(unsuppItem?.message).toContain('Unsupported');
  });

  it('should detect duplicate components and manage library registry packages', () => {
    const initialSyms = libraryRegistry.getAllSymbols();
    expect(initialSyms.length).toBeGreaterThan(0);

    // Register a new imported library package
    const customLib = {
      id: 'imported_rf_modules',
      name: 'RF_Modules',
      category: 'Imported' as const,
      description: 'Imported Transceiver Modules',
      importDate: new Date().toISOString(),
      symbols: [
        {
          id: 'sym_nrf24l01',
          name: 'nRF24L01+',
          library: 'RF_Modules',
          description: '2.4GHz RF Transceiver',
          keywords: ['rf', 'nordic', 'wireless'],
          category: 'RF_Modules',
          defaultPrefix: 'U',
          defaultFootprint: 'RF_Module:nRF24L01_SMD',
          isPower: false,
          pins: [
            { id: 'p1', number: '1', name: 'GND', electricalType: 'power_in' as const, x: 0, y: 0, length: 3.81, orientation: 0 as any, visible: true },
            { id: 'p2', number: '2', name: 'VCC', electricalType: 'power_in' as const, x: 0, y: 5, length: 3.81, orientation: 0 as any, visible: true },
          ],
          shapes: [],
        },
      ],
      footprints: [],
    };

    libraryRegistry.addLibrary(customLib);
    const updatedSyms = libraryRegistry.getAllSymbols();
    const found = updatedSyms.find((s) => s.name === 'nRF24L01+');
    expect(found).toBeDefined();

    // Verify search works across imported symbols
    const rfSym = libraryRegistry.getSymbolById('sym_nrf24l01');
    expect(rfSym?.name).toBe('nRF24L01+');

    // Clean up
    libraryRegistry.removeLibrary('imported_rf_modules');
    const cleanedSyms = libraryRegistry.getAllSymbols();
    expect(cleanedSyms.find((s) => s.name === 'nRF24L01+')).toBeUndefined();
  });

  it('should parse advanced KiCad footprint geometry with arcs, polygons, texts, and pads', () => {
    const rawFp = `(footprint "BatteryHolder_Keystone_1058_1x2032"
      (version 20240108)
      (generator "pcbnew")
      (layer "F.Cu")
      (descr "Keystone 1058 CR2032 battery retainer")
      (tags "battery holder cr2032")
      (fp_line (start -10.5 5.5) (end 10.5 5.5) (stroke (width 0.15)) (layer "F.SilkS"))
      (fp_rect (start -8 -4) (end 8 4) (stroke (width 0.15)) (layer "F.Fab"))
      (fp_circle (center 0 0) (end 10 0) (stroke (width 0.15)) (layer "F.SilkS"))
      (fp_arc (start 0 10) (mid 10 0) (end 0 -10) (stroke (width 0.15)) (layer "F.SilkS"))
      (fp_poly (pts (xy -2 -2) (xy 2 -2) (xy 0 2)) (stroke (width 0.15)) (layer "F.SilkS"))
      (fp_text user "CR2032" (at 0 0 0) (layer "F.SilkS"))
      (pad "1" smd rect (at -11 0) (size 2.5 3.0) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "2" smd rect (at 11 0) (size 2.5 3.0) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "3" thru_hole circle (at 0 -8) (size 2.0 2.0) (drill 1.0) (layers "F.Cu" "B.Cu"))
    )`;

    const res = KiCadFootprintParser.parse(rawFp, 'Battery');
    expect(res.errors.length).toBe(0);
    expect(res.footprints.length).toBe(1);

    const fp = res.footprints[0];
    expect(fp.name).toBe('BatteryHolder_Keystone_1058_1x2032');
    expect(fp.pads.length).toBe(3);
    expect(fp.pads[0].type).toBe('smd');
    expect(fp.pads[2].type).toBe('through_hole');
    expect(fp.pads[2].drillDiameter).toBe(1.0);

    expect(fp.shapes.some((s: any) => s.type === 'line')).toBe(true);
    expect(fp.shapes.some((s: any) => s.type === 'rect')).toBe(true);
    expect(fp.shapes.some((s: any) => s.type === 'circle')).toBe(true);
    expect(fp.shapes.some((s: any) => s.type === 'arc')).toBe(true);
    expect(fp.shapes.some((s: any) => s.type === 'polygon')).toBe(true);
    expect(fp.shapes.some((s: any) => s.type === 'text')).toBe(true);
  });
});
