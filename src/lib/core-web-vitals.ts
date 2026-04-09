// Core Web Vitals data from Google's Chrome UX Report (CrUX) API
// Free Google API that provides real-user performance data

const CRUX_API_URL = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

export interface CoreWebVitalsData {
  lcp: MetricData | null;      // Largest Contentful Paint (ms)
  cls: MetricData | null;      // Cumulative Layout Shift (score)
  inp: MetricData | null;      // Interaction to Next Paint (ms)
  fid: MetricData | null;      // First Input Delay (ms) — deprecated but still reported
  ttfb: MetricData | null;     // Time to First Byte (ms)
  fcp: MetricData | null;      // First Contentful Paint (ms)
  overallCategory: "good" | "needs-improvement" | "poor" | "unknown";
  fetchedAt: string;
  origin: string;
}

export interface MetricData {
  p75: number;                 // 75th percentile value
  good: number;                // % of experiences rated "good"
  needsImprovement: number;    // % rated "needs improvement"
  poor: number;                // % rated "poor"
  category: "good" | "needs-improvement" | "poor";
}

// Thresholds from https://web.dev/metrics/
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  largest_contentful_paint: { good: 2500, poor: 4000 },
  cumulative_layout_shift: { good: 0.1, poor: 0.25 },
  interaction_to_next_paint: { good: 200, poor: 500 },
  first_input_delay: { good: 100, poor: 300 },
  experimental_time_to_first_byte: { good: 800, poor: 1800 },
  first_contentful_paint: { good: 1800, poor: 3000 },
};

function categorise(metric: string, p75: number): "good" | "needs-improvement" | "poor" {
  const t = THRESHOLDS[metric];
  if (!t) return "good";
  if (p75 <= t.good) return "good";
  if (p75 >= t.poor) return "poor";
  return "needs-improvement";
}

function parseMetric(record: Record<string, unknown>, metricKey: string): MetricData | null {
  const metric = (record as Record<string, Record<string, unknown>>)?.[metricKey];
  if (!metric?.percentiles) return null;

  const p75 = (metric.percentiles as Record<string, number>)?.p75 ?? 0;
  const histogram = (metric.histogram as Array<{ density: number }>) ?? [];

  const good = (histogram[0]?.density ?? 0) * 100;
  const needsImprovement = (histogram[1]?.density ?? 0) * 100;
  const poor = (histogram[2]?.density ?? 0) * 100;

  return {
    p75,
    good: Math.round(good * 10) / 10,
    needsImprovement: Math.round(needsImprovement * 10) / 10,
    poor: Math.round(poor * 10) / 10,
    category: categorise(metricKey, p75),
  };
}

export async function getCoreWebVitals(url: string): Promise<CoreWebVitalsData> {
  const apiKey = process.env.GOOGLE_CRUX_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Google CrUX API key not configured. Set GOOGLE_CRUX_API_KEY or GOOGLE_API_KEY.");
  }

  // Parse the origin from the URL
  let origin: string;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    origin = parsed.origin;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const response = await fetch(`${CRUX_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      // No CrUX data for this origin
      return {
        lcp: null, cls: null, inp: null, fid: null, ttfb: null, fcp: null,
        overallCategory: "unknown",
        fetchedAt: new Date().toISOString(),
        origin,
      };
    }
    const errorText = await response.text();
    throw new Error(`CrUX API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const metrics = data.record?.metrics ?? {};

  const lcp = parseMetric(metrics, "largest_contentful_paint");
  const cls = parseMetric(metrics, "cumulative_layout_shift");
  const inp = parseMetric(metrics, "interaction_to_next_paint");
  const fid = parseMetric(metrics, "first_input_delay");
  const ttfb = parseMetric(metrics, "experimental_time_to_first_byte");
  const fcp = parseMetric(metrics, "first_contentful_paint");

  // Overall category: worst of LCP, CLS, INP
  const coreMetrics = [lcp, cls, inp].filter(Boolean) as MetricData[];
  let overallCategory: "good" | "needs-improvement" | "poor" | "unknown" = "unknown";
  if (coreMetrics.length > 0) {
    if (coreMetrics.some((m) => m.category === "poor")) overallCategory = "poor";
    else if (coreMetrics.some((m) => m.category === "needs-improvement")) overallCategory = "needs-improvement";
    else overallCategory = "good";
  }

  return { lcp, cls, inp, fid, ttfb, fcp, overallCategory, fetchedAt: new Date().toISOString(), origin };
}

// ---------------------------------------------------------------------------
// Shared helper: build CoreWebVitalsData from a CrUX record metrics object
// ---------------------------------------------------------------------------

function buildCoreWebVitalsData(metrics: Record<string, unknown>, origin: string): CoreWebVitalsData {
  const lcp = parseMetric(metrics, "largest_contentful_paint");
  const cls = parseMetric(metrics, "cumulative_layout_shift");
  const inp = parseMetric(metrics, "interaction_to_next_paint");
  const fid = parseMetric(metrics, "first_input_delay");
  const ttfb = parseMetric(metrics, "experimental_time_to_first_byte");
  const fcp = parseMetric(metrics, "first_contentful_paint");

  const coreMetrics = [lcp, cls, inp].filter(Boolean) as MetricData[];
  let overallCategory: "good" | "needs-improvement" | "poor" | "unknown" = "unknown";
  if (coreMetrics.length > 0) {
    if (coreMetrics.some((m) => m.category === "poor")) overallCategory = "poor";
    else if (coreMetrics.some((m) => m.category === "needs-improvement")) overallCategory = "needs-improvement";
    else overallCategory = "good";
  }

  return { lcp, cls, inp, fid, ttfb, fcp, overallCategory, fetchedAt: new Date().toISOString(), origin };
}

