"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Loader2, TrendingUp, TrendingDown, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Plus, Trash2, Download, BarChart2, Target, DollarSign, Zap, Check, AlertTriangle,
  Globe, Layers, Activity, MousePointer, Eye, Users, BookmarkPlus, FolderOpen, Pencil, X,
  FileText,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdGroup {
  name: string;
  rationale?: string;
  keywords: string[];
}

interface MonthlyVolume {
  year: number;
  month: string;
  searches: number;
}

interface KeywordIdea {
  text: string;
  adGroup: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: MonthlyVolume[];
}

interface SavedResearchSummary {
  id: string;
  title: string;
  website: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

interface SavedResearchFull extends SavedResearchSummary {
  brief: string;
  adGroups: AdGroup[];
  selectedKws: string[];
  ideas: KeywordIdea[];
  maxCpc: string;
  monthlyBudget: string;
  conversionRate: string;
  websiteContext?: string;
  proposedServices?: string[];
}

interface PricingStrategy {
  notes?: string;
  singleServices?: Array<{ name: string; monthlyFee: string; notes?: string }>;
  focusPackages?: Array<{ name: string; monthlyFee: string; hoursPerMonth: number; includes: string[] }>;
  retainerPackages?: Array<{ name: string; priceRange: string; description: string; includes: string[]; quarterlyAccelerator: string[] }>;
  otherServices?: Array<{ name: string; monthlyFee: string; notes?: string }>;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MONTH_ORDER: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};

const MONTH_ABBR: Record<string, string> = {
  JANUARY: "Jan", FEBRUARY: "Feb", MARCH: "Mar", APRIL: "Apr",
  MAY: "May", JUNE: "Jun", JULY: "Jul", AUGUST: "Aug",
  SEPTEMBER: "Sep", OCTOBER: "Oct", NOVEMBER: "Nov", DECEMBER: "Dec",
};

const LOCATIONS = [
  { id: "2826", label: "United Kingdom" },
  { id: "2840", label: "United States" },
  { id: "2036", label: "Australia" },
  { id: "2124", label: "Canada" },
  { id: "2276", label: "Germany" },
  { id: "2250", label: "France" },
  { id: "2724", label: "Spain" },
  { id: "2380", label: "Italy" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  border: "1px solid var(--border)", borderRadius: "var(--r)",
  fontSize: 14, color: "var(--text)", background: "var(--surface)",
  outline: "none", fontFamily: "inherit",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function microsToPounds(micros: number): string {
  if (!micros) return "\u2014";
  return `\xa3${(micros / 1_000_000).toFixed(2)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function competitionBadgeStyle(level: string): React.CSSProperties {
  switch (level) {
    case "LOW":    return { background: "var(--success-bg)", color: "var(--success-text)" };
    case "MEDIUM": return { background: "var(--warning-bg)", color: "var(--warning-text)" };
    case "HIGH":   return { background: "var(--danger-bg)", color: "var(--danger-text)" };
    default:       return { background: "var(--border-subtle)", color: "var(--text-3)" };
  }
}

function competitionLabel(level: string): string {
  switch (level) {
    case "LOW": return "Low"; case "MEDIUM": return "Medium"; case "HIGH": return "High"; default: return "\u2014";
  }
}

// ─── Forecast algorithm ───────────────────────────────────────────────────────
//
// Methodology matching Google Keyword Planner's approach as closely as possible
// without access to Google's proprietary ML models.
//
// 1. IMPRESSION SHARE: S-curve keyed on (maxCpc / marketCpc). The marketCpc is
//    SEMrush's Cp field — the average actual CPC paid across all advertisers,
//    which already reflects second-price auction discounting. At ratio = 1.0
//    (bidding exactly the market average CPC) a median bidder wins ~50% of
//    auctions. Practical IS ceiling ~80%: even at very high bids, serving
//    limits and ad-rank floors prevent 100% IS for competitive terms.
//    Source: Google Ads Help; practitioner IS research.
//
// 2. CTR uses COMPETITION LEVEL as a commercial-intent proxy. HIGH competition
//    = many advertisers bidding = keyword has high transactional value = users
//    are more likely to click ads (e.g. "emergency plumber": 5–8% CTR per
//    impression). LOW competition often = informational queries (~1.5%).
//    IMPORTANT: HIGH > MEDIUM > LOW. This is the correct direction — high
//    competition signals high commercial intent, not merely a position handicap.
//    IS then feeds positionCtrMultiplier() to adjust for estimated ad position.
//    Sources: FirstPageSage Apr 2025 (generic pos-1 = 2.1%, n=109 accounts);
//    industry benchmarks (Local Services/HVAC: 3.2%, Emergency Services: 5–8%).
//
// 3. ACTUAL CPC: SEMrush avg CPC IS the second-price equilibrium average — the
//    mean of what advertisers actually pay after second-price discounting. No
//    additional discount factor is applied (doing so would double-discount).
//    Formula: actualCpc = min(maxCpc, marketCpc).
//    Above market → pay market rate; below market → pay your bid (winning cheap
//    auctions where the 2nd-highest bid ≈ your own bid).
//    Source: Google Ads Help; SEMrush Cp field documentation.
//
// 4. BUDGET: Google uses monthly = daily × 30.4 (365 ÷ 12, rounded to 1 d.p.).
//    Source: Google Ads Help — monthly spending limit page.
//
// 5. BUDGET SCALING: linear proportional when budget < uncapped cost — confirmed
//    by Google's planning-mode methodology and practitioner consensus.
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base CTR by competition level (commercial-intent proxy).
 * HIGH competition = many advertisers bidding = keyword has high transactional
 * value = users more likely to click ads. LOW competition = often informational.
 * These rates represent CTR per impression at mid-range positions (2–3);
 * positionCtrMultiplier() then adjusts for estimated position via IS.
 */
const BASE_CTR_BY_COMPETITION: Record<string, number> = {
  HIGH:        0.055,  // transactional/urgent: "buy X", "emergency Y", "hire Z"
  MEDIUM:      0.032,  // general commercial: product/service consideration queries
  LOW:         0.015,  // often informational/research — fewer ad clicks per impression
  UNSPECIFIED: 0.025,
};

/**
 * Estimates Impression Share (0–1) from bid/market ratio.
 * Calibrated so ratio = 1.0 (bidding avg market CPC) → 50% IS (median bidder).
 * Ceiling 0.80: Google's practical max IS for generic competitive keywords.
 * Concave above 1.30× — diminishing returns, consistent with Google IS reports.
 */
function impressionShareEstimate(maxCpcPounds: number, marketCpcPounds: number): number {
  if (marketCpcPounds <= 0) return 0.50;
  const ratio = maxCpcPounds / marketCpcPounds;
  if (ratio >= 2.50) return 0.80;  // approaching absolute IS ceiling
  if (ratio >= 1.80) return 0.72;  // strongly above market
  if (ratio >= 1.30) return 0.62;  // above top-of-page high bid range
  if (ratio >= 1.00) return 0.50;  // at average market CPC (median bidder)
  if (ratio >= 0.75) return 0.36;  // below average market CPC
  if (ratio >= 0.50) return 0.20;  // well below market
  if (ratio >= 0.30) return 0.10;  // rarely appearing
  return 0.04;                      // minimal presence
}

/**
 * CTR position multiplier based on IS (IS proxies ad position).
 * IS ≥ 0.60: predominantly positions 1–2 (top of page) → higher CTR.
 * Below 0.26: mostly positions 3+ or below-fold → lower CTR per impression.
 */
function positionCtrMultiplier(impressionShare: number): number {
  if (impressionShare >= 0.60) return 1.40;  // top of page (positions 1–2)
  if (impressionShare >= 0.42) return 1.10;  // mixed positions 1–3
  if (impressionShare >= 0.26) return 0.80;  // positions 2–4
  return 0.50;                                // below-fold / positions 4+
}

/**
 * Per-keyword monthly forecast for the Keywords tab.
 * actualCpc = min(maxCpc, marketCpc) — no additional discount, since SEMrush
 * avg CPC already embeds the second-price auction average paid.
 */
function estimateForecast(idea: KeywordIdea, maxCpcMicros: number) {
  const maxCpcPounds  = maxCpcMicros / 1_000_000;
  const marketCpc     = (idea.highTopOfPageBidMicros || 1_000_000) / 1_000_000;
  const effectiveMax  = maxCpcPounds > 0 ? maxCpcPounds : marketCpc;

  const isEst         = impressionShareEstimate(effectiveMax, marketCpc);
  const baseCtr       = BASE_CTR_BY_COMPETITION[idea.competition] ?? 0.025;
  const ctr           = baseCtr * positionCtrMultiplier(isEst);

  const impressions   = Math.round(idea.avgMonthlySearches * isEst);
  const clicks        = Math.round(impressions * ctr);

  // SEMrush avg CPC is already the second-price equilibrium — no extra discount.
  const actualCpc     = Math.min(effectiveMax, marketCpc);
  const costPounds    = clicks * actualCpc;

  return { clicks, impressions, costPounds };
}

/**
 * Calculates 3-month volume change using the monthly trend data from SEMrush.
 * Compares avg of last 3 months vs avg of the preceding 3 months.
 * Returns null if there's not enough data.
 */
function calcTrendChange(volumes: MonthlyVolume[]): { pct: number; up: boolean } | null {
  if (volumes.length < 6) return null;
  // Sort by year then month order
  const sorted = [...volumes].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : (MONTH_ORDER[a.month] ?? 0) - (MONTH_ORDER[b.month] ?? 0)
  );
  const last3 = sorted.slice(-3).map((v) => v.searches);
  const prev3 = sorted.slice(-6, -3).map((v) => v.searches);
  const avgLast = last3.reduce((s, v) => s + v, 0) / 3;
  const avgPrev = prev3.reduce((s, v) => s + v, 0) / 3;
  if (avgPrev === 0) return null;
  const pct = ((avgLast - avgPrev) / avgPrev) * 100;
  return { pct, up: pct >= 0 };
}

// ─── Forecast helpers ─────────────────────────────────────────────────────────

interface ForecastMetrics {
  clicks: number;
  impressions: number;
  conversions: number;
  cost: number;
  avgCpa: number;
  ctr: number;
  avgCpc: number;
}

/**
 * Estimates campaign metrics for a given monthly budget using the same
 * bid-aware, position-adjusted, auction-discounted model as estimateForecast().
 */
function buildForecastAtBudget(
  ideas: KeywordIdea[],
  budgetPounds: number,
  maxCpcPounds: number,
  convRatePct: number
): ForecastMetrics {
  if (ideas.length === 0 || budgetPounds <= 0) {
    return { clicks: 0, impressions: 0, conversions: 0, cost: 0, avgCpa: 0, ctr: 0, avgCpc: 0 };
  }

  interface KwForecast { impressions: number; clicks: number; actualCpc: number }

  const perKw: KwForecast[] = ideas.map((idea) => {
    const marketCpc    = (idea.highTopOfPageBidMicros || 1_000_000) / 1_000_000;
    const effectiveMax = maxCpcPounds > 0 ? maxCpcPounds : marketCpc;

    const isEst        = impressionShareEstimate(effectiveMax, marketCpc);
    const baseCtr      = BASE_CTR_BY_COMPETITION[idea.competition] ?? 0.025;
    const ctr          = baseCtr * positionCtrMultiplier(isEst);

    const impressions  = Math.round(idea.avgMonthlySearches * isEst);
    const clicks       = Math.round(impressions * ctr);
    const actualCpc    = Math.min(effectiveMax, marketCpc);

    return { impressions, clicks, actualCpc };
  });

  const totalUncappedCost       = perKw.reduce((s, k) => s + k.clicks * k.actualCpc, 0);
  const totalUncappedClicks     = perKw.reduce((s, k) => s + k.clicks, 0);
  const totalUncappedImpressions = perKw.reduce((s, k) => s + k.impressions, 0);

  let clicks: number, impressions: number, cost: number;
  if (totalUncappedCost <= budgetPounds || totalUncappedCost === 0) {
    clicks      = totalUncappedClicks;
    impressions = totalUncappedImpressions;
    cost        = totalUncappedCost;
  } else {
    const scale = budgetPounds / totalUncappedCost;
    clicks      = Math.round(totalUncappedClicks * scale);
    impressions = Math.round(totalUncappedImpressions * scale);
    cost        = budgetPounds;
  }

  const conversions = clicks > 0 ? Math.round((clicks * convRatePct) / 100) : 0;
  const avgCpa      = conversions > 0 ? cost / conversions : 0;
  const ctr         = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const avgCpc      = clicks > 0 ? cost / clicks : 0;

  return { clicks, impressions, conversions, cost, avgCpa, ctr, avgCpc };
}

/** Build 9-point spend curve from 0 to 3× budget for the forecast chart */
function buildForecastCurve(
  ideas: KeywordIdea[],
  budgetPounds: number,
  maxCpcPounds: number,
  convRatePct: number
): { budget: number; clicks: number; conversions: number }[] {
  const multipliers = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  return multipliers.map((m) => {
    const b = budgetPounds * m;
    const f = buildForecastAtBudget(ideas, b, maxCpcPounds, convRatePct);
    return { budget: Math.round(b), clicks: f.clicks, conversions: f.conversions };
  });
}

function exportToCsv(ideas: KeywordIdea[], cpcMicros: number) {
  const headers = [
    "Ad Group", "Keyword", "Avg Monthly Searches", "3-Month Trend (%)",
    "Competition", "Competition Index",
    "Low Bid (\xa3)", "High Bid (\xa3)", "Est. Impressions", "Est. Clicks", "Est. Cost/mo (\xa3)",
  ];
  const rows = ideas.map((idea) => {
    const { impressions, clicks, costPounds } = estimateForecast(idea, cpcMicros);
    const trend = calcTrendChange(idea.monthlySearchVolumes);
    return [
      `"${idea.adGroup}"`, `"${idea.text}"`, idea.avgMonthlySearches,
      trend ? trend.pct.toFixed(1) : "",
      idea.competition, idea.competitionIndex,
      (idea.lowTopOfPageBidMicros / 1_000_000).toFixed(2),
      (idea.highTopOfPageBidMicros / 1_000_000).toFixed(2),
      impressions, clicks, costPounds.toFixed(2),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "keyword-planner-export.csv"; a.click();
  URL.revokeObjectURL(url);
}

function kwKey(groupName: string, kw: string) { return `${groupName}::${kw}`; }

// ─── Component ─────────────────────────────────────────────────────────────────

export default function KeywordPlannerPage() {
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get("clientId");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [website, setWebsite] = useState("");
  const [brief, setBrief] = useState("");
  const [location, setLocation] = useState("2826");

  // Step 1 → 2
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [rationale, setRationale] = useState("");
  const [websiteContext, setWebsiteContext] = useState("");

  // Ad group state
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [selectedKws, setSelectedKws] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [groupInputs, setGroupInputs] = useState<Record<string, string>>({});

  // Step 2 → 3
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [ideas, setIdeas] = useState<KeywordIdea[]>([]);

  // Step 3 controls
  const [activeTab, setActiveTab] = useState<"keywords" | "forecaster">("keywords");
  const [maxCpc, setMaxCpc] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [conversionRate, setConversionRate] = useState("3");
  const [cpcAutoFilled, setCpcAutoFilled] = useState(false);
  const [crAutoFilled, setCrAutoFilled] = useState(false);
  const [sortField, setSortField] = useState<keyof KeywordIdea>("avgMonthlySearches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [groupedView, setGroupedView] = useState(true);

  // Saved researches
  const [savedResearches, setSavedResearches] = useState<SavedResearchSummary[]>([]);
  const [currentResearchId, setCurrentResearchId] = useState<string | null>(null);
  const [researchTitle, setResearchTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingResearch, setSavingResearch] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Proposal generation
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [proposalClientName, setProposalClientName] = useState("");
  const [generatedProposalId, setGeneratedProposalId] = useState<string | null>(null);

  // Services selection
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy | null>(null);
  const [proposedServices, setProposedServices] = useState<string[]>([]);

  const loadSavedList = useCallback(async () => {
    try {
      const url = urlClientId
        ? `/api/tools/keyword-planner/saved?clientId=${urlClientId}`
        : "/api/tools/keyword-planner/saved";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSavedResearches(data.researches ?? []);
      }
    } catch { /* ignore */ }
  }, [urlClientId]);

  useEffect(() => { loadSavedList(); }, [loadSavedList]);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then((d: Record<string, string>) => {
        if (d.pricingStrategy) {
          try { setPricingStrategy(JSON.parse(d.pricingStrategy) as PricingStrategy); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);

  function toggleService(name: string) {
    setProposedServices(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  }

  async function handleSaveResearch() {
    if (!researchTitle.trim()) return;
    setSavingResearch(true);
    try {
      const payload = {
        title: researchTitle.trim(),
        website, brief, location,
        adGroups,
        selectedKws: [...selectedKws],
        ideas,
        maxCpc, monthlyBudget, conversionRate,
        websiteContext,
        proposedServices,
      };
      if (currentResearchId) {
        await fetch(`/api/tools/keyword-planner/saved/${currentResearchId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch("/api/tools/keyword-planner/saved", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setCurrentResearchId(data.research?.id ?? null);
      }
      await loadSavedList();
      setShowSavePanel(false);
    } catch { /* ignore */ }
    finally { setSavingResearch(false); }
  }

  async function handleLoadResearch(id: string) {
    try {
      const res = await fetch(`/api/tools/keyword-planner/saved/${id}`);
      if (!res.ok) return;
      const { research }: { research: SavedResearchFull } = await res.json();
      setWebsite(research.website);
      setBrief(research.brief);
      setLocation(research.location);
      setAdGroups(research.adGroups);
      setSelectedKws(new Set(research.selectedKws));
      setRationale("");
      setIdeas(research.ideas);
      setMaxCpc(research.maxCpc);
      setMonthlyBudget(research.monthlyBudget);
      const mb = parseFloat(research.monthlyBudget);
      setDailyBudget(!isNaN(mb) && research.monthlyBudget ? (mb / 30.4).toFixed(2) : "");
      setConversionRate(research.conversionRate);
      setCpcAutoFilled(false);
      setCrAutoFilled(false);
      setWebsiteContext(research.websiteContext ?? "");
      setProposedServices(research.proposedServices ?? []);
      setCurrentResearchId(research.id);
      setResearchTitle(research.title);
      setStep(3);
    } catch { /* ignore */ }
  }

  async function handleDeleteResearch(id: string) {
    await fetch(`/api/tools/keyword-planner/saved/${id}`, { method: "DELETE" });
    if (currentResearchId === id) setCurrentResearchId(null);
    await loadSavedList();
  }

  async function handleRenameResearch(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    await fetch(`/api/tools/keyword-planner/saved/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (currentResearchId === id) setResearchTitle(newTitle.trim());
    setRenamingId(null);
    await loadSavedList();
  }

  // ── Generate Proposal ─────────────────────────────────────────────────────
  async function handleGenerateProposal() {
    if (!proposalClientName.trim()) return;
    setGeneratingProposal(true);
    setProposalError("");
    try {
      const payload: Record<string, unknown> = {
        clientName: proposalClientName.trim(),
        proposedServices,
      };
      if (currentResearchId) {
        payload.researchId = currentResearchId;
      } else {
        payload.inlineData = {
          website: website.trim(),
          brief: brief.trim(),
          adGroups,
          ideas,
          maxCpc,
          monthlyBudget,
          conversionRate,
          websiteContext,
        };
      }
      const res = await fetch("/api/tools/keyword-planner/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { html?: string; filename?: string; error?: string; proposalId?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (typeof data.html !== "string" || !data.html) throw new Error("Invalid response from server");
      // Store proposalId so user can navigate to the saved proposal
      if (data.proposalId) setGeneratedProposalId(data.proposalId);
    } catch (err) {
      setProposalError(err instanceof Error ? err.message : "Failed to generate proposal");
    } finally {
      setGeneratingProposal(false);
    }
  }

  // ── Suggest ──────────────────────────────────────────────────────────────────
  async function handleSuggest() {
    if (!website.trim() || !brief.trim()) return;
    setSuggesting(true); setSuggestError("");
    try {
      const res = await fetch("/api/tools/keyword-planner", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", website: website.trim(), brief: brief.trim(), location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const groups: AdGroup[] = data.adGroups ?? [];
      setAdGroups(groups);
      setRationale(data.rationale ?? "");
      setWebsiteContext(data.websiteContext ?? "");
      // Select all keywords by default
      const allKeys = new Set<string>();
      for (const g of groups) for (const kw of g.keywords) allKeys.add(kwKey(g.name, kw));
      setSelectedKws(allKeys);
      setCollapsedGroups(new Set()); // expand all
      setStep(2);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSuggesting(false);
    }
  }

  // ── Research ─────────────────────────────────────────────────────────────────
  async function handleResearch() {
    const selectedGroups = adGroups.map((g) => ({
      name: g.name,
      keywords: g.keywords.filter((kw) => selectedKws.has(kwKey(g.name, kw))),
    })).filter((g) => g.keywords.length > 0);
    if (!selectedGroups.length) return;
    setResearching(true); setResearchError("");
    try {
      const res = await fetch("/api/tools/keyword-planner", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "research", adGroups: selectedGroups, website: website.trim(), location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      const fetchedIdeas: KeywordIdea[] = data.ideas ?? [];
      setIdeas(fetchedIdeas);

      // ── Auto-fill Max CPC: volume-weighted average of highTopOfPageBidMicros ──
      const validBids = fetchedIdeas.filter((k) => k.highTopOfPageBidMicros > 0);
      if (validBids.length > 0) {
        const totalVol = validBids.reduce((s, k) => s + k.avgMonthlySearches, 0);
        const weightedMicros = validBids.reduce(
          (s, k) => s + k.highTopOfPageBidMicros * k.avgMonthlySearches,
          0
        );
        const smartCpc = totalVol > 0 ? (weightedMicros / totalVol / 1_000_000).toFixed(2) : "";
        if (smartCpc) {
          setMaxCpc(smartCpc);
          setCpcAutoFilled(true);
        }
      }

      // ── Auto-fill Conversion Rate via AI (non-blocking background call) ──────
      const topKws = [...fetchedIdeas]
        .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches)
        .slice(0, 15)
        .map((k) => k.text);
      fetch("/api/tools/keyword-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "smart-defaults", website: website.trim(), brief, keywords: topKws }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.conversionRate === "number") {
            setConversionRate(String(d.conversionRate));
            setCrAutoFilled(true);
          }
        })
        .catch(() => {}); // silently fail — default stays

      // Auto-set title for save panel
      const host = (() => { try { return new URL(website.trim()).hostname.replace(/^www\./, ""); } catch { return website.trim(); } })();
      const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      setResearchTitle(`${host} – ${dateStr}`);
      setCurrentResearchId(null);

      setStep(3);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setResearching(false);
    }
  }

  // ── Selection helpers ─────────────────────────────────────────────────────────
  const totalKws = adGroups.reduce((s, g) => s + g.keywords.length, 0);
  const selectedCount = selectedKws.size;

  function groupSelectedCount(g: AdGroup) {
    return g.keywords.filter((kw) => selectedKws.has(kwKey(g.name, kw))).length;
  }

  function toggleGroup(g: AdGroup) {
    const allSelected = groupSelectedCount(g) === g.keywords.length;
    setSelectedKws((prev) => {
      const next = new Set(prev);
      for (const kw of g.keywords) allSelected ? next.delete(kwKey(g.name, kw)) : next.add(kwKey(g.name, kw));
      return next;
    });
  }

  function toggleKw(groupName: string, kw: string) {
    setSelectedKws((prev) => {
      const next = new Set(prev);
      const k = kwKey(groupName, kw);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  function toggleAllGlobal() {
    if (selectedCount === totalKws) {
      setSelectedKws(new Set());
    } else {
      const all = new Set<string>();
      for (const g of adGroups) for (const kw of g.keywords) all.add(kwKey(g.name, kw));
      setSelectedKws(all);
    }
  }

  function addKwToGroup(groupName: string) {
    const kw = (groupInputs[groupName] ?? "").trim();
    if (!kw) return;
    setAdGroups((prev) => prev.map((g) => g.name === groupName ? { ...g, keywords: [...g.keywords, kw] } : g));
    setSelectedKws((prev) => new Set([...prev, kwKey(groupName, kw)]));
    setGroupInputs((prev) => ({ ...prev, [groupName]: "" }));
  }

  function removeKwFromGroup(groupName: string, kw: string) {
    setAdGroups((prev) => prev.map((g) => g.name === groupName ? { ...g, keywords: g.keywords.filter((k) => k !== kw) } : g));
    setSelectedKws((prev) => { const next = new Set(prev); next.delete(kwKey(groupName, kw)); return next; });
  }

  // ── Step 3 derived data ───────────────────────────────────────────────────────
  const cpcMicros = maxCpc ? Math.round(parseFloat(maxCpc) * 1_000_000) : 0;
  const totalSearches = ideas.reduce((s, i) => s + i.avgMonthlySearches, 0);
  const avgCompIndex = ideas.length ? Math.round(ideas.reduce((s, i) => s + i.competitionIndex, 0) / ideas.length) : 0;
  const avgCpc = ideas.length ? ideas.reduce((s, i) => s + (i.lowTopOfPageBidMicros + i.highTopOfPageBidMicros) / 2, 0) / ideas.length / 1_000_000 : 0;
  const totalClicks = ideas.reduce((s, i) => s + estimateForecast(i, cpcMicros).clicks, 0);
  const totalCost = ideas.reduce((s, i) => s + estimateForecast(i, cpcMicros).costPounds, 0);

  const trendMap: Record<string, number> = {};
  for (const idea of ideas) {
    for (const v of idea.monthlySearchVolumes) {
      const key = `${MONTH_ABBR[v.month] ?? v.month} ${v.year}`;
      trendMap[key] = (trendMap[key] ?? 0) + v.searches;
    }
  }
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => {
      const [am, ay] = a.split(" "), [bm, by] = b.split(" ");
      const dy = parseInt(ay) - parseInt(by);
      if (dy !== 0) return dy;
      return (MONTH_ORDER[Object.keys(MONTH_ABBR).find((k) => MONTH_ABBR[k] === am) ?? ""] ?? 0) -
             (MONTH_ORDER[Object.keys(MONTH_ABBR).find((k) => MONTH_ABBR[k] === bm) ?? ""] ?? 0);
    })
    .slice(-13)
    .map(([label, volume]) => ({ label, volume }));

  // ── Forecaster derived data ───────────────────────────────────────────
  const DAYS_PER_MONTH = 30.4;
  const budgetPounds = monthlyBudget ? parseFloat(monthlyBudget) : 0;
  const convRatePct = conversionRate ? parseFloat(conversionRate) : 3;
  const maxCpcPounds = maxCpc ? parseFloat(maxCpc) : 0;
  const forecastMetrics = buildForecastAtBudget(ideas, budgetPounds, maxCpcPounds, convRatePct);
  const forecastCurveData = budgetPounds > 0
    ? buildForecastCurve(ideas, budgetPounds, maxCpcPounds, convRatePct)
    : [];

  function handleMonthlyBudgetChange(value: string) {
    setMonthlyBudget(value);
    const n = parseFloat(value);
    setDailyBudget(isNaN(n) || value === "" ? "" : (n / DAYS_PER_MONTH).toFixed(2));
  }

  function handleDailyBudgetChange(value: string) {
    setDailyBudget(value);
    const n = parseFloat(value);
    setMonthlyBudget(isNaN(n) || value === "" ? "" : (n * DAYS_PER_MONTH).toFixed(0));
  }

  function handleSort(field: string) {
    const f = field as keyof KeywordIdea;
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("desc"); }
  }

  const sortedIdeas = [...ideas].sort((a, b) => {
    const av = a[sortField] as number | string, bv = b[sortField] as number | string;
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Group ideas for grouped view
  const uniqueGroups = [...new Set(sortedIdeas.map((i) => i.adGroup))];

  const thStyle = (field?: string): React.CSSProperties => ({
    padding: "12px 16px", fontWeight: 600, fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.06em", whiteSpace: "nowrap",
    color: field && sortField === field ? "var(--accent)" : "var(--text-3)",
    cursor: field ? "pointer" : "default", userSelect: "none",
    background: "var(--bg)", borderBottom: "1px solid var(--border-subtle)",
  });

  const tdStyle: React.CSSProperties = { padding: "10px 16px", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      <ClientBackLink />
      <ClientFilterBanner />

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Proposal Generator</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>AI-powered proposal generation with keyword research, pricing strategy, and competitor analysis</p>
          </div>
        </div>
      </div>

      {/* ── Saved Researches panel ── */}
      {savedResearches.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-header" style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => {}}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FolderOpen style={{ width: 15, height: 15, color: "var(--accent)" }} />
              <p className="card-title" style={{ fontSize: 14 }}>Saved Researches</p>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", background: "var(--border-subtle)", borderRadius: 10, padding: "1px 7px" }}>{savedResearches.length}</span>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {savedResearches.map((r) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: "var(--r)",
                  background: currentResearchId === r.id ? "var(--accent-bg)" : "var(--bg)",
                  border: `1px solid ${currentResearchId === r.id ? "var(--accent)" : "var(--border-subtle)"}`,
                  transition: "all 0.15s",
                }}>
                  {renamingId === r.id ? (
                    <form style={{ flex: 1, display: "flex", gap: 8 }}
                      onSubmit={(e) => { e.preventDefault(); handleRenameResearch(r.id, renameValue); }}>
                      <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        style={{ ...inputStyle, padding: "4px 10px", fontSize: 13, flex: 1 }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                      <button type="submit" className="btn btn-primary btn-sm" style={{ padding: "4px 12px" }}>Save</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenamingId(null)}>
                        <X style={{ width: 13, height: 13 }} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</p>
                        <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 2 }}>
                          {r.website} &middot; {new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ gap: 5, flexShrink: 0 }}
                        onClick={() => handleLoadResearch(r.id)}>
                        Load
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px", flexShrink: 0 }}
                        title="Rename" onClick={() => { setRenamingId(r.id); setRenameValue(r.title); }}>
                        <Pencil style={{ width: 13, height: 13 }} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px", flexShrink: 0, color: "var(--danger)" }}
                        title="Delete" onClick={() => handleDeleteResearch(r.id)}>
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
        {([{ num: 1, label: "Brief" }, { num: 2, label: "Ad Groups" }, { num: 3, label: "Results" }] as { num: 1|2|3; label: string }[]).map(({ num, label }, i, arr) => (
          <div key={num} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: "50%", fontSize: 12, fontWeight: 700,
              border: `2px solid ${step >= num ? "var(--accent)" : "var(--border)"}`,
              background: step === num ? "var(--accent)" : step > num ? "var(--accent-bg)" : "var(--surface)",
              color: step === num ? "white" : step > num ? "var(--accent)" : "var(--text-3)",
              transition: "all 0.2s", flexShrink: 0,
            }}>
              {step > num ? <Check style={{ width: 12, height: 12 }} /> : num}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: step >= num ? "var(--text)" : "var(--text-3)" }}>{label}</span>
            {i < arr.length - 1 && <ChevronRight style={{ width: 14, height: 14, color: "var(--text-4)", marginLeft: 4 }} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Brief ── */}
      {step === 1 && (
        <div className="card" style={{ maxWidth: 680 }}>
          <div className="card-header">
            <div>
              <p className="card-title">Campaign Brief</p>
              <p className="card-subtitle">Describe the business \u2014 AI will generate 200+ keywords organised into ad groups</p>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Client website</label>
              <div style={{ position: "relative" }}>
                <Globe style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--text-3)", pointerEvents: "none" }} />
                <input type="url" style={{ ...inputStyle, paddingLeft: 36 }} placeholder="https://example.com" value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Target location</label>
              <select style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Campaign brief</label>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 120, lineHeight: 1.6 }}
                placeholder="Describe the business, target audience, products/services, campaign goals\u2026"
                value={brief} onChange={(e) => setBrief(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
            </div>

            {/* Services to Propose */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Services to propose</label>
              <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>Select the services to recommend — the AI will use these exact packages in the proposal.</p>
              {!pricingStrategy ? (
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                  No pricing configured. <Link href="/tools/pricing" style={{ color: "var(--accent)", textDecoration: "underline" }}>Set up pricing →</Link>
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {((pricingStrategy.focusPackages?.length ?? 0) > 0 || (pricingStrategy.retainerPackages?.length ?? 0) > 0) && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Packages</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          ...(pricingStrategy.focusPackages ?? []).map(p => ({ name: p.name, price: `${p.monthlyFee}/mo` })),
                          ...(pricingStrategy.retainerPackages ?? []).map(p => ({ name: p.name, price: `${p.priceRange}/mo` })),
                        ].map(pkg => {
                          const selected = proposedServices.includes(pkg.name);
                          return (
                            <button key={pkg.name} type="button" onClick={() => toggleService(pkg.name)}
                              style={{ padding: "10px 14px", borderRadius: "var(--r)", border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent-bg)" : "var(--surface)", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {selected && <Check style={{ width: 10, height: 10, color: "white" }} />}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{pkg.name}</p>
                                  <p style={{ fontSize: 11, color: selected ? "var(--accent-text)" : "var(--text-3)" }}>{pkg.price}</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(pricingStrategy.singleServices?.length ?? 0) > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Single-Channel Services</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {pricingStrategy.singleServices!.map(s => {
                          const selected = proposedServices.includes(s.name);
                          return (
                            <button key={s.name} type="button" onClick={() => toggleService(s.name)}
                              style={{ padding: "5px 12px", borderRadius: 99, border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent-bg)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: selected ? "var(--accent-text)" : "var(--text-2)", cursor: "pointer", transition: "all 0.15s" }}>
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(pricingStrategy.otherServices?.length ?? 0) > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Other Services</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {pricingStrategy.otherServices!.map(s => {
                          const selected = proposedServices.includes(s.name);
                          return (
                            <button key={s.name} type="button" onClick={() => toggleService(s.name)}
                              style={{ padding: "5px 12px", borderRadius: 99, border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: selected ? "var(--accent-bg)" : "var(--surface)", fontSize: 12, fontWeight: 500, color: selected ? "var(--accent-text)" : "var(--text-2)", cursor: "pointer", transition: "all 0.15s" }}>
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {suggestError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--danger-text)" }}>
                <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />{suggestError}
              </div>
            )}
            <button className="btn btn-primary" style={{ justifyContent: "center", height: 44 }} onClick={handleSuggest} disabled={!website.trim() || !brief.trim() || suggesting}>
              {suggesting
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Generating ad groups & keywords\u2026</>
                : <><Layers style={{ width: 16, height: 16 }} /> Generate Ad Groups with AI</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review Ad Groups ── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {rationale && (
            <div style={{ padding: "16px 20px", background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)", borderRadius: "var(--r-lg)", fontSize: 13, maxWidth: 860 }}>
              <p style={{ fontWeight: 600, color: "var(--accent-text)", marginBottom: 4 }}>AI Strategy Note</p>
              <p style={{ color: "var(--accent-text)", lineHeight: 1.6 }}>{rationale}</p>
            </div>
          )}

          {/* Global controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 860 }}>
            <p style={{ fontSize: 13, color: "var(--text-2)" }}>
              <strong style={{ color: "var(--text)" }}>{selectedCount}</strong> of <strong style={{ color: "var(--text)" }}>{totalKws}</strong> keywords selected across {adGroups.length} ad groups
            </p>
            <button className="btn btn-ghost btn-sm" onClick={toggleAllGlobal} style={{ fontSize: 12 }}>
              {selectedCount === totalKws ? "Deselect all" : "Select all"}
            </button>
          </div>

          {/* Ad group cards */}
          {adGroups.map((group) => {
            const gSel = groupSelectedCount(group);
            const gTotal = group.keywords.length;
            const allSel = gSel === gTotal;
            const noneSel = gSel === 0;
            const collapsed = collapsedGroups.has(group.name);

            return (
              <div key={group.name} className="card" style={{ maxWidth: 860 }}>
                {/* Group header */}
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: collapsed ? "none" : "1px solid var(--border-subtle)" }}
                  onClick={() => setCollapsedGroups((prev) => { const next = new Set(prev); collapsed ? next.delete(group.name) : next.add(group.name); return next; })}>
                  {/* Group checkbox */}
                  <input type="checkbox" checked={allSel} ref={(el) => { if (el) el.indeterminate = !allSel && !noneSel; }}
                    style={{ accentColor: "var(--accent)", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }}
                    onChange={() => toggleGroup(group)}
                    onClick={(e) => e.stopPropagation()} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.2 }}>{group.name}</p>
                    {group.rationale && !collapsed && (
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{group.rationale}</p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                    background: allSel ? "var(--accent-bg)" : noneSel ? "var(--border-subtle)" : "#fef3c7",
                    color: allSel ? "var(--accent-text)" : noneSel ? "var(--text-3)" : "#92400e",
                    whiteSpace: "nowrap", flexShrink: 0 }}>
                    {gSel}/{gTotal}
                  </span>
                  {collapsed
                    ? <ChevronDown style={{ width: 15, height: 15, color: "var(--text-3)", flexShrink: 0 }} />
                    : <ChevronUp style={{ width: 15, height: 15, color: "var(--text-3)", flexShrink: 0 }} />}
                </div>

                {/* Keywords list */}
                {!collapsed && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                      {group.keywords.map((kw) => {
                        const checked = selectedKws.has(kwKey(group.name, kw));
                        return (
                          <div key={kw} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 20px", borderBottom: "1px solid var(--border-subtle)", background: checked ? "transparent" : "var(--bg)" }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleKw(group.name, kw)}
                              style={{ accentColor: "var(--accent)", width: 13, height: 13, cursor: "pointer", flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{kw}</span>
                            <button onClick={() => removeKwFromGroup(group.name, kw)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2, display: "flex", alignItems: "center", flexShrink: 0 }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-4)")}>
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {/* Add keyword to group */}
                    <div style={{ padding: "10px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
                      <input type="text" style={{ ...inputStyle, fontSize: 12, padding: "7px 12px" }}
                        placeholder={`Add keyword to ${group.name}\u2026`}
                        value={groupInputs[group.name] ?? ""}
                        onChange={(e) => setGroupInputs((prev) => ({ ...prev, [group.name]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addKwToGroup(group.name)}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                      <button className="btn btn-secondary btn-sm" onClick={() => addKwToGroup(group.name)}
                        disabled={!(groupInputs[group.name] ?? "").trim()} style={{ flexShrink: 0 }}>
                        <Plus style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {researchError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--danger-text)", maxWidth: 860 }}>
              <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />{researchError}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", gap: 12, maxWidth: 860 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}><ChevronLeft style={{ width: 16, height: 16 }} /> Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center", height: 44 }} onClick={handleResearch} disabled={researching || selectedCount === 0}>
              {researching
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Fetching Google Ads data for {selectedCount} keywords\u2026</>
                : <><Search style={{ width: 16, height: 16 }} /> Research {selectedCount} Keywords</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Results ── */}
      {step === 3 && ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}><ChevronLeft style={{ width: 15, height: 15 }} /> Edit Keywords</button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {activeTab === "keywords" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", whiteSpace: "nowrap" }}>Max CPC (\xa3)</label>
                    <input type="number" min="0" step="0.01" style={{ ...inputStyle, width: 100, fontSize: 13 }} placeholder="1.50" value={maxCpc}
                      onChange={(e) => { setMaxCpc(e.target.value); setCpcAutoFilled(false); }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                    {cpcAutoFilled && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "var(--success)", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>AUTO</span>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setGroupedView((v) => !v)} style={{ gap: 6 }}>
                    <Layers style={{ width: 14, height: 14 }} />{groupedView ? "Flat view" : "Group by ad group"}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(sortedIdeas, cpcMicros)}>
                    <Download style={{ width: 14, height: 14 }} /> Export CSV
                  </button>
                </>
              )}

              {/* Save research */}
              {showSavePanel ? (
                <form style={{ display: "flex", alignItems: "center", gap: 6 }}
                  onSubmit={(e) => { e.preventDefault(); handleSaveResearch(); }}>
                  <input autoFocus value={researchTitle} onChange={(e) => setResearchTitle(e.target.value)}
                    placeholder="Research title…"
                    style={{ ...inputStyle, padding: "5px 10px", fontSize: 13, width: 220 }}
                    onFocus={(ev) => (ev.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(ev) => (ev.currentTarget.style.borderColor = "var(--border)")} />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={savingResearch || !researchTitle.trim()}>
                    {savingResearch ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : (currentResearchId ? "Update" : "Save")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSavePanel(false)}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                </form>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} onClick={() => setShowSavePanel(true)}>
                  <BookmarkPlus style={{ width: 14, height: 14 }} />
                  {currentResearchId ? "Update" : "Save"}
                </button>
              )}
              <button className="btn btn-primary btn-sm" style={{ gap: 5 }} onClick={() => { setShowProposalModal(true); setProposalError(""); setGeneratedProposalId(null); }}>
                <FileText style={{ width: 14, height: 14 }} /> Generate Proposal
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-subtle)", marginBottom: -8 }}>
            {([{ id: "keywords", label: "Keywords", icon: <Search style={{ width: 14, height: 14 }} /> },
               { id: "forecaster", label: "Forecaster", icon: <Activity style={{ width: 14, height: 14 }} /> }] as { id: "keywords" | "forecaster"; label: string; icon: React.ReactNode }[]).map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 20px", fontSize: 13, fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer",
                  borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                  color: activeTab === tab.id ? "var(--accent)" : "var(--text-3)",
                  transition: "color 0.15s", marginBottom: -1,
                }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── Keywords tab ───────────────────────────────────────────────────── */}
          {activeTab === "keywords" && (
            <>
              {/* Summary metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[
                  { icon: <BarChart2 style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Total Monthly Searches", value: fmtNum(totalSearches), sub: `${ideas.length} keywords with volume` },
                  { icon: <Target style={{ width: 16, height: 16, color: "var(--warning)" }} />, label: "Avg Competition", value: String(avgCompIndex), sub: "0\u2013100 index" },
                  { icon: <DollarSign style={{ width: 16, height: 16, color: "var(--success)" }} />, label: "Avg CPC", value: `\xa3${avgCpc.toFixed(2)}`, sub: "mid-range bid estimate" },
                  { icon: <Zap style={{ width: 16, height: 16, color: "#0ea5e9" }} />, label: "Est. Monthly Clicks", value: fmtNum(totalClicks), sub: cpcMicros ? `~\xa3${totalCost.toFixed(0)}/mo` : "enter Max CPC to estimate" },
                ].map((m) => (
                  <div key={m.label} className="metric-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>{m.icon}<span className="metric-label">{m.label}</span></div>
                    <p className="metric-value" style={{ fontSize: 22 }}>{m.value}</p>
                    <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Trend chart */}
              {trendData.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div>
                      <p className="card-title">Aggregate Search Volume Trend</p>
                      <p className="card-subtitle">Combined monthly searches across all keywords</p>
                    </div>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={fmtNum} />
                        <Tooltip formatter={(v: unknown) => [fmtNum(Number(v ?? 0)), "Searches"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", boxShadow: "0 4px 8px -2px rgb(0 0 0/0.08)" }} />
                        <Line type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Keyword data table */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <p className="card-title">Keyword Data</p>
                    <p className="card-subtitle">{ideas.length} keywords with search volume \u2014 {uniqueGroups.length} ad groups</p>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        {!groupedView && (
                          <th style={{ ...thStyle(), textAlign: "left" }}>Ad Group</th>
                        )}
                        <th style={{ ...thStyle("text"), textAlign: "left" }} onClick={() => handleSort("text")}>
                          Keyword <span style={{ opacity: 0.6 }}>{sortField === "text" ? (sortDir === "desc" ? "\u2193" : "\u2191") : "\u2195"}</span>
                        </th>
                        <th style={{ ...thStyle("avgMonthlySearches"), textAlign: "right" }} onClick={() => handleSort("avgMonthlySearches")}>
                          Avg Monthly <span style={{ opacity: 0.6 }}>{sortField === "avgMonthlySearches" ? (sortDir === "desc" ? "\u2193" : "\u2191") : "\u2195"}</span>
                        </th>
                        <th style={{ ...thStyle(), textAlign: "center" }}>3M Trend</th>
                        <th style={{ ...thStyle("competition"), textAlign: "center" }} onClick={() => handleSort("competition")}>
                          Competition <span style={{ opacity: 0.6 }}>{sortField === "competition" ? (sortDir === "desc" ? "\u2193" : "\u2191") : "\u2195"}</span>
                        </th>
                        <th style={{ ...thStyle("competitionIndex"), textAlign: "right" }} onClick={() => handleSort("competitionIndex")}>
                          Comp. Index <span style={{ opacity: 0.6 }}>{sortField === "competitionIndex" ? (sortDir === "desc" ? "\u2193" : "\u2191") : "\u2195"}</span>
                        </th>
                        <th style={{ ...thStyle("lowTopOfPageBidMicros"), textAlign: "right" }} onClick={() => handleSort("lowTopOfPageBidMicros")}>
                          Low Bid <span style={{ opacity: 0.6 }}>{sortField === "lowTopOfPageBidMicros" ? (sortDir === "desc" ? "\u2193" : "\u2191") : "\u2195"}</span>
                        </th>
                        <th style={{ ...thStyle("highTopOfPageBidMicros"), textAlign: "right" }} onClick={() => handleSort("highTopOfPageBidMicros")}>
                          High Bid <span style={{ opacity: 0.6 }}>{sortField === "highTopOfPageBidMicros" ? (sortDir === "desc" ? "\u2193" : "\u2191") : "\u2195"}</span>
                        </th>
                        <th style={{ ...thStyle(), textAlign: "right" }}>Est. Clicks</th>
                        <th style={{ ...thStyle(), textAlign: "right" }}>Est. Cost/mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedView ? (
                        uniqueGroups.map((groupName) => {
                          const groupIdeas = sortedIdeas.filter((i) => i.adGroup === groupName);
                          const gSearches = groupIdeas.reduce((s, i) => s + i.avgMonthlySearches, 0);
                          const gClicks = groupIdeas.reduce((s, i) => s + estimateForecast(i, cpcMicros).clicks, 0);
                          const gCost = groupIdeas.reduce((s, i) => s + estimateForecast(i, cpcMicros).costPounds, 0);
                          return (
                            <>
                              {/* Group header row */}
                              <tr key={`hdr-${groupName}`} style={{ background: "var(--accent-bg)" }}>
                                <td colSpan={9} style={{ padding: "8px 16px" }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                      \u2022 {groupName}
                                    </span>
                                    <span style={{ fontSize: 11, color: "var(--accent-text)", opacity: 0.8 }}>
                                      {groupIdeas.length} keywords \u00b7 {fmtNum(gSearches)}/mo searches \u00b7 {fmtNum(gClicks)} est. clicks{cpcMicros ? ` \u00b7 \xa3${gCost.toFixed(0)} est. cost` : ""}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {/* Keyword rows */}
                              {groupIdeas.map((idea, i) => {
                                const { clicks, costPounds } = estimateForecast(idea, cpcMicros);
                                const trend = calcTrendChange(idea.monthlySearchVolumes);
                                return (
                                  <tr key={`${groupName}-${i}`} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    <td style={{ ...tdStyle, color: "var(--text)", fontWeight: 500, paddingLeft: 24 }}>{idea.text}</td>
                                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(idea.avgMonthlySearches)}</td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>
                                      {trend ? (
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                                          background: trend.up ? "#d1fae5" : "#fee2e2",
                                          color: trend.up ? "#065f46" : "#991b1b" }}>
                                          {trend.up
                                            ? <TrendingUp style={{ width: 10, height: 10 }} />
                                            : <TrendingDown style={{ width: 10, height: 10 }} />}
                                          {trend.up ? "+" : ""}{trend.pct.toFixed(0)}%
                                        </span>
                                      ) : <span style={{ color: "var(--text-4)" }}>\u2014</span>}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: "center" }}>
                                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, ...competitionBadgeStyle(idea.competition) }}>{competitionLabel(idea.competition)}</span>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: "right" }}>{idea.competitionIndex || "\u2014"}</td>
                                    <td style={{ ...tdStyle, textAlign: "right" }}>{microsToPounds(idea.lowTopOfPageBidMicros)}</td>
                                    <td style={{ ...tdStyle, textAlign: "right" }}>{microsToPounds(idea.highTopOfPageBidMicros)}</td>
                                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(clicks)}</td>
                                    <td style={{ ...tdStyle, textAlign: "right", color: cpcMicros ? "var(--text-2)" : "var(--text-4)" }}>{cpcMicros ? `\xa3${costPounds.toFixed(2)}` : "\u2014"}</td>
                                  </tr>
                                );
                              })}
                            </>
                          );
                        })
                      ) : (
                        sortedIdeas.map((idea, i) => {
                          const { clicks, costPounds } = estimateForecast(idea, cpcMicros);
                          const trend = calcTrendChange(idea.monthlySearchVolumes);
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                              <td style={{ ...tdStyle, maxWidth: 160 }}>
                                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--accent-bg)", color: "var(--accent-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{idea.adGroup}</span>
                              </td>
                              <td style={{ ...tdStyle, color: "var(--text)", fontWeight: 500 }}>{idea.text}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(idea.avgMonthlySearches)}</td>
                              <td style={{ ...tdStyle, textAlign: "center" }}>
                                {trend ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                                    background: trend.up ? "#d1fae5" : "#fee2e2",
                                    color: trend.up ? "#065f46" : "#991b1b" }}>
                                    {trend.up
                                      ? <TrendingUp style={{ width: 10, height: 10 }} />
                                      : <TrendingDown style={{ width: 10, height: 10 }} />}
                                    {trend.up ? "+" : ""}{trend.pct.toFixed(0)}%
                                  </span>
                                ) : <span style={{ color: "var(--text-4)" }}>\u2014</span>}
                              </td>
                              <td style={{ ...tdStyle, textAlign: "center" }}>
                                <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, ...competitionBadgeStyle(idea.competition) }}>{competitionLabel(idea.competition)}</span>
                              </td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{idea.competitionIndex || "\u2014"}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{microsToPounds(idea.lowTopOfPageBidMicros)}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{microsToPounds(idea.highTopOfPageBidMicros)}</td>
                              <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(clicks)}</td>
                              <td style={{ ...tdStyle, textAlign: "right", color: cpcMicros ? "var(--text-2)" : "var(--text-4)" }}>{cpcMicros ? `\xa3${costPounds.toFixed(2)}` : "\u2014"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── Forecaster tab ───────────────────────────────────────────────── */}
          {activeTab === "forecaster" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              {/* Inputs */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <p className="card-title">Forecast Settings</p>
                    <p className="card-subtitle">Adjust budget and bids to see projected performance</p>
                  </div>
                </div>
                <div className="card-body" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  {/* Daily Budget */}
                  <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Daily Budget (\xa3)</label>
                    <input type="number" min="0" step="0.01"
                      style={{ ...inputStyle, fontSize: 14 }}
                      placeholder="e.g. 16.43"
                      value={dailyBudget}
                      onChange={(e) => handleDailyBudgetChange(e.target.value)}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                    <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 5 }}>Updates monthly automatically</p>
                  </div>
                  {/* Monthly Budget */}
                  <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Monthly Budget (\xa3)</label>
                    <input type="number" min="0" step="1"
                      style={{ ...inputStyle, fontSize: 14 }}
                      placeholder="e.g. 500"
                      value={monthlyBudget}
                      onChange={(e) => handleMonthlyBudgetChange(e.target.value)}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                    <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 5 }}>
                      {dailyBudget ? `\xa3${dailyBudget}/day \xd7 30.4 days` : "Updates daily automatically"}
                    </p>
                  </div>
                  {/* Max CPC */}
                  <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Max CPC (\xa3)</label>
                      {cpcAutoFilled && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "var(--success)", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 4, padding: "1px 6px" }}>AUTO</span>
                      )}
                    </div>
                    <input type="number" min="0" step="0.01"
                      style={{ ...inputStyle, fontSize: 14 }}
                      placeholder="e.g. 1.50"
                      value={maxCpc}
                      onChange={(e) => { setMaxCpc(e.target.value); setCpcAutoFilled(false); }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                    <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 5 }}>
                      {cpcAutoFilled ? "Volume-weighted bid estimate from keyword data" : "Leave blank to use keyword bid estimates"}
                    </p>
                  </div>
                  {/* Conversion Rate */}
                  <div style={{ flex: "1 1 160px", minWidth: 140 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Conversion Rate (%)</label>
                      {crAutoFilled && (
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: "var(--accent)", background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.3)", borderRadius: 4, padding: "1px 6px" }}>AI</span>
                      )}
                    </div>
                    <input type="number" min="0" step="0.01"
                      style={{ ...inputStyle, fontSize: 14 }}
                      placeholder="e.g. 3"
                      value={conversionRate}
                      onChange={(e) => { setConversionRate(e.target.value); setCrAutoFilled(false); }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
                    <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 5 }}>
                      {crAutoFilled ? "AI estimate based on business type and keywords" : "Estimated % of clicks that convert"}
                    </p>
                  </div>
                </div>
              </div>

              {budgetPounds > 0 ? (
                <>
                  {/* Forecast metric cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                    {([
                      { icon: <MousePointer style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Est. Clicks", value: fmtNum(forecastMetrics.clicks), sub: `at \xa3${budgetPounds.toFixed(0)}/mo budget` },
                      { icon: <Eye style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Est. Impressions", value: fmtNum(forecastMetrics.impressions), sub: `CTR: ${forecastMetrics.ctr.toFixed(1)}%` },
                      { icon: <Users style={{ width: 16, height: 16, color: "var(--success)" }} />, label: "Est. Conversions", value: fmtNum(forecastMetrics.conversions), sub: `at ${convRatePct.toFixed(1)}% conv. rate` },
                      { icon: <DollarSign style={{ width: 16, height: 16, color: "var(--warning)" }} />, label: "Avg CPA", value: forecastMetrics.avgCpa > 0 ? `\xa3${forecastMetrics.avgCpa.toFixed(2)}` : "\u2014", sub: "cost per conversion" },
                    ] as { icon: React.ReactNode; label: string; value: string; sub: string }[]).map((m) => (
                      <div key={m.label} className="metric-card">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>{m.icon}<span className="metric-label">{m.label}</span></div>
                        <p className="metric-value" style={{ fontSize: 22 }}>{m.value}</p>
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{m.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    {([
                      { icon: <DollarSign style={{ width: 16, height: 16, color: "var(--danger)" }} />, label: "Total Cost", value: `\xa3${forecastMetrics.cost.toFixed(0)}`, sub: "estimated monthly spend" },
                      { icon: <Target style={{ width: 16, height: 16, color: "var(--accent-2)" }} />, label: "Avg CTR", value: `${forecastMetrics.ctr.toFixed(2)}%`, sub: "click-through rate" },
                      { icon: <Zap style={{ width: 16, height: 16, color: "#0ea5e9" }} />, label: "Avg CPC", value: forecastMetrics.avgCpc > 0 ? `\xa3${forecastMetrics.avgCpc.toFixed(2)}` : "\u2014", sub: "average cost per click" },
                    ] as { icon: React.ReactNode; label: string; value: string; sub: string }[]).map((m) => (
                      <div key={m.label} className="metric-card">
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>{m.icon}<span className="metric-label">{m.label}</span></div>
                        <p className="metric-value" style={{ fontSize: 22 }}>{m.value}</p>
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{m.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Spend curve chart */}
                  {forecastCurveData.length > 1 && (
                    <div className="card">
                      <div className="card-header">
                        <div>
                          <p className="card-title">Conversions vs Budget</p>
                          <p className="card-subtitle">Estimated conversions at different monthly spend levels \u2014 dot marks your entered budget</p>
                        </div>
                      </div>
                      <div className="card-body">
                        <ResponsiveContainer width="100%" height={240}>
                          <LineChart data={forecastCurveData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="budget" tickFormatter={(v) => `\xa3${fmtNum(v)}`}
                              tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }}
                              label={{ value: "Monthly Budget", position: "insideBottom", offset: -4, fontSize: 11, fill: "#94a3b8" }} />
                            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                              label={{ value: "Conversions", angle: -90, position: "insideLeft", fontSize: 11, fill: "#94a3b8" }} />
                            <Tooltip
                              formatter={(v: unknown, name: unknown) => [
                                fmtNum(Number(v ?? 0)),
                                String(name) === "conversions" ? "Conversions" : "Clicks",
                              ]}
                              labelFormatter={(l) => `Budget: \xa3${fmtNum(Number(l))}`}
                              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", boxShadow: "0 4px 8px -2px rgb(0 0 0/0.08)" }} />
                            <Line type="monotone" dataKey="conversions" stroke="#6366f1" strokeWidth={2.5} dot={(props) => {
                              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { budget: number } };
                              if (payload.budget !== Math.round(budgetPounds)) return <g key={`no-dot-${cx}`} />;
                              return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={6} fill="#6366f1" stroke="white" strokeWidth={2} />;
                            }} activeDot={{ r: 5, fill: "#6366f1" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card" style={{ padding: 48, textAlign: "center" }}>
                  <Activity style={{ width: 36, height: 36, color: "var(--text-4)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 500 }}>Enter a monthly budget above</p>
                  <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 6 }}>The forecaster will project clicks, impressions, and conversions based on the keywords you selected.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 3 && ideas.length === 0 && (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <Search style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, color: "var(--text-3)" }}>No keywords with search volume were found.</p>
          <p style={{ fontSize: 12, color: "var(--text-4)", marginTop: 8 }}>Try selecting more keywords or adjusting the location.</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setStep(2)}>
            <ChevronLeft style={{ width: 15, height: 15 }} /> Back to keywords
          </button>
        </div>
      )}

      {/* ── Proposal Generation Modal ── */}
      {showProposalModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowProposalModal(false); }}>
          <div style={{
            background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "0 20px 60px -12px rgba(0,0,0,0.3)",
            width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto",
          }}>
            {/* Modal header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText style={{ width: 16, height: 16, color: "white" }} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Generate Client Proposal</p>
                  <p style={{ fontSize: 12, color: "var(--text-3)" }}>AI-generated proposal using your keyword research data</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => setShowProposalModal(false)}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Client name */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Client Name *</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Acme Corporation"
                  value={proposalClientName}
                  onChange={(e) => setProposalClientName(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  autoFocus
                />
              </div>

              {proposalError && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--danger-text)" }}>
                  <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />{proposalError}
                </div>
              )}

              {generatedProposalId && !generatingProposal && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--success-text)" }}>
                  <Check style={{ width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>Proposal created and saved!</span>
                  <Link href={`/tools/proposals/${generatedProposalId}`} className="btn btn-primary btn-sm" style={{ gap: 5 }}
                    onClick={() => setShowProposalModal(false)}>
                    <Eye style={{ width: 12, height: 12 }} /> View Proposal
                  </Link>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setShowProposalModal(false); setGeneratedProposalId(null); }} disabled={generatingProposal}>
                  {generatedProposalId ? "Close" : "Cancel"}
                </button>
                <button className="btn btn-primary" style={{ flex: 2, justifyContent: "center", height: 44 }}
                  onClick={handleGenerateProposal}
                  disabled={generatingProposal || !proposalClientName.trim()}>
                  {generatingProposal
                    ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Generating Proposal…</>
                    : generatedProposalId
                    ? <><FileText style={{ width: 16, height: 16 }} /> Regenerate Proposal</>
                    : <><FileText style={{ width: 16, height: 16 }} /> Generate Proposal</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
