"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Brain, Plus, Trash2, Edit2, Check, X, Download, ChevronDown, ChevronRight, Send, Loader2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type TextBlock = { type: "text"; text: string; citations: { title: string; url: string }[] };
type ReasoningBlock = { type: "reasoning"; summary: string };
type ImageBlock = { type: "image"; url: string };
type CodeBlock = { type: "code_output"; text: string };
type ContentBlock = TextBlock | ReasoningBlock | ImageBlock | CodeBlock;

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
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-3)] text-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-left hover:bg-black/5 transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="font-medium">Thinking…</span>
      </button>
      {open && (
        <div className="px-3 pb-3 whitespace-pre-wrap text-xs leading-relaxed border-t border-[var(--border)]">
          {block.summary}
        </div>
      )}
    </div>
  );
}

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div>
      <p className="whitespace-pre-wrap leading-relaxed">{block.text}</p>
      {block.citations.length > 0 && (
        <div className="mt-2 space-y-0.5 text-xs text-[var(--text-3)]">
          {block.citations.map((c, i) => (
            <div key={i}>
              <span className="font-medium">[{i + 1}]</span>{" "}
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text)]">
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
      <img src={block.url} alt="Generated" className="rounded-lg max-w-full max-h-[600px] object-contain border border-[var(--border)]" />
      <a
        href={block.url}
        download
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
      >
        <Download className="h-3.5 w-3.5" /> Download image
      </a>
    </div>
  );
}

function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <pre className="rounded bg-[var(--surface)] border border-[var(--border)] p-3 text-xs overflow-x-auto font-mono whitespace-pre-wrap">
      <code>{block.text}</code>
    </pre>
  );
}

function AssistantBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "reasoning") return <ReasoningBlockView key={i} block={block} />;
        if (block.type === "text") return <TextBlockView key={i} block={block} />;
        if (block.type === "image") return <ImageBlockView key={i} block={block} />;
        if (block.type === "code_output") return <CodeBlockView key={i} block={block} />;
        return null;
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions list
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/tools/ad-image-generator");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Load session detail
  async function openSession(id: string) {
    try {
      const res = await fetch(`/api/tools/ad-image-generator?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data);
        setError("");
      }
    } catch {
      setError("Failed to load session.");
    }
  }

  // New chat
  async function newChat() {
    setActiveSession(null);
    setPrompt("");
    setError("");
  }

  // Send message
  async function send() {
    const text = prompt.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setError("");
    setPrompt("");

    // Optimistically append user turn
    const userTurn: ChatTurn = {
      role: "user",
      blocks: [{ type: "text", text, citations: [] }],
      createdAt: new Date().toISOString(),
    };
    if (activeSession) {
      setActiveSession(s => s ? { ...s, messages: [...s.messages, userTurn] } : s);
    }

    try {
      const res = await fetch("/api/tools/ad-image-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession?.id ?? null,
          message: text,
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
      // Remove optimistic user turn on failure
      if (activeSession) {
        setActiveSession(s => s ? { ...s, messages: s.messages.slice(0, -1) } : s);
      }
    } finally {
      setSubmitting(false);
      textareaRef.current?.focus();
    }
  }

  // Delete session
  async function deleteSession(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/tools/ad-image-generator?id=${id}`, { method: "DELETE" });
    if (activeSession?.id === id) setActiveSession(null);
    await loadSessions();
  }

  // Rename session
  async function submitRename(id: string) {
    if (!renameValue.trim()) return;
    await fetch("/api/tools/ad-image-generator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: renameValue.trim() }),
    });
    setRenameId(null);
    await loadSessions();
    if (activeSession?.id === id) {
      setActiveSession(s => s ? { ...s, title: renameValue.trim() } : s);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--brand)] text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> New conversation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-[var(--text-3)] px-2 py-4 text-center">No conversations yet</p>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors ${
                activeSession?.id === s.id
                  ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                  : "hover:bg-black/5 text-[var(--text)]"
              }`}
            >
              {s.currentImageUrl ? (
                <img src={s.currentImageUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0 border border-[var(--border)]" />
              ) : (
                <div className="h-8 w-8 rounded bg-[var(--border)] shrink-0 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-[var(--text-3)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {renameId === s.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") submitRename(s.id);
                      if (e.key === "Escape") setRenameId(null);
                      e.stopPropagation();
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-full text-xs bg-transparent border-b border-[var(--brand)] outline-none"
                  />
                ) : (
                  <p className="text-xs font-medium truncate">{s.title}</p>
                )}
                <p className="text-xs text-[var(--text-3)]">
                  {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
              {renameId === s.id ? (
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => submitRename(s.id)} className="p-0.5 hover:text-green-600"><Check className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setRenameId(null)} className="p-0.5 hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <div className="hidden group-hover:flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setRenameId(s.id); setRenameValue(s.title); }} className="p-0.5 hover:text-[var(--brand)] text-[var(--text-3)]"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteSession(s.id)} className="p-0.5 hover:text-red-600 text-[var(--text-3)]"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[var(--border)] flex items-center gap-3">
          <Brain className="h-5 w-5 text-[var(--brand)]" />
          <div>
            <h1 className="text-base font-semibold text-[var(--text)]">
              {activeSession?.title ?? "AI Assistant"}
            </h1>
            <p className="text-xs text-[var(--text-3)]">Web search · Image generation · Code interpreter</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {!activeSession && !submitting && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-[var(--text-3)]">
              <Brain className="h-12 w-12 opacity-20" />
              <div>
                <p className="font-medium text-[var(--text)]">Start a conversation</p>
                <p className="text-sm mt-1">Ask anything — search the web, generate images, write code.</p>
              </div>
            </div>
          )}

          {activeSession?.messages.map((turn, i) => (
            <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
              {turn.role === "user" ? (
                <div className="max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-[var(--brand)] text-white text-sm whitespace-pre-wrap">
                  {turn.blocks.map((b, j) => b.type === "text" ? b.text : "").join("")}
                </div>
              ) : (
                <div className="max-w-[80%] text-sm text-[var(--text)]">
                  <AssistantBlocks blocks={turn.blocks} />
                </div>
              )}
            </div>
          ))}

          {submitting && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-sm text-[var(--text-3)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Working… this can take 20–60 seconds
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 px-6 py-4 border-t border-[var(--border)]">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              placeholder="Message AI Assistant… (⌘↵ to send)"
              rows={3}
              className="flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={send}
              disabled={submitting || !prompt.trim()}
              className="shrink-0 h-10 w-10 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
