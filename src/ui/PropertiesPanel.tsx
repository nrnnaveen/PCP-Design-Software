/**
 * FloZ EDA - Object Properties Inspector Panel
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
import { libraryRegistry } from '../library/libraryRegistry';
import {
  Sliders,
  Tag,
  Layers,
  Cpu,
  Hash,
  Zap,
  Activity,
  Route,
  CircleDot,
  Square,
  Lock,
  Unlock,
  RotateCw,
  FlipHorizontal,
  Compass,
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

  // Compute live connectivity
  const connectivity = activeSheet ? NetConnectivitySolver.solveSheet(activeSheet) : null;

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
        <Sliders size={24} className="opacity-40 mb-2 text-cad-textMuted" />
        <span className="text-xs font-semibold text-cad-text">No Object Selected</span>
        <span className="text-[11px] mt-1 opacity-70">
          Click on any schematic symbol, wire, PCB footprint, track, via, or zone to inspect and edit properties.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col select-none overflow-y-auto text-cad-text text-xs">
      {/* Header */}
      <div className="h-10 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider flex items-center gap-1.5">
          <Sliders size={14} className="text-blue-500 dark:text-blue-400" />
          Properties Inspector
        </span>
      </div>

      <div className="p-3 space-y-4">
        {/* ----------------------------------------------------------- */}
        {/* 1. PCB Footprint Inspector */}
        {/* ----------------------------------------------------------- */}
        {selectedFootprint && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-600/20 text-amber-500 dark:text-amber-400 rounded-lg border border-amber-500/30">
                <Layers size={18} />
              </div>
              <div className="truncate flex-1">
                <div className="text-sm font-bold text-cad-text flex items-center justify-between">
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
                    className={`p-1 rounded ${
                      selectedFootprint.locked ? 'text-amber-400 bg-amber-400/10' : 'text-cad-textMuted hover:text-cad-text'
                    }`}
                  >
                    {selectedFootprint.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                </div>
                <div className="text-[11px] text-cad-textMuted font-mono truncate">{selectedFootprint.value}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Reference */}
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Reference Designator</label>
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
                  className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-cad-text font-mono"
                />
              </div>

              {/* Value */}
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Component Value</label>
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
                  className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-cad-text font-mono"
                />
              </div>

              {/* Footprint Def */}
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Footprint Package</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border font-mono text-[11px] text-cad-text truncate">
                  {selectedFootprint.footprintDefId}
                </div>
              </div>

              {/* Board Layer Side (F.Cu / B.Cu) */}
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Placement Layer Side</label>
                <div className="flex gap-2">
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
                      className={`flex-1 py-1 rounded text-xs font-semibold border transition-colors ${
                        selectedFootprint.layer === side
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-cad-bg border-cad-border text-cad-textMuted hover:text-cad-text'
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
                    className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
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
                    className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
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
                    className="w-24 bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text font-mono"
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
                    className="p-1 bg-cad-subpanel hover:bg-cad-border border border-cad-border rounded text-cad-text flex items-center gap-1 text-[11px]"
                  >
                    <RotateCw size={12} /> +90°
                  </button>
                </div>
              </div>

              {/* Pads List */}
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-1 uppercase font-mono tracking-wider">
                  Connected Pads ({selectedFootprint.pads.length})
                </label>
                <div className="border border-cad-border rounded max-h-36 overflow-y-auto text-[11px] font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[9px]">
                      <tr>
                        <th className="px-2 py-1">Pad</th>
                        <th className="px-2 py-1">Type</th>
                        <th className="px-2 py-1">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cad-border bg-cad-bg/40">
                      {selectedFootprint.pads.map((pad) => (
                        <tr key={pad.id} className="hover:bg-cad-subpanel/50">
                          <td className="px-2 py-0.5 font-bold text-cad-text">{pad.number}</td>
                          <td className="px-2 py-0.5 text-cad-textMuted capitalize">{pad.type}</td>
                          <td className="px-2 py-0.5 text-blue-400 font-semibold truncate">
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
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-600/20 text-orange-500 dark:text-orange-400 rounded-lg border border-orange-500/30">
                <Route size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-cad-text">Track Segment</div>
                <div className="text-[11px] text-blue-400 font-mono font-bold">Net: {selectedTrack.netName}</div>
              </div>
            </div>

            <div className="space-y-2.5 font-mono">
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Track Width (mm)</label>
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
                  className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                />
              </div>

              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Layer</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-xs text-cad-text font-bold">
                  {selectedTrack.layer}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border">
                  <span className="text-cad-textMuted text-[10px] block">Start (X1, Y1):</span>
                  <span>({selectedTrack.x1.toFixed(2)}, {selectedTrack.y1.toFixed(2)}) mm</span>
                </div>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border">
                  <span className="text-cad-textMuted text-[10px] block">End (X2, Y2):</span>
                  <span>({selectedTrack.x2.toFixed(2)}, {selectedTrack.y2.toFixed(2)}) mm</span>
                </div>
              </div>

              <div className="bg-cad-subpanel p-2 rounded border border-cad-border flex justify-between items-center text-[11px]">
                <span className="text-cad-textMuted">Segment Length:</span>
                <span className="text-cad-text font-bold">
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
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-600/20 text-amber-500 dark:text-amber-400 rounded-lg border border-amber-500/30">
                <CircleDot size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-cad-text">Through-Hole Via</div>
                <div className="text-[11px] text-blue-400 font-mono font-bold">Net: {selectedVia.netName}</div>
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
                    className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
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
                    className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
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
                    className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
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
                    className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
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
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600/20 text-blue-500 dark:text-blue-400 rounded-lg border border-blue-500/30">
                <Square size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-cad-text">Copper Pour Zone</div>
                <div className="text-[11px] text-blue-400 font-mono font-bold">Net: {selectedZone.netName}</div>
              </div>
            </div>

            <div className="space-y-2.5 font-mono">
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Assigned Net</label>
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
                  className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                />
              </div>

              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Clearance Margin (mm)</label>
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
                  className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                />
              </div>

              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Layer</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-xs text-cad-text font-bold">
                  {selectedZone.layer}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-cad-subpanel border border-cad-border">
                <span className="text-cad-text font-semibold">Filled Status:</span>
                <span className={`font-bold ${selectedZone.isFilled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedZone.isFilled ? 'Filled' : 'Unfilled'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* 5. Schematic Symbol Inspector (Preserved) */}
        {/* ----------------------------------------------------------- */}
        {selectedSymbol && !selectedFootprint && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600/20 text-blue-500 dark:text-blue-400 rounded-lg border border-blue-500/30">
                <Cpu size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-cad-text">
                  {selectedSymbol.reference}
                  {selectedSymbol.unitSuffix ? ` (${selectedSymbol.unitSuffix})` : ''}
                </div>
                <div className="text-[11px] text-cad-textMuted font-mono">{selectedSymbol.value}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Reference Designator</label>
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
                  className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-cad-text font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1">Component Value</label>
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
                  className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-cad-text font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
