"use client";

import { useState, useEffect, useCallback } from "react";
import { LayoutGrid, Plus, DollarSign, Eye, Clock, CheckCircle, XCircle } from "lucide-react";

interface Proposal {
  id: string;
  title: string;
  clientName: string;
  website: string;
  pipelineStage: string;
  pipelineNotes: string | null;
  expectedValue: number | null;
  closeDate: string | null;
  lostReason: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STAGES = [
  { id: "prospect", label: "Prospect", color: "#6366f1" },
  { id: "sent", label: "Sent", color: "#3b82f6" },
  { id: "viewed", label: "Viewed", color: "#f59e0b" },
  { id: "negotiating", label: "Negotiating", color: "#f97316" },
  { id: "won", label: "Won", color: "#22c55e" },
  { id: "lost", label: "Lost", color: "#9ca3af" },
];

function formatCurrency(v: number | null) {
  if (!v) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PipelinePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editClose, setEditClose] = useState("");
  const [editLost, setEditLost] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/proposals");
      if (res.ok) {
        const data = await res.json() as { proposals: Proposal[] };
        setProposals(data.proposals ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function moveStage(id: string, stage: string) {
    await fetch(`/api/tools/proposals/${id}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: stage }),
    });
    await load();
  }

  async function saveSidebar() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/tools/proposals/${selected.id}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipelineNotes: editNotes || null,
        expectedValue: editValue ? parseFloat(editValue) : null,
        closeDate: editClose || null,
        lostReason: editLost || null,
      }),
    });
    setSaving(false);
    await load();
    setSelected(null);
  }

  function openSidebar(p: Proposal) {
    setSelected(p);
    setEditNotes(p.pipelineNotes ?? "");
    setEditValue(p.expectedValue != null ? String(p.expectedValue) : "");
    setEditClose(p.closeDate ?? "");
    setEditLost(p.lostReason ?? "");
  }

  const totalPipeline = proposals
    .filter((p) => !["won", "lost"].includes(p.pipelineStage))
    .reduce((s, p) => s + (p.expectedValue ?? 0), 0);
  const wonValue = proposals
    .filter((p) => p.pipelineStage === "won")
    .reduce((s, p) => s + (p.expectedValue ?? 0), 0);

  return (
    <div style={{ padding: "40px 48px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LayoutGrid style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Proposal Pipeline</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Drag proposals through sales stages to track your pipeline</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Pipeline Value</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#6366f1" }}>{formatCurrency(totalPipeline) ?? "£0"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Won This Period</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#22c55e" }}>{formatCurrency(wonValue) ?? "£0"}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading pipeline…</div>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
          {STAGES.map((stage) => {
            const cards = proposals.filter((p) => (p.pipelineStage ?? "prospect") === stage.id);
            const stageValue = cards.reduce((s, p) => s + (p.expectedValue ?? 0), 0);
            return (
              <div key={stage.id} style={{ minWidth: 220, maxWidth: 260, flex: "0 0 240px" }}>
                <div style={{ padding: "8px 12px", borderRadius: "var(--r-sm) var(--r-sm) 0 0", background: `${stage.color}15`, borderBottom: `2px solid ${stage.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{cards.length}</span>
                  </div>
                  {stageValue > 0 && (
                    <p style={{ fontSize: 11, color: stage.color, marginTop: 2 }}>{formatCurrency(stageValue)}</p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0", minHeight: 80 }}>
                  {cards.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => openSidebar(p)}
                      style={{
                        background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)",
                        padding: "10px 12px", cursor: "pointer",
                        transition: "box-shadow 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, lineHeight: 1.3 }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{p.clientName}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {p.expectedValue != null && (
                          <span style={{ fontSize: 11, color: "#22c55e", display: "flex", alignItems: "center", gap: 2 }}>
                            <DollarSign style={{ width: 10, height: 10 }} />{formatCurrency(p.expectedValue)}
                          </span>
                        )}
                        {p.viewCount > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 2 }}>
                            <Eye style={{ width: 10, height: 10 }} />{p.viewCount}
                          </span>
                        )}
                      </div>
                      {p.closeDate && (
                        <p style={{ fontSize: 10, color: "var(--text-4)", marginTop: 4, display: "flex", alignItems: "center", gap: 2 }}>
                          <Clock style={{ width: 9, height: 9 }} />Close: {new Date(p.closeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                        {STAGES.filter((s) => s.id !== stage.id).slice(0, 3).map((s) => (
                          <button
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); void moveStage(p.id, s.id); }}
                            style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: `${s.color}15`, color: s.color, border: "none", cursor: "pointer" }}
                          >
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div style={{ padding: 12, textAlign: "center", color: "var(--text-4)", fontSize: 12, border: "1px dashed var(--border)", borderRadius: "var(--r-sm)" }}>
                      No proposals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sidebar detail panel */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.3)" }} onClick={() => setSelected(null)} />
          <div style={{ width: 380, background: "var(--card)", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", overflowY: "auto", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{selected.title}</h2>
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>{selected.clientName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                <XCircle style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { void moveStage(selected.id, s.id); setSelected({ ...selected, pipelineStage: s.id }); }}
                  style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 99, border: "none", cursor: "pointer",
                    background: selected.pipelineStage === s.id ? s.color : `${s.color}15`,
                    color: selected.pipelineStage === s.id ? "white" : s.color,
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Expected Value (£)</label>
                <input
                  type="number" min="0" step="100"
                  value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  className="form-input" style={{ fontSize: 13 }}
                  placeholder="e.g. 5000"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Expected Close Date</label>
                <input type="date" value={editClose} onChange={(e) => setEditClose(e.target.value)} className="form-input" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Notes</label>
                <textarea
                  value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                  className="form-input" rows={4} style={{ fontSize: 13, resize: "vertical" }}
                  placeholder="Add pipeline notes…"
                />
              </div>
              {selected.pipelineStage === "lost" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Lost Reason</label>
                  <input
                    type="text" value={editLost} onChange={(e) => setEditLost(e.target.value)}
                    className="form-input" style={{ fontSize: 13 }}
                    placeholder="Why was this lost?"
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveSidebar} disabled={saving} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle style={{ width: 13, height: 13 }} />
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setSelected(null)} className="btn btn-secondary btn-sm">Cancel</button>
              </div>
              {(selected.lastViewedAt || selected.viewCount > 0) && (
                <div style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", fontSize: 12 }}>
                  <p style={{ color: "var(--text-3)" }}><Eye style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />Viewed {selected.viewCount} time{selected.viewCount !== 1 ? "s" : ""}{selected.lastViewedAt ? ` · last ${timeAgo(selected.lastViewedAt)}` : ""}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && proposals.length === 0 && (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <LayoutGrid style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>No proposals in pipeline</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>Create proposals from the Keyword Planner — they will appear here automatically.</p>
          <a href="/tools/keyword-planner" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20 }}>
            <Plus style={{ width: 14, height: 14 }} /> Create Proposal
          </a>
        </div>
      )}
    </div>
  );
}
