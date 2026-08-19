/**
 * FloZ ECA - Object Properties Inspector Panel
 * Context-aware properties inspector for schematic symbols, pins, wires, nets, and PCB footprints.
 */

import React from 'react';
import { ApexProject } from '../core/types';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { SchematicHelper } from '../schematic/helper';
import { libraryRegistry } from '../library/libraryRegistry';
import { Sliders, Tag, Layers, Cpu, Hash, Zap, Activity } from 'lucide-react';

interface Props {
  project: ApexProject;
  selectedSymbolId?: string;
  selectedFootprintId?: string;
  selectedWireId?: string;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
}

export const PropertiesPanel: React.FC<Props> = ({
  project,
  selectedSymbolId,
  selectedFootprintId,
  selectedWireId,
  onUpdateProject,
}) => {
  const activeSheet =
    project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
    project.schematic.sheets[0];

  const selectedSymbol = activeSheet.symbols.find((s) => s.id === selectedSymbolId);
  const selectedFootprint = project.pcb.footprints.find((f) => f.id === selectedFootprintId);
  const selectedWire = activeSheet.wires.find((w) => w.id === selectedWireId);

  const symDef = selectedSymbol ? libraryRegistry.getSymbolById(selectedSymbol.symbolDefId) : null;
  // Compute live connectivity
  const connectivity = NetConnectivitySolver.solveSheet(activeSheet);

  if (!selectedSymbol && !selectedFootprint && !selectedWire) {
    return (
      <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col items-center justify-center p-4 text-center text-cad-textMuted select-none">
        <Sliders size={24} className="opacity-40 mb-2" />
        <span className="text-xs font-semibold text-cad-text">No Object Selected</span>
        <span className="text-[11px] mt-1 opacity-70">
          Click on any schematic symbol, pin, wire, or PCB footprint to inspect and edit properties.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-cad-panel border-l border-cad-border flex flex-col select-none overflow-y-auto text-cad-text">
      {/* Header */}
      <div className="h-10 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between">
        <span className="text-xs font-bold text-cad-text uppercase font-mono tracking-wider flex items-center gap-1.5">
          <Sliders size={14} className="text-blue-500 dark:text-blue-400" />
          Properties Inspector
        </span>
      </div>

      {/* 1. Schematic Symbol Inspector */}
      {selectedSymbol && (
        <div className="p-3 space-y-4">
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

          <div className="space-y-2.5 text-xs">
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

            {symDef && symDef.units && symDef.units.length > 1 && (
              <div>
                <label className="text-[11px] text-cad-textMuted block mb-1 font-semibold text-blue-500 dark:text-blue-400">
                  Component Unit ({symDef.units.length} Units Available)
                </label>
                <select
                  value={selectedSymbol.unit}
                  onChange={(e) => {
                    const uNum = parseInt(e.target.value, 10);
                    const targetUnit = symDef.units?.find((u) => u.unit === uNum);
                    if (!targetUnit) return;
                    onUpdateProject((prev) => ({
                      ...prev,
                      schematic: {
                        ...prev.schematic,
                        sheets: prev.schematic.sheets.map((s) => ({
                          ...s,
                          symbols: s.symbols.map((sym) =>
                            sym.id === selectedSymbol.id
                              ? {
                                  ...sym,
                                  unit: uNum,
                                  unitSuffix: targetUnit.name,
                                  pins: JSON.parse(JSON.stringify(targetUnit.pins)),
                                }
                              : sym
                          ),
                        })),
                      },
                    }));
                  }}
                  className="w-full bg-cad-bg border border-blue-500/50 rounded px-2 py-1 text-cad-text font-mono text-xs focus:outline-none focus:border-blue-400"
                >
                  {symDef.units.map((u) => (
                    <option key={u.unit} value={u.unit} className="bg-cad-panel text-cad-text">
                      Unit {u.name || u.unit} (Pins: {u.pins.map((p) => p.number).join(', ') || 'None'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[11px] text-cad-textMuted block mb-1">Value / Model</label>
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

            <div>
              <label className="text-[11px] text-cad-textMuted block mb-1">Assigned Footprint</label>
              <input
                type="text"
                value={selectedSymbol.footprint || ''}
                readOnly
                className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-cad-text font-mono text-[11px] truncate opacity-90"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">X (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-cad-text text-xs">{selectedSymbol.x}</div>
              </div>
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">Y (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-cad-text text-xs">{selectedSymbol.y}</div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-cad-textMuted block mb-0.5">Rotation Angle</label>
              <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-cad-text text-xs font-mono">{selectedSymbol.rotation}°</div>
            </div>

            {/* Pins Table */}
            <div>
              <label className="text-[10px] text-cad-textMuted block mb-1 uppercase font-mono tracking-wider">
                Pin Connectivity ({selectedSymbol.pins.length} Pins)
              </label>
              <div className="border border-cad-border rounded max-h-40 overflow-y-auto text-[11px] font-mono">
                <table className="w-full text-left">
                  <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[9px]">
                    <tr>
                      <th className="px-2 py-1">Pin</th>
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cad-border bg-cad-bg/40">
                    {selectedSymbol.pins.map((p) => {
                      // Find connected net
                      let netName = 'Unconnected';
                      for (const [nName, node] of Object.entries(connectivity.netGraph.nets)) {
                        if (node.pins.some((pinRef) => pinRef.symbolRef === selectedSymbol.reference && pinRef.pinNumber === p.number)) {
                          netName = nName;
                          break;
                        }
                      }

                      return (
                        <tr key={p.id} className="hover:bg-cad-subpanel/50">
                          <td className="px-2 py-0.5 font-bold text-cad-text">{p.number}</td>
                          <td className="px-2 py-0.5 text-cad-text">{p.name}</td>
                          <td className={`px-2 py-0.5 truncate ${netName === 'Unconnected' ? 'text-amber-500 dark:text-amber-400 italic' : 'text-blue-500 dark:text-blue-400 font-semibold'}`}>
                            {netName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Wire Inspector */}
      {selectedWire && !selectedSymbol && !selectedFootprint && (
        <div className="p-3 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-600/20 text-emerald-500 dark:text-emerald-400 rounded-lg border border-emerald-500/30">
              <Zap size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-cad-text">Electrical Wire Segment</div>
              <div className="text-[11px] text-cad-textMuted font-mono">
                Length: {Math.hypot(selectedWire.x2 - selectedWire.x1, selectedWire.y2 - selectedWire.y1).toFixed(2)} mm
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="bg-cad-bg p-2 rounded border border-cad-border">
              <span className="text-cad-textMuted text-[10px] block">Start Coordinate:</span>
              <span className="text-cad-text font-semibold">({selectedWire.x1.toFixed(2)}, {selectedWire.y1.toFixed(2)}) mm</span>
            </div>
            <div className="bg-cad-bg p-2 rounded border border-cad-border">
              <span className="text-cad-textMuted text-[10px] block">End Coordinate:</span>
              <span className="text-cad-text font-semibold">({selectedWire.x2.toFixed(2)}, {selectedWire.y2.toFixed(2)}) mm</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. PCB Footprint Inspector */}
      {selectedFootprint && !selectedSymbol && (
        <div className="p-3 space-y-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-600/20 text-amber-500 dark:text-amber-400 rounded-lg border border-amber-500/30">
              <Layers size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-cad-text">{selectedFootprint.reference}</div>
              <div className="text-[11px] text-cad-textMuted font-mono">{selectedFootprint.value}</div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[11px] text-cad-textMuted block mb-1">Footprint Package</label>
              <div className="bg-cad-bg p-2 rounded border border-cad-border font-mono text-[11px] text-cad-text break-all">
                {selectedFootprint.footprintDefId}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-cad-textMuted block mb-1">Board Layer</label>
              <div className="bg-cad-bg p-2 rounded border border-cad-border font-mono text-xs text-cad-text font-semibold">
                {selectedFootprint.layer}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">X (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-cad-text text-xs font-semibold">{selectedFootprint.x.toFixed(2)}</div>
              </div>
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">Y (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-cad-text text-xs font-semibold">{selectedFootprint.y.toFixed(2)}</div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-cad-textMuted block mb-0.5">Rotation Angle</label>
              <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-cad-text text-xs font-mono font-semibold">{selectedFootprint.rotation}°</div>
            </div>

            <div>
              <label className="text-[10px] text-cad-textMuted block mb-0.5">Number of Pads</label>
              <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-cad-text text-xs font-mono font-semibold">{selectedFootprint.pads.length} Pads</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
