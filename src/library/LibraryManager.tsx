/**
 * FloZ ECA - Professional Library Manager
 * Central management hub for System, Project, Imported, and Custom KiCad component libraries.
 */

import React, { useState, useEffect, useRef } from 'react';
import { libraryRegistry, LibraryPackage, LibraryCategory } from './libraryRegistry';
import { LibraryImportAnalyzer, ImportAnalysisSummary } from './importAnalyzer';
import { ImportPreviewModal } from './ImportPreviewModal';
import { ComponentPreviewCanvas } from './ComponentPreviewCanvas';
import { SymbolDefinition, FootprintDefinition } from '../core/types';
import {
  Layers,
  FolderOpen,
  Upload,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Cpu,
  Box,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LibraryManager: React.FC<Props> = ({ isOpen, onClose }) => {
  const [libraries, setLibraries] = useState<LibraryPackage[]>(() => libraryRegistry.getLibraries());
  const [selectedLibId, setSelectedLibId] = useState<string>(libraries[0]?.id || '');
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Component within active library
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolDefinition | undefined>();
  const [selectedFootprint, setSelectedFootprint] = useState<FootprintDefinition | undefined>();

  // Import Dialog states
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysisSummary | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const [isLoadingLib, setIsLoadingLib] = useState<boolean>(false);
  const [isBulkLoading, setIsBulkLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to registry updates
  useEffect(() => {
    const unsub = libraryRegistry.subscribe(() => {
      const updated = libraryRegistry.getLibraries();
      setLibraries(updated);
      if (!selectedLibId && updated.length > 0) {
        setSelectedLibId(updated[0].id);
      }
    });
    return unsub;
  }, [selectedLibId]);

  const selectedLibrary = libraries.find((l) => l.id === selectedLibId);

  // Synchronize selection
  useEffect(() => {
    if (!selectedLibrary) return;
    if (selectedLibrary.symbols.length > 0 && (!selectedSymbol || !selectedLibrary.symbols.find((s) => s.id === selectedSymbol.id))) {
      setSelectedSymbol(selectedLibrary.symbols[0]);
      setSelectedFootprint(undefined);
    } else if (selectedLibrary.footprints.length > 0 && (!selectedFootprint || !selectedLibrary.footprints.find((f) => f.id === selectedFootprint.id))) {
      setSelectedFootprint(selectedLibrary.footprints[0]);
      setSelectedSymbol(undefined);
    }
  }, [selectedLibId, selectedLibrary?.id]);

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  // Filtered Libraries
  const filteredLibraries = libraries.filter((lib) => {
    const matchCat = activeCategory === 'All' || lib.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchCat;
    return matchCat && (lib.name.toLowerCase().includes(q) || lib.description.toLowerCase().includes(q));
  });

  // Handle Files Selected
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const analysis = await LibraryImportAnalyzer.analyzeFiles(fileArray);
    setImportAnalysis(analysis);
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Handle Import Confirmed
  const handleImportConfirmed = (newLib: LibraryPackage) => {
    libraryRegistry.addLibrary(newLib);
    setImportAnalysis(null);
    setSelectedLibId(newLib.id);
    showStatus(`Successfully imported library "${newLib.name}" (${newLib.symbols.length} symbols, ${newLib.footprints.length} footprints)`);
  };

  const handleRemoveLib = (libId: string) => {
    const success = libraryRegistry.removeLibrary(libId);
    if (success) {
      showStatus('Library removed.');
      const remaining = libraryRegistry.getLibraries();
      if (remaining.length > 0) setSelectedLibId(remaining[0].id);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none ${isDraggingOver ? 'ring-4 ring-blue-500/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="bg-cad-panel border border-cad-border w-[1100px] h-[720px] rounded-xl shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-14 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                FloZ ECA Library Manager
                <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-mono">
                  {libraries.length} Libraries Available
                </span>
              </h1>
              <p className="text-[11px] text-cad-textMuted font-mono">
                System, Project, and User-Imported Component Packages
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Upload size={13} />
              Upload Files
            </button>

            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-border text-slate-200 border border-cad-border rounded text-xs font-semibold flex items-center gap-1.5"
            >
              <FolderOpen size={13} className="text-amber-400" />
              Upload Folder
            </button>

            <button onClick={onClose} className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white ml-2">
              <X size={18} />
            </button>

            {/* Hidden HTML file and directory inputs */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".kicad_sym,.kicad_mod,.step,.stp,.glb,.gltf"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </div>
        </div>

        {/* Drag & Drop Notice Banner */}
        {isDraggingOver && (
          <div className="bg-blue-600/20 border-b border-blue-500/50 py-2 text-center text-xs text-blue-300 font-mono flex items-center justify-center gap-2 animate-pulse">
            <Upload size={14} /> Drop KiCad Symbol (.kicad_sym) or Footprint (.kicad_mod) libraries to import
          </div>
        )}

        {statusNotification && (
          <div className="bg-emerald-600/20 border-b border-emerald-500/50 py-2 px-6 text-xs text-emerald-300 font-mono flex items-center gap-2">
            <CheckCircle2 size={14} /> {statusNotification}
          </div>
        )}

        {/* 3-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Libraries Tree & Filters */}
          <div className="w-64 border-r border-cad-border flex flex-col bg-cad-bg/40">
            {/* Category Filter Tabs */}
            <div className="p-2.5 bg-cad-subpanel border-b border-cad-border flex items-center gap-1 overflow-x-auto">
              {(['All', 'System', 'Imported', 'Project'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
                    activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-cad-bg text-cad-textMuted hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Libraries List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredLibraries.map((lib) => {
                const isSelected = selectedLibId === lib.id;
                const symCount = lib.symbols.length;
                const fpCount = lib.footprints.length;

                return (
                  <div
                    key={lib.id}
                    onClick={() => {
                      setSelectedLibId(lib.id);
                      setSelectedSymbol(lib.symbols[0]);
                      setSelectedFootprint(lib.footprints[0]);
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/50'
                        : 'bg-cad-subpanel/50 hover:bg-cad-subpanel border-cad-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate">{lib.name}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                          lib.category === 'System'
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {lib.category}
                      </span>
                    </div>

                    <div className="text-[11px] text-cad-textMuted mt-1 flex items-center gap-2 font-mono">
                      {symCount > 0 && <span>{symCount} Syms</span>}
                      {fpCount > 0 && <span>{fpCount} FPs</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Pane: Components within Selected Library */}
          <div className="w-80 border-r border-cad-border flex flex-col bg-cad-bg/20">
            {selectedLibrary ? (
              <>
                <div className="p-3 bg-cad-subpanel border-b border-cad-border flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-white truncate">{selectedLibrary.name}</h3>
                    <span className="text-[10px] text-cad-textMuted font-mono">
                      {selectedLibrary.symbols.length} symbols, {selectedLibrary.footprints.length} footprints
                    </span>
                  </div>

                  {selectedLibrary.category !== 'System' && (
                    <button
                      onClick={() => handleRemoveLib(selectedLibrary.id)}
                      title="Remove Library"
                      className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-cad-textMuted"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Symbols & Footprints List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-3">
                  {isLoadingLib && (
                    <div className="p-8 flex flex-col items-center justify-center text-cad-textMuted text-xs font-mono space-y-2">
                      <RefreshCw size={20} className="animate-spin text-blue-400" />
                      <span>Loading library components...</span>
                    </div>
                  )}

                  {selectedLibrary.symbols.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-mono font-bold text-cad-textMuted px-1 mb-1">
                        Symbols ({selectedLibrary.symbols.length})
                      </div>
                      <div className="space-y-1">
                        {selectedLibrary.symbols.slice(0, 50).map((sym) => {
                          const hasUnits = Boolean(sym.units && sym.units.length > 1);
                          return (
                            <div
                              key={sym.id}
                              onClick={() => {
                                setSelectedSymbol(sym);
                                setSelectedFootprint(undefined);
                              }}
                              className={`p-2 rounded cursor-pointer border transition-colors flex items-center justify-between ${
                                selectedSymbol?.id === sym.id
                                  ? 'bg-blue-600/20 border-blue-500/50'
                                  : 'bg-cad-subpanel hover:bg-cad-border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Cpu size={13} className="text-blue-400 shrink-0" />
                                <span className="text-xs font-semibold text-white truncate">{sym.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {hasUnits && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded font-mono font-semibold">
                                    {sym.units!.length} Units
                                  </span>
                                )}
                                <span className="text-[10px] text-cad-textMuted font-mono">{sym.pins.length} pins</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {selectedLibrary.symbols.length > 50 && (
                        <div className="text-[10px] text-cad-textMuted font-mono text-center py-1 mt-1">
                          Showing first 50 of {selectedLibrary.symbols.length} symbols
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLibrary.footprints.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-mono font-bold text-cad-textMuted px-1 mb-1">
                        Footprints ({selectedLibrary.footprints.length})
                      </div>
                      <div className="space-y-1">
                        {selectedLibrary.footprints.slice(0, 50).map((fp) => (
                          <div
                            key={fp.id}
                            onClick={() => {
                              setSelectedFootprint(fp);
                              setSelectedSymbol(undefined);
                            }}
                            className={`p-2 rounded cursor-pointer border transition-colors flex items-center justify-between ${
                              selectedFootprint?.id === fp.id
                                ? 'bg-blue-600/20 border-blue-500/50'
                                : 'bg-cad-subpanel hover:bg-cad-border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Layers size={13} className="text-emerald-400 shrink-0" />
                              <span className="text-xs font-semibold text-white truncate">{fp.name}</span>
                            </div>
                            <span className="text-[10px] text-cad-textMuted font-mono">{fp.pads.length} pads</span>
                          </div>
                        ))}
                      </div>
                      {selectedLibrary.footprints.length > 50 && (
                        <div className="text-[10px] text-cad-textMuted font-mono text-center py-1 mt-1">
                          Showing first 50 of {selectedLibrary.footprints.length} footprints
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {/* Right Pane: Vector Canvas Preview & Details */}
          <div className="flex-1 p-5 flex flex-col bg-cad-bg/50 overflow-y-auto">
            {selectedSymbol || selectedFootprint ? (
              <div className="flex flex-col h-full space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedSymbol?.name || selectedFootprint?.name}
                    <span className="text-xs px-2 py-0.5 bg-cad-border text-cad-textMuted rounded font-mono">
                      {selectedSymbol ? 'SYMBOL' : 'FOOTPRINT'}
                    </span>
                    {selectedSymbol?.units && selectedSymbol.units.length > 1 && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded font-mono">
                        {selectedSymbol.units.length} Logical Units
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-cad-textMuted mt-0.5 font-mono">
                    {selectedSymbol?.description || selectedFootprint?.description}
                  </p>
                </div>

                {/* Scalable Vector Canvas */}
                <div className="flex-1 min-h-[300px]">
                  <ComponentPreviewCanvas symbol={selectedSymbol} footprint={selectedFootprint} className="h-full" />
                </div>

                {/* Properties Summary Table */}
                <div className="bg-cad-panel border border-cad-border p-3 rounded-lg text-xs font-mono space-y-2">
                  {selectedSymbol && (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>Default Prefix: <span className="text-white font-bold">{selectedSymbol.defaultPrefix}</span></div>
                        <div>Default Footprint: <span className="text-blue-400">{selectedSymbol.defaultFootprint || 'None'}</span></div>
                        <div>Category: <span className="text-slate-300">{selectedSymbol.category}</span></div>
                        <div>Total Pins: <span className="text-emerald-400 font-bold">{selectedSymbol.pins.length}</span></div>
                      </div>

                      {selectedSymbol.units && selectedSymbol.units.length > 1 && (
                        <div className="pt-2 border-t border-cad-border">
                          <div className="text-[10px] uppercase font-bold text-blue-400 mb-1.5 flex items-center justify-between">
                            <span>Logical Units Breakdown ({selectedSymbol.units.length} Units)</span>
                            <span className="text-slate-400 font-normal">Select unit in canvas toolbar above</span>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {selectedSymbol.units.map((u) => (
                              <div key={u.unit} className="flex items-center justify-between bg-cad-bg/60 p-1.5 rounded border border-cad-border text-[10px]">
                                <span className={`font-bold ${u.isPower ? 'text-amber-400' : 'text-blue-300'}`}>
                                  Unit {u.name || u.unit} {u.isPower ? '(Power)' : ''}
                                </span>
                                <span className="text-slate-300 font-mono">
                                  {u.pins.length} pins: {u.pins.map((p) => `${p.number}:${p.name}`).join(', ') || 'None'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedFootprint && (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>Pad Count: <span className="text-white font-bold">{selectedFootprint.pads.length}</span></div>
                      <div>Type: <span className="text-slate-300">{selectedFootprint.isSMD ? 'SMD' : 'Through-Hole'}</span></div>
                      <div>3D Package: <span className="text-amber-400">{selectedFootprint.model3D?.packageType || 'None'}</span></div>
                      <div>Courtyard: <span className="text-slate-300">{(selectedFootprint.courtyard.maxX - selectedFootprint.courtyard.minX).toFixed(1)} x {(selectedFootprint.courtyard.maxY - selectedFootprint.courtyard.minY).toFixed(1)} mm</span></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-cad-textMuted text-xs font-mono space-y-2">
                <Info size={24} className="opacity-40" />
                <span>Select a symbol or footprint to view vector geometry.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-cad-header border-t border-cad-border px-6 flex items-center justify-between text-xs text-cad-textMuted font-mono">
          <span>{libraries.length} Libraries Loaded ({libraryRegistry.getAllSymbols().length} Symbols, {libraryRegistry.getAllFootprints().length} Footprints)</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold shadow-sm">
            Done
          </button>
        </div>
      </div>

      {/* Import Preview Modal */}
      {importAnalysis && (
        <ImportPreviewModal
          analysis={importAnalysis}
          isOpen={Boolean(importAnalysis)}
          onClose={() => setImportAnalysis(null)}
          onImportComplete={(summary) => {
            showStatus(`Successfully imported ${summary.importedCount} items into FloZ ECA.`);
          }}
        />
      )}
    </div>
  );
};
