"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Brain, Plus, Trash2, Edit2, Check, X, Download,
  ChevronDown, ChevronRight, Send, Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type TextBlock     = { type: "text";        text: string; citations: { title: string; url: string }[] };
type ReasoningBlock= { type: "reasoning";   summary: string };
type ImageBlock    = { type: "image";       url: string };
type CodeBlock     = { type: "code_output"; text: string };
type ContentBlock  = TextBlock | ReasoningBlock | ImageBlock | CodeBlock;

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

// ── Block renderers ────────────────────────────────────────────────────────

function ReasoningBlockView({ block }: { block: ReasoningBlock }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden text-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--border-subtle)] transition-colors"
      >
        {open
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="font-medium italic">Thinking…</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 text-xs text-[var(--text-3)] whitespace-pre-wrap leading-relaxed border-t border-[var(--border)]">
          {block.summary}
        </div>
      )}
    </div>
  );
}

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">{block.text}</p>
      {block.citations.length > 0 && (
        <div className="space-y-0.5 pt-1 border-t border-[var(--border)]">
          {block.citations.map((c, i) => (
            <div key={i} className="text-xs text-[var(--text-3)]">
              <span className="font-semibold text-[var(--accent-text)]">[{i + 1}]</span>{" "}
              <a href={c.url} target="_blank" rel="noopener noreferrer"
                 className="underline underline-offset-2 hover:text-[var(--text-2)]">
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
    <div className="space-y-2">
      <img
        src={block.url}
        alt="Generated"
        className="rounded-xl max-w-full max-h-[520px] object-contain border border-[var(--border)] shadow-sm"
      />
      <a
        href={block.url}
        download
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </a>
    </div>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <pre className="rounded-xl bg-[#1e1e2e] text-[#cdd6f4] p-4 text-xs overflow-x-auto font-mono whitespace-pre-wrap leading-relaxed">
      <code>{block.text}</code>
    </pre>
  );
}

function AssistantMessage({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-3 max-w-[80%]">
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center"
             style={{ background: "var(--gradient-accent)" }}>
          <Brain className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          {blocks.map((block, i) => {
            if (block.type === "reasoning")   return <ReasoningBlockView key={i} block={block} />;
            if (block.type === "text")        return <TextBlockView key={i} block={block} />;
            if (block.type === "image")       return <ImageBlockView key={i} block={block} />;
            if (block.type === "code_output") return <CodeBlockView key={i} block={block} />;
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [sessions, setSessions]         = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [input, setInput]               = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [renameId, setRenameId]         = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState("");
  const bottomRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/ad-image-generator");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages?.length]);

  async function openSession(id: string) {
    try {
      const res = await fetch(`/api/tools/ad-image-generator?id=${id}`);
      if (res.ok) { setActiveSession(await res.json()); setError(""); }
    } catch { setError("Failed to load conversation."); }
  }

  function newChat() {
    setActiveSession(null);
    setInput("");
    setError("");
  }

  async function send() {
    const text = input.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError("");
    setInput("");

    // Optimistically append user turn
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
      const res = await fetch("/api/tools/ad-image-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession?.id === "__pending__" ? undefined : (activeSession?.id ?? undefined),
          input: text,
        }),
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[var(--bg)]">

      {/* ── Sidebar ── */}
      <aside className="w-72 shrink-0 flex flex-col bg-[var(--surface)] border-r border-[var(--border)]">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 rounded-[var(--r)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Plus className="h-4 w-4" /> New conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {sessions.length === 0 && (
            <p className="text-xs text-[var(--text-3)] text-center py-6">No conversations yet</p>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`group flex items-center gap-2.5 rounded-[var(--r-sm)] px-2.5 py-2 cursor-pointer transition-colors ${
                activeSession?.id === s.id
                  ? "bg-[var(--accent-bg)] text-[var(--accent-text)]"
                  : "hover:bg-[var(--border-subtle)] text-[var(--text)]"
              }`}
            >
              {s.currentImageUrl
                ? <img src={s.currentImageUrl} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0 border border-[var(--border)]" />
                : <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center bg-[var(--accent-bg)]">
                    <Brain className="h-4 w-4 text-[var(--accent)]" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                {renameId === s.id
                  ? <input
                      autoFocus
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") submitRename(s.id); if (e.key === "Escape") setRenameId(null); e.stopPropagation(); }}
                      onClick={e => e.stopPropagation()}
                      className="w-full text-xs bg-transparent border-b border-[var(--accent)] outline-none"
                    />
                  : <p className="text-xs font-medium truncate leading-snug">{s.title}</p>
                }
                <p className="text-[11px] text-[var(--text-3)] mt-0.5">
                  {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
              {renameId === s.id
                ? <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => submitRename(s.id)} className="p-0.5 text-[var(--success)] hover:opacity-80"><Check className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setRenameId(null)} className="p-0.5 text-[var(--danger)] hover:opacity-80"><X className="h-3.5 w-3.5" /></button>
                  </div>
                : <div className="hidden group-hover:flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setRenameId(s.id); setRenameValue(s.title); }}
                            className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]"><Edit2 className="h-3 w-3" /></button>
                    <button onClick={() => deleteSession(s.id)}
                            className="p-1 rounded hover:bg-[var(--danger-bg)] text-[var(--text-3)] hover:text-[var(--danger)]"><Trash2 className="h-3 w-3" /></button>
                  </div>
              }
            </div>
          ))}
        </div>
      </aside>

      {/* ── Chat ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 py-3.5 bg-[var(--surface)] border-b border-[var(--border)] flex items-center gap-3">
          <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
               style={{ background: "var(--gradient-accent)" }}>
            <Brain className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text)] truncate">
              {activeSession?.title ?? "AI Assistant"}
            </h1>
            <p className="text-xs text-[var(--text-3)]">Web search · Image generation · Code interpreter</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!activeSession && !submitting && (
            <div className="h-full flex flex-col items-center justify-center gap-5 text-center">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-[var(--shadow-glow)]"
                   style={{ background: "var(--gradient-accent)" }}>
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="font-semibold text-[var(--text)] text-base">How can I help today?</p>
                <p className="text-sm text-[var(--text-3)] mt-1">
                  Search the web, generate images, write and run code.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {["Generate an ad image for…", "Research competitors for…", "Write a campaign brief for…"].map(hint => (
                  <button
                    key={hint}
                    onClick={() => { setInput(hint); textareaRef.current?.focus(); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSession?.messages.map((turn, i) => (
            <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
              {turn.role === "user" ? (
                <div
                  className="max-w-[70%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-white"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  {turn.blocks.map((b, j) => b.type === "text" ? <span key={j}>{b.text}</span> : null)}
                </div>
              ) : (
                <AssistantMessage blocks={turn.blocks} />
              )}
            </div>
          ))}

          {submitting && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 text-sm text-[var(--text-3)]">
                <div className="h-7 w-7 rounded-full flex items-center justify-center"
                     style={{ background: "var(--gradient-accent)" }}>
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                </div>
                <span className="italic">Working… this may take 20–60 seconds</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-[var(--r)] bg-[var(--danger-bg)] border border-[var(--danger-border)] text-[var(--danger)] px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-4">
          <div className="relative flex items-end gap-2 rounded-[var(--r)] border border-[var(--border)] bg-[var(--bg)] px-4 py-3 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15 transition-all shadow-[var(--shadow-xs)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              placeholder="Message AI Assistant… (⌘↵ to send)"
              rows={2}
              className="flex-1 resize-none bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] outline-none disabled:opacity-50 leading-relaxed"
            />
            <button
              onClick={send}
              disabled={submitting || !input.trim()}
              className="shrink-0 h-8 w-8 rounded-[var(--r-sm)] flex items-center justify-center text-white transition-opacity disabled:opacity-30 hover:opacity-90"
              style={{ background: "var(--gradient-accent)" }}
            >
              {submitting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-3)] mt-1.5 text-center">
            AI can make mistakes. Always review important information.
          </p>
        </div>

      </div>
    </div>
  );
}
