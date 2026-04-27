/**
 * Grand Plan HTML Template Engine
 *
 * Produces self-contained HTML matching the Lux Technical example design:
 * - Dark navy hero gradients
 * - Sticky sidebar navigation
 * - Match-type keyword badges
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
  const hasStrategy = s.strategyPlan || s.quickWins?.length || plan.strategyBrain?.positioning?.statement;
  const hasPaidSearch = !!s.googleAdsCampaigns;
  const hasPaidSocial = s.metaCampaigns?.length || s.linkedInAds?.length;
  const hasContent = s.contentStrategy || s.contentCalendar?.length || s.organicSocial || s.exampleArticles?.length;
  const hasResearch = s.keywordResearch || s.competitorIntel?.length;
  const hasCommercial = s.servicesInvestment || s.emailMarketing;
  const hasMeasurement = s.kpis?.length;

  if (hasStrategy) {
    addChapter("Strategy");
    if (plan.strategyBrain?.positioning?.statement) navItems.push({ id: "strategy-brain", label: "Strategic Foundation" });
    if (s.strategyPlan) navItems.push({ id: "strategy-plan", label: "Strategy Plan" });
    if (s.quickWins?.length) navItems.push({ id: "quick-wins", label: "Quick Wins" });
  }
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
    if (s.organicSocial) navItems.push({ id: "organic-social", label: "Organic Social" });
    if (s.exampleArticles?.length) navItems.push({ id: "example-articles", label: "Example Articles" });
  }
  if (hasResearch) {
    addChapter("Research");
    if (s.keywordResearch) navItems.push({ id: "keyword-research", label: "Keyword Research" });
    if (s.competitorIntel?.length) navItems.push({ id: "competitor-intel", label: "Competitor Intel" });
  }
  if (hasCommercial) {
    addChapter("Commercial");
    if (s.servicesInvestment) navItems.push({ id: "services", label: "Services & Investment" });
    if (s.emailMarketing) navItems.push({ id: "email-marketing", label: "Email Marketing" });
  }
  if (hasMeasurement) {
    addChapter("Measurement");
    navItems.push({ id: "kpis", label: "KPIs & Targets" });
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
  }
  if (s.keywordResearch?.adGroups?.length) {
    const totalKws = s.keywordResearch.adGroups.reduce((sum: number, g: { keywords: unknown[] }) => sum + g.keywords.length, 0);
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
  if (s.exampleArticles?.length) contentStats.push({ num: String(s.exampleArticles.length), label: "Example Articles" });

  const organicStats: StatItem[] = [];
  if (s.organicSocial?.pillars?.length) organicStats.push({ num: String(s.organicSocial.pillars.length), label: "Social Pillars" });
  if (s.organicSocial?.hashtagStrategy?.length) organicStats.push({ num: String(s.organicSocial.hashtagStrategy.length), label: "Hashtags" });
  if (s.emailMarketing?.flows?.length) organicStats.push({ num: String(s.emailMarketing.flows.length), label: "Email Flows" });
  if (s.emailMarketing?.segmentation?.segments?.length) {
    organicStats.push({ num: String(s.emailMarketing.segmentation.segments.length), label: "Email Segments" });
  }
  if (s.emailMarketing?.campaigns?.length) organicStats.push({ num: String(s.emailMarketing.campaigns.length), label: "Email Campaigns" });

  const measurementStats: StatItem[] = [];
  if (s.competitorIntel?.length) measurementStats.push({ num: String(s.competitorIntel.length), label: "Competitors Analysed" });
  if (s.kpis?.length) {
    const metricCount = s.kpis.reduce((sum: number, k: { metrics?: unknown[] }) => sum + (k.metrics?.length ?? 0), 0);
    measurementStats.push({ num: String(s.kpis.length), label: "KPI Channels" });
    if (metricCount) measurementStats.push({ num: String(metricCount), label: "Tracked Metrics" });
  }
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
  const hasStrategy = s.strategyPlan || s.quickWins?.length;
  const hasPaidSearch = !!s.googleAdsCampaigns;
  const hasPaidSocial = s.metaCampaigns?.length || s.linkedInAds?.length;
  const hasContent = s.contentStrategy || s.contentCalendar?.length || s.organicSocial || s.exampleArticles?.length;
  const hasResearch = s.keywordResearch || s.competitorIntel?.length;
  const hasCommercial = s.servicesInvestment || s.emailMarketing;
  const hasMeasurement = s.kpis?.length;

  // grounding badge wrapper — no-op in public view
  const wb = (html: string, g?: { grounding: string; sourceLabels: string[] } | null) =>
    isPublicView ? html : withGroundingBadge(html, g ?? undefined);

  const parts: string[] = [];

  // Data sources panel removed — the Strategy Brain panel above already explains
  // the foundation. Internal teams can inspect plan.dataSources via the API.
  void dataSources;

  if (hasStrategy) {
    parts.push(ch("Strategy", `The overall marketing strategy and quick-win priorities for ${clientName}.`));
    if (s.strategyPlan) parts.push(renderStrategyPlan(s.strategyPlan));
    if (s.quickWins?.length) parts.push(renderQuickWins(s.quickWins));
  }

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
    parts.push(ch("Content & SEO", "Content strategy, publishing calendar, organic social, and example content assets."));
    if (s.contentStrategy) parts.push(renderContentStrategy(s.contentStrategy, sectionIntros?.contentStrategy, audienceRationales));
    if (s.seoFoundations) parts.push(renderSeoFoundations(s.seoFoundations));
    if (s.contentCalendar?.length) parts.push(renderContentCalendar(s.contentCalendar));
    if (s.organicSocial) parts.push(renderOrganicSocial(s.organicSocial, sectionIntros?.organicSocial));
    if (s.exampleArticles?.length) parts.push(renderExampleArticles(s.exampleArticles));
  }

  if (hasResearch) {
    parts.push(ch("Research", "Keyword research and competitor intelligence across all target areas."));
    if (s.keywordResearch) parts.push(renderKeywordResearch(s.keywordResearch));
    if (s.competitorIntel?.length) parts.push(wb(renderCompetitorIntel(s.competitorIntel), grounding?.competitorIntel));
  }

  if (hasCommercial) {
    parts.push(ch("Commercial", "Services, investment overview, and email lifecycle."));
    if (s.servicesInvestment) parts.push(renderServicesInvestment(s.servicesInvestment));
    if (s.emailMarketing) parts.push(wb(renderEmailMarketing(s.emailMarketing), grounding?.emailMarketing));
  }

  if (hasMeasurement) {
    parts.push(ch("Measurement", "The KPIs, targets, and reporting cadence that will tell us whether the plan is working."));
    parts.push(renderKpis(s.kpis));
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

function renderKpis(channels: { channel: string; icon?: string; metrics: { name: string; target: string }[] }[]): string {
  if (!channels?.length) return "";
  const cards = channels.map((c) => `
    <div class="kpi-card">
      <div class="kpi-icon">${esc(c.icon ?? "📊")}</div>
      <h4>${esc(c.channel)}</h4>
      <ul>
        ${c.metrics.map((m) => `<li><span class="kpi-name">${esc(m.name)}</span><span class="kpi-target">${esc(m.target)}</span></li>`).join("\n")}
      </ul>
    </div>`).join("\n");
  return `
    <section id="kpis" class="section">
      <div class="section-inner">
        <div class="section-kicker">Measurement</div>
        <h2>KPIs &amp; Success Metrics</h2>
        <p class="section-intro">The numbers we will report on each month, channel by channel. Targets are 90-day benchmarks calibrated to the budget and sector.</p>
        <div class="kpi-grid">${cards}</div>
        <div class="callout">Reporting cadence: a monthly performance report against these KPIs, plus a quarterly strategic review to recalibrate targets and reallocate budget where needed.</div>
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderGoogleAdsCampaigns(data: any, clientWebsite?: string, intro?: string, isPublicView = false): string {
  const adDomain = (clientWebsite ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim() || "yourbrand.com";
  const overviewGrid = Object.entries((data.overview ?? {}) as Record<string, string>)
    .map(([k, v]) => `<div class="ov-item"><span class="ov-label">${esc(k)}</span><span class="ov-value">${esc(v)}</span></div>`)
    .join("\n");

  const aiNegReasoned = ((data.aiNegativesWithReason ?? []) as { keyword: string; reason: string }[])
    .filter((n) => n.keyword && n.reason);
  const aiNegHtml = aiNegReasoned.length > 0 ? `
        <div class="neg-reasoned-list">
          ${aiNegReasoned.map((n) => `
            <div class="neg-reason-item">
              <span class="neg-chip">${esc(n.keyword)}</span>
              <span class="neg-reason-text">${esc(n.reason)}</span>
            </div>`).join("")}
        </div>` : "";

  // Show any sector/brief-derived flat negatives that the AI did NOT already
  // surface with rationale, so the strategist still sees the full sweep
  // without rendering a duplicated chip wall.
  const reasonedSet = new Set(aiNegReasoned.map((n) => n.keyword.toLowerCase()));
  const flatExtras = ((data.negativeKeywords ?? []) as string[])
    .filter((k) => k && !reasonedSet.has(k.toLowerCase()));
  const flatExtrasHtml = flatExtras.length > 0
    ? `<div class="neg-list" style="margin-top:.75rem">${flatExtras.map((k) => `<span class="neg-chip">${esc(k)}</span>`).join(" ")}</div>`
    : "";

  const adGroupsHtml = ((data.adGroups ?? []) as { name: string; keywords: { keyword: string; matchType: string; volume?: number; cpc?: number }[]; hiddenLowVolumeCount?: number; adCopy?: { headlines: string[]; descriptions: string[]; sitelinks?: string[]; urlPaths?: string[]; isFallback?: boolean }; adGroupNegatives?: string[] }[])
    .map((g, i) => {
      const kwRows = (g.keywords ?? [])
        .map((k) => {
          const display = k.matchType === "exact" ? `[${k.keyword}]` : k.matchType === "phrase" ? `"${k.keyword}"` : k.keyword;
          const badge = k.matchType === "exact" ? "match-exact" : k.matchType === "phrase" ? "match-phrase" : "match-broad";
          const badgeLabel = k.matchType === "exact" ? "Exact" : k.matchType === "phrase" ? "Phrase" : "Broad";
          return `<tr><td class="kw-text">${esc(display)}</td><td><span class="match-badge ${badge}">${badgeLabel}</span></td>${k.volume != null ? `<td class="kw-vol">${k.volume.toLocaleString()}</td>` : ""}</tr>`;
        })
        .join("\n");

      const hiddenNote = g.hiddenLowVolumeCount && g.hiddenLowVolumeCount > 0
        ? `<p class="kw-hidden-note" style="font-size:12px;color:var(--mid);margin:.5rem 0 0">${g.hiddenLowVolumeCount} low/zero-volume keyword${g.hiddenLowVolumeCount === 1 ? "" : "s"} hidden from this view.</p>`
        : "";

      const adCopyHtml = g.adCopy ? (() => {
        // In public (client) view, replace unfinished fallback copy with a
        // neutral holding message rather than exposing AI fallback content.
        if (isPublicView && g.adCopy!.isFallback) {
          return `<div class="ad-copy-section"><p class="section-intro" style="color:var(--mid);font-style:italic">Ad copy is being finalised — your campaign specialist will share the complete ad creatives shortly.</p></div>`;
        }
        const charBadge = (len: number, max: number) => {
          const cls = len > max ? "char-over" : len > max - 5 ? "char-warn" : "char-ok";
          return `<span class="char-badge ${cls}">${len}/${max}</span>`;
        };
        const headlinesHtml = g.adCopy!.headlines
          .map((h, hi) => `<div class="headline-item"><span class="headline-num">${hi + 1}</span><span class="headline-text">${esc(h)}</span>${charBadge(h.length, 30)}<button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(h)}')">Copy</button></div>`)
          .join("\n");
        const descriptionsHtml = g.adCopy!.descriptions
          .map((d, di) => `<div class="desc-item"><span class="headline-num">${di + 1}</span><span class="headline-text">${esc(d)}</span>${charBadge(d.length, 90)}<button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(d)}')">Copy</button></div>`)
          .join("\n");
        const sitelinksHtml = (g.adCopy!.sitelinks ?? []).length > 0
          ? `<div class="sitelinks-section"><div class="ad-copy-label">Sitelinks</div><div class="sitelink-chips">${g.adCopy!.sitelinks!.map((s) => `<span class="sitelink-chip">${esc(s)}${charBadge(s.length, 25)}</span>`).join("")}</div></div>`
          : "";

        // Google ad preview mockup — pick 3 visually distinct headlines
        // rather than the first 3 (which often share the same keyword prefix
        // and get truncated to the same "keyword..." string in the preview).
        // We pull from the structured 15-headline distribution: index 0
        // (keyword-led), 4 (benefit-led), 8 (USP/differentiator).
        const headlines = g.adCopy!.headlines;
        const pickDistinct = (preferred: number[], cap = 30): string => {
          for (const idx of preferred) {
            const h = headlines[idx];
            if (h && h.length <= cap) return h;
          }
          // Fallback: shortest headline still under cap
          const ranked = [...headlines].filter((h) => h && h.length <= cap).sort((a, b) => a.length - b.length);
          return ranked[0] ?? "";
        };
        const usedIndices = new Set<number>();
        const pickUnique = (preferred: number[]): string => {
          for (const idx of preferred) {
            if (usedIndices.has(idx)) continue;
            const h = headlines[idx];
            if (h) { usedIndices.add(idx); return h; }
          }
          // Fallback: any unused headline that's reasonably short
          const sorted = headlines
            .map((h, i) => ({ h, i }))
            .filter((x) => x.h && !usedIndices.has(x.i))
            .sort((a, b) => a.h.length - b.h.length);
          if (sorted[0]) { usedIndices.add(sorted[0].i); return sorted[0].h; }
          return "";
        };
        // Force the first headline to be reasonably short so the preview
        // doesn't show three truncated identical-looking strings.
        const h1 = pickUnique([0, 1, 2, 3]) || pickDistinct([0]);
        const h2 = pickUnique([4, 5, 6, 7]); // benefit-led
        const h3 = pickUnique([8, 9, 10, 11]); // USP / urgency
        const desc1 = g.adCopy!.descriptions[0] ?? "";
        const previewSitelinks = (g.adCopy!.sitelinks ?? []).slice(0, 4);
        const gadPreview = `
        <div class="ad-channel-group" style="margin-top:1.5rem">
          <div class="ad-channel-label">&#128269; Ad Preview</div>
          <div class="ad-card">
            <div class="ad-card-header"><span class="ad-badge google">Google</span><span style="font-size:11px;color:var(--mid)">${esc(g.name) || `Ad Group ${i + 1}`}</span></div>
            <div class="ad-card-body">
              <div class="gad-sponsor-row"><div class="gad-dot"></div><span class="gad-sponsored-tag">Sponsored</span></div>
              <div class="gad-url-text">https://${esc(adDomain)}${g.adCopy!.urlPaths?.[0] ? ` <span style="color:#70757a">&#8250;</span> <span style="color:#70757a">${esc(g.adCopy!.urlPaths[0])}</span>` : ""}${g.adCopy!.urlPaths?.[1] ? ` <span style="color:#70757a">&#8250;</span> <span style="color:#70757a">${esc(g.adCopy!.urlPaths[1])}</span>` : ""}</div>
              <div class="gad-headline">${[h1, h2, h3].filter(Boolean).map((h, idx) => `<span class="gad-h-part">${esc(h)}</span>${idx < [h1, h2, h3].filter(Boolean).length - 1 ? `<span class="gad-headline-sep">|</span>` : ""}`).join("")}</div>
              <div class="gad-desc">${esc(desc1)}</div>
              ${previewSitelinks.length ? `<div class="gad-sitelinks">${previewSitelinks.map((sl: string) => `<span class="gad-sitelink">${esc(sl)}</span>`).join("")}</div>` : ""}
            </div>
          </div>
        </div>`;

        return `
        <div class="ad-copy-section">
          <div class="ad-copy-title">Ad Copy${g.adCopy!.isFallback ? ` <span class="char-badge char-warn" style="margin-left:.5rem" title="AI generation didn't return usable copy. Placeholder shown — regenerate from the dashboard.">AI fallback</span>` : ""}</div>
          <div class="ad-copy-cols">
            <div class="ad-copy-col">
              <div class="ad-copy-label">Headlines <span class="ad-copy-count">${g.adCopy!.headlines.length}</span></div>
              <div class="headlines-list">${headlinesHtml}</div>
              <button class="copy-btn" onclick="copyAdItems(this,'headlines')">Copy All Headlines</button>
            </div>
            <div class="ad-copy-col">
              <div class="ad-copy-label">Descriptions <span class="ad-copy-count">${g.adCopy!.descriptions.length}</span></div>
              <div class="descriptions-list">${descriptionsHtml}</div>
              <button class="copy-btn" onclick="copyAdItems(this,'descriptions')">Copy All Descriptions</button>
            </div>
          </div>
          ${sitelinksHtml}
          ${gadPreview}
        </div>`;
      })() : "";

      return `
      <div class="ag-section open">
        <div class="ag-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="ag-num">${i + 1}</span>
          <span class="ag-name">${esc(g.name) || `Ad Group ${i + 1}`}</span>
          <span class="ag-count">${g.keywords.length} keywords</span>
          ${g.adCopy ? `<span class="ag-count ag-adcount">${g.adCopy.headlines.length} headlines, ${g.adCopy.descriptions.length} descriptions, ad preview</span>` : ""}
          <span class="ag-chevron">+</span>
        </div>
        <div class="ag-body">
          <table class="kw-tbl">
            <thead><tr><th>Keyword</th><th>Match Type</th>${g.keywords[0]?.volume != null ? "<th>Volume</th>" : ""}</tr></thead>
            <tbody>${kwRows}</tbody>
          </table>
          ${hiddenNote}
          <button class="copy-btn" onclick="copyAgKeywords(this)">Copy Keywords</button>
          ${(g.adGroupNegatives && g.adGroupNegatives.length > 0) ? `
          <div class="ag-neg-section">
            <h5>Ad Group Negatives</h5>
            <div class="neg-list">${g.adGroupNegatives.map((n) => `<span class="neg-chip">${esc(n)}</span>`).join(" ")}</div>
          </div>` : ""}
          ${adCopyHtml}
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
          <h3>${esc(data.campaignName)}</h3>
        </div>
        <div class="overview-grid">${overviewGrid}</div>
        <div class="neg-section">
          <h4>Campaign-Level Negative Keywords</h4>
          ${aiNegHtml ? `${aiNegHtml}` : `<p class="section-intro" style="font-style:italic;color:var(--mid)">No campaign-level negatives recommended for this account yet.</p>`}
          ${flatExtras.length > 0 ? `<h5 style="margin-top:1.25rem;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--mid)">Sector & brief negatives</h5>${flatExtrasHtml}` : ""}
        </div>
        <h3 class="ag-heading">Ad Groups</h3>
        ${adGroupsHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderMetaCampaigns(campaigns: any[], clientWebsite?: string, intro?: string): string {
  const adDomain = (clientWebsite ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim() || "yourbrand.com";
  const campaignsHtml = campaigns
    .map((c, idx) => {
      const audiences = [
        ...(c.audienceTargeting?.interests ?? []).map((i: string) => `<span class="audience-chip interest">${esc(i)}</span>`),
        ...(c.audienceTargeting?.customAudiences ?? []).map((a: string) => `<span class="audience-chip custom">${esc(a)}</span>`),
        ...(c.audienceTargeting?.lookalikes ?? []).map((l: string) => `<span class="audience-chip lookalike">${esc(l)}</span>`),
      ].join(" ");

      const creatives = (c.adCreatives ?? [])
        .map((cr: { format: string; headline: string; primaryText: string; description?: string; cta: string; previewMockup?: string }) => {
          const headlineLen = (cr.headline ?? "").length;
          const primaryLen = (cr.primaryText ?? "").length;
          const descLen = (cr.description ?? "").length;
          const headlineCls = headlineLen <= 40 ? "char-ok" : "char-over";
          const primaryCls = primaryLen >= 80 && primaryLen <= 125 ? "char-ok" : "char-over";
          const descCls = descLen === 0 ? "char-ok" : descLen <= 30 ? "char-ok" : "char-over";
          return `<div class="ad-card">
            <div class="ad-card-header"><span class="ad-badge meta">Meta</span><span style="font-size:11px;color:rgba(255,255,255,.5)">${esc(cr.format)}</span></div>
            <div class="ad-card-body">
              <div class="mad-header">
                <div class="mad-avatar">i3</div>
                <div><div class="mad-info-name">${esc(c.campaignName ?? "")}</div><div class="mad-info-sub">Sponsored &middot; ${esc(cr.format)}</div></div>
              </div>
              <div class="mad-image-wrap">
                ${cr.previewMockup
                  ? `<div class="mad-img-mockup"><span class="mad-img-mockup-label">Visual concept</span><p>${esc(cr.previewMockup)}</p></div>`
                  : `<div class="mad-img-content"><strong>${esc(cr.headline)}</strong></div>`}
              </div>
              <p class="mad-caption">${primaryLen > 125 ? `${esc((cr.primaryText ?? "").slice(0, 125))}<span style="color:var(--mid)">... <em>See more</em></span>` : esc(cr.primaryText)}</p>
              <div class="mad-cta-block">
                <div><div class="mad-cta-block-url">${esc(adDomain)}</div><div class="mad-cta-block-title">${esc(cr.headline)}</div></div>
                <div class="mad-cta-btn">${esc(cr.cta)}</div>
              </div>
              <div class="mad-char-meter">
                <span class="char-badge ${headlineCls}" title="Headline: ${headlineLen}/40">H ${headlineLen}/40</span>
                <span class="char-badge ${primaryCls}" title="Primary text: ${primaryLen}/80–125">P ${primaryLen}/80–125</span>
                ${descLen > 0 ? `<span class="char-badge ${descCls}" title="Description: ${descLen}/30">D ${descLen}/30</span>` : ""}
              </div>
            </div>
          </div>`;
        })
        .join("\n");

      const captions = (c.captionCopyBank ?? [])
        .map((cap: string) => `<div class="caption-item"><p>${esc(cap)}</p><button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(cap)}')">Copy</button></div>`)
        .join("\n");

      const pillars = (c.contentPillars ?? [])
        .map((p: string) => `<li>${esc(p)}</li>`)
        .join("\n");

      return `
      <div class="meta-campaign">
        <div class="meta-campaign-header">
          <span class="meta-num">${idx + 1}</span>
          <div>
            <h4>${esc(c.campaignName)}${c.isFallback ? ` <span class="char-badge char-warn" style="margin-left:.5rem;vertical-align:middle" title="AI generation didn't return usable Meta campaigns. Placeholder shown — regenerate from the dashboard.">AI fallback</span>` : ""}</h4>
            <p class="meta-obj">${esc(c.objective)} · ${esc(c.budget)} · ${esc(c.placements)}</p>
          </div>
        </div>
        <div class="meta-campaign-body">
          <h5>Audience Targeting</h5>
          <div class="audience-list">${audiences}</div>
          <h5>Ad Creatives</h5>
          <div class="ad-mockup-grid">${creatives}</div>
          <h5>Caption Copy Bank</h5>
          <div class="captions-list">${captions}</div>
          ${pillars ? `<h5>Content Pillars</h5><ul class="pillars-list">${pillars}</ul>` : ""}
          ${(c.complianceNotes ?? []).length ? `<div class="compliance-callout"><strong>Platform / compliance notes</strong><ul>${(c.complianceNotes ?? []).map((n: string) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
        </div>
      </div>`;
    })
    .join("\n");

  return `
    <section id="meta-campaigns" class="section">
      <div class="section-inner">
        <div class="section-kicker">Paid Social</div>
        <h2>Meta Campaigns</h2>
      <p class="section-intro">${intro ? esc(intro) : "Facebook and Instagram campaign structures with audience targeting, ad creative, and caption banks."}</p>
      ${campaignsHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderKeywordResearch(data: any): string {
  const groupsHtml = ((data.adGroups ?? []) as { name: string; keywords: { keyword: string; volume?: number; cpc?: number }[]; hiddenLowVolumeCount?: number }[])
    .map((g, gi) => {
      const kwLines = (g.keywords ?? []).map((k) => {
        const vol = k.volume != null ? ` <span class="kw-meta">${k.volume.toLocaleString()}/mo</span>` : "";
        return `<div class="kw-line"><span class="kw-word">${esc(k.keyword)}</span>${vol}<button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(k.keyword)}')">Copy</button></div>`;
      }).join("\n");

      const hiddenNote = g.hiddenLowVolumeCount && g.hiddenLowVolumeCount > 0
        ? `<p class="kw-hidden-note" style="font-size:12px;color:var(--mid);margin:.5rem 0 0">${g.hiddenLowVolumeCount} low/zero-volume keyword${g.hiddenLowVolumeCount === 1 ? "" : "s"} hidden from this view.</p>`
        : "";

      return `
      <div class="kw-group">
        <div class="kw-group-header">
          <h4>${esc(g.name) || `Keyword Group ${gi + 1}`}</h4>
          <button class="copy-btn" onclick="copyGroupKws(this)">Copy All</button>
        </div>
        <div class="kw-line-list">${kwLines}</div>
        ${hiddenNote}
      </div>`;
    })
    .join("\n");

  return `
    <section id="keyword-research" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Keywords</div>
        <h2>Keyword Research</h2>
      <p class="section-intro">Keywords organised by ad group. Use the copy buttons to export directly into Google Keyword Planner or Ads Editor.</p>
      ${groupsHtml}
      </div>
    </section>`;
}

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
    const summary = entry.summary ?? entry.brief ?? entry.notes;
    const secondary = entry.secondaryKeywords ?? [];
    const longTail = entry.longTailKeywords ?? [];
    const audChips = (entry.targetAudiences ?? []).slice(0, 3)
      .map((n) => `<span class="audience-tag">${esc(n)}</span>`).join(" ");
    return `
      <div class="cluster-card ${tier}">
        <div class="cluster-card-head">
          <span class="cluster-type-pill">${esc(typeLabel)}</span>
          ${intent ? `<span class="cc-intent ${intentClass(intent)}">${esc(intentLabel(intent))}</span>` : ""}
        </div>
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
          ${audChips ? `<div class="cc-audiences">${audChips}</div>` : ""}
          ${summary ? `<p class="cc-summary">${esc(summary)}</p>` : ""}
        </div>
      </div>`;
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
        return `
      <div class="content-card">
        <div class="content-url-row">
          <a class="content-url" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(url)}">${esc(url)}</a>
          ${url ? `<button type="button" class="content-url-copy" data-copy="${esc(url)}" aria-label="Copy URL">Copy</button>` : ""}
        </div>
        ${p.keywords?.length ? `<div class="content-kws">${p.keywords.slice(0, 5).map((k) => `<span class="kw-pill">${esc(k.keyword)}</span>`).join(" ")}</div>` : ""}
        ${audChips ? `<div class="cc-audiences" style="margin-top:6px">${audChips}</div>` : ""}
        ${structuredHtml}
        ${!hasStructured && p.notes ? `<div class="content-notes">${formatBriefBlock(p.notes)}</div>` : ""}
      </div>`;
      }).join("\n")}
    </div>` : "";

  // ── Audience Plays cross-reference panel ──────────────────────────────
  // Group every content asset by the audiences it serves, so the strategist
  // can see at a glance which audiences are well-covered and which are thin.
  const allAssets: { kind: string; title: string; entry: Entry }[] = [];
  if (pillar) allAssets.push({ kind: "Pillar Page", title: pillar.title ?? pillar.url ?? "", entry: pillar });
  megas.forEach((m, i) => allAssets.push({ kind: megas.length === 1 ? "Mega Guide" : `Mega Guide ${i + 1}`, title: m.title ?? m.url ?? "", entry: m }));
  articles.forEach((a, i) => allAssets.push({ kind: `Article ${i + 1}`, title: a.title ?? a.url ?? "", entry: a }));
  pageOpts.forEach((p) => allAssets.push({ kind: "On-Page", title: p.url ?? p.title ?? "", entry: p }));
  const audienceMap = new Map<string, { kind: string; title: string }[]>();
  for (const asset of allAssets) {
    for (const audName of asset.entry.targetAudiences ?? []) {
      const key = audName.trim();
      if (!key) continue;
      if (!audienceMap.has(key)) audienceMap.set(key, []);
      audienceMap.get(key)!.push({ kind: asset.kind, title: asset.title });
    }
  }
  const audiencePlaysHtml = audienceMap.size > 0 ? `
    <h3 style="margin-top:2.5rem">Audience Plays</h3>
    <p class="section-intro" style="margin-bottom:1rem">Which content assets serve which audience. Use this to spot gaps before sign-off.</p>
    <div class="audience-plays">
      ${[...audienceMap.entries()].map(([audName, items]) => {
        const why = audienceRationales?.[audName];
        return `
      <div class="audience-play">
        <div class="audience-play-name">${esc(audName)} <span class="audience-play-count">${items.length} asset${items.length === 1 ? "" : "s"}</span></div>
        ${why ? `<p class="audience-play-why">${esc(why)}</p>` : ""}
        <ul class="audience-play-list">
          ${items.slice(0, 8).map((it) => `<li><span class="audience-play-kind">${esc(it.kind)}</span> ${esc(it.title)}</li>`).join("")}
        </ul>
      </div>`;
      }).join("\n")}
    </div>` : "";

  return `
    <section id="content-strategy" class="section">
      <div class="section-inner">
        <div class="section-kicker">Content & SEO</div>
        <h2>Content & SEO Strategy</h2>
        <p class="section-intro">${intro ? esc(intro) : "A topic-cluster approach: one anchoring pillar page, supporting deep-dive guides, and themed articles that capture every stage of intent."}</p>
      ${clusterBlock}
      ${pageOptsHtml}
      ${audiencePlaysHtml}
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
    newTitleTag?: string;
    newMetaDescription?: string;
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
  const linkUrl = (u: string): string => u.startsWith("http") ? u : (u.startsWith("/") ? u : `https://${u}`);

  const quickWinsHtml = quickWins.length ? `
    <h3 class="seo-sub-heading">Quick Wins on Existing Pages</h3>
    <p class="seo-sub-intro">Existing pages that can move within weeks: rewritten title tags, refreshed meta descriptions, and the cross-links to add inside the page body.</p>
    <div class="qw-grid">
      ${quickWins.map((q) => {
        const title = q.newTitleTag ?? "";
        const meta = q.newMetaDescription ?? "";
        const cross = q.crossLinksToAdd ?? [];
        return `
        <div class="qw-card">
          <div class="qw-head">
            <a class="qw-url" href="${esc(linkUrl(q.url))}" target="_blank" rel="noopener">${esc(q.url)}</a>
            <div class="qw-badges">
              ${q.effort ? `<span class="qw-badge qw-effort qw-effort-${esc(q.effort)}">${esc(q.effort)} effort</span>` : ""}
              ${q.estimatedTimeToImpact ? `<span class="qw-badge qw-time">${esc(q.estimatedTimeToImpact)}</span>` : ""}
            </div>
          </div>
          ${q.pageTitle ? `<div class="qw-page-title">${esc(q.pageTitle)}</div>` : ""}
          ${q.rationale ? `<p class="qw-rationale">${esc(q.rationale)}</p>` : ""}
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
  const monthsHtml = months
    .map((m) => {
      const blogs = (m.blogPosts ?? [])
        .map((b: { title: string; intent: string; targetKeyword: string; angle?: string }) =>
          `<div class="cal-item cal-blog"><span class="cal-type">Blog</span><span class="cal-topic">${esc(b.title)}${b.angle ? `<span class="cal-angle" title="${escAttr(b.angle)}" style="display:block;font-size:11px;color:var(--mid);margin-top:2px;font-style:italic">${esc(b.angle)}</span>` : ""}</span><span class="intent-badge intent-${b.intent}">${esc(b.intent)}</span></div>`)
        .join("\n");

      const social = (m.socialPosts ?? [])
        .map((s: { platform: string; type: string; topic: string }) =>
          `<div class="cal-item cal-social"><span class="cal-type">${esc(s.type)}</span><span class="cal-topic">${esc(s.topic)}</span><span class="cal-platform">${esc(s.platform)}</span></div>`)
        .join("\n");

      return `
      <details class="cal-month" open>
        <summary>
          <div class="cal-month-header">
            <h4>${esc(m.month)}</h4>
            ${m.focusLabel ? `<span class="cal-focus">${esc(m.focusLabel)}</span>` : ""}
          </div>
        </summary>
        <div class="cal-items">${blogs}${social}</div>
      </details>`;
    })
    .join("\n");

  return `
    <section id="content-calendar" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Publishing</div>
        <h2>Content Calendar</h2>
      <p class="section-intro">A 6-month publishing schedule across blog content and organic social, aligned to campaign focus periods.</p>
      <div class="calendar-grid">${monthsHtml}</div>
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderOrganicSocial(data: any, intro?: string): string {
  const pillarsHtml = (data.pillars ?? [])
    .map((p: { name: string; description: string; examplePosts: string[] }) => `
    <div class="pillar-card">
      <h4>${esc(p.name)}</h4>
      <p>${esc(p.description)}</p>
      <div class="pillar-examples">
        ${p.examplePosts.map((ex: string) => `<div class="pillar-example">${esc(ex)}</div>`).join("\n")}
      </div>
    </div>`)
    .join("\n");

  const mixHtml = (data.contentMix ?? [])
    .map((m: { type: string; percentage: number }) =>
      `<div class="mix-item"><span class="mix-type">${esc(m.type)}</span><div class="mix-bar"><div class="mix-fill" style="width:${m.percentage}%"></div></div><span class="mix-pct">${m.percentage}%</span></div>`)
    .join("\n");

  const warnSet = new Set<number>(Array.isArray(data.hashtagWarnings) ? data.hashtagWarnings : []);
  const hashtags = (data.hashtagStrategy ?? [])
    .map((h: string, i: number) => {
      const cleaned = h.replace(/^#/, "");
      const isWarn = warnSet.has(i);
      return `<span class="hashtag${isWarn ? " hashtag-warn" : ""}"${isWarn ? ` title="Low-confidence tag — review before posting"` : ""}>#${esc(cleaned)}${isWarn ? ' <span class="hashtag-warn-icon" aria-hidden="true">⚠</span>' : ""}</span>`;
    })
    .join(" ");

  return `
    <section id="organic-social" class="section">
      <div class="section-inner">
        <div class="section-kicker">Social Media</div>
        <h2>Organic Social — Meta</h2>
      <p class="section-intro">${intro ? esc(intro) : "Content pillars, posting frequency, and content type mix for Instagram and Facebook."}</p>
      <div class="social-freq"><strong>Posting frequency:</strong> ${esc(data.postingFrequency ?? "")}</div>
      <h3>Content Mix</h3>
      <div class="mix-chart">${mixHtml}</div>
      <h3>Content Pillars</h3>
      <div class="pillars-grid">${pillarsHtml}</div>
      ${hashtags ? `<h3>Hashtag Strategy</h3><div class="hashtag-list">${hashtags}</div>` : ""}
      </div>
    </section>`;
}

function renderExampleArticles(articles: { title: string; html: string; seoMeta?: { titleTag?: string; metaDescription?: string; primaryKeyword?: string; secondaryKeywords?: string[] } }[]): string {
  const articlesHtml = articles
    .map((a, i) => {
      const seoBlock = a.seoMeta ? `
        <div class="seo-meta-block">
          <div class="seo-meta-title">SEO Metadata</div>
          <div class="seo-meta-grid">
            ${a.seoMeta.titleTag ? `<div class="seo-meta-item"><span class="seo-meta-label">Title Tag</span><span class="seo-meta-value">${esc(a.seoMeta.titleTag)}<span class="char-badge ${a.seoMeta.titleTag.length <= 60 ? "char-ok" : "char-over"}">${a.seoMeta.titleTag.length}/60</span></span></div>` : ""}
            ${a.seoMeta.metaDescription ? `<div class="seo-meta-item"><span class="seo-meta-label">Meta Description</span><span class="seo-meta-value">${esc(a.seoMeta.metaDescription)}<span class="char-badge ${a.seoMeta.metaDescription.length <= 160 ? "char-ok" : "char-over"}">${a.seoMeta.metaDescription.length}/160</span></span></div>` : ""}
            ${a.seoMeta.primaryKeyword ? `<div class="seo-meta-item"><span class="seo-meta-label">Primary Keyword</span><span class="seo-meta-value">${esc(a.seoMeta.primaryKeyword)}</span></div>` : ""}
            ${a.seoMeta.secondaryKeywords?.length ? `<div class="seo-meta-item"><span class="seo-meta-label">Secondary Keywords</span><span class="seo-meta-value">${a.seoMeta.secondaryKeywords.map(k => `<span class="seo-kw-chip">${esc(k)}</span>`).join(" ")}</span></div>` : ""}
          </div>
        </div>` : "";
      return `
    <div class="example-article">
      <div class="article-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="article-num">${i + 1}</span>
        <span class="article-title">${esc(a.title)}</span>
        <span class="article-badge">Example</span>
        <span class="ag-chevron">+</span>
      </div>
      <div class="article-body">${seoBlock}${a.html}</div>
    </div>`;
    })
    .join("\n");

  return `
    <section id="example-articles" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Content Examples</div>
        <h2>Example Articles</h2>
      <p class="section-intro">These are example articles showing the quality and style of content this plan will deliver. Click to expand.</p>
      ${articlesHtml}
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
function renderCompetitorIntel(competitors: any[]): string {
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
      ${c.pageContext?.h1 || c.pageContext?.description ? `<div class="comp-page-ctx">${c.pageContext.h1 ? `<div><strong>H1:</strong> ${esc(c.pageContext.h1)}</div>` : ""}${c.pageContext.description ? `<div><strong>Meta:</strong> ${esc(c.pageContext.description)}</div>` : ""}</div>` : ""}
      <div class="comp-keywords"><span class="comp-kw-label">Top Keywords:</span> ${(c.topKeywords ?? []).map((k: string) => `<span class="comp-kw-chip">${esc(k)}</span>`).join(" ")}</div>
      <div class="comp-sw-grid">
        <div class="comp-sw-col"><span class="comp-sw-title comp-strength">Strengths</span><ul>${(c.strengths ?? []).map((s: string) => `<li>${esc(s)}</li>`).join("")}</ul></div>
        <div class="comp-sw-col"><span class="comp-sw-title comp-weakness">Weaknesses</span><ul>${(c.weaknesses ?? []).map((w: string) => `<li>${esc(w)}</li>`).join("")}</ul></div>
      </div>
    </div>`)
    .join("\n");

  return `
    <section id="competitor-intel" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Research</div>
        <h2>Competitor Intelligence</h2>
      <p class="section-disclaimer" style="margin-bottom:16px;padding:12px 16px;background:rgba(59,130,246,0.06);border-left:3px solid #3b82f6;border-radius:4px;font-size:13px;color:#1e40af;"><strong>AI-generated estimates:</strong> Competitor metrics below are AI-generated approximations, not verified third-party data. Use for directional planning. For audited figures, run a SemRush or Ahrefs audit.</p>
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
.neg-section h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:10px}
.section.dark .neg-section h4{color:#fff}
.neg-chip{display:inline-block;background:rgba(220,38,38,.12);color:#dc2626;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;margin:3px 4px 3px 0}
.section.dark .neg-chip{background:rgba(220,38,38,.2);color:#fca5a5}
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
.match-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.match-exact{background:#d1fae5;color:#065f46}
.match-phrase{background:#dbeafe;color:#1e40af}
.match-broad{background:#fef3c7;color:#92400e}
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
.meta-campaign-header{display:flex;align-items:center;gap:12px;padding:1.25rem 1.5rem;background:linear-gradient(135deg,#1877f2,#0f4c95);color:#fff}
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
.cluster-card{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--white);box-shadow:0 2px 12px rgba(0,0,0,.03);display:flex;flex-direction:column}
.cluster-card-head{padding:.7rem 1rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;gap:8px}
.cluster-card-body{padding:1rem 1.1rem 1.15rem;display:flex;flex-direction:column;flex:1}
.cluster-type-pill{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:2px 8px;border-radius:10px}
.cluster-card.pillar .cluster-card-head{background:#0f172a;color:#fff}
.cluster-card.pillar .cluster-type-pill{background:rgba(255,255,255,.15);color:#fff}
.cluster-card.mega .cluster-card-head{background:#1e293b;color:#cbd5e1}
.cluster-card.mega .cluster-type-pill{background:rgba(255,255,255,.1);color:#cbd5e1}
.cluster-card.article .cluster-card-head{background:var(--bg);color:var(--heading);border-bottom:1px solid var(--border)}
.cluster-card.article .cluster-type-pill{background:var(--border);color:var(--text-light)}
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
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin-top:1rem}
@media (max-width:1000px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:540px){.kpi-grid{grid-template-columns:1fr}}
.kpi-card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.15rem;box-shadow:0 2px 12px rgba(0,0,0,.03)}
.kpi-icon{font-size:1.4rem;margin-bottom:6px;line-height:1}
.kpi-card h4{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-light);margin:0 0 .55rem}
.kpi-card ul{list-style:none;padding:0;margin:0}
.kpi-card ul li{font-size:12.5px;color:var(--text);padding:5px 0;border-bottom:1px dotted var(--border);display:flex;justify-content:space-between;gap:8px;line-height:1.4}
.kpi-card ul li:last-child{border:none}
.kpi-card ul li .kpi-name{color:var(--text-light)}
.kpi-card ul li .kpi-target{font-weight:700;color:var(--heading);text-align:right;flex-shrink:0}
/* Callout box */
.callout{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:1.15rem 1.3rem;margin-top:1.25rem;font-size:13.5px;color:var(--text);line-height:1.6}
/* Collapsible calendar months */
details.cal-month{padding:0}
details.cal-month > summary{list-style:none;cursor:pointer}
details.cal-month > summary::-webkit-details-marker{display:none}
details.cal-month .cal-month-header::after{content:"+";font-size:1rem;font-weight:700;color:rgba(255,255,255,.65);margin-left:8px;transition:transform .2s}
details.cal-month[open] .cal-month-header::after{content:"\\2212"}
/* Content calendar */
.calendar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
.cal-month{background:var(--white);border-radius:12px;overflow:hidden;border:1px solid var(--border);box-shadow:0 2px 12px rgba(0,0,0,.03)}
.cal-month-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--ink);color:#fff}
.cal-month-header h4{font-size:14px;font-weight:700;margin:0;color:#fff}
.cal-focus{background:rgba(255,255,255,.15);padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600}
.cal-items{padding:12px 16px;display:flex;flex-direction:column;gap:6px}
.cal-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg);border-radius:6px;font-size:13px}
.cal-type{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 6px;border-radius:4px;flex-shrink:0}
.cal-blog .cal-type{background:#dbeafe;color:#1e40af}
.cal-social .cal-type{background:#ede9fe;color:#7c3aed}
.cal-topic{flex:1}
.cal-platform{font-size:11px;color:var(--mid)}
/* Organic social */
.social-freq{background:var(--bg);padding:1rem 1.25rem;border-radius:10px;font-size:14px;margin-bottom:1.5rem;border:1px solid var(--border)}
.mix-chart{display:flex;flex-direction:column;gap:10px;margin-bottom:2rem}
.mix-item{display:flex;align-items:center;gap:12px}
.mix-type{width:90px;font-size:13px;font-weight:600;color:var(--heading);text-transform:capitalize}
.mix-bar{flex:1;height:28px;background:var(--bg);border-radius:8px;overflow:hidden}
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
  .kpi-grid{grid-template-columns:repeat(2,1fr)}
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
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
.kpi-card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1.25rem;box-shadow:0 2px 12px rgba(0,0,0,.03)}
.kpi-icon{font-size:1.35rem;margin-bottom:6px}
.kpi-card h4{font-size:13px;font-weight:700;color:var(--heading);margin-bottom:6px}
.kpi-card ul{list-style:none;padding:0}
.kpi-card ul li{font-size:12px;color:var(--text);padding:3px 0;border-bottom:1px dotted var(--border)}
.kpi-card ul li:last-child{border:none}

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
.brain-audience-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.75rem}
.brain-audience{padding:.85rem 1rem;background:#fff;border:1px solid #e2e8f0;border-radius:10px;border-left:3px solid #6366f1}
.brain-audience-name{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:.4rem}
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

// Copy ad group keywords
function copyAgKeywords(btn){
  var body=btn.closest('.ag-body');
  var cells=body.querySelectorAll('.kw-text');
  var text=Array.from(cells).map(function(c){return c.textContent.trim()}).join('\\n');
  navigator.clipboard.writeText(text).then(function(){
    btn.textContent='Copied!';
    setTimeout(function(){btn.textContent='Copy Keywords';},1800);
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
(function(){
  try{
    var ids=Array.from(document.querySelectorAll('section.section[id]')).map(function(s){
      var heading=s.querySelector('h2');
      return {id:s.id,label:heading?heading.textContent.trim():s.id};
    });
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:'gp:ready',sections:ids,height:document.body.scrollHeight},'*');
    }
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
    <div class="brain-audience">
      <div class="brain-audience-name">${esc(a.name)}</div>
      <div class="brain-audience-line"><strong>Insight:</strong> ${esc(a.coreInsight)}</div>
      <div class="brain-audience-line"><strong>Lead pain:</strong> ${esc(a.primaryPain)}</div>
      <div class="brain-audience-line"><strong>Trigger:</strong> ${esc(a.decisionTrigger)}</div>
      ${a.channels?.length ? `<div class="brain-audience-line"><strong>Channels:</strong> ${a.channels.map(esc).join(", ")}</div>` : ""}
    </div>`).join("");

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
      ${geos ? `
      <div class="brain-geos">
        <h4>Markets we are targeting</h4>
        <div class="brain-geo-chips">${geos}</div>
      </div>` : ""}
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
