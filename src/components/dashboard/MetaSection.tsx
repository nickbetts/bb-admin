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
import { SectionCard, LoadingSpinner, Delta } from "@/components/ui/index";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_AREA_STYLE, CHART_BAR_STYLE } from "@/lib/chart-config";
import { formatNumber, formatCurrency, formatPercent, formatDateDisplay, getPreviousPeriod, pctChange } from "@/lib/utils";
import { DollarSign, MousePointer, Eye, TrendingUp, AlertTriangle, ChevronRight, ChevronDown, Play, Image, Layers, X } from "lucide-react";
import { AiInsightsPanel } from "@/components/ai/AiInsightsPanel";
import { AiLandingPageAnalysis } from "@/components/ai/AiLandingPageAnalysis";
import { SuperSummary } from "@/components/ai/SuperSummary";
import { CreativeIntelligencePanel } from "./CreativeIntelligencePanel";
import { ClickFraudPanel } from "./ClickFraudPanel";

interface MetaSectionProps {
  clientId: string;
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
interface MetaHourlyRow { hourOfDay: string; impressions: number; clicks: number; spend: number; conversions: number; cpc: number }

export function MetaSection({ clientId, clientName, startDate, endDate, compareStartDate, compareEndDate, crossPlatformContext, visibleBlocks, hideAlerts, hideAi, reportMode, clickFraudToken, onMetricsReady, onPreviousMetricsReady, afterHeader }: MetaSectionProps) {
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
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
    return alerts;
  }, [campaignsEnriched, adSets, creatives, adSetAudiences]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Paid Social</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ad performance data via Meta Ads</p>
        </div>
        <span className="text-sm text-slate-400">
          {formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}
        </span>
      </div>

