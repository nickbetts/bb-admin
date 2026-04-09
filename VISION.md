
# i3media Report — Platform Vision

---

## 1. Where We Are Now — The Honest Audit

### What We Have (and It's Actually Impressive)

i3media Report is already ahead of most agency tooling on the market. A cold audit as of April 2026 shows genuine strengths across all three build phases:

| Capability | Current State | Rating |
|---|---|---|
| Data integrations | 15 channels (GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, SemRush, GSC, Moz, WooCommerce, Shopify, YouTube, HubSpot, CallRail) | ⭐⭐⭐⭐⭐ |
| AI insights per channel | 14 AI endpoints: anomaly detection, summaries, forecasting, budget advice, attribution, creative intelligence, root cause, strategy documents, conversational chat | ⭐⭐⭐⭐⭐ |
| Cross-channel context | All platform metrics fed into every AI call; cross-platform intelligence in every section | ⭐⭐⭐⭐⭐ |
| Report builder | Drag-and-drop, AI commentary, collaboration comments, approval workflow, PDF export, share links | ⭐⭐⭐⭐⭐ |
| Proposal generation | AI-powered PPC proposals with interactive forecaster, pipeline CRM, view tracking, enquiry capture | ⭐⭐⭐⭐⭐ |
| Landing page analysis | CRO/SEO/Mobile/Forms scoring with AI, SuperSummary journey analysis | ⭐⭐⭐⭐ |
| Keyword planner | SemRush-backed research with proposal output | ⭐⭐⭐⭐ |
| Historical snapshots | Nightly automated snapshots across all channels, used for forecasting, seasonality, and anomaly context | ⭐⭐⭐⭐ |
| Client management | Full CRUD, integration badges, contracted hours, AI instructions, portal management | ⭐⭐⭐⭐ |
| Role-based access | 11 permissions, role editor, granular per-section control | ⭐⭐⭐⭐ |
| LLM.txt generator | Novel, well-executed, sector-specific templates | ⭐⭐⭐⭐ |
| Client portal | Self-serve login with magic link, goals, reports, communications view | ⭐⭐⭐⭐ |
| Action tracking | AI recommendations → assigned actions → outcomes, full CRUD | ⭐⭐⭐⭐ |
| Communication hub | Centralised log for emails, calls, meetings, notes with email drafting | ⭐⭐⭐⭐ |
| Competitor intelligence | SemRush-backed competitor monitoring, share of voice, AI-generated insights | ⭐⭐⭐⭐ |
| Media plan builder | Paid media planning with channel allocation and AI forecast outputs | ⭐⭐⭐⭐ |
| Portfolio health | Agency-wide client health dashboard with churn risk scoring | ⭐⭐⭐⭐ |
| Automated reporting | Monthly cron-triggered report generation, schedule configuration per client | ⭐⭐⭐⭐⭐ |
| Notifications | Email + Slack delivery for anomalies, report events, goals at risk — fully configurable | ⭐⭐⭐⭐⭐ |

### The Original Gaps — Resolution Status

**Gap 1: Insights without action** ✅ **Resolved**
Action tracking is now a first-class feature. AI recommendations surface as `ActionItem` records that can be assigned, tracked, and measured. The `/tools/actions` dashboard gives a full view of open, in-progress, and completed actions across all clients.

**Gap 2: Siloed historical data** ✅ **Resolved**
Nightly snapshot automation runs across all channels. MetricSnapshot data powers predictive forecasting, seasonality intelligence, conversational AI context, and anomaly explanation. The data is no longer sitting unanalysed.

**Gap 3: No client-facing layer** ✅ **Resolved**
The client portal (`/portal`) gives clients a magic-link login to view their reports, goals, and communications. `ClientPortalUser` records are managed per client with configurable permissions.

**Gap 4: Manual report workflow** ✅ **Resolved**
Monthly report automation is live via `/api/cron/reports`. Each client can have a `reportSchedule` configured (frequency, day, template, auto-approve). Reports are generated, AI commentary added, and notifications sent automatically.

**Gap 5: Limited integrations** ✅ **Resolved**
TikTok Ads, Microsoft Advertising, LinkedIn Ads, Klaviyo, YouTube Analytics, HubSpot CRM, Core Web Vitals, and CallRail are all live. The platform now covers 15 channels.

**Gap 6: No attribution modelling** ✅ **Resolved**
Multi-touch attribution is live on the Overview tab. Five models supported: Last Click, First Click, Linear, Time Decay, and Position-Based. AI narrative explains cross-channel contribution patterns.

**Gap 7: Proposal pipeline is thin** ✅ **Resolved**
Proposals now have full pipeline fields: `pipelineStage`, `pipelineNotes`, `expectedValue`, `closeDate`, `lostReason`. A `/api/tools/proposals/[id]/pipeline` endpoint manages stage transitions.

**Gap 8: No competitor intelligence feed** ✅ **Resolved**
Competitor intelligence is live. `CompetitorSnapshot` model stores ongoing competitive data. `CompetitorIntelligenceSection` surfaces it on the SEO tab. `/tools/competitor-intelligence` provides agency-wide monitoring.

**Gap 9: Notifications are absent** ✅ **Resolved**
Email (Resend) and Slack (webhooks) notifications are fully implemented. Per-user preferences with quiet hours, digest frequency, and per-type enable/disable are configurable at `/settings/notifications`.

**Gap 10: No agency-level business intelligence** ✅ **Resolved**
The portfolio health dashboard (`/portfolio`) provides a cross-client view with health scores, churn risk indicators, open action counts, goal achievement rates, and anomaly counts per client.

---

## 2. The Vision

> **i3media Report should be the central nervous system of a modern digital marketing agency — not a dashboard, but an intelligence engine that thinks, advises, forecasts, automates, and communicates on behalf of the team.**

The platform should do three things that no competitor currently does in one unified product:

1. **Understand** — aggregate every signal from every marketing channel, across every client, into a coherent picture of what is happening and why.

2. **Advise** — go beyond surface-level insights to generate specific, prioritised, revenue-linked recommendations that account managers can act on immediately.

3. **Operate** — automate the repetitive work of agency life: report generation, client updates, anomaly alerts, proposal drafting, and performance monitoring, so the team spends more time on strategy and less on admin.

