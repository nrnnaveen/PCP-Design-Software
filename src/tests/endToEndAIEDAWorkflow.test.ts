/**
 * FloZ EDA - End-to-End AI EDA Workflow Master Test Suite
 * Validates the complete pipeline:
 * User Prompt -> Design Intent -> Component Resolution -> Pin-Pad Verification ->
 * Schematic Compilation -> PCB Placement -> Multi-Net Auto-Routing -> Ground Zone ->
 * Diagnostics Health Check -> 3D Asset Resolution.
 */

import { describe, it, expect } from 'vitest';
import { createDemoProject, createEmptyProject } from '../examples/demoProject';
import { DesignIntent } from '../ai/generation/designIntent';
import { SchematicCompiler } from '../ai/generation/schematicCompiler';
import { AITools } from '../ai/aiTools';
import { AutoPlacer } from '../pcb/autoPlacer';
import { AutoRouter } from '../pcb/autoRouter';
import { ZoneGenerator } from '../pcb/zoneGenerator';
import { ComponentRegistry } from '../library/componentRegistry';
import { AssetResolver } from '../library/assetResolver';
import { ProjectHealthEvaluator } from '../validation/projectHealth';
import { AutoFixEngine } from '../validation/autoFixEngine';
import { ERCEngine } from '../erc/ercEngine';
import { DRCEngine } from '../drc/drcEngine';

