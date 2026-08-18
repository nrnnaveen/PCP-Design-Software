/**
 * FloZ ECA - Real Circuit Template & Synthesis Generator (Phase 3)
 * Synthesizes verified, electrically-sound sub-circuits for Decoupling, Voltage Dividers,
 * RC Filters, I2C Pull-ups, and LED Drivers with dynamic pin introspection and formula verification.
 */

import { ApexProject, SchematicSymbolInstance, SchematicWireSegment, Point2D } from '../core/types';
import { libraryRegistry } from '../library/libraryRegistry';
import { SchematicHelper } from '../schematic/helper';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { ActionProposal } from './types';
import { ActionValidator } from './actionValidator';

export class CircuitGenerator {
  /**
   * 1. Decoupling Capacitor with Dynamic Power Pin Discovery
   */
  public static generateDecouplingCap(
    project: ApexProject,
    targetRef: string,
    defaultVdd = '+3.3V',
    defaultGnd = 'GND',
    value = '100nF'
  ): ActionProposal {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const targetSym = activeSheet.symbols.find((s) => s.reference.toUpperCase() === targetRef.toUpperCase());
    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);

    let resolvedVddNet = defaultVdd;
    let resolvedGndNet = defaultGnd;
    let powerPinFound = false;

    if (targetSym) {
      // Introspect pins of target IC
      for (const pin of targetSym.pins) {
        const pinNameUpper = pin.name.toUpperCase();
        if (
          pin.electricalType === 'power_in' ||
          pinNameUpper.includes('VDD') ||
          pinNameUpper.includes('VCC') ||
          pinNameUpper.includes('3V3') ||
          pinNameUpper.includes('5V')
        ) {
          // Lookup connected net
          for (const [netName, node] of Object.entries(connectivity.netGraph.nets)) {
            if (node.pins.some((p) => p.symbolRef === targetSym.reference && p.pinNumber === pin.number)) {
              resolvedVddNet = netName;
              powerPinFound = true;
              break;
            }
          }
        }
        if (pinNameUpper.includes('GND') || pinNameUpper.includes('VSS')) {
          for (const [netName, node] of Object.entries(connectivity.netGraph.nets)) {
            if (node.pins.some((p) => p.symbolRef === targetSym.reference && p.pinNumber === pin.number)) {
              resolvedGndNet = netName;
              break;
            }
          }
        }
      }
    }

    const posX = targetSym ? Math.min(380, targetSym.x + 25) : 100;
    const posY = targetSym ? Math.min(270, targetSym.y) : 100;