      {afterHeader}

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
                        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 500 }}>Name</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Spend</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Impressions</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Purchases</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Value</th>
                              <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-3)", fontWeight: 500 }}>ROAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campAdSets.map((as) => {
                              const asCreativesCount = (creativesByAdSet.get(as.id) ?? []).length;
                              const asValue = as.roas * as.spend;
                              return (
                                <tr key={as.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                  <td style={{ padding: "10px 0" }}>
                                    <p style={{ fontWeight: 600, color: "var(--text)" }}>{as.name}</p>
                                    <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{[as.optimizationGoal || as.status, asCreativesCount > 0 ? `${asCreativesCount} ad${asCreativesCount !== 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}</p>
                                  </td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatCurrency(as.spend)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(as.impressions)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(as.clicks)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(as.conversions)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatCurrency(asValue)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 0", whiteSpace: "nowrap" }}>
                                    <span style={{ fontWeight: 700, color: as.roas >= 2 ? "#10b981" : as.roas >= 1 ? "#f59e0b" : "#ef4444" }}>{as.roas.toFixed(2)}x</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Creatives / Ads */}
                    {campCreatives.length > 0 && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>Ads</p>
                        <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-3)", fontWeight: 500 }}>Ad</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Spend</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Impressions</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Clicks</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Purchases</th>
                              <th style={{ textAlign: "right", padding: "8px 12px", color: "var(--text-3)", fontWeight: 500 }}>Value</th>
                              <th style={{ textAlign: "right", padding: "8px 0", color: "var(--text-3)", fontWeight: 500 }}>ROAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campCreatives.map((cr) => {
                              const crValue = cr.roas * cr.spend;
                              return (
                                <tr key={cr.adId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                  <td style={{ padding: "10px 0" }}>
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
                                  </td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatCurrency(cr.spend)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(cr.impressions)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(cr.clicks)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatNumber(cr.conversions)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 12px", color: "var(--text-2)", whiteSpace: "nowrap" }}>{formatCurrency(crValue)}</td>
                                  <td style={{ textAlign: "right", padding: "10px 0", whiteSpace: "nowrap" }}>
                                    <span style={{ fontWeight: 700, color: cr.roas >= 2 ? "#10b981" : cr.roas >= 1 ? "#f59e0b" : "#ef4444" }}>{cr.roas.toFixed(2)}x</span>
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
              <table className="w-full text-xs" style={{ minWidth: 1080 }}>
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                    <th className="text-left px-6 py-4 font-medium" style={{ minWidth: 240 }}>Name</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">Spend</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">Impressions</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">Clicks</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">CTR</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">CPC</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">CPM</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">{overview?.conversionLabel ?? "Conv."}</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">CPA</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">ROAS</th>
                    <th className="text-right px-4 py-4 font-medium whitespace-nowrap">Freq.</th>
                    <th className="text-right px-6 py-4 font-medium whitespace-nowrap">Budget</th>
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
                          <td className="px-6 py-4" style={{ minWidth: 240 }}>
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
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            <div>{formatCurrency(camp.spend)}</div>
                            <Delta current={camp.spend} previous={prevC?.spend} format="currency" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            <div>{formatNumber(camp.impressions)}</div>
                            <Delta current={camp.impressions} previous={prevC?.impressions} format="count" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            <div>{formatNumber(camp.clicks)}</div>
                            <Delta current={camp.clicks} previous={prevC?.clicks} format="count" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            {camp.ctr.toFixed(2)}%
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            {formatCurrency(camp.cpc)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            {formatCurrency(camp.cpm)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            <div>{formatNumber(camp.conversions)}</div>
                            <Delta current={camp.conversions} previous={prevC?.conversions} format="count" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            {camp.conversions > 0 ? formatCurrency(camp.spend / camp.conversions) : "—"}
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <span className={`font-semibold ${camp.roas >= 2 ? "text-emerald-600" : camp.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                              {camp.roas.toFixed(2)}x
                            </span>
                            <Delta current={camp.roas} previous={prevC?.roas} format="none" />
                          </td>
                          <td className="px-4 py-4 text-right text-slate-600 whitespace-nowrap">
                            {typeof enriched.frequency === "number" ? enriched.frequency.toFixed(2) : "—"}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 whitespace-nowrap">
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
                                <td className="py-3" style={{ paddingLeft: 48 }}>
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
                                        {adSet.optimizationGoal || adSet.status}
                                        {asCreatives.length > 0 && ` · ${asCreatives.length} ad${asCreatives.length > 1 ? "s" : ""}`}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatCurrency(adSet.spend)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatNumber(adSet.impressions)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatNumber(adSet.clicks)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{adSet.ctr.toFixed(2)}%</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatCurrency(adSet.cpc)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatCurrency(adSet.cpm)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatNumber(adSet.conversions)}</td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">
                                  {adSet.conversions > 0 ? formatCurrency(adSet.spend / adSet.conversions) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <span className={`font-semibold text-[11px] ${adSet.roas >= 2 ? "text-emerald-600" : adSet.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                                    {adSet.roas.toFixed(2)}x
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">
                                  {adSet.frequency > 0 ? adSet.frequency.toFixed(2) : "—"}
                                </td>
                                <td className="px-6 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">
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
                                  <td className="py-3" style={{ paddingLeft: 72 }}>
                                    <div className="flex items-center gap-3">
                                      {/* Thumbnail — click to open lightbox */}
                                      <button
                                        type="button"
                                        className="relative shrink-0 rounded-md overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
                                        style={{ width: 56, height: 56, background: "#f8fafc" }}
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
                                            <Image className="h-4 w-4 text-slate-300" />
                                          </div>
                                        )}
                                        {cr.mediaType === "VIDEO" && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Play className="h-4 w-4 text-white" fill="white" />
                                          </div>
                                        )}
                                      </button>
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
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatCurrency(cr.spend)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatNumber(cr.impressions)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatNumber(cr.clicks)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{cr.ctr.toFixed(2)}%</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatCurrency(cr.cpc)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatCurrency(cr.cpm)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">{formatNumber(cr.conversions)}</td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">
                                    {cr.conversions > 0 ? formatCurrency(cr.costPerConversion) : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <span className={`font-semibold text-[11px] ${cr.roas >= 2 ? "text-emerald-600" : cr.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>
                                      {cr.roas.toFixed(2)}x
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">
                                    {cr.frequency > 0 ? cr.frequency.toFixed(2) : "—"}
                                  </td>
                                  <td className="px-6 py-3 text-right text-slate-400 text-[11px] whitespace-nowrap">
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
      {show("lead_forms") && leadForms.length > 0 && (
        <SectionCard title="Lead Form Performance" subtitle={`${leadForms.length} form${leadForms.length !== 1 ? "s" : ""} with lead data`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 520 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Form Name</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Leads</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Cost per Lead</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leadForms.map((form) => (
                  <tr key={form.formId} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{form.formName}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(form.leads)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(form.costPerLead)}</td>
                    <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(form.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Ad Relevance Diagnostics */}
      {show("relevance") && relevanceDiagnostics.length > 0 && (
        <SectionCard title="Ad Relevance Diagnostics" subtitle="Quality, engagement, and conversion ranking per ad">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Ad Name</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Quality</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Engagement</th>
                  <th className="text-center px-4 py-3 font-medium whitespace-nowrap">Conversion</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Impressions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {relevanceDiagnostics.map((ad, idx) => {
                  const rankBadge = (rank: string | undefined | null) => {
                    const r = rank ?? "UNKNOWN";
                    const label = r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                    const cls = r === "ABOVE_AVERAGE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : r === "AVERAGE"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : r === "BELOW_AVERAGE"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-slate-50 text-slate-500 border-slate-200";
                    return (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
                        {label}
                      </span>
                    );
                  };
                  return (
                    <tr key={`${ad.adName}-${idx}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 text-slate-800 font-medium">{ad.adName}</td>
                      <td className="px-4 py-3 text-center">{rankBadge(ad.qualityRanking)}</td>
                      <td className="px-4 py-3 text-center">{rankBadge(ad.engagementRateRanking)}</td>
                      <td className="px-4 py-3 text-center">{rankBadge(ad.conversionRateRanking)}</td>
                      <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(ad.impressions)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Placement Breakdown */}
      {show("placements") && placements.length > 0 && (
        <SectionCard title="Placement Breakdown" subtitle={`Performance across ${placements.length} placement${placements.length !== 1 ? "s" : ""}`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 800 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Platform</th>
                  <th className="text-left px-4 py-3 font-medium">Placement</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Spend</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Impressions</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">CTR</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">CPC</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Conv.</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {placements.map((p, i) => (
                  <tr key={`${p.publisherPlatform}-${p.placement}-${i}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium capitalize">{p.publisherPlatform}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{p.placement.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(p.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(p.impressions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(p.clicks)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{p.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(p.cpc)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(p.conversions)}</td>
                    <td className="px-6 py-3 text-right whitespace-nowrap">
                      <span className={`font-semibold ${p.roas >= 2 ? "text-emerald-600" : p.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>{p.roas.toFixed(2)}x</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Audience Targeting */}
      {show("audiences") && adSetAudiences.length > 0 && (
        <SectionCard title="Audience Targeting" subtitle={`Targeting details for ${adSetAudiences.length} ad set${adSetAudiences.length !== 1 ? "s" : ""}`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 700 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Ad Set</th>
                  <th className="text-left px-4 py-3 font-medium">Age</th>
                  <th className="text-left px-4 py-3 font-medium">Gender</th>
                  <th className="text-left px-4 py-3 font-medium">Location</th>
                  <th className="text-left px-4 py-3 font-medium">Interests</th>
                  <th className="text-left px-6 py-3 font-medium">Custom Audiences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {adSetAudiences.map((aud) => (
                  <tr key={aud.adSetId} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{aud.adSetName}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{aud.ageMin != null && aud.ageMax != null ? `${aud.ageMin}–${aud.ageMax}` : "All"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{aud.genders.length === 1 ? (aud.genders[0] === 1 ? "Male" : "Female") : "All"}</td>
                    <td className="px-4 py-3 text-slate-600">{aud.geoSummary || "All locations"}</td>
                    <td className="px-4 py-3 text-slate-600">{aud.interests.length > 0 ? aud.interests.slice(0, 3).join(", ") + (aud.interests.length > 3 ? ` +${aud.interests.length - 3}` : "") : "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{aud.customAudiences.length > 0 ? aud.customAudiences.map(c => c.name).join(", ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Demographics */}
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
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table className="w-full text-xs" style={{ minWidth: 600 }}>
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                    <th className="text-left px-6 py-3 font-medium">Age</th>
                    <th className="text-left px-4 py-3 font-medium">Gender</th>
                    <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Spend</th>
                    <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Impressions</th>
                    <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Clicks</th>
                    <th className="text-right px-4 py-3 font-medium whitespace-nowrap">CTR</th>
                    <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Conv.</th>
                    <th className="text-right px-6 py-3 font-medium whitespace-nowrap">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {demographicsData.map((d, i) => (
                    <tr key={`${d.age}-${d.gender}-${i}`} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 text-slate-800 font-medium">{d.age}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{d.gender}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(d.spend)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(d.impressions)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(d.clicks)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{d.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(d.conversions)}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <span className={`font-semibold ${d.roas >= 2 ? "text-emerald-600" : d.roas >= 1 ? "text-amber-600" : "text-red-600"}`}>{d.roas.toFixed(2)}x</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        );
      })()}

      {/* Frequency Distribution */}
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

      {/* Cost Per Action */}
      {show("cost_per_action") && costPerAction.length > 0 && (
        <SectionCard title="Cost Per Action" subtitle="Breakdown by action type">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 400 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Action Type</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Count</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Cost Per Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {costPerAction.map((a) => (
                  <tr key={a.actionType} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{a.actionType.replace(/_/g, " ").replace(/\./g, " › ").replace(/\b\w/g, c => c.toUpperCase())}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(a.value)}</td>
                    <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(a.costPerAction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Product Performance */}
      {show("product_performance") && productPerformance.length > 0 && (
        <SectionCard title="Product Performance" subtitle={`${productPerformance.length} product${productPerformance.length !== 1 ? "s" : ""} with ad data`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 700 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Product</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Spend</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Impressions</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Purchases</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {productPerformance.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{p.productName}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(p.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(p.impressions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(p.clicks)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(p.purchases)}</td>
                    <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(p.purchaseValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Country Breakdown */}
      {show("country_breakdown") && countryBreakdown.length > 0 && (
        <SectionCard title="Country Breakdown" subtitle={`Performance across ${countryBreakdown.length} ${countryBreakdown.length !== 1 ? "countries" : "country"}`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 600 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Country</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Spend</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Impressions</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Clicks</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">CTR</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">CPC</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {countryBreakdown.map((c) => (
                  <tr key={c.country} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{c.country}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(c.spend)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(c.impressions)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(c.clicks)}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{c.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(c.cpc)}</td>
                    <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(c.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Attribution Settings */}
      {show("attribution") && attributionSettings.length > 0 && (
        <SectionCard title="Attribution Settings" subtitle="Attribution windows per ad set">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 500 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium">Ad Set</th>
                  <th className="text-left px-6 py-3 font-medium">Attribution Window</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attributionSettings.map((a) => {
                  let windowLabel = a.attributionSpec;
                  try {
                    const spec = JSON.parse(a.attributionSpec);
                    if (Array.isArray(spec)) windowLabel = spec.map((s: Record<string, string>) => `${s.event_type}: ${s.window_days}d`).join(", ");
                  } catch { /* use raw string */ }
                  return (
                    <tr key={a.adSetId} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 text-slate-600">{a.campaignName}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{a.adSetName}</td>
                      <td className="px-6 py-3 text-slate-600">{windowLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Action Breakdowns */}
      {show("action_breakdowns") && actionBreakdowns.length > 0 && (
        <SectionCard title="Action Breakdowns" subtitle="All tracked conversion actions">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 400 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Action Type</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Count</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Cost Per Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {actionBreakdowns.map((a) => (
                  <tr key={a.actionType} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{a.actionType.replace(/_/g, " ").replace(/\./g, " › ").replace(/\b\w/g, c => c.toUpperCase())}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(a.value)}</td>
                    <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(a.costPerAction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Instant Experience */}
      {show("instant_experience") && instantExperience.length > 0 && (
        <SectionCard title="Instant Experience" subtitle="Canvas / instant experience engagement">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 480 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Ad Name</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Opens</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Outbound Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {instantExperience.map((ie) => (
                  <tr key={ie.adId} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{ie.adName}</td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(ie.clicksToOpen)}</td>
                    <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{formatNumber(ie.outboundClicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Custom Conversions */}
      {show("custom_conversions") && customConversions.length > 0 && (
        <SectionCard title="Custom Conversions" subtitle={`${customConversions.length} custom conversion${customConversions.length !== 1 ? "s" : ""} configured`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 480 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Event Type</th>
                  <th className="text-left px-6 py-3 font-medium">Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customConversions.map((cc) => (
                  <tr key={cc.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{cc.name}</td>
                    <td className="px-4 py-3 text-slate-600">{cc.customEventType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</td>
                    <td className="px-6 py-3 text-slate-500 text-[10px] font-mono truncate max-w-[240px]">{cc.pixelRule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Saved & Custom Audiences */}
      {show("saved_audiences") && savedAudiences.length > 0 && (
        <SectionCard title="Saved & Custom Audiences" subtitle={`${savedAudiences.length} audience${savedAudiences.length !== 1 ? "s" : ""} available`}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 520 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Audience Name</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Subtype</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Approx. Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {savedAudiences.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 text-slate-800 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{a.type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{a.subtype ? a.subtype.replace(/_/g, " ").toLowerCase() : "—"}</td>
                    <td className="px-6 py-3 text-right text-slate-600 whitespace-nowrap">{a.approximateCount > 0 ? formatNumber(a.approximateCount) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Campaign Spending Limits */}
      {show("spending_limits") && spendingLimits.length > 0 && (
        <SectionCard title="Campaign Spending Limits" subtitle="Budget caps and current spend">
          <div style={{ overflowX: "auto" }}>
            <table className="w-full text-xs" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium">Campaign</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Spend Cap</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Daily Budget</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Lifetime Budget</th>
                  <th className="text-right px-4 py-3 font-medium whitespace-nowrap">Amount Spent</th>
                  <th className="text-right px-6 py-3 font-medium whitespace-nowrap">Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {spendingLimits.map((s) => {
                  const cap = s.spendingLimit ?? s.lifetimeBudget;
                  const util = cap && cap > 0 ? (s.amountSpent / cap) * 100 : null;
                  return (
                    <tr key={s.campaignId} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 text-slate-800 font-medium">{s.campaignName}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{s.spendingLimit != null ? formatCurrency(s.spendingLimit) : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{s.dailyBudget != null ? formatCurrency(s.dailyBudget) : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{s.lifetimeBudget != null ? formatCurrency(s.lifetimeBudget) : "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrency(s.amountSpent)}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        {util != null ? (
                          <span className={`font-semibold ${util >= 90 ? "text-red-600" : util >= 70 ? "text-amber-600" : "text-emerald-600"}`}>{util.toFixed(0)}%</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Hourly Performance */}
      {show("hourly_breakdown") && hourlyBreakdown.length > 0 && (
        <SectionCard title="Hourly Performance" subtitle="Performance by hour of day">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyBreakdown} barSize={16}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="hourOfDay" {...CHART_AXIS_STYLE} tickFormatter={(v) => `${v}:00`} />
              <YAxis yAxisId="spend" {...CHART_AXIS_STYLE} tickFormatter={(v) => `£${v}`} width={50} />
              <YAxis yAxisId="clicks" orientation="right" {...CHART_AXIS_STYLE} width={40} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE.contentStyle} labelFormatter={(v) => `${v}:00`} />
              <Bar {...CHART_BAR_STYLE} yAxisId="spend" dataKey="spend" fill="#ef4444" name="Spend" />
              <Bar {...CHART_BAR_STYLE} yAxisId="clicks" dataKey="clicks" fill="#3b82f6" name="Clicks" />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

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
            className="absolute top-4 right-4 text-white hover:text-slate-300 z-10"
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
