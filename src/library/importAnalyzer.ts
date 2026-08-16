/**
 * FloZ ECA - Multi-File & Folder Import Analyzer
 * Inspects, classifies, parses, and validates KiCad libraries with duplicate detection.
 */

import { SymbolDefinition, FootprintDefinition } from '../core/types';
import { KiCadSymbolParser, KiCadFootprintParser } from './kicadParser';
import { libraryRegistry } from './libraryRegistry';

export type ImportItemType = 'symbol' | 'footprint' | 'model3d' | 'unsupported';
export type ImportItemStatus = 'valid' | 'warning' | 'error';
export type ConflictResolutionAction = 'skip' | 'replace' | 'keep_both' | 'rename';

export interface ImportItem {
  id: string;
  name: string;
  type: ImportItemType;
  sourceFilename: string;
  sourceLibraryName: string;
  status: ImportItemStatus;
  isDuplicate: boolean;
  duplicateLocation?: string;
  conflictAction?: ConflictResolutionAction;
  message?: string;
  parsedSymbol?: SymbolDefinition;
  parsedFootprint?: FootprintDefinition;
  selected: boolean;
}

export interface ImportAnalysisSummary {
  items: ImportItem[];
  symbolCount: number;
  footprintCount: number;
  modelCount: number;
  unsupportedCount: number;
  duplicateCount: number;
  errorCount: number;
  warningCount: number;
  totalCount: number;
}

export class LibraryImportAnalyzer {
  /**
   * Analyzes an array of uploaded File objects
   */
  public static async analyzeFiles(files: File[]): Promise<ImportAnalysisSummary> {
    const items: ImportItem[] = [];

    const existingSymbols = libraryRegistry.getAllSymbols();
    const existingFootprints = libraryRegistry.getAllFootprints();

    for (const file of files) {
      const filename = file.name;
      const lower = filename.toLowerCase();

      // Derive library name from filename or parent folder
      const libName = filename.replace(/\.(kicad_sym|kicad_mod|pretty)$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');

      // 1. Symbol File (.kicad_sym)
      if (lower.endsWith('.kicad_sym')) {
        try {
          const content = await file.text();
          const parseResult = KiCadSymbolParser.parse(content, libName);

          if (parseResult.errors.length > 0 && parseResult.symbols.length === 0) {
            items.push({
              id: `err_${filename}_${Date.now()}`,
              name: filename,
              type: 'symbol',
              sourceFilename: filename,
              sourceLibraryName: libName,
              status: 'error',
              isDuplicate: false,
              message: parseResult.errors.join('; '),
              selected: false,
            });
          } else {
            for (const sym of parseResult.symbols) {
              const duplicate = existingSymbols.find((s) => s.name === sym.name);
              const isDup = Boolean(duplicate);

              items.push({
                id: `item_sym_${sym.name}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: sym.name,
                type: 'symbol',
                sourceFilename: filename,
                sourceLibraryName: libName,
                status: parseResult.warnings.length > 0 ? 'warning' : 'valid',
                isDuplicate: isDup,
                duplicateLocation: duplicate ? duplicate.library : undefined,
                conflictAction: isDup ? 'keep_both' : undefined,
                message: parseResult.warnings.join('; ') || undefined,
                parsedSymbol: sym,
                selected: true,
              });
            }
          }
        } catch (err: any) {
          items.push({
            id: `err_${filename}`,
            name: filename,
            type: 'symbol',
            sourceFilename: filename,
            sourceLibraryName: libName,
            status: 'error',
            isDuplicate: false,
            message: `Failed to read file: ${err.message}`,
            selected: false,
          });
        }
      }
      // 2. Footprint File (.kicad_mod)
      else if (lower.endsWith('.kicad_mod')) {
        try {
          const content = await file.text();
          const parseResult = KiCadFootprintParser.parse(content, libName);

          if (parseResult.errors.length > 0 && parseResult.footprints.length === 0) {
            items.push({
              id: `err_${filename}_${Date.now()}`,
              name: filename,
              type: 'footprint',
              sourceFilename: filename,
              sourceLibraryName: libName,
              status: 'error',
              isDuplicate: false,
              message: parseResult.errors.join('; '),
              selected: false,
            });
          } else {
            for (const fp of parseResult.footprints) {
              const duplicate = existingFootprints.find((f) => f.name === fp.name);
              const isDup = Boolean(duplicate);

              items.push({
                id: `item_fp_${fp.name}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: fp.name,
                type: 'footprint',
                sourceFilename: filename,
                sourceLibraryName: libName,
                status: parseResult.warnings.length > 0 ? 'warning' : 'valid',
                isDuplicate: isDup,
                duplicateLocation: duplicate ? duplicate.library : undefined,
                conflictAction: isDup ? 'keep_both' : undefined,
                message: parseResult.warnings.join('; ') || undefined,
                parsedFootprint: fp,
                selected: true,
              });
            }
          }
        } catch (err: any) {
          items.push({
            id: `err_${filename}`,
            name: filename,
            type: 'footprint',
            sourceFilename: filename,
            sourceLibraryName: libName,
            status: 'error',
            isDuplicate: false,
            message: `Failed to read file: ${err.message}`,
            selected: false,
          });
        }
      }
      // 3. 3D Model Files (.step, .stp, .glb, .gltf)
      else if (lower.endsWith('.step') || lower.endsWith('.stp') || lower.endsWith('.glb') || lower.endsWith('.gltf')) {
        items.push({
          id: `item_model_${filename}_${Date.now()}`,
          name: filename,
          type: 'model3d',
          sourceFilename: filename,
          sourceLibraryName: libName,
          status: 'valid',
          isDuplicate: false,
          message: '3D Package Model File',
          selected: true,
        });
      }
      // 4. Unsupported Format
      else {
        items.push({
          id: `item_unsupported_${filename}_${Date.now()}`,
          name: filename,
          type: 'unsupported',
          sourceFilename: filename,
          sourceLibraryName: libName,
          status: 'error',
          isDuplicate: false,
          message: `Unsupported file format '${filename.split('.').pop()}'. FloZ ECA supports .kicad_sym, .kicad_mod, and 3D models.`,
          selected: false,
        });
      }
    }

    return {
      items,
      symbolCount: items.filter((i) => i.type === 'symbol').length,
      footprintCount: items.filter((i) => i.type === 'footprint').length,
      modelCount: items.filter((i) => i.type === 'model3d').length,
      unsupportedCount: items.filter((i) => i.type === 'unsupported').length,
      duplicateCount: items.filter((i) => i.isDuplicate).length,
      errorCount: items.filter((i) => i.status === 'error').length,
      warningCount: items.filter((i) => i.status === 'warning').length,
      totalCount: items.length,
    };
  }
}
