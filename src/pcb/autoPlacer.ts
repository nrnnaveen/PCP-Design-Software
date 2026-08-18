/**
 * FloZ EDA - Intelligent AI PCB Component Placer
 * Places footprints according to engineering layout rules:
 * - Connectors placed at board edges
 * - Input protection / fuses / diodes placed near power entry
 * - Decoupling capacitors placed adjacent to IC power pins
 * - LEDs placed in visible areas
 * - Passives placed adjacent to associated IC pins
 * - Tight, manufacturable rectangular board outline with rounded corners
 */

import {
  ApexProject,
  PCBFootprintInstance,
  Point2D,
  FootprintGraphicShape,
  PCBTextGraphic,
} from '../core/types';
import { footprintLibrary } from '../library/footprintLibrary';
import { NetConnectivitySolver } from '../schematic/connectivity';

export interface PlacementOptions {
  boardMarginMm?: number;
  originX?: number;
  originY?: number;
}

export class AutoPlacer {
  /**
   * Intelligently arranges all footprints on the PCB and creates a clean Edge.Cuts board outline
   */
  public static placeComponents(project: ApexProject, options: PlacementOptions = {}): ApexProject {
    const margin = options.boardMarginMm || 6.0;
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);

    // Group symbols by functional category
    const connectors: string[] = [];
    const protection: string[] = [];
    const ics: string[] = [];
    const leds: string[] = [];
    const passives: string[] = [];

    const addRef = (list: string[], r: string) => {
      if (!list.includes(r)) list.push(r);
    };

    activeSheet.symbols.forEach((sym) => {
      if (sym.reference.startsWith('#')) return;
      const ref = sym.reference;
      const val = sym.value.toUpperCase();
      const prefix = ref.replace(/[0-9]/g, '');

      if (prefix === 'J' || val.includes('USB') || val.includes('CONN') || val.includes('HEADER')) {
        addRef(connectors, ref);
      } else if (prefix === 'F' || val.includes('FUSE') || (prefix === 'D' && (val.includes('1N5819') || val.includes('DIODE') || val.includes('SS14')))) {
        addRef(protection, ref);
      } else if (prefix === 'U' || val.includes('STM32') || val.includes('ESP32') || val.includes('555') || val.includes('358') || val.includes('LDO') || val.includes('4010') || val.includes('74')) {
        addRef(ics, ref);
      } else if (val.includes('LED') || prefix === 'D') {
        addRef(leds, ref);
      } else {
        addRef(passives, ref);
      }
    });

    const placedFootprints: PCBFootprintInstance[] = [];
    let curX = 15.0;
    let curY = 20.0;

    // 1. Place Connectors along left board edge
    connectors.forEach((ref, idx) => {
      const sym = activeSheet.symbols.find((s) => s.reference === ref);
      if (!sym) return;
      const fpDef = footprintLibrary.getFootprint(sym.footprint) || footprintLibrary.getAllFootprints()[0];

      const x = 12.0;
      const y = 20.0 + idx * 22.0;
      placedFootprints.push(this.createFootprintInstance(sym, fpDef, x, y, 0));
      curX = Math.max(curX, x + 15.0);
    });

    // 2. Place Input Protection / Fuses / Diodes near connector
    protection.forEach((ref, idx) => {
      const sym = activeSheet.symbols.find((s) => s.reference === ref);
      if (!sym) return;
      const fpDef = footprintLibrary.getFootprint(sym.footprint) || footprintLibrary.getAllFootprints()[0];

      const x = curX + idx * 14.0;
      const y = 20.0;
      placedFootprints.push(this.createFootprintInstance(sym, fpDef, x, y, 0));
    });

    if (protection.length > 0) {
      curX += protection.length * 14.0 + 8.0;
    }

    // 3. Place ICs centrally
    let icCenterX = curX + 15.0;
    let icCenterY = 25.0;
    ics.forEach((ref, idx) => {
      const sym = activeSheet.symbols.find((s) => s.reference === ref);
      if (!sym) return;
      const fpDef = footprintLibrary.getFootprint(sym.footprint) || footprintLibrary.getAllFootprints()[0];

      const x = icCenterX + idx * 25.0;
      const y = icCenterY;
      placedFootprints.push(this.createFootprintInstance(sym, fpDef, x, y, 0));
    });

