/**
 * Apex EDA - Authoritative Canonical Data Model Types
 * Single source of truth for the entire EDA platform.
 */

// ==========================================
// 1. Primitive Coordinate & Geometric Types
// ==========================================

export interface Point2D {
  x: number; // in mm or schematic grid units
  y: number;
}

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type UnitType = 'mm' | 'mil' | 'inch';

// ==========================================
// 2. Schematic Types
// ==========================================

export type PinElectricalType =
  | 'input'
  | 'output'
  | 'bidirectional'
  | 'tri_state'
  | 'passive'
  | 'unspecified'
  | 'power_in'
  | 'power_out'
  | 'open_collector'
  | 'open_emitter'
  | 'not_connected';

export type PinGraphicStyle = 'line' | 'inverted' | 'clock' | 'inverted_clock' | 'input_low' | 'output_low';

export interface SchematicPin {
  id: string;
  number: string;
  name: string;
  electricalType: PinElectricalType;
  graphicStyle?: PinGraphicStyle;
  x: number; // relative to symbol origin
  y: number;
  length: number;
  orientation: 0 | 90 | 180 | 270;
  visible: boolean;
}

export interface SymbolGraphicShape {
  type: 'rectangle' | 'circle' | 'arc' | 'line' | 'polygon' | 'bezier' | 'text';
  points?: Point2D[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  counterclockwise?: boolean;
  filled?: boolean;
  strokeWidth?: number;
  color?: string;
  text?: string;
  fontSize?: number;
  rotation?: number;
  unit?: number;
}

export interface SymbolUnitDefinition {
  unit: number; // 1 = A, 2 = B, 3 = C, etc. (0 = shared across all units)
  name?: string; // 'A', 'B', 'C', 'Power', etc.
  pins: SchematicPin[];
  shapes: SymbolGraphicShape[];
  alternateShapes?: SymbolGraphicShape[];
  isPower?: boolean;
  description?: string;
}

export interface SymbolDefinition {
  id: string;
  name: string;
  library: string;
  description: string;
  keywords: string[];
  category: string;
  defaultPrefix: string; // 'R', 'C', 'U', 'D', 'J', etc.
  defaultFootprint: string;
  pins: SchematicPin[];
  shapes: SymbolGraphicShape[];
  datasheet?: string;
  customFields?: Record<string, string>;
  isPower?: boolean;
  powerNetName?: string;
  unitCount?: number;
  units?: SymbolUnitDefinition[];
}

export interface SchematicSymbolInstance {
  id: string;
  symbolDefId: string;
  reference: string; // 'R1', 'U2', etc.
  value: string; // '10k', 'STM32F401', etc.
  footprint: string; // 'Resistor_SMD:R_0805_2012Metric'
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  mirrorX: boolean;
  unit: number;
  unitSuffix?: string;
  locked?: boolean;
  fields: Record<string, string>;
  pins: SchematicPin[]; // populated with absolute/relative coordinates
}

export interface SchematicWireSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  netName?: string;
}

export interface SchematicJunction {
  id: string;
  x: number;
  y: number;
  netName?: string;
}

export interface SchematicNetLabel {
  id: string;
  text: string;
  type: 'local' | 'global' | 'hierarchical';
  x: number;
  y: number;
  orientation: 0 | 90 | 180 | 270;
}

export interface SchematicPowerSymbol {
  id: string;
  netName: string; // 'VCC', '+3.3V', '+5V', 'GND'
  x: number;
  y: number;
  orientation: 0 | 90 | 180 | 270;
}

export interface HierarchicalSheet {
  id: string;
  name: string;
  filename: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pins: Array<{
    id: string;
    name: string;
    type: 'input' | 'output' | 'bidirectional';
    side: 'left' | 'right' | 'top' | 'bottom';
    offset: number;
  }>;
}

export interface SchematicSheet {
  id: string;
  title: string;
  sheetNumber: number;
  symbols: SchematicSymbolInstance[];
  wires: SchematicWireSegment[];
  junctions: SchematicJunction[];
  labels: SchematicNetLabel[];
  powerSymbols: SchematicPowerSymbol[];
  hierarchicalSheets: HierarchicalSheet[];
  texts: Array<{ id: string; text: string; x: number; y: number; fontSize: number; color?: string }>;
}

export interface SchematicData {
  sheets: SchematicSheet[];
  activeSheetId: string;
}

// ==========================================
// 3. PCB & Geometry Types
// ==========================================

