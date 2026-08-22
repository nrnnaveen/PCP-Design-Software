/**
 * FloZ ECA - Engineering Context Builder (Phase 3)
 * Assembles compact, structured representations of schematic, PCB, selection, and diagnostics
 * with prompt-injection sanitization and granular context levels (minimal, schematic, pcb, diagnostic, full).
 */

import { ApexProject } from '../core/types';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';
import {
  FullEngineeringContext,
  SchematicSummaryContext,
  PCBSummaryContext,
  AISettings,
  ContextLevel,
} from './types';

export class ContextBuilder {
  /**
   * Sanitizes string values from project metadata against prompt injection
   */
  public static sanitizeString(str: string): string {
    if (!str) return '';
    return str
      .replace(/[\r\n\t]/g, ' ')
      .replace(/[<>{}\\]/g, '')
      .trim()
      .slice(0, 120);
  }

  /**
   * Builds compact schematic summary from project state
   */
  public static buildSchematicContext(project: ApexProject): SchematicSummaryContext {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
    const ercViolations = ERCEngine.run(project);

    const components = activeSheet.symbols.map((sym) => ({
      reference: this.sanitizeString(sym.reference),
      value: this.sanitizeString(sym.value),
      footprint: this.sanitizeString(sym.footprint || 'Unassigned'),
      position: { x: Math.round(sym.x * 10) / 10, y: Math.round(sym.y * 10) / 10 },
      pins: sym.pins.map((p) => ({
        number: this.sanitizeString(p.number),
        name: this.sanitizeString(p.name),
        electricalType: p.electricalType,
      })),
    }));

    const nets = Object.values(connectivity.netGraph.nets).map((n) => ({
      name: this.sanitizeString(n.name),
      isPower: n.isPower,
      pinCount: n.pins.length,
      pins: n.pins.map((p) => `${this.sanitizeString(p.symbolRef)}:${this.sanitizeString(p.pinNumber)}`),
    }));

    const labels = activeSheet.labels.map((l) => this.sanitizeString(l.text));
    const powerNetNames = Object.values(connectivity.netGraph.nets)
      .filter((n) => n.isPower || /^(VCC|VDD|\+?3\.3V|\+?5V|VBUS|GND|VSSA|VSS)/i.test(n.name))
      .map((n) => this.sanitizeString(n.name));
    const powerRails = Array.from(
      new Set([
        ...activeSheet.powerSymbols.map((p) => this.sanitizeString(p.netName)),
        ...powerNetNames,
      ])
    );

    const violations = ercViolations.map((v) => ({
      code: v.code,
      severity: v.severity,
      title: this.sanitizeString(v.title),
      description: this.sanitizeString(v.description),
      x: v.x,
      y: v.y,
    }));

    return {
      componentCount: components.length,
      components,
      nets,
      labels,
      powerRails,
      ercViolations: violations,
    };
  }

  /**
   * Builds compact PCB summary from project state
   */
  public static buildPCBContext(project: ApexProject): PCBSummaryContext {
    const drcViolations = DRCEngine.run(project);

    const footprints = project.pcb.footprints.map((f) => ({
      reference: this.sanitizeString(f.reference),
      value: this.sanitizeString(f.value),
      footprint: this.sanitizeString(f.footprintDefId),
      layer: f.layer,
      position: { x: Math.round(f.x * 10) / 10, y: Math.round(f.y * 10) / 10 },
    }));

    const violations = drcViolations.map((v) => ({
      code: v.code,
      title: this.sanitizeString(v.title),
      description: this.sanitizeString(v.description),
      x: v.x,
      y: v.y,
    }));

    let minX = 0, maxX = 100, minY = 0, maxY = 80;
    if (project.pcb.boardOutline && project.pcb.boardOutline.length > 0) {
      minX = Math.min(...project.pcb.boardOutline.map((p) => p.x));
      maxX = Math.max(...project.pcb.boardOutline.map((p) => p.x));
      minY = Math.min(...project.pcb.boardOutline.map((p) => p.y));
      maxY = Math.max(...project.pcb.boardOutline.map((p) => p.y));
    }
    const width = Math.max(10, Math.round((maxX - minX) * 10) / 10);
    const height = Math.max(10, Math.round((maxY - minY) * 10) / 10);

    return {
      boardDimensions: {
        width,
        height,
      },
      layersCount: project.pcb.stackup?.length || 2,
      footprintCount: footprints.length,
      footprints,
      trackCount: project.pcb.tracks.length,
      viaCount: project.pcb.vias.length,
      zoneCount: project.pcb.zones.length,
      drcViolations: violations,
    };
  }

