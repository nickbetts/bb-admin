"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Wand2,
  ImagePlus,
  RefreshCw,
  Download,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface TargetingResult {
  id: string;
  name: string;
  type: string;
  topic?: string;
  path?: string[];
  description?: string;
  audienceSizeLower?: number | null;
  audienceSizeUpper?: number | null;
}

interface CuratedOption extends TargetingResult {
  why?: string;
}

interface Pillar {
  name: string;
  rationale: string;
  options: CuratedOption[];
}

interface AISuggestResponse {
  analysis: {
    explicit?: string[];
    implicit?: string[];
    adjacent?: string[];
    cultural?: string[];
    media?: string[];
    diaspora?: string[];
    niches?: string[];
    contrarian?: string[];
  } | null;
  coverage?: {
    queriesUsed: number;
    callsFired: number;
    byEndpoint: Record<string, number>;
    expansionSeeds: string[];
    expansionAdded: number;
    expansionSkippedReason?: string;
  };
  optimisation?: {
    gapWaveExecuted: boolean;
    gapWaveReason?: string;
    firstWaveTypeCoverage?: number;
  };
  thesis: string;
  pass1Queries: string[];
  pass2Queries: string[];
  gaps: string[];
  pass1ResultCount?: number;
  pass2ResultCount?: number;
  totalCandidates: number;
  pillars: Pillar[];
  warning?: string;
}

// ─── Campaign plan types ──────────────────────────────────────────────────

interface LongFormVariant {
  tone: string;
  text: string;
}

interface CreativeConcept {
  format: string;
  copyAngle?: string;
  hooks?: string[];
  headlines?: string[];
  primaryTexts?: string[];
  longFormVariants?: LongFormVariant[];
  // Legacy single-variant fields kept for backward compatibility with older plans
  hook?: string;
  headline?: string;
  primaryText?: string;
  cta: string;
  imagePrompts?: string[];
  imagePrompt?: string; // legacy single-prompt field
  why: string;
}

interface AdSetPlan {
  name: string;
  group?: string;
  geoTargeting?: string[];
  geoTargetingNotes?: string;
  expatTargeting?: string;
  cohort?: string;
  detailedTargeting?: string;
  pillarName: string;
  audienceSummary: string;
  targetingOptionIds: string[];
  exclusions?: string[];
  lookalikeStrategy?: string;
  optimizationGoal: string;
  conversionEvent?: string;
  billingEvent: string;
  dailyBudget: number;
  frequencyCap?: string;
  placements: "advantage_plus" | "manual";
  manualPlacements?: string[];
  ageRange: { min: number; max: number };
  genders: "all" | "female" | "male";
  advantageAudience: boolean;
  why: string;
  creatives: CreativeConcept[];
}

interface CampaignPlan {
  name: string;
  objective: string;
  buyingType: string;
  budgetMode: "CBO" | "ABO";
  dailyBudget: number;
  bidStrategy?: string;
  bidStrategyValue?: string;
  advantagePlus: { enabled: boolean; type: string; why: string };
  attribution: string;
  why: string;
  adSets: AdSetPlan[];
}

interface ControlsVsSuggestions {
  hardControls?: string[];
  suggestions?: string[];
  manualOverrideTriggers?: string[];
}

interface StrategyHandoffPack {
  campaignBuildOrder?: string[];
  creativeTestMatrix?: string[];
  launchChecklist?: string[];
  first14DayGuardrails?: string[];
  killScaleRules?: string[];
}

interface FullPlan {
  summary: string;
  structureRationale: string;
  controlsVsSuggestions?: ControlsVsSuggestions;
  campaigns: CampaignPlan[];
  creativeTestingFramework?: string;
  weekByWeek?: string[];
  measurement: {
    primaryKpi: string;
    secondaryKpis: string[];
    minLearningPhaseEvents: string;
    ctaToHoldOff: string;
    campaignLevelReading?: string;
  };
  risks: string[];
  scaleUp: string;
  handoffPack?: StrategyHandoffPack;
}

interface GeneratedImage {
  url: string;
  prompt: string;
  loading?: boolean;
}

function isValidCampaignPlan(value: unknown): value is FullPlan {
  if (!value || typeof value !== "object") return false;
  const campaigns = (value as { campaigns?: unknown }).campaigns;
  if (!Array.isArray(campaigns)) return false;
  return campaigns.every((campaign) => {
    if (!campaign || typeof campaign !== "object") return false;
    const adSets = (campaign as { adSets?: unknown }).adSets;
    if (!Array.isArray(adSets)) return false;
    return adSets.every((adSet) => {
      if (!adSet || typeof adSet !== "object") return false;
      return Array.isArray((adSet as { creatives?: unknown }).creatives);
    });
  });
}

// ─── Component ────────────────────────────────────────────────────────────

