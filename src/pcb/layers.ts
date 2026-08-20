/**
 * FloZ EDA - Professional Multi-Layer PCB System
 * Layer definitions, categories, standard color schemes, and layer helper utilities.
 */

import { PCBLayerId } from '../core/types';

export type LayerCategory = 'copper' | 'silkscreen' | 'mask' | 'paste' | 'adhesive' | 'courtyard' | 'fab' | 'mechanical' | 'user';

export interface LayerMetadata {
  id: PCBLayerId;
  name: string;
  category: LayerCategory;
  isCopper: boolean;
  color: string;
  defaultOpacity: number;
  description: string;
  side?: 'top' | 'bottom' | 'inner' | 'all';
}

export const STANDARD_PCB_LAYERS: LayerMetadata[] = [
  // 1. Top Technical Layers
  {
    id: 'F.Courtyard',
    name: 'F.Courtyard',
    category: 'courtyard',
    isCopper: false,
    color: '#a855f7', // Purple
    defaultOpacity: 0.6,
    description: 'Front Component Boundary & Clearance Area',
    side: 'top',
  },
  {
    id: 'F.Fab',
    name: 'F.Fab',
    category: 'fab',
    isCopper: false,
    color: '#38bdf8', // Light Blue
    defaultOpacity: 0.8,
    description: 'Front Assembly & Component Fabrication Drawing',
    side: 'top',
  },
  {
    id: 'F.Adhesive',
    name: 'F.Adhesive',
    category: 'adhesive',
    isCopper: false,
    color: '#ec4899', // Pink
    defaultOpacity: 0.7,
    description: 'Front SMD Adhesive Glue Dots',
    side: 'top',
  },
  {
    id: 'F.Paste',
    name: 'F.Paste',
    category: 'paste',
    isCopper: false,
    color: '#94a3b8', // Silver
    defaultOpacity: 0.85,
    description: 'Front Solder Paste Stencil Openings',
    side: 'top',
  },
  {
    id: 'F.Silkscreen',
    name: 'F.Silkscreen',
    category: 'silkscreen',
    isCopper: false,
    color: '#f8fafc', // Crisp White
    defaultOpacity: 1.0,
    description: 'Front Legend, Reference Designators & Polarity',
    side: 'top',
  },
  {
    id: 'F.Mask',
    name: 'F.Mask',
    category: 'mask',
    isCopper: false,
    color: '#15803d', // Solder Mask Green
    defaultOpacity: 0.75,
    description: 'Front Solder Mask Negative/Clearance',
    side: 'top',
  },

  // 2. Copper Layers
  {
    id: 'F.Cu',
    name: 'F.Cu (Top Copper)',
    category: 'copper',
    isCopper: true,
    color: '#e05638', // Red / Orange
    defaultOpacity: 0.9,
    description: 'Primary Top Copper Conductor Layer',
    side: 'top',
  },
  {
    id: 'In1.Cu',
    name: 'In1.Cu (Inner 1)',
    category: 'copper',
    isCopper: true,
    color: '#d97706', // Amber
    defaultOpacity: 0.85,
    description: 'Inner Copper Layer 1 (e.g. GND Plane)',
    side: 'inner',
  },
  {
    id: 'In2.Cu',
    name: 'In2.Cu (Inner 2)',
    category: 'copper',
    isCopper: true,
    color: '#059669', // Emerald
    defaultOpacity: 0.85,
    description: 'Inner Copper Layer 2 (e.g. VCC Plane)',
    side: 'inner',
  },
  {
    id: 'In3.Cu',
    name: 'In3.Cu (Inner 3)',
    category: 'copper',
    isCopper: true,
    color: '#0284c7', // Cyan
    defaultOpacity: 0.85,
    description: 'Inner Copper Layer 3',
    side: 'inner',
  },
  {
    id: 'In4.Cu',
    name: 'In4.Cu (Inner 4)',
    category: 'copper',
    isCopper: true,
    color: '#7c3aed', // Violet
    defaultOpacity: 0.85,
    description: 'Inner Copper Layer 4',
    side: 'inner',
  },
  {
    id: 'B.Cu',
    name: 'B.Cu (Bottom Copper)',
    category: 'copper',
    isCopper: true,
    color: '#3b82f6', // Blue
    defaultOpacity: 0.9,
    description: 'Primary Bottom Copper Conductor Layer',
    side: 'bottom',
  },

  // 3. Bottom Technical Layers
  {
    id: 'B.Mask',
    name: 'B.Mask',
    category: 'mask',
    isCopper: false,
    color: '#047857', // Deep Mask Green
    defaultOpacity: 0.75,
    description: 'Bottom Solder Mask Negative/Clearance',
    side: 'bottom',
  },
  {
    id: 'B.Silkscreen',
    name: 'B.Silkscreen',
    category: 'silkscreen',
    isCopper: false,
    color: '#c084fc', // Soft Violet / White
    defaultOpacity: 0.95,
    description: 'Bottom Legend & Markings',
    side: 'bottom',
  },
  {
    id: 'B.Paste',
    name: 'B.Paste',
    category: 'paste',
    isCopper: false,
    color: '#64748b', // Slate
    defaultOpacity: 0.85,
    description: 'Bottom Solder Paste Openings',
    side: 'bottom',
  },
  {
    id: 'B.Adhesive',
    name: 'B.Adhesive',
    category: 'adhesive',
    isCopper: false,
    color: '#db2777', // Magenta
    defaultOpacity: 0.7,
    description: 'Bottom SMD Adhesive Glue Dots',
    side: 'bottom',
  },
  {
    id: 'B.Fab',
    name: 'B.Fab',
    category: 'fab',
    isCopper: false,
    color: '#60a5fa', // Blue
    defaultOpacity: 0.8,
    description: 'Bottom Assembly Drawing',
    side: 'bottom',
  },
  {
    id: 'B.Courtyard',
    name: 'B.Courtyard',
    category: 'courtyard',
    isCopper: false,
    color: '#c084fc', // Lilac
    defaultOpacity: 0.6,
    description: 'Bottom Component Boundary',
    side: 'bottom',
  },

  // 4. Mechanical & Outline
  {
    id: 'Edge.Cuts',
    name: 'Edge.Cuts',
    category: 'mechanical',
    isCopper: false,
    color: '#eab308', // Bright Yellow
    defaultOpacity: 1.0,
    description: 'Physical Board Outline, Cutouts & V-Grooves',
    side: 'all',
  },
  {
    id: 'Margin',
    name: 'Margin',
    category: 'mechanical',
    isCopper: false,
    color: '#dc2626', // Red
    defaultOpacity: 0.6,
    description: 'Board Edge Keepout Clearance Margin',
    side: 'all',
  },
  {
    id: 'Dwgs.User',
    name: 'User.Drawings',
    category: 'user',
    isCopper: false,
    color: '#94a3b8', // Gray
    defaultOpacity: 0.7,
    description: 'User Mechanical Drawings & Annotations',
    side: 'all',
  },
  {
    id: 'User.Comments',
    name: 'User.Comments',
    category: 'user',
    isCopper: false,
    color: '#64748b', // Slate
    defaultOpacity: 0.7,
    description: 'Engineering Notes & Assembly Instructions',
    side: 'all',
  },
  {
    id: 'User.Eco1',
    name: 'User.Eco1',
    category: 'user',
    isCopper: false,
    color: '#14b8a6', // Teal
    defaultOpacity: 0.7,
    description: 'Engineering Change Order Revision 1',
    side: 'all',
  },
  {
    id: 'User.Eco2',
    name: 'User.Eco2',
    category: 'user',
    isCopper: false,
    color: '#f59e0b', // Amber
    defaultOpacity: 0.7,
    description: 'Engineering Change Order Revision 2',
    side: 'all',
  },
];

