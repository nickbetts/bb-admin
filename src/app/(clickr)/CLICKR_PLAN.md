# Clickr — Public SaaS Build Plan

**Product:** Wrap the existing LP generator as a public-facing SaaS at `/clickr/`.  
**Billing:** Stripe hosted checkout (no card data on server).  
**Pricing:** Free (1 LP ever + watermark) / Starter £19/mo (10 LPs/mo) / Pro £49/mo (unlimited).  
**Admin:** Stratos sidebar "Clickr Public" → `/admin/clickr` — user list, billing, revenue/cost reporting.

---

## Folder structure (this directory)

```
src/
  app/
    (clickr)/                        ← route group, own layout (no Stratos sidebar)
      CLICKR_PLAN.md                 ← this file
      layout.tsx                     ← minimal nav: Clickr logo, Login, Sign Up links
      clickr/
        page.tsx                     ← /clickr — marketing + pricing page
        login/page.tsx               ← /clickr/login
        signup/page.tsx              ← /clickr/signup
        dashboard/page.tsx           ← /clickr/dashboard — LP list, plan badge, usage meter
        pages/
          new/page.tsx               ← /clickr/pages/new — LP creation form
          [id]/page.tsx              ← /clickr/pages/[id] — preview, audit, share

    api/
      clickr/
        auth/
          signup/route.ts            ← POST: create ClickrUser + Stripe customer → set cookie
          login/route.ts             ← POST: verify password → set cookie
          logout/route.ts            ← POST: delete session + clear cookie
          me/route.ts                ← GET: return current ClickrSessionUser
        billing/
          checkout/route.ts          ← POST: create Stripe checkout session → { url }
          portal/route.ts            ← GET: Stripe billing portal URL → { url }
          webhook/route.ts           ← POST: Stripe webhook (no auth, signature verified)

      admin/
        clickr/
          stats/route.ts             ← GET: MRR, user counts by tier, LPs this month
          users/route.ts             ← GET: paginated user list (search, filter by tier)
          users/[id]/route.ts        ← GET: user detail + LP list | PATCH: admin overrides

      cron/
        clickr-reset/route.ts        ← POST: reset lpsThisMonth on all ClickrUsers (run 1st of month)

    admin/
      clickr/
        page.tsx                     ← /admin/clickr — overview dashboard
        users/
          page.tsx                   ← /admin/clickr/users — user list
          [id]/page.tsx              ← /admin/clickr/users/[id] — user detail

  lib/
    clickr-auth.ts                   ← getClickrSession(), set/clearClickrSessionCookie()
    stripe.ts                        ← getStripeClient() singleton
```

---

## Phase 1 — Prisma schema changes

**File:** `prisma/schema.prisma`

Add after the existing `Session` model:

```prisma
model ClickrUser {
  id                   String          @id @default(cuid())
  email                String          @unique
  name                 String?
  passwordHash         String
  stripeCustomerId     String?         @unique
  stripeSubscriptionId String?         @unique
  planTier             String          @default("free")    // free | starter | pro
  planStatus           String          @default("active")  // active | past_due | cancelled
  lpsThisMonth         Int             @default(0)
  billingPeriodStart   DateTime        @default(now())
  emailVerified        Boolean         @default(false)
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  sessions             ClickrSession[]
  landingPages         LandingPage[]
}

model ClickrSession {
  id            String      @id @default(cuid())
  clickrUserId  String
  token         String      @unique
  expiresAt     DateTime
  createdAt     DateTime    @default(now())
  clickrUser    ClickrUser  @relation(fields: [clickrUserId], references: [id], onDelete: Cascade)
}
```

Update `LandingPage`:

```prisma
// Change: userId String  →  userId String?
// Add:
clickrUserId  String?
clickrUser    ClickrUser?  @relation(fields: [clickrUserId], references: [id], onDelete: Cascade)

// Add to @@unique list:
@@unique([clickrUserId, slug])
```

**Then run:** `npm run db:migrate`  
**Migration name:** `add_clickr_user_and_session`

---

## Phase 2 — Stripe singleton (`src/lib/stripe.ts`)

