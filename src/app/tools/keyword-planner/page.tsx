"use client";

import { useState } from "react";
import {
  Search, Loader2, TrendingUp, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Plus, Trash2, Download, BarChart2, Target, DollarSign, Zap, Check, AlertTriangle,
  Globe, Layers,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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
    case "LOW":    return { background: "#d1fae5", color: "#065f46" };
    case "MEDIUM": return { background: "#fef3c7", color: "#92400e" };
    case "HIGH":   return { background: "#fee2e2", color: "#991b1b" };
    default:       return { background: "var(--border-subtle)", color: "var(--text-3)" };
  }
}

function competitionLabel(level: string): string {
  switch (level) {
    case "LOW": return "Low"; case "MEDIUM": return "Medium"; case "HIGH": return "High"; default: return "\u2014";
  }
}

function estimateForecast(idea: KeywordIdea, cpcMicros: number) {
  const ctrMap: Record<string, number> = { LOW: 0.08, MEDIUM: 0.05, HIGH: 0.03, UNSPECIFIED: 0.04 };
  const ctr = ctrMap[idea.competition] ?? 0.04;
  const impressions = Math.round(idea.avgMonthlySearches * 0.7);
  const clicks = Math.round(impressions * ctr);
  const effectiveCpc = cpcMicros || idea.highTopOfPageBidMicros || 1_000_000;
  return { clicks, impressions, costPounds: (clicks * effectiveCpc) / 1_000_000 };
}

function exportToCsv(ideas: KeywordIdea[], cpcMicros: number) {
  const headers = [
    "Ad Group", "Keyword", "Avg Monthly Searches", "Competition", "Competition Index",
    "Low Bid (\xa3)", "High Bid (\xa3)", "Est. Impressions", "Est. Clicks", "Est. Cost/mo (\xa3)",
  ];
  const rows = ideas.map((idea) => {
    const { impressions, clicks, costPounds } = estimateForecast(idea, cpcMicros);
    return [
      `"${idea.adGroup}"`, `"${idea.text}"`, idea.avgMonthlySearches, idea.competition, idea.competitionIndex,
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [website, setWebsite] = useState("");
  const [brief, setBrief] = useState("");
  const [location, setLocation] = useState("2826");

  // Step 1 → 2
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");
  const [rationale, setRationale] = useState("");

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
  const [maxCpc, setMaxCpc] = useState("");
  const [sortField, setSortField] = useState<keyof KeywordIdea>("avgMonthlySearches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [groupedView, setGroupedView] = useState(true);

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
      setIdeas(data.ideas ?? []);
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
    <div style={{ padding: "40px 48px", maxWidth: 1200, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Keyword Planner</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>AI-powered keyword research with ad group structure, using live Google Ads data</p>
          </div>
        </div>
      </div>

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
            {suggestError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--r)", fontSize: 13, color: "#991b1b" }}>
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
            <div style={{ padding: "16px 20px", background: "var(--accent-bg)", border: "1px solid #c7d2fe", borderRadius: "var(--r-lg)", fontSize: 13, maxWidth: 860 }}>
              <p style={{ fontWeight: 600, color: "var(--accent-text)", marginBottom: 4 }}>AI Strategy Note</p>
              <p style={{ color: "#4338ca", lineHeight: 1.6 }}>{rationale}</p>
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
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--r)", fontSize: 13, color: "#991b1b", maxWidth: 860 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", whiteSpace: "nowrap" }}>Max CPC (\xa3)</label>
                <input type="number" min="0" step="0.01" style={{ ...inputStyle, width: 100, fontSize: 13 }} placeholder="1.50" value={maxCpc}
                  onChange={(e) => setMaxCpc(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")} />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setGroupedView((v) => !v)} style={{ gap: 6 }}>
                <Layers style={{ width: 14, height: 14 }} />{groupedView ? "Flat view" : "Group by ad group"}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => exportToCsv(sortedIdeas, cpcMicros)}>
                <Download style={{ width: 14, height: 14 }} /> Export CSV
              </button>
            </div>
          </div>

          {/* Summary metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { icon: <BarChart2 style={{ width: 16, height: 16, color: "var(--accent)" }} />, label: "Total Monthly Searches", value: fmtNum(totalSearches), sub: `${ideas.length} keywords with volume` },
              { icon: <Target style={{ width: 16, height: 16, color: "#f59e0b" }} />, label: "Avg Competition", value: String(avgCompIndex), sub: "0\u2013100 index" },
              { icon: <DollarSign style={{ width: 16, height: 16, color: "#10b981" }} />, label: "Avg CPC", value: `\xa3${avgCpc.toFixed(2)}`, sub: "mid-range bid estimate" },
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
                    <Tooltip formatter={(v: unknown) => [fmtNum(Number(v ?? 0)), "Searches"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 8px -2px rgb(0 0 0/0.08)" }} />
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
                            <td colSpan={8} style={{ padding: "8px 16px" }}>
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
                            return (
                              <tr key={`${groupName}-${i}`} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                <td style={{ ...tdStyle, color: "var(--text)", fontWeight: 500, paddingLeft: 24 }}>{idea.text}</td>
                                <td style={{ ...tdStyle, textAlign: "right" }}>{fmtNum(idea.avgMonthlySearches)}</td>
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
    </div>
  );
}
