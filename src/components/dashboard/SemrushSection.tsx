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
import { TrendingUp, Search, AlertTriangle } from "lucide-react";

/* CSS-only directional indicators — render reliably in Puppeteer PDF exports
   (lucide SVG icons can appear as invalid chars in headless Chromium PDFs). */
const CssArrowUp = () => (
  <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderBottom: "5px solid currentColor", verticalAlign: "middle" }} />
);
const CssArrowDown = () => (
  <span style={{ display: "inline-block", width: 0, height: 0, borderLeft: "3.5px solid transparent", borderRight: "3.5px solid transparent", borderTop: "5px solid currentColor", verticalAlign: "middle" }} />
);
const CssMinus = () => (
  <span style={{ display: "inline-block", width: 8, height: 2, background: "currentColor", borderRadius: 1, verticalAlign: "middle" }} />
);
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { ShareOfVoicePanel } from "./ShareOfVoicePanel";

interface SemrushSectionProps {
  domain: string;
  projectId?: number | null;
  campaignIds?: string[] | null;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hideAlerts?: boolean;
  hideAi?: boolean;
  onMetricsReady?: (metrics: Record<string, number>) => void;
  afterHeader?: ReactNode;
}

interface TrackedKeyword {
  keyword: string;
  position: number;
  previousPosition: number | null;
  searchVolume: number;
  url: string;
  landingPage: string;
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

interface AIKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  hasAIOverview: boolean;
  brandInAIOverview: boolean;
}

interface AIVisibility {
  totalTracked: number;
  aiOverviewKeywords: number;
  brandCitations: number;
  aiVisibilityScore: number;
  keywords: AIKeyword[];
}

type SemrushAlert = { severity: "high" | "medium"; label: string; detail: string; recommendation: string };

const POSITION_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

function diffStr(curr: number, prev: number | null | undefined, fmt: "count" | "currency"): string | undefined {
  if (prev == null) return undefined;
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "\u2212";
  return sign + (fmt === "currency" ? formatCurrency(Math.abs(d)) : formatNumber(Math.abs(d)));
}

