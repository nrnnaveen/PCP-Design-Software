/**
 * FloZ EDA - Professional Appearance & Layer Manager Panel
 * 3-Tab CAD Inspector: Layers, Objects, Nets with visibility, opacity, solo mode, and net highlighting.
 */

import React, { useState } from 'react';
import { ApexProject, PCBLayerId } from '../core/types';
import { STANDARD_PCB_LAYERS, LayerMetadata } from './layers';
import {
  Layers,
  Box,
  Share2,
  Eye,
  EyeOff,
  Radio,
  Search,
  Sliders,
  CheckSquare,
  Square,
  Sparkles,
  Zap,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  activeLayer: PCBLayerId;
  onSelectActiveLayer: (layer: PCBLayerId) => void;
  layerVisibility: Record<string, boolean>;
  onToggleLayerVisibility: (layerId: string) => void;
  onSetAllLayersVisibility: (visible: boolean) => void;
  objectVisibility: Record<string, boolean>;
  onToggleObjectVisibility: (objType: string) => void;
  dimInactiveLayers: boolean;
  onToggleDimInactiveLayers: () => void;
  highlightedNet: string | null;
  onSelectHighlightNet: (netName: string | null) => void;
  customLayerColors?: Record<string, string>;
  onUpdateLayerColor?: (layerId: string, color: string) => void;
}

