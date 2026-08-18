/**
 * FloZ ECA - Schematic Circuit Compiler
 * Compiles a structured CircuitDesignPlan into real, authoritative FloZ ECA schematic objects.
 */

import { ApexProject, SchematicSymbolInstance } from '../../core/types';
import { SchematicHelper } from '../../schematic/helper';
import { LibraryResolver } from './libraryResolver';
import { PlacementPlanner } from './placementPlanner';
import { ConnectionPlanner } from './connectionPlanner';
import { CircuitDesignPlan } from './types';
import { ActionProposal } from '../types';
import { ActionValidator } from '../actionValidator';

export class SchematicCompiler {
  /**
   * Compiles a CircuitDesignPlan into an invertible, transaction-safe ActionProposal
   */
  public static compilePlan(plan: CircuitDesignPlan, project: ApexProject): ActionProposal | null {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const symbolMap = new Map<string, SchematicSymbolInstance>();
    const instantiatedSymbols: SchematicSymbolInstance[] = [];

    // Track simulated existing symbols to compute successive references
    let currentSymbolsList = [...activeSheet.symbols];
    // Track assigned logical references for multi-unit components (e.g. u1a and u1b both share 'U1')
    const logicalRefMap = new Map<string, string>();

    // 1. Resolve and Instantiate Symbols
    for (const comp of plan.components) {
      const symDef = LibraryResolver.resolveSymbol(comp.queryTerm || comp.role);
      if (!symDef) {
        console.warn(`Could not resolve symbol for component role: "${comp.role}" (query: "${comp.queryTerm}")`);
        continue;
      }

      const isDivider = plan.title.toLowerCase().includes('divider') || (plan.components.length === 2 && (comp.id === 'r1' || comp.id === 'r2'));
      const rotation = isDivider ? 90 : 0;

      let ref = comp.reference;
      if (!ref) {
        if (comp.logicalReference) {
          if (!logicalRefMap.has(comp.logicalReference)) {
            const assigned = SchematicHelper.getNextReference(symDef.defaultPrefix, currentSymbolsList);
            logicalRefMap.set(comp.logicalReference, assigned);
          }
          ref = logicalRefMap.get(comp.logicalReference)!;
        } else {
          ref = SchematicHelper.getNextReference(symDef.defaultPrefix, currentSymbolsList);
        }
      }

      const targetUnitNum = comp.unit || 1;
      const targetUnit = symDef.units?.find((u) => u.unit === targetUnitNum) || (symDef.units && symDef.units[0]);

      const symbolInstance: SchematicSymbolInstance = {
        id: `sym_${Date.now()}_${comp.id}_${Math.random().toString(36).substr(2, 4)}`,
        symbolDefId: symDef.id,
        reference: ref,
        value: comp.value || symDef.name,
        footprint: symDef.defaultFootprint || '',
        x: 0,
        y: 0,
        rotation,
        mirrorX: false,
        unit: targetUnit ? targetUnit.unit : 1,
        unitSuffix: targetUnit ? targetUnit.name : undefined,
        fields: { Description: symDef.description, Role: comp.role },
        pins: JSON.parse(JSON.stringify(targetUnit ? targetUnit.pins : symDef.pins)),
      };

      symbolMap.set(comp.id, symbolInstance);
      instantiatedSymbols.push(symbolInstance);
      currentSymbolsList.push(symbolInstance);
    }

    if (instantiatedSymbols.length === 0) {
      return null;
    }

    // 2. Plan Non-Overlapping Grid Placement
    const placements = PlacementPlanner.planPlacements(plan.components, activeSheet.symbols);
    for (const comp of plan.components) {
      const symInst = symbolMap.get(comp.id);
      const pos = placements.get(comp.id);
      if (symInst && pos) {
        symInst.x = pos.x;
        symInst.y = pos.y;
      }
    }

    // 3. Plan Connections, Orthogonal Wires, and Labels
    const { wires, labels, junctions } = ConnectionPlanner.planConnections(plan.connections, symbolMap);

    // 4. Build ActionProposal Diff Summary
    const addedComponentsSummary = instantiatedSymbols.map((s) => ({
      reference: s.reference,
      value: s.value,
      footprint: s.footprint,
      position: { x: s.x, y: s.y },
    }));

    const addedWiresSummary = plan.connections.map((c) => ({
      from: `${symbolMap.get(c.from.componentId)?.reference || c.from.componentId}:${c.from.pinNumberOrName}`,
      to: `${symbolMap.get(c.to.componentId)?.reference || c.to.componentId}:${c.to.pinNumberOrName}`,
    }));

    const proposal: ActionProposal = {
      id: `prop_gen_${Date.now()}`,
      title: `Generate Circuit: ${plan.title}`,
      description: plan.description,
      category: 'full_circuit_generation',
      permission: 'MUTATE',
      diff: {
        addedComponents: addedComponentsSummary,
        addedWires: addedWiresSummary,
        connectedNets: plan.globalNets,
        notes: [
          `Generated ${instantiatedSymbols.length} real schematic symbols`,
          `Generated ${wires.length} orthogonal wire segments`,
          `Created ${labels.length} electrical net labels`,
        ],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];
        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: [...s.symbols, ...instantiatedSymbols],
                    wires: [...s.wires, ...wires],
                    labels: [...s.labels, ...labels],
                    junctions: [...s.junctions, ...junctions],
                  }
                : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }
}
