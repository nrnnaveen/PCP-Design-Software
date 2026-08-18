/**
 * FloZ EDA - Unified Component Registry
 * Authoritative system linking Component -> Symbol -> Footprint -> 3D Model with pin/pad compatibility verification.
 */

import { SchematicPin, Model3DReference, SymbolDefinition, FootprintDefinition } from '../core/types';
import { libraryRegistry } from './libraryRegistry';
import { BUILTIN_FOOTPRINTS, footprintLibrary } from './footprintLibrary';

export type ComponentCategory =
  | 'passive'
  | 'diode'
  | 'transistor'
  | 'ic'
  | 'connector'
  | 'power'
  | 'protection'
  | 'sensor'
  | 'switch';

export interface ComponentDefinition {
  componentId: string;
  name: string;
  category: ComponentCategory;
  symbolDefId: string;
  pins: SchematicPin[];
  parameters: Record<string, string | number>;
  defaultValue: string;
  footprintCandidates: string[];
  defaultFootprint: string;
  model3DCandidates: string[];
  default3DModel?: Model3DReference;
  metadata: {
    manufacturer?: string;
    mpn?: string;
    description: string;
    datasheet?: string;
    keywords?: string[];
  };
  source: 'built_in' | 'imported' | 'synthetic';
}

export class ComponentRegistry {
  private static components: Map<string, ComponentDefinition> = new Map();
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;

    // 1. Passives: Resistors
    this.register({
      componentId: 'comp_resistor',
      name: 'Resistor',
      category: 'passive',
      symbolDefId: 'sym_r',
      pins: [
        { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: -5.08, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: '2', electricalType: 'passive', x: 5.08, y: 0, length: 2.54, orientation: 180, visible: true },
      ],
      parameters: { Resistance: '10k', Tolerance: '1%', Power: '0.125W' },
      defaultValue: '10k',
      footprintCandidates: ['Resistor_SMD:R_0805_2012Metric', 'Resistor_SMD:R_1206_3216Metric', 'Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal'],
      defaultFootprint: 'Resistor_SMD:R_0805_2012Metric',
      model3DCandidates: ['0805', '1206', 'Axial_Resistor'],
      metadata: {
        description: 'Standard Fixed Resistor',
        keywords: ['resistor', 'r', 'pullup', 'pulldown', 'current limiter'],
      },
      source: 'built_in',
    });

    // 2. Passives: Ceramic Capacitor
    this.register({
      componentId: 'comp_cap_ceramic',
      name: 'Ceramic Capacitor (MLCC)',
      category: 'passive',
      symbolDefId: 'sym_c',
      pins: [
        { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: -5.08, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: '2', electricalType: 'passive', x: 5.08, y: 0, length: 2.54, orientation: 180, visible: true },
      ],
      parameters: { Capacitance: '100nF', Voltage: '50V', Dielectric: 'X7R' },
      defaultValue: '100nF',
      footprintCandidates: ['Capacitor_SMD:C_0805_2012Metric', 'Capacitor_SMD:C_1206_3216Metric', 'Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm'],
      defaultFootprint: 'Capacitor_SMD:C_0805_2012Metric',
      model3DCandidates: ['0805', '1206'],
      metadata: {
        description: 'Multi-layer Ceramic Decoupling Capacitor',
        keywords: ['capacitor', 'c', 'decoupling', 'filter', 'bypass', 'mlcc'],
      },
      source: 'built_in',
    });

    // 3. Passives: Polarized Electrolytic Capacitor
    this.register({
      componentId: 'comp_cap_electrolytic',
      name: 'Electrolytic Capacitor',
      category: 'passive',
      symbolDefId: 'sym_cp',
      pins: [
        { id: 'p1', number: '1', name: '+', electricalType: 'passive', x: -5.08, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: '-', electricalType: 'passive', x: 5.08, y: 0, length: 2.54, orientation: 180, visible: true },
      ],
      parameters: { Capacitance: '100uF', Voltage: '25V' },
      defaultValue: '100uF',
      footprintCandidates: ['Capacitor_THT:CP_Radial_D6.3mm_P2.50mm', 'Capacitor_SMD:CP_Elec_6.3x5.4'],
      defaultFootprint: 'Capacitor_THT:CP_Radial_D6.3mm_P2.50mm',
      model3DCandidates: ['Radial_Capacitor', 'Elec_SMD'],
      metadata: {
        description: 'Bulk Polarized Aluminum Electrolytic Capacitor',
        keywords: ['capacitor', 'cp', 'electrolytic', 'bulk', 'filter', 'power'],
      },
      source: 'built_in',
    });

