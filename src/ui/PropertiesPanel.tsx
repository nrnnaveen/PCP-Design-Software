/**
 * FloZ ECA — Microsoft Fluent Properties Inspector Panel
 * Context-aware properties inspector for schematic symbols, pins, wires, nets, PCB footprints, tracks, vias, zones.
 */

import React from 'react';
import {
  ApexProject,
  PCBFootprintInstance,
  PCBTrackSegment,
  PCBVia,
  PCBZone,
  PCBLayerId,
} from '../core/types';
import { NetConnectivitySolver } from '../schematic/connectivity';
import {
  Sliders,
  Layers,
  Cpu,
  Route,
  CircleDot,
  Square,
  Lock,
  Unlock,
  RotateCw,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  selectedSymbolId?: string;
  selectedFootprintId?: string;
  selectedTrackId?: string;
  selectedViaId?: string;
  selectedZoneId?: string;
  selectedWireId?: string;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
}

export const PropertiesPanel: React.FC<Props> = ({
  project,
  selectedSymbolId,
  selectedFootprintId,
  selectedTrackId,
  selectedViaId,
  selectedZoneId,
  selectedWireId,
  onUpdateProject,
}) => {
  const activeSheet =
    project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
    project.schematic.sheets[0];

  const selectedSymbol = activeSheet?.symbols.find((s) => s.id === selectedSymbolId);
  const selectedFootprint = project.pcb.footprints.find((f) => f.id === selectedFootprintId);
  const selectedTrack = project.pcb.tracks.find((t) => t.id === selectedTrackId);
  const selectedVia = project.pcb.vias.find((v) => v.id === selectedViaId);
  const selectedZone = project.pcb.zones.find((z) => z.id === selectedZoneId);
  const selectedWire = activeSheet?.wires.find((w) => w.id === selectedWireId);

  if (
    !selectedSymbol &&
    !selectedFootprint &&
    !selectedTrack &&
    !selectedVia &&
    !selectedZone &&
    !selectedWire
  ) {
    return (
      <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col items-center justify-center p-4 text-center text-cad-textMuted select-none">
        <Sliders size={22} className="opacity-40 mb-2 text-cad-textMuted" />
        <span className="text-xs font-semibold text-cad-textHeading">No Object Selected</span>
        <span className="text-[11px] mt-1 text-cad-textMuted max-w-[200px] leading-relaxed">
          Select any symbol, wire, footprint, track, via, or zone to inspect and edit properties.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col select-none overflow-y-auto text-cad-text text-xs">
      {/* Header */}
      <div className="h-9 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-semibold text-cad-textHeading uppercase font-mono tracking-wider flex items-center gap-1.5">
          <Sliders size={13} className="text-blue-600 dark:text-blue-400" />
          Properties Inspector
        </span>
      </div>

      <div className="p-3 space-y-3.5">
        {/* ----------------------------------------------------------- */}
        {/* 1. PCB Footprint Inspector */}
        {/* ----------------------------------------------------------- */}
        {selectedFootprint && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 p-2 bg-cad-subpanel rounded border border-cad-border">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/20">
                <Layers size={16} />
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-semibold text-cad-textHeading flex items-center justify-between">
                  <span>{selectedFootprint.reference}</span>
                  <button
                    onClick={() => {
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          footprints: prev.pcb.footprints.map((fp) =>
                            fp.id === selectedFootprint.id ? { ...fp, locked: !fp.locked } : fp
                          ),
                        },
                      }), 'Toggle Lock Footprint');
                    }}
                    title={selectedFootprint.locked ? 'Unlock Footprint' : 'Lock Footprint'}
                    className={`p-1 rounded transition-colors ${
                      selectedFootprint.locked
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-500/15'
                        : 'text-cad-textMuted hover:text-cad-text hover:bg-cad-surfaceHover'
                    }`}
                  >
                    {selectedFootprint.locked ? <Lock size={13} /> : <Unlock size={13} />}
                  </button>
                </div>
                <div className="text-[11px] text-cad-textMuted font-mono truncate">{selectedFootprint.value}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Reference */}
              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Reference Designator</label>
                <input
                  type="text"
                  value={selectedFootprint.reference}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateProject((prev) => ({
                      ...prev,
                      pcb: {
                        ...prev.pcb,
                        footprints: prev.pcb.footprints.map((fp) =>
                          fp.id === selectedFootprint.id ? { ...fp, reference: val } : fp
                        ),
                      },
                    }));
                  }}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1 text-cad-inputText font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Value */}
              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Component Value</label>
                <input
                  type="text"
                  value={selectedFootprint.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateProject((prev) => ({
                      ...prev,
                      pcb: {
                        ...prev.pcb,
                        footprints: prev.pcb.footprints.map((fp) =>
                          fp.id === selectedFootprint.id ? { ...fp, value: val } : fp
                        ),
                      },
                    }));
                  }}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1 text-cad-inputText font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Footprint Def */}
              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Footprint Package</label>
                <div className="bg-cad-subpanel p-1.5 rounded border border-cad-border font-mono text-[11px] text-cad-text truncate">
                  {selectedFootprint.footprintDefId}
                </div>
              </div>

              {/* Board Layer Side (F.Cu / B.Cu) */}
              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Placement Layer Side</label>
                <div className="flex gap-1.5">
                  {(['F.Cu', 'B.Cu'] as const).map((side) => (
                    <button
                      key={side}
                      onClick={() => {
                        onUpdateProject((prev) => ({
                          ...prev,
                          pcb: {
                            ...prev.pcb,
                            footprints: prev.pcb.footprints.map((fp) =>
                              fp.id === selectedFootprint.id ? { ...fp, layer: side } : fp
                            ),
                          },
                        }), `Change Footprint Side to ${side}`);
                      }}
                      className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                        selectedFootprint.layer === side
                          ? 'bg-blue-600 border-blue-600 text-white font-semibold shadow-sm'
                          : 'bg-cad-subpanel border-cad-border text-cad-text hover:bg-cad-surfaceHover'
                      }`}
                    >
                      {side === 'F.Cu' ? 'Top (F.Cu)' : 'Bottom (B.Cu)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Coordinates */}
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <label className="text-[10px] text-cad-textMuted block mb-0.5">X (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedFootprint.x}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          footprints: prev.pcb.footprints.map((fp) =>
                            fp.id === selectedFootprint.id ? { ...fp, x: val } : fp
                          ),
                        },
                      }));
                    }}
                    className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cad-textMuted block mb-0.5">Y (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedFootprint.y}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          footprints: prev.pcb.footprints.map((fp) =>
                            fp.id === selectedFootprint.id ? { ...fp, y: val } : fp
                          ),
                        },
                      }));
                    }}
                    className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">Rotation (°)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="45"
                    value={selectedFootprint.rotation}
                    onChange={(e) => {
                      const val = (parseFloat(e.target.value) || 0) % 360;
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          footprints: prev.pcb.footprints.map((fp) =>
                            fp.id === selectedFootprint.id ? { ...fp, rotation: val } : fp
                          ),
                        },
                      }));
                    }}
                    className="w-24 bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText font-mono focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => {
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          footprints: prev.pcb.footprints.map((fp) =>
                            fp.id === selectedFootprint.id
                              ? { ...fp, rotation: (fp.rotation + 90) % 360 }
                              : fp
                          ),
                        },
                      }), 'Rotate Footprint 90°');
                    }}
                    className="px-2 py-1 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border rounded text-cad-text flex items-center gap-1 text-[11px] font-medium transition-colors"
                  >
                    <RotateCw size={12} /> +90°
                  </button>
                </div>
              </div>

              {/* Pads List */}
              <div>
                <label className="text-[10px] font-semibold text-cad-textMuted block mb-1 uppercase font-mono tracking-wider">
                  Connected Pads ({selectedFootprint.pads.length})
                </label>
                <div className="border border-cad-border rounded max-h-36 overflow-y-auto text-[11px] font-mono bg-cad-panel">
                  <table className="w-full text-left">
                    <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[9px] sticky top-0">
                      <tr>
                        <th className="px-2 py-1 font-semibold">Pad</th>
                        <th className="px-2 py-1 font-semibold">Type</th>
                        <th className="px-2 py-1 font-semibold">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cad-border">
                      {selectedFootprint.pads.map((pad) => (
                        <tr key={pad.id} className="hover:bg-cad-surfaceHover transition-colors">
                          <td className="px-2 py-0.5 font-bold text-cad-textHeading">{pad.number}</td>
                          <td className="px-2 py-0.5 text-cad-textMuted capitalize">{pad.type}</td>
                          <td className="px-2 py-0.5 text-blue-600 dark:text-blue-400 font-semibold truncate">
                            {pad.netName || 'Unconnected'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* 2. PCB Track Segment Inspector */}
        {/* ----------------------------------------------------------- */}
        {selectedTrack && !selectedFootprint && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 p-2 bg-cad-subpanel rounded border border-cad-border">
              <div className="p-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded border border-orange-500/20">
                <Route size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold text-cad-textHeading">Track Segment</div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">Net: {selectedTrack.netName}</div>
              </div>
            </div>

            <div className="space-y-2.5 font-mono">
              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Track Width (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={selectedTrack.width}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.25;
                    onUpdateProject((prev) => ({
                      ...prev,
                      pcb: {
                        ...prev.pcb,
                        tracks: prev.pcb.tracks.map((t) =>
                          t.id === selectedTrack.id ? { ...t, width: val } : t
                        ),
                      },
                    }), 'Change Track Width');
                  }}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Layer</label>
                <div className="bg-cad-subpanel p-1.5 rounded border border-cad-border text-xs text-cad-textHeading font-semibold">
                  {selectedTrack.layer}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-cad-subpanel p-1.5 rounded border border-cad-border">
                  <span className="text-cad-textMuted text-[10px] block">Start:</span>
                  <span className="text-cad-text">({selectedTrack.x1.toFixed(2)}, {selectedTrack.y1.toFixed(2)}) mm</span>
                </div>
                <div className="bg-cad-subpanel p-1.5 rounded border border-cad-border">
                  <span className="text-cad-textMuted text-[10px] block">End:</span>
                  <span className="text-cad-text">({selectedTrack.x2.toFixed(2)}, {selectedTrack.y2.toFixed(2)}) mm</span>
                </div>
              </div>

              <div className="bg-cad-subpanel p-2 rounded border border-cad-border flex justify-between items-center text-[11px]">
                <span className="text-cad-textMuted">Segment Length:</span>
                <span className="text-cad-textHeading font-semibold">
                  {Math.hypot(selectedTrack.x2 - selectedTrack.x1, selectedTrack.y2 - selectedTrack.y1).toFixed(2)} mm
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* 3. PCB Via Inspector */}
        {/* ----------------------------------------------------------- */}
        {selectedVia && !selectedFootprint && !selectedTrack && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 p-2 bg-cad-subpanel rounded border border-cad-border">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded border border-amber-500/20">
                <CircleDot size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold text-cad-textHeading">Through-Hole Via</div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">Net: {selectedVia.netName}</div>
              </div>
            </div>

            <div className="space-y-2.5 font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-cad-textMuted block mb-0.5">Diameter (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={selectedVia.diameter}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0.8;
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          vias: prev.pcb.vias.map((v) =>
                            v.id === selectedVia.id ? { ...v, diameter: val } : v
                          ),
                        },
                      }));
                    }}
                    className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cad-textMuted block mb-0.5">Drill Size (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={selectedVia.drillDiameter}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0.4;
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          vias: prev.pcb.vias.map((v) =>
                            v.id === selectedVia.id ? { ...v, drillDiameter: val } : v
                          ),
                        },
                      }));
                    }}
                    className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-cad-textMuted block mb-0.5">Position X (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedVia.x}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          vias: prev.pcb.vias.map((v) =>
                            v.id === selectedVia.id ? { ...v, x: val } : v
                          ),
                        },
                      }));
                    }}
                    className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-cad-textMuted block mb-0.5">Position Y (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedVia.y}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onUpdateProject((prev) => ({
                        ...prev,
                        pcb: {
                          ...prev.pcb,
                          vias: prev.pcb.vias.map((v) =>
                            v.id === selectedVia.id ? { ...v, y: val } : v
                          ),
                        },
                      }));
                    }}
                    className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* 4. PCB Zone Inspector */}
        {/* ----------------------------------------------------------- */}
        {selectedZone && !selectedFootprint && !selectedTrack && !selectedVia && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 p-2 bg-cad-subpanel rounded border border-cad-border">
              <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20">
                <Square size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold text-cad-textHeading">Copper Pour Zone</div>
                <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">Net: {selectedZone.netName}</div>
              </div>
            </div>

            <div className="space-y-2.5 font-mono">
              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Assigned Net</label>
                <input
                  type="text"
                  value={selectedZone.netName}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateProject((prev) => ({
                      ...prev,
                      pcb: {
                        ...prev.pcb,
                        zones: prev.pcb.zones.map((z) =>
                          z.id === selectedZone.id ? { ...z, netName: val, netId: `net_${val.toLowerCase()}` } : z
                        ),
                      },
                    }));
                  }}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Clearance Margin (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={selectedZone.clearance}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0.3;
                    onUpdateProject((prev) => ({
                      ...prev,
                      pcb: {
                        ...prev.pcb,
                        zones: prev.pcb.zones.map((z) =>
                          z.id === selectedZone.id ? { ...z, clearance: val } : z
                        ),
                      },
                    }));
                  }}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded p-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Layer</label>
                <div className="bg-cad-subpanel p-1.5 rounded border border-cad-border text-xs text-cad-textHeading font-semibold">
                  {selectedZone.layer}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-cad-subpanel border border-cad-border">
                <span className="text-cad-text font-medium">Filled Status:</span>
                <span className={`font-semibold ${selectedZone.isFilled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {selectedZone.isFilled ? 'Filled' : 'Unfilled'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* 5. Schematic Symbol Inspector */}
        {/* ----------------------------------------------------------- */}
        {selectedSymbol && !selectedFootprint && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5 p-2 bg-cad-subpanel rounded border border-cad-border">
              <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20">
                <Cpu size={16} />
              </div>
              <div>
                <div className="text-xs font-semibold text-cad-textHeading">
                  {selectedSymbol.reference}
                  {selectedSymbol.unitSuffix ? ` (${selectedSymbol.unitSuffix})` : ''}
                </div>
                <div className="text-[11px] text-cad-textMuted font-mono">{selectedSymbol.value}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Reference Designator</label>
                <input
                  type="text"
                  value={selectedSymbol.reference}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateProject((prev) => ({
                      ...prev,
                      schematic: {
                        ...prev.schematic,
                        sheets: prev.schematic.sheets.map((s) => ({
                          ...s,
                          symbols: s.symbols.map((sym) =>
                            sym.id === selectedSymbol.id ? { ...sym, reference: val } : sym
                          ),
                        })),
                      },
                    }));
                  }}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1 text-cad-inputText font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-cad-textMuted block mb-1">Component Value</label>
                <input
                  type="text"
                  value={selectedSymbol.value}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateProject((prev) => ({
                      ...prev,
                      schematic: {
                        ...prev.schematic,
                        sheets: prev.schematic.sheets.map((s) => ({
                          ...s,
                          symbols: s.symbols.map((sym) =>
                            sym.id === selectedSymbol.id ? { ...sym, value: val } : sym
                          ),
                        })),
                      },
                    }));
                  }}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-2.5 py-1 text-cad-inputText font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
