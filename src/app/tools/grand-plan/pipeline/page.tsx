"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Plus,
  DollarSign,
  Eye,
  Clock,
  MessageSquare,
  ExternalLink,
  Map,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelinePlan {
  id: string;
  title: string;
  status: string;
  pipelineStage: string;
  pipelineNotes: string | null;
  expectedValue: number | null;
  closeDate: string | null;
  lostReason: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  shareToken: string | null;
  enquiryFormEnabled: boolean;
  prospectName: string | null;
  prospectWebsite: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; website: string | null } | null;
  _count: { enquiries: number };
}

// Stages map 1:1 with the GrandPlan.pipelineStage column. Order matters for
// left-to-right reading of the funnel.
const STAGES = [
  { id: "prospect",    label: "Prospect",    color: "#d97706" },
  { id: "sent",        label: "Sent",        color: "#3b82f6" },
  { id: "viewed",      label: "Viewed",      color: "#8b5cf6" },
  { id: "negotiating", label: "Negotiating", color: "#f97316" },
  { id: "won",         label: "Won",         color: "#16a34a" },
  { id: "lost",        label: "Lost",        color: "#64748b" },
] as const;

type StageId = typeof STAGES[number]["id"];

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (!v) return "£0";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(v);
}

function getDisplayName(plan: PipelinePlan): string {
  return plan.client?.name ?? plan.prospectName ?? "Untitled prospect";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GrandPlanPipelinePage() {
  const [plans, setPlans] = useState<PipelinePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PipelinePlan | null>(null);

  const [editNotes, setEditNotes] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editClose, setEditClose] = useState("");
  const [editLost, setEditLost] = useState("");
  const [editEnquiry, setEditEnquiry] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/grand-plan/pipeline");
      if (res.ok) {
        const data = (await res.json()) as { plans: PipelinePlan[] };
        setPlans(data.plans ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveStage(plan: PipelinePlan, target: StageId) {
    if (plan.pipelineStage === target) return;
    await fetch(`/api/tools/grand-plan/${plan.id}/pipeline`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: target }),
    });
    await load();
  }

  function openSidebar(plan: PipelinePlan) {
    setSelected(plan);
    setEditNotes(plan.pipelineNotes ?? "");
    setEditValue(plan.expectedValue != null ? String(plan.expectedValue) : "");
    setEditClose(plan.closeDate ?? "");
    setEditLost(plan.lostReason ?? "");
    setEditEnquiry(plan.enquiryFormEnabled);
  }

  async function saveSidebar() {
    if (!selected) return;
    setSaving(true);
    try {
      // CRM fields
      await fetch(`/api/tools/grand-plan/${selected.id}/pipeline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineNotes: editNotes || null,
          expectedValue: editValue ? parseFloat(editValue) : null,
          closeDate: editClose || null,
          lostReason: editLost || null,
        }),
      });
      // Enquiry-form toggle lives on the main plan PATCH, not the pipeline one
      if (editEnquiry !== selected.enquiryFormEnabled) {
        await fetch(`/api/tools/grand-plan/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enquiryFormEnabled: editEnquiry }),
        });
      }
      await load();
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const openPlans = plans.filter((p) => !["won", "lost"].includes(p.pipelineStage));
  const pipelineVal = openPlans.reduce((s, p) => s + (p.expectedValue ?? 0), 0);
  const wonVal = plans
    .filter((p) => p.pipelineStage === "won")
    .reduce((s, p) => s + (p.expectedValue ?? 0), 0);
  const totalEnquiries = plans.reduce((s, p) => s + (p._count?.enquiries ?? 0), 0);

  return (
    <div className="page" style={{ maxWidth: 1700 }}>
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <LayoutGrid style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1,
              }}
            >
              Grand Plan Pipeline
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              Track every plan from cold prospect through to signed client.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Stat label="Open plans" value={String(openPlans.length)} color="var(--accent)" />
          <Stat label="Pipeline value" value={fmt(pipelineVal)} color="var(--accent)" />
          <Stat label="Won value" value={fmt(wonVal)} color="var(--success)" />
          <Stat label="Enquiries" value={String(totalEnquiries)} color="var(--accent)" />
          <Link
            href="/tools/grand-plan/new"
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus style={{ width: 14, height: 14 }} /> New plan
          </Link>
        </div>
      </div>

      {/* ── Kanban ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading…</div>
      ) : plans.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 16,
            alignItems: "stretch",
          }}
        >
          {STAGES.map((stage) => {
            const stagePlans = plans.filter((p) => p.pipelineStage === stage.id);
            const stageVal = stagePlans.reduce((s, p) => s + (p.expectedValue ?? 0), 0);
            return (
              <div
                key={stage.id}
                style={{
                  minWidth: 256,
                  maxWidth: 300,
                  flex: "0 0 272px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    background: `${stage.color}0d`,
                    borderRadius: "var(--r-sm) var(--r-sm) 0 0",
                    borderTop: `3px solid ${stage.color}`,
                    border: `1px solid ${stage.color}25`,
                    borderTopWidth: 3,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: stage.color,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {stage.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        minWidth: 22,
                        height: 22,
                        borderRadius: 99,
                        background: stagePlans.length > 0 ? stage.color : "var(--border)",
                        color: stagePlans.length > 0 ? "white" : "var(--text-4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 6px",
                      }}
                    >
                      {stagePlans.length}
                    </span>
                  </div>
                  {stageVal > 0 && (
                    <p
                      style={{
                        fontSize: 11,
                        color: stage.color,
                        marginTop: 3,
                        opacity: 0.85,
                        fontWeight: 500,
                      }}
                    >
                      {fmt(stageVal)}
                    </p>
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: "10px 8px 12px",
                    background: `${stage.color}04`,
                    border: `1px solid ${stage.color}18`,
                    borderTop: "none",
                    borderRadius: "0 0 var(--r-sm) var(--r-sm)",
                    minHeight: 100,
                  }}
                >
                  {stagePlans.length === 0 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-4)",
                        textAlign: "center",
                        padding: "20px 0",
                      }}
                    >
                      Empty
                    </div>
                  )}
                  {stagePlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      accentColor={stage.color}
                      onOpen={() => openSidebar(plan)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.4)",
              zIndex: 100,
            }}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              zIndex: 101,
              padding: 24,
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {getDisplayName(selected)}
              </p>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text)",
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {selected.title}
              </h2>
              <Link
                href={`/tools/grand-plan/${selected.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "var(--accent)",
                  marginTop: 8,
                }}
              >
                Open plan <ExternalLink style={{ width: 11, height: 11 }} />
              </Link>
            </div>

            {/* Stage selector */}
            <Field label="Stage">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STAGES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => moveStage(selected, s.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1.5px solid ${selected.pipelineStage === s.id ? s.color : "var(--border)"}`,
                      background:
                        selected.pipelineStage === s.id ? s.color : "transparent",
                      color:
                        selected.pipelineStage === s.id ? "white" : "var(--text-2)",
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Deal value (£)">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="e.g. 24000"
                className="form-input"
              />
            </Field>

            <Field label="Forecast close">
              <input
                type="date"
                value={editClose}
                onChange={(e) => setEditClose(e.target.value)}
                className="form-input"
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Internal notes — last contact, next step…"
                className="form-input"
                rows={3}
              />
            </Field>

            {selected.pipelineStage === "lost" && (
              <Field label="Lost reason">
                <input
                  type="text"
                  value={editLost}
                  onChange={(e) => setEditLost(e.target.value)}
                  placeholder="Budget, timing, went with competitor…"
                  className="form-input"
                />
              </Field>
            )}

            <Field label="Public enquiry form">
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={editEnquiry}
                  onChange={(e) => setEditEnquiry(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                  Show a contact form on the share page so prospects can submit
                  enquiries directly. Off by default.
                  {selected._count.enquiries > 0 && (
                    <span style={{ display: "block", marginTop: 4, color: "var(--accent)" }}>
                      {selected._count.enquiries} enquir
                      {selected._count.enquiries === 1 ? "y" : "ies"} captured so far.
                    </span>
                  )}
                </span>
              </label>
            </Field>

            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <button
                onClick={() => setSelected(null)}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={saveSidebar}
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-3)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PlanCard({
  plan,
  accentColor,
  onOpen,
}: {
  plan: PipelinePlan;
  accentColor: string;
  onOpen: () => void;
}) {
  const display = getDisplayName(plan);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      style={{
        background: "var(--surface)",
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-xs)",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ padding: "12px 14px" }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.35,
          }}
        >
          {plan.title}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-3)",
            marginTop: 3,
          }}
        >
          {display}
          {!plan.client && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: "var(--text-4)",
                fontStyle: "italic",
              }}
            >
              (prospect)
            </span>
          )}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          {plan.expectedValue != null && plan.expectedValue > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                background: `${accentColor}12`,
                padding: "3px 8px",
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <DollarSign style={{ width: 9, height: 9 }} />
              {fmt(plan.expectedValue)}
            </span>
          )}
          {plan.viewCount > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Eye style={{ width: 10, height: 10 }} />
              {plan.viewCount}
            </span>
          )}
          {plan._count.enquiries > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "var(--accent)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <MessageSquare style={{ width: 10, height: 10 }} />
              {plan._count.enquiries}
            </span>
          )}
          {plan.closeDate && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Clock style={{ width: 10, height: 10 }} />
              {new Date(plan.closeDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 48,
        textAlign: "center",
        background: "var(--surface)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--r-md)",
      }}
    >
      <Map
        style={{
          width: 36,
          height: 36,
          color: "var(--text-4)",
          margin: "0 auto 12px",
        }}
      />
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
        No grand plans yet
      </p>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
        Create your first plan to start tracking it through the pipeline.
      </p>
      <Link
        href="/tools/grand-plan/new"
        className="btn btn-primary"
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <Plus style={{ width: 14, height: 14 }} /> New plan
      </Link>
    </div>
  );
}
