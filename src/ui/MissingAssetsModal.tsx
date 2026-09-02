/**
 * FloZ ECA — Microsoft Fluent Missing Assets Management Dialog
 * Displays and auto-resolves missing symbols, footprints, and 3D packages.
 */

import React, { useState } from 'react';
import { ApexProject } from '../core/types';
import { AssetResolver } from '../library/assetResolver';
import { footprintLibrary } from '../library/footprintLibrary';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  Box,
  Wrench,
  X,
} from 'lucide-react';

interface Props {
  project: ApexProject;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updater: (prev: ApexProject) => ApexProject, actionName?: string) => void;
}

export const MissingAssetsModal: React.FC<Props> = ({
  project,
  isOpen,
  onClose,
  onUpdateProject,
}) => {
  if (!isOpen) return null;

  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);
  const scanReport = AssetResolver.scanProject(project);

  const handleResolveAll = () => {
    let fixCount = 0;

    onUpdateProject((prev) => {
      let updated = prev;
      const sheet =
        updated.schematic.sheets.find((s) => s.id === updated.schematic.activeSheetId) ||
        updated.schematic.sheets[0];

      // 1. Fix missing or unassigned footprints on schematic symbols
      const updatedSymbols = sheet.symbols.map((sym) => {
        if (!sym.footprint || !footprintLibrary.getFootprint(sym.footprint)) {
          const res = AssetResolver.resolveAssetAutomatically(
            {
              id: `miss_fp_${sym.id}`,
              type: 'footprint',
              reference: sym.reference,
              name: sym.value,
              requiredPackage: sym.footprint,
              status: 'missing',
            },
            updated
          );
          if (res.resolved && res.assetId) {
            fixCount++;
            return { ...sym, footprint: res.assetId };
          }
        }
        return sym;
      });

      // 2. Fix missing footprint definitions or 3D models on PCB footprints
      const updatedFootprints = updated.pcb.footprints.map((fp) => {
        const correspondingSym = updatedSymbols.find((s) => s.reference === fp.reference);
        let targetFpId = fp.footprintDefId;
        if (!footprintLibrary.getFootprint(targetFpId) && correspondingSym?.footprint) {
          targetFpId = correspondingSym.footprint;
        }

        const fpDef = footprintLibrary.getFootprint(targetFpId);
        if (fpDef) {
          return {
            ...fp,
            footprintDefId: fpDef.id,
            model3D: fp.model3D || fpDef.model3D,
          };
        }
        return fp;
      });

      return {
        ...updated,
        schematic: {
          ...updated.schematic,
          sheets: updated.schematic.sheets.map((s) =>
            s.id === sheet.id ? { ...s, symbols: updatedSymbols } : s
          ),
        },
        pcb: {
          ...updated.pcb,
          footprints: updatedFootprints,
        },
      };
    });

    if (fixCount > 0) {
      setResolvedStatus(`Successfully resolved ${fixCount} asset dependencies.`);
    } else {
      setResolvedStatus('No automatically resolvable asset dependencies remaining.');
    }
    setTimeout(() => setResolvedStatus(null), 3000);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="assets-dialog-title"
      aria-modal="true"
      className="fixed inset-0 bg-theme-modalBackdrop flex items-center justify-center z-50 p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border w-full max-w-xl rounded-sm shadow-xl overflow-hidden flex flex-col max-h-[80vh] text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-9 px-3.5 bg-cad-header border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
            <div>
              <h2 id="assets-dialog-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading">
                Missing Asset Manager
              </h2>
              <p className="text-[10px] text-cad-textMuted">Component symbols, footprints &amp; 3D model resolver</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {resolvedStatus && (
            <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xs flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{resolvedStatus}</span>
            </div>
          )}

          {scanReport.missingAssets.length === 0 ? (
            <div className="text-center py-8 space-y-1.5">
              <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400 mx-auto" />
              <div className="font-semibold text-cad-textHeading text-xs">All Assets Resolved &amp; Valid</div>
              <p className="text-cad-textMuted text-[11px] max-w-xs mx-auto">
                All schematic symbols, footprints, and 3D models are fully mapped and registered in the project.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-cad-textHeading">
                  {scanReport.missingCount} Missing Asset Dependencies Detected
                </span>
                <button
                  onClick={handleResolveAll}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xs text-xs flex items-center gap-1.5 shadow-xs transition-colors duration-fast focus-visible:outline-none"
                >
                  <Wrench size={12} />
                  <span>Resolve Automatically</span>
                </button>
              </div>

              <div className="space-y-1">
                {scanReport.missingAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2 bg-cad-subpanel border border-cad-border rounded-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {asset.type === 'symbol' && <Cpu size={14} className="text-blue-600 dark:text-blue-400" />}
                      {asset.type === 'footprint' && <Layers size={14} className="text-amber-600 dark:text-amber-400" />}
                      {asset.type === 'model3d' && <Box size={14} className="text-purple-600 dark:text-purple-400" />}
                      <div>
                        <div className="font-semibold text-cad-textHeading text-xs">{asset.reference}</div>
                        <div className="text-[11px] text-cad-textMuted font-mono">{asset.name}</div>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.2 rounded-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-medium">
                      Missing {asset.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-9 bg-cad-header border-t border-cad-border px-3.5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium shadow-xs transition-colors duration-fast focus-visible:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
