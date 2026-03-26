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
  Globe,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────────────────────

function microsToPounds(micros: number): string {
  if (!micros) return "—";
  return `£${(micros / 1_000_000).toFixed(2)}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function competitionBadgeStyle(level: string): React.CSSProperties {
  switch (level) {
    case "LOW":    return { background: "#d1fae5", color: "#065f46" };
    case "MEDIUM": return { background: "#fef3c7", color: "#92400e" };
    case "HIGH":   return { background: "#fee2e2", color: "#991b1b" };
    default:       return { background: "var(--border-subtle)", color: "var(--text-3)" };
  }
}

function competitionLabel(level: string): string {
  switch (level) {
    case "LOW": return "Low";
    case "MEDIUM": return "Medium";
    case "HIGH": return "High";
    default: return "—";
  }
}

function estimateForecast(idea: KeywordIdea, cpcMicros: number) {
  const ctrByCompetition: Record<string, number> = {
    LOW: 0.08, MEDIUM: 0.05, HIGH: 0.03, UNSPECIFIED: 0.04,
  };
  const ctr = ctrByCompetition[idea.competition] ?? 0.04;
  const impressions = Math.round(idea.avgMonthlySearches * 0.7);
  const clicks = Math.round(impressions * ctr);
  const effectiveCpcMicros = cpcMicros || idea.highTopOfPageBidMicros || 1_000_000;
  return { clicks, impressions, costPounds: (clicks * effectiveCpcMicros) / 1_000_000 };
}

function exportToCsv(ideas: KeywordIdea[], cpcMicros: number) {
  const headers = [
    "Keyword", "Avg Monthly Searches", "Competition", "Competition Index",
    "Low Top-of-Page Bid (£)", "High Top-of-Page Bid (£)",
    "Est. Monthly Impressions", "Est. Monthly Clicks", "Est. Monthly Cost (£)",
  ];
  const rows = ideas.map((idea) => {
    const { impressions, clicks, costPounds } = estimateForecast(idea, cpcMicros);
    return [
      `"${idea.text}"`, idea.avgMonthlySearches, idea.competition, idea.competitionIndex,
      (idea.lowTopOfPageBidMicros / 1_000_000).toFixed(2),
      (idea.highTopOfPageBidMicros / 1_000_000).toFixed(2),
      impressions, clicks, costPounds.toFixed(2),
    ].join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "keyword-planner-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

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
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 14,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
};

export default function KeywordPlannerPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [website, setWebsite] = useState("");
  const [brief, setBrief] = useState("");
  const [location, setLocation] = useState("2826");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [rationale, setRationale] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newKw, setNewKw] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [ideas, setIdeas] = useState<KeywordIdea[]>([]);
  const [maxCpc, setMaxCpc] = useState("");
  const [sortField, setSortField] = useState<keyof KeywordIdea>("avgMonthlySearches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function handleSuggest() {
    if (!website.trim() || !brief.trim()) return;
    setSuggesting(true);
    setSuggestError("");
    try {
      const res = await fetch("/api/tools/keyword-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest", website: website.trim(), brief: brief.trim(), location }),
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

  async function handleResearch() {
    const activeKeywords = keywords.filter((_, i) => selected.has(i));
    if (!activeKeywords.length) return;
    setResearching(true);
    setResearchError("");
    try {
      const res = await fetch("/api/tools/keyword-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "research", keywords: activeKeywords, website: website.trim(), location }),
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

  const toggleAll = useCallback(() => {
    setSelected(selected.size === keywords.length ? new Set() : new Set(keywords.map((_, i) => i)));
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
    const newSel = new Set<number>();
    keywords.forEach((_, i) => {
      if (i !== idx && selected.has(i)) newSel.add(i > idx ? i - 1 : i);
    });
    setKeywords(newKws);
    setSelected(newSel);
  }

  function handleSort(field: string) {
    const f = field as keyof KeywordIdea;
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("desc"); }
  }

  const sortedIdeas = [...ideas].sort((a, b) => {
    const av = a[sortField] as number | string;
    const bv = b[sortField] as number | string;
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

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
      return (MONTH_ORDER[Object.keys(MONTH_ABBR).find(k => MONTH_ABBR[k] === am) ?? ""] ?? 0) -
             (MONTH_ORDER[Object.keys(MONTH_ABBR).find(k => MONTH_ABBR[k] === bm) ?? ""] ?? 0);
    })
    .slice(-13)
    .map(([label, volume]) => ({ label, volume }));

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Keyword Planner</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>AI-powered keyword research using live Google Ads data</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
        {([{ num: 1, label: "Brief" }, { num: 2, label: "Keywords" }, { num: 3, label: "Results" }] as { num: 1|2|3; label: string }[]).map(({ num, label }, i, arr) => (
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

      {/* Step 1 */}
      {step === 1 && (
        <div className="card" style={{ maxWidth: 680 }}>
          <div className="card-header">
            <div>
              <p className="card-title">Campaign Brief</p>
              <p className="card-subtitle">Describe the lead and their business — AI will generate targeted keyword ideas</p>
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
                placeholder="Describe what the client does, their target audience, products/services, and any campaign goals or competitor context…"
                value={brief} onChange={(e) => setBrief(e.target.value)}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
            </div>
            {suggestError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--r)", fontSize: 13, color: "#991b1b" }}>
                <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />{suggestError}
              </div>
            )}
            <button className="btn btn-primary" style={{ justifyContent: "center", height: 44 }} onClick={handleSuggest} disabled={!website.trim() || !brief.trim() || suggesting}>
              {suggesting
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Generating keyword ideas…</>
                : <><Zap style={{ width: 16, height: 16 }} /> Generate Keywords with AI</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680 }}>
          {rationale && (
            <div style={{ padding: "16px 20px", background: "var(--accent-bg)", border: "1px solid #c7d2fe", borderRadius: "var(--r-lg)", fontSize: 13 }}>
              <p style={{ fontWeight: 600, color: "var(--accent-text)", marginBottom: 4 }}>AI Strategy Note</p>
              <p style={{ color: "#4338ca", lineHeight: 1.6 }}>{rationale}</p>
            </div>
          )}
          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title">Review Keywords</p>
                <p className="card-subtitle">{selected.size} of {keywords.length} selected for research</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={toggleAll} style={{ fontSize: 12 }}>
                {selected.size === keywords.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {keywords.map((kw, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 28px", borderBottom: "1px solid var(--border-subtle)", background: selected.has(i) ? "transparent" : "var(--bg)" }}>
                  <input type="checkbox" checked={selected.has(i)}
                    onChange={() => { setSelected((prev) => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; }); }}
                    style={{ accentColor: "var(--accent)", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{kw}</span>
                  <button onClick={() => removeKeyword(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: "var(--r-sm)", display: "flex", alignItems: "center" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-3)")}>
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
              <input type="text" style={{ ...inputStyle, fontSize: 13 }} placeholder="Add a keyword…" value={newKw}
                onChange={(e) => setNewKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
              <button className="btn btn-secondary btn-sm" onClick={addKeyword} disabled={!newKw.trim()} style={{ flexShrink: 0 }}>
                <Plus style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
          {researchError && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--r)", fontSize: 13, color: "#991b1b" }}>
              <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />{researchError}
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}><ChevronLeft style={{ width: 16, height: 16 }} /> Back</button>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center", height: 44 }} onClick={handleResearch} disabled={researching || selected.size === 0}>
              {researching
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> Fetching Google Ads data…</>
                : <><Search style={{ width: 16, height: 16 }} /> Run Keyword Research ({selected.size} keywords)</>}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}><ChevronLeft style={{ width: 15, height: 15 }} /> Edit Keywords</button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", whiteSpace: "nowrap" }}>Max CPC (£)</label>
                <input type="number" min="0" step="0.01" style={{ ...inputStyle, width: 100, fontSize: 13 }} placeholder="1.50" value={maxCpc}
                  onChange={(e) => setMaxCpc(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")} onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(sortedIdeas, cpcMicros)}>
                <Download style={{ width: 14, height: 14 }} /> Export CSV
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { icon: <BarChart2 style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Total Monthly Searches", value: fmtNum(totalSearches), sub: `across ${ideas.length} keywords` },
              { icon: <Target style={{ width: 16, height: 16, color: "#f59e0b" }} />, label: "Avg Competition", value: String(avgCompIndex), sub: "0–100 index" },
              { icon: <DollarSign style={{ width: 16, height: 16, color: "#10b981" }} />, label: "Avg CPC", value: `£${avgCpc.toFixed(2)}`, sub: "mid-range bid estimate" },
              { icon: <Zap style={{ width: 16, height: 16, color: "#0ea5e9" }} />, label: "Est. Monthly Clicks", value: fmtNum(totalClicks), sub: cpcMicros ? `~£${totalCost.toFixed(0)}/mo` : "enter Max CPC to estimate" },
            ].map((m) => (
              <div key={m.label} className="metric-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>{m.icon}<span className="metric-label">{m.label}</span></div>
                <p className="metric-value" style={{ fontSize: 22 }}>{m.value}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{m.sub}</p>
              </div>
            ))}
          </div>

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
                    <Tooltip formatter={(v: unknown) => [fmtNum(Number(v ?? 0)), "Searches"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 8px -2px rgb(0 0 0/0.08)" }} />
                    <Line type="monotone" dataKey="volume" name="Monthly Searches" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div>
                <p className="card-title">Keyword Data</p>
                <p className="card-subtitle">{sortedIdeas.length} keywords — click column headers to sort</p>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg)" }}>
                    {[
                      { field: "text", label: "Keyword", align: "left" as const },
                      { field: "avgMonthlySearches", label: "Avg Monthly", align: "right" as const },
                      { field: "competition", label: "Competition", align: "center" as const },
                      { field: "competitionIndex", label: "Comp. Index", align: "right" as const },
                      { field: "lowTopOfPageBidMicros", label: "Low Bid", align: "right" as const },
                      { field: "highTopOfPageBidMicros", label: "High Bid", align: "right" as const },
                    ].map(({ field, label, align }) => (
                      <th key={field} style={{ padding: "12px 20px", textAlign: align, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: sortField === field ? "var(--accent)" : "var(--text-3)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }} onClick={() => handleSort(field)}>
                        {label} <span style={{ opacity: 0.6 }}>{sortField === field ? (sortDir === "desc" ? "↓" : "↑") : "↕"}</span>
                      </th>
                    ))}
                    <th style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", whiteSpace: "nowrap" }}>Est. Clicks</th>
                    <th style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", whiteSpace: "nowrap" }}>Est. Cost/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIdeas.map((idea, i) => {
                    const { clicks, costPounds } = estimateForecast(idea, cpcMicros);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <td style={{ padding: "11px 20px", color: "var(--text)", fontWeight: 500, maxWidth: 280 }}>{idea.text}</td>
                        <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{fmtNum(idea.avgMonthlySearches)}</td>
                        <td style={{ padding: "11px 20px", textAlign: "center" }}>
                          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, ...competitionBadgeStyle(idea.competition) }}>{competitionLabel(idea.competition)}</span>
                        </td>
                        <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{idea.competitionIndex || "—"}</td>
                        <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{microsToPounds(idea.lowTopOfPageBidMicros)}</td>
                        <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{microsToPounds(idea.highTopOfPageBidMicros)}</td>
                        <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>{fmtNum(clicks)}</td>
                        <td style={{ padding: "11px 20px", textAlign: "right", color: cpcMicros ? "var(--text-2)" : "var(--text-4)", fontVariantNumeric: "tabular-nums" }}>{cpcMicros ? `£${costPounds.toFixed(2)}` : "—"}</td>
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
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <Search style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, color: "var(--text-3)" }}>No keyword data returned for these terms.</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setStep(2)}>
            <ChevronLeft style={{ width: 15, height: 15 }} /> Try different keywords
          </button>
        </div>
      )}
    </div>
  );
}
