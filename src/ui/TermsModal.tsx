/**
 * FloZ ECA — Terms & Conditions Dialog
 * Software licensing, engineering warranty disclaimer, and intellectual property terms.
 */

import React, { useEffect } from 'react';
import { X, AlertTriangle, Scale } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border w-[680px] max-w-full max-h-[85vh] rounded-sm shadow-xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-9 bg-cad-header border-b border-cad-border px-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-xs bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Scale size={13} />
            </div>
            <div>
              <h2 id="terms-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading">
                Terms of Service
              </h2>
              <p className="text-[10px] text-cad-textMuted font-mono">Last updated: August 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Terms of Service"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 text-xs leading-relaxed text-cad-text">
          <section className="space-y-1">
            <h3 className="font-semibold text-cad-textHeading text-xs">1. Acceptance of Terms</h3>
            <p className="text-cad-textMuted">
              By accessing or using <strong>{siteConfig.siteName} (Electronic Circuit Architect)</strong> in web browser or standalone desktop application form, you agree to be bound by these Terms of Service.
            </p>
          </section>

          <section className="space-y-1 pt-1.5 border-t border-cad-border">
            <h3 className="font-semibold text-cad-textHeading text-xs">2. Intellectual Property &amp; Design Ownership</h3>
            <p className="text-cad-textMuted">
              You retain <strong>100% full and exclusive ownership</strong> of all schematics, netlists, PCB layout files, Gerber data, and Bill of Materials generated using {siteConfig.siteName}. {siteConfig.siteName} claims no copyright or proprietary rights over circuits designed by its users.
            </p>
          </section>

          <section className="space-y-1 pt-1.5 border-t border-cad-border">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-xs">3. Design &amp; Manufacturing Notice</span>
                <p className="text-[11px] leading-relaxed text-cad-textMuted">
                  While {siteConfig.siteName} includes mathematical DRC (Design Rule Check), ERC (Electrical Rule Check), and SPICE simulation engines, you are solely responsible for verifying that manufactured circuit boards meet your specific hardware fabricator specifications (e.g. JLCPCB, PCBWay, OSH Park). {siteConfig.siteName} is provided &quot;AS IS&quot; without warranty of physical hardware fabrication yield.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-1 pt-1.5 border-t border-cad-border">
            <h3 className="font-semibold text-cad-textHeading text-xs">4. Governing Terms &amp; Inquiries</h3>
            <p className="text-cad-textMuted">
              For licensing, source verification, or inquiries:
            </p>
            <div className="bg-cad-subpanel border border-cad-border rounded-xs p-2 font-mono text-[11px] space-y-0.5">
              <div>Entity: {siteConfig.companyName}</div>
              {siteConfig.contactEmail && (
                <div>Contact: <a href={`mailto:${siteConfig.contactEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">{siteConfig.contactEmail}</a></div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="h-9 bg-cad-header border-t border-cad-border px-3.5 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium shadow-xs transition-colors duration-fast focus-visible:outline-none"
          >
            I Accept
          </button>
        </div>
      </div>
    </div>
  );
};
