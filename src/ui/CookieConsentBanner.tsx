/**
 * FloZ ECA — Microsoft Fluent Cookie & Telemetry Consent Banner
 * Accessible, non-dark-pattern privacy consent complying with global privacy frameworks.
 */

import React, { useState, useEffect } from 'react';
import { Cookie, Settings, Check, X } from 'lucide-react';
import { AnalyticsService } from '../core/analytics';
import { siteConfig } from '../config/siteConfig';

interface Props {
  onOpenPrivacyPolicy: () => void;
}

export const CookieConsentBanner: React.FC<Props> = ({ onOpenPrivacyPolicy }) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Only prompt for consent if an analytics service ID is configured
    if (!siteConfig.analyticsId) return;

    try {
      const consent = localStorage.getItem('floz-cookie-consent');
      if (!consent) {
        // Delay appearance slightly for smooth first paint
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      } else if (consent === 'accepted') {
        AnalyticsService.setConsent(true);
      }
    } catch {}
  }, []);

  if (!siteConfig.analyticsId || !visible) return null;

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('floz-cookie-consent', 'accepted');
      localStorage.setItem('floz-telemetry-optin', 'true');
      AnalyticsService.setConsent(true);
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem('floz-cookie-consent', 'declined');
      localStorage.setItem('floz-telemetry-optin', 'false');
      AnalyticsService.setConsent(false);
    } catch {}
    setVisible(false);
  };

  const handleSavePreferences = () => {
    try {
      const state = telemetryEnabled ? 'accepted' : 'declined';
      localStorage.setItem('floz-cookie-consent', state);
      localStorage.setItem('floz-telemetry-optin', telemetryEnabled ? 'true' : 'false');
      AnalyticsService.setConsent(telemetryEnabled);
    } catch {}
    setVisible(false);
    setShowPreferences(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Preferences"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-cad-panel border border-cad-border rounded-lg shadow-2xl p-4 text-cad-text select-none animate-in fade-in slide-in-from-bottom-3 duration-150"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <Cookie size={14} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-cad-textHeading">Privacy &amp; Telemetry Notice</h3>
            <p className="text-[11px] text-cad-textMuted leading-relaxed">
              FloZ ECA processes all PCB &amp; circuit designs locally. We use optional telemetry solely for anonymized error monitoring and CAD performance optimization.
            </p>
          </div>
        </div>

        {/* Preferences Expandable */}
        {showPreferences && (
          <div className="p-2.5 bg-cad-subpanel border border-cad-border rounded space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold block text-cad-text">Essential Storage</span>
                <span className="text-cad-textMuted text-[10px]">Local CAD design cache &amp; theme settings</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold">Required</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-cad-border">
              <div>
                <span className="font-semibold block text-cad-text">Anonymous Telemetry</span>
                <span className="text-cad-textMuted text-[10px]">Performance &amp; crash reporting diagnostics</span>
              </div>
              <input
                type="checkbox"
                checked={telemetryEnabled}
                onChange={(e) => setTelemetryEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-[11px] text-cad-textMuted hover:text-cad-text flex items-center gap-1 font-medium transition-colors"
            >
              <Settings size={12} />
              <span>{showPreferences ? 'Hide' : 'Manage'}</span>
            </button>
            <span className="text-cad-border">·</span>
            <button
              onClick={onOpenPrivacyPolicy}
              className="text-[11px] text-cad-textMuted hover:text-blue-500 transition-colors font-medium"
            >
              Policy
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {showPreferences ? (
              <button
                onClick={handleSavePreferences}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-sm transition-colors flex items-center gap-1"
              >
                <Check size={12} />
                <span>Save</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleDecline}
                  className="px-2.5 py-1 bg-cad-subpanel hover:bg-cad-surfaceHover text-cad-text border border-cad-border rounded text-xs font-medium transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium shadow-sm transition-colors"
                >
                  Accept All
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
