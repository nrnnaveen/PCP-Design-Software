/**
 * FloZ ECA - Multi-Select Library Import Preview & Conflict Resolution Modal
 * Interactive inspection list with vector preview, conflict handling, and batch commit.
 */

import React, { useState } from 'react';
import { ImportAnalysisSummary, ImportItem, ConflictResolutionAction } from './importAnalyzer';
import { ComponentPreviewCanvas } from './ComponentPreviewCanvas';
import { libraryRegistry } from './libraryRegistry';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Box,
  FileCode,
  Search,
  Filter,
  Check,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  analysis: ImportAnalysisSummary;
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (summary: { importedCount: number; libNames: string[] }) => void;
}

export const ImportPreviewModal: React.FC<Props> = ({
  analysis,
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [items, setItems] = useState<ImportItem[]>(analysis.items);
  const [selectedItemId, setSelectedItemId] = useState<string>(
    analysis.items.find((i) => i.status !== 'error')?.id || analysis.items[0]?.id || ''
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'symbol' | 'footprint' | 'unsupported'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [globalConflictAction, setGlobalConflictAction] = useState<ConflictResolutionAction>('keep_both');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);

  if (!isOpen) return null;

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchType;
    return (
      matchType &&
      (item.name.toLowerCase().includes(q) ||
        item.sourceFilename.toLowerCase().includes(q) ||
        item.sourceLibraryName.toLowerCase().includes(q))
    );
  });

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.status === 'error' ? { ...item, selected: false } : { ...item, selected: select }))
    );
  };

  // Conflict Action Change
  const handleItemConflictAction = (id: string, action: ConflictResolutionAction) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, conflictAction: action } : item))
    );
  };

  const handleApplyGlobalConflict = (action: ConflictResolutionAction) => {
    setGlobalConflictAction(action);
    setItems((prev) =>
      prev.map((item) => (item.isDuplicate ? { ...item, conflictAction: action } : item))
    );
  };

  // Commit Import Transaction
  const handleCommitImport = async () => {
    setIsImporting(true);
    setImportProgress(10);

    const selectedValidItems = items.filter((i) => i.selected && i.status !== 'error');
    const librariesToUpdate: Map<
      string,
      { symbols: any[]; footprints: any[]; sourceFilename: string }
    > = new Map();

    const totalSteps = selectedValidItems.length || 1;
    let step = 0;

    for (const item of selectedValidItems) {
      step++;
      setImportProgress(Math.round((step / totalSteps) * 90));

      const libKey = `imported_${item.sourceLibraryName.toLowerCase()}`;
      if (!librariesToUpdate.has(libKey)) {
        librariesToUpdate.set(libKey, {
          symbols: [],
          footprints: [],
          sourceFilename: item.sourceFilename,
        });
      }

      const libData = librariesToUpdate.get(libKey)!;

      if (item.type === 'symbol' && item.parsedSymbol) {
        let symToSave = { ...item.parsedSymbol };
        if (item.isDuplicate) {
          if (item.conflictAction === 'skip') continue;
          if (item.conflictAction === 'rename' || item.conflictAction === 'keep_both') {
            symToSave.name = `${symToSave.name}_imported`;
          }
        }
        libData.symbols.push(symToSave);
      } else if (item.type === 'footprint' && item.parsedFootprint) {
        let fpToSave = { ...item.parsedFootprint };
        if (item.isDuplicate) {
          if (item.conflictAction === 'skip') continue;
          if (item.conflictAction === 'rename' || item.conflictAction === 'keep_both') {
            fpToSave.name = `${fpToSave.name}_imported`;
            fpToSave.id = `${fpToSave.library}:${fpToSave.name}`;
          }
        }
        libData.footprints.push(fpToSave);
      }
    }

    // Commit to Library Registry
    const now = new Date().toLocaleDateString();
    const updatedLibNames: string[] = [];

    librariesToUpdate.forEach((data, libId) => {
      const libName = libId.replace(/^imported_/, '');
      updatedLibNames.push(libName);

      const existing = libraryRegistry.getLibrary(libId);
      if (existing) {
        if (data.symbols.length > 0) libraryRegistry.addSymbolsToLibrary(libId, data.symbols);
        if (data.footprints.length > 0) libraryRegistry.addFootprintsToLibrary(libId, data.footprints);
      } else {
        libraryRegistry.addLibrary({
          id: libId,
          name: libName,
          category: 'Imported',
          description: `Imported KiCad Library from ${data.sourceFilename}`,
          importDate: now,
          sourceFilename: data.sourceFilename,
          symbols: data.symbols,
          footprints: data.footprints,
        });
      }
    });

    setImportProgress(100);
    setTimeout(() => {
      setIsImporting(false);
      onImportComplete({
        importedCount: selectedValidItems.length,
        libNames: updatedLibNames,
      });
      onClose();
    }, 400);
  };

  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop select-none p-4 font-sans">
      <div className="bg-cad-panel border border-cad-border w-[1050px] max-w-full h-[680px] max-h-full rounded shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-cad-textHeading">Import Library Preview &amp; Inspection</h2>
              <div className="text-[11px] text-cad-textMuted flex items-center gap-3 font-mono mt-0.5">
                <span>{analysis.totalCount} items detected</span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{analysis.symbolCount} Symbols</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{analysis.footprintCount} Footprints</span>
                {analysis.duplicateCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">{analysis.duplicateCount} Duplicates</span>
                  </>
                )}
                {analysis.errorCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">{analysis.errorCount} Errors</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Multi-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Filterable Items List */}
          <div className="w-[440px] border-r border-cad-border flex flex-col bg-cad-panel">
            {/* Search & Filter Toolbar */}
            <div className="p-3 border-b border-cad-border space-y-2 bg-cad-subpanel">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cad-textMuted" />
                <input
                  type="text"
                  placeholder="Filter imported symbols and footprints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded pl-8 pr-3 py-1 text-xs text-cad-inputText font-mono placeholder:text-cad-textMuted focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Type Filter Buttons */}
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                <div className="flex items-center gap-1">
                  {(['all', 'symbol', 'footprint'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTypeFilter(filter)}
                      className={`px-2 py-0.5 rounded font-medium capitalize transition-colors ${
                        typeFilter === filter
                          ? 'bg-blue-600 text-white shadow-xs font-semibold'
                          : 'bg-cad-panel text-cad-text border border-cad-border hover:bg-cad-surfaceHover'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Bulk Select/Deselect */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-[11px]"
                  >
                    All
                  </button>
                  <span className="text-cad-textMuted">|</span>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="text-cad-textMuted hover:text-cad-text font-mono text-[11px]"
                  >
                    None
                  </button>
                </div>
              </div>
            </div>

            {/* Items Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-cad-bg">
              {filteredItems.map((item) => {
                const isCurrent = selectedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-2 rounded border cursor-pointer transition-colors flex items-start gap-2.5 ${
                      isCurrent
                        ? 'bg-blue-600/15 border-blue-500'
                        : 'bg-cad-subpanel hover:bg-cad-surfaceHover border-cad-border'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={item.selected}
                      disabled={item.status === 'error'}
                      onChange={() => handleToggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 rounded bg-cad-inputBg border-cad-inputBorder text-blue-600 focus:ring-0 cursor-pointer"
                    />

                    {/* Icon & Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          {item.type === 'symbol' && <Cpu size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                          {item.type === 'footprint' && <Layers size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                          {item.type === 'model3d' && <Box size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />}
                          {item.type === 'unsupported' && <FileCode size={13} className="text-red-600 dark:text-red-400 shrink-0" />}
                          <span className="font-semibold text-xs text-cad-textHeading truncate">{item.name}</span>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                            item.status === 'valid'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium'
                              : item.status === 'warning'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium'
                              : 'bg-red-500/15 text-red-600 dark:text-red-400 font-medium'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-cad-textMuted truncate mt-0.5 font-mono">
                        {item.sourceLibraryName} • {item.sourceFilename}
                      </div>

                      {item.isDuplicate && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px] bg-cad-subpanel p-1.5 rounded border border-amber-500/30">
                          <span className="text-amber-600 dark:text-amber-400 font-mono">Duplicate in '{item.duplicateLocation}'</span>
                          <select
                            value={item.conflictAction || 'keep_both'}
                            onChange={(e) => handleItemConflictAction(item.id, e.target.value as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-cad-inputBg border border-cad-inputBorder rounded px-1.5 py-0.5 text-[10px] text-cad-inputText font-mono"
                          >
                            <option value="keep_both">Keep Both</option>
                            <option value="replace">Replace</option>
                            <option value="skip">Skip</option>
                            <option value="rename">Rename</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-cad-textMuted text-xs font-mono">
                  No items match current filters.
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Vector Preview & Properties */}
          <div className="flex-1 flex flex-col p-4 bg-cad-bg overflow-y-auto">
            {selectedItem ? (
              <div className="space-y-4 flex flex-col h-full">
                {/* Item Details Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-cad-textHeading flex items-center gap-2">
                      {selectedItem.name}
                      <span className="text-xs px-2 py-0.5 bg-cad-subpanel border border-cad-border text-cad-textMuted rounded font-mono">
                        {selectedItem.type.toUpperCase()}
                      </span>
                    </h3>
                    <p className="text-xs text-cad-textMuted mt-0.5 font-mono">
                      Source: {selectedItem.sourceFilename} (Library: {selectedItem.sourceLibraryName})
                    </p>
                  </div>
                </div>

                {/* Diagnostics Message if warning/error */}
                {selectedItem.message && (
                  <div
                    className={`p-2.5 rounded border text-xs font-mono flex items-start gap-2 ${
                      selectedItem.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {selectedItem.status === 'error' ? <XCircle size={14} className="shrink-0 mt-0.5" /> : <AlertTriangle size={14} className="shrink-0 mt-0.5" />}
                    <span>{selectedItem.message}</span>
                  </div>
                )}

                {/* Vector Canvas Preview */}
                {(selectedItem.parsedSymbol || selectedItem.parsedFootprint) && (
                  <div className="flex-1 min-h-[260px]">
                    <ComponentPreviewCanvas
                      symbol={selectedItem.parsedSymbol}
                      footprint={selectedItem.parsedFootprint}
                      className="h-full"
                    />
                  </div>
                )}

                {/* Metadata Properties Table */}
                {selectedItem.parsedSymbol && (
                  <div className="bg-cad-panel border border-cad-border p-3 rounded text-xs space-y-2 font-mono">
                    <div className="font-semibold uppercase text-[10px] tracking-wider text-cad-textMuted">
                      Symbol Details ({selectedItem.parsedSymbol.pins.length} Pins)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>Default Prefix: <span className="text-cad-textHeading font-semibold">{selectedItem.parsedSymbol.defaultPrefix}</span></div>
                      <div>Footprint Link: <span className="text-blue-600 dark:text-blue-400">{selectedItem.parsedSymbol.defaultFootprint || 'None'}</span></div>
                    </div>
                  </div>
                )}

                {selectedItem.parsedFootprint && (
                  <div className="bg-cad-panel border border-cad-border p-3 rounded text-xs space-y-2 font-mono">
                    <div className="font-semibold uppercase text-[10px] tracking-wider text-cad-textMuted">
                      Footprint Details ({selectedItem.parsedFootprint.pads.length} Pads)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>Type: <span className="text-cad-textHeading font-semibold">{selectedItem.parsedFootprint.isSMD ? 'SMD' : 'Through-Hole'}</span></div>
                      <div>3D Model: <span className="text-amber-600 dark:text-amber-400">{selectedItem.parsedFootprint.model3D?.modelPath || 'None'}</span></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-cad-textMuted text-xs font-mono">
                Select an item to view vector preview.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-cad-header border-t border-cad-border px-5 flex items-center justify-between">
          <div className="text-xs text-cad-textMuted font-mono">
            <span>{selectedCount} items selected for import</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-1.5 bg-cad-panel hover:bg-cad-surfaceHover border border-cad-border text-xs rounded text-cad-text font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitImport}
              disabled={isImporting || selectedCount === 0}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white rounded flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {isImporting ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing ({importProgress}%)...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Import Selected ({selectedCount})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
