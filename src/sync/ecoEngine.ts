/**
 * Apex EDA - Schematic ↔ PCB Synchronization (ECO Engine)
 * Forward and back-annotation engine with non-destructive delta reconciliation.
 */

import {
  ApexProject,
  PCBFootprintInstance,
  PCBPad,
  NetGraph,
  NetNode,
} from '../core/types';
import { BUILTIN_FOOTPRINTS } from '../library/footprintLibrary';
import { NetConnectivitySolver } from '../schematic/connectivity';

export interface ECOChange {
  type: 'ADD_FOOTPRINT' | 'REMOVE_FOOTPRINT' | 'CHANGE_FOOTPRINT' | 'CHANGE_VALUE' | 'UPDATE_NETS';
  reference: string;
  details: string;
  symbolId?: string;
  footprintId?: string;
}

export interface ECOReport {
  changes: ECOChange[];
  newFootprintsCount: number;
  removedFootprintsCount: number;
  updatedFootprintsCount: number;
  netChangesCount: number;
}

export class ECOEngine {
  public static generateReport(project: ApexProject): ECOReport {
    const changes: ECOChange[] = [];

    // 1. Extract all physical symbols from schematic
    const schematicPhysicalSymbols = project.schematic.sheets.flatMap((sheet) =>
      sheet.symbols.filter((sym) => !sym.reference.startsWith('#'))
    );

    const schematicRefMap = new Map(schematicPhysicalSymbols.map((s) => [s.reference, s]));
    const pcbRefMap = new Map(project.pcb.footprints.map((fp) => [fp.reference, fp]));

    // 2. Check for new symbols
    schematicPhysicalSymbols.forEach((sym) => {
      if (!pcbRefMap.has(sym.reference)) {
        changes.push({
          type: 'ADD_FOOTPRINT',
          reference: sym.reference,
          details: `Add component ${sym.reference} (${sym.value}) with footprint '${sym.footprint || 'None'}'`,
          symbolId: sym.id,
        });
      } else {
        const fp = pcbRefMap.get(sym.reference)!;
        if (fp.footprintDefId !== sym.footprint && sym.footprint) {
          changes.push({
            type: 'CHANGE_FOOTPRINT',
            reference: sym.reference,
            details: `Change footprint from '${fp.footprintDefId}' to '${sym.footprint}'`,
            symbolId: sym.id,
            footprintId: fp.id,
          });
        }
        if (fp.value !== sym.value) {
          changes.push({
            type: 'CHANGE_VALUE',
            reference: sym.reference,
            details: `Update value from '${fp.value}' to '${sym.value}'`,
            symbolId: sym.id,
            footprintId: fp.id,
          });
        }
      }
    });

    // 3. Check for removed symbols
    project.pcb.footprints.forEach((fp) => {
      if (!schematicRefMap.has(fp.reference)) {
        changes.push({
          type: 'REMOVE_FOOTPRINT',
          reference: fp.reference,
          details: `Remove unreferenced footprint ${fp.reference} from PCB`,
          footprintId: fp.id,
        });
      }
    });

    return {
      changes,
      newFootprintsCount: changes.filter((c) => c.type === 'ADD_FOOTPRINT').length,
      removedFootprintsCount: changes.filter((c) => c.type === 'REMOVE_FOOTPRINT').length,
      updatedFootprintsCount: changes.filter((c) => c.type === 'CHANGE_FOOTPRINT' || c.type === 'CHANGE_VALUE').length,
      netChangesCount: 0,
    };
  }

  public static applySync(project: ApexProject): ApexProject {
    // 1. Solve the complete schematic netlist
    const activeSheet = project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) || project.schematic.sheets[0];
    const solvedNetlist = NetConnectivitySolver.solveSheet(activeSheet);

    const schematicPhysicalSymbols = project.schematic.sheets.flatMap((sheet) =>
      sheet.symbols.filter((sym) => !sym.reference.startsWith('#'))
    );

    const schematicRefMap = new Map(schematicPhysicalSymbols.map((s) => [s.reference, s]));
    const currentFootprints = [...project.pcb.footprints];

