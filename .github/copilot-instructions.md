# GitHub Copilot Instructions — i3media Report Platform

## Project overview

i3media Report is an internal agency platform built with **Next.js 16 (App Router) + React 19 + TypeScript + Prisma + Tailwind CSS v4**, deployed on **Vercel**. It aggregates data from 15 marketing channels (GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, SemRush, Search Console, Moz, WooCommerce, Shopify) and surfaces AI-powered insights via **OpenAI** (GPT-4o / GPT-4o-mini).

## Repository layout

```
src/
  app/                  # Next.js App Router pages and API routes
    api/                # ~100 API route handlers
      ai/               # AI endpoints (summary, forecast, commentary, etc.)
      auth/             # Session-based auth (login/logout/session/Google OAuth)
      clients/          # Client CRUD, goals, actions, communications
      reports/          # Report CRUD, sections, PDF, share links
      tools/            # Keyword planner, proposals, page analyser, LLM gen
      admin/            # User/role management
      settings/         # App configuration
      cron/             # Scheduled jobs (snapshots, auto-reports)
    clients/            # Client dashboard pages
    reports/            # Report builder and viewer pages
    tools/              # Agency tools pages
    portal/             # Client self-serve portal
    settings/           # Settings UI
    admin/              # Admin UI
  components/
    dashboard/          # Per-channel section components (GA4Section, MetaSection, etc.)
    reports/            # Report builder components (ReportView, etc.)
    ui/                 # Shared UI primitives
  lib/                  # Shared helpers
    prisma.ts           # Prisma client singleton
    openai-client.ts    # OpenAI client (reads key from DB AppSetting or env)
    auth.ts             # Session utilities
    ga4.ts / meta.ts / google-ads.ts / etc.   # Per-channel API helpers
prisma/
  schema.prisma         # Database schema (SQLite locally, Turso libSQL in prod)
  seed.ts               # Seed script
prisma.config.ts        # Prisma CLI config — reads DATABASE_URL, falls back to file:./dev.db
```

## Key conventions

- **App Router only** — no `pages/` directory. All pages and API routes live under `src/app/`.
- **Client components** use `'use client'` directive; server components are the default.
- **React 19 / Next 16**: dynamic-route params arrive as `Promise<{...}>` — unwrap with `use(params)` in client components.
- **OpenAI**: always call `getOpenAiClient()` from `src/lib/openai-client.ts`. Do not read `process.env.OPENAI_API_KEY` directly — the key may be stored in the DB `AppSetting` table under key `openaiApiKey`.
- **Prisma**: use the singleton from `src/lib/prisma.ts`. Never instantiate `PrismaClient` directly in route files.
- **Tailwind v4** — utility-first, no component library. Keep styles co-located with components.
- **No test infrastructure** — there is currently no test runner. Validate changes with `npm run lint` and `npm run build`.

## Local development commands

```bash
# Install dependencies
npm ci

# Start the dev server (hot reload)
npm run dev

# Lint (ESLint 9 + eslint-config-next)
npm run lint

# Full build (prisma generate + next build)
npm run build

# Database — local SQLite
DATABASE_URL=file:dev.db npm run build   # Build needs this for prisma generate

# DB migrations / seed (requires DATABASE_URL set)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # tsx prisma/seed.ts
npm run db:push      # prisma db push (no migration file)
npm run db:reset     # prisma migrate reset
```

## CI expectations

Every PR must pass:
1. `npm run lint` — ESLint must report 0 errors.
2. `npm run build` — Next.js production build must succeed (includes `prisma generate`).

There is no separate typecheck or test step in CI. TypeScript errors surface through `next build`.

## Prisma / database notes

- **Local dev**: `DATABASE_URL=file:dev.db` (SQLite file in project root). The file is git-ignored.
- **Production**: Turso libSQL — `DATABASE_URL=libsql://...` + `TURSO_AUTH_TOKEN=...`.
- **CI**: uses `DATABASE_URL=file:dev.db` so `prisma generate` and `next build` succeed without a real database.
- **`prisma.config.ts`** reads `DATABASE_URL` from env (fallback `file:./dev.db`) — not `env()` in `schema.prisma`.
- Always run `npm run db:migrate` after changing `prisma/schema.prisma` locally.
- Never commit the `dev.db` file (it's in `.gitignore`).

## Environment variables

**Never commit real secrets.** Use `.env.local` (git-ignored) for local development.

| Variable | Required for prod | Can be stubbed in CI/build |
|---|---|---|
| `DATABASE_URL` | ✅ | ✅ `file:dev.db` |
| `TURSO_AUTH_TOKEN` | ✅ (prod only) | ✅ omit for local SQLite |
| `BLOB_READ_WRITE_TOKEN` | ✅ | ✅ `vercel_blob_rw_placeholder` |
| `SEMRUSH_API_KEY` | ✅ | ✅ `placeholder` |
| `OPENAI_API_KEY` | ✅ | ✅ `placeholder` (AI features won't work) |
| `GA4_ACCESS_TOKEN` | ✅ | ✅ `placeholder` |
| `META_APP_ID` / `META_APP_SECRET` / `META_ACCESS_TOKEN` | ✅ | ✅ `placeholder` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | ✅ `placeholder` |
| `NEXTAUTH_SECRET` | ✅ | ✅ any random string |
| All other API keys | channel-dependent | ✅ `placeholder` |

See `.env.local.example` for the full list.

## Preferred change style

- **Small, focused diffs**: one logical change per PR. Avoid refactoring unrelated code.
- **Explicit file paths**: always state which file you're changing and why.
- **No drive-by style changes**: don't reformat files you're not otherwise modifying.
- **Test your change**: run `npm run lint && npm run build` before opening a PR.
- **Prisma schema changes**: always include the corresponding migration (`npm run db:migrate`), never just `db:push` for production-destined changes.
- **Env var changes**: list any new env vars in the PR description and update `.env.local.example`.

## Vercel deployment failure workflow

When a Vercel deployment fails, the `vercel-monitor.yml` workflow automatically:
1. Fetches build logs from the Vercel API.
2. Opens a GitHub issue titled `🚨 Vercel build failed — <branch> @ <sha>` labelled `vercel-failure`.
3. Embeds the last ~20 kB of build output in the issue body.

**To get an AI-generated fix suggestion:**
1. Open the issue.
2. Post a comment containing `/fix` (exactly, or starting with `/fix`).
3. The workflow responds with a `🤖 Copilot Fix Suggestion` comment generated by GitHub Models (Copilot) — no external API key required.

The workflow deduplicates: if a recent Copilot Fix Suggestion already exists on the issue it will note that rather than flooding the thread.

To change the model used for `/fix` suggestions, edit the `MODEL_NAME` env var at the top of `.github/workflows/vercel-monitor.yml`.
