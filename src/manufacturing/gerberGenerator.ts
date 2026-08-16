/**
 * Apex EDA - Standard RS-274X Extended Gerber Generator
 * Formats standard Gerber files for PCB fabrication (JLCPCB / PCBWay / Eurocircuits compliant).
 */

import { ApexProject, PCBLayerId, Point2D } from '../core/types';

export class GerberGenerator {
  /**
   * Generates RS-274X Gerber file content for a specified PCB layer
   */
  public static generateLayer(project: ApexProject, layer: PCBLayerId): string {
    const pcb = project.pcb;
    const now = new Date().toISOString();

    let gbr = '';
    // Standard RS-274X Header
    gbr += `G04 Apex EDA RS-274X Gerber Generator*\n`;
    gbr += `G04 Project: ${project.metadata.name} Rev ${project.metadata.version}*\n`;
    gbr += `G04 Layer: ${layer} Date: ${now}*\n`;
    gbr += `%FSLAX46Y46*%\n`; // Format specification 4.6 metric (nanometers/microns)
    gbr += `%MOMM*%\n`; // Units: millimeters
    gbr += `%LPD*%\n`; // Layer polarity dark
    gbr += `G01*\n`; // Linear interpolation
    gbr += `G75*\n`; // Multi-quadrant arc mode

    // Standard Aperture Definitions
    // D10: Round 0.2mm (standard trace/silk line)
    // D11: Round 0.25mm
    // D12: Round 0.50mm
    // D13: Round 0.80mm
    // D14: Rect 1.5x0.3mm (QFP pad)
    // D15: Rect 1.0x1.3mm (0805 pad)
    // D16: Rect 0.8x0.9mm (0603 pad)
    // D17: Round 1.6mm (Through-hole annular ring)
    gbr += `%ADD10C,0.200000*%\n`;
    gbr += `%ADD11C,0.250000*%\n`;
    gbr += `%ADD12C,0.500000*%\n`;
    gbr += `%ADD13C,0.800000*%\n`;
    gbr += `%ADD14R,1.500000X0.300000*%\n`;
    gbr += `%ADD15R,1.000000X1.300000*%\n`;
    gbr += `%ADD16R,0.800000X0.900000*%\n`;
    gbr += `%ADD17C,1.600000*%\n`;

    const formatCoord = (val: number): string => {
      // 4.6 format: 1mm = 1000000
      const scaled = Math.round(val * 1000000);
      return `${scaled >= 0 ? '+' : ''}${scaled.toString().padStart(10, '0')}`;
    };

    // 1. Board Outline (Edge.Cuts)
    if (layer === 'Edge.Cuts' || project.mfgConfig.includeEdgeCuts) {
      if (layer === 'Edge.Cuts') {
        gbr += `D10*\n`;
        const outline = pcb.boardOutline;
        if (outline.length > 0) {
          gbr += `X${formatCoord(outline[0].x)}Y${formatCoord(outline[0].y)}D02*\n`;
          for (let i = 1; i < outline.length; i++) {
            gbr += `X${formatCoord(outline[i].x)}Y${formatCoord(outline[i].y)}D01*\n`;
          }
          gbr += `X${formatCoord(outline[0].x)}Y${formatCoord(outline[0].y)}D01*\n`;
        }

        // Cutouts/Mounting holes on Edge.Cuts
        pcb.graphics.forEach((g) => {
          if (g.layer === 'Edge.Cuts' && g.type === 'circle' && g.x !== undefined && g.y !== undefined && g.radius !== undefined) {
            gbr += `X${formatCoord(g.x)}Y${formatCoord(g.y)}D02*\n`;
            gbr += `G03X${formatCoord(g.x)}Y${formatCoord(g.y)}I${formatCoord(g.radius)}J0D01*\n`;
            gbr += `G01*\n`;
          }
        });
      }
    }

    // 2. Copper Layers (F.Cu / B.Cu)
    if (layer === 'F.Cu' || layer === 'B.Cu') {
      // Tracks
      pcb.tracks.forEach((track) => {
        if (track.layer === layer) {
          const apCode = track.width >= 0.5 ? 'D12' : track.width >= 0.25 ? 'D11' : 'D10';
          gbr += `${apCode}*\n`;
          gbr += `X${formatCoord(track.x1)}Y${formatCoord(track.y1)}D02*\n`;
          gbr += `X${formatCoord(track.x2)}Y${formatCoord(track.y2)}D01*\n`;
        }
      });

      // Vias
      pcb.vias.forEach((via) => {
        gbr += `D13*\n`;
        gbr += `X${formatCoord(via.x)}Y${formatCoord(via.y)}D03*\n`; // Flash aperture
      });

      // Footprint Pads
      pcb.footprints.forEach((fp) => {
        const rad = (fp.rotation * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);

        fp.pads.forEach((pad) => {
          if (!pad.layers.includes(layer)) return;

          const rx = pad.x * cosR - pad.y * sinR;
          const ry = pad.x * sinR + pad.y * cosR;
          const absX = fp.x + rx;
          const absY = fp.y + ry;

          if (pad.type === 'through_hole') {
            gbr += `D17*\n`;
            gbr += `X${formatCoord(absX)}Y${formatCoord(absY)}D03*\n`;
          } else if (pad.shape === 'roundrect' || pad.shape === 'rect') {
            const apCode = pad.width > 1.2 ? 'D14' : pad.width >= 1.0 ? 'D15' : 'D16';
            gbr += `${apCode}*\n`;
            gbr += `X${formatCoord(absX)}Y${formatCoord(absY)}D03*\n`;
          } else {
            gbr += `D13*\n`;
            gbr += `X${formatCoord(absX)}Y${formatCoord(absY)}D03*\n`;
          }
        });
      });
    }

    // 3. Silkscreen Layers (F.Silkscreen / B.Silkscreen)
    if (layer === 'F.Silkscreen' || layer === 'B.Silkscreen') {
      gbr += `D10*\n`;
      pcb.footprints.forEach((fp) => {
        if (fp.layer !== (layer === 'F.Silkscreen' ? 'F.Cu' : 'B.Cu')) return;

        const rad = (fp.rotation * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);

        fp.shapes.forEach((shape) => {
          if (shape.layer === layer) {
            if (shape.type === 'rect' && shape.width && shape.height) {
              const hw = shape.width / 2;
              const hh = shape.height / 2;
              const corners: Point2D[] = [
                { x: shape.x! - hw, y: shape.y! - hh },
                { x: shape.x! + hw, y: shape.y! - hh },
                { x: shape.x! + hw, y: shape.y! + hh },
                { x: shape.x! - hw, y: shape.y! + hh },
              ];

              const transformed = corners.map((p) => ({
                x: fp.x + (p.x * cosR - p.y * sinR),
                y: fp.y + (p.x * sinR + p.y * cosR),
              }));

              gbr += `X${formatCoord(transformed[0].x)}Y${formatCoord(transformed[0].y)}D02*\n`;
              for (let c = 1; c < transformed.length; c++) {
                gbr += `X${formatCoord(transformed[c].x)}Y${formatCoord(transformed[c].y)}D01*\n`;
              }
              gbr += `X${formatCoord(transformed[0].x)}Y${formatCoord(transformed[0].y)}D01*\n`;
            }
          }
        });
      });
    }

    // End of Gerber file
    gbr += `M02*\n`;
    return gbr;
  }
}
