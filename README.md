# i3media Report Platform

A full-stack digital marketing performance reporting platform built for agencies. Aggregates data from **10 marketing channels** into unified client dashboards with **AI-powered insights**, **cross-channel anomaly detection**, **automated report generation**, **conversational AI analyst**, **proposal building**, and **PDF export**.

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
  - [Core Web Vitals](#core-web-vitals)
  - [Conversational AI Chat](#conversational-ai-chat)
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

- **10 data source integrations** — GA4, Google Ads, Meta Ads, TikTok Ads, Microsoft Advertising, SemRush, Google Search Console, Moz, WooCommerce, Shopify
- **AI-powered analysis** — OpenAI generates insights, detects anomalies, writes report commentary, scores landing pages, builds proposals, and provides conversational analysis
- **Conversational AI analyst** — "Ask the Data" chat interface on every client dashboard for instant natural-language performance analysis
- **Cross-channel intelligence** — each AI analysis receives context from all other connected platforms for richer, more actionable insights
- **Automated reporting** — drag-and-drop report builder with per-section AI commentary, screenshot uploads, branded PDF export, shareable links, and automated monthly scheduling
- **Agency tools** — keyword planner with proposal generation, landing page analyser, LLM.txt generator, pricing strategy editor
- **Notification system** — email and Slack delivery for anomalies, report events, and key platform alerts with per-user preferences
- **Core Web Vitals** — real-user performance data via Google's CrUX API
- **Role-based access control** — granular permissions system with 11 permission types across user-defined roles

### User Journey (High Level)

```
Login -> Dashboard (stats overview)
  -> Clients (list/create/configure)
    -> Client Dashboard (tabbed: Signals | Overview | SEO | GA4 | GSC | Meta | Google Ads | TikTok | Microsoft Ads | E-Commerce | CWV)
      -> "Ask the Data" AI Chat (floating panel, always available)
      -> Create Report (select sections + template)
        -> Edit Report (drag-drop sections, AI commentary, screenshots)
          -> Export PDF / Share Link
  -> Tools (Page Analyser | Keyword Planner | Proposals | LLM Generator | Pricing)
  -> Admin (Users | Roles & Permissions)
  -> Settings (Google OAuth, OpenAI key, MCC, benchmarks, notifications)
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
|                         ~50 API Route Handlers                                     |
|                                                                                    |
|  /api/auth/*          Authentication (login, logout, session, Google OAuth)        |
|  /api/ai/*            AI endpoints (summary, super-summary, commentary, etc.)      |
|  /api/ga4/*           GA4 data dispatcher + property discovery                     |
|  /api/google-ads/*    Google Ads data + account discovery                          |
|  /api/meta/*          Meta Ads data + account/video proxy                          |
|  /api/search-console/* GSC data + site discovery                                   |
|  /api/semrush/*       SemRush data + project discovery                             |
|  /api/seo/*           Moz domain authority                                         |
|  /api/shopify/*       Shopify e-commerce data                                      |
|  /api/woocommerce/*   WooCommerce e-commerce data                                  |
|  /api/clients/*       Client CRUD + logo upload                                    |
|  /api/reports/*       Report CRUD, sections, screenshots, PDF, share               |
|  /api/tools/*         Keyword planner, proposals, page analyser, LLM generator     |
|  /api/admin/*         User/role management                                         |
|  /api/settings/*      App config + Google connection management                    |
|  /api/cross/*         Cross-platform analysis (keyword overlap)                    |
|  /api/share/*         Public share endpoints (proposals, reports)                  |
+--------+----------+----------+----------+----------+------+-----------+-----------+
         |          |          |          |          |      |           |
    +----v---+ +----v---+ +---v----+ +---v----+ +--v---+ +-v------+ +-v---------+
    |  GA4   | | Google | |  Meta  | |SemRush | | GSC  | |  Moz   | |WooCommerce|
    |  Data  | |  Ads   | |  Ads   | |  API   | | API  | |  API   | | / Shopify |
    |  API   | |  API   | | Graph  | |        | |      | |        | |   APIs    |
    +--------+ +--------+ +--------+ +--------+ +------+ +--------+ +-----------+

+--------------------------------------------+  +---------------------------+
|          DATABASE (Prisma ORM)             |  |     EXTERNAL SERVICES     |
|  SQLite (local) / Turso libSQL (prod)      |  |                           |
|                                            |  |  OpenAI API (GPT-4o-mini, |
|  15 models: User, Role, Session, Client,   |  |    GPT-4o, GPT-4o with    |
|  Report, ReportSection, Screenshot,        |  |    web search)            |
|  ReportTemplate, GoogleConnection,         |  |                           |
|  MetricSnapshot, AppSetting,               |  |  Vercel Blob (file        |
|  KeywordPlannerResearch, Proposal,         |  |    storage for screenshots |
|  ProposalEnquiry, LlmTemplate             |  |    and logos)              |
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
| **Database** | Prisma v7 + SQLite (dev) / Turso libSQL (prod) | ORM with 15 models, 19 migrations |
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

15 Prisma models with 19 migrations:

```
Role ──────────────< User ──────────< Session
                       │
                       └──────────────< Client
                                          │
                                          ├──< Report ──< ReportSection
                                          │       │
                                          │       └──< Screenshot
                                          │
                                          ├──< MetricSnapshot
                                          ├──< KeywordPlannerResearch
                                          └──< Proposal ──< ProposalEnquiry

GoogleConnection (standalone — multi-account OAuth)
AppSetting       (standalone — key/value config)
ReportTemplate   (standalone — reusable report structures)
LlmTemplate      (standalone — LLM.txt generation templates)
```

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Role** | name, permissions (JSON) | Permission-based access control |
| **User** | email, passwordHash, roleId, mustChangePassword | User accounts with role assignment |
| **Session** | token, userId, expiresAt | Cookie-based sessions (7-day TTL) |
| **Client** | name, website, logoUrl, ga4PropertyId, metaAccountId, googleAdsCustomerId, semrushDomain, searchConsoleUrl, wooUrl, shopifyDomain, aiInstructions, contractedHours (JSON) | Central entity storing all integration credentials |
| **Report** | title, period, status, sectionOrder (JSON), blockVisibility (JSON), shareToken, customDateStart/End | Reports with configurable sections and sharing |
| **ReportSection** | sectionType, title, commentary, contentText, metrics (JSON), aiContext (JSON) | Individual report sections with AI context |
| **Screenshot** | url, caption, sectionId | Vercel Blob-stored images linked to report sections |
| **ReportTemplate** | name, sections (JSON), isDefault | Reusable report section configurations |
| **GoogleConnection** | email, refreshToken, scopes, googleAdsCustomerIds (JSON) | Multi-account Google OAuth storage |
| **MetricSnapshot** | clientId, sectionType, periodStart, periodEnd, metrics (JSON) | Historical metric storage (composite unique key) |
| **AppSetting** | key, value | Global config (OpenAI key, MCC ID, benchmarks, pricing) |
| **KeywordPlannerResearch** | keywords (JSON), adGroups (JSON), brief | Saved keyword research sessions |
| **Proposal** | title, htmlContent, services (JSON), shareToken, viewCount | AI-generated client proposals |
| **ProposalEnquiry** | name, email, phone, message | Enquiries from public proposal views |
| **LlmTemplate** | name, template, sectorType | Templates for LLM.txt generation |

### Project Structure

```
i3media-report/
├── prisma/
│   ├── schema.prisma              # 15 database models
│   ├── migrations/                # 19 SQL migration files
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
│   │   ├── globals.css            # Design tokens, component classes (794 lines)
│   │   ├── login/                 # Login page
│   │   ├── change-password/       # Forced password change
│   │   ├── dashboard/             # Main dashboard (stats, recent items)
│   │   ├── clients/               # Client list, detail, settings, new report
│   │   │   └── [slug]/            # Per-client dashboard and settings
│   │   ├── reports/               # Report list, editor, print view, templates
│   │   │   └── [id]/             # Report editor and print route
│   │   ├── tools/                 # Agency tools suite
│   │   │   ├── page-analyser/     # AI landing page analyser
│   │   │   ├── keyword-planner/   # Keyword research + proposal generator
│   │   │   ├── proposals/         # Saved proposals management
│   │   │   ├── pricing/           # Pricing strategy editor
│   │   │   └── llm-generator/     # LLM.txt content generator
│   │   ├── settings/              # Global platform settings
│   │   ├── admin/                 # User and role management
│   │   │   └── roles/             # Role/permission editor
│   │   ├── share/                 # Public share routes (noindex)
│   │   │   ├── proposal/[token]/  # Shareable proposal view
│   │   │   └── report/[token]/    # Shareable report view
│   │   └── api/                   # ~50 API route handlers
│   │       ├── auth/              # Login, logout, session, Google Ads OAuth
│   │       ├── ai/                # 7 AI endpoints
│   │       │   ├── summary/       # Per-section AI insights + anomaly detection
│   │       │   ├── super-summary/ # Deep journey analysis + landing page crawl
│   │       │   ├── report-commentary/ # Configurable report commentary
│   │       │   ├── executive-summary/ # Cross-section executive summary
│   │       │   ├── overview-narrative/ # Cross-channel narrative
│   │       │   ├── landing-page-analysis/ # Batch CRO/SEO analysis
│   │       │   └── snapshots/     # Historical metric storage
│   │       ├── ga4/               # GA4 data dispatcher (12 data types)
│   │       ├── google-ads/        # Google Ads data + accounts + MCC
│   │       ├── meta/              # Meta Ads data + accounts + video proxy
│   │       ├── search-console/    # GSC data + site discovery
│   │       ├── semrush/           # SemRush data + project discovery
│   │       ├── seo/               # Moz domain authority
│   │       ├── shopify/           # Shopify e-commerce data
│   │       ├── woocommerce/       # WooCommerce e-commerce data
│   │       ├── cross/             # Cross-platform (keyword overlap)
│   │       ├── clients/           # Client CRUD + logo upload
│   │       ├── reports/           # Report CRUD, sections, screenshots, PDF
│   │       ├── report-templates/  # Template CRUD
│   │       ├── tools/             # Keyword planner, proposals, LLM, page analyser
│   │       ├── admin/             # User/role management
│   │       ├── settings/          # App config + Google connections
│   │       └── share/             # Public share data endpoints
│   ├── components/
│   │   ├── ai/                    # 3 components
│   │   │   ├── AiInsightsPanel.tsx    # Dual-mode insights (card + compact button)
│   │   │   ├── SuperSummary.tsx       # Health score ring + journey analysis
│   │   │   └── AiLandingPageAnalysis.tsx # Landing page CRO/SEO scoring
│   │   ├── dashboard/             # 9 components
│   │   │   ├── ClientDashboard.tsx    # Tab controller + period selector + cross-platform context
│   │   │   ├── SignalsSection.tsx     # Cross-channel anomaly hub
│   │   │   ├── OverviewSection.tsx    # Cross-channel overview + funnel
│   │   │   ├── GA4Section.tsx         # Google Analytics dashboard
│   │   │   ├── SemrushSection.tsx     # SEO/SemRush dashboard
│   │   │   ├── MetaSection.tsx        # Meta/Facebook Ads dashboard
│   │   │   ├── GoogleAdsSection.tsx   # Google Ads dashboard
│   │   │   ├── SearchConsoleSection.tsx # Search Console dashboard
│   │   │   └── EcommerceSection.tsx   # WooCommerce/Shopify dashboard
│   │   ├── reports/               # 5 components
│   │   │   ├── ReportView.tsx         # Full report editor (1644 lines)
│   │   │   ├── PrintReportContent.tsx # Print/PDF layout
│   │   │   ├── TextSection.tsx        # Editable text sections with autosave
│   │   │   ├── ScreenshotsSection.tsx # Screenshot grid display
│   │   │   └── ScreenshotCaptionDialog.tsx # Upload dialog
│   │   ├── admin/                 # 3 components
│   │   │   ├── UsersManager.tsx       # User CRUD interface
│   │   │   ├── RolesManager.tsx       # Role/permission management
│   │   │   └── AdminNav.tsx           # Admin tab navigation
│   │   ├── clients/               # 2 components
│   │   │   ├── ClientSettingsForm.tsx # Client integration settings (796 lines)
│   │   │   └── ClientListSearch.tsx   # Searchable client grid
│   │   ├── layout/                # 2 components
│   │   │   ├── AuthenticatedLayout.tsx # Session guard + permission check
│   │   │   └── Sidebar.tsx            # Responsive nav (desktop collapsible + mobile drawer)
│   │   └── ui/                    # 5 files (8 components)
│   │       ├── MetricCard.tsx         # KPI display card with change badges
│   │       ├── SearchInput.tsx        # Search input with icon
│   │       ├── PageSkeleton.tsx       # Loading skeleton
│   │       ├── Toast.tsx              # Toast notification system (Context + Provider)
│   │       └── index.tsx              # LoadingSpinner, SectionCard, Delta, Badge
│   └── lib/                       # 15 library modules
│       ├── auth.ts                # HMAC-SHA256 sessions, permissions, guards
│       ├── prisma.ts              # Prisma singleton (libSQL adapter in prod)
│       ├── ga4.ts                 # GA4 Data API client (12 functions)
│       ├── google-ads.ts          # Google Ads API client (GAQL, 15 functions)
│       ├── meta.ts                # Meta Graph API client (9 functions)
│       ├── search-console.ts      # GSC API client (7 functions)
│       ├── semrush.ts             # SemRush API client (11 functions)
│       ├── domain-authority.ts    # Moz Link API client
│       ├── shopify.ts             # Shopify Admin API client
│       ├── woocommerce.ts         # WooCommerce REST API client
│       ├── google-auth.ts         # Google service account singleton
│       ├── landing-page-analyzer.ts # Page signal extraction + site crawling
│       ├── report-blocks.ts       # Report section/block configuration
│       ├── render-print-html.ts   # PDF HTML template rendering
│       ├── puppeteer.ts           # Headless Chrome browser management
│       └── utils.ts               # Formatters, date helpers, health scoring
├── .github/workflows/ci.yml      # GitHub Actions CI pipeline
├── next.config.ts                 # Puppeteer + Vercel Blob image config
├── vercel.json                    # Vercel build configuration
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

The platform uses **7 distinct AI endpoints** plus **2 tool-specific AI generators**, all powered by OpenAI:

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
    |   commentary    |   |                 |   | /tools/llm-      |
    | /ai/landing-    |   |                 |   |   generator/     |
    |   page-analysis |   |                 |   |   generate       |
    +-----------------+   +-----------------+   | /tools/page-     |
                                                |   analyser       |
                                                +------------------+
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
  - E-commerce platform toggle
  - AI report instructions (per-client prompt customisation)
  - Contracted hours (service type + hours/month entries)

### Dashboard

**Route:** `/dashboard`

Displays platform-wide statistics: total clients, total reports, active integrations count. Lists recent clients and recent reports for quick navigation.

### Client Dashboard

**Route:** `/clients/[slug]`

Tabbed interface with date range selector (7d / 30d / 90d / 6m / custom). Tabs are conditionally displayed based on which integrations the client has configured.

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

### Conversational AI Chat

**Floating panel:** "Ask the Data" — available on every client dashboard

- GPT-4o-mini powered chat interface anchored to the client's metric history
- Conversation history persisted per client/user in the database
- Pre-loaded with all historical `MetricSnapshot` data as context
- Suggested prompt shortcuts for common questions
- Supports multi-turn conversations with full history passed on each turn
- Uses `ClientConversation` model; API at `/api/ai/chat`

### Notifications

**System-wide:** Anomaly alerts, report events, and key platform events

- **In-app** — stored in the `Notification` model, surfaced in UI
- **Email** — via Resend (configurable in AppSettings: `emailApiKey`, `emailFromAddress`)
- **Slack** — via incoming webhooks configured per-user in notification preferences
- **Types:** anomaly, report_ready, report_sent, report_opened, proposal_viewed, integration_error, goal_at_risk, snapshot_complete
- **Admin broadcast** — `notifyAdmins()` sends to all admin users
- API at `/api/notifications` (list), `/api/notifications/read` (mark read)

### Notification Preferences

**Route:** `/settings/notifications`

- Toggle email and Slack delivery channels
- Configure Slack webhook URL per user
- Choose delivery frequency: Immediate / Daily Digest / Weekly Digest
- Set quiet hours (non-critical notifications suppressed outside business hours)
- Enable/disable individual notification types
- API at `/api/notifications/preferences` (GET/PUT)

**Route:** `/reports` (list) and `/reports/[id]` (editor)

**Report list features:**
- Search/filter reports
- Inline rename
- Delete with confirmation
- Duplicate report
- Status badges (draft/published)

**Report editor features (ReportView, 1644 lines):**
- Status stepper: Draft -> Review -> Published
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

- View saved proposals
- Share proposals via unique public token
- Track view counts
- Receive client enquiries through embedded forms
- Edit proposal details (contracted hours, services)

#### Pricing Strategy (`/tools/pricing`)

Editor for managing agency pricing configuration (service tiers, add-ons, retainer packages) stored in AppSettings.

#### LLM.txt Generator (`/tools/llm-generator`)

Generates AI-search-optimised `llm.txt` files for client websites:
- Crawls homepage + key sub-pages
- Fetches sitemap, robots.txt, existing llm.txt
- Verifies authority (Charity Commission, Companies House, web search)
- Extracts social profiles
- Generates structured content from templates

### Admin Panel

**Route:** `/admin` (requires `users` permission)

- **Users tab:** Full CRUD — create users with name, email, password, role selection. Edit inline. Delete with confirmation. Password show/hide toggle.
- **Roles tab:** Create and edit roles with grouped permission checklists. Permission groups: dashboard, clients, reports, templates, settings, page_analyser, proposal_generator, proposals, pricing, llm_generator, users.

### Settings

**Route:** `/settings` (requires `settings` permission)

- **Google Connections:** Connect Google accounts via OAuth2 for Google Ads. Multiple accounts supported for MCC structures. Connection verification and removal.
- **OpenAI API Key:** Enter key (stored in DB, takes priority over env var)
- **Task Time Benchmarks:** Configure hours-per-task estimates used in proposal generation
- **Default MCC:** Select default Google Ads Manager account
- **Notification Preferences:** See [Notification Preferences](#notification-preferences)

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

# ─── Google (GA4 + Search Console — service account) ──────────────
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

# ─── OpenAI ───────────────────────────────────────────────────────
OPENAI_API_KEY="sk-..."    # Or configure in the app via Settings page

# ─── Moz (Domain Authority) ──────────────────────────────────────
MOZ_ACCESS_ID="your-moz-access-id"
MOZ_SECRET_KEY="your-moz-secret-key"
```

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
| `TIKTOK_ACCESS_TOKEN` | TikTok Ads global access token *(or per-client in settings)* |
| `MICROSOFT_ADS_CLIENT_ID` | Microsoft Ads OAuth app client ID |
| `MICROSOFT_ADS_CLIENT_SECRET` | Microsoft Ads OAuth client secret |
| `MICROSOFT_ADS_REFRESH_TOKEN` | Microsoft Ads OAuth refresh token |
| `MICROSOFT_ADS_DEVELOPER_TOKEN` | Microsoft Advertising developer token |
| `GOOGLE_CRUX_API_KEY` | Google CrUX API key for Core Web Vitals |
| `CRON_SECRET` | Secret for securing `/api/cron/*` endpoints |

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
