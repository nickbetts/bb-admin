"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import Link from "next/link";
import {
  PencilLine,
  Loader2,
  Download,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
  Code,
  X,
  FileText,
  Eye,
} from "lucide-react";
import type { GeneratedContent, SocialVariations } from "@/lib/content-generator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContentGeneratorRecord {
  id: string;
  title: string;
  brief: string;
  contentTypes: string;
  status: string;
  statusMessage?: string;
  generationError?: string;
  generatedContentJson?: string;
  generatedHtml?: string;
  generatedHtmlUrl?: string;
  clientId: string;
  client: { id: string; name: string; website?: string } | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  blog: "Blog Article",
  whitepaper: "Whitepaper",
  case_study: "Case Study",
  social: "Social Media Copy",
};

const TYPE_COLOURS: Record<string, string> = {
  blog: "#2563eb",
  whitepaper: "#7c3aed",
  case_study: "#059669",
  social: "#ea580c",
};

const TYPE_BG: Record<string, string> = {
  blog: "#eff6ff",
  whitepaper: "#f5f3ff",
  case_study: "#f0fdf4",
  social: "#fff7ed",
};

const PLATFORM_LABELS = ["linkedin", "instagram", "facebook", "twitter", "tiktok"] as const;
const PLATFORM_DISPLAY: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  tiktok: "TikTok",
};

