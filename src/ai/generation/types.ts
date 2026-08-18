/**
 * FloZ ECA - AI Circuit Generation Pipeline Type Definitions
 * Data structures for design intents, structured circuit plans, library resolution, and compilation.
 */

import { Point2D, SchematicSymbolInstance, SchematicWireSegment, SchematicJunction, SchematicNetLabel, SchematicPowerSymbol } from '../../core/types';

export type ComponentDomain = 'connector' | 'protection' | 'regulator' | 'mcu' | 'sensor' | 'passives' | 'power_symbol';

export interface PlannedComponent {
  id: string;
  role: string;
  queryTerm: string;
  symbolDefId?: string;
  reference?: string;
  value: string;
  footprint?: string;
  domain: ComponentDomain;
  targetRef?: string; // e.g. for decoupling cap or pullup, which component it belongs to
  position?: Point2D;
  unit?: number;
  logicalReference?: string;
}

export interface PlannedConnection {
  from: {
    componentId: string;
    pinNumberOrName: string;
  };
  to: {
    componentId: string;
    pinNumberOrName: string;
  };
  netName?: string;
  isPower?: boolean;
}

export interface CircuitDesignPlan {
  title: string;
  description: string;
  components: PlannedComponent[];
  connections: PlannedConnection[];
  globalNets: string[];
  powerRails: string[];
}

export interface CompiledCircuit {
  symbols: SchematicSymbolInstance[];
  wires: SchematicWireSegment[];
  junctions: SchematicJunction[];
  labels: SchematicNetLabel[];
  powerSymbols: SchematicPowerSymbol[];
}
