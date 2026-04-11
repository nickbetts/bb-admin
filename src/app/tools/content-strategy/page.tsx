"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  Download,
  Share2,
  Trash2,
  Eye,
  Lock,
  Copy,
  Check,
  ExternalLink,
  X,
  Calendar,
  Users,
  Plus,
  Zap,
  Globe,
  Search,
  AlertCircle,
} from "lucide-react";

interface ContentStrategyItem {
  id: string;
  title: string;
  period: string;
  clientId: string;
  createdBy: string | null;
  shareToken: string | null;
  viewCount: number;
  createdAt: string;
  client: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
  semrushDomain?: string | null;
  searchConsoleSiteUrl?: string | null;
}

type GenerationMode = "semrush" | "upload";

interface DetectedCompetitor {
  domain: string;
  commonKeywords: number;
}

export default function ContentStrategyPage() {
  const [strategies, setStrategies] = useState<ContentStrategyItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [period, setPeriod] = useState(
    new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  );
  const [dragOver, setDragOver] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);

  // Preview state
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewStrategyId, setPreviewStrategyId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Share state
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [copied, setCopied] = useState(false);

  // Mode toggle
  const [mode, setMode] = useState<GenerationMode>("semrush");

  // SEMrush generation state
  const [semrushBrief, setSemrushBrief] = useState("");
  const [semrushDatabase, setSemrushDatabase] = useState("uk");
  const [detectedCompetitors, setDetectedCompetitors] = useState<DetectedCompetitor[]>([]);
  const [detectingCompetitors, setDetectingCompetitors] = useState(false);
  const [semrushProgress, setSemrushProgress] = useState("");
  const [semrushDomain, setSemrushDomain] = useState("");

  const loadStrategies = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/content-strategy?action=list");
      const data = await res.json();
      if (data.strategies) setStrategies(data.strategies);
    } catch {
      console.error("Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      // API returns flat array, not { clients: [...] }
      if (Array.isArray(data)) setClients(data);
      else if (data.clients) setClients(data.clients);
    } catch {
      console.error("Failed to load clients");
    }
  }, []);

  useEffect(() => {
    loadStrategies();
    loadClients();
  }, [loadStrategies, loadClients]);

  // postMessage bridge: handles save and regen requests from the strategy HTML iframe
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      if (!event.data?.type?.startsWith("cs:")) return;

      if (event.data.type === "cs:save") {
        const { html, strategyId } = event.data as { html: string; strategyId: string };
        try {
          const res = await fetch("/api/tools/content-strategy", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: strategyId, generatedHtml: html }),
          });
          const result = await res.json();
          const success = !result.error;
          iframeRef.current?.contentWindow?.postMessage({ type: "cs:save:result", success }, "*");
          if (success) setPreviewHtml(html);
        } catch {
          iframeRef.current?.contentWindow?.postMessage({ type: "cs:save:result", success: false }, "*");
        }
      }

      if (event.data.type === "cs:regen") {
        const { idx, data, strategyId } = event.data as { idx: string; data: Record<string, unknown>; strategyId: string };
        try {
          const res = await fetch("/api/ai/content-strategy-regen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              strategyId,
              itemType: data.type,
              title: data.title,
              url: data.url,
              keywords: data.keywords,
              currentNotes: data.notes,
              cluster: data.cluster,
            }),
          });
          const result = await res.json();
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:regen:result",
            idx,
            notes: result.notes ?? "",
            error: result.error,
          }, "*");
        } catch {
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:regen:result",
            idx,
            notes: "",
            error: "Network error",
          }, "*");
        }
      }

      if (event.data.type === "cs:add") {
        const { sectionType, strategyId, existing, btnId } = event.data as { sectionType: string; strategyId: string; existing: string[]; btnId: string };
        try {
          const res = await fetch("/api/ai/content-strategy-regen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              strategyId,
              action: "add",
              itemType: sectionType,
              existing,
            }),
          });
          const result = await res.json();
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:add:result",
            sectionType,
            btnId,
            title: result.title ?? "",
            notes: result.notes ?? "",
            keywords: result.keywords ?? [],
            error: result.error,
          }, "*");
        } catch {
          iframeRef.current?.contentWindow?.postMessage({
            type: "cs:add:result",
            sectionType,
            btnId,
            title: "",
            notes: "",
            keywords: [],
            error: "Network error",
          }, "*");
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a spreadsheet file");
      return;
    }
    if (!clientName.trim()) {
      setError("Please enter a client name");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientName", clientName);
      formData.append("period", period);
      if (clientId) formData.append("clientId", clientId);

      const res = await fetch("/api/tools/content-strategy", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(
          `Content strategy generated! ${data.stats.totalPageOptimisations} page optimisations, ${data.stats.totalLandingPages} landing pages, ${data.stats.totalBlogPosts} blog posts, ${data.stats.totalLinkTargets} link targets.`
        );
        setFile(null);
        loadStrategies();
      }
    } catch {
      setError("Failed to generate content strategy");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePreview(id: string) {
    try {
      const res = await fetch(`/api/tools/content-strategy?action=get&id=${id}`);
      const data = await res.json();
      if (data.strategy) {
        setPreviewHtml(data.strategy.generatedHtml);
        setPreviewTitle(data.strategy.title);
        setPreviewStrategyId(id);
      }
    } catch {
      setError("Failed to load preview");
    }
  }

  async function handleDownload(id: string, title: string) {
    try {
      const res = await fetch(`/api/tools/content-strategy?action=get&id=${id}`);
      const data = await res.json();
      if (data.strategy) {
        const blob = new Blob([data.strategy.generatedHtml], {
          type: "text/html",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Failed to download");
    }
  }

  async function handleShare(id: string) {
    try {
      const res = await fetch(
        `/api/tools/content-strategy?action=share&id=${id}`
      );
      const data = await res.json();
      if (data.shareToken) {
        setSharingId(id);
        setShareToken(data.shareToken);
        setSharePassword("");
      }
    } catch {
      setError("Failed to create share link");
    }
  }

  async function handleSetPassword() {
    if (!sharingId) return;
    try {
      await fetch("/api/tools/content-strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sharingId, sharePassword: sharePassword || null }),
      });
      setSuccess(sharePassword ? "Password set" : "Password removed");
    } catch {
      setError("Failed to set password");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this content strategy?"))
      return;
    try {
      await fetch(`/api/tools/content-strategy?id=${id}`, {
        method: "DELETE",
      });
      loadStrategies();
    } catch {
      setError("Failed to delete");
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/content-strategy/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    const supportedExts = [".xlsx", ".xls", ".csv", ".docx", ".txt"];
    const ext = droppedFile ? "." + (droppedFile.name.split(".").pop()?.toLowerCase() || "") : "";
    if (droppedFile && supportedExts.includes(ext)) {
      setFile(droppedFile);
    } else {
      setError("Please drop a supported file (.xlsx, .xls, .csv, .docx, or .txt)");
    }
  }

  // ── SEMrush helpers ─────────────────────────────────────────────────────

  async function handleDetectCompetitors(selectedClientId: string) {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client?.semrushDomain) {
      setDetectedCompetitors([]);
      return;
    }
    setSemrushDomain(client.semrushDomain);
    setDetectingCompetitors(true);
    try {
      const res = await fetch("/api/tools/content-strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          action: "detect-competitors",
          database: semrushDatabase,
        }),
      });
      const data = await res.json();
      if (data.competitors) {
        setDetectedCompetitors(data.competitors);
      }
    } catch {
      console.error("Failed to detect competitors");
    } finally {
      setDetectingCompetitors(false);
    }
  }

  function removeCompetitor(domain: string) {
    setDetectedCompetitors((prev) => prev.filter((c) => c.domain !== domain));
  }

  async function handleSemrushGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Please select a client");
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    if (!client?.semrushDomain) {
      setError("This client has no SEMrush domain configured. Set it in client settings first.");
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");
    setSemrushProgress("Collecting SEMrush data and analysing keywords…");

    try {
      // Step 1: Generate strategy data from SEMrush
      const genRes = await fetch("/api/tools/content-strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          brief: semrushBrief,
          period,
          database: semrushDatabase,
          competitors: detectedCompetitors.map((c) => c.domain),
        }),
      });

      const genData = await genRes.json();
      if (genData.error) {
        setError(genData.error);
        return;
      }

      setSemrushProgress("Building content strategy document…");

      // Step 2: Save the strategy (generates HTML via the main route)
      const saveRes = await fetch("/api/tools/content-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetData: genData.strategyData,
          clientName: genData.clientName,
          period,
          clientId,
        }),
      });

      const saveData = await saveRes.json();
      if (saveData.error) {
        setError(saveData.error);
        return;
      }

      setSuccess(
        `Content strategy generated from SEMrush! ${saveData.stats.totalPageOptimisations} page optimisations, ${saveData.stats.totalLandingPages} landing pages, ${saveData.stats.totalBlogPosts} blog posts, ${saveData.stats.totalLinkTargets} link targets.`
      );
      setSemrushBrief("");
      loadStrategies();
    } catch {
      setError("Failed to generate content strategy");
    } finally {
      setGenerating(false);
      setSemrushProgress("");
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>Content Strategy Creator</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Generate a polished, shareable content strategy document from SEMrush data or a keyword spreadsheet.</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", marginBottom: 20, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", color: "var(--danger-text)", fontSize: 13 }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--danger-text)" }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}
      {success && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", marginBottom: 20, background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r)", color: "var(--success-text)", fontSize: 13 }}>
          <span>{success}</span>
          <button onClick={() => setSuccess("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--success-text)" }}><X style={{ width: 14, height: 14 }} /></button>
        </div>
      )}

      {/* Generate Card */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 className="card-title">Generate New Strategy</h2>
            <p className="card-subtitle">
              {mode === "semrush"
                ? "Automatically generate a content strategy from SEMrush data"
                : "Upload an Excel keyword research spreadsheet to create a client-ready document"}
            </p>
          </div>
          {/* Mode toggle */}
          <div style={{ display: "flex", background: "var(--bg)", borderRadius: "var(--r)", padding: 3, gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setMode("semrush")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: mode === "semrush" ? 600 : 400,
                background: mode === "semrush" ? "var(--surface)" : "transparent",
                color: mode === "semrush" ? "var(--accent)" : "var(--text-3)",
                boxShadow: mode === "semrush" ? "var(--shadow-xs)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Zap style={{ width: 14, height: 14 }} /> SEMrush
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: mode === "upload" ? 600 : 400,
                background: mode === "upload" ? "var(--surface)" : "transparent",
                color: mode === "upload" ? "var(--accent)" : "var(--text-3)",
                boxShadow: mode === "upload" ? "var(--shadow-xs)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Upload style={{ width: 14, height: 14 }} /> Upload
            </button>
          </div>
        </div>
        <div className="card-body">

          {/* ─── SEMrush Mode ─── */}
          {mode === "semrush" && (
            <form onSubmit={handleSemrushGenerate}>
              {/* Client selector + Domain display */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                <div>
                  <label className="form-label">Client <span style={{ color: "var(--danger)" }}>*</span></label>
                  <select
                    className="form-input"
                    value={clientId}
                    onChange={(e) => {
                      const selectedClient = clients.find((c) => c.id === e.target.value);
                      setClientId(e.target.value);
                      if (selectedClient) {
                        setClientName(selectedClient.name);
                        if (selectedClient.semrushDomain) {
                          handleDetectCompetitors(e.target.value);
                        } else {
                          setDetectedCompetitors([]);
                          setSemrushDomain("");
                        }
                      } else {
                        setClientName("");
                        setDetectedCompetitors([]);
                        setSemrushDomain("");
                      }
                    }}
                  >
                    <option value="">Select client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.semrushDomain ? "" : " (no SEMrush domain)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Domain</label>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "9px 12px", borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border)", background: "var(--bg)",
                    fontSize: 13, color: semrushDomain ? "var(--text)" : "var(--text-4)",
                    minHeight: 42,
                  }}>
                    <Globe style={{ width: 14, height: 14, color: "var(--text-4)", flexShrink: 0 }} />
                    {semrushDomain || "Auto-filled from client settings"}
                    {clientId && clients.find((c) => c.id === clientId)?.searchConsoleSiteUrl && (
                      <span style={{
                        marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "var(--success)", fontWeight: 500,
                        padding: "2px 8px", borderRadius: 999, background: "var(--success-bg)",
                      }}>
                        GSC connected — fewer SEMrush units
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* No domain warning */}
              {clientId && !semrushDomain && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 16,
                  background: "var(--warning-bg, #fffbeb)", border: "1px solid var(--warning-border, #fde68a)",
                  borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--warning-text, #92400e)",
                }}>
                  <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                  This client has no SEMrush domain configured. Set it in client settings or use the Upload method.
                </div>
              )}

              {/* Competitors */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Search style={{ width: 12, height: 12 }} />
                  Competitors
                  {detectingCompetitors && <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite", color: "var(--accent)" }} />}
                </label>
                {detectedCompetitors.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {detectedCompetitors.map((c) => (
                      <div
                        key={c.domain}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 10px 6px 12px", borderRadius: 999,
                          background: "var(--accent-bg)", border: "1px solid var(--accent-border, #c4b5fd)",
                          fontSize: 13, color: "var(--accent)",
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{c.domain}</span>
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>({c.commonKeywords.toLocaleString()} common)</span>
                        <button
                          type="button"
                          onClick={() => removeCompetitor(c.domain)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-4)", display: "flex" }}
                        >
                          <X style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--text-4)", margin: 0 }}>
                    {clientId && semrushDomain
                      ? detectingCompetitors
                        ? "Detecting competitors…"
                        : "No competitors detected. The content gap analysis will be skipped."
                      : "Select a client to auto-detect competitors"}
                  </p>
                )}
              </div>

              {/* Brief + Period + Database */}
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Brief (optional)</label>
                <textarea
                  className="form-input"
                  value={semrushBrief}
                  onChange={(e) => setSemrushBrief(e.target.value)}
                  placeholder="Any specific areas to target? Locations, products, campaigns, seasonal themes…"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
                <div>
                  <label className="form-label">Period</label>
                  <input
                    type="text"
                    className="form-input"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="e.g. April 2026"
                  />
                </div>
                <div>
                  <label className="form-label">Database</label>
                  <select
                    className="form-input"
                    value={semrushDatabase}
                    onChange={(e) => setSemrushDatabase(e.target.value)}
                  >
                    <option value="uk">UK</option>
                    <option value="us">US</option>
                    <option value="au">Australia</option>
                    <option value="ca">Canada</option>
                    <option value="de">Germany</option>
                    <option value="fr">France</option>
                    <option value="es">Spain</option>
                    <option value="it">Italy</option>
                  </select>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={generating || !clientId || !semrushDomain}
                    className="btn btn-primary"
                    style={{ whiteSpace: "nowrap", height: 42 }}
                  >
                    {generating ? (
                      <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> {semrushProgress || "Generating…"}</>
                    ) : (
                      <><Zap style={{ width: 16, height: 16 }} /> Generate Strategy</>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress indicator */}
              {generating && semrushProgress && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginTop: 16,
                  padding: "12px 16px", borderRadius: "var(--r-sm)",
                  background: "var(--accent-bg)", fontSize: 13, color: "var(--accent)",
                }}>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite", flexShrink: 0 }} />
                  {semrushProgress}
                </div>
              )}
            </form>
          )}

          {/* ─── Upload Mode ─── */}
          {mode === "upload" && (
          <form onSubmit={handleGenerate}>
            <div
              style={{
                border: `2px dashed ${dragOver ? "var(--accent)" : file ? "var(--success)" : "var(--border)"}`,
                borderRadius: "var(--r)",
                padding: file ? "20px 24px" : "40px 24px",
                textAlign: "center",
                background: dragOver ? "var(--accent-bg)" : file ? "#f0fdf4" : "var(--bg)",
                transition: "all 0.15s ease",
                cursor: file ? "default" : "pointer",
                marginBottom: 24,
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => { if (!file) document.getElementById("file-input")?.click(); }}
            >
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: "var(--success-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileSpreadsheet style={{ width: 20, height: 20, color: "var(--success)" }} />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0 }}>{file.name}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text-4)", borderRadius: "var(--r-sm)" }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ width: 52, height: 52, borderRadius: "var(--r)", background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Upload style={{ width: 24, height: 24, color: "var(--accent)" }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", margin: "0 0 4px" }}>Drag & drop your file here</p>
                  <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 16px" }}>Supports .xlsx, .xls, .csv, .docx, and .txt files up to 10 MB</p>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
                    Choose File
                    <input
                      id="file-input"
                      type="file"
                      accept=".xlsx,.xls,.csv,.docx,.txt"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFile(f);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Form fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
              <div>
                <label className="form-label">Client <span style={{ color: "var(--danger)" }}>*</span></label>
                {creatingClient ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="New client name"
                      autoFocus
                    />
                    <button
                      type="button"
                      disabled={!clientName.trim() || generating}
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0, height: 42 }}
                      onClick={async () => {
                        if (!clientName.trim()) return;
                        try {
                          const res = await fetch("/api/clients", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: clientName.trim() }),
                          });
                          const newClient = await res.json();
                          if (newClient.error) {
                            setError(newClient.error);
                            return;
                          }
                          setClients((prev) => [...prev, { id: newClient.id, name: newClient.name }].sort((a, b) => a.name.localeCompare(b.name)));
                          setClientId(newClient.id);
                          setClientName(newClient.name);
                          setCreatingClient(false);
                          setSuccess(`Client "${newClient.name}" created`);
                        } catch {
                          setError("Failed to create client");
                        }
                      }}
                    >
                      <Plus style={{ width: 14, height: 14 }} /> Create
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ flexShrink: 0, height: 42 }}
                      onClick={() => { setCreatingClient(false); setClientName(""); }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="form-input"
                      value={clientId}
                      onChange={(e) => {
                        const selectedClient = clients.find((c) => c.id === e.target.value);
                        setClientId(e.target.value);
                        if (selectedClient) setClientName(selectedClient.name);
                        else setClientName("");
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ flexShrink: 0, height: 42 }}
                      onClick={() => setCreatingClient(true)}
                    >
                      <Plus style={{ width: 14, height: 14 }} /> New
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Period</label>
                <input
                  type="text"
                  className="form-input"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="e.g. April 2026"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={generating || !file || !clientId}
                  className="btn btn-primary"
                  style={{ whiteSpace: "nowrap", height: 42 }}
                >
                  {generating ? (
                    <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Generating…</>
                  ) : (
                    <><FileSpreadsheet style={{ width: 16, height: 16 }} /> Generate Strategy</>
                  )}
                </button>
              </div>
            </div>
          </form>
          )}
        </div>
      </div>

      {/* Strategies List */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Generated Strategies</h2>
            <p className="card-subtitle">{strategies.length} {strategies.length === 1 ? "strategy" : "strategies"} created</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", color: "var(--accent)", margin: "0 auto 10px", display: "block" }} />
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>Loading strategies…</p>
          </div>
        ) : strategies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileSpreadsheet style={{ width: 24, height: 24 }} /></div>
            <p className="empty-state-title">No content strategies yet</p>
            <p className="empty-state-desc">Generate a content strategy from SEMrush data or upload a keyword research spreadsheet to get started.</p>
          </div>
        ) : (
          <div>
            {strategies.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "16px 20px",
                  borderTop: i > 0 ? "1px solid var(--border-subtle)" : undefined,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileSpreadsheet style={{ width: 18, height: 18, color: "var(--accent)" }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    {s.client?.name && (
                      <>
                        <Users style={{ width: 11, height: 11, color: "var(--text-4)" }} />
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>{s.client.name}</span>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                      </>
                    )}
                    <Calendar style={{ width: 11, height: 11, color: "var(--text-4)" }} />
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>{s.period}</span>
                    <span style={{ color: "var(--text-4)" }}>·</span>
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{" "}
                      {new Date(s.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {s.createdBy && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>by {s.createdBy}</span>
                      </>
                    )}
                    {s.viewCount > 0 && (
                      <>
                        <span style={{ color: "var(--text-4)" }}>·</span>
                        <Eye style={{ width: 11, height: 11, color: "var(--text-4)" }} />
                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>{s.viewCount} views</span>
                      </>
                    )}
                    {s.shareToken && (
                      <span className="badge badge-indigo" style={{ fontSize: 11, padding: "2px 8px", marginLeft: 4 }}>Shared</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <button onClick={() => handlePreview(s.id)} className="btn btn-ghost btn-sm" title="Preview" style={{ padding: 8 }}>
                    <Eye style={{ width: 15, height: 15 }} />
                  </button>
                  <button onClick={() => handleDownload(s.id, s.title)} className="btn btn-ghost btn-sm" title="Download" style={{ padding: 8 }}>
                    <Download style={{ width: 15, height: 15 }} />
                  </button>
                  <button onClick={() => handleShare(s.id)} className="btn btn-ghost btn-sm" title="Share" style={{ padding: 8 }}>
                    <Share2 style={{ width: 15, height: 15 }} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="btn btn-ghost btn-sm" title="Delete" style={{ padding: 8, color: "var(--danger)" }}>
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {sharingId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow)", maxWidth: 460, width: "100%", padding: 28, margin: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>Share Strategy</h3>
              <button onClick={() => setSharingId(null)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Share link */}
            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Share link</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  className="form-input"
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/content-strategy/${shareToken}`}
                  style={{ background: "var(--bg)", fontSize: 13, fontFamily: "monospace" }}
                />
                <button onClick={copyShareLink} className="btn btn-primary" style={{ flexShrink: 0 }}>
                  {copied ? <Check style={{ width: 15, height: 15 }} /> : <Copy style={{ width: 15, height: 15 }} />}
                </button>
              </div>
            </div>

            {/* Password protection */}
            <div style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Lock style={{ width: 12, height: 12 }} />
                Password protection (optional)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Leave empty for no password"
                />
                <button onClick={handleSetPassword} className="btn btn-secondary" style={{ flexShrink: 0 }}>
                  {sharePassword ? "Set" : "Remove"}
                </button>
              </div>
            </div>

            {/* Open link */}
            <a
              href={`/share/content-strategy/${shareToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <ExternalLink style={{ width: 15, height: 15 }} />
              Open share link
            </a>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow)", width: "95vw", height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>{previewTitle}</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => {
                    if (previewStrategyId) {
                      setPreviewHtml("");
                      setPreviewTitle("");
                      setPreviewStrategyId(null);
                      handleShare(previewStrategyId);
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <Share2 style={{ width: 14, height: 14 }} /> Share
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([previewHtml], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${previewTitle}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Download style={{ width: 14, height: 14 }} /> Download
                </button>
                <button onClick={() => { setPreviewHtml(""); setPreviewTitle(""); setPreviewStrategyId(null); }} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              style={{ flex: 1, width: "100%", border: "none" }}
              title="Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}
