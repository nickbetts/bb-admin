/**
 * Landing-page analytics & conversion tracking
 *
 * Builds the head/body snippets injected into a published LP so the page
 * fires page-view + conversion events into the configured ad platforms.
 *
 * Providers supported:
 *   - Google Tag Manager (container)
 *   - Google Analytics 4 (gtag.js)         — auto-skipped when GTM is present
 *   - Google Ads conversion (gtag.js)
 *   - Meta Pixel
 *   - LinkedIn Insight Tag
 *   - TikTok Pixel
 *   - Microsoft Advertising UET
 *   - Custom <head> HTML escape hatch
 *
 * Conversion events auto-fired (when enabled):
 *   - Form submit success (fired after the lead row is saved server-side)
 *   - Phone click   (any <a href="tel:...">)
 *   - Email click   (any <a href="mailto:...">)
 *
 * Test mode (?test=1 on the public URL): all third-party loaders are skipped
 * and a floating overlay logs every event that *would* have fired, so you
 * can verify the wiring without polluting real ad accounts.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface LpAnalyticsConfig {
  gtmContainerId?: string;        // GTM-XXXXXX
  ga4MeasurementId?: string;      // G-XXXXXXXXXX
  googleAds?: {
    conversionId: string;         // AW-XXXXXXXXXX
    conversionLabels?: {
      lead?: string;              // "abc123" — appended as AW-xxx/abc123
      phone?: string;
      email?: string;
    };
  };
  metaPixelId?: string;           // 15-16 digits
  linkedInPartnerId?: string;     // numeric partner ID
  linkedInConversionId?: string;  // numeric conversion ID for lintrk track
  tiktokPixelId?: string;
  microsoftUetTagId?: string;
  customHeadHtml?: string;        // free-form trusted HTML (operator only)
  events?: {
    formSubmit?: boolean;         // default true
    phoneClick?: boolean;         // default true
    emailClick?: boolean;         // default true
  };
}

// ── Parse + sanitise ─────────────────────────────────────────────────────────

/** Provider ID validation. Returns null when invalid (silently dropped). */
function clean(id: string | undefined, pattern: RegExp): string | undefined {
  if (!id) return undefined;
  const trimmed = String(id).trim();
  if (!trimmed) return undefined;
  return pattern.test(trimmed) ? trimmed : undefined;
}

/** Parse a (possibly dirty) JSON string into a sanitised LpAnalyticsConfig. */
export function parseAnalyticsConfig(json: string | null | undefined): LpAnalyticsConfig {
  if (!json) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return sanitiseAnalyticsConfig(raw as Record<string, unknown>);
}

/** Strict allow-list sanitiser. Discards anything that fails validation. */
export function sanitiseAnalyticsConfig(input: Record<string, unknown>): LpAnalyticsConfig {
  const out: LpAnalyticsConfig = {};

  out.gtmContainerId = clean(input.gtmContainerId as string | undefined, /^GTM-[A-Z0-9]{4,10}$/i);
  out.ga4MeasurementId = clean(input.ga4MeasurementId as string | undefined, /^G-[A-Z0-9]{6,12}$/i);

  const ga = input.googleAds as Record<string, unknown> | undefined;
  if (ga && typeof ga === "object") {
    const conversionId = clean(ga.conversionId as string | undefined, /^AW-[0-9]{6,16}$/i);
    if (conversionId) {
      const labels = ga.conversionLabels as Record<string, unknown> | undefined;
      const labelOk = (v: unknown) => clean(v as string | undefined, /^[A-Za-z0-9_-]{4,40}$/);
      out.googleAds = {
        conversionId,
        conversionLabels: labels && typeof labels === "object" ? {
          lead: labelOk(labels.lead),
          phone: labelOk(labels.phone),
          email: labelOk(labels.email),
        } : undefined,
      };
    }
  }

  out.metaPixelId = clean(input.metaPixelId as string | undefined, /^[0-9]{8,20}$/);
  out.linkedInPartnerId = clean(input.linkedInPartnerId as string | undefined, /^[0-9]{4,12}$/);
  out.linkedInConversionId = clean(input.linkedInConversionId as string | undefined, /^[0-9]{4,12}$/);
  out.tiktokPixelId = clean(input.tiktokPixelId as string | undefined, /^[A-Z0-9]{15,30}$/i);
  out.microsoftUetTagId = clean(input.microsoftUetTagId as string | undefined, /^[0-9]{4,16}$/);

  const custom = input.customHeadHtml;
  if (typeof custom === "string" && custom.trim().length > 0 && custom.length < 20000) {
    out.customHeadHtml = custom;
  }

  const events = input.events as Record<string, unknown> | undefined;
  if (events && typeof events === "object") {
    out.events = {
      formSubmit: events.formSubmit !== false,
      phoneClick: events.phoneClick !== false,
      emailClick: events.emailClick !== false,
    };
  }

  // Drop empties so the merge below has clean keys
  Object.keys(out).forEach((k) => {
    const v = (out as Record<string, unknown>)[k];
    if (v === undefined) delete (out as Record<string, unknown>)[k];
  });

  return out;
}

