# Feature Reference — Betts & Burton Report Platform

Comprehensive feature documentation including data flow architecture, AI system design, and per-feature walkthrough. For system architecture and database schema, see [architecture.md](architecture.md). For setup and deployment, see [deployment.md](deployment.md).

---

## Table of Contents

- [Data Flows](#data-flows)
  - [Authentication Flow](#authentication-flow)
  - [Platform Data Pipeline](#platform-data-pipeline)
  - [Cross-Platform Context Flow](#cross-platform-context-flow)
  - [Report Generation Flow](#report-generation-flow)
  - [PDF Export Flow](#pdf-export-flow)
  - [Share Link Flow](#share-link-flow)
- [AI Flows](#ai-flows)
  - [AI Architecture Overview](#ai-architecture-overview)
  - [Anomaly Detection Engine](#anomaly-detection-engine)
  - [AI Summary Generation](#ai-summary-generation)
  - [Super Summary (Journey Analysis)](#super-summary-journey-analysis)
  - [Report Commentary Generation](#report-commentary-generation)
  - [Executive Summary Generation](#executive-summary-generation)
  - [Cross-Channel Overview Narrative](#cross-channel-overview-narrative)
  - [Landing Page Analysis](#landing-page-analysis)
  - [Proposal Generation](#proposal-generation)
  - [LLM.txt Generation](#llmtxt-generation)
- [Feature Walkthrough](#feature-walkthrough)
  - [Authentication and User Management](#authentication-and-user-management)
  - [Client Management](#client-management)
  - [Dashboard](#dashboard)
  - [Portfolio Health Dashboard](#portfolio-health-dashboard)
  - [Client Dashboard](#client-dashboard)
  - [Signals (Cross-Platform Anomaly Hub)](#signals-cross-platform-anomaly-hub)
  - [Cross-Channel Overview](#cross-channel-overview)
  - [Channel Tabs](#channel-tabs)
  - [Goals & KPI Tracking](#goals--kpi-tracking)
  - [AI Intelligence Panels](#ai-intelligence-panels)
  - [Client Portal](#client-portal)
  - [Action Tracking](#action-tracking)
  - [Communications Hub](#communications-hub)
  - [Report Collaboration](#report-collaboration)
  - [Notifications](#notifications)
  - [Reports](#reports)
  - [Report Templates](#report-templates)
  - [Tools](#tools)
  - [Admin Panel](#admin-panel)
  - [Settings](#settings)
  - [Notification Preferences](#notification-preferences)

---

## Data Flows

### Authentication Flow

```
User submits email + password
        │
        v
POST /api/auth/login
        │
        ├── Lookup user by email in DB
        │         │
        │         v
        │   bcrypt.compare(password, user.passwordHash)
        │         │
        │         ├── Match -> Create session
        │         │         │
        │         │         v
        │         │   Generate token: expiresAt|userId|nonce
        │         │   Sign with HMAC-SHA256 using SESSION_SECRET
        │         │   Store Session record in DB
        │         │   Set httpOnly cookie "session_token"
        │         │         │
        │         │         v
        │         │   user.mustChangePassword?
        │         │     Yes -> redirect /change-password
        │         │     No  -> redirect /dashboard
        │         │
        │         └── No match -> Fall back to APP_PASSWORD (legacy)
        │
        v
On every request: AuthenticatedLayout
        │
        v
Read cookie -> Split token -> Verify HMAC signature
        │
        v
Fetch user + role from DB -> Check permissions -> Render or redirect
```

**Permission system:** 11 granular permissions (`dashboard`, `clients`, `reports`, `templates`, `settings`, `page_analyser`, `proposal_generator`, `proposals`, `pricing`, `llm_generator`, `users`) assigned to roles as JSON arrays. Checked server-side in `AuthenticatedLayout` and client-side for sidebar navigation filtering.

### Platform Data Pipeline

Every dashboard section follows the same pattern:

```
Client Browser (React Component)
        │
        │  useEffect on mount / date change
        │
        v
fetch() to Next.js API route (e.g. /api/ga4?type=overview&propertyId=...&startDate=...&endDate=...)
        │
        v
API Route Handler
        │
        ├── requireAuth() -- verify session
        │
        ├── Extract query params (type, IDs, dates)
        │
        ├── Call lib function (e.g. getGA4Overview())
        │         │
        │         v
        │   Service Library (src/lib/ga4.ts)
        │         │
        │         ├── Build authenticated request
        │         │   (service account JWT for GA4/GSC,
        │         │    OAuth2 refresh token for Google Ads,
        │         │    access token for Meta,
        │         │    API key for SemRush)
        │         │
        │         ├── Call external API
        │         │
        │         └── Transform response to typed interface
        │
        └── Return JSON response
        │
        v
Component receives data
        │
        ├── Compute alerts (useMemo) -- threshold checks per metric
        │
        ├── Render MetricCards with change badges
        │
        ├── Render charts (Recharts)
        │
        ├── Render data tables (sortable)
        │
        └── Call onMetricsReady(metrics) -- feeds cross-platform context
```

**Parallel fetching:** Each dashboard section fires 5–15 parallel fetch calls on mount (current period, previous period, YoY, sub-data types) for maximum speed.

### Cross-Platform Context Flow

The `ClientDashboard` orchestrates cross-platform intelligence:

```
ClientDashboard
    │
    ├── Renders active section (e.g. GA4Section)
    │         │
    │         └── Section calls onMetricsReady({ sessions: 1234, ... })
    │
    ├── Collects metrics from ALL sections into crossPlatformContext state
    │
    └── Passes crossPlatformContext prop to each section
              │
              v
        Section passes context to AI components
              │
              v
        AI receives: "Meta is spending £5k with 2.1x ROAS.
                      Google Ads is spending £3k with 3.5x ROAS.
                      GA4 shows 15,000 sessions with 2.3% conversion rate."
              │
              v
        AI generates cross-channel aware insights:
        "Consider shifting budget from Meta to Google Ads
         which is delivering 67% higher ROAS..."
```

### Report Generation Flow

```
User clicks "New Report" on client page
        │
        v
Select title, period (monthly/quarterly/custom), template
        │
        v
POST /api/reports -- creates Report + ReportSections from template
        │
        v
Redirect to /reports/[id] -- Report Editor
        │
        ├── Drag-and-drop section reordering (dnd-kit)
        │     └── PATCH /api/reports/[id]/sections/reorder
        │
        ├── Toggle section/block visibility
        │     └── PATCH /api/reports/[id] (blockVisibility JSON)
        │
        ├── Per-section commentary editing (autosave, 1.5s debounce)
        │     └── PATCH /api/reports/[id]/sections
        │
        ├── AI commentary generation (per-section or bulk "Generate All")
        │     └── POST /api/ai/report-commentary
        │           └── Configurable: tone (professional/friendly/technical/
        │               executive/roadman), length (short/medium/long),
        │               format (prose/bullets/both)
        │
        ├── Executive summary AI generation
        │     └── POST /api/ai/executive-summary
        │
        ├── Screenshot upload with captions
        │     └── POST /api/reports/[id]/screenshots (Vercel Blob)
        │
        ├── Text sections (manually editable, autosave)
        │
        ├── Report status management (draft -> published)
        │
        └── Export / Share
              ├── PDF export (see PDF flow below)
              ├── Share link generation (unique token)
              └── Duplicate report
```

**Report sections** are the same dashboard components (`GA4Section`, `MetaSection`, etc.) rendered in `reportMode`, which switches from interactive tables to per-campaign card layouts for print-friendliness.

**Available section types:** overview, executive_summary, seo, web, paid_social, googleads, searchconsole, ecommerce, plus 6 text-only types (notable_achievements, screenshots, work_complete, content_done, technical_update, ppc_update).

### PDF Export Flow

```
User clicks "Export PDF"
        │
        v
GET /api/reports/[id]/pdf
        │
        v
Fetch report data from DB (sections, commentary, screenshots, client info)
        │
        v
render-print-html.ts generates full HTML document:
        │
        ├── Cover page with gradient background + client logo
        ├── Table of contents
        ├── Section cards with:
        │   ├── Section title
        │   ├── Commentary text
        │   └── Screenshot images with captions
        └── Footer with branding and date
        │
        v
puppeteer.ts launches headless Chrome
        │
        ├── Local: finds Chrome by platform
        └── Vercel: downloads @sparticuz/chromium-min binary from GitHub releases
        │
        v
page.setContent(html) -> page.pdf({ format: 'A4' })
        │
        v
Return PDF binary as response (Content-Type: application/pdf)
```

### Share Link Flow

```
Report/Proposal owner clicks "Share"
        │
        v
POST /api/reports/[id] or POST /api/tools/proposals/[id]/share
        │
        v
Generate unique share token -> save to DB
        │
        v
Return shareable URL: /share/report/[token] or /share/proposal/[token]
        │
        v
Public visitor opens link
        │
        v
/share/ layout sets robots: noindex, nofollow
        │
        v
API fetches data by token (no auth required)
        │
        v
Render read-only view
        │
        ├── Reports: full report with sections and screenshots
        └── Proposals: interactive proposal with enquiry form
              │
              └── Enquiry submission -> POST /api/share/proposal/[token]/enquiry
                    └── Saves ProposalEnquiry to DB
```

---

## AI Flows

### AI Architecture Overview

The platform uses **14 distinct AI endpoints** plus **2 tool-specific AI generators**, all powered by OpenAI:

```
                          +-------------------+
                          |   OpenAI API      |
                          |                   |
                          | gpt-4o-mini       |  (insights, commentary, summaries)
                          | gpt-4o            |  (proposals, LLM.txt generation)
                          | gpt-4o-search     |  (web search for blocked pages,
                          |   -preview        |   authority verification)
                          +-------------------+
                                   ^
                                   |
            +----------------------+----------------------+
            |                      |                      |
    +-------v--------+   +--------v--------+   +---------v--------+
    | Per-Section AI  |   | Cross-Channel   |   |    Tool AI       |
    |                 |   |                 |   |                  |
    | /ai/summary     |   | /ai/overview-   |   | /tools/keyword-  |
    | /ai/super-      |   |   narrative     |   |   planner/       |
    |   summary       |   | /ai/executive-  |   |   generate-      |
    | /ai/report-     |   |   summary       |   |   proposal       |
    |   commentary    |   | /ai/forecast    |   | /tools/llm-      |
    | /ai/landing-    |   | /ai/budget-     |   |   generator/     |
    |   page-analysis |   |   advisor       |   |   generate       |
    | /ai/root-cause  |   | /ai/attribution |   | /tools/page-     |
    | /ai/creative-   |   | /ai/strategy-   |   |   analyser       |
    |   intelligence  |   |   document      |   +------------------+
    | /ai/chat        |   +-----------------+
    +-----------------+
```

**API key resolution:** First checks `AppSetting` table (key: `openai_api_key`), then falls back to `OPENAI_API_KEY` environment variable.

**Per-client customisation:** Each client has an `aiInstructions` field that is injected into AI prompts, allowing agency staff to guide the AI's tone or focus per client.

### Anomaly Detection Engine

The anomaly detection system runs **server-side** in `/api/ai/summary` before any OpenAI call, operating as a rules-based preprocessing step:

```
Input: current metrics + previous metrics + section config
        │
        v
For each metric in section config:
        │
        ├── Calculate % change: ((current - previous) / |previous|) * 100
        │
        ├── Ignore if |change| < 10% (normal fluctuation)
        │
        ├── Classify direction:
        │   ├── higherIsBetter metrics (sessions, conversions, ROAS, etc.)
        │   │   ├── Increase = GOOD
        │   │   └── Decrease = BAD
        │   └── lowerIsBetter metrics (bounce rate, CPC, CPA, etc.)
        │       ├── Decrease = GOOD
        │       └── Increase = BAD
        │
        ├── Surface anomaly if:
        │   ├── BAD direction AND >= 15% change
        │   └── GOOD direction AND >= 30% change
        │
        └── Assign severity:
            ├── HIGH   — >= 50% change
            ├── MEDIUM — 25-49% change
            └── LOW    — 10-24% (bad) or 30-49% (good)

Output: sorted anomaly list (high severity first)
```

**Platform-specific anomaly checks** go beyond basic metric thresholds:

| Platform       | Additional Checks                                                                         |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Google Ads** | Impression share loss (budget + rank), quality score degradation, auction competitiveness |
| **Meta Ads**   | Ad frequency/fatigue (>3.0), creative fatigue correlation, ROAS below 1× breakeven        |
| **GSC**        | Clicks drop, position regression, CTR anomalies                                           |
| **GA4**        | Sessions decline, bounce rate spike, conversion rate drop                                 |

### AI Summary Generation

**Endpoint:** `POST /api/ai/summary`

```
Input: sectionType, metrics, previousMetrics, clientName, dateRange,
       campaignData?, landingPages?, historicalSnapshots?, crossPlatformContext?
        │
        v
1. Run anomaly detection (see above)
        │
        v
2. Build system prompt:
   "You are an expert digital marketing analyst. Use British English.
    Write punchy, specific, actionable copy."
        │
        v
3. Build user prompt with:
   - Channel name and date range
   - All current metric values
   - Previous period values
   - Detected anomalies
   - Campaign-level data (if provided)
   - Landing page data (if provided)
   - Historical snapshots (trend context)
   - Cross-platform context (other channel data)
   - Client-specific AI instructions
        │
        v
4. Call OpenAI gpt-4o-mini (temperature: 0.4, JSON response format)
        │
        v
Output JSON:
{
  "summary": "2-3 sentence executive overview",
  "insights": ["3-4 specific data-driven observations"],
  "recommendations": ["2-3 actionable next steps"],
  "anomalies": [{ metric, change, severity, description }]
}
```

**Alert recommendations mode:** When `sectionType` is `"alert_recommendations"`, the endpoint uses channel-specific AI personas (search_console expert, meta ads expert, etc.) to generate targeted remediation advice for specific anomalies.

### Super Summary (Journey Analysis)

**Endpoint:** `POST /api/ai/super-summary`

A deeper analysis that combines performance data with live landing page quality assessment:

```
Input: sectionType, metrics, previousMetrics, campaignData, landingPages
        │
        v
1. Extract top 5 landing pages
        │
        v
2. For each page: fetchPageSignals(url)
   ├── Fetch page HTML
   └── Extract 26 signal types:
       title, meta description, H1-H3 headings, word count,
       CTA text, form fields, phone numbers, trust signals,
       structured data, images, load indicators, social proof, etc.
        │
        v
3. Build comprehensive context combining:
   - Performance metrics + changes
   - Campaign structure and spend
   - Landing page quality signals
   - Cross-platform context
        │
        v
4. Call OpenAI gpt-4o-mini
        │
        v
Output JSON:
{
  "narrative": "Flowing analysis of the entire user journey",
  "journeyAssessment": "Ad -> Click -> Landing -> Conversion assessment",
  "wins": ["Things working well"],
  "issues": ["Problems identified"],
  "actions": ["Specific recommendations"],
  "healthScore": 72,          // 0-100 overall health
  "pageScores": [             // Per landing page
    { "url": "...", "score": 65, "topIssue": "..." }
  ]
}
```

### Report Commentary Generation

**Endpoint:** `POST /api/ai/report-commentary`

Generates per-section commentary for reports with configurable output:

```
Input: sectionType, metrics, previousMetrics, clientName, dateRange,
       tone?, length?, format?
        │
        v
Tone options:   professional | friendly | technical | executive | roadman
Length options:  short (2-3 sentences) | medium (paragraph) | long (detailed)
Format options:  prose | bullets | both
        │
        v
System prompt includes client's aiInstructions (if set)
        │
        v
Call OpenAI gpt-4o-mini
        │
        v
Output: formatted commentary text ready for report insertion
```

### Executive Summary Generation

**Endpoint:** `POST /api/ai/executive-summary`

```
Input: Array of { sectionType, commentary } from all report sections
        │
        v
"Synthesise these section commentaries into a cohesive executive summary.
 Produce 4-6 bullet points covering the most important takeaways."
        │
        v
Call OpenAI gpt-4o-mini
        │
        v
Output: executive summary text (4-6 bullet points)
```

### Cross-Channel Overview Narrative

**Endpoint:** `POST /api/ai/overview-narrative`

```
Input: PlatformMetrics for all channels + aggregated totals +
       campaign highlights + alerts + channel efficiency matrix
        │
        v
"Analyse cross-channel performance. Consider budget allocation,
 channel synergies, and overall marketing efficiency."
        │
        v
Call OpenAI gpt-4o-mini (JSON response)
        │
        v
Output JSON:
{
  "narrative": "Cross-channel performance narrative",
  "channelScores": { "ga4": 78, "meta": 65, ... },
  "crossChannelInsights": ["Channel synergy observations"],
  "budgetRecommendation": "Budget reallocation advice",
  "wins": [...],
  "issues": [...],
  "actions": [...],
  "overallScore": 72
}
```

### Landing Page Analysis

**Endpoint:** `POST /api/ai/landing-page-analysis`

Batch analysis of landing pages receiving ad traffic:

```
Input: Array of { url, metrics } from ad platforms + clientName + source
        │
        v
Two analysis paths:
        │
        ├── Standard: fetchPageSignals() for each page
        │   └── Chat completion with page signals + metric data
        │
        └── Web search fallback (for blocked/JS-heavy pages):
            └── OpenAI Responses API with web_search_preview tool
        │
        v
Output per page:
{
  "url": "...",
  "overallScore": 72,
  "categories": {
    "cro": { "score": 65, "findings": [...] },
    "seo": { "score": 80, "findings": [...] },
    "mobile": { "score": 70, "findings": [...] },
    "forms": { "score": 60, "findings": [...] }
  },
  "topRecommendations": [...]
}
```

### Proposal Generation

**Endpoint:** `POST /api/tools/keyword-planner/generate-proposal`

Full PPC proposal pipeline:

```
Input: KeywordPlannerResearch data + client brief + pricing config
        │
        v
1. Load research data (keywords, ad groups, volumes, CPCs)
        │
        v
2. Compute aggregate stats (total volume, avg CPC, estimated spend)
        │
        v
3. Load task benchmarks + pricing strategy from AppSettings
        │
        v
4. Call OpenAI gpt-4o with structured prompt:
   "Generate a professional PPC proposal with services,
    timeline, pricing tiers, and forecast data."
        │
        v
5. Build interactive HTML proposal:
   ├── Executive summary
   ├── Market analysis
   ├── Recommended services with pricing
   ├── Timeline and milestones
   ├── Interactive PPC forecaster (sliders + chart)
   └── Call-to-action
        │
        v
6. Save Proposal to DB with share token
        │
        v
Output: Proposal with shareable public URL
```

### LLM.txt Generation

**Endpoint:** `POST /api/tools/llm-generator/generate`

Generates AI-search-optimised `llm.txt` content for websites:

```
Input: website URL + template (optional) + sector type
        │
        v
1. Crawl site (homepage + up to 10 sub-pages)
        │
        v
2. Fetch auxiliary data:
   ├── Sitemap.xml
   ├── Robots.txt
   └── Existing llm.txt / llms.txt
        │
        v
3. Sector-specific authority verification:
   ├── Charity sector -> Charity Commission register lookup
   ├── Business -> Companies House lookup
   └── Generic -> Web search for authority signals
        │
        v
4. Extract social profiles from page content
        │
        v
5. URL verification (strip 404s)
        │
        v
6. Call OpenAI:
   ├── gpt-4o-search-preview (web search for blocked sites + authority signals)
   └── gpt-5.4 (content generation from template)
        │
        v
7. Persist the result (LlmGeneration), optionally linked to a client
        │
        v
Output: formatted llm.txt content + saved record id + quality metadata
```

**Persistence & delivery.** Every generation is saved to the `LlmGeneration` table so the team can revisit, reload, and audit it. A generation can be linked to a client and turned into a public share link (`GET /api/share/llm/[token]`) that serves the file as `text/plain` — clients publish this as their site's `llm.txt`. Share links support optional passwords, expiry, and view tracking. Supporting routes: `GET/POST` not required — the generate route saves automatically; `GET /api/tools/llm-generator/generations` (list, optional `?clientId=`), `GET/PATCH/DELETE /api/tools/llm-generator/generations/[id]` (open, rename, link client, share/unshare, delete).

**Templates.** A built-in Charity template ships by default. Users can create custom templates, and any template (including built-ins) can be cloned into an editable, owner-stamped copy. Edit/delete is restricted to the template owner or holders of the `settings` permission.

---

## Feature Walkthrough

### Authentication and User Management

- **Login:** Email + password authentication with bcrypt hashing
- **Sessions:** HMAC-SHA256 signed cookies with 7-day expiry, stored in DB
- **First login:** Forced password change via `mustChangePassword` flag
- **Legacy support:** Falls back to shared `APP_PASSWORD` environment variable
- **Permissions:** 11 permission types assigned to roles:
  - `dashboard`, `clients`, `reports`, `templates`, `settings`
  - `page_analyser`, `proposal_generator`, `proposals`, `pricing`, `llm_generator`
  - `users` (admin access)

### Client Management

**Route:** `/clients`

- Searchable grid of client cards showing name, website, integration badges, recent report count
- Each card links to the client's dashboard
- **New client** form at `/clients/new` with complete integration setup
- **Client settings** at `/clients/[slug]/settings`:
  - Basic info (name, website, logo upload to Vercel Blob)
  - All 15 channel integrations with account/property selectors
  - Competitor domains (list for monitoring)
  - AI report instructions (per-client prompt customisation)
  - Contracted hours (service type + hours/month entries)
  - Report schedule (frequency, day, template, auto-approve toggle)
  - Portal users management (via `ClientPortalManager`)

### Dashboard

**Route:** `/dashboard`

Displays platform-wide statistics: total clients, total reports, active integrations count. Lists recent clients and recent reports for quick navigation.

### Portfolio Health Dashboard

**Route:** `/portfolio` (requires `clients` permission)

Agency-wide client health overview with:

- **Health score gauges** (0–100) per client — green ≥70, amber ≥40, red <40
- **Churn risk indicators** (Low / Medium / High) based on engagement signals
- **Trend direction** (trending up, down, or stable) per client
- **Open action count** — outstanding action items per client
- **Recent anomalies** count — signals detected in the last 30 days
- **Goal achievement** rate — achieved goals vs total goals
- **Report history** — last report date and total report count
- **Quick links** to each client dashboard
- Powered by `/api/portfolio/health` which aggregates cross-client metrics in a single request

### Client Dashboard

**Route:** `/clients/[slug]`

Tabbed interface with date range selector (7d / 30d / 90d / 6m / custom). Tabs are conditionally displayed based on which integrations the client has configured. Available tabs:

**Signals | Overview | SEO | Web Analytics | Search Console | Meta Ads | Google Ads | TikTok | Microsoft Ads | LinkedIn | Klaviyo | YouTube | HubSpot | CallRail | E-Commerce | Core Web Vitals | Goals & KPIs**

The "Ask the Data" AI chat panel is available on every tab as a floating interface.

### Signals (Cross-Platform Anomaly Hub)

**Tab:** Signals (admin only)

Fetches data from ALL configured platforms in parallel, runs computed anomaly checks, then fires per-platform AI calls for deeper analysis. Displays signals grouped by severity (high/medium/low) with platform-coloured pills. Each signal card has an expandable AI recommendation section.

### Cross-Channel Overview

**Tab:** Overview

Aggregates data from all platforms to show:

- **Marketing funnel:** Impressions → Clicks → Sessions → Conversions → Revenue
- **Blended KPIs:** Total ad spend, blended ROAS, blended CPA, total conversions
- **Channel efficiency matrix** with health scores per platform
- **Cross-platform alerts** (channel-level anomalies)
- **AI narrative** analysing overall marketing performance
- **Platform breakdown cards** showing per-channel contribution

### Channel Tabs

Each marketing channel has a dedicated dashboard tab with KPI cards, trend charts, sortable data tables, and AI insights:

| Tab                     | Key Metrics                                          | Notable Features                                                                        |
| ----------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **SEO / SemRush**       | Organic traffic, keywords, domain authority          | Position distribution, rank movers, competitor landscape, AI visibility analysis        |
| **Web Analytics (GA4)** | Sessions, users, pageviews, bounce rate, conversions | Traffic sources, demographics, AI referrals, conversion events                          |
| **Search Console**      | Clicks, impressions, CTR, avg position               | Position movers, organic vs paid keyword overlap analysis                               |
| **Meta Ads**            | Spend, ROAS, CPM, CTR, conversions                   | Campaign → Ad Set → Creative drill-down, creative media lightbox, audience demographics |
| **Google Ads**          | Cost, clicks, conversions, impression share          | Campaign/ad group/keyword tables, search terms report, landing page analysis            |
| **TikTok Ads**          | Spend, impressions, video views, reach, frequency    | Campaign performance with video view metrics                                            |
| **Microsoft Ads**       | Spend, clicks, conversions, ROAS                     | Campaign performance with status badges                                                 |
| **LinkedIn Ads**        | Spend, impressions, clicks, leads                    | Campaign-level breakdown                                                                |
| **Klaviyo**             | Sends, opens, clicks, revenue, unsubscribes          | Per-campaign open rate and click rate                                                   |
| **YouTube**             | Views, watch time, subscribers, estimated revenue    | Video-level performance table                                                           |
| **HubSpot**             | Contacts, deals, pipeline value                      | Deal stage breakdown                                                                    |
| **CallRail**            | Total calls, answered, missed, avg duration          | Call log with source attribution                                                        |
| **E-Commerce**          | Revenue, orders, AOV, conversion rate                | Top products, orders by status (WooCommerce/Shopify)                                    |
| **Core Web Vitals**     | LCP, CLS, INP, TTFB, FCP                             | Per-metric good/ok/poor distribution bars (CrUX API)                                    |

### Goals & KPI Tracking

**Tab:** Goals & KPIs (always available per client)

- Create goals with a metric, target value, channel, target date, and unit
- Supported goal types: ROAS targets, session growth, revenue targets, impression reach
- Status tracking: **On Track** / **At Risk** / **Off Track** / **Achieved**
- Progress bars with percentage to target
- AI-generated guidance when a goal is at risk
- Full CRUD: add, edit, delete goals

### AI Intelligence Panels

Several AI-powered panels appear on the Overview and channel tabs:

| Panel                           | Location                                   | Description                                                                                         |
| ------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Predictive Forecasting**      | Overview tab                               | 30/60/90 day projections with confidence bands (best/expected/worst) using historical snapshot data |
| **Budget Optimisation Advisor** | Overview tab                               | Cross-channel budget reallocation recommendations with projected revenue impact                     |
| **Multi-Touch Attribution**     | Overview tab                               | Compare 5 attribution models (Last Click, First Click, Linear, Time Decay, Position-Based)          |
| **Seasonality Intelligence**    | Overview tab                               | Automatic seasonal pattern detection from snapshot history with forward-looking alerts              |
| **Share of Voice**              | SEO tab                                    | Organic + paid competitive position tracking using SemRush data                                     |
| **Creative Intelligence**       | Meta / Google Ads tabs                     | Ad creative performance analysis with actionable creative briefs                                    |
| **AI Strategy Documents**       | On demand                                  | Quarterly forward-looking strategy documents per client, shareable                                  |
| **Conversational AI Chat**      | All tabs (floating)                        | "Ask the Data" — GPT-4o-mini powered chat with full metric history context                          |
| **Competitor Intelligence**     | SEO tab + `/tools/competitor-intelligence` | SemRush-backed competitor monitoring with AI-generated competitive summaries                        |

### Client Portal

**Route:** `/portal` (client-facing)

A self-serve portal allowing clients to log in and view their own data without accessing the full agency platform.

- **Magic-link authentication** — portal users receive a one-time login token via email
- **Portal dashboard** — clients see their reports, goals, and communications
- **Read-only access** — clients cannot modify data
- **Configurable permissions** — agency staff control which data each portal user can access (`reports`, `goals`, `communications`)
- **User management** — `ClientPortalManager` component lets agency staff create, deactivate, and send magic links to portal users

### Action Tracking

**Tool:** `/tools/actions`

Bridges AI recommendations to measured outcomes.

- **Create actions** from AI recommendations or manually
- **Fields:** title, description, status (open/in_progress/completed/cancelled), priority (low/medium/high/urgent), assignee, due date, outcome notes, source type
- **Dashboard view** with filtering by status, priority, and client
- **Outcome recording** — when an action is completed, document the measured result
- Per-client action lists from the client dashboard

### Communications Hub

**Tool:** `/tools/communications`

Centralised log of all agency-client communications.

- **Log types:** email, call, meeting, note, report_share, proposal_share
- **Direction:** inbound or outbound
- **Status:** draft, sent, logged
- Link communications to reports or proposals via metadata
- Per-client communication history accessible from the client dashboard
- Full CRUD — log, edit, and delete communications

### Report Collaboration

**Within the report editor (`/reports/[id]`)**

Multi-user workflow for reviewing and approving reports before sharing with clients.

- **Inline comments** — any section in a report can receive threaded comments
- **Resolve/reopen comments** — track which feedback has been addressed
- **Approval workflow** — reports move through: `draft` → `pending` → `approved` / `changes_requested`
- **Approval notes** — reviewer can attach notes when requesting changes
- **Approver tracking** — records which user approved and when

### Notifications

**System-wide:** Anomaly alerts, report events, and key platform events

- **In-app** — stored in the `Notification` model, surfaced in UI
- **Email** — via Resend (configurable in AppSettings)
- **Slack** — via incoming webhooks configured per-user in notification preferences
- **Types:** anomaly, report_ready, report_sent, report_opened, proposal_viewed, integration_error, goal_at_risk, snapshot_complete
- **Admin broadcast** — `notifyAdmins()` sends to all admin users

### Reports

**Route:** `/reports` (list) and `/reports/[id]` (editor)

**Report list features:**

- Search/filter reports
- Inline rename, delete with confirmation, duplicate report
- Status badges (draft/published)

**Report editor features:**

- Status stepper: Draft → Review → Published
- Custom date range pickers with comparison period
- Drag-and-drop section reordering (dnd-kit)
- Per-section and per-block visibility toggles
- Commentary editor per section with autosave (1.5s debounce)
- AI commentary generation per section (configurable tone/length/format)
- Bulk "Generate All" that generates commentary for every section
- Executive summary AI generation
- Screenshot upload with captions (per section)
- Text sections for manual notes (notable achievements, work completed, etc.)
- PDF export, share link generation/revocation, duplicate report, save as template
- Print view (`/reports/[id]/print`)
- Collaboration comments and approval workflow

### Report Templates

**Route:** `/reports/templates`

- Create reusable report structures defining which sections to include
- Set a default template that pre-fills new report creation
- Templates store section type, order, and title configuration

### Tools

| Tool                        | Route                            | Description                                                                                                                                 |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page Analyser**           | `/tools/page-analyser`           | AI-powered CRO/SEO/mobile/forms scoring for any URL, plus SemRush competitive data                                                          |
| **Keyword Planner**         | `/tools/keyword-planner`         | Brief → AI keyword suggestions → SemRush research → proposal generation                                                                     |
| **Proposals**               | `/tools/proposals`               | Pipeline CRM (Prospect → Sent → Viewed → Negotiating → Won/Lost), share links, view tracking, enquiry capture                               |
| **Pricing Strategy**        | `/tools/pricing`                 | Agency pricing configuration editor (service tiers, add-ons, retainer packages)                                                             |
| **LLM.txt Generator**       | `/tools/llm-generator`           | AI-search-optimised `llm.txt` files with site crawling, authority verification, saved client-linked generations, and shareable client links |
| **Action Tracking**         | `/tools/actions`                 | Agency-wide action dashboard — create, assign, track, and measure outcomes                                                                  |
| **Communications Hub**      | `/tools/communications`          | Agency-wide communication log — emails, calls, meetings, notes across all clients                                                           |
| **Competitor Intelligence** | `/tools/competitor-intelligence` | SemRush-backed competitor monitoring with AI-generated competitive summaries                                                                |
| **Media Plan Builder**      | `/tools/media-plan`              | Paid media planning with channel allocation, AI forecast, and status management                                                             |

### Admin Panel

**Route:** `/admin` (requires `users` permission)

- **Users tab:** Full CRUD — create users with name, email, password, role selection. Edit inline. Delete with confirmation.
- **Roles tab:** Create and edit roles with grouped permission checklists (11 permission types).
- **Run Snapshots:** Manual trigger to fire the snapshot cron for all clients immediately.

### Settings

**Route:** `/settings` (requires `settings` permission)

- **Google Connections:** Connect Google accounts via OAuth2 for Google Ads (multiple accounts for MCC structures)
- **OpenAI API Key:** Enter key (stored in DB, takes priority over env var)
- **Email Settings:** Configure Resend API key and sender address
- **Task Time Benchmarks:** Hours-per-task estimates used in proposal generation
- **Default MCC:** Select default Google Ads Manager account

### Notification Preferences

**Route:** `/settings/notifications`

- Toggle email and Slack delivery channels
- Configure Slack webhook URL per user
- Choose delivery frequency: Immediate / Daily Digest / Weekly Digest
- Set quiet hours (non-critical notifications suppressed outside business hours)
- Enable/disable individual notification types