export default function MetaAudienceScraperPage() {
  // AI suggest
  const [brief, setBrief] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [sector, setSector] = useState("");
  const [clientName, setClientName] = useState("");
  const [geography, setGeography] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AISuggestResponse | null>(null);
  const [collapsedPillars, setCollapsedPillars] = useState<Set<string>>(new Set());

  // Selection model: pillars and options are CHECKED BY DEFAULT once AI
  // suggestions return. The user un-ticks pillars or individual options to
  // exclude them from plan generation. Storing exclusions (rather than
  // inclusions) means new AI runs default to "everything on".
  const [excludedPillars, setExcludedPillars] = useState<Set<string>>(new Set());
  const [excludedOptionIds, setExcludedOptionIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Campaign plan
  const [dailyBudget, setDailyBudget] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [objective, setObjective] = useState("");

  // Meta ad accounts (used to fire delivery estimates per ad set).
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [estimates, setEstimates] = useState<
    Record<
      string,
      | {
          ok: true;
          estimate: {
            estimatedDauLower: number;
            estimatedDauUpper: number;
            estimatedMauLower: number;
            estimatedMauUpper: number;
          };
        }
      | { ok: false; error: string }
    >
  >({});
  const [estimatesLoading, setEstimatesLoading] = useState(false);

  // ── Persistence ──────────────────────────────────────────────────────
  type SavedPlanSummary = {
    id: string;
    title: string;
    clientId: string | null;
    createdAt: string;
    updatedAt: string;
  };
  const [savedPlans, setSavedPlans] = useState<SavedPlanSummary[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const refreshSavedPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/meta-audience-scraper/plans");
      if (!res.ok) return;
      const data = (await res.json()) as { plans: SavedPlanSummary[] };
      setSavedPlans(data.plans);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshSavedPlans();
  }, [refreshSavedPlans]);

  // Per-slice refinement: which ad set or creative is the user currently
  // editing? Map of slice key -> { feedback, loading }.
  type SliceRefineState = { feedback: string; loading: boolean };
  const [sliceRefines, setSliceRefines] = useState<Record<string, SliceRefineState>>({});
  function sliceKey(ci: number, ai?: number, cri?: number) {
    if (typeof cri === "number" && typeof ai === "number") return `c${ci}-a${ai}-cr${cri}`;
    if (typeof ai === "number") return `c${ci}-a${ai}`;
    return `c${ci}`;
  }
  function setSliceFeedback(key: string, feedback: string) {
    setSliceRefines((prev) => ({
      ...prev,
      [key]: { feedback, loading: prev[key]?.loading ?? false },
    }));
  }

  useEffect(() => {
    fetch("/api/meta/accounts")
      .then((r) => r.json())
      .then((data: { id: string; name: string }[] | { error?: string }) => {
        if (Array.isArray(data)) {
          setAccounts(data);
          if (data.length > 0) setAccountId((prev) => prev || data[0].id);
        }
      })
      .catch(() => {});
  }, []);
  const [planLoading, setPlanLoading] = useState(false);
  const [plan, setPlan] = useState<FullPlan | null>(null);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refineLoading, setRefineLoading] = useState(false);
  // Trail of prior refinement notes; sent back to the AI on each refine so
  // it can reason about cumulative direction rather than treating each
  // refine in isolation.
  const [refinementHistory, setRefinementHistory] = useState<
    { feedback: string; appliedAt: string }[]
  >([]);

  // Per-creative image state — keyed by `${campaignIdx}-${adSetIdx}-${creativeIdx}`
  const [images, setImages] = useState<Record<string, GeneratedImage>>({});
  const [imagePromptOverrides, setImagePromptOverrides] = useState<Record<string, string>>({});
  const [refinePrompts, setRefinePrompts] = useState<Record<string, string>>({});

  // Convenience: an option/pillar is "active" when it's NOT in the exclusion set.
  const isPillarActive = useCallback(
    (name: string) => !excludedPillars.has(name),
    [excludedPillars],
  );
  const isOptionActive = useCallback(
    (id: string) => !excludedOptionIds.has(id),
    [excludedOptionIds],
  );

  function togglePillarActive(pillar: Pillar) {
    setExcludedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(pillar.name)) {
        next.delete(pillar.name);
        // Reactivating a pillar also reactivates any options inside it that
        // were turned off when the whole pillar was excluded.
        setExcludedOptionIds((prevOpts) => {
          const nextOpts = new Set(prevOpts);
          for (const o of pillar.options) nextOpts.delete(o.id);
          return nextOpts;
        });
      } else {
        next.add(pillar.name);
      }
      return next;
    });
  }

  function toggleOptionActive(optionId: string) {
    setExcludedOptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1200);
  }

  function togglePillar(name: string) {
    setCollapsedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // ── AI suggest ────────────────────────────────────────────────────────
  const runAiSuggest = useCallback(async () => {
    setError(null);
    setAiResult(null);
    const keywords = keywordsText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!brief.trim() && keywords.length === 0) {
      setError("Add a brief or at least one keyword.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/tools/meta-audience-scraper/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim() || undefined,
          keywords,
          sector: sector.trim() || undefined,
          clientName: clientName.trim() || undefined,
          geography: geography.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI suggestion failed");
      setAiResult(data as AISuggestResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI suggestion failed");
    } finally {
      setAiLoading(false);
    }
  }, [brief, keywordsText, sector, clientName, geography]);

  // ── Build pillars to send to the campaign-plan endpoint ────────────────
  // Active pillars are those NOT in excludedPillars; within each active
  // pillar we filter to options NOT in excludedOptionIds. Empty pillars
  // are dropped entirely.
  function buildPillarsForPlan(): {
    name: string;
    rationale: string;
    options: { id: string; name: string; type: string }[];
  }[] {
    return (aiResult?.pillars ?? [])
      .filter((p) => !excludedPillars.has(p.name))
      .map((p) => ({
        name: p.name,
        rationale: p.rationale,
        options: p.options
          .filter((o) => !excludedOptionIds.has(o.id))
          .map((o) => ({ id: o.id, name: o.name, type: o.type })),
      }))
      .filter((p) => p.options.length > 0);
  }

  // Quick stats for the plan-generation UI.
  const activeStats = useMemo(() => {
    if (!aiResult) return { pillars: 0, options: 0 };
    let p = 0;
    let o = 0;
    for (const pillar of aiResult.pillars) {
      if (excludedPillars.has(pillar.name)) continue;
      const remaining = pillar.options.filter((opt) => !excludedOptionIds.has(opt.id));
      if (remaining.length === 0) continue;
      p += 1;
      o += remaining.length;
    }
    return { pillars: p, options: o };
  }, [aiResult, excludedPillars, excludedOptionIds]);

  const buildPlan = useCallback(async () => {
    setError(null);
    const budgetNum = parseFloat(dailyBudget);
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      setError("Enter a daily budget greater than 0.");
      return;
    }
    const pillarsForPlan = buildPillarsForPlan();
    if (pillarsForPlan.length === 0) {
      setError("Generate AI suggestions or pick at least one audience option first.");
      return;
    }

    setPlanLoading(true);
    setPlan(null);
    setImages({});
    setRefinementHistory([]);
    setEstimates({});
    try {
      const res = await fetch("/api/tools/meta-audience-scraper/campaign-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: brief.trim() || undefined,
          thesis: aiResult?.thesis ?? undefined,
          clientName: clientName.trim() || undefined,
          sector: sector.trim() || undefined,
          geography: geography.trim() || undefined,
          dailyBudget: budgetNum,
          currency,
          objective: objective.trim() || undefined,
          pillars: pillarsForPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Plan generation failed");
      if (!isValidCampaignPlan(data.plan)) {
        throw new Error("AI returned an invalid campaign plan. Please try again.");
      }
      setPlan(data.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan generation failed");
    } finally {
      setPlanLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dailyBudget,
    currency,
    objective,
    brief,
    clientName,
    sector,
    geography,
    aiResult,
    excludedPillars,
    excludedOptionIds,
  ]);

  const refinePlan = useCallback(async () => {
    if (!plan || !refineFeedback.trim()) return;
    setError(null);
    setRefineLoading(true);
    const feedbackText = refineFeedback.trim();
    try {
      // Collect every Meta ID from the current pillars so the server can
      // validate any IDs the AI keeps or introduces post-refine.
      const validIds = (aiResult?.pillars ?? []).flatMap((p) => p.options.map((o) => o.id));
      const res = await fetch("/api/tools/meta-audience-scraper/refine-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          feedback: feedbackText,
          brief: brief.trim() || undefined,
          clientName: clientName.trim() || undefined,
          validIds,
          refinementHistory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refinement failed");
      if (!isValidCampaignPlan(data.plan)) {
        throw new Error("AI returned an invalid refined plan. Please try again.");
      }
      setPlan(data.plan);
      setRefinementHistory((prev) => [
        ...prev,
        { feedback: feedbackText, appliedAt: new Date().toISOString() },
      ]);
      setRefineFeedback("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setRefineLoading(false);
    }
  }, [plan, refineFeedback, brief, clientName, aiResult, refinementHistory]);

  // ── Save / load whole-plan state ────────────────────────────────────────
  // Bundles the entire tool state into one JSON blob so we can rehydrate it
  // later. Title defaults to client name + brief snippet.
  const buildStateSnapshot = useCallback(
    () => ({
      brief,
      keywordsText,
      sector,
      clientName,
      geography,
      dailyBudget,
      currency,
      objective,
      accountId,
      aiResult,
      plan,
      excludedPillars: [...excludedPillars],
      excludedOptionIds: [...excludedOptionIds],
      refinementHistory,
      images,
      estimates,
    }),
    [
      brief,
      keywordsText,
      sector,
      clientName,
      geography,
      dailyBudget,
      currency,
      objective,
      accountId,
      aiResult,
      plan,
      excludedPillars,
      excludedOptionIds,
      refinementHistory,
      images,
      estimates,
    ],
  );

  const savePlan = useCallback(async () => {
    setSavingPlan(true);
    setError(null);
    try {
      const snapshot = buildStateSnapshot();
      const titlePieces = [clientName.trim(), brief.trim().slice(0, 60)].filter(Boolean);
      const title = titlePieces.join(" · ") || `Plan ${new Date().toLocaleString("en-GB")}`;
      if (currentPlanId) {
        const res = await fetch(`/api/tools/meta-audience-scraper/plans/${currentPlanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, state: snapshot }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
      } else {
        const res = await fetch("/api/tools/meta-audience-scraper/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, state: snapshot }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setCurrentPlanId(data.plan.id);
      }
      await refreshSavedPlans();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingPlan(false);
    }
  }, [buildStateSnapshot, clientName, brief, currentPlanId, refreshSavedPlans]);

  const loadPlan = useCallback(async (id: string) => {
    setLoadingPlan(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/meta-audience-scraper/plans/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      const s = data.plan?.state ?? {};
      setBrief(s.brief ?? "");
      setKeywordsText(s.keywordsText ?? "");
      setSector(s.sector ?? "");
      setClientName(s.clientName ?? "");
      setGeography(s.geography ?? "");
      setDailyBudget(s.dailyBudget ?? "");
      setCurrency(s.currency ?? "GBP");
      setObjective(s.objective ?? "");
      setAccountId(s.accountId ?? "");
      setAiResult(s.aiResult ?? null);
      if (s.plan == null) {
        setPlan(null);
      } else if (isValidCampaignPlan(s.plan)) {
        setPlan(s.plan);
      } else {
        setPlan(null);
        setError("Saved plan is invalid. Rebuild the campaign plan before continuing.");
      }
      setExcludedPillars(
        new Set<string>(Array.isArray(s.excludedPillars) ? s.excludedPillars : []),
      );
      setExcludedOptionIds(
        new Set<string>(Array.isArray(s.excludedOptionIds) ? s.excludedOptionIds : []),
      );
      setRefinementHistory(Array.isArray(s.refinementHistory) ? s.refinementHistory : []);
      setImages(s.images ?? {});
      setEstimates(s.estimates ?? {});
      setCurrentPlanId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  const deleteSavedPlan = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/tools/meta-audience-scraper/plans/${id}`, { method: "DELETE" });
        if (currentPlanId === id) setCurrentPlanId(null);
        await refreshSavedPlans();
      } catch {
        /* ignore */
      }
    },
    [currentPlanId, refreshSavedPlans],
  );

  function startNewPlan() {
    setCurrentPlanId(null);
    setBrief("");
    setKeywordsText("");
    setSector("");
    setClientName("");
    setGeography("");
    setDailyBudget("");
    setObjective("");
    setAiResult(null);
    setPlan(null);
    setExcludedPillars(new Set());
    setExcludedOptionIds(new Set());
    setRefinementHistory([]);
    setImages({});
    setEstimates({});
    setError(null);
  }

  // ── Per-slice refinement (ad set / creative) ───────────────────────────
  const refineSlice = useCallback(
    async (scope: { campaignIndex: number; adSetIndex?: number; creativeIndex?: number }) => {
      if (!plan) return;
      const key = sliceKey(scope.campaignIndex, scope.adSetIndex, scope.creativeIndex);
      const feedback = (sliceRefines[key]?.feedback ?? "").trim();
      if (!feedback) return;
      setSliceRefines((prev) => ({ ...prev, [key]: { feedback, loading: true } }));
      setError(null);
      try {
        const validIds = (aiResult?.pillars ?? []).flatMap((p) => p.options.map((o) => o.id));
        const res = await fetch("/api/tools/meta-audience-scraper/refine-slice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            scope,
            feedback,
            brief: brief.trim() || undefined,
            clientName: clientName.trim() || undefined,
            validIds,
            refinementHistory,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Slice refinement failed");
        if (!isValidCampaignPlan(data.plan)) {
          throw new Error("AI returned an invalid refined plan. Please try again.");
        }
        setPlan(data.plan);
        setRefinementHistory((prev) => [
          ...prev,
          { feedback: `[scoped] ${feedback}`, appliedAt: new Date().toISOString() },
        ]);
        setSliceRefines((prev) => ({ ...prev, [key]: { feedback: "", loading: false } }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Slice refinement failed");
        setSliceRefines((prev) => ({ ...prev, [key]: { feedback, loading: false } }));
      }
    },
    [plan, sliceRefines, aiResult, brief, clientName, refinementHistory],
  );

  // ── Reach / delivery estimates per ad set ─────────────────────────────
  // Builds a quick lookup of pillar option → type so we can split
  // targetingOptionIds into interests vs behaviours when calling Meta's
  // delivery_estimate endpoint.
  const optionTypeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of aiResult?.pillars ?? []) {
      for (const o of p.options) map.set(String(o.id), String(o.type ?? ""));
    }
    return map;
  }, [aiResult]);

  const fetchEstimates = useCallback(async () => {
    if (!plan || !accountId) return;
    setEstimatesLoading(true);
    try {
      // Build the per-ad-set request shape with typed targeting splits.
      const adSets: {
        campaignIndex: number;
        adSetIndex: number;
        geoCountries?: string[];
        ageMin: number;
        ageMax: number;
        genders: "all" | "female" | "male";
        interestIds?: { id: string }[];
        behaviorIds?: { id: string }[];
        advantageAudience?: boolean;
      }[] = [];
      const campaigns = Array.isArray(plan.campaigns) ? plan.campaigns : [];
      campaigns.forEach((c, ci) => {
        const campaignAdSets = Array.isArray(c.adSets) ? c.adSets : [];
        campaignAdSets.forEach((a, ai) => {
          if (
            !a?.ageRange ||
            typeof a.ageRange.min !== "number" ||
            typeof a.ageRange.max !== "number"
          ) {
            return;
          }
          const interestIds: { id: string }[] = [];
          const behaviorIds: { id: string }[] = [];
          const targetingOptionIds = Array.isArray(a.targetingOptionIds)
            ? a.targetingOptionIds
            : [];
          for (const id of targetingOptionIds) {
            const t = (optionTypeById.get(String(id)) ?? "").toLowerCase();
            if (t.includes("behavior") || t.includes("behaviour"))
              behaviorIds.push({ id: String(id) });
            else interestIds.push({ id: String(id) });
          }
          adSets.push({
            campaignIndex: ci,
            adSetIndex: ai,
            geoCountries: a.geoTargeting && a.geoTargeting.length > 0 ? a.geoTargeting : undefined,
            ageMin: a.ageRange.min,
            ageMax: a.ageRange.max,
            genders: a.genders ?? "all",
            interestIds: interestIds.length > 0 ? interestIds : undefined,
            behaviorIds: behaviorIds.length > 0 ? behaviorIds : undefined,
            advantageAudience: a.advantageAudience,
          });
        });
      });

      const res = await fetch("/api/tools/meta-audience-scraper/estimate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, adSets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Estimate failed");
      setEstimates(data.estimates ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Estimate failed");
    } finally {
      setEstimatesLoading(false);
    }
  }, [plan, accountId, optionTypeById]);

  // ── Image generation per creative ─────────────────────────────────────
  function imageKey(c: number, a: number, cr: number, frame = 0): string {
    return `${c}-${a}-${cr}-${frame}`;
  }

  async function generateImage(
    key: string,
    basePrompt: string,
    aspect: "square" | "portrait" | "landscape",
  ) {
    const overridden = imagePromptOverrides[key];
    const prompt = (overridden && overridden.trim()) || basePrompt;
    if (!prompt.trim()) return;

    setImages((prev) => ({ ...prev, [key]: { url: "", prompt, loading: true } }));
    try {
      const res = await fetch("/api/tools/meta-audience-scraper/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect, quality: "medium" }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        limits?: { remainingHour: number; remainingDay: number };
      };
      if (!res.ok) {
        const suffix = data.limits
          ? ` (remaining: ${data.limits.remainingHour}/hour, ${data.limits.remainingDay}/day)`
          : "";
        throw new Error((data.error ?? "Image generation failed") + suffix);
      }
      const generatedUrl = data.url;
      if (!generatedUrl) throw new Error("Image generation failed: missing image URL");
      setImages((prev) => ({ ...prev, [key]: { url: generatedUrl, prompt, loading: false } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed");
      setImages((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // ── Auto-generate every image for a freshly-built plan ────────────────
  // Runs through every (campaign, ad set, creative, frame) tuple in the plan
  // and fires generation requests with a small concurrency cap so we don't
  // hammer OpenAI. Cancellable: if the user rebuilds or refines the plan
  // mid-flight, we bump generationToken to abort the in-flight queue.
  const generationToken = useRef(0);
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  const [autoGenerating, setAutoGenerating] = useState<{ done: number; total: number } | null>(
    null,
  );

  const autoGenerateImagesForPlan = useCallback(async (p: FullPlan) => {
    type Task = { key: string; prompt: string; aspect: "square" | "portrait" | "landscape" };
    const tasks: Task[] = [];
    const existing = imagesRef.current;

    const campaigns = Array.isArray(p.campaigns) ? p.campaigns : [];
    campaigns.forEach((campaign, ci) => {
      const adSets = Array.isArray(campaign.adSets) ? campaign.adSets : [];
      adSets.forEach((adSet, ai) => {
        const creatives = Array.isArray(adSet.creatives) ? adSet.creatives : [];
        creatives.forEach((creative, cri) => {
          const prompts = creative.imagePrompts?.length
            ? creative.imagePrompts
            : creative.imagePrompt
              ? [creative.imagePrompt]
              : [];
          const aspect: "square" | "portrait" | "landscape" =
            creative.format === "video" ? "portrait" : "square";
          prompts.forEach((prompt, frame) => {
            const key = `${ci}-${ai}-${cri}-${frame}`;
            // Skip frames that already have a usable image (preserves manual
            // refines and earlier auto-gen runs across plan refinements).
            if (existing[key]?.url) return;
            tasks.push({ key, prompt, aspect });
          });
        });
      });
    });

    if (tasks.length === 0) return;

    generationToken.current += 1;
    const myToken = generationToken.current;

    setAutoGenerating({ done: 0, total: tasks.length });
    // Mark every slot as loading immediately so the UI shows skeleton state.
    setImages((prev) => {
      const next = { ...prev };
      for (const t of tasks) next[t.key] = { url: "", prompt: t.prompt, loading: true };
      return next;
    });

    const concurrency = 3;
    let cursor = 0;
    let done = 0;

    async function worker() {
      while (true) {
        if (myToken !== generationToken.current) return; // cancelled
        const i = cursor++;
        if (i >= tasks.length) return;
        const t = tasks[i];
        try {
          const res = await fetch("/api/tools/meta-audience-scraper/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: t.prompt, aspect: t.aspect, quality: "medium" }),
          });
          if (myToken !== generationToken.current) return;
          if (!res.ok) {
            const err = await res.json().catch(
              () =>
                ({}) as {
                  error?: string;
                  limits?: { remainingHour: number; remainingDay: number };
                },
            );
            const suffix = err.limits
              ? ` (remaining: ${err.limits.remainingHour}/hour, ${err.limits.remainingDay}/day)`
              : "";
            throw new Error((err.error ?? "Image generation failed") + suffix);
          }
          const data = (await res.json()) as { url: string };
          setImages((prev) => ({
            ...prev,
            [t.key]: { url: data.url, prompt: t.prompt, loading: false },
          }));
        } catch (e) {
          // Mark this slot as failed without the loading state
          setImages((prev) => {
            const next = { ...prev };
            delete next[t.key];
            return next;
          });
          // Surface the first failure but keep going
          if (done === 0) setError(e instanceof Error ? e.message : "Image generation failed");
        } finally {
          done += 1;
          if (myToken === generationToken.current) {
            setAutoGenerating({ done, total: tasks.length });
          }
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
    if (myToken === generationToken.current) setAutoGenerating(null);
  }, []);

  // Image generation is MANUAL — user clicks "Generate all images" at the
  // bottom of the plan, or the per-frame Generate button on each creative.
  // We deliberately do not auto-generate on plan load to avoid burning
  // OpenAI credits on creative the user may not want imagery for.

  async function refineImage(key: string, aspect: "square" | "portrait" | "landscape") {
    const existing = images[key];
    const refinement = refinePrompts[key]?.trim();
    if (!existing?.url || !refinement) return;

    setImages((prev) => ({ ...prev, [key]: { ...existing, loading: true } }));
    try {
      const res = await fetch("/api/tools/meta-audience-scraper/refine-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: existing.url,
          originalPrompt: existing.prompt,
          refinement,
          aspect,
          quality: "medium",
        }),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        limits?: { remainingHour: number; remainingDay: number };
      };
      if (!res.ok) {
        const suffix = data.limits
          ? ` (remaining: ${data.limits.remainingHour}/hour, ${data.limits.remainingDay}/day)`
          : "";
        throw new Error((data.error ?? "Image refinement failed") + suffix);
      }
      const refinedUrl = data.url;
      if (!refinedUrl) throw new Error("Image refinement failed: missing image URL");
      setImages((prev) => ({
        ...prev,
        [key]: { url: refinedUrl, prompt: existing.prompt, loading: false },
      }));
      setRefinePrompts((prev) => ({ ...prev, [key]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image refinement failed");
      setImages((prev) => ({ ...prev, [key]: { ...existing, loading: false } }));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 24px 96px" }}>
      <main>
        <header style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "var(--text)" }}>
            Meta Audience Planner
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-2)" }}>
            Build audience pillars, campaign structures, and creative payloads with AI-assisted
            planning.
          </p>
        </header>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--danger-bg)",
              color: "var(--danger-text)",
              border: "1px solid var(--danger-border)",
              borderRadius: "var(--r)",
              fontSize: 13,
              margin: "12px 0",
            }}
          >
            <AlertTriangle style={{ width: 14, height: 14 }} />
            {error}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div>
            {/* Saved-plan toolbar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 14px",
                marginBottom: 12,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-3)",
                  }}
                >
                  Saved plans
                </span>
                <select
                  value={currentPlanId ?? ""}
                  onChange={(e) => {
                    if (e.target.value) loadPlan(e.target.value);
                  }}
                  disabled={loadingPlan || savedPlans.length === 0}
                  style={{ ...inputStyle, fontSize: 12, maxWidth: 360 }}
                >
                  <option value="">
                    {savedPlans.length === 0 ? "No saved plans" : "Load a saved plan…"}
                  </option>
                  {savedPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · {new Date(p.updatedAt).toLocaleDateString("en-GB")}
                    </option>
                  ))}
                </select>
                {currentPlanId && (
                  <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                    Editing #{currentPlanId.slice(-6)}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={startNewPlan}
                  disabled={savingPlan || loadingPlan}
                  style={{ ...fileBtnStyle, fontSize: 11 }}
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={savePlan}
                  disabled={savingPlan || (!brief.trim() && !aiResult && !plan)}
                  style={{ ...primaryBtnStyle, padding: "6px 12px", fontSize: 11 }}
                >
                  {savingPlan ? (
                    <Loader2 style={{ width: 12, height: 12 }} className="spin" />
                  ) : null}
                  {currentPlanId ? "Save changes" : "Save plan"}
                </button>
                {currentPlanId && (
                  <button
                    type="button"
                    onClick={() => currentPlanId && deleteSavedPlan(currentPlanId)}
                    style={{ ...fileBtnStyle, fontSize: 11 }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <section style={cardStyle}>
              <label style={labelStyle}>Brief (or campaign objective)</label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. Promote a new range of premium running shoes to UK marathon hobbyists aged 30-50 with disposable income and an interest in performance gear."
                rows={5}
                style={textareaStyle}
                disabled={aiLoading}
              />

              <label style={{ ...labelStyle, marginTop: 14 }}>
                Or seed keywords (comma- or newline-separated)
              </label>
              <textarea
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="running shoes, marathon, Strava, Garmin, Nike Run Club"
                rows={2}
                style={textareaStyle}
                disabled={aiLoading}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Client name</label>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="optional"
                    style={inputStyle}
                    disabled={aiLoading}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sector</label>
                  <input
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="optional"
                    style={inputStyle}
                    disabled={aiLoading}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Geography</label>
                  <input
                    value={geography}
                    onChange={(e) => setGeography(e.target.value)}
                    placeholder="e.g. UK / London"
                    style={inputStyle}
                    disabled={aiLoading}
                  />
                </div>
              </div>

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-3)",
                  }}
                >
                  Campaign plan inputs (used after pillars are generated)
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Daily budget</label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                      placeholder="e.g. 100"
                      style={inputStyle}
                      disabled={aiLoading}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      style={inputStyle}
                      disabled={aiLoading}
                    >
                      <option value="GBP">GBP</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                      <option value="AUD">AUD</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Objective hint (optional)</label>
                    <input
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="e.g. Sales, Leads, Awareness"
                      style={inputStyle}
                      disabled={aiLoading}
                    />
                  </div>
                </div>
                {accounts.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>
                      Meta ad account (used for live reach estimates)
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      style={inputStyle}
                      disabled={aiLoading}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · act_{a.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 16,
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                  Claude reads the brief, runs a first wave of Meta searches, identifies what was
                  missed, runs a gap-fill second wave, then curates the strongest options into
                  pillars. Takes 30-90 seconds.
                </span>
                <button
                  type="button"
                  onClick={runAiSuggest}
                  disabled={aiLoading}
                  style={primaryBtnStyle}
                >
                  {aiLoading ? (
                    <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                  ) : (
                    <Sparkles style={{ width: 14, height: 14 }} />
                  )}
                  {aiLoading ? "Running…" : "Generate suggestions"}
                </button>
              </div>

              {aiResult && (
                <div style={{ marginTop: 22 }}>
                  {aiResult.warning && (
                    <p style={{ fontSize: 12, color: "var(--warning-text)", marginBottom: 10 }}>
                      {aiResult.warning}
                    </p>
                  )}

                  <AnalysisPanel result={aiResult} />

                  {aiResult.pillars.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--text-3)" }}>No pillars produced.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {aiResult.pillars.map((pillar) => {
                        const collapsed = collapsedPillars.has(pillar.name);
                        return (
                          <div
                            key={pillar.name}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: "var(--r)",
                              background: "var(--surface)",
                              overflow: "hidden",
                            }}
                          >
                            {(() => {
                              const pillarActive = isPillarActive(pillar.name);
                              const activeOptions = pillar.options.filter((o) =>
                                isOptionActive(o.id),
                              );
                              const activeCount = pillarActive ? activeOptions.length : 0;
                              return (
                                <>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 10,
                                      padding: "12px 14px",
                                      background: "var(--surface-2)",
                                      borderBottom: collapsed ? "none" : "1px solid var(--border)",
                                      opacity: pillarActive ? 1 : 0.55,
                                    }}
                                  >
                                    <CheckBox
                                      checked={pillarActive}
                                      onChange={() => togglePillarActive(pillar)}
                                      label={`Toggle pillar ${pillar.name}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => togglePillar(pillar.name)}
                                      style={{
                                        display: "flex",
                                        flex: 1,
                                        alignItems: "flex-start",
                                        gap: 10,
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        padding: 0,
                                        minWidth: 0,
                                      }}
                                    >
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <h3
                                            style={{
                                              margin: 0,
                                              fontSize: 14,
                                              fontWeight: 600,
                                              color: "var(--text)",
                                              textDecoration: pillarActive
                                                ? "none"
                                                : "line-through",
                                            }}
                                          >
                                            {pillar.name}
                                          </h3>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 600,
                                              padding: "1px 6px",
                                              borderRadius: 4,
                                              background: pillarActive
                                                ? "var(--accent-bg)"
                                                : "var(--surface)",
                                              color: pillarActive
                                                ? "var(--accent)"
                                                : "var(--text-3)",
                                              border:
                                                "1px solid " +
                                                (pillarActive ? "var(--accent)" : "var(--border)"),
                                            }}
                                          >
                                            {activeCount}/{pillar.options.length} active
                                          </span>
                                        </div>
                                        {pillar.rationale && (
                                          <p
                                            style={{
                                              margin: "4px 0 0",
                                              fontSize: 12,
                                              color: "var(--text-2)",
                                            }}
                                          >
                                            {pillar.rationale}
                                          </p>
                                        )}
                                      </div>
                                      {collapsed ? (
                                        <ChevronDown
                                          style={{
                                            width: 14,
                                            height: 14,
                                            color: "var(--text-3)",
                                            flexShrink: 0,
                                            marginTop: 2,
                                          }}
                                        />
                                      ) : (
                                        <ChevronUp
                                          style={{
                                            width: 14,
                                            height: 14,
                                            color: "var(--text-3)",
                                            flexShrink: 0,
                                            marginTop: 2,
                                          }}
                                        />
                                      )}
                                    </button>
                                  </div>
                                  {!collapsed && (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 6,
                                        padding: 10,
                                        opacity: pillarActive ? 1 : 0.55,
                                      }}
                                    >
                                      {pillar.options.map((opt) => (
                                        <ResultCard
                                          key={opt.id}
                                          item={opt}
                                          why={opt.why}
                                          selected={pillarActive && isOptionActive(opt.id)}
                                          copied={copiedId === opt.id}
                                          onAdd={() => toggleOptionActive(opt.id)}
                                          onRemove={() => toggleOptionActive(opt.id)}
                                          onCopy={() => copyId(opt.id)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>

            {aiResult && aiResult.pillars.length > 0 && (
              <CampaignPlanSection
                dailyBudget={dailyBudget}
                currency={currency}
                planLoading={planLoading}
                plan={plan}
                onBuildPlan={buildPlan}
                refineFeedback={refineFeedback}
                setRefineFeedback={setRefineFeedback}
                refineLoading={refineLoading}
                onRefinePlan={refinePlan}
                images={images}
                imageKey={imageKey}
                imagePromptOverrides={imagePromptOverrides}
                setImagePromptOverrides={setImagePromptOverrides}
                refinePrompts={refinePrompts}
                setRefinePrompts={setRefinePrompts}
                onGenerateImage={generateImage}
                onRefineImage={refineImage}
                onGenerateAllImages={() => plan && autoGenerateImagesForPlan(plan)}
                hasSelection={activeStats.options > 0}
                autoGenerating={autoGenerating}
                estimates={estimates}
                estimatesLoading={estimatesLoading}
                onFetchEstimates={fetchEstimates}
                hasAccount={!!accountId}
                sliceRefines={sliceRefines}
                setSliceFeedback={setSliceFeedback}
                onRefineSlice={refineSlice}
                sliceKey={sliceKey}
              />
            )}
          </div>
        </div>
      </main>

      <style jsx global>{`
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Campaign plan section ──────────────────────────────────────────────

interface CampaignPlanSectionProps {
  dailyBudget: string;
  currency: string;
  planLoading: boolean;
  plan: FullPlan | null;
  onBuildPlan: () => void;
  refineFeedback: string;
  setRefineFeedback: (v: string) => void;
  refineLoading: boolean;
  onRefinePlan: () => void;
  images: Record<string, GeneratedImage>;
  imageKey: (c: number, a: number, cr: number, frame?: number) => string;
  imagePromptOverrides: Record<string, string>;
  setImagePromptOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  refinePrompts: Record<string, string>;
  setRefinePrompts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onGenerateImage: (
    key: string,
    prompt: string,
    aspect: "square" | "portrait" | "landscape",
  ) => void;
  onRefineImage: (key: string, aspect: "square" | "portrait" | "landscape") => void;
  onGenerateAllImages: () => void;
  hasSelection: boolean;
  autoGenerating: { done: number; total: number } | null;
  estimates: Record<
    string,
    | {
        ok: true;
        estimate: {
          estimatedDauLower: number;
          estimatedDauUpper: number;
          estimatedMauLower: number;
          estimatedMauUpper: number;
        };
      }
    | { ok: false; error: string }
  >;
  estimatesLoading: boolean;
  onFetchEstimates: () => void;
  hasAccount: boolean;
  sliceRefines: Record<string, { feedback: string; loading: boolean }>;
  setSliceFeedback: (key: string, feedback: string) => void;
  onRefineSlice: (scope: {
    campaignIndex: number;
    adSetIndex?: number;
    creativeIndex?: number;
  }) => void;
  sliceKey: (ci: number, ai?: number, cri?: number) => string;
}

function CampaignPlanSection(props: CampaignPlanSectionProps) {
  const {
    dailyBudget,
    currency,
    planLoading,
    plan,
    onBuildPlan,
    refineFeedback,
    setRefineFeedback,
    refineLoading,
    onRefinePlan,
    images,
    imageKey,
    imagePromptOverrides,
    setImagePromptOverrides,
    refinePrompts,
    setRefinePrompts,
    onGenerateImage,
    onRefineImage,
    onGenerateAllImages,
    hasSelection,
    autoGenerating,
    estimates,
    estimatesLoading,
    onFetchEstimates,
    hasAccount,
    sliceRefines,
    setSliceFeedback,
    onRefineSlice,
    sliceKey,
  } = props;

  const budgetReady = parseFloat(dailyBudget) > 0;
  const campaigns = Array.isArray(plan?.campaigns) ? plan.campaigns : [];

  function downloadHandoffPack(currentPlan: FullPlan) {
    const campaignNames = Array.isArray(currentPlan.campaigns)
      ? currentPlan.campaigns.map((c) => c.name)
      : [];
    const payload = {
      summary: currentPlan.summary,
      structureRationale: currentPlan.structureRationale,
      controlsVsSuggestions: currentPlan.controlsVsSuggestions ?? null,
      handoffPack: currentPlan.handoffPack ?? null,
      campaignNames,
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `meta-assassin-handoff-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section style={{ ...cardStyle, marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Layers style={{ width: 18, height: 18, color: "var(--accent)" }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Campaign Plan</h2>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-3)" }}>
        Claude designs the full campaign structure — campaigns, ad sets, budget split, placements,
        Advantage+, attribution, bid strategy, and creative concepts (with AI-generated imagery) —
        explaining every decision.
        {hasSelection
          ? " Using your selected audiences."
          : " Using all AI-suggested pillars (add to selection to focus on specific ones)."}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          background: "var(--surface-2)",
          borderRadius: "var(--r)",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          {budgetReady ? (
            <>
              Daily budget:{" "}
              <strong style={{ color: "var(--text)" }}>
                {currency} {parseFloat(dailyBudget).toFixed(2)}
              </strong>
            </>
          ) : (
            <span style={{ color: "var(--warning-text)" }}>
              Set a daily budget in the brief panel above to enable plan generation.
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onBuildPlan}
          disabled={planLoading || !budgetReady}
          style={primaryBtnStyle}
        >
          {planLoading ? (
            <Loader2 style={{ width: 14, height: 14 }} className="spin" />
          ) : (
            <Wand2 style={{ width: 14, height: 14 }} />
          )}
          {planLoading ? "Building plan…" : plan ? "Rebuild plan" : "Build campaign plan"}
        </button>
      </div>

      {plan && (
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Summary */}
          <div
            style={{
              padding: 14,
              background: "var(--accent-bg)",
              borderRadius: "var(--r)",
              borderLeft: "3px solid var(--accent)",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
              {plan.summary}
            </p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-2)" }}>
              <strong>Why this structure:</strong> {plan.structureRationale}
            </p>
          </div>

          {/* Campaigns */}
          {campaigns.map((campaign, ci) => (
            <CampaignCard
              key={ci}
              campaign={campaign}
              campaignIndex={ci}
              currency={currency}
              images={images}
              imageKey={imageKey}
              imagePromptOverrides={imagePromptOverrides}
              setImagePromptOverrides={setImagePromptOverrides}
              refinePrompts={refinePrompts}
              setRefinePrompts={setRefinePrompts}
              onGenerateImage={onGenerateImage}
              onRefineImage={onRefineImage}
              estimates={estimates}
              sliceRefines={sliceRefines}
              setSliceFeedback={setSliceFeedback}
              onRefineSlice={onRefineSlice}
              sliceKey={sliceKey}
            />
          ))}

          {/* Creative testing framework */}
          {plan.creativeTestingFramework && (
            <div
              style={{
                padding: 14,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
                Creative testing framework
              </h3>
              <p
                style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}
              >
                {plan.creativeTestingFramework}
              </p>
            </div>
          )}

          {/* Week-by-week */}
          {plan.weekByWeek && plan.weekByWeek.length > 0 && (
            <div
              style={{
                padding: 14,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Week-by-week playbook</h3>
              <ul
                style={{
                  margin: "6px 0 0",
                  paddingLeft: 18,
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.5,
                }}
              >
                {plan.weekByWeek.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Controls vs suggestions */}
          {plan.controlsVsSuggestions && (
            <div
              style={{
                padding: 14,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Controls vs suggestions</h3>
              <div
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--warning-text)",
                    }}
                  >
                    Hard controls
                  </p>
                  <ul
                    style={{
                      margin: "6px 0 0",
                      paddingLeft: 18,
                      fontSize: 12,
                      color: "var(--text-2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {(plan.controlsVsSuggestions.hardControls ?? []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--success-text)",
                    }}
                  >
                    Suggestions
                  </p>
                  <ul
                    style={{
                      margin: "6px 0 0",
                      paddingLeft: 18,
                      fontSize: 12,
                      color: "var(--text-2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {(plan.controlsVsSuggestions.suggestions ?? []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                {(plan.controlsVsSuggestions.manualOverrideTriggers ?? []).length > 0 && (
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--accent)",
                      }}
                    >
                      Manual override triggers
                    </p>
                    <ul
                      style={{
                        margin: "6px 0 0",
                        paddingLeft: 18,
                        fontSize: 12,
                        color: "var(--text-2)",
                        lineHeight: 1.5,
                      }}
                    >
                      {(plan.controlsVsSuggestions.manualOverrideTriggers ?? []).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Strategy handoff pack */}
          {plan.handoffPack && (
            <div
              style={{
                padding: 14,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Strategy handoff pack</h3>
                <button
                  type="button"
                  onClick={() => downloadHandoffPack(plan)}
                  style={{ ...primaryBtnStyle, padding: "6px 10px", fontSize: 11 }}
                >
                  <Download style={{ width: 12, height: 12 }} />
                  Export handoff JSON
                </button>
              </div>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <HandoffList title="Build order" items={plan.handoffPack.campaignBuildOrder} />
                <HandoffList
                  title="Creative test matrix"
                  items={plan.handoffPack.creativeTestMatrix}
                />
                <HandoffList title="Launch checklist" items={plan.handoffPack.launchChecklist} />
                <HandoffList
                  title="First 14-day guardrails"
                  items={plan.handoffPack.first14DayGuardrails}
                />
                <HandoffList title="Kill / scale rules" items={plan.handoffPack.killScaleRules} />
              </div>
            </div>
          )}

          {/* Measurement */}
          <div
            style={{
              padding: 14,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Measurement</h3>
            <div
              style={{
                marginTop: 8,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
                fontSize: 12,
                color: "var(--text-2)",
              }}
            >
              <div>
                <strong style={{ color: "var(--text)" }}>Primary KPI:</strong>{" "}
                {plan.measurement.primaryKpi}
              </div>
              <div>
                <strong style={{ color: "var(--text)" }}>Secondary KPIs:</strong>{" "}
                {plan.measurement.secondaryKpis.join(", ")}
              </div>
              <div>
                <strong style={{ color: "var(--text)" }}>Learning phase:</strong>{" "}
                {plan.measurement.minLearningPhaseEvents}
              </div>
              <div>
                <strong style={{ color: "var(--text)" }}>Hands-off rule:</strong>{" "}
                {plan.measurement.ctaToHoldOff}
              </div>
              {plan.measurement.campaignLevelReading && (
                <div>
                  <strong style={{ color: "var(--text)" }}>Campaign-level reading:</strong>{" "}
                  {plan.measurement.campaignLevelReading}
                </div>
              )}
            </div>
          </div>

          {/* Risks + Scale-up */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div
              style={{
                padding: 14,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
              }}
            >
              <h3
                style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--warning-text)" }}
              >
                Risks to watch
              </h3>
              <ul
                style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-2)" }}
              >
                {plan.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div
              style={{
                padding: 14,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r)",
              }}
            >
              <h3
                style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--success-text)" }}
              >
                Scale-up plan
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-2)" }}>
                {plan.scaleUp}
              </p>
            </div>
          </div>

          {/* Reach estimates */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Live reach estimates</h3>
            <p style={{ margin: "4px 0 8px", fontSize: 11, color: "var(--text-3)" }}>
              {hasAccount
                ? "Hits Meta's delivery_estimate endpoint per ad set using the geo, age, gender and targeting IDs in the plan. Numbers appear inside each ad-set card."
                : "Pick a Meta ad account in the brief panel above to enable live audience-size estimates per ad set."}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onFetchEstimates}
                disabled={!hasAccount || estimatesLoading}
                style={primaryBtnStyle}
              >
                {estimatesLoading ? (
                  <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                ) : (
                  <RefreshCw style={{ width: 14, height: 14 }} />
                )}
                {estimatesLoading ? "Estimating…" : "Fetch reach estimates"}
              </button>
            </div>
          </div>

          {/* Generate all images */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Imagery</h3>
            <p style={{ margin: "4px 0 8px", fontSize: 11, color: "var(--text-3)" }}>
              Images are NOT generated automatically. Click below to generate every frame on the
              plan, or use the per-frame buttons on individual creatives. OpenAI gpt-image-1, medium
              quality, 3 in parallel. Soft guardrails apply per user session: generate 40/hour
              (120/day), refine 25/hour (80/day).
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}
            >
              {autoGenerating && autoGenerating.total > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2
                    style={{ width: 13, height: 13, color: "var(--accent)" }}
                    className="spin"
                  />
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-2)",
                      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {autoGenerating.done}/{autoGenerating.total}
                  </span>
                  <div
                    style={{
                      width: 120,
                      height: 3,
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(autoGenerating.done / autoGenerating.total) * 100}%`,
                        background: "var(--accent)",
                        transition: "width 300ms ease",
                      }}
                    />
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={onGenerateAllImages}
                disabled={!!autoGenerating}
                style={primaryBtnStyle}
              >
                {autoGenerating ? (
                  <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                ) : (
                  <ImagePlus style={{ width: 14, height: 14 }} />
                )}
                {autoGenerating ? "Generating…" : "Generate all images"}
              </button>
            </div>
          </div>

          {/* Refinement */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Refine the plan</h3>
            <p style={{ margin: "4px 0 8px", fontSize: 11, color: "var(--text-3)" }}>
              Tell Claude what you want to change. Be specific — e.g. &ldquo;Move 30% of budget from
              prospecting to retargeting&rdquo;, or &ldquo;Drop Advantage+ Audience and use a tight
              interest stack instead&rdquo;.
            </p>
            <textarea
              value={refineFeedback}
              onChange={(e) => setRefineFeedback(e.target.value)}
              placeholder="Your refinement…"
              rows={3}
              style={textareaStyle}
              disabled={refineLoading}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                onClick={onRefinePlan}
                disabled={refineLoading || !refineFeedback.trim()}
                style={primaryBtnStyle}
              >
                {refineLoading ? (
                  <Loader2 style={{ width: 14, height: 14 }} className="spin" />
                ) : (
                  <RefreshCw style={{ width: 14, height: 14 }} />
                )}
                {refineLoading ? "Refining…" : "Apply refinement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CampaignCard({
  campaign,
  campaignIndex,
  currency,
  images,
  imageKey,
  imagePromptOverrides,
  setImagePromptOverrides,
  refinePrompts,
  setRefinePrompts,
  onGenerateImage,
  onRefineImage,
  estimates,
  sliceRefines,
  setSliceFeedback,
  onRefineSlice,
  sliceKey,
}: {
  campaign: CampaignPlan;
  campaignIndex: number;
  currency: string;
  images: Record<string, GeneratedImage>;
  imageKey: (c: number, a: number, cr: number, frame?: number) => string;
  imagePromptOverrides: Record<string, string>;
  setImagePromptOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  refinePrompts: Record<string, string>;
  setRefinePrompts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onGenerateImage: (
    key: string,
    prompt: string,
    aspect: "square" | "portrait" | "landscape",
  ) => void;
  onRefineImage: (key: string, aspect: "square" | "portrait" | "landscape") => void;
  estimates: Record<
    string,
    | {
        ok: true;
        estimate: {
          estimatedDauLower: number;
          estimatedDauUpper: number;
          estimatedMauLower: number;
          estimatedMauUpper: number;
        };
      }
    | { ok: false; error: string }
  >;
  sliceRefines: Record<string, { feedback: string; loading: boolean }>;
  setSliceFeedback: (key: string, feedback: string) => void;
  onRefineSlice: (scope: {
    campaignIndex: number;
    adSetIndex?: number;
    creativeIndex?: number;
  }) => void;
  sliceKey: (ci: number, ai?: number, cri?: number) => string;
}) {
  const advantagePlus = campaign.advantagePlus ?? { enabled: false, type: "none", why: "" };
  const campaignAdSets = Array.isArray(campaign.adSets) ? campaign.adSets : [];
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          background: "var(--surface-2)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{campaign.name}</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag>{campaign.objective}</Tag>
            <Tag>{campaign.budgetMode}</Tag>
            <Tag>
              {currency} {campaign.dailyBudget.toFixed(0)}/day
            </Tag>
            {campaign.bidStrategy && <Tag>{formatBidStrategy(campaign.bidStrategy)}</Tag>}
            {advantagePlus.enabled && <Tag tone="accent">Advantage+</Tag>}
          </div>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
          <strong>Why:</strong> {campaign.why}
        </p>
        {advantagePlus.enabled && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--accent)", lineHeight: 1.5 }}>
            <strong>Advantage+ ({advantagePlus.type}):</strong> {advantagePlus.why}
          </p>
        )}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 8,
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          <span>
            <strong style={{ color: "var(--text-2)" }}>Attribution:</strong> {campaign.attribution}
          </span>
          {campaign.bidStrategyValue && (
            <span>
              <strong style={{ color: "var(--text-2)" }}>Bid:</strong> {campaign.bidStrategyValue}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 18 }}>
        {(() => {
          // Group ad sets by their `group` field so the UI clusters
          // by region/audience-group. Ad sets without a group share an
          // implicit "" bucket and render flat.
          const groups = new Map<string, { adSet: AdSetPlan; index: number }[]>();
          campaignAdSets.forEach((adSet, ai) => {
            const key = (adSet.group ?? "").trim();
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push({ adSet, index: ai });
          });

          return Array.from(groups.entries()).map(([groupName, members]) => (
            <div
              key={groupName || `__nogroup`}
              style={
                groupName
                  ? {
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "10px 12px 12px",
                      background: "var(--surface-2)",
                    }
                  : undefined
              }
            >
              {groupName && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      flexShrink: 0,
                    }}
                  />
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text)",
                    }}
                  >
                    {groupName}
                  </h4>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-3)",
                    }}
                  >
                    {members.length} ad set{members.length === 1 ? "" : "s"}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {members.map(({ adSet, index }) => (
                  <AdSetCard
                    key={index}
                    adSet={adSet}
                    campaignIndex={campaignIndex}
                    adSetIndex={index}
                    currency={currency}
                    images={images}
                    imageKey={imageKey}
                    imagePromptOverrides={imagePromptOverrides}
                    setImagePromptOverrides={setImagePromptOverrides}
                    refinePrompts={refinePrompts}
                    setRefinePrompts={setRefinePrompts}
                    onGenerateImage={onGenerateImage}
                    onRefineImage={onRefineImage}
                    estimate={estimates[`${campaignIndex}-${index}`]}
                    sliceRefines={sliceRefines}
                    setSliceFeedback={setSliceFeedback}
                    onRefineSlice={onRefineSlice}
                    sliceKey={sliceKey}
                  />
                ))}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

function AdSetCard({
  adSet,
  campaignIndex,
  adSetIndex,
  currency,
  images,
  imageKey,
  imagePromptOverrides,
  setImagePromptOverrides,
  refinePrompts,
  setRefinePrompts,
  onGenerateImage,
  onRefineImage,
  estimate,
  sliceRefines,
  setSliceFeedback,
  onRefineSlice,
  sliceKey,
}: {
  adSet: AdSetPlan;
  campaignIndex: number;
  adSetIndex: number;
  currency: string;
  images: Record<string, GeneratedImage>;
  imageKey: (c: number, a: number, cr: number, frame?: number) => string;
  imagePromptOverrides: Record<string, string>;
  setImagePromptOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  refinePrompts: Record<string, string>;
  setRefinePrompts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onGenerateImage: (
    key: string,
    prompt: string,
    aspect: "square" | "portrait" | "landscape",
  ) => void;
  onRefineImage: (key: string, aspect: "square" | "portrait" | "landscape") => void;
  estimate?:
    | {
        ok: true;
        estimate: {
          estimatedDauLower: number;
          estimatedDauUpper: number;
          estimatedMauLower: number;
          estimatedMauUpper: number;
        };
      }
    | { ok: false; error: string };
  sliceRefines: Record<string, { feedback: string; loading: boolean }>;
  setSliceFeedback: (key: string, feedback: string) => void;
  onRefineSlice: (scope: {
    campaignIndex: number;
    adSetIndex?: number;
    creativeIndex?: number;
  }) => void;
  sliceKey: (ci: number, ai?: number, cri?: number) => string;
}) {
  const hasGeo = (adSet.geoTargeting?.length ?? 0) > 0;
  const targetingOptionIds = Array.isArray(adSet.targetingOptionIds)
    ? adSet.targetingOptionIds
    : [];
  const creatives = Array.isArray(adSet.creatives) ? adSet.creatives : [];
  const adSetRefineKey = sliceKey(campaignIndex, adSetIndex);
  const adSetRefine = sliceRefines[adSetRefineKey] ?? { feedback: "", loading: false };
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 14,
        background: "var(--bg)",
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
            {adSet.cohort && (
              <span style={{ color: "var(--accent)", marginRight: 8 }}>[{adSet.cohort}]</span>
            )}
            {adSet.name}
          </h4>
          {adSet.audienceSummary && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-2)" }}>
              {adSet.audienceSummary}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag>
            {currency} {adSet.dailyBudget.toFixed(0)}/day
          </Tag>
          <Tag>
            Age {adSet.ageRange.min}–{adSet.ageRange.max}
          </Tag>
          <Tag>{adSet.genders === "all" ? "All genders" : adSet.genders}</Tag>
          {adSet.advantageAudience && <Tag tone="accent">Advantage+ Audience</Tag>}
        </div>
      </div>

      {/* Reach estimate */}
      {estimate && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid " + (estimate.ok ? "var(--success-text)" : "var(--danger-text)"),
            borderRadius: 6,
            fontSize: 11,
            color: "var(--text-2)",
          }}
        >
          {estimate.ok ? (
            <span>
              <strong style={{ color: "var(--success-text)" }}>Live reach</strong>{" "}
              <strong style={{ color: "var(--text)" }}>
                {formatRange(
                  estimate.estimate.estimatedMauLower,
                  estimate.estimate.estimatedMauUpper,
                )}
              </strong>
              {" monthly active · "}
              <strong style={{ color: "var(--text)" }}>
                {formatRange(
                  estimate.estimate.estimatedDauLower,
                  estimate.estimate.estimatedDauUpper,
                )}
              </strong>
              {" daily active"}
            </span>
          ) : (
            <span>
              <strong style={{ color: "var(--danger-text)" }}>Reach estimate failed</strong>{" "}
              <span style={{ color: "var(--text-3)" }}>{estimate.error}</span>
            </span>
          )}
        </div>
      )}

      {/* Geo block — prominent */}
      {hasGeo && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-2)",
              marginBottom: 5,
            }}
          >
            Geo targeting <span style={{ opacity: 0.65 }}>({adSet.geoTargeting!.length})</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>
            {adSet.geoTargeting!.join(", ")}
          </p>
          {adSet.geoTargetingNotes && (
            <p
              style={{
                margin: "5px 0 0",
                fontSize: 11,
                color: "var(--text-2)",
                fontStyle: "italic",
              }}
            >
              {adSet.geoTargetingNotes}
            </p>
          )}
          {adSet.expatTargeting && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 11,
                color: "var(--accent)",
                padding: "4px 8px",
                background: "var(--accent-bg)",
                border: "1px solid var(--accent)",
                borderRadius: 4,
                display: "inline-block",
              }}
            >
              <strong>Expat / Lived-in: </strong>
              {adSet.expatTargeting}
            </p>
          )}
        </div>
      )}

      {/* Cohort + lookalike line */}
      {(adSet.cohort || adSet.lookalikeStrategy) && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
          {adSet.cohort && (
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--text)" }}>{adSet.cohort}</strong>
              {adSet.lookalikeStrategy && (
                <span style={{ color: "var(--text-3)" }}> — {adSet.lookalikeStrategy}</span>
              )}
            </p>
          )}
          {!adSet.cohort && adSet.lookalikeStrategy && (
            <p style={{ margin: 0 }}>
              <strong style={{ color: "var(--text)" }}>Lookalikes: </strong>
              {adSet.lookalikeStrategy}
            </p>
          )}
        </div>
      )}

      {/* Detailed targeting block */}
      {adSet.detailedTargeting && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              marginBottom: 4,
            }}
          >
            Detailed targeting
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
            {adSet.detailedTargeting}
          </p>
        </div>
      )}

      {/* Compact specs row */}
      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "6px 16px",
          fontSize: 11,
          color: "var(--text-3)",
        }}
      >
        <span>
          <strong style={{ color: "var(--text-2)" }}>Pillar:</strong> {adSet.pillarName}
        </span>
        <span>
          <strong style={{ color: "var(--text-2)" }}>Optimisation:</strong> {adSet.optimizationGoal}
        </span>
        {adSet.conversionEvent && (
          <span>
            <strong style={{ color: "var(--text-2)" }}>Event:</strong> {adSet.conversionEvent}
          </span>
        )}
        <span>
          <strong style={{ color: "var(--text-2)" }}>Placements:</strong>{" "}
          {adSet.placements === "advantage_plus" ? "Advantage+" : "Manual"}
        </span>
        {adSet.frequencyCap && (
          <span>
            <strong style={{ color: "var(--text-2)" }}>Frequency:</strong> {adSet.frequencyCap}
          </span>
        )}
        {adSet.placements === "manual" && adSet.manualPlacements?.length ? (
          <span style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--text-2)" }}>Manual placements:</strong>{" "}
            {adSet.manualPlacements.join(", ")}
          </span>
        ) : null}
        {adSet.exclusions && adSet.exclusions.length > 0 && (
          <span style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--text-2)" }}>Exclusions:</strong>{" "}
            {adSet.exclusions.join(" · ")}
          </span>
        )}
      </div>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: 12,
          color: "var(--text-2)",
          lineHeight: 1.55,
          paddingLeft: 10,
          borderLeft: "2px solid var(--accent)",
        }}
      >
        <strong style={{ color: "var(--text)" }}>Why:</strong> {adSet.why}
      </p>

      {targetingOptionIds.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: "var(--text-3)", cursor: "pointer" }}>
            {targetingOptionIds.length} targeting IDs
          </summary>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 10.5,
              color: "var(--text-2)",
              wordBreak: "break-all",
            }}
          >
            {targetingOptionIds.join(", ")}
          </p>
        </details>
      )}

      {/* Creatives */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {creatives.map((creative, cri) => {
          const aspect: "square" | "portrait" | "landscape" =
            creative.format === "video" ? "portrait" : "square";
          const prompts = creative.imagePrompts?.length
            ? creative.imagePrompts
            : creative.imagePrompt
              ? [creative.imagePrompt]
              : [];

          const frames = prompts.map((basePrompt, frameIdx) => {
            const key = imageKey(campaignIndex, adSetIndex, cri, frameIdx);
            return {
              key,
              basePrompt,
              image: images[key],
              promptOverride: imagePromptOverrides[key] ?? "",
              setPromptOverride: (v: string) =>
                setImagePromptOverrides((prev) => ({ ...prev, [key]: v })),
              refinePrompt: refinePrompts[key] ?? "",
              setRefinePrompt: (v: string) => setRefinePrompts((prev) => ({ ...prev, [key]: v })),
              onGenerate: () => onGenerateImage(key, basePrompt, aspect),
              onRefine: () => onRefineImage(key, aspect),
            };
          });

          const creativeRefineKey = sliceKey(campaignIndex, adSetIndex, cri);
          const creativeRefine = sliceRefines[creativeRefineKey] ?? {
            feedback: "",
            loading: false,
          };
          return (
            <CreativeCard
              key={cri}
              creative={creative}
              aspect={aspect}
              frames={frames}
              refineFeedback={creativeRefine.feedback}
              refineLoading={creativeRefine.loading}
              onSetRefineFeedback={(v) => setSliceFeedback(creativeRefineKey, v)}
              onApplyRefine={() => onRefineSlice({ campaignIndex, adSetIndex, creativeIndex: cri })}
            />
          );
        })}
      </div>

      {/* Per-ad-set refinement */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
          Refine this ad set
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={adSetRefine.feedback}
            onChange={(e) => setSliceFeedback(adSetRefineKey, e.target.value)}
            placeholder="e.g. Drop Advantage+ Audience here. Tighten geo to GB only. Bump budget by 30%."
            style={{ ...inputStyle, fontSize: 12 }}
            disabled={adSetRefine.loading}
          />
          <button
            type="button"
            onClick={() => onRefineSlice({ campaignIndex, adSetIndex })}
            disabled={adSetRefine.loading || !adSetRefine.feedback.trim()}
            style={{ ...primaryBtnStyle, padding: "6px 12px", fontSize: 11 }}
          >
            {adSetRefine.loading ? (
              <Loader2 style={{ width: 12, height: 12 }} className="spin" />
            ) : (
              <RefreshCw style={{ width: 12, height: 12 }} />
            )}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreativeFrame {
  key: string;
  basePrompt: string;
  image: GeneratedImage | undefined;
  promptOverride: string;
  setPromptOverride: (v: string) => void;
  refinePrompt: string;
  setRefinePrompt: (v: string) => void;
  onGenerate: () => void;
  onRefine: () => void;
}

function CreativeCard({
  creative,
  aspect,
  frames,
  refineFeedback,
  refineLoading,
  onSetRefineFeedback,
  onApplyRefine,
}: {
  creative: CreativeConcept;
  aspect: "square" | "portrait" | "landscape";
  frames: CreativeFrame[];
  refineFeedback: string;
  refineLoading: boolean;
  onSetRefineFeedback: (v: string) => void;
  onApplyRefine: () => void;
}) {
  // Normalise legacy single-variant fields into the multi-variant arrays.
  const hooks = creative.hooks?.length ? creative.hooks : creative.hook ? [creative.hook] : [];
  const headlines = creative.headlines?.length
    ? creative.headlines
    : creative.headline
      ? [creative.headline]
      : [];
  const primaryTexts = creative.primaryTexts?.length
    ? creative.primaryTexts
    : creative.primaryText
      ? [creative.primaryText]
      : [];

  const isMulti = frames.length > 1;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 10,
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-3)",
          }}
        >
          {creative.format.replace("_", " ")}
          {isMulti ? ` · ${frames.length} frames` : ""}
          {" · "}
          {creative.cta}
        </span>
        {creative.copyAngle && <Tag tone="accent">{creative.copyAngle}</Tag>}
      </div>

      {/* Copy variants — each one its own copyable field */}
      <div>
        {hooks.length > 0 && <CopyVariantList label="Hooks" items={hooks} multiline />}
        {headlines.length > 0 && <CopyVariantList label="Headlines" items={headlines} />}
        {primaryTexts.length > 0 && (
          <CopyVariantList label="Primary text" items={primaryTexts} multiline />
        )}
        {creative.longFormVariants && creative.longFormVariants.length > 0 && (
          <LongFormVariantList items={creative.longFormVariants} />
        )}
        <p
          style={{
            margin: "14px 0 0",
            fontSize: 12,
            color: "var(--text-2)",
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--text)" }}>Why this concept:</strong> {creative.why}
        </p>
      </div>

      {/* Image frames — horizontal scroll if many, grid otherwise */}
      {frames.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: `repeat(auto-fit, minmax(${aspect === "portrait" ? 180 : 200}px, 1fr))`,
            gap: 10,
          }}
        >
          {frames.map((frame, idx) => (
            <FrameSlot
              key={frame.key}
              frame={frame}
              aspect={aspect}
              label={isMulti ? `Frame ${idx + 1}` : undefined}
            />
          ))}
        </div>
      )}

      {/* Per-creative refinement */}
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px dashed var(--border)" }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
          Refine this creative
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={refineFeedback}
            onChange={(e) => onSetRefineFeedback(e.target.value)}
            placeholder="e.g. Make hooks more emotive. Switch tone to story-led. Use a darker visual mood."
            style={{ ...inputStyle, fontSize: 12 }}
            disabled={refineLoading}
          />
          <button
            type="button"
            onClick={onApplyRefine}
            disabled={refineLoading || !refineFeedback.trim()}
            style={{ ...primaryBtnStyle, padding: "6px 12px", fontSize: 11 }}
          >
            {refineLoading ? (
              <Loader2 style={{ width: 12, height: 12 }} className="spin" />
            ) : (
              <RefreshCw style={{ width: 12, height: 12 }} />
            )}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function FrameSlot({
  frame,
  aspect,
  label,
}: {
  frame: CreativeFrame;
  aspect: "square" | "portrait" | "landscape";
  label?: string;
}) {
  const [promptOpen, setPromptOpen] = useState(false);
  const height = aspect === "landscape" ? 130 : aspect === "portrait" ? 240 : 200;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      )}

      {frame.image?.url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={frame.image.url}
            alt=""
            style={{
              width: "100%",
              height,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid var(--border)",
              opacity: frame.image.loading ? 0.45 : 1,
              transition: "opacity 200ms ease",
            }}
          />
          <input
            value={frame.refinePrompt}
            onChange={(e) => frame.setRefinePrompt(e.target.value)}
            placeholder="Refine: e.g. warmer light"
            style={{ ...inputStyle, fontSize: 11, padding: "6px 8px" }}
            disabled={frame.image.loading}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <button
              type="button"
              onClick={frame.onRefine}
              disabled={frame.image.loading || !frame.refinePrompt.trim()}
              style={{ ...fileBtnStyle, flex: 1, justifyContent: "center", fontSize: 11 }}
            >
              {frame.image.loading ? (
                <Loader2 style={{ width: 11, height: 11 }} className="spin" />
              ) : (
                <RefreshCw style={{ width: 11, height: 11 }} />
              )}
              Refine
            </button>
            <button
              type="button"
              onClick={frame.onGenerate}
              disabled={frame.image.loading}
              style={{ ...fileBtnStyle, flex: 1, justifyContent: "center", fontSize: 11 }}
              title="Regenerate from prompt"
            >
              <Wand2 style={{ width: 11, height: 11 }} />
              Redo
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={frame.onGenerate}
          disabled={frame.image?.loading}
          style={{
            ...fileBtnStyle,
            justifyContent: "center",
            height,
            flexDirection: "column",
            gap: 8,
            fontSize: 12,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {frame.image?.loading ? (
            <>
              <Loader2 style={{ width: 16, height: 16 }} className="spin" />
              Generating…
            </>
          ) : (
            <>
              <ImagePlus style={{ width: 18, height: 18 }} />
              Generate image
            </>
          )}
        </button>
      )}

      <details
        open={promptOpen}
        onToggle={(e) => setPromptOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Prompt
        </summary>
        <textarea
          value={frame.promptOverride || frame.basePrompt}
          onChange={(e) => frame.setPromptOverride(e.target.value)}
          rows={3}
          style={{ ...textareaStyle, marginTop: 4, fontSize: 11 }}
        />
      </details>
    </div>
  );
}

function CopyVariantList({
  label,
  items,
  multiline,
}: {
  label: string;
  items: string[];
  small?: boolean;
  muted?: boolean;
  multiline?: boolean;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <p
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-3)",
        }}
      >
        {label} &nbsp;<span style={{ opacity: 0.5 }}>[{items.length}]</span>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((it, i) => (
          <CopyVariantField key={i} index={i} value={it} multiline={multiline} />
        ))}
      </div>
    </div>
  );
}

function LongFormVariantList({ items }: { items: LongFormVariant[] }) {
  return (
    <div style={{ marginTop: 14 }}>
      <p
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--accent)",
        }}
      >
        Long-form copy <span style={{ opacity: 0.5 }}>[{items.length}]</span>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((v, i) => (
          <LongFormVariantField key={i} index={i} variant={v} />
        ))}
      </div>
    </div>
  );
}

function LongFormVariantField({ index, variant }: { index: number; variant: LongFormVariant }) {
  // Derived-state pattern: re-sync local edits when the underlying plan
  // refines, using setState-during-render (React's recommended approach).
  const [state, setState] = useState({ prop: variant.text, text: variant.text });
  if (state.prop !== variant.text) {
    setState({ prop: variant.text, text: variant.text });
  }
  const text = state.text;
  const setText = (v: string) => setState((s) => ({ ...s, text: v }));
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "flex-start",
          justifyContent: "center",
          minWidth: 30,
          padding: "6px 6px 0",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "var(--text-3)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              background: "var(--accent-bg)",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              borderRadius: 999,
            }}
          >
            {variant.tone || "Tone"}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-3)" }}>
            {wordCount} word{wordCount === 1 ? "" : "s"}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(10, Math.max(4, Math.ceil(text.length / 70)))}
          spellCheck={false}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            padding: "8px 10px",
            fontSize: 12.5,
            lineHeight: 1.55,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      </div>
      <button
        type="button"
        onClick={copy}
        title="Copy to clipboard"
        aria-label="Copy long-form variant"
        style={{
          ...iconBtnStyle,
          alignItems: "flex-start",
          paddingTop: 8,
          width: 30,
          height: "auto",
        }}
      >
        {copied ? (
          <Check style={{ width: 12, height: 12 }} />
        ) : (
          <Copy style={{ width: 12, height: 12 }} />
        )}
      </button>
    </div>
  );
}

function CopyVariantField({
  index,
  value,
  multiline,
}: {
  index: number;
  value: string;
  multiline?: boolean;
}) {
  // Derived-state pattern: store the prop value alongside the editable text.
  // When the prop changes (e.g. plan refines), we reset the local text via
  // setState during render. React handles this cleanly without the
  // setState-in-effect anti-pattern.
  const [state, setState] = useState({ prop: value, text: value });
  if (state.prop !== value) {
    setState({ prop: value, text: value });
  }
  const text = state.text;
  const setText = (v: string) => setState((s) => ({ ...s, text: v }));
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  }

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 28,
          padding: "0 6px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: "var(--text-3)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      {multiline ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.max(2, Math.ceil(text.length / 90))}
          spellCheck={false}
          style={{
            flex: 1,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            padding: "7px 10px",
            fontSize: 12.5,
            lineHeight: 1.5,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
      ) : (
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            padding: "7px 10px",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
      )}
      <button
        type="button"
        onClick={copy}
        title="Copy to clipboard"
        aria-label="Copy variant"
        style={iconBtnStyle}
      >
        {copied ? (
          <Check style={{ width: 12, height: 12 }} />
        ) : (
          <Copy style={{ width: 12, height: 12 }} />
        )}
      </button>
    </div>
  );
}

function formatRange(lower: number, upper: number): string {
  const f = (n: number) => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };
  if (!lower && !upper) return "—";
  if (lower === upper) return f(lower);
  return `${f(lower)}–${f(upper)}`;
}

function formatBidStrategy(s: string): string {
  switch (s) {
    case "lowest_cost":
      return "Lowest cost";
    case "cost_cap":
      return "Cost cap";
    case "bid_cap":
      return "Bid cap";
    case "lowest_cost_with_min_roas":
      return "Min ROAS";
    default:
      return s;
  }
}

function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        marginTop: 2,
        background: checked ? "var(--accent-bg)" : "var(--surface)",
        border: "1px solid " + (checked ? "var(--accent)" : "var(--border)"),
        color: checked ? "var(--accent)" : "var(--text-3)",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
        borderRadius: 4,
      }}
    >
      {checked ? <Check style={{ width: 11, height: 11 }} /> : null}
    </button>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "accent" | "default" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: 999,
        background: tone === "accent" ? "var(--accent-bg)" : "var(--surface)",
        color: tone === "accent" ? "var(--accent)" : "var(--text-2)",
        border: "1px solid",
        borderColor: tone === "accent" ? "var(--accent)" : "var(--border)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </span>
  );
}

function HandoffList({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-3)",
        }}
      >
        {title}
      </p>
      <ul
        style={{
          margin: "6px 0 0",
          paddingLeft: 18,
          fontSize: 12,
          color: "var(--text-2)",
          lineHeight: 1.5,
        }}
      >
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Analysis panel ─────────────────────────────────────────────────────

function AnalysisPanel({ result }: { result: AISuggestResponse }) {
  const [open, setOpen] = useState(true);
  const a = result.analysis ?? {};
  const sections: { key: keyof typeof a; label: string }[] = [
    { key: "explicit", label: "Explicit signals" },
    { key: "implicit", label: "Implicit signals" },
    { key: "adjacent", label: "Adjacent communities" },
    { key: "cultural", label: "Cultural / food / tradition" },
    { key: "media", label: "Media proxies" },
    { key: "diaspora", label: "Diaspora / lived-in / expat" },
    { key: "niches", label: "Niche sub-segments" },
    { key: "contrarian", label: "Contrarian angles" },
  ];
  const hasAnalysis = sections.some((s) => (a[s.key]?.length ?? 0) > 0);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        background: "var(--surface-2)",
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Sparkles style={{ width: 13, height: 13, color: "var(--accent)" }} />
        <strong style={{ fontSize: 12, color: "var(--text)" }}>
          How Claude thought about this brief
        </strong>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>
          {result.totalCandidates.toLocaleString()} candidates · pass 1:{" "}
          {result.pass1ResultCount ?? 0} · pass 2: {result.pass2ResultCount ?? 0}
          {result.coverage ? ` · ${result.coverage.callsFired} Meta API calls` : ""}
        </span>
        {open ? (
          <ChevronUp style={{ width: 13, height: 13, color: "var(--text-3)" }} />
        ) : (
          <ChevronDown style={{ width: 13, height: 13, color: "var(--text-3)" }} />
        )}
      </button>

      {open && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {result.thesis && (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text)",
                fontStyle: "italic",
                borderLeft: "2px solid var(--accent)",
                paddingLeft: 10,
              }}
            >
              {result.thesis}
            </p>
          )}

          {result.optimisation && !result.optimisation.gapWaveExecuted && (
            <div
              style={{
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: 6,
                background: "var(--surface)",
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-2)" }}>
                <strong style={{ color: "var(--text)" }}>Adaptive optimisation:</strong> gap-fill
                pass skipped (
                {result.optimisation.gapWaveReason ?? "first-wave coverage considered sufficient"}).
              </p>
              {typeof result.optimisation.firstWaveTypeCoverage === "number" && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-3)" }}>
                  First-wave type coverage score: {result.optimisation.firstWaveTypeCoverage}/4
                </p>
              )}
            </div>
          )}

          {hasAnalysis && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {sections.map((s) => {
                const items = a[s.key] ?? [];
                if (!items.length) return null;
                return (
                  <div key={String(s.key)}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-3)",
                      }}
                    >
                      {s.label}
                    </p>
                    <ul
                      style={{
                        margin: "5px 0 0",
                        paddingLeft: 16,
                        fontSize: 12,
                        color: "var(--text-2)",
                        lineHeight: 1.45,
                      }}
                    >
                      {items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          {result.gaps.length > 0 && (
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--warning-text)",
                }}
              >
                Gaps the second pass targeted
              </p>
              <ul
                style={{
                  margin: "5px 0 0",
                  paddingLeft: 16,
                  fontSize: 12,
                  color: "var(--text-2)",
                  lineHeight: 1.45,
                }}
              >
                {result.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <details>
              <summary style={{ fontSize: 11, color: "var(--text-3)", cursor: "pointer" }}>
                Pass 1 queries ({result.pass1Queries.length})
              </summary>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-2)" }}>
                {result.pass1Queries.join(", ")}
              </p>
            </details>
            {result.pass2Queries.length > 0 && (
              <details>
                <summary style={{ fontSize: 11, color: "var(--text-3)", cursor: "pointer" }}>
                  Pass 2 (gap-fill) queries ({result.pass2Queries.length})
                </summary>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-2)" }}>
                  {result.pass2Queries.join(", ")}
                </p>
                {result.optimisation && !result.optimisation.gapWaveExecuted && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--warning-text)" }}>
                    These were generated but not executed:{" "}
                    {result.optimisation.gapWaveReason ?? "gap wave skipped by optimiser"}.
                  </p>
                )}
              </details>
            )}
            {result.coverage && (
              <details>
                <summary
                  style={{
                    fontSize: 11,
                    color: "var(--text-3)",
                    cursor: "pointer",
                    letterSpacing: "0.05em",
                  }}
                >
                  &gt; Coverage telemetry — {result.coverage.callsFired} Meta API calls across{" "}
                  {Object.keys(result.coverage.byEndpoint).length} endpoints
                </summary>
                <div
                  style={{
                    margin: "6px 0 0",
                    fontSize: 11,
                    color: "var(--text-2)",
                    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
                    lineHeight: 1.6,
                  }}
                >
                  <div>
                    queries fired (incl. single-word variants):{" "}
                    <strong>{result.coverage.queriesUsed}</strong>
                  </div>
                  <div>
                    total Meta API calls: <strong>{result.coverage.callsFired}</strong>
                  </div>
                  <div style={{ marginTop: 4 }}>by endpoint:</div>
                  <ul style={{ margin: "2px 0 4px", paddingLeft: 16 }}>
                    {Object.entries(result.coverage.byEndpoint).map(([k, v]) => (
                      <li key={k}>
                        <span style={{ color: "var(--accent)" }}>{k}</span>: {v} result
                        {v === 1 ? "" : "s"}
                      </li>
                    ))}
                  </ul>
                  {result.coverage.expansionSeeds.length > 0 && (
                    <div>
                      similar-interest expansion seeded by{" "}
                      <strong>{result.coverage.expansionSeeds.join(", ")}</strong>
                      {" — added "}
                      <strong>{result.coverage.expansionAdded}</strong>
                      {" new options"}
                    </div>
                  )}
                  {result.coverage.expansionSkippedReason && (
                    <div>
                      expansion skipped reason:{" "}
                      <strong>{result.coverage.expansionSkippedReason}</strong>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result card ────────────────────────────────────────────────────────

function ResultCard({
  item,
  why,
  selected,
  copied,
  onAdd,
  onCopy,
}: {
  item: TargetingResult;
  why?: string;
  selected: boolean;
  copied: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const size = formatSize(item.audienceSizeLower, item.audienceSizeUpper);
  const path = item.path?.join(" › ") ?? "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "8px 10px",
        border: "1px solid " + (selected ? "var(--accent)" : "var(--border)"),
        borderRadius: 8,
        background: selected ? "var(--accent-bg)" : "var(--surface-2)",
        opacity: selected ? 1 : 0.5,
        transition: "opacity 160ms ease, border-color 160ms ease",
      }}
    >
      <CheckBox checked={selected} onChange={onAdd} label={`Toggle ${item.name}`} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text)",
              textDecoration: selected ? "none" : "line-through",
            }}
          >
            {item.name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--surface)",
              color: "var(--text-2)",
              border: "1px solid var(--border)",
              textTransform: "lowercase",
            }}
          >
            {item.type || "—"}
          </span>
          {size && <span style={{ fontSize: 11, color: "var(--text-3)" }}>· {size}</span>}
        </div>
        {path && <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-3)" }}>{path}</p>}
        {item.description && (
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-2)" }}>
            {item.description}
          </p>
        )}
        {why && (
          <p
            style={{ margin: "4px 0 0", fontSize: 11, color: "var(--accent)", fontStyle: "italic" }}
          >
            {why}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onCopy}
        title="Copy ID"
        style={iconBtnStyle}
        aria-label="Copy ID"
      >
        {copied ? (
          <Check style={{ width: 12, height: 12 }} />
        ) : (
          <Copy style={{ width: 12, height: 12 }} />
        )}
      </button>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatSize(lower?: number | null, upper?: number | null): string {
  if (!lower && !upper) return "";
  const f = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };
  if (lower && upper) return `${f(lower)}–${f(upper)} people`;
  return f((lower || upper) as number);
}

// ─── Inline styles ──────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 20,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-2)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 13,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  color: "var(--text)",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "inherit",
  resize: "vertical",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: "var(--r)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text-2)",
  cursor: "pointer",
};

const fileBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 12,
  cursor: "pointer",
  color: "var(--text-2)",
};