The competitive north star: **be the platform that makes each account manager feel like they have a team of analysts, a strategist, and a client success manager working alongside them 24/7.**

---

## 3. AI Intelligence Layer — Beyond Gimmicks

This section covers AI features that deliver genuine, measurable value — not decorative "AI badges" but features that change how marketing decisions are made.

### 3.1 Conversational AI Analyst ("Ask the Data")

**What it is:** A natural language interface embedded in every client dashboard. Instead of navigating to the right tab and reading charts, account managers type or speak questions.

**Example queries:**
- *"Why did conversions drop last week on this account?"*
- *"Which ad campaign is wasting the most money right now?"*
- *"What's our best-performing keyword across all channels?"*
- *"Write me a summary of October's performance to paste into an email."*
- *"Compare this client's ROAS to last quarter and suggest what to do differently."*

**How it works:**
- A persistent chat interface on the client dashboard
- Questions are sent to an AI model with the full cross-platform context (current metrics, historical snapshots, campaign data, anomalies)
- The AI can query stored MetricSnapshot data for trends
- The conversation history is stored per-client so context builds over time
- AI can produce formatted outputs: tables, summaries, bullet lists

**Why this matters:** This eliminates the "I need to look that up" bottleneck. An account manager in a client call can get instant answers without opening multiple platforms.

**Implementation path:**
- New `ClientConversation` model (messages, role, clientId, userId, context)
- New `/api/ai/chat` endpoint with streaming responses
- Persistent chat UI component with suggested prompts
- Context builder that assembles the last 7 days of snapshots + current metrics

---

### 3.2 Predictive Performance Forecasting

**What it is:** An AI model that predicts next month's key metrics based on historical trends, seasonality, current trajectory, and industry benchmarks.

**What it produces:**
- Projected sessions, conversions, revenue for the next 30/60/90 days
- Confidence bands (best case / expected / worst case)
- Budget requirement to hit a target KPI
- Probability of hitting contracted targets
- Early warning: "At current trajectory, this client will miss their conversion target by 23%"

**The models involved:**
- Trend extrapolation from MetricSnapshot history (linear regression, moving averages)
- Seasonality correction using year-over-year data where available
- AI narrative explanation: *"We're forecasting a 12% drop in sessions next month based on the seasonal dip we saw in the same period last year, combined with the current declining trajectory in organic traffic."*
- Spend-to-outcome forecasting for paid channels (extending the existing PPC forecaster into a live dashboard feature)

**Why this matters:** Proactive account management. Catching a miss before it happens, rather than explaining it in the next report.

**Implementation path:**
- Extend MetricSnapshot to store 24+ months of data per channel
- New `/api/ai/forecast` endpoint
- ForecastSection component on the overview tab
- Visual: confidence band charts using Recharts area with upper/lower bounds

---

### 3.3 Root Cause Analysis Engine

**What it is:** When an anomaly is detected (existing system), instead of just flagging it, the platform automatically investigates *why* it happened by cross-referencing all available data.

**The current state:** "Sessions dropped 28% vs last month — HIGH severity."

**The new state:** "Sessions dropped 28% vs last month. Root cause analysis: Organic sessions fell 34% from Google. Cross-referencing with Search Console data, we can see position losses across 45 non-brand keywords. The largest declines are in [keyword cluster]. In the same period, SemRush shows a competitor gained 22 positions for these terms. This appears to be a SERP displacement event, not a technical issue. Recommendation: audit content for those keyword pages and consider a content refresh sprint."

**Analysis chain:**
1. Detect anomaly (existing)
2. Identify affected channel
3. Pull deeper data for that channel (keyword-level, campaign-level, segment-level)
4. Cross-reference against other channels for corroboration or contradiction
5. Check for known external events (algorithm updates, seasonality using historical data)
6. Produce a plain-English root cause hypothesis with confidence level
7. Generate specific remediation steps

**Implementation path:**
- New `/api/ai/root-cause` endpoint
- Triggered automatically for HIGH severity anomalies
- Root cause stored against the anomaly in the Signals view
- Account manager can "request deeper investigation" for medium anomalies

---

### 3.4 AI Budget Optimisation Advisor

**What it is:** A cross-channel budget recommendation engine that analyses spend efficiency across all paid channels and produces specific reallocation suggestions with projected impact.

**What it produces:**
- Current budget allocation vs optimal allocation based on ROAS/CPA performance
- "If you shift £500/month from Meta to Google Ads based on current ROAS differentials, projected revenue impact: +£1,400/month"
- Channel saturation signals: "Meta frequency is at 4.2, indicating audience fatigue — this budget is producing diminishing returns"
- Budget pacing: "Google Ads is on pace to overspend by 18% this month. Current daily spend: £94. Recommended: £80/day."
- Opportunity identification: "Search impression share is 68% — there is headroom to capture 32% more impression share with a £200/month budget increase on the top 3 campaigns"

**Why this matters:** This is the most direct path to demonstrable ROI for the agency. When an account manager brings a budget recommendation backed by multi-channel data and projected outcomes, it becomes a revenue conversation, not a reporting conversation.

**Implementation path:**
- New `/api/ai/budget-advisor` endpoint
- Input: all paid channel metrics, impression share data, frequency data
- Output: structured recommendations with projected impact ranges
- Displayed as an action panel on the Overview tab
- Monthly budget advisor runs stored as `BudgetRecommendation` snapshots

---

### 3.5 Creative Performance Intelligence

**What it is:** AI analysis of ad creative performance across Meta and Google, identifying patterns in what is working and why, and generating creative briefs for the next iteration.

**For Meta Ads:**
- Analyse performance by creative type (image vs video vs carousel)
- Identify winning creative attributes (dark vs light, people vs product, text-heavy vs clean)
- Frequency vs performance correlation (which creatives are fatiguing)
- Automatic creative brief: "Your top performer for this month used a testimonial format, showed a before/after comparison, and had a CTA in the first 3 seconds. Here is a brief for your creative team based on this."

**For Google Ads:**
- RSA asset performance scoring (headline performance, description performance)
- Ad copy pattern analysis: which messaging themes are converting best
- Quality Score correlation with landing page content
- Automatic ad copy suggestions based on top-performing patterns and keyword intent

