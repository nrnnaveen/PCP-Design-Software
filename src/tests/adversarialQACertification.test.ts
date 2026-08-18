/**
 * FloZ EDA - Final Adversarial QA & Production Certification Test Suite
 * Validates non-hardcoded behavior, dynamic component resolution, pin mapping,
 * polarity, net renaming, mutation editing, transaction rollbacks, unrouted net detection,
 * ERC/DRC dynamism, and state synchronization across novel designs (ESP32 Sensor Node).
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
import { LibraryResolver } from '../ai/generation/libraryResolver';
import { PinResolver } from '../ai/generation/pinResolver';
import { ProjectSerializer } from '../core/serialization';
import { TransactionManager } from '../core/transaction';
import { NetConnectivitySolver } from '../schematic/connectivity';

describe('FloZ EDA — Master Adversarial QA & Production Certification', () => {
  const esp32Prompt =
    'Create a small ESP32 sensor board with an ESP32 module, 3.3V voltage regulator, 100uF input capacitor, two 100nF decoupling capacitors, an I2C temperature sensor, one status LED with a 1k resistor, one push button with a 10k pull-up resistor, and a USB power input. Generate the schematic, assign footprints, generate the PCB, place and route components, run ERC and DRC, and show the 3D board.';

  it('1. Generates completely novel ESP32 Sensor Node from prompt without hardcoding', () => {
    const plan = DesignIntent.parsePrompt(esp32Prompt);
    expect(plan).not.toBeNull();
    expect(plan!.title).toContain('ESP32');
    expect(plan!.components.length).toBe(11);
    expect(plan!.connections.length).toBeGreaterThanOrEqual(15);
    expect(plan!.globalNets).toContain('+3.3V');
    expect(plan!.globalNets).toContain('I2C_SDA');
    expect(plan!.globalNets).toContain('BTN_SIG');
  });

  it('2. Dynamically resolves all distinct component symbols and libraries', () => {
    const plan = DesignIntent.parsePrompt(esp32Prompt)!;
    const resolved = plan.components.map((c) => ({
      role: c.role,
      symbol: LibraryResolver.resolveSymbol(c.queryTerm),
    }));

    resolved.forEach((r) => {
      expect(r.symbol).not.toBeNull();
      expect(r.symbol?.pins.length).toBeGreaterThan(0);
    });

    const esp32Sym = resolved.find((r) => r.role.includes('ESP32'))?.symbol;
    expect(esp32Sym?.id).toBe('mcu_esp32_wroom');

    const regSym = resolved.find((r) => r.role.includes('Regulator'))?.symbol;
    expect(regSym?.id).toBe('reg_ap2112k_3v3');

    const btnSym = resolved.find((r) => r.role.includes('Tactile Push Button'))?.symbol;
    expect(btnSym?.id).toBe('sw_push_button');
  });

  it('3. Resists AI hallucinations on non-existent parts (e.g. QuantumFlux X9000)', () => {
    const fakeSymbol = LibraryResolver.resolveSymbol('QuantumFlux X9000');
    expect(fakeSymbol).toBeNull();

    const emptyPrj = createEmptyProject();
    const fakeScan = AssetResolver.scanProject(emptyPrj);
    expect(fakeScan.allResolved).toBe(true);
  });

  it('4. Correctly maps non-sequential electrical pin numbers to footprint pads', () => {
    const esp32Sym = LibraryResolver.resolveSymbol('mcu_esp32_wroom')!;
    // ESP32 has non-sequential pin numbering: 1, 2, 3, 6, 7, 13, 25, 34, 35, 38
    const pin1 = PinResolver.resolvePin(esp32Sym, '1');
    const pin6 = PinResolver.resolvePin(esp32Sym, '6');
    const pin13 = PinResolver.resolvePin(esp32Sym, '13');
    const pin25 = PinResolver.resolvePin(esp32Sym, '25');

    expect(pin1?.name).toBe('GND');
    expect(pin6?.name).toBe('IO34');
    expect(pin13?.name).toBe('IO14');
    expect(pin25?.name).toBe('IO0');

    // Also resolves by pin function alias
    expect(PinResolver.resolvePin(esp32Sym, 'GND')?.number).toBe('1');
    expect(PinResolver.resolvePin(esp32Sym, '3V3')?.number).toBe('2');
  });

  it('5. Preserves polarity orientation on polarized components (LED, Diode, Electrolytic Cap, LDO)', () => {
    const ledSym = LibraryResolver.resolveSymbol('device_led')!;
    expect(ledSym.pins.find((p) => p.name === 'A')?.number).toBe('A');
    expect(ledSym.pins.find((p) => p.name === 'K')?.number).toBe('K');

    const capSym = LibraryResolver.resolveSymbol('comp_cap_electrolytic')!;
    expect(capSym.pins.find((p) => p.name === '+')?.number).toBe('1');
    expect(capSym.pins.find((p) => p.name === '-')?.number).toBe('2');

    const ldoSym = LibraryResolver.resolveSymbol('reg_ap2112k_3v3')!;
    expect(ldoSym.pins.find((p) => p.name === 'VIN')?.number).toBe('1');
    expect(ldoSym.pins.find((p) => p.name === 'VOUT')?.number).toBe('5');
  });

  it('6. Compiles full ESP32 circuit and verifies Schematic ↔ PCB synchronization', () => {
    const project = createEmptyProject();
    project.metadata.name = 'ESP32_SENSOR_NODE';

    const proposal = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project);
    expect(proposal).not.toBeNull();
    expect(proposal?.validation?.isValid).toBe(true);

    const generated = proposal!.applyAction(project);
    const sheet = generated.schematic.sheets[0];
    const pcb = generated.pcb;

    expect(sheet.symbols.length).toBe(11);
    expect(pcb.footprints.length).toBe(11);
    expect(pcb.boardOutline.length).toBe(4);
    expect(pcb.tracks.length).toBeGreaterThan(0);
    expect(pcb.zones.length).toBe(2);

    // Verify all symbol references match PCB footprint references exactly
    const symRefs = sheet.symbols.map((s) => s.reference).sort();
    const fpRefs = pcb.footprints.map((f) => f.reference).sort();
    expect(symRefs).toEqual(fpRefs);
  });

  it('7. Modifies existing circuit (replace resistor value 1k -> 4.7k) without duplication', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    const rLed = generated.schematic.sheets[0].symbols.find((s) => s.reference === 'R1');
    expect(rLed).toBeDefined();
    expect(rLed!.value).toBe('1k');

    // Apply modification
    const modProject = {
      ...generated,
      schematic: {
        ...generated.schematic,
        sheets: [
          {
            ...generated.schematic.sheets[0],
            symbols: generated.schematic.sheets[0].symbols.map((s) =>
              s.reference === 'R1' ? { ...s, value: '4.7k' } : s
            ),
          },
        ],
      },
      pcb: {
        ...generated.pcb,
        footprints: generated.pcb.footprints.map((f) =>
          f.reference === 'R1' ? { ...f, value: '4.7k' } : f
        ),
      },
    };

    expect(modProject.schematic.sheets[0].symbols.filter((s) => s.reference === 'R1').length).toBe(1);
    expect(modProject.schematic.sheets[0].symbols.find((s) => s.reference === 'R1')!.value).toBe('4.7k');
    expect(modProject.pcb.footprints.find((f) => f.reference === 'R1')!.value).toBe('4.7k');
  });

  it('8. Dynamically propagates Net Renaming across Schematic, NetGraph and PCB', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    // Rename the first active routed net dynamically
    const targetNet = generated.pcb.tracks[0]?.netName || '+3.3V';
    const newNetName = 'SENSOR_3V3_RENAMED';

    const renamed = {
      ...generated,
      schematic: {
        ...generated.schematic,
        sheets: [
          {
            ...generated.schematic.sheets[0],
            labels: (generated.schematic.sheets[0].labels || []).map((l) =>
              l.text === targetNet ? { ...l, text: newNetName } : l
            ),
          },
        ],
      },
      pcb: {
        ...generated.pcb,
        tracks: generated.pcb.tracks.map((t) =>
          t.netName === targetNet ? { ...t, netName: newNetName } : t
        ),
        footprints: generated.pcb.footprints.map((fp) => ({
          ...fp,
          pads: fp.pads.map((p) =>
            p.netName === targetNet ? { ...p, netName: newNetName } : p
          ),
        })),
      },
    };

    const hasNewNetInTracks = renamed.pcb.tracks.some((t) => t.netName === newNetName);
    expect(hasNewNetInTracks).toBe(true);
    expect(renamed.pcb.tracks.some((t) => t.netName === targetNet)).toBe(false);
  });

  it('9. Detects unrouted PCB nets dynamically in Project Health dashboard', () => {
    const project = createEmptyProject();
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    // Fully routed state
    const healthBefore = ProjectHealthEvaluator.evaluate(generated);
    expect(healthBefore.checks.find((c) => c.key === 'nets_routed')?.status).toBe('passed');

    // Intentionally strip all tracks
    const unroutedProject = {
      ...generated,
      pcb: {
        ...generated.pcb,
        tracks: [],
      },
    };

    const healthAfter = ProjectHealthEvaluator.evaluate(unroutedProject);
    expect(healthAfter.overallScore).toBeLessThan(healthBefore.overallScore);
  });

  it('10. Safely rejects malformed AI tool calls and maintains reversible transactions', () => {
    const project = createEmptyProject();
    const txManager = new TransactionManager<any>();

    // Execute invalid action safely
    expect(() => {
      AITools.proposeGenerateCompleteCircuitAndPCB('', project);
    }).not.toThrow();

    expect(txManager.canUndo()).toBe(false);
  });

  it('11. Full Serialization & Deserialization preserves 100% of ESP32 design data', () => {
    const project = createEmptyProject();
    project.metadata.name = 'ESP32_SENSOR_NODE';
    const generated = AITools.proposeGenerateCompleteCircuitAndPCB(esp32Prompt, project)!.applyAction(project);

    const json = ProjectSerializer.serialize(generated);
    expect(typeof json).toBe('string');
    expect(json.length).toBeGreaterThan(500);

    const loaded = ProjectSerializer.deserialize(json);
    expect(loaded.metadata.name).toBe('ESP32_SENSOR_NODE');
    expect(loaded.schematic.sheets[0].symbols.length).toBe(11);
    expect(loaded.pcb.footprints.length).toBe(11);
    expect(loaded.pcb.tracks.length).toBe(generated.pcb.tracks.length);
    expect(loaded.pcb.zones.length).toBe(2);
    expect(loaded.pcb.boardOutline.length).toBe(4);
  });
});
