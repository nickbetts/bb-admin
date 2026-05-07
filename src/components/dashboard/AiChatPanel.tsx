"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, Send, X, Loader2, Sparkles, Trash2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface AiChatPanelProps {
  clientId: string;
  clientName: string;
}

const SUGGESTED_PROMPTS = [
  "How is this client performing overall?",
  "What are the biggest areas of concern?",
  "Which channel is delivering the best ROI?",
  "Write a brief performance summary for the client.",
  "What should we focus on next month?",
];

const MODEL_OPTIONS = [
  { value: "gpt-5.4-nano", label: "GPT-5.4 nano" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
] as const;
type ModelValue = typeof MODEL_OPTIONS[number]["value"];
const MODEL_STORAGE_KEY = "ai-chat-model";

export function AiChatPanel({ clientId, clientName }: AiChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [model, setModel] = useState<ModelValue>("gpt-5.4-nano");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(MODEL_STORAGE_KEY) : null;
    if (saved && MODEL_OPTIONS.some((m) => m.value === saved)) {
      setModel(saved as ModelValue);
    }
  }, []);

  const handleModelChange = (value: ModelValue) => {
    setModel(value);
    if (typeof window !== "undefined") window.localStorage.setItem(MODEL_STORAGE_KEY, value);
  };

  // Load conversation history
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      fetch(`/api/ai/chat?clientId=${clientId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.messages?.length) {
            setMessages(data.messages.map((m: Message) => ({ role: m.role, content: m.content })));
          }
          setHistoryLoaded(true);
        })
        .catch(() => setHistoryLoaded(true));
    }
  }, [isOpen, clientId, historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          message: text.trim(),
          conversationHistory: messages.slice(-10),
          model,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please check your network and try again." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [clientId, loading, messages, model]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--gradient-accent)",
            color: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
            zIndex: 1000,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          title="Ask the Data"
        >
          <MessageCircle style={{ width: 24, height: 24 }} />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 420,
            maxWidth: "calc(100vw - 48px)",
            height: 560,
            maxHeight: "calc(100vh - 100px)",
            borderRadius: 16,
            background: "var(--card-bg, #fff)",
            border: "1px solid var(--border, #e5e7eb)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              background: "var(--gradient-accent)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <Sparkles style={{ width: 20, height: 20, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Ask the Data</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.9 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientName}</span>
                  <span style={{ opacity: 0.6 }}>·</span>
                  <select
                    value={model}
                    onChange={(e) => handleModelChange(e.target.value as ModelValue)}
                    title="Model"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: 6,
                      padding: "2px 6px",
                      fontSize: 11,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} style={{ color: "#1a1a1a" }}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setMessages([]); setHistoryLoaded(false); }}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px", cursor: "pointer", color: "white" }}
                title="Clear chat"
              >
                <Trash2 style={{ width: 16, height: 16 }} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px", cursor: "pointer", color: "white" }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Sparkles style={{ width: 32, height: 32, color: "var(--accent)", margin: "0 auto 12px" }} />
                <p style={{ fontWeight: 600, color: "var(--text-1, #1a1a1a)", margin: "0 0 8px" }}>
                  Ask anything about {clientName}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-3, #999)", margin: "0 0 20px" }}>
                  I can analyse performance, explain trends, and suggest next steps.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid var(--border, #e5e7eb)",
                        background: "var(--bg-2, #f9fafb)",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "var(--text-2, #444)",
                        textAlign: "left",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-3, #f3f4f6)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-2, #f9fafb)"; }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: msg.role === "user"
                    ? "var(--gradient-accent)"
                    : "var(--bg-2, #f3f4f6)",
                  color: msg.role === "user" ? "white" : "var(--text-1, #1a1a1a)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-3, #999)", fontSize: 13 }}>
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                Analysing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border, #e5e7eb)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about performance, trends, recommendations..."
                rows={1}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--border, #e5e7eb)",
                  background: "var(--bg-2, #f9fafb)",
                  resize: "none",
                  fontSize: 14,
                  fontFamily: "inherit",
                  outline: "none",
                  minHeight: 42,
                  maxHeight: 120,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: input.trim() ? "var(--gradient-accent)" : "var(--bg-3, #e5e7eb)",
                  color: "white",
                  border: "none",
                  cursor: input.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Send style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
