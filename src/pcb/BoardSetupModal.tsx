/**
 * FloZ EDA - Board Setup & Physical Stackup Dialog
 * Multi-tab engineering setup for Physical Stackup, Board Finish, Solder Mask, Design Rules & Net Classes.
 */

import React, { useState } from 'react';
import {
  ApexProject,
  StackupLayer,
  BoardFinish,
  NetClass,
  DesignRules,
} from '../core/types';
import { STANDARD_PCB_LAYERS } from './layers';
import {
  Settings,
  Layers,
  Palette,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  X,
  Sliders,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
}

export const BoardSetupModal: React.FC<Props> = ({ project, isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'stackup' | 'finish' | 'layers' | 'netclasses' | 'constraints'>('stackup');

  // Local draft state
  const [stackup, setStackup] = useState<StackupLayer[]>(
    project.pcb.stackup && project.pcb.stackup.length > 0
      ? project.pcb.stackup
      : [
          { id: 'sm_top', name: 'F.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#15803d' },
          { id: 'cu_top', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' },
          { id: 'dielectric_1', name: 'Core (FR4)', type: 'core', thicknessMm: 1.5, dielectricConstant: 4.5, color: '#d97706' },
          { id: 'cu_bot', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' },
          { id: 'sm_bot', name: 'B.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#047857' },
        ]
  );

  const [boardFinish, setBoardFinish] = useState<BoardFinish>(project.pcb.boardFinish || 'hasl_lead_free');
  const [solderMaskColor, setSolderMaskColor] = useState<string>(project.pcb.solderMaskColor || '#15803d');
  const [silkscreenColor, setSilkscreenColor] = useState<string>(project.pcb.silkscreenColor || '#ffffff');

  const [netClasses, setNetClasses] = useState<Record<string, NetClass>>(
    project.designRules.customNetClasses || {
      Power: {
        name: 'Power',
        description: 'Power and Ground Rails (VCC, GND)',
        clearance: 0.3,
        trackWidth: 0.6,
        viaDiameter: 1.0,
        viaDrill: 0.5,
      },
      HighSpeed: {
        name: 'HighSpeed',
        description: 'Controlled impedance & high speed data',
        clearance: 0.15,
        trackWidth: 0.15,
        viaDiameter: 0.7,
        viaDrill: 0.35,
        diffPairWidth: 0.15,
        diffPairGap: 0.2,
      },
    }
  );

  const [defaultNetClass, setDefaultNetClass] = useState<NetClass>(project.designRules.defaultNetClass);
  const [rules, setRules] = useState<DesignRules>(project.designRules);

  if (!isOpen) return null;

  const totalThickness = stackup.reduce((acc, l) => acc + l.thicknessMm, 0);

  const handleApply = () => {
    onSave((prev) => ({
      ...prev,
      pcb: {
        ...prev.pcb,
        stackup,
        boardFinish,
        solderMaskColor,
        silkscreenColor,
        boardThickness: totalThickness,
      },
      designRules: {
        ...rules,
        defaultNetClass,
        customNetClasses: netClasses,
      },
    }), 'Update Board Setup');

    onClose();
  };

  const setLayerPreset = (layersCount: 1 | 2 | 4 | 6 | 8, isFlex = false) => {
    if (layersCount === 1) {
      setStackup([
        { id: 'sm_top', name: 'F.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#15803d' },
        { id: 'cu_top', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' },
        { id: 'core', name: 'Core (FR4)', type: 'core', thicknessMm: 1.5, dielectricConstant: 4.5, color: '#d97706' },
      ]);
    } else if (layersCount === 2) {
      setStackup([
        { id: 'sm_top', name: 'F.Mask', type: 'soldermask', thicknessMm: 0.015, color: isFlex ? '#f59e0b' : '#15803d', isCoverlay: isFlex },
        { id: 'cu_top', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' },
        { id: 'core', name: isFlex ? 'Polyimide Core' : 'Core (FR4)', type: 'core', thicknessMm: isFlex ? 0.1 : 1.5, dielectricConstant: isFlex ? 3.4 : 4.5, color: isFlex ? '#b45309' : '#d97706', isFlex },
        { id: 'cu_bot', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' },
        { id: 'sm_bot', name: 'B.Mask', type: 'soldermask', thicknessMm: 0.015, color: isFlex ? '#f59e0b' : '#047857', isCoverlay: isFlex },
      ]);
    } else if (layersCount === 4) {
      setStackup([
        { id: 'sm_top', name: 'F.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#15803d' },
        { id: 'cu_top', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' },
        { id: 'pp1', name: 'Prepreg 2116', type: 'prepreg', thicknessMm: 0.2, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_in1', name: 'In1.Cu (GND)', type: 'copper', thicknessMm: 0.035, color: '#d97706' },
        { id: 'core', name: isFlex ? 'Flex Polyimide Core' : 'Core (FR4)', type: 'core', thicknessMm: isFlex ? 0.2 : 1.0, dielectricConstant: isFlex ? 3.4 : 4.5, color: '#b45309', isFlex },
        { id: 'cu_in2', name: 'In2.Cu (PWR)', type: 'copper', thicknessMm: 0.035, color: '#059669' },
        { id: 'pp2', name: 'Prepreg 2116', type: 'prepreg', thicknessMm: 0.2, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_bot', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' },
        { id: 'sm_bot', name: 'B.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#047857' },
      ]);
    } else if (layersCount === 6) {
      setStackup([
        { id: 'sm_top', name: 'F.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#15803d' },
        { id: 'cu_top', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' },
        { id: 'pp1', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.15, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_in1', name: 'In1.Cu (GND)', type: 'copper', thicknessMm: 0.035, color: '#d97706' },
        { id: 'core1', name: 'Core 1', type: 'core', thicknessMm: 0.4, dielectricConstant: 4.5, color: '#b45309' },
        { id: 'cu_in2', name: 'In2.Cu (SIG1)', type: 'copper', thicknessMm: 0.035, color: '#059669' },
        { id: 'pp2', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.2, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_in3', name: 'In3.Cu (PWR)', type: 'copper', thicknessMm: 0.035, color: '#0284c7' },
        { id: 'core2', name: 'Core 2', type: 'core', thicknessMm: 0.4, dielectricConstant: 4.5, color: '#b45309' },
        { id: 'cu_in4', name: 'In4.Cu (GND)', type: 'copper', thicknessMm: 0.035, color: '#7c3aed' },
        { id: 'pp3', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.15, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_bot', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' },
        { id: 'sm_bot', name: 'B.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#047857' },
      ]);
    } else if (layersCount === 8) {
      setStackup([
        { id: 'sm_top', name: 'F.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#15803d' },
        { id: 'cu_top', name: 'F.Cu', type: 'copper', thicknessMm: 0.035, color: '#e05638' },
        { id: 'pp1', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.1, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_in1', name: 'In1.Cu (GND)', type: 'copper', thicknessMm: 0.035, color: '#d97706' },
        { id: 'core1', name: 'Core 1', type: 'core', thicknessMm: 0.25, dielectricConstant: 4.5, color: '#b45309' },
        { id: 'cu_in2', name: 'In2.Cu (SIG1)', type: 'copper', thicknessMm: 0.035, color: '#059669' },
        { id: 'pp2', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.1, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_in3', name: 'In3.Cu (PWR1)', type: 'copper', thicknessMm: 0.035, color: '#0284c7' },
        { id: 'core2', name: 'Core 2 (Center)', type: 'core', thicknessMm: 0.3, dielectricConstant: 4.5, color: '#b45309' },
        { id: 'cu_in4', name: 'In4.Cu (PWR2)', type: 'copper', thicknessMm: 0.035, color: '#6366f1' },
        { id: 'pp3', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.1, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_in5', name: 'In5.Cu (SIG2)', type: 'copper', thicknessMm: 0.035, color: '#ec4899' },
        { id: 'core3', name: 'Core 3', type: 'core', thicknessMm: 0.25, dielectricConstant: 4.5, color: '#b45309' },
        { id: 'cu_in6', name: 'In6.Cu (GND)', type: 'copper', thicknessMm: 0.035, color: '#7c3aed' },
        { id: 'pp4', name: 'Prepreg', type: 'prepreg', thicknessMm: 0.1, dielectricConstant: 4.2, color: '#f59e0b' },
        { id: 'cu_bot', name: 'B.Cu', type: 'copper', thicknessMm: 0.035, color: '#3b82f6' },
        { id: 'sm_bot', name: 'B.Mask', type: 'soldermask', thicknessMm: 0.015, color: '#047857' },
      ]);
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="board-setup-title"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-theme-modalBackdrop flex items-center justify-center p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border rounded-sm shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="h-9 bg-cad-header border-b border-cad-border px-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Settings size={15} className="text-blue-600 dark:text-blue-400" />
            <h2 id="board-setup-title" className="font-semibold text-xs sm:text-sm text-cad-textHeading">
              Board Setup &amp; Fabrication Constraints
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-cad-border bg-cad-subpanel px-3 text-xs font-medium shrink-0">
          <button
            onClick={() => setActiveTab('stackup')}
            className={`py-1.5 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors duration-fast ${
              activeTab === 'stackup'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-cad-textMuted hover:text-cad-text'
            }`}
          >
            <Layers size={13} /> Physical Stackup
          </button>

          <button
            onClick={() => setActiveTab('finish')}
            className={`py-1.5 px-2.5 border-b-2 flex items-center gap-1.5 transition-colors duration-fast ${
              activeTab === 'finish'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-cad-textMuted hover:text-cad-text'
            }`}
          >
            <Palette size={13} /> Board Finish &amp; Mask
          </button>

          <button
            onClick={() => setActiveTab('netclasses')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'netclasses'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-cad-textMuted hover:text-cad-text'
            }`}
          >
            <Sliders size={13} /> Net Classes
          </button>

          <button
            onClick={() => setActiveTab('constraints')}
            className={`py-2 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'constraints'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-cad-textMuted hover:text-cad-text'
            }`}
          >
            <ShieldCheck size={13} /> Design Rules (DRC)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs bg-cad-bg">
          {/* 1. PHYSICAL STACKUP TAB */}
          {activeTab === 'stackup' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-cad-text">Layer Stackup Architecture</h4>
                  <p className="text-cad-textMuted text-[11px]">
                    Configure dielectric materials, copper weights, and layer ordering.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[11px] text-cad-textMuted mr-1">Presets:</span>
                  <button
                    onClick={() => setLayerPreset(1)}
                    className="px-2 py-1 bg-cad-subpanel hover:bg-cad-border border border-cad-border rounded font-mono text-[11px]"
                  >
                    1-Layer
                  </button>
                  <button
                    onClick={() => setLayerPreset(2)}
                    className="px-2 py-1 bg-cad-subpanel hover:bg-cad-border border border-cad-border rounded font-mono text-[11px]"
                  >
                    2-Layer
                  </button>
                  <button
                    onClick={() => setLayerPreset(4)}
                    className="px-2 py-1 bg-cad-subpanel hover:bg-cad-border border border-cad-border rounded font-mono text-[11px]"
                  >
                    4-Layer
                  </button>
                  <button
                    onClick={() => setLayerPreset(6)}
                    className="px-2 py-1 bg-cad-subpanel hover:bg-cad-border border border-cad-border rounded font-mono text-[11px]"
                  >
                    6-Layer
                  </button>
                  <button
                    onClick={() => setLayerPreset(8)}
                    className="px-2 py-1 bg-cad-subpanel hover:bg-cad-border border border-cad-border rounded font-mono text-[11px]"
                  >
                    8-Layer
                  </button>
                  <button
                    onClick={() => setLayerPreset(2, true)}
                    className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-mono text-[11px]"
                  >
                    Flex 2L
                  </button>
                </div>
              </div>

              {/* Stackup Table */}
              <div className="border border-cad-border rounded-lg overflow-hidden font-mono">
                <table className="w-full text-left">
                  <thead className="bg-cad-subpanel text-cad-textMuted border-b border-cad-border text-[11px]">
                    <tr>
                      <th className="px-3 py-2">Layer Name</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Thickness (mm)</th>
                      <th className="px-3 py-2">Dielectric (Er)</th>
                      <th className="px-3 py-2">Color</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cad-border/60 bg-cad-bg/40">
                    {stackup.map((layer, idx) => (
                      <tr key={layer.id} className="hover:bg-cad-subpanel/50">
                        <td className="px-3 py-1.5 font-bold text-cad-text flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color || '#94a3b8' }} />
                          {layer.name}
                        </td>
                        <td className="px-3 py-1.5 capitalize text-cad-textMuted">{layer.type}</td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            step="0.005"
                            value={layer.thicknessMm}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setStackup(stackup.map((l, i) => (i === idx ? { ...l, thicknessMm: val } : l)));
                            }}
                            className="w-20 bg-cad-bg border border-cad-border rounded px-1.5 py-0.5 text-cad-text text-xs"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-cad-textMuted">
                          {layer.dielectricConstant ? layer.dielectricConstant.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="text-xs text-cad-textMuted">{layer.color}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Thickness summary */}
              <div className="flex justify-between items-center bg-cad-subpanel p-3 rounded-lg border border-cad-border font-mono">
                <span className="text-cad-text font-bold">Total Board Thickness:</span>
                <span className="text-blue-500 dark:text-blue-400 font-bold text-sm">
                  {totalThickness.toFixed(3)} mm ({(totalThickness / 0.0254).toFixed(1)} mil)
                </span>
              </div>
            </div>
          )}

          {/* 2. BOARD FINISH & MASK TAB */}
          {activeTab === 'finish' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-cad-text">Board Surface Finish & Colors</h4>
                <p className="text-cad-textMuted text-[11px]">
                  Select the PCB manufacturing surface plating and solder mask aesthetics.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Surface Plating Finish */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cad-text block">Surface Finish (Plating)</label>
                  <select
                    value={boardFinish}
                    onChange={(e) => setBoardFinish(e.target.value as BoardFinish)}
                    className="w-full bg-cad-bg border border-cad-border rounded p-2 text-cad-text font-medium"
                  >
                    <option value="hasl_lead_free">HASL Lead-Free (RoHS Standard)</option>
                    <option value="enig">ENIG (Electroless Nickel Immersion Gold)</option>
                    <option value="osp">OSP (Organic Solderability Preservative)</option>
                    <option value="immersion_silver">Immersion Silver</option>
                    <option value="immersion_tin">Immersion Tin</option>
                    <option value="hard_gold">Hard Gold (Edge Connectors)</option>
                    <option value="hasl_leaded">HASL Leaded (Sn63/Pb37)</option>
                  </select>
                </div>

                {/* Solder Mask Color */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-cad-text block">Solder Mask Color</label>
                  <select
                    value={solderMaskColor}
                    onChange={(e) => setSolderMaskColor(e.target.value)}
                    className="w-full bg-cad-bg border border-cad-border rounded p-2 text-cad-text font-medium"
                  >
                    <option value="#15803d">Green (Standard Gloss)</option>
                    <option value="#1e293b">Matte Black (Pro Engineering)</option>
                    <option value="#1d4ed8">Blue (High Contrast)</option>
                    <option value="#b91c1c">Red (Signal Pro)</option>
                    <option value="#f8fafc">White (LED Lighting)</option>
                    <option value="#7e22ce">Purple (OshPark Style)</option>
                  </select>
                </div>
              </div>

              {/* Silkscreen Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cad-text block">Silkscreen Legend Color</label>
                <select
                  value={silkscreenColor}
                  onChange={(e) => setSilkscreenColor(e.target.value)}
                  className="w-full bg-cad-bg border border-cad-border rounded p-2 text-cad-text font-medium"
                >
                  <option value="#ffffff">Crisp White (Default)</option>
                  <option value="#000000">Black Legend (For White Mask)</option>
                  <option value="#eab308">Yellow Legend</option>
                </select>
              </div>
            </div>
          )}

          {/* 3. NET CLASSES TAB */}
          {activeTab === 'netclasses' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-cad-text">Net Classes & Routing Rules</h4>
                <p className="text-cad-textMuted text-[11px]">
                  Define default and custom track widths, via diameters, and clearance constraints.
                </p>
              </div>

              {/* Default NetClass */}
              <div className="p-3 bg-cad-subpanel rounded-lg border border-cad-border space-y-3">
                <span className="font-bold text-xs text-blue-400 font-mono">Default Net Class</span>
                <div className="grid grid-cols-4 gap-3 font-mono">
                  <div>
                    <label className="text-[10px] text-cad-textMuted block mb-1">Clearance (mm)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={defaultNetClass.clearance}
                      onChange={(e) => setDefaultNetClass({ ...defaultNetClass, clearance: parseFloat(e.target.value) || 0.2 })}
                      className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-cad-textMuted block mb-1">Track Width (mm)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={defaultNetClass.trackWidth}
                      onChange={(e) => setDefaultNetClass({ ...defaultNetClass, trackWidth: parseFloat(e.target.value) || 0.25 })}
                      className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-cad-textMuted block mb-1">Via Diameter (mm)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={defaultNetClass.viaDiameter}
                      onChange={(e) => setDefaultNetClass({ ...defaultNetClass, viaDiameter: parseFloat(e.target.value) || 0.8 })}
                      className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-cad-textMuted block mb-1">Via Drill (mm)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={defaultNetClass.viaDrill}
                      onChange={(e) => setDefaultNetClass({ ...defaultNetClass, viaDrill: parseFloat(e.target.value) || 0.4 })}
                      className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                    />
                  </div>
                </div>
              </div>

              {/* Custom NetClasses */}
              {Object.entries(netClasses).map(([className, nc]) => (
                <div key={className} className="p-3 bg-cad-subpanel rounded-lg border border-cad-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-amber-400 font-mono">{className} Class</span>
                    <span className="text-[11px] text-cad-textMuted">{nc.description}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 font-mono">
                    <div>
                      <label className="text-[10px] text-cad-textMuted block mb-1">Clearance (mm)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={nc.clearance}
                        onChange={(e) =>
                          setNetClasses({
                            ...netClasses,
                            [className]: { ...nc, clearance: parseFloat(e.target.value) || 0.2 },
                          })
                        }
                        className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-cad-textMuted block mb-1">Track Width (mm)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={nc.trackWidth}
                        onChange={(e) =>
                          setNetClasses({
                            ...netClasses,
                            [className]: { ...nc, trackWidth: parseFloat(e.target.value) || 0.25 },
                          })
                        }
                        className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-cad-textMuted block mb-1">Via Dia (mm)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={nc.viaDiameter}
                        onChange={(e) =>
                          setNetClasses({
                            ...netClasses,
                            [className]: { ...nc, viaDiameter: parseFloat(e.target.value) || 0.8 },
                          })
                        }
                        className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-cad-textMuted block mb-1">Via Drill (mm)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={nc.viaDrill}
                        onChange={(e) =>
                          setNetClasses({
                            ...netClasses,
                            [className]: { ...nc, viaDrill: parseFloat(e.target.value) || 0.4 },
                          })
                        }
                        className="w-full bg-cad-bg border border-cad-border rounded p-1 text-xs text-cad-text"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. CONSTRAINTS TAB */}
          {activeTab === 'constraints' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm text-cad-text">Fabrication DRC Constraints</h4>
                <p className="text-cad-textMuted text-[11px]">
                  Specify minimum manufacturing tolerances for PCB vendor capability (e.g. JLCPCB / PCBWay).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div>
                  <label className="text-xs text-cad-text block mb-1">Minimum Copper Clearance (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={rules.minClearance}
                    onChange={(e) => setRules({ ...rules, minClearance: parseFloat(e.target.value) || 0.15 })}
                    className="w-full bg-cad-bg border border-cad-border rounded p-2 text-xs text-cad-text"
                  />
                </div>

                <div>
                  <label className="text-xs text-cad-text block mb-1">Minimum Track Width (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={rules.minTrackWidth}
                    onChange={(e) => setRules({ ...rules, minTrackWidth: parseFloat(e.target.value) || 0.15 })}
                    className="w-full bg-cad-bg border border-cad-border rounded p-2 text-xs text-cad-text"
                  />
                </div>

                <div>
                  <label className="text-xs text-cad-text block mb-1">Minimum Via Drill Hole (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={rules.minDrillDiameter}
                    onChange={(e) => setRules({ ...rules, minDrillDiameter: parseFloat(e.target.value) || 0.3 })}
                    className="w-full bg-cad-bg border border-cad-border rounded p-2 text-xs text-cad-text"
                  />
                </div>

                <div>
                  <label className="text-xs text-cad-text block mb-1">Board Edge Clearance (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={rules.boardEdgeClearance}
                    onChange={(e) => setRules({ ...rules, boardEdgeClearance: parseFloat(e.target.value) || 0.5 })}
                    className="w-full bg-cad-bg border border-cad-border rounded p-2 text-xs text-cad-text"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="h-9 bg-cad-header border-t border-cad-border px-3.5 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-cad-textMuted font-mono">Changes take effect immediately on PCB &amp; 3D viewers</span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={onClose}
              className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-surfaceHover rounded-xs text-xs font-medium text-cad-text border border-cad-border transition-colors duration-fast"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors duration-fast"
            >
              <Check size={13} /> Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
