"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bot,
  Globe,
  Loader2,
  Check,
  AlertTriangle,
  Download,
  Copy,
  Plus,
  Trash2,
  Pencil,
  X,
  Crown,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  BookOpen,
  Share2,
  Link2,
  Building2,
  Eye,
  Search,
  History,
  Copy as CopyIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LlmTemplate {
  id: string;
  name: string;
  sector: string;
  description?: string | null;
  templateText: string;
  promptGuidance?: string | null;
  isBuiltIn: boolean;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface GenerationMeta {
  usedWebSearchFallback: boolean;
  crawlBlocked: boolean;
  authorityDataUsed: boolean;
  auxiliaryDataUsed: boolean;
  socialProfilesFound: number;
  clientId: string | null;
  generationMs: number;
}

interface SavedGeneration {
  id: string;
  clientId: string | null;
  createdByEmail: string | null;
  title: string;
  website: string;
  templateName: string;
  sector: string;
  pagesCrawled: number;
  deadUrlsRemoved: number;
  usedWebSearchFallback: boolean;
  authorityDataUsed: boolean;
  socialProfilesFound: number;
  generationMs: number | null;
  shareToken: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "var(--r)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s",
};

const metaChip: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 9px",
  borderRadius: 99,
  background: "var(--border-subtle)",
  color: "var(--text-3)",
  whiteSpace: "nowrap",
};

const SECTOR_COLOURS: Record<string, { bg: string; text: string }> = {
  charity: { bg: "#d1fae5", text: "#065f46" },
  ecommerce: { bg: "#dbeafe", text: "#1e40af" },
  healthcare: { bg: "#ede9fe", text: "#5b21b6" },
  education: { bg: "#fef3c7", text: "#92400e" },
  hospitality: { bg: "#fee2e2", text: "#991b1b" },
  "professional-services": { bg: "#f0f4ff", text: "#3730a3" },
};

