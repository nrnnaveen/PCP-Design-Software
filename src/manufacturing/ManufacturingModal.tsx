/**
 * Apex EDA - Manufacturing Outputs & Fabrication Packager
 * Generates and bundles Gerber files, Excellon Drill, BOM, and Pick & Place into a ZIP package.
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import { ApexProject, PCBLayerId } from '../core/types';
import { GerberGenerator } from './gerberGenerator';
import { ExcellonDrillGenerator } from './excellonDrill';
import { BOMGenerator, PickAndPlaceGenerator } from './bomGenerator';
import { Download, Package, Check, X, FileSpreadsheet, FileCode, CheckCircle2 } from 'lucide-react';

interface Props {
  project: ApexProject;
  isOpen: boolean;
  onClose: () => void;
}

export const ManufacturingModal: React.FC<Props> = ({ project, isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleExportZip = async () => {
    setIsGenerating(true);
    setStatusMessage('Generating RS-274X Gerber Layers...');

    try {
      const zip = new JSZip();
      const prjName = project.metadata.name.replace(/\s+/g, '_').toLowerCase();

      // 1. Gerber Copper, Silk, Mask, Edge layers
      const layers: Array<{ id: PCBLayerId; ext: string }> = [
        { id: 'F.Cu', ext: 'GTL' },
        { id: 'B.Cu', ext: 'GBL' },
        { id: 'F.Silkscreen', ext: 'GTO' },
        { id: 'B.Silkscreen', ext: 'GBO' },
        { id: 'F.Mask', ext: 'GTS' },
        { id: 'B.Mask', ext: 'GBS' },
        { id: 'F.Paste', ext: 'GTP' },
        { id: 'B.Paste', ext: 'GBP' },
        { id: 'Edge.Cuts', ext: 'GKO' },
      ];

      layers.forEach(({ id, ext }) => {
        const content = GerberGenerator.generateLayer(project, id);
        zip.file(`${prjName}.${ext}`, content);
      });

      // 2. Excellon NC Drill file
      setStatusMessage('Generating Excellon NC Drill files...');
      const drillContent = ExcellonDrillGenerator.generate(project);
      zip.file(`${prjName}.DRL`, drillContent);

      // 3. BOM CSV
      setStatusMessage('Generating Bill of Materials...');
      const bomCsv = BOMGenerator.exportCSV(project);
      zip.file(`${prjName}_BOM.csv`, bomCsv);

      // 4. Centroid Pick & Place
      setStatusMessage('Generating Pick and Place Centroid CSV...');
      const pnpCsv = PickAndPlaceGenerator.generate(project);
      zip.file(`${prjName}_PickAndPlace.csv`, pnpCsv);

      // 5. Generate and trigger download
      setStatusMessage('Packaging ZIP archive...');
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${prjName}_Fabrication_Package.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage('Fabrication Package Downloaded Successfully!');
      setTimeout(() => {
        setIsGenerating(false);
      }, 1500);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="bg-cad-panel border border-cad-border w-[600px] rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text">
        {/* Header */}
        <div className="h-12 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package size={18} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Generate Manufacturing Outputs</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-cad-subpanel rounded text-cad-textMuted hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300">
            Generate production fabrication outputs compliant with standard PCB manufacturers (JLCPCB, PCBWay, Eurocircuits, OSH Park).
          </p>

          <div className="space-y-2 border border-cad-border rounded p-3 bg-cad-bg/40 font-mono text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>RS-274X Extended Gerber (Copper, Silk, Mask, Edge.Cuts)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Excellon NC Drill File (.DRL) & Drill Hit Mapping</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Bill of Materials (BOM) Grouped CSV</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>SMT Centroid Pick & Place Position CSV</span>
            </div>
          </div>

          {statusMessage && (
            <div className="p-2.5 bg-blue-600/20 border border-blue-500/40 rounded text-xs text-blue-300 font-mono flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-cad-header border-t border-cad-border px-4 flex items-center justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-border text-xs rounded text-slate-300">
            Close
          </button>
          <button
            onClick={handleExportZip}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white rounded flex items-center gap-1.5 shadow-sm"
          >
            <Download size={14} />
            Download Fabrication ZIP
          </button>
        </div>
      </div>
    </div>
  );
};
