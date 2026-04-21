"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, Delta } from "@/components/ui/index";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_AREA_STYLE } from "@/lib/chart-config";
import { formatCurrency, formatNumber, formatPercent, formatDateDisplay, getPreviousPeriod, pctChange } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { AiLandingPageAnalysis } from "@/components/ai/AiLandingPageAnalysis";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { CreativeIntelligencePanel } from "./CreativeIntelligencePanel";
import { resolveConfig, filterAlertsByConfig } from "@/lib/signals/defaults";
import { ClickFraudPanel } from "./ClickFraudPanel";

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
  matchType?: string;
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
  invalidClicks?: {
    invalidClicks: number;
    invalidClickRate: number;
    validClicks: number;
    estimatedInvalidCostMicros: number;
    totalCostMicros: number;
  };
  keywordQualityScores?: Array<{
    keyword: string;
    campaignName: string;
    adGroupName: string;
    qualityScore: number | null;
    expectedCtr: string;
    adRelevance: string;
    landingPageExperience: string;
    clicks: number;
    costMicros: number;
    impressions: number;
  }>;
  pmaxInsights?: Array<{
    campaignName: string;
    assetGroupName: string;
    listingGroupStatus: string;
    clicks: number;
    impressions: number;
    costMicros: number;
    conversions: number;
    conversionsValue: number;
  }>;
  geoPerformance?: Array<{
    country: string;
    region: string;
    clicks: number;
    impressions: number;
    costMicros: number;
    conversions: number;
  }>;
  schedulePerformance?: Array<{
    dayOfWeek: string;
    hourOfDay: number;
    clicks: number;
    impressions: number;
    costMicros: number;
    conversions: number;
  }>;
  deviceBreakdown?: Array<{
    device: string;
    clicks: number;
    costMicros: number;
    impressions: number;
    conversions: number;
    conversionsValue: number;
  }>;
  negativeKeywords?: Array<{
    sharedSetId: string;
    sharedSetName: string;
    keyword: string;
    matchType: string;
  }>;
  demographics?: Array<{
    type: string;
    segment: string;
    clicks: number;
    impressions: number;
    costMicros: number;
    conversions: number;
  }>;
  shoppingPerformance?: Array<{
    productTitle: string;
    productId: string;
    productBrand: string;
    clicks: number;
    impressions: number;
    costMicros: number;
    conversions: number;
    conversionsValue: number;
  }>;
  conversionActions?: Array<{
    id: string;
    name: string;
    category: string;
    type: string;
    conversions: number;
    conversionsValue: number;
    costPerConversion: number;
  }>;
  callExtensions?: Array<{
    callerCountryCode: string;
    callDurationSeconds: number;
    callType: string;
    callStatus: string;
    campaignName: string;
  }>;
  sitelinkPerformance?: Array<{
    sitelinkText: string;
    clicks: number;
    impressions: number;
    costMicros: number;
    conversions: number;
  }>;
  displayVideoData?: Array<{
    campaignId: string;
    campaignName: string;
    channelType: string;
    clicks: number;
    impressions: number;
    costMicros: number;
    conversions: number;
    videoViews: number;
    videoViewRate: number;
  }>;
  recommendations?: Array<{
    type: string;
    impact: string;
    campaignName: string;
  }>;
  budgetUtilisation?: Array<{
    campaignId: string;
    campaignName: string;
    dailyBudgetMicros: number;
    spendMicros: number;
    utilisationPercent: number;
    budgetStatus: string;
  }>;
}

