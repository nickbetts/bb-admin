"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  PencilLine,
  Loader2,
  Download,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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

const PLATFORM_LABELS = ["linkedin", "instagram", "facebook", "twitter", "tiktok"] as const;
const PLATFORM_DISPLAY: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  tiktok: "TikTok",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContentGeneratorViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [record, setRecord] = useState<ContentGeneratorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);

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

  // Download HTML
  function downloadHtml() {
    if (!record?.generatedHtml) return;
    const blob = new Blob([record.generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${record.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <Loader2 style={{ width: 28, height: 28, color: "var(--text-3)", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="page" style={{ maxWidth: 900 }}>
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
    <div className="page" style={{ maxWidth: 900 }}>
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

        {isComplete && record.generatedHtml && (
          <button
            className="btn btn-sm btn-primary"
            onClick={downloadHtml}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download style={{ width: 13, height: 13 }} />
            Download HTML
          </button>
        )}
      </div>

      <p style={{ margin: "0 0 32px", fontSize: 13, color: "var(--text-3)", paddingLeft: 50 }}>{record.brief}</p>

      {/* Status: generating */}
      {isGenerating && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
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

      {/* Generated content */}
      {isComplete && generatedContent.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {generatedContent.map((piece) => (
            <ContentPiece key={piece.ideaId} piece={piece} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ContentPiece sub-component ───────────────────────────────────────────────

function ContentPiece({ piece }: { piece: GeneratedContent }) {
  const [open, setOpen] = useState(true);
  const [activePlatform, setActivePlatform] = useState<string>("linkedin");
  const [copied, setCopied] = useState<string | null>(null);

  const colour = TYPE_COLOURS[piece.type] ?? "#2563eb";
  const label = TYPE_LABELS[piece.type] ?? piece.type;

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: colour, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, textTransform: "uppercase", letterSpacing: ".08em" }}>
            {label}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{piece.title}</span>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{piece.wordCount} words</span>
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: "var(--text-3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--text-3)" }} />}
      </button>

      {open && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "20px 24px" }}>
          {/* SEO metadata */}
          {(piece.titleTag || piece.metaDescription) && (
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "var(--bg-2)", borderRadius: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {piece.titleTag && (
                <p style={{ margin: 0, fontSize: 12 }}>
                  <strong style={{ color: "var(--text)" }}>Title tag:</strong>{" "}
                  <span style={{ color: "var(--text-3)" }}>{piece.titleTag}</span>
                  <button onClick={() => copyText(piece.titleTag!, "title-" + piece.ideaId)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, color: "var(--text-3)", padding: 0, verticalAlign: "middle" }}>
                    {copied === "title-" + piece.ideaId ? <Check style={{ width: 12, height: 12, color: "var(--success)" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  </button>
                </p>
              )}
              {piece.metaDescription && (
                <p style={{ margin: 0, fontSize: 12 }}>
                  <strong style={{ color: "var(--text)" }}>Meta description:</strong>{" "}
                  <span style={{ color: "var(--text-3)" }}>{piece.metaDescription}</span>
                  <button onClick={() => copyText(piece.metaDescription!, "meta-" + piece.ideaId)} style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8, color: "var(--text-3)", padding: 0, verticalAlign: "middle" }}>
                    {copied === "meta-" + piece.ideaId ? <Check style={{ width: 12, height: 12, color: "var(--success)" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  </button>
                </p>
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
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: activePlatform === p ? 700 : 400,
                      border: `1.5px solid ${activePlatform === p ? colour : "var(--border)"}`,
                      background: activePlatform === p ? `${colour}15` : "var(--bg-2)",
                      color: activePlatform === p ? colour : "var(--text-3)",
                      cursor: "pointer",
                    }}
                  >
                    {PLATFORM_DISPLAY[p]}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative", padding: "16px 20px", background: "var(--bg-2)", borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 14, color: "var(--text)", minHeight: 120 }}>
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
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <button
                  onClick={() => copyText(piece.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), "content-" + piece.ideaId)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-2)", cursor: "pointer", fontSize: 12, color: "var(--text-3)" }}
                >
                  {copied === "content-" + piece.ideaId ? <Check style={{ width: 12, height: 12, color: "var(--success)" }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  {copied === "content-" + piece.ideaId ? "Copied!" : "Copy as plain text"}
                </button>
              </div>
              <div
                className="prose-content"
                style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text)", maxWidth: "100%" }}
                dangerouslySetInnerHTML={{ __html: piece.content }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