    // Filter out deleted footprints
    const survivingFootprints = currentFootprints.filter((fp) => schematicRefMap.has(fp.reference));

    // Staging coordinates for new footprints
    let stagingX = 10;
    let stagingY = 65; // Place below 55mm board outline
    const spacing = 15;

    // Helper map of built-in footprint definitions
    const fpDefMap = new Map(BUILTIN_FOOTPRINTS.map((f) => [f.id, f]));

    schematicPhysicalSymbols.forEach((sym) => {
      const existingIdx = survivingFootprints.findIndex((fp) => fp.reference === sym.reference);

      if (existingIdx >= 0) {
        // Update existing footprint definition if changed
        const existingFp = survivingFootprints[existingIdx];
        if (sym.footprint && existingFp.footprintDefId !== sym.footprint) {
          const newDef = fpDefMap.get(sym.footprint);
          if (newDef) {
            survivingFootprints[existingIdx] = {
              ...existingFp,
              footprintDefId: newDef.id,
              value: sym.value,
              pads: JSON.parse(JSON.stringify(newDef.pads)),
              shapes: JSON.parse(JSON.stringify(newDef.shapes)),
              courtyard: { ...newDef.courtyard },
              model3D: newDef.model3D ? { ...newDef.model3D } : undefined,
            };
          }
        } else {
          survivingFootprints[existingIdx].value = sym.value;
        }
      } else {
        // Instantiate new footprint
        const targetFpId = sym.footprint || 'Resistor_SMD:R_0805_2012Metric';
        const fpDef = fpDefMap.get(targetFpId) || BUILTIN_FOOTPRINTS[0];

        const newFp: PCBFootprintInstance = {
          id: `pcb_${sym.reference.toLowerCase()}_${Date.now()}`,
          footprintDefId: fpDef.id,
          reference: sym.reference,
          value: sym.value,
          layer: 'F.Cu',
          x: stagingX,
          y: stagingY,
          rotation: 0,
          courtyard: { ...fpDef.courtyard },
          model3D: fpDef.model3D ? { ...fpDef.model3D } : undefined,
          shapes: JSON.parse(JSON.stringify(fpDef.shapes)),
          pads: JSON.parse(JSON.stringify(fpDef.pads)),
        };

        survivingFootprints.push(newFp);

        stagingX += spacing;
        if (stagingX > 70) {
          stagingX = 10;
          stagingY += spacing;
        }
      }
    });

    // 2. Reconcile Net Names on all PCB Pads
    // Build symbol pin -> net name lookup
    const pinToNetMap: Map<string, string> = new Map(); // "R1:1" -> "VBUS"
    Object.values(solvedNetlist.netGraph.nets).forEach((net) => {
      net.pins.forEach((pRef) => {
        pinToNetMap.set(`${pRef.symbolRef}:${pRef.pinNumber}`, net.name);
      });
    });

    // Update pads with net names
    survivingFootprints.forEach((fp) => {
      fp.pads.forEach((pad) => {
        const netName = pinToNetMap.get(`${fp.reference}:${pad.number}`) || pinToNetMap.get(`${fp.reference}:${pad.name}`);
        if (netName) {
          pad.netName = netName;
          pad.netId = `net_${netName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
        }
      });
    });

    // 3. Update NetGraph with PCB pad references for ratsnest
    const updatedNetGraph: NetGraph = { nets: {} };
    Object.entries(solvedNetlist.netGraph.nets).forEach(([netName, netNode]) => {
      const netPads: NetNode['pads'] = [];

      survivingFootprints.forEach((fp) => {
        fp.pads.forEach((pad) => {
          if (pad.netName === netName) {
            netPads.push({
              footprintId: fp.id,
              footprintRef: fp.reference,
              padNumber: pad.number,
            });
          }
        });
      });

      updatedNetGraph.nets[netName] = {
        ...netNode,
        pads: netPads,
      };
    });

    return {
      ...project,
      pcb: {
        ...project.pcb,
        footprints: survivingFootprints,
      },
      netGraph: updatedNetGraph,
    };
  }
}
