# AI Audit — i3media Report Platform

**Document version:** 1.1  
**Audit date:** April 2026  
**Last updated:** April 2026  
**Scope:** Every AI endpoint, AI UI component, prompt architecture, data flow, and latent opportunity across the platform

---

## Implementation Status

The following recommendations from this audit have been implemented:

### Priority 1 — Immediate ✅

| Rec | Status | Notes |
|-----|--------|-------|
| **P1.1** Standardise API key resolution | ✅ Done | Created shared `getOpenAiKey()` / `getOpenAiClient()` in `src/lib/openai-client.ts`. All 18 endpoints updated to check `AppSetting` DB first, fall back to `OPENAI_API_KEY` env var. |
| **P1.2** Inject `aiReportInstructions` into all endpoints | ✅ Done | Extended to: summary, super-summary, overview-narrative, strategy-document, root-cause, chat, budget-advisor, creative-intelligence (8 endpoints, previously only 2). |
| **P1.3** Inject `ClientGoal` data | ✅ Done | Active goals with progress tracking now injected into summary, overview-narrative, and report-commentary prompts. |
| **P1.4** YouTube, HubSpot, CallRail AI panels | ✅ Done | Added SECTION_CONFIGS, channel personas, and `AiInsightsPanel` to all three dashboard sections. `ClientDashboard` updated to pass `clientName` and `crossPlatformContext`. |

### Priority 2 — High Impact ✅

| Rec | Status | Notes |
|-----|--------|-------|
| **P2.1** Extend overview-narrative to all channels | ✅ Done | `PlatformMetrics` type now includes TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, and E-Commerce. Prompt builder generates context blocks for all active channels. `max_tokens` increased to 3500. |
| **P2.2** Feed e-commerce revenue into AI | ✅ Done | E-commerce data (`totalRevenue`, `totalOrders`, `AOV`) added to overview-narrative, budget-advisor, forecast, and report-commentary (new section labels for ecommerce/shopify/woocommerce). |
| **P2.3** Add streaming to long-running endpoints | ✅ Done | strategy-document, super-summary, root-cause, and overview-narrative now support `stream: true` parameter, returning SSE `text/event-stream` responses. Non-streaming mode preserved for backward compatibility. |
| **P2.4** Improve forecast quality with pre-computed trends | ✅ Done | Added `computeTrendAnalysis()` helper that pre-computes MoM trends, variance coefficients, data quality signals, and YoY comparisons from all available snapshots before sending to GPT. `max_tokens` increased to 2000. |
| **P2.5** Competitor context in dashboard AI | ✅ Done | SEO/SemRush AI insights now fetch `CompetitorSnapshot` records and include competitor landscape (organic traffic, keywords, DA) in the prompt context. |
| **P2.6** Web search for contextual AI endpoints | ✅ Done | strategy-document, root-cause, and overview-narrative accept `enableWebSearch: true` — uses OpenAI Responses API with `web_search_preview` tool to pull industry benchmarks, algorithm updates, and market context. Streaming and non-streaming supported. Citations returned in response. |

### Priority 3 — Innovate

| Rec | Status | Notes |
|-----|--------|-------|
| **P3.1** AI-powered Goal Setting Assistant | ✅ Done | `POST /api/ai/goal-benchmark` — fetches 6 months of MetricSnapshot data, computes trends, uses GPT to suggest conservative/moderate/aggressive targets with confidence scores. |
| **P3.2** Anomaly Memory + Pattern Learning | ✅ Done | New `DetectedAnomaly` model stores detected anomalies. Summary route persists high/medium anomalies. Root-cause route fetches prior anomaly history and includes it in the prompt. Root cause text stored back to anomaly records. |
| **P3.3** Pre-Meeting Briefing Generator | ✅ Done | `POST /api/ai/meeting-briefing` — aggregates strategy docs, goals, actions, snapshots, and anomalies into a structured 1-page briefing. Saves as `StrategyDocument` with `type: "briefing"`. Supports SSE streaming. |
| **P3.4** Intelligent Report Narrative Stitching | ✅ Done | `POST /api/ai/report-narrative` — receives all section commentaries, identifies cross-section stories, generates connection sentences per section, and produces a unified executive summary. |
| **P3.5** Real-time anomaly push notifications | ✅ Done | Cron snapshot route now runs anomaly detection after each MetricSnapshot write. High-severity anomalies trigger a 2-sentence AI hypothesis and notify all admins via the Notification system. |
| **P3.6** AI-powered Action Recommendations | ✅ Done | Report approval route now triggers `extractActionsFromReport()` on approval — AI extracts 3-8 concrete `ActionItem` records from report commentaries with priority and platform tagging. Admins notified. |
| **P3.7** Blended Revenue Attribution | ✅ Done | `POST /api/ai/blended-revenue` — reconciles e-commerce, Klaviyo, Google Ads, Meta, Microsoft Ads, TikTok, LinkedIn revenue. De-duplicates cross-device/view-through overlap. Returns true ROAS per channel. |
| **P3.8** AI Visibility (GEO) Monitoring | ✅ Done | `POST /api/ai/ai-visibility` — analyses AI referral traffic trends (ChatGPT, Claude, Perplexity, etc.), computes visibility score, cross-references with SEO data, generates 5 specific actions to improve AI search presence. |

### Section 7 — Claude Integration (Out of Scope)

Claude Sonnet/Opus integration recommendations are documented below but not implemented. The hybrid architecture proposal remains valid for future consideration.

---

---

## Table of Contents

