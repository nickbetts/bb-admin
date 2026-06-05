# Deployment & Setup Guide — Betts & Burton Report Platform

Everything needed to get the Betts & Burton Report platform running locally, configure all 15 channel integrations, and deploy to production on Vercel. For architecture details see [docs/architecture.md](architecture.md); for the full feature reference see [docs/features.md](features.md).

---

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Configuring API Integrations](#configuring-api-integrations)
- [Scripts Reference](#scripts-reference)
- [Deployment](#deployment)
  - [Deploying to Vercel](#deploying-to-vercel)
  - [CI/CD](#cicd)
  - [Cron Jobs](#cron-jobs)
  - [Vercel Build Failure Workflow](#vercel-build-failure-workflow)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **Node.js 20+** (recommended; 18+ minimum)
- **npm** (included with Node.js)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd bettsandburton-report

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

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```env
# ─── Database (Vercel Postgres / Neon) ──────────────────────────────
# Pulled from Vercel via `npm run vercel:env:pull` after attaching Postgres.
# DATABASE_URL must be the *pooled* connection string (POSTGRES_PRISMA_URL).
# DIRECT_URL must be the *non-pooled* connection (POSTGRES_URL_NON_POOLING) and
# is used by Prisma migrations only.
DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require"

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

### CI / build stubs

For CI or build environments where you don't need real API access, every variable can be stubbed. See the full table in [`.github/copilot-instructions.md`](../.github/copilot-instructions.md#environment-variables).

| Variable                | CI stub value                                                |
| ----------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`          | `postgresql://stub:stub@localhost:5432/stub?sslmode=disable` |
| `DIRECT_URL`            | `postgresql://stub:stub@localhost:5432/stub?sslmode=disable` |
| `SESSION_SECRET`        | any random string                                            |
| `BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_placeholder`                                 |
| `OPENAI_API_KEY`        | `placeholder`                                                |
| All other API keys      | `placeholder`                                                |

---

## Configuring API Integrations

### SemRush

1. Get your API key from [SemRush API](https://www.semrush.com/api-analytics/)
2. Add `SEMRUSH_API_KEY` to `.env.local`
3. Per client: set the **SemRush Domain** (and optionally a **Project ID**) in client settings

### Google Analytics 4 & Search Console (Service Account)

Both share the same service account credentials:

1. Create a service account in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Analytics Data API** and **Search Console API**
3. Download the JSON key file
4. Grant the service account **Viewer** access to GA4 properties and **User** in Search Console
5. Add `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY` to `.env.local`
6. Per client: select the **GA4 Property** and **Search Console Site** in client settings

### Google Ads (OAuth2)

**Option A — In-app OAuth (recommended):**

1. Create OAuth 2.0 Web Application credentials in Google Cloud Console
2. Set redirect URI to `https://<your-domain>/api/auth/google-ads/callback`
3. Add `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN` to env
4. In-app: Settings → Google Connections → Connect Google Account

**Option B — Environment variable:**

```bash
node scripts/get-gads-refresh-token.mjs
# Copy the printed token to GOOGLE_ADS_REFRESH_TOKEN in .env.local
```

### Meta Ads

1. Create a [Meta System User](https://business.facebook.com/settings/system-users) with `ads_read` permission
2. Generate a long-lived access token (use `scripts/get-meta-long-lived-token.mjs` to exchange)
3. Add `META_ACCESS_TOKEN` to `.env.local` (or set per-client tokens in client settings)

### TikTok Ads

Per client in client settings: set **TikTok Advertiser ID** and **Access Token** from the TikTok Marketing API. Optionally set `TIKTOK_ACCESS_TOKEN` as a global fallback.

### Microsoft Advertising

1. Create an app registration in [Microsoft Azure portal](https://portal.azure.com)
2. Add `MICROSOFT_ADS_CLIENT_ID`, `MICROSOFT_ADS_CLIENT_SECRET`, `MICROSOFT_ADS_DEVELOPER_TOKEN` to env
3. Generate a refresh token and add as `MICROSOFT_ADS_REFRESH_TOKEN`
4. Per client: set the **Microsoft Ads Account ID** in client settings

### LinkedIn Ads

Per client in client settings: set **LinkedIn Account ID** and **Access Token** from LinkedIn Marketing Solutions.

### Klaviyo

Per client in client settings: set the **Klaviyo Private API Key** from your Klaviyo account settings.

### YouTube Analytics

Per client in client settings: set the **YouTube Channel ID**. Uses the same service account credentials as GA4/GSC (must have YouTube Data API v3 enabled).

### HubSpot CRM

Per client in client settings: set the **HubSpot Portal ID** and a **Private App Access Token** with `crm.objects.contacts.read` and `crm.objects.deals.read` scopes.

### CallRail

Per client in client settings: set the **CallRail Account ID** and **API Key** from your CallRail account.

### Core Web Vitals

1. Enable the **Chrome UX Report API** in Google Cloud Console
2. Create or reuse an API key and add as `GOOGLE_CRUX_API_KEY`
3. Per client: optionally set a custom **CWV URL** to override the website URL

### OpenAI

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Either add `OPENAI_API_KEY` to `.env.local` or enter via Settings page (DB-stored, takes priority)

### Moz (Domain Authority)

1. Get API credentials from [Moz](https://moz.com/products/api)
2. Add `MOZ_ACCESS_ID` and `MOZ_SECRET_KEY` to `.env.local`

### WooCommerce

Per client in client settings: set **WooCommerce URL**, **Consumer Key**, and **Consumer Secret** (generated in WooCommerce → Settings → Advanced → REST API)

### Shopify

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
node scripts/prod-setup.mjs                # Run `prisma migrate deploy` against production Postgres
```

---

## Deployment

### Deploying to Vercel

#### 1. Provision Vercel Postgres (Neon)

In the Vercel dashboard: **Storage → Create → Neon Postgres** → attach to the `bettsandburton-report` project. Vercel auto-injects `POSTGRES_URL`, `POSTGRES_PRISMA_URL` (pooled) and `POSTGRES_URL_NON_POOLING` (direct) into all environments.

For local development, create a Neon **dev branch** from the Vercel UI and use that connection string in your `.env.local` so you don't touch production data while developing.

#### 2. Run migrations against Postgres

```bash
# Locally, one-off after provisioning:
DATABASE_URL="$POSTGRES_PRISMA_URL" \
DIRECT_URL="$POSTGRES_URL_NON_POOLING" \
npx prisma migrate deploy
```

Subsequent migrations are applied automatically by the `DB Migrate (Postgres)` GitHub Action whenever a new migration is committed.

#### 3. Add Vercel Blob storage

In your Vercel project dashboard: **Storage → Create → Blob**. Vercel auto-adds `BLOB_READ_WRITE_TOKEN`.

#### 4. Connect GitHub repo to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new) — Vercel detects Next.js automatically
3. Add environment variables in Vercel dashboard:

| Variable                        | Value                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                  | `POSTGRES_PRISMA_URL` (pooled, auto-set by Vercel Postgres)                                            |
| `DIRECT_URL`                    | `POSTGRES_URL_NON_POOLING` (direct, auto-set by Vercel Postgres)                                       |
| `APP_PASSWORD`                  | Strong password                                                                                        |
| `SESSION_SECRET`                | `openssl rand -base64 32`                                                                              |
| `BLOB_READ_WRITE_TOKEN`         | _(auto-set by Vercel Blob)_                                                                            |
| `JINA_API_KEY`                  | Optional — Jina.ai Reader key for JS-challenge page fallback. Anonymous calls work up to ~200 req/day. |
| `SEMRUSH_API_KEY`               | Your key                                                                                               |
| `GA4_CLIENT_EMAIL`              | Service account email                                                                                  |
| `GA4_PRIVATE_KEY`               | Service account private key                                                                            |
| `GOOGLE_ADS_CLIENT_ID`          | OAuth client ID                                                                                        |
| `GOOGLE_ADS_CLIENT_SECRET`      | OAuth client secret                                                                                    |
| `GOOGLE_ADS_DEVELOPER_TOKEN`    | Developer token                                                                                        |
| `META_ACCESS_TOKEN`             | Meta access token                                                                                      |
| `OPENAI_API_KEY`                | OpenAI key _(or set in Settings UI)_                                                                   |
| `TIKTOK_ACCESS_TOKEN`           | TikTok Ads global access token _(optional — or per-client)_                                            |
| `MICROSOFT_ADS_CLIENT_ID`       | Microsoft Ads OAuth app client ID                                                                      |
| `MICROSOFT_ADS_CLIENT_SECRET`   | Microsoft Ads OAuth client secret                                                                      |
| `MICROSOFT_ADS_REFRESH_TOKEN`   | Microsoft Ads OAuth refresh token                                                                      |
| `MICROSOFT_ADS_DEVELOPER_TOKEN` | Microsoft Advertising developer token                                                                  |
| `GOOGLE_CRUX_API_KEY`           | Google CrUX API key for Core Web Vitals                                                                |
| `MOZ_ACCESS_ID`                 | Moz API access ID _(optional)_                                                                         |
| `MOZ_SECRET_KEY`                | Moz API secret key _(optional)_                                                                        |
| `CRON_SECRET`                   | Secret for securing `/api/cron/*` endpoints                                                            |

> **Per-client integrations:** LinkedIn Ads, Klaviyo, YouTube Analytics, HubSpot CRM, and CallRail all use per-client credentials stored in the database. Configure them in each client's settings page — no global environment variables needed.

4. Deploy. Subsequent pushes to `main` deploy automatically.

### CI/CD

`.github/workflows/ci.yml` runs on every push and PR to `main`:

- **Node.js 20** environment
- `npm ci` → `npm run lint` → `npm run build`

Vercel's GitHub integration handles production deployments separately.

Every PR must pass:

1. `npm run lint` — ESLint must report 0 errors.
2. `npm run build` — Next.js production build must succeed (includes `prisma generate`).

There is no separate typecheck or test step in CI. TypeScript errors surface through `next build`.

### Cron Jobs

Two Vercel cron jobs are configured in `vercel.json`:

| Path                  | Schedule                       | Purpose                                                              |
| --------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `/api/cron/snapshots` | Daily at 2:00 UTC              | Pull metric data for all clients and upsert `MetricSnapshot` records |
| `/api/cron/reports`   | Monthly on the 1st at 6:00 UTC | Auto-generate reports for clients with a `reportSchedule` configured |

Both endpoints require an `Authorization: Bearer <CRON_SECRET>` header when `CRON_SECRET` is set.

### Vercel Build Failure Workflow

When a Vercel deployment fails, the `vercel-monitor.yml` GitHub Actions workflow automatically:

1. Fetches build logs from the Vercel API.
2. Opens a GitHub issue titled `🚨 Vercel build failed — <branch> @ <sha>` labelled `vercel-failure`.
3. Embeds the last ~20 kB of build output in the issue body.

**To get an AI-generated fix suggestion:**

1. Open the issue.
2. Post a comment containing `/fix` (exactly, or starting with `/fix`).
3. The workflow responds with a `🤖 Copilot Fix Suggestion` comment generated by GitHub Models — no external API key required.

The workflow deduplicates: if a recent Copilot Fix Suggestion already exists on the issue it will note that rather than flooding the thread. To change the model used for `/fix` suggestions, edit the `MODEL_NAME` env var at the top of `.github/workflows/vercel-monitor.yml`.

---

## Troubleshooting

### "Can't reach database server" / Postgres connection errors

This means `DATABASE_URL` is not set, or is still pointing at an old (Turso/SQLite) value, in Vercel. Verify the value is the Vercel Postgres pooled URL.

```bash
# Fix via Vercel CLI
npm run vercel:link
vercel env add DATABASE_URL production     # paste: $POSTGRES_PRISMA_URL
vercel env add DIRECT_URL production       # paste: $POSTGRES_URL_NON_POOLING
npm run vercel:deploy
```

Or set them in the Vercel dashboard under **Settings → Environment Variables** and trigger a redeploy.

### Prisma generate fails in CI

Ensure `DATABASE_URL=file:dev.db` is set in the CI environment. The Prisma CLI config (`prisma.config.ts`) falls back to `file:./dev.db` but some environments require it explicitly.

### Google Ads "DEVELOPER_TOKEN_NOT_APPROVED"

Your Google Ads developer token may still be in test mode. Apply for basic access in the Google Ads API Centre. Test tokens only work against accounts explicitly listed in the MCC.

### Meta token expired

Long-lived Meta tokens last 60 days. Re-run the exchange script to refresh:

```bash
node scripts/get-meta-long-lived-token.mjs
```

Update `META_ACCESS_TOKEN` in `.env.local` and Vercel.

### PDF export times out on Vercel

The PDF endpoint uses Puppeteer with `@sparticuz/chromium-min`. Ensure:

- The Vercel function timeout is set high enough (configured in `vercel.json`).
- The `next.config.ts` externals include `puppeteer-core` and `@sparticuz/chromium-min`.

### Cron jobs not firing

- Verify `vercel.json` contains the cron configuration.
- Check the Vercel dashboard under **Settings → Cron Jobs** to see scheduled runs.
- Ensure `CRON_SECRET` is set in Vercel env vars — the endpoints reject unauthenticated requests.

### Build succeeds locally but fails on Vercel

Common causes:

- Missing environment variables — check the Vercel dashboard has all required vars.
- Case-sensitive file imports — macOS is case-insensitive, Linux (Vercel) is not.
- Run `npm run build` locally with the same env var stubs as CI to reproduce.

---

_Last updated: April 2026_
