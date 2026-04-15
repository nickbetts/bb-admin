"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  LayoutGrid, Plus, DollarSign, Eye, Clock, CheckCircle, XCircle,
  User, FileText, ExternalLink, Target, Users,
} from "lucide-react";
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
type ViewMode = "leads" | "clients";

// ─── Stage configs ────────────────────────────────────────────────────────────

const LEAD_STAGES = [
  { id: "lead",          label: "Lead",          color: "#d97706" },
  { id: "qualifying",    label: "Qualifying",     color: "#f59e0b" },
  { id: "proposal_sent", label: "Proposal Sent",  color: "#3b82f6" },
  { id: "negotiating",   label: "Negotiating",    color: "#f97316" },
  { id: "won",           label: "Won",            color: "#16a34a" },
  { id: "lost",          label: "Lost",           color: "#64748b" },
] as const;

const CLIENT_STAGES = [
  { id: "active",  label: "Active",  color: "#10b981" },
  { id: "churned", label: "Churned", color: "#64748b" },
] as const;

type LeadStageId   = typeof LEAD_STAGES[number]["id"];

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function clientStatusToLeadCol(status: string): LeadStageId {
  const map: Record<string, LeadStageId> = {
    lead: "lead", qualifying: "qualifying", proposal_sent: "proposal_sent",
    negotiating: "negotiating", active: "won", lost: "lost", churned: "lost",
  };
  return map[status] ?? "lead";
}

function leadColToClientStatus(col: string): string {
  const map: Record<string, string> = {
    lead: "lead", qualifying: "qualifying", proposal_sent: "proposal_sent",
    negotiating: "negotiating", won: "active", lost: "lost",
  };
  return map[col] ?? "lead";
}

function proposalStageToLeadCol(stage: string): LeadStageId {
  const map: Record<string, LeadStageId> = {
    prospect: "lead", sent: "proposal_sent", viewed: "proposal_sent",
    negotiating: "negotiating", won: "won", lost: "lost",
  };
  return map[stage] ?? "lead";
}

function leadColToProposalStage(col: string): string {
  const map: Record<string, string> = {
    lead: "prospect", qualifying: "prospect", proposal_sent: "sent",
    negotiating: "negotiating", won: "won", lost: "lost",
  };
  return map[col] ?? "prospect";
}

function getItemLeadCol(item: PipelineItem): LeadStageId {
  return item.type === "client"
    ? clientStatusToLeadCol(item.status)
    : proposalStageToLeadCol(item.pipelineStage);
}

function getItemValue(item: PipelineItem): number {
  if (item.type === "client") return item.proposals.reduce((s, p) => s + (p.expectedValue ?? 0), 0);
  return item.expectedValue ?? 0;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (!v) return "£0";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function CardShell({ accentColor, onClick, children }: {
  accentColor: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--surface)", borderRadius: "var(--r-sm)",
        border: "1px solid var(--border)",
        boxShadow: hovered ? "var(--shadow)" : "var(--shadow-xs)",
        transform: hovered ? "translateY(-1px)" : "none",
        transition: "box-shadow 0.15s, transform 0.15s",
        cursor: "pointer", overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function ClientCard({ client, accentColor, onOpen }: {
  client: PipelineClient;
  accentColor: string;
  onOpen: () => void;
}) {
  const value = client.proposals.reduce((s, p) => s + (p.expectedValue ?? 0), 0);
  return (
    <CardShell accentColor={accentColor} onClick={onOpen}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.35, flex: 1 }}>{client.name}</p>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User style={{ width: 12, height: 12, color: accentColor }} />
        </div>
      </div>
      {client.website && (
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {client.website.replace(/^https?:\/\//, "")}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {value > 0 ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: accentColor, background: `${accentColor}12`, padding: "3px 8px", borderRadius: 99, display: "flex", alignItems: "center", gap: 3 }}>
            <DollarSign style={{ width: 9, height: 9 }} />{fmt(value)}
          </span>
        ) : null}
        {client.proposals.length > 0 ? (
          <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 3 }}>
            <FileText style={{ width: 10, height: 10 }} />{client.proposals.length} proposal{client.proposals.length !== 1 ? "s" : ""}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text-4)", fontStyle: "italic" }}>No proposals</span>
        )}
      </div>
    </CardShell>
  );
}