/**
 * Merge a per-client default with a per-LP override. Top-level keys present
 * on the override win entirely (no deep-merge of nested provider objects:
 * if a user wants to override Google Ads they must re-supply the full block).
 * `events` is shallow-merged because it's a small flag set.
 */
export function mergeAnalyticsConfig(
  clientDefault: LpAnalyticsConfig | undefined,
  lpOverride: LpAnalyticsConfig | undefined,
): LpAnalyticsConfig {
  const base: LpAnalyticsConfig = { ...(clientDefault ?? {}) };
  const ov = lpOverride ?? {};
  for (const key of Object.keys(ov) as (keyof LpAnalyticsConfig)[]) {
    const value = ov[key];
    if (value === undefined) continue;
    if (key === "events") {
      base.events = { ...(base.events ?? {}), ...(ov.events ?? {}) };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (base as any)[key] = value;
    }
  }
  return base;
}

/** True if at least one tracking provider is configured. */
export function hasAnyTracking(cfg: LpAnalyticsConfig): boolean {
  return Boolean(
    cfg.gtmContainerId ||
      cfg.ga4MeasurementId ||
      cfg.googleAds?.conversionId ||
      cfg.metaPixelId ||
      cfg.linkedInPartnerId ||
      cfg.tiktokPixelId ||
      cfg.microsoftUetTagId ||
      cfg.customHeadHtml,
  );
}

// ── Snippet builders ─────────────────────────────────────────────────────────

/**
 * Returns the snippet for inside <head>. When `testMode` is true, NO third
 * party loaders are emitted — only the test-mode shim that captures any
 * `gtag()`, `fbq()`, `lintrk()`, `ttq.track()`, `uetq.push()`,
 * `dataLayer.push()` calls and forwards them to the on-page debug overlay.
 */
