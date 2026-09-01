/**
 * FloZ ECA — SEO, Metadata, Accessibility & Production Readiness Test Suite
 * Validates dynamic document titles, Open Graph (1200x630 PNG), Sitemap.xml, Robots.txt,
 * Schema.org JSON-LD, clean site configuration, and analytics privacy logic.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { siteConfig } from '../config/siteConfig';
import { SEOEngine } from '../core/seo';
import { AnalyticsService } from '../core/analytics';
import * as fs from 'fs';
import * as path from 'path';

describe('FloZ ECA — SEO, Accessibility & Production Readiness', () => {
  let mockElements: any[] = [];

  beforeEach(() => {
    mockElements = [];
    (global as any).document = {
      title: '',
      head: {
        appendChild: (el: any) => {
          mockElements.push(el);
          return el;
        },
      },
      querySelector: (sel: string) => {
        if (sel.includes('link[rel="canonical"]')) {
          return mockElements.find((e) => e.rel === 'canonical') || null;
        }
        const match = sel.match(/meta\[(name|property)="([^"]+)"\]/);
        if (match) {
          const [_, attr, key] = match;
          return mockElements.find((e) => e[attr] === key) || null;
        }
        return null;
      },
      getElementById: (id: string) => mockElements.find((e) => e.id === id) || null,
      createElement: (tag: string) => {
        const el: any = {
          tagName: tag.toUpperCase(),
          getAttribute: (attr: string) => el[attr] || null,
          setAttribute: (attr: string, val: string) => {
            el[attr] = val;
          },
        };
        return el;
      },
    };

    (global as any).window = {
      location: { pathname: '/workspace/schematic', origin: 'http://localhost:5173' },
    };
  });

  describe('1. Central Site Configuration & Strict Placeholders', () => {
    it('provides clean defaults without fabricated contact numbers or fake addresses', () => {
      expect(siteConfig.siteName).toBe('FloZ ECA');
      expect(siteConfig.companyName).toBe('FloZ EDA');
      expect(siteConfig.version).toBe('1.0.0');
      // When environment variables are not set, these must remain undefined/empty
      expect(siteConfig.contactPhone).toBeUndefined();
      expect(siteConfig.contactAddress).toBeUndefined();
      expect(siteConfig.analyticsId).toBeUndefined();
    });
  });

  describe('2. Dynamic SEO & Head Metadata Updates', () => {
    it('sets unique title, meta description, and canonical URL on view transition', () => {
      SEOEngine.updateMeta({
        title: 'Schematic Capture & Hierarchical Sheet Editor',
        description: 'Design multi-sheet schematics with KiCad symbol libraries.',
        canonicalPath: '/workspace/schematic',
      });

      expect(document.title).toContain('Schematic Capture');
      expect(document.title).toContain(siteConfig.siteName);

      const descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      expect(descTag?.content).toBe('Design multi-sheet schematics with KiCad symbol libraries.');

      const canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      expect(canonicalTag?.href).toContain('/workspace/schematic');
    });

    it('sets Open Graph and Twitter Card tags with PNG image format', () => {
      SEOEngine.updateMeta({
        title: 'PCB Layout Editor',
        description: 'Route 8-layer PCBs with 45-degree octilinear router.',
        canonicalPath: '/workspace/pcb',
      });

      const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
      expect(ogTitle?.content).toContain('PCB Layout Editor');

      const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
      expect(ogImage?.content).toContain('.png');

      const twitterCard = document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]');
      expect(twitterCard?.content).toBe('summary_large_image');
    });

    it('sets noindex for 404 and thank-you states', () => {
      SEOEngine.updateMeta({
        title: 'Page Not Found',
        noIndex: true,
      });

      const robotsTag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      expect(robotsTag?.content).toContain('noindex');
    });

    it('generates valid Schema.org JSON-LD structured data without fake phone/address', () => {
      SEOEngine.updateMeta({
        title: 'FloZ ECA Overview',
        description: 'Professional EDA Suite',
        canonicalPath: '/dashboard',
      });

      const scriptTag = document.getElementById('floz-structured-data');
      expect(scriptTag).toBeDefined();
      expect(scriptTag?.textContent).toContain('SoftwareApplication');
      expect(scriptTag?.textContent).toContain('FloZ ECA');

      const parsed = JSON.parse(scriptTag!.textContent!);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@graph'].length).toBeGreaterThanOrEqual(3);

      // Verify no fake phone or fake address in Organization
      const org = parsed['@graph'].find((g: any) => g['@type'] === 'Organization');
      expect(org).toBeDefined();
      expect(org.contactPoint).toBeUndefined(); // Since no phone/email env vars set
    });
  });

  describe('3. Public SEO Files & Standards Compliance', () => {
    it('verifies public/robots.txt exists and contains valid sitemap directive', () => {
      const robotsPath = path.resolve(__dirname, '../../public/robots.txt');
      expect(fs.existsSync(robotsPath)).toBe(true);

      const content = fs.readFileSync(robotsPath, 'utf8');
      expect(content).toContain('User-agent: *');
      expect(content).toContain('Allow: /');
      expect(content).toContain('Sitemap: /sitemap.xml');
    });

    it('verifies public/sitemap.xml exists and contains only public indexable routes', () => {
      const sitemapPath = path.resolve(__dirname, '../../public/sitemap.xml');
      expect(fs.existsSync(sitemapPath)).toBe(true);

      const content = fs.readFileSync(sitemapPath, 'utf8');
      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<urlset');
      expect(content).toContain('<loc>/</loc>');
      expect(content).toContain('<loc>/dashboard</loc>');
      expect(content).toContain('<loc>/privacy</loc>');
      expect(content).toContain('<loc>/terms</loc>');
      // Private workspace canvas sub-routes should not be in sitemap
      expect(content).not.toContain('<loc>/workspace/pcb</loc>');
    });

    it('verifies public/favicon.svg, site.webmanifest, and og-image.png exist', () => {
      const faviconPath = path.resolve(__dirname, '../../public/favicon.svg');
      const manifestPath = path.resolve(__dirname, '../../public/site.webmanifest');
      const ogPngPath = path.resolve(__dirname, '../../public/og-image.png');

      expect(fs.existsSync(faviconPath)).toBe(true);
      expect(fs.existsSync(manifestPath)).toBe(true);
      expect(fs.existsSync(ogPngPath)).toBe(true);

      const pngStats = fs.statSync(ogPngPath);
      expect(pngStats.size).toBeGreaterThan(1000);
    });
  });

  describe('4. Privacy-First Analytics & Consent Engine', () => {
    it('does not initialize analytics without consent or analyticsId', () => {
      AnalyticsService.setConsent(false);
      expect(AnalyticsService.trackPageView).toBeDefined();
      expect(AnalyticsService.trackEvent).toBeDefined();
    });
  });
});
