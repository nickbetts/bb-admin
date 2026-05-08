# Architecture — i3media Report Platform

This document covers the system architecture, database schema, project structure, data flows, and AI architecture of the i3media Report platform. For setup instructions, environment variables, and deployment guides, see [deployment.md](deployment.md). For the full feature walkthrough, see [features.md](features.md). For the product roadmap and vision, see [ROADMAP.md](../ROADMAP.md) and [VISION.md](../VISION.md).

---

## Table of Contents

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

---

## System Architecture Diagram

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
|                         ~270 API Route Handlers                                   |
|                                                                                    |
|  /api/auth/*          Authentication (login, logout, session, Google OAuth)        |
|  /api/ai/*            24 AI endpoints (summary, forecast, budget-advisor, etc.)    |
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
|  /api/financials/*    Client retainer and invoice management                       |
|  /api/tasks/*         Task management + categories + time logging                  |
|  /api/users/*         User management endpoints                                    |
|  /api/admin/*         User/role management + run-snapshots trigger                 |
|  /api/settings/*      App config + Google connection management                    |
|  /api/cross/*         Cross-platform analysis (keyword overlap)                    |
|  /api/share/*         Public share endpoints (proposals, reports)                  |
|  /api/notifications/* Notifications list + preferences + mark-read                 |
|  /api/portal/*        Client portal auth, data, users, magic-link                  |
|  /api/portal-publish/* Portal content publishing                                   |
|  /api/pillar-insights/* Content pillar insights                                    |
|  /api/click-protection/* Click fraud event ingestion                               |
|  /api/action-queue/*  Background action queue management                           |
|  /api/cache/*         Cache management and invalidation                            |
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
|  Vercel Postgres (Neon)                    |  |                           |
|                                            |  |  OpenAI API (GPT-4o-mini, |
|  65 models: User, Role, Session, Client,   |  |    GPT-4o, GPT-4o with    |
|  Report, ReportSection, Screenshot,        |  |    web search)            |
|  MetricSnapshot, KeywordPlannerResearch,   |  |                           |
|  Proposal, LlmTemplate, ClientGoal,        |  |  Vercel Blob (file        |
|  StrategyDocument, BudgetRecommendation,   |  |    storage for screenshots |
|  ActionItem, ClientCommunication,          |  |    and logos)              |
|  ClientPortalUser, CompetitorSnapshot,     |  |                           |
|  MediaPlan, Notification, ContentStrategy, |  |  Resend (email delivery)  |
|  DetectedAnomaly, ClickFraudEvent,         |  |                           |
|  LandingPage, LandingPageVersion,          |  |  Slack (webhook alerts)   |
|  GrandPlan, ClientRetainer, ClientInvoice, |  |                           |
|  TaskCategory, TaskAssignee, TaskComment,  |  |  Microsoft 365 OAuth      |
|  EmailVerificationJob, AdImageSession,     |  |                           |
|  PortalThread, AgencySubscription, + more  |  +---------------------------+
+--------------------------------------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16.1.6 (App Router) | Server/client rendering, API routes, file-based routing |
| **Language** | TypeScript (strict mode) | Type safety across the entire codebase |
| **UI** | React 19.2.3 | Component rendering |
| **Styling** | Tailwind CSS v4 + CSS custom properties | Utility-first styling with design tokens |
| **Charts** | Recharts 3.8 | Area charts, bar charts, pie charts across all dashboard sections |
| **Icons** | Lucide React | Consistent icon system |
| **Drag & Drop** | dnd-kit | Report section reordering |
| **Database** | Prisma v7 + Vercel Postgres (Neon) | ORM with 65 models |
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

---

## Database Schema

65 Prisma models across all build phases:

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
                                          ├──< ClientPortalUser ──< PortalThread ──< PortalMessage
                                          ├──< CompetitorSnapshot
                                          ├──< MediaPlan
                                          ├──< Notification
                                          ├──< ClientConversation
                                          ├──< ContentStrategy
                                          ├──< DetectedAnomaly
                                          ├──< ClickFraudEvent
                                          ├──< ClientFile
                                          ├──< LandingPage ──< LandingPageVersion
                                          │                 └──< LandingPageLead
                                          ├──< GrandPlan ──< GrandPlanVersion
                                          │              └──< GrandPlanEnquiry
                                          ├──< ClientRetainer ──< ClientInvoice
                                          ├──< AgencyTimeEntry
                                          ├──< EmailVerificationJob ──< EmailVerificationResult
                                          ├──< AdImageSession
                                          ├──< ContentGenerator
                                          ├──< InternalLinkingPlan
                                          └──< MetaAssassinPlan

TaskCategory ──< ClientTaskCategory
                      │
                      └──< TaskAssignee / TaskComment / TaskTimeLog / TaskAttachment

GoogleConnection  (standalone — multi-account OAuth)
Ms365Connection   (standalone — Microsoft 365 OAuth)
AppSetting        (standalone — key/value config)
ReportTemplate    (standalone — reusable report structures)
LlmTemplate       (standalone — LLM.txt generation templates)
LandingPageTemplate (standalone — landing page builder templates)
LandingPageTranslation (standalone — per-language translations for LP pages)
KeywordTrackerList  (standalone — saved keyword tracking lists)
AgencySubscription  (standalone — agency SaaS subscription)
UserActivityLog     (standalone — full user audit trail)
ServerLog / CronLog (standalone — operational logging)
ClickrUser / ClickrSession (standalone — Clickr SaaS builder auth, separate from main auth)
ApiCache            (standalone — short-lived API response cache)
QaChecklist         (standalone — pre-launch and campaign QA checklists)
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
| **ServerLog** | level, message, context (JSON) | Operational server-side log records |
| **CronLog** | jobName, status, duration, output | Cron job execution audit trail |
| **ApiCache** | key, value, expiresAt | Short-lived API response cache (reduces external API calls) |
| **QaChecklist** | title, items (JSON), clientId, status | QA checklists for pre-launch and campaign audits |
| **TaskCategory** | name, colour, icon | Shared task category definitions |
| **ClientTaskCategory** | clientId, taskCategoryId | Per-client task category assignments |
| **TaskAssignee** | actionItemId, userId | Action item assignees (many-to-many) |
| **TaskComment** | actionItemId, userId, content | Threaded comments on action items |
| **TaskTimeLog** | actionItemId, userId, minutes | Time tracking entries per task |
| **TaskAttachment** | actionItemId, url, filename | File attachments on action items |
| **ClientFile** | clientId, url, filename, size | Client-scoped file storage records |
| **DetectedAnomaly** | clientId, sectionType, metric, severity, description | Persisted anomaly records from AI/rules detection |
| **ClickFraudEvent** | clientId, ip, userAgent, campaignId, platform | Click fraud events flagged by ad traffic protection |
| **ContentStrategy** | clientId, title, spreadsheetData (JSON) | AI-generated content strategy documents |
| **UserActivityLog** | userId, action, entity, entityId | Full audit trail of user actions |
| **Ms365Connection** | userId, accessToken, refreshToken, scopes | Microsoft 365 OAuth connections |
| **LandingPage** | clientId, title, slug, status, templateId | Landing pages built with the Clickr builder |
| **LandingPageVersion** | landingPageId, content (JSON), publishedAt | Version history for landing pages |
| **LandingPageLead** | landingPageId, email, data (JSON) | Leads captured via landing page forms |
| **LandingPageTemplate** | name, category, content (JSON) | Reusable landing page templates |
| **GrandPlan** | clientId, title, content (JSON), status | Comprehensive strategic grand plan documents |
| **GrandPlanVersion** | grandPlanId, content (JSON) | Version history for grand plans |
| **GrandPlanEnquiry** | grandPlanId, name, email, message | Enquiries submitted via shared grand plans |
| **ClientRetainer** | clientId, monthlyValue, startDate, services (JSON) | Client retainer and billing configuration |
| **ClientInvoice** | clientId, retainerId, amount, status, dueDate | Invoice records against client retainers |
| **AgencyTimeEntry** | clientId, userId, minutes, date, description | Agency staff time entries per client |
| **PortalThread** | clientPortalUserId, subject, status | Messaging threads in the client portal |
| **PortalMessage** | threadId, senderType, content | Messages within portal threads |
| **AgencySubscription** | plan, status, billingEmail, seats | Agency-level SaaS subscription record |
| **EmailVerificationJob** | clientId, listName, status, totalEmails | Email list verification job records |
| **EmailVerificationResult** | jobId, email, status, reason | Per-email result for a verification job |
| **AdImageSession** | clientId, userId, prompt, imageUrl, platform | AI-generated ad image sessions |
| **ContentGenerator** | clientId, title, topic, pillars (JSON), status | AI-generated long-form content strategies with pillar structure |
| **InternalLinkingPlan** | clientId, siteUrl, status, planData (JSON) | Internal linking opportunity plans generated by AI |
| **MetaAssassinPlan** | clientId, title, planData (JSON), status | Meta audience targeting plans with AI-generated insights |
| **KeywordTrackerList** | name, keywords (JSON), clientId | Saved keyword tracking lists for position monitoring |
| **LandingPageTranslation** | landingPageId, language, content (JSON) | Per-language translation content for landing pages |
| **ClickrUser** | email, password, plan, stripeCustomerId | Standalone Clickr SaaS user accounts (separate auth from main platform) |
| **ClickrSession** | clickrUserId, token, expiresAt | Session records for Clickr SaaS authenticated users |

---

## Project Structure

```
i3media-report/
├── prisma/
│   ├── schema.prisma              # 65 database models
│   ├── migrations/                # SQL migration files
│   └── seed.ts                    # Default users and demo client
├── public/
│   └── primary-logo.svg           # i3media branding
├── scripts/
│   ├── get-gads-refresh-token.mjs # Google Ads OAuth token generator
│   ├── get-meta-long-lived-token.mjs # Meta token exchange script
│   ├── prod-setup.mjs             # Runs prisma migrate deploy against production Postgres
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
│   │   │   ├── media-plan/        # Media plan builder
│   │   │   ├── landing-pages/     # Clickr landing page builder
│   │   │   ├── grand-plan/        # Grand plan strategy tool
│   │   │   ├── qa-checklist/      # QA checklist tool
│   │   │   ├── ad-image-generator/ # AI ad image generator
│   │   │   ├── email-verifier/    # Email list verification tool
│   │   │   ├── content-strategy/  # AI content strategy generator
│   │   │   └── access-requester/  # Integration access request tool
│   │   ├── portal/                # Client self-serve portal
│   │   │   ├── login/             # Magic-link portal login
│   │   │   └── dashboard/         # Client portal dashboard
│   │   ├── meridian/              # Meridian AI intelligence product landing page
│   │   ├── meridian-architecture/ # Meridian architecture detail page
│   │   ├── clickr/                # Clickr landing page builder product landing page
│   │   ├── budget-intelligence/   # Budget intelligence feature landing page
│   │   ├── ai-analyst/            # AI analyst feature landing page
│   │   ├── signals/               # Signals / anomaly hub feature page
│   │   ├── ad-traffic-protection/ # Ad traffic protection feature page
│   │   ├── pillar-insights/       # Pillar insights feature page
│   │   ├── forecasting/           # Forecasting feature landing page
│   │   ├── settings/              # Global platform settings
│   │   ├── admin/                 # User and role management
│   │   │   └── roles/             # Role/permission editor
│   │   ├── share/                 # Public share routes (noindex)
│   │   │   ├── proposal/[token]/  # Shareable proposal view
│   │   │   └── report/[token]/    # Shareable report view
│   │   └── api/                   # ~270 API route handlers
│   │       ├── auth/              # Login, logout, session, Google Ads OAuth
│   │       ├── ai/                # 24 AI endpoints:
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
│   │       │   ├── audience-suggestions/ # Cross-channel audience targeting suggestions
│   │       │   ├── content-strategy-regen/ # Content strategy item regeneration
│   │       │   ├── cross-platform-creative/ # Cross-platform creative analysis (Meta/TikTok/Google)
│   │       │   ├── keyword-suggestions/ # AI keyword suggestions from multi-source data
│   │       │   ├── qa-summary/    # QA checklist AI summary and recommendations
│   │       │   └── snapshots/     # Historical metric retrieval (GET)
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
│   │       ├── financials/        # Client retainer and invoice management
│   │       ├── tasks/             # Task management + time logs + attachments
│   │       ├── task-categories/   # Task category CRUD
│   │       ├── users/             # User management
│   │       ├── click-protection/  # Click fraud event ingestion
│   │       ├── pillar-insights/   # Content pillar insights
│   │       ├── portal-publish/    # Portal content publishing
│   │       ├── action-queue/      # Background action queue
│   │       ├── cache/             # Cache management and invalidation
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
│       ├── prisma.ts              # Prisma singleton (Vercel Postgres / Neon)
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

*Last updated: April 2026*
