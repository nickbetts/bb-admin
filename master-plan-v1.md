# 🧠 Master Plan — i3media Report Platform

> **The definitive source of truth for what exists, what's missing, what's broken, and what's possible.**
>
> This document consolidates a deep codebase audit of every dashboard tab, API endpoint, AI feature, and report section — then cross-references against `ROADY_WOADY.md` (strategic roadmap) and `ai_audit.md` (AI technical audit) to produce one canonical list of gaps, fixes, and opportunities.
>
> *Generated: April 2026 — based on full codebase analysis*

---

## Table of Contents

1. [Dashboard Tab Audit](#1-dashboard-tab-audit)
2. [Report Section Mapping & Gaps](#2-report-section-mapping--gaps)
3. [AI Capability Audit](#3-ai-capability-audit)
4. [Cross-Reference: ROADY_WOADY.md](#4-cross-reference-roady_woadymd)
5. [Cross-Reference: ai_audit.md](#5-cross-reference-ai_auditmd)
6. [Consolidated Gap Register](#6-consolidated-gap-register)
7. [New Opportunities Not in Either Document](#7-new-opportunities-not-in-either-document)
8. [Fixes Required (Bugs / Structural Issues)](#8-fixes-required-bugs--structural-issues)
9. [Prioritised Action Plan](#9-prioritised-action-plan)

---

## 1. Dashboard Tab Audit

The client dashboard (`ClientDashboard.tsx`) renders up to **21 tabs**, conditionally based on connected integrations. Below is a per-tab deep audit.

### 1.1 Signals (`SignalsSection.tsx` — 1,252 lines)

| Attribute | Detail |
|---|---|
| **Always visible** | ✅ Yes |
| **Data sources** | GA4, Google Ads, Meta, Search Console, SemRush — all via `/api/ai/summary` |
| **What it does** | Aggregates anomalies and AI signals across all connected platforms into a unified feed. Computed threshold-based signals + AI-generated signals. Severity filtering (High/Medium/Low), source filtering (Computed/AI), platform filtering. Deduplication logic merges same issue across platforms. |
| **AI features** | AI signal generation via `/api/ai/summary` per platform, severity assessment, recommendation generation |
| **In reports?** | ❌ No — no `signals` section type exists in `report-blocks.ts` |
| **What's missing** | No predictive/proactive alerting. Thresholds hardcoded (not user-configurable). Signal history not persisted/archived. No notification/action workflow from signals (e.g. "create action from this signal"). Only covers GA4, Google Ads, Meta, Search Console, SemRush — **missing TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail**. |
| **What's possible** | User-configurable alert thresholds per metric. Signal persistence for trend analysis ("this metric has anomalied 4 times in 6 months"). One-click "Create Action" from any signal. Push notification integration for high-severity signals. Expand platform coverage to all 15 channels. Predictive signals using forecast data ("ROAS trending toward breach of target"). |

### 1.2 Overview (`OverviewSection.tsx` — 1,659 lines)

| Attribute | Detail |
|---|---|
| **Always visible** | ✅ Yes |
| **Data sources** | GA4, Google Ads, Meta, Search Console, SemRush, `/api/cross/keyword-overlap`, `/api/ai/overview-narrative` |
| **What it does** | Cross-platform aggregation dashboard. Full-Funnel Board, Paid Performance KPIs, Website & Organic KPIs, Engagement & Conversion KPIs, Channel Efficiency Matrix (spend vs ROAS scatter), Cross-Platform Alerts. Top campaigns across platforms. |
| **AI features** | SuperSummary narrative, `/api/ai/overview-narrative` with optional web search, cross-platform anomaly detection, budget advisor recommendations |
| **In reports?** | ✅ Yes — `overview` section with 6 blocks (funnel, paid_kpis, website_kpis, engagement_kpis, channel_matrix, alerts) |
| **What's missing** | Only aggregates GA4 + Google Ads + Meta + Search Console + SemRush — **missing TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, E-commerce**. Blended totals assembled on frontend (incomplete if tabs not loaded — RT-10). No multi-touch attribution shown in overview. No customer journey visualisation. No cohort analysis. |
| **What's possible** | Include all 15 channels in aggregation. Server-side blended totals from ApiCache. Full customer journey funnel visualisation. Attribution model comparison widget. Revenue waterfall chart (total revenue → channel contributions). Goal progress summary badges. Competitor positioning widget. |

### 1.3 SEO / SemRush (`SemrushSection.tsx` — 1,029 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.semrushDomain` |
| **Data sources** | `/api/semrush` (9 types: overview, keywords, rank_movers, history, distribution, competitors, backlinks, ai-visibility, project-keywords), `/api/seo/domain-authority` |
| **What it does** | Organic traffic metrics, tracked keyword positions, top keywords with position/volume/traffic%, keyword rank improvers/decliners, ranking distribution chart, competitor landscape, backlink data, domain authority (DA/PA/spam score), AI visibility score, Share of Voice. |
| **AI features** | AiInsightsPanel, SuperSummary, ShareOfVoicePanel, AI visibility scoring |
| **In reports?** | ✅ Yes — `seo` section with 9 blocks (kpis, secondary_kpis, ranking_distribution, top_keywords, rank_improvers, tracked_keywords, backlinks, ai_visibility, competitors) |
| **What's missing** | No technical SEO audit (crawl errors, indexation issues). No content gap analysis. Backlink anchor text distribution not shown. No search intent categorisation for keywords. No SERP feature tracking (featured snippets, knowledge panels, People Also Ask). |
| **What's possible** | Technical SEO audit integration (crawl errors, robots.txt issues, sitemap health). Content gap analysis (keywords competitors rank for that you don't). SERP feature tracking. Search intent classification per keyword (informational/transactional/navigational). Topical authority mapping. Internal linking analysis. Cannibalisation alerts linked to Search Console data. |

### 1.4 Web Analytics / GA4 (`GA4Section.tsx` — 943 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.ga4PropertyId` |
| **Data sources** | `/api/ga4` (12 types: overview, daily, sources, pages, geography, devices, organic-overview, new-vs-returning, demographics, conversion-events, conversions-by-channel, ai-referrals) |
| **What it does** | Sessions, users, pageviews, bounce rate, avg duration, conversion rate, engagement rate. Daily trends. Traffic sources. Top pages. Device/geo breakdown. Demographics (age/gender). Conversion events. Conversions by channel. AI search referrals. YoY comparison. Organic-only mode toggle. |
| **AI features** | AiInsightsPanel (all metrics), SuperSummary, onMetricsReady + onPreviousMetricsReady callbacks for cross-platform AI |
| **In reports?** | ✅ Yes — `web` section with 12 blocks (kpis, secondary_kpis, chart, traffic_sources, top_pages, devices, countries, new_vs_returning, demographics, conversion_events, conversions_by_channel, ai_referrals) |
| **What's missing** | E-commerce event detail limited. Custom event tracking not surfaced. No audience segmentation UI. No attribution modelling view. No funnel visualisation (user journeys). No cohort retention analysis. No real-time view. |
| **What's possible** | Funnel visualisation for key conversion paths. Audience segment comparison. Cohort analysis (retention curves). Custom event explorer. Landing page performance with bounce/conversion per page. Exit page analysis. Content grouping performance. GA4 Explorations-style ad-hoc analysis. |

### 1.5 Search Console (`SearchConsoleSection.tsx` — 890 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.searchConsoleSiteUrl` |
| **Data sources** | `/api/search-console`, `/api/cross/keyword-overlap` (paid/organic overlap) |
| **What it does** | Clicks, impressions, CTR, avg position. Top queries with movement indicators. Top pages. Position movers (improvers/decliners). Device breakdown. Geographic distribution. Keyword cannibalisation matrix. Paid/organic keyword overlap. |
| **AI features** | AiInsightsPanel, SuperSummary, cannibalisation recommendations |
| **In reports?** | ✅ Yes — `searchconsole` section with 8 blocks (kpis, chart, top_queries, top_pages, position_movers, devices, countries, cannibalisation) |
| **What's missing** | No search intent classification. No SERP feature data (rich results, FAQ, video). No mobile usability issues. Core Web Vitals not cross-referenced. No page-level indexation status. |
| **What's possible** | Search intent tagging per query. SERP feature tracking (what features your pages trigger). Cross-reference with CWV data for page-level health. Index coverage monitoring. Click-through rate optimisation suggestions per query. Query clustering (group related queries by topic). |

### 1.6 Paid Social / Meta (`MetaSection.tsx` — 1,301 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.metaAccountId` |
| **Data sources** | `/api/meta`, `/api/meta/video`, `/api/ai/summary`, `/api/ai/snapshots` |
| **What it does** | Spend, impressions, clicks, conversions, conversion value, reach, frequency. Campaign table with objectives/bidding. Ad set table with audience targeting. Creative library with thumbnail preview + metrics. Landing page performance. Video performance. Click fraud panel. Daily trends. Anomaly alerts. |
| **AI features** | AiInsightsPanel, SuperSummary, CreativeIntelligencePanel, ClickFraudPanel, AiLandingPageAnalysis, snapshots for longitudinal analysis |
| **In reports?** | ✅ Yes — `paid_social` section with 4 blocks (kpis, chart, campaigns, click_fraud) |
| **What's missing** | No audience composition demographics detailed (age×gender data exists in `getMetaAudienceDemographics()` but only passed to overview-narrative, not to AiInsightsPanel — RT-20). No placement breakdown (Instagram/Facebook/Audience Network/Messenger). No dynamic creative optimisation metrics. No A/B test results aggregation. No frequency capping analysis. No video-specific metrics in Creative Intelligence (thumb-stop rate, 3-sec view rate — RT-16). |
| **What's possible** | Placement-level performance breakdown. Audience demographic heatmap. Creative fatigue detection (frequency vs performance curve). A/B test winner analysis. Lookalike audience performance comparison. Ad format performance comparison (carousel vs video vs single image). Dynamic creative element performance. Frequency cap optimisation recommendations. |

### 1.7 Paid Search / Google Ads (`GoogleAdsSection.tsx` — 1,026 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.googleAdsCustomerId` |
| **Data sources** | `/api/google-ads` (overview, daily, campaigns with bid strategy/budget/IS data, ad groups, keywords, search terms, landing pages), `/api/ai/summary`, `/api/ai/snapshots` |
| **What it does** | Clicks, cost, impressions, CTR, CPC, conversions, ROAS, CPA. Daily trend. Campaign table enriched with bid strategy, budget, impression share lost (budget + rank). Ad group breakdown. Keywords/search terms. Landing page performance. Click fraud. Anomaly detection (budget lost IS > 10-30%, rank lost > 15-40%, low ROAS < 1.0). |
| **AI features** | AiInsightsPanel, SuperSummary, CreativeIntelligencePanel, ClickFraudPanel, AiLandingPageAnalysis, automated anomaly alerts |
| **In reports?** | ✅ Yes — `googleads` section with 5 blocks (kpis, chart, campaigns, ad_groups, click_fraud) |
| **What's missing** | Quality Score not shown. Bid simulator data not available. Location/device bid modifiers not displayed. Asset (formerly extension) performance not tracked. Audience segment performance missing. No negative keyword management view. Search term mining recommendations not surfaced. |
| **What's possible** | Quality Score tracking with historical trend. Bid simulator integration for "what if" scenarios. Search term → negative keyword recommendations. Asset/extension performance dashboard. Audience segment comparison. Geographic bid modifier recommendations. Device performance analysis with bid adjustment suggestions. Shopping campaign product-level data. Performance Max insights. |

### 1.8 TikTok Ads (`TikTokSection.tsx` — 195 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.tiktokAdvertiserId` |
| **Data sources** | `/api/tiktok` |
| **What it does** | Spend, impressions, clicks, CTR, CPC, CPM, conversions, cost/conversion, video views, reach, frequency. Campaign table (name, spend, impressions, clicks, conversions, video views). |
| **AI features** | AiInsightsPanel only |
| **In reports?** | ❌ No — no `tiktok` section type in report-blocks.ts |
| **What's missing** | No SuperSummary (RT-07). No creative asset data. No audience targeting metrics. No video engagement metrics (likes, comments, shares, completion rates — RT-16). No TikTok Shop integration. No daily trend chart. No campaign-level detail expansion. Very thin section (195 lines vs 1,301 for Meta). No TikTok-specific creative analysis (RT-17). |
| **What's possible** | Full feature parity with MetaSection (daily charts, ad group breakdown, creative library). Video-specific metrics (hook rate, thumb-stop, completion rate). TikTok Shop integration for e-commerce clients. Spark Ads tracking. Sound/music trend analysis. Creative fatigue scoring. Audience interest breakdown. |

### 1.9 Microsoft Ads (`MicrosoftAdsSection.tsx` — 194 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.microsoftAdsAccountId` |
| **Data sources** | `/api/microsoft-ads` |
| **What it does** | Spend, impressions, clicks, CTR, CPC, conversions, revenue, ROAS, cost/conversion, impression share %. Campaign table (name, status, spend, clicks, CTR, conversions, revenue, ROAS). |
| **AI features** | AiInsightsPanel only |
| **In reports?** | ❌ No — no `microsoft_ads` section type in report-blocks.ts |
| **What's missing** | No SuperSummary (RT-07). No daily trend chart. No ad group breakdown. No keyword/search term data. No landing page performance. No click fraud panel. Very thin section. No impression share lost breakdown (budget vs rank). |
| **What's possible** | Feature parity with GoogleAdsSection (daily charts, ad groups, keywords, search terms, landing pages). Impression share analysis (budget lost vs rank lost). Shopping campaign support. Audience network breakdown. LinkedIn profile targeting performance (unique to Microsoft Ads). |

### 1.10 E-Commerce (`EcommerceSection.tsx` — 213 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires WooCommerce or Shopify configured |
| **Data sources** | `/api/shopify` or `/api/woocommerce` |
| **What it does** | Total revenue, total orders, AOV. Revenue over time chart. Top products table. Orders by status chart. Blended revenue reconciliation panel (compares with GA4 data). |
| **AI features** | BlendedRevenuePanel only — **no AiInsightsPanel (RT-05)** |
| **In reports?** | ✅ Yes — `ecommerce` section with 4 blocks (kpis, chart, top_products, order_status) |
| **What's missing** | **No AiInsightsPanel despite persona existing in summary endpoint (RT-05)**. No product-level profitability. No customer lifetime value. No cart abandonment tracking. No refund/chargeback data. No repeat purchase rate. No customer segmentation (new vs returning buyers). No product category performance. No coupon/discount analysis. |
| **What's possible** | Full AiInsightsPanel integration (quick win). Product performance matrix (revenue × margin). Customer cohort analysis. Cart abandonment funnel. Refund tracking. Average order frequency. Product bundling recommendations. Inventory velocity alerts. Seasonal product demand forecasting. Cross-sell/upsell recommendations from AI. |

### 1.11 Core Web Vitals (`CoreWebVitalsSection.tsx` — 191 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.cwvUrl` or `client.website` |
| **Data sources** | `/api/cwv` (CrUX API) |
| **What it does** | LCP, CLS, INP, TTFB, FCP, FID. Each metric shows p75 value, good/needs-improvement/poor distribution bars, description. Overall category assessment. |
| **AI features** | ❌ None |
| **In reports?** | ❌ No — no `core_web_vitals` section type in report-blocks.ts |
| **What's missing** | **No AI features at all**. No historical trend data. No page-level breakdown (only site-level). No device-specific segmentation (mobile vs desktop). No Lighthouse lab data. No optimisation recommendations. No comparison with competitors. |
| **What's possible** | Historical CWV trend tracking (store weekly snapshots). Page-level CWV breakdown. Mobile vs desktop comparison. Competitor CWV comparison. AI-powered optimisation recommendations ("LCP is 3.2s — likely caused by unoptimised hero image"). Integration with GA4 bounce rate data ("pages with poor CWV have 40% higher bounce rate"). Lighthouse audit integration. Report section for client reporting. |

### 1.12 LinkedIn Ads (`LinkedInSection.tsx` — 192 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.linkedinAccountId` |
| **Data sources** | `/api/linkedin` |
| **What it does** | Impressions, clicks, spend, conversions, reach, CTR, CPC, CPL. Campaign breakdown (top 20). |
| **AI features** | AiInsightsPanel only |
| **In reports?** | ❌ No — no `linkedin` section type in report-blocks.ts |
| **What's missing** | No SuperSummary (RT-07). No daily trend chart. No audience targeting details. No content engagement metrics. No lead form data integration. No follower/company page metrics. Very thin section. No creative performance data. |
| **What's possible** | Full campaign detail with audience targeting info. Lead gen form performance dashboard. Company page analytics (followers, engagement). Content performance by format (single image, carousel, video, document). ABM (Account-Based Marketing) audience insights. Industry/company size/seniority breakdown of engagers. |

### 1.13 Email / Klaviyo (`KlaviyoSection.tsx` — 179 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.klaviyoApiKey` |
| **Data sources** | `/api/klaviyo` — **does not use date range parameters** |
| **What it does** | Total sends, opens, clicks, revenue, open rate, click rate, campaign count. Recent campaigns table (top 20). |
| **AI features** | AiInsightsPanel only |
| **In reports?** | ❌ No — no `klaviyo` section type in report-blocks.ts |
| **What's missing** | **No date range filtering** — always shows all-time data. No SuperSummary (RT-07). No list/segment performance. No subscriber metrics (growth, churn, engagement health). No A/B test results. No automation/flow performance. No SMS metrics. No revenue attribution per campaign. |
| **What's possible** | Date range filtering for campaigns. Subscriber growth tracking. List health metrics (engagement rate, bounce rate, unsubscribe rate). Flow/automation performance dashboard. SMS campaign metrics. Revenue per email/send. A/B test analysis. Customer segment performance comparison. Predicted CLV from email engagement. Campaign scheduling calendar view. |

### 1.14 Goals & KPIs (`GoalsSection.tsx` — 413 lines)

| Attribute | Detail |
|---|---|
| **Always visible** | ✅ Yes |
| **Data sources** | `/api/clients/{id}/goals`, `/api/ai/goal-benchmark` |
| **What it does** | Goal progress cards with visual bar, status (Active/Achieved/At Risk/Off Track). Filters by status. AI benchmark suggestions (conservative/moderate/aggressive targets with confidence). CRUD for goals. Supports metrics: roas, revenue, conversions, organic_sessions, sessions, impressions, clicks, ctr, cpa, spend, leads, keyword_rankings. |
| **AI features** | AI goal benchmark suggestions (3 tiers with confidence % and rationale) |
| **In reports?** | ❌ Not as a standalone section — but goal progress is referenced in AI commentary (report-commentary, executive-summary, overview-narrative) |
| **What's missing** | No automated goal tracking (manual currentValue updates). Cross-channel goal dependencies not modelled. No milestone tracking. No goal weighting/prioritisation. No "days to target" projection. No goal history/versioning. |
| **What's possible** | Auto-populate currentValue from latest MetricSnapshot data. Goal progress sparkline charts. "Days to target at current trajectory" calculation. Milestone sub-goals. Goal dependency mapping ("to hit ROAS 4x, CPA must drop below £15"). Goal-centric dashboard view (like OKR tools). Historical goal performance (hit rate). Report section showing goal progress summary. |

### 1.15 HubSpot CRM (`HubSpotSection.tsx` — 146 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.hubspotAccessToken` |
| **Data sources** | `/api/hubspot` |
| **What it does** | Total contacts, open deals, pipeline value, closed won value. Recent deals table (name, amount, stage, close date). |
| **AI features** | AiInsightsPanel (summary metrics only) |
| **In reports?** | ❌ No — no `hubspot` section type in report-blocks.ts |
| **What's missing** | No SuperSummary (RT-07). Contact list data fetched but not passed to AI. No deal progression velocity. No sales cycle analysis. No custom properties. No activity/timeline view. No pipeline stage funnel visualisation. Very thin section (146 lines). |
| **What's possible** | Full pipeline funnel visualisation. Deal velocity metrics (avg days per stage). Win rate by source/channel. Contact lifecycle stage breakdown. Lead-to-customer conversion funnel. Revenue attribution by marketing source. Activity timeline view. Custom property reporting. Sales forecast based on pipeline. Integration with Goals (e.g., "MQL target: 50/month, current: 38"). |

### 1.16 YouTube (`YouTubeSection.tsx` — 158 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.youtubeChannelId` |
| **Data sources** | `/api/youtube` |
| **What it does** | Channel info (title, subscribers, video count). Views, watch time, new subscribers, avg view duration, CTR. Top videos table (title, views, likes, CTR, duration). |
| **AI features** | AiInsightsPanel (analytics metrics only — video data not fully passed) |
| **In reports?** | ❌ No — no `youtube` section type in report-blocks.ts |
| **What's missing** | No SuperSummary (RT-07). Video data not fully passed to AI. No playlist performance. No audience demographics. No revenue/monetisation data. No community post engagement. No traffic source breakdown. No subscriber growth trend. Very thin section. |
| **What's possible** | Video performance trend charts. Audience retention curves. Traffic source analysis (search, suggested, external, browse). Subscriber growth tracking. Playlist performance grouping. Content type analysis (shorts vs long-form vs live). Comment sentiment analysis. Thumbnail CTR optimisation suggestions. Upload cadence vs growth analysis. |

### 1.17 CallRail (`CallRailSection.tsx` — 173 lines)

| Attribute | Detail |
|---|---|
| **Conditional** | Requires `client.callrailAccountId` |
| **Data sources** | `/api/callrail` |
| **What it does** | Total calls, answered %, missed calls, avg duration. Calls by source (stacked bar). Recent calls table (caller #, direction, source, duration, status, time). |
| **AI features** | AiInsightsPanel (summary metrics only) |
| **In reports?** | ❌ No — no `callrail` section type in report-blocks.ts |
| **What's missing** | No SuperSummary (RT-07). No call recordings. No transcription/sentiment analysis. No lead quality scoring. No call attribution to specific campaigns. No time-of-day analysis. No first-time vs repeat caller tracking. |
| **What's possible** | Call attribution to specific campaigns/keywords. Time-of-day/day-of-week heatmap. First-time vs repeat caller analysis. Call outcome tracking (qualified lead/appointment set/sale). Integration with HubSpot (calls → deals). Average handle time trends. Missed call recovery workflow. Call quality scoring. Report section for call tracking metrics. |

### 1.18 Competitors (`CompetitorIntelligenceSection.tsx` — 112 lines)

| Attribute | Detail |
|---|---|
| **Always visible** | ✅ Yes |
| **Data sources** | `/api/competitor-intelligence/{clientId}` |
| **What it does** | Top 3 latest competitor snapshots per domain. Key metrics (organic traffic, keywords, backlinks). Refresh button. Link to full competitor tool. |
| **AI features** | ❌ None in dashboard (full AI analysis exists in competitor intelligence tool) |
| **In reports?** | ❌ No — no `competitor_intelligence` section type in report-blocks.ts |
| **What's missing** | Only shows preview — full analysis requires navigating away. No trend data. No benchmark positioning. No AI analysis in dashboard view. |
| **What's possible** | Inline competitor comparison charts. Historical trend tracking. Competitive positioning matrix. Share of voice comparison. Competitive content gap analysis. Report section for competitive landscape. |

### 1.19 Actions (`ActionsSection.tsx` — ~80 lines)

| Attribute | Detail |
|---|---|
| **Always visible** | ✅ Yes |
| **Data sources** | `/api/clients/{id}/actions` |
| **What it does** | CRUD for action items with title, description, status (open/in_progress/completed/cancelled), priority (urgent/high/medium/low), due date. |
| **AI features** | ❌ None |
| **In reports?** | ❌ No |
| **What's missing** | No AI-generated action recommendations. No team assignment/collaboration. No link from signals/anomalies to actions. No impact tracking (what happened after action was completed). |
| **What's possible** | AI-suggested actions from anomaly detection ("Budget lost impression share high on Campaign X → Recommended action: Increase daily budget by 15%"). Auto-create actions from signals. Impact measurement (before/after metrics). Team assignment with notification. Action completion velocity metrics. Report section showing completed actions and their impact. |

### 1.20 Communications (`CommunicationsSection.tsx` — 273 lines)

| Attribute | Detail |
|---|---|
| **Always visible** | ✅ Yes |
| **Data sources** | `/api/clients/{id}/communications`, `/api/clients/{id}/sync-emails` |
| **What it does** | Communication feed — email, call, meeting, note, report_share, proposal_share. MS365 sync. Direction badges (inbound/outbound). Chronological list. |
| **AI features** | ❌ None |
| **In reports?** | ❌ No |
| **What's missing** | No AI sentiment analysis on communications. No action item extraction from emails/meeting notes. No communication summary/digest. No thread grouping. |
| **What's possible** | AI communication digest ("3 emails this week — client expressed concern about Meta ROAS, requested strategy call"). Sentiment tracking over time. Automated action item extraction from meeting notes. Communication cadence alerts ("no client contact in 14 days"). Client health signal integration. |

### 1.21 Strategy (Strategy Document)

| Attribute | Detail |
|---|---|
| **Always visible** | ✅ Yes |
| **Data sources** | `/api/ai/strategy-document` |
| **What it does** | AI-generated quarterly/annual strategy documents. Supports web search for market context. SSE streaming. |
| **AI features** | Full — uses gpt-4o with web search, longest/most complex AI output |
| **In reports?** | ❌ Not directly — strategy docs are standalone documents, not report sections |
| **What's missing** | Generated on-demand, not persisted for comparison. No version history. No collaborative editing. |
| **What's possible** | Strategy document versioning and comparison. Template system for different strategy types. Collaborative review/approval workflow. Strategy → actions pipeline. Quarterly strategy review cycle automation. |

---

## 2. Report Section Mapping & Gaps

### Currently Supported Report Sections

| Report Section | Dashboard Source | Blocks | AI Commentary |
|---|---|---|---|
| `overview` | OverviewSection | 6 (funnel, paid_kpis, website_kpis, engagement_kpis, channel_matrix, alerts) | ✅ |
| `seo` | SemrushSection | 9 (kpis, secondary_kpis, ranking_distribution, top_keywords, rank_improvers, tracked_keywords, backlinks, ai_visibility, competitors) | ✅ |
| `web` | GA4Section | 12 (kpis, secondary_kpis, chart, traffic_sources, top_pages, devices, countries, new_vs_returning, demographics, conversion_events, conversions_by_channel, ai_referrals) | ✅ |
| `paid_social` | MetaSection | 4 (kpis, chart, campaigns, click_fraud) | ✅ |
| `googleads` | GoogleAdsSection | 5 (kpis, chart, campaigns, ad_groups, click_fraud) | ✅ |
| `searchconsole` | SearchConsoleSection | 8 (kpis, chart, top_queries, top_pages, position_movers, devices, countries, cannibalisation) | ✅ |
| `ecommerce` | EcommerceSection | 4 (kpis, chart, top_products, order_status) | ✅ |
| `executive_summary` | AI-generated | 0 (pure AI text) | ✅ |
| 6× text sections | Manual text | 0 each | ❌ (manual) |

### Missing Report Sections (13 Dashboard Tabs Not Reportable)

| Missing Section | Dashboard Tab | Priority | Client Impact |
|---|---|---|---|
| `tiktok` | TikTok Ads | 🔴 High | Cannot report TikTok campaign performance |
| `microsoft_ads` | Microsoft Ads | 🔴 High | Cannot report Bing/Microsoft spend and ROAS |
| `linkedin` | LinkedIn Ads | 🔴 High | B2B clients cannot see LinkedIn in reports |
| `klaviyo` | Email Marketing | 🔴 High | E-commerce email performance not reportable |
| `callrail` | Call Tracking | 🟡 Medium | Call volume and conversion data missing from reports |
| `hubspot` | HubSpot CRM | 🟡 Medium | Lead-gen pipeline not in reports |
| `youtube` | YouTube Analytics | 🟡 Medium | Video channel metrics not reportable |
| `core_web_vitals` | Core Web Vitals | 🟡 Medium | Technical performance not in reports |
| `signals` | Marketing Signals | 🟢 Low | AI signals are context, not typically reported directly |
| `competitor_intelligence` | Competitor Intel | 🟡 Medium | Competitive positioning not reportable |
| `forecast` | Forecast | 🟡 Medium | Predictive data not in reports |
| `goals` | Goals & KPIs | 🔴 High | Goal progress should absolutely be in reports |
| `actions` | Actions | 🟢 Low | Internal tracking, less client-facing |

### Report Blocks Needed for New Sections

For each new section type, suggested block definitions:

**`tiktok`:** kpis, chart, campaigns, video_performance, creative_gallery
**`microsoft_ads`:** kpis, chart, campaigns, ad_groups, keywords
**`linkedin`:** kpis, chart, campaigns, lead_forms, audience
**`klaviyo`:** kpis, campaigns, flows, subscriber_health
**`callrail`:** kpis, calls_by_source, call_outcomes, time_distribution
**`hubspot`:** kpis, pipeline_funnel, deal_velocity, recent_deals
**`youtube`:** kpis, chart, top_videos, audience, traffic_sources
**`core_web_vitals`:** metrics, distribution, recommendations
**`goals`:** progress_summary, goal_cards, benchmark_comparison
**`competitor_intelligence`:** positioning_matrix, traffic_comparison, keyword_gaps

---

## 3. AI Capability Audit

### 3.1 AI Endpoint Inventory (23 endpoints)

| # | Endpoint | Model | Streaming | Web Search | Used In Dashboard | Used In Reports |
|---|---|---|---|---|---|---|
| 1 | `/api/ai/summary` | gpt-4o-mini | ❌ | ❌ | ✅ All AiInsightsPanels + Signals | ❌ |
| 2 | `/api/ai/super-summary` | gpt-4o-mini | ❌ | ❌ | ✅ GA4, Google Ads, Meta, SemRush, Search Console, Overview | ❌ |
| 3 | `/api/ai/overview-narrative` | gpt-4o | ❌ | ✅ | ✅ Overview tab | ❌ |
| 4 | `/api/ai/report-commentary` | gpt-4o-mini | ❌ | ❌ | ❌ | ✅ Per-section commentary |
| 5 | `/api/ai/executive-summary` | gpt-4o-mini | ❌ | ❌ | ❌ | ✅ Executive summary bullets |
| 6 | `/api/ai/report-narrative` | gpt-4o-mini | ✅ | ❌ | ❌ | ✅ Cross-section story stitching |
| 7 | `/api/ai/forecast` | gpt-4o-mini | ❌ | ❌ | ✅ Forecast panel | ❌ |
| 8 | `/api/ai/budget-advisor` | gpt-4o-mini | ❌ | ❌ | ✅ Overview/Budget panel | ❌ |
| 9 | `/api/ai/attribution` | Algorithmic | ❌ | ❌ | ✅ Attribution panel | ❌ |
| 10 | `/api/ai/creative-intelligence` | gpt-4o-mini | ❌ | ❌ | ✅ Google Ads, Meta | ❌ |
| 11 | `/api/ai/strategy-document` | **gpt-4o** | ✅ | ✅ | ✅ Strategy tab | ❌ |
| 12 | `/api/ai/root-cause` | **gpt-4o** | ✅ | ✅ | ✅ Signal cards | ❌ |
| 13 | `/api/ai/landing-page-analysis` | gpt-4o-mini | ❌ | ✅ | ✅ Google Ads, Meta | ❌ |
| 14 | `/api/ai/chat` | gpt-4o-mini | ❌ | ❌ | ✅ Chat panel | ❌ |
| 15 | `/api/ai/blended-revenue` | gpt-4o-mini | ❌ | ❌ | ✅ E-commerce | ❌ |
| 16 | `/api/ai/goal-benchmark` | gpt-4o-mini | ❌ | ❌ | ✅ Goals tab | ❌ |
| 17 | `/api/ai/meeting-briefing` | gpt-4o/mini | ✅ | ❌ | ✅ (via client actions) | ❌ |
| 18 | `/api/ai/ai-visibility` | gpt-4o-mini | ❌ | ❌ | ✅ SemRush tab | ❌ |
| 19 | `/api/ai/snapshots` | N/A (data) | ❌ | ❌ | ✅ Google Ads, Meta | ❌ |
| 20 | `/api/competitor-intelligence` | gpt-4o-mini | ❌ | ❌ | ✅ Competitors tab | ❌ |
| 21 | `/api/tools/keyword-planner/*` | gpt-4o-mini | ❌ | ❌ | ✅ Keyword tool | ❌ |
| 22 | `/api/tools/media-plan/*/forecast` | gpt-4o-mini | ❌ | ❌ | ✅ Media plan tool | ❌ |
| 23 | `/api/tools/llm-gen` | gpt-4o-mini | ❌ | ❌ | ✅ Content tools | ❌ |

### 3.2 AI Features by Dashboard Section

| Section | AiInsightsPanel | SuperSummary | Creative Intel | Landing Page | Click Fraud | Budget Advisor | Forecast | Root Cause |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| GA4 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Google Ads | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Meta | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Search Console | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SemRush | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| TikTok | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Microsoft Ads | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| LinkedIn | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Klaviyo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| YouTube | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| HubSpot | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CallRail | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| E-Commerce | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Core Web Vitals | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Overview | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Signals | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Goals | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Competitors | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Actions | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Communications | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.3 AI Data Gaps (What AI Could See But Doesn't)

| Gap | Detail | Impact | Ref |
|---|---|---|---|
| **E-Commerce has no AiInsightsPanel** | Persona exists in summary endpoint but EcommerceSection doesn't render it | E-commerce clients get no AI insights on their revenue data | RT-05 |
| **Core Web Vitals has zero AI** | CWV data not passed to any AI endpoint | No AI recommendations for performance issues | New |
| **Goals not in AiInsightsPanel** | Per-channel AI doesn't know about client targets | AI says "ROAS is 3.2x" but can't say "you need 4.0x by March" | RT-21 |
| **Demographic data not in AiInsightsPanel** | Meta age×gender data exists but only in overview-narrative | Campaign-level creative decisions lack audience context | RT-20 |
| **Historical anomaly patterns unknown** | AI doesn't query DetectedAnomaly history | Can't say "this is a recurring issue" vs "first-time anomaly" | RT-22 |
| **Budget Advisor has no goal awareness** | Doesn't query ClientGoal | Budget recs not oriented to hitting targets | RT-03 |
| **Budget Advisor has no total budget** | No contractedHours/totalMediaBudget context | May recommend impossible spend increases | RT-04 |
| **Seasonality not injected** | No AI endpoint knows current month/season/events | December commentary doesn't mention Christmas | RT-06/24 |
| **SuperSummary missing 7 channels** | Only GA4, Google Ads, Meta, SemRush, Search Console | TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail clients get no SuperSummary | RT-07 |
| **SuperSummary missing CWV data** | Crawls pages but no CrUX data | Page health scoring not grounded in real performance data | RT-08 |
| **SuperSummary missing goal context** | No ClientGoal reference | Can't connect page analysis to goal achievement | RT-09 |
| **Keyword overlap not in AI** | `/api/cross/keyword-overlap` data only in UI | SEO AI doesn't know about paid/organic cannibalisation | RT-27 |
| **Creative Intelligence missing video metrics** | No thumb-stop, completion rate, hook metrics | TikTok and Meta Reels creative analysis is incomplete | RT-16 |
| **Creative Intelligence no TikTok path** | No platform-specific prompt for TikTok | TikTok creative analysis uses generic ad vocabulary | RT-17 |
| **Forecast is blended only** | No per-channel breakdown | "Conversions +8%" doesn't help — need "Google Ads +12%, Meta -3%" | RT-11 |
| **Forecast not persisted** | Generated on demand, never stored | Can't compare forecast vs actuals or calibrate confidence | RT-12 |
| **Attribution no DDA model** | 5 heuristic models, no Data-Driven Attribution | Clients expect DDA — it's the platform default for Google/Meta | RT-13 |
| **Attribution not persisted** | Computed on demand, discarded | Can't track attribution trends over time | RT-14 |
| **Chat can't access live data** | Only historical MetricSnapshot context | "What were my conversions yesterday?" can't be answered | RT-18 |
| **Overview blended totals frontend-only** | Missing channel data if tab not visited | AI may work with incomplete totals | RT-10 |

### 3.4 AI Potential — What Could Be Built

| Opportunity | Description | Uses Existing Data? | New Data Needed? |
|---|---|---|---|
| **AI Action Generator** | From any anomaly/signal, auto-generate recommended actions with estimated impact | ✅ Anomaly data + metrics | ❌ |
| **Communication AI Digest** | Weekly AI summary of all client communications with sentiment | ✅ Communications data | ❌ |
| **AI Meeting Prep** | Already exists — could be enhanced with real-time data (RT-18 pattern) | ✅ | Live API access |
| **Predictive Churn Scoring** | AI analysis of metric trends + communication cadence → client risk score | ✅ Snapshots + Comms | ❌ |
| **Cross-Channel Creative Learnings** | Identify creative patterns that work across Meta + TikTok + Google | ✅ Creative data | Video metrics (RT-16) |
| **AI Report Reviewer** | After AI generates commentary, second AI pass for quality/accuracy/consistency | ✅ Commentary text | ❌ |
| **Goal Progress Forecasting** | Given current trajectory, when will each goal be achieved? | ✅ Goals + Snapshots | ❌ |
| **Automated Email Campaign Recommendations** | Based on Klaviyo + revenue data, suggest email strategies | ✅ Klaviyo data | Segment data |
| **CWV → Revenue Correlation** | Show impact of page speed on conversions using GA4 + CWV data | ✅ GA4 + CWV | ❌ |
| **AI Content Calendar** | Based on keyword data + seasonality, suggest content publishing schedule | ✅ SemRush + GSC | Seasonality (RT-06) |
| **Competitor Strategy Analysis** | Deep AI analysis of competitor moves and recommended responses | ✅ Competitor snapshots | ❌ |
| **AI Dashboard Narrator** | On dashboard load, auto-generate "here's what happened this week" narrative | ✅ All metrics | ❌ |
| **Smart Report Sections** | AI recommends which sections to include based on client type and what changed | ✅ Client config + metrics | ❌ |
| **AI Prompt Quality Scoring** | Track prompt success via user edits to AI output (implicit feedback) | ✅ Commentary saves | ❌ |

---

## 4. Cross-Reference: ROADY_WOADY.md

### Items Marked Complete That Are Actually Incomplete

| ROADY_WOADY Status | Actual State | Gap |
|---|---|---|
| ✅ "TikTok Ads integration" | Section exists but is minimal (195 lines, no chart, no creative data, no SuperSummary) | Feature incomplete — needs parity upgrade |
| ✅ "Microsoft Advertising integration" | Section exists but is minimal (194 lines, no chart, no keywords, no ad groups) | Feature incomplete — needs parity upgrade |
| ✅ "LinkedIn Ads integration" | Section exists but is minimal (192 lines, no chart, no audience, no lead forms) | Feature incomplete — needs parity upgrade |
| ✅ "Klaviyo/email marketing integration" | Section exists but doesn't support date range filtering, missing flows/segments | Feature incomplete — no date filtering is a significant gap |
| ✅ "HubSpot CRM integration" | Section exists but is minimal (146 lines, no pipeline funnel, no deal velocity) | Feature incomplete — needs parity upgrade |
| ✅ "YouTube Analytics integration" | Section exists but is minimal (158 lines, no trends, no audience, no traffic sources) | Feature incomplete — needs parity upgrade |
| ✅ "CallRail integration" | Section exists but is minimal (173 lines, no attribution, no sentiment) | Feature incomplete — needs parity upgrade |
| ✅ "Seasonality intelligence" | No evidence of seasonality data being injected into any AI prompt | Not implemented in AI — only client-facing concept exists |
| ✅ "Attribution modelling" | 5 heuristic models exist but no DDA, results not persisted | Partially complete — missing key model and persistence |

### Phase 4 Items — Additional Context from This Audit

| Phase 4 Item | Notes from This Audit |
|---|---|
| Interactive web reports | Share view exists; 13 dashboard sections can't be included in reports at all — this is the bigger blocker |
| White-label mode | No issues found; not relevant to this audit |
| External API | Would benefit from the server-side blended totals fix (RT-10) |
| AI video report generation | Would need all 13 missing sections added to reports first |
| SOW & contract manager | `contractedHours` field exists on Client — foundation is there |

### Items in ROADY_WOADY Not Yet Started (Beyond Phase 4)

| Item | This Audit's Recommendation |
|---|---|
| Audience Insight Engine (3.8) | Demographic data exists for Meta (getMetaAudienceDemographics) but isn't widely used — low-hanging fruit |
| Custom KPI Builder (4.6) | Goals section handles most of this — may not need a separate builder |
| Slide Deck Export (6.4) | Still valuable — PowerPoint is the agency standard format |
| Campaign Planning Calendar (10.2) | Simple addition — model + UI |
| Invoice & Spend Reconciliation (10.3) | Budget data exists, just needs comparison view |
| NPS & Client Satisfaction (8.4) | Simple addition — email survey + model |

---

## 5. Cross-Reference: ai_audit.md

### RT Items Status Validation

All 27 RT items from ai_audit.md v3.3 remain open. Here is additional context from this audit:

| RT # | ai_audit Description | This Audit's Additional Context | Still Valid? |
|---|---|---|---|
| RT-01 | AI feedback loop | No feedback UI found anywhere in codebase. Critical for prompt quality improvement. | ✅ Yes |
| RT-02 | Prompt caching/dedup | withApiCache exists for external APIs but NOT for AI completions. Each AI button press = new API call. | ✅ Yes |
| RT-03 | Budget Advisor goals | Confirmed — budget-advisor fetches client name/instructions but never ClientGoal | ✅ Yes |
| RT-04 | Budget Advisor total budget | Confirmed — no totalMediaBudget or contractedHours passed | ✅ Yes |
| RT-05 | Ecommerce AiInsightsPanel | Confirmed — EcommerceSection.tsx (213 lines) does not import/render AiInsightsPanel. Persona exists in summary endpoint. | ✅ Yes — easiest quick win |
| RT-06 | Seasonality context | Confirmed — no endpoint injects month/season/events into prompts | ✅ Yes |
| RT-07 | SuperSummary coverage | Confirmed — SECTION_NAMES/METRIC_LABELS only define ga4, googleads, meta, seo, searchconsole. 7 channels excluded. | ✅ Yes |
| RT-08 | SuperSummary CWV | Confirmed — CWV data available via getCoreWebVitals() but not injected into SuperSummary | ✅ Yes |
| RT-09 | SuperSummary goals | Confirmed — no ClientGoal context in SuperSummary | ✅ Yes |
| RT-10 | Overview blended totals | Confirmed — frontend-assembled `aggregated` object; missing if tabs not loaded | ✅ Yes |
| RT-11 | Forecast per-channel | Confirmed — single blended forecast, no channel breakdown | ✅ Yes |
| RT-12 | Forecast persistence | Confirmed — no ForecastRecord or MetricSnapshot storage of forecast results | ✅ Yes |
| RT-13 | DDA attribution | Confirmed — 5 heuristic models, no Shapley/DDA | ✅ Yes |
| RT-14 | Attribution persistence | Confirmed — no AttributionResult model | ✅ Yes |
| RT-15 | Root cause structured output | Confirmed — returns plain Markdown string | ✅ Yes |
| RT-16 | Video metrics in creative | Confirmed — no thumb-stop, completion rate, hook metrics in creative data shape | ✅ Yes |
| RT-17 | TikTok creative path | Confirmed — no platform-specific TikTok prompt in creative-intelligence | ✅ Yes |
| RT-18 | Chat live data | Confirmed — only MetricSnapshot context, no function calling / live API access | ✅ Yes |
| RT-19 | Chat follow-up questions | Confirmed — static prompt suggestions only | ✅ Yes |
| RT-20 | AiInsightsPanel demographics | Confirmed — Meta age×gender exists but only in overview-narrative | ✅ Yes |
| RT-21 | AiInsightsPanel goals | Confirmed — per-channel AI has no goal context | ✅ Yes |
| RT-22 | AiInsightsPanel anomaly history | Confirmed — DetectedAnomaly not queried for pattern recognition | ✅ Yes |
| RT-23 | Report commentary previous period | Confirmed — overview section doesn't get previous-period metrics | ✅ Yes |
| RT-24 | Report commentary seasonality | Same as RT-06 applied to report context | ✅ Yes |
| RT-25 | Claude model routing | No Claude integration found — all endpoints use OpenAI gpt-4o or gpt-4o-mini | ✅ Yes |
| RT-26 | Media plan benchmarks | Confirmed — no MetricSnapshot query in media plan forecast | ✅ Yes |
| RT-27 | Keyword overlap in AI | Confirmed — data only in UI panel, not injected into AI prompts | ✅ Yes |

### Items Discovered by This Audit NOT in ai_audit.md

| New Item | Description | Priority |
|---|---|---|
| **NEW-01** | Core Web Vitals section has zero AI features — no AiInsightsPanel, no recommendations | 🟡 Medium |
| **NEW-02** | Goals section has no AiInsightsPanel — only benchmark suggestions, no ongoing AI analysis | 🟡 Medium |
| **NEW-03** | Competitors section has no AI in dashboard view (only in full tool) | 🟡 Medium |
| **NEW-04** | Actions section has no AI — no auto-generation from signals | 🟡 Medium |
| **NEW-05** | Communications section has no AI — no sentiment analysis, no digest | 🟡 Medium |
| **NEW-06** | 13 dashboard sections cannot be included in reports — massive reporting gap | 🔴 Critical |
| **NEW-07** | Klaviyo section doesn't support date range parameters — always shows all-time data | 🔴 High |
| **NEW-08** | TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail sections are all <200 lines — feature parity is very low compared to GA4 (943), Google Ads (1,026), Meta (1,301) | 🔴 High |
| **NEW-09** | No report section for goal progress — goals are referenced in AI commentary but clients can't see a visual goal tracker in reports | 🔴 High |
| **NEW-10** | Client dashboard has no "summary since last report" view — account managers must manually review each tab | 🟡 Medium |
| **NEW-11** | No AI feature compares creative performance across Meta + Google Ads + TikTok simultaneously | 🟡 Medium |
| **NEW-12** | YouTube video data not fully passed to AiInsightsPanel — only analytics summary, not individual video performance | 🟢 Low |

---

## 6. Consolidated Gap Register

Every gap, bug, and missing feature in one place — deduplicated and prioritised.

### 🔴 Critical (Must Fix)

| ID | Category | Description | Source |
|---|---|---|---|
| **GAP-01** | Reports | 13 dashboard sections cannot be included in reports (TikTok, Microsoft Ads, LinkedIn, Klaviyo, CallRail, HubSpot, YouTube, Core Web Vitals, Signals, Competitors, Forecast, Goals, Actions) | NEW-06 |
| **GAP-02** | Dashboard | TikTok/Microsoft Ads/LinkedIn/HubSpot/YouTube/CallRail sections have <200 lines each — minimal feature parity vs GA4/Google Ads/Meta (1,000+ lines) | NEW-08 |
| **GAP-03** | AI | E-Commerce section has no AiInsightsPanel despite persona existing | RT-05 |
| **GAP-04** | Reports | No goal progress section in reports — clients can't see their targets | NEW-09 |
| **GAP-05** | Data | Klaviyo section doesn't support date range filtering | NEW-07 |

### 🟠 High Priority

| ID | Category | Description | Source |
|---|---|---|---|
| **GAP-06** | AI | SuperSummary missing 7 channels (TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail) | RT-07 |
| **GAP-07** | AI | Chat cannot access live data — only historical snapshots | RT-18 |
| **GAP-08** | AI | No seasonality context in any AI prompt | RT-06/RT-24 |
| **GAP-09** | AI | No AI feedback/rating system | RT-01 |
| **GAP-10** | AI | Per-channel AI has no goal context | RT-21 |
| **GAP-11** | AI | Overview blended totals assembled on frontend, incomplete | RT-10 |
| **GAP-12** | AI | Forecast only shows blended — no per-channel breakdown | RT-11 |
| **GAP-13** | AI | No DDA attribution model | RT-13 |
| **GAP-14** | AI | Creative Intelligence missing video metrics (thumb-stop, completion) | RT-16 |
| **GAP-15** | AI | Creative Intelligence has no TikTok-specific analysis | RT-17 |
| **GAP-16** | ROADY | "Seasonality intelligence" marked complete but not implemented in AI | ROADY cross-ref |

### 🟡 Medium Priority

| ID | Category | Description | Source |
|---|---|---|---|
| **GAP-17** | AI | Prompt output caching/deduplication | RT-02 |
| **GAP-18** | AI | Budget Advisor has no goal awareness | RT-03 |
| **GAP-19** | AI | Budget Advisor has no total budget context | RT-04 |
| **GAP-20** | AI | SuperSummary missing CWV data | RT-08 |
| **GAP-21** | AI | SuperSummary missing goal context | RT-09 |
| **GAP-22** | AI | Root cause returns plain Markdown, not structured JSON | RT-15 |
| **GAP-23** | AI | AiInsightsPanel missing demographic data | RT-20 |
| **GAP-24** | AI | AiInsightsPanel missing historical anomaly patterns | RT-22 |
| **GAP-25** | AI | Report commentary missing previous-period for overview | RT-23 |
| **GAP-26** | AI | Forecast results not persisted | RT-12 |
| **GAP-27** | AI | Attribution results not persisted | RT-14 |
| **GAP-28** | AI | Media plan forecast has no historical benchmarks | RT-26 |
| **GAP-29** | AI | Keyword overlap data not in AI prompts | RT-27 |
| **GAP-30** | AI | Core Web Vitals has no AI features at all | NEW-01 |
| **GAP-31** | AI | Goals section has no ongoing AI analysis | NEW-02 |
| **GAP-32** | AI | Competitors section has no AI in dashboard | NEW-03 |
| **GAP-33** | AI | Actions section has no AI generation | NEW-04 |
| **GAP-34** | AI | Communications section has no AI analysis | NEW-05 |
| **GAP-35** | AI | Claude model routing not implemented | RT-25 |
| **GAP-36** | AI | Cross-platform creative comparison not available | NEW-11 |

### 🟢 Quick Wins (< 1 day each)

| ID | Category | Description | Source |
|---|---|---|---|
| **QW-01** | AI | Add AiInsightsPanel to EcommerceSection | RT-05 |
| **QW-02** | AI | Add ClientGoal context to AiInsightsPanel | RT-21 |
| **QW-03** | AI | Add ClientGoal context to SuperSummary | RT-09 |
| **QW-04** | AI | Add ClientGoal context to Budget Advisor | RT-03 |
| **QW-05** | AI | Add historical anomaly query to AiInsightsPanel | RT-22 |
| **QW-06** | AI | Add previous-period metrics to overview report commentary | RT-23 |
| **QW-07** | AI | Save forecast results to DB | RT-12 |
| **QW-08** | AI | Save attribution results to DB | RT-14 |
| **QW-09** | AI | Add keyword overlap data to SEO AiInsightsPanel | RT-27 |
| **QW-10** | AI | Add suggested follow-up questions to Chat | RT-19 |

---

## 7. New Opportunities Not in Either Document

These are opportunities identified through this audit that appear in neither ROADY_WOADY.md nor ai_audit.md:

### 7.1 AI-Powered Report Section Recommendations

**What:** When creating a new report, AI analyses which sections are most relevant based on client type, connected channels, and what changed during the period. Suggests sections to add/remove and blocks to highlight.

**Why:** Account managers often use the same template for every client. An AI recommendation like "TikTok conversions grew 45% this month — recommend adding TikTok section" would improve report quality.

### 7.2 Dashboard "Changes Since Last Report" View

**What:** A summary view that shows only what changed since the last report was published for this client. Highlights significant metric movements, new anomalies, and goal progress.

**Why:** Account managers currently review each tab individually to prepare for reporting. A focused "what's new" view saves significant time.

### 7.3 AI Communication Digest

**What:** Weekly AI-generated summary of all communications with a client. Sentiment tracking over time. Auto-extraction of action items from emails and meeting notes.

**Why:** Communications data is collected and synced but never analysed. This data is a goldmine for client health prediction.

### 7.4 Cross-Channel Creative Learning System

**What:** Compare creative performance patterns across Meta, Google Ads, and TikTok simultaneously. Identify what creative elements (imagery style, copy length, CTA type) work across all platforms vs platform-specific winners.

**Why:** Creative teams currently optimise per-platform. Cross-platform pattern recognition would unlock more efficient creative production.

### 7.5 Automated Goal Progress Tracking

**What:** Auto-populate goal `currentValue` from latest MetricSnapshot data. Calculate "days to target at current trajectory". Generate alerts when goals are at risk.

**Why:** Goals currently require manual currentValue updates. Automating this makes the goals feature genuinely useful rather than aspirational.

### 7.6 AI-Powered Client Health Score

**What:** Combine metric trends, communication sentiment, goal progress, report engagement (share link views), and anomaly frequency into a single AI-generated health score per client.

**Why:** Portfolio health dashboard exists but could be significantly enhanced with AI synthesis of all available signals.

### 7.7 Report Template Intelligence

**What:** Learn from which sections/blocks account managers keep, remove, or modify across reports. Auto-tune default templates based on usage patterns.

**Why:** ReportTemplate exists but templates are static. Learning from actual usage would improve defaults over time.

### 7.8 CWV → Revenue Impact Analysis

**What:** Correlate Core Web Vitals metrics with GA4 bounce rate and conversion rate on a per-page basis. Show "improving LCP on your top 10 landing pages could increase conversions by X%".

**Why:** Both CWV and GA4 data exist — just not cross-referenced. This would make technical SEO recommendations more compelling to clients.

---

## 8. Fixes Required (Bugs / Structural Issues)

These are not features — they are things that are broken or structurally wrong:

| ID | Issue | Detail | File(s) |
|---|---|---|---|
| **FIX-01** | Klaviyo ignores date range | KlaviyoSection doesn't pass startDate/endDate to API; API doesn't accept them. Shows all-time data regardless of period selector. | `KlaviyoSection.tsx`, `/api/klaviyo/route.ts` |
| **FIX-02** | YouTube data not fully passed to AI | AiInsightsPanel receives analytics metrics but individual video performance data is not included in the metrics object. | `YouTubeSection.tsx` |
| **FIX-03** | Overview blended totals incomplete | Frontend-assembled aggregated metrics may be missing channels the user hasn't visited. Should be computed server-side from ApiCache. | `OverviewSection.tsx`, `/api/ai/overview-narrative` |
| **FIX-04** | Seasonality marked complete but missing | ROADY_WOADY marks "Seasonality intelligence" as ✅ complete, but no AI endpoint injects seasonal context. | All AI endpoints |
| **FIX-05** | Signals only cover 5 of 15 channels | SignalsSection fetches data from GA4, Google Ads, Meta, Search Console, SemRush only. TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail signals not generated. | `SignalsSection.tsx` |
| **FIX-06** | Google Ads pagination | `searchGoogleAds` helper performs a single API request without paginating page tokens. Accounts with many campaigns/keywords may have truncated results. | `src/lib/google-ads.ts` |

---

## 9. Prioritised Action Plan

### Wave 1 — Quick Wins (1-2 weeks)

These require minimal code changes and deliver immediate value:

1. **QW-01**: Add AiInsightsPanel to EcommerceSection
2. **QW-02**: Add ClientGoal context to AiInsightsPanel prompts
3. **QW-03**: Add ClientGoal context to SuperSummary
4. **QW-04**: Add ClientGoal context to Budget Advisor
5. **QW-05**: Add historical anomaly query to AiInsightsPanel
6. **QW-06**: Add previous-period metrics to overview report commentary
7. **QW-07**: Persist forecast results to DB
8. **QW-08**: Persist attribution results to DB
9. **QW-09**: Inject keyword overlap data into SEO AiInsightsPanel prompt
10. **QW-10**: Add suggested follow-up questions to Chat

### Wave 2 — Critical Report Gaps (2-4 weeks)

Add missing report sections for the most common client types:

1. **GAP-01a**: Add `tiktok` report section type with blocks (kpis, chart, campaigns)
2. **GAP-01b**: Add `microsoft_ads` report section type with blocks
3. **GAP-01c**: Add `linkedin` report section type with blocks
4. **GAP-01d**: Add `klaviyo` report section type with blocks
5. **GAP-01e**: Add `callrail` report section type with blocks
6. **GAP-01f**: Add `hubspot` report section type with blocks
7. **GAP-01g**: Add `youtube` report section type with blocks
8. **GAP-01h**: Add `core_web_vitals` report section type with blocks
9. **GAP-04**: Add `goals` report section with progress visualisation
10. **FIX-01**: Fix Klaviyo date range filtering

### Wave 3 — Section Parity Upgrades (4-8 weeks)

Bring thin sections to feature parity:

1. **GAP-02a**: TikTok section expansion (daily chart, creative data, video metrics, audience)
2. **GAP-02b**: Microsoft Ads section expansion (daily chart, ad groups, keywords, search terms)
3. **GAP-02c**: LinkedIn section expansion (daily chart, audience, lead forms, content)
4. **GAP-02d**: Klaviyo section expansion (date filtering, flows, segments, subscriber health)
5. **GAP-02e**: HubSpot section expansion (pipeline funnel, deal velocity, contact lifecycle)
6. **GAP-02f**: YouTube section expansion (trends, audience, traffic sources, content analysis)
7. **GAP-02g**: CallRail section expansion (attribution, time analysis, outcome tracking)
8. **GAP-06**: Add SuperSummary support for all 7 missing channels
9. **FIX-05**: Expand Signals to cover all 15 channels

### Wave 4 — AI Intelligence Upgrades (4-8 weeks)

Enhance AI capabilities with new data and features:

1. **GAP-08**: Inject seasonality context into all AI prompts
2. **GAP-09**: Build AI feedback/rating system (AiOutputFeedback model + UI)
3. **GAP-11**: Move overview blended totals server-side
4. **GAP-12**: Build per-channel forecast breakdown
5. **GAP-13**: Implement DDA attribution model
6. **GAP-14/15**: Add video metrics + TikTok-specific path to Creative Intelligence
7. **GAP-07**: Add function calling to Chat for live data access
8. **GAP-22**: Migrate root cause output to structured JSON
9. **GAP-23**: Add demographic data to AiInsightsPanel
10. **NEW-01**: Add AI features to Core Web Vitals section
11. **NEW-03**: Add AI analysis to Competitors dashboard view
12. **NEW-04**: Build AI action generator from signals
13. **NEW-05**: Build AI communication digest

### Wave 5 — Advanced Features (8-12 weeks)

Higher-effort innovations:

1. **GAP-35**: Claude Sonnet/Opus model routing for strategy/root-cause/narrative
2. **NEW-01 (7.1)**: AI-powered report section recommendations
3. **NEW-02 (7.2)**: "Changes since last report" dashboard view
4. **NEW-05 (7.5)**: Automated goal progress tracking from MetricSnapshot
5. **NEW-06 (7.6)**: AI-powered client health scoring
6. **NEW-08 (7.8)**: CWV → revenue impact analysis
7. **NEW-04 (7.4)**: Cross-channel creative learning system

---

## Summary Statistics

| Category | Count |
|---|---|
| Dashboard tabs audited | 21 |
| Report section types available | 8 metric + 6 text |
| Dashboard sections NOT in reports | 13 |
| AI endpoints | 23 |
| Sections with zero AI features | 5 (Core Web Vitals, Goals, Competitors, Actions, Communications) |
| Sections with AI but no SuperSummary | 7 (TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail) |
| Open gaps from ai_audit.md (all validated) | 27 |
| New gaps found by this audit | 12 |
| Structural fixes needed | 6 |
| Quick wins identified | 10 |
| Total items in gap register | 42 |

---

> **This document supersedes individual sections of ROADY_WOADY.md (gap analysis) and ai_audit.md (remaining tasks) as the canonical source of truth for what's missing, what's broken, and what's possible. The strategic vision and phased roadmap in ROADY_WOADY.md remain valid. The technical AI analysis in ai_audit.md remains valid. This document adds the dashboard-level audit, report mapping, and cross-referencing that neither document covered.**

*Last updated: April 2026*
