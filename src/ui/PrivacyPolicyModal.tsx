/**
 * FloZ ECA — Microsoft Fluent Privacy Policy Dialog
 * Clear, truthful privacy policy detailing local-first data processing, offline security, and telemetry preferences.
 */

import React, { useEffect } from 'react';
import { Shield, X, Lock, HardDrive, Cpu, Mail } from 'lucide-react';
import { siteConfig } from '../config/siteConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
      aria-labelledby="privacy-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-theme-modalBackdrop p-4 select-none"
    >
      <div className="bg-cad-panel border border-cad-border w-[680px] max-w-full max-h-[85vh] rounded-sm shadow-xl flex flex-col overflow-hidden text-cad-text animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="h-9 bg-cad-header border-b border-cad-border px-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-xs bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Shield size={13} />
            </div>
            <div>
              <h2 id="privacy-title" className="text-xs sm:text-sm font-semibold text-cad-textHeading">
                Privacy Policy
              </h2>
              <p className="text-[10px] text-cad-textMuted font-mono">Last updated: August 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Privacy Policy"
            className="p-1 hover:bg-cad-surfaceHover rounded-xs text-cad-textMuted hover:text-cad-text transition-colors duration-fast focus-visible:outline-none"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 text-xs leading-relaxed text-cad-text">
          <section className="space-y-1">
            <h3 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
              <HardDrive size={13} className="text-emerald-600 dark:text-emerald-400" />
              1. Local-First Engineering Data Architecture
            </h3>
            <p className="text-cad-textMuted">
              {siteConfig.siteName} is built from the ground up as a <strong>local-first Electronic Design Automation (EDA) system</strong>. All schematic sheets, netlists, PCB layer geometry, SPICE models, trace routing, and design rules remain stored directly inside your browser’s indexed storage or local filesystem.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
              <Cpu size={13} className="text-blue-600 dark:text-blue-400" />
              2. AI Copilot &amp; Circuit Inference Privacy
            </h3>
            <p className="text-cad-textMuted">
              When utilizing the optional FloZ AI Circuit Copilot with a custom OpenRouter or LLM API key, your circuit prompts and netlist excerpts are transmitted exclusively to your configured AI inference provider via HTTPS. When operating in <em>Local EDA Rule Synthesis</em> mode, all analysis is computed 100% offline on your device with zero outbound network calls.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
              <Lock size={13} className="text-purple-600 dark:text-purple-400" />
              3. Telemetry &amp; Analytics
            </h3>
            <p className="text-cad-textMuted">
              We do not track, profile, or sell your hardware designs, schematic IP, or component metadata. Minimal, privacy-preserving performance telemetry (such as crash diagnostics) may be collected only with your explicit opt-in preference under Settings.
            </p>
          </section>

          {siteConfig.contactEmail && (
            <section className="space-y-1 border-t border-cad-border pt-2.5">
              <h3 className="font-semibold text-cad-textHeading flex items-center gap-1.5 text-xs">
                <Mail size={13} className="text-amber-600 dark:text-amber-400" />
                4. Data Protection Inquiries
              </h3>
              <p className="text-cad-textMuted">
                For questions regarding our privacy practices or data rights, contact us at{' '}
                <a
                  href={`mailto:${siteConfig.contactEmail}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                >
                  {siteConfig.contactEmail}
                </a>.
              </p>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="h-9 bg-cad-header border-t border-cad-border px-3.5 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xs text-xs font-medium shadow-xs transition-colors duration-fast focus-visible:outline-none"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