    // 4. Protection: Fuse
    this.register({
      componentId: 'comp_fuse',
      name: 'Fuse / Polyfuse (PTC)',
      category: 'protection',
      symbolDefId: 'sym_fuse',
      pins: [
        { id: 'p1', number: '1', name: '1', electricalType: 'passive', x: -5.08, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: '2', electricalType: 'passive', x: 5.08, y: 0, length: 2.54, orientation: 180, visible: true },
      ],
      parameters: { CurrentRating: '1A', Voltage: '24V', Type: 'Resettable PTC' },
      defaultValue: '1A',
      footprintCandidates: ['Fuse:Fuse_1206_3216Metric', 'Fuse:Fuse_0805_2012Metric', 'Fuse:Fuse_PTC_Radial'],
      defaultFootprint: 'Fuse:Fuse_1206_3216Metric',
      model3DCandidates: ['1206'],
      metadata: {
        description: 'Overcurrent Protection Polyfuse',
        keywords: ['fuse', 'polyfuse', 'ptc', 'protection', 'overcurrent', '1a'],
      },
      source: 'built_in',
    });

    // 5. Diodes: Schottky Rectifier Diode (1N5819)
    this.register({
      componentId: 'comp_diode_schottky',
      name: 'Schottky Diode (1N5819 / SS14)',
      category: 'diode',
      symbolDefId: 'sym_d_schottky',
      pins: [
        { id: 'p1', number: '1', name: 'A', electricalType: 'passive', x: -5.08, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: 'K', electricalType: 'passive', x: 5.08, y: 0, length: 2.54, orientation: 180, visible: true },
      ],
      parameters: { Vr: '40V', If: '1A', Vf: '0.45V' },
      defaultValue: '1N5819',
      footprintCandidates: ['Diode_SMD:D_SMA', 'Diode_SMD:D_SOD-123', 'Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal'],
      defaultFootprint: 'Diode_SMD:D_SMA',
      model3DCandidates: ['SMA', 'DO-41'],
      metadata: {
        mpn: '1N5819',
        description: 'Low-Vf Schottky Barrier Rectifier Diode for Reverse Polarity Protection',
        keywords: ['diode', 'schottky', '1n5819', 'ss14', 'reverse polarity', 'rectifier'],
      },
      source: 'built_in',
    });

    // 6. Diodes: LED Indicator
    this.register({
      componentId: 'comp_led',
      name: 'LED Indicator',
      category: 'diode',
      symbolDefId: 'sym_led',
      pins: [
        { id: 'p1', number: '1', name: 'A', electricalType: 'passive', x: -5.08, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: 'K', electricalType: 'passive', x: 5.08, y: 0, length: 2.54, orientation: 180, visible: true },
      ],
      parameters: { Color: 'RED', Vf: '2.0V', If: '20mA' },
      defaultValue: 'RED',
      footprintCandidates: ['LED_SMD:LED_0805_2012Metric', 'LED_SMD:LED_1206_3216Metric', 'LED_THT:LED_D5.0mm'],
      defaultFootprint: 'LED_SMD:LED_0805_2012Metric',
      model3DCandidates: ['0805', 'LED_5mm'],
      metadata: {
        description: 'Surface Mount / Through-Hole Light Emitting Diode',
        keywords: ['led', 'light', 'indicator', 'red', 'green', 'blue', 'yellow'],
      },
      source: 'built_in',
    });

