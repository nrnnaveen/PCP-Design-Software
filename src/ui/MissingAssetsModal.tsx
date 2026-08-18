/**
 * FloZ EDA - Missing Assets Management Modal
 * Displays and auto-resolves missing symbols, footprints, and 3D packages.
 */

import React, { useState } from 'react';
import { ApexProject } from '../core/types';
import { AssetResolver, MissingAsset } from '../library/assetResolver';
import { footprintLibrary } from '../library/footprintLibrary';
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  Box,
  Wrench,
  Check,
  RefreshCw,
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

      // Fix missing footprints on symbols
      const updatedSymbols = sheet.symbols.map((sym) => {
        if (!sym.footprint || !footprintLibrary.getFootprint(sym.footprint)) {
          const res = AssetResolver.resolveAssetAutomatically(
            {
              id: `miss_fp_${sym.id}`,
              type: 'footprint',
              reference: sym.reference,
              name: sym.value,
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

      return {
        ...updated,
        schematic: {
          ...updated.schematic,
          sheets: updated.schematic.sheets.map((s) =>
            s.id === sheet.id ? { ...s, symbols: updatedSymbols } : s
          ),
        },
      };
    }, 'Resolve Missing Assets');

    setResolvedStatus(`Successfully resolved ${fixCount} asset dependencies.`);
    setTimeout(() => setResolvedStatus(null), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-cad-panel border border-cad-border w-full max-w-xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="h-14 px-5 bg-cad-subpanel border-b border-cad-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={20} className="text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Missing Asset Manager</h2>
              <p className="text-[11px] text-cad-textMuted">Component symbols, footprints & 3D model resolver</p>
            </div>
          </div>
          <button onClick={onClose} className="text-cad-textMuted hover:text-white text-lg">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {resolvedStatus && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-lg flex items-center gap-2">
              <CheckCircle2 size={16} />
              {resolvedStatus}
            </div>
          )}

          {scanReport.missingAssets.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
              <div className="font-bold text-white text-sm">All Assets Resolved & Valid</div>
              <p className="text-cad-textMuted text-xs max-w-xs mx-auto">
                All schematic symbols, footprints, and 3D models are fully mapped and registered in the project.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  {scanReport.missingCount} Missing Asset Dependencies Detected
                </span>
                <button
                  onClick={handleResolveAll}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow"
                >
                  <Wrench size={13} /> Resolve Automatically
                </button>
              </div>

              <div className="space-y-2">
                {scanReport.missingAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3 bg-cad-subpanel border border-cad-border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {asset.type === 'symbol' && <Cpu size={16} className="text-blue-400" />}
                      {asset.type === 'footprint' && <Layers size={16} className="text-amber-400" />}
                      {asset.type === 'model3d' && <Box size={16} className="text-purple-400" />}
                      <div>
                        <div className="font-semibold text-white">
                          {asset.reference}: {asset.name}
                        </div>
                        <p className="text-[11px] text-cad-textMuted">{asset.errorDetails}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-mono uppercase border border-amber-500/40">
                      {asset.type} Missing
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-5 bg-cad-subpanel border-t border-cad-border flex items-center justify-between text-xs">
          <span className="text-cad-textMuted">Max automated retries: 3 attempts</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cad-panel hover:bg-cad-border text-slate-300 rounded font-semibold border border-cad-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
