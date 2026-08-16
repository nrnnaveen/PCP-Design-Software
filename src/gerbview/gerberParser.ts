/**
 * Apex EDA - RS-274X Gerber & Excellon NC Drill Parser
 * Decodes standard fabrication files into renderable CAD vector layer primitives.
 */

export interface GerberDrawPrimitive {
  type: 'line' | 'rect' | 'circle' | 'arc';
  x1: number;
  y1: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  radius?: number;
  strokeWidth?: number;
}

export interface ParsedGerberLayer {
  layerName: string;
  color: string;
  visible: boolean;
  opacity: number;
  primitives: GerberDrawPrimitive[];
}

export class GerberParser {
  public static parseGerber(content: string, layerName: string, color: string): ParsedGerberLayer {
    const primitives: GerberDrawPrimitive[] = [];
    const lines = content.split(/\r?\n/);

    interface Aperture {
      type: 'C' | 'R' | 'O';
      dim1: number;
      dim2?: number;
    }

    const apertures: Map<string, Aperture> = new Map();
    let currentAperture: Aperture | null = null;
    let currentX = 0;
    let currentY = 0;

    // Coordinate divisor for 4.6 metric format (1mm = 1,000,000)
    let coordScale = 1000000;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('G04')) continue; // comments

      // Parse Aperture Definition %ADD10C,0.200000*%
      const addMatch = line.match(/%ADD(\d+)([CRO]),([0-9.]+)(?:X([0-9.]+))?\*%/);
      if (addMatch) {
        const apId = `D${addMatch[1]}`;
        const shape = addMatch[2] as 'C' | 'R' | 'O';
        const dim1 = parseFloat(addMatch[3]);
        const dim2 = addMatch[4] ? parseFloat(addMatch[4]) : undefined;
        apertures.set(apId, { type: shape, dim1, dim2 });
        continue;
      }

      // Aperture selection e.g. D10*
      const apSelect = line.match(/^D(\d+)\*$/);
      if (apSelect) {
        currentAperture = apertures.get(`D${apSelect[1]}`) || null;
        continue;
      }

      // Command line with coordinates e.g. X0013000000Y0015900000D01*
      const coordMatch = line.match(/(?:X([+-]?\d+))?(?:Y([+-]?\d+))?(?:D(01|02|03))\*/);
      if (coordMatch) {
        let x = currentX;
        let y = currentY;

        if (coordMatch[1] !== undefined) {
          x = parseInt(coordMatch[1], 10) / coordScale;
        }
        if (coordMatch[2] !== undefined) {
          y = parseInt(coordMatch[2], 10) / coordScale;
        }

        const op = coordMatch[3];

        if (op === '01') {
          // Draw line from current to new
          primitives.push({
            type: 'line',
            x1: currentX,
            y1: currentY,
            x2: x,
            y2: y,
            strokeWidth: currentAperture ? currentAperture.dim1 : 0.2,
          });
        } else if (op === '03') {
          // Flash aperture at coordinate
          if (currentAperture) {
            if (currentAperture.type === 'C') {
              primitives.push({
                type: 'circle',
                x1: x,
                y1: y,
                radius: currentAperture.dim1 / 2,
              });
            } else if (currentAperture.type === 'R') {
              primitives.push({
                type: 'rect',
                x1: x,
                y1: y,
                width: currentAperture.dim1,
                height: currentAperture.dim2 || currentAperture.dim1,
              });
            }
          }
        }

        currentX = x;
        currentY = y;
      }
    }

    return {
      layerName,
      color,
      visible: true,
      opacity: 0.75,
      primitives,
    };
  }

  public static parseExcellon(content: string, layerName = 'Drill Hits', color = '#ffffff'): ParsedGerberLayer {
    const primitives: GerberDrawPrimitive[] = [];
    const lines = content.split(/\r?\n/);

    const tools: Map<string, number> = new Map();
    let currentDiameter = 0.8;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith(';') || line.startsWith('M48') || line.startsWith('%')) continue;

      // Tool definition T01C0.800
      const toolDef = line.match(/^T(\d+)C([0-9.]+)/);
      if (toolDef) {
        tools.set(`T${toolDef[1]}`, parseFloat(toolDef[2]));
        continue;
      }

      // Tool select T01
      const toolSel = line.match(/^T(\d+)$/);
      if (toolSel) {
        currentDiameter = tools.get(`T${toolSel[1]}`) || 0.8;
        continue;
      }

      // Drill hit X24.000Y13.500
      const hitMatch = line.match(/X([+-]?[0-9.]+)Y([+-]?[0-9.]+)/);
      if (hitMatch) {
        const x = parseFloat(hitMatch[1]);
        const y = parseFloat(hitMatch[2]);
        primitives.push({
          type: 'circle',
          x1: x,
          y1: y,
          radius: currentDiameter / 2,
        });
      }
    }

    return {
      layerName,
      color,
      visible: true,
      opacity: 0.9,
      primitives,
    };
  }
}