    // 7. Transistors: N-Channel MOSFET (2N7002 / BSS138)
    this.register({
      componentId: 'comp_mosfet_n',
      name: 'N-Channel MOSFET',
      category: 'transistor',
      symbolDefId: 'sym_nmos',
      pins: [
        { id: 'p1', number: '1', name: 'G', electricalType: 'input', x: -5.08, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: 'S', electricalType: 'passive', x: 0, y: 5.08, length: 2.54, orientation: 270, visible: true },
        { id: 'p3', number: '3', name: 'D', electricalType: 'passive', x: 0, y: -5.08, length: 2.54, orientation: 90, visible: true },
      ],
      parameters: { Vds: '60V', Id: '300mA', RdsOn: '2.5R' },
      defaultValue: '2N7002',
      footprintCandidates: ['Package_TO_SOT_SMD:SOT-23', 'Package_TO_SOT_SMD:SOT-323_SC-70'],
      defaultFootprint: 'Package_TO_SOT_SMD:SOT-23',
      model3DCandidates: ['SOT-23'],
      metadata: {
        mpn: '2N7002',
        description: 'Logic-Level N-Channel Enhancement Mode Power MOSFET',
        keywords: ['mosfet', 'nmos', 'transistor', 'switch', '2n7002', 'bss138'],
      },
      source: 'built_in',
    });

    // 8. IC: Dual Op-Amp (LM358)
    this.register({
      componentId: 'comp_lm358',
      name: 'LM358 Dual Operational Amplifier',
      category: 'ic',
      symbolDefId: 'sym_lm358',
      pins: [
        { id: 'p1', number: '1', name: 'OUT1', electricalType: 'output', x: 10.16, y: -5.08, length: 2.54, orientation: 180, visible: true },
        { id: 'p2', number: '2', name: 'IN1-', electricalType: 'input', x: -10.16, y: -5.08, length: 2.54, orientation: 0, visible: true },
        { id: 'p3', number: '3', name: 'IN1+', electricalType: 'input', x: -10.16, y: 0, length: 2.54, orientation: 0, visible: true },
        { id: 'p4', number: '4', name: 'GND', electricalType: 'power_in', x: 0, y: 7.62, length: 2.54, orientation: 270, visible: true },
        { id: 'p5', number: '5', name: 'IN2+', electricalType: 'input', x: -10.16, y: 5.08, length: 2.54, orientation: 0, visible: true },
        { id: 'p6', number: '6', name: 'IN2-', electricalType: 'input', x: -10.16, y: 10.16, length: 2.54, orientation: 0, visible: true },
        { id: 'p7', number: '7', name: 'OUT2', electricalType: 'output', x: 10.16, y: 10.16, length: 2.54, orientation: 180, visible: true },
        { id: 'p8', number: '8', name: 'VCC', electricalType: 'power_in', x: 0, y: -7.62, length: 2.54, orientation: 90, visible: true },
      ],
      parameters: { SupplyVoltage: '3V-32V', Bandwidth: '1MHz', Channels: 2 },
      defaultValue: 'LM358',
      footprintCandidates: ['Package_SO:SOIC-8_3.9x4.9mm_P1.27mm', 'Package_DIP:DIP-8_W7.62mm'],
      defaultFootprint: 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',
      model3DCandidates: ['SOIC-8', 'DIP-8'],
      metadata: {
        mpn: 'LM358',
        description: 'Low-Power Dual Operational Amplifier',
        keywords: ['opamp', 'amplifier', 'lm358', 'dual opamp', 'analog'],
      },
      source: 'built_in',
    });

