/**
 * Apex EDA - Multi-Tab Engineering Calculators Workbench
 * IPC-2152 Track width, Microstrip impedance, RF attenuators, and 555/regulator circuit design.
 */

import React, { useState } from 'react';
import { PCBCalculators } from './calculators';
import { Calculator, Cpu, Radio, Zap, Activity } from 'lucide-react';

export const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'track' | 'impedance' | 'attenuator' | '555'>('track');

  // Track Width Calculator States
  const [currentAmps, setCurrentAmps] = useState<number>(2.0);
  const [tempRiseC, setTempRiseC] = useState<number>(10);
  const [copperOz, setCopperOz] = useState<number>(1);
  const [isExternal, setIsExternal] = useState<boolean>(true);

  // Impedance States
  const [traceWidthMm, setTraceWidthMm] = useState<number>(0.3);
  const [heightMm, setHeightMm] = useState<number>(0.2);
  const [erVal, setErVal] = useState<number>(4.5);

  // Attenuator States
  const [attenDb, setAttenDb] = useState<number>(6.0);
  const [z0Val, setZ0Val] = useState<number>(50.0);

  // 555 States
  const [r1Val, setR1Val] = useState<number>(10000); // 10k
  const [r2Val, setR2Val] = useState<number>(100000); // 100k
  const [cValUf, setCValUf] = useState<number>(0.1); // 0.1uF

  const trackResult = PCBCalculators.calculateTrackWidth(
    currentAmps,
    tempRiseC,
    copperOz * 35,
    isExternal
  );

  const impedanceResult = PCBCalculators.calculateMicrostrip(
    traceWidthMm,
    heightMm,
    0.035,
    erVal
  );

  const attenuatorResult = PCBCalculators.calculateAttenuator(attenDb, z0Val);

  const timerResult = PCBCalculators.calculate555Astable(r1Val, r2Val, cValUf * 1e-6);

  return (
    <div className="relative w-full h-full flex flex-col bg-cad-bg select-none p-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xs border border-blue-500/20">
            <Calculator size={20} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-cad-textHeading">PCB Design Calculators</h1>
            <p className="text-[11px] text-cad-textMuted">
              Formulas for trace width sizing, impedance matching, and circuit parameters.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 border-b border-cad-border pb-1.5">
          {[
            { id: 'track', label: 'IPC-2152 Track Width', icon: Zap },
            { id: 'impedance', label: 'Microstrip Impedance', icon: Activity },
            { id: 'attenuator', label: 'RF Attenuator Pads', icon: Radio },
            { id: '555', label: '555 Timer Frequency', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2.5 py-1 rounded-xs text-xs font-medium flex items-center gap-1.5 transition-colors duration-fast ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-cad-panel text-cad-text hover:bg-cad-surfaceHover border border-cad-border'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: IPC-2152 Track Width */}
        {activeTab === 'track' && (
          <div className="grid grid-cols-2 gap-4 bg-cad-panel border border-cad-border p-4 rounded-xs">
            {/* Inputs */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cad-textMuted font-mono">
                Parameters
              </h3>

              <div>
                <label className="text-xs text-cad-text block mb-1">Target Current (Amps)</label>
                <input
                  type="number"
                  step="0.1"
                  value={currentAmps}
                  onChange={(e) => setCurrentAmps(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-xs px-2.5 py-1 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">Temperature Rise (°C)</label>
                <input
                  type="number"
                  value={tempRiseC}
                  onChange={(e) => setTempRiseC(Math.max(1, parseFloat(e.target.value) || 10))}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded-xs px-2.5 py-1 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">Copper Thickness</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setCopperOz(1)}
                    className={`py-1 text-xs rounded-xs font-mono border transition-colors duration-fast ${
                      copperOz === 1 ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs' : 'bg-cad-subpanel border-cad-border text-cad-text hover:bg-cad-surfaceHover'
                    }`}
                  >
                    1 oz (35 µm)
                  </button>
                  <button
                    onClick={() => setCopperOz(2)}
                    className={`py-1 text-xs rounded-xs font-mono border transition-colors duration-fast ${
                      copperOz === 2 ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-xs' : 'bg-cad-subpanel border-cad-border text-cad-text hover:bg-cad-surfaceHover'
                    }`}
                  >
                    2 oz (70 µm)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">Layer Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setIsExternal(true)}
                    className={`py-1 text-xs rounded-xs font-mono border transition-colors duration-fast ${
                      isExternal ? 'bg-blue-600/20 border-blue-500 text-cad-textHeading font-semibold' : 'bg-cad-bg border-cad-border text-cad-text'
                    }`}
                  >
                    External Layer
                  </button>
                  <button
                    onClick={() => setIsExternal(false)}
                    className={`py-1 text-xs rounded-xs font-mono border transition-colors duration-fast ${
                      !isExternal ? 'bg-blue-600/20 border-blue-500 text-cad-textHeading font-semibold' : 'bg-cad-bg border-cad-border text-cad-text'
                    }`}
                  >
                    Internal Layer
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-cad-subpanel border border-cad-border p-3.5 rounded-xs flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono mb-2.5">
                  Calculated Results (IPC-2152)
                </h3>

                <div className="space-y-2 font-mono">
                  <div className="bg-cad-panel p-2.5 rounded-xs border border-cad-border flex justify-between items-center">
                    <span className="text-xs text-cad-text">Minimum Track Width:</span>
                    <span className="text-sm font-bold text-cad-textHeading">
                      {trackResult.widthMm} mm ({trackResult.widthMils} mil)
                    </span>
                  </div>

                  <div className="bg-cad-panel p-2.5 rounded-xs border border-cad-border flex justify-between items-center">
                    <span className="text-xs text-cad-text">Resistance per Meter:</span>
                    <span className="text-xs font-bold text-blue-500 dark:text-blue-400">
                      {trackResult.resistanceOhmsPerM} Ω/m
                    </span>
                  </div>

                  <div className="bg-cad-panel p-2.5 rounded-xs border border-cad-border flex justify-between items-center">
                    <span className="text-xs text-cad-text">Voltage Drop per Meter:</span>
                    <span className="text-xs font-bold text-amber-500 dark:text-amber-400">
                      {trackResult.voltageDropPerM} V/m
                    </span>
                  </div>

                  <div className="bg-cad-panel p-2.5 rounded-xs border border-cad-border flex justify-between items-center">
                    <span className="text-xs text-cad-text">Power Loss:</span>
                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                      {trackResult.powerLossWattsPerM} W/m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Microstrip Impedance */}
        {activeTab === 'impedance' && (
          <div className="grid grid-cols-2 gap-6 bg-cad-panel border border-cad-border p-5 rounded">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cad-textMuted font-mono">
                Microstrip Geometry
              </h3>

              <div>
                <label className="text-xs text-cad-text block mb-1">Trace Width W (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={traceWidthMm}
                  onChange={(e) => setTraceWidthMm(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">Dielectric Height H (mm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={heightMm}
                  onChange={(e) => setHeightMm(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">Relative Permittivity Er (FR4 = 4.5)</label>
                <input
                  type="number"
                  step="0.1"
                  value={erVal}
                  onChange={(e) => setErVal(parseFloat(e.target.value) || 4.5)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-cad-subpanel border border-cad-border p-4 rounded space-y-3 font-mono">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                Transmission Line Characteristics
              </h3>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">Characteristic Impedance Z₀:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{impedanceResult.z0} Ω</span>
              </div>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">Propagation Delay:</span>
                <span className="text-xs font-bold text-cad-textHeading">{impedanceResult.propDelayPsPerMm} ps/mm</span>
              </div>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">Capacitance:</span>
                <span className="text-xs font-bold text-cad-textHeading">{impedanceResult.capacitancePfPerMm} pF/mm</span>
              </div>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">Inductance:</span>
                <span className="text-xs font-bold text-cad-textHeading">{impedanceResult.inductanceNhPerMm} nH/mm</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Attenuator */}
        {activeTab === 'attenuator' && (
          <div className="grid grid-cols-2 gap-6 bg-cad-panel border border-cad-border p-5 rounded">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cad-textMuted font-mono">
                RF Attenuator Specification
              </h3>

              <div>
                <label className="text-xs text-cad-text block mb-1">Attenuation (dB)</label>
                <input
                  type="number"
                  step="0.5"
                  value={attenDb}
                  onChange={(e) => setAttenDb(parseFloat(e.target.value) || 1)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">System Impedance Z₀ (Ω)</label>
                <input
                  type="number"
                  value={z0Val}
                  onChange={(e) => setZ0Val(parseFloat(e.target.value) || 50)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-cad-subpanel border border-cad-border p-4 rounded space-y-4 font-mono">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Calculated Resistor Values
              </h3>

              <div className="bg-cad-panel p-3 rounded border border-cad-border">
                <div className="text-xs font-bold text-cad-textHeading mb-2">Pi Network (π):</div>
                <div className="text-xs text-cad-text">R_Shunt: <span className="text-cad-textHeading font-bold">{attenuatorResult.piNetwork.rShunt} Ω</span></div>
                <div className="text-xs text-cad-text">R_Series: <span className="text-cad-textHeading font-bold">{attenuatorResult.piNetwork.rSeries} Ω</span></div>
              </div>

              <div className="bg-cad-panel p-3 rounded border border-cad-border">
                <div className="text-xs font-bold text-cad-textHeading mb-2">T Network (T):</div>
                <div className="text-xs text-cad-text">R_Series: <span className="text-cad-textHeading font-bold">{attenuatorResult.tNetwork.rSeries} Ω</span></div>
                <div className="text-xs text-cad-text">R_Shunt: <span className="text-cad-textHeading font-bold">{attenuatorResult.tNetwork.rShunt} Ω</span></div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: 555 Timer */}
        {activeTab === '555' && (
          <div className="grid grid-cols-2 gap-6 bg-cad-panel border border-cad-border p-5 rounded">
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cad-textMuted font-mono">
                Astable Oscillator Components
              </h3>

              <div>
                <label className="text-xs text-cad-text block mb-1">Resistor R1 (Ω)</label>
                <input
                  type="number"
                  value={r1Val}
                  onChange={(e) => setR1Val(parseFloat(e.target.value) || 1000)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">Resistor R2 (Ω)</label>
                <input
                  type="number"
                  value={r2Val}
                  onChange={(e) => setR2Val(parseFloat(e.target.value) || 1000)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-cad-text block mb-1">Timing Capacitor C (µF)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cValUf}
                  onChange={(e) => setCValUf(parseFloat(e.target.value) || 0.01)}
                  className="w-full bg-cad-inputBg border border-cad-inputBorder rounded px-3 py-1.5 text-xs text-cad-inputText font-mono focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-cad-subpanel border border-cad-border p-4 rounded space-y-3 font-mono">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                Oscillator Output
              </h3>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">Frequency:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{timerResult.frequencyHz} Hz</span>
              </div>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">Duty Cycle:</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{timerResult.dutyCyclePercent} %</span>
              </div>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">High Time (t₁):</span>
                <span className="text-xs font-bold text-cad-textHeading">{timerResult.highTimeSec} s</span>
              </div>

              <div className="bg-cad-panel p-3 rounded border border-cad-border flex justify-between items-center">
                <span className="text-xs text-cad-text">Low Time (t₂):</span>
                <span className="text-xs font-bold text-cad-textHeading">{timerResult.lowTimeSec} s</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