**Implementation path:**
- Extend Meta data fetching to include ad-level creative attributes
- New `/api/ai/creative-intelligence` endpoint
- CreativeIntelligencePanel component embedded in paid channel sections
- Creative brief output as a shareable document or downloadable PDF

---

### 3.6 AI Strategy Document Generator

**What it is:** On demand, the AI produces a full monthly or quarterly strategy document for a client — not a report of past performance, but a forward-looking strategy.

**Structure:**
1. Performance summary (last period)
2. Key wins and why they happened
3. Key challenges and root causes
4. Competitor intelligence snapshot
5. Priority opportunities (ranked by projected impact)
6. Recommended channel strategy for next period
7. Budget recommendations
8. Content/creative priorities
9. Technical and SEO actions
10. KPI targets for next period with rationale

**Why this is different from the existing report:** The current report is a narrative of what happened. The strategy document is a prescription for what to do next — it's a strategic asset, not a history lesson.

**Implementation path:**
- New `/api/ai/strategy-document` endpoint
- Uses full cross-platform context + historical trend data + forecast data
- Output as a formatted, branded document (separate from the standard report)
- Saved as a new model `StrategyDocument` per client per period
- Shareable link + PDF export

---

### 3.7 Competitive Intelligence AI

**What it is:** Ongoing monitoring and analysis of competitor activity using available data sources, with AI-generated competitive summaries.

**Data sources:**
- SemRush competitor data (existing, underutilised)
- Google Ads auction insights (impression share overlap, outranking share)
- Google Trends integration (new)
- AI web search (GPT-4o-search — already in use for landing page analysis, extend to competitive research)

**What it produces:**
- Competitor traffic trend comparisons
- Competitor keyword gain/loss alerts: "A competitor entered the top 3 for your target keyword"
- Competitor ad copy intelligence: what messaging themes are they running
- Competitor landing page changes (crawl-diff over time)
- Share of voice score: your combined organic + paid visibility vs top 3 competitors
- Opportunity gaps: high-volume keywords where competitors rank but you don't

**Implementation path:**
- New `CompetitorSnapshot` model (clientId, domain, metrics JSON, periodStart/End)
- Extend `/api/semrush/` to include competitor data pull on a schedule
- New `/api/ai/competitor-intelligence` endpoint
- CompetitorIntelligencePanel on the SEO tab
- Alerts integration: competitor activity triggers Signals

---

### 3.8 Audience Insight Engine

**What it is:** Combines demographic data from Meta, GA4, and Google Ads to build a unified audience profile and generate persona hypotheses.

**What it produces:**
- Cross-channel audience overlap analysis: "Your best-converting Meta audience is 25-34 female, while Google Ads converts best from 35-44 male. These audiences respond to different messaging."
- Unified persona cards with suggested messaging angles
- Audience expansion opportunities: "You're reaching this persona effectively. Here are three adjacent personas that should respond to similar creative."
- Seasonal audience shifts: "Your audience skews younger in summer and older in Q4 — adjust creative strategy accordingly."

---

### 3.9 AI-Powered Anomaly Explanation Layer

**What it is:** An upgrade to the existing anomaly detection system. Currently anomalies are detected and flagged. This adds an explanation layer that attempts to contextualise each anomaly against:

- Historical data (is this seasonal? was the same thing seen last year?)
- Cross-channel data (did spend drop correlate with session drop?)
- External signals (known algorithm update dates, public holidays)
- Technical signals (did the anomaly coincide with a new deployment or tracking change?)

**Output enrichment for each anomaly:**
```
Current: "Sessions dropped 28% — HIGH"
Enhanced: "Sessions dropped 28% — HIGH
  Historical context: Sessions also dipped 22% in the same week last year (seasonal pattern).
  Cross-channel: Paid traffic held steady, suggesting the decline is organic-only.
  AI assessment: 60% likely seasonal, 40% possible algorithm influence.
  Recommended action: Monitor for another 2 weeks before making structural changes."
```

---

## 4. Data & Cross-Channel Intelligence

### 4.1 True Multi-Touch Attribution Modelling

**What it is:** A cross-channel attribution model that goes beyond last-click to show the true contribution of each marketing touchpoint in the customer journey.

**Models to support:**
- **Last click** — current default across all platforms (baseline)
- **First click** — which channel initiates journeys
- **Linear** — equal credit to each touchpoint
- **Time decay** — more credit to touchpoints closer to conversion
- **Position based** (U-shaped) — 40% first, 40% last, 20% middle
- **Data-driven** (AI-powered) — trained on actual conversion path data

**What this unlocks:**
- "Meta Ads appears to be a poor performer on last-click, but it initiates 43% of journeys that convert via Google. Under linear attribution, Meta's true contribution is 3x higher."
- Comparison view: see how each channel's value changes across attribution models
- Budget recommendations that factor in true attribution contribution

**Implementation path:**
- Extend GA4 data fetching to pull conversion path reports
- New `AttributionModel` computation layer in the API
- Attribution comparison UI on the Overview tab
- Store attribution model results in MetricSnapshot

---

### 4.2 Share of Voice Dashboard

**What it is:** A unified view of how much of the total search/social/paid landscape the client owns, compared to their key competitors.

**Components:**
- **Organic share of voice** — % of total clicks for tracked keyword set (via SemRush + GSC)
- **Paid share of voice** — impression share vs competitor domains (Google Ads auction insights + estimated meta share)
- **Brand SOV** — share of branded searches
- **Topic SOV** — share across specific keyword topic clusters

**Why this is a powerful agency tool:** Share of voice is the metric CMOs actually care about at board level. It translates channel-level performance into a business-level competitive position.

---

### 4.3 Full-Funnel Efficiency Analysis

**What it is:** A structured analysis of how efficiently marketing spend moves prospects through each stage of the funnel — Awareness → Interest → Consideration → Intent → Conversion → Retention.

**What it adds:**
- Stage-by-stage conversion rates with benchmarks
- Bottleneck identification: "The biggest drop-off in your funnel is between Sessions and Conversions (2.1% vs 3.8% industry average) — this is a landing page and CRO problem, not a traffic problem."
- Channel contribution per funnel stage: "Meta is excellent for awareness (low CPM) but poor for bottom-of-funnel (high CPA). Google Search is the opposite."
- Recommended channel mix per funnel stage

---

### 4.4 Seasonality Intelligence

