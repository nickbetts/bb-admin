"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

interface SalesHandoffForm {
  prospectName: string;
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  interestedServices: string[];
  budgetRange: string;
  otherInformation: string;
}

const DEFAULT_SERVICE_OPTIONS = [
  "Google PPC",
  "Paid Meta",
  "Organic Social",
  "Website Design",
  "SEO",
  "Custom Landing Pages",
  "Email marketing",
];

const INITIAL_FORM: SalesHandoffForm = {
  prospectName: "",
  website: "",
  targetAudienceSummary: "",
  secondCallAt: "",
  interestedServices: [],
  budgetRange: "",
  otherInformation: "",
};

interface ConfettiPiece {
  id: number;
  left: number;
  size: number;
  delayMs: number;
  durationMs: number;
  rotateDeg: number;
  color: string;
  shape: "rect" | "pill";
}

const CHAOS_CONFETTI_COLOURS = [
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

function createChaosConfettiPieces(count = 84): ConfettiPiece[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    delayMs: Math.random() * 420,
    durationMs: 1500 + Math.random() * 1600,
    rotateDeg: Math.random() * 360,
    color: CHAOS_CONFETTI_COLOURS[Math.floor(Math.random() * CHAOS_CONFETTI_COLOURS.length)],
    shape: Math.random() > 0.5 ? "pill" : "rect",
  }));
}

function looksLikeUrl(value: string): boolean {
  if (!value.trim()) return false;
  const candidate =
    value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function parseBooleanSetting(value: boolean | string | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;
  const normalised = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalised)) return true;
  if (["0", "false", "no", "off"].includes(normalised)) return false;
  return fallback;
}

interface SalesHandoffConfigResponse {
  services?: string[];
  enforce48HourNotice?: boolean | string;
  allowUrgentOverride?: boolean | string;
  clickupListConfigured?: boolean | string;
}

interface SalesHandoffHistoryItem {
  id: string;
  prospectName: string;
  website: string;
  secondCallAt: string;
  interestedServices: string[];
  budgetRange: string;
  status: string;
  noticeStatus?: string | null;
  urgentOverride: boolean;
  urgentReason?: string | null;
  clickupTaskId?: string | null;
  clickupTaskUrl?: string | null;
  clickupSyncStatus?: string | null;
  clickupLastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface SalesHandoffHistoryResponse {
  handoffs?: SalesHandoffHistoryItem[];
}

interface SalesHandoffSyncResponse {
  error?: string;
  summary?: {
    requested: number;
    syncedCount: number;
    failureCount: number;
    statusChangedCount: number;
    overdueBlockedCount: number;
    taskMissingCount: number;
  };
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeStyle(status: string) {
  if (status === "completed" || status === "ready_for_meeting") {
    return {
      background: "var(--success-bg)",
      color: "var(--success-text)",
      border: "1px solid var(--success-border)",
    };
  }

  if (status === "blocked" || status === "cancelled") {
    return {
      background: "var(--danger-bg)",
      color: "var(--danger-text)",
      border: "1px solid var(--danger-border)",
    };
  }

  return {
    background: "var(--warning-bg)",
    color: "var(--warning-text)",
    border: "1px solid var(--warning-border)",
  };
}

function getSyncBadgeStyle(syncStatus: string | null | undefined) {
  if (syncStatus === "synced") {
    return {
      background: "var(--success-bg)",
      color: "var(--success-text)",
      border: "1px solid var(--success-border)",
    };
  }

  if (syncStatus === "failed") {
    return {
      background: "var(--danger-bg)",
      color: "var(--danger-text)",
      border: "1px solid var(--danger-border)",
    };
  }

  return {
    background: "var(--border-subtle)",
    color: "var(--text-3)",
    border: "1px solid var(--border)",
  };
}

export default function SalesHandoffPage() {
  const { toast } = useToast();

  const [form, setForm] = useState<SalesHandoffForm>(INITIAL_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTaskUrl, setCreatedTaskUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [confettiRunId, setConfettiRunId] = useState(0);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>(() =>
    createChaosConfettiPieces(84),
  );
  const [serviceOptions, setServiceOptions] = useState<string[]>(DEFAULT_SERVICE_OPTIONS);
  const [enforce48HourNotice, setEnforce48HourNotice] = useState(true);
  const [allowUrgentOverride, setAllowUrgentOverride] = useState(true);
  const [clickupListConfigured, setClickupListConfigured] = useState(true);
  const [urgentOverride, setUrgentOverride] = useState(false);
  const [urgentReason, setUrgentReason] = useState("");
  const [handoffHistory, setHandoffHistory] = useState<SalesHandoffHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySyncing, setHistorySyncing] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await fetch("/api/tools/sales-handoff?limit=8");
      const data = (await res.json()) as SalesHandoffHistoryResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load handoff history");
      }

