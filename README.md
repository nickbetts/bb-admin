# i3media Report Platform

A full-stack digital marketing performance reporting platform built for agencies. Aggregates data from **15 marketing channels** into unified client dashboards with **AI-powered insights**, **cross-channel anomaly detection**, **automated report generation**, **conversational AI analyst**, **proposal building**, **PDF export**, and a full **agency operations suite** including client portal, action tracking, communication hub, competitor intelligence, and media plan builder.

Built with Next.js 16, Prisma, OpenAI, and deployed on Vercel.

---

## Table of Contents

- [Platform Overview](#platform-overview)
- [Architecture](#architecture)
  - [System Architecture Diagram](#system-architecture-diagram)
  - [Tech Stack](#tech-stack)
  - [Database Schema](#database-schema)
  - [Project Structure](#project-structure)
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
  - [SEO / SemRush](#seo--semrush)
  - [Web Analytics (GA4)](#web-analytics-ga4)
  - [Search Console](#search-console)
  - [Paid Social (Meta Ads)](#paid-social-meta-ads)
  - [Paid Search (Google Ads)](#paid-search-google-ads)
  - [E-Commerce](#e-commerce)
  - [TikTok Ads](#tiktok-ads)
  - [Microsoft Advertising](#microsoft-advertising)
  - [LinkedIn Ads](#linkedin-ads)
  - [Klaviyo / Email Marketing](#klaviyo--email-marketing)
  - [YouTube Analytics](#youtube-analytics)
  - [HubSpot CRM](#hubspot-crm)
  - [CallRail / Call Tracking](#callrail--call-tracking)
  - [Core Web Vitals](#core-web-vitals)
  - [Goals & KPI Tracking](#goals--kpi-tracking)
  - [Predictive Performance Forecasting](#predictive-performance-forecasting)
  - [Budget Optimisation Advisor](#budget-optimisation-advisor)
  - [Multi-Touch Attribution Modelling](#multi-touch-attribution-modelling)
  - [Seasonality Intelligence](#seasonality-intelligence)
  - [Share of Voice Dashboard](#share-of-voice-dashboard)
  - [Creative Performance Intelligence](#creative-performance-intelligence)
  - [AI Strategy Documents](#ai-strategy-documents)
  - [Conversational AI Chat](#conversational-ai-chat)
  - [Competitor Intelligence](#competitor-intelligence)
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
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Configuring API Integrations](#configuring-api-integrations)
- [Scripts Reference](#scripts-reference)
- [Deployment](#deployment)
  - [Deploying to Vercel](#deploying-to-vercel)
  - [CI/CD](#cicd)
  - [Troubleshooting](#troubleshooting)

---

## Platform Overview

i3media Report is an internal agency platform that solves the problem of scattered marketing data across multiple platforms. Instead of logging into GA4, Google Ads, Meta Business Suite, SemRush, and Search Console separately, account managers get a single unified dashboard per client with:

- **15 data source integrations** — GA4, Google Ads, Meta Ads, TikTok Ads, Microsoft Advertising, LinkedIn Ads, Klaviyo, YouTube Analytics, HubSpot CRM, CallRail, SemRush, Google Search Console, Moz, WooCommerce, Shopify
- **AI-powered analysis** — OpenAI generates insights, detects anomalies, writes report commentary, scores landing pages, builds proposals, and provides conversational analysis
- **Conversational AI analyst** — "Ask the Data" chat interface on every client dashboard for instant natural-language performance analysis
- **Cross-channel intelligence** — each AI analysis receives context from all other connected platforms for richer, more actionable insights
- **Predictive forecasting** — 30/60/90 day performance projections with best/expected/worst confidence bands
- **Budget optimisation advisor** — cross-channel budget reallocation recommendations with projected revenue impact
- **Creative performance intelligence** — AI analysis of Meta and Google ad creative patterns with actionable creative briefs
- **AI strategy documents** — quarterly forward-looking strategy documents per client, shareable with clients
- **Multi-touch attribution modelling** — compare last-click, first-click, linear, time-decay, and position-based attribution models
- **Seasonality intelligence** — automatic seasonal pattern detection from historical snapshots with forward-looking alerts
- **Share of voice dashboard** — organic + paid competitive position tracking using SemRush data
- **Competitor intelligence** — ongoing competitive monitoring with AI-generated insights and `CompetitorSnapshot` history
- **Goal setting & tracking** — per-client KPI goals with progress bars, on-track/at-risk/off-track status, and AI guidance
- **Automated reporting** — drag-and-drop report builder with per-section AI commentary, screenshot uploads, branded PDF export, shareable links, and automated monthly scheduling
- **Agency operations suite** — action tracking, communication hub, media plan builder, proposal pipeline CRM, portfolio health dashboard
- **Client portal** — self-serve client-facing dashboard with magic-link login, goals, reports, and communications view
- **Report collaboration** — multi-user comments, approval workflow, and approval status tracking on every report
- **Agency tools** — keyword planner with proposal generation, landing page analyser, LLM.txt generator, pricing strategy editor, competitor intelligence monitor, media plan builder
- **Notification system** — email and Slack delivery for anomalies, report events, and key platform alerts with per-user preferences
- **Core Web Vitals** — real-user performance data via Google's CrUX API
- **Role-based access control** — granular permissions system with 11 permission types across user-defined roles

### User Journey (High Level)

```
Login -> Dashboard (stats overview)
  -> Portfolio (/portfolio) — agency-wide client health dashboard
  -> Clients (list/create/configure)
    -> Client Dashboard (tabbed: Signals | Overview | SEO | GA4 | GSC | Meta | Google Ads | TikTok | Microsoft Ads | LinkedIn | Klaviyo | YouTube | HubSpot | CallRail | E-Commerce | CWV | Goals & KPIs)
      -> Overview tab: performance overview + Forecast + Budget Advisor + Attribution + Seasonality + Share of Voice panels
      -> "Ask the Data" AI Chat (floating panel, always available)
      -> Create Report (select sections + template)
        -> Edit Report (drag-drop sections, AI commentary, collaboration comments, approval workflow, screenshots)
          -> Export PDF / Share Link
  -> Tools (Page Analyser | Keyword Planner | Proposals | LLM Generator | Pricing | Actions | Communications | Competitor Intelligence | Media Plan)
  -> Admin (Users | Roles & Permissions)
  -> Settings (Google OAuth, OpenAI key, MCC, benchmarks, notifications)
  -> Portal (/portal) — client self-serve login
```

---

## Architecture

### System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                  |
|  React 19 + Next.js App Router (Server Components + Client Components)            |
|  Recharts (charts) | dnd-kit (drag-drop) | Lucide (icons) | Tailwind CSS v4      |
+-------------------------------------+---------------------------------------------+
                                      |
                        HTTPS (Vercel Edge Network)
                                      |
+-------------------------------------v---------------------------------------------+
|                              NEXT.JS API LAYER                                     |
|                         ~100 API Route Handlers                                    |
|                                                                                    |
|  /api/auth/*          Authentication (login, logout, session, Google OAuth)        |
|  /api/ai/*            14 AI endpoints (summary, forecast, budget-advisor, etc.)    |
|  /api/ga4/*           GA4 data dispatcher + property discovery                     |
|  /api/google-ads/*    Google Ads data + account discovery                          |
|  /api/meta/*          Meta Ads data + account/video proxy                          |
|  /api/search-console/* GSC data + site discovery                                   |
|  /api/semrush/*       SemRush data + project discovery                             |
|  /api/seo/*           Moz domain authority                                         |
|  /api/shopify/*       Shopify e-commerce data                                      |
|  /api/woocommerce/*   WooCommerce e-commerce data                                  |
|  /api/tiktok/*        TikTok Ads data                                              |
|  /api/microsoft-ads/* Microsoft Advertising data                                   |
|  /api/linkedin/*      LinkedIn Ads data                                            |
|  /api/klaviyo/*       Klaviyo email marketing data                                 |
|  /api/youtube/*       YouTube Analytics data                                       |
|  /api/hubspot/*       HubSpot CRM data                                             |
|  /api/callrail/*      CallRail call tracking data                                  |
|  /api/cwv/*           Core Web Vitals (Google CrUX API)                            |
|  /api/clients/*       Client CRUD + goals + actions + communications + logo        |
|  /api/reports/*       Report CRUD, sections, screenshots, comments, PDF, share     |
|  /api/report-templates/* Template CRUD                                             |
|  /api/tools/*         Keyword planner, proposals, LLM, page analyser, media plan   |
|  /api/admin/*         User/role management + run-snapshots trigger                 |
|  /api/settings/*      App config + Google connection management                    |
|  /api/cross/*         Cross-platform analysis (keyword overlap)                    |
|  /api/share/*         Public share endpoints (proposals, reports)                  |
|  /api/notifications/* Notifications list + preferences + mark-read                 |
|  /api/portal/*        Client portal auth, data, users, magic-link                  |
|  /api/portfolio/*     Agency-wide portfolio health endpoint                        |
|  /api/competitor-intelligence/* Competitor monitoring + snapshots                  |
|  /api/cron/*          Cron jobs (snapshots + automated reports)                    |
+--------+----------+----------+----------+----------+------+-----------+-----------+
         |          |          |          |          |      |           |
    +----v---+ +----v---+ +---v----+ +---v----+ +--v---+ +-v------+ +-v---------+
    |  GA4   | | Google | |  Meta  | |SemRush | | GSC  | |  Moz   | |WooCommerce|
    |  Data  | |  Ads   | |  Ads   | |  API   | | API  | |  API   | | / Shopify |
    |  API   | |  API   | | Graph  | |        | |      | |        | |   APIs    |
    +--------+ +--------+ +--------+ +--------+ +------+ +--------+ +-----------+
    +--------+ +--------+ +--------+ +--------+ +------+ +--------+ +-----------+
    | TikTok | |  Msft  | |LinkedIn| | Klaviyo| |  YT  | |HubSpot | | CallRail  |
    |  Ads   | |  Ads   | |  Ads   | |  API   | |  API | |  CRM   | |    API    |
    +--------+ +--------+ +--------+ +--------+ +------+ +--------+ +-----------+

+--------------------------------------------+  +---------------------------+
|          DATABASE (Prisma ORM)             |  |     EXTERNAL SERVICES     |
|  SQLite (local) / Turso libSQL (prod)      |  |                           |
|                                            |  |  OpenAI API (GPT-4o-mini, |
|  25 models: User, Role, Session, Client,   |  |    GPT-4o, GPT-4o with    |
|  Report, ReportSection, Screenshot,        |  |    web search)            |
|  ReportTemplate, ReportComment,            |  |                           |
|  GoogleConnection, MetricSnapshot,         |  |  Vercel Blob (file        |
|  AppSetting, KeywordPlannerResearch,        |  |    storage for screenshots |
|  Proposal, ProposalEnquiry, LlmTemplate,   |  |    and logos)              |
|  Notification, ClientConversation,         |  |                           |
|  ClientGoal, StrategyDocument,             |  |  Resend (email delivery)  |
|  BudgetRecommendation, ActionItem,         |  |                           |
|  ClientCommunication, ClientPortalUser,    |  |  Slack (webhook alerts)   |
|  CompetitorSnapshot, MediaPlan             |  |                           |
+--------------------------------------------+  +---------------------------+
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16.1.6 (App Router) | Server/client rendering, API routes, file-based routing |
| **Language** | TypeScript (strict mode) | Type safety across the entire codebase |
| **UI** | React 19.2.3 | Component rendering |
| **Styling** | Tailwind CSS v4 + CSS custom properties | Utility-first styling with design tokens |
| **Charts** | Recharts 3.8 | Area charts, bar charts, pie charts across all dashboard sections |
| **Icons** | Lucide React | Consistent icon system |
| **Drag & Drop** | dnd-kit | Report section reordering |
| **Database** | Prisma v7 + SQLite (dev) / Turso libSQL (prod) | ORM with 25 models |
| **Auth** | HMAC-SHA256 signed cookies + bcrypt | Session management and password hashing |
| **AI** | OpenAI (gpt-4o-mini, gpt-4o, gpt-4o-search-preview) | Insights, commentary, proposals, analysis |
| **File Storage** | Vercel Blob | Screenshots and client logos |
| **PDF** | Puppeteer-core + @sparticuz/chromium-min | Server-side headless Chrome PDF rendering on Vercel |
| **HTTP Client** | Axios | External API requests (SemRush, Meta, etc.) |
| **Google Auth** | google-auth-library | Service account (GA4/GSC) + OAuth2 (Google Ads) |
| **Dates** | date-fns | Date formatting and manipulation |
| **Class Utils** | clsx + tailwind-merge | Conditional className composition |
| **Hosting** | Vercel | Serverless deployment with edge network |
| **CI** | GitHub Actions | Lint + build on push/PR |

### Database Schema

25 Prisma models across Phases 1, 2, and 3:

```
Role ──────────────< User ──────────< Session
                       │
                       └──────────────< Client
                                          │
                                          ├──< Report ──< ReportSection
                                          │       │
                                          │       ├──< Screenshot
                                          │       └──< ReportComment
                                          │
                                          ├──< MetricSnapshot
                                          ├──< KeywordPlannerResearch ──< Proposal ──< ProposalEnquiry
                                          ├──< ClientGoal
                                          ├──< StrategyDocument
                                          ├──< BudgetRecommendation
                                          ├──< ActionItem
                                          ├──< ClientCommunication
                                          ├──< ClientPortalUser
                                          ├──< CompetitorSnapshot
                                          ├──< MediaPlan
                                          ├──< Notification
                                          └──< ClientConversation

GoogleConnection (standalone — multi-account OAuth)
AppSetting       (standalone — key/value config)
ReportTemplate   (standalone — reusable report structures)
LlmTemplate      (standalone — LLM.txt generation templates)
```

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Role** | name, permissions (JSON) | Permission-based access control |
| **User** | email, password, roleId, mustChangePassword, notificationPrefs (JSON) | User accounts with role assignment |
| **Session** | token, userId, expiresAt | Cookie-based sessions (7-day TTL) |
| **Client** | name, website, logoUrl, all integration credentials, reportSchedule (JSON), contractedHours (JSON), competitorDomains (JSON) | Central entity storing all 15 integration credentials |
| **Report** | title, period, status, shareToken, approvalStatus, approvedBy | Reports with approval workflow and sharing |
| **ReportSection** | sectionType, title, commentary, contentText, enabled, cardConfig (JSON) | Individual report sections with AI context |
| **Screenshot** | url, caption, sectionId | Vercel Blob-stored images linked to report sections |
| **ReportComment** | content, userId, sectionId, resolved, parentId | Threaded comments for report collaboration |
| **ReportTemplate** | name, sections (JSON), isDefault | Reusable report section configurations |
| **GoogleConnection** | email, refreshToken, scopes | Multi-account Google OAuth storage |
| **MetricSnapshot** | clientId, sectionType, periodStart, periodEnd, metrics (JSON), campaignData (JSON) | Historical metric storage (composite unique key) |
| **AppSetting** | key, value | Global config (OpenAI key, MCC ID, benchmarks, pricing) |
| **KeywordPlannerResearch** | keywords (JSON), adGroups (JSON), brief, websiteContext | Saved keyword research sessions |
| **Proposal** | title, html, servicesJson, shareToken, viewCount, pipelineStage, expectedValue, closeDate | AI-generated proposals with pipeline CRM fields |
| **ProposalEnquiry** | name, email, phone, message | Enquiries from public proposal views |
| **LlmTemplate** | name, sector, templateText, promptGuidance, isBuiltIn | Templates for LLM.txt generation |
| **ClientGoal** | metric, channel, targetValue, currentValue, targetDate, status | Per-client KPI goals with on-track/at-risk tracking |
| **StrategyDocument** | title, period, content, shareToken | Quarterly AI strategy documents per client |
| **BudgetRecommendation** | periodStart, periodEnd, recommendations (JSON), summary | Cross-channel budget reallocation snapshots |
| **ActionItem** | title, status, priority, assignedTo, dueDate, outcome, sourceType | AI recommendations → assigned actions → outcomes |
| **ClientCommunication** | type, direction, subject, body, status, sentAt | Centralised communication log |
| **ClientPortalUser** | email, magicToken, tokenExpiry, permissions (JSON), isActive | Client self-serve portal access |
| **CompetitorSnapshot** | domain, metrics (JSON), insights, periodStart, periodEnd | Competitive monitoring snapshots |
| **MediaPlan** | title, objective, totalBudget, channels (JSON), forecast (JSON), status | Paid media planning with forecast outputs |
| **Notification** | type, severity, title, body, channel, status | System notifications (email, Slack, in-app) |
| **ClientConversation** | role, content, metadata (JSON) | Chat messages for "Ask the Data" feature |

### Project Structure

```
i3media-report/
├── prisma/
│   ├── schema.prisma              # 25 database models
│   ├── migrations/                # SQL migration files
│   └── seed.ts                    # Default users and demo client
├── public/
│   └── primary-logo.svg           # i3media branding
├── scripts/
│   ├── get-gads-refresh-token.mjs # Google Ads OAuth token generator
│   ├── get-meta-long-lived-token.mjs # Meta token exchange script
│   ├── prod-setup.mjs             # Idempotent Turso schema migration
│   └── push-env-to-vercel.py      # Push .env.local to Vercel
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (Inter font, ToastProvider)
│   │   ├── page.tsx               # Root redirect (session check)
│   │   ├── globals.css            # Design tokens, component classes
│   │   ├── login/                 # Login page
│   │   ├── change-password/       # Forced password change
│   │   ├── dashboard/             # Main dashboard (stats, recent items)
│   │   ├── portfolio/             # Agency portfolio health dashboard
│   │   ├── clients/               # Client list, detail, settings, new report
│   │   │   └── [slug]/            # Per-client dashboard and settings
│   │   ├── reports/               # Report list, editor, print view, templates
│   │   │   └── [id]/             # Report editor and print route
│   │   ├── tools/                 # Agency tools suite
│   │   │   ├── page-analyser/     # AI landing page analyser
│   │   │   ├── keyword-planner/   # Keyword research + proposal generator
│   │   │   ├── proposals/         # Saved proposals management + pipeline
│   │   │   ├── pricing/           # Pricing strategy editor
│   │   │   ├── llm-generator/     # LLM.txt content generator
│   │   │   ├── actions/           # Action tracking dashboard
│   │   │   ├── communications/    # Client communication hub
│   │   │   ├── competitor-intelligence/ # Competitor monitoring dashboard
│   │   │   └── media-plan/        # Media plan builder
│   │   ├── portal/                # Client self-serve portal
│   │   │   ├── login/             # Magic-link portal login
│   │   │   └── dashboard/         # Client portal dashboard
│   │   ├── settings/              # Global platform settings
│   │   ├── admin/                 # User and role management
│   │   │   └── roles/             # Role/permission editor
│   │   ├── share/                 # Public share routes (noindex)
│   │   │   ├── proposal/[token]/  # Shareable proposal view
│   │   │   └── report/[token]/    # Shareable report view
│   │   └── api/                   # ~100 API route handlers
│   │       ├── auth/              # Login, logout, session, Google Ads OAuth
│   │       ├── ai/                # 14 AI endpoints:
│   │       │   ├── summary/       # Per-section AI insights + anomaly detection
│   │       │   ├── super-summary/ # Deep journey analysis + landing page crawl
│   │       │   ├── report-commentary/ # Configurable report commentary
│   │       │   ├── executive-summary/ # Cross-section executive summary
│   │       │   ├── overview-narrative/ # Cross-channel narrative
│   │       │   ├── landing-page-analysis/ # Batch CRO/SEO analysis
│   │       │   ├── forecast/      # 30/60/90 day predictions
│   │       │   ├── budget-advisor/ # Cross-channel budget recommendations
│   │       │   ├── attribution/   # Multi-touch attribution modelling
│   │       │   ├── creative-intelligence/ # Ad creative analysis
│   │       │   ├── root-cause/    # Anomaly root cause analysis
│   │       │   ├── strategy-document/ # Quarterly strategy generation
│   │       │   ├── chat/          # Conversational AI ("Ask the Data")
│   │       │   └── snapshots/     # Historical metric storage
│   │       ├── ga4/               # GA4 data dispatcher (12 data types)
│   │       ├── google-ads/        # Google Ads data + accounts + MCC
│   │       ├── meta/              # Meta Ads data + accounts + video proxy
│   │       ├── search-console/    # GSC data + site discovery
│   │       ├── semrush/           # SemRush data + project discovery
│   │       ├── seo/               # Moz domain authority
│   │       ├── shopify/           # Shopify e-commerce data
│   │       ├── woocommerce/       # WooCommerce e-commerce data
│   │       ├── tiktok/            # TikTok Ads data
│   │       ├── microsoft-ads/     # Microsoft Advertising data
│   │       ├── linkedin/          # LinkedIn Ads data
│   │       ├── klaviyo/           # Klaviyo email marketing data
│   │       ├── youtube/           # YouTube Analytics data
│   │       ├── hubspot/           # HubSpot CRM data
│   │       ├── callrail/          # CallRail call tracking data
│   │       ├── cwv/               # Core Web Vitals (CrUX API)
│   │       ├── cross/             # Cross-platform (keyword overlap)
│   │       ├── clients/           # Client CRUD + goals + actions + communications
│   │       ├── reports/           # Report CRUD, sections, screenshots, comments, PDF
│   │       ├── report-templates/  # Template CRUD
│   │       ├── tools/             # Keyword planner, proposals, LLM, page analyser, media plan
│   │       ├── admin/             # User/role management + run-snapshots
│   │       ├── settings/          # App config + Google connections
│   │       ├── share/             # Public share data endpoints
│   │       ├── notifications/     # Notification list + preferences + mark-read
│   │       ├── portal/            # Client portal auth + data + users
│   │       ├── portfolio/         # Agency-wide health endpoint
│   │       ├── competitor-intelligence/ # Competitor monitoring
│   │       └── cron/              # Cron: snapshots + automated reports
│   ├── components/
│   │   ├── ai/                    # 3 components
│   │   │   ├── AiInsightsPanel.tsx    # Dual-mode insights (card + compact button)
│   │   │   ├── SuperSummary.tsx       # Health score ring + journey analysis
│   │   │   └── AiLandingPageAnalysis.tsx # Landing page CRO/SEO scoring
│   │   ├── dashboard/             # 28 components
│   │   │   ├── ClientDashboard.tsx    # Tab controller + period selector
│   │   │   ├── SignalsSection.tsx     # Cross-channel anomaly hub
│   │   │   ├── OverviewSection.tsx    # Cross-channel overview + funnel
│   │   │   ├── GA4Section.tsx         # Google Analytics dashboard
│   │   │   ├── SemrushSection.tsx     # SEO/SemRush dashboard
│   │   │   ├── MetaSection.tsx        # Meta/Facebook Ads dashboard
│   │   │   ├── GoogleAdsSection.tsx   # Google Ads dashboard
│   │   │   ├── SearchConsoleSection.tsx # Search Console dashboard
│   │   │   ├── EcommerceSection.tsx   # WooCommerce/Shopify dashboard
│   │   │   ├── TikTokSection.tsx      # TikTok Ads dashboard
│   │   │   ├── MicrosoftAdsSection.tsx # Microsoft Advertising dashboard
│   │   │   ├── LinkedInSection.tsx    # LinkedIn Ads dashboard
│   │   │   ├── KlaviyoSection.tsx     # Klaviyo email marketing dashboard
│   │   │   ├── YouTubeSection.tsx     # YouTube Analytics dashboard
│   │   │   ├── HubSpotSection.tsx     # HubSpot CRM dashboard
│   │   │   ├── CallRailSection.tsx    # CallRail call tracking dashboard
│   │   │   ├── CoreWebVitalsSection.tsx # Core Web Vitals dashboard
│   │   │   ├── GoalsSection.tsx       # Goals and KPI tracking
│   │   │   ├── ForecastSection.tsx    # 30/60/90 day forecasting panel
│   │   │   ├── BudgetAdvisorPanel.tsx # Cross-channel budget recommendations
│   │   │   ├── AttributionPanel.tsx   # Multi-touch attribution comparison
│   │   │   ├── SeasonalityPanel.tsx   # Seasonal pattern detection
│   │   │   ├── ShareOfVoicePanel.tsx  # Competitive position tracking
│   │   │   ├── CreativeIntelligencePanel.tsx # Ad creative analysis
│   │   │   ├── CompetitorIntelligenceSection.tsx # Competitor monitoring
│   │   │   ├── AiChatPanel.tsx        # Conversational AI chat
│   │   │   ├── ActionsSection.tsx     # Action item tracking
│   │   │   └── CommunicationsSection.tsx # Client communication hub
│   │   ├── reports/               # 6 components
│   │   │   ├── ReportView.tsx         # Full report editor
│   │   │   ├── PrintReportContent.tsx # Print/PDF layout
│   │   │   ├── TextSection.tsx        # Editable text sections with autosave
│   │   │   ├── ScreenshotsSection.tsx # Screenshot grid display
│   │   │   ├── ScreenshotCaptionDialog.tsx # Upload dialog
│   │   │   └── ReportCollaboration.tsx # Comments + approval workflow
│   │   ├── admin/                 # 3 components
│   │   │   ├── UsersManager.tsx       # User CRUD interface
│   │   │   ├── RolesManager.tsx       # Role/permission management
│   │   │   └── AdminNav.tsx           # Admin tab navigation
│   │   ├── clients/               # 3 components
│   │   │   ├── ClientSettingsForm.tsx # Client integration settings
│   │   │   ├── ClientListSearch.tsx   # Searchable client grid
│   │   │   └── ClientPortalManager.tsx # Portal user management
│   │   ├── layout/                # 2 components
│   │   │   ├── AuthenticatedLayout.tsx # Session guard + permission check
│   │   │   └── Sidebar.tsx            # Responsive nav (desktop collapsible + mobile drawer)
│   │   └── ui/                    # 5 files (8 components)
│   │       ├── MetricCard.tsx         # KPI display card with change badges
│   │       ├── SearchInput.tsx        # Search input with icon
│   │       ├── PageSkeleton.tsx       # Loading skeleton
│   │       ├── Toast.tsx              # Toast notification system (Context + Provider)
│   │       └── index.tsx              # LoadingSpinner, SectionCard, Delta, Badge
│   └── lib/                       # 18 library modules
│       ├── auth.ts                # HMAC-SHA256 sessions, permissions, guards
│       ├── prisma.ts              # Prisma singleton (libSQL adapter in prod)
│       ├── ga4.ts                 # GA4 Data API client
│       ├── google-ads.ts          # Google Ads API client (GAQL)
│       ├── meta.ts                # Meta Graph API client
│       ├── search-console.ts      # GSC API client
│       ├── semrush.ts             # SemRush API client
│       ├── domain-authority.ts    # Moz Link API client
│       ├── shopify.ts             # Shopify Admin API client
│       ├── woocommerce.ts         # WooCommerce REST API client
│       ├── tiktok-ads.ts          # TikTok Marketing API client
│       ├── microsoft-ads.ts       # Microsoft Advertising REST API client
│       ├── core-web-vitals.ts     # Google CrUX API client
│       ├── notifications.ts       # Notification dispatch (email, Slack, in-app)
│       ├── google-auth.ts         # Google service account singleton
│       ├── landing-page-analyzer.ts # Page signal extraction + site crawling
│       ├── report-blocks.ts       # Report section/block configuration
│       ├── render-print-html.ts   # PDF HTML template rendering
│       ├── puppeteer.ts           # Headless Chrome browser management
│       └── utils.ts               # Formatters, date helpers, health scoring
├── .github/workflows/ci.yml      # GitHub Actions CI pipeline
├── next.config.ts                 # Puppeteer + Vercel Blob image config
├── vercel.json                    # Vercel build + cron configuration
└── package.json                   # Dependencies and scripts
```

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

**Parallel fetching:** Each dashboard section fires 5-15 parallel fetch calls on mount (current period, previous period, YoY, sub-data types) for maximum speed.

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
        AI receives: "Meta is spending $5k with 2.1x ROAS.
                      Google Ads is spending $3k with 3.5x ROAS.
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

| Platform | Additional Checks |
|----------|------------------|
| **Google Ads** | Impression share loss (budget + rank), quality score degradation, auction competitiveness |
| **Meta Ads** | Ad frequency/fatigue (>3.0), creative fatigue correlation, ROAS below 1x breakeven |
| **GSC** | Clicks drop, position regression, CTR anomalies |
| **GA4** | Sessions decline, bounce rate spike, conversion rate drop |

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
   ├── gpt-4o-search-preview (web search for blocked sites)
   └── gpt-4o (content generation from template)
        │
        v
Output: formatted llm.txt content
```

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
  - GA4 integration (property selector, service account email display)
  - SemRush integration (domain, project selector)
  - Meta Ads integration (account selector)
  - Google Ads integration (customer ID, account selector)
  - Search Console integration (site URL selector)
  - WooCommerce credentials (URL, consumer key, consumer secret)
  - Shopify credentials (store URL, access token)
  - TikTok Ads (advertiser ID, access token)
  - Microsoft Advertising (account ID, account name)
  - LinkedIn Ads (account ID, access token)
  - Klaviyo (API key, account name)
  - YouTube Analytics (channel ID, channel name)
  - HubSpot CRM (portal ID, access token)
  - CallRail (account ID, API key)
  - Core Web Vitals (URL override for CrUX tracking)
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
- **Marketing funnel:** Impressions -> Clicks -> Sessions -> Conversions -> Revenue
- **Blended KPIs:** Total ad spend, blended ROAS, blended CPA, total conversions
- **Channel efficiency matrix** with health scores per platform
- **Cross-platform alerts** (channel-level anomalies)
- **AI narrative** analysing overall marketing performance
- **Platform breakdown cards** showing per-channel contribution

### SEO / SemRush

**Tab:** SEO

- KPI cards: organic traffic, organic keywords, organic cost value, domain authority
- Traffic history area chart
- Keyword position distribution bar chart (top 3, 4-10, 11-20, 21-50, 51-100)
- Top keywords table (sortable by position, volume, CPC, traffic)
- Rank movers table (improvers and decliners)
- Tracked keywords section (if SemRush project is configured)
- Backlinks summary
- AI visibility analysis (detects presence of AI Overviews in search results)
- Competitor landscape table
- SuperSummary (AI journey analysis)
- AI Insights Panel

### Web Analytics (GA4)

**Tab:** Web Analytics

- KPI cards: sessions, users, pageviews, bounce rate, avg session duration, conversions
- Daily trend charts (sessions + pageviews over time)
- Traffic source breakdown table
- Top landing pages table with Delta comparisons
- Device breakdown (desktop, mobile, tablet)
- Country breakdown
- Demographics (age/gender)
- Conversion events table
- Conversions by channel group
- AI referral analysis (traffic from ChatGPT, Claude, Perplexity, Gemini, Copilot)
- New vs returning users
- SuperSummary + AI Insights Panel

### Search Console

**Tab:** Search Console

- KPI cards: total clicks, impressions, avg CTR, avg position
- Clicks/impressions dual-axis chart
- Top queries table with Delta comparisons (sortable)
- Top pages table
- Position movers (improvers and decliners)
- Device breakdown
- Country breakdown
- **Organic vs paid keyword overlap** (if Google Ads is also configured):
  - Cross-references GSC organic queries with Google Ads search terms
  - Identifies keyword cannibalisation
  - Shows risk levels (high/medium/low) and potential savings
- SuperSummary + AI Insights Panel

### Paid Social (Meta Ads)

**Tab:** Paid Social

- KPI cards: spend, impressions, clicks, CTR, CPC, conversions, ROAS, CPM
- **Dashboard mode:** Hierarchical campaign drill-down (Campaign -> Ad Sets -> Creatives) with expandable rows, creative media lightbox (images/videos), audience demographics
- **Report mode:** Per-campaign card layout for print-friendly output
- Landing page analysis (AI-scored CRO/SEO for ad landing pages)
- SuperSummary + AI Insights Panel

### Paid Search (Google Ads)

**Tab:** Google Ads

- KPI cards: cost, clicks, impressions, CTR, CPC, conversions, cost/conversion, ROAS, impression share, avg position
- **Dashboard mode:** Campaign performance table, ad group table, search terms report, keyword performance (all sortable)
- **Report mode:** Per-campaign cards with nested sub-tables
- Landing page analysis
- Auto-saves metric snapshots for historical trending
- SuperSummary + AI Insights Panel

### E-Commerce

**Tab:** E-Commerce (WooCommerce or Shopify)

- KPI cards: revenue, orders, average order value, conversion rate
- Revenue over time area chart
- Top products table (name, quantity, revenue)
- Orders by status bar chart

### TikTok Ads

**Tab:** TikTok Ads (requires `tiktokAdvertiserId` configured in client settings)

- KPI cards: spend, impressions, clicks, CTR, CPC, CPM, conversions, cost/conversion, video views, reach, frequency
- Campaign performance table with video view metrics
- Powered by the TikTok Marketing API v1.3
- Per-client access tokens supported (or global `TIKTOK_ACCESS_TOKEN` env var)

### Microsoft Advertising

**Tab:** Microsoft Ads (requires `microsoftAdsAccountId` configured in client settings)

- KPI cards: spend, impressions, clicks, CTR, CPC, conversions, revenue, ROAS, cost/conversion
- Campaign performance table with status badges
- Powered by the Microsoft Advertising REST API v13
- Requires `MICROSOFT_ADS_CLIENT_ID`, `MICROSOFT_ADS_CLIENT_SECRET`, `MICROSOFT_ADS_REFRESH_TOKEN`, `MICROSOFT_ADS_DEVELOPER_TOKEN` env vars

### Core Web Vitals

**Tab:** Core Web Vitals (available for any client with a website URL or custom `cwvUrl`)

- Overall CWV assessment (Good / Needs Improvement / Poor) based on Google's standards
- Per-metric cards: LCP, CLS, INP, TTFB, FCP
- Each card shows 75th percentile value, category label, and good/ok/poor distribution bar
- Data sourced from Google's **Chrome UX Report (CrUX) API** — real user measurements
- Requires `GOOGLE_CRUX_API_KEY` (or `GOOGLE_API_KEY`) environment variable

### LinkedIn Ads

**Tab:** LinkedIn Ads (available when `linkedinAccountId` is configured)

- Spend, impressions, clicks, CTR, CPC, and leads overview
- Campaign-level breakdown table
- API at `/api/linkedin` — uses LinkedIn Marketing API v2 (`adAnalyticsV2`)
- Configure `linkedinAccountId` and `linkedinAccessToken` in client settings

### Klaviyo / Email Marketing

**Tab:** Klaviyo (available when `klaviyoApiKey` is configured)

- Email campaign metrics: sends, opens, clicks, revenue, unsubscribes
- Campaign-level breakdown table with open rate and click rate per campaign
- API at `/api/klaviyo` — uses Klaviyo v2025-01-15 REST API
- Configure `klaviyoApiKey` in client settings

### YouTube Analytics

**Tab:** YouTube (available when `youtubeChannelId` is configured)

- KPI cards: views, watch time (hours), subscribers, average view duration, estimated revenue
- Video-level performance table (title, views, watch time, CTR, likes)
- API at `/api/youtube` — uses YouTube Data API v3 and YouTube Analytics API
- Configure `youtubeChannelId` per client; requires service account or OAuth credentials

### HubSpot CRM

**Tab:** HubSpot (available when `hubspotPortalId` is configured)

- Contact and deal pipeline metrics: total contacts, new contacts, open deals, deal value
- Deal stage breakdown table with stage name, count, and total value
- API at `/api/hubspot` — uses HubSpot Private App token
- Configure `hubspotPortalId` and `hubspotAccessToken` in client settings

### CallRail / Call Tracking

**Tab:** CallRail (available when `callrailAccountId` is configured)

- KPI cards: total calls, answered calls, missed calls, average call duration, first-time callers
- Call log table with source attribution, duration, and status
- API at `/api/callrail` — uses CallRail REST API
- Configure `callrailAccountId` and `callrailApiKey` in client settings

### Goals & KPI Tracking

**Tab:** Goals & KPIs (always available per client)

- Create goals with a metric, target value, channel, target date, and unit
- Supported goal types: ROAS targets, session growth, revenue targets, impression reach
- Status tracking: **On Track** / **At Risk** / **Off Track** / **Achieved**
- Progress bars with percentage to target
- AI-generated guidance when a goal is at risk
- Full CRUD: add, edit, delete goals
- API at `GET/POST /api/clients/[id]/goals` and `PUT/DELETE /api/clients/[id]/goals/[goalId]`

### Predictive Performance Forecasting

**Panel on Overview tab** — 30/60/90 day projections

- AI-generated performance projections for sessions, conversions, and revenue
- Confidence bands: best case / expected / worst case
- Uses historical `MetricSnapshot` data for trend extrapolation and seasonality correction
- Narrative explanation: *"We're forecasting a 12% drop in sessions next month based on seasonal patterns..."*
- API at `POST /api/ai/forecast`

### Budget Optimisation Advisor

**Panel on Overview tab** — cross-channel budget reallocation

- Analyses spend efficiency (ROAS, CPA, impression share) across all paid channels
- Produces specific reallocation suggestions with projected revenue impact
- Channel saturation signals: audience frequency warnings, overspend pacing alerts
- Results saved as `BudgetRecommendation` model per period
- API at `POST /api/ai/budget-advisor`

### Multi-Touch Attribution Modelling

**Panel on Overview tab** — attribution model comparison

- Compare 5 attribution models: **Last Click**, **First Click**, **Linear**, **Time Decay**, **Position-Based** (U-shaped)
- Shows how each channel's conversion credit changes across models
- AI narrative explaining cross-channel contribution patterns
- API at `POST /api/ai/attribution`

### Seasonality Intelligence

**Panel on Overview tab** — pattern detection from historical data

- Automatically detects monthly seasonal patterns from `MetricSnapshot` history (requires 3+ months)
- Per-channel seasonality index (100 = average, >100 = above average, <100 = below average)
- Forward-looking alerts: *"Based on last year, expect a 25% increase in conversions starting in 3 weeks"*
- Requires `MetricSnapshot` data accumulated over time

### Share of Voice Dashboard

**Panel on SEO / SemRush tab**

- Organic share of voice: estimated % of total topic clicks captured vs competitors
- Tracks your domain against up to 3 competitor domains using SemRush data
- Trend display and competitor traffic volume comparison
- Requires SemRush integration and competitor domains configured in client settings

### Creative Performance Intelligence

**Panel on Meta and Google Ads tabs**

- **Meta Ads:** analysis by creative type, frequency vs performance correlation, winning creative patterns
- **Google Ads:** RSA asset scoring, ad copy pattern analysis, quality score correlation
- Generates an actionable creative brief based on top-performing patterns
- API at `POST /api/ai/creative-intelligence`

### AI Strategy Documents

**Tool:** Generate a full quarterly strategy document per client on demand

- 10-section forward-looking strategy: performance summary, wins, challenges, competitor snapshot, opportunities, channel strategy, budget recommendations, content priorities, technical actions, KPI targets
- Saved as `StrategyDocument` model per client per period
- Shareable link support (`shareToken`)
- API at `POST /api/ai/strategy-document`

### Conversational AI Chat

**Floating panel:** "Ask the Data" — available on every client dashboard

- GPT-4o-mini powered chat interface anchored to the client's metric history
- Conversation history persisted per client/user in the database
- Pre-loaded with all historical `MetricSnapshot` data as context
- Suggested prompt shortcuts for common questions
- Supports multi-turn conversations with full history passed on each turn
- Uses `ClientConversation` model; API at `/api/ai/chat`

### Competitor Intelligence

**Tool:** `/tools/competitor-intelligence` and **SEO tab** panel

- Per-client competitor monitoring using SemRush data + AI analysis
- Tracks organic traffic, keyword counts, paid visibility for each competitor domain
- `CompetitorSnapshot` model stores periodic competitive data for trend analysis
- AI-generated competitive summary highlighting opportunities and threats
- Configure competitor domains in client settings under "Competitor Domains"
- API at `/api/competitor-intelligence` and `/api/competitor-intelligence/[clientId]`

### Client Portal

**Route:** `/portal` (client-facing)

A self-serve portal allowing clients to log in and view their own data without accessing the full agency platform.

- **Magic-link authentication** — portal users receive a one-time login token via email
- **Portal dashboard** — clients see their reports, goals, and communications
- **Read-only access** — clients cannot modify data
- **Configurable permissions** — agency staff control which data each portal user can access (`reports`, `goals`, `communications`)
- **User management** — `ClientPortalManager` component lets agency staff create, deactivate, and send magic links to portal users
- API: `/api/portal/auth` (magic link verify), `/api/portal/data` (portal data), `/api/portal/users` (manage users), `/api/portal/me` (current portal session)

### Action Tracking

**Tool:** `/tools/actions`

Bridges AI recommendations to measured outcomes.

- **Create actions** from AI recommendations or manually
- **Fields:** title, description, status (open/in_progress/completed/cancelled), priority (low/medium/high/urgent), assignee, due date, outcome notes, source type
- **Dashboard view** with filtering by status, priority, and client
- **Outcome recording** — when an action is completed, document the measured result
- Per-client action lists from the client dashboard
- API at `/api/clients/[id]/actions` and `/api/clients/[id]/actions/[actionId]`

### Communications Hub

**Tool:** `/tools/communications`

Centralised log of all agency-client communications.

- **Log types:** email, call, meeting, note, report_share, proposal_share
- **Direction:** inbound or outbound
- **Status:** draft, sent, logged
- Link communications to reports or proposals via metadata
- Per-client communication history accessible from the client dashboard
- Full CRUD — log, edit, and delete communications
- API at `/api/clients/[id]/communications` and `/api/clients/[id]/communications/[commId]`

### Report Collaboration

**Within the report editor (`/reports/[id]`)**

Multi-user workflow for reviewing and approving reports before sharing with clients.

- **Inline comments** — any section in a report can receive threaded comments
- **Resolve/reopen comments** — track which feedback has been addressed
- **Approval workflow** — reports move through: `draft` → `pending` → `approved` / `changes_requested`
- **Approval notes** — reviewer can attach notes when requesting changes
- **Approver tracking** — records which user approved and when
- `ReportComment` model stores all comments; `Report.approvalStatus/approvedBy/approvedAt` tracks workflow
- API at `/api/reports/[id]/comments`, `/api/reports/[id]/comments/[commentId]`, `/api/reports/[id]/approve`

### Notifications

**System-wide:** Anomaly alerts, report events, and key platform events

- **In-app** — stored in the `Notification` model, surfaced in UI
- **Email** — via Resend (configurable in AppSettings: `emailApiKey`, `emailFromAddress`)
- **Slack** — via incoming webhooks configured per-user in notification preferences
- **Types:** anomaly, report_ready, report_sent, report_opened, proposal_viewed, integration_error, goal_at_risk, snapshot_complete
- **Admin broadcast** — `notifyAdmins()` sends to all admin users
- API at `/api/notifications` (list), `/api/notifications/read` (mark read)

### Reports

**Route:** `/reports` (list) and `/reports/[id]` (editor)

**Report list features:**
- Search/filter reports
- Inline rename
- Delete with confirmation
- Duplicate report
- Status badges (draft/published)

**Report editor features:**
- Status stepper: Draft → Review → Published
- Custom date range pickers with comparison period
- Drag-and-drop section reordering (dnd-kit)
- Per-section visibility toggles (show/hide entire sections)
- Per-block visibility within sections (e.g., show KPIs but hide competitor table)
- Commentary editor per section with autosave (1.5s debounce)
- AI commentary generation per section (configurable tone/length/format)
- Bulk "Generate All" that generates commentary for every section
- Executive summary AI generation
- Screenshot upload with captions (per section)
- Text sections for manual notes (notable achievements, work completed, etc.)
- PDF export
- Share link generation/revocation
- Duplicate report
- Save as template
- Print view (`/reports/[id]/print`)
- Collaboration comments and approval workflow (see [Report Collaboration](#report-collaboration))

### Report Templates

**Route:** `/reports/templates`

- Create reusable report structures defining which sections to include
- Set a default template that pre-fills new report creation
- Templates store section type, order, and title configuration

### Tools

#### Page Analyser (`/tools/page-analyser`)

Enter any URL to receive an AI-powered analysis scoring:
- **CRO** — call-to-action quality, form optimisation, trust signals
- **SEO** — title tags, meta descriptions, heading structure, content quality
- **Mobile** — responsive indicators, touch targets
- **Forms** — form presence, field count, accessibility

Also pulls SemRush competitive data for the domain.

#### Keyword Planner (`/tools/keyword-planner`)

Three-step workflow:
1. **Brief + URL** — Enter client website and campaign brief
2. **AI suggests keywords** — Crawls website, generates keyword strategies with ad groups
3. **Research** — Fetches SemRush volume/CPC metrics, displays results in a data table
4. **Generate proposal** — AI creates a full client proposal with pricing, services, timeline, and interactive PPC forecaster

#### Proposals (`/tools/proposals`)

- View saved proposals with pipeline stage management
- **Pipeline CRM** — track each proposal through: Prospect → Sent → Viewed → Negotiating → Won/Lost
- Set expected value, close date, and pipeline notes per proposal
- Share proposals via unique public token
- Track view counts and last viewed timestamp
- Receive client enquiries through embedded forms
- Edit proposal details (contracted hours, services)
- API at `/api/tools/proposals/[id]/pipeline` for stage transitions

#### Pricing Strategy (`/tools/pricing`)

Editor for managing agency pricing configuration (service tiers, add-ons, retainer packages) stored in AppSettings.

#### LLM.txt Generator (`/tools/llm-generator`)

Generates AI-search-optimised `llm.txt` files for client websites:
- Crawls homepage + key sub-pages
- Fetches sitemap, robots.txt, existing llm.txt
- Verifies authority (Charity Commission, Companies House, web search)
- Extracts social profiles
- Generates structured content from templates

#### Action Tracking (`/tools/actions`)

Agency-wide view of all open and completed actions across all clients:
- Filter by status, priority, and client
- Create actions manually or from AI recommendations
- Mark as in-progress, completed, or cancelled with outcome notes
- Assign to team members with due dates

#### Communications Hub (`/tools/communications`)

Agency-wide view of all client communications:
- Log emails, calls, meetings, and notes
- Inbound and outbound direction tracking
- Link to specific reports or proposals
- Search and filter across all clients and communication types

#### Competitor Intelligence (`/tools/competitor-intelligence`)

Agency-wide competitor monitoring dashboard:
- Overview of all clients' competitor landscapes
- Per-client competitor snapshots with traffic, keyword, and ad data
- Trigger competitor data pulls for specific clients
- AI-generated competitive summaries highlighting threats and opportunities

#### Media Plan Builder (`/tools/media-plan`)

Build paid media plans with channel allocation and AI forecast outputs:
- Define campaign objective (brand awareness, lead gen, e-commerce, traffic)
- Set total budget and campaign duration
- Allocate budget across channels with expected metrics
- AI-generated forecast: projected impressions, clicks, conversions, revenue per channel
- Save media plans linked to clients
- Status management: draft → active → completed → archived
- API at `/api/tools/media-plan` and `/api/tools/media-plan/[id]/forecast`

### Admin Panel

**Route:** `/admin` (requires `users` permission)

- **Users tab:** Full CRUD — create users with name, email, password, role selection. Edit inline. Delete with confirmation. Password show/hide toggle.
- **Roles tab:** Create and edit roles with grouped permission checklists. Permission groups: dashboard, clients, reports, templates, settings, page_analyser, proposal_generator, proposals, pricing, llm_generator, users.
- **Run Snapshots:** Manual trigger to fire the snapshot cron for all clients immediately (useful for testing and backfills)

### Settings

**Route:** `/settings` (requires `settings` permission)

- **Google Connections:** Connect Google accounts via OAuth2 for Google Ads. Multiple accounts supported for MCC structures. Connection verification and removal.
- **OpenAI API Key:** Enter key (stored in DB, takes priority over env var)
- **Email Settings:** Configure Resend API key and sender address for email notifications
- **Task Time Benchmarks:** Configure hours-per-task estimates used in proposal generation
- **Default MCC:** Select default Google Ads Manager account

### Notification Preferences

**Route:** `/settings/notifications`

- Toggle email and Slack delivery channels
- Configure Slack webhook URL per user
- Choose delivery frequency: Immediate / Daily Digest / Weekly Digest
- Set quiet hours (non-critical notifications suppressed outside business hours)
- Enable/disable individual notification types
- API at `/api/notifications/preferences` (GET/PUT)

---

## Getting Started

### Prerequisites

- **Node.js 20+** (recommended; 18+ minimum)
- **npm** (included with Node.js)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd i3media-report

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys and secrets

# Run database migrations
npx prisma migrate dev

# Seed database (creates default admin users)
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

### Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```env
# ─── Database ─────────────────────────────────────────────────────
# Local development (SQLite)
DATABASE_URL="file:dev.db"
# Production (Turso)
# TURSO_DATABASE_URL="libsql://<your-db>.turso.io"
# TURSO_AUTH_TOKEN="<your-auth-token>"

# ─── Auth ─────────────────────────────────────────────────────────
APP_PASSWORD="your-strong-password"        # Legacy fallback password
SESSION_SECRET="your-session-secret"       # HMAC signing key (openssl rand -base64 32)

# ─── Vercel Blob (screenshots + logos) ────────────────────────────
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# ─── SemRush ──────────────────────────────────────────────────────
SEMRUSH_API_KEY="your-semrush-api-key"

# ─── Google (GA4 + Search Console + YouTube — service account) ────
GA4_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# ─── Google Ads (OAuth2) ──────────────────────────────────────────
GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"              # Optional (can use in-app OAuth)
GOOGLE_ADS_MANAGER_CUSTOMER_ID="123-456-7890"              # Optional MCC

# ─── Meta Ads ─────────────────────────────────────────────────────
META_ACCESS_TOKEN="your-meta-access-token"

# ─── TikTok Ads ───────────────────────────────────────────────────
TIKTOK_ACCESS_TOKEN="your-tiktok-access-token"             # Optional global (or set per client)

# ─── Microsoft Advertising ────────────────────────────────────────
MICROSOFT_ADS_CLIENT_ID="your-microsoft-ads-client-id"
MICROSOFT_ADS_CLIENT_SECRET="your-microsoft-ads-client-secret"
MICROSOFT_ADS_REFRESH_TOKEN="your-microsoft-ads-refresh-token"
MICROSOFT_ADS_DEVELOPER_TOKEN="your-microsoft-ads-developer-token"

# ─── Core Web Vitals (Google CrUX API) ───────────────────────────
GOOGLE_CRUX_API_KEY="your-crux-api-key"                    # Or GOOGLE_API_KEY

# ─── OpenAI ───────────────────────────────────────────────────────
OPENAI_API_KEY="sk-..."    # Or configure in the app via Settings page

# ─── Email Notifications (Resend) ────────────────────────────────
# EMAIL_API_KEY="re_..."                                     # Set in Settings UI
# EMAIL_FROM_ADDRESS="reports@yourdomain.com"                # Set in Settings UI

# ─── Moz (Domain Authority) ──────────────────────────────────────
MOZ_ACCESS_ID="your-moz-access-id"
MOZ_SECRET_KEY="your-moz-secret-key"

# ─── Cron Security ───────────────────────────────────────────────
CRON_SECRET="your-cron-secret"                             # Secures /api/cron/* endpoints
```

> **Note:** LinkedIn Ads, Klaviyo, YouTube, HubSpot, and CallRail use per-client credentials stored in the database. Configure them in each client's settings page rather than as environment variables.

### Configuring API Integrations

#### SemRush
1. Get your API key from [SemRush API](https://www.semrush.com/api-analytics/)
2. Add `SEMRUSH_API_KEY` to `.env.local`
3. Per client: set the **SemRush Domain** (and optionally a **Project ID**) in client settings

#### Google Analytics 4 & Search Console (Service Account)
Both share the same service account credentials:

1. Create a service account in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Analytics Data API** and **Search Console API**
3. Download the JSON key file
4. Grant the service account **Viewer** access to GA4 properties and **User** in Search Console
5. Add `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY` to `.env.local`
6. Per client: select the **GA4 Property** and **Search Console Site** in client settings

#### Google Ads (OAuth2)
**Option A — In-app OAuth (recommended):**
1. Create OAuth 2.0 Web Application credentials in Google Cloud Console
2. Set redirect URI to `https://<your-domain>/api/auth/google-ads/callback`
3. Add `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` to env
4. In-app: Settings -> Google Connections -> Connect Google Account

**Option B — Environment variable:**
```bash
node scripts/get-gads-refresh-token.mjs
# Copy the printed token to GOOGLE_ADS_REFRESH_TOKEN in .env.local
```

#### Meta Ads
1. Create a [Meta System User](https://business.facebook.com/settings/system-users) with `ads_read` permission
2. Generate a long-lived access token (use `scripts/get-meta-long-lived-token.mjs` to exchange)
3. Add `META_ACCESS_TOKEN` to `.env.local` (or set per-client tokens in client settings)

#### TikTok Ads
Per client in client settings: set **TikTok Advertiser ID** and **Access Token** from the TikTok Marketing API. Optionally set `TIKTOK_ACCESS_TOKEN` as a global fallback.

#### Microsoft Advertising
1. Create an app registration in [Microsoft Azure portal](https://portal.azure.com)
2. Add `MICROSOFT_ADS_CLIENT_ID`, `MICROSOFT_ADS_CLIENT_SECRET`, `MICROSOFT_ADS_DEVELOPER_TOKEN` to env
3. Generate a refresh token and add as `MICROSOFT_ADS_REFRESH_TOKEN`
4. Per client: set the **Microsoft Ads Account ID** in client settings

#### LinkedIn Ads
Per client in client settings: set **LinkedIn Account ID** and **Access Token** from LinkedIn Marketing Solutions.

#### Klaviyo
Per client in client settings: set the **Klaviyo Private API Key** from your Klaviyo account settings.

#### YouTube Analytics
Per client in client settings: set the **YouTube Channel ID**. Uses the same service account credentials as GA4/GSC (must have YouTube Data API v3 enabled).

#### HubSpot CRM
Per client in client settings: set the **HubSpot Portal ID** and a **Private App Access Token** with `crm.objects.contacts.read` and `crm.objects.deals.read` scopes.

#### CallRail
Per client in client settings: set the **CallRail Account ID** and **API Key** from your CallRail account.

#### Core Web Vitals
1. Enable the **Chrome UX Report API** in Google Cloud Console
2. Create or reuse an API key and add as `GOOGLE_CRUX_API_KEY`
3. Per client: optionally set a custom **CWV URL** to override the website URL

#### OpenAI
1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Either add `OPENAI_API_KEY` to `.env.local` or enter via Settings page (DB-stored, takes priority)

#### Moz (Domain Authority)
1. Get API credentials from [Moz](https://moz.com/products/api)
2. Add `MOZ_ACCESS_ID` and `MOZ_SECRET_KEY` to `.env.local`

#### WooCommerce
Per client in client settings: set **WooCommerce URL**, **Consumer Key**, and **Consumer Secret** (generated in WooCommerce -> Settings -> Advanced -> REST API)

#### Shopify
Per client in client settings: set **Shopify Store URL** and **Access Token** (from a Custom App in Shopify Admin)

---

## Scripts Reference

```bash
# Development
npm run dev                 # Start dev server (Next.js 16 hot reload)
npm run build               # Generate Prisma client + build for production
npm run start               # Start production server
npm run lint                # Run ESLint (Next.js core-web-vitals + TypeScript)

# Database
npm run db:migrate          # Run pending Prisma migrations
npm run db:seed             # Seed database with default users
npm run db:reset            # Reset DB and re-run all migrations
npm run db:push             # Push schema changes without migrations

# Vercel
npm run vercel:link         # Link repo to Vercel project
npm run vercel:env:pull     # Pull Vercel env vars to .env.local
npm run vercel:deploy       # Deploy to production

# One-off helpers
node scripts/get-gads-refresh-token.mjs    # Generate Google Ads OAuth refresh token
node scripts/get-meta-long-lived-token.mjs # Exchange short-lived Meta token for 60-day token
python scripts/push-env-to-vercel.py       # Push .env.local vars to Vercel
node scripts/prod-setup.mjs                # Idempotent Turso schema migration
```

---

## Deployment

### Deploying to Vercel

#### 1. Create a Turso database

```bash
brew install tursodatabase/tap/turso
turso auth login
turso db create i3media-report
turso db show i3media-report          # copy the URL
turso db tokens create i3media-report  # copy the auth token
```

#### 2. Run migrations against Turso

```bash
DATABASE_URL="libsql://<your-db>.turso.io" \
TURSO_AUTH_TOKEN="<your-auth-token>" \
npx prisma migrate deploy
```

#### 3. Add Vercel Blob storage

In your Vercel project dashboard: **Storage -> Create -> Blob**. Vercel auto-adds `BLOB_READ_WRITE_TOKEN`.

#### 4. Connect GitHub repo to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new) — Vercel detects Next.js automatically
3. Add environment variables in Vercel dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `libsql://<your-db>.turso.io` |
| `TURSO_AUTH_TOKEN` | Auth token from Turso |
| `APP_PASSWORD` | Strong password |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `BLOB_READ_WRITE_TOKEN` | *(auto-set by Vercel Blob)* |
| `SEMRUSH_API_KEY` | Your key |
| `GA4_CLIENT_EMAIL` | Service account email |
| `GA4_PRIVATE_KEY` | Service account private key |
| `GOOGLE_ADS_CLIENT_ID` | OAuth client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Developer token |
| `META_ACCESS_TOKEN` | Meta access token |
| `OPENAI_API_KEY` | OpenAI key *(or set in Settings UI)* |
| `TIKTOK_ACCESS_TOKEN` | TikTok Ads global access token *(optional — or per-client)* |
| `MICROSOFT_ADS_CLIENT_ID` | Microsoft Ads OAuth app client ID |
| `MICROSOFT_ADS_CLIENT_SECRET` | Microsoft Ads OAuth client secret |
| `MICROSOFT_ADS_REFRESH_TOKEN` | Microsoft Ads OAuth refresh token |
| `MICROSOFT_ADS_DEVELOPER_TOKEN` | Microsoft Advertising developer token |
| `GOOGLE_CRUX_API_KEY` | Google CrUX API key for Core Web Vitals |
| `MOZ_ACCESS_ID` | Moz API access ID *(optional)* |
| `MOZ_SECRET_KEY` | Moz API secret key *(optional)* |
| `CRON_SECRET` | Secret for securing `/api/cron/*` endpoints |

> **Per-client integrations:** LinkedIn Ads, Klaviyo, YouTube Analytics, HubSpot CRM, and CallRail all use per-client credentials stored in the database. Configure them in each client's settings page — no global environment variables needed.

4. Deploy. Subsequent pushes to `main` deploy automatically.

### CI/CD

`.github/workflows/ci.yml` runs on every push and PR to `main`:
- **Node.js 20** environment
- `npm ci` -> `npm run lint` -> `npm run build`

Vercel's GitHub integration handles production deployments separately.

### Cron Jobs

Two Vercel cron jobs are configured in `vercel.json`:

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/snapshots` | Daily at 2:00 UTC | Pull metric data for all clients and upsert `MetricSnapshot` records |
| `/api/cron/reports` | Monthly on the 1st at 6:00 UTC | Auto-generate reports for clients with a `reportSchedule` configured |

Both endpoints require an `Authorization: Bearer <CRON_SECRET>` header when `CRON_SECRET` is set.

### Troubleshooting

**"Unable to open connection to local database dev.db"**

This means `DATABASE_URL` is not set to a remote Turso URL in Vercel. Serverless functions cannot access local SQLite files.

```bash
# Fix via Vercel CLI
npm run vercel:link
vercel env add DATABASE_URL production     # paste: libsql://<your-db>.turso.io
vercel env add TURSO_AUTH_TOKEN production  # paste: <your-auth-token>
npm run vercel:deploy
```

Or set them in the Vercel dashboard under **Settings -> Environment Variables** and trigger a redeploy.