**What it is:** Automatically detects and maps seasonal patterns from historical MetricSnapshot data, and uses these to contextualise current performance.

**What it produces:**
- Per-channel seasonality calendars: "This client typically sees a 35% boost in sessions during November-December and a 20% dip in January."
- Seasonal baseline adjustments: anomaly thresholds are recalibrated based on expected seasonal variation (removing false positives during expected slow periods)
- Forward-looking seasonality alerts: "Based on last year, you should expect a 25% increase in conversions starting in 3 weeks. Ensure budget is paced to capture this."
- Automated pre-season strategy prompts

---

### 4.5 Lifetime Value & Revenue Attribution

**What it is:** Integrates e-commerce data (WooCommerce/Shopify) with marketing channel data to track revenue all the way back to the channel that drove it.

**What it produces:**
- Revenue by acquisition channel
- Customer lifetime value estimates by acquisition channel
- Payback period analysis: "Customers acquired via Google Ads have a 3.2-month payback period vs 5.7 months for Meta"
- Cohort analysis: revenue generated by customers acquired in each month
- Marketing efficiency ratio: revenue generated ÷ marketing cost, per channel

---

### 4.6 Custom KPI Builder

**What it is:** Allow account managers to define custom metrics that are calculated from combinations of existing data.

**Examples:**
- `Blended CPA = (Google Ads spend + Meta spend) / total_conversions`
- `True ROAS = total_revenue / (Google Ads spend + Meta spend + agency fee)`
- `Organic efficiency = (organic_sessions × avg_conversion_rate × avg_order_value) / SEO_retainer_cost`

**Implementation path:**
- `CustomMetric` model (name, formula, clientId, colour, displayOn[])
- Formula editor with metric picker
- Metrics displayed as cards and in reports

---

## 5. New Platform Integrations

### Priority 1 — High Impact, High Demand

| Platform | Data Available | Value |
|---|---|---|
| **TikTok Ads** | Spend, impressions, clicks, video views, CTR, CPM, conversions, ROAS | Essential — most agencies running TikTok now |
| **LinkedIn Ads** | Spend, impressions, clicks, CTR, CPC, leads, company engagement | B2B agencies need this |
| **Microsoft Advertising (Bing Ads)** | Spend, clicks, impressions, CTR, CPC, conversions, search terms | Underrated channel, high intent |
| **YouTube Analytics** | Views, watch time, CTR, average view duration, revenue, audience retention | Separate from GA4, richer video-specific data |
| **Klaviyo / Email Marketing** | Sends, opens, clicks, conversions, revenue, list growth, unsubscribes | Email is often the highest ROAS channel |

### Priority 2 — Significant Agency Value

| Platform | Data Available | Value |
|---|---|---|
| **HubSpot CRM** | Contacts, deals, pipeline value, deal stage, revenue close data | Closes the loop between marketing and sales |
| **Salesforce** | Same as HubSpot — enterprise clients need this | Enterprise accounts |
| **Pipedrive** | Deals, pipeline, activity | SMB CRM integration |
| **CallRail / Call Tracking** | Calls by source, call duration, call conversion, keyword that drove call | High-value lead gen clients |
| **Hotjar / Microsoft Clarity** | Heatmap scores, session recordings, rage click events, form abandonment | CRO integration with landing page analysis |
| **Core Web Vitals (CrUX API)** | LCP, CLS, INP, FID — real-user performance data | SEO ranking factor, free Google data |
| **Google Reviews / Trustpilot** | Review rating, review count, sentiment trend | Local SEO and reputation management |

### Priority 3 — Future-Proofing

| Platform | Value |
|---|---|
| **Pinterest Ads** | E-commerce clients in lifestyle/fashion |
| **X (Twitter) Ads** | B2B and tech clients |
| **Reddit Ads** | Tech, gaming, finance verticals |
| **Snapchat Ads** | Youth-targeted brands |
| **Amazon Ads** | E-commerce clients selling on Amazon |
| **Apple Search Ads** | Mobile app clients |
| **Spotify Ads** | Audio/brand awareness campaigns |

### Integration Architecture Upgrade

- **Integration registry:** A standardised `IntegrationConfig` pattern where each integration defines its connection parameters, data types, and fetch functions
- **Integration health dashboard:** Per-client integration status (connected / error / stale token / no data) with one-click reconnect
- **Unified credential vault:** Encrypted credential storage per client, per integration — replacing scattered environment variables
- **Data normalisation layer:** A common schema for metrics regardless of source (spend, impressions, clicks, conversions, revenue) with platform-specific extension fields

---

## 6. Reporting Revolution

### 6.1 Automated Report Scheduling

**What it is:** Reports are generated and delivered automatically on a schedule — no account manager involvement required.

**Features:**
- Per-client report schedule (weekly, monthly, quarterly)
- Automatic data pull + AI commentary generation + section assembly
- Delivery via email (HTML email with PDF attachment), Slack, or client portal
- Template selection per schedule
- "Review before send" option: report is drafted and notified to account manager for approval before delivery
- Retry logic if data sources are unavailable

**This is the single highest-leverage feature for an agency.** One account manager managing 20+ clients cannot manually produce monthly reports for all of them. Automation makes it feasible.

---

### 6.2 Interactive Web Reports (Beyond PDF)

**What it is:** A new report format that is a live web experience, not a static document.

**Features:**
- Fully interactive charts (zoom, hover, filter) — not static images
- Date range picker within the shared report (client can explore different periods)
- Expandable sections with drill-down data
- Client annotations: client can add comments or questions directly on the report
- Read receipts: know when a client opened a report and which sections they spent time on
- Engagement heatmap: which sections attract most attention
- Follow-up CTA: "Book a strategy call" button embedded in reports
- Custom branding: client colours, fonts, and logo applied to report theme

---

### 6.3 AI Video Report Generation

**What it is:** A narrated video summary of the monthly report, automatically generated by AI.

**How it works:**
- AI generates a structured script based on report data and commentary
- Text-to-speech narration (OpenAI TTS or similar)
- Screen-recorded walkthrough of the key charts and metrics with highlight overlays
- 2-4 minute video summary perfect for client email or Slack delivery
- Account manager can add their own voiceover over the AI-generated visuals

---

### 6.4 Slide Deck Export

**What it is:** Export reports as presentation decks (Google Slides, PowerPoint, Keynote).

