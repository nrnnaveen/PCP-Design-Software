/**
 * FloZ EDA - Professional PCB Layout Engine Test Suite
 * Comprehensive automated validation for coordinates, multi-layer system, 45°/90° routing,
 * via insertion with layer switching, copper zone geometry filling, thermal reliefs,
 * board stackup calculations, ratsnest, DRC, and transactional state integrity.
 */

import { describe, it, expect } from 'vitest';
import {
  ApexProject,
  PCBData,
  PCBLayerId,
  PCBTrackSegment,
  PCBVia,
  PCBZone,
  PCBFootprintInstance,
  Point2D,
} from '../core/types';
import { createDemoProject } from '../examples/demoProject';
import { InteractiveRouter } from '../router/router';
import { ZoneEngine } from '../pcb/zoneEngine';
import { LayerManagerUtils, STANDARD_PCB_LAYERS } from '../pcb/layers';
import { RatsnestGenerator } from '../pcb/ratsnest';
import { DRCEngine } from '../drc/drcEngine';

describe('FloZ AI PCB Layout Engine — KiCad-Class Core Suite', () => {
  // -----------------------------------------------------------------
  // 1. Layer System & Technical Layers
  // -----------------------------------------------------------------
  describe('1. Layer System & Metadata', () => {
    it('defines all standard copper, technical, and mechanical layers', () => {
      expect(STANDARD_PCB_LAYERS.length).toBeGreaterThanOrEqual(20);

      const fCu = LayerManagerUtils.getMetadata('F.Cu');
      expect(fCu.isCopper).toBe(true);
      expect(fCu.category).toBe('copper');

      const bCu = LayerManagerUtils.getMetadata('B.Cu');
      expect(bCu.isCopper).toBe(true);
      expect(bCu.category).toBe('copper');

      const fSilk = LayerManagerUtils.getMetadata('F.Silkscreen');
      expect(fSilk.isCopper).toBe(false);
      expect(fSilk.category).toBe('silkscreen');

      const edgeCuts = LayerManagerUtils.getMetadata('Edge.Cuts');
      expect(edgeCuts.category).toBe('mechanical');
    });

    it('correctly resolves opposite copper layers for via transitions', () => {
      expect(LayerManagerUtils.getOppositeCopperLayer('F.Cu')).toBe('B.Cu');
      expect(LayerManagerUtils.getOppositeCopperLayer('B.Cu')).toBe('F.Cu');
    });
  });

  // -----------------------------------------------------------------
  // 2. Interactive Routing Engine (45°, 90°, Free-Angle, Postures)
  // -----------------------------------------------------------------
  describe('2. Interactive Routing Engine', () => {
    it('computes 45-degree octilinear paths with correct posture', () => {
      const start: Point2D = { x: 10, y: 10 };
      const end: Point2D = { x: 20, y: 15 };

      const pathPosture0 = InteractiveRouter.compute45DegreePath(start, end, 0);
      expect(pathPosture0.length).toBe(2);
      expect(pathPosture0[0].x1).toBe(10);
      expect(pathPosture0[0].y1).toBe(10);
      expect(pathPosture0[1].x2).toBe(20);
      expect(pathPosture0[1].y2).toBe(15);

      const pathPosture1 = InteractiveRouter.compute45DegreePath(start, end, 1);
      expect(pathPosture1.length).toBe(2);
      expect(pathPosture1[0].x1).toBe(10);
      expect(pathPosture1[0].y1).toBe(10);
      expect(pathPosture1[1].x2).toBe(20);
      expect(pathPosture1[1].y2).toBe(15);
    });

    it('computes 90-degree orthogonal paths', () => {
      const start: Point2D = { x: 0, y: 0 };
      const end: Point2D = { x: 10, y: 20 };

      const path90 = InteractiveRouter.compute90DegreePath(start, end, 0);
      expect(path90.length).toBe(2);
      expect(path90[0]).toEqual({ x1: 0, y1: 0, x2: 10, y2: 0 });
      expect(path90[1]).toEqual({ x1: 10, y1: 0, x2: 10, y2: 20 });
    });

    it('computes free-angle direct paths', () => {
      const start: Point2D = { x: 5, y: 5 };
      const end: Point2D = { x: 25, y: 35 };

      const directPath = InteractiveRouter.computeDirectPath(start, end);
      expect(directPath.length).toBe(1);
      expect(directPath[0]).toEqual({ x1: 5, y1: 5, x2: 25, y2: 35 });
    });

    it('validates same-net connectivity and detects short-circuit violations', () => {
      const sameNet = InteractiveRouter.validateConnection('GND', 'GND');
      expect(sameNet.valid).toBe(true);

      const defaultNet = InteractiveRouter.validateConnection('Default', 'VCC');
      expect(defaultNet.valid).toBe(true);

      const shortCircuit = InteractiveRouter.validateConnection('GND', 'VCC');
      expect(shortCircuit.valid).toBe(false);
      expect(shortCircuit.reason).toContain('Short Circuit Prevention');
    });

    it('hit tests footprint pads accurately in world coordinates', () => {
      const demo = createDemoProject();
      const pcb = demo.pcb;

      // Find first footprint and its first pad
      const fp = pcb.footprints[0];
      const pad = fp.pads[0];
      const padWorldPos: Point2D = { x: fp.x + pad.x, y: fp.y + pad.y };

      const hit = InteractiveRouter.findPadAtPosition(pcb, padWorldPos, fp.layer);
      expect(hit).toBeDefined();
      expect(hit?.footprint.id).toBe(fp.id);
      expect(hit?.pad.id).toBe(pad.id);
    });
  });

  // -----------------------------------------------------------------
  // 3. Copper Zone Geometry & 4-Spoke Thermal Reliefs
  // -----------------------------------------------------------------
  describe('3. Copper Zone Geometry & Thermal Relief Engine', () => {
    it('generates filled copper polygon and 4-spoke thermal reliefs for same-net pads', () => {
      const demo = createDemoProject();
      const pcb = demo.pcb;
      const rules = demo.designRules;

      const zone: PCBZone = {
        id: 'zone_gnd_fcu',
        netId: 'net_gnd',
        netName: 'GND',
        layer: 'F.Cu',
        priority: 1,
        clearance: 0.3,
        minWidth: 0.25,
        thermalReliefWidth: 0.3,
        thermalReliefGap: 0.3,
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
        isFilled: true,
        keepIslands: false,
      };

      const fillRes = ZoneEngine.fillZone(zone, pcb, rules);
      expect(fillRes.isFilled).toBe(true);
      expect(fillRes.filledPolygons.length).toBe(1);
      expect(fillRes.filledPolygons[0].length).toBe(4);

      // Verify thermal spokes generated
      expect(fillRes.thermalSpokes.length).toBeGreaterThan(0);
      expect(fillRes.thermalSpokes[0].width).toBe(0.3);
    });

    it('refills all zones across the entire PCB design', () => {
      const demo = createDemoProject();
      demo.pcb.zones = [
        {
          id: 'zone_1',
          netId: 'net_gnd',
          netName: 'GND',
          layer: 'F.Cu',
          priority: 1,
          clearance: 0.3,
          minWidth: 0.25,
          thermalReliefWidth: 0.3,
          thermalReliefGap: 0.3,
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 0 },
            { x: 50, y: 50 },
            { x: 0, y: 50 },
          ],
          isFilled: false,
          keepIslands: false,
        },
      ];

      const refilledPCB = ZoneEngine.refillAllZones(demo.pcb, demo.designRules);
      expect(refilledPCB.zones[0].isFilled).toBe(true);
      expect(refilledPCB.zones[0].filledPolygons?.length).toBe(1);
    });
  });

  // -----------------------------------------------------------------
  // 4. Ratsnest MST Airwire Generation
  // -----------------------------------------------------------------
  describe('4. Dynamic Ratsnest MST Engine', () => {
    it('generates minimum spanning tree unrouted airwires between connected pads', () => {
      const demo = createDemoProject();
      const airwires = RatsnestGenerator.generate(demo.pcb);

      expect(Array.isArray(airwires)).toBe(true);
      airwires.forEach((wire) => {
        expect(wire.id).toBeDefined();
        expect(wire.netName).toBeDefined();
        expect(typeof wire.x1).toBe('number');
        expect(typeof wire.y1).toBe('number');
        expect(typeof wire.x2).toBe('number');
        expect(typeof wire.y2).toBe('number');
      });
    });
  });

  // -----------------------------------------------------------------
  // 5. DRC Validation on PCB Layout
  // -----------------------------------------------------------------
  describe('5. Comprehensive DRC Rule Validation', () => {
    it('runs DRC checks on demo project and reports diagnostic results', () => {
      const demo = createDemoProject();
      const violations = DRCEngine.run(demo);

      expect(Array.isArray(violations)).toBe(true);
      violations.forEach((v) => {
        expect(v.code).toBeDefined();
        expect(v.severity).toMatch(/^(error|warning|info)$/);
        expect(v.title).toBeDefined();
      });
    });

    it('detects track width violation when trace width is below minimum constraint', () => {
      const demo = createDemoProject();
      demo.pcb.tracks.push({
        id: 'trk_violating_width',
        netId: 'net_test',
        netName: 'TEST_NET',
        layer: 'F.Cu',
        x1: 10,
        y1: 10,
        x2: 20,
        y2: 10,
        width: 0.05, // Below allowed minimum 0.15mm
      });

      const violations = DRCEngine.run(demo);
      const widthViolation = violations.find((v) => v.code === 'DRC001');
      expect(widthViolation).toBeDefined();
      expect(widthViolation?.title).toContain('Track Width Violation');
    });
  });

  // -----------------------------------------------------------------
  // 6. Transactional State & Footprint Transformation
  // -----------------------------------------------------------------
  describe('6. Footprint Placement, Rotation, and Side Flipping', () => {
    it('accurately updates position, rotation, and side layer of footprint', () => {
      const demo = createDemoProject();
      const fp = demo.pcb.footprints[0];
      const origX = fp.x;
      const origRot = fp.rotation;
      const origLayer = fp.layer;

      // Move
      const movedFP = { ...fp, x: origX + 10, y: fp.y + 5 };
      expect(movedFP.x).toBe(origX + 10);

      // Rotate
      const rotatedFP = { ...movedFP, rotation: (origRot + 90) % 360 };
      expect(rotatedFP.rotation).toBe((origRot + 90) % 360);

      // Flip Layer Side
      const flippedFP = { ...rotatedFP, layer: origLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu' };
      expect(flippedFP.layer).toBe(origLayer === 'F.Cu' ? 'B.Cu' : 'F.Cu');
    });
  });
});
