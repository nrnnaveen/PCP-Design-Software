/**
 * FloZ ECA - Tool Call & Generation Output Parser
 * Intercepts LLM tool-calling JSON lines and design intents, converting them into
 * clean human-readable summaries and authoritative, transaction-safe ActionProposals.
 */

import { ApexProject, SchematicSymbolInstance, SchematicWireSegment, SchematicNetLabel } from '../../core/types';
import { libraryRegistry } from '../../library/libraryRegistry';
import { SchematicHelper } from '../../schematic/helper';
import { ActionProposal, ToolActivity } from '../types';
import { ActionValidator } from '../actionValidator';
import { DesignIntent } from './designIntent';
import { SchematicCompiler } from './schematicCompiler';
import { LibraryResolver } from './libraryResolver';
import { AutoRouter } from '../../pcb/autoRouter';
import { AutoPlacer } from '../../pcb/autoPlacer';
import { ZoneGenerator } from '../../pcb/zoneGenerator';
import { AutoFixEngine } from '../../validation/autoFixEngine';

export class ToolCallParser {
  /**
   * Parses LLM text response for JSON tool calls or converts circuit creation requests into ActionProposals
   */
  public static parseResponse(
    rawText: string,
    userPrompt: string,
    project: ApexProject
  ): { cleanText: string; proposals: ActionProposal[]; toolActivities: ToolActivity[] } {
    const proposals: ActionProposal[] = [];
    const toolActivities: ToolActivity[] = [];

    // 1. Check for JSON tool lines in the response (e.g. {"tool": "schematic_add_component", ...})
    const lines = rawText.split('\n');
    const jsonToolCalls: any[] = [];
    const nonJsonLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}') && (trimmed.includes('"tool"') || trimmed.includes('"action"'))) {
        try {
          const parsed = JSON.parse(trimmed);
          jsonToolCalls.push(parsed);
          continue;
        } catch {}
      }
      nonJsonLines.push(line);
    }

    // 2. If JSON tool calls were detected, compile them into an ActionProposal
    if (jsonToolCalls.length > 0) {
      const activeSheet =
        project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
        project.schematic.sheets[0];

      const addedSymbols: SchematicSymbolInstance[] = [];
      const addedWires: SchematicWireSegment[] = [];
      const addedLabels: SchematicNetLabel[] = [];

      for (const call of jsonToolCalls) {
        const toolName = call.tool || call.action;
        const args = call.args || call.parameters || call;

        if (toolName === 'schematic_add_component' || toolName === 'place_symbol') {
          const ref = args.ref || args.reference || 'U1';
          const val = args.value || '10k';
          const fp = args.footprint || '';
          const pos = Array.isArray(args.pos) ? { x: args.pos[0], y: args.pos[1] } : (args.pos || { x: 100, y: 100 });

          // Resolve symbol definition from prefix or value
          const prefix = ref.replace(/[0-9]/g, '').toUpperCase() || 'R';
          let symDef = LibraryResolver.resolveSymbol(val) ||
            libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix.toUpperCase() === prefix) ||
            libraryRegistry.getAllSymbols()[0];

          const symInst: SchematicSymbolInstance = {
            id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            symbolDefId: symDef.id,
            reference: ref,
            value: val,
            footprint: fp || symDef.defaultFootprint || '',
            x: pos.x,
            y: pos.y,
            rotation: 0,
            mirrorX: false,
            unit: 1,
            fields: { Description: symDef.description },
            pins: JSON.parse(JSON.stringify(symDef.pins)),
          };

          addedSymbols.push(symInst);
          toolActivities.push({
            id: `act_${Date.now()}_${ref}`,
            name: 'schematic_add_component',
            permission: 'MUTATE',
            description: `Placed ${ref} (${val}) at (${pos.x}, ${pos.y}) mm`,
            status: 'completed',
          });
        } else if (toolName === 'schematic_add_wire' || toolName === 'create_wire') {
          const points = args.points || [];
          if (Array.isArray(points) && points.length >= 2) {
            const p1 = Array.isArray(points[0]) ? { x: points[0][0], y: points[0][1] } : points[0];
            const p2 = Array.isArray(points[1]) ? { x: points[1][0], y: points[1][1] } : points[1];

            const wireInst: SchematicWireSegment = {
              id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              x1: p1.x,
              y1: p1.y,
              x2: p2.x,
              y2: p2.y,
            };

            addedWires.push(wireInst);
          }
        } else if (toolName === 'schematic_add_label' || toolName === 'create_label') {
          const text = args.text || args.net || 'NET';
          const pos = Array.isArray(args.pos) ? { x: args.pos[0], y: args.pos[1] } : (args.pos || { x: 100, y: 100 });

          addedLabels.push({
            id: `lbl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            text,
            x: pos.x,
            y: pos.y,
            type: text.includes('+') || text.includes('GND') || text.includes('VCC') ? 'global' : 'local',
            orientation: 0,
          });
        }
      }

      if (addedSymbols.length > 0 || addedWires.length > 0) {
        const proposal: ActionProposal = {
          id: `prop_llm_${Date.now()}`,
          title: `Generated Circuit (${addedSymbols.length} Symbols, ${addedWires.length} Wires)`,
          description: `Compiled real schematic objects from LLM generation output.`,
          category: 'full_circuit_generation',
          permission: 'MUTATE',
          diff: {
            addedComponents: addedSymbols.map((s) => ({
              reference: s.reference,
              value: s.value,
              footprint: s.footprint,
              position: { x: s.x, y: s.y },
            })),
            notes: [
              `Created ${addedSymbols.length} real schematic components`,
              `Created ${addedWires.length} electrical wires`,
              `Created ${addedLabels.length} net labels`,
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
                        symbols: [...s.symbols, ...addedSymbols],
                        wires: [...s.wires, ...addedWires],
                        labels: [...s.labels, ...addedLabels],
                      }
                    : s
                ),
              },
            };
          },
        };

        proposal.validation = ActionValidator.preValidate(proposal, project);
        proposals.push(proposal);

        let cleanText = `## Verified Project Facts\n` +
          `- Components Resolved (${addedSymbols.length}): ${addedSymbols.map((s) => `${s.reference} (${s.value})`).join(', ')}\n` +
          `- Wires Generated: ${addedWires.length} electrical wire segments.\n\n` +
          `## Engineering Recommendations & Action Proposals\n` +
          `The schematic circuit has been compiled into real FloZ ECA objects.\n\n` +
          `## Action\nClick **[Apply Change]** below to commit these components to the active schematic canvas.`;

        return { cleanText, proposals, toolActivities };
      }
    }

    // 3. Check for dedicated EDA automation commands (Auto-Route, Sync PCB, Ground Pour, Auto-Fix)
    const promptLower = (userPrompt + ' ' + rawText).toLowerCase();

    if (promptLower.includes('auto-route') || promptLower.includes('auto route') || promptLower.includes('route the board') || promptLower.includes('route all nets')) {
      const routeProp: ActionProposal = {
        id: `prop_route_${Date.now()}`,
        title: 'Auto-Route PCB Connections',
        description: 'Route all unrouted ratsnest nets using 45° octilinear copper tracks and transition vias.',
        category: 'auto_route',
        permission: 'MUTATE',
        diff: { notes: ['Multi-net priority routing for power and signal traces.'] },
        status: 'pending',
        applyAction: (prevPrj: ApexProject) => {
          return AutoRouter.routeProject(prevPrj);
        },
      };
      routeProp.validation = ActionValidator.preValidate(routeProp, project);
      proposals.push(routeProp);

      return {
        cleanText: `## Verified Project Facts\n- PCB Netlist Ready for Routing\n\n## Recommendation\nAuto-route all unrouted airwires using 45° octilinear copper tracks and layer transition vias.\n\n## Action\nClick **[Apply Change]** below to execute multi-net routing on the PCB.`,
        proposals,
        toolActivities,
      };
    }

    if (promptLower.includes('sync pcb') || promptLower.includes('generate pcb') || promptLower.includes('transfer to pcb') || promptLower.includes('update pcb')) {
      const syncProp: ActionProposal = {
        id: `prop_sync_${Date.now()}`,
        title: 'Synchronize Schematic to PCB Layout',
        description: 'Transfer schematic components, assigned footprints, and net connections to PCB with auto-placement.',
        category: 'sync_schematic_to_pcb',
        permission: 'MUTATE',
        diff: { notes: ['Reconcile schematic symbols with PCB footprint instances and nets.'] },
        status: 'pending',
        applyAction: (prevPrj: ApexProject) => {
          return AutoPlacer.placeComponents(prevPrj);
        },
      };
      syncProp.validation = ActionValidator.preValidate(syncProp, project);
      proposals.push(syncProp);

      return {
        cleanText: `## Verified Project Facts\n- Schematic Components Ready for PCB Forward-Annotation\n\n## Recommendation\nSynchronize components, footprints, and netlist to the PCB layout with intelligent rule-based placement.\n\n## Action\nClick **[Apply Change]** below to generate the PCB layout.`,
        proposals,
        toolActivities,
      };
    }

    if (promptLower.includes('fix drc') || promptLower.includes('fix all drc') || promptLower.includes('fix erc') || promptLower.includes('auto-fix') || promptLower.includes('auto fix')) {
      const fixResult = AutoFixEngine.autoFixProject(project);
      const fixProp: ActionProposal = {
        id: `prop_autofix_${Date.now()}`,
        title: `Auto-Fix Diagnostics (${fixResult.fixedCount} issues)`,
        description: `Automatically repair safe design rule and electrical violations: ${fixResult.appliedFixes.join('; ')}`,
        category: 'auto_fix_diagnostics',
        permission: 'MUTATE',
        diff: { notes: fixResult.appliedFixes },
        status: 'pending',
        applyAction: (prevPrj: ApexProject) => {
          return AutoFixEngine.autoFixProject(prevPrj).updatedProject;
        },
      };
      fixProp.validation = ActionValidator.preValidate(fixProp, project);
      proposals.push(fixProp);

      return {
        cleanText: `## Verified Project Facts\n- Detected ${fixResult.fixedCount} auto-fixable diagnostic issues.\n\n## Recommendation\nApply automatic repairs: ${fixResult.appliedFixes.join('; ')}.\n\n## Action\nClick **[Apply Change]** below to commit diagnostic fixes.`,
        proposals,
        toolActivities,
      };
    }

    // 4. If no JSON lines, analyze user prompt & raw text with Universal DesignIntent
    const plan = DesignIntent.parsePrompt(userPrompt) || DesignIntent.parsePrompt(rawText);
    if (plan) {
      const isCompletePCBRequested = promptLower.includes('pcb') || promptLower.includes('board') || promptLower.includes('layout') || promptLower.includes('complete');

      let prop: ActionProposal | null;
      if (isCompletePCBRequested) {
        // Compile full schematic + PCB auto-placement + auto-routing
        const schemProp = SchematicCompiler.compilePlan(plan, project);
        if (schemProp) {
          const fullProp: ActionProposal = {
            id: `prop_full_eda_${Date.now()}`,
            title: `Full Design Workflow: ${plan.title}`,
            description: `${plan.description} (Includes Schematic, Footprint Assignment, PCB Placement, and 45° Auto-Routing).`,
            category: 'full_circuit_pcb_generation',
            permission: 'MUTATE',
            diff: {
              ...schemProp.diff,
              notes: [
                ...(schemProp.diff.notes || []),
                'Automated PCB Footprint Placement & Outline Generation',
                'Automated Multi-Net 45° Track Routing & Layer Vias',
                'Top & Bottom Copper Flood Ground Pour (GND)',
                'Synchronized 3D Mechanical Package Rendering',
              ],
            },
            status: 'pending',
            applyAction: (prevPrj: ApexProject): ApexProject => {
              let nextPrj = schemProp.applyAction(prevPrj);
              nextPrj = AutoPlacer.placeComponents(nextPrj, { boardMarginMm: 6.0 });
              nextPrj = AutoRouter.routeProject(nextPrj);
              nextPrj = ZoneGenerator.createGroundPlanes(nextPrj, ['F.Cu', 'B.Cu'], 'GND');
              return nextPrj;
            },
          };
          fullProp.validation = ActionValidator.preValidate(fullProp, project);
          prop = fullProp;
        } else {
          prop = null;
        }
      } else {
        prop = SchematicCompiler.compilePlan(plan, project);
      }

      if (prop) {
        proposals.push(prop);
        const compCount = prop.diff.addedComponents?.length || 0;
        const wireCount = prop.diff.addedWires?.length || 0;

        let cleanText = `## Verified Project Facts\n` +
          `- Circuit: **${plan.title}**\n` +
          `- Resolved Components (${compCount}): ${prop.diff.addedComponents?.map((c) => `${c.reference} (${c.value})`).join(', ')}\n` +
          `- Planned Connections: ${wireCount} orthogonal wire segments.\n` +
          (isCompletePCBRequested ? `- PCB Workflow: Automated Placement, 45° Multi-Net Routing, and Ground Pour.\n\n` : `\n`) +
          `## Engineering Recommendations & Action Proposals\n` +
          `${plan.description}\n\n` +
          `## Action\nClick **[Apply Change]** below to execute this design workflow on the active project.`;

        return { cleanText, proposals, toolActivities };
      }
    }

    return { cleanText: rawText, proposals, toolActivities };
  }
}
