"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Brain, Plus, Trash2, Edit2, Check, X, Download,
  ChevronDown, ChevronRight, Send, Loader2, Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type TextBlock      = { type: "text";        text: string; citations: { title: string; url: string }[] };
type ReasoningBlock = { type: "reasoning";   summary: string };
type ImageBlock     = { type: "image";       url: string };
type CodeBlock      = { type: "code_output"; text: string };
type ContentBlock   = TextBlock | ReasoningBlock | ImageBlock | CodeBlock;

interface ChatTurn {
  role: "user" | "assistant";
  blocks: ContentBlock[];
  createdAt: string;
}

interface SessionSummary {
  id: string;
  title: string;
  currentImageUrl: string | null;
  updatedAt: string;
}

interface SessionDetail extends SessionSummary {
  messages: ChatTurn[];
  lastResponseId: string | null;
}

const SUGGESTIONS = [
  "Generate a Facebook ad image for a summer sale",
  "Research the best performing ad formats on Meta right now",
  "Write a Google Ads campaign brief for a local restaurant",
];

// ── Block renderers ────────────────────────────────────────────────────────

function ReasoningBlockView({ block }: { block: ReasoningBlock }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 10, border: "1px solid var(--border)", overflow: "hidden", fontSize: 13,
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "8px 12px",
          background: "none", border: "none", cursor: "pointer", color: "var(--text-3)",
          textAlign: "left",
        }}
      >
        {open
          ? <ChevronDown style={{ width: 13, height: 13, flexShrink: 0 }} />
          : <ChevronRight style={{ width: 13, height: 13, flexShrink: 0 }} />}
        <span style={{ fontStyle: "italic", fontSize: 12 }}>Thinking…</span>
      </button>
      {open && (
        <div style={{
          padding: "8px 12px", borderTop: "1px solid var(--border)",
          fontSize: 12, color: "var(--text-3)", whiteSpace: "pre-wrap", lineHeight: 1.6,
          background: "var(--border-subtle)",
        }}>
          {block.summary}
        </div>
      )}
    </div>
  );
}

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "var(--text)", whiteSpace: "pre-wrap" }}>
        {block.text}
      </p>
      {block.citations.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 3 }}>
          {block.citations.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--text-3)" }}>
              <span style={{ fontWeight: 600, color: "var(--accent-text)" }}>[{i + 1}]</span>{" "}
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                 style={{ color: "var(--accent)", textDecoration: "underline" }}>
                {c.title || c.url}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageBlockView({ block }: { block: ImageBlock }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <img
        src={block.url}
        alt="Generated"
        style={{ borderRadius: 12, maxWidth: "100%", maxHeight: 500, objectFit: "contain", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      />
      <a
        href={block.url}
        download
        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}
      >
        <Download style={{ width: 13, height: 13 }} /> Download
      </a>
    </div>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <pre style={{
      borderRadius: 10, background: "#1e1e2e", color: "#cdd6f4",
      padding: "12px 16px", fontSize: 12, overflowX: "auto",
      fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0,
    }}>
      <code>{block.text}</code>
    </pre>
  );
}

