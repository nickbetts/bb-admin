// Shared assembly pipeline for serving published landing pages.
// Used by:
//   • /api/share/landing-page/[token]      — magic-link previews
//   • /lp/[slug]                           — public pretty URL (publicSlug)
//   • /lp/[slug]/[lpSlug]                  — clickr.marketing subdomain serve
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

export interface AssembleOpts {
  shareToken: string | null;
  analytics: LpAnalyticsConfig;
  testMode: boolean;
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
  // We add a small DOM observer that calls __lpFireLead() once the success
  // message ("Thank you!") appears in the form.
  const hasForm = html.includes('data-lp-form="true"');
  if (hasForm && opts.shareToken) {
    bodyEndParts.push(formSuccessHookScript());
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

  // Lucide icons — always injected so the prompt's <i data-lucide=...> tags render
  html = injectLucide(html);

  // Form-capture script (existing behaviour) — injected last so its </body>
  // insertion sits below the conversion script.
  if (hasForm && opts.shareToken) {
    html = injectFormScript(html, opts.shareToken);
  }

  return html;
}

/**
 * Watches the [data-lp-form] form for the success state injected by the
 * existing form-capture script and fires the conversion event once.
 */
function formSuccessHookScript(): string {
  return `<script>
(function(){
  if (!window.MutationObserver) return;
  function attach(){
    var forms = document.querySelectorAll('[data-lp-form="true"]');
    forms.forEach(function(form){
      var fired = false;
      var mo = new MutationObserver(function(){
        if (fired) return;
        if (form.textContent && form.textContent.indexOf('Thank you') !== -1) {
          fired = true;
          if (typeof window.__lpFireLead === 'function') window.__lpFireLead();
        }
      });
      mo.observe(form, { childList: true, subtree: true, characterData: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
</script>`;
}
