/**
 * Grand Plan HTML Template Engine
 *
 * Produces self-contained HTML matching the Lux Technical example design:
 * - Dark navy hero gradients
 * - Sticky sidebar navigation
 * - Seed phrase suggestion panels
 * - Copy-to-clipboard buttons
 * - Expandable sections
 * - Password gate
 * - Confidential watermark
 * - Responsive layout
 * - i3media branding
 */

import type { GrandPlanData, AudienceItem, StrategyBrain } from "./grand-plan-generator";

// ─── Data grounding badges ──────────────────────────────────────────────────
// Each grounded section returns a { grounding, sourceLabels } record on
// plan.grounding[key]. We inject a small badge into the section's first <h2>
// heading so the reader can see at a glance which sections are real-data
// driven vs AI-generated. Sections with no grounding entry are left alone.

const GROUNDING_LABEL: Record<string, { className: string; text: string }> = {
  real: { className: "dg-real", text: "Real data" },
  partial: { className: "dg-partial", text: "Partly grounded" },
  "ai-only": { className: "dg-ai", text: "AI estimate" },
};

function renderGroundingBadge(g?: { grounding: string; sourceLabels: string[] }): string {
  if (!g) return "";
  const meta = GROUNDING_LABEL[g.grounding] ?? GROUNDING_LABEL["ai-only"];
  const tooltip = g.sourceLabels?.length
    ? `Sources: ${g.sourceLabels.join(", ")}`
    : g.grounding === "ai-only"
      ? "Generated without account data — verify before sharing."
      : "Grounded in connected data.";
  return `<span class="dg-badge ${meta.className}" title="${escapeAttr(tooltip)}">${meta.text}</span>`;
}

function escapeAttr(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Inject a grounding badge into the first <h2> tag of a rendered section. */
function withGroundingBadge(html: string, g?: { grounding: string; sourceLabels: string[] }): string {
  if (!g) return html;
  const badge = renderGroundingBadge(g);
  if (!badge) return html;
  // Insert just before the closing </h2> of the first heading.
  return html.replace(/(<h2\b[^>]*>[\s\S]*?)(<\/h2>)/, (_m, open, close) => `${open} ${badge}${close}`);
}

function renderDataSourcesPanel(sources: { label: string; detail?: string }[]): string {
  const items = sources
    .map((s) => `<li><strong>${escapeAttr(s.label)}</strong>${s.detail ? `<span class="ds-detail">— ${escapeAttr(s.detail)}</span>` : ""}</li>`) 
    .join("");
  return `<div class="data-sources-panel"><h3>Data sources used in this plan</h3><ul class="data-sources-list">${items}</ul></div>`;
}

/**
 * Extract a clean one-paragraph teaser from executive summary HTML.
 * Used as a FALLBACK when planData.heroTagline is missing. Cuts at sentence
 * boundaries up to ~340 chars so the hero never visibly chops mid-clause.
 */
function heroSubtext(raw: string): string {
  // Strip any remaining code-fence prefix (e.g. "html\n") that slipped past extractText
  const nofence = raw.replace(/^(?:html|markdown|md|json)\s+/i, "");
  // Remove heading tags and their content, we want body copy only
  const noHeadings = nofence.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, " ");
  // Drop callout paragraphs (Why this matters / Outcome / Risk) so the hero
  // gets the narrative open paragraph rather than a bracketed risk note.
  const noCallouts = noHeadings.replace(/<p[^>]*>\s*<strong>\s*(Why\s+(?:this\s+|it\s+)?matters|Outcome|Risk|Opportunity|Headline)\s*:?\s*<\/strong>[\s\S]*?<\/p>/gi, " ");
  // Strip all remaining HTML tags
  const text = noCallouts.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= 340) return text;
  // Prefer the last full sentence inside the budget over a mid-word slice.
  const window = text.slice(0, 340);
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (lastStop > 200) return window.slice(0, lastStop + 1);
  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window) + "…";
}

export function renderGrandPlanHtml(plan: GrandPlanData, isPublicView = false): string {
  const s = plan.sections;

  // ── Build chapter-grouped nav ──────────────────────────────────────────────
  type NavItem = { id: string; label: string; isChapter?: boolean };
  const navItems: NavItem[] = [];

  const addChapter = (title: string) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    navItems.push({ id: `chapter-${slug}`, label: title, isChapter: true });
  };

  const hasContext = s.audiences?.length || plan.brief || plan.campaignPeriods?.length;
  void hasContext; // Context chapter removed — brief & audiences now surface inside the Strategy Brain panel.
  // Strategy chapter removed — Strategy Plan, Quick Wins (Action Plan) and Strategic Foundation
  // are no longer rendered. Channel sections carry the strategy through directly.
  const hasPaidSearch = !!s.googleAdsCampaigns;
  const hasPaidSocial = s.metaCampaigns?.length || s.linkedInAds?.length;
  const hasContent = s.contentStrategy || s.contentCalendar?.length;
  const hasResearch = s.competitorIntel?.length;
  const hasCommercial = s.servicesInvestment || s.emailMarketing;

  if (hasPaidSearch) {
    addChapter("Paid Search");
    if (s.googleAdsCampaigns) navItems.push({ id: "google-ads", label: "Google Ads" });
  }
  if (hasPaidSocial) {
    addChapter("Paid Social");
    if (s.metaCampaigns?.length) navItems.push({ id: "meta-campaigns", label: "Meta Campaigns" });
    if (s.linkedInAds?.length) navItems.push({ id: "linkedin-ads", label: "LinkedIn Ads" });
  }
  if (hasContent) {
    addChapter("Content & SEO");
    if (s.contentStrategy) navItems.push({ id: "content-strategy", label: "Content Strategy" });
    if (s.seoFoundations) navItems.push({ id: "seo-foundations", label: "SEO Foundations" });
    if (s.contentCalendar?.length) navItems.push({ id: "content-calendar", label: "Content Calendar" });
  }
  if (hasResearch) {
    addChapter("Research");
    if (s.competitorIntel?.length) navItems.push({ id: "competitor-intel", label: "Competitor Intel" });
  }
  if (hasCommercial) {
    addChapter("Commercial");
    if (s.servicesInvestment) navItems.push({ id: "services", label: "Services & Investment" });
    if (s.emailMarketing) navItems.push({ id: "email-marketing", label: "Email Marketing" });
  }

  // ── Stats band ─────────────────────────────────────────────────────────────
  // Render every derived count we have, grouped by theme so the hero handoff
  // shows scope at a glance without truncating items behind a slice cap.
  type StatItem = { num: string; label: string };
  type StatGroup = { label: string; items: StatItem[] };

  const fmt = (n: number) => n > 1000 ? `${Math.round(n / 100) / 10}k` : String(n);

  const strategyStats: StatItem[] = [];
  const sectionCount = navItems.filter(n => !n.isChapter).length;
  if (sectionCount) strategyStats.push({ num: String(sectionCount), label: "Sections" });
  if (s.audiences?.length) strategyStats.push({ num: String(s.audiences.length), label: "Audiences" });
  if (s.quickWins?.length) strategyStats.push({ num: String(s.quickWins.length), label: "Quick Wins" });
  if (plan.campaignPeriods?.length) strategyStats.push({ num: String(plan.campaignPeriods.length), label: "Focus Periods" });

  const paidStats: StatItem[] = [];
  if (s.googleAdsCampaigns?.adGroups?.length) {
    paidStats.push({ num: String(s.googleAdsCampaigns.adGroups.length), label: "Google Ad Groups" });
    const totalKws = s.googleAdsCampaigns.adGroups.reduce((sum: number, g: { keywords: unknown[] }) => sum + (g.keywords?.length ?? 0), 0);
    if (totalKws) paidStats.push({ num: totalKws > 100 ? `${Math.round(totalKws / 10) * 10}+` : String(totalKws), label: "Target Keywords" });
  }
  const negCount = (s.googleAdsCampaigns?.negativeKeywords?.length ?? 0)
    + (s.googleAdsCampaigns?.aiNegativesWithReason?.length ?? 0);
  if (negCount) paidStats.push({ num: String(negCount), label: "Negative Keywords" });
  if (s.metaCampaigns?.length) paidStats.push({ num: String(s.metaCampaigns.length), label: "Meta Campaigns" });
  if (s.linkedInAds?.length) paidStats.push({ num: String(s.linkedInAds.length), label: "LinkedIn Campaigns" });

  const contentStats: StatItem[] = [];
  if (s.contentStrategy) {
    const pageOpts = s.contentStrategy.pageOptimisations?.length ?? 0;
    const landing = s.contentStrategy.landingPages?.length ?? 0;
    const blogs = s.contentStrategy.blogPosts?.length ?? 0;
    if (pageOpts) contentStats.push({ num: String(pageOpts), label: "Page Optimisations" });
    if (landing) contentStats.push({ num: String(landing), label: "Landing Pages" });
    if (blogs) contentStats.push({ num: String(blogs), label: "Blog Posts" });
  }
  if (s.contentCalendar?.length) contentStats.push({ num: String(s.contentCalendar.length), label: "Calendar Months" });

  const organicStats: StatItem[] = [];
  if (s.emailMarketing?.flows?.length) organicStats.push({ num: String(s.emailMarketing.flows.length), label: "Email Flows" });
  if (s.emailMarketing?.segmentation?.segments?.length) {
    organicStats.push({ num: String(s.emailMarketing.segmentation.segments.length), label: "Email Segments" });
  }
  if (s.emailMarketing?.campaigns?.length) organicStats.push({ num: String(s.emailMarketing.campaigns.length), label: "Email Campaigns" });

  const measurementStats: StatItem[] = [];
  if (s.competitorIntel?.length) measurementStats.push({ num: String(s.competitorIntel.length), label: "Competitors Analysed" });
  void fmt; // reserved for future formatting use

  const statGroups: StatGroup[] = [
    { label: "Strategy", items: strategyStats },
    { label: "Paid Media", items: paidStats },
    { label: "Content & SEO", items: contentStats },
    { label: "Organic & Lifecycle", items: organicStats },
    { label: "Performance", items: measurementStats },
  ].filter(g => g.items.length > 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(plan.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>

<!-- Sticky Nav -->
<nav id="sticky-nav" class="sticky-nav" aria-label="Page navigation">
  <div class="sticky-nav-inner">
    <a class="sticky-nav-logo" href="#">${I3_LOGO_SVG}</a>
    <button class="snav-menu-btn" id="snav-hamburger" aria-expanded="false" aria-label="Navigate">
      <span id="snav-active-label">Contents</span>
      <span class="snav-chevron">&#9660;</span>
    </button>
  </div>
  <div class="snav-dropdown">
    <div class="snav-dropdown-inner" id="snav-links">
      ${navItems.map((n) => n.isChapter
        ? `<span class="snav-chapter-label">${esc(n.label)}</span>`
        : `<a href="#${n.id}" class="snav-link" data-section="${n.id}">${esc(n.label)}</a>`
      ).join("\n      ")}
    </div>
  </div>
</nav>

<!-- Desktop sidebar TOC (Lux plan.html sidebar pattern) -->
<aside id="gp-toc" class="gp-toc" aria-label="Plan contents">
  <div class="gp-toc-title">Contents</div>
  ${navItems.map((n) => n.isChapter
    ? `<span class="snav-chapter-label">${esc(n.label)}</span>`
    : `<a href="#${n.id}" class="snav-link" data-section="${n.id}">${esc(n.label)}</a>`
  ).join("\n  ")}
</aside>

<!-- Hero -->
<section class="hero">
  <div class="hero-orb"></div>
  <div class="hero-orb"></div>
  <div class="hero-orb"></div>
  <div class="hero-inner">
    ${I3_LOGO_SVG.replace('viewBox="0 0 161 53"', 'viewBox="0 0 161 53" style="width:140px;height:auto;margin-bottom:2.5rem;display:block;color:#fff"')}
    <div class="hero-label">${plan.purpose === "pitch" ? "Pitch Deck" : plan.purpose === "onboarding" ? "Onboarding Plan" : "Strategy Overview"} &nbsp;&middot;&nbsp; ${new Date(plan.generatedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })} &nbsp;&middot;&nbsp; i3media</div>
    <h1>${esc(plan.title)}</h1>
    <div class="hero-divider"></div>
    <p class="hero-sub">${plan.heroTagline ? esc(plan.heroTagline) : s.executiveSummary ? esc(heroSubtext(s.executiveSummary)) : `A comprehensive digital marketing strategy for ${esc(plan.clientName)}.`}</p>
    <div class="hero-meta">
      <div class="hero-meta-item"><strong>Client</strong><span>${esc(plan.clientName)}</span></div>
      <div class="hero-meta-item"><strong>Agency</strong><span>i3media</span></div>
      <div class="hero-meta-item"><strong>Date</strong><span>${new Date(plan.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
      <div class="hero-meta-item"><strong>Scope</strong><span>${navItems.filter(n => n.isChapter).map(n => n.label).join(", ")}</span></div>
    </div>
  </div>
</section>

<!-- Stats Band -->
<div class="stats-band">
  <div class="stats-inner">
    ${statGroups.map(g => `
    <div class="stats-row" data-group="${esc(g.label)}">
      <div class="stats-row-label">${esc(g.label)}</div>
      ${g.items.map(st => `<div class="stat-item"><span class="stat-num">${st.num}</span><span class="stat-label">${esc(st.label)}</span></div>`).join("")}
    </div>`).join("")}
  </div>
</div>

${renderStrategyBrainPanel(plan.strategyBrain)}
${isPublicView ? "" : renderCoherencePanel(plan.coherenceIssues)}

<!-- Main Content -->
${buildChapteredSections(s, plan.clientName, plan.brief, plan.campaignPeriods, plan.generationReport, plan.grounding, plan.dataSources, plan.clientWebsite, plan.sectionIntros, plan.audienceRationales, isPublicView)}

<!-- Closing CTA -->
${renderCtaClose(plan.clientName)}

<!-- TLDR view (internal only) -->
${isPublicView ? "" : renderTldrView(plan)}

<!-- TLDR toggle button (internal only) -->
${isPublicView ? "" : `<button id="tldr-toggle" class="tldr-toggle" type="button" title="Toggle TLDR view">
  <span class="tldr-toggle-icon" aria-hidden="true">\u2630</span>
  <span class="tldr-toggle-label">TLDR</span>
</button>`}

<!-- Watermark -->
<div class="watermark">Confidential</div>

<!-- Password gate -->
<div id="auth-gate" class="auth-gate">
  <div class="auth-box">
    ${I3_LOGO_SVG}
    <h2>This document is password protected</h2>
    <form id="auth-form">
      <input type="password" id="auth-pw" placeholder="Enter password" autocomplete="off">
      <button type="submit">View Plan</button>
      <p id="auth-error" class="auth-error"></p>
    </form>
  </div>
</div>

<!-- Quick-win FAQ / schema modal -->
<div id="qw-modal" class="qw-modal" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="qw-modal-backdrop" data-qw-close></div>
  <div class="qw-modal-panel">
    <header class="qw-modal-head">
      <div>
        <div class="qw-modal-eyebrow" id="qw-modal-eyebrow"></div>
        <h3 id="qw-modal-title">Suggested content</h3>
        <a class="qw-modal-url" id="qw-modal-url" href="#" target="_blank" rel="noopener"></a>
      </div>
      <button type="button" class="qw-modal-close" data-qw-close aria-label="Close">&times;</button>
    </header>
    <div class="qw-modal-body" id="qw-modal-body"></div>
  </div>
</div>

<script>${JS}</script>
</body>
</html>`;
}

// ─── Chapter layout builder ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChapteredSections(s: any, clientName: string, brief?: string, campaignPeriods?: { label: string; startMonth: number; endMonth: number; description?: string }[], generationReport?: Record<string, { status: string; error?: string }>, grounding?: GrandPlanData["grounding"], dataSources?: GrandPlanData["dataSources"], clientWebsite?: string, sectionIntros?: GrandPlanData["sectionIntros"], audienceRationales?: GrandPlanData["audienceRationales"], isPublicView = false): string {
  let chapterNum = 0;
  const ch = (title: string, sub: string) => {
    chapterNum++;
    return chapterPanel(chapterNum, title, sub);
  };

  const hasContext = brief || s.audiences?.length || campaignPeriods?.length;
  void hasContext; // Context chapter removed — brief lives in the brain panel; audiences appear inline per channel.
  // Strategy chapter (Strategy Plan + Quick Wins) removed — channel chapters open the plan directly.
  const hasPaidSearch = !!s.googleAdsCampaigns;
  const hasPaidSocial = s.metaCampaigns?.length || s.linkedInAds?.length;
  const hasContent = s.contentStrategy || s.contentCalendar?.length;
  const hasResearch = s.competitorIntel?.length;
  const hasCommercial = s.servicesInvestment || s.emailMarketing;

  // grounding badge wrapper — no-op in public view
  const wb = (html: string, g?: { grounding: string; sourceLabels: string[] } | null) =>
    isPublicView ? html : withGroundingBadge(html, g ?? undefined);

  const parts: string[] = [];

  // Data sources panel removed — the Strategy Brain panel above already explains
  // the foundation. Internal teams can inspect plan.dataSources via the API.
  void dataSources;

  if (hasPaidSearch) {
    parts.push(ch("Paid Search", "Google Ads campaign structure, ad groups, and keyword targeting."));
    if (s.googleAdsCampaigns) parts.push(renderGoogleAdsCampaigns(s.googleAdsCampaigns, clientWebsite, sectionIntros?.googleAdsCampaigns, isPublicView));
  }

  if (hasPaidSocial) {
    parts.push(ch("Paid Social", "Facebook, Instagram, and LinkedIn campaign structures with audience targeting and ad creative."));
    if (s.metaCampaigns?.length) parts.push(renderMetaCampaigns(s.metaCampaigns, clientWebsite, sectionIntros?.metaCampaigns));
    if (s.linkedInAds?.length) parts.push(wb(renderLinkedInAds(s.linkedInAds), grounding?.linkedInAds));
  }

  if (hasContent) {
    parts.push(ch("Content & SEO", "Content strategy, publishing calendar, and example content assets."));
    if (s.contentStrategy) parts.push(renderContentStrategy(s.contentStrategy, sectionIntros?.contentStrategy, audienceRationales));
    if (s.seoFoundations) parts.push(renderSeoFoundations(s.seoFoundations));
    if (s.contentCalendar?.length) parts.push(renderContentCalendar(s.contentCalendar));
  }

  if (hasResearch) {
    parts.push(ch("Research", "Competitor intelligence across all target areas."));
    if (s.competitorIntel?.length) parts.push(wb(renderCompetitorIntel(s.competitorIntel, grounding?.competitorIntel?.grounding), grounding?.competitorIntel));
  }

  if (hasCommercial) {
    parts.push(ch("Commercial", "Services, investment overview, and email lifecycle."));
    if (s.servicesInvestment) parts.push(renderServicesInvestment(s.servicesInvestment));
    if (s.emailMarketing) parts.push(wb(renderEmailMarketing(s.emailMarketing), grounding?.emailMarketing));
  }

  return parts.join("\n");
}

function chapterPanel(num: number, title: string, sub: string): string {
  const numStr = String(num).padStart(2, "0");
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `
<div class="chapter-panel" id="chapter-${slug}" data-snap>
  <div class="chapter-panel-orb"></div>
  <div class="chapter-inner">
    <div class="chapter-num">Chapter ${numStr}</div>
    <h2 class="chapter-heading">${esc(title)}</h2>
    <p class="chapter-sub">${esc(sub)}</p>
  </div>
</div>`;
}

function renderCtaClose(clientName: string): string {
  return `
<section class="cta-section">
  <div class="cta-orb"></div>
  <div class="cta-orb"></div>
  <div class="section-inner" style="max-width:800px;margin:0 auto;position:relative;z-index:1">
    <div class="section-kicker" style="color:rgba(255,255,255,.45)">Next Steps</div>
    <h2 style="font-size:clamp(2rem,5vw,3.25rem);color:#fff;letter-spacing:-1.5px;margin-bottom:1.25rem">Ready when you are.</h2>
    <p style="font-size:1.1rem;color:rgba(255,255,255,.6);max-width:560px;line-height:1.7;margin-bottom:3rem">This plan is ready to execute. If you have any questions about the strategy for ${esc(clientName)}, get in touch and we can walk through it together.</p>
    <div class="cta-links">
      <a href="mailto:hello@i3media.co.uk" class="cta-link-card">
        <span class="cta-link-icon">✉</span>
        <div><div class="cta-link-label">Email us</div><div class="cta-link-val">hello@i3media.co.uk</div></div>
      </a>
      <a href="https://i3media.co.uk" class="cta-link-card" target="_blank" rel="noopener">
        <span class="cta-link-icon">🌐</span>
        <div><div class="cta-link-label">Website</div><div class="cta-link-val">i3media.co.uk</div></div>
      </a>
    </div>
  </div>
</section>`;
}

// ─── TLDR view ──────────────────────────────────────────────────────────────
// Internal-only condensed view of the entire plan. Toggled via the floating
// "TLDR" button. Hides the full document and shows a single column of
// digestible cards: brief, audiences, competitors, and a one-glance overview
// of every section that ran. Intended as a quick handoff/skim view for the
// internal team — never shown on public share links.

function stripHtml(s: string): string {
  return String(s ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function firstSentence(text: string, maxLen = 220): string {
  const clean = stripHtml(text);
  if (!clean) return "";
  const stop = clean.search(/[.!?]\s+[A-Z]/);
  const cut = stop > 60 ? clean.slice(0, stop + 1) : clean;
  if (cut.length <= maxLen) return cut;
  const window = cut.slice(0, maxLen);
  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window) + "\u2026";
}

function renderTldrView(plan: GrandPlanData): string {
  const s = plan.sections;
  const cards: string[] = [];

  const card = (id: string, title: string, body: string, kicker?: string) => `
    <article class="tldr-card" data-tldr-id="${esc(id)}">
      ${kicker ? `<div class="tldr-kicker">${esc(kicker)}</div>` : ""}
      <h3 class="tldr-card-title">${esc(title)}</h3>
      <div class="tldr-card-body">${body}</div>
      <button type="button" class="tldr-jump" data-jump="${esc(id)}">Jump to full section &rarr;</button>
    </article>`;

  // Brief
  if (plan.brief) {
    cards.push(card(
      "tldr-brief",
      "The Brief",
      `<p>${esc(firstSentence(plan.brief, 420))}</p>`,
      "Context",
    ));
  }

  // Strategic Foundation — bullets out the Strategy Brain
  if (plan.strategyBrain) {
    const sb = plan.strategyBrain;
    const bulletList = (items: (string | undefined | null)[]) => {
      const clean = items.map((i) => stripHtml(String(i ?? "")).trim()).filter(Boolean);
      if (!clean.length) return "";
      return `<ul class="tldr-bullets">${clean.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
    };
    const groups: string[] = [];
    if (sb.positioning?.statement) {
      groups.push(`<div class="tldr-sf-group"><div class="tldr-sf-label">Positioning</div><p class="tldr-sf-statement">${esc(stripHtml(sb.positioning.statement))}</p>${bulletList(sb.positioning.proofPoints ?? [])}</div>`);
    }
    if (sb.messageHierarchy?.primary || sb.messageHierarchy?.secondary?.length) {
      groups.push(`<div class="tldr-sf-group"><div class="tldr-sf-label">Message hierarchy</div>${sb.messageHierarchy.primary ? `<p class="tldr-sf-statement">${esc(stripHtml(sb.messageHierarchy.primary))}</p>` : ""}${bulletList(sb.messageHierarchy.secondary ?? [])}</div>`);
    }
    if (sb.marketContext) {
      const mc = sb.marketContext;
      const items: string[] = [];
      if (mc.state) items.push(`State: ${stripHtml(mc.state)}`);
      if (mc.opportunity) items.push(`Opportunity: ${stripHtml(mc.opportunity)}`);
      if (mc.threat) items.push(`Threat: ${stripHtml(mc.threat)}`);
      if (items.length) groups.push(`<div class="tldr-sf-group"><div class="tldr-sf-label">Market context</div>${bulletList(items)}</div>`);
    }
    if (sb.competitorAngle?.differentiator || sb.competitorAngle?.messagesToOwn?.length || sb.competitorAngle?.messagesToAvoid?.length) {
      const ca = sb.competitorAngle;
      const items: string[] = [];
      if (ca.differentiator) items.push(`Win: ${stripHtml(ca.differentiator)}`);
      (ca.messagesToOwn ?? []).slice(0, 4).forEach((m) => items.push(`Own: ${stripHtml(m)}`));
      (ca.messagesToAvoid ?? []).slice(0, 4).forEach((m) => items.push(`Avoid: ${stripHtml(m)}`));
      groups.push(`<div class="tldr-sf-group"><div class="tldr-sf-label">Competitor angle</div>${bulletList(items)}</div>`);
    }
    if (sb.targetGeographies?.length) {
      groups.push(`<div class="tldr-sf-group"><div class="tldr-sf-label">Markets</div><div class="tldr-tag-row">${sb.targetGeographies.slice(0, 12).map((g) => `<span class="tldr-tag">${esc(g)}</span>`).join("")}</div></div>`);
    }
    if (sb.channelStrategy?.length) {
      const items = sb.channelStrategy.slice(0, 8).map((c) => `${stripHtml(c.channel)}: ${stripHtml(c.role)}`);
      groups.push(`<div class="tldr-sf-group"><div class="tldr-sf-label">Channel strategy</div>${bulletList(items)}</div>`);
    }
    if (sb.audiences?.length) {
      const items = sb.audiences.slice(0, 6).map((a) => `${stripHtml(a.name)} \u2014 ${stripHtml(a.primaryPain || a.coreInsight || "")}`);
      groups.push(`<div class="tldr-sf-group"><div class="tldr-sf-label">Audiences</div>${bulletList(items)}</div>`);
    }
    if (groups.length) {
      cards.push(card(
        "tldr-strategy-foundation",
        "Strategic Foundation",
        groups.join(""),
        "Strategy",
      ));
    }
  }

  // Audiences
  if (s.audiences?.length) {
    const items = s.audiences.map((a) => `
      <li class="tldr-aud">
        <div class="tldr-aud-name">${esc(a.name)}</div>
        <div class="tldr-aud-desc">${esc(firstSentence(a.description, 160))}</div>
        ${a.painPoints?.length ? `<div class="tldr-aud-pains"><span class="tldr-pill">Pain</span> ${esc(a.painPoints.slice(0, 2).join(" \u00b7 "))}</div>` : ""}
      </li>`).join("");
    cards.push(card("tldr-audiences", "Audiences", `<ul class="tldr-list">${items}</ul>`, `${s.audiences.length} target ${s.audiences.length === 1 ? "audience" : "audiences"}`));
  }

  // Competitors — rendered as a mini-card grid alongside the Strategic Foundation
  if (s.competitorIntel?.length) {
    const tiles = s.competitorIntel.slice(0, 8).map((c) => {
      const sourceBadge = c.source ? `<span class="tldr-src tldr-src-${esc(c.source)}">${esc(c.source)}</span>` : "";
      const overlap = (c.commonKeywords ?? 0) > 0 ? `<span class="tldr-pill">${c.commonKeywords} KWs</span>` : "";
      const strengths = (c.strengths ?? []).slice(0, 2).map((t) => `<li>${esc(stripHtml(t))}</li>`).join("");
      const weaknesses = (c.weaknesses ?? []).slice(0, 2).map((t) => `<li>${esc(stripHtml(t))}</li>`).join("");
      return `
      <div class="tldr-comp-tile">
        <div class="tldr-comp-head">
          <span class="tldr-comp-domain">${esc(c.domain)}</span>
          ${sourceBadge}
          ${overlap}
        </div>
        ${strengths ? `<div class="tldr-comp-block"><span class="tldr-comp-block-label">Strengths</span><ul class="tldr-bullets">${strengths}</ul></div>` : ""}
        ${weaknesses ? `<div class="tldr-comp-block"><span class="tldr-comp-block-label">Weaknesses</span><ul class="tldr-bullets">${weaknesses}</ul></div>` : ""}
      </div>`;
    }).join("");
    cards.push(card(
      "tldr-competitors",
      "Competitor Analysis",
      `<div class="tldr-comp-grid">${tiles}</div>`,
      `${s.competitorIntel.length} analysed`,
    ));
  }

  // Executive Summary (just the first sentence)
  if (s.executiveSummary) {
    cards.push(card("executive-summary", "Executive Summary", `<p>${esc(firstSentence(s.executiveSummary, 360))}</p>`, "Strategy"));
  }

  // Strategy Plan
  if (s.strategyPlan) {
    cards.push(card("strategy-plan", "Strategy Plan", `<p>${esc(firstSentence(s.strategyPlan, 320))}</p>`, "Strategy"));
  }

  // Quick Wins
  if (s.quickWins?.length) {
    const items = s.quickWins.slice(0, 6).map((q) => `
      <li class="tldr-row">
        <span class="tldr-pill tldr-pri-${esc(q.priority)}">${esc(q.priority)}</span>
        <span class="tldr-row-text">${esc(q.title)}</span>
      </li>`).join("");
    cards.push(card("quick-wins", "Quick Wins", `<ul class="tldr-list">${items}</ul>`, `${s.quickWins.length} prioritised`));
  }

  // Google Ads
  if (s.googleAdsCampaigns) {
    const ga = s.googleAdsCampaigns;
    const adGroups = (ga.adGroups ?? []) as { name: string; keywords: unknown[] }[];
    const totalKws = adGroups.reduce((sum, g) => sum + (g.keywords?.length ?? 0), 0);
    const groupNames = adGroups.slice(0, 6).map((g) => `<span class="tldr-tag">${esc(g.name)}</span>`).join("");
    const more = adGroups.length > 6 ? `<span class="tldr-tag tldr-tag-more">+${adGroups.length - 6} more</span>` : "";
    const negCount = (ga.negativeKeywords?.length ?? 0) + (ga.aiNegativesWithReason?.length ?? 0);
    const overview = ga.overview ?? {};
    const facts = [
      overview.Budget ? `<div class="tldr-fact"><span class="tldr-fact-label">Budget</span> <strong>${esc(String(overview.Budget))}</strong></div>` : "",
      overview.Locations ? `<div class="tldr-fact"><span class="tldr-fact-label">Locations</span> <strong>${esc(String(overview.Locations))}</strong></div>` : "",
      `<div class="tldr-fact"><span class="tldr-fact-label">Ad groups</span> <strong>${adGroups.length}</strong></div>`,
      `<div class="tldr-fact"><span class="tldr-fact-label">Keywords</span> <strong>${totalKws}</strong></div>`,
      negCount ? `<div class="tldr-fact"><span class="tldr-fact-label">Negatives</span> <strong>${negCount}</strong></div>` : "",
    ].filter(Boolean).join("");
    cards.push(card(
      "google-ads",
      "Google Ads (research only)",
      `<div class="tldr-facts">${facts}</div>${groupNames || more ? `<div class="tldr-tag-row">${groupNames}${more}</div>` : ""}`,
      "Paid Search",
    ));
  }

  // Meta Campaigns
  if (s.metaCampaigns?.length) {
    const items = s.metaCampaigns.slice(0, 6).map((c) => `
      <li class="tldr-row">
        <span class="tldr-row-text"><strong>${esc(c.campaignName)}</strong> <span class="tldr-muted">\u00b7 ${esc(c.objective)} \u00b7 ${esc(c.budget)}</span></span>
      </li>`).join("");
    cards.push(card("meta-campaigns", "Meta Campaigns", `<ul class="tldr-list">${items}</ul>`, `${s.metaCampaigns.length} campaigns`));
  }

  // LinkedIn Ads
  if (s.linkedInAds?.length) {
    const items = s.linkedInAds.slice(0, 6).map((c) => `
      <li class="tldr-row">
        <span class="tldr-row-text"><strong>${esc(c.campaignName)}</strong> <span class="tldr-muted">\u00b7 ${esc(c.objective)} \u00b7 ${esc(c.budget)}</span></span>
      </li>`).join("");
    cards.push(card("linkedin-ads", "LinkedIn Ads", `<ul class="tldr-list">${items}</ul>`, `${s.linkedInAds.length} campaigns`));
  }

  // Content Strategy
  if (s.contentStrategy) {
    const cs = s.contentStrategy;
    const facts = [
      cs.pageOptimisations?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Page optimisations</span> <strong>${cs.pageOptimisations.length}</strong></div>` : "",
      cs.landingPages?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Landing pages</span> <strong>${cs.landingPages.length}</strong></div>` : "",
      cs.blogPosts?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Blog posts</span> <strong>${cs.blogPosts.length}</strong></div>` : "",
    ].filter(Boolean).join("");
    cards.push(card("content-strategy", "Content Strategy", `<div class="tldr-facts">${facts}</div>`, "Content & SEO"));
  }

  // SEO Foundations
  if (s.seoFoundations) {
    const sf = s.seoFoundations;
    const facts = [
      sf.quickWins?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Page wins</span> <strong>${sf.quickWins.length}</strong></div>` : "",
      sf.internalLinking?.hubs?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Linking hubs</span> <strong>${sf.internalLinking.hubs.length}</strong></div>` : "",
      sf.linkBuilding?.targets?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Link targets</span> <strong>${sf.linkBuilding.targets.length}</strong></div>` : "",
    ].filter(Boolean).join("");
    cards.push(card("seo-foundations", "SEO Foundations", `<div class="tldr-facts">${facts}</div>${sf.intro ? `<p>${esc(firstSentence(sf.intro, 220))}</p>` : ""}`, "Content & SEO"));
  }

  // Content Calendar
  if (s.contentCalendar?.length) {
    const first = s.contentCalendar[0];
    const topics = (first.blogPosts ?? []).slice(0, 4).map((p) => `<span class="tldr-tag">${esc(p.title)}</span>`).join("");
    cards.push(card(
      "content-calendar",
      "Content Calendar",
      `<div class="tldr-muted" style="margin-bottom:.5rem">${esc(first.month)} \u2014 first month preview</div><div class="tldr-tag-row">${topics}</div>`,
      `${s.contentCalendar.length} months planned`,
    ));
  }

  // Keyword Research TLDR card removed — keywords now live inside the Google Ads section.

  // Services & Investment
  if (s.servicesInvestment) {
    const si = s.servicesInvestment;
    const services = (si.services ?? []).slice(0, 6).map((sv) => `<li class="tldr-row"><span class="tldr-row-text"><strong>${esc(sv.name)}</strong>${sv.price ? ` <span class="tldr-muted">\u00b7 ${esc(sv.price)}</span>` : ""}</span></li>`).join("");
    const ia = si.investmentAllocation;
    const allocation = ia && ia.byChannel?.length ? `
      <div class="tldr-muted" style="margin:.75rem 0 .35rem">Investment allocation \u2014 \u00a3${(ia.totalMonthly ?? 0).toLocaleString()}/mo total</div>
      <ul class="tldr-list">
        ${ia.byChannel.map((row) => `<li class="tldr-row"><span class="tldr-row-text"><strong>${esc(row.channel)}</strong> <span class="tldr-muted">\u00b7 \u00a3${(row.amount ?? 0).toLocaleString()}/mo (${row.share ?? 0}%)</span></span></li>`).join("")}
      </ul>` : "";
    cards.push(card("services", "Services & Investment", `<ul class="tldr-list">${services}</ul>${allocation}`, "Commercial"));
  }

  // Email Marketing
  if (s.emailMarketing) {
    const em = s.emailMarketing;
    const facts = [
      em.flows?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Flows</span> <strong>${em.flows.length}</strong></div>` : "",
      em.campaigns?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Campaigns</span> <strong>${em.campaigns.length}</strong></div>` : "",
      em.segmentation?.segments?.length ? `<div class="tldr-fact"><span class="tldr-fact-label">Segments</span> <strong>${em.segmentation.segments.length}</strong></div>` : "",
    ].filter(Boolean).join("");
    cards.push(card("email-marketing", "Email Marketing", `<div class="tldr-facts">${facts}</div>`, "Commercial"));
  }

  // KPIs TLDR card removed.

  return `
<aside id="gp-tldr-view" class="tldr-view" aria-hidden="true">
  <header class="tldr-header">
    <div>
      <div class="tldr-header-kicker">Internal handoff</div>
      <h2 class="tldr-header-title">${esc(plan.title)} \u2014 TLDR</h2>
      <p class="tldr-header-sub">A condensed snapshot for the team. Click any card to jump into the full section.</p>
    </div>
    <button type="button" id="tldr-close" class="tldr-close-btn" aria-label="Close TLDR">Show full plan</button>
  </header>
  <div class="tldr-cards">
    ${cards.join("\n")}
  </div>
</aside>`;
}


// ─── Section renderers ──────────────────────────────────────────────────────

function renderContext(
  brief: string | undefined,
  audiences: AudienceItem[] | undefined,
  periods: { label: string; startMonth: number; endMonth: number; description?: string }[] | undefined
): string {
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const briefBlock = brief ? `
    <div class="ctx-brief">
      <div class="ctx-block-label">The Brief</div>
      <p class="ctx-brief-text">${esc(brief)}</p>
    </div>` : "";

  const audiencesBlock = audiences?.length ? `
    <div class="ctx-block-label" style="margin-top:3rem">Target Audiences</div>
    <div class="ctx-audience-grid">
      ${audiences.map((a, i) => `
      <div class="ctx-audience-card">
        <div class="ctx-audience-num">${String(i + 1).padStart(2, "0")}</div>
        <h4 class="ctx-audience-name">${esc(a.name)}</h4>
        <p class="ctx-audience-desc">${esc(a.description)}</p>
        ${a.personaQuote ? `
        <blockquote class="persona-quote">
          <span class="persona-quote-mark">&ldquo;</span>
          <p>${esc(a.personaQuote)}</p>
        </blockquote>` : ""}
        ${a.painPoints?.length ? `
        <div class="ctx-pain-label">Pain Points</div>
        <ul class="ctx-pain-list">
          ${a.painPoints.map(p => `<li>${esc(p)}</li>`).join("")}
        </ul>` : ""}
        ${a.channels?.length ? `
        <div class="ctx-channels">
          ${a.channels.map(c => `<span class="ctx-channel-chip">${esc(c)}</span>`).join("")}
        </div>` : ""}
        ${a.sectorPreview && (a.sectorPreview.keywordGroups.length || a.sectorPreview.campaignTeasers.length) ? `
        <details class="sector-preview">
          <summary><i class="sp-toggle">+</i> Keyword &amp; campaign preview</summary>
          <div class="sp-body">
            ${a.sectorPreview.keywordGroups.length ? `
            <div class="sp-section">
              <div class="sp-col-label">Keyword Groups &amp; Sample Keywords</div>
              <ul class="sp-kw-list">
                ${a.sectorPreview.keywordGroups.map(g => `<li><strong>${esc(g.label)}</strong> <span>${esc(g.samples)}</span></li>`).join("")}
              </ul>
            </div>` : ""}
            ${a.sectorPreview.campaignTeasers.length ? `
            <div class="sp-section">
              <div class="sp-col-label">Campaign / Ad Group Teaser</div>
              <ul class="sp-kw-list">
                ${a.sectorPreview.campaignTeasers.map(t => `<li><strong>${esc(t.channel)}:</strong> <span>${esc(t.focus)}</span></li>`).join("")}
              </ul>
            </div>` : ""}
          </div>
        </details>` : ""}
      </div>`).join("\n")}
    </div>` : "";

  const periodsBlock = periods?.length ? `
    <div class="ctx-block-label" style="margin-top:3rem">Campaign Focus Periods</div>
    <div class="ctx-periods-list">
      ${periods.map((p, i) => `
      <div class="ctx-period-item">
        <div class="ctx-period-num">${String(i + 1).padStart(2, "0")}</div>
        <div class="ctx-period-content">
          <div class="ctx-period-dates">${MONTH_SHORT[p.startMonth - 1]} – ${MONTH_SHORT[p.endMonth - 1]}</div>
          <div class="ctx-period-label">${esc(p.label)}</div>
          ${p.description ? `<div class="ctx-period-desc">${esc(p.description)}</div>` : ""}
        </div>
      </div>`).join("\n")}
    </div>` : "";

  return `
    <section id="context" class="section dark">
      <div class="section-inner">
        <div class="section-kicker blue">Context</div>
        <h2>Who We're Talking To</h2>
        <p class="section-intro">The brief, the target audiences, and the key campaign windows that shape every decision in this plan.</p>
        ${briefBlock}
        ${audiencesBlock}
        ${periodsBlock}
      </div>
    </section>`;
}

function renderExecutiveSummary(html: string): string {
  const enhanced = enhanceExecutiveSummary(html);
  return `
    <section id="executive-summary" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Overview</div>
        <h2>Executive Summary</h2>
        <div class="section-body exec-summary">${enhanced}</div>
      </div>
    </section>`;
}

function renderStrategyPlan(html: string): string {
  const enhanced = enhanceStrategyPlan(html);
  return `
    <section id="strategy-plan" class="section">
      <div class="section-inner">
        <div class="section-kicker">The Plan</div>
        <h2>Strategy Plan</h2>
        <div class="section-body strategy-plan">${enhanced}</div>
      </div>
    </section>`;
}

/**
 * Wraps each <h3>/<h4> heading and the content that follows into a `.phase-card`.
 * Detects phase keywords (Phase, Month, Quick Wins, Foundations) and adds a
 * coloured badge so the timeline reads visually instead of as a wall of text.
 */
function enhanceStrategyPlan(html: string): string {
  if (!html || typeof html !== "string") return html;
  // Split on h3 boundaries to group sections. Keep h4 inside their parent group.
  const parts = html.split(/(?=<h3\b)/i);
  if (parts.length <= 1) return html; // No headings — leave as-is
  let phaseNum = 0;
  return parts
    .map((chunk) => {
      if (!/^<h3\b/i.test(chunk)) return chunk; // intro paragraph(s)
      phaseNum++;
      const headingMatch = chunk.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
      const headingText = headingMatch ? stripTags(headingMatch[1]) : "";
      const badge = detectPhaseBadge(headingText, phaseNum);
      // Inject badge into the h3
      const withBadge = chunk.replace(
        /<h3\b([^>]*)>([\s\S]*?)<\/h3>/i,
        `<h3$1><span class="phase-badge ${badge.cls}">${esc(badge.label)}</span>$2</h3>`,
      );
      return `<div class="phase-card">${withBadge}</div>`;
    })
    .join("");
}

function detectPhaseBadge(heading: string, fallback: number): { label: string; cls: string } {
  const t = heading.toLowerCase();
  if (/quick win|month\s*0|week\s*[0-4]\b|first 30/i.test(t)) return { label: "Quick Wins", cls: "phase-quick" };
  if (/foundation|month\s*1\b|month\s*1[-–]2|first month/i.test(t)) return { label: "Foundations", cls: "phase-foundation" };
  if (/phase\s*1\b/i.test(t)) return { label: "Phase 1", cls: "phase-foundation" };
  if (/phase\s*2\b|month\s*[3-6]/i.test(t)) return { label: "Phase 2", cls: "phase-build" };
  if (/phase\s*3\b|month\s*[7-9]|long[-\s]?term|scale/i.test(t)) return { label: "Phase 3", cls: "phase-scale" };
  if (/optimis|test|iterate/i.test(t)) return { label: "Optimise", cls: "phase-build" };
  return { label: `Phase ${fallback}`, cls: "phase-build" };
}

/**
 * Surfaces "Why it matters", "Outcome", "Risk" lines from the executive summary
 * as right-rail callouts. Looks for <p><strong>Label:</strong> ...</p> patterns.
 */
function enhanceExecutiveSummary(html: string): string {
  if (!html || typeof html !== "string") return html;
  // Match <p><strong>Label:</strong> body</p>
  return html.replace(
    /<p>\s*<strong>\s*(Why (?:this |it )?matters|Outcome|Risk|Opportunity|Headline)\s*:?\s*<\/strong>\s*([\s\S]*?)<\/p>/gi,
    (_m, label: string, body: string) => {
      const cls = /risk/i.test(label) ? "exec-risk" : /opport|matter/i.test(label) ? "exec-opportunity" : "exec-outcome";
      return `<aside class="exec-callout ${cls}"><div class="exec-callout-label">${esc(label.trim())}</div><div class="exec-callout-body">${body.trim()}</div></aside>`;
    },
  );
}

function stripTags(s: string): string {
  return (s ?? "").replace(/<[^>]+>/g, "").trim();
}

function renderQuickWins(items: { title: string; description: string; priority: string }[]): string {
  if (!items?.length) return "";
  const priCls = (p: string) => {
    switch (p) {
      case "high": return "pri-h";
      case "medium-high": return "pri-mh";
      case "medium": return "pri-m";
      case "ongoing": return "pri-og";
      case "long-term": return "pri-lt";
      default: return "pri-m";
    }
  };
  const priLabel = (p: string) => {
    switch (p) {
      case "high": return "High Priority";
      case "medium-high": return "Medium-High";
      case "medium": return "Medium";
      case "ongoing": return "Ongoing";
      case "long-term": return "Long Term";
      default: return p;
    }
  };
  // Sort by priority for visual flow.
  const order: Record<string, number> = { "high": 0, "medium-high": 1, "medium": 2, "ongoing": 3, "long-term": 4 };
  const sorted = [...items].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
  const cards = sorted.map((a) => `
    <div class="ac-card">
      <span class="pri ${priCls(a.priority)}">${esc(priLabel(a.priority))}</span>
      <h4>${esc(a.title)}</h4>
      <p>${esc(a.description)}</p>
    </div>`).join("\n");
  return `
    <section id="quick-wins" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Action Plan</div>
        <h2>Quick Wins &amp; Priority Actions</h2>
        <p class="section-intro">A prioritised list of actions, sequenced for impact. High-priority items kick off in the first 30 days; long-term items shape the second half of the year.</p>
        <div class="action-grid">${cards}</div>
      </div>
    </section>`;
}

// renderKpis removed — KPIs section deleted.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderGoogleAdsCampaigns(data: any, clientWebsite?: string, intro?: string, isPublicView = false): string {
  void clientWebsite;
  const monthlyBudget = (data.overview ?? {})["Monthly Budget"] ?? (data.overview ?? {})["Budget"] ?? "Custom";
  const suggestedLocations = Array.isArray(data.suggestedLocations) ? data.suggestedLocations : [];
  const locationsHtml = suggestedLocations.length || !isPublicView
    ? `<div class="loc-card">
        <div class="loc-card-label">Suggested Locations</div>
        <div class="loc-chips" id="loc-chips-list">
          ${suggestedLocations.map((l: string) => isPublicView
            ? `<span class="loc-chip">${esc(l)}</span>`
            : `<span class="loc-chip loc-chip-edit" data-location="${esc(l)}">${esc(l)}<button class="loc-remove-btn" type="button" onclick="removeLocation(this)" title="Remove">&#xD7;</button></span>`
          ).join("")}
        </div>
        ${!isPublicView ? `<div class="kw-add-row" style="margin-top:8px">
          <input class="kw-add-input" type="text" placeholder="Add location…" onkeydown="if(event.key==='Enter'){addLocation(this);event.preventDefault()}" />
          <button class="copy-btn kw-add-btn" type="button" onclick="addLocation(this.previousElementSibling)">Add</button>
          <button class="copy-btn kw-save-btn" type="button" onclick="saveLocations(this)" style="margin-top:0">Save</button>
        </div>` : ""}
      </div>`
    : "";

  const aiNegReasoned = ((data.aiNegativesWithReason ?? []) as { keyword: string; reason: string }[])
    .filter((n) => n.keyword && n.reason);

  // Build ONE consolidated negatives pill list from every source (campaign-level
  // reasoned, campaign-level extras, and every ad group's adGroupNegatives).
  // Dedup case-insensitively, preserving first-seen order. Reasoned ones go
  // first so the user gets the highest-context items at the top.
  const adGroupsRaw = ((data.adGroups ?? []) as {
    name: string;
    keywords: { keyword: string; matchType: string; volume?: number; cpc?: number }[];
    hiddenLowVolumeCount?: number;
    audience?: string;
    adGroupNegatives?: string[];
  }[]);
  const negSeen = new Set<string>();
  const consolidatedNegatives: { keyword: string; reason?: string; source: "campaign" | "group"; groupName?: string }[] = [];
  for (const n of aiNegReasoned) {
    const key = n.keyword.trim().toLowerCase();
    if (!key || negSeen.has(key)) continue;
    negSeen.add(key);
    consolidatedNegatives.push({ keyword: n.keyword, reason: n.reason, source: "campaign" });
  }
  for (const k of ((data.negativeKeywords ?? []) as string[])) {
    const key = (k || "").trim().toLowerCase();
    if (!key || negSeen.has(key)) continue;
    negSeen.add(key);
    consolidatedNegatives.push({ keyword: k, source: "campaign" });
  }
  for (const g of adGroupsRaw) {
    for (const k of (g.adGroupNegatives ?? [])) {
      const key = (k || "").trim().toLowerCase();
      if (!key || negSeen.has(key)) continue;
      negSeen.add(key);
      consolidatedNegatives.push({ keyword: k, source: "group", groupName: g.name });
    }
  }

  const negChipsHtml = consolidatedNegatives.length > 0
    ? `<div class="neg-chip-list">${consolidatedNegatives.map((n) => `<span class="neg-chip kw-text" title="${esc(n.reason ?? (n.source === "group" ? `Ad group: ${n.groupName ?? ""}` : "Campaign-level negative"))}">${esc(n.keyword)}</span>`).join(" ")}</div>`
    : `<p class="section-intro" style="font-style:italic;color:var(--mid)">No negative keywords recommended for this account yet.</p>`;

  const reasonedListHtml = aiNegReasoned.length > 0 ? `
        <details class="neg-reasoned-toggle">
          <summary>Show reasoning for ${aiNegReasoned.length} key negative${aiNegReasoned.length === 1 ? "" : "s"}</summary>
          <div class="neg-reasoned-list">
            ${aiNegReasoned.map((n) => `
              <div class="neg-reason-item">
                <span class="neg-chip">${esc(n.keyword)}</span>
                <span class="neg-reason-text">${esc(n.reason)}</span>
              </div>`).join("")}
          </div>
        </details>` : "";

  const adGroupsHtml = adGroupsRaw
    .map((g, i) => {
      const removeBtn = isPublicView ? "" : `<button class="kw-remove-btn" type="button" onclick="removeKw(this)" title="Remove keyword">&#xD7;</button>`;
      const kwChips = (g.keywords ?? [])
        .map((k) => {
          const volTitle = k.volume != null ? ` title="Volume: ${k.volume.toLocaleString()}"` : "";
          return `<span class="kw-chip" data-keyword="${esc(k.keyword)}"${volTitle}><span class="kw-text">${esc(k.keyword)}</span>${removeBtn}</span>`;
        })
        .join(" ");

      const hiddenNote = g.hiddenLowVolumeCount && g.hiddenLowVolumeCount > 0
        ? `<p class="kw-hidden-note" style="font-size:12px;color:var(--mid);margin:.5rem 0 0">${g.hiddenLowVolumeCount} low/zero-volume keyword${g.hiddenLowVolumeCount === 1 ? "" : "s"} hidden from this view.</p>`
        : "";

      const addRowHtml = isPublicView ? "" : `
          <div class="kw-add-row">
            <input class="kw-add-input" type="text" placeholder="Add keyword…" onkeydown="if(event.key==='Enter'){addKwFromInput(this);event.preventDefault()}" />
            <button class="copy-btn kw-add-btn" type="button" onclick="addKwFromInput(this.previousElementSibling)">Add</button>
          </div>`;

      const saveBtn = isPublicView ? "" : `<button class="copy-btn kw-save-btn" type="button" onclick="saveAgKeywords(this)">Save keywords</button>`;

      const agNameHtml = isPublicView
        ? `<span class="ag-name">${esc(g.name) || `Ad Group ${i + 1}`}</span>`
        : `<span class="ag-name" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" onblur="saveAgName(this)" onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}">${esc(g.name) || `Ad Group ${i + 1}`}</span>`;
      const agAudienceHtml = isPublicView
        ? (g.audience ? `<span class="ag-audience">${esc(g.audience)}</span>` : "")
        : `<span class="ag-audience${g.audience ? "" : " ag-audience-empty"}" contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" onblur="saveAgAudience(this)" onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}" data-placeholder="Add audience…">${g.audience ? esc(g.audience) : ""}</span>`;
      const agDeleteBtn = isPublicView ? "" : `<button class="ag-delete-btn" type="button" onclick="event.stopPropagation();deleteAdGroup(this)" title="Delete ad group">&#xD7;</button>`;
      const agNegPanel = isPublicView ? "" : `
        <div class="ag-neg-section">
          <h5>Ad Group Negatives</h5>
          <div class="ag-neg-chips">
            ${(g.adGroupNegatives ?? []).map((n: string) => `<span class="neg-chip neg-chip-edit" data-neg="${esc(n)}">${esc(n)}<button class="neg-remove-btn" type="button" onclick="removeAgNegative(this)" title="Remove">&#xD7;</button></span>`).join("")}
          </div>
          <div class="kw-add-row">
            <input class="kw-add-input" type="text" placeholder="Add ad group negative…" onkeydown="if(event.key==='Enter'){addAgNegative(this);event.preventDefault()}" />
            <button class="copy-btn kw-add-btn" type="button" onclick="addAgNegative(this.previousElementSibling)">Add</button>
            <button class="copy-btn kw-save-btn" type="button" onclick="saveAgNegatives(this)">Save negatives</button>
          </div>
        </div>`;

      return `
      <div class="ag-section open" data-ag-index="${i}" data-ag-name="${esc(g.name)}">
        <div class="ag-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="ag-num">${i + 1}</span>
          ${agNameHtml}
          ${agAudienceHtml}
          <span class="ag-count">${g.keywords.length} keywords</span>
          ${agDeleteBtn}
          <span class="ag-chevron">+</span>
        </div>
        <div class="ag-body">
          <div class="kw-chip-list">${kwChips}</div>
          ${hiddenNote}${addRowHtml}
          ${agNegPanel}
          <div class="ag-actions">
            <button class="copy-btn" onclick="copyAgKeywords(this)">Copy all keywords in this group</button>
            ${saveBtn}
          </div>
        </div>
      </div>`;
    })
    .join("\n");

  return `
    <section id="google-ads" class="section dark">
      <div class="section-inner">
        <div class="section-kicker blue">Paid Search</div>
        <h2>Google Ads Campaigns</h2>
        ${intro ? `<p class="section-intro section-intro-ai">${esc(intro)}</p>` : ""}
        <div class="campaign-hero">
          <h3 ${!isPublicView ? `contenteditable="true" spellcheck="false" onblur="saveCampaignName(this)" onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}" class="editable-inline"` : ""}>${esc(data.campaignName)}</h3>
        </div>
        <div class="budget-loc-grid">
          <div class="loc-card"><div class="loc-card-label">Monthly Budget</div><div class="loc-budget" ${!isPublicView ? `contenteditable="true" spellcheck="false" onblur="saveBudget(this)" onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}"` : ""}>${esc(monthlyBudget)}</div></div>
          ${locationsHtml}
        </div>
        <details class="neg-section">
          <summary class="neg-section-head">
            <h4>Negative Keywords <span class="neg-count-badge">${consolidatedNegatives.length || "none"}</span></h4>
            ${consolidatedNegatives.length > 0 ? `<button class="copy-btn" onclick="event.stopPropagation();copyAllNegatives(this)">Copy all negatives</button>` : ""}
          </summary>
          <div class="neg-section-body">
          <p class="section-intro" style="margin-top:.25rem">Single combined list across the campaign and every ad group. Click "Copy all negatives" to grab them in one go.</p>
          ${negChipsHtml}
          ${reasonedListHtml}
          ${!isPublicView ? `
          <div class="neg-edit-section">
            <h5 style="margin:1.25rem 0 .5rem;font-size:.85rem;font-weight:700;color:var(--heading)">Edit campaign negatives</h5>
            <div class="neg-edit-chips" id="campaign-neg-chips">
              ${((data.negativeKeywords ?? []) as string[]).map((n) => `<span class="neg-chip neg-chip-edit" data-neg="${esc(n)}">${esc(n)}<button class="neg-remove-btn" type="button" onclick="removeNegative(this)" title="Remove">&#xD7;</button></span>`).join("")}
            </div>
            <div class="kw-add-row" style="margin-top:8px">
              <input class="kw-add-input" type="text" placeholder="Add negative keyword…" onkeydown="if(event.key==='Enter'){addNegative(this);event.preventDefault()}" />
              <button class="copy-btn kw-add-btn" type="button" onclick="addNegative(this.previousElementSibling)">Add</button>
              <button class="copy-btn kw-save-btn" type="button" onclick="saveNegatives(this)" style="margin-top:0">Save</button>
            </div>
          </div>` : ""}
          </div>
        </details>
        <div class="ag-heading-row">
          <h3 class="ag-heading">Ad Groups</h3>
          <button class="copy-btn" onclick="copyAllCampaignKws(this)">Copy all valid keywords (every group)</button>
        </div>
        ${adGroupsHtml}
        ${!isPublicView ? `
        <div class="ag-add-row">
          <input class="kw-add-input" type="text" placeholder="New ad group name\u2026" id="new-ag-input" onkeydown="if(event.key==='Enter'){addAdGroup();event.preventDefault()}" />
          <button class="copy-btn kw-add-btn" type="button" onclick="addAdGroup()">Add ad group</button>
        </div>` : ""}
        ${(() => {
          const seeds = (data.seedSuggestions ?? []) as { theme: string; phrases: string[] }[];
          if (!seeds.length && isPublicView) return "";
          const themesHtml = seeds.map((s, i) => {
            const phrasesHtml = (s.phrases ?? []).map((p) => isPublicView
              ? `<span class="seed-chip kw-text">${esc(p)}</span>`
              : `<span class="seed-chip kw-text seed-chip-edit">${esc(p)}<button class="seed-remove-btn" type="button" onclick="removeSeedPhrase(this)" title="Remove phrase">&#xD7;</button></span>`
            ).join(" ");
            return `
              <details class="seed-theme">
                <summary class="seed-theme-head">
                  <span class="seed-num">${i + 1}</span>
                  <h4 ${!isPublicView ? `contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}"` : ""}>${esc(s.theme)}</h4>
                  <span class="seed-count">${s.phrases.length} phrases</span>
                  <button class="copy-btn" onclick="event.stopPropagation();copySeedTheme(this)">Copy theme</button>
                  ${!isPublicView ? `<button class="seed-delete-btn" type="button" onclick="event.stopPropagation();deleteSeedTheme(this)" title="Delete theme">&#xD7;</button>` : ""}
                </summary>
                <div class="seed-chip-list">
                  ${phrasesHtml}
                  ${!isPublicView ? `<div class="kw-add-row seed-phrase-add-row" style="width:100%;margin-top:8px">
                    <input class="kw-add-input" type="text" placeholder="Add phrase\u2026" onkeydown="if(event.key==='Enter'){addSeedPhrase(this);event.preventDefault()}" />
                    <button class="copy-btn kw-add-btn" type="button" onclick="addSeedPhrase(this.previousElementSibling)">Add</button>
                  </div>` : ""}
                </div>
              </details>`;
          }).join("\n");
          return `
        <div class="seed-section">
          <div class="seed-section-head">
            <h3>Seed Phrase Suggestions for PPC Research</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <button class="copy-btn" onclick="copyAllSeeds(this)">Copy every seed phrase</button>
              ${!isPublicView ? `<button class="copy-btn" id="save-seeds-btn" onclick="saveAllSeeds(this)">Save seeds</button>` : ""}
            </div>
          </div>
          <p class="section-intro" style="margin-top:.25rem">Variants of the core terms above \u2014 alternative names, misspellings, synonyms, abbreviations, regional phrasings. Plug them into Google Keyword Planner and Search Term reports to expand the keyword pool. These are research seeds, not bid recommendations.</p>
          ${themesHtml}
          ${!isPublicView ? `<button class="copy-btn" id="add-seed-theme-btn" onclick="addSeedTheme()" style="margin-top:1rem">+ Add theme</button>` : ""}
        </div>`;
        })()}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderMetaCampaigns(campaigns: any[], clientWebsite?: string, intro?: string): string {
  void clientWebsite;
  const campaignsHtml = campaigns
    .map((c, idx) => {
      const audiences = [
        ...(c.audienceTargeting?.interests ?? []).map((i: string) => `<span class="audience-chip interest">${esc(i)}</span>`),
        ...(c.audienceTargeting?.customAudiences ?? []).map((a: string) => `<span class="audience-chip custom">${esc(a)}</span>`),
        ...(c.audienceTargeting?.lookalikes ?? []).map((l: string) => `<span class="audience-chip lookalike">${esc(l)}</span>`),
      ].join(" ");

      const pillars = (c.contentPillars ?? [])
        .map((p: string) => `<li>${esc(p)}</li>`)
        .join("\n");

      return `
      <details class="meta-campaign">
        <summary class="meta-campaign-header">
          <span class="meta-num">${idx + 1}</span>
          <div>
            <h4>${esc(c.campaignName)}${c.isFallback ? ` <span class="char-badge char-warn" style="margin-left:.5rem;vertical-align:middle" title="AI generation didn't return usable Meta campaigns. Placeholder shown — regenerate from the dashboard.">AI fallback</span>` : ""}</h4>
            <p class="meta-obj">${esc(c.objective)} · ${esc(c.budget)} · ${esc(c.placements)}</p>
          </div>
        </summary>
        <div class="meta-campaign-body">
          <h5>Audience Targeting</h5>
          <div class="audience-list">${audiences}</div>
          ${pillars ? `<h5>Content Pillars</h5><ul class="pillars-list">${pillars}</ul>` : ""}
          ${(c.complianceNotes ?? []).length ? `<div class="compliance-callout"><strong>Platform / compliance notes</strong><ul>${(c.complianceNotes ?? []).map((n: string) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
        </div>
      </details>`;
    })
    .join("\n");

  return `
    <section id="meta-campaigns" class="section">
      <div class="section-inner">
        <div class="section-kicker">Paid Social</div>
        <h2>Meta Campaigns</h2>
      <p class="section-intro">${intro ? esc(intro) : "Facebook and Instagram campaign structures with audience targeting and content pillars."}</p>
      ${campaignsHtml}
      </div>
    </section>`;
}

