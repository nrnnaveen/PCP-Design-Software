/**
 * FloZ ECA - Scalable Vector Component Preview Canvas
 * High-resolution vector preview renderer for schematic symbols and PCB footprints.
 * Supports multi-unit symbols (e.g. 4010, 4539, 7400, LM358) with single-unit and grid views.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SymbolDefinition, FootprintDefinition, SymbolUnitDefinition, SchematicPin, SymbolGraphicShape } from '../core/types';
import { ZoomIn, ZoomOut, Maximize2, Grid, Layers } from 'lucide-react';
import { AppThemeId, getCanvasColors } from '../theme/themeManager';

interface Props {
  symbol?: SymbolDefinition;
  footprint?: FootprintDefinition;
  activeUnitIndex?: number | 'all';
  onSelectUnitIndex?: (index: number | 'all') => void;
  theme?: AppThemeId;
  className?: string;
}

export const ComponentPreviewCanvas: React.FC<Props> = ({
  symbol,
  footprint,
  activeUnitIndex: controlledUnitIndex,
  onSelectUnitIndex,
  theme = 'dark',
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(6.0); // scale factor
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [internalUnitIndex, setInternalUnitIndex] = useState<number | 'all'>(0);

  const activeUnit = controlledUnitIndex !== undefined ? controlledUnitIndex : internalUnitIndex;

  const handleUnitChange = (u: number | 'all') => {
    setInternalUnitIndex(u);
    onSelectUnitIndex?.(u);
    setPan({ x: 0, y: 0 });
    setZoom(u === 'all' ? 2.8 : (symbol ? 4.5 : 8.0));
  };

  const hasMultipleUnits = Boolean(symbol?.units && symbol.units.length > 1);

  // Auto-fit to center when component changes
  useEffect(() => {
    setInternalUnitIndex(0);
    setZoom(symbol ? (hasMultipleUnits ? 4.5 : 4.5) : 8.0);
    setPan({ x: 0, y: 0 });
  }, [symbol?.id, footprint?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 400;
    const height = canvas.parentElement?.clientHeight || 300;
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;

    const colors = getCanvasColors(theme);
    const isLight = colors.isLight;

    // 1. CAD Background
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    // 2. Dot Grid
    if (showGrid) {
      ctx.fillStyle = colors.gridColor;
      const gridSpacing = 2.54 * zoom;
      const startX = (centerX % gridSpacing) - gridSpacing;
      const startY = (centerY % gridSpacing) - gridSpacing;

      for (let x = startX; x < width + gridSpacing; x += gridSpacing) {
        for (let y = startY; y < height + gridSpacing; y += gridSpacing) {
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }
    }

    ctx.save();
    ctx.translate(centerX, centerY);

    // Helper to render a specific symbol unit's shapes and pins
    const renderUnitShapesAndPins = (
      shapes: SymbolGraphicShape[],
      pins: SchematicPin[],
      offsetX = 0,
      offsetY = 0,
      unitLabel?: string
    ) => {
      ctx.save();
      ctx.translate(offsetX * zoom, offsetY * zoom);

      // Unit background card if rendering in grid mode
      if (unitLabel) {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
        ctx.strokeRect(-18 * zoom, -14 * zoom, 36 * zoom, 28 * zoom);
        ctx.fillRect(-18 * zoom, -14 * zoom, 36 * zoom, 28 * zoom);

        // Unit Title
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.max(10, 2.4 * zoom)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(unitLabel, 0, -15 * zoom);
      }

      // Shapes
      ctx.strokeStyle = isLight ? '#1e293b' : '#e2e8f0';
      ctx.fillStyle = isLight ? '#f1f5f9' : '#1e293b';
      ctx.lineWidth = Math.max(1.5, 0.3 * zoom);

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
        } else if (shape.type === 'circle' && shape.radius) {
          ctx.beginPath();
          ctx.arc((shape.x || 0) * zoom, (shape.y || 0) * zoom, shape.radius * zoom, 0, Math.PI * 2);
          if (shape.filled) ctx.fill();
          ctx.stroke();
        } else if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.closePath();
          if (shape.filled) {
            ctx.fillStyle = isLight ? '#cbd5e1' : '#94a3b8';
            ctx.fill();
          }
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

      // Pins
      ctx.strokeStyle = isLight ? '#dc2626' : '#e05638';
      ctx.lineWidth = Math.max(1.5, 0.25 * zoom);

      pins.forEach((pin) => {
        const px = pin.x * zoom;
        const py = pin.y * zoom;
        const pinOrient = pin.orientation || 0;
        const rad = (pinOrient * Math.PI) / 180;
        const len = (pin.length !== undefined ? pin.length : 2.54) * zoom;
        const endX = px + Math.cos(rad) * len;
        const endY = py + Math.sin(rad) * len;

        // Pin lead
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Pin Inversion Bubble if applicable
        if (pin.graphicStyle === 'inverted' || pin.graphicStyle === 'inverted_clock') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px + Math.cos(rad) * 1.2 * zoom, py + Math.sin(rad) * 1.2 * zoom, 1.0 * zoom, 0, Math.PI * 2);
          ctx.fillStyle = isLight ? '#f8fafc' : '#111418';
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

        // Pin red connection dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pin Number and Name
        ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
        ctx.font = `${Math.max(9, 2.0 * zoom)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'left';
        if (pinOrient === 180) {
          ctx.fillText(pin.number, endX + 3, endY - 3);
          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.fillText(pin.name, px + 5, py + 3);
        } else if (pinOrient === 0) {
          ctx.fillText(pin.number, endX - 14, endY - 3);
          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.fillText(pin.name, px - 24, py + 3);
        } else if (pinOrient === 270) {
          ctx.fillText(pin.number, endX + 3, endY + 10);
          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.fillText(pin.name, px + 4, py + 12);
        } else {
          ctx.fillText(pin.number, endX + 3, endY - 5);
          ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
          ctx.fillText(pin.name, px + 4, py - 4);
        }
      });

      // Origin crosshair
      ctx.strokeStyle = isLight ? '#0284c7' : '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 5);
      ctx.stroke();

      ctx.restore();
    };

    // ==========================================
    // Render Schematic Symbol
    // ==========================================
    if (symbol) {
      if (hasMultipleUnits && symbol.units) {
        if (activeUnit === 'all') {
          // Render All Units in a clean grid
          const units = symbol.units;
          const cols = units.length <= 4 ? units.length : Math.ceil(Math.sqrt(units.length));
          const rows = Math.ceil(units.length / cols);
          const spacingX = 42;
          const spacingY = 38;

          units.forEach((u, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const ox = (col - (cols - 1) / 2) * spacingX;
            const oy = (row - (rows - 1) / 2) * spacingY;
            const label = `Unit ${u.name || u.unit} (${u.pins.length} pins)`;

            renderUnitShapesAndPins(u.shapes, u.pins, ox, oy, label);
          });
        } else {
          // Render Single Selected Unit
          const uIdx = typeof activeUnit === 'number' ? activeUnit : 0;
          const targetUnit = symbol.units[uIdx] || symbol.units[0];
          renderUnitShapesAndPins(targetUnit.shapes, targetUnit.pins, 0, 0);

          // Top label for single unit view
          ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            `Unit ${targetUnit.name || targetUnit.unit} — ${targetUnit.pins.length} Pins (${targetUnit.pins.map((p) => p.name).join(', ') || 'None'})`,
            0,
            -18 * (zoom / 4.5)
          );
        }
      } else {
        // Single Unit Symbol
        renderUnitShapesAndPins(symbol.shapes, symbol.pins, 0, 0);
      }
    }

    // ==========================================
    // Render PCB Footprint
    // ==========================================
    if (footprint) {
      // Courtyard Bounds
      if (footprint.courtyard) {
        ctx.strokeStyle = isLight ? '#64748b' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        const cw = (footprint.courtyard.maxX - footprint.courtyard.minX) * zoom;
        const ch = (footprint.courtyard.maxY - footprint.courtyard.minY) * zoom;
        ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
        ctx.setLineDash([]);
      }

      // Silkscreen Graphics
      ctx.strokeStyle = isLight ? '#0f172a' : '#f8fafc';
      ctx.lineWidth = Math.max(1, 0.15 * zoom);

      footprint.shapes.forEach((shape) => {
        if (shape.type === 'rect' && shape.width && shape.height) {
          ctx.strokeRect(
            ((shape.x || 0) - shape.width / 2) * zoom,
            ((shape.y || 0) - shape.height / 2) * zoom,
            shape.width * zoom,
            shape.height * zoom
          );
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
          ctx.arc(
            (shape.x || 0) * zoom,
            (shape.y || 0) * zoom,
            shape.radius * zoom,
            shape.startAngle || 0,
            shape.endAngle || Math.PI
          );
          ctx.stroke();
        } else if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (shape.type === 'text' && shape.text) {
          ctx.save();
          ctx.font = `${Math.max(7, (shape.fontSize || 1.0) * 1.5 * zoom)}px "Inter", sans-serif`;
          ctx.fillStyle = isLight ? '#475569' : '#cbd5e1';
          ctx.fillText(shape.text, (shape.x || 0) * zoom, (shape.y || 0) * zoom);
          ctx.restore();
        }
      });

      // Copper Pads
      footprint.pads.forEach((pad) => {
        const px = pad.x * zoom;
        const py = pad.y * zoom;
        const pw = pad.width * zoom;
        const ph = pad.height * zoom;

        ctx.fillStyle = pad.type === 'through_hole' ? '#22c55e' : '#e05638';

        if (pad.shape === 'roundrect' || pad.shape === 'rect') {
          ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
        } else {
          ctx.beginPath();
          ctx.arc(px, py, pw / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Drill hole for through-hole pads
        if (pad.type === 'through_hole' && pad.drillDiameter) {
          ctx.fillStyle = isLight ? '#f8fafc' : '#111418';
          ctx.beginPath();
          ctx.arc(px, py, (pad.drillDiameter / 2) * zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pad Number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pad.number, px, py);
      });

      // Center Origin
      ctx.strokeStyle = isLight ? '#0284c7' : '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
    }

    ctx.restore();
  }, [symbol, footprint, zoom, pan, showGrid, activeUnit, hasMultipleUnits, theme]);

  return (
    <div className={`relative w-full h-full bg-cad-bg rounded-lg overflow-hidden border border-cad-border flex flex-col ${className || ''}`}>
      {/* Unit Selector Toolbar for Multi-Unit Symbols */}
      {hasMultipleUnits && symbol?.units && (
        <div className="absolute top-2 left-2 flex items-center space-x-1 bg-cad-panel p-1 rounded-md border border-cad-border z-10 max-w-[calc(100%-140px)] overflow-x-auto shadow-sm">
          <span className="text-[10px] font-mono text-cad-textMuted px-1.5 flex items-center gap-1">
            <Layers size={11} className="text-blue-600 dark:text-blue-400" />
            Unit:
          </span>

          {symbol.units.map((u, idx) => (
            <button
              key={u.unit}
              onClick={() => handleUnitChange(idx)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors whitespace-nowrap ${
                activeUnit === idx
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-cad-subpanel text-cad-text hover:bg-cad-surfaceHover hover:text-cad-textHeading'
              }`}
            >
              Unit {u.name || u.unit}
            </button>
          ))}

          <button
            onClick={() => handleUnitChange('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors whitespace-nowrap ${
              activeUnit === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-cad-subpanel text-emerald-600 dark:text-emerald-400 hover:bg-cad-surfaceHover'
            }`}
          >
            All Units (Grid)
          </button>
        </div>
      )}

      {/* Viewport Controls */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 bg-cad-panel p-1 rounded-md border border-cad-border z-10 shadow-sm">
        <button
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
          className={`p-1 rounded text-xs transition-colors ${showGrid ? 'text-blue-600 dark:text-blue-400 bg-cad-subpanel' : 'text-cad-text hover:bg-cad-surfaceHover'}`}
        >
          <Grid size={13} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(30, z * 1.2))}
          title="Zoom In"
          className="p-1 hover:bg-cad-surfaceHover rounded text-cad-text transition-colors"
        >
          <ZoomIn size={13} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z * 0.8))}
          title="Zoom Out"
          className="p-1 hover:bg-cad-surfaceHover rounded text-cad-text transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(activeUnit === 'all' ? 2.8 : (symbol ? 4.5 : 8.0));
          }}
          title="Fit to Center"
          className="p-1 hover:bg-cad-surfaceHover rounded text-cad-text transition-colors"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (isDragging) {
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onWheel={(e) => {
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.15 : 0.85;
          setZoom((z) => Math.max(0.5, Math.min(40.0, z * factor)));
        }}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};

