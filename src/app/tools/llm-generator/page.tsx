"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bot, Globe, Loader2, Check, AlertTriangle, Download, Copy,
  Plus, Trash2, Pencil, X, Crown, ChevronDown, ChevronUp,
  FileText, Layers, BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LlmTemplate {
  id: string;
  name: string;
  sector: string;
  description?: string | null;
  templateText: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
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

const SECTOR_COLOURS: Record<string, { bg: string; text: string }> = {
  charity: { bg: "#d1fae5", text: "#065f46" },
  ecommerce: { bg: "#dbeafe", text: "#1e40af" },
  healthcare: { bg: "#ede9fe", text: "#5b21b6" },
  education: { bg: "#fef3c7", text: "#92400e" },
  hospitality: { bg: "#fee2e2", text: "#991b1b" },
  "professional-services": { bg: "#f0f4ff", text: "#3730a3" },
};

function sectorColour(sector: string) {
  return SECTOR_COLOURS[sector.toLowerCase()] ?? { bg: "var(--border-subtle)", text: "var(--text-3)" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LlmGeneratorPage() {
  const [activeTab, setActiveTab] = useState<"generate" | "templates">("generate");

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

  // Template management state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSector, setFormSector] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formText, setFormText] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [formError, setFormError] = useState("");
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/tools/llm-generator/templates");
      if (res.ok) {
        const data = await res.json() as { templates: LlmTemplate[] };
        setTemplates(data.templates ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function handleGenerate() {
    if (!website.trim() || !selectedTemplate) return;
    setGenerating(true);
    setGenError("");
    setOutput("");
    try {
      const res = await fetch("/api/tools/llm-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: website.trim(), templateId: selectedTemplate.id }),
      });
      const data = await res.json() as { output?: string; pagesCrawled?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setOutput(data.output ?? "");
      setPagesCrawled(data.pagesCrawled ?? 0);
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
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(t: LlmTemplate) {
    setEditingId(t.id);
    setFormName(t.name);
    setFormSector(t.sector);
    setFormDesc(t.description ?? "");
    setFormText(t.templateText);
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
        body: JSON.stringify({ name: formName, sector: formSector, description: formDesc, templateText: formText }),
      });
      const data = await res.json() as { error?: string };
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

  const canGenerate = website.trim().startsWith("http") && !!selectedTemplate && !generating;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #0ea5e9, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bot style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>LLM.txt Generator</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Crawl any website and generate a comprehensive llm.txt to maximise AI search visibility</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 0 }}>
        {(["generate", "templates"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 600, borderRadius: "var(--r) var(--r) 0 0",
              border: "1px solid transparent", borderBottom: "none", cursor: "pointer", transition: "all 0.15s",
              background: activeTab === tab ? "var(--surface)" : "transparent",
              color: activeTab === tab ? "var(--accent-text)" : "var(--text-3)",
              borderColor: activeTab === tab ? "var(--border-subtle)" : "transparent",
              marginBottom: activeTab === tab ? -1 : 0,
            }}>
            {tab === "generate" ? "Generate" : "Templates"}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* GENERATE TAB */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === "generate" && (
        <div style={{ display: "grid", gridTemplateColumns: output ? "1fr 1.4fr" : "1fr", gap: 28, alignItems: "start" }}>

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
                  <Globe style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--text-3)", pointerEvents: "none" }} />
                  <input
                    type="url"
                    style={{ ...inputStyle, paddingLeft: 36 }}
                    placeholder="https://example.org"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
              </div>
            </div>

            {/* Template selector */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p className="card-title">Template</p>
                    <p className="card-subtitle">Select the sector that best matches the website</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ gap: 5 }}
                    onClick={() => setActiveTab("templates")}>
                    <Plus style={{ width: 13, height: 13 }} />
                    New
                  </button>
                </div>
              </div>
              <div className="card-body">
                {loadingTemplates ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13 }}>
                    <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    Loading templates…
                  </div>
                ) : templates.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                    No templates yet. <button className="btn-link" style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0 }} onClick={() => setActiveTab("templates")}>Create one →</button>
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {templates.map(t => {
                      const col = sectorColour(t.sector);
                      const sel = selectedTemplate?.id === t.id;
                      return (
                        <button key={t.id} type="button" onClick={() => setSelectedTemplate(t)}
                          style={{
                            padding: "12px 14px", borderRadius: "var(--r)",
                            border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                            background: sel ? "var(--accent-bg)" : "var(--surface)",
                            cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                          }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{t.name}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                              {t.isBuiltIn && (
                                <Crown style={{ width: 11, height: 11, color: "#f59e0b" }} />
                              )}
                              {sel && <Check style={{ width: 13, height: 13, color: "var(--accent)" }} />}
                            </div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: col.bg, color: col.text, textTransform: "capitalize" }}>
                            {t.sector}
                          </span>
                          {t.description && (
                            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, lineHeight: 1.4 }}>{t.description}</p>
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
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--r)", fontSize: 13, color: "#991b1b" }}>
                <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />{genError}
              </div>
            )}

            {/* Generate button */}
            <button
              className="btn btn-primary"
              style={{ justifyContent: "center", height: 46 }}
              onClick={handleGenerate}
              disabled={!canGenerate}>
              {generating
                ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />Crawling website &amp; generating llm.txt…</>
                : <><Layers style={{ width: 16, height: 16 }} />Generate llm.txt</>}
            </button>

            {generating && (
              <div style={{ padding: "12px 16px", background: "var(--accent-bg)", border: "1px solid #c7d2fe", borderRadius: "var(--r)", fontSize: 12, color: "var(--accent-text)" }}>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p className="card-title">Generated llm.txt</p>
                    <p className="card-subtitle">
                      {pagesCrawled > 0 ? `${pagesCrawled} pages crawled · ` : ""}
                      {selectedTemplate?.name} template
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} onClick={() => setShowRaw(s => !s)}>
                      {showRaw ? <ChevronUp style={{ width: 13, height: 13 }} /> : <ChevronDown style={{ width: 13, height: 13 }} />}
                      {showRaw ? "Collapse" : "View full"}
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ gap: 6 }} onClick={handleCopy}>
                      {copied ? <Check style={{ width: 13, height: 13, color: "#16a34a" }} /> : <Copy style={{ width: 13, height: 13 }} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={handleDownload}>
                      <Download style={{ width: 13, height: 13 }} />
                      Download
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <pre style={{
                  margin: 0,
                  padding: "16px 20px",
                  fontSize: 12,
                  lineHeight: 1.65,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                  color: "var(--text-2)",
                  background: "var(--bg)",
                  borderRadius: "0 0 var(--r-lg) var(--r-lg)",
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: showRaw ? "none" : 520,
                  overflow: showRaw ? "visible" : "auto",
                }}>
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
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>Template Library</p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
                Built-in templates are provided for common sectors. Create custom templates for any niche.
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p className="card-title">{editingId ? "Edit Template" : "New Template"}</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Template name *</label>
                    <input style={inputStyle} placeholder="e.g. E-commerce" value={formName}
                      onChange={e => setFormName(e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Sector *</label>
                    <input style={inputStyle} placeholder="e.g. ecommerce, healthcare, education"
                      value={formSector}
                      onChange={e => setFormSector(e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Description</label>
                  <input style={inputStyle} placeholder="Brief description of when to use this template"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                    Template text *
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)", marginLeft: 8 }}>
                      Define the sections and structure the AI should use. Use [PLACEHOLDER] markers for dynamic fields.
                    </span>
                  </label>
                  <textarea
                    style={{ ...inputStyle, resize: "vertical", minHeight: 320, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}
                    placeholder={`# LLM Index File\n# Version: 1.0 ([Sector] Optimised)\n# Last Updated: [DATE]\n\n########################################\n# CORE INFORMATION\n########################################\n...\n`}
                    value={formText}
                    onChange={e => setFormText(e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                {formError && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--r)", fontSize: 13, color: "#991b1b" }}>
                    <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />{formError}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" style={{ gap: 6 }} onClick={handleSaveTemplate} disabled={savingTemplate}>
                    {savingTemplate ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Check style={{ width: 14, height: 14 }} />}
                    {editingId ? "Save changes" : "Create template"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Template list */}
          {loadingTemplates ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3)", fontSize: 13, padding: 16 }}>
              <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Loading templates…
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {templates.map(t => {
                const col = sectorColour(t.sector);
                const expanded = expandedPreview === t.id;
                return (
                  <div key={t.id} className="card">
                    <div style={{ padding: "14px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{t.name}</p>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: col.bg, color: col.text, textTransform: "capitalize" }}>
                            {t.sector}
                          </span>
                          {t.isBuiltIn && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#fef3c7", color: "#92400e" }}>
                              <Crown style={{ width: 9, height: 9 }} />Built-in
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{t.description}</p>
                        )}
                        <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 4 }}>
                          {t.templateText.split("\n").length} lines · created {new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" style={{ gap: 5 }}
                          onClick={() => setExpandedPreview(expanded ? null : t.id)}>
                          <BookOpen style={{ width: 13, height: 13 }} />
                          {expanded ? "Hide" : "Preview"}
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ gap: 5 }}
                          onClick={() => { setActiveTab("generate"); setSelectedTemplate(t); }}
                          title="Use this template">
                          <FileText style={{ width: 13, height: 13 }} />
                          Use
                        </button>
                        {!t.isBuiltIn && (
                          <>
                            <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }}
                              onClick={() => openEditForm(t)}>
                              <Pencil style={{ width: 13, height: 13 }} />
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: "4px 8px", color: "#ef4444" }}
                              onClick={() => handleDeleteTemplate(t.id)}>
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {expanded && (
                      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "0 20px 16px" }}>
                        <pre style={{
                          marginTop: 12, padding: "12px 16px", background: "var(--bg)", borderRadius: "var(--r)",
                          fontSize: 11, lineHeight: 1.65, color: "var(--text-3)", overflow: "auto", maxHeight: 360,
                          fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
                        }}>
                          {t.templateText}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tips card */}
          <div className="card" style={{ background: "var(--accent-bg)", border: "1px solid #c7d2fe" }}>
            <div className="card-body">
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-text)", marginBottom: 8 }}>
                How to write a great template
              </p>
              <ul style={{ fontSize: 12, color: "#4338ca", lineHeight: 1.8, paddingLeft: 16 }}>
                <li>Use <code>[ORGANISATION_NAME]</code>, <code>[WEBSITE_URL]</code>, and <code>[DATE]</code> — these are replaced automatically</li>
                <li>Use <code>[Descriptive placeholders in square brackets]</code> to guide the AI — e.g. <code>[List 3-5 cause areas]</code></li>
                <li>Keep the <code># Section header</code> and YAML-like format for clean output</li>
                <li>The AI fills in all placeholders from the crawled website — be specific about what data to extract</li>
                <li>Add sector-specific sections (e.g. charity: registration numbers, ecommerce: product categories)</li>
              </ul>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
