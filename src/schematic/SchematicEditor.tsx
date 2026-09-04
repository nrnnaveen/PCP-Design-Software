/**
 * FloZ ECA - Professional Interactive Schematic Capture Editor
 * KiCad-class canvas engine with Buses, Bus Entries, No-Connect flags, Net Labels,
 * Selection Filters, Drawing Sheet Title Block, Magnetic Pin Snapping, Auto-Annotation,
 * Real-time ERC, and High-DPI theme-aware rendering.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ApexProject,
  Point2D,
  SchematicSymbolInstance,
  SchematicWireSegment,
  SchematicBusSegment,
  SchematicBusEntry,
  SchematicNoConnect,
  SchematicJunction,
  SchematicNetLabel,
  SymbolDefinition,
  DiagnosticViolation,
} from '../core/types';
import { libraryRegistry } from '../library/libraryRegistry';
import { SchematicHelper } from './helper';
import { NetConnectivitySolver } from './connectivity';
import { ERCEngine } from '../erc/ercEngine';
import { SymbolLibrarySidebar } from './SymbolLibrarySidebar';
import { eventBus } from '../core/eventBus';
import { AffineTransform2D } from '../core/transformMatrix';
import { RubberBandRouter } from './rubberBandRouter';
import { BOMGenerator } from '../manufacturing/bomGenerator';
import {
  Move,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Tag,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Layers,
  FlipHorizontal,
  Crosshair,
  Hand,
  Grid,
  GitCommit,
  FileSpreadsheet,
  Binary,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AppThemeId, getCanvasColors } from '../theme/themeManager';

interface Props {
  project: ApexProject;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  onOpenSymbolChooser: () => void;
  theme?: AppThemeId;
}

export type EditorTool =
  | 'select'
  | 'pan'
  | 'wire'
  | 'bus'
  | 'bus_entry'
  | 'no_connect'
  | 'junction'
  | 'label'
  | 'power'
  | 'delete'
  | 'place_symbol';

export const SchematicEditor: React.FC<Props> = ({
  project,
  onUpdateProject,
  onOpenSymbolChooser,
  theme = 'high-contrast',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Responsive Canvas Resize Observer (detects sidebar toggle, right dock resize, window changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const parent = canvas.parentElement;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // Viewport Transform (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(4.0); // pixels per mm
  const [pan, setPan] = useState<Point2D>({ x: 340, y: 200 });
  const [activeTool, setActiveTool] = useState<EditorTool>('select');

  // Grid Configuration (100mil, 50mil, 25mil)
  const [gridMil, setGridMil] = useState<100 | 50 | 25>(100);
  const gridStep = gridMil === 100 ? 2.54 : gridMil === 50 ? 1.27 : 0.635;

  // Sidebar visibility with URL parameter & responsive default
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('sidebar') === 'collapsed') return true;
      if (params.get('sidebar') === 'open') return false;
      if (window.innerWidth < 1000) return true;
    }
    return false;
  });

  // Selection Filters
  const [showFilterBar, setShowFilterBar] = useState<boolean>(false);
  const [selectionFilter, setSelectionFilter] = useState({
    symbols: true,
    wires: true,
    buses: true,
    labels: true,
    power: true,
    noConnects: true,
  });

  // Interactive Selection & Dragging
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedNetName, setHighlightedNetName] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isDraggingObjects, setIsDraggingObjects] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });

  // Marquee Box Selection State
  const [isSelectingBox, setIsSelectingBox] = useState<boolean>(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point2D | null>(null);
  const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<Point2D | null>(null);

  // Multi-Object Group Dragging Snapshot
  const [dragStartSnapshot, setDragStartSnapshot] = useState<{
    symbols: Map<string, Point2D>;
    wires: Map<string, { x1: number; y1: number; x2: number; y2: number }>;
    labels: Map<string, Point2D>;
    buses: Map<string, { x1: number; y1: number; x2: number; y2: number }>;
    anchorWorld: Point2D;
  } | null>(null);

  // Armed Placement Mode (Multi-placement)
  const [armedSymbolDef, setArmedSymbolDef] = useState<SymbolDefinition | null>(null);
  const [placementRotation, setPlacementRotation] = useState<0 | 90 | 180 | 270>(0);
  const [placementMirror, setPlacementMirror] = useState<boolean>(false);

  // Wire & Bus drawing state
  const [wireStart, setWireStart] = useState<Point2D | null>(null);
  const [busStart, setBusStart] = useState<Point2D | null>(null);
  const [hoverWorldPos, setHoverWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  const [magneticSnapPin, setMagneticSnapPin] = useState<{
    pin: any;
    symbol: SchematicSymbolInstance;
    worldPos: Point2D;
  } | null>(null);

  // Active ERC diagnostics markers
  const [ercViolations, setErcViolations] = useState<DiagnosticViolation[]>([]);
  const [activeViolationPopup, setActiveViolationPopup] = useState<DiagnosticViolation | null>(null);

  const activeSheet =
    project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
    project.schematic.sheets[0];

  const snapToGrid = (val: number, step = gridStep): number => {
    return Math.round(val / step) * step;
  };

  // Run live ERC in background
  useEffect(() => {
    const violations = ERCEngine.run(project);
    setErcViolations(violations);
    if (activeViolationPopup) {
      const stillExists = violations.find((v) => v.id === activeViolationPopup.id);
      if (!stillExists) setActiveViolationPopup(null);
    }
  }, [project]);

  // Screen <-> World coordinate transforms via 2D Homogeneous Affine Matrix
  const transform = AffineTransform2D.fromPanZoom(pan.x, pan.y, zoom, 1);

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point2D => transform.screenToWorld(sx, sy),
    [pan, zoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number): Point2D => transform.worldToScreen(wx, wy),
    [pan, zoom]
  );

  // Delete selected objects handler (Components, Wires, Buses, Labels, No-Connects)
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;

    onUpdateProject((prev) => {
      const sheet =
        prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) ||
        prev.schematic.sheets[0];

      return {
        ...prev,
        schematic: {
          ...prev.schematic,
          sheets: prev.schematic.sheets.map((s) =>
            s.id === sheet.id
              ? {
                  ...s,
                  symbols: s.symbols.filter((sym) => !selectedIds.includes(sym.id)),
                  wires: s.wires.filter((w) => !selectedIds.includes(w.id)),
                  buses: (s.buses || []).filter((b) => !selectedIds.includes(b.id)),
                  busEntries: (s.busEntries || []).filter((be) => !selectedIds.includes(be.id)),
                  noConnects: (s.noConnects || []).filter((nc) => !selectedIds.includes(nc.id)),
                  labels: s.labels.filter((l) => !selectedIds.includes(l.id)),
                  powerSymbols: s.powerSymbols.filter((p) => !selectedIds.includes(p.id)),
                }
              : s
          ),
        },
      };
    }, `Delete ${selectedIds.length} Object(s)`);

    setSelectedIds([]);
    setHighlightedNetName(null);
  }, [selectedIds, onUpdateProject]);

  // Automatic Re-Annotation (R? -> R1, R2...)
  const handleAutoAnnotate = useCallback(() => {
    onUpdateProject((prev) => {
      const counters: Record<string, number> = {};
      const newSheets = prev.schematic.sheets.map((sheet) => {
        const newSymbols = sheet.symbols.map((sym) => {
          const prefixMatch = sym.reference.match(/^[A-Za-z]+/);
          const prefix = prefixMatch ? prefixMatch[0] : 'U';
          if (sym.reference.includes('?') || !sym.reference.match(/^[A-Za-z]+\d+$/)) {
            counters[prefix] = (counters[prefix] || 0) + 1;
            return {
              ...sym,
              reference: `${prefix}${counters[prefix]}`,
            };
          } else {
            const numMatch = sym.reference.match(/\d+$/);
            if (numMatch) {
              const num = parseInt(numMatch[0], 10);
              counters[prefix] = Math.max(counters[prefix] || 0, num);
            }
            return sym;
          }
        });
        return { ...sheet, symbols: newSymbols };
      });
      return {
        ...prev,
        schematic: {
          ...prev.schematic,
          sheets: newSheets,
        },
      };
    }, 'Auto-Annotate Schematic');
  }, [onUpdateProject]);

  // Direct BOM CSV Download
  const handleExportBOM = useCallback(() => {
    const csv = BOMGenerator.exportCSV(project);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.metadata.name || 'Project'}_BOM.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [project]);

  // Global keydown handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setArmedSymbolDef(null);
        setWireStart(null);
        setBusStart(null);
        setSelectedIds([]);
        setIsSelectingBox(false);
      } else if (e.key.toLowerCase() === 'w') {
        setActiveTool('wire');
        setWireStart(null);
      } else if (e.key.toLowerCase() === 'b') {
        setActiveTool('bus');
        setBusStart(null);
      } else if (e.key.toLowerCase() === 'q') {
        setActiveTool('no_connect');
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('label');
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('power');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('pan');
      } else if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 's') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'a') {
        onOpenSymbolChooser();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected, onOpenSymbolChooser]);

  // Arm placement of symbol
  const handleArmPlacement = (symDef: SymbolDefinition) => {
    setArmedSymbolDef(symDef);
    setActiveTool('place_symbol');
    setActiveViolationPopup(null);
  };

  // Handle Drag and Drop symbol onto canvas
  const handleCanvasDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const symId = e.dataTransfer.getData('application/floz-symbol-id');
    if (!symId) return;

    const symDef = libraryRegistry.getSymbolById(symId);
    if (!symDef) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const dropPos = { x: snapToGrid(wp.x), y: snapToGrid(wp.y) };

    const nextRef = SchematicHelper.getNextReference(symDef.defaultPrefix, activeSheet.symbols);
    const initialUnit = symDef.units && symDef.units.length > 0 ? symDef.units[0] : null;

    const newSymInstance: SchematicSymbolInstance = {
      id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      symbolDefId: symDef.id,
      reference: nextRef,
      value: symDef.name,
      footprint: symDef.defaultFootprint || '',
      x: dropPos.x,
      y: dropPos.y,
      rotation: 0,
      mirrorX: false,
      unit: initialUnit ? initialUnit.unit : 1,
      unitSuffix: initialUnit ? initialUnit.name : undefined,
      fields: { Description: symDef.description },
      pins: JSON.parse(JSON.stringify(initialUnit ? initialUnit.pins : symDef.pins)),
    };

    onUpdateProject((prev) => {
      const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
      return {
        ...prev,
        schematic: {
          ...prev.schematic,
          sheets: prev.schematic.sheets.map((s) =>
            s.id === sheet.id ? { ...s, symbols: [...s.symbols, newSymInstance] } : s
          ),
        },
      };
    }, `Place ${newSymInstance.reference}`);

    setSelectedIds([newSymInstance.id]);
    eventBus.emit('SELECT_SYMBOL', { symbolId: newSymInstance.id, reference: newSymInstance.reference });
  };

  // Zoom centered on cursor
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(1.0, Math.min(25.0, zoom * zoomFactor));

    const wx = (mouseX - pan.x) / zoom;
    const wy = (mouseY - pan.y) / zoom;

    setPan({
      x: mouseX - wx * newZoom,
      y: mouseY - wy * newZoom,
    });
    setZoom(newZoom);
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const colors = getCanvasColors(theme);
    const isLight = colors.isLight;

    // 1. CAD Background & Dot Grid
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    const startWorld = screenToWorld(0, 0);
    const endWorld = screenToWorld(width, height);

    const gridPx = gridStep * zoom;
    const step = gridPx < 8 ? gridStep * 4 : gridPx < 14 ? gridStep * 2 : gridStep;
    const minGridX = Math.floor(startWorld.x / step) * step;
    const maxGridX = Math.ceil(endWorld.x / step) * step;
    const minGridY = Math.floor(startWorld.y / step) * step;
    const maxGridY = Math.ceil(endWorld.y / step) * step;

    ctx.fillStyle = colors.gridColor;
    for (let gx = minGridX; gx <= maxGridX; gx += step) {
      for (let gy = minGridY; gy <= maxGridY; gy += step) {
        const sp = worldToScreen(gx, gy);
        ctx.fillRect(sp.x - 0.75, sp.y - 0.75, 1.5, 1.5);
      }
    }

    // 2. ISO Drawing Sheet Border & Title Block (A4 Landscape: 287 x 200 mm)
    const borderX1 = 10;
    const borderY1 = 10;
    const borderX2 = 287;
    const borderY2 = 200;
    const pTopLeft = worldToScreen(borderX1, borderY1);
    const pBottomRight = worldToScreen(borderX2, borderY2);

    ctx.strokeStyle = colors.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(pTopLeft.x, pTopLeft.y, pBottomRight.x - pTopLeft.x, pBottomRight.y - pTopLeft.y);

    // Coordinate grid labels (A-D, 1-4)
    ctx.fillStyle = colors.textMutedColor;
    ctx.font = `${Math.max(8, 2.0 * zoom)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const numCols = 4;
    const colStep = (borderX2 - borderX1) / numCols;
    for (let c = 0; c < numCols; c++) {
      const sp = worldToScreen(borderX1 + colStep * (c + 0.5), borderY1 - 3);
      ctx.fillText(String(c + 1), sp.x, sp.y);
    }

    const numRows = 4;
    const rowStep = (borderY2 - borderY1) / numRows;
    for (let r = 0; r < numRows; r++) {
      const sp = worldToScreen(borderX1 - 4, borderY1 + rowStep * (r + 0.5));
      ctx.fillText(String.fromCharCode(65 + r), sp.x, sp.y);
    }

    // Bottom Right Title Block (80 x 26 mm)
    const tbWidth = 80;
    const tbHeight = 26;
    const tbOrigin = { x: borderX2 - tbWidth, y: borderY2 - tbHeight };
    const tbScreen = worldToScreen(tbOrigin.x, tbOrigin.y);
    const tbWidthPx = tbWidth * zoom;
    const tbHeightPx = tbHeight * zoom;

    ctx.fillStyle = isLight ? '#f8fafc' : '#111620';
    ctx.fillRect(tbScreen.x, tbScreen.y, tbWidthPx, tbHeightPx);
    ctx.strokeStyle = colors.borderColor;
    ctx.strokeRect(tbScreen.x, tbScreen.y, tbWidthPx, tbHeightPx);

    const line1Y = worldToScreen(tbOrigin.x, tbOrigin.y + 11).y;
    const line2Y = worldToScreen(tbOrigin.x, tbOrigin.y + 19).y;
    ctx.beginPath();
    ctx.moveTo(tbScreen.x, line1Y);
    ctx.lineTo(tbScreen.x + tbWidthPx, line1Y);
    ctx.moveTo(tbScreen.x, line2Y);
    ctx.lineTo(tbScreen.x + tbWidthPx, line2Y);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = colors.textColor;
    ctx.font = `600 ${Math.max(9, 2.8 * zoom)}px Inter, sans-serif`;
    ctx.fillText(project.metadata.name || 'Untitled Schematic', tbScreen.x + 6, tbScreen.y + 14 * (zoom / 4));

    ctx.fillStyle = colors.textMutedColor;
    ctx.font = `400 ${Math.max(7, 2.0 * zoom)}px Inter, sans-serif`;
    ctx.fillText(`Sheet: ${activeSheet.sheetNumber || 1}/${project.schematic.sheets.length}  |  Rev: ${project.metadata.version || '1.0'}`, tbScreen.x + 6, line1Y + 11 * (zoom / 4));
    ctx.fillText(`FloZ ECA  |  ${new Date().toISOString().slice(0, 10)}`, tbScreen.x + 6, line2Y + 11 * (zoom / 4));

    // 3. Render Schematic Buses (Thick vector line)
    if (activeSheet.buses) {
      activeSheet.buses.forEach((bus) => {
        const isSelected = selectedIds.includes(bus.id);
        ctx.strokeStyle = isSelected ? colors.wireHighlightColor : colors.busColor;
        ctx.lineWidth = Math.max(3.5, 0.9 * zoom);
        ctx.lineCap = 'square';

        const p1 = worldToScreen(bus.x1, bus.y1);
        const p2 = worldToScreen(bus.x2, bus.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        if (bus.name) {
          ctx.fillStyle = colors.busColor;
          ctx.font = `bold ${Math.max(9, 2.5 * zoom)}px 'JetBrains Mono', monospace`;
          ctx.fillText(bus.name, (p1.x + p2.x) / 2 + 4, (p1.y + p2.y) / 2 - 4);
        }
      });
    }

    // 4. Render Bus Entries (45-degree angled tick)
    if (activeSheet.busEntries) {
      activeSheet.busEntries.forEach((entry) => {
        const isSelected = selectedIds.includes(entry.id);
        ctx.strokeStyle = isSelected ? colors.wireHighlightColor : colors.busColor;
        ctx.lineWidth = Math.max(2.0, 0.5 * zoom);

        const sp = worldToScreen(entry.x, entry.y);
        const stubLen = 3.0 * zoom;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x + stubLen, sp.y + stubLen);
        ctx.stroke();
      });
    }

    // 5. Render Schematic Wires
    const connectivity = NetConnectivitySolver.solveSheet(activeSheet);

    activeSheet.wires.forEach((wire) => {
      const isSelected = selectedIds.includes(wire.id);
      let isNetHighlighted = false;
      if (highlightedNetName) {
        const k1 = NetConnectivitySolver.ptKey(wire.x1, wire.y1);
        const k2 = NetConnectivitySolver.ptKey(wire.x2, wire.y2);
        const net = connectivity.netGraph.nets[highlightedNetName];
        if (net) {
          isNetHighlighted = net.pins.some((p) => {
            const sym = activeSheet.symbols.find((s) => s.reference === p.symbolRef);
            const pin = sym?.pins.find((pn) => pn.number === p.pinNumber);
            if (sym && pin) {
              const pos = SchematicHelper.getSymbolPinWorldPosition(sym, pin);
              const pk = NetConnectivitySolver.ptKey(pos.x, pos.y);
              return pk === k1 || pk === k2;
            }
            return false;
          });
        }
      }

      ctx.strokeStyle = isSelected
        ? colors.wireHighlightColor
        : isNetHighlighted
        ? '#f59e0b'
        : colors.wireColor;
      ctx.lineWidth = isSelected || isNetHighlighted ? Math.max(2.5, 0.6 * zoom) : Math.max(1.5, 0.4 * zoom);
      ctx.lineCap = 'round';

      const p1 = worldToScreen(wire.x1, wire.y1);
      const p2 = worldToScreen(wire.x2, wire.y2);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // 6. Active Wire / Bus in Progress
    if (wireStart && activeTool === 'wire') {
      ctx.strokeStyle = colors.wireHighlightColor;
      ctx.lineWidth = Math.max(2.0, 0.45 * zoom);
      ctx.setLineDash([4, 4]);

      const p1 = worldToScreen(wireStart.x, wireStart.y);
      const targetPos = magneticSnapPin ? magneticSnapPin.worldPos : { x: snapToGrid(hoverWorldPos.x), y: snapToGrid(hoverWorldPos.y) };
      const corner = worldToScreen(targetPos.x, wireStart.y);
      const p2 = worldToScreen(targetPos.x, targetPos.y);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(corner.x, corner.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (busStart && activeTool === 'bus') {
      ctx.strokeStyle = colors.busColor;
      ctx.lineWidth = Math.max(3.5, 0.9 * zoom);
      ctx.setLineDash([4, 4]);

      const p1 = worldToScreen(busStart.x, busStart.y);
      const targetPos = { x: snapToGrid(hoverWorldPos.x), y: snapToGrid(hoverWorldPos.y) };
      const p2 = worldToScreen(targetPos.x, targetPos.y);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 7. Render Junctions
    ctx.fillStyle = colors.junctionColor;
    activeSheet.junctions.forEach((junc) => {
      const sp = worldToScreen(junc.x, junc.y);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, Math.max(3, 0.75 * zoom), 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Render No-Connect (X) Flags
    if (activeSheet.noConnects) {
      activeSheet.noConnects.forEach((nc) => {
        const isSelected = selectedIds.includes(nc.id);
        const sp = worldToScreen(nc.x, nc.y);
        const size = Math.max(4, 1.0 * zoom);

        ctx.strokeStyle = isSelected ? colors.wireHighlightColor : colors.noConnectColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sp.x - size, sp.y - size);
        ctx.lineTo(sp.x + size, sp.y + size);
        ctx.moveTo(sp.x + size, sp.y - size);
        ctx.lineTo(sp.x - size, sp.y + size);
        ctx.stroke();
      });
    }

    // 9. Render Symbols
    activeSheet.symbols.forEach((sym) => {
      const isSelected = selectedIds.includes(sym.id);
      const symScreen = worldToScreen(sym.x, sym.y);

      const bb = SchematicHelper.getSymbolBoundingBox(sym);
      if (bb.maxX < startWorld.x || bb.minX > endWorld.x || bb.maxY < startWorld.y || bb.minY > endWorld.y) {
        return;
      }

      ctx.save();
      ctx.translate(symScreen.x, symScreen.y);
      ctx.rotate((sym.rotation * Math.PI) / 180);
      if (sym.mirrorX) ctx.scale(-1, 1);

      const symDef = libraryRegistry.getSymbolById(sym.symbolDefId);
      let shapes = symDef?.shapes || [];
      if (symDef && symDef.units && symDef.units.length > 0) {
        const unitDef = symDef.units.find((u) => u.unit === sym.unit);
        if (unitDef && unitDef.shapes && unitDef.shapes.length > 0) {
          shapes = unitDef.shapes;
        }
      }

      ctx.strokeStyle = isSelected ? colors.selectionBorder : (isLight ? '#1e293b' : '#e2e8f0');
      ctx.fillStyle = isLight ? '#ffffff' : '#141a23';
      ctx.lineWidth = Math.max(1.5, 0.35 * zoom);

      shapes.forEach((shape) => {
        if (shape.type === 'rectangle' && shape.width && shape.height) {
          const sx = (shape.x || 0) * zoom;
          const sy = (shape.y || 0) * zoom;
          const w = shape.width * zoom;
          const h = shape.height * zoom;
          ctx.beginPath();
          ctx.rect(sx - w / 2, sy - h / 2, w, h);
          if (shape.filled) ctx.fill();
          ctx.stroke();
        } else if (shape.type === 'line' && shape.points && shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.stroke();
        } else if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.closePath();
          if (shape.filled) {
            ctx.fillStyle = isSelected ? colors.selectionBg : (isLight ? '#f1f5f9' : '#1e293b');
            ctx.fill();
          }
          ctx.stroke();
        } else if (shape.type === 'circle' && shape.radius) {
          ctx.beginPath();
          ctx.arc((shape.x || 0) * zoom, (shape.y || 0) * zoom, shape.radius * zoom, 0, Math.PI * 2);
          if (shape.filled) ctx.fill();
          ctx.stroke();
        }
      });

      // Render Pins
      ctx.strokeStyle = colors.noConnectColor;
      ctx.font = `${Math.max(9, 2.0 * zoom)}px 'JetBrains Mono', monospace`;

      sym.pins.forEach((pin) => {
        const px = pin.x * zoom;
        const py = pin.y * zoom;
        const pinOrient = pin.orientation || 0;
        const rad = (pinOrient * Math.PI) / 180;
        const len = (pin.length !== undefined ? pin.length : 2.54) * zoom;
        const endX = px + Math.cos(rad) * len;
        const endY = py + Math.sin(rad) * len;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (pin.visible && zoom > 2.2) {
          ctx.fillStyle = colors.textMutedColor;
          if (pinOrient === 180) {
            ctx.fillText(pin.number, endX + 3, endY - 3);
          } else if (pinOrient === 0) {
            ctx.fillText(pin.number, endX - 14, endY - 3);
          } else {
            ctx.fillText(pin.number, endX + 3, endY - 5);
          }

          ctx.fillStyle = colors.textColor;
          if (pinOrient === 180) {
            ctx.fillText(pin.name, px + 5, py + 3);
          } else if (pinOrient === 0) {
            ctx.fillText(pin.name, px - 24, py + 3);
          } else {
            ctx.fillText(pin.name, px + 4, py - 4);
          }
        }
      });

      ctx.restore();

      // Clean Reference & Value Labels
      const unitSuffix = sym.unitSuffix || (symDef && symDef.unitCount && symDef.unitCount > 1 ? (sym.unit > 0 && sym.unit <= 26 ? String.fromCharCode(64 + sym.unit) : `_${sym.unit}`) : '');
      const displayRef = `${sym.reference}${unitSuffix}`;

      ctx.fillStyle = colors.selectionBorder;
      ctx.font = `600 ${Math.max(10, 3.2 * zoom)}px Inter, sans-serif`;
      ctx.fillText(displayRef, symScreen.x - 12, symScreen.y - 18 * (zoom / 4));

      ctx.fillStyle = isLight ? '#6d28d9' : '#a78bfa';
      ctx.font = `500 ${Math.max(9, 2.6 * zoom)}px Inter, sans-serif`;
      ctx.fillText(sym.value, symScreen.x - 12, symScreen.y + 22 * (zoom / 4));
    });

    // 10. Ghost Preview for Armed Symbol Placement
    if (activeTool === 'place_symbol' && armedSymbolDef) {
      const snappedHover = { x: snapToGrid(hoverWorldPos.x), y: snapToGrid(hoverWorldPos.y) };
      const ghostScreen = worldToScreen(snappedHover.x, snappedHover.y);

      const ghostShapes = armedSymbolDef.units && armedSymbolDef.units.length > 0 ? armedSymbolDef.units[0].shapes : armedSymbolDef.shapes;
      const ghostPins = armedSymbolDef.units && armedSymbolDef.units.length > 0 ? armedSymbolDef.units[0].pins : armedSymbolDef.pins;

      ctx.save();
      ctx.translate(ghostScreen.x, ghostScreen.y);
      ctx.rotate((placementRotation * Math.PI) / 180);
      if (placementMirror) ctx.scale(-1, 1);

      ctx.strokeStyle = colors.selectionBorder;
      ctx.lineWidth = Math.max(1.5, 0.35 * zoom);
      ctx.setLineDash([3, 3]);

      ghostShapes.forEach((shape) => {
        if (shape.type === 'rectangle' && shape.width && shape.height) {
          const sx = (shape.x || 0) * zoom;
          const sy = (shape.y || 0) * zoom;
          ctx.strokeRect(sx - (shape.width / 2) * zoom, sy - (shape.height / 2) * zoom, shape.width * zoom, shape.height * zoom);
        } else if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.closePath();
          ctx.stroke();
        }
      });

      ghostPins.forEach((pin) => {
        const px = pin.x * zoom;
        const py = pin.y * zoom;
        const rad = ((pin.orientation || 0) * Math.PI) / 180;
        const len = (pin.length || 2.54) * zoom;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(rad) * len, py + Math.sin(rad) * len);
        ctx.stroke();
      });

      ctx.setLineDash([]);
      ctx.restore();

      ctx.fillStyle = colors.selectionBorder;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`${armedSymbolDef.defaultPrefix}? (${armedSymbolDef.name}) [R:Rotate, M:Mirror, Esc:Cancel]`, ghostScreen.x - 15, ghostScreen.y - 20);
    }

    // 11. Magnetic Pin Snapping Feedback
    if (magneticSnapPin) {
      const sp = worldToScreen(magneticSnapPin.worldPos.x, magneticSnapPin.worldPos.y);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(`${magneticSnapPin.symbol.reference}.${magneticSnapPin.pin.name}`, sp.x + 8, sp.y - 4);
    }

    // 12. In-Canvas ERC Error & Warning Markers
    ercViolations.forEach((v) => {
      const sp = worldToScreen(v.x, v.y);
      const isError = v.severity === 'error';

      ctx.fillStyle = isError ? colors.drcColor : colors.ercColor;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 12, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isError ? '✕' : '!', sp.x, sp.y - 12);
    });

    // 13. Render Net Labels
    activeSheet.labels.forEach((lbl) => {
      const sp = worldToScreen(lbl.x, lbl.y);
      ctx.fillStyle = colors.labelColor;
      ctx.font = `600 ${Math.max(10, 2.8 * zoom)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`[ ${lbl.text} ]`, sp.x + 4, sp.y - 4);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 14. Render Power Symbols
    activeSheet.powerSymbols.forEach((pwr) => {
      const sp = worldToScreen(pwr.x, pwr.y);
      ctx.fillStyle = colors.powerColor;
      ctx.font = `bold ${Math.max(10, 3.0 * zoom)}px 'JetBrains Mono', monospace`;
      ctx.fillText(pwr.netName, sp.x - 10, sp.y - 8);

      ctx.strokeStyle = colors.powerColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x, sp.y - 6);
      ctx.lineTo(sp.x - 6, sp.y - 6);
      ctx.lineTo(sp.x + 6, sp.y - 6);
      ctx.stroke();
    });

    // 15. Render Marquee Box Selection Overlay
    if (isSelectingBox && selectionBoxStart && selectionBoxCurrent) {
      const p1 = worldToScreen(selectionBoxStart.x, selectionBoxStart.y);
      const p2 = worldToScreen(selectionBoxCurrent.x, selectionBoxCurrent.y);
      const minX = Math.min(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);

      ctx.fillStyle = colors.selectionBg;
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeStyle = colors.selectionBorder;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]);
    }
  }, [
    activeSheet,
    zoom,
    pan,
    selectedIds,
    highlightedNetName,
    activeTool,
    armedSymbolDef,
    placementRotation,
    placementMirror,
    wireStart,
    busStart,
    hoverWorldPos,
    magneticSnapPin,
    ercViolations,
    gridStep,
    isSelectingBox,
    selectionBoxStart,
    selectionBoxCurrent,
    screenToWorld,
    worldToScreen,
    theme,
    project,
    canvasDimensions,
  ]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const snapPoint = { x: snapToGrid(wp.x), y: snapToGrid(wp.y) };

    // Pan with Middle or Right button or Pan tool
    if (e.button === 1 || e.button === 2 || activeTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    // 1. Place Symbol
    if (activeTool === 'place_symbol' && armedSymbolDef) {
      const nextRef = SchematicHelper.getNextReference(armedSymbolDef.defaultPrefix, activeSheet.symbols);
      const initialUnit = armedSymbolDef.units && armedSymbolDef.units.length > 0 ? armedSymbolDef.units[0] : null;

      const newSymInstance: SchematicSymbolInstance = {
        id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        symbolDefId: armedSymbolDef.id,
        reference: nextRef,
        value: armedSymbolDef.name,
        footprint: armedSymbolDef.defaultFootprint || '',
        x: snapPoint.x,
        y: snapPoint.y,
        rotation: placementRotation,
        mirrorX: placementMirror,
        unit: initialUnit ? initialUnit.unit : 1,
        unitSuffix: initialUnit ? initialUnit.name : undefined,
        fields: { Description: armedSymbolDef.description },
        pins: JSON.parse(JSON.stringify(initialUnit ? initialUnit.pins : armedSymbolDef.pins)),
      };

      onUpdateProject((prev) => {
        const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
        return {
          ...prev,
          schematic: {
            ...prev.schematic,
            sheets: prev.schematic.sheets.map((s) =>
              s.id === sheet.id ? { ...s, symbols: [...s.symbols, newSymInstance] } : s
            ),
          },
        };
      }, `Place ${newSymInstance.reference}`);

      if (!e.shiftKey) {
        setActiveTool('select');
        setArmedSymbolDef(null);
      }
      setSelectedIds([newSymInstance.id]);
      return;
    }

    // 2. Wire Tool
    if (activeTool === 'wire') {
      if (!wireStart) {
        const startPt = magneticSnapPin ? magneticSnapPin.worldPos : snapPoint;
        setWireStart(startPt);
      } else {
        const endPt = magneticSnapPin ? magneticSnapPin.worldPos : snapPoint;
        if (wireStart.x === endPt.x && wireStart.y === endPt.y) return;

        const newWire: SchematicWireSegment = {
          id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x1: wireStart.x,
          y1: wireStart.y,
          x2: endPt.x,
          y2: endPt.y,
        };

        onUpdateProject((prev) => {
          const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
          return {
            ...prev,
            schematic: {
              ...prev.schematic,
              sheets: prev.schematic.sheets.map((s) =>
                s.id === sheet.id ? { ...s, wires: [...s.wires, newWire] } : s
              ),
            },
          };
        }, 'Draw Wire');

        if (magneticSnapPin) {
          setWireStart(null);
        } else {
          setWireStart(endPt);
        }
      }
      return;
    }

    // 3. Bus Tool
    if (activeTool === 'bus') {
      if (!busStart) {
        setBusStart(snapPoint);
      } else {
        if (busStart.x === snapPoint.x && busStart.y === snapPoint.y) return;

        const newBus: SchematicBusSegment = {
          id: `bus_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x1: busStart.x,
          y1: busStart.y,
          x2: snapPoint.x,
          y2: snapPoint.y,
          name: 'BUS[0..7]',
        };

        onUpdateProject((prev) => {
          const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
          return {
            ...prev,
            schematic: {
              ...prev.schematic,
              sheets: prev.schematic.sheets.map((s) =>
                s.id === sheet.id ? { ...s, buses: [...(s.buses || []), newBus] } : s
              ),
            },
          };
        }, 'Draw Bus');

        setBusStart(null);
      }
      return;
    }

    // 4. No-Connect Tool
    if (activeTool === 'no_connect') {
      const pinHit = SchematicHelper.findClosestPin(wp, activeSheet.symbols, 2.5);
      const ncPos = pinHit ? pinHit.worldPos : snapPoint;
      const newNC: SchematicNoConnect = {
        id: `nc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        x: ncPos.x,
        y: ncPos.y,
        symbolId: pinHit?.symbol.id,
        pinId: pinHit?.pin.id,
      };

      onUpdateProject((prev) => {
        const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
        return {
          ...prev,
          schematic: {
            ...prev.schematic,
            sheets: prev.schematic.sheets.map((s) =>
              s.id === sheet.id ? { ...s, noConnects: [...(s.noConnects || []), newNC] } : s
            ),
          },
        };
      }, 'Place No-Connect');
      return;
    }

    // 5. Selection Mode & Multi-Object Move
    if (activeTool === 'select') {
      // Check Pin Click for Net Highlighting
      const pinHit = SchematicHelper.findClosestPin(wp, activeSheet.symbols, 2.0);
      if (pinHit) {
        const connectivity = NetConnectivitySolver.solveSheet(activeSheet);
        let foundNet = '';
        for (const [nName, node] of Object.entries(connectivity.netGraph.nets)) {
          if (node.pins.some((p) => p.symbolRef === pinHit.symbol.reference && p.pinNumber === pinHit.pin.number)) {
            foundNet = nName;
            break;
          }
        }
        setHighlightedNetName(foundNet || null);
        setSelectedIds([pinHit.symbol.id]);
        eventBus.emit('SELECT_SYMBOL', { symbolId: pinHit.symbol.id, reference: pinHit.symbol.reference });
        setActiveViolationPopup(null);
        return;
      }

      // Check Symbol Body Click
      const symHit = selectionFilter.symbols
        ? activeSheet.symbols.find((s) => {
            const bb = SchematicHelper.getSymbolBoundingBox(s);
            return wp.x >= bb.minX && wp.x <= bb.maxX && wp.y >= bb.minY && wp.y <= bb.maxY;
          })
        : undefined;

      // Check Wire Click
      const wireHit = (!symHit && selectionFilter.wires)
        ? activeSheet.wires.find((w) => {
            const dist = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
            if (dist === 0) return false;
            const d = Math.abs((w.y2 - w.y1) * wp.x - (w.x2 - w.x1) * wp.y + w.x2 * w.y1 - w.y2 * w.x1) / dist;
            return d < 1.2;
          })
        : undefined;

      // Check Bus Click
      const busHit = (!symHit && !wireHit && selectionFilter.buses && activeSheet.buses)
        ? activeSheet.buses.find((b) => {
            const dist = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
            if (dist === 0) return false;
            const d = Math.abs((b.y2 - b.y1) * wp.x - (b.x2 - b.x1) * wp.y + b.x2 * b.y1 - b.y2 * b.x1) / dist;
            return d < 1.5;
          })
        : undefined;

      // Check Label Click
      const labelHit = (!symHit && !wireHit && !busHit && selectionFilter.labels)
        ? activeSheet.labels.find((l) => Math.hypot(l.x - wp.x, l.y - wp.y) < 3.0)
        : undefined;

      const hitId = symHit?.id || wireHit?.id || busHit?.id || labelHit?.id;

      if (hitId) {
        let newSelected: string[];
        if (selectedIds.includes(hitId)) {
          newSelected = selectedIds;
        } else if (e.shiftKey) {
          newSelected = [...selectedIds, hitId];
        } else {
          newSelected = [hitId];
        }
        setSelectedIds(newSelected);

        if (symHit) {
          eventBus.emit('SELECT_SYMBOL', { symbolId: symHit.id, reference: symHit.reference });
        }

        const symMap = new Map<string, Point2D>();
        const wireMap = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
        const busMap = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
        const lblMap = new Map<string, Point2D>();

        activeSheet.symbols.forEach((s) => {
          if (newSelected.includes(s.id)) symMap.set(s.id, { x: s.x, y: s.y });
        });
        activeSheet.wires.forEach((w) => {
          if (newSelected.includes(w.id)) wireMap.set(w.id, { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
        });
        activeSheet.buses?.forEach((b) => {
          if (newSelected.includes(b.id)) busMap.set(b.id, { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 });
        });
        activeSheet.labels.forEach((l) => {
          if (newSelected.includes(l.id)) lblMap.set(l.id, { x: l.x, y: l.y });
        });

        setIsDraggingObjects(true);
        setDragStartSnapshot({
          symbols: symMap,
          wires: wireMap,
          buses: busMap,
          labels: lblMap,
          anchorWorld: { x: wp.x, y: wp.y },
        });
        setHighlightedNetName(null);
        setActiveViolationPopup(null);
        return;
      }

      // Empty canvas click -> Start Box Selection
      if (e.button === 0) {
        setIsSelectingBox(true);
        setSelectionBoxStart(wp);
        setSelectionBoxCurrent(wp);
        if (!e.shiftKey) {
          setSelectedIds([]);
        }
        setHighlightedNetName(null);
        setActiveViolationPopup(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    setHoverWorldPos(wp);

    if (isPanning) {
      setPan({ x: sx - panStart.x, y: sy - panStart.y });
      return;
    }

    if (isSelectingBox) {
      setSelectionBoxCurrent(wp);
      return;
    }

    if (isDraggingObjects && dragStartSnapshot && selectedIds.length > 0) {
      const deltaX = snapToGrid(wp.x - dragStartSnapshot.anchorWorld.x);
      const deltaY = snapToGrid(wp.y - dragStartSnapshot.anchorWorld.y);

      onUpdateProject((prev) => {
        const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];

        const updatedSymbols = sheet.symbols.map((sym) => {
          const orig = dragStartSnapshot.symbols.get(sym.id);
          return orig ? { ...sym, x: snapToGrid(orig.x + deltaX), y: snapToGrid(orig.y + deltaY) } : sym;
        });

        let updatedWires = sheet.wires.map((w) => {
          const orig = dragStartSnapshot.wires.get(w.id);
          return orig
            ? {
                ...w,
                x1: snapToGrid(orig.x1 + deltaX),
                y1: snapToGrid(orig.y1 + deltaY),
                x2: snapToGrid(orig.x2 + deltaX),
                y2: snapToGrid(orig.y2 + deltaY),
              }
            : w;
        });

        // Rubber-band stretch wires connected to moved symbols
        sheet.symbols.forEach((sym) => {
          if (dragStartSnapshot.symbols.has(sym.id)) {
            const orig = dragStartSnapshot.symbols.get(sym.id)!;
            const symDelta = {
              x: snapToGrid(orig.x + deltaX) - orig.x,
              y: snapToGrid(orig.y + deltaY) - orig.y,
            };
            if (symDelta.x !== 0 || symDelta.y !== 0) {
              updatedWires = RubberBandRouter.stretchWiresOnSymbolMove(
                { ...sym, x: orig.x, y: orig.y },
                symDelta,
                updatedWires
              );
            }
          }
        });

        const updatedBuses = (sheet.buses || []).map((b) => {
          const orig = dragStartSnapshot.buses.get(b.id);
          return orig
            ? {
                ...b,
                x1: snapToGrid(orig.x1 + deltaX),
                y1: snapToGrid(orig.y1 + deltaY),
                x2: snapToGrid(orig.x2 + deltaX),
                y2: snapToGrid(orig.y2 + deltaY),
              }
            : b;
        });

        const updatedLabels = sheet.labels.map((l) => {
          const orig = dragStartSnapshot.labels.get(l.id);
          return orig ? { ...l, x: snapToGrid(orig.x + deltaX), y: snapToGrid(orig.y + deltaY) } : l;
        });

        return {
          ...prev,
          schematic: {
            ...prev.schematic,
            sheets: prev.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: updatedSymbols,
                    wires: updatedWires,
                    buses: updatedBuses,
                    labels: updatedLabels,
                  }
                : s
            ),
          },
        };
      });
      return;
    }

    if (activeTool === 'wire') {
      const snapPin = SchematicHelper.findClosestPin(wp, activeSheet.symbols, 2.5);
      setMagneticSnapPin(snapPin);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelectingBox && selectionBoxStart && selectionBoxCurrent) {
      const minX = Math.min(selectionBoxStart.x, selectionBoxCurrent.x);
      const maxX = Math.max(selectionBoxStart.x, selectionBoxCurrent.x);
      const minY = Math.min(selectionBoxStart.y, selectionBoxCurrent.y);
      const maxY = Math.max(selectionBoxStart.y, selectionBoxCurrent.y);

      const w = maxX - minX;
      const h = maxY - minY;

      if (w > 1.5 || h > 1.5) {
        const matched: string[] = [];
        if (selectionFilter.symbols) {
          activeSheet.symbols.forEach((sym) => {
            const bb = SchematicHelper.getSymbolBoundingBox(sym);
            if (bb.minX <= maxX && bb.maxX >= minX && bb.minY <= maxY && bb.maxY >= minY) {
              matched.push(sym.id);
            }
          });
        }
        if (selectionFilter.wires) {
          activeSheet.wires.forEach((wire) => {
            const inBox =
              (wire.x1 >= minX && wire.x1 <= maxX && wire.y1 >= minY && wire.y1 <= maxY) ||
              (wire.x2 >= minX && wire.x2 <= maxX && wire.y2 >= minY && wire.y2 <= maxY);
            if (inBox) matched.push(wire.id);
          });
        }
        if (selectionFilter.buses && activeSheet.buses) {
          activeSheet.buses.forEach((bus) => {
            const inBox =
              (bus.x1 >= minX && bus.x1 <= maxX && bus.y1 >= minY && bus.y1 <= maxY) ||
              (bus.x2 >= minX && bus.x2 <= maxX && bus.y2 >= minY && bus.y2 <= maxY);
            if (inBox) matched.push(bus.id);
          });
        }
        if (selectionFilter.labels) {
          activeSheet.labels.forEach((lbl) => {
            if (lbl.x >= minX && lbl.x <= maxX && lbl.y >= minY && lbl.y <= maxY) {
              matched.push(lbl.id);
            }
          });
        }

        setSelectedIds((prev) => Array.from(new Set([...(e.shiftKey ? prev : []), ...matched])));
      }
      setIsSelectingBox(false);
      setSelectionBoxStart(null);
      setSelectionBoxCurrent(null);
    }

    setIsPanning(false);
    setIsDraggingObjects(false);
    setDragStartSnapshot(null);
  };

  return (
    <div className="w-full h-full flex select-none overflow-hidden bg-cad-bg relative min-w-0 min-h-0">
      {/* 1. Left Symbol Library Sidebar */}
      <SymbolLibrarySidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectSymbol={() => setSelectedIds([])}
        onArmPlacement={handleArmPlacement}
      />

      {/* 2. Central Schematic Canvas */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden min-w-0 min-h-0">
        {/* Schematic Main Engineering Toolbar */}
        <div className="h-8 bg-cad-panel border-b border-cad-border px-2 flex items-center justify-between text-xs select-none shrink-0 min-w-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => {
                setActiveTool('select');
                setActiveViolationPopup(null);
              }}
              title="Select Tool (Esc / V)"
              className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1.5 font-medium transition-colors duration-fast ${
                activeTool === 'select' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-cad-text hover:bg-cad-surfaceHover'
              }`}
            >
              <Move size={13} />
              <span>Select</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('pan');
                setActiveViolationPopup(null);
              }}
              title="Pan Tool (H / Middle Drag)"
              className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1.5 font-medium transition-colors duration-fast ${
                activeTool === 'pan' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-cad-text hover:bg-cad-surfaceHover'
              }`}
            >
              <Hand size={13} />
              <span>Pan (H)</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('wire');
                setWireStart(null);
                setActiveViolationPopup(null);
              }}
              title="Draw Wire (W)"
              className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1.5 font-medium transition-colors duration-fast ${
                activeTool === 'wire' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-cad-text hover:bg-cad-surfaceHover'
              }`}
            >
              <Zap size={13} className={activeTool === 'wire' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
              <span>Wire (W)</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('bus');
                setBusStart(null);
                setActiveViolationPopup(null);
              }}
              title="Draw Multi-Signal Bus (B)"
              className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1.5 font-medium transition-colors duration-fast ${
                activeTool === 'bus' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-cad-text hover:bg-cad-surfaceHover'
              }`}
            >
              <Binary size={13} className={activeTool === 'bus' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'} />
              <span>Bus (B)</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('no_connect');
                setActiveViolationPopup(null);
              }}
              title="Place No-Connect Flag (Q)"
              className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1.5 font-medium transition-colors duration-fast ${
                activeTool === 'no_connect' ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-cad-text hover:bg-cad-surfaceHover'
              }`}
            >
              <X size={13} className={activeTool === 'no_connect' ? 'text-white' : 'text-red-600 dark:text-red-400'} />
              <span>No-Connect (Q)</span>
            </button>

            <button
              onClick={onOpenSymbolChooser}
              title="Place Component Symbol (A)"
              className="px-2 py-0.5 hover:bg-cad-surfaceHover rounded-xs text-cad-text flex items-center gap-1.5 font-medium transition-colors duration-fast"
            >
              <Cpu size={13} className="text-blue-600 dark:text-blue-400" />
              <span>Symbol (A)</span>
            </button>

            <div className="h-3.5 w-px bg-cad-border mx-0.5" />

            <button
              onClick={handleAutoAnnotate}
              title="Auto-Annotate Schematic References (R? -> R1, R2...)"
              className="px-2 py-0.5 hover:bg-cad-surfaceHover rounded-xs text-cad-text flex items-center gap-1.5 font-medium transition-colors duration-fast"
            >
              <GitCommit size={13} className="text-purple-600 dark:text-purple-400" />
              <span>Annotate</span>
            </button>

            <button
              onClick={handleExportBOM}
              title="Download Bill of Materials (BOM CSV)"
              className="px-2 py-0.5 hover:bg-cad-surfaceHover rounded-xs text-cad-text flex items-center gap-1.5 font-medium transition-colors duration-fast"
            >
              <FileSpreadsheet size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>BOM CSV</span>
            </button>

            <button
              onClick={() => setShowFilterBar(!showFilterBar)}
              title="Toggle Selection Filters"
              className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1.5 font-medium transition-colors duration-fast ${
                showFilterBar ? 'bg-cad-subpanel text-cad-textHeading border border-cad-border font-semibold' : 'text-cad-text hover:bg-cad-surfaceHover'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filter</span>
            </button>

            {/* Delete Selected */}
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                title="Delete Selected (Delete / Backspace)"
                className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded-xs flex items-center gap-1.5 font-semibold transition-colors duration-fast shadow-xs"
              >
                <Trash2 size={13} />
                <span>Delete ({selectedIds.length})</span>
              </button>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2.5 text-[11px] font-mono shrink-0 ml-2">
            {ercViolations.length === 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 size={13} />
                <span>ERC Clean</span>
              </span>
            ) : (
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded-xs bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-semibold cursor-pointer hover:bg-amber-500/20 transition-colors duration-fast"
                onClick={() => {
                  if (ercViolations.length > 0) setActiveViolationPopup(ercViolations[0]);
                }}
              >
                <AlertTriangle size={13} />
                <span>{ercViolations.length} ERC</span>
              </button>
            )}

            {/* Grid Spacing */}
            <div className="flex items-center space-x-1.5 border-l border-cad-border pl-2">
              <Grid size={12} className="text-cad-textMuted" />
              <select
                value={gridMil}
                onChange={(e) => setGridMil(Number(e.target.value) as 100 | 50 | 25)}
                className="bg-cad-inputBg border border-cad-inputBorder rounded-xs px-1.5 py-0.5 text-xs text-cad-inputText outline-none cursor-pointer focus:border-blue-500 font-mono"
              >
                <option value={100}>100 mil (2.54 mm)</option>
                <option value={50}>50 mil (1.27 mm)</option>
                <option value={25}>25 mil (0.635 mm)</option>
              </select>
            </div>

            <div className="flex items-center space-x-0.5 border-l border-cad-border pl-2">
              <button
                onClick={() => setZoom((z) => Math.min(25, z * 1.2))}
                title="Zoom In"
                className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text transition-colors duration-fast"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(1, z * 0.8))}
                title="Zoom Out"
                className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text transition-colors duration-fast"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={() => {
                  setPan({ x: 340, y: 200 });
                  setZoom(4.0);
                }}
                title="Fit to Center"
                className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text transition-colors duration-fast"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Selection Filter Bar */}
        {showFilterBar && (
          <div className="h-7 bg-cad-subpanel border-b border-cad-border px-3 flex items-center gap-4 text-[11px] text-cad-text select-none shrink-0 min-w-0 overflow-x-auto no-scrollbar">
            <span className="font-semibold text-cad-textHeading flex items-center gap-1">
              <SlidersHorizontal size={11} /> Selection Filter:
            </span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectionFilter.symbols}
                onChange={(e) => setSelectionFilter((f) => ({ ...f, symbols: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Symbols</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectionFilter.wires}
                onChange={(e) => setSelectionFilter((f) => ({ ...f, wires: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Wires</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectionFilter.buses}
                onChange={(e) => setSelectionFilter((f) => ({ ...f, buses: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Buses</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectionFilter.labels}
                onChange={(e) => setSelectionFilter((f) => ({ ...f, labels: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Labels</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={selectionFilter.noConnects}
                onChange={(e) => setSelectionFilter((f) => ({ ...f, noConnects: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>No-Connects</span>
            </label>
          </div>
        )}

        {/* Canvas Engine */}
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={handleCanvasDrop}
          className={`flex-1 w-full h-full min-w-0 min-h-0 block ${
            isPanning
              ? 'cursor-grabbing'
              : activeTool === 'pan'
              ? 'cursor-grab'
              : activeTool === 'wire' || activeTool === 'bus' || activeTool === 'no_connect'
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
        />

        {/* ERC Violation Popover */}
        {activeViolationPopup && (
          <div className="absolute top-12 right-4 bg-cad-panel border border-amber-500/60 p-3 rounded shadow-xl max-w-sm text-xs space-y-2 z-20 text-cad-text animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {activeViolationPopup.code} - {activeViolationPopup.severity.toUpperCase()}
              </span>
              <button
                onClick={() => setActiveViolationPopup(null)}
                className="text-cad-textMuted hover:text-cad-text font-mono text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="font-semibold text-cad-textHeading">{activeViolationPopup.title}</div>
            <p className="text-[11px] text-cad-text bg-cad-subpanel p-2 rounded-sm border border-cad-border">
              {activeViolationPopup.description}
            </p>
          </div>
        )}

        {/* Live Coordinate & Status HUD */}
        <div className="absolute bottom-3 left-3 bg-cad-panel border border-cad-border px-2.5 py-1 rounded text-xs font-mono text-cad-text flex items-center gap-3 shadow-md pointer-events-none select-none">
          <span>X: {hoverWorldPos.x.toFixed(2)} mm</span>
          <span>Y: {hoverWorldPos.y.toFixed(2)} mm</span>
          <span className="text-cad-textMuted">Grid: {gridStep} mm</span>
          {selectedIds.length > 0 && (
            <span className="text-blue-600 dark:text-blue-400 font-semibold border-l border-cad-border pl-2">
              Selected: {selectedIds.length} object(s)
            </span>
          )}
          {activeTool === 'place_symbol' && armedSymbolDef && (
            <span className="text-blue-600 dark:text-blue-400 font-semibold border-l border-cad-border pl-2">
              Placing: {armedSymbolDef.name} (Click to drop, R: Rotate)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
