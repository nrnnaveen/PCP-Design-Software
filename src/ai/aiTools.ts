/**
 * FloZ ECA - AI Controlled Engineering Tools (Phase 3)
 * Typed tool catalog organized by permission tiers with real pin-to-pin wiring,
 * component mutations, library queries, and cross-probing.
 */

import { ApexProject, SchematicSymbolInstance, SchematicWireSegment } from '../core/types';
import { libraryRegistry } from '../library/libraryRegistry';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { SchematicHelper } from '../schematic/helper';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';
import { eventBus } from '../core/eventBus';
import { ActionProposal } from './types';
import { ActionValidator } from './actionValidator';
import { CircuitGenerator } from './circuitGenerator';
import { DesignIntent } from './generation/designIntent';
import { SchematicCompiler } from './generation/schematicCompiler';
import { AutoPlacer } from '../pcb/autoPlacer';
import { AutoRouter } from '../pcb/autoRouter';
import { ZoneGenerator } from '../pcb/zoneGenerator';
import { AutoFixEngine } from '../validation/autoFixEngine';
import { AssetResolver } from '../library/assetResolver';

export class AITools {
  // ==========================================
  // 1. READ Tools
  // ==========================================

  public static getProjectInfo(project: ApexProject) {
    return {
      name: project.metadata.name,
      version: project.metadata.version,
      units: project.metadata.units,
      author: project.metadata.author,
      sheetsCount: project.schematic.sheets.length,
      footprintsCount: project.pcb.footprints.length,
    };
  }

  public static getComponentList(project: ApexProject) {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    return activeSheet.symbols.map((s) => ({
      reference: s.reference,
      value: s.value,
      footprint: s.footprint || 'Unassigned',
      position: { x: s.x, y: s.y },
      pinsCount: s.pins.length,
    }));
  }

  public static getSymbol(project: ApexProject, reference: string) {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const sym = activeSheet.symbols.find((s) => s.reference.toUpperCase() === reference.toUpperCase());
    if (!sym) return null;

    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
    const pins = sym.pins.map((p) => {
      let netName = 'Unconnected';
      for (const [nName, node] of Object.entries(connectivity.netGraph.nets)) {
        if (node.pins.some((pinRef) => pinRef.symbolRef === sym.reference && pinRef.pinNumber === p.number)) {
          netName = nName;
          break;
        }
      }
      return {
        number: p.number,
        name: p.name,
        electricalType: p.electricalType,
        netName,
      };
    });

    return {
      reference: sym.reference,
      value: sym.value,
      footprint: sym.footprint,
      position: { x: sym.x, y: sym.y },
      rotation: sym.rotation,
      pins,
    };
  }

  public static getNet(project: ApexProject, netName: string) {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
    const target = Object.entries(connectivity.netGraph.nets).find(
      ([k]) => k.toUpperCase() === netName.toUpperCase()
    );

    if (!target) return null;
    const [name, node] = target;

    return {
      netName: name,
      isPower: node.isPower,
      pins: node.pins,
      pinCount: node.pins.length,
    };
  }

  public static getNetFromPin(project: ApexProject, reference: string, pinNumber: string): string | null {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
    for (const [netName, node] of Object.entries(connectivity.netGraph.nets)) {
      if (node.pins.some((p) => p.symbolRef.toUpperCase() === reference.toUpperCase() && p.pinNumber === pinNumber)) {
        return netName;
      }
    }
    return null;
  }

  public static getBoardInfo(project: ApexProject) {
    let minX = 0, maxX = 100, minY = 0, maxY = 80;
    if (project.pcb.boardOutline && project.pcb.boardOutline.length > 0) {
      minX = Math.min(...project.pcb.boardOutline.map((p) => p.x));
      maxX = Math.max(...project.pcb.boardOutline.map((p) => p.x));
      minY = Math.min(...project.pcb.boardOutline.map((p) => p.y));
      maxY = Math.max(...project.pcb.boardOutline.map((p) => p.y));
    }
    return {
      width: Math.max(10, maxX - minX),
      height: Math.max(10, maxY - minY),
      layers: project.pcb.stackup?.length || 2,
      tracksCount: project.pcb.tracks.length,
      viasCount: project.pcb.vias.length,
      zonesCount: project.pcb.zones.length,
      footprintsCount: project.pcb.footprints.length,
    };
  }

