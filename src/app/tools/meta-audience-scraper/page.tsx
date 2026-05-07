"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Sparkles,
  Search,
  Loader2,
  Plus,
  Check,
  Copy,
  Trash2,
  AlertTriangle,
  Download,
  X,
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
    media?: string[];
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

type SelectedItem = TargetingResult & { pillar?: string };

// ─── Campaign plan types ──────────────────────────────────────────────────

interface CreativeConcept {
  format: string;
  copyAngle?: string;
  hooks?: string[];
  headlines?: string[];
  primaryTexts?: string[];
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
  const [tab, setTab] = useState<"ai" | "manual">("ai");

  // AI suggest
  const [brief, setBrief] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [sector, setSector] = useState("");
  const [clientName, setClientName] = useState("");
  const [geography, setGeography] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AISuggestResponse | null>(null);
  const [collapsedPillars, setCollapsedPillars] = useState<Set<string>>(new Set());

  // Manual search
  const [searchMode, setSearchMode] = useState<"all" | "interests" | "suggest">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSeeds, setSearchSeeds] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<TargetingResult[]>([]);

  // Shared
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Campaign plan
  const [dailyBudget, setDailyBudget] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [objective, setObjective] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [plan, setPlan] = useState<FullPlan | null>(null);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [refineLoading, setRefineLoading] = useState(false);

  // Per-creative image state — keyed by `${campaignIdx}-${adSetIdx}-${creativeIdx}`
  const [images, setImages] = useState<Record<string, GeneratedImage>>({});
  const [imagePromptOverrides, setImagePromptOverrides] = useState<Record<string, string>>({});
  const [refinePrompts, setRefinePrompts] = useState<Record<string, string>>({});

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  function addSelection(item: TargetingResult, pillar?: string) {
    setSelected((prev) =>
      prev.some((p) => p.id === item.id) ? prev : [...prev, { ...item, pillar }]
    );
  }
  function removeSelection(id: string) {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  }
  function clearSelection() { setSelected([]); }

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

  // ── Manual search ─────────────────────────────────────────────────────
  const runSearch = useCallback(async () => {
    setError(null);
    setSearchResults([]);
    if (searchMode === "suggest") {
      const seeds = searchSeeds.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
      if (seeds.length === 0) {
        setError("Add at least one seed interest name.");
        return;
      }
      setSearchLoading(true);
      try {
        const res = await fetch("/api/tools/meta-audience-scraper/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "suggest", seedNames: seeds, limit: 50 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        setSearchResults(data.results as TargetingResult[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setSearchLoading(false);
      }
      return;
    }
    if (!searchQuery.trim()) {
      setError("Enter a search term.");
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch("/api/tools/meta-audience-scraper/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: searchMode, query: searchQuery.trim(), limit: 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setSearchResults(data.results as TargetingResult[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearchLoading(false);
    }
  }, [searchMode, searchQuery, searchSeeds]);

  // ── Selection export ──────────────────────────────────────────────────
  function exportSelection() {
    const interests = selected.filter((s) => /interest/i.test(s.type)).map((s) => ({ id: s.id, name: s.name }));
    const behaviors = selected.filter((s) => /behavior|behaviour/i.test(s.type)).map((s) => ({ id: s.id, name: s.name }));
    const other = selected.filter((s) => !/interest|behavior|behaviour/i.test(s.type)).map((s) => ({ id: s.id, name: s.name, type: s.type }));

    const payload = {
      generatedAt: new Date().toISOString(),
      total: selected.length,
      targeting_spec: {
        ...(interests.length ? { interests } : {}),
        ...(behaviors.length ? { behaviors } : {}),
        ...(other.length ? { other } : {}),
      },
      items: selected,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meta-audience-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copySelectionIds() {
    const text = selected.map((s) => `${s.id}\t${s.name}\t${s.type}`).join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId("__all");
    setTimeout(() => setCopiedId(null), 1200);
  }

  // ── Build pillars to send to the campaign-plan endpoint ────────────────
  // If user selection is non-empty AND came from AI pillars we group selected
  // items by their pillar tag. Otherwise we fall back to the full pillars
  // returned by the AI suggest pass.
  function buildPillarsForPlan(): { name: string; rationale: string; options: { id: string; name: string; type: string }[] }[] {
    if (selected.length > 0) {
      const groups = new Map<string, { id: string; name: string; type: string }[]>();
      for (const s of selected) {
        const key = s.pillar ?? "Selected audiences";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ id: s.id, name: s.name, type: s.type });
      }
      const result: { name: string; rationale: string; options: { id: string; name: string; type: string }[] }[] = [];
      for (const [name, options] of groups) {
        const matchingPillar = aiResult?.pillars.find((p) => p.name === name);
        result.push({ name, rationale: matchingPillar?.rationale ?? "", options });
      }
      return result;
    }
    return (aiResult?.pillars ?? []).map((p) => ({
      name: p.name,
      rationale: p.rationale,
      options: p.options.map((o) => ({ id: o.id, name: o.name, type: o.type })),
    }));
  }

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
  }, [dailyBudget, currency, objective, brief, clientName, sector, geography, aiResult, selected]);

  const refinePlan = useCallback(async () => {
    if (!plan || !refineFeedback.trim()) return;
    setError(null);
    setRefineLoading(true);
    try {
      const res = await fetch("/api/tools/meta-audience-scraper/refine-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          feedback: refineFeedback.trim(),
          brief: brief.trim() || undefined,
          clientName: clientName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refinement failed");
      setPlan(data.plan as FullPlan);
      setRefineFeedback("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setRefineLoading(false);
    }
  }, [plan, refineFeedback, brief, clientName]);

  // ── Image generation per creative ─────────────────────────────────────
  function imageKey(c: number, a: number, cr: number, frame = 0): string {
    return `${c}-${a}-${cr}-${frame}`;
  }

  function aspectForFormat(format: string): "square" | "portrait" | "landscape" {
    if (format === "video") return "portrait";
    return "square";
  }

  function getImagePrompts(creative: CreativeConcept): string[] {
    if (creative.imagePrompts?.length) return creative.imagePrompts;
    if (creative.imagePrompt) return [creative.imagePrompt];
    return [];
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

  // Whenever a plan is set or replaced, auto-generate its images.
  useEffect(() => {
    if (!plan) return;
    void autoGenerateImagesForPlan(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

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
              <span className="cyber-tagline-prefix">&gt;</span> Audience reconnaissance · Campaign architecture · Creative payload · Powered by Meta Graph + Claude.
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 24, marginTop: 16 }}>
        <div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
            {(
              [
                { key: "ai", label: "AI Suggest", icon: Sparkles },
                { key: "manual", label: "Manual Search", icon: Search },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderBottom:
                      tab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                    color: tab === t.key ? "var(--text)" : "var(--text-3)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "ai" && (
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
                            <button
                              type="button"
                              onClick={() => togglePillar(pillar.name)}
                              style={{
                                display: "flex",
                                width: "100%",
                                alignItems: "flex-start",
                                gap: 10,
                                padding: "12px 14px",
                                background: "var(--surface-2)",
                                border: "none",
                                borderBottom: collapsed ? "none" : "1px solid var(--border)",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                                    {pillar.name}
                                  </h3>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      background: "var(--accent-bg)",
                                      color: "var(--accent)",
                                    }}
                                  >
                                    {pillar.options.length} option{pillar.options.length === 1 ? "" : "s"}
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
                            {!collapsed && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => pillar.options.forEach((o) => addSelection(o, pillar.name))}
                                    style={{ ...fileBtnStyle, fontSize: 11 }}
                                  >
                                    <Plus style={{ width: 11, height: 11 }} /> Add all
                                  </button>
                                </div>
                                {pillar.options.map((opt) => (
                                  <ResultCard
                                    key={opt.id}
                                    item={opt}
                                    why={opt.why}
                                    selected={selectedIds.has(opt.id)}
                                    copied={copiedId === opt.id}
                                    onAdd={() => addSelection(opt, pillar.name)}
                                    onRemove={() => removeSelection(opt.id)}
                                    onCopy={() => copyId(opt.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {tab === "ai" && aiResult && aiResult.pillars.length > 0 && (
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
              hasSelection={selected.length > 0}
              autoGenerating={autoGenerating}
            />
          )}

          {tab === "manual" && (
            <section style={cardStyle}>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {(
                  [
                    { key: "all", label: "All categories" },
                    { key: "interests", label: "Interests only" },
                    { key: "suggest", label: "Suggest similar" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => { setSearchMode(m.key); setSearchResults([]); }}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      borderRadius: 999,
                      border: "1px solid var(--border)",
                      background: searchMode === m.key ? "var(--accent)" : "var(--surface-2)",
                      color: searchMode === m.key ? "white" : "var(--text-2)",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {searchMode === "suggest" ? (
                <>
                  <label style={labelStyle}>Seed interest names</label>
                  <textarea
                    value={searchSeeds}
                    onChange={(e) => setSearchSeeds(e.target.value)}
                    placeholder={"Tennis\nGolf\nSailing"}
                    rows={3}
                    style={textareaStyle}
                    disabled={searchLoading}
                  />
                  <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                    Meta will return similar interests it considers related to these seeds.
                  </p>
                </>
              ) : (
                <>
                  <label style={labelStyle}>
                    Search {searchMode === "interests" ? "interests" : "all targeting categories"}
                  </label>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                    placeholder="e.g. running, Patek Philippe, frequent international travelers"
                    style={inputStyle}
                    disabled={searchLoading}
                  />
                </>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button type="button" onClick={runSearch} disabled={searchLoading} style={primaryBtnStyle}>
                  {searchLoading ? <Loader2 style={{ width: 14, height: 14 }} className="spin" /> : <Search style={{ width: 14, height: 14 }} />}
                  {searchLoading ? "Searching…" : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={{ fontSize: 11, color: "var(--text-3)" }}>
                    {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
                  </p>
                  {searchResults.map((r) => (
                    <ResultCard
                      key={r.id}
                      item={r}
                      selected={selectedIds.has(r.id)}
                      copied={copiedId === r.id}
                      onAdd={() => addSelection(r)}
                      onRemove={() => removeSelection(r.id)}
                      onCopy={() => copyId(r.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Selection panel ──────────────────────────────────────────── */}
        <aside
          style={{
            position: "sticky",
            top: 24,
            alignSelf: "flex-start",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            background: "var(--surface)",
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Selection</h2>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-3)" }}>
                {selected.length} item{selected.length === 1 ? "" : "s"}
              </p>
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                title="Clear all"
                style={iconBtnStyle}
                aria-label="Clear selection"
              >
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {selected.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                Click <strong>+</strong> on any option to add it here. Export when you&rsquo;re ready to plug into Ads Manager.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selected.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--surface-2)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--text-3)" }}>
                        {s.type}
                        {s.pillar ? ` · ${s.pillar}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelection(s.id)}
                      style={{
                        ...iconBtnStyle,
                        width: 24,
                        height: 24,
                      }}
                      aria-label="Remove"
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 6 }}>
              <button type="button" onClick={copySelectionIds} style={{ ...fileBtnStyle, flex: 1, justifyContent: "center" }}>
                {copiedId === "__all" ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                {copiedId === "__all" ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={exportSelection} style={{ ...primaryBtnStyle, flex: 1, justifyContent: "center" }}>
                <Download style={{ width: 12, height: 12 }} />
                Export JSON
              </button>
            </div>
          )}
        </aside>
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
        @media (prefers-reduced-motion: reduce) {
          .cyber-orb, .cyber-target-icon, .cyber-target-pulse,
          .cyber-title, .cyber-title::before, .cyber-title::after,
          .cyber-shell button[style*="var(--accent)"]::after,
          .cyber-dot {
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
  hasSelection: boolean;
  autoGenerating: { done: number; total: number } | null;
}

function CampaignPlanSection(props: CampaignPlanSectionProps) {
  const {
    dailyBudget, currency,
    planLoading, plan, onBuildPlan,
    refineFeedback, setRefineFeedback, refineLoading, onRefinePlan,
    images, imageKey, imagePromptOverrides, setImagePromptOverrides,
    refinePrompts, setRefinePrompts, onGenerateImage, onRefineImage, hasSelection,
    autoGenerating,
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
            {autoGenerating && autoGenerating.total > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <Loader2 style={{ width: 13, height: 13, color: "var(--accent)" }} className="spin" />
                <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "ui-monospace, SF Mono, Menlo, monospace", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Generating creative imagery · {autoGenerating.done}/{autoGenerating.total}
                </span>
                <div style={{ flex: 1, height: 3, background: "rgba(0,0,0,0.2)", borderRadius: 2, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(autoGenerating.done / autoGenerating.total) * 100}%`,
                      background: "linear-gradient(90deg, var(--cyber-magenta, var(--accent)), var(--cyber-cyan, var(--accent)))",
                      transition: "width 300ms ease",
                    }}
                  />
                </div>
              </div>
            )}
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

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {campaign.adSets.map((adSet, ai) => (
          <AdSetCard
            key={ai}
            adSet={adSet}
            campaignIndex={campaignIndex}
            adSetIndex={ai}
            currency={currency}
            images={images}
            imageKey={imageKey}
            imagePromptOverrides={imagePromptOverrides}
            setImagePromptOverrides={setImagePromptOverrides}
            refinePrompts={refinePrompts}
            setRefinePrompts={setRefinePrompts}
            onGenerateImage={onGenerateImage}
            onRefineImage={onRefineImage}
          />
        ))}
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
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{adSet.name}</h4>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-2)" }}>{adSet.audienceSummary}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag>{currency} {adSet.dailyBudget.toFixed(0)}/day</Tag>
          <Tag>{adSet.optimizationGoal}</Tag>
          <Tag>{adSet.placements === "advantage_plus" ? "Advantage+ Placements" : "Manual placements"}</Tag>
          {adSet.advantageAudience && <Tag tone="accent">Advantage+ Audience</Tag>}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px 16px", fontSize: 11, color: "var(--text-3)" }}>
        <span><strong style={{ color: "var(--text-2)" }}>Pillar:</strong> {adSet.pillarName}</span>
        <span><strong style={{ color: "var(--text-2)" }}>Age:</strong> {adSet.ageRange.min}–{adSet.ageRange.max}</span>
        <span><strong style={{ color: "var(--text-2)" }}>Gender:</strong> {adSet.genders === "all" ? "All" : adSet.genders}</span>
        {adSet.conversionEvent && (
          <span><strong style={{ color: "var(--text-2)" }}>Event:</strong> {adSet.conversionEvent}</span>
        )}
        {adSet.frequencyCap && (
          <span><strong style={{ color: "var(--text-2)" }}>Frequency:</strong> {adSet.frequencyCap}</span>
        )}
        {adSet.placements === "manual" && adSet.manualPlacements?.length ? (
          <span style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--text-2)" }}>Placements:</strong> {adSet.manualPlacements.join(", ")}
          </span>
        ) : null}
        {adSet.lookalikeStrategy && (
          <span style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--text-2)" }}>Lookalikes:</strong> {adSet.lookalikeStrategy}
          </span>
        )}
        {adSet.exclusions && adSet.exclusions.length > 0 && (
          <span style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--text-2)" }}>Exclusions:</strong> {adSet.exclusions.join(" · ")}
          </span>
        )}
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
        <strong>Why:</strong> {adSet.why}
      </p>

      {adSet.targetingOptionIds.length > 0 && (
        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 11, color: "var(--text-3)", cursor: "pointer" }}>
            {adSet.targetingOptionIds.length} targeting IDs
          </summary>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-2)", fontFamily: "monospace", wordBreak: "break-all" }}>
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

      {/* Copy variants — full width */}
      <div>
        {hooks.length > 0 && <CopyVariantList label="Hook variants" items={hooks} />}
        {headlines.length > 0 && <CopyVariantList label="Headline variants" items={headlines} small />}
        {primaryTexts.length > 0 && <CopyVariantList label="Primary text variants" items={primaryTexts} small muted />}
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-2)", fontStyle: "italic", lineHeight: 1.5 }}>
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

function CopyVariantList({ label, items, small, muted }: { label: string; items: string[]; small?: boolean; muted?: boolean }) {
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)" }}>
        {label}
      </p>
      <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: small ? 12 : 13, color: muted ? "var(--text-3)" : "var(--text)", lineHeight: 1.45 }}>
        {items.map((it, i) => (
          <li key={i} style={{ marginBottom: 2 }}>{it}</li>
        ))}
      </ul>
    </div>
  );
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
    { key: "media", label: "Cultural / media proxies" },
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
  onRemove,
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
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: selected ? "var(--accent-bg)" : "var(--surface-2)",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{item.name}</span>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <button
          type="button"
          onClick={selected ? onRemove : onAdd}
          title={selected ? "Remove" : "Add to selection"}
          style={{
            ...iconBtnStyle,
            background: selected ? "var(--accent)" : "var(--surface)",
            color: selected ? "white" : "var(--text-2)",
            borderColor: selected ? "var(--accent)" : "var(--border)",
          }}
          aria-label={selected ? "Remove from selection" : "Add to selection"}
        >
          {selected ? <Check style={{ width: 13, height: 13 }} /> : <Plus style={{ width: 13, height: 13 }} />}
        </button>
        <button type="button" onClick={onCopy} title="Copy ID" style={iconBtnStyle} aria-label="Copy ID">
          {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
        </button>
      </div>
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