export const AppearancePanel: React.FC<Props> = ({
  project,
  activeLayer,
  onSelectActiveLayer,
  layerVisibility,
  onToggleLayerVisibility,
  onSetAllLayersVisibility,
  objectVisibility,
  onToggleObjectVisibility,
  dimInactiveLayers,
  onToggleDimInactiveLayers,
  highlightedNet,
  onSelectHighlightNet,
  customLayerColors = {},
}) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'objects' | 'nets'>('layers');
  const [layerSearch, setLayerSearch] = useState<string>('');
  const [netSearch, setNetSearch] = useState<string>('');

  const pcb = project.pcb;

  // Extract all distinct nets from footprints, tracks, vias, and zones
  const netMap = new Map<string, { padCount: number; trackCount: number; viaCount: number; totalLength: number }>();

  pcb.footprints.forEach((fp) => {
    fp.pads.forEach((p) => {
      const net = (p.netName || 'Unconnected').trim();
      if (!netMap.has(net)) {
        netMap.set(net, { padCount: 0, trackCount: 0, viaCount: 0, totalLength: 0 });
      }
      netMap.get(net)!.padCount++;
    });
  });

  pcb.tracks.forEach((t) => {
    const net = (t.netName || 'Unconnected').trim();
    if (!netMap.has(net)) {
      netMap.set(net, { padCount: 0, trackCount: 0, viaCount: 0, totalLength: 0 });
    }
    const data = netMap.get(net)!;
    data.trackCount++;
    data.totalLength += Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
  });

  pcb.vias.forEach((v) => {
    const net = (v.netName || 'Unconnected').trim();
    if (!netMap.has(net)) {
      netMap.set(net, { padCount: 0, trackCount: 0, viaCount: 0, totalLength: 0 });
    }
    netMap.get(net)!.viaCount++;
  });

  const netList = Array.from(netMap.entries()).sort((a, b) => b[1].padCount - a[1].padCount);

  // Filtered layers
  const filteredLayers = STANDARD_PCB_LAYERS.filter(
    (l) =>
      l.name.toLowerCase().includes(layerSearch.toLowerCase()) ||
      l.id.toLowerCase().includes(layerSearch.toLowerCase()) ||
      l.category.toLowerCase().includes(layerSearch.toLowerCase())
  );

  // Filtered nets
  const filteredNets = netList.filter(([name]) =>
    name.toLowerCase().includes(netSearch.toLowerCase())
  );

  return (
    <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col select-none text-cad-text text-xs">
      {/* 3-Tab Header Navigation */}
      <div className="h-10 bg-cad-header border-b border-cad-border flex items-center px-1 shrink-0">
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 font-semibold text-xs rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'layers'
              ? 'bg-cad-subpanel text-blue-500 dark:text-blue-400 font-bold border border-cad-border shadow-sm'
              : 'text-cad-textMuted hover:text-cad-text'
          }`}
        >
          <Layers size={13} />
          Layers
        </button>

        <button
          onClick={() => setActiveTab('objects')}
          className={`flex-1 py-1.5 font-semibold text-xs rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'objects'
              ? 'bg-cad-subpanel text-blue-500 dark:text-blue-400 font-bold border border-cad-border shadow-sm'
              : 'text-cad-textMuted hover:text-cad-text'
          }`}
        >
          <Box size={13} />
          Objects
        </button>

        <button
          onClick={() => setActiveTab('nets')}
          className={`flex-1 py-1.5 font-semibold text-xs rounded flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'nets'
              ? 'bg-cad-subpanel text-blue-500 dark:text-blue-400 font-bold border border-cad-border shadow-sm'
              : 'text-cad-textMuted hover:text-cad-text'
          }`}
        >
          <Share2 size={13} />
          Nets
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. LAYERS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'layers' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Quick Filter & Global Visibility Presets */}
          <div className="p-2 border-b border-cad-border space-y-2 bg-cad-bg/50 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-2 text-cad-textMuted" />
              <input
                type="text"
                placeholder="Filter layers..."
                value={layerSearch}
                onChange={(e) => setLayerSearch(e.target.value)}
                className="w-full bg-cad-bg border border-cad-border rounded pl-6 pr-2 py-1 text-xs text-cad-text placeholder:text-cad-textMuted/60 font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-1 text-[11px]">
              <button
                onClick={() => onSetAllLayersVisibility(true)}
                className="px-2 py-0.5 bg-cad-subpanel hover:bg-cad-border rounded border border-cad-border text-cad-textMuted hover:text-cad-text"
              >
                All On
              </button>
              <button
                onClick={() => onSetAllLayersVisibility(false)}
                className="px-2 py-0.5 bg-cad-subpanel hover:bg-cad-border rounded border border-cad-border text-cad-textMuted hover:text-cad-text"
              >
                All Off
              </button>
              <button
                onClick={onToggleDimInactiveLayers}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  dimInactiveLayers
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-semibold'
                    : 'bg-cad-subpanel border-cad-border text-cad-textMuted'
                }`}
                title="Dim inactive layers to highlight the active working copper layer"
              >
                {dimInactiveLayers ? 'Dimmed' : 'Normal'}
              </button>
            </div>
          </div>

          {/* Layer List Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-cad-border/50">
            {filteredLayers.map((layer) => {
              const isVisible = layerVisibility[layer.id] !== false;
              const isActive = activeLayer === layer.id;
              const layerColor = customLayerColors[layer.id] || layer.color;

              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectActiveLayer(layer.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-600/15 border-l-2 border-blue-500 text-cad-text font-semibold'
                      : 'hover:bg-cad-subpanel/50 text-cad-textMuted'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {/* Active Layer Radio Indicator */}
                    <div
                      className={`w-3 h-3 rounded-full flex items-center justify-center border ${
                        isActive ? 'border-blue-500 bg-blue-500' : 'border-cad-border bg-transparent'
                      }`}
                    >
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>

                    {/* Color Swatch */}
                    <div
                      className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/30 shadow-xs"
                      style={{ backgroundColor: layerColor }}
                    />

                    {/* Layer Name & Type */}
                    <div className="truncate">
                      <span className={`text-xs ${isActive ? 'text-cad-text font-bold' : 'text-cad-text'}`}>
                        {layer.id}
                      </span>
                      <span className="text-[10px] text-cad-textMuted ml-1.5 opacity-70">
                        {layer.category}
                      </span>
                    </div>
                  </div>

                  {/* Visibility Eye Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLayerVisibility(layer.id);
                    }}
                    title={isVisible ? 'Hide Layer' : 'Show Layer'}
                    className={`p-1 rounded hover:bg-cad-subpanel ${
                      isVisible ? 'text-cad-text' : 'text-cad-textMuted/40'
                    }`}
                  >
                    {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. OBJECTS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'objects' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          <div className="text-[11px] font-bold text-cad-textMuted uppercase font-mono tracking-wider mb-2 px-1">
            Display Elements
          </div>

          {[
            { id: 'footprints', label: 'Component Footprints', count: pcb.footprints.length },
            { id: 'pads', label: 'Pads & Through-Holes', count: pcb.footprints.reduce((acc, f) => acc + f.pads.length, 0) },
            { id: 'tracks', label: 'Copper Tracks', count: pcb.tracks.length },
            { id: 'vias', label: 'Vias & Microvias', count: pcb.vias.length },
            { id: 'zones', label: 'Copper Pour Zones', count: pcb.zones.length },
            { id: 'ratsnest', label: 'Ratsnest Airwires', count: 'Auto' },
            { id: 'silkscreen', label: 'Silkscreen Legends', count: pcb.footprints.length },
            { id: 'courtyard', label: 'Component Courtyards', count: pcb.footprints.length },
            { id: 'dimensions', label: 'Dimensions & Rulers', count: pcb.dimensions?.length || 0 },
            { id: 'texts', label: 'Text Annotations', count: pcb.texts?.length || 0 },
            { id: 'outline', label: 'Board Edge (Edge.Cuts)', count: pcb.boardOutline.length > 0 ? 'Closed' : 'None' },
          ].map((item) => {
            const isVisible = objectVisibility[item.id] !== false;

            return (
              <div
                key={item.id}
                onClick={() => onToggleObjectVisibility(item.id)}
                className="flex items-center justify-between p-2 rounded bg-cad-bg/60 border border-cad-border/60 hover:bg-cad-subpanel cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <button className="text-blue-500">
                    {isVisible ? <CheckSquare size={14} /> : <Square size={14} className="text-cad-textMuted" />}
                  </button>
                  <span className={`text-xs ${isVisible ? 'text-cad-text font-medium' : 'text-cad-textMuted'}`}>
                    {item.label}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-cad-textMuted bg-cad-subpanel px-1.5 py-0.5 rounded border border-cad-border">
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. NETS TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'nets' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Net Filter */}
          <div className="p-2 border-b border-cad-border bg-cad-bg/50 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-2 text-cad-textMuted" />
              <input
                type="text"
                placeholder="Search nets (e.g. GND, VCC)..."
                value={netSearch}
                onChange={(e) => setNetSearch(e.target.value)}
                className="w-full bg-cad-bg border border-cad-border rounded pl-6 pr-2 py-1 text-xs text-cad-text placeholder:text-cad-textMuted/60 font-mono"
              />
            </div>
            {highlightedNet && (
              <div className="mt-1.5 flex items-center justify-between bg-blue-600/15 border border-blue-500/40 rounded px-2 py-0.5 text-[11px]">
                <span className="text-blue-400 font-semibold truncate">Highlighted: {highlightedNet}</span>
                <button
                  onClick={() => onSelectHighlightNet(null)}
                  className="text-cad-textMuted hover:text-white font-bold ml-2"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Net Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-cad-border/50 font-mono text-xs">
            {filteredNets.map(([netName, stats]) => {
              const isHighlighted = highlightedNet === netName;

              return (
                <div
                  key={netName}
                  onClick={() => onSelectHighlightNet(isHighlighted ? null : netName)}
                  className={`p-2 cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'bg-blue-600/20 text-blue-400 font-bold border-l-2 border-blue-500'
                      : 'hover:bg-cad-subpanel/60 text-cad-text'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold truncate text-cad-text">{netName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        stats.padCount > 1 ? 'bg-emerald-600/20 text-emerald-400' : 'bg-cad-subpanel text-cad-textMuted'
                      }`}
                    >
                      {stats.padCount} Pads
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-cad-textMuted">
                    <span>Traces: {stats.trackCount}</span>
                    <span>Vias: {stats.viaCount}</span>
                    {stats.totalLength > 0 && <span>Len: {stats.totalLength.toFixed(1)}mm</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
