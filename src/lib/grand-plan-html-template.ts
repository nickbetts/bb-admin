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

import type { GrandPlanData } from "./grand-plan-generator";

/**
 * Extract a clean one-paragraph teaser from executive summary HTML.
 * Strips heading tags, HTML markup, code-fence artefacts, and truncates
 * to ~220 chars so the hero section always looks intentional.
 */
function heroSubtext(raw: string): string {
  // Strip any remaining code-fence prefix (e.g. "html\n") that slipped past extractText
  const nofence = raw.replace(/^(?:html|markdown|md|json)\s+/i, "");
  // Remove heading tags and their content — we want body copy only
  const noHeadings = nofence.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, " ");
  // Strip all remaining HTML tags
  const text = noHeadings.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= 220) return text;
  const sub = text.slice(0, 220);
  return (sub.slice(0, sub.lastIndexOf(" ")) || sub) + "…";
}

export function renderGrandPlanHtml(plan: GrandPlanData): string {
  const s = plan.sections;

  // ── Build chapter-grouped nav ──────────────────────────────────────────────
  type NavItem = { id: string; label: string; isChapter?: boolean };
  const navItems: NavItem[] = [];

  const addChapter = (title: string) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    navItems.push({ id: `chapter-${slug}`, label: title, isChapter: true });
  };

  const hasContext = s.audiences?.length || plan.brief || plan.campaignPeriods?.length;
  const hasStrategy = s.executiveSummary || s.strategyPlan;
  const hasPaidSearch = s.googleAdsCampaigns || s.googleAdsForecast;
  const hasPaidSocial = s.metaCampaigns?.length || s.linkedInAds?.length;
  const hasContent = s.contentStrategy || s.contentCalendar?.length || s.organicSocial || s.exampleArticles?.length;
  const hasResearch = s.keywordResearch || s.competitorIntel?.length;
  const hasCommercial = s.servicesInvestment || s.mediaPlan || s.emailMarketing;
  const hasCreative = s.landingPage;

  if (hasContext) {
    addChapter("Context");
    navItems.push({ id: "context", label: "Brief & Audiences" });
  }
  if (hasStrategy) {
    addChapter("Strategy");
    if (s.executiveSummary) navItems.push({ id: "executive-summary", label: "Executive Summary" });
    if (s.strategyPlan) navItems.push({ id: "strategy-plan", label: "Strategy Plan" });
  }
  if (hasPaidSearch) {
    addChapter("Paid Search");
    if (s.googleAdsCampaigns) navItems.push({ id: "google-ads", label: "Google Ads" });
    if (s.googleAdsForecast) navItems.push({ id: "google-ads-forecast", label: "Performance Forecast" });
  }
  if (hasPaidSocial) {
    addChapter("Paid Social");
    if (s.metaCampaigns?.length) navItems.push({ id: "meta-campaigns", label: "Meta Campaigns" });
    if (s.linkedInAds?.length) navItems.push({ id: "linkedin-ads", label: "LinkedIn Ads" });
  }
  if (hasContent) {
    addChapter("Content & SEO");
    if (s.contentStrategy) navItems.push({ id: "content-strategy", label: "Content Strategy" });
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
    if (s.mediaPlan) navItems.push({ id: "media-plan", label: "Media Plan" });
    if (s.emailMarketing) navItems.push({ id: "email-marketing", label: "Email Marketing" });
  }
  if (hasCreative) {
    addChapter("Creative");
    navItems.push({ id: "landing-page", label: "Landing Page" });
  }

  // ── Stats band ─────────────────────────────────────────────────────────────
  const stats: { num: string; label: string }[] = [];
  const sectionCount = navItems.filter(n => !n.isChapter).length;
  stats.push({ num: String(sectionCount), label: "Sections" });
  if (s.googleAdsCampaigns?.adGroups?.length) stats.push({ num: String(s.googleAdsCampaigns.adGroups.length), label: "Ad Groups" });
  if (s.keywordResearch?.adGroups?.length) {
    const totalKws = s.keywordResearch.adGroups.reduce((sum: number, g: { keywords: unknown[] }) => sum + g.keywords.length, 0);
    stats.push({ num: totalKws > 100 ? `${Math.round(totalKws / 10) * 10}+` : String(totalKws), label: "Target Keywords" });
  }
  if (s.contentStrategy) {
    const contentCount = (s.contentStrategy.pageOptimisations?.length ?? 0) + (s.contentStrategy.landingPages?.length ?? 0) + (s.contentStrategy.blogPosts?.length ?? 0);
    if (contentCount) stats.push({ num: String(contentCount), label: "Content Assets" });
  }
  if (s.metaCampaigns?.length) stats.push({ num: String(s.metaCampaigns.length), label: "Meta Campaigns" });
  if (s.linkedInAds?.length) stats.push({ num: String(s.linkedInAds.length), label: "LinkedIn Campaigns" });
  if (s.competitorIntel?.length) stats.push({ num: String(s.competitorIntel.length), label: "Competitors Analysed" });

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
    <p class="hero-sub">${s.executiveSummary ? esc(heroSubtext(s.executiveSummary)) : `A comprehensive digital marketing strategy for ${esc(plan.clientName)}.`}</p>
    <div class="hero-meta">
      <div class="hero-meta-item"><strong>Client</strong><span>${esc(plan.clientName)}</span></div>
      <div class="hero-meta-item"><strong>Agency</strong><span>i3media</span></div>
      <div class="hero-meta-item"><strong>Date</strong><span>${new Date(plan.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
      <div class="hero-meta-item"><strong>Scope</strong><span>${navItems.slice(0, 4).map(n => n.label.split(" ")[0]).join(", ")}</span></div>
    </div>
  </div>
</section>

<!-- Stats Band -->
<div class="stats-band">
  <div class="stats-inner">
    ${stats.slice(0, 5).map(st => `<div class="stat-item"><span class="stat-num">${st.num}</span><span class="stat-label">${st.label}</span></div>`).join("\n    ")}
  </div>
</div>

<!-- Main Content -->
${buildChapteredSections(s, plan.clientName, plan.brief, plan.campaignPeriods, plan.generationReport)}

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
function buildChapteredSections(s: any, clientName: string, brief?: string, campaignPeriods?: { label: string; startMonth: number; endMonth: number; description?: string }[], generationReport?: Record<string, { status: string; error?: string }>): string {
  // Stash the LP report on the section data so the Creative-chapter logic
  // below can decide whether to render the placeholder card. Avoids threading
  // generationReport through every helper.
  if (generationReport?.landingPage) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any).__lpReport = generationReport.landingPage;
  }
  let chapterNum = 0;
  const ch = (title: string, sub: string) => {
    chapterNum++;
    return chapterPanel(chapterNum, title, sub);
  };

  const hasContext = brief || s.audiences?.length || campaignPeriods?.length;
  const hasStrategy = s.executiveSummary || s.strategyPlan;
  const hasPaidSearch = s.googleAdsCampaigns || s.googleAdsForecast;
  const hasPaidSocial = s.metaCampaigns?.length || s.linkedInAds?.length;
  const hasContent = s.contentStrategy || s.contentCalendar?.length || s.organicSocial || s.exampleArticles?.length;
  const hasResearch = s.keywordResearch || s.competitorIntel?.length;
  const hasCommercial = s.servicesInvestment || s.mediaPlan || s.emailMarketing;
  const hasCreative = s.landingPage;

  const parts: string[] = [];

  if (hasContext) {
    parts.push(ch("Context", `The brief, target audiences, and campaign periods that define this plan.`));
    parts.push(renderContext(brief, s.audiences, campaignPeriods));
  }

  if (hasStrategy) {
    parts.push(ch("Strategy", `The overall marketing strategy and executive overview for ${clientName}.`));
    if (s.executiveSummary) parts.push(renderExecutiveSummary(s.executiveSummary));
    if (s.strategyPlan) parts.push(renderStrategyPlan(s.strategyPlan));
  }

  if (hasPaidSearch) {
    parts.push(ch("Paid Search", "Google Ads campaign structure, ad groups, keyword targeting, and performance forecasts."));
    if (s.googleAdsCampaigns) parts.push(renderGoogleAdsCampaigns(s.googleAdsCampaigns));
    if (s.googleAdsForecast) parts.push(renderGoogleAdsForecast(s.googleAdsForecast));
  }

  if (hasPaidSocial) {
    parts.push(ch("Paid Social", "Facebook, Instagram, and LinkedIn campaign structures with audience targeting and ad creative."));
    if (s.metaCampaigns?.length) parts.push(renderMetaCampaigns(s.metaCampaigns));
    if (s.linkedInAds?.length) parts.push(renderLinkedInAds(s.linkedInAds));
  }

  if (hasContent) {
    parts.push(ch("Content & SEO", "Content strategy, publishing calendar, organic social, and example content assets."));
    if (s.contentStrategy) parts.push(renderContentStrategy(s.contentStrategy));
    if (s.contentCalendar?.length) parts.push(renderContentCalendar(s.contentCalendar));
    if (s.organicSocial) parts.push(renderOrganicSocial(s.organicSocial));
    if (s.exampleArticles?.length) parts.push(renderExampleArticles(s.exampleArticles));
  }

  if (hasResearch) {
    parts.push(ch("Research", "Keyword research and competitor intelligence across all target areas."));
    if (s.keywordResearch) parts.push(renderKeywordResearch(s.keywordResearch));
    if (s.competitorIntel?.length) parts.push(renderCompetitorIntel(s.competitorIntel));
  }

  if (hasCommercial) {
    parts.push(ch("Commercial", "Services, investment overview, media budget allocation, and email lifecycle."));
    if (s.servicesInvestment) parts.push(renderServicesInvestment(s.servicesInvestment));
    if (s.mediaPlan) parts.push(renderMediaPlan(s.mediaPlan));
    if (s.emailMarketing) parts.push(renderEmailMarketing(s.emailMarketing));
  }

  if (hasCreative) {
    parts.push(ch("Creative", "An AI-generated example landing page built from your website content and branding."));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lpReport = (s as any).__lpReport as { status: string; error?: string } | undefined;
    const lpFailed = lpReport && lpReport.status !== "ok";
    if (s.landingPage) {
      parts.push(renderLandingPage(s.landingPage));
    } else if (lpFailed) {
      parts.push(renderLandingPagePlaceholder(lpReport?.error));
    }
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
  audiences: { name: string; description: string; painPoints: string[]; channels: string[] }[] | undefined,
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
        ${a.painPoints?.length ? `
        <div class="ctx-pain-label">Pain Points</div>
        <ul class="ctx-pain-list">
          ${a.painPoints.map(p => `<li>${esc(p)}</li>`).join("")}
        </ul>` : ""}
        ${a.channels?.length ? `
        <div class="ctx-channels">
          ${a.channels.map(c => `<span class="ctx-channel-chip">${esc(c)}</span>`).join("")}
        </div>` : ""}
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
  return `
    <section id="executive-summary" class="section alt">
      <div class="section-inner">
        <div class="section-kicker">Overview</div>
        <h2>Executive Summary</h2>
        <div class="section-body">${html}</div>
      </div>
    </section>`;
}

function renderStrategyPlan(html: string): string {
  return `
    <section id="strategy-plan" class="section">
      <div class="section-inner">
        <div class="section-kicker">The Plan</div>
        <h2>Strategy Plan</h2>
        <div class="section-body">${html}</div>
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderGoogleAdsCampaigns(data: any): string {
  const overviewGrid = Object.entries(data.overview as Record<string, string>)
    .map(([k, v]) => `<div class="ov-item"><span class="ov-label">${esc(k)}</span><span class="ov-value">${esc(v)}</span></div>`)
    .join("\n");

  const negKws = (data.negativeKeywords as string[])
    .map((k: string) => `<span class="neg-chip">${esc(k)}</span>`)
    .join(" ");

  const adGroupsHtml = (data.adGroups as { name: string; keywords: { keyword: string; matchType: string; volume?: number; cpc?: number }[]; hiddenLowVolumeCount?: number; adCopy?: { headlines: string[]; descriptions: string[]; sitelinks?: string[]; isFallback?: boolean } }[])
    .map((g, i) => {
      const kwRows = g.keywords
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

        // Google ad preview mockup
        const h1 = g.adCopy!.headlines[0] ?? "";
        const h2 = g.adCopy!.headlines[1] ?? "";
        const h3 = g.adCopy!.headlines[2] ?? "";
        const desc1 = g.adCopy!.descriptions[0] ?? "";
        const previewSitelinks = (g.adCopy!.sitelinks ?? []).slice(0, 4);
        const gadPreview = `
        <div class="ad-channel-group" style="margin-top:1.5rem">
          <div class="ad-channel-label">&#128269; Ad Preview</div>
          <div class="ad-card">
            <div class="ad-card-header"><span class="ad-badge google">Google</span><span style="font-size:11px;color:var(--mid)">${esc(g.name)}</span></div>
            <div class="ad-card-body">
              <div class="gad-sponsor-row"><div class="gad-dot"></div><span class="gad-sponsored-tag">Sponsored</span></div>
              <div class="gad-url-text">https://example.com</div>
              <div class="gad-headline">${esc(h1)}${h2 ? ` <span class="gad-headline-sep">|</span> ${esc(h2)}` : ""}${h3 ? ` <span class="gad-headline-sep">|</span> ${esc(h3)}` : ""}</div>
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
      <div class="ag-section">
        <div class="ag-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="ag-num">${i + 1}</span>
          <span class="ag-name">${esc(g.name)}</span>
          <span class="ag-count">${g.keywords.length} keywords</span>
          <span class="ag-chevron">+</span>
        </div>
        <div class="ag-body">
          <table class="kw-tbl">
            <thead><tr><th>Keyword</th><th>Match Type</th>${g.keywords[0]?.volume != null ? "<th>Volume</th>" : ""}</tr></thead>
            <tbody>${kwRows}</tbody>
          </table>
          ${hiddenNote}
          <button class="copy-btn" onclick="copyAgKeywords(this)">Copy Keywords</button>
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
        <div class="campaign-hero">
          <h3>${esc(data.campaignName)}</h3>
        </div>
        <div class="overview-grid">${overviewGrid}</div>
        <div class="neg-section">
          <h4>Campaign-Level Negative Keywords</h4>
          <div class="neg-list">${negKws}</div>
        </div>
        <h3 class="ag-heading">Ad Groups</h3>
        ${adGroupsHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderMetaCampaigns(campaigns: any[]): string {
  const campaignsHtml = campaigns
    .map((c, idx) => {
      const audiences = [
        ...(c.audienceTargeting?.interests ?? []).map((i: string) => `<span class="audience-chip interest">${esc(i)}</span>`),
        ...(c.audienceTargeting?.customAudiences ?? []).map((a: string) => `<span class="audience-chip custom">${esc(a)}</span>`),
        ...(c.audienceTargeting?.lookalikes ?? []).map((l: string) => `<span class="audience-chip lookalike">${esc(l)}</span>`),
      ].join(" ");

      const creatives = (c.adCreatives ?? [])
        .map((cr: { format: string; headline: string; primaryText: string; cta: string }) =>
          `<div class="ad-card">
            <div class="ad-card-header"><span class="ad-badge meta">Meta</span><span style="font-size:11px;color:rgba(255,255,255,.5)">${esc(cr.format)}</span></div>
            <div class="ad-card-body">
              <div class="mad-header">
                <div class="mad-avatar">i3</div>
                <div><div class="mad-info-name">${esc(c.campaignName ?? "")}</div><div class="mad-info-sub">Sponsored &middot; ${esc(cr.format)}</div></div>
              </div>
              <div class="mad-image-wrap">
                <div class="mad-img-content"><strong>${esc(cr.headline)}</strong></div>
              </div>
              <p class="mad-caption">${esc(cr.primaryText)}</p>
              <div class="mad-cta-block">
                <div><div class="mad-cta-block-url">i3media.co.uk</div><div class="mad-cta-block-title">${esc(cr.headline)}</div></div>
                <div class="mad-cta-btn">${esc(cr.cta)}</div>
              </div>
            </div>
          </div>`)
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
        </div>
      </div>`;
    })
    .join("\n");

  return `
    <section id="meta-campaigns" class="section">
      <div class="section-inner">
        <div class="section-kicker">Paid Social</div>
        <h2>Meta Campaigns</h2>
      <p class="section-intro">Facebook and Instagram campaign structures with audience targeting, ad creative, and caption banks.</p>
      ${campaignsHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderKeywordResearch(data: any): string {
  const groupsHtml = (data.adGroups as { name: string; keywords: { keyword: string; volume?: number; cpc?: number }[]; hiddenLowVolumeCount?: number }[])
    .map((g) => {
      const kwLines = g.keywords.map((k) => {
        const vol = k.volume != null ? ` <span class="kw-meta">${k.volume.toLocaleString()}/mo</span>` : "";
        return `<div class="kw-line"><span class="kw-word">${esc(k.keyword)}</span>${vol}<button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(k.keyword)}')">Copy</button></div>`;
      }).join("\n");

      const hiddenNote = g.hiddenLowVolumeCount && g.hiddenLowVolumeCount > 0
        ? `<p class="kw-hidden-note" style="font-size:12px;color:var(--mid);margin:.5rem 0 0">${g.hiddenLowVolumeCount} low/zero-volume keyword${g.hiddenLowVolumeCount === 1 ? "" : "s"} hidden from this view.</p>`
        : "";

      return `
      <div class="kw-group">
        <div class="kw-group-header">
          <h4>${esc(g.name)}</h4>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderContentStrategy(data: any): string {
  const pageOpts = (data.pageOptimisations ?? []).slice(0, 15);
  const landingPages = (data.landingPages ?? []).slice(0, 10);
  const blogPosts = (data.blogPosts ?? []).slice(0, 20);

  const pageOptsHtml = pageOpts.length > 0 ? `
    <h3>Page Optimisations</h3>
    <div class="content-cards">
      ${pageOpts.map((p: { url?: string; title?: string; keywords?: { keyword: string }[]; notes?: string }) => `
      <div class="content-card">
        <p class="content-url">${esc(p.url || "")}</p>
        ${p.keywords?.length ? `<div class="content-kws">${p.keywords.slice(0, 5).map((k: { keyword: string }) => `<span class="kw-pill">${esc(k.keyword)}</span>`).join(" ")}</div>` : ""}
        ${p.notes ? `<p class="content-notes">${esc(p.notes)}</p>` : ""}
      </div>`).join("\n")}
    </div>` : "";

  const landingsHtml = landingPages.length > 0 ? `
    <h3>New Landing Pages</h3>
    <div class="content-cards">
      ${landingPages.map((p: { title?: string; keywords?: { keyword: string }[] }) => `
      <div class="content-card">
        <p class="content-title">${esc(p.title || "Untitled")}</p>
        ${p.keywords?.length ? `<div class="content-kws">${p.keywords.slice(0, 5).map((k: { keyword: string }) => `<span class="kw-pill">${esc(k.keyword)}</span>`).join(" ")}</div>` : ""}
      </div>`).join("\n")}
    </div>` : "";

  const blogsHtml = blogPosts.length > 0 ? `
    <h3>Blog Posts</h3>
    <div class="content-cards">
      ${blogPosts.map((p: { title?: string; intent?: string; keywords?: { keyword: string }[] }) => `
      <div class="content-card">
        <p class="content-title">${esc(p.title || "Untitled")}</p>
        ${p.intent ? `<span class="intent-badge intent-${p.intent}">${esc(p.intent)}</span>` : ""}
        ${p.keywords?.length ? `<div class="content-kws">${p.keywords.slice(0, 3).map((k: { keyword: string }) => `<span class="kw-pill">${esc(k.keyword)}</span>`).join(" ")}</div>` : ""}
      </div>`).join("\n")}
    </div>` : "";

  return `
    <section id="content-strategy" class="section">
      <div class="section-inner">
        <div class="section-kicker">Content & SEO</div>
        <h2>Content & SEO Strategy</h2>
      ${pageOptsHtml}
      ${landingsHtml}
      ${blogsHtml}
      </div>
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderContentCalendar(months: any[]): string {
  const monthsHtml = months
    .map((m) => {
      const blogs = (m.blogPosts ?? [])
        .map((b: { title: string; intent: string; targetKeyword: string }) =>
          `<div class="cal-item cal-blog"><span class="cal-type">Blog</span><span class="cal-topic">${esc(b.title)}</span><span class="intent-badge intent-${b.intent}">${esc(b.intent)}</span></div>`)
        .join("\n");

      const social = (m.socialPosts ?? [])
        .map((s: { platform: string; type: string; topic: string }) =>
          `<div class="cal-item cal-social"><span class="cal-type">${esc(s.type)}</span><span class="cal-topic">${esc(s.topic)}</span><span class="cal-platform">${esc(s.platform)}</span></div>`)
        .join("\n");

      return `
      <div class="cal-month">
        <div class="cal-month-header">
          <h4>${esc(m.month)}</h4>
          ${m.focusLabel ? `<span class="cal-focus">${esc(m.focusLabel)}</span>` : ""}
        </div>
        <div class="cal-items">${blogs}${social}</div>
      </div>`;
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
function renderOrganicSocial(data: any): string {
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

  const hashtags = (data.hashtagStrategy ?? [])
    .map((h: string) => `<span class="hashtag">#${esc(h.replace(/^#/, ""))}</span>`)
    .join(" ");

  return `
    <section id="organic-social" class="section">
      <div class="section-inner">
        <div class="section-kicker">Social Media</div>
        <h2>Organic Social — Meta</h2>
      <p class="section-intro">Content pillars, posting frequency, and content type mix for Instagram and Facebook.</p>
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

  return `
    <section id="services" class="section">
      <div class="section-inner">
        <div class="section-kicker">Pricing</div>
        <h2>Services &amp; Investment</h2>
      ${delivGrid ? `<h3 style="margin-bottom:1.25rem">Recommended Services</h3>${delivGrid}` : ""}
      ${timelineHtml ? `<h3 style="margin:2rem 0 1rem">Timeline</h3><div class="timeline-list">${timelineHtml}</div>` : ""}
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
      <span class="channel-budget">£${ch.budget.toLocaleString()}</span>
      <span class="channel-pct">${ch.percentage}%</span>
    </div>`)
    .join("\n");

  const tableRowsHtml = (data.channels ?? [])
    .map((ch: { name: string; budget: number; percentage: number; strategy: string }) => `
    <tr>
      <td style="font-weight:600;white-space:nowrap">${esc(ch.name)}</td>
      <td style="font-weight:600">£${ch.budget.toLocaleString()}</td>
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
        <div class="media-stat"><span class="media-label">Total Budget</span><span class="media-value">£${data.totalBudget.toLocaleString()}</span></div>
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
        <span class="ag-count">${flow.emails.length} emails</span>
        <span class="ag-chevron">+</span>
      </div>
      <div class="em-flow-body">
        <p class="em-trigger"><strong>Trigger:</strong> ${esc(flow.trigger)}</p>
        <div class="em-emails">
          ${flow.emails.map((e: { subject: string; purpose: string; delay?: string }, j: number) => `
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
            <p class="lad-caption">${esc(cr.introText)}</p>
            <div class="lad-image-wrap">
              <div class="lad-img-txt">${esc(cr.headline)}<span class="char-badge ${cr.headline.length <= 70 ? "char-ok" : "char-over"}" style="margin-left:6px">${cr.headline.length}/70</span></div>
            </div>
            ${cr.description ? `<p style="font-size:12px;color:var(--text-light);margin-bottom:8px">${esc(cr.description)}</p>` : ""}
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

  const tableRows = competitors
    .map((c) => `
    <tr>
      <td class="comp-domain">${esc(c.domain ?? "")}</td>
      <td class="comp-num">${c.organicTraffic ? fmtNum(c.organicTraffic) : "—"}</td>
      <td class="comp-num">${c.organicKeywords ? fmtNum(c.organicKeywords) : "—"}</td>
      <td class="comp-num">${c.paidKeywords ? fmtNum(c.paidKeywords) : "—"}</td>
      <td class="comp-num">${c.backlinks ? fmtNum(c.backlinks) : "—"}</td>
    </tr>`)
    .join("\n");

  const detailCards = competitors
    .map((c) => `
    <div class="comp-detail-card">
      <h4>${esc(c.domain ?? "")}</h4>
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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escAttr(s: string): string {
  return s.replace(/'/g, "\\'").replace(/\n/g, "\\n");
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

/* ── Hero ──────────────────────────────────────────────────── */
.hero{min-height:88vh;background:linear-gradient(145deg,#0a1124 0%,#0f172a 45%,#141f3a 80%,#0c1428 100%);display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;padding:5.5rem 3rem 4.5rem}
.hero::after{content:'';position:absolute;inset:auto 0 0 0;height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,.35),transparent)}
.hero-orb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(2px)}
.hero-orb:nth-child(1){width:680px;height:680px;top:-220px;right:-160px;background:radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%)}
.hero-orb:nth-child(2){width:420px;height:420px;bottom:-120px;left:-100px;background:radial-gradient(circle,rgba(168,85,247,.09) 0%,transparent 70%)}
.hero-orb:nth-child(3){width:260px;height:260px;top:28%;right:24%;background:radial-gradient(circle,rgba(236,72,153,.06) 0%,transparent 70%)}
.hero-inner{max-width:1100px;margin:0 auto;width:100%;position:relative;z-index:1}
.hero-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;margin-bottom:1.75rem;display:flex;align-items:center;gap:12px}
.hero-label::before{content:'';width:32px;height:1px;background:linear-gradient(90deg,#6366f1,transparent);display:block}
.hero h1{font-size:clamp(2.6rem,5.5vw,4.5rem);font-weight:800;letter-spacing:-.035em;line-height:1.05;color:#fff;margin-bottom:1.5rem;max-width:820px}
.hero-divider{width:48px;height:3px;background:var(--gradient-accent);border-radius:2px;margin-bottom:2.25rem}
.hero-sub{font-size:1.075rem;color:#cbd5e1;line-height:1.7;max-width:600px;margin-bottom:3rem;font-weight:400}
.hero-meta{display:flex;flex-wrap:wrap;gap:2.5rem;font-size:13px;color:#64748b;border-top:1px solid rgba(255,255,255,.06);padding-top:2.25rem;margin-top:auto}
.hero-meta-item strong{display:block;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin-bottom:4px}
.hero-meta-item span{color:#e2e8f0;font-weight:500}

/* ── Stats Band ────────────────────────────────────────────── */
.stats-band{background:#0a1124;padding:3rem 3rem;border-bottom:1px solid rgba(255,255,255,.04)}
.stats-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0}
.stat-item{padding:.25rem 2rem;border-right:1px solid rgba(255,255,255,.06);text-align:center}
.stat-item:last-child{border-right:none}
.stat-num{font-size:2.5rem;font-weight:700;letter-spacing:-.04em;color:#fff;line-height:1;display:block;margin-bottom:.5rem;background:var(--gradient-accent);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.stat-num span{color:#a78bfa}
.stat-label{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.12em}

/* ── Sections ──────────────────────────────────────────────── */
.section{padding:5rem 3rem}
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
.content-url{font-size:12px;color:var(--text-light);font-family:'SF Mono','Fira Code','Courier New',monospace;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.content-title{font-size:14px;font-weight:600;color:var(--heading);margin-bottom:6px}
.content-kws{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.content-notes{font-size:13px;color:var(--text-light);margin-top:6px}
.kw-pill{display:inline-block;padding:2px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;font-size:11px;color:var(--text-light)}
.intent-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.intent-awareness,.intent-informational{background:#dbeafe;color:#1e40af}
.intent-commercial{background:#fef3c7;color:#92400e}
.intent-decision,.intent-transactional{background:#d1fae5;color:#065f46}
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
.chapter-panel{background:linear-gradient(135deg,#0a1124 0%,#0f172a 55%,#131f38 100%);padding:3.5rem 3rem;position:relative;overflow:hidden}
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
  .hero{padding:4rem 2rem 3rem;min-height:auto}
  .hero h1{font-size:clamp(2rem,5vw,3rem)}
  .stats-inner{grid-template-columns:repeat(3,1fr);row-gap:2rem}
  .stat-item{border-right:none;padding:0 1rem}
  .section{padding:4rem 2rem}
  .ad-copy-cols{grid-template-columns:1fr}
  .snav-dropdown-inner{padding:0 2rem}
  .sticky-nav-inner{padding:0 2rem}
}
@media(max-width:640px){
  .hero{padding:3rem 1.5rem 2.5rem}
  .hero h1{font-size:2rem;letter-spacing:-1px}
  .hero-meta{gap:1.5rem}
  .stats-inner{grid-template-columns:repeat(2,1fr)}
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
  .sticky-nav,.snav-dropdown,.snav-menu-btn,.watermark,.auth-gate,.copy-btn,.copy-btn-sm,.hero-orb,.cta-close,.lp-frame-wrap,.lp-iframe{display:none!important}
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
.gad-headline{font-size:17px;color:#1a0dab;line-height:1.35;margin-bottom:3px;cursor:default}
.gad-headline-sep{color:#70757a;font-weight:400;margin:0 2px}
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
  var lastY=0;
  window.addEventListener('scroll',function(){
    var y=window.scrollY;
    if(y>400){nav.classList.add('visible');}else{nav.classList.remove('visible');}
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
