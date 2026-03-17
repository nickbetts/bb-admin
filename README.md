# i3media Report — Client Performance Dashboard

A full-stack performance reporting dashboard for digital marketing agencies. Combines **GA4**, **SemRush** and **Meta Ads** data into a single branded client dashboard with commentary and PDF export.

![Dashboard](https://github.com/user-attachments/assets/5d343e9c-f7f2-4c26-83e9-33805b101d72)

---

## Features

- 🔐 **Authentication** — Secure email/password login with session cookies
- 👥 **Multi-client management** — Add and configure unlimited clients
- 📊 **SemRush integration** — Domain overview, keyword rankings, traffic trends, position distribution
- 📈 **Google Analytics 4** — Sessions, users, bounce rate, traffic sources, top pages
- 📣 **Meta Ads** — Spend, impressions, CTR, ROAS, campaign breakdown
- 💬 **Commentary** — Add analyst notes to each section of a report
- 📸 **Screenshot uploads** — Attach additional visuals to reports
- 📄 **PDF export** — One-click branded PDF generation
- 🌙 **Dark professional theme** — Agency-ready dark UI with i3media branding

---

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Prisma v7 + LibSQL** (SQLite locally, Turso in production) for database
- **Vercel Blob** for screenshot file storage
- **Recharts** for data visualisation
- **jsPDF + html2canvas** for PDF export
- **bcryptjs** for password hashing

---

## Getting Started

### Prerequisites

- Node.js 18+
- A SemRush API key (required for SEO data)
- Optionally: GA4 access token and Meta Ads credentials

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Run database migrations
npx prisma migrate dev

# Seed the database with default admin user
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:

| Email | Password |
|-------|----------|
| `admin@i3media.co.uk` | `admin123` |

> ⚠️ **Change the admin password after first login in production!**

---

## Environment Variables

Create a `.env.local` file with these variables:

```env
# Database
DATABASE_URL="file:dev.db"

# Auth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# SemRush API key (from semrush.com/api)
SEMRUSH_API_KEY="your-semrush-api-key"

# Google Analytics 4 (service account or OAuth access token)
GA4_ACCESS_TOKEN="your-ga4-access-token"

# Meta Ads (from Meta Business Manager → System Users)
META_ACCESS_TOKEN="your-meta-access-token"
```

### Configuring API Integrations

#### SemRush
1. Get your API key from [SemRush API](https://www.semrush.com/api-analytics/)
2. Add `SEMRUSH_API_KEY` to `.env.local`
3. For each client, set the **SemRush Domain** in client settings

#### Google Analytics 4
1. Create a service account in [Google Cloud Console](https://console.cloud.google.com)
2. Grant the service account **Viewer** access to your GA4 property
3. Generate an access token using the service account credentials
4. Add `GA4_ACCESS_TOKEN` to `.env.local`
5. For each client, set the **GA4 Property ID** in client settings

#### Meta Ads
1. Create a [Meta System User](https://business.facebook.com/settings/system-users) in Business Manager
2. Generate a permanent access token
3. Add `META_ACCESS_TOKEN` to `.env.local` or set per-client in settings
4. For each client, set the **Meta Ad Account ID** in client settings

---

## Usage

### 1. Add a Client

Go to **Clients → Add Client** and fill in:
- Client name and website
- SemRush domain (e.g. `acme.com`)
- GA4 Property ID
- Meta Ads account ID and access token

### 2. View the Dashboard

Click on any client to see their live performance dashboard across all configured integrations. Switch between:
- **SEO / SemRush** — keyword rankings, traffic trends
- **Web Analytics (GA4)** — sessions, users, traffic sources
- **Paid Social (Meta)** — spend, ROAS, campaign performance

### 3. Create a Report

Click **New Report** on a client page, set the title and period, and a report is automatically created with the live data from all integrations.

### 4. Add Commentary

Each report section has an **Add commentary** button. Click it to add analyst insights and key takeaways for that section.

### 5. Upload Screenshots

Click **Upload Screenshot** in the report view to add additional visuals (e.g. Google Search Console data, creative performance screenshots).

### 6. Export to PDF

Click **Export PDF** to generate a branded PDF report ready to share with the client. The PDF includes:
- i3media branding header
- All live data visualisations
- Your commentary
- Uploaded screenshots
- i3media footer with date

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed the database
npm run db:reset     # Reset and re-run all migrations
```

---

## Project Structure

```
src/
├── app/
│   ├── api/            # API routes (auth, clients, reports, semrush, ga4, meta)
│   ├── clients/        # Client list, detail, settings, new report
│   ├── dashboard/      # Main dashboard home
│   ├── login/          # Login page
│   └── reports/        # Reports list and detail
├── components/
│   ├── clients/        # Client settings form
│   ├── dashboard/      # SemrushSection, GA4Section, MetaSection, ClientDashboard
│   ├── layout/         # Sidebar navigation
│   ├── reports/        # ReportView with PDF export
│   └── ui/             # MetricCard, SectionCard, Badge, LoadingSpinner
├── lib/
│   ├── auth.ts         # Session management
│   ├── ga4.ts          # GA4 API client
│   ├── meta.ts         # Meta Ads API client
│   ├── prisma.ts       # Prisma client singleton
│   ├── semrush.ts      # SemRush API client
│   └── utils.ts        # Formatters and helpers
prisma/
├── schema.prisma       # Database schema
├── migrations/         # SQL migrations
└── seed.ts             # Database seeder
```

---

## Deploying to Vercel

### 1. Create a Turso database

[Turso](https://turso.tech) is a cloud SQLite service that is fully compatible with the LibSQL adapter already used in this project.

```bash
# Install the Turso CLI and log in
brew install tursodatabase/tap/turso
turso auth login

# Create a database and get credentials
turso db create i3media-report
turso db show i3media-report   # copy the URL
turso db tokens create i3media-report  # copy the auth token
```

### 2. Run database migrations against Turso

```bash
DATABASE_URL="libsql://<your-db>.turso.io" \
TURSO_AUTH_TOKEN="<your-auth-token>" \
npx prisma migrate deploy

DATABASE_URL="libsql://<your-db>.turso.io" \
TURSO_AUTH_TOKEN="<your-auth-token>" \
npm run db:seed
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
| `BLOB_READ_WRITE_TOKEN` | *(auto-set by Vercel Blob)* |
| `SEMRUSH_API_KEY` | `<your-key>` |
| `GA4_ACCESS_TOKEN` | `<your-token>` |
| `META_ACCESS_TOKEN` | `<your-token>` |

5. Click **Deploy**. Subsequent pushes to the `main` branch will deploy automatically.

### Auto-deployments (CI)

The included `.github/workflows/ci.yml` workflow runs `eslint` and `next build` on every push and pull request, catching issues before they reach production. Vercel's own GitHub integration handles the actual deployment — no extra configuration is needed.

### Troubleshooting: "Unable to open connection to local database dev.db"

If you see this error (or `Digest: 540445248`) in the Vercel logs after deploying, it means `DATABASE_URL` is not set to a remote Turso URL in your Vercel project.

Serverless functions cannot access local SQLite files. You must:

1. Create a Turso database and obtain credentials (see step 1 above).
2. Add `DATABASE_URL` and `TURSO_AUTH_TOKEN` to your Vercel project's **Settings → Environment Variables**.
3. Trigger a redeployment (push a commit or use **Deployments → Redeploy** in the Vercel dashboard).

Login works without a database (sessions are cookie-based), but any page that reads or writes data — the dashboard, clients list, reports — requires a valid `DATABASE_URL`.
