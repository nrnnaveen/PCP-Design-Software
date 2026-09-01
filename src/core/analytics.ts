/**
 * FloZ ECA — Analytics & Telemetry Engine
 * Privacy-first, consent-respecting analytics abstraction.
 * Only initializes if VITE_ANALYTICS_ID is provided and user has consented.
 */

import { siteConfig } from '../config/siteConfig';

export interface AnalyticsEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
}

export class AnalyticsService {
  private static initialized = false;
  private static consentGranted = false;

  public static setConsent(granted: boolean) {
    this.consentGranted = granted;
    if (granted && !this.initialized && siteConfig.analyticsId) {
      this.init();
    }
  }

  public static init() {
    if (this.initialized || !siteConfig.analyticsId || typeof window === 'undefined') return;

    try {
      const savedConsent = localStorage.getItem('floz-cookie-consent');
      if (savedConsent !== 'accepted') {
        return; // Wait for explicit consent
      }

      this.initialized = true;

      // Clean script injection for Google Analytics / Plausible / PostHog
      if (siteConfig.analyticsId.startsWith('G-')) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${siteConfig.analyticsId}`;
        document.head.appendChild(script);

        // Define gtag
        (window as any).dataLayer = (window as any).dataLayer || [];
        function gtag(...args: any[]) {
          (window as any).dataLayer.push(args);
        }
        (window as any).gtag = gtag;
        gtag('js', new Date());
        gtag('config', siteConfig.analyticsId, {
          anonymize_ip: true,
          send_page_view: false,
        });
      }
    } catch {
      // Offline / Local development resilience
    }
  }

  public static trackPageView(path: string, title?: string) {
    if (!this.initialized || typeof window === 'undefined') return;

    try {
      if ((window as any).gtag && siteConfig.analyticsId) {
        (window as any).gtag('event', 'page_view', {
          page_path: path,
          page_title: title || document.title,
          page_location: window.location.href,
        });
      }
    } catch {
      // Suppress telemetry errors
    }
  }

  public static trackEvent(event: AnalyticsEvent) {
    if (!this.initialized || typeof window === 'undefined') return;

    try {
      if ((window as any).gtag) {
        (window as any).gtag('event', event.action, {
          event_category: event.category || 'engagement',
          event_label: event.label,
          value: event.value,
        });
      }
    } catch {
      // Suppress telemetry errors
    }
  }
}