function sectorColour(sector: string) {
  return (
    SECTOR_COLOURS[sector.toLowerCase()] ?? { bg: "var(--border-subtle)", text: "var(--text-3)" }
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LlmGeneratorPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "templates" | "saved">("generate");

  // Generate state
  const [website, setWebsite] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<LlmTemplate | null>(null);
  const [templates, setTemplates] = useState<LlmTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [output, setOutput] = useState("");
  const [pagesCrawled, setPagesCrawled] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Client linking + persistence
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [currentMeta, setCurrentMeta] = useState<GenerationMeta | null>(null);
  const [currentDeadUrls, setCurrentDeadUrls] = useState<number>(0);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Saved generations
  const [generations, setGenerations] = useState<SavedGeneration[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [shareBusyId, setShareBusyId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  // Template management state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSector, setFormSector] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formText, setFormText] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [formError, setFormError] = useState("");
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/tools/llm-generator/templates");
      if (res.ok) {
        const data = (await res.json()) as { templates: LlmTemplate[] };
        setTemplates(data.templates ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = (await res.json()) as { clients?: ClientOption[] } | ClientOption[];
        const list = Array.isArray(data) ? data : (data.clients ?? []);
        setClients(list.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const loadGenerations = useCallback(async () => {
    setLoadingGenerations(true);
    try {
      const res = await fetch("/api/tools/llm-generator/generations");
      if (res.ok) {
        const data = (await res.json()) as { generations: SavedGeneration[] };
        setGenerations(data.generations ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingGenerations(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "saved") loadGenerations();
  }, [activeTab, loadGenerations]);

  async function handleGenerate() {
    if (!website.trim() || !selectedTemplate) return;
    setGenerating(true);
    setGenError("");
    setOutput("");
    setCurrentMeta(null);
    setCurrentId(null);
    try {
      const res = await fetch("/api/tools/llm-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: website.trim(),
          templateId: selectedTemplate.id,
          clientId: selectedClientId || undefined,
        }),
      });
      const data = (await res.json()) as {
        id?: string | null;
        output?: string;
        pagesCrawled?: number;
        deadUrlsRemoved?: number;
        meta?: GenerationMeta;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setOutput(data.output ?? "");
      setPagesCrawled(data.pagesCrawled ?? 0);
      setCurrentDeadUrls(data.deadUrlsRemoved ?? 0);
      setCurrentMeta(data.meta ?? null);
      setCurrentId(data.id ?? null);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    try {
      const domain = new URL(website.trim()).hostname.replace(/^www\./, "");
      a.download = `${domain}-llm.txt`;
    } catch {
      a.download = "llm.txt";
    }
    a.click();
    URL.revokeObjectURL(url);
  }

  function openNewForm() {
    setEditingId(null);
    setFormName("");
    setFormSector("");
    setFormDesc("");
    setFormText("");
    setFormPrompt("");
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(t: LlmTemplate) {
    setEditingId(t.id);
    setFormName(t.name);
    setFormSector(t.sector);
    setFormDesc(t.description ?? "");
    setFormText(t.templateText);
    setFormPrompt(t.promptGuidance ?? "");
    setFormError("");
    setShowForm(true);
  }

  async function handleSaveTemplate() {
    if (!formName.trim() || !formSector.trim() || !formText.trim()) {
      setFormError("Name, sector, and template text are required.");
      return;
    }
    setSavingTemplate(true);
    setFormError("");
    try {
      const url = editingId
        ? `/api/tools/llm-generator/templates/${editingId}`
        : "/api/tools/llm-generator/templates";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          sector: formSector,
          description: formDesc,
          templateText: formText,
          promptGuidance: formPrompt,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      await loadTemplates();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    await fetch(`/api/tools/llm-generator/templates/${id}`, { method: "DELETE" });
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
    await loadTemplates();
  }

  async function handleCloneTemplate(t: LlmTemplate) {
    const res = await fetch(`/api/tools/llm-generator/templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clone" }),
    });
    if (res.ok) {
      const data = (await res.json()) as { template: LlmTemplate };
      await loadTemplates();
      if (data.template) openEditForm(data.template);
    }
  }

  function shareUrlFor(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/share/llm/${token}`;
  }

  async function handleToggleShare(g: SavedGeneration) {
    setShareBusyId(g.id);
    try {
      const res = await fetch(`/api/tools/llm-generator/generations/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: g.shareToken ? "unshare" : "share" }),
      });
      if (res.ok) await loadGenerations();
    } finally {
      setShareBusyId(null);
    }
  }

  async function handleCopyShareLink(g: SavedGeneration) {
    if (!g.shareToken) return;
    await navigator.clipboard.writeText(shareUrlFor(g.shareToken));
    setCopiedShareId(g.id);
    setTimeout(() => setCopiedShareId(null), 2000);
  }

  async function handleDeleteGeneration(id: string) {
    await fetch(`/api/tools/llm-generator/generations/${id}`, { method: "DELETE" });
    await loadGenerations();
  }

  async function handleLoadGeneration(g: SavedGeneration) {
    try {
      const res = await fetch(`/api/tools/llm-generator/generations/${g.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { generation: { output: string; website: string } };
      setOutput(data.generation.output ?? "");
      setWebsite(data.generation.website ?? "");
      setPagesCrawled(g.pagesCrawled);
      setCurrentDeadUrls(g.deadUrlsRemoved);
      setCurrentId(g.id);
      setCurrentMeta(null);
      setActiveTab("generate");
    } catch {
      // ignore
    }
  }

  const websiteLooksValid = (() => {
    const v = website.trim();
    if (!v) return false;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(withScheme);
      return u.hostname.includes(".");
    } catch {
      return false;
    }
  })();
  const canGenerate = websiteLooksValid && !!selectedTemplate && !generating;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Bot style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
              LLM.txt Generator
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              Crawl any website and generate a comprehensive llm.txt to maximise AI search
              visibility
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 28,
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: 0,
        }}
      >
        {(["generate", "templates", "saved"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "var(--r) var(--r) 0 0",
              border: "1px solid transparent",
              borderBottom: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              background: activeTab === tab ? "var(--surface)" : "transparent",
              color: activeTab === tab ? "var(--accent-text)" : "var(--text-3)",
              borderColor: activeTab === tab ? "var(--border-subtle)" : "transparent",
              marginBottom: activeTab === tab ? -1 : 0,
            }}
          >
            {tab === "generate" ? "Generate" : tab === "templates" ? "Templates" : "Saved"}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* GENERATE TAB */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "generate" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: output ? "1fr 1.4fr" : "1fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          {/* ── Left panel: inputs ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Website input */}
            <div className="card">
              <div className="card-header">
                <p className="card-title">Website</p>
                <p className="card-subtitle">Enter the URL you want to generate an llm.txt for</p>
              </div>
              <div className="card-body">
                <div style={{ position: "relative" }}>
                  <Globe
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 15,
                      height: 15,
                      color: "var(--text-3)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="url"
                    style={{ ...inputStyle, paddingLeft: 36 }}
                    placeholder="https://example.org"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
              </div>
            </div>

            {/* Client link (optional) */}
            <div className="card">
              <div className="card-header">
                <p className="card-title">
                  Client <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(optional)</span>
                </p>
                <p className="card-subtitle">
                  Link this llm.txt to a client so the team can find and share it later
                </p>
              </div>
              <div className="card-body">
                <div style={{ position: "relative" }}>
                  <Building2
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 15,
                      height: 15,
                      color: "var(--text-3)",
                      pointerEvents: "none",
                    }}
                  />
                  <select
                    style={{
                      ...inputStyle,
                      paddingLeft: 36,
                      appearance: "none",
                      cursor: "pointer",
                    }}
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                  >
                    <option value="">No client — unlinked</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Template selector */}
            <div className="card">
              <div className="card-header">
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <p className="card-title">Template</p>
                    <p className="card-subtitle">Select the sector that best matches the website</p>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ gap: 5 }}
                    onClick={() => setActiveTab("templates")}
                  >
                    <Plus style={{ width: 13, height: 13 }} />
                    New
                  </button>
                </div>
              </div>
              <div className="card-body">
                {loadingTemplates ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-3)",
                      fontSize: 13,
                    }}
                  >
                    <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    Loading templates…
                  </div>
                ) : templates.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                    No templates yet.{" "}
                    <button
                      className="btn-link"
                      style={{
                        color: "var(--accent)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        padding: 0,
                      }}
                      onClick={() => setActiveTab("templates")}
                    >
                      Create one →
                    </button>
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {templates.map((t) => {
                      const col = sectorColour(t.sector);
                      const sel = selectedTemplate?.id === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTemplate(t)}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "var(--r)",
                            border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                            background: sel ? "var(--accent-bg)" : "var(--surface)",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--text)",
                                lineHeight: 1.3,
                              }}
                            >
                              {t.name}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                flexShrink: 0,
                              }}
                            >
                              {t.isBuiltIn && (
                                <Crown style={{ width: 11, height: 11, color: "var(--warning)" }} />
                              )}
                              {sel && (
                                <Check style={{ width: 13, height: 13, color: "var(--accent)" }} />
                              )}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 99,
                              background: col.bg,
                              color: col.text,
                              textTransform: "capitalize",
                            }}
                          >
                            {t.sector}
                          </span>
                          {t.description && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--text-3)",
                                marginTop: 6,
                                lineHeight: 1.4,
                              }}
                            >
                              {t.description}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {genError && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 16px",
                  background: "var(--danger-bg)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: "var(--r)",
                  fontSize: 13,
                  color: "var(--danger-text)",
                }}
              >
                <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                {genError}
              </div>
            )}

            {/* Generate button */}
            <button
              className="btn btn-primary"
              style={{ justifyContent: "center", height: 46 }}
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {generating ? (
                <>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  Crawling website &amp; generating llm.txt…
                </>
              ) : (
                <>
                  <Layers style={{ width: 16, height: 16 }} />
                  Generate llm.txt
                </>
              )}
            </button>

            {generating && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--accent-bg)",
                  border: "1px solid rgb(99 102 241 / 0.25)",
                  borderRadius: "var(--r)",
                  fontSize: 12,
                  color: "var(--accent-text)",
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: 4 }}>What&apos;s happening…</p>
                <p>1. Crawling your homepage and key sub-pages (about, services, donate, etc.)</p>
                <p>2. Extracting titles, descriptions, headings, content, and social profiles</p>
                <p>3. AI generating a complete llm.txt from the crawled data</p>
              </div>
            )}
          </div>

          {/* ── Right panel: output ── */}
          {output && (
            <div className="card" style={{ position: "sticky", top: 24 }}>
              <div className="card-header">
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <p className="card-title">Generated llm.txt</p>
                    <p className="card-subtitle">
                      {pagesCrawled > 0 ? `${pagesCrawled} pages crawled · ` : ""}
                      {selectedTemplate?.name} template
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 6 }}
                      onClick={() => setShowRaw((s) => !s)}
                    >
                      {showRaw ? (
                        <ChevronUp style={{ width: 13, height: 13 }} />
                      ) : (
                        <ChevronDown style={{ width: 13, height: 13 }} />
                      )}
                      {showRaw ? "Collapse" : "View full"}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 6 }}
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check style={{ width: 13, height: 13, color: "var(--success)" }} />
                      ) : (
                        <Copy style={{ width: 13, height: 13 }} />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ gap: 6 }}
                      onClick={handleDownload}
                    >
                      <Download style={{ width: 13, height: 13 }} />
                      Download
                    </button>
                  </div>
                </div>
              </div>
              {(currentMeta || currentDeadUrls > 0 || pagesCrawled > 0) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    padding: "10px 20px",
                    borderTop: "1px solid var(--border-subtle)",
                    background: "var(--bg)",
                  }}
                >
                  {pagesCrawled > 0 && <span style={metaChip}>{pagesCrawled} pages crawled</span>}
                  {currentDeadUrls > 0 && (
                    <span
                      style={{
                        ...metaChip,
                        background: "var(--warning-bg)",
                        color: "var(--warning-text)",
                      }}
                    >
                      {currentDeadUrls} dead URLs removed
                    </span>
                  )}
                  {currentMeta?.socialProfilesFound ? (
                    <span style={metaChip}>{currentMeta.socialProfilesFound} social profiles</span>
                  ) : null}
                  {currentMeta?.authorityDataUsed && (
                    <span style={metaChip}>Authority register data</span>
                  )}
                  {currentMeta?.usedWebSearchFallback && (
                    <span
                      style={{
                        ...metaChip,
                        background: "var(--warning-bg)",
                        color: "var(--warning-text)",
                      }}
                    >
                      Web-search fallback used
                    </span>
                  )}
                  {currentMeta?.crawlBlocked && (
                    <span
                      style={{
                        ...metaChip,
                        background: "var(--danger-bg)",
                        color: "var(--danger-text)",
                      }}
                    >
                      Crawl blocked — used search
                    </span>
                  )}
                  {currentMeta?.generationMs ? (
                    <span style={metaChip}>{(currentMeta.generationMs / 1000).toFixed(1)}s</span>
                  ) : null}
                  {currentId && (
                    <span
                      style={{
                        ...metaChip,
                        background: "var(--success-bg)",
                        color: "var(--success-text)",
                      }}
                    >
                      Saved to library
                    </span>
                  )}
                </div>
              )}
              <div className="card-body" style={{ padding: 0 }}>
                <pre
                  style={{
                    margin: 0,
                    padding: "16px 20px",
                    fontSize: 12,
                    lineHeight: 1.65,
                    fontFamily:
                      "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                    color: "var(--text-2)",
                    background: "var(--bg)",
                    borderRadius: "0 0 var(--r-lg) var(--r-lg)",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: showRaw ? "none" : 520,
                    overflow: showRaw ? "visible" : "auto",
                  }}
                >
                  {output}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TEMPLATES TAB */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header + new button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                Template Library
              </p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
                Built-in templates are provided for common sectors. Create custom templates for any
                niche.
              </p>
            </div>
            {!showForm && (
              <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={openNewForm}>
                <Plus style={{ width: 13, height: 13 }} />
                New Template
              </button>
            )}
          </div>

          {/* Create / Edit form */}
          {showForm && (
            <div className="card">
              <div className="card-header">
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <p className="card-title">{editingId ? "Edit Template" : "New Template"}</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
              <div
                className="card-body"
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 6,
                      }}
                    >
                      Template name *
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. E-commerce"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: 6,
                      }}
                    >
                      Sector *
                    </label>
                    <input
                      style={inputStyle}
                      placeholder="e.g. ecommerce, healthcare, education"
                      value={formSector}
                      onChange={(e) => setFormSector(e.target.value)}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                    />
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    Description
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="Brief description of when to use this template"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    Template structure *
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 400,
                        color: "var(--text-3)",
                        marginLeft: 8,
                      }}
                    >
                      The llm.txt skeleton the AI fills in. Use [placeholder] markers for dynamic
                      fields.
                    </span>
                  </label>
                  <textarea
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 320,
                      fontFamily: "monospace",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                    placeholder={`# llm.txt\n# Version: 1.0\n# Last Updated: [YYYY-MM-DD]\n\n##################################################\n# CORE ORGANISATION IDENTITY\n##################################################\n\norganisation_name: [Organisation Name]\n...\n`}
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 6,
                    }}
                  >
                    AI prompt guidance
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 400,
                        color: "var(--text-3)",
                        marginLeft: 8,
                      }}
                    >
                      Instructions and prioritisation rules the AI follows when filling this
                      template. Leave blank for defaults.
                    </span>
                  </label>
                  <textarea
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 200,
                      fontFamily: "monospace",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                    placeholder={`e.g.\nPrioritise the description and mission_statement — write as clean, directly quotable sentences.\nFor impact_metrics, only use real numbers found on the site — never estimate.\nFor faith-based charities, fill the faith_based_giving section fully.`}
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                {formError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      background: "var(--danger-bg)",
                      border: "1px solid var(--danger-border)",
                      borderRadius: "var(--r)",
                      fontSize: 13,
                      color: "var(--danger-text)",
                    }}
                  >
                    <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                    {formError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    style={{ gap: 6 }}
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate}
                  >
                    {savingTemplate ? (
                      <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    ) : (
                      <Check style={{ width: 14, height: 14 }} />
                    )}
                    {editingId ? "Save changes" : "Create template"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template list */}
          {loadingTemplates ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-3)",
                fontSize: 13,
                padding: 16,
              }}
            >
              <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
              Loading templates…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {templates.map((t) => {
                const col = sectorColour(t.sector);
                const expanded = expandedPreview === t.id;
                return (
                  <div key={t.id} className="card">
                    <div
                      style={{
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}
                        >
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                            {t.name}
                          </p>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 99,
                              background: col.bg,
                              color: col.text,
                              textTransform: "capitalize",
                            }}
                          >
                            {t.sector}
                          </span>
                          {t.isBuiltIn && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 99,
                                background: "var(--warning-bg)",
                                color: "var(--warning-text)",
                              }}
                            >
                              <Crown style={{ width: 9, height: 9 }} />
                              Built-in
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
                            {t.description}
                          </p>
                        )}
                        <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>
                          {t.templateText.split("\n").length} lines · created{" "}
                          {new Date(t.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ gap: 5 }}
                          onClick={() => setExpandedPreview(expanded ? null : t.id)}
                        >
                          <BookOpen style={{ width: 13, height: 13 }} />
                          {expanded ? "Hide" : "Preview"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ gap: 5 }}
                          onClick={() => {
                            setActiveTab("generate");
                            setSelectedTemplate(t);
                          }}
                          title="Use this template"
                        >
                          <FileText style={{ width: 13, height: 13 }} />
                          Use
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ gap: 5 }}
                          onClick={() => handleCloneTemplate(t)}
                          title="Duplicate as an editable copy"
                        >
                          <CopyIcon style={{ width: 13, height: 13 }} />
                          Clone
                        </button>
                        {!t.isBuiltIn && (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "4px 8px" }}
                              onClick={() => openEditForm(t)}
                            >
                              <Pencil style={{ width: 13, height: 13 }} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "4px 8px", color: "var(--danger)" }}
                              onClick={() => handleDeleteTemplate(t.id)}
                            >
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {expanded && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border-subtle)",
                          padding: "0 20px 16px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--text-3)",
                            marginTop: 12,
                            marginBottom: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Template structure
                        </p>
                        <pre
                          style={{
                            padding: "12px 16px",
                            background: "var(--bg)",
                            borderRadius: "var(--r)",
                            fontSize: 11,
                            lineHeight: 1.65,
                            color: "var(--text-3)",
                            overflow: "auto",
                            maxHeight: 360,
                            fontFamily: "monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {t.templateText}
                        </pre>
                        {t.promptGuidance && (
                          <>
                            <p
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text-3)",
                                marginTop: 12,
                                marginBottom: 4,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              AI prompt guidance
                            </p>
                            <pre
                              style={{
                                padding: "12px 16px",
                                background: "var(--warning-bg)",
                                border: "1px solid var(--warning-border)",
                                borderRadius: "var(--r)",
                                fontSize: 11,
                                lineHeight: 1.65,
                                color: "var(--warning-text)",
                                overflow: "auto",
                                maxHeight: 240,
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {t.promptGuidance}
                            </pre>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tips card */}
          <div
            className="card"
            style={{ background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)" }}
          >
            <div className="card-body">
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--accent-text)",
                  marginBottom: 8,
                }}
              >
                How to write a great template
              </p>
              <ul
                style={{
                  fontSize: 12,
                  color: "var(--accent-text)",
                  lineHeight: 1.8,
                  paddingLeft: 16,
                }}
              >
                <li>
                  <strong>Template structure</strong> — the llm.txt skeleton. Use{" "}
                  <code>[Charity Name]</code>, <code>[domain]</code>, and <code>[YYYY-MM-DD]</code>{" "}
                  as auto-replaced markers
                </li>
                <li>
                  Use <code>[descriptive placeholders]</code> to guide the AI on what to fill in —
                  e.g. <code>[Citation-ready description of what the programme does]</code>
                </li>
                <li>
                  Keep <code>## Section headers</code> and YAML indentation exactly — the AI
                  reproduces them verbatim
                </li>
                <li>
                  <strong>AI prompt guidance</strong> — separate from the template. Tell the AI
                  which sections to prioritise and any quality rules. Editable per template.
                </li>
                <li>
                  Add sector-specific sections and guidance (e.g. charity: registration + faith
                  giving, ecommerce: product schema, healthcare: CQC registration)
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SAVED TAB */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "saved" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                Saved llm.txt files
              </p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
                Every generation is saved here. Share a link with a client so they can publish it as
                their <code>llm.txt</code>.
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} onClick={loadGenerations}>
              <History style={{ width: 13, height: 13 }} />
              Refresh
            </button>
          </div>

          {loadingGenerations ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-3)",
                fontSize: 13,
                padding: 16,
              }}
            >
              <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
              Loading saved generations…
            </div>
          ) : generations.length === 0 ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: "center", padding: "40px 20px" }}>
                <Search
                  style={{ width: 28, height: 28, color: "var(--text-4)", margin: "0 auto 12px" }}
                />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  No saved generations yet
                </p>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
                  Generate an llm.txt and it will appear here automatically.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {generations.map((g) => {
                const col = sectorColour(g.sector);
                return (
                  <div key={g.id} className="card">
                    <div
                      style={{
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                            {g.title}
                          </p>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 99,
                              background: col.bg,
                              color: col.text,
                              textTransform: "capitalize",
                            }}
                          >
                            {g.sector}
                          </span>
                          {g.client && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 99,
                                background: "var(--accent-bg)",
                                color: "var(--accent-text)",
                              }}
                            >
                              <Building2 style={{ width: 9, height: 9 }} />
                              {g.client.name}
                            </span>
                          )}
                          {g.shareToken && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 99,
                                background: "var(--success-bg)",
                                color: "var(--success-text)",
                              }}
                            >
                              <Share2 style={{ width: 9, height: 9 }} />
                              Shared
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-3)", wordBreak: "break-all" }}>
                          {g.website}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          <span style={metaChip}>{g.templateName} template</span>
                          {g.pagesCrawled > 0 && (
                            <span style={metaChip}>{g.pagesCrawled} pages</span>
                          )}
                          {g.deadUrlsRemoved > 0 && (
                            <span style={metaChip}>{g.deadUrlsRemoved} dead URLs removed</span>
                          )}
                          {g.usedWebSearchFallback && (
                            <span
                              style={{
                                ...metaChip,
                                background: "var(--warning-bg)",
                                color: "var(--warning-text)",
                              }}
                            >
                              web-search
                            </span>
                          )}
                          {g.shareToken && (
                            <span
                              style={{
                                ...metaChip,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Eye style={{ width: 10, height: 10 }} />
                              {g.viewCount} views
                            </span>
                          )}
                          <span style={metaChip}>
                            {new Date(g.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          flexShrink: 0,
                          alignItems: "stretch",
                        }}
                      >
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ gap: 5 }}
                          onClick={() => handleLoadGeneration(g)}
                          title="Open in the generator"
                        >
                          <FileText style={{ width: 13, height: 13 }} />
                          Open
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ gap: 5 }}
                          onClick={() => handleToggleShare(g)}
                          disabled={shareBusyId === g.id}
                          title={g.shareToken ? "Stop sharing" : "Create share link"}
                        >
                          {shareBusyId === g.id ? (
                            <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                          ) : (
                            <Share2 style={{ width: 13, height: 13 }} />
                          )}
                          {g.shareToken ? "Unshare" : "Share"}
                        </button>
                        {g.shareToken && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ gap: 5 }}
                            onClick={() => handleCopyShareLink(g)}
                            title="Copy share link"
                          >
                            {copiedShareId === g.id ? (
                              <Check style={{ width: 13, height: 13, color: "var(--success)" }} />
                            ) : (
                              <Link2 style={{ width: 13, height: 13 }} />
                            )}
                            {copiedShareId === g.id ? "Copied!" : "Copy link"}
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ gap: 5, color: "var(--danger)" }}
                          onClick={() => handleDeleteGeneration(g.id)}
                          title="Delete"
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