export type PCBLayerId =
  | 'F.Cu'
  | 'In1.Cu'
  | 'In2.Cu'
  | 'In3.Cu'
  | 'In4.Cu'
  | 'B.Cu'
  | 'F.Silkscreen'
  | 'B.Silkscreen'
  | 'F.Mask'
  | 'B.Mask'
  | 'F.Paste'
  | 'B.Paste'
  | 'F.CrtYd'
  | 'B.CrtYd'
  | 'F.Fab'
  | 'B.Fab'
  | 'Edge.Cuts'
  | 'Dwgs.User'
  | 'Margin';

export type PadShape = 'rect' | 'roundrect' | 'circle' | 'oval';
export type PadType = 'smd' | 'through_hole' | 'npth';

export interface PCBPad {
  id: string;
  number: string;
  name: string;
  type: PadType;
  shape: PadShape;
  x: number; // relative to footprint
  y: number;
  width: number; // in mm
  height: number;
  drillDiameter?: number; // for through-hole
  layers: PCBLayerId[];
  netId?: string;
  netName?: string;
  roundRadiusRatio?: number; // for roundrect
  thermalRelief?: boolean;
}

export interface FootprintGraphicShape {
  type: 'line' | 'rect' | 'circle' | 'arc' | 'polygon' | 'text';
  layer: PCBLayerId;
  points?: Point2D[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
}

export interface Model3DReference {
  modelPath: string;
  packageType: string; // '0805', 'LQFP-48', 'SOIC-8', 'USB-C', 'DIP-8', etc.
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  colorBody?: string;
  colorPin?: string;
}

export interface FootprintDefinition {
  id: string;
  name: string;
  library: string;
  description: string;
  keywords: string[];
  category: string;
  pads: PCBPad[];
  shapes: FootprintGraphicShape[];
  courtyard: BoundingBox2D;
  model3D?: Model3DReference;
  isSMD: boolean;
}

export interface PCBFootprintInstance {
  id: string;
  footprintDefId: string;
  reference: string;
  value: string;
  layer: 'F.Cu' | 'B.Cu';
  x: number;
  y: number;
  rotation: number; // in degrees 0, 45, 90, 180, etc.
  locked?: boolean;
  pads: PCBPad[];
  shapes: FootprintGraphicShape[];
  courtyard: BoundingBox2D;
  model3D?: Model3DReference;
}

export interface PCBTrackSegment {
  id: string;
  netId: string;
  netName: string;
  layer: PCBLayerId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number; // in mm
  locked?: boolean;
}

export type ViaType = 'through' | 'blind' | 'buried' | 'microvia';

export interface PCBVia {
  id: string;
  netId: string;
  netName: string;
  x: number;
  y: number;
  diameter: number; // in mm (e.g. 0.8)
  drillDiameter: number; // in mm (e.g. 0.4)
  startLayer: PCBLayerId;
  endLayer: PCBLayerId;
  type: ViaType;
  locked?: boolean;
}

export interface PCBZone {
  id: string;
  netId: string;
  netName: string;
  layer: PCBLayerId;
  priority: number;
  clearance: number; // in mm
  minWidth: number;
  thermalReliefWidth: number;
  thermalReliefGap: number;
  points: Point2D[];
  filledPolygons?: Point2D[][];
  isFilled: boolean;
  keepIslands: boolean;
}

export interface PCBKeepout {
  id: string;
  layer: PCBLayerId | 'All';
  points: Point2D[];
  noTracks: boolean;
  noVias: boolean;
  noCopperPour: boolean;
  noComponents: boolean;
}

export interface PCBTextGraphic {
  id: string;
  text: string;
  layer: PCBLayerId;
  x: number;
  y: number;
  fontSize: number;
  strokeWidth: number;
  rotation: number;
  mirror: boolean;
}

export interface PCBDimension {
  id: string;
  layer: PCBLayerId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset: number;
  value: number; // in mm
  units: UnitType;
}

export interface StackupLayer {
  id: string;
  name: string;
  type: 'copper' | 'core' | 'prepreg' | 'soldermask' | 'silkscreen';
  thicknessMm: number;
  dielectricConstant?: number;
  lossTangent?: number;
  color?: string;
}

export interface PCBData {
  boardOutline: Point2D[];
  stackup: StackupLayer[];
  footprints: PCBFootprintInstance[];
  tracks: PCBTrackSegment[];
  vias: PCBVia[];
  zones: PCBZone[];
  keepouts: PCBKeepout[];
  graphics: FootprintGraphicShape[];
  texts: PCBTextGraphic[];
  dimensions: PCBDimension[];
}

// ==========================================
// 4. Netlist & Connectivity Graph
// ==========================================

export interface NetPinRef {
  symbolId: string;
  symbolRef: string;
  pinNumber: string;
  pinName: string;
}

export interface NetPadRef {
  footprintId: string;
  footprintRef: string;
  padNumber: string;
}

export interface NetNode {
  id: string;
  name: string;
  isPower: boolean;
  pins: NetPinRef[];
  pads: NetPadRef[];
  netClass: string;
}

export interface NetGraph {
  nets: Record<string, NetNode>;
}

// ==========================================
// 5. Design Rules & Constraints
// ==========================================

export interface NetClass {
  name: string;
  description: string;
  clearance: number; // in mm
  trackWidth: number; // in mm
  viaDiameter: number;
  viaDrill: number;
  diffPairWidth?: number;
  diffPairGap?: number;
}

export interface DesignRules {
  defaultNetClass: NetClass;
  customNetClasses: Record<string, NetClass>;
  minClearance: number;
  minTrackWidth: number;
  minViaDiameter: number;
  minDrillDiameter: number;
  minAnnularRing: number;
  boardEdgeClearance: number;
  courtyardClearance: number;
  silkscreenClearance: number;
  maskClearance: number;
  maxTrackLength?: number;
  maxSkewMm?: number;
}

// ==========================================
// 6. Rules & Violation Diagnostics (ERC & DRC)
// ==========================================

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticViolation {
  id: string;
  code: string;
  severity: DiagnosticSeverity;
  source: 'ERC' | 'DRC';
  title: string;
  description: string;
  sheetId?: string;
  x: number;
  y: number;
  objectIds: string[];
  ignored?: boolean;
}

export interface ERCConfiguration {
  checkUnconnectedPins: boolean;
  checkDanglingWires: boolean;
  checkPinTypeConflicts: boolean;
  checkMissingPowerDrivers: boolean;
  checkDuplicateReferences: boolean;
  checkEmptyValues: boolean;
}

export interface DRCConfiguration {
  checkClearances: boolean;
  checkTrackWidths: boolean;
  checkViaHoles: boolean;
  checkBoardEdge: boolean;
  checkCourtyardCollisions: boolean;
  checkUnconnectedNets: boolean;
  checkSilkscreenOverPads: boolean;
  checkKeepouts: boolean;
}

// ==========================================
// 7. SPICE Simulation Types
// ==========================================

export type SimulationType = 'dc_operating_point' | 'dc_sweep' | 'transient' | 'ac_frequency';

export interface SimulationConfig {
  type: SimulationType;
  stopTime: number; // for transient (e.g. 0.01s)
  timeStep: number; // e.g. 1e-6s
  dcSource?: string;
  dcStart?: number;
  dcStop?: number;
  dcStep?: number;
  acStartFreq?: number;
  acStopFreq?: number;
  acPointsPerDecade?: number;
  probes: Array<{
    id: string;
    netName: string;
    type: 'voltage' | 'current';
    color: string;
  }>;
}

export interface SimulationResultPoint {
  timeOrFreqOrDc: number;
  values: Record<string, number>; // netName -> voltage / current
}

export interface SimulationResults {
  type: SimulationType;
  variableName: 'Time (s)' | 'Frequency (Hz)' | 'Voltage (V)';
  traces: Record<string, number[]>; // netName -> array of values
  timeline: number[]; // X axis data
}

// ==========================================
// 8. Manufacturing & Fabrication
// ==========================================

export interface ManufacturingConfig {
  gerberFormat: '4.4' | '4.6';
  excellonUnits: 'mm' | 'inch';
  includeSilkscreen: boolean;
  includeMask: boolean;
  includePaste: boolean;
  includeEdgeCuts: boolean;
  includeFabDrawings: boolean;
  generatePickAndPlace: boolean;
  generateBOM: boolean;
  generateDrillMap: boolean;
  companyName: string;
  designer: string;
  revision: string;
}

export interface BOMEntry {
  reference: string;
  value: string;
  footprint: string;
  quantity: number;
  description: string;
  manufacturer: string;
  mpn: string;
  supplier: string;
  sku: string;
  designators: string[];
}

// ==========================================
// 9. Root Project Model
// ==========================================

export interface ProjectMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  units: UnitType;
}

export interface ProjectSettings {
  gridSpacingSchematic: number; // default 2.54mm / 100mil
  gridSpacingPCB: number; // default 0.5mm / 20mil
  snapToGrid: boolean;
  snapToObjects: boolean;
  theme: 'dark' | 'light';
  highContrast: boolean;
  autoSaveIntervalSec: number;
}

export interface ApexProject {
  metadata: ProjectMetadata;
  schematic: SchematicData;
  pcb: PCBData;
  netGraph: NetGraph;
  designRules: DesignRules;
  ercConfig: ERCConfiguration;
  drcConfig: DRCConfiguration;
  simConfig: SimulationConfig;
  mfgConfig: ManufacturingConfig;
  settings: ProjectSettings;
}
