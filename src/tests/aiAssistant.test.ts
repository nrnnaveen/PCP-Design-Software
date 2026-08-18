import { describe, it, expect } from 'vitest';
import { createDemoProject } from '../examples/demoProject';
import { ContextBuilder } from '../ai/contextBuilder';
import { AITools } from '../ai/aiTools';
import { LocalEngineeringEngine } from '../ai/providers/localEngine';

describe('FloZ AI - Engineering Context & Controlled Tools Tests', () => {
  it('should extract structured schematic engineering context correctly', () => {
    const project = createDemoProject();
    const schContext = ContextBuilder.buildSchematicContext(project);

    expect(schContext.componentCount).toBeGreaterThan(0);
    expect(schContext.components.some((c) => c.reference.startsWith('U'))).toBe(true);
    expect(schContext.nets.length).toBeGreaterThan(0);
    expect(schContext.powerRails.length).toBeGreaterThan(0);
  });

  it('should extract structured PCB engineering context correctly', () => {
    const project = createDemoProject();
    const pcbContext = ContextBuilder.buildPCBContext(project);

    expect(pcbContext.boardDimensions.width).toBeGreaterThan(0);
    expect(pcbContext.boardDimensions.height).toBeGreaterThan(0);
    expect(pcbContext.footprintCount).toBe(project.pcb.footprints.length);
  });

  it('should query real symbol and net properties via AITools', () => {
    const project = createDemoProject();
    const components = AITools.getComponentList(project);
    expect(components.length).toBeGreaterThan(0);

    const firstRef = components[0].reference;
    const symInfo = AITools.getSymbol(project, firstRef);
    expect(symInfo).toBeDefined();
    expect(symInfo?.reference).toBe(firstRef);
    expect(symInfo?.pins.length).toBeGreaterThan(0);

    const symbolsSearchResult = AITools.searchSymbols('resistor');
    expect(symbolsSearchResult.length).toBeGreaterThan(0);

    const footprintsSearchResult = AITools.searchFootprints('0805');
    expect(footprintsSearchResult.length).toBeGreaterThan(0);
  });

  it('should generate a valid decoupling capacitor ActionProposal and apply it cleanly', () => {
    const project = createDemoProject();
    const initialSymCount = project.schematic.sheets[0].symbols.length;

    const proposal = AITools.proposeAddDecouplingCap(project, 'U1', '+3.3V', 'GND', '100nF');
    expect(proposal).toBeDefined();
    expect(proposal.category).toBe('add_decoupling_cap');
    expect(proposal.diff.addedComponents?.length).toBe(1);
    expect(proposal.status).toBe('pending');

    const updatedProject = proposal.applyAction(project);
    expect(updatedProject.schematic.sheets[0].symbols.length).toBe(initialSymCount + 1);

    const addedCap = updatedProject.schematic.sheets[0].symbols.find((s) => s.value === '100nF');
    expect(addedCap).toBeDefined();
    expect(addedCap?.reference).toMatch(/^C\d+$/);
  });

  it('should generate a voltage divider ActionProposal and apply it with series connectivity', () => {
    const project = createDemoProject();
    const initialSymCount = project.schematic.sheets[0].symbols.length;
    const initialWireCount = project.schematic.sheets[0].wires.length;

    const proposal = AITools.proposeVoltageDivider(project, 'VIN', 'VOUT', '10k', '4.7k');
    expect(proposal).toBeDefined();
    expect(proposal.category).toBe('voltage_divider');
    expect(proposal.diff.addedComponents?.length).toBe(2);

    const updatedProject = proposal.applyAction(project);
    expect(updatedProject.schematic.sheets[0].symbols.length).toBe(initialSymCount + 2);
    expect(updatedProject.schematic.sheets[0].wires.length).toBe(initialWireCount + 2);
  });

  it('should produce structured engineering findings with LocalEngineeringEngine', async () => {
    const project = createDemoProject();
    const context = ContextBuilder.buildFullEngineeringContext(project);
    const engine = new LocalEngineeringEngine();

    const activities: any[] = [];
    const chunks: string[] = [];

    const res = await engine.chatStream(
      [{ id: '1', role: 'user', content: 'Explain this circuit and find errors', timestamp: '12:00' }],
      context,
      project,
      (c) => chunks.push(c),
      (a) => activities.push(a)
    );

    expect(res.text.includes('## Verified Project Facts') || res.text.includes('## Finding')).toBe(true);
    expect(res.text.includes('## Engineering Recommendations') || res.text.includes('## Recommendation')).toBe(true);
    expect(activities.length).toBeGreaterThan(0);
  });
});
