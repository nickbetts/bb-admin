"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, Plus, Trash2, RefreshCw, Save, Loader2, X, ChevronDown, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface TrackerClient {
  domain: string;
  name: string;
  campaignIds: string[];
}

interface TrackerList {
  id: string;
  name: string;
  keywords: string;
  clientIds: string; // JSON: TrackerClient[]
  database: string;
  createdAt: string;
  updatedAt: string;
}

interface CellData {
  position: number | null;
  previousPosition: number | null;
  delta: number | null;
  searchVolume: number;
  url: string;
}

interface MatrixData {
  keywords: string[];
  clients: { domain: string; name: string }[];
  cells: Record<string, Record<string, CellData>>;
  database: string;
}

const DATABASES = [
  { value: "uk", label: "UK" },
  { value: "us", label: "US" },
  { value: "au", label: "Australia" },
  { value: "ca", label: "Canada" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
];

function positionBg(pos: number | null): string {
  if (pos === null) return "transparent";
  if (pos <= 3) return "rgba(34,197,94,0.15)";
  if (pos <= 10) return "rgba(234,179,8,0.15)";
  if (pos <= 20) return "rgba(249,115,22,0.15)";
  return "rgba(239,68,68,0.1)";
}

function positionColor(pos: number | null): string {
  if (pos === null) return "var(--text-3)";
  if (pos <= 3) return "#16a34a";
  if (pos <= 10) return "#a16207";
  if (pos <= 20) return "#c2410c";
  return "#b91c1c";
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (!delta) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: delta > 0 ? "#16a34a" : "#b91c1c", display: "block", lineHeight: 1, marginTop: 2 }}>
      {delta > 0 ? "↑" : "↓"}{Math.abs(delta)}
    </span>
  );
}

