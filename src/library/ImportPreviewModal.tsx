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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md select-none">
      <div className="bg-cad-panel border border-cad-border w-[1050px] h-[680px] rounded-xl shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-14 bg-cad-header border-b border-cad-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Layers size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Import Library Preview & Inspection</h2>
              <div className="text-[11px] text-cad-textMuted flex items-center gap-3 font-mono mt-0.5">
                <span>{analysis.totalCount} items detected</span>
                <span>•</span>
                <span className="text-blue-400">{analysis.symbolCount} Symbols</span>
                <span>•</span>
                <span className="text-emerald-400">{analysis.footprintCount} Footprints</span>
                {analysis.duplicateCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400">{analysis.duplicateCount} Duplicates</span>
                  </>
                )}
                {analysis.unsupportedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-red-400">{analysis.unsupportedCount} Unsupported</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* 2-Pane Inspection Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Items List & Checkboxes */}
          <div className="w-[450px] border-r border-cad-border flex flex-col bg-cad-bg/30">
            {/* Filter Toolbar */}
            <div className="p-3 bg-cad-subpanel border-b border-cad-border space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-2 text-cad-textMuted" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-cad-bg border border-cad-border rounded pl-8 pr-2 py-1 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="px-2 py-1 bg-cad-bg hover:bg-cad-border rounded text-[11px] text-slate-300 font-semibold"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="px-2 py-1 bg-cad-bg hover:bg-cad-border rounded text-[11px] text-slate-300 font-semibold"
                  >
                    Deselect
                  </button>
                </div>
              </div>

              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1">
                {(['all', 'symbol', 'footprint', 'unsupported'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold transition-colors ${
                      typeFilter === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-cad-bg text-cad-textMuted hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Global Conflict Action (if duplicates exist) */}
            {analysis.duplicateCount > 0 && (
              <div className="px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                  <AlertTriangle size={12} /> Conflict Action:
                </span>
                <select
                  value={globalConflictAction}
                  onChange={(e) => handleApplyGlobalConflict(e.target.value as any)}
                  className="bg-cad-bg border border-amber-500/40 rounded px-2 py-0.5 text-[11px] text-white font-mono"
                >
                  <option value="keep_both">Keep Both (Import as copy)</option>
                  <option value="replace">Replace Existing</option>
                  <option value="skip">Skip Duplicates</option>
                  <option value="rename">Auto-Rename</option>
                </select>
              </div>
            )}

            {/* Items Checklist */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredItems.map((item) => {
                const isCurrent = selectedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${
                      isCurrent
                        ? 'bg-blue-600/20 border-blue-500/60'
                        : 'bg-cad-subpanel/60 hover:bg-cad-subpanel border-cad-border'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={item.selected}
                      disabled={item.status === 'error'}
                      onChange={() => handleToggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 rounded bg-cad-bg border-cad-border text-blue-600 focus:ring-0 cursor-pointer"
                    />

                    {/* Icon & Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          {item.type === 'symbol' && <Cpu size={13} className="text-blue-400 shrink-0" />}
                          {item.type === 'footprint' && <Layers size={13} className="text-emerald-400 shrink-0" />}
                          {item.type === 'model3d' && <Box size={13} className="text-amber-400 shrink-0" />}
                          {item.type === 'unsupported' && <FileCode size={13} className="text-red-400 shrink-0" />}
                          <span className="font-bold text-xs text-white truncate">{item.name}</span>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                            item.status === 'valid'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : item.status === 'warning'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-cad-textMuted truncate mt-0.5 font-mono">
                        {item.sourceLibraryName} • {item.sourceFilename}
                      </div>

                      {item.isDuplicate && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px] bg-cad-bg p-1.5 rounded border border-amber-500/30">
                          <span className="text-amber-400 font-mono">Duplicate in '{item.duplicateLocation}'</span>
                          <select
                            value={item.conflictAction || 'keep_both'}
                            onChange={(e) => handleItemConflictAction(item.id, e.target.value as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-cad-panel border border-cad-border rounded px-1.5 py-0.5 text-[10px] text-white font-mono"
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
          <div className="flex-1 flex flex-col p-4 bg-cad-bg/50 overflow-y-auto">
            {selectedItem ? (
              <div className="space-y-4 flex flex-col h-full">
                {/* Item Details Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {selectedItem.name}
                      <span className="text-xs px-2 py-0.5 bg-cad-border text-cad-textMuted rounded font-mono">
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
                    className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                      selectedItem.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
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
                  <div className="bg-cad-panel border border-cad-border p-3 rounded-lg text-xs space-y-2 font-mono">
                    <div className="font-bold text-white uppercase text-[10px] tracking-wider text-cad-textMuted">
                      Symbol Details ({selectedItem.parsedSymbol.pins.length} Pins)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>Default Prefix: <span className="text-white font-bold">{selectedItem.parsedSymbol.defaultPrefix}</span></div>
                      <div>Footprint Link: <span className="text-blue-400">{selectedItem.parsedSymbol.defaultFootprint || 'None'}</span></div>
                    </div>
                  </div>
                )}

                {selectedItem.parsedFootprint && (
                  <div className="bg-cad-panel border border-cad-border p-3 rounded-lg text-xs space-y-2 font-mono">
                    <div className="font-bold text-white uppercase text-[10px] tracking-wider text-cad-textMuted">
                      Footprint Details ({selectedItem.parsedFootprint.pads.length} Pads)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>Type: <span className="text-white font-bold">{selectedItem.parsedFootprint.isSMD ? 'SMD' : 'Through-Hole'}</span></div>
                      <div>3D Model: <span className="text-amber-400">{selectedItem.parsedFootprint.model3D?.modelPath || 'None'}</span></div>
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
        <div className="h-14 bg-cad-header border-t border-cad-border px-6 flex items-center justify-between">
          <div className="text-xs text-cad-textMuted font-mono">
            <span>{selectedCount} items selected for import</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-1.5 bg-cad-subpanel hover:bg-cad-border text-xs rounded text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCommitImport}
              disabled={isImporting || selectedCount === 0}
              className="px-5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white rounded flex items-center gap-1.5 shadow-md"
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