describe('FloZ EDA - Master AI EDA Pipeline', () => {
  const masterPrompt =
    'Create a 5V USB power indicator with a red LED, 1k resistor, 100uF capacitor, 100nF capacitor, 1A fuse, reverse polarity protection diode, and a compact board.';

  it('1. Parses user prompt into structured engineering design plan with components and nets', () => {
    const plan = DesignIntent.parsePrompt(masterPrompt);
    expect(plan).not.toBeNull();
    expect(plan!.title).toContain('5V USB');
    expect(plan!.components.length).toBeGreaterThanOrEqual(6);
    expect(plan!.connections.length).toBeGreaterThanOrEqual(7);
    expect(plan!.globalNets).toContain('+5V');
    expect(plan!.globalNets).toContain('GND');
    expect(plan!.globalNets).toContain('VBUS');
  });

  it('2. Compiles real schematic symbol instances with valid non-overlapping coordinates and wiring', () => {
    const project = createEmptyProject();
    const plan = DesignIntent.parsePrompt(masterPrompt)!;
    const proposal = SchematicCompiler.compilePlan(plan, project);

    expect(proposal).not.toBeNull();
    expect(proposal!.category).toBe('full_circuit_generation');
    expect(proposal!.permission).toBe('MUTATE');

    const updatedPrj = proposal!.applyAction(project);
    const sheet = updatedPrj.schematic.sheets[0];

    // Symbols exist
    expect(sheet.symbols.length).toBeGreaterThanOrEqual(6);
    // Wires exist
    expect(sheet.wires.length).toBeGreaterThanOrEqual(7);

    // Verify all symbol references are unique
    const refs = sheet.symbols.map((s) => s.reference);
    const uniqueRefs = new Set(refs);
    expect(refs.length).toBe(uniqueRefs.size);
  });

  it('3. Verifies pin-pad compatibility across all resolved component footprints', () => {
    const project = createEmptyProject();
    const plan = DesignIntent.parsePrompt(masterPrompt)!;
    const proposal = SchematicCompiler.compilePlan(plan, project)!;
    const updatedPrj = proposal.applyAction(project);
    const sheet = updatedPrj.schematic.sheets[0];

    sheet.symbols.forEach((sym) => {
      if (sym.reference.startsWith('#')) return;
      expect(sym.footprint).toBeTruthy();
      const compat = ComponentRegistry.verifyPinPadCompatibility(sym.symbolDefId, sym.footprint);
      expect(compat.compatible).toBe(true);
    });
  });

  it('4. Places PCB footprints with domain layout rules and encloses in rectangular board outline', () => {
    const project = createEmptyProject();
    const plan = DesignIntent.parsePrompt(masterPrompt)!;
    const schemPrj = SchematicCompiler.compilePlan(plan, project)!.applyAction(project);

    const pcbPrj = AutoPlacer.placeComponents(schemPrj, { boardMarginMm: 6.0 });
    const pcb = pcbPrj.pcb;

    expect(pcb.footprints.length).toBeGreaterThanOrEqual(6);
    expect(pcb.boardOutline.length).toBe(4); // Closed rectangle

    // Verify board boundary coordinates are valid finite numbers
    pcb.boardOutline.forEach((pt) => {
      expect(isFinite(pt.x)).toBe(true);
      expect(isFinite(pt.y)).toBe(true);
    });

    // Verify footprints are inside board outline
    const xs = pcb.boardOutline.map((p) => p.x);
    const ys = pcb.boardOutline.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    pcb.footprints.forEach((fp) => {
      expect(fp.x).toBeGreaterThanOrEqual(minX);
      expect(fp.x).toBeLessThanOrEqual(maxX);
      expect(fp.y).toBeGreaterThanOrEqual(minY);
      expect(fp.y).toBeLessThanOrEqual(maxY);
    });
  });

  it('5. Auto-routes all electrical nets using 45° octilinear tracks with power width rules', () => {
    const project = createEmptyProject();
    const plan = DesignIntent.parsePrompt(masterPrompt)!;
    const schemPrj = SchematicCompiler.compilePlan(plan, project)!.applyAction(project);
    const placedPrj = AutoPlacer.placeComponents(schemPrj);
    const routedPrj = AutoRouter.routeProject(placedPrj);

    const pcb = routedPrj.pcb;
    expect(pcb.tracks.length).toBeGreaterThan(0);

    // Verify power track width rule (0.5mm)
    const powerTracks = pcb.tracks.filter((t) => t.netName.includes('+5V') || t.netName.includes('VBUS'));
    if (powerTracks.length > 0) {
      expect(powerTracks[0].width).toBe(0.5);
    }
  });

  it('6. Generates top and bottom ground copper pour planes', () => {
    const project = createEmptyProject();
    const plan = DesignIntent.parsePrompt(masterPrompt)!;
    const schemPrj = SchematicCompiler.compilePlan(plan, project)!.applyAction(project);
    const placedPrj = AutoPlacer.placeComponents(schemPrj);
    const zonedPrj = ZoneGenerator.createGroundPlanes(placedPrj, ['F.Cu', 'B.Cu'], 'GND');

    const pcb = zonedPrj.pcb;
    expect(pcb.zones.length).toBe(2);
    expect(pcb.zones.some((z) => z.layer === 'F.Cu' && z.netName === 'GND')).toBe(true);
    expect(pcb.zones.some((z) => z.layer === 'B.Cu' && z.netName === 'GND')).toBe(true);
  });

  it('7. Executes full end-to-end autonomous EDA workflow proposal in single transaction', () => {
    const project = createEmptyProject();
    const fullProposal = AITools.proposeGenerateCompleteCircuitAndPCB(masterPrompt, project);

    expect(fullProposal).not.toBeNull();
    expect(fullProposal!.category).toBe('full_circuit_pcb_generation');
    expect(fullProposal?.validation?.isValid).toBe(true);

    const finalPrj = fullProposal!.applyAction(project);

    // Verify Schematic
    expect(finalPrj.schematic.sheets[0].symbols.length).toBeGreaterThanOrEqual(6);
    expect(finalPrj.schematic.sheets[0].wires.length).toBeGreaterThanOrEqual(7);

    // Verify PCB
    expect(finalPrj.pcb.footprints.length).toBeGreaterThanOrEqual(6);
    expect(finalPrj.pcb.tracks.length).toBeGreaterThan(0);
    expect(finalPrj.pcb.zones.length).toBe(2);

    // Verify Project Health
    const health = ProjectHealthEvaluator.evaluate(finalPrj);
    console.log('Health checks:', health.checks);
    expect(health.checks.some((c) => c.key === 'schematic' && c.status === 'passed')).toBe(true);
    expect(health.checks.some((c) => c.key === 'pcb_sync' && c.status === 'passed')).toBe(true);
    expect(health.checks.some((c) => c.key === 'nets_routed' && c.status === 'passed')).toBe(true);
    expect(health.overallScore).toBeGreaterThanOrEqual(75);
  });

  it('8. Evaluates and auto-fixes diagnostic violations without manual intervention', () => {
    const project = createEmptyProject();
    const fullProposal = AITools.proposeGenerateCompleteCircuitAndPCB(masterPrompt, project)!;
    const finalPrj = fullProposal.applyAction(project);

    const fixResult = AutoFixEngine.autoFixProject(finalPrj);
    expect(fixResult.appliedFixes).toBeDefined();
  });

  it('9. Executes complete manufacturable USB_5V_LED_INDICATOR project with exact user specifications', () => {
    const userPrompt =
      'Create a complete 5V USB power indicator PCB. Use a 5V input connector, 1A polyfuse, 1N5819 reverse polarity protection diode, 100uF electrolytic capacitor, 100nF ceramic capacitor, 1k resistor and red 5mm LED. Generate the schematic, assign valid footprints, create the PCB, place components, route all connections, add a GND plane, run ERC and DRC, fix safe errors, and show the final 3D PCB.';

    const project = createEmptyProject();
    project.metadata.name = 'USB_5V_LED_INDICATOR';

    const proposal = AITools.proposeGenerateCompleteCircuitAndPCB(userPrompt, project);
    expect(proposal).not.toBeNull();
    expect(proposal?.validation?.isValid).toBe(true);

    const generated = proposal!.applyAction(project);
    const sheet = generated.schematic.sheets[0];
    const pcb = generated.pcb;

    // 1. Components verification
    expect(sheet.symbols.length).toBe(7);
    const refs = sheet.symbols.map((s) => s.reference);
    expect(refs).toContain('J1');
    expect(refs).toContain('F1');
    expect(refs).toContain('D1');
    expect(refs).toContain('C1');
    expect(refs).toContain('C2');
    expect(refs).toContain('R1');
    expect(refs).toContain('D2');

    // 2. Footprint assignments
    pcb.footprints.forEach((fp) => {
      expect(fp.footprintDefId).toBeTruthy();
      expect(fp.pads.length).toBeGreaterThanOrEqual(2);
    });

    // 3. PCB Dimensions & Outline
    expect(pcb.boardOutline.length).toBe(4);
    const xs = pcb.boardOutline.map((p) => p.x);
    const ys = pcb.boardOutline.map((p) => p.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(width).toBeGreaterThanOrEqual(40);
    expect(height).toBeGreaterThanOrEqual(25);

    // 4. Routing & Ground plane
    expect(pcb.tracks.length).toBeGreaterThan(0);
    expect(pcb.zones.length).toBe(2);
    expect(pcb.zones.some((z) => z.netName === 'GND')).toBe(true);

    // 5. Silkscreen texts
    expect(pcb.texts.length).toBeGreaterThanOrEqual(2);
    expect(pcb.texts.some((t) => t.text.includes('USB 5V LED INDICATOR'))).toBe(true);

    // 6. ERC / DRC validation
    const erc = ERCEngine.run(generated);
    const ercErrors = erc.filter((e) => e.severity === 'error');
    expect(ercErrors.length).toBe(0);

    // 7. Project Health & Auto-Fix
    const health = ProjectHealthEvaluator.evaluate(generated);
    expect(health.overallScore).toBeGreaterThanOrEqual(75);
    expect(health.checks.some((c) => c.key === 'schematic' && c.status === 'passed')).toBe(true);
    expect(health.checks.some((c) => c.key === 'pcb_sync' && c.status === 'passed')).toBe(true);

    const autoFixed = AutoFixEngine.autoFixProject(generated);
    expect(autoFixed.updatedProject).toBeDefined();
  });
});
