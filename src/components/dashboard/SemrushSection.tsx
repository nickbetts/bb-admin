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
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { SectionLoading } from "@/components/dashboard/shared/SectionLoading";
import { SectionError } from "@/components/dashboard/shared/SectionError";
import { EmptyBlockState } from "@/components/dashboard/shared/EmptyBlockState";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_AREA_STYLE, CHART_BAR_STYLE } from "@/lib/chart-config";
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
import { DataTable } from "@/components/ui/DataTable";

interface SemrushSectionProps {
  domain: string;
  projectId?: number | null;
  campaignIds?: string[] | null;
  startDate: string;
  endDate: string;
  crossPlatformContext?: string;
  visibleBlocks?: string[];
  hiddenCards?: Record<string, string[]>;
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
  isClient?: boolean;
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

export function SemrushSection({ domain, projectId, campaignIds, startDate, endDate, crossPlatformContext, visibleBlocks, hiddenCards, hideAlerts, hideAi, onMetricsReady, afterHeader }: SemrushSectionProps) {
  // Derive a stable primitive so the data-fetch effect doesn't re-fire when
  // the caller passes a new array *reference* on every render (e.g. inline IIFE).
  const campaignIdsKey = campaignIds?.join(",") ?? "";
  const show = (block: string) => !visibleBlocks || visibleBlocks.length === 0 || visibleBlocks.includes(block);
  const showCard = (blockId: string, cardId: string) => !hiddenCards?.[blockId]?.includes(cardId);
  const isExplicit = (block: string) => Array.isArray(visibleBlocks) && visibleBlocks.includes(block);
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
  const [topicResearch, setTopicResearch] = useState<{ topic: string; volume: number; difficulty: number; topicEfficiency: number; subtopics: { headline: string; questions: string[] }[] } | null>(null);
  const [siteAudit, setSiteAudit] = useState<{ totalPages: number; healthScore: number; errors: number; warnings: number; notices: number; issues: { title: string; severity: string; count: number }[] } | null>(null);
  const [adCopyIntelligence, setAdCopyIntelligence] = useState<Array<{ title: string; description: string; url: string; keyword: string; position: number; trafficPercent: number }>>([]);
  const [displayAdvertising, setDisplayAdvertising] = useState<Array<{ domain: string; displayAds: number; displayTraffic: number; displayCost: number }>>([]);
  const [shoppingCompetitors, setShoppingCompetitors] = useState<Array<{ domain: string; shoppingKeywords: number; shoppingTraffic: number; shoppingCost: number }>>([]);
  const [keywordTrends, setKeywordTrends] = useState<Array<{ keyword: string; searchVolume: number; trend: string; cpc: number; competition: number }>>([]);
  const [referringDomains, setReferringDomains] = useState<Array<{ domain: string; backlinks: number; ipAddress: string; country: string; firstSeen: string; lastSeen: string }>>([]);
  const [anchorText, setAnchorText] = useState<Array<{ anchor: string; domains: number; backlinks: number; firstSeen: string; lastSeen: string }>>([]);
  const [backlinkComparison, setBacklinkComparison] = useState<Array<{ domain: string; ascore: number; totalBacklinks: number; referringDomains: number; followLinks: number; nofollowLinks: number }>>([]);
  const [positionChanges, setPositionChanges] = useState<Array<{ keyword: string; previousPosition: number; currentPosition: number; change: number; searchVolume: number; url: string }>>([]);

  const competitorRows = useMemo<Competitor[]>(() => {
    const normaliseDomain = (value: string) => value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*/, "");
    const clientDomain = normaliseDomain(domain);
    const competitorOnly = competitors.filter((c) => normaliseDomain(c.domain) !== clientDomain);

    if (!overview) return competitorOnly;

    const clientRow: Competitor = {
      domain,
      commonKeywords: 0,
      organicKeywords: overview.organicKeywords,
      organicTraffic: overview.organicTraffic,
      organicCost: overview.organicCost,
      adKeywords: overview.paidKeywords,
      isClient: true,
    };

    return [clientRow, ...competitorOnly.map((c) => ({ ...c, isClient: false }))];
  }, [competitors, domain, overview]);