export function buildAnalyticsHead(cfg: LpAnalyticsConfig, opts: { testMode?: boolean } = {}): string {
  if (opts.testMode) return buildTestModeShim(cfg);
  if (!hasAnyTracking(cfg)) return "";

  const parts: string[] = [];

  // GTM should load first so it can govern downstream tags
  if (cfg.gtmContainerId) {
    parts.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${cfg.gtmContainerId}');</script>
<!-- End Google Tag Manager -->`);
  }

  // GA4 (skipped when GTM is configured — GTM is expected to manage GA4)
  const needsGtag = !cfg.gtmContainerId && (cfg.ga4MeasurementId || cfg.googleAds?.conversionId);
  if (needsGtag) {
    const loaderId = cfg.ga4MeasurementId ?? cfg.googleAds?.conversionId;
    const configs: string[] = [];
    if (cfg.ga4MeasurementId) configs.push(`gtag('config', '${cfg.ga4MeasurementId}');`);
    if (cfg.googleAds?.conversionId) configs.push(`gtag('config', '${cfg.googleAds.conversionId}');`);
    parts.push(`<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${loaderId}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${configs.join("\n")}
</script>`);
  }

  if (cfg.metaPixelId) {
    parts.push(`<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${cfg.metaPixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${cfg.metaPixelId}&ev=PageView&noscript=1"/></noscript>`);
  }

  if (cfg.linkedInPartnerId) {
    parts.push(`<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "${cfg.linkedInPartnerId}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>
<noscript><img height="1" width="1" style="display:none;" alt=""
src="https://px.ads.linkedin.com/collect/?pid=${cfg.linkedInPartnerId}&fmt=gif"/></noscript>`);
  }

  if (cfg.tiktokPixelId) {
    parts.push(`<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${cfg.tiktokPixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>`);
  }

  if (cfg.microsoftUetTagId) {
    parts.push(`<!-- Microsoft UET -->
<script>(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${cfg.microsoftUetTagId}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");</script>`);
  }

  // Custom HTML last — operator-trusted free-form
  if (cfg.customHeadHtml) {
    parts.push(`<!-- Custom -->\n${cfg.customHeadHtml}`);
  }

  return parts.join("\n");
}

/** GTM <noscript> iframe — must go immediately after <body>. */
export function buildGtmNoscript(cfg: LpAnalyticsConfig): string {
  if (!cfg.gtmContainerId) return "";
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${cfg.gtmContainerId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
}

/**
 * Body-end script that wires up conversion events:
 *   - patches the form-success handler (window.__lpFormSuccess) so the
 *     existing lead capture script invokes us after a successful POST
 *   - delegated click listeners for tel: / mailto: links
 *   - test-mode-aware: when `testMode` is true, real provider calls are
 *     intercepted by the head shim, so the same code path works.
 */
export function buildConversionScript(cfg: LpAnalyticsConfig): string {
  const ev = {
    formSubmit: cfg.events?.formSubmit !== false,
    phoneClick: cfg.events?.phoneClick !== false,
    emailClick: cfg.events?.emailClick !== false,
  };

  // Per-event firing snippets (concatenated and run inside the page)
  const fireLead = `
    if (window.dataLayer) try { window.dataLayer.push({ event: 'lp_lead_submit' }); } catch(e){}
    if (window.gtag) {
      try { window.gtag('event', 'generate_lead'); } catch(e){}
      ${cfg.googleAds?.conversionId && cfg.googleAds.conversionLabels?.lead
        ? `try { window.gtag('event', 'conversion', { send_to: '${cfg.googleAds.conversionId}/${cfg.googleAds.conversionLabels.lead}' }); } catch(e){}`
        : ""}
    }
    if (window.fbq) try { window.fbq('track', 'Lead'); } catch(e){}
    ${cfg.linkedInConversionId
      ? `if (window.lintrk) try { window.lintrk('track', { conversion_id: ${cfg.linkedInConversionId} }); } catch(e){}`
      : `if (window.lintrk) try { window.lintrk('track'); } catch(e){}`}
    if (window.ttq) try { window.ttq.track('SubmitForm'); } catch(e){}
    if (window.uetq) try { window.uetq.push('event', 'submit_lead_form', {}); } catch(e){}
  `.trim();

  const fireContact = (channel: "phone" | "email") => {
    const gaEvent = channel === "phone" ? "phone_call" : "email_click";
    const adsLabel = cfg.googleAds?.conversionLabels?.[channel];
    return `
      if (window.dataLayer) try { window.dataLayer.push({ event: 'lp_${channel}_click' }); } catch(e){}
      if (window.gtag) {
        try { window.gtag('event', '${gaEvent}'); } catch(e){}
        ${cfg.googleAds?.conversionId && adsLabel
          ? `try { window.gtag('event', 'conversion', { send_to: '${cfg.googleAds.conversionId}/${adsLabel}' }); } catch(e){}`
          : ""}
      }
      if (window.fbq) try { window.fbq('track', 'Contact'); } catch(e){}
      if (window.ttq) try { window.ttq.track('Contact'); } catch(e){}
      if (window.uetq) try { window.uetq.push('event', '${channel}_click', {}); } catch(e){}
    `.trim();
  };

  return `<script>
(function(){
  ${ev.formSubmit ? `window.__lpFireLead = function(){ ${fireLead} };` : ""}
  ${ev.phoneClick ? `
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!a) return;
    ${fireContact("phone")}
  }, true);` : ""}
  ${ev.emailClick ? `
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    ${fireContact("email")}
  }, true);` : ""}
})();
</script>`;
}

// ── Test-mode shim + overlay ─────────────────────────────────────────────────

/**
 * Replaces all real provider loaders with stubs that log calls to a floating
 * on-page overlay. Activated by `?test=1`. Lets the agency QA conversion
 * wiring without firing real events.
 */
