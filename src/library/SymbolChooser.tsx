/**
 * Apex EDA - Searchable Symbol Chooser
 * Categorized component browser with pin inspection and parametric search.
 */

import React, { useState, useMemo } from 'react';
import { BUILTIN_SYMBOLS } from './database';
import { SymbolDefinition } from '../core/types';
import { Search, X, Cpu, Radio, Zap, Layers, Filter } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: SymbolDefinition) => void;
}

export const SymbolChooser: React.FC<Props> = ({ isOpen, onClose, onSelectSymbol }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolDefinition>(BUILTIN_SYMBOLS[0]);

  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    BUILTIN_SYMBOLS.forEach((s) => cats.add(s.category));
    return Array.from(cats);
  }, []);

  const filteredSymbols = useMemo(() => {
    return BUILTIN_SYMBOLS.filter((s) => {
      const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;

      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q)) ||
        s.library.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="bg-cad-panel border border-cad-border w-[880px] h-[600px] rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Choose Component Symbol</h2>
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
              placeholder="Search by symbol name, keyword (e.g. STM32, 10k, USB, OpAmp)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-cad-bg border border-cad-border rounded pl-9 pr-3 py-1.5 text-xs text-cad-text focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[400px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-cad-bg text-cad-textMuted hover:text-white hover:bg-cad-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Pane Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Symbol List */}
          <div className="w-1/2 border-r border-cad-border overflow-y-auto p-2 space-y-1">
            {filteredSymbols.map((sym) => {
              const isSelected = selectedSymbol.id === sym.id;
              return (
                <div
                  key={sym.id}
                  onClick={() => setSelectedSymbol(sym)}
                  onDoubleClick={() => {
                    onSelectSymbol(sym);
                    onClose();
                  }}
                  className={`p-2 rounded cursor-pointer transition-colors flex items-start justify-between ${
                    isSelected ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-cad-subpanel border border-transparent'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{sym.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-cad-border text-cad-textMuted rounded font-mono">
                        {sym.library}
                      </span>
                    </div>
                    <p className="text-[11px] text-cad-textMuted mt-0.5 line-clamp-1">{sym.description}</p>
                  </div>
                  <span className="text-[10px] text-cad-textMuted font-mono whitespace-nowrap">{sym.pins.length} pins</span>
                </div>
              );
            })}

            {filteredSymbols.length === 0 && (
              <div className="text-center py-12 text-cad-textMuted text-xs">
                No symbols found matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Right: Symbol Details & Pins Preview */}
          <div className="w-1/2 p-4 flex flex-col overflow-y-auto bg-cad-bg/50">
            {selectedSymbol ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedSymbol.name}
                    <span className="text-xs font-normal text-cad-textMuted font-mono">[{selectedSymbol.defaultPrefix}?]</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">{selectedSymbol.description}</p>
                  <p className="text-[11px] text-blue-400 mt-1 font-mono">Default Footprint: {selectedSymbol.defaultFootprint || 'None'}</p>
                </div>

                {/* Pins Table */}
                <div>
                  <h4 className="text-xs font-semibold text-cad-textMuted uppercase tracking-wider mb-2 font-mono">
                    Pin Configuration ({selectedSymbol.pins.length} Pins)
                  </h4>
                  <div className="border border-cad-border rounded overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[10px]">
                        <tr>
                          <th className="px-3 py-1.5">#</th>
                          <th className="px-3 py-1.5">Name</th>
                          <th className="px-3 py-1.5">Electrical Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cad-border bg-cad-panel">
                        {selectedSymbol.pins.map((p) => (
                          <tr key={p.id} className="hover:bg-cad-subpanel">
                            <td className="px-3 py-1 font-bold text-white">{p.number}</td>
                            <td className="px-3 py-1 text-slate-200">{p.name}</td>
                            <td className="px-3 py-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] ${
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
              </div>
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
                onSelectSymbol(selectedSymbol);
                onClose();
              }
            }}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded shadow-sm"
          >
            Place Symbol
          </button>
        </div>
      </div>
    </div>
  );
};