**Features:**
- One slide per report section
- Auto-formatted with key metrics, charts (rendered as images), and commentary bullets
- Branded template (client colours + agency logo)
- Editable after export
- Account manager can annotate with additional slides

---

### 6.5 Report Collaboration

**What it is:** Multiple team members can work on a report simultaneously, with version control and comment threading.

**Features:**
- Concurrent editing indicators ("Sarah is editing this section")
- Comment threads on any section
- Version history with named snapshots ("v1 — initial draft", "v2 — after client feedback")
- Approval workflow: report must be approved by a senior before being sent
- Change tracking with diff view
- @mention colleagues in comments with email notifications

---

### 6.6 Benchmark Library in Reports

**What it is:** Every metric in a report automatically shows how it compares to industry benchmarks.

**Data sources:**
- Agency's own client data (aggregate benchmarks across portfolio)
- Industry databases (WordStream, Databox, HubSpot) via AI retrieval
- Custom benchmarks set by account managers

**Example:** A CTR of 2.4% shows as "18% above e-commerce benchmark (2.03%)" rather than just a number.

---

### 6.7 Report Intelligence Layer

**What it is:** AI that analyses completed reports across all clients to surface portfolio-level patterns.

**Examples:**
- "3 of your 5 e-commerce clients have seen declining ROAS this month — this may be a broader platform issue, not a client-specific one."
- "Clients using TikTok + Google Ads together are averaging 22% higher overall ROAS than single-channel clients."
- "The clients showing the best year-over-year growth all have landing pages scoring above 75 in your page analyser."

---

## 7. Agency Operations Suite

### 7.1 Client Health Dashboard

**What it is:** A portfolio-level overview that gives the agency a real-time view of the health of every client account.

**Metrics per client:**
- Overall performance score (aggregate of channel health scores)
- Trend direction (improving / stable / declining over last 30 days)
- Risk flag: clients with multiple HIGH anomalies or declining trends
- Report status (overdue / draft / sent)
- Last contact date
- Contracted hours utilisation (actual vs budgeted)
- Active integration count

**AI-powered churn risk scoring:** An AI model trained on performance trends, engagement signals, and communication frequency that predicts which clients are at risk of churning. Outputs a risk score (Low / Medium / High) with the primary risk factor.

**Portfolio analytics:**
- Total managed ad spend across all clients
- Portfolio blended ROAS
- Total organic traffic under management
- Average client health score trend
- Top performing clients / underperforming clients

---

### 7.2 Internal Task & Action Tracking

**What it is:** Close the loop between AI recommendations and actual account work. Every AI recommendation generates an optional "action" that can be assigned to a team member.

**How it works:**
- AI generates a recommendation: "Increase Google Ads budget for Campaign X by £200"
- Account manager clicks "Create Action" from the recommendation
- Action is assigned (user, due date, priority, notes)
- Actions appear in a personal to-do view and a team work board
- When completed, account manager can mark it done and optionally note the outcome
- Outcome data feeds back into future AI recommendations

---

### 7.3 Client Communication Hub

**What it is:** A centralised log of all client communication related to each account, linked to specific reports, anomalies, and actions.

**Features:**
- Send emails directly from the platform (client update templates)
- Log phone calls and meetings with notes
- All report shares and proposal views automatically logged
- Communication timeline per client
- AI-drafted email copy for common scenarios (monthly update, anomaly explanation, proposal follow-up, renewal conversation)
- Pre-built email sequences for standard agency communications

---

### 7.4 SOW & Contract Manager

**What it is:** Create, manage, and track client Statements of Work from within the platform.

**Features:**
- SOW builder with service selections (linked to the existing pricing module)
- Contracted deliverables list with monthly tracking
- Contract renewal date alerts
- Performance vs contracted KPI tracking
- Automated renewal proposal generation when a contract is nearing expiry
- Document storage for signed contracts

---

### 7.5 Agency Revenue Intelligence

**What it is:** Financial overview of the agency itself — not client performance, but business performance.

**Metrics:**
- Monthly recurring revenue (MRR) across all client retainers
- MRR trend and growth rate
- Revenue at risk (clients flagged as churn risk × retainer value)
- New business pipeline value (from proposal tool)
- Conversion rate on proposals
- Average deal size by service type
- Revenue per account manager

---

### 7.6 Team Performance Analytics

**What it is:** Aggregate insights into how the team is using the platform and managing accounts.

**Metrics:**
- Reports created per team member
- AI commentary usage rates
- Actions created vs completed per account manager
- Client communication frequency
- Time from report creation to delivery
- Proposal win rates by team member

---

## 8. Client Portal & Experience Layer

### 8.1 Self-Serve Client Dashboard

**What it is:** A dedicated, white-labelled portal where clients can log in and see their own live performance data.

**Features:**
- Branded with the agency logo and client-specific colours
- Clients see only their own data — completely isolated
- Configurable access: agency decides which sections and metrics are visible
- Date range selector (within limits set by the agency)
- Read-only AI insights
- Access to their own reports and proposals
- All notifications about their account

**Access control:**
- New `ClientUser` model — separate from agency staff users
- Client users linked to a single client record
- Permissions configurable per client user
- Login via email link (magic link, no password required) for simplicity

---

### 8.2 Goal Setting & Tracking

**What it is:** Account managers (and optionally clients) can set specific, measurable marketing goals per client. The platform tracks progress automatically.

**Goal types:**
- Channel-specific KPI targets (e.g., "Achieve 3.0 ROAS on Google Ads by Q4")
- Growth targets (e.g., "Grow organic sessions by 30% in 6 months")
- Revenue targets (e.g., "Generate £50k in e-commerce revenue this quarter")
- Reach targets (e.g., "Achieve 100k impressions per month on Meta")

**Features:**
- Progress bars on client dashboard
- On-track / at-risk / off-track status
- AI-generated guidance when a goal is at risk
- Goal history and achievement log
- Report includes goal progress summary

---

### 8.3 Client Approval Workflows

**What it is:** Before a report or proposal is sent, the client can be given a draft view with an approval mechanism.

**Features:**
- Client receives email: "Your October report is ready for review"
- Client opens the report and can add comments on specific sections
- Client clicks "Approve" or "Request changes"
- Account manager notified of decision
- Approved reports are automatically locked from further editing
- Full approval audit trail

