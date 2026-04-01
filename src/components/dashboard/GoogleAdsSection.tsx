"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, Delta } from "@/components/ui/index";
import { formatCurrency, formatNumber, formatPercent, formatDateDisplay, getPreviousPeriod, pctChange } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { AiLandingPageAnalysis } from "@/components/ai/AiLandingPageAnalysis";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface GoogleAdsOverview {
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsCampaignEnriched extends GoogleAdsCampaign {
  channelType: string;
  biddingStrategyType: string;
  dailyBudgetMicros: number;
  searchImpressionShare: number | null;
  searchBudgetLostImpressionShare: number | null;
  searchRankLostImpressionShare: number | null;
  absoluteTopImpressionPct: number | null;
  topImpressionPct: number | null;
}

interface GoogleAdsAdGroup {
  id: string;
  name: string;
  campaignName: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsDailyPoint {
  date: string;
  clicks: number;
  costMicros: number;
  conversions: number;
  impressions: number;
}

interface GoogleAdsSearchTerm {
  searchTerm: string;
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface GoogleAdsLandingPage {
  url: string;
  clicks: number;
  impressions: number;
  conversions: number;
}

interface GoogleAdsData {
  overview: GoogleAdsOverview;
  campaigns: GoogleAdsCampaign[];
  campaignsEnriched: GoogleAdsCampaignEnriched[];
  adGroups: GoogleAdsAdGroup[];
  daily: GoogleAdsDailyPoint[];
  searchTerms: GoogleAdsSearchTerm[];
  landingPages: GoogleAdsLandingPage[];
  avgQualityScore: number | null;
  audienceCriteria?: Array<{
    campaignId: string;
    campaignName: string;
    adGroupId: string;
    adGroupName: string;
    criterionType: string;
    displayName: string;
    negative: boolean;
    bidModifier: number | null;
  }>;
}

interface Props {
  customerId: string;
  clientId?: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hideAlerts?: boolean;
  hideAi?: boolean;
  reportMode?: boolean;
  onMetricsReady?: (metrics: Record<string, number>) => void;
  afterHeader?: ReactNode;
}

function micros(v: number) {
  return v / 1_000_000;
}

function roas(conversionsValue: number, costMicros: number) {
  const cost = micros(costMicros);
  if (cost === 0) return 0;
  return conversionsValue / cost;
}

function cpa(costMicros: number, conversions: number) {
  if (conversions === 0) return 0;
  return micros(costMicros) / conversions;
}

function ctr(clicks: number, impressions: number) {
  if (impressions === 0) return 0;
  return clicks / impressions;
}

function diffStr(curr: number, prev: number | null | undefined, fmt: "count" | "currency"): string | undefined {
  if (prev == null) return undefined;
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "\u2212";
  return sign + (fmt === "currency" ? formatCurrency(Math.abs(d)) : formatNumber(Math.abs(d)));
}

type GAdsAlert = { severity: "high" | "medium"; label: string; level: string; detail: string; recommendation: string };

export function GoogleAdsSection({ customerId, clientId, clientName, startDate, endDate, crossPlatformContext, visibleBlocks, hideAlerts, hideAi, reportMode, onMetricsReady, afterHeader }: Props) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const [data, setData] = useState<GoogleAdsData | null>(null);
  const [prevData, setPrevData] = useState<GoogleAdsData | null>(null);
  const [prevOverview, setPrevOverview] = useState<GoogleAdsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const [alertAiRecs, setAlertAiRecs] = useState<string[]>([]);
  const [alertAiLoading, setAlertAiLoading] = useState(false);

  // Compute anomaly alerts from current campaign data
  const gadsAlerts = useMemo<GAdsAlert[]>(() => {
    const alerts: GAdsAlert[] = [];
    for (const c of (data?.campaignsEnriched ?? [])) {
      if (c.status !== "ENABLED") continue;
      const costGbp = micros(c.costMicros);
      const campaignRoas = roas(c.conversionsValue, c.costMicros);

      if (c.searchBudgetLostImpressionShare != null && c.searchBudgetLostImpressionShare > 0.30) {
        const pct = Math.round(c.searchBudgetLostImpressionShare * 100);
        alerts.push({ severity: "high", level: "Campaign", label: c.name, detail: `Losing ${pct}% of eligible impressions due to budget — consider increasing daily budget`, recommendation: "Increase daily budget or narrow targeting to high-converting keywords/locations to recapture lost impression share." });
      } else if (c.searchBudgetLostImpressionShare != null && c.searchBudgetLostImpressionShare > 0.10) {
        const pct = Math.round(c.searchBudgetLostImpressionShare * 100);
        alerts.push({ severity: "medium", level: "Campaign", label: c.name, detail: `Losing ${pct}% of eligible impressions due to budget constraints`, recommendation: "Consider increasing budget or restricting delivery to peak conversion windows. Review dayparting and bid scheduling settings." });
      }

      if (c.searchRankLostImpressionShare != null && c.searchRankLostImpressionShare > 0.40) {
        const pct = Math.round(c.searchRankLostImpressionShare * 100);
        alerts.push({ severity: "high", level: "Campaign", label: c.name, detail: `Losing ${pct}% of eligible impressions due to low ad rank — review bids and quality score`, recommendation: "Raise bids on key terms and improve Quality Score by aligning keyword-to-ad-copy relevance and strengthening landing page experience." });
      } else if (c.searchRankLostImpressionShare != null && c.searchRankLostImpressionShare > 0.15) {
        const pct = Math.round(c.searchRankLostImpressionShare * 100);
        alerts.push({ severity: "medium", level: "Campaign", label: c.name, detail: `Losing ${pct}% of eligible impressions due to low ad rank`, recommendation: "Review keyword bids and Quality Scores. Tighten ad group themes to improve relevance and reduce rank-driven impression share loss." });
      }

      if (campaignRoas > 0 && campaignRoas < 1.0 && costGbp > 50)
        alerts.push({ severity: "high", level: "Campaign", label: c.name, detail: `ROAS ${campaignRoas.toFixed(2)}× — spend exceeding revenue`, recommendation: "Pause or restructure this campaign. Add negative keywords, review match types, and verify conversion tracking accuracy before reactivating." });
      else if (campaignRoas > 0 && campaignRoas < 1.5 && costGbp > 100)
        alerts.push({ severity: "medium", level: "Campaign", label: c.name, detail: `ROAS ${campaignRoas.toFixed(2)}× — below target threshold`, recommendation: "Tighten targeting to intent-rich queries. Consider switching to Target ROAS bidding once the campaign has 30+ conversions/month." });

      if (c.searchImpressionShare != null && c.searchImpressionShare < 0.30 && c.impressions > 100 && (c.channelType === "SEARCH" || !c.channelType)) {
        const pct = Math.round(c.searchImpressionShare * 100);
        alerts.push({ severity: pct < 15 ? "high" : "medium", level: "Campaign", label: c.name, detail: `Only ${pct}% search impression share — significant room to capture more traffic`, recommendation: "Increase budget or consolidate campaigns to improve Quality Scores. Prioritise highest-converting search terms to maximise impression share." });
      }

      // ── Audience signals ────────────────────────────────────────────────
      const criteria = data?.audienceCriteria ?? [];
      const campCriteria = criteria.filter((cr) => cr.campaignId === c.id);

      const hasRemarketing = campCriteria.some(
        (cr) => cr.criterionType === "USER_LIST" && !cr.negative
      );
      if (!hasRemarketing && (c.channelType === "SEARCH" || c.channelType === "SHOPPING" || !c.channelType)) {
        alerts.push({
          severity: "medium",
          level: "Campaign",
          label: c.name,
          detail: "No remarketing or customer match lists applied to this campaign",
          recommendation: "Add RLSA (Remarketing Lists for Search Ads) or Customer Match audiences. Even in observation mode, bid modifiers for warm audiences typically improve conversion rates and ROAS.",
        });
      }

      const audienceCriteria = campCriteria.filter(
        (cr) => (cr.criterionType === "AUDIENCE" || cr.criterionType === "USER_INTEREST") && !cr.negative
      );
      if (
        audienceCriteria.length > 0 &&
        audienceCriteria.every((cr) => cr.bidModifier === null || cr.bidModifier === 1.0)
      ) {
        alerts.push({
          severity: "medium",
          level: "Campaign",
          label: c.name,
          detail: "All audiences are in observation mode with no bid adjustments",
          recommendation: "Review audience performance and apply positive bid modifiers (+20–50%) to segments with strong conversion rates, or switch high-performing audiences to Targeting mode.",
        });
      }
    }
    return alerts;
  }, [data]);

  // Fetch AI-generated recommendations for each alert
  useEffect(() => {
    setAlertAiRecs([]);
    if (!gadsAlerts.length) return;
    setAlertAiLoading(true);
    fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionType: "alert_recommendations",
        campaignPlatform: "googleads",
        alerts: gadsAlerts.map(a => ({ severity: a.severity, level: a.level, label: a.label, detail: a.detail })),
        campaignData: data?.campaignsEnriched ?? [],
        clientName,
        dateRange: `${startDate} to ${endDate}`,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.recommendations?.length) setAlertAiRecs(json.recommendations); })
      .catch(() => {})
      .finally(() => setAlertAiLoading(false));
  }, [gadsAlerts, clientId, startDate, endDate]);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    async function load() {
      setLoading(true);
      setError("");
      setData(null);
      setPrevOverview(null);
      setPrevData(null);

      const params = new URLSearchParams({ customerId, startDate, endDate });
      const prev = getPreviousPeriod(startDate, endDate);
      const prevParams = new URLSearchParams({ customerId, startDate: prev.startDate, endDate: prev.endDate });

      try {
        const [json, prevJson] = await Promise.all([
          fetch(`/api/google-ads?${params}`, { signal: controller.signal, cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/google-ads?${prevParams}`, { signal: controller.signal, cache: "no-store" }).then((r) => r.json()),
        ]);
        if (json.error) setError(json.error);
        else {
          setData(json);
          if (json?.overview) onMetricsReady?.({
            clicks: json.overview.clicks,
            impressions: json.overview.impressions,
            cost: json.overview.costMicros / 1_000_000,
            conversions: json.overview.conversions,
            conversionValue: json.overview.conversionsValue,
            ctr: json.overview.impressions > 0 ? json.overview.clicks / json.overview.impressions : 0,
            roas: json.overview.costMicros > 0 ? json.overview.conversionsValue / (json.overview.costMicros / 1_000_000) : 0,
            cpa: json.overview.conversions > 0 ? (json.overview.costMicros / 1_000_000) / json.overview.conversions : 0,
          });
        }
        if (!prevJson?.error && prevJson?.overview) {
          setPrevOverview(prevJson.overview);
          setPrevData(prevJson);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") setError("Failed to load Google Ads data");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [customerId, startDate, endDate]);

  // Auto-save a metric snapshot for historical trending (non-critical, fire-and-forget)
  useEffect(() => {
    if (!clientId || !data?.overview) return;
    const overview = data.overview;
    fetch("/api/ai/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        sectionType: "googleads",
        periodStart: startDate,
        periodEnd: endDate,
        metrics: {
          clicks: overview.clicks,
          impressions: overview.impressions,
          cost: micros(overview.costMicros),
          conversions: overview.conversions,
          conversionValue: overview.conversionsValue,
          ctr: ctr(overview.clicks, overview.impressions),
          roas: roas(overview.conversionsValue, overview.costMicros),
          cpa: overview.conversions > 0 ? micros(overview.costMicros) / overview.conversions : 0,
        },
        campaignData: data.campaignsEnriched?.length ? data.campaignsEnriched : data.campaigns,
      }),
    }).catch((err) => { console.debug("Snapshot save failed (non-critical):", err); });
  }, [clientId, data, startDate, endDate]);

  const chartData = (data?.daily ?? []).map((d) => ({
    date: d.date.slice(5), // MM-DD
    cost: micros(d.costMicros),
    clicks: d.clicks,
    conversions: d.conversions,
  }));
  const prevCampaignsMap = new Map((prevData?.campaigns ?? []).map((c) => [c.id, c]));
  const prevAdGroupsMap = new Map((prevData?.adGroups ?? []).map((ag) => [ag.id, ag]));

  // Weighted-average Search Impression Share across search campaigns
  const weightedIS = (() => {
    const enriched = data?.campaignsEnriched ?? [];
    const searchCampaigns = enriched.filter(
      (c) => c.searchImpressionShare != null && c.impressions > 0
    );
    if (!searchCampaigns.length) return null;
    const totalImpressions = searchCampaigns.reduce((s, c) => s + c.impressions, 0);
    if (totalImpressions === 0) return null;
    const weightedSum = searchCampaigns.reduce(
      (s, c) => s + c.searchImpressionShare! * c.impressions,
      0
    );
    return weightedSum / totalImpressions;
  })();

  return (
    <div className="flex flex-col gap-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paid Search</h2>
          <p className="text-sm text-slate-500 mt-0.5">Campaign performance data via Google Ads</p>
        </div>
        <span className="text-sm text-slate-400">
          {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
        </span>
      </div>

      {afterHeader}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
          <span className="inline-block w-4 h-4 border-2 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
          Loading Google Ads data…
        </div>
      ) : error ? (
        error.includes("DEVELOPER_TOKEN_NOT_APPROVED") ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-2">
            <p className="text-sm font-semibold text-amber-700">Google Ads Basic Access required</p>
            <p className="text-sm text-slate-600">
              The Google Ads developer token is currently in test mode and cannot access real account data.
            </p>
            <ol className="text-sm text-slate-500 list-decimal list-inside space-y-1">
              <li>Sign in to <span className="text-amber-700 font-mono">ads.google.com</span> with a manager account</li>
              <li>Go to <strong className="text-slate-700">Tools → API Center</strong></li>
              <li>Click <strong className="text-slate-700">Apply for Basic Access</strong> and submit the form</li>
              <li>Approval typically takes 1–2 business days</li>
            </ol>
          </div>
        ) : error.includes("invalid_grant") ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-2">
            <p className="text-sm font-semibold text-amber-700">Google Ads OAuth token expired</p>
            <p className="text-sm text-slate-600">
              The refresh token has expired or been revoked; this typically happens when the Google Cloud OAuth app is in <strong>Testing</strong> mode (tokens expire after 7 days).
            </p>
            <ol className="text-sm text-slate-500 list-decimal list-inside space-y-1">
              <li>Run <span className="font-mono text-amber-700">node scripts/get-gads-refresh-token.mjs</span> to generate a new token</li>
              <li>Update <span className="font-mono text-amber-700">GOOGLE_ADS_REFRESH_TOKEN</span> in Vercel environment variables</li>
              <li>Redeploy or run <span className="font-mono text-amber-700">npx vercel env pull</span> locally</li>
              <li>To avoid this repeating, publish the OAuth consent screen in Google Cloud Console</li>
            </ol>
          </div>
        ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
          {error}
        </div>
        )
      ) : !data ? null : (
        <>
          {/* Performance alerts — campaigns */}
          {!hideAlerts && gadsAlerts.length > 0 && (() => {
            const highAlerts = gadsAlerts.filter(a => a.severity === "high");
            const medAlerts  = gadsAlerts.filter(a => a.severity === "medium");
            const levelColour: Record<string, string> = { Campaign: "#2563eb" };
            return (
              <div style={{ borderRadius: 12, border: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}`, background: highAlerts.length ? "#fff1f2" : "#fffbeb", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}` }}>
                  <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: highAlerts.length ? "#dc2626" : "#d97706" }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: highAlerts.length ? "#991b1b" : "#92400e", margin: 0 }}>
                    {highAlerts.length} high-priority · {medAlerts.length} medium-priority issue{gadsAlerts.length !== 1 ? "s" : ""} detected
                  </p>
                  {alertAiLoading && (
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "#0f766e", fontStyle: "italic", flexShrink: 0 }}>Generating AI recommendations…</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {gadsAlerts.map((a, i) => (
                    <div key={i} style={{ padding: "8px 16px", borderBottom: i < gadsAlerts.length - 1 ? `1px solid ${highAlerts.length ? "#fee2e2" : "#fef3c7"}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: a.severity === "high" ? "#dc2626" : "#d97706", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                          {a.severity}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: levelColour[a.level] ?? "#2563eb", flexShrink: 0 }}>
                          {a.level}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>
                          {a.label}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {a.detail}
                        </span>
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

          {/* Metric cards — primary + secondary, uniform 20px gap throughout */}
          {show("kpis") && (
          <div className="flex flex-col gap-6">
          {/* Overview metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            <MetricCard
              title="Clicks"
              value={formatNumber(data.overview.clicks)}
              change={prevOverview ? pctChange(data.overview.clicks, prevOverview.clicks) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.clicks, prevOverview.clicks, "count") : undefined}
            />
            <MetricCard
              title="Cost"
              value={formatCurrency(micros(data.overview.costMicros))}
              change={prevOverview ? pctChange(micros(data.overview.costMicros), micros(prevOverview.costMicros)) : undefined}
              changeDiff={prevOverview ? diffStr(micros(data.overview.costMicros), micros(prevOverview.costMicros), "currency") : undefined}
            />
            <MetricCard
              title="Conversions"
              value={formatNumber(data.overview.conversions)}
              change={prevOverview ? pctChange(data.overview.conversions, prevOverview.conversions) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.conversions, prevOverview.conversions, "count") : undefined}
            />
            <MetricCard
              title="Conv. Value"
              value={formatCurrency(data.overview.conversionsValue)}
              change={prevOverview ? pctChange(data.overview.conversionsValue, prevOverview.conversionsValue) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.conversionsValue, prevOverview.conversionsValue, "currency") : undefined}
            />
            <MetricCard
              title="ROAS"
              value={`${roas(data.overview.conversionsValue, data.overview.costMicros).toFixed(2)}x`}
              change={prevOverview ? pctChange(roas(data.overview.conversionsValue, data.overview.costMicros), roas(prevOverview.conversionsValue, prevOverview.costMicros)) : undefined}
            />
            <MetricCard
              title="CPA"
              value={formatCurrency(cpa(data.overview.costMicros, data.overview.conversions))}
              change={prevOverview ? pctChange(cpa(prevOverview.costMicros, prevOverview.conversions), cpa(data.overview.costMicros, data.overview.conversions)) : undefined}
              changeDiff={prevOverview ? diffStr(cpa(data.overview.costMicros, data.overview.conversions), cpa(prevOverview.costMicros, prevOverview.conversions), "currency") : undefined}
            />
          </div>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <MetricCard
              title="Impressions"
              value={formatNumber(data.overview.impressions)}
              change={prevOverview ? pctChange(data.overview.impressions, prevOverview.impressions) : undefined}
              changeDiff={prevOverview ? diffStr(data.overview.impressions, prevOverview.impressions, "count") : undefined}
            />
            <MetricCard
              title="CTR"
              value={formatPercent(ctr(data.overview.clicks, data.overview.impressions))}
              change={prevOverview ? pctChange(ctr(data.overview.clicks, data.overview.impressions), ctr(prevOverview.clicks, prevOverview.impressions)) : undefined}
            />
            <MetricCard
              title="Avg. CPC"
              value={formatCurrency(
                data.overview.clicks > 0
                  ? micros(data.overview.costMicros) / data.overview.clicks
                  : 0
              )}
            />
            {weightedIS != null && (
              <MetricCard
                title="Search Imp. Share"
                value={formatPercent(weightedIS)}
                subtitle="vs eligible impressions"
              />
            )}
          </div>
          </div>
          )}

          {/* Daily spend & clicks chart */}
          {show("chart") && chartData.length > 0 && (
            <SectionCard title="Spend, Clicks & Conversions">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gadsGradCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gadsGradClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gadsGradConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="cost"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `£${v}`}
                    width={50}
                  />
                  <YAxis
                    yAxisId="clicks"
                    orientation="right"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#64748b" }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => {
                      const num = typeof value === "number" ? value : Number(value ?? 0);
                      if (name === "cost") return [`£${num.toFixed(2)}`, "Cost"];
                      if (name === "clicks") return [formatNumber(num), "Clicks"];
                      if (name === "conversions") return [formatNumber(num), "Conversions"];
                      return [num, name];
                    }}
                  />
                  <Area
                    yAxisId="cost"
                    type="monotone"
                    dataKey="cost"
                    stroke="#eab308"
                    strokeWidth={2}
                    fill="url(#gadsGradCost)"
                    dot={false}
                  />
                  <Area
                    yAxisId="clicks"
                    type="monotone"
                    dataKey="clicks"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gadsGradClicks)"
                    dot={false}
                  />
                  <Area
                    yAxisId="clicks"
                    type="monotone"
                    dataKey="conversions"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#gadsGradConversions)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* Campaign + Ad Group breakdown */}
          {show("campaigns") && data.campaigns.length > 0 && (() => {
            const visibleCampaigns = data.campaigns.filter(c => c.clicks > 0 || c.costMicros > 0);
            if (!visibleCampaigns.length) return null;

            if (reportMode) {
              return (
                <div className="flex flex-col gap-6">
                  {visibleCampaigns.map((c) => {
                    const prevC = prevCampaignsMap.get(c.id);
                    const campAdGroups = (data.adGroups ?? []).filter(ag => ag.campaignName === c.name && (ag.clicks > 0 || ag.costMicros > 0));
                    const campRoas = roas(c.conversionsValue, c.costMicros);
                    const prevRoas = prevC ? roas(prevC.conversionsValue, prevC.costMicros) : undefined;

                    const stats: { label: string; display: string; current: number; previous: number | null | undefined; fmt: "currency" | "count" | "none" }[] = [
                      { label: "Cost", display: formatCurrency(micros(c.costMicros)), current: micros(c.costMicros), previous: prevC ? micros(prevC.costMicros) : undefined, fmt: "currency" },
                      { label: "Impressions", display: formatNumber(c.impressions), current: c.impressions, previous: prevC?.impressions, fmt: "count" },
                      { label: "Clicks", display: formatNumber(c.clicks), current: c.clicks, previous: prevC?.clicks, fmt: "count" },
                      { label: "Conversions", display: formatNumber(c.conversions), current: c.conversions, previous: prevC?.conversions, fmt: "count" },
                      { label: "Conv. Value", display: formatCurrency(c.conversionsValue), current: c.conversionsValue, previous: prevC?.conversionsValue, fmt: "currency" },
                    ];

                    return (
                      <SectionCard
                        key={c.id}
                        title={c.name}
                        subtitle={campAdGroups.length > 0 ? `${campAdGroups.length} ad group${campAdGroups.length !== 1 ? "s" : ""}` : c.status}
                      >
                        {/* Campaign stats row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, paddingBottom: 20, marginBottom: campAdGroups.length > 0 ? 24 : 0, borderBottom: campAdGroups.length > 0 ? "1px solid var(--border-subtle)" : "none" }}>
                          {stats.map(({ label, display, current, previous, fmt }) => (
                            <div key={label}>
                              <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 4 }}>{label}</p>
                              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>{display}</p>
                              <Delta current={current} previous={previous ?? null} format={fmt} />
                            </div>
                          ))}
                          <div>
                            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 4 }}>ROAS</p>
                            <p style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", color: campRoas >= 2 ? "#10b981" : campRoas >= 1 ? "#f59e0b" : "#ef4444" }}>{campRoas.toFixed(2)}x</p>
                            <Delta current={campRoas} previous={prevRoas ?? null} format="none" />
                          </div>
                        </div>

                        {/* Ad Groups */}
                        {campAdGroups.length > 0 && (
                          <div>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>Ad Groups</p>
                            <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 500 }}>Name</th>
                                  <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Cost</th>
                                  <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Impressions</th>
                                  <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                                  <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Conversions</th>
                                  <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Value</th>
                                  <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-3)", fontWeight: 500 }}>ROAS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {campAdGroups.map((ag) => {
                                  const prevAg = prevAdGroupsMap.get(ag.id);
                                  const agRoas = roas(ag.conversionsValue, ag.costMicros);
                                  return (
                                    <tr key={ag.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                      <td style={{ padding: "10px 0" }}>
                                        <p style={{ fontWeight: 600, color: "var(--text)" }}>{ag.name}</p>
                                      </td>
                                      <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatCurrency(micros(ag.costMicros))}</td>
                                      <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(ag.impressions)}</td>
                                      <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(ag.clicks)}</td>
                                      <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(ag.conversions)}</td>
                                      <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatCurrency(ag.conversionsValue)}</td>
                                      <td style={{ textAlign: "right", padding: "10px 0", whiteSpace: "nowrap" }}>
                                        <span style={{ fontWeight: 700, color: agRoas >= 2 ? "#10b981" : agRoas >= 1 ? "#f59e0b" : "#ef4444" }}>{agRoas.toFixed(2)}x</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </SectionCard>
                    );
                  })}
                </div>
              );
            }

            // Dashboard mode: flat tables
            return (
              <div className="flex flex-col gap-5">
                <SectionCard title="Campaign Performance">
                  <div style={{ overflowX: "auto" }}>
                  <table className="w-full text-xs" style={{ minWidth: 700 }}>
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                        <th className="text-left px-6 py-4 font-medium">Campaign</th>
                        <th className="text-right px-4 py-4 font-medium">Clicks</th>
                        <th className="text-right px-4 py-4 font-medium">Cost</th>
                        <th className="text-right px-4 py-4 font-medium">Conv.</th>
                        <th className="text-right px-4 py-4 font-medium">Conv. Value</th>
                        <th className="text-right px-4 py-4 font-medium">ROAS</th>
                        <th className="text-right px-6 py-4 font-medium">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleCampaigns.map((c) => {
                        const prevC = prevCampaignsMap.get(c.id);
                        return (
                        <tr key={c.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 text-slate-800 font-medium max-w-[300px] truncate">
                            {c.name}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            <div>{formatNumber(c.clicks)}</div>
                            <Delta current={c.clicks} previous={prevC?.clicks} format="count" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            <div>{formatCurrency(micros(c.costMicros))}</div>
                            <Delta current={micros(c.costMicros)} previous={prevC ? micros(prevC.costMicros) : undefined} format="currency" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            <div>{formatNumber(c.conversions)}</div>
                            <Delta current={c.conversions} previous={prevC?.conversions} format="count" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            <div>{formatCurrency(c.conversionsValue)}</div>
                            <Delta current={c.conversionsValue} previous={prevC?.conversionsValue} format="currency" />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`font-semibold ${roas(c.conversionsValue, c.costMicros) >= 2 ? "text-emerald-600" : roas(c.conversionsValue, c.costMicros) >= 1 ? "text-amber-600" : "text-red-600"}`}>
                              {roas(c.conversionsValue, c.costMicros).toFixed(2)}x
                            </span>
                            <Delta current={roas(c.conversionsValue, c.costMicros)} previous={prevC ? roas(prevC.conversionsValue, prevC.costMicros) : undefined} format="none" />
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">
                            <div>{formatPercent(ctr(c.clicks, c.impressions))}</div>
                            <Delta current={ctr(c.clicks, c.impressions)} previous={prevC ? ctr(prevC.clicks, prevC.impressions) : undefined} format="none" />
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </SectionCard>

                {show("ad_groups") && (() => {
                  const visibleAdGroups = data.adGroups.filter(ag => ag.clicks > 0 || ag.costMicros > 0);
                  if (!visibleAdGroups.length) return null;
                  return (
                    <SectionCard title="Ad Group Performance">
                      <div style={{ overflowX: "auto" }}>
                      <table className="w-full text-xs" style={{ minWidth: 700 }}>
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                            <th className="text-left px-6 py-4 font-medium">Ad Group</th>
                            <th className="text-left px-4 py-4 font-medium text-slate-600">Campaign</th>
                            <th className="text-right px-4 py-4 font-medium">Clicks</th>
                            <th className="text-right px-4 py-4 font-medium">Cost</th>
                            <th className="text-right px-4 py-4 font-medium">Conv.</th>
                            <th className="text-right px-4 py-4 font-medium">Conv. Value</th>
                            <th className="text-right px-6 py-4 font-medium">ROAS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleAdGroups.map((ag) => {
                            const prevAg = prevAdGroupsMap.get(ag.id);
                            return (
                            <tr key={ag.id} className="hover:bg-slate-50 transition">
                              <td className="px-6 py-4 text-slate-800 font-medium max-w-[220px] truncate">
                                {ag.name}
                              </td>
                              <td className="px-4 py-4 text-slate-500 max-w-[200px] truncate">
                                {ag.campaignName}
                              </td>
                              <td className="px-4 py-4 text-right text-slate-600">
                                <div>{formatNumber(ag.clicks)}</div>
                                <Delta current={ag.clicks} previous={prevAg?.clicks} format="count" />
                              </td>
                              <td className="px-4 py-4 text-right text-slate-600">
                                <div>{formatCurrency(micros(ag.costMicros))}</div>
                                <Delta current={micros(ag.costMicros)} previous={prevAg ? micros(prevAg.costMicros) : undefined} format="currency" />
                              </td>
                              <td className="px-4 py-4 text-right text-slate-600">
                                <div>{formatNumber(ag.conversions)}</div>
                                <Delta current={ag.conversions} previous={prevAg?.conversions} format="count" />
                              </td>
                              <td className="px-4 py-4 text-right text-slate-600">
                                <div>{formatCurrency(ag.conversionsValue)}</div>
                                <Delta current={ag.conversionsValue} previous={prevAg?.conversionsValue} format="currency" />
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={`font-semibold ${roas(ag.conversionsValue, ag.costMicros) >= 2 ? "text-emerald-600" : roas(ag.conversionsValue, ag.costMicros) >= 1 ? "text-amber-600" : "text-red-600"}`}>
                                  {roas(ag.conversionsValue, ag.costMicros).toFixed(2)}x
                                </span>
                                <Delta current={roas(ag.conversionsValue, ag.costMicros)} previous={prevAg ? roas(prevAg.conversionsValue, prevAg.costMicros) : undefined} format="none" />
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
                    </SectionCard>
                  );
                })()}
              </div>
            );
          })()}

          {/* Search terms report */}
          {(data.searchTerms ?? []).length > 0 && (
            <SectionCard title="Search Terms" subtitle="Top queries triggering your ads">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                    <th className="text-left px-6 py-4 font-medium">Search Term</th>
                    <th className="text-right px-4 py-4 font-medium">Clicks</th>
                    <th className="text-right px-4 py-4 font-medium">Impr.</th>
                    <th className="text-right px-4 py-4 font-medium">CTR</th>
                    <th className="text-right px-4 py-4 font-medium">Cost</th>
                    <th className="text-right px-6 py-4 font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.searchTerms ?? []).map((st, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 text-slate-800 font-medium max-w-[360px] truncate">
                        {st.searchTerm}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-700 font-semibold">
                        {formatNumber(st.clicks)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">
                        {formatNumber(st.impressions)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">
                        {formatPercent(ctr(st.clicks, st.impressions))}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">
                        {formatCurrency(micros(st.costMicros))}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">
                        {st.conversions.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          )}
        </>
      )}

      {/* Super Summary */}
      {!hideAi && !loading && !error && data?.overview && (
        <SuperSummary
          sectionType="googleads"
          metrics={{
            clicks: data.overview.clicks,
            impressions: data.overview.impressions,
            cost: micros(data.overview.costMicros),
            conversions: data.overview.conversions,
            conversionValue: data.overview.conversionsValue,
            ctr: ctr(data.overview.clicks, data.overview.impressions),
            roas: roas(data.overview.conversionsValue, data.overview.costMicros),
            cpa: data.overview.conversions > 0
              ? micros(data.overview.costMicros) / data.overview.conversions
              : 0,
            ...(data.avgQualityScore != null ? { qualityScore: data.avgQualityScore } : {}),
          }}
          previousMetrics={prevOverview ? {
            clicks: prevOverview.clicks,
            impressions: prevOverview.impressions,
            cost: micros(prevOverview.costMicros),
            conversions: prevOverview.conversions,
            conversionValue: prevOverview.conversionsValue,
            ctr: ctr(prevOverview.clicks, prevOverview.impressions),
            roas: roas(prevOverview.conversionsValue, prevOverview.costMicros),
            cpa: prevOverview.conversions > 0
              ? micros(prevOverview.costMicros) / prevOverview.conversions
              : 0,
          } : undefined}
          campaignData={data.campaignsEnriched?.length ? data.campaignsEnriched as unknown as Record<string, unknown>[] : undefined}
          landingPages={data.landingPages?.length ? data.landingPages : undefined}
          clientName={clientName}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {!hideAi && !loading && !error && data?.overview && (
        <AiInsightsPanel
          sectionType="googleads"
          metrics={{
            clicks: data.overview.clicks,
            impressions: data.overview.impressions,
            cost: micros(data.overview.costMicros),
            conversions: data.overview.conversions,
            conversionValue: data.overview.conversionsValue,
            ctr: ctr(data.overview.clicks, data.overview.impressions),
            roas: roas(data.overview.conversionsValue, data.overview.costMicros),
            cpa: data.overview.conversions > 0
              ? micros(data.overview.costMicros) / data.overview.conversions
              : 0,
            ...(data.avgQualityScore != null ? { qualityScore: data.avgQualityScore } : {}),
          }}
          previousMetrics={prevOverview ? {
            clicks: prevOverview.clicks,
            impressions: prevOverview.impressions,
            cost: micros(prevOverview.costMicros),
            conversions: prevOverview.conversions,
            conversionValue: prevOverview.conversionsValue,
            ctr: ctr(prevOverview.clicks, prevOverview.impressions),
            roas: roas(prevOverview.conversionsValue, prevOverview.costMicros),
            cpa: prevOverview.conversions > 0
              ? micros(prevOverview.costMicros) / prevOverview.conversions
              : 0,
          } : undefined}
          campaignData={data.campaignsEnriched?.length ? data.campaignsEnriched as unknown as Record<string, unknown>[] : undefined}
          landingPages={data.landingPages?.length ? data.landingPages : undefined}
          clientId={clientId}
          clientName={clientName}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* Landing Page Analysis */}
      {!hideAi && !loading && !error && data?.landingPages?.length ? (
        <AiLandingPageAnalysis
          landingPages={data.landingPages}
          clientName={clientName}
          source="googleads"
        />
      ) : null}
    </div>
  );
}