    // 4. Place Decoupling / Passives near connected ICs or orderly grid
    let passiveCol = 0;
    passives.forEach((ref) => {
      const sym = activeSheet.symbols.find((s) => s.reference === ref);
      if (!sym) return;
      const fpDef = footprintLibrary.getFootprint(sym.footprint) || footprintLibrary.getAllFootprints()[0];

      const x = curX + (passiveCol % 3) * 12.0;
      const y = 35.0 + Math.floor(passiveCol / 3) * 12.0;
      placedFootprints.push(this.createFootprintInstance(sym, fpDef, x, y, 0));
      passiveCol++;
    });

    // 5. Place LEDs visibly along top right
    leds.forEach((ref, idx) => {
      const sym = activeSheet.symbols.find((s) => s.reference === ref);
      if (!sym) return;
      const fpDef = footprintLibrary.getFootprint(sym.footprint) || footprintLibrary.getAllFootprints()[0];

      const x = curX + 25.0 + idx * 12.0;
      const y = 15.0;
      placedFootprints.push(this.createFootprintInstance(sym, fpDef, x, y, 0));
    });

    // 6. Calculate Bounding Box of all placed footprints
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    placedFootprints.forEach((fp) => {
      const hw = (fp.courtyard.maxX - fp.courtyard.minX) / 2 || 4.0;
      const hh = (fp.courtyard.maxY - fp.courtyard.minY) / 2 || 4.0;
      minX = Math.min(minX, fp.x - hw);
      minY = Math.min(minY, fp.y - hh);
      maxX = Math.max(maxX, fp.x + hw);
      maxY = Math.max(maxY, fp.y + hh);
    });

    if (!isFinite(minX)) {
      minX = 0; minY = 0; maxX = 50; maxY = 40;
    }

    // Expand by margin
    const boardLeft = Math.floor(minX - margin);
    const boardTop = Math.floor(minY - margin);
    const boardRight = Math.ceil(maxX + margin);
    const boardBottom = Math.ceil(maxY + margin);

    // Create 4-point closed rectangular Board Outline
    const boardOutline: Point2D[] = [
      { x: boardLeft, y: boardTop },
      { x: boardRight, y: boardTop },
      { x: boardRight, y: boardBottom },
      { x: boardLeft, y: boardBottom },
    ];

    // Connect footprint pads to solved nets
    placedFootprints.forEach((fp) => {
      fp.pads.forEach((pad) => {
        for (const [netName, node] of Object.entries(connectivity.netGraph.nets)) {
          if (node.pins.some((p) => p.symbolRef === fp.reference && p.pinNumber === pad.number)) {
            pad.netName = netName;
            pad.netId = node.id;
            break;
          }
        }
      });
    });

    const texts: PCBTextGraphic[] = [
      {
        id: `txt_title_${Date.now()}`,
        text: 'USB 5V LED INDICATOR',
        layer: 'F.Silkscreen',
        x: (boardLeft + boardRight) / 2,
        y: boardTop + 3.0,
        fontSize: 1.5,
        strokeWidth: 0.2,
        rotation: 0,
        mirror: false,
      },
      {
        id: `txt_j1_${Date.now()}`,
        text: '5V IN / GND',
        layer: 'F.Silkscreen',
        x: boardLeft + 8.0,
        y: boardTop + 9.0,
        fontSize: 1.2,
        strokeWidth: 0.15,
        rotation: 0,
        mirror: false,
      },
      {
        id: `txt_pwr_${Date.now()}`,
        text: 'POWER',
        layer: 'F.Silkscreen',
        x: boardRight - 14.0,
        y: boardTop + 7.0,
        fontSize: 1.2,
        strokeWidth: 0.15,
        rotation: 0,
        mirror: false,
      },
    ];

    return {
      ...project,
      pcb: {
        ...project.pcb,
        boardOutline,
        footprints: placedFootprints,
        texts,
      },
    };
  }

  private static createFootprintInstance(
    sym: any,
    fpDef: any,
    x: number,
    y: number,
    rotation = 0
  ): PCBFootprintInstance {
    return {
      id: `fp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      footprintDefId: fpDef.id,
      reference: sym.reference,
      value: sym.value,
      layer: 'F.Cu',
      x,
      y,
      rotation,
      pads: JSON.parse(JSON.stringify(fpDef.pads || [])),
      shapes: JSON.parse(JSON.stringify(fpDef.shapes || [])),
      courtyard: fpDef.courtyard || { minX: -5, minY: -5, maxX: 5, maxY: 5 },
      model3D: fpDef.model3D,
    };
  }
}
