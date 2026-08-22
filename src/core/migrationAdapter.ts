/**
 * FloZ EDA - Project Schema 2.0 Migration & Compatibility Adapter
 * Ensures non-breaking backward compatibility with legacy project models and seamless upgrades.
 */

import { ApexProject, StackupLayer, PCBLayerId } from './types';

export class ProjectMigrationAdapter {
  public static readonly CURRENT_SCHEMA_VERSION = '2.0';

  /**
   * Upgrades any project data (v1.0 or unversioned) to Schema 2.0
   */
  public static migrate(project: any): ApexProject {
    if (!project || typeof project !== 'object') {
      throw new Error('Invalid project structure');
    }

    const currentVersion = project.metadata?.schemaVersion || project.metadata?.version || '1.0';

    const migrated: ApexProject = JSON.parse(JSON.stringify(project));

    // Ensure metadata schemaVersion is set
    if (!migrated.metadata) {
      migrated.metadata = {
        id: `proj_${Date.now()}`,
        name: 'Untitled Project',
        version: '1.0.0',
        author: 'FloZ User',
        description: 'FloZ EDA Design Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        units: 'mm',
      };
    }
    migrated.metadata.schemaVersion = this.CURRENT_SCHEMA_VERSION;

    // Ensure Schematic sheets have all arrays initialized
    if (!migrated.schematic) {
      migrated.schematic = {
        sheets: [],
        activeSheetId: 'sheet_1',
      };
    }
    if (!Array.isArray(migrated.schematic.sheets) || migrated.schematic.sheets.length === 0) {
      migrated.schematic.sheets = [
        {
          id: 'sheet_1',
          title: 'Sheet 1',
          sheetNumber: 1,
          symbols: [],
          wires: [],
          junctions: [],
          labels: [],
          powerSymbols: [],
          hierarchicalSheets: [],
          texts: [],
        },
      ];
      migrated.schematic.activeSheetId = 'sheet_1';
    } else {
      migrated.schematic.sheets.forEach((sheet) => {
        sheet.symbols = sheet.symbols || [];
        sheet.wires = sheet.wires || [];
        sheet.junctions = sheet.junctions || [];
        sheet.labels = sheet.labels || [];
        sheet.powerSymbols = sheet.powerSymbols || [];
        sheet.hierarchicalSheets = sheet.hierarchicalSheets || [];
        sheet.texts = sheet.texts || [];
      });
    }

    // Ensure PCB Data structure
    if (!migrated.pcb) {
      migrated.pcb = {
        boardOutline: [],
        stackup: [],
        footprints: [],
        tracks: [],
        vias: [],
        zones: [],
        keepouts: [],
        graphics: [],
        texts: [],
        dimensions: [],
        boardThickness: 1.6,
        solderMaskColor: '#15803d',
        silkscreenColor: '#ffffff',
      };
    }

    migrated.pcb.boardOutline = migrated.pcb.boardOutline || [];
    migrated.pcb.footprints = migrated.pcb.footprints || [];
    migrated.pcb.tracks = migrated.pcb.tracks || [];
    migrated.pcb.vias = migrated.pcb.vias || [];
    migrated.pcb.zones = migrated.pcb.zones || [];
    migrated.pcb.keepouts = migrated.pcb.keepouts || [];
    migrated.pcb.graphics = migrated.pcb.graphics || [];
    migrated.pcb.texts = migrated.pcb.texts || [];
    migrated.pcb.dimensions = migrated.pcb.dimensions || [];
    migrated.pcb.boardThickness = migrated.pcb.boardThickness || 1.6;
    migrated.pcb.solderMaskColor = migrated.pcb.solderMaskColor || '#15803d';
    migrated.pcb.silkscreenColor = migrated.pcb.silkscreenColor || '#ffffff';

    // Ensure Stackup contains standard 2-layer default if empty
    if (!Array.isArray(migrated.pcb.stackup) || migrated.pcb.stackup.length === 0) {
      migrated.pcb.stackup = this.createDefaultStackup(2);
    }

    // Ensure netGraph & design rules
    migrated.netGraph = migrated.netGraph || { nets: {} };
    migrated.netGraph.nets = migrated.netGraph.nets || {};

    if (!migrated.designRules) {
      migrated.designRules = {
        defaultNetClass: {
          name: 'Default',
          description: 'Standard Signal Class',
          clearance: 0.2,
          trackWidth: 0.25,
          viaDiameter: 0.8,
          viaDrill: 0.4,
        },
        customNetClasses: {},
        minClearance: 0.15,
        minTrackWidth: 0.15,
        minViaDiameter: 0.5,
        minDrillDiameter: 0.3,
        minAnnularRing: 0.15,
        boardEdgeClearance: 0.5,
        courtyardClearance: 0.25,
        silkscreenClearance: 0.15,
        maskClearance: 0.05,
      };
    }

    // Ensure project settings
    migrated.settings = migrated.settings || {
      gridSpacingSchematic: 2.54,
      gridSpacingPCB: 0.5,
      snapToGrid: true,
      snapToObjects: true,
      theme: 'dark',
      highContrast: false,
      autoSaveIntervalSec: 60,
    };

    return migrated;
  }

