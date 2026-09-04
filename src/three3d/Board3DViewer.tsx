/**
 * FloZ ECA — WebGL 3D Board Viewer (Three.js)
 * Professional KiCad/Altium-class 3D PCB visualization engine.
 * Renders physically accurate solid FR4 core, top/bottom solder masks, copper traces,
 * through-hole drill barrels, SMD/THT pads, silkscreen, and procedural 3D component packages.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ApexProject, PCBFootprintInstance, PCBPad, PCBTrackSegment, PCBVia, Point2D } from '../core/types';
import { Layers, Eye, EyeOff, RotateCcw, Box, Compass, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { AppThemeId, getCanvasColors } from '../theme/themeManager';

interface Props {
  project: ApexProject;
  onSelectComponent?: (reference: string) => void;
  theme?: AppThemeId;
}

export const Board3DViewer: React.FC<Props> = ({ project, onSelectComponent, theme = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // View Settings & Toggles
  const [soldermaskColor, setSoldermaskColor] = useState<string>(
    project.pcb.solderMaskColor || '#15803d'
  );
  const [showComponents, setShowComponents] = useState<boolean>(true);
  const [showSilkscreen, setShowSilkscreen] = useState<boolean>(true);
  const [showCopper, setShowCopper] = useState<boolean>(true);
  const [isTransparent, setIsTransparent] = useState<boolean>(false);

  // Camera Orbit State
  const orbitStateRef = useRef({
    targetRotX: 0.55,
    targetRotZ: -0.65,
    panX: 0,
    panY: 0,
    zoomDist: 90,
    minDist: 15,
    maxDist: 400,
  });

  // Re-fit camera to board bounds
  const fitBoardView = useCallback(() => {
    const pcb = project.pcb;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    if (pcb.boardOutline && pcb.boardOutline.length >= 3) {
      pcb.boardOutline.forEach((p) => {
        if (Number.isFinite(p.x)) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
        }
        if (Number.isFinite(p.y)) {
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
      });
    }

    if (pcb.footprints && pcb.footprints.length > 0) {
      pcb.footprints.forEach((fp) => {
        if (Number.isFinite(fp.x)) {
          minX = Math.min(minX, fp.x - 5);
          maxX = Math.max(maxX, fp.x + 5);
        }
        if (Number.isFinite(fp.y)) {
          minY = Math.min(minY, fp.y - 5);
          maxY = Math.max(maxY, fp.y + 5);
        }
      });
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      minX = 0; maxX = 80; minY = 0; maxY = 60;
    }

    const spanX = Math.max(10, maxX - minX);
    const spanY = Math.max(10, maxY - minY);
    const maxDim = Math.max(spanX, spanY);

    const targetDist = maxDim * 1.55;
    orbitStateRef.current.zoomDist = Math.max(25, targetDist);
    orbitStateRef.current.minDist = Math.max(10, maxDim * 0.25);
    orbitStateRef.current.maxDist = Math.max(200, maxDim * 6);
    orbitStateRef.current.panX = 0;
    orbitStateRef.current.panY = 0;
    orbitStateRef.current.targetRotX = 0.55;
    orbitStateRef.current.targetRotZ = -0.65;
  }, [project]);

  const setTopView = useCallback(() => {
    orbitStateRef.current.targetRotX = 0.001;
    orbitStateRef.current.targetRotZ = 0;
    orbitStateRef.current.panX = 0;
    orbitStateRef.current.panY = 0;
  }, []);

  const setBottomView = useCallback(() => {
    orbitStateRef.current.targetRotX = Math.PI - 0.001;
    orbitStateRef.current.targetRotZ = 0;
    orbitStateRef.current.panX = 0;
    orbitStateRef.current.panY = 0;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const colors = getCanvasColors(theme);

    // -------------------------------------------------------------
    // 1. Scene, Camera, Renderer Initialization
    // -------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.canvasBg || '#111418');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 2000);
    camera.up.set(0, 0, 1); // Z-axis is physically UP
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Real-time ResizeObserver: keeps Three.js viewport, aspect ratio, and board centering 100% stable
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // -------------------------------------------------------------
    // 2. Realistic Studio CAD Lighting
    // -------------------------------------------------------------
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainDirLight.position.set(80, -100, 140);
    mainDirLight.castShadow = true;
    mainDirLight.shadow.mapSize.width = 2048;
    mainDirLight.shadow.mapSize.height = 2048;
    mainDirLight.shadow.camera.near = 10;
    mainDirLight.shadow.camera.far = 400;
    mainDirLight.shadow.bias = -0.0005;
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    fillLight.position.set(-100, 80, 80);
    scene.add(fillLight);

    const bottomLight = new THREE.DirectionalLight(0xfef08a, 0.5);
    bottomLight.position.set(0, 50, -120);
    scene.add(bottomLight);

    // -------------------------------------------------------------
    // 3. Coordinate Transformation & Board Bounding Box
    // -------------------------------------------------------------
    const pcb = project.pcb;
    const boardThickness = Number.isFinite(pcb.boardThickness) && pcb.boardThickness! > 0
      ? pcb.boardThickness!
      : 1.6; // Standard 1.6mm thickness

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    if (pcb.boardOutline && pcb.boardOutline.length >= 3) {
      pcb.boardOutline.forEach((p) => {
        if (Number.isFinite(p.x)) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
        }
        if (Number.isFinite(p.y)) {
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
      });
    }

    if (pcb.footprints && pcb.footprints.length > 0) {
      pcb.footprints.forEach((fp) => {
        if (Number.isFinite(fp.x)) {
          minX = Math.min(minX, fp.x - 4);
          maxX = Math.max(maxX, fp.x + 4);
        }
        if (Number.isFinite(fp.y)) {
          minY = Math.min(minY, fp.y - 4);
          maxY = Math.max(maxY, fp.y + 4);
        }
      });
    }

    // Safe fallback if outline or footprints are empty
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      minX = 0; maxX = 75; minY = 0; maxY = 55;
    }

    const boardCenterX = (minX + maxX) / 2;
    const boardCenterY = (minY + maxY) / 2;
    const boardWidth = Math.max(10, maxX - minX);
    const boardHeight = Math.max(10, maxY - minY);

    // Canonical coordinate conversion helper:
    // Maps 2D PCB (x, y) into 3D World (worldX, worldY) centered at (0, 0)
    // Note: PCB Y is inverted (-Y) so that +Y on screen corresponds to standard 3D orientation
    const pcbTo3D = (x: number, y: number) => ({
      x: (x - boardCenterX),
      y: -(y - boardCenterY),
    });

    const masterBoardGroup = new THREE.Group();
    scene.add(masterBoardGroup);

    // -------------------------------------------------------------
    // 4. Materials Library (PBR Engineering Finishes)
    // -------------------------------------------------------------
    const isFlex = pcb.stackup?.some((l) => l.isFlex) || false;
    const fr4CoreColor = isFlex ? 0xd97706 : 0x2e382b; // Realistic translucent greenish-brown FR4
    const maskHex = isFlex ? 0xf59e0b : parseInt(soldermaskColor.replace('#', '0x'), 16) || 0x15803d;

    const fr4CoreMat = new THREE.MeshStandardMaterial({
      color: fr4CoreColor,
      roughness: 0.6,
      metalness: 0.05,
      transparent: isTransparent,
      opacity: isTransparent ? 0.4 : 1.0,
    });

    const soldermaskMat = new THREE.MeshStandardMaterial({
      color: maskHex,
      roughness: 0.28,
      metalness: 0.12,
      transparent: isTransparent,
      opacity: isTransparent ? 0.45 : 0.96,
    });

    const goldFinishMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // ENIG Immersion Gold
      metalness: 0.95,
      roughness: 0.18,
    });

    const tinFinishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // HASL Lead-Free Silver/Tin
      metalness: 0.9,
      roughness: 0.22,
    });

    const copperTopMat = new THREE.MeshStandardMaterial({
      color: 0xdd6b20, // Clean etched copper
      metalness: 0.88,
      roughness: 0.25,
    });

    const copperBottomMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, // Bottom copper accent
      metalness: 0.88,
      roughness: 0.25,
    });

    const silkscreenWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });

    const icPlasticBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1e222a, // Epoxy molding compound
      roughness: 0.45,
      metalness: 0.1,
    });

    const metallicShieldMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Stainless steel / Nickel-silver RF shield
      metalness: 0.95,
      roughness: 0.15,
    });

    const holeInteriorDarkMat = new THREE.MeshBasicMaterial({
      color: 0x090b0e,
    });

    // -------------------------------------------------------------
    // 5. Build Solid PCB Substrate (FR4 Core + Solder Masks)
    // -------------------------------------------------------------
    const outlineShape = new THREE.Shape();
    const effectiveOutline: Point2D[] = (pcb.boardOutline && pcb.boardOutline.length >= 3)
      ? pcb.boardOutline
      : [
          { x: minX, y: minY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
          { x: minX, y: maxY },
        ];

    const p0 = pcbTo3D(effectiveOutline[0].x, effectiveOutline[0].y);
    outlineShape.moveTo(p0.x, p0.y);
    for (let i = 1; i < effectiveOutline.length; i++) {
      const pt = pcbTo3D(effectiveOutline[i].x, effectiveOutline[i].y);
      outlineShape.lineTo(pt.x, pt.y);
    }
    outlineShape.closePath();

    // Add mounting hole cutouts from Edge.Cuts graphics
    if (pcb.graphics) {
      pcb.graphics.forEach((g) => {
        if (g.layer === 'Edge.Cuts' && g.type === 'circle' && Number.isFinite(g.x) && Number.isFinite(g.y) && Number.isFinite(g.radius) && g.radius! > 0) {
          const hp = pcbTo3D(g.x!, g.y!);
          const holePath = new THREE.Path();
          holePath.absarc(hp.x, hp.y, g.radius!, 0, Math.PI * 2, true);
          outlineShape.holes.push(holePath);
        }
      });
    }

    // Extrude the solid PCB substrate
    const boardExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: boardThickness,
      bevelEnabled: false,
      steps: 1,
    };

    const boardGeometry = new THREE.ExtrudeGeometry(outlineShape, boardExtrudeSettings);
    // Center Z so that bottom is at -boardThickness/2 and top is at +boardThickness/2
    boardGeometry.translate(0, 0, -boardThickness / 2);

    const boardMesh = new THREE.Mesh(boardGeometry, soldermaskMat);
    boardMesh.receiveShadow = true;
    boardMesh.castShadow = true;
    masterBoardGroup.add(boardMesh);

    // Inner FR4 substrate core edge ring
    const coreThickness = Math.max(0.2, boardThickness - 0.08);
    const coreGeometry = new THREE.ExtrudeGeometry(outlineShape, {
      depth: coreThickness,
      bevelEnabled: false,
      steps: 1,
    });
    coreGeometry.translate(0, 0, -coreThickness / 2);
    const coreMesh = new THREE.Mesh(coreGeometry, fr4CoreMat);
    masterBoardGroup.add(coreMesh);

    // -------------------------------------------------------------
    // 6. Render Vias & Plated Through-Hole Barrels
    // -------------------------------------------------------------
    if (pcb.vias && pcb.vias.length > 0) {
      pcb.vias.forEach((via) => {
        if (!Number.isFinite(via.x) || !Number.isFinite(via.y)) return;
        const vPos = pcbTo3D(via.x, via.y);
        const diameter = Number.isFinite(via.diameter) && via.diameter > 0 ? via.diameter : 0.8;
        const drill = Number.isFinite(via.drillDiameter) && via.drillDiameter > 0 ? via.drillDiameter : diameter * 0.5;

        // Top Copper Annular Ring
        const topRingGeo = new THREE.RingGeometry(drill / 2, diameter / 2, 16);
        const topRing = new THREE.Mesh(topRingGeo, goldFinishMat);
        topRing.position.set(vPos.x, vPos.y, boardThickness / 2 + 0.02);
        masterBoardGroup.add(topRing);

        // Bottom Copper Annular Ring
        const btmRingGeo = new THREE.RingGeometry(drill / 2, diameter / 2, 16);
        const btmRing = new THREE.Mesh(btmRingGeo, goldFinishMat);
        btmRing.position.set(vPos.x, vPos.y, -boardThickness / 2 - 0.02);
        btmRing.rotation.x = Math.PI;
        masterBoardGroup.add(btmRing);

        // Plated Copper Barrel Cylinder
        const barrelGeo = new THREE.CylinderGeometry(drill / 2 + 0.02, drill / 2 + 0.02, boardThickness + 0.02, 16, 1, true);
        const barrel = new THREE.Mesh(barrelGeo, goldFinishMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(vPos.x, vPos.y, 0);
        masterBoardGroup.add(barrel);

        // Dark Hollow Hole Interior
        const holeGeo = new THREE.CylinderGeometry(drill / 2 - 0.005, drill / 2 - 0.005, boardThickness + 0.05, 12);
        const hole = new THREE.Mesh(holeGeo, holeInteriorDarkMat);
        hole.rotation.x = Math.PI / 2;
        hole.position.set(vPos.x, vPos.y, 0);
        masterBoardGroup.add(hole);
      });
    }

    // -------------------------------------------------------------
    // 7. Render Copper Tracks (F.Cu and B.Cu)
    // -------------------------------------------------------------
    if (showCopper && pcb.tracks && pcb.tracks.length > 0) {
      pcb.tracks.forEach((track) => {
        if (!Number.isFinite(track.x1) || !Number.isFinite(track.y1) || !Number.isFinite(track.x2) || !Number.isFinite(track.y2)) return;
        const p1 = pcbTo3D(track.x1, track.y1);
        const p2 = pcbTo3D(track.x2, track.y2);
        const isTop = track.layer !== 'B.Cu';
        const zPos = isTop ? boardThickness / 2 + 0.02 : -boardThickness / 2 - 0.02;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.01) return;

        const width = Number.isFinite(track.width) && track.width > 0 ? track.width : 0.25;
        const angle = Math.atan2(dy, dx);

        // Main track strip
        const trackGeo = new THREE.BoxGeometry(len, width, 0.03);
        const trackMesh = new THREE.Mesh(trackGeo, isTop ? copperTopMat : copperBottomMat);
        trackMesh.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, zPos);
        trackMesh.rotation.z = angle;
        masterBoardGroup.add(trackMesh);

        // Rounded track joints/caps to eliminate gaps at 45-degree bends
        const capGeo = new THREE.CylinderGeometry(width / 2, width / 2, 0.03, 12);
        const cap1 = new THREE.Mesh(capGeo, isTop ? copperTopMat : copperBottomMat);
        cap1.rotation.x = Math.PI / 2;
        cap1.position.set(p1.x, p1.y, zPos);
        masterBoardGroup.add(cap1);

        const cap2 = new THREE.Mesh(capGeo, isTop ? copperTopMat : copperBottomMat);
        cap2.rotation.x = Math.PI / 2;
        cap2.position.set(p2.x, p2.y, zPos);
        masterBoardGroup.add(cap2);
      });
    }

    // -------------------------------------------------------------
    // 8. Render Footprints, Pads, and 3D Component Models
    // -------------------------------------------------------------
    if (pcb.footprints && pcb.footprints.length > 0) {
      pcb.footprints.forEach((fp) => {
        if (!Number.isFinite(fp.x) || !Number.isFinite(fp.y)) return;
        const fpPos = pcbTo3D(fp.x, fp.y);
        const isBottom = fp.layer === 'B.Cu';
        const fpZ = isBottom ? -boardThickness / 2 : boardThickness / 2;
        const rotDeg = Number.isFinite(fp.rotation) ? fp.rotation : 0;
        const rotRad = (rotDeg * Math.PI) / 180;

        const fpGroup = new THREE.Group();
        fpGroup.position.set(fpPos.x, fpPos.y, fpZ);
        // Note: Y is inverted in 3D, so rotation direction is inverted (-rotRad)
        fpGroup.rotation.z = -rotRad;
        if (isBottom) {
          fpGroup.rotation.x = Math.PI; // Flip for bottom components
        }

        // --- Render Pads ---
        if (fp.pads && fp.pads.length > 0) {
          fp.pads.forEach((pad) => {
            if (!Number.isFinite(pad.x) || !Number.isFinite(pad.y)) return;
            const padX = pad.x;
            const padY = -pad.y; // Invert local Y
            const padW = Number.isFinite(pad.width) && pad.width > 0 ? pad.width : 1.0;
            const padH = Number.isFinite(pad.height) && pad.height > 0 ? pad.height : 1.0;
            const isTHT = pad.type === 'through_hole';
            const padMat = isTHT ? tinFinishMat : goldFinishMat;

            if (isTHT) {
              // Through-hole pad: Top annular ring + Bottom ring + Barrel + Drill hole
              const drill = Number.isFinite(pad.drillDiameter) && pad.drillDiameter! > 0
                ? pad.drillDiameter!
                : Math.min(padW, padH) * 0.5;

              // Top & Bottom Annular Copper Rings
              const ringGeo = new THREE.RingGeometry(drill / 2, Math.min(padW, padH) / 2, 16);
              const topRing = new THREE.Mesh(ringGeo, padMat);
              topRing.position.set(padX, padY, 0.02);
              fpGroup.add(topRing);

              const btmRing = new THREE.Mesh(ringGeo, padMat);
              btmRing.position.set(padX, padY, -boardThickness - 0.02);
              btmRing.rotation.x = Math.PI;
              fpGroup.add(btmRing);

              // Plated Tube Barrel
              const barrelGeo = new THREE.CylinderGeometry(drill / 2 + 0.02, drill / 2 + 0.02, boardThickness + 0.04, 16, 1, true);
              const barrel = new THREE.Mesh(barrelGeo, padMat);
              barrel.rotation.x = Math.PI / 2;
              barrel.position.set(padX, padY, -boardThickness / 2);
              fpGroup.add(barrel);

              // Dark Drill Hole Core
              const holeGeo = new THREE.CylinderGeometry(drill / 2 - 0.005, drill / 2 - 0.005, boardThickness + 0.06, 12);
              const hole = new THREE.Mesh(holeGeo, holeInteriorDarkMat);
              hole.rotation.x = Math.PI / 2;
              hole.position.set(padX, padY, -boardThickness / 2);
              fpGroup.add(hole);
            } else {
              // Surface Mount Pad (SMD)
              if (pad.shape === 'circle') {
                const padGeo = new THREE.CylinderGeometry(padW / 2, padW / 2, 0.035, 16);
                const padMesh = new THREE.Mesh(padGeo, padMat);
                padMesh.rotation.x = Math.PI / 2;
                padMesh.position.set(padX, padY, 0.02);
                fpGroup.add(padMesh);
              } else {
                const padGeo = new THREE.BoxGeometry(padW, padH, 0.035);
                const padMesh = new THREE.Mesh(padGeo, padMat);
                padMesh.position.set(padX, padY, 0.02);
                fpGroup.add(padMesh);
              }
            }
          });
        }

        // --- Render Silkscreen Graphic Outlines ---
        if (showSilkscreen && fp.shapes && fp.shapes.length > 0) {
          fp.shapes.forEach((shape) => {
            if (shape.type === 'rect' && Number.isFinite(shape.width) && Number.isFinite(shape.height)) {
              const sw = shape.width!;
              const sh = shape.height!;
              const sx = Number.isFinite(shape.x) ? shape.x! : 0;
              const sy = Number.isFinite(shape.y) ? -shape.y! : 0;
              const stroke = Number.isFinite(shape.strokeWidth) ? shape.strokeWidth! : 0.15;

              // Border outline using 4 line strips
              const topBar = new THREE.Mesh(new THREE.BoxGeometry(sw, stroke, 0.02), silkscreenWhiteMat);
              topBar.position.set(sx, sy + sh / 2, 0.035);
              fpGroup.add(topBar);

              const btmBar = new THREE.Mesh(new THREE.BoxGeometry(sw, stroke, 0.02), silkscreenWhiteMat);
              btmBar.position.set(sx, sy - sh / 2, 0.035);
              fpGroup.add(btmBar);

              const leftBar = new THREE.Mesh(new THREE.BoxGeometry(stroke, sh, 0.02), silkscreenWhiteMat);
              leftBar.position.set(sx - sw / 2, sy, 0.035);
              fpGroup.add(leftBar);

              const rightBar = new THREE.Mesh(new THREE.BoxGeometry(stroke, sh, 0.02), silkscreenWhiteMat);
              rightBar.position.set(sx + sw / 2, sy, 0.035);
              fpGroup.add(rightBar);
            } else if (shape.type === 'circle' && Number.isFinite(shape.radius)) {
              const r = shape.radius!;
              const sx = Number.isFinite(shape.x) ? shape.x! : 0;
              const sy = Number.isFinite(shape.y) ? -shape.y! : 0;
              const dotGeo = new THREE.CircleGeometry(r, 16);
              const dotMesh = new THREE.Mesh(dotGeo, silkscreenWhiteMat);
              dotMesh.position.set(sx, sy, 0.035);
              fpGroup.add(dotMesh);
            }
          });
        }

        // --- Render 3D Component Body ---
        if (showComponents) {
          const compBodyGroup = buildProceduralComponentBody(fp, {
            icMat: icPlasticBlackMat,
            metalMat: metallicShieldMat,
            tinMat: tinFinishMat,
            goldMat: goldFinishMat,
            silkMat: silkscreenWhiteMat,
          });
          if (compBodyGroup) {
            fpGroup.add(compBodyGroup);
          }
        }

        masterBoardGroup.add(fpGroup);
      });
    }

    // -------------------------------------------------------------
    // 9. Interactive Mouse / Touch Orbit & Pan Controls
    // -------------------------------------------------------------
    let isDragging = false;
    let isPanning = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isDragging = true;
      if (e.button === 2 || e.shiftKey) isPanning = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      const st = orbitStateRef.current;
      if (isDragging && !e.shiftKey) {
        st.targetRotZ += dx * 0.01;
        st.targetRotX += dy * 0.01;
        st.targetRotX = Math.max(0.01, Math.min(Math.PI - 0.01, st.targetRotX));
      } else if (isPanning || (isDragging && e.shiftKey)) {
        const panSpeed = st.zoomDist * 0.0015;
        st.panX -= dx * panSpeed;
        st.panY += dy * panSpeed;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      isPanning = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = orbitStateRef.current;
      const zoomFactor = e.deltaY * 0.0015;
      st.zoomDist = Math.max(st.minDist, Math.min(st.maxDist, st.zoomDist * (1 + zoomFactor)));
    };

    const canvasDom = renderer.domElement;
    canvasDom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvasDom.addEventListener('wheel', onWheel, { passive: false });
    canvasDom.addEventListener('contextmenu', (e) => e.preventDefault());

    // -------------------------------------------------------------
    // 10. Animation Render Loop
    // -------------------------------------------------------------
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const st = orbitStateRef.current;
      // Spherical coordinate system around board center target
      const cx = st.panX + st.zoomDist * Math.sin(st.targetRotX) * Math.sin(st.targetRotZ);
      const cy = st.panY - st.zoomDist * Math.sin(st.targetRotX) * Math.cos(st.targetRotZ);
      const cz = st.zoomDist * Math.cos(st.targetRotX);

      camera.position.set(cx, cy, cz);
      camera.lookAt(st.panX, st.panY, 0);

      renderer.render(scene, camera);
    };
    animate();

    // Auto fit camera view once at startup
    fitBoardView();

    // -------------------------------------------------------------
    // 11. Cleanup and Safe Resource Disposal
    // -------------------------------------------------------------
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      canvasDom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvasDom.removeEventListener('wheel', onWheel);

      // Recursive disposal of geometries and materials to avoid memory leaks
      resizeObserver.disconnect();
      masterBoardGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });

      renderer.dispose();
    };
  }, [project, soldermaskColor, showComponents, showSilkscreen, showCopper, isTransparent, theme, fitBoardView]);

  return (
    <div className="relative w-full h-full bg-cad-bg flex flex-col select-none overflow-hidden font-sans min-w-0 min-h-0">
      {/* 3D Top CAD Control Toolbar */}
      <header className="h-8 bg-cad-panel border-b border-cad-border px-2.5 flex items-center justify-between z-10 shrink-0 text-xs min-w-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="font-semibold text-cad-textHeading flex items-center gap-1.5">
            <Box size={14} className="text-blue-500 dark:text-blue-400" />
            3D Board Viewer
          </span>

          <div className="h-3.5 w-px bg-cad-border mx-0.5" />

          {/* Soldermask Color Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-cad-textMuted mr-0.5">Mask:</span>
            {[
              { name: 'KiCad Green', color: '#15803d' },
              { name: 'Matte Black', color: '#18181b' },
              { name: 'Royal Blue', color: '#1d4ed8' },
              { name: 'Signal Red', color: '#b91c1c' },
              { name: 'OSH Purple', color: '#6b21a8' },
              { name: 'Studio White', color: '#e2e8f0' },
            ].map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => setSoldermaskColor(c.color)}
                className={`w-3.5 h-3.5 rounded-xs border transition-all ${
                  soldermaskColor === c.color ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105' : 'border-cad-border opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>

          <div className="h-3.5 w-px bg-cad-border mx-0.5" />

          {/* Layer Visibility Toggles */}
          <button
            onClick={() => setShowComponents(!showComponents)}
            className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1 transition-colors duration-fast ${
              showComponents ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold' : 'bg-cad-subpanel text-cad-textMuted border border-cad-border hover:text-cad-text'
            }`}
          >
            {showComponents ? <Eye size={12} /> : <EyeOff size={12} />}
            Components
          </button>

          <button
            onClick={() => setShowSilkscreen(!showSilkscreen)}
            className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1 transition-colors duration-fast ${
              showSilkscreen ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold' : 'bg-cad-subpanel text-cad-textMuted border border-cad-border hover:text-cad-text'
            }`}
          >
            <Layers size={12} />
            Silkscreen
          </button>

          <button
            onClick={() => setShowCopper(!showCopper)}
            className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1 transition-colors duration-fast ${
              showCopper ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold' : 'bg-cad-subpanel text-cad-textMuted border border-cad-border hover:text-cad-text'
            }`}
          >
            <Layers size={12} />
            Copper
          </button>

          <button
            onClick={() => setIsTransparent(!isTransparent)}
            className={`px-2 py-0.5 rounded-xs text-[11px] font-medium flex items-center gap-1 transition-colors duration-fast ${
              isTransparent ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold' : 'bg-cad-subpanel text-cad-textMuted border border-cad-border hover:text-cad-text'
            }`}
          >
            <Layers size={12} />
            X-Ray
          </button>
        </div>

        {/* Camera Preset Quick Actions */}
        <div className="flex items-center space-x-1.5 text-[11px] text-cad-textMuted shrink-0 ml-2">
          <button
            onClick={setTopView}
            className="px-2 py-0.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-xs border border-cad-border transition-colors duration-fast"
            title="View Top Surface"
          >
            Top
          </button>
          <button
            onClick={setBottomView}
            className="px-2 py-0.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-xs border border-cad-border transition-colors duration-fast"
            title="View Bottom Surface"
          >
            Bottom
          </button>
          <button
            onClick={fitBoardView}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xs font-medium flex items-center gap-1 shadow-xs transition-colors duration-fast"
            title="Re-fit Isometric Board View"
          >
            <Compass size={12} />
            Fit Board
          </button>
        </div>
      </header>

      {/* 3D Canvas Container */}
      <main className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing min-w-0 min-h-0 overflow-hidden">
        <div ref={containerRef} className="w-full h-full min-w-0 min-h-0 block" />
      </main>

      {/* Bottom Controls Info Banner */}
      <footer className="h-6 bg-cad-header border-t border-cad-border px-3 flex items-center justify-between text-[10px] text-cad-textMuted font-mono select-none shrink-0 min-w-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-3 shrink-0">
          <span>Dimensions: {project.pcb.boardOutline.length >= 3 ? `${Math.round(Math.max(10, Math.max(...project.pcb.boardOutline.map(p=>p.x)) - Math.min(...project.pcb.boardOutline.map(p=>p.x))))}×${Math.round(Math.max(10, Math.max(...project.pcb.boardOutline.map(p=>p.y)) - Math.min(...project.pcb.boardOutline.map(p=>p.y))))}mm` : 'Auto'}</span>
          <span>Thickness: {project.pcb.boardThickness || 1.6}mm</span>
          <span>Components: {project.pcb.footprints.length}</span>
        </div>
        <div className="flex items-center space-x-3 shrink-0 ml-4">
          <span>Left-Drag: Rotate</span>
          <span>Right-Drag: Pan</span>
          <span>Wheel: Zoom</span>
        </div>
      </footer>
    </div>
  );
};

// ============================================================================
// PROCEDURAL 3D COMPONENT MODEL BUILDER (High-Fidelity Engineering Models)
// ============================================================================

interface MaterialDict {
  icMat: THREE.Material;
  metalMat: THREE.Material;
  tinMat: THREE.Material;
  goldMat: THREE.Material;
  silkMat: THREE.Material;
}

function buildProceduralComponentBody(fp: PCBFootprintInstance, mats: MaterialDict): THREE.Group {
  const group = new THREE.Group();
  const pkg = (fp.model3D?.packageType || fp.footprintDefId || '').toUpperCase();
  const ref = (fp.reference || '').toUpperCase();
  const val = (fp.value || '').toUpperCase();
  const isTHT = fp.pads.some((p) => p.type === 'through_hole') || pkg.includes('THT');

  // 1. ESP32 / Wireless Modules (Shield Can + PCB Antenna + MIFA)
  if (pkg.includes('ESP32') || pkg.includes('WROOM') || pkg.includes('MODULE') || val.includes('ESP32')) {
    // RF Metal Shield Can
    const canGeo = new THREE.BoxGeometry(18.0, 18.0, 2.8);
    const canMesh = new THREE.Mesh(canGeo, mats.metalMat);
    canMesh.position.set(0, 2.0, 1.4 + 0.04);
    group.add(canMesh);

    // Module Sub-PCB Antenna Section
    const antSubGeo = new THREE.BoxGeometry(18.0, 6.5, 0.8);
    const antSubMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.5 });
    const antSubMesh = new THREE.Mesh(antSubGeo, antSubMat);
    antSubMesh.position.set(0, -10.0, 0.4 + 0.04);
    group.add(antSubMesh);

    // Copper MIFA Antenna Trace
    const mifaGeo = new THREE.BoxGeometry(14.0, 4.0, 0.04);
    const mifaMesh = new THREE.Mesh(mifaGeo, mats.goldMat);
    mifaMesh.position.set(0, -10.0, 0.82 + 0.04);
    group.add(mifaMesh);
    return group;
  }

  // 2. QFP / LQFP ICs (STM32, MCU, etc.)
  if (pkg.includes('LQFP') || pkg.includes('QFP') || pkg.includes('TQFP') || (ref.startsWith('U') && pkg.includes('48'))) {
    const isLqfp48 = pkg.includes('48') || pkg.includes('7X7');
    const bodySize = isLqfp48 ? 7.0 : 10.0;
    const height = 1.4;

    // Molded Plastic Epoxy Body
    const icGeo = new THREE.BoxGeometry(bodySize, bodySize, height);
    const icMesh = new THREE.Mesh(icGeo, mats.icMat);
    icMesh.position.set(0, 0, height / 2 + 0.04);
    group.add(icMesh);

    // Pin 1 Index Dot
    const dotGeo = new THREE.CircleGeometry(0.35, 16);
    const dotMesh = new THREE.Mesh(dotGeo, mats.silkMat);
    dotMesh.position.set(-bodySize / 2 + 0.9, bodySize / 2 - 0.9, height + 0.045);
    group.add(dotMesh);

    // Gull-Wing Lead Pins (All 4 sides)
    const pinsPerSide = isLqfp48 ? 12 : 16;
    const pitch = bodySize / (pinsPerSide + 1);
    const pinLen = 1.2;
    const pinW = 0.25;

    for (let i = 0; i < pinsPerSide; i++) {
      const offset = (i - (pinsPerSide - 1) / 2) * pitch;

      // Left pins
      const pl = new THREE.Mesh(new THREE.BoxGeometry(pinLen, pinW, 0.15), mats.tinMat);
      pl.position.set(-bodySize / 2 - pinLen / 2 + 0.2, offset, 0.15);
      group.add(pl);

      // Right pins
      const pr = new THREE.Mesh(new THREE.BoxGeometry(pinLen, pinW, 0.15), mats.tinMat);
      pr.position.set(bodySize / 2 + pinLen / 2 - 0.2, offset, 0.15);
      group.add(pr);

      // Top pins
      const pt = new THREE.Mesh(new THREE.BoxGeometry(pinW, pinLen, 0.15), mats.tinMat);
      pt.position.set(offset, bodySize / 2 + pinLen / 2 - 0.2, 0.15);
      group.add(pt);

      // Bottom pins
      const pb = new THREE.Mesh(new THREE.BoxGeometry(pinW, pinLen, 0.15), mats.tinMat);
      pb.position.set(offset, -bodySize / 2 - pinLen / 2 + 0.2, 0.15);
      group.add(pb);
    }
    return group;
  }

  // 3. SOIC / SOP / TSSOP / MSOP (SOIC-8, SOIC-14, SOIC-16, etc.)
  if (pkg.includes('SOIC') || pkg.includes('SOP') || pkg.includes('TSSOP') || pkg.includes('MSOP') || pkg.includes('SO-')) {
    const isSoic8 = pkg.includes('8') || fp.pads.length <= 8;
    const bodyW = 3.9;
    const bodyH = isSoic8 ? 4.9 : 8.6;
    const bodyZ = 1.4;

    const icGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyZ);
    const icMesh = new THREE.Mesh(icGeo, mats.icMat);
    icMesh.position.set(0, 0, bodyZ / 2 + 0.04);
    group.add(icMesh);

    // Pin 1 Chamfer Notch
    const notchGeo = new THREE.CircleGeometry(0.3, 16);
    const notch = new THREE.Mesh(notchGeo, mats.silkMat);
    notch.position.set(-bodyW / 2 + 0.6, bodyH / 2 - 0.6, bodyZ + 0.045);
    group.add(notch);

    // Dual-row Gull-Wing Pins
    const pinCount = isSoic8 ? 4 : 8;
    const pitch = 1.27;
    for (let i = 0; i < pinCount; i++) {
      const py = (i - (pinCount - 1) / 2) * pitch;
      const pl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.15), mats.tinMat);
      pl.position.set(-bodyW / 2 - 0.5, py, 0.15);
      group.add(pl);

      const pr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.15), mats.tinMat);
      pr.position.set(bodyW / 2 + 0.5, py, 0.15);
      group.add(pr);
    }
    return group;
  }

  // 4. QFN / DFN Leadless Packages (Sensirion SHT31, QFN-32, etc.)
  if (pkg.includes('QFN') || pkg.includes('DFN')) {
    const isDfn8 = pkg.includes('DFN-8') || fp.pads.length <= 8;
    const bodySize = isDfn8 ? 2.5 : 5.0;
    const height = 0.8;

    const qfnGeo = new THREE.BoxGeometry(bodySize, bodySize, height);
    const qfnMesh = new THREE.Mesh(qfnGeo, mats.icMat);
    qfnMesh.position.set(0, 0, height / 2 + 0.04);
    group.add(qfnMesh);

    const dotGeo = new THREE.CircleGeometry(0.2, 12);
    const dot = new THREE.Mesh(dotGeo, mats.silkMat);
    dot.position.set(-bodySize / 2 + 0.4, bodySize / 2 - 0.4, height + 0.045);
    group.add(dot);
    return group;
  }

  // 5. SOT Packages (SOT-23, SOT-23-5, SOT-223, SOT-89)
  if (pkg.includes('SOT-23') || pkg.includes('SOT23') || pkg.includes('SOT-223') || pkg.includes('SOT-89')) {
    const isSot223 = pkg.includes('223');
    const bodyW = isSot223 ? 6.5 : 2.9;
    const bodyH = isSot223 ? 3.5 : 1.6;
    const bodyZ = isSot223 ? 1.6 : 1.1;

    const sotGeo = new THREE.BoxGeometry(bodyW, bodyH, bodyZ);
    const sotMesh = new THREE.Mesh(sotGeo, mats.icMat);
    sotMesh.position.set(0, 0, bodyZ / 2 + 0.04);
    group.add(sotMesh);

    // Gull-wing pins
    const pinW = isSot223 ? 0.7 : 0.4;
    const pinL = isSot223 ? 1.0 : 0.6;
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(pinW, pinL, 0.15), mats.tinMat);
    p1.position.set(-0.95, -bodyH / 2 - pinL / 2, 0.12);
    group.add(p1);

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(pinW, pinL, 0.15), mats.tinMat);
    p2.position.set(0.95, -bodyH / 2 - pinL / 2, 0.12);
    group.add(p2);

    const p3 = new THREE.Mesh(new THREE.BoxGeometry(pinW, pinL, 0.15), mats.tinMat);
    p3.position.set(0, bodyH / 2 + pinL / 2, 0.12);
    group.add(p3);
    return group;
  }

  // 6. USB-C & USB Receptacles
  if (pkg.includes('USB') || pkg.includes('TYPE-C') || ref.startsWith('J') && val.includes('USB')) {
    const isTypeC = pkg.includes('C') || val.includes('C');
    const width = isTypeC ? 8.94 : 7.5;
    const length = isTypeC ? 7.3 : 6.0;
    const height = 3.2;

    // Metallic outer shell
    const shellGeo = new THREE.BoxGeometry(width, length, height);
    const shellMesh = new THREE.Mesh(shellGeo, mats.metalMat);
    shellMesh.position.set(0, 0, height / 2 + 0.04);
    group.add(shellMesh);

    // Receptacle opening cavity
    const mouthGeo = new THREE.BoxGeometry(width - 0.8, 1.2, height - 0.8);
    const mouthMesh = new THREE.Mesh(mouthGeo, mats.icMat);
    mouthMesh.position.set(0, -length / 2 + 0.6, height / 2 + 0.04);
    group.add(mouthMesh);

    // Central tongue inside connector
    const tongueGeo = new THREE.BoxGeometry(width - 2.2, 3.5, 0.65);
    const tongueMesh = new THREE.Mesh(tongueGeo, mats.icMat);
    tongueMesh.position.set(0, -0.5, height / 2 + 0.04);
    group.add(tongueMesh);
    return group;
  }

  // 7. SMD LEDs (0603, 0805, 1206)
  if ((ref.startsWith('D') && val.includes('LED')) || pkg.includes('LED_SMD') || (pkg.includes('LED') && !isTHT)) {
    const ledColor = val.includes('RED') ? 0xef4444 : val.includes('BLUE') ? 0x3b82f6 : val.includes('YELLOW') ? 0xeab308 : 0x22c55e;
    const domeMat = new THREE.MeshStandardMaterial({
      color: ledColor,
      roughness: 0.1,
      metalness: 0.1,
      emissive: ledColor,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.85,
    });

    const is0603 = pkg.includes('0603');
    const chipW = is0603 ? 1.6 : 2.0;
    const chipH = is0603 ? 0.8 : 1.25;
    const chipZ = 0.8;

    // Clear epoxy dome lens
    const chipGeo = new THREE.BoxGeometry(chipW, chipH, chipZ);
    const chipMesh = new THREE.Mesh(chipGeo, domeMat);
    chipMesh.position.set(0, 0, chipZ / 2 + 0.04);
    group.add(chipMesh);

    // Green Cathode Line
    const catGeo = new THREE.BoxGeometry(0.3, chipH, 0.02);
    const catMat = new THREE.MeshBasicMaterial({ color: 0x15803d });
    const catMesh = new THREE.Mesh(catGeo, catMat);
    catMesh.position.set(chipW / 2 - 0.2, 0, chipZ + 0.045);
    group.add(catMesh);

    // Solder end terminals
    const termW = 0.45;
    const cap1 = new THREE.Mesh(new THREE.BoxGeometry(termW, chipH + 0.05, chipZ + 0.05), mats.tinMat);
    cap1.position.set(-chipW / 2 + termW / 2, 0, chipZ / 2 + 0.04);
    group.add(cap1);

    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(termW, chipH + 0.05, chipZ + 0.05), mats.tinMat);
    cap2.position.set(chipW / 2 - termW / 2, 0, chipZ / 2 + 0.04);
    group.add(cap2);
    return group;
  }

  // 8. SMD Passive Resistors & Capacitors (0402, 0603, 0805, 1206, 1210)
  if (pkg.includes('0402') || pkg.includes('0603') || pkg.includes('0805') || pkg.includes('1206') || pkg.includes('1210') || (!isTHT && (ref.startsWith('R') || ref.startsWith('C') || ref.startsWith('L')))) {
    const isCap = ref.startsWith('C');
    const is0402 = pkg.includes('0402');
    const is0603 = pkg.includes('0603');
    const is1206 = pkg.includes('1206');

    const length = is0402 ? 1.0 : is0603 ? 1.6 : is1206 ? 3.2 : 2.0;
    const width = is0402 ? 0.5 : is0603 ? 0.8 : is1206 ? 1.6 : 1.25;
    const height = is0402 ? 0.4 : is0603 ? 0.5 : is1206 ? 0.9 : 0.65;

    // Resistors are black with white text; Capacitors are brownish tan ceramic
    const bodyMat = isCap
      ? new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.35, metalness: 0.05 }) // Tan ceramic
      : mats.icMat;

    const bodyGeo = new THREE.BoxGeometry(length, width, height);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 0, height / 2 + 0.04);
    group.add(bodyMesh);

    // Silver End Terminals
    const termW = length * 0.25;
    const term1 = new THREE.Mesh(new THREE.BoxGeometry(termW, width + 0.04, height + 0.04), mats.tinMat);
    term1.position.set(-length / 2 + termW / 2, 0, height / 2 + 0.04);
    group.add(term1);

    const term2 = new THREE.Mesh(new THREE.BoxGeometry(termW, width + 0.04, height + 0.04), mats.tinMat);
    term2.position.set(length / 2 - termW / 2, 0, height / 2 + 0.04);
    group.add(term2);
    return group;
  }

  // 9. Through-Hole 5mm / 3mm LEDs
  if (pkg.includes('LED') && isTHT) {
    const ledColor = val.includes('RED') ? 0xef4444 : val.includes('BLUE') ? 0x3b82f6 : 0x22c55e;
    const epoxyMat = new THREE.MeshStandardMaterial({
      color: ledColor,
      roughness: 0.1,
      emissive: ledColor,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85,
    });

    const radius = 2.5;
    const height = 4.5;

    // Cylinder Body
    const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 16);
    const cylMesh = new THREE.Mesh(cylGeo, epoxyMat);
    cylMesh.rotation.x = Math.PI / 2;
    cylMesh.position.set(0, 0, height / 2 + 0.04);
    group.add(cylMesh);

    // Dome Head
    const domeGeo = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, epoxyMat);
    domeMesh.position.set(0, 0, height + 0.04);
    group.add(domeMesh);
    return group;
  }

  // 10. Through-Hole Axial Resistors & Diodes (DIN0207, DO-41)
  if (isTHT && (ref.startsWith('R') || ref.startsWith('D') || pkg.includes('AXIAL') || pkg.includes('DO-41'))) {
    const isDiode = ref.startsWith('D');
    const bodyMat = isDiode ? mats.icMat : new THREE.MeshStandardMaterial({ color: 0xd4b886, roughness: 0.4 });
    const rLen = 5.5;
    const rRadius = 1.2;

    const bodyGeo = new THREE.CylinderGeometry(rRadius, rRadius, rLen, 16);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.rotation.y = Math.PI / 2;
    bodyMesh.position.set(0, 0, rRadius + 0.2);
    group.add(bodyMesh);

    if (isDiode) {
      // Cathode silver ring
      const ringGeo = new THREE.CylinderGeometry(rRadius + 0.02, rRadius + 0.02, 0.8, 16);
      const ringMesh = new THREE.Mesh(ringGeo, mats.tinMat);
      ringMesh.rotation.y = Math.PI / 2;
      ringMesh.position.set(rLen / 2 - 1.0, 0, rRadius + 0.2);
      group.add(ringMesh);
    }
    return group;
  }

  // 11. Through-Hole Pin Headers & Sockets
  if (pkg.includes('HEADER') || pkg.includes('PINHEADER') || ref.startsWith('J')) {
    const pinCount = Math.max(2, fp.pads.length);
    const pitch = 2.54;
    const baseW = 2.5;
    const baseL = pinCount * pitch;
    const baseH = 2.5;

    // Black plastic carrier block
    const baseGeo = new THREE.BoxGeometry(baseW, baseL, baseH);
    const baseMesh = new THREE.Mesh(baseGeo, mats.icMat);
    baseMesh.position.set(0, 0, baseH / 2 + 0.04);
    group.add(baseMesh);

    // Square gold connector pins
    for (let i = 0; i < pinCount; i++) {
      const py = (i - (pinCount - 1) / 2) * pitch;
      const pinGeo = new THREE.BoxGeometry(0.64, 0.64, 6.0);
      const pinMesh = new THREE.Mesh(pinGeo, mats.goldMat);
      pinMesh.position.set(0, py, 3.0 + 0.04);
      group.add(pinMesh);
    }
    return group;
  }

  // 12. Tactile Push Button Switches (6x6mm)
  if (pkg.includes('SW') || pkg.includes('BUTTON') || ref.startsWith('SW')) {
    const btnSize = 6.0;
    const btnHeight = 3.5;

    // Molded base
    const baseGeo = new THREE.BoxGeometry(btnSize, btnSize, btnHeight);
    const baseMesh = new THREE.Mesh(baseGeo, mats.icMat);
    baseMesh.position.set(0, 0, btnHeight / 2 + 0.04);
    group.add(baseMesh);

    // Metal top bracket
    const topGeo = new THREE.BoxGeometry(btnSize - 0.2, btnSize - 0.2, 0.4);
    const topMesh = new THREE.Mesh(topGeo, mats.metalMat);
    topMesh.position.set(0, 0, btnHeight + 0.04);
    group.add(topMesh);

    // Round colored plunger actuator
    const actGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.8, 16);
    const actMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
    const actMesh = new THREE.Mesh(actGeo, actMat);
    actMesh.rotation.x = Math.PI / 2;
    actMesh.position.set(0, 0, btnHeight + 0.9 + 0.04);
    group.add(actMesh);
    return group;
  }

  // 13. General Procedural IC / Component Body Fallback (Proportionally sized to pad footprint)
  let minPadX = Infinity, maxPadX = -Infinity, minPadY = Infinity, maxPadY = -Infinity;
  if (fp.pads && fp.pads.length > 0) {
    fp.pads.forEach((p) => {
      minPadX = Math.min(minPadX, p.x - p.width / 2);
      maxPadX = Math.max(maxPadX, p.x + p.width / 2);
      minPadY = Math.min(minPadY, p.y - p.height / 2);
      maxPadY = Math.max(maxPadY, p.y + p.height / 2);
    });
  }

  const spanX = Number.isFinite(maxPadX - minPadX) ? Math.max(1.8, (maxPadX - minPadX) * 0.85) : 3.0;
  const spanY = Number.isFinite(maxPadY - minPadY) ? Math.max(1.8, (maxPadY - minPadY) * 0.85) : 3.0;
  const compH = 1.0;

  const genGeo = new THREE.BoxGeometry(spanX, spanY, compH);
  const genMesh = new THREE.Mesh(genGeo, mats.icMat);
  genMesh.position.set(0, 0, compH / 2 + 0.04);
  group.add(genMesh);

  // Subtle Pin 1 marker
  const dotGeo = new THREE.CircleGeometry(0.25, 12);
  const dotMesh = new THREE.Mesh(dotGeo, mats.silkMat);
  dotMesh.position.set(-spanX / 2 + 0.4, spanY / 2 - 0.4, compH + 0.045);
  group.add(dotMesh);

  return group;
}
