/**
 * Apex EDA - Object Properties Inspector Panel
 * Displays and edits properties for selected schematic symbols and PCB footprints/tracks/vias.
 */

import React from 'react';
import { ApexProject } from '../core/types';
import { Sliders, Tag, Layers, Cpu, Hash } from 'lucide-react';

interface Props {
  project: ApexProject;
  selectedSymbolId?: string;
  selectedFootprintId?: string;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
}

export const PropertiesPanel: React.FC<Props> = ({
  project,
  selectedSymbolId,
  selectedFootprintId,
  onUpdateProject,
}) => {
  // Find selected schematic symbol or PCB footprint
  const activeSheet =
    project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
    project.schematic.sheets[0];

  const selectedSymbol = activeSheet.symbols.find((s) => s.id === selectedSymbolId);
  const selectedFootprint = project.pcb.footprints.find((f) => f.id === selectedFootprintId);

  if (!selectedSymbol && !selectedFootprint) {
    return (
      <div className="w-64 h-full bg-cad-panel border-l border-cad-border flex flex-col items-center justify-center p-4 text-center text-cad-textMuted select-none">
        <Sliders size={24} className="opacity-40 mb-2" />
        <span className="text-xs font-medium">No Object Selected</span>
        <span className="text-[11px] mt-1 opacity-70">Click on any component symbol, footprint, or track to inspect properties.</span>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-cad-panel border-l border-cad-border flex flex-col select-none overflow-y-auto">
      {/* Panel Header */}
      <div className="h-10 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
          <Sliders size={14} className="text-blue-400" />
          Properties Inspector
        </span>
      </div>

      {/* Schematic Symbol Inspector */}
      {selectedSymbol && (
        <div className="p-3 space-y-4">
          <div className="flex items-center space-x-2">
            <Cpu size={18} className="text-blue-400" />
            <div>
              <div className="text-sm font-bold text-white">{selectedSymbol.reference}</div>
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
                className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-white font-mono"
              />
            </div>

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
                className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-cad-textMuted block mb-1">Assigned Footprint</label>
              <input
                type="text"
                value={selectedSymbol.footprint || ''}
                readOnly
                className="w-full bg-cad-bg border border-cad-border rounded px-2.5 py-1 text-slate-300 font-mono text-[11px] truncate"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">X (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-white text-xs">{selectedSymbol.x}</div>
              </div>
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">Y (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-white text-xs">{selectedSymbol.y}</div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-cad-textMuted block mb-0.5">Rotation</label>
              <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-white text-xs font-mono">{selectedSymbol.rotation}°</div>
            </div>
          </div>
        </div>
      )}

      {/* PCB Footprint Inspector */}
      {selectedFootprint && !selectedSymbol && (
        <div className="p-3 space-y-4">
          <div className="flex items-center space-x-2">
            <Layers size={18} className="text-amber-400" />
            <div>
              <div className="text-sm font-bold text-white">{selectedFootprint.reference}</div>
              <div className="text-[11px] text-cad-textMuted font-mono">{selectedFootprint.value}</div>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <label className="text-[11px] text-cad-textMuted block mb-1">Footprint Package</label>
              <div className="bg-cad-bg p-2 rounded border border-cad-border font-mono text-[11px] text-slate-200 break-all">
                {selectedFootprint.footprintDefId}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-cad-textMuted block mb-1">Board Layer</label>
              <div className="bg-cad-bg p-2 rounded border border-cad-border font-mono text-xs text-white">
                {selectedFootprint.layer}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">X (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-white text-xs">{selectedFootprint.x.toFixed(2)}</div>
              </div>
              <div>
                <label className="text-[10px] text-cad-textMuted block mb-0.5">Y (mm)</label>
                <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-white text-xs">{selectedFootprint.y.toFixed(2)}</div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-cad-textMuted block mb-0.5">Rotation Angle</label>
              <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-white text-xs font-mono">{selectedFootprint.rotation}°</div>
            </div>

            <div>
              <label className="text-[10px] text-cad-textMuted block mb-0.5">Number of Pads</label>
              <div className="bg-cad-bg p-1.5 rounded border border-cad-border text-white text-xs font-mono">{selectedFootprint.pads.length} Pads</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
