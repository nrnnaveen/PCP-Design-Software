/**
 * FloZ ECA - Searchable Symbol Chooser
 * Categorized component browser with live vector preview and parametric search across all libraries.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { libraryRegistry } from './libraryRegistry';
import { SymbolDefinition } from '../core/types';
import { ComponentPreviewCanvas } from './ComponentPreviewCanvas';
import { Search, X, Cpu, Radio, Zap, Layers, Filter } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: SymbolDefinition, unitIndex?: number) => void;
}

export const SymbolChooser: React.FC<Props> = ({ isOpen, onClose, onSelectSymbol }) => {
  const [allSymbols, setAllSymbols] = useState<SymbolDefinition[]>(() => libraryRegistry.getAllSymbols());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolDefinition>(() => allSymbols[0]);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | 'all'>(0);

  // Keep synced with library registry
  useEffect(() => {
    const unsub = libraryRegistry.subscribe(() => {
      const syms = libraryRegistry.getAllSymbols();
      setAllSymbols(syms);
      if (!selectedSymbol && syms.length > 0) {
        setSelectedSymbol(syms[0]);
        setSelectedUnitIndex(0);
      }
    });
    return unsub;
  }, [selectedSymbol]);

  useEffect(() => {
    setSelectedUnitIndex(0);
  }, [selectedSymbol?.id]);

  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    allSymbols.forEach((s) => cats.add(s.category || s.library || 'General'));
    return Array.from(cats);
  }, [allSymbols]);

  const filteredSymbols = useMemo(() => {
    return allSymbols.filter((s) => {
      const cat = s.category || s.library || 'General';
      const matchesCat = selectedCategory === 'All' || cat === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;

      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q)) ||
        s.library.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [allSymbols, searchQuery, selectedCategory]);

  const [displayLimit, setDisplayLimit] = useState<number>(40);

  useEffect(() => {
    setDisplayLimit(40);
  }, [searchQuery, selectedCategory]);

  const visibleSymbols = useMemo(() => {
    return filteredSymbols.slice(0, displayLimit);
  }, [filteredSymbols, displayLimit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="bg-cad-panel border border-cad-border w-[940px] h-[660px] rounded-xl shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              Choose Component Symbol — FloZ ECA
              <span className="text-[10px] font-normal px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-mono">
                {filteredSymbols.length} Symbols Found
              </span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 bg-cad-subpanel border-b border-cad-border flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-2.5 text-cad-textMuted" />
            <input
              type="text"
              placeholder="Search symbols by name (e.g. 4010, NE555, STM32, OpAmp, Resistor, ATmega)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-cad-bg border border-cad-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[420px]">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'bg-cad-panel hover:bg-cad-border text-cad-textMuted hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
            {categories.length > 8 && (
              <select
                value={categories.slice(0, 8).includes(selectedCategory) ? '' : selectedCategory}
                onChange={(e) => {
                  if (e.target.value) setSelectedCategory(e.target.value);
                }}
                className="bg-cad-panel border border-cad-border text-cad-textMuted text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              >
                <option value="" disabled>More ({categories.length - 8})...</option>
                {categories.slice(8).map((cat) => (
                  <option key={cat} value={cat} className="bg-cad-panel text-white">
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Symbol List */}
          <div className="w-1/2 border-r border-cad-border overflow-y-auto divide-y divide-cad-border bg-cad-panel">
            {visibleSymbols.map((sym) => {
              const isSelected = selectedSymbol?.id === sym.id;
              const hasUnits = Boolean(sym.units && sym.units.length > 1);

              return (
                <div
                  key={sym.id}
                  onClick={() => {
                    setSelectedSymbol(sym);
                    setSelectedUnitIndex(0);
                  }}
                  className={`p-3 cursor-pointer transition-colors flex items-start justify-between ${
                    isSelected ? 'bg-blue-600/20 border-l-4 border-blue-500' : 'hover:bg-cad-subpanel'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white truncate">{sym.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-cad-bg rounded text-cad-textMuted border border-cad-border font-mono">
                        {sym.defaultPrefix}?
                      </span>
                      {hasUnits && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-mono">
                          {sym.units!.length} Units
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cad-textMuted truncate mt-0.5">{sym.description}</p>
                    <div className="flex items-center space-x-2 mt-1 text-[11px] text-cad-textMuted font-mono">
                      <span>{sym.library}</span>
                      <span>•</span>
                      <span>{sym.pins.length} pins</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSymbols.length > displayLimit && (
              <button
                onClick={() => setDisplayLimit((prev) => prev + 40)}
                className="w-full py-2 bg-cad-subpanel hover:bg-cad-border text-blue-400 hover:text-blue-300 rounded text-xs font-mono font-semibold transition-colors"
              >
                Show More ({filteredSymbols.length - displayLimit} remaining)...
              </button>
            )}

            {filteredSymbols.length === 0 && (
              <div className="text-center py-12 text-cad-textMuted text-xs font-mono">
                No symbols found matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Right: Symbol Vector Preview & Details */}
          <div className="w-1/2 p-4 flex flex-col overflow-y-auto bg-cad-bg/50 space-y-3">
            {selectedSymbol ? (
              <>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedSymbol.name}
                    <span className="text-xs font-normal text-cad-textMuted font-mono">[{selectedSymbol.defaultPrefix}?]</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedSymbol.description}</p>
                  <p className="text-[11px] text-blue-400 mt-0.5 font-mono">Default Footprint: {selectedSymbol.defaultFootprint || 'None'}</p>
                </div>

                {/* Multi-Unit Selector Toolbar */}
                {selectedSymbol.units && selectedSymbol.units.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-[11px] font-semibold text-cad-textMuted uppercase font-mono mr-1">Select Unit:</span>
                    {selectedSymbol.units.map((u, idx) => (
                      <button
                        key={u.unit}
                        onClick={() => setSelectedUnitIndex(idx)}
                        className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                          selectedUnitIndex === idx
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'bg-cad-panel hover:bg-cad-subpanel text-cad-text border border-cad-border'
                        }`}
                      >
                        Unit {u.name || u.unit}
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedUnitIndex('all')}
                      className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                        selectedUnitIndex === 'all'
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'bg-cad-panel hover:bg-cad-subpanel text-cad-text border border-cad-border'
                      }`}
                    >
                      All
                    </button>
                  </div>
                )}

                {/* Vector Canvas Preview with Unit Selector Toolbar */}
                <div className="h-48">
                  <ComponentPreviewCanvas
                    symbol={selectedSymbol}
                    activeUnitIndex={selectedUnitIndex}
                    onSelectUnitIndex={(u) => setSelectedUnitIndex(u)}
                    className="h-full"
                  />
                </div>

                {/* Pins Table */}
                <div className="flex-1 min-h-[120px]">
                  <h4 className="text-[11px] font-semibold text-cad-textMuted uppercase tracking-wider mb-1 font-mono">
                    Pin Configuration ({selectedSymbol.pins.length} Pins across {selectedSymbol.units?.length || 1} Unit{selectedSymbol.units && selectedSymbol.units.length > 1 ? 's' : ''})
                  </h4>
                  <div className="border border-cad-border rounded overflow-hidden max-h-36 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[10px]">
                        <tr>
                          <th className="px-2.5 py-1">#</th>
                          <th className="px-2.5 py-1">Name</th>
                          <th className="px-2.5 py-1">Electrical Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cad-border bg-cad-panel">
                        {selectedSymbol.pins.map((p) => (
                          <tr key={p.id} className="hover:bg-cad-subpanel">
                            <td className="px-2.5 py-1 font-bold text-white">{p.number}</td>
                            <td className="px-2.5 py-1 text-slate-200">{p.name}</td>
                            <td className="px-2.5 py-1">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] ${
                                  p.electricalType.includes('power')
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : p.electricalType === 'output'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : p.electricalType === 'input'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {p.electricalType}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-cad-header border-t border-cad-border px-4 flex items-center justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-border text-xs rounded text-slate-300">
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedSymbol) {
                const uIdx = typeof selectedUnitIndex === 'number' ? selectedUnitIndex : 0;
                onSelectSymbol(selectedSymbol, uIdx);
                onClose();
              }
            }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded shadow-sm"
          >
            {selectedSymbol?.units && selectedSymbol.units.length > 1 && typeof selectedUnitIndex === 'number'
              ? `Place Unit ${selectedSymbol.units[selectedUnitIndex]?.name || selectedUnitIndex + 1}`
              : 'Place Symbol'}
          </button>
        </div>
      </div>
    </div>
  );
};
