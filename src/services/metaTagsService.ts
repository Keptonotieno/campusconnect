import type { University } from '../types';

export interface MetaTagConfig {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogUrl?: string;
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  canonicalUrl?: string;
  robots?: string;
  themeColor?: string;
  structuredData?: Record<string, unknown> | null;
}

export interface RouteMetaOptions {
  activeCampus?: University | null;
  requestedCampusSlug?: string | null;
  isResolvingCampus?: boolean;
  campusCount?: number;
}

export interface UniversityMetaOptions {
  viewMode?: 'LANDING' | 'BUILDER';
  step?: 1 | 2 | 3 | 'SUCCESS';
  featuredPhotoUrl?: string;
}

export const SITE_NAME = 'CampusConnect';

export const DEFAULT_OG_IMAGE_URL =
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80';

export const DEFAULT_META_CONFIG: MetaTagConfig = {
  title: 'CampusConnect – University Instagram Community Platform',
  description:
    'Discover verified university class pages, submit campus introductions, and grow Instagram community engagement with CampusConnect.',
  ogTitle: 'CampusConnect – University Instagram Community Platform',
  ogDescription:
    'Discover verified university class pages, submit campus introductions, and grow Instagram community engagement with CampusConnect.',
  ogImage: DEFAULT_OG_IMAGE_URL,
  ogImageAlt: 'CampusConnect verified university Instagram community network',
  ogType: 'website',
  siteName: SITE_NAME,
  twitterCard: 'summary_large_image',
  robots: 'index, follow',
  themeColor: '#1D64EC',
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'All',
    description:
      'Discover verified university class pages, submit campus introductions, and manage Instagram community engagement in one place.'
  }
};

const JSONLD_SCRIPT_ID = 'cc-dynamic-jsonld';

/**
 * Resolves the canonical URL for the active browser route or an explicit path override.
 */
export function resolveCanonicalUrl(pathOverride?: string): string {
  if (typeof window === 'undefined') {
    const cleanPath = pathOverride ? (pathOverride.startsWith('/') ? pathOverride : `/${pathOverride}`) : '/';
    return `https://campusconnect.app${cleanPath}`;
  }
  const origin = window.location.origin;
  const pathname = pathOverride
    ? (pathOverride.startsWith('/') ? pathOverride : `/${pathOverride}`).split('?')[0].split('#')[0]
    : window.location.pathname;
  return `${origin}${pathname}`;
}

/**
 * Validates and resolves an image URL to an absolute http(s) URL safe for og:image / twitter:image tags.
 */
export function resolveSafeMetaImageUrl(rawUrl?: string | null, fallbackUrl: string = DEFAULT_OG_IMAGE_URL): string {
  const candidate = (rawUrl || '').trim();
  if (!candidate) return fallbackUrl;

  if (candidate.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${candidate}`;
    }
    return `https://campusconnect.app${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Reject malformed or non-HTTP schemes (e.g., javascript:, data:)
  }

  return fallbackUrl;
}

/**
 * Cleanly trims meta strings at word boundaries to avoid awkward truncation in search/social previews.
 */
