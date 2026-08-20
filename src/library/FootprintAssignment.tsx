/**
 * FloZ ECA - 3-Pane Footprint Assignment Tool
 * Assigns physical PCB packages, pad-stacks, and 3D models to schematic symbols with live vector preview.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ApexProject, FootprintDefinition } from '../core/types';
import { libraryRegistry } from './libraryRegistry';
import { ComponentPreviewCanvas } from './ComponentPreviewCanvas';
import { Layers, Search, Check, X, Box, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [allFootprints, setAllFootprints] = useState<FootprintDefinition[]>(() => libraryRegistry.getAllFootprints());
  const [selectedSymId, setSelectedSymId] = useState<string>('');
  const [selectedFootprint, setSelectedFootprint] = useState<FootprintDefinition | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Keep synced with library registry
  useEffect(() => {
    const unsub = libraryRegistry.subscribe(() => {
      const fps = libraryRegistry.getAllFootprints();
      setAllFootprints(fps);
      if (!selectedFootprint && fps.length > 0) {
        setSelectedFootprint(fps[0]);
      }
    });
    return unsub;
  }, [selectedFootprint]);

  // Collect all schematic symbols requiring PCB footprints
  const schematicSymbols = useMemo(() => {
    return project.schematic.sheets.flatMap((sheet) =>
      sheet.symbols.filter((sym) => !sym.reference.startsWith('#'))
    );
  }, [project]);

  // Set initial selected symbol
  useEffect(() => {
    if (schematicSymbols.length > 0 && !selectedSymId) {
      setSelectedSymId(schematicSymbols[0].id);
    }
  }, [schematicSymbols, selectedSymId]);

  const activeSymbol = schematicSymbols.find((s) => s.id === selectedSymId);

  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    allFootprints.forEach((f) => cats.add(f.category || f.library || 'General'));
    return Array.from(cats);
  }, [allFootprints]);

  const filteredFootprints = useMemo(() => {
    return allFootprints.filter((fp) => {
      const matchCat = categoryFilter === 'All' || fp.category === categoryFilter;
      const q = searchFilter.toLowerCase().trim();
      if (!q) return matchCat;
      const matchSearch =
        fp.name.toLowerCase().includes(q) ||
        fp.description.toLowerCase().includes(q) ||
        fp.library.toLowerCase().includes(q) ||
        fp.keywords.some((k) => k.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [allFootprints, searchFilter, categoryFilter]);

  const [displayLimit, setDisplayLimit] = useState<number>(40);

  useEffect(() => {
    setDisplayLimit(40);
  }, [searchFilter, categoryFilter]);

  const visibleFootprints = useMemo(() => {
    return filteredFootprints.slice(0, displayLimit);
  }, [filteredFootprints, displayLimit]);

  const handleAssignFootprint = (fpId: string) => {
    if (!selectedSymId) return;

    onUpdateProject((prev) => {
      return {
        ...prev,
        schematic: {
          ...prev.schematic,
          sheets: prev.schematic.sheets.map((sheet) => ({
            ...sheet,
            symbols: sheet.symbols.map((sym) =>
              sym.id === selectedSymId ? { ...sym, footprint: fpId } : sym
            ),
          })),
        },
      };
    }, 'Assign Footprint');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="bg-cad-panel border border-cad-border w-[1050px] h-[680px] rounded-xl shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers size={18} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Assign PCB Footprints to Schematic Symbols — FloZ ECA
              <span className="text-[10px] font-normal px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 font-mono">
                {filteredFootprints.length} Footprints Available
              </span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* 3-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Schematic Symbols List */}
          <div className="w-[300px] border-r border-cad-border flex flex-col bg-cad-bg/30">
            <div className="p-2.5 bg-cad-subpanel border-b border-cad-border text-xs font-semibold text-cad-textMuted uppercase font-mono">
              Schematic Symbols ({schematicSymbols.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {schematicSymbols.map((sym) => {
                const isSelected = sym.id === selectedSymId;
                const hasFp = Boolean(sym.footprint && sym.footprint.trim() !== '');

                return (
                  <div
                    key={sym.id}
                    onClick={() => setSelectedSymId(sym.id)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-colors border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/50'
                        : 'hover:bg-cad-subpanel border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{sym.reference}</span>
                      <span className="text-xs text-slate-300 font-mono">{sym.value}</span>
                    </div>
                    <div className="text-[11px] text-cad-textMuted mt-1 truncate flex items-center gap-1 font-mono">
                      {hasFp ? (
                        <>
                          <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                          <span className="text-slate-300">{sym.footprint.split(':').pop()}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={11} className="text-amber-400 shrink-0" />
                          <span className="text-amber-400/80 italic">Unassigned</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Pane: Active Symbol & Vector Preview */}
          <div className="flex-1 border-r border-cad-border p-4 flex flex-col overflow-y-auto bg-cad-bg/50 space-y-3">
            {activeSymbol ? (
              <div className="space-y-3 flex flex-col h-full">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {activeSymbol.reference}
                    <span className="text-xs font-mono font-normal text-cad-textMuted">({activeSymbol.value})</span>
                  </h3>
                  <p className="text-xs text-cad-textMuted mt-0.5">{activeSymbol.fields.Description || 'No description'}</p>
                </div>

                <div className="bg-cad-panel border border-cad-border rounded-lg p-2.5 text-xs">
                  <div className="text-cad-textMuted text-[10px] uppercase font-mono tracking-wider">Current Assigned Footprint</div>
                  <div className="font-mono text-white text-xs break-all mt-0.5">
                    {activeSymbol.footprint || 'None'}
                  </div>
                </div>

                {/* Vector Canvas Preview of Selected Footprint */}
                {selectedFootprint && (
                  <div className="h-44 min-h-[160px]">
                    <ComponentPreviewCanvas footprint={selectedFootprint} className="h-full" />
                  </div>
                )}

                {/* Pin Configuration */}
                <div className="flex-1 min-h-[120px]">
                  <div className="text-xs font-semibold text-cad-textMuted uppercase font-mono mb-1">
                    Pin Configuration ({activeSymbol.pins.length} Pins)
                  </div>
                  <div className="border border-cad-border rounded-lg overflow-hidden max-h-36 overflow-y-auto text-xs font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[10px]">
                        <tr>
                          <th className="px-2.5 py-1">Pin #</th>
                          <th className="px-2.5 py-1">Pin Name</th>
                          <th className="px-2.5 py-1">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cad-border bg-cad-panel">
                        {activeSymbol.pins.map((p) => (
                          <tr key={p.id} className="hover:bg-cad-subpanel">
                            <td className="px-2.5 py-1 font-bold text-white">{p.number}</td>
                            <td className="px-2.5 py-1 text-slate-300">{p.name}</td>
                            <td className="px-2.5 py-1 text-cad-textMuted text-[10px]">{p.electricalType}</td>
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
          <div className="w-[360px] flex flex-col bg-cad-bg/30">
            <div className="p-2.5 bg-cad-subpanel border-b border-cad-border space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2 text-cad-textMuted" />
                <input
                  type="text"
                  placeholder="Filter footprints (e.g. 0805, SOIC, DIP, QFN, Battery)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-cad-bg border border-cad-border rounded pl-8 pr-2 py-1 text-xs text-cad-text focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              {/* Category Filter Pills / Dropdown */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {categories.slice(0, 4).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-cad-panel hover:bg-cad-border text-cad-textMuted hover:text-white'
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
                    className="bg-cad-panel border border-cad-border text-cad-textMuted text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    <option value="" disabled>More ({categories.length - 4})...</option>
                    {categories.slice(4).map((cat) => (
                      <option key={cat} value={cat} className="bg-cad-panel text-white">
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
                    className={`p-2.5 rounded-lg cursor-pointer transition-colors border ${
                      isCurrentAssigned
                        ? 'bg-emerald-600/20 border-emerald-500/50'
                        : selectedFootprint?.id === fp.id
                        ? 'bg-blue-600/20 border-blue-500/50'
                        : 'hover:bg-cad-subpanel border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{fp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-cad-border text-cad-textMuted rounded font-mono">
                        {fp.pads.length} pads
                      </span>
                    </div>
                    <p className="text-[11px] text-cad-textMuted mt-0.5 line-clamp-1">{fp.description}</p>
                    <div className="mt-2 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignFootprint(fp.id);
                        }}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 shadow-sm ${
                          isCurrentAssigned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-cad-border hover:bg-blue-600 text-slate-200 hover:text-white'
                        }`}
                      >
                        {isCurrentAssigned ? <Check size={11} /> : null}
                        {isCurrentAssigned ? 'Assigned' : 'Assign'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredFootprints.length > displayLimit && (
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 40)}
                  className="w-full py-2 bg-cad-subpanel hover:bg-cad-border text-blue-400 hover:text-blue-300 rounded text-xs font-mono font-semibold transition-colors"
                >
                  Show More ({filteredFootprints.length - displayLimit} remaining)...
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-cad-header border-t border-cad-border px-4 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded shadow-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
