/**
 * Type definitions and helpers for LandingPage.formConfig JSON column.
 *
 * formConfig is stored as a JSON string on LandingPage.  It controls:
 *   - where lead notification emails go
 *   - an optional outbound webhook that receives every lead as a JSON POST
 *   - an optional embed code (iframe / script tag) that replaces the
 *     AI-generated built-in form entirely (e.g. a JotForm or Typeform embed)
 */

export interface LpFormConfig {
  /** One or more email addresses to notify when a lead is captured */
  notifyEmails?: string[];
  /**
   * HTTPS URL that receives a POST request for every new lead.
   * Payload: { name, email, phone?, message?, formData?, landingPageId, capturedAt }
   * Must be https:// and must not resolve to a private/loopback address.
   */
  webhookUrl?: string;
  /**
   * Raw HTML (e.g. a JotForm <iframe> or a Typeform script/div block).
   * When set, the AI-generated <form data-lp-form="true"> element is replaced
   * with this code in the served HTML, and the built-in form-capture script
   * is NOT injected.  Leads will NOT be stored in Stratos — the third-party
   * form provider handles capture entirely.
   */
  embedCode?: string;
}

export function parseLpFormConfig(raw: string | null | undefined): LpFormConfig {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LpFormConfig;
  } catch {
    return {};
  }
}

export function serialiseLpFormConfig(cfg: LpFormConfig): string {
  return JSON.stringify(cfg);
}

/**
 * Validate a webhook URL before firing it.
 * Rejects non-HTTPS URLs and known RFC-1918 / loopback hostnames to
 * prevent server-side request forgery (SSRF).
 */
export function isWebhookUrlSafe(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();

  // Block loopback
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;

  // Block RFC-1918 private ranges via simple prefix checks
  if (host.startsWith("10.")) return false;
  if (host.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

  // Block link-local
  if (host.startsWith("169.254.")) return false;

  return true;
}