  // ── Tagged keyword positions state ─────────────────────────
  interface TaggedKeyword {
    keyword: string;
    tags: string[];
    currentPosition: number | null;
    delta: number | null;
    searchVolume: number;
    intent: string | null;
    estTraffic: number | null;
    shareOfVoice: number | null;
    serpFeatures: string[];
    ownedFeatures: string[];
    url: string;
  }
  const [taggedKeywords, setTaggedKeywords] = useState<TaggedKeyword[]>([]);
  const [taggedKwError, setTaggedKwError] = useState<string | null>(null);
  // Tag filter — persisted to URL so PDF export mirrors the active filter
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("semrush_tag");
  });
  const [showUnranked, setShowUnranked] = useState(false);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    taggedKeywords.forEach((kw) => kw.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [taggedKeywords]);

  const visibleTaggedKws = useMemo(() => {
    let kws = showUnranked ? taggedKeywords : taggedKeywords.filter((kw) => kw.currentPosition != null);
    if (activeTagFilter) kws = kws.filter((kw) => kw.tags.includes(activeTagFilter));
    return kws;
  }, [taggedKeywords, activeTagFilter, showUnranked]);

  function setTagFilter(tag: string | null) {
    setActiveTagFilter(tag);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (tag) params.set("semrush_tag", tag); else params.delete("semrush_tag");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }
  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const fetchList: Promise<Response | null>[] = [
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
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=topic-research`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=site-audit`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=ad-copy`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=display-advertising`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=shopping-competitors`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=keyword-trends`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=referring-domains`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=anchor-text`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=backlink-comparison`, { signal: controller.signal }).catch(() => null),
          fetch(`/api/semrush?domain=${encodeURIComponent(domain)}&type=position-changes`, { signal: controller.signal }).catch(() => null),
        ];
        const activeCampaignId = campaignIds?.[0] ?? null;
        const fmtYMD = (d: string) => d.replace(/-/g, "");
        if (activeCampaignId) {
          fetchList.push(fetch(`/api/semrush?type=project-keywords&campaignId=${encodeURIComponent(activeCampaignId)}`, { signal: controller.signal }));
          fetchList.push(fetch(`/api/semrush?type=ai-visibility&campaignId=${encodeURIComponent(activeCampaignId)}`, { signal: controller.signal }));
          fetchList.push(fetch(`/api/semrush?type=tagged-positions&campaignId=${encodeURIComponent(activeCampaignId)}&domain=${encodeURIComponent(domain)}&period=custom&dateBegin=${fmtYMD(startDate)}&dateEnd=${fmtYMD(endDate)}`, { signal: controller.signal }).catch(() => null));
        } else if (projectId) {
          // Legacy fallback — no campaign ID configured, show empty tracked data
          fetchList.push(Promise.resolve(new Response(JSON.stringify([]), { status: 200 })));
          fetchList.push(Promise.resolve(new Response(JSON.stringify({ totalTracked: 0, aiOverviewKeywords: 0, brandCitations: 0, aiVisibilityScore: 0, keywords: [] }), { status: 200 })));
          fetchList.push(Promise.resolve(null));
        }
        const [overviewRes, keywordsRes, rankMoversRes, historyRes, distRes, competitorsRes, backlinksRes, contentGapRes, serpFeaturesRes, backlinkChangesRes, topicResRes, siteAuditRes, adCopyRes, displayAdvRes, shoppingCompRes, kwTrendsRes, refDomainsRes, anchorTextRes, blCompRes, posChangesRes, trackedRes, aiVisRes, taggedRes] = await Promise.all(fetchList);

        if (!overviewRes || !overviewRes.ok) {
          const err = overviewRes ? await overviewRes.json() : { error: "Failed to fetch overview" };
          if (err.error === "semrush_no_units") {
            throw new Error("SEMrush API unit balance is zero. Top up units to restore data.");
          }
          throw new Error(err.error ?? "Failed to fetch SemRush data");
        }

        const [ov, kw, movers, hist, dist, comps, bls] = await Promise.all([
          overviewRes.json(),
          keywordsRes!.json(),
          rankMoversRes!.ok ? rankMoversRes!.json() : Promise.resolve([]),
          historyRes!.json(),
          distRes!.json(),
          competitorsRes!.ok ? competitorsRes!.json() : Promise.resolve([]),
          backlinksRes!.ok ? backlinksRes!.json() : backlinksRes!.json().then(e => { setBacklinkError(e.error ?? "Failed to load backlinks"); return []; }).catch(() => []),
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
          const sfRaw = await serpFeaturesRes.json();
          if (Array.isArray(sfRaw) && sfRaw.length > 0) {
            // Aggregate per-keyword features into { feature, count, percentage }
            const featureCounts: Record<string, number> = {};
            const total = sfRaw.length;
            for (const item of sfRaw) {
              const feats = Array.isArray(item.features) ? item.features : [];
              for (const f of feats) {
                if (f) featureCounts[f] = (featureCounts[f] || 0) + 1;
              }
            }
            const aggregated = Object.entries(featureCounts)
              .map(([feature, count]) => ({ feature, count, percentage: (count / total) * 100 }))
              .sort((a, b) => b.count - a.count);
            setSerpFeatures(aggregated);
          } else {
            setSerpFeatures([]);
          }
        }
        if (backlinkChangesRes?.ok) {
          const bc = await backlinkChangesRes.json();
          setBacklinkChanges(Array.isArray(bc) ? bc : []);
        }

        if (trackedRes?.ok) {
          const tracked = await trackedRes.json();
          setTrackedKeywords(Array.isArray(tracked) ? tracked : []);
        }

        // Parse new block data
        if (topicResRes?.ok) {
          const tr = await topicResRes.json().catch(() => null);
          if (tr && typeof tr === "object") setTopicResearch(tr);
        }
        if (siteAuditRes?.ok) {
          const sa = await siteAuditRes.json().catch(() => null);
          if (sa && typeof sa === "object") setSiteAudit(sa);
        }
        if (adCopyRes?.ok) {
          const ac = await adCopyRes.json().catch(() => []);
          setAdCopyIntelligence(Array.isArray(ac) ? ac : []);
        }
        if (displayAdvRes?.ok) {
          const da = await displayAdvRes.json().catch(() => []);
          setDisplayAdvertising(Array.isArray(da) ? da : []);
        }
        if (shoppingCompRes?.ok) {
          const sc = await shoppingCompRes.json().catch(() => []);
          setShoppingCompetitors(Array.isArray(sc) ? sc : []);
        }
        if (kwTrendsRes?.ok) {
          const kt = await kwTrendsRes.json().catch(() => []);
          setKeywordTrends(Array.isArray(kt) ? kt : []);
        }
        if (refDomainsRes?.ok) {
          const rd = await refDomainsRes.json().catch(() => []);
          setReferringDomains(Array.isArray(rd) ? rd : []);
        }
        if (anchorTextRes?.ok) {
          const at = await anchorTextRes.json().catch(() => []);
          setAnchorText(Array.isArray(at) ? at : []);
        }
        if (blCompRes?.ok) {
          const bc2 = await blCompRes.json().catch(() => []);
          setBacklinkComparison(Array.isArray(bc2) ? bc2 : []);
        }
        if (posChangesRes?.ok) {
          const pc = await posChangesRes.json().catch(() => []);
          setPositionChanges(Array.isArray(pc) ? pc : []);
        }
        if (aiVisRes?.ok) {
          const aiv = await aiVisRes.json();
          if (aiv && typeof aiv.totalTracked === "number") setAiVisibility(aiv);
        }

        if (taggedRes?.ok) {
          const tagged = await taggedRes.json().catch(() => []);
          setTaggedKeywords(Array.isArray(tagged) ? tagged : []);
        } else if (taggedRes && !taggedRes.ok) {
          const e = await taggedRes.json().catch(() => ({})) as { error?: string };
          setTaggedKwError(e.error ?? "Failed to load keyword rankings");
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
  }, [domain, projectId, campaignIdsKey, startDate, endDate]);

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
      <SectionHeader
        title="SEO Performance"
        subtitle="Via SEMrush"
        icon={TrendingUp}
        iconColor="#ff642d"
        actions={<span style={{ fontSize: 13, color: "var(--text-3)" }}>{formatDateDisplay(startDate)} – {formatDateDisplay(endDate)}</span>}
      />

      {afterHeader}

      {loading ? (
        <SectionLoading color="#ff642d" message="Loading SEMrush data…" />
      ) : error ? (
        <SectionError message={error} />
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
        {showCard("kpis", "organic_traffic") && <MetricCard
          title="Organic Traffic"
          value={formatNumber(overview.organicTraffic)}
          subtitle="Monthly visits"
          change={history.length >= 2 ? pctChange(history[history.length - 1].organicTraffic, history[history.length - 2].organicTraffic) : undefined}
          changeDiff={history.length >= 2 ? diffStr(history[history.length - 1].organicTraffic, history[history.length - 2].organicTraffic, "count") : undefined}
          changeLabel="vs prev month"
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />}
        {showCard("kpis", "organic_keywords") && <MetricCard
          title="Organic Keywords"
          value={formatNumber(overview.organicKeywords)}
          subtitle="Ranking keywords"
          change={history.length >= 2 ? pctChange(history[history.length - 1].organicKeywords, history[history.length - 2].organicKeywords) : undefined}
          changeDiff={history.length >= 2 ? diffStr(history[history.length - 1].organicKeywords, history[history.length - 2].organicKeywords, "count") : undefined}
          changeLabel="vs prev month"
          icon={<Search className="h-5 w-5" />}
          color="blue"
        />}
        {showCard("kpis", "traffic_value") && <MetricCard
          title="Traffic Value"
          value={formatCurrency(overview.organicCost)}
          subtitle="Equivalent PPC value"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />}
      </div>
      )}

      {/* Domain Authority (config-gated — only shows if Moz key is set) */}
      {show("kpis") && domainAuthority && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {showCard("kpis", "domain_authority") && <MetricCard
            title="Domain Authority"
            value={domainAuthority.domainAuthority}
            subtitle="Moz DA score (0–100)"
            color="purple"
          />}
          {showCard("kpis", "page_authority") && <MetricCard
            title="Page Authority"
            value={domainAuthority.pageAuthority}
            subtitle="Moz PA score (0–100)"
            color="blue"
          />}
          {showCard("kpis", "linking_root_domains") && <MetricCard
            title="Linking Root Domains"
            value={formatNumber(domainAuthority.rootDomainsLinking)}
            subtitle="Unique domains linking"
            color="green"
          />}
          {showCard("kpis", "spam_score") && <MetricCard
            title="Spam Score"
            value={`${domainAuthority.spamScore}%`}
            subtitle="Higher = riskier"
            color={domainAuthority.spamScore > 30 ? "red" : "orange"}
          />}
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
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis
                dataKey="date"
                {...CHART_AXIS_STYLE}
                tickFormatter={(v: string) => v.slice(0, 7)}
              />
              <YAxis {...CHART_AXIS_STYLE} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                labelStyle={CHART_TOOLTIP_STYLE.labelStyle}
                formatter={(value) => [formatNumber(Number(value)), "Traffic"]}
              />
              <Area {...CHART_AREA_STYLE} dataKey="organicTraffic" stroke="#6366f1" fill="url(#trafficGrad)" />
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
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis dataKey="range" {...CHART_AXIS_STYLE} />
                <YAxis {...CHART_AXIS_STYLE} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                  labelStyle={CHART_TOOLTIP_STYLE.labelStyle}
                />
                <Bar {...CHART_BAR_STYLE} dataKey="count">
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
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="date"
                  {...CHART_AXIS_STYLE}
                  tickFormatter={(v: string) => v.slice(0, 7)}
                />
                <YAxis {...CHART_AXIS_STYLE} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE.contentStyle}
                  labelStyle={CHART_TOOLTIP_STYLE.labelStyle}
                  formatter={(value) => [formatNumber(Number(value)), "Keywords"]}
                />
                <Area {...CHART_AREA_STYLE} dataKey="organicKeywords" stroke="#10b981" fill="url(#kwGrad)" />
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
          <DataTable<Keyword>
            data={keywords}
            searchable
            exportable
            exportFilename="top-organic-keywords"
            pageSize={20}
            columns={[
              {
                key: "keyword",
                label: "Keyword",
                render: (_v, row) => (
                  <div>
                    <p className="text-[var(--text)] font-medium truncate max-w-[200px]">{row.keyword}</p>
                    <p className="text-xs text-[var(--text-3)] truncate max-w-[200px]">{row.url}</p>
                  </div>
                ),
              },
              {
                key: "position",
                label: "Position",
                align: "center",
                sortable: true,
                render: (_v, row) => (
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                    row.position <= 3 ? "bg-emerald-50 text-emerald-700" :
                    row.position <= 10 ? "bg-blue-50 text-blue-700" :
                    row.position <= 20 ? "bg-amber-50 text-amber-700" : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                  }`}>{row.position}</span>
                ),
              },
              {
                key: "previousPosition",
                label: "Change",
                align: "center",
                render: (_v, row) => {
                  const change = row.previousPosition - row.position;
                  if (change > 0) return <span className="flex items-center justify-center gap-0.5 text-xs text-emerald-600"><CssArrowUp />{change}</span>;
                  if (change < 0) return <span className="flex items-center justify-center gap-0.5 text-xs text-red-600"><CssArrowDown />{Math.abs(change)}</span>;
                  return <span className="flex items-center justify-center text-[var(--text-3)]"><CssMinus /></span>;
                },
              },
              {
                key: "searchVolume",
                label: "Volume",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.searchVolume),
              },
              {
                key: "trafficPercent",
                label: "Traffic %",
                align: "right",
                sortable: true,
                render: (_v, row) => `${row.trafficPercent.toFixed(1)}%`,
              },
            ]}
          />
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
            <DataTable<Keyword>
              data={rankMovers}
              searchable
              pageSize={20}
              columns={[
                {
                  key: "keyword",
                  label: "Keyword",
                  render: (_v, row) => (
                    <div>
                      <p className="text-[var(--text)] font-medium truncate max-w-[200px]">{row.keyword}</p>
                      <p className="text-xs text-[var(--text-3)] truncate max-w-[200px]">{row.url}</p>
                    </div>
                  ),
                },
                {
                  key: "position",
                  label: "Current",
                  align: "center",
                  sortable: true,
                  render: (_v, row) => (
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                      row.position <= 3 ? "bg-emerald-50 text-emerald-700" :
                      row.position <= 10 ? "bg-blue-50 text-blue-700" :
                      row.position <= 20 ? "bg-amber-50 text-amber-700" : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                    }`}>{row.position}</span>
                  ),
                },
                {
                  key: "previousPosition",
                  label: "Previous",
                  align: "center",
                  sortable: true,
                },
                {
                  key: "gain",
                  label: "Gain",
                  align: "center",
                  render: (_v, row) => {
                    const gain = row.previousPosition - row.position;
                    return (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        <CssArrowUp />+{gain}
                      </span>
                    );
                  },
                },
                {
                  key: "searchVolume",
                  label: "Volume",
                  align: "right",
                  sortable: true,
                  render: (_v, row) => formatNumber(row.searchVolume),
                },
                {
                  key: "trafficPercent",
                  label: "Traffic %",
                  align: "right",
                  sortable: true,
                  render: (_v, row) => `${row.trafficPercent.toFixed(1)}%`,
                },
              ]}
            />
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
            <DataTable<TrackedKeyword>
              data={trackedKeywords}
              searchable
              exportable
              exportFilename="tracked-keywords"
              pageSize={20}
              columns={[
                {
                  key: "keyword",
                  label: "Keyword",
                  render: (_v, row) => (
                    <div>
                      <p className="text-[var(--text)] font-medium truncate max-w-[220px]">{row.keyword}</p>
                      {row.landingPage && <p className="text-xs text-[var(--text-3)] truncate max-w-[220px]">{row.landingPage}</p>}
                    </div>
                  ),
                },
                {
                  key: "position",
                  label: "Position",
                  align: "center",
                  sortable: true,
                  render: (_v, row) => row.position > 0 ? (
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                      row.position <= 3 ? "bg-emerald-50 text-emerald-700" :
                      row.position <= 10 ? "bg-blue-50 text-blue-700" :
                      row.position <= 20 ? "bg-amber-50 text-amber-700" : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                    }`}>{row.position}</span>
                  ) : <span className="text-[var(--text-3)] text-xs">—</span>,
                },
                {
                  key: "previousPosition",
                  label: "Prev",
                  align: "center",
                  sortable: true,
                  render: (_v, row) => String(row.previousPosition ?? "—"),
                },
                {
                  key: "change",
                  label: "Change",
                  align: "center",
                  render: (_v, row) => {
                    const change = row.previousPosition != null && row.previousPosition > 0 && row.position > 0
                      ? row.previousPosition - row.position : null;
                    if (change == null) return null;
                    return (
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        change > 0 ? "bg-emerald-50 text-emerald-700" :
                        change < 0 ? "bg-red-50 text-red-700" : "bg-[var(--border-subtle)] text-[var(--text-3)]"
                      }`}>
                        {change > 0 ? <CssArrowUp /> : change < 0 ? <CssArrowDown /> : <CssMinus />}
                        {change > 0 ? `+${change}` : change < 0 ? `${change}` : "="}
                      </span>
                    );
                  },
                },
                {
                  key: "searchVolume",
                  label: "Volume",
                  align: "right",
                  sortable: true,
                  render: (_v, row) => formatNumber(row.searchVolume),
                },
              ]}
            />
          )}
        </SectionCard>
      )}

      {/* Keyword Rankings by Tag */}
      {show("tagged_kw_positions") && (campaignIds?.[0] ?? null) && (
        <SectionCard
          title="Keyword Rankings by Tag"
          subtitle="All tracked keyword positions from your SEMrush campaign"
        >
          {taggedKwError ? (
            <p className="text-sm text-red-600 py-2">{taggedKwError}</p>
          ) : taggedKeywords.length === 0 ? (
            <p className="text-sm text-[var(--text-4)] italic py-2">
              No keyword data returned. SEMrush may still be crawling or the campaign may not have any tracked keywords.
            </p>
          ) : (
            <>
              {/* SERP Feature legend */}
              <details className="mb-5 group">
                <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-2)] select-none list-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  What do the SERP feature badges mean?
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-open:rotate-180"><path d="M6 9l6 6 6-6"/></svg>
                </summary>
                <div className="mt-2 p-4 rounded-lg bg-[var(--bg-subtle,#f8f9fb)] border border-[var(--border-subtle)] text-xs text-[var(--text-2)]">
                  <p className="mb-2 text-[var(--text-3)]">Badges show which Google search features appear for each keyword. <strong className="text-[var(--text-2)]">Solid badges with ✓</strong> mean your site appears in that feature.</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                    {([
                      ["org", "Standard organic result"],
                      ["aio", "AI Overview — client is cited as a source in Google's AI-generated answer."],
                      ["fsn", "Featured snippet (answer box)"],
                      ["rel", "People also ask"],
                      ["img", "Image pack"],
                      ["vid", "Video results"],
                      ["stl", "Sitelinks (extra page links)"],
                      ["geo", "Local pack (map results)"],
                      ["kng", "Knowledge panel"],
                      ["knw", "Instant answer"],
                      ["adt", "Google Ads (top)"],
                      ["adb", "Google Ads (bottom)"],
                      ["rev", "Review stars"],
                      ["new", "Top stories / news"],
                      ["res", "Related searches"],
                    ] as [string, string][]).map(([code, desc]) => (
                      <div key={code} className="flex items-center gap-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--border-subtle)] text-[var(--text-2)] uppercase shrink-0">{code}</span>
                        <span className="text-[var(--text-3)]">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
              {/* Tag filters + unranked toggle — editor-only, hidden on shared/PDF */}
              {!hideAlerts && (allTags.length >= 1 || taggedKeywords.some((kw) => kw.currentPosition == null)) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {allTags.length >= 1 && (
                    <>
                      <span className="text-xs text-[var(--text-3)]">Tag:</span>
                      <button
                        onClick={() => setTagFilter(null)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          activeTagFilter == null
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-transparent text-[var(--text-2)] border-[var(--border)] hover:border-indigo-400 hover:text-indigo-600"
                        }`}
                      >
                        All
                      </button>
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setTagFilter(activeTagFilter === tag ? null : tag)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            activeTagFilter === tag
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-transparent text-[var(--text-2)] border-[var(--border)] hover:border-indigo-400 hover:text-indigo-600"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </>
                  )}
                  {taggedKeywords.some((kw) => kw.currentPosition == null) && (
                    <button
                      onClick={() => setShowUnranked((v) => !v)}
                      className={`ml-auto px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        showUnranked
                          ? "bg-slate-600 text-white border-slate-600"
                          : "bg-transparent text-[var(--text-3)] border-[var(--border)] hover:border-slate-400"
                      }`}
                    >
                      {showUnranked ? "Hide unranked" : `Show unranked (${taggedKeywords.filter((kw) => kw.currentPosition == null).length})`}
                    </button>
                  )}
                </div>
              )}
              <DataTable<TaggedKeyword>
                data={visibleTaggedKws}
                exportable
                exportFilename="tagged-keyword-positions"
                pageSize={0}
                defaultSortKey="currentPosition"
                defaultSortDir="asc"
                columns={[
                {
                  key: "keyword",
                  label: "Keyword",
                  render: (_v, row) => (
                    <div>
                      <p className="text-[var(--text)] font-medium truncate max-w-[220px]">{row.keyword}</p>
                      {row.url && (
                        <p className="text-xs text-[var(--text-3)] truncate max-w-[220px]">
                          {row.url.replace(/^https?:\/\/[^/]+/, "")}
                        </p>
                      )}
                    </div>
                  ),
                },
                {
                  key: "currentPosition",
                  label: "Current",
                  align: "center",
                  sortable: true,
                  render: (_v, row) =>
                    row.currentPosition != null ? (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                          row.currentPosition <= 3
                            ? "bg-emerald-50 text-emerald-700"
                            : row.currentPosition <= 10
                            ? "bg-blue-50 text-blue-700"
                            : row.currentPosition <= 20
                            ? "bg-amber-50 text-amber-700"
                            : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                        }`}
                      >
                        {row.currentPosition}
                      </span>
                    ) : (
                      <span className="text-[var(--text-3)] text-xs">—</span>
                    ),
                },
                {
                  key: "delta",
                  label: "Change",
                  align: "center",
                  sortable: true,
                  render: (_v, row) => {
                    if (row.delta == null) return <span className="text-[var(--text-3)] text-xs">—</span>;
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          row.delta > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : row.delta < 0
                            ? "bg-red-50 text-red-700"
                            : "bg-[var(--border-subtle)] text-[var(--text-3)]"
                        }`}
                      >
                        {row.delta > 0 ? (
                          <><CssArrowUp />+{row.delta}</>
                        ) : row.delta < 0 ? (
                          <><CssArrowDown />{row.delta}</>
                        ) : (
                          <><CssMinus />0</>
                        )}
                      </span>
                    );
                  },
                },
                {
                  key: "estTraffic",
                  label: "Est. Traffic",
                  align: "right",
                  sortable: true,
                  render: (_v, row) => row.estTraffic != null && row.estTraffic > 0
                    ? <span className="text-sm text-[var(--text)]">{row.estTraffic.toFixed(2)}</span>
                    : <span className="text-[var(--text-3)] text-xs">—</span>,
                },
                {
                  key: "searchVolume",
                  label: "Volume",
                  align: "right",
                  sortable: true,
                  render: (_v, row) => formatNumber(row.searchVolume),
                },
                {
                  key: "serpFeatures",
                  label: "SERP Features",
                  render: (_v, row) => {
                    const ownedFeats = row.ownedFeatures ?? [];
                    const ownedSerpFeats = row.serpFeatures.filter(
                      (f) => ownedFeats.includes(f) || (f === "org" && ownedFeats.includes("aio"))
                    );
                    if (!row.currentPosition || ownedSerpFeats.length === 0) {
                      return <span className="text-[var(--text-3)] text-xs">—</span>;
                    }
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {ownedSerpFeats.map((f) => {
                          const isAio = f === "aio";
                          if (isAio) {
                            return (
                              <span
                                key={f}
                                title="Client appears in AI Overview"
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-semibold border bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 text-purple-700 border-purple-300"
                              >
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path d="M12 2C12 2 13.5 8.5 18 12C13.5 15.5 12 22 12 22C12 22 10.5 15.5 6 12C10.5 8.5 12 2 12 2Z" fill="url(#gemini-grad-sf)" />
                                  <defs>
                                    <linearGradient id="gemini-grad-sf" x1="6" y1="2" x2="18" y2="22" gradientUnits="userSpaceOnUse">
                                      <stop stopColor="#4285F4" />
                                      <stop offset="0.5" stopColor="#A855F7" />
                                      <stop offset="1" stopColor="#EC4899" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                AIO
                                <span className="ml-0.5 text-green-500">✓</span>
                              </span>
                            );
                          }
                          return (
                            <span
                              key={f}
                              title={`Client appears in ${f.toUpperCase()}`}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-medium uppercase bg-[var(--border-subtle)] text-[var(--text-1)]"
                            >
                              {f}
                              <span className="text-green-500">✓</span>
                            </span>
                          );
                        })}
                      </div>
                    );
                  },
                },
              ]}
              />
            </>
          )}
        </SectionCard>
      )}

      {/* Backlinks */}
      {show("backlinks") && (backlinkError || backlinks.length > 0) && (
        <SectionCard title="Recent Backlinks" subtitle="Top referring domains by authority score">
          {backlinkError ? (
            <p className="text-sm text-red-600 py-2">{backlinkError}</p>
          ) : (
            <DataTable<Backlink>
              data={backlinks}
              exportable
              exportFilename="backlinks"
              pageSize={20}
              columns={[
                {
                  key: "sourceUrl",
                  label: "Source Domain",
                  render: (_v, row) => {
                    let sourceDomain = row.sourceUrl;
                    try { sourceDomain = new URL(row.sourceUrl).hostname; } catch {}
                    return (
                      <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-[var(--text)] hover:text-indigo-600 transition truncate max-w-[180px] block">
                        {sourceDomain}
                      </a>
                    );
                  },
                },
                {
                  key: "targetUrl",
                  label: "Target URL",
                  render: (_v, row) => {
                    let targetPath = row.targetUrl;
                    try { const u = new URL(row.targetUrl); targetPath = u.pathname + u.search; } catch {}
                    return <span className="block overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px]">{targetPath}</span>;
                  },
                },
                {
                  key: "anchorText",
                  label: "Anchor Text",
                  render: (_v, row) => row.anchorText || <span className="italic text-[var(--text-3)]">No anchor</span>,
                },
                {
                  key: "authority",
                  label: "Authority",
                  align: "right",
                  sortable: true,
                  render: (_v, row) => (
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.authority >= 60 ? "bg-emerald-50 text-emerald-700" :
                      row.authority >= 30 ? "bg-blue-50 text-blue-700" : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                    }`}>{row.authority}</span>
                  ),
                },
              ]}
            />
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
                <div className="rounded-xl bg-[var(--border-subtle)] p-4 text-center">
                  <p className="text-xs text-[var(--text-3)] font-medium uppercase tracking-wide mb-1">AI Visibility Score</p>
                  <p className="text-2xl font-bold text-indigo-600">{aiVisibility.aiVisibilityScore.toFixed(1)}%</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">of tracked keywords</p>
                </div>
                <div className="rounded-xl bg-[var(--border-subtle)] p-4 text-center">
                  <p className="text-xs text-[var(--text-3)] font-medium uppercase tracking-wide mb-1">Brand Citations</p>
                  <p className="text-2xl font-bold text-emerald-600">{aiVisibility.brandCitations}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">in AI Overviews</p>
                </div>
                <div className="rounded-xl bg-[var(--border-subtle)] p-4 text-center">
                  <p className="text-xs text-[var(--text-3)] font-medium uppercase tracking-wide mb-1">AI Overview Keywords</p>
                  <p className="text-2xl font-bold text-blue-600">{aiVisibility.aiOverviewKeywords}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">trigger AI Overviews</p>
                </div>
                <div className="rounded-xl bg-[var(--border-subtle)] p-4 text-center">
                  <p className="text-xs text-[var(--text-3)] font-medium uppercase tracking-wide mb-1">Total Tracked</p>
                  <p className="text-2xl font-bold text-[var(--text)]">{aiVisibility.totalTracked}</p>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">keywords monitored</p>
                </div>
              </div>
              {aiVisibility.keywords.some((k) => k.hasAIOverview) && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wide mb-2">Keywords with AI Overview presence</p>
                  <DataTable<AIKeyword>
                    data={aiVisibility.keywords
                      .filter((k) => k.hasAIOverview)
                      .sort((a, b) => (b.brandInAIOverview ? 1 : 0) - (a.brandInAIOverview ? 1 : 0) || a.position - b.position)}
                    pageSize={0}
                    columns={[
                      { key: "keyword", label: "Keyword" },
                      {
                        key: "position",
                        label: "Rank",
                        align: "center",
                        sortable: true,
                        render: (_v, row) => (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                            row.position <= 3 ? "bg-emerald-50 text-emerald-700" :
                            row.position <= 10 ? "bg-blue-50 text-blue-700" : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                          }`}>{row.position || "—"}</span>
                        ),
                      },
                      {
                        key: "searchVolume",
                        label: "Volume",
                        align: "right",
                        sortable: true,
                        render: (_v, row) => formatNumber(row.searchVolume),
                      },
                      {
                        key: "hasAIOverview",
                        label: "AI Overview",
                        align: "center",
                        render: () => <span className="inline-block w-2 h-2 rounded-full bg-blue-400" title="AI Overview present" />,
                      },
                      {
                        key: "brandInAIOverview",
                        label: "Brand Cited",
                        align: "center",
                        render: (_v, row) => row.brandInAIOverview ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">✓ Cited</span>
                        ) : (
                          <span className="text-[var(--text-3)] text-xs">—</span>
                        ),
                      },
                    ]}
                  />
                </div>
              )}
            </>
          )}
        </SectionCard>
      )}

      {/* Competitor landscape */}
      {show("competitors") && competitorRows.length > 0 && (
        <SectionCard title="Competitor Landscape" subtitle={`Top organic competitors for ${domain}`}>
          <DataTable<Competitor>
            data={competitorRows}
            pageSize={20}
            columns={[
              {
                key: "domain",
                label: "Domain",
                render: (_v, row) => (
                  <div className="flex items-center gap-2">
                    {row.isClient ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">Client</span>
                    ) : null}
                    <a
                      href={`https://${row.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={row.isClient ? "font-semibold text-emerald-200 hover:text-emerald-100 transition" : "font-medium text-[var(--text)] hover:text-indigo-600 transition"}
                    >
                      {row.domain}
                    </a>
                  </div>
                ),
              },
              {
                key: "commonKeywords",
                label: "Common KW",
                align: "right",
                sortable: true,
                render: (_v, row) => (
                  row.isClient ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-300/60">Self</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {formatNumber(row.commonKeywords)}
                    </span>
                  )
                ),
              },
              {
                key: "organicKeywords",
                label: "Organic KW",
                align: "right",
                sortable: true,
                render: (_v, row) => (
                  <span className={row.isClient ? "font-semibold text-emerald-200" : undefined}>{formatNumber(row.organicKeywords)}</span>
                ),
              },
              {
                key: "organicTraffic",
                label: "Traffic",
                align: "right",
                sortable: true,
                render: (_v, row) => (
                  <span className={row.isClient ? "font-semibold text-emerald-200" : undefined}>{formatNumber(row.organicTraffic)}</span>
                ),
              },
              {
                key: "organicCost",
                label: "Traffic Value",
                align: "right",
                sortable: true,
                render: (_v, row) => (
                  <span className={row.isClient ? "font-semibold text-emerald-200" : undefined}>{formatCurrency(row.organicCost)}</span>
                ),
              },
            ]}
          />
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
          extraContext={(() => {
            const parts: string[] = [];

            // Domain-level top keywords (overview API)
            if (keywords.length > 0) {
              parts.push("Top organic keywords (domain overview):");
              keywords.slice(0, 10).forEach((kw) => {
                const delta = kw.previousPosition > 0 ? kw.previousPosition - kw.position : null;
                const deltaStr = delta != null ? (delta > 0 ? ` (↑${delta})` : delta < 0 ? ` (↓${Math.abs(delta)})` : " (=)") : "";
                parts.push(`  • "${kw.keyword}" — pos ${kw.position}${deltaStr}, vol ${kw.searchVolume.toLocaleString()}, ${kw.trafficPercent.toFixed(1)}% traffic`);
              });
            }

            // Campaign position-tracking keywords with SERP feature ownership
            if (taggedKeywords.length > 0) {
              const ranked = taggedKeywords.filter(kw => kw.currentPosition != null);
              const aioOwned = ranked.filter(kw => kw.ownedFeatures.includes("aio"));
              const fsnOwned = ranked.filter(kw => kw.ownedFeatures.includes("fsn"));

              parts.push(`\nCampaign tracked keywords (position tracking): ${ranked.length} ranked of ${taggedKeywords.length} total tracked`);

              if (aioOwned.length > 0) {
                parts.push(`AI Overview (AIO) appearances — ${aioOwned.length} keyword(s) where client is cited in Google's AI-generated answer:`);
                aioOwned.slice(0, 8).forEach(kw => {
                  const deltaStr = kw.delta != null ? (kw.delta > 0 ? ` (↑${kw.delta})` : kw.delta < 0 ? ` (↓${Math.abs(kw.delta)})` : " (=)") : "";
                  const sov = kw.shareOfVoice != null ? `, SOV ${kw.shareOfVoice.toFixed(1)}%` : "";
                  parts.push(`  • "${kw.keyword}" — pos ${kw.currentPosition}${deltaStr}, vol ${kw.searchVolume.toLocaleString()}${sov}`);
                });
              }

              if (fsnOwned.length > 0) {
                parts.push(`Featured Snippet (FSN) ownership — ${fsnOwned.length} keyword(s):`);
                fsnOwned.slice(0, 5).forEach(kw => {
                  parts.push(`  • "${kw.keyword}" — pos ${kw.currentPosition}, vol ${kw.searchVolume.toLocaleString()}`);
                });
              }

              // Top tracked keywords by estimated traffic
              const topByTraffic = [...ranked]
                .filter(kw => kw.estTraffic != null && kw.estTraffic > 0)
                .sort((a, b) => (b.estTraffic ?? 0) - (a.estTraffic ?? 0))
                .slice(0, 10);
              if (topByTraffic.length > 0) {
                parts.push(`\nTop tracked keywords by estimated traffic:`);
                topByTraffic.forEach(kw => {
                  const deltaStr = kw.delta != null ? (kw.delta > 0 ? ` (↑${kw.delta})` : kw.delta < 0 ? ` (↓${Math.abs(kw.delta)})` : " (=)") : "";
                  const owned = kw.ownedFeatures.length > 0 ? ` [owns: ${kw.ownedFeatures.join(", ")}]` : "";
                  parts.push(`  • "${kw.keyword}" — pos ${kw.currentPosition}${deltaStr}, est. traffic ${kw.estTraffic?.toFixed(2)}, vol ${kw.searchVolume.toLocaleString()}${owned}`);
                });
              }

              // Keywords with notable drops
              const dropping = ranked.filter(kw => kw.delta != null && kw.delta < -3).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).slice(0, 5);
              if (dropping.length > 0) {
                parts.push(`\nKeywords with significant position drops (↓3+):`);
                dropping.forEach(kw => {
                  parts.push(`  • "${kw.keyword}" — pos ${kw.currentPosition} (↓${Math.abs(kw.delta ?? 0)}), vol ${kw.searchVolume.toLocaleString()}`);
                });
              }

              // Feature ownership summary
              const featureCounts: Record<string, number> = {};
              ranked.forEach(kw => kw.ownedFeatures.forEach(f => { featureCounts[f] = (featureCounts[f] ?? 0) + 1; }));
              const featureSummary = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f.toUpperCase()}×${n}`).join(", ");
              if (featureSummary) parts.push(`\nOwned SERP features summary: ${featureSummary}`);
            }

            return parts.length > 0 ? parts.join("\n") : undefined;
          })()}
          crossPlatformContext={crossPlatformContext}
        />
      )}

      {/* Content Gap Analysis */}
      {show("content_gap") && contentGap.length > 0 && (
        <SectionCard title="Content Gap Analysis" subtitle="Keyword opportunities where competitors rank but you don't">
          <DataTable<{ keyword: string; volume: number; difficulty: number; competitors: string[] }>
            data={contentGap}
            searchable
            pageSize={20}
            columns={[
              { key: "keyword", label: "Keyword" },
              {
                key: "volume",
                label: "Volume",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.volume),
              },
              {
                key: "difficulty",
                label: "Difficulty",
                align: "right",
                sortable: true,
                render: (_v, row) => (
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: "#fff",
                    background: row.difficulty >= 80 ? "#dc2626" : row.difficulty >= 60 ? "#d97706" : row.difficulty >= 40 ? "#2563eb" : "#16a34a",
                    borderRadius: 4, padding: "2px 8px",
                  }}>
                    {row.difficulty}%
                  </span>
                ),
              },
              {
                key: "competitors",
                label: "Competitors",
                align: "right",
                render: (_v, row) => (row.competitors as string[]).length,
              },
            ]}
          />
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
                  <div style={{ flex: 1, background: "var(--border-subtle)", borderRadius: 4, height: 22, position: "relative", overflow: "hidden" }}>
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
          <DataTable<{ url: string; type: string; domain: string; firstSeen: string; lost: boolean }>
            data={backlinkChanges}
            pageSize={20}
            columns={[
              {
                key: "url",
                label: "URL",
                render: (_v, row) => (
                  <a href={row.url} target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--accent)", textDecoration: "none" }}
                    className="font-medium block overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">
                    {row.url}
                  </a>
                ),
              },
              { key: "domain", label: "Referring Domain" },
              {
                key: "lost",
                label: "Type",
                align: "center",
                render: (_v, row) => (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff",
                    background: row.lost ? "#dc2626" : "#16a34a",
                    borderRadius: 4, padding: "2px 8px",
                  }}>
                    {row.lost ? "Lost" : "New"}
                  </span>
                ),
              },
              {
                key: "firstSeen",
                label: "First Seen",
                align: "right",
                render: (_v, row) => row.firstSeen ? formatDateDisplay(row.firstSeen) : "—",
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Topic Research */}
      {isExplicit("topic_research") && !topicResearch && (
        <EmptyBlockState title="Topic Research" />
      )}
      {show("topic_research") && topicResearch && (
        <SectionCard title="Topic Research" subtitle={`${topicResearch.topic} — volume ${formatNumber(topicResearch.volume)}, difficulty ${topicResearch.difficulty}`}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[var(--border-subtle)] rounded-lg p-3 text-center">
              <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Volume</p>
              <p className="text-lg font-bold text-[var(--text)]">{formatNumber(topicResearch.volume)}</p>
            </div>
            <div className="bg-[var(--border-subtle)] rounded-lg p-3 text-center">
              <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Difficulty</p>
              <p className="text-lg font-bold text-[var(--text)]">{topicResearch.difficulty}%</p>
            </div>
            <div className="bg-[var(--border-subtle)] rounded-lg p-3 text-center">
              <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Efficiency</p>
              <p className="text-lg font-bold text-[var(--text)]">{topicResearch.topicEfficiency.toFixed(1)}</p>
            </div>
          </div>
          {topicResearch.subtopics && topicResearch.subtopics.length > 0 && (
            <div className="space-y-3">
              {topicResearch.subtopics.slice(0, 10).map((st, i) => (
                <div key={i} className="border border-[var(--border-subtle)] rounded-lg p-3">
                  <p className="text-xs font-semibold text-[var(--text)]">{st.headline}</p>
                  {st.questions && st.questions.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {st.questions.slice(0, 3).map((q, qi) => (
                        <li key={qi} className="text-[11px] text-[var(--text-3)]">• {q}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Site Audit Summary */}
      {isExplicit("site_audit") && !siteAudit && (
        <EmptyBlockState title="Site Audit" message="No SEMrush Site Audit project configured for this domain." />
      )}
      {show("site_audit") && siteAudit && (
        <SectionCard title="Site Audit Summary" subtitle={`${formatNumber(siteAudit.totalPages)} pages crawled`}>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-[var(--border-subtle)] rounded-lg p-3 text-center">
              <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Health Score</p>
              <p className={`text-lg font-bold ${siteAudit.healthScore >= 80 ? "text-emerald-600" : siteAudit.healthScore >= 50 ? "text-amber-600" : "text-red-600"}`}>{siteAudit.healthScore}%</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-red-500 uppercase tracking-wider">Errors</p>
              <p className="text-lg font-bold text-red-600">{formatNumber(siteAudit.errors)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-amber-500 uppercase tracking-wider">Warnings</p>
              <p className="text-lg font-bold text-amber-600">{formatNumber(siteAudit.warnings)}</p>
            </div>
            <div className="bg-[var(--border-subtle)] rounded-lg p-3 text-center">
              <p className="text-[10px] text-[var(--text-3)] uppercase tracking-wider">Notices</p>
              <p className="text-lg font-bold text-[var(--text-2)]">{formatNumber(siteAudit.notices)}</p>
            </div>
          </div>
          {siteAudit.issues && siteAudit.issues.length > 0 && (
            <DataTable<{ title: string; severity: string; count: number }>
              data={siteAudit.issues}
              pageSize={0}
              columns={[
                { key: "title", label: "Issue" },
                {
                  key: "severity",
                  label: "Severity",
                  align: "center",
                  render: (_v, row) => (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      row.severity === "error" ? "bg-red-100 text-red-700" :
                      row.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                    }`}>{row.severity}</span>
                  ),
                },
                {
                  key: "count",
                  label: "Count",
                  align: "right",
                  sortable: true,
                  render: (_v, row) => formatNumber(row.count),
                },
              ]}
            />
          )}
        </SectionCard>
      )}

      {/* Ad Copy Intelligence */}
      {show("ad_copy_intelligence") && adCopyIntelligence.length > 0 && (
        <SectionCard title="Ad Copy Intelligence" subtitle={`${adCopyIntelligence.length} competitor ad${adCopyIntelligence.length !== 1 ? "s" : ""} detected`}>
          <div className="space-y-3">
            {adCopyIntelligence.slice(0, 15).map((ad, i) => (
              <div key={i} className="border border-[var(--border-subtle)] rounded-lg p-3">
                <p className="text-xs font-semibold text-indigo-600">{ad.title}</p>
                <p className="text-[11px] text-[var(--text-2)] mt-0.5">{ad.description}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text-3)]">
                  <span className="truncate max-w-[200px]">{ad.url}</span>
                  <span>Keyword: {ad.keyword}</span>
                  <span>Pos {ad.position}</span>
                  <span>{ad.trafficPercent.toFixed(1)}% traffic</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Display Advertising */}
      {show("display_advertising") && displayAdvertising.length > 0 && (
        <SectionCard title="Display Advertising Competitors" subtitle={`${displayAdvertising.length} competitor${displayAdvertising.length !== 1 ? "s" : ""}`}>
          <DataTable<{ domain: string; displayAds: number; displayTraffic: number; displayCost: number }>
            data={displayAdvertising}
            pageSize={20}
            columns={[
              { key: "domain", label: "Domain" },
              {
                key: "displayAds",
                label: "Display Ads",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.displayAds),
              },
              {
                key: "displayTraffic",
                label: "Traffic",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.displayTraffic),
              },
              {
                key: "displayCost",
                label: "Est. Cost",
                align: "right",
                sortable: true,
                render: (_v, row) => formatCurrency(row.displayCost),
              },
            ]}
          />
        </SectionCard>
      )}

      {/* PLA / Shopping Competitors */}
      {show("shopping_competitors") && shoppingCompetitors.length > 0 && (
        <SectionCard title="PLA / Shopping Competitors" subtitle={`${shoppingCompetitors.length} competitor${shoppingCompetitors.length !== 1 ? "s" : ""}`}>
          <DataTable<{ domain: string; shoppingKeywords: number; shoppingTraffic: number; shoppingCost: number }>
            data={shoppingCompetitors}
            pageSize={20}
            columns={[
              { key: "domain", label: "Domain" },
              {
                key: "shoppingKeywords",
                label: "Shopping KWs",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.shoppingKeywords),
              },
              {
                key: "shoppingTraffic",
                label: "Traffic",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.shoppingTraffic),
              },
              {
                key: "shoppingCost",
                label: "Est. Cost",
                align: "right",
                sortable: true,
                render: (_v, row) => formatCurrency(row.shoppingCost),
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Keyword Trends */}
      {show("keyword_trends") && keywordTrends.length > 0 && (
        <SectionCard title="Keyword Trends" subtitle={`${keywordTrends.length} keyword${keywordTrends.length !== 1 ? "s" : ""} tracked`}>
          <DataTable<{ keyword: string; searchVolume: number; trend: string; cpc: number; competition: number }>
            data={keywordTrends}
            searchable
            pageSize={20}
            columns={[
              { key: "keyword", label: "Keyword" },
              {
                key: "searchVolume",
                label: "Volume",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.searchVolume),
              },
              {
                key: "trend",
                label: "Trend",
                align: "center",
                render: (_v, row) => (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    row.trend === "up" ? "bg-emerald-100 text-emerald-700" :
                    row.trend === "down" ? "bg-red-100 text-red-700" : "bg-[var(--border-subtle)] text-[var(--text-2)]"
                  }`}>{row.trend}</span>
                ),
              },
              {
                key: "cpc",
                label: "CPC",
                align: "right",
                sortable: true,
                render: (_v, row) => formatCurrency(row.cpc),
              },
              {
                key: "competition",
                label: "Competition",
                align: "right",
                sortable: true,
                render: (_v, row) => `${(row.competition * 100).toFixed(0)}%`,
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Referring Domains */}
      {show("referring_domains") && referringDomains.length > 0 && (
        <SectionCard title="Referring Domains" subtitle={`${referringDomains.length} domain${referringDomains.length !== 1 ? "s" : ""} linking`}>
          <DataTable<{ domain: string; backlinks: number; ipAddress: string; country: string; firstSeen: string; lastSeen: string }>
            data={referringDomains}
            exportable
            exportFilename="referring-domains"
            pageSize={20}
            columns={[
              { key: "domain", label: "Domain" },
              {
                key: "backlinks",
                label: "Backlinks",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.backlinks),
              },
              {
                key: "country",
                label: "Country",
                render: (_v, row) => row.country || "—",
              },
              {
                key: "firstSeen",
                label: "First Seen",
                align: "right",
                render: (_v, row) => row.firstSeen ? formatDateDisplay(row.firstSeen) : "—",
              },
              {
                key: "lastSeen",
                label: "Last Seen",
                align: "right",
                render: (_v, row) => row.lastSeen ? formatDateDisplay(row.lastSeen) : "—",
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Anchor Text Distribution */}
      {show("anchor_text") && anchorText.length > 0 && (
        <SectionCard title="Anchor Text Distribution" subtitle={`${anchorText.length} unique anchor${anchorText.length !== 1 ? "s" : ""}`}>
          <DataTable<{ anchor: string; domains: number; backlinks: number; firstSeen: string; lastSeen: string }>
            data={anchorText}
            exportable
            exportFilename="anchor-text"
            pageSize={20}
            columns={[
              {
                key: "anchor",
                label: "Anchor Text",
                render: (_v, row) => (
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
                    {row.anchor || "(empty)"}
                  </span>
                ),
              },
              {
                key: "domains",
                label: "Domains",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.domains),
              },
              {
                key: "backlinks",
                label: "Backlinks",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.backlinks),
              },
              {
                key: "firstSeen",
                label: "First Seen",
                align: "right",
                render: (_v, row) => row.firstSeen ? formatDateDisplay(row.firstSeen) : "—",
              },
              {
                key: "lastSeen",
                label: "Last Seen",
                align: "right",
                render: (_v, row) => row.lastSeen ? formatDateDisplay(row.lastSeen) : "—",
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Competitor Backlink Comparison */}
      {show("backlink_comparison") && backlinkComparison.length > 0 && (
        <SectionCard title="Competitor Backlink Comparison" subtitle={`${backlinkComparison.length} domain${backlinkComparison.length !== 1 ? "s" : ""} compared`}>
          <DataTable<{ domain: string; ascore: number; totalBacklinks: number; referringDomains: number; followLinks: number; nofollowLinks: number }>
            data={backlinkComparison}
            exportable
            exportFilename="backlink-comparison"
            pageSize={20}
            columns={[
              { key: "domain", label: "Domain" },
              {
                key: "ascore",
                label: "Authority",
                align: "right",
                sortable: true,
                render: (_v, row) => (
                  <span className={`font-semibold ${
                    row.ascore >= 50 ? "text-emerald-600" : row.ascore >= 30 ? "text-amber-600" : "text-red-600"
                  }`}>{row.ascore}</span>
                ),
              },
              {
                key: "totalBacklinks",
                label: "Backlinks",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.totalBacklinks),
              },
              {
                key: "referringDomains",
                label: "Ref. Domains",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.referringDomains),
              },
              {
                key: "followLinks",
                label: "Follow",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.followLinks),
              },
              {
                key: "nofollowLinks",
                label: "Nofollow",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.nofollowLinks),
              },
            ]}
          />
        </SectionCard>
      )}

      {/* Organic Position Changes */}
      {show("position_changes") && positionChanges.length > 0 && (
        <SectionCard title="Organic Position Changes" subtitle={`${positionChanges.length} keyword${positionChanges.length !== 1 ? "s" : ""} with position changes`}>
          <DataTable<{ keyword: string; previousPosition: number; currentPosition: number; change: number; searchVolume: number; url: string }>
            data={positionChanges}
            searchable
            exportable
            exportFilename="position-changes"
            pageSize={20}
            columns={[
              { key: "keyword", label: "Keyword" },
              {
                key: "previousPosition",
                label: "Previous",
                align: "right",
                sortable: true,
              },
              {
                key: "currentPosition",
                label: "Current",
                align: "right",
                sortable: true,
              },
              {
                key: "change",
                label: "Change",
                align: "right",
                sortable: true,
                render: (_v, row) => (
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${
                    row.change > 0 ? "text-emerald-600" : row.change < 0 ? "text-red-600" : "text-[var(--text-3)]"
                  }`}>
                    {row.change > 0 ? <><CssArrowUp /> +{row.change}</> : row.change < 0 ? <><CssArrowDown /> {row.change}</> : <><CssMinus /> 0</>}
                  </span>
                ),
              },
              {
                key: "searchVolume",
                label: "Volume",
                align: "right",
                sortable: true,
                render: (_v, row) => formatNumber(row.searchVolume),
              },
              {
                key: "url",
                label: "URL",
                render: (_v, row) => (
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]" title={row.url}>
                    {row.url.replace(/^https?:\/\/[^/]+/, "")}
                  </span>
                ),
              },
            ]}
          />
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
