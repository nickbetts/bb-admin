export type ChecklistType = "website" | "google_ads" | "meta_ads";

export const CHECKLIST_TYPES: { id: ChecklistType; label: string; description: string }[] = [
  { id: "website",    label: "Website Launch",      description: "Pre-launch QA for a new or redesigned website" },
  { id: "google_ads", label: "Google Ads Campaign", description: "Pre-launch QA for a Google Ads campaign" },
  { id: "meta_ads",   label: "Meta Ads Campaign",   description: "Pre-launch QA for a Facebook / Instagram campaign" },
];

export interface CheckItem {
  id: string;
  label: string;
}

export interface CheckCategory {
  id: string;
  label: string;
  items: CheckItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBSITE LAUNCH
// ─────────────────────────────────────────────────────────────────────────────

export const WEBSITE_MARKETING: CheckCategory[] = [
  {
    id: "web_mk_content",
    label: "Content & Copy",
    items: [
      { id: "web_mk_c1",  label: "All copy has been proofread — no spelling or grammar errors" },
      { id: "web_mk_c2",  label: "All CTAs are clear, compelling, and linking correctly" },
      { id: "web_mk_c3",  label: "Copy is consistent with brand voice and tone guidelines" },
      { id: "web_mk_c4",  label: "Contact details (phone, email, address) are accurate" },
      { id: "web_mk_c5",  label: "Legal/compliance copy in place — privacy policy, T&Cs, cookie banner" },
      { id: "web_mk_c6",  label: "No placeholder or lorem ipsum text remains anywhere on the site" },
      { id: "web_mk_c7",  label: "All dates, offers, and time-sensitive content are current" },
      { id: "web_mk_c8",  label: "Every blog post and landing page has ≥3 contextual internal links" },
      { id: "web_mk_c9",  label: "Blog posts have a clear author name and publish/updated date" },
      { id: "web_mk_c10", label: "Page heading hierarchy is logical (H1 → H2 → H3 — no skipping levels)" },
      { id: "web_mk_c11", label: "Footer contains essential links (privacy, contact, sitemap)" },
      { id: "web_mk_c12", label: "All videos have subtitles or transcripts" },
    ],
  },
  {
    id: "web_mk_seo",
    label: "SEO",
    items: [
      { id: "web_mk_s1",  label: "All pages have unique, keyword-rich title tags (50–60 chars)" },
      { id: "web_mk_s2",  label: "All pages have unique meta descriptions (140–160 chars)" },
      { id: "web_mk_s3",  label: "Each page has exactly one H1 containing the primary keyword" },
      { id: "web_mk_s4",  label: "All images have descriptive alt text (not just file names)" },
      { id: "web_mk_s5",  label: "URL slugs are lowercase, hyphenated, and keyword-relevant" },
      { id: "web_mk_s6",  label: "Every blog post and landing page has ≥3 contextual internal links" },
      { id: "web_mk_s7",  label: "External links open in new tab with rel=\"noopener noreferrer\"" },
      { id: "web_mk_s8",  label: "Google Analytics 4 installed and tracking verified in real-time view" },
      { id: "web_mk_s9",  label: "Google Search Console connected and sitemap.xml submitted" },
      { id: "web_mk_s10", label: "robots.txt is accessible and not blocking indexable pages" },
      { id: "web_mk_s11", label: "Relevant schema markup implemented and validated in Rich Results Test" },
      { id: "web_mk_s12", label: "Canonical tags set correctly on all key pages" },
      { id: "web_mk_s13", label: "Breadcrumb navigation present on inner pages" },
      { id: "web_mk_s14", label: "XML sitemap includes all key pages and excludes thin/noindex content" },
      { id: "web_mk_s15", label: "No duplicate content issues detected (identical or near-duplicate pages)" },
    ],
  },
  {
    id: "web_mk_tracking",
    label: "Tracking & Analytics",
    items: [
      { id: "web_mk_t1",  label: "Meta Pixel installed and firing correctly (verified with Pixel Helper)" },
      { id: "web_mk_t2",  label: "Open Graph tags set on all key pages (og:title, og:description, og:image)" },
      { id: "web_mk_t3",  label: "Social sharing images sized correctly (1200×630px) and not cropped badly" },
      { id: "web_mk_t4",  label: "Twitter/X Card tags set (twitter:card, twitter:title, twitter:image)" },
      { id: "web_mk_t5",  label: "LinkedIn Insight Tag installed (if LinkedIn ads planned)" },
      { id: "web_mk_t6",  label: "TikTok Pixel installed (if TikTok ads planned)" },
      { id: "web_mk_t7",  label: "Conversion events firing: form submits, purchases, phone clicks, chat opens" },
      { id: "web_mk_t8",  label: "Google Tag Manager container installed and published with correct version" },
      { id: "web_mk_t9",  label: "Cookie consent properly integrated — tracking blocked until user accepts" },
    ],
  },
  {
    id: "web_mk_ux",
    label: "UX & Design",
    items: [
      { id: "web_mk_u1",  label: "Site is fully responsive and tested on actual mobile and tablet devices" },
      { id: "web_mk_u2",  label: "Font sizes are legible (body ≥16px) with comfortable line heights" },
      { id: "web_mk_u3",  label: "Colour contrast meets WCAG AA — 4.5:1 for normal text, 3:1 for large" },
      { id: "web_mk_u4",  label: "Buttons have visible hover, focus, and active states" },
      { id: "web_mk_u5",  label: "Forms have clear validation messages and confirmation/thank-you states" },
      { id: "web_mk_u6",  label: "A branded 404 page is in place with helpful navigation" },
      { id: "web_mk_u7",  label: "Favicon is set correctly across browsers and devices (inc. Apple touch icon)" },
      { id: "web_mk_u8",  label: "All widgets are properly implemented and functional (chat, reviews, booking, maps, price calculators, etc.)" },
      { id: "web_mk_u9",  label: "Social proof is present above the fold (testimonials, star ratings, case studies, logos)" },
      { id: "web_mk_u10", label: "Trust signals are visible (certifications, awards, accreditations, guarantees, security badges)" },
      { id: "web_mk_u11", label: "Navigation is intuitive, consistent across pages, and fully functional on mobile" },
      { id: "web_mk_u12", label: "All images are high quality — not stretched, pixelated, or incorrectly cropped" },
      { id: "web_mk_u13", label: "Site is keyboard-navigable (tab through menus, forms, and modals)" },
      { id: "web_mk_u14", label: "Page load gives immediate visual feedback (skeleton screens, spinners, or instant render)" },
    ],
  },
];

export const WEBSITE_DEV: CheckCategory[] = [
  {
    id: "web_dv_performance",
    label: "Performance",
    items: [
      { id: "web_dv_p1",  label: "Core Web Vitals pass: LCP <2.5s, INP <200ms, CLS <0.1 (field data or lab)" },
      { id: "web_dv_p2",  label: "Google PageSpeed Insights score ≥80 on mobile" },
      { id: "web_dv_p3",  label: "Images served in WebP or AVIF format and sized correctly for display dimensions" },
      { id: "web_dv_p4",  label: "Web fonts use font-display: swap and are preconnected or self-hosted" },
      { id: "web_dv_p5",  label: "Offscreen images and iframes use lazy loading" },
      { id: "web_dv_p6",  label: "Unused CSS and JS removed or code-split (bundle analyser reviewed)" },
      { id: "web_dv_p7",  label: "Third-party scripts loaded asynchronously (async or defer attributes)" },
      { id: "web_dv_p8",  label: "Server response time <200ms (TTFB — check in PageSpeed or GTmetrix)" },
      { id: "web_dv_p9",  label: "Gzip or Brotli compression enabled on the server" },
      { id: "web_dv_p10", label: "Browser caching headers (Cache-Control) set correctly on static assets" },
    ],
  },
  {
    id: "web_dv_tech_seo",
    label: "Technical SEO",
    items: [
      { id: "web_dv_ts1", label: "sitemap.xml is accessible at /sitemap.xml and includes only indexable URLs" },
      { id: "web_dv_ts2", label: "robots.txt is accessible at /robots.txt and not blocking important paths" },
      { id: "web_dv_ts3", label: "HTTPS enforced with a valid SSL certificate (no mixed-content warnings)" },
      { id: "web_dv_ts4", label: "All 301 redirects from old URLs are in place and returning 301 (not 302)" },
      { id: "web_dv_ts5", label: "Canonical tags are consistent with sitemap entries — no self-referential issues" },
      { id: "web_dv_ts6", label: "No staging/dev noindex tags accidentally present on production pages" },
      { id: "web_dv_ts7", label: "No broken internal links (verified with screaming frog or equivalent)" },
      { id: "web_dv_ts8", label: "Structured data validated in Google Rich Results Test — no errors" },
      { id: "web_dv_ts9", label: "hreflang tags correctly implemented (if multilingual/multiregional)" },
    ],
  },
  {
    id: "web_dv_security",
    label: "Security",
    items: [
      { id: "web_dv_sec1", label: "HTTP redirects to HTTPS and HSTS header is enabled" },
      { id: "web_dv_sec2", label: "No API keys or secrets exposed in client-side code, HTML source, or git history" },
      { id: "web_dv_sec3", label: "HTTP security headers set: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy" },
      { id: "web_dv_sec4", label: "Forms have spam protection (honeypot, reCAPTCHA, or Cloudflare Turnstile)" },
      { id: "web_dv_sec5", label: "Admin area requires strong authentication (2FA/MFA where possible)" },
      { id: "web_dv_sec6", label: "No critical vulnerabilities in dependencies (npm audit / composer audit)" },
      { id: "web_dv_sec7", label: "File upload validation in place — type checking, size limits, virus scanning (if applicable)" },
      { id: "web_dv_sec8", label: "CORS policy is correct — no wildcard * on sensitive API endpoints" },
    ],
  },
  {
    id: "web_dv_functionality",
    label: "Functionality",
    items: [
      { id: "web_dv_f1", label: "All forms submit successfully and trigger correct email notifications" },
      { id: "web_dv_f2", label: "All CTA and navigation links tested — zero broken links" },
      { id: "web_dv_f3", label: "Browser console has no errors or warnings on any key page" },
      { id: "web_dv_f4", label: "All third-party integrations using live (not test/sandbox) API keys" },
      { id: "web_dv_f5", label: "E-commerce checkout tested end-to-end including payment (test and real transaction)" },
      { id: "web_dv_f6", label: "Missing pages return genuine 404 HTTP status code (not 200 with error content)" },
      { id: "web_dv_f7", label: "Site search is functional and returning relevant results (if applicable)" },
      { id: "web_dv_f8", label: "All third-party integrations tested: CRM sync, email automation, booking, chat, etc." },
    ],
  },
  {
    id: "web_dv_hosting",
    label: "Hosting & Deployment",
    items: [
      { id: "web_dv_h1", label: "DNS records correctly configured and fully propagated (A, CNAME, MX)" },
      { id: "web_dv_h2", label: "SSL certificate is set to auto-renew before expiry" },
      { id: "web_dv_h3", label: "All environment variables (API keys, secrets) set correctly in production" },
      { id: "web_dv_h4", label: "Uptime monitoring and error tracking (Sentry or equivalent) active" },
      { id: "web_dv_h5", label: "Automated backups configured and tested (restore tested at least once)" },
      { id: "web_dv_h6", label: "CDN/caching rules configured and edge cache cleared post-deploy" },
      { id: "web_dv_h7", label: "Staging environment is separate from production and not publicly indexed" },
      { id: "web_dv_h8", label: "Rollback procedure is documented and can be executed quickly if needed" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE ADS CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────

export const GOOGLE_ADS_MARKETING: CheckCategory[] = [
  {
    id: "gads_mk_structure",
    label: "Campaign Structure",
    items: [
      { id: "gads_mk_st1",  label: "Campaign naming convention is consistent and descriptive (brand/non-brand, location, match type)" },
      { id: "gads_mk_st2",  label: "Ad groups are tightly themed — one intent/theme per group" },
      { id: "gads_mk_st3",  label: "Keywords organised by match type with appropriate coverage (exact, phrase, broad)" },
      { id: "gads_mk_st4",  label: "Comprehensive negative keyword list applied at campaign and ad group level" },
      { id: "gads_mk_st5",  label: "Campaign budget is appropriate for volume targets and not too low to exit learning" },
      { id: "gads_mk_st6",  label: "Bidding strategy aligned with campaign objective (tCPA, tROAS, Max Conversions, etc.)" },
      { id: "gads_mk_st7",  label: "Ad schedule reviewed and configured (if 24/7 is not the intention)" },
      { id: "gads_mk_st8",  label: "Location targeting correctly configured — includes and excludes verified" },
      { id: "gads_mk_st9",  label: "Language targeting set correctly" },
      { id: "gads_mk_st10", label: "Audience segments added as observation as a minimum; layering applied where data exists" },
      { id: "gads_mk_st11", label: "Device bid adjustments reviewed and applied where data supports" },
      { id: "gads_mk_st12", label: "Search partners and Display Network inclusion reviewed and set intentionally" },
    ],
  },
  {
    id: "gads_mk_copy",
    label: "Ad Copy",
    items: [
      { id: "gads_mk_cp1",  label: "All responsive search ads have ≥10 unique headlines and ≥4 unique descriptions" },
      { id: "gads_mk_cp2",  label: "At least one headline includes the primary keyword for each ad group" },
      { id: "gads_mk_cp3",  label: "At least one headline pinned to position 1 with brand name or core USP" },
      { id: "gads_mk_cp4",  label: "Dynamic keyword insertion used appropriately — fallback text is set and tested" },
      { id: "gads_mk_cp5",  label: "All copy is within Google's character limits (headline 30, description 90)" },
      { id: "gads_mk_cp6",  label: "Ad copy proofread — no grammar, spelling, or capitalisation errors" },
      { id: "gads_mk_cp7",  label: "Every ad includes a clear, specific CTA (Get a Quote, Book a Demo, Shop Now, etc.)" },
      { id: "gads_mk_cp8",  label: "Ad copy is different across ad groups — not copied verbatim" },
      { id: "gads_mk_cp9",  label: "Ad strength is 'Good' or 'Excellent' on all RSAs — improve if 'Poor'" },
      { id: "gads_mk_cp10", label: "Display URL paths are keyword-relevant and readable" },
      { id: "gads_mk_cp11", label: "Price, promotions, phone numbers not used in headline text (use assets instead)" },
    ],
  },
  {
    id: "gads_mk_assets",
    label: "Assets (Extensions)",
    items: [
      { id: "gads_mk_as1", label: "≥4 sitelink assets added with unique titles and 2-line descriptions" },
      { id: "gads_mk_as2", label: "≥4 callout assets highlighting key USPs (e.g. Free Delivery, 5-Star Rated)" },
      { id: "gads_mk_as3", label: "Structured snippet assets added with the most relevant header type" },
      { id: "gads_mk_as4", label: "Call asset added with correct number and call reporting enabled (if applicable)" },
      { id: "gads_mk_as5", label: "Location asset linked to verified Google Business Profile (if applicable)" },
      { id: "gads_mk_as6", label: "Price assets added for key products or service tiers (if applicable)" },
      { id: "gads_mk_as7", label: "Promotion asset added for any active offers (if applicable)" },
      { id: "gads_mk_as8", label: "Image assets uploaded (1.91:1 and 1:1) for responsive display or PMax (if applicable)" },
      { id: "gads_mk_as9", label: "Lead form asset considered and implemented for high-intent campaigns (if applicable)" },
    ],
  },
  {
    id: "gads_mk_landing_pages",
    label: "Landing Pages",
    items: [
      { id: "gads_mk_lp1", label: "Landing page headline and copy match the ad's primary message (message match)" },
      { id: "gads_mk_lp2", label: "Landing page has a single, prominent CTA — no competing goals" },
      { id: "gads_mk_lp3", label: "Landing page has ≥3 contextual internal links to relevant pages" },
      { id: "gads_mk_lp4", label: "Landing page Google PageSpeed score ≥80 on mobile" },
      { id: "gads_mk_lp5", label: "Trust signals are visible — reviews, star ratings, certifications, guarantees" },
      { id: "gads_mk_lp6", label: "Lead form / primary action is visible above the fold on mobile" },
      { id: "gads_mk_lp7", label: "Phone number is prominent and click-to-call enabled on mobile (if call-focused)" },
      { id: "gads_mk_lp8", label: "Navigation removed or minimal on standalone landing pages to reduce exit leakage" },
      { id: "gads_mk_lp9", label: "Landing page tested on actual mobile device — not just emulator" },
    ],
  },
  {
    id: "gads_mk_tracking",
    label: "Goals & Tracking",
    items: [
      { id: "gads_mk_tr1", label: "Google Ads conversion tracking installed and verified in Tag Assistant" },
      { id: "gads_mk_tr2", label: "All key actions tracked: form submit, purchase, phone call, chat open, scroll depth" },
      { id: "gads_mk_tr3", label: "GA4 conversions imported into Google Ads OR native Google Ads tags are live" },
      { id: "gads_mk_tr4", label: "Primary conversion set correctly — bidding-only conversions clearly identified" },
      { id: "gads_mk_tr5", label: "Micro-conversions (e.g. PDF download, scroll) set as secondary — not used for bidding" },
      { id: "gads_mk_tr6", label: "Auto-tagging is enabled on the Google Ads account" },
      { id: "gads_mk_tr7", label: "Google Click ID (gclid) persisting to CRM or form hidden field (if applicable)" },
      { id: "gads_mk_tr8", label: "Attribution model reviewed and set — Data-driven preferred where conversion volume allows" },
      { id: "gads_mk_tr9", label: "Conversion window set to match typical sales cycle length" },
    ],
  },
];

export const GOOGLE_ADS_DEV: CheckCategory[] = [
  {
    id: "gads_dv_tracking",
    label: "Tracking Implementation",
    items: [
      { id: "gads_dv_t1",  label: "Google Ads tag (gtag.js or GTM) installed on all pages of the site" },
      { id: "gads_dv_t2",  label: "Conversion event fires on the thank-you / confirmation page only — not on every page" },
      { id: "gads_dv_t3",  label: "No duplicate conversion tracking (single method — either gtag or GTM, not both)" },
      { id: "gads_dv_t4",  label: "Dynamic conversion values passing correctly — value, currency, transaction_id (e-commerce)" },
      { id: "gads_dv_t5",  label: "Google Click ID (gclid) captured in a CRM or form hidden field" },
      { id: "gads_dv_t6",  label: "Phone call tracking number is active, forwarding correctly, and call reporting enabled" },
      { id: "gads_dv_t7",  label: "All tags verified in Google Tag Assistant — no errors or warnings" },
      { id: "gads_dv_t8",  label: "GTM container published with the correct version — no draft changes sitting unpublished" },
      { id: "gads_dv_t9",  label: "Enhanced conversions configured and customer data quality verified (if applicable)" },
      { id: "gads_dv_t10", label: "Remarketing tag firing on all pages — audience lists are building" },
      { id: "gads_dv_t11", label: "Customer match list uploaded (if applicable)" },
    ],
  },
  {
    id: "gads_dv_technical",
    label: "Technical",
    items: [
      { id: "gads_dv_te1", label: "Landing page passes Core Web Vitals (LCP, INP, CLS)" },
      { id: "gads_dv_te2", label: "Landing page loads under 3s on mobile (GTmetrix or PageSpeed verified)" },
      { id: "gads_dv_te3", label: "No JavaScript errors on the landing page" },
      { id: "gads_dv_te4", label: "Form tracking fires on successful submission only — not on page load or failed submit" },
      { id: "gads_dv_te5", label: "UTM parameters passing correctly through to GA4 sessions and CRM contact records" },
      { id: "gads_dv_te6", label: "URL final redirects verified — ad destination URL resolves to the correct live page" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// META ADS CAMPAIGN
// ─────────────────────────────────────────────────────────────────────────────

export const META_ADS_MARKETING: CheckCategory[] = [
  {
    id: "meta_mk_campaign",
    label: "Campaign Setup",
    items: [
      { id: "meta_mk_cm1", label: "Campaign objective correctly matches the business goal (Sales, Leads, Traffic, Awareness, Engagement)" },
      { id: "meta_mk_cm2", label: "Campaign naming convention is descriptive and consistent across the account" },
      { id: "meta_mk_cm3", label: "Budget type (CBO or ABO) and amount is appropriate and sufficient to exit the learning phase" },
      { id: "meta_mk_cm4", label: "Ad scheduling configured correctly (if not running 24/7)" },
      { id: "meta_mk_cm5", label: "A/B test is set up to test one variable at a time (if applicable)" },
      { id: "meta_mk_cm6", label: "Campaign is live in the correct Meta Business Manager ad account (not a personal account)" },
      { id: "meta_mk_cm7", label: "Advantage+ campaign settings reviewed — not blindly enabled without strategic intent" },
      { id: "meta_mk_cm8", label: "Attribution setting reviewed and set (7-day click / 1-day view is standard)" },
    ],
  },
  {
    id: "meta_mk_audience",
    label: "Audience",
    items: [
      { id: "meta_mk_au1", label: "Core audience targeting is refined and audience size is appropriate for budget (not too broad)" },
      { id: "meta_mk_au2", label: "Lookalike audiences built from high-quality seed: purchases, email list, high-value customers" },
      { id: "meta_mk_au3", label: "Custom audiences created: website visitors, customer email list, video viewers, Instagram engagers" },
      { id: "meta_mk_au4", label: "Audience exclusions applied — existing customers and recent converters excluded from cold traffic" },
      { id: "meta_mk_au5", label: "Audience overlap between ad sets has been checked and minimised" },
      { id: "meta_mk_au6", label: "A dedicated retargeting ad set targets warm audiences (site visitors, page engagers)" },
      { id: "meta_mk_au7", label: "Advantage+ Audience reviewed — Existing audience suggestions used as a guide, not blindly accepted" },
    ],
  },
  {
    id: "meta_mk_creative",
    label: "Creative",
    items: [
      { id: "meta_mk_cr1",  label: "All creative assets meet Meta's ad specifications (image 1080×1080px, video 4:5 or 9:16 for feeds)" },
      { id: "meta_mk_cr2",  label: "Primary text is clear and benefit-led — under 125 chars to avoid truncation on mobile" },
      { id: "meta_mk_cr3",  label: "Headline (below image) is compelling and includes brand name or core value proposition" },
      { id: "meta_mk_cr4",  label: "CTA button matches campaign objective (Shop Now, Learn More, Get Quote, Apply Now, etc.)" },
      { id: "meta_mk_cr5",  label: "≥3 creative variants per ad set to enable Meta's internal creative testing" },
      { id: "meta_mk_cr6",  label: "All videos are captioned — 85%+ of Meta users watch without sound" },
      { id: "meta_mk_cr7",  label: "Images contain minimal overlay text — heavy text reduces reach and increases CPM" },
      { id: "meta_mk_cr8",  label: "All ads previewed in Ads Manager across feed, stories, and reels placements on mobile" },
      { id: "meta_mk_cr9",  label: "All creative follows brand guidelines (colours, fonts, logo size and placement)" },
      { id: "meta_mk_cr10", label: "Video ads have a strong hook within the first 2–3 seconds to stop the scroll" },
      { id: "meta_mk_cr11", label: "No competitor brand names or trademarked terms used in ad copy" },
    ],
  },
  {
    id: "meta_mk_landing_pages",
    label: "Landing Pages",
    items: [
      { id: "meta_mk_lp1", label: "Meta Pixel fires on the landing page — verified with Meta Pixel Helper extension" },
      { id: "meta_mk_lp2", label: "Landing page message matches the ad creative (same offer, headline, imagery)" },
      { id: "meta_mk_lp3", label: "Landing page is fully mobile-optimised — majority of Meta traffic is mobile" },
      { id: "meta_mk_lp4", label: "Landing page has a single, clear CTA — no conflicting goals or distractions" },
      { id: "meta_mk_lp5", label: "Landing page has ≥3 contextual internal links to relevant content" },
      { id: "meta_mk_lp6", label: "Social proof and trust signals are visible above the fold on mobile" },
      { id: "meta_mk_lp7", label: "Page speed ≥80 Mobile PageSpeed — slow pages directly increase CPL and CPP on Meta" },
      { id: "meta_mk_lp8", label: "Instant Experience / Canvas considered for mobile-first or brand awareness campaigns" },
    ],
  },
  {
    id: "meta_mk_tracking",
    label: "Tracking & Events",
    items: [
      { id: "meta_mk_tr1", label: "Meta Pixel is active and firing on all pages of the website" },
      { id: "meta_mk_tr2", label: "All key standard events firing: PageView, ViewContent, Lead, Purchase, AddToCart, InitiateCheckout" },
      { id: "meta_mk_tr3", label: "Conversions API (CAPI) implemented server-side to capture browser-blocked events" },
      { id: "meta_mk_tr4", label: "Event deduplication configured correctly between Pixel and CAPI using matching event_id" },
      { id: "meta_mk_tr5", label: "Custom conversions defined in Events Manager for any non-standard events" },
      { id: "meta_mk_tr6", label: "UTM parameters on all ad destination URLs — campaign, source, medium, content" },
      { id: "meta_mk_tr7", label: "Offline conversions configured (if CRM data is available)" },
    ],
  },
];

export const META_ADS_DEV: CheckCategory[] = [
  {
    id: "meta_dv_pixel",
    label: "Pixel & Events",
    items: [
      { id: "meta_dv_px1", label: "Meta Pixel base code is installed on every page of the website" },
      { id: "meta_dv_px2", label: "Pixel firing correctly — verified with Meta Pixel Helper browser extension" },
      { id: "meta_dv_px3", label: "Standard events implemented: PageView, ViewContent, Lead, Purchase, AddToCart, InitiateCheckout" },
      { id: "meta_dv_px4", label: "Event parameters correct: value (numeric), currency (ISO code), content_id, content_name, content_type" },
      { id: "meta_dv_px5", label: "No duplicate pixel events firing on the same user action" },
      { id: "meta_dv_px6", label: "Deduplication event_id matches exactly between Pixel and CAPI payloads" },
      { id: "meta_dv_px7", label: "All events confirmed received in Meta Events Manager Test Events tool" },
    ],
  },
  {
    id: "meta_dv_capi",
    label: "Conversions API (CAPI)",
    items: [
      { id: "meta_dv_ca1", label: "CAPI implemented server-side — not relying on browser only" },
      { id: "meta_dv_ca2", label: "CAPI sending the same set of events as the browser Pixel" },
      { id: "meta_dv_ca3", label: "All customer information correctly hashed as SHA-256: email, phone, first name, last name, postcode, city, country" },
      { id: "meta_dv_ca4", label: "Event Match Quality (EMQ) score is ≥6 in Meta Events Manager" },
      { id: "meta_dv_ca5", label: "CAPI integration tested end-to-end in Meta Test Events tool" },
      { id: "meta_dv_ca6", label: "Dynamic product ad feed validated and set to refresh automatically (e-commerce only)" },
      { id: "meta_dv_ca7", label: "UTM parameters persisting through to GA4 sessions and CRM contact records" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getMarketingCategories(type: string): CheckCategory[] {
  if (type === "google_ads") return GOOGLE_ADS_MARKETING;
  if (type === "meta_ads") return META_ADS_MARKETING;
  return WEBSITE_MARKETING;
}

export function getDevCategories(type: string): CheckCategory[] {
  if (type === "google_ads") return GOOGLE_ADS_DEV;
  if (type === "meta_ads") return META_ADS_DEV;
  return WEBSITE_DEV;
}

export function getCategories(type: string, tab: "marketing" | "dev"): CheckCategory[] {
  return tab === "marketing" ? getMarketingCategories(type) : getDevCategories(type);
}
