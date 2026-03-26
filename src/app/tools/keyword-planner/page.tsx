"use client";

import { useState, useCallback } from "react";
import {
  Search,
  Loader2,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Download,
  BarChart2,
  Target,
  DollarSign,
  Zap,
  Check,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyVolume {
  year: number;
  month: string;
  searches: number;
}

interface KeywordIdea {
  text: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: MonthlyVolume[];
}

const MONTH_ORDER: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};

const MONTH_ABBR: Record<string, string> = {
  JANUARY: "Jan", FEBRUARY: "Feb", MARCH: "Mar", APRIL: "Apr",
  MAY: "May", JUNE: "Jun", JULY: "Jul", AUGUST: "Aug",
  SEPTEMBER: "Sep", OCTOBER: "Oct", NOVEMBER: "Nov", DECEMBER: "Dec",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function microsToPounds(micros: number): string {
  if (!micros) return "—";
  return `£${(micros / 1_000_000).toFixed(2)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function competitionColor(level: string): string {
  switch (level) {
    case "LOW": return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "MEDIUM": return "text-amber-600 bg-amber-50 border-amber-200";
    case "HIGH": return "text-red-600 bg-red-50 border-red-200";
    default: return "text-slate-500 bg-slate-50 border-slate-200";
  }
}

function competitionLabel(level: string): string {
  switch (level) {
    case "LOW": return "Low";
    case "MEDIUM": return "Med";
    case "HIGH": return "High";
    default: return "—";
  }
}

/** Estimate monthly clicks/impressions/cost given keyword idea + max CPC */
function estimateForecast(idea: KeywordIdea, cpcMicros: number) {
  const ctrByCompetition: Record<string, number> = {
    LOW: 0.08,
    MEDIUM: 0.05,
    HIGH: 0.03,
    UNSPECIFIED: 0.04,
  };
  const ctr = ctrByCompetition[idea.competition] ?? 0.04;
  const impressions = Math.round(idea.avgMonthlySearches * 0.7); // ~70% impression share possible
  const clicks = Math.round(impressions * ctr);
  const effectiveCpcMicros = cpcMicros || idea.highTopOfPageBidMicros || 1_000_000;
  const costMicros = clicks * effectiveCpcMicros;
  return { clicks, impressions, costPounds: costMicros / 1_000_000 };
}

/** Build a 12-month sparkline from monthly volumes sorted by date */
function buildSparklineData(volumes: MonthlyVolume[]) {
  return [...volumes]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (MONTH_ORDER[a.month] ?? 0) - (MONTH_ORDER[b.month] ?? 0);
    })
    .slice(-12)
    .map((v) => ({ label: `${MONTH_ABBR[v.month] ?? v.month} ${v.year}`, searches: v.searches }));
}

/** Export results as CSV download */
function exportToCsv(ideas: KeywordIdea[], cpcMicros: number) {
  const headers = [
    "Keyword",
    "Avg Monthly Searches",
    "Competition",
    "Competition Index",
    "Low Top-of-Page Bid (£)",
    "High Top-of-Page Bid (£)",
    "Est. Monthly Impressions",
    "Est. Monthly Clicks",
    "Est. Monthly Cost (£)",
  ];
  const rows = ideas.map((idea) => {
    const { impressions, clicks, costPounds } = estimateForecast(idea, cpcMicros);
    return [
      `"${idea.text}"`,
      idea.avgMonthlySearches,
      idea.competition,
      idea.competitionIndex,
      (idea.lowTopOfPageBidMicros / 1_000_000).toFixed(2),
      (idea.highTopOfPageBidMicros / 1_000_000).toFixed(2),
      impressions,
      clicks,
      costPounds.toFixed(2),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "keyword-planner-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Location options ─────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function KeywordPlannerPage() {
  // Step state: 1 = input, 2 = review keywords, 3 = results
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 form
  const [website, setWebsite] = useState("");
  const [brief, setBrief] = useState("");
  const [location, setLocation] = useState("2826");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [rationale, setRationale] = useState("");

  // Step 2 keyword list
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newKw, setNewKw] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState("");

  // Step 3 results
  const [ideas, setIdeas] = useState<KeywordIdea[]>([]);
  const [maxCpc, setMaxCpc] = useState("");
  const [sortField, setSortField] = useState<keyof KeywordIdea>("avgMonthlySearches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Step 1: Suggest keywords via AI ────────────────────────────────────────

  async function handleSuggest() {
    if (!website.trim() || !brief.trim()) return;
    setSuggesting(true);
    setSuggestError("");
    try {
      const res = await fetch("/api/tools/keyword-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest",
          website: website.trim(),
          brief: brief.trim(),
          location,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const kws: string[] = data.keywords ?? [];
      setKeywords(kws);
      setSelected(new Set(kws.map((_, i) => i)));
      setRationale(data.rationale ?? "");
      setStep(2);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSuggesting(false);
    }
  }

  // ── Step 2: Run Google Ads research ────────────────────────────────────────

  async function handleResearch() {
    const activeKeywords = keywords.filter((_, i) => selected.has(i));
    if (!activeKeywords.length) return;
    setResearching(true);
    setResearchError("");
    try {
      const res = await fetch("/api/tools/keyword-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "research",
          keywords: activeKeywords,
          website: website.trim(),
          location,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setIdeas(data.ideas ?? []);
      setStep(3);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setResearching(false);
    }
  }

  // ── Keyword list helpers ───────────────────────────────────────────────────

  const toggleAll = useCallback(() => {
    if (selected.size === keywords.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(keywords.map((_, i) => i)));
    }
  }, [selected, keywords]);

  function addKeyword() {
    const kw = newKw.trim();
    if (!kw) return;
    const idx = keywords.length;
    setKeywords((prev) => [...prev, kw]);
    setSelected((prev) => new Set([...prev, idx]));
    setNewKw("");
  }

  function removeKeyword(idx: number) {
    const newKws = keywords.filter((_, i) => i !== idx);
    const newSelected = new Set<number>();
    keywords.forEach((_, i) => {
      if (i !== idx && selected.has(i)) {
        const newIdx = i > idx ? i - 1 : i;
        newSelected.add(newIdx);
      }
    });
    setKeywords(newKws);
    setSelected(newSelected);
  }

  // ── Sort helpers ───────────────────────────────────────────────────────────

  function handleSort(field: string) {
    const f = field as keyof KeywordIdea;
    if (sortField === f) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(f);
      setSortDir("desc");
    }
  }

  const sortedIdeas = [...ideas].sort((a, b) => {
    const av = a[sortField] as number | string;
    const bv = b[sortField] as number | string;
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  // ── Derived stats ──────────────────────────────────────────────────────────

  const cpcMicros = maxCpc ? Math.round(parseFloat(maxCpc) * 1_000_000) : 0;

  const totalMonthlySearches = ideas.reduce((s, i) => s + i.avgMonthlySearches, 0);
  const avgCompetitionIndex = ideas.length
    ? Math.round(ideas.reduce((s, i) => s + i.competitionIndex, 0) / ideas.length)
    : 0;
  const avgCpc = ideas.length
    ? ideas.reduce((s, i) => s + (i.lowTopOfPageBidMicros + i.highTopOfPageBidMicros) / 2, 0) /
      ideas.length /
      1_000_000
    : 0;
  const totalEstClicks = ideas.reduce(
    (s, i) => s + estimateForecast(i, cpcMicros).clicks,
    0
  );
  const totalEstCost = ideas.reduce(
    (s, i) => s + estimateForecast(i, cpcMicros).costPounds,
    0
  );

  // Build aggregate monthly trend for the chart
  const trendMap: Record<string, number> = {};
  for (const idea of ideas) {
    for (const v of idea.monthlySearchVolumes) {
      const key = `${MONTH_ABBR[v.month] ?? v.month} ${v.year}`;
      trendMap[key] = (trendMap[key] ?? 0) + v.searches;
    }
  }
  const trendData = Object.entries(trendMap)
    .sort(([a], [b]) => {
      const [am, ay] = a.split(" ");
      const [bm, by] = b.split(" ");
      const aYear = parseInt(ay), bYear = parseInt(by);
      if (aYear !== bYear) return aYear - bYear;
      const aMonthNum = Object.values(MONTH_ABBR).indexOf(am) + 1;
      const bMonthNum = Object.values(MONTH_ABBR).indexOf(bm) + 1;
      return aMonthNum - bMonthNum;
    })
    .slice(-13)
    .map(([label, volume]) => ({ label, volume }));

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Keyword Planner</h1>
          <p className="text-sm text-slate-500">
            AI-powered keyword research using Google Ads data
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: "Brief" },
          { num: 2, label: "Keywords" },
          { num: 3, label: "Results" },
        ].map(({ num, label }, i, arr) => (
          <div key={num} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold border-2 transition-colors ${
                step === num
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : step > num
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                  : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {step > num ? <Check className="h-3.5 w-3.5" /> : num}
            </div>
            <span
              className={`text-sm font-medium ${
                step >= num ? "text-slate-700" : "text-slate-400"
              }`}
            >
              {label}
            </span>
            {i < arr.length - 1 && (
              <ChevronRight className="h-4 w-4 text-slate-300 ml-1" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Input ─────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="card max-w-2xl">
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Campaign Brief
              </h2>
              <p className="text-sm text-slate-500">
                Describe the lead and their business — our AI will generate targeted keyword ideas.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Client website
                </label>
                <input
                  type="url"
                  className="input w-full"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Target location
                </label>
                <select
                  className="input w-full"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  {LOCATIONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Campaign brief
                </label>
                <textarea
                  className="input w-full resize-none"
                  rows={5}
                  placeholder="Describe what the client does, their target audience, products/services, and any specific campaign goals or competitor context..."
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                />
              </div>
            </div>

            {suggestError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {suggestError}
              </div>
            )}

            <button
              className="btn btn-primary w-full justify-center gap-2"
              onClick={handleSuggest}
              disabled={!website.trim() || !brief.trim() || suggesting}
            >
              {suggesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating keyword ideas…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Generate Keywords with AI
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review keywords ───────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4 max-w-2xl">
          {rationale && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800">
              <p className="font-medium mb-1">AI Strategy Note</p>
              <p className="text-indigo-700">{rationale}</p>
            </div>
          )}

          <div className="card">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Review Keywords
                </h2>
                <p className="text-sm text-slate-500">
                  {selected.size} of {keywords.length} selected
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm text-xs"
                onClick={toggleAll}
              >
                {selected.size === keywords.length ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
              {keywords.map((kw, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        next.has(i) ? next.delete(i) : next.add(i);
                        return next;
                      });
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="flex-1 text-sm text-slate-700">{kw}</span>
                  <button
                    onClick={() => removeKeyword(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1 text-sm"
                  placeholder="Add keyword…"
                  value={newKw}
                  onChange={(e) => setNewKw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={addKeyword}
                  disabled={!newKw.trim()}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {researchError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {researchError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="btn btn-ghost gap-2"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              className="btn btn-primary flex-1 justify-center gap-2"
              onClick={handleResearch}
              disabled={researching || selected.size === 0}
            >
              {researching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching data…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Run Keyword Research ({selected.size} keywords)
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Results ───────────────────────────────────────────────────── */}
      {step === 3 && ideas.length > 0 && (
        <div className="space-y-6">
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button
              className="btn btn-ghost gap-2 text-sm"
              onClick={() => setStep(2)}
            >
              <ChevronLeft className="h-4 w-4" />
              Edit Keywords
            </button>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-600">Max CPC (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input w-28 text-sm"
                  placeholder="e.g. 1.50"
                  value={maxCpc}
                  onChange={(e) => setMaxCpc(e.target.value)}
                />
              </div>
              <button
                className="btn btn-ghost btn-sm gap-1.5 text-sm"
                onClick={() => exportToCsv(sortedIdeas, cpcMicros)}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={<BarChart2 className="h-4 w-4 text-indigo-500" />}
              label="Total Monthly Searches"
              value={fmtNum(totalMonthlySearches)}
              sub={`${ideas.length} keywords`}
            />
            <SummaryCard
              icon={<Target className="h-4 w-4 text-amber-500" />}
              label="Avg Competition Index"
              value={String(avgCompetitionIndex)}
              sub="0–100 scale"
            />
            <SummaryCard
              icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
              label="Avg CPC"
              value={`£${avgCpc.toFixed(2)}`}
              sub="avg of bid range"
            />
            <SummaryCard
              icon={<Zap className="h-4 w-4 text-sky-500" />}
              label="Est. Monthly Clicks"
              value={fmtNum(totalEstClicks)}
              sub={`~£${totalEstCost.toFixed(0)}/mo`}
            />
          </div>

          {/* Trend chart */}
          {trendData.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                Aggregate Search Volume Trend
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtNum}
                  />
                  <Tooltip
                    formatter={(v: unknown) => [fmtNum(Number(v ?? 0)), "Searches"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    name="Monthly Searches"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Keywords table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <SortTh
                      field="text"
                      label="Keyword"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                      className="pl-5 pr-4 text-left"
                    />
                    <SortTh
                      field="avgMonthlySearches"
                      label="Avg Monthly"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <SortTh
                      field="competition"
                      label="Competition"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <SortTh
                      field="competitionIndex"
                      label="Comp. Index"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <SortTh
                      field="lowTopOfPageBidMicros"
                      label="Low Bid"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <SortTh
                      field="highTopOfPageBidMicros"
                      label="High Bid"
                      current={sortField}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 text-right font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                      Est. Clicks/mo
                    </th>
                    <th className="px-4 py-3 pr-5 text-right font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                      Est. Cost/mo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedIdeas.map((idea, i) => {
                    const { clicks, costPounds } = estimateForecast(idea, cpcMicros);
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="pl-5 pr-4 py-3 text-slate-800 font-medium max-w-[260px]">
                          {idea.text}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700 font-tabular">
                          {fmtNum(idea.avgMonthlySearches)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${competitionColor(
                              idea.competition
                            )}`}
                          >
                            {competitionLabel(idea.competition)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 font-tabular">
                          {idea.competitionIndex || "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 font-tabular">
                          {microsToPounds(idea.lowTopOfPageBidMicros)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 font-tabular">
                          {microsToPounds(idea.highTopOfPageBidMicros)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-tabular">
                          {fmtNum(clicks)}
                        </td>
                        <td className="px-4 py-3 pr-5 text-right text-slate-700 font-tabular">
                          {cpcMicros ? `£${costPounds.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 3 && ideas.length === 0 && (
        <div className="card p-12 text-center">
          <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No keyword data returned for these terms.</p>
          <button className="btn btn-ghost btn-sm mt-4 gap-2" onClick={() => setStep(2)}>
            <ChevronLeft className="h-4 w-4" />
            Try different keywords
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function SortTh({
  field,
  label,
  current,
  dir,
  onSort,
  className = "px-4",
}: {
  field: string;
  label: string;
  current: string;
  dir: "asc" | "desc";
  onSort: (f: string) => void;
  className?: string;
}) {
  const active = current === field;
  return (
    <th
      className={`${className} py-3 text-center font-medium text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-700 transition-colors`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1 justify-center">
        {label}
        {active ? (
          <span className="text-indigo-500">{dir === "desc" ? "↓" : "↑"}</span>
        ) : (
          <span className="text-slate-300">↕</span>
        )}
      </span>
    </th>
  );
}
