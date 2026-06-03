"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  Plus,
  Settings,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import {
  SalesHandoffPipelineBoard,
  type SalesHandoffStatus,
} from "@/components/sales-handoff/SalesHandoffPipelineBoard";
import {
  type SalesHandoffComment,
  SalesHandoffDetailDrawer as SalesHandoffDrawer,
  type SalesHandoffDetail,
} from "@/components/sales-handoff/SalesHandoffDetailDrawer";
import { SalesHandoffSettingsPanel } from "@/components/sales-handoff/SalesHandoffSettingsPanel";
import { MetricCard } from "@/components/ui/MetricCard";
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
  client?: {
    id: string;
    name: string;
    slug: string;
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
  handoff?: SalesHandoffDetail;
  warning?: {
    code: "clickup_status_push_failed";
    message: string;
    attemptedStatuses: string[];
    errorMessage: string;
  };
}

interface SalesHandoffDetailResponse {
  error?: string;
  handoff?: SalesHandoffDetail;
}

interface SalesHandoffCommentsResponse {
  error?: string;
  comments?: SalesHandoffComment[];
  comment?: SalesHandoffComment;
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

function formatBoardRefreshLabel(value: number | null): string | null {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function mapDetailToHistoryItem(detail: SalesHandoffDetail): SalesHandoffHistoryItem {
  return {
    id: detail.id,
    prospectName: detail.prospectName,
    website: detail.website,
    secondCallAt: detail.secondCallAt,
    interestedServices: detail.interestedServices,
    budgetRange: detail.budgetRange,
    status: detail.status,
    noticeStatus: detail.noticeStatus,
    urgentOverride: detail.urgentOverride,
    urgentReason: detail.urgentReason,
    clickupTaskId: detail.clickupTaskId,
    clickupTaskUrl: detail.clickupTaskUrl,
    clickupSyncStatus: detail.clickupSyncStatus,
    clickupLastSyncedAt: detail.clickupLastSyncedAt,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    owner: detail.owner,
    client: detail.client,
  };
}

export default function SalesHandoffPage() {
  const { toast } = useToast();

  const [form, setForm] = useState<SalesHandoffForm>(INITIAL_FORM);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTaskUrl, setCreatedTaskUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [formStep, setFormStep] = useState(1);

  const [serviceOptions, setServiceOptions] = useState<string[]>(DEFAULT_SERVICE_OPTIONS);
  const [enforce48HourNotice, setEnforce48HourNotice] = useState(true);
  const [allowUrgentOverride, setAllowUrgentOverride] = useState(true);
  const [urgentOverride, setUrgentOverride] = useState(false);
  const [urgentReason, setUrgentReason] = useState("");

  const [handoffHistory, setHandoffHistory] = useState<SalesHandoffHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySyncing, setHistorySyncing] = useState(false);
  const [historyLastLoadedAt, setHistoryLastLoadedAt] = useState<number | null>(null);
  const [historyUpdatingId, setHistoryUpdatingId] = useState<string | null>(null);
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);
  const [selectedHandoffDetail, setSelectedHandoffDetail] = useState<SalesHandoffDetail | null>(
    null,
  );
  const [selectedHandoffLoading, setSelectedHandoffLoading] = useState(false);
  const [selectedHandoffError, setSelectedHandoffError] = useState<string | null>(null);
  const [selectedHandoffComments, setSelectedHandoffComments] = useState<SalesHandoffComment[]>([]);
  const [selectedHandoffCommentsLoading, setSelectedHandoffCommentsLoading] = useState(false);
  const [selectedHandoffCommentsError, setSelectedHandoffCommentsError] = useState<string | null>(
    null,
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const syncInFlightRef = useRef(false);

  const upsertHandoffHistoryItem = useCallback((nextHandoff: SalesHandoffHistoryItem) => {
    setHandoffHistory((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === nextHandoff.id);
      if (existingIndex === -1) {
        return [nextHandoff, ...prev];
      }

      const nextItems = [...prev];
      nextItems[existingIndex] = nextHandoff;
      return nextItems;
    });
  }, []);

