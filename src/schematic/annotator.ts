/**
 * Apex EDA - Schematic Auto-Annotator Engine
 * Generates and resets reference designators (R1, R2, C1, U1, etc.) deterministically.
 */

import { SchematicSheet } from '../core/types';

export interface AnnotationOptions {
  resetExisting: boolean; // if true, clears existing R1 -> R? and renumbers all
  sortOrder: 'left_to_right' | 'top_to_bottom';
}

export class SchematicAnnotator {
  public static annotate(sheet: SchematicSheet, options: AnnotationOptions = { resetExisting: false, sortOrder: 'left_to_right' }): SchematicSheet {
    const symbols = [...sheet.symbols];

    // Sort symbols by position
    symbols.sort((a, b) => {
      if (options.sortOrder === 'left_to_right') {
        return a.x === b.x ? a.y - b.y : a.x - b.x;
      } else {
        return a.y === b.y ? a.x - b.x : a.y - b.y;
      }
    });

    const prefixCounters: Map<string, number> = new Map();
    const usedReferences = new Set<string>();

    // 1. If not resetting, collect existing numeric references
    if (!options.resetExisting) {
      symbols.forEach((sym) => {
        const match = sym.reference.match(/^([A-Za-z#]+)(\d+)$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2], 10);
          usedReferences.add(sym.reference);
          const currentMax = prefixCounters.get(prefix) || 0;
          if (num > currentMax) {
            prefixCounters.set(prefix, num);
          }
        }
      });
    }

    // 2. Assign numbers to unannotated symbols (e.g. 'R?', 'C?', 'U?', or when resetExisting is true)
    const updatedSymbols = symbols.map((sym) => {
      const match = sym.reference.match(/^([A-Za-z#]+)(\?|\d+)?$/);
      let prefix = match ? match[1] : 'U';
      if (prefix.endsWith('?')) prefix = prefix.slice(0, -1);

      // Skip power flags or power symbols starting with '#'
      if (prefix.startsWith('#')) return sym;

      const isAlreadyAnnotated = !options.resetExisting && sym.reference.match(/^([A-Za-z]+)(\d+)$/);

      if (isAlreadyAnnotated) {
        return sym;
      }

      let nextNum = (prefixCounters.get(prefix) || 0) + 1;
      let candidateRef = `${prefix}${nextNum}`;
      while (usedReferences.has(candidateRef)) {
        nextNum++;
        candidateRef = `${prefix}${nextNum}`;
      }

      prefixCounters.set(prefix, nextNum);
      usedReferences.add(candidateRef);

      return {
        ...sym,
        reference: candidateRef,
      };
    });

    return {
      ...sheet,
      symbols: updatedSymbols,
    };
  }

  public static resetAnnotation(sheet: SchematicSheet): SchematicSheet {
    const updatedSymbols = sheet.symbols.map((sym) => {
      const match = sym.reference.match(/^([A-Za-z]+)(\d+)$/);
      if (match && !sym.reference.startsWith('#')) {
        return {
          ...sym,
          reference: `${match[1]}?`,
        };
      }
      return sym;
    });

    return {
      ...sheet,
      symbols: updatedSymbols,
    };
  }
}
