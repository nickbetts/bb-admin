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

export function renderGrandPlanHtml(plan: GrandPlanData): string {
  const s = plan.sections;
  const navItems: { id: string; label: string }[] = [];

  if (s.executiveSummary) navItems.push({ id: "executive-summary", label: "Executive Summary" });
  if (s.strategyPlan) navItems.push({ id: "strategy-plan", label: "Strategy Plan" });
  if (s.googleAdsCampaigns) navItems.push({ id: "google-ads", label: "Google Ads Campaigns" });
  if (s.metaCampaigns?.length) navItems.push({ id: "meta-campaigns", label: "Meta Campaigns" });
  if (s.keywordResearch) navItems.push({ id: "keyword-research", label: "Keyword Research" });
  if (s.contentStrategy) navItems.push({ id: "content-strategy", label: "Content & SEO Strategy" });
  if (s.contentCalendar?.length) navItems.push({ id: "content-calendar", label: "Content Calendar" });
  if (s.organicSocial) navItems.push({ id: "organic-social", label: "Organic Social — Meta" });
  if (s.exampleArticles?.length) navItems.push({ id: "example-articles", label: "Example Articles" });
  if (s.servicesInvestment) navItems.push({ id: "services", label: "Services & Investment" });
  if (s.mediaPlan) navItems.push({ id: "media-plan", label: "Media Plan" });
  if (s.landingPage) navItems.push({ id: "landing-page", label: "Example Landing Page" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(plan.title)}</title>
<style>${CSS}</style>
</head>
<body>

<!-- Header -->
<header class="site-header">
  <div class="header-inner">
    <div class="logo-area">
      ${I3_LOGO_SVG}
      <span class="header-sep">|</span>
      <span class="header-client">${esc(plan.clientName)}</span>
    </div>
    <div class="header-meta">
      <span class="header-badge">${plan.purpose === "pitch" ? "Pitch" : plan.purpose === "onboarding" ? "Onboarding" : "Strategy"}</span>
      <span class="header-date">${new Date(plan.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
    </div>
  </div>
</header>

<!-- Layout -->
<div class="layout">
  <!-- Sidebar -->
  <aside class="sidebar">
    <nav class="sidebar-nav">
      <p class="sidebar-title">Contents</p>
      ${navItems.map((n, i) => `<a href="#${n.id}" class="sidebar-link"><span class="sidebar-num">${String(i + 1).padStart(2, "0")}</span>${esc(n.label)}</a>`).join("\n      ")}
    </nav>
  </aside>

  <!-- Main content -->
  <main class="main">
    <!-- Hero -->
    <section class="page-hero">
      <h1>${esc(plan.title)}</h1>
      <p class="hero-subtitle">Prepared by i3media — ${new Date(plan.generatedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
    </section>

${s.executiveSummary ? renderExecutiveSummary(s.executiveSummary) : ""}
${s.strategyPlan ? renderStrategyPlan(s.strategyPlan) : ""}
${s.googleAdsCampaigns ? renderGoogleAdsCampaigns(s.googleAdsCampaigns) : ""}
${s.metaCampaigns?.length ? renderMetaCampaigns(s.metaCampaigns) : ""}
${s.keywordResearch ? renderKeywordResearch(s.keywordResearch) : ""}
${s.contentStrategy ? renderContentStrategy(s.contentStrategy) : ""}
${s.contentCalendar?.length ? renderContentCalendar(s.contentCalendar) : ""}
${s.organicSocial ? renderOrganicSocial(s.organicSocial) : ""}
${s.exampleArticles?.length ? renderExampleArticles(s.exampleArticles) : ""}
${s.servicesInvestment ? renderServicesInvestment(s.servicesInvestment) : ""}
${s.mediaPlan ? renderMediaPlan(s.mediaPlan) : ""}
${s.landingPage ? renderLandingPage(s.landingPage) : ""}

  </main>
</div>

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

// ─── Section renderers ──────────────────────────────────────────────────────

function renderExecutiveSummary(html: string): string {
  return `
    <section id="executive-summary" class="section">
      <h2 class="section-title">Executive Summary</h2>
      <div class="section-body">${html}</div>
    </section>`;
}

function renderStrategyPlan(html: string): string {
  return `
    <section id="strategy-plan" class="section">
      <h2 class="section-title">Strategy Plan</h2>
      <div class="section-body">${html}</div>
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

  const adGroupsHtml = (data.adGroups as { name: string; keywords: { keyword: string; matchType: string; volume?: number; cpc?: number }[]; adCopy?: { headlines: string[]; descriptions: string[]; sitelinks?: string[] } }[])
    .map((g, i) => {
      const kwRows = g.keywords
        .map((k) => {
          const display = k.matchType === "exact" ? `[${k.keyword}]` : k.matchType === "phrase" ? `"${k.keyword}"` : k.keyword;
          const badge = k.matchType === "exact" ? "match-exact" : k.matchType === "phrase" ? "match-phrase" : "match-broad";
          const badgeLabel = k.matchType === "exact" ? "Exact" : k.matchType === "phrase" ? "Phrase" : "Broad";
          return `<tr><td class="kw-text">${esc(display)}</td><td><span class="match-badge ${badge}">${badgeLabel}</span></td>${k.volume != null ? `<td class="kw-vol">${k.volume.toLocaleString()}</td>` : ""}</tr>`;
        })
        .join("\n");

      const adCopyHtml = g.adCopy ? (() => {
        const headlinesHtml = g.adCopy!.headlines
          .map((h, hi) => `<div class="headline-item"><span class="headline-num">${hi + 1}</span><span class="headline-text">${esc(h)}</span><button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(h)}')">Copy</button></div>`)
          .join("\n");
        const descriptionsHtml = g.adCopy!.descriptions
          .map((d, di) => `<div class="desc-item"><span class="headline-num">${di + 1}</span><span class="headline-text">${esc(d)}</span><button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(d)}')">Copy</button></div>`)
          .join("\n");
        const sitelinksHtml = (g.adCopy!.sitelinks ?? []).length > 0
          ? `<div class="sitelinks-section"><div class="ad-copy-label">Sitelinks</div><div class="sitelink-chips">${g.adCopy!.sitelinks!.map((s) => `<span class="sitelink-chip">${esc(s)}</span>`).join("")}</div></div>`
          : "";
        return `
        <div class="ad-copy-section">
          <div class="ad-copy-title">Ad Copy</div>
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
          <button class="copy-btn" onclick="copyAgKeywords(this)">Copy Keywords</button>
          ${adCopyHtml}
        </div>
      </div>`;
    })
    .join("\n");

  return `
    <section id="google-ads" class="section">
      <h2 class="section-title">Google Ads Campaigns</h2>
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
          `<div class="ad-creative">
            <span class="creative-format">${esc(cr.format)}</span>
            <p class="creative-headline">${esc(cr.headline)}</p>
            <p class="creative-text">${esc(cr.primaryText)}</p>
            <span class="creative-cta">${esc(cr.cta)}</span>
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
            <h4>${esc(c.campaignName)}</h4>
            <p class="meta-obj">${esc(c.objective)} · ${esc(c.budget)} · ${esc(c.placements)}</p>
          </div>
        </div>
        <div class="meta-campaign-body">
          <h5>Audience Targeting</h5>
          <div class="audience-list">${audiences}</div>
          <h5>Ad Creatives</h5>
          <div class="creatives-grid">${creatives}</div>
          <h5>Caption Copy Bank</h5>
          <div class="captions-list">${captions}</div>
          ${pillars ? `<h5>Content Pillars</h5><ul class="pillars-list">${pillars}</ul>` : ""}
        </div>
      </div>`;
    })
    .join("\n");

  return `
    <section id="meta-campaigns" class="section">
      <h2 class="section-title">Meta Campaigns</h2>
      <p class="section-intro">Facebook and Instagram campaign structures with audience targeting, ad creative, and caption banks.</p>
      ${campaignsHtml}
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderKeywordResearch(data: any): string {
  const groupsHtml = (data.adGroups as { name: string; keywords: { keyword: string; volume?: number; cpc?: number }[] }[])
    .map((g) => {
      const kwLines = g.keywords.map((k) => {
        const vol = k.volume != null ? ` <span class="kw-meta">${k.volume.toLocaleString()}/mo</span>` : "";
        return `<div class="kw-line"><span class="kw-word">${esc(k.keyword)}</span>${vol}<button class="copy-btn-sm" onclick="copySingle(this,'${escAttr(k.keyword)}')">Copy</button></div>`;
      }).join("\n");

      return `
      <div class="kw-group">
        <div class="kw-group-header">
          <h4>${esc(g.name)}</h4>
          <button class="copy-btn" onclick="copyGroupKws(this)">Copy All</button>
        </div>
        <div class="kw-line-list">${kwLines}</div>
      </div>`;
    })
    .join("\n");

  return `
    <section id="keyword-research" class="section">
      <h2 class="section-title">Keyword Research</h2>
      <p class="section-intro">Keywords organised by ad group. Use the copy buttons to export directly into Google Keyword Planner or Ads Editor.</p>
      ${groupsHtml}
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
      <h2 class="section-title">Content & SEO Strategy</h2>
      ${pageOptsHtml}
      ${landingsHtml}
      ${blogsHtml}
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
    <section id="content-calendar" class="section">
      <h2 class="section-title">Content Calendar</h2>
      <p class="section-intro">A 6-month publishing schedule across blog content and organic social, aligned to campaign focus periods.</p>
      <div class="calendar-grid">${monthsHtml}</div>
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
      <h2 class="section-title">Organic Social — Meta</h2>
      <p class="section-intro">Content pillars, posting frequency, and content type mix for Instagram and Facebook.</p>
      <div class="social-freq"><strong>Posting frequency:</strong> ${esc(data.postingFrequency ?? "")}</div>
      <h3>Content Mix</h3>
      <div class="mix-chart">${mixHtml}</div>
      <h3>Content Pillars</h3>
      <div class="pillars-grid">${pillarsHtml}</div>
      ${hashtags ? `<h3>Hashtag Strategy</h3><div class="hashtag-list">${hashtags}</div>` : ""}
    </section>`;
}

function renderExampleArticles(articles: { title: string; html: string }[]): string {
  const articlesHtml = articles
    .map((a, i) => `
    <div class="example-article">
      <div class="article-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="article-num">${i + 1}</span>
        <span class="article-title">${esc(a.title)}</span>
        <span class="article-badge">Example</span>
        <span class="ag-chevron">+</span>
      </div>
      <div class="article-body">${a.html}</div>
    </div>`)
    .join("\n");

  return `
    <section id="example-articles" class="section">
      <h2 class="section-title">Example Articles</h2>
      <p class="section-intro">These are example articles showing the quality and style of content this plan will deliver. Click to expand.</p>
      ${articlesHtml}
    </section>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderServicesInvestment(data: any): string {
  const servicesHtml = (data.services ?? [])
    .map((s: { name: string; description?: string; price?: string }) => `
    <div class="service-card">
      <h4>${esc(s.name)}</h4>
      ${s.description ? `<p>${esc(s.description)}</p>` : ""}
      ${s.price ? `<span class="service-price">${esc(s.price)}</span>` : ""}
    </div>`)
    .join("\n");

  const timelineHtml = (data.timeline ?? [])
    .map((t: { phase: string; items: string[] }) => `
    <div class="timeline-phase">
      <h4>${esc(t.phase)}</h4>
      <ul>${t.items.map((item: string) => `<li>${esc(item)}</li>`).join("\n")}</ul>
    </div>`)
    .join("\n");

  return `
    <section id="services" class="section">
      <h2 class="section-title">Services & Investment</h2>
      ${servicesHtml ? `<h3>Recommended Services</h3><div class="services-grid">${servicesHtml}</div>` : ""}
      ${timelineHtml ? `<h3>Timeline</h3><div class="timeline-list">${timelineHtml}</div>` : ""}
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
    <section id="media-plan" class="section">
      <h2 class="section-title">Media Plan</h2>
      <div class="media-summary">
        <div class="media-stat"><span class="media-label">Objective</span><span class="media-value">${esc(data.objective)}</span></div>
        <div class="media-stat"><span class="media-label">Total Budget</span><span class="media-value">£${data.totalBudget.toLocaleString()}</span></div>
      </div>
      <h3>Channel Allocation</h3>
      <div class="channel-chart">${channelsHtml}</div>
      ${tableRowsHtml ? `<table class="channel-table"><thead><tr><th>Channel</th><th>Budget</th><th>Split</th><th>Strategy</th></tr></thead><tbody>${tableRowsHtml}</tbody></table>` : ""}
    </section>`;
}

// ─── Landing Page ───────────────────────────────────────────────────────────

function renderLandingPage(data: { html: string; campaignType: string }): string {
  // Base64-encode the HTML so it can be loaded into a srcdoc iframe safely
  const encoded = Buffer.from(data.html, "utf-8").toString("base64");
  const typeLabel = data.campaignType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return `
    <section id="landing-page" class="section">
      <h2 class="section-title">Example Landing Page</h2>
      <div class="lp-meta">
        <span class="lp-badge">${esc(typeLabel)}</span>
        <span class="lp-hint">AI-generated from the client's actual website content and branding. This is a fully working page that can be deployed as-is or refined further.</span>
      </div>
      <div class="lp-frame-wrap">
        <div class="lp-toolbar">
          <span class="lp-dot"></span><span class="lp-dot"></span><span class="lp-dot"></span>
          <span class="lp-url-bar">landing-page-preview</span>
          <button class="lp-expand-btn" onclick="(function(el){var f=el.closest('.lp-frame-wrap');f.classList.toggle('lp-expanded')})(this)">⤢</button>
        </div>
        <iframe class="lp-iframe" srcdoc="" data-lp-html="${encoded}" sandbox="allow-scripts allow-same-origin" loading="lazy"></iframe>
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
:root{--bg:#f1f5f9;--white:#fff;--border:#e2e8f0;--text:#334155;--text-light:#64748b;--mid:#94a3b8;--heading:#0f172a;--accent:#0f172a}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;font-size:15px}
a{color:var(--accent);text-decoration:none}
.site-header{position:sticky;top:0;z-index:100;background:var(--heading);color:#fff;padding:0 24px;height:56px;display:flex;align-items:center}
.header-inner{display:flex;align-items:center;justify-content:space-between;max-width:1340px;width:100%;margin:0 auto}
.logo-area{display:flex;align-items:center;gap:12px}
.logo-area svg{height:28px;width:auto}
.header-sep{color:rgba(255,255,255,.3);font-size:18px}
.header-client{font-weight:600;font-size:14px;opacity:.9}
.header-meta{display:flex;align-items:center;gap:12px}
.header-badge{background:rgba(255,255,255,.15);padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.header-date{font-size:12px;opacity:.7}
.layout{display:flex;max-width:1340px;margin:0 auto;padding:24px;gap:24px}
.sidebar{width:220px;flex-shrink:0;position:sticky;top:80px;height:fit-content}
.sidebar-nav{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:2px}
.sidebar-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mid);margin-bottom:8px}
.sidebar-link{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:13px;color:var(--text-light);transition:all .15s}
.sidebar-link:hover{background:var(--bg);color:var(--heading)}
.sidebar-num{font-size:11px;font-weight:700;color:var(--mid);min-width:20px}
.main{flex:1;min-width:0;display:flex;flex-direction:column;gap:24px}
.page-hero{background:linear-gradient(135deg,#0f172a 0%,#1e293b 65%,#162040 100%);color:#fff;padding:48px 40px;border-radius:16px}
.page-hero h1{font-size:28px;font-weight:800;line-height:1.2;margin-bottom:8px}
.hero-subtitle{font-size:14px;opacity:.7}
.section{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:32px}
.section-title{font-size:20px;font-weight:800;color:var(--heading);margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid var(--border)}
.section-intro{color:var(--text-light);font-size:14px;margin-bottom:20px}
.section-body h3{font-size:17px;font-weight:700;color:var(--heading);margin:20px 0 8px}
.section-body h4{font-size:15px;font-weight:600;color:var(--heading);margin:16px 0 6px}
.section-body p{margin-bottom:12px}
.section-body ul,.section-body ol{margin:0 0 12px 20px}
.section-body li{margin-bottom:4px}
/* Campaign hero */
.campaign-hero{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;padding:20px 24px;border-radius:10px;margin-bottom:20px}
.campaign-hero h3{font-size:18px;font-weight:700;margin:0;color:#fff}
/* Overview grid */
.overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px}
.ov-item{background:var(--bg);padding:12px 16px;border-radius:8px}
.ov-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--mid);margin-bottom:2px}
.ov-value{font-size:14px;font-weight:600;color:var(--heading)}
/* Negative keywords */
.neg-section{margin-bottom:24px}
.neg-section h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:10px}
.neg-chip{display:inline-block;background:#fee2e2;color:#dc2626;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500;margin:3px 4px 3px 0}
/* Ad groups */
.ag-heading{font-size:17px;font-weight:700;color:var(--heading);margin-bottom:12px}
.ag-section{border:1px solid var(--border);border-radius:10px;margin-bottom:12px;overflow:hidden}
.ag-header{display:flex;align-items:center;gap:12px;padding:14px 18px;background:var(--bg);cursor:pointer;user-select:none}
.ag-num{width:28px;height:28px;border-radius:8px;background:var(--heading);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.ag-name{flex:1;font-weight:600;font-size:14px;color:var(--heading)}
.ag-count{font-size:12px;color:var(--mid)}
.ag-chevron{font-size:18px;color:var(--mid);transition:transform .2s}
.ag-section.open .ag-chevron{transform:rotate(45deg)}
.ag-body{display:none;padding:16px 18px;border-top:1px solid var(--border)}
.ag-section.open .ag-body{display:block}
/* Keyword table */
.kw-tbl{width:100%;border-collapse:collapse;font-size:13px}
.kw-tbl th{text-align:left;padding:8px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--mid);background:var(--bg);border-bottom:1px solid var(--border)}
.kw-tbl td{padding:8px 12px;border-bottom:1px solid var(--border)}
.kw-text{font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:13px}
.kw-vol{text-align:right;color:var(--text-light);font-size:12px}
.match-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.match-exact{background:#d1fae5;color:#065f46}
.match-phrase{background:#dbeafe;color:#1e40af}
.match-broad{background:#fef3c7;color:#92400e}
/* Copy buttons */
.copy-btn{margin-top:12px;padding:8px 16px;background:var(--heading);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:background .15s}
.copy-btn:hover{background:#1e293b}
.copy-btn-sm{padding:3px 10px;background:transparent;border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text-light);cursor:pointer;transition:all .15s}
.copy-btn-sm:hover{background:var(--bg)}
/* Keyword lines */
.kw-group{margin-bottom:20px}
.kw-group-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.kw-group-header h4{font-size:15px;font-weight:700;color:var(--heading)}
.kw-line-list{display:flex;flex-direction:column;gap:4px}
.kw-line{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg);border-radius:6px;font-size:13px}
.kw-word{flex:1;font-family:'SF Mono','Fira Code','Courier New',monospace}
.kw-meta{font-size:11px;color:var(--mid)}
/* Meta campaigns */
.meta-campaign{border:1px solid var(--border);border-radius:10px;margin-bottom:16px;overflow:hidden}
.meta-campaign-header{display:flex;align-items:center;gap:12px;padding:16px 20px;background:linear-gradient(135deg,#1877f2,#0f4c95);color:#fff}
.meta-num{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.meta-campaign-header h4{font-size:16px;font-weight:700;margin:0;color:#fff}
.meta-obj{font-size:12px;opacity:.8;margin-top:2px}
.meta-campaign-body{padding:20px}
.meta-campaign-body h5{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--mid);margin:16px 0 8px}
.meta-campaign-body h5:first-child{margin-top:0}
.audience-list{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.audience-chip{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500}
.audience-chip.interest{background:#dbeafe;color:#1e40af}
.audience-chip.custom{background:#ede9fe;color:#7c3aed}
.audience-chip.lookalike{background:#d1fae5;color:#065f46}
.creatives-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:12px}
.ad-creative{background:var(--bg);padding:16px;border-radius:8px}
.creative-format{display:inline-block;padding:2px 8px;background:var(--heading);color:#fff;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;margin-bottom:8px}
.creative-headline{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:4px}
.creative-text{font-size:13px;color:var(--text-light);margin-bottom:8px}
.creative-cta{display:inline-block;padding:4px 12px;background:var(--heading);color:#fff;border-radius:6px;font-size:12px;font-weight:600}
.captions-list{display:flex;flex-direction:column;gap:8px}
.caption-item{display:flex;align-items:flex-start;gap:12px;padding:10px 14px;background:var(--bg);border-radius:8px}
.caption-item p{flex:1;font-size:13px;margin:0}
.pillars-list{margin:0 0 12px 20px;font-size:14px}
.pillars-list li{margin-bottom:6px}
/* Content cards */
.content-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:24px}
.content-card{background:var(--bg);padding:14px 16px;border-radius:8px}
.content-url{font-size:12px;color:var(--text-light);font-family:'SF Mono','Fira Code','Courier New',monospace;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.content-title{font-size:14px;font-weight:600;color:var(--heading);margin-bottom:6px}
.content-kws{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.content-notes{font-size:13px;color:var(--text-light);margin-top:6px}
.kw-pill{display:inline-block;padding:2px 8px;background:var(--white);border:1px solid var(--border);border-radius:4px;font-size:11px;color:var(--text-light)}
.intent-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.intent-awareness,.intent-informational{background:#dbeafe;color:#1e40af}
.intent-commercial{background:#fef3c7;color:#92400e}
.intent-decision,.intent-transactional{background:#d1fae5;color:#065f46}
/* Content calendar */
.calendar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.cal-month{background:var(--bg);border-radius:10px;overflow:hidden}
.cal-month-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--heading);color:#fff}
.cal-month-header h4{font-size:14px;font-weight:700;margin:0;color:#fff}
.cal-focus{background:rgba(255,255,255,.15);padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600}
.cal-items{padding:12px 16px;display:flex;flex-direction:column;gap:6px}
.cal-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--white);border-radius:6px;font-size:13px}
.cal-type{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;padding:2px 6px;border-radius:4px;flex-shrink:0}
.cal-blog .cal-type{background:#dbeafe;color:#1e40af}
.cal-social .cal-type{background:#ede9fe;color:#7c3aed}
.cal-topic{flex:1}
.cal-platform{font-size:11px;color:var(--mid)}
/* Organic social */
.social-freq{background:var(--bg);padding:12px 16px;border-radius:8px;font-size:14px;margin-bottom:20px}
.mix-chart{display:flex;flex-direction:column;gap:8px;margin-bottom:24px}
.mix-item{display:flex;align-items:center;gap:12px}
.mix-type{width:80px;font-size:13px;font-weight:600;color:var(--heading);text-transform:capitalize}
.mix-bar{flex:1;height:24px;background:var(--bg);border-radius:6px;overflow:hidden}
.mix-fill{height:100%;background:linear-gradient(90deg,#0f172a,#334155);border-radius:6px;transition:width .5s}
.mix-pct{width:40px;text-align:right;font-size:13px;font-weight:600;color:var(--text-light)}
.pillars-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:20px}
.pillar-card{background:var(--bg);padding:16px;border-radius:10px}
.pillar-card h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:6px}
.pillar-card p{font-size:13px;color:var(--text-light);margin-bottom:10px}
.pillar-examples{display:flex;flex-direction:column;gap:4px}
.pillar-example{font-size:12px;color:var(--text);padding:6px 10px;background:var(--white);border-radius:6px;border-left:3px solid var(--heading)}
.hashtag-list{display:flex;flex-wrap:wrap;gap:6px}
.hashtag{display:inline-block;padding:4px 10px;background:var(--bg);border-radius:8px;font-size:13px;color:var(--text-light)}
/* Example articles */
.example-article{border:1px solid var(--border);border-radius:10px;margin-bottom:12px;overflow:hidden}
.article-header{display:flex;align-items:center;gap:12px;padding:14px 18px;background:var(--bg);cursor:pointer;user-select:none}
.article-num{width:28px;height:28px;border-radius:8px;background:var(--heading);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.article-title{flex:1;font-weight:600;font-size:14px;color:var(--heading)}
.article-badge{display:inline-block;padding:2px 10px;background:#fef3c7;color:#92400e;border-radius:12px;font-size:11px;font-weight:600}
.article-body{display:none;padding:24px;border-top:1px solid var(--border)}
.example-article.open .article-body{display:block}
.article-body h2{font-size:18px;font-weight:700;color:var(--heading);margin:20px 0 10px}
.article-body h3{font-size:15px;font-weight:600;color:var(--heading);margin:16px 0 8px}
.article-body p{margin-bottom:12px;line-height:1.7}
.article-body ul,.article-body ol{margin:0 0 12px 20px}
.article-body blockquote{border-left:3px solid var(--heading);padding:12px 16px;background:var(--bg);margin:16px 0;border-radius:0 8px 8px 0;font-style:italic}
/* Services */
.services-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-bottom:24px}
.service-card{background:var(--bg);padding:16px;border-radius:10px}
.service-card h4{font-size:14px;font-weight:700;color:var(--heading);margin-bottom:6px}
.service-card p{font-size:13px;color:var(--text-light);margin-bottom:8px}
.service-price{font-size:14px;font-weight:700;color:var(--heading)}
.timeline-list{display:flex;flex-direction:column;gap:16px}
.timeline-phase h4{font-size:15px;font-weight:700;color:var(--heading);margin-bottom:8px}
.timeline-phase ul{margin:0 0 0 20px;font-size:14px}
/* Media plan */
.media-summary{display:flex;gap:16px;margin-bottom:20px}
.media-stat{background:var(--bg);padding:16px;border-radius:8px;flex:1}
.media-label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--mid);margin-bottom:2px}
.media-value{font-size:18px;font-weight:700;color:var(--heading)}
.channel-chart{display:flex;flex-direction:column;gap:10px}
.channel-row{display:flex;align-items:center;gap:12px}
.channel-name{width:120px;font-size:13px;font-weight:600;color:var(--heading)}
.channel-bar{flex:1;height:28px;background:var(--bg);border-radius:6px;overflow:hidden}
.channel-fill{height:100%;background:linear-gradient(90deg,#0f172a,#334155);border-radius:6px}
.channel-budget{width:80px;text-align:right;font-size:13px;font-weight:600;color:var(--heading)}
.channel-pct{width:40px;text-align:right;font-size:12px;color:var(--mid)}
/* Watermark */
.watermark{position:fixed;bottom:16px;right:16px;font-size:11px;color:rgba(0,0,0,.08);font-weight:700;text-transform:uppercase;letter-spacing:2px;pointer-events:none;z-index:50}
/* Password gate */
.auth-gate{position:fixed;inset:0;z-index:9999;background:var(--heading);display:flex;align-items:center;justify-content:center;display:none}
.auth-box{background:var(--white);padding:40px;border-radius:16px;max-width:400px;width:90%;text-align:center}
.auth-box svg{height:32px;margin-bottom:20px}
.auth-box h2{font-size:16px;font-weight:700;color:var(--heading);margin-bottom:16px}
.auth-box input{width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;margin-bottom:12px}
.auth-box input:focus{outline:none;border-color:var(--heading);box-shadow:0 0 0 3px rgba(15,23,42,.1)}
.auth-box button{width:100%;padding:10px;background:var(--heading);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
.auth-box button:hover{background:#1e293b}
.auth-error{color:#dc2626;font-size:13px;margin-top:8px;min-height:20px}
/* Ad copy */
.ad-copy-section{margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}
.ad-copy-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--mid);margin-bottom:12px}
.ad-copy-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:8px}
.ad-copy-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:var(--mid);margin-bottom:8px;display:flex;align-items:center;gap:6px}
.ad-copy-count{background:var(--border);color:var(--text-light);border-radius:10px;padding:1px 7px;font-size:11px;font-weight:600}
.headlines-list,.descriptions-list{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.headline-item,.desc-item{display:flex;align-items:flex-start;gap:8px;padding:6px 10px;background:var(--bg);border-radius:6px;font-size:13px}
.headline-num{font-size:11px;font-weight:700;color:var(--mid);min-width:18px;margin-top:1px;flex-shrink:0}
.headline-text{flex:1;color:var(--heading);line-height:1.4}
.desc-item .headline-text{color:var(--text);font-size:12px}
.sitelinks-section{margin-top:12px}
.sitelink-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.sitelink-chip{display:inline-block;padding:4px 12px;background:#dbeafe;color:#1e40af;border-radius:12px;font-size:12px;font-weight:500}
/* Media plan table */
.channel-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
.channel-table th{text-align:left;padding:8px 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--mid);background:var(--bg);border-bottom:1px solid var(--border)}
.channel-table td{padding:8px 12px;border-bottom:1px solid var(--border);vertical-align:top}
.channel-table tr:last-child td{border-bottom:none}
.channel-strategy{color:var(--text-light);font-size:12px;line-height:1.5}
/* Landing page preview */
.lp-meta{display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.lp-badge{background:#dbeafe;color:#1e40af;font-size:11px;font-weight:600;padding:3px 10px;border-radius:12px;white-space:nowrap}
.lp-hint{font-size:13px;color:var(--text-light);line-height:1.5}
.lp-frame-wrap{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#1e293b;transition:all .3s}
.lp-frame-wrap.lp-expanded{position:fixed;inset:0;z-index:200;border-radius:0;border:none}
.lp-toolbar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:#1e293b}
.lp-dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.15)}
.lp-dot:first-child{background:#ff5f57}.lp-dot:nth-child(2){background:#ffbd2e}.lp-dot:nth-child(3){background:#28c840}
.lp-url-bar{flex:1;background:rgba(255,255,255,.1);border-radius:6px;padding:4px 12px;font-size:11px;color:rgba(255,255,255,.5);font-family:monospace}
.lp-expand-btn{background:none;border:none;color:rgba(255,255,255,.5);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;transition:all .15s}
.lp-expand-btn:hover{color:#fff;background:rgba(255,255,255,.1)}
.lp-iframe{width:100%;height:700px;border:none;background:#fff}
.lp-frame-wrap.lp-expanded .lp-iframe{height:calc(100vh - 42px)}
/* Responsive */
@media(max-width:900px){.layout{flex-direction:column}.sidebar{width:100%;position:static}.sidebar-nav{flex-direction:row;flex-wrap:wrap;gap:4px}.sidebar-link{padding:6px 10px;font-size:12px}.ad-copy-cols{grid-template-columns:1fr}}
@media(max-width:640px){.page-hero{padding:32px 24px}.page-hero h1{font-size:22px}.section{padding:20px}.overview-grid{grid-template-columns:1fr 1fr}.content-cards{grid-template-columns:1fr}.creatives-grid{grid-template-columns:1fr}}
/* Print */
@media print{
  .site-header,.sidebar,.watermark,.auth-gate,.copy-btn,.copy-btn-sm{display:none!important}
  .layout{padding:0;max-width:100%;display:block}
  .main{width:100%}
  .section{border:none;border-radius:0;padding:16px 0;break-inside:avoid;page-break-inside:avoid}
  .section-title{border-bottom:2px solid #e2e8f0}
  .ag-body{display:block!important}
  .article-body{display:block!important}
  .page-hero{border-radius:0}
  body{font-size:12px}
}
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
document.querySelectorAll('.sidebar-link').forEach(function(link){
  link.addEventListener('click',function(e){
    e.preventDefault();
    var target=document.querySelector(this.getAttribute('href'));
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  });
});

// Decode and inject landing page iframe content
document.querySelectorAll('.lp-iframe[data-lp-html]').forEach(function(iframe){
  try{
    var encoded=iframe.getAttribute('data-lp-html');
    if(encoded){iframe.srcdoc=atob(encoded);}
  }catch(e){console.error('LP decode error:',e);}
});
`;

// ─── i3media logo SVG ───────────────────────────────────────────────────────

const I3_LOGO_SVG = `<svg viewBox="0 0 161 53" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M26.0013 0.853516C11.6416 0.853516 0 12.4951 0 26.8548C0 41.2145 11.6416 52.856 26.0013 52.856C40.361 52.856 52.0025 41.2145 52.0025 26.8548C52.0025 12.4951 40.361 0.853516 26.0013 0.853516ZM26.0013 45.4757C15.7231 45.4757 7.38032 37.1329 7.38032 26.8548C7.38032 16.5766 15.7231 8.23384 26.0013 8.23384C36.2794 8.23384 44.6222 16.5766 44.6222 26.8548C44.6222 37.1329 36.2794 45.4757 26.0013 45.4757Z" fill="currentColor"/>
<path d="M26.0013 15.6142C19.7945 15.6142 14.7606 20.648 14.7606 26.8548C14.7606 33.0616 19.7945 38.0955 26.0013 38.0955C32.208 38.0955 37.2419 33.0616 37.2419 26.8548C37.2419 20.648 32.208 15.6142 26.0013 15.6142Z" fill="currentColor"/>
<path d="M68.8833 11.5438C68.8833 9.52217 70.4915 7.91406 72.5131 7.91406C74.5348 7.91406 76.1429 9.52217 76.1429 11.5438C76.1429 13.5655 74.5348 15.1736 72.5131 15.1736C70.4915 15.1736 68.8833 13.5655 68.8833 11.5438Z" fill="currentColor"/>
<path d="M69.3369 18.1265H75.7009V42.8877H69.3369V18.1265Z" fill="currentColor"/>
<path d="M97.2753 25.1836C97.2753 21.2098 94.8107 18.8018 91.6697 18.8018C89.0765 18.8018 86.8555 20.6364 85.8147 22.656V18.1265H79.4508V42.8877H85.8147V29.7822C85.8147 26.2616 87.708 24.7482 89.8561 24.7482C91.7909 24.7482 93.0185 26.0917 93.0185 28.7435V42.8877H99.3825V28.1582C102.28 22.3614 105.671 24.1034 107.178 24.805V18.1265C102.787 16.9175 100.243 20.5777 99.3825 22.656C99.0168 20.0173 98.3862 18.1265 95.0581 18.1265H94.751C93.2955 18.1265 91.5423 18.8297 90.2012 20.0173" fill="currentColor"/>
<path d="M119.506 17.666C112.924 17.666 108.386 22.7197 108.386 30.5071C108.386 38.4199 112.924 43.3483 119.506 43.3483C123.359 43.3483 126.384 41.6312 128.178 38.9196L123.542 35.9549C122.573 37.4735 121.223 38.2317 119.506 38.2317C116.95 38.2317 115.162 36.4534 114.776 33.1256H129.234C129.359 32.2531 129.422 31.3828 129.422 30.5071C129.422 22.7197 125.088 17.666 119.506 17.666ZM114.838 28.5C115.286 25.3543 116.95 23.0838 119.506 23.0838C121.893 23.0838 123.542 25.2952 123.788 28.5H114.838Z" fill="currentColor"/>
<path d="M147.082 7.91406H140.718V42.8877H147.082V38.1125C148.559 41.1956 151.399 43.3483 155.025 43.3483C160.428 43.3483 164.715 38.2317 164.715 30.5071C164.715 22.7825 160.428 17.666 155.025 17.666C151.399 17.666 148.559 19.8187 147.082 22.9017V7.91406ZM147.082 30.5071C147.082 26.4131 149.302 23.5121 152.436 23.5121C155.685 23.5121 157.974 26.3543 157.974 30.5071C157.974 34.6599 155.685 37.5021 152.436 37.5021C149.302 37.5021 147.082 34.601 147.082 30.5071Z" fill="currentColor"/>
</svg>`;
