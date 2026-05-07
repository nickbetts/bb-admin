"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
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
  imagePrompt?: string;        // legacy single-prompt field
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

interface FullPlan {
  summary: string;
  structureRationale: string;
  campaigns: CampaignPlan[];
  creativeTestingFramework?: string;
  weekByWeek?: string[];
  measurement: {
    primaryKpi: string;
    secondaryKpis: string[];
    minLearningPhaseEvents: string;
    ctaToHoldOff: string;
  };
  risks: string[];
  scaleUp: string;
}

interface GeneratedImage {
  url: string;
  prompt: string;
  loading?: boolean;
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
  const [estimates, setEstimates] = useState<Record<string, { ok: true; estimate: { estimatedDauLower: number; estimatedDauUpper: number; estimatedMauLower: number; estimatedMauUpper: number } } | { ok: false; error: string }>>({});
  const [estimatesLoading, setEstimatesLoading] = useState(false);

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
  const [refinementHistory, setRefinementHistory] = useState<{ feedback: string; appliedAt: string }[]>([]);

  // Per-creative image state — keyed by `${campaignIdx}-${adSetIdx}-${creativeIdx}`
  const [images, setImages] = useState<Record<string, GeneratedImage>>({});
  const [imagePromptOverrides, setImagePromptOverrides] = useState<Record<string, string>>({});
  const [refinePrompts, setRefinePrompts] = useState<Record<string, string>>({});

