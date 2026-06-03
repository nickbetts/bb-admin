"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  MessageSquareText,
  User2,
  X,
  Zap,
} from "lucide-react";

import type {
  SalesHandoffPipelineItem,
  SalesHandoffStatus,
} from "@/components/sales-handoff/SalesHandoffPipelineBoard";

export interface SalesHandoffDetailEvent {
  id: string;
  eventType: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  actor?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesHandoffDetail {
  id: string;
  prospectName: string;
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  interestedServices: string[];
  budgetRange: string;
  otherInformation?: string | null;
  urgentOverride: boolean;
  urgentReason?: string | null;
  hoursUntilCall?: number | null;
  noticeStatus?: string | null;
  status: SalesHandoffStatus;
  clickupTaskId?: string | null;
  clickupTaskUrl?: string | null;
  clickupListId?: string | null;
  clickupSyncStatus?: string | null;
  clickupLastSyncedAt?: string | null;
  policyEnforce48HourNotice?: boolean;
  policyAllowUrgentOverride?: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  client?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  proposal?: {
    id: string;
    title: string;
  } | null;
  grandPlan?: {
    id: string;
    title: string;
  } | null;
  actionItem?: {
    id: string;
    title: string;
    status: string;
  } | null;
  events: SalesHandoffDetailEvent[];
}

interface SalesHandoffDetailDrawerProps {
  open: boolean;
  loading: boolean;
  error: string | null;
  handoff: SalesHandoffPipelineItem | null;
  detail: SalesHandoffDetail | null;
  notesDraft: string;
  notesSaving: boolean;
  statusUpdating: boolean;
  onClose: () => void;
  onNotesChange: (value: string) => void;
  onSaveNotes: () => void;
  onStatusChange: (status: SalesHandoffStatus) => void;
}

const STATUS_OPTIONS: Array<{ status: SalesHandoffStatus; label: string; color: string }> = [
  { status: "draft", label: "Draft", color: "#f59e0b" },
  { status: "submitted", label: "New", color: "#0ea5e9" },
  { status: "in_progress", label: "In Progress", color: "#6366f1" },
  { status: "ready_for_meeting", label: "Ready", color: "#10b981" },
  { status: "blocked", label: "Blocked", color: "#ef4444" },
  { status: "completed", label: "Completed", color: "#22c55e" },
  { status: "cancelled", label: "Cancelled", color: "#94a3b8" },
];

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatDateOnly(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatRelativeHours(hoursUntilCall?: number | null): string | null {
  if (typeof hoursUntilCall !== "number" || Number.isNaN(hoursUntilCall)) return null;
  if (hoursUntilCall < 0) return `${Math.abs(hoursUntilCall).toFixed(1)} hours overdue`;
  return `${hoursUntilCall.toFixed(1)} hours until call`;
}

function getStatusLabel(status: SalesHandoffStatus): string {
  return STATUS_OPTIONS.find((item) => item.status === status)?.label ?? status;
}

function getStatusColor(status: SalesHandoffStatus): string {
  return STATUS_OPTIONS.find((item) => item.status === status)?.color ?? "#94a3b8";
}

function getActorLabel(event: SalesHandoffDetailEvent): string {
  return event.actor?.name ?? event.actor?.email ?? "System";
}

export function SalesHandoffDetailDrawer({
  open,
  loading,
  error,
  handoff,
  detail,
  notesDraft,
  notesSaving,
  statusUpdating,
  onClose,
  onNotesChange,
  onSaveNotes,
  onStatusChange,
}: SalesHandoffDetailDrawerProps) {
  if (!open || !handoff) return null;

  const activeStatus = detail?.status ?? handoff.status;
  const activeStatusColor = getStatusColor(activeStatus);
  const clickupSyncStatus = detail?.clickupSyncStatus ?? handoff.clickupSyncStatus ?? null;
  const clickupTaskUrl = detail?.clickupTaskUrl ?? handoff.clickupTaskUrl ?? null;
  const clickupLastSyncedAt = detail?.clickupLastSyncedAt ?? handoff.clickupLastSyncedAt ?? null;
  const ownerLabel =
    detail?.owner?.name ??
    detail?.owner?.email ??
    handoff.owner?.name ??
    handoff.owner?.email ??
    "Unassigned";
  const noteBaseline = detail?.notes ?? "";
  const notesDirty = notesDraft.trim() !== noteBaseline.trim();
  const relativeHours = formatRelativeHours(detail?.hoursUntilCall);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
      <div
        style={{ flex: 1, background: "rgba(9, 9, 11, 0.38)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sales handoff details"
        style={{
          width: "min(480px, 100vw)",
          background: "var(--surface)",
          boxShadow: "-10px 0 40px rgba(15, 23, 42, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ height: 4, background: activeStatusColor, flexShrink: 0 }} />

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            padding: "22px 24px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  background: `${activeStatusColor}18`,
                  color: activeStatusColor,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {getStatusLabel(activeStatus)}
              </span>
              {handoff.urgentOverride ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </span>
              ) : null}
              {clickupSyncStatus === "failed" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  <Zap className="h-3 w-3" /> Sync failed
                </span>
              ) : clickupSyncStatus === "synced" ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Synced
                </span>
              ) : null}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              {handoff.prospectName}
            </h2>
            <p
              style={{
                marginTop: 5,
                fontSize: 13,
                color: "var(--text-3)",
                wordBreak: "break-word",
              }}
            >
              {handoff.website}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            aria-label="Close handoff details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {clickupTaskUrl ? (
              <a
                href={clickupTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Open ClickUp <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          <section>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 10,
              }}
            >
              Move stage
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUS_OPTIONS.map((option) => {
                const active = option.status === activeStatus;
                return (
                  <button
                    key={option.status}
                    type="button"
                    disabled={statusUpdating || loading || active}
                    onClick={() => onStatusChange(option.status)}
                    style={{
                      borderRadius: 999,
                      border: `1.5px solid ${active ? option.color : "var(--border)"}`,
                      background: active ? option.color : "var(--surface)",
                      color: active ? "white" : "var(--text-2)",
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      cursor: active ? "default" : "pointer",
                      opacity: statusUpdating && !active ? 0.7 : 1,
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              background: "var(--bg)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
            >
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Second call</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
                  {formatDateTime(handoff.secondCallAt)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Budget</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
                  {handoff.budgetRange || "Not provided"}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Owner</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
                  {ownerLabel}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Last synced</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
                  {clickupLastSyncedAt ? formatDateTime(clickupLastSyncedAt) : "Not yet synced"}
                </p>
              </div>
            </div>
            {detail?.noticeStatus || relativeHours ? (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {detail?.noticeStatus ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <CalendarClock className="h-3 w-3" /> {detail.noticeStatus}
                  </span>
                ) : null}
                {relativeHours ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    <Clock3 className="h-3 w-3" /> {relativeHours}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>

          {loading && !detail ? (
            <div
              className="card"
              style={{
                padding: 18,
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--text-3)",
              }}
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Loading handoff details…
            </div>
          ) : error ? (
            <div
              style={{
                borderRadius: "var(--r)",
                border: "1px solid #fecaca",
                background: "#fef2f2",
                padding: "14px 16px",
                color: "#991b1b",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : detail ? (
            <>
              <section>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Sales brief
                </p>
                <div className="card" style={{ padding: 16, display: "grid", gap: 14 }}>
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-2)",
                        marginBottom: 5,
                      }}
                    >
                      Target audience summary
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-2)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {detail.targetAudienceSummary}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-2)",
                        marginBottom: 5,
                      }}
                    >
                      Interested services
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {detail.interestedServices.length > 0 ? (
                        detail.interestedServices.map((service) => (
                          <span
                            key={service}
                            className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700"
                          >
                            {service}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 13, color: "var(--text-3)" }}>
                          No services selected
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-2)",
                        marginBottom: 5,
                      }}
                    >
                      Other information
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-2)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {detail.otherInformation?.trim() || "No additional information provided."}
                    </p>
                  </div>
                  {detail.urgentReason ? (
                    <div>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-2)",
                          marginBottom: 5,
                        }}
                      >
                        Urgent reason
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-2)",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {detail.urgentReason}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>

              <section>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Linked records
                </p>
                <div className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
                  {detail.client ? (
                    <Link
                      href={`/clients/${detail.client.slug}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        padding: "10px 12px",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>
                          Client
                        </p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                          {detail.client.name}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                    </Link>
                  ) : null}
                  {detail.proposal ? (
                    <Link
                      href={`/tools/proposals/${detail.proposal.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        padding: "10px 12px",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>
                          Proposal
                        </p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                          {detail.proposal.title}
                        </p>
                      </div>
                      <FileText className="h-3.5 w-3.5 text-zinc-400" />
                    </Link>
                  ) : null}
                  {detail.grandPlan ? (
                    <Link
                      href={`/tools/grand-plan/${detail.grandPlan.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        padding: "10px 12px",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>
                          Grand Plan
                        </p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                          {detail.grandPlan.title}
                        </p>
                      </div>
                      <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                    </Link>
                  ) : null}
                  {detail.actionItem ? (
                    <div
                      style={{
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        padding: "10px 12px",
                      }}
                    >
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 3 }}>
                        Action item
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        {detail.actionItem.title}
                      </p>
                      <p style={{ marginTop: 4, fontSize: 11, color: "var(--text-3)" }}>
                        Status: {detail.actionItem.status}
                      </p>
                    </div>
                  ) : null}
                  {!detail.client && !detail.proposal && !detail.grandPlan && !detail.actionItem ? (
                    <p style={{ fontSize: 13, color: "var(--text-3)" }}>No linked records yet.</p>
                  ) : null}
                </div>
              </section>

              <section>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Internal notes
                </p>
                <div className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
                    Notes for the marketing team
                  </label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={notesDraft}
                    onChange={(event) => onNotesChange(event.target.value)}
                    placeholder="Add internal context, blockers, or follow-up notes."
                    style={{ resize: "vertical" }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {notesDirty ? "Unsaved changes" : "Notes are up to date"}
                    </p>
                    <button
                      type="button"
                      onClick={onSaveNotes}
                      disabled={!notesDirty || notesSaving}
                      className="btn btn-primary btn-sm"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {notesSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <MessageSquareText className="h-3.5 w-3.5" />
                      )}
                      {notesSaving ? "Saving…" : "Save notes"}
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Timeline
                </p>
                <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
                  {detail.events.length > 0 ? (
                    detail.events.map((event) => (
                      <div
                        key={event.id}
                        style={{
                          display: "grid",
                          gap: 5,
                          paddingBottom: 12,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                            {event.title}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                            {formatDateOnly(event.createdAt)}
                          </p>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-3)" }}>
                          {getActorLabel(event)}
                        </p>
                        {event.description ? (
                          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                            {event.description}
                          </p>
                        ) : null}
                        {typeof event.metadata?.error === "string" ? (
                          <p style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.5 }}>
                            {String(event.metadata.error)}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-3)" }}>No event history yet.</p>
                  )}
                </div>
              </section>

              <section>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Ownership
                </p>
                <div className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <User2 className="h-4 w-4 text-zinc-400" />
                    <div>
                      <p style={{ fontSize: 12, color: "var(--text-3)" }}>Created by</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        {detail.createdBy?.name ?? detail.createdBy?.email ?? "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <User2 className="h-4 w-4 text-zinc-400" />
                    <div>
                      <p style={{ fontSize: 12, color: "var(--text-3)" }}>Last updated</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        {formatDateTime(detail.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
