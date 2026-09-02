/**
 * Apex EDA - Standalone Multi-Layer Gerber & Drill Viewer
 * Renders parsed RS-274X Gerber vectors and Excellon drill files with transparency blending and inspection tools.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ApexProject } from '../core/types';
import { GerberGenerator } from '../manufacturing/gerberGenerator';
import { ExcellonDrillGenerator } from '../manufacturing/excellonDrill';
import { GerberParser, ParsedGerberLayer } from './gerberParser';
import { Layers, Eye, EyeOff, ZoomIn, ZoomOut, Maximize2, FileCode, Check } from 'lucide-react';

interface Props {
  project: ApexProject;
}

export const GerberViewer: React.FC<Props> = ({ project }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zoom, setZoom] = useState<number>(6.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 300, y: 250 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [layers, setLayers] = useState<ParsedGerberLayer[]>([]);

  // Generate and parse project Gerber layers on mount/update
  useEffect(() => {
    // 1. F.Cu
    const fcuRaw = GerberGenerator.generateLayer(project, 'F.Cu');
    const fcuParsed = GerberParser.parseGerber(fcuRaw, 'F.Cu (Top Copper)', '#e05638');

    // 2. B.Cu
    const bcuRaw = GerberGenerator.generateLayer(project, 'B.Cu');
    const bcuParsed = GerberParser.parseGerber(bcuRaw, 'B.Cu (Bottom Copper)', '#3b82f6');

    // 3. F.Silkscreen
    const silkRaw = GerberGenerator.generateLayer(project, 'F.Silkscreen');
    const silkParsed = GerberParser.parseGerber(silkRaw, 'F.Silkscreen (Top Silk)', '#f8fafc');

    // 4. Edge.Cuts
    const edgeRaw = GerberGenerator.generateLayer(project, 'Edge.Cuts');
    const edgeParsed = GerberParser.parseGerber(edgeRaw, 'Edge.Cuts (Board Outline)', '#eab308');

    // 5. Excellon Drill
    const drlRaw = ExcellonDrillGenerator.generate(project);
    const drlParsed = GerberParser.parseExcellon(drlRaw, 'Excellon Drill Hits', '#ffffff');

    setLayers([edgeParsed, fcuParsed, bcuParsed, silkParsed, drlParsed]);
  }, [project]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - pan.x) / zoom,
      y: (sy - pan.y) / zoom,
    }),
    [pan, zoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number) => ({
      x: wx * zoom + pan.x,
      y: wy * zoom + pan.y,
    }),
    [pan, zoom]
  );

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    // Dark Background
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(0, 0, width, height);

    // Render Each Parsed Layer
    layers.forEach((layer) => {
      if (!layer.visible) return;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.fillStyle = layer.color;
      ctx.strokeStyle = layer.color;

      layer.primitives.forEach((prim) => {
        if (prim.type === 'line' && prim.x2 !== undefined && prim.y2 !== undefined) {
          const p1 = worldToScreen(prim.x1, prim.y1);
          const p2 = worldToScreen(prim.x2, prim.y2);
          ctx.lineWidth = Math.max(1, (prim.strokeWidth || 0.2) * zoom);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        } else if (prim.type === 'circle' && prim.radius) {
          const sp = worldToScreen(prim.x1, prim.y1);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, prim.radius * zoom, 0, Math.PI * 2);
          ctx.fill();
        } else if (prim.type === 'rect' && prim.width && prim.height) {
          const sp = worldToScreen(prim.x1, prim.y1);
          const w = prim.width * zoom;
          const h = prim.height * zoom;
          ctx.fillRect(sp.x - w / 2, sp.y - h / 2, w, h);
        }
      });

      ctx.restore();
    });
  }, [layers, zoom, pan, worldToScreen]);

  return (
    <div className="relative w-full h-full flex flex-row bg-cad-bg select-none overflow-hidden font-sans">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Control Bar */}
        <div className="h-8 bg-cad-panel border-b border-cad-border px-2.5 flex items-center justify-between z-10 text-xs">
          <div className="flex items-center space-x-2">
            <FileCode size={14} className="text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold text-cad-textHeading">Gerber RS-274X & Excellon Drill Viewer</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-cad-text font-mono">
            <span>X: {hoverPos.x.toFixed(2)} mm</span>
            <span>Y: {hoverPos.y.toFixed(2)} mm</span>
            <div className="h-3.5 w-px bg-cad-border" />
            <button
              onClick={() => setZoom((z) => Math.min(30, z * 1.2))}
              title="Zoom In (+)"
              className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
            >
              <ZoomIn size={13} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(1.5, z * 0.8))}
              title="Zoom Out (-)"
              className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
            >
              <ZoomOut size={13} />
            </button>
            <button
              onClick={() => { setPan({ x: 300, y: 250 }); setZoom(6.0); }}
              title="Zoom to Fit Board"
              className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          }}
          onMouseMove={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            setHoverPos(screenToWorld(e.clientX - rect.left, e.clientY - rect.top));

            if (isDragging) {
              setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.85;
            setZoom((z) => Math.max(1.5, Math.min(30, z * factor)));
          }}
          className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
        />
      </div>

      {/* Right: Layer Manager Panel */}
      <aside className="w-64 bg-cad-panel border-l border-cad-border flex flex-col shrink-0">
        <div className="h-8 px-2.5 bg-cad-header border-b border-cad-border flex items-center justify-between">
          <span className="text-[11px] font-semibold text-cad-textHeading uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Layers size={13} className="text-blue-600 dark:text-blue-400" />
            Fabrication Layers
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {layers.map((layer, index) => (
            <div
              key={layer.layerName}
              className={`p-1.5 bg-cad-subpanel border rounded-xs flex items-center justify-between transition-colors duration-fast ${
                layer.visible ? 'border-cad-border' : 'border-cad-border opacity-60'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-xs border border-cad-border shrink-0 shadow-xs"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-xs font-medium text-cad-textHeading truncate">{layer.layerName}</span>
              </div>

              <button
                onClick={() =>
                  setLayers((prev) =>
                    prev.map((l, i) => (i === index ? { ...l, visible: !l.visible } : l))
                  )
                }
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                className="p-0.5 hover:bg-cad-surfaceHover rounded-xs text-cad-text hover:text-cad-textHeading transition-colors duration-fast"
              >
                {layer.visible ? <Eye size={13} className="text-blue-600 dark:text-blue-400" /> : <EyeOff size={13} className="text-cad-textMuted" />}
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};
