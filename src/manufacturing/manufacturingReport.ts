/**
 * FloZ EDA - Manufacturing Fabrication Report Generator
 * Calculates physical statistics, layer counts, drill histograms, and DFM compliance.
 */

import { ApexProject } from '../core/types';
import { DRCEngine } from '../drc/drcEngine';
import { ERCEngine } from '../erc/ercEngine';
import { RatsnestGenerator } from '../pcb/ratsnest';

export interface ManufacturingMetrics {
  projectName: string;
  version: string;
  units: string;
  boardWidthMm: number;
  boardHeightMm: number;
  boardAreaMm2: number;
  layerCount: number;
  componentCount: number;
  smdComponentCount: number;
  thtComponentCount: number;
  padCount: number;
  viaCount: number;
  trackSegmentCount: number;
  totalTrackLengthMm: number;
  netCount: number;
  drillCount: number;
  minTraceWidthMm: number;
  minClearanceMm: number;
  minDrillDiameterMm: number;
  copperZoneCount: number;
  silkscreenCount: number;
  unroutedNetsCount: number;
  drcErrorsCount: number;
  ercErrorsCount: number;
  isManufacturable: boolean;
  blockReason?: string;
}

export class ManufacturingReportGenerator {
  public static generateMetrics(project: ApexProject): ManufacturingMetrics {
    const pcb = project.pcb;

    // Board dimensions
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pcb.boardOutline.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });

    const boardWidth = isFinite(minX) ? Math.max(0, maxX - minX) : 0;
    const boardHeight = isFinite(minY) ? Math.max(0, maxY - minY) : 0;
    const boardArea = Math.round(boardWidth * boardHeight * 100) / 100;

    // Components & Pads
    let padCount = 0;
    let smdCount = 0;
    let thtCount = 0;
    let drillCount = pcb.vias.length;

    pcb.footprints.forEach((fp) => {
      let isTht = false;
      fp.pads.forEach((pad) => {
        padCount++;
        if (pad.type === 'through_hole') {
          isTht = true;
          drillCount++;
        }
      });
      if (isTht) thtCount++;
      else smdCount++;
    });

    // Tracks
    let totalTrackLength = 0;
    let minTraceWidth = Infinity;

    pcb.tracks.forEach((t) => {
      const len = Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
      totalTrackLength += len;
      if (t.width < minTraceWidth) minTraceWidth = t.width;
    });

    if (!isFinite(minTraceWidth)) minTraceWidth = project.designRules.minTrackWidth;

    // Drills
    let minDrill = Infinity;
    pcb.vias.forEach((v) => {
      if (v.drillDiameter < minDrill) minDrill = v.drillDiameter;
    });
    pcb.footprints.forEach((fp) => {
      fp.pads.forEach((p) => {
        if (p.drillDiameter && p.drillDiameter < minDrill) minDrill = p.drillDiameter;
      });
    });
    if (!isFinite(minDrill)) minDrill = project.designRules.minDrillDiameter;

    // Nets
    const netSet = new Set<string>();
    pcb.tracks.forEach((t) => t.netName && netSet.add(t.netName));
    pcb.footprints.forEach((fp) => fp.pads.forEach((p) => p.netName && netSet.add(p.netName)));

    // DRC / ERC / Unrouted
    const drcViolations = DRCEngine.run(project);
    const ercViolations = ERCEngine.run(project);
    const unrouted = RatsnestGenerator.generate(pcb);

    const drcErrors = drcViolations.filter((v) => v.severity === 'error');
    const ercErrors = ercViolations.filter((v) => v.severity === 'error');

    let isManufacturable = true;
    let blockReason: string | undefined = undefined;

    if (pcb.boardOutline.length < 3) {
      isManufacturable = false;
      blockReason = 'Board outline is missing or invalid (must be closed polygon with >= 3 points).';
    } else if (unrouted.length > 0) {
      isManufacturable = false;
      blockReason = `Design has ${unrouted.length} unrouted electrical connection(s).`;
    } else if (drcErrors.length > 0) {
      isManufacturable = false;
      blockReason = `Design contains ${drcErrors.length} critical DRC error(s): ${drcErrors[0].title}`;
    } else if (ercErrors.length > 0) {
      isManufacturable = false;
      blockReason = `Schematic contains ${ercErrors.length} critical ERC error(s): ${ercErrors[0].title}`;
    }

    return {
      projectName: project.metadata.name,
      version: project.metadata.version || '1.0.0',
      units: 'mm',
      boardWidthMm: Math.round(boardWidth * 100) / 100,
      boardHeightMm: Math.round(boardHeight * 100) / 100,
      boardAreaMm2: boardArea,
      layerCount: project.pcb.stackup?.length || 2,
      componentCount: pcb.footprints.length,
      smdComponentCount: smdCount,
      thtComponentCount: thtCount,
      padCount,
      viaCount: pcb.vias.length,
      trackSegmentCount: pcb.tracks.length,
      totalTrackLengthMm: Math.round(totalTrackLength * 10) / 10,
      netCount: netSet.size,
      drillCount,
      minTraceWidthMm: Math.round(minTraceWidth * 1000) / 1000,
      minClearanceMm: project.designRules.minClearance,
      minDrillDiameterMm: Math.round(minDrill * 1000) / 1000,
      copperZoneCount: pcb.zones.length,
      silkscreenCount: pcb.texts.length,
      unroutedNetsCount: unrouted.length,
      drcErrorsCount: drcErrors.length,
      ercErrorsCount: ercErrors.length,
      isManufacturable,
      blockReason,
    };
  }

  public static generateTextReport(project: ApexProject): string {
    const m = this.generateMetrics(project);
    const now = new Date().toISOString();

    return `=======================================================
FLOZ EDA — MANUFACTURING FABRICATION REPORT
=======================================================
Project Name:         ${m.projectName}
Revision:             ${m.version}
Date Generated:       ${now}
Units:                ${m.units}

1. BOARD SPECIFICATIONS
-------------------------------------------------------
Board Dimensions:     ${m.boardWidthMm.toFixed(2)} mm x ${m.boardHeightMm.toFixed(2)} mm
Total Board Area:     ${m.boardAreaMm2.toFixed(2)} mm²
Copper Layers:        ${m.layerCount} Layers (Top: F.Cu, Bottom: B.Cu)
Board Outline:        Closed Rectangular Polygon (Edge.Cuts)

2. COMPONENT & ASSEMBLY STATISTICS
-------------------------------------------------------
Total Components:     ${m.componentCount}
- SMD Parts:          ${m.smdComponentCount}
- Through-Hole Parts: ${m.thtComponentCount}
Total Pads:           ${m.padCount}
Total Vias:           ${m.viaCount}
Total Net Count:      ${m.netCount}

3. ROUTING & DRILL METRICS
-------------------------------------------------------
Track Segments:       ${m.trackSegmentCount}
Total Track Length:   ${m.totalTrackLengthMm.toFixed(1)} mm
Total Hole Count:     ${m.drillCount}
Minimum Trace Width:  ${m.minTraceWidthMm.toFixed(3)} mm
Minimum Clearance:    ${m.minClearanceMm.toFixed(3)} mm
Minimum Drill Hole:   ${m.minDrillDiameterMm.toFixed(3)} mm
Ground Copper Zones:  ${m.copperZoneCount} (F.Cu & B.Cu Floods)

4. DESIGN FOR MANUFACTURING (DFM) VALIDATION
-------------------------------------------------------
Unrouted Nets:        ${m.unroutedNetsCount}
Critical DRC Errors:  ${m.drcErrorsCount}
Critical ERC Errors:  ${m.ercErrorsCount}
Export Status:        ${m.isManufacturable ? 'PASSED (Ready for Fabrication)' : 'BLOCKED'}
${m.blockReason ? `Blocking Reason:      ${m.blockReason}\n` : ''}=======================================================
`;
  }
}
