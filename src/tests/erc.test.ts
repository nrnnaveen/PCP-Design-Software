import { describe, it, expect } from 'vitest';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';
import { createDemoProject } from '../examples/demoProject';

describe('ERC & DRC Rules Validation Tests', () => {
  it('should detect duplicate references in ERC', () => {
    const project = createDemoProject();
    // Intentionally duplicate reference R1
    project.schematic.sheets[0].symbols.push({
      ...project.schematic.sheets[0].symbols[0],
      id: 'sym_dup_r1',
      reference: 'R1',
    });

    const violations = ERCEngine.run(project);
    const dupViolation = violations.find((v) => v.code === 'ERC001');
    expect(dupViolation).toBeDefined();
    expect(dupViolation?.description).toContain('R1');
  });

  it('should detect minimum track width violations in DRC', () => {
    const project = createDemoProject();
    // Add a hair-thin track (0.05mm) below 0.15mm limit
    project.pcb.tracks.push({
      id: 'trk_thin',
      netId: 'net_vbus',
      netName: 'VBUS',
      layer: 'F.Cu',
      x1: 10,
      y1: 10,
      x2: 20,
      y2: 10,
      width: 0.05,
    });

    const violations = DRCEngine.run(project);
    const widthViolation = violations.find((v) => v.code === 'DRC001');
    expect(widthViolation).toBeDefined();
    expect(widthViolation?.description).toContain('0.05mm');
  });

  it('should detect courtyard package overlaps in DRC', () => {
    const project = createDemoProject();
    // Place two footprints directly on top of each other
    project.pcb.footprints[1].x = project.pcb.footprints[0].x;
    project.pcb.footprints[1].y = project.pcb.footprints[0].y;

    const violations = DRCEngine.run(project);
    const courtyardViolation = violations.find((v) => v.code === 'DRC005');
    expect(courtyardViolation).toBeDefined();
  });
});
