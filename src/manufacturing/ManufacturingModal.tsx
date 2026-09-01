/**
 * FloZ ECA — Microsoft Fluent Manufacturing & Fabrication Outputs Packager
 * Generates and bundles Gerber files, Excellon Drill, BOM, Pick & Place, KiCad files, and DFM report into a ZIP package.
 */

import React, { useState } from 'react';
import JSZip from 'jszip';
import { ApexProject, PCBLayerId } from '../core/types';
import { GerberGenerator } from './gerberGenerator';
import { ExcellonDrillGenerator } from './excellonDrill';
import { BOMGenerator, PickAndPlaceGenerator } from './bomGenerator';
import { KiCadExporter } from './kicadExporter';
import { ManufacturingReportGenerator } from './manufacturingReport';
import { Download, Package, X, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  project: ApexProject;
  isOpen: boolean;
  onClose: () => void;
}

export const ManufacturingModal: React.FC<Props> = ({ project, isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  if (!isOpen) return null;

  const metrics = ManufacturingReportGenerator.generateMetrics(project);

  const handleExportZip = async () => {
    if (!metrics.isManufacturable) {
      setStatusMessage(`EXPORT BLOCKED: ${metrics.blockReason}`);
      return;
    }

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

      // 5. KiCad v7/v8/v9 Interchange files
      setStatusMessage('Generating KiCad Interchange (.kicad_sch, .kicad_pcb)...');
      const kicadSch = KiCadExporter.exportSchematic(project);
      const kicadPcb = KiCadExporter.exportPCB(project);
      zip.file(`${prjName}.kicad_sch`, kicadSch);
      zip.file(`${prjName}.kicad_pcb`, kicadPcb);

      // 6. Manufacturing DFM Report
      setStatusMessage('Generating Fabrication Report...');
      const reportTxt = ManufacturingReportGenerator.generateTextReport(project);
      zip.file(`${prjName}_Manufacturing_Report.txt`, reportTxt);

      // 7. Generate and trigger download
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
    <div
      role="dialog"
      aria-labelledby="mfg-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 select-none p-3"
    >
      <div className="bg-cad-panel border border-cad-border w-[580px] max-w-full rounded-lg shadow-2xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-11 bg-cad-header border-b border-cad-border px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h2 id="mfg-dialog-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading">
              Generate Manufacturing Outputs
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded text-cad-textMuted hover:text-cad-text transition-colors focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs text-cad-text leading-relaxed">
            Generate production fabrication outputs compliant with standard PCB manufacturers (JLCPCB, PCBWay, Eurocircuits, OSH Park).
          </p>

          {!metrics.isManufacturable && (
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertTriangle size={15} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-xs">Export Blocked by DFM Validation</div>
                <div className="text-[11px] text-cad-text mt-0.5">{metrics.blockReason}</div>
              </div>
            </div>
          )}

          <div className="space-y-1.5 border border-cad-border rounded p-3 bg-cad-subpanel font-mono text-[11px]">
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>RS-274X Extended Gerber (Copper, Silk, Mask, Paste, Edge.Cuts)</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Excellon NC Drill File (.DRL) &amp; Tool Definitions</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
              <span>Bill of Materials (BOM) Grouped CSV</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>SMT Centroid Pick &amp; Place Position CSV</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>KiCad Interoperability Files (.kicad_sch, .kicad_pcb)</span>
            </div>
            <div className="flex items-center gap-2 text-cad-text">
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Manufacturing &amp; DFM Verification Report (.txt)</span>
            </div>
          </div>

          {statusMessage && (
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-600 dark:text-blue-300 font-mono flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-11 bg-cad-header border-t border-cad-border px-4 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-cad-subpanel hover:bg-cad-surfaceHover text-xs rounded text-cad-text border border-cad-border font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleExportZip}
            disabled={isGenerating || !metrics.isManufacturable}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white rounded flex items-center gap-1.5 shadow-sm transition-colors focus-visible:outline-none"
          >
            <Download size={13} />
            <span>Download Fabrication ZIP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