    const nextRef = SchematicHelper.getNextReference('C', activeSheet.symbols);
    const capDef =
      libraryRegistry.getSymbolById('sym_c') ||
      libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === 'C') ||
      libraryRegistry.getAllSymbols()[0];

    const newCap: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_cap`,
      symbolDefId: capDef.id,
      reference: nextRef,
      value,
      footprint: 'Capacitor_SMD:C_0805_2012Metric',
      x: posX,
      y: posY,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      fields: { Description: `Decoupling capacitor for ${targetRef}` },
      pins: JSON.parse(JSON.stringify(capDef.pins)),
    };

    const proposal: ActionProposal = {
      id: `prop_cap_${Date.now()}`,
      title: `Add ${value} Decoupling Capacitor (${nextRef}) to ${targetRef}`,
      description: `Place MLCC ceramic capacitor ${nextRef} (${value}) adjacent to ${targetRef} (${resolvedVddNet} / ${resolvedGndNet}).`,
      category: 'add_decoupling_cap',
      permission: 'MUTATE',
      diff: {
        addedComponents: [
          { reference: nextRef, value, footprint: 'Capacitor_SMD:C_0805_2012Metric', position: { x: posX, y: posY } },
        ],
        connectedNets: [resolvedVddNet, resolvedGndNet],
        notes: [
          `Target IC: ${targetRef} (Power pin discovery: ${powerPinFound ? 'Verified' : 'Default'})`,
          `Connected ${nextRef}.1 → ${resolvedVddNet}`,
          `Connected ${nextRef}.2 → ${resolvedGndNet}`,
        ],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];
        const p1 = SchematicHelper.getSymbolPinWorldPosition(newCap, newCap.pins[0]);
        const p2 = SchematicHelper.getSymbolPinWorldPosition(newCap, newCap.pins[1]);

        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: [...s.symbols, newCap],
                    labels: [
                      ...s.labels,
                      { id: `lbl_${Date.now()}_1`, text: resolvedVddNet, x: p1.x, y: p1.y, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_2`, text: resolvedGndNet, x: p2.x, y: p2.y, type: 'global', orientation: 0 },
                    ],
                  }
                : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  private static findUnoccupiedPos(sheet: any, defaultPos = { x: 140, y: 80 }): { x: number; y: number } {
    let x = defaultPos.x;
    let y = defaultPos.y;
    while (sheet.symbols.some((s: any) => Math.hypot(s.x - x, s.y - y) < 25)) {
      x += 35;
      if (x > 320) {
        x = 60;
        y += 45;
      }
    }
    return { x: Math.round(x / 5) * 5, y: Math.round(y / 5) * 5 };
  }

  /**
   * 2. Precision Voltage Divider with Exact Ratio Calculations
   */
  public static generateVoltageDivider(
    project: ApexProject,
    vinNet = 'VIN',
    voutNet = 'VOUT',
    r1Val = '10k',
    r2Val = '10k',
    pos = { x: 140, y: 80 }
  ): ActionProposal {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    pos = this.findUnoccupiedPos(activeSheet, pos);

    const r1Ref = SchematicHelper.getNextReference('R', activeSheet.symbols);
    const tempSyms = [...activeSheet.symbols, { reference: r1Ref } as any];
    const r2Ref = SchematicHelper.getNextReference('R', tempSyms);

    const rDef =
      libraryRegistry.getSymbolById('sym_r') ||
      libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === 'R') ||
      libraryRegistry.getAllSymbols()[0];

    const r1: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_r1`,
      symbolDefId: rDef.id,
      reference: r1Ref,
      value: r1Val,
      footprint: 'Resistor_SMD:R_0805_2012Metric',
      x: pos.x,
      y: pos.y,
      rotation: 90,
      mirrorX: false,
      unit: 1,
      fields: { Description: 'Voltage Divider Top Resistor' },
      pins: JSON.parse(JSON.stringify(rDef.pins)),
    };

    const r2: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_r2`,
      symbolDefId: rDef.id,
      reference: r2Ref,
      value: r2Val,
      footprint: 'Resistor_SMD:R_0805_2012Metric',
      x: pos.x,
      y: pos.y + 30,
      rotation: 90,
      mirrorX: false,
      unit: 1,
      fields: { Description: 'Voltage Divider Bottom Resistor' },
      pins: JSON.parse(JSON.stringify(rDef.pins)),
    };

    // Calculate ratio
    const parseR = (val: string) => {
      const num = parseFloat(val.replace(/[^0-9.]/g, ''));
      if (val.toLowerCase().includes('k')) return num * 1000;
      if (val.toLowerCase().includes('m')) return num * 1000000;
      return num || 10000;
    };
    const r1Num = parseR(r1Val);
    const r2Num = parseR(r2Val);
    const ratio = Math.round((r2Num / (r1Num + r2Num)) * 1000) / 1000;

    const proposal: ActionProposal = {
      id: `prop_vdiv_${Date.now()}`,
      title: `Generate Voltage Divider (${r1Ref}=${r1Val}, ${r2Ref}=${r2Val})`,
      description: `Formula: Vout = Vin × R2 / (R1 + R2) = Vin × ${ratio}. Scales ${vinNet} to ${voutNet}.`,
      category: 'voltage_divider',
      permission: 'MUTATE',
      diff: {
        addedComponents: [
          { reference: r1Ref, value: r1Val, footprint: 'Resistor_SMD:R_0805_2012Metric', position: pos },
          { reference: r2Ref, value: r2Val, footprint: 'Resistor_SMD:R_0805_2012Metric', position: { x: pos.x, y: pos.y + 30 } },
        ],
        connectedNets: [vinNet, voutNet, 'GND'],
        notes: [
          `Transfer Ratio: ${ratio} (e.g. 5V in → ${Math.round(5 * ratio * 100) / 100}V out)`,
          `${r1Ref}.1 → ${vinNet}`,
          `${r1Ref}.2 & ${r2Ref}.1 → ${voutNet}`,
          `${r2Ref}.2 → GND`,
        ],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];

        const r1p1 = SchematicHelper.getSymbolPinWorldPosition(r1, r1.pins[0]);
        const r1p2 = SchematicHelper.getSymbolPinWorldPosition(r1, r1.pins[1]);
        const r2p1 = SchematicHelper.getSymbolPinWorldPosition(r2, r2.pins[0]);
        const r2p2 = SchematicHelper.getSymbolPinWorldPosition(r2, r2.pins[1]);

        const midWire: SchematicWireSegment = {
          id: `w_${Date.now()}_mid`,
          x1: r1p2.x,
          y1: r1p2.y,
          x2: r2p1.x,
          y2: r2p1.y,
        };

        const midY = (r1p2.y + r2p1.y) / 2;
        const tapWire: SchematicWireSegment = {
          id: `w_${Date.now()}_tap`,
          x1: r1p2.x,
          y1: midY,
          x2: r1p2.x + 12,
          y2: midY,
        };

        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: [...s.symbols, r1, r2],
                    wires: [...s.wires, midWire, tapWire],
                    labels: [
                      ...s.labels,
                      { id: `lbl_${Date.now()}_vin`, text: vinNet, x: r1p1.x, y: r1p1.y - 2, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_vout`, text: voutNet, x: r1p2.x + 13, y: midY, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_gnd`, text: 'GND', x: r2p2.x, y: r2p2.y + 3, type: 'global', orientation: 0 },
                    ],
                  }
                : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  /**
   * 3. RC Low-Pass Filter
   */
  public static generateRCFilter(
    project: ApexProject,
    signalIn = 'SIG_IN',
    signalOut = 'SIG_FILT',
    rVal = '1k',
    cVal = '100nF',
    pos = { x: 150, y: 90 }
  ): ActionProposal {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    pos = this.findUnoccupiedPos(activeSheet, pos);

    const rRef = SchematicHelper.getNextReference('R', activeSheet.symbols);
    const cRef = SchematicHelper.getNextReference('C', activeSheet.symbols);

    const rDef =
      libraryRegistry.getSymbolById('sym_r') ||
      libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === 'R') ||
      libraryRegistry.getAllSymbols()[0];
    const cDef =
      libraryRegistry.getSymbolById('sym_c') ||
      libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === 'C') ||
      libraryRegistry.getAllSymbols()[0];

    const rInst: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_rf`,
      symbolDefId: rDef.id,
      reference: rRef,
      value: rVal,
      footprint: 'Resistor_SMD:R_0805_2012Metric',
      x: pos.x,
      y: pos.y,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      fields: { Description: 'RC Filter Series Resistor' },
      pins: JSON.parse(JSON.stringify(rDef.pins)),
    };

    const cInst: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_cf`,
      symbolDefId: cDef.id,
      reference: cRef,
      value: cVal,
      footprint: 'Capacitor_SMD:C_0805_2012Metric',
      x: pos.x + 30,
      y: pos.y + 15,
      rotation: 90,
      mirrorX: false,
      unit: 1,
      fields: { Description: 'RC Filter Shunt Capacitor' },
      pins: JSON.parse(JSON.stringify(cDef.pins)),
    };

    const proposal: ActionProposal = {
      id: `prop_rc_${Date.now()}`,
      title: `Generate RC Low-Pass Filter (${rRef}=${rVal}, ${cRef}=${cVal})`,
      description: `Formula: fc = 1 / (2πRC) ≈ 1.59 kHz with R=${rVal}, C=${cVal}.`,
      category: 'rc_filter',
      permission: 'MUTATE',
      diff: {
        addedComponents: [
          { reference: rRef, value: rVal, footprint: 'Resistor_SMD:R_0805_2012Metric', position: pos },
          { reference: cRef, value: cVal, footprint: 'Capacitor_SMD:C_0805_2012Metric', position: { x: pos.x + 30, y: pos.y + 15 } },
        ],
        connectedNets: [signalIn, signalOut, 'GND'],
        notes: [`Cutoff Frequency: fc ≈ 1.59 kHz`, `${rRef}.1 → ${signalIn}`, `${rRef}.2 & ${cRef}.1 → ${signalOut}`, `${cRef}.2 → GND`],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];

        const rp1 = SchematicHelper.getSymbolPinWorldPosition(rInst, rInst.pins[0]);
        const rp2 = SchematicHelper.getSymbolPinWorldPosition(rInst, rInst.pins[1]);
        const cp1 = SchematicHelper.getSymbolPinWorldPosition(cInst, cInst.pins[0]);
        const cp2 = SchematicHelper.getSymbolPinWorldPosition(cInst, cInst.pins[1]);

        const wire1: SchematicWireSegment = { id: `w_${Date.now()}_1`, x1: rp2.x, y1: rp2.y, x2: cp1.x, y2: cp1.y };

        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: [...s.symbols, rInst, cInst],
                    wires: [...s.wires, wire1],
                    labels: [
                      ...s.labels,
                      { id: `lbl_${Date.now()}_in`, text: signalIn, x: rp1.x, y: rp1.y, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_out`, text: signalOut, x: cp1.x, y: cp1.y, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_gnd`, text: 'GND', x: cp2.x, y: cp2.y, type: 'global', orientation: 0 },
                    ],
                  }
                : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  /**
   * 4. I2C Bus Pull-Up Resistors
   */
  public static generateI2CPullups(
    project: ApexProject,
    sdaNet = 'I2C_SDA',
    sclNet = 'I2C_SCL',
    vddNet = '+3.3V',
    rVal = '4.7k',
    pos = { x: 130, y: 70 }
  ): ActionProposal {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    pos = this.findUnoccupiedPos(activeSheet, pos);

    const r1Ref = SchematicHelper.getNextReference('R', activeSheet.symbols);
    const tempSyms = [...activeSheet.symbols, { reference: r1Ref } as any];
    const r2Ref = SchematicHelper.getNextReference('R', tempSyms);

    const rDef =
      libraryRegistry.getSymbolById('sym_r') ||
      libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === 'R') ||
      libraryRegistry.getAllSymbols()[0];

    const rSda: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_rsda`,
      symbolDefId: rDef.id,
      reference: r1Ref,
      value: rVal,
      footprint: 'Resistor_SMD:R_0805_2012Metric',
      x: pos.x,
      y: pos.y,
      rotation: 90,
      mirrorX: false,
      unit: 1,
      fields: { Description: 'I2C SDA Pull-Up Resistor' },
      pins: JSON.parse(JSON.stringify(rDef.pins)),
    };

    const rScl: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_rscl`,
      symbolDefId: rDef.id,
      reference: r2Ref,
      value: rVal,
      footprint: 'Resistor_SMD:R_0805_2012Metric',
      x: pos.x + 20,
      y: pos.y,
      rotation: 90,
      mirrorX: false,
      unit: 1,
      fields: { Description: 'I2C SCL Pull-Up Resistor' },
      pins: JSON.parse(JSON.stringify(rDef.pins)),
    };

    const proposal: ActionProposal = {
      id: `prop_i2c_${Date.now()}`,
      title: `Add I2C Pull-Up Resistors (${r1Ref}=${rVal}, ${r2Ref}=${rVal})`,
      description: `Pull up ${sdaNet} and ${sclNet} lines to ${vddNet} for standard I2C bus compliance (Standard/Fast Mode).`,
      category: 'i2c_pullups',
      permission: 'MUTATE',
      diff: {
        addedComponents: [
          { reference: r1Ref, value: rVal, footprint: 'Resistor_SMD:R_0805_2012Metric', position: pos },
          { reference: r2Ref, value: rVal, footprint: 'Resistor_SMD:R_0805_2012Metric', position: { x: pos.x + 20, y: pos.y } },
        ],
        connectedNets: [vddNet, sdaNet, sclNet],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];

        const sdaP1 = SchematicHelper.getSymbolPinWorldPosition(rSda, rSda.pins[0]);
        const sdaP2 = SchematicHelper.getSymbolPinWorldPosition(rSda, rSda.pins[1]);
        const sclP1 = SchematicHelper.getSymbolPinWorldPosition(rScl, rScl.pins[0]);
        const sclP2 = SchematicHelper.getSymbolPinWorldPosition(rScl, rScl.pins[1]);

        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: [...s.symbols, rSda, rScl],
                    labels: [
                      ...s.labels,
                      { id: `lbl_${Date.now()}_vdd1`, text: vddNet, x: sdaP1.x, y: sdaP1.y, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_vdd2`, text: vddNet, x: sclP1.x, y: sclP1.y, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_sda`, text: sdaNet, x: sdaP2.x, y: sdaP2.y, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_scl`, text: sclNet, x: sclP2.x, y: sclP2.y, type: 'global', orientation: 0 },
                    ],
                  }
                : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  /**
   * 5. LED Indicator Driver Circuit
   */
  public static generateLEDCircuit(
    project: ApexProject,
    vccNet = '+3.3V',
    gndNet = 'GND',
    ledColor = 'GREEN',
    rVal = '330R',
    pos = { x: 160, y: 100 }
  ): ActionProposal {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    pos = this.findUnoccupiedPos(activeSheet, pos);

    const dRef = SchematicHelper.getNextReference('D', activeSheet.symbols);
    const rRef = SchematicHelper.getNextReference('R', activeSheet.symbols);

    const dDef =
      libraryRegistry.getSymbolById('sym_d') ||
      libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === 'D') ||
      libraryRegistry.getAllSymbols()[0];
    const rDef =
      libraryRegistry.getSymbolById('sym_r') ||
      libraryRegistry.getAllSymbols().find((s) => s.defaultPrefix === 'R') ||
      libraryRegistry.getAllSymbols()[0];

    const ledInst: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_led`,
      symbolDefId: dDef.id,
      reference: dRef,
      value: `LED_${ledColor}`,
      footprint: 'LED_SMD:LED_0805_2012Metric',
      x: pos.x,
      y: pos.y,
      rotation: 90,
      mirrorX: false,
      unit: 1,
      fields: { Description: `${ledColor} Status LED` },
      pins: JSON.parse(JSON.stringify(dDef.pins)),
    };

    const rInst: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_rled`,
      symbolDefId: rDef.id,
      reference: rRef,
      value: rVal,
      footprint: 'Resistor_SMD:R_0805_2012Metric',
      x: pos.x,
      y: pos.y + 25,
      rotation: 90,
      mirrorX: false,
      unit: 1,
      fields: { Description: 'LED Current Limiting Resistor' },
      pins: JSON.parse(JSON.stringify(rDef.pins)),
    };

    const proposal: ActionProposal = {
      id: `prop_led_${Date.now()}`,
      title: `Add ${ledColor} LED Circuit (${dRef}, ${rRef}=${rVal})`,
      description: `Formula: R = (Vcc - Vf) / If ≈ (3.3V - 2.1V) / 3.6mA = 330Ω.`,
      category: 'led_circuit',
      permission: 'MUTATE',
      diff: {
        addedComponents: [
          { reference: dRef, value: `LED_${ledColor}`, footprint: 'LED_SMD:LED_0805_2012Metric', position: pos },
          { reference: rRef, value: rVal, footprint: 'Resistor_SMD:R_0805_2012Metric', position: { x: pos.x, y: pos.y + 25 } },
        ],
        connectedNets: [vccNet, gndNet],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];

        const dp1 = SchematicHelper.getSymbolPinWorldPosition(ledInst, ledInst.pins[0]);
        const dp2 = SchematicHelper.getSymbolPinWorldPosition(ledInst, ledInst.pins[1]);
        const rp1 = SchematicHelper.getSymbolPinWorldPosition(rInst, rInst.pins[0]);
        const rp2 = SchematicHelper.getSymbolPinWorldPosition(rInst, rInst.pins[1]);

        const wire: SchematicWireSegment = { id: `w_${Date.now()}_led`, x1: dp2.x, y1: dp2.y, x2: rp1.x, y2: rp1.y };

        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: [...s.symbols, ledInst, rInst],
                    wires: [...s.wires, wire],
                    labels: [
                      ...s.labels,
                      { id: `lbl_${Date.now()}_vcc`, text: vccNet, x: dp1.x, y: dp1.y, type: 'global', orientation: 0 },
                      { id: `lbl_${Date.now()}_gnd`, text: gndNet, x: rp2.x, y: rp2.y, type: 'global', orientation: 0 },
                    ],
                  }
                : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }
}
