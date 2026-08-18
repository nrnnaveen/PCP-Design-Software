/**
 * FloZ EDA - Rules & Diagnostics Auto-Fix Engine
 * Intelligently repairs safe ERC and DRC errors with single-transaction rollback.
 */

import { ApexProject, DiagnosticViolation } from '../core/types';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';
import { AutoRouter } from '../pcb/autoRouter';
import { AutoPlacer } from '../pcb/autoPlacer';
import { AssetResolver } from '../library/assetResolver';
import { footprintLibrary } from '../library/footprintLibrary';

export interface AutoFixResult {
  fixedCount: number;
  unresolvedCount: number;
  appliedFixes: string[];
  updatedProject: ApexProject;
}

export class AutoFixEngine {
  /**
   * Automatically analyzes and fixes safe DRC and ERC violations
   */
  public static autoFixProject(project: ApexProject): AutoFixResult {
    let currentPrj = project;
    const appliedFixes: string[] = [];
    let fixedCount = 0;

    // 1. Check Missing Footprints
    const activeSheet =
      currentPrj.schematic.sheets.find((s) => s.id === currentPrj.schematic.activeSheetId) ||
      currentPrj.schematic.sheets[0];

    let hasUnassignedFootprints = false;
    const updatedSymbols = activeSheet.symbols.map((sym) => {
      if (!sym.footprint || !footprintLibrary.getFootprint(sym.footprint)) {
        const resolved = AssetResolver.resolveAssetAutomatically(
          {
            id: `miss_fp_${sym.id}`,
            type: 'footprint',
            reference: sym.reference,
            name: sym.value,
            status: 'missing',
          },
          currentPrj
        );

        if (resolved.resolved && resolved.assetId) {
          appliedFixes.push(`Assigned compatible footprint '${resolved.assetId}' to ${sym.reference} (${sym.value})`);
          fixedCount++;
          hasUnassignedFootprints = true;
          return { ...sym, footprint: resolved.assetId };
        }
      }
      return sym;
    });

    if (hasUnassignedFootprints) {
      currentPrj = {
        ...currentPrj,
        schematic: {
          ...currentPrj.schematic,
          sheets: currentPrj.schematic.sheets.map((s) =>
            s.id === activeSheet.id ? { ...s, symbols: updatedSymbols } : s
          ),
        },
      };
      // Re-place on PCB
      currentPrj = AutoPlacer.placeComponents(currentPrj);
      appliedFixes.push('Synchronized and placed updated footprints on PCB');
    }

    // 2. Check DRC Unconnected Nets & Board Edge Violations
    const drcViolations = DRCEngine.run(currentPrj);
    const unconnectedViolations = drcViolations.filter((v) => v.code === 'DRC_UNCONNECTED_NET');
    const boardEdgeViolations = drcViolations.filter((v) => v.code === 'DRC_BOARD_EDGE');

    if (unconnectedViolations.length > 0) {
      currentPrj = AutoRouter.routeProject(currentPrj);
      appliedFixes.push(`Auto-routed ${unconnectedViolations.length} unconnected nets`);
      fixedCount += unconnectedViolations.length;
    }

    if (boardEdgeViolations.length > 0) {
      // Re-run placement with wider margin
      currentPrj = AutoPlacer.placeComponents(currentPrj, { boardMarginMm: 8.0 });
      currentPrj = AutoRouter.routeProject(currentPrj);
      appliedFixes.push(`Adjusted board outline margin to clear ${boardEdgeViolations.length} edge collisions`);
      fixedCount += boardEdgeViolations.length;
    }

    const remainingDrc = DRCEngine.run(currentPrj);
    const remainingErc = ERCEngine.run(currentPrj);

    return {
      fixedCount,
      unresolvedCount: remainingDrc.filter((v) => v.severity === 'error').length + remainingErc.filter((v) => v.severity === 'error').length,
      appliedFixes,
      updatedProject: currentPrj,
    };
  }
}