function AssistantMessage({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", maxWidth: "82%" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 2,
        background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Brain style={{ width: 15, height: 15, color: "white" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
        {blocks.map((block, i) => {
          if (block.type === "reasoning")   return <ReasoningBlockView key={i} block={block} />;
          if (block.type === "text")        return <TextBlockView key={i} block={block} />;
          if (block.type === "image")       return <ImageBlockView key={i} block={block} />;
          if (block.type === "code_output") return <CodeBlockView key={i} block={block} />;
          return null;
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [sessions, setSessions]           = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [input, setInput]                 = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [renameId, setRenameId]           = useState<string | null>(null);
  const [renameValue, setRenameValue]     = useState("");
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/ad-image-generator");
      if (res.ok) { const d = await res.json(); setSessions(d.sessions ?? []); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages?.length, submitting]);

  async function openSession(id: string) {
    try {
      const res = await fetch(`/api/tools/ad-image-generator?id=${id}`);
      if (res.ok) { setActiveSession(await res.json()); setError(""); }
    } catch { setError("Failed to load conversation."); }
  }

  function newChat() { setActiveSession(null); setInput(""); setError(""); }

  async function send() {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError("");
    setInput("");

    const userTurn: ChatTurn = {
      role: "user",
      blocks: [{ type: "text", text, citations: [] }],
      createdAt: new Date().toISOString(),
    };
    setActiveSession(s =>
      s
        ? { ...s, messages: [...s.messages, userTurn] }
        : { id: "__pending__", title: text.slice(0, 60), currentImageUrl: null,
            messages: [userTurn], lastResponseId: null, updatedAt: new Date().toISOString() }
    );

    try {
      const sessionId = activeSession?.id === "__pending__" ? undefined : (activeSession?.id ?? undefined);
      const res = await fetch("/api/tools/ad-image-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, input: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Request failed");
      }
      const data: SessionDetail = await res.json();
      setActiveSession(data);
      await loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setActiveSession(s => s ? { ...s, messages: s.messages.slice(0, -1) } : null);
    } finally {
      setSubmitting(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/tools/ad-image-generator?id=${id}`, { method: "DELETE" });
    if (activeSession?.id === id) setActiveSession(null);
    await loadSessions();
  }

  async function submitRename(id: string) {
    if (!renameValue.trim()) return;
    await fetch("/api/tools/ad-image-generator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: renameValue.trim() }),
    });
    setRenameId(null);
    await loadSessions();
    if (activeSession?.id === id) setActiveSession(s => s ? { ...s, title: renameValue.trim() } : s);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); send(); }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden", background: "var(--bg)" }}>

      {/* ── Session sidebar ────────────────────────────────────────────── */}
      <aside style={{
        width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
        background: "var(--surface)", borderRight: "1px solid var(--border)",
      }}>
        {/* New chat button */}
        <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={newChat}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 7, padding: "9px 16px", borderRadius: "var(--r)", border: "none",
              background: "var(--gradient-accent)", color: "white", fontWeight: 600,
              fontSize: 13, cursor: "pointer",
            }}
          >
            <Plus style={{ width: 15, height: 15 }} /> New conversation
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {sessions.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", padding: "24px 0" }}>
              No conversations yet
            </p>
          )}
          {sessions.map(s => {
            const active = activeSession?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => openSession(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: "var(--r-sm)", cursor: "pointer",
                  background: active ? "var(--accent-bg)" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--border-subtle)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                className="group"
              >
                {s.currentImageUrl
                  ? <img src={s.currentImageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Brain style={{ width: 17, height: 17, color: "var(--accent)" }} />
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renameId === s.id
                    ? <input
                        autoFocus value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") submitRename(s.id); if (e.key === "Escape") setRenameId(null); e.stopPropagation(); }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: "100%", fontSize: 12, background: "transparent", border: "none", borderBottom: "1px solid var(--accent)", outline: "none", color: "var(--text)" }}
                      />
                    : <p style={{ fontSize: 12, fontWeight: 500, color: active ? "var(--accent-text)" : "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.title}
                      </p>
                  }
                  <p style={{ fontSize: 11, color: "var(--text-3)", margin: "2px 0 0" }}>
                    {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                {renameId === s.id
                  ? <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => submitRename(s.id)} style={{ padding: 3, background: "none", border: "none", cursor: "pointer", color: "var(--success)" }}><Check style={{ width: 13, height: 13 }} /></button>
                      <button onClick={() => setRenameId(null)} style={{ padding: 3, background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}><X style={{ width: 13, height: 13 }} /></button>
                    </div>
                  : <div style={{ display: "flex", gap: 1, flexShrink: 0, opacity: 0 }} className="session-actions" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setRenameId(s.id); setRenameValue(s.title); }}
                        style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", borderRadius: 5 }}
                        title="Rename"
                      ><Edit2 style={{ width: 12, height: 12 }} /></button>
                      <button
                        onClick={() => deleteSession(s.id)}
                        style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", borderRadius: 5 }}
                        title="Delete"
                      ><Trash2 style={{ width: 12, height: 12 }} /></button>
                    </div>
                }
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          flexShrink: 0, padding: "14px 24px", background: "var(--surface)",
          borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Brain style={{ width: 18, height: 18, color: "white" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeSession?.title ?? "AI Assistant"}
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)" }}>
              Web search · Image generation · Code interpreter
            </p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Empty state */}
          {!activeSession && !submitting && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-glow)" }}>
                <Sparkles style={{ width: 30, height: 30, color: "white" }} />
              </div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>How can I help today?</p>
                <p style={{ fontSize: 14, color: "var(--text-3)", margin: 0 }}>Search the web, generate images, write and run code.</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, maxWidth: 480 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                    style={{
                      padding: "8px 14px", borderRadius: 20, border: "1px solid var(--border)",
                      background: "var(--surface)", color: "var(--text-2)", fontSize: 13, cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message turns */}
          {activeSession?.messages.map((turn, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: turn.role === "user" ? "flex-end" : "flex-start" }}
            >
              {turn.role === "user"
                ? <div style={{
                    maxWidth: "70%", borderRadius: "16px 16px 4px 16px",
                    padding: "10px 16px", background: "var(--gradient-accent)",
                    color: "white", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
                  }}>
                    {turn.blocks.map((b, j) => b.type === "text" ? <span key={j}>{b.text}</span> : null)}
                  </div>
                : <AssistantMessage blocks={turn.blocks} />
              }
            </div>
          ))}

          {/* Loading */}
          {submitting && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Loader2 style={{ width: 15, height: 15, color: "white", animation: "spin 1s linear infinite" }} />
              </div>
              <span style={{ fontSize: 13, color: "var(--text-3)", fontStyle: "italic" }}>
                Working… this may take 20–60 seconds
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 16px", borderRadius: "var(--r)", fontSize: 13,
              background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)",
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div style={{ flexShrink: 0, padding: "12px 24px 16px", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            border: "1px solid var(--border)", borderRadius: "var(--r)",
            background: "var(--bg)", padding: "10px 12px",
            boxShadow: "var(--shadow-xs)",
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              placeholder="Message AI Assistant… (⌘↵ to send)"
              rows={2}
              style={{
                flex: 1, resize: "none", background: "transparent", border: "none", outline: "none",
                fontSize: 14, color: "var(--text)", fontFamily: "inherit", lineHeight: 1.6,
                opacity: submitting ? 0.5 : 1,
              }}
            />
            <button
              onClick={send}
              disabled={submitting || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: "var(--r-sm)", flexShrink: 0,
                background: (!submitting && input.trim()) ? "var(--gradient-accent)" : "var(--border)",
                border: "none", cursor: (!submitting && input.trim()) ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
              }}
            >
              {submitting
                ? <Loader2 style={{ width: 15, height: 15, color: "white", animation: "spin 1s linear infinite" }} />
                : <Send style={{ width: 15, height: 15, color: (!submitting && input.trim()) ? "white" : "var(--text-3)" }} />
              }
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 6, marginBottom: 0 }}>
            AI can make mistakes. Always review important information.
          </p>
        </div>

      </div>

      <style>{`
        .session-actions { opacity: 0; }
        [class~="group"]:hover .session-actions { opacity: 1; }
      `}</style>
    </div>
  );
}
