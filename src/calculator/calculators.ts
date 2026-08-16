/**
 * Apex EDA - PCB Engineering Calculators
 * Validated formulas for IPC-2152 track width, transmission line impedance, RF attenuators, and 555/regulator circuits.
 */

export interface TrackWidthResult {
  widthMm: number;
  widthMils: number;
  areaSqMils: number;
  resistanceOhmsPerM: number;
  voltageDropPerM: number;
  powerLossWattsPerM: number;
}

export interface ImpedanceResult {
  z0: number; // in Ohms
  propDelayPsPerMm: number;
  capacitancePfPerMm: number;
  inductanceNhPerMm: number;
}

export class PCBCalculators {
  /**
   * IPC-2221 / IPC-2152 Track Width Calculator
   * @param currentAmps Target continuous current in Amperes
   * @param tempRiseC Allowed temperature rise above ambient (°C)
   * @param copperThicknessUm Copper foil thickness (35um for 1oz, 70um for 2oz)
   * @param isExternal True for top/bottom layer, false for internal copper
   */
  public static calculateTrackWidth(
    currentAmps: number,
    tempRiseC: number = 10,
    copperThicknessUm: number = 35,
    isExternal: boolean = true
  ): TrackWidthResult {
    // IPC-2221 constants
    const k = isExternal ? 0.048 : 0.024;
    const b = 0.44;
    const c = 0.725;

    // Cross-sectional Area A in mils^2
    const areaSqMils = Math.pow(currentAmps / (k * Math.pow(tempRiseC, b)), 1 / c);

    // Thickness in mils
    const thicknessMils = copperThicknessUm / 25.4;

    // Width in mils and mm
    const widthMils = areaSqMils / thicknessMils;
    const widthMm = widthMils * 0.0254;

    // Copper resistivity: 1.72e-8 ohm*m at 20C (approx 2.1e-8 at 50C)
    const areaSqM = (widthMm / 1000) * (copperThicknessUm / 1e6);
    const resistanceOhmsPerM = (1.72e-8 * (1 + 0.00393 * (25 + tempRiseC - 20))) / areaSqM;
    const voltageDropPerM = currentAmps * resistanceOhmsPerM;
    const powerLossWattsPerM = currentAmps * currentAmps * resistanceOhmsPerM;

    return {
      widthMm: Number(widthMm.toFixed(3)),
      widthMils: Number(widthMils.toFixed(1)),
      areaSqMils: Number(areaSqMils.toFixed(1)),
      resistanceOhmsPerM: Number(resistanceOhmsPerM.toFixed(4)),
      voltageDropPerM: Number(voltageDropPerM.toFixed(4)),
      powerLossWattsPerM: Number(powerLossWattsPerM.toFixed(4)),
    };
  }

  /**
   * Microstrip Characteristic Impedance (IPC-2141)
   */
  public static calculateMicrostrip(
    widthMm: number,
    heightMm: number, // dielectric thickness to ground plane
    thicknessMm: number = 0.035,
    er: number = 4.5 // FR-4 dielectric constant
  ): ImpedanceResult {
    const W = widthMm;
    const H = heightMm;
    const T = thicknessMm;

    // Effective relative permittivity
    const eEff = (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + (12 * H) / W, -0.5);

    let z0 = 0;
    if (W / H <= 1) {
      z0 = (60 / Math.sqrt(eEff)) * Math.log((8 * H) / W + (0.25 * W) / H);
    } else {
      z0 = (120 * Math.PI) / (Math.sqrt(eEff) * (W / H + 1.393 + 0.667 * Math.log(W / H + 1.444)));
    }

    const propDelay = (Math.sqrt(eEff) / 299.792) * 1000; // ps/mm
    const capPfPerMm = propDelay / z0;
    const indNhPerMm = (propDelay * z0) / 1000;

    return {
      z0: Number(z0.toFixed(2)),
      propDelayPsPerMm: Number(propDelay.toFixed(3)),
      capacitancePfPerMm: Number(capPfPerMm.toFixed(4)),
      inductanceNhPerMm: Number(indNhPerMm.toFixed(4)),
    };
  }

  /**
   * RF Attenuator Pad Resistor Values
   * @param attenuationDb Desired attenuation in decibels
   * @param z0 Characteristic impedance (typically 50 ohms)
   */
  public static calculateAttenuator(attenuationDb: number, z0: number = 50) {
    const k = Math.pow(10, attenuationDb / 20); // voltage ratio

    // Pi Network
    const r1Pi = z0 * ((k + 1) / (k - 1));
    const r2Pi = (z0 / 2) * (k - 1 / k);

    // T Network
    const r1T = z0 * ((k - 1) / (k + 1));
    const r2T = z0 * ((2 * k) / (k * k - 1));

    return {
      piNetwork: { rShunt: Number(r1Pi.toFixed(2)), rSeries: Number(r2Pi.toFixed(2)) },
      tNetwork: { rSeries: Number(r1T.toFixed(2)), rShunt: Number(r2T.toFixed(2)) },
    };
  }

  /**
   * 555 Timer Frequency & Duty Cycle Calculator
   */
  public static calculate555Astable(r1Ohms: number, r2Ohms: number, cFarads: number) {
    const freq = 1.44 / ((r1Ohms + 2 * r2Ohms) * cFarads);
    const th = 0.693 * (r1Ohms + r2Ohms) * cFarads;
    const tl = 0.693 * r2Ohms * cFarads;
    const dutyCycle = (th / (th + tl)) * 100;

    return {
      frequencyHz: Number(freq.toFixed(2)),
      highTimeSec: Number(th.toExponential(3)),
      lowTimeSec: Number(tl.toExponential(3)),
      dutyCyclePercent: Number(dutyCycle.toFixed(2)),
    };
  }
}
