/**
 * FloZ ECA - Standard Excellon NC Drill File Generator
 * Generates CNC drilling coordinates (.drl) and drill summary reports.
 */

import { ApexProject } from '../core/types';

export class ExcellonDrillGenerator {
  public static generate(project: ApexProject): string {
    const pcb = project.pcb;
    const now = new Date().toISOString();

    let drl = '';
    drl += `; FloZ ECA Excellon NC Drill File\n`;
    drl += `; Project: ${project.metadata.name}\n`;
    drl += `; Date: ${now}\n`;
    drl += `; Units: METRIC (mm)\n`;
    drl += `M48\n`;
    drl += `METRIC,TZ\n`;

    // Collect all drill holes grouped by diameter
    const toolHoles: Map<number, Array<{ x: number; y: number }>> = new Map();

    const addHole = (dia: number, x: number, y: number) => {
      const roundedDia = Math.round(dia * 100) / 100;
      if (!toolHoles.has(roundedDia)) {
        toolHoles.set(roundedDia, []);
      }
      toolHoles.get(roundedDia)!.push({ x, y });
    };

    // 1. Through-hole pads
    pcb.footprints.forEach((fp) => {
      const rad = (fp.rotation * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      fp.pads.forEach((pad) => {
        if (pad.type === 'through_hole' && pad.drillDiameter) {
          const rx = pad.x * cosR - pad.y * sinR;
          const ry = pad.x * sinR + pad.y * cosR;
          addHole(pad.drillDiameter, fp.x + rx, fp.y + ry);
        }
      });
    });

    // 2. PCB Vias
    pcb.vias.forEach((via) => {
      addHole(via.drillDiameter, via.x, via.y);
    });

    // 3. Mounting Holes on Edge.Cuts
    pcb.graphics.forEach((g) => {
      if (g.layer === 'Edge.Cuts' && g.type === 'circle' && g.x !== undefined && g.y !== undefined && g.radius !== undefined) {
        addHole(g.radius * 2, g.x, g.y);
      }
    });

    // Tool Definition Header (e.g. T01C0.400)
    let toolIndex = 1;
    const toolIdMap: Map<number, string> = new Map();

    toolHoles.forEach((_, dia) => {
      const toolId = `T${toolIndex.toString().padStart(2, '0')}`;
      toolIdMap.set(dia, toolId);
      drl += `${toolId}C${dia.toFixed(3)}\n`;
      toolIndex++;
    });

    drl += `%\n`; // End of header
    drl += `G90\n`; // Absolute coordinates
    drl += `G05\n`; // Drill mode

    // Tool Hits
    toolHoles.forEach((hits, dia) => {
      const toolId = toolIdMap.get(dia)!;
      drl += `${toolId}\n`;
      hits.forEach((hit) => {
        drl += `X${hit.x.toFixed(3)}Y${hit.y.toFixed(3)}\n`;
      });
    });

    drl += `M30\n`; // End of program
    return drl;
  }
}