---

### 8.4 NPS & Client Satisfaction Tracking

**What it is:** Automated Net Promoter Score surveys sent after reports, proposals, or at regular intervals.

**Features:**
- Configurable survey frequency per client
- 0-10 NPS question + optional qualitative feedback
- NPS score tracked over time per client and across portfolio
- Low NPS triggers an internal alert and suggested action
- AI sentiment analysis of qualitative feedback
- NPS trend in client health dashboard

---

## 9. Automation & Workflow Engine

### 9.1 Alert & Notification System

**What it is:** Anomalies are detected but currently silently — this delivers them to the right people.

**Delivery channels:**
- **Email:** Digest format (immediate for HIGH, daily digest for MEDIUM/LOW)
- **Slack:** Direct message or channel post with formatted anomaly cards
- **Microsoft Teams:** Same as Slack via webhook
- **In-app:** Notification bell with unread count
- **SMS:** For critical account events (optional, third-party service)
- **Webhooks:** Send alert data to any external system

**Alert types:**
- Anomaly alerts (existing system, now delivered)
- Report ready for review
- Report sent / client opened report
- Goal at risk
- Client portal login (client viewed their dashboard)
- Proposal viewed by client
- Integration connection error
- API rate limit or data fetch failure

**Configurable routing:**
- Per-user notification preferences
- Per-client escalation rules (critical accounts get immediate alerts)
- Quiet hours configuration

---

### 9.2 Automated Monthly Reporting Workflow

**Workflow steps:**
1. Trigger: 1st of each month (or custom date per client)
2. Create report from default template
3. Pull all channel data for previous month
4. Generate AI commentary for all sections
5. Generate executive summary
6. Flag any sections with missing data for account manager review
7. Optional: send to account manager for review with 48-hour approval window
8. If approved (or auto-approve enabled): send to client with branded email
9. Log delivery in communication hub
10. Notify account manager on open/engagement

---

### 9.3 Performance Threshold Automations

**What it is:** Set rules that trigger actions when performance crosses specific thresholds.

**Examples:**
- ROAS drops below 2.0 for 3 consecutive days → pause Meta campaign + notify account manager
- Google Ads impression share falls below 60% → trigger budget review action
- Organic sessions drop 20%+ week-over-week → schedule emergency strategy review
- CPA exceeds target by 50% → send account manager urgent alert

**Notes on safe automation:** Direct campaign pausing should always require account manager confirmation via a one-click approval in the alert. The platform recommends and initiates, humans approve and execute.

---

### 9.4 Zapier / Make Integration

**What it is:** A public webhook API that allows i3media Report to connect with any external tool via Zapier or Make.

**Trigger events:**
- New anomaly detected
- Report published
- Proposal viewed
- Client goal status changed
- Performance threshold crossed

**Action endpoints:**
- Retrieve client metrics
- Create a report action
- Update goal status

---

### 9.5 Scheduled Data Snapshots

**What it is:** Automated metric snapshot captures running on a schedule, not just on report creation.

**Current state:** MetricSnapshot is populated when a report is created (partially, for Google Ads).

**New state:** Every night, the platform runs a lightweight data pull for all configured clients and stores a daily snapshot. This builds the historical dataset needed for trend analysis, forecasting, and anomaly baseline calculation without any manual trigger.

---

## 10. Business Intelligence & Revenue Tracking

### 10.1 Media Plan Builder

**What it is:** A planning tool for building out paid media plans with budget projections, channel mix recommendations, and forecasted outcomes.

**Features:**
- Input: total budget, campaign objectives, duration, target audience
- AI-recommended channel split based on objectives (brand awareness vs lead gen vs e-commerce)
- Projected impressions, clicks, conversions per channel based on current benchmark data
- Budget scenarios (conservative / base / aggressive)
- Export as a client-ready presentation
- Link to actual performance once campaigns are live (plan vs actual)

---

### 10.2 Campaign Planning Calendar

**What it is:** A marketing calendar that shows upcoming campaigns, product launches, seasonal events, and planned activity across all channels.

**Features:**
- Per-client calendar with colour-coded campaign events
- Sync with Google Calendar
- Automatic annotation of reports and dashboards: "Black Friday campaign active during this period"
- AI context injection: anomaly analysis automatically factors in planned events ("Sessions spike is expected — Black Friday sale started yesterday")
- Upcoming event alerts: "You have a product launch in 12 days — ensure campaigns are set up"

---

### 10.3 Invoice & Spend Reconciliation

**What it is:** Compare actual platform ad spend (pulled directly from Google Ads, Meta, etc.) against planned budgets and client invoices.

**Features:**
- Monthly spend actual vs planned by channel
- Variance alert when actual spend deviates >5% from plan
- Auto-generate spend summary report for finance team
- Track agency fee vs ad spend ratio
- Highlight over/under-spend across portfolio

---

### 10.4 Proposal Pipeline CRM

**What it is:** Turn the proposals tool from a document generator into a full sales pipeline tracker.

**Pipeline stages:** Prospect → Proposal Sent → Proposal Viewed → Negotiating → Won → Lost

**Features:**
- Kanban board view of all active proposals
- Automatic stage updates (Proposal Viewed stage updates when client opens share link)
- Won/Lost tracking with reason (for AI learning)
- Projected close date and value
- Win rate analytics by service type, industry, deal size
- Automated follow-up prompts: "This proposal was viewed 5 days ago but not responded to. Would you like to send a follow-up?"
- Revenue forecasting from pipeline

---

## 11. Platform Architecture Upgrades

### 11.1 Real-Time Data Streaming

**What it is:** Replace the current request-per-section polling model with a real-time data streaming architecture for live dashboards.

**Current state:** Each section makes 5-15 fetch requests on mount. Fast, but not real-time.

**New state:** WebSocket connection to the server that streams metric updates as they are computed. Dashboard sections update progressively without full page reload. Combined with server-sent events for notification delivery.

---

### 11.2 Data Caching Layer

**What it is:** Intelligent caching of external API responses to reduce latency, API costs, and rate limit exposure.

**Strategy:**
- Redis or Vercel KV cache for API responses with TTLs matching data freshness (hourly for ad platform data, daily for SEO data)
- Cache invalidation on explicit refresh
- Cache warming: pre-fetch common client data during off-peak hours
- Stale-while-revalidate pattern: serve cached data immediately, update in background