function ProposalCard({ proposal, accentColor, onOpen }: {
  proposal: OrphanProposal;
  accentColor: string;
  onOpen: () => void;
}) {
  return (
    <CardShell accentColor={accentColor} onClick={onOpen}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.35, flex: 1 }}>{proposal.title}</p>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${accentColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileText style={{ width: 12, height: 12, color: accentColor }} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{proposal.clientName}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {proposal.expectedValue != null && (
          <span style={{ fontSize: 11, fontWeight: 600, color: accentColor, background: `${accentColor}12`, padding: "3px 8px", borderRadius: 99, display: "flex", alignItems: "center", gap: 3 }}>
            <DollarSign style={{ width: 9, height: 9 }} />{fmt(proposal.expectedValue)}
          </span>
        )}
        {proposal.viewCount > 0 && (
          <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 3 }}>
            <Eye style={{ width: 10, height: 10 }} />{proposal.viewCount}
          </span>
        )}
        {proposal.closeDate && (
          <span style={{ fontSize: 11, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 3 }}>
            <Clock style={{ width: 10, height: 10 }} />{new Date(proposal.closeDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
      <p style={{ fontSize: 10, color: "var(--text-4)", marginTop: 6, fontStyle: "italic" }}>Unlinked proposal</p>
    </CardShell>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({ stage, children, count, value, emptySlot }: {
  stage: { id: string; label: string; color: string };
  children: ReactNode;
  count: number;
  value: number;
  emptySlot?: ReactNode;
}) {
  return (
    <div style={{ minWidth: 256, maxWidth: 300, flex: "0 0 272px", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "10px 14px",
        background: `${stage.color}0d`,
        borderRadius: "var(--r-sm) var(--r-sm) 0 0",
        borderTop: `3px solid ${stage.color}`,
        border: `1px solid ${stage.color}25`,
        borderTopWidth: 3,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: stage.color, letterSpacing: "0.01em" }}>{stage.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, minWidth: 22, height: 22, borderRadius: 99,
            background: count > 0 ? stage.color : "var(--border)",
            color: count > 0 ? "white" : "var(--text-4)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px",
          }}>
            {count}
          </span>
        </div>
        {value > 0 && (
          <p style={{ fontSize: 11, color: stage.color, marginTop: 3, opacity: 0.85, fontWeight: 500 }}>{fmt(value)}</p>
        )}
      </div>
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", gap: 8,
        padding: "10px 8px 12px",
        background: `${stage.color}04`,
        border: `1px solid ${stage.color}18`,
        borderTop: "none",
        borderRadius: "0 0 var(--r-sm) var(--r-sm)",
        minHeight: 100,
      }}>
        {children}
        {count === 0 && (
          emptySlot ?? (
            <div style={{ fontSize: 12, color: "var(--text-4)", textAlign: "center", padding: "20px 0" }}>Empty</div>
          )
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [view, setView] = useState<ViewMode>("leads");
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PipelineItem | null>(null);

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

  async function moveItem(item: PipelineItem, targetId: string) {
    if (item.type === "client") {
      const newStatus = view === "clients"
        ? targetId                         // "active" | "churned" — direct
        : leadColToClientStatus(targetId); // lead column → client status
      await fetch(`/api/clients/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } else {
      await fetch(`/api/tools/proposals/${item.id}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: leadColToProposalStage(targetId) }),
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

  // ── Stats ───────────────────────────────────────────────────────────────────
  const clients = items.filter((i): i is PipelineClient => i.type === "client");
  const leadsCount   = clients.filter(c => ["lead", "qualifying", "proposal_sent", "negotiating"].includes(c.status)).length;
  const activeCount  = clients.filter(c => c.status === "active").length;
  const pipelineVal  = items.filter(i => !["won", "lost"].includes(getItemLeadCol(i))).reduce((s, i) => s + getItemValue(i), 0);
  const activeVal    = clients.filter(c => c.status === "active").reduce((s, c) => s + getItemValue(c), 0);

  // ── Sidebar stage context ────────────────────────────────────────────────────
  const sidebarStages: readonly { id: string; label: string; color: string }[] =
    view === "clients" ? CLIENT_STAGES : LEAD_STAGES;

  function getSidebarStage(): string {
    if (!selected) return "";
    if (selected.type === "client") {
      return view === "clients"
        ? selected.status                          // "active" | "churned"
        : clientStatusToLeadCol(selected.status);  // lead column id
    }
    return proposalStageToLeadCol(selected.pipelineStage);
  }

  return (
    <div className="page" style={{ maxWidth: 1700 }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LayoutGrid style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Sales Pipeline</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              {view === "leads" ? "Lead & prospect funnel — track every opportunity" : "Existing client relationships"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {view === "leads" ? (
            <>
              <Stat label="Active Leads"    value={String(leadsCount)}  color="var(--accent)" />
              <Stat label="Pipeline Value"  value={fmt(pipelineVal)}    color="var(--accent)" />
              <Stat label="Active Clients"  value={fmt(activeVal)}      color="var(--success)" />
            </>
          ) : (
            <>
              <Stat label="Active Clients"  value={String(activeCount)} color="var(--success)" />
              <Stat label="Total Value"     value={fmt(activeVal)}      color="var(--accent)" />
            </>
          )}
          <Link href="/clients/new?status=lead" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Plus style={{ width: 14, height: 14 }} /> Add Lead
          </Link>
        </div>
      </div>

      {/* ── View toggle ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, width: "fit-content" }}>
        {([ 
          { id: "leads",   label: "Leads Pipeline", Icon: Target, count: leadsCount  },
          { id: "clients", label: "Active Clients",  Icon: Users,  count: activeCount },
        ] as const).map(({ id, label, Icon, count }) => (
          <button
            key={id}
            onClick={() => { setView(id); setSelected(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 16px",
              borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: view === id ? "var(--accent)" : "transparent",
              color: view === id ? "white" : "var(--text-2)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <Icon style={{ width: 14, height: 14 }} />
            {label}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
              background: view === id ? "rgba(255,255,255,0.22)" : "var(--border-subtle)",
              color: view === id ? "white" : "var(--text-3)",
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Board ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>Loading pipeline…</div>

      ) : view === "leads" ? (
        /* ── LEADS KANBAN ───────────────────────────────────────────────── */
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
          {LEAD_STAGES.map((stage) => {
            const stageItems = items.filter(i => getItemLeadCol(i) === stage.id);
            const stageValue = stageItems.reduce((s, i) => s + getItemValue(i), 0);
            return (
              <KanbanColumn
                key={stage.id} stage={stage} count={stageItems.length} value={stageValue}
                emptySlot={stage.id === "lead" ? (
                  <Link href="/clients/new" style={{ fontSize: 12, color: stage.color, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", padding: "20px 0", opacity: 0.7 }}>
                    <Plus style={{ width: 16, height: 16 }} />Add lead
                  </Link>
                ) : undefined}
              >
                {stageItems.map((item) =>
                  item.type === "client"
                    ? <ClientCard   key={`c-${item.id}`} client={item}   accentColor={stage.color} onOpen={() => openSidebar(item)} />
                    : <ProposalCard key={`p-${item.id}`} proposal={item} accentColor={stage.color} onOpen={() => openSidebar(item)} />
                )}
              </KanbanColumn>
            );
          })}
        </div>

      ) : (
        /* ── CLIENTS KANBAN ─────────────────────────────────────────────── */
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
          {CLIENT_STAGES.map((stage) => {
            const stageClients = clients.filter(c => c.status === stage.id);
            const stageValue = stageClients.reduce((s, c) => s + getItemValue(c), 0);
            return (
              <KanbanColumn
                key={stage.id} stage={stage} count={stageClients.length} value={stageValue}
                emptySlot={stage.id === "active" ? (
                  <div style={{ fontSize: 12, color: "var(--text-4)", textAlign: "center", padding: "20px 0", lineHeight: 1.6 }}>
                    No active clients yet.<br />Convert leads to see them here.
                  </div>
                ) : undefined}
              >
                {stageClients.map((c) => (
                  <ClientCard key={`cc-${c.id}`} client={c} accentColor={stage.color} onOpen={() => openSidebar(c)} />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && items.length === 0 && (
        <div className="card" style={{ padding: 56, textAlign: "center" }}>
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

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.22)" }} onClick={() => setSelected(null)} />
          <div style={{ width: 420, background: "var(--surface)", boxShadow: "-4px 0 32px rgba(0,0,0,0.12)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ height: 4, background: "var(--gradient-accent)", flexShrink: 0 }} />
            <div style={{ padding: "22px 24px", flex: 1 }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <span style={{
                    display: "inline-block", fontSize: 10, fontWeight: 700,
                    padding: "2px 9px", borderRadius: 99, marginBottom: 8,
                    textTransform: "uppercase" as const, letterSpacing: "0.07em",
                    background: selected.type === "client"
                      ? (selected.status === "active" ? "var(--success-bg)" : selected.status === "churned" ? "var(--border-subtle)" : "var(--accent-bg)")
                      : "var(--info-bg)",
                    color: selected.type === "client"
                      ? (selected.status === "active" ? "var(--success-text)" : selected.status === "churned" ? "var(--text-3)" : "var(--accent-text)")
                      : "var(--info-text)",
                  }}>
                    {selected.type === "client"
                      ? (selected.status === "active" ? "Active Client" : selected.status === "churned" ? "Churned" : "Lead")
                      : "Proposal"}
                  </span>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
                    {selected.type === "client" ? selected.name : selected.title}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 3 }}>
                    {selected.type === "client" ? (selected.website ?? "") : selected.clientName}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-3)", flexShrink: 0 }}
                >
                  <XCircle style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {/* Stage switcher */}
              <div style={{ marginBottom: 22 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                  Move to stage
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {sidebarStages.map((s) => {
                    const current = getSidebarStage() === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          void moveItem(selected, s.id);
                          setSelected(prev => {
                            if (!prev) return null;
                            if (prev.type === "client") {
                              const newStatus = view === "clients" ? s.id : leadColToClientStatus(s.id);
                              return { ...prev, status: newStatus };
                            }
                            return { ...prev, pipelineStage: leadColToProposalStage(s.id) };
                          });
                        }}
                        style={{
                          fontSize: 12, padding: "5px 13px", borderRadius: 99,
                          border: `1.5px solid ${current ? s.color : "var(--border)"}`,
                          cursor: "pointer", fontWeight: current ? 700 : 500,
                          background: current ? s.color : "var(--surface)",
                          color: current ? "white" : "var(--text-2)",
                          transition: "all 0.15s",
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
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
        </div>
      )}
    </div>
  );
}

// ─── Stat widget ──────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: 11, color: "var(--text-3)" }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 700, color }}>{value}</p>
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
          <a
            href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ padding: "6px 10px" }}
          >
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
                key={p.id} href={`/tools/proposals/${p.id}`}
                style={{ display: "block", padding: "11px 13px", background: "var(--bg)", borderRadius: "var(--r-sm)", textDecoration: "none", border: "1px solid var(--border-subtle)" }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 5, lineHeight: 1.3 }}>{p.title}</p>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {p.expectedValue != null && (
                    <span style={{ fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 2 }}>
                      <DollarSign style={{ width: 10, height: 10 }} />{fmt(p.expectedValue)}
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
        <div style={{ padding: "18px 14px", background: "var(--bg)", borderRadius: "var(--r-sm)", textAlign: "center", border: "1px dashed var(--border)" }}>
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
  const isLost = proposalStageToLeadCol(proposal.pipelineStage) === "lost";
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
        <div style={{ padding: "10px 13px", background: "var(--bg)", borderRadius: "var(--r-sm)", fontSize: 12, border: "1px solid var(--border-subtle)" }}>
          <p style={{ color: "var(--text-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <Eye style={{ width: 11, height: 11 }} />
            Viewed {proposal.viewCount} time{proposal.viewCount !== 1 ? "s" : ""}
            {proposal.lastViewedAt ? ` · last ${timeAgo(proposal.lastViewedAt)}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
