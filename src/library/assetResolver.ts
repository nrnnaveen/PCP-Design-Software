/**
 * FloZ EDA - Asset Resolver & Missing Asset Management Engine
 * Resolves symbols, footprints, and 3D models across the project, detecting missing assets
 * and safely synthesizing/importing compatible geometry.
 */

import {
  ApexProject,
  SymbolDefinition,
  FootprintDefinition,
  Model3DReference,
  SchematicSymbolInstance,
  PCBFootprintInstance,
} from '../core/types';
import { libraryRegistry } from './libraryRegistry';
import { footprintLibrary, BUILTIN_FOOTPRINTS } from './footprintLibrary';
import { ComponentRegistry } from './componentRegistry';

export type AssetType = 'symbol' | 'footprint' | 'model3d';

export interface MissingAsset {
  id: string;
  type: AssetType;
  reference: string;
  name: string;
  requiredPackage?: string;
  status: 'missing' | 'resolving' | 'resolved' | 'failed';
  errorDetails?: string;
  resolvedAssetId?: string;
}

export interface AssetResolutionReport {
  totalChecked: number;
  missingCount: number;
  missingAssets: MissingAsset[];
  allResolved: boolean;
}

export class AssetResolver {
  /**
   * Scans an entire project and produces a missing asset diagnostic report
   */
  public static scanProject(project: ApexProject): AssetResolutionReport {
    const missing: MissingAsset[] = [];
    let totalChecked = 0;

    // 1. Scan Schematic Symbols
    project.schematic.sheets.forEach((sheet) => {
      sheet.symbols.forEach((sym) => {
        if (sym.reference.startsWith('#')) return; // Power symbols
        totalChecked++;

        const symDef = libraryRegistry.getSymbolById(sym.symbolDefId);
        if (!symDef) {
          missing.push({
            id: `miss_sym_${sym.id}`,
            type: 'symbol',
            reference: sym.reference,
            name: sym.symbolDefId || sym.value,
            status: 'missing',
            errorDetails: `Symbol definition '${sym.symbolDefId}' not found in registry.`,
          });
        }

        // Check assigned footprint
        if (!sym.footprint) {
          missing.push({
            id: `miss_fp_${sym.id}`,
            type: 'footprint',
            reference: sym.reference,
            name: sym.value,
            status: 'missing',
            errorDetails: `No footprint assigned to symbol ${sym.reference} (${sym.value}).`,
          });
        } else {
          const fpDef = footprintLibrary.getFootprint(sym.footprint);
          if (!fpDef) {
            missing.push({
              id: `miss_fp_def_${sym.id}`,
              type: 'footprint',
              reference: sym.reference,
              name: sym.footprint,
              requiredPackage: sym.footprint,
              status: 'missing',
              errorDetails: `Footprint definition '${sym.footprint}' not found in library.`,
            });
          }
        }
      });
    });

    // 2. Scan PCB Footprints for 3D Models
    project.pcb.footprints.forEach((fp) => {
      totalChecked++;
      if (!fp.model3D && !fp.footprintDefId.includes('TestPoint')) {
        const fpDef = footprintLibrary.getFootprint(fp.footprintDefId);
        if (!fpDef?.model3D) {
          missing.push({
            id: `miss_3d_${fp.id}`,
            type: 'model3d',
            reference: fp.reference,
            name: fp.value || fp.footprintDefId,
            requiredPackage: fp.footprintDefId,
            status: 'missing',
            errorDetails: `3D CAD model missing for footprint '${fp.footprintDefId}'.`,
          });
        }
      }
    });

    return {
      totalChecked,
      missingCount: missing.length,
      missingAssets: missing,
      allResolved: missing.length === 0,
    };
  }

  /**
   * Automatically resolves missing assets using database candidates, component definitions, or synthetic generation
   */
  public static resolveAssetAutomatically(
    missing: MissingAsset,
    project: ApexProject
  ): { resolved: boolean; assetId?: string; error?: string } {
    // 1. Resolve Missing Symbol
    if (missing.type === 'symbol') {
      // Look up in ComponentRegistry
      const comps = ComponentRegistry.search(missing.name);
      if (comps.length > 0) {
        const match = comps[0];
        const symDef = libraryRegistry.getSymbolById(match.symbolDefId);
        if (symDef) {
          return { resolved: true, assetId: symDef.id };
        }
      }

      // Check default fallback by prefix
      const prefix = missing.reference.replace(/[0-9]/g, '') || 'U';
      const fallbackSym = libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === prefix);
      if (fallbackSym) {
        return { resolved: true, assetId: fallbackSym.id };
      }
    }