  /**
   * Generates a standard multilayer stackup configuration
   */
  public static createDefaultStackup(layerCount: 1 | 2 | 4 | 6 | 8 = 2, isFlex = false): StackupLayer[] {
    const stackup: StackupLayer[] = [];

    // Top Silkscreen & Soldermask
    stackup.push({
      id: 'top_silkscreen',
      name: 'F.Silkscreen',
      type: 'silkscreen',
      thicknessMm: 0.01,
      color: '#f8fafc',
    });
    stackup.push({
      id: 'top_soldermask',
      name: 'F.Mask',
      type: 'soldermask',
      thicknessMm: 0.02,
      color: isFlex ? '#f59e0b' : '#15803d',
    });

    if (layerCount === 1) {
      stackup.push({
        id: 'layer_f_cu',
        name: 'F.Cu (Top Copper)',
        type: 'copper',
        thicknessMm: 0.035, // 1oz
        color: '#e05638',
      });
      stackup.push({
        id: 'core_1',
        name: isFlex ? 'Polyimide Flex Core' : 'FR-4 Substrate',
        type: 'core',
        thicknessMm: 1.5,
        dielectricConstant: isFlex ? 3.4 : 4.5,
        lossTangent: isFlex ? 0.005 : 0.02,
      });
    } else if (layerCount === 2) {
      stackup.push({
        id: 'layer_f_cu',
        name: 'F.Cu (Top Copper)',
        type: 'copper',
        thicknessMm: 0.035,
        color: '#e05638',
      });
      stackup.push({
        id: 'core_1',
        name: isFlex ? 'Polyimide Flex Core' : 'FR-4 Substrate',
        type: 'core',
        thicknessMm: 1.5,
        dielectricConstant: isFlex ? 3.4 : 4.5,
        lossTangent: isFlex ? 0.005 : 0.02,
      });
      stackup.push({
        id: 'layer_b_cu',
        name: 'B.Cu (Bottom Copper)',
        type: 'copper',
        thicknessMm: 0.035,
        color: '#3b82f6',
      });
    } else if (layerCount === 4) {
      stackup.push({ id: 'layer_f_cu', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' });
      stackup.push({ id: 'prepreg_1', name: 'Prepreg 2116', type: 'prepreg', thicknessMm: 0.2, dielectricConstant: 4.2 });
      stackup.push({ id: 'layer_in1_cu', name: 'In1.Cu (GND Plane)', type: 'copper', thicknessMm: 0.035, color: '#d97706' });
      stackup.push({ id: 'core_1', name: 'FR-4 Core', type: 'core', thicknessMm: 1.0, dielectricConstant: 4.5 });
      stackup.push({ id: 'layer_in2_cu', name: 'In2.Cu (PWR Plane)', type: 'copper', thicknessMm: 0.035, color: '#10b981' });
      stackup.push({ id: 'prepreg_2', name: 'Prepreg 2116', type: 'prepreg', thicknessMm: 0.2, dielectricConstant: 4.2 });
      stackup.push({ id: 'layer_b_cu', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' });
    } else {
      // 6 / 8 layers
      stackup.push({ id: 'layer_f_cu', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' });
      stackup.push({ id: 'prepreg_1', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.15, dielectricConstant: 4.2 });
      stackup.push({ id: 'layer_in1_cu', name: 'In1.Cu', type: 'copper', thicknessMm: 0.035, color: '#d97706' });
      stackup.push({ id: 'core_1', name: 'FR-4 Core', type: 'core', thicknessMm: 0.4, dielectricConstant: 4.5 });
      stackup.push({ id: 'layer_in2_cu', name: 'In2.Cu', type: 'copper', thicknessMm: 0.035, color: '#10b981' });
      stackup.push({ id: 'prepreg_2', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.2, dielectricConstant: 4.2 });
      stackup.push({ id: 'layer_in3_cu', name: 'In3.Cu', type: 'copper', thicknessMm: 0.035, color: '#8b5cf6' });
      stackup.push({ id: 'core_2', name: 'FR-4 Core', type: 'core', thicknessMm: 0.4, dielectricConstant: 4.5 });
      stackup.push({ id: 'layer_in4_cu', name: 'In4.Cu', type: 'copper', thicknessMm: 0.035, color: '#06b6d4' });
      stackup.push({ id: 'prepreg_3', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.15, dielectricConstant: 4.2 });
      stackup.push({ id: 'layer_b_cu', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' });
    }

    // Bottom Soldermask & Silkscreen
    stackup.push({
      id: 'bot_soldermask',
      name: 'B.Mask',
      type: 'soldermask',
      thicknessMm: 0.02,
      color: isFlex ? '#f59e0b' : '#15803d',
    });
    stackup.push({
      id: 'bot_silkscreen',
      name: 'B.Silkscreen',
      type: 'silkscreen',
      thicknessMm: 0.01,
      color: '#f8fafc',
    });

    return stackup;
  }
}
