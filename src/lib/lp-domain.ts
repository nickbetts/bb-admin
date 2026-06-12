// URL helpers for landing-page hosting.
//
// Server: reads LP_DOMAIN (no NEXT_PUBLIC_ prefix needed when only used in
// server components / route handlers). Falls back to LP.bettsandburton.com.

const DEFAULT_LP_DOMAIN = "lp.bettsandburton.com";
const DEFAULT_LP_BASE_DOMAIN = "bettsandburton.com";
const FALLBACK_SUBDOMAIN = "demo";

export function getLpDomain(): string {
  return process.env.LP_DOMAIN?.trim() || DEFAULT_LP_DOMAIN;
}

export function getLpBaseDomain(): string {
  return process.env.LP_BASE_DOMAIN?.trim() || DEFAULT_LP_BASE_DOMAIN;
}

/**
 * Sanitise a candidate slug into a DNS-safe subdomain label.
 * - lowercased, alphanumerics + hyphens only
 * - collapses hyphens, trims leading/trailing hyphens
 * - capped at 63 characters (DNS label limit)
 */
export function toSubdomainLabel(input: string | null | undefined): string {
  if (!input) return FALLBACK_SUBDOMAIN;
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  return cleaned || FALLBACK_SUBDOMAIN;
}

export interface LpUrlOpts {
  clientSlug?: string | null;
  customSubdomain?: string | null;
  lpSlug?: string | null;
  publicSlug?: string | null;
  shareToken?: string | null;
  appUrl?: string | null;
  testMode?: boolean;
}

/**
 * Build the canonical public URL for a landing page, preferring (in order):
 *   1. https://<subdomain>.<LP_BASE_DOMAIN>/<lp-slug>  — canonical URL
 *   2. /lp/<publicSlug>                                 — legacy pretty URL
 *   3. /api/share/landing-page/<shareToken>             — internal magic link
 */
export function getLandingPageUrl(opts: LpUrlOpts): string | null {
  const baseDomain = getLpBaseDomain();
  const domain = getLpDomain();
  const sub = opts.customSubdomain
    ? toSubdomainLabel(opts.customSubdomain)
    : opts.clientSlug
      ? toSubdomainLabel(opts.clientSlug)
      : null;
  const qs = opts.testMode ? "?test=1" : "";

  if (opts.lpSlug && sub) {
    return `https://${sub}.${baseDomain}/${opts.lpSlug}${qs}`;
  }
  if (opts.lpSlug) {
    return `https://${domain}/client/${FALLBACK_SUBDOMAIN}/${opts.lpSlug}${qs}`;
  }
  const base = (opts.appUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (opts.publicSlug && base) return `${base}/lp/${opts.publicSlug}${qs}`;
  if (opts.publicSlug) return `/lp/${opts.publicSlug}${qs}`;
  if (opts.shareToken && base) return `${base}/api/share/landing-page/${opts.shareToken}${qs}`;
  if (opts.shareToken) return `/api/share/landing-page/${opts.shareToken}${qs}`;
  return null;
}