      setHandoffHistory(Array.isArray(data.handoffs) ? data.handoffs : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load handoff history";
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const syncHistory = useCallback(async () => {
    setHistorySyncing(true);

    try {
      const res = await fetch("/api/tools/sales-handoff/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      });

      const data = (await res.json()) as SalesHandoffSyncResponse;
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to sync with ClickUp");
      }

      const summary = data.summary;
      if (summary) {
        toast(
          `Synced ${summary.syncedCount}/${summary.requested}. Changed ${summary.statusChangedCount}, failed ${summary.failureCount}.`,
          summary.failureCount > 0 ? "warning" : "success",
        );
      } else {
        toast("Sales handoff sync complete", "success");
      }

      await loadHistory();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync with ClickUp";
      toast(message, "error");
    } finally {
      setHistorySyncing(false);
    }
  }, [loadHistory, toast]);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/tools/sales-handoff/config");
        if (!res.ok) return;

        const data = (await res.json()) as SalesHandoffConfigResponse;
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServiceOptions(data.services);
        }
        setEnforce48HourNotice(parseBooleanSetting(data.enforce48HourNotice, true));
        setAllowUrgentOverride(parseBooleanSetting(data.allowUrgentOverride, true));
        setClickupListConfigured(parseBooleanSetting(data.clickupListConfigured, true));
      } catch {
        // Keep default options when config is unavailable.
      }
    }

    void loadConfig();
    void loadHistory();
  }, [loadHistory]);

  const secondCallAtTimestamp = useMemo(() => {
    if (!form.secondCallAt.trim()) return null;
    const timestamp = new Date(form.secondCallAt).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }, [form.secondCallAt]);

  const noticeHours = useMemo(() => {
    if (secondCallAtTimestamp === null) return null;
    return (secondCallAtTimestamp - Date.now()) / (1000 * 60 * 60);
  }, [secondCallAtTimestamp]);

  const secondCallInPast = useMemo(() => {
    return secondCallAtTimestamp !== null && secondCallAtTimestamp <= Date.now();
  }, [secondCallAtTimestamp]);

  const violatesNoticeWindow = useMemo(() => {
    if (!enforce48HourNotice || noticeHours === null) return false;
    return noticeHours < 48;
  }, [enforce48HourNotice, noticeHours]);

  const requiresUrgentReason = useMemo(() => {
    return enforce48HourNotice && allowUrgentOverride && violatesNoticeWindow && urgentOverride;
  }, [allowUrgentOverride, enforce48HourNotice, urgentOverride, violatesNoticeWindow]);

  const canSubmit = useMemo(() => {
    const hasRequiredFields =
      form.prospectName.trim().length > 0 &&
      form.website.trim().length > 0 &&
      form.targetAudienceSummary.trim().length > 0 &&
      form.secondCallAt.trim().length > 0 &&
      form.budgetRange.trim().length > 0;

    if (!hasRequiredFields || secondCallInPast) return false;

    if (enforce48HourNotice && violatesNoticeWindow) {
      if (!allowUrgentOverride || !urgentOverride) return false;
      if (urgentReason.trim().length === 0) return false;
    }

    if (requiresUrgentReason && urgentReason.trim().length === 0) return false;

    return true;
  }, [
    allowUrgentOverride,
    enforce48HourNotice,
    form,
    requiresUrgentReason,
    secondCallInPast,
    urgentOverride,
    urgentReason,
    violatesNoticeWindow,
  ]);

  useEffect(() => {
    if (!violatesNoticeWindow) {
      setUrgentOverride(false);
      setUrgentReason("");
    }
  }, [violatesNoticeWindow]);

  function update<K extends keyof SalesHandoffForm>(key: K, value: SalesHandoffForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleService(service: string) {
    setForm((prev) => ({
      ...prev,
      interestedServices: prev.interestedServices.includes(service)
        ? prev.interestedServices.filter((item) => item !== service)
        : [...prev.interestedServices, service],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setCreatedTaskUrl(null);

    if (!canSubmit) {
      setFieldError("Please complete all required fields before creating the task.");
      return;
    }

    if (!looksLikeUrl(form.website)) {
      setFieldError("Website must be a valid URL.");
      return;
    }

    if (secondCallAtTimestamp === null) {
      setFieldError("Second call date and time is invalid.");
      return;
    }

    if (secondCallInPast) {
      setFieldError("Second call date and time must be in the future.");
      return;
    }

    if (enforce48HourNotice && noticeHours !== null && noticeHours < 48) {
      if (!allowUrgentOverride) {
        setFieldError("Second call must be at least 48 hours away based on current policy.");
        return;
      }

      if (!urgentOverride) {
        setFieldError(
          "Please mark this handoff as urgent to proceed with less than 48 hours notice.",
        );
        return;
      }

      if (urgentReason.trim().length === 0) {
        setFieldError("Please provide an urgent reason for the reduced notice period.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const res = await fetch("/api/tools/sales-handoff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          ...form,
          urgentOverride,
          urgentReason: urgentOverride ? urgentReason.trim() : "",
          idempotencyKey,
        }),
      });

      const data = (await res.json()) as { error?: string; taskUrl?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create ClickUp task");
      }

      setCreatedTaskUrl(data.taskUrl ?? null);
      setConfettiPieces(createChaosConfettiPieces(84));
      setConfettiRunId((prev) => prev + 1);
      setShowSuccessModal(true);
      setForm(INITIAL_FORM);
      setUrgentOverride(false);
      setUrgentReason("");
      await loadHistory();
      toast("Sales handoff task created in ClickUp", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create ClickUp task";
      setFieldError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ClipboardList style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
              Sales Handoff
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              Capture first-call context and create a ClickUp prep task for marketing.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          marginBottom: 16,
          border: "1px solid var(--warning-border)",
          background: "var(--warning-bg)",
          color: "var(--warning-text)",
          borderRadius: "var(--r)",
          padding: "12px 14px",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {enforce48HourNotice
          ? "Marketing needs at least 48 hours' notice to prepare a plan for a potential client."
          : "Marketing usually prefers 48 hours' notice, but this is currently set as guidance only."}
      </div>

      {!clickupListConfigured && (
        <div
          style={{
            marginBottom: 16,
            border: "1px solid var(--warning-border)",
            background: "var(--warning-bg)",
            color: "var(--warning-text)",
            borderRadius: "var(--r)",
            padding: "12px 14px",
            fontSize: 13,
          }}
        >
          Sales handoff list ID is not configured. Tasks will use the default list until an admin
          sets this in settings.
        </div>
      )}

      {fieldError && (
        <div
          style={{
            marginBottom: 16,
            border: "1px solid var(--danger-border)",
            background: "var(--danger-bg)",
            color: "var(--danger-text)",
            borderRadius: "var(--r)",
            padding: "12px 14px",
            fontSize: 13,
          }}
        >
          {fieldError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="card-body" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Prospect or Company Name</label>
            <input
              className="form-input"
              value={form.prospectName}
              onChange={(e) => update("prospectName", e.target.value)}
              placeholder="Acme Sportswear"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Website URL</label>
            <input
              className="form-input"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://www.example.com"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Target Audience Summary</label>
            <textarea
              className="form-input"
              value={form.targetAudienceSummary}
              onChange={(e) => update("targetAudienceSummary", e.target.value)}
              placeholder="Who are they selling to, and what pain points came up on the call?"
              rows={4}
              required
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Second Call Date and Time</label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.secondCallAt}
              onChange={(e) => update("secondCallAt", e.target.value)}
              required
            />
            {noticeHours !== null && (
              <p
                style={{
                  fontSize: 12,
                  color:
                    secondCallInPast || violatesNoticeWindow
                      ? "var(--danger-text)"
                      : "var(--success-text)",
                }}
              >
                {secondCallInPast
                  ? "Second call must be in the future."
                  : `Notice window: ${noticeHours.toFixed(1)} hours before the second call.`}
              </p>
            )}
            {enforce48HourNotice && violatesNoticeWindow && (
              <p style={{ fontSize: 12, color: "var(--danger-text)", marginTop: -2 }}>
                This is below the 48-hour minimum notice policy.
              </p>
            )}
          </div>

          {enforce48HourNotice && violatesNoticeWindow && allowUrgentOverride && (
            <div
              style={{
                display: "grid",
                gap: 8,
                border: "1px solid var(--warning-border)",
                background: "var(--warning-bg)",
                borderRadius: "var(--r)",
                padding: 12,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--warning-text)",
                  fontWeight: 600,
                }}
              >
                <input
                  type="checkbox"
                  checked={urgentOverride}
                  onChange={(e) => setUrgentOverride(e.target.checked)}
                />
                Mark as urgent override
              </label>
              <p style={{ fontSize: 12, color: "var(--warning-text)", marginTop: -2 }}>
                Use this only when the second call timing cannot be moved.
              </p>
              {urgentOverride && (
                <div style={{ display: "grid", gap: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Urgent reason
                  </label>
                  <textarea
                    className="form-input"
                    value={urgentReason}
                    onChange={(e) => setUrgentReason(e.target.value)}
                    placeholder="Why does this need to proceed with less than 48 hours notice?"
                    rows={3}
                    required={requiresUrgentReason}
                  />
                </div>
              )}
            </div>
          )}

          {enforce48HourNotice && violatesNoticeWindow && !allowUrgentOverride && (
            <div
              style={{
                border: "1px solid var(--danger-border)",
                background: "var(--danger-bg)",
                color: "var(--danger-text)",
                borderRadius: "var(--r)",
                padding: "10px 12px",
                fontSize: 12,
              }}
            >
              Urgent override is disabled by policy. Move the second call to at least 48 hours from
              now.
            </div>
          )}

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Budget Range</label>
            <input
              className="form-input"
              value={form.budgetRange}
              onChange={(e) => update("budgetRange", e.target.value)}
              placeholder="e.g. GBP 3,000 to 5,000 per month"
              required
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label className="form-label">Services They Might Be Interested In</label>
            <div style={{ display: "grid", gap: 8 }}>
              {serviceOptions.map((service) => {
                const checked = form.interestedServices.includes(service);
                return (
                  <label
                    key={service}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "var(--text-2)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(service)}
                    />
                    <span>{service}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="form-label">Other Information</label>
            <textarea
              className="form-input"
              value={form.otherInformation}
              onChange={(e) => update("otherInformation", e.target.value)}
              placeholder="Add anything useful from the call: goals, timelines, blockers, decision-makers."
              rows={4}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !canSubmit}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating task...
                </>
              ) : (
                "Create ClickUp Task"
              )}
            </button>
          </div>
        </div>
      </form>

      <div className="card" style={{ marginTop: 20 }}>
        <div
          className="card-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2 className="card-title">Recent Handoffs</h2>
            <p className="card-subtitle">
              Latest submitted handoffs with local lifecycle and ClickUp sync status.
            </p>
          </div>
          <div style={{ display: "inline-flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                void syncHistory();
              }}
              disabled={historySyncing || historyLoading}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {historySyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sync with ClickUp
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                void loadHistory();
              }}
              disabled={historyLoading || historySyncing}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refresh
            </button>
          </div>
        </div>
        <div className="card-body">
          {historyLoading ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>Loading handoff history…</p>
          ) : historyError ? (
            <p style={{ fontSize: 13, color: "var(--danger-text)" }}>{historyError}</p>
          ) : handoffHistory.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No handoffs submitted yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {handoffHistory.map((handoff) => (
                <div
                  key={handoff.id}
                  style={{
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r)",
                    padding: "12px 14px",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 240, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                        {handoff.prospectName}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-3)" }}>
                        Created {formatDateTime(handoff.createdAt)} · Second call{" "}
                        {formatDateTime(handoff.secondCallAt)}
                      </p>
                      <a
                        href={handoff.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          marginTop: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: "var(--accent)",
                        }}
                      >
                        {handoff.website} <ExternalLink style={{ width: 12, height: 12 }} />
                      </a>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                        justifyContent: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          ...getStatusBadgeStyle(handoff.status),
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatStatusLabel(handoff.status)}
                      </span>
                      <span
                        style={{
                          ...getSyncBadgeStyle(handoff.clickupSyncStatus),
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ClickUp {formatStatusLabel(handoff.clickupSyncStatus ?? "not_synced")}
                      </span>
                      {handoff.clickupTaskUrl && (
                        <a
                          href={handoff.clickupTaskUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          Open task <ExternalLink style={{ width: 12, height: 12 }} />
                        </a>
                      )}
                    </div>
                  </div>

                  {handoff.noticeStatus && (
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-3)" }}>
                      {handoff.noticeStatus}
                    </p>
                  )}
                  {handoff.clickupLastSyncedAt && (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-3)" }}>
                      Last synced {formatDateTime(handoff.clickupLastSyncedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Task Created"
        description="Your sales handoff task is now live in ClickUp."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
            {createdTaskUrl && (
              <a
                href={createdTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                }}
              >
                Open ClickUp Task <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            )}
          </>
        }
      >
        <div
          style={{
            position: "relative",
            minHeight: 250,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--r-lg)",
            background:
              "linear-gradient(160deg, rgba(239,68,68,0.08), rgba(59,130,246,0.06) 45%, rgba(250,204,21,0.08))",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            padding: "24px 16px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {confettiPieces.map((piece) => (
              <span
                key={`${confettiRunId}-${piece.id}`}
                style={{
                  position: "absolute",
                  top: -24,
                  left: `${piece.left}%`,
                  width: piece.size,
                  height: piece.shape === "pill" ? Math.max(4, piece.size * 0.45) : piece.size,
                  borderRadius: piece.shape === "pill" ? 999 : 2,
                  background: piece.color,
                  opacity: 0.95,
                  transform: `rotate(${piece.rotateDeg}deg)`,
                  animation: `salesHandoffConfettiFall ${piece.durationMs}ms cubic-bezier(0.18, 0.82, 0.35, 1) ${piece.delayMs}ms forwards`,
                }}
              />
            ))}
          </div>

          <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 420 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                margin: "0 auto 14px",
                display: "grid",
                placeItems: "center",
                color: "white",
                background: "linear-gradient(135deg, #ef4444, #f97316 52%, #facc15)",
                boxShadow: "0 14px 32px rgba(239, 68, 68, 0.38)",
                animation: "salesHandoffChaosPulse 1.4s ease-in-out infinite",
              }}
            >
              <Sparkles style={{ width: 30, height: 30 }} />
            </div>

            <h3
              style={{
                margin: "0 0 8px",
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text)",
                lineHeight: 1.2,
              }}
            >
              Sales Handoff Created
            </h3>

            <p style={{ margin: 0, fontSize: 14, color: "var(--text-2)", lineHeight: 1.55 }}>
              Marketing has everything they need. Open the task to see the brief and track checklist
              progress.
            </p>
          </div>

          <style>{`
            @keyframes salesHandoffConfettiFall {
              0% {
                transform: translateY(-18px) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(330px) rotate(520deg);
                opacity: 0;
              }
            }
            @keyframes salesHandoffChaosPulse {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.08);
              }
            }
          `}</style>
        </div>
      </Modal>
    </div>
  );
}
