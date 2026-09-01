/**
 * FloZ ECA - Unified Component Library Registry
 * Manages system, project-specific, imported, and custom component libraries with persistent storage.
 */

import { SymbolDefinition, FootprintDefinition } from '../core/types';
import { BUILTIN_SYMBOLS } from './database';
import { BUILTIN_FOOTPRINTS } from './footprintLibrary';

export type LibraryCategory = 'System' | 'Project' | 'Imported' | 'Custom';

export interface LibraryPackage {
  id: string;
  name: string;
  category: LibraryCategory;
  description: string;
  sourceFilename?: string;
  importDate: string;
  symbols: SymbolDefinition[];
  footprints: FootprintDefinition[];
  version?: string;
}

const STORAGE_KEY = 'floz_eca_imported_libraries_v1';

class ComponentLibraryRegistry {
  private libraries: Map<string, LibraryPackage> = new Map();
  private listeners: Set<() => void> = new Set();
  private notifyTimeout: any = null;

  // Memoized cache for lightning-fast queries
  private _cachedSymbols: SymbolDefinition[] | null = null;
  private _cachedFootprints: FootprintDefinition[] | null = null;

  constructor() {
    this.initSystemLibraries();
    this.loadFromStorage();
  }

  private invalidateCache(): void {
    this._cachedSymbols = null;
    this._cachedFootprints = null;
  }

  private initSystemLibraries(): void {
    // 1. Group built-in authoritative symbols by library name
    const symsByLib: Map<string, SymbolDefinition[]> = new Map();
    BUILTIN_SYMBOLS.forEach((sym) => {
      const lib = sym.library || 'Device';
      if (!symsByLib.has(lib)) symsByLib.set(lib, []);
      symsByLib.get(lib)!.push(sym);
    });

    symsByLib.forEach((syms, libName) => {
      const libId = `system_sym_${libName.toLowerCase()}`;
      this.libraries.set(libId, {
        id: libId,
        name: libName,
        category: 'System',
        description: `FloZ ECA Standard System Symbol Library (${libName})`,
        importDate: 'System Built-in',
        symbols: syms,
        footprints: [],
      });
    });

    // 2. Group built-in authoritative footprints by library name
    const fpsByLib: Map<string, FootprintDefinition[]> = new Map();
    BUILTIN_FOOTPRINTS.forEach((fp) => {
      const lib = fp.library || 'General';
      if (!fpsByLib.has(lib)) fpsByLib.set(lib, []);
      fpsByLib.get(lib)!.push(fp);
    });

    fpsByLib.forEach((fps, libName) => {
      const libId = `system_fp_${libName.toLowerCase()}`;
      if (this.libraries.has(libId)) {
        this.libraries.get(libId)!.footprints.push(...fps);
      } else {
        this.libraries.set(libId, {
          id: libId,
          name: libName,
          category: 'System',
          description: `FloZ ECA Standard System Footprint Library (${libName})`,
          importDate: 'System Built-in',
          symbols: [],
          footprints: fps,
        });
      }
    });
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed: LibraryPackage[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((lib) => {
            if (lib && lib.id && (lib.category === 'Custom' || lib.category === 'Imported')) {
              this.libraries.set(lib.id, lib);
            }
          });
        }
      }
    } catch (err) {
      // Ignored in headless environments
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const customOrImported = Array.from(this.libraries.values()).filter(
          (l) => l.category === 'Custom' || l.category === 'Imported'
        );
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customOrImported));
      }
      this.invalidateCache();
      this.notifyListeners();
    } catch (err) {
      // Ignored in headless environments
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    if (this.notifyTimeout) clearTimeout(this.notifyTimeout);
    this.notifyTimeout = setTimeout(() => {
      this.listeners.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('Error in library registry listener:', err);
        }
      });
    }, 16);
  }

  // Queries
  public getLibraries(): LibraryPackage[] {
    return Array.from(this.libraries.values());
  }

  public getLibrary(id: string): LibraryPackage | undefined {
    return this.libraries.get(id);
  }

  public getAllSymbols(): SymbolDefinition[] {
    if (this._cachedSymbols) return this._cachedSymbols;
    const all: SymbolDefinition[] = [];
    this.libraries.forEach((lib) => {
      all.push(...lib.symbols);
    });
    this._cachedSymbols = all;
    return all;
  }

  public getAllFootprints(): FootprintDefinition[] {
    if (this._cachedFootprints) return this._cachedFootprints;
    const all: FootprintDefinition[] = [];
    this.libraries.forEach((lib) => {
      all.push(...lib.footprints);
    });
    this._cachedFootprints = all;
    return all;
  }

  public getSymbolById(id: string): SymbolDefinition | undefined {
    return this.getAllSymbols().find((s) => s.id === id || s.name === id);
  }

  public getFootprintById(id: string): FootprintDefinition | undefined {
    return this.getAllFootprints().find((f) => f.id === id || f.name === id);
  }

  public getAllLibraries(): LibraryPackage[] {
    return this.getLibraries();
  }

  public unregisterLibrary(id: string): boolean {
    return this.removeLibrary(id);
  }

  public searchSymbols(query: string = '', category: string = 'All'): SymbolDefinition[] {
    const q = query.toLowerCase().trim();
    return this.getAllSymbols().filter((sym) => {
      const matchCat = category === 'All' || sym.category === category || sym.library === category;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        sym.name.toLowerCase().includes(q) ||
        sym.description.toLowerCase().includes(q) ||
        sym.defaultPrefix.toLowerCase().includes(q) ||
        sym.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }

  public searchFootprints(query: string = '', category: string = 'All'): FootprintDefinition[] {
    const q = query.toLowerCase().trim();
    return this.getAllFootprints().filter((fp) => {
      const matchCat = category === 'All' || fp.category === category || fp.library === category;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        fp.name.toLowerCase().includes(q) ||
        fp.description.toLowerCase().includes(q) ||
        fp.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }

  // Modifications
  public addLibrary(lib: LibraryPackage): void {
    this.libraries.set(lib.id, lib);
    this.invalidateCache();
    this.saveToStorage();
  }

  public removeLibrary(id: string): boolean {
    const lib = this.libraries.get(id);
    if (!lib || lib.category === 'System') return false; // Protect system libraries
    this.libraries.delete(id);
    this.invalidateCache();
    this.saveToStorage();
    return true;
  }

  public renameLibrary(id: string, newName: string): boolean {
    const lib = this.libraries.get(id);
    if (!lib || lib.category === 'System') return false;
    lib.name = newName;
    this.invalidateCache();
    this.saveToStorage();
    return true;
  }

  public addSymbolsToLibrary(libraryId: string, newSymbols: SymbolDefinition[]): void {
    const lib = this.libraries.get(libraryId);
    if (!lib) return;
    lib.symbols.push(...newSymbols);
    this.invalidateCache();
    this.saveToStorage();
  }

  public addFootprintsToLibrary(libraryId: string, newFootprints: FootprintDefinition[]): void {
    const lib = this.libraries.get(libraryId);
    if (!lib) return;
    lib.footprints.push(...newFootprints);
    this.invalidateCache();
    this.saveToStorage();
  }
}

export type ApexLibrary = LibraryPackage;
export type ApexSymbolDef = SymbolDefinition;
export type ApexFootprintDef = FootprintDefinition;

export const libraryRegistry = new ComponentLibraryRegistry();
