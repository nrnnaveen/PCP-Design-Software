/**
 * FloZ ECA — Central Site & Application Configuration
 * All production business information, URLs, and telemetry IDs are environment-driven.
 * If a value is not provided via environment variables, it defaults to undefined
 * and is gracefully omitted from the UI and metadata.
 */

export interface SiteConfig {
  siteUrl: string;
  siteName: string;
  siteTitle: string;
  siteDescription: string;
  version: string;
  author: string;
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  analyticsId?: string;
  social: {
    github?: string;
    twitter?: string;
    documentation?: string;
    discord?: string;
  };
}

// Compute configured site URL, or empty string if not explicitly set
const envSiteUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
  ? String(import.meta.env.VITE_SITE_URL).replace(/\/+$/, '')
  : '';

export const siteConfig: SiteConfig = {
  siteUrl: envSiteUrl,
  siteName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_NAME) || 'FloZ ECA',
  siteTitle: 'FloZ ECA — Electronic Circuit Architect | Professional EDA & PCB Suite',
  siteDescription:
    'FloZ ECA is a high-performance Electronic Design Automation (EDA) suite for schematic capture, multi-layer PCB layout, 3D WebGL board inspection, SPICE simulation, and Gerber manufacturing output generation.',
  version: '1.0.0',
  author: 'FloZ EDA Engineering Team',
  companyName: 'FloZ EDA',
  contactEmail: typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTACT_EMAIL
    ? String(import.meta.env.VITE_CONTACT_EMAIL)
    : undefined,
  contactPhone: typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTACT_PHONE
    ? String(import.meta.env.VITE_CONTACT_PHONE)
    : undefined,
  contactAddress: typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTACT_ADDRESS
    ? String(import.meta.env.VITE_CONTACT_ADDRESS)
    : undefined,
  analyticsId: typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANALYTICS_ID
    ? String(import.meta.env.VITE_ANALYTICS_ID).trim()
    : undefined,
  social: {
    github: typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_URL
      ? String(import.meta.env.VITE_GITHUB_URL)
      : undefined,
    twitter: typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWITTER_URL
      ? String(import.meta.env.VITE_TWITTER_URL)
      : undefined,
    documentation: typeof import.meta !== 'undefined' && import.meta.env?.VITE_DOCS_URL
      ? String(import.meta.env.VITE_DOCS_URL)
      : undefined,
    discord: typeof import.meta !== 'undefined' && import.meta.env?.VITE_DISCORD_URL
      ? String(import.meta.env.VITE_DISCORD_URL)
      : undefined,
  },
};
