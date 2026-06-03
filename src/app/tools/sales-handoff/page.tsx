"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
      {/* ═════ HERO HEADER ═════ */}
      <div className="mb-16 space-y-10">
        {/* Title + CTA */}
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-5xl font-black text-zinc-900 dark:text-zinc-100">Sales Requests</h1>
            <p className="mt-4 max-w-xl text-xl text-zinc-600 dark:text-zinc-400">
              Capture first-call context and hand marketing a sharper, more actionable brief.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowSettingsPanel(true)}
              className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-zinc-300 bg-white px-8 py-4 text-lg font-bold text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
            >
              <Settings className="h-6 w-6" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFieldError(null);
                setShowCreateModal(true);
                setFormStep(1);
              }}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-linear-to-br from-indigo-600 to-indigo-700 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:from-indigo-700 hover:to-indigo-800 dark:from-indigo-500 dark:to-indigo-600"
            >
              <Plus className="h-6 w-6" />
              <span>New Request</span>
            </button>
          </div>
        </div>

        {/* Premium Stats Grid (2x2) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Requests */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-blue-50/50 p-8 transition hover:border-blue-300 dark:border-blue-900/50 dark:from-blue-950/30 dark:to-blue-950/10">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl dark:bg-blue-900/20" />
            <div className="relative space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10 transition group-hover:bg-blue-600/20">
                <ClipboardList className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
                  Total Requests
                </p>
                <p className="mt-3 text-5xl font-black text-blue-900 dark:text-blue-100">
                  {handoffHistory.length}
                </p>
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-amber-200 bg-linear-to-br from-amber-50 to-amber-50/50 p-8 transition hover:border-amber-300 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-amber-950/10">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-amber-100/50 blur-3xl dark:bg-amber-900/20" />
            <div className="relative space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-600/10 transition group-hover:bg-amber-600/20">
                <Zap className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest text-amber-600 uppercase dark:text-amber-400">
                  In Progress
                </p>
                <p className="mt-3 text-5xl font-black text-amber-900 dark:text-amber-100">
                  {handoffHistory.filter((h) => h.status === "delivery_in_progress").length}
                </p>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-emerald-200 bg-linear-to-br from-emerald-50 to-emerald-50/50 p-8 transition hover:border-emerald-300 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-emerald-950/10">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-100/50 blur-3xl dark:bg-emerald-900/20" />
            <div className="relative space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/10 transition group-hover:bg-emerald-600/20">
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                  Completed
                </p>
                <p className="mt-3 text-5xl font-black text-emerald-900 dark:text-emerald-100">
                  {handoffHistory.filter((h) => h.status === "delivery_complete").length}
                </p>
              </div>
            </div>
          </div>

          {/* Synced to ClickUp */}
          <div className="group relative overflow-hidden rounded-3xl border-2 border-violet-200 bg-linear-to-br from-violet-50 to-violet-50/50 p-8 transition hover:border-violet-300 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-violet-950/10">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-violet-100/50 blur-3xl dark:bg-violet-900/20" />
            <div className="relative space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/10 transition group-hover:bg-violet-600/20">
                <ExternalLink className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-widest text-violet-600 uppercase dark:text-violet-400">
                  Synced
                </p>
                <p className="mt-3 text-5xl font-black text-violet-900 dark:text-violet-100">
                  {handoffHistory.filter((h) => h.clickupTaskId).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
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
      </div>

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
          <span className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                New Sales Request
              </p>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Create a Request
              </p>
            </div>
          </span>
        }
        description="Turn first-call notes into a tracked delivery workflow. Step through each section carefully."
        size="2xl"
        footer={null}
      >
        <div className="space-y-4">
          {/* Info Box */}
          <div className="rounded-xl border border-indigo-200/70 bg-indigo-50/50 px-5 py-4 dark:border-indigo-900/40 dark:bg-indigo-950/30">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                <Info className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-indigo-900 dark:text-indigo-100">
                  Plan intake briefing
                </p>
                <p className="mt-1 text-indigo-800 dark:text-indigo-200">
                  {enforce48HourNotice
                    ? "Marketing needs at least 48 hours notice to prepare a plan for a potential client."
                    : "Marketing usually prefers 48 hours notice, but this is currently guidance only."}
                </p>
              </div>
            </div>
          </div>

          {/* Error Box */}
          {fieldError ? (
            <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50/50 px-5 py-4 dark:border-rose-900/40 dark:bg-rose-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-sm text-rose-700 dark:text-rose-200">{fieldError}</p>
            </div>
          ) : null}
        </div>

        <form id="sales-handoff-form" onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* STEP 1: Client Context */}
          {formStep === 1 && (
            <div className="space-y-10">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-100 px-3 py-1 dark:bg-indigo-950/40">
                  <div className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  <p className="text-xs font-bold tracking-widest text-indigo-700 uppercase dark:text-indigo-300">
                    Step 1 of 6
                  </p>
                </div>
                <h2 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  Who&apos;s the prospect?
                </h2>
                <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                  Let&apos;s start with the basics. We&apos;ll build the full brief from here.
                </p>
              </div>

              <div className="space-y-7">
                <div className="grid gap-3">
                  <label className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <span>Company or prospect name</span>
                  </label>
                  <input
                    className="form-input h-16 rounded-xl border border-zinc-200 bg-white px-5 text-lg placeholder-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                    value={form.prospectName}
                    onChange={(event) => update("prospectName", event.target.value)}
                    placeholder="e.g. Local Gym Chain"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid gap-3">
                  <label className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Globe className="h-3.5 w-3.5" />
                    </div>
                    <span>Website URL</span>
                  </label>
                  <input
                    className="form-input h-16 rounded-xl border border-zinc-200 bg-white px-5 text-lg placeholder-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20"
                    value={form.website}
                    onChange={(event) => update("website", event.target.value)}
                    placeholder="https://example.com"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Target Audience */}
          {formStep === 2 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-indigo-600 uppercase dark:text-indigo-400">
                  Step 2 of 6
                </p>
                <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  Who are they selling to?
                </h2>
                <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
                  Describe their target audience and what pain points came up.
                </p>
              </div>

              <div className="grid gap-3">
                <label className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  <Users className="h-5 w-5 text-zinc-400" />
                  <span>Target audience summary</span>
                </label>
                <textarea
                  className="form-input min-h-48 rounded-2xl px-6 py-5 text-lg leading-relaxed"
                  value={form.targetAudienceSummary}
                  onChange={(event) => update("targetAudienceSummary", event.target.value)}
                  placeholder="Who are they selling to, and what pain points came up on the call?"
                  rows={6}
                  required
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* STEP 3: Timing & Budget */}
          {formStep === 3 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-indigo-600 uppercase dark:text-indigo-400">
                  Step 3 of 6
                </p>
                <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  When and for how much?
                </h2>
                <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
                  Confirm the timeline and commercial range.
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid gap-3">
                  <label className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    <CalendarClock className="h-5 w-5 text-zinc-400" />
                    <span>Second call date and time</span>
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input h-16 rounded-2xl px-6 text-lg"
                    value={form.secondCallAt}
                    onChange={(event) => update("secondCallAt", event.target.value)}
                    required
                    autoFocus
                  />
                  {noticeHours !== null && (
                    <p
                      className={cn(
                        "text-sm font-medium",
                        secondCallInPast || violatesNoticeWindow
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {secondCallInPast
                        ? "⚠️ Second call must be in the future."
                        : `✓ Notice window: ${noticeHours.toFixed(1)} hours`}
                    </p>
                  )}
                </div>

                <div className="grid gap-3">
                  <label className="inline-flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    <Wallet className="h-5 w-5 text-zinc-400" />
                    <span>Budget range</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute top-1/2 left-6 -translate-y-1/2 text-lg text-zinc-500">
                        £
                      </span>
                      <input
                        type="number"
                        className="form-input h-16 w-full rounded-2xl pr-6 pl-12 text-lg"
                        value={form.budgetRange.split("-")[0]?.trim() || ""}
                        onChange={(event) => {
                          const min = event.target.value;
                          const max = form.budgetRange.split("-")[1]?.trim() || "";
                          update("budgetRange", max ? `${min} - ${max}` : min);
                        }}
                        placeholder="3,000"
                        required
                      />
                    </div>
                    <span className="text-base font-medium text-zinc-500">to</span>
                    <div className="relative flex-1">
                      <span className="absolute top-1/2 left-6 -translate-y-1/2 text-lg text-zinc-500">
                        £
                      </span>
                      <input
                        type="number"
                        className="form-input h-16 w-full rounded-2xl pr-6 pl-12 text-lg"
                        value={form.budgetRange.split("-")[1]?.trim() || ""}
                        onChange={(event) => {
                          const min = form.budgetRange.split("-")[0]?.trim() || "";
                          const max = event.target.value;
                          update("budgetRange", min ? `${min} - ${max}` : max);
                        }}
                        placeholder="5,000"
                        required
                      />
                    </div>
                    <span className="shrink-0 text-base font-medium text-zinc-500">/mo</span>
                  </div>
                </div>

                {enforce48HourNotice && violatesNoticeWindow && allowUrgentOverride && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-amber-600"
                        checked={urgentOverride}
                        onChange={(event) => setUrgentOverride(event.target.checked)}
                      />
                      <span className="text-base font-semibold text-amber-900 dark:text-amber-100">
                        Mark as urgent override
                      </span>
                    </label>
                    <p className="mt-2 ml-8 text-sm text-amber-800 dark:text-amber-200/90">
                      Only use this when the second call timing can&apos;t be moved.
                    </p>
                  </div>
                )}

                {urgentOverride && (
                  <div className="grid gap-3">
                    <label className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      Why does this need urgent processing?
                    </label>
                    <textarea
                      className="form-input min-h-32 rounded-2xl px-6 py-5 text-lg"
                      value={urgentReason}
                      onChange={(event) => setUrgentReason(event.target.value)}
                      placeholder="Explain why this can't wait 48 hours…"
                      rows={4}
                      required={requiresUrgentReason}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Services */}
          {formStep === 4 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-indigo-600 uppercase dark:text-indigo-400">
                  Step 4 of 6
                </p>
                <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  What services?
                </h2>
                <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
                  Select everything they might be interested in.
                </p>
              </div>

              <div className="grid gap-4">
                {serviceOptions.map((service) => {
                  const checked = form.interestedServices.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border-2 px-6 py-4 text-lg font-semibold transition-all",
                        checked
                          ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-100"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20",
                      )}
                    >
                      <span>{service}</span>
                      {checked && <Check className="h-6 w-6" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: Planning Notes (REQUIRED) */}
          {formStep === 5 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-indigo-600 uppercase dark:text-indigo-400">
                  Step 5 of 6
                </p>
                <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  Planning notes
                </h2>
                <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
                  The more detail you provide, the better the plan we&apos;ll build.
                </p>
              </div>

              <div className="grid gap-3">
                <label className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  What else should marketing know?
                </label>
                <textarea
                  className="form-input min-h-64 rounded-2xl px-6 py-5 text-lg leading-relaxed"
                  value={form.otherInformation}
                  onChange={(event) => update("otherInformation", event.target.value)}
                  placeholder="Goals, timelines, blockers, decision-makers, budget sensitivities, previous agency experience, launch date, competitive landscape, anything relevant to building a winning strategy…"
                  rows={8}
                  required
                />
                {form.otherInformation.length > 0 && (
                  <p className="text-right text-sm text-zinc-500 dark:text-zinc-400">
                    {form.otherInformation.length} characters
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Review */}
          {formStep === 6 && (
            <div className="space-y-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-indigo-600 uppercase dark:text-indigo-400">
                  Step 6 of 6 — Review
                </p>
                <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  Ready to send?
                </h2>
                <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
                  Here&apos;s what marketing will receive.
                </p>
              </div>

              <div
                className={cn(
                  "rounded-2xl border-2 px-6 py-4 text-lg font-semibold",
                  requestReadiness.tone,
                )}
              >
                {requestReadiness.label}
              </div>

              <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/30">
                <div>
                  <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
                    Prospect
                  </p>
                  <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {form.prospectName}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
                    Website
                  </p>
                  <p className="mt-2 text-lg break-all text-zinc-700 dark:text-zinc-300">
                    {form.website}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
                      Budget
                    </p>
                    <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      £{form.budgetRange}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
                      Call timing
                    </p>
                    <p className="mt-2 text-lg text-zinc-700 dark:text-zinc-300">
                      {form.secondCallAt ? "Scheduled ✓" : "—"}
                    </p>
                  </div>
                </div>

                {form.interestedServices.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
                      Services
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.interestedServices.map((service) => (
                        <span
                          key={service}
                          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200"
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

          {/* Navigation */}
          <div className="mt-12 flex items-center justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            {formStep > 1 && (
              <button
                type="button"
                onClick={() => setFormStep(formStep - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
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
