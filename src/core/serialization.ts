/**
 * Apex EDA - Serialization & Project Persistence Engine
 * Deterministic JSON serialization, schema migrations, and recovery snapshots.
 */

import { ApexProject } from './types';

const SCHEMA_VERSION = '1.0.0';
const AUTOSAVE_STORAGE_KEY = 'apex_eda_autosave_latest';
const BACKUP_STORAGE_KEY_PREFIX = 'apex_eda_backup_';

export class ProjectSerializer {
  public static serialize(project: ApexProject): string {
    const cleanProject = {
      ...project,
      metadata: {
        ...project.metadata,
        version: SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
      },
    };
    return JSON.stringify(cleanProject, null, 2);
  }

  public static deserialize(jsonStr: string): ApexProject {
    try {
      const parsed = JSON.parse(jsonStr);
      return this.migrate(parsed);
    } catch (err: any) {
      throw new Error(`Failed to parse Apex EDA project file: ${err.message}`);
    }
  }

  private static migrate(data: any): ApexProject {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid project file payload: expected an object');
    }

    // Ensure basic required sections exist
    if (!data.metadata) {
      data.metadata = {
        id: `proj_${Date.now()}`,
        name: 'Untitled Project',
        version: SCHEMA_VERSION,
        author: 'Anonymous Engineer',
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        units: 'mm',
      };
    }

    if (!data.schematic || !Array.isArray(data.schematic.sheets)) {
      data.schematic = {
        sheets: [
          {
            id: 'sheet_1',
            title: 'Top Sheet',
            sheetNumber: 1,
            symbols: [],
            wires: [],
            junctions: [],
            labels: [],
            powerSymbols: [],
            hierarchicalSheets: [],
            texts: [],
          },
        ],
        activeSheetId: 'sheet_1',
      };
    }

    if (!data.pcb) {
      data.pcb = {
        boardOutline: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 80 },
          { x: 0, y: 80 },
        ],
        stackup: [
          { id: 'l_fcu', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' },
          { id: 'l_core', name: 'FR4 Core', type: 'core', thicknessMm: 1.5, dielectricConstant: 4.5 },
          { id: 'l_bcu', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' },
        ],
        footprints: [],
        tracks: [],
        vias: [],
        zones: [],
        keepouts: [],
        graphics: [],
        texts: [],
        dimensions: [],
      };
    }

    if (!data.netGraph) {
      data.netGraph = { nets: {} };
    }

    if (!data.designRules) {
      data.designRules = {
        defaultNetClass: {
          name: 'Default',
          description: 'Standard Signal Traces',
          clearance: 0.2, // 0.2mm (approx 8 mil)
          trackWidth: 0.25, // 0.25mm (10 mil)
          viaDiameter: 0.8,
          viaDrill: 0.4,
        },
        customNetClasses: {
          Power: {
            name: 'Power',
            description: 'High Current Power Traces',
            clearance: 0.3,
            trackWidth: 0.6,
            viaDiameter: 1.0,
            viaDrill: 0.5,
          },
          HighSpeed: {
            name: 'HighSpeed',
            description: 'Controlled Impedance Differential Pairs',
            clearance: 0.2,
            trackWidth: 0.2,
            viaDiameter: 0.7,
            viaDrill: 0.35,
            diffPairWidth: 0.2,
            diffPairGap: 0.15,
          },
        },
        minClearance: 0.15,
        minTrackWidth: 0.15,
        minViaDiameter: 0.6,
        minDrillDiameter: 0.3,
        minAnnularRing: 0.15,
        boardEdgeClearance: 0.5,
        courtyardClearance: 0.25,
        silkscreenClearance: 0.15,
        maskClearance: 0.05,
      };
    }

    if (!data.ercConfig) {
      data.ercConfig = {
        checkUnconnectedPins: true,
        checkDanglingWires: true,
        checkPinTypeConflicts: true,
        checkMissingPowerDrivers: true,
        checkDuplicateReferences: true,
        checkEmptyValues: true,
      };
    }

    if (!data.drcConfig) {
      data.drcConfig = {
        checkClearances: true,
        checkTrackWidths: true,
        checkViaHoles: true,
        checkBoardEdge: true,
        checkCourtyardCollisions: true,
        checkUnconnectedNets: true,
        checkSilkscreenOverPads: true,
        checkKeepouts: true,
      };
    }

    if (!data.simConfig) {
      data.simConfig = {
        type: 'transient',
        stopTime: 0.005,
        timeStep: 1e-6,
        probes: [],
      };
    }

    if (!data.mfgConfig) {
      data.mfgConfig = {
        gerberFormat: '4.6',
        excellonUnits: 'mm',
        includeSilkscreen: true,
        includeMask: true,
        includePaste: true,
        includeEdgeCuts: true,
        includeFabDrawings: true,
        generatePickAndPlace: true,
        generateBOM: true,
        generateDrillMap: true,
        companyName: 'Apex Electronics Lab',
        designer: 'Lead Engineer',
        revision: '1.0',
      };
    }

    if (!data.settings) {
      data.settings = {
        gridSpacingSchematic: 2.54,
        gridSpacingPCB: 0.5,
        snapToGrid: true,
        snapToObjects: true,
        theme: 'dark',
        highContrast: false,
        autoSaveIntervalSec: 30,
      };
    }

    return data as ApexProject;
  }

  public static saveToAutosave(project: ApexProject): void {
    try {
      const serialized = this.serialize(project);
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, serialized);
      localStorage.setItem(
        `${BACKUP_STORAGE_KEY_PREFIX}${project.metadata.id}`,
        serialized
      );
    } catch (e) {
      console.warn('LocalStorage quota or access restriction during autosave:', e);
    }
  }

  public static loadFromAutosave(): ApexProject | null {
    try {
      const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!saved) return null;
      return this.deserialize(saved);
    } catch (e) {
      console.error('Failed to load autosaved project:', e);
      return null;
    }
  }

  public static exportToFile(project: ApexProject, filename?: string): void {
    const jsonStr = this.serialize(project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${project.metadata.name.replace(/\s+/g, '_').toLowerCase()}.apexprj`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
