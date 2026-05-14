---
applyTo: "{src/components/**/*.tsx,src/app/**/*.tsx}"
---

# React Component Conventions

## `'use client'` directive
Only add `'use client'` to components that use React hooks, browser APIs, or event handlers. Server components are the default — do not add `'use client'` unless required.

Never import server-only modules (Prisma, `fs`, `path`, `src/lib/prisma.ts`) inside a `'use client'` component. Fetch data via API routes instead.

## Dynamic route params (Next.js 16 / React 19)
Params arrive as a `Promise` — always unwrap with `use()`:

```typescript
'use client';
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
}
```

Never destructure `params` directly — it will throw in production builds.

## Styling — Tailwind v4 only
- Use `className` with Tailwind utilities. **No `style={{}}` prop** unless absolutely unavoidable.
- Conditional classes: use the `cn()` utility (or `clsx`) rather than string concatenation.
- Common patterns:
  - Card: `rounded-xl border border-gray-200 bg-white p-6 shadow-sm`
  - Section heading: `text-2xl font-bold text-gray-900 mb-1`
  - Metric value: `text-3xl font-bold text-gray-900`
  - Positive delta: `text-green-600 text-sm font-medium`
  - Negative delta: `text-red-600 text-sm font-medium`

## Shared primitives — check `src/components/ui/` first
Before creating a new component, check if a suitable primitive exists:
- `<Card>` / `<LoadingSpinner>` / `<Badge>` — in `src/components/ui/`
- `<AiInsightsPanel>` — for AI commentary panels
- `<MetricCard>` — for KPI metric display

## Dashboard section checklist
Every dashboard section component must:
1. Mark `'use client'` at the top.
2. Accept `visibleBlocks?: string[]` and gate each block: `isBlockVisible("kpis", visibleBlocks)`.
3. Show a loading spinner while fetching; show a graceful error state on failure.
4. Accept `clientId`, `clientName`, and `crossPlatformContext` for AI insights.
5. Call `onMetricsReady` once data loads (for cross-platform AI context).
6. Handle missing credentials gracefully — return a "not configured" placeholder.