    // 9. IC: NE555 Timer
    this.register({
      componentId: 'comp_ne555',
      name: 'NE555 Precision Timer',
      category: 'ic',
      symbolDefId: 'sym_ne555',
      pins: [
        { id: 'p1', number: '1', name: 'GND', electricalType: 'power_in', x: -10.16, y: 7.62, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: 'TRIG', electricalType: 'input', x: -10.16, y: 2.54, length: 2.54, orientation: 0, visible: true },
        { id: 'p3', number: '3', name: 'OUT', electricalType: 'output', x: 10.16, y: 2.54, length: 2.54, orientation: 180, visible: true },
        { id: 'p4', number: '4', name: 'RESET', electricalType: 'input', x: -10.16, y: -2.54, length: 2.54, orientation: 0, visible: true },
        { id: 'p5', number: '5', name: 'CTRL', electricalType: 'passive', x: 10.16, y: -2.54, length: 2.54, orientation: 180, visible: true },
        { id: 'p6', number: '6', name: 'THRES', electricalType: 'input', x: -10.16, y: -7.62, length: 2.54, orientation: 0, visible: true },
        { id: 'p7', number: '7', name: 'DISCH', electricalType: 'open_collector', x: 10.16, y: -7.62, length: 2.54, orientation: 180, visible: true },
        { id: 'p8', number: '8', name: 'VCC', electricalType: 'power_in', x: 0, y: -10.16, length: 2.54, orientation: 90, visible: true },
      ],
      parameters: { MaxFrequency: '500kHz', SupplyVoltage: '4.5V-16V' },
      defaultValue: 'NE555',
      footprintCandidates: ['Package_SO:SOIC-8_3.9x4.9mm_P1.27mm', 'Package_DIP:DIP-8_W7.62mm'],
      defaultFootprint: 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',
      model3DCandidates: ['SOIC-8', 'DIP-8'],
      metadata: {
        mpn: 'NE555',
        description: 'Standard General Purpose Single Bipolar Timer',
        keywords: ['timer', 'ne555', 'astable', 'monostable', 'oscillator', 'pwm'],
      },
      source: 'built_in',
    });

    // 10. Connectors: USB Type-C Receptacle
    this.register({
      componentId: 'comp_usbc',
      name: 'USB Type-C Connector (16-Pin Power Delivery)',
      category: 'connector',
      symbolDefId: 'sym_usbc',
      pins: [
        { id: 'p1', number: 'A1_B12', name: 'GND', electricalType: 'power_in', x: -7.62, y: 7.62, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: 'A4_B9', name: 'VBUS', electricalType: 'power_out', x: -7.62, y: -7.62, length: 2.54, orientation: 0, visible: true },
        { id: 'p3', number: 'A5', name: 'CC1', electricalType: 'bidirectional', x: 7.62, y: -2.54, length: 2.54, orientation: 180, visible: true },
        { id: 'p4', number: 'B5', name: 'CC2', electricalType: 'bidirectional', x: 7.62, y: 2.54, length: 2.54, orientation: 180, visible: true },
        { id: 'p5', number: 'A6_B6', name: 'D+', electricalType: 'bidirectional', x: 7.62, y: -5.08, length: 2.54, orientation: 180, visible: true },
        { id: 'p6', number: 'A7_B7', name: 'D-', electricalType: 'bidirectional', x: 7.62, y: -7.62, length: 2.54, orientation: 180, visible: true },
        { id: 'p7', number: 'SHIELD', name: 'SHIELD', electricalType: 'passive', x: -7.62, y: 10.16, length: 2.54, orientation: 0, visible: true },
      ],
      parameters: { MaxCurrent: '3A', MaxVoltage: '20V' },
      defaultValue: 'USB-C_16P',
      footprintCandidates: ['Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12'],
      defaultFootprint: 'Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12',
      model3DCandidates: ['USB-C'],
      metadata: {
        description: 'USB-C 16-Pin Receptacle with CC pull-downs for 5V 3A Power Delivery',
        keywords: ['usb', 'usb-c', 'usbc', 'power', 'vbus', 'connector'],
      },
      source: 'built_in',
    });

    // 11. IC: Low Dropout 3.3V Regulator (AP2112K-3.3)
    this.register({
      componentId: 'comp_ldo_3v3',
      name: '3.3V Low-Dropout Voltage Regulator (AP2112K)',
      category: 'ic',
      symbolDefId: 'sym_ldo',
      pins: [
        { id: 'p1', number: '1', name: 'VIN', electricalType: 'power_in', x: -7.62, y: -2.54, length: 2.54, orientation: 0, visible: true },
        { id: 'p2', number: '2', name: 'GND', electricalType: 'power_in', x: 0, y: 7.62, length: 2.54, orientation: 270, visible: true },
        { id: 'p3', number: '3', name: 'EN', electricalType: 'input', x: -7.62, y: 2.54, length: 2.54, orientation: 0, visible: true },
        { id: 'p4', number: '4', name: 'NC', electricalType: 'not_connected', x: 7.62, y: 2.54, length: 2.54, orientation: 180, visible: false },
        { id: 'p5', number: '5', name: 'VOUT', electricalType: 'power_out', x: 7.62, y: -2.54, length: 2.54, orientation: 180, visible: true },
      ],
      parameters: { OutputVoltage: '3.3V', MaxCurrent: '600mA', Dropout: '250mV' },
      defaultValue: 'AP2112K-3.3',
      footprintCandidates: ['Package_TO_SOT_SMD:SOT-23-5'],
      defaultFootprint: 'Package_TO_SOT_SMD:SOT-23-5',
      model3DCandidates: ['SOT-23-5'],
      metadata: {
        mpn: 'AP2112K-3.3',
        description: '600mA Low Dropout Linear Voltage Regulator',
        keywords: ['ldo', 'regulator', '3.3v', 'power', 'ap2112k', 'ams1117'],
      },
      source: 'built_in',
    });

