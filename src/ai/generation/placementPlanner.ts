/**
 * FloZ ECA - Placement Planner
 * Engineering-aware layout algorithm allocating non-overlapping, grid-aligned functional domains.
 */

import { Point2D, SchematicSymbolInstance } from '../../core/types';
import { PlannedComponent } from './types';

export class PlacementPlanner {
  private static snapToGrid(val: number, step = 5.0): number {
    return Math.round(val / step) * step;
  }

  /**
   * Plans clean, non-overlapping world coordinates for each component in the design plan
   */
  public static planPlacements(
    plannedComponents: PlannedComponent[],
    existingSymbols: SchematicSymbolInstance[]
  ): Map<string, Point2D> {
    const placements = new Map<string, Point2D>();

    // Baseline domain anchor coordinates (mm)
    const domainAnchors: Record<string, Point2D> = {
      connector: { x: 50, y: 70 },
      protection: { x: 75, y: 70 },
      regulator: { x: 105, y: 70 },
      mcu: { x: 175, y: 95 },
      sensor: { x: 265, y: 95 },
      power_symbol: { x: 50, y: 30 },
      passives: { x: 105, y: 120 },
    };

    // Track occupied bounding locations to prevent overlapping
    const occupied: Array<{ x: number; y: number; r: number }> = existingSymbols.map((s) => ({
      x: s.x,
      y: s.y,
      r: 25,
    }));

    // Group components by domain
    const byDomain = new Map<string, PlannedComponent[]>();
    for (const comp of plannedComponents) {
      const d = comp.domain || 'passives';
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d)!.push(comp);
    }

    // 1. Place Primary Active Components (Connectors, Regulators, MCUs, Sensors)
    for (const [domain, comps] of byDomain.entries()) {
      if (domain === 'passives') continue;

      const anchor = domainAnchors[domain] || { x: 150, y: 100 };
      comps.forEach((comp, idx) => {
        let posX = this.snapToGrid(anchor.x + idx * 35);
        let posY = this.snapToGrid(anchor.y);

        // Nudge if occupied
        while (occupied.some((occ) => Math.hypot(occ.x - posX, occ.y - posY) < 25)) {
          posX = this.snapToGrid(posX + 10);
          posY = this.snapToGrid(posY + 10);
        }

        placements.set(comp.id, { x: posX, y: posY });
        occupied.push({ x: posX, y: posY, r: 25 });
      });
    }

    // 2. Place Associated Passives (Decoupling caps, pull-ups, filter caps)
    const passives = byDomain.get('passives') || [];

    // Special layout for voltage divider pair (r1 / r2)
    const isVoltageDivider = passives.length === 2 && passives.some((p) => p.id === 'r1') && passives.some((p) => p.id === 'r2');
    if (isVoltageDivider) {
      let baseX = 140;
      let baseY = 80;
      while (occupied.some((occ) => Math.hypot(occ.x - baseX, occ.y - baseY) < 25 || Math.hypot(occ.x - baseX, occ.y - (baseY + 30)) < 25)) {
        baseX = this.snapToGrid(baseX + 40);
        if (baseX > 320) {
          baseX = 80;
          baseY = this.snapToGrid(baseY + 55);
        }
      }
      const p1 = { x: baseX, y: baseY };
      const p2 = { x: baseX, y: baseY + 30 };
      placements.set('r1', p1);
      placements.set('r2', p2);
      return placements;
    }

    let passiveRow = 0;
    passives.forEach((comp) => {
      let targetPos: Point2D | undefined;
      if (comp.targetRef) {
        targetPos = placements.get(comp.targetRef);
      }

      let posX: number;
      let posY: number;

      if (targetPos) {
        // Place adjacent to target component
        posX = this.snapToGrid(targetPos.x + 25);
        posY = this.snapToGrid(targetPos.y - 15 + (passiveRow % 3) * 20);
        passiveRow++;
      } else {
        posX = this.snapToGrid(domainAnchors.passives.x + (passiveRow % 4) * 25);
        posY = this.snapToGrid(domainAnchors.passives.y + Math.floor(passiveRow / 4) * 25);
        passiveRow++;
      }

      while (occupied.some((occ) => Math.hypot(occ.x - posX, occ.y - posY) < 18)) {
        posX = this.snapToGrid(posX + 10);
      }

      placements.set(comp.id, { x: posX, y: posY });
      occupied.push({ x: posX, y: posY, r: 18 });
    });

    return placements;
  }
}
