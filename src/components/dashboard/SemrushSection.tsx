"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard } from "@/components/ui/index";
import { LoadingSpinner } from "@/components/ui/index";
import { formatNumber, formatCurrency, formatDateDisplay, pctChange } from "@/lib/utils";
import { TrendingUp, Search, ArrowUp, ArrowDown, Minus, AlertTriangle } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface SemrushSectionProps {
  domain: string;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
}

interface Overview {
  organicTraffic: number;
  organicKeywords: number;
  organicCost: number;
  paidTraffic: number;
  paidKeywords: number;
  paidCost: number;
}

interface Keyword {
  keyword: string;
  position: number;
  previousPosition: number;
  searchVolume: number;
  cpc: number;
  url: string;
  trafficPercent: number;
}

interface HistoryItem {
  date: string;
  organicKeywords: number;
  organicTraffic: number;
}

interface DistributionItem {
  range: string;
  count: number;
}

interface Competitor {
  domain: string;
  commonKeywords: number;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  adKeywords: number;
}

interface Backlink {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  authority: number;
}

type SemrushAlert = { severity: "high" | "medium"; label: string; detail: string; recommendation: string };

const POSITION_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

function diffStr(curr: number, prev: number | null | undefined, fmt: "count" | "currency"): string | undefined {
  if (prev == null) return undefined;
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "\u2212";
  return sign + (fmt === "currency" ? formatCurrency(Math.abs(d)) : formatNumber(Math.abs(d)));
}

