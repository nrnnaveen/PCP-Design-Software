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
    github: string;
    linkedin: string;
    discord: string;
    instagram: string;
    twitter?: string;
    documentation?: string;
  };
}

// Compute configured site URL, or empty string if not explicitly set
const envSiteUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
  ? String(import.meta.env.VITE_SITE_URL).replace(/\/+$/, '')
  : '';

export const siteConfig: SiteConfig = {
  siteUrl: envSiteUrl,
  siteName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_NAME) || 'FloZ ECA',
  siteTitle: 'FloZ — AI PCB Design Software | Prompt to Circuit Board',
  siteDescription:
    'FloZ ECA is an AI-integrated electronic design automation platform built to make PCB design more accessible, practical, and less intimidating.',
  version: '1.0.0',
  author: 'FloZ AI Hardware Studio',
  companyName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_COMPANY_NAME) || 'FloZ EDA',
  contactEmail: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTACT_EMAIL)
    ? String(import.meta.env.VITE_CONTACT_EMAIL)
    : 'floz.tech.official@gmail.com',
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
    github: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_URL)
      ? String(import.meta.env.VITE_GITHUB_URL)
      : 'https://github.com/FloZ-Official',
    linkedin: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LINKEDIN_URL)
      ? String(import.meta.env.VITE_LINKEDIN_URL)
      : 'https://www.linkedin.com/company/flozhub/',
    discord: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DISCORD_URL)
      ? String(import.meta.env.VITE_DISCORD_URL)
      : 'https://discord.gg/xDNYCTH6x',
    instagram: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INSTAGRAM_URL)
      ? String(import.meta.env.VITE_INSTAGRAM_URL)
      : 'https://www.instagram.com/floz.official?igsh=MXVsaGdtZHFyem43Nw==',
    twitter: typeof import.meta !== 'undefined' && import.meta.env?.VITE_TWITTER_URL
      ? String(import.meta.env.VITE_TWITTER_URL)
      : undefined,
    documentation: typeof import.meta !== 'undefined' && import.meta.env?.VITE_DOCS_URL
      ? String(import.meta.env.VITE_DOCS_URL)
      : undefined,
  },
};
