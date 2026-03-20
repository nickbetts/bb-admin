"use client";

import React, { useEffect, useState } from "react";
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
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, LoadingSpinner, Delta } from "@/components/ui/index";
import { formatNumber, formatCurrency, formatPercent, formatDateDisplay, getPreviousPeriod, pctChange } from "@/lib/utils";
import { DollarSign, MousePointer, Eye, TrendingUp, AlertTriangle, ChevronRight, ChevronDown, Play, Image, Layers } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { AiLandingPageAnalysis } from "@/components/ai/AiLandingPageAnalysis";
import { SuperSummary } from "@/components/ai/SuperSummary";

interface MetaSectionProps {
  clientId: string;
  clientName?: string;
  startDate: string;
  endDate: string;
}

interface MetaOverview {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  totalConversions: number;
  conversionLabel: string;
  totalConversionValue: number;
  avgRoas: number;
  reach: number;
  frequency: number;
  outboundClicks: number;
  landingPageViews: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
}

interface CampaignEnriched extends Campaign {
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  bidStrategy: string;
  frequency: number;
  objective: string;
}

interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface MetaLandingPage {
  url: string;
  clicks: number;
  impressions: number;
  conversions: number;
}

interface MetaAdSet {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  roas: number;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string;
  billingEvent: string;
}

interface MetaAdCreative {
  adId: string;
  adName: string;
  adSetId: string;
  adSetName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "UNKNOWN";
  headline: string | null;
  bodyText: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  costPerConversion: number;
}

function diffStr(curr: number, prev: number | null | undefined, fmt: "count" | "currency"): string | undefined {
  if (prev == null) return undefined;
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "\u2212";
  return sign + (fmt === "currency" ? formatCurrency(Math.abs(d)) : formatNumber(Math.abs(d)));
}

/** Build a hierarchical text summary of campaign → ad set → creative for AI context */
function buildCreativeSummary(creatives: MetaAdCreative[], adSetsData: MetaAdSet[]): string {
  // Group creatives by campaign → ad set
  const campaignMap = new Map<string, { name: string; adSets: Map<string, { name: string; creatives: MetaAdCreative[] }> }>();
  for (const c of creatives) {
    const campKey = c.campaignId || "unknown";
    if (!campaignMap.has(campKey)) campaignMap.set(campKey, { name: c.campaignName || "Unknown Campaign", adSets: new Map() });
    const camp = campaignMap.get(campKey)!;
    const asKey = c.adSetId || "unknown";
    if (!camp.adSets.has(asKey)) camp.adSets.set(asKey, { name: c.adSetName || "Unknown Ad Set", creatives: [] });
    camp.adSets.get(asKey)!.creatives.push(c);
  }

  const lines: string[] = [];
  const videoCount = creatives.filter((c) => c.mediaType === "VIDEO").length;
  const imageCount = creatives.filter((c) => c.mediaType === "IMAGE").length;
  const carouselCount = creatives.filter((c) => c.mediaType === "CAROUSEL").length;
  lines.push(`Ad Creative Hierarchy (${creatives.length} ads: ${imageCount} image, ${videoCount} video, ${carouselCount} carousel):`);

  for (const [, camp] of campaignMap) {
    lines.push(`\nCampaign: "${camp.name}"`);
    for (const [, adSet] of camp.adSets) {
      const adSetMeta = adSetsData.find(s => s.name === adSet.name);
      const asBudget = adSetMeta?.dailyBudget ? `${formatCurrency(adSetMeta.dailyBudget)}/d` : adSetMeta?.lifetimeBudget ? `${formatCurrency(adSetMeta.lifetimeBudget)} ltm` : "";
      lines.push(`  Ad Set: "${adSet.name}"${asBudget ? ` [Budget: ${asBudget}]` : ""}`);
      for (const c of adSet.creatives.slice(0, 10)) {
        const parts = [`    Ad: "${c.adName}" (${c.mediaType})`];
        parts.push(`Spend: ${formatCurrency(c.spend)}`);
        parts.push(`Clicks: ${c.clicks}`);
        parts.push(`CTR: ${c.ctr.toFixed(2)}%`);
        parts.push(`Conv: ${c.conversions}`);
        parts.push(`ROAS: ${c.roas.toFixed(2)}x`);
        if (c.costPerConversion > 0) parts.push(`CPA: ${formatCurrency(c.costPerConversion)}`);
        if (c.headline) parts.push(`Headline: "${c.headline}"`);
        lines.push(parts.join(", "));
      }
    }
  }

  return "\n" + lines.join("\n");
}

