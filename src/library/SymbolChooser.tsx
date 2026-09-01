/**
 * FloZ ECA — Microsoft Fluent Symbol Chooser Dialog
 * Fast search and placement for schematic component symbols with multi-unit support.
 */

import React, { useState, useMemo } from 'react';
import { libraryRegistry, ApexSymbolDef } from './libraryRegistry';
import { ComponentPreviewCanvas } from './ComponentPreviewCanvas';
import { Search, Cpu, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: ApexSymbolDef, unitIndex?: number) => void;
}

export const SymbolChooser: React.FC<Props> = ({ isOpen, onClose, onSelectSymbol }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSymbol, setSelectedSymbol] = useState<ApexSymbolDef | undefined>(() => {
    const all = libraryRegistry.getAllSymbols();
    return all[0];
  });
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | 'all'>(0);
  const [displayLimit, setDisplayLimit] = useState<number>(60);

  const categories = useMemo(() => {
    const symbols = libraryRegistry.getAllSymbols();
    const set = new Set<string>();
    symbols.forEach((s) => set.add(s.category));
    return ['All', ...Array.from(set).sort()];
  }, []);

  const filteredSymbols = useMemo(() => {
    return libraryRegistry.searchSymbols(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  const visibleSymbols = useMemo(() => {
    return filteredSymbols.slice(0, displayLimit);
  }, [filteredSymbols, displayLimit]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="symbol-chooser-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 select-none p-3"
    >
      <div className="bg-cad-panel border border-cad-border w-[940px] max-w-full h-[640px] max-h-full rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-11 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu size={16} className="text-blue-600 dark:text-blue-400" />
            <h2 id="symbol-chooser-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading flex items-center gap-2">
              <span>Choose Component Symbol</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded border border-blue-500/30">
                {filteredSymbols.length} Found
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-2.5 bg-cad-subpanel border-b border-cad-border flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-2 text-cad-textMuted" />
            <input
              type="text"
              placeholder="Search symbols by name (e.g. 4010, NE555, STM32, OpAmp, Resistor)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-cad-inputBg border border-cad-inputBorder rounded pl-8 pr-3 py-1 text-xs text-cad-inputText font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto max-w-[400px]">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-xs whitespace-nowrap transition-colors font-medium ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-cad-panel hover:bg-cad-surfaceHover text-cad-text border border-cad-border'
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
                className="bg-cad-panel border border-cad-border text-cad-text text-xs rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
              >
                <option value="" disabled>More ({categories.length - 8})...</option>
                {categories.slice(8).map((cat) => (
                  <option key={cat} value={cat} className="bg-cad-panel text-cad-text">
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
                  className={`p-2.5 cursor-pointer transition-colors flex items-start justify-between ${
                    isSelected ? 'bg-blue-500/15 border-l-4 border-blue-600' : 'hover:bg-cad-surfaceHover'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-cad-textHeading truncate">{sym.name}</span>
                      <span className="text-[10px] px-1 py-0.2 bg-cad-subpanel rounded text-cad-textMuted border border-cad-border font-mono">
                        {sym.defaultPrefix}?
                      </span>
                      {hasUnits && (
                        <span className="text-[10px] px-1 py-0.2 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded border border-blue-500/30 font-mono font-medium">
                          {sym.units!.length} Units
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-cad-textMuted truncate mt-0.5">{sym.description}</p>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] text-cad-textMuted font-mono">
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
                className="w-full py-2 bg-cad-subpanel hover:bg-cad-surfaceHover text-blue-600 dark:text-blue-400 rounded text-xs font-mono font-medium transition-colors"
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
          <div className="w-1/2 p-3.5 flex flex-col overflow-y-auto bg-cad-bg space-y-3">
            {selectedSymbol ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-cad-textHeading flex items-center gap-1.5">
                    <span>{selectedSymbol.name}</span>
                    <span className="text-xs font-normal text-cad-textMuted font-mono">[{selectedSymbol.defaultPrefix}?]</span>
                  </h3>
                  <p className="text-[11px] text-cad-text mt-0.5">{selectedSymbol.description}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-mono">Default Footprint: {selectedSymbol.defaultFootprint || 'None'}</p>
                </div>

                {/* Multi-Unit Selector Toolbar */}
                {selectedSymbol.units && selectedSymbol.units.length > 1 && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <span className="text-[10px] font-semibold text-cad-textMuted uppercase font-mono mr-1">Unit:</span>
                    {selectedSymbol.units.map((u, idx) => (
                      <button
                        key={u.unit}
                        onClick={() => setSelectedUnitIndex(idx)}
                        className={`px-2 py-0.5 rounded text-xs font-mono transition-colors font-medium ${
                          selectedUnitIndex === idx
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-cad-panel hover:bg-cad-surfaceHover text-cad-text border border-cad-border'
                        }`}
                      >
                        Unit {u.name || u.unit}
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedUnitIndex('all')}
                      className={`px-2 py-0.5 rounded text-xs font-mono transition-colors font-medium ${
                        selectedUnitIndex === 'all'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-cad-panel hover:bg-cad-surfaceHover text-cad-text border border-cad-border'
                      }`}
                    >
                      All
                    </button>
                  </div>
                )}

                {/* Vector Canvas Preview */}
                <div className="h-44">
                  <ComponentPreviewCanvas
                    symbol={selectedSymbol}
                    activeUnitIndex={selectedUnitIndex}
                    onSelectUnitIndex={(u) => setSelectedUnitIndex(u)}
                    className="h-full"
                  />
                </div>

                {/* Pins Table */}
                <div className="flex-1 min-h-[110px]">
                  <h4 className="text-[10px] font-semibold text-cad-textMuted uppercase tracking-wider mb-1 font-mono">
                    Pin Configuration ({selectedSymbol.pins.length} Pins across {selectedSymbol.units?.length || 1} Unit{selectedSymbol.units && selectedSymbol.units.length > 1 ? 's' : ''})
                  </h4>
                  <div className="border border-cad-border rounded overflow-hidden max-h-32 overflow-y-auto bg-cad-panel">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[9px] sticky top-0">
                        <tr>
                          <th className="px-2 py-1 font-semibold">#</th>
                          <th className="px-2 py-1 font-semibold">Name</th>
                          <th className="px-2 py-1 font-semibold">Electrical Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cad-border">
                        {selectedSymbol.pins.map((p) => (
                          <tr key={p.id} className="hover:bg-cad-surfaceHover transition-colors">
                            <td className="px-2 py-0.5 font-bold text-cad-textHeading">{p.number}</td>
                            <td className="px-2 py-0.5 text-cad-text">{p.name}</td>
                            <td className="px-2 py-0.5">
                              <span
                                className={`px-1 py-0.2 rounded text-[9px] font-medium ${
                                  p.electricalType.includes('power')
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : p.electricalType === 'output'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : p.electricalType === 'input'
                                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                    : 'bg-cad-subpanel text-cad-textMuted border border-cad-border'
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
        <div className="h-11 bg-cad-header border-t border-cad-border px-4 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-xs rounded text-cad-text border border-cad-border font-medium transition-colors"
          >
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
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white rounded shadow-sm transition-colors focus-visible:outline-none"
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
