"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Send, AlertCircle } from "lucide-react";

interface PortalMessage {
  id: string;
  authorType: "agency_user" | "portal_user";
  authorId: string;
  body: string;
  createdAt: string;
}

interface PortalThread {
  id: string;
  subject: string;
  status: string;
  lastMessageAt: string;
  messages: PortalMessage[];
}

interface PortalThreadsPanelProps {
  clientId: string;
}

/**
 * Bet B — agency-side portal inbox. Lists threads and lets agency users
 * reply inline. Portal-user UI lives separately under /portal.
 */
export function PortalThreadsPanel({ clientId }: PortalThreadsPanelProps) {
  const [threads, setThreads] = useState<PortalThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/portal/threads?clientId=${encodeURIComponent(clientId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { threads: PortalThread[] };
      })
      .then((json) => {
        setThreads(json.threads);
        setError(null);
        if (!activeId && json.threads.length > 0) setActiveId(json.threads[0].id);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadThread(id: string) {
    setActiveId(id);
    try {
      const res = await fetch(`/api/portal/threads/${id}`);
      if (!res.ok) return;
      const json = (await res.json()) as { thread: PortalThread };
      setThreads((prev) => prev.map((t) => (t.id === id ? json.thread : t)));
    } catch {
      // non-fatal
    }
  }

  async function sendReply() {
    if (!activeId || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/portal/threads/${activeId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReplyText("");
      await loadThread(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (loading && threads.length === 0) {
    return (
      <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
        <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
        Loading portal conversations…
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div style={{ padding: 16, border: "1px solid #fca5a5", background: "#fef2f2", borderRadius: 8, color: "#991b1b", display: "flex", gap: 8, alignItems: "center" }}>
        <AlertCircle style={{ width: 16, height: 16 }} />
        <span>Could not load portal threads: {error}</span>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div style={{ padding: 16, border: "1px dashed var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 8 }}>
        <MessageSquare style={{ width: 14, height: 14 }} />
        No portal conversations yet. The client can start one from their portal.
      </div>
    );
  }

  const active = threads.find((t) => t.id === activeId);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 12, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", minHeight: 360 }}>
      {/* Left: thread list */}
      <div style={{ borderRight: "1px solid var(--border)", overflowY: "auto", maxHeight: 480 }}>
        {threads.map((t) => {
          const isActive = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => loadThread(t.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                background: isActive ? "var(--bg-1, #f8fafc)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                cursor: "pointer",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t.subject}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                {new Date(t.lastMessageAt).toLocaleDateString("en-GB")} · {t.status}
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: messages + reply */}
      <div style={{ display: "flex", flexDirection: "column", maxHeight: 480 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {active?.messages?.map((m) => {
            const fromAgency = m.authorType === "agency_user";
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: fromAgency ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: fromAgency ? "#dbeafe" : "var(--bg-1, #f1f5f9)",
                  color: "var(--text)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: fromAgency ? "#1d4ed8" : "var(--text-3)", marginBottom: 4 }}>
                  {fromAgency ? "Agency" : "Client"} · {new Date(m.createdAt).toLocaleString("en-GB")}
                </div>
                {m.body}
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        <div style={{ padding: 10, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendReply(); } }}
            placeholder="Reply to client…"
            disabled={!activeId || sending}
            style={{
              flex: 1,
              padding: "8px 10px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              background: "var(--bg)",
              color: "var(--text)",
            }}
          />
          <button
            type="button"
            onClick={sendReply}
            disabled={!activeId || sending || !replyText.trim()}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
              background: "#1d4ed8",
              color: "white",
              fontWeight: 600,
              fontSize: 12,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: !activeId || !replyText.trim() ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {sending ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 12, height: 12 }} />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
