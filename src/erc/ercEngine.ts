/**
 * Apex EDA - Electrical Rules Checker (ERC) Engine
 * Validates electrical graph integrity, pin-type compatibility matrix, and power connections.
 */

import {
  ApexProject,
  DiagnosticViolation,
  ERCConfiguration,
  PinElectricalType,
} from '../core/types';
import { NetConnectivitySolver } from '../schematic/connectivity';

// Pin Electrical Type Compatibility Matrix
// Matrix: [Driving/Source Pin] x [Connected Pin]
type PinMatrixResult = 'OK' | 'WARNING' | 'ERROR';

const PIN_MATRIX: Record<PinElectricalType, Record<PinElectricalType, PinMatrixResult>> = {
  input: {
    input: 'OK',
    output: 'OK',
    bidirectional: 'OK',
    tri_state: 'OK',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'WARNING',
    power_out: 'OK',
    open_collector: 'OK',
    open_emitter: 'OK',
    not_connected: 'WARNING',
  },
  output: {
    input: 'OK',
    output: 'ERROR', // Output to Output contention!
    bidirectional: 'WARNING',
    tri_state: 'WARNING',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'WARNING',
    power_out: 'ERROR', // Output connected to Power Output!
    open_collector: 'WARNING',
    open_emitter: 'WARNING',
    not_connected: 'WARNING',
  },
  bidirectional: {
    input: 'OK',
    output: 'WARNING',
    bidirectional: 'OK',
    tri_state: 'OK',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'WARNING',
    power_out: 'WARNING',
    open_collector: 'OK',
    open_emitter: 'OK',
    not_connected: 'WARNING',
  },
  tri_state: {
    input: 'OK',
    output: 'WARNING',
    bidirectional: 'OK',
    tri_state: 'OK',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'WARNING',
    power_out: 'ERROR',
    open_collector: 'OK',
    open_emitter: 'OK',
    not_connected: 'WARNING',
  },
  passive: {
    input: 'OK',
    output: 'OK',
    bidirectional: 'OK',
    tri_state: 'OK',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'OK',
    power_out: 'OK',
    open_collector: 'OK',
    open_emitter: 'OK',
    not_connected: 'OK',
  },
  power_in: {
    input: 'WARNING',
    output: 'WARNING',
    bidirectional: 'WARNING',
    tri_state: 'ERROR',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'OK',
    power_out: 'OK',
    open_collector: 'ERROR',
    open_emitter: 'ERROR',
    not_connected: 'ERROR',
  },
  power_out: {
    input: 'OK',
    output: 'ERROR',
    bidirectional: 'WARNING',
    tri_state: 'ERROR',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'OK',
    power_out: 'WARNING', // Dual power supplies without diodes
    open_collector: 'OK',
    open_emitter: 'OK',
    not_connected: 'WARNING',
  },
  open_collector: {
    input: 'OK',
    output: 'WARNING',
    bidirectional: 'OK',
    tri_state: 'OK',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'ERROR',
    power_out: 'OK',
    open_collector: 'OK', // Wired-AND is allowed
    open_emitter: 'WARNING',
    not_connected: 'WARNING',
  },
  open_emitter: {
    input: 'OK',
    output: 'WARNING',
    bidirectional: 'OK',
    tri_state: 'OK',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'ERROR',
    power_out: 'OK',
    open_collector: 'WARNING',
    open_emitter: 'OK',
    not_connected: 'WARNING',
  },
  unspecified: {
    input: 'OK',
    output: 'OK',
    bidirectional: 'OK',
    tri_state: 'OK',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'OK',
    power_out: 'OK',
    open_collector: 'OK',
    open_emitter: 'OK',
    not_connected: 'OK',
  },
  not_connected: {
    input: 'WARNING',
    output: 'WARNING',
    bidirectional: 'WARNING',
    tri_state: 'WARNING',
    passive: 'OK',
    unspecified: 'OK',
    power_in: 'ERROR',
    power_out: 'WARNING',
    open_collector: 'WARNING',
    open_emitter: 'WARNING',
    not_connected: 'OK',
  },
};

