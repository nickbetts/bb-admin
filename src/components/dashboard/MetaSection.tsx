"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Legend,
} from "recharts";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionCard, Delta } from "@/components/ui/index";
import { DataTable } from "@/components/ui/DataTable";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { EmptyBlockState } from "@/components/dashboard/shared/EmptyBlockState";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_AREA_STYLE, CHART_BAR_STYLE } from "@/lib/chart-config";
import { formatNumber, formatCurrency, formatPercent, formatDateDisplay, getPreviousPeriod, pctChange } from "@/lib/utils";
import { DollarSign, MousePointer, Eye, TrendingUp, AlertTriangle, ChevronRight, ChevronDown, Play, Image, Layers, X } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { AiLandingPageAnalysis } from "@/components/ai/AiLandingPageAnalysis";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { CreativeIntelligencePanel } from "./CreativeIntelligencePanel";
import { ClickFraudPanel } from "./ClickFraudPanel";
import { resolveConfig, filterAlertsByConfig } from "@/lib/signals/defaults";

interface MetaSectionProps {
  clientId: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hiddenCards?: Record<string, string[]>;
  hideAlerts?: boolean;
  hideAi?: boolean;
  reportMode?: boolean;
  clickFraudToken?: string | null;
  /** JSON string — see SignalConfig in `src/lib/signals/types.ts`. */
  signalConfig?: string | null;
  onMetricsReady?: (metrics: Record<string, number>) => void;
  onPreviousMetricsReady?: (metrics: Record<string, number>) => void;
  afterHeader?: React.ReactNode;
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
  cpc: number;
  cpm: number;
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
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
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
  videoId: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL" | "UNKNOWN";
  headline: string | null;
  bodyText: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
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
    for (const [asKey, adSet] of camp.adSets) {
      const adSetMeta = adSetsData.find(s => s.id === asKey || s.name === adSet.name);
      const asBudget = adSetMeta?.dailyBudget ? `${formatCurrency(adSetMeta.dailyBudget)}/d` : adSetMeta?.lifetimeBudget ? `${formatCurrency(adSetMeta.lifetimeBudget)} ltm` : "";
      const asFreq = adSetMeta?.frequency && adSetMeta.frequency > 0 ? ` Freq: ${adSetMeta.frequency.toFixed(1)}x` : "";
      const asCtr = adSetMeta ? ` CTR: ${adSetMeta.ctr.toFixed(2)}%` : "";
      const asCpc = adSetMeta ? ` CPC: ${formatCurrency(adSetMeta.cpc)}` : "";
      lines.push(`  Ad Set: "${adSet.name}"${asBudget ? ` [Budget: ${asBudget}]` : ""}${asFreq}${asCtr}${asCpc}`);
      for (const c of adSet.creatives) {
        const parts = [`    Ad: "${c.adName}" [${c.mediaType}] [${c.status}]`];
        parts.push(`Spend: ${formatCurrency(c.spend)}`);
        parts.push(`Impr: ${formatNumber(c.impressions)}`);
        parts.push(`Clicks: ${c.clicks}`);
        parts.push(`CTR: ${c.ctr.toFixed(2)}%`);
        parts.push(`CPC: ${formatCurrency(c.cpc)}`);
        parts.push(`CPM: ${formatCurrency(c.cpm)}`);
        if (c.frequency > 0) parts.push(`Freq: ${c.frequency.toFixed(1)}x`);
        parts.push(`Conv: ${c.conversions}`);
        if (c.conversions > 0) parts.push(`CPA: ${formatCurrency(c.costPerConversion)}`);
        parts.push(`ROAS: ${c.roas.toFixed(2)}x`);
        if (c.headline) parts.push(`Headline: "${c.headline}"`);
        if (c.bodyText) parts.push(`Body: "${c.bodyText}"`);
        lines.push(parts.join(", "));
      }
    }
  }

  return "\n" + lines.join("\n");
}

interface AdSetAudience {
  adSetId: string;
  adSetName: string;
  campaignId: string;
  status: string;
  ageMin: number | null;
  ageMax: number | null;
  genders: number[];
  geoSummary: string;
  interests: string[];
  behaviors: string[];
  customAudiences: Array<{ id: string; name: string }>;
  excludedAudiences: Array<{ id: string; name: string }>;
  hasDetailedTargeting: boolean;
}

type MetaAlert = { severity: "high" | "medium"; label: string; level: "Campaign" | "Ad Set" | "Creative"; detail: string; recommendation: string };

interface MetaPlacement { publisherPlatform: string; placement: string; impressions: number; clicks: number; spend: number; ctr: number; cpc: number; cpm: number; conversions: number; roas: number }
interface MetaDemographic { age: string; gender: string; impressions: number; clicks: number; spend: number; ctr: number; conversions: number; roas: number }
interface MetaFrequencyBucket { frequencyValue: string; reach: number; impressions: number }
interface MetaCostPerAction { actionType: string; value: number; costPerAction: number }
interface MetaProductPerf { productId: string; productName: string; impressions: number; clicks: number; spend: number; purchases: number; purchaseValue: number }
interface MetaCountryRow { country: string; impressions: number; clicks: number; spend: number; conversions: number; cpc: number; ctr: number }
interface MetaAttribution { adSetId: string; adSetName: string; campaignName: string; attributionSpec: string }
interface MetaActionBreakdown { actionType: string; value: number; costPerAction: number }
interface MetaInstantExp { adId: string; adName: string; clicksToOpen: number; outboundClicks: number }
interface MetaCustomConv { id: string; name: string; pixelRule: string; customEventType: string }
interface MetaSavedAud { id: string; name: string; approximateCount: number; type: string; subtype: string }
interface MetaSpendLimit { campaignId: string; campaignName: string; spendingLimit: number | null; dailyBudget: number | null; lifetimeBudget: number | null; amountSpent: number }
interface MetaHourlyRow { hourOfDay: string; impressions: number; clicks: number; spend: number; conversions: number; conversionValue: number; cpc: number }

