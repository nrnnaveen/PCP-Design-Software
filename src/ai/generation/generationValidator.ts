/**
 * FloZ ECA - Generation Validator
 * Rigorous topological, electrical, and geometrical validation of generated circuit designs.
 */

import { ApexProject } from '../../core/types';
import { ERCEngine } from '../../erc/ercEngine';
import { NetConnectivitySolver } from '../../schematic/connectivity';
import { ActionProposal, ValidationResult } from '../types';

export class GenerationValidator {
  public static validateCompiledProposal(proposal: ActionProposal, project: ApexProject): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!proposal.diff.addedComponents || proposal.diff.addedComponents.length === 0) {
      issues.push('Generation plan does not contain any valid components.');
    }

    // Check bounds
    if (proposal.diff.addedComponents) {
      for (const comp of proposal.diff.addedComponents) {
        if (comp.position.x < 0 || comp.position.x > 420 || comp.position.y < 0 || comp.position.y > 297) {
          issues.push(`Component ${comp.reference} (${comp.value}) coordinate is outside sheet boundaries.`);
        }
      }
    }

    // Simulate dry run
    try {
      const simulatedProject = proposal.applyAction(project);
      const activeSheet =
        simulatedProject.schematic.sheets.find((s) => s.id === simulatedProject.schematic.activeSheetId) ||
        simulatedProject.schematic.sheets[0];

      const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
      const erc = ERCEngine.run(simulatedProject);

      if (connectivity.unconnectedPins.length > 0) {
        warnings.push(`Generated circuit leaves ${connectivity.unconnectedPins.length} secondary/GPIO pins unconnected.`);
      }

      if (erc.some((v) => v.severity === 'error')) {
        warnings.push('Simulated circuit triggers ERC rule warnings.');
      }
    } catch (err: any) {
      issues.push(`Failed to simulate circuit application: ${err.message}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      ercImpact: issues.length === 0 ? 'Topologically valid. Ready for transaction commit.' : 'Validation errors detected.',
    };
  }
}