export class ERCEngine {
  public static run(project: ApexProject, config?: ERCConfiguration): DiagnosticViolation[] {
    const activeConfig = config || project.ercConfig;
    const violations: DiagnosticViolation[] = [];

    project.schematic.sheets.forEach((sheet) => {
      // 1. Solve electrical connectivity for this sheet
      const analysis = NetConnectivitySolver.solveSheet(sheet);

      // 2. Duplicate Reference Designator Check
      if (activeConfig.checkDuplicateReferences) {
        const unitMap: Map<string, string[]> = new Map();
        sheet.symbols.forEach((sym) => {
          if (!sym.reference.startsWith('#')) {
            const key = `${sym.reference}#u${sym.unit || 1}`;
            if (!unitMap.has(key)) unitMap.set(key, []);
            unitMap.get(key)!.push(sym.id);
          }
        });

        unitMap.forEach((ids, key) => {
          if (ids.length > 1) {
            const sym = sheet.symbols.find((s) => s.id === ids[0])!;
            const unitSuffix = sym.unitSuffix ? ` (Unit ${sym.unitSuffix})` : (sym.unit && sym.unit > 1 ? ` (Unit ${sym.unit})` : '');
            violations.push({
              id: `erc_dup_${key}`,
              code: 'ERC001',
              severity: 'error',
              source: 'ERC',
              title: `Duplicate Reference '${sym.reference}'${unitSuffix}`,
              description: `Multiple component instances share reference '${sym.reference}'${unitSuffix}. Run auto-annotation to renumber.`,
              sheetId: sheet.id,
              x: sym.x,
              y: sym.y,
              objectIds: ids,
            });
          }
        });
      }

      // 3. Unconnected Pins Check
      if (activeConfig.checkUnconnectedPins) {
        analysis.unconnectedPins.forEach((upin) => {
          violations.push({
            id: `erc_unconn_${upin.symbolId}_${upin.pinNumber}`,
            code: 'ERC002',
            severity: 'warning',
            source: 'ERC',
            title: `Unconnected Pin ${upin.symbolRef}.${upin.pinNumber} (${upin.pinName})`,
            description: `Pin ${upin.pinNumber} on ${upin.symbolRef} has no wire, label, or net connection.`,
            sheetId: sheet.id,
            x: upin.point.x,
            y: upin.point.y,
            objectIds: [upin.symbolId],
          });
        });
      }

      // 4. Pin-to-Pin Compatibility Matrix & Power Driver Check
      if (activeConfig.checkPinTypeConflicts || activeConfig.checkMissingPowerDrivers) {
        // Collect all pins in each net
        const symbolLookup = new Map(sheet.symbols.map((s) => [s.id, s]));

        Object.values(analysis.netGraph.nets).forEach((net) => {
          const resolvedPins: Array<{
            symRef: string;
            pinNum: string;
            pinName: string;
            type: PinElectricalType;
            x: number;
            y: number;
            symbolId: string;
          }> = [];

          net.pins.forEach((pRef) => {
            const sym = symbolLookup.get(pRef.symbolId);
            if (sym) {
              const pin = sym.pins.find((p) => p.number === pRef.pinNumber);
              if (pin) {
                resolvedPins.push({
                  symRef: sym.reference,
                  pinNum: pin.number,
                  pinName: pin.name,
                  type: pin.electricalType,
                  x: sym.x + pin.x,
                  y: sym.y + pin.y,
                  symbolId: sym.id,
                });
              }
            }
          });

          // Check pairs
          if (activeConfig.checkPinTypeConflicts) {
            for (let i = 0; i < resolvedPins.length; i++) {
              for (let j = i + 1; j < resolvedPins.length; j++) {
                const p1 = resolvedPins[i];
                const p2 = resolvedPins[j];
                const matrixResult = PIN_MATRIX[p1.type]?.[p2.type] || 'OK';

                if (matrixResult === 'ERROR' || matrixResult === 'WARNING') {
                  violations.push({
                    id: `erc_conflict_${p1.symRef}_${p2.symRef}_${i}_${j}`,
                    code: matrixResult === 'ERROR' ? 'ERC003' : 'ERC004',
                    severity: matrixResult === 'ERROR' ? 'error' : 'warning',
                    source: 'ERC',
                    title: `Pin Conflict on Net '${net.name}'`,
                    description: `Pin ${p1.symRef}.${p1.pinNum} (${p1.type}) connected to ${p2.symRef}.${p2.pinNum} (${p2.type}).`,
                    sheetId: sheet.id,
                    x: p1.x,
                    y: p1.y,
                    objectIds: [p1.symbolId, p2.symbolId],
                  });
                }
              }
            }
          }

          // Check Power Input without Power Output driver
          if (activeConfig.checkMissingPowerDrivers) {
            const hasPowerIn = resolvedPins.some((p) => p.type === 'power_in');
            const hasPowerOut = resolvedPins.some((p) => p.type === 'power_out');
            const isPowerRail = ['GND', 'VCC', 'VDD', 'VSS', '+3.3V', '+5V', '+12V', 'VBUS', 'VBAT'].includes(net.name);

            if (hasPowerIn && !hasPowerOut && !isPowerRail) {
              const firstPin = resolvedPins.find((p) => p.type === 'power_in')!;
              violations.push({
                id: `erc_no_pwr_driver_${net.name}`,
                code: 'ERC005',
                severity: 'warning',
                source: 'ERC',
                title: `Missing Power Driver on Net '${net.name}'`,
                description: `Net '${net.name}' has Power Input pins but no Power Output source or PWR_FLAG.`,
                sheetId: sheet.id,
                x: firstPin.x,
                y: firstPin.y,
                objectIds: [firstPin.symbolId],
              });
            }
          }
        });
      }

      // 5. Missing Footprints on physical components
      sheet.symbols.forEach((sym) => {
        if (!sym.reference.startsWith('#') && (!sym.footprint || sym.footprint.trim() === '')) {
          violations.push({
            id: `erc_missing_fp_${sym.id}`,
            code: 'ERC006',
            severity: 'warning',
            source: 'ERC',
            title: `Unassigned Footprint for '${sym.reference}'`,
            description: `Component ${sym.reference} (${sym.value}) has no PCB footprint assigned.`,
            sheetId: sheet.id,
            x: sym.x,
            y: sym.y,
            objectIds: [sym.id],
          });
        }
      });
    });

    return violations;
  }
}