export function SemrushSection({ domain, startDate, endDate, crossPlatformContext, visibleBlocks }: SemrushSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertAiRecs, setAlertAiRecs] = useState<string[]>([]);
  const [alertAiLoading, setAlertAiLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [overviewRes, keywordsRes, historyRes, distRes, competitorsRes, backlinksRes] = await Promise.all([
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=overview`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=keywords`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=history`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=distribution`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=competitors`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=backlinks`, { signal: controller.signal }),
        ]);

        if (!overviewRes.ok) {
          const err = await overviewRes.json();
          throw new Error(err.error ?? "Failed to fetch SemRush data");
        }

        const [ov, kw, hist, dist, comps, bls] = await Promise.all([
          overviewRes.json(),
          keywordsRes.json(),
          historyRes.json(),
          distRes.json(),
          competitorsRes.ok ? competitorsRes.json() : Promise.resolve([]),
          backlinksRes.ok ? backlinksRes.json() : Promise.resolve([]),
        ]);

        setOverview(ov);
        setKeywords(Array.isArray(kw) ? kw : []);
        setHistory(Array.isArray(hist) ? hist : []);
        setDistribution(Array.isArray(dist) ? dist : []);
        setCompetitors(Array.isArray(comps) ? comps : []);
        setBacklinks(Array.isArray(bls) ? bls : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load SemRush data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [domain, startDate, endDate]);

  // Compute anomaly alerts from SEMrush data
  const semrushAlerts = useMemo<SemrushAlert[]>(() => {
    const alerts: SemrushAlert[] = [];
    if (history.length < 2) return alerts;
    const curr = history[history.length - 1];
    const prev = history[history.length - 2];

    const trafficPct = pctChange(curr.organicTraffic, prev.organicTraffic);
    if (trafficPct != null && trafficPct <= -25)
      alerts.push({ severity: "high", label: "Organic Traffic", detail: `Organic traffic dropped ${Math.abs(trafficPct).toFixed(0)}% month-over-month (${formatNumber(prev.organicTraffic)} \u2192 ${formatNumber(curr.organicTraffic)})`, recommendation: "Investigate for algorithm updates, lost backlinks, or deindexed pages. Review Search Console for coverage issues and check rankings for top pages." });
    else if (trafficPct != null && trafficPct <= -10)
      alerts.push({ severity: "medium", label: "Organic Traffic", detail: `Organic traffic declined ${Math.abs(trafficPct).toFixed(0)}% month-over-month`, recommendation: "Monitor for a continued trend. Review keyword rankings and top pages for position changes. Check for seasonal traffic patterns." });

    const keywordPct = pctChange(curr.organicKeywords, prev.organicKeywords);
    if (keywordPct != null && keywordPct <= -20)
      alerts.push({ severity: "high", label: "Ranking Keywords", detail: `Ranking keywords dropped ${Math.abs(keywordPct).toFixed(0)}% (${formatNumber(prev.organicKeywords)} \u2192 ${formatNumber(curr.organicKeywords)})`, recommendation: "Check for site-wide issues \u2014 technical SEO problems, major content removal, or domain-level penalties. Audit indexation status." });
    else if (keywordPct != null && keywordPct <= -10)
      alerts.push({ severity: "medium", label: "Ranking Keywords", detail: `Ranking keywords declined ${Math.abs(keywordPct).toFixed(0)}% month-over-month`, recommendation: "Review recently dropped keywords and the pages they targeted. Check for content freshness issues or increased competitor activity." });

    // Keywords losing page 1 positions
    const losingPage1 = keywords.filter(k => k.position > 10 && k.previousPosition > 0 && k.previousPosition <= 10);
    if (losingPage1.length >= 5)
      alerts.push({ severity: "high", label: "Page 1 Losses", detail: `${losingPage1.length} keywords dropped off page 1 this period`, recommendation: "Prioritise content refresh and internal linking for these pages. Consider acquiring backlinks to restore authority for high-volume terms." });
    else if (losingPage1.length >= 2)
      alerts.push({ severity: "medium", label: "Page 1 Losses", detail: `${losingPage1.length} keyword${losingPage1.length === 1 ? "" : "s"} dropped off page 1`, recommendation: "Review the affected keywords and update content to match current search intent. Strengthen internal linking to these pages." });

    // Competitors outpacing organic traffic
    if (overview && competitors.length > 0) {
      const outpacing = competitors.filter(c => c.organicTraffic > overview.organicTraffic * 1.5 && c.commonKeywords > 50);
      if (outpacing.length >= 2)
        alerts.push({ severity: "medium", label: "Competitor Gap", detail: `${outpacing.length} competitors have 50%+ more organic traffic with significant keyword overlap`, recommendation: "Conduct a gap analysis on the top competitors. Identify high-value keywords they rank for that you don\u2019t, and create targeted content to close the gap." });
    }

    // High organic cost but low traffic (wasted potential)
    if (overview && overview.organicCost > 5000 && overview.organicTraffic < 1000)
      alerts.push({ severity: "medium", label: "High Organic Value", detail: `Organic keyword portfolio valued at ${formatCurrency(overview.organicCost)} but only ${formatNumber(overview.organicTraffic)} monthly visits`, recommendation: "The keyword portfolio has high CPC value. Focus on improving rankings for high-CPC keywords already in positions 5\u201320 to capture more of this traffic value." });

    return alerts;
  }, [history, keywords, overview, competitors]);

  // Fetch AI-generated recommendations for each alert
  useEffect(() => {
    setAlertAiRecs([]);
    if (!semrushAlerts.length) return;
    setAlertAiLoading(true);
    fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionType: "alert_recommendations",
        campaignPlatform: "semrush",
        alerts: semrushAlerts.map(a => ({ severity: a.severity, label: a.label, detail: a.detail })),
        dateRange: `${startDate} to ${endDate}`,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.recommendations?.length) setAlertAiRecs(json.recommendations); })
      .catch(() => {})
      .finally(() => setAlertAiLoading(false));
  }, [semrushAlerts, startDate, endDate]);

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SEO Performance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Organic traffic data via SEMrush</p>
        </div>
        <span className="text-sm text-slate-400">{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading SEMrush data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load SEMrush data</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : !overview ? null : (
        <>
      {/* Performance alerts */}
      {semrushAlerts.length > 0 && (() => {
        const highAlerts = semrushAlerts.filter(a => a.severity === "high");
        const medAlerts  = semrushAlerts.filter(a => a.severity === "medium");
        return (
          <div style={{ borderRadius: 12, border: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}`, background: highAlerts.length ? "#fff1f2" : "#fffbeb", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}` }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: highAlerts.length ? "#dc2626" : "#d97706" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: highAlerts.length ? "#991b1b" : "#92400e", margin: 0 }}>
                {highAlerts.length} high-priority \u00b7 {medAlerts.length} medium-priority issue{semrushAlerts.length !== 1 ? "s" : ""} detected
              </p>
              {alertAiLoading && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#0f766e", fontStyle: "italic", flexShrink: 0 }}>Generating AI recommendations\u2026</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {semrushAlerts.map((a, i) => (
                <div key={i} style={{ padding: "8px 16px", borderBottom: i < semrushAlerts.length - 1 ? `1px solid ${highAlerts.length ? "#fee2e2" : "#fef3c7"}` : "none" }}>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        <MetricCard
          title="Organic Traffic"
          value={formatNumber(overview.organicTraffic)}
          subtitle="Monthly visits"
          change={history.length >= 2 ? pctChange(history[history.length - 1].organicTraffic, history[history.length - 2].organicTraffic) : undefined}
          changeDiff={history.length >= 2 ? diffStr(history[history.length - 1].organicTraffic, history[history.length - 2].organicTraffic, "count") : undefined}
          changeLabel="vs prev month"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
        <MetricCard
          title="Organic Keywords"
          value={formatNumber(overview.organicKeywords)}
          subtitle="Ranking keywords"
          change={history.length >= 2 ? pctChange(history[history.length - 1].organicKeywords, history[history.length - 2].organicKeywords) : undefined}
          changeDiff={history.length >= 2 ? diffStr(history[history.length - 1].organicKeywords, history[history.length - 2].organicKeywords, "count") : undefined}
          changeLabel="vs prev month"
          icon={<Search className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          title="Traffic Value"
          value={formatCurrency(overview.organicCost)}
          subtitle="Equivalent PPC value"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
      </div>
      )}

      {/* Paid metrics secondary row */}
      {show("secondary_kpis") && (overview.paidTraffic > 0 || overview.paidKeywords > 0) && (
        <div className="grid grid-cols-2 gap-5">
          <MetricCard
            title="Paid Traffic"
            value={formatNumber(overview.paidTraffic)}
            subtitle="Monthly paid visits"
            icon={<TrendingUp className="h-5 w-5" />}
            color="orange"
          />
          <MetricCard
            title="Paid Keywords"
            value={formatNumber(overview.paidKeywords)}
            subtitle="Active paid keywords"
            icon={<Search className="h-5 w-5" />}
            color="orange"
          />
        </div>
      )}

      {/* Traffic history chart */}
      {show("ranking_distribution") && history.length > 0 && (
        <SectionCard
          title="Organic Traffic Trend"
          subtitle={`${domain} — last 12 months`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(0, 7)}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#0f172a",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                }}
                labelStyle={{ color: "#64748b", fontSize: "11px" }}
                formatter={(value) => [formatNumber(Number(value)), "Traffic"]}
              />
              <Area
                type="monotone"
                dataKey="organicTraffic"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#trafficGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {(show("ranking_distribution") || show("top_keywords")) && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Position distribution */}
        {show("ranking_distribution") && distribution.length > 0 && (
          <SectionCard
            title="Keyword Position Distribution"
            subtitle="SERP positions"
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distribution} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                  }}
                  labelStyle={{ color: "#64748b", fontSize: "11px" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={POSITION_COLORS[index % POSITION_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        )}

        {/* Keyword history */}
        {history.length > 0 && (
          <SectionCard
            title="Keyword Count Trend"
            subtitle="Total ranking keywords"
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="kwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(0, 7)}
                />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                  }}
                  labelStyle={{ color: "#64748b", fontSize: "11px" }}
                  formatter={(value) => [formatNumber(Number(value)), "Keywords"]}
                />
                <Area
                  type="monotone"
                  dataKey="organicKeywords"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#kwGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        )}
      </div>
      )}

      {/* Top keywords table */}
      {show("top_keywords") && keywords.length > 0 && (
        <SectionCard
          title="Top Organic Keywords"
          subtitle="By traffic percentage"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium text-xs">
                    Keyword
                  </th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">
                    Position
                  </th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">
                    Change
                  </th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">
                    Volume
                  </th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">
                    Traffic %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keywords.map((kw, i) => {
                  const change = kw.previousPosition - kw.position; // positive = moved up
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 pr-4">
                        <p className="text-slate-800 font-medium truncate max-w-[200px]">
                          {kw.keyword}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                          {kw.url}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                            kw.position <= 3
                              ? "bg-emerald-50 text-emerald-700"
                              : kw.position <= 10
                              ? "bg-blue-50 text-blue-700"
                              : kw.position <= 20
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {kw.position}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {change > 0 ? (
                          <span className="flex items-center justify-center gap-0.5 text-xs text-emerald-600">
                            <ArrowUp className="h-3 w-3" />
                            {change}
                          </span>
                        ) : change < 0 ? (
                          <span className="flex items-center justify-center gap-0.5 text-xs text-red-600">
                            <ArrowDown className="h-3 w-3" />
                            {Math.abs(change)}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <Minus className="h-3 w-3 text-slate-500" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 text-xs">
                        {formatNumber(kw.searchVolume)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 text-xs">
                        {kw.trafficPercent.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Top Rank Improvers */}
      {show("rank_improvers") && keywords.some(kw => kw.previousPosition > 0 && (kw.previousPosition - kw.position) > 0) && (
        <SectionCard title="Top Rank Improvers" subtitle="Keywords with biggest position gains this month">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium text-xs">Keyword</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">Current</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">Previous</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">Gain</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Volume</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Traffic %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keywords
                  .filter(kw => kw.previousPosition > 0 && (kw.previousPosition - kw.position) > 0)
                  .sort((a, b) => (b.previousPosition - b.position) - (a.previousPosition - a.position))
                  .slice(0, 10)
                  .map((kw, i) => {
                    const gain = kw.previousPosition - kw.position;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-3 pr-4">
                          <p className="text-slate-800 font-medium truncate max-w-[200px]">{kw.keyword}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{kw.url}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                            kw.position <= 3 ? "bg-emerald-50 text-emerald-700" :
                            kw.position <= 10 ? "bg-blue-50 text-blue-700" :
                            kw.position <= 20 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                          }`}>{kw.position}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 text-xs">{kw.previousPosition}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <ArrowUp className="h-3 w-3" />+{gain}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 text-xs">{formatNumber(kw.searchVolume)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600 text-xs">{kw.trafficPercent.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Backlinks */}
      {show("backlinks") && backlinks.length > 0 && (
        <SectionCard title="Recent Backlinks" subtitle="Top referring domains by authority score">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2 px-4 text-slate-400 font-medium text-xs">Source Domain</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Target URL</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs">Anchor Text</th>
                  <th className="text-right py-2 px-4 text-slate-400 font-medium text-xs">Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backlinks.map((bl, i) => {
                  let sourceDomain = bl.sourceUrl;
                  try { sourceDomain = new URL(bl.sourceUrl).hostname; } catch {}
                  let targetPath = bl.targetUrl;
                  try { const u = new URL(bl.targetUrl); targetPath = u.pathname + u.search; } catch {}
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <a href={bl.sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="font-medium text-slate-800 hover:text-indigo-600 transition truncate max-w-[180px] block">
                          {sourceDomain}
                        </a>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs truncate max-w-[160px]">{targetPath}</td>
                      <td className="py-3 px-3 text-slate-500 text-xs truncate max-w-[140px]">
                        {bl.anchorText || <span className="italic text-slate-400">No anchor</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          bl.authority >= 60 ? "bg-emerald-50 text-emerald-700" :
                          bl.authority >= 30 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                        }`}>{bl.authority}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Competitor landscape */}
      {show("competitors") && competitors.length > 0 && (
        <SectionCard title="Competitor Landscape" subtitle={`Top organic competitors for ${domain}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2 px-4 text-slate-400 font-medium text-xs">Domain</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Common KW</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Organic KW</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Traffic</th>
                  <th className="text-right py-2 px-4 text-slate-400 font-medium text-xs">Traffic Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {competitors.map((comp, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <a
                        href={`https://${comp.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-800 hover:text-indigo-600 transition"
                      >
                        {comp.domain}
                      </a>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {formatNumber(comp.commonKeywords)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 text-xs">
                      {formatNumber(comp.organicKeywords)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600 text-xs">
                      {formatNumber(comp.organicTraffic)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 text-xs">
                      {formatCurrency(comp.organicCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
        </>
      )}

      {/* Super Summary */}
      {!loading && !error && overview && (
        <SuperSummary
          sectionType="seo"
          metrics={{
            organicTraffic: overview.organicTraffic,
            organicKeywords: overview.organicKeywords,
            organicCost: overview.organicCost,
            paidTraffic: overview.paidTraffic,
            paidKeywords: overview.paidKeywords,
          }}
          dateRange={`${formatDateDisplay(startDate)} \u2013 ${formatDateDisplay(endDate)}`}
          extraContext={keywords.length > 0 ? [
            "Top organic keywords:",
            ...keywords.slice(0, 10).map((kw) => {
              const delta = kw.previousPosition > 0 ? kw.previousPosition - kw.position : null;
              const deltaStr = delta != null ? (delta > 0 ? ` (\u2191${delta})` : delta < 0 ? ` (\u2193${Math.abs(delta)})` : " (=)") : "";
              return `  \u2022 "${kw.keyword}" \u2014 pos ${kw.position}${deltaStr}, vol ${kw.searchVolume.toLocaleString()}, ${kw.trafficPercent.toFixed(1)}% traffic`;
            }),
          ].join("\n") : undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {!loading && !error && overview && (
        <AiInsightsPanel
          sectionType="seo"
          metrics={{
            organicTraffic: overview.organicTraffic,
            organicKeywords: overview.organicKeywords,
            organicCost: overview.organicCost,
            paidTraffic: overview.paidTraffic,
            paidKeywords: overview.paidKeywords,
          }}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          extraContext={keywords.length > 0 ? [
            "Top organic keywords:",
            ...keywords.slice(0, 10).map((kw) => {
              const delta = kw.previousPosition > 0 ? kw.previousPosition - kw.position : null;
              const deltaStr = delta != null ? (delta > 0 ? ` (↑${delta})` : delta < 0 ? ` (↓${Math.abs(delta)})` : " (=)") : "";
              return `  • "${kw.keyword}" — pos ${kw.position}${deltaStr}, vol ${kw.searchVolume.toLocaleString()}, ${kw.trafficPercent.toFixed(1)}% traffic`;
            }),
          ].join("\n") : undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}
    </div>
  );
}
