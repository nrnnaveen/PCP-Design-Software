/**
 * FloZ EDA - Ultimate Professional Interactive PCB Layout Editor
 * KiCad-class high-performance 2D multi-layer canvas layout engine with 45°/90° interactive routing,
 * automatic via placement with layer switching, copper zones with obstacle avoidance,
 * appearance management, real-time status bar, and CAD ergonomics.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ApexProject,
  Point2D,
  PCBLayerId,
  PCBTrackSegment,
  PCBVia,
  PCBZone,
  PCBFootprintInstance,
  DesignRules,
} from '../core/types';
import { RatsnestGenerator, RatsnestLine } from './ratsnest';
import { InteractiveRouter, RouteSegment, RoutingMode } from '../router/router';
import { ZoneEngine } from './zoneEngine';
import { STANDARD_PCB_LAYERS, LayerManagerUtils } from './layers';
import { AppearancePanel } from './AppearancePanel';
import { BoardSetupModal } from './BoardSetupModal';
import { PropertiesPanel } from '../ui/PropertiesPanel';
import { eventBus } from '../core/eventBus';
import { ZoneToolFSM } from './zoneToolFSM';
import { CADDrawingEngine } from './cadDrawingTools';
import {
  Move,
  Hand,
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
  Settings,
  Zap,
  Sliders,
  Lock,
  Unlock,
  FlipHorizontal,
  Copy,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AppThemeId, getCanvasColors } from '../theme/themeManager';

interface Props {
  project: ApexProject;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
  onRunDRC: () => void;
  theme?: AppThemeId;
}

type PCBTool = 'select' | 'pan' | 'route' | 'via' | 'zone' | 'measure';

export const PCBEditor: React.FC<Props> = ({ project, onUpdateProject, onRunDRC, theme = 'high-contrast' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Transform
  const [zoom, setZoom] = useState<number>(6.0); // 6 px per mm
  const [pan, setPan] = useState<Point2D>({ x: 320, y: 260 });
  const [activeTool, setActiveTool] = useState<PCBTool>('select');
  const [activeLayer, setActiveLayer] = useState<PCBLayerId>('F.Cu');

  // Routing Configuration
  const [routingMode, setRoutingMode] = useState<RoutingMode>('45');
  const [routingPosture, setRoutingPosture] = useState<0 | 1>(0);
  const [trackWidthPreset, setTrackWidthPreset] = useState<number | 'netclass'>('netclass');
  const [customTrackWidth, setCustomTrackWidth] = useState<number>(0.25);
  const [isDiffPairMode, setIsDiffPairMode] = useState<boolean>(false);
  const [diffPairGap, setDiffPairGap] = useState<number>(0.2);

  // Selection Filters
  const [showFilterBar, setShowFilterBar] = useState<boolean>(false);
  const [selectionFilter, setSelectionFilter] = useState({
    footprints: true,
    tracks: true,
    vias: true,
    zones: true,
    dimensions: true,
    texts: true,
  });

  // Grid Configuration
  const [gridSpacing, setGridSpacing] = useState<number>(0.5);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);

  // Layer & Object Visibility
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    'F.Cu': true,
    'B.Cu': true,
    'In1.Cu': true,
    'In2.Cu': true,
    'F.Silkscreen': true,
    'B.Silkscreen': true,
    'F.Mask': true,
    'B.Mask': true,
    'Edge.Cuts': true,
    'F.Courtyard': true,
    'B.Courtyard': true,
    'F.Fab': true,
    'B.Fab': true,
  });

  const [objectVisibility, setObjectVisibility] = useState<Record<string, boolean>>({
    footprints: true,
    pads: true,
    tracks: true,
    vias: true,
    zones: true,
    ratsnest: true,
    silkscreen: true,
    courtyard: true,
    dimensions: true,
    texts: true,
    outline: true,
  });

  const [dimInactiveLayers, setDimInactiveLayers] = useState<boolean>(false);
  const [highlightedNet, setHighlightedNet] = useState<string | null>(null);

  // Selection state
  const [selectedFootprintId, setSelectedFootprintId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedViaId, setSelectedViaId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [multiSelectedFootprintIds, setMultiSelectedFootprintIds] = useState<string[]>([]);

  // Drag & Box Select
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });
  const [boxSelectStart, setBoxSelectStart] = useState<Point2D | null>(null);
  const [boxSelectCurrent, setBoxSelectCurrent] = useState<Point2D | null>(null);

  // In-progress Route State
  const [routeStart, setRouteStart] = useState<Point2D | null>(null);
  const [routeStartPad, setRouteStartPad] = useState<{ footprint: PCBFootprintInstance; pad: any; worldPos: Point2D; netName: string } | null>(null);
  const [hoverPad, setHoverPad] = useState<{ footprint: PCBFootprintInstance; pad: any; worldPos: Point2D; netName: string } | null>(null);
  const [routeNetName, setRouteNetName] = useState<string>('Default');
  const [routeError, setRouteError] = useState<{ message: string; x: number; y: number } | null>(null);
  const [hoverPos, setHoverPos] = useState<Point2D>({ x: 0, y: 0 });

  // In-progress Zone State
  const [zonePoints, setZonePoints] = useState<Point2D[]>([]);

  // Measurement State
  const [measureStart, setMeasureStart] = useState<Point2D | null>(null);

  // Modal Dialogs & Side Panels
  const [showBoardSetup, setShowBoardSetup] = useState<boolean>(false);
  const [showLeftInspector, setShowLeftInspector] = useState<boolean>(true);
  const [showRightAppearance, setShowRightAppearance] = useState<boolean>(true);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; footprintId?: string } | null>(null);

  const pcb = project.pcb;

  // Active Effective Track Width
  const getActiveTrackWidth = useCallback((): number => {
    if (trackWidthPreset === 'netclass') {
      const netClass = project.designRules.customNetClasses[routeNetName] || project.designRules.defaultNetClass;
      return netClass.trackWidth || 0.25;
    }
    return typeof trackWidthPreset === 'number' ? trackWidthPreset : customTrackWidth;
  }, [trackWidthPreset, customTrackWidth, project.designRules, routeNetName]);

  // Snapping function
  const snapToGrid = useCallback(
    (val: number, step = gridSpacing): number => {
      if (!snapEnabled) return val;
      return Math.round(val / step) * step;
    },
    [gridSpacing, snapEnabled]
  );

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

  // Generate real-time Ratsnest Airwires
  const ratsnestLines = RatsnestGenerator.generate(pcb);

  // -----------------------------------------------------------------
  // MAIN MULTI-LAYER 2D CANVAS RENDER ENGINE
  // -----------------------------------------------------------------
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

    // 1. Dark CAD Background
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, width, height);

    // 2. High-Performance Adaptive Dot Grid
    const startWorld = screenToWorld(0, 0);
    const endWorld = screenToWorld(width, height);
    const gridPx = gridSpacing * zoom;
    const step = gridPx < 6 ? gridSpacing * 5 : gridPx < 12 ? gridSpacing * 2 : gridSpacing;
    const minGridX = Math.floor(startWorld.x / step) * step;
    const maxGridX = Math.ceil(endWorld.x / step) * step;
    const minGridY = Math.floor(startWorld.y / step) * step;
    const maxGridY = Math.ceil(endWorld.y / step) * step;

    ctx.fillStyle = colors.gridColor;
    for (let gx = minGridX; gx <= maxGridX; gx += step) {
      for (let gy = minGridY; gy <= maxGridY; gy += step) {
        const sp = worldToScreen(gx, gy);
        ctx.fillRect(sp.x - 0.5, sp.y - 0.5, 1, 1);
      }
    }

    // 3. Render Board Outline (Edge.Cuts) & Inner Cutouts
    if (layerVisibility['Edge.Cuts'] !== false && objectVisibility.outline !== false && pcb.boardOutline.length >= 3) {
      ctx.strokeStyle = '#eab308'; // Edge.Cuts Yellow
      ctx.lineWidth = Math.max(1.5, 0.25 * zoom);
      ctx.beginPath();
      const first = worldToScreen(pcb.boardOutline[0].x, pcb.boardOutline[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < pcb.boardOutline.length; i++) {
        const pt = worldToScreen(pcb.boardOutline[i].x, pcb.boardOutline[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.stroke();

      // Mounting Holes & Circle Cutouts
      pcb.graphics.forEach((g) => {
        if (g.layer === 'Edge.Cuts' && g.type === 'circle' && g.x !== undefined && g.y !== undefined && g.radius) {
          const sp = worldToScreen(g.x, g.y);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, g.radius * zoom, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    }

    // 4. Render Copper Pour Zones (F.Cu / B.Cu / Inner)
    if (objectVisibility.zones !== false) {
      pcb.zones.forEach((zone) => {
        if (layerVisibility[zone.layer] === false) return;

        const isLayerActive = activeLayer === zone.layer;
        const opacity = dimInactiveLayers && !isLayerActive ? 0.15 : 0.35;
        const color = zone.layer === 'F.Cu' ? `rgba(224, 86, 56, ${opacity})` : `rgba(59, 130, 246, ${opacity})`;

        if (zone.isFilled && zone.points.length >= 3) {
          ctx.fillStyle = color;
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
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // 5. In-progress Zone Drawing Outline
    if (activeTool === 'zone' && zonePoints.length > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      const p0 = worldToScreen(zonePoints[0].x, zonePoints[0].y);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < zonePoints.length; i++) {
        const pt = worldToScreen(zonePoints[i].x, zonePoints[i].y);
        ctx.lineTo(pt.x, pt.y);
      }
      const cur = worldToScreen(hoverPos.x, hoverPos.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
      ctx.setLineDash([]);

      zonePoints.forEach((p) => {
        const sp = worldToScreen(p.x, p.y);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(sp.x - 3, sp.y - 3, 6, 6);
      });
    }

    // 6. Render Ratsnest Airwires
    if (layerVisibility['Ratsnest'] !== false && objectVisibility.ratsnest !== false) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      ratsnestLines.forEach((rat) => {
        if (highlightedNet && rat.netName !== highlightedNet) return;

        const p1 = worldToScreen(rat.x1, rat.y1);
        const p2 = worldToScreen(rat.x2, rat.y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // 7. Render Bottom Copper Tracks (B.Cu)
    if (layerVisibility['B.Cu'] !== false && objectVisibility.tracks !== false) {
      const isLayerActive = activeLayer === 'B.Cu';
      const isDimmed = dimInactiveLayers && !isLayerActive;

      ctx.lineCap = 'round';
      pcb.tracks.forEach((track) => {
        if (track.layer === 'B.Cu') {
          const isNetHighlighted = highlightedNet && track.netName === highlightedNet;
          ctx.strokeStyle = isNetHighlighted ? '#60a5fa' : isDimmed ? 'rgba(59, 130, 246, 0.25)' : '#3b82f6';
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

    // 8. Render Top Copper Tracks (F.Cu)
    if (layerVisibility['F.Cu'] !== false && objectVisibility.tracks !== false) {
      const isLayerActive = activeLayer === 'F.Cu';
      const isDimmed = dimInactiveLayers && !isLayerActive;

      ctx.lineCap = 'round';
      pcb.tracks.forEach((track) => {
        if (track.layer === 'F.Cu') {
          const isNetHighlighted = highlightedNet && track.netName === highlightedNet;
          ctx.strokeStyle = isNetHighlighted ? '#fb923c' : isDimmed ? 'rgba(224, 86, 56, 0.25)' : '#e05638';
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

    // 9. Render Through-Hole Vias
    if (objectVisibility.vias !== false) {
      pcb.vias.forEach((via) => {
        const isNetHighlighted = highlightedNet && via.netName === highlightedNet;
        const sp = worldToScreen(via.x, via.y);
        const outerR = (via.diameter / 2) * zoom;
        const drillR = (via.drillDiameter / 2) * zoom;

        // Copper Annular Ring
        ctx.fillStyle = isNetHighlighted ? '#fbbf24' : '#eab308';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, outerR, 0, Math.PI * 2);
        ctx.fill();

        // Drill Hole
        ctx.fillStyle = isLight ? '#f8fafc' : '#111418';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, drillR, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 10. Render Component Footprints, Pads, Silkscreen & Courtyards
    if (objectVisibility.footprints !== false) {
      pcb.footprints.forEach((fp) => {
        const isSelected = selectedFootprintId === fp.id || multiSelectedFootprintIds.includes(fp.id);
        const rad = (fp.rotation * Math.PI) / 180;
        const cosR = Math.cos(rad);
        const sinR = Math.sin(rad);

        // Render Pads
        if (objectVisibility.pads !== false) {
          fp.pads.forEach((pad) => {
            const rx = pad.x * cosR - pad.y * sinR;
            const ry = pad.x * sinR + pad.y * cosR;
            const padCenter = worldToScreen(fp.x + rx, fp.y + ry);

            const padW = pad.width * zoom;
            const padH = pad.height * zoom;

            ctx.save();
            ctx.translate(padCenter.x, padCenter.y);
            ctx.rotate(rad);

            const isPadNetHighlighted = highlightedNet && pad.netName === highlightedNet;

            // Copper Pad Fill
            ctx.fillStyle = isPadNetHighlighted
              ? '#fbbf24'
              : pad.type === 'through_hole'
              ? '#22c55e'
              : fp.layer === 'F.Cu'
              ? '#e05638'
              : '#3b82f6';

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
        }

        // Silkscreen Graphic Outlines
        if (layerVisibility['F.Silkscreen'] !== false && objectVisibility.silkscreen !== false) {
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

        // Selection Highlight Frame
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
    }

    // 11. Interactive In-Progress Route Preview (45° / 90° / Free)
    if (routeStart && activeTool === 'route') {
      const targetPos = hoverPad ? hoverPad.worldPos : { x: snapToGrid(hoverPos.x), y: snapToGrid(hoverPos.y) };
      const segments = InteractiveRouter.computePath(routeStart, targetPos, routingMode, routingPosture);

      const isShortCircuit = hoverPad && hoverPad.netName !== routeNetName && routeNetName !== 'Default' && hoverPad.netName !== 'Default';
      const isValidTarget = hoverPad && hoverPad.netName === routeNetName;

      ctx.strokeStyle = isShortCircuit
        ? '#ef4444' // Red for Short Circuit
        : isValidTarget
        ? '#22c55e' // Green for Same Net Pad
        : (STANDARD_PCB_LAYERS.find((l) => l.id === activeLayer)?.color || '#f97316');

      const effectiveWidth = getActiveTrackWidth();
      ctx.lineWidth = Math.max(2.5, effectiveWidth * zoom);
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

      // Target Pad Lock & Tooltip
      if (hoverPad) {
        const hp = worldToScreen(hoverPad.worldPos.x, hoverPad.worldPos.y);
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 8 * (zoom / 6), 0, Math.PI * 2);
        ctx.strokeStyle = isShortCircuit ? '#ef4444' : '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();

        const tooltip = isShortCircuit
          ? `❌ Short: Cannot connect "${routeNetName}" to "${hoverPad.netName}"`
          : `✓ Connect Net "${routeNetName}"`;

        ctx.fillStyle = isShortCircuit ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)';
        ctx.font = `bold ${Math.max(10, 1.8 * zoom)}px 'JetBrains Mono', monospace`;
        const textW = ctx.measureText(tooltip).width;
        ctx.fillRect(hp.x - textW / 2 - 6, hp.y - 24, textW + 12, 18);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(tooltip, hp.x, hp.y - 11);
      }
    }

    // 12. Rubber-band Box Multi-Selection
    if (boxSelectStart && boxSelectCurrent) {
      const p1 = worldToScreen(boxSelectStart.x, boxSelectStart.y);
      const p2 = worldToScreen(boxSelectCurrent.x, boxSelectCurrent.y);
      const minX = Math.min(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const boxW = Math.abs(p2.x - p1.x);
      const boxH = Math.abs(p2.y - p1.y);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(minX, minY, boxW, boxH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX, minY, boxW, boxH);
      ctx.setLineDash([]);
    }

    // 13. Measurement Ruler Tool
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
  }, [
    pcb,
    zoom,
    pan,
    activeTool,
    activeLayer,
    layerVisibility,
    objectVisibility,
    dimInactiveLayers,
    highlightedNet,
    selectedFootprintId,
    multiSelectedFootprintIds,
    routeStart,
    hoverPos,
    hoverPad,
    zonePoints,
    measureStart,
    boxSelectStart,
    boxSelectCurrent,
    routingMode,
    routingPosture,
    gridSpacing,
    snapEnabled,
    screenToWorld,
    worldToScreen,
    ratsnestLines,
    theme,
    getActiveTrackWidth,
  ]);

  // -----------------------------------------------------------------
  // MOUSE & INTERACTION EVENT HANDLERS
  // -----------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const snapped = { x: snapToGrid(wp.x), y: snapToGrid(wp.y) };

    // 1. Pan with Middle click, Right drag, Alt-drag, Spacebar, or active Pan tool
    if (e.button === 1 || activeTool === 'pan' || e.altKey) {
      setIsDragging(true);
      setDragOffset({ x: sx - pan.x, y: sy - pan.y });
      return;
    }

    // Right click = Context Menu
    if (e.button === 2) {
      const hitFp = pcb.footprints.find((fp) => Math.hypot(fp.x - wp.x, fp.y - wp.y) < 8);
      setContextMenu({ x: e.clientX, y: e.clientY, footprintId: hitFp?.id });
      return;
    } else {
      setContextMenu(null);
    }

    if (activeTool === 'select') {
      const hitFp = pcb.footprints.find((fp) => Math.hypot(fp.x - wp.x, fp.y - wp.y) < 8);

      if (hitFp) {
        setSelectedFootprintId(hitFp.id);
        setSelectedTrackId(null);
        setSelectedViaId(null);
        setSelectedZoneId(null);
        setIsDragging(true);
        setDragOffset({ x: wp.x - hitFp.x, y: wp.y - hitFp.y });
        eventBus.emit('SELECT_FOOTPRINT', { footprintId: hitFp.id, reference: hitFp.reference });
      } else {
        // Start rubberband box multi-select
        setSelectedFootprintId(null);
        setMultiSelectedFootprintIds([]);
        setBoxSelectStart(wp);
        setBoxSelectCurrent(wp);
      }
    } else if (activeTool === 'route') {
      const hitPad = InteractiveRouter.findPadAtPosition(pcb, wp, activeLayer);

      if (!routeStart) {
        // Start route from clicked pad or grid
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
              message: `Short Circuit Blocked: Cannot connect "${routeNetName}" to "${hitPad.netName}". Route cancelled.`,
              x: hitPad.worldPos.x,
              y: hitPad.worldPos.y,
            });
            return;
          }
        }

        // Commit track segments
        const segments = InteractiveRouter.computePath(routeStart, targetPos, routingMode, routingPosture);
        const effectiveWidth = getActiveTrackWidth();

        const newTracks: PCBTrackSegment[] = segments.map((seg, i) => ({
          id: `trk_${Date.now()}_${i}`,
          netId: `net_${routeNetName.toLowerCase()}`,
          netName: routeNetName,
          layer: activeLayer,
          x1: seg.x1,
          y1: seg.y1,
          x2: seg.x2,
          y2: seg.y2,
          width: effectiveWidth,
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
          setRouteStart(null);
          setRouteStartPad(null);
        } else {
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
    } else if (activeTool === 'zone') {
      setZonePoints((prev) => [...prev, snapped]);
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

    if (boxSelectStart) {
      setBoxSelectCurrent(wp);
    }

    if (isDragging) {
      if (e.buttons === 4 || activeTool === 'pan' || e.altKey || (!selectedFootprintId && activeTool !== 'route' && activeTool !== 'via' && activeTool !== 'zone' && activeTool !== 'measure')) {
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

    if (boxSelectStart && boxSelectCurrent) {
      const minX = Math.min(boxSelectStart.x, boxSelectCurrent.x);
      const maxX = Math.max(boxSelectStart.x, boxSelectCurrent.x);
      const minY = Math.min(boxSelectStart.y, boxSelectCurrent.y);
      const maxY = Math.max(boxSelectStart.y, boxSelectCurrent.y);

      const insideFps = pcb.footprints
        .filter((fp) => fp.x >= minX && fp.x <= maxX && fp.y >= minY && fp.y <= maxY)
        .map((fp) => fp.id);

      setMultiSelectedFootprintIds(insideFps);
      if (insideFps.length === 1) {
        setSelectedFootprintId(insideFps[0]);
      }
      setBoxSelectStart(null);
      setBoxSelectCurrent(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(1.5, Math.min(35.0, zoom * factor));

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

  // Keyboard Shortcuts (X = Route, V = Via / Layer Switch, R = Rotate, F = Flip, B = Refill Zones, \ = Posture)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
          }), 'Flip Footprint Side');
        }
      } else if (e.key === 'x' || e.key === 'X') {
        setActiveTool('route');
      } else if (e.key === 'v' || e.key === 'V') {
        // Automatic Via Insertion & Layer Switch during routing
        if (routeStart && activeTool === 'route') {
          const snapped = { x: snapToGrid(hoverPos.x), y: snapToGrid(hoverPos.y) };
          const targetLayer: PCBLayerId = activeLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu';

          // Insert via at cursor
          const newVia: PCBVia = {
            id: `via_${Date.now()}`,
            netId: `net_${routeNetName.toLowerCase()}`,
            netName: routeNetName,
            x: snapped.x,
            y: snapped.y,
            diameter: project.designRules.defaultNetClass.viaDiameter,
            drillDiameter: project.designRules.defaultNetClass.viaDrill,
            startLayer: 'F.Cu',
            endLayer: 'B.Cu',
            type: 'through',
          };

          // Complete previous segment
          const segments = InteractiveRouter.computePath(routeStart, snapped, routingMode, routingPosture);
          const effectiveWidth = getActiveTrackWidth();
          const newTracks: PCBTrackSegment[] = segments.map((seg, i) => ({
            id: `trk_${Date.now()}_${i}`,
            netId: `net_${routeNetName.toLowerCase()}`,
            netName: routeNetName,
            layer: activeLayer,
            x1: seg.x1,
            y1: seg.y1,
            x2: seg.x2,
            y2: seg.y2,
            width: effectiveWidth,
          }));

          onUpdateProject((prev) => ({
            ...prev,
            pcb: {
              ...prev.pcb,
              vias: [...prev.pcb.vias, newVia],
              tracks: [...prev.pcb.tracks, ...newTracks],
            },
          }), 'Insert Via and Switch Layer');

          // Switch active layer and continue routing from via location
          setActiveLayer(targetLayer);
          setRouteStart(snapped);
        } else {
          setActiveLayer((l) => (l === 'F.Cu' ? 'B.Cu' : 'F.Cu'));
        }
      } else if (e.key === '\\') {
        // Flip routing corner posture
        setRoutingPosture((p) => (p === 0 ? 1 : 0));
      } else if (e.key === 'b' || e.key === 'B') {
        // Refill all copper zones
        const refilled = ZoneEngine.refillAllZones(pcb, project.designRules);
        onUpdateProject((prev) => ({
          ...prev,
          pcb: refilled,
        }), 'Refill Copper Zones');
      } else if (e.key === 'Enter') {
        // Finish zone polygon
        if (activeTool === 'zone' && zonePoints.length >= 3) {
          const newZone: PCBZone = {
            id: `zone_${Date.now()}`,
            netId: 'net_gnd',
            netName: 'GND',
            layer: activeLayer,
            priority: 1,
            clearance: 0.3,
            minWidth: 0.25,
            thermalReliefWidth: 0.3,
            thermalReliefGap: 0.3,
            points: zonePoints,
            isFilled: true,
            keepIslands: false,
          };

          onUpdateProject((prev) => ({
            ...prev,
            pcb: {
              ...prev.pcb,
              zones: [...prev.pcb.zones, newZone],
            },
          }), 'Create Copper Zone');

          setZonePoints([]);
          setActiveTool('select');
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (activeTool === 'zone' && zonePoints.length > 0) {
          e.preventDefault();
          setZonePoints((prev) => prev.slice(0, -1));
        } else if (selectedFootprintId) {
          onUpdateProject((prev) => ({
            ...prev,
            pcb: {
              ...prev.pcb,
              footprints: prev.pcb.footprints.filter((fp) => fp.id !== selectedFootprintId),
            },
          }), 'Delete Footprint');
          setSelectedFootprintId(null);
        }
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveTool((prev) => (prev === 'pan' ? 'select' : 'pan'));
        setRouteStart(null);
      } else if (e.key === 'Escape') {
        if (activeTool === 'zone' && zonePoints.length > 0) {
          // Cancel only the current unconfirmed polygon segment
          setZonePoints([]);
          setActiveTool('select');
        } else {
          setActiveTool('select');
          setRouteStart(null);
          setMeasureStart(null);
          setContextMenu(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFootprintId,
    routeStart,
    activeTool,
    activeLayer,
    hoverPos,
    routeNetName,
    routingMode,
    routingPosture,
    pcb,
    project.designRules,
    zonePoints,
    onUpdateProject,
    getActiveTrackWidth,
    snapToGrid,
  ]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full flex flex-col bg-cad-bg overflow-hidden select-none font-sans"
    >
      {/* 1. TOP PROFESSIONAL PCB TOOLBAR */}
      <div className="h-9 bg-cad-panel border-b border-cad-border px-3 flex items-center justify-between z-10 shrink-0 select-none text-xs">
        <div className="flex items-center space-x-1">
          {/* Tool Selectors */}
          <button
            onClick={() => {
              setActiveTool('select');
              setRouteStart(null);
            }}
            title="Select & Move Footprint (Esc)"
            className={`px-2 py-0.5 rounded-xs transition-colors duration-fast flex items-center gap-1.5 text-xs font-medium ${
              activeTool === 'select' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'hover:bg-cad-surfaceHover text-cad-text'
            }`}
          >
            <Move size={13} />
            <span className="hidden sm:inline">Select</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('pan');
              setRouteStart(null);
            }}
            title="Pan Canvas Tool (H / Middle Drag / Right Drag)"
            className={`px-2 py-0.5 rounded-xs transition-colors duration-fast flex items-center gap-1.5 text-xs font-medium ${
              activeTool === 'pan' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'hover:bg-cad-surfaceHover text-cad-text'
            }`}
          >
            <Hand size={13} />
            <span className="hidden sm:inline">Pan (H)</span>
          </button>

          <button
            onClick={() => setActiveTool('route')}
            title="Interactive Route Track (X)"
            className={`px-2 py-0.5 rounded-xs transition-colors duration-fast flex items-center gap-1.5 text-xs font-medium ${
              activeTool === 'route' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'hover:bg-cad-surfaceHover text-cad-text'
            }`}
          >
            <RouteIcon size={13} />
            <span className="hidden md:inline">Route</span>
          </button>

          <button
            onClick={() => setActiveTool('via')}
            title="Place Via (V)"
            className={`px-2 py-0.5 rounded-xs transition-colors duration-fast flex items-center gap-1.5 text-xs font-medium ${
              activeTool === 'via' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'hover:bg-cad-surfaceHover text-cad-text'
            }`}
          >
            <CircleDot size={13} />
            <span className="hidden md:inline">Via</span>
          </button>

          <button
            onClick={() => {
              setActiveTool('zone');
              setZonePoints([]);
            }}
            title="Draw Copper Zone Polygon"
            className={`px-2 py-0.5 rounded-xs transition-colors duration-fast flex items-center gap-1.5 text-xs font-medium ${
              activeTool === 'zone' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'hover:bg-cad-surfaceHover text-cad-text'
            }`}
          >
            <Square size={13} />
            <span className="hidden md:inline">Zone</span>
          </button>

          <button
            onClick={() => setActiveTool('measure')}
            title="Measurement Ruler"
            className={`p-1 rounded-xs transition-colors duration-fast ${
              activeTool === 'measure' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-cad-surfaceHover text-cad-text'
            }`}
          >
            <Ruler size={13} />
          </button>

          <div className="h-3.5 w-px bg-cad-border mx-0.5" />

          {/* Active Copper Layer Selector */}
          <div className="flex items-center space-x-1 bg-cad-subpanel px-1.5 py-0.5 rounded-xs border border-cad-border">
            <span className="text-[10px] text-cad-textMuted font-mono">Layer:</span>
            {(['F.Cu', 'B.Cu', 'In1.Cu', 'In2.Cu'] as PCBLayerId[]).map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`px-1.5 py-0.5 rounded-xs text-[11px] font-mono font-semibold transition-colors duration-fast ${
                  activeLayer === layer
                    ? layer === 'F.Cu'
                      ? 'bg-[#e05638] text-white shadow-xs'
                      : layer === 'B.Cu'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-cad-text hover:bg-cad-surfaceHover'
                }`}
              >
                {layer}
              </button>
            ))}
          </div>

          <div className="h-3.5 w-px bg-cad-border mx-0.5" />

          {/* Routing Mode Selector */}
          {activeTool === 'route' && (
            <div className="flex items-center space-x-1 bg-cad-subpanel px-1.5 py-0.5 rounded-xs border border-cad-border">
              <span className="text-[10px] text-cad-textMuted font-mono">Mode:</span>
              {(['45', '90', 'free'] as RoutingMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setRoutingMode(mode)}
                  className={`px-1.5 py-0.5 rounded-xs text-[11px] font-mono transition-colors duration-fast ${
                    routingMode === mode ? 'bg-cad-border text-cad-textHeading font-semibold' : 'text-cad-text hover:bg-cad-surfaceHover'
                  }`}
                >
                  {mode === '45' ? '45°' : mode === '90' ? '90°' : 'Free'}
                </button>
              ))}
            </div>
          )}

          {/* Track Width Preset */}
          {activeTool === 'route' && (
            <div className="flex items-center space-x-1 bg-cad-subpanel px-1.5 py-0.5 rounded-xs border border-cad-border text-[11px]">
              <span className="text-[10px] text-cad-textMuted font-mono">Width:</span>
              <select
                value={trackWidthPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setTrackWidthPreset(val === 'netclass' ? 'netclass' : parseFloat(val));
                }}
                className="bg-cad-inputBg border border-cad-inputBorder rounded-xs px-1.5 py-0.5 text-cad-inputText text-[11px] font-mono focus:border-blue-500"
              >
                <option value="netclass">NetClass (Auto)</option>
                <option value="0.15">0.15 mm (Fine)</option>
                <option value="0.25">0.25 mm (Std)</option>
                <option value="0.40">0.40 mm (Med)</option>
                <option value="0.60">0.60 mm (Power)</option>
                <option value="1.00">1.00 mm (Heavy)</option>
              </select>
            </div>
          )}

          {/* Differential Pair Routing Toggle */}
          {activeTool === 'route' && (
            <button
              onClick={() => setIsDiffPairMode(!isDiffPairMode)}
              title="Toggle Differential Pair Routing"
              className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1 font-mono border transition-colors duration-fast ${
                isDiffPairMode
                  ? 'bg-purple-600 text-white border-purple-400 font-bold'
                  : 'bg-cad-panel text-cad-text border-cad-border hover:bg-cad-surfaceHover'
              }`}
            >
              <Activity size={13} />
              <span>Diff Pair</span>
            </button>
          )}

          {/* Refill Copper Zones Button */}
          <button
            onClick={() => {
              const refilled = ZoneEngine.refillAllZones(pcb, project.designRules);
              onUpdateProject((prev) => ({
                ...prev,
                pcb: refilled,
              }), 'Refill Copper Zones');
            }}
            title="Refill Copper Zones (B)"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-xs flex items-center gap-1.5 border border-cad-border transition-colors duration-fast font-medium"
          >
            <Zap size={13} className="text-blue-600 dark:text-blue-400" />
            <span>Fill Zones (B)</span>
          </button>

          {/* Selection Filter Toggle */}
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            title="Toggle PCB Selection Filters"
            className={`px-2 py-0.5 rounded-xs text-xs flex items-center gap-1 font-medium border transition-colors duration-fast ${
              showFilterBar ? 'bg-cad-subpanel text-cad-textHeading border-cad-border font-semibold' : 'bg-cad-panel text-cad-text border-cad-border hover:bg-cad-surfaceHover'
            }`}
          >
            <Sliders size={13} />
            <span>Filter</span>
          </button>

          {/* Board Setup Button */}
          <button
            onClick={() => setShowBoardSetup(true)}
            title="Board Setup & Stackup Dialog"
            className="px-2 py-0.5 bg-cad-panel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-xs flex items-center gap-1.5 border border-cad-border transition-colors duration-fast font-medium"
          >
            <Settings size={13} />
            <span>Board Setup</span>
          </button>
        </div>

        {/* Status & Viewport Controls */}
        <div className="flex items-center space-x-3 text-xs text-cad-text font-mono">
          {/* Grid Selection */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-cad-textMuted">Grid:</span>
            <select
              value={gridSpacing}
              onChange={(e) => setGridSpacing(parseFloat(e.target.value))}
              className="bg-cad-inputBg border border-cad-inputBorder rounded-xs px-1.5 py-0.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
            >
              <option value="0.05">0.05 mm</option>
              <option value="0.1">0.10 mm</option>
              <option value="0.25">0.25 mm</option>
              <option value="0.5">0.50 mm</option>
              <option value="1.0">1.00 mm</option>
              <option value="2.5">2.50 mm</option>
            </select>
          </div>

          <div className="h-3.5 w-px bg-cad-border" />

          <span>X: {hoverPos.x.toFixed(2)} mm</span>
          <span>Y: {hoverPos.y.toFixed(2)} mm</span>

          <div className="h-3.5 w-px bg-cad-border" />

          <button onClick={() => setZoom((z) => Math.min(35, z * 1.2))} className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text transition-colors duration-fast">
            <ZoomIn size={13} />
          </button>
          <button onClick={() => setZoom((z) => Math.max(1.5, z * 0.8))} className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text transition-colors duration-fast">
            <ZoomOut size={13} />
          </button>
          <button
            onClick={() => {
              setPan({ x: 320, y: 260 });
              setZoom(6.0);
            }}
            title="Zoom to Fit Board"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-text transition-colors duration-fast"
          >
            <Maximize2 size={13} />
          </button>

          {/* Toggle Panels Buttons */}
          <button
            onClick={() => setShowLeftInspector((v) => !v)}
            title="Toggle Left Inspector"
            className={`p-1 rounded-xs transition-colors duration-fast ${showLeftInspector ? 'bg-blue-600 text-white shadow-xs' : 'text-cad-text hover:bg-cad-surfaceHover'}`}
          >
            <Sliders size={13} />
          </button>

          <button
            onClick={() => setShowRightAppearance((v) => !v)}
            title="Toggle Right Appearance Panel"
            className={`p-1 rounded-xs transition-colors duration-fast ${showRightAppearance ? 'bg-blue-600 text-white shadow-xs' : 'text-cad-text hover:bg-cad-surfaceHover'}`}
          >
            <Layers size={13} />
          </button>
        </div>
      </div>

      {/* Selection Filter Bar */}
      {showFilterBar && (
        <div className="h-7 bg-cad-panel border-b border-cad-border px-3 flex items-center gap-4 text-[11px] text-cad-textMuted z-10 shrink-0">
          <span className="font-semibold text-cad-text flex items-center gap-1">
            <Sliders size={11} /> Selection Filter:
          </span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectionFilter.footprints}
              onChange={(e) => setSelectionFilter((f) => ({ ...f, footprints: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Footprints</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectionFilter.tracks}
              onChange={(e) => setSelectionFilter((f) => ({ ...f, tracks: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Tracks</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectionFilter.vias}
              onChange={(e) => setSelectionFilter((f) => ({ ...f, vias: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Vias</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectionFilter.zones}
              onChange={(e) => setSelectionFilter((f) => ({ ...f, zones: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Zones</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectionFilter.dimensions}
              onChange={(e) => setSelectionFilter((f) => ({ ...f, dimensions: e.target.checked }))}
              className="rounded text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span>Dimensions</span>
          </label>
        </div>
      )}

      {/* 2. CENTRAL LAYOUT & CANVAS AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Properties Inspector Dock */}
        {showLeftInspector && (
          <aside className="w-64 h-full border-r border-cad-border bg-cad-panel shrink-0 z-10 flex flex-col">
            <PropertiesPanel
              project={project}
              selectedFootprintId={selectedFootprintId || undefined}
              selectedTrackId={selectedTrackId || undefined}
              selectedViaId={selectedViaId || undefined}
              selectedZoneId={selectedZoneId || undefined}
              onUpdateProject={onUpdateProject}
            />
          </aside>
        )}

        {/* Central 2D Canvas Container */}
        <div className="flex-1 h-full relative overflow-hidden">
          {/* Interactive Routing Status / Short Circuit Error Banners */}
          {routeError && (
            <div className="absolute top-3 left-4 right-4 z-20 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-mono flex items-center justify-between shadow-lg border border-red-500 animate-in fade-in duration-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} />
                <span className="font-bold">SHORT CIRCUIT PREVENTED:</span>
                <span>{routeError.message}</span>
              </div>
              <button
                onClick={() => setRouteError(null)}
                className="px-2 py-0.5 bg-black/30 hover:bg-black/50 rounded font-semibold text-[11px] transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {routeStart && !routeError && (
            <div className="absolute top-3 left-4 z-20 bg-cad-panel border border-blue-500/50 text-cad-text px-3 py-1.5 rounded text-xs font-mono flex items-center gap-3 shadow-md">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                <RouteIcon size={14} /> Routing Net: {routeNetName} {isDiffPairMode && '(Diff Pair Mode)'}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                [Net Length: {pcb.tracks.filter(t => t.netName === routeNetName).reduce((acc, t) => acc + Math.hypot(t.x2 - t.x1, t.y2 - t.y1), 0).toFixed(1)} mm]
              </span>
              <span className="text-cad-textMuted text-[11px]">
                (Press 'V' to place via &amp; switch layer, '\' to flip posture, Esc to cancel)
              </span>
            </div>
          )}

          {activeTool === 'zone' && (
            <div className="absolute top-3 left-4 z-20 bg-cad-panel border border-emerald-500/50 text-cad-text px-3 py-1.5 rounded text-xs font-mono flex items-center gap-3 shadow-md">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Drawing Copper Zone ({zonePoints.length} vertices)
              </span>
              <span className="text-cad-textMuted text-[11px]">
                (Click to add point, press Enter to finish, Esc to cancel)
              </span>
            </div>
          )}

          {/* HTML5 Vector Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            style={{
              cursor:
                activeTool === 'pan'
                  ? isDragging
                    ? 'grabbing'
                    : 'grab'
                  : activeTool === 'route'
                  ? 'crosshair'
                  : activeTool === 'measure'
                  ? 'crosshair'
                  : 'default',
            }}
            className="w-full h-full"
          />
        </div>

        {/* Right Appearance Panel Dock */}
        {showRightAppearance && (
          <aside className="w-72 h-full border-l border-cad-border bg-cad-panel shrink-0 z-10 flex flex-col">
            <AppearancePanel
              project={project}
              activeLayer={activeLayer}
              onSelectActiveLayer={setActiveLayer}
              layerVisibility={layerVisibility}
              onToggleLayerVisibility={(layerId) =>
                setLayerVisibility((prev) => ({ ...prev, [layerId]: prev[layerId] === false ? true : false }))
              }
              onSetAllLayersVisibility={(visible) => {
                const updated: Record<string, boolean> = {};
                STANDARD_PCB_LAYERS.forEach((l) => (updated[l.id] = visible));
                setLayerVisibility(updated);
              }}
              objectVisibility={objectVisibility}
              onToggleObjectVisibility={(objType) =>
                setObjectVisibility((prev) => ({ ...prev, [objType]: prev[objType] === false ? true : false }))
              }
              dimInactiveLayers={dimInactiveLayers}
              onToggleDimInactiveLayers={() => setDimInactiveLayers((v) => !v)}
              highlightedNet={highlightedNet}
              onSelectHighlightNet={setHighlightedNet}
            />
          </aside>
        )}
      </div>

      {/* 3. BOTTOM REAL-TIME STATUS BAR */}
      <footer className="h-7 bg-cad-subpanel border-t border-cad-border px-3 flex items-center justify-between text-[11px] font-mono text-cad-textMuted shrink-0">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1.5 text-cad-text font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            PCB Engine Ready
          </span>
          <span>Pads: {pcb.footprints.reduce((acc, f) => acc + f.pads.length, 0)}</span>
          <span>Vias: {pcb.vias.length}</span>
          <span>Tracks: {pcb.tracks.length}</span>
          <span>Unrouted: {ratsnestLines.length}</span>
          {routeStart && (
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              Tuned Length: {pcb.tracks.filter(t => t.netName === routeNetName).reduce((acc, t) => acc + Math.hypot(t.x2 - t.x1, t.y2 - t.y1), 0).toFixed(1)} mm
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <span>Active: {activeLayer}</span>
          <span>Zoom: {(zoom * 16.6).toFixed(0)}%</span>
          <span>Snap: {snapEnabled ? 'ON' : 'OFF'}</span>
        </div>
      </footer>

      {/* 4. CONTEXT MENU */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-cad-panel border border-cad-border rounded shadow-xl py-1 text-xs text-cad-text font-medium min-w-[160px] animate-in fade-in duration-75"
        >
          {contextMenu.footprintId && (
            <>
              <button
                onClick={() => {
                  onUpdateProject((prev) => ({
                    ...prev,
                    pcb: {
                      ...prev.pcb,
                      footprints: prev.pcb.footprints.map((fp) =>
                        fp.id === contextMenu.footprintId
                          ? { ...fp, rotation: (fp.rotation + 90) % 360 }
                          : fp
                      ),
                    },
                  }), 'Rotate Footprint');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-cad-subpanel flex items-center gap-2"
              >
                <RotateCw size={13} /> Rotate 90° (R)
              </button>

              <button
                onClick={() => {
                  onUpdateProject((prev) => ({
                    ...prev,
                    pcb: {
                      ...prev.pcb,
                      footprints: prev.pcb.footprints.map((fp) =>
                        fp.id === contextMenu.footprintId
                          ? { ...fp, layer: fp.layer === 'F.Cu' ? 'B.Cu' : 'F.Cu' }
                          : fp
                      ),
                    },
                  }), 'Flip Footprint Side');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-cad-subpanel flex items-center gap-2"
              >
                <FlipHorizontal size={13} /> Flip Side (F)
              </button>

              <div className="h-px bg-cad-border my-1" />

              <button
                onClick={() => {
                  onUpdateProject((prev) => ({
                    ...prev,
                    pcb: {
                      ...prev.pcb,
                      footprints: prev.pcb.footprints.filter((fp) => fp.id !== contextMenu.footprintId),
                    },
                  }), 'Delete Footprint');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-red-600/20 text-red-400 flex items-center gap-2"
              >
                <Trash2 size={13} /> Delete Footprint
              </button>
            </>
          )}

          {!contextMenu.footprintId && (
            <button
              onClick={() => {
                const refilled = ZoneEngine.refillAllZones(pcb, project.designRules);
                onUpdateProject((prev) => ({
                  ...prev,
                  pcb: refilled,
                }), 'Refill Copper Zones');
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-cad-subpanel flex items-center gap-2"
            >
              <Zap size={13} /> Refill Zones (B)
            </button>
          )}
        </div>
      )}

      {/* 5. BOARD SETUP MODAL */}
      <BoardSetupModal
        project={project}
        isOpen={showBoardSetup}
        onClose={() => setShowBoardSetup(false)}
        onSave={onUpdateProject}
      />
    </div>
  );
};