export function MetaSection({ clientId, clientName, startDate, endDate, compareStartDate, compareEndDate, crossPlatformContext, visibleBlocks, hiddenCards, hideAlerts, hideAi, reportMode, clickFraudToken, signalConfig, onMetricsReady, onPreviousMetricsReady, afterHeader }: MetaSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const showCard = (blockId: string, cardId: string) => !hiddenCards?.[blockId]?.includes(cardId);
  const isExplicit = (block: string) => Array.isArray(visibleBlocks) && visibleBlocks.includes(block);
  const [overview, setOverview] = useState<MetaOverview | null>(null);
  const [prevOverview, setPrevOverview] = useState<MetaOverview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [prevCampaigns, setPrevCampaigns] = useState<Campaign[]>([]);
  const [campaignsEnriched, setCampaignsEnriched] = useState<CampaignEnriched[]>([]);
  const [adSets, setAdSets] = useState<MetaAdSet[]>([]);
  const [adSetAudiences, setAdSetAudiences] = useState<AdSetAudience[]>([]);
  const [creatives, setCreatives] = useState<MetaAdCreative[]>([]);
  const [daily, setDaily] = useState<DailyData[]>([]);
  const [landingPages, setLandingPages] = useState<MetaLandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ type: "image" | "video"; src: string; videoId?: string | null; title: string } | null>(null);
  const [alertAiRecs, setAlertAiRecs] = useState<string[]>([]);
  const [alertAiLoading, setAlertAiLoading] = useState(false);
  const [leadForms, setLeadForms] = useState<Array<{ formId: string; formName: string; leads: number; costPerLead: number; spend: number }>>([]);
  const [relevanceDiagnostics, setRelevanceDiagnostics] = useState<Array<{ adName: string; qualityRanking: string; engagementRateRanking: string; conversionRateRanking: string; impressions: number }>>([]);
  const [placements, setPlacements] = useState<MetaPlacement[]>([]);
  const [demographicsData, setDemographicsData] = useState<MetaDemographic[]>([]);
  const [frequencyDist, setFrequencyDist] = useState<MetaFrequencyBucket[]>([]);
  const [costPerAction, setCostPerAction] = useState<MetaCostPerAction[]>([]);
  const [productPerformance, setProductPerformance] = useState<MetaProductPerf[]>([]);
  const [countryBreakdown, setCountryBreakdown] = useState<MetaCountryRow[]>([]);
  const [attributionSettings, setAttributionSettings] = useState<MetaAttribution[]>([]);
  const [actionBreakdowns, setActionBreakdowns] = useState<MetaActionBreakdown[]>([]);
  const [instantExperience, setInstantExperience] = useState<MetaInstantExp[]>([]);
  const [customConversions, setCustomConversions] = useState<MetaCustomConv[]>([]);
  const [savedAudiences, setSavedAudiences] = useState<MetaSavedAud[]>([]);
  const [spendingLimits, setSpendingLimits] = useState<MetaSpendLimit[]>([]);
  const [hourlyBreakdown, setHourlyBreakdown] = useState<MetaHourlyRow[]>([]);

  // Compute anomaly alerts from current data
  const metaAlerts = useMemo<MetaAlert[]>(() => {
    const alerts: MetaAlert[] = [];
    for (const c of campaignsEnriched) {
      if (c.status !== "ACTIVE") continue;
      if (c.frequency >= 7)
        alerts.push({ severity: "high", level: "Campaign", label: c.name, detail: `Frequency ${c.frequency.toFixed(1)}× — severe ad fatigue`, recommendation: "Pause or refresh creatives immediately. Rest the campaign 3–5 days or rotate in new ad variations to reset audience fatigue." });
      else if (c.frequency > 3.5)
        alerts.push({ severity: "medium", level: "Campaign", label: c.name, detail: `Frequency ${c.frequency.toFixed(1)}× — fatigue risk`, recommendation: "Introduce creative variations or expand audience size. Rotating ad sets can reduce frequency without pausing delivery." });
      if (c.roas > 0 && c.roas < 1.0 && c.spend > 50)
        alerts.push({ severity: "high", level: "Campaign", label: c.name, detail: `ROAS ${c.roas.toFixed(2)}× — spend exceeding revenue`, recommendation: "Pause or cut budget and reallocate spend to stronger campaigns. Review audience targeting and landing page alignment." });
      else if (c.roas > 0 && c.roas < 1.5 && c.spend > 100)
        alerts.push({ severity: "medium", level: "Campaign", label: c.name, detail: `ROAS ${c.roas.toFixed(2)}× — below target threshold`, recommendation: "Reduce daily budget 20–30% and shift spend to better-performing campaigns. Review audience and creative mix." });
      if (c.ctr != null && c.ctr < 0.5 && c.impressions > 5000)
        alerts.push({ severity: "medium", level: "Campaign", label: c.name, detail: `CTR ${c.ctr.toFixed(2)}% — low click-through rate`, recommendation: "Test new ad copy, headlines, and creative formats. Ensure messaging matches the target audience's intent." });
    }
    for (const s of adSets) {
      if (s.status !== "ACTIVE") continue;
      if (s.frequency > 3.5)
        alerts.push({ severity: s.frequency >= 6 ? "high" : "medium", level: "Ad Set", label: s.name, detail: `Frequency ${s.frequency.toFixed(1)}×`, recommendation: "Expand audience or introduce creative variations. Excluding recent converters and widening the audience will dilute frequency." });
      if (s.roas > 0 && s.roas < 1.0 && s.spend > 30)
        alerts.push({ severity: "high", level: "Ad Set", label: s.name, detail: `ROAS ${s.roas.toFixed(2)}× — unprofitable`, recommendation: "Pause this ad set and reallocate budget to better-performing ad sets. Review audience, placements, and bid settings." });
      if (s.conversions === 0 && s.spend > 50)
        alerts.push({ severity: "medium", level: "Ad Set", label: s.name, detail: `£${s.spend.toFixed(0)} spend, 0 conversions`, recommendation: "Pause this ad set. Review landing page experience, audience relevance, and the optimisation event setup in Events Manager." });
    }
    for (const cr of creatives) {
      if (cr.status !== "ACTIVE") continue;
      if (cr.roas > 0 && cr.roas < 1.0 && cr.spend > 20)
        alerts.push({ severity: "high", level: "Creative", label: cr.adName, detail: `ROAS ${cr.roas.toFixed(2)}× — £${cr.spend.toFixed(0)} spent`, recommendation: "Pause this creative and reallocate budget to top-performers. A/B test a new format or message against a better-performing variation." });
      if (cr.frequency > 5)
        alerts.push({ severity: cr.frequency >= 8 ? "high" : "medium", level: "Creative", label: cr.adName, detail: `Frequency ${cr.frequency.toFixed(1)}×`, recommendation: "Retire or refresh this creative. Introduce new variants with different visuals or messaging to counter audience fatigue." });
      if (cr.conversions === 0 && cr.spend > 30 && cr.impressions > 1000)
        alerts.push({ severity: "medium", level: "Creative", label: cr.adName, detail: `£${cr.spend.toFixed(0)} spend, 0 conversions`, recommendation: "Pause and test new variations — try different formats (video vs. image), headlines, or calls-to-action." });
    }
    // ── Audience / targeting signals ──────────────────────────────────────
    for (const aud of adSetAudiences) {
      if (aud.status !== "ACTIVE") continue;
      // Find enriched ad set to check spend
      const matched = adSets.find((s) => s.id === aud.adSetId);
      const spend = matched?.spend ?? 0;
      // Find the parent campaign objective
      const parentCampaign = campaignsEnriched.find((c) => c.id === aud.campaignId);
      const objective = parentCampaign?.objective?.toUpperCase() ?? "";
      const isConversionCampaign = objective.includes("CONVER") || objective.includes("PURCHASE") || objective.includes("SALES");

      if (
        isConversionCampaign &&
        aud.customAudiences.length === 0 &&
        spend > 20
      ) {
        alerts.push({
          severity: "medium",
          level: "Ad Set",
          label: aud.adSetName,
          detail: "Conversion campaign running with no custom audience — missing retargeting",
          recommendation: "Add a website custom audience or customer list to retarget warm prospects. Retargeting typically delivers significantly higher ROAS than cold audience conversion campaigns.",
        });
      }

      if (
        aud.customAudiences.length > 0 &&
        aud.excludedAudiences.length === 0 &&
        spend > 50 &&
        (matched?.conversions ?? 0) > 0
      ) {
        alerts.push({
          severity: "medium",
          level: "Ad Set",
          label: aud.adSetName,
          detail: "No excluded custom audiences — existing converters may be served ads repeatedly",
          recommendation: "Exclude recent purchasers and high-value customer lists to avoid wasting budget on audiences unlikely to convert again and to improve overall ROAS.",
        });
      }

      const isFullyBroad =
        (aud.ageMin === null || aud.ageMin <= 18) &&
        (aud.ageMax === null || aud.ageMax >= 65) &&
        aud.genders.length === 0 &&
        !aud.hasDetailedTargeting &&
        aud.customAudiences.length === 0;

      if (isFullyBroad && spend > 30) {
        alerts.push({
          severity: "medium",
          level: "Ad Set",
          label: aud.adSetName,
          detail: "Fully broad targeting (18–65+, all genders, no interests, no audiences)",
          recommendation: "Consider adding interest, behaviour, or custom audience layers. Fully broad targeting can work with Advantage+ but may waste budget without directional signals.",
        });
      }
    }
    const sevOrder: Record<string, number> = { high: 0, medium: 1 };
    alerts.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));
    // Drop ROAS/conversion alerts the client config says shouldn't fire.
    const cfg = resolveConfig(signalConfig ?? null);
    return filterAlertsByConfig(alerts, cfg);
  }, [campaignsEnriched, adSets, creatives, adSetAudiences, signalConfig]);

  // Memoize creative summary — expensive string concatenation across potentially 500+ creatives
  const creativeSummary = useMemo(
    () => (creatives.length ? buildCreativeSummary(creatives, adSets) : undefined),
    [creatives, adSets]
  );

  // Memoize audience demographics summary for AI context (#11)
  const audienceDemoContext = useMemo(() => {
    if (!adSetAudiences.length) return undefined;
    const lines = adSetAudiences.slice(0, 8).map(a => {
      const age = a.ageMin != null && a.ageMax != null ? `${a.ageMin}–${a.ageMax}` : "all ages";
      const gender = a.genders.length === 1 ? (a.genders[0] === 1 ? "male" : "female") : "all genders";
      const interests = a.interests.slice(0, 3).join(", ");
      const customs = a.customAudiences.slice(0, 2).map(c => c.name).join(", ");
      const excl = a.excludedAudiences.slice(0, 2).map(c => c.name).join(", ");
      return `  • "${a.adSetName}" [${a.status}]: age ${age}, ${gender}, geo: ${a.geoSummary || "all"}${interests ? `, interests: ${interests}` : ""}${customs ? `, custom: ${customs}` : ""}${excl ? `, excluded: ${excl}` : ""}`;
    });
    return `AUDIENCE TARGETING (ad sets):\n${lines.join("\n")}`;
  }, [adSetAudiences]);

  // Fetch AI-generated recommendations for each alert
  useEffect(() => {
    setAlertAiRecs([]);
    if (!metaAlerts.length) return;
    setAlertAiLoading(true);
    const controller = new AbortController();
    fetch("/api/ai/summary", {
      signal: controller.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionType: "alert_recommendations",
        campaignPlatform: "meta",
        // clientId lets the backend load signalConfig + AI instructions + goals
        // and apply the direction-sanity guard.
        clientId,
        alerts: metaAlerts.map(a => ({ severity: a.severity, level: a.level, label: a.label, detail: a.detail })),
        campaignData: campaignsEnriched,
        clientName,
        dateRange: `${startDate} to ${endDate}`,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(json => { if (json?.recommendations?.length) setAlertAiRecs(json.recommendations); })
      .catch((e) => { if (!(e instanceof Error && e.name === "AbortError")) console.error("Meta AI recs error", e); })
      .finally(() => setAlertAiLoading(false));
    return () => controller.abort();
  }, [metaAlerts, clientId, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const base = `/api/meta?clientId=${encodeURIComponent(clientId)}&startDate=${startDate}&endDate=${endDate}`;
        const prev = (compareStartDate && compareEndDate)
          ? { startDate: compareStartDate, endDate: compareEndDate }
          : getPreviousPeriod(startDate, endDate);
        const prevBase = `/api/meta?clientId=${encodeURIComponent(clientId)}&startDate=${prev.startDate}&endDate=${prev.endDate}`;

        const [ovRes, campRes, enrichedRes, dailyRes, lpRes, prevOvRes, prevCampRes, adSetsRes, creativesRes, audiencesRes, leadFormsRes, relevanceRes, placementsRes, demographicsRes, frequencyDistRes, costPerActionRes, productPerfRes, countryBreakdownRes, attributionRes, actionBreakdownsRes, instantExpRes, customConvRes, savedAudRes, spendLimitsRes, hourlyRes] = await Promise.all([
          fetch(`${base}&type=overview`, { signal: controller.signal }),
          fetch(`${base}&type=campaigns`, { signal: controller.signal }),
          fetch(`${base}&type=campaigns-enriched`, { signal: controller.signal }),
          fetch(`${base}&type=daily`, { signal: controller.signal }),
          fetch(`${base}&type=landing-pages`, { signal: controller.signal }),
          fetch(`${prevBase}&type=overview`, { signal: controller.signal }),
          fetch(`${prevBase}&type=campaigns`, { signal: controller.signal }),
          fetch(`${base}&type=adsets`, { signal: controller.signal }),
          fetch(`${base}&type=creatives`, { signal: controller.signal }),
          fetch(`${base}&type=audiences`, { signal: controller.signal }),
          fetch(`${base}&type=lead-forms`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=relevance-diagnostics`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=placements`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=demographics`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=frequency`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=cost-per-action`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=product-performance`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=country-breakdown`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=attribution-settings`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=action-breakdowns`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=instant-experience`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=custom-conversions`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=saved-audiences`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=spending-limits`, { signal: controller.signal }).catch(() => null),
          fetch(`${base}&type=hourly`, { signal: controller.signal }).catch(() => null),
        ]);

        if (!ovRes.ok) {
          const err = await ovRes.json();
          throw new Error(err.error ?? "Failed to fetch Meta Ads data");
        }

        const [ov, camp, enriched, d, lp, prevOv, prevCamp, adSetsData, creativesData, audiencesData, leadFormsData, relevanceData, placementsData, demographicsRaw, frequencyDistData, costPerActionData, productPerfData, countryBreakdownData, attributionData, actionBreakdownsData, instantExpData, customConvData, savedAudData, spendLimitsData, hourlyData] = await Promise.all([
          ovRes.json(),
          campRes.json(),
          enrichedRes.ok ? enrichedRes.json() : Promise.resolve([]),
          dailyRes.json(),
          lpRes.ok ? lpRes.json() : Promise.resolve([]),
          prevOvRes.ok ? prevOvRes.json() : Promise.resolve(null),
          prevCampRes.ok ? prevCampRes.json() : Promise.resolve([]),
          adSetsRes.ok ? adSetsRes.json() : Promise.resolve([]),
          creativesRes.ok ? creativesRes.json() : Promise.resolve([]),
          audiencesRes.ok ? audiencesRes.json() : Promise.resolve([]),
          leadFormsRes?.ok ? leadFormsRes.json() : Promise.resolve([]),
          relevanceRes?.ok ? relevanceRes.json() : Promise.resolve([]),
          placementsRes?.ok ? placementsRes.json() : Promise.resolve([]),
          demographicsRes?.ok ? demographicsRes.json() : Promise.resolve([]),
          frequencyDistRes?.ok ? frequencyDistRes.json() : Promise.resolve([]),
          costPerActionRes?.ok ? costPerActionRes.json() : Promise.resolve([]),
          productPerfRes?.ok ? productPerfRes.json() : Promise.resolve([]),
          countryBreakdownRes?.ok ? countryBreakdownRes.json() : Promise.resolve([]),
          attributionRes?.ok ? attributionRes.json() : Promise.resolve([]),
          actionBreakdownsRes?.ok ? actionBreakdownsRes.json() : Promise.resolve([]),
          instantExpRes?.ok ? instantExpRes.json() : Promise.resolve([]),
          customConvRes?.ok ? customConvRes.json() : Promise.resolve([]),
          savedAudRes?.ok ? savedAudRes.json() : Promise.resolve([]),
          spendLimitsRes?.ok ? spendLimitsRes.json() : Promise.resolve([]),
          hourlyRes?.ok ? hourlyRes.json() : Promise.resolve([]),
        ]);

        setOverview(ov);
        if (ov) onMetricsReady?.({
          totalSpend: ov.totalSpend, totalImpressions: ov.totalImpressions,
          totalClicks: ov.totalClicks, avgCtr: ov.avgCtr, avgCpc: ov.avgCpc,
          avgCpm: ov.avgCpm, totalConversions: ov.totalConversions,
          avgRoas: ov.avgRoas, reach: ov.reach, frequency: ov.frequency,
        });
        setCampaigns(Array.isArray(camp) ? camp : []);
        setCampaignsEnriched(Array.isArray(enriched) ? enriched : []);
        setDaily(Array.isArray(d) ? d : []);
        setLandingPages(Array.isArray(lp) ? lp : []);
        setPrevOverview(prevOv?.totalSpend != null ? prevOv : null);
        if (prevOv?.totalSpend != null) onPreviousMetricsReady?.({
          totalSpend: prevOv.totalSpend, totalImpressions: prevOv.totalImpressions,
          totalClicks: prevOv.totalClicks, avgCtr: prevOv.avgCtr, avgCpc: prevOv.avgCpc,
          avgCpm: prevOv.avgCpm, totalConversions: prevOv.totalConversions,
          avgRoas: prevOv.avgRoas, reach: prevOv.reach, frequency: prevOv.frequency,
        });
        setPrevCampaigns(Array.isArray(prevCamp) ? prevCamp : []);
        setAdSets(Array.isArray(adSetsData) ? adSetsData : []);
        setCreatives(Array.isArray(creativesData) ? creativesData : []);
        setAdSetAudiences(Array.isArray(audiencesData) ? audiencesData : []);
        setLeadForms(Array.isArray(leadFormsData) ? leadFormsData : []);
        setRelevanceDiagnostics(Array.isArray(relevanceData) ? relevanceData : []);
        setPlacements(Array.isArray(placementsData) ? placementsData : []);
        setDemographicsData(Array.isArray(demographicsRaw) ? demographicsRaw : []);
        setFrequencyDist(Array.isArray(frequencyDistData) ? frequencyDistData : []);
        setCostPerAction(Array.isArray(costPerActionData) ? costPerActionData : []);
        setProductPerformance(Array.isArray(productPerfData) ? productPerfData : []);
        setCountryBreakdown(Array.isArray(countryBreakdownData) ? countryBreakdownData : []);
        setAttributionSettings(Array.isArray(attributionData) ? attributionData : []);
        setActionBreakdowns(Array.isArray(actionBreakdownsData) ? actionBreakdownsData : []);
        setInstantExperience(Array.isArray(instantExpData) ? instantExpData : []);
        setCustomConversions(Array.isArray(customConvData) ? customConvData : []);
        setSavedAudiences(Array.isArray(savedAudData) ? savedAudData : []);
        setSpendingLimits(Array.isArray(spendLimitsData) ? spendLimitsData : []);
        setHourlyBreakdown(Array.isArray(hourlyData) ? hourlyData : []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load Meta Ads data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [clientId, startDate, endDate, compareStartDate, compareEndDate]);

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
    <div className="flex flex-col gap-8">
      {/* Section header */}
      <SectionHeader
        title="Paid Social"
        subtitle="Via Meta Ads"
        icon={DollarSign}
        iconColor="#1877f2"
        actions={<span style={{ fontSize: 13, color: "var(--text-3)" }}>{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>}
      />

      {afterHeader}

      {loading ? (
        <SectionLoading color="#1877f2" message="Loading Meta Ads data…" />
      ) : error ? (
        <SectionError message={error} />
      ) : !overview ? null : (
        <>
      {/* Performance alerts — campaigns, ad sets, creatives */}
      {!hideAlerts && metaAlerts.length > 0 && (() => {
        const highAlerts = metaAlerts.filter(a => a.severity === "high");
        const medAlerts  = metaAlerts.filter(a => a.severity === "medium");

        const levelColour: Record<string, string> = {
          Campaign: "#7c3aed",
          "Ad Set": "#2563eb",
          Creative: "#0f766e",
        };

        return (
          <div style={{ borderRadius: 12, border: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}`, background: highAlerts.length ? "#fff1f2" : "#fffbeb", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: `1px solid ${highAlerts.length ? "#fca5a5" : "#fcd34d"}` }}>
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: highAlerts.length ? "#dc2626" : "#d97706" }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: highAlerts.length ? "#991b1b" : "#92400e", margin: 0 }}>
                {highAlerts.length} high-priority · {medAlerts.length} medium-priority issue{metaAlerts.length !== 1 ? "s" : ""} detected
              </p>
              {alertAiLoading && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#0f766e", fontStyle: "italic", flexShrink: 0 }}>Generating AI recommendations…</span>
              )}
            </div>
            {/* Alert rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {metaAlerts.map((a, i) => (
                <div key={i} style={{ padding: "8px 16px", borderBottom: i < metaAlerts.length - 1 ? `1px solid ${highAlerts.length ? "#fee2e2" : "#fef3c7"}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: a.severity === "high" ? "#dc2626" : "#d97706", borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                      {a.severity}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: levelColour[a.level], flexShrink: 0 }}>
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
      {/* Primary overview metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        {showCard("kpis", "spend") && <MetricCard
          title="Spend"
          value={formatCurrency(overview.totalSpend)}
          change={prevOverview ? pctChange(overview.totalSpend, prevOverview.totalSpend) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalSpend, prevOverview.totalSpend, "currency") : undefined}
        />}
        {showCard("kpis", "impressions") && <MetricCard
          title="Impressions"
          value={formatNumber(overview.totalImpressions)}
          change={prevOverview ? pctChange(overview.totalImpressions, prevOverview.totalImpressions) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalImpressions, prevOverview.totalImpressions, "count") : undefined}
        />}
        {showCard("kpis", "clicks") && <MetricCard
          title="Clicks"
          value={formatNumber(overview.totalClicks)}
          change={prevOverview ? pctChange(overview.totalClicks, prevOverview.totalClicks) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalClicks, prevOverview.totalClicks, "count") : undefined}
        />}
        {showCard("kpis", "conversions") && <MetricCard
          title={overview.conversionLabel}
          value={formatNumber(overview.totalConversions)}
          change={prevOverview ? pctChange(overview.totalConversions, prevOverview.totalConversions) : undefined}
          changeDiff={prevOverview ? diffStr(overview.totalConversions, prevOverview.totalConversions, "count") : undefined}
        />}
        {showCard("kpis", "roas") && <MetricCard
          title="ROAS"
          value={`${overview.avgRoas.toFixed(2)}x`}
          change={prevOverview ? pctChange(overview.avgRoas, prevOverview.avgRoas) : undefined}
        />}
        {showCard("kpis", "cpc") && <MetricCard
          title="CPC"
          value={formatCurrency(overview.avgCpc)}
          change={prevOverview ? pctChange(prevOverview.avgCpc, overview.avgCpc) : undefined}
          changeDiff={prevOverview ? diffStr(overview.avgCpc, prevOverview.avgCpc, "currency") : undefined}
        />}
      </div>

      {/* Secondary metrics */}
      {(overview.reach > 0 || overview.outboundClicks > 0 || overview.landingPageViews > 0 || overview.totalConversionValue > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {showCard("kpis", "conv_value") && overview.totalConversionValue > 0 && (
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
          {showCard("kpis", "reach") && <MetricCard
            title="Reach"
            value={formatNumber(overview.reach)}
            change={prevOverview ? pctChange(overview.reach, prevOverview.reach) : undefined}
            changeDiff={prevOverview ? diffStr(overview.reach, prevOverview.reach, "count") : undefined}
          />}
          {showCard("kpis", "frequency") && <MetricCard
            title="Frequency"
            value={overview.frequency.toFixed(2)}
            change={prevOverview ? pctChange(overview.frequency, prevOverview.frequency) : undefined}
          />}
          {showCard("kpis", "outbound_clicks") && <MetricCard
            title="Outbound Clicks"
            value={formatNumber(overview.outboundClicks)}
            change={prevOverview ? pctChange(overview.outboundClicks, prevOverview.outboundClicks) : undefined}
            changeDiff={prevOverview ? diffStr(overview.outboundClicks, prevOverview.outboundClicks, "count") : undefined}
          />}
          {showCard("kpis", "landing_page_views") && <MetricCard
            title="Landing Page Views"
            value={formatNumber(overview.landingPageViews)}
            change={prevOverview ? pctChange(overview.landingPageViews, prevOverview.landingPageViews) : undefined}
            changeDiff={prevOverview ? diffStr(overview.landingPageViews, prevOverview.landingPageViews, "count") : undefined}
          />}
        </div>
      )}
      </div>
      )}

      {/* Spend chart */}
      {show("chart") && daily.length > 0 && (() => {
        const dailyWithCpm = daily.map(d => ({
          ...d,
          cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
        }));
        return (
        <SectionCard title="Spend & CPM Over Time">
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
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="date" {...CHART_AXIS_STYLE} interval="preserveStartEnd" />
              <YAxis yAxisId="spend" {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${v}`} width={50} />
              <YAxis yAxisId="cpm" orientation="right" {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${Number(v).toFixed(1)}`} width={48} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                labelStyle={{ color: "#64748b" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  const num = typeof value === "number" ? value : Number(value ?? 0);
                  if (name === "spend") return [formatCurrency(num), "Spend"];
                  if (name === "cpm") return [formatCurrency(num), "CPM"];
                  return [num, name];
                }}
              />
              <Area {...CHART_AREA_STYLE} yAxisId="spend" dataKey="spend" stroke="#ef4444" fill="url(#metaSpendGrad)" name="Spend" />
              <Area {...CHART_AREA_STYLE} yAxisId="cpm" dataKey="cpm" stroke="#f59e0b" fill="url(#metaCpmGrad)" name="CPM" />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
        );
      })()}

      {/* Clicks vs conversions chart */}
      {daily.length > 0 && (
        <SectionCard title="Clicks & Conversions">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily} barSize={8}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="date" {...CHART_AXIS_STYLE} interval="preserveStartEnd" />
              <YAxis {...CHART_AXIS_STYLE} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                labelStyle={{ color: "#64748b" }}
              />
              <Bar {...CHART_BAR_STYLE} dataKey="clicks" fill="#3b82f6" name="Clicks" />
              <Bar {...CHART_BAR_STYLE} dataKey="conversions" fill="#10b981" name="Conversions" />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Hierarchical Campaign → Ad Set → Creatives drill-down */}
      {show("campaigns") && (campaignsEnriched.length > 0 || campaigns.length > 0) && (() => {
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

        // === REPORT MODE: per-campaign sections ===
        if (reportMode) {
          return (
            <div className="flex flex-col gap-6">
              {displayCampaigns.map((camp) => {
                const enriched = camp as CampaignEnriched;
                const prevC = prevCampaignsMap.get(camp.id);
                const campAdSets = adSetsByCampaign.get(camp.id) ?? [];
                const campCreatives = campAdSets.flatMap((as) => creativesByAdSet.get(as.id) ?? []);
                const campPurchaseValue = camp.roas * camp.spend;
                const prevPurchaseValue = prevC != null ? prevC.roas * prevC.spend : undefined;

                const stats: { label: string; display: string; current: number; previous: number | null | undefined; fmt: "currency" | "count" | "none" }[] = [
                  { label: "Spend", display: formatCurrency(camp.spend), current: camp.spend, previous: prevC?.spend, fmt: "currency" },
                  { label: "Impressions", display: formatNumber(camp.impressions), current: camp.impressions, previous: prevC?.impressions, fmt: "count" },
                  { label: "Clicks", display: formatNumber(camp.clicks), current: camp.clicks, previous: prevC?.clicks, fmt: "count" },
                  { label: "Purchases", display: formatNumber(camp.conversions), current: camp.conversions, previous: prevC?.conversions, fmt: "count" },
                  { label: "Purchase Value", display: formatCurrency(campPurchaseValue), current: campPurchaseValue, previous: prevPurchaseValue, fmt: "currency" },
                ];

                return (
                  <SectionCard
                    key={camp.id}
                    title={camp.name}
                    subtitle={[enriched.objective, campAdSets.length > 0 ? `${campAdSets.length} ad set${campAdSets.length !== 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}
                  >
                    {/* Campaign stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, paddingBottom: 20, marginBottom: campAdSets.length > 0 || campCreatives.length > 0 ? 24 : 0, borderBottom: campAdSets.length > 0 || campCreatives.length > 0 ? "1px solid var(--border-subtle)" : "none" }}>
                      {stats.map(({ label, display, current, previous, fmt }) => (
                        <div key={label}>
                          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 4 }}>{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>{display}</p>
                          <Delta current={current} previous={previous ?? null} format={fmt} />
                        </div>
                      ))}
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 4 }}>ROAS</p>
                        <p style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", color: camp.roas >= 2 ? "#10b981" : camp.roas >= 1 ? "#f59e0b" : "#ef4444" }}>{camp.roas.toFixed(2)}x</p>
                        <Delta current={camp.roas} previous={prevC?.roas ?? null} format="none" />
                      </div>
                    </div>

                    {/* Ad Sets */}
                    {campAdSets.length > 0 && (
                      <div style={{ marginBottom: campCreatives.length > 0 ? 28 : 0 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>Ad Sets</p>
                        <DataTable<MetaAdSet>
                          data={campAdSets}
                          pageSize={0}
                          columns={[
                            {
                              key: "name",
                              label: "Name",
                              render: (_, adSet) => (
                                <div>
                                  <p style={{ fontWeight: 600, color: "var(--text)" }}>{adSet.name}</p>
                                  <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{[adSet.optimizationGoal || adSet.status, (creativesByAdSet.get(adSet.id) ?? []).length > 0 ? `${(creativesByAdSet.get(adSet.id) ?? []).length} ad${(creativesByAdSet.get(adSet.id) ?? []).length !== 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}</p>
                                </div>
                              ),
                            },
                            { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
                            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                            { key: "conversions", label: "Purchases", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                            { key: "_value", label: "Value", align: "right", render: (_, adSet) => formatCurrency(adSet.roas * adSet.spend) },
                            { key: "roas", label: "ROAS", align: "right", sortable: true, render: (v) => <span style={{ fontWeight: 700, color: (v as number) >= 2 ? "#10b981" : (v as number) >= 1 ? "#f59e0b" : "#ef4444" }}>{(v as number).toFixed(2)}x</span> },
                          ]}
                        />
                      </div>
                    )}

                    {/* Creatives / Ads */}
                    {campCreatives.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>Ads</p>
                        <DataTable<MetaAdCreative>
                          data={campCreatives}
                          pageSize={0}
                          searchable
                          exportable
                          exportFilename="meta-ads"
                          columns={[
                            {
                              key: "adName",
                              label: "Ad",
                              render: (_, cr) => (
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  {(cr.imageUrl || cr.thumbnailUrl) && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={cr.imageUrl || cr.thumbnailUrl || ""}
                                      alt={cr.adName}
                                      style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }}
                                    />
                                  )}
                                  <div style={{ minWidth: 0 }}>
                                    <p style={{ fontWeight: 600, color: "var(--text)" }}>{cr.adName}</p>
                                    {cr.headline && <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>&ldquo;{cr.headline}&rdquo;</p>}
                                    <span style={{ display: "inline-block", marginTop: 3, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", background: cr.mediaType === "VIDEO" ? "#ede9fe" : cr.mediaType === "CAROUSEL" ? "#dbeafe" : "#f1f5f9", color: cr.mediaType === "VIDEO" ? "#7c3aed" : cr.mediaType === "CAROUSEL" ? "#2563eb" : "#64748b", padding: "1px 5px", borderRadius: 3 }}>
                                      {cr.mediaType === "UNKNOWN" ? "AD" : cr.mediaType}
                                    </span>
                                  </div>
                                </div>
                              ),
                            },
                            { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
                            { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                            { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                            { key: "conversions", label: "Purchases", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                            { key: "_value", label: "Value", align: "right", render: (_, cr) => formatCurrency(cr.roas * cr.spend) },
                            { key: "roas", label: "ROAS", align: "right", sortable: true, render: (v) => <span style={{ fontWeight: 700, color: (v as number) >= 2 ? "#10b981" : (v as number) >= 1 ? "#f59e0b" : "#ef4444" }}>{(v as number).toFixed(2)}x</span> },
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

        // === DASHBOARD MODE: hierarchical table ===
        return (
          <div className="card" style={{ overflow: "visible" }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Campaign Breakdown</h3>
                <p className="card-subtitle">Click campaigns to expand ad sets, then ad sets to see ad creatives</p>
              </div>
            </div>
            <div style={{ overflowX: "auto", overflowY: "visible", borderRadius: "0 0 16px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1080 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ textAlign: "left", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500, minWidth: 240 }}>Name</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Spend</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Impressions</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>CTR</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>CPC</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>CPM</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>{overview?.conversionLabel ?? "Conv."}</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>CPA</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>ROAS</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Freq.</th>
                    <th style={{ textAlign: "right", padding: "10px 16px", color: "var(--text-3)", fontWeight: 500 }}>Budget</th>
                  </tr>
                </thead>
                <tbody>
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
                          className={`transition cursor-pointer ${isExpanded ? "bg-[var(--border-subtle)]" : "hover:bg-[var(--border-subtle)]"}`}
                          onClick={() => hasChildren && toggleCampaign(camp.id)}
                        >
                          <td style={{ padding: "12px 16px", color: "var(--text-2)", minWidth: 240 }}>
                            <div className="flex items-center gap-2">
                              {hasChildren ? (
                                isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[var(--text-3)] shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--text-3)] shrink-0" />
                              ) : <span className="w-3.5 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-[var(--text)] font-semibold truncate">{camp.name}</p>
                                <p className="text-[var(--text-3)] text-[11px] mt-0.5">
                                  {enriched.objective || enriched.bidStrategy || camp.status}
                                  {campAdSets.length > 0 && ` · ${campAdSets.length} ad set${campAdSets.length > 1 ? "s" : ""}`}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            <div>{formatCurrency(camp.spend)}</div>
                            <Delta current={camp.spend} previous={prevC?.spend} format="currency" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            <div>{formatNumber(camp.impressions)}</div>
                            <Delta current={camp.impressions} previous={prevC?.impressions} format="count" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            <div>{formatNumber(camp.clicks)}</div>
                            <Delta current={camp.clicks} previous={prevC?.clicks} format="count" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            {camp.ctr.toFixed(2)}%
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            {formatCurrency(camp.cpc)}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            {formatCurrency(camp.cpm)}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            <div>{formatNumber(camp.conversions)}</div>
                            <Delta current={camp.conversions} previous={prevC?.conversions} format="count" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            {camp.conversions > 0 ? formatCurrency(camp.spend / camp.conversions) : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            <span className={`font-semibold ${camp.roas >= 2 ? "text-emerald-600" : camp.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                              {camp.roas.toFixed(2)}x
                            </span>
                            <Delta current={camp.roas} previous={prevC?.roas} format="none" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                            {typeof enriched.frequency === "number" ? enriched.frequency.toFixed(2) : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
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
                                className={`transition cursor-pointer ${asExpanded ? "bg-blue-50/40" : "hover:bg-[var(--border-subtle)]"}`}
                                onClick={() => hasCreatives && toggleAdSet(adSet.id)}
                              >
                                <td style={{ padding: "12px 16px 12px 48px", color: "var(--text-2)" }}>
                                  <div className="flex items-center gap-2">
                                    {hasCreatives ? (
                                      asExpanded ? <ChevronDown className="h-3 w-3 text-blue-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-blue-400 shrink-0" />
                                    ) : <span className="w-3 shrink-0" />}
                                    <div className="min-w-0">
                                      <p className="text-[var(--text)] font-medium truncate text-[11px]">
                                        <Layers className="h-3 w-3 inline-block mr-1 text-blue-400 -mt-0.5" />
                                        {adSet.name}
                                      </p>
                                      <p className="text-[var(--text-3)] text-[10px] mt-0.5">
                                        {adSet.optimizationGoal || adSet.status}
                                        {asCreatives.length > 0 && ` · ${asCreatives.length} ad${asCreatives.length > 1 ? "s" : ""}`}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatCurrency(adSet.spend)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(adSet.impressions)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(adSet.clicks)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{adSet.ctr.toFixed(2)}%</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatCurrency(adSet.cpc)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatCurrency(adSet.cpm)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(adSet.conversions)}</td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                                  {adSet.conversions > 0 ? formatCurrency(adSet.spend / adSet.conversions) : "—"}
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                                  <span className={`font-semibold text-[11px] ${adSet.roas >= 2 ? "text-emerald-600" : adSet.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                                    {adSet.roas.toFixed(2)}x
                                  </span>
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                                  {adSet.frequency > 0 ? adSet.frequency.toFixed(2) : "—"}
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
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
                                  <td style={{ padding: "12px 16px 12px 72px", color: "var(--text-2)" }}>
                                    <div className="flex items-center gap-3">
                                      {/* Thumbnail — click to open lightbox */}
                                      <button
                                        type="button"
                                        className="relative shrink-0 rounded-md overflow-hidden border border-[var(--border)] cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
                                        style={{ width: 56, height: 56, background: "var(--bg)" }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const isVideo = cr.mediaType === "VIDEO" && (cr.videoId || cr.videoUrl);
                                          const mediaSrc = isVideo
                                            ? (cr.videoUrl ?? cr.imageUrl ?? cr.thumbnailUrl ?? "")
                                            : (cr.imageUrl || cr.thumbnailUrl || "");
                                          if (mediaSrc || cr.videoId) {
                                            setLightbox({
                                              type: isVideo ? "video" : "image",
                                              src: mediaSrc,
                                              videoId: cr.videoId,
                                              title: cr.adName,
                                            });
                                          }
                                        }}
                                      >
                                        {(cr.imageUrl || cr.thumbnailUrl) ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={cr.imageUrl || cr.thumbnailUrl || ""}
                                            alt={cr.adName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="flex items-center justify-center w-full h-full">
                                            <Image className="h-4 w-4 text-[var(--text-3)]" />
                                          </div>
                                        )}
                                        {cr.mediaType === "VIDEO" && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Play className="h-4 w-4 text-white" fill="white" />
                                          </div>
                                        )}
                                      </button>
                                      <div className="min-w-0">
                                        <p className="text-[var(--text)] font-medium truncate text-[11px]">{cr.adName}</p>
                                        {cr.headline && <p className="text-[var(--text-3)] text-[10px] truncate mt-0.5">&ldquo;{cr.headline}&rdquo;</p>}
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
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatCurrency(cr.spend)}</td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(cr.impressions)}</td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(cr.clicks)}</td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{cr.ctr.toFixed(2)}%</td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatCurrency(cr.cpc)}</td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatCurrency(cr.cpm)}</td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>{formatNumber(cr.conversions)}</td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                                    {cr.conversions > 0 ? formatCurrency(cr.costPerConversion) : "—"}
                                  </td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                                    <span className={`font-semibold text-[11px] ${cr.roas >= 2 ? "text-emerald-600" : cr.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                                      {cr.roas.toFixed(2)}x
                                    </span>
                                  </td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                                    {cr.frequency > 0 ? cr.frequency.toFixed(2) : "—"}
                                  </td>
                                  <td style={{ padding: "12px 16px", textAlign: "right", color: "var(--text-2)" }}>
                                    {cr.status}
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
      {!hideAi && !loading && !error && overview && (
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
          extraContext={[creativeSummary, audienceDemoContext].filter(Boolean).join("\n\n") || undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* AI Insights */}
      {!hideAi && !loading && !error && overview && (
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
          extraContext={[creativeSummary, audienceDemoContext].filter(Boolean).join("\n\n") || undefined}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* Landing Page Analysis */}
      {!hideAi && !loading && !error && landingPages.length > 0 && (
        <AiLandingPageAnalysis
          landingPages={landingPages}
          clientName={clientName}
          source="meta"
        />
      )}

      {/* Creative Intelligence */}
      {!hideAi && !reportMode && !loading && !error && (
        <CreativeIntelligencePanel
          clientId={clientId}
          platform="meta"
          creativeData={creatives.map(c => ({
            name: c.adName,
            spend: c.spend,
            impressions: c.impressions,
            clicks: c.clicks,
            ctr: c.ctr,
            conversions: c.conversions,
            roas: c.roas,
            format: c.mediaType,
            headline: c.headline ?? undefined,
          }))}
        />
      )}

      {/* Click Fraud Protection */}
      {!loading && !error && overview && show("click_fraud") && (
        <ClickFraudPanel
          platform="meta"
          metaBotEstimate={{
            outboundClicks: overview.outboundClicks,
            landingPageViews: overview.landingPageViews,
            totalSpend: overview.totalSpend,
            totalClicks: overview.totalClicks,
          }}
          clientId={clientId}
          clientName={clientName}
          clickFraudToken={clickFraudToken}
          reportMode={reportMode}
        />
      )}

      {/* Lead Form Performance */}
      {isExplicit("lead_forms") && leadForms.length === 0 && (
        <EmptyBlockState title="Lead Forms" message="No lead-form ads in this period." />
      )}
      {show("lead_forms") && leadForms.length > 0 && (
        <SectionCard title="Lead Form Performance" subtitle={`${leadForms.length} form${leadForms.length !== 1 ? "s" : ""} with lead data`}>
          <DataTable
            data={leadForms}
            pageSize={0}
            columns={[
              { key: "formName", label: "Form Name" },
              { key: "leads", label: "Leads", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "costPerLead", label: "Cost per Lead", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
              { key: "spend", label: "Total Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
            ]}
          />
        </SectionCard>
      )}

      {/* Ad Relevance Diagnostics */}
      {isExplicit("relevance") && relevanceDiagnostics.length === 0 && (
        <EmptyBlockState title="Relevance Diagnostics" />
      )}
      {show("relevance") && relevanceDiagnostics.length > 0 && (
        <SectionCard title="Ad Relevance Diagnostics" subtitle="Quality, engagement, and conversion ranking per ad">
          <DataTable
            data={relevanceDiagnostics}
            pageSize={0}
            searchable
            columns={[
              { key: "adName", label: "Ad Name" },
              {
                key: "qualityRanking",
                label: "Quality",
                align: "center",
                render: (v) => {
                  const r = (v as string) ?? "UNKNOWN";
                  const label = r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                  const cls = r === "ABOVE_AVERAGE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r === "AVERAGE" ? "bg-amber-50 text-amber-700 border-amber-200" : r === "BELOW_AVERAGE" ? "bg-red-50 text-red-700 border-red-200" : "bg-[var(--border-subtle)] text-[var(--text-3)] border-[var(--border)]";
                  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{label}</span>;
                },
              },
              {
                key: "engagementRateRanking",
                label: "Engagement",
                align: "center",
                render: (v) => {
                  const r = (v as string) ?? "UNKNOWN";
                  const label = r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                  const cls = r === "ABOVE_AVERAGE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r === "AVERAGE" ? "bg-amber-50 text-amber-700 border-amber-200" : r === "BELOW_AVERAGE" ? "bg-red-50 text-red-700 border-red-200" : "bg-[var(--border-subtle)] text-[var(--text-3)] border-[var(--border)]";
                  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{label}</span>;
                },
              },
              {
                key: "conversionRateRanking",
                label: "Conversion",
                align: "center",
                render: (v) => {
                  const r = (v as string) ?? "UNKNOWN";
                  const label = r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                  const cls = r === "ABOVE_AVERAGE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r === "AVERAGE" ? "bg-amber-50 text-amber-700 border-amber-200" : r === "BELOW_AVERAGE" ? "bg-red-50 text-red-700 border-red-200" : "bg-[var(--border-subtle)] text-[var(--text-3)] border-[var(--border)]";
                  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{label}</span>;
                },
              },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
            ]}
          />
        </SectionCard>
      )}

      {/* Placement Breakdown */}
      {isExplicit("placements") && placements.length === 0 && (
        <EmptyBlockState title="Placement Performance" />
      )}
      {show("placements") && placements.length > 0 && (
        <SectionCard title="Placement Breakdown" subtitle={`Performance across ${placements.length} placement${placements.length !== 1 ? "s" : ""}`}>
          <DataTable<MetaPlacement>
            data={placements}
            pageSize={0}
            exportable
            exportFilename="meta-placements"
            columns={[
              { key: "publisherPlatform", label: "Platform" },
              { key: "placement", label: "Placement", render: (v) => (v as string).replace(/_/g, " ") },
              { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "ctr", label: "CTR", align: "right", sortable: true, render: (v) => `${(v as number).toFixed(2)}%` },
              { key: "cpc", label: "CPC", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
              { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "roas", label: "ROAS", align: "right", sortable: true, render: (v) => <span className={`font-semibold ${(v as number) >= 2 ? "text-emerald-600" : (v as number) >= 1 ? "text-amber-600" : "text-red-600"}`}>{(v as number).toFixed(2)}x</span> },
            ]}
          />
        </SectionCard>
      )}

      {/* Audience Targeting */}
      {isExplicit("audiences") && adSetAudiences.length === 0 && (
        <EmptyBlockState title="Audience Performance" />
      )}
      {show("audiences") && adSetAudiences.length > 0 && (() => {
        // Join audience targeting with ad set performance data
        const adSetPerfMap = new Map(adSets.map((s) => [s.id, s]));
        const enrichedAudiences = adSetAudiences.map((aud) => {
          const perf = adSetPerfMap.get(aud.adSetId);
          return {
            ...aud,
            spend: perf?.spend ?? 0,
            impressions: perf?.impressions ?? 0,
            clicks: perf?.clicks ?? 0,
            ctr: perf?.ctr ?? 0,
            conversions: perf?.conversions ?? 0,
            roas: perf?.roas ?? 0,
            cpc: perf?.cpc ?? 0,
          };
        }).filter((a) => a.spend > 0 || a.impressions > 0);

        // Bar chart — spend per audience/ad set
        const chartData = [...enrichedAudiences]
          .sort((a, b) => b.spend - a.spend)
          .slice(0, 15)
          .map((a) => ({
            name: a.adSetName.length > 22 ? a.adSetName.slice(0, 20) + "…" : a.adSetName,
            spend: a.spend,
            conversions: a.conversions,
          }));

        return (
          <SectionCard title="Audience Targeting Performance" subtitle={`Performance by targeting configuration — ${enrichedAudiences.length} ad set${enrichedAudiences.length !== 1 ? "s" : ""}`}>
            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={20} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid {...CHART_GRID_STYLE} />
                  <XAxis dataKey="name" {...CHART_AXIS_STYLE} angle={-35} textAnchor="end" interval={0} />
                  <YAxis yAxisId="spend" {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${v}`} width={52} />
                  <YAxis yAxisId="conversions" orientation="right" {...CHART_AXIS_STYLE} width={36} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE.contentStyle} formatter={(value, name) => {
                    const num = typeof value === "number" ? value : Number(value ?? 0);
                    if (name === "Spend") return [formatCurrency(num), "Spend"];
                    return [formatNumber(num), String(name)];
                  }} />
                  <Bar {...CHART_BAR_STYLE} yAxisId="spend" dataKey="spend" fill="#8b5cf6" name="Spend" />
                  <Bar {...CHART_BAR_STYLE} yAxisId="conversions" dataKey="conversions" fill="#10b981" name="Conversions" />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <DataTable
              data={enrichedAudiences}
              pageSize={10}
              className="mt-4"
              exportable
              exportFilename="meta-audience-performance"
              columns={[
                { key: "adSetName", label: "Ad Set" },
                { key: "ageMin", label: "Age", render: (_, aud) => {
                  const a = aud as typeof enrichedAudiences[0];
                  return a.ageMin != null && a.ageMax != null ? `${a.ageMin}–${a.ageMax}` : "All";
                }},
                { key: "genders", label: "Gender", render: (_, aud) => {
                  const a = aud as typeof enrichedAudiences[0];
                  return a.genders.length === 1 ? (a.genders[0] === 1 ? "Male" : "Female") : "All";
                }},
                { key: "geoSummary", label: "Location", render: (v) => (v as string) || "All" },
                { key: "interests", label: "Targeting", render: (_, aud) => {
                  const a = aud as typeof enrichedAudiences[0];
                  const parts: string[] = [];
                  if (a.interests.length > 0) parts.push(a.interests.slice(0, 2).join(", ") + (a.interests.length > 2 ? ` +${a.interests.length - 2}` : ""));
                  if (a.customAudiences.length > 0) parts.push(`Custom: ${a.customAudiences.map(c => c.name).slice(0, 2).join(", ")}`);
                  return parts.join(" | ") || "Broad";
                }},
                { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
                { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "ctr", label: "CTR", align: "right", sortable: true, render: (v) => `${(v as number).toFixed(2)}%` },
                { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "roas", label: "ROAS", align: "right", sortable: true, render: (v) => <span className={`font-semibold ${(v as number) >= 2 ? "text-emerald-600" : (v as number) >= 1 ? "text-amber-600" : "text-red-600"}`}>{(v as number).toFixed(2)}x</span> },
              ]}
            />
          </SectionCard>
        );
      })()}

      {/* Custom Audience Segment Performance */}
      {show("audiences") && adSetAudiences.some((a) => a.customAudiences.length > 0) && (() => {
        // Meta's Insights API does not support a `custom_audience` breakdown — when
        // an ad set targets multiple custom audiences, performance is only reported
        // at the ad set level (combined). The most accurate drill-down is therefore
        // per ad set, with the audiences that ad set uses listed.
        const adSetPerfMap = new Map(adSets.map((s) => [s.id, s]));
        const rows = adSetAudiences
          .filter((aud) => aud.customAudiences.length > 0)
          .map((aud) => {
            const perf = adSetPerfMap.get(aud.adSetId);
            if (!perf || (perf.spend === 0 && perf.impressions === 0)) return null;
            return {
              adSetId: aud.adSetId,
              adSetName: aud.adSetName,
              audienceCount: aud.customAudiences.length,
              audiences: aud.customAudiences.map((c) => c.name),
              excluded: aud.excludedAudiences.map((c) => c.name),
              spend: perf.spend,
              impressions: perf.impressions,
              clicks: perf.clicks,
              ctr: perf.ctr,
              conversions: perf.conversions,
              roas: perf.roas,
              cpa: perf.conversions > 0 ? perf.spend / perf.conversions : 0,
              isolated: aud.customAudiences.length === 1,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .sort((a, b) => b.spend - a.spend);

        if (rows.length === 0) return null;

        const stackedCount = rows.filter((r) => !r.isolated).length;
        const isolatedRows = rows.filter((r) => r.isolated);

        return (
          <SectionCard
            title="Custom Audience Performance"
            subtitle={`Per-ad-set breakdown — ${rows.length} ad set${rows.length !== 1 ? "s" : ""} using custom audiences`}
          >
            {/* Limitation notice */}
            {stackedCount > 0 && (
              <div style={{ borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                <div>
                  <strong>API limitation:</strong> Meta does not split performance by individual custom audience when an ad set stacks multiple audiences. {stackedCount} of your {rows.length} ad set{rows.length !== 1 ? "s" : ""} target{stackedCount === 1 ? "s" : ""} more than one audience, so their numbers are reported as a combined total. To get true per-audience attribution, isolate each custom audience in its own ad set.
                </div>
              </div>
            )}

            {/* Bar chart by ad set */}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={rows.slice(0, 12).map((r) => ({
                  name: r.adSetName.length > 22 ? r.adSetName.slice(0, 20) + "…" : r.adSetName,
                  spend: r.spend,
                  conversions: r.conversions,
                }))}
                barSize={20}
                margin={{ top: 4, right: 8, left: 0, bottom: 60 }}
              >
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis dataKey="name" {...CHART_AXIS_STYLE} angle={-35} textAnchor="end" interval={0} height={60} />
                <YAxis yAxisId="spend" {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${v}`} width={52} />
                <YAxis yAxisId="conversions" orientation="right" {...CHART_AXIS_STYLE} width={36} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE.contentStyle} formatter={(value, name) => {
                  const num = typeof value === "number" ? value : Number(value ?? 0);
                  if (name === "Spend") return [formatCurrency(num), "Spend"];
                  return [formatNumber(num), String(name)];
                }} />
                <Bar {...CHART_BAR_STYLE} yAxisId="spend" dataKey="spend" fill="#6366f1" name="Spend" />
                <Bar {...CHART_BAR_STYLE} yAxisId="conversions" dataKey="conversions" fill="#f59e0b" name="Conversions" />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </BarChart>
            </ResponsiveContainer>

            {/* Per-ad-set table with audience composition */}
            <DataTable
              data={rows}
              pageSize={10}
              className="mt-4"
              exportable
              exportFilename="meta-custom-audiences-by-adset"
              columns={[
                { key: "adSetName", label: "Ad Set", render: (_v, r) => {
                  const row = r as typeof rows[0];
                  return (
                    <div>
                      <p style={{ fontWeight: 600, color: "var(--text)" }}>{row.adSetName}</p>
                      <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                        {row.isolated
                          ? <span style={{ color: "#059669", fontWeight: 600 }}>● Isolated audience</span>
                          : <span style={{ color: "#d97706", fontWeight: 600 }}>● {row.audienceCount} audiences stacked</span>}
                      </p>
                    </div>
                  );
                }},
                { key: "audiences", label: "Custom Audiences", render: (_v, r) => {
                  const row = r as typeof rows[0];
                  return (
                    <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                      {row.audiences.map((a, i) => <div key={i}>• {a}</div>)}
                      {row.excluded.length > 0 && (
                        <div style={{ marginTop: 4, color: "#dc2626" }}>
                          {row.excluded.map((a, i) => <div key={i}>✕ Excluded: {a}</div>)}
                        </div>
                      )}
                    </div>
                  );
                }},
                { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
                { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "ctr", label: "CTR", align: "right", sortable: true, render: (v) => `${(v as number).toFixed(2)}%` },
                { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "cpa", label: "CPA", align: "right", sortable: true, render: (v) => (v as number) > 0 ? formatCurrency(v as number) : "—" },
                { key: "roas", label: "ROAS", align: "right", sortable: true, render: (v) => <span className={`font-semibold ${(v as number) >= 2 ? "text-emerald-600" : (v as number) >= 1 ? "text-amber-600" : "text-red-600"}`}>{(v as number).toFixed(2)}x</span> },
              ]}
            />

            {/* True per-audience block — only safe when audience is isolated in its own ad set */}
            {isolatedRows.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 4 }}>
                  Verified per-audience performance
                </p>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
                  These ad sets target a single custom audience, so the metrics below are attributable to that exact audience.
                </p>
                <DataTable
                  data={isolatedRows.map((r) => ({ audience: r.audiences[0], adSetName: r.adSetName, spend: r.spend, impressions: r.impressions, clicks: r.clicks, ctr: r.ctr, conversions: r.conversions, cpa: r.cpa, roas: r.roas }))}
                  pageSize={0}
                  exportable
                  exportFilename="meta-isolated-audience-performance"
                  columns={[
                    { key: "audience", label: "Custom Audience" },
                    { key: "adSetName", label: "Ad Set" },
                    { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
                    { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                    { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                    { key: "ctr", label: "CTR", align: "right", sortable: true, render: (v) => `${(v as number).toFixed(2)}%` },
                    { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                    { key: "cpa", label: "CPA", align: "right", sortable: true, render: (v) => (v as number) > 0 ? formatCurrency(v as number) : "—" },
                    { key: "roas", label: "ROAS", align: "right", sortable: true, render: (v) => <span className={`font-semibold ${(v as number) >= 2 ? "text-emerald-600" : (v as number) >= 1 ? "text-amber-600" : "text-red-600"}`}>{(v as number).toFixed(2)}x</span> },
                  ]}
                />
              </div>
            )}
          </SectionCard>
        );
      })()}

      {/* Demographics */}
      {isExplicit("demographics") && demographicsData.length === 0 && (
        <EmptyBlockState title="Demographics" />
      )}
      {show("demographics") && demographicsData.length > 0 && (() => {
        const byAge = Object.values(
          demographicsData.reduce<Record<string, { age: string; spend: number; clicks: number; impressions: number; conversions: number }>>((acc, d) => {
            if (!acc[d.age]) acc[d.age] = { age: d.age, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
            acc[d.age].spend += d.spend;
            acc[d.age].clicks += d.clicks;
            acc[d.age].impressions += d.impressions;
            acc[d.age].conversions += d.conversions;
            return acc;
          }, {})
        );
        return (
          <SectionCard title="Demographics" subtitle="Performance by age and gender">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byAge} barSize={24}>
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis dataKey="age" {...CHART_AXIS_STYLE} />
                <YAxis {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${v}`} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE.contentStyle} />
                <Bar {...CHART_BAR_STYLE} dataKey="spend" fill="#8b5cf6" name="Spend" />
              </BarChart>
            </ResponsiveContainer>
            <DataTable<MetaDemographic>
              data={demographicsData}
              pageSize={0}
              className="mt-4"
              columns={[
                { key: "age", label: "Age" },
                { key: "gender", label: "Gender" },
                { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
                { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "ctr", label: "CTR", align: "right", sortable: true, render: (v) => `${(v as number).toFixed(2)}%` },
                { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
                { key: "roas", label: "ROAS", align: "right", sortable: true, render: (v) => <span className={`font-semibold ${(v as number) >= 2 ? "text-emerald-600" : (v as number) >= 1 ? "text-amber-600" : "text-red-600"}`}>{(v as number).toFixed(2)}x</span> },
              ]}
            />
          </SectionCard>
        );
      })()}

      {/* Frequency Distribution */}
      {isExplicit("frequency") && frequencyDist.length === 0 && (
        <EmptyBlockState title="Frequency Distribution" />
      )}
      {show("frequency") && frequencyDist.length > 0 && (
        <SectionCard title="Frequency Distribution" subtitle="How often users see your ads">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={frequencyDist} barSize={32}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="frequencyValue" {...CHART_AXIS_STYLE} />
              <YAxis {...CHART_AXIS_STYLE} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE.contentStyle} />
              <Bar {...CHART_BAR_STYLE} dataKey="reach" fill="#6366f1" name="Unique Users" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Reach Estimate — top ad sets by unique users with frequency cap analysis */}
      {isExplicit("reach_estimate") && adSets.length === 0 && (
        <EmptyBlockState title="Reach Estimate" />
      )}
      {show("reach_estimate") && adSets.length > 0 && (
        <SectionCard title="Reach Estimate" subtitle="Top ad sets by unique reach with frequency analysis">
          <DataTable<MetaAdSet>
            data={[...adSets].sort((a, b) => b.reach - a.reach).slice(0, 15)}
            columns={[
              { key: "name", label: "Ad Set", render: (_v, row) => <span style={{ fontWeight: 500 }}>{row.name}</span> },
              { key: "campaignName", label: "Campaign", render: (_v, row) => <span style={{ color: "var(--text-3)" }}>{row.campaignName}</span> },
              { key: "reach", label: "Reach", align: "right", sortable: true, render: (_v, row) => formatNumber(row.reach) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (_v, row) => formatNumber(row.impressions) },
              { key: "frequency", label: "Frequency", align: "right", sortable: true, render: (_v, row) => (
                <span style={{ color: row.frequency > 4 ? "var(--danger)" : row.frequency > 2.5 ? "var(--warning)" : "var(--text-2)", fontWeight: row.frequency > 2.5 ? 600 : 400 }}>{row.frequency.toFixed(2)}</span>
              ) },
              { key: "spend", label: "Spend", align: "right", sortable: true, render: (_v, row) => formatCurrency(row.spend) },
            ]}
            pageSize={0}
            exportable
            exportFilename="meta-reach-estimate"
          />
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>Frequency above 2.5 may indicate audience fatigue; above 4 strongly suggests creative refresh or audience expansion.</p>
        </SectionCard>
      )}

      {/* Cost Per Action */}
      {isExplicit("cost_per_action") && costPerAction.length === 0 && (
        <EmptyBlockState title="Cost Per Action" />
      )}
      {show("cost_per_action") && costPerAction.length > 0 && (
        <SectionCard title="Cost Per Action" subtitle="Breakdown by action type">
          <DataTable<MetaCostPerAction>
            data={costPerAction}
            pageSize={0}
            columns={[
              { key: "actionType", label: "Action Type", render: (v) => (v as string).replace(/_/g, " ").replace(/\./g, " › ").replace(/\b\w/g, c => c.toUpperCase()) },
              { key: "value", label: "Count", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "costPerAction", label: "Cost Per Action", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
            ]}
          />
        </SectionCard>
      )}

      {/* Product Performance */}
      {isExplicit("product_performance") && productPerformance.length === 0 && (
        <EmptyBlockState title="Product Performance" message="No product-level data — connect a product catalog to enable." />
      )}
      {show("product_performance") && productPerformance.length > 0 && (
        <SectionCard title="Product Performance" subtitle={`${productPerformance.length} product${productPerformance.length !== 1 ? "s" : ""} with ad data`}>
          <DataTable<MetaProductPerf>
            data={productPerformance}
            pageSize={0}
            exportable
            exportFilename="meta-products"
            columns={[
              { key: "productName", label: "Product" },
              { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "purchases", label: "Purchases", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "purchaseValue", label: "Revenue", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
            ]}
          />
        </SectionCard>
      )}

      {/* Country Breakdown */}
      {isExplicit("country_breakdown") && countryBreakdown.length === 0 && (
        <EmptyBlockState title="Country Breakdown" />
      )}
      {show("country_breakdown") && countryBreakdown.length > 0 && (
        <SectionCard title="Country Breakdown" subtitle={`Performance across ${countryBreakdown.length} ${countryBreakdown.length !== 1 ? "countries" : "country"}`}>
          <DataTable<MetaCountryRow>
            data={countryBreakdown}
            pageSize={0}
            exportable
            exportFilename="meta-country-breakdown"
            columns={[
              { key: "country", label: "Country" },
              { key: "spend", label: "Spend", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
              { key: "impressions", label: "Impressions", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "clicks", label: "Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "ctr", label: "CTR", align: "right", sortable: true, render: (v) => `${(v as number).toFixed(2)}%` },
              { key: "cpc", label: "CPC", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
              { key: "conversions", label: "Conv.", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
            ]}
          />
        </SectionCard>
      )}

      {/* Attribution Settings */}
      {isExplicit("attribution") && attributionSettings.length === 0 && (
        <EmptyBlockState title="Attribution Settings" />
      )}
      {show("attribution") && attributionSettings.length > 0 && (
        <SectionCard title="Attribution Settings" subtitle="Attribution windows per ad set">
          <DataTable<MetaAttribution>
            data={attributionSettings}
            pageSize={0}
            columns={[
              { key: "campaignName", label: "Campaign" },
              { key: "adSetName", label: "Ad Set" },
              {
                key: "attributionSpec",
                label: "Attribution Window",
                render: (v) => {
                  let windowLabel = v as string;
                  try {
                    const spec = JSON.parse(v as string);
                    if (Array.isArray(spec)) windowLabel = spec.map((s: Record<string, string>) => `${s.event_type}: ${s.window_days}d`).join(", ");
                  } catch { /* use raw string */ }
                  return windowLabel;
                },
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Action Breakdowns */}
      {isExplicit("action_breakdowns") && actionBreakdowns.length === 0 && (
        <EmptyBlockState title="Action Breakdowns" />
      )}
      {show("action_breakdowns") && actionBreakdowns.length > 0 && (
        <SectionCard title="Action Breakdowns" subtitle="All tracked conversion actions">
          <DataTable<MetaActionBreakdown>
            data={actionBreakdowns}
            pageSize={0}
            columns={[
              { key: "actionType", label: "Action Type", render: (v) => (v as string).replace(/_/g, " ").replace(/\./g, " › ").replace(/\b\w/g, c => c.toUpperCase()) },
              { key: "value", label: "Count", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "costPerAction", label: "Cost Per Action", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
            ]}
          />
        </SectionCard>
      )}

      {/* Instant Experience */}
      {isExplicit("instant_experience") && instantExperience.length === 0 && (
        <EmptyBlockState title="Instant Experience" />
      )}
      {show("instant_experience") && instantExperience.length > 0 && (
        <SectionCard title="Instant Experience" subtitle="Canvas / instant experience engagement">
          <DataTable<MetaInstantExp>
            data={instantExperience}
            pageSize={0}
            columns={[
              { key: "adName", label: "Ad Name" },
              { key: "clicksToOpen", label: "Opens", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
              { key: "outboundClicks", label: "Outbound Clicks", align: "right", sortable: true, render: (v) => formatNumber(v as number) },
            ]}
          />
        </SectionCard>
      )}

      {/* Custom Conversions */}
      {isExplicit("custom_conversions") && customConversions.length === 0 && (
        <EmptyBlockState title="Custom Conversions" />
      )}
      {show("custom_conversions") && customConversions.length > 0 && (
        <SectionCard title="Custom Conversions" subtitle={`${customConversions.length} custom conversion${customConversions.length !== 1 ? "s" : ""} configured`}>
          <DataTable<MetaCustomConv>
            data={customConversions}
            pageSize={0}
            columns={[
              { key: "name", label: "Name" },
              { key: "customEventType", label: "Event Type", render: (v) => (v as string).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) },
              { key: "pixelRule", label: "Rule", render: (v) => <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240, display: "block" }}>{v as string}</span> },
            ]}
          />
        </SectionCard>
      )}

      {/* Saved & Custom Audiences */}
      {isExplicit("saved_audiences") && savedAudiences.length === 0 && (
        <EmptyBlockState title="Saved Audiences" />
      )}
      {show("saved_audiences") && savedAudiences.length > 0 && (
        <SectionCard title="Saved & Custom Audiences" subtitle={`${savedAudiences.length} audience${savedAudiences.length !== 1 ? "s" : ""} available`}>
          <DataTable<MetaSavedAud>
            data={savedAudiences}
            pageSize={0}
            columns={[
              { key: "name", label: "Audience Name" },
              { key: "type", label: "Type", render: (v) => (v as string).replace(/_/g, " ") },
              { key: "subtype", label: "Subtype", render: (v) => v ? (v as string).replace(/_/g, " ").toLowerCase() : "—" },
              { key: "approximateCount", label: "Approx. Size", align: "right", sortable: true, render: (v) => (v as number) > 0 ? formatNumber(v as number) : "—" },
            ]}
          />
        </SectionCard>
      )}

      {/* Campaign Spending Limits */}
      {isExplicit("spending_limits") && spendingLimits.length === 0 && (
        <EmptyBlockState title="Spending Limits" />
      )}
      {show("spending_limits") && spendingLimits.length > 0 && (
        <SectionCard title="Campaign Spending Limits" subtitle="Budget caps and current spend">
          <DataTable<MetaSpendLimit>
            data={spendingLimits}
            pageSize={0}
            exportable
            exportFilename="meta-spending-limits"
            columns={[
              { key: "campaignName", label: "Campaign" },
              { key: "spendingLimit", label: "Spend Cap", align: "right", sortable: true, render: (v) => v != null ? formatCurrency(v as number) : "—" },
              { key: "dailyBudget", label: "Daily Budget", align: "right", sortable: true, render: (v) => v != null ? formatCurrency(v as number) : "—" },
              { key: "lifetimeBudget", label: "Lifetime Budget", align: "right", sortable: true, render: (v) => v != null ? formatCurrency(v as number) : "—" },
              { key: "amountSpent", label: "Amount Spent", align: "right", sortable: true, render: (v) => formatCurrency(v as number) },
              {
                key: "_utilisation",
                label: "Utilisation",
                align: "right",
                render: (_, s) => {
                  const cap = s.spendingLimit ?? s.lifetimeBudget;
                  const util = cap && cap > 0 ? (s.amountSpent / cap) * 100 : null;
                  return util != null ? <span className={`font-semibold ${util >= 90 ? "text-red-600" : util >= 70 ? "text-amber-600" : "text-emerald-600"}`}>{util.toFixed(0)}%</span> : "—";
                },
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Hourly Performance */}
      {isExplicit("hourly_breakdown") && hourlyBreakdown.length === 0 && (
        <EmptyBlockState title="Hourly Breakdown" />
      )}
      {show("hourly_breakdown") && hourlyBreakdown.length > 0 && (() => {
        // Parse and sort by hour; format labels as 12-hour clock
        const parseHour = (raw: string) => {
          // Meta returns e.g. "0" or "00:00:00+00:00" or just an hour number string
          const h = parseInt(raw, 10);
          return isNaN(h) ? 0 : h % 24;
        };
        const formatHourLabel = (raw: string | number | null | undefined) => {
          if (raw === undefined || raw === null) return "";
          const h = parseHour(String(raw));
          if (h === 0) return "12am";
          if (h < 12) return `${h}am`;
          if (h === 12) return "12pm";
          return `${h - 12}pm`;
        };
        const hasConvValue = hourlyBreakdown.some((r) => r.conversionValue > 0);
        const sorted = [...hourlyBreakdown].sort((a, b) => parseHour(a.hourOfDay) - parseHour(b.hourOfDay));
        return (
          <SectionCard title="Hourly Performance" subtitle="Performance by hour of day (advertiser timezone)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sorted} barSize={12} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="hourOfDay"
                  {...CHART_AXIS_STYLE}
                  tickFormatter={formatHourLabel}
                  interval={1}
                />
                <YAxis yAxisId="spend" {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${v}`} width={52} />
                <YAxis yAxisId="clicks" orientation="right" {...CHART_AXIS_STYLE} width={36} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                  labelFormatter={formatHourLabel as (label: unknown) => string}
                  formatter={(value, name) => {
                    const num = typeof value === "number" ? value : Number(value ?? 0);
                    if (name === "Spend") return [formatCurrency(num), "Spend"];
                    if (name === "Conv. Value") return [formatCurrency(num), "Conv. Value"];
                    return [formatNumber(num), String(name)];
                  }}
                />
                <Bar {...CHART_BAR_STYLE} yAxisId="spend" dataKey="spend" fill="#ef4444" name="Spend" />
                <Bar {...CHART_BAR_STYLE} yAxisId="clicks" dataKey="clicks" fill="#3b82f6" name="Clicks" />
                <Bar {...CHART_BAR_STYLE} yAxisId="clicks" dataKey="conversions" fill="#10b981" name="Conversions" />
                {hasConvValue && (
                  <Bar {...CHART_BAR_STYLE} yAxisId="spend" dataKey="conversionValue" fill="#f59e0b" name="Conv. Value" />
                )}
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        );
      })()}

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setLightbox(null); }}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          tabIndex={-1}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white hover:text-[var(--text-3)] z-10"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            aria-label="Close lightbox"
          >
            <X className="h-8 w-8" />
          </button>

          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {lightbox.type === "video" ? (
              <video
                controls
                autoPlay
                className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl"
                src={
                  lightbox.videoId
                    ? `/api/meta/video?videoId=${encodeURIComponent(lightbox.videoId)}&clientId=${encodeURIComponent(clientId)}`
                    : lightbox.src
                }
              >
                <track kind="captions" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.src}
                alt={lightbox.title}
                className="max-w-[90vw] max-h-[85vh] rounded-lg shadow-2xl object-contain"
              />
            )}
            <p className="text-center text-white/80 text-sm mt-3 truncate max-w-[90vw]">
              {lightbox.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