  const loadHistory = useCallback(async (options?: { background?: boolean }) => {
    if (!options?.background) {
      setHistoryLoading(true);
    }
    setHistoryError(null);

    try {
      const res = await fetch("/api/tools/sales-handoff?limit=120");
      const data = (await res.json()) as SalesHandoffHistoryResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load handoff history");
      }

      setHandoffHistory(Array.isArray(data.handoffs) ? data.handoffs : []);
      setHistoryLastLoadedAt(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load handoff history";
      setHistoryError(message);
    } finally {
      if (!options?.background) {
        setHistoryLoading(false);
      }
    }
  }, []);

  const selectedHandoffSummary = useMemo(
    () => handoffHistory.find((handoff) => handoff.id === selectedHandoffId) ?? null,
    [handoffHistory, selectedHandoffId],
  );

  const applyPatchedHandoff = useCallback(
    (detail: SalesHandoffDetail, options?: { syncNotesDraft?: boolean }) => {
      upsertHandoffHistoryItem(mapDetailToHistoryItem(detail));
      if (selectedHandoffId === detail.id) {
        setSelectedHandoffDetail(detail);
        if (options?.syncNotesDraft) {
          setNotesDraft(detail.notes ?? "");
        }
      }
    },
    [selectedHandoffId, upsertHandoffHistoryItem],
  );

  const patchHandoff = useCallback(
    async (
      handoffId: string,
      payload: Record<string, unknown>,
      options?: { syncNotesDraft?: boolean },
    ) => {
      const res = await fetch(`/api/tools/sales-handoff/${handoffId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as SalesHandoffPatchResponse;
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update sales handoff");
      }

      if (data.handoff) {
        applyPatchedHandoff(data.handoff, options);
      }

      return data;
    },
    [applyPatchedHandoff],
  );

  const syncHistory = useCallback(
    async (options?: { background?: boolean; silent?: boolean }) => {
      if (syncInFlightRef.current) return;

      syncInFlightRef.current = true;
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
        if (!options?.silent && summary) {
          toast(
            `Synced ${summary.syncedCount}/${summary.requested}. Changed ${summary.statusChangedCount}, failed ${summary.failureCount}.`,
            summary.failureCount > 0 ? "warning" : "success",
          );
        } else if (!options?.silent) {
          toast("Sales handoff sync complete", "success");
        }

        await loadHistory({ background: options?.background ?? true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to sync with ClickUp";
        if (!options?.silent) {
          toast(message, "error");
        }
      } finally {
        syncInFlightRef.current = false;
        setHistorySyncing(false);
      }
    },
    [loadHistory, toast],
  );

  const updateHandoffStatus = useCallback(
    async (handoffId: string, status: SalesHandoffStatus) => {
      setHistoryUpdatingId(handoffId);

      try {
        const data = await patchHandoff(handoffId, { status });

        if (data.warning) {
          const attemptedStatuses = data.warning.attemptedStatuses.join(", ");
          toast(
            `${data.warning.message} Tried ClickUp statuses: ${attemptedStatuses}. ${data.warning.errorMessage}`,
            "warning",
          );
        } else {
          toast(`Moved handoff to ${formatStatusLabel(status)}`, "success");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update sales handoff status";
        toast(message, "error");
      } finally {
        setHistoryUpdatingId(null);
      }
    },
    [patchHandoff, toast],
  );

  const saveSelectedNotes = useCallback(async () => {
    if (!selectedHandoffId) return;

    setNotesSaving(true);
    try {
      await patchHandoff(
        selectedHandoffId,
        {
          notes: notesDraft.trim() ? notesDraft.trim() : null,
        },
        { syncNotesDraft: true },
      );
      toast("Notes saved", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save handoff notes";
      toast(message, "error");
    } finally {
      setNotesSaving(false);
    }
  }, [notesDraft, patchHandoff, selectedHandoffId, toast]);

  const loadSelectedHandoffComments = useCallback(async (handoffId: string) => {
    setSelectedHandoffCommentsLoading(true);
    setSelectedHandoffCommentsError(null);

    try {
      const res = await fetch(`/api/tools/sales-handoff/${handoffId}/comments`);
      const data = (await res.json()) as SalesHandoffCommentsResponse;

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load ClickUp comments");
      }

      setSelectedHandoffComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load ClickUp comments";
      setSelectedHandoffCommentsError(message);
    } finally {
      setSelectedHandoffCommentsLoading(false);
    }
  }, []);

  const sendSelectedHandoffComment = useCallback(async () => {
    if (!selectedHandoffId || commentDraft.trim().length === 0) return;

    setCommentSending(true);
    try {
      const res = await fetch(`/api/tools/sales-handoff/${selectedHandoffId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: commentDraft.trim() }),
      });

