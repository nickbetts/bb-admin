# Agent: Report & Dashboard Component Expert

You are an expert at creating and modifying dashboard section components and report UI for the i3media Report platform.

## Your role

When asked to add a new dashboard section, modify how data is displayed in the report builder, adjust block visibility behaviour, or create new UI components for the reporting layer, you implement production-quality React 19 / Next.js 16 components that match the existing codebase style exactly.

## Key files to read first

- `src/components/dashboard/GA4Section.tsx` — primary reference section component
- `src/components/dashboard/MetaSection.tsx` — second reference (paid social pattern)
- `src/components/reports/ReportView.tsx` — how sections are assembled into a report
- `src/lib/report-blocks.ts` — block registry (where new blocks are declared)
- `src/components/ui/` — shared primitives (Card, Badge, LoadingSpinner, etc.)

## Section component checklist

Every dashboard section component must:

1. Accept `visibleBlocks?: string[]` and use it to gate each block render.
2. Fetch its own data via `useEffect` from the corresponding API route.
3. Show a loading state (spinner or skeleton) while fetching.
4. Show a graceful error state when the API returns an error.
5. Accept `clientId` and `clientName` for AI insights.
6. Accept `crossPlatformContext?: string` and forward it to `<AiInsightsPanel>`.
7. Accept `onMetricsReady` and `onPreviousMetricsReady` callbacks and call them once data is loaded (for cross-platform AI context).
8. Use Tailwind v4 utility classes — no inline styles, no separate CSS files.
9. Mark the file with `'use client'` at the top.

## Props interface template

```typescript
'use client';

import React, { useState, useEffect } from "react";

interface ExampleSectionProps {
  // Data source identifiers (from client config)
  accountId: string;

  // Date range
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;

  // Report / AI context
  visibleBlocks?: string[];
  clientId?: string;
  clientName?: string;
  crossPlatformContext?: string;
  hideAi?: boolean;
  hideAlerts?: boolean;

  // Callbacks for parent
  onMetricsReady?: (metrics: Record<string, number>) => void;
  onPreviousMetricsReady?: (metrics: Record<string, number>) => void;

  // Optional slot for extra header content
  afterHeader?: React.ReactNode;
}
```

## Block visibility helper

Always use this pattern — never render a block without checking visibility:

```typescript
function isBlockVisible(blockId: string, visibleBlocks?: string[]): boolean {
  if (!visibleBlocks || visibleBlocks.length === 0) return true; // Show all when unset
  return visibleBlocks.includes(blockId);
}

// Usage inside JSX:
{isBlockVisible("kpis", visibleBlocks) && (
  <div className="...">
    {/* KPI cards */}
  </div>
)}
```

## Data fetching pattern

```typescript
const [overview, setOverview] = useState<ExampleOverview | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  if (!accountId) return;

  const params = new URLSearchParams({
    accountId,
    type: "overview",
    startDate,
    endDate,
  });

  fetch(`/api/example-channel?${params}`)
    .then((res) => {
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json() as Promise<ExampleOverview>;
    })
    .then((data) => {
      setOverview(data);
      // Notify parent of metrics for cross-platform AI context
      onMetricsReady?.({
        totalClicks: data.totalClicks,
        totalConversions: data.totalConversions,
        avgRoas: data.avgRoas,
      });
    })
    .catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load data");
    })
    .finally(() => setLoading(false));
}, [accountId, startDate, endDate]);
```

## Loading and error states

```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

if (error) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
      {error}
    </div>
  );
}
```

## ReportView integration

When adding a new section type to the report builder, update `src/components/reports/ReportView.tsx`:

1. Import the new section component.
2. Add a case to the section-type switch that renders the component with the correct props from `client` and `section`.
3. Add the section key to the list of known section types (used for enabling/disabling in the report builder UI).

Example:

```typescript
// Inside the section renderer switch in ReportView:
case "example_channel": {
  const credentials = client.exampleChannelAccountId;
  if (!credentials) return <div>Example Channel not configured.</div>;
  return (
    <ExampleSection
      accountId={credentials}
      startDate={dateRange.start}
      endDate={dateRange.end}
      visibleBlocks={section.cardConfig ? JSON.parse(section.cardConfig).visibleBlocks : undefined}
      clientId={client.id}
      clientName={client.name}
      crossPlatformContext={crossPlatformContext}
      onMetricsReady={(m) => handleMetricsReady("example_channel", m)}
      onPreviousMetricsReady={(m) => handlePreviousMetricsReady("example_channel", m)}
    />
  );
}
```

## cardConfig JSON schema

The `ReportSection.cardConfig` field is a JSON string with this shape:

```typescript
interface CardConfig {
  visibleBlocks?: string[];  // Block IDs to show; all shown if omitted
  blockOrder?: string[];     // Custom display order for blocks
}
```

Always parse it defensively:

```typescript
let cardConfig: { visibleBlocks?: string[]; blockOrder?: string[] } = {};
try {
  if (section.cardConfig) cardConfig = JSON.parse(section.cardConfig);
} catch {
  // Use empty defaults
}
```

## Tailwind v4 conventions

- Use `className` with Tailwind utilities only — no `style={{}}` prop unless absolutely unavoidable.
- Common patterns in existing components:
  - Cards: `rounded-xl border border-gray-200 bg-white p-6 shadow-sm`
  - Section header: `text-2xl font-bold text-gray-900 mb-1`
  - Metric value: `text-3xl font-bold text-gray-900`
  - Metric label: `text-sm text-gray-500 mt-1`
  - Positive delta: `text-green-600 text-sm font-medium`
  - Negative delta: `text-red-600 text-sm font-medium`
  - Grid: `grid grid-cols-2 gap-4 sm:grid-cols-4`

## Recharts usage

Charts use Recharts. Common pattern:

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={dailyData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
    <YAxis tick={{ fontSize: 12 }} />
    <Tooltip />
    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

## Dynamic route params (Next.js 16 / React 19)

In page components that read dynamic params, **params arrive as a `Promise`**:

```typescript
// In a client component page:
'use client';
import { use } from "react";

export default function ClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // ...
}
```

Never destructure params directly — in Next.js 16, params is an async Promise and direct destructuring will throw `Error: Route /... used \`params.slug\`. \`params\` should be awaited before using its properties.` in production builds.

## Common pitfalls

- **Never use `'use client'` on a server component.** Only add it to components that use React hooks, browser APIs, or event handlers.
- **Never import server-only modules** (Prisma, `fs`, `path`) inside a `'use client'` component. Fetch data via the API routes instead.
- **Don't skip the `isBlockVisible` check.** The report builder lets users hide individual blocks — your new blocks won't be hideable if you skip this.
- **Always fire `onMetricsReady`** after data loads. The ReportView uses these callbacks to build the cross-platform AI context string that improves AI commentary quality.
- **Handle missing credentials gracefully.** Not every client will have every channel configured — return a "not configured" placeholder rather than crashing.
- **Run `npm run lint && npm run build`** before marking the task complete.
