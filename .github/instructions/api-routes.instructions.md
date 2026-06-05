---
applyTo: "src/app/api/**/*.ts"
---

# API Route Conventions

## Authentication — choose the right helper

| Route type                             | Auth helper                     | Why                                          |
| -------------------------------------- | ------------------------------- | -------------------------------------------- |
| User-facing (report, client dashboard) | `getSession()`                  | Session cookie only                          |
| Cron-callable or internal              | `getSessionOrCronAuth(request)` | Also accepts `CRON_SECRET` bearer token      |
| Public share links                     | None                            | Validate share token from URL params instead |

```typescript
import { getSessionOrCronAuth } from "@/lib/auth";

const session = await getSessionOrCronAuth(request);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

## Caching — required for all external API calls

Wrap every call to an external channel API with `withApiCache`:

```typescript
import { withApiCache } from "@/lib/api-cache";

// Cache key format: {platform}:{type}:{clientId}:{startDate}:{endDate}
const cacheKey = `ga4:overview:${propertyId}:${startDate}:${endDate}`;
return NextResponse.json(await withApiCache(cacheKey, 4, () => getChannelData(...)));
```

TTL guidance:

- `4` hours — most real-time channels (GA4, Google Ads, Meta, TikTok, etc.)
- `24` hours — daily-update channels (CWV, HubSpot)
- `720` hours (30 days) — monthly-update channels (SEO organic, Moz)

## Error handling — standard shape

```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("<route-context> error:", error);
  return NextResponse.json({ error: message }, { status: 500 });
}
```

## Prisma — use the singleton

```typescript
import prisma from "@/lib/prisma"; // ✅
// Never: import { PrismaClient } from "@prisma/client"; const prisma = new PrismaClient();
```

## OpenAI — never read the key directly

```typescript
import { getOpenAiClient } from "@/lib/openai-client";
const openai = await getOpenAiClient(); // ✅
// Never: new OpenAI() or process.env.OPENAI_API_KEY
```

## Response conventions

- Missing required params → `{ status: 400 }` with a descriptive `error` message.
- Unauthorized → `{ status: 401 }`.
- Not found → `{ status: 404 }`.
- Server/external API error → `{ status: 500 }` with `error` message.
- Success → `NextResponse.json(data)` (defaults to 200).
