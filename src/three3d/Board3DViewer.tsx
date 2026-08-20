/**
 * Apex EDA - WebGL 3D Board Viewer (Three.js)
 * Real multi-layer board extrusion, realistic FR4 core, soldermask, copper traces, and 3D component models.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ApexProject } from '../core/types';
import { Layers, Eye, EyeOff, RotateCcw, Box, Camera, Download } from 'lucide-react';

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

  const [soldermaskColor, setSoldermaskColor] = useState<string>(
    project.pcb.solderMaskColor || '#15803d'
  );
  const [showComponents, setShowComponents] = useState<boolean>(true);
  const [showSilkscreen, setShowSilkscreen] = useState<boolean>(true);
  const [isTransparent, setIsTransparent] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const colors = getCanvasColors(theme);

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.canvasBg);
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
    const boardThickness = pcb.boardThickness || 1.6; // standard or custom stackup thickness

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
        const isTHT = fp.pads.some((p) => p.type === 'through_hole') || pkg.includes('THT');

        if (pkg.includes('ESP32') || pkg.includes('WROOM')) {
          // ESP32-WROOM-32 Module (Shield Can + PCB Antenna)
          const canGeo = new THREE.BoxGeometry(18.0, 18.0, 2.8);
          const canMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
          const canMesh = new THREE.Mesh(canGeo, canMat);
          canMesh.position.set(0, 2.0, 1.4);
          compGroup.add(canMesh);

          // PCB Antenna area
          const antGeo = new THREE.BoxGeometry(18.0, 6.0, 0.8);
          const antMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
          const antMesh = new THREE.Mesh(antGeo, antMat);
          antMesh.position.set(0, -9.5, 0.4);
          compGroup.add(antMesh);
        } else if (pkg.includes('SW_Push') || pkg.includes('Button') || fp.reference.startsWith('SW')) {
          // Tactile Push Button 6x6mm (Black Body + Round Actuator)
          const btnGeo = new THREE.BoxGeometry(6.0, 6.0, 3.5);
          const btnMesh = new THREE.Mesh(btnGeo, icBlackMat);
          btnMesh.position.set(0, 0, 1.75);
          compGroup.add(btnMesh);

          const actGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.5, 16);
          const actMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
          const actMesh = new THREE.Mesh(actGeo, actMat);
          actMesh.rotation.x = Math.PI / 2;
          actMesh.position.set(0, 0, 4.25);
          compGroup.add(actMesh);
        } else if (pkg.includes('LQFP-48') || pkg.includes('QFP')) {
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
        } else if (pkg.includes('LED_5mm') || pkg.includes('LED_D5') || (fp.reference.startsWith('D') && fp.value.toUpperCase().includes('LED'))) {
          // 5mm Through-Hole LED (Dome + Rim + Epoxy Lens)
          const ledColor = fp.value.toUpperCase().includes('RED') ? 0xef4444 : fp.value.toUpperCase().includes('BLUE') ? 0x3b82f6 : 0x22c55e;
          const ledMat = new THREE.MeshStandardMaterial({
            color: ledColor,
            roughness: 0.1,
            metalness: 0.1,
            emissive: ledColor,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.85,
          });

          // Cylinder base
          const baseGeo = new THREE.CylinderGeometry(2.5, 2.5, 4.0, 16);
          const baseMesh = new THREE.Mesh(baseGeo, ledMat);
          baseMesh.rotation.x = Math.PI / 2;
          baseMesh.position.set(0, 0, 2.0);
          compGroup.add(baseMesh);

          // Dome top
          const domeGeo = new THREE.SphereGeometry(2.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
          const domeMesh = new THREE.Mesh(domeGeo, ledMat);
          domeMesh.rotation.x = -Math.PI / 2;
          domeMesh.position.set(0, 0, 4.0);
          compGroup.add(domeMesh);
        } else if (pkg.includes('DO-41') || (pkg.includes('Diode') && isTHT)) {
          // Axial DO-41 Diode (1N5819 / 1N4007)
          const diodeBodyGeo = new THREE.CylinderGeometry(1.3, 1.3, 5.0, 16);
          const diodeBodyMesh = new THREE.Mesh(diodeBodyGeo, icBlackMat);
          diodeBodyMesh.rotation.z = Math.PI / 2;
          diodeBodyMesh.position.set(0, 0, 1.3);
          compGroup.add(diodeBodyMesh);

          // Cathode silver band
          const cathodeGeo = new THREE.CylinderGeometry(1.32, 1.32, 0.8, 16);
          const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
          const cathodeMesh = new THREE.Mesh(cathodeGeo, silverMat);
          cathodeMesh.rotation.z = Math.PI / 2;
          cathodeMesh.position.set(1.6, 0, 1.3);
          compGroup.add(cathodeMesh);

          // Axial leads
          const lead1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.5, 8), tinMat);
          lead1.rotation.z = Math.PI / 2;
          lead1.position.set(-3.8, 0, 1.3);
          compGroup.add(lead1);

          const lead2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.5, 8), tinMat);
          lead2.rotation.z = Math.PI / 2;
          lead2.position.set(3.8, 0, 1.3);
          compGroup.add(lead2);
        } else if (pkg.includes('Axial') || (fp.reference.startsWith('R') && isTHT)) {
          // Through-Hole Axial Resistor DIN0207
          const rBodyGeo = new THREE.CylinderGeometry(1.2, 1.2, 6.0, 16);
          const tanMat = new THREE.MeshStandardMaterial({ color: 0xd4b886, roughness: 0.5 });
          const rBodyMesh = new THREE.Mesh(rBodyGeo, tanMat);
          rBodyMesh.rotation.z = Math.PI / 2;
          rBodyMesh.position.set(0, 0, 1.2);
          compGroup.add(rBodyMesh);

          // Color bands (Brown, Black, Red for 1k)
          const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x854d0e }));
          b1.rotation.z = Math.PI / 2;
          b1.position.set(-1.8, 0, 1.2);
          compGroup.add(b1);

          const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.4, 16), icBlackMat);
          b2.rotation.z = Math.PI / 2;
          b2.position.set(-0.8, 0, 1.2);
          compGroup.add(b2);

          const b3 = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
          b3.rotation.z = Math.PI / 2;
          b3.position.set(0.2, 0, 1.2);
          compGroup.add(b3);
        } else if (pkg.includes('PinHeader') || pkg.includes('Header')) {
          // Pin Header (Black base + Gold Pins)
          const baseGeo = new THREE.BoxGeometry(2.5, 5.0, 2.5);
          const baseMesh = new THREE.Mesh(baseGeo, icBlackMat);
          baseMesh.position.set(0, 0, 1.25);
          compGroup.add(baseMesh);

          const pin1 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 6.0), goldMat);
          pin1.position.set(0, -1.27, 3.0);
          compGroup.add(pin1);

          const pin2 = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.64, 6.0), goldMat);
          pin2.position.set(0, 1.27, 3.0);
          compGroup.add(pin2);
        } else if (pkg.includes('TerminalBlock')) {
          // Phoenix Screw Terminal Block (Green Body + Screws)
          const tbMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.3 });
          const tbGeo = new THREE.BoxGeometry(10.0, 8.0, 10.0);
          const tbMesh = new THREE.Mesh(tbGeo, tbMat);
          tbMesh.position.set(0, 0, 5.0);
          compGroup.add(tbMesh);
        } else if (pkg.includes('Disc') || (fp.reference.startsWith('C') && isTHT && fp.value.includes('nF'))) {
          // Ceramic Disc Capacitor (Orange / Tan Disc)
          const discGeo = new THREE.CylinderGeometry(2.5, 2.5, 1.8, 16);
          const discMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
          const discMesh = new THREE.Mesh(discGeo, discMat);
          discMesh.rotation.z = Math.PI / 2;
          discMesh.position.set(0, 0, 3.0);
          compGroup.add(discMesh);
        } else if (pkg.includes('Radial') || pkg.includes('CP_') || (fp.reference.startsWith('C') && (fp.value.includes('uF') && parseInt(fp.value) >= 10))) {
          // Aluminum Electrolytic Radial Can
          const canGeo = new THREE.CylinderGeometry(3.15, 3.15, 7.5, 16);
          const canMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
          const canMesh = new THREE.Mesh(canGeo, canMat);
          canMesh.rotation.x = Math.PI / 2;
          canMesh.position.set(0, 0, 3.75);
          compGroup.add(canMesh);

          // Vent top
          const topGeo = new THREE.CircleGeometry(3.0, 16);
          const topMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
          const topMesh = new THREE.Mesh(topGeo, topMat);
          topMesh.position.set(0, 0, 7.51);
          compGroup.add(topMesh);
        } else if (pkg.includes('Diode') || (fp.reference.startsWith('D') && !fp.value.toUpperCase().includes('LED'))) {
          // SMD Diode (SMA / SOD-123) with Cathode Polarity Band
          const dGeo = new THREE.BoxGeometry(3.6, 2.2, 1.4);
          const dMesh = new THREE.Mesh(dGeo, icBlackMat);
          dMesh.position.set(0, 0, 0.7);
          compGroup.add(dMesh);

          // Cathode white stripe
          const bandGeo = new THREE.BoxGeometry(0.5, 2.22, 1.42);
          const bandMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
          const bandMesh = new THREE.Mesh(bandGeo, bandMat);
          bandMesh.position.set(-1.1, 0, 0.7);
          compGroup.add(bandMesh);
        } else if (pkg.includes('Fuse') || fp.reference.startsWith('F')) {
          // Polyfuse / Resettable Fuse SMD or Cartridge
          const fuseGeo = new THREE.BoxGeometry(4.5, 3.2, 1.0);
          const fuseMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 });
          const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
          fuseMesh.position.set(0, 0, 0.5);
          compGroup.add(fuseMesh);
        } else {
          // Missing 3D Package Indicator (Translucent Wireframe / Warning Box)
          const genGeo = new THREE.BoxGeometry(
            Math.max(2, fp.courtyard.maxX - fp.courtyard.minX),
            Math.max(2, fp.courtyard.maxY - fp.courtyard.minY),
            1.2
          );
          const warnMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            wireframe: true,
            emissive: 0xb45309,
            emissiveIntensity: 0.4,
          });
          const genMesh = new THREE.Mesh(genGeo, warnMat);
          genMesh.position.set(0, 0, 0.6);
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
  }, [project, soldermaskColor, showComponents, showSilkscreen, isTransparent, theme]);

  return (
    <div className="relative w-full h-full bg-cad-bg flex flex-col select-none">
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