function buildTestModeShim(cfg: LpAnalyticsConfig): string {
  const configured: string[] = [];
  if (cfg.gtmContainerId) configured.push(`GTM (${cfg.gtmContainerId})`);
  if (cfg.ga4MeasurementId) configured.push(`GA4 (${cfg.ga4MeasurementId})`);
  if (cfg.googleAds?.conversionId) configured.push(`Google Ads (${cfg.googleAds.conversionId})`);
  if (cfg.metaPixelId) configured.push(`Meta Pixel (${cfg.metaPixelId})`);
  if (cfg.linkedInPartnerId) configured.push(`LinkedIn (${cfg.linkedInPartnerId})`);
  if (cfg.tiktokPixelId) configured.push(`TikTok (${cfg.tiktokPixelId})`);
  if (cfg.microsoftUetTagId) configured.push(`Microsoft UET (${cfg.microsoftUetTagId})`);
  if (cfg.customHeadHtml) configured.push("Custom HTML");

  const summary = configured.length > 0 ? configured.join(", ") : "no providers configured";
  void summary; // shown in the overlay via __lpTestConfig
  const json = JSON.stringify({ providers: configured, events: cfg.events ?? null });

  return `<!-- LP Test Mode — third-party loaders disabled, calls captured -->
<script>
(function(){
  var w = window;
  var log = w.__lpTestEvents = [];
  function record(provider, method, args){
    var entry = { t: Date.now(), provider: provider, method: method, args: Array.prototype.slice.call(args) };
    log.push(entry);
    if (w.__lpTestRender) w.__lpTestRender(entry);
    try { console.info('[LP test]', provider + '.' + method, entry.args); } catch(e){}
  }
  // dataLayer / gtag (Google: GA4, Ads, GTM)
  w.dataLayer = w.dataLayer || [];
  var origPush = w.dataLayer.push.bind(w.dataLayer);
  w.dataLayer.push = function(){ record('dataLayer', 'push', arguments); return origPush.apply(null, arguments); };
  w.gtag = function(){ record('gtag', String(arguments[0] || 'call'), arguments); };
  // Meta Pixel
  w.fbq = function(){ record('fbq', String(arguments[0] || 'call'), arguments); };
  w.fbq.queue = []; w.fbq.loaded = true; w.fbq.version = '2.0';
  // LinkedIn
  w.lintrk = function(){ record('lintrk', String(arguments[0] || 'call'), arguments); };
  w.lintrk.q = [];
  // TikTok
  var ttqMethods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','load'];
  w.ttq = {}; ttqMethods.forEach(function(m){ w.ttq[m] = function(){ record('ttq', m, arguments); }; });
  // Microsoft UET
  w.uetq = []; var origUetq = w.uetq.push.bind(w.uetq);
  w.uetq.push = function(){ record('uetq', 'push', arguments); return origUetq.apply(null, arguments); };
  // Stash config for the overlay
  w.__lpTestConfig = ${json};
})();
</script>`;
}

