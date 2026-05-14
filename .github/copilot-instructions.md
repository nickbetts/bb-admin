# GitHub Copilot Instructions — i3media Report Platform

## Project overview

i3media Report is an internal agency platform built with **Next.js 16 (App Router) + React 19 + TypeScript + Prisma + Tailwind CSS v4**, deployed on **Vercel**. It aggregates data from 16 marketing channels (GA4, Google Ads, Meta, TikTok, Microsoft Ads, LinkedIn, Klaviyo, YouTube, HubSpot, CallRail, SemRush, Search Console, Moz, WooCommerce, Shopify, Core Web Vitals) and surfaces AI-powered insights via **OpenAI** (GPT-4o / GPT-4o-mini).

> **Coding agents available:** Specialised sub-agent instructions live in `.github/agents/`:
> - `orchestrator.agent.md` — routing tasks and orchestrating multi-step workflows across agents (@Orchestrator in chat)
> - `channel-integration.agent.md` — adding new marketing channel data integrations (@Channel Integration in chat)
> - `ai-endpoint.agent.md` — creating AI analysis API endpoints (@AI Endpoint Expert in chat)
> - `report-component.agent.md` — building dashboard/report section components (@Report Component in chat)
> - `database.agent.md` — Prisma schema changes and migrations (@Database Expert in chat)
> - `data-fetching.agent.md` — data-fetching efficiency, caching, TTLs, and cron snapshot architecture (@Data Fetching in chat)
> - `ui-ux.agent.md` — dashboard design system, shared UI primitives, and UX consistency (@UI/UX Expert in chat)
> - `landing-page.agent.md` — marketing landing page, login page copy and animations (@Landing Page in chat)
> - `agency-tools.agent.md` — keyword planner, proposals, content strategy, media plan, and all agency tools (@Agency Tools in chat)
> - `client-portal.agent.md` — client-facing portal, magic-link auth, portal dashboard and permissions (@Client Portal in chat)
> - `developer-docs.agent.md` — creating and maintaining all developer documentation (@Developer Docs in chat)

## Repository layout

```
README.md               # Concise project overview, quick start, doc links
VISION.md               # Platform vision, AI intelligence roadmap, agency operations ambition
ROADMAP.md              # Product roadmap and upcoming features
docs/
  features.md           # Full feature walkthrough, data flows, AI architecture
  architecture.md       # System architecture, database schema, project structure
  deployment.md         # Setup, environment variables, API integrations, Vercel deployment
  ai-audit.md           # AI endpoint inventory, data availability matrix, improvements
  data-audit.md         # Per-platform API capability audit across all 15 channels
src/
  app/                  # Next.js App Router pages and API routes
    api/                # ~270 API route handlers
      ai/               # 24 AI endpoints (summary, forecast, commentary, chat, audience, content-strategy, etc.)
      auth/             # Session-based auth (login/logout/session/Google OAuth)
      clients/          # Client CRUD, goals, actions, communications
      reports/          # Report CRUD, sections, PDF, share links
      tools/            # Keyword planner, proposals, page analyser, LLM gen, grand-plan, landing-pages, internal-linking
      financials/       # Client retainer and invoice management
      tasks/            # Task management + categories + time logging
      admin/            # User/role management
      settings/         # App configuration
      cron/             # Scheduled jobs (snapshots, auto-reports)
      share/            # Public share links (reports, proposals, strategy docs, grand plans)
      portal/           # Client portal API (magic-link auth, dashboards)
      clickr/           # Clickr SaaS LP builder (separate auth + billing)
      click-protection/ # Click fraud event ingestion
    clients/            # Client dashboard pages
    reports/            # Report builder and viewer pages
    tools/              # Agency tools pages (keyword planner, proposals, media plans)
    portal/             # Client self-serve portal
    settings/           # Settings UI
    admin/              # Admin UI
  components/
    dashboard/          # Per-channel section components (GA4Section, MetaSection, etc.)
    reports/            # Report builder components (ReportView, etc.)
    ui/                 # Shared UI primitives (Card, Badge, LoadingSpinner, etc.)
  lib/                  # Shared helpers
    prisma.ts           # Prisma client singleton — ALWAYS import from here
    openai-client.ts    # OpenAI client — ALWAYS use getOpenAiClient()
    auth.ts             # Session utilities (getSession, requireAuth, getSessionOrCronAuth)
    api-cache.ts        # withApiCache(key, ttlHours, fn) — wraps channel API calls
    report-blocks.ts    # SECTION_BLOCKS registry — block visibility config per section type
    ga4.ts / meta.ts / google-ads.ts / etc.   # Per-channel API helpers
prisma/
  schema.prisma         # Database schema (Postgres/Neon across all environments)
  seed.ts               # Seed script
prisma.config.ts        # Prisma CLI config — reads DIRECT_URL (preferred) then DATABASE_URL
```

