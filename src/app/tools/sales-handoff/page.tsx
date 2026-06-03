"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardList,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  MessageSquareText,
  Plus,
  Settings,
  Sparkles,
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

  const [serviceOptions, setServiceOptions] = useState<string[]>(DEFAULT_SERVICE_OPTIONS);
  const [enforce48HourNotice, setEnforce48HourNotice] = useState(true);
  const [allowUrgentOverride, setAllowUrgentOverride] = useState(true);
  const [urgentOverride, setUrgentOverride] = useState(false);
  const [urgentReason, setUrgentReason] = useState("");
  const [showPlanningNotes, setShowPlanningNotes] = useState(false);

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

  const completedRequiredFields = useMemo(() => {
    return [
      form.prospectName.trim().length > 0,
      form.website.trim().length > 0,
      form.targetAudienceSummary.trim().length > 0,
      form.secondCallAt.trim().length > 0,
      form.budgetRange.trim().length > 0,
    ].filter(Boolean).length;
  }, [form]);

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
      <div className="relative mb-6 overflow-hidden rounded-[28px] border border-indigo-200/60 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,244,255,0.98))] p-6 shadow-[0_24px_80px_-48px_rgba(79,70,229,0.45)] dark:border-indigo-900/40 dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.26),transparent_32%),linear-gradient(135deg,rgba(24,24,34,0.98),rgba(16,18,28,0.98))]">
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/20" />
        <div className="pointer-events-none absolute -bottom-12 left-20 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl dark:bg-cyan-400/10" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-indigo-700 uppercase shadow-sm dark:border-indigo-900/50 dark:bg-zinc-950/60 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              21st-enhanced request flow
            </div>

            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/25">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="page-title">Sales Requests</h1>
                <p className="page-desc max-w-2xl">
                  Capture first-call context, pressure-test readiness, and hand marketing a sharper
                  brief.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Auto-syncs with ClickUp
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                <CalendarClock className="h-3.5 w-3.5 text-sky-500" />
                5-minute background checks
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300">
                <Zap className="h-3.5 w-3.5 text-violet-500" />
                Premium request builder
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsPanel(true)}
              className="btn btn-ghost inline-flex items-center gap-2 border border-white/70 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60"
              aria-label="Open handoff settings"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              type="button"
              onClick={() => {
                setFieldError(null);
                setShowPlanningNotes(false);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 via-violet-500 to-cyan-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              New Request
            </button>
          </div>
        </div>
      </div>

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
        onClose={() => setShowCreateModal(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-500" />
            Create New Request
          </span>
        }
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
              {submitting ? "Sending request..." : "Request a Marketing Plan"}
            </button>
          </>
        }
      >
        <div className="space-y-2.5">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 bg-[linear-gradient(135deg,rgba(99,102,241,0.08),rgba(34,211,238,0.08))] px-4 py-3 dark:border-indigo-900/50 dark:bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(34,211,238,0.08))]">
            <div className="absolute top-0 right-0 h-20 w-20 rounded-full bg-violet-400/10 blur-2xl dark:bg-violet-500/10" />
            <div className="relative flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-200">
              <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-indigo-600 shadow-sm dark:bg-zinc-950/60 dark:text-indigo-300">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Plan intake briefing
                </p>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
                  {enforce48HourNotice
                    ? "Marketing needs at least 48 hours notice to prepare a plan for a potential client."
                    : "Marketing usually prefers 48 hours notice, but this is currently guidance only."}
                </p>
              </div>
            </div>
          </div>

          {fieldError ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <p>{fieldError}</p>
            </div>
          ) : null}
        </div>

        <form
          id="sales-handoff-form"
          onSubmit={handleSubmit}
          className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
        >
          <div className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Client context
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Add the core business details marketing needs before shaping the plan.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      <Building2 className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>Prospect or company name</span>
                    </label>
                    <input
                      className="form-input h-12 px-4 text-sm"
                      value={form.prospectName}
                      onChange={(event) => update("prospectName", event.target.value)}
                      placeholder="Acme Sportswear"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      <Globe className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>Website URL</span>
                    </label>
                    <input
                      className="form-input h-12 px-4 text-sm"
                      value={form.website}
                      onChange={(event) => update("website", event.target.value)}
                      placeholder="https://www.example.com"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      <Users className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>Target audience summary</span>
                    </label>
                    <textarea
                      className="form-input min-h-32 px-4 py-3 text-sm leading-6"
                      value={form.targetAudienceSummary}
                      onChange={(event) => update("targetAudienceSummary", event.target.value)}
                      placeholder="Who are they selling to, and what pain points came up on the call?"
                      rows={4}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Timing and budget
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Confirm the next milestone and the commercial range before the request is sent.
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      <CalendarClock className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>Second call date and time</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-input h-12 px-4 text-sm"
                      value={form.secondCallAt}
                      onChange={(event) => update("secondCallAt", event.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      <Wallet className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>Budget range</span>
                    </label>
                    <input
                      className="form-input h-12 px-4 text-sm"
                      value={form.budgetRange}
                      onChange={(event) => update("budgetRange", event.target.value)}
                      placeholder="e.g. GBP 3,000 to 5,000 per month"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
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
                      className="form-input px-4 py-3"
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

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="grid gap-3">
                <div>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    <Sparkles className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span>Services they might be interested in</span>
                  </label>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
                    Select all that apply. This shapes the plan we put together.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {serviceOptions.map((service) => {
                    const checked = form.interestedServices.includes(service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleService(service)}
                        aria-pressed={checked}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm leading-none font-medium transition-all",
                          checked
                            ? "border-indigo-500 bg-indigo-500 text-white shadow-sm shadow-indigo-500/15 dark:border-indigo-500 dark:bg-indigo-600"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300",
                        )}
                      >
                        {checked && <Check className="h-3.5 w-3.5 shrink-0" />}
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanningNotes((prev) => !prev)}
                  className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        Add planning notes
                      </p>
                      <p
                        className="mt-0.5 text-xs leading-relaxed"
                        style={{ color: "var(--text-2)" }}
                      >
                        Strongly recommended. Goals, blockers, decision-makers, and launch context
                        help marketing shape a better plan.
                      </p>
                    </div>
                  </div>
                  {showPlanningNotes ? (
                    <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  ) : (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  )}
                </button>

                {showPlanningNotes || form.otherInformation.trim().length > 0 ? (
                  <>
                    <div
                      className="flex items-start gap-3 rounded-xl border px-4 py-3"
                      style={{
                        borderColor: "var(--accent-subtle, #c7d2fe)",
                        background: "var(--accent-faint, #eef2ff)",
                      }}
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          The more you share, the better the plan
                        </p>
                        <p
                          className="mt-0.5 text-xs leading-relaxed"
                          style={{ color: "var(--text-2)" }}
                        >
                          Include goals, timelines, blockers, decision-makers, budget sensitivities,
                          and anything else that came up on the call. Marketing uses this to build a
                          tailored strategy. Every detail counts.
                        </p>
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      <MessageSquareText className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span>Other information</span>
                    </label>
                    <textarea
                      className="form-input min-h-36 px-4 py-3 text-sm leading-6"
                      value={form.otherInformation}
                      onChange={(event) => update("otherInformation", event.target.value)}
                      placeholder="e.g. CEO is the decision-maker, they're launching in September, already trialled Google Ads with another agency and had a bad experience, budget is flexible if ROI is proven…"
                      rows={6}
                    />
                    {form.otherInformation.length > 0 && (
                      <p className="text-right text-xs" style={{ color: "var(--text-3)" }}>
                        {form.otherInformation.length} characters
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <aside className="xl:sticky xl:top-0 xl:self-start">
            <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Request summary
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Live view of what marketing will receive.
                </p>
              </div>

              <div
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-semibold",
                  requestReadiness.tone,
                )}
              >
                {requestReadiness.label}
              </div>

              <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                    Prospect
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {form.prospectName.trim() || "Not added yet"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                    Website
                  </p>
                  <p className="mt-1 text-sm break-all text-zinc-700 dark:text-zinc-300">
                    {form.website.trim() || "No website yet"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                      Budget
                    </p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {form.budgetRange.trim() || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                      Call timing
                    </p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {form.secondCallAt.trim() ? "Scheduled" : "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                  Readiness checks
                </p>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Core fields</span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {completedRequiredFields}/5 complete
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    Services selected
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {form.interestedServices.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Planning notes</span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {form.otherInformation.trim().length > 0 ? "Added" : "Recommended"}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase dark:text-zinc-400">
                  Selected services
                </p>
                {form.interestedServices.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {form.interestedServices.map((service) => (
                      <span
                        key={service}
                        className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No services selected yet.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </form>
      </Modal>

      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Request Sent"
        description="Your marketing plan request is now live in ClickUp."
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
        <div className="relative overflow-hidden rounded-2xl border border-indigo-200/60 bg-[linear-gradient(145deg,rgba(99,102,241,0.08),rgba(34,211,238,0.06))] p-5 dark:border-indigo-900/50 dark:bg-[linear-gradient(145deg,rgba(99,102,241,0.16),rgba(34,211,238,0.08))]">
          <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-violet-400/10 blur-2xl dark:bg-violet-500/15" />
          <div className="relative grid gap-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-indigo-600 shadow-sm dark:bg-zinc-950/60 dark:text-indigo-300">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Marketing has the brief
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                The request is in ClickUp, the board will keep itself in sync, and the team can now
                move it through planning and review.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
