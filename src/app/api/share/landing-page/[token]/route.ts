import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { injectFormScript, injectLucide } from "@/lib/lp-generator";
import {
  buildAnalyticsHead,
  buildConversionScript,
  buildGtmNoscript,
  buildTestModeOverlay,
  hasAnyTracking,
  mergeAnalyticsConfig,
  parseAnalyticsConfig,
  type LpAnalyticsConfig,
} from "@/lib/lp-analytics";

export const dynamic = "force-dynamic";

// GET /api/share/landing-page/[token] — public, no auth
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  // ?test=1 → swap real tag loaders for an on-page debug overlay
  const testMode = searchParams.get("test") === "1";

  const landingPage = await prisma.landingPage.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      title: true,
      currentHtml: true,
      shareToken: true,
      status: true,
      formConfig: true,
      analyticsConfig: true,
      client: { select: { defaultAnalyticsConfig: true } },
    },
  });

  if (!landingPage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Track views (fire-and-forget). Skip in test mode so QA doesn't pollute counts.
  if (!testMode) {
    prisma.landingPage
      .update({
        where: { id: landingPage.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      })
      .catch(() => {});
  }

  const analytics = mergeAnalyticsConfig(
    parseAnalyticsConfig(landingPage.client?.defaultAnalyticsConfig),
    parseAnalyticsConfig(landingPage.analyticsConfig),
  );

  const html = assemblePublicHtml(landingPage.currentHtml, {
    shareToken: landingPage.shareToken,
    analytics,
    testMode,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Don't cache test mode (operator QA needs fresh state on every reload)
      "Cache-Control": testMode
        ? "no-store, max-age=0"
        : "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

interface AssembleOpts {
  shareToken: string | null;
  analytics: LpAnalyticsConfig;
  testMode: boolean;
}

/**
 * Inject all runtime additions into the stored HTML in a deterministic order.
 * Doing this in one pass (rather than chained string-replaces) avoids
 * head/body markers being consumed before later helpers can find them.
 */
function assemblePublicHtml(rawHtml: string, opts: AssembleOpts): string {
  let html = rawHtml;
  const headParts: string[] = [];
  const bodyOpenParts: string[] = [];
  const bodyEndParts: string[] = [];

  // Analytics tracking (or test-mode shim must be in <head>, before page scripts)
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