1. [AI Endpoint Inventory](#1-ai-endpoint-inventory)
2. [Component-by-Component Audit](#2-component-by-component-audit)
3. [Data Flow Architecture](#3-data-flow-architecture)
4. [What Data Is Available vs What AI Actually Sees](#4-what-data-is-available-vs-what-ai-actually-sees)
5. [Current Gaps & Weaknesses](#5-current-gaps--weaknesses)
6. [Improvement Recommendations](#6-improvement-recommendations)
7. [What If: Claude Sonnet / Opus Integration](#7-what-if-claude-sonnet--opus-integration)

---

## 1. AI Endpoint Inventory

| # | Endpoint | Model | Purpose | Called From | Auth |
|---|----------|-------|---------|-------------|------|
| 1 | `POST /api/ai/summary` | gpt-4o-mini | Per-channel anomaly detection + insights. Also handles `alert_recommendations` sub-type | AiInsightsPanel, Signals tab | Session |
| 2 | `POST /api/ai/super-summary` | gpt-4o-mini | Full-funnel journey narrative: ad → click → landing page → conversion | SuperSummary component | Session |
| 3 | `POST /api/ai/overview-narrative` | gpt-4o-mini (+ web_search opt-in) | Cross-channel strategic overview (all channels combined) | CrossChannelOverview tab | Session |
| 4 | `POST /api/ai/report-commentary` | gpt-4o-mini | Section-level report commentary (tone/length/format configurable) | ReportView section | Session |
| 5 | `POST /api/ai/executive-summary` | gpt-4o-mini | Rolls up all section commentaries into a report executive summary | ReportView | Session |
| 6 | `POST /api/ai/forecast` | gpt-4o-mini | 30/60/90-day performance projections | Overview tab | Session |
| 7 | `POST /api/ai/budget-advisor` | gpt-4o-mini | Cross-channel budget reallocation recommendations | Overview tab | Session |
| 8 | `POST /api/ai/attribution` | gpt-4o-mini | Multi-touch attribution modelling + narrative | Overview tab | Session |
| 9 | `POST /api/ai/creative-intelligence` | gpt-4o-mini | Ad creative pattern analysis (Meta + Google) | Meta/Google Ads tabs | Session |
| 10 | `POST /api/ai/strategy-document` | gpt-4o-mini (+ web_search opt-in) | Full quarterly strategy document generator | Strategy tool | Session |
| 11 | `POST /api/ai/root-cause` | gpt-4o-mini (+ web_search opt-in) | Deep-dive root cause analysis for specific anomalies | Signals tab | Session |
| 12 | `POST /api/ai/landing-page-analysis` | gpt-4o-mini + web_search | CRO/SEO/mobile landing page audit | Page Analyser tool | Session |
| 13 | `POST /api/ai/chat` | gpt-4o-mini | Conversational "Ask the Data" interface | Client dashboard (all tabs) | Session |
| 14 | `POST /api/competitor-intelligence` | gpt-4o-mini | 2-3 sentence competitor organic search insight | Competitor Intelligence tool | Session |
| 15 | `POST /api/tools/keyword-planner/generate-proposal` | gpt-4o-mini | Full HTML proposal generation | Keyword Planner tool | Session |
| 16 | `POST /api/tools/keyword-planner` | gpt-4o-mini | Keyword strategy + ad group generation | Keyword Planner tool | Session |
| 17 | `POST /api/tools/llm-generator/generate` | gpt-4o-mini | `llm.txt` content generation for AI search | LLM Generator tool | Session |
| 18 | `POST /api/tools/media-plan/[id]/forecast` | gpt-4o-mini | Channel-by-channel media plan forecast | Media Plan tool | Session |

**Total AI endpoints: 18**  
**Model used across all endpoints: `gpt-4o-mini` exclusively**  
**Key management:** `OPENAI_API_KEY` env var, with some endpoints also checking `AppSetting(key="openaiApiKey")` in DB (endpoints 8, 9, 10). **Inconsistency noted — not all endpoints check DB first.**

---

## 2. Component-by-Component Audit

### 2.1 AiInsightsPanel (`/api/ai/summary`)

**What it does:**  
The workhorse per-channel AI panel. Appears on every data tab. Performs two jobs:
1. **Rules-engine anomaly detection** — pure algorithmic, no AI tokens used. Detects period-over-period metric changes, campaign-level structural issues (impression share, ROAS < 1x, ad frequency), and landing page zero-conversion situations.
2. **AI-generated insights** — GPT-4o-mini prompt containing account metrics, previous-period metrics, campaign breakdown, landing pages, historical snapshots, and cross-platform context.

**Data it receives:**
- ✅ Account-level metrics (current period)
- ✅ Previous period metrics (for deltas)
- ✅ Campaign-level enriched data (Google Ads: impression share, bid strategy, budget; Meta: frequency, ROAS, objective)
- ✅ Landing page URLs + clicks/impressions/conversions
- ✅ Historical snapshots (up to 6 periods via `/api/ai/snapshots`)
- ✅ Cross-platform context string (built in the dashboard component from other channel results)

**What the AI sees that a human analyst would want:**
- ✅ Specific campaign names and their ROAS/CPA
- ✅ Impression share loss (budget vs rank)
- ✅ Creative fatigue signals (frequency + CTR correlation)
- ✅ ROAS below 1x alert
- ✅ Landing page CVR = 0 flags

**What it's missing:**
- ❌ Audience/demographic breakdown data (age, gender, device split from Meta/GA4)
- ❌ Day-of-week / hour-of-day performance patterns (dayparting data)
- ❌ Ad creative format breakdown (image vs carousel vs video vs Reels)
- ❌ YouTube/HubSpot/CallRail/Klaviyo data not fed into cross-platform context
- ❌ Goals progress (is the client on-track for their KPI targets?)
- ❌ Historical anomaly pattern — was this same anomaly seen last quarter?
- ❌ Competitor benchmarking data (CompetitorSnapshot metrics)
- ❌ No awareness of contracted hours or budget constraints

**Channel personas for alert recommendations:**
A sophisticated feature — 9 distinct system prompts exist (search_console, meta, google_ads, ga4, semrush, gsc, tiktok, microsoftads, linkedin, klaviyo) to prevent cross-channel contamination (e.g. telling an SEO alert to "increase your bid"). This is excellent. However:

- ❌ No YouTube persona
- ❌ No HubSpot persona
- ❌ No CallRail persona
- ❌ No WooCommerce/Shopify persona
- ❌ No E-Commerce persona

---

### 2.2 SuperSummary (`/api/ai/super-summary`)

**What it does:**  
A deeper, full-funnel narrative that physically crawls the top 5 landing pages (by click volume) and adds technical page signals (title, meta description, H1, CTAs, form count, trust signals, structured data, mobile viewport) to the context before sending to GPT.

This is the most sophisticated component — it bridges ad performance data with real on-page quality signals.

**Strengths:**
- ✅ Live page crawling via `fetchPageSignals` utility
- ✅ Full campaign-level data + cross-platform context
- ✅ Per-page health scoring (0–100) in the response
- ✅ Journey assessment (traffic → landing → conversion) as a distinct output field
- ✅ Prioritised action list focused on full-funnel impact

**Weaknesses:**
- ❌ Only covers `ga4`, `googleads`, `meta`, `seo`, `searchconsole` section types — not TikTok, LinkedIn, Microsoft Ads, Klaviyo, YouTube, HubSpot, CallRail
- ❌ Page crawl can fail silently (HTTPS-only sites, bot-blocking) — no fallback web search (unlike `landing-page-analysis` which uses OpenAI web_search for failed fetches)
- ❌ gpt-4o-mini has 128k context but `max_tokens` is capped at 2,000 — very tight for 5-page crawls + campaign data + cross-platform context
- ❌ Landing page scoring gives one number (0–100) but doesn't drill into WHY (no CRO/SEO/Mobile/Forms breakdown like the dedicated `landing-page-analysis` endpoint does)
- ❌ No awareness of client goals — can't say "you're 60% of the way to your ROAS target"
- ❌ No Core Web Vitals data fed in — Google's actual field data on page performance not used here

---

### 2.3 CrossChannelOverview (`/api/ai/overview-narrative`)

**What it does:**  
Produces a strategic marketing narrative across ALL active channels simultaneously. Analyses budget allocation, channel synergy, full funnel, website health, and organic foundation.

**Strengths:**
- ✅ The most strategically coherent prompt in the system — the system prompt explicitly models 5 analytical frameworks (budget allocation, channel synergy, full funnel, website health, organic foundation)
- ✅ Includes aggregated paid totals (blended ROAS, blended CPA)
- ✅ Receives campaign highlights and computed anomaly alerts
- ✅ Channel efficiency matrix with health scores and trend %
- ✅ Provides `channelScores` (per-channel 0-100) + `overallScore` + `crossChannelInsights` + `budgetRecommendation`

**Weaknesses:**
- ❌ Hard-coded to 5 channels: googleads, meta, ga4, seo, searchconsole. TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube **not included in cross-channel analysis**
- ❌ No e-commerce revenue data (WooCommerce/Shopify orders, revenue, AOV) — a client's actual business revenue is invisible to the cross-channel AI
- ❌ `PlatformMetrics` type is defined but only those 5 channels are explicitly typed
- ❌ No seasonality context — the AI doesn't know if it's Christmas, Black Friday, or back-to-school
- ❌ No call volume / offline conversion data (CallRail)
- ❌ No email revenue contribution (Klaviyo) included in blended totals

---

### 2.4 Report Commentary (`/api/ai/report-commentary`)

**What it does:**  
Generates client-facing section commentary for the report editor. Tone (5 options including the memorable "roadman"), length (short/medium/long), and format (prose/bullets/both) are all configurable.

**Strengths:**
- ✅ Reads `aiReportInstructions` from the client DB record — genuine per-client personalisation
- ✅ 5 tone options, 3 length options, 3 format options — good flexibility
- ✅ Strong system prompt discipline: never mention absence of channels, never say "unfortunately"
- ✅ First-person agency voice ("we saw", "our focus")

**Weaknesses:**
- ❌ Receives only account-level metrics (no campaign data, no landing pages) — commentary will always be more surface-level than AiInsightsPanel
- ❌ No previous-period context fed to the overview/intro section type
- ❌ Not linked to the client's goal progress — commentary could reference "we're 85% to your ROAS target"
- ❌ Tone options not exposed to the client portal (clients can't choose their preferred tone)
- ❌ No seasonal awareness — July commentary could reference school holidays for retail clients if we fed that context
- ❌ `report-commentary` reads `OPENAI_API_KEY` env directly, never checks the DB `AppSetting` — inconsistent with other endpoints

---

### 2.5 Executive Summary (`/api/ai/executive-summary`)

**What it does:**  
Takes the already-generated section commentaries (text strings) and distils them into 4–6 executive bullet points.

**Strengths:**
- ✅ Reads `aiReportInstructions` from DB — personalised output
- ✅ Strong concision — caps input at 600 chars per section to avoid bloat

**Weaknesses:**
- ❌ Works on the commentary text, not the raw metrics — so it's summarising summaries, with data dilution
- ❌ No awareness of the report's KPI goals — can't open with "This month we hit 3 of 4 KPI targets"
- ❌ Output is always 4–6 bullets regardless of how many channels are active — a client with 1 channel gets the same format as one with 8
- ❌ No sentiment signal — can't produce a more celebratory tone when all metrics are up

---

### 2.6 Performance Forecast (`/api/ai/forecast`)

**What it does:**  
Produces 30/60/90-day projections for sessions, conversions, revenue, spend, and ROAS with confidence bands.

**Strengths:**
- ✅ Uses `MetricSnapshot` historical data (up to 90 periods)
- ✅ Produces confidence bands (high/medium/low) based on data quality

**Weaknesses:**
- ❌ The prompt just dumps raw JSON snapshots — no pre-processing to identify trends, seasonality indices, or YoY comparisons. GPT-4o-mini is doing all the maths, which is unreliable for numerical extrapolation
- ❌ No channel breakdown — forecasts sessions/conversions as single numbers. A marketer needs "GA4 sessions will be ±12%, Google Ads conversions will drop 8% due to seasonal CPC increases"
- ❌ Only 20 snapshots sliced into the prompt despite fetching 90 — the first 70 are discarded
- ❌ No awareness of upcoming seasonal events, planned campaigns, or budget changes
- ❌ The forecast data is not persisted to `MetricSnapshot` or any other model — forecasts are ephemeral
- ❌ No confidence calibration tracking — we never know if our forecasts were accurate

---

### 2.7 Budget Advisor (`/api/ai/budget-advisor`)

**What it does:**  
Analyses cross-channel spend efficiency and proposes reallocation with projected revenue impact.

**Strengths:**
- ✅ Saves to `BudgetRecommendation` model — historical tracking possible
- ✅ Produces per-channel recommended budget with current vs recommended comparison

**Weaknesses:**
- ❌ Receives `channelMetrics` from the caller but this is just `{ spend, roas?, cpa?, impressionShare?, conversions? }` — no campaign-level context, no impression share data, no budget cap constraints, no audience saturation signals
- ❌ GPT-4o-mini is being asked to recommend specific £ budget amounts with no knowledge of what the client's actual total budget is or what their contracted spend is
- ❌ No awareness of contracted hours or agency fee structure — budget reallocation could conflict with the service agreement
- ❌ Recommendations are not linked to the Goals system — if the client has a CPA target, the budget advice should be oriented around achieving it
- ❌ No lifetime budget / monthly cap awareness — recommending doubling Meta budget when the client is on a fixed £2,000/month plan is useless

---

### 2.8 Attribution Modelling (`/api/ai/attribution`)

**What it does:**  
Computes 5 attribution models (Last Click, First Click, Linear, Time Decay, Position-Based) algorithmically in-code, then asks GPT to narrate the results.

**Strengths:**
- ✅ Attribution maths runs deterministically in TypeScript — correct and reliable
- ✅ AI adds narrative value explaining which channels are over/undervalued
- ✅ Uses `AppSetting` DB key (correct pattern for auth)

**Weaknesses:**
- ❌ The model uses `avgPosition` to proxy channel order in the funnel — but `avgPosition` here is Search Console position rank (1.0 = top of SERP), not customer journey position. This is a data modelling error: a channel at position 1.2 in search would get "last click" credit, which is wrong.
- ❌ No actual journey data — real multi-touch attribution requires impression/click timestamps per session. We're computing fake attribution on aggregated conversion counts
- ❌ The AI narrative prompt is only 600 tokens — insufficient to explain meaningfully which model to use and why
- ❌ No Data-Driven Attribution (DDA) model — Google uses ML-based DDA which agencies increasingly recommend
- ❌ Results not saved to any model — can't track how attribution picture changes over time

---

### 2.9 Creative Intelligence (`/api/ai/creative-intelligence`)

**What it does:**  
Analyses creative-level performance data for Meta or Google Ads, identifying patterns in top vs underperforming creatives and producing a creative brief.

**Strengths:**
- ✅ Slices top 30 creatives — good breadth
- ✅ Produces `pauseRecommendations` with specific creative names
- ✅ Produces a `creativeBrief` the team can act on immediately

**Weaknesses:**
- ❌ The creative data shape only accepts `{ name, spend, impressions, clicks, ctr, conversions, roas, format, headline, description }` — **no video performance data** (video views, completion rate, 3-second view rate, thumb-stop rate) — critical for TikTok and Meta Reels
- ❌ No image/thumbnail URL or creative visual described — AI can't know if a creative uses a person's face, a product shot, or text-on-image
- ❌ TikTok has its own creative endpoint but there's no `TikTokCreativeIntelligence` call
- ❌ For Google Ads, RSA (Responsive Search Ads) assets (individual headlines + descriptions with performance ratings) are not fed in — only campaign-level data
- ❌ No frequency data per creative — the most important fatigue signal is impressions per unique user per ad, not just aggregate frequency

---

### 2.10 Strategy Document (`/api/ai/strategy-document`)

**What it does:**  
Generates a 10-section quarterly strategy document per client.

**Strengths:**
- ✅ Broad scope — 10 sections covering performance, wins, challenges, competitor, opportunities, channel strategy, budget, content, technical, KPIs
- ✅ Saves to `StrategyDocument` model with optional share token
- ✅ Accepts `crossPlatformData` payload — can receive everything

**Weaknesses:**
- ❌ Prompt uses `gpt-4o-mini` with `max_tokens: 3000` — a 10-section strategy document at this budget will inevitably be shallow, generic, and templated
- ❌ `crossPlatformData` is `Record<string, unknown>` — the caller must know what to send. The endpoint itself doesn't fetch any data from the DB; it relies entirely on the client to assemble the payload
- ❌ KPI targets in the output use "current" and "target" as strings — completely invented by the AI rather than pulled from the actual `ClientGoal` records
- ❌ No previous strategy documents context — each document is generated in isolation; it cannot say "last quarter we committed to X, here's how we did"
- ❌ `channelStrategy` in the output has hard-coded keys: `paid_search`, `paid_social`, `seo`, `email`, `overall` — other channels (TikTok, LinkedIn, YouTube, Display) get ignored

---

### 2.11 Root Cause Analysis (`/api/ai/root-cause`)

**What it does:**  
Deep-dive investigation of a specific anomaly, pulling 12 periods of platform-specific history AND 30 cross-platform snapshots, then producing a structured 7-section root cause analysis.

**Strengths:**
- ✅ Best use of historical data in the platform — 12 platform-specific periods + 30 cross-channel periods
- ✅ Well-structured output (hypothesis, evidence, cross-channel correlation, historical context, confidence, actions, monitoring plan)
- ✅ Cross-channel correlation is genuine — checks all other platforms' snapshot data for correlated patterns

**Weaknesses:**
- ❌ `gpt-4o-mini` at `max_tokens: 2000` — for a detailed 7-section structured analysis with numerical evidence, this is too constrained
- ❌ Output is plain Markdown text, not structured JSON — UI has to render raw text, making it harder to create interactive components (expandable sections, confidence badges, action items that link to the Actions system)
- ❌ No deduplication — if the same root cause is triggered multiple times for the same anomaly (user re-generates), all results are ephemeral; nothing is saved to the DB

---

### 2.12 Landing Page Analysis (`/api/ai/landing-page-analysis`)

**What it does:**  
Full CRO/SEO/Mobile/Forms audit of up to 10 URLs. For successful fetches, uses HTML signal extraction. For failed fetches (bot-blocking, HTTPS errors), falls back to OpenAI web_search_preview tool.

**Strengths:**
- ✅ The only endpoint that uses OpenAI's `responses.create` with `web_search_preview` tool — genuinely smarter than the others for real-world page analysis
- ✅ 4-dimensional scoring (CRO, SEO, Mobile, Forms) with per-category issues and recommendations
- ✅ Parallel processing of all URLs

**Weaknesses:**
- ❌ No integration with CrUX/Core Web Vitals data — the AI scores mobile readiness from HTML signals, not real user data
- ❌ No comparison to competitor pages — "your CTA density is lower than the top 3 Google results for your keyword"
- ❌ No heat map data, scroll depth, or session recording data — purely structural analysis
- ❌ Web search fallback calls `gpt-4o-mini` with `web_search_preview` but `gpt-4o-mini` may not always have internet access in all deployment environments
- ❌ Page signals fetcher (`fetchPageSignals`) has a 10-second timeout — legitimate slow pages just get `fetchError` and lose HTML analysis quality

---

### 2.13 AI Chat (`/api/ai/chat`)

**What it does:**  
Conversational interface preloaded with the client's `MetricSnapshot` history (last 30 records).

**Strengths:**
- ✅ Conversation history persisted in `ClientConversation` model
- ✅ Lists connected platforms in the system prompt so AI knows what data exists
- ✅ Multi-turn: last 10 messages passed as context on each turn
- ✅ Uses session-scoped DB key lookup pattern

**Weaknesses:**
- ❌ Context is limited to `MetricSnapshot` data — the chat AI cannot access live API data, only historical snapshots. If a user asks "what are my campaigns doing RIGHT NOW?", the AI can only answer from the last snapshot
- ❌ Snapshots are raw JSON strings, not pre-formatted — the AI has to parse `{"sessions":12042,"bounceRate":0.34}` rather than "12,042 sessions, 34% bounce rate"
- ❌ The system prompt lists platform connections but **doesn't include their data** — just flags like "GA4" without any actual numbers
- ❌ No function calling / tool use — the chat could theoretically call `/api/ga4`, `/api/google-ads`, etc. live to answer real-time questions
- ❌ No memory beyond the current session — each conversation starts fresh apart from the last 50 messages
- ❌ No suggested follow-up questions generated — UI has static prompt suggestions that don't adapt to what the data actually shows

---

### 2.14 Competitor Intelligence (`/api/competitor-intelligence`)

**What it does:**  
Pulls SemRush domain overview metrics, saves to `CompetitorSnapshot`, and generates 2-3 sentences of AI insight.

**Weaknesses:**
- ❌ Only 200 max tokens for competitor analysis — producing 2-3 generic sentences about organic traffic is not useful to a marketer
- ❌ No cross-competitor comparison — the AI looks at each competitor in isolation, never comparing "Competitor A is outperforming Competitor B and catching up to you"
- ❌ No client context — the AI doesn't know who the client is or how the competitor relates to them
- ❌ No actionable outputs — "their organic traffic is growing" without "here's what they're doing and how to respond"

---

### 2.15 Media Plan Forecast (`/api/tools/media-plan/[id]/forecast`)

**What it does:**  
Generates per-channel projected metrics (impressions, clicks, CTR, conversions, CPA, CPM) for a planned media schedule.

**Weaknesses:**
- ❌ No historical client performance data fed in — AI is forecasting in a vacuum with no benchmarks
- ❌ Industry benchmarks not included — the AI has no knowledge of typical CTRs, CPMs, or CPAs for the client's sector
- ❌ No competitive intelligence context — CPMs on TikTok are higher in Q4; the AI doesn't know this without being told
- ❌ Forecast saved to `MediaPlan.forecast` JSON but not linked to `MetricSnapshot` — no way to compare actual vs forecast post-campaign

---

## 3. Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     CLIENT DASHBOARD LOAD                          │
│  Date range selected → Each section component fetches its API      │
└─────────────────────────────┬──────────────────────────────────────┘
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
   GA4Section          GoogleAdsSection       MetaSection
   SemrushSection      SearchConsoleSection   TikTokSection
   MicrosoftSection    LinkedInSection        KlaviyoSection
   YouTubeSection      HubSpotSection         CallRailSection
                              │
                              ▼
          ┌────────── onMetricsReady() ──────────────┐
          │  Fires after data loads                  │
          │  → POST /api/ai/snapshots                │
          │    (upserts MetricSnapshot for period)   │
          └──────────────────────────────────────────┘
                              │
          ┌───────────────────┼─────────────────────────┐
          ▼                   ▼                         ▼
   AiInsightsPanel    SuperSummary              CrossChannelOverview
   (/api/ai/summary)  (/api/ai/super-summary)   (/api/ai/overview-narrative)
          │
   onPreviousMetricsReady() ──► ReportView.sectionPreviousMetrics
                                      │
                                      ▼
                             /api/ai/report-commentary
                             /api/ai/executive-summary

Cross-platform context flow:
Each section passes its summary metrics to ClientDashboard
ClientDashboard builds crossPlatformContext string from all loaded sections
This string is passed to each section's AiInsightsPanel / SuperSummary
```

**Snapshot persistence flow:**
- `MetricSnapshot` is written after every section load (upsert by clientId+sectionType+period)
- `/api/ai/snapshots` (GET) returns last 6–12 periods for a client+section
- `/api/ai/forecast`, `/api/ai/root-cause`, `/api/ai/chat` all query `MetricSnapshot` directly from DB
- `BudgetRecommendation` and `StrategyDocument` are the only AI outputs that persist to DB

---

## 4. What Data Is Available vs What AI Actually Sees

| Data Source | Available in DB/API | Fed to AI? | Notes |
|-------------|---------------------|------------|-------|
| GA4 sessions/users/pageviews | ✅ MetricSnapshot | ✅ Most endpoints | |
| GA4 demographics (age/gender) | ✅ GA4 API | ❌ | Never included in prompts |
| GA4 channel grouping | ✅ GA4 API | ❌ | |
| GA4 landing pages | ✅ GA4 API | ✅ SuperSummary only | |
| GA4 AI referrals (ChatGPT etc) | ✅ GA4 API | ❌ | |
| Search Console queries | ✅ GSC API | ✅ via extraContext | |
| Search Console page rankings | ✅ GSC API | ✅ | |
| SemRush keywords + positions | ✅ SemRush API | ✅ via extraContext | |
| Competitor domains + metrics | ✅ CompetitorSnapshot | ❌ in dashboard AI | Only in competitor endpoint |
| Google Ads campaign ROAS/CPA | ✅ Google Ads API | ✅ | |
| Google Ads RSA asset performance | ✅ Google Ads API | ❌ | |
| Google Ads audience segments | ✅ Google Ads API | ❌ | |
| Meta campaign spend/ROAS | ✅ Meta API | ✅ | |
| Meta ad-level creative data | ✅ Meta API | ✅ creative-intelligence | |
| Meta video view metrics | ✅ Meta API | ❌ | Not in creative data shape |
| Meta audience insights | ✅ Meta API | ❌ | |
| TikTok campaign metrics | ✅ MetricSnapshot | ✅ AiInsightsPanel | Via summary endpoint |
| TikTok video completion rates | ✅ TikTok API | ❌ | Not extracted |
| Microsoft Ads metrics | ✅ MetricSnapshot | ✅ AiInsightsPanel | Via summary endpoint |
| LinkedIn campaign metrics | ✅ MetricSnapshot | ✅ AiInsightsPanel | Via summary endpoint |
| Klaviyo email metrics | ✅ MetricSnapshot | ✅ AiInsightsPanel | Via summary endpoint |
| YouTube view/watch time | ✅ YouTube API | ❌ | No AI on YouTube tab |
| HubSpot deals/pipeline | ✅ HubSpot API | ❌ | No AI on HubSpot tab |
| CallRail call data | ✅ CallRail API | ❌ | No AI on CallRail tab |
| WooCommerce orders/revenue | ✅ WooCommerce API | ❌ | Not in any AI prompt |
| Shopify orders/revenue | ✅ Shopify API | ❌ | Not in any AI prompt |
| Core Web Vitals (CrUX) | ✅ CrUX API | ❌ | Not fed into landing page AI |
| Client goals (ClientGoal) | ✅ DB | ❌ | Never referenced in any AI prompt |
| Actions (ClientAction) | ✅ DB | ❌ | AI can't see what was actioned |
| Communications (ClientComm) | ✅ DB | ❌ | |
| Contracted hours | ✅ DB (JSON) | ❌ | |
| Previous strategy documents | ✅ DB | ❌ | Each strategy is generated in isolation |
| Budget recommendations history | ✅ DB | ❌ | Budget advisor doesn't look at its own history |
| Report approval notes | ✅ DB | ❌ | |
| Client AI instructions | ✅ DB | ✅ report-commentary, executive-summary | Only 2 of 18 endpoints respect this |

---

## 5. Current Gaps & Weaknesses

### 5.1 Critical Gaps

**1. ~~No goal awareness across any AI component~~** ✅ FIXED  
~~Every prompt asks "how are we performing?" but never "are we on track for the client's targets?".~~ `ClientGoal` data is now injected into summary, overview-narrative, and report-commentary prompts with progress tracking.

**2. ~~E-commerce revenue is invisible~~** ✅ FIXED  
~~WooCommerce and Shopify order data was never sent to any AI endpoint.~~ E-commerce data (revenue, orders, AOV) is now fed into overview-narrative, budget-advisor, forecast, and report-commentary.

**3. ~~TikTok/LinkedIn/YouTube/HubSpot/CallRail excluded from cross-channel AI~~** ✅ FIXED  
~~The `overview-narrative` endpoint had `PlatformMetrics` typed for only 5 channels.~~ All 12 channel types are now supported in overview-narrative. YouTube, HubSpot, and CallRail now have AiInsightsPanel on their dashboard tabs.

**4. Model used everywhere: gpt-4o-mini**  
This model is fast and cheap but has meaningful limitations for complex, multi-document reasoning tasks like strategy documents and root cause analysis. There is no routing logic to escalate to a more capable model for higher-stakes requests.

**5. ~~Per-client AI instructions only used in 2/18 endpoints~~** ✅ FIXED  
~~`client.aiReportInstructions` was only read by `report-commentary` and `executive-summary`.~~ Now injected into all 10 relevant AI endpoints (summary, super-summary, overview-narrative, strategy-document, root-cause, chat, budget-advisor, creative-intelligence + the original 2).

**6. No AI output quality feedback loop**  
There is no mechanism for users to rate AI outputs (thumbs up/down, edit, reject). Without this signal, prompts cannot be improved based on real-world usage. Anomaly detection thresholds (>15%, >30%, >50%) were set once and never adjusted.

**7. ~~No streaming~~** ✅ FIXED  
~~All AI endpoints returned full responses synchronously.~~ strategy-document, super-summary, root-cause, and overview-narrative now support `stream: true` parameter for SSE streaming responses.

**8. ~~API key management inconsistency~~** ✅ FIXED  
~~8 of 18 endpoints read `OPENAI_API_KEY` directly from `process.env`.~~ All 18 endpoints now use the shared `getOpenAiClient()` utility from `src/lib/openai-client.ts` which checks `AppSetting` DB first.

---

### 5.2 Structural Weaknesses

**Prompt quality variance across endpoints:**
- `overview-narrative` and `super-summary` have sophisticated, structured system prompts with clear analytical frameworks
- `budget-advisor`, `creative-intelligence`, and `competitor-intelligence` have minimal prompts that could be vastly improved
- `forecast` has no system prompt at all — just a user message

**Token budget constraints:**
- `forecast`: 1,500 tokens max — barely enough for 3 periods × 6 metrics
- `executive-summary`: 450 tokens max — 4-6 bullets at this budget will be very short
- `competitor-intelligence`: 200 tokens max — unusable for real analysis
- `strategy-document`: 3,000 tokens for a 10-section document — each section averages 300 tokens

**No caching or deduplication:**  
Every button press fires a fresh API call. Identical requests (same client, same period, same data) hit OpenAI repeatedly. A hash-based cache on the prompt context could save significant cost.

---

## 6. Improvement Recommendations

### Priority 1 — Immediate (1–2 weeks)

**P1.1: Standardise API key resolution across all 18 endpoints**  
Create a shared `getOpenAiKey()` utility that checks `AppSetting` first, then falls back to `OPENAI_API_KEY`. Apply to all 18 endpoints. Currently only 4 endpoints use the DB-first pattern.

```typescript
// lib/openai-client.ts
export async function getOpenAiKey(): Promise<string> {
  const setting = await prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } });
  const key = setting?.value || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API key not configured. Please add it in Settings.");
  return key;
}
```

**P1.2: Inject `client.aiReportInstructions` into all remaining AI endpoints**  
Currently only 2 endpoints use per-client instructions. Extend to: `summary`, `super-summary`, `overview-narrative`, `strategy-document`, `root-cause`, `chat`, `budget-advisor`, `creative-intelligence`. This is the highest-leverage personalisation feature already built — it just needs to be wired up.

**P1.3: Inject `ClientGoal` data into summary, overview-narrative, and report-commentary**  
Fetch the client's active goals at the start of each AI request and append them to the prompt:

```
ACTIVE CLIENT GOALS:
• Achieve ROAS ≥ 4.0x by 31 March (currently: 3.2x — 80% to target, AT RISK)
• Grow organic sessions to 5,000/month by 30 June (currently: 3,842 — 77%, ON TRACK)
```

This transforms generic commentary into progress-oriented reporting that clients actually care about.

**P1.4: Add YouTube, HubSpot, and CallRail AI insights panels**  
`AiInsightsPanel` works for any `sectionType` as long as metrics and section config are provided. Add entries to `SECTION_CONFIGS` in `/api/ai/summary/route.ts` for `youtube`, `hubspot`, and `callrail`, and render `AiInsightsPanel` on those dashboard tabs.

---

### Priority 2 — High Impact (2–4 weeks)

**P2.1: Extend `overview-narrative` to include all 10+ channels**  
Refactor `PlatformMetrics` type to accept TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, and CallRail. Update the prompt builder to include their data blocks. Update `channelScores` output to include all active channels.

**P2.2: Feed e-commerce revenue into AI**  
WooCommerce/Shopify order data is available. Pass `{ orders, revenue, aov, topProducts }` to: `overview-narrative`, `budget-advisor`, `forecast`, and `report-commentary`. A marketer's primary metric is revenue — the AI currently cannot discuss it.

**P2.3: Add streaming to long-running endpoints**  
Convert `strategy-document`, `super-summary`, `root-cause`, and `overview-narrative` to use `openai.chat.completions.create({ stream: true })` and return `ReadableStream`. Use `useChat` or a custom hook on the frontend. This eliminates the 10-20 second blank loading state.

**P2.4: Improve forecast quality with pre-computed trends**  
Instead of dumping raw JSON snapshots, pre-compute:
- Month-over-month trend (mean %)
- Season index per month (if 12+ months of data)
- YoY comparison if available
- Variance coefficient (data quality signal)

Pass these computations to GPT rather than raw numbers — it will produce far more accurate narratives and confidence levels.

**P2.5: Competitor context in dashboard AI**  
The `CompetitorSnapshot` table holds SemRush metrics for competitor domains. When generating `AiInsightsPanel` for the SEO/SemRush tab, fetch the latest competitor snapshots and append:

```
COMPETITOR LANDSCAPE:
• competitor.com: 45,000 organic traffic (+12% MoM), 8,200 keywords, DA 52
• rival.co.uk: 28,000 organic traffic (-3% MoM), 5,100 keywords, DA 41
Your organic traffic: 12,400 (+8% MoM)
```

This makes SEO AI insights genuinely competitive rather than just describing the client's own numbers.

---

### Priority 3 — Innovate (1–3 months)

**P3.1: AI-powered Goal Setting Assistant**  
When an agency creates a new goal, offer an AI "benchmark" button that:
1. Looks at the last 6 months of `MetricSnapshot` data for that metric
2. Computes realistic growth trajectories (conservative/moderate/aggressive)
3. Benchmarks against industry averages (from prompt knowledge or SemRush competitive data)
4. Suggests a target and deadline with confidence scoring

This prevents both under-ambitious goals and unrealistic ones.

**P3.2: Anomaly Memory + Pattern Learning**  
Store detected anomalies in a `DetectedAnomaly` model (clientId, platform, metric, severity, period, rootCauseText). When a new anomaly is detected:
- Check if the same metric on the same platform had an anomaly in prior periods
- If yes, include that history in the root-cause prompt: "This is the 3rd consecutive month CPA has risen >20%. The previous root cause analyses identified [X] and [Y]."
- Track which recommended actions were taken via the `ClientAction` model

This creates a learning system rather than goldfish-memory one-shot analysis.

**P3.3: Pre-Meeting Briefing Generator**  
A one-click "Generate briefing" button on any client dashboard that produces a 1-page concise brief specifically for agency-client meetings:
- 3 biggest wins since last meeting
- 3 most important decisions needed
- 3 action items agreed vs 3 new items proposed
- Upcoming risks (seasonality, budget pacing, competitor moves)
- One-line status on each active goal

Uses a structured prompt with `StrategyDocument` + `ClientAction` + `MetricSnapshot` + `ClientGoal` context. Output saved as a `StrategyDocument` variant with `type: "briefing"`.

**P3.4: Intelligent Report Narrative stitching**  
Currently each report section is generated independently. Add a `POST /api/ai/report-narrative` endpoint that:
1. Receives ALL section commentaries + ALL metrics
2. Identifies cross-section stories (e.g. "Google Ads CTR improved because we refreshed creatives last month, which is also why GA4 engagement rate lifted")
3. Injects cross-section connection sentences into the appropriate commentaries
4. Rewrites the executive summary last, once the full picture is assembled

**P3.5: Real-time anomaly push notifications with AI context**  
The daily cron snapshot job already runs at 2:00 UTC. After writing each `MetricSnapshot`, run anomaly detection logic in the cron worker. For any `high` severity anomaly:
1. Generate a 2-sentence AI root cause hypothesis (fast, low-token)
2. Create a `Notification` record of type `anomaly`
3. Send email/Slack alert with the AI hypothesis included

This means the marketer wakes up to "Sessions dropped 40% overnight. Likely cause: Google algorithm update affecting [category] pages — 3 similar pattern detected in March 2025."

**P3.6: AI-powered Action Recommendations from Reports**  
When a report is approved (`approvalStatus === "approved"`), automatically trigger an AI call that:
1. Reviews the approved report commentary and AI insights
2. Extracts concrete action items
3. Creates `ClientAction` records with priority, description, and assigned platform
4. Notifies the assigned team member

The report-to-action loop currently requires manual copy-paste.

**P3.7: Blended Revenue Attribution**  
Combine e-commerce revenue (WooCommerce/Shopify orders) + Klaviyo revenue + Google Ads conversion value + Meta conversion value to produce a single reconciled revenue picture. Feed this into the budget advisor as "true" business revenue rather than platform-reported conversion values (which double-count cross-device and view-through). This is the #1 data quality problem that undermines every ROAS calculation.

**P3.8: AI Visibility (GEO) Monitoring**  
The GA4 section already detects traffic from ChatGPT, Claude, Perplexity, Gemini, and Copilot (AI referrals). Extend this into a dedicated "AI Visibility" score:
- Track month-over-month trend of AI referral traffic
- Cross-reference with SemRush keyword rankings for "zero-click" queries
- Use the LLM Generator's content structure as a signal of AI-search readiness
- AI-generated recommendation: "Your ChatGPT referral traffic grew 40% — here are 5 actions to accelerate your AI search presence"

This is an emerging channel that clients are increasingly asking about.

---

## 7. What If: Claude Sonnet / Opus Integration

### 7.1 Current State

Every AI call in the platform uses OpenAI's `gpt-4o-mini`. The OpenAI Node.js SDK is used throughout, with a consistent client pattern. The dependency is:

```json
"openai": "^4.x"
```

### 7.2 Claude API: What's Different

Anthropic's Claude API (available via `@anthropic-ai/sdk`) uses a similar REST pattern to OpenAI but with key structural differences:

| Aspect | OpenAI (current) | Claude Sonnet/Opus |
|--------|------------------|--------------------|
| SDK | `openai` npm | `@anthropic-ai/sdk` npm |
| Message format | `{ role, content }` | `{ role, content }` (similar) |
| System prompt | `messages[0].role = "system"` | Separate `system` parameter |
| Streaming | `stream: true` in `create()` | `stream()` method |
| JSON mode | `response_format: { type: "json_object" }` | Requires prompt instruction (no native JSON mode in claude-3.x; claude-3-5-sonnet+ has tool use for structured output) |
| Max tokens | `max_tokens` | `max_tokens` (same) |
| Context window | 128k (gpt-4o-mini) | 200k (Sonnet/Opus) — **56% more** |
| Cost (input) | ~$0.15/1M tokens | Sonnet 3.5: ~$3/1M tokens (20× more) |
| Cost (output) | ~$0.60/1M tokens | Sonnet 3.5: ~$15/1M tokens (25× more) |

### 7.3 What Claude Sonnet Would Unlock

**Claude Sonnet 3.5 / 3.7 strengths that matter for marketing AI:**

1. **Longer coherent documents**  
   Strategy documents, comprehensive quarterly reviews, multi-channel narratives — Claude produces substantially more coherent long-form text than gpt-4o-mini. A strategy document that currently reads as a templated bulleted list could become a genuinely persuasive client-facing document.

2. **Better instruction following for complex prompts**  
   The overview-narrative and super-summary prompts are long and nuanced. Claude Sonnet has notably better adherence to complex, multi-constraint instructions (e.g. "mention specific campaign names AND give a journey assessment AND produce 5 distinct actions AND score the channels AND don't mention channels not in the active list").

3. **200k context window**  
   Pass full 12-month MetricSnapshot history, all competitor snapshots, all active goals, all previous strategy documents, and full campaign data in a single prompt without chunking or truncation.

4. **Claude Opus 4 / 4.5 for strategic reasoning**  
   Opus-class models demonstrate markedly better causal reasoning — "sessions dropped because impression share fell because budget ran out because the campaign hit its monthly cap on day 22". This is the quality gap that most affects root-cause analysis and strategy documents.

5. **Reduced hallucination on numerical tasks**  
   Claude Sonnet hallucinates specific numbers less often than gpt-4o-mini under constrained prompts, which matters for budget recommendations and forecast confidence levels.

### 7.4 Proposed Hybrid Architecture

Rather than a wholesale replacement, the optimal approach is **model routing based on task complexity and commercial stakes**:

| Task | Current | Proposed | Rationale |
|------|---------|----------|-----------|
| Alert recommendations (per-signal) | gpt-4o-mini | gpt-4o-mini ✅ | Low stakes, high frequency, latency-sensitive |
| Section AiInsightsPanel | gpt-4o-mini | gpt-4o-mini ✅ | Called frequently; volume-sensitive |
| Report commentary | gpt-4o-mini | gpt-4o-mini ✅ | Repetitive template task |
| Executive summary | gpt-4o-mini | gpt-4o-mini ✅ | Short output, simple task |
| Overview narrative | gpt-4o-mini | **Claude Sonnet** | Cross-channel analysis benefits from better reasoning |
| SuperSummary | gpt-4o-mini | **Claude Sonnet** | Full-funnel narrative + page crawl needs coherence |
| Root cause analysis | gpt-4o-mini | **Claude Sonnet/Opus** | Causal reasoning is Claude's standout strength |
| Strategy document | gpt-4o-mini | **Claude Opus** | Long-form, high-stakes, client-facing |
| Forecast | gpt-4o-mini | **Claude Sonnet** | Better numerical reasoning |
| Budget advisor | gpt-4o-mini | **Claude Sonnet** | High commercial stakes |
| Creative intelligence | gpt-4o-mini | **Claude Sonnet** | Pattern recognition in creative data |
| Chat (conversational) | gpt-4o-mini | gpt-4o-mini ✅ | Latency-critical; no complex reasoning needed |
| Landing page analysis | gpt-4o-mini | gpt-4o-mini ✅ | Works well; large batch size |
| Proposal generation | gpt-4o-mini | **Claude Sonnet** | Long-form, persuasive copy |

### 7.5 Implementation Path

**Approach A: Drop-in replacement (low risk, 1–2 days)**

Install the Anthropic SDK and add Claude as an alternative via an environment variable or AppSetting:

```typescript
// lib/ai-client.ts
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export async function createAICompletion(options: {
  model?: "gpt-4o-mini" | "claude-sonnet" | "claude-opus";
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string> {
  const provider = await getAIProvider(); // "openai" | "claude"
  
  if (provider === "claude") {
    const client = new Anthropic({ apiKey: await getClaudeKey() });
    const response = await client.messages.create({
      model: options.model === "claude-opus" ? "claude-opus-4-5" : "claude-sonnet-4-5",
      max_tokens: options.maxTokens,
      system: options.systemPrompt + (options.jsonMode ? "\n\nRespond with valid JSON only." : ""),
      messages: [{ role: "user", content: options.userPrompt }],
      temperature: options.temperature ?? 0.3,
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }
  
  const client = new OpenAI({ apiKey: await getOpenAIKey() });
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt },
    ],
    max_tokens: options.maxTokens,
    temperature: options.temperature ?? 0.3,
    ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });
  return response.choices[0]?.message?.content ?? "";
}
```

All 18 endpoints can be refactored to use this single helper, with a `provider` AppSetting controlling which model runs.

**Approach B: Per-task model selection (moderate risk, 1–2 weeks)**

Add a `model` field to the AppSetting UI that allows selecting per-task model routing:
- "Fast" tasks: always gpt-4o-mini
- "Deep analysis" tasks: Claude Sonnet (configurable)
- "Strategic documents": Claude Opus (configurable)

**Approach C: A/B routing with quality scoring (advanced, 4–6 weeks)**

Run identical prompts against both models for high-stakes requests, ask a lightweight model to score both outputs (0–10 on specificity, accuracy, actionability), return the higher-scoring result, and log the comparison to improve routing decisions over time.

### 7.6 What If We Integrated Claude Natively (Full Replacement)

If the decision were to switch entirely to Claude:

**Wins:**
- ✅ 200k context window removes all current context limits
- ✅ Substantially better strategy documents and root cause narratives
- ✅ Claude's Constitutional AI training makes it less likely to produce outputs that could embarrass the agency (e.g. inappropriate tone, fabricated data)
- ✅ Anthropic's streaming API is clean and idiomatic
- ✅ `claude-haiku-3-5` is competitive with gpt-4o-mini on cost for the fast tasks

**Risks:**
- ❌ Claude doesn't natively support `response_format: { type: "json_object" }` in the same way — all JSON-mode endpoints would need prompt-level instruction changes and more robust JSON extraction
- ❌ Cost increase of 15–25× on the premium tasks (Opus/Sonnet vs gpt-4o-mini)
- ❌ `web_search_preview` tool is OpenAI-specific — the landing-page-analysis fallback for bot-blocked pages would break and would need to use a separate web crawl service (Firecrawl, Jina.ai)
- ❌ OpenAI Responses API (used for web search) has no Claude equivalent — different product surface

### 7.7 What Is Genuinely Possible with Claude Opus

If the agency invested in Claude Opus for its highest-stakes prompts, the following would become realistic:

1. **A genuinely persuasive quarterly strategy document** — not a bulleted template, but a properly argued narrative that sounds like a senior strategist wrote it, with coherent through-lines from performance data to strategic recommendations.

2. **Real root cause analysis that follows causal chains** — "Your CPA rose because budget ran out on day 18, which pushed spend to brand terms (lower intent), which reduced conversion rate, which in turn appears to have triggered Smart Bidding's learning phase to reset." Current gpt-4o-mini often stops at the first plausible hypothesis.

3. **Multi-document synthesis** — pass the last 4 strategy documents, 6 months of snapshots, the current goals, and the client's AI instructions, and get a strategy recommendation that genuinely builds on history.

4. **Creative brief that learns from past** — feed 6 months of creative performance data and Claude Opus can identify non-obvious creative patterns (e.g. "ads featuring a human face consistently outperform product-only shots by 40% for this client, across all seasonal periods").

5. **Proactive client communication drafts** — "Based on this month's performance, here's a draft email to the client explaining the CPA increase with proposed remediation steps and a revised forecast." The agency saves 30 minutes of email writing per client per month.

---

*This document should be reviewed and updated quarterly. Prompt quality improvements should be version-controlled alongside code changes. AI output quality metrics should be tracked systematically once a rating mechanism is implemented.*
