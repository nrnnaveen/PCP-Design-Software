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
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-cad-text">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-cad-textHeading">Terms &amp; Conditions</h3>
            <p className="text-[11px] font-mono text-cad-textMuted">Last Updated: September 4, 2026</p>
          </div>

          <p className="text-cad-text">
            Welcome to FloZ ECA.
          </p>

          <p className="text-cad-text">
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of FloZ ECA and related services provided by FloZ (&quot;FloZ&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
          </p>

          <p className="text-cad-text">
            By accessing or using the service, you agree to these Terms. If you don&apos;t agree with them, please don&apos;t use the service.
          </p>

          {/* Section 1 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">1. About FloZ ECA</h4>
            <p className="text-cad-textMuted">
              FloZ ECA is an electronic design automation platform that provides tools for schematic and PCB design, together with AI-assisted functionality through FloZ AI.
            </p>
            <p className="text-cad-textMuted">
              The service may allow users to create, edit, generate, import, export, save, and manage electronic design projects. Features may change over time as the product develops.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">2. Your Account</h4>
            <p className="text-cad-textMuted">Some features may require you to create an account. You are responsible for:</p>
            <ul className="list-disc list-inside text-cad-textMuted space-y-0.5 pl-1">
              <li>Providing accurate information.</li>
              <li>Keeping your account credentials secure.</li>
              <li>Maintaining control of your account.</li>
              <li>Not sharing your account in a way that violates these Terms.</li>
              <li>Notifying us if you believe your account has been compromised.</li>
            </ul>
            <p className="text-cad-textMuted text-[11px]">
              You are responsible for activity performed through your account unless caused by circumstances outside your reasonable control.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">3. Acceptable Use</h4>
            <p className="text-cad-textMuted">You agree not to use FloZ ECA to:</p>
            <ul className="list-disc list-inside text-cad-textMuted space-y-0.5 pl-1">
              <li>Break applicable laws or regulations.</li>
              <li>Attempt to gain unauthorized access to the service.</li>
              <li>Attack, disrupt, or damage the service.</li>
              <li>Introduce malware or malicious code.</li>
              <li>Abuse APIs or automated systems.</li>
              <li>Circumvent security or usage restrictions.</li>
              <li>Interfere with another user&apos;s projects or account.</li>
              <li>Use the service for unlawful or harmful activities.</li>
            </ul>
            <p className="text-cad-text font-medium pt-1">
              Basically: build circuits, not chaos.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">4. Your Projects and Content</h4>
            <p className="text-cad-textMuted">
              You retain ownership of the designs, project files, prompts, and other content that you create or provide to FloZ, subject to any third-party rights that may apply.
            </p>
            <p className="text-cad-textMuted">
              You are responsible for ensuring that you have the necessary rights to upload or use any content you provide. You grant FloZ the permissions reasonably necessary to store, process, transmit, and display your content solely to provide and operate the services you request.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">5. AI-Generated Content</h4>
            <p className="text-cad-textMuted">
              FloZ ECA includes AI-assisted functionality. AI-generated output may contain incorrect components, incorrect values, missing connections, incorrect pin assignments, incomplete designs, design assumptions, or other technical errors.
            </p>
            <p className="text-cad-textMuted">
              AI output is therefore provided as an <strong>assistance tool</strong>, not as a guarantee of engineering correctness. You are responsible for reviewing and validating any AI-generated design before using it.
            </p>
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-xs">Important</span>
                <p className="text-[11px] leading-relaxed text-cad-textMuted">
                  Do not manufacture, deploy, operate, or rely on an AI-generated electronic design without appropriate engineering review, testing, and validation. A generated PCB can look perfectly reasonable and still contain a tiny mistake capable of ruining your entire afternoon. Please check it.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">6. No Guarantee of Design Accuracy</h4>
            <p className="text-cad-textMuted">
              FloZ does not guarantee that every schematic, PCB layout, component selection, routing decision, calculation, or AI-generated output will be correct, complete, safe, manufacturable, or suitable for a particular purpose. You are responsible for determining whether a design is appropriate for your intended application.
            </p>
            <p className="text-cad-textMuted text-[11px]">
              For safety-critical, medical, aerospace, automotive, industrial, high-voltage, or other high-risk applications, appropriate professional engineering review and independent validation are strongly recommended.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">7. Third-Party Components and Services</h4>
            <p className="text-cad-textMuted">
              FloZ may integrate with third-party services, component libraries, AI providers, hosting providers, or other external systems. Those services may have their own terms, licenses, and privacy policies. FloZ is not responsible for third-party services that we do not control.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">8. Intellectual Property</h4>
            <p className="text-cad-textMuted">
              The FloZ ECA software, interface, branding, logos, documentation, and other FloZ-owned materials are protected by applicable intellectual property laws. Unless explicitly permitted, you may not copy, modify, redistribute, reverse engineer, resell, or commercially exploit FloZ-owned materials in violation of applicable law or these Terms.
            </p>
            <p className="text-cad-textMuted text-[11px]">
              Third-party libraries, components, symbols, footprints, and other resources remain subject to their respective licenses.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">9. Availability</h4>
            <p className="text-cad-textMuted">
              We work hard to keep FloZ ECA available and reliable. However, we do not guarantee that the service will always be available, uninterrupted, error-free, secure, or free from bugs. Maintenance, updates, infrastructure failures, network problems, and other circumstances may temporarily affect availability.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">10. Changes to the Service</h4>
            <p className="text-cad-textMuted">
              FloZ may add, modify, suspend, or remove features from the service. We may also introduce new plans, limits, or pricing structures in the future. Where required, users will receive appropriate notice of significant changes.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">11. Suspension or Termination</h4>
            <p className="text-cad-textMuted">
              We may suspend or terminate access where reasonably necessary, including if these Terms are violated, the service is being abused, there is a security risk, required by law, or continued access could harm FloZ or other users. You may also stop using the service at any time.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">12. Disclaimer</h4>
            <p className="text-cad-textMuted">
              FloZ ECA is provided on an &quot;as available&quot; and &quot;as is&quot; basis to the extent permitted by applicable law. FloZ does not guarantee that the service or its outputs will meet every user&apos;s requirements or that AI-generated designs will be technically correct. You remain responsible for reviewing, testing, validating, and approving your designs.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">13. Limitation of Liability</h4>
            <p className="text-cad-textMuted">
              To the maximum extent permitted by applicable law, FloZ will not be responsible for indirect, incidental, consequential, special, or similar damages resulting from your use of the service (including hardware, manufacturing, data, business interruption, lost profits, project delays, or incorrect AI-generated designs).
            </p>
          </section>

          {/* Section 14 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">14. Changes to These Terms</h4>
            <p className="text-cad-textMuted">
              We may update these Terms as FloZ evolves. Continued use of the service after an updated version becomes effective constitutes acceptance of the revised Terms, where permitted by applicable law.
            </p>
          </section>

          {/* Section 15 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">15. Contact</h4>
            <p className="text-cad-textMuted">
              If you have questions regarding these Terms, contact FloZ through our official support or contact channel.
            </p>
          </section>

          <section className="p-3 bg-cad-subpanel border border-cad-border rounded-xs space-y-1">
            <h5 className="font-semibold text-cad-textHeading text-xs">Final Note</h5>
            <p className="text-cad-textMuted text-[11px]">
              FloZ ECA is here to make electronics design easier. It is not here to convince you that engineering review is optional.
            </p>
            <p className="text-cad-textHeading font-semibold text-xs">
              Use the AI. Question the AI. Check the circuit. Then build something awesome.
            </p>
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