---

### 11.3 White-Label Mode

**What it is:** Allow the entire platform to run under a custom domain and brand for white-label deployment — either for the agency's own use at scale, or as a product sold to other agencies.

**Features:**
- Custom domain support
- Complete logo, colour scheme, and brand name replacement
- Email templates with custom branding
- Suppressed i3media branding across all client-facing surfaces
- Per-tenant configuration (the agency customises their deployment)
- Optional: multi-tenant SaaS mode where each agency is a separate tenant

---

### 11.4 External API

**What it is:** A documented, versioned public API that allows clients and third-party systems to access their own data programmatically.

**Endpoints:**
- `GET /api/v1/clients/{id}/metrics` — retrieve current metrics
- `GET /api/v1/clients/{id}/reports` — list reports
- `POST /api/v1/clients/{id}/snapshots` — push external metric data
- `GET /api/v1/clients/{id}/insights` — retrieve latest AI insights

**Authentication:** API key per client or service account. Rate limited and audited.

---

### 11.5 Data Export & Business Intelligence Connectors

**What it is:** Export any data from the platform into external analytics and BI tools.

**Formats:**
- CSV / Excel download for any table or dataset
- Google Looker Studio connector (native data source)
- BigQuery export (daily snapshot push for historical analysis)
- Data warehouse export (Snowflake, Redshift, Databricks)
- Google Sheets live sync

---

### 11.6 Advanced Permission System

**What it is:** Extend the current role-based permissions to support client-level and section-level access control.

**New permission dimensions:**
- Client-level: "User A can access Clients 1-5 only"
- Section-level: "User B cannot see the paid media spend data"
- Action-level: "User C can view reports but not publish or share them"
- Time-based: "Contractor access expires on a specific date"

---

### 11.7 Audit Log

**What it is:** A full audit trail of all significant actions taken in the platform.

**Logged events:**
- User logins and logouts
- Report created / edited / published / shared / deleted
- Client created / modified / deleted
- Integration connected / disconnected
- AI generation triggered
- Proposal viewed (external)
- Report opened (external)
- Settings changed
- User created / deleted / role changed

---

### 11.8 Performance & Scalability

- **Serverless function timeout management:** Long-running AI calls should be moved to background jobs (Vercel Queues or similar) to avoid timeout limits and improve UX
- **Database query optimisation:** Add indexes for the most common query patterns (client + date range lookups on MetricSnapshot)
- **Image optimisation:** Implement Next.js Image component across all screenshot and logo usages
- **Progressive data loading:** Load critical KPIs first, then charts, then tables — prioritising what users look at first
- **API pagination:** All list endpoints should support pagination to handle large datasets gracefully

---

## 12. Mobile & Notifications

### 12.1 Progressive Web App (PWA)

**What it is:** Make the platform installable as a mobile app on iOS and Android without a native app build.

**Features:**
- Install prompt on mobile browsers
- Home screen icon
- Offline support for the most recently viewed dashboards (cached data)
- Push notifications via Web Push API
- Responsive layouts optimised for thumb-friendly navigation

---

### 12.2 Mobile-Optimised Dashboard Views

**What it is:** A specifically designed mobile experience for checking key metrics on the go.

**Features:**
- Simplified one-column KPI card layout
- Swipe navigation between sections
- Critical metrics summary at the top: "Your 3 clients with alerts today"
- Quick report preview mode
- One-tap AI summary for any section

---

### 12.3 Push Notification System

**What it is:** Real-time push notifications for critical platform events.

**Notification types:**
- HIGH severity anomaly detected on a client account
- Report has been opened by a client
- Proposal viewed by a prospect
- Goal at risk
- Integration connection error
- Scheduled report delivered

---

## 13. Competitive Positioning

### Where i3media Report Should Win

| Feature Category | Current Competitors | i3media Advantage |
|---|---|---|
| **Cross-channel intelligence** | Most tools are single-channel (e.g., SEMrush = SEO only, Supermetrics = data aggregation only) | Native cross-channel AI analysis with correlated insights |
| **AI quality** | Most competitors use AI as a label, not a capability (generic summaries, no anomaly detection, no root cause) | Deep, context-aware AI with anomaly detection, root cause, forecasting, conversational analyst |
| **Agency workflow** | ReportGarden, AgencyAnalytics — decent reporting, limited AI, no strategic tools | Full agency OS: reporting + strategy + proposals + client management + operations |
| **Proposal generation** | Separate tools (Proposify, PandaDoc) with no data integration | AI proposals backed by live channel data and keyword research |
| **Client experience** | Most tools show the client a PDF | Interactive portal with real-time data, goal tracking, and annotations |
| **Automation** | Minimal in most tools — manual report creation is universal | Fully automated monthly report workflow, smart alerts, action tracking |

### The Category to Own: "AI-Native Agency Intelligence Platform"

The market position: i3media Report is not a reporting tool, not a dashboard tool, not an analytics tool. It is the **AI-native operating system for modern digital marketing agencies** — the single platform where account managers manage, analyse, strategise, report, automate, and grow their client portfolio.

This category does not currently have a clear winner. Klipfolio, AgencyAnalytics, and Supermetrics all play in adjacent spaces but none combine:
- Live multi-channel data
- Deep AI analysis with root cause
- Agency workflow tools
- Client portal
- Automation
- Strategic outputs (proposals, strategy documents, media plans)

---

## 14. Phased Roadmap

### Phase 1 — Foundation Hardening (0–3 months) ✅ Complete

- [x] **Notification system** — email + Slack alerts for anomalies and key events
- [x] **Historical snapshot automation** — nightly data pulls for all clients
- [x] **Conversational AI chat** — "Ask the data" interface on client dashboards
- [x] **Root cause analysis** — upgrade anomaly cards with AI explanation chain
- [x] **New integrations: TikTok Ads** — highest demand new integration
- [x] **New integrations: Microsoft Advertising** — quick win, similar to Google Ads
- [x] **Automated monthly report workflow** — schedule, generate, deliver
- [x] **Core Web Vitals integration** — free Google data, high SEO value
- [x] **Notification preferences UI** — user-configurable alerts

---

### Phase 2 — AI Intelligence Expansion (3–6 months) ✅ Complete

