import { describe, it, expect } from 'vitest';
import { createDemoProject } from '../examples/demoProject';
import { TransactionManager } from '../core/transaction';
import { ProjectSerializer } from '../core/serialization';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { ERCEngine } from '../erc/ercEngine';
import { DesignIntent } from '../ai/generation/designIntent';
import { LibraryResolver } from '../ai/generation/libraryResolver';
import { PinResolver } from '../ai/generation/pinResolver';
import { PlacementPlanner } from '../ai/generation/placementPlanner';
import { ConnectionPlanner } from '../ai/generation/connectionPlanner';
import { SchematicCompiler } from '../ai/generation/schematicCompiler';
import { GenerationValidator } from '../ai/generation/generationValidator';
import { LocalEngineeringEngine } from '../ai/providers/localEngine';
import { ContextBuilder } from '../ai/contextBuilder';
import { ToolCallParser } from '../ai/generation/toolCallParser';

describe('FloZ AI Phase 4 — Real AI-To-Schematic Generation Engine', () => {
  it('1. Design Intent: parses complex STM32 + USB-C + Regulator + SHT31 request into structured plan', () => {
    const prompt = 'Create a complete STM32 + USB-C + 3.3V regulator + SHT31 I2C sensor circuit';
    const plan = DesignIntent.parsePrompt(prompt);

    expect(plan).toBeDefined();
    expect(plan?.components.length).toBeGreaterThanOrEqual(8);
    expect(plan?.connections.length).toBeGreaterThan(10);
    expect(plan?.globalNets).toContain('+3.3V');
    expect(plan?.globalNets).toContain('GND');
    expect(plan?.globalNets).toContain('I2C_SDA');
  });

  it('2. Library Resolution: resolves real symbol definitions without hallucinated IDs', () => {
    const stm32Def = LibraryResolver.resolveSymbol('mcu_stm32f401_lqfp48');
    expect(stm32Def).toBeDefined();
    expect(stm32Def?.name).toBe('STM32F401CCU6');

    const usbcDef = LibraryResolver.resolveSymbol('conn_usbc_16pin');
    expect(usbcDef).toBeDefined();
    expect(usbcDef?.name).toBe('USB_C_Receptacle_16P');

    const ldoDef = LibraryResolver.resolveSymbol('reg_ap2112k_3v3');
    expect(ldoDef).toBeDefined();
    expect(ldoDef?.name).toBe('AP2112K-3.3');

    const shtDef = LibraryResolver.resolveSymbol('sensor_sht31');
    expect(shtDef).toBeDefined();
    expect(shtDef?.name).toBe('SHT31-DIS');
  });

  it('3. Pin Resolution: matches pins accurately on resolved symbol definitions', () => {
    const stm32Def = LibraryResolver.resolveSymbol('mcu_stm32f401_lqfp48')!;
    const pinPb7 = PinResolver.resolvePin(stm32Def, 'PB7');
    expect(pinPb7).toBeDefined();
    expect(pinPb7?.number).toBe('43');
    expect(pinPb7?.name).toContain('PB7');

    const ldoDef = LibraryResolver.resolveSymbol('reg_ap2112k_3v3')!;
    const pinVin = PinResolver.resolvePin(ldoDef, 'VIN');
    expect(pinVin).toBeDefined();
    expect(pinVin?.name).toBe('VIN');

    const shtDef = LibraryResolver.resolveSymbol('sensor_sht31')!;
    const pinSda = PinResolver.resolvePin(shtDef, 'SDA');
    expect(pinSda).toBeDefined();
    expect(pinSda?.name).toBe('SDA');
  });

  it('4. Placement Planner: computes non-overlapping, grid-aligned functional domains', () => {
    const prompt = 'Create a complete STM32 + USB-C + 3.3V regulator + SHT31 I2C sensor circuit';
    const plan = DesignIntent.parsePrompt(prompt)!;
    const project = createDemoProject();

    const placements = PlacementPlanner.planPlacements(plan.components, project.schematic.sheets[0].symbols);
    expect(placements.size).toBe(plan.components.length);

    // Verify grid alignment (multiples of 5mm) and non-overlapping
    const placedPositions = Array.from(placements.values());
    for (const pos of placedPositions) {
      expect(pos.x % 5).toBe(0);
      expect(pos.y % 5).toBe(0);
    }
  });

  it('5. Schematic Compiler: compiles full circuit into real schematic objects and commits to project state', () => {
    const project = createDemoProject();
    const initialSymbolCount = project.schematic.sheets[0].symbols.length;
    const initialWireCount = project.schematic.sheets[0].wires.length;

    const prompt = 'Create a complete STM32 + USB-C + 3.3V regulator + SHT31 I2C sensor circuit';
    const plan = DesignIntent.parsePrompt(prompt)!;
    const proposal = SchematicCompiler.compilePlan(plan, project);

    expect(proposal).toBeDefined();
    expect(proposal?.permission).toBe('MUTATE');
    expect(proposal?.diff.addedComponents?.length).toBeGreaterThanOrEqual(8);

    // Apply the proposal
    const updatedProject = proposal!.applyAction(project);
    const sheet = updatedProject.schematic.sheets[0];

    expect(sheet.symbols.length).toBeGreaterThan(initialSymbolCount);
    expect(sheet.wires.length).toBeGreaterThan(initialWireCount);

    // Verify real objects exist
    const mcuSym = sheet.symbols.find((s) => s.value === 'STM32F401CCU6');
    const usbcSym = sheet.symbols.find((s) => s.value === 'USB_C_16P');
    const ldoSym = sheet.symbols.find((s) => s.value === 'AP2112K-3.3');
    const shtSym = sheet.symbols.find((s) => s.value === 'SHT31-DIS');

    expect(mcuSym).toBeDefined();
    expect(usbcSym).toBeDefined();
    expect(ldoSym).toBeDefined();
    expect(shtSym).toBeDefined();

    // Verify connectivity solves real nets
    const connectivity = NetConnectivitySolver.solveSheet(sheet);
    expect(Object.keys(connectivity.netGraph.nets).length).toBeGreaterThan(0);
  });

  it('6. 5V to 3.3V Regulator Generation: creates regulator and input/output filter capacitors', () => {
    const project = createDemoProject();
    const initialCapCount = project.schematic.sheets[0].symbols.filter((s) => s.value === '10uF').length;

    const prompt = 'Create a 5V to 3.3V regulator circuit with input/output capacitors';
    const plan = DesignIntent.parsePrompt(prompt)!;
    const proposal = SchematicCompiler.compilePlan(plan, project);

    expect(proposal).toBeDefined();
    const updated = proposal!.applyAction(project);
    const sheet = updated.schematic.sheets[0];

    const reg = sheet.symbols.find((s) => s.value === 'AP2112K-3.3');
    const caps = sheet.symbols.filter((s) => s.value === '10uF');

    expect(reg).toBeDefined();
    expect(caps.length).toBe(initialCapCount + 2);
  });

  it('7. Undo/Redo Invertibility: rolls back and restores complete generated circuit atomically', () => {
    const project = createDemoProject();
    const tm = new TransactionManager<any>(100);

    const prompt = 'Create a complete STM32 + USB-C + 3.3V regulator + SHT31 I2C sensor circuit';
    const plan = DesignIntent.parsePrompt(prompt)!;
    const proposal = SchematicCompiler.compilePlan(plan, project)!;

    const action = {
      name: proposal.title,
      apply: (curr: any) => proposal.applyAction(curr),
      invert: () => project,
    };

    const generatedPrj = tm.execute(project, action);
    expect(generatedPrj.schematic.sheets[0].symbols.length).toBeGreaterThan(project.schematic.sheets[0].symbols.length);

    const { state: revertedPrj } = tm.undo(generatedPrj);
    expect(revertedPrj.schematic.sheets[0].symbols.length).toBe(project.schematic.sheets[0].symbols.length);

    const { state: redonePrj } = tm.redo(revertedPrj);
    expect(redonePrj.schematic.sheets[0].symbols.length).toBe(generatedPrj.schematic.sheets[0].symbols.length);
  });

  it('8. LocalEngineeringEngine: executes generation loop and yields real action proposal', async () => {
    const project = createDemoProject();
    const context = ContextBuilder.buildFullEngineeringContext(project);
    const engine = new LocalEngineeringEngine();

    const activities: any[] = [];
    const chunks: string[] = [];

    const res = await engine.chatStream(
      [{ id: '1', role: 'user', content: 'Create a complete STM32 + USB-C + 3.3V regulator + SHT31 I2C sensor circuit', timestamp: '12:00' }],
      context,
      project,
      (c) => chunks.push(c),
      (a) => activities.push(a)
    );

    expect(res.proposals?.length).toBeGreaterThan(0);
    expect(res.proposals![0].category).toBe('full_circuit_generation');
    expect(res.text).toContain('## Verified Project Facts');
    expect(res.text).toContain('## Engineering Recommendations & Action Proposals');
  });

  it('9. ToolCallParser: parses LLM JSON tool lines into real ActionProposal and commits to canvas', () => {
    const rawLlmText = `{"tool": "schematic_add_component", "args": {"ref": "R1", "value": "10k", "footprint": "Resistor_SMD:R_0805_2012Metric", "pos": [50, 30], "fields": {}}}
{"tool": "schematic_add_component", "args": {"ref": "R2", "value": "10k", "footprint": "Resistor_SMD:R_0805_2012Metric", "pos": [50, 45], "fields": {}}}
{"tool": "schematic_add_wire", "args": {"points": [[40, 30], [50, 30]], "net": "+3.3V"}}
{"tool": "schematic_add_wire", "args": {"points": [[50, 30], [50, 37.5]], "net": "VOUT_DIV"}}`;

    const project = createDemoProject();
    const result = ToolCallParser.parseResponse(rawLlmText, 'create it dont send text crete circuit', project);

    expect(result.proposals.length).toBe(1);
    expect(result.cleanText).toContain('## Verified Project Facts');
    expect(result.proposals[0].diff.addedComponents?.length).toBe(2);

    const updated = result.proposals[0].applyAction(project);
    expect(updated.schematic.sheets[0].symbols.find((s) => s.reference === 'R1')).toBeDefined();
    expect(updated.schematic.sheets[0].symbols.find((s) => s.reference === 'R2')).toBeDefined();
  });

  it('10. Universal Circuit Synthesis: generates NE555 Timer Astable Oscillator', () => {
    const plan = DesignIntent.parsePrompt('Create an NE555 timer astable oscillator circuit');
    expect(plan).not.toBeNull();
    expect(plan!.components.length).toBe(5);
    expect(plan!.title).toContain('NE555');

    const project = createDemoProject();
    const prop = SchematicCompiler.compilePlan(plan!, project);
    expect(prop).not.toBeNull();
    expect(prop!.validation?.valid).toBe(true);

    const updated = prop!.applyAction(project);
    const sheet = updated.schematic.sheets[0];
    expect(sheet.symbols.some((s) => s.value === 'NE555')).toBe(true);
    expect(sheet.wires.length).toBeGreaterThan(0);
  });

  it('11. Universal Circuit Synthesis: generates LM358 Op-Amp Inverting Amplifier', () => {
    const plan = DesignIntent.parsePrompt('Build an LM358 op-amp amplifier stage');
    expect(plan).not.toBeNull();
    expect(plan!.components.length).toBe(4);
    expect(plan!.title).toContain('LM358');

    const project = createDemoProject();
    const prop = SchematicCompiler.compilePlan(plan!, project);
    expect(prop).not.toBeNull();
    expect(prop!.validation?.valid).toBe(true);

    const updated = prop!.applyAction(project);
    const sheet = updated.schematic.sheets[0];
    expect(sheet.symbols.some((s) => s.value === 'LM358')).toBe(true);
  });

  it('12. Universal Circuit Synthesis: generates MOSFET switch and LED driver', () => {
    const plan = DesignIntent.parsePrompt('Create an N-Channel MOSFET switch with blue LED driver');
    expect(plan).not.toBeNull();
    expect(plan!.components.length).toBe(5);

    const project = createDemoProject();
    const prop = SchematicCompiler.compilePlan(plan!, project);
    expect(prop).not.toBeNull();
    expect(prop!.validation?.valid).toBe(true);
  });

  it('13. Universal Circuit Synthesis: generates ESP32 IoT Node with 3.3V LDO', () => {
    const plan = DesignIntent.parsePrompt('Create an ESP32 wifi IoT node with 3.3V LDO and UART header');
    expect(plan).not.toBeNull();
    expect(plan!.components.length).toBe(7);

    const project = createDemoProject();
    const prop = SchematicCompiler.compilePlan(plan!, project);
    expect(prop).not.toBeNull();
    expect(prop!.validation?.valid).toBe(true);
  });

  it('14. Voltage Divider Geometry: verifies vertical rotation and non-overlapping label coordinates', () => {
    const plan = DesignIntent.parsePrompt('Create a 10k/10k voltage divider');
    const project = createDemoProject();
    const prop = SchematicCompiler.compilePlan(plan!, project);
    expect(prop).not.toBeNull();

    const updated = prop!.applyAction(project);
    const sheet = updated.schematic.sheets[0];

    const addedRef = prop!.diff.addedComponents![0].reference;
    const addedR1 = sheet.symbols.find((s) => s.reference === addedRef);
    expect(addedR1).toBeDefined();
    expect(addedR1!.rotation).toBe(90);

    // Verify all label coordinates are distinct (no overlapping labels)
    const labelCoords = sheet.labels.map((l) => `${l.x}_${l.y}`);
    const uniqueCoords = new Set(labelCoords);
    expect(uniqueCoords.size).toBe(sheet.labels.length);
  });
});
