/**
 * Apex EDA - Design Rules Checker (DRC) Engine
 * Comprehensive spatial and electrical clearance rule validation for PCB designs.
 */

import {
  ApexProject,
  DiagnosticViolation,
  DRCConfiguration,
  Point2D,
  PCBTrackSegment,
} from '../core/types';
import { RatsnestGenerator } from '../pcb/ratsnest';

export const DEFAULT_DRC_CONFIG: DRCConfiguration = {
  checkClearances: true,
  checkTrackWidths: true,
  checkViaHoles: true,
  checkBoardEdge: true,
  checkCourtyardCollisions: true,
  checkUnconnectedNets: true,
  checkSilkscreenOverPads: true,
  checkKeepouts: true,
};

export class DRCEngine {
  public static run(project: ApexProject, config?: DRCConfiguration): DiagnosticViolation[] {
    const activeConfig = config || project.drcConfig || DEFAULT_DRC_CONFIG;
    const rules = project.designRules;
    const pcb = project.pcb;
    const violations: DiagnosticViolation[] = [];

    // 1. Minimum Track Width Check
    if (activeConfig.checkTrackWidths) {
      pcb.tracks.forEach((track) => {
        const netClass = rules.customNetClasses[track.netName] || rules.defaultNetClass;
        const minAllowedWidth = Math.max(rules.minTrackWidth, netClass.trackWidth * 0.8);

        if (track.width < minAllowedWidth - 1e-4) {
          violations.push({
            id: `drc_width_${track.id}`,
            code: 'DRC001',
            severity: 'error',
            source: 'DRC',
            title: `Track Width Violation on '${track.netName}'`,
            description: `Track width ${track.width.toFixed(2)}mm is smaller than allowed minimum ${minAllowedWidth.toFixed(2)}mm.`,
            x: (track.x1 + track.x2) / 2,
            y: (track.y1 + track.y2) / 2,
            objectIds: [track.id],
          });
        }
      });
    }

    // 2. Minimum Via Diameter & Drill Size Check
    if (activeConfig.checkViaHoles) {
      pcb.vias.forEach((via) => {
        if (via.diameter < rules.minViaDiameter - 1e-4) {
          violations.push({
            id: `drc_via_dia_${via.id}`,
            code: 'DRC002',
            severity: 'error',
            source: 'DRC',
            title: `Via Diameter Violation on '${via.netName}'`,
            description: `Via diameter ${via.diameter.toFixed(2)}mm is below minimum ${rules.minViaDiameter.toFixed(2)}mm.`,
            x: via.x,
            y: via.y,
            objectIds: [via.id],
          });
        }

        if (via.drillDiameter < rules.minDrillDiameter - 1e-4) {
          violations.push({
            id: `drc_drill_dia_${via.id}`,
            code: 'DRC003',
            severity: 'error',
            source: 'DRC',
            title: `Drill Diameter Violation on '${via.netName}'`,
            description: `Via drill hole ${via.drillDiameter.toFixed(2)}mm is below minimum ${rules.minDrillDiameter.toFixed(2)}mm.`,
            x: via.x,
            y: via.y,
            objectIds: [via.id],
          });
        }
      });
    }

    // 3. Copper-to-Copper Clearance Check (Pads to Tracks of different nets)
    if (activeConfig.checkClearances) {
      const distPointToSegment = (p: Point2D, s: PCBTrackSegment): number => {
        const l2 = (s.x2 - s.x1) ** 2 + (s.y2 - s.y1) ** 2;
        if (l2 === 0) return Math.hypot(p.x - s.x1, p.y - s.y1);
        let t = ((p.x - s.x1) * (s.x2 - s.x1) + (p.y - s.y1) * (s.y2 - s.y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = s.x1 + t * (s.x2 - s.x1);
        const projY = s.y1 + t * (s.y2 - s.y1);
        return Math.hypot(p.x - projX, p.y - projY);
      };

      pcb.footprints.forEach((fp) => {
        const rad = (fp.rotation * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);

        fp.pads.forEach((pad) => {
          if (!pad.netName) return;

          const rx = pad.x * cosR - pad.y * sinR;
          const ry = pad.x * sinR + pad.y * cosR;
          const padCenter: Point2D = { x: fp.x + rx, y: fp.y + ry };
          const padRadius = Math.max(pad.width, pad.height) / 2;

          pcb.tracks.forEach((track) => {
            if (track.netName === pad.netName || !pad.layers.includes(track.layer)) return;

            const dist = distPointToSegment(padCenter, track);
            const netClass = rules.customNetClasses[track.netName] || rules.defaultNetClass;
            const reqClearance = netClass.clearance + track.width / 2 + padRadius;

            if (dist < reqClearance - 1e-4) {
              violations.push({
                id: `drc_clr_pad_trk_${pad.id}_${track.id}`,
                code: 'DRC004',
                severity: 'error',
                source: 'DRC',
                title: `Clearance Violation between Pad ${fp.reference}.${pad.number} and Track '${track.netName}'`,
                description: `Clearance is ${(dist - track.width / 2 - padRadius).toFixed(3)}mm, expected min ${netClass.clearance.toFixed(3)}mm.`,
                x: padCenter.x,
                y: padCenter.y,
                objectIds: [fp.id, track.id],
              });
            }
          });
        });
      });
    }

    // 4. Courtyard Collision Check (Footprint package overlap)
    if (activeConfig.checkCourtyardCollisions) {
      for (let i = 0; i < pcb.footprints.length; i++) {
        for (let j = i + 1; j < pcb.footprints.length; j++) {
          const fp1 = pcb.footprints[i];
          const fp2 = pcb.footprints[j];

          // Check if on same board layer (e.g. F.Cu vs B.Cu)
          if (fp1.layer !== fp2.layer) continue;

          // Simple bounding box intersection of courtyards
          const b1 = {
            minX: fp1.x + fp1.courtyard.minX,
            maxX: fp1.x + fp1.courtyard.maxX,
            minY: fp1.y + fp1.courtyard.minY,
            maxY: fp1.y + fp1.courtyard.maxY,
          };
          const b2 = {
            minX: fp2.x + fp2.courtyard.minX,
            maxX: fp2.x + fp2.courtyard.maxX,
            minY: fp2.y + fp2.courtyard.minY,
            maxY: fp2.y + fp2.courtyard.maxY,
          };

          const overlap = !(b1.maxX < b2.minX || b1.minX > b2.maxX || b1.maxY < b2.minY || b1.minY > b2.maxY);

          if (overlap) {
            violations.push({
              id: `drc_courtyard_${fp1.id}_${fp2.id}`,
              code: 'DRC005',
              severity: 'error',
              source: 'DRC',
              title: `Courtyard Collision between ${fp1.reference} and ${fp2.reference}`,
              description: `Component packages physically overlap each other on ${fp1.layer}.`,
              x: (fp1.x + fp2.x) / 2,
              y: (fp1.y + fp2.y) / 2,
              objectIds: [fp1.id, fp2.id],
            });
          }
        }
      }
    }

    // 5. Board Edge Clearance Check
    if (activeConfig.checkBoardEdge && pcb.boardOutline.length >= 3) {
      // Find min/max bounds of board outline
      let minBx = Infinity, maxBx = -Infinity, minBy = Infinity, maxBy = -Infinity;
      pcb.boardOutline.forEach((p) => {
        if (p.x < minBx) minBx = p.x;
        if (p.x > maxBx) maxBx = p.x;
        if (p.y < minBy) minBy = p.y;
        if (p.y > maxBy) maxBy = p.y;
      });

      const edgeMargin = rules.boardEdgeClearance;

      pcb.tracks.forEach((t) => {
        const outOfBounds =
          t.x1 < minBx + edgeMargin ||
          t.x2 < minBx + edgeMargin ||
          t.x1 > maxBx - edgeMargin ||
          t.x2 > maxBx - edgeMargin ||
          t.y1 < minBy + edgeMargin ||
          t.y2 < minBy + edgeMargin ||
          t.y1 > maxBy - edgeMargin ||
          t.y2 > maxBy - edgeMargin;

        if (outOfBounds) {
          violations.push({
            id: `drc_edge_${t.id}`,
            code: 'DRC006',
            severity: 'warning',
            source: 'DRC',
            title: `Copper Track too close to Board Edge`,
            description: `Track '${t.netName}' violates minimum ${edgeMargin}mm clearance to Edge.Cuts.`,
            x: (t.x1 + t.x2) / 2,
            y: (t.y1 + t.y2) / 2,
            objectIds: [t.id],
          });
        }
      });
    }

    // 6. Unconnected Nets (Ratsnest Airwires) Check
    if (activeConfig.checkUnconnectedNets) {
      const unroutedLines = RatsnestGenerator.generate(pcb);
      unroutedLines.forEach((rat) => {
        violations.push({
          id: `drc_unconnected_${rat.id}`,
          code: 'DRC007',
          severity: 'warning',
          source: 'DRC',
          title: `Unconnected Net Segment '${rat.netName}'`,
          description: `Missing routed copper trace between pads on net '${rat.netName}'.`,
          x: (rat.x1 + rat.x2) / 2,
          y: (rat.y1 + rat.y2) / 2,
          objectIds: [],
        });
      });
    }

    // 7. Hole-to-Hole Drill Clearance Check
    const minHoleClearance = rules.minClearance || 0.25;
    for (let i = 0; i < pcb.vias.length; i++) {
      for (let j = i + 1; j < pcb.vias.length; j++) {
        const v1 = pcb.vias[i];
        const v2 = pcb.vias[j];
        const dist = Math.hypot(v2.x - v1.x, v2.y - v1.y);
        const reqDist = (v1.drillDiameter + v2.drillDiameter) / 2 + minHoleClearance;
        if (dist < reqDist) {
          violations.push({
            id: `drc_hole_clr_${v1.id}_${v2.id}`,
            code: 'DRC008',
            severity: 'error',
            source: 'DRC',
            title: `Hole-to-Hole Drill Clearance Violation`,
            description: `Via drill hole distance ${(dist - (v1.drillDiameter + v2.drillDiameter) / 2).toFixed(3)}mm is below minimum ${minHoleClearance}mm.`,
            x: (v1.x + v2.x) / 2,
            y: (v1.y + v2.y) / 2,
            objectIds: [v1.id, v2.id],
          });
        }
      }
    }

    return violations;
  }
}