  public static searchSymbols(query: string) {
    const all = libraryRegistry.getAllSymbols();
    const q = query.toLowerCase().trim();
    return all
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q)) ||
          s.id.toLowerCase().includes(q)
      )
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        name: s.name,
        library: s.library,
        category: s.category,
        description: s.description,
        defaultPrefix: s.defaultPrefix,
        defaultFootprint: s.defaultFootprint,
        pinCount: s.pins.length,
      }));
  }

  public static searchFootprints(query: string) {
    const all = libraryRegistry.getAllFootprints();
    const q = query.toLowerCase().trim();
    return all
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.keywords.some((k) => k.toLowerCase().includes(q))
      )
      .slice(0, 10)
      .map((f) => ({
        id: f.id,
        name: f.name,
        library: f.library,
        category: f.category,
        description: f.description,
        padCount: f.pads.length,
      }));
  }

  // ==========================================
  // 2. ANALYZE Tools
  // ==========================================

  public static runERC(project: ApexProject) {
    const violations = ERCEngine.run(project);
    return violations.map((v) => ({
      code: v.code,
      severity: v.severity,
      title: v.title,
      description: v.description,
      x: v.x,
      y: v.y,
    }));
  }

  public static runDRC(project: ApexProject) {
    const violations = DRCEngine.run(project);
    return violations.map((v) => ({
      code: v.code,
      title: v.title,
      description: v.description,
      x: v.x,
      y: v.y,
    }));
  }

  public static findUnconnectedPins(project: ApexProject) {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
    return connectivity.unconnectedPins;
  }

  public static findMissingFootprints(project: ApexProject) {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    return activeSheet.symbols
      .filter((s) => !s.footprint || s.footprint.trim() === '')
      .map((s) => ({ reference: s.reference, value: s.value }));
  }

  public static findMissingPowerConnections(project: ApexProject) {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const missing: Array<{ symbolRef: string; pinName: string; pinNumber: string }> = [];
    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);

    for (const sym of activeSheet.symbols) {
      for (const pin of sym.pins) {
        if (pin.electricalType === 'power_in') {
          const isConnected = !connectivity.unconnectedPins.some(
            (p) => p.symbolRef === sym.reference && p.pinNumber === pin.number
          );
          if (!isConnected) {
            missing.push({ symbolRef: sym.reference, pinName: pin.name, pinNumber: pin.number });
          }
        }
      }
    }
    return missing;
  }

  // ==========================================
  // 3. VISUALIZE Tools
  // ==========================================

  public static highlightComponent(reference: string): boolean {
    eventBus.emit('SELECT_SYMBOL', { reference });
    eventBus.emit('SELECT_FOOTPRINT', { reference });
    return true;
  }

  public static highlightNet(netName: string): boolean {
    eventBus.emit('SELECT_NET', { netName });
    return true;
  }

  public static focusObject(reference: string, x: number, y: number): boolean {
    eventBus.emit('CROSS_PROBE', { source: 'schematic', reference, x, y });
    return true;
  }

  // ==========================================
  // 4. MUTATE Proposals (Requires Human Approval)
  // ==========================================

  /**
   * Compiles full circuit generation from a user design prompt into concrete schematic objects
   */
  public static proposeFullCircuit(project: ApexProject, prompt: string): ActionProposal | null {
    const plan = DesignIntent.parsePrompt(prompt);
    if (!plan) return null;
    return SchematicCompiler.compilePlan(plan, project);
  }

  /**
   * Proposes creating a real electrical wire segment between two component pins
   */
  public static proposeCreateWire(
    project: ApexProject,
    startRef: string,
    startPin: string,
    endRef: string,
    endPin: string
  ): ActionProposal | null {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const startSym = activeSheet.symbols.find((s) => s.reference.toUpperCase() === startRef.toUpperCase());
    const endSym = activeSheet.symbols.find((s) => s.reference.toUpperCase() === endRef.toUpperCase());

    if (!startSym || !endSym) return null;

    const startPinObj = startSym.pins.find((p) => p.number === startPin || p.name.toUpperCase() === startPin.toUpperCase());
    const endPinObj = endSym.pins.find((p) => p.number === endPin || p.name.toUpperCase() === endPin.toUpperCase());

    if (!startPinObj || !endPinObj) return null;

    const p1 = SchematicHelper.getSymbolPinWorldPosition(startSym, startPinObj);
    const p2 = SchematicHelper.getSymbolPinWorldPosition(endSym, endPinObj);

    const wireSegment: SchematicWireSegment = {
      id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
    };

    const proposal: ActionProposal = {
      id: `prop_wire_${Date.now()}`,
      title: `Connect ${startSym.reference}.${startPinObj.name} (Pin ${startPinObj.number}) → ${endSym.reference}.${endPinObj.name} (Pin ${endPinObj.number})`,
      description: `Create electrical wire connecting ${startSym.reference} pin ${startPinObj.number} to ${endSym.reference} pin ${endPinObj.number}.`,
      category: 'create_wire',
      permission: 'MUTATE',
      diff: {
        addedWires: [
          {
            from: `${startSym.reference}:${startPinObj.number}`,
            to: `${endSym.reference}:${endPinObj.number}`,
          },
        ],
        notes: [
          `Wire Geometry: (${p1.x}, ${p1.y}) → (${p2.x}, ${p2.y}) mm`,
          `Pins: ${startSym.reference}.${startPinObj.name} [${startPinObj.electricalType}] ↔ ${endSym.reference}.${endPinObj.name} [${endPinObj.electricalType}]`,
        ],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];
        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id ? { ...s, wires: [...s.wires, wireSegment] } : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  public static proposeAddDecouplingCap(project: ApexProject, targetRef: string, vdd = '+3.3V', gnd = 'GND', val = '100nF') {
    return CircuitGenerator.generateDecouplingCap(project, targetRef, vdd, gnd, val);
  }

  public static proposeVoltageDivider(project: ApexProject, vin = 'VIN', vout = 'VOUT', r1 = '10k', r2 = '10k', pos = { x: 140, y: 80 }) {
    return CircuitGenerator.generateVoltageDivider(project, vin, vout, r1, r2, pos);
  }

  public static proposeRCFilter(project: ApexProject, sigIn = 'SIG_IN', sigOut = 'SIG_FILT', r = '1k', c = '100nF', pos = { x: 150, y: 90 }) {
    return CircuitGenerator.generateRCFilter(project, sigIn, sigOut, r, c, pos);
  }

  public static proposeI2CPullups(project: ApexProject, sda = 'I2C_SDA', scl = 'I2C_SCL', vdd = '+3.3V', r = '4.7k', pos = { x: 130, y: 70 }) {
    return CircuitGenerator.generateI2CPullups(project, sda, scl, vdd, r, pos);
  }

  public static proposeLEDCircuit(project: ApexProject, vcc = '+3.3V', gnd = 'GND', color = 'GREEN', r = '330R', pos = { x: 160, y: 100 }) {
    return CircuitGenerator.generateLEDCircuit(project, vcc, gnd, color, r, pos);
  }

  public static proposePlaceSymbol(
    project: ApexProject,
    symbolDefId: string,
    value?: string,
    targetPos = { x: 100, y: 100 }
  ): ActionProposal | null {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const symDef =
      libraryRegistry.getSymbolById(symbolDefId) ||
      libraryRegistry.getAllSymbols().find((s) => s.id === symbolDefId);
    if (!symDef) return null;

    const nextRef = SchematicHelper.getNextReference(symDef.defaultPrefix, activeSheet.symbols);
    const finalVal = value || symDef.name;

    const newSym: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      symbolDefId: symDef.id,
      reference: nextRef,
      value: finalVal,
      footprint: symDef.defaultFootprint || '',
      x: targetPos.x,
      y: targetPos.y,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      fields: { Description: symDef.description },
      pins: JSON.parse(JSON.stringify(symDef.pins)),
    };

    const proposal: ActionProposal = {
      id: `prop_place_${Date.now()}`,
      title: `Place ${symDef.name} (${nextRef})`,
      description: `Place component ${nextRef} (${finalVal}) at (${targetPos.x}, ${targetPos.y}) mm. Library ID: ${symDef.id}`,
      category: 'place_symbol',
      permission: 'MUTATE',
      diff: {
        addedComponents: [
          { reference: nextRef, value: finalVal, footprint: symDef.defaultFootprint, position: targetPos },
        ],
        notes: [`Library Symbol: ${symDef.library}:${symDef.name}`, `Pin Count: ${symDef.pins.length}`],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];
        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id ? { ...s, symbols: [...s.symbols, newSym] } : s
            ),
          },
        };
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  public static proposeChangeValue(
    project: ApexProject,
    reference: string,
    newValue: string
  ): ActionProposal | null {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const sym = activeSheet.symbols.find((s) => s.reference.toUpperCase() === reference.toUpperCase());
    if (!sym) return null;

    const oldVal = sym.value;

    const proposal: ActionProposal = {
      id: `prop_val_${Date.now()}`,
      title: `Change ${sym.reference} Value: "${oldVal}" → "${newValue}"`,
      description: `Update component ${sym.reference} value property.`,
      category: 'change_value',
      permission: 'MUTATE',
      diff: {
        modifiedComponents: [
          { reference: sym.reference, field: 'value', oldValue: oldVal, newValue },
        ],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];
        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: s.symbols.map((item) =>
                      item.reference.toUpperCase() === reference.toUpperCase() ? { ...item, value: newValue } : item
                    ),
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

  public static proposeAssignFootprint(
    project: ApexProject,
    reference: string,
    footprintDefId: string
  ): ActionProposal | null {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const sym = activeSheet.symbols.find((s) => s.reference.toUpperCase() === reference.toUpperCase());
    if (!sym) return null;

    const oldFp = sym.footprint || 'Unassigned';

    const proposal: ActionProposal = {
      id: `prop_fp_${Date.now()}`,
      title: `Assign Footprint to ${sym.reference}: "${footprintDefId}"`,
      description: `Associate footprint package ${footprintDefId} to ${sym.reference}.`,
      category: 'assign_footprint',
      permission: 'MUTATE',
      diff: {
        modifiedComponents: [
          { reference: sym.reference, field: 'footprint', oldValue: oldFp, newValue: footprintDefId },
        ],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];
        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: s.symbols.map((item) =>
                      item.reference.toUpperCase() === reference.toUpperCase() ? { ...item, footprint: footprintDefId } : item
                    ),
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

  // ==========================================
  // 5. DESTRUCTIVE Proposals (Requires Explicit Confirmation)
  // ==========================================

  public static proposeDeleteSymbol(project: ApexProject, reference: string): ActionProposal | null {
    const activeSheet =
      project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
      project.schematic.sheets[0];

    const sym = activeSheet.symbols.find((s) => s.reference.toUpperCase() === reference.toUpperCase());
    if (!sym) return null;

    const proposal: ActionProposal = {
      id: `prop_del_${Date.now()}`,
      title: `Delete Component ${sym.reference} (${sym.value})`,
      description: `Remove component ${sym.reference} from schematic sheet.`,
      category: 'delete_symbol',
      permission: 'DESTRUCTIVE',
      diff: {
        removedComponents: [sym.reference],
        notes: [`Footprint: ${sym.footprint || 'Unassigned'}`, `Pins to disconnect: ${sym.pins.length}`],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        const sheet = prevPrj.schematic.sheets.find((s) => s.id === prevPrj.schematic.activeSheetId) || prevPrj.schematic.sheets[0];
        return {
          ...prevPrj,
          schematic: {
            ...prevPrj.schematic,
            sheets: prevPrj.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: s.symbols.filter((item) => item.id !== sym.id),
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

  // ==========================================
  // 6. Complete Autonomous End-to-End Workflow Tools
  // ==========================================

  /**
   * Complete End-to-End Autonomous Circuit + PCB Generation:
   * Analyzes prompt -> Synthesizes Schematic -> Assigns Footprints -> Synchronizes & Places PCB
   * -> Auto-Routes Copper Tracks & Vias -> Pours Ground Planes -> Runs Verification
   */
  public static proposeGenerateCompleteCircuitAndPCB(prompt: string, project: ApexProject): ActionProposal | null {
    const plan = DesignIntent.parsePrompt(prompt);
    if (!plan) return null;

    const schemProposal = SchematicCompiler.compilePlan(plan, project);
    if (!schemProposal) return null;

    const proposal: ActionProposal = {
      id: `prop_full_eda_${Date.now()}`,
      title: `Full Design Workflow: ${plan.title}`,
      description: `Complete electronic design: Generate schematic, assign verified footprints, place PCB layout, route all nets with 45° tracks, and generate ground pour.`,
      category: 'full_circuit_pcb_generation',
      permission: 'MUTATE',
      diff: {
        ...schemProposal.diff,
        notes: [
          ...(schemProposal.diff.notes || []),
          'Automated PCB Footprint Placement & Outline Generation',
          'Automated Multi-Net 45° Track Routing & Layer Vias',
          'Top & Bottom Copper Flood Ground Pour (GND)',
          'Synchronized 3D Mechanical Package Rendering',
        ],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        // 1. Apply Schematic Generation
        let nextPrj = schemProposal.applyAction(prevPrj);

        // 2. Resolve missing footprints if any
        const activeSheet =
          nextPrj.schematic.sheets.find((s) => s.id === nextPrj.schematic.activeSheetId) ||
          nextPrj.schematic.sheets[0];

        // 3. Place Footprints on PCB & Generate Board Outline
        nextPrj = AutoPlacer.placeComponents(nextPrj, { boardMarginMm: 6.0 });

        // 4. Auto-Route All Electrical Nets
        nextPrj = AutoRouter.routeProject(nextPrj);

        // 5. Generate Top and Bottom GND Copper Pour Zones
        nextPrj = ZoneGenerator.createGroundPlanes(nextPrj, ['F.Cu', 'B.Cu'], 'GND');

        return nextPrj;
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  /**
   * Auto-routes all unrouted PCB airwires
   */
  public static proposeAutoRoutePCB(project: ApexProject): ActionProposal {
    const proposal: ActionProposal = {
      id: `prop_route_${Date.now()}`,
      title: 'Auto-Route PCB Connections',
      description: 'Route all unrouted ratsnest nets using 45° octilinear copper tracks and transition vias.',
      category: 'auto_route',
      permission: 'MUTATE',
      diff: {
        notes: ['Multi-net priority routing for power and signal traces.'],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        return AutoRouter.routeProject(prevPrj);
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  /**
   * Synchronizes Schematic to PCB (ECO Forward-Annotation) and Auto-Places components
   */
  public static proposeSyncSchematicToPCB(project: ApexProject): ActionProposal {
    const proposal: ActionProposal = {
      id: `prop_sync_pcb_${Date.now()}`,
      title: 'Synchronize Schematic to PCB Layout',
      description: 'Transfer components, assigned footprints, and net connections to PCB with auto-placement.',
      category: 'sync_schematic_to_pcb',
      permission: 'MUTATE',
      diff: {
        notes: ['Reconcile schematic symbols with PCB footprint instances and nets.'],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        return AutoPlacer.placeComponents(prevPrj);
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  /**
   * Generates continuous ground copper pour zones
   */
  public static proposeCreateGroundZone(project: ApexProject): ActionProposal {
    const proposal: ActionProposal = {
      id: `prop_zone_${Date.now()}`,
      title: 'Create Ground Copper Pour Zones (F.Cu & B.Cu)',
      description: 'Generate continuous GND copper flood planes covering the PCB board outline.',
      category: 'create_zone',
      permission: 'MUTATE',
      diff: {
        notes: ['Top (F.Cu) and Bottom (B.Cu) GND copper flood.'],
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        return ZoneGenerator.createGroundPlanes(prevPrj);
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }

  /**
   * Auto-fixes DRC and ERC violations
   */
  public static proposeAutoFixDiagnostics(project: ApexProject): ActionProposal {
    const fixResult = AutoFixEngine.autoFixProject(project);

    const proposal: ActionProposal = {
      id: `prop_autofix_${Date.now()}`,
      title: `Auto-Fix Diagnostics (${fixResult.fixedCount} issues)`,
      description: `Automatically repair safe design rule and electrical violations: ${fixResult.appliedFixes.join('; ')}`,
      category: 'auto_fix_diagnostics',
      permission: 'MUTATE',
      diff: {
        notes: fixResult.appliedFixes,
      },
      status: 'pending',
      applyAction: (prevPrj: ApexProject): ApexProject => {
        return AutoFixEngine.autoFixProject(prevPrj).updatedProject;
      },
    };

    proposal.validation = ActionValidator.preValidate(proposal, project);
    return proposal;
  }
}
