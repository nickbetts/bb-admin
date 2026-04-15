"use client";

import { useState, useEffect, useCallback } from "react";
import { LayoutGrid, Plus, DollarSign, Eye, Clock, CheckCircle, XCircle, User, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkedProposal {
  id: string;
  title: string;
  expectedValue: number | null;
  closeDate: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  pipelineStage: string;
  pipelineNotes: string | null;
}

interface PipelineClient {
  type: "client";
  id: string;
  name: string;
  slug: string;
  website: string | null;
  status: string;
  proposals: LinkedProposal[];
}

interface OrphanProposal {
  type: "proposal";
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

type PipelineItem = PipelineClient | OrphanProposal;

// ─── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { id: "lead",          label: "Lead",          color: "#d97706" },
  { id: "qualifying",    label: "Qualifying",     color: "#f59e0b" },
  { id: "proposal_sent", label: "Proposal Sent",  color: "#3b82f6" },
  { id: "negotiating",   label: "Negotiating",    color: "#f97316" },
  { id: "won",           label: "Won",            color: "#16a34a" },
  { id: "lost",          label: "Lost",           color: "#64748b" },
] as const;

type StageId = typeof STAGES[number]["id"];

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function clientStatusToColumn(status: string): StageId {
  const map: Record<string, StageId> = {
    lead: "lead", qualifying: "qualifying", proposal_sent: "proposal_sent",
    negotiating: "negotiating", active: "won", lost: "lost", churned: "lost",
  };
  return map[status] ?? "lead";
}

function columnToClientStatus(col: StageId): string {
  const map: Record<StageId, string> = {
    lead: "lead", qualifying: "qualifying", proposal_sent: "proposal_sent",
    negotiating: "negotiating", won: "active", lost: "lost",
  };
  return map[col];
}

function proposalStageToColumn(stage: string): StageId {
  const map: Record<string, StageId> = {
    prospect: "lead", sent: "proposal_sent", viewed: "proposal_sent",
    negotiating: "negotiating", won: "won", lost: "lost",
  };
  return map[stage] ?? "lead";
}

function columnToProposalStage(col: StageId): string {
  const map: Record<StageId, string> = {
    lead: "prospect", qualifying: "prospect", proposal_sent: "sent",
    negotiating: "negotiating", won: "won", lost: "lost",
  };
  return map[col];
}

function getItemColumn(item: PipelineItem): StageId {
  return item.type === "client"
    ? clientStatusToColumn(item.status)
    : proposalStageToColumn(item.pipelineStage);
}

function getItemValue(item: PipelineItem): number {
  if (item.type === "client") return item.proposals.reduce((s, p) => s + (p.expectedValue ?? 0), 0);
  return item.expectedValue ?? 0;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(v: number | null): string | null {
  if (!v) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Card components ──────────────────────────────────────────────────────────

function ClientCard({ client, stageColor, allStages, onOpen, onMove }: {
  client: PipelineClient;
  stageColor: string;
  allStages: typeof STAGES;
  onOpen: () => void;
  onMove: (col: StageId) => void;
}) {
  const totalValue = client.proposals.reduce((s, p) => s + (p.expectedValue ?? 0), 0);
  const col = clientStatusToColumn(client.status);
  return (
    <div
      onClick={onOpen}
      style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderLeft: `3px solid ${stageColor}`, borderRadius: "var(--r-sm)",
        padding: "10px 12px", cursor: "pointer", transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 3 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{client.name}</p>
        <User style={{ width: 11, height: 11, color: "var(--text-4)", flexShrink: 0, marginTop: 2 }} />
      </div>
      {client.website && (
        <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {client.website.replace(/^https?:\/\//, "")}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {totalValue > 0 && (
          <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 2 }}>
            <DollarSign style={{ width: 10, height: 10 }} />{formatCurrency(totalValue)}
          </span>
        )}
        {client.proposals.length > 0 && (
          <span style={{ fontSize: 10, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 2 }}>
            <FileText style={{ width: 10, height: 10 }} />{client.proposals.length}
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        {allStages.filter((s) => s.id !== col).slice(0, 3).map((s) => (
          <button
            key={s.id}
            onClick={(e) => { e.stopPropagation(); onMove(s.id); }}
            style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: `${s.color}15`, color: s.color, border: "none", cursor: "pointer" }}
          >
            → {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProposalCard({ proposal, stageColor, allStages, onOpen, onMove }: {
  proposal: OrphanProposal;
  stageColor: string;
  allStages: typeof STAGES;
  onOpen: () => void;
  onMove: (col: StageId) => void;
}) {
  const col = proposalStageToColumn(proposal.pipelineStage);
  return (
    <div
      onClick={onOpen}
      style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--r-sm)", padding: "10px 12px", cursor: "pointer", transition: "box-shadow 0.15s",
        opacity: 0.92,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 3 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{proposal.title}</p>
        <FileText style={{ width: 11, height: 11, color: "var(--text-4)", flexShrink: 0, marginTop: 2 }} />
      </div>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>{proposal.clientName}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {proposal.expectedValue != null && (
          <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 2 }}>
            <DollarSign style={{ width: 10, height: 10 }} />{formatCurrency(proposal.expectedValue)}
          </span>
        )}
        {proposal.viewCount > 0 && (
          <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 2 }}>
            <Eye style={{ width: 10, height: 10 }} />{proposal.viewCount}
          </span>
        )}
      </div>
      {proposal.closeDate && (
        <p style={{ fontSize: 10, color: "var(--text-4)", marginTop: 4, display: "flex", alignItems: "center", gap: 2 }}>
          <Clock style={{ width: 9, height: 9 }} />Close: {new Date(proposal.closeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </p>
      )}
      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        {allStages.filter((s) => s.id !== col).slice(0, 3).map((s) => (
          <button
            key={s.id}
            onClick={(e) => { e.stopPropagation(); onMove(s.id); }}
            style={{ fontSize: 9, padding: "2px 6px", borderRadius: 99, background: `${s.color}15`, color: s.color, border: "none", cursor: "pointer" }}
          >
            → {s.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 9, color: stageColor, marginTop: 6, opacity: 0.7 }}>Unlinked proposal</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PipelineItem | null>(null);

  // Sidebar edit state (for orphan proposals only)
  const [editNotes, setEditNotes] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editClose, setEditClose] = useState("");
  const [editLost, setEditLost] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/pipeline");
      if (res.ok) {
        const data = await res.json() as {
          clients: Omit<PipelineClient, "type">[];
          orphanProposals: Omit<OrphanProposal, "type">[];
        };
        const clientItems: PipelineClient[] = (data.clients ?? []).map(c => ({ ...c, type: "client" as const }));
        const proposalItems: OrphanProposal[] = (data.orphanProposals ?? []).map(p => ({ ...p, type: "proposal" as const }));
        setItems([...clientItems, ...proposalItems]);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function moveItem(item: PipelineItem, targetCol: StageId) {
    if (item.type === "client") {
      const newStatus = columnToClientStatus(targetCol);
      await fetch(`/api/clients/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } else {
      const newStage = columnToProposalStage(targetCol);
      await fetch(`/api/tools/proposals/${item.id}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });
    }
    await load();
  }

  async function saveSidebar() {
    if (!selected || selected.type !== "proposal") return;
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

  function openSidebar(item: PipelineItem) {
    setSelected(item);
    if (item.type === "proposal") {
      setEditNotes(item.pipelineNotes ?? "");
      setEditValue(item.expectedValue != null ? String(item.expectedValue) : "");
      setEditClose(item.closeDate ?? "");
      setEditLost(item.lostReason ?? "");
    }
  }

  // Stats
  const activeLeadCount = items.filter(
    item => item.type === "client" && ["lead", "qualifying", "proposal_sent", "negotiating"].includes((item as PipelineClient).status)
  ).length;
  const pipelineValue = items
    .filter(item => !["won", "lost"].includes(getItemColumn(item)))
    .reduce((s, item) => s + getItemValue(item), 0);
  const wonValue = items
    .filter(item => getItemColumn(item) === "won")
    .reduce((s, item) => s + getItemValue(item), 0);

  const itemColumn = selected ? getItemColumn(selected) : ("lead" as StageId);

  return (
    <div className="page" style={{ maxWidth: 1600 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LayoutGrid style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Sales Pipeline</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>All leads and proposals — every stage in one view</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Active Leads</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>{activeLeadCount}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Pipeline Value</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>{formatCurrency(pipelineValue) ?? "£0"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Won</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--success)" }}>{formatCurrency(wonValue) ?? "£0"}</p>
          </div>
          <Link href="/clients/new?status=lead" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Lead
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading pipeline…</div>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
          {STAGES.map((stage) => {
            const stageItems = items.filter(item => getItemColumn(item) === stage.id);
            const stageValue = stageItems.reduce((s, item) => s + getItemValue(item), 0);
            return (
              <div key={stage.id} style={{ minWidth: 230, maxWidth: 280, flex: "0 0 250px" }}>
                {/* Column header */}
                <div style={{ padding: "8px 12px", borderRadius: "var(--r-sm) var(--r-sm) 0 0", background: `${stage.color}15`, borderBottom: `2px solid ${stage.color}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>{stage.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{stageItems.length}</span>
                  </div>
                  {stageValue > 0 && (
                    <p style={{ fontSize: 11, color: stage.color, marginTop: 2 }}>{formatCurrency(stageValue)}</p>
                  )}
                </div>
                {/* Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0", minHeight: 80 }}>
                  {stageItems.map((item) => (
                    item.type === "client"
                      ? <ClientCard key={`c-${item.id}`} client={item} stageColor={stage.color} allStages={STAGES} onOpen={() => openSidebar(item)} onMove={(col) => { void moveItem(item, col); }} />
                      : <ProposalCard key={`p-${item.id}`} proposal={item} stageColor={stage.color} allStages={STAGES} onOpen={() => openSidebar(item)} onMove={(col) => { void moveItem(item, col); }} />
                  ))}
                  {stageItems.length === 0 && (
                    <div style={{ padding: 12, textAlign: "center", color: "var(--text-4)", fontSize: 12, border: "1px dashed var(--border)", borderRadius: "var(--r-sm)" }}>
                      {stage.id === "lead"
                        ? <Link href="/clients/new" style={{ color: stage.color, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none" }}>
                            <Plus style={{ width: 14, height: 14 }} />Add lead
                          </Link>
                        : "Empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sidebar */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.3)" }} onClick={() => setSelected(null)} />
          <div style={{ width: 400, background: "var(--card)", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)", overflowY: "auto", padding: 24 }}>
            {/* Sidebar header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {selected.type === "client"
                    ? <User style={{ width: 13, height: 13, color: "var(--text-3)" }} />
                    : <FileText style={{ width: 13, height: 13, color: "var(--text-3)" }} />}
                  <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {selected.type === "client" ? "Lead / Client" : "Unlinked Proposal"}
                  </span>
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                  {selected.type === "client" ? selected.name : selected.title}
                </h2>
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                  {selected.type === "client" ? (selected.website ?? "") : selected.clientName}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                <XCircle style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Stage switcher */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    void moveItem(selected, s.id);
                    setSelected(prev => {
                      if (!prev) return null;
                      if (prev.type === "client") return { ...prev, status: columnToClientStatus(s.id) };
                      return { ...prev, pipelineStage: columnToProposalStage(s.id) };
                    });
                  }}
                  style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 99, border: "none", cursor: "pointer",
                    background: itemColumn === s.id ? s.color : `${s.color}15`,
                    color: itemColumn === s.id ? "white" : s.color,
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Type-specific content */}
            {selected.type === "client" ? (
              <ClientSidebarContent client={selected} />
            ) : (
              <ProposalSidebarContent
                proposal={selected}
                editNotes={editNotes} setEditNotes={setEditNotes}
                editValue={editValue} setEditValue={setEditValue}
                editClose={editClose} setEditClose={setEditClose}
                editLost={editLost} setEditLost={setEditLost}
                saving={saving} onSave={saveSidebar} onCancel={() => setSelected(null)}
              />
            )}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <LayoutGrid style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>Pipeline is empty</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>Add a lead or create a proposal to get started.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <Link href="/clients/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus style={{ width: 14, height: 14 }} /> Add Lead
            </Link>
            <Link href="/tools/keyword-planner" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FileText style={{ width: 14, height: 14 }} /> Create Proposal
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar content: Client ──────────────────────────────────────────────────

function ClientSidebarContent({ client }: { client: PipelineClient }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Link
          href={`/clients/${client.slug}`}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}
        >
          <User style={{ width: 13, height: 13 }} /> View Dashboard
        </Link>
        {client.website && (
          <a href={client.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ padding: "6px 8px" }}>
            <ExternalLink style={{ width: 13, height: 13 }} />
          </a>
        )}
      </div>

      {client.proposals.length > 0 ? (
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>
            Proposals ({client.proposals.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {client.proposals.map((p) => (
              <Link
                key={p.id}
                href={`/tools/proposals/${p.id}`}
                style={{ display: "block", padding: "10px 12px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", textDecoration: "none", border: "1px solid var(--border-subtle)" }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, lineHeight: 1.3 }}>{p.title}</p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {p.expectedValue != null && (
                    <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 2 }}>
                      <DollarSign style={{ width: 10, height: 10 }} />{formatCurrency(p.expectedValue)}
                    </span>
                  )}
                  {p.viewCount > 0 && (
                    <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 2 }}>
                      <Eye style={{ width: 10, height: 10 }} />{p.viewCount} view{p.viewCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {p.closeDate && (
                    <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 2 }}>
                      <Clock style={{ width: 10, height: 10 }} />{new Date(p.closeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "16px 12px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", textAlign: "center", border: "1px dashed var(--border)" }}>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 12 }}>No proposals yet</p>
          <Link
            href={`/tools/keyword-planner?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`}
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus style={{ width: 12, height: 12 }} /> Create Proposal
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar content: Orphan proposal ────────────────────────────────────────

function ProposalSidebarContent({
  proposal, editNotes, setEditNotes, editValue, setEditValue,
  editClose, setEditClose, editLost, setEditLost, saving, onSave, onCancel,
}: {
  proposal: OrphanProposal;
  editNotes: string; setEditNotes: (v: string) => void;
  editValue: string; setEditValue: (v: string) => void;
  editClose: string; setEditClose: (v: string) => void;
  editLost: string; setEditLost: (v: string) => void;
  saving: boolean; onSave: () => void; onCancel: () => void;
}) {
  const isLost = proposalStageToColumn(proposal.pipelineStage) === "lost";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Link
        href={`/tools/proposals/${proposal.id}`}
        className="btn btn-secondary btn-sm"
        style={{ justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}
      >
        <FileText style={{ width: 13, height: 13 }} /> Open Proposal
      </Link>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Expected Value (£)</label>
        <input type="number" min="0" step="100" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="form-input" style={{ fontSize: 13 }} placeholder="e.g. 5000" />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Expected Close Date</label>
        <input type="date" value={editClose} onChange={(e) => setEditClose(e.target.value)} className="form-input" style={{ fontSize: 13 }} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Notes</label>
        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="form-input" rows={4} style={{ fontSize: 13, resize: "vertical" }} placeholder="Add pipeline notes…" />
      </div>
      {isLost && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Lost Reason</label>
          <input type="text" value={editLost} onChange={(e) => setEditLost(e.target.value)} className="form-input" style={{ fontSize: 13 }} placeholder="Why was this lost?" />
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onSave} disabled={saving} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle style={{ width: 13, height: 13 }} />{saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="btn btn-secondary btn-sm">Cancel</button>
      </div>
      {(proposal.lastViewedAt || proposal.viewCount > 0) && (
        <div style={{ padding: "10px 12px", background: "var(--bg-2)", borderRadius: "var(--r-sm)", fontSize: 12 }}>
          <p style={{ color: "var(--text-3)" }}>
            <Eye style={{ width: 11, height: 11, display: "inline", marginRight: 4 }} />
            Viewed {proposal.viewCount} time{proposal.viewCount !== 1 ? "s" : ""}
            {proposal.lastViewedAt ? ` · last ${timeAgo(proposal.lastViewedAt)}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

