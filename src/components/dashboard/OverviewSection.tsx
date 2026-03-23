"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { LoadingSpinner } from "@/components/ui/index";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDateDisplay,
  getPreviousPeriod,
  pctChange,
  computeHealthScore,
} from "@/lib/utils";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  MousePointer,
  Users,
  Eye,
  Search,
  Globe,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BarChart3,
  Wallet,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  slug: string;
  semrushDomain: string | null;
  ga4PropertyId: string | null;
  metaAccountId: string | null;
  googleAdsCustomerId: string | null;
  searchConsoleSiteUrl: string | null;
}

interface Props {
  client: Client;
  startDate: string;
  endDate: string;
}

interface GoogleAdsOverview {
  clicks: number;
  costMicros: number;
  impressions: number;
  conversions: number;
  conversionsValue: number;
}

interface MetaOverview {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  totalConversions: number;
  totalConversionValue: number;
  avgRoas: number;
  reach: number;
  frequency: number;
  outboundClicks: number;
  landingPageViews: number;
}

interface GA4Overview {
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  engagedSessions: number;
  engagementRate: number;
}

interface SemrushOverview {
  organicTraffic: number;
  organicKeywords: number;
  organicCost: number;
  paidTraffic: number;
  paidKeywords: number;
}

interface SearchConsoleOverview {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PlatformData {
  googleads?: GoogleAdsOverview;
  meta?: MetaOverview;
  ga4?: GA4Overview;
  seo?: SemrushOverview;
  searchconsole?: SearchConsoleOverview;
}

interface CampaignHighlight {
  platform: string;
  name: string;
  spend: number;
  conversions: number;
  roas: number;
}

type CrossAlert = { severity: "high" | "medium"; platform: string; label: string; detail: string };

interface OverviewNarrativeResult {
  narrative: string;
  channelScores: Record<string, number>;
  crossChannelInsights: string[];
  budgetRecommendation: string;
  wins: string[];
  issues: string[];
  actions: string[];
  overallScore: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function micros(v: number) {
  return v / 1_000_000;
}

function safe(n: number): number {
  return isFinite(n) ? n : 0;
}

function diffStr(curr: number, prev: number | null | undefined, fmt: "count" | "currency"): string | undefined {
  if (prev == null) return undefined;
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "\u2212";
  return sign + (fmt === "currency" ? formatCurrency(Math.abs(d)) : formatNumber(Math.abs(d)));
}

function scoreColor(s: number): string {
  if (s >= 70) return "#10b981";
  if (s >= 40) return "#f59e0b";
  return "#ef4444";
}

function scoreLabel(s: number): string {
  if (s >= 80) return "Strong";
  if (s >= 60) return "Good";
  if (s >= 40) return "Fair";
  return "Poor";
}

// Channel config for the health bars
const CHANNEL_CONFIG: Record<string, { label: string; gradient: string }> = {
  googleads: { label: "Google Ads", gradient: "linear-gradient(90deg, #4285f4, #34a853)" },
  meta: { label: "Meta Ads", gradient: "linear-gradient(90deg, #1877f2, #00c6ff)" },
  ga4: { label: "Web Analytics", gradient: "linear-gradient(90deg, #f59e0b, #ef4444)" },
  seo: { label: "SEO", gradient: "linear-gradient(90deg, #10b981, #059669)" },
  searchconsole: { label: "Search Console", gradient: "linear-gradient(90deg, #6366f1, #8b5cf6)" },
};

// ─── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function OverviewSection({ client, startDate, endDate }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PlatformData>({});
  const [prevData, setPrevData] = useState<PlatformData>({});
  const [campaigns, setCampaigns] = useState<CampaignHighlight[]>([]);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<OverviewNarrativeResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(true);