Pattern: mirrors `src/lib/openai-client.ts` singleton.

```typescript
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "placeholder") throw new Error("STRIPE_SECRET_KEY not configured");
  _stripe = new Stripe(key, { apiVersion: "2025-03-31.basil" });
  return _stripe;
}

export const PLAN_LIMITS: Record<string, number> = {
  free: 1,      // 1 LP ever (lpsThisMonth is never reset for free users)
  starter: 10,  // 10 per billing period
  pro: Infinity,
};

export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  pro: process.env.STRIPE_PRO_PRICE_ID,
};
```

**Install:** `npm install stripe`

---

## Phase 3 — Clickr auth lib (`src/lib/clickr-auth.ts`)

Reference: `src/lib/auth.ts` — same HMAC-SHA256 pattern, `SESSION_SECRET` env var.  
Cookie name: `clickr_session` (different from internal `session_token`).

Key exports:
- `getClickrSession(request?: NextRequest): Promise<ClickrSession | null>`  
  Reads `clickr_session` cookie → verifies HMAC → DB lookup of `ClickrSession` + `ClickrUser`
- `setClickrSessionCookie(userId: string, response: NextResponse): Promise<void>`  
  Creates `ClickrSession` row, signs token, sets httpOnly cookie (7-day expiry)
- `clearClickrSessionCookie(token: string, response: NextResponse): void`  
  Deletes `ClickrSession` row, clears cookie

Session user shape:
```typescript
interface ClickrSessionUser {
  id: string;
  email: string;
  name: string | null;
  planTier: string;
  planStatus: string;
  lpsThisMonth: number;
}
```

---

## Phase 4 — Auth API routes

### `POST /api/clickr/auth/signup`
1. Validate: email (format), password (min 8 chars), name
2. Check `prisma.clickrUser.findUnique({ where: { email } })` → 409 if exists
3. `bcrypt.hash(password, 12)` — same bcrypt already used in `src/app/api/auth/login/route.ts`
4. `prisma.clickrUser.create({ data: { email, name, passwordHash } })`
5. `stripe.customers.create({ email, name })` → store `stripeCustomerId` on user
6. `setClickrSessionCookie(user.id, response)` → return `{ user }`

### `POST /api/clickr/auth/login`
1. `prisma.clickrUser.findUnique({ where: { email } })`
2. `bcrypt.compare(password, user.passwordHash)` → 401 if wrong
3. `setClickrSessionCookie(user.id, response)` → return `{ user }`

### `POST /api/clickr/auth/logout`
1. `getClickrSession()` → if no session, return 200 anyway
2. `clearClickrSessionCookie(token, response)` → 200

### `GET /api/clickr/auth/me`
1. `getClickrSession()` → 401 if null
2. Return `{ user: session.user }`

---

## Phase 5 — Billing API routes

### `POST /api/clickr/billing/checkout`
Body: `{ tier: "starter" | "pro" }`
1. `getClickrSession()` → 401
2. `getStripeClient()`
3. `stripe.checkout.sessions.create({ mode: "subscription", customer: user.stripeCustomerId, line_items: [{ price: PLAN_PRICE_IDS[tier], quantity: 1 }], success_url: `${APP_URL}/clickr/dashboard?upgraded=1`, cancel_url: `${APP_URL}/clickr/dashboard` })`
4. Return `{ url: session.url }`

### `GET /api/clickr/billing/portal`
1. `getClickrSession()` → 401
2. `stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${APP_URL}/clickr/dashboard` })`
3. Return `{ url: portalSession.url }`

### `POST /api/clickr/billing/webhook`  
**No auth** — raw body required, verify `stripe-signature` header.

```typescript
export const config = { api: { bodyParser: false } };
// In Next.js App Router: use request.text() for raw body
```

Events to handle:
| Event | Action |
|---|---|
| `checkout.session.completed` | Set `planTier`, `stripeSubscriptionId`, `planStatus: "active"`, reset `billingPeriodStart = now()`, `lpsThisMonth = 0` |
| `customer.subscription.updated` | Sync `planTier` (map price ID → tier name), `planStatus` |
| `customer.subscription.deleted` | Set `planTier: "free"`, `planStatus: "cancelled"`, `stripeSubscriptionId: null` |
| `invoice.payment_failed` | Set `planStatus: "past_due"` |

Lookup user by `stripeCustomerId` from the event's `customer` field.

---

## Phase 6 — LP generation for Clickr users

**File:** `src/app/api/tools/landing-pages/route.ts`

Modify the existing `POST` handler:

```typescript
// Replace: const session = await getSession();
// With:
const internalSession = await getSession();
const clickrSession = internalSession ? null : await getClickrSession(request);
const session = internalSession;

