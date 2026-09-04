/**
 * FloZ ECA — Footprint Assignment Dialog
 * Interactive 3-pane modal to map schematic symbols to PCB footprint packages.
 */

import React, { useState, useMemo } from 'react';
import { ApexProject, SchematicSymbolInstance } from '../core/types';
import { libraryRegistry, ApexFootprintDef } from './libraryRegistry';
import { ComponentPreviewCanvas } from './ComponentPreviewCanvas';
import {
  Layers,
  Search,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
}

export const FootprintAssignment: React.FC<Props> = ({
  project,
  isOpen,
  onClose,
  onUpdateProject,
}) => {
  const [selectedSymId, setSelectedSymId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedFootprint, setSelectedFootprint] = useState<ApexFootprintDef | undefined>();
  const [displayLimit, setDisplayLimit] = useState<number>(60);

  const activeSheet =
    project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
    project.schematic.sheets[0];

  const schematicSymbols = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.symbols;
  }, [activeSheet]);

  const activeSymbol = schematicSymbols.find((s) => s.id === selectedSymId) || schematicSymbols[0];

  const categories = useMemo(() => {
    const fps = libraryRegistry.getAllFootprints();
    const set = new Set<string>();
    fps.forEach((fp) => set.add(fp.category));
    return ['All', ...Array.from(set).sort()];
  }, []);

  const filteredFootprints = useMemo(() => {
    return libraryRegistry.searchFootprints(searchFilter, categoryFilter);
  }, [searchFilter, categoryFilter]);

  const visibleFootprints = useMemo(() => {
    return filteredFootprints.slice(0, displayLimit);
  }, [filteredFootprints, displayLimit]);

  const handleAssignFootprint = (fpId: string) => {
    if (!selectedSymId && !activeSymbol) return;
    const targetSymId = selectedSymId || activeSymbol?.id;

    onUpdateProject((prev) => {
      return {
        ...prev,
        schematic: {
          ...prev.schematic,
          sheets: prev.schematic.sheets.map((sheet) => ({
            ...sheet,
            symbols: sheet.symbols.map((sym) =>
              sym.id === targetSymId ? { ...sym, footprint: fpId } : sym
            ),
          })),
        },
      };
    }, 'Assign Footprint');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="footprint-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop select-none p-3"
    >
      <div className="bg-cad-panel border border-cad-border w-[1050px] max-w-full h-[660px] max-h-full rounded-sm shadow-xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-9 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers size={15} className="text-amber-600 dark:text-amber-400" />
            <h2 id="fp-assign-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading flex items-center gap-2">
              <span>Assign PCB Footprints to Schematic Symbols</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xs border border-amber-500/30">
                {filteredFootprints.length} Available
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* 3-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Schematic Symbols List */}
          <div className="w-[280px] border-r border-cad-border flex flex-col bg-cad-subpanel">
            <div className="p-2 bg-cad-header border-b border-cad-border text-[11px] font-semibold text-cad-textMuted uppercase font-mono">
              Schematic Symbols ({schematicSymbols.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {schematicSymbols.map((sym) => {
                const isSelected = sym.id === (selectedSymId || activeSymbol?.id);
                const hasFp = Boolean(sym.footprint && sym.footprint.trim() !== '');

                return (
                  <div
                    key={sym.id}
                    onClick={() => setSelectedSymId(sym.id)}
                    className={`p-1.5 rounded-xs cursor-pointer transition-colors duration-fast border ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500/50 shadow-xs'
                        : 'hover:bg-cad-surfaceHover border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-cad-textHeading">{sym.reference}</span>
                      <span className="text-xs text-cad-text font-mono">{sym.value}</span>
                    </div>
                    <div className="text-[10px] text-cad-textMuted mt-0.5 truncate flex items-center gap-1 font-mono">
                      {hasFp ? (
                        <>
                          <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-cad-text truncate">{sym.footprint.split(':').pop()}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-amber-600 dark:text-amber-400 italic">Unassigned</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Pane: Active Symbol & Vector Preview */}
          <div className="flex-1 border-r border-cad-border p-3.5 flex flex-col overflow-y-auto bg-cad-bg space-y-3">
            {activeSymbol ? (
              <div className="space-y-3 flex flex-col h-full">
                <div>
                  <h3 className="text-sm font-semibold text-cad-textHeading flex items-center gap-1.5">
                    <span>{activeSymbol.reference}</span>
                    <span className="text-xs font-mono font-normal text-cad-textMuted">({activeSymbol.value})</span>
                  </h3>
                  <p className="text-[11px] text-cad-textMuted mt-0.5">{activeSymbol.fields.Description || 'No description'}</p>
                </div>

                <div className="bg-cad-panel border border-cad-border rounded p-2 text-xs">
                  <div className="text-cad-textMuted text-[10px] uppercase font-mono tracking-wider">Current Assigned Footprint</div>
                  <div className="font-mono text-cad-textHeading text-xs break-all mt-0.5 font-medium">
                    {activeSymbol.footprint || 'None'}
                  </div>
                </div>

                {/* Vector Canvas Preview of Selected Footprint */}
                {selectedFootprint && (
                  <div className="h-40 min-h-[140px]">
                    <ComponentPreviewCanvas footprint={selectedFootprint} className="h-full" />
                  </div>
                )}

                {/* Pin Configuration */}
                <div className="flex-1 min-h-[110px]">
                  <div className="text-[10px] font-semibold text-cad-textMuted uppercase font-mono mb-1">
                    Pin Configuration ({activeSymbol.pins.length} Pins)
                  </div>
                  <div className="border border-cad-border rounded overflow-hidden max-h-32 overflow-y-auto text-xs font-mono bg-cad-panel">
                    <table className="w-full text-left">
                      <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[9px] sticky top-0">
                        <tr>
                          <th className="px-2 py-1 font-semibold">Pin #</th>
                          <th className="px-2 py-1 font-semibold">Pin Name</th>
                          <th className="px-2 py-1 font-semibold">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cad-border">
                        {activeSymbol.pins.map((p) => (
                          <tr key={p.id} className="hover:bg-cad-surfaceHover transition-colors">
                            <td className="px-2 py-0.5 font-bold text-cad-textHeading">{p.number}</td>
                            <td className="px-2 py-0.5 text-cad-text">{p.name}</td>
                            <td className="px-2 py-0.5 text-cad-textMuted text-[10px]">{p.electricalType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Pane: Available Footprint Browser */}
          <div className="w-[340px] flex flex-col bg-cad-panel">
            <div className="p-2 bg-cad-subpanel border-b border-cad-border space-y-1.5">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1.5 text-cad-textMuted" />
                <input
                  type="text"
                  placeholder="Filter footprints (e.g. 0805, SOIC, DIP)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded pl-7 pr-2 py-1 text-xs text-cad-inputText focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Category Filter Pills / Dropdown */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {categories.slice(0, 4).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors whitespace-nowrap font-medium ${
                      categoryFilter === cat
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'bg-cad-panel hover:bg-cad-surfaceHover text-cad-text border border-cad-border'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {categories.length > 4 && (
                  <select
                    value={categories.slice(0, 4).includes(categoryFilter) ? '' : categoryFilter}
                    onChange={(e) => {
                      if (e.target.value) setCategoryFilter(e.target.value);
                    }}
                    className="bg-cad-panel border border-cad-border text-cad-text text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="" disabled>More ({categories.length - 4})...</option>
                    {categories.slice(4).map((cat) => (
                      <option key={cat} value={cat} className="bg-cad-panel text-cad-text">
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {visibleFootprints.map((fp) => {
                const isCurrentAssigned = activeSymbol?.footprint === fp.id;

                return (
                  <div
                    key={fp.id}
                    onClick={() => setSelectedFootprint(fp)}
                    onDoubleClick={() => handleAssignFootprint(fp.id)}
                    className={`p-2 rounded cursor-pointer transition-colors border ${
                      isCurrentAssigned
                        ? 'bg-emerald-500/15 border-emerald-500/50'
                        : selectedFootprint?.id === fp.id
                        ? 'bg-blue-500/15 border-blue-500/50'
                        : 'hover:bg-cad-surfaceHover border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-cad-textHeading">{fp.name}</span>
                      <span className="text-[10px] px-1 py-0.2 bg-cad-subpanel text-cad-textMuted rounded font-mono border border-cad-border">
                        {fp.pads.length} pads
                      </span>
                    </div>
                    <p className="text-[11px] text-cad-textMuted mt-0.5 line-clamp-1">{fp.description}</p>
                    <div className="mt-1.5 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignFootprint(fp.id);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 shadow-sm transition-colors ${
                          isCurrentAssigned
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'bg-cad-subpanel hover:bg-blue-600 text-cad-text hover:text-white border border-cad-border'
                        }`}
                      >
                        {isCurrentAssigned ? <Check size={11} /> : null}
                        <span>{isCurrentAssigned ? 'Assigned' : 'Assign'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredFootprints.length > displayLimit && (
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 40)}
                  className="w-full py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-blue-600 dark:text-blue-400 rounded text-xs font-mono font-medium transition-colors"
                >
                  Show More ({filteredFootprints.length - displayLimit} remaining)...
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 bg-cad-header border-t border-cad-border px-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white rounded shadow-sm transition-colors focus-visible:outline-none"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
