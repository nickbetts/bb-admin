"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_AREA_STYLE } from "@/lib/chart-config";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, Delta, LoadingSpinner } from "@/components/ui/index";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { EmptyBlockState } from "@/components/dashboard/shared/EmptyBlockState";
import { formatNumber, formatDateDisplay, pctChange } from "@/lib/utils";
import { DataTable } from "@/components/ui/DataTable";
import { MousePointer, Eye, TrendingUp, Search, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface SearchConsoleSectionProps {
  siteUrl: string;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  googleAdsCustomerId?: string | null;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hideAlerts?: boolean;
  hideAi?: boolean;
  onMetricsReady?: (metrics: Record<string, number>) => void;
  onPreviousMetricsReady?: (metrics: Record<string, number>) => void;
  afterHeader?: ReactNode;
}

interface GSCOverview {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCDailyData {
  date: string;
  clicks: number;
  impressions: number;
}

interface GSCDevice {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCCountry {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCQueryPage {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCPageCountry {
  page: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCDiscoverNews {
  type: string;
  clicks: number;
  impressions: number;
  ctr: number;
  pages: { page: string; clicks: number; impressions: number }[];
}

interface GSCSitemap {
  path: string;
  type: string;
  lastSubmitted: string | null;
  lastDownloaded: string | null;
  isPending: boolean;
  errors: number;
  warnings: number;
  contents: { type: string; submitted: number; indexed: number }[];
}

interface GSCQueryDevice {
  query: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCQueryCountry {
  query: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const DEVICE_COLORS: Record<string, string> = {
  MOBILE: "#6366f1",
  DESKTOP: "#3b82f6",
  TABLET: "#10b981",
};
const DEVICE_FALLBACK_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b"];

type GSCAlert = { severity: "high" | "medium"; label: string; detail: string; recommendation: string };

function positionBadgeClass(pos: number): string {
  if (pos <= 3) return "badge badge-green";
  if (pos <= 10) return "badge badge-blue";
  if (pos <= 20) return "badge badge-orange";
  return "badge badge-slate";
}

export function SearchConsoleSection({
  siteUrl,
  startDate,
  endDate,
  compareStartDate,
  compareEndDate,
  googleAdsCustomerId,
  crossPlatformContext,
  visibleBlocks,
  hideAlerts,
  hideAi,
  onMetricsReady,
  onPreviousMetricsReady,
  afterHeader,
}: SearchConsoleSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const isExplicit = (block: string) => Array.isArray(visibleBlocks) && visibleBlocks.includes(block);
  const [overview, setOverview] = useState<GSCOverview | null>(null);
  const [prevOverview, setPrevOverview] = useState<GSCOverview | null>(null);
  const [queries, setQueries] = useState<GSCQuery[]>([]);
  const [prevQueriesMap, setPrevQueriesMap] = useState<Map<string, GSCQuery>>(new Map());
  const [pages, setPages] = useState<GSCPage[]>([]);
  const [prevPagesMap, setPrevPagesMap] = useState<Map<string, GSCPage>>(new Map());
  const [daily, setDaily] = useState<GSCDailyData[]>([]);
  const [devices, setDevices] = useState<GSCDevice[]>([]);
  const [countries, setCountries] = useState<GSCCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandedSplit, setBrandedSplit] = useState<{ branded: { clicks: number; impressions: number; ctr: number; position: number }; nonBranded: { clicks: number; impressions: number; ctr: number; position: number } } | null>(null);
  const [alertAiRecs, setAlertAiRecs] = useState<string[]>([]);
  const [alertAiLoading, setAlertAiLoading] = useState(false);
  const [queryPage, setQueryPage] = useState<GSCQueryPage[]>([]);
  const [pageCountry, setPageCountry] = useState<GSCPageCountry[]>([]);
  const [discoverNews, setDiscoverNews] = useState<GSCDiscoverNews[]>([]);
  const [sitemaps, setSitemaps] = useState<GSCSitemap[]>([]);
  const [queryDevice, setQueryDevice] = useState<GSCQueryDevice[]>([]);
  const [queryCountry, setQueryCountry] = useState<GSCQueryCountry[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      setPrevOverview(null);
      setPrevQueriesMap(new Map());
      setPrevPagesMap(new Map());
      try {
        // Single bulk call — fetches all current + previous period data in one serverless invocation
        const bulkUrl = `/api/search-console?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${startDate}&endDate=${endDate}&type=bulk${compareStartDate && compareEndDate ? `&compareStartDate=${compareStartDate}&compareEndDate=${compareEndDate}` : ""}`;
        const bulkRes = await fetch(bulkUrl, { signal: controller.signal });

        if (!bulkRes.ok) {
          const err = await bulkRes.json();
          throw new Error(err.error ?? "Failed to fetch Search Console data");
        }

        const { overview: ov, queries: q, pages: p, daily: d, devices: devs, countries: ctrs, prevOverview: prevOv, prevQueries: prevQ, prevPages: prevP } = await bulkRes.json();

        setOverview(ov);
        if (ov) onMetricsReady?.({ clicks: ov.clicks, impressions: ov.impressions, ctr: ov.ctr, position: ov.position });
        setQueries(Array.isArray(q) ? q : []);
        setPages(Array.isArray(p) ? p : []);
        setDaily(Array.isArray(d) ? d : []);
        setPrevOverview(prevOv ?? null);
        if (prevOv) onPreviousMetricsReady?.({ clicks: prevOv.clicks, impressions: prevOv.impressions, ctr: prevOv.ctr, position: prevOv.position });
        setDevices(Array.isArray(devs) ? devs : []);
        setCountries(Array.isArray(ctrs) ? ctrs : []);
        if (Array.isArray(prevQ)) setPrevQueriesMap(new Map(prevQ.map((pq: GSCQuery) => [pq.query, pq])));
        if (Array.isArray(prevP)) setPrevPagesMap(new Map(prevP.map((pp: GSCPage) => [pp.page, pp])));

        // Branded vs Non-Branded split (separate call — not part of bulk)
        fetch(`/api/search-console?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${startDate}&endDate=${endDate}&type=branded-split`, { signal: controller.signal })
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data) setBrandedSplit(data); })
          .catch(() => {});

        // Additional data for new blocks
        const extra = `/api/search-console?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${startDate}&endDate=${endDate}`;
        const [qpRes, pcRes, dnRes, smRes, qdRes, qcRes] = await Promise.all([
          fetch(`${extra}&type=query-page`, { signal: controller.signal }).catch(() => null),
          fetch(`${extra}&type=page-country`, { signal: controller.signal }).catch(() => null),
          fetch(`${extra}&type=discover-news`, { signal: controller.signal }).catch(() => null),
          fetch(`${extra}&type=sitemaps`, { signal: controller.signal }).catch(() => null),
          fetch(`${extra}&type=query-device`, { signal: controller.signal }).catch(() => null),
          fetch(`${extra}&type=query-country`, { signal: controller.signal }).catch(() => null),
        ]);
        const [qpData, pcData, dnData, smData, qdData, qcData] = await Promise.all([
          qpRes?.ok ? qpRes.json().catch(() => []) : Promise.resolve([]),
          pcRes?.ok ? pcRes.json().catch(() => []) : Promise.resolve([]),
          dnRes?.ok ? dnRes.json().catch(() => []) : Promise.resolve([]),
          smRes?.ok ? smRes.json().catch(() => []) : Promise.resolve([]),
          qdRes?.ok ? qdRes.json().catch(() => []) : Promise.resolve([]),
          qcRes?.ok ? qcRes.json().catch(() => []) : Promise.resolve([]),
        ]);
        setQueryPage(Array.isArray(qpData) ? qpData : []);
        setPageCountry(Array.isArray(pcData) ? pcData : []);
        setDiscoverNews(Array.isArray(dnData) ? dnData : []);
        setSitemaps(Array.isArray(smData) ? smData : []);
        setQueryDevice(Array.isArray(qdData) ? qdData : []);
        setQueryCountry(Array.isArray(qcData) ? qcData : []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load Search Console data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, [siteUrl, startDate, endDate, compareStartDate, compareEndDate]);

  // Compute anomaly alerts from GSC data
  const gscAlerts = useMemo<GSCAlert[]>(() => {
    if (!overview || !prevOverview) return [];
    const alerts: GSCAlert[] = [];
    const hasPrev = prevOverview.clicks > 0 || prevOverview.impressions > 0;
    if (!hasPrev) return [];

    const clicksPct = pctChange(overview.clicks, prevOverview.clicks) ?? 0;
    if (clicksPct <= -25)
      alerts.push({ severity: "high", label: "Organic Clicks", detail: `Clicks dropped ${Math.abs(clicksPct).toFixed(0)}% vs previous period (${formatNumber(prevOverview.clicks)} \u2192 ${formatNumber(overview.clicks)})`, recommendation: "Investigate ranking changes and check Google Search Console for manual actions or indexing issues. Review top queries for position drops." });
    else if (clicksPct <= -15)
      alerts.push({ severity: "medium", label: "Organic Clicks", detail: `Clicks declined ${Math.abs(clicksPct).toFixed(0)}% vs previous period`, recommendation: "Compare top queries period-over-period and identify keywords losing positions. Check for SERP feature changes or new competitors." });

    const impressionsPct = pctChange(overview.impressions, prevOverview.impressions) ?? 0;
    if (impressionsPct <= -30)
      alerts.push({ severity: "high", label: "Impressions", detail: `Impressions dropped ${Math.abs(impressionsPct).toFixed(0)}% (${formatNumber(prevOverview.impressions)} \u2192 ${formatNumber(overview.impressions)})`, recommendation: "Check for indexing issues, sitemap errors, or algorithmic penalties. Review Google Search Console coverage report for deindexed pages." });
    else if (impressionsPct <= -15)
      alerts.push({ severity: "medium", label: "Impressions", detail: `Impressions declined ${Math.abs(impressionsPct).toFixed(0)}% vs previous period`, recommendation: "Review keyword rankings for position drops and check for seasonal patterns. Audit recently modified or removed pages." });

    const ctrDiff = (overview.ctr - prevOverview.ctr) * 100;
    if (ctrDiff <= -2)
      alerts.push({ severity: "medium", label: "CTR", detail: `CTR dropped ${Math.abs(ctrDiff).toFixed(1)}pp (${(prevOverview.ctr * 100).toFixed(2)}% \u2192 ${(overview.ctr * 100).toFixed(2)}%)`, recommendation: "Review meta titles and descriptions for top pages. Check if SERP features (featured snippets, PAA) are reducing click-through on key queries." });

    const positionDiff = overview.position - prevOverview.position;
    if (positionDiff >= 3)
      alerts.push({ severity: "high", label: "Avg Position", detail: `Average position worsened by ${positionDiff.toFixed(1)} places (${prevOverview.position.toFixed(1)} \u2192 ${overview.position.toFixed(1)})`, recommendation: "Identify the pages and queries losing rankings. Prioritise content refresh, internal linking improvements, and backlink acquisition for affected pages." });
    else if (positionDiff >= 1.5)
      alerts.push({ severity: "medium", label: "Avg Position", detail: `Average position slipped by ${positionDiff.toFixed(1)} places`, recommendation: "Review top-ranked pages for content freshness and relevance. Check competitor activity for new content targeting the same queries." });

    // Check for top queries losing significant clicks
    const topQueriesDropped = queries.slice(0, 20).filter(q => {
      const prev = prevQueriesMap.get(q.query);
      if (!prev || prev.clicks < 5) return false;
      return (pctChange(q.clicks, prev.clicks) ?? 0) <= -40;
    });
    if (topQueriesDropped.length >= 3)
      alerts.push({ severity: "high", label: "Query Drops", detail: `${topQueriesDropped.length} top queries lost 40%+ clicks vs previous period`, recommendation: "Review the declining queries for ranking and SERP changes. Refresh content, improve internal linking, and check for cannibalisation." });
    else if (topQueriesDropped.length >= 1)
      alerts.push({ severity: "medium", label: "Query Drops", detail: `${topQueriesDropped.length} top quer${topQueriesDropped.length === 1 ? "y" : "ies"} lost 40%+ clicks`, recommendation: "Investigate the declining queries \u2014 check if pages dropped in rankings or if SERP layout changes reduced click-through." });

    return alerts;
  }, [overview, prevOverview, queries, prevQueriesMap]);

  // Fetch AI-generated recommendations for each alert
  useEffect(() => {
    setAlertAiRecs([]);
    if (!gscAlerts.length) return;
    setAlertAiLoading(true);
    fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionType: "alert_recommendations",
        campaignPlatform: "gsc",
        alerts: gscAlerts.map(a => ({ severity: a.severity, label: a.label, detail: a.detail })),
        dateRange: `${startDate} to ${endDate}`,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.recommendations?.length) setAlertAiRecs(json.recommendations); })
      .catch(() => {})
      .finally(() => setAlertAiLoading(false));
  }, [gscAlerts, startDate, endDate]);

  // ─── Keyword Cannibalisation (Organic vs Paid overlap) ────────────────────
  interface CannibalPair {
    query: string;
    organicPosition: number;
    organicClicks: number;
    organicImpressions: number;
    paidClicks: number;
    paidSpend: number;
    paidConversions: number;
    risk: "high" | "medium" | "low";
  }
  interface OverlapSummary {
    total: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    potentialSavings: number;
  }

  const [keywordOverlaps, setKeywordOverlaps] = useState<CannibalPair[]>([]);
  const [overlapSummary, setOverlapSummary] = useState<OverlapSummary | null>(null);
  const [overlapLoading, setOverlapLoading] = useState(false);
  const [overlapExpanded, setOverlapExpanded] = useState(false);

  useEffect(() => {
    if (!googleAdsCustomerId || !siteUrl) return;
    setOverlapLoading(true);
    const params = new URLSearchParams({ siteUrl, customerId: googleAdsCustomerId, startDate, endDate });
    fetch(`/api/cross/keyword-overlap?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json) {
          setKeywordOverlaps(json.overlaps ?? []);
          setOverlapSummary(json.summary ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setOverlapLoading(false));
  }, [googleAdsCustomerId, siteUrl, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <SectionLoading color="#4285f4" message="Loading Search Console data…" />
      </div>
    );
  }

  if (error) {
    return <SectionError message={error} />;
  }

  const chartData = daily.map((d) => ({
    date: formatDateDisplay(d.date),
    Clicks: d.clicks,
    Impressions: d.impressions,
  }));

  // Only use prevOverview for comparisons if at least one metric is non-zero
  const hasPrevData = prevOverview != null && (prevOverview.clicks > 0 || prevOverview.impressions > 0);

  const deviceChartData = devices.map((d) => ({
    name: d.device.charAt(0) + d.device.slice(1).toLowerCase(),
    value: d.clicks,
    device: d.device,
  }));
  const totalDeviceClicks = devices.reduce((s, d) => s + d.clicks, 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Section header */}
      <SectionHeader
        title="Search Console"
        subtitle="Organic search performance"
        icon={Search}
        iconColor="#4285f4"
        actions={<span style={{ fontSize: 13, color: "var(--text-3)" }}>{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>}
      />

      {afterHeader}

      {/* Performance alerts */}
      {!hideAlerts && gscAlerts.length > 0 && (() => {
        const highAlerts = gscAlerts.filter(a => a.severity === "high");
        const medAlerts  = gscAlerts.filter(a => a.severity === "medium");
        return (
          <div style={{ borderRadius: 12, border: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}`, background: highAlerts.length ? "#fff1f2" : "#fffbeb", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}` }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: highAlerts.length ? "#dc2626" : "#d97706" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: highAlerts.length ? "#991b1b" : "#92400e", margin: 0 }}>
                {highAlerts.length} high-priority \u00b7 {medAlerts.length} medium-priority issue{gscAlerts.length !== 1 ? "s" : ""} detected
              </p>
              {alertAiLoading && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#0f766e", fontStyle: "italic", flexShrink: 0 }}>Generating AI recommendations\u2026</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {gscAlerts.map((a, i) => (
                <div key={i} style={{ padding: "8px 16px", borderBottom: i < gscAlerts.length - 1 ? `1px solid ${highAlerts.length ? "#fee2e2" : "#fef3c7"}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: a.severity === "high" ? "#dc2626" : "#d97706", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                      {a.severity}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{a.label}</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{a.detail}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#0f766e", margin: "3px 0 0 0", lineHeight: 1.5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: alertAiRecs[i] ? "#d1fae5" : "#f0fdf4", color: alertAiRecs[i] ? "#065f46" : "#0f766e", borderRadius: 4, padding: "1px 5px", marginRight: 6 }}>
                      {alertAiRecs[i] ? "AI" : "Action"}
                    </span>
                    {alertAiRecs[i] ?? a.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Overview metrics */}
      {show("kpis") && (
      <div className="grid-4">
        <MetricCard
          title="Total Clicks"
          value={formatNumber(overview?.clicks ?? 0)}
          change={hasPrevData ? pctChange(overview?.clicks ?? 0, prevOverview!.clicks) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<MousePointer className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(overview?.impressions ?? 0)}
          change={hasPrevData ? pctChange(overview?.impressions ?? 0, prevOverview!.impressions) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<Eye className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Average CTR"
          value={`${((overview?.ctr ?? 0) * 100).toFixed(2)}%`}
          change={hasPrevData ? pctChange(overview?.ctr ?? 0, prevOverview!.ctr) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <MetricCard
          title="Avg. Position"
          value={(overview?.position ?? 0).toFixed(1)}
          change={hasPrevData ? pctChange(prevOverview!.position, overview?.position ?? 0) : undefined}
          changeLabel={hasPrevData ? "vs prev period" : undefined}
          icon={<Search className="h-5 w-5" />}
          color="orange"
        />
      </div>
      )}

      {/* Clicks & Impressions chart */}
      {show("chart") && (
      <SectionCard title="Clicks & Impressions" subtitle="Search performance over time">
        {chartData.length === 0 ? (
          <p className="text-sm text-[var(--text-3)] py-8 text-center">No data for this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gscClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gscImpressions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis
                dataKey="date"
                {...CHART_AXIS_STYLE}
                interval="preserveStartEnd"
              />
              <YAxis {...CHART_AXIS_STYLE} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
              />
              <Area {...CHART_AREA_STYLE} dataKey="Clicks" stroke="#6366f1" fill="url(#gscClicks)" />
              <Area {...CHART_AREA_STYLE} dataKey="Impressions" stroke="#3b82f6" fill="url(#gscImpressions)" />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
      )}

      {(show("top_queries") || show("top_pages")) && (
      <div className="flex flex-col gap-5">
        {/* Top Queries */}
        {show("top_queries") && (
        <SectionCard title="Top Queries" subtitle="Ranked by clicks">
          {queries.length === 0 ? (
            <p className="text-sm text-[var(--text-3)] py-6 text-center">No query data</p>
          ) : (
            <DataTable<GSCQuery>
              data={queries}
              columns={[
                { key: "query", label: "Query", render: (_v, row) => <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{row.query}</span> },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => { const prevQ = prevQueriesMap.get(row.query); return <><div style={{ fontWeight: 600 }}>{formatNumber(row.clicks)}</div><Delta current={row.clicks} previous={prevQ?.clicks} format="count" /></>; } },
                { key: "impressions", label: "Impr.", align: "right", sortable: true, render: (_v, row) => { const prevQ = prevQueriesMap.get(row.query); return <><div>{formatNumber(row.impressions)}</div><Delta current={row.impressions} previous={prevQ?.impressions} format="count" /></>; } },
                { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => { const prevQ = prevQueriesMap.get(row.query); return <><div>{(row.ctr * 100).toFixed(1)}%</div><Delta current={row.ctr} previous={prevQ?.ctr} format="none" /></>; } },
                { key: "position", label: "Pos.", align: "right", sortable: true, render: (_v, row) => { const prevQ = prevQueriesMap.get(row.query); return <><span className={positionBadgeClass(row.position)}>{row.position.toFixed(1)}</span><Delta current={row.position} previous={prevQ?.position} format="count" invert /></>; } },
              ]}
              pageSize={20}
              searchable
              exportable
              exportFilename="gsc-queries"
            />
          )}
        </SectionCard>
        )}

        {/* Top Pages */}
        {show("top_pages") && (
        <SectionCard title="Top Pages" subtitle="Ranked by clicks">
          {pages.length === 0 ? (
            <p className="text-sm text-[var(--text-3)] py-6 text-center">No page data</p>
          ) : (
            <DataTable<GSCPage>
              data={pages}
              columns={[
                { key: "page", label: "Page", render: (_v, row) => {
                  let displayPage = row.page;
                  try { const url = new URL(row.page); displayPage = url.pathname + url.search; } catch {}
                  return <a href={row.page} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{displayPage}</a>;
                }},
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => { const prevP = prevPagesMap.get(row.page); return <><div style={{ fontWeight: 600 }}>{formatNumber(row.clicks)}</div><Delta current={row.clicks} previous={prevP?.clicks} format="count" /></>; } },
                { key: "impressions", label: "Impr.", align: "right", sortable: true, render: (_v, row) => { const prevP = prevPagesMap.get(row.page); return <><div>{formatNumber(row.impressions)}</div><Delta current={row.impressions} previous={prevP?.impressions} format="count" /></>; } },
                { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => { const prevP = prevPagesMap.get(row.page); return <><div>{(row.ctr * 100).toFixed(1)}%</div><Delta current={row.ctr} previous={prevP?.ctr} format="none" /></>; } },
                { key: "position", label: "Pos.", align: "right", sortable: true, render: (_v, row) => { const prevP = prevPagesMap.get(row.page); return <><span className={positionBadgeClass(row.position)}>{row.position.toFixed(1)}</span><Delta current={row.position} previous={prevP?.position} format="count" invert /></>; } },
              ]}
              pageSize={20}
              searchable
              exportable
              exportFilename="gsc-pages"
            />
          )}
        </SectionCard>
        )}
      </div>
      )}

      {/* Position Movers — cross-reference current vs previous period queries */}
      {show("position_movers") && (() => {
        const movers = queries
          .filter(q => {
            const prev = prevQueriesMap.get(q.query);
            return prev != null && q.impressions >= 10 && (prev.position - q.position) > 0;
          })
          .map(q => {
            const prev = prevQueriesMap.get(q.query)!;
            return { ...q, prevPosition: prev.position, gain: prev.position - q.position };
          })
          .sort((a, b) => b.gain - a.gain)
          .slice(0, 10);

        if (!movers.length) return null;
        return (
          <SectionCard title="Position Movers" subtitle="Queries with biggest rank improvements vs previous period">
            <div style={{ overflowX: "visible" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Query</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Current</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Previous</th>
                    <th style={{ textAlign: "center", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Gain</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Impr.</th>
                  </tr>
                </thead>
                <tbody>
                  {movers.map((q, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span className={positionBadgeClass(q.position)}>{q.position.toFixed(1)}</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-3)", fontSize: 12 }}>{q.prevPosition.toFixed(1)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600, background: "#ecfdf5", color: "var(--success-text)" }}>
                          <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderBottom: "5px solid currentColor" }} />
                          +{q.gain.toFixed(1)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text)", fontWeight: 600 }}>{formatNumber(q.clicks)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(q.impressions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        );
      })()}

      {/* Device & Country breakdown */}
      {(show("devices") || show("countries")) && (devices.length > 0 || countries.length > 0) && (
        <div className="grid-2">
          {show("devices") && (
          <>
          {/* Device split donut */}
          {deviceChartData.length > 0 && (
            <SectionCard title="Clicks by Device" subtitle="Device type breakdown">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {deviceChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DEVICE_COLORS[entry.device] ?? DEVICE_FALLBACK_COLORS[index % DEVICE_FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                    formatter={(v) => [formatNumber(Number(v)), "Clicks"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-around pt-1 pb-2">
                {devices.map((d, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs text-[var(--text-3)]">{d.device.charAt(0) + d.device.slice(1).toLowerCase()}</p>
                    <p className="text-sm font-semibold text-[var(--text)]">{totalDeviceClicks > 0 ? ((d.clicks / totalDeviceClicks) * 100).toFixed(0) : 0}%</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
          </>
          )}

          {/* Top countries table */}
          {show("countries") && countries.length > 0 && (
            <SectionCard title="Top Countries" subtitle="Ranked by clicks">
              <DataTable<GSCCountry>
                data={countries}
                columns={[
                  { key: "country", label: "Country", render: (_v, row) => <span style={{ textTransform: "capitalize" }}>{row.country.toLowerCase()}</span> },
                  { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => <span style={{ fontWeight: 600 }}>{formatNumber(row.clicks)}</span> },
                  { key: "impressions", label: "Impr.", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
                  { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${(row.ctr * 100).toFixed(1)}%` },
                ]}
                pageSize={20}
              />
            </SectionCard>
          )}
        </div>
      )}

      {/* ─── Organic vs Paid Keyword Overlap ──────────────────────────────────── */}
      {show("cannibalisation") && googleAdsCustomerId && (overlapLoading || keywordOverlaps.length > 0) && (
        <SectionCard
          title="Organic vs Paid Keyword Overlap"
          subtitle={overlapSummary ? `${overlapSummary.total} overlapping keyword${overlapSummary.total !== 1 ? "s" : ""} detected` : "Analysing overlap…"}
        >
          {overlapLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <div>
              {/* Summary badges */}
              {overlapSummary && (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  {overlapSummary.highRisk > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "var(--danger)", borderRadius: 6, padding: "3px 10px" }}>
                      {overlapSummary.highRisk} High Risk
                    </span>
                  )}
                  {overlapSummary.mediumRisk > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#d97706", borderRadius: 6, padding: "3px 10px" }}>
                      {overlapSummary.mediumRisk} Medium
                    </span>
                  )}
                  {overlapSummary.lowRisk > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#6b7280", borderRadius: 6, padding: "3px 10px" }}>
                      {overlapSummary.lowRisk} Low
                    </span>
                  )}
                  {overlapSummary.potentialSavings > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--success-text)", background: "var(--success-bg)", borderRadius: 6, padding: "3px 10px" }}>
                      Potential savings: ${overlapSummary.potentialSavings.toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* Info box */}
              <div style={{ fontSize: 11, color: "#64748b", background: "var(--bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, lineHeight: 1.5 }}>
                Keywords where you rank organically <strong>and</strong> pay for ads. High-risk = position ≤3 with active spend (you&apos;re paying for clicks you might get organically).
              </div>

              {/* Collapsible table */}
              <button
                onClick={() => setOverlapExpanded(!overlapExpanded)}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: overlapExpanded ? 8 : 0 }}
              >
                {overlapExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {overlapExpanded ? "Hide details" : `Show ${keywordOverlaps.length} keyword${keywordOverlaps.length !== 1 ? "s" : ""}`}
              </button>

              {overlapExpanded && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)" }}>Keyword</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Org. Pos</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Org. Clicks</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Paid Clicks</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Paid Spend</th>
                        <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Paid Conv.</th>
                        <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "var(--text-2)" }}>Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordOverlaps.map((kw, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 12px", color: "var(--text-1)", fontWeight: 500 }}>{kw.query}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>{kw.organicPosition.toFixed(1)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(kw.organicClicks)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(kw.paidClicks)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>${kw.paidSpend.toFixed(2)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>{kw.paidConversions.toFixed(0)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff",
                              background: kw.risk === "high" ? "#dc2626" : kw.risk === "medium" ? "#d97706" : "#6b7280",
                              borderRadius: 4, padding: "1px 6px"
                            }}>
                              {kw.risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {/* Branded vs Non-Branded */}
      {show("branded_split") && brandedSplit && (
        <SectionCard title="Branded vs Non-Branded" subtitle="Search performance split by branded and non-branded queries">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Branded column */}
            <div style={{ background: "var(--bg)", borderRadius: 12, padding: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Branded</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Clicks</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{formatNumber(brandedSplit.branded.clicks)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Impressions</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{formatNumber(brandedSplit.branded.impressions)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>CTR</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{(brandedSplit.branded.ctr * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Avg Position</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{brandedSplit.branded.position.toFixed(1)}</p>
                </div>
              </div>
            </div>
            {/* Non-Branded column */}
            <div style={{ background: "var(--bg)", borderRadius: 12, padding: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Non-Branded</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Clicks</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{formatNumber(brandedSplit.nonBranded.clicks)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Impressions</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{formatNumber(brandedSplit.nonBranded.impressions)}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>CTR</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{(brandedSplit.nonBranded.ctr * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Avg Position</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{brandedSplit.nonBranded.position.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Super Summary */}
      {!hideAi && !loading && !error && overview && (
        <SuperSummary
          sectionType="searchconsole"
          metrics={{
            clicks: overview.clicks,
            impressions: overview.impressions,
            ctr: overview.ctr,
            position: overview.position,
          }}
          previousMetrics={prevOverview ? {
            clicks: prevOverview.clicks,
            impressions: prevOverview.impressions,
            ctr: prevOverview.ctr,
            position: prevOverview.position,
          } : undefined}
          dateRange={`${formatDateDisplay(startDate)} \u2013 ${formatDateDisplay(endDate)}`}
          extraContext={queries.length > 0 ? [
            "Top search queries:",
            ...queries.slice(0, 10).map((q) => {
              const prev = prevQueriesMap.get(q.query);
              const posChange = prev != null ? (prev.position - q.position) : null;
              const posStr = posChange != null
                ? (posChange > 0.5 ? ` (\u2191${posChange.toFixed(1)} pos)` : posChange < -0.5 ? ` (\u2193${Math.abs(posChange).toFixed(1)} pos)` : "")
                : "";
              return `  \u2022 "${q.query}" \u2014 pos ${q.position.toFixed(1)}${posStr}, ${q.clicks} clicks, ${(q.ctr * 100).toFixed(1)}% CTR`;
            }),
          ].join("\n") : undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {!hideAi && !loading && !error && overview && (
        <AiInsightsPanel
          sectionType="searchconsole"
          metrics={{
            clicks: overview.clicks,
            impressions: overview.impressions,
            ctr: overview.ctr,
            position: overview.position,
          }}
          previousMetrics={prevOverview ? {
            clicks: prevOverview.clicks,
            impressions: prevOverview.impressions,
            ctr: prevOverview.ctr,
            position: prevOverview.position,
          } : undefined}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          extraContext={queries.length > 0 ? [
            "Top search queries:",
            ...queries.slice(0, 10).map((q) => {
              const prev = prevQueriesMap.get(q.query);
              const posChange = prev != null ? (prev.position - q.position) : null;
              const posStr = posChange != null
                ? (posChange > 0.5 ? ` (↑${posChange.toFixed(1)} pos)` : posChange < -0.5 ? ` (↓${Math.abs(posChange).toFixed(1)} pos)` : "")
                : "";
              return `  • "${q.query}" — pos ${q.position.toFixed(1)}${posStr}, ${q.clicks} clicks, ${(q.ctr * 100).toFixed(1)}% CTR`;
            }),
          ].join("\n") : undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* Query × Page */}
      {isExplicit("query_page") && queryPage.length === 0 && (
        <EmptyBlockState title="Query × Page Matrix" />
      )}
      {show("query_page") && queryPage.length > 0 && (
        <SectionCard title="Query × Page" subtitle={`${queryPage.length} query/page combination${queryPage.length !== 1 ? "s" : ""}`}>
          <DataTable<GSCQueryPage>
            data={queryPage}
            columns={[
              { key: "query", label: "Query", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.query}</span> },
              { key: "page", label: "Page", render: (_v, row) => <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 200 }} title={row.page}>{row.page.replace(/^https?:\/\/[^/]+/, "")}</span> },
              { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
              { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${(row.ctr * 100).toFixed(1)}%` },
              { key: "position", label: "Position", align: "right", sortable: true, render: (_v, row) => <span className={positionBadgeClass(row.position)}>{row.position.toFixed(1)}</span> },
            ]}
            pageSize={20}
            searchable
          />
        </SectionCard>
      )}

      {/* Page × Country */}
      {isExplicit("page_country") && pageCountry.length === 0 && (
        <EmptyBlockState title="Page × Country" />
      )}
      {show("page_country") && pageCountry.length > 0 && (
        <SectionCard title="Page × Country" subtitle={`${pageCountry.length} page/country combination${pageCountry.length !== 1 ? "s" : ""}`}>
          <DataTable<GSCPageCountry>
            data={pageCountry}
            columns={[
              { key: "page", label: "Page", render: (_v, row) => <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: 200 }} title={row.page}>{row.page.replace(/^https?:\/\/[^/]+/, "")}</span> },
              { key: "country", label: "Country" },
              { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
              { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${(row.ctr * 100).toFixed(1)}%` },
              { key: "position", label: "Position", align: "right", sortable: true, render: (_v, row) => <span className={positionBadgeClass(row.position)}>{row.position.toFixed(1)}</span> },
            ]}
            pageSize={20}
            searchable
          />
        </SectionCard>
      )}

      {/* Discover & News */}
      {isExplicit("discover_news") && discoverNews.length === 0 && (
        <EmptyBlockState title="Discover & News" message="No Discover or News traffic for this site." />
      )}
      {show("discover_news") && discoverNews.length > 0 && (
        <SectionCard title="Discover & News" subtitle="Google Discover and Google News performance">
          <div className="space-y-4">
            {discoverNews.map((dn) => (
              <div key={dn.type} className="border border-[var(--border-subtle)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--text)]">{dn.type}</span>
                  <div className="flex gap-4 text-xs text-[var(--text-3)]">
                    <span>{formatNumber(dn.clicks)} clicks</span>
                    <span>{formatNumber(dn.impressions)} impressions</span>
                    <span>{(dn.ctr * 100).toFixed(1)}% CTR</span>
                  </div>
                </div>
                {dn.pages && dn.pages.length > 0 && (
                  <table className="w-full text-xs mt-2">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Page</th>
                        <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                        <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Impressions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dn.pages.map((pg, i) => (
                        <tr key={`${pg.page}-${i}`} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "12px 16px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }} title={pg.page}>{pg.page.replace(/^https?:\/\/[^/]+/, "")}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(pg.clicks)}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(pg.impressions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Sitemaps */}
      {isExplicit("sitemaps") && sitemaps.length === 0 && (
        <EmptyBlockState title="Sitemaps" message="No sitemaps submitted to Search Console." />
      )}
      {show("sitemaps") && sitemaps.length > 0 && (
        <SectionCard title="Sitemaps" subtitle={`${sitemaps.length} sitemap${sitemaps.length !== 1 ? "s" : ""} submitted`}>
          <div className="space-y-3">
            {sitemaps.map((sm) => (
              <div key={sm.path} className="border border-[var(--border-subtle)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text)] truncate max-w-[300px]" title={sm.path}>{sm.path}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-[var(--text-3)]">{sm.type}</span>
                    {sm.isPending && <span className="text-amber-600 font-medium">Pending</span>}
                    {sm.errors > 0 && <span className="text-red-600 font-medium">{sm.errors} error{sm.errors !== 1 ? "s" : ""}</span>}
                    {sm.warnings > 0 && <span className="text-amber-600 font-medium">{sm.warnings} warning{sm.warnings !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
                {sm.lastSubmitted && <p className="text-[10px] text-[var(--text-3)]">Submitted: {new Date(sm.lastSubmitted).toLocaleDateString()}</p>}
                {sm.contents && sm.contents.length > 0 && (
                  <table className="w-full text-xs mt-2">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <th style={{ textAlign: "left", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Type</th>
                        <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Submitted</th>
                        <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Indexed</th>
                        <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sm.contents.map((c, i) => (
                        <tr key={`${c.type}-${i}`}>
                          <td style={{ padding: "12px 16px", color: "var(--text)" }}>{c.type}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(c.submitted)}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(c.indexed)}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}><span className={c.submitted > 0 ? ((c.indexed / c.submitted) >= 0.8 ? "text-emerald-600" : (c.indexed / c.submitted) >= 0.5 ? "text-amber-600" : "text-red-600") : "text-[var(--text-3)]"}>{c.submitted > 0 ? ((c.indexed / c.submitted) * 100).toFixed(0) + "%" : "—"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Query × Device */}
      {isExplicit("query_device") && queryDevice.length === 0 && (
        <EmptyBlockState title="Query × Device" />
      )}
      {show("query_device") && queryDevice.length > 0 && (
        <SectionCard title="Query × Device" subtitle={`${queryDevice.length} query/device combination${queryDevice.length !== 1 ? "s" : ""}`}>
          <DataTable<GSCQueryDevice>
            data={queryDevice}
            columns={[
              { key: "query", label: "Query", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.query}</span> },
              { key: "device", label: "Device" },
              { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
              { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${(row.ctr * 100).toFixed(1)}%` },
              { key: "position", label: "Position", align: "right", sortable: true, render: (_v, row) => <span className={positionBadgeClass(row.position)}>{row.position.toFixed(1)}</span> },
            ]}
            pageSize={20}
            searchable
          />
        </SectionCard>
      )}

      {/* Query × Country */}
      {isExplicit("query_country") && queryCountry.length === 0 && (
        <EmptyBlockState title="Query × Country" />
      )}
      {show("query_country") && queryCountry.length > 0 && (
        <SectionCard title="Query × Country" subtitle={`${queryCountry.length} query/country combination${queryCountry.length !== 1 ? "s" : ""}`}>
          <DataTable<GSCQueryCountry>
            data={queryCountry}
            columns={[
              { key: "query", label: "Query", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.query}</span> },
              { key: "country", label: "Country" },
              { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
              { key: "ctr", label: "CTR", align: "right", sortable: true, render: (_v, row) => `${(row.ctr * 100).toFixed(1)}%` },
              { key: "position", label: "Position", align: "right", sortable: true, render: (_v, row) => <span className={positionBadgeClass(row.position)}>{row.position.toFixed(1)}</span> },
            ]}
            pageSize={20}
            searchable
          />
        </SectionCard>
      )}
    </div>
  );
}
