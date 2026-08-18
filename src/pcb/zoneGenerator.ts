/**
 * FloZ EDA - Copper Zone & Ground Pour Generator
 * Generates continuous copper flood zones for GND nets on F.Cu / B.Cu layers with thermal reliefs.
 */

import { ApexProject, PCBZone, Point2D, PCBLayerId } from '../core/types';

export class ZoneGenerator {
  /**
   * Generates Top and Bottom GND copper pour zones covering the active board outline
   */
  public static createGroundPlanes(
    project: ApexProject,
    layers: PCBLayerId[] = ['F.Cu', 'B.Cu'],
    netName = 'GND'
  ): ApexProject {
    const pcb = project.pcb;
    if (pcb.boardOutline.length < 3) return project;

    const newZones: PCBZone[] = [...pcb.zones.filter((z) => z.netName !== netName)];

    layers.forEach((layer, idx) => {
      newZones.push({
        id: `zone_gnd_${layer}_${Date.now()}_${idx}`,
        netId: `net_${netName}`,
        netName,
        layer,
        priority: 1,
        clearance: 0.3,
        minWidth: 0.25,
        thermalReliefWidth: 0.3,
        thermalReliefGap: 0.3,
        points: JSON.parse(JSON.stringify(pcb.boardOutline)),
        isFilled: true,
        keepIslands: false,
      });
    });

    return {
      ...project,
      pcb: {
        ...project.pcb,
        zones: newZones,
      },
    };
  }
}
