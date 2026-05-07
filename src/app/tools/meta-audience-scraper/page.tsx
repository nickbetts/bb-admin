"use client";

import { useCallback, useMemo, useState } from "react";
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
  queries: string[];
  reasoning: string;
  pillars: Pillar[];
  totalCandidates: number;
  warning?: string;
}

type SelectedItem = TargetingResult & { pillar?: string };

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

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 32px 80px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--accent-bg)",
            color: "var(--accent)",
          }}
        >
          <Crosshair style={{ width: 20, height: 20 }} />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Meta Audience Scraper</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-3)" }}>
            Discover real interests, behaviours and demographics you can drop straight into a Facebook campaign — powered by Meta&rsquo;s Graph API and Claude.
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

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                  Claude generates ~16 search queries, hits Meta&rsquo;s targeting API, then curates the strongest options into pillars.
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
                  {aiResult.reasoning && (
                    <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 10, fontStyle: "italic" }}>
                      &ldquo;{aiResult.reasoning}&rdquo;
                    </p>
                  )}
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                    {aiResult.totalCandidates.toLocaleString()} candidate options retrieved from {aiResult.queries.length} queries.{" "}
                    <details style={{ display: "inline" }}>
                      <summary style={{ cursor: "pointer", display: "inline" }}>Show queries</summary>
                      <span style={{ marginLeft: 6 }}>{aiResult.queries.join(", ")}</span>
                    </details>
                  </div>

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

      <style jsx>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
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