      const data = (await res.json()) as SalesHandoffCommentsResponse;
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send ClickUp comment");
      }

      if (data.comment) {
        setSelectedHandoffComments((prev) => [...prev, data.comment as SalesHandoffComment]);
      }
      setCommentDraft("");
      toast("Comment sent to ClickUp", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send ClickUp comment";
      toast(message, "error");
    } finally {
      setCommentSending(false);
    }
  }, [commentDraft, selectedHandoffId, toast]);

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
      } catch {
        // Keep defaults when config cannot be read.
      }
    }

    void loadConfig();
    void loadHistory();
    void syncHistory({ background: true, silent: true });
  }, [loadHistory, syncHistory]);

  useEffect(() => {
    function triggerBackgroundSync() {
      void syncHistory({ background: true, silent: true });
    }

    const interval = window.setInterval(triggerBackgroundSync, 5 * 60 * 1000);
    const handleFocus = () => triggerBackgroundSync();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerBackgroundSync();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncHistory]);

  useEffect(() => {
    if (!selectedHandoffId) {
      setSelectedHandoffDetail(null);
      setSelectedHandoffError(null);
      setSelectedHandoffLoading(false);
      setSelectedHandoffComments([]);
      setSelectedHandoffCommentsError(null);
      setSelectedHandoffCommentsLoading(false);
      setCommentDraft("");
      setNotesDraft("");
      return;
    }

    let cancelled = false;

    async function loadHandoffDetail() {
      setSelectedHandoffLoading(true);
      setSelectedHandoffError(null);

      try {
        const res = await fetch(`/api/tools/sales-handoff/${selectedHandoffId}`);
        const data = (await res.json()) as SalesHandoffDetailResponse;

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load sales handoff details");
        }

        if (cancelled) return;
        setSelectedHandoffDetail(data.handoff ?? null);
        setNotesDraft(data.handoff?.notes ?? "");
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load sales handoff details";
        setSelectedHandoffError(message);
      } finally {
        if (!cancelled) {
          setSelectedHandoffLoading(false);
        }
      }
    }

    void loadHandoffDetail();
    void loadSelectedHandoffComments(selectedHandoffId);

    return () => {
      cancelled = true;
    };
  }, [loadSelectedHandoffComments, selectedHandoffId]);

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

  const requestReadiness = useMemo(() => {
    if (secondCallInPast) {
      return {
        label: "Fix the call timing",
        tone: "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-900/50",
      };
    }

    if (enforce48HourNotice && violatesNoticeWindow && !urgentOverride) {
      return {
        label: "Urgent override required",
        tone: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900/50",
      };
    }

    if (canSubmit) {
      return {
        label: "Ready to request",
        tone: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900/50",
      };
    }

    return {
      label: "Complete the key fields",
      tone: "text-zinc-700 bg-zinc-50 border-zinc-200 dark:text-zinc-300 dark:bg-zinc-900 dark:border-zinc-800",
    };
  }, [canSubmit, enforce48HourNotice, secondCallInPast, urgentOverride, violatesNoticeWindow]);

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
      await loadHistory({ background: true });
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
      {/* ═════ HEADER ═════ */}
      <div className="mb-8 space-y-6">
        {/* Title + CTA */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-1">
            <h1 className="page-title">Sales Requests</h1>
            <p className="page-desc">Manage prospect briefs and track marketing delivery</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsPanel(true)}
              className="btn btn-secondary btn-sm"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setFieldError(null);
                setShowCreateModal(true);
                setFormStep(1);
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              New Request
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard
            title="Total"
            value={handoffHistory.length}
            icon={<ClipboardList className="h-5 w-5" />}
            color="purple"
            loading={historyLoading}
          />
          <MetricCard
            title="In Progress"
            value={handoffHistory.filter((h) => h.status === "plan_in_progress").length}
            icon={<Zap className="h-5 w-5" />}
            color="orange"
            loading={historyLoading}
          />
          <MetricCard
            title="Completed"
            value={handoffHistory.filter((h) => h.status === "won").length}
            icon={<Check className="h-5 w-5" />}
            color="green"
            loading={historyLoading}
          />
          <MetricCard
            title="Synced"
            value={handoffHistory.filter((h) => h.clickupTaskId).length}
            icon={<ExternalLink className="h-5 w-5" />}
            color="blue"
            loading={historyLoading}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <SalesHandoffPipelineBoard
        handoffs={handoffHistory}
        loading={historyLoading}
        error={historyError}
        syncing={historySyncing}
        lastSyncedLabel={formatBoardRefreshLabel(historyLastLoadedAt)}
        updatingId={historyUpdatingId}
        onOpenHandoff={(handoff) => {
          setSelectedHandoffId(handoff.id);
        }}
        onStatusChange={updateHandoffStatus}
      />

      <SalesHandoffSettingsPanel
        open={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
      />

      <SalesHandoffDrawer
        open={!!selectedHandoffId}
        loading={selectedHandoffLoading}
        error={selectedHandoffError}
        handoff={selectedHandoffSummary}
        detail={selectedHandoffDetail}
        comments={selectedHandoffComments}
        commentsLoading={selectedHandoffCommentsLoading}
        commentsError={selectedHandoffCommentsError}
        commentDraft={commentDraft}
        commentSending={commentSending}
        notesDraft={notesDraft}
        notesSaving={notesSaving}
        statusUpdating={historyUpdatingId === selectedHandoffId}
        onClose={() => setSelectedHandoffId(null)}
        onCommentChange={setCommentDraft}
        onSendComment={() => {
          void sendSelectedHandoffComment();
        }}
        onNotesChange={setNotesDraft}
        onSaveNotes={() => {
          void saveSelectedNotes();
        }}
        onStatusChange={(status) => {
          if (!selectedHandoffId) return;
          void updateHandoffStatus(selectedHandoffId, status);
        }}
      />

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormStep(1);
          setFieldError(null);
        }}
        title={
          <span className="inline-flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-indigo-500 uppercase dark:text-indigo-400">
                New Request
              </p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Prospect Brief
              </p>
            </div>
          </span>
        }
        description="Build a complete prospect profile step by step."
        size="xl"
        footer={null}
      >
        <div className="space-y-8">
          {/* Info Box */}
          <div className="flex gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              <Info className="h-3.5 w-3.5" />
            </div>
            <div className="text-xs leading-relaxed">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">Notice requirement</p>
              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                {enforce48HourNotice
                  ? "Marketing needs 48 hours to prepare."
                  : "Marketing usually needs 48 hours notice."}
              </p>
            </div>
          </div>

          {/* Error Box */}
          {fieldError ? (
            <div className="flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 dark:border-rose-900/50 dark:bg-rose-950/30">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-xs text-rose-700 dark:text-rose-200">{fieldError}</p>
            </div>
          ) : null}
        </div>

        <form id="sales-handoff-form" onSubmit={handleSubmit} className="mt-12 space-y-14">
          {/* Stepper progress */}
          <div className="flex items-center gap-1.5 pt-3" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  step < formStep
                    ? "bg-indigo-500"
                    : step === formStep
                      ? "bg-indigo-500"
                      : "bg-zinc-200 dark:bg-zinc-800",
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={formStep}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pb-4"
            >
              {/* STEP 1: Client Context */}
              {formStep === 1 && (
                <div className="flex flex-col">
                  <p className="py-2.5 text-[11px] font-semibold tracking-wide text-indigo-500 uppercase dark:text-indigo-400">
                    Step 1 of 6
                  </p>

                  <div aria-hidden="true" className="h-2.5" />

                  <h2 className="py-2.5 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Who&apos;s the prospect?
                  </h2>

                  <div aria-hidden="true" className="h-2.5" />

                  <p className="py-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                    Company name and website to get started.
                  </p>

                  <div aria-hidden="true" className="h-2.5" />

                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      <Building2 className="h-4 w-4 text-indigo-400" />
                      <span>Company name</span>
                    </label>
                    <div aria-hidden="true" className="h-2.5" />
                    <input
                      className="form-input"
                      value={form.prospectName}
                      onChange={(event) => update("prospectName", event.target.value)}
                      placeholder="Local Gym Chain"
                      required
                      autoFocus
                    />
                  </div>

                  <div aria-hidden="true" className="h-2.5" />

                  <div className="flex flex-col">
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      <Globe className="h-4 w-4 text-indigo-400" />
                      <span>Website</span>
                    </label>
                    <div aria-hidden="true" className="h-2.5" />
                    <input
                      className="form-input"
                      value={form.website}
                      onChange={(event) => update("website", event.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                  </div>

                  <div aria-hidden="true" className="h-2.5" />
                </div>
              )}

              {/* STEP 2: Target Audience */}
              {formStep === 2 && (
                <div className="space-y-14">
                  <div className="space-y-5">
                    <p className="text-[11px] font-semibold tracking-wide text-indigo-500 uppercase dark:text-indigo-400">
                      Step 2 of 6
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Target audience
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Who are they selling to and what pain points came up?
                    </p>
                  </div>

                  <div className="grid gap-7">
                    <label className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      <Users className="h-4 w-4 text-indigo-400" />
                      <span>Audience description</span>
                    </label>
                    <textarea
                      className="form-input min-h-24 leading-relaxed"
                      value={form.targetAudienceSummary}
                      onChange={(event) => update("targetAudienceSummary", event.target.value)}
                      placeholder="Describe who they sell to and key pain points..."
                      rows={5}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Timing & Budget */}
              {formStep === 3 && (
                <div className="space-y-14">
                  <div className="space-y-5">
                    <p className="text-[11px] font-semibold tracking-wide text-indigo-500 uppercase dark:text-indigo-400">
                      Step 3 of 6
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Timeline and budget
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      When&apos;s the second call and what&apos;s the budget range?
                    </p>
                  </div>

                  <div className="space-y-12">
                    <div className="grid gap-7">
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        <CalendarClock className="h-4 w-4 text-indigo-400" />
                        <span>Second call date and time</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={form.secondCallAt}
                        onChange={(event) => update("secondCallAt", event.target.value)}
                        required
                        autoFocus
                      />
                      {noticeHours !== null && (
                        <p
                          className={cn(
                            "text-xs font-medium",
                            secondCallInPast || violatesNoticeWindow
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {secondCallInPast
                            ? "⚠️ Date must be in the future"
                            : `✓ ${noticeHours.toFixed(1)} hours notice`}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-7">
                      <label className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        <Wallet className="h-4 w-4 text-indigo-400" />
                        <span>Budget range per month</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-500">
                            £
                          </span>
                          <input
                            type="number"
                            className="form-input pl-7"
                            value={form.budgetRange.split("-")[0]?.trim() || ""}
                            onChange={(event) => {
                              const min = event.target.value;
                              const max = form.budgetRange.split("-")[1]?.trim() || "";
                              update("budgetRange", max ? `${min} - ${max}` : min);
                            }}
                            placeholder="3000"
                            required
                          />
                        </div>
                        <span className="text-xs text-zinc-500">to</span>
                        <div className="relative flex-1">
                          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-500">
                            £
                          </span>
                          <input
                            type="number"
                            className="form-input pl-7"
                            value={form.budgetRange.split("-")[1]?.trim() || ""}
                            onChange={(event) => {
                              const min = form.budgetRange.split("-")[0]?.trim() || "";
                              const max = event.target.value;
                              update("budgetRange", min ? `${min} - ${max}` : max);
                            }}
                            placeholder="5000"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {enforce48HourNotice && violatesNoticeWindow && allowUrgentOverride && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded accent-amber-600"
                            checked={urgentOverride}
                            onChange={(event) => setUrgentOverride(event.target.checked)}
                          />
                          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Mark as urgent
                          </span>
                        </label>
                        <p className="mt-2 ml-6 text-xs text-amber-800 dark:text-amber-200/90">
                          Use only if timing can&apos;t be moved
                        </p>
                      </div>
                    )}

                    {urgentOverride && (
                      <div className="grid gap-7">
                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Why is this urgent?
                        </label>
                        <textarea
                          className="form-input min-h-20 leading-relaxed"
                          value={urgentReason}
                          onChange={(event) => setUrgentReason(event.target.value)}
                          placeholder="Explain why this can't wait..."
                          rows={3}
                          required={requiresUrgentReason}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: Services */}
              {formStep === 4 && (
                <div className="space-y-14">
                  <div className="space-y-5">
                    <p className="text-[11px] font-semibold tracking-wide text-indigo-500 uppercase dark:text-indigo-400">
                      Step 4 of 6
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Services interested in
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Select all that apply.
                    </p>
                  </div>

                  <div className="grid gap-7">
                    {serviceOptions.map((service) => {
                      const checked = form.interestedServices.includes(service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => toggleService(service)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all",
                            checked
                              ? "border-indigo-300 bg-indigo-50 text-indigo-900 shadow-sm dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-100"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-800/50 dark:hover:bg-indigo-950/20",
                          )}
                        >
                          <span>{service}</span>
                          {checked && (
                            <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 5: Planning Notes (REQUIRED) */}
              {formStep === 5 && (
                <div className="space-y-14">
                  <div className="space-y-5">
                    <p className="text-[11px] font-semibold tracking-wide text-indigo-500 uppercase dark:text-indigo-400">
                      Step 5 of 6
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Planning notes
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Provide context for the marketing team.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      What should we know?
                    </label>
                    <textarea
                      className="form-input min-h-28 leading-relaxed"
                      value={form.otherInformation}
                      onChange={(event) => update("otherInformation", event.target.value)}
                      placeholder="Goals, timelines, blockers, competitors, budget notes, launch date, anything relevant..."
                      rows={6}
                      required
                    />
                    {form.otherInformation.length > 0 && (
                      <p className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                        {form.otherInformation.length} chars
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 6: Review */}
              {formStep === 6 && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold tracking-wide text-indigo-500 uppercase dark:text-indigo-400">
                      Step 6 of 6
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Review and send
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Check everything looks right before sending to marketing.
                    </p>
                  </div>

                  <div
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium",
                      requestReadiness.tone,
                    )}
                  >
                    {requestReadiness.label}
                  </div>

                  <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        Prospect
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {form.prospectName}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        Website
                      </p>
                      <p className="mt-1 text-sm break-all text-zinc-700 dark:text-zinc-300">
                        {form.website}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                          Budget
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          £{form.budgetRange}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                          Call
                        </p>
                        <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                          {form.secondCallAt ? "Scheduled" : "—"}
                        </p>
                      </div>
                    </div>

                    {form.interestedServices.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                          Services
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {form.interestedServices.map((service) => (
                            <span
                              key={service}
                              className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div aria-hidden="true" className="h-2.5" />

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            {formStep > 1 && (
              <button
                type="button"
                onClick={() => setFormStep(formStep - 1)}
                className="btn btn-ghost btn-sm"
              >
                ← Back
              </button>
            )}
            <div className="flex-1" />
            {formStep < 6 ? (
              <button
                type="button"
                onClick={() => setFormStep(formStep + 1)}
                disabled={
                  (formStep === 1 && (!form.prospectName.trim() || !form.website.trim())) ||
                  (formStep === 2 && !form.targetAudienceSummary.trim()) ||
                  (formStep === 3 &&
                    (!form.secondCallAt.trim() || !form.budgetRange.trim() || secondCallInPast)) ||
                  (formStep === 4 && form.interestedServices.length === 0) ||
                  (formStep === 5 && !form.otherInformation.trim())
                }
                className="btn btn-primary btn-sm"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="btn btn-primary btn-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Send to Marketing
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Request Sent"
        description="Your prospect brief is now in ClickUp for marketing."
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
            {createdTaskUrl ? (
              <a
                href={createdTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                Open in ClickUp <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </>
        }
      >
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Brief sent successfully
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-200/90">
                Marketing is now building your prospect plan and tracking it through the pipeline.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