export function truncateMetaText(value: string, maxLength: number): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = clipped.lastIndexOf(' ');
  const base = lastSpace > maxLength * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}…`;
}

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content?: string): void {
  if (typeof document === 'undefined' || !document.head) return;
  const selector = `meta[${attrName}="${attrValue}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);

  if (!content) {
    if (existing) existing.remove();
    return;
  }

  if (existing) {
    if (existing.getAttribute('content') !== content) {
      existing.setAttribute('content', content);
    }
    return;
  }

  const meta = document.createElement('meta');
  meta.setAttribute(attrName, attrValue);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function upsertLinkTag(rel: string, href?: string): void {
  if (typeof document === 'undefined' || !document.head) return;
  const selector = `link[rel="${rel}"]`;
  const existing = document.head.querySelector<HTMLLinkElement>(selector);

  if (!href) {
    if (existing) existing.remove();
    return;
  }

  if (existing) {
    if (existing.getAttribute('href') !== href) {
      existing.setAttribute('href', href);
    }
    return;
  }

  const link = document.createElement('link');
  link.setAttribute('rel', rel);
  link.setAttribute('href', href);
  document.head.appendChild(link);
}

function upsertJsonLd(data?: Record<string, unknown> | null): void {
  if (typeof document === 'undefined' || !document.head) return;
  const existing = document.getElementById(JSONLD_SCRIPT_ID);

  if (!data) {
    if (existing) existing.remove();
    return;
  }

  const serialized = JSON.stringify(data);
  if (existing) {
    if (existing.textContent !== serialized) {
      existing.textContent = serialized;
    }
    return;
  }

  const script = document.createElement('script');
  script.id = JSONLD_SCRIPT_ID;
  script.type = 'application/ld+json';
  script.textContent = serialized;
  document.head.appendChild(script);
}

/**
 * Applies a MetaTagConfig object to document.title and all SEO / OpenGraph / Twitter / JSON-LD head tags.
 */
export function updateMetaTags(config: MetaTagConfig): MetaTagConfig {
  const title = truncateMetaText(config.title || DEFAULT_META_CONFIG.title, 100);
  const description = truncateMetaText(config.description || DEFAULT_META_CONFIG.description, 160);
  const ogTitle = truncateMetaText(config.ogTitle || title, 100);
  const ogDescription = truncateMetaText(config.ogDescription || description, 160);
  const ogImage = resolveSafeMetaImageUrl(config.ogImage, DEFAULT_OG_IMAGE_URL);
  const ogImageAlt = config.ogImageAlt || `${ogTitle} social preview`;
  const ogType = config.ogType || 'website';
  const canonicalUrl = config.canonicalUrl || resolveCanonicalUrl();
  const ogUrl = config.ogUrl || canonicalUrl;
  const siteName = config.siteName || SITE_NAME;
  const twitterCard = config.twitterCard || 'summary_large_image';
  const twitterTitle = truncateMetaText(config.twitterTitle || ogTitle, 100);
  const twitterDescription = truncateMetaText(config.twitterDescription || ogDescription, 160);
  const twitterImage = resolveSafeMetaImageUrl(config.twitterImage || ogImage, DEFAULT_OG_IMAGE_URL);
  const twitterImageAlt = config.twitterImageAlt || ogImageAlt;
  const robots = config.robots || 'index, follow';
  const themeColor = config.themeColor || DEFAULT_META_CONFIG.themeColor || '#1D64EC';

  if (typeof document !== 'undefined') {
    if (document.title !== title) {
      document.title = title;
    }

    upsertMetaTag('name', 'description', description);
    upsertMetaTag('name', 'robots', robots);
    upsertMetaTag('name', 'theme-color', themeColor);

    upsertMetaTag('property', 'og:type', ogType);
    upsertMetaTag('property', 'og:title', ogTitle);
    upsertMetaTag('property', 'og:description', ogDescription);
    upsertMetaTag('property', 'og:image', ogImage);
    upsertMetaTag('property', 'og:image:alt', ogImageAlt);
    upsertMetaTag('property', 'og:url', ogUrl);
    upsertMetaTag('property', 'og:site_name', siteName);

    upsertMetaTag('name', 'twitter:card', twitterCard);
    upsertMetaTag('name', 'twitter:title', twitterTitle);
    upsertMetaTag('name', 'twitter:description', twitterDescription);
    upsertMetaTag('name', 'twitter:image', twitterImage);
    upsertMetaTag('name', 'twitter:image:alt', twitterImageAlt);

    upsertLinkTag('canonical', canonicalUrl);
    upsertJsonLd(config.structuredData ?? null);
  }

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    ogImageAlt,
    ogType,
    ogUrl,
    siteName,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    twitterImageAlt,
    canonicalUrl,
    robots,
    themeColor,
    structuredData: config.structuredData ?? null
  };
}

/**
 * Generates rich SEO, OpenGraph, Twitter Card, and Schema.org metadata tailored to a University Community Page.
 */
