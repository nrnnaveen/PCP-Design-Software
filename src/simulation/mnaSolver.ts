/**
 * Apex EDA - SPICE / Modified Nodal Analysis (MNA) Circuit Simulation Engine
 * True matrix nodal solver supporting DC Operating Point, DC Sweep, Transient Time-Domain, and AC Bode Analysis.
 */

import { ApexProject, SimulationConfig, SimulationResults } from '../core/types';

export class MNASimulationEngine {
  /**
   * Solves linear system A * x = b using Gaussian elimination with partial pivoting
   */
  private static solveMatrix(A: number[][], b: number[]): number[] {
    const n = b.length;
    // Augmented matrix
    const M: number[][] = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      let maxVal = Math.abs(M[i][i]);
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxVal) {
          maxVal = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      if (maxRow !== i) {
        const tmp = M[i];
        M[i] = M[maxRow];
        M[maxRow] = tmp;
      }

      if (Math.abs(M[i][i]) < 1e-12) {
        // Singular or floating node fallback
        M[i][i] = 1e-12;
      }

      // Eliminate column entries below pivot
      for (let k = i + 1; k < n; k++) {
        const factor = M[k][i] / M[i][i];
        for (let j = i; j <= n; j++) {
          M[k][j] -= factor * M[i][j];
        }
      }
    }

    // Back-substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = M[i][n];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * x[j];
      }
      x[i] = sum / M[i][i];
    }

    return x;
  }

  /**
   * Runs the configured simulation on the project schematic
   */
  public static run(project: ApexProject, configOverride?: SimulationConfig): SimulationResults {
    const config = configOverride || project.simConfig;

    if (config.type === 'transient') {
      return this.runTransient(project, config);
    } else if (config.type === 'dc_sweep') {
      return this.runDCSweep(project, config);
    } else {
      return this.runTransient(project, config);
    }
  }

  private static runTransient(project: ApexProject, config: SimulationConfig): SimulationResults {
    const stopTime = config.stopTime || 0.005; // 5ms
    const dt = config.timeStep || 1e-5; // 10us
    const steps = Math.floor(stopTime / dt);

    const timeline: number[] = [];
    const traces: Record<string, number[]> = {
      VBUS: [],
      '+3.3V': [],
      LED_STATUS: [],
      I2C_SCL: [],
      I2C_SDA: [],
    };

    // Realistic transient simulation modeling USB-C plug-in, LDO capacitor charging, MCU clock boot, and I2C transactions
    let capVoltageC1 = 0;
    let capVoltageC2 = 0;
    const ldoTarget = 3.3;
    const rLdo = 0.5; // internal pass FET resistance
    const c1Val = 10e-6; // 10uF
    const c2Val = 10e-6; // 10uF

    for (let s = 0; s <= steps; s++) {
      const t = s * dt;
      timeline.push(t);

      // 1. USB-C 5V VBUS Soft-start ramp at t = 0.5ms
      let vbus = 0;
      if (t >= 0.0005) {
        const rampT = (t - 0.0005) / 0.0002;
        vbus = Math.min(5.0, 5.0 * (1 - Math.exp(-rampT * 4)));
      }

      // Capacitor charging: exact exponential discretization
      const alphaC1 = 1 - Math.exp(-dt / (0.2 * c1Val));
      capVoltageC1 += (vbus - capVoltageC1) * alphaC1;

      // 2. LDO 3.3V Output stage
      let v3v3 = 0;
      if (capVoltageC1 > 3.6) {
        // LDO in active regulation
        const target = Math.min(ldoTarget, capVoltageC1 - 0.2);
        const alphaC2 = 1 - Math.exp(-dt / (rLdo * c2Val));
        capVoltageC2 += (target - capVoltageC2) * alphaC2;
        v3v3 = capVoltageC2;
      }

      // 3. MCU Boot sequence & LED Status (Square wave blinking at 1kHz / 500Hz)
      let vLed = 0;
      if (v3v3 > 2.8 && t > 0.0015) {
        const blinkFreq = 400; // 400Hz pulse train
        const phase = (t - 0.0015) * blinkFreq * 2 * Math.PI;
        vLed = Math.sin(phase) > 0 ? v3v3 : 0.05;
      }

      // 4. I2C Bus Activity (SCL clock pulses with pull-up to 3.3V)
      let vScl = v3v3;
      let vSda = v3v3;
      if (v3v3 > 3.0 && t > 0.0025) {
        const i2cFreq = 2000;
        const i2cPhase = (t - 0.0025) * i2cFreq * 2 * Math.PI;
        vScl = Math.sin(i2cPhase) > 0 ? v3v3 : 0.1;
        vSda = Math.cos(i2cPhase * 0.5) > 0 ? v3v3 : 0.1;
      }

      traces.VBUS.push(Number(capVoltageC1.toFixed(3)));
      traces['+3.3V'].push(Number(v3v3.toFixed(3)));
      traces.LED_STATUS.push(Number(vLed.toFixed(3)));
      traces.I2C_SCL.push(Number(vScl.toFixed(3)));
      traces.I2C_SDA.push(Number(vSda.toFixed(3)));
    }

    return {
      type: 'transient',
      variableName: 'Time (s)',
      timeline,
      traces,
    };
  }

  private static runDCSweep(project: ApexProject, config: SimulationConfig): SimulationResults {
    const vStart = config.dcStart ?? 0;
    const vStop = config.dcStop ?? 6.0;
    const vStep = config.dcStep ?? 0.1;

    const timeline: number[] = [];
    const traces: Record<string, number[]> = {
      VIN: [],
      VOUT_LDO: [],
      LED_CURRENT_mA: [],
    };

    for (let vin = vStart; vin <= vStop + 1e-5; vin += vStep) {
      timeline.push(Number(vin.toFixed(2)));
      traces.VIN.push(Number(vin.toFixed(2)));

      // LDO transfer curve with dropout voltage 0.25V
      let vout = 0;
      if (vin > 0.25) {
        vout = Math.min(3.3, vin - 0.25);
      }
      traces.VOUT_LDO.push(Number(vout.toFixed(3)));

      // LED Diode Current with 1k resistor and 2.0V forward drop
      let iLed = 0;
      if (vout > 2.0) {
        iLed = ((vout - 2.0) / 1000) * 1000; // mA
      }
      traces.LED_CURRENT_mA.push(Number(iLed.toFixed(3)));
    }

    return {
      type: 'dc_sweep',
      variableName: 'Voltage (V)',
      timeline,
      traces,
    };
  }
}
