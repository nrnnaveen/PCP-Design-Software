import { describe, it, expect } from 'vitest';
import { SExprParser, KiCadSymbolParser, KiCadFootprintParser } from '../library/kicadParser';

describe('KiCad S-Expression & Library Parser Tests', () => {
  it('should correctly tokenize and parse nested S-expressions', () => {
    const raw = `(kicad_symbol_lib (version 20211014) (generator "kicad_symbol_editor")
      (symbol "Device:R" (pin passive line (at 0 3.81 270) (length 3.81) (name "~") (number "1"))
      (property "Reference" "R") (property "Value" "R")))`;

    const tokens = SExprParser.tokenize(raw);
    expect(tokens.length).toBeGreaterThan(10);
    expect(tokens[0]).toBe('(');
    expect(tokens[1]).toBe('kicad_symbol_lib');

    const ast = SExprParser.parseTokens(tokens);
    expect(ast.length).toBe(1);
    expect(Array.isArray(ast[0])).toBe(true);
  });

  it('should parse real KiCad .kicad_sym symbol files with pins and properties', () => {
    const sampleSym = `(kicad_symbol_lib (version 20211014) (generator "kicad_symbol_editor")
      (symbol "Sensor:BME280" (in_bom yes) (on_board yes)
        (property "Reference" "U" (at 0 10.16 0))
        (property "Value" "BME280" (at 0 7.62 0))
        (property "Footprint" "Package_LGA:LGA-8_2.5x2.5mm_P0.65mm" (at 0 5.08 0))
        (property "Datasheet" "https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf")
        (property "ki_description" "Combined humidity and pressure sensor")
        (property "ki_keywords" "Bosch climate environmental pressure humidity temperature")
        (symbol "BME280_0_1"
          (rectangle (start -10.16 8.89) (end 10.16 -8.89) (stroke (width 0.254)))
        )
        (symbol "BME280_1_1"
          (pin power_in line (at -12.7 5.08 0) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "1" (effects (font (size 1.27 1.27)))))
          (pin input line (at -12.7 2.54 0) (length 2.54) (name "CSB" (effects (font (size 1.27 1.27)))) (number "2" (effects (font (size 1.27 1.27)))))
          (pin bidirectional line (at -12.7 0 0) (length 2.54) (name "SDI" (effects (font (size 1.27 1.27)))) (number "3" (effects (font (size 1.27 1.27)))))
          (pin input line (at -12.7 -2.54 0) (length 2.54) (name "SCK" (effects (font (size 1.27 1.27)))) (number "4" (effects (font (size 1.27 1.27)))))
          (pin bidirectional line (at 12.7 -2.54 180) (length 2.54) (name "SDO" (effects (font (size 1.27 1.27)))) (number "5" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 12.7 0 180) (length 2.54) (name "VDDIO" (effects (font (size 1.27 1.27)))) (number "6" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 12.7 2.54 180) (length 2.54) (name "GND" (effects (font (size 1.27 1.27)))) (number "7" (effects (font (size 1.27 1.27)))))
          (pin power_in line (at 12.7 5.08 180) (length 2.54) (name "VDD" (effects (font (size 1.27 1.27)))) (number "8" (effects (font (size 1.27 1.27)))))
        )
      )
    )`;

    const res = KiCadSymbolParser.parse(sampleSym, 'Sensor');
    expect(res.errors.length).toBe(0);
    expect(res.symbols.length).toBe(1);

    const bme = res.symbols[0];
    expect(bme.name).toBe('BME280');
    expect(bme.defaultPrefix).toBe('U');
    expect(bme.defaultFootprint).toContain('LGA-8');
    expect(bme.pins.length).toBe(8);
    expect(bme.pins[0].name).toBe('GND');
    expect(bme.pins[0].electricalType).toBe('power_in');
    expect(bme.shapes.length).toBeGreaterThanOrEqual(1);
  });

  it('should parse real KiCad .kicad_mod footprint files with pads and 3D models', () => {
    const sampleMod = `(footprint "Package_SO:SOIC-8_3.9x4.9mm_P1.27mm" (version 20211014) (generator "kicad_footprint_editor")
      (layer "F.Cu")
      (descr "8-Lead Plastic Small Outline Package 150-mil body width")
      (tags "SOIC 1.27mm")
      (fp_line (start -2.0 -2.5) (end 2.0 -2.5) (layer "F.Silkscreen") (stroke (width 0.15)))
      (fp_line (start 2.0 -2.5) (end 2.0 2.5) (layer "F.Silkscreen") (stroke (width 0.15)))
      (fp_line (start 2.0 2.5) (end -2.0 2.5) (layer "F.Silkscreen") (stroke (width 0.15)))
      (fp_line (start -2.0 2.5) (end -2.0 -2.5) (layer "F.Silkscreen") (stroke (width 0.15)))
      (pad "1" smd roundrect (at -2.6 -1.905) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "2" smd roundrect (at -2.6 -0.635) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "3" smd roundrect (at -2.6 0.635) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "4" smd roundrect (at -2.6 1.905) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "5" smd roundrect (at 2.6 1.905) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "6" smd roundrect (at 2.6 0.635) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "7" smd roundrect (at 2.6 -0.635) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (pad "8" smd roundrect (at 2.6 -1.905) (size 1.55 0.6) (layers "F.Cu" "F.Paste" "F.Mask"))
      (model "Package_SO.3dshapes/SOIC-8_3.9x4.9mm_P1.27mm.wrl" (offset (xyz 0 0 0)) (scale (xyz 1 1 1)) (rotate (xyz 0 0 0)))
    )`;

    const res = KiCadFootprintParser.parse(sampleMod, 'Package_SO');
    expect(res.errors.length).toBe(0);
    expect(res.footprints.length).toBe(1);

    const fp = res.footprints[0];
    expect(fp.name).toBe('SOIC-8_3.9x4.9mm_P1.27mm');
    expect(fp.pads.length).toBe(8);
    expect(fp.isSMD).toBe(true);
    expect(fp.pads[0].shape).toBe('roundrect');
    expect(fp.model3D?.modelPath).toContain('SOIC-8');
    expect(fp.courtyard.maxX).toBeGreaterThan(0);
  });
});
