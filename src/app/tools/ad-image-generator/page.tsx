"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ImageIcon,
  Loader2,
  Send,
  Plus,
  Trash2,
  Download,
  Sparkles,
  AlertTriangle,
  Pencil,
  Check,
  X,
  ChevronLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdImageTurn {
  role: "user" | "assistant";
  prompt?: string;
  imageUrl?: string;
  createdAt: string;
}

interface SessionDetail {
  id: string;
  title: string;
  size: string;
  currentImageUrl: string | null;
  messages: AdImageTurn[];
}

interface SessionSummary {
  id: string;
  title: string;
  currentImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const SIZE_OPTIONS: { value: string; label: string; aspect: string }[] = [
  { value: "1024x1024", label: "Square (1:1)", aspect: "1 / 1" },
  { value: "1024x1536", label: "Portrait (2:3)", aspect: "2 / 3" },
  { value: "1536x1024", label: "Landscape (3:2)", aspect: "3 / 2" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "var(--r)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdImageGeneratorPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [loadingActive, setLoadingActive] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<string>("1024x1024");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadSessions = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/tools/ad-image-generator");
      if (res.ok) {
        const data = (await res.json()) as { sessions: SessionSummary[] };
        setSessions(data.sessions ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages.length]);

  async function openSession(id: string) {
    setLoadingActive(true);
    setError("");
    setShowSidebarMobile(false);
    try {
      const res = await fetch(`/api/tools/ad-image-generator?id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = (await res.json()) as SessionDetail;
        setActiveSession(data);
        setSize(data.size);
      } else {
        setError("Failed to load session");
      }
    } finally {
      setLoadingActive(false);
    }
  }

  function startNewSession() {
    setActiveSession(null);
    setPrompt("");
    setError("");
    setShowSidebarMobile(false);
  }

  async function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tools/ad-image-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession?.id,
          prompt: trimmed,
          size,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Image generation failed");
      }
      setActiveSession(data as SessionDetail);
      setPrompt("");
      // refresh sidebar list (new session or new updatedAt)
      loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image session? This cannot be undone.")) return;
    const res = await fetch(`/api/tools/ad-image-generator?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (activeSession?.id === id) setActiveSession(null);
      loadSessions();
    }
  }

  async function handleRename(id: string) {
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    const res = await fetch("/api/tools/ad-image-generator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    if (res.ok) {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
      if (activeSession?.id === id) setActiveSession({ ...activeSession, title });
    }
    setRenamingId(null);
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", background: "var(--bg)" }}>
      {/* Sidebar — session list */}
      <aside
        style={{
          width: showSidebarMobile ? "100%" : 280,
          maxWidth: showSidebarMobile ? "none" : 280,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
        className="ad-image-sidebar"
      >
        <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={startNewSession}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--r)",
              background: "var(--brand)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Plus className="h-4 w-4" /> New image
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {loadingList ? (
            <div style={{ padding: 16, color: "var(--text-3)", fontSize: 13 }}>Loading…</div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 16, color: "var(--text-3)", fontSize: 13 }}>
              No image sessions yet. Start by describing the ad image you want.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => renamingId !== s.id && openSession(s.id)}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: "pointer",
                  background: activeSession?.id === s.id ? "var(--bg)" : "transparent",
                  border:
                    activeSession?.id === s.id ? "1px solid var(--border)" : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: "var(--bg)",
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.currentImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.currentImageUrl}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4" style={{ color: "var(--text-3)" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renamingId === s.id ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(s.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }}
                      />
                      <button
                        onClick={() => handleRename(s.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--success, #10b981)" }}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {new Date(s.updatedAt).toLocaleDateString("en-GB")}
                      </div>
                    </>
                  )}
                </div>
                {renamingId !== s.id && (
                  <div style={{ display: "flex", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      title="Rename"
                      onClick={() => {
                        setRenamingId(s.id);
                        setRenameValue(s.title);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-3)" }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => handleDelete(s.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-3)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main pane */}
      <main
        style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
        className={showSidebarMobile ? "ad-image-main-hidden" : ""}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            className="ad-image-mobile-toggle"
            onClick={() => setShowSidebarMobile(true)}
            style={{
              display: "none",
              background: "none",
              border: "1px solid var(--border)",
              padding: 6,
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--text)",
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Sparkles className="h-5 w-5" style={{ color: "var(--brand)" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
              {activeSession?.title ?? "Ad Image Generator"}
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)" }}>
              Generate ad imagery with AI, then refine it through follow-up prompts.
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <Link
              href="/tools"
              style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}
            >
              ← All tools
            </Link>
          </div>
        </div>

        {/* Conversation / empty state */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {loadingActive ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-3)" }} />
            </div>
          ) : !activeSession ? (
            <EmptyState />
          ) : (
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
              {activeSession.messages.map((turn, i) => (
                <TurnRow key={i} turn={turn} />
              ))}
              {submitting && (
                <div
                  style={{
                    padding: 20,
                    borderRadius: 12,
                    border: "1px dashed var(--border)",
                    color: "var(--text-2)",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--surface)",
                  }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating image… this can take 10–40 seconds.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--surface)",
            padding: 16,
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 10,
                padding: 10,
                borderRadius: 8,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "var(--danger, #b91c1c)",
                fontSize: 13,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <label style={{ fontSize: 12, color: "var(--text-3)" }}>Size:</label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                disabled={!!activeSession}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 12,
                }}
              >
                {SIZE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {activeSession && (
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                  Refining current image — start a new session to change size.
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  activeSession
                    ? "Describe how to refine the image (e.g. ‘make the background a sunset beach’)"
                    : "Describe the ad image you want (e.g. ‘a cosy coffee shop interior at golden hour, warm tones, photorealistic, ad style’)"
                }
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  minHeight: 60,
                  fontFamily: "inherit",
                }}
                disabled={submitting}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting || !prompt.trim()}
                style={{
                  padding: "0 18px",
                  borderRadius: "var(--r)",
                  background: "var(--brand)",
                  color: "#fff",
                  border: "none",
                  cursor: submitting || !prompt.trim() ? "not-allowed" : "pointer",
                  opacity: submitting || !prompt.trim() ? 0.6 : 1,
                  fontWeight: 600,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Working…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {activeSession ? "Refine" : "Generate"}
                  </>
                )}
              </button>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-3)" }}>
              Press ⌘/Ctrl + Enter to submit. Powered by OpenAI gpt-image-2.
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .ad-image-sidebar {
            position: absolute;
            z-index: 20;
            height: 100%;
            display: ${showSidebarMobile ? "flex" : "none"};
          }
          .ad-image-mobile-toggle {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: "60px auto 0",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <ImageIcon className="h-7 w-7" style={{ color: "var(--brand)" }} />
      </div>
      <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600, color: "var(--text)" }}>
        Generate ad imagery with AI
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--text-3)", lineHeight: 1.5 }}>
        Describe the visual you want for an ad campaign. After the first image, keep prompting to
        refine — change colours, swap subjects, adjust composition. Each session keeps the full
        history so you can compare iterations.
      </p>
      <div style={{ textAlign: "left", display: "grid", gap: 8 }}>
        {[
          "Photorealistic shot of a leather work boot on a misty forest trail, golden hour, ad style",
          "Minimalist product shot of a perfume bottle on cracked marble, soft pink gradient backdrop",
          "Vibrant flat-lay of healthy breakfast bowls, top-down, bright natural light, lifestyle ad",
        ].map((ex) => (
          <div
            key={ex}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px dashed var(--border)",
              background: "var(--surface)",
              fontSize: 13,
              color: "var(--text-2)",
              fontStyle: "italic",
            }}
          >
            “{ex}”
          </div>
        ))}
      </div>
    </div>
  );
}

function TurnRow({ turn }: { turn: AdImageTurn }) {
  if (turn.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "80%",
            padding: "10px 14px",
            borderRadius: 12,
            background: "var(--brand)",
            color: "#fff",
            fontSize: 14,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {turn.prompt}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          maxWidth: "80%",
          padding: 8,
          borderRadius: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {turn.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={turn.imageUrl}
              alt="Generated ad"
              style={{
                display: "block",
                maxWidth: "100%",
                borderRadius: 8,
                width: 480,
                height: "auto",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: 6,
                padding: "8px 4px 0",
                fontSize: 12,
                color: "var(--text-3)",
                alignItems: "center",
              }}
            >
              <span style={{ flex: 1 }}>{new Date(turn.createdAt).toLocaleString("en-GB")}</span>
              <a
                href={turn.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: "var(--text-2)",
                  textDecoration: "none",
                  fontSize: 12,
                }}
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          </>
        ) : (
          <div style={{ padding: 12, color: "var(--text-3)", fontSize: 13 }}>No image returned</div>
        )}
      </div>
    </div>
  );
}
