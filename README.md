# i3media Report Platform

A full-stack digital marketing performance reporting platform built for agencies. Aggregates data from **15 marketing channels** into unified client dashboards with **AI-powered insights**, **automated report generation**, and a full **agency operations suite**.

Built with **Next.js 16**, **React 19**, **Prisma v7**, **Tailwind CSS v4**, and **OpenAI**. Deployed on **Vercel**.

---

## Key Stats

| Metric | Value |
|---|---|
| Marketing channels | 15 (GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, SemRush, Search Console, Moz, WooCommerce, Shopify) |
| AI endpoints | 24 (anomaly detection, forecasting, budget advice, creative intelligence, audience suggestions, content strategy, cross-platform creative, QA summary, and more) |
| Prisma models | 65 |
| API route handlers | ~270 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19.2.3 + Tailwind CSS v4 |
| Charts | Recharts 3.8 |
| Database | Prisma v7 + Vercel Postgres (Neon) |
| AI | OpenAI (GPT-4o-mini, GPT-4o, GPT-4o-search-preview) |
| Auth | HMAC-SHA256 signed cookies + bcrypt |
| File storage | Vercel Blob |
| PDF | Puppeteer-core + @sparticuz/chromium-min |
| Hosting | Vercel (serverless) |
| CI | GitHub Actions |

---

## Quick Start

```bash
git clone <repo-url>
cd i3media-report
npm install
cp .env.local.example .env.local   # then fill in your API keys
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in.

See [docs/deployment.md](docs/deployment.md) for full environment variable reference, API integration setup, and production deployment to Vercel.

---

## Documentation

| Document | Description |
|---|---|
| [docs/features.md](docs/features.md) | Full feature walkthrough, data flows, and AI architecture |
| [docs/architecture.md](docs/architecture.md) | System architecture, database schema, project structure |
| [docs/deployment.md](docs/deployment.md) | Setup, environment variables, API integrations, Vercel deployment |
| [docs/ai-audit.md](docs/ai-audit.md) | AI endpoint inventory, data availability matrix, improvement roadmap |
| [docs/data-audit.md](docs/data-audit.md) | Per-platform API capability audit across all 15 channels |
| [VISION.md](VISION.md) | Platform vision, AI intelligence roadmap, agency operations ambition |
| [ROADMAP.md](ROADMAP.md) | Product roadmap and upcoming features |

---

## Repository Layout

```
src/
  app/                  # Next.js App Router pages and API routes
    api/                # ~270 API route handlers (ai/, auth/, clients/, reports/, tools/, cron/, portal/, financials/, tasks/, users/, clickr/, click-protection/, etc.)
    clients/            # Client dashboard pages
    reports/            # Report builder and viewer pages
    tools/              # Agency tools (keyword planner, proposals, media plans, landing page builder, grand plan, content strategy, email verifier, ad image generator)
    portal/             # Client self-serve portal
  components/
    dashboard/          # Per-channel section components (GA4Section, MetaSection, etc.)
    reports/            # Report builder components
    ui/                 # Shared UI primitives
  lib/                  # Shared helpers (auth, prisma, channel APIs, caching, etc.)
prisma/
  schema.prisma         # 65 database models
  migrations/           # SQL migration files
docs/                   # Technical documentation
```

---

## Scripts

```bash
npm run dev             # Start dev server
npm run build           # Prisma generate + Next.js production build
npm run lint            # ESLint (must pass for CI)
npm run db:migrate      # Run pending Prisma migrations
npm run db:seed         # Seed database with default users
npm run db:reset        # Reset DB and re-run all migrations
```

---

## CI

Every push and PR must pass:

1. `npm run lint` — 0 errors
2. `npm run build` — production build succeeds

---

## Contributing

1. Create a feature branch
2. Make small, focused changes
3. Run `npm run lint && npm run build`
4. Open a PR

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for coding conventions and agent instructions.
