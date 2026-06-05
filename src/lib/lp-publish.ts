// Shared assembly pipeline for serving published landing pages.
// Used by:
//   • /api/share/landing-page/[token]      — magic-link previews
//   • /lp/[slug]                           — public pretty URL (publicSlug)
//   • /lp/[slug]/[lpSlug]                  — lp.bettsandburton.com subdomain serve
//
// Centralising this guarantees analytics, conversion firing, test mode
// (?test=1) and Lucide icon rendering all behave identically regardless of
// which surface is hit.

import { injectFormScript, injectLucide } from "@/lib/lp-generator";
import {
  buildAnalyticsHead,
  buildConversionScript,
  buildGtmNoscript,
  buildTestModeOverlay,
  hasAnyTracking,
  type LpAnalyticsConfig,
} from "@/lib/lp-analytics";
import { applyConfiguredFormFields } from "@/lib/lp-form-fields-html";
import type { LpFormConfig } from "@/lib/lp-form-config";

export interface AssembleOpts {
  shareToken: string | null;
  analytics: LpAnalyticsConfig;
  testMode: boolean;
  /** When set, may replace the built-in form with an embed code */
  formConfig?: LpFormConfig;
  /** Cloudflare Turnstile site key — when set, injects the widget into LP forms */
  turnstileSiteKey?: string | null;
}

/**
 * Inject all runtime additions into the stored HTML in a deterministic order.
 * Doing this in one pass (rather than chained string-replaces) avoids
 * head/body markers being consumed before later helpers can find them.
 */
export function assemblePublicHtml(rawHtml: string, opts: AssembleOpts): string {
  let html = rawHtml;
  const headParts: string[] = [];
  const bodyOpenParts: string[] = [];
  const bodyEndParts: string[] = [];

  // Analytics tracking (or test-mode shim) must be in <head>, before page scripts
  if (opts.testMode || hasAnyTracking(opts.analytics)) {
    headParts.push(buildAnalyticsHead(opts.analytics, { testMode: opts.testMode }));
    if (!opts.testMode) {
      const noscript = buildGtmNoscript(opts.analytics);
      if (noscript) bodyOpenParts.push(noscript);
    }
    // Conversion wiring depends on the global `__lpFireLead` it defines —
    // inject it once at end of body.
    bodyEndParts.push(buildConversionScript(opts.analytics));
    if (opts.testMode) bodyEndParts.push(buildTestModeOverlay());
  }

  // Form capture — must run AFTER buildConversionScript so __lpFireLead exists.
  // The form script intercepts submit, shows "Thank you", fires __lpFireLead(),
  // and (when shareToken is set) POSTs the lead to the API.
  const embedCode = opts.formConfig?.embedCode?.trim();
  if (!embedCode && opts.formConfig?.fields?.length) {
    html = applyConfiguredFormFields(html, opts.formConfig.fields);
  }
  // Detect built-in forms: prefer data-lp-form="true" (new), fall back to any
  // <form> tag for LPs generated before the attribute was required.
  const hasBuiltInForm =
    !embedCode && (html.includes('data-lp-form="true"') || /<form[\s>]/i.test(html));
  const turnstileSiteKey = opts.turnstileSiteKey || null;
  if (hasBuiltInForm) {
    // Inject Turnstile loader when a site key is configured
    if (turnstileSiteKey) {
      headParts.push(
        `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`,
      );
    }
  }

  // Apply head injections
  if (headParts.length > 0) {
    const headSnippet = headParts.join("\n");
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${headSnippet}\n</head>`);
    } else {
      html = headSnippet + html;
    }
  }

  // Apply <body> opener injections (GTM noscript)
  if (bodyOpenParts.length > 0) {
    const bodyOpenSnippet = bodyOpenParts.join("\n");
    const bodyOpenMatch = html.match(/<body[^>]*>/i);
    if (bodyOpenMatch) {
      html = html.replace(bodyOpenMatch[0], `${bodyOpenMatch[0]}\n${bodyOpenSnippet}`);
    }
  }

  // Apply </body> injections
  if (bodyEndParts.length > 0) {
    const bodyEndSnippet = bodyEndParts.join("\n");
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${bodyEndSnippet}\n</body>`);
    } else {
      html += bodyEndSnippet;
    }
  }

  // Replace built-in form with embed code when provided
  if (embedCode) {
    // Match <form data-lp-form="true" ...>...</form> (including multiline content)
    html = html.replace(/<form[^>]*data-lp-form="true"[^>]*>[\s\S]*?<\/form>/i, embedCode);
  }

  // Lucide icons — always injected so the prompt's <i data-lucide=...> tags render
  html = injectLucide(html);

  // Form-capture script — always injected for built-in forms so submit is
  // intercepted (preventing native navigation), success shown, and conversion
  // event fired. Lead storage to API only happens when shareToken is set.
  if (hasBuiltInForm) {
    html = injectFormScript(html, opts.shareToken, turnstileSiteKey ?? undefined);
  }

  return html;
}