// ─── Component ────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function ContentGeneratorViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [record, setRecord] = useState<ContentGeneratorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [modalPiece, setModalPiece] = useState<GeneratedContent | null>(null);

  const fetchRecord = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/content-generator/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = (await res.json()) as { record: ContentGeneratorRecord };
      setRecord(data.record);

      if (data.record.generatedContentJson) {
        setGeneratedContent(JSON.parse(data.record.generatedContentJson) as GeneratedContent[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  // Poll while generating
  useEffect(() => {
    if (!record) return;
    if (record.status !== "generating" && record.status !== "researching") return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/tools/content-generator/${id}`).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { record: ContentGeneratorRecord };
      setRecord(data.record);
      if (data.record.generatedContentJson) {
        setGeneratedContent(JSON.parse(data.record.generatedContentJson) as GeneratedContent[]);
      }
      if (data.record.status === "complete" || data.record.status === "failed") {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, record?.status]);

  function handleUpdate(updated: GeneratedContent) {
    setGeneratedContent((prev) => prev.map((p) => (p.ideaId === updated.ideaId ? updated : p)));
    setModalPiece((prev) => (prev?.ideaId === updated.ideaId ? updated : prev));
  }

  // Download HTML — prefer Blob URL, fall back to inline HTML (legacy)
  async function downloadHtml() {
    const filename = `${record!.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
    if (record!.generatedHtmlUrl) {
      const res = await fetch(record!.generatedHtmlUrl);
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else if (record!.generatedHtml) {
      const blob = new Blob([record!.generatedHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: 1100 }}>
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <Loader2 style={{ width: 28, height: 28, color: "var(--text-3)", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="page" style={{ maxWidth: 1100 }}>
        <p style={{ color: "var(--danger)" }}>{error ?? "Record not found"}</p>
        <Link href="/tools/content-generator" className="btn btn-sm" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ChevronLeft style={{ width: 13, height: 13 }} /> Back to list
        </Link>
      </div>
    );
  }

  const isGenerating = record.status === "generating" || record.status === "researching";
  const isFailed = record.status === "failed";
  const isComplete = record.status === "complete";

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={record.client ? `/tools/content-generator?clientId=${record.clientId}` : "/tools/content-generator"} style={{ color: "var(--text-3)", display: "flex" }}>
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </Link>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PencilLine style={{ width: 18, height: 18, color: "white" }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{record.title}</h1>
            {record.client && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)" }}>{record.client.name}</p>
            )}
          </div>
        </div>

        {isComplete && (record.generatedHtmlUrl || record.generatedHtml) && (
          <button
            className="btn btn-sm btn-primary"
            onClick={downloadHtml}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
          >
            <Download style={{ width: 13, height: 13 }} />
            Download HTML
          </button>
        )}
      </div>

      <p style={{ margin: "0 0 32px", fontSize: 13, color: "var(--text-3)", paddingLeft: 50 }}>{record.brief}</p>

      {/* Status: generating */}
      {isGenerating && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <Loader2 style={{ width: 36, height: 36, color: "var(--accent)", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
            {record.statusMessage ?? "Generating content…"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>This may take a few minutes. The page will update automatically.</p>
        </div>
      )}

      {/* Status: failed */}
      {isFailed && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "16px 20px", background: "var(--danger-bg)", borderRadius: 10, color: "var(--danger)" }}>
          <AlertCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Generation failed</p>
            <p style={{ margin: 0, fontSize: 13 }}>{record.generationError ?? "An unknown error occurred."}</p>
          </div>
        </div>
      )}

      {/* Tile grid */}
      {isComplete && generatedContent.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {generatedContent.map((piece) => (
            <ContentTile
              key={piece.ideaId}
              piece={piece}
              onClick={() => setModalPiece(piece)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalPiece && (
        <ContentModal
          piece={modalPiece}
          packId={id}
          onClose={() => setModalPiece(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

// ─── ContentTile ──────────────────────────────────────────────────────────────

function ContentTile({ piece, onClick }: { piece: GeneratedContent; onClick: () => void }) {
  const colour = TYPE_COLOURS[piece.type] ?? "#2563eb";
  const bg = TYPE_BG[piece.type] ?? "#f8fafc";
  const label = TYPE_LABELS[piece.type] ?? piece.type;

  const excerpt =
    piece.type === "social" && piece.socialVariations
      ? piece.socialVariations.linkedin.slice(0, 140)
      : stripHtml(piece.content).slice(0, 140);

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        padding: 0,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        textAlign: "left",
        transition: "box-shadow 0.15s, transform 0.15s",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        (e.currentTarget as HTMLButtonElement).style.transform = "none";
      }}
    >
      {/* Coloured accent strip */}
      <div style={{ width: "100%", height: 5, background: colour, flexShrink: 0 }} />

      <div style={{ padding: "18px 20px 20px", width: "100%", display: "flex", flexDirection: "column", gap: 10, flex: 1, boxSizing: "border-box" }}>
        {/* Badge + word count */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            background: bg,
            color: colour,
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 20,
            textTransform: "uppercase" as const,
            letterSpacing: ".08em",
            border: `1px solid ${colour}30`,
          }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" as const }}>
            {piece.wordCount} words
          </span>
        </div>

        {/* Title */}
        <p style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text)",
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
        }}>
          {piece.title}
        </p>

        {/* Excerpt */}
        <p style={{
          margin: 0,
          fontSize: 12,
          color: "var(--text-3)",
          lineHeight: 1.6,
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical" as const,
          overflow: "hidden",
          flex: 1,
        }}>
          {excerpt}{excerpt.length >= 140 ? "…" : ""}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)" }}>
            <FileText style={{ width: 12, height: 12 }} />
            {piece.sourceCitations && piece.sourceCitations.length > 0
              ? `${piece.sourceCitations.length} source${piece.sourceCitations.length !== 1 ? "s" : ""}`
              : piece.titleTag ? "SEO metadata" : ""}
          </div>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: colour,
            padding: "4px 10px",
            borderRadius: 6,
            background: bg,
          }}>
            <Eye style={{ width: 12, height: 12 }} />
            View
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── ContentModal ─────────────────────────────────────────────────────────────

function ContentModal({
  piece,
  packId,
  onClose,
  onUpdate,
}: {
  piece: GeneratedContent;
  packId: string;
  onClose: () => void;
  onUpdate: (updated: GeneratedContent) => void;
}) {
  const [activePlatform, setActivePlatform] = useState<string>("linkedin");
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const colour = TYPE_COLOURS[piece.type] ?? "#2563eb";
  const label = TYPE_LABELS[piece.type] ?? piece.type;

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Scroll to top when piece changes
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [piece.ideaId]);

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenerateError(null);
    try {
      const res = await fetch(`/api/tools/content-generator/${packId}/regenerate-piece`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: piece.ideaId }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
      }
      const data = (await res.json()) as { piece: GeneratedContent };
      onUpdate(data.piece);
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1000,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: "5vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(860px, 96vw)",
          maxHeight: "90vh",
          background: "var(--surface)",
          borderRadius: 16,
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        {/* Modal header */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "18px 24px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{
              background: colour,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 20,
              textTransform: "uppercase" as const,
              letterSpacing: ".08em",
              flexShrink: 0,
            }}>
              {label}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{piece.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{piece.wordCount} words</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 7,
                border: "1px solid var(--border)",
                background: "var(--bg-2)",
                cursor: regenerating ? "not-allowed" : "pointer",
                fontSize: 12, color: "var(--text-2)",
                opacity: regenerating ? 0.6 : 1,
              }}
            >
              <RefreshCw style={{ width: 12, height: 12, animation: regenerating ? "spin 1s linear infinite" : "none" }} />
              {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
            <button
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--bg-2)",
                cursor: "pointer",
                color: "var(--text-3)",
              }}
              aria-label="Close"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} style={{ overflowY: "auto", flex: 1, padding: "24px" }}>
          {regenerateError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "10px 14px", background: "var(--danger-bg)", borderRadius: 8, fontSize: 13, color: "var(--danger)" }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
              {regenerateError}
            </div>
          )}

          {/* SEO metadata */}
          {(piece.titleTag || piece.metaDescription || piece.schemaJson) && (
            <div style={{ marginBottom: 24, padding: "14px 16px", background: "var(--bg-2)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8, border: "1px solid var(--border)" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)" }}>SEO Metadata</p>
              {piece.titleTag && (
                <p style={{ margin: 0, fontSize: 13 }}>
                  <strong style={{ color: "var(--text)" }}>Title tag:</strong>{" "}
                  <span style={{ color: "var(--text-2)" }}>{piece.titleTag}</span>
                  <button onClick={() => copyText(piece.titleTag!, "title-" + piece.ideaId)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, color: "var(--text-3)", padding: 0, verticalAlign: "middle" }}>
                    {copied === "title-" + piece.ideaId ? <Check style={{ width: 12, height: 12, color: "var(--success)" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  </button>
                </p>
              )}
              {piece.metaDescription && (
                <p style={{ margin: 0, fontSize: 13 }}>
                  <strong style={{ color: "var(--text)" }}>Meta description:</strong>{" "}
                  <span style={{ color: "var(--text-2)" }}>{piece.metaDescription}</span>
                  <button onClick={() => copyText(piece.metaDescription!, "meta-" + piece.ideaId)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, color: "var(--text-3)", padding: 0, verticalAlign: "middle" }}>
                    {copied === "meta-" + piece.ideaId ? <Check style={{ width: 12, height: 12, color: "var(--success)" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  </button>
                </p>
              )}
              {piece.schemaJson && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5, color: "var(--text-3)" }}>
                    <Code style={{ width: 12, height: 12 }} />
                    <strong style={{ color: "var(--text)" }}>Schema markup:</strong>{" "}JSON-LD
                  </span>
                  <button
                    onClick={() => copyText(piece.schemaJson!, "schema-" + piece.ideaId)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontSize: 12, color: "var(--text-3)" }}
                  >
                    {copied === "schema-" + piece.ideaId ? <Check style={{ width: 11, height: 11, color: "var(--success)" }} /> : <Copy style={{ width: 11, height: 11 }} />}
                    {copied === "schema-" + piece.ideaId ? "Copied!" : "Copy JSON-LD"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Social tabs */}
          {piece.type === "social" && piece.socialVariations ? (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
                {PLATFORM_LABELS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    style={{
                      padding: "5px 13px", borderRadius: 20, fontSize: 12,
                      fontWeight: activePlatform === p ? 700 : 400,
                      border: `1.5px solid ${activePlatform === p ? colour : "var(--border)"}`,
                      background: activePlatform === p ? `${colour}18` : "var(--bg-2)",
                      color: activePlatform === p ? colour : "var(--text-3)",
                      cursor: "pointer",
                    }}
                  >
                    {PLATFORM_DISPLAY[p]}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", padding: "16px 20px", background: "var(--bg-2)", borderRadius: 10, whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: 14, color: "var(--text)", minHeight: 120 }}>
                {(piece.socialVariations as SocialVariations)[activePlatform as keyof SocialVariations]}
                <button
                  onClick={() => copyText((piece.socialVariations as SocialVariations)[activePlatform as keyof SocialVariations], "social-" + activePlatform + piece.ideaId)}
                  style={{ position: "absolute", top: 10, right: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-3)" }}
                >
                  {copied === "social-" + activePlatform + piece.ideaId ? <Check style={{ width: 11, height: 11, color: "var(--success)" }} /> : <Copy style={{ width: 11, height: 11 }} />}
                  {copied === "social-" + activePlatform + piece.ideaId ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            /* Long-form content */
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button
                  onClick={() => copyText(stripHtml(piece.content), "content-" + piece.ideaId)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-2)", cursor: "pointer", fontSize: 12, color: "var(--text-3)" }}
                >
                  {copied === "content-" + piece.ideaId ? <Check style={{ width: 12, height: 12, color: "var(--success)" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  {copied === "content-" + piece.ideaId ? "Copied!" : "Copy as plain text"}
                </button>
              </div>
              <div
                className="prose-content"
                style={{ fontSize: 15, lineHeight: 1.85, color: "var(--text)" }}
                dangerouslySetInnerHTML={{ __html: piece.content }}
              />
              {/* Sources */}
              {piece.sourceCitations && piece.sourceCitations.length > 0 && (
                <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-3)" }}>Sources</p>
                  <ol style={{ margin: 0, paddingLeft: "1.25em", fontSize: 13, lineHeight: 2, color: "var(--text)" }}>
                    {piece.sourceCitations.map((s, i) => (
                      <li key={i}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
                          {s.title}
                        </a>
                        {s.domain && <span style={{ color: "var(--text-3)" }}> — {s.domain}</span>}
                        {s.publishedDate && <span style={{ color: "var(--text-3)" }}> ({s.publishedDate})</span>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
