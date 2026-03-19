# i3media Report — Client Performance Dashboard

A full-stack performance reporting dashboard for digital marketing agencies. Combines **GA4**, **Google Search Console**, **Google Ads**, **SemRush** and **Meta Ads** data into a single branded client dashboard, with **OpenAI-powered AI insights**, **automated anomaly detection**, commentary and PDF export.

![Dashboard](https://github.com/user-attachments/assets/5d343e9c-f7f2-4c26-83e9-33805b101d72)

---

## Features

- 🔐 **Authentication** — Password-protected login with signed, HMAC-verified session cookies
- 👥 **Multi-client management** — Add and configure unlimited clients
- 📊 **SemRush integration** — Domain overview, keyword rankings, traffic trends, position distribution
- 📈 **Google Analytics 4** — Sessions, users, bounce rate, traffic sources, top pages
- 🔍 **Google Search Console** — Clicks, impressions, CTR, average position, top queries and pages
- 💰 **Google Ads** — Spend, impressions, clicks, CTR, CPC, conversions, ROAS, campaign & ad-group breakdowns
- 📣 **Meta Ads** — Spend, impressions, CTR, ROAS, campaign breakdown
- 🤖 **AI Insights** — OpenAI GPT-4o mini generates executive summaries, key insights and actionable recommendations for every data section
- ⚠️ **Anomaly Detection** — Automatic server-side detection of significant metric changes vs the previous period, surfaced inline alongside the AI analysis
- 💬 **Commentary** — Add analyst notes to each section of a report; AI-generated text can be inserted with one click
- 📸 **Screenshot uploads** — Attach additional visuals to reports (stored on Vercel Blob)
- 📄 **PDF export** — One-click branded PDF generation
- ⚙️ **Settings page** — Manage your OpenAI API key and Google OAuth connections in-app
- 🌙 **Dark professional theme** — Agency-ready dark UI with i3media branding

---

## How AI Insights & Anomaly Detection Work

### Anomaly Detection

Anomaly detection runs entirely **server-side** inside `/api/ai/summary` before the OpenAI call is even made. It compares the current period's metrics against the previous period using this logic:

1. **For each metric**, the percentage change vs the previous period is calculated:
   `changePct = ((current - previous) / |previous|) × 100`
2. Changes **below 10%** are ignored as normal fluctuation.
3. The metric is classified as **good** or **bad** based on its direction and type:
   - *Higher-is-better* metrics (e.g. sessions, conversions, ROAS) — an increase is good; a decrease is bad.
   - *Lower-is-better* metrics (e.g. bounce rate, CPC, CPA) — a decrease is good; an increase is bad.
4. An anomaly is surfaced if:
   - The change is **bad** and ≥ 15%, or
   - The change is **notably good** and ≥ 30%
5. Severity is assigned:
   - 🔴 **High** — ≥ 50% change
   - 🟡 **Medium** — 25–49% change
   - 🔵 **Low** — 10–24% change (bad-direction) or 30–49% change (good-direction)
6. Anomalies are sorted by severity (high first) and included in the payload sent to OpenAI so the AI can comment on them, and displayed as labelled cards in the UI.

Each channel has its own metric config (GA4, Google Ads, Meta Ads, SemRush SEO, Search Console) defining which metrics are higher-is-better vs lower-is-better and their human-readable labels.

### AI Summaries

Once anomalies are detected, the `/api/ai/summary` endpoint calls **OpenAI's `gpt-4o-mini` model** with a structured prompt:

- A **system prompt** instructs the model to act as an expert digital marketing analyst, use British English, and write punchy, specific, actionable copy.
- A **user prompt** provides:
  - The channel name and date range
  - All current-period metric values
  - Previous-period metric values (if available)
  - The list of detected anomalies
- The model responds with a **JSON object** containing:
  - `summary` — a 2–3 sentence executive overview
  - `insights` — 3–4 specific, data-driven observations
  - `recommendations` — 2–3 actionable next steps
- The response uses `response_format: { type: "json_object" }` and `temperature: 0.4` for consistent, factual output.

The OpenAI API key is read first from the **Settings → OpenAI API Key** field (stored in the `AppSetting` database table) and falls back to the `OPENAI_API_KEY` environment variable. If neither is set, the panel shows a clear error message directing the user to the Settings page.

### In the UI

Every dashboard section (GA4, Search Console, Google Ads, Meta Ads, SemRush) includes an **AI Insights panel** (`components/ai/AiInsightsPanel.tsx`). The panel:

- Shows a **"Generate Insights"** button — analysis is only triggered on demand, not automatically.
- Displays a loading skeleton while the API call is in progress.
- Renders **anomaly cards** with severity badges and direction arrows.
- Lists **key insights** and **recommendations** from the AI.
- In **compact mode** (used inside report sections), renders a single "Generate AI Commentary" button. When clicked, the formatted summary text is passed back to the parent to pre-fill the commentary field.

---

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Prisma v7 + LibSQL** (SQLite locally, Turso in production) for database
- **OpenAI `gpt-4o-mini`** for AI summaries and insights
- **Vercel Blob** for screenshot file storage
- **Recharts** for data visualisation
- **jsPDF + html2canvas** for PDF export
- **Google Auth Library** for GA4, Search Console and Google Ads OAuth
- **Axios** for HTTP requests to external APIs

---

## Getting Started

### Prerequisites

- Node.js 18+
- A SemRush API key (for SEO data)
- Optionally: GA4 / Search Console service account credentials, Google Ads OAuth credentials, Meta Ads access token, OpenAI API key

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys and secrets

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the password set in `APP_PASSWORD` (defaults to the value in `.env.local.example` — **change this before going to production**).

> ⚠️ **Set a strong `APP_PASSWORD` and `SESSION_SECRET` before deploying to production.**

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```env
# ─── Database ────────────────────────────────────────────────────────────────
# Local development (SQLite file)
DATABASE_URL="file:dev.db"

# Production (Turso — https://turso.tech)
# DATABASE_URL="libsql://<your-db-name>.turso.io"
# TURSO_AUTH_TOKEN="<your-turso-auth-token>"

# ─── Auth ────────────────────────────────────────────────────────────────────
# Single shared password to access the app
APP_PASSWORD="your-strong-password"
# Secret used to sign session tokens (generate with: openssl rand -base64 32)
SESSION_SECRET="your-session-secret"

# ─── Vercel Blob (screenshot uploads) ────────────────────────────────────────
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# ─── SemRush ─────────────────────────────────────────────────────────────────
SEMRUSH_API_KEY="your-semrush-api-key"

# ─── Google (GA4, Search Console & Google Ads) ───────────────────────────────
# Service account — used for GA4 and Search Console
GA4_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Google Ads OAuth2 credentials (from Google Cloud Console)
GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
# Optional: hard-code a refresh token instead of using in-app OAuth
GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
# Optional: MCC / manager account customer ID
GOOGLE_ADS_MANAGER_CUSTOMER_ID="123-456-7890"

# ─── Meta Ads ────────────────────────────────────────────────────────────────
META_ACCESS_TOKEN="your-meta-access-token"

# ─── OpenAI (AI Insights & Anomaly Detection) ────────────────────────────────
# Can also be set via Settings → OpenAI API Key in the app UI
OPENAI_API_KEY="sk-..."
```

### Configuring API Integrations

#### SemRush
1. Get your API key from [SemRush API](https://www.semrush.com/api-analytics/).
2. Add `SEMRUSH_API_KEY` to `.env.local`.
3. For each client, set the **SemRush Domain** in client settings.

#### Google Analytics 4 & Search Console (Service Account)
Both GA4 and Search Console share the same Google service account credentials.

1. Create a service account in [Google Cloud Console](https://console.cloud.google.com) and enable the **Google Analytics Data API** and **Search Console API**.
2. Download the JSON key file for the service account.
3. Grant the service account **Viewer** access to your GA4 property and verify ownership (or add as a user) in Google Search Console.
4. Add `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY` (the `private_key` field from the JSON file, with newlines as `\n`) to `.env.local`.
5. For each client, set the **GA4 Property ID** and **Search Console Site URL** in client settings.

#### Google Ads (OAuth2)
Google Ads uses OAuth2 and supports two connection methods:

**Option A — In-app OAuth (recommended for production):**
1. Create an OAuth 2.0 Web Application credential in [Google Cloud Console](https://console.cloud.google.com) with `https://<your-domain>/api/auth/google-ads/callback` as an authorised redirect URI.
2. Set `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, and `GOOGLE_ADS_DEVELOPER_TOKEN` in your environment.
3. In the app, go to **Settings → Google Connections** and click **Connect Google Account** to complete the OAuth flow. Refresh tokens are stored in the database and can manage multiple accounts.

**Option B — Environment variable refresh token:**
1. Run the one-off helper script to generate a refresh token locally (requires `GOOGLE_ADS_CLIENT_ID` and `GOOGLE_ADS_CLIENT_SECRET` to be set in your environment first):
   ```bash
   node scripts/get-gads-refresh-token.mjs
   ```
2. Copy the printed refresh token and add it as `GOOGLE_ADS_REFRESH_TOKEN` in `.env.local`.

For each client, set the **Google Ads Customer ID** in client settings (use the account picker to select from connected accounts).

#### Meta Ads
1. Create a [Meta System User](https://business.facebook.com/settings/system-users) in Business Manager.
2. Generate a permanent access token with `ads_read` permission.
3. Add `META_ACCESS_TOKEN` to `.env.local` (applies to all clients) or set a per-client token in client settings.
4. For each client, set the **Meta Ad Account ID** in client settings.

#### OpenAI (AI Insights)
1. Get an API key from [platform.openai.com](https://platform.openai.com).
2. Either add `OPENAI_API_KEY` to `.env.local`, **or** enter the key in the app under **Settings → OpenAI API Key** (stored in the database, takes priority over the env var).
3. No per-client configuration is required — AI insights are available on every section once a key is set.

---

## Usage

### 1. Add a Client

Go to **Clients → Add Client** and fill in:
- Client name and website
- SemRush domain (e.g. `acme.com`)
- GA4 Property ID (e.g. `properties/123456789`)
- Search Console site URL (e.g. `https://acme.com/`)
- Meta Ads account ID and (optionally) a per-client access token
- Google Ads customer ID (select from connected accounts)

### 2. View the Dashboard

Click on any client to open the live performance dashboard. Use the tab bar to switch between configured channels:

- **SEO / SemRush** — keyword rankings, traffic trends, position distribution
- **Web Analytics (GA4)** — sessions, users, traffic sources, top pages
- **Search Console** — clicks, impressions, CTR, position, top queries and pages
- **Paid Social (Meta)** — spend, ROAS, impressions, campaign performance
- **Paid Search (Google Ads)** — spend, clicks, conversions, ROAS, campaign & ad-group breakdown

Use the **7d / 30d / 90d / 6m / Custom** period pills to filter data. Tabs for unconfigured integrations are automatically disabled.

### 3. Generate AI Insights

In any dashboard section, click **Generate Insights** in the AI Insights panel. The panel will:
1. Send the current metrics (and previous-period metrics for comparison) to `/api/ai/summary`.
2. Run server-side anomaly detection and highlight significant metric changes.
3. Display an AI-written executive summary, key insights, and recommendations — all in seconds.

### 4. Create a Report

Click **New Report** on a client page, set the title and date range, and a report is created with the live data from all configured integrations.

### 5. Add Commentary

Each report section has an **Add commentary** button. You can type notes manually, or click **Generate AI Commentary** to auto-fill the field with the AI-generated text for that section.

### 6. Upload Screenshots

Click **Upload Screenshot** in the report view to attach additional visuals (e.g. Google Search Console charts, creative previews). Files are stored on Vercel Blob.

### 7. Export to PDF

Click **Export PDF** to generate a branded PDF report ready to share with the client. The PDF includes:
- i3media branding header
- All live data visualisations
- Analyst commentary
- Uploaded screenshots
- i3media footer with date

---

## App Settings

Go to **Settings** in the sidebar to manage:

- **OpenAI API Key** — enter your key here to enable AI Insights and anomaly detection. This is saved in the database and takes priority over the `OPENAI_API_KEY` environment variable.
- **Google Connections** — connect one or more Google accounts via OAuth to power **Google Ads** data. Multiple accounts can be connected to support multiple clients or MCC structures. Connections can be removed individually. Note: Search Console uses the service account credentials (`GA4_CLIENT_EMAIL` / `GA4_PRIVATE_KEY`) rather than the in-app OAuth connections.

---

## Scripts

```bash
npm run dev               # Start development server
npm run build             # Generate Prisma client and build for production
npm run start             # Start production server
npm run lint              # Run ESLint
npm run db:migrate        # Run Prisma migrations
npm run db:seed           # Seed the database (creates default admin password)
npm run db:reset          # Reset and re-run all migrations
npm run vercel:link       # Link repo to Vercel project
npm run vercel:env:pull   # Pull Vercel env vars into .env.local
npm run vercel:deploy     # Deploy to production

# One-off helpers
node scripts/get-gads-refresh-token.mjs   # Generate a Google Ads OAuth refresh token locally
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/summary/       # AI insights + anomaly detection endpoint
│   │   ├── auth/             # Login, logout, session, Google OAuth
│   │   ├── clients/          # CRUD for clients
│   │   ├── ga4/              # GA4 data + property discovery
│   │   ├── google-ads/       # Google Ads data + account discovery
│   │   ├── meta/             # Meta Ads data + account discovery
│   │   ├── reports/          # Reports, sections, screenshots
│   │   ├── search-console/   # Search Console data + site discovery
│   │   ├── semrush/          # SemRush data + project discovery
│   │   └── settings/         # App settings + Google connections
│   ├── clients/              # Client list, detail, settings, new report
│   ├── dashboard/            # Main dashboard home
│   ├── login/                # Login page
│   ├── reports/              # Reports list and detail
│   └── settings/             # Settings page
├── components/
│   ├── ai/                   # AiInsightsPanel (insights, anomalies, recommendations)
│   ├── clients/              # ClientSettingsForm
│   ├── dashboard/            # ClientDashboard, SemrushSection, GA4Section,
│   │                         #   GoogleAdsSection, MetaSection, SearchConsoleSection
│   ├── layout/               # Sidebar navigation
│   ├── reports/              # ReportView with PDF export
│   └── ui/                   # MetricCard, SectionCard, Badge, LoadingSpinner
├── lib/
│   ├── auth.ts               # Session management (HMAC-signed cookies)
│   ├── ga4.ts                # GA4 API client (service account)
│   ├── google-ads.ts         # Google Ads API client (OAuth2 / GAQL)
│   ├── google-auth.ts        # Shared Google OAuth2 token refresh helper
│   ├── meta.ts               # Meta Ads API client
│   ├── prisma.ts             # Prisma client singleton (LibSQL adapter)
│   ├── search-console.ts     # Search Console API client (service account)
│   ├── semrush.ts            # SemRush API client
│   └── utils.ts              # Formatters and date helpers
prisma/
├── schema.prisma             # Database schema
├── migrations/               # SQL migrations
└── seed.ts                   # Database seeder
scripts/
└── get-gads-refresh-token.mjs  # One-off Google Ads refresh token generator
docs/
└── google-ads-api-design-document.html  # Google Ads API design & compliance doc
```

---

## Deploying to Vercel

### 1. Create a Turso database

[Turso](https://turso.tech) is a cloud SQLite service fully compatible with the LibSQL adapter used in this project.

```bash
# Install the Turso CLI and log in
brew install tursodatabase/tap/turso
turso auth login

# Create a database and get credentials
turso db create i3media-report
turso db show i3media-report          # copy the URL
turso db tokens create i3media-report # copy the auth token
```

### 2. Run database migrations against Turso

```bash
DATABASE_URL="libsql://<your-db>.turso.io" \
TURSO_AUTH_TOKEN="<your-auth-token>" \
npx prisma migrate deploy
```

### 3. Add Vercel Blob storage

In your Vercel project dashboard go to **Storage → Create → Blob** and follow the prompts. Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your project's environment variables.

### 4. Connect the GitHub repo to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel detects Next.js automatically — keep the default build settings.
4. Add the following **Environment Variables** in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `libsql://<your-db>.turso.io` |
| `TURSO_AUTH_TOKEN` | `<your-auth-token>` |
| `APP_PASSWORD` | your chosen app password |
| `SESSION_SECRET` | a long random string (`openssl rand -base64 32`) |
| `BLOB_READ_WRITE_TOKEN` | *(auto-set by Vercel Blob)* |
| `SEMRUSH_API_KEY` | `<your-key>` |
| `GA4_CLIENT_EMAIL` | service account email |
| `GA4_PRIVATE_KEY` | service account private key |
| `GOOGLE_ADS_CLIENT_ID` | OAuth client ID |
| `GOOGLE_ADS_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads developer token |
| `META_ACCESS_TOKEN` | `<your-token>` |
| `OPENAI_API_KEY` | `<your-key>` *(or set in Settings UI)* |

5. Click **Deploy**. Subsequent pushes to the `main` branch will deploy automatically.

### Auto-deployments (CI)

The included `.github/workflows/ci.yml` workflow runs `eslint` and `next build` on every push and pull request, catching issues before they reach production. Vercel's own GitHub integration handles the actual deployment — no extra configuration is needed.

### Troubleshooting: "Unable to open connection to local database dev.db"

If you see this error in the Vercel logs after deploying, it means `DATABASE_URL` is not set to a remote Turso URL in your Vercel project. Serverless functions cannot access local SQLite files.

Fix it using the Vercel CLI (included as a dev dependency — run `npm install` first):

```bash
# 1. Link this repo to your Vercel project (one-off)
npm run vercel:link

# 2. Add the env vars to production
vercel env add DATABASE_URL production     # paste: libsql://<your-db>.turso.io
vercel env add TURSO_AUTH_TOKEN production # paste: <your-auth-token>

# 3. Redeploy
npm run vercel:deploy
```

Or set them manually in the Vercel dashboard under **Settings → Environment Variables**, then trigger a redeploy.
