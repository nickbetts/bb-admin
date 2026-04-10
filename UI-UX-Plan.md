# UI/UX Audit & Improvement Plan

> Full platform audit — 10 April 2026  
> Last updated: Phase 1 ✅ implemented — commit `8564e2c`
> Covers: dashboards, channel sections, metric cards, tables, charts, reports, tools, settings, admin, portal, forms, modals, navigation, loading/error states, accessibility, responsive, and design-system foundations.

---

## Implementation Status

| Phase | Status | Commit |
|-------|--------|--------|
| Phase 1 — Foundation (shared components + CSS tokens) | ✅ Complete | `8564e2c` |
| Phase 2 — Channel section unification + chart config | ✅ Complete | `8564e2c` |
| Phase 3 — Interactivity & Polish | ✅ Complete | 6f53920 |
| Phase 4 — Accessibility & Responsive | ✅ Complete | 6f53920 |
| Phase 5 — Dark Mode & Advanced | ✅ Complete | 6f53920 |

---

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design System Foundations](#2-design-system-foundations)
3. [Navigation & Layout](#3-navigation--layout)
4. [Metric Cards](#4-metric-cards)
5. [Tables](#5-tables)
6. [Charts & Graphs](#6-charts--graphs)
7. [Channel Section Consistency](#7-channel-section-consistency)
8. [Reports & PDF Export](#8-reports--pdf-export)
9. [Tools Pages](#9-tools-pages)
10. [Forms & Inputs](#10-forms--inputs)
11. [Modals & Dialogs](#11-modals--dialogs)
12. [Loading & Error States](#12-loading--error-states)
13. [Empty States](#13-empty-states)
14. [Alerts & Signals](#14-alerts--signals)
15. [Accessibility](#15-accessibility)
16. [Responsive & Mobile](#16-responsive--mobile)
17. [Micro-interactions & Animation](#17-micro-interactions--animation)
18. [Colour System & Dark Mode Prep](#18-colour-system--dark-mode-prep)
19. [Typography](#19-typography)
20. [Implementation Priority](#20-implementation-priority)

---

## 1. Executive Summary

The platform is functionally rich with 15+ channel integrations, AI insights, report builder, and agency tools. The UI is built on a solid CSS custom-property foundation with Tailwind v4. However, the codebase has grown organically, resulting in:

- **Inconsistent styling** — a mix of inline styles, Tailwind classes, and CSS classes for the same things (tables, cards, forms)
- **Hardcoded colours** — 50+ hardcoded hex values across components that should be design tokens
- **Divergent component patterns** — each channel section builds its own cards, tables, and charts slightly differently
- **Limited interactivity** — tables are static, charts have minimal interaction, no sorting/filtering/pagination
- **Accessibility gaps** — missing aria labels, no keyboard navigation on interactive elements, no focus management in modals
- **Mobile half-done** — sidebar responsive exists, but dense data tables and charts don't adapt
- **No dark mode** — tokens exist but there's no toggle or `@media (prefers-color-scheme)` support
- **Visual age** — flat cards with thin borders and minimal depth; modern dashboards use glassmorphism, gradient accents, micro-animations, and more generous whitespace

### Goal
Bring the platform to a modern, polished, agency-grade SaaS standard — consistent across every surface, responsive on all devices, accessible, and delightful to use.

---

## 2. Design System Foundations

### Current State
- `globals.css` has a good token system: `--bg`, `--surface`, `--border`, `--text-*`, `--accent`, `--r-*`, `--shadow-*`
- Type scale (`--text-xs` to `--text-3xl`) and spacing scale (`--space-xs` to `--space-5xl`) added recently
- But these tokens are **rarely used** — components use hardcoded px values and hex colours
- No semantic colour tokens (e.g. `--color-success`, `--color-warning`, `--color-danger` beyond the three in `:root`)
- No channel brand colour tokens
- No transition/animation tokens
- No z-index scale

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 2.1 | No semantic status tokens beyond `--success`, `--warning`, `--danger` | Add `--success-bg`, `--success-border`, `--warning-bg`, `--warning-border`, `--danger-bg`, `--danger-border`, `--info`, `--info-bg`, `--info-border` | High |
| 2.2 | No channel brand tokens | Add `--channel-ga4: #f97316`, `--channel-meta: #1877f2`, `--channel-google-ads: #4285f4`, `--channel-linkedin: #0a66c2`, `--channel-tiktok: #000000`, `--channel-microsoft: #00a4ef`, `--channel-klaviyo: #1b9c4f`, `--channel-hubspot: #ff7a59`, `--channel-semrush: #ff642d`, `--channel-youtube: #ff0000`, `--channel-shopify: #96bf48`, `--channel-woocommerce: #7f54b3`, `--channel-callrail: #45d18b`, `--channel-search-console: #4285f4`, `--channel-moz: #3787ff` | High |
| 2.3 | 50+ hardcoded colours across components | Migrate all to tokens or Tailwind utilities; create a `STATUS_COLORS` and `CHANNEL_COLORS` map in a shared `src/lib/design-tokens.ts` | High |
| 2.4 | No z-index scale | Add `--z-dropdown: 10`, `--z-sticky: 20`, `--z-overlay: 100`, `--z-modal: 200`, `--z-toast: 300`, `--z-tooltip: 400` | Medium |
| 2.5 | No transition tokens | Add `--transition-fast: 0.1s ease`, `--transition-base: 0.15s ease`, `--transition-slow: 0.25s ease` | Medium |
| 2.6 | Spacing scale defined but not used in components | Audit and replace hardcoded `marginBottom: 28`, `gap: 12`, etc. with `var(--space-*)` tokens | Medium |
| 2.7 | Type scale defined but not used in components | Replace hardcoded `fontSize: 13`, `fontSize: 12` etc. with `var(--text-*)` tokens | Medium |
| 2.8 | No dark mode support | Add `@media (prefers-color-scheme: dark)` block with dark token overrides + manual toggle stored in `localStorage` with `data-theme="dark"` on `<html>` | Low |

### Design Tokens File (`src/lib/design-tokens.ts`)

Create a shared TypeScript file exporting colour maps so components don't hardcode:

```typescript
export const CHANNEL_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
  ga4:              { primary: "#f97316", bg: "#fff7ed", border: "#fed7aa" },
  meta:             { primary: "#1877f2", bg: "#eff6ff", border: "#bfdbfe" },
  google_ads:       { primary: "#4285f4", bg: "#eff6ff", border: "#bfdbfe" },
  // ...etc
};

export const STATUS_COLORS = {
  success: { text: "#065f46", bg: "#ecfdf5", border: "#a7f3d0" },
  warning: { text: "#92400e", bg: "#fffbeb", border: "#fcd34d" },
  danger:  { text: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
  info:    { text: "#1e40af", bg: "#eff6ff", border: "#bfdbfe" },
};

export const CHART_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
```

---

## 3. Navigation & Layout

### Current State
- Sidebar with collapse toggle works well
- Mobile responsive sidebar (slide-out) exists
- Active state uses left border accent — good
- Page containers use `max-width: min(1300px, 90vw)` — appropriate
- No breadcrumbs on deep pages
- Client dashboard tabs scroll horizontally but have no overflow indicator

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 3.1 | No breadcrumbs on client detail, report edit, tool sub-pages | Add a `<Breadcrumb>` component using `usePathname()` — e.g. `Dashboard > Acme Corp > SEO` | High |
| 3.2 | Tab overflow on client dashboard not visually indicated | Add gradient fade masks on left/right edges when tabs overflow (`mask-image: linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)`) | Medium |
| 3.3 | No keyboard shortcut navigation | Add `Cmd+K` / `Ctrl+K` command palette for quick navigation to clients, reports, tools | Medium |
| 3.4 | Sidebar has no section dividers between nav groups | Add subtle `<hr>` or `border-top` between "Menu", "Agency Tools", "Admin" groups | Low |
| 3.5 | No collapse/expand animation on sidebar | Current transition is width-only; add smooth icon-to-text transitions | Low |
| 3.6 | Page header actions not sticky on long pages | Make `.page-header` sticky with `position: sticky; top: 0; z-index: 10; background: var(--bg)` on pages that need it (reports, tools) | Medium |
| 3.7 | No "back to top" affordance on long channel sections | Add a floating "↑" button that appears on scroll > 600px | Low |

---

## 4. Metric Cards

### Current State
- `MetricCard` component exists with `title`, `value`, `change`, `yoyChange`, `icon`, `color`, `channel`
- Uses CSS classes from globals: `.metric-card`, `.metric-label`, `.metric-value`, `.metric-badge`
- `channelColorMap` added recently for branded icon backgrounds
- BUT: simpler channel sections (LinkedIn, TikTok, Microsoft, CallRail, HubSpot, YouTube) **don't use `MetricCard`** — they build their own inline-styled cards
- Result: 3 different card patterns across the platform

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 4.1 | LinkedIn, TikTok, Microsoft, CallRail, HubSpot, YouTube build custom inline-styled cards instead of using `MetricCard` | Migrate all to `<MetricCard>` — add any missing props (e.g. `subtitle`, `icon`) | **Critical** |
| 4.2 | MetricCard has no sparkline/trend indicator | Add optional `sparkline?: number[]` prop that renders a tiny 80×24 inline SVG area chart inside the card | High |
| 4.3 | MetricCard YoY badge and period badge styling inconsistent (different padding, font-size) | Standardise both badges to `fontSize: 11, padding: 2px 8px, borderRadius: 99px` | Medium |
| 4.4 | No tooltip on MetricCard hovering over the change badge | Add `title` attribute or tooltip explaining "vs previous period" / "vs same period last year" | Medium |
| 4.5 | MetricCard icon background is just Tailwind opacity class — no depth | Use channel brand colour with 8% opacity background + subtle 1px border in same hue | Medium |
| 4.6 | Stat cards on dashboard overview (`.stat-card`) are a completely different component from `.metric-card` | Unify into one component with a `variant="dashboard"` or `size="lg"` prop, or clearly differentiate their purposes | Medium |
| 4.7 | MetricCard value truncation with `clamp()` can clip currency symbols | Add `overflow: visible` or detect long values and reduce font-size | Low |
| 4.8 | No loading state for individual metric cards | Add a skeleton variant: `<MetricCard loading />` showing shimmer in place of value/badge | High |

---

## 5. Tables

### Current State
- **No shared table component** — every section builds tables from raw `<table>` elements with inline styles
- `.data-table` class exists in CSS but is virtually unused (only adds hover `tr:hover td`)
- Padding inconsistent: `8px 12px`, `10px 12px`, `10px 14px`, `10px 16px`, `8px 16px`, `14px 16px` across files
- Header styling varies: some use `uppercase` + `11px`, others use `12px` + `600 weight`, or `10px`
- No sorting, filtering, or pagination on any table
- No sticky headers on long tables
- Tables not responsive — horizontal scroll added with `overflow-x: auto` wrapper on some, but not all

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 5.1 | No shared `DataTable` component | Create `src/components/ui/DataTable.tsx` with columns config, sorting, optional pagination, optional search, responsive scroll wrapper, sticky header, hover rows | **Critical** |
| 5.2 | Inconsistent cell padding across all tables | Standardise: header `10px 16px`, body `12px 16px` (generously readable) | High |
| 5.3 | Inconsistent header font treatment | Standardise: `fontSize: 11px`, `fontWeight: 700`, `textTransform: uppercase`, `letterSpacing: 0.07em`, `color: var(--text-3)` | High |
| 5.4 | No column sorting | Add sortable columns with arrow indicators (▲/▼) — at minimum for numeric columns | High |
| 5.5 | No table pagination | For tables with >20 rows (campaigns, keywords, pages), add "Show 10 / 25 / All" with page controls | High |
| 5.6 | No sticky table headers on scroll | Add `position: sticky; top: 0; z-index: 1; background: var(--surface)` on `<thead>` when table is in scrollable container | Medium |
| 5.7 | No row click action on campaign/keyword tables | Add `cursor: pointer` + row click to expand/drill-down on tables that have detail views | Medium |
| 5.8 | ROAS/performance colouring inconsistent | All 3-tier performance colouring (green/amber/red) should use shared `getPerformanceColor(value, thresholds)` util | Medium |
| 5.9 | No export button on tables | Add "Copy" and "Export CSV" buttons for data tables (useful for agency client reporting) | Medium |
| 5.10 | No zebra striping or row dividers on some tables | Standardise with alternating `var(--bg)` / `var(--surface)` rows OR consistent `border-bottom` | Low |
| 5.11 | Number alignment — some right-aligned, some left | All numeric columns should be `text-align: right` | Medium |

### DataTable Component Spec

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: {
    key: string;
    label: string;
    align?: "left" | "center" | "right";
    sortable?: boolean;
    render?: (value: unknown, row: T) => React.ReactNode;
    width?: string;
  }[];
  pageSize?: number;       // 0 = no pagination
  searchable?: boolean;
  stickyHeader?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  exportable?: boolean;
  loading?: boolean;
}
```

---

## 6. Charts & Graphs

### Current State
- All charts use Recharts (AreaChart, BarChart, PieChart, LineChart)
- Heights vary: 180px, 200px, 220px, 240px, 260px, 280px, 300px
- Gradient definitions duplicated per component (every section defines its own `<defs>`)
- Tooltip styling varies between components (some with shadow, some without; font-size 11 or 12)
- Axis styling varies: `#64748b` in some, `#94a3b8` in others
- CartesianGrid stroke: `#e2e8f0` in most, `#f1f5f9` in SearchConsole
- No chart animations configured
- No chart loading/error states
- Mini charts (inline bars, progress bars, score rings) built from scratch each time
- No shared chart wrapper component

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 6.1 | No shared chart config/wrapper | Create `src/components/ui/ChartWrapper.tsx` wrapping `ResponsiveContainer` with consistent height, loading skeleton, and error state | **Critical** |
| 6.2 | Chart heights inconsistent (180–300px) | Standardise: compact `220px`, standard `280px`, large `340px` — three size tokens | High |
| 6.3 | Tooltip styling varies across components | Create `CHART_TOOLTIP_STYLE` constant: `{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 8px -2px rgb(0 0 0 / 0.08)" }` | High |
| 6.4 | Axis text styling varies | Create `CHART_AXIS_STYLE` constant: `{ fill: "var(--text-3)", fontSize: 11 }` | High |
| 6.5 | CartesianGrid stroke inconsistent | Standardise: `stroke="var(--border-subtle)"` | Medium |
| 6.6 | Gradient `<defs>` duplicated across every chart | Create `ChartGradient` helper component or define common gradients once in the wrapper | Medium |
| 6.7 | No chart animation | Add `animationDuration={600}` and `animationEasing="ease-out"` on all `<Area>`, `<Bar>`, `<Line>` | Medium |
| 6.8 | PieChart donut has inconsistent inner/outer radii | Standardise: `innerRadius={55}`, `outerRadius={85}`, `paddingAngle={2}` | Low |
| 6.9 | No crosshair on hover | Add `<Tooltip cursor={{ stroke: "var(--border)", strokeWidth: 1 }}` to all charts | Medium |
| 6.10 | No chart legend styling consistency | Standardise: `wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "var(--text-2)" }}` | Medium |
| 6.11 | Mini inline charts (progress bars, bar charts, score rings) are ad-hoc | Create `<ProgressBar>`, `<MiniBarChart>`, `<ScoreRing>` shared components | Medium |
| 6.12 | No chart zoom/brush for time-series | Add `<Brush>` component to time-series charts (GA4, SEMrush, Google Ads) for range selection | Low |
| 6.13 | Charts don't adapt height on mobile | Set `height` prop responsive: smaller on `<768px` viewport | Medium |

### Shared Chart Constants (`src/lib/chart-config.ts`)

```typescript
export const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 4px 8px -2px rgb(0 0 0 / 0.08)",
  },
  labelStyle: { color: "var(--text-2)", fontSize: 11 },
  cursor: { stroke: "var(--border)", strokeWidth: 1 },
};

export const CHART_AXIS = {
  tick: { fill: "var(--text-3)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

export const CHART_GRID = {
  strokeDasharray: "3 3",
  stroke: "var(--border-subtle)",
};

export const CHART_HEIGHTS = { compact: 220, standard: 280, large: 340 };
```

---

## 7. Channel Section Consistency

### Current State
This is the **biggest UX problem** on the platform. Each channel section was written independently, and they diverge in:

| Aspect | GA4 / Meta / Google Ads / SemRush | LinkedIn / TikTok / Microsoft / CallRail / HubSpot / YouTube |
|--------|-----------------------------------|------------------------------------------------------------|
| Metric cards | `<MetricCard>` component | Custom inline-styled `<div>` cards |
| Card grid | Tailwind `grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5` | Inline `gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))"` |
| Table styling | Mix of Tailwind + inline | Pure inline styles |
| Loading state | `<LoadingSpinner size="lg">` centered | Loader2 icon with inline `animation` |
| Error state | `rounded-xl border border-red-200 bg-red-50 p-6 text-center` | Custom inline-styled div |
| Header | `h2` with `text-xl font-bold text-slate-900` | `h2` with `fontSize: 18, fontWeight: 700` inline |
| Charts | Recharts with gradients, dual axes, legends | None (most simpler channels have no charts at all) |
| Alert system | Full alert box with severity badges | None |
| AI sections | Full AI commentary with show/hide | Minimal or none |

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 7.1 | 6 "simpler" channel sections use custom inline cards | Migrate to `<MetricCard>` | **Critical** |
| 7.2 | Channel sections have different grid layouts | Standardise: `<MetricGrid>` component with `cols={4}` (default) or `cols={6}` for dense data | **Critical** |
| 7.3 | Loading states differ between sections | Create `<SectionLoading channel="meta" />` with channel brand colour spinner + consistent layout | High |
| 7.4 | Error states differ between sections | Create `<SectionError channel="meta" error={error} onRetry={refetch} />` standardised component | High |
| 7.5 | Section headers (channel name + icon) render differently | Create `<SectionHeader icon={...} title="Meta Ads" subtitle="Campaign Performance" />` | High |
| 7.6 | Simpler channels have no charts — data is table-only | Add at minimum a trend area chart where time-series data exists (LinkedIn campaigns over time, TikTok daily spend) | Medium |
| 7.7 | Simpler channels have no alert/signal system | Extend alert engine to cover all channels with threshold-based alerts | Medium |
| 7.8 | AI commentary availability varies by channel | Ensure every channel that has data also has an AI summary endpoint | Medium |

### Shared Section Primitives

Create these reusable channel section building blocks in `src/components/dashboard/shared/`:

```
MetricGrid.tsx         — Responsive grid wrapper for MetricCards
SectionHeader.tsx      — Channel icon + title + subtitle + optional actions
SectionLoading.tsx     — Channel-branded loading spinner
SectionError.tsx       — Standardised error card with retry
SectionAlertBox.tsx    — Severity-tiered alert display
SectionChartCard.tsx   — Card wrapper for charts with title + optional AI toggle
```

---

## 8. Reports & PDF Export

### Current State
- Report builder has section sidebar + main content + optional right panel
- Sections can be reordered via drag-and-drop
- PDF export via Puppeteer works
- Text sections have rich text editing
- Screenshots can be uploaded with captions
- Print CSS rules exist for clean PDF output

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 8.1 | Report section sidebar has no visual distinction for complete vs incomplete sections | Add status indicator (green dot for sections with data, grey for empty) | High |
| 8.2 | No cover page customisation | Allow users to upload a logo, change cover colours, add custom subtitle | Medium |
| 8.3 | Section reordering drag handles not discoverable | Add a visible grip icon (⠿) that appears on hover, not just on the hidden left margin | Medium |
| 8.4 | No page break controls in PDF | Add a "Page break before this section" toggle per section | Medium |
| 8.5 | TextSection empty state looks like a bug | Improve the empty state to make it clear it's optional — "Add commentary" CTA button | Medium |
| 8.6 | No report preview vs edit mode toggle | Add a "Preview" button that shows the report as the client would see it (read-only, clean) | Medium |
| 8.7 | Charts in printed reports can be cut across pages | Ensure `break-inside: avoid` on all chart containers (currently only set on `.card`, `.metric-card`, `.stat-card`) | High |
| 8.8 | Tables overflow PDF page width | Add `@media print { table { font-size: 10px; } }` and enforce max widths | Medium |

---

## 9. Tools Pages

### Current State
- Keyword Planner: rich interface with search, results grid, trend charts, export
- Proposals: form-based generator with AI copy, shareable links, PDF
- Content Strategy: AI-generated, HTML output, shareable
- Media Plan: budget allocation with channel breakdown
- Page Analyser: URL input, scores, recommendations

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 9.1 | Keyword planner results table has no column sorting | Add sortable columns for volume, difficulty, CPC, competition | High |
| 9.2 | Keyword planner trend chart is small (200px) and easy to miss | Increase to standard 280px, add toggle to expand | Medium |
| 9.3 | Proposal builder form is a single long scroll | Break into step wizard: 1) Client info → 2) Strategy → 3) Budget → 4) Review | Medium |
| 9.4 | No progress indicator on multi-step AI generation | Add step-by-step progress bar when AI is generating (system prompt, data fetch, generation, formatting) | Medium |
| 9.5 | Media plan channel allocation uses inline grid layout with fixed columns | Make responsive with collapsible mobile cards | Medium |
| 9.6 | Content strategy HTML output has its own styles that don't match platform | Ensure `.game-plan-html` patterns are reused for all AI HTML outputs (content strategy, proposals) | Low |
| 9.7 | Page analyser has no visual score gauge | Add `<ScoreRing>` component for Core Web Vitals, SEO score, etc. | Medium |
| 9.8 | No tool page has a "Recently used" or "History" sidebar | Add a collapsible sidebar showing recent keyword searches, past proposals, etc. | Low |

---

## 10. Forms & Inputs

### Current State
- `.form-input` class exists and is well-styled with focus ring
- BUT many inputs use inline `style={{...}}` instead of the class
- Select elements use a mix of native `<select>` and inline-styled versions
- No radio button or toggle switch components
- Checkbox styling relies on `accentColor` — not cross-browser consistent
- No form validation visual feedback (red borders, error messages)

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 10.1 | Many inputs use inline styles instead of `.form-input` | Audit and migrate all `<input style={{...}}>` to use `.form-input` class | High |
| 10.2 | No `.form-select` class | Add `.form-select` with custom dropdown arrow, consistent with `.form-input` | High |
| 10.3 | No `.form-textarea` class | Add `.form-textarea` extending `.form-input` with `resize: vertical`, `min-height: 80px` | Medium |
| 10.4 | No toggle switch component | Create `<Toggle>` component for boolean settings (e.g. "Include AI" toggles) | Medium |
| 10.5 | No validation error display pattern | Add `.form-error` class: red border on input + red helper text below | High |
| 10.6 | Checkbox uses `accentColor` only — poor cross-browser | Create custom `.form-checkbox` with accessible custom styling | Low |
| 10.7 | Date inputs (`input[type="date"]`) unstyled and browser-default | Style date inputs to match `.form-input` — or use a date-picker library | Medium |
| 10.8 | No character count on textareas with limits | Add optional `maxLength` display: "142/500 characters" below textarea | Low |

---

## 11. Modals & Dialogs

### Current State
- Modal pattern exists: `position: fixed; inset: 0; z-index: 999; background: rgba(15,23,42,0.45)`
- `ScreenshotCaptionDialog` and inline delete confirmations are the main uses
- No shared `<Modal>` component — each usage is implemented inline
- Overlay click-to-close exists
- No `Escape` key handling in all modals
- No focus trap

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 11.1 | No shared `<Modal>` component | Create `src/components/ui/Modal.tsx` with overlay, content, close button, focus trap, Escape handling, animation | **Critical** |
| 11.2 | No entry/exit animation on modals | Add `opacity: 0 → 1` + `scale(0.96) → scale(1)` transition on mount | Medium |
| 11.3 | Inline delete confirmations are hard to discover | Use the `<Modal>` for destructive confirmations with red accent | Medium |
| 11.4 | No `aria-modal`, `role="dialog"`, or `aria-labelledby` on modal overlays | Add to shared Modal component | High |
| 11.5 | Body scroll not locked when modal is open | Add `document.body.style.overflow = 'hidden'` on mount, restore on unmount | Medium |
| 11.6 | Z-index hardcoded to 999 in all modals | Use `var(--z-modal)` token | Low |

### Modal Component Spec

```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg";  // 380, 520, 720
  children: React.ReactNode;
  footer?: React.ReactNode;
  destructive?: boolean;
}
```

---

## 12. Loading & Error States

### Current State
- Three different loading patterns:
  1. `<LoadingSpinner>` (shared component) — used by GA4, SemRush, SearchConsole
  2. `<Loader2>` icon with inline `animation: "spin 1s linear infinite"` — used by LinkedIn, TikTok, Microsoft, HubSpot, YouTube, CallRail
  3. `<PageSkeleton>` with shimmer — used on page-level loads
- Error patterns:
  1. Tailwind classes: `rounded-xl border border-red-200 bg-red-50 p-6 text-center` — GA4, SemRush
  2. Custom inline `.section-error` — TikTok, Microsoft
  3. Simple text — LinkedIn, CallRail

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 12.1 | LoadingSpinner and Loader2 icon used inconsistently | All sections should use `<LoadingSpinner>` — remove direct Loader2 usage | High |
| 12.2 | No skeleton loading for data sections | Create `<SectionSkeleton>` with 4 metric card skeletons + 1 table skeleton (7 rows) | High |
| 12.3 | No skeleton loading for individual cards | `<MetricCard loading />` variant | High |
| 12.4 | Error state has no consistent retry mechanism | All error states should include a "Retry" button calling the section's `refetch` | High |
| 12.5 | No partial loading states — whole section shows spinner until ALL data ready | Show metric cards as soon as overview loads, then progressively fill in tables/charts | Medium |
| 12.6 | No error boundary per section | Wrap each channel section in an error boundary so one failing section doesn't break the whole dashboard | High |
| 12.7 | Toast notifications only used in 2 places | Expand toast usage: on save, delete, copy, export actions across the platform | Medium |
| 12.8 | PageSkeleton shimmer could be more convincing | Match actual page layout (sidebar + metric grid + chart + table) instead of generic bars | Low |

---

## 13. Empty States

### Current State
- `.empty-state` class exists with dashed border, icon, title, description
- Used on clients list, reports list, tools pages
- But channel sections just show nothing or "No data available" plain text when data is missing
- Goals, Actions, Communications have decent empty states
- No illustrations or visual guides

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 13.1 | Channel sections with no data show blank space or plain text | Use `<EmptyState>` component with channel-specific messaging: "No Meta Ads data — connect your account in Settings" | High |
| 13.2 | Empty states lack actionable CTAs | Every empty state should have a button: "Connect [channel]", "Create first [item]", "Import data" | High |
| 13.3 | No illustration/icon differentiation between empty types | Use different icons: disconnected plug (no integration), empty box (no data), search (no results) | Medium |
| 13.4 | Reports list empty state could show a sample template | Add "Start from template" option alongside "Create blank report" | Low |

---

## 14. Alerts & Signals

### Current State
- GA4, Meta, Google Ads, and SemRush have alert systems with severity badges (high/medium/low)
- Signals section deduplicates and aggregates alerts across platforms
- Alert styling: coloured border + background, severity badge, metric + recommendation text
- Simpler channels have NO alerts at all (LinkedIn, TikTok, Microsoft, HubSpot, YouTube, CallRail, Klaviyo)

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 14.1 | Alert box styling hardcoded per section | Create `<AlertCard severity="high|medium|low">` shared component | High |
| 14.2 | Alert severity colours hardcoded to 3-4 different hex values | Use `STATUS_COLORS` from design tokens | Medium |
| 14.3 | No alert dismissal/acknowledge mechanism | Add "Dismiss" button that stores dismissed alerts in DB per client per period | Medium |
| 14.4 | Simpler channels have zero alerting | Add basic threshold alerts: LinkedIn (low CTR), TikTok (high CPA), CallRail (missed call spike), etc. | Medium |
| 14.5 | Signals section has no filtering by severity or platform | Add severity filter pills and platform multi-select filter | Medium |
| 14.6 | Alert recommendations are plain text | Format recommendations as actionable cards with "Do this" + "Expected impact" structure | Low |

---

## 15. Accessibility

### Current State
- `<LoadingSpinner>` has `role="status"` + `aria-label` ✓
- Toast has `aria-live="polite"` ✓
- ScreenshotCaptionDialog has `htmlFor`/`id` association ✓
- BUT: many gaps across the platform

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 15.1 | Interactive elements (icon buttons) have no `aria-label` | Audit all `<button>` with just an icon — add `aria-label="Delete"`, `aria-label="Refresh"`, etc. | **Critical** |
| 15.2 | Modals have no `role="dialog"`, `aria-modal`, focus trap | Add to shared Modal component | **Critical** |
| 15.3 | Tab panels have no `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected` | Add proper WAI-ARIA tab pattern to ClientDashboard tabs | High |
| 15.4 | Tables have no `<caption>` or `aria-label` | Add `aria-label="Campaign performance data"` to each `<table>` | Medium |
| 15.5 | Colour-only status indicators (ROAS green/amber/red) | Add text fallback or icon alongside colour (✓ Good / ⚠ Fair / ✗ Poor) | High |
| 15.6 | Charts are invisible to screen readers | Add `aria-label` on chart containers + a text summary of key data points | Medium |
| 15.7 | Sidebar navigation has no `aria-current="page"` on active item | Add `aria-current="page"` alongside the `active` class | Medium |
| 15.8 | Skip-to-content link missing | Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` | Medium |
| 15.9 | Focus rings inconsistent — some use `box-shadow`, some use `outline` | Standardise: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible` | Medium |
| 15.10 | No reduced-motion support | Add `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` | Medium |

---

## 16. Responsive & Mobile

### Current State
- Sidebar responsive with mobile slide-out ✓
- `.page` container responsive padding ✓
- `.grid-2`, `.grid-3`, `.grid-4` collapse at breakpoints ✓
- BUT: data-heavy components (tables, charts, metric grids) don't adapt well

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 16.1 | Tables on mobile are scroll-only — no card layout alternative | For tables with >5 columns, add a mobile card view that stacks key fields vertically | High |
| 16.2 | MetricCard grid sometimes shows 6 columns (`xl:grid-cols-6`) — too dense on tablets | Cap at 4 columns on tablet viewports (768–1024px) | Medium |
| 16.3 | Charts don't reduce height on mobile | Set `height={200}` below 768px viewport width (currently 280-300px) | Medium |
| 16.4 | Period pills row wraps awkwardly on narrow screens | Use horizontal scroll with fade edges instead of wrapping | Medium |
| 16.5 | Report builder layout (sidebar + content + panel) breaks on mobile | Stack to single column: sidebar becomes a dropdown, content fills width | High |
| 16.6 | Tool pages (keyword planner, proposals) have fixed-width layouts | Make all tool forms responsive with stacked fields below 640px | Medium |
| 16.7 | Login/landing page responsive already handled | No action needed — verified working | — |
| 16.8 | Modal max-width of 380px is fine on mobile, but larger modals need viewport awareness | Add `maxWidth: min(720px, calc(100vw - 32px))` for `lg` modals | Low |

---

## 17. Micro-interactions & Animation

### Current State
- Minimal: button hover transitions (`0.15s`), sidebar collapse (`0.25s`), toast slide-in
- Tab content fades on switch (opacity 0.2s)
- Progress bars have `transition: width 0.5s ease`
- Score ring has `stroke-dashoffset 0.6s ease`
- No page transitions, no Recharts animations, no skeleton-to-content transitions

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 17.1 | No staggered entrance animation on metric card grids | Add `animation-delay` stagger (0, 50ms, 100ms, 150ms...) as cards mount | Medium |
| 17.2 | No Recharts animation config | Add `animationDuration={600}` + `animationEasing="ease-out"` to all chart elements | Medium |
| 17.3 | No number counting animation on stat card values | Animate values from 0 to final number on mount using `requestAnimationFrame` or a library like `react-countup` | Medium |
| 17.4 | Tab content switches instantly (only opacity fade) | Add subtle vertical slide: `transform: translateY(4px)` → `translateY(0)` with `opacity: 0` → `1` | Low |
| 17.5 | Table rows appear all at once | Add staggered fade-in on table row mount (for first 20 rows max) | Low |
| 17.6 | No hover card lift on metric cards | Add `transform: translateY(-2px)` + shadow increase on `.metric-card:hover` | Medium |
| 17.7 | No success feedback on save actions | Flash green on saved elements (e.g. goal saved, action updated) — use ring pulse animation | Medium |
| 17.8 | Toast exit animation missing | Add slide-out + fade on dismiss (currently just disappears) | Low |

---

## 18. Colour System & Dark Mode Prep

### Current State
- Light theme tokens well-established
- No dark mode at all
- Many hardcoded `#ffffff`, `#000000`, `bg-red-50`, `text-slate-900` that would break in dark mode
- Charts use hardcoded light-theme colours

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 18.1 | No dark mode CSS | Add `[data-theme="dark"] :root` override block with dark equivalents for all tokens | Medium |
| 18.2 | Hardcoded `#ffffff` and `white` across components | Replace with `var(--surface)` or `var(--bg)` | High |
| 18.3 | Tailwind colour classes (`bg-red-50`, `text-slate-900`) don't support dark mode | Replace with CSS variable equivalents from globals.css | Medium |
| 18.4 | Charts use `#ffffff` for tooltip backgrounds | Replace with `var(--surface)` | Medium |
| 18.5 | Alert backgrounds use light hex colours | Replace with CSS variable tokens that flip in dark mode | Medium |
| 18.6 | No theme toggle in sidebar footer | Add sun/moon toggle button that sets `data-theme` on `<html>` + persists to `localStorage` | Medium |

### Dark Mode Token Block (add to globals.css)

```css
[data-theme="dark"] {
  --bg:            #0f1117;
  --surface:       #1a1d27;
  --border:        #2d3348;
  --border-subtle: #232738;
  --text:          #e2e8f0;
  --text-2:        #94a3b8;
  --text-3:        #64748b;
  --text-4:        #475569;
  --accent:        #818cf8;
  --accent-hover:  #6366f1;
  --accent-bg:     rgba(99, 102, 241, 0.12);
  --accent-text:   #a5b4fc;
  --shadow-xs:     0 1px 2px 0 rgb(0 0 0 / 0.2);
  --shadow-sm:     0 1px 3px 0 rgb(0 0 0 / 0.3);
  --shadow:        0 4px 8px -2px rgb(0 0 0 / 0.4);
}
```

---

## 19. Typography

### Current State
- Base: Inter, 14px, line-height 1.6
- Page title: 26px/700
- Section title: 20px/700
- Card title: 15px/600
- Metric label: 12px/600 uppercase
- Body text: 14px
- Small text: 13px, 12px, 11px, 10px — all used freely
- Good letter-spacing on titles (`-0.4px`, `-0.3px`)

### Improvements

| # | Finding | Fix | Priority |
|---|---------|-----|----------|
| 19.1 | Four small text sizes used interchangeably (10, 11, 12, 13px) — inconsistent | Reduce to 2: `--text-xs: 12px` (labels, captions) and `--text-sm: 13px` (secondary text) | Medium |
| 19.2 | No heading hierarchy enforced in channel sections | Section headers should use `.section-title` (20px), sub-sections `.card-title` (15px) — currently mixed | Medium |
| 19.3 | Table header text transforms vary (`uppercase` in some, normal in others) | Standardise: all table headers uppercase 11px 700 weight | Medium |
| 19.4 | No `font-variant-numeric: tabular-nums` on numbers | Add to all metric values, table cells with numbers — prevents layout shift | Medium |
| 19.5 | Line-height on metric values is 1.2 — could be tighter for large numbers | Use `line-height: 1` on `.metric-value` and `.stat-card-value` | Low |
| 19.6 | No monospace styling for code-like content (API keys, error digests) | Add `.font-mono` utility: `font-family: 'JetBrains Mono', 'SF Mono', monospace; font-size: 0.9em` | Low |

---

## 20. Implementation Priority

### Phase 1: Foundation (Week 1–2)
*Build the shared components that everything else depends on.*

| Task | Section | Impact |
|------|---------|--------|
| Create `src/lib/design-tokens.ts` (colour maps) | §2 | Foundation for all other work |
| Create `<DataTable>` component | §5 | Unblocks all table standardisation |
| Create `<Modal>` component | §11 | Unblocks all dialog standardisation |
| Create chart config constants | §6 | Unblocks all chart standardisation |
| Create `<MetricGrid>` wrapper | §7 | Unblocks card grid standardisation |
| Create `<SectionHeader>`, `<SectionLoading>`, `<SectionError>` | §7 | Unblocks section standardisation |
| Add semantic CSS tokens (status bg/border, channel, z-index) | §2 | Foundation |
| Add missing `.form-select`, `.form-textarea` classes | §10 | Foundation |

### Phase 2: Channel Section Unification (Week 2–3)
*Make every channel section look and feel identical.*

| Task | Section | Impact |
|------|---------|--------|
| Migrate 6 simpler channels to `<MetricCard>` | §4, §7 | Massive visual consistency win |
| Migrate all tables to `<DataTable>` or `.data-table` | §5 | Consistent tables everywhere |
| Standardise all chart tooltip/axis/grid styling | §6 | Visual consistency |
| Standardise loading/error states across all sections | §12 | Polish |
| Add error boundaries per section | §12 | Reliability |
| Add `<Breadcrumb>` component | §3 | Navigation clarity |

### Phase 3: Interactivity & Polish (Week 3–4)
*Make the platform feel modern and responsive.*

| Task | Section | Impact |
|------|---------|--------|
| Add table sorting + pagination | §5 | Major usability improvement |
| Add metric card sparklines | §4 | Visual interest, at-a-glance trends |
| Add chart animations | §17 | Visual polish |
| Add metric card hover lift + stagger animation | §17 | Modern feel |
| Add tab overflow fade indicators | §3 | UX papercut fix |
| Migrate inline-styled inputs to `.form-input` | §10 | Consistency |
| Add form validation error display | §10 | UX improvement |

### Phase 4: Accessibility & Responsive (Week 4–5)
*Make the platform work for everyone on every device.*

| Task | Section | Impact |
|------|---------|--------|
| Audit and add `aria-label` to all icon buttons | §15 | A11y compliance |
| Add WAI-ARIA tab pattern to ClientDashboard | §15 | A11y compliance |
| Add focus trap + Escape to Modal | §11, §15 | A11y compliance |
| Add `aria-current="page"` to sidebar | §15 | A11y compliance |
| Add skip-to-content link | §15 | A11y compliance |
| Add mobile card layout for dense tables | §16 | Mobile usability |
| Add responsive chart heights | §16, §6 | Mobile usability |
| Add reduced-motion support | §15 | A11y compliance |

### Phase 5: Dark Mode & Advanced (Week 5–6)
*Nice-to-have polish for power users.*

| Task | Section | Impact |
|------|---------|--------|
| Add dark mode token block | §18 | New capability |
| Add theme toggle in sidebar | §18 | User preference |
| Replace hardcoded colours with tokens for dark mode compat | §18 | Dark mode support |
| Add `Cmd+K` command palette | §3 | Power user feature |
| Add chart brush/zoom | §6 | Power user feature |
| Add tool history sidebar | §9 | Convenience |
| Add number count-up animations | §17 | Visual delight |

---

## Appendix A: Component Inventory

| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `DataTable` | `src/components/ui/DataTable.tsx` | Shared sortable, paginated, searchable table | ✅ Created |
| `Modal` | `src/components/ui/Modal.tsx` | Shared accessible dialog | ✅ Created |
| `Sparkline` | `src/components/ui/Sparkline.tsx` | Tiny SVG line for MetricCard | ✅ Created |
| `ProgressBar` | `src/components/ui/ProgressBar.tsx` | Inline progress bar | ✅ Created |
| `ScoreRing` | `src/components/ui/ScoreRing.tsx` | Circular SVG gauge | ✅ Created |
| `Toggle` | `src/components/ui/Toggle.tsx` | Boolean toggle switch | ✅ Created |
| `Breadcrumb` | `src/components/ui/Breadcrumb.tsx` | Path breadcrumb navigation | ✅ Created |
| `MetricGrid` | `src/components/dashboard/shared/MetricGrid.tsx` | Responsive grid wrapper for MetricCards | ✅ Created |
| `SectionHeader` | `src/components/dashboard/shared/SectionHeader.tsx` | Channel section header with icon + title | ✅ Created |
| `SectionLoading` | `src/components/dashboard/shared/SectionLoading.tsx` | Channel-branded loading state | ✅ Created |
| `SectionError` | `src/components/dashboard/shared/SectionError.tsx` | Standardised error with retry | ✅ Created |
| `SectionSkeleton` | `src/components/dashboard/shared/SectionSkeleton.tsx` | Skeleton loading for full section | ✅ Created |
| `AlertCard` | `src/components/dashboard/shared/AlertCard.tsx` | Severity-tiered alert display | ✅ Created |
| `MetricCard` (sparkline + loading) | `src/components/ui/MetricCard.tsx` | Updated with `sparkline` + `loading` props | ✅ Updated |
| `ChartWrapper` | `src/components/ui/ChartWrapper.tsx` | Recharts container with loading/error | 🔲 Pending Phase 3 |
| `MiniBarChart` | `src/components/ui/MiniBarChart.tsx` | Inline div-based bars | 🔲 Pending Phase 3 |

## Appendix B: Shared Config Files

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/design-tokens.ts` | Channel colours, status colours, chart palette | ✅ Created |
| `src/lib/chart-config.ts` | Shared Recharts tooltip, axis, grid, height constants | ✅ Created |

## Appendix C: Files That Need the Most Work

Ranked by number of inconsistencies found:

1. **GA4Section.tsx** — largest component, most inline styles, needs DataTable + chart config migration
2. **MetaSection.tsx** — second largest, same issues as GA4
3. **GoogleAdsSection.tsx** — third largest, same pattern
4. **SemrushSection.tsx** — complex table + chart combinations
5. **TikTokSection.tsx** — uses no MetricCard, no DataTable, custom loading/error
6. **LinkedInSection.tsx** — same as TikTok
7. **MicrosoftAdsSection.tsx** — same as TikTok
8. **YouTubeSection.tsx** — same as TikTok
9. **HubSpotSection.tsx** — same as TikTok
10. **CallRailSection.tsx** — same as TikTok
11. **KlaviyoSection.tsx** — same as TikTok, plus broken JSX comments (now fixed)
12. **EcommerceSection.tsx** — chart config migration needed
13. **globals.css** — needs dark mode block, semantic tokens, missing form classes
