/**
 * FloZ ECA — Privacy Policy Dialog
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
        <div className="p-5 overflow-y-auto space-y-4 text-xs leading-relaxed text-cad-text">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-cad-textHeading">Privacy Policy</h3>
            <p className="text-[11px] font-mono text-cad-textMuted">Last Updated: September 4, 2026</p>
          </div>

          <p className="text-cad-text">
            FloZ (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy.
          </p>

          <p className="text-cad-text">
            This Privacy Policy explains what information may be collected when you use FloZ ECA and related FloZ services, how that information may be used, and the choices available to you.
          </p>

          <p className="text-cad-text font-medium">
            We believe privacy policies shouldn&apos;t require a law degree to understand, so we&apos;ve tried to keep this one straightforward.
          </p>

          {/* Section 1 */}
          <section className="space-y-2 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">1. Information We May Collect</h4>
            <p className="text-cad-textMuted">
              Depending on how you use FloZ ECA, we may collect information such as:
            </p>

            <div className="space-y-1.5 pl-2 border-l-2 border-blue-500/40">
              <h5 className="font-semibold text-cad-textHeading text-[11px]">Account Information</h5>
              <p className="text-cad-textMuted">
                If you create an account, we may collect information required to create and maintain that account, such as:
              </p>
              <ul className="list-disc list-inside text-cad-textMuted space-y-0.5 pl-1">
                <li>Name or display name</li>
                <li>Email address</li>
                <li>Authentication information</li>
                <li>Account preferences</li>
              </ul>
            </div>

            <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/40 pt-1">
              <h5 className="font-semibold text-cad-textHeading text-[11px]">Project Information</h5>
              <p className="text-cad-textMuted">
                When you use FloZ ECA, you may create or upload electronic design projects. This may include:
              </p>
              <ul className="list-disc list-inside text-cad-textMuted space-y-0.5 pl-1">
                <li>Schematics</li>
                <li>PCB layouts</li>
                <li>Component information</li>
                <li>Project files</li>
                <li>Design configurations</li>
                <li>AI prompts related to your project</li>
              </ul>
              <p className="text-cad-textMuted text-[11px]">
                We use this information to provide the features you request.
              </p>
            </div>

            <div className="space-y-1.5 pl-2 border-l-2 border-purple-500/40 pt-1">
              <h5 className="font-semibold text-cad-textHeading text-[11px]">Usage Information</h5>
              <p className="text-cad-textMuted">
                We may collect technical information about how the service is used, such as:
              </p>
              <ul className="list-disc list-inside text-cad-textMuted space-y-0.5 pl-1">
                <li>Browser type</li>
                <li>Device information</li>
                <li>Operating system</li>
                <li>IP address</li>
                <li>General usage activity</li>
                <li>Error and diagnostic information</li>
              </ul>
              <p className="text-cad-textMuted text-[11px]">
                This information helps us maintain, secure, and improve the service.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">2. How We Use Information</h4>
            <p className="text-cad-textMuted">We may use collected information to:</p>
            <ul className="list-disc list-inside text-cad-textMuted space-y-0.5 pl-1">
              <li>Provide and operate FloZ ECA.</li>
              <li>Authenticate users.</li>
              <li>Save and manage projects.</li>
              <li>Process AI requests.</li>
              <li>Provide customer support.</li>
              <li>Detect abuse and security problems.</li>
              <li>Fix bugs and technical problems.</li>
              <li>Improve product performance and usability.</li>
              <li>Develop new features.</li>
              <li>Comply with applicable legal requirements.</li>
            </ul>
            <p className="text-cad-text font-medium pt-1">
              We do not collect information simply because we can. If we don&apos;t need something for the product or its operation, we&apos;d rather not have it.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">3. AI Processing</h4>
            <p className="text-cad-textMuted">
              FloZ ECA includes AI-powered functionality.
            </p>
            <p className="text-cad-textMuted">
              When you use FloZ AI, information you provide to the AI may be processed by third-party AI infrastructure or service providers that we use to operate the feature. Depending on the implementation of the service, this may include:
            </p>
            <ul className="list-disc list-inside text-cad-textMuted space-y-0.5 pl-1">
              <li>Your AI prompt</li>
              <li>Relevant project information</li>
              <li>Design-related instructions</li>
              <li>Context required to generate a response</li>
            </ul>
            <p className="text-amber-600 dark:text-amber-400 font-medium text-[11px] pt-1">
              We recommend that you do not include passwords, private credentials, API keys, personal secrets, or other sensitive information in AI prompts.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">4. Third-Party Services</h4>
            <p className="text-cad-textMuted">
              FloZ may use third-party services for purposes such as authentication, hosting, database storage, AI processing, analytics, error monitoring, and infrastructure. These providers may process information on our behalf and are expected to handle information according to their applicable terms and privacy requirements.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">5. Cookies and Similar Technologies</h4>
            <p className="text-cad-textMuted">
              FloZ may use cookies or similar technologies to keep users signed in, remember preferences, maintain sessions, understand product usage, and improve service performance. Where required by applicable law, we will provide appropriate choices regarding non-essential cookies.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">6. Data Security</h4>
            <p className="text-cad-textMuted">
              We take reasonable technical and organizational measures to protect information from unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p className="text-cad-textMuted italic">
              However, no online service can promise absolute security. If someone tells you their database is mathematically impossible to hack, they&apos;re probably selling something.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">7. Data Retention</h4>
            <p className="text-cad-textMuted">
              We retain information for as long as reasonably necessary to provide our services, maintain accounts, comply with legal obligations, resolve disputes, and enforce agreements. Retention periods may vary depending on the type of information and how it is used.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">8. Your Choices</h4>
            <p className="text-cad-textMuted">
              Depending on your location and applicable law, you may have rights regarding your personal information, including the ability to request access, correction, deletion, restriction, object to processing, or withdraw consent where processing is based on consent. Requests can be made through our designated support or privacy contact method.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">9. Children&apos;s Privacy</h4>
            <p className="text-cad-textMuted">
              FloZ is not intentionally designed to collect personal information from children in violation of applicable laws. If you believe a child has provided personal information to us without appropriate authorization, please contact us.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">10. International Processing</h4>
            <p className="text-cad-textMuted">
              Depending on our infrastructure and service providers, information may be processed or stored in countries other than your own. Where required, we will use appropriate safeguards for international data transfers.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">11. Changes to This Policy</h4>
            <p className="text-cad-textMuted">
              We may update this Privacy Policy when our services, technology, or legal requirements change. When significant changes are made, we will take reasonable steps to notify users. The &quot;Last Updated&quot; date at the top of this page indicates when the policy was most recently revised.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-1.5 pt-2 border-t border-cad-border">
            <h4 className="font-semibold text-cad-textHeading text-xs">12. Contact</h4>
            <p className="text-cad-textMuted">
              If you have questions about this Privacy Policy or how FloZ handles information, please contact us through the official FloZ support or contact channel.
            </p>
            <p className="text-cad-textHeading font-semibold pt-1">
              Privacy matters. We take it seriously — even if we occasionally explain it without the legalese.
            </p>
          </section>
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
