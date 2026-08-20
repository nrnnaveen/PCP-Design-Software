/**
 * FloZ ECA - Symbol Library Sidebar Component
 * Fast component browsing, category filtering, vector thumbnail previews, and Drag & Drop placement.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { SymbolDefinition } from '../core/types';
import { libraryRegistry } from '../library/libraryRegistry';
import {
  Search,
  Cpu,
  Layers,
  ChevronLeft,
  ChevronRight,
  Zap,
  Radio,
  Sliders,
  Sparkles,
  FolderOpen,
} from 'lucide-react';

interface Props {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSymbol: (symbol: SymbolDefinition) => void;
  onArmPlacement: (symbol: SymbolDefinition) => void;
}

export const SymbolLibrarySidebar: React.FC<Props> = ({
  isCollapsed,
  onToggleCollapse,
  onSelectSymbol,
  onArmPlacement,
}) => {
  const [allSymbols, setAllSymbols] = useState<SymbolDefinition[]>(() =>
    libraryRegistry.getAllSymbols()
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSymbolId, setSelectedSymbolId] = useState<string>(allSymbols[0]?.id || '');

  // Keep synced with dynamic library registry
  useEffect(() => {
    const unsub = libraryRegistry.subscribe(() => {
      const syms = libraryRegistry.getAllSymbols();
      setAllSymbols(syms);
      if (!selectedSymbolId && syms.length > 0) {
        setSelectedSymbolId(syms[0].id);
      }
    });
    return unsub;
  }, [selectedSymbolId]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    allSymbols.forEach((s) => cats.add(s.category || s.library || 'General'));
    return Array.from(cats);
  }, [allSymbols]);

  const [displayLimit, setDisplayLimit] = useState<number>(30);

  useEffect(() => {
    setDisplayLimit(30);
  }, [searchQuery, selectedCategory]);

  // Filtered symbols
  const filteredSymbols = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allSymbols.filter((s) => {
      const cat = s.category || s.library || 'General';
      const matchesCat = selectedCategory === 'All' || cat === selectedCategory;
      if (!q) return matchesCat;

      return (
        matchesCat &&
        (s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q)) ||
          s.library.toLowerCase().includes(q))
      );
    });
  }, [allSymbols, searchQuery, selectedCategory]);

  const visibleSymbols = useMemo(() => {
    return filteredSymbols.slice(0, displayLimit);
  }, [filteredSymbols, displayLimit]);

  if (isCollapsed) {
    return (
      <div className="w-9 h-full bg-cad-panel border-r border-cad-border flex flex-col items-center py-3 select-none z-10">
        <button
          onClick={onToggleCollapse}
          title="Expand Symbol Library (Components)"
          className="p-1.5 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white"
        >
          <ChevronRight size={16} />
        </button>
        <div className="mt-8 [writing-mode:vertical-lr] text-[11px] font-bold uppercase tracking-wider text-cad-textMuted font-mono flex items-center gap-2">
          <Cpu size={12} className="text-blue-400" />
          <span>Symbols Library</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-cad-panel border-r border-cad-border flex flex-col select-none z-10">
      {/* Header */}
      <div className="h-10 bg-cad-header border-b border-cad-border px-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Cpu size={15} className="text-blue-400" />
          <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
            Symbol Library
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          title="Collapse Symbol Library"
          className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-cad-subpanel border-b border-cad-border space-y-1.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2 text-cad-textMuted" />
          <input
            type="text"
            placeholder="Search (e.g. R, STM32, USB)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cad-bg border border-cad-border rounded pl-8 pr-2 py-1 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar text-[10px]">
          {categories.slice(0, 10).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded whitespace-nowrap font-mono font-medium transition-colors ${
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

      {/* Symbols List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-cad-bg/20">
        {visibleSymbols.map((sym) => {
          const isSelected = selectedSymbolId === sym.id;

          return (
            <div
              key={sym.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/floz-symbol-id', sym.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => {
                setSelectedSymbolId(sym.id);
                onSelectSymbol(sym);
              }}
              onDoubleClick={() => {
                onArmPlacement(sym);
              }}
              title="Double click or Drag onto canvas to place"
              className={`p-2 rounded-lg cursor-grab active:cursor-grabbing border transition-all flex items-start gap-2.5 ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500/50 shadow-sm'
                  : 'bg-cad-subpanel/50 hover:bg-cad-subpanel border-cad-border/60'
              }`}
            >
              <div className="p-1.5 rounded bg-cad-bg border border-cad-border text-blue-400 shrink-0 mt-0.5">
                <Cpu size={14} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white truncate">{sym.name}</span>
                  <span className="text-[10px] font-mono px-1 bg-cad-border text-slate-300 rounded shrink-0">
                    {sym.defaultPrefix}?
                  </span>
                </div>
                <p className="text-[11px] text-cad-textMuted truncate mt-0.5">{sym.description}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>{sym.library}</span>
                  <span className="text-emerald-400">{sym.pins.length} pins</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSymbols.length > displayLimit && (
          <button
            onClick={() => setDisplayLimit((prev) => prev + 30)}
            className="w-full py-1.5 mt-1 bg-cad-subpanel hover:bg-cad-border text-blue-400 hover:text-blue-300 rounded text-xs font-mono font-semibold transition-colors"
          >
            Show More ({filteredSymbols.length - displayLimit} remaining)...
          </button>
        )}

        {filteredSymbols.length === 0 && (
          <div className="text-center py-10 text-cad-textMuted text-xs font-mono">
            No matching symbols.
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 bg-cad-subpanel border-t border-cad-border text-[10px] text-cad-textMuted font-mono flex items-center justify-between">
        <span>{filteredSymbols.length} Symbols</span>
        <span className="text-blue-400">Drag to Place</span>
      </div>
    </div>
  );
};