function emptyCoreWebVitalsData(origin: string): CoreWebVitalsData {
  return {
    lcp: null, cls: null, inp: null, fid: null, ttfb: null, fcp: null,
    overallCategory: "unknown",
    fetchedAt: new Date().toISOString(),
    origin,
  };
}

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_CRUX_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Google CrUX API key not configured. Set GOOGLE_CRUX_API_KEY or GOOGLE_API_KEY.");
  }
  return apiKey;
}

function parseOrigin(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.origin;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

function parseFullUrl(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.href;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Page-level CrUX data (specific URL rather than origin)
// ---------------------------------------------------------------------------

export async function getCoreWebVitalsForPage(url: string): Promise<CoreWebVitalsData> {
  const apiKey = getApiKey();
  const fullUrl = parseFullUrl(url);
  const origin = parseOrigin(url);

  const response = await fetch(`${CRUX_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: fullUrl }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return emptyCoreWebVitalsData(origin);
    }
    const errorText = await response.text();
    throw new Error(`CrUX API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const metrics = data.record?.metrics ?? {};
  return buildCoreWebVitalsData(metrics, origin);
}

// ---------------------------------------------------------------------------
// 2. Mobile / Desktop / Tablet form-factor breakdown
// ---------------------------------------------------------------------------

export interface CoreWebVitalsByDevice {
  mobile: CoreWebVitalsData | null;
  desktop: CoreWebVitalsData | null;
  tablet: CoreWebVitalsData | null;
}

const FORM_FACTORS = [
  { key: "mobile" as const, value: "PHONE" },
  { key: "desktop" as const, value: "DESKTOP" },
  { key: "tablet" as const, value: "TABLET" },
];

export async function getCoreWebVitalsByDevice(url: string): Promise<CoreWebVitalsByDevice> {
  const apiKey = getApiKey();
  const origin = parseOrigin(url);

  const results = await Promise.allSettled(
    FORM_FACTORS.map(({ value: formFactor }) =>
      fetch(`${CRUX_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, formFactor }),
      }).then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) return null;
          const errorText = await res.text();
          throw new Error(`CrUX API error (${res.status}): ${errorText}`);
        }
        const data = await res.json();
        const metrics = data.record?.metrics ?? {};
        return buildCoreWebVitalsData(metrics, origin);
      }),
    ),
  );

  const extract = (idx: number): CoreWebVitalsData | null => {
    const r = results[idx];
    return r.status === "fulfilled" ? r.value : null;
  };

  return {
    mobile: extract(0),
    desktop: extract(1),
    tablet: extract(2),
  };
}

// ---------------------------------------------------------------------------
// 3. CrUX History API
// ---------------------------------------------------------------------------

const CRUX_HISTORY_API_URL = "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord";

export interface CoreWebVitalsHistoryEntry {
  collectionPeriod: { firstDate: string; lastDate: string };
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
  fcp: number | null;
}

export interface CoreWebVitalsHistory {
  origin: string;
  entries: CoreWebVitalsHistoryEntry[];
}

interface CrUXDate {
  year: number;
  month: number;
  day: number;
}

function formatCruxDate(d: CrUXDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export async function getCoreWebVitalsHistory(url: string): Promise<CoreWebVitalsHistory> {
  const apiKey = getApiKey();
  const origin = parseOrigin(url);

  const response = await fetch(`${CRUX_HISTORY_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { origin, entries: [] };
    }
    const errorText = await response.text();
    throw new Error(`CrUX History API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const metrics = data.record?.metrics ?? {};
  const collectionPeriods: Array<{ firstDate: CrUXDate; lastDate: CrUXDate }> =
    data.record?.collectionPeriods ?? [];

  const getP75s = (metricKey: string): (number | null)[] => {
    const timeseries = metrics[metricKey]?.percentilesTimeseries?.p75s;
    if (!Array.isArray(timeseries)) return [];
    return timeseries.map((v: unknown) => (v == null ? null : Number(v)));
  };

  const lcpSeries = getP75s("largest_contentful_paint");
  const clsSeries = getP75s("cumulative_layout_shift");
  const inpSeries = getP75s("interaction_to_next_paint");
  const ttfbSeries = getP75s("experimental_time_to_first_byte");
  const fcpSeries = getP75s("first_contentful_paint");

  const entries: CoreWebVitalsHistoryEntry[] = collectionPeriods.map((period, i) => ({
    collectionPeriod: {
      firstDate: formatCruxDate(period.firstDate),
      lastDate: formatCruxDate(period.lastDate),
    },
    lcp: lcpSeries[i] ?? null,
    cls: clsSeries[i] ?? null,
    inp: inpSeries[i] ?? null,
    ttfb: ttfbSeries[i] ?? null,
    fcp: fcpSeries[i] ?? null,
  }));

  return { origin, entries };
}
