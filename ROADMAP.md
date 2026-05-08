# Roadmap — i3media Report Platform

i3media Report is the central nervous system of a modern digital marketing agency — an intelligence engine that aggregates data from 15 marketing channels, generates AI-powered insights, automates reporting workflows, and manages the full client lifecycle. The platform already covers data integration, AI analysis, report automation, proposals, client portal, and agency operations. This document outlines what comes next.

## What's Built

| Capability Area | Highlights |
|---|---|
| **Data integrations** | 15 channels: GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, SemRush, GSC, Moz, WooCommerce, Shopify, YouTube, HubSpot, CallRail |
| **AI intelligence** | 24+ endpoints: anomaly detection, root cause analysis, forecasting, budget advice, creative intelligence, conversational chat, strategy documents, attribution, audience suggestions, cross-platform creative, keyword suggestions, QA summary, content strategy |
| **Report builder** | Drag-and-drop sections, AI commentary, collaboration comments, approval workflow, PDF export, share links, automated monthly generation |
| **Agency tools** | Keyword planner, PPC proposals with pipeline CRM, landing page analyser, media plan builder, content strategy generator, LLM.txt generator |
| **Client management** | Full CRUD, integration badges, contracted hours, AI instructions, action tracking, communication hub |
| **Client portal** | Magic-link login, goals & tracking, reports view, communications |
| **Notifications** | Email (Resend) + Slack delivery, per-user preferences, quiet hours, digest frequency |
| **Portfolio health** | Cross-client health dashboard, churn risk scoring, anomaly counts |
| **Historical data** | Nightly automated snapshots across all channels, powering forecasting and seasonality |
| **Competitor intelligence** | SemRush-backed monitoring, share of voice, AI-generated competitive insights |

---

## Phase 4 — Next Priorities

Phase 4 focuses on platform scalability, new delivery formats, and agency business intelligence. The one deferred Phase 3 item (interactive web reports) is included here.

### Interactive Web Reports

Upgrade the existing read-only share view into a fully interactive report experience:

- Interactive charts with zoom, hover, and filter controls
- Date range picker within the shared report
- Expandable drill-down sections
- Client annotations and comment threads
- Read receipts and section engagement tracking
- Custom branding per client (colours, fonts, logo)

### White-Label Mode

Full rebrandability for agency self-deployment or resale to other agencies:

- Custom domain support
- Complete logo, colour scheme, and brand name replacement
- Branded email templates
- Per-tenant configuration
- Suppressed i3media branding on all client-facing surfaces

### External API

A documented, versioned public API for programmatic data access:

- `GET /api/v1/clients/{id}/metrics` — retrieve current metrics
- `GET /api/v1/clients/{id}/reports` — list reports
- `POST /api/v1/clients/{id}/snapshots` — push external metric data
- `GET /api/v1/clients/{id}/insights` — retrieve latest AI insights
- API key authentication per client, rate limited and audited

### Data Export & BI Connectors

Enable data flow into external analytics and BI tools:

- CSV / Excel download for any dataset
- Google Looker Studio connector (native data source)
- BigQuery export (daily snapshot push)
- Google Sheets live sync

### Agency Revenue Intelligence

Financial overview of the agency business itself:

- Monthly recurring revenue (MRR) across all client retainers
- MRR trend and growth rate
- Revenue at risk (churn-risk clients × retainer value)
- New business pipeline value from the proposal tool
- Proposal conversion rate and average deal size
- Revenue per account manager

### SOW & Contract Manager

Create, manage, and track client Statements of Work:

- SOW builder with service selections
- Contracted deliverables with monthly tracking
- Contract renewal date alerts
- Performance vs contracted KPI tracking
- Automated renewal proposal generation

### AI Video Report Generation

Narrated video summaries of monthly reports, automatically generated:

- AI-generated structured script from report data
- Text-to-speech narration (OpenAI TTS or similar)
- Key chart and metric walkthrough with highlight overlays
- 2–4 minute videos for client email or Slack delivery

### Progressive Web App

Make the platform installable on mobile:

- Install prompt on mobile browsers with home screen icon
- Offline support for recently viewed dashboards
- Push notifications via Web Push API
- Mobile-optimised one-column KPI card layout
- Swipe navigation between sections

### Multi-Tenant SaaS

Platform as a product sold to other agencies — each agency runs as a separate tenant with isolated data, branding, and configuration.

---

## Backlog — High-Value Additions

Items not in the Phase 4 core but high value relative to effort. These can be slotted in opportunistically.

