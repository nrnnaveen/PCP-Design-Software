/**
 * FloZ ECA — Microsoft Fluent Thank You & Action Confirmation Dialog
 * Professional confirmation dialog after project exports, fabrication outputs, and feedback.
 */

import React, { useEffect } from 'react';
import { CheckCircle2, Home } from 'lucide-react';
import { SEOEngine } from '../core/seo';

interface Props {
  isOpen: boolean;
  title?: string;
  message?: string;
  actionDetails?: string;
  onClose: () => void;
  onNavigateHome?: () => void;
}

export const ThankYouModal: React.FC<Props> = ({
  isOpen,
  title = 'Action Completed Successfully',
  message = 'Your electronic CAD project data has been processed and saved successfully.',
  actionDetails,
  onClose,
  onNavigateHome,
}) => {
  useEffect(() => {
    if (isOpen) {
      SEOEngine.updateMeta({
        title: 'Thank You | Confirmation',
        noIndex: true,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border w-[440px] max-w-full rounded-sm shadow-xl p-5 text-center text-cad-text space-y-3.5 animate-in fade-in zoom-in-95 duration-100">
        <div className="w-10 h-10 mx-auto rounded-xs bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={22} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xs sm:text-sm font-semibold text-cad-textHeading">{title}</h2>
          <p className="text-xs text-cad-textMuted leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {actionDetails && (
          <div className="p-2 rounded-xs bg-cad-subpanel border border-cad-border font-mono text-[11px] text-cad-text text-left">
            {actionDetails}
          </div>
        )}

        <div className="pt-0.5 flex items-center justify-center gap-2">
          {onNavigateHome && (
            <button
              onClick={() => {
                onClose();
                onNavigateHome();
              }}
              className="px-3 py-1 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text rounded-xs text-xs font-medium border border-cad-border transition-colors duration-fast focus-visible:outline-none flex items-center gap-1.5"
            >
              <Home size={13} />
              <span>Dashboard</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium shadow-xs transition-colors duration-fast focus-visible:outline-none"
          >
            Continue Working
          </button>
        </div>
      </div>
    </div>
  );
};