export function buildUniversityCommunityMeta(
  university: University,
  options: UniversityMetaOptions = {}
): MetaTagConfig {
  const { viewMode = 'LANDING', step, featuredPhotoUrl } = options;
  const rawHandle = (university.instagramHandle || university.slug || '').trim();
  const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  const classYear = university.classYear ? `Class of ${university.classYear}` : 'Student Community';
  const locationText = university.location ? ` in ${university.location}` : '';
  const canonicalPath = `/ig/${university.slug}`;
  const canonicalUrl = resolveCanonicalUrl(canonicalPath);

  const primaryImage = resolveSafeMetaImageUrl(
    featuredPhotoUrl || university.coverUrl || university.logoUrl,
    DEFAULT_OG_IMAGE_URL
  );

  let title: string;
  let description: string;

  if (viewMode === 'BUILDER') {
    const stepLabel =
      step === 'SUCCESS'
        ? 'Submission Confirmed'
        : step === 3
          ? 'Review & Checkout'
          : step === 2
            ? 'Add Student Bio'
            : 'Upload Photos';

    title = `${stepLabel} – ${university.name} (${handle}) | ${SITE_NAME}`;
    description = `Submit your ${university.name} ${classYear} introduction and campus photos to get featured on ${handle}. Connect with incoming classmates${locationText}.`;
  } else {
    title = `${university.name} ${classYear} (${handle}) | ${SITE_NAME}`;
    const baseDesc = university.description?.trim()
      ? university.description.trim()
      : `Official ${university.name} ${classYear} student community${locationText}.`;
    description = `${baseDesc} Share your campus intro and get featured on ${handle}.`;
  }

  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: truncateMetaText(description, 165),
    url: canonicalUrl,
    primaryImageOfPage: primaryImage,
    about: {
      '@type': 'CollegeOrUniversity',
      name: university.name,
      url: university.officialWebsiteUrl || canonicalUrl,
      ...(university.location ? { address: university.location } : {}),
      ...(university.logoUrl ? { logo: resolveSafeMetaImageUrl(university.logoUrl) } : {}),
      ...(university.instagramProfileUrl ? { sameAs: [university.instagramProfileUrl] } : {})
    }
  };

  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: primaryImage,
    ogImageAlt: `${university.name} ${classYear} (${handle}) campus community cover`,
    ogType: 'website',
    ogUrl: canonicalUrl,
    siteName: SITE_NAME,
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    themeColor: university.primaryColor || '#1D64EC',
    canonicalUrl,
    structuredData
  };
}

/**
 * Resolves metadata configuration for any application route/view.
 */
