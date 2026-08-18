/**
 * FloZ ECA - Library Resolver
 * Resolves planned circuit components against authoritative FloZ ECA symbol libraries (built-in and imported).
 */

import { SymbolDefinition } from '../../core/types';
import { libraryRegistry } from '../../library/libraryRegistry';

export class LibraryResolver {
  /**
   * Resolves a query term (e.g. "STM32F401", "USB-C", "AP2112K", "SHT31", "Resistor", "Capacitor")
   * to an authoritative SymbolDefinition from the library registry.
   */
  public static resolveSymbol(query: string): SymbolDefinition | null {
    const all = libraryRegistry.getAllSymbols();
    const q = query.toLowerCase().trim();

    // 1. Exact ID match
    const exactId = all.find((s) => s.id.toLowerCase() === q);
    if (exactId) return exactId;

    // 2. Exact Name match
    const exactName = all.find((s) => s.name.toLowerCase() === q);
    if (exactName) return exactName;

    // 3. Keyword / Category aliases
    if (q.includes('stm32') || q.includes('mcu') || q.includes('cortex') || q.includes('f401')) {
      const stm = all.find((s) => s.id.includes('stm32') || s.name.includes('STM32'));
      if (stm) return stm;
    }

    if (q.includes('usb') || q.includes('type-c') || q.includes('usbc')) {
      const usbc = all.find((s) => s.id.includes('usbc') || s.name.includes('USB_C'));
      if (usbc) return usbc;
    }

    if (q.includes('regulator') || q.includes('ldo') || q.includes('3.3v') || q.includes('ap2112') || q.includes('3v3')) {
      const ldo = all.find((s) => s.id.includes('ap2112') || s.id.includes('reg_') || s.name.includes('AP2112K'));
      if (ldo) return ldo;
    }

    if (q.includes('sht31') || q.includes('sensor') || q.includes('humidity') || q.includes('temp')) {
      const sht = all.find((s) => s.id.includes('sht31') || s.name.includes('SHT31'));
      if (sht) return sht;
    }

    if (q.includes('esp32') || q.includes('wifi') || q.includes('bluetooth')) {
      const esp = all.find((s) => s.id.includes('esp32') || s.name.includes('ESP32'));
      if (esp) return esp;
    }

    if (q.includes('fuse') || q.includes('polyfuse') || q.includes('ptc')) {
      const f = all.find((s) => s.id.includes('fuse') || s.name.includes('Fuse'));
      if (f) return f;
    }

    if (q.includes('electrolytic') || q.includes('cp') || q.includes('bulk')) {
      const cp = all.find((s) => s.id.includes('cp') || s.name.includes('CP'));
      if (cp) return cp;
    }

    if (q.includes('555') || q.includes('timer')) {
      const t = all.find((s) => s.id.includes('555') || s.name.includes('NE555'));
      if (t) return t;
    }

    if (q.includes('358') || q.includes('opamp') || q.includes('op-amp')) {
      const op = all.find((s) => s.id.includes('358') || s.name.includes('LM358'));
      if (op) return op;
    }

    if (q === 'r' || q.includes('resistor') || q.includes('pullup') || q.includes('divider')) {
      const r = all.find((s) => s.id === 'device_r' || s.name === 'R');
      if (r) return r;
    }

    if (q === 'c' || q.includes('capacitor') || q.includes('decoupling') || q.includes('filter')) {
      const c = all.find((s) => s.id === 'device_c' || s.name === 'C');
      if (c) return c;
    }

    if (q.includes('led')) {
      const led = all.find((s) => s.id === 'device_led' || s.name === 'LED');
      if (led) return led;
    }

    if (q.includes('diode') || q.includes('schottky')) {
      const d = all.find((s) => s.id === 'device_d' || s.name.includes('D_'));
      if (d) return d;
    }

    if (q.includes('crystal') || q.includes('oscillator')) {
      const y = all.find((s) => s.id === 'device_crystal' || s.name === 'Crystal');
      if (y) return y;
    }

    if (q.includes('header') || q.includes('connector')) {
      const conn = all.find((s) => s.id === 'conn_header_1x4' || s.id === 'conn_header_1x2' || s.name.includes('Header'));
      if (conn) return conn;
    }

    if (q.includes('button') || q.includes('switch') || q.includes('tactile') || q.includes('push')) {
      const sw = all.find((s) => s.id.includes('sw_') || s.name.includes('SW_') || s.category.includes('Switch'));
      if (sw) return sw;
    }

    if (q.includes('4010') || q.includes('cd4010') || q.includes('hex buffer') || q.includes('non-inverting buffer')) {
      const b = all.find((s) => s.id.includes('4010') || s.name.includes('4010'));
      if (b) return b;
    }

    if (q.includes('7400') || q.includes('74ls00') || q.includes('74hc00') || q.includes('nand')) {
      const nand = all.find((s) => s.id.includes('7400') || s.name.includes('7400'));
      if (nand) return nand;
    }

    // 4. Substring / Keyword Search
    const substringMatch = all.find(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.toLowerCase().includes(q))
    );
    if (substringMatch) return substringMatch;

    return null;
  }
}
