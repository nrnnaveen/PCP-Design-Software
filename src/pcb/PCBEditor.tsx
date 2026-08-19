/**
 * Apex EDA - Interactive PCB Layout Editor
 * High-performance 2D Canvas layout engine with 45-degree routing, ratsnest, vias, and layer controls.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ApexProject,
  Point2D,
  PCBLayerId,
  PCBTrackSegment,
  PCBVia,
  PCBFootprintInstance,
} from '../core/types';
import { RatsnestGenerator, RatsnestLine } from './ratsnest';
import { InteractiveRouter, RouteSegment } from '../router/router';
import { eventBus } from '../core/eventBus';
import {
  Move,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Route as RouteIcon,
  CircleDot,
  Layers,
  Ruler,
  Eye,
  EyeOff,
  Square,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  onRunDRC: () => void;
  theme?: 'dark' | 'light';
}

type PCBTool = 'select' | 'route' | 'via' | 'zone' | 'measure';

export const PCBEditor: React.FC<Props> = ({ project, onUpdateProject, onRunDRC, theme = 'dark' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Transform
  const [zoom, setZoom] = useState<number>(6.0); // 6 px per mm
  const [pan, setPan] = useState<Point2D>({ x: 300, y: 250 });
  const [activeTool, setActiveTool] = useState<PCBTool>('select');
  const [activeLayer, setActiveLayer] = useState<PCBLayerId>('F.Cu');

  // Layer Visibility Toggles
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    'F.Cu': true,
    'B.Cu': true,
    'F.Silkscreen': true,
    'B.Silkscreen': true,
    'Edge.Cuts': true,
    Ratsnest: true,
  });

  // Interactive Routing & Selection States
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });

  const [routeStart, setRouteStart] = useState<Point2D | null>(null);
  const [routeStartPad, setRouteStartPad] = useState<{ footprint: PCBFootprintInstance; pad: any; worldPos: Point2D; netName: string } | null>(null);
  const [hoverPad, setHoverPad] = useState<{ footprint: PCBFootprintInstance; pad: any; worldPos: Point2D; netName: string } | null>(null);
  const [routeNetName, setRouteNetName] = useState<string>('Default');
  const [routeError, setRouteError] = useState<{ message: string; x: number; y: number } | null>(null);
  const [hoverPos, setHoverPos] = useState<Point2D>({ x: 0, y: 0 });

  // Measurement tool state
  const [measureStart, setMeasureStart] = useState<Point2D | null>(null);

  const pcb = project.pcb;
  const gridStep = project.settings.gridSpacingPCB || 0.5; // 0.5mm grid

  // Grid Snapping
  const snapToGrid = (val: number, step = gridStep): number => {
    return Math.round(val / step) * step;
  };

  const screenToWorld = useCallback(
    (sx: number, sy: number): Point2D => ({
      x: (sx - pan.x) / zoom,
      y: (sy - pan.y) / zoom,
    }),
    [pan, zoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number): Point2D => ({
      x: wx * zoom + pan.x,
      y: wy * zoom + pan.y,
    }),
    [pan, zoom]
  );

  // Compute live ratsnest lines
  const ratsnestLines = RatsnestGenerator.generate(pcb);

  // Main Canvas 2D PCB Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    const isLight = theme === 'light' || document.documentElement.getAttribute('data-theme') === 'light';

    // 1. CAD Background & Dot Grid
    ctx.fillStyle = isLight ? '#f8fafc' : '#111418';
    ctx.fillRect(0, 0, width, height);

    const startWorld = screenToWorld(0, 0);
    const endWorld = screenToWorld(width, height);
    const minGridX = Math.floor(startWorld.x / gridStep) * gridStep;
    const maxGridX = Math.ceil(endWorld.x / gridStep) * gridStep;
    const minGridY = Math.floor(startWorld.y / gridStep) * gridStep;
    const maxGridY = Math.ceil(endWorld.y / gridStep) * gridStep;

    ctx.fillStyle = isLight ? '#cbd5e1' : '#232934';
    for (let gx = minGridX; gx <= maxGridX; gx += gridStep) {
      for (let gy = minGridY; gy <= maxGridY; gy += gridStep) {
        const sp = worldToScreen(gx, gy);
        ctx.fillRect(sp.x - 0.5, sp.y - 0.5, 1, 1);
      }
    }

    // 2. Render Board Outline (Edge.Cuts)
    if (layerVisibility['Edge.Cuts'] && pcb.boardOutline.length >= 3) {
      ctx.strokeStyle = '#eab308'; // Edge.Cuts Yellow
      ctx.lineWidth = Math.max(1.5, 0.2 * zoom);
      ctx.beginPath();
      const first = worldToScreen(pcb.boardOutline[0].x, pcb.boardOutline[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < pcb.boardOutline.length; i++) {
        const pt = worldToScreen(pcb.boardOutline[i].x, pcb.boardOutline[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.stroke();

      // Mounting Holes
      pcb.graphics.forEach((g) => {
        if (g.layer === 'Edge.Cuts' && g.type === 'circle' && g.x !== undefined && g.y !== undefined && g.radius) {
          const sp = worldToScreen(g.x, g.y);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, g.radius * zoom, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // 3. Render Copper Zones (Ground Pours)
    pcb.zones.forEach((zone) => {
      if (zone.isFilled && zone.points.length >= 3 && layerVisibility[zone.layer]) {
        ctx.fillStyle = zone.layer === 'F.Cu' ? 'rgba(224, 86, 56, 0.25)' : 'rgba(59, 130, 246, 0.25)';
        ctx.beginPath();
        const p0 = worldToScreen(zone.points[0].x, zone.points[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < zone.points.length; i++) {
          const pt = worldToScreen(zone.points[i].x, zone.points[i].y);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = zone.layer === 'F.Cu' ? '#e05638' : '#3b82f6';
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // 4. Render Ratsnest Airwires
    if (layerVisibility['Ratsnest']) {
      ctx.strokeStyle = '#38bdf8'; // Cyan airwires
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      ratsnestLines.forEach((rat) => {
        const p1 = worldToScreen(rat.x1, rat.y1);
        const p2 = worldToScreen(rat.x2, rat.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // 5. Render Bottom Copper Tracks (B.Cu)
    if (layerVisibility['B.Cu']) {
      ctx.strokeStyle = '#3b82f6'; // Blue B.Cu
      ctx.lineCap = 'round';
      pcb.tracks.forEach((track) => {
        if (track.layer === 'B.Cu') {
          ctx.lineWidth = Math.max(2, track.width * zoom);
          const p1 = worldToScreen(track.x1, track.y1);
          const p2 = worldToScreen(track.x2, track.y2);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    }

    // 6. Render Top Copper Tracks (F.Cu)
    if (layerVisibility['F.Cu']) {
      ctx.strokeStyle = '#e05638'; // Red/Orange F.Cu
      ctx.lineCap = 'round';
      pcb.tracks.forEach((track) => {
        if (track.layer === 'F.Cu') {
          ctx.lineWidth = Math.max(2, track.width * zoom);
          const p1 = worldToScreen(track.x1, track.y1);
          const p2 = worldToScreen(track.x2, track.y2);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    }

    // 7. Render Vias
    pcb.vias.forEach((via) => {
      const sp = worldToScreen(via.x, via.y);
      const outerR = (via.diameter / 2) * zoom;
      const drillR = (via.drillDiameter / 2) * zoom;

      // Annular copper ring
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Drill hole
      ctx.fillStyle = isLight ? '#f8fafc' : '#111418';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, drillR, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Render Footprints & Pads
    pcb.footprints.forEach((fp) => {
      const isSelected = selectedFootprintId === fp.id;
      const rad = (fp.rotation * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);

      // Render Pads
      fp.pads.forEach((pad) => {
        const rx = pad.x * cosR - pad.y * sinR;
        const ry = pad.x * sinR + pad.y * cosR;
        const padCenter = worldToScreen(fp.x + rx, fp.y + ry);

        const padW = pad.width * zoom;
        const padH = pad.height * zoom;

        ctx.save();
        ctx.translate(padCenter.x, padCenter.y);
        ctx.rotate(rad);

        // Copper Pad Fill
        ctx.fillStyle = pad.type === 'through_hole' ? '#22c55e' : fp.layer === 'F.Cu' ? '#e05638' : '#3b82f6';
        if (pad.shape === 'roundrect' || pad.shape === 'rect') {
          ctx.fillRect(-padW / 2, -padH / 2, padW, padH);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, padW / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Drill hole for through-hole pads
        if (pad.type === 'through_hole' && pad.drillDiameter) {
          ctx.fillStyle = isLight ? '#f8fafc' : '#111418';
          ctx.beginPath();
          ctx.arc(0, 0, (pad.drillDiameter / 2) * zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Pad Number Text
        if (zoom > 3.5) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `600 ${Math.max(8, 1.8 * zoom)}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(pad.number, 0, 0);
        }

        ctx.restore();
      });

      // Silkscreen Outlines
      if (layerVisibility['F.Silkscreen']) {
        ctx.strokeStyle = isLight ? '#0f172a' : '#f8fafc';
        ctx.lineWidth = Math.max(1, 0.15 * zoom);
        fp.shapes.forEach((shape) => {
          if (shape.layer === 'F.Silkscreen' && shape.type === 'rect' && shape.width && shape.height) {
            const sp = worldToScreen(fp.x, fp.y);
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(rad);
            ctx.strokeRect((-shape.width / 2) * zoom, (-shape.height / 2) * zoom, shape.width * zoom, shape.height * zoom);
            ctx.restore();
          }
        });
      }

      // Selection Halo
      if (isSelected) {
        const sp = worldToScreen(fp.x, fp.y);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        const cw = (fp.courtyard.maxX - fp.courtyard.minX) * zoom;
        const ch = (fp.courtyard.maxY - fp.courtyard.minY) * zoom;
        ctx.strokeRect(sp.x - cw / 2, sp.y - ch / 2, cw, ch);
        ctx.setLineDash([]);
      }

      // Reference Label
      const sp = worldToScreen(fp.x, fp.y);
      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      ctx.font = `600 ${Math.max(9, 2.2 * zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fp.reference, sp.x, sp.y - 12 * (zoom / 6));
    });

    // 9. Interactive Route in Progress (45-degree octilinear preview with short-circuit prevention)
    if (routeStart && activeTool === 'route') {
      const targetPos = hoverPad ? hoverPad.worldPos : { x: snapToGrid(hoverPos.x), y: snapToGrid(hoverPos.y) };
      const segments = InteractiveRouter.compute45DegreePath(routeStart, targetPos);

      const isShortCircuit = hoverPad && hoverPad.netName !== routeNetName && routeNetName !== 'Default' && hoverPad.netName !== 'Default';
      const isValidTarget = hoverPad && hoverPad.netName === routeNetName;

      ctx.strokeStyle = isShortCircuit
        ? '#ef4444' // Red for Short Circuit / Invalid Net
        : isValidTarget
        ? '#22c55e' // Green for Valid Same-Net Pad
        : activeLayer === 'F.Cu'
        ? '#f97316' // Standard Orange for F.Cu
        : '#60a5fa'; // Standard Blue for B.Cu

      ctx.lineWidth = Math.max(2.5, 0.4 * zoom);
      ctx.setLineDash(isShortCircuit ? [4, 4] : [3, 3]);

      segments.forEach((seg) => {
        const p1 = worldToScreen(seg.x1, seg.y1);
        const p2 = worldToScreen(seg.x2, seg.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Target Pad Lock & Clearance Halo
      if (hoverPad) {
        const hp = worldToScreen(hoverPad.worldPos.x, hoverPad.worldPos.y);
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 8 * (zoom / 6), 0, Math.PI * 2);
        ctx.strokeStyle = isShortCircuit ? '#ef4444' : '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Canvas Tooltip Badge
        if (isShortCircuit) {
          const tooltip = `❌ Short: Cannot connect "${routeNetName}" to "${hoverPad.netName}"`;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.font = `bold ${Math.max(10, 1.8 * zoom)}px 'JetBrains Mono', monospace`;
          const textW = ctx.measureText(tooltip).width;
          ctx.fillRect(hp.x - textW / 2 - 6, hp.y - 24, textW + 12, 18);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(tooltip, hp.x, hp.y - 11);
        } else if (isValidTarget) {
          const tooltip = `✓ Connect Net "${routeNetName}"`;
          ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
          ctx.font = `bold ${Math.max(10, 1.8 * zoom)}px 'JetBrains Mono', monospace`;
          const textW = ctx.measureText(tooltip).width;
          ctx.fillRect(hp.x - textW / 2 - 6, hp.y - 24, textW + 12, 18);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(tooltip, hp.x, hp.y - 11);
        }
      }
    }

    // 10. Measurement Tool Ruler Overlay
    if (measureStart && activeTool === 'measure') {
      const p1 = worldToScreen(measureStart.x, measureStart.y);
      const p2 = worldToScreen(hoverPos.x, hoverPos.y);
      const dist = Math.hypot(hoverPos.x - measureStart.x, hoverPos.y - measureStart.y);

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.font = `bold 12px 'JetBrains Mono', monospace`;
      ctx.fillText(
        `${dist.toFixed(2)} mm (${(dist / 0.0254).toFixed(1)} mil)`,
        (p1.x + p2.x) / 2 + 10,
        (p1.y + p2.y) / 2 - 10
      );
    }
  }, [pcb, zoom, pan, activeTool, activeLayer, layerVisibility, selectedFootprintId, routeStart, hoverPos, measureStart, gridStep, screenToWorld, worldToScreen, ratsnestLines, theme]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const snapped = { x: snapToGrid(wp.x), y: snapToGrid(wp.y) };

    if (e.button === 1 || e.altKey) {
      setIsDragging(true);
      setDragOffset({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    if (activeTool === 'select') {
      // Find clicked footprint
      const hitFp = pcb.footprints.find((fp) => Math.hypot(fp.x - wp.x, fp.y - wp.y) < 10);
      if (hitFp) {
        setSelectedFootprintId(hitFp.id);
        setIsDragging(true);
        setDragOffset({ x: wp.x - hitFp.x, y: wp.y - hitFp.y });
        eventBus.emit('SELECT_FOOTPRINT', { footprintId: hitFp.id, reference: hitFp.reference });
      } else {
        setSelectedFootprintId(null);
      }
    } else if (activeTool === 'route') {
      const hitPad = InteractiveRouter.findPadAtPosition(pcb, wp, activeLayer);

      if (!routeStart) {
        // Start Route from Pad or Grid
        if (hitPad) {
          setRouteStart(hitPad.worldPos);
          setRouteStartPad(hitPad);
          setRouteNetName(hitPad.netName);
        } else {
          setRouteStart(snapped);
          setRouteStartPad(null);
          setRouteNetName('Default');
        }
        setRouteError(null);
      } else {
        // Target endpoint
        const targetPos = hitPad ? hitPad.worldPos : snapped;

        // SHORT CIRCUIT DETECTION
        if (hitPad) {
          const validation = InteractiveRouter.validateConnection(routeNetName, hitPad.netName);
          if (!validation.valid) {
            setRouteError({
              message: `Short Circuit Blocked: Cannot connect Net "${routeNetName}" to Net "${hitPad.netName}". Route cancelled.`,
              x: hitPad.worldPos.x,
              y: hitPad.worldPos.y,
            });
            return; // REJECT ROUTE CREATION — PREVENTS SHORT CIRCUITS
          }
        }

        // Complete 45-degree track segments
        const segments = InteractiveRouter.compute45DegreePath(routeStart, targetPos);
        const newTracks: PCBTrackSegment[] = segments.map((seg, i) => ({
          id: `trk_${Date.now()}_${i}`,
          netId: `net_${routeNetName.toLowerCase()}`,
          netName: routeNetName,
          layer: activeLayer,
          x1: seg.x1,
          y1: seg.y1,
          x2: seg.x2,
          y2: seg.y2,
          width: project.designRules.defaultNetClass.trackWidth,
        }));

        onUpdateProject((prev) => ({
          ...prev,
          pcb: {
            ...prev.pcb,
            tracks: [...prev.pcb.tracks, ...newTracks],
          },
        }), 'Route Track');

        setRouteError(null);

        if (hitPad) {
          // Finished route to pad
          setRouteStart(null);
          setRouteStartPad(null);
        } else {
          // Chain route from current point
          setRouteStart(snapped);
        }
      }
    } else if (activeTool === 'via') {
      const newVia: PCBVia = {
        id: `via_${Date.now()}`,
        netId: 'net_gnd',
        netName: 'GND',
        x: snapped.x,
        y: snapped.y,
        diameter: project.designRules.defaultNetClass.viaDiameter,
        drillDiameter: project.designRules.defaultNetClass.viaDrill,
        startLayer: 'F.Cu',
        endLayer: 'B.Cu',
        type: 'through',
      };

      onUpdateProject((prev) => ({
        ...prev,
        pcb: {
          ...prev.pcb,
          vias: [...prev.pcb.vias, newVia],
        },
      }), 'Place Via');
    } else if (activeTool === 'measure') {
      if (!measureStart) {
        setMeasureStart(wp);
      } else {
        setMeasureStart(null);
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

    if (activeTool === 'route') {
      const hit = InteractiveRouter.findPadAtPosition(pcb, wp, activeLayer);
      setHoverPad(hit);

      if (routeStart && hit) {
        const validation = InteractiveRouter.validateConnection(routeNetName, hit.netName);
        if (!validation.valid) {
          setRouteError({
            message: `❌ Cannot connect ${routeNetName} to ${hit.netName}`,
            x: hit.worldPos.x,
            y: hit.worldPos.y,
          });
        } else {
          setRouteError(null);
        }
      } else {
        setRouteError(null);
      }
    } else {
      setHoverPad(null);
    }

    if (isDragging) {
      if (e.buttons === 4 || e.altKey) {
        setPan({ x: sx - dragOffset.x, y: sy - dragOffset.y });
      } else if (selectedFootprintId) {
        const snappedX = snapToGrid(wp.x - dragOffset.x);
        const snappedY = snapToGrid(wp.y - dragOffset.y);

        onUpdateProject((prev) => ({
          ...prev,
          pcb: {
            ...prev.pcb,
            footprints: prev.pcb.footprints.map((fp) =>
              fp.id === selectedFootprintId ? { ...fp, x: snappedX, y: snappedY } : fp
            ),
          },
        }));
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(1.5, Math.min(30.0, zoom * factor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setPan({
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    });
    setZoom(newZoom);
  };

  // Keyboard Shortcuts (X = Route, V = Via / Switch Layer, R = Rotate Footprint, F = Flip Layer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        if (selectedFootprintId) {
          onUpdateProject((prev) => ({
            ...prev,
            pcb: {
              ...prev.pcb,
              footprints: prev.pcb.footprints.map((fp) =>
                fp.id === selectedFootprintId ? { ...fp, rotation: (fp.rotation + 90) % 360 } : fp
              ),
            },
          }), 'Rotate Footprint');
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (selectedFootprintId) {
          onUpdateProject((prev) => ({
            ...prev,
            pcb: {
              ...prev.pcb,
              footprints: prev.pcb.footprints.map((fp) =>
                fp.id === selectedFootprintId
                  ? { ...fp, layer: fp.layer === 'F.Cu' ? 'B.Cu' : 'F.Cu' }
                  : fp
              ),
            },
          }), 'Flip Footprint Layer');
        }
      } else if (e.key === 'x' || e.key === 'X') {
        setActiveTool('route');
      } else if (e.key === 'v' || e.key === 'V') {
        // Toggle Layer and Place Via if routing
        setActiveLayer((l) => (l === 'F.Cu' ? 'B.Cu' : 'F.Cu'));
      } else if (e.key === 'b' || e.key === 'B') {
        // Refill Zones
        onUpdateProject((prev) => ({
          ...prev,
          pcb: {
            ...prev.pcb,
            zones: prev.pcb.zones.map((z) => ({ ...z, isFilled: true })),
          },
        }), 'Fill Copper Zones');
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setRouteStart(null);
        setMeasureStart(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFootprintId, onUpdateProject]);

  return (
    <div className="relative w-full h-full flex flex-col bg-cad-bg overflow-hidden select-none">
      {/* Top PCB Toolbar */}
      <div className="h-10 bg-cad-panel border-b border-cad-border px-3 flex items-center justify-between z-10">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              setActiveTool('select');
              setRouteStart(null);
            }}
            title="Select & Move (Esc)"
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'select' ? 'bg-blue-600 text-white' : 'hover:bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <Move size={16} />
          </button>

          <button
            onClick={() => setActiveTool('route')}
            title="Interactive Route Track (X)"
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'route' ? 'bg-orange-600 text-white' : 'hover:bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <RouteIcon size={16} />
          </button>

          <button
            onClick={() => setActiveTool('via')}
            title="Place Via (V)"
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'via' ? 'bg-amber-600 text-white' : 'hover:bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <CircleDot size={16} />
          </button>

          <button
            onClick={() => setActiveTool('measure')}
            title="Measurement Ruler"
            className={`p-1.5 rounded transition-colors ${
              activeTool === 'measure' ? 'bg-pink-600 text-white' : 'hover:bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <Ruler size={16} />
          </button>

          <div className="h-4 w-px bg-cad-border mx-1" />

          {/* Active Layer Picker */}
          <div className="flex items-center space-x-1 bg-cad-subpanel px-2 py-0.5 rounded border border-cad-border">
            <span className="text-[10px] text-cad-textMuted">Layer:</span>
            {(['F.Cu', 'B.Cu', 'Edge.Cuts', 'F.Silkscreen'] as PCBLayerId[]).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  activeLayer === layer
                    ? layer === 'F.Cu'
                      ? 'bg-[#e05638] text-white'
                      : layer === 'B.Cu'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-500 text-slate-900'
                    : 'text-cad-textMuted hover:text-white'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-cad-border mx-1" />

          {/* Refill Copper Zones Button */}
          <button
            onClick={() => {
              onUpdateProject((prev) => ({
                ...prev,
                pcb: {
                  ...prev.pcb,
                  zones: prev.pcb.zones.map((z) => ({ ...z, isFilled: !z.isFilled })),
                },
              }), 'Toggle Zones');
            }}
            title="Refill Copper Zones (B)"
            className="px-2 py-1 bg-cad-subpanel hover:bg-cad-border text-slate-300 rounded text-xs flex items-center gap-1.5 border border-cad-border"
          >
            <Square size={13} className="text-blue-400" />
            Fill Zones (B)
          </button>
        </div>

        {/* Status Readouts */}
        <div className="flex items-center space-x-3 text-xs text-cad-textMuted font-mono">
          <span>X: {hoverPos.x.toFixed(2)} mm</span>
          <span>Y: {hoverPos.y.toFixed(2)} mm</span>
          <span>Grid: {gridStep} mm</span>
          <div className="h-4 w-px bg-cad-border" />
          <button onClick={() => setZoom((z) => Math.min(30, z * 1.2))} className="p-1 hover:text-cad-text">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => setZoom((z) => Math.max(1.5, z * 0.8))} className="p-1 hover:text-cad-text">
            <ZoomOut size={14} />
          </button>
          <button onClick={() => { setPan({ x: 300, y: 250 }); setZoom(6.0); }} className="p-1 hover:text-cad-text">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Interactive Routing Status / Short Circuit Error Banners */}
      {routeError && (
        <div className="absolute top-12 left-4 right-4 z-20 bg-red-600/90 text-white px-4 py-2 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg backdrop-blur border border-red-400 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-bold">SHORT CIRCUIT PREVENTED:</span>
            <span>{routeError.message}</span>
          </div>
          <button
            onClick={() => setRouteError(null)}
            className="px-2 py-0.5 bg-black/30 hover:bg-black/50 rounded font-semibold text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {routeStart && !routeError && (
        <div className="absolute top-12 left-4 z-20 bg-cad-panel/90 border border-blue-500/50 text-cad-text px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-3 shadow-md backdrop-blur">
          <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-bold">
            <RouteIcon size={13} /> Routing Net: {routeNetName}
          </span>
          <span className="text-cad-textMuted text-[11px]">(Click target pad to finish, Esc to cancel)</span>
        </div>
      )}

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
