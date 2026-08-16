/**
 * FloZ ECA - Scalable Vector Component Preview Canvas
 * High-resolution vector preview renderer for schematic symbols and PCB footprints.
 */

import React, { useRef, useEffect, useState } from 'react';
import { SymbolDefinition, FootprintDefinition } from '../core/types';
import { ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react';

interface Props {
  symbol?: SymbolDefinition;
  footprint?: FootprintDefinition;
  className?: string;
}

export const ComponentPreviewCanvas: React.FC<Props> = ({ symbol, footprint, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(6.0); // scale factor
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-fit to center when component changes
  useEffect(() => {
    setZoom(symbol ? 4.5 : 8.0);
    setPan({ x: 0, y: 0 });
  }, [symbol, footprint]);

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

    // 1. Dark Background
    ctx.fillStyle = '#111418';
    ctx.fillRect(0, 0, width, height);

    // 2. Dot Grid
    if (showGrid) {
      ctx.fillStyle = '#232934';
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

    // ==========================================
    // Render Schematic Symbol
    // ==========================================
    if (symbol) {
      // Shapes
      ctx.strokeStyle = '#e2e8f0';
      ctx.fillStyle = '#1e293b';
      ctx.lineWidth = Math.max(1.5, 0.3 * zoom);

      symbol.shapes.forEach((shape) => {
        if (shape.type === 'rectangle' && shape.width && shape.height) {
          const w = shape.width * zoom;
          const h = shape.height * zoom;
          ctx.beginPath();
          ctx.rect(-w / 2, -h / 2, w, h);
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
          ctx.stroke();
        } else if (shape.type === 'polygon' && shape.points && shape.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x * zoom, shape.points[0].y * zoom);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x * zoom, shape.points[i].y * zoom);
          }
          ctx.closePath();
          if (shape.filled) {
            ctx.fillStyle = '#94a3b8';
            ctx.fill();
          }
          ctx.stroke();
        }
      });

      // Pins
      ctx.strokeStyle = '#e05638';
      ctx.lineWidth = Math.max(1.5, 0.25 * zoom);

      symbol.pins.forEach((pin) => {
        const px = pin.x * zoom;
        const py = pin.y * zoom;
        const rad = (pin.orientation * Math.PI) / 180;
        const len = (pin.length || 3.81) * zoom;
        const endX = px + Math.cos(rad) * len;
        const endY = py + Math.sin(rad) * len;

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Pin red connection dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pin Number and Name
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(pin.number, px + 2, py - 3);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(pin.name, px + (pin.orientation === 180 ? -22 : 6), py + 3);
      });

      // Center Origin Crosshair
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();
    }

    // ==========================================
    // Render PCB Footprint
    // ==========================================
    if (footprint) {
      // Courtyard Bounds
      if (footprint.courtyard) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        const cw = (footprint.courtyard.maxX - footprint.courtyard.minX) * zoom;
        const ch = (footprint.courtyard.maxY - footprint.courtyard.minY) * zoom;
        ctx.strokeRect((-cw / 2), (-ch / 2), cw, ch);
        ctx.setLineDash([]);
      }

      // Silkscreen Graphics
      ctx.strokeStyle = '#f8fafc';
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
          ctx.fillStyle = '#111418';
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
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
    }

    ctx.restore();
  }, [symbol, footprint, zoom, pan, showGrid]);

  return (
    <div className={`relative w-full h-full bg-[#111418] rounded-lg overflow-hidden border border-cad-border flex flex-col ${className || ''}`}>
      {/* Control overlay */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 bg-cad-panel/80 backdrop-blur-sm p-1 rounded-md border border-cad-border z-10">
        <button
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
          className={`p-1 rounded text-xs ${showGrid ? 'text-blue-400 bg-cad-subpanel' : 'text-cad-textMuted'}`}
        >
          <Grid size={13} />
        </button>
        <button onClick={() => setZoom((z) => Math.min(30, z * 1.2))} title="Zoom In" className="p-1 hover:text-white text-cad-textMuted">
          <ZoomIn size={13} />
        </button>
        <button onClick={() => setZoom((z) => Math.max(1, z * 0.8))} title="Zoom Out" className="p-1 hover:text-white text-cad-textMuted">
          <ZoomOut size={13} />
        </button>
        <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(symbol ? 4.5 : 8.0); }} title="Fit to Center" className="p-1 hover:text-white text-cad-textMuted">
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
          setZoom((z) => Math.max(1.0, Math.min(40.0, z * factor)));
        }}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
