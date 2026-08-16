/**
 * Apex EDA - Interactive Schematic Capture Editor
 * 2D Canvas engine with orthogonal wire routing, symbol placement, grid snapping, and net connectivity.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ApexProject,
  Point2D,
  SchematicSymbolInstance,
  SchematicWireSegment,
  SchematicJunction,
  SchematicNetLabel,
  SchematicSheet,
} from '../core/types';
import { BUILTIN_SYMBOLS } from '../library/database';
import { SchematicAnnotator } from './annotator';
import { NetConnectivitySolver } from './connectivity';
import { eventBus } from '../core/eventBus';
import {
  Move,
  Plus,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Tag,
  Zap,
  CheckCircle2,
  Layers,
  Wand2,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  onOpenSymbolChooser: () => void;
}

type EditorTool = 'select' | 'wire' | 'junction' | 'label' | 'power' | 'delete';

export const SchematicEditor: React.FC<Props> = ({
  project,
  onUpdateProject,
  onOpenSymbolChooser,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Transform (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(4.0); // pixels per mm
  const [pan, setPan] = useState<Point2D>({ x: 300, y: 200 });
  const [activeTool, setActiveTool] = useState<EditorTool>('select');

  // Interactive Drag & Wire States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Point2D>({ x: 0, y: 0 });
  const [wireStart, setWireStart] = useState<Point2D | null>(null);
  const [hoverPos, setHoverPos] = useState<Point2D>({ x: 0, y: 0 });

  const activeSheet =
    project.schematic.sheets.find((s) => s.id === project.schematic.activeSheetId) ||
    project.schematic.sheets[0];

  const gridStep = project.settings.gridSpacingSchematic || 2.54; // 2.54mm grid

  // Grid Snapping Helper
  const snapToGrid = (val: number, step = gridStep): number => {
    return Math.round(val / step) * step;
  };

  // Screen to World Coordinates
  const screenToWorld = useCallback(
    (sx: number, sy: number): Point2D => {
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // World to Screen Coordinates
  const worldToScreen = useCallback(
    (wx: number, wy: number): Point2D => {
      return {
        x: wx * zoom + pan.x,
        y: wy * zoom + pan.y,
      };
    },
    [pan, zoom]
  );

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    // 1. Background & Grid
    ctx.fillStyle = '#14171c';
    ctx.fillRect(0, 0, width, height);

    // Draw Dot Grid
    const startWorld = screenToWorld(0, 0);
    const endWorld = screenToWorld(width, height);

    const minGridX = Math.floor(startWorld.x / gridStep) * gridStep;
    const maxGridX = Math.ceil(endWorld.x / gridStep) * gridStep;
    const minGridY = Math.floor(startWorld.y / gridStep) * gridStep;
    const maxGridY = Math.ceil(endWorld.y / gridStep) * gridStep;

    ctx.fillStyle = '#2a3240';
    for (let gx = minGridX; gx <= maxGridX; gx += gridStep) {
      for (let gy = minGridY; gy <= maxGridY; gy += gridStep) {
        const sp = worldToScreen(gx, gy);
        ctx.fillRect(sp.x - 0.75, sp.y - 0.75, 1.5, 1.5);
      }
    }

    // 2. Render Schematic Wires
    ctx.strokeStyle = '#10b981'; // Schematic emerald green
    ctx.lineWidth = Math.max(1.5, 0.4 * zoom);
    ctx.lineCap = 'round';

    activeSheet.wires.forEach((wire) => {
      const p1 = worldToScreen(wire.x1, wire.y1);
      const p2 = worldToScreen(wire.x2, wire.y2);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // 3. Render Active Wire in Progress
    if (wireStart && activeTool === 'wire') {
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([4, 4]);
      const p1 = worldToScreen(wireStart.x, wireStart.y);
      const snappedEnd = {
        x: snapToGrid(hoverPos.x),
        y: snapToGrid(hoverPos.y),
      };
      // Orthogonal corner
      const corner = worldToScreen(snappedEnd.x, wireStart.y);
      const p2 = worldToScreen(snappedEnd.x, snappedEnd.y);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(corner.x, corner.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Render Junctions
    ctx.fillStyle = '#10b981';
    activeSheet.junctions.forEach((junc) => {
      const sp = worldToScreen(junc.x, junc.y);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, Math.max(3, 0.8 * zoom), 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Render Symbols
    activeSheet.symbols.forEach((sym) => {
      const isSelected = selectedIds.includes(sym.id);
      const symScreen = worldToScreen(sym.x, sym.y);

      ctx.save();
      ctx.translate(symScreen.x, symScreen.y);
      ctx.rotate((sym.rotation * Math.PI) / 180);
      if (sym.mirrorX) ctx.scale(-1, 1);

      // Symbol Body & Graphics
      const symDef = BUILTIN_SYMBOLS.find((s) => s.id === sym.symbolDefId) || BUILTIN_SYMBOLS[0];

      ctx.strokeStyle = isSelected ? '#38bdf8' : '#e2e8f0';
      ctx.fillStyle = '#1a202c';
      ctx.lineWidth = Math.max(1.5, 0.35 * zoom);

      symDef.shapes.forEach((shape) => {
        if (shape.type === 'rectangle' && shape.width && shape.height) {
          const w = shape.width * zoom;
          const h = shape.height * zoom;
          ctx.beginPath();
          ctx.rect(-w / 2, -h / 2, w, h);
          ctx.stroke();
        } else if (shape.type === 'line' && shape.points && shape.points.length >= 2) {
          ctx.beginPath();
          const first = shape.points[0];
          ctx.moveTo(first.x * zoom, first.y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.stroke();
        } else if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
          ctx.beginPath();
          const first = shape.points[0];
          ctx.moveTo(first.x * zoom, first.y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.closePath();
          if (shape.filled) {
            ctx.fillStyle = isSelected ? '#38bdf8' : '#cbd5e1';
            ctx.fill();
          }
          ctx.stroke();
        } else if (shape.type === 'arc' && shape.x !== undefined && shape.y !== undefined && shape.radius) {
          ctx.beginPath();
          ctx.arc(
            shape.x * zoom,
            shape.y * zoom,
            shape.radius * zoom,
            shape.startAngle || 0,
            shape.endAngle || Math.PI * 2
          );
          ctx.stroke();
        }
      });

      // Render Symbol Pins
      ctx.strokeStyle = '#e05638'; // Red pin leads
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.max(9, 2.0 * zoom)}px 'JetBrains Mono', monospace`;

      sym.pins.forEach((pin) => {
        const px = pin.x * zoom;
        const py = pin.y * zoom;
        const rad = (pin.orientation * Math.PI) / 180;
        const len = (pin.length || 4) * zoom;
        const endX = px + Math.cos(rad) * len;
        const endY = py + Math.sin(rad) * len;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Pin connection dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pin Number & Name
        if (pin.visible && zoom > 2.5) {
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(pin.number, px + 2, py - 3);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(pin.name, px + (pin.orientation === 180 ? -25 : 8), py + 3);
        }
      });

      // Selection Halo Bounding Box
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(-25 * zoom * 0.5, -25 * zoom * 0.5, 25 * zoom, 25 * zoom);
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Reference & Value Text Labels
      ctx.fillStyle = '#38bdf8';
      ctx.font = `600 ${Math.max(10, 3.2 * zoom)}px Inter, sans-serif`;
      ctx.fillText(sym.reference, symScreen.x - 10, symScreen.y - 18 * (zoom / 4));

      ctx.fillStyle = '#a78bfa';
      ctx.font = `400 ${Math.max(9, 2.6 * zoom)}px Inter, sans-serif`;
      ctx.fillText(sym.value, symScreen.x - 10, symScreen.y + 22 * (zoom / 4));
    });

    // 6. Render Net Labels
    activeSheet.labels.forEach((lbl) => {
      const sp = worldToScreen(lbl.x, lbl.y);
      ctx.fillStyle = '#f59e0b';
      ctx.font = `600 ${Math.max(10, 2.8 * zoom)}px 'JetBrains Mono', monospace`;
      ctx.fillText(`[ ${lbl.text} ]`, sp.x + 4, sp.y - 4);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. Render Power Symbols
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
  }, [activeSheet, zoom, pan, selectedIds, activeTool, wireStart, hoverPos, gridStep, screenToWorld, worldToScreen]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const snapped = { x: snapToGrid(wp.x), y: snapToGrid(wp.y) };

    if (e.button === 1 || e.altKey) {
      // Middle Click Pan
      setIsDragging(true);
      setDragStart({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    if (activeTool === 'wire') {
      if (!wireStart) {
        setWireStart(snapped);
      } else {
        // Complete wire segment
        const newWire: SchematicWireSegment = {
          id: `w_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          x1: wireStart.x,
          y1: wireStart.y,
          x2: snapped.x,
          y2: snapped.y,
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

        setWireStart(snapped); // chain next wire
      }
    } else if (activeTool === 'junction') {
      const newJunc: SchematicJunction = {
        id: `junc_${Date.now()}`,
        x: snapped.x,
        y: snapped.y,
      };
      onUpdateProject((prev) => {
        const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
        return {
          ...prev,
          schematic: {
            ...prev.schematic,
            sheets: prev.schematic.sheets.map((s) =>
              s.id === sheet.id ? { ...s, junctions: [...s.junctions, newJunc] } : s
            ),
          },
        };
      }, 'Place Junction');
    } else if (activeTool === 'select') {
      // Check hit testing on symbols
      const hit = activeSheet.symbols.find((s) => Math.hypot(s.x - wp.x, s.y - wp.y) < 15);
      if (hit) {
        setSelectedIds([hit.id]);
        setIsDragging(true);
        setDragStart({ x: wp.x - hit.x, y: wp.y - hit.y });
        eventBus.emit('SELECT_SYMBOL', { symbolId: hit.id, reference: hit.reference });
      } else {
        setSelectedIds([]);
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
    setHoverPos(wp);

    if (isDragging) {
      if (e.buttons === 4 || e.altKey) {
        // Pan
        setPan({ x: sx - dragStart.x, y: sy - dragStart.y });
      } else if (selectedIds.length > 0) {
        // Move selected symbol
        const snappedX = snapToGrid(wp.x - dragStart.x);
        const snappedY = snapToGrid(wp.y - dragStart.y);

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
                        selectedIds.includes(sym.id) ? { ...sym, x: snappedX, y: snappedY } : sym
                      ),
                    }
                  : s
              ),
            },
          };
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(1.0, Math.min(20.0, zoom * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered on cursor
    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  // Keyboard Shortcuts (R = Rotate, Del = Delete, W = Wire, Esc = Cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
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
                      }
                    : s
                ),
              },
            };
          }, 'Delete Symbol');
          setSelectedIds([]);
        }
      } else if (e.key === 'w' || e.key === 'W') {
        setActiveTool('wire');
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setWireStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, onUpdateProject]);

  return (
    <div className="relative w-full h-full flex flex-col bg-cad-bg overflow-hidden">
      {/* Top Schematic Toolbar */}
      <div className="h-10 bg-cad-panel border-b border-cad-border px-3 flex items-center justify-between z-10 select-none">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              setActiveTool('select');
              setWireStart(null);
            }}
            title="Select / Move (Esc)"
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'select' ? 'bg-blue-600 text-white' : 'hover:bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <Move size={16} />
          </button>

          <button
            onClick={onOpenSymbolChooser}
            title="Add Symbol (A)"
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            Place Symbol
          </button>

          <button
            onClick={() => setActiveTool('wire')}
            title="Draw Wire (W)"
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'wire' ? 'bg-emerald-600 text-white' : 'hover:bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <Zap size={16} />
          </button>

          <button
            onClick={() => setActiveTool('junction')}
            title="Place Junction (J)"
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'junction' ? 'bg-emerald-600 text-white' : 'hover:bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <div className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-current rounded-full" />
            </div>
          </button>

          <div className="h-4 w-px bg-cad-border mx-1" />

          {/* Auto Annotate Button */}
          <button
            onClick={() => {
              onUpdateProject((prev) => {
                const sheet = prev.schematic.sheets.find((s) => s.id === prev.schematic.activeSheetId) || prev.schematic.sheets[0];
                const annotated = SchematicAnnotator.annotate(sheet);
                return {
                  ...prev,
                  schematic: {
                    ...prev.schematic,
                    sheets: prev.schematic.sheets.map((s) => (s.id === sheet.id ? annotated : s)),
                  },
                };
              }, 'Auto Annotate');
            }}
            title="Auto-Annotate Schematic (Renumber R1, C1, U1...)"
            className="px-2 py-1 bg-cad-subpanel hover:bg-cad-border text-slate-300 rounded text-xs flex items-center gap-1.5 border border-cad-border"
          >
            <Wand2 size={13} className="text-amber-400" />
            Annotate
          </button>
        </div>

        {/* View Controls & Cursor Readout */}
        <div className="flex items-center space-x-3 text-xs text-cad-textMuted font-mono">
          <span>X: {hoverPos.x.toFixed(2)} mm</span>
          <span>Y: {hoverPos.y.toFixed(2)} mm</span>
          <div className="h-4 w-px bg-cad-border" />
          <button onClick={() => setZoom((z) => Math.min(20, z * 1.2))} title="Zoom In" className="p-1 hover:text-white">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => setZoom((z) => Math.max(1, z * 0.8))} title="Zoom Out" className="p-1 hover:text-white">
            <ZoomOut size={14} />
          </button>
          <button onClick={() => { setPan({ x: 300, y: 200 }); setZoom(4.0); }} title="Reset View" className="p-1 hover:text-white">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="flex-1 w-full h-full cursor-crosshair"
      />
    </div>
  );
};
