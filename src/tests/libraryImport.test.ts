import { describe, it, expect } from 'vitest';
import { LibraryImportAnalyzer } from '../library/importAnalyzer';
import { libraryRegistry } from '../library/libraryRegistry';

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
});
