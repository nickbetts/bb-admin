# `src/app/` route map

Next.js App Router routes. Folders fall into one of three categories — please keep this README current when adding new top-level folders.

## 🟢 User-facing app (authenticated)

The actual product. Requires a session (`getSession()` in `src/lib/auth.ts`).

| Path | Purpose |
|---|---|
| `dashboard/` | Agency-wide home dashboard |
| `clients/` | Client list, per-client dashboard, settings |
| `reports/` | Report builder + viewer |
| `tools/` | Agency tools (keyword planner, proposals, content strategy, page analyser, etc.) |
| `admin/` | User & role management |
| `settings/` | App-level config |
| `portal/` | Client-facing portal (separate auth — magic-link via `ClientPortalUser`) |

## 🟡 Public landing / marketing

Unauthenticated public pages. SEO-significant URLs — **do not rename or move** without redirects. Linked from `login/page.tsx` "Learn more about X →" buttons.

| Path | Purpose |
|---|---|
| `meridian/` | Marketing page for the Meridian AI intelligence layer |
| `meridian-architecture/` | Architecture explainer for Meridian |
| `signals/` | Marketing page for the Signals feature |
| `ai-analyst/` | Marketing page for the AI Analyst |
| `reports-feature/` | Marketing page for the report builder |
| `keyword-planner-feature/` | Marketing page for the keyword planner |
| `budget-intelligence/` | Marketing page for the budget advisor |
| `forecasting/` | Marketing page for the forecasting feature |
| `login/` | Login page (also acts as marketing landing for the agency-OS pitch) |

> 💡 If you're looking for the *actual* feature implementation, check `clients/[slug]/`, `tools/`, or the relevant `api/ai/*` route — not these marketing folders.

## 🔵 Public share / no-auth

Token-protected public surfaces.

| Path | Purpose |
|---|---|
| `share/` | Shared report / proposal / strategy public viewers (token in URL) |

## ⚙️ API

| Path | Purpose |
|---|---|
| `api/` | All API route handlers — see [docs/architecture.md](../../docs/architecture.md) for inventory |

---

## Convention

- **Authenticated pages** live at `/dashboard`, `/clients/...`, `/tools/...`, `/reports/...`, `/admin/...`, `/settings/...`.
- **Public marketing** lives at top-level slugs that match the marketing site IA. **Always** include `<LandingNav />` so they share chrome.
- **Client portal** lives under `/portal/...` and uses its own session cookie + `ClientPortalUser` model.
- New top-level folders: add an entry to this README in the same PR.
