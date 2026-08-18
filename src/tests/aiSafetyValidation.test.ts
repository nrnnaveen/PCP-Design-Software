import { describe, it, expect } from 'vitest';
import { createDemoProject } from '../examples/demoProject';
import { TransactionManager } from '../core/transaction';
import { ActionValidator } from '../ai/actionValidator';
import { CircuitGenerator } from '../ai/circuitGenerator';
import { AITools } from '../ai/aiTools';
import { ActionProposal } from '../ai/types';
import { LocalEngineeringEngine } from '../ai/providers/localEngine';
import { OpenRouterProvider } from '../ai/providers/openRouterProvider';
import { OllamaProvider } from '../ai/providers/ollamaProvider';

describe('FloZ AI Phase 2 — Safety, Validation, and Circuit Synthesis Tests', () => {
  it('should validate legal action proposals with ActionValidator.preValidate', () => {
    const project = createDemoProject();
    const proposal = CircuitGenerator.generateDecouplingCap(project, 'U1', '+3.3V', 'GND', '100nF');

    const result = ActionValidator.preValidate(proposal, project);
    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should reject invalid action proposals with out-of-bounds coordinates', () => {
    const project = createDemoProject();
    const badProposal: ActionProposal = {
      id: 'prop_bad_1',
      title: 'Bad Coordinate Component',
      description: 'Placing component way outside sheet',
      category: 'place_symbol',
      permission: 'MUTATE',
      diff: {
        addedComponents: [
          { reference: 'C99', value: '100nF', position: { x: 5000, y: -900 } },
        ],
      },
      status: 'pending',
      applyAction: (p) => p,
    };

    const result = ActionValidator.preValidate(badProposal, project);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toContain('outside schematic sheet bounds');
  });

  it('should reject mutation of non-existent component references', () => {
    const project = createDemoProject();
    const badProposal: ActionProposal = {
      id: 'prop_bad_2',
      title: 'Modify Fake Component',
      description: 'Changing value of non-existent U999',
      category: 'change_value',
      permission: 'MUTATE',
      diff: {
        modifiedComponents: [
          { reference: 'U999', field: 'value', oldValue: 'None', newValue: 'STM32' },
        ],
      },
      status: 'pending',
      applyAction: (p) => p,
    };

    const result = ActionValidator.preValidate(badProposal, project);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.includes('does not exist'))).toBe(true);
  });

  it('should synthesize RC Low-Pass Filter with correct net connections', () => {
    const project = createDemoProject();
    const initialSymCount = project.schematic.sheets[0].symbols.length;

    const proposal = CircuitGenerator.generateRCFilter(project, 'SIG_IN', 'SIG_OUT', '1k', '100nF');
    expect(proposal.permission).toBe('MUTATE');
    expect(proposal.diff.addedComponents?.length).toBe(2);

    const updated = proposal.applyAction(project);
    expect(updated.schematic.sheets[0].symbols.length).toBe(initialSymCount + 2);

    const r = updated.schematic.sheets[0].symbols.find((s) => s.value === '1k');
    const c = updated.schematic.sheets[0].symbols.find((s) => s.value === '100nF');
    expect(r).toBeDefined();
    expect(c).toBeDefined();
  });

  it('should synthesize I2C pull-up resistors with dual SDA and SCL nets', () => {
    const project = createDemoProject();
    const proposal = CircuitGenerator.generateI2CPullups(project, 'I2C_SDA', 'I2C_SCL', '+3.3V', '4.7k');

    expect(proposal.diff.addedComponents?.length).toBe(2);
    expect(proposal.diff.connectedNets).toContain('I2C_SDA');
    expect(proposal.diff.connectedNets).toContain('I2C_SCL');

    const updated = proposal.applyAction(project);
    const addedResistors = updated.schematic.sheets[0].symbols.filter((s) => s.value === '4.7k');
    expect(addedResistors.length).toBe(2);
  });

  it('should support full undo/redo transaction rollback for AI proposals', () => {
    const project = createDemoProject();
    const txMgr = new TransactionManager<typeof project>(50);

    const proposal = CircuitGenerator.generateDecouplingCap(project, 'U1', '+3.3V', 'GND', '100nF');

    // 1. Execute Proposal in Transaction Manager
    const afterApply = txMgr.execute(project, {
      name: proposal.title,
      apply: (state) => proposal.applyAction(state),
      invert: () => project,
    });

    expect(afterApply.schematic.sheets[0].symbols.length).toBe(
      project.schematic.sheets[0].symbols.length + 1
    );

    // 2. Undo
    const { state: afterUndo } = txMgr.undo(afterApply);
    expect(afterUndo.schematic.sheets[0].symbols.length).toBe(
      project.schematic.sheets[0].symbols.length
    );

    // 3. Redo
    const { state: afterRedo } = txMgr.redo(afterUndo);
    expect(afterRedo.schematic.sheets[0].symbols.length).toBe(
      project.schematic.sheets[0].symbols.length + 1
    );
  });

  it('should support AbortSignal cancellation in LocalEngineeringEngine', async () => {
    const project = createDemoProject();
    const engine = new LocalEngineeringEngine();
    const controller = new AbortController();

    // Abort immediately
    controller.abort();

    const res = await engine.chatStream(
      [{ id: '1', role: 'user', content: 'Explain circuit', timestamp: '12:00' }],
      { projectName: 'Test', units: 'mm', activeSheetTitle: 'Sheet 1' },
      project,
      () => {},
      () => {},
      controller.signal
    );

    expect(res.text).toContain('stopped by user');
  });

  it('should expose correct ProviderCapabilities across providers', () => {
    const local = new LocalEngineeringEngine();
    expect(local.getCapabilities().isOfflineCapable).toBe(true);
    expect(local.getCapabilities().isPrivateLocal).toBe(true);

    const openRouter = new OpenRouterProvider({
      provider: 'openrouter',
      apiKey: '',
      model: 'openrouter/free',
      temperature: 0.15,
      contextLevel: 'full',
      attachContext: { schematic: true, pcb: true, erc: true, drc: true, selection: true },
    });
    expect(openRouter.getCapabilities().supportsCancellation).toBe(true);

    const ollama = new OllamaProvider({
      provider: 'ollama',
      apiKey: '',
      model: 'llama3',
      temperature: 0.15,
      contextLevel: 'full',
      attachContext: { schematic: true, pcb: true, erc: true, drc: true, selection: true },
    });
    expect(ollama.getCapabilities().isPrivateLocal).toBe(true);
  });
});