  // Convenience: an option/pillar is "active" when it's NOT in the exclusion set.
  const isPillarActive = useCallback((name: string) => !excludedPillars.has(name), [excludedPillars]);
  const isOptionActive = useCallback((id: string) => !excludedOptionIds.has(id), [excludedOptionIds]);

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
  function buildPillarsForPlan(): { name: string; rationale: string; options: { id: string; name: string; type: string }[] }[] {
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
      setPlan(data.plan as FullPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan generation failed");
    } finally {
      setPlanLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyBudget, currency, objective, brief, clientName, sector, geography, aiResult, excludedPillars, excludedOptionIds]);

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
      setPlan(data.plan as FullPlan);
      setRefinementHistory((prev) => [...prev, { feedback: feedbackText, appliedAt: new Date().toISOString() }]);
      setRefineFeedback("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setRefineLoading(false);
    }
  }, [plan, refineFeedback, brief, clientName, aiResult, refinementHistory]);

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
      plan.campaigns.forEach((c, ci) => {
        c.adSets.forEach((a, ai) => {
          const interestIds: { id: string }[] = [];
          const behaviorIds: { id: string }[] = [];
          for (const id of a.targetingOptionIds ?? []) {
            const t = (optionTypeById.get(String(id)) ?? "").toLowerCase();
            if (t.includes("behavior") || t.includes("behaviour")) behaviorIds.push({ id: String(id) });
            else interestIds.push({ id: String(id) });
          }
          adSets.push({
            campaignIndex: ci,
            adSetIndex: ai,
            geoCountries: a.geoTargeting && a.geoTargeting.length > 0 ? a.geoTargeting : undefined,
            ageMin: a.ageRange.min,
            ageMax: a.ageRange.max,
            genders: a.genders,
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


  async function generateImage(key: string, basePrompt: string, aspect: "square" | "portrait" | "landscape") {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Image generation failed");
      setImages((prev) => ({ ...prev, [key]: { url: data.url, prompt, loading: false } }));
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
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Fullscreen takeover: hide the Stratos sidebar while this tool is mounted
  // so Meta Assassin gets the full canvas.
  useEffect(() => {
    document.body.classList.add("meta-assassin-fullscreen");
    return () => { document.body.classList.remove("meta-assassin-fullscreen"); };
  }, []);
  const [autoGenerating, setAutoGenerating] = useState<{ done: number; total: number } | null>(null);

  const autoGenerateImagesForPlan = useCallback(async (p: FullPlan) => {
    type Task = { key: string; prompt: string; aspect: "square" | "portrait" | "landscape" };
    const tasks: Task[] = [];
    const existing = imagesRef.current;

    p.campaigns.forEach((campaign, ci) => {
      campaign.adSets.forEach((adSet, ai) => {
        adSet.creatives.forEach((creative, cri) => {
          const prompts = creative.imagePrompts?.length
            ? creative.imagePrompts
            : (creative.imagePrompt ? [creative.imagePrompt] : []);
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
        if (myToken !== generationToken.current) return;     // cancelled
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
            const err = await res.json().catch(() => ({} as { error?: string }));
            throw new Error(err.error ?? "Image generation failed");
          }
          const data = (await res.json()) as { url: string };
          setImages((prev) => ({ ...prev, [t.key]: { url: data.url, prompt: t.prompt, loading: false } }));
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Image refinement failed");
      setImages((prev) => ({ ...prev, [key]: { url: data.url, prompt: existing.prompt, loading: false } }));
      setRefinePrompts((prev) => ({ ...prev, [key]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image refinement failed");
      setImages((prev) => ({ ...prev, [key]: { ...existing, loading: false } }));
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="cyber-shell">
      {/* Animated ambient background */}
      <div className="cyber-bg" aria-hidden="true">
        <div className="cyber-grid" />
        <div className="cyber-orb cyber-orb-1" />
        <div className="cyber-orb cyber-orb-2" />
        <div className="cyber-orb cyber-orb-3" />
        <div className="cyber-scanlines" />
      </div>

      <main className="cyber-main">
        <header className="cyber-header">
          <div className="cyber-target">
            <Crosshair className="cyber-target-icon" />
            <span className="cyber-target-pulse" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="cyber-eyebrow">
              <span className="cyber-dot" /> SYS // META.ASSASSIN <span className="cyber-version">v2.7</span> · STATUS: <span className="cyber-status-online">ONLINE</span>
            </div>
            <h1 className="cyber-title" data-text="META ASSASSIN">META ASSASSIN</h1>
            <p className="cyber-tagline">
              <span className="cyber-tagline-prefix">&gt;</span> Audience reconnaissance · Campaign architecture · Creative payload · <span className="cyber-cartel">Powered by the Cyber Cartel.</span>
            </p>
          </div>
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
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
                <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)" }}>
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
                    <label style={labelStyle}>Meta ad account (used for live reach estimates)</label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      style={inputStyle}
                      disabled={aiLoading}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} · act_{a.id}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                  Claude reads the brief, runs a first wave of Meta searches, identifies what was missed, runs a gap-fill second wave, then curates the strongest options into pillars. Takes 30-90 seconds.
                </span>
                <button
                  type="button"
                  onClick={runAiSuggest}
                  disabled={aiLoading}
                  style={primaryBtnStyle}
                >
                  {aiLoading ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Sparkles style={{ width: 14, height: 14 }} />}
                  {aiLoading ? "Running…" : "Generate suggestions"}
                </button>
              </div>

              {aiResult && (
                <div style={{ marginTop: 22 }}>
                  {aiResult.warning && (
                    <p style={{ fontSize: 12, color: "var(--warning-text)", marginBottom: 10 }}>{aiResult.warning}</p>
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
                              const activeOptions = pillar.options.filter((o) => isOptionActive(o.id));
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
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", textDecoration: pillarActive ? "none" : "line-through" }}>
                                            {pillar.name}
                                          </h3>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 600,
                                              padding: "1px 6px",
                                              borderRadius: 4,
                                              background: pillarActive ? "var(--accent-bg)" : "var(--surface)",
                                              color: pillarActive ? "var(--accent)" : "var(--text-3)",
                                              border: "1px solid " + (pillarActive ? "var(--accent)" : "var(--border)"),
                                            }}
                                          >
                                            {activeCount}/{pillar.options.length} active
                                          </span>
                                        </div>
                                        {pillar.rationale && (
                                          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-2)" }}>
                                            {pillar.rationale}
                                          </p>
                                        )}
                                      </div>
                                      {collapsed ? (
                                        <ChevronDown style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0, marginTop: 2 }} />
                                      ) : (
                                        <ChevronUp style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0, marginTop: 2 }} />
                                      )}
                                    </button>
                                  </div>
                                  {!collapsed && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, opacity: pillarActive ? 1 : 0.55 }}>
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
            />
          )}

        </div>
      </div>

      </main>

      <style jsx global>{`
        /* ─────────────────────────────────────────────────────────────
           META ASSASSIN — cyberpunk theme, scoped to .cyber-shell only.
           Overrides the global Stratos design tokens within this tool
           without bleeding into the rest of the app.
           ───────────────────────────────────────────────────────────── */
        .cyber-shell {
          --cyber-magenta: #ff2bd6;
          --cyber-cyan: #00fff7;
          --cyber-lime: #84ff4f;
          --cyber-violet: #b026ff;
          --cyber-amber: #ffb300;
          --cyber-bg-deep: #06050d;
          --cyber-bg-mid: #0c0a1c;
          --cyber-bg-soft: #14112a;

          /* Override Stratos design tokens */
          --bg: var(--cyber-bg-deep);
          --surface: rgba(20, 17, 42, 0.55);
          --surface-2: rgba(34, 28, 64, 0.55);
          --border: rgba(255, 43, 214, 0.22);
          --border-subtle: rgba(0, 255, 247, 0.15);
          --text: #f5efff;
          --text-2: #cdc6e6;
          --text-3: #7d77a1;
          --text-4: #5a5479;
          --accent: var(--cyber-magenta);
          --accent-bg: rgba(255, 43, 214, 0.12);
          --warning-text: var(--cyber-amber);
          --warning-bg: rgba(255, 179, 0, 0.12);
          --warning-border: rgba(255, 179, 0, 0.4);
          --success-text: var(--cyber-lime);
          --success-bg: rgba(132, 255, 79, 0.10);
          --success-border: rgba(132, 255, 79, 0.4);
          --danger-text: #ff5577;
          --danger-bg: rgba(255, 85, 119, 0.12);
          --danger-border: rgba(255, 85, 119, 0.4);
          --r: 4px;

          position: relative;
          min-height: calc(100vh - 0px);
          background: var(--cyber-bg-deep);
          color: var(--text);
          overflow: hidden;
          font-feature-settings: "ss01", "ss02";
        }

        /* Background layers */
        .cyber-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .cyber-grid {
          position: absolute;
          inset: -2px;
          background-image:
            linear-gradient(rgba(255, 43, 214, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 247, 0.045) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.1) 100%);
        }
        .cyber-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.32;
          mix-blend-mode: screen;
        }
        .cyber-orb-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, var(--cyber-magenta) 0%, transparent 65%);
          top: -120px; left: -100px;
          animation: cyber-drift-a 22s ease-in-out infinite;
        }
        .cyber-orb-2 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, var(--cyber-cyan) 0%, transparent 60%);
          top: 30%; right: -180px;
          animation: cyber-drift-b 28s ease-in-out infinite;
        }
        .cyber-orb-3 {
          width: 480px; height: 480px;
          background: radial-gradient(circle, var(--cyber-violet) 0%, transparent 65%);
          bottom: -120px; left: 30%;
          animation: cyber-drift-c 34s ease-in-out infinite;
          opacity: 0.28;
        }
        .cyber-scanlines {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(transparent 50%, rgba(0,0,0,0.18) 50%);
          background-size: 100% 3px;
          opacity: 0.35;
          mix-blend-mode: multiply;
        }
        @keyframes cyber-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(60px, 80px) scale(1.1); }
        }
        @keyframes cyber-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, 60px) scale(1.08); }
        }
        @keyframes cyber-drift-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.05); }
        }

        /* Main column on top of background */
        .cyber-main {
          position: relative;
          z-index: 1;
          max-width: 1300px;
          margin: 0 auto;
          padding: 32px 32px 96px;
        }

        /* ── Header ─────────────────────────────────────────── */
        .cyber-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 8px;
        }
        .cyber-target {
          position: relative;
          width: 56px; height: 56px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--cyber-magenta);
          background:
            linear-gradient(135deg, rgba(255, 43, 214, 0.15), rgba(0, 255, 247, 0.05));
          box-shadow:
            0 0 18px rgba(255, 43, 214, 0.45),
            inset 0 0 18px rgba(255, 43, 214, 0.18);
          clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
        }
        .cyber-target-icon {
          width: 28px; height: 28px;
          color: var(--cyber-magenta);
          filter: drop-shadow(0 0 6px var(--cyber-magenta));
          animation: cyber-target-spin 6s linear infinite;
        }
        .cyber-target-pulse {
          position: absolute;
          inset: -4px;
          border: 1px solid var(--cyber-cyan);
          opacity: 0;
          animation: cyber-pulse 2.4s ease-out infinite;
          clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
        }
        @keyframes cyber-target-spin { to { transform: rotate(360deg); } }
        @keyframes cyber-pulse {
          0% { opacity: 0.7; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.25); }
        }

        .cyber-eyebrow {
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          font-size: 10.5px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--text-3);
          margin-bottom: 6px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .cyber-version {
          color: var(--cyber-cyan);
          margin: 0 6px;
        }
        .cyber-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--cyber-lime);
          box-shadow: 0 0 8px var(--cyber-lime);
          animation: cyber-blink 1.6s ease-in-out infinite;
        }
        .cyber-status-online {
          color: var(--cyber-lime);
          text-shadow: 0 0 6px rgba(132, 255, 79, 0.6);
        }
        @keyframes cyber-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .cyber-title {
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin: 0;
          line-height: 1;
          background: linear-gradient(95deg, #ffffff 0%, var(--cyber-magenta) 35%, var(--cyber-cyan) 70%, #ffffff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 28px rgba(255, 43, 214, 0.35);
          position: relative;
          animation: cyber-shimmer 6s ease-in-out infinite;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
        }
        .cyber-title::before,
        .cyber-title::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          -webkit-text-fill-color: initial;
        }
        .cyber-title::before {
          color: var(--cyber-cyan);
          text-shadow: 0 0 10px var(--cyber-cyan);
          opacity: 0.6;
          animation: cyber-glitch-a 4.8s steps(1) infinite;
          mix-blend-mode: screen;
        }
        .cyber-title::after {
          color: var(--cyber-magenta);
          text-shadow: 0 0 10px var(--cyber-magenta);
          opacity: 0.6;
          animation: cyber-glitch-b 4.8s steps(1) infinite;
          mix-blend-mode: screen;
        }
        @keyframes cyber-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes cyber-glitch-a {
          0%, 92%, 100% { transform: translate(0, 0); opacity: 0; }
          93% { transform: translate(-2px, 1px); opacity: 0.6; }
          94% { transform: translate(0, 0); opacity: 0; }
          96% { transform: translate(2px, -1px); opacity: 0.6; }
          97% { transform: translate(0, 0); opacity: 0; }
        }
        @keyframes cyber-glitch-b {
          0%, 90%, 100% { transform: translate(0, 0); opacity: 0; }
          91% { transform: translate(2px, -1px); opacity: 0.6; }
          92% { transform: translate(0, 0); opacity: 0; }
          95% { transform: translate(-2px, 1px); opacity: 0.6; }
          95.5% { transform: translate(0, 0); opacity: 0; }
        }

        .cyber-tagline {
          margin: 8px 0 0;
          font-size: 12.5px;
          color: var(--text-2);
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          letter-spacing: 0.01em;
        }
        .cyber-tagline-prefix {
          color: var(--cyber-cyan);
          margin-right: 6px;
        }

        /* ── Tabs ─────────────────────────────────────────── */
        .cyber-shell button {
          font-family: inherit;
        }
        .cyber-shell h1, .cyber-shell h2, .cyber-shell h3 {
          color: var(--text);
        }

        /* ── Cards (overrides inline cardStyle) ───────────── */
        .cyber-shell section {
          position: relative;
          background:
            linear-gradient(180deg, rgba(20, 17, 42, 0.65) 0%, rgba(12, 10, 28, 0.65) 100%) !important;
          border: 1px solid var(--border) !important;
          border-radius: var(--r) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow:
            0 0 0 1px rgba(255, 43, 214, 0.04),
            0 24px 80px -40px rgba(255, 43, 214, 0.5);
          overflow: hidden;
        }
        .cyber-shell section::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent,
            rgba(255, 43, 214, 0) 5%,
            var(--cyber-magenta) 35%,
            var(--cyber-cyan) 65%,
            transparent 95%);
          opacity: 0.7;
        }
        .cyber-shell section::after {
          content: "";
          position: absolute;
          top: 8px;
          right: 12px;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          font-size: 9px;
          color: var(--text-4);
          letter-spacing: 0.2em;
        }

        /* Aside (right-rail selection panel) */
        .cyber-shell aside {
          background:
            linear-gradient(180deg, rgba(20, 17, 42, 0.7) 0%, rgba(12, 10, 28, 0.7) 100%) !important;
          border: 1px solid var(--border) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow:
            0 24px 80px -40px rgba(0, 255, 247, 0.5);
          position: relative;
          overflow: hidden;
        }
        .cyber-shell aside::before {
          content: "";
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, var(--cyber-magenta), var(--cyber-cyan));
          box-shadow: 0 0 12px var(--cyber-magenta);
        }

        /* Inputs / textareas */
        .cyber-shell input,
        .cyber-shell textarea,
        .cyber-shell select {
          background: rgba(8, 6, 18, 0.6) !important;
          border: 1px solid var(--border-subtle) !important;
          color: var(--text) !important;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          font-size: 12.5px !important;
          letter-spacing: 0.01em;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .cyber-shell input::placeholder,
        .cyber-shell textarea::placeholder {
          color: var(--text-4);
        }
        .cyber-shell input:focus,
        .cyber-shell textarea:focus,
        .cyber-shell select:focus {
          outline: none;
          border-color: var(--cyber-cyan) !important;
          box-shadow: 0 0 0 1px var(--cyber-cyan), 0 0 16px rgba(0, 255, 247, 0.25);
        }

        /* Primary buttons (the var(--accent) ones) */
        .cyber-shell button[type="button"][style*="var(--accent)"],
        .cyber-shell button[style*="background: var(--accent)"] {
          background: linear-gradient(135deg, var(--cyber-magenta) 0%, var(--cyber-violet) 100%) !important;
          color: #fff !important;
          border: 1px solid var(--cyber-magenta) !important;
          box-shadow:
            0 0 16px rgba(255, 43, 214, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          font-weight: 600 !important;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-size: 12px !important;
          position: relative;
          overflow: hidden;
          transition: transform 120ms ease, box-shadow 200ms ease;
        }
        .cyber-shell button[style*="var(--accent)"]:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow:
            0 0 24px rgba(255, 43, 214, 0.7),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        .cyber-shell button[style*="var(--accent)"]::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg,
            transparent,
            rgba(255, 255, 255, 0.25),
            transparent);
          animation: cyber-sweep 3.2s ease-in-out infinite;
        }
        @keyframes cyber-sweep {
          0% { left: -60%; }
          50%, 100% { left: 120%; }
        }

        /* Secondary / file buttons */
        .cyber-shell button[type="button"][style*="surface-2"]:not([style*="var(--accent)"]) {
          background: rgba(20, 17, 42, 0.55) !important;
          border: 1px solid var(--border) !important;
          color: var(--text-2) !important;
          font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-size: 11px !important;
          transition: all 160ms ease;
        }
        .cyber-shell button[style*="surface-2"]:hover {
          border-color: var(--cyber-cyan) !important;
          color: var(--cyber-cyan) !important;
          box-shadow: 0 0 12px rgba(0, 255, 247, 0.25);
        }

        /* Selection chip in nav */
        .cyber-shell strong {
          color: var(--text);
        }

        /* Loading spinner */
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Scrollbar inside the shell */
        .cyber-shell *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .cyber-shell *::-webkit-scrollbar-track { background: rgba(8, 6, 18, 0.4); }
        .cyber-shell *::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--cyber-magenta), var(--cyber-violet));
          border-radius: 0;
        }

        /* Image cards in creatives — neon edge on hover */
        .cyber-shell img {
          transition: filter 180ms ease, box-shadow 180ms ease;
        }
        .cyber-shell img:hover {
          filter: brightness(1.05) saturate(1.1);
          box-shadow: 0 0 20px rgba(255, 43, 214, 0.4);
        }

        /* "Add to selection" / + / × tiny icon buttons */
        .cyber-shell button[aria-label="Add to selection"]:not(:disabled):hover,
        .cyber-shell button[aria-label="Remove from selection"]:not(:disabled):hover,
        .cyber-shell button[aria-label="Copy ID"]:not(:disabled):hover {
          border-color: var(--cyber-cyan) !important;
          color: var(--cyber-cyan) !important;
          box-shadow: 0 0 10px rgba(0, 255, 247, 0.4);
        }

        /* Decorate any "Tools >" divider lines etc. */
        .cyber-shell hr,
        .cyber-shell [style*="dashed"] {
          border-color: var(--border-subtle) !important;
        }

        /* Small accessibility nicety: reduce motion */
        /* ─────────────────────────────────────────────────────────────
           UNHINGED MODE — additional visual chaos.
           ───────────────────────────────────────────────────────────── */

        /* ─────────────────────────────────────────────────────────────
           STRATOS TAKEOVER — when Meta Assassin is mounted, the rest of
           the app gets dragged into the cyberpunk aesthetic. Reverts
           cleanly when the user navigates away.
           ───────────────────────────────────────────────────────────── */
        body.meta-assassin-fullscreen {
          --cyber-magenta-x: #ff2bd6;
          --cyber-cyan-x: #00fff7;
          --cyber-bg-x: #06050d;
        }
        body.meta-assassin-fullscreen .app-main {
          background:
            radial-gradient(ellipse at 20% 0%, rgba(255, 43, 214, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 100%, rgba(0, 255, 247, 0.10) 0%, transparent 50%),
            var(--cyber-bg-x) !important;
        }

        /* ── Sidebar takeover ───────────────────────────────────────── */
        body.meta-assassin-fullscreen .sidebar {
          background: linear-gradient(180deg, rgba(12, 10, 28, 0.92) 0%, rgba(20, 17, 42, 0.92) 100%) !important;
          border-right: 1px solid rgba(255, 43, 214, 0.4) !important;
          box-shadow:
            inset -1px 0 0 rgba(0, 255, 247, 0.18),
            12px 0 60px -20px rgba(255, 43, 214, 0.5) !important;
          position: relative;
          overflow: hidden;
        }
        body.meta-assassin-fullscreen .sidebar::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 43, 214, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 247, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          mask-image: radial-gradient(ellipse at 50% 30%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 100%);
        }
        body.meta-assassin-fullscreen .sidebar::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: linear-gradient(transparent 50%, rgba(0,0,0,0.25) 50%);
          background-size: 100% 2px;
          pointer-events: none;
          opacity: 0.4;
          animation: cyber-scanmove 6s linear infinite;
        }

        /* Sidebar logo area — replace with neon banner */
        body.meta-assassin-fullscreen .sidebar-logo {
          border-bottom: 1px solid rgba(255, 43, 214, 0.3) !important;
          position: relative;
          z-index: 1;
        }
        body.meta-assassin-fullscreen .sidebar-logo img {
          filter: hue-rotate(280deg) saturate(2) brightness(1.2) drop-shadow(0 0 8px rgba(255, 43, 214, 0.7));
        }

        /* Section headings inside sidebar */
        body.meta-assassin-fullscreen .sidebar-nav-label {
          color: var(--cyber-cyan-x) !important;
          font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace !important;
          letter-spacing: 0.18em !important;
          text-transform: uppercase !important;
          text-shadow: 0 0 8px rgba(0, 255, 247, 0.4);
          position: relative;
          z-index: 1;
        }
        body.meta-assassin-fullscreen .sidebar-nav-label::before {
          content: "// ";
          color: rgba(0, 255, 247, 0.5);
        }

        /* Nav items */
        body.meta-assassin-fullscreen .nav-item {
          color: rgba(205, 198, 230, 0.88) !important;
          font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace !important;
          font-size: 12px !important;
          letter-spacing: 0.04em !important;
          border: 1px solid transparent !important;
          border-radius: 0 !important;
          position: relative;
          z-index: 1;
          transition: all 160ms ease;
        }
        body.meta-assassin-fullscreen .nav-item:hover {
          background: rgba(0, 255, 247, 0.08) !important;
          color: #fff !important;
          border-color: rgba(0, 255, 247, 0.4) !important;
          box-shadow:
            inset 3px 0 0 var(--cyber-cyan-x),
            0 0 14px rgba(0, 255, 247, 0.3);
          transform: translateX(2px);
        }
        body.meta-assassin-fullscreen .nav-item.active {
          background: linear-gradient(90deg, rgba(255, 43, 214, 0.22), rgba(255, 43, 214, 0.05)) !important;
          color: #fff !important;
          border-color: rgba(255, 43, 214, 0.5) !important;
          box-shadow:
            inset 3px 0 0 var(--cyber-magenta-x),
            0 0 18px rgba(255, 43, 214, 0.35);
          text-shadow: 0 0 8px rgba(255, 43, 214, 0.6);
        }
        body.meta-assassin-fullscreen .nav-item.active .nav-item-icon {
          color: var(--cyber-magenta-x) !important;
          filter: drop-shadow(0 0 4px var(--cyber-magenta-x));
        }
        body.meta-assassin-fullscreen .nav-item:hover .nav-item-icon {
          color: var(--cyber-cyan-x) !important;
          filter: drop-shadow(0 0 4px var(--cyber-cyan-x));
        }

        /* Sidebar footer / user / theme toggle / logout */
        body.meta-assassin-fullscreen .sidebar-footer {
          border-top: 1px solid rgba(255, 43, 214, 0.3) !important;
          background: rgba(8, 6, 18, 0.5) !important;
          position: relative;
          z-index: 1;
        }
        body.meta-assassin-fullscreen .sidebar-user {
          background: rgba(0, 255, 247, 0.05) !important;
          border: 1px solid rgba(0, 255, 247, 0.2) !important;
        }
        body.meta-assassin-fullscreen .sidebar-avatar {
          background: linear-gradient(135deg, var(--cyber-magenta-x), var(--cyber-cyan-x)) !important;
          color: #06050d !important;
          font-weight: 700;
          box-shadow: 0 0 12px rgba(255, 43, 214, 0.5);
        }
        body.meta-assassin-fullscreen .sidebar-logout-btn:hover {
          color: #ff5577 !important;
          border-color: #ff5577 !important;
          box-shadow: inset 3px 0 0 #ff5577, 0 0 12px rgba(255, 85, 119, 0.3) !important;
        }

        /* DA Checker mini-tool inside sidebar */
        body.meta-assassin-fullscreen .sidebar input,
        body.meta-assassin-fullscreen .sidebar select {
          background: rgba(8, 6, 18, 0.7) !important;
          border-color: rgba(255, 43, 214, 0.25) !important;
          color: #f5efff !important;
          font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace !important;
        }
        body.meta-assassin-fullscreen .sidebar input:focus,
        body.meta-assassin-fullscreen .sidebar select:focus {
          border-color: var(--cyber-cyan-x) !important;
          box-shadow: 0 0 0 1px var(--cyber-cyan-x), 0 0 12px rgba(0, 255, 247, 0.3) !important;
        }
        body.meta-assassin-fullscreen .sidebar button {
          font-family: inherit;
        }

        /* Search/cmd palette button at top */
        body.meta-assassin-fullscreen .nav-item kbd {
          background: rgba(0, 255, 247, 0.1) !important;
          border-color: rgba(0, 255, 247, 0.3) !important;
          color: var(--cyber-cyan-x) !important;
          font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace !important;
        }

        /* Mobile takeover cleanups */
        body.meta-assassin-fullscreen .sidebar-mobile-trigger {
          background: var(--cyber-bg-x) !important;
          border: 1px solid var(--cyber-magenta-x) !important;
          color: var(--cyber-magenta-x) !important;
          box-shadow: 0 0 14px rgba(255, 43, 214, 0.4);
        }
        body.meta-assassin-fullscreen .sidebar-overlay {
          background: rgba(6, 5, 13, 0.8) !important;
          backdrop-filter: blur(4px);
        }

        /* Aggressive scanlines */
        .cyber-scanlines {
          opacity: 0.42 !important;
          background-image: linear-gradient(transparent 50%, rgba(0,0,0,0.32) 50%) !important;
          background-size: 100% 2px !important;
          animation: cyber-scanmove 6s linear infinite;
        }
        @keyframes cyber-scanmove {
          0% { background-position: 0 0; }
          100% { background-position: 0 24px; }
        }

        /* Film grain layer */
        .cyber-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>");
          opacity: 0.07;
          mix-blend-mode: overlay;
          animation: cyber-grain-shift 0.6s steps(4) infinite;
          pointer-events: none;
        }
        @keyframes cyber-grain-shift {
          0% { transform: translate(0,0); }
          25% { transform: translate(-2px,1px); }
          50% { transform: translate(1px,-2px); }
          75% { transform: translate(-1px,-1px); }
          100% { transform: translate(0,0); }
        }

        /* Whole-page periodic flicker */
        .cyber-shell::after {
          content: "";
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0);
          pointer-events: none;
          z-index: 9000;
          animation: cyber-flicker 11s ease-in-out infinite;
        }
        @keyframes cyber-flicker {
          0%, 96%, 100% { background: rgba(0,0,0,0); }
          96.3% { background: rgba(0,0,0,0.55); }
          96.6% { background: rgba(0,0,0,0); }
          97% { background: rgba(255, 43, 214, 0.07); }
          97.4% { background: rgba(0,0,0,0); }
        }

        /* Cyber Cartel highlight */
        .cyber-cartel {
          color: var(--cyber-magenta);
          text-shadow:
            0 0 6px rgba(255, 43, 214, 0.7),
            0 0 12px rgba(255, 43, 214, 0.35);
          font-weight: 700;
          letter-spacing: 0.04em;
          animation: cyber-cartel-pulse 2.6s ease-in-out infinite;
        }
        @keyframes cyber-cartel-pulse {
          0%, 100% { text-shadow: 0 0 6px rgba(255, 43, 214, 0.7), 0 0 12px rgba(255, 43, 214, 0.35); }
          50% { text-shadow: 0 0 10px rgba(255, 43, 214, 0.95), 0 0 22px rgba(0, 255, 247, 0.5); }
        }

        /* Corner brackets on every card */
        .cyber-shell section > .cyber-corner {
          position: absolute;
          width: 14px; height: 14px;
          pointer-events: none;
          z-index: 2;
        }
        .cyber-shell section {
          position: relative;
        }
        .cyber-shell section:hover {
          box-shadow:
            0 0 0 1px rgba(255, 43, 214, 0.18),
            0 24px 80px -32px rgba(0, 255, 247, 0.45),
            0 0 32px rgba(255, 43, 214, 0.18);
        }

        /* Checkbox */
        .cyber-checkbox {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          margin-top: 2px;
          background: rgba(8, 6, 18, 0.8);
          border: 1px solid var(--cyber-cyan);
          color: #06050d;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 140ms ease;
          padding: 0;
        }
        .cyber-checkbox[data-checked="true"] {
          background: var(--cyber-cyan);
          color: #06050d;
          box-shadow: 0 0 10px rgba(0, 255, 247, 0.55);
        }
        .cyber-checkbox[data-checked="false"]:hover {
          box-shadow: 0 0 10px rgba(0, 255, 247, 0.4);
        }

        /* Variant fields */
        .cyber-variant {
          position: relative;
        }
        .cyber-variant-index {
          font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--cyber-cyan);
          background: rgba(0, 255, 247, 0.08);
          border: 1px solid rgba(0, 255, 247, 0.3);
          padding: 0 6px;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          min-width: 24px;
          justify-content: center;
        }
        .cyber-variant:hover .cyber-variant-index {
          background: rgba(0, 255, 247, 0.18);
          color: #fff;
          box-shadow: 0 0 10px rgba(0, 255, 247, 0.5);
        }
        .cyber-variant-input {
          background: rgba(8, 6, 18, 0.78) !important;
          border: 1px solid rgba(255, 43, 214, 0.22) !important;
          color: var(--text) !important;
          font-family: ui-monospace, SF Mono, Menlo, Consolas, monospace !important;
          letter-spacing: 0;
          transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease, transform 80ms ease;
        }
        .cyber-variant-input:focus {
          outline: none !important;
          border-color: var(--cyber-magenta) !important;
          background: rgba(8, 6, 18, 0.92) !important;
          box-shadow: 0 0 0 1px var(--cyber-magenta), 0 0 18px rgba(255, 43, 214, 0.35) !important;
        }
        .cyber-variant-copy {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          background: rgba(255, 43, 214, 0.08);
          border: 1px solid rgba(255, 43, 214, 0.3);
          color: var(--cyber-magenta);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 140ms ease;
        }
        .cyber-variant-copy:hover {
          background: var(--cyber-magenta);
          color: #fff;
          box-shadow: 0 0 14px rgba(255, 43, 214, 0.7);
        }

        /* Heading text glitch on hover (cards / pillars) */
        .cyber-shell h2:hover,
        .cyber-shell h3:hover {
          animation: cyber-text-glitch 0.4s steps(1) 1;
          color: var(--cyber-cyan);
          text-shadow:
            -2px 0 var(--cyber-magenta),
            2px 0 var(--cyber-cyan);
        }
        @keyframes cyber-text-glitch {
          0%, 100% { transform: translate(0,0); }
          20% { transform: translate(-2px, 1px); }
          40% { transform: translate(2px, -1px); }
          60% { transform: translate(-1px, -2px); }
          80% { transform: translate(1px, 2px); }
        }

        /* Tagline emphasis */
        .cyber-tagline {
          padding: 6px 0;
          border-bottom: 1px dashed rgba(0, 255, 247, 0.18);
        }

        /* Cursor blink wherever we want a terminal feel */
        .cyber-cursor::after {
          content: "▌";
          color: var(--cyber-cyan);
          margin-left: 2px;
          animation: cyber-blink 1.1s steps(2) infinite;
        }

        /* Title — louder */
        .cyber-title {
          font-size: 44px !important;
          font-weight: 900 !important;
          letter-spacing: 0.06em !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .cyber-orb, .cyber-target-icon, .cyber-target-pulse,
          .cyber-title, .cyber-title::before, .cyber-title::after,
          .cyber-shell button[style*="var(--accent)"]::after,
          .cyber-dot, .cyber-bg::before, .cyber-shell::after,
          .cyber-cartel, .cyber-scanlines {
            animation: none !important;
          }
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
  onGenerateImage: (key: string, prompt: string, aspect: "square" | "portrait" | "landscape") => void;
  onRefineImage: (key: string, aspect: "square" | "portrait" | "landscape") => void;
  onGenerateAllImages: () => void;
  hasSelection: boolean;
  autoGenerating: { done: number; total: number } | null;
  estimates: Record<string, { ok: true; estimate: { estimatedDauLower: number; estimatedDauUpper: number; estimatedMauLower: number; estimatedMauUpper: number } } | { ok: false; error: string }>;
  estimatesLoading: boolean;
  onFetchEstimates: () => void;
  hasAccount: boolean;
}

function CampaignPlanSection(props: CampaignPlanSectionProps) {
  const {
    dailyBudget, currency,
    planLoading, plan, onBuildPlan,
    refineFeedback, setRefineFeedback, refineLoading, onRefinePlan,
    images, imageKey, imagePromptOverrides, setImagePromptOverrides,
    refinePrompts, setRefinePrompts, onGenerateImage, onRefineImage, onGenerateAllImages, hasSelection,
    autoGenerating, estimates, estimatesLoading, onFetchEstimates, hasAccount,
  } = props;

  const budgetReady = parseFloat(dailyBudget) > 0;

  return (
    <section style={{ ...cardStyle, marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Layers style={{ width: 18, height: 18, color: "var(--accent)" }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Campaign Plan</h2>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-3)" }}>
        Claude designs the full campaign structure — campaigns, ad sets, budget split, placements, Advantage+, attribution, bid strategy, and creative concepts (with AI-generated imagery) — explaining every decision.
        {hasSelection ? " Using your selected audiences." : " Using all AI-suggested pillars (add to selection to focus on specific ones)."}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--r)", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          {budgetReady ? (
            <>Daily budget: <strong style={{ color: "var(--text)" }}>{currency} {parseFloat(dailyBudget).toFixed(2)}</strong></>
          ) : (
            <span style={{ color: "var(--warning-text)" }}>Set a daily budget in the brief panel above to enable plan generation.</span>
          )}
        </span>
        <button type="button" onClick={onBuildPlan} disabled={planLoading || !budgetReady} style={primaryBtnStyle}>
          {planLoading ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Wand2 style={{ width: 14, height: 14 }} />}
          {planLoading ? "Building plan…" : plan ? "Rebuild plan" : "Build campaign plan"}
        </button>
      </div>

      {plan && (
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Summary */}
          <div style={{ padding: 14, background: "var(--accent-bg)", borderRadius: "var(--r)", borderLeft: "3px solid var(--accent)" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{plan.summary}</p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-2)" }}>
              <strong>Why this structure:</strong> {plan.structureRationale}
            </p>
          </div>

          {/* Campaigns */}
          {plan.campaigns.map((campaign, ci) => (
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
            />
          ))}

          {/* Creative testing framework */}
          {plan.creativeTestingFramework && (
            <div style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Creative testing framework</h3>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{plan.creativeTestingFramework}</p>
            </div>
          )}

          {/* Week-by-week */}
          {plan.weekByWeek && plan.weekByWeek.length > 0 && (
            <div style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Week-by-week playbook</h3>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                {plan.weekByWeek.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
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
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, fontSize: 12, color: "var(--text-2)" }}>
              <div>
                <strong style={{ color: "var(--text)" }}>Primary KPI:</strong> {plan.measurement.primaryKpi}
              </div>
              <div>
                <strong style={{ color: "var(--text)" }}>Secondary KPIs:</strong> {plan.measurement.secondaryKpis.join(", ")}
              </div>
              <div>
                <strong style={{ color: "var(--text)" }}>Learning phase:</strong> {plan.measurement.minLearningPhaseEvents}
              </div>
              <div>
                <strong style={{ color: "var(--text)" }}>Hands-off rule:</strong> {plan.measurement.ctaToHoldOff}
              </div>
            </div>
          </div>

          {/* Risks + Scale-up */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--warning-text)" }}>Risks to watch</h3>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--text-2)" }}>
                {plan.risks.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
            <div style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r)" }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--success-text)" }}>Scale-up plan</h3>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-2)" }}>{plan.scaleUp}</p>
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
              <button type="button" onClick={onFetchEstimates} disabled={!hasAccount || estimatesLoading} style={primaryBtnStyle}>
                {estimatesLoading ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <RefreshCw style={{ width: 14, height: 14 }} />}
                {estimatesLoading ? "Estimating…" : "Fetch reach estimates"}
              </button>
            </div>
          </div>

          {/* Generate all images */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Imagery</h3>
            <p style={{ margin: "4px 0 8px", fontSize: 11, color: "var(--text-3)" }}>
              Images are NOT generated automatically. Click below to generate every frame on the plan, or use the per-frame buttons on individual creatives. OpenAI gpt-image-1, medium quality, 3 in parallel.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
              {autoGenerating && autoGenerating.total > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 style={{ width: 13, height: 13, color: "var(--accent)" }} className="spin" />
                  <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "ui-monospace, SF Mono, Menlo, monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    {autoGenerating.done}/{autoGenerating.total}
                  </span>
                  <div style={{ width: 120, height: 3, background: "rgba(0,0,0,0.2)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(autoGenerating.done / autoGenerating.total) * 100}%`, background: "linear-gradient(90deg, var(--cyber-magenta, var(--accent)), var(--cyber-cyan, var(--accent)))", transition: "width 300ms ease" }} />
                  </div>
                </div>
              )}
              <button type="button" onClick={onGenerateAllImages} disabled={!!autoGenerating} style={primaryBtnStyle}>
                {autoGenerating ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <ImagePlus style={{ width: 14, height: 14 }} />}
                {autoGenerating ? "Generating…" : "Generate all images"}
              </button>
            </div>
          </div>

          {/* Refinement */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Refine the plan</h3>
            <p style={{ margin: "4px 0 8px", fontSize: 11, color: "var(--text-3)" }}>
              Tell Claude what you want to change. Be specific — e.g. &ldquo;Move 30% of budget from prospecting to retargeting&rdquo;, or &ldquo;Drop Advantage+ Audience and use a tight interest stack instead&rdquo;.
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
              <button type="button" onClick={onRefinePlan} disabled={refineLoading || !refineFeedback.trim()} style={primaryBtnStyle}>
                {refineLoading ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <RefreshCw style={{ width: 14, height: 14 }} />}
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
  onGenerateImage: (key: string, prompt: string, aspect: "square" | "portrait" | "landscape") => void;
  onRefineImage: (key: string, aspect: "square" | "portrait" | "landscape") => void;
  estimates: Record<string, { ok: true; estimate: { estimatedDauLower: number; estimatedDauUpper: number; estimatedMauLower: number; estimatedMauUpper: number } } | { ok: false; error: string }>;
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden", background: "var(--surface)" }}>
      <div style={{ padding: "12px 14px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{campaign.name}</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag>{campaign.objective}</Tag>
            <Tag>{campaign.budgetMode}</Tag>
            <Tag>{currency} {campaign.dailyBudget.toFixed(0)}/day</Tag>
            {campaign.bidStrategy && <Tag>{formatBidStrategy(campaign.bidStrategy)}</Tag>}
            {campaign.advantagePlus.enabled && <Tag tone="accent">Advantage+</Tag>}
          </div>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
          <strong>Why:</strong> {campaign.why}
        </p>
        {campaign.advantagePlus.enabled && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--accent)", lineHeight: 1.5 }}>
            <strong>Advantage+ ({campaign.advantagePlus.type}):</strong> {campaign.advantagePlus.why}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8, fontSize: 11, color: "var(--text-3)" }}>
          <span><strong style={{ color: "var(--text-2)" }}>Attribution:</strong> {campaign.attribution}</span>
          {campaign.bidStrategyValue && <span><strong style={{ color: "var(--text-2)" }}>Bid:</strong> {campaign.bidStrategyValue}</span>}
        </div>
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 18 }}>
        {(() => {
          // Group ad sets by their `group` field so the UI clusters
          // by region/audience-group. Ad sets without a group share an
          // implicit "" bucket and render flat.
          const groups = new Map<string, { adSet: AdSetPlan; index: number }[]>();
          campaign.adSets.forEach((adSet, ai) => {
            const key = (adSet.group ?? "").trim();
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push({ adSet, index: ai });
          });

          return Array.from(groups.entries()).map(([groupName, members]) => (
            <div key={groupName || `__nogroup`} style={groupName ? {
              border: "1px solid rgba(0, 255, 247, 0.18)",
              borderRadius: 8,
              padding: "10px 12px 12px",
              background: "rgba(0, 255, 247, 0.03)",
            } : undefined}>
              {groupName && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span className="cyber-region-marker" />
                  <h4 style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--cyber-cyan, var(--accent))",
                    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
                  }}>
                    [ {groupName} ]
                  </h4>
                  <span style={{
                    fontSize: 10,
                    color: "var(--text-3)",
                    fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
                    letterSpacing: "0.05em",
                  }}>
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
  onGenerateImage: (key: string, prompt: string, aspect: "square" | "portrait" | "landscape") => void;
  onRefineImage: (key: string, aspect: "square" | "portrait" | "landscape") => void;
  estimate?: { ok: true; estimate: { estimatedDauLower: number; estimatedDauUpper: number; estimatedMauLower: number; estimatedMauUpper: number } } | { ok: false; error: string };
}) {
  const hasGeo = (adSet.geoTargeting?.length ?? 0) > 0;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, background: "var(--bg)" }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace", letterSpacing: "0.02em" }}>
            {adSet.cohort && (
              <span style={{ color: "var(--cyber-magenta, var(--accent))", marginRight: 8 }}>
                [{adSet.cohort}]
              </span>
            )}
            {adSet.name}
          </h4>
          {adSet.audienceSummary && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-2)" }}>{adSet.audienceSummary}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag>{currency} {adSet.dailyBudget.toFixed(0)}/day</Tag>
          <Tag>Age {adSet.ageRange.min}–{adSet.ageRange.max}</Tag>
          <Tag>{adSet.genders === "all" ? "All genders" : adSet.genders}</Tag>
          {adSet.advantageAudience && <Tag tone="accent">Advantage+ Audience</Tag>}
        </div>
      </div>

      {/* Reach estimate */}
      {estimate && (
        <div style={{
          marginTop: 10,
          padding: "8px 12px",
          background: estimate.ok ? "rgba(132, 255, 79, 0.06)" : "rgba(255, 85, 119, 0.06)",
          border: "1px solid " + (estimate.ok ? "rgba(132, 255, 79, 0.3)" : "rgba(255, 85, 119, 0.3)"),
          borderRadius: 6,
          fontSize: 11,
          fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
          letterSpacing: "0.02em",
          color: "var(--text-2)",
        }}>
          {estimate.ok ? (
            <span>
              <strong style={{ color: "var(--cyber-lime, var(--success-text))", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                &gt; Live reach
              </strong>
              {" "}
              <strong style={{ color: "var(--text)" }}>
                {formatRange(estimate.estimate.estimatedMauLower, estimate.estimate.estimatedMauUpper)}
              </strong>
              {" monthly active · "}
              <strong style={{ color: "var(--text)" }}>
                {formatRange(estimate.estimate.estimatedDauLower, estimate.estimate.estimatedDauUpper)}
              </strong>
              {" daily active"}
            </span>
          ) : (
            <span>
              <strong style={{ color: "var(--cyber-magenta, var(--danger-text))", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                &gt; Reach estimate failed
              </strong>{" "}
              <span style={{ color: "var(--text-3)" }}>{estimate.error}</span>
            </span>
          )}
        </div>
      )}

      {/* Geo block — prominent */}
      {hasGeo && (
        <div style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "rgba(0, 255, 247, 0.05)",
          border: "1px solid rgba(0, 255, 247, 0.2)",
          borderRadius: 6,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--cyber-cyan, var(--accent))",
            fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
            marginBottom: 5,
          }}>
            &gt; Geo-targeting <span style={{ opacity: 0.5 }}>[{adSet.geoTargeting!.length}]</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text)", fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace", letterSpacing: "0.02em", lineHeight: 1.5 }}>
            {adSet.geoTargeting!.join(", ")}
          </p>
          {adSet.geoTargetingNotes && (
            <p style={{ margin: "5px 0 0", fontSize: 11, color: "var(--text-2)", fontStyle: "italic" }}>
              {adSet.geoTargetingNotes}
            </p>
          )}
          {adSet.expatTargeting && (
            <p style={{
              margin: "6px 0 0",
              fontSize: 11,
              color: "var(--cyber-magenta, var(--accent))",
              padding: "4px 8px",
              background: "rgba(255, 43, 214, 0.08)",
              border: "1px solid rgba(255, 43, 214, 0.25)",
              borderRadius: 4,
              display: "inline-block",
            }}>
              <strong>Expat / Lived-in: </strong>{adSet.expatTargeting}
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
              {adSet.lookalikeStrategy && <span style={{ color: "var(--text-3)" }}> — {adSet.lookalikeStrategy}</span>}
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
        <div style={{
          marginTop: 10,
          padding: "8px 12px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-3)",
            fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
            marginBottom: 4,
          }}>
            &gt; Detailed targeting
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
            {adSet.detailedTargeting}
          </p>
        </div>
      )}

      {/* Compact specs row */}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "6px 16px", fontSize: 11, color: "var(--text-3)" }}>
        <span><strong style={{ color: "var(--text-2)" }}>Pillar:</strong> {adSet.pillarName}</span>
        <span><strong style={{ color: "var(--text-2)" }}>Optimisation:</strong> {adSet.optimizationGoal}</span>
        {adSet.conversionEvent && (
          <span><strong style={{ color: "var(--text-2)" }}>Event:</strong> {adSet.conversionEvent}</span>
        )}
        <span><strong style={{ color: "var(--text-2)" }}>Placements:</strong> {adSet.placements === "advantage_plus" ? "Advantage+" : "Manual"}</span>
        {adSet.frequencyCap && (
          <span><strong style={{ color: "var(--text-2)" }}>Frequency:</strong> {adSet.frequencyCap}</span>
        )}
        {adSet.placements === "manual" && adSet.manualPlacements?.length ? (
          <span style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--text-2)" }}>Manual placements:</strong> {adSet.manualPlacements.join(", ")}
          </span>
        ) : null}
        {adSet.exclusions && adSet.exclusions.length > 0 && (
          <span style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--text-2)" }}>Exclusions:</strong> {adSet.exclusions.join(" · ")}
          </span>
        )}
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, paddingLeft: 10, borderLeft: "2px solid var(--cyber-magenta, var(--accent))" }}>
        <strong style={{ color: "var(--text)" }}>Why:</strong> {adSet.why}
      </p>

      {adSet.targetingOptionIds.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 10, color: "var(--text-3)", cursor: "pointer", fontFamily: "ui-monospace, SF Mono, Menlo, monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {adSet.targetingOptionIds.length} targeting IDs
          </summary>
          <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "var(--text-2)", fontFamily: "monospace", wordBreak: "break-all" }}>
            {adSet.targetingOptionIds.join(", ")}
          </p>
        </details>
      )}

      {/* Creatives */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {adSet.creatives.map((creative, cri) => {
          const aspect: "square" | "portrait" | "landscape" =
            creative.format === "video" ? "portrait" : "square";
          const prompts = creative.imagePrompts?.length
            ? creative.imagePrompts
            : (creative.imagePrompt ? [creative.imagePrompt] : []);

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
              setRefinePrompt: (v: string) =>
                setRefinePrompts((prev) => ({ ...prev, [key]: v })),
              onGenerate: () => onGenerateImage(key, basePrompt, aspect),
              onRefine: () => onRefineImage(key, aspect),
            };
          });

          return (
            <CreativeCard
              key={cri}
              creative={creative}
              aspect={aspect}
              frames={frames}
            />
          );
        })}
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
}: {
  creative: CreativeConcept;
  aspect: "square" | "portrait" | "landscape";
  frames: CreativeFrame[];
}) {
  // Normalise legacy single-variant fields into the multi-variant arrays.
  const hooks = creative.hooks?.length ? creative.hooks : (creative.hook ? [creative.hook] : []);
  const headlines = creative.headlines?.length ? creative.headlines : (creative.headline ? [creative.headline] : []);
  const primaryTexts = creative.primaryTexts?.length ? creative.primaryTexts : (creative.primaryText ? [creative.primaryText] : []);

  const isMulti = frames.length > 1;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)" }}>
          {creative.format.replace("_", " ")}
          {isMulti ? ` · ${frames.length} frames` : ""}
          {" · "}{creative.cta}
        </span>
        {creative.copyAngle && (
          <Tag tone="accent">{creative.copyAngle}</Tag>
        )}
      </div>

      {/* Copy variants — each one its own copyable field */}
      <div>
        {hooks.length > 0 && <CopyVariantList label="Hooks" items={hooks} multiline />}
        {headlines.length > 0 && <CopyVariantList label="Headlines" items={headlines} />}
        {primaryTexts.length > 0 && <CopyVariantList label="Primary text" items={primaryTexts} multiline />}
        {creative.longFormVariants && creative.longFormVariants.length > 0 && (
          <LongFormVariantList items={creative.longFormVariants} />
        )}
        <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.5 }}>
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
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
              {frame.image.loading ? <Loader2 style={{ width: 11, height: 11 }} className="spin" /> : <RefreshCw style={{ width: 11, height: 11 }} />}
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
        <summary style={{ fontSize: 10, color: "var(--text-3)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
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

function CopyVariantList({ label, items, multiline }: { label: string; items: string[]; small?: boolean; muted?: boolean; multiline?: boolean }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "var(--cyber-cyan, var(--text-3))",
          fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
        }}
      >
        &gt; {label} &nbsp;<span style={{ opacity: 0.5 }}>[{items.length}]</span>
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
          letterSpacing: "0.18em",
          color: "var(--cyber-magenta, var(--accent))",
          fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
        }}
      >
        &gt; Long-form copy <span style={{ opacity: 0.5 }}>[{items.length}]</span>
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
    <div className="cyber-variant" style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
      <span className="cyber-variant-index" style={{ alignItems: "flex-start", paddingTop: 6, minWidth: 30 }}>{String(index + 1).padStart(2, "0")}</span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            background: "rgba(255, 43, 214, 0.12)",
            border: "1px solid rgba(255, 43, 214, 0.4)",
            color: "var(--cyber-magenta, var(--accent))",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace",
          }}>
            {variant.tone || "Tone"}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "ui-monospace, SF Mono, Menlo, monospace", letterSpacing: "0.05em" }}>
            {wordCount} word{wordCount === 1 ? "" : "s"}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(10, Math.max(4, Math.ceil(text.length / 70)))}
          spellCheck={false}
          className="cyber-variant-input"
          style={{
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
        className="cyber-variant-copy"
        title="Copy to clipboard"
        aria-label="Copy long-form variant"
        style={{ alignItems: "flex-start", paddingTop: 8 }}
      >
        {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
      </button>
    </div>
  );
}

function CopyVariantField({ index, value, multiline }: { index: number; value: string; multiline?: boolean }) {
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
    <div className="cyber-variant" style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
      <span className="cyber-variant-index">{String(index + 1).padStart(2, "0")}</span>
      {multiline ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.max(2, Math.ceil(text.length / 90))}
          spellCheck={false}
          className="cyber-variant-input"
          style={{
            flex: 1,
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
          className="cyber-variant-input"
          style={{
            flex: 1,
            padding: "7px 10px",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        />
      )}
      <button
        type="button"
        onClick={copy}
        className="cyber-variant-copy"
        title="Copy to clipboard"
        aria-label="Copy variant"
      >
        {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
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
    case "lowest_cost": return "Lowest cost";
    case "cost_cap": return "Cost cap";
    case "bid_cap": return "Bid cap";
    case "lowest_cost_with_min_roas": return "Min ROAS";
    default: return s;
  }
}

function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="cyber-checkbox"
      data-checked={checked}
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
        <strong style={{ fontSize: 12, color: "var(--text)" }}>How Claude thought about this brief</strong>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-3)" }}>
          {result.totalCandidates.toLocaleString()} candidates · pass 1: {result.pass1ResultCount ?? 0} · pass 2: {result.pass2ResultCount ?? 0}
        </span>
        {open ? (
          <ChevronUp style={{ width: 13, height: 13, color: "var(--text-3)" }} />
        ) : (
          <ChevronDown style={{ width: 13, height: 13, color: "var(--text-3)" }} />
        )}
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {result.thesis && (
            <p style={{ margin: 0, fontSize: 13, color: "var(--text)", fontStyle: "italic", borderLeft: "2px solid var(--accent)", paddingLeft: 10 }}>
              {result.thesis}
            </p>
          )}

          {hasAnalysis && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {sections.map((s) => {
                const items = a[s.key] ?? [];
                if (!items.length) return null;
                return (
                  <div key={String(s.key)}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)" }}>
                      {s.label}
                    </p>
                    <ul style={{ margin: "5px 0 0", paddingLeft: 16, fontSize: 12, color: "var(--text-2)", lineHeight: 1.45 }}>
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
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--warning-text)" }}>
                Gaps the second pass targeted
              </p>
              <ul style={{ margin: "5px 0 0", paddingLeft: 16, fontSize: 12, color: "var(--text-2)", lineHeight: 1.45 }}>
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
        border: "1px solid " + (selected ? "rgba(0, 255, 247, 0.4)" : "var(--border)"),
        borderRadius: 8,
        background: selected ? "var(--accent-bg)" : "var(--surface-2)",
        opacity: selected ? 1 : 0.5,
        transition: "opacity 160ms ease, border-color 160ms ease",
      }}
    >
      <CheckBox checked={selected} onChange={onAdd} label={`Toggle ${item.name}`} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", textDecoration: selected ? "none" : "line-through" }}>{item.name}</span>
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
          {size && (
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>· {size}</span>
          )}
        </div>
        {path && (
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-3)" }}>{path}</p>
        )}
        {item.description && (
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--text-2)" }}>{item.description}</p>
        )}
        {why && (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--accent)", fontStyle: "italic" }}>
            {why}
          </p>
        )}
      </div>
      <button type="button" onClick={onCopy} title="Copy ID" style={iconBtnStyle} aria-label="Copy ID">
        {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
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