    this.initialized = true;
  }

  public static register(comp: ComponentDefinition): void {
    this.components.set(comp.componentId, comp);
  }

  public static get(componentId: string): ComponentDefinition | undefined {
    this.initialize();
    return this.components.get(componentId);
  }

  public static getAll(): ComponentDefinition[] {
    this.initialize();
    return Array.from(this.components.values());
  }

  /**
   * Universal component search engine supporting partial name, value, MPN, symbol, footprint, category.
   */
  public static search(query: string): ComponentDefinition[] {
    this.initialize();
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();

    return this.getAll().filter((comp) => {
      const matchName = comp.name.toLowerCase().includes(q);
      const matchCat = comp.category.toLowerCase().includes(q);
      const matchVal = comp.defaultValue.toLowerCase().includes(q);
      const matchMpn = comp.metadata.mpn?.toLowerCase().includes(q) || false;
      const matchDesc = comp.metadata.description.toLowerCase().includes(q);
      const matchFp = comp.defaultFootprint.toLowerCase().includes(q) || comp.footprintCandidates.some((f) => f.toLowerCase().includes(q));
      const matchKey = comp.metadata.keywords?.some((k) => k.toLowerCase().includes(q)) || false;

      return matchName || matchCat || matchVal || matchMpn || matchDesc || matchFp || matchKey;
    });
  }

  /**
   * Verifies pin-to-pad compatibility between a symbol definition and a footprint definition.
   */
  public static verifyPinPadCompatibility(
    symbolOrPins: string | SchematicPin[] | SymbolDefinition,
    footprintOrId: string | FootprintDefinition
  ): { compatible: boolean; missingPads: string[]; extraPads: string[] } {
    let pins: SchematicPin[] = [];
    if (typeof symbolOrPins === 'string') {
      const symDef = libraryRegistry.getSymbolById(symbolOrPins);
      pins = symDef ? symDef.pins : [];
    } else if (Array.isArray(symbolOrPins)) {
      pins = symbolOrPins;
    } else if (symbolOrPins && 'pins' in symbolOrPins) {
      pins = symbolOrPins.pins;
    }

    let fpDef: FootprintDefinition | undefined;
    if (typeof footprintOrId === 'string') {
      fpDef = footprintLibrary.getFootprint(footprintOrId);
    } else {
      fpDef = footprintOrId;
    }

    if (!fpDef || pins.length === 0) {
      return {
        compatible: true, // If unassigned or dynamic, bypass
        missingPads: [],
        extraPads: [],
      };
    }

    const normalizePin = (n: string): string => {
      const u = n.toUpperCase();
      if (u === 'A' || u === '+') return '1';
      if (u === 'K' || u === '-') return '2';
      return u;
    };

    const symPinNums = new Set(pins.filter((p) => p.electricalType !== 'not_connected').map((p) => normalizePin(p.number)));
    const fpPadNums = new Set(fpDef.pads.map((p) => normalizePin(p.number)));

    const missingPads: string[] = [];
    symPinNums.forEach((num) => {
      if (!fpPadNums.has(num)) missingPads.push(num);
    });

    const extraPads: string[] = [];
    fpPadNums.forEach((num) => {
      if (!symPinNums.has(num)) extraPads.push(num);
    });

    return {
      compatible: missingPads.length === 0,
      missingPads,
      extraPads,
    };
  }
}