export function MetaSection({ clientId, clientName, startDate, endDate }: MetaSectionProps) {
  const [overview, setOverview] = useState<MetaOverview | null>(null);
  const [prevOverview, setPrevOverview] = useState<MetaOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [prevCampaigns, setPrevCampaigns] = useState<Campaign[]>([]);
  const [campaignsEnriched, setCampaignsEnriched] = useState<CampaignEnriched[]>([]);
  const [adSets, setAdSets] = useState<MetaAdSet[]>([]);
  const [creatives, setCreatives] = useState<MetaAdCreative[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [landingPages, setLandingPages] = useState<MetaLandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const base = `/api/meta?clientId=${encodeURIComponent(clientId)}&startDate=${startDate}&endDate=${endDate}`;
        const prev = getPreviousPeriod(startDate, endDate);
        const prevBase = `/api/meta?clientId=${encodeURIComponent(clientId)}&startDate=${prev.startDate}&endDate=${prev.endDate}`;

        const [ovRes, campRes, enrichedRes, dailyRes, lpRes, prevOvRes, prevCampRes, adSetsRes, creativesRes] = await Promise.all([
          fetch(`${base}&type=overview`, { signal: controller.signal }),
          fetch(`${base}&type=campaigns`, { signal: controller.signal }),
          fetch(`${base}&type=campaigns-enriched`, { signal: controller.signal }),
          fetch(`${base}&type=daily`, { signal: controller.signal }),
          fetch(`${base}&type=landing-pages`, { signal: controller.signal }),
          fetch(`${prevBase}&type=overview`, { signal: controller.signal }),
          fetch(`${prevBase}&type=campaigns`, { signal: controller.signal }),
          fetch(`${base}&type=adsets`, { signal: controller.signal }),
          fetch(`${base}&type=creatives`, { signal: controller.signal }),
        ]);

        if (!ovRes.ok) {
          const err = await ovRes.json();
          throw new Error(err.error ?? "Failed to fetch Meta Ads data");
        }

        const [ov, camp, enriched, d, lp, prevOv, prevCamp, adSetsData, creativesData] = await Promise.all([
          ovRes.json(),
          campRes.json(),
          enrichedRes.ok ? enrichedRes.json() : Promise.resolve([]),
          dailyRes.json(),
          lpRes.ok ? lpRes.json() : Promise.resolve([]),
          prevOvRes.ok ? prevOvRes.json() : Promise.resolve(null),
          prevCampRes.ok ? prevCampRes.json() : Promise.resolve([]),
          adSetsRes.ok ? adSetsRes.json() : Promise.resolve([]),
          creativesRes.ok ? creativesRes.json() : Promise.resolve([]),
        ]);

        setOverview(ov);
        setCampaigns(Array.isArray(camp) ? camp : []);
        setCampaignsEnriched(Array.isArray(enriched) ? enriched : []);
        setDaily(Array.isArray(d) ? d : []);
        setLandingPages(Array.isArray(lp) ? lp : []);
        setPrevOverview(prevOv?.totalSpend != null ? prevOv : null);
        setPrevCampaigns(Array.isArray(prevCamp) ? prevCamp : []);
        setAdSets(Array.isArray(adSetsData) ? adSetsData : []);
        setCreatives(Array.isArray(creativesData) ? creativesData : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load Meta Ads data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [clientId, startDate, endDate]);

  // Auto-save a metric snapshot for historical trending (non-critical, fire-and-forget)
  useEffect(() => {
    if (!overview) return;
    fetch("/api/ai/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        sectionType: "meta",
        periodStart: startDate,
        periodEnd: endDate,
        metrics: {
          totalSpend: overview.totalSpend,
          totalImpressions: overview.totalImpressions,
          totalClicks: overview.totalClicks,
          avgCtr: overview.avgCtr,
          avgCpc: overview.avgCpc,
          avgCpm: overview.avgCpm,
          totalConversions: overview.totalConversions,
          avgRoas: overview.avgRoas,
        },
        campaignData: campaignsEnriched.length ? campaignsEnriched : campaigns,
      }),
    }).catch((err) => { console.debug("Snapshot save failed (non-critical):", err); });
  }, [clientId, overview, campaignsEnriched, campaigns, startDate, endDate]);

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paid Social</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ad performance data via Meta Ads</p>
        </div>
        <span className="text-sm text-slate-400">
          {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Loading Meta Ads data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 font-medium">Failed to load Meta Ads data</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      ) : !overview ? null : (
        <>
      {/* Ad fatigue warning */}
      {campaignsEnriched.some(c => c.frequency > 3.5) && (() => {
        const fatigueCampaigns = campaignsEnriched.filter(c => c.frequency > 3.5);
        return (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fcd34d" }}>
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#d97706" }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#92400e", margin: 0 }}>
                Ad fatigue risk: {fatigueCampaigns.length} campaign{fatigueCampaigns.length > 1 ? "s" : ""} with frequency &gt; 3.5×
              </p>
              <p style={{ fontSize: 12, color: "#b45309", margin: "2px 0 0" }}>
                {fatigueCampaigns.map(c => `${c.name} (${c.frequency.toFixed(1)}×)`).join(" · ")}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Primary overview metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        <MetricCard
          title="Spend"
          value={formatCurrency(overview.totalSpend)}
          change={prevOverview ? pctChange(overview.totalSpend, prevOverview.totalSpend) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalSpend, prevOverview.totalSpend, "currency") : undefined}
        />
        <MetricCard
          title="Impressions"
          value={formatNumber(overview.totalImpressions)}
          change={prevOverview ? pctChange(overview.totalImpressions, prevOverview.totalImpressions) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalImpressions, prevOverview.totalImpressions, "count") : undefined}
        />
        <MetricCard
          title="Clicks"
          value={formatNumber(overview.totalClicks)}
          change={prevOverview ? pctChange(overview.totalClicks, prevOverview.totalClicks) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalClicks, prevOverview.totalClicks, "count") : undefined}
        />
        <MetricCard
          title={overview.conversionLabel}
          value={formatNumber(overview.totalConversions)}
          change={prevOverview ? pctChange(overview.totalConversions, prevOverview.totalConversions) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalConversions, prevOverview.totalConversions, "count") : undefined}
        />
        <MetricCard
          title="ROAS"
          value={`${overview.avgRoas.toFixed(2)}x`}
          change={prevOverview ? pctChange(overview.avgRoas, prevOverview.avgRoas) : undefined}
        />
        <MetricCard
          title="CPC"
          value={formatCurrency(overview.avgCpc)}
          change={prevOverview ? pctChange(prevOverview.avgCpc, overview.avgCpc) : undefined}
          changeDiff={prevOverview ? diffStr(overview.avgCpc, prevOverview.avgCpc, "currency") : undefined}
        />
      </div>

      {/* Secondary metrics */}
      {(overview.reach > 0 || overview.outboundClicks > 0 || overview.landingPageViews > 0 || overview.totalConversionValue > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {overview.totalConversionValue > 0 && (
            <MetricCard
              title="Conv. Value"
              value={formatCurrency(overview.totalConversionValue)}
              change={prevOverview?.totalConversionValue != null
                ? pctChange(overview.totalConversionValue, prevOverview.totalConversionValue ?? 0)
                : undefined}
              changeDiff={prevOverview?.totalConversionValue != null
                ? diffStr(overview.totalConversionValue, prevOverview.totalConversionValue ?? 0, "currency")
                : undefined}
            />
          )}
          <MetricCard
            title="Reach"
            value={formatNumber(overview.reach)}
            change={prevOverview ? pctChange(overview.reach, prevOverview.reach) : undefined}
            changeDiff={prevOverview ? diffStr(overview.reach, prevOverview.reach, "count") : undefined}
          />
          <MetricCard
            title="Frequency"
            value={overview.frequency.toFixed(2)}
            change={prevOverview ? pctChange(overview.frequency, prevOverview.frequency) : undefined}
          />
          <MetricCard
            title="Outbound Clicks"
            value={formatNumber(overview.outboundClicks)}
            change={prevOverview ? pctChange(overview.outboundClicks, prevOverview.outboundClicks) : undefined}
            changeDiff={prevOverview ? diffStr(overview.outboundClicks, prevOverview.outboundClicks, "count") : undefined}
          />
          <MetricCard
            title="Landing Page Views"
            value={formatNumber(overview.landingPageViews)}
            change={prevOverview ? pctChange(overview.landingPageViews, prevOverview.landingPageViews) : undefined}
            changeDiff={prevOverview ? diffStr(overview.landingPageViews, prevOverview.landingPageViews, "count") : undefined}
          />
        </div>
      )}

      {/* Spend chart */}
      {daily.length > 0 && (() => {
        const dailyWithCpm = daily.map(d => ({
          ...d,
          cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
        }));
        return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-5">Spend &amp; CPM Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyWithCpm} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="metaSpendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="metaCpmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="spend" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} width={50} />
              <YAxis yAxisId="cpm" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${Number(v).toFixed(1)}`} width={48} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#64748b" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  const num = typeof value === "number" ? value : Number(value ?? 0);
                  if (name === "spend") return [formatCurrency(num), "Spend"];
                  if (name === "cpm") return [formatCurrency(num), "CPM"];
                  return [num, name];
                }}
              />
              <Area yAxisId="spend" type="monotone" dataKey="spend" stroke="#ef4444" strokeWidth={2} fill="url(#metaSpendGrad)" dot={false} />
              <Area yAxisId="cpm" type="monotone" dataKey="cpm" stroke="#f59e0b" strokeWidth={2} fill="url(#metaCpmGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        );
      })()}

      {/* Clicks vs conversions chart */}
      {daily.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-5">Clicks &amp; Conversions</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#64748b" }}
              />
              <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" radius={[2, 2, 0, 0]} />
              <Bar dataKey="conversions" fill="#10b981" name="Conversions" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hierarchical Campaign → Ad Set → Creatives drill-down */}
      {(campaignsEnriched.length > 0 || campaigns.length > 0) && (() => {
        const prevCampaignsMap = new Map(prevCampaigns.map((c) => [c.id, c]));
        const displayCampaigns = campaignsEnriched.length > 0 ? campaignsEnriched : campaigns;
        // Group ad sets & creatives by campaign
        const adSetsByCampaign = new Map<string, MetaAdSet[]>();
        for (const s of adSets) {
          const arr = adSetsByCampaign.get(s.campaignId) ?? [];
          arr.push(s);
          adSetsByCampaign.set(s.campaignId, arr);
        }
        const creativesByAdSet = new Map<string, MetaAdCreative[]>();
        for (const c of creatives) {
          const key = c.adSetId || "unknown";
          const arr = creativesByAdSet.get(key) ?? [];
          arr.push(c);
          creativesByAdSet.set(key, arr);
        }

        const toggleCampaign = (id: string) => {
          setExpandedCampaigns((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        };
        const toggleAdSet = (id: string) => {
          setExpandedAdSets((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        };

        return (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Campaign Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click campaigns to expand ad sets, then ad sets to see ad creatives</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                    <th className="text-left px-6 py-4 font-medium min-w-[220px]">Name</th>
                    <th className="text-right px-4 py-4 font-medium">Spend</th>
                    <th className="text-right px-4 py-4 font-medium">Clicks</th>
                    <th className="text-right px-4 py-4 font-medium">{overview?.conversionLabel ?? "Conv."}</th>
                    <th className="text-right px-4 py-4 font-medium">ROAS</th>
                    <th className="text-right px-4 py-4 font-medium">Freq.</th>
                    <th className="text-right px-6 py-4 font-medium">Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayCampaigns.map((camp) => {
                    const prevC = prevCampaignsMap.get(camp.id);
                    const enriched = camp as CampaignEnriched;
                    const isExpanded = expandedCampaigns.has(camp.id);
                    const campAdSets = adSetsByCampaign.get(camp.id) ?? [];
                    const hasChildren = campAdSets.length > 0;
                    return (
                      <React.Fragment key={camp.id}>
                        {/* Campaign row */}
                        <tr
                          className={`transition cursor-pointer ${isExpanded ? "bg-slate-50" : "hover:bg-slate-50"}`}
                          onClick={() => hasChildren && toggleCampaign(camp.id)}
                        >
                          <td className="px-6 py-4 max-w-[220px]">
                            <div className="flex items-center gap-2">
                              {hasChildren ? (
                                isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              ) : <span className="w-3.5 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-slate-800 font-semibold truncate">{camp.name}</p>
                                <p className="text-slate-400 text-[11px] mt-0.5">
                                  {enriched.objective || enriched.bidStrategy || camp.status}
                                  {campAdSets.length > 0 && ` · ${campAdSets.length} ad set${campAdSets.length > 1 ? "s" : ""}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            <div>{formatCurrency(camp.spend)}</div>
                            <Delta current={camp.spend} previous={prevC?.spend} format="currency" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            <div>{formatNumber(camp.clicks)}</div>
                            <Delta current={camp.clicks} previous={prevC?.clicks} format="count" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            <div>{formatNumber(camp.conversions)}</div>
                            <Delta current={camp.conversions} previous={prevC?.conversions} format="count" />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`font-semibold ${camp.roas >= 2 ? "text-emerald-600" : camp.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                              {camp.roas.toFixed(2)}x
                            </span>
                            <Delta current={camp.roas} previous={prevC?.roas} format="none" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600">
                            {typeof enriched.frequency === "number" ? enriched.frequency.toFixed(2) : "—"}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">
                            {enriched.dailyBudget != null
                              ? formatCurrency(enriched.dailyBudget) + "/d"
                              : enriched.lifetimeBudget != null
                              ? formatCurrency(enriched.lifetimeBudget) + " ltm"
                              : "—"}
                          </td>
                        </tr>
                        {/* Expanded ad sets */}
                        {isExpanded && campAdSets.map((adSet) => {
                          const asExpanded = expandedAdSets.has(adSet.id);
                          const asCreatives = creativesByAdSet.get(adSet.id) ?? [];
                          const hasCreatives = asCreatives.length > 0;
                          return (
                            <React.Fragment key={adSet.id}>
                              {/* Ad set row */}
                              <tr
                                className={`transition cursor-pointer ${asExpanded ? "bg-blue-50/40" : "hover:bg-slate-50"}`}
                                onClick={() => hasCreatives && toggleAdSet(adSet.id)}
                              >
                                <td className="py-3 max-w-[220px]" style={{ paddingLeft: 48 }}>
                                  <div className="flex items-center gap-2">
                                    {hasCreatives ? (
                                      asExpanded ? <ChevronDown className="h-3 w-3 text-blue-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-blue-400 shrink-0" />
                                    ) : <span className="w-3 shrink-0" />}
                                    <div className="min-w-0">
                                      <p className="text-slate-700 font-medium truncate text-[11px]">
                                        <Layers className="h-3 w-3 inline-block mr-1 text-blue-400 -mt-0.5" />
                                        {adSet.name}
                                      </p>
                                      <p className="text-slate-400 text-[10px] mt-0.5">
                                        {adSet.optimizationGoal || "—"}
                                        {asCreatives.length > 0 && ` · ${asCreatives.length} ad${asCreatives.length > 1 ? "s" : ""}`}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px]">{formatCurrency(adSet.spend)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px]">{formatNumber(adSet.clicks)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px]">{formatNumber(adSet.conversions)}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`font-semibold text-[11px] ${adSet.roas >= 2 ? "text-emerald-600" : adSet.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                                    {adSet.roas.toFixed(2)}x
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px]">—</td>
                                <td className="px-6 py-3 text-right text-slate-500 text-[11px]">
                                  {adSet.dailyBudget != null
                                    ? formatCurrency(adSet.dailyBudget) + "/d"
                                    : adSet.lifetimeBudget != null
                                    ? formatCurrency(adSet.lifetimeBudget) + " ltm"
                                    : "—"}
                                </td>
                              </tr>
                              {/* Expanded creatives */}
                              {asExpanded && asCreatives.map((cr) => (
                                <tr key={cr.adId} className="hover:bg-violet-50/30 transition">
                                  <td className="py-3 max-w-[260px]" style={{ paddingLeft: 72 }}>
                                    <div className="flex items-center gap-3">
                                      {/* Thumbnail */}
                                      <div className="relative shrink-0 rounded-md overflow-hidden border border-slate-200" style={{ width: 56, height: 56, background: "#f8fafc" }}>
                                        {(cr.imageUrl || cr.thumbnailUrl) ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={cr.imageUrl || cr.thumbnailUrl || ""}
                                            alt={cr.adName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex items-center justify-center w-full h-full">
                                            <Image className="h-4 w-4 text-slate-300" />
                                          </div>
                                        )}
                                        {cr.mediaType === "VIDEO" && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Play className="h-4 w-4 text-white" fill="white" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-slate-700 font-medium truncate text-[11px]">{cr.adName}</p>
                                        {cr.headline && <p className="text-slate-400 text-[10px] truncate mt-0.5">&ldquo;{cr.headline}&rdquo;</p>}
                                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                                          style={{
                                            background: cr.mediaType === "VIDEO" ? "#ede9fe" : cr.mediaType === "CAROUSEL" ? "#dbeafe" : "#f1f5f9",
                                            color: cr.mediaType === "VIDEO" ? "#7c3aed" : cr.mediaType === "CAROUSEL" ? "#2563eb" : "#64748b",
                                          }}>
                                          {cr.mediaType === "UNKNOWN" ? "AD" : cr.mediaType}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px]">{formatCurrency(cr.spend)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px]">{formatNumber(cr.clicks)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px]">{formatNumber(cr.conversions)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`font-semibold text-[11px] ${cr.roas >= 2 ? "text-emerald-600" : cr.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                                      {cr.roas.toFixed(2)}x
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400 text-[11px]">—</td>
                                  <td className="px-6 py-3 text-right text-slate-400 text-[11px]">
                                    {formatPercent(cr.ctr)} CTR
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
        </>
      )}

      {/* Super Summary */}
      {!loading && !error && overview && (
        <SuperSummary
          sectionType="meta"
          metrics={{
            totalSpend: overview.totalSpend,
            totalImpressions: overview.totalImpressions,
            totalClicks: overview.totalClicks,
            avgCtr: overview.avgCtr,
            avgCpc: overview.avgCpc,
            avgCpm: overview.avgCpm,
            totalConversions: overview.totalConversions,
            avgRoas: overview.avgRoas,
            reach: overview.reach,
            frequency: overview.frequency,
            outboundClicks: overview.outboundClicks,
            landingPageViews: overview.landingPageViews,
          }}
          previousMetrics={prevOverview ? {
            totalSpend: prevOverview.totalSpend,
            totalImpressions: prevOverview.totalImpressions,
            totalClicks: prevOverview.totalClicks,
            avgCtr: prevOverview.avgCtr,
            avgCpc: prevOverview.avgCpc,
            avgCpm: prevOverview.avgCpm,
            totalConversions: prevOverview.totalConversions,
            avgRoas: prevOverview.avgRoas,
            reach: prevOverview.reach,
            frequency: prevOverview.frequency,
            outboundClicks: prevOverview.outboundClicks,
            landingPageViews: prevOverview.landingPageViews,
          } : undefined}
          campaignData={campaignsEnriched.length ? campaignsEnriched as unknown as Record<string, unknown>[] : undefined}
          landingPages={landingPages.length ? landingPages : undefined}
          clientName={clientName}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          extraContext={creatives.length ? buildCreativeSummary(creatives, adSets) : undefined}
        />
      )}

      {/* AI Insights */}
      {!loading && !error && overview && (
        <AiInsightsPanel
          sectionType="meta"
          metrics={{
            totalSpend: overview.totalSpend,
            totalImpressions: overview.totalImpressions,
            totalClicks: overview.totalClicks,
            avgCtr: overview.avgCtr,
            avgCpc: overview.avgCpc,
            avgCpm: overview.avgCpm,
            totalConversions: overview.totalConversions,
            avgRoas: overview.avgRoas,
            reach: overview.reach,
            frequency: overview.frequency,
            outboundClicks: overview.outboundClicks,
            landingPageViews: overview.landingPageViews,
            avgFrequency: campaignsEnriched.length > 0
              ? campaignsEnriched.reduce((s, c) => s + (c.frequency ?? 0), 0) / campaignsEnriched.length
              : overview.frequency,
          }}
          campaignData={campaignsEnriched.length ? campaignsEnriched as unknown as Record<string, unknown>[] : undefined}
          clientId={clientId}
          clientName={clientName}
          dateRange={`${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`}
          extraContext={creatives.length ? buildCreativeSummary(creatives, adSets) : undefined}
        />
      )}

      {/* Landing Page Analysis */}
      {!loading && !error && landingPages.length > 0 && (
        <AiLandingPageAnalysis
          landingPages={landingPages}
          clientName={clientName}
          source="meta"
        />
      )}
    </div>
  );
}