- [x] **Predictive performance forecasting** — 30/60/90 day projections
- [x] **Budget optimisation advisor** — cross-channel budget recommendations
- [x] **Creative performance intelligence** — Meta and Google ad creative analysis
- [x] **AI strategy document generator** — quarterly strategy output per client
- [x] **New integrations: LinkedIn Ads, Klaviyo/email marketing**
- [x] **Attribution modelling** — multi-touch attribution comparison
- [x] **Seasonality intelligence** — automated pattern detection and baseline adjustment
- [x] **Share of voice dashboard** — competitive position tracking
- [x] **Goal setting & tracking** — per-client KPI goals with progress tracking

---

### Phase 3 — Agency Operating System (6–12 months) ✅ Complete

- [x] **Client portal** — self-serve client-facing dashboard with magic-link login
- [x] **Internal action tracking** — AI recommendations → assigned actions → outcomes
- [x] **Client communication hub** — centralised communication log and email drafting
- [x] **Proposal pipeline CRM** — full sales pipeline with stages, value, close date, lost reason
- [x] **Report collaboration** — multi-user comments, approval workflow, approval status
- [x] **Client health dashboard** — portfolio-level overview with churn risk scoring (`/portfolio`)
- [x] **New integrations: HubSpot CRM, YouTube Analytics, CallRail**
- [x] **Competitor intelligence feed** — ongoing competitive monitoring with `CompetitorSnapshot`
- [x] **Media plan builder** — paid media planning with channel allocation and AI forecast outputs
- [ ] **Interactive web reports** — fully live interactive report experience beyond the current read-only share view *(in progress — share view exists; full interactivity deferred to Phase 4)*

---

### Phase 4 — Platform & Scale (12–18 months)

- [ ] **White-label mode** — full rebrandability for agency self-deployment
- [ ] **External API** — programmatic data access with API key authentication
- [ ] **Data export connectors** — BigQuery, Looker Studio, Google Sheets sync
- [ ] **Real-time data streaming** — WebSocket-based live dashboards
- [ ] **Progressive Web App** — mobile installable with push notifications
- [ ] **AI video report generation** — narrated video summaries
- [ ] **SOW & contract manager** — document and renewal tracking
- [ ] **Agency revenue intelligence** — MRR, churn risk, pipeline metrics
- [ ] **Multi-tenant SaaS** — platform as a product sold to other agencies

---

## 15. Feature Priority Matrix

### High Impact / Low Effort — Do First

| Feature | Impact | Effort | Why |
|---|---|---|---|
| Notification system (email + Slack) | ★★★★★ | Low | Existing anomaly detection just needs delivery layer |
| Nightly snapshot automation | ★★★★★ | Low | Unlocks all historical/forecasting features |
| Root cause analysis for anomalies | ★★★★ | Low | Extends existing AI prompt, minimal new code |
| Goal setting & tracking | ★★★★ | Low | New model + simple UI, high client retention value |
| Microsoft Advertising integration | ★★★★ | Low | Similar pattern to Google Ads, high-demand |
| Core Web Vitals (CrUX API) | ★★★★ | Low | Free Google API, no auth complexity |
| Report scheduling (monthly auto-send) | ★★★★★ | Medium | Saves hours per month per client |
| Conversational AI chat | ★★★★★ | Medium | Reuses existing AI infrastructure, massive UX upgrade |

### High Impact / High Effort — Plan Carefully

| Feature | Impact | Effort | Why |
|---|---|---|---|
| Client portal | ★★★★★ | High | New auth system, new UI, significant scope |
| Attribution modelling | ★★★★★ | High | Complex data model, requires historical data |
| TikTok Ads integration | ★★★★ | Medium | New API pattern, docs are good |
| Predictive forecasting | ★★★★★ | High | Statistical model + AI, needs history first |
| Interactive web reports | ★★★★ | High | Major report system redesign |
| AI video reports | ★★★★ | Very High | New technology stack (TTS, video) |
| White-label mode | ★★★★ | High | Affects every front-end surface |

### Medium Impact / Low Effort — Fill the Backlog

| Feature | Impact | Effort | Why |
|---|---|---|---|
| Slide deck export | ★★★ | Medium | PDF → PPTX format conversion |
| Campaign planning calendar | ★★★ | Low | Simple model + UI |
| Spend reconciliation | ★★★ | Low | Data already exists, new view |
| Competitor keyword alerts | ★★★ | Low | Extend existing SemRush calls |
| NPS surveys | ★★★ | Low | Email template + simple model |
| Custom KPI builder | ★★★ | Medium | Formula engine, new model |

### Low Impact / High Effort — Defer

| Feature | Impact | Effort | Why |
|---|---|---|---|
| Native mobile app | ★★ | Very High | PWA achieves most of the same goals |
| Salesforce integration | ★★ | High | Complex OAuth, limited agency use |
| Amazon Ads integration | ★★★ | High | Narrow client base justifies it for e-commerce only |
| Real-time WebSocket streaming | ★★ | High | Current polling is fast enough for most use cases |

---

## Closing Manifesto

The marketing industry is on the edge of a transformation. AI will not replace account managers — but account managers with AI-native platforms will replace those without. The agency that can demonstrate they have the most sophisticated view of a client's marketing performance, the most proactive approach to spotting problems before they cost money, and the most data-backed strategy recommendations will win business and keep it.

i3media Report has the foundations to be that platform. The integrations are in place. The AI is working. The report builder is solid. What it needs now is the transformation from **a tool account managers use** into **a platform that works for them** — actively monitoring, alerting, recommending, automating, and communicating on behalf of the team.

The roadmap above is not a wish list. It is a sequence of decisions about what to build, in what order, to get to a platform that:

1. **Saves account managers 10+ hours per month** through automation
2. **Generates demonstrably better client outcomes** through AI-driven optimisation
3. **Retains clients longer** through transparency, portal access, and proactive communication
4. **Wins more new business** through superior proposals, sharper analytics, and a compelling story
5. **Scales the agency** without scaling headcount proportionally

Build this, and the question stops being "why would we use this?" and starts being "how did we ever manage without it?"

---

*Document version: 1.3 — April 2026 (Phase 3 substantially complete — 9/10 items done)*  
*Next review: After Phase 4 planning session*
