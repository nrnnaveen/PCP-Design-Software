/**
 * Apex EDA - WebGL 3D Board Viewer (Three.js)
 * Real multi-layer board extrusion, realistic FR4 core, soldermask, copper traces, and 3D component models.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ApexProject } from '../core/types';
import { Layers, Eye, EyeOff, RotateCcw, Box, Camera, Download } from 'lucide-react';

interface Props {
  project: ApexProject;
  onSelectComponent?: (reference: string) => void;
}

export const Board3DViewer: React.FC<Props> = ({ project, onSelectComponent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [soldermaskColor, setSoldermaskColor] = useState<string>('#15803d'); // Standard Green
  const [showComponents, setShowComponents] = useState<boolean>(true);
  const [showSilkscreen, setShowSilkscreen] = useState<boolean>(true);
  const [isTransparent, setIsTransparent] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14171c);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(38, -60, 60);
    camera.up.set(0, 0, 1); // Z is UP
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(50, -50, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x94a3b8, 0.6);
    dirLight2.position.set(-50, 50, -100);
    scene.add(dirLight2);

    // 3. Build Board Geometry
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const pcb = project.pcb;
    const boardThickness = 1.6; // standard 1.6mm

    // FR4 Substrate Extrusion from board outline
    const outlineShape = new THREE.Shape();
    if (pcb.boardOutline.length >= 3) {
      outlineShape.moveTo(pcb.boardOutline[0].x, pcb.boardOutline[0].y);
      for (let i = 1; i < pcb.boardOutline.length; i++) {
        outlineShape.lineTo(pcb.boardOutline[i].x, pcb.boardOutline[i].y);
      }
      outlineShape.closePath();

      // Add mounting holes cutouts
      pcb.graphics.forEach((g) => {
        if (g.layer === 'Edge.Cuts' && g.type === 'circle' && g.x !== undefined && g.y !== undefined && g.radius !== undefined) {
          const holePath = new THREE.Path();
          holePath.absarc(g.x, g.y, g.radius, 0, Math.PI * 2, true);
          outlineShape.holes.push(holePath);
        }
      });
    }

    const extrudeSettings = {
      depth: boardThickness,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    };

    const boardGeo = new THREE.ExtrudeGeometry(outlineShape, extrudeSettings);
    const boardMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(soldermaskColor),
      roughness: 0.35,
      metalness: 0.1,
      transparent: isTransparent,
      opacity: isTransparent ? 0.6 : 1.0,
    });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardGroup.add(boardMesh);

    // Materials
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.85,
      roughness: 0.25,
    });
    const tinMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.9,
      roughness: 0.2,
    });
    const copperTopMat = new THREE.MeshStandardMaterial({
      color: 0xe05638,
      metalness: 0.7,
      roughness: 0.3,
    });
    const silkMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
    });
    const icBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.1,
    });

    // 4. Render Copper Tracks in 3D
    pcb.tracks.forEach((track) => {
      const zPos = track.layer === 'F.Cu' ? boardThickness + 0.02 : -0.02;
      const len = Math.hypot(track.x2 - track.x1, track.y2 - track.y1);
      const angle = Math.atan2(track.y2 - track.y1, track.x2 - track.x1);

      const trackGeo = new THREE.BoxGeometry(len, track.width, 0.035);
      const trackMesh = new THREE.Mesh(trackGeo, track.layer === 'F.Cu' ? copperTopMat : goldMat);
      trackMesh.position.set((track.x1 + track.x2) / 2, (track.y1 + track.y2) / 2, zPos);
      trackMesh.rotation.z = angle;
      boardGroup.add(trackMesh);
    });

    // 5. Render Vias in 3D
    pcb.vias.forEach((via) => {
      const viaGeo = new THREE.CylinderGeometry(via.diameter / 2, via.diameter / 2, boardThickness + 0.1, 16);
      const viaMesh = new THREE.Mesh(viaGeo, goldMat);
      viaMesh.rotation.x = Math.PI / 2;
      viaMesh.position.set(via.x, via.y, boardThickness / 2);
      boardGroup.add(viaMesh);
    });

    // 6. Render Components & 3D Packages
    if (showComponents) {
      pcb.footprints.forEach((fp) => {
        const compGroup = new THREE.Group();
        compGroup.position.set(fp.x, fp.y, boardThickness + 0.02);
        compGroup.rotation.z = (fp.rotation * Math.PI) / 180;

        // Render Component Pads
        fp.pads.forEach((pad) => {
          const padMat = pad.type === 'through_hole' ? tinMat : goldMat;
          const padGeo = new THREE.BoxGeometry(pad.width, pad.height, 0.04);
          const padMesh = new THREE.Mesh(padGeo, padMat);
          padMesh.position.set(pad.x, pad.y, 0.02);
          compGroup.add(padMesh);
        });

        // Procedural 3D Package Bodies
        const pkg = fp.model3D?.packageType || fp.footprintDefId;

        if (pkg.includes('LQFP-48') || pkg.includes('QFP')) {
          // MCU Main Body
          const icGeo = new THREE.BoxGeometry(7.0, 7.0, 1.4);
          const icMesh = new THREE.Mesh(icGeo, icBlackMat);
          icMesh.position.set(0, 0, 0.7);
          compGroup.add(icMesh);

          // Dot marker Pin 1
          const dotGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 12);
          const dotMesh = new THREE.Mesh(dotGeo, silkMat);
          dotMesh.rotation.x = Math.PI / 2;
          dotMesh.position.set(-2.5, -2.5, 1.45);
          compGroup.add(dotMesh);

          // Gull-wing pins
          for (let i = -5; i <= 5; i++) {
            const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.15), tinMat);
            p1.position.set(-4.0, i * 0.5, 0.2);
            compGroup.add(p1);

            const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 0.15), tinMat);
            p2.position.set(4.0, i * 0.5, 0.2);
            compGroup.add(p2);
          }
        } else if (pkg.includes('0805') || pkg.includes('0603')) {
          // SMD Passive Chip (Resistor/Capacitor/LED)
          const isCap = fp.reference.startsWith('C');
          const isLed = fp.reference.startsWith('D');
          const bodyMat = isLed
            ? new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.1, emissive: 0x16a34a, emissiveIntensity: 0.6 })
            : isCap
            ? new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 })
            : icBlackMat;

          const chipGeo = new THREE.BoxGeometry(1.4, 1.2, 0.65);
          const chipMesh = new THREE.Mesh(chipGeo, bodyMat);
          chipMesh.position.set(0, 0, 0.35);
          compGroup.add(chipMesh);

          // Silver end terminals
          const cap1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.25, 0.68), tinMat);
          cap1.position.set(-0.8, 0, 0.35);
          compGroup.add(cap1);

          const cap2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.25, 0.68), tinMat);
          cap2.position.set(0.8, 0, 0.35);
          compGroup.add(cap2);
        } else if (pkg.includes('USB-C')) {
          // Metallic USB-C Receptacle
          const usbGeo = new THREE.BoxGeometry(8.9, 7.3, 3.2);
          const usbMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
          const usbMesh = new THREE.Mesh(usbGeo, usbMat);
          usbMesh.position.set(0, 0, 1.6);
          compGroup.add(usbMesh);

          // Center tongue inside connector
          const tongueGeo = new THREE.BoxGeometry(6.6, 5.0, 0.7);
          const tongueMesh = new THREE.Mesh(tongueGeo, icBlackMat);
          tongueMesh.position.set(0, 1.0, 1.6);
          compGroup.add(tongueMesh);
        } else if (pkg.includes('SOT-23')) {
          // SOT-23 Regulator
          const sotGeo = new THREE.BoxGeometry(2.9, 1.6, 1.1);
          const sotMesh = new THREE.Mesh(sotGeo, icBlackMat);
          sotMesh.position.set(0, 0, 0.55);
          compGroup.add(sotMesh);
        } else {
          // Generic SMD Block
          const genGeo = new THREE.BoxGeometry(Math.max(2, fp.courtyard.maxX - fp.courtyard.minX), Math.max(2, fp.courtyard.maxY - fp.courtyard.minY), 1.0);
          const genMesh = new THREE.Mesh(genGeo, icBlackMat);
          genMesh.position.set(0, 0, 0.5);
          compGroup.add(genMesh);
        }

        boardGroup.add(compGroup);
      });
    }

    // 7. Interactive Orbiting & Mouse Rotation Controls
    let isDragging = false;
    let isPanning = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotX = 0.5;
    let targetRotZ = -0.6;
    let zoomDist = 90;

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

      if (isDragging && !e.shiftKey) {
        targetRotZ += dx * 0.01;
        targetRotX += dy * 0.01;
        targetRotX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, targetRotX));
      } else if (isPanning || (isDragging && e.shiftKey)) {
        camera.position.x -= dx * 0.1;
        camera.position.y += dy * 0.1;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      isPanning = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomDist += e.deltaY * 0.05;
      zoomDist = Math.max(15, Math.min(250, zoomDist));
    };

    const canvasDom = renderer.domElement;
    canvasDom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvasDom.addEventListener('wheel', onWheel, { passive: false });
    canvasDom.addEventListener('contextmenu', (e) => e.preventDefault());

    // 8. Animation Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Spherical orbital camera
      const cx = 37.5 + zoomDist * Math.cos(targetRotX) * Math.sin(targetRotZ);
      const cy = 27.5 - zoomDist * Math.cos(targetRotX) * Math.cos(targetRotZ);
      const cz = zoomDist * Math.sin(targetRotX);

      camera.position.set(cx, cy, cz);
      camera.lookAt(37.5, 27.5, 0.8);

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvasDom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvasDom.removeEventListener('wheel', onWheel);
      renderer.dispose();
    };
  }, [project, soldermaskColor, showComponents, showSilkscreen, isTransparent]);

  return (
    <div className="relative w-full h-full bg-[#111418] flex flex-col select-none">
      {/* 3D Top Control Bar */}
      <div className="h-10 bg-cad-panel border-b border-cad-border px-3 flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Box size={14} className="text-blue-400" />
            3D Board Viewer
          </span>

          <div className="h-4 w-px bg-cad-border mx-1" />

          {/* Soldermask Color Picker */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-cad-textMuted mr-1">Mask:</span>
            {[
              { name: 'Green', color: '#15803d' },
              { name: 'Matte Black', color: '#0f172a' },
              { name: 'Blue', color: '#1d4ed8' },
              { name: 'Red', color: '#b91c1c' },
              { name: 'Purple', color: '#6b21a8' },
            ].map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => setSoldermaskColor(c.color)}
                className={`w-4 h-4 rounded-full border transition-all ${
                  soldermaskColor === c.color ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-cad-border mx-1" />

          {/* Toggle Toggles */}
          <button
            onClick={() => setShowComponents(!showComponents)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
              showComponents ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40' : 'bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            {showComponents ? <Eye size={12} /> : <EyeOff size={12} />}
            Components
          </button>

          <button
            onClick={() => setIsTransparent(!isTransparent)}
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
              isTransparent ? 'bg-amber-600/30 text-amber-400 border border-amber-500/40' : 'bg-cad-subpanel text-cad-textMuted'
            }`}
          >
            <Layers size={12} />
            X-Ray
          </button>
        </div>

        {/* Info hints */}
        <div className="text-[10px] text-cad-textMuted flex items-center gap-3 font-mono">
          <span>Left-Drag: Rotate</span>
          <span>Shift/Right-Drag: Pan</span>
          <span>Scroll: Zoom</span>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div ref={containerRef} className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing" />
    </div>
  );
};