export class LayerManagerUtils {
  private static layerMap = new Map<string, LayerMetadata>(
    STANDARD_PCB_LAYERS.map((l) => [l.id, l])
  );

  public static getMetadata(layerId: string): LayerMetadata {
    // Aliases
    if (layerId === 'F.CrtYd') return this.layerMap.get('F.Courtyard')!;
    if (layerId === 'B.CrtYd') return this.layerMap.get('B.Courtyard')!;
    return this.layerMap.get(layerId) || {
      id: layerId as PCBLayerId,
      name: layerId,
      category: 'user',
      isCopper: layerId.endsWith('.Cu'),
      color: layerId.endsWith('.Cu') ? '#3b82f6' : '#94a3b8',
      defaultOpacity: 0.8,
      description: layerId,
    };
  }

  public static isCopper(layerId: string): boolean {
    return layerId.endsWith('.Cu');
  }

  public static getLayerColor(layerId: string, customColors?: Record<string, string>): string {
    if (customColors && customColors[layerId]) return customColors[layerId];
    return this.getMetadata(layerId).color;
  }

  public static getOppositeCopperLayer(currentLayer: PCBLayerId): PCBLayerId {
    if (currentLayer === 'F.Cu') return 'B.Cu';
    if (currentLayer === 'B.Cu') return 'F.Cu';
    return 'B.Cu';
  }

  public static getCopperLayers(): LayerMetadata[] {
    return STANDARD_PCB_LAYERS.filter((l) => l.isCopper);
  }

  public static getTechnicalLayers(): LayerMetadata[] {
    return STANDARD_PCB_LAYERS.filter((l) => !l.isCopper);
  }
}
