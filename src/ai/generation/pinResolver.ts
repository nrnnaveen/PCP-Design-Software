/**
 * FloZ ECA - Pin Resolver
 * Authoritative pin lookup on real symbol definitions, preventing pinout hallucinations.
 */

import { SymbolDefinition, SchematicPin } from '../../core/types';

export class PinResolver {
  /**
   * Resolves a pin query (number or name) on an authoritative SymbolDefinition
   */
  public static resolvePin(symbolDef: SymbolDefinition, pinQuery: string): SchematicPin | null {
    if (!symbolDef || !symbolDef.pins || symbolDef.pins.length === 0) return null;

    const q = pinQuery.toLowerCase().trim();

    // 1. Direct Pin Number match
    const byNumber = symbolDef.pins.find((p) => p.number.toLowerCase() === q);
    if (byNumber) return byNumber;

    // 2. Direct Pin Name match
    const byName = symbolDef.pins.find((p) => p.name.toLowerCase() === q);
    if (byName) return byName;

    // 3. Slash/Compound Name match (e.g. "PB7" matching "PB7/SDA" or "SDA" matching "PB7/SDA")
    const byCompound = symbolDef.pins.find((p) => {
      const parts = p.name.toLowerCase().split(/[\/_\-\s]/);
      return parts.includes(q) || p.name.toLowerCase().includes(q);
    });
    if (byCompound) return byCompound;

    // 4. Power Aliases
    if (q === 'vcc' || q === 'vdd' || q === '3v3' || q === '+3.3v' || q === 'power') {
      const pwr = symbolDef.pins.find((p) => {
        const n = p.name.toLowerCase();
        return n.includes('vdd') || n.includes('vcc') || n.includes('3v3') || p.electricalType === 'power_in';
      });
      if (pwr) return pwr;
    }

    if (q === 'gnd' || q === 'vss' || q === 'vssa' || q === 'ground' || q === '0v') {
      const gnd = symbolDef.pins.find((p) => {
        const n = p.name.toLowerCase();
        return n.includes('gnd') || n.includes('vss') || n.includes('vssa');
      });
      if (gnd) return gnd;
    }

    if (q === 'vbus' || q === 'vin' || q === '5v') {
      const vin = symbolDef.pins.find((p) => {
        const n = p.name.toLowerCase();
        return n.includes('vbus') || n.includes('vin') || n.includes('5v') || n.includes('in');
      });
      if (vin) return vin;
    }

    if (q === 'vout' || q === 'out') {
      const vout = symbolDef.pins.find((p) => {
        const n = p.name.toLowerCase();
        return n.includes('vout') || n.includes('out') || p.electricalType === 'power_out';
      });
      if (vout) return vout;
    }

    // 5. I2C Aliases
    if (q === 'sda') {
      const sda = symbolDef.pins.find((p) => p.name.toLowerCase().includes('sda') || p.name.toLowerCase().includes('pb7'));
      if (sda) return sda;
    }
    if (q === 'scl') {
      const scl = symbolDef.pins.find((p) => p.name.toLowerCase().includes('scl') || p.name.toLowerCase().includes('pb6'));
      if (scl) return scl;
    }

    // 6. USB Aliases
    if (q === 'dp' || q === 'd+' || q === 'usb_dp') {
      const dp = symbolDef.pins.find((p) => p.name.toLowerCase().includes('dp') || p.name.toLowerCase().includes('d+') || p.name.toLowerCase().includes('pa12'));
      if (dp) return dp;
    }
    if (q === 'dm' || q === 'd-' || q === 'usb_dm') {
      const dm = symbolDef.pins.find((p) => p.name.toLowerCase().includes('dm') || p.name.toLowerCase().includes('d-') || p.name.toLowerCase().includes('pa11'));
      if (dm) return dm;
    }

    return null;
  }
}