| Feature | Impact | Effort | Notes |
|---|---|---|---|
| Slide deck export (PPTX/Google Slides) | ★★★ | Medium | One slide per report section, branded template, editable after export |
| Campaign planning calendar | ★★★ | Low | Per-client marketing calendar with event annotations on dashboards |
| Spend reconciliation | ★★★ | Low | Actual platform spend vs planned budgets, variance alerts |
| NPS & client satisfaction tracking | ★★★ | Low | Automated surveys, NPS trend per client and portfolio-wide |
| Custom KPI builder | ★★★ | Medium | Define blended metrics from cross-channel data (e.g., blended CPA, true ROAS) |
| Competitor keyword alerts | ★★★ | Low | Extend SemRush calls to alert on competitor position gains |
| Report intelligence layer | ★★★★ | Medium | AI surfaces portfolio-level patterns across all client reports |
| Benchmark library in reports | ★★★ | Medium | Every metric auto-compared to industry benchmarks |
| Team performance analytics | ★★★ | Low | Reports created, actions completed, proposal win rates per team member |
| Performance threshold automations | ★★★★ | Medium | Rules that trigger actions when metrics cross thresholds (e.g., ROAS < 2.0 for 3 days) |
| Zapier / Make integration | ★★★ | Medium | Public webhook API for connecting to external tools |
| Audit log | ★★★★ | Medium | Full trail of logins, edits, publishes, shares, and setting changes |

---

## Future Integrations

### Priority 2 — Significant Agency Value

| Platform | Value |
|---|---|
| Salesforce | Enterprise CRM — closes the marketing-to-sales loop |
| Pipedrive | SMB CRM integration |
| Hotjar / Microsoft Clarity | Heatmaps, session recordings, rage clicks — CRO integration |
| Google Reviews / Trustpilot | Review ratings and sentiment for local SEO and reputation |

### Priority 3 — Future-Proofing

| Platform | Value |
|---|---|
| Pinterest Ads | E-commerce clients in lifestyle/fashion |
| X (Twitter) Ads | B2B and tech clients |
| Reddit Ads | Tech, gaming, finance verticals |
| Snapchat Ads | Youth-targeted brands |
| Amazon Ads | E-commerce clients selling on Amazon |
| Apple Search Ads | Mobile app clients |
| Spotify Ads | Audio/brand awareness campaigns |

### Integration Architecture Goals

- **Integration registry** — standardised `IntegrationConfig` pattern for connection params, data types, and fetch functions
- **Integration health dashboard** — per-client connection status with one-click reconnect
- **Unified credential vault** — encrypted per-client credential storage replacing scattered env vars
- **Data normalisation layer** — common metric schema (spend, impressions, clicks, conversions, revenue) with platform-specific extensions

---

## AI Intelligence — Unrealised Potential

Features that extend the existing AI layer into deeper analytical territory.

### Audience Insight Engine

Combine demographic data from Meta, GA4, and Google Ads to build unified audience profiles:

- Cross-channel audience overlap analysis
- Unified persona cards with messaging angle suggestions
- Audience expansion opportunities
- Seasonal audience shift detection

### Full-Funnel Efficiency Analysis

Structured analysis of how efficiently spend moves prospects through the funnel:

- Stage-by-stage conversion rates with benchmarks
- Bottleneck identification ("the drop-off is between sessions and conversions — this is a CRO problem, not a traffic problem")
- Channel contribution per funnel stage
- Recommended channel mix per stage

### Lifetime Value & Revenue Attribution

Integrate e-commerce data with marketing channel data for end-to-end revenue tracking:

- Revenue by acquisition channel
- Customer lifetime value estimates by channel
- Payback period analysis per channel
- Cohort analysis: revenue generated by customers acquired each month
- Marketing efficiency ratio per channel

---

## Architecture Improvements

| Area | Goal |
|---|---|
| **Real-time streaming** | WebSocket/SSE for live dashboard updates and instant anomaly alerts |
| **Background jobs** | Move long-running AI calls to Vercel Queues to avoid serverless timeouts |
| **Database indexing** | Add indexes for common query patterns (client + date range on MetricSnapshot) |
| **Progressive loading** | Load critical KPIs first, then charts, then tables |
| **API pagination** | All list endpoints support pagination for large datasets |
| **Image optimisation** | Next.js Image component across all screenshot and logo usages |

---

## Long-Term Vision

The competitive north star: **be the platform that makes each account manager feel like they have a team of analysts, a strategist, and a client success manager working alongside them 24/7.**

The platform should:

1. **Save account managers 10+ hours per month** through automated reporting, smart alerts, and AI-drafted communications
2. **Generate demonstrably better client outcomes** through AI-driven optimisation, root cause analysis, and proactive forecasting
3. **Retain clients longer** through transparency, portal access, goal tracking, and proactive communication
4. **Win more new business** through data-backed proposals, competitive intelligence, and a compelling platform story
5. **Scale the agency** without scaling headcount proportionally

The category to own: **AI-native agency intelligence platform**. No competitor currently combines live multi-channel data, deep AI analysis with root cause, agency workflow tools, a client portal, full automation, and strategic outputs (proposals, strategy documents, media plans) in a single product.

The question stops being "why would we use this?" and starts being "how did we ever manage without it?"

---

## Contributing

See the [README](README.md) for development setup. Coding conventions are in [.github/copilot-instructions.md](.github/copilot-instructions.md). Architecture details are in [docs/architecture.md](docs/architecture.md). For the full platform vision, see [VISION.md](VISION.md).