interface Props {
  customerId: string;
  clientId?: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hideAlerts?: boolean;
  hideAi?: boolean;
  reportMode?: boolean;
  clickFraudToken?: string | null;
  /** JSON string — see SignalConfig in `src/lib/signals/types.ts`. */
  signalConfig?: string | null;
  onMetricsReady?: (metrics: Record<string, number>) => void;
  onPreviousMetricsReady?: (metrics: Record<string, number>) => void;
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

export function GoogleAdsSection({ customerId, clientId, clientName, startDate, endDate, compareStartDate, compareEndDate, crossPlatformContext, visibleBlocks, hideAlerts, hideAi, reportMode, clickFraudToken, signalConfig, onMetricsReady, onPreviousMetricsReady, afterHeader }: Props) {
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
    const sevOrder: Record<string, number> = { high: 0, medium: 1 };
    alerts.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));
    // Drop ROAS/conversion alerts the client config says shouldn't fire.
    const cfg = resolveConfig(signalConfig ?? null);
    return filterAlertsByConfig(alerts, cfg);
  }, [data, signalConfig]);

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
        // clientId lets the backend load signalConfig + AI instructions + goals
        // and apply the direction-sanity guard.
        clientId,
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
      const prev = (compareStartDate && compareEndDate)
        ? { startDate: compareStartDate, endDate: compareEndDate }
        : getPreviousPeriod(startDate, endDate);
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
          onPreviousMetricsReady?.({
            clicks: prevJson.overview.clicks,
            impressions: prevJson.overview.impressions,
            cost: prevJson.overview.costMicros / 1_000_000,
            conversions: prevJson.overview.conversions,
            conversionValue: prevJson.overview.conversionsValue,
            ctr: prevJson.overview.impressions > 0 ? prevJson.overview.clicks / prevJson.overview.impressions : 0,
            roas: prevJson.overview.costMicros > 0 ? prevJson.overview.conversionsValue / (prevJson.overview.costMicros / 1_000_000) : 0,
            cpa: prevJson.overview.conversions > 0 ? (prevJson.overview.costMicros / 1_000_000) / prevJson.overview.conversions : 0,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") setError("Failed to load Google Ads data");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [customerId, startDate, endDate, compareStartDate, compareEndDate]);

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
      <SectionHeader
        title="Paid Search"
        subtitle="Via Google Ads"
        icon={AlertTriangle}
        iconColor="#4285f4"
        actions={<span style={{ fontSize: 13, color: "var(--text-3)" }}>{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>}
      />

      {afterHeader}

      {loading ? (
        <SectionLoading color="#4285f4" message="Loading Google Ads data…" />
      ) : error ? (
        error.includes("DEVELOPER_TOKEN_NOT_APPROVED") ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-2">
            <p className="text-sm font-semibold text-amber-700">Google Ads Basic Access required</p>
            <p className="text-sm text-[var(--text-2)]">
              The Google Ads developer token is currently in test mode and cannot access real account data.
            </p>
            <ol className="text-sm text-[var(--text-3)] list-decimal list-inside space-y-1">
              <li>Sign in to <span className="text-amber-700 font-mono">ads.google.com</span> with a manager account</li>
              <li>Go to <strong className="text-[var(--text)]">Tools → API Center</strong></li>
              <li>Click <strong className="text-[var(--text)]">Apply for Basic Access</strong> and submit the form</li>
              <li>Approval typically takes 1–2 business days</li>
            </ol>
          </div>
        ) : error.includes("invalid_grant") ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 space-y-2">
            <p className="text-sm font-semibold text-amber-700">Google Ads OAuth token expired</p>
            <p className="text-sm text-[var(--text-2)]">
              The refresh token has expired or been revoked; this typically happens when the Google Cloud OAuth app is in <strong>Testing</strong> mode (tokens expire after 7 days).
            </p>
            <ol className="text-sm text-[var(--text-3)] list-decimal list-inside space-y-1">
              <li>Run <span className="font-mono text-amber-700">node scripts/get-gads-refresh-token.mjs</span> to generate a new token</li>
              <li>Update <span className="font-mono text-amber-700">GOOGLE_ADS_REFRESH_TOKEN</span> in Vercel environment variables</li>
              <li>Redeploy or run <span className="font-mono text-amber-700">npx vercel env pull</span> locally</li>
              <li>To avoid this repeating, publish the OAuth consent screen in Google Cloud Console</li>
            </ol>
          </div>
        ) : (
          <SectionError message={error} />
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
                  <CartesianGrid {...CHART_GRID_STYLE} />
                  <XAxis
                    dataKey="date"
                    {...CHART_AXIS_STYLE}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="cost"
                    {...CHART_AXIS_STYLE}
                    tickFormatter={(v) => `£${v}`}
                    width={50}
                  />
                  <YAxis
                    yAxisId="clicks"
                    orientation="right"
                    {...CHART_AXIS_STYLE}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
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
                    {...CHART_AREA_STYLE}
                    yAxisId="cost"
                    dataKey="cost"
                    stroke="#eab308"
                    fill="url(#gadsGradCost)"
                    name="Cost"
                  />
                  <Area
                    {...CHART_AREA_STYLE}
                    yAxisId="clicks"
                    dataKey="clicks"
                    stroke="#6366f1"
                    fill="url(#gadsGradClicks)"
                    name="Clicks"
                  />
                  <Area
                    {...CHART_AREA_STYLE}
                    yAxisId="clicks"
                    dataKey="conversions"
                    stroke="#10b981"
                    fill="url(#gadsGradConversions)"
                    name="Conversions"
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
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
                            <DataTable<GoogleAdsAdGroup & { roasValue: number }>
                              data={campAdGroups.map(ag => ({ ...ag, roasValue: roas(ag.conversionsValue, ag.costMicros) }))}
                              pageSize={0}
                              columns={[
                                { key: "name", label: "Name", render: (_v, row) => <p style={{ fontWeight: 600, color: "var(--text)" }}>{row.name}</p> },
                                { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
                                { key: "impressions", label: "Impressions", sortable: true, align: "right", render: (_v, row) => formatNumber(row.impressions) },
                                { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
                                { key: "conversions", label: "Conversions", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
                                { key: "conversionsValue", label: "Value", sortable: true, align: "right", render: (_v, row) => formatCurrency(row.conversionsValue) },
                                { key: "roasValue", label: "ROAS", sortable: true, align: "right", render: (_v, row) => { const agRoas = roas(row.conversionsValue, row.costMicros); return <span style={{ fontWeight: 700, color: agRoas >= 2 ? "#10b981" : agRoas >= 1 ? "#f59e0b" : "#ef4444" }}>{agRoas.toFixed(2)}x</span>; } },
                              ]}
                            />
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
                  <DataTable<GoogleAdsCampaign & { roasValue: number; ctrValue: number }>
                    data={visibleCampaigns.map(c => ({ ...c, roasValue: roas(c.conversionsValue, c.costMicros), ctrValue: ctr(c.clicks, c.impressions) }))}
                    pageSize={20}
                    exportable
                    exportFilename="campaign-performance"
                    columns={[
                      { key: "name", label: "Campaign" },
                      { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => { const prevC = prevCampaignsMap.get(row.id); return <><div>{formatNumber(row.clicks)}</div><Delta current={row.clicks} previous={prevC?.clicks} format="count" /></>; } },
                      { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => { const prevC = prevCampaignsMap.get(row.id); return <><div>{formatCurrency(micros(row.costMicros))}</div><Delta current={micros(row.costMicros)} previous={prevC ? micros(prevC.costMicros) : undefined} format="currency" /></>; } },
                      { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => { const prevC = prevCampaignsMap.get(row.id); return <><div>{formatNumber(row.conversions)}</div><Delta current={row.conversions} previous={prevC?.conversions} format="count" /></>; } },
                      { key: "conversionsValue", label: "Conv. Value", sortable: true, align: "right", render: (_v, row) => { const prevC = prevCampaignsMap.get(row.id); return <><div>{formatCurrency(row.conversionsValue)}</div><Delta current={row.conversionsValue} previous={prevC?.conversionsValue} format="currency" /></>; } },
                      { key: "roasValue", label: "ROAS", sortable: true, align: "right", render: (_v, row) => { const prevC = prevCampaignsMap.get(row.id); const rowRoas = roas(row.conversionsValue, row.costMicros); return <><span className={`font-semibold ${rowRoas >= 2 ? "text-emerald-600" : rowRoas >= 1 ? "text-amber-600" : "text-red-600"}`}>{rowRoas.toFixed(2)}x</span><Delta current={rowRoas} previous={prevC ? roas(prevC.conversionsValue, prevC.costMicros) : undefined} format="none" /></>; } },
                      { key: "ctrValue", label: "CTR", sortable: true, align: "right", render: (_v, row) => { const prevC = prevCampaignsMap.get(row.id); return <><div>{formatPercent(ctr(row.clicks, row.impressions))}</div><Delta current={ctr(row.clicks, row.impressions)} previous={prevC ? ctr(prevC.clicks, prevC.impressions) : undefined} format="none" /></>; } },
                    ]}
                  />
                </SectionCard>

                {show("ad_groups") && (() => {
                  const visibleAdGroups = data.adGroups.filter(ag => ag.clicks > 0 || ag.costMicros > 0);
                  if (!visibleAdGroups.length) return null;
                  return (
                    <SectionCard title="Ad Group Performance">
                      <DataTable<GoogleAdsAdGroup & { roasValue: number }>
                        data={visibleAdGroups.map(ag => ({ ...ag, roasValue: roas(ag.conversionsValue, ag.costMicros) }))}
                        pageSize={20}
                        columns={[
                          { key: "name", label: "Ad Group" },
                          { key: "campaignName", label: "Campaign" },
                          { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => { const prevAg = prevAdGroupsMap.get(row.id); return <><div>{formatNumber(row.clicks)}</div><Delta current={row.clicks} previous={prevAg?.clicks} format="count" /></>; } },
                          { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => { const prevAg = prevAdGroupsMap.get(row.id); return <><div>{formatCurrency(micros(row.costMicros))}</div><Delta current={micros(row.costMicros)} previous={prevAg ? micros(prevAg.costMicros) : undefined} format="currency" /></>; } },
                          { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => { const prevAg = prevAdGroupsMap.get(row.id); return <><div>{formatNumber(row.conversions)}</div><Delta current={row.conversions} previous={prevAg?.conversions} format="count" /></>; } },
                          { key: "conversionsValue", label: "Conv. Value", sortable: true, align: "right", render: (_v, row) => { const prevAg = prevAdGroupsMap.get(row.id); return <><div>{formatCurrency(row.conversionsValue)}</div><Delta current={row.conversionsValue} previous={prevAg?.conversionsValue} format="currency" /></>; } },
                          { key: "roasValue", label: "ROAS", sortable: true, align: "right", render: (_v, row) => { const prevAg = prevAdGroupsMap.get(row.id); const agRoas = roas(row.conversionsValue, row.costMicros); return <><span className={`font-semibold ${agRoas >= 2 ? "text-emerald-600" : agRoas >= 1 ? "text-amber-600" : "text-red-600"}`}>{agRoas.toFixed(2)}x</span><Delta current={agRoas} previous={prevAg ? roas(prevAg.conversionsValue, prevAg.costMicros) : undefined} format="none" /></>; } },
                        ]}
                      />
                    </SectionCard>
                  );
                })()}
              </div>
            );
          })()}

          {/* Search terms report */}
          {show("search_terms") && (data.searchTerms ?? []).length > 0 && (
            <SectionCard title="Search Terms" subtitle="Top queries triggering your ads">
              <DataTable<GoogleAdsSearchTerm & { ctrValue: number }>
                data={(data.searchTerms ?? []).map(st => ({ ...st, ctrValue: ctr(st.clicks, st.impressions) }))}
                pageSize={20}
                searchable
                columns={[
                  { key: "searchTerm", label: "Search Term" },
                  { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
                  { key: "impressions", label: "Impr.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.impressions) },
                  { key: "ctrValue", label: "CTR", sortable: true, align: "right", render: (_v, row) => formatPercent(ctr(row.clicks, row.impressions)) },
                  { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
                  { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => row.conversions.toFixed(1) },
                ]}
              />
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
          extraContext={[
            data.keywordQualityScores?.length
              ? `KEYWORD QUALITY SCORES (top by impressions):\n${data.keywordQualityScores.slice(0, 15).map(k => `  • "${k.keyword}" [${k.campaignName}]: QS ${k.qualityScore ?? "N/A"}/10 — expectedCTR: ${k.expectedCtr}, adRelevance: ${k.adRelevance}, landingPage: ${k.landingPageExperience}`).join("\n")}`
              : "",
            data.searchTerms?.length
              ? `TOP SEARCH TERMS (review for negative keyword opportunities):\n${data.searchTerms.slice(0, 20).map(st => `  • "${st.searchTerm}" [${st.matchType ?? ""}]: ${st.clicks} clicks, ${st.conversions} conv, £${(st.costMicros / 1e6).toFixed(2)} spend`).join("\n")}`
              : "",
            data.audienceCriteria?.filter(a => !a.negative).length
              ? `AUDIENCE TARGETING:\n${data.audienceCriteria!.filter(a => !a.negative).slice(0, 10).map(a => `  • ${a.displayName} [${a.criterionType}] in "${a.campaignName}" — bid modifier: ${a.bidModifier != null ? `${a.bidModifier > 1 ? "+" : ""}${((a.bidModifier - 1) * 100).toFixed(0)}%` : "observation"}`).join("\n")}`
              : "",
          ].filter(Boolean).join("\n\n") || undefined}
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
          extraContext={[
            data.keywordQualityScores?.length
              ? `KEYWORD QUALITY SCORES:\n${data.keywordQualityScores.slice(0, 15).map(k => `  • "${k.keyword}" [${k.campaignName}]: QS ${k.qualityScore ?? "N/A"}/10 — expectedCTR: ${k.expectedCtr}, adRelevance: ${k.adRelevance}, landingPage: ${k.landingPageExperience}`).join("\n")}`
              : "",
            data.searchTerms?.length
              ? `TOP SEARCH TERMS (negative keyword review):\n${data.searchTerms.slice(0, 20).map(st => `  • "${st.searchTerm}" [${st.matchType ?? ""}]: ${st.clicks} clicks, ${st.conversions} conv, £${(st.costMicros / 1e6).toFixed(2)} spend`).join("\n")}`
              : "",
            data.audienceCriteria?.filter(a => !a.negative).length
              ? `AUDIENCE TARGETING:\n${data.audienceCriteria!.filter(a => !a.negative).slice(0, 10).map(a => `  • ${a.displayName} [${a.criterionType}] in "${a.campaignName}" — ${a.bidModifier != null ? `bid modifier: ${((a.bidModifier - 1) * 100).toFixed(0)}%` : "observation mode"}`).join("\n")}`
              : "",
          ].filter(Boolean).join("\n\n") || undefined}
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

      {/* Performance Max Insights */}
      {!loading && !error && show("pmax") && (data?.pmaxInsights?.length ?? 0) > 0 && (
        <SectionCard title="Performance Max Insights" subtitle="Asset group performance across PMax campaigns">
          <DataTable<NonNullable<GoogleAdsData["pmaxInsights"]>[number] & { roasValue: number }>
            data={(data!.pmaxInsights ?? []).map(p => ({ ...p, roasValue: roas(p.conversionsValue, p.costMicros) }))}
            pageSize={20}
            exportable
            exportFilename="pmax-insights"
            columns={[
              { key: "campaignName", label: "Campaign" },
              { key: "assetGroupName", label: "Asset Group" },
              { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
              { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
              { key: "conversionsValue", label: "Conv. Value", sortable: true, align: "right", render: (_v, row) => formatCurrency(row.conversionsValue) },
              { key: "roasValue", label: "ROAS", sortable: true, align: "right", render: (_v, row) => { const pRoas = roas(row.conversionsValue, row.costMicros); return <span className={`font-semibold ${pRoas >= 2 ? "text-emerald-600" : pRoas >= 1 ? "text-amber-600" : "text-red-600"}`}>{pRoas.toFixed(2)}x</span>; } },
            ]}
          />
        </SectionCard>
      )}

      {/* Geographic Performance */}
      {!loading && !error && show("geo") && (data?.geoPerformance?.length ?? 0) > 0 && (
        <SectionCard title="Geographic Performance" subtitle="Top locations by click volume">
          <DataTable<NonNullable<GoogleAdsData["geoPerformance"]>[number] & { cpaValue: number }>
            data={[...data!.geoPerformance!].sort((a, b) => b.clicks - a.clicks).slice(0, 10).map(g => ({ ...g, cpaValue: cpa(g.costMicros, g.conversions) }))}
            pageSize={0}
            columns={[
              { key: "country", label: "Country" },
              { key: "region", label: "Region", render: (_v, row) => row.region || "—" },
              { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impr.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.impressions) },
              { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
              { key: "cpaValue", label: "CPA", sortable: true, align: "right", render: (_v, row) => row.conversions > 0 ? formatCurrency(cpa(row.costMicros, row.conversions)) : "—" },
            ]}
          />
        </SectionCard>
      )}

      {/* Ad Schedule Performance */}
      {!loading && !error && show("schedule") && (data?.schedulePerformance?.length ?? 0) > 0 && (() => {
        const dayOrder = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
        const dayLabels: Record<string, string> = { MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun" };
        const hourBuckets = [
          { label: "00–06", hours: [0, 1, 2, 3, 4, 5] },
          { label: "06–09", hours: [6, 7, 8] },
          { label: "09–12", hours: [9, 10, 11] },
          { label: "12–15", hours: [12, 13, 14] },
          { label: "15–18", hours: [15, 16, 17] },
          { label: "18–21", hours: [18, 19, 20] },
          { label: "21–24", hours: [21, 22, 23] },
        ];

        // Aggregate by day+bucket
        const grid: Record<string, Record<string, { clicks: number; impressions: number; conversions: number; costMicros: number }>> = {};
        let maxConvRate = 0;

        for (const day of dayOrder) {
          grid[day] = {};
          for (const bucket of hourBuckets) {
            grid[day][bucket.label] = { clicks: 0, impressions: 0, conversions: 0, costMicros: 0 };
          }
        }

        for (const s of data!.schedulePerformance!) {
          const bucket = hourBuckets.find(b => b.hours.includes(s.hourOfDay));
          if (!bucket || !grid[s.dayOfWeek]) continue;
          const cell = grid[s.dayOfWeek][bucket.label];
          cell.clicks += s.clicks;
          cell.impressions += s.impressions;
          cell.conversions += s.conversions;
          cell.costMicros += s.costMicros;
        }

        for (const day of dayOrder) {
          for (const bucket of hourBuckets) {
            const cell = grid[day][bucket.label];
            const rate = cell.clicks > 0 ? cell.conversions / cell.clicks : 0;
            if (rate > maxConvRate) maxConvRate = rate;
          }
        }

        return (
          <SectionCard title="Ad Schedule Performance" subtitle="Conversion rate heatmap by day and time">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ textAlign: "left", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Day</th>
                    {hourBuckets.map(b => (
                      <th key={b.label} className="text-center px-2 py-3 font-medium">{b.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  {dayOrder.map(day => (
                    <tr key={day}>
                      <td style={{ padding: "12px 16px", color: "var(--text)", fontWeight: 500 }}>{dayLabels[day]}</td>
                      {hourBuckets.map(bucket => {
                        const cell = grid[day][bucket.label];
                        const convRate = cell.clicks > 0 ? cell.conversions / cell.clicks : 0;
                        const intensity = maxConvRate > 0 ? convRate / maxConvRate : 0;
                        const bg = cell.clicks === 0
                          ? "bg-[var(--border-subtle)]"
                          : intensity > 0.75
                            ? "bg-emerald-200 text-emerald-900"
                            : intensity > 0.5
                              ? "bg-emerald-100 text-emerald-800"
                              : intensity > 0.25
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-50 text-red-700";
                        return (
                          <td
                            key={bucket.label}
                            className={`text-center px-2 py-3 font-medium ${bg}`}
                            title={`${dayLabels[day]} ${bucket.label}: ${formatNumber(cell.clicks)} clicks, ${formatNumber(cell.conversions)} conv, ${formatPercent(convRate)} CVR`}
                          >
                            {cell.clicks > 0 ? formatPercent(convRate) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-[var(--text-3)] mt-3">Cell colour intensity = conversion rate relative to the best-performing slot. Hover for details.</p>
          </SectionCard>
        );
      })()}

      {/* Creative Intelligence */}
      {!hideAi && !reportMode && !loading && !error && clientId && (
        <CreativeIntelligencePanel
          clientId={clientId}
          platform="google"
          creativeData={data?.campaignsEnriched?.map((a) => ({
            name: a.name,
            impressions: a.impressions,
            clicks: a.clicks,
            ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
            conversions: a.conversions,
            spend: a.costMicros / 1e6,
          })) ?? []}
        />
      )}

      {/* Click Fraud Protection */}
      {!loading && !error && show("click_fraud") && (
        <ClickFraudPanel
          platform="googleads"
          googleAdsInvalidClicks={data?.invalidClicks}
          clientId={clientId}
          clientName={clientName}
          clickFraudToken={clickFraudToken}
          reportMode={reportMode}
        />
      )}

      {/* Keywords & Quality Scores */}
      {!loading && !error && show("keywords") && (data?.keywordQualityScores?.length ?? 0) > 0 && (() => {
        const qsBadge = (rank: string) => {
          const cls = rank === "ABOVE_AVERAGE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : rank === "AVERAGE" ? "bg-amber-50 text-amber-700 border-amber-200" : rank === "BELOW_AVERAGE" ? "bg-red-50 text-red-700 border-red-200" : "bg-[var(--border-subtle)] text-[var(--text-3)] border-[var(--border)]";
          return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{rank.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>;
        };
        return (
          <SectionCard title="Keyword Quality Scores" subtitle={`${data!.keywordQualityScores!.length} keyword${data!.keywordQualityScores!.length !== 1 ? "s" : ""} with quality data`}>
            <DataTable<NonNullable<GoogleAdsData["keywordQualityScores"]>[number]>
              data={data!.keywordQualityScores!}
              pageSize={20}
              searchable
              columns={[
                { key: "keyword", label: "Keyword" },
                { key: "campaignName", label: "Campaign" },
                { key: "qualityScore", label: "QS", sortable: true, align: "center", render: (_v, row) => <span className={`font-bold ${(row.qualityScore ?? 0) >= 7 ? "text-emerald-600" : (row.qualityScore ?? 0) >= 5 ? "text-amber-600" : "text-red-600"}`}>{row.qualityScore ?? "—"}</span> },
                { key: "expectedCtr", label: "Exp. CTR", align: "center", render: (_v, row) => qsBadge(row.expectedCtr) },
                { key: "adRelevance", label: "Ad Relevance", align: "center", render: (_v, row) => qsBadge(row.adRelevance) },
                { key: "landingPageExperience", label: "Landing Page", align: "center", render: (_v, row) => qsBadge(row.landingPageExperience) },
                { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
                { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              ]}
            />
          </SectionCard>
        );
      })()}

      {/* Quality Score Summary */}
      {!loading && !error && show("quality_score") && data?.avgQualityScore != null && (
        <SectionCard title="Quality Score Overview" subtitle={`Account average: ${data.avgQualityScore.toFixed(1)} / 10`}>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: data.avgQualityScore >= 7 ? "#10b981" : data.avgQualityScore >= 5 ? "#f59e0b" : "#ef4444" }}>{data.avgQualityScore.toFixed(1)}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Average Quality Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--text)]">{data.keywordQualityScores?.filter(k => (k.qualityScore ?? 0) >= 7).length ?? 0}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Keywords QS ≥ 7</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--text)]">{data.keywordQualityScores?.filter(k => (k.qualityScore ?? 0) > 0 && (k.qualityScore ?? 0) < 5).length ?? 0}</p>
              <p className="text-xs text-[var(--text-3)] mt-1">Keywords QS &lt; 5</p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Device Breakdown */}
      {!loading && !error && show("device_breakdown") && (data?.deviceBreakdown?.length ?? 0) > 0 && (
        <SectionCard title="Device Breakdown" subtitle="Performance by device type">
          <DataTable<NonNullable<GoogleAdsData["deviceBreakdown"]>[number] & { roasValue: number }>
            data={(data!.deviceBreakdown ?? []).map(d => ({ ...d, roasValue: roas(d.conversionsValue, d.costMicros) }))}
            pageSize={0}
            columns={[
              { key: "device", label: "Device", render: (_v, row) => row.device.toLowerCase().replace(/_/g, " ") },
              { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", sortable: true, align: "right", render: (_v, row) => formatNumber(row.impressions) },
              { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
              { key: "roasValue", label: "ROAS", sortable: true, align: "right", render: (_v, row) => { const d = roas(row.conversionsValue, row.costMicros); return <span className={`font-semibold ${d >= 2 ? "text-emerald-600" : d >= 1 ? "text-amber-600" : "text-red-600"}`}>{d.toFixed(2)}x</span>; } },
            ]}
          />
        </SectionCard>
      )}

      {/* Negative Keywords */}
      {!loading && !error && show("negative_keywords") && (data?.negativeKeywords?.length ?? 0) > 0 && (
        <SectionCard title="Negative Keywords" subtitle={`${data!.negativeKeywords!.length} negative keyword${data!.negativeKeywords!.length !== 1 ? "s" : ""} active`}>
          <DataTable<NonNullable<GoogleAdsData["negativeKeywords"]>[number]>
            data={data!.negativeKeywords!}
            pageSize={20}
            searchable
            columns={[
              { key: "keyword", label: "Keyword" },
              { key: "matchType", label: "Match Type", render: (_v, row) => row.matchType.toLowerCase().replace(/_/g, " ") },
              { key: "sharedSetName", label: "Shared Set" },
            ]}
          />
        </SectionCard>
      )}

      {/* Demographics */}
      {!loading && !error && show("demographics_paid") && (data?.demographics?.length ?? 0) > 0 && (
        <SectionCard title="Demographics" subtitle="Performance by age and gender">
          <DataTable<NonNullable<GoogleAdsData["demographics"]>[number]>
            data={data!.demographics!}
            pageSize={0}
            columns={[
              { key: "type", label: "Type" },
              { key: "segment", label: "Segment", render: (_v, row) => row.segment.replace(/^AGE_/, "").replace(/_/g, "–") },
              { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", sortable: true, align: "right", render: (_v, row) => formatNumber(row.impressions) },
              { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
            ]}
          />
        </SectionCard>
      )}

      {/* Shopping Performance */}
      {!loading && !error && show("shopping") && (data?.shoppingPerformance?.length ?? 0) > 0 && (
        <SectionCard title="Shopping Performance" subtitle={`${data!.shoppingPerformance!.length} product${data!.shoppingPerformance!.length !== 1 ? "s" : ""} with ad data`}>
          <DataTable<NonNullable<GoogleAdsData["shoppingPerformance"]>[number] & { roasValue: number }>
            data={(data!.shoppingPerformance ?? []).map(p => ({ ...p, roasValue: roas(p.conversionsValue, p.costMicros) }))}
            pageSize={20}
            exportable
            exportFilename="shopping-performance"
            columns={[
              { key: "productTitle", label: "Product" },
              { key: "productBrand", label: "Brand", render: (_v, row) => row.productBrand || "—" },
              { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
              { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
              { key: "roasValue", label: "ROAS", sortable: true, align: "right", render: (_v, row) => { const p = roas(row.conversionsValue, row.costMicros); return <span className={`font-semibold ${p >= 2 ? "text-emerald-600" : p >= 1 ? "text-amber-600" : "text-red-600"}`}>{p.toFixed(2)}x</span>; } },
            ]}
          />
        </SectionCard>
      )}

      {/* Conversion Actions */}
      {!loading && !error && show("conversion_actions") && (data?.conversionActions?.length ?? 0) > 0 && (
        <SectionCard title="Conversion Actions" subtitle="All tracked conversion types">
          <DataTable<NonNullable<GoogleAdsData["conversionActions"]>[number]>
            data={data!.conversionActions!}
            pageSize={0}
            columns={[
              { key: "name", label: "Action Name" },
              { key: "category", label: "Category", render: (_v, row) => row.category.toLowerCase().replace(/_/g, " ") },
              { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
              { key: "conversionsValue", label: "Value", sortable: true, align: "right", render: (_v, row) => formatCurrency(row.conversionsValue) },
              { key: "costPerConversion", label: "Cost/Conv.", sortable: true, align: "right", render: (_v, row) => formatCurrency(row.costPerConversion) },
            ]}
          />
        </SectionCard>
      )}

      {/* Call Extensions */}
      {!loading && !error && show("call_extensions") && (data?.callExtensions?.length ?? 0) > 0 && (
        <SectionCard title="Call Extensions" subtitle={`${data!.callExtensions!.length} call${data!.callExtensions!.length !== 1 ? "s" : ""} tracked`}>
          <DataTable<NonNullable<GoogleAdsData["callExtensions"]>[number]>
            data={data!.callExtensions!}
            pageSize={0}
            columns={[
              { key: "campaignName", label: "Campaign" },
              { key: "callStatus", label: "Status", render: (_v, row) => row.callStatus.toLowerCase().replace(/_/g, " ") },
              { key: "callerCountryCode", label: "Country" },
              { key: "callDurationSeconds", label: "Duration (s)", sortable: true, align: "right" },
              { key: "callType", label: "Type" },
            ]}
          />
        </SectionCard>
      )}

      {/* Sitelink Performance */}
      {!loading && !error && show("sitelinks") && (data?.sitelinkPerformance?.length ?? 0) > 0 && (
        <SectionCard title="Sitelink Performance" subtitle="Ad extension click-through data">
          <DataTable<NonNullable<GoogleAdsData["sitelinkPerformance"]>[number]>
            data={data!.sitelinkPerformance!}
            pageSize={0}
            columns={[
              { key: "sitelinkText", label: "Sitelink Text" },
              { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", sortable: true, align: "right", render: (_v, row) => formatNumber(row.impressions) },
              { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              { key: "conversions", label: "Conv.", sortable: true, align: "right", render: (_v, row) => formatNumber(row.conversions) },
            ]}
          />
        </SectionCard>
      )}

      {/* Display & Video */}
      {!loading && !error && show("display_video") && (data?.displayVideoData?.length ?? 0) > 0 && (
        <SectionCard title="Display & Video" subtitle="Performance across display and video campaigns">
          <DataTable<NonNullable<GoogleAdsData["displayVideoData"]>[number]>
            data={data!.displayVideoData!}
            pageSize={20}
            exportable
            exportFilename="display-video-performance"
            columns={[
              { key: "campaignName", label: "Campaign" },
              { key: "channelType", label: "Type", render: (_v, row) => row.channelType.toLowerCase() },
              { key: "clicks", label: "Clicks", sortable: true, align: "right", render: (_v, row) => formatNumber(row.clicks) },
              { key: "impressions", label: "Impressions", sortable: true, align: "right", render: (_v, row) => formatNumber(row.impressions) },
              { key: "costMicros", label: "Cost", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.costMicros)) },
              { key: "videoViews", label: "Video Views", sortable: true, align: "right", render: (_v, row) => formatNumber(row.videoViews) },
              { key: "videoViewRate", label: "View Rate", sortable: true, align: "right", render: (_v, row) => `${(row.videoViewRate * 100).toFixed(1)}%` },
            ]}
          />
        </SectionCard>
      )}

      {/* Recommendations */}
      {!loading && !error && show("recommendations") && (data?.recommendations?.length ?? 0) > 0 && (
        <SectionCard title="Google Ads Recommendations" subtitle={`${data!.recommendations!.length} recommendation${data!.recommendations!.length !== 1 ? "s" : ""} from Google`}>
          <div className="flex flex-col gap-3">
            {data!.recommendations!.map((rec, i) => (
              <div key={i} className="rounded-lg border border-[var(--border-subtle)] p-4">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{rec.type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-[var(--text-3)]">{rec.campaignName}</span>
                </div>
                <p className="text-xs text-[var(--text-2)]">{(() => { try { const p = JSON.parse(rec.impact); return typeof p === "object" ? JSON.stringify(p, null, 0) : rec.impact; } catch { return rec.impact; } })()}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Budget Utilisation */}
      {!loading && !error && show("budget_utilisation") && (data?.budgetUtilisation?.length ?? 0) > 0 && (
        <SectionCard title="Budget Utilisation" subtitle="How much of each campaign budget is being spent">
          <DataTable<NonNullable<GoogleAdsData["budgetUtilisation"]>[number]>
            data={data!.budgetUtilisation!}
            pageSize={0}
            columns={[
              { key: "campaignName", label: "Campaign" },
              { key: "dailyBudgetMicros", label: "Daily Budget", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.dailyBudgetMicros)) },
              { key: "spendMicros", label: "Spend", sortable: true, align: "right", render: (_v, row) => formatCurrency(micros(row.spendMicros)) },
              { key: "utilisationPercent", label: "Utilisation", sortable: true, align: "right", render: (_v, row) => <span className={`font-semibold ${row.utilisationPercent >= 90 ? "text-red-600" : row.utilisationPercent >= 70 ? "text-amber-600" : "text-emerald-600"}`}>{row.utilisationPercent.toFixed(0)}%</span> },
              { key: "budgetStatus", label: "Status", render: (_v, row) => row.budgetStatus.toLowerCase() },
            ]}
          />
        </SectionCard>
      )}
    </div>
  );
}