    // 2. Resolve Missing Footprint
    if (missing.type === 'footprint') {
      const pkg = (missing.requiredPackage || missing.name).toLowerCase();
      const allFps = footprintLibrary.getAllFootprints();

      // Find direct or close match
      const matchedFp = allFps.find((f) => {
        const fId = f.id.toLowerCase();
        const fName = f.name.toLowerCase();
        if (pkg.includes('0805') && (fId.includes('0805') || fName.includes('0805'))) return true;
        if (pkg.includes('1206') && (fId.includes('1206') || fName.includes('1206'))) return true;
        if ((pkg.includes('soic') || pkg.includes('so-8')) && (fId.includes('soic-8') || fName.includes('soic-8'))) return true;
        if (pkg.includes('dip') && (fId.includes('dip') || fName.includes('dip'))) return true;
        if (pkg.includes('sot-23') && (fId.includes('sot-23') || fName.includes('sot-23'))) return true;
        if (pkg.includes('usb') && (fId.includes('usb') || fName.includes('usb'))) return true;
        if (pkg.includes('led') && (fId.includes('led') || fName.includes('led'))) return true;
        if (pkg.includes('radial') && (fId.includes('radial') || fName.includes('radial'))) return true;
        return false;
      });

      if (matchedFp) {
        return { resolved: true, assetId: matchedFp.id };
      }

      // Fallback default footprint by reference prefix
      const prefix = missing.reference.replace(/[0-9]/g, '');
      if (prefix === 'R') return { resolved: true, assetId: 'Resistor_SMD:R_0805_2012Metric' };
      if (prefix === 'C') return { resolved: true, assetId: 'Capacitor_SMD:C_0805_2012Metric' };
      if (prefix === 'D') return { resolved: true, assetId: 'LED_SMD:LED_0805_2012Metric' };
      if (prefix === 'U') return { resolved: true, assetId: 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm' };
      if (prefix === 'J') return { resolved: true, assetId: 'Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12' };
    }

    // 3. Resolve Missing 3D Model
    if (missing.type === 'model3d') {
      const pkg = (missing.requiredPackage || missing.name).toLowerCase();
      let packageType = '0805';

      if (pkg.includes('soic') || pkg.includes('so-8')) packageType = 'SOIC-8';
      else if (pkg.includes('dip')) packageType = 'DIP-8';
      else if (pkg.includes('lqfp')) packageType = 'LQFP-48';
      else if (pkg.includes('sot-23')) packageType = 'SOT-23';
      else if (pkg.includes('usb')) packageType = 'USB-C';
      else if (pkg.includes('led')) packageType = 'LED_5mm';
      else if (pkg.includes('radial') || pkg.includes('cp_')) packageType = 'Radial_Capacitor';
      else if (pkg.includes('1206')) packageType = '1206';
      else if (pkg.includes('0805')) packageType = '0805';

      return {
        resolved: true,
        assetId: packageType,
      };
    }

    return { resolved: false, error: `Unable to automatically resolve ${missing.type} '${missing.name}'.` };
  }
}

export class PinMappingValidator {
  public static validate(
    symbol: SymbolDefinition,
    footprint: FootprintDefinition
  ): { compatible: boolean; missingPads: string[]; unmappedPins: string[] } {
    const padNumbers = new Set(footprint.pads.map((p) => p.number));
    const missingPads: string[] = [];
    const unmappedPins: string[] = [];

    symbol.pins.forEach((pin) => {
      if (!padNumbers.has(pin.number)) {
        missingPads.push(pin.number);
      }
    });

    const symbolPinNumbers = new Set(symbol.pins.map((p) => p.number));
    footprint.pads.forEach((pad) => {
      if (!symbolPinNumbers.has(pad.number)) {
        unmappedPins.push(pad.number);
      }
    });

    const compatible = missingPads.length === 0;

    return {
      compatible,
      missingPads,
      unmappedPins,
    };
  }
}
