/**
 * FloZ ECA - Action Pre-Apply & Post-Apply Validation Engine (Phase 3)
 * Rigorous validation for symbols, pins, wire endpoints, sheet boundaries, and ERC/DRC regressions.
 */

import { ApexProject } from '../core/types';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';
import { ActionProposal, ValidationResult } from './types';

export class ActionValidator {
  /**
   * Pre-apply validation of an ActionProposal before presenting to user or applying
   */
  public static preValidate(proposal: ActionProposal, project: ApexProject): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    // 1. Validate Added Components
    if (proposal.diff.addedComponents) {
      for (const comp of proposal.diff.addedComponents) {
        // Coordinate bounds check (A3 sheet standard: 0-420mm x 0-297mm)
        if (
          !Number.isFinite(comp.position.x) ||
          !Number.isFinite(comp.position.y) ||
          comp.position.x < 0 ||
          comp.position.x > 420 ||
          comp.position.y < 0 ||
          comp.position.y > 297
        ) {
          issues.push(`Component ${comp.reference} placement (${comp.position.x}, ${comp.position.y}) is outside schematic sheet bounds.`);
        }

        // Reference uniqueness check
        const existing = activeSheet.symbols.find(
          (s) => s.reference.toUpperCase() === comp.reference.toUpperCase()
        );
        if (existing) {
          warnings.push(`Reference designator ${comp.reference} already exists in sheet. A new reference will be assigned.`);
        }
      }
    }

    // 2. Validate Added Wires
    if (proposal.diff.addedWires) {
      for (const wire of proposal.diff.addedWires) {
        const [fromRef, fromPin] = wire.from.split(':');
        const [toRef, toPin] = wire.to.split(':');

        const fromSym =
          activeSheet.symbols.find((s) => s.reference.toUpperCase() === fromRef?.toUpperCase()) ||
          proposal.diff.addedComponents?.find((c) => c.reference.toUpperCase() === fromRef?.toUpperCase());

        const toSym =
          activeSheet.symbols.find((s) => s.reference.toUpperCase() === toRef?.toUpperCase()) ||
          proposal.diff.addedComponents?.find((c) => c.reference.toUpperCase() === toRef?.toUpperCase());

        if (!fromSym) {
          issues.push(`Wire start component "${fromRef}" does not exist in schematic or proposal.`);
        } else if (fromPin && (fromSym as any).pins && !(fromSym as any).pins.some((p: any) => p.number === fromPin || p.name.toUpperCase() === fromPin.toUpperCase())) {
          issues.push(`Pin "${fromPin}" not found on component ${fromRef}.`);
        }

        if (!toSym) {
          issues.push(`Wire end component "${toRef}" does not exist in schematic or proposal.`);
        } else if (toPin && (toSym as any).pins && !(toSym as any).pins.some((p: any) => p.number === toPin || p.name.toUpperCase() === toPin.toUpperCase())) {
          issues.push(`Pin "${toPin}" not found on component ${toRef}.`);
        }
      }
    }

    // 3. Validate Modified Components
    if (proposal.diff.modifiedComponents) {
      for (const mod of proposal.diff.modifiedComponents) {
        const target = activeSheet.symbols.find(
          (s) => s.reference.toUpperCase() === mod.reference.toUpperCase()
        );
        if (!target) {
          issues.push(`Target component for modification (${mod.reference}) does not exist in active sheet.`);
        }
      }
    }

    // 4. Validate Removed Components
    if (proposal.diff.removedComponents) {
      for (const ref of proposal.diff.removedComponents) {
        const target = activeSheet.symbols.find(
          (s) => s.reference.toUpperCase() === ref.toUpperCase()
        );
        if (!target) {
          issues.push(`Target component for deletion (${ref}) does not exist in active sheet.`);
        }
      }
    }

    // 5. Validate Connected Nets
    if (proposal.diff.connectedNets) {
      for (const net of proposal.diff.connectedNets) {
        if (!net || net.trim() === '') {
          issues.push('Proposed net connection contains an invalid empty net name.');
        }
      }
    }

    const isValid = issues.length === 0;

    return {
      valid: isValid,
      isValid,
      issues,
      warnings,
      ercImpact: isValid ? '✓ Valid schematic objects (Ready to apply)' : (issues[0] || 'Action contains topological errors'),
    };
  }

  /**
   * Post-apply validation: compares ERC/DRC between pre-apply and post-apply projects
   */
  public static postValidate(
    prevProject: ApexProject,
    updatedProject: ApexProject
  ): { clean: boolean; newErcViolations: any[]; newDrcViolations: any[]; message: string } {
    const prevErc = ERCEngine.run(prevProject);
    const newErc = ERCEngine.run(updatedProject);

    const prevErcCodes = new Set(prevErc.map((e) => `${e.code}_${e.x}_${e.y}`));
    const introducedErc = newErc.filter((e) => !prevErcCodes.has(`${e.code}_${e.x}_${e.y}`));

    const prevDrc = DRCEngine.run(prevProject);
    const newDrc = DRCEngine.run(updatedProject);

    const prevDrcCodes = new Set(prevDrc.map((d) => `${d.code}_${d.x}_${d.y}`));
    const introducedDrc = newDrc.filter((d) => !prevDrcCodes.has(`${d.code}_${d.x}_${d.y}`));

    const isClean = introducedErc.length === 0 && introducedDrc.length === 0;

    let message = 'Action applied successfully.';
    if (!isClean) {
      message = `Applied successfully, but introduces ${introducedErc.length} new ERC and ${introducedDrc.length} new DRC diagnostic warning(s).`;
    }

    return {
      clean: isClean,
      newErcViolations: introducedErc,
      newDrcViolations: introducedDrc,
      message,
    };
  }
}