/** The visible debug overlay rendered at the bottom-right of the test-mode page. */
export function buildTestModeOverlay(): string {
  return `<style id="lp-test-overlay-style">
#lp-test-overlay { position: fixed; bottom: 16px; right: 16px; width: 360px; max-height: 60vh; z-index: 2147483647;
  background: #0b1220; color: #e5e7eb; border: 1px solid #1f2937; border-radius: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; box-shadow: 0 16px 48px rgba(0,0,0,.4);
  display: flex; flex-direction: column; overflow: hidden; }
#lp-test-overlay .lp-test-h { padding: 10px 12px; background: #111827; border-bottom: 1px solid #1f2937;
  display: flex; align-items: center; justify-content: space-between; gap: 8px; }
#lp-test-overlay .lp-test-h strong { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: #93c5fd; }
#lp-test-overlay .lp-test-h button { background: transparent; border: 1px solid #374151; color: #9ca3af; cursor: pointer;
  border-radius: 6px; padding: 2px 8px; font-size: 11px; }
#lp-test-overlay .lp-test-cfg { padding: 8px 12px; color: #9ca3af; border-bottom: 1px solid #1f2937; line-height: 1.4; }
#lp-test-overlay .lp-test-cfg b { color: #e5e7eb; }
#lp-test-overlay .lp-test-list { flex: 1; overflow-y: auto; padding: 4px 0; }
#lp-test-overlay .lp-test-empty { padding: 16px 12px; color: #6b7280; text-align: center; }
#lp-test-overlay .lp-test-row { padding: 8px 12px; border-bottom: 1px dashed #1f2937; }
#lp-test-overlay .lp-test-row:last-child { border-bottom: none; }
#lp-test-overlay .lp-test-row .p { color: #34d399; }
#lp-test-overlay .lp-test-row .m { color: #fbbf24; }
#lp-test-overlay .lp-test-row pre { margin: 4px 0 0; white-space: pre-wrap; word-break: break-word;
  color: #d1d5db; font-size: 11px; max-height: 90px; overflow: auto; }
#lp-test-overlay.lp-test-min .lp-test-cfg, #lp-test-overlay.lp-test-min .lp-test-list { display: none; }
#lp-test-fire { position: fixed; bottom: 16px; left: 16px; z-index: 2147483647;
  background: #0b1220; color: #e5e7eb; border: 1px solid #1f2937; border-radius: 10px; padding: 8px;
  font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; display: flex; gap: 6px; flex-wrap: wrap; max-width: 320px;
  box-shadow: 0 16px 48px rgba(0,0,0,.4); }
#lp-test-fire button { background: #1f2937; color: #e5e7eb; border: 1px solid #374151;
  border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 11px; }
#lp-test-fire button:hover { background: #374151; }
#lp-test-fire .lp-test-fire-label { width: 100%; color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
</style>
<script>
(function(){
  function escape(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  function build(){
    var cfg = window.__lpTestConfig || {};
    var providers = (cfg.providers || []).join(', ') || 'none';
    var events = cfg.events ? Object.keys(cfg.events).filter(function(k){return cfg.events[k] !== false;}).join(', ') : 'form, phone, email';
    var root = document.createElement('div');
    root.id = 'lp-test-overlay';
    root.innerHTML = ''
      + '<div class="lp-test-h"><strong>LP test mode</strong>'
      +   '<div><button id="lp-test-clear">Clear</button> '
      +   '<button id="lp-test-min">_</button> '
      +   '<button id="lp-test-close">×</button></div></div>'
      + '<div class="lp-test-cfg"><b>Providers:</b> ' + escape(providers)
      +   '<br/><b>Events:</b> ' + escape(events || 'none')
      +   '<br/><b>Tip:</b> use the buttons (bottom-left) or click any tel:/mailto: link or submit a form.</div>'
      + '<div class="lp-test-list"><div class="lp-test-empty">No events yet — interact with the page.</div></div>';
    document.body.appendChild(root);

    var fire = document.createElement('div');
    fire.id = 'lp-test-fire';
    fire.innerHTML = ''
      + '<div class="lp-test-fire-label">Simulate conversion</div>'
      + '<button data-fire="lead">Form submit</button>'
      + '<button data-fire="phone">Phone click</button>'
      + '<button data-fire="email">Email click</button>';
    document.body.appendChild(fire);

    var list = root.querySelector('.lp-test-list');
    function clearList(){ list.innerHTML = '<div class="lp-test-empty">No events yet — interact with the page.</div>'; }
    function render(entry){
      var empty = list.querySelector('.lp-test-empty');
      if (empty) empty.remove();
      var row = document.createElement('div');
      row.className = 'lp-test-row';
      row.innerHTML = '<span class="p">' + escape(entry.provider) + '</span>.<span class="m">' + escape(entry.method) + '</span>'
        + '<pre>' + escape(JSON.stringify(entry.args, null, 0)) + '</pre>';
      list.insertBefore(row, list.firstChild);
    }
    window.__lpTestRender = render;
    (window.__lpTestEvents || []).forEach(render);

    document.getElementById('lp-test-clear').onclick = function(){ window.__lpTestEvents = []; clearList(); };
    document.getElementById('lp-test-min').onclick = function(){ root.classList.toggle('lp-test-min'); };
    document.getElementById('lp-test-close').onclick = function(){ root.remove(); fire.remove(); };
    fire.addEventListener('click', function(e){
      var btn = e.target && e.target.getAttribute && e.target.getAttribute('data-fire');
      if (btn === 'lead' && window.__lpFireLead) window.__lpFireLead();
      else if (btn === 'phone') {
        var phoneA = document.createElement('a'); phoneA.href = 'tel:+test'; phoneA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      else if (btn === 'email') {
        var emailA = document.createElement('a'); emailA.href = 'mailto:test@example.com'; emailA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
</script>`;
}