function MatrixCell({ data }: { data: CellData | undefined }) {
  if (!data || data.position === null) {
    return (
      <td style={{ padding: "10px 14px", textAlign: "center", color: "var(--text-3)", fontSize: 13, borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>–</td>
    );
  }
  const { position, delta, url } = data;
  return (
    <td style={{ padding: "10px 14px", textAlign: "center", background: positionBg(position), borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", minWidth: 90 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: positionColor(position), lineHeight: 1 }}>{position}</span>
        <DeltaBadge delta={delta} />
        {url && (
          <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ marginTop: 3 }}>
            <ExternalLink style={{ width: 9, height: 9, color: "var(--text-3)" }} />
          </a>
        )}
      </div>
    </td>
  );
}

export default function KeywordTrackerPage() {
  const { toast } = useToast();

  const [lists, setLists] = useState<TrackerList[]>([]);
  const [availableClients, setAvailableClients] = useState<TrackerClient[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Working state
  const [listName, setListName] = useState("New List");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<TrackerClient[]>([]);
  const [database, setDatabase] = useState("uk");
  const [keywordInput, setKeywordInput] = useState("");

  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showListDropdown, setShowListDropdown] = useState(false);

  const loadConfig = useCallback(async (preserveList = false) => {
    setLoadingConfig(true);
    try {
      const res = await fetch("/api/tools/keyword-tracker/config");
      if (!res.ok) return;
      const data = await res.json() as { lists: TrackerList[]; semrushClients: TrackerClient[] };
      setLists(data.lists ?? []);
      setAvailableClients(data.semrushClients ?? []);

      if (!preserveList && data.lists?.length > 0) {
        const first = data.lists[0];
        setSelectedListId(first.id);
        setListName(first.name);
        setKeywords(JSON.parse(first.keywords || "[]") as string[]);
        setSelectedClients(JSON.parse(first.clientIds || "[]") as TrackerClient[]);
        setDatabase(first.database || "uk");
      }
    } catch { /* ignore */ } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => { void loadConfig(); }, []);

  function selectList(list: TrackerList) {
    setSelectedListId(list.id);
    setListName(list.name);
    setKeywords(JSON.parse(list.keywords || "[]") as string[]);
    setSelectedClients(JSON.parse(list.clientIds || "[]") as TrackerClient[]);
    setDatabase(list.database || "uk");
    setMatrix(null);
    setIsDirty(false);
    setShowListDropdown(false);
  }

  function newList() {
    setSelectedListId(null);
    setListName("New List");
    setKeywords([]);
    setSelectedClients([]);
    setDatabase("uk");
    setMatrix(null);
    setIsDirty(false);
    setShowListDropdown(false);
  }

  function addKeywords() {
    const lines = keywordInput
      .split(/[\n,]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0);
    const next = Array.from(new Set([...keywords, ...lines]));
    if (next.length > 50) { toast("Maximum 50 keywords per list", "warning"); return; }
    setKeywords(next);
    setKeywordInput("");
    setIsDirty(true);
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
    setIsDirty(true);
  }

  function isClientSelected(domain: string) {
    return selectedClients.some((c) => c.domain === domain);
  }

  function toggleClient(client: TrackerClient) {
    setSelectedClients((prev) =>
      prev.some((c) => c.domain === client.domain)
        ? prev.filter((c) => c.domain !== client.domain)
        : [...prev, client]
    );
    setIsDirty(true);
  }

  function toggleAllClients() {
    if (selectedClients.length === availableClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients([...availableClients]);
    }
    setIsDirty(true);
  }

  async function saveList() {
    if (!listName.trim()) { toast("List name is required", "warning"); return; }
    setSaving(true);
    try {
      const body = { name: listName, keywords, clientIds: selectedClients, database };
      if (selectedListId) {
        const res = await fetch(`/api/tools/keyword-tracker/config?id=${selectedListId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast("List saved", "success");
      } else {
        const res = await fetch("/api/tools/keyword-tracker/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const data = await res.json() as { list: TrackerList };
        setSelectedListId(data.list.id);
        toast("List created", "success");
      }
      setIsDirty(false);
      void loadConfig(true);
    } catch {
      toast("Failed to save list", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteList(id: string) {
    if (!confirm("Delete this list?")) return;
    await fetch(`/api/tools/keyword-tracker/config?id=${id}`, { method: "DELETE" });
    setLists((prev) => prev.filter((l) => l.id !== id));
    if (selectedListId === id) newList();
    toast("List deleted", "success");
  }

  async function runMatrix() {
    if (keywords.length === 0) { toast("Add at least one keyword", "warning"); return; }
    if (selectedClients.length === 0) { toast("Select at least one client", "warning"); return; }
    if (!selectedListId) { toast("Save your list first", "warning"); return; }
    setRunning(true);
    try {
      const res = await fetch(`/api/tools/keyword-tracker/matrix?listId=${selectedListId}`);
      if (!res.ok) throw new Error();
      setMatrix(await res.json() as MatrixData);
    } catch {
      toast("Failed to fetch keyword positions", "error");
    } finally {
      setRunning(false);
    }
  }

  const selectedList = lists.find((l) => l.id === selectedListId);

  return (
    <div className="page" style={{ maxWidth: 1400, padding: "24px 24px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileSpreadsheet style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Keyword Tracker</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Track keyword positions across clients · powered by SEMrush</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isDirty && <span style={{ fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>Unsaved changes</span>}
          <button onClick={() => void saveList()} disabled={saving} className="btn btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {saving ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <Save style={{ width: 13, height: 13 }} />}
            Save
          </button>
          <button
            onClick={() => void runMatrix()}
            disabled={running || keywords.length === 0 || selectedClients.length === 0 || !selectedListId}
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {running ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <RefreshCw style={{ width: 13, height: 13 }} />}
            {running ? "Fetching…" : "Run Matrix"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* ── Left sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* List selector */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Saved Lists</div>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowListDropdown((v) => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "var(--r)", border: "1px solid var(--border)", background: "var(--bg)", fontSize: 13, color: "var(--text)", cursor: "pointer" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedList?.name ?? "New List"}</span>
                <ChevronDown style={{ width: 14, height: 14, flexShrink: 0, color: "var(--text-3)" }} />
              </button>
              {showListDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 240, overflowY: "auto" }}>
                  <button
                    onClick={newList}
                    style={{ width: "100%", textAlign: "left", padding: "9px 12px", fontSize: 13, color: "#6366f1", border: "none", background: "transparent", cursor: "pointer", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Plus style={{ width: 13, height: 13 }} /> New List
                  </button>
                  {lists.map((l) => (
                    <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: "1px solid var(--border)", background: selectedListId === l.id ? "#6366f108" : "transparent" }}>
                      <button onClick={() => selectList(l)} style={{ flex: 1, textAlign: "left", fontSize: 13, color: "var(--text)", border: "none", background: "transparent", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.name}
                      </button>
                      <button onClick={() => void deleteList(l.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "var(--text-3)", flexShrink: 0 }}>
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ))}
                  {lists.length === 0 && <div style={{ padding: "12px 12px", fontSize: 12, color: "var(--text-3)" }}>No saved lists yet</div>}
                </div>
              )}
            </div>
            <input
              type="text" value={listName} onChange={(e) => { setListName(e.target.value); setIsDirty(true); }}
              className="form-input" style={{ marginTop: 8, fontSize: 13 }} placeholder="List name"
            />
          </div>

          {/* Database */}
          <div className="card" style={{ padding: 16 }}>
            <label className="form-label">SEMrush Database</label>
            <select className="form-input" value={database} onChange={(e) => { setDatabase(e.target.value); setIsDirty(true); }} style={{ fontSize: 13 }}>
              {DATABASES.map((db) => <option key={db.value} value={db.value}>{db.label}</option>)}
            </select>
          </div>

          {/* Keywords */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Keywords</div>
              <span style={{ fontSize: 11, color: keywords.length > 40 ? "#b91c1c" : "var(--text-3)" }}>{keywords.length}/50</span>
            </div>
            <textarea
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addKeywords(); } }}
              placeholder={"One per line or comma-separated"}
              className="form-input"
              style={{ fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
            />
            <button onClick={addKeywords} disabled={!keywordInput.trim()} className="btn btn-sm" style={{ marginTop: 8, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Plus style={{ width: 13, height: 13 }} /> Add Keywords
            </button>
            {keywords.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {keywords.map((kw) => (
                  <span key={kw} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, fontSize: 12, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                    {kw}
                    <button onClick={() => removeKeyword(kw)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-3)" }}>
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Client selector */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Clients <span style={{ textTransform: "none", fontWeight: 400 }}>({selectedClients.length}/{availableClients.length})</span>
              </div>
              {availableClients.length > 0 && (
                <button onClick={toggleAllClients} style={{ fontSize: 11, color: "#6366f1", border: "none", background: "transparent", cursor: "pointer", padding: 0 }}>
                  {selectedClients.length === availableClients.length ? "None" : "All"}
                </button>
              )}
            </div>
            {loadingConfig ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13 }}>
                <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Loading…
              </div>
            ) : availableClients.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>No SEMrush projects found. Ensure your SEMRUSH_API_KEY is set and you have projects in SEMrush.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" }}>
                {availableClients.map((c) => (
                  <label key={c.domain} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "6px 8px", borderRadius: "var(--r)", background: isClientSelected(c.domain) ? "#6366f108" : "transparent" }}>
                    <input type="checkbox" checked={isClientSelected(c.domain)} onChange={() => toggleClient(c)} style={{ marginTop: 2, accentColor: "#6366f1", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", lineHeight: 1.2 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{c.domain}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Main matrix ── */}
        <div>
          {!matrix && !running && (
            <div className="card" style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 320 }}>
              <FileSpreadsheet style={{ width: 40, height: 40, color: "var(--text-3)" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>No matrix yet</p>
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                  {keywords.length === 0 ? "Add keywords and select clients, then click Run Matrix"
                    : selectedClients.length === 0 ? "Select at least one client to track"
                    : !selectedListId ? "Save your list first, then click Run Matrix"
                    : "Click Run Matrix to fetch current positions from SEMrush"}
                </p>
              </div>
              <button onClick={() => void runMatrix()} disabled={running || keywords.length === 0 || selectedClients.length === 0 || !selectedListId} className="btn btn-primary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <RefreshCw style={{ width: 13, height: 13 }} /> Run Matrix
              </button>
            </div>
          )}

          {running && (
            <div className="card" style={{ padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 320 }}>
              <Loader2 style={{ width: 36, height: 36, color: "#6366f1" }} className="animate-spin" />
              <p style={{ fontSize: 14, color: "var(--text-3)" }}>Fetching keyword positions from SEMrush…</p>
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>This may take up to 30 seconds for large matrices</p>
            </div>
          )}

          {matrix && !running && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Legend */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Position</span>
                {[
                  { label: "Top 3", bg: "rgba(34,197,94,0.2)", color: "#16a34a" },
                  { label: "4–10", bg: "rgba(234,179,8,0.2)", color: "#a16207" },
                  { label: "11–20", bg: "rgba(249,115,22,0.2)", color: "#c2410c" },
                  { label: "21+", bg: "rgba(239,68,68,0.15)", color: "#b91c1c" },
                ].map((item) => (
                  <span key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: item.bg, display: "inline-block" }} />
                    <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
                  </span>
                ))}
                <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>
                  {DATABASES.find((d) => d.value === matrix.database)?.label ?? matrix.database} · ↑↓ vs previous period
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg)" }}>
                      <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", position: "sticky", left: 0, background: "var(--bg)", zIndex: 2, minWidth: 200 }}>
                        Keyword
                      </th>
                      {matrix.clients.map((c) => (
                        <th key={c.domain} style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", minWidth: 110 }}>
                          <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 12 }}>{c.name}</div>
                          <div style={{ fontSize: 10, fontWeight: 400, color: "var(--text-3)", marginTop: 2 }}>{c.domain}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.keywords.map((kw, i) => (
                      <tr key={kw} style={{ background: i % 2 === 0 ? "var(--surface)" : "transparent" }}>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "var(--text)", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)", position: "sticky", left: 0, background: i % 2 === 0 ? "var(--surface)" : "var(--bg)", zIndex: 1 }}>
                          {kw}
                        </td>
                        {matrix.clients.map((c) => (
                          <MatrixCell key={c.domain} data={matrix.cells[kw]?.[c.domain]} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
