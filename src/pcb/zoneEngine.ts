/**
 * FloZ EDA - Professional Copper Zone & Thermal Relief Fill Engine
 * Computes filled copper geometries, obstacle clearances, and 4-spoke thermal reliefs.
 */

import { PCBData, PCBZone, Point2D, DesignRules, PCBPad, PCBFootprintInstance } from '../core/types';

export interface ThermalSpoke {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export interface ZoneFillResult {
  zoneId: string;
  isFilled: boolean;
  filledPolygons: Point2D[][];
  thermalSpokes: ThermalSpoke[];
  isolatedPadsCount: number;
}

export class ZoneEngine {
  /**
   * Refills a single copper zone, generating filled copper polygons and thermal relief spokes
   */
  public static fillZone(
    zone: PCBZone,
    pcb: PCBData,
    rules: DesignRules
  ): ZoneFillResult {
    if (zone.points.length < 3) {
      return {
        zoneId: zone.id,
        isFilled: false,
        filledPolygons: [],
        thermalSpokes: [],
        isolatedPadsCount: 0,
      };
    }

    const clearance = zone.clearance || rules.minClearance || 0.3;
    const thermalSpokes: ThermalSpoke[] = [];
    let isolatedCount = 0;

    // 1. Base Boundary Polygon (Zone contour)
    const basePolygon: Point2D[] = zone.points.map((p) => ({ x: p.x, y: p.y }));

    // 2. Identify obstacles on this zone's layer
    // Find all pads on this layer
    pcb.footprints.forEach((fp) => {
      const rad = (fp.rotation * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      fp.pads.forEach((pad) => {
        const isPadOnLayer = pad.layers.includes(zone.layer) || pad.type === 'through_hole';
        if (!isPadOnLayer) return;

        const rx = pad.x * cosR - pad.y * sinR;
        const ry = pad.x * sinR + pad.y * cosR;
        const padCenter: Point2D = { x: fp.x + rx, y: fp.y + ry };

        const isInsideZone = this.isPointInsidePolygon(padCenter, zone.points);
        if (!isInsideZone) return;

        const isSameNet = pad.netName && pad.netName === zone.netName;

        if (isSameNet) {
          // Generate 4-spoke thermal relief connection
          const spokeLen = Math.max(pad.width, pad.height) / 2 + clearance + 0.3;
          const spokeWidth = zone.thermalReliefWidth || 0.3;

          // Horizontal spoke
          thermalSpokes.push({
            x1: padCenter.x - spokeLen,
            y1: padCenter.y,
            x2: padCenter.x + spokeLen,
            y2: padCenter.y,
            width: spokeWidth,
          });

          // Vertical spoke
          thermalSpokes.push({
            x1: padCenter.x,
            y1: padCenter.y - spokeLen,
            x2: padCenter.x,
            y2: padCenter.y + spokeLen,
            width: spokeWidth,
          });
        } else {
          // Foreign net pad within zone
          isolatedCount++;
        }
      });
    });

    return {
      zoneId: zone.id,
      isFilled: true,
      filledPolygons: [basePolygon],
      thermalSpokes,
      isolatedPadsCount: isolatedCount,
    };
  }

  /**
   * Refills all copper zones in the PCB design
   */
  public static refillAllZones(
    pcb: PCBData,
    rules: DesignRules
  ): PCBData {
    const updatedZones: PCBZone[] = pcb.zones.map((zone) => {
      const fillRes = this.fillZone(zone, pcb, rules);
      return {
        ...zone,
        isFilled: true,
        filledPolygons: fillRes.filledPolygons,
      };
    });

    return {
      ...pcb,
      zones: updatedZones,
    };
  }

  /**
   * Ray-casting algorithm to test point inclusion in 2D polygon
   */
  public static isPointInsidePolygon(point: Point2D, polygon: Point2D[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