export function SemrushSection({ domain, projectId, campaignIds, startDate, endDate, crossPlatformContext, visibleBlocks, hideAlerts, hideAi, onMetricsReady, afterHeader }: SemrushSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [rankMovers, setRankMovers] = useState<Keyword[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [trackedKeywords, setTrackedKeywords] = useState<TrackedKeyword[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [backlinkError, setBacklinkError] = useState<string | null>(null);
  const [aiVisibility, setAiVisibility] = useState<AIVisibility | null>(null);
  const [domainAuthority, setDomainAuthority] = useState<{ domainAuthority: number; pageAuthority: number; spamScore: number; rootDomainsLinking: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertAiRecs, setAlertAiRecs] = useState<string[]>([]);
  const [alertAiLoading, setAlertAiLoading] = useState(false);
  const [contentGap, setContentGap] = useState<Array<{ keyword: string; volume: number; difficulty: number; competitors: string[] }>>([]);
  const [serpFeatures, setSerpFeatures] = useState<Array<{ feature: string; count: number; percentage: number }>>([]);
  const [backlinkChanges, setBacklinkChanges] = useState<Array<{ url: string; type: string; domain: string; firstSeen: string; lost: boolean }>>([]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const fetchList: Promise<Response>[] = [
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=overview`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=keywords`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=rank_movers`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=history`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=distribution`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=competitors`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=backlinks`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=content-gap`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=serp-features`, { signal: controller.signal }),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=backlink-changes`, { signal: controller.signal }),
        ];
        const activeCampaignId = campaignIds?.[0] ?? null;
        if (activeCampaignId) {
          fetchList.push(fetch(`/api/semrush?type=project-keywords&campaignId=${encodeURIComponent(activeCampaignId)}`, { signal: controller.signal }));
          fetchList.push(fetch(`/api/semrush?type=ai-visibility&campaignId=${encodeURIComponent(activeCampaignId)}`, { signal: controller.signal }));
        } else if (projectId) {
          // Legacy fallback — no campaign ID configured, show empty tracked data
          fetchList.push(Promise.resolve(new Response(JSON.stringify([]), { status: 200 })));
          fetchList.push(Promise.resolve(new Response(JSON.stringify({ totalTracked: 0, aiOverviewKeywords: 0, brandCitations: 0, aiVisibilityScore: 0, keywords: [] }), { status: 200 })));
        }
        const [overviewRes, keywordsRes, rankMoversRes, historyRes, distRes, competitorsRes, backlinksRes, contentGapRes, serpFeaturesRes, backlinkChangesRes, trackedRes, aiVisRes] = await Promise.all(fetchList);

        if (!overviewRes.ok) {
          const err = await overviewRes.json();
          if (err.error === "semrush_no_units") {
            throw new Error("SEMrush API unit balance is zero. Top up units to restore data.");
          }
          throw new Error(err.error ?? "Failed to fetch SemRush data");
        }

        const [ov, kw, movers, hist, dist, comps, bls] = await Promise.all([
          overviewRes.json(),
          keywordsRes.json(),
          rankMoversRes.ok ? rankMoversRes.json() : Promise.resolve([]),
          historyRes.json(),
          distRes.json(),
          competitorsRes.ok ? competitorsRes.json() : Promise.resolve([]),
          backlinksRes.ok ? backlinksRes.json() : backlinksRes.json().then(e => { setBacklinkError(e.error ?? "Failed to load backlinks"); return []; }).catch(() => []),
        ]);

        setOverview(ov);
        if (ov) onMetricsReady?.({
          organicTraffic: ov.organicTraffic, organicKeywords: ov.organicKeywords,
          organicCost: ov.organicCost, paidTraffic: ov.paidTraffic, paidKeywords: ov.paidKeywords,
        });
        setKeywords(Array.isArray(kw) ? kw : []);
        setRankMovers(Array.isArray(movers) ? movers : []);
        setHistory(Array.isArray(hist) ? hist : []);
        setDistribution(Array.isArray(dist) ? dist : []);
        setCompetitors(Array.isArray(comps) ? comps : []);
        setBacklinks(Array.isArray(bls) ? bls : []);

        // Wave 1-6 new data cards
        if (contentGapRes?.ok) {
          const cg = await contentGapRes.json();
          setContentGap(Array.isArray(cg) ? cg : []);
        }
        if (serpFeaturesRes?.ok) {
          const sf = await serpFeaturesRes.json();
          setSerpFeatures(Array.isArray(sf) ? sf : []);
        }
        if (backlinkChangesRes?.ok) {
          const bc = await backlinkChangesRes.json();
          setBacklinkChanges(Array.isArray(bc) ? bc : []);
        }

        if (trackedRes?.ok) {
          const tracked = await trackedRes.json();
          setTrackedKeywords(Array.isArray(tracked) ? tracked : []);
        }
        if (aiVisRes?.ok) {
          const aiv = await aiVisRes.json();
          if (aiv && typeof aiv.totalTracked === "number") setAiVisibility(aiv);
        }

        // Domain Authority (config-gated — silently skip if not available)
        try {
          const daRes = await fetch(`/api/seo/domain-authority?domain=${encodeURIComponent(domain)}`, { signal: controller.signal });
          if (daRes.ok) {
            const da = await daRes.json();
            setDomainAuthority(da);
          }
        } catch {
          // DA not configured — skip
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load SemRush data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [domain, projectId, campaignIds, startDate, endDate]);

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

    const sevOrder: Record<string, number> = { high: 0, medium: 1 };
    alerts.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));
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
    <div className="flex flex-col gap-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SEO Performance</h2>
          <p className="text-sm text-slate-500 mt-0.5">Organic traffic data via SEMrush</p>
        </div>
        <span className="text-sm text-slate-400">{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>
      </div>

      {afterHeader}

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
      {!hideAlerts && semrushAlerts.length > 0 && (() => {
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

      {/* Domain Authority (config-gated — only shows if Moz key is set) */}
      {show("kpis") && domainAuthority && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <MetricCard
            title="Domain Authority"
            value={domainAuthority.domainAuthority}
            subtitle="Moz DA score (0–100)"
            color="purple"
          />
          <MetricCard
            title="Page Authority"
            value={domainAuthority.pageAuthority}
            subtitle="Moz PA score (0–100)"
            color="blue"
          />
          <MetricCard
            title="Linking Root Domains"
            value={formatNumber(domainAuthority.rootDomainsLinking)}
            subtitle="Unique domains linking"
            color="green"
          />
          <MetricCard
            title="Spam Score"
            value={`${domainAuthority.spamScore}%`}
            subtitle="Higher = riskier"
            color={domainAuthority.spamScore > 30 ? "red" : "orange"}
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
                            <CssArrowUp />
                            {change}
                          </span>
                        ) : change < 0 ? (
                          <span className="flex items-center justify-center gap-0.5 text-xs text-red-600">
                            <CssArrowDown />
                            {Math.abs(change)}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center text-slate-500">
                            <CssMinus />
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
      {show("rank_improvers") && (
        <SectionCard title="Top Rank Improvers" subtitle="Keywords with biggest position gains this month">
          {rankMovers.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic", padding: "12px 0" }}>
              No position improvements detected this period — SEMrush may not yet have comparison data for this domain.
            </p>
          ) : (
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
                  {rankMovers.map((kw, i) => {
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
                            <CssArrowUp />+{gain}
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
          )}
        </SectionCard>
      )}

      {/* Tracked Keywords (Position Tracking) */}
      {show("tracked_keywords") && (
        <SectionCard title="Tracked Keyword Positions" subtitle="Positions from your SEMrush Position Tracking campaign">
          {trackedKeywords.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic", padding: "12px 0" }}>
              {projectId
                ? "No tracked keyword data returned yet — SEMrush may still be processing your project."
                : "No SEMrush project linked — add a project ID in client settings to enable position tracking."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium text-xs">Keyword</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">Position</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">Prev</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">Change</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trackedKeywords
                  .sort((a, b) => {
                    if (a.position === 0) return 1;
                    if (b.position === 0) return -1;
                    return a.position - b.position;
                  })
                  .slice(0, 50)
                  .map((kw, i) => {
                    const change = kw.previousPosition != null && kw.previousPosition > 0 && kw.position > 0
                      ? kw.previousPosition - kw.position : null;
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-3 pr-4">
                          <p className="text-slate-800 font-medium truncate max-w-[220px]">{kw.keyword}</p>
                          {kw.landingPage && <p className="text-xs text-slate-400 truncate max-w-[220px]">{kw.landingPage}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {kw.position > 0 ? (
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                              kw.position <= 3 ? "bg-emerald-50 text-emerald-700" :
                              kw.position <= 10 ? "bg-blue-50 text-blue-700" :
                              kw.position <= 20 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                            }`}>{kw.position}</span>
                          ) : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 text-xs">
                          {kw.previousPosition ?? "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {change != null && (
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              change > 0 ? "bg-emerald-50 text-emerald-700" :
                              change < 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {change > 0 ? <CssArrowUp /> : change < 0 ? <CssArrowDown /> : <CssMinus />}
                              {change > 0 ? `+${change}` : change < 0 ? `${change}` : "="}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 text-xs">{formatNumber(kw.searchVolume)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Backlinks */}
      {show("backlinks") && (backlinkError || backlinks.length > 0) && (
        <SectionCard title="Recent Backlinks" subtitle="Top referring domains by authority score">
          {backlinkError ? (
            <p className="text-sm text-red-600 py-2">{backlinkError}</p>
          ) : (
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
          )}
        </SectionCard>
      )}

      {/* AI Search Visibility */}
      {show("ai_visibility") && (
        <SectionCard title="AI Search Visibility" subtitle="How often your brand appears in Google AI Overviews for tracked keywords">
          {!projectId ? (
            <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic", padding: "12px 0" }}>
              No SEMrush project linked — add a project ID in client settings to enable AI visibility tracking.
            </p>
          ) : !aiVisibility || aiVisibility.totalTracked === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic", padding: "12px 0" }}>
              No AI visibility data returned yet. This requires a SEMrush Position Tracking project with AI Overview data enabled.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">AI Visibility Score</p>
                  <p className="text-2xl font-bold text-indigo-600">{aiVisibility.aiVisibilityScore.toFixed(1)}%</p>
                  <p className="text-xs text-slate-400 mt-0.5">of tracked keywords</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Brand Citations</p>
                  <p className="text-2xl font-bold text-emerald-600">{aiVisibility.brandCitations}</p>
                  <p className="text-xs text-slate-400 mt-0.5">in AI Overviews</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">AI Overview Keywords</p>
                  <p className="text-2xl font-bold text-blue-600">{aiVisibility.aiOverviewKeywords}</p>
                  <p className="text-xs text-slate-400 mt-0.5">trigger AI Overviews</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Total Tracked</p>
                  <p className="text-2xl font-bold text-slate-700">{aiVisibility.totalTracked}</p>
                  <p className="text-xs text-slate-400 mt-0.5">keywords monitored</p>
                </div>
              </div>
              {aiVisibility.keywords.some((k) => k.hasAIOverview) && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Keywords with AI Overview presence</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="text-left py-2 px-4 text-slate-400 font-medium text-xs">Keyword</th>
                          <th className="text-center py-2 px-3 text-slate-400 font-medium text-xs">Rank</th>
                          <th className="text-right py-2 px-3 text-slate-400 font-medium text-xs">Volume</th>
                          <th className="text-center py-2 px-4 text-slate-400 font-medium text-xs">AI Overview</th>
                          <th className="text-center py-2 px-4 text-slate-400 font-medium text-xs">Brand Cited</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiVisibility.keywords
                          .filter((k) => k.hasAIOverview)
                          .sort((a, b) => (b.brandInAIOverview ? 1 : 0) - (a.brandInAIOverview ? 1 : 0) || a.position - b.position)
                          .map((kw, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 px-4 text-slate-800 font-medium max-w-[200px] truncate">{kw.keyword}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                                  kw.position <= 3 ? "bg-emerald-50 text-emerald-700" :
                                  kw.position <= 10 ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                                }`}>{kw.position || "—"}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600 text-xs">{formatNumber(kw.searchVolume)}</td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" title="AI Overview present" />
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {kw.brandInAIOverview ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">✓ Cited</span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
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
      {!hideAi && !loading && !error && overview && (
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
      {!hideAi && !loading && !error && overview && (
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

      {/* Content Gap Analysis */}
      {show("content_gap") && contentGap.length > 0 && (
        <SectionCard title="Content Gap Analysis" subtitle="Keyword opportunities where competitors rank but you don't">
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)" }}>Keyword</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Volume</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Difficulty</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Competitors</th>
                </tr>
              </thead>
              <tbody>
                {contentGap.slice(0, 20).map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--text)", fontWeight: 500 }}>{item.keyword}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(item.volume)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: "#fff",
                        background: item.difficulty >= 80 ? "#dc2626" : item.difficulty >= 60 ? "#d97706" : item.difficulty >= 40 ? "#2563eb" : "#16a34a",
                        borderRadius: 4, padding: "2px 8px",
                      }}>
                        {item.difficulty}%
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>{item.competitors.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* SERP Features */}
      {show("serp_features") && serpFeatures.length > 0 && (
        <SectionCard title="SERP Features" subtitle="Distribution of SERP feature types for tracked keywords">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {serpFeatures.map((item, i) => {
              const maxPct = Math.max(...serpFeatures.map(f => f.percentage), 1);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ minWidth: 140, fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{item.feature}</span>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 22, position: "relative", overflow: "hidden" }}>
                    <div style={{
                      width: `${(item.percentage / maxPct) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #6366f1, #818cf8)",
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                  <span style={{ minWidth: 60, fontSize: 12, fontWeight: 600, color: "var(--text-2)", textAlign: "right" }}>
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span style={{ minWidth: 40, fontSize: 11, color: "var(--text-3)", textAlign: "right" }}>
                    {formatNumber(item.count)}
                  </span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Recent Backlink Changes */}
      {show("backlink_changes") && backlinkChanges.length > 0 && (
        <SectionCard title="Recent Backlink Changes" subtitle="New and lost backlinks detected recently">
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)" }}>URL</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--text-2)" }}>Referring Domain</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600, color: "var(--text-2)" }}>Type</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>First Seen</th>
                </tr>
              </thead>
              <tbody>
                {backlinkChanges.slice(0, 20).map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--text)", fontWeight: 500, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", textDecoration: "none" }}>
                        {item.url}
                      </a>
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-2)" }}>{item.domain}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff",
                        background: item.lost ? "#dc2626" : "#16a34a",
                        borderRadius: 4, padding: "2px 8px",
                      }}>
                        {item.lost ? "Lost" : "New"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-2)" }}>
                      {item.firstSeen ? formatDateDisplay(item.firstSeen) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Share of Voice and Seasonality */}
      {!hideAi && !loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ShareOfVoicePanel domain={domain} startDate={startDate} endDate={endDate} />
        </div>
      )}
    </div>
  );
}