if (!internalSession && !clickrSession) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// If Clickr user, enforce plan limits
if (clickrSession) {
  const user = clickrSession.user;
  const limit = PLAN_LIMITS[user.planTier];
  // Free tier: lpsThisMonth is a lifetime counter (never reset)
  if (user.lpsThisMonth >= limit) {
    return NextResponse.json({
      error: user.planTier === "free"
        ? "Free plan allows 1 landing page. Upgrade to create more."
        : "Monthly limit reached. Upgrade or wait for your billing period to reset.",
      upgrade: true,
    }, { status: 402 });
  }
}
```

On LP save:
- If Clickr user: set `clickrUserId: clickrSession.user.id`, `userId: null` (or use a system stub userId if FK constraint requires it — check migration default)
- After DB insert: `prisma.clickrUser.update({ where: { id }, data: { lpsThisMonth: { increment: 1 } } })`
- If `planTier === "free"`: append watermark badge to `currentHtml` before `</body>` (or do it at serve time — see Phase 8 below)

**Watermark (serve-time is better — do it in `/lp/[slug]/route.ts` so upgrading removes it instantly).**

---

## Phase 7 — Watermark at serve time

**File:** `src/app/lp/[slug]/route.ts`

After fetching the LP from DB:

```typescript
// If LP belongs to a Clickr free-tier user, inject badge
if (lp.clickrUserId) {
  const clickrUser = await prisma.clickrUser.findUnique({
    where: { id: lp.clickrUserId },
    select: { planTier: true },
  });
  if (clickrUser?.planTier === "free") {
    html = html.replace(
      "</body>",
      `<div style="position:fixed;bottom:12px;right:12px;z-index:9999;background:rgba(0,0,0,0.75);color:#fff;font-size:11px;font-family:sans-serif;padding:5px 10px;border-radius:20px;pointer-events:auto;">
        Built with <a href="https://clickr.marketing" target="_blank" rel="noopener" style="color:#a5f3fc;text-decoration:none;font-weight:600;">Clickr</a>
      </div></body>`
    );
  }
}
```

**This means upgrading from free removes the watermark on the next page load. No regeneration needed.**

---

## Phase 8 — Monthly LP counter reset

**File:** `src/app/api/cron/clickr-reset/route.ts`

```typescript
// POST /api/cron/clickr-reset
// Auth: CRON_SECRET bearer token (use existing getSessionOrCronAuth pattern)
// Reset lpsThisMonth for starter/pro users only (free is lifetime counter)
await prisma.clickrUser.updateMany({
  where: { planTier: { in: ["starter", "pro"] } },
  data: { lpsThisMonth: 0, billingPeriodStart: new Date() },
});
```

Add to `vercel.json` cron schedule (1st of month, midnight UTC):
```json
{ "path": "/api/cron/clickr-reset", "schedule": "0 0 1 * *" }
```

---

## Phase 9 — Stratos sidebar

**File:** `src/components/layout/Sidebar.tsx`

Add import at top: `Zap` from `lucide-react`

In `renderNavLinks()`, after the `{permissions.includes("users") && ... Admin link}` block (~line 600):

```tsx
{permissions.includes("users") && (
  <>
    {!collapsed && <p className="sidebar-nav-label" style={{ marginTop: 12 }}>Clickr</p>}
    {(() => {
      const isActive = pathname === "/admin/clickr" || pathname.startsWith("/admin/clickr/");
      return (
        <Link
          href="/admin/clickr"
          aria-current={isActive ? "page" : undefined}
          title={collapsed ? "Clickr Public" : undefined}
          className={cn("nav-item", isActive && "active", collapsed && "justify-center")}
          style={collapsed ? { justifyContent: "center" } : undefined}
        >
          <span className="nav-item-icon" style={{ display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
            <Zap className="h-4 w-4" />
          </span>
          {!collapsed && <span>Clickr Public</span>}
        </Link>
      );
    })()}
  </>
)}
```

---

## Phase 10 — Admin panel pages

### `/admin/clickr` (page.tsx)
Stats cards (top row):
- Total Clickr users
- Paid subscribers (starter + pro)
- MRR (£) — `starters × 19 + pros × 49`
- LPs generated this month (count from DB)
- Estimated AI cost this month (LPs × £0.50 average)

Charts:
- MRR over time (line chart — requires storing monthly snapshots or calculating from user createdAt/planTier)
- Users by tier (pie: free / starter / pro)
- LPs generated per day this month (bar)

### `/admin/clickr/users` (page.tsx)
Table columns: Email, Name, Plan (badge), Plan status (badge), LPs this month, Created, Actions (View)
Search: email text input
Filter: tier dropdown

### `/admin/clickr/users/[id]` (page.tsx)
- Profile card: email, name, plan badge, Stripe customer ID (link to Stripe dashboard), created date
- LP list: title, status, view count, publicSlug link, created date
- Admin actions panel:
  - **Override plan tier** — dropdown: free / starter / pro → PATCH /api/admin/clickr/users/[id]
  - **Reset LP count** — sets lpsThisMonth = 0
  - **Disable account** — sets planStatus = "disabled"

---

## Phase 11 — New env vars to add

Add to `.env.local.example`:

```bash
# Stripe (Clickr billing)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
STRIPE_STARTER_PRICE_ID=price_placeholder
STRIPE_PRO_PRICE_ID=price_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
```

Add to CI stub comment table in `.github/copilot-instructions.md`:
| `STRIPE_SECRET_KEY` | ✅ | ✅ `sk_test_placeholder` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | ✅ `whsec_placeholder` |
| `STRIPE_STARTER_PRICE_ID` / `STRIPE_PRO_PRICE_ID` | ✅ | ✅ `price_placeholder` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | ✅ `pk_test_placeholder` |

---

## Phase 12 — Verification checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] Sign up at `/clickr/signup` → ClickrUser row in DB, Stripe customer created
- [ ] Generate 1 LP (free) → watermark badge visible at `/lp/{slug}`
- [ ] Attempt 2nd LP → 402 "Free plan allows 1 landing page"
- [ ] Stripe test checkout (starter) → `planTier` updated in DB
- [ ] Watermark gone on next load of `/lp/{slug}`
- [ ] Stratos `/admin/clickr` shows user count, tier breakdown
- [ ] Stripe billing portal accessible from `/clickr/dashboard`
- [ ] Cron `POST /api/cron/clickr-reset` resets `lpsThisMonth` on starter/pro users only

---

## Key decisions

| Decision | Rationale |
|---|---|
| `ClickrUser` separate from internal `User` | No risk of mixing staff with public customers |
| `LandingPage.userId` made nullable | Allows LP to belong to ClickrUser instead |
| Watermark at **serve time** | Upgrading removes it instantly, no regeneration |
| Stripe **hosted checkout** (no Elements) | PCI-compliant, fastest to ship, no card data on server |
| Route group `(clickr)` in this app | Shares all `src/lib/` code, single Vercel project |
| Same `SESSION_SECRET` for HMAC | One fewer secret; different cookie name prevents collisions |
| Monthly reset via cron | Simple, uses existing cron infrastructure |

---

## Stripe product setup (do before implementing billing)

In Stripe dashboard (test mode first):
1. Create product "Clickr Starter" → recurring price £19.00/month GBP → copy price ID → `STRIPE_STARTER_PRICE_ID`
2. Create product "Clickr Pro" → recurring price £49.00/month GBP → copy price ID → `STRIPE_PRO_PRICE_ID`
3. Set up webhook endpoint pointing to `https://your-domain.com/api/clickr/billing/webhook`
4. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
5. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
