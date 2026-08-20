/**
 * FloZ ECA - Professional Interactive Schematic Capture Editor
 * Hardened 2D Canvas engine with Drag & Drop, precise magnetic pin snapping,
 * automatic T-junction creation, dynamic net highlighting, clickable ERC markers,
 * viewport culling, and keyboard guards.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ApexProject,
  Point2D,
  SchematicSymbolInstance,
  SchematicWireSegment,
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
  Wand2,
  FlipHorizontal,
  Crosshair,
  Info,
  Hand,
} from 'lucide-react';
import { AppThemeId, getCanvasColors } from '../theme/themeManager';

interface Props {
  project: ApexProject;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  onOpenSymbolChooser: () => void;
  theme?: AppThemeId;
}

export type EditorTool = 'select' | 'pan' | 'wire' | 'junction' | 'label' | 'power' | 'delete' | 'place_symbol';

export const SchematicEditor: React.FC<Props> = ({
  project,
  onUpdateProject,
  onOpenSymbolChooser,
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Transform (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(4.0); // pixels per mm
  const [pan, setPan] = useState<Point2D>({ x: 340, y: 200 });
  const [activeTool, setActiveTool] = useState<EditorTool>('select');

  // Sidebar visibility
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Interactive Selection & Dragging
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedNetName, setHighlightedNetName] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isDraggingObjects, setIsDraggingObjects] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });

  // Marquee Box Selection State
  const [isSelectingBox, setIsSelectingBox] = useState<boolean>(false);
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point2D | null>(null);
  const [selectionBoxCurrent, setSelectionBoxCurrent] = useState<Point2D | null>(null);

  // Multi-Object Group Dragging Snapshot
  const [dragStartSnapshot, setDragStartSnapshot] = useState<{
    symbols: Map<string, Point2D>;
    wires: Map<string, { x1: number; y1: number; x2: number; y2: number }>;
    labels: Map<string, Point2D>;
    anchorWorld: Point2D;
  } | null>(null);

  // Armed Placement Mode (Multi-placement)
  const [armedSymbolDef, setArmedSymbolDef] = useState<SymbolDefinition | null>(null);
  const [placementRotation, setPlacementRotation] = useState<0 | 90 | 180 | 270>(0);
  const [placementMirror, setPlacementMirror] = useState<boolean>(false);

  // Wire drawing state
  const [wireStart, setWireStart] = useState<Point2D | null>(null);
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

  const gridStep = project.settings.gridSpacingSchematic || 2.54;

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

  // Screen <-> World coordinate transforms
  const screenToWorld = useCallback(
    (sx: number, sy: number): Point2D => {
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number): Point2D => {
      return {
        x: wx * zoom + pan.x,
        y: wy * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  // Delete selected objects handler (Components, Wires, Labels)
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
                  labels: s.labels.filter((l) => !selectedIds.includes(l.id)),
                }
              : s
          ),
        },
      };
    }, `Delete ${selectedIds.length} Object(s)`);

    setSelectedIds([]);
    setHighlightedNetName(null);
  }, [selectedIds, onUpdateProject]);

  // Global keydown handler for Delete, Backspace, Escape, W, A, H, Space
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
        setSelectedIds([]);
        setIsSelectingBox(false);
      } else if (e.key.toLowerCase() === 'w') {
        setActiveTool('wire');
        setWireStart(null);
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

    // Keep world coordinate under cursor stable
    const wx = (mouseX - pan.x) / zoom;
    const wy = (mouseY - pan.y) / zoom;

    setPan({
      x: mouseX - wx * newZoom,
      y: mouseY - wy * newZoom,
    });
    setZoom(newZoom);
  };

  // Keyboard Shortcuts (with input guard)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        if (activeTool === 'place_symbol' && armedSymbolDef) {
          setPlacementRotation((r) => ((r + 90) % 360) as any);
        } else if (selectedIds.length > 0) {
          onUpdateProject((prev) => {
            const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
            return {
              ...prev,
              schematic: {
                ...prev.schematic,
                sheets: prev.schematic.sheets.map((s) =>
                  s.id === sheet.id
                    ? {
                        ...s,
                        symbols: s.symbols.map((sym) =>
                          selectedIds.includes(sym.id)
                            ? { ...sym, rotation: ((sym.rotation + 90) % 360) as any }
                            : sym
                        ),
                      }
                    : s
                ),
              },
            };
          }, 'Rotate Symbol');
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (activeTool === 'place_symbol' && armedSymbolDef) {
          setPlacementMirror((m) => !m);
        } else if (selectedIds.length > 0) {
          onUpdateProject((prev) => {
            const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
            return {
              ...prev,
              schematic: {
                ...prev.schematic,
                sheets: prev.schematic.sheets.map((s) =>
                  s.id === sheet.id
                    ? {
                        ...s,
                        symbols: s.symbols.map((sym) =>
                          selectedIds.includes(sym.id)
                            ? { ...sym, mirrorX: !sym.mirrorX }
                            : sym
                        ),
                      }
                    : s
                ),
              },
            };
          }, 'Mirror Symbol');
        }
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setArmedSymbolDef(null);
        setWireStart(null);
        setSelectedIds([]);
        setHighlightedNetName(null);
        setActiveViolationPopup(null);
      } else if (e.key === 'w' || e.key === 'W') {
        setActiveTool('wire');
        setWireStart(null);
      } else if (e.key === 'a' || e.key === 'A') {
        onOpenSymbolChooser();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          onUpdateProject((prev) => {
            const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
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
                      }
                    : s
                ),
              },
            };
          }, 'Delete Objects');
          setSelectedIds([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [activeTool, armedSymbolDef, selectedIds, onUpdateProject, onOpenSymbolChooser]);

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

    // Theme detection & canvas colors
    const colors = getCanvasColors(theme);
    const isLight = colors.isLight;

    // 1. CAD Background & Dot Grid (Adaptive for 60fps performance)
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

    // 2. Render Schematic Wires
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
        ? (isLight ? '#0284c7' : '#38bdf8')
        : isNetHighlighted
        ? '#f59e0b'
        : (isLight ? '#0369a1' : '#10b981');
      ctx.lineWidth = isSelected || isNetHighlighted ? Math.max(2.5, 0.6 * zoom) : Math.max(1.5, 0.4 * zoom);
      ctx.lineCap = 'round';

      const p1 = worldToScreen(wire.x1, wire.y1);
      const p2 = worldToScreen(wire.x2, wire.y2);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // 3. Render Active Wire in Progress
    if (wireStart && activeTool === 'wire') {
      ctx.strokeStyle = isLight ? '#0284c7' : '#38bdf8';
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

    // 4. Render Junctions
    ctx.fillStyle = isLight ? '#0369a1' : '#10b981';
    activeSheet.junctions.forEach((junc) => {
      const sp = worldToScreen(junc.x, junc.y);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, Math.max(3, 0.75 * zoom), 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Render Symbols
    activeSheet.symbols.forEach((sym) => {
      const isSelected = selectedIds.includes(sym.id);
      const symScreen = worldToScreen(sym.x, sym.y);

      // Viewport culling
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

      ctx.strokeStyle = isSelected ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#1e293b' : '#e2e8f0');
      ctx.fillStyle = isLight ? '#ffffff' : '#1a202c';
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
            ctx.fillStyle = isSelected ? (isLight ? '#bae6fd' : '#38bdf8') : (isLight ? '#f1f5f9' : '#cbd5e1');
            ctx.fill();
          }
          ctx.stroke();
        } else if (shape.type === 'circle' && shape.radius) {
          ctx.beginPath();
          ctx.arc((shape.x || 0) * zoom, (shape.y || 0) * zoom, shape.radius * zoom, 0, Math.PI * 2);
          if (shape.filled) ctx.fill();
          ctx.stroke();
        } else if (shape.type === 'arc' && shape.radius) {
          ctx.beginPath();
          ctx.arc(
            (shape.x || 0) * zoom,
            (shape.y || 0) * zoom,
            shape.radius * zoom,
            shape.startAngle || 0,
            shape.endAngle || Math.PI,
            shape.counterclockwise
          );
          if (shape.filled) ctx.fill();
          ctx.stroke();
        } else if (shape.type === 'bezier' && shape.points && shape.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          ctx.bezierCurveTo(
            shape.points[1].x * zoom,
            shape.points[1].y * zoom,
            shape.points[2].x * zoom,
            shape.points[2].y * zoom,
            shape.points[3].x * zoom,
            shape.points[3].y * zoom
          );
          ctx.stroke();
        } else if (shape.type === 'text' && shape.text) {
          ctx.save();
          ctx.translate((shape.x || 0) * zoom, (shape.y || 0) * zoom);
          if (shape.rotation) ctx.rotate((shape.rotation * Math.PI) / 180);
          ctx.font = `${Math.max(8, (shape.fontSize || 1.27) * 2.0 * zoom)}px 'Inter', sans-serif`;
          ctx.fillStyle = isLight ? '#334155' : '#cbd5e1';
          ctx.fillText(shape.text, 0, 0);
          ctx.restore();
        }
      });

      // Render Pins
      ctx.strokeStyle = isLight ? '#dc2626' : '#e05638';
      ctx.font = `${Math.max(9, 2.0 * zoom)}px 'JetBrains Mono', monospace`;

      sym.pins.forEach((pin) => {
        const px = pin.x * zoom;
        const py = pin.y * zoom;
        const pinOrient = pin.orientation || 0;
        const rad = (pinOrient * Math.PI) / 180;
        const len = (pin.length !== undefined ? pin.length : 2.54) * zoom;
        const endX = px + Math.cos(rad) * len;
        const endY = py + Math.sin(rad) * len;

        // Pin Lead Line
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Pin Inversion Bubble if applicable
        if (pin.graphicStyle === 'inverted' || pin.graphicStyle === 'inverted_clock') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px + Math.cos(rad) * 1.2 * zoom, py + Math.sin(rad) * 1.2 * zoom, 1.0 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = isLight ? '#f8fafc' : '#1a202c';
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Pin Clock Triangle if applicable
        if (pin.graphicStyle === 'clock' || pin.graphicStyle === 'inverted_clock') {
          ctx.save();
          const normRad = rad + Math.PI / 2;
          const tipX = px + Math.cos(rad) * 1.8 * zoom;
          const tipY = py + Math.sin(rad) * 1.8 * zoom;
          const pLeftX = px + Math.cos(normRad) * 1.2 * zoom;
          const pLeftY = py + Math.sin(normRad) * 1.2 * zoom;
          const pRightX = px - Math.cos(normRad) * 1.2 * zoom;
          const pRightY = py - Math.sin(normRad) * 1.2 * zoom;
          ctx.beginPath();
          ctx.moveTo(pLeftX, pLeftY);
          ctx.lineTo(tipX, tipY);
          ctx.lineTo(pRightX, pRightY);
          ctx.stroke();
          ctx.restore();
        }

        // Pin Connection Dot at the active lead endpoint
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pin Number & Name (Clean orientation-aware placement)
        if (pin.visible && zoom > 2.2) {
          ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
          // Number along lead
          if (pinOrient === 180) {
            ctx.fillText(pin.number, endX + 3, endY - 3);
          } else if (pinOrient === 0) {
            ctx.fillText(pin.number, endX - 14, endY - 3);
          } else if (pinOrient === 270) {
            ctx.fillText(pin.number, endX + 3, endY + 10);
          } else {
            ctx.fillText(pin.number, endX + 3, endY - 5);
          }

          // Name adjacent to body
          ctx.fillStyle = isLight ? '#0f172a' : '#e2e8f0';
          if (pinOrient === 180) {
            ctx.fillText(pin.name, px + 5, py + 3);
          } else if (pinOrient === 0) {
            ctx.fillText(pin.name, px - 24, py + 3);
          } else if (pinOrient === 270) {
            ctx.fillText(pin.name, px + 4, py + 12);
          } else {
            ctx.fillText(pin.name, px + 4, py - 4);
          }
        }
      });

      ctx.restore();

      // Clean Reference & Value Labels (e.g. U1A, U1B for multi-unit components)
      const unitSuffix = sym.unitSuffix || (symDef && symDef.unitCount && symDef.unitCount > 1 ? (sym.unit > 0 && sym.unit <= 26 ? String.fromCharCode(64 + sym.unit) : `_${sym.unit}`) : '');
      const displayRef = `${sym.reference}${unitSuffix}`;

      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      ctx.font = `600 ${Math.max(10, 3.2 * zoom)}px Inter, sans-serif`;
      ctx.fillText(displayRef, symScreen.x - 12, symScreen.y - 18 * (zoom / 4));

      ctx.fillStyle = isLight ? '#6d28d9' : '#a78bfa';
      ctx.font = `500 ${Math.max(9, 2.6 * zoom)}px Inter, sans-serif`;
      ctx.fillText(sym.value, symScreen.x - 12, symScreen.y + 22 * (zoom / 4));
    });

    // 6. Ghost Preview for Armed Symbol Placement
    if (activeTool === 'place_symbol' && armedSymbolDef) {
      const snappedHover = { x: snapToGrid(hoverWorldPos.x), y: snapToGrid(hoverWorldPos.y) };
      const ghostScreen = worldToScreen(snappedHover.x, snappedHover.y);

      const ghostShapes = armedSymbolDef.units && armedSymbolDef.units.length > 0 ? armedSymbolDef.units[0].shapes : armedSymbolDef.shapes;
      const ghostPins = armedSymbolDef.units && armedSymbolDef.units.length > 0 ? armedSymbolDef.units[0].pins : armedSymbolDef.pins;

      ctx.save();
      ctx.translate(ghostScreen.x, ghostScreen.y);
      ctx.rotate((placementRotation * Math.PI) / 180);
      if (placementMirror) ctx.scale(-1, 1);

      ctx.strokeStyle = '#38bdf8';
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
        } else if (shape.type === 'line' && shape.points && shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.stroke();
        } else if (shape.type === 'circle' && shape.radius) {
          ctx.beginPath();
          ctx.arc((shape.x || 0) * zoom, (shape.y || 0) * zoom, shape.radius * zoom, 0, Math.PI * 2);
          ctx.stroke();
        } else if (shape.type === 'arc' && shape.radius) {
          ctx.beginPath();
          ctx.arc((shape.x || 0) * zoom, (shape.y || 0) * zoom, shape.radius * zoom, shape.startAngle || 0, shape.endAngle || Math.PI, shape.counterclockwise);
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

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`${armedSymbolDef.defaultPrefix}? (${armedSymbolDef.name}) [R:Rotate, M:Mirror, Esc:Cancel]`, ghostScreen.x - 15, ghostScreen.y - 20);
    }

    // 7. Render Magnetic Pin Snapping Feedback
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

    // 8. Render In-Canvas ERC Error & Warning Markers
    ercViolations.forEach((v) => {
      const sp = worldToScreen(v.x, v.y);
      const isError = v.severity === 'error';

      ctx.fillStyle = isError ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 12, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isError ? '✕' : '!', sp.x, sp.y - 12);
    });

    // 9. Render Net Labels
    activeSheet.labels.forEach((lbl) => {
      const sp = worldToScreen(lbl.x, lbl.y);
      ctx.fillStyle = '#f59e0b';
      ctx.font = `600 ${Math.max(10, 2.8 * zoom)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`[ ${lbl.text} ]`, sp.x + 4, sp.y - 4);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 10. Render Power Symbols
    activeSheet.powerSymbols.forEach((pwr) => {
      const sp = worldToScreen(pwr.x, pwr.y);
      ctx.fillStyle = '#ef4444';
      ctx.font = `bold ${Math.max(10, 3.0 * zoom)}px 'JetBrains Mono', monospace`;
      ctx.fillText(pwr.netName, sp.x - 10, sp.y - 8);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x, sp.y - 6);
      ctx.lineTo(sp.x - 6, sp.y - 6);
      ctx.lineTo(sp.x + 6, sp.y - 6);
      ctx.stroke();
    });

    // 11. Render Marquee Box Selection Overlay
    if (isSelectingBox && selectionBoxStart && selectionBoxCurrent) {
      const p1 = worldToScreen(selectionBoxStart.x, selectionBoxStart.y);
      const p2 = worldToScreen(selectionBoxCurrent.x, selectionBoxCurrent.y);
      const minX = Math.min(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(minX, minY, w, h);
      ctx.strokeStyle = '#38bdf8';
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
  ]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const snapped = { x: snapToGrid(wp.x), y: snapToGrid(wp.y) };

    // Check if clicked an ERC marker
    const clickedMarker = ercViolations.find((v) => {
      const sp = worldToScreen(v.x, v.y);
      return Math.hypot(sx - sp.x, sy - (sp.y - 12)) < 10;
    });

    if (clickedMarker) {
      setActiveViolationPopup(clickedMarker);
      setPan({
        x: canvas.width / 2 - clickedMarker.x * zoom,
        y: canvas.height / 2 - clickedMarker.y * zoom,
      });
      return;
    }

    // 1. Pan with Middle mouse, Right mouse, Alt key, or Pan Tool
    if (e.button === 1 || e.button === 2 || activeTool === 'pan' || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    // 2. Armed Symbol Placement
    if (activeTool === 'place_symbol' && armedSymbolDef) {
      const nextRef = SchematicHelper.getNextReference(armedSymbolDef.defaultPrefix, activeSheet.symbols);
      const initialUnit = armedSymbolDef.units && armedSymbolDef.units.length > 0 ? armedSymbolDef.units[0] : null;

      const newSym: SchematicSymbolInstance = {
        id: `sym_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        symbolDefId: armedSymbolDef.id,
        reference: nextRef,
        value: armedSymbolDef.name,
        footprint: armedSymbolDef.defaultFootprint || '',
        x: snapped.x,
        y: snapped.y,
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
              s.id === sheet.id ? { ...s, symbols: [...s.symbols, newSym] } : s
            ),
          },
        };
      }, `Place ${newSym.reference}`);

      setSelectedIds([newSym.id]);
      eventBus.emit('SELECT_SYMBOL', { symbolId: newSym.id, reference: newSym.reference });
      return;
    }

    // 3. Wire Routing
    if (activeTool === 'wire') {
      const snapPoint = magneticSnapPin ? magneticSnapPin.worldPos : snapped;

      if (!wireStart) {
        setWireStart(snapPoint);
      } else {
        const newWire: SchematicWireSegment = {
          id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x1: wireStart.x,
          y1: wireStart.y,
          x2: snapPoint.x,
          y2: snapPoint.y,
        };

        const existingWire = activeSheet.wires.find((w) => {
          const minX = Math.min(w.x1, w.x2) - 0.2;
          const maxX = Math.max(w.x1, w.x2) + 0.2;
          const minY = Math.min(w.y1, w.y2) - 0.2;
          const maxY = Math.max(w.y1, w.y2) + 0.2;
          if (snapPoint.x >= minX && snapPoint.x <= maxX && snapPoint.y >= minY && snapPoint.y <= maxY) {
            const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
            if (len > 0) {
              const cross = Math.abs((w.y2 - w.y1) * snapPoint.x - (w.x2 - w.x1) * snapPoint.y + w.x2 * w.y1 - w.y2 * w.x1);
              return cross / len < 0.25;
            }
          }
          return false;
        });

        const newJuncs: SchematicJunction[] = [];
        if (existingWire) {
          const hasJunc = activeSheet.junctions.some((j) => Math.hypot(j.x - snapPoint.x, j.y - snapPoint.y) < 0.3);
          if (!hasJunc) {
            newJuncs.push({ id: `junc_${Date.now()}`, x: snapPoint.x, y: snapPoint.y });
          }
        }

        onUpdateProject((prev) => {
          const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
          return {
            ...prev,
            schematic: {
              ...prev.schematic,
              sheets: prev.schematic.sheets.map((s) =>
                s.id === sheet.id
                  ? {
                      ...s,
                      wires: [...s.wires, newWire],
                      junctions: [...s.junctions, ...newJuncs],
                    }
                  : s
              ),
            },
          };
        }, 'Draw Wire');

        if (magneticSnapPin) {
          setWireStart(null);
        } else {
          setWireStart(snapPoint);
        }
      }
      return;
    }

    // 4. Selection Mode & Multi-Object Move
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
      const symHit = activeSheet.symbols.find((s) => {
        const bb = SchematicHelper.getSymbolBoundingBox(s);
        return wp.x >= bb.minX && wp.x <= bb.maxX && wp.y >= bb.minY && wp.y <= bb.maxY;
      });

      // Check Wire Click
      const wireHit = !symHit ? activeSheet.wires.find((w) => {
        const dist = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
        if (dist === 0) return false;
        const d = Math.abs((w.y2 - w.y1) * wp.x - (w.x2 - w.x1) * wp.y + w.x2 * w.y1 - w.y2 * w.x1) / dist;
        return d < 1.2;
      }) : undefined;

      // Check Label Click
      const labelHit = (!symHit && !wireHit) ? activeSheet.labels.find((l) => Math.hypot(l.x - wp.x, l.y - wp.y) < 3.0) : undefined;

      const hitId = symHit?.id || wireHit?.id || labelHit?.id;

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

        // Snapshot positions for group drag
        const symMap = new Map<string, Point2D>();
        const wireMap = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
        const lblMap = new Map<string, Point2D>();

        activeSheet.symbols.forEach((s) => {
          if (newSelected.includes(s.id)) symMap.set(s.id, { x: s.x, y: s.y });
        });
        activeSheet.wires.forEach((w) => {
          if (newSelected.includes(w.id)) wireMap.set(w.id, { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 });
        });
        activeSheet.labels.forEach((l) => {
          if (newSelected.includes(l.id)) lblMap.set(l.id, { x: l.x, y: l.y });
        });

        setIsDraggingObjects(true);
        setDragStartSnapshot({
          symbols: symMap,
          wires: wireMap,
          labels: lblMap,
          anchorWorld: { x: wp.x, y: wp.y },
        });
        setHighlightedNetName(null);
        setActiveViolationPopup(null);
        return;
      }

      // Clicked empty canvas -> Start Marquee Box Selection
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
        return {
          ...prev,
          schematic: {
            ...prev.schematic,
            sheets: prev.schematic.sheets.map((s) =>
              s.id === sheet.id
                ? {
                    ...s,
                    symbols: s.symbols.map((sym) => {
                      const orig = dragStartSnapshot.symbols.get(sym.id);
                      return orig ? { ...sym, x: snapToGrid(orig.x + deltaX), y: snapToGrid(orig.y + deltaY) } : sym;
                    }),
                    wires: s.wires.map((w) => {
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
                    }),
                    labels: s.labels.map((l) => {
                      const orig = dragStartSnapshot.labels.get(l.id);
                      return orig ? { ...l, x: snapToGrid(orig.x + deltaX), y: snapToGrid(orig.y + deltaY) } : l;
                    }),
                  }
                : s
            ),
          },
        };
      });
      return;
    }

    // Check magnetic snap for wiring
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
        activeSheet.symbols.forEach((sym) => {
          const bb = SchematicHelper.getSymbolBoundingBox(sym);
          if (bb.minX <= maxX && bb.maxX >= minX && bb.minY <= maxY && bb.maxY >= minY) {
            matched.push(sym.id);
          }
        });
        activeSheet.wires.forEach((wire) => {
          const inBox =
            (wire.x1 >= minX && wire.x1 <= maxX && wire.y1 >= minY && wire.y1 <= maxY) ||
            (wire.x2 >= minX && wire.x2 <= maxX && wire.y2 >= minY && wire.y2 <= maxY);
          if (inBox) matched.push(wire.id);
        });
        activeSheet.labels.forEach((lbl) => {
          if (lbl.x >= minX && lbl.x <= maxX && lbl.y >= minY && lbl.y <= maxY) {
            matched.push(lbl.id);
          }
        });

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
    <div className="w-full h-full flex select-none overflow-hidden bg-cad-bg relative">
      {/* 1. Left Symbol Library Sidebar */}
      <SymbolLibrarySidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectSymbol={(sym) => {
          setSelectedIds([]);
        }}
        onArmPlacement={handleArmPlacement}
      />

      {/* 2. Central Schematic Canvas */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden">
        {/* Schematic Top Toolbar */}
        <div className="h-10 bg-cad-subpanel border-b border-cad-border px-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setActiveTool('select');
                setActiveViolationPopup(null);
              }}
              title="Select & Marquee Box Tool (Esc / V)"
              className={`p-1.5 rounded flex items-center gap-1 font-semibold ${
                activeTool === 'select' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-cad-border'
              }`}
            >
              <Move size={14} /> Select
            </button>

            <button
              onClick={() => {
                setActiveTool('pan');
                setActiveViolationPopup(null);
              }}
              title="Pan Canvas Tool (H / Right Drag / Middle Drag)"
              className={`p-1.5 rounded flex items-center gap-1 font-semibold ${
                activeTool === 'pan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-cad-border'
              }`}
            >
              <Hand size={14} /> Pan (H)
            </button>

            <button
              onClick={() => {
                setActiveTool('wire');
                setWireStart(null);
                setActiveViolationPopup(null);
              }}
              title="Draw Electrical Wire (W)"
              className={`p-1.5 rounded flex items-center gap-1 font-semibold ${
                activeTool === 'wire' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-cad-border'
              }`}
            >
              <Zap size={14} className="text-emerald-400" /> Wire (W)
            </button>

            <button
              onClick={onOpenSymbolChooser}
              title="Search and Place Symbol (A)"
              className="p-1.5 hover:bg-cad-border rounded text-slate-300 flex items-center gap-1 font-semibold"
            >
              <Cpu size={14} className="text-blue-400" /> Place Symbol (A)
            </button>

            <button
              onClick={() => {
                if (selectedIds.length > 0) {
                  onUpdateProject((prev) => {
                    const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
                    return {
                      ...prev,
                      schematic: {
                        ...prev.schematic,
                        sheets: prev.schematic.sheets.map((s) =>
                          s.id === sheet.id
                            ? {
                                ...s,
                                symbols: s.symbols.map((sym) =>
                                  selectedIds.includes(sym.id) ? { ...sym, rotation: ((sym.rotation + 90) % 360) as any } : sym
                                ),
                              }
                            : s
                        ),
                      },
                    };
                  }, 'Rotate Symbol');
                }
              }}
              disabled={selectedIds.length === 0}
              title="Rotate Selected Symbols (R)"
              className="p-1.5 hover:bg-cad-border disabled:opacity-40 rounded text-slate-300 flex items-center gap-1"
            >
              <RotateCw size={14} /> Rotate (R)
            </button>

            <button
              onClick={() => {
                if (selectedIds.length > 0) {
                  onUpdateProject((prev) => {
                    const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
                    return {
                      ...prev,
                      schematic: {
                        ...prev.schematic,
                        sheets: prev.schematic.sheets.map((s) =>
                          s.id === sheet.id
                            ? {
                                ...s,
                                symbols: s.symbols.map((sym) =>
                                  selectedIds.includes(sym.id) ? { ...sym, mirrorX: !sym.mirrorX } : sym
                                ),
                              }
                            : s
                        ),
                      },
                    };
                  }, 'Mirror Symbol');
                }
              }}
              disabled={selectedIds.length === 0}
              title="Mirror Selected Symbols (M)"
              className="p-1.5 hover:bg-cad-border disabled:opacity-40 rounded text-slate-300 flex items-center gap-1"
            >
              <FlipHorizontal size={14} /> Mirror (M)
            </button>

            {/* Delete Selected Tool */}
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
              title="Delete Selected Objects (Delete / Backspace)"
              className={`p-1.5 rounded flex items-center gap-1 font-semibold transition-colors ${
                selectedIds.length > 0
                  ? 'bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-slate-500 opacity-40 cursor-not-allowed'
              }`}
            >
              <Trash2 size={14} className={selectedIds.length > 0 ? 'text-red-400' : undefined} />
              Delete {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center space-x-3 text-[11px] font-mono">
            {ercViolations.length === 0 ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={13} /> Schematic Clean
              </span>
            ) : (
              <span
                className="flex items-center gap-1 text-amber-400 cursor-pointer"
                onClick={() => {
                  if (ercViolations.length > 0) setActiveViolationPopup(ercViolations[0]);
                }}
              >
                <AlertTriangle size={13} /> {ercViolations.length} ERC Issues
              </span>
            )}

            <div className="flex items-center space-x-1 border-l border-cad-border pl-2">
              <button
                onClick={() => setZoom((z) => Math.min(25, z * 1.2))}
                title="Zoom In"
                className="p-1 hover:bg-cad-border rounded text-slate-300"
              >
                <ZoomIn size={13} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(1, z * 0.8))}
                title="Zoom Out"
                className="p-1 hover:bg-cad-border rounded text-slate-300"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={() => {
                  setPan({ x: 340, y: 200 });
                  setZoom(4.0);
                }}
                title="Fit to Center"
                className="p-1 hover:bg-cad-border rounded text-slate-300"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>
        </div>

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
          className={`flex-1 w-full h-full ${
            isPanning
              ? 'cursor-grabbing'
              : activeTool === 'pan'
              ? 'cursor-grab'
              : activeTool === 'wire'
              ? 'cursor-crosshair'
              : 'cursor-default'
          }`}
        />

        {/* On-Canvas Clicked ERC Violation Popover */}
        {activeViolationPopup && (
          <div className="absolute top-14 right-6 bg-cad-panel border border-amber-500/50 p-3 rounded-lg shadow-2xl max-w-sm text-xs space-y-2 z-20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={14} /> {activeViolationPopup.code} - {activeViolationPopup.severity.toUpperCase()}
              </span>
              <button
                onClick={() => setActiveViolationPopup(null)}
                className="text-slate-400 hover:text-white font-mono text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="font-semibold text-white">{activeViolationPopup.title}</div>
            <p className="text-[11px] text-slate-300 bg-cad-subpanel p-1.5 rounded border border-cad-border">
              {activeViolationPopup.description}
            </p>
          </div>
        )}

        {/* Live Coordinate & Armed Mode HUD overlay */}
        <div className="absolute bottom-3 left-3 bg-cad-panel/85 backdrop-blur-sm border border-cad-border px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-3 shadow-lg pointer-events-none">
          <span>X: {hoverWorldPos.x.toFixed(2)} mm</span>
          <span>Y: {hoverWorldPos.y.toFixed(2)} mm</span>
          <span>Grid: {gridStep} mm</span>
          {selectedIds.length > 0 && (
            <span className="text-blue-400 font-semibold">
              Selected: {selectedIds.length} object(s) [Del to delete]
            </span>
          )}
          {activeTool === 'place_symbol' && armedSymbolDef && (
            <span className="text-blue-400 font-bold">
              Placing: {armedSymbolDef.name} (Click to place, R to rotate)
            </span>
          )}
          {highlightedNetName && (
            <span className="text-amber-400 font-bold">
              Highlighted Net: {highlightedNetName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
