/**
 * FloZ ECA — Microsoft Fluent Component & Library Management Dialog
 * Supports browsing, searching, previewing, and importing KiCad symbol & footprint libraries.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  libraryRegistry,
  ApexLibrary,
  ApexSymbolDef,
  ApexFootprintDef,
} from './libraryRegistry';
import { LibraryImportAnalyzer } from './importAnalyzer';
import { ComponentPreviewCanvas } from './ComponentPreviewCanvas';
import { ImportPreviewModal } from './ImportPreviewModal';
import {
  Layers,
  Upload,
  FolderOpen,
  Cpu,
  CheckCircle2,
  Trash2,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol?: (symbol: ApexSymbolDef) => void;
  onSelectFootprint?: (footprint: ApexFootprintDef) => void;
}

export const LibraryManager: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  onSelectFootprint,
}) => {
  const [libraries, setLibraries] = useState<ApexLibrary[]>(() => libraryRegistry.getAllLibraries());
  const [selectedLibId, setSelectedLibId] = useState<string>(libraries[0]?.id || '');
  const [selectedSymbol, setSelectedSymbol] = useState<ApexSymbolDef | undefined>();
  const [selectedFootprint, setSelectedFootprint] = useState<ApexFootprintDef | undefined>();
  const [activeCategory, setActiveCategory] = useState<'All' | 'System' | 'Imported' | 'Project'>('All');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [importAnalysis, setImportAnalysis] = useState<any | null>(null);
  const [isLoadingLib, setIsLoadingLib] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = libraryRegistry.subscribe(() => {
      const updated = libraryRegistry.getAllLibraries();
      setLibraries(updated);
      if (!selectedLibId && updated.length > 0) {
        setSelectedLibId(updated[0].id);
      }
    });
    return unsub;
  }, [selectedLibId]);

  if (!isOpen) return null;

  const selectedLibrary = libraries.find((l) => l.id === selectedLibId) || libraries[0];

  const filteredLibraries = libraries.filter((lib) => {
    if (activeCategory === 'All') return true;
    return lib.category === activeCategory;
  });

  const showStatus = (msg: string) => {
    setStatusNotification(msg);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const symModFiles = files.filter((f) =>
      f.name.endsWith('.kicad_sym') || f.name.endsWith('.kicad_mod')
    );

    if (symModFiles.length === 0) {
      alert('Please select .kicad_sym or .kicad_mod library files.');
      return;
    }

    try {
      const analysis = await LibraryImportAnalyzer.analyzeFiles(symModFiles);
      setImportAnalysis(analysis);
    } catch (err: any) {
      alert(`Error reading library files: ${err.message}`);
    }
  };

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

  const handleRemoveLib = (libId: string) => {
    if (confirm('Are you sure you want to remove this library?')) {
      libraryRegistry.unregisterLibrary(libId);
      showStatus('Library removed.');
      if (selectedLibId === libId) {
        const remaining = libraries.filter((l) => l.id !== libId);
        setSelectedLibId(remaining[0]?.id || '');
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="libmanager-dialog-title"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 select-none p-3 ${isDraggingOver ? 'ring-4 ring-blue-500/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="bg-cad-panel border border-cad-border w-[1080px] max-w-full h-[680px] max-h-full rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/25">
              <Layers size={16} />
            </div>
            <div>
              <h2 id="libmanager-dialog-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading flex items-center gap-2">
                <span>FloZ ECA Library Manager</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded font-mono">
                  {libraries.length} Libraries Available
                </span>
              </h2>
              <p className="text-[10px] text-cad-textMuted font-mono">
                System, Project, and User-Imported Component Packages
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors focus-visible:outline-none"
            >
              <Upload size={12} />
              <span>Upload Files</span>
            </button>

            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text border border-cad-border rounded text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-none"
            >
              <FolderOpen size={12} className="text-amber-500 dark:text-amber-400" />
              <span>Upload Folder</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text ml-1 transition-colors focus-visible:outline-none"
            >
              <X size={15} />
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
          <div className="bg-blue-500/15 border-b border-blue-500/40 py-1.5 text-center text-xs text-blue-600 dark:text-blue-300 font-mono flex items-center justify-center gap-2">
            <Upload size={13} /> Drop KiCad Symbol (.kicad_sym) or Footprint (.kicad_mod) libraries to import
          </div>
        )}

        {statusNotification && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/40 py-1.5 px-4 text-xs text-emerald-700 dark:text-emerald-300 font-mono flex items-center gap-2">
            <CheckCircle2 size={13} /> {statusNotification}
          </div>
        )}

        {/* 3-Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Libraries Tree & Filters */}
          <div className="w-60 border-r border-cad-border flex flex-col bg-cad-subpanel">
            {/* Category Filter Tabs */}
            <div className="p-2 bg-cad-header border-b border-cad-border flex items-center gap-1 overflow-x-auto">
              {(['All', 'System', 'Imported', 'Project'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                    activeCategory === cat ? 'bg-blue-600 text-white font-semibold' : 'bg-cad-panel text-cad-textMuted hover:text-cad-text'
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
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-500/50 shadow-sm'
                        : 'bg-cad-panel hover:bg-cad-surfaceHover border-cad-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-cad-textHeading truncate">{lib.name}</span>
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded font-medium ${
                          lib.category === 'System'
                            ? 'bg-cad-subpanel text-cad-textMuted border border-cad-border'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {lib.category}
                      </span>
                    </div>

                    <div className="text-[10px] text-cad-textMuted mt-0.5 flex items-center gap-2 font-mono">
                      {symCount > 0 && <span>{symCount} Syms</span>}
                      {fpCount > 0 && <span>{fpCount} FPs</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Pane: Components within Selected Library */}
          <div className="w-72 border-r border-cad-border flex flex-col bg-cad-panel">
            {selectedLibrary ? (
              <>
                <div className="p-2.5 bg-cad-subpanel border-b border-cad-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs text-cad-textHeading truncate">{selectedLibrary.name}</h3>
                    <span className="text-[10px] text-cad-textMuted font-mono">
                      {selectedLibrary.symbols.length} symbols, {selectedLibrary.footprints.length} footprints
                    </span>
                  </div>

                  {selectedLibrary.category !== 'System' && (
                    <button
                      onClick={() => handleRemoveLib(selectedLibrary.id)}
                      title="Remove Library"
                      className="p-1 hover:bg-red-500/15 hover:text-red-500 rounded text-cad-textMuted transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Symbols & Footprints List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-3">
                  {isLoadingLib && (
                    <div className="p-8 flex flex-col items-center justify-center text-cad-textMuted text-xs font-mono space-y-2">
                      <RefreshCw size={18} className="animate-spin text-blue-500" />
                      <span>Loading library components...</span>
                    </div>
                  )}

                  {selectedLibrary.symbols.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase font-mono font-semibold text-cad-textMuted px-1 mb-1">
                        Symbols ({selectedLibrary.symbols.length})
                      </div>
                      <div className="space-y-0.5">
                        {selectedLibrary.symbols.slice(0, 50).map((sym) => {
                          const hasUnits = Boolean(sym.units && sym.units.length > 1);
                          return (
                            <div
                              key={sym.id}
                              onClick={() => {
                                setSelectedSymbol(sym);
                                setSelectedFootprint(undefined);
                              }}
                              className={`p-1.5 rounded cursor-pointer border transition-colors flex items-center justify-between ${
                                selectedSymbol?.id === sym.id
                                  ? 'bg-blue-500/15 border-blue-500/50 text-cad-textHeading'
                                  : 'bg-cad-panel hover:bg-cad-surfaceHover border-transparent text-cad-text'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Cpu size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="text-xs font-medium truncate">{sym.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {hasUnits && (
                                  <span className="text-[9px] px-1 py-0.2 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded font-mono font-semibold">
                                    {sym.units!.length}U
                                  </span>
                                )}
                                <span className="text-[10px] text-cad-textMuted font-mono">{sym.pins.length}p</span>
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
                      <div className="text-[10px] uppercase font-mono font-semibold text-cad-textMuted px-1 mb-1">
                        Footprints ({selectedLibrary.footprints.length})
                      </div>
                      <div className="space-y-0.5">
                        {selectedLibrary.footprints.slice(0, 50).map((fp) => (
                          <div
                            key={fp.id}
                            onClick={() => {
                              setSelectedFootprint(fp);
                              setSelectedSymbol(undefined);
                            }}
                            className={`p-1.5 rounded cursor-pointer border transition-colors flex items-center justify-between ${
                              selectedFootprint?.id === fp.id
                                  ? 'bg-blue-500/15 border-blue-500/50 text-cad-textHeading'
                                  : 'bg-cad-panel hover:bg-cad-surfaceHover border-transparent text-cad-text'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Layers size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-xs font-medium truncate">{fp.name}</span>
                            </div>
                            <span className="text-[10px] text-cad-textMuted font-mono">{fp.pads.length}p</span>
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
          <div className="flex-1 p-4 flex flex-col bg-cad-bg overflow-y-auto">
            {selectedSymbol || selectedFootprint ? (
              <div className="flex flex-col h-full space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-cad-textHeading flex items-center gap-2">
                    <span>{selectedSymbol?.name || selectedFootprint?.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-cad-subpanel border border-cad-border text-cad-textMuted rounded font-mono">
                      {selectedSymbol ? 'SYMBOL' : 'FOOTPRINT'}
                    </span>
                    {selectedSymbol?.units && selectedSymbol.units.length > 1 && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded font-mono font-medium">
                        {selectedSymbol.units.length} Logical Units
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-cad-textMuted mt-0.5 font-mono">
                    {selectedSymbol?.description || selectedFootprint?.description}
                  </p>
                </div>

                {/* Scalable Vector Canvas */}
                <div className="flex-1 min-h-[280px]">
                  <ComponentPreviewCanvas symbol={selectedSymbol} footprint={selectedFootprint} className="h-full" />
                </div>

                {/* Properties Summary Table */}
                <div className="bg-cad-panel border border-cad-border p-3 rounded text-xs font-mono space-y-2">
                  {selectedSymbol && (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>Default Prefix: <span className="text-cad-textHeading font-semibold">{selectedSymbol.defaultPrefix}</span></div>
                        <div>Default Footprint: <span className="text-blue-600 dark:text-blue-400">{selectedSymbol.defaultFootprint || 'None'}</span></div>
                        <div>Category: <span className="text-cad-text">{selectedSymbol.category}</span></div>
                        <div>Total Pins: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedSymbol.pins.length}</span></div>
                      </div>

                      {selectedSymbol.units && selectedSymbol.units.length > 1 && (
                        <div className="pt-2 border-t border-cad-border">
                          <div className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center justify-between">
                            <span>Logical Units ({selectedSymbol.units.length} Units)</span>
                            <span className="text-cad-textMuted font-normal">Select unit in canvas toolbar above</span>
                          </div>
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {selectedSymbol.units.map((u) => (
                              <div key={u.unit} className="flex items-center justify-between bg-cad-subpanel p-1 rounded border border-cad-border text-[10px]">
                                <span className={`font-semibold ${u.isPower ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  Unit {u.name || u.unit} {u.isPower ? '(Power)' : ''}
                                </span>
                                <span className="text-cad-textMuted font-mono">
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
                      <div>Pad Count: <span className="text-cad-textHeading font-semibold">{selectedFootprint.pads.length}</span></div>
                      <div>Type: <span className="text-cad-text">{selectedFootprint.isSMD ? 'SMD' : 'Through-Hole'}</span></div>
                      <div>3D Package: <span className="text-amber-600 dark:text-amber-400">{selectedFootprint.model3D?.packageType || 'None'}</span></div>
                      <div>Courtyard: <span className="text-cad-text">{(selectedFootprint.courtyard.maxX - selectedFootprint.courtyard.minX).toFixed(1)} x {(selectedFootprint.courtyard.maxY - selectedFootprint.courtyard.minY).toFixed(1)} mm</span></div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-cad-textMuted text-xs font-mono space-y-1.5">
                <Info size={22} className="opacity-40" />
                <span>Select a symbol or footprint to view vector geometry.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 bg-cad-header border-t border-cad-border px-5 flex items-center justify-between text-xs text-cad-textMuted font-mono">
          <span>{libraries.length} Libraries Loaded ({libraryRegistry.getAllSymbols().length} Symbols, {libraryRegistry.getAllFootprints().length} Footprints)</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-sm transition-colors focus-visible:outline-none"
          >
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
