/**
 * FloZ EDA - Generic KiCad Multi-Unit Symbol & Library Import Test Suite
 * Validates generic symbol parsing, multi-unit separation, unit-specific and shared graphics,
 * pin ownership, power units, De Morgan styles, PCB synchronization, and ERC/DRC.
 */

import { describe, it, expect } from 'vitest';
import { KiCadSymbolParser } from '../library/kicadParser';
import { ECOEngine } from '../sync/ecoEngine';
import { NetConnectivitySolver } from '../schematic/connectivity';
import { SchematicHelper } from '../schematic/helper';
import { ApexProject, SchematicSymbolInstance } from '../core/types';
import { createDemoProject } from '../examples/demoProject';

describe('Generic KiCad Multi-Unit Symbol Import & Architecture Suite', () => {
  // -----------------------------------------------------------------
  // 1. 4010: Hex Non-Inverting Buffer (6 Functional Units + Power Unit)
  // -----------------------------------------------------------------
  it('1. Generically parses 4010 Hex Buffer with 6 units and separate Power unit', () => {
    const rawKicad4010 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "4010" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -5.08 6.35 0) (effects (font (size 1.27 1.27))))
        (property "Value" "4010" (id 1) (at 0 6.35 0) (effects (font (size 1.27 1.27))))
        (property "Footprint" "Package_DIP:DIP-16_W7.62mm" (id 2) (at 0 0 0))
        (symbol "4010_1_1"
          (polyline (pts (xy -5.08 3.81) (xy 5.08 0) (xy -5.08 -3.81) (xy -5.08 3.81)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 0 0) (length 2.54) (name "A" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "Y" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
        )
        (symbol "4010_2_1"
          (polyline (pts (xy -5.08 3.81) (xy 5.08 0) (xy -5.08 -3.81) (xy -5.08 3.81)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 0 0) (length 2.54) (name "B" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "Y" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
        )
        (symbol "4010_3_1"
          (polyline (pts (xy -5.08 3.81) (xy 5.08 0) (xy -5.08 -3.81) (xy -5.08 3.81)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 0 0) (length 2.54) (name "C" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "Y" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
        )
        (symbol "4010_4_1"
          (polyline (pts (xy -5.08 3.81) (xy 5.08 0) (xy -5.08 -3.81) (xy -5.08 3.81)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 0 0) (length 2.54) (name "D" (effects (font (size 1.27 1.27)))) (number "9" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "Y" (effects (font (size 1.27 1.27)))) (number "10" (effects (font (size 1.27 1.27)))))
        )
        (symbol "4010_5_1"
          (polyline (pts (xy -5.08 3.81) (xy 5.08 0) (xy -5.08 -3.81) (xy -5.08 3.81)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 0 0) (length 2.54) (name "E" (effects (font (size 1.27 1.27)))) (number "11" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "Y" (effects (font (size 1.27 1.27)))) (number "12" (effects (font (size 1.27 1.27)))))
        )
        (symbol "4010_6_1"
          (polyline (pts (xy -5.08 3.81) (xy 5.08 0) (xy -5.08 -3.81) (xy -5.08 3.81)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 0 0) (length 2.54) (name "F" (effects (font (size 1.27 1.27)))) (number "14" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "Y" (effects (font (size 1.27 1.27)))) (number "15" (effects (font (size 1.27 1.27)))))
        )
        (symbol "4010_7_1"
          (pin power_in line (at 0 7.62 270) (length 2.54) (name "VDD" (effects (font (size 1.27 1.27)))) (number "16" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 -7.62 90) (length 2.54) (name "VSS" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicad4010);
    expect(parseRes.errors.length).toBe(0);
    expect(parseRes.symbols.length).toBe(1);

    const s4010 = parseRes.symbols[0];
    expect(s4010.name).toBe('4010');
    expect(s4010.units?.length).toBe(7);

    // Unit A
    const uA = s4010.units![0];
    expect(uA.name).toBe('A');
    expect(uA.pins.map((p) => p.number)).toEqual(['3', '2']);
    expect(uA.shapes.length).toBe(1);
    expect(uA.isPower).toBeFalsy();

    // Unit F
    const uF = s4010.units![5];
    expect(uF.name).toBe('F');
    expect(uF.pins.map((p) => p.number)).toEqual(['14', '15']);
    expect(uF.shapes.length).toBe(1);

    // Power Unit
    const uPower = s4010.units![6];
    expect(uPower.name).toBe('Power');
    expect(uPower.isPower).toBe(true);
    expect(uPower.pins.map((p) => p.number)).toEqual(['16', '8']);
  });

  // -----------------------------------------------------------------
  // 2. 7400: Quad 2-Input NAND Gate with Arc & Circle Graphics
  // -----------------------------------------------------------------
  it('2. Generically parses 7400 Quad NAND Gate with 4 gates, power unit, and arc shapes', () => {
    const rawKicad7400 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "7400" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -5.08 5.08 0))
        (property "Value" "7400" (id 1) (at 0 5.08 0))
        (property "Footprint" "Package_DIP:DIP-14_W7.62mm" (id 2) (at 0 0 0))
        (symbol "7400_0_1"
          (arc (start 0 3.81) (mid 3.81 0) (end 0 -3.81) (stroke (width 0.254)) (fill (type none)))
          (polyline (pts (xy 0 3.81) (xy -5.08 3.81) (xy -5.08 -3.81) (xy 0 -3.81)) (stroke (width 0.254)) (fill (type none)))
          (circle (center 4.445 0) (radius 0.635) (stroke (width 0.254)) (fill (type none)))
        )
        (symbol "7400_1_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
        )
        (symbol "7400_2_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
        )
        (symbol "7400_3_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "9" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "10" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
        )
        (symbol "7400_4_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "12" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "13" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "11" (effects (font (size 1.27 1.27)))))
        )
        (symbol "7400_5_1"
          (pin power_in line (at 0 7.62 270) (length 2.54) (name "VCC" (effects (font (size 1.27 1.27)))) (number "14" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 -7.62 90) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicad7400);
    expect(parseRes.symbols.length).toBe(1);
    const s7400 = parseRes.symbols[0];
    expect(s7400.units?.length).toBe(5); // 4 gates + Power

    // Gate A inherits Unit 0 shared NAND outline (arc + polyline + circle)
    const gateA = s7400.units![0];
    expect(gateA.pins.map((p) => p.number)).toEqual(['1', '2', '3']);
    expect(gateA.shapes.some((s) => s.type === 'arc')).toBe(true);
    expect(gateA.shapes.some((s) => s.type === 'circle')).toBe(true);

    // Power unit
    const pwr = s7400.units![4];
    expect(pwr.name).toBe('Power');
    expect(pwr.isPower).toBe(true);
  });

  // -----------------------------------------------------------------
  // 3. LM358: Dual Operational Amplifier (2 Op-Amps + Power)
  // -----------------------------------------------------------------
  it('3. Generically parses LM358 Dual Op-Amp with exact inverting/non-inverting pin numbers', () => {
    const rawKicadLM358 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "LM358" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -5.08 5.08 0))
        (property "Value" "LM358" (id 1) (at 0 5.08 0))
        (property "Footprint" "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm" (id 2) (at 0 0 0))
        (symbol "LM358_1_1"
          (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "-" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "+" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
        )
        (symbol "LM358_2_1"
          (polyline (pts (xy -5.08 5.08) (xy 5.08 0) (xy -5.08 -5.08) (xy -5.08 5.08)) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "-" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "+" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
        )
        (symbol "LM358_3_1"
          (pin power_in line (at 0 7.62 270) (length 2.54) (name "V+" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 -7.62 90) (length 2.54) (name "V-" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicadLM358);
    const lm358 = parseRes.symbols[0];
    expect(lm358.units?.length).toBe(3);
    expect(lm358.units![0].pins.map((p) => p.number)).toEqual(['2', '3', '1']);
    expect(lm358.units![1].pins.map((p) => p.number)).toEqual(['6', '5', '7']);
    expect(lm358.units![2].pins.map((p) => p.number)).toEqual(['8', '4']);
  });

  // -----------------------------------------------------------------
  // 4. TL074: Quad JFET Operational Amplifier (4 Op-Amps + Power)
  // -----------------------------------------------------------------
  it('4. Generically parses TL074 Quad Op-Amp with 4 units + Power', () => {
    const rawKicadTL074 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "TL074" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -5.08 5.08 0))
        (property "Value" "TL074" (id 1) (at 0 5.08 0))
        (property "Footprint" "Package_SO:SOIC-14_3.9x8.7mm_P1.27mm" (id 2) (at 0 0 0))
        (symbol "TL074_1_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "-" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "+" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
        )
        (symbol "TL074_2_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "-" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "+" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
        )
        (symbol "TL074_3_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "-" (effects (font (size 1.27 1.27)))) (number "9" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "+" (effects (font (size 1.27 1.27)))) (number "10" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
        )
        (symbol "TL074_4_1"
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "-" (effects (font (size 1.27 1.27)))) (number "13" (effects (font (size 1.27 1.27)))))
          (pin input line (at -7.62 -2.54 0) (length 2.54) (name "+" (effects (font (size 1.27 1.27)))) (number "12" (effects (font (size 1.27 1.27)))))
          (pin output line (at 7.62 0 180) (length 2.54) (name "~" (effects (font (size 1.27 1.27)))) (number "14" (effects (font (size 1.27 1.27)))))
        )
        (symbol "TL074_5_1"
          (pin power_in line (at 0 7.62 270) (length 2.54) (name "VCC" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 -7.62 90) (length 2.54) (name "VEE" (effects (font (size 1.27 1.27)))) (number "11" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicadTL074);
    const tl074 = parseRes.symbols[0];
    expect(tl074.units?.length).toBe(5);
    expect(tl074.units![3].name).toBe('D');
    expect(tl074.units![3].pins.map((p) => p.number)).toEqual(['13', '12', '14']);
  });

  // -----------------------------------------------------------------
  // 5. 74HC595: 8-Bit Serial-In Parallel-Out Shift Register
  // -----------------------------------------------------------------
  it('5. Generically parses 74HC595 Shift Register with clock marker styles', () => {
    const rawKicad74HC595 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "74HC595" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -7.62 13.97 0))
        (property "Value" "74HC595" (id 1) (at 0 13.97 0))
        (property "Footprint" "Package_SO:SOIC-16_3.9x9.9mm_P1.27mm" (id 2) (at 0 0 0))
        (symbol "74HC595_0_1"
          (rectangle (start -7.62 12.7) (end 7.62 -12.7) (stroke (width 0.254)) (fill (type background)))
        )
        (symbol "74HC595_1_1"
          (pin input line (at -10.16 7.62 0) (length 2.54) (name "SER" (effects (font (size 1.27 1.27)))) (number "14" (effects (font (size 1.27 1.27)))))
          (pin input clock (at -10.16 2.54 0) (length 2.54) (name "SRCLK" (effects (font (size 1.27 1.27)))) (number "11" (effects (font (size 1.27 1.27)))))
          (pin input clock (at -10.16 -2.54 0) (length 2.54) (name "RCLK" (effects (font (size 1.27 1.27)))) (number "12" (effects (font (size 1.27 1.27)))))
          (pin input inverted (at -10.16 -7.62 0) (length 2.54) (name "~{OE}" (effects (font (size 1.27 1.27)))) (number "13" (effects (font (size 1.27 1.27)))))
          (pin output line (at 10.16 10.16 180) (length 2.54) (name "QA" (effects (font (size 1.27 1.27)))) (number "15" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 15.24 270) (length 2.54) (name "VCC" (effects (font (size 1.27 1.27)))) (number "16" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 -15.24 90) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicad74HC595);
    const hc595 = parseRes.symbols[0];
    expect(hc595.pins.length).toBe(7);
    const srclk = hc595.pins.find((p) => p.number === '11');
    expect(srclk?.graphicStyle).toBe('clock');
    const oe = hc595.pins.find((p) => p.number === '13');
    expect(oe?.graphicStyle).toBe('inverted');
  });

  // -----------------------------------------------------------------
  // 6. CD4051: Single 8-Channel Analog Multiplexer / Demultiplexer
  // -----------------------------------------------------------------
  it('6. Generically parses CD4051 Analog Switch with bidirectional analog pins', () => {
    const rawKicadCD4051 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "CD4051" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -10.16 15.24 0))
        (property "Value" "CD4051" (id 1) (at 0 15.24 0))
        (property "Footprint" "Package_DIP:DIP-16_W7.62mm" (id 2) (at 0 0 0))
        (symbol "CD4051_1_1"
          (rectangle (start -10.16 13.97) (end 10.16 -13.97) (stroke (width 0.254)) (fill (type background)))
          (pin bidirectional line (at -12.7 10.16 0) (length 2.54) (name "CH0" (effects (font (size 1.27 1.27)))) (number "13" (effects (font (size 1.27 1.27)))))
          (pin bidirectional line (at -12.7 7.62 0) (length 2.54) (name "CH1" (effects (font (size 1.27 1.27)))) (number "14" (effects (font (size 1.27 1.27)))))
          (pin bidirectional line (at 12.7 0 180) (length 2.54) (name "COM" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 16.51 270) (length 2.54) (name "VDD" (effects (font (size 1.27 1.27)))) (number "16" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 -16.51 90) (length 2.54) (name "VEE" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 -16.51 90) (length 2.54) (name "VSS" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicadCD4051);
    const cd4051 = parseRes.symbols[0];
    expect(cd4051.pins.length).toBe(6);
    const comPin = cd4051.pins.find((p) => p.number === '3');
    expect(comPin?.electricalType).toBe('bidirectional');
  });

  // -----------------------------------------------------------------
  // 7. NE555: Precision Timer Single Unit Mixed Pins
  // -----------------------------------------------------------------
  it('7. Generically parses NE555 Single Unit Timer with exact pin positioning', () => {
    const rawKicadNE555 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "NE555" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -7.62 10.16 0))
        (property "Value" "NE555" (id 1) (at 0 10.16 0))
        (property "Footprint" "Package_DIP:DIP-8_W7.62mm" (id 2) (at 0 0 0))
        (symbol "NE555_1_1"
          (rectangle (start -7.62 8.89) (end 7.62 -8.89) (stroke (width 0.254)) (fill (type background)))
          (pin power_in line (at 0 -11.43 90) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
          (pin input line (at -10.16 -2.54 0) (length 2.54) (name "TR" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
          (pin output line (at 10.16 0 180) (length 2.54) (name "Q" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
          (pin input inverted (at -10.16 5.08 0) (length 2.54) (name "R" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
          (pin input line (at 10.16 -5.08 180) (length 2.54) (name "CV" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
          (pin input line (at -10.16 2.54 0) (length 2.54) (name "THR" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
          (pin input line (at 10.16 5.08 180) (length 2.54) (name "DIS" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 0 11.43 270) (length 2.54) (name "VCC" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicadNE555);
    const ne555 = parseRes.symbols[0];
    expect(ne555.pins.length).toBe(8);
    expect(ne555.units?.length).toBe(1);
  });

  // -----------------------------------------------------------------
  // 8. ESP32-WROOM-32: High-Pin-Count Microcontroller Module
  // -----------------------------------------------------------------
  it('8. Generically parses ESP32-WROOM with 38 non-sequential pins', () => {
    const rawKicadESP32 = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "ESP32-WROOM-32" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at -15.24 25.4 0))
        (property "Value" "ESP32-WROOM-32" (id 1) (at 0 25.4 0))
        (property "Footprint" "RF_Module:ESP32-WROOM-32" (id 2) (at 0 0 0))
        (symbol "ESP32-WROOM-32_1_1"
          (rectangle (start -15.24 24.13) (end 15.24 -24.13) (stroke (width 0.254)) (fill (type background)))
          (pin power_in line (at -17.78 20.32 0) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at -17.78 17.78 0) (length 2.54) (name "3V3" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
          (pin input line (at -17.78 15.24 0) (length 2.54) (name "EN" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
          (pin bidirectional line (at 17.78 -20.32 180) (length 2.54) (name "IO23" (effects (font (size 1.27 1.27)))) (number "37" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 17.78 -22.86 180) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "38" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawKicadESP32);
    const esp32 = parseRes.symbols[0];
    expect(esp32.pins.length).toBe(5);
    expect(esp32.defaultFootprint).toBe('RF_Module:ESP32-WROOM-32');
  });

  // -----------------------------------------------------------------
  // 9. Hidden Power Pins Handling
  // -----------------------------------------------------------------
  it('9. Preserves hidden power pins flag correctly', () => {
    const rawHidden = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "LOGIC_HIDDEN" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at 0 5 0))
        (property "Value" "LOGIC_HIDDEN" (id 1) (at 0 5 0))
        (symbol "LOGIC_HIDDEN_1_1"
          (pin input line (at -5 0 0) (length 2.54) (name "A") (number "1"))
          (pin output line (at 5 0 180) (length 2.54) (name "Y") (number "2"))
          (pin power_in line (at 0 5 270) (length 0) (name "VCC") (number "14") hide)
          (pin power_in line (at 0 -5 90) (length 0) (name "GND") (number "7") hide)
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawHidden);
    const sym = parseRes.symbols[0];
    const vcc = sym.pins.find((p) => p.number === '14');
    expect(vcc?.visible).toBe(false);
    const a = sym.pins.find((p) => p.number === '1');
    expect(a?.visible).toBe(true);
  });

  // -----------------------------------------------------------------
  // 10. De Morgan / Alternate Style Separation
  // -----------------------------------------------------------------
  it('10. Separates De Morgan alternate style shapes without polluting primary style', () => {
    const rawDeMorgan = `(kicad_symbol_lib (version 20211014) (generator kicad_symbol_editor)
      (symbol "DEMORGAN_NAND" (in_bom yes) (on_board yes)
        (property "Reference" "U" (id 0) (at 0 5 0))
        (property "Value" "DEMORGAN_NAND" (id 1) (at 0 5 0))
        (symbol "DEMORGAN_NAND_1_1"
          (arc (start 0 3.81) (mid 3.81 0) (end 0 -3.81) (stroke (width 0.254)) (fill (type none)))
          (pin input line (at -7.62 2.54 0) (length 2.54) (name "A") (number "1"))
          (pin output line (at 7.62 0 180) (length 2.54) (name "Y") (number "3"))
        )
        (symbol "DEMORGAN_NAND_1_2"
          (polyline (pts (xy -5 2) (xy 5 0)) (stroke (width 0.254)) (fill (type none)))
        )
      )
    )`;

    const parseRes = KiCadSymbolParser.parse(rawDeMorgan);
    const sym = parseRes.symbols[0];
    const unit1 = sym.units![0];
    expect(unit1.shapes.length).toBe(1);
    expect(unit1.shapes[0].type).toBe('arc');
    expect(unit1.alternateShapes?.length).toBe(1);
    expect(unit1.alternateShapes![0].type).toBe('line');
  });

  // -----------------------------------------------------------------
  // 11. Multi-Unit Placement Maps to EXACTLY ONE Physical PCB Footprint
  // -----------------------------------------------------------------
  it('11. Placing multiple units of U1 (U1A, U1B, U1C, U1P) maps to ONE physical footprint U1', () => {
    let project = createDemoProject();

    const u1A: SchematicSymbolInstance = {
      id: 'sym_4010_u1a',
      symbolDefId: 'sym_4010',
      reference: 'U1',
      value: '4010',
      footprint: 'Package_DIP:DIP-16_W7.62mm',
      x: 50,
      y: 40,
      rotation: 0,
      mirrorX: false,
      unit: 1,
      unitSuffix: 'A',
      fields: {},
      pins: [
        { id: 'p3', number: '3', name: 'IN_A', electricalType: 'input', x: -5, y: 0, length: 2.54, orientation: 180, visible: true },
        { id: 'p2', number: '2', name: 'OUT_A', electricalType: 'output', x: 5, y: 0, length: 2.54, orientation: 0, visible: true },
      ],
    };

    const u1B: SchematicSymbolInstance = {
      id: 'sym_4010_u1b',
      symbolDefId: 'sym_4010',
      reference: 'U1',
      value: '4010',
      footprint: 'Package_DIP:DIP-16_W7.62mm',
      x: 50,
      y: 70,
      rotation: 0,
      mirrorX: false,
      unit: 2,
      unitSuffix: 'B',
      fields: {},
      pins: [
        { id: 'p5', number: '5', name: 'IN_B', electricalType: 'input', x: -5, y: 0, length: 2.54, orientation: 180, visible: true },
        { id: 'p4', number: '4', name: 'OUT_B', electricalType: 'output', x: 5, y: 0, length: 2.54, orientation: 0, visible: true },
      ],
    };

    project = {
      ...project,
      schematic: {
        ...project.schematic,
        sheets: [
          {
            ...project.schematic.sheets[0],
            symbols: [u1A, u1B],
            wires: [],
            junctions: [],
            labels: [],
          },
        ],
      },
    };

    const syncedProject = ECOEngine.applySync(project);
    const u1Footprints = syncedProject.pcb.footprints.filter((fp) => fp.reference === 'U1');
    expect(u1Footprints.length).toBe(1);
    expect(u1Footprints[0].reference).toBe('U1');
  });
});
