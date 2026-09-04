/**
 * FloZ ECA — Symbol Library Sidebar
 * Fast component browsing, category filtering, vector thumbnail previews, and Drag & Drop placement.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { SymbolDefinition } from '../core/types';
import { libraryRegistry } from '../library/libraryRegistry';
import {
  Search,
  Cpu,
  ChevronLeft,
  ChevronRight,
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
      <div className="w-9 h-full bg-cad-panel border-r border-cad-border flex flex-col items-center py-2.5 select-none z-10 text-cad-text">
        <button
          onClick={onToggleCollapse}
          title="Expand Symbol Library"
          className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors"
        >
          <ChevronRight size={15} />
        </button>
        <div className="mt-8 [writing-mode:vertical-lr] text-[11px] font-semibold uppercase tracking-wider text-cad-textMuted font-mono flex items-center gap-2">
          <Cpu size={12} className="text-blue-600 dark:text-blue-400" />
          <span>Symbols Library</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-cad-panel border-r border-cad-border flex flex-col select-none z-10 text-cad-text">
      {/* Header */}
      <div className="h-8 bg-cad-header border-b border-cad-border px-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Cpu size={13} className="text-blue-600 dark:text-blue-400" />
          <span className="text-[11px] font-semibold text-cad-textHeading uppercase font-mono tracking-wider">
            Component Palette
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          title="Collapse Component Palette"
          className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-cad-subpanel border-b border-cad-border space-y-1.5">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-cad-textMuted" />
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-xs pl-6 pr-2 py-0.5 text-xs text-cad-inputText font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar text-[10px]">
          {categories.slice(0, 10).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-1.5 py-0.5 rounded-xs whitespace-nowrap font-mono font-medium transition-colors duration-fast border ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-cad-panel text-cad-text border-cad-border hover:bg-cad-surfaceHover'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Symbols List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-cad-bg">
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
              className={`p-1.5 rounded-xs border cursor-grab active:cursor-grabbing transition-colors duration-fast flex items-start gap-2 ${
                isSelected
                  ? 'bg-blue-500/15 border-blue-500 shadow-xs'
                  : 'bg-cad-panel hover:bg-cad-surfaceHover border-cad-border'
              }`}
            >
              <div className="p-1 rounded-xs bg-cad-subpanel border border-cad-border text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                <Cpu size={12} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-xs text-cad-textHeading truncate">{sym.name}</span>
                  <span className="text-[10px] font-mono px-1 bg-cad-subpanel border border-cad-border text-cad-text rounded-xs shrink-0">
                    {sym.defaultPrefix}?
                  </span>
                </div>
                <p className="text-[11px] text-cad-textMuted truncate">{sym.description}</p>
                <div className="flex items-center justify-between text-[10px] text-cad-textMuted font-mono mt-0.5">
                  <span className="truncate">{sym.library}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{sym.pins.length} pins</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSymbols.length > displayLimit && (
          <button
            onClick={() => setDisplayLimit((prev) => prev + 30)}
            className="w-full py-1 bg-cad-subpanel hover:bg-cad-surfaceHover border border-cad-border text-blue-600 dark:text-blue-400 rounded text-xs font-mono font-medium transition-colors"
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
      <div className="h-6 px-2 bg-cad-subpanel border-t border-cad-border text-[10px] text-cad-textMuted font-mono flex items-center justify-between">
        <span>{filteredSymbols.length} Symbols</span>
        <span className="text-blue-600 dark:text-blue-400 font-semibold">Drag to Place</span>
      </div>
    </div>
  );
};