export function buildRouteMeta(route: string, options: RouteMetaOptions = {}): MetaTagConfig {
  const pathOnly = (route || '/').split('?')[0].split('#')[0] || '/';
  const { activeCampus, requestedCampusSlug, isResolvingCampus, campusCount } = options;

  // 1. Dedicated University Community routes (/ig/:slug, /u/:slug, /university/:slug, /submit/:slug)
  if (requestedCampusSlug) {
    if (activeCampus) {
      const viewMode = pathOnly.startsWith('/submit/') ? 'BUILDER' : 'LANDING';
      return buildUniversityCommunityMeta(activeCampus, { viewMode });
    }

    if (isResolvingCampus) {
      return {
        ...DEFAULT_META_CONFIG,
        title: `Connecting to @${requestedCampusSlug} | ${SITE_NAME}`,
        description: `Loading verified university community portal and Instagram showcase for @${requestedCampusSlug} on CampusConnect.`,
        ogUrl: resolveCanonicalUrl(pathOnly),
        canonicalUrl: resolveCanonicalUrl(pathOnly)
      };
    }

    return {
      ...DEFAULT_META_CONFIG,
      title: `Community Not Found (@${requestedCampusSlug}) | ${SITE_NAME}`,
      description: `No university community page matching "${requestedCampusSlug}" was found. Browse verified campuses on CampusConnect.`,
      robots: 'noindex, follow',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly)
    };
  }

  // 2. Campus Directory
  if (pathOnly === '/campuses' || pathOnly === '/schools') {
    const countCopy = campusCount && campusCount > 0 ? `${campusCount}+ verified ` : 'verified ';
    return {
      ...DEFAULT_META_CONFIG,
      title: `Campus Directory – Verified University Pages | ${SITE_NAME}`,
      description: `Browse ${countCopy}university Instagram community pages, find your incoming class page, and submit your campus introduction on CampusConnect.`,
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly)
    };
  }

  // 3. Admin & Authenticated Portals (noindex)
  if (pathOnly.startsWith('/admin')) {
    return {
      ...DEFAULT_META_CONFIG,
      title: `Admin Operations Portal | ${SITE_NAME}`,
      description: 'CampusConnect administrative operations, campus management, submissions review, and security controls.',
      robots: 'noindex, nofollow',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly),
      structuredData: null
    };
  }

  if (
    pathOnly === '/student' ||
    pathOnly.startsWith('/student/') ||
    pathOnly === '/my-submissions' ||
    pathOnly.startsWith('/app') ||
    pathOnly.startsWith('/business/dashboard')
  ) {
    const sectionTitle =
      pathOnly === '/app/submit'
        ? 'Submit Featured Post'
        : pathOnly === '/app/onboarding'
          ? 'Student Onboarding'
          : pathOnly === '/app/inbox'
            ? 'Direct Messages Inbox'
            : pathOnly === '/app/comments'
              ? 'Community Comments'
              : pathOnly === '/app/insights'
                ? 'Engagement Insights'
                : pathOnly === '/app/accounts'
                  ? 'Connected Instagram Accounts'
                  : pathOnly === '/app/notifications'
                    ? 'Notifications'
                    : pathOnly === '/app/settings'
                      ? 'Account Settings'
                      : 'Student Dashboard & Submissions';

    return {
      ...DEFAULT_META_CONFIG,
      title: `${sectionTitle} | ${SITE_NAME}`,
      description: `Manage your ${SITE_NAME} student profile, campus submissions, and Instagram community engagement.`,
      robots: 'noindex, nofollow',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly),
      structuredData: null
    };
  }

  // 4. Auth Views
  if (pathOnly === '/login' || pathOnly === '/business/login') {
    return {
      ...DEFAULT_META_CONFIG,
      title: `Sign In | ${SITE_NAME}`,
      description: 'Sign in to your CampusConnect student or campus community account to submit posts and track your features.',
      robots: 'noindex, follow',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly)
    };
  }

  if (pathOnly === '/register' || pathOnly === '/business/register') {
    return {
      ...DEFAULT_META_CONFIG,
      title: `Create Account | ${SITE_NAME}`,
      description: 'Join your verified university class community on CampusConnect to introduce yourself and meet incoming classmates.',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly)
    };
  }

  if (pathOnly === '/forgot-password' || pathOnly === '/verify' || pathOnly === '/reset-password') {
    return {
      ...DEFAULT_META_CONFIG,
      title: `Account Security & Verification | ${SITE_NAME}`,
      description: 'Verify your student email address or securely reset your CampusConnect account password.',
      robots: 'noindex, nofollow',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly),
      structuredData: null
    };
  }

  // 5. Legal & Compliance Views
  if (pathOnly === '/terms') {
    return {
      ...DEFAULT_META_CONFIG,
      title: `Terms of Service | ${SITE_NAME}`,
      description: 'Read the Terms of Service governing student submissions, community guidelines, and services on CampusConnect.',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly)
    };
  }

  if (pathOnly === '/privacy') {
    return {
      ...DEFAULT_META_CONFIG,
      title: `Privacy Policy | ${SITE_NAME}`,
      description: 'Learn how CampusConnect protects student privacy, campus uploads, and personal account data.',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly)
    };
  }

  if (pathOnly === '/data-deletion') {
    return {
      ...DEFAULT_META_CONFIG,
      title: `Data Deletion Instructions | ${SITE_NAME}`,
      description: 'Instructions for requesting account or campus submission data deletion on CampusConnect.',
      ogUrl: resolveCanonicalUrl(pathOnly),
      canonicalUrl: resolveCanonicalUrl(pathOnly)
    };
  }

  // 6. Default Landing Page
  return {
    ...DEFAULT_META_CONFIG,
    ogUrl: resolveCanonicalUrl('/'),
    canonicalUrl: resolveCanonicalUrl('/')
  };
}

/**
 * Computes and immediately applies metadata tags for the given route and context.
 */
export function applyRouteMeta(route: string, options: RouteMetaOptions = {}): MetaTagConfig {
  return updateMetaTags(buildRouteMeta(route, options));
}

/**
 * Restores all managed head tags back to the default CampusConnect landing metadata.
 */
export function resetMetaTags(): MetaTagConfig {
  return updateMetaTags(DEFAULT_META_CONFIG);
}
