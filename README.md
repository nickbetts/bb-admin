# i3media Report Platform

A full-stack digital marketing performance reporting platform built for agencies. Aggregates data from **15 marketing channels** into unified client dashboards with **AI-powered insights**, **automated report generation**, and a full **agency operations suite**.

Built with **Next.js 16**, **React 19**, **Prisma v7**, **Tailwind CSS v4**, and **OpenAI**. Deployed on **Vercel**.

---

## Key Stats

| Metric             | Value                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing channels | 15 (GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, SemRush, Search Console, Moz, WooCommerce, Shopify)             |
| AI endpoints       | 24 (anomaly detection, forecasting, budget advice, creative intelligence, audience suggestions, content strategy, cross-platform creative, QA summary, and more) |
| Prisma models      | 65                                                                                                                                                               |
| API route handlers | ~270                                                                                                                                                             |

---

## Tech Stack

| Layer        | Technology                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js 16.1.6 (App Router)                                                                             |
| Language     | TypeScript (strict)                                                                                     |
| UI           | React 19.2.3 + Tailwind CSS v4 + Framer Motion + Radix wrappers + shadcn primitives + GSAP/Lenis/Lottie |
| Charts       | Recharts 3.8                                                                                            |
| Database     | Prisma v7 + Vercel Postgres (Neon)                                                                      |
| AI           | OpenAI (GPT-4o-mini, GPT-4o, GPT-4o-search-preview)                                                     |
| Auth         | HMAC-SHA256 signed cookies + bcrypt                                                                     |
| File storage | Vercel Blob                                                                                             |
| PDF          | Puppeteer-core + @sparticuz/chromium-min                                                                |
| Hosting      | Vercel (serverless)                                                                                     |
| CI           | GitHub Actions                                                                                          |

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

Canonical docs for active development:

| Document                                             | Purpose                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| [docs/deployment.md](docs/deployment.md)             | Local setup, environment variables, integration credentials, Vercel deployment |
| [docs/architecture.md](docs/architecture.md)         | System architecture, schema overview, and project structure                    |
| [docs/features.md](docs/features.md)                 | Feature behaviour, data flows, and UX walkthrough                              |
| [docs/ai-audit.md](docs/ai-audit.md)                 | AI endpoint inventory and AI improvement status                                |
| [docs/data-audit.md](docs/data-audit.md)             | Per-channel API capability audit and implementation status                     |
| [docs/ai-cost-tracking.md](docs/ai-cost-tracking.md) | AI usage logging and cost reporting integration guide                          |
| [VISION.md](VISION.md)                               | Long-term product direction                                                    |
| [ROADMAP.md](ROADMAP.md)                             | Prioritised future delivery plan                                               |

Note: legacy one-off build-plan docs are removed once implemented to avoid drift with live code paths.

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
npm run format          # Prettier write mode (+ Tailwind class ordering)
npm run format:check    # Prettier check mode
npm run test:unit       # Vitest unit test run
npm run test:unit:watch # Vitest watch mode
npm run test:unit:coverage # Vitest with coverage report
npm run knip            # Dependency/export/file hygiene scan
npm run analyze         # Build with Next.js bundle analyzer enabled
npm run check           # Lint + unit tests + production build
npm run db:migrate      # Run pending Prisma migrations
npm run db:seed         # Seed database with default users
npm run db:reset        # Reset DB and re-run all migrations
```

Pre-commit hooks are enabled via Husky + lint-staged to auto-run ESLint and Prettier on staged files.

---

## CI

Every push and PR must pass:

1. `npm run lint` — 0 errors
2. `npm run test:unit` — unit tests pass
3. `npm run build` — production build succeeds

Recommended local gate before opening a PR: `npm run check`

---

## Contributing

1. Create a feature branch
2. Make small, focused changes
3. Run `npm run check`
4. Open a PR

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for coding conventions and agent instructions.