// renderKeywordResearch removed — keyword research is now embedded inside the Google Ads section.

/**
 * Convert a single brief text blob into structured HTML.
 * Detects inline labelled sections like "Modules:", "H2s:", "FAQ:",
 * "CTA:" and renders each as its own labelled paragraph or bullet list.
 * Single-quote-wrapped items inside a labelled section become bullets.
 * Falls back to paragraph-per-sentence if no structure is detected.
 */
function formatBriefBlock(raw: string): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  // Section labels we recognise (case-insensitive). Anything matching becomes
  // its own heading + body. Order matters — longer labels first.
  const LABELS = [
    "Hero headline", "Lead paragraph", "Lead", "Modules", "Sections",
    "H2 headings", "H2s", "H3s", "Sub-headings", "FAQ", "FAQs",
    "Internal linking", "Internal links", "Schema", "Schema markup",
    "Tone", "Voice", "CTA", "Calls to action", "Notes", "Writer note",
    "Word count", "Word-count", "Length", "Format", "Visuals",
    "Trust signals", "Social proof", "Conversion", "Conversion goal",
  ];
  const labelRegex = new RegExp(`(?:^|\\.\\s+)(${LABELS.join("|")})\\s*:\\s*`, "gi");

  // Split the text into label-prefixed chunks. We do this by finding each
  // label match position and slicing in between.
  type Chunk = { label?: string; body: string };
  const matches: { idx: number; label: string; matchEnd: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = labelRegex.exec(text)) !== null) {
    // Skip leading "." that we matched — record the position of the label itself.
    const labelStart = m.index + (m[0].startsWith(".") ? m[0].indexOf(m[1]) : 0);
    matches.push({ idx: labelStart, label: m[1], matchEnd: m.index + m[0].length });
  }

  const chunks: Chunk[] = [];
  if (matches.length === 0) {
    chunks.push({ body: text });
  } else {
    if (matches[0].idx > 0) chunks.push({ body: text.slice(0, matches[0].idx).trim() });
    matches.forEach((mt, i) => {
      const next = matches[i + 1];
      const body = text.slice(mt.matchEnd, next?.idx ?? text.length).trim().replace(/\.\s*$/, "");
      if (body) chunks.push({ label: mt.label, body });
    });
  }

  // Render each chunk. If the body contains 'quoted items', or comma-separated
  // short items after a recognised list-style label, render as bullets.
  const LIST_LABELS = new Set(["Modules", "Sections", "H2 headings", "H2s", "H3s", "Sub-headings", "FAQ", "FAQs", "Internal linking", "Internal links", "Visuals", "Trust signals", "CTA", "Calls to action"]);

  const renderChunk = (c: Chunk): string => {
    const labelHtml = c.label ? `<div class="cc-brief-label">${esc(c.label)}</div>` : "";

    // Try to extract single-quoted items first ('item one', 'item two')
    const quoted = [...c.body.matchAll(/['"]([^'"]{2,160})['"]/g)].map((q) => q[1].trim());
    const looksList = c.label && LIST_LABELS.has(c.label);

    if (quoted.length >= 2 && (looksList || quoted.length >= 3)) {
      return `${labelHtml}<ul class="cc-brief-list">${quoted.slice(0, 12).map((q) => `<li>${esc(q)}</li>`).join("")}</ul>`;
    }

    // Comma-separated short items under a list-style label
    if (looksList) {
      const items = c.body.split(/,(?![^()]*\))/g).map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter((s) => s.length > 1 && s.length <= 200);
      if (items.length >= 2) {
        return `${labelHtml}<ul class="cc-brief-list">${items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
      }
    }

    // Default: split body into 1-2 sentence paragraphs
    const sentences = c.body.split(/(?<=[.!?])\s+(?=[A-Z'"])/).filter(Boolean);
    const paras: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      paras.push(sentences.slice(i, i + 2).join(" "));
    }
    return `${labelHtml}${paras.map((p) => `<p>${esc(p)}</p>`).join("")}`;
  };

  return chunks.map(renderChunk).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderContentStrategy(data: any, intro?: string, audienceRationales?: Record<string, string>): string {
  type Entry = {
    url?: string; title?: string;
    keywords?: { keyword: string; volume?: number }[];
    notes?: string; brief?: string;
    summary?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string[];
    longTailKeywords?: string[];
    tier?: "pillar" | "mega" | "article";
    intent?: string;
    // Content-strategy generator returns {url, anchorText} objects, but legacy
    // data may be plain strings. Render handles both shapes.
    internalLinks?: (string | { url?: string; anchorText?: string })[];
    targetAudiences?: string[];
    // ── Structured on-page optimisation fields (AI clusters) ──
    titleTag?: string;
    metaDescription?: string;
    contentEnhancements?: string[];
    schema?: string;
    // ── Deep enrichment fields (Now → Better) ──
    currentState?: {
      title?: string;
      titleLength?: number;
      metaDescription?: string;
      metaDescriptionLength?: number;
      h1?: string;
      schemaTypes?: string[];
      hasFaqSchema?: boolean;
      hasFaqContent?: boolean;
      totalRankingKeywords?: number;
      topCurrentKeywords?: { keyword: string; position: number; volume: number }[];
    };
    suggestedTitle?: string;
    suggestedMetaDescription?: string;
    suggestedKeywords?: {
      keyword: string;
      volume?: number;
      difficulty?: number;
      currentPosition?: number;
      potentialBand: string;
      rationale: string;
    }[];
    recommendedSchema?: string[];
    schemaGaps?: string[];
    faq?: {
      hasExisting: boolean;
      recommendation: "add" | "expand" | "ok";
      items: { question: string; answer: string }[];
    };
  };

  const pageOpts = (data.pageOptimisations ?? []).slice(0, 15) as Entry[];
  const landingPages = (data.landingPages ?? []) as Entry[];
  const blogPosts = (data.blogPosts ?? []).slice(0, 12) as Entry[];

  // Build cluster: 1 Pillar + 1-2 Mega + N Articles. Use explicit tier when
  // present, else derive from list position.
  const pillar = landingPages.find((p) => p.tier === "pillar") ?? landingPages[0];
  const megas = landingPages.filter((p) => p !== pillar).slice(0, 2);
  const articles = blogPosts;

  const intentClass = (intent?: string): string => {
    if (!intent) return "";
    const v = intent.toLowerCase();
    if (v.startsWith("dec")) return "intent-dc";
    if (v.includes("transact") || v.includes("convers") || v.includes("purchase")) return "intent-tr";
    if (v.startsWith("comm") || v.includes("consider") || v.includes("compar")) return "intent-cm";
    if (v.includes("info") || v.includes("how to") || v.includes("educat") || v.includes("learn") || v.includes("guide")) return "intent-in";
    return "intent-aw";
  };
  const intentLabel = (intent?: string): string => {
    if (!intent) return "";
    const v = intent.toLowerCase();
    if (v.startsWith("dec")) return "Decision";
    if (v.includes("transact") || v.includes("convers") || v.includes("purchase")) return "Transactional";
    if (v.startsWith("comm") || v.includes("consider") || v.includes("compar")) return "Commercial";
    if (v.includes("info") || v.includes("how to") || v.includes("educat") || v.includes("learn") || v.includes("guide")) return "Informational";
    return "Awareness";
  };

  const card = (entry: Entry, tier: "pillar" | "mega" | "article", typeLabel: string): string => {
    const primary = entry.primaryKeyword ?? entry.keywords?.[0]?.keyword;
    const intent = entry.intent;
    const secondary = entry.secondaryKeywords ?? [];
    const longTail = entry.longTailKeywords ?? [];
    const audChips = (entry.targetAudiences ?? []).slice(0, 3)
      .map((n) => `<span class="audience-tag">${esc(n)}</span>`).join(" ");
    return `
      <details class="cluster-card ${tier}">
        <summary class="cluster-card-head">
          <span class="cluster-type-pill">${esc(typeLabel)}</span>
          ${intent ? `<span class="cc-intent ${intentClass(intent)}">${esc(intentLabel(intent))}</span>` : ""}
          <span class="cc-title-summary">${esc(entry.title ?? entry.url ?? "Untitled")}</span>
        </summary>
        <div class="cluster-card-body">
          <div class="cc-title">${esc(entry.title ?? entry.url ?? "Untitled")}</div>
          ${primary ? `
          <div class="cc-kw-block">
            <div class="cc-kw-label">Primary keyword</div>
            <div class="cc-kw-primary">${esc(primary)}</div>
          </div>` : ""}
          ${secondary.length ? `
          <div class="cc-kw-block">
            <div class="cc-kw-label">Secondary keywords</div>
            <div class="cc-kw-chips">${secondary.slice(0, 6).map((k) => `<span class="kw-pill">${esc(k)}</span>`).join(" ")}</div>
          </div>` : ""}
          ${longTail.length ? `
          <div class="cc-kw-block">
            <div class="cc-kw-label">Long-tail variants</div>
            <div class="cc-kw-chips">${longTail.slice(0, 8).map((k) => `<span class="kw-pill kw-pill-mute">${esc(k)}</span>`).join(" ")}</div>
          </div>` : ""}
          ${audChips ? `<div class="cc-audiences-block"><div class="cc-audiences-label">Planned audience</div><div class="cc-audiences">${audChips}</div></div>` : ""}
        </div>
      </details>`;
  };

  const clusterCards: string[] = [];
  if (pillar) clusterCards.push(card(pillar, "pillar", "Pillar Page"));
  megas.forEach((m, i) => clusterCards.push(card(m, "mega", megas.length === 1 ? "Mega Guide" : `Mega Guide ${i + 1}`)));
  articles.forEach((a, i) => clusterCards.push(card(a, "article", `Article ${i + 1}`)));

  const allInternalLinks = [
    ...(pillar?.internalLinks ?? []),
    ...megas.flatMap((m) => m.internalLinks ?? []),
    ...articles.flatMap((a) => a.internalLinks ?? []),
  ];
  // Normalise into { url, anchorText } pairs and dedupe by URL+anchor combo.
  const normalisedLinks = allInternalLinks
    .map((s) => {
      if (typeof s === "string") {
        // Older string-only data: treat the whole string as the anchor.
        return { url: "", anchorText: s.trim() };
      }
      return { url: (s?.url ?? "").trim(), anchorText: (s?.anchorText ?? "").trim() };
    })
    .filter((l) => l.url || l.anchorText);
  const seenLinks = new Set<string>();
  const dedupedLinks = normalisedLinks.filter((l) => {
    const key = `${l.url}|${l.anchorText}`.toLowerCase();
    if (seenLinks.has(key)) return false;
    seenLinks.add(key);
    return true;
  });
  const internalLinkingHtml = dedupedLinks.length > 0 ? `
    <div class="il-section">
      <h3>Internal Linking Recommendations</h3>
      <p class="cluster-block-sub" style="margin-bottom:.75rem">Link new content to these existing pages with the suggested anchor text to push authority through the cluster.</p>
      <div class="il-grid">
        ${dedupedLinks.slice(0, 12).map((l) => {
          const anchor = l.anchorText || l.url || "";
          const linkHtml = l.url
            ? `<a class="il-link" href="${esc(l.url.startsWith("http") ? l.url : `https://${l.url}`)}" target="_blank" rel="noopener">${esc(anchor)}</a>`
            : `<span>${esc(anchor)}</span>`;
          const urlSub = l.url && l.anchorText ? `<span class="il-url">${esc(l.url)}</span>` : "";
          return `<div class="il-item"><span class="il-arrow">&#8594;</span><span class="il-text">${linkHtml}${urlSub}</span></div>`;
        }).join("\n")}
      </div>
    </div>` : "";

  const clusterBlock = clusterCards.length > 0 ? `
    <div class="cluster-block">
      <h3 class="cluster-block-title">Topic Cluster</h3>
      <p class="cluster-block-sub">A pillar page anchors the topic, supported by a mega guide and themed articles. Each article has a target keyword, search intent and a writer brief.</p>
      <div class="cluster-grid">${clusterCards.join("\n")}</div>
      ${internalLinkingHtml}
    </div>` : "";

  const pageOptsHtml = pageOpts.length > 0 ? `
    <h3 style="margin-top:2rem">On-Page Optimisations</h3>
    <p class="section-intro" style="margin-bottom:1rem">Existing pages that need a refresh — title tags, meta descriptions, content depth, internal links, and schema.</p>
    <div class="content-cards">
      ${pageOpts.map((p) => {
        const url = p.url || "";
        const audChips = (p.targetAudiences ?? []).slice(0, 3)
          .map((n) => `<span class="audience-tag">${esc(n)}</span>`).join(" ");
        const internalLinksList = (p.internalLinks ?? [])
          .map((l) => typeof l === "string" ? l : (l.anchorText ?? l.url ?? ""))
          .filter(Boolean)
          .slice(0, 5);
        const hasStructured = !!(p.titleTag || p.metaDescription || (p.contentEnhancements && p.contentEnhancements.length) || internalLinksList.length || p.schema);
        const structuredHtml = hasStructured ? `
          <div class="onpage-structured">
            ${p.titleTag ? `<div class="onpage-row"><span class="onpage-label">Title tag</span><div class="onpage-val">${esc(p.titleTag)} <span class="char-badge ${p.titleTag.length <= 60 ? "char-ok" : "char-over"}">${p.titleTag.length}/60</span></div></div>` : ""}
            ${p.metaDescription ? `<div class="onpage-row"><span class="onpage-label">Meta description</span><div class="onpage-val">${esc(p.metaDescription)} <span class="char-badge ${p.metaDescription.length <= 160 ? "char-ok" : "char-over"}">${p.metaDescription.length}/160</span></div></div>` : ""}
            ${p.contentEnhancements?.length ? `<div class="onpage-row"><span class="onpage-label">Content enhancements</span><ul class="onpage-list">${p.contentEnhancements.slice(0, 6).map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}
            ${internalLinksList.length ? `<div class="onpage-row"><span class="onpage-label">Internal links</span><div class="onpage-chips">${internalLinksList.map((l) => `<span class="kw-pill kw-pill-mute">${esc(l)}</span>`).join(" ")}</div></div>` : ""}
            ${p.schema ? `<div class="onpage-row"><span class="onpage-label">Schema</span><div class="onpage-val"><code>${esc(p.schema)}</code></div></div>` : ""}
          </div>` : "";

        // ── Deep-enrichment "Now → Better" blocks ────────────────────────
        const cs = p.currentState;
        const hasCurrentState = !!(cs && (cs.title || cs.metaDescription || cs.h1 || (cs.schemaTypes?.length) || (cs.totalRankingKeywords ?? 0) > 0));
        const charBadge = (text: string, max: number) => {
          const len = text.length;
          const cls = len === 0 ? "char-over" : len <= max ? "char-ok" : "char-over";
          return `<span class="char-badge ${cls}">${len}/${max}</span>`;
        };
        const faqPill = cs?.hasFaqSchema
          ? `<span class="status-chip status-chip-ok" title="FAQPage schema detected">FAQ schema \u2713</span>`
          : cs?.hasFaqContent
            ? `<span class="status-chip status-chip-warn" title="FAQ content detected but no schema">FAQ content (no schema)</span>`
            : `<span class="status-chip status-chip-miss" title="No FAQ detected">No FAQ</span>`;
        const currentStateHtml = hasCurrentState ? `
          <div class="page-state-block">
            <h5 class="page-state-heading">Current state</h5>
            <div class="page-state-grid">
              ${cs?.title ? `<div class="onpage-row"><span class="onpage-label">Title</span><div class="onpage-val">${esc(cs.title)} ${charBadge(cs.title, 60)}</div></div>` : `<div class="onpage-row"><span class="onpage-label">Title</span><div class="onpage-val onpage-missing">Missing</div></div>`}
              ${cs?.metaDescription ? `<div class="onpage-row"><span class="onpage-label">Meta description</span><div class="onpage-val">${esc(cs.metaDescription)} ${charBadge(cs.metaDescription, 160)}</div></div>` : `<div class="onpage-row"><span class="onpage-label">Meta description</span><div class="onpage-val onpage-missing">Missing</div></div>`}
              ${cs?.h1 ? `<div class="onpage-row"><span class="onpage-label">H1</span><div class="onpage-val">${esc(cs.h1)}</div></div>` : ""}
              ${cs?.schemaTypes?.length ? `<div class="onpage-row"><span class="onpage-label">Schema present</span><div class="onpage-chips">${cs.schemaTypes.map((s) => `<span class="kw-pill kw-pill-mute">${esc(s)}</span>`).join(" ")}</div></div>` : `<div class="onpage-row"><span class="onpage-label">Schema present</span><div class="onpage-val onpage-missing">None detected</div></div>`}
              ${(cs?.totalRankingKeywords ?? 0) > 0 ? `<div class="onpage-row"><span class="onpage-label">Currently ranks for</span><div class="onpage-val"><strong>${cs!.totalRankingKeywords}</strong> keyword${cs!.totalRankingKeywords === 1 ? "" : "s"}${cs!.topCurrentKeywords?.length ? ` \u2014 top ${Math.min(5, cs!.topCurrentKeywords.length)}: ${cs!.topCurrentKeywords.slice(0, 5).map((k) => `<span class="kw-pill kw-pill-mute">${esc(k.keyword)} (#${k.position})</span>`).join(" ")}` : ""}</div></div>` : `<div class="onpage-row"><span class="onpage-label">Currently ranks for</span><div class="onpage-val onpage-missing">No SEMrush data</div></div>`}
              <div class="onpage-row"><span class="onpage-label">FAQ status</span><div class="onpage-val">${faqPill}</div></div>
            </div>
          </div>` : "";

        const hasRewrites = !!(p.suggestedTitle || p.suggestedMetaDescription);
        const rewritesHtml = hasRewrites ? `
          <div class="page-rewrite-block">
            <h5 class="page-state-heading">Recommended rewrites</h5>
            ${p.suggestedTitle ? `<div class="onpage-row"><span class="onpage-label">Title \u2192</span><div class="onpage-val onpage-suggest">${esc(p.suggestedTitle)} ${charBadge(p.suggestedTitle, 60)}</div></div>` : ""}
            ${p.suggestedMetaDescription ? `<div class="onpage-row"><span class="onpage-label">Meta \u2192</span><div class="onpage-val onpage-suggest">${esc(p.suggestedMetaDescription)} ${charBadge(p.suggestedMetaDescription, 160)}</div></div>` : ""}
          </div>` : "";

        const sk = p.suggestedKeywords ?? [];
        const suggestedKeywordsHtml = sk.length ? `
          <div class="page-kw-block">
            <h5 class="page-state-heading">Suggested keywords (and where they could rank)</h5>
            <div class="kw-table-wrap">
              <table class="kw-table">
                <thead><tr><th>Keyword</th><th>Vol</th><th>KD</th><th>Currently</th><th>Potential</th><th>Why</th></tr></thead>
                <tbody>
                  ${sk.map((k) => `<tr>
                    <td><strong>${esc(k.keyword)}</strong></td>
                    <td>${k.volume != null ? k.volume.toLocaleString() : "\u2013"}</td>
                    <td>${k.difficulty != null ? k.difficulty : "\u2013"}</td>
                    <td>${k.currentPosition != null ? `#${k.currentPosition}` : "Not ranking"}</td>
                    <td><span class="potential-band band-${esc(k.potentialBand.replace(/\s+/g, "-").toLowerCase())}">${esc(k.potentialBand)}</span></td>
                    <td class="kw-rationale">${esc(k.rationale)}</td>
                  </tr>`).join("")}
                </tbody>
              </table>
            </div>
          </div>` : "";

        const recSchema = p.recommendedSchema ?? [];
        const schemaGaps = new Set(p.schemaGaps ?? []);
        const schemaHtml = recSchema.length ? `
          <div class="page-schema-block">
            <h5 class="page-state-heading">Recommended schema</h5>
            <div class="onpage-chips">
              ${recSchema.map((s) => {
                const missing = schemaGaps.has(s);
                return `<span class="kw-pill ${missing ? "kw-pill-miss" : "kw-pill-ok"}" title="${missing ? "Currently missing" : "Already present"}">${esc(s)}${missing ? " \u2014 add" : " \u2713"}</span>`;
              }).join(" ")}
            </div>
          </div>` : "";

        const faq = p.faq;
        const faqHtml = faq && faq.recommendation !== "ok" && faq.items.length ? `
          <div class="page-faq-block">
            <h5 class="page-state-heading">${faq.recommendation === "expand" ? "Expand the FAQ" : "Add an FAQ section"} \u2014 draft Q+A</h5>
            ${faq.items.map((it) => `<details class="faq-item">
              <summary>${esc(it.question)}</summary>
              <div class="faq-answer">${esc(it.answer)}</div>
            </details>`).join("")}
          </div>` : "";

        return `
      <div class="content-card">
        <div class="content-url-row">
          <a class="content-url" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(url)}">${esc(url)}</a>
          ${url ? `<button type="button" class="content-url-copy" data-copy="${esc(url)}" aria-label="Copy URL">Copy</button>` : ""}
        </div>
        ${p.keywords?.length ? `<div class="content-kws">${p.keywords.slice(0, 5).map((k) => `<span class="kw-pill">${esc(k.keyword)}</span>`).join(" ")}</div>` : ""}
        ${audChips ? `<div class="cc-audiences" style="margin-top:6px">${audChips}</div>` : ""}
        ${currentStateHtml}
        ${rewritesHtml}
        ${suggestedKeywordsHtml}
        ${schemaHtml}
        ${faqHtml}
        ${structuredHtml}
        ${!hasStructured && !hasCurrentState && !hasRewrites && p.notes ? `<div class="content-notes">${formatBriefBlock(p.notes)}</div>` : ""}
        ${(hasCurrentState || hasRewrites) && p.notes ? `<div class="content-notes" style="margin-top:.75rem"><strong>Notes:</strong> ${formatBriefBlock(p.notes)}</div>` : ""}
      </div>`;
      }).join("\n")}
    </div>` : "";

  // Audience Plays panel removed.
  void audienceRationales;
  // The "On-Page Optimisations" block was retired in favour of the
  // SEO Foundations > Quick Wins on Existing Pages block, which carries
  // the same data with deeper enrichment. We keep the variable assignment
  // (pageOpts is still derived above) so the typed pipeline remains intact
  // but no longer render it.
  void pageOptsHtml;

  return `
    <section id="content-strategy" class="section">
      <div class="section-inner">
        <div class="section-kicker">Content & SEO</div>
        <h2>Content & SEO Strategy</h2>
        <p class="section-intro">${intro ? esc(intro) : "A topic-cluster approach: one anchoring pillar page, supporting deep-dive guides, and themed articles that capture every stage of intent."}</p>
      ${clusterBlock}
      </div>
    </section>`;
}

// ─── SEO Foundations renderer ───────────────────────────────────────────────
// Renders the three SEO pieces that sit alongside the content cluster:
// quick-win on-page fixes, internal linking structure, outbound link-building plan.
type SeoFoundationsData = {
  intro?: string;
  quickWins?: Array<{
    url: string;
    pageTitle?: string;
    rationale?: string;
    intent?: string;
    keywords?: { primary?: string; secondary?: string[]; longTail?: string[] };
    newTitleTag?: string;
    newMetaDescription?: string;
    onPageSuggestions?: string[];
    crossLinksToAdd?: { targetUrl: string; anchorText: string; rationale?: string }[];
    estimatedTimeToImpact?: string;
    effort?: string;
  }>;
  internalLinking?: {
    overview?: string;
    hubs?: Array<{
      hubUrl: string;
      hubTitle?: string;
      hubRole?: string;
      inboundLinks?: { fromUrl: string; anchorText: string; rationale?: string }[];
    }>;
  };
  linkBuilding?: {
    overallStrategy?: string;
    targets?: Array<{
      targetUrl: string;
      targetPageTitle?: string;
      priority?: string;
      rationale?: string;
      anchorMix?: { anchorText: string; anchorType: string; suggestedShare?: string }[];
      outreachAngles?: string[];
      estimatedLinksNeeded?: string;
    }>;
    outreachChannels?: string[];
  };
};

function renderSeoFoundations(data: SeoFoundationsData): string {
  const quickWins = data.quickWins ?? [];
  const linking = data.internalLinking ?? {};
  const hubs = linking.hubs ?? [];
  const lb = data.linkBuilding ?? {};
  const targets = lb.targets ?? [];
  const channels = lb.outreachChannels ?? [];

  const anchorTypeLabel = (t: string): string => {
    const v = (t || "").toLowerCase();
    if (v === "exact") return "Exact match";
    if (v === "partial") return "Partial match";
    if (v === "branded" || v === "brand") return "Branded";
    if (v === "naked-url" || v === "naked") return "Naked URL";
    return "Generic";
  };
  const anchorTypeClass = (t: string): string => {
    const v = (t || "").toLowerCase();
    if (v === "exact") return "anchor-exact";
    if (v === "partial") return "anchor-partial";
    if (v === "branded" || v === "brand") return "anchor-branded";
    if (v === "naked-url" || v === "naked") return "anchor-naked";
    return "anchor-generic";
  };
  const priorityClass = (p?: string): string => {
    const v = (p || "").toLowerCase();
    if (v.includes("1")) return "tier-pill-1";
    if (v.includes("2")) return "tier-pill-2";
    return "tier-pill-3";
  };
  const linkUrl = (u: string | null | undefined): string => {
    const s = (u ?? "").toString().trim();
    if (!s) return "#";
    if (s.startsWith("http") || s.startsWith("/")) return s;
    return `https://${s}`;
  };

  const quickWinsHtml = quickWins.length ? `
    <h3 class="seo-sub-heading">Quick Wins on Existing Pages</h3>
    <p class="seo-sub-intro">Existing pages that can move within weeks: rewritten title tags, refreshed meta descriptions, and the cross-links to add inside the page body.</p>
    <div class="qw-grid">
      ${quickWins.map((q, qi) => {
        const title = q.newTitleTag ?? "";
        const meta = q.newMetaDescription ?? "";
        const cross = q.crossLinksToAdd ?? [];
        const onPage = q.onPageSuggestions ?? [];
        const kw = q.keywords ?? {};
        const secondary = kw.secondary ?? [];
        const longTail = kw.longTail ?? [];
        const intentClass = (q.intent || "").toLowerCase();
        const faqItems = (q as { suggestedFaq?: { question: string; answer: string }[] }).suggestedFaq ?? [];
        const schemaItems = (q as { suggestedSchema?: { type: string; jsonLd: string }[] }).suggestedSchema ?? [];
        // Embed payloads as inline <script type="application/json"> blocks keyed
        // by id. Far more robust than base64 in attributes for nested JSON-LD.
        const safeJsonForScript = (obj: unknown): string =>
          JSON.stringify(obj).replace(/<\/(script)/gi, "<\\/$1");
        const faqId = `qw-faq-data-${qi}`;
        const schemaId = `qw-schema-data-${qi}`;
        const faqDataScript = faqItems.length
          ? `<script type="application/json" id="${faqId}">${safeJsonForScript({ url: q.url, items: faqItems })}</script>`
          : "";
        const schemaDataScript = schemaItems.length
          ? `<script type="application/json" id="${schemaId}">${safeJsonForScript({ url: q.url, items: schemaItems })}</script>`
          : "";
        return `
        <div class="qw-card" id="qw-card-${qi}">
          <div class="qw-head">
            <a class="qw-url" href="${esc(linkUrl(q.url))}" target="_blank" rel="noopener">${esc(q.url)}</a>
            <div class="qw-badges">
              ${q.intent ? `<span class="qw-badge qw-intent qw-intent-${esc(intentClass)}">${esc(q.intent)} intent</span>` : ""}
            </div>
          </div>
          ${q.pageTitle ? `<div class="qw-page-title">${esc(q.pageTitle)}</div>` : ""}
          ${q.rationale ? `<p class="qw-rationale">${esc(q.rationale)}</p>` : ""}
          ${kw.primary ? `
          <div class="qw-row">
            <div class="qw-row-label">Target keywords</div>
            <div class="qw-row-val">
              <div class="qw-kw-line"><span class="qw-kw-label qw-kw-primary">Primary</span> <strong>${esc(kw.primary)}</strong></div>
              ${secondary.length ? `<div class="qw-kw-line"><span class="qw-kw-label qw-kw-secondary">Secondary</span> ${secondary.map((k) => `<span class="qw-kw-chip">${esc(k)}</span>`).join(" ")}</div>` : ""}
              ${longTail.length ? `<div class="qw-kw-line"><span class="qw-kw-label qw-kw-longtail">Long-tail</span> ${longTail.map((k) => `<span class="qw-kw-chip qw-kw-chip-lt">${esc(k)}</span>`).join(" ")}</div>` : ""}
            </div>
          </div>` : ""}
          ${(title || meta || onPage.length || cross.length || faqItems.length || schemaItems.length) ? `
          <details class="qw-optimisation-details">
            <summary>Optimisation details</summary>
            <div class="qw-optimisation-body">
          ${title ? `
          <div class="qw-row">
            <div class="qw-row-label">New title tag</div>
            <div class="qw-row-val">${esc(title)} <span class="char-badge ${title.length <= 60 ? "char-ok" : "char-over"}">${title.length}/60</span></div>
          </div>` : ""}
          ${meta ? `
          <div class="qw-row">
            <div class="qw-row-label">New meta description</div>
            <div class="qw-row-val">${esc(meta)} <span class="char-badge ${meta.length <= 160 ? "char-ok" : "char-over"}">${meta.length}/160</span></div>
          </div>` : ""}
          ${onPage.length ? `
          <div class="qw-row">
            <div class="qw-row-label">On-page suggestions</div>
            <ul class="qw-onpage-list">
              ${onPage.map((s) => `<li>${esc(s)}</li>`).join("")}
            </ul>
          </div>` : ""}
          ${cross.length ? `
          <div class="qw-row">
            <div class="qw-row-label">Cross-links to add</div>
            <ul class="qw-cross-list">
              ${cross.map((c) => `
                <li>
                  <span class="qw-cross-anchor">"${esc(c.anchorText)}"</span>
                  <span class="qw-cross-arrow">&rarr;</span>
                  <a class="qw-cross-url" href="${esc(linkUrl(c.targetUrl))}" target="_blank" rel="noopener">${esc(c.targetUrl)}</a>
                  ${c.rationale ? `<div class="qw-cross-why">${esc(c.rationale)}</div>` : ""}
                </li>`).join("")}
            </ul>
          </div>` : ""}
          ${(faqItems.length || schemaItems.length) ? `
          <div class="qw-actions">
            ${faqItems.length ? `<button type="button" class="qw-action-btn qw-action-faq" data-qw-modal="faq" data-qw-target="${faqId}"><span class="qw-action-ico">&#x2753;</span>Suggested FAQs<span class="qw-action-count">${faqItems.length}</span></button>` : ""}
            ${schemaItems.length ? `<button type="button" class="qw-action-btn qw-action-schema" data-qw-modal="schema" data-qw-target="${schemaId}"><span class="qw-action-ico">&lt;/&gt;</span>Suggested schema<span class="qw-action-count">${schemaItems.length}</span></button>` : ""}
          </div>
          ${faqDataScript}${schemaDataScript}` : ""}
            </div>
          </details>` : ""}
        </div>`;
      }).join("\n")}
    </div>` : "";

  const internalLinkingHtml = hubs.length ? `
    <h3 class="seo-sub-heading">Internal Linking Structure</h3>
    ${linking.overview ? `<p class="seo-sub-intro">${esc(linking.overview)}</p>` : ""}
    <div class="ils-grid">
      ${hubs.map((h) => `
        <div class="ils-hub">
          <div class="ils-hub-head">
            <span class="ils-hub-pill">Hub</span>
            <a class="ils-hub-url" href="${esc(linkUrl(h.hubUrl))}" target="_blank" rel="noopener">${esc(h.hubTitle || h.hubUrl)}</a>
          </div>
          ${h.hubUrl && h.hubTitle ? `<div class="ils-hub-sub">${esc(h.hubUrl)}</div>` : ""}
          ${h.hubRole ? `<p class="ils-hub-role">${esc(h.hubRole)}</p>` : ""}
          ${h.inboundLinks?.length ? `
          <div class="ils-inbound-label">Inbound links from</div>
          <ul class="ils-inbound-list">
            ${h.inboundLinks.map((l) => `
              <li>
                <a class="ils-from-url" href="${esc(linkUrl(l.fromUrl))}" target="_blank" rel="noopener">${esc(l.fromUrl)}</a>
                <span class="ils-arrow">&rarr;</span>
                <span class="ils-anchor">"${esc(l.anchorText)}"</span>
                ${l.rationale ? `<div class="ils-why">${esc(l.rationale)}</div>` : ""}
              </li>`).join("")}
          </ul>` : ""}
        </div>`).join("\n")}
    </div>` : "";

  const linkBuildingHtml = (targets.length || lb.overallStrategy) ? `
    <h3 class="seo-sub-heading">Outbound Link-Building Plan</h3>
    ${lb.overallStrategy ? `<p class="seo-sub-intro">${esc(lb.overallStrategy)}</p>` : ""}
    ${channels.length ? `
    <div class="lb-channels">
      <span class="lb-channels-label">Outreach channels</span>
      ${channels.map((c) => `<span class="lb-channel-chip">${esc(c)}</span>`).join("")}
    </div>` : ""}
    <div class="lb-grid">
      ${targets.map((t) => `
        <div class="lb-target">
          <div class="lb-target-head">
            <span class="tier-pill ${priorityClass(t.priority)}">${esc(t.priority || "tier-3")}</span>
            <a class="lb-target-url" href="${esc(linkUrl(t.targetUrl))}" target="_blank" rel="noopener">${esc(t.targetPageTitle || t.targetUrl)}</a>
            ${t.estimatedLinksNeeded ? `<span class="lb-est">${esc(t.estimatedLinksNeeded)}</span>` : ""}
          </div>
          ${t.targetPageTitle ? `<div class="lb-target-sub">${esc(t.targetUrl)}</div>` : ""}
          ${t.rationale ? `<p class="lb-rationale">${esc(t.rationale)}</p>` : ""}
          ${t.anchorMix?.length ? `
          <div class="lb-anchor-label">Anchor text mix</div>
          <table class="lb-anchor-table">
            <thead><tr><th>Anchor text</th><th>Type</th><th>Share</th></tr></thead>
            <tbody>
              ${t.anchorMix.map((a) => `
                <tr>
                  <td class="lb-anchor-text">"${esc(a.anchorText)}"</td>
                  <td><span class="anchor-type-pill ${anchorTypeClass(a.anchorType)}">${esc(anchorTypeLabel(a.anchorType))}</span></td>
                  <td class="lb-anchor-share">${esc(a.suggestedShare || "")}</td>
                </tr>`).join("")}
            </tbody>
          </table>` : ""}
          ${t.outreachAngles?.length ? `
          <div class="lb-angles-label">Outreach angles</div>
          <ul class="lb-angles">${t.outreachAngles.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
        </div>`).join("\n")}
    </div>` : "";

  return `
    <section id="seo-foundations" class="section">
      <div class="section-inner">
        <div class="section-kicker">Content & SEO</div>
        <h2>SEO Foundations</h2>
        <p class="section-intro">${data.intro ? esc(data.intro) : "The on-page, internal linking and outbound link-building work that compounds the content cluster's results."}</p>
        ${quickWinsHtml}
        ${internalLinkingHtml}
        ${linkBuildingHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderContentCalendar(months: any[]): string {
  // Item taxonomy — each row in the Gantt has a fixed type, label, and colour.
  // Pillar pages are detected by title containing "pillar" so they get their
  // own row even though the upstream type is just "blog".
  type Slot = { type: string; label: string; topic: string; meta?: string; intent?: string };
  type RowDef = { key: string; label: string; cls: string };
  const ROWS: RowDef[] = [
    { key: "pillar",    label: "Pillar Page", cls: "row-pillar" },
    { key: "reel",      label: "Reel",        cls: "row-reel" },
    { key: "carousel",  label: "Carousel",    cls: "row-carousel" },
    { key: "static",    label: "Static Post", cls: "row-static" },
    { key: "story",     label: "Story",       cls: "row-story" },
  ];

  // Normalise each month into a list of typed slots, then split into 4 weeks.
  const monthBuckets: { label: string; focus?: string; weeks: Slot[][] }[] = months.map((m) => {
    const blogs: Slot[] = (m.blogPosts ?? []).map((b: { title: string; intent: string; targetKeyword: string; angle?: string }) => {
      const isPillar = /pillar/i.test(b.title || "");
      return {
        type: isPillar ? "pillar" : "blog",
        label: isPillar ? "PILLAR" : "BLOG",
        topic: b.title || "",
        meta: b.angle || b.targetKeyword || "",
        intent: b.intent,
      };
    });
    const socials: Slot[] = (m.socialPosts ?? []).map((s: { platform: string; type: string; topic: string }) => {
      const t = (s.type || "static").toLowerCase();
      const key = ["reel", "carousel", "static", "story"].includes(t) ? t : "static";
      return {
        type: key,
        label: key.toUpperCase(),
        topic: s.topic || "",
        meta: s.platform || "",
      };
    });
    // Spread items across 4 weeks. Blog/pillar first, then social — keeps the
    // hero asset early in the week and saturates social through the rest.
    const all = [...blogs, ...socials];
    const weeks: Slot[][] = [[], [], [], []];
    all.forEach((slot, i) => {
      // For blogs/pillars: spread evenly across the month.
      // For socials: round-robin starting at week 0.
      let wk: number;
      if (slot.type === "blog" || slot.type === "pillar") {
        wk = blogs.length <= 1 ? 0 : Math.min(3, Math.floor((i / Math.max(1, blogs.length)) * 4));
      } else {
        wk = (i - blogs.length) % 4;
      }
      weeks[wk].push(slot);
    });
    return { label: m.month, focus: m.focusLabel, weeks };
  });

  // Cell renderer: count + a few stacked chips with tooltip
  const renderCell = (slots: Slot[]): string => {
    if (!slots.length) return `<div class="cal-cell cal-cell-empty"></div>`;
    const chips = slots.slice(0, 3).map((s) => `<span class="cal-pill cal-pill-${s.type}" title="${escAttr(s.topic + (s.meta ? ` — ${s.meta}` : ""))}">${esc(s.label)}</span>`).join("");
    const more = slots.length > 3 ? `<span class="cal-pill cal-pill-more" title="${escAttr(slots.slice(3).map(s => s.topic).join(" • "))}">+${slots.length - 3}</span>` : "";
    return `<div class="cal-cell">${chips}${more}</div>`;
  };

  // Build a row across all months, grouped by type. View switches between
  // monthly (one cell per month) and weekly (four cells per month).
  const monthlyHeader = monthBuckets.map((m) => `<div class="cal-th"><div class="cal-th-month">${esc(m.label)}</div>${m.focus ? `<div class="cal-th-focus">${esc(m.focus)}</div>` : ""}</div>`).join("");
  const weeklyHeader = monthBuckets.map((m) =>
    [1,2,3,4].map((wk) => `<div class="cal-th cal-th-week"><div class="cal-th-week-num">W${wk}</div>${wk === 1 ? `<div class="cal-th-month-mini">${esc(m.label.split(" ")[0])}</div>` : ""}</div>`).join("")
  ).join("");

  const monthlyRows = ROWS.map((row) => {
    const cells = monthBuckets.map((m) => {
      const slots = m.weeks.flat().filter((s) => s.type === row.key);
      return renderCell(slots);
    }).join("");
    const total = monthBuckets.reduce((sum, m) => sum + m.weeks.flat().filter((s) => s.type === row.key).length, 0);
    if (total === 0) return ""; // hide empty rows
    return `<div class="cal-row ${row.cls}"><div class="cal-row-label"><span class="cal-row-dot"></span>${esc(row.label)}<span class="cal-row-count">${total}</span></div>${cells}</div>`;
  }).filter(Boolean).join("");

  const weeklyRows = ROWS.map((row) => {
    const cells = monthBuckets.map((m) =>
      m.weeks.map((wk) => renderCell(wk.filter((s) => s.type === row.key))).join("")
    ).join("");
    const total = monthBuckets.reduce((sum, m) => sum + m.weeks.flat().filter((s) => s.type === row.key).length, 0);
    if (total === 0) return "";
    return `<div class="cal-row ${row.cls}"><div class="cal-row-label"><span class="cal-row-dot"></span>${esc(row.label)}<span class="cal-row-count">${total}</span></div>${cells}</div>`;
  }).filter(Boolean).join("");

  // Month cards view — each month as a card listing all content items
  const monthCardsHtml = monthBuckets.map((m) => {
    const allSlots = m.weeks.flat();
    const blogs = allSlots.filter((s) => s.type === "blog" || s.type === "pillar");
    const socials = allSlots.filter((s) => s.type !== "blog" && s.type !== "pillar");
    const blogItems = blogs.map((s) => `<li class="cal-card-item cal-card-blog"><span class="cal-card-dot cal-card-dot-blog"></span><span>${esc(s.topic)}</span>${s.meta ? `<span class="cal-card-meta">${esc(s.meta)}</span>` : ""}</li>`).join("");
    const socialItems = socials.map((s) => `<li class="cal-card-item cal-card-social"><span class="cal-card-dot cal-card-dot-social"></span><span class="cal-card-type">${esc(s.label)}</span> <span>${esc(s.topic)}</span></li>`).join("");
    return `
    <div class="cal-month-card">
      <div class="cal-month-card-head">
        <span class="cal-month-name">${esc(m.label)}</span>
        ${m.focus ? `<span class="cal-month-focus">${esc(m.focus)}</span>` : ""}
        <span class="cal-month-count">${allSlots.length} piece${allSlots.length === 1 ? "" : "s"}</span>
      </div>
      <ul class="cal-month-list">
        ${blogItems}
        ${socialItems}
      </ul>
    </div>`;
  }).join("\n");

  const monthCount = monthBuckets.length;
  const weekCount = monthCount * 4;

  // Cadence summary stays as a quick at-a-glance line under the toggle.
  const totals = ROWS.map((row) => {
    const n = monthBuckets.reduce((sum, m) => sum + m.weeks.flat().filter((s) => s.type === row.key).length, 0);
    return n > 0 ? `${n} ${row.label}${n === 1 ? "" : "s"}` : "";
  }).filter(Boolean).join(" · ");

  return `
    <section id="content-calendar" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Publishing</div>
        <h2>Content Calendar</h2>
        <p class="section-intro">Visual ${monthCount}-month publishing schedule. Toggle between months and weeks; hover any pill for the topic.</p>
        <div class="cal-toolbar">
          <div class="cal-view-toggle" role="tablist" aria-label="Calendar view">
            <button type="button" class="cal-view-btn active" data-cal-view="month" role="tab" aria-selected="true">Months</button>
            <button type="button" class="cal-view-btn" data-cal-view="week" role="tab" aria-selected="false">Weeks</button>
            <button type="button" class="cal-view-btn" data-cal-view="cards" role="tab" aria-selected="false">Cards</button>
          </div>
          ${totals ? `<div class="cal-totals">${esc(totals)}</div>` : ""}
        </div>
        <div class="cal-gantt" data-cal-view="month" style="--col-count:${monthCount};--col-count-week:${weekCount}">
          <div class="cal-gantt-inner">
            <div class="cal-grid cal-grid-month">
              <div class="cal-th cal-th-corner">Type</div>
              ${monthlyHeader}
              ${monthlyRows}
            </div>
            <div class="cal-grid cal-grid-week">
              <div class="cal-th cal-th-corner">Type</div>
              ${weeklyHeader}
              ${weeklyRows}
            </div>
          </div>
        </div>
        <div class="cal-cards-view" style="display:none">
          <div class="cal-month-grid">
            ${monthCardsHtml}
          </div>
        </div>
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderServicesInvestment(data: any): string {
  const DELIV_COLORS = ["c1","c2","c3","c4","c5","c6","c7","c8"];

  const delivGrid = (data.services ?? []).length > 0 ? `
    <div class="deliv-grid">
      ${(data.services as { name: string; description?: string; price?: string }[]).map((s, i) => `
      <div class="deliv-card">
        <div class="deliv-head ${DELIV_COLORS[i % DELIV_COLORS.length]}">${esc(s.name)}${s.price ? ` <span style="float:right;opacity:.8;font-weight:500">${esc(s.price)}</span>` : ""}</div>
        <div class="deliv-body">
          ${s.description ? s.description.split(".").filter(Boolean).map((line: string) => `
          <div class="deliv-row"><div class="deliv-dot"></div><div>${esc(line.trim())}.</div></div>`).join("") : '<div class="deliv-row"><div class="deliv-dot"></div><div>See scope of work for full details.</div></div>'}
        </div>
      </div>`).join("\n")}
    </div>` : "";

  const timelineHtml = (data.timeline ?? [])
    .map((t: { phase: string; items: string[] }) => `
    <div class="timeline-phase">
      <h4>${esc(t.phase)}</h4>
      <ul>${t.items.map((item: string) => `<li>${esc(item)}</li>`).join("\n")}</ul>
    </div>`)
    .join("\n");

  const ia = data.investmentAllocation as { totalMonthly?: number; byChannel?: { channel: string; amount: number; share: number; rationale: string }[] } | undefined;
  const allocationHtml = ia && Array.isArray(ia.byChannel) && ia.byChannel.length > 0 ? `
    <h3 style="margin:2rem 0 1rem">Investment Allocation</h3>
    <p style="margin-bottom:1rem;color:#52525b">Recommended monthly media split across the channels in scope. Total monthly media spend: <strong>£${(ia.totalMonthly ?? 0).toLocaleString()}</strong>.</p>
    <table class="channel-table">
      <thead><tr><th>Channel</th><th>Monthly</th><th>Share</th><th>Rationale</th></tr></thead>
      <tbody>
        ${ia.byChannel.map((row) => `
        <tr>
          <td style="font-weight:600;white-space:nowrap">${esc(row.channel)}</td>
          <td style="font-weight:600">£${(row.amount ?? 0).toLocaleString()}</td>
          <td>${row.share ?? 0}%</td>
          <td>${esc(row.rationale ?? "")}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : "";

  const whyUs = (data.whyUs ?? []) as { title: string; description?: string }[];
  const whyUsHtml = whyUs.length > 0 ? `
    <h3 style="margin:2rem 0 1rem">Why i3media</h3>
    <div class="deliv-grid">
      ${whyUs.map((w, i) => `
      <div class="deliv-card">
        <div class="deliv-head ${DELIV_COLORS[i % DELIV_COLORS.length]}">${esc(w.title)}</div>
        <div class="deliv-body"><div class="deliv-row"><div class="deliv-dot"></div><div>${esc(w.description ?? "")}</div></div></div>
      </div>`).join("")}
    </div>` : "";

  return `
    <section id="services" class="section">
      <div class="section-inner">
        <div class="section-kicker">Pricing</div>
        <h2>Services &amp; Investment</h2>
      ${delivGrid ? `<h3 style="margin-bottom:1.25rem">Recommended Services</h3>${delivGrid}` : ""}
      ${timelineHtml ? `<h3 style="margin:2rem 0 1rem">Timeline</h3><div class="timeline-list">${timelineHtml}</div>` : ""}
      ${allocationHtml}
      ${whyUsHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderMediaPlan(data: any): string {
  const channelsHtml = (data.channels ?? [])
    .map((ch: { name: string; budget: number; percentage: number; strategy: string }) => `
    <div class="channel-row">
      <span class="channel-name">${esc(ch.name)}</span>
      <div class="channel-bar"><div class="channel-fill" style="width:${ch.percentage}%"></div></div>
      <span class="channel-budget">£${(ch.budget ?? 0).toLocaleString()}</span>
      <span class="channel-pct">${ch.percentage}%</span>
    </div>`)
    .join("\n");

  const tableRowsHtml = (data.channels ?? [])
    .map((ch: { name: string; budget: number; percentage: number; strategy: string }) => `
    <tr>
      <td style="font-weight:600;white-space:nowrap">${esc(ch.name)}</td>
      <td style="font-weight:600">£${(ch.budget ?? 0).toLocaleString()}</td>
      <td>${ch.percentage}%</td>
      <td class="channel-strategy">${esc(ch.strategy)}</td>
    </tr>`)
    .join("\n");

  return `
    <section id="media-plan" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Budget</div>
        <h2>Media Plan</h2>
      <div class="media-summary">
        <div class="media-stat"><span class="media-label">Objective</span><span class="media-value">${esc(data.objective)}</span></div>
        <div class="media-stat"><span class="media-label">Total Budget</span><span class="media-value">£${(data.totalBudget ?? 0).toLocaleString()}</span></div>
      </div>
      <h3>Channel Allocation</h3>
      <div class="channel-chart">${channelsHtml}</div>
      ${tableRowsHtml ? `<table class="channel-table"><thead><tr><th>Channel</th><th>Budget</th><th>Split</th><th>Strategy</th></tr></thead><tbody>${tableRowsHtml}</tbody></table>` : ""}
      </div>
    </section>`;
}

// ─── Landing Page ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderEmailMarketing(data: any): string {
  const flowsHtml = (data.flows ?? [])
    .map((flow: { name: string; trigger: string; emails: { subject: string; purpose: string; delay?: string }[] }, i: number) => `
    <div class="em-flow">
      <div class="em-flow-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="ag-num">${i + 1}</span>
        <span class="ag-name">${esc(flow.name)}</span>
        <span class="ag-count">${(flow.emails ?? []).length} emails</span>
        <span class="ag-chevron">+</span>
      </div>
      <div class="em-flow-body">
        <p class="em-trigger"><strong>Trigger:</strong> ${esc(flow.trigger)}</p>
        <div class="em-emails">
          ${(flow.emails ?? []).map((e: { subject: string; purpose: string; delay?: string }, j: number) => `
          <div class="em-email-item">
            <span class="em-email-num">${j + 1}</span>
            <div class="em-email-content">
              <div class="em-subject">${esc(e.subject)}</div>
              <div class="em-purpose">${esc(e.purpose)}</div>
              ${e.delay ? `<span class="em-delay">${esc(e.delay)}</span>` : ""}
            </div>
          </div>`).join("\n")}
        </div>
      </div>
    </div>`)
    .join("\n");

  const campaignsHtml = (data.campaigns ?? [])
    .map((c: { name: string; frequency: string; audience: string; objectiveText: string }) => `
    <div class="em-campaign-card">
      <h4>${esc(c.name)}</h4>
      <div class="em-campaign-meta">
        <span class="em-tag">${esc(c.frequency)}</span>
        <span class="em-tag">${esc(c.audience)}</span>
      </div>
      <p>${esc(c.objectiveText)}</p>
    </div>`)
    .join("\n");

  const segmentsHtml = (data.segmentation?.segments ?? [])
    .map((s: { name: string; criteria: string; purpose: string }) => `
    <div class="em-segment">
      <strong>${esc(s.name)}</strong>
      <span class="em-criteria">${esc(s.criteria)}</span>
      <span class="em-seg-purpose">${esc(s.purpose)}</span>
    </div>`)
    .join("\n");

  return `
    <section id="email-marketing" class="section">
      <div class="section-inner">
        <div class="section-kicker">Lifecycle</div>
        <h2>Email Marketing</h2>
      <h3 class="subsection-title">Automated Flows</h3>
      ${flowsHtml}
      <h3 class="subsection-title" style="margin-top:24px">Regular Campaigns</h3>
      <div class="em-campaigns-grid">${campaignsHtml}</div>
      ${segmentsHtml ? `<h3 class="subsection-title" style="margin-top:24px">Audience Segments</h3><div class="em-segments">${segmentsHtml}</div>` : ""}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLinkedInAds(campaigns: any[]): string {
  const campaignsHtml = campaigns
    .map((c, idx) => {
      const targeting = c.audienceTargeting ?? {};
      const targetingChips = [
        ...(targeting.jobTitles ?? []).map((t: string) => `<span class="audience-chip interest">${esc(t)}</span>`),
        ...(targeting.industries ?? []).map((i: string) => `<span class="audience-chip custom">${esc(i)}</span>`),
        ...(targeting.seniority ?? []).map((s: string) => `<span class="audience-chip lookalike">${esc(s)}</span>`),
      ].join(" ");

      const creativesHtml = (c.adCreatives ?? [])
        .map((cr: { headline: string; introText: string; description?: string; cta: string }) => `
        <div class="ad-card">
          <div class="ad-card-header"><span class="ad-badge linkedin">LinkedIn</span></div>
          <div class="ad-card-body">
            <div class="lad-profile">
              <div class="lad-avatar">i3</div>
              <div><div class="lad-info-name">${esc(c.campaignName ?? "LinkedIn Ad")}</div><div class="lad-info-sub">Sponsored</div><div class="lad-follow">+ Follow</div></div>
            </div>
            <p class="lad-caption">${esc(cr.introText)}<span class="char-badge ${(cr.introText ?? "").length <= 150 ? "char-ok" : "char-over"}" style="margin-left:6px">${(cr.introText ?? "").length}/150</span></p>
            <div class="lad-image-wrap">
              <div class="lad-img-txt">${esc(cr.headline)}<span class="char-badge ${(cr.headline ?? "").length <= 70 ? "char-ok" : "char-over"}" style="margin-left:6px">${(cr.headline ?? "").length}/70</span></div>
            </div>
            ${cr.description ? `<p style="font-size:12px;color:var(--text-light);margin-bottom:8px">${esc(cr.description)}<span class="char-badge ${(cr.description ?? '').length <= 100 ? 'char-ok' : 'char-over'}" style="margin-left:6px">${(cr.description ?? '').length}/100</span></p>` : ""}
            <div class="lad-cta-row">
              <div class="lad-cta-btn">${esc(cr.cta)}</div>
              <div class="lad-stats">Sponsored</div>
            </div>
          </div>
        </div>`)
        .join("\n");

      return `
      <div class="li-campaign">
        <h3>${esc(c.campaignName ?? `Campaign ${idx + 1}`)}${c.isFallback ? ` <span class="char-badge char-warn" style="margin-left:.5rem;vertical-align:middle" title="AI generation didn't return usable LinkedIn campaigns. Placeholder shown — regenerate from the dashboard.">AI fallback</span>` : ""}</h3>
        <div class="overview-grid">
          <div class="ov-item"><span class="ov-label">Objective</span><span class="ov-value">${esc(c.objective ?? "")}</span></div>
          <div class="ov-item"><span class="ov-label">Budget</span><span class="ov-value">${esc(c.budget ?? "")}</span></div>
          <div class="ov-item"><span class="ov-label">Format</span><span class="ov-value">${esc(c.format ?? "")}</span></div>
          ${targeting.companySize ? `<div class="ov-item"><span class="ov-label">Company Size</span><span class="ov-value">${esc(targeting.companySize)}</span></div>` : ""}
        </div>
        ${targetingChips ? `<div class="li-targeting"><h4>Audience Targeting</h4><div class="audience-chips">${targetingChips}</div></div>` : ""}
        ${creativesHtml ? `<div class="li-creatives"><h4>Ad Creatives</h4><div class="ad-mockup-grid">${creativesHtml}</div></div>` : ""}
      </div>`;
    })
    .join("\n");

  return `
    <section id="linkedin-ads" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">LinkedIn</div>
        <h2>LinkedIn Ads</h2>
      ${campaignsHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderGoogleAdsForecast(data: any): string {
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();
  const range = data.range as { clicks?: { low: number; high: number }; conversions?: { low: number; high: number }; avgCpa?: { low: number; high: number } } | undefined;
  const rateNote = data.conversionRateOverridden
    ? `${data.conversionRate}% conversion rate (your override)`
    : `${data.conversionRate ?? 3}% industry-standard conversion rate`;

  const clicksRange = range?.clicks ? `<div class="forecast-sub">Range: ${fmtNum(range.clicks.low)} – ${fmtNum(range.clicks.high)}</div>` : "";
  const convRange = range?.conversions ? `<div class="forecast-sub">Range: ${range.conversions.low} – ${range.conversions.high}</div>` : "";
  const cpaRange = range?.avgCpa ? `<div class="forecast-sub">Range: £${range.avgCpa.low.toFixed(0)} – £${range.avgCpa.high.toFixed(0)}</div>` : "";

  const disclaimer = data.disclaimer
    ? `<p class="section-disclaimer" style="margin-top:16px;padding:12px 16px;background:rgba(245,158,11,0.08);border-left:3px solid #f59e0b;border-radius:4px;font-size:13px;color:#92400e;"><strong>Planning estimate:</strong> ${esc(String(data.disclaimer))}</p>`
    : "";

  return `
    <section id="google-ads-forecast" class="section">
      <div class="section-inner">
        <div class="section-kicker">Performance</div>
        <h2>Google Ads Forecast</h2>
      <p class="section-intro">Estimated monthly performance based on keyword volumes, CPCs, and a £${Number(data.monthlyBudget ?? 0).toLocaleString()}/month budget at ${rateNote}.</p>
      <div class="forecast-grid">
        <div class="forecast-card"><span class="forecast-value">${fmtNum(data.clicks ?? 0)}</span><span class="forecast-label">Est. Clicks</span>${clicksRange}</div>
        <div class="forecast-card"><span class="forecast-value">${fmtNum(data.impressions ?? 0)}</span><span class="forecast-label">Est. Impressions</span></div>
        <div class="forecast-card"><span class="forecast-value">${data.conversions ?? 0}</span><span class="forecast-label">Est. Conversions</span>${convRange}</div>
        <div class="forecast-card"><span class="forecast-value">£${Number(data.cost ?? 0).toFixed(0)}</span><span class="forecast-label">Est. Monthly Cost</span></div>
        <div class="forecast-card"><span class="forecast-value">${Number(data.ctr ?? 0).toFixed(2)}%</span><span class="forecast-label">Avg CTR</span></div>
        <div class="forecast-card"><span class="forecast-value">£${Number(data.avgCpc ?? 0).toFixed(2)}</span><span class="forecast-label">Avg CPC</span></div>
        <div class="forecast-card accent"><span class="forecast-value">£${Number(data.avgCpa ?? 0).toFixed(2)}</span><span class="forecast-label">Est. CPA</span>${cpaRange}</div>
      </div>
      ${disclaimer}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCompetitorIntel(competitors: any[], grounding?: string): string {
  const fmtNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const sourceBadge = (source?: string) => {
    if (source === "manual") return `<span class="comp-source-badge comp-source-manual">Client-named</span>`;
    if (source === "auto") return `<span class="comp-source-badge comp-source-auto">SEMrush auto</span>`;
    if (source === "inferred") return `<span class="comp-source-badge comp-source-inferred">AI inferred</span>`;
    return "";
  };
  const overlapPill = (n?: number) =>
    typeof n === "number" && n > 0
      ? `<span class="comp-overlap-pill">${n.toLocaleString()} common keywords</span>`
      : "";

  const tableRows = competitors
    .map((c) => `
    <tr>
      <td class="comp-domain">${esc(c.domain ?? "")} ${sourceBadge(c.source)}</td>
      <td class="comp-num">${c.organicTraffic ? fmtNum(c.organicTraffic) : "—"}</td>
      <td class="comp-num">${c.organicKeywords ? fmtNum(c.organicKeywords) : "—"}</td>
      <td class="comp-num">${c.paidKeywords ? fmtNum(c.paidKeywords) : "—"}</td>
      <td class="comp-num">${c.backlinks ? fmtNum(c.backlinks) : "—"}</td>
    </tr>`)
    .join("\n");

  const detailCards = competitors
    .map((c) => `
    <div class="comp-detail-card">
      <h4>${esc(c.domain ?? "")} ${sourceBadge(c.source)} ${overlapPill(c.commonKeywords)}</h4>
      <div class="comp-keywords"><span class="comp-kw-label">Top Keywords:</span> ${(c.topKeywords ?? []).map((k: string) => `<span class="comp-kw-chip">${esc(k)}</span>`).join(" ")}</div>
      <div class="comp-sw-grid">
        <div class="comp-sw-col"><span class="comp-sw-title comp-strength">Strengths</span><ul>${(c.strengths ?? []).map((s: string) => `<li>${esc(s)}</li>`).join("")}</ul></div>
        <div class="comp-sw-col"><span class="comp-sw-title comp-weakness">Weaknesses</span><ul>${(c.weaknesses ?? []).map((w: string) => `<li>${esc(w)}</li>`).join("")}</ul></div>
      </div>
      ${(c.opportunities ?? []).length ? `
      <div class="comp-opportunities">
        <span class="comp-sw-title comp-opportunity">Opportunities for us</span>
        <ul>${(c.opportunities as string[]).map((o: string) => `<li>${esc(o)}</li>`).join("")}</ul>
      </div>` : (c.strengths ?? []).length ? `
      <div class="comp-opportunities">
        <span class="comp-sw-title comp-opportunity">Opportunities for us</span>
        <ul>${(c.strengths as string[]).slice(0, 2).map((s: string) => `<li>They perform well here — we should match and differentiate: <em>${esc(s)}</em></li>`).join("")}</ul>
      </div>` : ""}
    </div>`)
    .join("\n");

  return `
    <section id="competitor-intel" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Research</div>
        <h2>Competitor Intelligence</h2>
      ${grounding === "real"
        ? `<p class="section-disclaimer" style="margin-bottom:16px;padding:12px 16px;background:rgba(16,185,129,0.07);border-left:3px solid #10b981;border-radius:4px;font-size:13px;color:#065f46;"><strong>Verified data:</strong> Competitor metrics are live figures sourced from SEMrush domain overviews, keyword analysis and backlink data. Organic traffic and keyword counts reflect current SEMrush snapshots.</p>`
        : grounding === "partial"
        ? `<p class="section-disclaimer" style="margin-bottom:16px;padding:12px 16px;background:rgba(245,158,11,0.07);border-left:3px solid #f59e0b;border-radius:4px;font-size:13px;color:#92400e;"><strong>Partially verified:</strong> Competitors with SEMrush keyword overlap show live metrics. Manually-added competitors without overlap data show AI-estimated figures based on their homepage and industry context.</p>`
        : `<p class="section-disclaimer" style="margin-bottom:16px;padding:12px 16px;background:rgba(59,130,246,0.06);border-left:3px solid #3b82f6;border-radius:4px;font-size:13px;color:#1e40af;"><strong>AI-generated estimates:</strong> No SEMrush domain data was available for these competitors. Metrics are AI approximations for directional planning only — run a SEMrush audit for verified figures.</p>`
      }
      <table class="channel-table">
        <thead><tr><th>Domain</th><th>Organic Traffic</th><th>Organic KWs</th><th>Paid KWs</th><th>Backlinks</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="comp-details" style="margin-top:20px">${detailCards}</div>
      </div>
    </section>`;
}

function renderLandingPage(data: { html: string; campaignType: string }): string {
  // Base64-encode the HTML so it can be loaded into a srcdoc iframe safely
  const encoded = Buffer.from(data.html, "utf-8").toString("base64");
  const typeLabel = data.campaignType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return `
    <section id="landing-page" class="section">
      <div class="section-inner">
        <div class="section-kicker">Creative</div>
        <h2>Example Landing Page</h2>
      <div class="lp-meta">
        <span class="lp-badge">${esc(typeLabel)}</span>
        <span class="lp-hint">AI-generated from the client's actual website content and branding. This is a fully working page that can be deployed as-is or refined further.</span>
      </div>
      <div class="lp-frame-wrap">
        <div class="lp-toolbar">
          <span class="lp-dot"></span><span class="lp-dot"></span><span class="lp-dot"></span>
          <span class="lp-url-bar">landing-page-preview</span>
          <button class="lp-open-btn" data-lp-open="true" title="Open full page in new tab">↗ Open</button>
          <button class="lp-expand-btn" onclick="(function(el){var f=el.closest('.lp-frame-wrap');f.classList.toggle('lp-expanded')})(this)" title="Expand to full screen">⤢</button>
        </div>
        <iframe class="lp-iframe" srcdoc="" data-lp-html="${encoded}" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>
      </div>
      </div>
    </section>`;
}

// Rendered in the Creative chapter when the AI landing-page pipeline failed.
// Surfaces the failure reason in-document (instead of silently dropping the
// chapter) so the strategist knows to regenerate or check brand-extraction
// inputs before sharing the plan with the client.
function renderLandingPagePlaceholder(error?: string): string {
  return `
    <section id="landing-page" class="section">
      <div class="section-inner">
        <div class="section-kicker">Creative</div>
        <h2>Example Landing Page</h2>
        <div class="lp-placeholder">
          <div class="lp-placeholder-icon">⚠</div>
          <h3>Landing page not generated</h3>
          <p>The AI landing page pipeline failed for this plan${error ? ` — <em>${esc(error)}</em>` : ""}.</p>
          <p class="lp-placeholder-hint">Common causes: the client's website blocked the brand-context scraper, Claude Opus timed out on a long page, or the LP generation toggle was off when this plan was created. Open the plan in the editor and use <strong>Regenerate → Landing Page</strong> to retry, or generate a landing page directly with the Page Builder tool.</p>
        </div>
      </div>
    </section>`;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escAttr(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

// ─── Inline CSS ─────────────────────────────────────────────────────────────

const CSS = `
:root{--bg:#eef0f8;--white:#fff;--border:#e2e5f0;--border-subtle:#edf0f7;--text:#475569;--text-light:#64748b;--mid:#94a3b8;--heading:#0f172a;--ink:#0f172a;--blue:#6366f1;--accent:#6366f1;--accent-2:#a855f7;--accent-3:#ec4899;--accent-bg:#eef2ff;--accent-text:#4338ca;--gradient-accent:linear-gradient(135deg,#6366f1,#a855f7);--gradient-accent-wide:linear-gradient(135deg,#6366f1,#a855f7,#ec4899)}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:var(--white);color:var(--text);line-height:1.7;font-size:15px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-feature-settings:'cv11','ss01','ss03';text-rendering:optimizeLegibility}
a{color:var(--accent);text-decoration:none}

/* ── Sticky Nav ────────────────────────────────────────────── */
.sticky-nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(15,23,42,.96);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.08);transform:translateY(-100%);transition:transform .32s cubic-bezier(.4,0,.2,1)}
.sticky-nav.visible{transform:translateY(0)}
.sticky-nav-inner{max-width:1200px;margin:0 auto;padding:0 3rem;display:flex;align-items:center;height:50px;gap:2rem}
.sticky-nav-logo{flex-shrink:0;opacity:.65;transition:opacity .2s;display:flex;align-items:center}
.sticky-nav-logo:hover{opacity:1}
.sticky-nav-logo svg{height:22px;width:auto;color:#fff}
.snav-menu-btn{margin-left:auto;flex-shrink:0;display:flex;align-items:center;gap:.45rem;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.13);color:rgba(255,255,255,.65);font-size:12px;font-weight:600;padding:.28rem .9rem;border-radius:6px;cursor:pointer;transition:background .18s,color .18s;font-family:inherit;letter-spacing:.01em;white-space:nowrap}
.snav-menu-btn:hover{background:rgba(255,255,255,.13);color:#fff}
.snav-menu-btn[aria-expanded="true"]{background:rgba(99,102,241,.22);border-color:rgba(99,102,241,.42);color:#fff}
.snav-chevron{font-size:8px;transition:transform .2s;flex-shrink:0;opacity:.6;margin-top:1px}
.snav-menu-btn[aria-expanded="true"] .snav-chevron{transform:rotate(180deg)}
.snav-dropdown{display:none;position:absolute;top:100%;left:0;right:0;background:rgba(10,18,36,.98);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.1);padding:.85rem 0 1rem}
.snav-dropdown-inner{max-width:1200px;margin:0 auto;padding:0 3rem;display:flex;flex-wrap:wrap;gap:.2rem}
.sticky-nav.nav-open .snav-dropdown{display:block}
.snav-link{font-size:11.5px;font-weight:600;letter-spacing:.01em;color:rgba(255,255,255,.42);text-decoration:none;padding:.3rem .7rem;border-radius:6px;white-space:nowrap;transition:color .18s,background .18s}
.snav-link:hover{color:rgba(255,255,255,.8);background:rgba(255,255,255,.07)}
.snav-link.active{color:#fff;background:rgba(99,102,241,.32)}
.snav-chapter-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,.25);padding:.3rem .7rem;margin-top:.5rem;display:block;white-space:nowrap}

/* ── Sidebar TOC (desktop only, Lux plan.html pattern) ─────── */
.gp-toc{position:fixed;top:80px;left:1.25rem;width:220px;max-height:calc(100vh - 100px);overflow-y:auto;z-index:90;background:rgba(15,23,42,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:1rem .85rem;opacity:0;transform:translateX(-12px);transition:opacity .35s ease,transform .35s ease;pointer-events:none}
.gp-toc.visible{opacity:1;transform:translateX(0);pointer-events:auto}
.gp-toc::-webkit-scrollbar{width:4px}
.gp-toc::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}
.gp-toc-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;color:rgba(255,255,255,.4);padding:.25rem .5rem .65rem;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:.55rem}
.gp-toc .snav-chapter-label{padding:.55rem .5rem .25rem;margin-top:.35rem;border-top:1px solid rgba(255,255,255,.06);color:rgba(255,255,255,.32)}
.gp-toc .snav-chapter-label:first-of-type{border-top:none;margin-top:0}
.gp-toc .snav-link{display:flex;align-items:center;gap:7px;font-size:11.5px;color:rgba(255,255,255,.55);padding:.3rem .55rem;border-radius:5px;border-left:2px solid transparent;margin-bottom:1px;white-space:normal;line-height:1.35}
.gp-toc .snav-link:hover{background:rgba(99,102,241,.12);color:#fff;border-left-color:rgba(99,102,241,.55)}
.gp-toc .snav-link.active{background:rgba(99,102,241,.22);color:#fff;border-left-color:#6366f1}
@media (max-width:1240px){.gp-toc{display:none}}

/* ── Hero ──────────────────────────────────────────────────── */
.hero{background:linear-gradient(145deg,#0a1124 0%,#0f172a 45%,#141f3a 80%,#0c1428 100%);display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;padding:3.25rem 3rem 2.5rem}
.hero::after{content:'';position:absolute;inset:auto 0 0 0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.35),transparent)}
.hero-orb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(2px)}
.hero-orb:nth-child(1){width:680px;height:680px;top:-220px;right:-160px;background:radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%)}
.hero-orb:nth-child(2){width:420px;height:420px;bottom:-120px;left:-100px;background:radial-gradient(circle,rgba(168,85,247,.09) 0%,transparent 70%)}
.hero-orb:nth-child(3){width:260px;height:260px;top:28%;right:24%;background:radial-gradient(circle,rgba(236,72,153,.06) 0%,transparent 70%)}
.hero-inner{max-width:1100px;margin:0 auto;width:100%;position:relative;z-index:1}
.hero-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:1.25rem;display:flex;align-items:center;gap:12px}
.hero-label::before{content:'';width:32px;height:1px;background:linear-gradient(90deg,#6366f1,transparent);display:block}
.hero h1{font-size:clamp(2.4rem,5vw,4rem);font-weight:800;letter-spacing:-.035em;line-height:1.05;color:#fff;margin-bottom:1.25rem;max-width:820px}
.hero-divider{width:48px;height:3px;background:var(--gradient-accent);border-radius:2px;margin-bottom:1.5rem}
.hero-sub{font-size:1.05rem;color:#cbd5e1;line-height:1.65;max-width:640px;margin-bottom:2rem;font-weight:400}
.hero-meta{display:flex;flex-wrap:wrap;gap:2.25rem;font-size:13px;color:#64748b;border-top:1px solid rgba(255,255,255,.06);padding-top:1.5rem;margin-top:auto}
.hero-meta-item strong{display:block;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin-bottom:4px}
.hero-meta-item span{color:#e2e8f0;font-weight:500}

/* ── Stats Band ────────────────────────────────────────────── */
.stats-band{background:#0a1124;padding:2.25rem 3rem;border-bottom:1px solid rgba(255,255,255,.04)}
.stats-inner{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:1.5rem}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0;align-items:end}
.stats-row + .stats-row{padding-top:1.5rem;border-top:1px solid rgba(255,255,255,.05)}
.stats-row-label{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.18em;margin-bottom:-.5rem}
.stat-item{padding:.25rem 1.5rem;border-right:1px solid rgba(255,255,255,.06);text-align:center;min-height:64px;display:flex;flex-direction:column;justify-content:flex-end;gap:.4rem}
.stat-item:last-child{border-right:none}
.stat-num{font-size:1.95rem;font-weight:700;letter-spacing:-.04em;color:#fff;line-height:1;display:block;background:var(--gradient-accent);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.stat-num span{color:#a78bfa}
.stat-label{font-size:10.5px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.1em;line-height:1.2}

/* ── Sections ──────────────────────────────────────────────── */
.section{padding:4rem 3rem}
.section.alt{background:var(--bg)}
.section.dark{background:#0a1124}
.section-inner{max-width:1100px;margin:0 auto}
.section-kicker{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;color:var(--accent);margin-bottom:1rem;display:flex;align-items:center;gap:12px}
.section-kicker::before{content:'';width:28px;height:1px;background:currentColor;display:block;opacity:.6}
.section-kicker.blue{color:var(--accent)}
.section.dark .section-kicker{color:#a78bfa}
.section h2{font-size:clamp(1.75rem,3.4vw,2.6rem);font-weight:700;color:var(--heading);letter-spacing:-.025em;line-height:1.15;margin-bottom:1.25rem}
.section.dark h2{color:#fff}
.section-intro,.section-lede{font-size:1.05rem;color:var(--text-light);max-width:660px;line-height:1.7;margin-bottom:2.75rem}
.section.dark .section-intro{color:#94a3b8}
.section-body h3{font-size:1.15rem;font-weight:700;color:var(--heading);margin:2rem 0 .75rem}
.section-body h4{font-size:1rem;font-weight:600;color:var(--heading);margin:1.5rem 0 .5rem}
.section-body p{margin-bottom:1rem;line-height:1.7}
.section-body ul,.section-body ol{margin:0 0 1rem 1.5rem}
.section-body li{margin-bottom:.35rem}
.section-body strong{color:var(--heading)}
.subsection-title{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mid);margin-bottom:12px}

/* ── Campaign hero ─────────────────────────────────────────── */
.campaign-hero{background:linear-gradient(135deg,#0f172a,#1e293b 60%,#1c1f4a);color:#fff;padding:1.75rem 2.25rem;border-radius:14px;margin-bottom:2rem;position:relative;overflow:hidden;box-shadow:0 4px 24px -4px rgba(15,23,42,.18)}
.campaign-hero::after{content:'';position:absolute;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 70%);top:-80px;right:-60px;pointer-events:none}
.campaign-hero h3{font-size:1.2rem;font-weight:700;margin:0;color:#fff;position:relative;z-index:1;letter-spacing:-.015em}
/* Overview grid */
.overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:2rem}
.section.dark .overview-grid .ov-item{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
.section.dark .ov-label{color:#64748b}
.section.dark .ov-value{color:#fff}
.ov-item{background:var(--bg);padding:1rem 1.25rem;border-radius:10px;border:1px solid var(--border)}
.ov-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);margin-bottom:2px}
.ov-value{font-size:14px;font-weight:600;color:var(--heading)}
/* Negative keywords */
.neg-reasoned-list{display:flex;flex-direction:column;gap:.55rem;margin-top:.85rem}
.neg-reason-item{display:grid;grid-template-columns:minmax(140px,200px) 1fr;gap:14px;align-items:start;padding:.6rem .85rem;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px}
.section.dark .neg-reason-item{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)}
.neg-reason-text{font-size:12.5px;color:var(--mid);line-height:1.5}
.section.dark .neg-reason-text{color:#cbd5e1}
.ag-neg-section{margin-top:1.25rem;padding-top:1rem;border-top:1px dashed var(--border)}
.ag-neg-section h5{margin:0 0 .5rem;font-size:.85rem;font-weight:700;color:var(--text)}
@media (max-width:600px){.neg-reason-item{grid-template-columns:1fr}}
.neg-section{margin-bottom:2rem}
.neg-section summary{cursor:pointer;list-style:none;user-select:none}
.neg-section summary::-webkit-details-marker{display:none}
.neg-section[open]>.neg-section-head{border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:.75rem;margin-bottom:.5rem}
.neg-section h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:0;display:inline}
.section.dark .neg-section h4{color:#fff}
.neg-count-badge{display:inline-block;margin-left:.5rem;padding:1px 8px;border-radius:999px;background:rgba(220,38,38,.15);color:#dc2626;font-size:11px;font-weight:700;vertical-align:middle}
.section.dark .neg-count-badge{background:rgba(220,38,38,.25);color:#fca5a5}
.neg-chip{display:inline-block;background:rgba(220,38,38,.12);color:#dc2626;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;margin:3px 4px 3px 0}
.section.dark .neg-chip{background:rgba(220,38,38,.2);color:#fca5a5}
.neg-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:.75rem 0 .5rem}
.neg-section-body{padding-top:.25rem}
.neg-chip-list{display:flex;flex-wrap:wrap;gap:4px;margin-top:.75rem}
.neg-reasoned-toggle{margin-top:1rem}
.neg-reasoned-toggle summary{cursor:pointer;font-size:12.5px;font-weight:600;color:var(--mid);padding:6px 0;user-select:none}
.neg-reasoned-toggle summary:hover{color:var(--text)}
.section.dark .neg-reasoned-toggle summary{color:#94a3b8}
.section.dark .neg-reasoned-toggle summary:hover{color:#e2e8f0}
.neg-reasoned-toggle[open] summary{margin-bottom:.75rem}
/* Valid keyword pills (replaces the kw-tbl table layout) */
.kw-chip-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:.75rem}
.kw-chip{display:inline-flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);padding:4px 10px;border-radius:20px;font-size:12.5px;line-height:1.4}
.section.dark .kw-chip{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)}
.kw-chip .kw-text{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:12.5px;color:var(--text)}
.section.dark .kw-chip .kw-text{color:#e2e8f0}
.ag-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:.5rem}
/* Keyword editing */
.kw-remove-btn{display:none;align-items:center;justify-content:center;width:15px;height:15px;padding:0;border:none;background:transparent;cursor:pointer;color:var(--mid);font-size:14px;line-height:1;border-radius:50%;flex-shrink:0}
.kw-remove-btn:hover{background:rgba(239,68,68,.15);color:#ef4444}
.kw-chip:hover .kw-remove-btn{display:inline-flex}
.section.dark .kw-remove-btn:hover{background:rgba(239,68,68,.25);color:#fca5a5}
.kw-chip.kw-new{border-color:#818cf8}
.section.dark .kw-chip.kw-new{border-color:#6366f1}
.kw-add-row{display:flex;gap:6px;align-items:center;margin:6px 0 4px}
.kw-add-input{flex:1;border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:12.5px;font-family:inherit;background:var(--white);color:var(--text);outline:none;min-width:0}
.kw-add-input:focus{border-color:#6366f1;box-shadow:0 0 0 2px rgba(99,102,241,.12)}
.section.dark .kw-add-input{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15);color:#e2e8f0}
.section.dark .kw-add-input:focus{border-color:#818cf8}
.kw-save-btn.saving{opacity:.6;cursor:not-allowed}
.ag-add-row{display:flex;gap:6px;align-items:center;margin-top:.75rem}
.ag-delete-btn{width:22px;height:22px;padding:0;border:none;background:transparent;cursor:pointer;color:var(--mid);font-size:16px;line-height:1;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.ag-delete-btn:hover{background:rgba(239,68,68,.15);color:#ef4444}
.section.dark .ag-delete-btn:hover{background:rgba(239,68,68,.25);color:#fca5a5}
.ag-audience-empty{min-width:80px;font-style:italic;opacity:.5}
.ag-audience-empty:focus{opacity:1;font-style:normal}
[contenteditable]:focus{outline:2px solid rgba(99,102,241,.45);outline-offset:2px;border-radius:4px}
.editable-inline:hover{outline:1px dashed rgba(99,102,241,.35);outline-offset:3px;border-radius:4px;cursor:text}
.loc-chip-edit{display:inline-flex;align-items:center;gap:4px;padding:4px 6px 4px 10px}
.loc-remove-btn{width:16px;height:16px;padding:0;border:none;background:transparent;cursor:pointer;color:var(--mid);font-size:13px;line-height:1;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.loc-remove-btn:hover{background:rgba(239,68,68,.15);color:#ef4444}
.neg-chip-edit{display:inline-flex;align-items:center;gap:4px;padding:3px 6px 3px 10px}
.neg-remove-btn{width:16px;height:16px;padding:0;border:none;background:transparent;cursor:pointer;color:rgba(220,38,38,.5);font-size:13px;line-height:1;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.neg-remove-btn:hover{background:rgba(220,38,38,.2);color:#dc2626}
.neg-edit-section{margin-top:1.25rem;padding-top:1rem;border-top:1px dashed var(--border)}
.section.dark .neg-edit-section{border-top-color:rgba(255,255,255,.1)}
.neg-edit-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px}
.ag-neg-section{margin-top:1.25rem;padding-top:1rem;border-top:1px dashed var(--border)}
.section.dark .ag-neg-section{border-top-color:rgba(255,255,255,.1)}
.ag-neg-section h5{margin:0 0 .5rem;font-size:.85rem;font-weight:700;color:var(--text)}
.ag-neg-chips{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;min-height:4px}
.seed-chip-edit{display:inline-flex;align-items:center;gap:4px;padding:3px 6px 3px 10px}
.seed-remove-btn{width:16px;height:16px;padding:0;border:none;background:transparent;cursor:pointer;color:var(--mid);font-size:13px;line-height:1;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.seed-remove-btn:hover{background:rgba(239,68,68,.15);color:#ef4444}
.seed-delete-btn{width:22px;height:22px;padding:0;border:none;background:transparent;cursor:pointer;color:var(--mid);font-size:16px;line-height:1;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.seed-delete-btn:hover{background:rgba(239,68,68,.15);color:#ef4444}
.section.dark .seed-delete-btn:hover{background:rgba(239,68,68,.25);color:#fca5a5}
/* Seed phrase suggestions panel (PPC research) */
.seed-section{margin-top:2.25rem;padding-top:1.5rem;border-top:1px dashed var(--border)}
.section.dark .seed-section{border-top-color:rgba(255,255,255,.12)}
.seed-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:.25rem}
.seed-section-head h3{font-size:1.1rem;font-weight:700;color:var(--heading);margin:0}
.section.dark .seed-section-head h3{color:#fff}
.seed-theme{margin-top:1rem;padding:0;background:var(--white);border:1px solid var(--border);border-radius:12px;overflow:hidden}
.section.dark .seed-theme{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.08)}
.seed-theme-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;cursor:pointer;list-style:none;user-select:none}
.seed-theme-head::-webkit-details-marker{display:none}
.seed-theme[open]>.seed-theme-head{border-bottom:1px solid var(--border);margin-bottom:0}
.section.dark .seed-theme[open]>.seed-theme-head{border-bottom-color:rgba(255,255,255,.1)}
.seed-theme>.seed-chip-list{padding:10px 14px 14px}
.seed-theme-head h4{flex:1;margin:0;font-size:14px;font-weight:600;color:var(--heading)}
.section.dark .seed-theme-head h4{color:#fff}
.seed-num{width:24px;height:24px;border-radius:6px;background:var(--accent,#6366f1);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.seed-count{font-size:11px;color:var(--mid);text-transform:uppercase;letter-spacing:.04em}
.seed-chip-list{display:flex;flex-wrap:wrap;gap:6px}
.seed-chip{display:inline-flex;align-items:center;background:var(--bg);border:1px dashed var(--border);padding:3px 10px;border-radius:20px;font-size:12.5px;line-height:1.4;font-family:'SF Mono','Fira Code','Courier New',monospace;color:var(--text)}
.section.dark .seed-chip{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:#e2e8f0}
/* Ad groups */
.ag-heading{font-size:1.1rem;font-weight:700;color:var(--heading);margin-bottom:1rem}
.section.dark .ag-heading{color:#fff}
.ag-section{border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden;background:var(--white)}
.section.dark .ag-section{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.04)}
.ag-header{display:flex;align-items:center;gap:12px;padding:14px 18px;cursor:pointer;user-select:none;transition:background .15s}
.ag-header:hover{background:var(--bg)}
.section.dark .ag-header:hover{background:rgba(255,255,255,.06)}
.ag-num{width:28px;height:28px;border-radius:8px;background:var(--heading);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.section.dark .ag-num{background:rgba(99,102,241,.3);color:#c7d2fe}
.ag-name{flex:1;font-weight:600;font-size:14px;color:var(--heading)}
.section.dark .ag-name{color:#fff}
.ag-count{font-size:12px;color:var(--mid)}
.ag-chevron{font-size:18px;color:var(--mid);transition:transform .2s}
.ag-section.open .ag-chevron{transform:rotate(45deg)}
.ag-body{display:none;padding:18px;border-top:1px solid var(--border)}
.section.dark .ag-body{border-top-color:rgba(255,255,255,.1)}
.ag-section.open .ag-body{display:block}
/* Keyword table */
.kw-tbl{width:100%;border-collapse:collapse;font-size:13px}
.kw-tbl th{text-align:left;padding:8px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);background:var(--bg);border-bottom:1px solid var(--border)}
.section.dark .kw-tbl th{background:rgba(255,255,255,.04);color:#64748b;border-bottom-color:rgba(255,255,255,.08)}
.kw-tbl td{padding:8px 12px;border-bottom:1px solid var(--border)}
.section.dark .kw-tbl td{border-bottom-color:rgba(255,255,255,.06);color:#cbd5e1}
.kw-text{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:13px}
.kw-vol{text-align:right;color:var(--text-light);font-size:12px}
.match-badge{display:none}
/* Copy buttons */
.copy-btn{margin-top:12px;padding:9px 18px;background:var(--gradient-accent);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:filter .15s,transform .15s;font-family:inherit;letter-spacing:-.005em}
.copy-btn:hover{filter:brightness(1.08)}
.copy-btn:active{transform:translateY(1px)}
.copy-btn-sm{padding:3px 10px;background:transparent;border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text-light);cursor:pointer;transition:all .15s}
.copy-btn-sm:hover{background:var(--bg)}
/* Keyword lines (research section) */
.kw-group{margin-bottom:1.5rem}
.kw-group-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.kw-group-header h4{font-size:15px;font-weight:700;color:var(--heading)}
.kw-line-list{display:flex;flex-direction:column;gap:4px}
.kw-line{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg);border-radius:6px;font-size:13px}
.kw-word{flex:1;font-family:'SF Mono','Fira Code','Courier New',monospace}
.kw-meta{font-size:11px;color:var(--mid)}
/* Meta campaigns */
.meta-campaign{border:1px solid var(--border);border-radius:14px;margin-bottom:1.25rem;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.04)}
.meta-campaign-header{display:flex;align-items:center;gap:12px;padding:1.25rem 1.5rem;background:linear-gradient(135deg,#1877f2,#0f4c95);color:#fff;cursor:pointer;list-style:none;user-select:none}
.meta-campaign-header::-webkit-details-marker{display:none}
.meta-campaign[open]>.meta-campaign-header{border-radius:14px 14px 0 0}
.meta-num{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.meta-campaign-header h4{font-size:1rem;font-weight:700;margin:0;color:#fff}
.meta-obj{font-size:12px;opacity:.8;margin-top:2px}
.meta-campaign-body{padding:1.5rem}
.meta-campaign-body h5{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);margin:1.25rem 0 .5rem}
.meta-campaign-body h5:first-child{margin-top:0}
.audience-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.audience-chip{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500}
.audience-chip.interest{background:#dbeafe;color:#1e40af}
.audience-chip.custom{background:#ede9fe;color:#7c3aed}
.audience-chip.lookalike{background:#d1fae5;color:#065f46}
.creatives-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:12px}
.ad-creative{background:var(--bg);padding:1.25rem;border-radius:10px;border:1px solid var(--border)}
.creative-format{display:inline-block;padding:2px 8px;background:var(--heading);color:#fff;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:8px}
.creative-headline{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:4px}
.creative-text{font-size:13px;color:var(--text-light);margin-bottom:8px}
.creative-cta{display:inline-block;padding:4px 12px;background:var(--heading);color:#fff;border-radius:6px;font-size:12px;font-weight:600}
.captions-list{display:flex;flex-direction:column;gap:8px}
.caption-item{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;background:var(--bg);border-radius:8px;border:1px solid var(--border)}
.caption-item p{flex:1;font-size:13px;margin:0}
.pillars-list{margin:0 0 12px 20px;font-size:14px}
.pillars-list li{margin-bottom:6px}
/* Content cards */
.content-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:2rem}
.content-card{background:var(--white);padding:1.25rem;border-radius:12px;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.content-url-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px}
.content-url{font-size:12px;color:var(--text-light);font-family:'SF Mono','Fira Code','Courier New',monospace;word-break:break-all;text-decoration:none;flex:1;line-height:1.5}
.content-url:hover{color:var(--accent);text-decoration:underline}
.content-url-copy{font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;background:transparent;border:1px solid var(--border);color:var(--text-light);padding:3px 8px;border-radius:4px;cursor:pointer;flex-shrink:0;white-space:nowrap}
.content-url-copy:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.content-title{font-size:14px;font-weight:600;color:var(--heading);margin-bottom:6px}
.content-kws{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.content-notes{font-size:13px;color:var(--text-light);margin-top:8px;padding:10px 12px;background:#f8fafc;border-left:3px solid var(--accent);border-radius:4px}
.content-notes p{margin:0 0 .55rem;font-size:13px;color:var(--text);line-height:1.55}
.content-notes p:last-child{margin-bottom:0}
.content-notes ul{margin:0 0 .55rem;padding-left:1.05rem;font-size:13px;color:var(--text);line-height:1.55}
.content-notes ul:last-child{margin-bottom:0}
.content-notes li{margin-bottom:.2rem}
.content-notes .cc-brief-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;margin:.65rem 0 .3rem}
.content-notes .cc-brief-label:first-child{margin-top:0}
.onpage-structured{margin-top:.75rem;padding:.75rem .9rem;background:#f8fafc;border-left:3px solid var(--accent);border-radius:4px;display:flex;flex-direction:column;gap:.7rem}
.onpage-row{display:flex;flex-direction:column;gap:.25rem}
.onpage-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700}
.onpage-val{font-size:13px;color:var(--text);line-height:1.5;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.onpage-val code{font-family:'SF Mono','Fira Code','Courier New',monospace;background:#eef2ff;color:#3730a3;padding:2px 6px;border-radius:4px;font-size:12px}
.onpage-list{margin:0;padding-left:1.1rem;font-size:13px;color:var(--text);line-height:1.55}
.onpage-list li{margin-bottom:.2rem}
.onpage-chips{display:flex;flex-wrap:wrap;gap:4px}
/* SEO Foundations: quick wins, internal linking structure, outbound link building */
.seo-sub-heading{font-size:1.15rem;font-weight:700;color:var(--heading);margin:2.25rem 0 .35rem;letter-spacing:-.005em}
.seo-sub-heading:first-of-type{margin-top:.5rem}
.seo-sub-intro{font-size:13.5px;color:var(--text-light);margin:0 0 1.1rem;line-height:1.65;max-width:760px}
.qw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem}
@media (max-width:900px){.qw-grid{grid-template-columns:1fr}}
.qw-card{border:1px solid var(--border);border-radius:12px;background:var(--white);padding:1.1rem 1.25rem;display:flex;flex-direction:column;gap:.7rem}
.qw-head{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem;flex-wrap:wrap}
.qw-url{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:12.5px;color:var(--accent);text-decoration:none;word-break:break-all;font-weight:600}
.qw-url:hover{text-decoration:underline}
.qw-badges{display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap}
.qw-badge{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px;text-transform:capitalize}
.qw-effort-low{background:#d1fae5;color:#065f46}
.qw-effort-medium{background:#fef3c7;color:#92400e}
.qw-effort-high{background:#fee2e2;color:#991b1b}
.qw-time{background:#eef2ff;color:#4338ca}
.qw-intent-transactional{background:#dcfce7;color:#166534}
.qw-intent-commercial{background:#cffafe;color:#155e75}
.qw-intent-informational{background:#fef3c7;color:#92400e}
.qw-intent-navigational{background:#e5e7eb;color:#374151}
.qw-kw-line{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;width:100%;line-height:1.6}
.qw-kw-line+.qw-kw-line{margin-top:.3rem}
.qw-kw-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:4px;flex-shrink:0}
.qw-kw-primary{background:#fee2e2;color:#991b1b}
.qw-kw-secondary{background:#dbeafe;color:#1e40af}
.qw-kw-longtail{background:#ede9fe;color:#5b21b6}
.qw-kw-chip{display:inline-block;font-size:11.5px;color:var(--text);background:#fff;border:1px solid var(--border);padding:1px 7px;border-radius:4px}
.qw-kw-chip-lt{font-style:italic;color:var(--text-light)}
.qw-onpage-list{list-style:disc;margin:.15rem 0 0;padding:0 0 0 1.2rem;display:flex;flex-direction:column;gap:.3rem}
.qw-onpage-list>li{font-size:12.5px;color:var(--text);line-height:1.5}
.qw-page-title{font-size:14.5px;font-weight:600;color:var(--heading);line-height:1.35}
.qw-rationale{font-size:12.5px;color:var(--text-light);margin:0;font-style:italic;line-height:1.55;padding-left:.65rem;border-left:2px solid var(--border)}
.qw-row{display:flex;flex-direction:column;gap:.3rem}
.qw-row-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700}
.qw-row-val{font-size:13px;color:var(--text);line-height:1.5;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;background:#f8fafc;padding:.55rem .7rem;border-radius:6px;border-left:3px solid var(--accent)}
.qw-cross-list{list-style:none;margin:.15rem 0 0;padding:0;display:flex;flex-direction:column;gap:.55rem}
.qw-cross-list>li{font-size:12.5px;color:var(--text);line-height:1.5;background:#f8fafc;padding:.55rem .7rem;border-radius:6px;display:flex;flex-wrap:wrap;align-items:center;gap:.45rem}
.qw-cross-anchor{font-weight:600;color:var(--heading)}
.qw-cross-arrow{color:var(--mid);font-weight:700}
.qw-cross-url{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:11.5px;color:var(--accent);text-decoration:none;word-break:break-all}
.qw-cross-url:hover{text-decoration:underline}
.qw-cross-why{flex-basis:100%;font-size:11.5px;color:var(--text-light);font-style:italic;margin-top:2px}
/* SEO Quick Win optimisation details toggle */
.qw-optimisation-details{margin-top:.75rem;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.qw-optimisation-details>summary{cursor:pointer;list-style:none;user-select:none;padding:.5rem .75rem;font-size:12.5px;font-weight:600;color:var(--text-light);background:#f8fafc;display:flex;align-items:center;gap:.4rem}
.qw-optimisation-details>summary::-webkit-details-marker{display:none}
.qw-optimisation-details>summary::before{content:"▸";font-size:10px;color:var(--mid);transition:transform .15s ease}
.qw-optimisation-details[open]>summary::before{content:"▾"}
.qw-optimisation-details[open]>summary{border-bottom:1px solid var(--border)}
.qw-optimisation-body{padding:.75rem}
.qw-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem;padding-top:.75rem;border-top:1px dashed var(--border)}
.qw-action-btn{display:inline-flex;align-items:center;gap:.4rem;padding:6px 12px;border:1px solid var(--border);background:#fff;border-radius:6px;font-size:12.5px;font-weight:600;color:var(--heading);cursor:pointer;transition:all .15s ease;font-family:inherit}
.qw-action-btn:hover{border-color:#3b82f6;color:#1e40af;background:#eff6ff}
.qw-action-faq:hover{border-color:#7c3aed;color:#5b21b6;background:#f5f3ff}
.qw-action-schema:hover{border-color:#059669;color:#047857;background:#ecfdf5}
.qw-action-ico{font-size:13px;line-height:1}
.qw-action-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;font-size:10.5px;font-weight:700;background:rgba(0,0,0,.06);color:var(--text);border-radius:9px}
.qw-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:flex-start;justify-content:center;padding:60px 20px 20px}
.qw-modal[aria-hidden="false"]{display:flex}
.qw-modal-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(2px)}
.qw-modal-panel{position:relative;width:min(820px,100%);max-height:calc(100vh - 80px);background:#fff;border-radius:12px;box-shadow:0 25px 70px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden}
.qw-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.1rem 1.4rem;border-bottom:1px solid var(--border);background:#f8fafc}
.qw-modal-eyebrow{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#64748b;margin-bottom:.25rem}
.qw-modal-head h3{font-size:18px;margin:0;color:var(--heading);font-weight:700}
.qw-modal-url{display:block;margin-top:.25rem;font-size:12px;color:#3b82f6;text-decoration:none;word-break:break-all}
.qw-modal-url:hover{text-decoration:underline}
.qw-modal-close{appearance:none;border:none;background:transparent;font-size:28px;line-height:1;color:#64748b;cursor:pointer;padding:0 4px;flex-shrink:0}
.qw-modal-close:hover{color:var(--heading)}
.qw-modal-body{padding:1.2rem 1.4rem;overflow-y:auto;display:flex;flex-direction:column;gap:1rem}
.qw-modal-faq-item{border:1px solid var(--border);border-radius:8px;padding:.85rem 1rem;background:#fafbfc}
.qw-modal-faq-q{font-size:14px;font-weight:600;color:var(--heading);margin:0 0 .35rem;line-height:1.4}
.qw-modal-faq-a{font-size:13px;color:var(--text);line-height:1.55;margin:0}
.qw-modal-faq-foot{display:flex;justify-content:flex-end;margin-top:.6rem}
.qw-modal-schema-item{border:1px solid var(--border);border-radius:8px;overflow:hidden;background:#0f172a}
.qw-modal-schema-head{display:flex;align-items:center;justify-content:space-between;padding:.55rem .85rem;background:#1e293b;color:#e2e8f0}
.qw-modal-schema-type{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#67e8f9}
.qw-modal-schema-pre{margin:0;padding:.85rem 1rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.5;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;max-height:340px;overflow-y:auto}
.qw-modal-copy{appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e2e8f0;padding:3px 10px;border-radius:5px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit}
.qw-modal-copy:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.3)}
.qw-modal-copy.qw-copied{background:#059669;border-color:#059669;color:#fff}
.qw-modal-copy-inline{appearance:none;border:1px solid var(--border);background:#fff;color:var(--heading);padding:3px 10px;border-radius:5px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit}
.qw-modal-copy-inline:hover{background:#f1f5f9}
.qw-modal-copy-inline.qw-copied{background:#059669;border-color:#059669;color:#fff}
@media print{.qw-actions,.qw-modal{display:none !important}}
/* Internal linking structure (hub-and-spoke) */
.ils-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.1rem;margin-bottom:1rem}
@media (max-width:900px){.ils-grid{grid-template-columns:1fr}}
.ils-hub{border:1px solid var(--border);border-radius:12px;background:var(--white);padding:1.1rem 1.25rem;display:flex;flex-direction:column;gap:.65rem}
.ils-hub-head{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.ils-hub-pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border-radius:999px}
.ils-hub-url{font-size:14.5px;font-weight:700;color:var(--heading);text-decoration:none}
.ils-hub-url:hover{color:var(--accent)}
.ils-hub-sub{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:11.5px;color:var(--text-light);word-break:break-all}
.ils-hub-role{font-size:13px;color:var(--text-light);margin:0;line-height:1.55}
.ils-inbound-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;margin-top:.3rem}
.ils-inbound-list{list-style:none;margin:.15rem 0 0;padding:0;display:flex;flex-direction:column;gap:.5rem}
.ils-inbound-list>li{font-size:12.5px;color:var(--text);line-height:1.5;background:#f8fafc;padding:.5rem .65rem;border-radius:6px;display:flex;flex-wrap:wrap;align-items:center;gap:.4rem}
.ils-from-url{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:11.5px;color:var(--accent);text-decoration:none;word-break:break-all}
.ils-from-url:hover{text-decoration:underline}
.ils-arrow{color:var(--mid);font-weight:700}
.ils-anchor{font-weight:600;color:var(--heading)}
.ils-why{flex-basis:100%;font-size:11.5px;color:var(--text-light);font-style:italic;margin-top:2px}
/* Outbound link-building plan */
.lb-channels{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0 0 1.25rem;padding:.7rem .9rem;background:#fafbff;border:1px solid var(--border);border-radius:8px}
.lb-channels-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;margin-right:.35rem}
.lb-channel-chip{display:inline-block;font-size:11.5px;font-weight:600;padding:3px 10px;background:#eef2ff;color:#4338ca;border-radius:999px}
.lb-grid{display:flex;flex-direction:column;gap:1.1rem}
.lb-target{border:1px solid var(--border);border-radius:12px;background:var(--white);padding:1.1rem 1.25rem;display:flex;flex-direction:column;gap:.7rem}
.lb-target-head{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.tier-pill{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;border-radius:999px}
.tier-pill-1{background:linear-gradient(135deg,#dc2626,#ec4899);color:#fff}
.tier-pill-2{background:#fef3c7;color:#92400e}
.tier-pill-3{background:#e0e7ff;color:#3730a3}
.lb-target-url{font-size:14.5px;font-weight:700;color:var(--heading);text-decoration:none;flex:1}
.lb-target-url:hover{color:var(--accent)}
.lb-est{font-size:11.5px;color:var(--text-light);background:var(--bg);padding:2px 8px;border-radius:999px}
.lb-target-sub{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:11.5px;color:var(--text-light);word-break:break-all}
.lb-rationale{font-size:13px;color:var(--text-light);margin:0;line-height:1.55;font-style:italic;padding-left:.7rem;border-left:2px solid var(--border)}
.lb-anchor-label,.lb-angles-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;margin-top:.35rem}
.lb-anchor-table{width:100%;border-collapse:collapse;font-size:12.5px;background:#f8fafc;border-radius:6px;overflow:hidden}
.lb-anchor-table th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;padding:.5rem .65rem;background:#eef2ff;border-bottom:1px solid var(--border)}
.lb-anchor-table td{padding:.55rem .65rem;border-bottom:1px solid var(--border);vertical-align:top}
.lb-anchor-table tr:last-child td{border-bottom:none}
.lb-anchor-text{font-weight:600;color:var(--heading)}
.lb-anchor-share{font-family:'SF Mono','Fira Code','Courier New',monospace;color:var(--text-light);white-space:nowrap}
.anchor-type-pill{display:inline-block;font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:999px;white-space:nowrap}
.anchor-exact{background:#fee2e2;color:#991b1b}
.anchor-partial{background:#fef3c7;color:#92400e}
.anchor-branded{background:#dbeafe;color:#1e40af}
.anchor-naked{background:#e0e7ff;color:#3730a3}
.anchor-generic{background:#f1f5f9;color:#475569}
.lb-angles{margin:.15rem 0 0;padding-left:1.1rem;font-size:12.5px;color:var(--text);line-height:1.55}
.lb-angles>li{margin-bottom:.25rem}
.kw-pill{display:inline-block;padding:2px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;font-size:11px;color:var(--text-light)}
.intent-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.intent-awareness,.intent-informational{background:#dbeafe;color:#1e40af}
.intent-commercial{background:#fef3c7;color:#92400e}
.intent-decision,.intent-transactional{background:#d1fae5;color:#065f46}
/* Topic cluster cards (Pillar / Mega Guide / Article) */
.cluster-block{margin-bottom:2.5rem}
.cluster-block-title{font-size:1.05rem;font-weight:700;color:var(--heading);margin:0 0 .25rem;letter-spacing:-.005em}
.cluster-block-sub{font-size:13px;color:var(--text-light);margin:0 0 1rem;line-height:1.6}
.cluster-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.25rem;margin-bottom:1.5rem}
@media (max-width:900px){.cluster-grid{grid-template-columns:1fr 1fr}}
@media (max-width:600px){.cluster-grid{grid-template-columns:1fr}}
.cluster-card{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--white);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.cluster-card-head{padding:.7rem 1rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;user-select:none}
.cluster-card-head::-webkit-details-marker{display:none}
.cluster-card-body{padding:1rem 1.1rem 1.15rem;display:flex;flex-direction:column}
.cluster-type-pill{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:2px 8px;border-radius:10px}
.cc-title-summary{font-size:12px;font-weight:600;color:inherit;opacity:.9;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cluster-card.pillar .cluster-card-head{background:#0f172a;color:#fff}
.cluster-card.pillar .cluster-type-pill{background:rgba(255,255,255,.15);color:#fff}
.cluster-card.mega .cluster-card-head{background:#1e293b;color:#cbd5e1}
.cluster-card.mega .cluster-type-pill{background:rgba(255,255,255,.1);color:#cbd5e1}
.cluster-card.article .cluster-card-head{background:var(--bg);color:var(--heading);border-bottom:1px solid var(--border)}
.cluster-card.article .cluster-type-pill{background:var(--border);color:var(--text-light)}
.cluster-card[open]>.cluster-card-head{border-bottom:1px solid rgba(255,255,255,.08)}
.cluster-card.article[open]>.cluster-card-head{border-bottom-color:var(--border)}
.cc-title{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:.35rem;line-height:1.35}
.cc-kw{font-size:12px;color:var(--text-light);margin-bottom:.45rem;font-family:'SF Mono','Fira Code','Courier New',monospace}
.cc-intent{font-size:11px;padding:1px 8px;border-radius:10px;display:inline-block;margin-bottom:.55rem;font-weight:600}
.cc-intent.intent-aw,.cc-intent.intent-awareness{background:#dbeafe;color:#1e40af}
.cc-intent.intent-in,.cc-intent.intent-informational{background:#cffafe;color:#155e75}
.cc-intent.intent-cm,.cc-intent.intent-commercial{background:#fef3c7;color:#92400e}
.cc-intent.intent-tr,.cc-intent.intent-transactional{background:#fed7aa;color:#9a3412}
.cc-intent.intent-dc,.cc-intent.intent-decision{background:#d1fae5;color:#065f46}
.cc-kw-block{margin:.55rem 0}
.cc-kw-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;margin-bottom:.3rem}
.cc-kw-primary{font-size:13px;font-weight:600;color:var(--heading);font-family:'SF Mono','Fira Code','Courier New',monospace;background:#f1f5f9;padding:4px 8px;border-radius:4px;display:inline-block}
.cc-kw-chips{display:flex;flex-wrap:wrap;gap:4px}
.kw-pill{font-size:11px;padding:2px 8px;border-radius:10px;background:#eef2ff;color:#3730a3;font-weight:500}
.kw-pill-mute{background:#f1f5f9;color:#475569;font-weight:400}
.cc-audiences-block{margin:.55rem 0 0}
.cc-audiences-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;margin-bottom:.3rem;display:block}
.cc-summary{font-size:13px;color:var(--text);line-height:1.55;margin:.55rem 0 0;padding:10px 12px;background:#f8fafc;border-left:3px solid var(--accent);border-radius:4px}
.cc-brief{font-size:13px;color:var(--text);line-height:1.55;margin:0;padding:10px 12px;background:#f8fafc;border-left:3px solid var(--accent);border-radius:4px}
.cc-brief p{margin:0 0 .55rem;font-size:13px;color:var(--text);line-height:1.55}
.cc-brief p:last-child{margin-bottom:0}
.cc-brief-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid);font-weight:700;margin:.65rem 0 .3rem}
.cc-brief-label:first-child{margin-top:0}
.cc-brief-list{margin:0 0 .55rem;padding-left:1.05rem;font-size:13px;color:var(--text);line-height:1.55}
.cc-brief-list li{margin-bottom:.2rem}
.cc-brief-list:last-child{margin-bottom:0}
.compliance-callout{margin-top:1.25rem;padding:14px 16px;background:#fffbea;border:1px solid #f5e1a2;border-left:4px solid #d97706;border-radius:6px}
.compliance-callout strong{display:block;font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:#92400e;margin-bottom:6px}
.compliance-callout ul{margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.55}
.compliance-callout li{margin:3px 0}
.phase-card{background:#fff;border:1px solid var(--border);border-radius:10px;padding:1.25rem 1.5rem;margin:1rem 0;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.phase-card h3{margin-top:0!important;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
.phase-card h4{margin-top:1rem!important;color:var(--text);font-size:15px}
.phase-card>p:last-child,.phase-card>ul:last-child{margin-bottom:0}
.phase-badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;padding:3px 10px;border-radius:999px;line-height:1.2}
.phase-quick{background:#dcfce7;color:#15803d}
.phase-foundation{background:#dbeafe;color:#1d4ed8}
.phase-build{background:#fef3c7;color:#92400e}
.phase-scale{background:#ede9fe;color:#6d28d9}
.exec-summary{position:relative}
.exec-callout{margin:1rem 0;padding:14px 18px;border-radius:8px;border-left:4px solid;background:#f8fafc}
.exec-callout-label{font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;margin-bottom:6px;opacity:.85}
.exec-callout-body{font-size:14px;line-height:1.6}
.exec-opportunity{background:#eff6ff;border-color:#3b82f6}
.exec-opportunity .exec-callout-label{color:#1d4ed8}
.exec-outcome{background:#f0fdf4;border-color:#22c55e}
.exec-outcome .exec-callout-label{color:#15803d}
.exec-risk{background:#fef2f2;border-color:#ef4444}
.exec-risk .exec-callout-label{color:#b91c1c}
.audience-tag{display:inline-block;font-size:10px;font-weight:600;letter-spacing:.4px;padding:2px 8px;background:#eef2ff;color:#4338ca;border-radius:999px;margin:2px 2px 0 0}
.cc-audiences{margin-top:6px;line-height:1.7}
.audience-plays{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.audience-play{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.audience-play-name{font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.audience-play-why{font-size:12.5px;color:var(--text-light);font-style:italic;line-height:1.5;margin:0 0 10px;padding-left:10px;border-left:2px solid var(--accent)}
.section-intro-ai{position:relative;padding-left:14px;border-left:3px solid var(--accent);background:linear-gradient(90deg,rgba(99,102,241,0.06),transparent);padding:10px 14px;border-radius:0 6px 6px 0}
.section.dark .section-intro-ai{background:linear-gradient(90deg,rgba(99,102,241,0.12),transparent)}
.ag-adcount{background:rgba(99,102,241,0.12);color:#6366f1;border-radius:999px;padding:2px 10px;font-weight:600}
.audience-play-count{font-size:11px;font-weight:500;color:var(--text-light);background:var(--bg);padding:2px 8px;border-radius:999px}
.audience-play-list{list-style:none;padding:0;margin:0;font-size:12.5px;color:var(--text-light);line-height:1.6}
.audience-play-list li{padding:3px 0;border-top:1px solid var(--border)}
.audience-play-list li:first-child{border-top:none}
.audience-play-kind{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;padding:1px 6px;background:#f1f5f9;color:#475569;border-radius:4px;margin-right:6px}
/* Internal linking recommendations */
.il-section{margin-top:1.75rem}
.il-section h3{font-size:.95rem;font-weight:700;color:var(--heading);margin:0 0 .75rem;letter-spacing:-.005em}
.il-grid{display:grid;grid-template-columns:1fr;gap:.45rem}
.il-item{display:flex;align-items:flex-start;gap:10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:.65rem .85rem;font-size:13px;color:var(--text);line-height:1.55}
.il-arrow{color:var(--mid);flex-shrink:0;margin-top:1px;font-weight:700}
.il-text{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.il-link{color:var(--accent);text-decoration:none;font-weight:600;word-break:break-word}
.il-link:hover{text-decoration:underline}
.il-url{font-size:11.5px;color:var(--mid);font-family:'SFMono-Regular',Menlo,monospace;word-break:break-all}
/* Priority action grid */
.action-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem}
@media (max-width:760px){.action-grid{grid-template-columns:1fr}}
.ac-card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1.15rem 1.2rem;box-shadow:0 2px 12px rgba(0,0,0,.03)}
.ac-card h4{font-size:13.5px;font-weight:700;color:var(--heading);margin:0 0 6px;line-height:1.35;letter-spacing:-.005em}
.ac-card p{font-size:12.5px;color:var(--text-light);margin:0;line-height:1.55}
.pri{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:2px 8px;border-radius:10px;display:inline-block;margin-bottom:.5rem}
.pri-h{background:#fef2f2;color:#b91c1c}
.pri-mh{background:#fff7ed;color:#b45309}
.pri-m{background:#f0fdf4;color:#15803d}
.pri-og{background:#eef2ff;color:#3730a3}
.pri-lt{background:#fdf4ff;color:#7e22ce}
/* KPI / measurement grid */
/* KPI styles removed */
.budget-loc-grid{display:grid;grid-template-columns:auto 1fr;gap:1rem;margin:1rem 0 1.5rem}
@media (max-width:720px){.budget-loc-grid{grid-template-columns:1fr}}
.loc-card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem}
.loc-card-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-light);margin-bottom:.4rem}
.loc-budget{font-size:24px;font-weight:700;color:var(--heading)}
.loc-chips{display:flex;flex-wrap:wrap;gap:6px}
.loc-chip{display:inline-block;padding:4px 10px;background:var(--bg);border-radius:999px;font-size:12px;color:var(--text)}
.ag-audience{display:inline-block;padding:2px 8px;background:rgba(99,102,241,.12);color:#4f46e5;border-radius:999px;font-size:11px;font-weight:600;margin-left:.5rem}
.ag-heading-row{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1.5rem;flex-wrap:wrap}
/* Callout box */
.callout{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1.15rem 1.3rem;margin-top:1.25rem;font-size:13.5px;color:var(--text);line-height:1.6}
/* Content calendar — Gantt view */
.cal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}
.cal-view-toggle{display:inline-flex;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:3px}
.cal-view-btn{padding:6px 14px;background:transparent;border:none;border-radius:6px;font-size:12.5px;font-weight:600;color:var(--mid);cursor:pointer;font-family:inherit;letter-spacing:-.005em;transition:background .15s,color .15s}
.cal-view-btn.active{background:var(--ink);color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.cal-view-btn:not(.active):hover{color:var(--text)}
.cal-totals{font-size:12.5px;color:var(--mid);font-weight:500}
.cal-gantt{background:var(--white);border:1px solid var(--border);border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.03);overflow:hidden}
.cal-gantt-inner{overflow-x:auto}
.cal-grid{display:grid;min-width:100%}
.cal-grid-month{grid-template-columns:140px repeat(var(--col-count),minmax(110px,1fr))}
.cal-grid-week{grid-template-columns:140px repeat(var(--col-count-week),minmax(70px,1fr));display:none}
.cal-gantt[data-cal-view="week"] .cal-grid-month{display:none}
.cal-gantt[data-cal-view="week"] .cal-grid-week{display:grid}
.cal-th{padding:10px 12px;background:var(--ink);color:#fff;font-size:12px;font-weight:700;border-right:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}
.cal-th-corner{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,.7);position:sticky;left:0;z-index:2;background:var(--ink)}
.cal-th-month{font-size:12.5px}
.cal-th-focus{font-size:10.5px;color:rgba(255,255,255,.7);font-weight:500;margin-top:2px}
.cal-th-week{padding:8px 6px;text-align:center}
.cal-th-week-num{font-size:11px;font-weight:700}
.cal-th-month-mini{font-size:9.5px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.cal-row{display:contents}
.cal-row-label{padding:10px 12px;background:var(--bg);font-size:12.5px;font-weight:600;color:var(--text);border-bottom:1px solid var(--border);border-right:1px solid var(--border);position:sticky;left:0;z-index:1;display:flex;align-items:center;gap:8px}
.cal-row-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--mid)}
.row-pillar .cal-row-dot{background:#7c3aed}
.row-blog .cal-row-dot{background:#1e40af}
.row-reel .cal-row-dot{background:#dc2626}
.row-carousel .cal-row-dot{background:#ea580c}
.row-static .cal-row-dot{background:#0891b2}
.row-story .cal-row-dot{background:#16a34a}
.cal-row-count{margin-left:auto;font-size:10.5px;font-weight:600;color:var(--mid);background:var(--white);padding:1px 7px;border-radius:10px;border:1px solid var(--border)}
.cal-cell{padding:8px 6px;border-right:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--white);display:flex;flex-wrap:wrap;align-content:flex-start;gap:3px;min-height:42px}
.cal-cell-empty{background:repeating-linear-gradient(45deg,var(--bg),var(--bg) 4px,var(--white) 4px,var(--white) 8px);opacity:.55}
.cal-pill{display:inline-flex;align-items:center;padding:2px 7px;border-radius:10px;font-size:9.5px;font-weight:700;letter-spacing:.04em;line-height:1.4;cursor:default;color:#fff}
.cal-pill-pillar{background:#7c3aed}
.cal-pill-blog{background:#1e40af}
.cal-pill-reel{background:#dc2626}
.cal-pill-carousel{background:#ea580c}
.cal-pill-static{background:#0891b2}
.cal-pill-story{background:#16a34a}
.cal-pill-more{background:var(--mid);color:#fff}
@media (max-width:640px){.cal-grid-month{grid-template-columns:110px repeat(var(--col-count),minmax(90px,1fr))}.cal-grid-week{grid-template-columns:110px repeat(var(--col-count-week),minmax(56px,1fr))}.cal-row-label,.cal-th-corner{padding:8px 10px}}
/* Calendar cards view */
.cal-cards-view{margin-top:1rem}
.cal-month-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem}
.cal-month-card{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--white);box-shadow:0 2px 8px rgba(0,0,0,.04)}
.cal-month-card-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;background:var(--ink);color:#fff;flex-wrap:wrap}
.cal-month-name{font-size:14px;font-weight:700}
.cal-month-focus{font-size:11px;color:rgba(255,255,255,.65);flex:1;text-align:center}
.cal-month-count{font-size:11px;font-weight:600;background:rgba(255,255,255,.15);padding:2px 8px;border-radius:999px}
.cal-month-list{list-style:none;margin:0;padding:.5rem .75rem .75rem;display:flex;flex-direction:column;gap:.3rem}
.cal-card-item{display:flex;align-items:flex-start;gap:.5rem;font-size:12.5px;color:var(--text);padding:.25rem 0;border-bottom:1px solid var(--border)}
.cal-card-item:last-child{border-bottom:none}
.cal-card-dot{width:7px;height:7px;border-radius:50%;margin-top:.35rem;flex-shrink:0}
.cal-card-dot-blog{background:#1e40af}
.cal-card-dot-social{background:#0891b2}
.cal-card-type{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);flex-shrink:0}
.cal-card-meta{font-size:11px;color:var(--mid);margin-left:.25rem}
/* Organic social */
.social-freq{background:var(--bg);padding:1rem 1.25rem;border-radius:10px;font-size:14px;margin-bottom:1.5rem;border:1px solid var(--border)}
.mix-chart{display:flex;flex-direction:column;gap:10px;margin-bottom:2rem}
.mix-item{display:flex;align-items:center;gap:12px}
.mix-type{width:90px;font-size:13px;font-weight:600;color:var(--heading);text-transform:capitalize}
.mix-bar{flex:1;height:28px;background:var(--bg);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.mix-fill{height:100%;background:linear-gradient(90deg,#0f172a,#334155);border-radius:8px;transition:width .5s}
.mix-pct{width:40px;text-align:right;font-size:13px;font-weight:700;color:var(--text)}
.pillars-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:1.5rem}
.pillar-card{background:var(--white);padding:1.25rem;border-radius:12px;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.pillar-card h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:6px}
.pillar-card p{font-size:13px;color:var(--text-light);margin-bottom:10px}
.pillar-examples{display:flex;flex-direction:column;gap:4px}
.pillar-example{font-size:12px;color:var(--text);padding:6px 10px;background:var(--bg);border-radius:6px;border-left:3px solid var(--blue)}
.hashtag-list{display:flex;flex-wrap:wrap;gap:6px}
.hashtag{display:inline-block;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text-light)}
.hashtag-warn{background:#fffbea;border-color:#f5e1a2;color:#92400e}
.hashtag-warn-icon{font-size:11px;margin-left:2px}
/* Example articles */
.example-article{border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden;background:var(--white);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.article-header{display:flex;align-items:center;gap:12px;padding:14px 18px;cursor:pointer;user-select:none;transition:background .12s}
.article-header:hover{background:var(--bg)}
.article-num{width:28px;height:28px;border-radius:8px;background:var(--heading);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.article-title{flex:1;font-weight:600;font-size:14px;color:var(--heading)}
.article-badge{display:inline-block;padding:2px 10px;background:#fef3c7;color:#92400e;border-radius:12px;font-size:11px;font-weight:600}
.article-body{display:none;padding:2rem;border-top:1px solid var(--border)}
.example-article.open .article-body{display:block}
.article-body h2{font-size:1.25rem;font-weight:700;color:var(--heading);margin:1.5rem 0 .75rem}
.article-body h3{font-size:1rem;font-weight:600;color:var(--heading);margin:1.25rem 0 .5rem}
.article-body p{margin-bottom:1rem;line-height:1.7}
.article-body ul,.article-body ol{margin:0 0 1rem 1.5rem}
.article-body blockquote{border-left:3px solid var(--blue);padding:1rem 1.25rem;background:var(--bg);margin:1.25rem 0;border-radius:0 10px 10px 0;font-style:italic;color:var(--text-light)}
/* Services */
.services-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-bottom:2rem}
.service-card{background:var(--white);padding:1.25rem;border-radius:12px;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.service-card h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:6px}
.service-card p{font-size:13px;color:var(--text-light);margin-bottom:8px}
.service-price{font-size:1rem;font-weight:800;color:var(--heading)}
.timeline-list{display:flex;flex-direction:column;gap:1.5rem}
.timeline-phase h4{font-size:15px;font-weight:700;color:var(--heading);margin-bottom:8px}
.timeline-phase ul{margin:0 0 0 1.25rem;font-size:14px}
/* Media plan */
.media-summary{display:flex;gap:1rem;margin-bottom:1.5rem}
.media-stat{background:var(--bg);padding:1.25rem;border-radius:10px;flex:1;border:1px solid var(--border)}
.media-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);margin-bottom:2px}
.media-value{font-size:1.25rem;font-weight:800;color:var(--heading)}
.channel-chart{display:flex;flex-direction:column;gap:10px;margin-bottom:1.5rem}
.channel-row{display:flex;align-items:center;gap:12px}
.channel-name{width:130px;font-size:13px;font-weight:600;color:var(--heading)}
.channel-bar{flex:1;height:28px;background:var(--bg);border-radius:8px;overflow:hidden}
.channel-fill{height:100%;background:linear-gradient(90deg,#0f172a,#1e40af);border-radius:8px}
.channel-budget{width:80px;text-align:right;font-size:13px;font-weight:700;color:var(--heading)}
.channel-pct{width:40px;text-align:right;font-size:12px;color:var(--mid)}
/* Watermark */
.watermark{position:fixed;bottom:16px;right:16px;font-size:10px;color:rgba(0,0,0,.05);font-weight:600;text-transform:uppercase;letter-spacing:.25em;pointer-events:none;z-index:50}
/* Chapter panels — slimmer divider, brand gradient accent */
.chapter-panel{background:linear-gradient(135deg,#0a1124 0%,#0f172a 55%,#131f38 100%);padding:2.5rem 3rem;position:relative;overflow:hidden}
.chapter-panel::before{content:'';position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.35),rgba(168,85,247,.25),transparent)}
.chapter-panel::after{content:'';position:absolute;inset:auto 0 0 0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.2),transparent)}
.chapter-panel-orb{position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,rgba(168,85,247,.06) 40%,transparent 70%);right:-160px;top:-180px;pointer-events:none}
.chapter-inner{max-width:1100px;margin:0 auto;position:relative;z-index:1}
.chapter-num{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.2em;color:#a78bfa;margin-bottom:.85rem;display:flex;align-items:center;gap:12px}
.chapter-num::before{content:'';width:28px;height:1px;background:currentColor;display:block;opacity:.5}
.chapter-heading{font-size:clamp(1.75rem,3.2vw,2.5rem);font-weight:700;color:#fff;letter-spacing:-.025em;line-height:1.15;margin:0 0 .75rem}
.chapter-sub{font-size:.975rem;color:rgba(255,255,255,.55);max-width:560px;line-height:1.65;margin:0;font-weight:400}
/* CTA close section */
.cta-section{background:linear-gradient(145deg,#0a1124 0%,#0f172a 40%,#131f38 80%,#0a1020 100%);padding:5.5rem 3rem;position:relative;overflow:hidden}
.cta-orb{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.16) 0%,transparent 70%);pointer-events:none}
.cta-orb:nth-child(1){width:600px;height:600px;top:-200px;right:-100px}
.cta-orb:nth-child(2){width:350px;height:350px;bottom:-100px;left:-80px}
.cta-links{display:flex;flex-wrap:wrap;gap:1rem}
.cta-link-card{display:flex;align-items:center;gap:1rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:1.25rem 1.75rem;color:#fff;text-decoration:none;transition:background .2s,border-color .2s}
.cta-link-card:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18)}
.cta-link-icon{font-size:1.5rem;flex-shrink:0}
.cta-link-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.4);margin-bottom:2px}
.cta-link-val{font-size:14px;font-weight:600;color:rgba(255,255,255,.85)}
/* Password gate */
.auth-gate{position:fixed;inset:0;z-index:9999;background:linear-gradient(145deg,#0a1124 0%,#0f172a 50%,#131f38 100%);display:none;align-items:center;justify-content:center;padding:1.5rem}
.auth-box{background:var(--white);padding:2.5rem 2.5rem 2rem;border-radius:18px;max-width:400px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.05)}
.auth-box svg{height:32px;width:auto;margin-bottom:1.5rem;color:var(--heading)}
.auth-box h2{font-size:.95rem;font-weight:600;color:var(--heading);margin-bottom:1.5rem;letter-spacing:-.01em}
.auth-box input{width:100%;padding:12px 16px;border:1px solid var(--border);border-radius:10px;font-size:14px;margin-bottom:10px;transition:border-color .15s,box-shadow .15s;font-family:inherit}
.auth-box input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(99,102,241,.15)}
.auth-box button{width:100%;padding:12px;background:var(--gradient-accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:filter .15s,transform .15s;font-family:inherit;letter-spacing:-.005em}
.auth-box button:hover{filter:brightness(1.08)}
.auth-box button:active{transform:translateY(1px)}
.auth-error{color:#dc2626;font-size:12.5px;margin-top:8px;min-height:18px}
/* Ad copy */
.ad-copy-section{margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)}
.section.dark .ad-copy-section{border-top-color:rgba(255,255,255,.1)}
.ad-copy-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mid);margin-bottom:12px}
.ad-copy-cols{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:8px}
.ad-copy-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.ad-copy-count{background:var(--border);color:var(--text-light);border-radius:10px;padding:1px 7px;font-size:11px;font-weight:600}
.headlines-list,.descriptions-list{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.headline-item,.desc-item{display:flex;align-items:flex-start;gap:8px;padding:6px 10px;background:var(--bg);border-radius:6px;font-size:13px}
.section.dark .headline-item,.section.dark .desc-item{background:rgba(255,255,255,.05)}
.headline-num{font-size:11px;font-weight:700;color:var(--mid);min-width:18px;margin-top:1px;flex-shrink:0}
.headline-text{flex:1;color:var(--heading);line-height:1.4}
.section.dark .headline-text{color:#e2e8f0}
.desc-item .headline-text{color:var(--text);font-size:12px}
.section.dark .desc-item .headline-text{color:#cbd5e1}
.sitelinks-section{margin-top:12px}
.sitelink-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.sitelink-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;background:#dbeafe;color:#1e40af;border-radius:12px;font-size:12px;font-weight:500}
.char-badge{font-size:10px;font-weight:600;padding:1px 6px;border-radius:8px;white-space:nowrap;flex-shrink:0;margin-top:1px}
.char-ok{background:#d1fae5;color:#065f46}
.char-warn{background:#fef3c7;color:#92400e}
.char-over{background:#fee2e2;color:#dc2626}
/* Page-optimisation deep enrichment ("Now \u2192 Better") */
.page-state-block,.page-rewrite-block,.page-kw-block,.page-schema-block,.page-faq-block{margin-top:.85rem;padding:.75rem .9rem;border-radius:6px;border-left:3px solid var(--accent);background:#f8fafc}
.page-rewrite-block{border-left-color:#10b981;background:#ecfdf5}
.page-kw-block{border-left-color:#6366f1;background:#eef2ff}
.page-schema-block{border-left-color:#f59e0b;background:#fffbeb}
.page-faq-block{border-left-color:#8b5cf6;background:#f5f3ff}
.page-state-heading{margin:0 0 .55rem 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--mid)}
.page-state-grid{display:flex;flex-direction:column;gap:.55rem}
.onpage-suggest{font-weight:600;color:#065f46}
.onpage-missing{color:#dc2626;font-style:italic;font-size:12px}
.status-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px}
.status-chip-ok{background:#d1fae5;color:#065f46}
.status-chip-warn{background:#fef3c7;color:#92400e}
.status-chip-miss{background:#fee2e2;color:#dc2626}
.kw-pill-ok{background:#d1fae5;color:#065f46}
.kw-pill-miss{background:#fee2e2;color:#dc2626}
.kw-table-wrap{overflow-x:auto}
.kw-table{width:100%;border-collapse:collapse;font-size:12px}
.kw-table th{text-align:left;padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);border-bottom:1px solid #e2e8f0;white-space:nowrap}
.kw-table td{padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}
.kw-table tr:last-child td{border-bottom:none}
.kw-rationale{color:var(--text-light);font-size:11px;line-height:1.4}
.potential-band{display:inline-block;font-size:10px;font-weight:700;padding:2px 7px;border-radius:8px;white-space:nowrap}
.band-top-3{background:#fee2e2;color:#991b1b}
.band-top-10{background:#fed7aa;color:#9a3412}
.band-top-20{background:#fef3c7;color:#854d0e}
.band-top-50{background:#e0e7ff;color:#3730a3}
.faq-item{margin-top:.4rem;border:1px solid #e2e8f0;border-radius:4px;background:#fff}
.faq-item summary{cursor:pointer;padding:.55rem .7rem;font-weight:600;font-size:13px;color:var(--text);list-style:none}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary::before{content:"+ ";color:var(--accent);font-weight:700;margin-right:4px}
.faq-item[open] summary::before{content:"\u2212 "}
.faq-answer{padding:0 .7rem .65rem .7rem;font-size:12px;line-height:1.55;color:var(--text-light)}
/* Media plan table */
.channel-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:1rem}
.channel-table th{text-align:left;padding:10px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);background:var(--bg);border-bottom:1px solid var(--border)}
.channel-table td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}
.channel-table tr:last-child td{border-bottom:none}
.channel-strategy{color:var(--text-light);font-size:12px;line-height:1.5}
/* Landing page preview */
.lp-meta{display:flex;align-items:center;gap:12px;margin-bottom:1.25rem;flex-wrap:wrap}
.lp-badge{background:#dbeafe;color:#1e40af;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;white-space:nowrap}
.lp-hint{font-size:13px;color:var(--text-light);line-height:1.5}
.lp-frame-wrap{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:#1e293b;transition:all .3s;box-shadow:0 8px 40px rgba(0,0,0,.12)}
.lp-frame-wrap.lp-expanded{position:fixed;inset:0;z-index:200;border-radius:0;border:none}
.lp-toolbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:#1e293b}
.lp-dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.15)}
.lp-dot:first-child{background:#ff5f57}.lp-dot:nth-child(2){background:#ffbd2e}.lp-dot:nth-child(3){background:#28c840}
.lp-url-bar{flex:1;background:rgba(255,255,255,.1);border-radius:6px;padding:4px 12px;font-size:11px;color:rgba(255,255,255,.5);font-family:monospace}
.lp-expand-btn,.lp-open-btn{background:none;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);font-size:12px;font-weight:500;cursor:pointer;padding:4px 10px;border-radius:6px;transition:all .15s;font-family:inherit}
.lp-expand-btn{font-size:14px;padding:4px 8px}
.lp-expand-btn:hover,.lp-open-btn:hover{color:#fff;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.3)}
.lp-iframe{width:100%;height:1100px;border:none;background:#fff;display:block}
.lp-frame-wrap.lp-expanded .lp-iframe{height:calc(100vh - 42px)}
.lp-placeholder{background:rgba(245,158,11,.06);border:1px dashed rgba(245,158,11,.4);border-radius:14px;padding:3rem 2.5rem;text-align:center;margin:1rem 0}
.lp-placeholder-icon{font-size:2.4rem;margin-bottom:1rem;opacity:.7}
.lp-placeholder h3{font-size:1.25rem;font-weight:700;color:#92400e;margin-bottom:.75rem}
.lp-placeholder p{font-size:14px;color:#78350f;line-height:1.7;max-width:640px;margin:0 auto .75rem}
.lp-placeholder p em{font-style:normal;background:rgba(245,158,11,.12);padding:1px 6px;border-radius:4px;color:#92400e}
.lp-placeholder-hint{font-size:13px !important;color:#a16207 !important;margin-top:1rem !important;opacity:.85}
/* Email marketing */
.em-flow{border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:8px;background:var(--white)}
.em-flow .em-flow-body{display:none;padding:1.25rem}
.em-flow.open .em-flow-body{display:block}
.em-flow-header{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;transition:background .12s}
.em-flow-header:hover{background:var(--bg)}
.em-trigger{font-size:12px;color:var(--text-light);margin-bottom:12px}
.em-emails{display:flex;flex-direction:column;gap:6px}
.em-email-item{display:flex;gap:10px;padding:8px 10px;background:var(--bg);border-radius:8px}
.em-email-num{font-size:11px;font-weight:700;color:var(--mid);min-width:18px;flex-shrink:0;margin-top:2px}
.em-email-content{flex:1}
.em-subject{font-size:13px;font-weight:600;color:var(--heading)}
.em-purpose{font-size:12px;color:var(--text-light);margin-top:2px}
.em-delay{display:inline-block;font-size:10px;padding:1px 6px;background:#dbeafe;color:#1e40af;border-radius:8px;margin-top:4px}
.em-campaigns-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.em-campaign-card{padding:1.25rem;background:var(--white);border-radius:12px;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.em-campaign-card h4{font-size:14px;font-weight:600;color:var(--heading);margin-bottom:6px}
.em-campaign-card p{font-size:12px;color:var(--text-light);margin-top:6px}
.em-campaign-meta{display:flex;gap:6px;flex-wrap:wrap}
.em-tag{font-size:10px;padding:2px 8px;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--text-light)}
.em-segments{display:flex;flex-direction:column;gap:6px}
.em-segment{display:flex;flex-direction:column;gap:2px;padding:10px 14px;background:var(--white);border-radius:10px;border:1px solid var(--border)}
.em-segment strong{font-size:13px;color:var(--heading)}
.em-criteria{font-size:11px;color:var(--text-light)}
.em-seg-purpose{font-size:11px;color:var(--mid)}
/* LinkedIn Ads */
.li-campaign{margin-bottom:1.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border)}
.li-campaign:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0}
.li-campaign h3{font-size:1.1rem;font-weight:700;color:var(--heading);margin-bottom:12px}
.li-targeting{margin-top:12px}
.li-targeting h4,.li-creatives h4{font-size:12px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
.audience-chips{display:flex;flex-wrap:wrap;gap:6px}
.li-creatives{margin-top:12px}
.li-creative{padding:12px 16px;background:var(--bg);border-radius:10px;margin-bottom:6px;border:1px solid var(--border)}
.li-creative-headline{font-size:14px;font-weight:600;color:var(--heading);display:flex;align-items:center;gap:6px}
.li-creative-text{font-size:12px;color:var(--text);margin-top:4px}
.li-creative-desc{font-size:11px;color:var(--text-light);margin-top:2px}
.li-cta-badge{display:inline-block;font-size:10px;padding:2px 8px;background:#dbeafe;color:#1e40af;border-radius:8px;margin-top:6px}
/* Google Ads Forecast */
.forecast-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-top:1.25rem}
.forecast-card{padding:1.25rem;background:var(--white);border-radius:12px;text-align:center;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.forecast-card.accent{background:linear-gradient(135deg,#0f172a,#1e293b);border-color:transparent}
.forecast-card.accent .forecast-value{color:#fff}
.forecast-card.accent .forecast-label{color:#94a3b8}
.forecast-value{display:block;font-size:1.5rem;font-weight:800;color:var(--heading);letter-spacing:-1px}
.forecast-label{display:block;font-size:11px;color:var(--text-light);margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.forecast-sub{display:block;font-size:10px;color:var(--text-light);margin-top:6px;font-style:italic}
.forecast-card.accent .forecast-sub{color:#cbd5e1}
/* Competitor Intelligence */
.comp-domain{font-weight:600;color:var(--heading)}
.comp-num{text-align:right;font-variant-numeric:tabular-nums}
.comp-details{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.comp-detail-card{padding:1.25rem;background:var(--white);border-radius:12px;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.comp-detail-card h4{font-size:14px;font-weight:600;color:var(--heading);margin-bottom:8px}
.comp-keywords{font-size:12px;color:var(--text-light);margin-bottom:10px}
.comp-kw-label{font-weight:600}
.comp-kw-chip{display:inline-block;font-size:11px;padding:1px 6px;background:var(--bg);border:1px solid var(--border);border-radius:6px;margin:2px}
.comp-sw-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.comp-sw-col ul{margin:0;padding-left:1rem;font-size:12px;color:var(--text)}
.comp-sw-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px}
.comp-strength{color:#065f46}
.comp-weakness{color:#dc2626}
.comp-opportunities{margin-top:10px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px}
.comp-opportunities ul{margin:0;padding-left:1rem;font-size:12px;color:#1e40af;line-height:1.55}
.comp-opportunity{color:#1d4ed8}
.comp-source-badge{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.04em;margin-left:8px;vertical-align:middle}
.comp-source-manual{background:#dbeafe;color:#1e40af}
.comp-source-auto{background:#dcfce7;color:#166534}
.comp-source-inferred{background:#fef3c7;color:#92400e}
.comp-overlap-pill{display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;background:#ede9fe;color:#5b21b6;margin-left:6px;vertical-align:middle}
.comp-page-ctx{font-size:12px;color:var(--text-light);background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:10px;line-height:1.5}
.comp-page-ctx strong{color:var(--heading);font-weight:600}
/* SEO metadata on articles */
.seo-meta-block{padding:1rem 1.25rem;background:#f8fafc;border:1px solid var(--border);border-radius:10px;margin-bottom:1.25rem}
.seo-meta-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--mid);margin-bottom:8px}
.seo-meta-grid{display:flex;flex-direction:column;gap:6px}
.seo-meta-item{display:flex;gap:8px;align-items:flex-start}
.seo-meta-label{font-size:11px;font-weight:600;color:var(--text-light);min-width:100px;flex-shrink:0}
.seo-meta-value{font-size:12px;color:var(--heading);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.seo-kw-chip{display:inline-block;font-size:10px;padding:1px 6px;background:#dbeafe;color:#1e40af;border-radius:6px}
/* Responsive */
@media(max-width:900px){
  .hero{padding:2.75rem 2rem 2rem;min-height:auto}
  .hero h1{font-size:clamp(2rem,5vw,3rem)}
  .stats-row{grid-template-columns:repeat(3,1fr);row-gap:1.5rem}
  .stat-item{border-right:none;padding:0 1rem;min-height:56px}
  .section{padding:4rem 2rem}
  .ad-copy-cols{grid-template-columns:1fr}
  .snav-dropdown-inner{padding:0 2rem}
  .sticky-nav-inner{padding:0 2rem}
}
@media(max-width:640px){
  .hero{padding:2.25rem 1.5rem 1.75rem}
  .hero h1{font-size:2rem;letter-spacing:-1px}
  .hero-meta{gap:1.5rem}
  .stats-row{grid-template-columns:repeat(2,1fr)}
  .section{padding:3rem 1.5rem}
  .overview-grid{grid-template-columns:1fr}
  .content-cards{grid-template-columns:1fr}
  .creatives-grid{grid-template-columns:1fr}
  .forecast-grid{grid-template-columns:repeat(2,1fr)}
  .ctx-audience-grid{grid-template-columns:1fr}
  .deliv-grid{grid-template-columns:1fr}
  .ad-mockup-grid{grid-template-columns:1fr}
  .opp-grid{grid-template-columns:1fr}
}
/* Print */
@media print{
  @page{margin:18mm 14mm}
  .sticky-nav,.snav-dropdown,.snav-menu-btn,.gp-toc,.watermark,.auth-gate,.copy-btn,.copy-btn-sm,.hero-orb,.cta-close,.lp-frame-wrap,.lp-iframe{display:none!important}
  html,body{background:#fff!important;color:#0f172a!important}
  .hero{min-height:auto;padding:2.5rem;page-break-after:always;background:#fff!important;color:#0f172a!important}
  .hero h1,.hero-label,.hero-sub,.hero-meta-item,.hero-meta-item strong,.hero-meta-item span{color:#0f172a!important}
  .hero-divider{background:#0f172a!important}
  .stats-band{page-break-after:always;background:#f1f5f9!important}
  .stats-band .stat-num{background:none!important;-webkit-text-fill-color:#0f172a!important;color:#0f172a!important}
  .chapter-panel,.section,.section.dark,.section.alt{padding:1.25rem 0;break-inside:avoid;page-break-inside:avoid;background:#fff!important;color:#0f172a!important}
  .section.dark *,.section.dark h2,.section.dark h3,.section.dark p{color:#0f172a!important}
  .ag-body{display:block!important}
  .article-body{display:block!important}
  table,figure,.ad-card,.audience-card,.kw-table{break-inside:avoid;page-break-inside:avoid}
  h1,h2,h3{break-after:avoid;page-break-after:avoid}
  body{font-size:11.5px;line-height:1.55}
  a{color:inherit!important;text-decoration:none!important}
}

/* ── Context section ────────────────────────────────────────── */
.ctx-brief{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:2rem 2.5rem;margin-bottom:1rem}
.ctx-block-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.3);margin-bottom:1rem;display:flex;align-items:center;gap:10px}
.ctx-block-label::before{content:'';width:20px;height:1px;background:currentColor;display:block}
.ctx-brief-text{font-size:1.05rem;color:rgba(255,255,255,.75);line-height:1.75;margin:0}
.ctx-audience-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.25rem;margin-top:1.25rem}
.ctx-audience-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:1.75rem}
.ctx-audience-num{font-size:2rem;font-weight:900;color:rgba(99,102,241,.4);letter-spacing:-2px;line-height:1;margin-bottom:.75rem}
.ctx-audience-name{font-size:1rem;font-weight:700;color:#fff;margin-bottom:.6rem;line-height:1.35}
.ctx-audience-desc{font-size:13.5px;color:rgba(255,255,255,.55);line-height:1.7;margin-bottom:1.25rem}
.ctx-pain-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.3);margin-bottom:.5rem}
.ctx-pain-list{list-style:none;padding:0;margin:0 0 1rem;display:flex;flex-direction:column;gap:5px}
.ctx-pain-list li{font-size:13px;color:rgba(255,255,255,.6);padding:5px 10px;background:rgba(255,255,255,.04);border-radius:6px;border-left:2px solid rgba(99,102,241,.5)}
.ctx-channels{display:flex;flex-wrap:wrap;gap:5px;margin-top:.25rem}
.ctx-channel-chip{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(59,130,246,.18);color:#93c5fd;border:1px solid rgba(59,130,246,.25)}

/* ── Persona pull-quote (Lux index.html persona pattern) ──── */
.persona-quote{position:relative;margin:0 0 1.25rem;padding:1rem 1.1rem 1rem 2.6rem;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18);border-left:3px solid rgba(99,102,241,.55);border-radius:10px}
.persona-quote p{margin:0;font-size:13.5px;line-height:1.6;color:rgba(255,255,255,.78);font-style:italic;font-weight:500}
.persona-quote-mark{position:absolute;top:.1rem;left:.7rem;font-size:2.6rem;line-height:1;color:rgba(99,102,241,.5);font-family:Georgia,serif;font-weight:700}

/* ── Sector/keyword preview accordion (Lux index.html) ────── */
.sector-preview{border-top:1px solid rgba(255,255,255,.08);margin-top:1rem;padding-top:.9rem}
.sector-preview > summary{font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.55);cursor:pointer;list-style:none;display:flex;align-items:center;gap:8px;user-select:none}
.sector-preview > summary::-webkit-details-marker{display:none}
.sector-preview > summary::marker{display:none;content:""}
.sp-toggle{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;transition:transform .2s;font-style:normal;line-height:1;color:rgba(255,255,255,.7)}
.sector-preview[open] .sp-toggle{transform:rotate(45deg)}
.sp-body{padding-top:.9rem;display:flex;flex-direction:column;gap:.9rem}
.sp-section{background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.07);padding:1rem 1.1rem}
.sp-col-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.4);margin-bottom:.65rem}
.sp-kw-list{list-style:none;padding:0;margin:0}
.sp-kw-list li{font-size:12.5px;color:rgba(255,255,255,.7);padding:.45rem 0;display:flex;flex-direction:column;gap:3px;line-height:1.5}
.sp-kw-list li + li{border-top:1px solid rgba(255,255,255,.06)}
.sp-kw-list li strong{font-size:12px;font-weight:700;color:#fff}
.sp-kw-list li span{font-size:11.5px;color:rgba(255,255,255,.45);font-family:'SF Mono',Menlo,Consolas,monospace}

.ctx-periods-list{display:flex;flex-direction:column;gap:10px;margin-top:1.25rem}
.ctx-period-item{display:flex;gap:1.25rem;padding:1.25rem 1.5rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;align-items:flex-start}
.ctx-period-num{font-size:1.5rem;font-weight:900;color:rgba(99,102,241,.4);letter-spacing:-1px;line-height:1;flex-shrink:0;width:36px}
.ctx-period-dates{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.35);margin-bottom:3px}
.ctx-period-label{font-size:15px;font-weight:700;color:#fff;margin-bottom:3px}
.ctx-period-desc{font-size:13px;color:rgba(255,255,255,.5);line-height:1.55}

/* ── Opportunity cards (Lux plan.html) ──────────────────────── */
.opp-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem}
.opp-card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1.25rem;box-shadow:0 2px 12px rgba(0,0,0,.03)}
.opp-card h4{font-size:13.5px;font-weight:700;color:var(--heading);margin-bottom:6px;line-height:1.35;padding-bottom:8px;border-bottom:1px solid var(--border)}
.opp-card p{font-size:13.5px;color:var(--text);margin:0}
.opp-stat{color:var(--blue);font-weight:700}

/* ── Strategy cards (Lux plan.html) ─────────────────────────── */
.str-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.25rem}
.str-card{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
.str-icon{font-size:1.5rem;margin-bottom:.5rem;display:block}
.str-card h4{font-size:13.5px;font-weight:700;color:var(--heading);margin-bottom:5px}
.str-card p{font-size:13px;color:var(--text-light);margin:0}

/* ── Tactic list (Lux plan.html) ────────────────────────────── */
.tac-list{list-style:none;padding:0}
.tac-item{display:flex;gap:1rem;padding:1rem 0;border-bottom:1px solid var(--border);align-items:flex-start}
.tac-item:last-child{border-bottom:none}
.tac-num{width:32px;height:32px;border-radius:10px;background:var(--heading);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.tac-title{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:3px}
.tac-body{font-size:13px;color:var(--text-light)}

/* ── Action grid with priority badges ───────────────────────── */
.action-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.ac-card{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:1.25rem}
.ac-card h4{font-size:13.5px;font-weight:700;color:var(--heading);margin-bottom:5px;line-height:1.35}
.ac-card p{font-size:12.5px;color:var(--text-light);margin:0}
.pri{display:inline-flex;align-items:center;padding:2px 10px;border-radius:12px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
.pri-h{background:#fee2e2;color:#b91c1c}
.pri-mh{background:#fff7ed;color:#b45309}
.pri-m{background:#d1fae5;color:#065f46}
.pri-low{background:#f1f5f9;color:#64748b}

/* ── KPI cards ──────────────────────────────────────────────── */
/* duplicate KPI styles removed */

/* ── Future items list ──────────────────────────────────────── */
.fut-list{display:flex;flex-direction:column}
.fut-item{display:flex;gap:14px;padding:1rem 0;border-bottom:1px solid var(--border);align-items:flex-start}
.fut-item:last-child{border-bottom:none}
.fut-dot{width:10px;height:10px;border-radius:50%;background:var(--blue);margin-top:5px;flex-shrink:0}
.fut-item h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:3px}
.fut-item p{font-size:13.5px;color:var(--text-light);margin:0}

/* ── Callout block ──────────────────────────────────────────── */
.callout{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:12px;padding:1.25rem 1.5rem;margin:1.5rem 0;font-size:14px;color:#1e40af;line-height:1.6}
.callout strong{color:#1e3a8a}

/* ── Deliverables grid (Lux index.html) ─────────────────────── */
.deliv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;margin-bottom:2rem}
.deliv-card{border-radius:14px;overflow:hidden;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.04)}
.deliv-head{padding:1.25rem 1.5rem;color:#fff;font-size:13.5px;font-weight:700;letter-spacing:-.1px}
.deliv-head.c1{background:#0f172a}
.deliv-head.c2{background:#1d4ed8}
.deliv-head.c3{background:#0369a1}
.deliv-head.c4{background:#7c3aed}
.deliv-head.c5{background:#b45309}
.deliv-head.c6{background:#065f46}
.deliv-head.c7{background:#374151}
.deliv-head.c8{background:#dc2626}
.deliv-body{padding:1rem 1.25rem;background:var(--white)}
.deliv-row{display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text)}
.deliv-row:last-child{border-bottom:none;padding-bottom:0}
.deliv-dot{width:5px;height:5px;border-radius:50%;background:var(--mid);margin-top:7px;flex-shrink:0}
.deliv-count{font-size:10.5px;font-weight:600;color:var(--mid);margin-left:auto;white-space:nowrap;flex-shrink:0}

/* ── Objective cards ────────────────────────────────────────── */
.obj-panel{display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem}
.obj-card{display:flex;gap:1.25rem;background:var(--white);border:1px solid var(--border);border-radius:14px;padding:1.5rem;align-items:flex-start;box-shadow:0 2px 12px rgba(0,0,0,.03)}
.obj-num{width:40px;height:40px;border-radius:12px;background:var(--heading);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex-shrink:0}
.obj-card h3{font-size:1rem;font-weight:700;color:var(--heading);margin-bottom:.5rem}
.obj-card p{font-size:13.5px;color:var(--text);line-height:1.7;margin:0}

/* ── Three pillar cards (Lux index.html) ────────────────────── */
.pillars-hero{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin:1.5rem 0 2rem}
.pillar-hero-card{border-radius:16px;padding:2rem;position:relative;overflow:hidden;color:#fff}
.pillar-hero-card.p1{background:linear-gradient(135deg,#1e3a5f,#1d4ed8)}
.pillar-hero-card.p2{background:linear-gradient(135deg,#14532d,#16a34a)}
.pillar-hero-card.p3{background:linear-gradient(135deg,#581c87,#7c3aed)}
.pillar-hero-orb{position:absolute;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.1);top:-50px;right:-40px}
.pillar-hero-icon{font-size:2rem;margin-bottom:.75rem;display:block;position:relative;z-index:1}
.pillar-hero-card h3{font-size:1.05rem;font-weight:700;color:#fff;margin-bottom:.5rem;position:relative;z-index:1}
.pillar-hero-card p{font-size:13px;color:rgba(255,255,255,.75);margin:0;position:relative;z-index:1;line-height:1.6}
.pillar-hero-count{position:absolute;bottom:1.25rem;right:1.25rem;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.4);z-index:1}

/* ── Ad card mockups ────────────────────────────────────────── */
.ad-mockup-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin:1.5rem 0}
.ad-channel-group{margin-bottom:2rem}
.ad-channel-group:last-child{margin-bottom:0}
.ad-channel-label{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mid);margin:0 0 1rem;display:flex;align-items:center;gap:.55rem}
.ad-card{background:var(--white);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.05)}
.ad-card-header{padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;background:var(--bg);border-bottom:1px solid var(--border)}
.ad-badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase}
.ad-badge.google{background:#ea4335;color:#fff}
.ad-badge.linkedin{background:#0077b5;color:#fff}
.ad-badge.meta{background:#1877f2;color:#fff}
.ad-card-body{padding:1.25rem}
/* Google ad mockup */
.gad-sponsor-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}
.gad-dot{width:6px;height:6px;border-radius:50%;background:#000;opacity:.8}
.gad-sponsored-tag{font-size:10.5px;border:1px solid #70757a;color:#70757a;padding:1px 5px;border-radius:3px;font-weight:600}
.gad-url-text{font-size:12px;color:#1a0dab;margin-bottom:2px}
.gad-headline{font-size:17px;color:#1a0dab;line-height:1.35;margin-bottom:3px;cursor:default;display:flex;flex-wrap:nowrap;align-items:baseline;gap:6px;overflow:hidden}
.gad-h-part{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gad-headline-sep{color:#70757a;font-weight:400;flex:0 0 auto}
.gad-desc{font-size:13px;color:#4d5156;line-height:1.55;margin-bottom:0}
.gad-sitelinks{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0}
.gad-sitelink{font-size:12px;color:#1a0dab}
/* Meta ad mockup */
.mad-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.mad-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1877f2,#0f4c95);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0}
.mad-info-name{font-size:13.5px;font-weight:700;color:var(--heading);line-height:1.2}
.mad-info-sub{font-size:11.5px;color:var(--mid)}
.mad-image-wrap{background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:8px;margin-bottom:10px;overflow:hidden;min-height:120px;display:flex;align-items:center;justify-content:center}
.mad-img-content{padding:1.5rem;color:#fff;text-align:center}
.mad-img-content strong{font-size:.95rem;font-weight:800;display:block;line-height:1.35}
.mad-img-content span{font-size:12px;opacity:.75;margin-top:4px;display:block}
.mad-img-mockup{padding:1.1rem 1.25rem;color:#e2e8f0;text-align:left;width:100%}
.mad-img-mockup-label{display:block;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:6px}
.mad-img-mockup p{margin:0;font-size:12.5px;line-height:1.5;font-style:italic;color:#f1f5f9}
.mad-char-meter{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)}
.mad-caption{font-size:13px;color:var(--text);line-height:1.6;margin-bottom:8px}
.mad-cta-block{background:var(--bg);border-radius:8px;padding:.65rem 1rem;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.mad-cta-block-url{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--mid)}
.mad-cta-block-title{font-size:13px;font-weight:700;color:var(--heading)}
.mad-cta-btn{background:#1877f2;color:#fff;font-size:12px;font-weight:700;padding:.3rem .85rem;border-radius:6px;flex-shrink:0}
/* LinkedIn ad mockup */
.lad-profile{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.lad-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#0077b5,#004e78);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0}
.lad-info-name{font-size:13.5px;font-weight:700;color:var(--heading);line-height:1.2}
.lad-info-sub{font-size:11.5px;color:var(--mid)}
.lad-follow{font-size:12px;font-weight:700;color:#0077b5;margin-top:2px}
.lad-image-wrap{background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:8px;margin-bottom:10px;overflow:hidden;min-height:100px;display:flex;align-items:center;justify-content:center}
.lad-img-txt{padding:1.25rem;color:#fff;font-weight:700;font-size:.9rem;text-align:center;line-height:1.4}
.lad-caption{font-size:13px;color:var(--text);line-height:1.6;margin-bottom:10px}
.lad-cta-row{display:flex;align-items:center;justify-content:space-between}
.lad-cta-btn{background:transparent;border:1px solid #0077b5;color:#0077b5;font-size:12.5px;font-weight:700;padding:.3rem .85rem;border-radius:6px}
.lad-stats{font-size:11.5px;color:var(--mid)}

/* Data grounding badges (real / partial / ai-only) */
.dg-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;margin-left:10px;vertical-align:middle;letter-spacing:.02em;text-transform:uppercase;cursor:help}
.dg-real{background:#dcfce7;color:#166534;border:1px solid #86efac}
.dg-partial{background:#fef3c7;color:#92400e;border:1px solid #fde68a}
.dg-ai{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
.dg-badge::before{content:"\u25cf";font-size:9px}

/* Data sources used panel */
.data-sources-panel{margin:1.5rem 0 2rem;padding:1rem 1.25rem;background:#f8fafc;border-left:3px solid #0ea5e9;border-radius:6px}
.data-sources-panel h3{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#0c4a6e;margin:0 0 .5rem 0}
.data-sources-list{display:flex;flex-wrap:wrap;gap:.4rem .6rem;margin:0;padding:0;list-style:none;font-size:12.5px}
.data-sources-list li{background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:.25rem .55rem;color:#334155}
.data-sources-list li .ds-detail{color:#64748b;font-size:11.5px;margin-left:4px}

/* Strategy Brain panel (internal review — hidden in public share view) */
.brain-panel{max-width:1180px;margin:2.5rem auto 0;background:#fafbff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;font-family:inherit}
.brain-panel .section-inner{padding:1.75rem 2rem 0}
.brain-summary{display:flex;flex-wrap:wrap;align-items:baseline;gap:1rem;padding:1.25rem 1.75rem;cursor:pointer;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;list-style:none}
.brain-summary::-webkit-details-marker{display:none}
.brain-kicker{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#a78bfa}
.brain-title{font-size:1.05rem;font-weight:600;color:#fff}
.brain-toggle{font-size:11px;color:#94a3b8;margin-left:auto}
.brain-panel[open] .brain-toggle::before{content:"▾ "}
.brain-panel:not([open]) .brain-toggle::before{content:"▸ "}
.brain-inner{padding:1.75rem 2rem 2rem}
.brain-headline{margin-bottom:1.75rem;padding-bottom:1.25rem;border-bottom:1px solid #e2e8f0}
.brain-headline-label{font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#6366f1;margin-bottom:.5rem}
.brain-headline-statement{font-size:1.15rem;font-weight:600;color:#0f172a;line-height:1.5;margin:0 0 .75rem}
.brain-proof{margin:.5rem 0 0;padding-left:1.25rem;color:#475569;font-size:13px;line-height:1.6}
.brain-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem;margin-bottom:1.75rem}
.brain-cell{padding:1rem 1.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:10px}
.brain-cell h4{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#475569;margin:0 0 .75rem}
.brain-cell p{font-size:13px;color:#334155;line-height:1.55;margin:0 0 .5rem}
.brain-cell ul{margin:.25rem 0 .75rem;padding-left:1.25rem;font-size:13px;color:#475569;line-height:1.55}
.brain-cell-wide{grid-column:span 2}
.brain-primary-msg{background:#eef2ff;border:1px solid #c7d2fe;padding:.6rem .85rem;border-radius:8px;font-weight:600;color:#1e1b4b !important}
.brain-channels li{margin-bottom:.4rem}
.brain-meta{color:#64748b;font-size:12px}
.brain-audiences h4{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#475569;margin:0 0 .75rem}
.brain-geos-cell{background:#f8f7ff;border-color:#c7d2fe}
.brain-audience-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.75rem}
.brain-audience{padding:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;border-left:3px solid #6366f1}
.brain-audience[open]>.brain-audience-summary{border-radius:8px 8px 0 0}
.brain-audience-summary{display:flex;flex-direction:column;gap:.25rem;padding:.85rem 1rem;cursor:pointer;list-style:none;border-radius:8px}
.brain-audience-summary::-webkit-details-marker{display:none}
.brain-audience-name{font-size:13px;font-weight:700;color:#0f172a}
.brain-audience-insight{font-size:12px;color:#475569;line-height:1.4}
.brain-audience-detail{padding:.5rem 1rem .85rem;border-top:1px solid #e2e8f0}
.brain-audience-line{font-size:12px;color:#475569;line-height:1.5;margin-bottom:.2rem}
@media(max-width:760px){.brain-grid{grid-template-columns:1fr}.brain-cell-wide{grid-column:span 1}.brain-summary{padding:1rem 1.25rem}.brain-inner{padding:1.25rem}}

/* Coherence issues panel (Strategist Review — internal only) */
.coh-panel{max-width:1180px;margin:1.25rem auto 0;background:#fef3c7;border:1px solid #fcd34d;border-radius:14px;overflow:hidden}
.coh-summary{display:flex;flex-wrap:wrap;align-items:baseline;gap:1rem;padding:1rem 1.5rem;cursor:pointer;list-style:none;background:#fbbf24;color:#451a03}
.coh-summary::-webkit-details-marker{display:none}
.coh-kicker{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}
.coh-title{font-size:14px;font-weight:600}
.coh-toggle{font-size:11px;color:#78350f;margin-left:auto}
.coh-panel[open] .coh-toggle::before{content:"▾ "}
.coh-panel:not([open]) .coh-toggle::before{content:"▸ "}
.coh-inner{padding:1.25rem 1.75rem 1.5rem;background:#fffbeb}
.coh-intro{font-size:13px;color:#78350f;margin:0 0 1rem}
.coh-group{margin-bottom:1rem}
.coh-section{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#78350f;margin-bottom:.4rem}
.coh-group ul{margin:0;padding-left:1.25rem;font-size:13px;color:#451a03;line-height:1.55}
.coh-item{margin-bottom:.5rem}
.coh-issue{display:block;font-weight:600}
.coh-fix{display:block;font-size:12px;color:#78350f;margin-top:2px}
.coh-high{color:#7f1d1d}.coh-medium{color:#78350f}.coh-low{color:#92400e}

/* ── TLDR view (internal handoff) ─────────────────────────────────────── */
.tldr-toggle{position:fixed;top:1rem;right:1rem;z-index:9998;display:inline-flex;align-items:center;gap:.5rem;padding:.55rem .9rem;border-radius:999px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.1);font-family:inherit;font-size:13px;font-weight:600;letter-spacing:.02em;cursor:pointer;box-shadow:0 6px 24px rgba(15,23,42,.18);transition:transform .15s ease,background .15s ease}
.tldr-toggle:hover{transform:translateY(-1px);background:#1e293b}
.tldr-toggle-icon{font-size:14px;line-height:1}
body.tldr-mode .tldr-toggle{background:#7c3aed;border-color:rgba(255,255,255,.18)}
body.tldr-mode .tldr-toggle .tldr-toggle-label::after{content:" \u2715";opacity:.7;margin-left:.15rem}

.tldr-view{display:none;position:fixed;inset:0;z-index:9990;background:#f8fafc;overflow-y:auto;padding:5rem 1.5rem 4rem;font-family:inherit;color:#0f172a}
body.tldr-mode .tldr-view{display:block}
body.tldr-mode .hero,body.tldr-mode .stats-band,body.tldr-mode .strategy-brain-panel,body.tldr-mode .coherence-panel,body.tldr-mode .chapter-panel,body.tldr-mode .section,body.tldr-mode .cta-section,body.tldr-mode #sticky-nav,body.tldr-mode #gp-toc,body.tldr-mode .watermark{display:none !important}
body.tldr-mode{background:#f8fafc}

.tldr-header{max-width:1100px;margin:0 auto 2rem;display:flex;justify-content:space-between;align-items:flex-start;gap:1.5rem;padding-bottom:1.25rem;border-bottom:1px solid #e2e8f0}
.tldr-header-kicker{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#7c3aed;margin-bottom:.4rem}
.tldr-header-title{font-size:clamp(1.5rem,3vw,2rem);font-weight:800;letter-spacing:-.5px;margin:0 0 .35rem;color:#0f172a}
.tldr-header-sub{margin:0;color:#64748b;font-size:14px;max-width:560px}
.tldr-close-btn{flex:0 0 auto;padding:.6rem 1.1rem;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:600;font-size:13px;cursor:pointer;transition:background .15s ease}
.tldr-close-btn:hover{background:#f1f5f9}

.tldr-cards{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
.tldr-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:1.1rem 1.15rem 1rem;display:flex;flex-direction:column;gap:.6rem;box-shadow:0 1px 2px rgba(15,23,42,.04);transition:border-color .15s ease,box-shadow .15s ease}
.tldr-card:hover{border-color:#cbd5e1;box-shadow:0 4px 16px rgba(15,23,42,.06)}
.tldr-kicker{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7c3aed}
.tldr-card-title{font-size:1rem;font-weight:700;color:#0f172a;margin:0;letter-spacing:-.2px}
.tldr-card-body{font-size:13.5px;color:#334155;line-height:1.55}
.tldr-card-body p{margin:0 0 .4rem}
.tldr-jump{align-self:flex-start;background:none;border:none;color:#7c3aed;font-weight:600;font-size:12.5px;cursor:pointer;padding:0;margin-top:.25rem;font-family:inherit}
.tldr-jump:hover{text-decoration:underline}

.tldr-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.45rem}
.tldr-row{display:flex;align-items:center;gap:.5rem;font-size:13px;color:#334155;line-height:1.45}
.tldr-row-text{flex:1;min-width:0}
.tldr-muted{color:#94a3b8;font-weight:400}
.tldr-pill{display:inline-flex;align-items:center;padding:.12rem .5rem;border-radius:999px;background:#f1f5f9;color:#475569;font-size:11px;font-weight:600;letter-spacing:.02em;white-space:nowrap}
.tldr-pri-high{background:#fee2e2;color:#991b1b}
.tldr-pri-medium-high{background:#ffedd5;color:#9a3412}
.tldr-pri-medium{background:#fef3c7;color:#854d0e}
.tldr-pri-ongoing{background:#dbeafe;color:#1e40af}
.tldr-pri-long-term{background:#e0e7ff;color:#3730a3}

.tldr-aud{display:flex;flex-direction:column;gap:.2rem;padding:.55rem .65rem;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0}
.tldr-aud-name{font-weight:700;font-size:13px;color:#0f172a}
.tldr-aud-desc{font-size:12.5px;color:#475569;line-height:1.5}
.tldr-aud-pains{display:flex;align-items:center;gap:.4rem;font-size:12px;color:#64748b;margin-top:.15rem}

.tldr-comp{display:flex;flex-direction:column;gap:.3rem;padding:.55rem .65rem;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0}
.tldr-comp-head{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.tldr-comp-domain{font-weight:700;font-size:13px;color:#0f172a}
.tldr-comp-take{font-size:12.5px;color:#475569;line-height:1.5}
.tldr-src{display:inline-flex;padding:.1rem .45rem;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.tldr-src-manual{background:#dbeafe;color:#1e3a8a}
.tldr-src-auto{background:#dcfce7;color:#166534}
.tldr-src-inferred{background:#fef3c7;color:#854d0e}

.tldr-bullets{margin:.25rem 0 0;padding-left:1.05rem;display:flex;flex-direction:column;gap:.18rem}
.tldr-bullets li{font-size:12.5px;color:#475569;line-height:1.5}

.tldr-sf-group{padding:.55rem .65rem;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:.5rem}
.tldr-sf-group:last-child{margin-bottom:0}
.tldr-sf-label{display:block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6366f1;margin-bottom:.3rem}
.tldr-sf-statement{font-size:13px;font-weight:600;color:#0f172a;margin:0 0 .25rem;line-height:1.5}

.tldr-comp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.5rem}
.tldr-comp-tile{display:flex;flex-direction:column;gap:.4rem;padding:.6rem .7rem;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0}
.tldr-comp-block{display:flex;flex-direction:column;gap:.15rem}
.tldr-comp-block-label{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8}

.tldr-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.5rem;margin-bottom:.4rem}
.tldr-fact{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:.5rem .65rem;font-size:12px;color:#64748b;line-height:1.4}
.tldr-fact-label{display:block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#94a3b8;margin-bottom:.15rem}
.tldr-fact strong{color:#0f172a;font-size:14px;font-weight:700}

.tldr-tag-row{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.25rem}
.tldr-tag{display:inline-flex;padding:.18rem .55rem;border-radius:6px;background:#f1f5f9;color:#334155;font-size:11.5px;font-weight:500;line-height:1.3}
.tldr-tag-more{background:#e2e8f0;color:#64748b;font-style:italic}

@media print{.tldr-toggle{display:none !important}}
@media (max-width:640px){.tldr-header{flex-direction:column;align-items:flex-start}.tldr-cards{grid-template-columns:1fr}}
`;


// ─── Inline JS ──────────────────────────────────────────────────────────────

const JS = `
// Password gate (disabled by default — enable by setting window.PLAN_PASSWORD)
(function(){
  var gate=document.getElementById('auth-gate');
  if(!window.PLAN_PASSWORD){gate.style.display='none';return;}
  if(sessionStorage.getItem('gp_auth')==='1'){gate.style.display='none';return;}
  gate.style.display='flex';
  document.getElementById('auth-form').addEventListener('submit',function(e){
    e.preventDefault();
    var pw=document.getElementById('auth-pw').value;
    if(pw===window.PLAN_PASSWORD){sessionStorage.setItem('gp_auth','1');gate.style.display='none';}
    else{document.getElementById('auth-error').textContent='Incorrect password';}
  });
})();

// Content calendar Gantt — month/week/cards view toggle
document.addEventListener('click', function(e){
  var t=e.target;
  if(!t||!t.classList||!t.classList.contains('cal-view-btn'))return;
  var view=t.getAttribute('data-cal-view');
  if(!view)return;
  var section=t.closest('.section');
  var gantt=section&&section.querySelector('.cal-gantt');
  var cardsView=section&&section.querySelector('.cal-cards-view');
  if(gantt)gantt.style.display=(view==='cards')?'none':'';
  if(cardsView)cardsView.style.display=(view==='cards')?'':'none';
  if(gantt&&view!=='cards')gantt.setAttribute('data-cal-view',view);
  t.parentElement.querySelectorAll('.cal-view-btn').forEach(function(b){
    var active=b.getAttribute('data-cal-view')===view;
    b.classList.toggle('active',active);
    b.setAttribute('aria-selected',active?'true':'false');
  });
});

// Copy URL buttons (on-page optimisations)
document.addEventListener('click', function(e){
  var t = e.target;
  if(!t || !t.classList || !t.classList.contains('content-url-copy')) return;
  var url = t.getAttribute('data-copy') || '';
  if(!url) return;
  navigator.clipboard.writeText(url).then(function(){
    var orig = t.textContent;
    t.textContent = 'Copied';
    setTimeout(function(){ t.textContent = orig; }, 1500);
  });
});

// Copy all keywords across every ad group in a section (valid keywords only,
// negatives are excluded — they live in .neg-chip-list).
function copyAllCampaignKws(btn){
  var sec=btn.closest('section');
  if(!sec)return;
  var cells=sec.querySelectorAll('.kw-chip-list .kw-text');
  var seen={};
  var lines=[];
  Array.from(cells).forEach(function(c){
    var t=(c.textContent||'').trim();
    if(!t)return;
    if(seen[t])return;
    seen[t]=1;
    lines.push(t);
  });
  navigator.clipboard.writeText(lines.join('\\n')).then(function(){
    var orig=btn.textContent;
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent=orig;},1800);
  });
}

// Copy ad group keywords (valid only — negatives are no longer rendered per group)
function copyAgKeywords(btn){
  var body=btn.closest('.ag-body');
  var cells=body.querySelectorAll('.kw-chip-list .kw-text');
  var text=Array.from(cells).map(function(c){return c.textContent.trim()}).join('\\n');
  navigator.clipboard.writeText(text).then(function(){
    var orig=btn.textContent;
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent=orig;},1800);
  });
}

// ── Keyword editing ─────────────────────────────────────────────────────────

function removeKw(btn){
  var chip=btn.closest('.kw-chip');
  var ag=chip.closest('.ag-section');
  chip.remove();
  var count=ag.querySelectorAll('.kw-chip-list .kw-chip').length;
  var countEl=ag.querySelector('.ag-count');
  if(countEl)countEl.textContent=count+' keyword'+(count===1?'':'s');
}

function addKwFromInput(input){
  var val=input.value.trim();
  if(!val)return;
  var list=input.closest('.ag-body').querySelector('.kw-chip-list');
  var existing=Array.from(list.querySelectorAll('.kw-text')).map(function(s){return s.textContent.trim().toLowerCase();});
  if(existing.includes(val.toLowerCase())){input.value='';return;}
  var safe=val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var chip=document.createElement('span');
  chip.className='kw-chip kw-new';
  chip.setAttribute('data-keyword',val);
  chip.innerHTML='<span class="kw-text">'+safe+'</span><button class="kw-remove-btn" type="button" onclick="removeKw(this)" title="Remove keyword">&#xD7;</button>';
  list.appendChild(chip);
  var ag=input.closest('.ag-section');
  var count=list.querySelectorAll('.kw-chip').length;
  var countEl=ag.querySelector('.ag-count');
  if(countEl)countEl.textContent=count+' keyword'+(count===1?'':'s');
  input.value='';
  input.focus();
}

function saveAgKeywords(btn){
  var ag=btn.closest('.ag-section');
  var agIndex=parseInt(ag.getAttribute('data-ag-index'),10);
  var agName=ag.getAttribute('data-ag-name');
  var keywords=Array.from(ag.querySelectorAll('.kw-chip-list .kw-chip .kw-text')).map(function(s){return s.textContent.trim();}).filter(Boolean);
  btn.textContent='Saving…';
  btn.classList.add('saving');
  btn.disabled=true;
  window.parent.postMessage({type:'gp:save-keywords',agIndex:agIndex,agName:agName,keywords:keywords},'*');
}

// ── Google Ads full editing ──────────────────────────────────────────────────

function saveCampaignName(el){
  var name=(el.textContent||'').trim();
  if(!name)return;
  window.parent.postMessage({type:'gp:save-campaign-name',campaignName:name},'*');
}

function saveBudget(el){
  var budget=(el.textContent||'').trim();
  window.parent.postMessage({type:'gp:save-budget',budget:budget},'*');
}

function removeLocation(btn){
  btn.closest('.loc-chip-edit').remove();
}

function addLocation(input){
  var val=input.value.trim();
  if(!val)return;
  var list=document.getElementById('loc-chips-list');
  var existing=Array.from(list.querySelectorAll('.loc-chip-edit')).map(function(c){
    return (c.childNodes[0]&&c.childNodes[0].textContent||'').trim().toLowerCase();
  });
  if(existing.includes(val.toLowerCase())){input.value='';return;}
  var safe=val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var chip=document.createElement('span');
  chip.className='loc-chip loc-chip-edit';
  chip.setAttribute('data-location',val);
  chip.innerHTML=safe+'<button class="loc-remove-btn" type="button" onclick="removeLocation(this)" title="Remove">&#xD7;</button>';
  list.appendChild(chip);
  input.value='';
}

function saveLocations(btn){
  var list=document.getElementById('loc-chips-list');
  var locs=Array.from(list.querySelectorAll('.loc-chip-edit')).map(function(c){
    var clone=c.cloneNode(true);
    var b=clone.querySelector('.loc-remove-btn');
    if(b)b.remove();
    return (clone.textContent||'').trim();
  }).filter(Boolean);
  btn.textContent='Saving…';btn.disabled=true;
  window.parent.postMessage({type:'gp:save-locations',locations:locs},'*');
}

function removeNegative(btn){
  btn.closest('.neg-chip-edit').remove();
}

function addNegative(input){
  var val=input.value.trim();
  if(!val)return;
  var list=document.getElementById('campaign-neg-chips');
  var existing=Array.from(list.querySelectorAll('.neg-chip-edit')).map(function(c){return (c.getAttribute('data-neg')||'').toLowerCase();});
  if(existing.includes(val.toLowerCase())){input.value='';return;}
  var safe=val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var chip=document.createElement('span');
  chip.className='neg-chip neg-chip-edit';
  chip.setAttribute('data-neg',val);
  chip.innerHTML=safe+'<button class="neg-remove-btn" type="button" onclick="removeNegative(this)" title="Remove">&#xD7;</button>';
  list.appendChild(chip);
  input.value='';
}

function saveNegatives(btn){
  var list=document.getElementById('campaign-neg-chips');
  var negs=Array.from(list.querySelectorAll('.neg-chip-edit')).map(function(c){return c.getAttribute('data-neg')||'';}).filter(Boolean);
  btn.textContent='Saving…';btn.disabled=true;
  window.parent.postMessage({type:'gp:save-negatives',negatives:negs},'*');
}

function saveAgName(el){
  var ag=el.closest('.ag-section');
  var agIndex=parseInt(ag.getAttribute('data-ag-index'),10);
  var name=(el.textContent||'').trim();
  if(!name)return;
  ag.setAttribute('data-ag-name',name);
  window.parent.postMessage({type:'gp:ag-rename',agIndex:agIndex,name:name},'*');
}

function saveAgAudience(el){
  var ag=el.closest('.ag-section');
  var agIndex=parseInt(ag.getAttribute('data-ag-index'),10);
  var audience=(el.textContent||'').trim();
  window.parent.postMessage({type:'gp:ag-audience',agIndex:agIndex,audience:audience},'*');
}

function removeAgNegative(btn){
  btn.closest('.neg-chip-edit').remove();
}

function addAgNegative(input){
  var val=input.value.trim();
  if(!val)return;
  var list=input.closest('.ag-neg-section').querySelector('.ag-neg-chips');
  var existing=Array.from(list.querySelectorAll('.neg-chip-edit')).map(function(c){return (c.getAttribute('data-neg')||'').toLowerCase();});
  if(existing.includes(val.toLowerCase())){input.value='';return;}
  var safe=val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var chip=document.createElement('span');
  chip.className='neg-chip neg-chip-edit';
  chip.setAttribute('data-neg',val);
  chip.innerHTML=safe+'<button class="neg-remove-btn" type="button" onclick="removeAgNegative(this)" title="Remove">&#xD7;</button>';
  list.appendChild(chip);
  input.value='';
}

function saveAgNegatives(btn){
  var ag=btn.closest('.ag-section');
  var agIndex=parseInt(ag.getAttribute('data-ag-index'),10);
  var list=ag.querySelector('.ag-neg-chips');
  var negs=Array.from(list.querySelectorAll('.neg-chip-edit')).map(function(c){return c.getAttribute('data-neg')||'';}).filter(Boolean);
  btn.textContent='Saving…';btn.disabled=true;
  window.parent.postMessage({type:'gp:ag-negatives',agIndex:agIndex,negatives:negs},'*');
}

function deleteAdGroup(btn){
  var ag=btn.closest('.ag-section');
  var name=ag.getAttribute('data-ag-name')||'this ad group';
  if(!confirm('Delete "'+name+'"?'))return;
  var agIndex=parseInt(ag.getAttribute('data-ag-index'),10);
  window.parent.postMessage({type:'gp:ag-delete',agIndex:agIndex},'*');
}

function addAdGroup(){
  var input=document.getElementById('new-ag-input');
  var name=(input.value||'').trim();
  if(!name)return;
  input.value='';
  window.parent.postMessage({type:'gp:ag-add',name:name},'*');
}

function removeSeedPhrase(btn){
  var chip=btn.closest('.seed-chip-edit');
  var theme=chip.closest('.seed-theme');
  chip.remove();
  var list=theme&&theme.querySelector('.seed-chip-list');
  var countEl=theme&&theme.querySelector('.seed-count');
  if(countEl&&list){var n=list.querySelectorAll('.seed-chip-edit').length;countEl.textContent=n+' phrase'+(n===1?'':'s');}
}

function addSeedPhrase(input){
  var val=input.value.trim();
  if(!val)return;
  var addRow=input.closest('.seed-phrase-add-row');
  var list=addRow.parentElement;
  var safe=val.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var chip=document.createElement('span');
  chip.className='seed-chip kw-text seed-chip-edit';
  chip.innerHTML=safe+'<button class="seed-remove-btn" type="button" onclick="removeSeedPhrase(this)" title="Remove phrase">&#xD7;</button>';
  list.insertBefore(chip,addRow);
  var theme=list.closest('.seed-theme');
  var countEl=theme&&theme.querySelector('.seed-count');
  if(countEl){var n=list.querySelectorAll('.seed-chip-edit').length;countEl.textContent=n+' phrase'+(n===1?'':'s');}
  input.value='';
}

function deleteSeedTheme(btn){
  var theme=btn.closest('.seed-theme');
  var h4=theme&&theme.querySelector('h4');
  var name=h4?h4.textContent.trim():'this theme';
  if(!confirm('Delete seed theme "'+name+'"?'))return;
  theme.remove();
}

function addSeedTheme(){
  var name=prompt('New seed theme name:');
  if(!name||!name.trim())return;
  var safe=name.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var idx=document.querySelectorAll('#google-ads .seed-theme').length+1;
  var details=document.createElement('details');
  details.className='seed-theme';
  details.open=true;
  details.innerHTML='<summary class="seed-theme-head"><span class="seed-num">'+idx+'</span><h4 contenteditable="true" spellcheck="false" onclick="event.stopPropagation()" onkeydown="if(event.key===\'Enter\'){this.blur();event.preventDefault()}">'+safe+'</h4><span class="seed-count">0 phrases</span><button class="copy-btn" onclick="event.stopPropagation();copySeedTheme(this)">Copy theme</button><button class="seed-delete-btn" type="button" onclick="event.stopPropagation();deleteSeedTheme(this)" title="Delete theme">&#xD7;</button></summary><div class="seed-chip-list"><div class="kw-add-row seed-phrase-add-row" style="width:100%;margin-top:8px"><input class="kw-add-input" type="text" placeholder="Add phrase…" onkeydown="if(event.key===\'Enter\'){addSeedPhrase(this);event.preventDefault()}" /><button class="copy-btn kw-add-btn" type="button" onclick="addSeedPhrase(this.previousElementSibling)">Add</button></div></div>';
  var addThemeBtn=document.getElementById('add-seed-theme-btn');
  if(addThemeBtn){addThemeBtn.parentElement.insertBefore(details,addThemeBtn);}
  else{var sec=document.querySelector('#google-ads .seed-section');if(sec)sec.appendChild(details);}
}

function saveAllSeeds(btn){
  var themes=Array.from(document.querySelectorAll('#google-ads .seed-theme'));
  var seeds=themes.map(function(t){
    var h4=t.querySelector('h4');
    var theme=h4?(h4.textContent||'').trim():'';
    var phrases=Array.from(t.querySelectorAll('.seed-chip-list .seed-chip-edit')).map(function(c){
      var clone=c.cloneNode(true);
      var rb=clone.querySelector('.seed-remove-btn');
      if(rb)rb.remove();
      return (clone.textContent||'').trim();
    }).filter(Boolean);
    return {theme:theme,phrases:phrases};
  }).filter(function(s){return s.theme;});
  if(btn){btn.textContent='Saving…';btn.disabled=true;}
  window.parent.postMessage({type:'gp:save-seeds',seeds:seeds},'*');
}

// Copy every consolidated negative keyword in a section
function copyAllNegatives(btn){
  var sec=btn.closest('section');
  if(!sec)return;
  var chips=sec.querySelectorAll('.neg-chip-list .neg-chip');
  var seen={};
  var lines=[];
  Array.from(chips).forEach(function(c){
    var t=(c.textContent||'').trim();
    if(!t||seen[t])return;
    seen[t]=1;
    lines.push(t);
  });
  navigator.clipboard.writeText(lines.join('\\n')).then(function(){
    var orig=btn.textContent;
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent=orig;},1800);
  });
}

// Copy a single seed-suggestion theme's phrases
function copySeedTheme(btn){
  var theme=btn.closest('.seed-theme');
  if(!theme)return;
  var chips=theme.querySelectorAll('.seed-chip-list .seed-chip');
  var text=Array.from(chips).map(function(c){return (c.textContent||'').trim()}).filter(Boolean).join('\\n');
  navigator.clipboard.writeText(text).then(function(){
    var orig=btn.textContent;
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent=orig;},1800);
  });
}

// Copy every seed phrase across every theme in the section
function copyAllSeeds(btn){
  var sec=btn.closest('.seed-section');
  if(!sec)return;
  var chips=sec.querySelectorAll('.seed-chip-list .seed-chip');
  var seen={};
  var lines=[];
  Array.from(chips).forEach(function(c){
    var t=(c.textContent||'').trim();
    if(!t||seen[t])return;
    seen[t]=1;
    lines.push(t);
  });
  navigator.clipboard.writeText(lines.join('\\n')).then(function(){
    var orig=btn.textContent;
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent=orig;},1800);
  });
}

// Copy keyword group
function copyGroupKws(btn){
  var group=btn.closest('.kw-group');
  var words=group.querySelectorAll('.kw-word');
  var text=Array.from(words).map(function(w){return w.textContent.trim()}).join('\\n');
  navigator.clipboard.writeText(text).then(function(){
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent='Copy All';},1800);
  });
}

// Copy single item
function copySingle(btn,text){
  navigator.clipboard.writeText(text).then(function(){
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent='Copy';},1800);
  });
}

// Copy all ad items (headlines or descriptions)
function copyAdItems(btn,type){
  var section=btn.closest('.ad-copy-section');
  var items=section.querySelectorAll(type==='headlines'?'.headline-item .headline-text':'.desc-item .headline-text');
  var text=Array.from(items).map(function(el){return el.textContent.trim()}).join('\\n');
  navigator.clipboard.writeText(text).then(function(){
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent=type==='headlines'?'Copy All Headlines':'Copy All Descriptions';},1800);
  });
}

// Smooth scroll for sidebar links
document.querySelectorAll('.snav-link').forEach(function(link){
  link.addEventListener('click',function(e){
    e.preventDefault();
    var target=document.querySelector('#'+this.getAttribute('data-section'));
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
    // Close dropdown
    var nav=document.getElementById('sticky-nav');
    nav.classList.remove('nav-open');
    document.getElementById('snav-hamburger').setAttribute('aria-expanded','false');
  });
});

// Sticky nav show/hide on scroll
(function(){
  var nav=document.getElementById('sticky-nav');
  var toc=document.getElementById('gp-toc');
  var lastY=0;
  window.addEventListener('scroll',function(){
    var y=window.scrollY;
    if(y>400){nav.classList.add('visible');if(toc)toc.classList.add('visible');}else{nav.classList.remove('visible');if(toc)toc.classList.remove('visible');}
    lastY=y;
  },{passive:true});
  // Hamburger toggle
  var btn=document.getElementById('snav-hamburger');
  btn.addEventListener('click',function(){
    var open=nav.classList.toggle('nav-open');
    btn.setAttribute('aria-expanded',open?'true':'false');
  });
  // Active section tracking
  var sections=document.querySelectorAll('.section[id]');
  var links=document.querySelectorAll('.snav-link');
  var label=document.getElementById('snav-active-label');
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        links.forEach(function(l){l.classList.remove('active')});
        var active=document.querySelector('.snav-link[data-section="'+entry.target.id+'"]');
        if(active){active.classList.add('active');if(label)label.textContent=active.textContent.replace(/^\\d+\\s*/,'');}
      }
    });
  },{threshold:0.15,rootMargin:'-80px 0px -60% 0px'});
  sections.forEach(function(s){observer.observe(s);});
})();

// Parent → iframe messaging: allow the React shell to drive the in-document
// table of contents. Accepts { type: 'gp:scroll', id: '<sectionId>' }.
window.addEventListener('message',function(event){
  var data=event&&event.data;
  if(!data||typeof data!=='object')return;
  if(data.type==='gp:scroll'&&typeof data.id==='string'){
    var el=document.getElementById(data.id);
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  }
  if(data.type==='gp:print'){
    window.print();
  }
});

// Iframe → parent: announce ready and surface the list of section ids so the
// React shell can build a TOC even if the planDataJson is unavailable.
// Fire inside rAF so layout (including font-swap reflow) is stable before
// we measure scrollHeight.
(function(){
  try{
    var ids=Array.from(document.querySelectorAll('section.section[id]')).map(function(s){
      var heading=s.querySelector('h2');
      return {id:s.id,label:heading?heading.textContent.trim():s.id};
    });
    function send(){
      try{
        if(window.parent&&window.parent!==window){
          window.parent.postMessage({type:'gp:ready',sections:ids,height:document.body.scrollHeight},'*');
        }
      }catch(e){/* ignore */}
    }
    if(typeof requestAnimationFrame==='function'){requestAnimationFrame(send);}else{send();}
    // Re-send after web fonts load — Inter swap can reflow the page height.
    if(document.fonts&&document.fonts.ready){document.fonts.ready.then(send).catch(function(){});}
  }catch(e){/* ignore */}
})();

// Decode and inject landing page iframe content. Wire up the "Open in
// new tab" button so users can view the full page outside the embedded
// iframe (which has a fixed height for layout reasons).
document.querySelectorAll('.lp-iframe[data-lp-html]').forEach(function(iframe){
  try{
    var encoded=iframe.getAttribute('data-lp-html');
    if(!encoded)return;
    var html=atob(encoded);
    iframe.srcdoc=html;
    var wrap=iframe.closest('.lp-frame-wrap');
    var openBtn=wrap&&wrap.querySelector('[data-lp-open]');
    if(openBtn){
      openBtn.addEventListener('click',function(){
        try{
          var blob=new Blob([html],{type:'text/html'});
          var url=URL.createObjectURL(blob);
          window.open(url,'_blank','noopener,noreferrer');
          setTimeout(function(){URL.revokeObjectURL(url);},60000);
        }catch(err){console.error('LP open error:',err);}
      });
    }
  }catch(e){console.error('LP decode error:',e);}
});

// TLDR toggle (internal handoff view). Not present in public share view.
(function(){
  var btn=document.getElementById('tldr-toggle');
  if(!btn)return;
  var view=document.getElementById('gp-tldr-view');
  var closeBtn=document.getElementById('tldr-close');
  function setMode(on){
    document.body.classList.toggle('tldr-mode',on);
    if(view)view.setAttribute('aria-hidden',on?'false':'true');
    try{sessionStorage.setItem('gp_tldr_mode',on?'1':'0');}catch(e){}
    if(on)window.scrollTo({top:0,behavior:'instant'});
  }
  btn.addEventListener('click',function(){setMode(!document.body.classList.contains('tldr-mode'));});
  if(closeBtn)closeBtn.addEventListener('click',function(){setMode(false);});
  // Restore prior mode
  try{if(sessionStorage.getItem('gp_tldr_mode')==='1')setMode(true);}catch(e){}
  // Jump-to-section from TLDR cards
  document.querySelectorAll('.tldr-jump').forEach(function(b){
    b.addEventListener('click',function(){
      var id=this.getAttribute('data-jump');
      if(!id)return;
      setMode(false);
      requestAnimationFrame(function(){
        var el=document.getElementById(id);
        if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  });
  // Keyboard shortcut: "t" to toggle (internal use)
  document.addEventListener('keydown',function(e){
    if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;
    if(e.key==='t'||e.key==='T'){setMode(!document.body.classList.contains('tldr-mode'));}
  });
})();

// Quick-win FAQ / schema modal
(function(){
  var modal=document.getElementById('qw-modal');
  if(!modal)return;
  var titleEl=document.getElementById('qw-modal-title');
  var eyebrowEl=document.getElementById('qw-modal-eyebrow');
  var urlEl=document.getElementById('qw-modal-url');
  var bodyEl=document.getElementById('qw-modal-body');
  function escHtml(s){return String(s||'').replace(/[&<>"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"})[c];});}
  function pretty(jsonStr){
    try{return JSON.stringify(JSON.parse(jsonStr),null,2);}catch(e){return jsonStr;}
  }
  function copyText(btn,text){
    navigator.clipboard.writeText(text).then(function(){
      var orig=btn.textContent;
      btn.textContent='Copied';
      btn.classList.add('qw-copied');
      setTimeout(function(){btn.textContent=orig;btn.classList.remove('qw-copied');},1500);
    });
  }
  function openModal(kind,targetId){
    var data;
    var src=targetId&&document.getElementById(targetId);
    if(!src){console.warn('qw-modal: missing data block',targetId);return;}
    try{data=JSON.parse(src.textContent||'{}');}
    catch(e){console.warn('qw-modal: JSON parse failed',e);return;}
    var url=data.url||'';
    urlEl.textContent=url;
    urlEl.setAttribute('href',url);
    if(kind==='faq'){
      eyebrowEl.textContent='Suggested FAQs';
      titleEl.textContent='FAQ for this page';
      var allFaq=(data.items||[]).map(function(it){return 'Q: '+it.question+'\\nA: '+it.answer;}).join('\\n\\n');
      var html=(data.items||[]).map(function(it,i){
        var combined='Q: '+it.question+'\\nA: '+it.answer;
        return '<div class="qw-modal-faq-item">'
          +'<p class="qw-modal-faq-q">'+escHtml(it.question)+'</p>'
          +'<p class="qw-modal-faq-a">'+escHtml(it.answer)+'</p>'
          +'<div class="qw-modal-faq-foot"><button type="button" class="qw-modal-copy-inline" data-qw-copy-id="qw-faq-'+i+'">Copy Q&amp;A</button></div>'
          +'<textarea id="qw-faq-'+i+'" style="display:none">'+escHtml(combined)+'</textarea>'
          +'</div>';
      }).join('');
      html='<div style="display:flex;justify-content:flex-end;margin-bottom:.25rem"><button type="button" class="qw-modal-copy-inline" data-qw-copy-text="'+escHtml(allFaq)+'">Copy all</button></div>'+html;
      bodyEl.innerHTML=html;
    }else if(kind==='schema'){
      eyebrowEl.textContent='Suggested schema';
      titleEl.textContent='JSON-LD ready to paste';
      var html=(data.items||[]).map(function(it,i){
        var formatted=pretty(it.jsonLd||'');
        return '<div class="qw-modal-schema-item">'
          +'<div class="qw-modal-schema-head">'
          +'<span class="qw-modal-schema-type">'+escHtml(it.type||'Schema')+'</span>'
          +'<button type="button" class="qw-modal-copy" data-qw-copy-id="qw-schema-'+i+'">Copy</button>'
          +'</div>'
          +'<pre class="qw-modal-schema-pre" id="qw-schema-pre-'+i+'">'+escHtml(formatted)+'</pre>'
          +'<textarea id="qw-schema-'+i+'" style="display:none">'+escHtml(formatted)+'</textarea>'
          +'</div>';
      }).join('');
      bodyEl.innerHTML=html;
    }
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    bodyEl.innerHTML='';
  }
  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t)return;
    var trigger=t.closest&&t.closest('[data-qw-modal]');
    if(trigger){
      e.preventDefault();
      openModal(trigger.getAttribute('data-qw-modal'),trigger.getAttribute('data-qw-target'));
      return;
    }
    if(t.hasAttribute&&t.hasAttribute('data-qw-close')){closeModal();return;}
    if(t.hasAttribute&&t.hasAttribute('data-qw-copy-id')){
      var src=document.getElementById(t.getAttribute('data-qw-copy-id'));
      if(src)copyText(t,src.value||src.textContent||'');
      return;
    }
    if(t.hasAttribute&&t.hasAttribute('data-qw-copy-text')){
      copyText(t,t.getAttribute('data-qw-copy-text'));
      return;
    }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&modal.getAttribute('aria-hidden')==='false')closeModal();
  });
})();
`;

// ─── i3media logo SVG ───────────────────────────────────────────────────────
// Source: /public/primary-logo.svg with all fills converted to currentColor so
// the same markup renders in white on dark surfaces (sticky nav, hero) and in
// ink on light surfaces (CTA card, password gate). Original viewBox preserved.

const I3_LOGO_SVG = `<svg viewBox="0 0 161 53" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="i3media">
<path d="M26.0013 0.853516C11.6413 0.853516 0 12.4947 0 26.8538C0 41.2136 11.6413 52.8535 26.0013 52.8535C40.362 52.8535 52.0033 41.2136 52.0033 26.8538C52.0033 12.4947 40.362 0.853516 26.0013 0.853516ZM17.6309 21.0628C18.8643 21.0598 19.8647 22.0577 19.8702 23.2935C19.8781 24.5225 18.8722 25.5247 17.6467 25.5247C16.4078 25.5278 15.4074 24.5353 15.4074 23.3044C15.3995 22.0711 16.3944 21.0683 17.6309 21.0628ZM40.3455 21.0598C39.7898 24.7824 38.4423 31.4889 38.4423 31.4889C38.4423 31.4889 37.7451 35.841 31.3004 35.8569C24.8539 35.8734 20.019 35.8868 20.019 35.8868C20.019 35.8868 19.5475 39.9833 13.7805 39.9943L16.6787 29.1662C16.6787 29.1662 17.5491 26.2896 22.5536 26.0804L21.2305 31.1638L31.1424 31.1394C31.1424 31.1394 33.5287 30.6783 33.7209 28.5477L23.2106 28.5776C23.2106 28.5776 23.7962 24.8281 28.1717 24.0773L33.6215 24.0584C33.6215 24.0584 34.8195 23.7192 34.8146 22.811V22.2443C34.8146 22.2443 34.7817 21.6155 33.9008 21.3337L23.6742 21.3666C23.6742 21.3666 20.3234 21.5453 20.307 16.6571L36.4439 16.6083C36.4439 16.6083 40.9067 17.3353 40.3455 21.0598Z" fill="currentColor"/>
<path d="M144.133 35.8645L149.848 19.3218H154.486L160.201 35.8645H156.742L152.355 21.8533H152.004L147.567 35.8645H144.133ZM147.166 32.4557V30.225H157.594V32.4557H147.166Z" fill="currentColor"/>
<path d="M138.913 35.8645V19.3218H142.122V35.8645H138.913Z" fill="currentColor"/>
<path d="M123.563 35.8645V33.2578H128.401C129.403 33.2578 130.231 33.0322 130.882 32.581C131.551 32.1299 132.044 31.4866 132.361 30.6511C132.696 29.8156 132.863 28.813 132.863 27.6433C132.863 26.6574 132.754 25.8052 132.537 25.0867C132.336 24.3682 132.027 23.7833 131.609 23.3321C131.192 22.8643 130.665 22.5134 130.03 22.2794C129.395 22.0455 128.651 21.9285 127.799 21.9285H123.563V19.3218H127.699C129.654 19.3218 131.25 19.6476 132.487 20.2993C133.74 20.951 134.659 21.8867 135.244 23.1066C135.846 24.3097 136.147 25.7634 136.147 27.4678C136.147 28.6709 136.005 29.7404 135.721 30.6761C135.436 31.5952 135.052 32.3889 134.567 33.0573C134.083 33.709 133.515 34.2437 132.863 34.6614C132.211 35.0792 131.509 35.3883 130.757 35.5888C130.022 35.7726 129.261 35.8645 128.476 35.8645H123.563ZM122.008 35.8645V19.3218H125.167V35.8645H122.008Z" fill="currentColor"/>
<path d="M107.208 35.8645V19.3218H110.392V35.8645H107.208ZM109.264 35.8645V33.2578H119.567V35.8645H109.264ZM109.264 28.6709V26.2647H118.338V28.6709H109.264ZM109.264 21.9285V19.3218H119.517V21.9285H109.264Z" fill="currentColor"/>
<path d="M84.55 35.8645V19.3218H89.338L94.2514 32.3304H94.3767L99.2149 19.3218H103.802V35.8645H100.794L100.995 22.5301H100.744L95.5048 35.8645H92.7473L87.5833 22.5301H87.3326L87.5331 35.8645H84.55Z" fill="currentColor"/>
<path d="M75.2092 36.2156C74.1396 36.2156 73.2121 36.0986 72.4266 35.8647C71.6412 35.6475 70.981 35.3383 70.4462 34.9373C69.9282 34.5196 69.5271 34.0099 69.243 33.4084C68.9589 32.8068 68.7834 32.1384 68.7166 31.4032L71.6244 30.5008C71.6412 31.0857 71.7498 31.5786 71.9503 31.9797C72.1509 32.3807 72.4183 32.7149 72.7525 32.9822C73.0868 33.2329 73.4711 33.4167 73.9056 33.5337C74.3402 33.6506 74.7914 33.7091 75.2593 33.7091C75.9445 33.7091 76.5545 33.6172 77.0893 33.4334C77.6241 33.2329 78.0502 32.9321 78.3678 32.5311C78.6853 32.1133 78.8441 31.5786 78.8441 30.9269C78.8441 30.1249 78.5767 29.4815 78.0419 28.9969C77.5238 28.4957 76.7634 28.1531 75.7607 27.9693C74.758 27.7855 73.538 27.7437 72.1007 27.844V25.9641L77.7661 22.054V21.8535L69.4937 21.9036V19.2969H80.9498V22.3798L75.6604 26.1396V26.3651C77.2313 26.2983 78.4764 26.4738 79.3956 26.8915C80.3147 27.3093 80.9748 27.7821 81.3759 28.5959C81.777 29.3144 81.9776 30.1165 81.9776 31.0021C81.9776 32.0549 81.7269 32.9739 81.2255 33.7593C80.7409 34.5446 79.9972 35.1545 78.9945 35.589C77.9917 36.0067 76.73 36.2156 75.2092 36.2156Z" fill="currentColor"/>
<path d="M63.6388 35.8647V22.7558H66.797V35.8647H63.6388ZM65.2179 20.7005C64.5829 20.7005 64.09 20.5668 63.7391 20.2994C63.4049 20.0154 63.2378 19.6143 63.2378 19.0963C63.2378 18.5783 63.4049 18.1856 63.7391 17.9183C64.09 17.6342 64.5829 17.4922 65.2179 17.4922C65.8863 17.4922 66.3876 17.6259 66.7218 17.8932C67.056 18.1606 67.2231 18.5616 67.2231 19.0963C67.2231 19.6143 67.0476 20.0154 66.6967 20.2994C66.3625 20.5668 65.8696 20.7005 65.2179 20.7005Z" fill="currentColor"/>
</svg>`;

// ─── Strategy Brain (read-only preview) ─────────────────────────────────────
// Renders the upstream reasoning the AI used to build the plan. Sits between
// the stats band and the main body so strategists can sanity-check the
// foundation before reading 14 channel write-ups built on top of it.
function renderStrategyBrainPanel(brain: StrategyBrain | undefined, _isPublicView = false): string {
  if (!brain || !brain.positioning?.statement) return "";
  void _isPublicView; // brain is now public-friendly and rendered in both views
  const audiences = (brain.audiences ?? []).slice(0, 6).map((a) => `
    <details class="brain-audience">
      <summary class="brain-audience-summary">
        <span class="brain-audience-name">${esc(a.name)}</span>
        <span class="brain-audience-insight">${esc(a.coreInsight)}</span>
      </summary>
      <div class="brain-audience-detail">
        <div class="brain-audience-line"><strong>Lead pain:</strong> ${esc(a.primaryPain)}</div>
        <div class="brain-audience-line"><strong>Trigger:</strong> ${esc(a.decisionTrigger)}</div>
        ${a.channels?.length ? `<div class="brain-audience-line"><strong>Channels:</strong> ${a.channels.map(esc).join(", ")}</div>` : ""}
      </div>
    </details>`).join("");

  const channels = (brain.channelStrategy ?? []).map((c) => `
    <li><strong>${esc(c.channel)}:</strong> ${esc(c.role)} <span class="brain-meta">(audience: ${esc(c.primaryAudience)} · success: ${esc(c.successMetric)})</span></li>`).join("");

  const messagesToOwn = (brain.competitorAngle?.messagesToOwn ?? []).map((m) => `<li>${esc(m)}</li>`).join("");
  const messagesToAvoid = (brain.competitorAngle?.messagesToAvoid ?? []).map((m) => `<li>${esc(m)}</li>`).join("");
  const supporting = (brain.messageHierarchy?.secondary ?? []).map((m) => `<li>${esc(m)}</li>`).join("");
  const geos = (brain.targetGeographies ?? []).map((g) => `<span class="brain-geo-chip">${esc(g)}</span>`).join("");

  return `
<section class="section-block brain-panel" id="strategy-brain" data-snap>
  <div class="section-inner">
    <div class="section-kicker">Strategic Foundation</div>
    <h2>The strategy that powers this plan</h2>
    <p class="section-intro">Before any channel writes a single line, we agree the strategic foundation: who we are talking to, what we lead with, where we win against the competition, and which markets we play in. Every section that follows is built on this.</p>
    <div class="brain-inner">
      <div class="brain-headline">
        <div class="brain-headline-label">Positioning</div>
        <p class="brain-headline-statement">${esc(brain.positioning.statement)}</p>
        ${brain.positioning.proofPoints?.length ? `<ul class="brain-proof">${brain.positioning.proofPoints.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
      </div>
      <div class="brain-grid">
        <div class="brain-cell">
          <h4>Market context</h4>
          <p><strong>State:</strong> ${esc(brain.marketContext?.state ?? "")}</p>
          <p><strong>Opportunity:</strong> ${esc(brain.marketContext?.opportunity ?? "")}</p>
          <p><strong>Threat:</strong> ${esc(brain.marketContext?.threat ?? "")}</p>
        </div>
        <div class="brain-cell">
          <h4>Competitor angle</h4>
          <p><strong>How we win:</strong> ${esc(brain.competitorAngle?.differentiator ?? "")}</p>
          ${messagesToOwn ? `<p><strong>Messages to own:</strong></p><ul>${messagesToOwn}</ul>` : ""}
          ${messagesToAvoid ? `<p><strong>Messages to avoid (saturated):</strong></p><ul>${messagesToAvoid}</ul>` : ""}
        </div>
        <div class="brain-cell">
          <h4>Message hierarchy</h4>
          <p class="brain-primary-msg">${esc(brain.messageHierarchy?.primary ?? "")}</p>
          ${supporting ? `<p><strong>Supporting:</strong></p><ul>${supporting}</ul>` : ""}
        </div>
        ${geos ? `
        <div class="brain-cell brain-geos-cell">
          <h4>Markets we are targeting</h4>
          <div class="brain-geo-chips">${geos}</div>
        </div>` : ""}
        <div class="brain-cell brain-cell-wide">
          <h4>Channel strategy</h4>
          <ul class="brain-channels">${channels}</ul>
        </div>
      </div>
      ${audiences ? `
      <div class="brain-audiences">
        <h4>Audience definitions</h4>
        <p class="brain-audience-intro">These names appear verbatim across every channel below — ad copy, email segments, content briefs, social pillars.</p>
        <div class="brain-audience-grid">${audiences}</div>
      </div>` : ""}
    </div>
  </div>
</section>`;
}

// ─── Coherence issues panel (Strategist Review) ─────────────────────────────
function renderCoherencePanel(issues: GrandPlanData["coherenceIssues"], isPublicView = false): string {
  if (!issues?.length) return "";
  if (isPublicView) return "";
  const groups: Record<string, NonNullable<GrandPlanData["coherenceIssues"]>> = {};
  for (const i of issues) (groups[i.section] ??= []).push(i);
  const blocks = Object.entries(groups).map(([section, list]) => `
    <div class="coh-group">
      <div class="coh-section">${esc(section)}</div>
      <ul>${list.map((i) => `
        <li class="coh-item coh-${esc(i.severity)}">
          <span class="coh-issue">${esc(i.issue)}</span>
          <span class="coh-fix">→ ${esc(i.suggestedFix)}</span>
        </li>`).join("")}</ul>
    </div>`).join("");
  return `
<details class="coh-panel">
  <summary class="coh-summary">
    <span class="coh-kicker">Strategist Review</span>
    <span class="coh-title">${issues.length} item${issues.length === 1 ? "" : "s"} to verify before sending</span>
    <span class="coh-toggle">Click to expand</span>
  </summary>
  <div class="coh-inner">
    <p class="coh-intro">The coherence checker found these issues against the strategy brain. Use the Refine box below to ask the AI to correct them, or edit the section directly.</p>
    ${blocks}
  </div>
</details>`;
}