## Key conventions

- **App Router only** — no `pages/` directory. All pages and API routes live under `src/app/`.
- **Client components** use `'use client'` directive; server components are the default.
- **React 19 / Next.js 16**: dynamic-route params arrive as `Promise<{...}>` — unwrap with `use(params)` in client components. Never destructure params directly.
- **OpenAI**: always call `getOpenAiClient()` from `src/lib/openai-client.ts`. Do not read `process.env.OPENAI_API_KEY` directly — the key may be stored in the DB `AppSetting` table under key `openaiApiKey`.
- **Prisma**: use the singleton from `src/lib/prisma.ts`. Never instantiate `PrismaClient` directly in route files.
- **API caching**: wrap all external channel API calls with `withApiCache(key, ttlHours, fn)` from `src/lib/api-cache.ts`.
- **Auth**: use `getSession()` for user-facing routes; `getSessionOrCronAuth(request)` for routes callable by cron jobs (also accepts `CRON_SECRET` bearer token).
- **Tailwind v4** — utility-first, no component library. Keep styles co-located with components. No inline `style={{}}`.
- **No test infrastructure** — there is currently no test runner. Validate changes with `npm run lint` and `npm run build`.
- **British English** — all AI-generated text, comments, and UI copy should use British spellings.

## Common code patterns

### Channel API route

```typescript
// src/app/api/<channel>/route.ts
export async function GET(request: NextRequest) {
  const session = await getSessionOrCronAuth(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "overview";
  const cacheKey = `<channel>:${type}:${/* dimensions */}`;

  switch (type) {
    case "overview": return NextResponse.json(await withApiCache(cacheKey, 4, () => getChannelOverview(...)));
    default: return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
```

### AI endpoint

```typescript
// src/app/api/ai/<endpoint>/route.ts
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const openai = await getOpenAiClient(); // never new OpenAI()
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: "..." }, { role: "user", content: "..." }],
    temperature: 0.65,
    max_tokens: 500,
  });
  return NextResponse.json({ result: response.choices[0]?.message?.content?.trim() ?? "" });
}
```

### Error handling in API routes

```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("<context> error:", error);
  return NextResponse.json({ error: message }, { status: 500 });
}
```

### Client-specific AI instructions

Many AI endpoints customise their prompts per client. Always check:

```typescript
const client = await prisma.client.findUnique({
  where: { id: clientId },
  select: { aiReportInstructions: true },
});
const extraInstructions = client?.aiReportInstructions ?? "";
```

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

## Preferred CLI tooling

When working in this repository, prefer these CLI tools when task-appropriate:

- `fd` for fast file discovery (instead of `find`)
- `fzf` for interactive fuzzy selection
- `bat` for readable file previews
- `jq` for JSON parsing and filtering
- `ast-grep` (`sg`) for TypeScript/TSX structural code search
- `delta` for improved git diff output
- `hyperfine` for quick command benchmarking
- `watchexec` and `entr` for file-watch workflows
- `httpie` (`http`) and `xh` for API request testing
- `semgrep` for static analysis/security scans

Notes:

- Continue to use `rg`/`ripgrep` as the primary text search tool.
- Fall back to standard alternatives only when a preferred tool is unavailable.

## CI expectations