  // Keyword overlap state
  const [keywordOverlapSummary, setKeywordOverlapSummary] = useState<{ total: number; highRisk: number; potentialSavings: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    async function load() {
      setLoading(true);
      setError("");
      setData({});
      setPrevData({});
      setCampaigns([]);
      setAiResult(null);

      const prev = getPreviousPeriod(startDate, endDate);
      const result: PlatformData = {};
      const prevResult: PlatformData = {};
      const campaignList: CampaignHighlight[] = [];

      const fetches: Promise<void>[] = [];

      // Google Ads
      if (client.googleAdsCustomerId) {
        fetches.push(
          (async () => {
            try {
              const params = new URLSearchParams({ customerId: client.googleAdsCustomerId!, startDate, endDate });
              const prevParams = new URLSearchParams({ customerId: client.googleAdsCustomerId!, startDate: prev.startDate, endDate: prev.endDate });
              const [res, prevRes] = await Promise.all([
                fetch(`/api/google-ads?${params}`, { signal, cache: "no-store" }),
                fetch(`/api/google-ads?${prevParams}`, { signal, cache: "no-store" }),
              ]);
              const json = await res.json();
              if (json.overview) result.googleads = json.overview;
              // Extract top campaigns
              if (json.campaignsEnriched?.length) {
                const sorted = [...json.campaignsEnriched].sort((a: { costMicros: number }, b: { costMicros: number }) => b.costMicros - a.costMicros);
                for (const c of sorted.slice(0, 3)) {
                  campaignList.push({
                    platform: "Google Ads",
                    name: c.name,
                    spend: micros(c.costMicros),
                    conversions: c.conversions,
                    roas: c.costMicros > 0 ? c.conversionsValue / micros(c.costMicros) : 0,
                  });
                }
              }
              const prevJson = await prevRes.json();
              if (prevJson?.overview) prevResult.googleads = prevJson.overview;
            } catch (e) {
              if (e instanceof Error && e.name === "AbortError") throw e;
            }
          })()
        );
      }

      // Meta
      if (client.metaAccountId) {
        fetches.push(
          (async () => {
            try {
              const base = `/api/meta?clientId=${encodeURIComponent(client.id)}&startDate=${startDate}&endDate=${endDate}`;
              const prevBase = `/api/meta?clientId=${encodeURIComponent(client.id)}&startDate=${prev.startDate}&endDate=${prev.endDate}`;
              const [ovRes, enrichedRes, prevOvRes] = await Promise.all([
                fetch(`${base}&type=overview`, { signal }),
                fetch(`${base}&type=campaigns-enriched`, { signal }),
                fetch(`${prevBase}&type=overview`, { signal }),
              ]);
              if (ovRes.ok) {
                const ov = await ovRes.json();
                if (ov.totalSpend != null) result.meta = ov;
              }
              if (enrichedRes.ok) {
                const enriched = await enrichedRes.json();
                if (Array.isArray(enriched)) {
                  const sorted = [...enriched].sort((a: { spend: number }, b: { spend: number }) => b.spend - a.spend);
                  for (const c of sorted.slice(0, 3)) {
                    campaignList.push({
                      platform: "Meta",
                      name: c.name,
                      spend: c.spend,
                      conversions: c.conversions ?? 0,
                      roas: c.roas ?? 0,
                    });
                  }
                }
              }
              if (prevOvRes.ok) {
                const prevOv = await prevOvRes.json();
                if (prevOv?.totalSpend != null) prevResult.meta = prevOv;
              }
            } catch (e) {
              if (e instanceof Error && e.name === "AbortError") throw e;
            }
          })()
        );
      }

      // GA4
      if (client.ga4PropertyId) {
        fetches.push(
          (async () => {
            try {
              const params = new URLSearchParams({ propertyId: client.ga4PropertyId!, startDate, endDate });
              const prevParams = new URLSearchParams({ propertyId: client.ga4PropertyId!, startDate: prev.startDate, endDate: prev.endDate });
              const [res, prevRes] = await Promise.all([
                fetch(`/api/ga4?${params}`, { signal }),
                fetch(`/api/ga4?${prevParams}`, { signal }),
              ]);
              const json = await res.json();
              if (json.sessions != null) result.ga4 = json;
              const prevJson = await prevRes.json();
              if (prevJson?.sessions != null) prevResult.ga4 = prevJson;
            } catch (e) {
              if (e instanceof Error && e.name === "AbortError") throw e;
            }
          })()
        );
      }

      // Semrush
      if (client.semrushDomain) {
        fetches.push(
          (async () => {
            try {
              const params = new URLSearchParams({ domain: client.semrushDomain!, type: "overview" });
              const res = await fetch(`/api/semrush?${params}`, { signal });
              const json = await res.json();
              if (json.organicTraffic != null) result.seo = json;
            } catch (e) {
              if (e instanceof Error && e.name === "AbortError") throw e;
            }
          })()
        );
      }

      // Search Console
      if (client.searchConsoleSiteUrl) {
        fetches.push(
          (async () => {
            try {
              const params = new URLSearchParams({ siteUrl: client.searchConsoleSiteUrl!, type: "overview", startDate, endDate });
              const prevParams = new URLSearchParams({ siteUrl: client.searchConsoleSiteUrl!, type: "overview", startDate: prev.startDate, endDate: prev.endDate });
              const [res, prevRes] = await Promise.all([
                fetch(`/api/search-console?${params}`, { signal }),
                fetch(`/api/search-console?${prevParams}`, { signal }),
              ]);
              const json = await res.json();
              if (json.clicks != null) result.searchconsole = json;
              const prevJson = await prevRes.json();
              if (prevJson?.clicks != null) prevResult.searchconsole = prevJson;
            } catch (e) {
              if (e instanceof Error && e.name === "AbortError") throw e;
            }
          })()
        );
      }

      try {
        await Promise.all(fetches);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("Failed to load some platform data");
      }

      setData(result);
      setPrevData(prevResult);
      setCampaigns(campaignList);
      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, [client, startDate, endDate]);

  // ─── Aggregation ───────────────────────────────────────────────────────────

  const gaCost = data.googleads ? micros(data.googleads.costMicros) : 0;
  const metaSpend = data.meta?.totalSpend ?? 0;
  const totalAdSpend = gaCost + metaSpend;

  const gaConv = data.googleads?.conversions ?? 0;
  const metaConv = data.meta?.totalConversions ?? 0;
  const totalConversions = gaConv + metaConv;

  const gaRev = data.googleads?.conversionsValue ?? 0;
  const metaRev = data.meta?.totalConversionValue ?? 0;
  const totalRevenue = gaRev + metaRev;

  const blendedRoas = safe(totalAdSpend > 0 ? totalRevenue / totalAdSpend : 0);
  const blendedCpa = safe(totalConversions > 0 ? totalAdSpend / totalConversions : 0);

  const gaClicks = data.googleads?.clicks ?? 0;
  const metaClicks = data.meta?.totalClicks ?? 0;
  const totalPaidClicks = gaClicks + metaClicks;

  // Previous period aggregation
  const prevGaCost = prevData.googleads ? micros(prevData.googleads.costMicros) : 0;
  const prevMetaSpend = prevData.meta?.totalSpend ?? 0;
  const prevTotalAdSpend = prevGaCost + prevMetaSpend;

  const prevGaConv = prevData.googleads?.conversions ?? 0;
  const prevMetaConv = prevData.meta?.totalConversions ?? 0;
  const prevTotalConversions = prevGaConv + prevMetaConv;

  const prevGaRev = prevData.googleads?.conversionsValue ?? 0;
  const prevMetaRev = prevData.meta?.totalConversionValue ?? 0;
  const prevTotalRevenue = prevGaRev + prevMetaRev;

  const prevBlendedRoas = safe(prevTotalAdSpend > 0 ? prevTotalRevenue / prevTotalAdSpend : 0);
  const prevBlendedCpa = safe(prevTotalConversions > 0 ? prevTotalAdSpend / prevTotalConversions : 0);
  const prevTotalPaidClicks = (prevData.googleads?.clicks ?? 0) + (prevData.meta?.totalClicks ?? 0);

  const hasPaidData = !!(data.googleads || data.meta);
  const hasPrevPaid = !!(prevData.googleads || prevData.meta);

  // ─── Cross-platform alerts ────────────────────────────────────────────

  const crossAlerts = useMemo<CrossAlert[]>(() => {
    const alerts: CrossAlert[] = [];

    // Google Ads alerts
    if (data.googleads && prevData.googleads) {
      const g = data.googleads, pg = prevData.googleads;
      const spendPct = (pctChange(micros(g.costMicros), micros(pg.costMicros)) ?? 0);
      const convPct = (pctChange(g.conversions, pg.conversions) ?? 0);
      if (convPct <= -25)
        alerts.push({ severity: "high", platform: "Google Ads", label: "Conversions", detail: `Conversions dropped ${Math.abs(convPct).toFixed(0)}% vs previous period` });
      else if (convPct <= -15)
        alerts.push({ severity: "medium", platform: "Google Ads", label: "Conversions", detail: `Conversions declined ${Math.abs(convPct).toFixed(0)}%` });
      if (spendPct >= 20 && convPct <= 0)
        alerts.push({ severity: "medium", platform: "Google Ads", label: "Spend Efficiency", detail: `Spend up ${spendPct.toFixed(0)}% but conversions flat or down` });
      const roas = g.costMicros > 0 ? g.conversionsValue / micros(g.costMicros) : 0;
      if (roas > 0 && roas < 1.0 && micros(g.costMicros) > 100)
        alerts.push({ severity: "high", platform: "Google Ads", label: "ROAS", detail: `Blended ROAS ${roas.toFixed(2)}× — spend exceeding revenue` });
    }

    // Meta alerts
    if (data.meta && prevData.meta) {
      const m = data.meta, pm = prevData.meta;
      const spendPct = (pctChange(m.totalSpend, pm.totalSpend) ?? 0);
      const convPct = (pctChange(m.totalConversions, pm.totalConversions) ?? 0);
      if (convPct <= -25)
        alerts.push({ severity: "high", platform: "Meta", label: "Conversions", detail: `Conversions dropped ${Math.abs(convPct).toFixed(0)}% vs previous period` });
      else if (convPct <= -15)
        alerts.push({ severity: "medium", platform: "Meta", label: "Conversions", detail: `Conversions declined ${Math.abs(convPct).toFixed(0)}%` });
      if (spendPct >= 20 && convPct <= 0)
        alerts.push({ severity: "medium", platform: "Meta", label: "Spend Efficiency", detail: `Spend up ${spendPct.toFixed(0)}% but conversions flat or down` });
      if (m.avgRoas > 0 && m.avgRoas < 1.0 && m.totalSpend > 100)
        alerts.push({ severity: "high", platform: "Meta", label: "ROAS", detail: `ROAS ${m.avgRoas.toFixed(2)}× — spend exceeding revenue` });
    }

    // GA4 alerts
    if (data.ga4 && prevData.ga4) {
      const g = data.ga4, pg = prevData.ga4;
      const sessPct = (pctChange(g.sessions, pg.sessions) ?? 0);
      if (sessPct <= -20)
        alerts.push({ severity: "high", platform: "GA4", label: "Sessions", detail: `Sessions dropped ${Math.abs(sessPct).toFixed(0)}% vs previous period` });
      else if (sessPct <= -10)
        alerts.push({ severity: "medium", platform: "GA4", label: "Sessions", detail: `Sessions declined ${Math.abs(sessPct).toFixed(0)}%` });
      const bounceDiff = g.bounceRate - pg.bounceRate;
      if (bounceDiff >= 15)
        alerts.push({ severity: "high", platform: "GA4", label: "Bounce Rate", detail: `Bounce rate up ${bounceDiff.toFixed(1)}pp` });
      const convPctGA4 = (pctChange(g.conversionRate, pg.conversionRate) ?? 0);
      if (convPctGA4 <= -25)
        alerts.push({ severity: "high", platform: "GA4", label: "Conversion Rate", detail: `Conversion rate dropped ${Math.abs(convPctGA4).toFixed(0)}%` });
    }

    // Search Console alerts
    if (data.searchconsole && prevData.searchconsole) {
      const s = data.searchconsole, ps = prevData.searchconsole;
      const clicksPct = (pctChange(s.clicks, ps.clicks) ?? 0);
      if (clicksPct <= -25)
        alerts.push({ severity: "high", platform: "Search Console", label: "Organic Clicks", detail: `Clicks dropped ${Math.abs(clicksPct).toFixed(0)}%` });
      else if (clicksPct <= -15)
        alerts.push({ severity: "medium", platform: "Search Console", label: "Organic Clicks", detail: `Clicks declined ${Math.abs(clicksPct).toFixed(0)}%` });
      const posDiff = s.position - ps.position;
      if (posDiff >= 3)
        alerts.push({ severity: "high", platform: "Search Console", label: "Avg Position", detail: `Position worsened by ${posDiff.toFixed(1)} places` });
      else if (posDiff >= 1.5)
        alerts.push({ severity: "medium", platform: "Search Console", label: "Avg Position", detail: `Position slipped ${posDiff.toFixed(1)} places` });
    }

    // Sort: high first, then medium
    return alerts.sort((a, b) => (a.severity === "high" ? 0 : 1) - (b.severity === "high" ? 0 : 1));
  }, [data, prevData]);

  // ─── Funnel stages ────────────────────────────────────────────────────

  const funnelStages = useMemo(() => {
    const paidImpressions = (data.googleads?.impressions ?? 0) + (data.meta?.totalImpressions ?? 0);
    const organicImpressions = data.searchconsole?.impressions ?? 0;
    const totalReach = paidImpressions + organicImpressions;

    const paidClicks = totalPaidClicks;
    const organicClicks = data.searchconsole?.clicks ?? 0;
    const totalClicks = paidClicks + organicClicks;

    const sessions = data.ga4?.sessions ?? 0;
    const conversions = totalConversions + (data.ga4 && data.ga4.conversionRate > 0 && totalConversions === 0 ? Math.round(sessions * data.ga4.conversionRate / 100) : 0);
    const revenue = totalRevenue;

    // Previous
    const prevPaidImpressions = (prevData.googleads?.impressions ?? 0) + (prevData.meta?.totalImpressions ?? 0);
    const prevOrganicImpressions = prevData.searchconsole?.impressions ?? 0;
    const prevTotalReach = prevPaidImpressions + prevOrganicImpressions;

    const prevOrganicClicks = prevData.searchconsole?.clicks ?? 0;
    const prevTotalClicks = prevTotalPaidClicks + prevOrganicClicks;

    const prevSessions = prevData.ga4?.sessions ?? 0;
    const prevConversions = prevTotalConversions + (prevData.ga4 && prevData.ga4.conversionRate > 0 && prevTotalConversions === 0 ? Math.round(prevSessions * prevData.ga4.conversionRate / 100) : 0);

    return [
      { label: "Reach", value: totalReach, prev: prevTotalReach, fmt: "count" as const },
      { label: "Clicks", value: totalClicks, prev: prevTotalClicks, fmt: "count" as const, rate: totalReach > 0 ? (totalClicks / totalReach) * 100 : 0 },
      { label: "Sessions", value: sessions, prev: prevSessions, fmt: "count" as const, rate: totalClicks > 0 ? (sessions / totalClicks) * 100 : 0 },
      { label: "Conversions", value: conversions, prev: prevConversions, fmt: "count" as const, rate: sessions > 0 ? (conversions / sessions) * 100 : 0 },
      { label: "Revenue", value: revenue, prev: prevTotalRevenue, fmt: "currency" as const, rate: conversions > 0 ? revenue / conversions : 0 },
    ];
  }, [data, prevData, totalPaidClicks, prevTotalPaidClicks, totalConversions, prevTotalConversions, totalRevenue, prevTotalRevenue]);

  // ─── Channel efficiency rows ──────────────────────────────────────────

  const channelRows = useMemo(() => {
    const rows: { platform: string; platformKey: string; investment: number; traffic: number; conversions: number; revenue: number; efficiency: number; prevEfficiency: number | null; healthScore: number }[] = [];

    if (data.googleads) {
      const g = data.googleads;
      const spend = micros(g.costMicros);
      const roas = spend > 0 ? g.conversionsValue / spend : 0;
      const prevG = prevData.googleads;
      const prevRoas = prevG && micros(prevG.costMicros) > 0 ? prevG.conversionsValue / micros(prevG.costMicros) : null;
      const alerts = crossAlerts.filter(a => a.platform === "Google Ads");
      rows.push({ platform: "Google Ads", platformKey: "googleads", investment: spend, traffic: g.clicks, conversions: g.conversions, revenue: g.conversionsValue, efficiency: roas, prevEfficiency: prevRoas, healthScore: computeHealthScore(alerts) });
    }

    if (data.meta) {
      const m = data.meta;
      const roas = m.avgRoas;
      const prevM = prevData.meta;
      const prevRoas = prevM ? prevM.avgRoas : null;
      const alerts = crossAlerts.filter(a => a.platform === "Meta");
      rows.push({ platform: "Meta Ads", platformKey: "meta", investment: m.totalSpend, traffic: m.totalClicks, conversions: m.totalConversions, revenue: m.totalConversionValue, efficiency: roas, prevEfficiency: prevRoas, healthScore: computeHealthScore(alerts) });
    }

    if (data.ga4) {
      const g = data.ga4;
      const alerts = crossAlerts.filter(a => a.platform === "GA4");
      rows.push({ platform: "Web Analytics", platformKey: "ga4", investment: 0, traffic: g.sessions, conversions: Math.round(g.sessions * g.conversionRate / 100), revenue: 0, efficiency: g.conversionRate, prevEfficiency: prevData.ga4 ? prevData.ga4.conversionRate : null, healthScore: computeHealthScore(alerts) });
    }

    if (data.seo) {
      const s = data.seo;
      rows.push({ platform: "SEO (Organic)", platformKey: "seo", investment: s.organicCost, traffic: s.organicTraffic, conversions: 0, revenue: 0, efficiency: 0, prevEfficiency: null, healthScore: 100 });
    }

    if (data.searchconsole) {
      const sc = data.searchconsole;
      const alerts = crossAlerts.filter(a => a.platform === "Search Console");
      rows.push({ platform: "Search Console", platformKey: "searchconsole", investment: 0, traffic: sc.clicks, conversions: 0, revenue: 0, efficiency: sc.ctr * 100, prevEfficiency: prevData.searchconsole ? prevData.searchconsole.ctr * 100 : null, healthScore: computeHealthScore(alerts) });
    }

    return rows;
  }, [data, prevData, crossAlerts]);

  // ─── AI generation ─────────────────────────────────────────────────────────

  async function generateNarrative() {
    setAiLoading(true);
    setAiError(null);
    try {
      const platforms: Record<string, unknown> = {};
      if (data.googleads) {
        const g = data.googleads;
        platforms.googleads = {
          clicks: g.clicks, impressions: g.impressions, cost: micros(g.costMicros),
          conversions: g.conversions, conversionValue: g.conversionsValue,
          ctr: g.impressions > 0 ? g.clicks / g.impressions : 0,
          roas: g.costMicros > 0 ? g.conversionsValue / micros(g.costMicros) : 0,
          cpa: g.conversions > 0 ? micros(g.costMicros) / g.conversions : 0,
        };
      }
      if (data.meta) platforms.meta = data.meta;
      if (data.ga4) platforms.ga4 = data.ga4;
      if (data.seo) platforms.seo = data.seo;
      if (data.searchconsole) platforms.searchconsole = data.searchconsole;

      const previousPlatforms: Record<string, unknown> = {};
      if (prevData.googleads) {
        const g = prevData.googleads;
        previousPlatforms.googleads = {
          clicks: g.clicks, impressions: g.impressions, cost: micros(g.costMicros),
          conversions: g.conversions, conversionValue: g.conversionsValue,
          ctr: g.impressions > 0 ? g.clicks / g.impressions : 0,
          roas: g.costMicros > 0 ? g.conversionsValue / micros(g.costMicros) : 0,
          cpa: g.conversions > 0 ? micros(g.costMicros) / g.conversions : 0,
        };
      }
      if (prevData.meta) previousPlatforms.meta = prevData.meta;
      if (prevData.ga4) previousPlatforms.ga4 = prevData.ga4;
      if (prevData.searchconsole) previousPlatforms.searchconsole = prevData.searchconsole;

      const res = await fetch("/api/ai/overview-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: client.name,
          dateRange: `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`,
          platforms,
          previousPlatforms,
          aggregated: { totalAdSpend, totalConversions, totalRevenue, blendedRoas, blendedCpa, totalPaidClicks },
          previousAggregated: hasPrevPaid ? {
            totalAdSpend: prevTotalAdSpend, totalConversions: prevTotalConversions,
            totalRevenue: prevTotalRevenue, blendedRoas: prevBlendedRoas,
            blendedCpa: prevBlendedCpa, totalPaidClicks: prevTotalPaidClicks,
          } : undefined,
          campaignHighlights: campaigns.length ? campaigns : undefined,
          computedAlerts: crossAlerts.length ? crossAlerts : undefined,
          channelMetrics: channelRows.length ? channelRows.map(r => ({
            platform: r.platform,
            spend: r.investment,
            conversions: r.conversions,
            revenue: r.revenue,
            efficiency: r.efficiency,
            healthScore: r.healthScore,
            trend: r.prevEfficiency != null ? (pctChange(r.efficiency, r.prevEfficiency) ?? 0) : 0,
          })) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiError(json.error ?? "Failed to generate overview");
        return;
      }
      setAiResult(json as OverviewNarrativeResult);
      setAiExpanded(true);
    } catch {
      setAiError("Failed to connect to AI service. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  // Keyword overlap fetch (organic vs paid)
  useEffect(() => {
    if (!client.searchConsoleSiteUrl || !client.googleAdsCustomerId) return;
    const params = new URLSearchParams({ siteUrl: client.searchConsoleSiteUrl, customerId: client.googleAdsCustomerId, startDate, endDate });
    fetch(`/api/cross/keyword-overlap?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.summary) setKeywordOverlapSummary({ total: json.summary.total, highRisk: json.summary.highRisk, potentialSavings: json.summary.potentialSavings });
      })
      .catch(() => {});
  }, [client.searchConsoleSiteUrl, client.googleAdsCustomerId, startDate, endDate]);

  // ─── Active platforms list ─────────────────────────────────────────────────

  const activePlatforms = [
    data.googleads && "Google Ads",
    data.meta && "Meta Ads",
    data.ga4 && "GA4",
    data.seo && "SEO",
    data.searchconsole && "Search Console",
  ].filter(Boolean);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="section-loading">
        <LoadingSpinner />
        <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-3)" }}>
          Loading data from all platforms…
        </p>
      </div>
    );
  }

  if (error && !data.googleads && !data.meta && !data.ga4 && !data.seo && !data.searchconsole) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Unable to load data</p>
        <p className="empty-state-desc">{error}</p>
      </div>
    );
  }

  const noPlatforms = !data.googleads && !data.meta && !data.ga4 && !data.seo && !data.searchconsole;
  if (noPlatforms) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <BarChart3 style={{ width: 24, height: 24 }} />
        </div>
        <p className="empty-state-title">No platforms configured</p>
        <p className="empty-state-desc">
          Configure at least one platform in client settings to see the overview dashboard.
        </p>
        <a href={`/clients/${client.slug}/settings`} className="btn btn-primary" style={{ marginTop: 28 }}>
          Configure in settings
        </a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Active platforms strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
          Active:
        </span>
        {activePlatforms.map((p) => (
          <span
            key={p as string}
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              background: "var(--accent-bg)",
              color: "var(--accent-text)",
              border: "1px solid var(--accent)",
            }}
          >
            {p as string}
          </span>
        ))}
      </div>

      {/* ── Full Funnel Board ───────────────────────────────────────────── */}
      {funnelStages.some(s => s.value > 0) && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: -16 }}>
            Full-Funnel Performance
          </p>
          <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
            {funnelStages.map((stage, i) => {
              const change = stage.prev > 0 ? pctChange(stage.value, stage.prev) : undefined;
              const maxVal = Math.max(...funnelStages.map(s => s.value));
              const barHeight = maxVal > 0 ? Math.max(20, (stage.value / maxVal) * 100) : 20;
              return (
                <div key={stage.label} style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 12px 12px", background: i % 2 === 0 ? "var(--card-bg)" : "var(--bg-subtle)", borderRight: i < funnelStages.length - 1 ? "1px solid var(--border)" : "none", position: "relative" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8, textAlign: "center" }}>
                    {stage.label}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, justifyContent: "flex-end" }}>
                    <div style={{ width: "70%", height: barHeight, borderRadius: 6, background: `linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)`, opacity: 0.15 + (barHeight / 100) * 0.85, transition: "height 0.4s ease" }} />
                    <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginTop: 4 }}>
                      {stage.fmt === "currency" ? formatCurrency(stage.value) : formatNumber(stage.value)}
                    </p>
                    {change != null && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: change >= 0 ? "#10b981" : "#ef4444" }}>
                        {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {/* Conversion rate connector */}
                  {i > 0 && stage.rate != null && (
                    <div style={{ position: "absolute", top: 6, left: -1, transform: "translateX(-50%)", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700, color: "#15803d", whiteSpace: "nowrap", zIndex: 2 }}>
                      {stage.label === "Revenue" ? formatCurrency(stage.rate) : `${stage.rate.toFixed(1)}%`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Cross-Platform Alerts ─────────────────────────────────────────── */}
      {crossAlerts.length > 0 && (() => {
        const highAlerts = crossAlerts.filter(a => a.severity === "high");
        const medAlerts = crossAlerts.filter(a => a.severity === "medium");
        const platformColors: Record<string, string> = { "Google Ads": "#4285f4", "Meta": "#1877f2", "GA4": "#f59e0b", "Search Console": "#6366f1", "SEO": "#10b981" };
        return (
          <div style={{ borderRadius: 12, border: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}`, background: highAlerts.length ? "#fff1f2" : "#fffbeb", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}` }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: highAlerts.length ? "#dc2626" : "#d97706" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: highAlerts.length ? "#991b1b" : "#92400e", margin: 0 }}>
                {highAlerts.length} high-priority · {medAlerts.length} medium-priority cross-platform issue{crossAlerts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {crossAlerts.map((a, i) => (
                <div key={i} style={{ padding: "7px 16px", borderBottom: i < crossAlerts.length - 1 ? `1px solid ${highAlerts.length ? "#fee2e2" : "#fef3c7"}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: a.severity === "high" ? "#dc2626" : "#d97706", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                      {a.severity}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: platformColors[a.platform] ?? "#6366f1", background: `${platformColors[a.platform] ?? "#6366f1"}15`, borderRadius: 4, padding: "1px 6px", flexShrink: 0 }}>
                      {a.platform}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{a.label}</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{a.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Channel Efficiency Matrix ─────────────────────────────────────── */}
      {channelRows.length > 0 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: -16 }}>
            Channel Efficiency Matrix
          </p>
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                  {["Platform", "Investment", "Traffic", "Conversions", "Revenue", "Efficiency", "vs Prev", "Health"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", textAlign: h === "Platform" ? "left" : "right" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channelRows.map((row) => {
                  const effChange = row.prevEfficiency != null ? pctChange(row.efficiency, row.prevEfficiency) : undefined;
                  const config = CHANNEL_CONFIG[row.platformKey];
                  return (
                    <tr key={row.platformKey} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--text)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 4, background: config?.gradient ?? "#6366f1", flexShrink: 0 }} />
                          {row.platform}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-2)" }}>{row.investment > 0 ? formatCurrency(row.investment) : "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(row.traffic)}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-2)" }}>{row.conversions > 0 ? formatNumber(row.conversions) : "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--text-2)" }}>{row.revenue > 0 ? formatCurrency(row.revenue) : "—"}</td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "var(--text)" }}>
                        {row.platformKey === "googleads" || row.platformKey === "meta" ? `${row.efficiency.toFixed(2)}×` : row.platformKey === "ga4" || row.platformKey === "searchconsole" ? `${row.efficiency.toFixed(1)}%` : row.investment > 0 ? formatCurrency(row.investment) : "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {effChange != null ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: effChange >= 0 ? "#10b981" : "#ef4444" }}>
                            {effChange >= 0 ? "+" : ""}{effChange.toFixed(1)}%
                          </span>
                        ) : <span style={{ color: "var(--text-3)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(row.healthScore), background: `${scoreColor(row.healthScore)}15`, borderRadius: 4, padding: "2px 6px" }}>
                          {row.healthScore}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Keyword Cannibalisation Summary ───────────────────────────────── */}
      {keywordOverlapSummary && keywordOverlapSummary.total > 0 && (
        <div style={{ borderRadius: 12, border: "1px solid var(--border)", padding: "14px 18px", background: keywordOverlapSummary.highRisk > 0 ? "#fff7ed" : "#f0fdf4" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Search className="h-4 w-4" style={{ color: keywordOverlapSummary.highRisk > 0 ? "#d97706" : "#10b981" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Organic vs Paid Keyword Overlap</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
            <strong>{keywordOverlapSummary.total}</strong> keyword{keywordOverlapSummary.total !== 1 ? "s" : ""} appear in both organic results and paid campaigns.
            {keywordOverlapSummary.highRisk > 0 && <> <strong style={{ color: "#dc2626" }}>{keywordOverlapSummary.highRisk}</strong> are high-risk (ranking top 3 with active spend).</>}
            {keywordOverlapSummary.potentialSavings > 0 && <> Potential savings: <strong style={{ color: "#065f46" }}>${keywordOverlapSummary.potentialSavings.toFixed(2)}</strong>.</>}
            {" "}See the Search Console section for full details.
          </p>
        </div>
      )}

      {/* ── Paid Performance Metrics ──────────────────────────────────────── */}
      {hasPaidData && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: -16 }}>
            Combined Paid Performance
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            <MetricCard
              title="Total Ad Spend"
              value={formatCurrency(totalAdSpend)}
              icon={<DollarSign className="h-5 w-5" />}
              color="purple"
              change={hasPrevPaid ? pctChange(totalAdSpend, prevTotalAdSpend) : undefined}
              changeDiff={hasPrevPaid ? diffStr(totalAdSpend, prevTotalAdSpend, "currency") : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Total Conversions"
              value={formatNumber(totalConversions)}
              icon={<ShoppingCart className="h-5 w-5" />}
              color="green"
              change={hasPrevPaid ? pctChange(totalConversions, prevTotalConversions) : undefined}
              changeDiff={hasPrevPaid ? diffStr(totalConversions, prevTotalConversions, "count") : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              icon={<TrendingUp className="h-5 w-5" />}
              color="green"
              change={hasPrevPaid ? pctChange(totalRevenue, prevTotalRevenue) : undefined}
              changeDiff={hasPrevPaid ? diffStr(totalRevenue, prevTotalRevenue, "currency") : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Blended ROAS"
              value={`${blendedRoas.toFixed(2)}x`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="blue"
              change={hasPrevPaid && prevBlendedRoas > 0 ? pctChange(blendedRoas, prevBlendedRoas) : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Blended CPA"
              value={formatCurrency(blendedCpa)}
              icon={<Wallet className="h-5 w-5" />}
              color="orange"
              change={hasPrevPaid && prevBlendedCpa > 0 ? pctChange(blendedCpa, prevBlendedCpa) : undefined}
              changeDiff={hasPrevPaid ? diffStr(blendedCpa, prevBlendedCpa, "currency") : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Total Paid Clicks"
              value={formatNumber(totalPaidClicks)}
              icon={<MousePointer className="h-5 w-5" />}
              color="blue"
              change={hasPrevPaid ? pctChange(totalPaidClicks, prevTotalPaidClicks) : undefined}
              changeDiff={hasPrevPaid ? diffStr(totalPaidClicks, prevTotalPaidClicks, "count") : undefined}
              changeLabel="vs prev period"
            />
          </div>
        </>
      )}

      {/* ── Website & Organic Metrics ─────────────────────────────────────── */}
      {(data.ga4 || data.seo || data.searchconsole) && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: -16 }}>
            Website &amp; Organic Performance
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            {data.ga4 && (
              <>
                <MetricCard
                  title="Website Sessions"
                  value={formatNumber(data.ga4.sessions)}
                  icon={<Users className="h-5 w-5" />}
                  color="orange"
                  change={prevData.ga4 ? pctChange(data.ga4.sessions, prevData.ga4.sessions) : undefined}
                  changeDiff={prevData.ga4 ? diffStr(data.ga4.sessions, prevData.ga4.sessions, "count") : undefined}
                  changeLabel="vs prev period"
                />
                <MetricCard
                  title="Website Users"
                  value={formatNumber(data.ga4.users)}
                  icon={<Users className="h-5 w-5" />}
                  color="blue"
                  change={prevData.ga4 ? pctChange(data.ga4.users, prevData.ga4.users) : undefined}
                  changeDiff={prevData.ga4 ? diffStr(data.ga4.users, prevData.ga4.users, "count") : undefined}
                  changeLabel="vs prev period"
                />
              </>
            )}
            {data.seo && (
              <>
                <MetricCard
                  title="Organic Traffic"
                  value={formatNumber(data.seo.organicTraffic)}
                  icon={<Globe className="h-5 w-5" />}
                  color="green"
                />
                <MetricCard
                  title="Organic Keywords"
                  value={formatNumber(data.seo.organicKeywords)}
                  icon={<Search className="h-5 w-5" />}
                  color="green"
                />
              </>
            )}
            {data.searchconsole && (
              <>
                <MetricCard
                  title="Search Clicks"
                  value={formatNumber(data.searchconsole.clicks)}
                  icon={<MousePointer className="h-5 w-5" />}
                  color="purple"
                  change={prevData.searchconsole ? pctChange(data.searchconsole.clicks, prevData.searchconsole.clicks) : undefined}
                  changeDiff={prevData.searchconsole ? diffStr(data.searchconsole.clicks, prevData.searchconsole.clicks, "count") : undefined}
                  changeLabel="vs prev period"
                />
                <MetricCard
                  title="Avg Position"
                  value={data.searchconsole.position.toFixed(1)}
                  icon={<Search className="h-5 w-5" />}
                  color="purple"
                  change={prevData.searchconsole ? pctChange(data.searchconsole.position, prevData.searchconsole.position) : undefined}
                  changeLabel="vs prev period"
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ── Engagement Row ────────────────────────────────────────────────── */}
      {data.ga4 && (
        <>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: -16 }}>
            Engagement &amp; Conversion
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
            <MetricCard
              title="Bounce Rate"
              value={formatPercent(data.ga4.bounceRate / 100)}
              icon={<Eye className="h-5 w-5" />}
              color="red"
              change={prevData.ga4 ? pctChange(data.ga4.bounceRate, prevData.ga4.bounceRate) : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Engagement Rate"
              value={formatPercent(data.ga4.engagementRate / 100)}
              icon={<TrendingUp className="h-5 w-5" />}
              color="green"
              change={prevData.ga4 ? pctChange(data.ga4.engagementRate, prevData.ga4.engagementRate) : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Conversion Rate"
              value={formatPercent(data.ga4.conversionRate / 100)}
              icon={<ShoppingCart className="h-5 w-5" />}
              color="green"
              change={prevData.ga4 ? pctChange(data.ga4.conversionRate, prevData.ga4.conversionRate) : undefined}
              changeLabel="vs prev period"
            />
            <MetricCard
              title="Pageviews"
              value={formatNumber(data.ga4.pageviews)}
              icon={<Eye className="h-5 w-5" />}
              color="blue"
              change={prevData.ga4 ? pctChange(data.ga4.pageviews, prevData.ga4.pageviews) : undefined}
              changeDiff={prevData.ga4 ? diffStr(data.ga4.pageviews, prevData.ga4.pageviews, "count") : undefined}
              changeLabel="vs prev period"
            />
            {data.seo && (
              <MetricCard
                title="Traffic Value"
                value={formatCurrency(data.seo.organicCost)}
                icon={<DollarSign className="h-5 w-5" />}
                color="green"
              />
            )}
            {data.searchconsole && (
              <MetricCard
                title="Search CTR"
                value={formatPercent(data.searchconsole.ctr)}
                icon={<MousePointer className="h-5 w-5" />}
                color="purple"
                change={prevData.searchconsole ? pctChange(data.searchconsole.ctr, prevData.searchconsole.ctr) : undefined}
                changeLabel="vs prev period"
              />
            )}
          </div>
        </>
      )}

      {/* ── AI Cross-Channel Overview ────────────────────────────────────── */}
      <div className="card" style={{ borderImage: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7) 1", borderWidth: 1, borderStyle: "solid" }}>
        {/* Header */}
        <div className="card-header">
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="card-title">Cross-Channel AI Overview</p>
              <p className="card-subtitle">
                Budget allocation, channel synergy, and full-funnel analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiResult && (
              <button
                onClick={() => setAiExpanded((v) => !v)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                style={{ color: "var(--text-3)" }}
              >
                {aiExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={generateNarrative}
              disabled={aiLoading}
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
              style={{
                fontSize: 13, padding: "7px 16px",
                background: "linear-gradient(135deg, #6366f1, #a855f7)", border: "none",
              }}
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiLoading ? "Analysing all channels…" : aiResult ? "Re-analyse" : "Generate Full Overview"}
            </button>
          </div>
        </div>

        {/* Error */}
        {aiError && (
          <div className="card-body" style={{ paddingTop: 20, paddingBottom: 20 }}>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{aiError}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {aiLoading && !aiResult && (
          <div className="card-body" style={{ paddingTop: 30, paddingBottom: 30 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6366f1" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Analysing all channels…</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                  Reviewing {activePlatforms.length} platform{activePlatforms.length > 1 ? "s" : ""}, comparing periods, and generating cross-channel insights
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!aiLoading && !aiResult && !aiError && (
          <div className="card-body" style={{ textAlign: "center", paddingTop: 40, paddingBottom: 40 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
            }}>
              <Sparkles className="h-5 w-5" style={{ color: "#6366f1" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Cross-Channel Overview
            </p>
            <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 420, margin: "0 auto" }}>
              Get a complete picture of how all marketing channels work together: budget efficiency,
              channel synergy, funnel performance, and prioritised actions.
            </p>
          </div>
        )}

        {/* Results */}
        {aiResult && aiExpanded && (
          <div className="card-body" style={{ paddingTop: 0, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Score + narrative */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", paddingTop: 20 }}>
              <div style={{ flexShrink: 0 }}>
                <ScoreRing score={aiResult.overallScore} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
                  Executive Summary
                </p>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.75 }}>
                  {aiResult.narrative}
                </p>
              </div>
            </div>

            {/* Channel health bars */}
            {Object.keys(aiResult.channelScores).length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 10 }}>
                  Channel Health
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(aiResult.channelScores)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, score]) => {
                      const config = CHANNEL_CONFIG[key] ?? { label: key, gradient: "linear-gradient(90deg, #6366f1, #8b5cf6)" };
                      return (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", width: 110, flexShrink: 0 }}>
                            {config.label}
                          </span>
                          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--border-subtle)", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${score}%`,
                                height: "100%",
                                borderRadius: 4,
                                background: config.gradient,
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(score), width: 28, textAlign: "right" }}>
                            {score}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Cross-channel insights */}
            {aiResult.crossChannelInsights.length > 0 && (
              <div style={{
                background: "linear-gradient(135deg, #eef2ff, #f5f3ff)",
                border: "1px solid #c7d2fe", borderRadius: "var(--r)", padding: "14px 16px",
              }}>
                <div className="flex items-center gap-1.5" style={{ marginBottom: 8 }}>
                  <ArrowRight className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4338ca" }}>
                    Cross-Channel Insights
                  </p>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {aiResult.crossChannelInsights.map((insight, i) => (
                    <li key={i} style={{ fontSize: 12, color: "#3730a3", lineHeight: 1.6, paddingLeft: 14, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, color: "#6366f1" }}>•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Budget recommendation */}
            {aiResult.budgetRecommendation && (
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "var(--r)", padding: "14px 16px",
              }}>
                <div className="flex items-center gap-1.5" style={{ marginBottom: 8 }}>
                  <Wallet className="h-3.5 w-3.5" style={{ color: "#d97706" }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#92400e" }}>
                    Budget Recommendation
                  </p>
                </div>
                <p style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7 }}>
                  {aiResult.budgetRecommendation}
                </p>
              </div>
            )}

            {/* Wins + Issues */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {aiResult.wins.length > 0 && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--r)", padding: "14px 16px" }}>
                  <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: "#16a34a" }} />
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#15803d" }}>
                      What&apos;s Working
                    </p>
                  </div>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {aiResult.wins.map((win, i) => (
                      <li key={i} className="flex items-start gap-1.5" style={{ fontSize: 12, color: "#166534", lineHeight: 1.6 }}>
                        <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#22c55e" }} />
                        {win}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiResult.issues.length > 0 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--r)", padding: "14px 16px" }}>
                  <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#dc2626" }} />
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#991b1b" }}>
                      Key Issues
                    </p>
                  </div>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {aiResult.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-1.5" style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.6 }}>
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            {aiResult.actions.length > 0 && (
              <div style={{ background: "var(--accent-bg)", border: "1px solid #c7d2fe", borderRadius: "var(--r)", padding: "14px 16px" }}>
                <div className="flex items-center gap-1.5" style={{ marginBottom: 10 }}>
                  <Lightbulb className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-text)" }}>
                    Recommended Actions
                  </p>
                </div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {aiResult.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-1.5" style={{ fontSize: 12, color: "var(--accent-text)", lineHeight: 1.6 }}>
                      <span style={{ fontWeight: 800, color: "var(--accent)", minWidth: 16 }}>{i + 1}.</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
