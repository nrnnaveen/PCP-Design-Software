/**
 * FloZ ECA — SEO & Metadata Management Engine
 * Handles dynamic document titles, Open Graph, Twitter Cards, Canonical URLs, and Schema.org JSON-LD.
 * Only outputs verified values without fake or unverified information.
 */

import { siteConfig } from '../config/siteConfig';

export interface PageMetaOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  noIndex?: boolean;
}

export class SEOEngine {
  /**
   * Updates head metadata dynamically based on current route/view.
   */
  public static updateMeta(options: PageMetaOptions = {}) {
    if (typeof document === 'undefined') return;

    const fullTitle = options.title
      ? `${options.title} | ${siteConfig.siteName}`
      : siteConfig.siteTitle;

    const description = options.description || siteConfig.siteDescription;
    const rawPath = (options.canonicalPath || (typeof window !== 'undefined' ? window.location.pathname : '/')) || '/';
    const cleanPath = rawPath.replace(/\/+$/, '') || '/';

    const origin = siteConfig.siteUrl || (typeof window !== 'undefined' && window.location.origin ? window.location.origin : '');
    const canonicalUrl = origin ? `${origin}${cleanPath === '/' ? '' : cleanPath}` : cleanPath;
    const ogImage = options.ogImage || (origin ? `${origin}/og-image.png` : '/og-image.png');

    // 1. Title
    document.title = fullTitle;

    // 2. Meta Description
    this.setMetaTag('name', 'description', description);

    // 3. Canonical Link
    let canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.rel = 'canonical';
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.href = canonicalUrl;

    // 4. Robots indexing (noindex for 404, thank-you, or private views)
    if (options.noIndex) {
      this.setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      this.setMetaTag('name', 'robots', 'index, follow, max-image-preview:large');
    }

    // 5. Open Graph Metadata
    this.setMetaTag('property', 'og:title', fullTitle);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('property', 'og:type', options.ogType || 'website');
    this.setMetaTag('property', 'og:url', canonicalUrl);
    this.setMetaTag('property', 'og:image', ogImage);
    this.setMetaTag('property', 'og:site_name', siteConfig.siteName);

    // 6. Twitter / X Card Metadata
    this.setMetaTag('name', 'twitter:card', 'summary_large_image');
    this.setMetaTag('name', 'twitter:title', fullTitle);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('name', 'twitter:image', ogImage);

    // 7. Inject/Update Schema.org JSON-LD
    this.updateStructuredData(fullTitle, description, canonicalUrl, origin);
  }

  private static setMetaTag(attr: 'name' | 'property', key: string, content: string) {
    let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, key);
      document.head.appendChild(tag);
    }
    tag.content = content;
  }

  private static updateStructuredData(title: string, description: string, url: string, origin: string) {
    const scriptId = 'floz-structured-data';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const orgId = origin ? `${origin}/#organization` : '#organization';
    const webSiteId = origin ? `${origin}/#website` : '#website';
    const softwareId = origin ? `${origin}/#software` : '#software';

    const organizationSchema: Record<string, any> = {
      '@type': 'Organization',
      '@id': orgId,
      name: siteConfig.companyName,
    };

    if (origin) {
      organizationSchema.url = origin;
      organizationSchema.logo = `${origin}/favicon.svg`;
    }

    if (siteConfig.contactEmail || siteConfig.contactPhone) {
      const contactPoint: Record<string, any> = {
        '@type': 'ContactPoint',
        contactType: 'technical support',
      };
      if (siteConfig.contactEmail) contactPoint.email = siteConfig.contactEmail;
      if (siteConfig.contactPhone) contactPoint.telephone = siteConfig.contactPhone;
      organizationSchema.contactPoint = contactPoint;
    }

    const softwareSchema: Record<string, any> = {
      '@type': 'SoftwareApplication',
      '@id': softwareId,
      name: siteConfig.siteName,
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Cross-platform (Web, Windows, Linux, macOS)',
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
      },
      description: siteConfig.siteDescription,
      author: {
        '@type': 'Organization',
        name: siteConfig.companyName,
      },
    };

    if (origin) {
      softwareSchema.url = origin;
    }

    const graph: any[] = [
      {
        '@type': 'WebSite',
        '@id': webSiteId,
        url: origin || '/',
        name: siteConfig.siteName,
        description: siteConfig.siteDescription,
        publisher: {
          '@id': orgId,
        },
      },
      organizationSchema,
      softwareSchema,
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url: url,
        name: title,
        description: description,
        isPartOf: {
          '@id': webSiteId,
        },
      },
    ];

    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': graph,
    };

    scriptTag.textContent = JSON.stringify(structuredData, null, 2);
  }
}