Every PR must pass:
1. `npm run lint` — ESLint must report 0 errors.
2. `npm run build` — Next.js production build must succeed (includes `prisma generate`).

There is no separate typecheck or test step in CI. TypeScript errors surface through `next build`.

## Prisma / database notes

- **Database**: Vercel Postgres (Neon-backed). Same engine in local dev, preview, and production — prefer using a Neon **dev branch** for local work.
- **Required env vars**:
  - `DATABASE_URL` — the *pooled* connection string (Vercel exposes this as `POSTGRES_PRISMA_URL`).
  - `DIRECT_URL` — the *non-pooled* connection (Vercel exposes this as `POSTGRES_URL_NON_POOLING`). Used by Prisma migrations only.
- **CI**: uses a syntactically-valid stub Postgres URL so `prisma generate` and `next build` succeed without a real database. `prisma generate` does not connect.
- **`prisma.config.ts`** reads `DIRECT_URL` (preferred) then falls back to `DATABASE_URL` from env.
- Always run `npm run db:migrate` after changing `prisma/schema.prisma` locally. The generated migration is committed and applied to production via the `DB Migrate (Postgres)` GitHub Action.
- `scripts/prod-setup.mjs` is a thin wrapper around `prisma migrate deploy` — it is no longer the bespoke libsql migration runner it used to be.

## Environment variables

**Never commit real secrets.** Use `.env.local` (git-ignored) for local development.

| Variable | Required for prod | Can be stubbed in CI/build |
|---|---|---|
| `DATABASE_URL` | ✅ (pooled Postgres URL) | ✅ `postgresql://stub:stub@localhost:5432/stub?sslmode=disable` |
| `DIRECT_URL` | ✅ (non-pooled Postgres URL) | ✅ same stub as above |
| `SESSION_SECRET` | ✅ | ✅ any random string |
| `NEXTAUTH_SECRET` | ✅ | ✅ any random string |
| `BLOB_READ_WRITE_TOKEN` | ✅ | ✅ `vercel_blob_rw_placeholder` |
| `OPENAI_API_KEY` | ✅ | ✅ `placeholder` (AI features won't work) |
| `SEMRUSH_API_KEY` | ✅ | ✅ `placeholder` |
| `GA4_CLIENT_EMAIL` | ✅ | ✅ `placeholder` |
| `GA4_PRIVATE_KEY` | ✅ | ✅ `placeholder` |
| `META_ACCESS_TOKEN` | ✅ | ✅ `placeholder` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | ✅ `placeholder` |
| `GOOGLE_ADS_DEVELOPER_TOKEN` / `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` / `GOOGLE_ADS_REFRESH_TOKEN` | ✅ | ✅ `placeholder` |
| `GOOGLE_ADS_MANAGER_CUSTOMER_ID` | ✅ | ✅ `placeholder` |
| `GOOGLE_API_KEY` | ✅ (YouTube) | ✅ `placeholder` |
| `GOOGLE_CRUX_API_KEY` | ✅ (Core Web Vitals) | ✅ `placeholder` |
| `MICROSOFT_ADS_CLIENT_ID` / `MICROSOFT_ADS_CLIENT_SECRET` / `MICROSOFT_ADS_DEVELOPER_TOKEN` / `MICROSOFT_ADS_REFRESH_TOKEN` | channel-dependent | ✅ `placeholder` |
| `MICROSOFT_ADS_CUSTOMER_ID` | channel-dependent | ✅ `placeholder` |
| `TIKTOK_ACCESS_TOKEN` | channel-dependent | ✅ `placeholder` |
| `MOZ_ACCESS_ID` / `MOZ_SECRET_KEY` | channel-dependent | ✅ `placeholder` |
| `MS365_CLIENT_ID` / `MS365_CLIENT_SECRET` / `MS365_TENANT_ID` | ✅ (email notifications) | ✅ `placeholder` |
| `CRON_SECRET` | ✅ | ✅ `placeholder` |
| `APP_PASSWORD` | ✅ (legacy login) | ✅ `placeholder` |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ `http://localhost:3000` |

See `.env.local.example` for the full list and documentation.

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