  /**
   * Assembles engineering context based on configured context level
   */
  public static buildFullEngineeringContext(
    project: ApexProject,
    selectedSymbolId?: string,
    selectedFootprintId?: string,
    settings?: AISettings
  ): FullEngineeringContext {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const level: ContextLevel = settings?.contextLevel || 'full';

    let selectedObject: FullEngineeringContext['selectedObject'] = undefined;

    if (selectedSymbolId) {
      const sym = activeSheet.symbols.find((s) => s.id === selectedSymbolId);
      if (sym) {
        const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
        const pinDetails = sym.pins.map((p) => {
          let net = 'Unconnected';
          for (const [netName, n] of Object.entries(connectivity.netGraph.nets)) {
            if (n.pins.some((pr) => pr.symbolRef === sym.reference && pr.pinNumber === p.number)) {
              net = netName;
              break;
            }
          }
          return { number: p.number, name: p.name, type: p.electricalType, net };
        });

        selectedObject = {
          type: 'symbol',
          id: sym.id,
          reference: this.sanitizeString(sym.reference),
          details: {
            value: this.sanitizeString(sym.value),
            footprint: this.sanitizeString(sym.footprint || 'Unassigned'),
            position: { x: sym.x, y: sym.y },
            rotation: sym.rotation,
            pins: pinDetails,
          },
        };
      }
    } else if (selectedFootprintId) {
      const fp = project.pcb.footprints.find((f) => f.id === selectedFootprintId);
      if (fp) {
        selectedObject = {
          type: 'footprint',
          id: fp.id,
          reference: this.sanitizeString(fp.reference),
          details: {
            value: this.sanitizeString(fp.value),
            package: this.sanitizeString(fp.footprintDefId),
            layer: fp.layer,
            position: { x: fp.x, y: fp.y },
            padsCount: fp.pads.length,
          },
        };
      }
    }

    const includeSch = level === 'full' || level === 'schematic' || (settings?.attachContext.schematic && level !== 'minimal');
    const includePcb = level === 'full' || level === 'pcb' || (settings?.attachContext.pcb && level !== 'minimal');

    return {
      projectName: this.sanitizeString(project.metadata.name),
      units: this.sanitizeString(project.metadata.units),
      activeSheetTitle: this.sanitizeString(activeSheet.title || 'Schematic Sheet'),
      selectedObject,
      schematic: includeSch ? this.buildSchematicContext(project) : undefined,
      pcb: includePcb ? this.buildPCBContext(project) : undefined,
    };
  }

  /**
   * Formats the context into a clean system prompt string
   */
  public static formatContextPrompt(context: FullEngineeringContext): string {
    let prompt = `## PROJECT CONTEXT: "${context.projectName}" (${context.units})\n`;

    if (context.selectedObject) {
      prompt += `\n### CURRENT SELECTION (HIGH PRIORITY FOCUS):\n` +
        `- Type: ${context.selectedObject.type}\n` +
        `- Reference: ${context.selectedObject.reference || 'N/A'}\n` +
        `- Details: ${JSON.stringify(context.selectedObject.details, null, 2)}\n`;
    }

    if (context.schematic) {
      const sch = context.schematic;
      prompt += `\n### SCHEMATIC STATE (${sch.componentCount} components):\n`;
      prompt += `- Components: ${sch.components.map((c) => `${c.reference} (${c.value}, ${c.footprint})`).join(', ')}\n`;
      prompt += `- Active Nets (${sch.nets.length}): ${sch.nets.map((n) => `${n.name} [${n.pins.join(', ')}]`).join('; ')}\n`;
      if (sch.powerRails.length > 0) {
        prompt += `- Power Rails: ${sch.powerRails.join(', ')}\n`;
      }
      if (sch.ercViolations.length > 0) {
        prompt += `- ERC Issues (${sch.ercViolations.length}):\n`;
        sch.ercViolations.forEach((v) => {
          prompt += `  * [${v.code}] ${v.title} (${v.severity}): ${v.description} at (${v.x}, ${v.y})\n`;
        });
      } else {
        prompt += `- ERC: Clean (0 violations)\n`;
      }
    }

    if (context.pcb) {
      const pcb = context.pcb;
      prompt += `\n### PCB LAYOUT STATE:\n`;
      prompt += `- Board: ${pcb.boardDimensions.width} x ${pcb.boardDimensions.height} mm (${pcb.layersCount} Layers)\n`;
      prompt += `- Placed Footprints (${pcb.footprintCount}): ${pcb.footprints.map((f) => `${f.reference} (${f.footprint})`).join(', ')}\n`;
      prompt += `- Traces: ${pcb.trackCount}, Vias: ${pcb.viaCount}, Zones: ${pcb.zoneCount}\n`;
      if (pcb.drcViolations.length > 0) {
        prompt += `- DRC Issues (${pcb.drcViolations.length}): ${pcb.drcViolations.map((v) => `${v.code}: ${v.title}`).join('; ')}\n`;
      } else {
        prompt += `- DRC: Clean (0 violations)\n`;
      }
    }

    return prompt;
  }
}
