"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  ClipboardList,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  MessageSquareText,
  Plus,
  ShieldAlert,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import {
  SalesHandoffPipelineBoard,
  type SalesHandoffStatus,
} from "@/components/sales-handoff/SalesHandoffPipelineBoard";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface SalesHandoffForm {
  prospectName: string;
  website: string;
  targetAudienceSummary: string;
  secondCallAt: string;
  interestedServices: string[];
  budgetRange: string;
  otherInformation: string;
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
  status: SalesHandoffStatus;
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

interface SalesHandoffPatchResponse {
  error?: string;
  warning?: string;
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

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function SalesHandoffPage() {
  const { toast } = useToast();

  const [form, setForm] = useState<SalesHandoffForm>(INITIAL_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTaskUrl, setCreatedTaskUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
  const [historyUpdatingId, setHistoryUpdatingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const res = await fetch("/api/tools/sales-handoff?limit=120");
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
        body: JSON.stringify({ limit: 120 }),
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

  const updateHandoffStatus = useCallback(
    async (handoffId: string, status: SalesHandoffStatus) => {
      setHistoryUpdatingId(handoffId);

      try {
        const res = await fetch(`/api/tools/sales-handoff/${handoffId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        const data = (await res.json()) as SalesHandoffPatchResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to update sales handoff status");
        }

        if (data.warning) {
          toast(data.warning, "warning");
        } else {
          toast(`Moved handoff to ${formatStatusLabel(status)}`, "success");
        }

        await loadHistory();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update sales handoff status";
        toast(message, "error");
      } finally {
        setHistoryUpdatingId(null);
      }
    },
    [loadHistory, toast],
  );

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
        // Keep defaults when config cannot be read.
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
      setShowCreateModal(false);
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
    <div className="page max-w-350">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 to-violet-500 text-white shadow-sm shadow-indigo-500/20">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="page-title">Sales Handoff</h1>
            <p className="page-desc">
              Capture first-call context and manage pipeline handoffs to marketing.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFieldError(null);
            setShowCreateModal(true);
          }}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Handoff
        </button>
      </div>

      {!clickupListConfigured ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
          <p>
            Sales handoff list ID is not configured. Tasks will use the default list until an admin
            sets this in settings.
          </p>
        </div>
      ) : null}

      <SalesHandoffPipelineBoard
        handoffs={handoffHistory}
        loading={historyLoading}
        error={historyError}
        syncing={historySyncing}
        updatingId={historyUpdatingId}
        onSync={() => {
          void syncHistory();
        }}
        onRefresh={() => {
          void loadHistory();
        }}
        onStatusChange={updateHandoffStatus}
      />

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Handoff"
        description="Turn first-call notes into a tracked delivery workflow."
        size="xl"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="sales-handoff-form"
              className="btn btn-primary inline-flex items-center gap-2"
              disabled={submitting || !canSubmit}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {submitting ? "Creating task…" : "Create ClickUp Task"}
            </button>
          </>
        }
      >
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
            <p>
              {enforce48HourNotice
                ? "Marketing needs at least 48 hours notice to prepare a plan for a potential client."
                : "Marketing usually prefers 48 hours notice, but this is currently guidance only."}
            </p>
          </div>

          {fieldError ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <p>{fieldError}</p>
            </div>
          ) : null}
        </div>

        <form id="sales-handoff-form" onSubmit={handleSubmit} className="mt-4 grid gap-5">
          <div className="grid gap-1.5">
            <label className="form-label flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-zinc-400" />
              Prospect or company name
            </label>
            <input
              className="form-input"
              value={form.prospectName}
              onChange={(event) => update("prospectName", event.target.value)}
              placeholder="Acme Sportswear"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className="form-label flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-zinc-400" />
              Website URL
            </label>
            <input
              className="form-input"
              value={form.website}
              onChange={(event) => update("website", event.target.value)}
              placeholder="https://www.example.com"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className="form-label flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-zinc-400" />
              Target audience summary
            </label>
            <textarea
              className="form-input"
              value={form.targetAudienceSummary}
              onChange={(event) => update("targetAudienceSummary", event.target.value)}
              placeholder="Who are they selling to, and what pain points came up on the call?"
              rows={4}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label className="form-label flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-zinc-400" />
              Second call date and time
            </label>
            <input
              type="datetime-local"
              className="form-input"
              value={form.secondCallAt}
              onChange={(event) => update("secondCallAt", event.target.value)}
              required
            />
            {noticeHours !== null ? (
              <p
                className={cn(
                  "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  secondCallInPast || violatesNoticeWindow
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {secondCallInPast
                  ? "Second call must be in the future."
                  : `Notice window: ${noticeHours.toFixed(1)} hours before the second call.`}
              </p>
            ) : null}
          </div>

          {enforce48HourNotice && violatesNoticeWindow && allowUrgentOverride ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-amber-600"
                  checked={urgentOverride}
                  onChange={(event) => setUrgentOverride(event.target.checked)}
                />
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Mark as urgent override
                </span>
              </label>
              <p className="mt-1.5 pl-6.5 text-xs text-amber-700 dark:text-amber-300/90">
                Use this only when the second call timing cannot be moved.
              </p>

              {urgentOverride ? (
                <div className="mt-3 grid gap-1.5">
                  <label className="form-label">Urgent reason</label>
                  <textarea
                    className="form-input"
                    value={urgentReason}
                    onChange={(event) => setUrgentReason(event.target.value)}
                    placeholder="Why does this need to proceed with less than 48 hours notice?"
                    rows={3}
                    required={requiresUrgentReason}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {enforce48HourNotice && violatesNoticeWindow && !allowUrgentOverride ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
              <p>
                Urgent override is disabled by policy. Move the second call to at least 48 hours
                from now.
              </p>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <label className="form-label flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-zinc-400" />
              Budget range
            </label>
            <input
              className="form-input"
              value={form.budgetRange}
              onChange={(event) => update("budgetRange", event.target.value)}
              placeholder="e.g. GBP 3,000 to 5,000 per month"
              required
            />
          </div>

          <div className="grid gap-2.5">
            <label className="form-label flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
              Services they might be interested in
            </label>
            <div className="flex flex-wrap gap-2">
              {serviceOptions.map((service) => {
                const checked = form.interestedServices.includes(service);
                return (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    aria-pressed={checked}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      checked
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900",
                    )}
                  >
                    {checked ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 opacity-40" />
                    )}
                    {service}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="form-label flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5 text-zinc-400" />
              Other information
            </label>
            <textarea
              className="form-input"
              value={form.otherInformation}
              onChange={(event) => update("otherInformation", event.target.value)}
              placeholder="Add goals, timelines, blockers, and decision-makers from the call."
              rows={4}
            />
          </div>
        </form>
      </Modal>

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
            {createdTaskUrl ? (
              <a
                href={createdTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary inline-flex items-center gap-2"
              >
                Open ClickUp Task <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </>
        }
      >
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          Task created successfully. Marketing can now track prep activity and sync status from the
          pipeline board.
        </div>
      </Modal>
    </div>
  );
}
