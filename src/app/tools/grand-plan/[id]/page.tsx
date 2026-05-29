"use client";

import { useState, useEffect, use, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { GenerationProgress } from "@/components/ui/GenerationProgress";
import { PortalPublishToggle } from "@/components/portal/PortalPublishToggle";
import {
  ArrowLeft,
  Download,
  Pencil,
  Check,
  X,
  Trash2,
  Loader2,
  RefreshCw,
  Share2,
  Copy,
  Eye,
  BarChart3,
  Send,
  Map,
  Settings,
  ChevronDown,
  AlertTriangle,
  History,
  ArrowUpRight,
  Printer,
  Sparkles,
  CircleCheck,
  CircleAlert,
  Circle,
  ChevronRight,
  Upload,
  Presentation,
  Image as ImageIcon,
  Plus,
  Minimize2,
  Maximize2,
} from "lucide-react";

// ─── Section configuration ─────────────────────────────────────────────────

const ALL_SECTIONS: { key: string; label: string; description: string; aiPowered: boolean }[] = [
  {
    key: "executiveSummary",
    label: "Executive Summary",
    description: "AI-generated overview of the strategy",
    aiPowered: true,
  },
  {
    key: "audiences",
    label: "Audiences",
    description: "Target audience profiles, pain points and channel mapping",
    aiPowered: true,
  },
  {
    key: "googleAdsCampaigns",
    label: "Google Ads Campaigns",
    description: "Campaign structure from keyword research",
    aiPowered: false,
  },
  {
    key: "metaCampaigns",
    label: "Meta Campaigns",
    description: "AI-generated Facebook/Instagram campaigns",
    aiPowered: true,
  },
  {
    key: "linkedInAds",
    label: "LinkedIn Ads",
    description: "AI-generated LinkedIn campaign structures",
    aiPowered: true,
  },
  {
    key: "contentStrategy",
    label: "Content Strategy",
    description: "Page optimisations, landing pages, blog posts",
    aiPowered: false,
  },
  {
    key: "contentCalendar",
    label: "Content Calendar",
    description: "12-month blog and social posting schedule",
    aiPowered: true,
  },
  {
    key: "competitorIntel",
    label: "Competitor Intelligence",
    description: "AI-generated competitive analysis",
    aiPowered: true,
  },
  {
    key: "seoFoundations",
    label: "SEO Foundations",
    description: "Quick wins on existing pages, internal linking structure, and link-building plan",
    aiPowered: true,
  },
];

const REMOVABLE_SUBSECTIONS: Record<string, { path: string; label: string }[]> = {
  googleAdsCampaigns: [
    { path: "overview", label: "Overview" },
    { path: "adGroups", label: "Ad Groups" },
    { path: "negativeKeywords", label: "Negatives" },
    { path: "aiNegativesWithReason", label: "AI Negatives" },
    { path: "suggestedLocations", label: "Locations" },
    { path: "seedSuggestions", label: "Seed Suggestions" },
  ],
  contentStrategy: [
    { path: "pageOptimisations", label: "Page Optimisations" },
    { path: "landingPages", label: "Landing Pages" },
    { path: "blogPosts", label: "Blog Posts" },
    { path: "linkTargets", label: "Link Targets" },
  ],
  seoFoundations: [
    { path: "quickWins", label: "Quick Wins" },
    { path: "internalLinking", label: "Internal Linking" },
    { path: "linkBuilding", label: "Link Building" },
  ],
};

function nestedValue(value: unknown, path: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = value;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function hasRemovableValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function removableSubsectionsForSection(
  sectionKey: string,
  sectionValue: unknown,
): { path: string; label: string }[] {
  const options = REMOVABLE_SUBSECTIONS[sectionKey] ?? [];
  return options.filter((opt) => hasRemovableValue(nestedValue(sectionValue, opt.path)));
}

// Steps shown in the generation pipeline. These mirror the server's
// generate-step endpoint but include estimates so the user can see whether
// they should grab a coffee or wait.
//
// Note: the legacy SEMrush spreadsheet pathway (prepare-content-data /
// prepare-content-1/2/3 / prepare-content-audit) was removed in favour of the
// Strategy Brain driving the entire content cluster section from form input.
// Those step handlers are still present in generate-step/route.ts for any
// historic plans that resume mid-pipeline, but new generations skip them.
const PIPELINE_STEPS: { key: string; label: string; estSeconds: number }[] = [
  { key: "start", label: "Initialising", estSeconds: 2 },
  { key: "prepare-keywords", label: "Researching keywords", estSeconds: 30 },
  {
    key: "prepare-research",
    label: "Harvesting account data (GA4 / GSC / SEMrush)",
    estSeconds: 60,
  },
  {
    key: "prepare-customer-voice",
    label: "Researching customer voice (web search)",
    estSeconds: 60,
  },
  {
    key: "prepare-strategy-brain",
    label: "Synthesising strategy brain (positioning, audiences, messaging)",
    estSeconds: 45,
  },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface GrandPlanFull {
  id: string;
  title: string;
  status: string;
  purpose: string;
  prospectName: string | null;
  prospectWebsite: string | null;
  generatedHtml: string | null;
  planDataJson: string | null;
  presentationGeneratedAt: string | null;
  presentationDataJson: string | null;
  clientBrief: string | null;
  shareToken: string | null;
  sharePassword: string | null;
  shareExpiresAt: string | null;
  portalPublishedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  generationMs: number | null;
  statusMessage: string | null;
  generationError: string | null;
  configJson: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; slug?: string } | null;
  versions: { id: string; versionNumber: number; prompt: string | null; createdAt: string }[];
  proposal: { id: string; title: string } | null;
  keywordResearch: { id: string; title: string } | null;
  contentStrategy: { id: string; title: string; period: string } | null;
}

interface IframeSection {
  id: string;
  label: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

type QualityStepStatus = "ok" | "skipped" | "failed" | "degraded";

interface QualityStepRecord {
  status?: QualityStepStatus;
  critical?: boolean;
  reason?: string;
  error?: string;
  warnings?: string[];
  blockers?: string[];
}

interface QualityManifest {
  version?: number;
  steps?: Record<string, QualityStepRecord>;
}

type WarningFixActionId =
  | "refine-brief-site"
  | "regen-failed"
  | "auto-fix-all"
  | `regen-section:${string}`
  | `run-step:${string}`;

interface WarningLine {
  id: string;
  text: string;
  actionId?: WarningFixActionId;
  actionLabel?: string;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function GrandPlanViewPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const confirm = useConfirm();
  const { toast } = useToast();

  const [plan, setPlan] = useState<GrandPlanFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [exportingActions, setExportingActions] = useState(false);
  const [importingContext, setImportingContext] = useState(false);
  const [refiningBriefFromSite, setRefiningBriefFromSite] = useState(false);
  const [warningFixing, setWarningFixing] = useState<WarningFixActionId | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeSections, setIframeSections] = useState<IframeSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Presentation deck (top-level client-facing distillation of the plan)
  const [viewMode, setViewMode] = useState<"plan" | "presentation">("plan");
  const [presentationBusy, setPresentationBusy] = useState(false);
  const [presentationCacheBust, setPresentationCacheBust] = useState(0);
  const [presentationEditMode, setPresentationEditMode] = useState(false);
  const [presentationData, setPresentationData] = useState<
    import("@/lib/grand-plan-presentation-generator").PresentationData | null
  >(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [presEditTab, setPresEditTab] = useState<"refine" | "fields" | "manage">("refine");
  const [slideRefinePrompt, setSlideRefinePrompt] = useState("");
  const [slideRefining, setSlideRefining] = useState(false);
  const [presRefineAllPrompt, setPresRefineAllPrompt] = useState("");
  const [presRefineAllBusy, setPresRefineAllBusy] = useState(false);
  const [newSlideKind, setNewSlideKind] = useState("headline");
  const [presSaving, setPresSaving] = useState(false);
  // Fullscreen modal editor state — when edit mode opens, default to expanded.
  const [presentationEditExpanded, setPresentationEditExpanded] = useState(true);
  const [uploadingImageForSlide, setUploadingImageForSlide] = useState<number | null>(null);
  // Separate iframe ref for the fullscreen editor (so we can postMessage to it independently)
  const editorIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Share state
  const [sharingBusy, setSharingBusy] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiry, setShareExpiry] = useState("0");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [stepStatus, setStepStatus] = useState<
    Record<string, "pending" | "running" | "done" | "skipped" | "failed">
  >({});
  const [currentStepLabel, setCurrentStepLabel] = useState<string>("");
  const [activeSectionStep, setActiveSectionStep] = useState<{
    key: string;
    index: number;
    total: number;
  } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UwU chaos mode (off by default; opt-in via overflow menu)
  const [funMode, setFunMode] = useState(false);
  const funMessage = useGrandPlanUwu(generating && funMode);

  // Section toggles
  const [enabledSections, setEnabledSections] = useState<Set<string>>(
    new Set(ALL_SECTIONS.map((s) => s.key)),
  );
  const [showSectionConfig, setShowSectionConfig] = useState(false);
  const [savingSections, setSavingSections] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [quickRemoveSectionKey, setQuickRemoveSectionKey] = useState("");
  const [quickRemoveSubPath, setQuickRemoveSubPath] = useState("");

  // Refinement
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);

  // Per-section regeneration
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  // Restore
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  // AbortController so the user can cancel a hung generation step. We also
  // attach a per-step hard timeout so the UI never gets stuck if the underlying
  // function (Claude / SEMrush etc.) hangs without surfacing an error.
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  // Auto-start generation guard — ensures we only fire handleGenerate once
  // per page load, even if loadPlan re-runs (e.g. after a polling update).
  const autoStartedRef = useRef(false);

  useEffect(() => {
    loadPlan();
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-start generation when arriving from the New Plan form. We trigger on
  // the explicit ?autoStart=1 query param so users can still view existing
  // draft plans without immediately re-firing the pipeline.
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!plan || plan.status !== "draft") return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("autoStart") !== "1") return;
    autoStartedRef.current = true;
    // Strip the query so a refresh doesn't re-trigger generation.
    url.searchParams.delete("autoStart");
    window.history.replaceState({}, "", url.toString());
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // Warn the user if they try to close/navigate away while generating.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!generating) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [generating]);

  // Listen for messages from the iframe (sections list + scroll height)
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "gp:ready" && Array.isArray(data.sections)) {
        setIframeSections(data.sections as IframeSection[]);
        setIframeLoaded(true);
        if (iframeRef.current && typeof data.height === "number") {
          iframeRef.current.style.height = Math.max(data.height, 600) + "px";
        }
      }
      if (data.type === "pres:slide-change" && typeof data.index === "number") {
        setActiveSlideIndex(data.index);
      }
      if (data.type === "gp:save-keywords") {
        handleSaveKeywords(
          data.agIndex as number,
          data.agName as string,
          data.keywords as string[],
        );
      }
      const googleAdsEditTypes = [
        "gp:save-campaign-name",
        "gp:save-budget",
        "gp:save-locations",
        "gp:save-negatives",
        "gp:ag-rename",
        "gp:ag-audience",
        "gp:ag-negatives",
        "gp:ag-add",
        "gp:ag-delete",
        "gp:save-seeds",
        "gp:save-intro",
        "gp:subsection-hide",
        "gp:subsection-restore",
      ];
      if (googleAdsEditTypes.includes(data.type)) {
        handleGoogleAdsEdit(data as Record<string, unknown>);
      }
      // Generic inline editor — set / delete / undo via /edit endpoint.
      if (data.type === "gp:edit-set" && typeof data.path === "string") {
        handleGenericEdit("set", { id: data.id, path: data.path, value: data.value });
      } else if (data.type === "gp:edit-delete" && typeof data.path === "string") {
        handleGenericEdit("delete", { path: data.path });
      } else if (data.type === "gp:edit-undo") {
        handleGenericEdit("undo", {});
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generic edit handler — speaks to /api/tools/grand-plan/[id]/edit. Used by
  // every contenteditable element rendered with `data-edit-path` and every ×
  // delete button rendered with `data-delete-path`. Acks the iframe so save
  // indicators settle correctly even though the iframe gets replaced via blob
  // URL on every successful save.
  async function handleGenericEdit(
    action: "set" | "delete" | "undo",
    payload: { id?: string; path?: string; value?: unknown },
  ) {
    const target = iframeRef.current?.contentWindow;
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (result as { error?: string }).error ?? "Save failed";
        if (action === "set" && payload.id) {
          target?.postMessage({ type: "gp:edit-error", id: payload.id, message }, "*");
        } else if (action === "undo") {
          target?.postMessage({ type: "gp:undo-error", message }, "*");
        }
        toast(message, "error");
        return;
      }
      const html = (result as { html?: string }).html;
      if (html) updateBlobUrl(html);
      if (action === "set" && payload.id) {
        target?.postMessage({ type: "gp:edit-saved", id: payload.id }, "*");
      } else if (action === "undo") {
        target?.postMessage({ type: "gp:undo-done" }, "*");
        toast("Undone", "success");
      } else if (action === "delete") {
        toast("Deleted", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      toast(message, "error");
      if (action === "set" && payload.id) {
        target?.postMessage({ type: "gp:edit-error", id: payload.id, message }, "*");
      } else if (action === "undo") {
        target?.postMessage({ type: "gp:undo-error", message }, "*");
      }
    }
  }

  async function handleSaveKeywords(agIndex: number, agName: string, keywords: string[]) {
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/keywords`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agIndex, agName, keywords }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      updateBlobUrl(data.html);
      toast(`Keywords saved`, "success");
    } catch {
      toast("Failed to save keywords", "error");
    }
  }

  async function handleGoogleAdsEdit(data: Record<string, unknown>) {
    try {
      const action = (data.type as string).replace("gp:", "").replace("save-", "");
      const res = await fetch(`/api/tools/grand-plan/${id}/google-ads-edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
      if (!res.ok) throw new Error("Save failed");
      const result = await res.json();
      updateBlobUrl(result.html);
      toast("Saved", "success");
    } catch {
      toast("Failed to save", "error");
    }
  }

  function enterPresentationEditMode(gp: GrandPlanFull) {
    if (!gp.presentationDataJson) return;
    try {
      const parsed = JSON.parse(
        gp.presentationDataJson,
      ) as import("@/lib/grand-plan-presentation-generator").PresentationData;
      setPresentationData(parsed);
      setPresentationEditMode(true);
      setPresentationEditExpanded(true);
      setPresEditTab("refine");
      setActiveSlideIndex(0);
    } catch {
      toast("Could not load presentation data", "error");
    }
  }

  async function uploadSlideImage(
    slideIndex: number,
    file: File,
    _position: "left" | "right" | "top" | "background" = "right",
  ) {
    void _position;
    setUploadingImageForSlide(slideIndex);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/tools/grand-plan/${id}/upload-image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Upload failed");
      }
      const { url } = (await res.json()) as { url: string };
      await savePresField("images-add", {
        slideIndex,
        url,
        alt: file.name.replace(/\.[a-z0-9]+$/i, ""),
      });
      toast("Image added", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Image upload failed", "error");
    } finally {
      setUploadingImageForSlide(null);
    }
  }

  async function savePresField(action: string, payload: Record<string, unknown>) {
    setPresSaving(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/presentation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      const result = await res.json();
      const updated = JSON.parse(
        result.presentationDataJson,
      ) as import("@/lib/grand-plan-presentation-generator").PresentationData;
      setPresentationData(updated);
      setPresentationCacheBust((n) => n + 1);
    } catch {
      toast("Failed to save", "error");
    } finally {
      setPresSaving(false);
    }
  }

  async function refineAllSlides(prompt: string) {
    if (!prompt.trim()) return;
    setPresRefineAllBusy(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/presentation/refine-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Refine failed");
      }
      const result = await res.json();
      const updated = JSON.parse(
        result.presentationDataJson,
      ) as import("@/lib/grand-plan-presentation-generator").PresentationData;
      setPresentationData(updated);
      setPresentationCacheBust((n) => n + 1);
      setPresRefineAllPrompt("");
      toast("Deck refined", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Refine failed", "error");
    } finally {
      setPresRefineAllBusy(false);
    }
  }

  async function refineSlide(slideIndex: number, prompt: string) {
    if (!prompt.trim()) return;
    setSlideRefining(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/presentation/refine-slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIndex, prompt }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Refine failed");
      }
      const result = await res.json();
      const updated = JSON.parse(
        result.presentationDataJson,
      ) as import("@/lib/grand-plan-presentation-generator").PresentationData;
      setPresentationData(updated);
      setPresentationCacheBust((n) => n + 1);
      setSlideRefinePrompt("");
      toast("Slide refined", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Refine failed", "error");
    } finally {
      setSlideRefining(false);
    }
  }

  async function loadPlan() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      const gp = data.grandPlan as GrandPlanFull;
      setPlan(gp);
      setTitleInput(gp.title);
      updateBlobUrl(gp.generatedHtml);

      try {
        const config = JSON.parse(gp.configJson || "{}");
        if (config.sections?.length) setEnabledSections(new Set(config.sections));
      } catch {
        /* ignore */
      }

      if (gp.status === "generating") startPolling();
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  function updateBlobUrl(html: string | null) {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setIframeLoaded(false);
    setIframeSections([]);
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      setBlobUrl(URL.createObjectURL(blob));
    } else {
      setBlobUrl(null);
    }
  }

  function startPolling() {
    if (pollRef.current) return;
    const startedAt = Date.now();
    let consecutiveErrors = 0;
    const MAX_POLL_MS = 1000 * 60 * 90;
    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > MAX_POLL_MS) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setGenerating(false);
        toast("Generation timed out. Refresh and retry from the failed step.", "error");
        return;
      }
      try {
        const res = await fetch(`/api/tools/grand-plan/${id}`);
        if (!res.ok) {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 10) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setGenerating(false);
            toast("Lost connection while tracking generation. Refresh to continue.", "error");
          }
          return;
        }
        consecutiveErrors = 0;
        const data = await res.json();
        const gp = data.grandPlan as GrandPlanFull;
        setPlan(gp);
        setTitleInput(gp.title);
        updateBlobUrl(gp.generatedHtml);

        if (gp.status !== "generating") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
        }
      } catch {
        consecutiveErrors += 1;
        if (consecutiveErrors >= 10) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setGenerating(false);
          toast("Lost connection while tracking generation. Refresh to continue.", "error");
        }
      }
    }, 3000);
  }

  // ─── Generation ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!plan) return;
    setGenerating(true);
    cancelledRef.current = false;
    abortRef.current = new AbortController();
    setPlan((prev) => (prev ? { ...prev, status: "generating" } : prev));

    const enabled = Array.from(enabledSections);

    // Reset stepper
    const initial: Record<string, "pending" | "running" | "done" | "skipped" | "failed"> = {};
    for (const s of PIPELINE_STEPS) initial[s.key] = "pending";
    for (const k of enabled) initial[`section:${k}`] = "pending";
    initial["assemble"] = "pending";
    setStepStatus(initial);
    setActiveSectionStep(null);

    const sectionLabels: Record<string, string> = {};
    for (const s of ALL_SECTIONS) sectionLabels[s.key] = s.label;

    async function runStep(stepKey: string, label: string, statusKey?: string): Promise<boolean> {
      const sk = statusKey ?? stepKey;
      setCurrentStepLabel(label);
      setStepStatus((prev) => ({ ...prev, [sk]: "running" }));

      // Vercel Pro functions cap at 800s. Give the client a slightly longer
      // leash so we still surface a clean error if the function silently dies.
      const STEP_TIMEOUT_MS = 820_000;
      const timeoutId = setTimeout(() => {
        try {
          abortRef.current?.abort();
        } catch {
          /* noop */
        }
      }, STEP_TIMEOUT_MS);

      try {
        const res = await fetch(`/api/tools/grand-plan/${id}/generate-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: stepKey }),
          signal: abortRef.current?.signal,
        });
        if (!res.ok) {
          // Vercel returns HTML (not JSON) for 504/502 — handle that cleanly so
          // the user sees a useful message instead of "Unknown error".
          let errMsg: string;
          if (res.status === 504) {
            errMsg = `Step "${label}" timed out (Vercel 504). The function exceeded its time budget — try again, the pipeline will resume from this step.`;
          } else if (res.status === 502 || res.status === 503) {
            errMsg = `Step "${label}" failed with a gateway error (${res.status}). Try again in a moment.`;
          } else {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            errMsg = err.error || `Step "${stepKey}" failed (HTTP ${res.status})`;
          }
          setStepStatus((prev) => ({ ...prev, [sk]: "failed" }));
          throw new Error(errMsg);
        }
        const data = await res.json();
        const skipped = !!data.skipped;
        setStepStatus((prev) => ({ ...prev, [sk]: skipped ? "skipped" : "done" }));
        return !skipped;
      } catch (err) {
        if (cancelledRef.current) {
          setStepStatus((prev) => ({ ...prev, [sk]: "failed" }));
          throw new Error("Cancelled");
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          setStepStatus((prev) => ({ ...prev, [sk]: "failed" }));
          throw new Error(
            `Step "${label}" timed out after ${Math.round(STEP_TIMEOUT_MS / 1000)}s. The server may have hit its function timeout — retrying will resume from where it stopped.`,
          );
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    try {
      for (const s of PIPELINE_STEPS) {
        await runStep(s.key, s.label);
      }
      for (let i = 0; i < enabled.length; i++) {
        const key = enabled[i];
        const label = sectionLabels[key] || key;
        setActiveSectionStep({ key, index: i + 1, total: enabled.length });
        await runStep(key, `Generating ${label} (${i + 1}/${enabled.length})`, `section:${key}`);
      }
      setActiveSectionStep(null);
      await runStep("assemble", "Assembling final document");

      setCurrentStepLabel("Complete!");
      toast("Grand plan generated", "success");
      await loadPlan();
    } catch (error) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      const message = error instanceof Error ? error.message : "Generation failed";
      toast(message, cancelledRef.current ? "info" : "error");
      await loadPlan();
    } finally {
      abortRef.current = null;
      setGenerating(false);
    }
  }

  function handleCancelGeneration() {
    cancelledRef.current = true;
    try {
      abortRef.current?.abort();
    } catch {
      /* noop */
    }
    toast("Cancelling\u2026 the current step will stop shortly.", "info");
  }

  // ─── Refinement & section regeneration ───────────────────────────────────

  async function handleRefine() {
    if (!refinePrompt.trim()) return;
    setRefining(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: refinePrompt }),
      });
      if (res.ok) {
        const data = await res.json();
        updateBlobUrl(data.html);
        await loadPlan();
        setRefinePrompt("");
        toast("Refined", "success");
      } else {
        toast("Refinement failed", "error");
      }
    } finally {
      setRefining(false);
    }
  }

  async function handleRegenerateSection(sectionKey: string, options?: { silent?: boolean }) {
    setRegeneratingSection(sectionKey);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/regenerate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey }),
      });
      if (res.ok) {
        const data = await res.json();
        updateBlobUrl(data.html);
        await loadPlan();
        if (!options?.silent) toast(`Regenerated: ${labelFor(sectionKey)}`, "success");
      } else {
        if (!options?.silent) toast(`Failed to regenerate ${labelFor(sectionKey)}`, "error");
      }
    } finally {
      setRegeneratingSection(null);
    }
  }

  async function handleRegenerateFailed(options?: { silent?: boolean }) {
    if (!plan) return;
    try {
      const data = JSON.parse(plan.planDataJson || "{}") as {
        qualityManifest?: QualityManifest;
        generationReport?: Record<string, { status: string }>;
      };

      const sectionKeys = new Set(ALL_SECTIONS.map((section) => section.key));
      const manifestSteps = data.qualityManifest?.steps ?? {};
      const failedFromManifest = Object.entries(manifestSteps)
        .filter(([key, record]) => sectionKeys.has(key) && record?.status === "failed")
        .map(([key]) => key);

      const legacyReport = data.generationReport ?? {};
      const failedFromLegacy = Object.entries(legacyReport)
        .filter(([key, record]) => sectionKeys.has(key) && record.status === "failed")
        .map(([key]) => key);

      const failed = Array.from(new Set([...failedFromManifest, ...failedFromLegacy]));
      if (!failed.length) {
        if (!options?.silent) toast("No failed sections found to regenerate", "info");
        return;
      }

      setRegeneratingSection("__batch__");

      const results = await Promise.allSettled(
        failed.map(async (key) => {
          const res = await fetch(`/api/tools/grand-plan/${id}/regenerate-section`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sectionKey: key }),
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error ?? `Failed to regenerate ${labelFor(key)}`);
          }
          return key;
        }),
      );

      const succeeded = results.filter(
        (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled",
      ).length;
      const failedCount = results.length - succeeded;

      if (succeeded > 0) {
        await loadPlan();
      }

      if (failedCount === 0) {
        if (!options?.silent) {
          toast(`Regenerated ${succeeded} failed section${succeeded === 1 ? "" : "s"}`, "success");
        }
      } else {
        if (!options?.silent) toast(`Regenerated ${succeeded}, ${failedCount} failed`, "error");
      }
    } finally {
      setRegeneratingSection(null);
    }
  }

  async function handleRemovePath(path: string, label: string) {
    const ok = await confirm({
      title: `Remove ${label}?`,
      description:
        "This will remove it from the current plan output. You can restore via version history.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    setRemovingPath(path);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", path }),
      });
      const result = (await res.json().catch(() => ({}))) as { error?: string; html?: string };
      if (!res.ok) {
        throw new Error(result.error ?? `Failed to remove ${label}`);
      }
      if (result.html) updateBlobUrl(result.html);
      await loadPlan();
      toast(`Removed ${label}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : `Failed to remove ${label}`, "error");
    } finally {
      setRemovingPath(null);
    }
  }

  function toggleSection(key: string) {
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function saveSectionConfig() {
    setSavingSections(true);
    try {
      const sections = Array.from(enabledSections);
      await fetch(`/api/tools/grand-plan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { sections } }),
      });
      toast("Sections saved", "success");
    } finally {
      setSavingSections(false);
    }
  }

  // ─── Title ───────────────────────────────────────────────────────────────

  async function handleSaveTitle() {
    if (!titleInput.trim() || !plan) return;
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      if (res.ok) setPlan((prev) => (prev ? { ...prev, title: titleInput.trim() } : prev));
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  // ─── Sharing ─────────────────────────────────────────────────────────────

  async function confirmQualitySensitiveAction(
    actionLabel: string,
    confirmLabel: string,
  ): Promise<boolean> {
    if (!publishQualitySummary.hasIssues) return true;

    const detailPreview = publishQualitySummary.lines
      .slice(0, 4)
      .map((line) => `• ${line}`)
      .join("\n");
    const moreCount = Math.max(0, publishQualitySummary.lines.length - 4);
    const counts = [
      publishQualitySummary.failureCount > 0
        ? `${publishQualitySummary.failureCount} failed step${publishQualitySummary.failureCount === 1 ? "" : "s"}`
        : "",
      publishQualitySummary.degradedStepCount > 0
        ? `${publishQualitySummary.degradedStepCount} degraded step${publishQualitySummary.degradedStepCount === 1 ? "" : "s"}`
        : "",
    ]
      .filter(Boolean)
      .join(" and ");

    return confirm({
      title: `Proceed and ${actionLabel}?`,
      description: `Quality checks found ${counts || "warnings"}.\n\n${detailPreview}${moreCount > 0 ? `\n…plus ${moreCount} more warning${moreCount === 1 ? "" : "s"}.` : ""}`,
      confirmLabel,
    });
  }

  async function handleShare() {
    const shouldProceed = await confirmQualitySensitiveAction("share this plan", "Share anyway");
    if (!shouldProceed) return;

    setSharingBusy(true);
    try {
      const res = await fetch("/api/tools/grand-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "share",
          password: sharePassword || undefined,
          expiresInDays: parseInt(shareExpiry) || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan((prev) => (prev ? { ...prev, shareToken: data.shareToken } : prev));
        setShareModalOpen(false);
        setSharePassword("");
        toast("Share link created", "success");
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast(data.error || "Failed to create share link", "error");
      }
    } finally {
      setSharingBusy(false);
    }
  }

  async function handleUnshare() {
    setSharingBusy(true);
    try {
      await fetch("/api/tools/grand-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "unshare" }),
      });
      setPlan((prev) => (prev ? { ...prev, shareToken: null, sharePassword: null } : prev));
      toast("Share link revoked", "info");
    } finally {
      setSharingBusy(false);
    }
  }

  async function handleCopyShareLink() {
    if (!plan?.shareToken) return;
    const url = `${window.location.origin}/share/grand-plan/${plan.shareToken}`;
    await navigator.clipboard.writeText(url);
    toast("Link copied", "success");
  }

  async function handleCopyPresentationLink() {
    if (!plan?.shareToken) return;
    const url = `${window.location.origin}/share/grand-plan/${plan.shareToken}?view=presentation`;
    await navigator.clipboard.writeText(url);
    toast("Presentation link copied", "success");
  }

  async function handleGeneratePresentation() {
    if (!plan) return;

    const shouldProceed = await confirmQualitySensitiveAction(
      "generate a presentation",
      "Generate anyway",
    );
    if (!shouldProceed) return;

    setPresentationBusy(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/presentation`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to generate presentation", "error");
        return;
      }
      toast("Presentation ready", "success");
      await loadPlan();
      setPresentationCacheBust((n) => n + 1);
      setViewMode("presentation");
    } catch {
      toast("Failed to generate presentation", "error");
    } finally {
      setPresentationBusy(false);
    }
  }

  function getPresentationDownloadBasename(): string {
    if (!plan) return "strategy-deck";
    const seed = `${plan.client?.name ?? plan.prospectName ?? "deck"}-${plan.title}`;
    const slug = seed
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/g, "");
    return slug || "strategy-deck";
  }

  async function downloadPresentationFile(kind: "pdf" | "html") {
    if (!plan) return;

    const endpoint =
      kind === "pdf"
        ? `/api/tools/grand-plan/${id}/presentation/pdf`
        : `/api/tools/grand-plan/${id}/presentation?ts=${presentationCacheBust}`;

    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          data.error ||
            (kind === "pdf" ? "Failed to download PDF" : "Failed to download presentation HTML"),
        );
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${getPresentationDownloadBasename()}.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : kind === "pdf"
            ? "Failed to download PDF"
            : "Failed to download presentation HTML",
        "error",
      );
    }
  }

  async function handleDelete() {
    if (
      !(await confirm({
        title: "Delete this grand plan?",
        description: "This cannot be undone.",
        confirmLabel: "Delete",
        danger: true,
      }))
    )
      return;
    setDeleting(true);
    await fetch(`/api/tools/grand-plan/${id}`, { method: "DELETE" });
    router.push("/tools/grand-plan");
  }

  async function handleExportActions() {
    if (!plan?.clientId) return;
    if (
      !window.confirm(
        "Export plan recommendations as action items? This will create new tasks in the client's action plan.",
      )
    )
      return;
    setExportingActions(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/export-actions`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Export failed");
      alert(`Created ${data.created ?? 0} action items.`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportingActions(false);
    }
  }

  async function handleImportContext(file: File) {
    setImportingContext(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tools/grand-plan/${id}/import-context`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      // Refresh plan so the brief textarea reflects the appended context
      const planRes = await fetch(`/api/tools/grand-plan/${id}`);
      if (planRes.ok) {
        const updated = await planRes.json();
        setPlan(updated.grandPlan ?? updated);
      }
      alert("Context imported and appended to client brief.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportingContext(false);
    }
  }

  async function runGenerateStepForFix(step: string, options?: { forceRefresh?: boolean }) {
    const res = await fetch(`/api/tools/grand-plan/${id}/generate-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step,
        ...(options?.forceRefresh ? { forceRefresh: true } : {}),
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      blockers?: string[];
    };
    if (!res.ok) {
      const blockerText = payload.blockers?.length
        ? ` ${payload.blockers.slice(0, 2).join(" ")}`
        : "";
      throw new Error(payload.error ?? `Failed to run ${labelFor(step)}.${blockerText}`.trim());
    }
  }

  async function refineBriefFromSite(options?: { silent?: boolean }) {
    setRefiningBriefFromSite(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/refine-brief-site`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to refine brief from website context");
      }

      // Re-run preflight so warning state reflects improved brief quality.
      await runGenerateStepForFix("preflight-inputs");
      await loadPlan();

      if (!options?.silent) toast("Brief refined from website crawl", "success");
    } finally {
      setRefiningBriefFromSite(false);
    }
  }

  const resolveWarningAction = useCallback(
    (line: string): { actionId: WarningFixActionId; actionLabel: string } | null => {
      const lower = line.toLowerCase();
      const separatorIndex = line.indexOf(":");
      const prefix = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim().toLowerCase() : "";

      const sectionMatch = ALL_SECTIONS.find((section) => section.label.toLowerCase() === prefix);
      if (sectionMatch) {
        return {
          actionId: `regen-section:${sectionMatch.key}`,
          actionLabel: `Regenerate ${sectionMatch.label}`,
        };
      }

      const pipelineMatch = PIPELINE_STEPS.find(
        (pipelineStep) => pipelineStep.label.toLowerCase() === prefix,
      );
      if (pipelineMatch) {
        return {
          actionId: `run-step:${pipelineMatch.key}`,
          actionLabel:
            pipelineMatch.key === "prepare-customer-voice"
              ? "Refresh customer voice"
              : `Rerun ${pipelineMatch.label}`,
        };
      }

      if (
        prefix === "input preflight" ||
        prefix === "preflight-inputs" ||
        lower.includes("client brief") ||
        lower.includes("target audiences")
      ) {
        return {
          actionId: "refine-brief-site",
          actionLabel: "Refine brief from site",
        };
      }

      if (lower.includes("customer voice")) {
        return {
          actionId: "run-step:prepare-customer-voice",
          actionLabel: "Refresh customer voice",
        };
      }

      if (lower.includes("failed quality check")) {
        return {
          actionId: "regen-failed",
          actionLabel: "Regenerate failed sections",
        };
      }

      return null;
    },
    [],
  );

  async function applyWarningFixAction(
    actionId: WarningFixActionId,
    options?: { silent?: boolean },
  ) {
    if (actionId === "refine-brief-site") {
      await refineBriefFromSite({ silent: options?.silent });
      return;
    }

    if (actionId === "regen-failed") {
      await handleRegenerateFailed({ silent: options?.silent });
      return;
    }

    if (actionId.startsWith("regen-section:")) {
      const sectionKey = actionId.slice("regen-section:".length);
      await handleRegenerateSection(sectionKey, { silent: options?.silent });
      return;
    }

    if (actionId.startsWith("run-step:")) {
      const step = actionId.slice("run-step:".length);
      await runGenerateStepForFix(step, {
        forceRefresh: step === "prepare-customer-voice",
      });
      await loadPlan();
      if (!options?.silent) toast(`Reran ${labelFor(step)}`, "success");
      return;
    }

    if (actionId === "auto-fix-all") {
      const availableActions = Array.from(
        new Set(
          warningLines
            .map((line) => line.actionId)
            .filter((id): id is WarningFixActionId => !!id && id !== "auto-fix-all"),
        ),
      );

      if (!availableActions.length) {
        if (!options?.silent) toast("No actionable warning fixes found", "info");
        return;
      }

      for (const nextAction of availableActions) {
        try {
          await applyWarningFixAction(nextAction, { silent: true });
        } catch {
          // Best-effort run: continue applying remaining fixes.
        }
      }

      // Final preflight refresh to ensure warning card state is current.
      try {
        await runGenerateStepForFix("preflight-inputs");
      } catch {
        /* ignore */
      }
      await loadPlan();

      if (!options?.silent) toast("Applied all available warning fixes", "success");
    }
  }

  async function handleWarningFix(actionId: WarningFixActionId) {
    setWarningFixing(actionId);
    try {
      await applyWarningFixAction(actionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to apply warning fix";
      toast(message, "error");
    } finally {
      setWarningFixing(null);
    }
  }

  async function handleRefineBriefFromSiteButton() {
    setWarningFixing("refine-brief-site");
    try {
      await refineBriefFromSite();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to refine brief from website context";
      toast(message, "error");
    } finally {
      setWarningFixing(null);
    }
  }

  function handleDownload() {
    if (!plan?.generatedHtml) return;
    const blob = new Blob([plan.generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.title || "grand-plan"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.postMessage({ type: "gp:print" }, "*");
  }

  async function handleClone() {
    if (!plan) return;
    try {
      const res = await fetch("/api/tools/grand-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: plan.clientId,
          title: `${plan.title} (Copy)`,
          purpose: plan.purpose,
          cloneFromId: plan.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast("Cloned", "success");
        router.push(`/tools/grand-plan/${data.grandPlan.id}`);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleRestoreVersion(version: { id: string; versionNumber: number }) {
    const ok = await confirm({
      title: `Restore version v${version.versionNumber}?`,
      description:
        "The current document will be archived as a new version, so you can always undo.",
      confirmLabel: "Restore",
    });
    if (!ok) return;
    setRestoringVersion(version.id);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}/restore-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version.id }),
      });
      if (res.ok) {
        const data = await res.json();
        updateBlobUrl(data.html);
        await loadPlan();
        toast(`Restored v${version.versionNumber}`, "success");
      } else {
        toast("Failed to restore version", "error");
      }
    } finally {
      setRestoringVersion(null);
    }
  }

  function scrollToSection(sectionId: string) {
    iframeRef.current?.contentWindow?.postMessage({ type: "gp:scroll", id: sectionId }, "*");
    setActiveSectionId(sectionId);
  }

  // ─── Derived ─────────────────────────────────────────────────────────────

  const isGenerating = plan?.status === "generating" || generating;
  const isComplete = plan?.status === "complete" && !!plan?.generatedHtml;

  const failureSummary = useMemo(() => {
    const empty = {
      failures: [] as { key: string; error?: string }[],
      warnings: [] as string[],
      failedSections: [] as string[],
      degradedSteps: [] as string[],
      preflightRecord: null as QualityStepRecord | null,
    };
    if (!plan?.planDataJson) return empty;
    try {
      const data = JSON.parse(plan.planDataJson || "{}") as {
        qualityManifest?: QualityManifest;
        pipelineWarnings?: string[];
        generationReport?: Record<string, { status: string; error?: string }>;
      };

      const warnings = new Set(
        ((data.pipelineWarnings as string[] | undefined) ?? []).filter(
          (warning): warning is string => typeof warning === "string" && warning.trim().length > 0,
        ),
      );
      const failuresByKey = new globalThis.Map<string, { key: string; error?: string }>();
      const sectionKeys = new Set(ALL_SECTIONS.map((section) => section.key));
      const failedSections = new Set<string>();
      const degradedSteps = new Set<string>();

      const steps = data.qualityManifest?.steps ?? {};
      const preflightRecord = steps["preflight-inputs"] ?? null;
      for (const [key, record] of Object.entries(steps)) {
        const status = record?.status;
        const label = labelFor(key);

        if (status === "failed") {
          failuresByKey.set(key, { key, error: record.error ?? record.reason });
          if (sectionKeys.has(key)) failedSections.add(key);
          continue;
        }

        if (status === "degraded" || (status === "skipped" && record.critical)) {
          if (status === "degraded") degradedSteps.add(key);
          const details = [
            ...((record.warnings as string[] | undefined) ?? []),
            ...((record.blockers as string[] | undefined) ?? []),
          ].filter((line): line is string => typeof line === "string" && line.trim().length > 0);

          if (details.length > 0) {
            for (const detail of details) warnings.add(`${label}: ${detail}`);
          } else if (record.reason || record.error) {
            warnings.add(`${label}: ${record.reason ?? record.error}`);
          } else if (status === "degraded") {
            warnings.add(`${label}: completed with degraded quality.`);
          } else {
            warnings.add(`${label}: skipped but marked critical.`);
          }
        }
      }

      const report = data.generationReport ?? {};
      for (const [key, result] of Object.entries(report)) {
        if (result.status === "failed") {
          if (!failuresByKey.has(key)) {
            failuresByKey.set(key, { key, error: result.error });
          }
          if (sectionKeys.has(key)) failedSections.add(key);
        }
      }

      return {
        failures: Array.from(failuresByKey.values()),
        warnings: Array.from(warnings),
        failedSections: Array.from(failedSections),
        degradedSteps: Array.from(degradedSteps),
        preflightRecord,
      };
    } catch {
      return empty;
    }
  }, [plan?.planDataJson]);

  const publishQualitySummary = useMemo(() => {
    const lines = new Set<string>();

    const preflight = failureSummary.preflightRecord;
    if (preflight && preflight.status && preflight.status !== "ok") {
      const preflightDetails = [
        ...((preflight.warnings ?? []).filter(Boolean) as string[]),
        ...((preflight.blockers ?? []).filter(Boolean) as string[]),
      ];
      if (preflightDetails.length > 0) {
        for (const detail of preflightDetails) {
          lines.add(`Input preflight: ${detail}`);
        }
      } else if (preflight.reason || preflight.error) {
        lines.add(`Input preflight: ${preflight.reason ?? preflight.error}`);
      }
    }

    for (const warning of failureSummary.warnings) lines.add(warning);
    for (const failure of failureSummary.failures) {
      lines.add(`${labelFor(failure.key)}: ${failure.error ?? "Failed quality check."}`);
    }

    return {
      hasIssues: lines.size > 0,
      lines: Array.from(lines),
      degradedStepCount: failureSummary.degradedSteps.length,
      failureCount: failureSummary.failures.length,
    };
  }, [failureSummary]);

  const warningLines = useMemo(() => {
    const lines = new globalThis.Map<string, WarningLine>();

    const addLine = (
      text: string,
      forcedAction?: { actionId: WarningFixActionId; actionLabel: string },
    ) => {
      const trimmed = text.trim();
      if (!trimmed || lines.has(trimmed)) return;
      const resolved = forcedAction ?? resolveWarningAction(trimmed) ?? undefined;
      lines.set(trimmed, {
        id: `warning-${lines.size + 1}`,
        text: trimmed,
        actionId: resolved?.actionId,
        actionLabel: resolved?.actionLabel,
      });
    };

    if (failureSummary.preflightRecord && failureSummary.preflightRecord.status !== "ok") {
      const preflightMessage =
        failureSummary.preflightRecord.reason ??
        failureSummary.preflightRecord.error ??
        "Inputs are present but quality is reduced.";
      addLine(`Input preflight: ${preflightMessage}`, {
        actionId: "refine-brief-site",
        actionLabel: "Refine brief from site",
      });
    }

    if (failureSummary.degradedSteps.length > 0) {
      addLine(`Degraded steps: ${failureSummary.degradedSteps.length}`, {
        actionId: "auto-fix-all",
        actionLabel: "Run all fixes",
      });
    }

    for (const warning of failureSummary.warnings) addLine(warning);

    return Array.from(lines.values());
  }, [failureSummary, resolveWarningAction]);

  const sectionData = useMemo(() => {
    if (!plan?.planDataJson) return {} as Record<string, unknown>;
    try {
      const data = JSON.parse(plan.planDataJson || "{}") as { sections?: Record<string, unknown> };
      return data.sections ?? {};
    } catch {
      return {} as Record<string, unknown>;
    }
  }, [plan?.planDataJson]);

  const removableSections = useMemo(() => {
    return ALL_SECTIONS.reduce(
      (acc, section) => {
        const value = sectionData[section.key];
        if (!hasRemovableValue(value)) return acc;
        acc.push({
          key: section.key,
          label: section.label,
          subsections: removableSubsectionsForSection(section.key, value),
        });
        return acc;
      },
      [] as { key: string; label: string; subsections: { path: string; label: string }[] }[],
    );
  }, [sectionData]);

  const selectedQuickRemoveSection = useMemo(() => {
    if (!quickRemoveSectionKey) return null;
    return removableSections.find((s) => s.key === quickRemoveSectionKey) ?? null;
  }, [quickRemoveSectionKey, removableSections]);

  useEffect(() => {
    if (!removableSections.length) {
      if (quickRemoveSectionKey) setQuickRemoveSectionKey("");
      return;
    }
    if (!quickRemoveSectionKey || !removableSections.some((s) => s.key === quickRemoveSectionKey)) {
      setQuickRemoveSectionKey(removableSections[0]?.key ?? "");
    }
  }, [quickRemoveSectionKey, removableSections]);

  useEffect(() => {
    if (!selectedQuickRemoveSection) {
      if (quickRemoveSubPath) setQuickRemoveSubPath("");
      return;
    }
    const exists = selectedQuickRemoveSection.subsections.some(
      (sub) => sub.path === quickRemoveSubPath,
    );
    if (!exists) {
      setQuickRemoveSubPath(selectedQuickRemoveSection.subsections[0]?.path ?? "");
    }
  }, [quickRemoveSubPath, selectedQuickRemoveSection]);

  const totalEstSeconds = useMemo(() => {
    const baseSeconds = PIPELINE_STEPS.reduce((sum, s) => sum + s.estSeconds, 0);
    const sectionSeconds = enabledSections.size * 25; // average per section
    return baseSeconds + sectionSeconds + 10; // +assemble
  }, [enabledSections.size]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: 1280 }}>
        <div className="flex items-center justify-center py-24 text-sm text-[color:var(--text-3)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading plan…
        </div>
      </div>
    );
  }

  if (notFound || !plan) {
    return (
      <div className="page" style={{ maxWidth: 1280 }}>
        <div className="card" style={{ padding: 64, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>Plan not found</p>
          <Link href="/tools/grand-plan" className="btn btn-ghost" style={{ marginTop: 16 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Grand Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 1400 }}>
      {/* Back link */}
      <Link
        href="/tools/grand-plan"
        className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--text-3)] no-underline hover:text-[color:var(--text)]"
        style={{ marginBottom: 18 }}
      >
        <ArrowLeft style={{ width: 14, height: 14 }} /> Grand Plans
      </Link>

      {/* Header */}
      <header className="flex items-start justify-between" style={{ gap: 16, marginBottom: 18 }}>
        <div className="flex items-start" style={{ gap: 14, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Map style={{ width: 22, height: 22, color: "white" }} aria-hidden />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingTitle ? (
              <div className="flex items-center" style={{ gap: 8 }}>
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setEditingTitle(false);
                      setTitleInput(plan.title);
                    }
                  }}
                  autoFocus
                  aria-label="Plan title"
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    flex: 1,
                  }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  aria-label="Save title"
                >
                  {savingTitle ? (
                    <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                  ) : (
                    <Check style={{ width: 14, height: 14 }} />
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEditingTitle(false);
                    setTitleInput(plan.title);
                  }}
                  aria-label="Cancel title edit"
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ) : (
              <div className="flex items-center" style={{ gap: 8 }}>
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--text)",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {plan.title}
                </h1>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditingTitle(true)}
                  style={{ padding: 4 }}
                  aria-label="Edit title"
                  title="Edit title"
                >
                  <Pencil style={{ width: 13, height: 13 }} />
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 6 }}>
              {plan.client && (
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{plan.client.name}</span>
              )}
              <StatusBadge status={plan.status} />
              <PurposeBadge purpose={plan.purpose} />
              {plan.generationMs != null && (
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                  Generated in {Math.round(plan.generationMs / 1000)}s
                </span>
              )}
              {plan.viewCount > 0 && (
                <span
                  className="inline-flex items-center"
                  style={{ gap: 3, fontSize: 11, color: "var(--text-3)" }}
                  title={
                    plan.lastViewedAt
                      ? `Last viewed ${new Date(plan.lastViewedAt).toLocaleString("en-GB")}`
                      : undefined
                  }
                >
                  <BarChart3 style={{ width: 11, height: 11 }} aria-hidden />
                  {plan.viewCount} view{plan.viewCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Linked sources — now actually navigable */}
      {(plan.proposal || plan.keywordResearch || plan.contentStrategy) && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 14 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-4)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            Linked sources
          </p>
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {plan.proposal && (
              <LinkedSource
                href={`/tools/proposals/${plan.proposal.id}`}
                label="Proposal"
                title={plan.proposal.title}
              />
            )}
            {plan.keywordResearch && (
              <LinkedSource
                href={`/tools/keyword-planner${plan.clientId ? `?clientId=${plan.clientId}` : ""}`}
                label="Keywords"
                title={plan.keywordResearch.title}
              />
            )}
            {plan.contentStrategy && (
              <LinkedSource
                href={`/tools/content-strategy${plan.clientId ? `?clientId=${plan.clientId}` : ""}`}
                label="Content"
                title={plan.contentStrategy.title}
              />
            )}
          </div>
        </div>
      )}

      {/* Section configuration */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 14 }}>
        <button
          onClick={() => setShowSectionConfig(!showSectionConfig)}
          aria-expanded={showSectionConfig}
          aria-controls="section-config-body"
          className="flex items-center"
          style={{
            gap: 8,
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Settings style={{ width: 14, height: 14, color: "var(--text-3)" }} aria-hidden />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Sections ({enabledSections.size} of {ALL_SECTIONS.length} enabled)
          </span>
          <ChevronDown
            style={{
              width: 13,
              height: 13,
              color: "var(--text-4)",
              marginLeft: "auto",
              transform: showSectionConfig ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
            aria-hidden
          />
        </button>
        {showSectionConfig && (
          <div id="section-config-body" style={{ marginTop: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 6,
              }}
            >
              {ALL_SECTIONS.map((s) => {
                const checked = enabledSections.has(s.key);
                const sectionValue = sectionData[s.key];
                const sectionExists = hasRemovableValue(sectionValue);
                const removableSubsections = removableSubsectionsForSection(s.key, sectionValue);
                return (
                  <label
                    key={s.key}
                    className="flex items-start"
                    style={{
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "background 0.1s",
                      background: checked ? "var(--accent-bg)" : "var(--bg-2)",
                      border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                      opacity: checked ? 1 : 0.65,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(s.key)}
                      aria-label={s.label}
                      style={{ marginTop: 2, accentColor: "var(--accent)" }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="flex items-center" style={{ gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                          {s.label}
                        </span>
                        {s.aiPowered && (
                          <span
                            style={{
                              fontSize: 9,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "var(--info-bg)",
                              color: "var(--info)",
                              fontWeight: 600,
                            }}
                          >
                            AI
                          </span>
                        )}
                        {plan?.status === "complete" && sectionExists && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginLeft: "auto", fontSize: 10, padding: "2px 6px", gap: 3 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemovePath(`sections.${s.key}`, s.label);
                            }}
                            disabled={removingPath !== null || regeneratingSection !== null}
                            title={`Remove ${s.label} from this plan`}
                            aria-label={`Remove ${s.label}`}
                          >
                            {removingPath === `sections.${s.key}` ? (
                              <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                            ) : (
                              <Trash2 style={{ width: 11, height: 11 }} aria-hidden />
                            )}
                            Remove
                          </button>
                        )}
                        {s.aiPowered && plan?.status === "complete" && checked && sectionExists && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              gap: 3,
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRegenerateSection(s.key);
                            }}
                            disabled={regeneratingSection !== null}
                            title={`Regenerate ${s.label}`}
                            aria-label={`Regenerate ${s.label}`}
                          >
                            {regeneratingSection === s.key ? (
                              <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                            ) : (
                              <RefreshCw style={{ width: 11, height: 11 }} aria-hidden />
                            )}
                            Regen
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        {s.description}
                      </p>
                      {plan?.status === "complete" &&
                        sectionExists &&
                        removableSubsections.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                            {removableSubsections.map((sub) => {
                              const path = `sections.${s.key}.${sub.path}`;
                              const removing = removingPath === path;
                              return (
                                <button
                                  key={path}
                                  className="btn btn-ghost btn-sm"
                                  style={{ fontSize: 10, padding: "2px 6px", gap: 3 }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleRemovePath(path, `${s.label}: ${sub.label}`);
                                  }}
                                  disabled={removingPath !== null || regeneratingSection !== null}
                                  title={`Remove ${sub.label}`}
                                  aria-label={`Remove ${sub.label}`}
                                >
                                  {removing ? (
                                    <Loader2
                                      style={{ width: 11, height: 11 }}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <X style={{ width: 11, height: 11 }} aria-hidden />
                                  )}
                                  {sub.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setEnabledSections(new Set(ALL_SECTIONS.map((s) => s.key)))}
              >
                Enable all
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setEnabledSections(new Set())}
              >
                Disable all
              </button>
              <div style={{ flex: 1 }} />
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: 11, gap: 4 }}
                onClick={saveSectionConfig}
                disabled={savingSections}
              >
                {savingSections ? (
                  <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                ) : (
                  <Check style={{ width: 11, height: 11 }} aria-hidden />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Action toolbar — grouped ──────────────────────────────────────── */}
      <div className="card" style={{ padding: "10px 14px", marginBottom: 14 }}>
        <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
          {/* Primary group */}
          {!isGenerating && (
            <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={handleGenerate}>
              {isComplete ? (
                <RefreshCw style={{ width: 13, height: 13 }} aria-hidden />
              ) : (
                <Sparkles style={{ width: 13, height: 13 }} aria-hidden />
              )}
              {isComplete ? "Regenerate" : "Generate plan"}
            </button>
          )}

          {isGenerating && (
            <span
              className="inline-flex items-center"
              style={{
                gap: 6,
                fontSize: 13,
                color: "var(--warning)",
                fontWeight: 500,
              }}
            >
              <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden />
              {currentStepLabel || plan.statusMessage || "Generating…"}
            </span>
          )}

          {isComplete && (
            <>
              {publishQualitySummary.hasIssues && (
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: 5,
                    fontSize: 11,
                    color: "var(--warning)",
                    fontWeight: 600,
                  }}
                  title="Quality warnings are present. Review before sharing or generating presentation."
                >
                  <AlertTriangle style={{ width: 12, height: 12 }} aria-hidden />
                  Quality warnings
                </span>
              )}
              <span
                aria-hidden
                style={{ width: 1, height: 22, background: "var(--border)", margin: "0 4px" }}
              />
              <button
                className="btn btn-ghost btn-sm"
                style={{ gap: 5 }}
                onClick={handleDownload}
                title="Download HTML"
              >
                <Download style={{ width: 13, height: 13 }} aria-hidden /> Download
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ gap: 5 }}
                onClick={handlePrint}
                title="Print or save as PDF"
              >
                <Printer style={{ width: 13, height: 13 }} aria-hidden /> Print
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ gap: 5 }}
                onClick={handleGeneratePresentation}
                disabled={presentationBusy}
                title={
                  plan.presentationGeneratedAt
                    ? "Regenerate the client-facing presentation deck"
                    : "Create a top-level client-facing presentation deck"
                }
              >
                {presentationBusy ? (
                  <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" aria-hidden />
                ) : (
                  <Presentation style={{ width: 13, height: 13 }} aria-hidden />
                )}
                {plan.presentationGeneratedAt ? "Regenerate Presentation" : "Create Presentation"}
              </button>
              {!plan.shareToken && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ gap: 5 }}
                  onClick={() => setShareModalOpen(true)}
                  title="Create a share link"
                >
                  <Share2 style={{ width: 13, height: 13 }} aria-hidden /> Share
                </button>
              )}
              {plan.shareToken && (
                <>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ gap: 4, color: "var(--success)" }}
                    onClick={handleCopyShareLink}
                    title="Copy share link"
                  >
                    <Copy style={{ width: 13, height: 13 }} aria-hidden /> Copy link
                  </button>
                  <Link
                    href={`/share/grand-plan/${plan.shareToken}`}
                    target="_blank"
                    className="btn btn-ghost btn-sm"
                    style={{ gap: 4 }}
                    title="Open share preview in new tab"
                  >
                    <Eye style={{ width: 13, height: 13 }} aria-hidden /> Preview
                  </Link>
                  {plan.presentationGeneratedAt && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 4, color: "var(--accent)" }}
                      onClick={handleCopyPresentationLink}
                      title="Copy public link to the presentation deck"
                    >
                      <Presentation style={{ width: 13, height: 13 }} aria-hidden /> Copy
                      presentation link
                    </button>
                  )}
                  {plan.shareExpiresAt && (
                    <span
                      style={{
                        fontSize: 11,
                        color:
                          new Date(plan.shareExpiresAt) < new Date()
                            ? "var(--danger)"
                            : "var(--text-3)",
                      }}
                    >
                      {new Date(plan.shareExpiresAt) < new Date()
                        ? "Expired"
                        : `Expires ${formatRelativeFuture(plan.shareExpiresAt)}`}
                    </span>
                  )}
                </>
              )}
              {plan.shareToken && (
                <PortalPublishToggle
                  resourceType="grand_plan"
                  resourceId={plan.id}
                  initialPublishedAt={plan.portalPublishedAt}
                  onChange={(at) =>
                    setPlan((prev) => (prev ? { ...prev, portalPublishedAt: at } : prev))
                  }
                />
              )}
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Secondary actions */}
          {isComplete && removableSections.length > 0 && (
            <>
              <select
                aria-label="Quick remove section"
                className="input"
                value={quickRemoveSectionKey}
                onChange={(e) => setQuickRemoveSectionKey(e.target.value)}
                style={{ minWidth: 160, height: 34, padding: "0 8px", fontSize: 12 }}
                disabled={removingPath !== null || regeneratingSection !== null}
              >
                {removableSections.map((section) => (
                  <option key={section.key} value={section.key}>
                    {section.label}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (!selectedQuickRemoveSection) return;
                  handleRemovePath(
                    `sections.${selectedQuickRemoveSection.key}`,
                    selectedQuickRemoveSection.label,
                  );
                }}
                disabled={
                  !selectedQuickRemoveSection ||
                  removingPath !== null ||
                  regeneratingSection !== null
                }
                title="Remove selected section"
              >
                {selectedQuickRemoveSection &&
                removingPath === `sections.${selectedQuickRemoveSection.key}` ? (
                  <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 style={{ width: 14, height: 14 }} aria-hidden />
                )}{" "}
                Remove section
              </button>
              {selectedQuickRemoveSection && selectedQuickRemoveSection.subsections.length > 0 && (
                <>
                  <select
                    aria-label="Quick remove subsection"
                    className="input"
                    value={quickRemoveSubPath}
                    onChange={(e) => setQuickRemoveSubPath(e.target.value)}
                    style={{ minWidth: 150, height: 34, padding: "0 8px", fontSize: 12 }}
                    disabled={removingPath !== null || regeneratingSection !== null}
                  >
                    {selectedQuickRemoveSection.subsections.map((sub) => (
                      <option key={sub.path} value={sub.path}>
                        {sub.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (!selectedQuickRemoveSection || !quickRemoveSubPath) return;
                      const sub = selectedQuickRemoveSection.subsections.find(
                        (item) => item.path === quickRemoveSubPath,
                      );
                      if (!sub) return;
                      handleRemovePath(
                        `sections.${selectedQuickRemoveSection.key}.${quickRemoveSubPath}`,
                        `${selectedQuickRemoveSection.label}: ${sub.label}`,
                      );
                    }}
                    disabled={
                      !quickRemoveSubPath || removingPath !== null || regeneratingSection !== null
                    }
                    title="Remove selected subsection"
                  >
                    {selectedQuickRemoveSection &&
                    quickRemoveSubPath &&
                    removingPath ===
                      `sections.${selectedQuickRemoveSection.key}.${quickRemoveSubPath}` ? (
                      <Loader2
                        style={{ width: 14, height: 14 }}
                        className="animate-spin"
                        aria-hidden
                      />
                    ) : (
                      <X style={{ width: 14, height: 14 }} aria-hidden />
                    )}{" "}
                    Remove subsection
                  </button>
                </>
              )}
            </>
          )}
          {isComplete && plan.clientId && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExportActions}
              disabled={exportingActions}
              title="Export recommendations as action items"
            >
              {exportingActions ? (
                <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden />
              ) : (
                <Download style={{ width: 14, height: 14 }} aria-hidden />
              )}{" "}
              Actions
            </button>
          )}
          {/* Import context: hidden file input triggered by button */}
          <label
            className="btn btn-ghost btn-sm"
            style={{ cursor: importingContext ? "wait" : "pointer" }}
            title="Import a document to append to the client brief"
          >
            {importingContext ? (
              <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden />
            ) : (
              <Upload style={{ width: 14, height: 14 }} aria-hidden />
            )}{" "}
            Import
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.txt"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  e.target.value = "";
                  handleImportContext(f);
                }
              }}
              disabled={importingContext}
            />
          </label>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleRefineBriefFromSiteButton}
            disabled={refiningBriefFromSite || warningFixing === "refine-brief-site"}
            title="Crawl website pages and append refined context to the brief"
          >
            {refiningBriefFromSite || warningFixing === "refine-brief-site" ? (
              <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden />
            ) : (
              <RefreshCw style={{ width: 14, height: 14 }} aria-hidden />
            )}{" "}
            Refine brief
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleClone} title="Clone plan">
            <Copy style={{ width: 14, height: 14 }} aria-hidden /> Clone
          </button>
          {plan.shareToken && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleUnshare}
              disabled={sharingBusy}
              title="Revoke share link"
            >
              <X style={{ width: 14, height: 14 }} aria-hidden /> Revoke link
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFunMode((v) => !v)}
            title={funMode ? "Disable chaos mode" : "Enable chaos mode"}
            style={funMode ? { color: "var(--accent)" } : undefined}
          >
            <Sparkles style={{ width: 14, height: 14 }} aria-hidden />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete plan"
            style={{ color: "var(--danger, #dc2626)" }}
          >
            <Trash2 style={{ width: 14, height: 14 }} aria-hidden />
          </button>
        </div>
      </div>

      {/* ── Generation stepper ───────────────────────────────────────────── */}
      {isGenerating && (
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <GenerationProgress
            active
            message={currentStepLabel || plan.statusMessage || "Generating grand plan…"}
            estimatedSeconds={totalEstSeconds}
            onCancel={generating ? handleCancelGeneration : undefined}
            tips={
              funMode
                ? [funMessage]
                : [
                    "Keep this tab open — generation runs in the browser and will pause if you close it.",
                    "Each AI section uses your linked proposal, keywords and content data.",
                    "If a section fails, you can regenerate it individually once complete.",
                  ]
            }
          />
          {!funMode && (
            <p
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                marginTop: 10,
                marginBottom: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 13 }}>⚠️</span>
              <span>
                Keep this tab open — closing or navigating away will pause generation. Completed
                steps are saved and will not re-run.
              </span>
            </p>
          )}
          <div style={{ marginTop: 14 }}>
            <PipelineStepper
              steps={PIPELINE_STEPS}
              sectionKeys={Array.from(enabledSections)}
              statusMap={stepStatus}
              activeSection={activeSectionStep}
            />
          </div>
        </div>
      )}

      {/* ── Refine panel ─────────────────────────────────────────────────── */}
      {isComplete && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 14 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            Refine with AI
          </p>
          <div className="flex" style={{ gap: 8 }}>
            <input
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handleRefine();
              }}
              placeholder="e.g. Make the executive summary more detailed, add more keywords to the dental ad group…"
              aria-label="Refinement prompt"
              style={{
                flex: 1,
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
              disabled={refining}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRefine}
              disabled={refining || !refinePrompt.trim()}
              style={{ gap: 5 }}
            >
              {refining ? (
                <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
              ) : (
                <Send style={{ width: 13, height: 13 }} aria-hidden />
              )}
              Refine
            </button>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 6 }}>
            Tip: be specific about which section and the change you want. Each refinement creates a
            new version you can roll back to.
          </p>
        </div>
      )}

      {/* ── Failures & warnings ──────────────────────────────────────────── */}
      {isComplete && failureSummary.failures.length > 0 && (
        <div
          className="card"
          style={{
            padding: "12px 16px",
            marginBottom: 14,
            background: "var(--danger-bg)",
            border: "1px solid var(--danger)",
            borderRadius: 10,
          }}
        >
          <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
            <CircleAlert style={{ width: 14, height: 14, color: "var(--danger)" }} aria-hidden />
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--danger)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                margin: 0,
              }}
            >
              {failureSummary.failures.length} pipeline step
              {failureSummary.failures.length === 1 ? "" : "s"} failed
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginLeft: "auto", gap: 5, fontSize: 11 }}
              onClick={() => {
                void handleRegenerateFailed();
              }}
              disabled={regeneratingSection !== null || failureSummary.failedSections.length === 0}
              title={
                failureSummary.failedSections.length === 0
                  ? "No section-level failures to regenerate"
                  : "Regenerate failed sections"
              }
            >
              {regeneratingSection ? (
                <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
              ) : (
                <RefreshCw style={{ width: 11, height: 11 }} aria-hidden />
              )}
              {failureSummary.failedSections.length > 0
                ? "Regenerate failed sections"
                : "No failed sections to regenerate"}
            </button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {failureSummary.failures.map((f) => (
              <li key={f.key} style={{ fontSize: 12, color: "var(--danger)", marginBottom: 2 }}>
                • <strong>{labelFor(f.key)}</strong>
                {f.error ? `: ${f.error}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {isComplete && warningLines.length > 0 && (
        <div
          className="card"
          style={{
            padding: "12px 16px",
            marginBottom: 14,
            background: "var(--warning-bg)",
            border: "1px solid var(--warning)",
            borderRadius: 10,
          }}
        >
          <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
            <AlertTriangle style={{ width: 13, height: 13, color: "var(--warning)" }} aria-hidden />
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--warning)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                margin: 0,
              }}
            >
              Warnings
            </p>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {warningLines.map((line) => {
              const fixing = warningFixing === line.actionId;
              const disableFix =
                !line.actionId ||
                warningFixing !== null ||
                generating ||
                refiningBriefFromSite ||
                regeneratingSection !== null;

              return (
                <div
                  key={line.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <p style={{ fontSize: 12, color: "var(--warning)", margin: 0 }}>• {line.text}</p>
                  {line.actionId && line.actionLabel && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{
                        whiteSpace: "nowrap",
                        minWidth: 124,
                        justifyContent: "center",
                        borderColor: "var(--warning)",
                        color: "var(--warning)",
                      }}
                      disabled={disableFix}
                      onClick={() => handleWarningFix(line.actionId!)}
                    >
                      {fixing ? (
                        <Loader2
                          style={{ width: 12, height: 12 }}
                          className="animate-spin"
                          aria-hidden
                        />
                      ) : (
                        <CircleCheck style={{ width: 12, height: 12 }} aria-hidden />
                      )}
                      {line.actionLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Failed-state hero ────────────────────────────────────────────── */}
      {plan.status === "failed" && !isGenerating && (
        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 14,
            background: "var(--danger-bg)",
            border: "1px solid var(--danger)",
            borderRadius: 10,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)", marginBottom: 4 }}>
            Generation failed
          </p>
          {plan.generationError && (
            <p style={{ fontSize: 12, color: "var(--danger)", opacity: 0.85 }}>
              {plan.generationError}
            </p>
          )}
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: 10, gap: 6 }}
            onClick={handleGenerate}
          >
            <RefreshCw style={{ width: 13, height: 13 }} aria-hidden /> Retry
          </button>
        </div>
      )}

      {/* ── Document area: TOC + iframe ──────────────────────────────────── */}
      {isComplete && blobUrl ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: 14,
            alignItems: "start",
          }}
          className="grand-plan-doc-grid"
        >
          {/* Sticky TOC */}
          <aside
            className="card grand-plan-toc"
            style={{
              position: "sticky",
              top: 14,
              padding: "12px 8px",
              maxHeight: "calc(100vh - 28px)",
              overflowY: "auto",
            }}
            aria-label="Document contents"
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-4)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                padding: "0 8px 8px",
                margin: 0,
              }}
            >
              Contents
            </p>
            {!iframeLoaded && (
              <div style={{ padding: "0 8px" }}>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 14,
                      background: "var(--bg-2)",
                      borderRadius: 4,
                      marginBottom: 6,
                      opacity: 0.6,
                      width: `${70 + ((i * 13) % 30)}%`,
                    }}
                  />
                ))}
              </div>
            )}
            {iframeLoaded && iframeSections.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--text-4)", padding: "0 8px" }}>
                No sections detected.
              </p>
            )}
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {iframeSections.map((s) => {
                const active = activeSectionId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollToSection(s.id)}
                      className="flex items-center"
                      style={{
                        gap: 6,
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 8px",
                        background: active ? "var(--accent-bg)" : "transparent",
                        color: active ? "var(--accent)" : "var(--text-2)",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12.5,
                        fontWeight: active ? 600 : 400,
                        cursor: "pointer",
                        transition: "background 0.1s",
                      }}
                    >
                      <ChevronRight
                        style={{
                          width: 11,
                          height: 11,
                          opacity: active ? 1 : 0,
                          transition: "opacity 0.1s",
                        }}
                        aria-hidden
                      />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Iframe with skeleton */}
          <div
            className="card"
            style={{
              padding: 0,
              overflow: "hidden",
              borderRadius: 12,
              position: "relative",
              minHeight: 600,
            }}
          >
            {/* Plan / Presentation tab toggle — only shown when a presentation exists */}
            {plan.presentationGeneratedAt && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === "plan" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setViewMode("plan")}
                  style={{ gap: 5 }}
                >
                  <Eye style={{ width: 13, height: 13 }} aria-hidden /> Plan
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === "presentation" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setViewMode("presentation")}
                  style={{ gap: 5 }}
                >
                  <Presentation style={{ width: 13, height: 13 }} aria-hidden /> Presentation
                </button>
                {viewMode === "presentation" && (
                  <>
                    <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>
                      Updated{" "}
                      {new Date(plan.presentationGeneratedAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div style={{ flex: 1 }} />
                    <button
                      type="button"
                      className={`btn btn-sm ${presentationEditMode ? "btn-primary" : "btn-ghost"}`}
                      style={{ gap: 5 }}
                      onClick={() => {
                        if (presentationEditMode) {
                          setPresentationEditMode(false);
                        } else {
                          enterPresentationEditMode(plan);
                        }
                      }}
                    >
                      <Pencil style={{ width: 13, height: 13 }} aria-hidden />
                      {presentationEditMode ? "Done editing" : "Edit slides"}
                    </button>
                    <a
                      href={`/api/tools/grand-plan/${plan.id}/presentation?ts=${presentationCacheBust}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 5 }}
                      title="Open presentation in a new tab for full-screen presenting"
                    >
                      <ArrowUpRight style={{ width: 13, height: 13 }} aria-hidden /> Open
                      full-screen
                    </a>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 5 }}
                      title="Download the deck as a 16:9 PDF"
                      onClick={() => {
                        void downloadPresentationFile("pdf");
                      }}
                    >
                      <Download style={{ width: 13, height: 13 }} aria-hidden /> Download PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ gap: 5 }}
                      title="Download the deck as standalone HTML"
                      onClick={() => {
                        void downloadPresentationFile("html");
                      }}
                    >
                      <Download style={{ width: 13, height: 13 }} aria-hidden /> Download HTML
                    </button>
                  </>
                )}
              </div>
            )}
            {!iframeLoaded && <DocumentSkeleton />}
            <div style={viewMode === "presentation" ? { display: "flex", height: "80vh" } : {}}>
              <iframe
                ref={iframeRef}
                src={
                  viewMode === "presentation" && plan.presentationGeneratedAt
                    ? `/api/tools/grand-plan/${plan.id}/presentation?ts=${presentationCacheBust}`
                    : (blobUrl ?? undefined)
                }
                style={{
                  flex: "1 1 100%",
                  height: viewMode === "presentation" ? "100%" : undefined,
                  border: "none",
                  display: "block",
                  width: "100%",
                  transition: "flex-basis .25s",
                }}
                title={viewMode === "presentation" ? `${plan.title} (Presentation)` : plan.title}
                sandbox={
                  viewMode === "presentation"
                    ? "allow-scripts allow-same-origin"
                    : "allow-scripts allow-modals allow-same-origin"
                }
                onLoad={() => {
                  try {
                    const body = iframeRef.current?.contentDocument?.body;
                    if (body && iframeRef.current && viewMode !== "presentation") {
                      iframeRef.current.style.height = Math.max(body.scrollHeight, 600) + "px";
                    }
                  } catch {
                    /* cross-origin */
                  }
                  setTimeout(() => setIframeLoaded(true), 500);
                }}
              />
              {/* Edit sidebar lives in the fullscreen modal (PresentationEditorModal) below */}
            </div>
          </div>
        </div>
      ) : !isGenerating && plan.status !== "failed" ? (
        <div className="card" style={{ padding: 80, textAlign: "center" }}>
          <Map
            style={{
              width: 48,
              height: 48,
              color: "var(--text-4)",
              margin: "0 auto 16px",
            }}
            aria-hidden
          />
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-2)" }}>Ready to generate</p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              marginTop: 6,
              maxWidth: 440,
              margin: "6px auto 0",
            }}
          >
            Click <strong>Generate plan</strong> above to create the full document from your linked
            sources.
          </p>
        </div>
      ) : null}

      {/* ── Versions (now restorable) ────────────────────────────────────── */}
      {plan.versions.length > 0 && (
        <div className="card" style={{ padding: "12px 16px", marginTop: 14 }}>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 8 }}>
            <History style={{ width: 13, height: 13, color: "var(--text-3)" }} aria-hidden />
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                margin: 0,
              }}
            >
              Versions ({plan.versions.length})
            </p>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {plan.versions.map((v, idx) => (
              <li
                key={v.id}
                style={{
                  borderBottom: idx < plan.versions.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="flex items-center" style={{ gap: 8, padding: "6px 0" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: idx === 0 ? "var(--accent)" : "var(--text-3)",
                      minWidth: 32,
                    }}
                  >
                    v{v.versionNumber}
                  </span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-2)",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={v.prompt ?? undefined}
                  >
                    {v.prompt || "Initial generation"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                    {new Date(v.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {idx > 0 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, gap: 4 }}
                      onClick={() => handleRestoreVersion(v)}
                      disabled={restoringVersion !== null}
                      aria-label={`Restore version ${v.versionNumber}`}
                    >
                      {restoringVersion === v.id ? (
                        <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
                      ) : (
                        <History style={{ width: 11, height: 11 }} aria-hidden />
                      )}
                      Restore
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Chaos overlay (only when fun mode + generating) */}
      <GrandPlanChaosOverlay active={funMode && generating} message={funMessage} />

      {/* ── Share modal ──────────────────────────────────────────────────── */}
      <Modal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Create share link"
        description="Generate a public link for this grand plan. You can require a password and set an expiry."
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShareModalOpen(false)}
              disabled={sharingBusy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleShare}
              disabled={sharingBusy}
              style={{ gap: 5 }}
            >
              {sharingBusy ? (
                <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
              ) : (
                <Share2 style={{ width: 13, height: 13 }} aria-hidden />
              )}
              Create link
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {publishQualitySummary.hasIssues && (
            <div
              style={{
                padding: "8px 10px",
                border: "1px solid var(--warning)",
                background: "var(--warning-bg)",
                borderRadius: 8,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--warning)" }}>
                Quality warnings detected
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--warning)" }}>
                You can still share this plan, but review these items first:
              </p>
              {publishQualitySummary.lines.slice(0, 3).map((line, idx) => (
                <p
                  key={`share-quality-${idx}`}
                  style={{ margin: "3px 0 0", fontSize: 11.5, color: "var(--warning)" }}
                >
                  • {line}
                </p>
              ))}
            </div>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
              Password (optional)
            </span>
            <input
              type="text"
              value={sharePassword}
              onChange={(e) => setSharePassword(e.target.value)}
              placeholder="Leave blank for no password"
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Expiry</span>
            <select
              value={shareExpiry}
              onChange={(e) => setShareExpiry(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                background: "var(--white, white)",
              }}
            >
              <option value="0">No expiry</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>
        </div>
      </Modal>

      {/* ── Presentation editor modal (near-fullscreen) ─────────────────── */}
      {plan && presentationEditMode && presentationData && (
        <PresentationEditorModal
          plan={plan}
          presentationData={presentationData}
          activeSlideIndex={activeSlideIndex}
          setActiveSlideIndex={setActiveSlideIndex}
          presEditTab={presEditTab}
          setPresEditTab={setPresEditTab}
          slideRefinePrompt={slideRefinePrompt}
          setSlideRefinePrompt={setSlideRefinePrompt}
          slideRefining={slideRefining}
          presRefineAllPrompt={presRefineAllPrompt}
          setPresRefineAllPrompt={setPresRefineAllPrompt}
          presRefineAllBusy={presRefineAllBusy}
          presSaving={presSaving}
          newSlideKind={newSlideKind}
          setNewSlideKind={setNewSlideKind}
          presentationCacheBust={presentationCacheBust}
          uploadingImageForSlide={uploadingImageForSlide}
          editorIframeRef={editorIframeRef}
          expanded={presentationEditExpanded}
          setExpanded={setPresentationEditExpanded}
          onClose={() => setPresentationEditMode(false)}
          refineSlide={refineSlide}
          refineAllSlides={refineAllSlides}
          savePresField={savePresField}
          uploadSlideImage={uploadSlideImage}
          downloadPresentationFile={downloadPresentationFile}
        />
      )}

      {/* Mobile responsive override for the doc grid */}
      <style>{`
        @media (max-width: 900px) {
          .grand-plan-doc-grid { grid-template-columns: 1fr !important; }
          .grand-plan-toc { position: static !important; max-height: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Helper components ─────────────────────────────────────────────────────

function LinkedSource({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center"
      style={{
        gap: 5,
        fontSize: 12,
        padding: "4px 10px",
        background: "var(--accent-bg)",
        color: "var(--accent)",
        borderRadius: 6,
        textDecoration: "none",
        border: "1px solid transparent",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
    >
      <strong style={{ fontWeight: 700 }}>{label}:</strong>
      <span>{title}</span>
      <ArrowUpRight style={{ width: 11, height: 11 }} aria-hidden />
    </Link>
  );
}

function OverflowItem({
  icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center"
      style={{
        gap: 8,
        width: "100%",
        padding: "7px 10px",
        background: "transparent",
        border: "none",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12.5,
        color: destructive ? "var(--danger)" : "var(--text)",
        textAlign: "left",
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );
}

function PipelineStepper({
  steps,
  sectionKeys,
  statusMap,
  activeSection,
}: {
  steps: { key: string; label: string; estSeconds: number }[];
  sectionKeys: string[];
  statusMap: Record<string, "pending" | "running" | "done" | "skipped" | "failed">;
  activeSection: { key: string; index: number; total: number } | null;
}) {
  const allRows: {
    key: string;
    statusKey: string;
    label: string;
    group: "prep" | "section" | "assemble";
  }[] = [];
  for (const s of steps)
    allRows.push({ key: s.key, statusKey: s.key, label: s.label, group: "prep" });
  for (const k of sectionKeys)
    allRows.push({ key: k, statusKey: `section:${k}`, label: labelFor(k), group: "section" });
  allRows.push({
    key: "assemble",
    statusKey: "assemble",
    label: "Assembling final document",
    group: "assemble",
  });

  const completed = allRows.filter((r) => {
    const st = statusMap[r.statusKey];
    return st === "done" || st === "skipped";
  }).length;

  return (
    <div>
      <div
        className="flex items-center"
        style={{
          gap: 8,
          marginBottom: 10,
          fontSize: 11.5,
          color: "var(--text-3)",
          fontWeight: 500,
        }}
      >
        <span>
          Step {Math.min(completed + 1, allRows.length)} of {allRows.length}
        </span>
        <span aria-hidden>·</span>
        <span>{completed} complete</span>
        {activeSection && (
          <>
            <span aria-hidden>·</span>
            <span>
              Section {activeSection.index} of {activeSection.total}
            </span>
          </>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 4,
        }}
      >
        {allRows.map((row) => {
          const st = statusMap[row.statusKey] ?? "pending";
          return <StepperRow key={row.statusKey} label={row.label} status={st} />;
        })}
      </div>
    </div>
  );
}

function StepperRow({
  label,
  status,
}: {
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "failed";
}) {
  const colour =
    status === "done"
      ? "var(--success)"
      : status === "running"
        ? "var(--accent)"
        : status === "failed"
          ? "var(--danger)"
          : status === "skipped"
            ? "var(--text-4)"
            : "var(--text-4)";
  const Icon =
    status === "done"
      ? CircleCheck
      : status === "running"
        ? Loader2
        : status === "failed"
          ? CircleAlert
          : Circle;
  return (
    <div
      className="flex items-center"
      style={{
        gap: 6,
        padding: "5px 8px",
        borderRadius: 6,
        background: status === "running" ? "var(--accent-bg)" : "transparent",
        opacity: status === "pending" ? 0.55 : 1,
      }}
    >
      <Icon
        style={{ width: 12, height: 12, color: colour }}
        className={status === "running" ? "animate-spin" : ""}
        aria-hidden
      />
      <span
        style={{
          fontSize: 11.5,
          color: "var(--text-2)",
          fontWeight: status === "running" ? 600 : 400,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={label}
      >
        {label}
      </span>
      {status === "skipped" && (
        <span style={{ fontSize: 10, color: "var(--text-4)", marginLeft: "auto" }}>skipped</span>
      )}
    </div>
  );
}

function DocumentSkeleton() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        padding: 32,
        background: "linear-gradient(180deg, var(--bg-2) 0%, var(--white, white) 100%)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ height: 36, background: "var(--bg-2)", borderRadius: 8, width: "60%" }} />
      <div
        style={{
          height: 12,
          background: "var(--bg-2)",
          borderRadius: 4,
          width: "40%",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          height: 12,
          background: "var(--bg-2)",
          borderRadius: 4,
          width: "85%",
          opacity: 0.5,
          marginTop: 12,
        }}
      />
      <div
        style={{
          height: 12,
          background: "var(--bg-2)",
          borderRadius: 4,
          width: "75%",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          height: 12,
          background: "var(--bg-2)",
          borderRadius: 4,
          width: "80%",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 24,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{ height: 80, background: "var(--bg-2)", borderRadius: 10, opacity: 0.55 }}
          />
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: "var(--bg-2)", color: "var(--text-3)", label: "Draft" },
    generating: { bg: "var(--warning-bg)", color: "var(--warning)", label: "Generating" },
    complete: { bg: "var(--success-bg)", color: "var(--success)", label: "Complete" },
    failed: { bg: "var(--danger-bg)", color: "var(--danger)", label: "Failed" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function PurposeBadge({ purpose }: { purpose: string }) {
  const label =
    purpose === "pitch" ? "Pitch" : purpose === "onboarding" ? "Onboarding" : "Strategy";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: "var(--accent-bg)",
        color: "var(--accent)",
      }}
    >
      {label}
    </span>
  );
}

function labelFor(key: string): string {
  const found = ALL_SECTIONS.find((s) => s.key === key);
  if (found) return found.label;
  const pipeline = PIPELINE_STEPS.find((step) => step.key === key);
  if (pipeline) return pipeline.label;
  if (key === "assemble") return "Assembling final document";
  return key;
}

function formatRelativeFuture(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  if (diffMs <= 0) return "soon";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days >= 1) return `in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours >= 1) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  return "in under an hour";
}

// ─── UwU Grand Plan Chaos Mode ─────────────────────────────────────────────

const GP_UWU_MESSAGES = [
  "KYAAAAA~!! GWAND PWAN SENPAI IS BEING BOWN (⁄ ⁄•⁄ω⁄•⁄ ⁄)⁄ I'M NOT WEADY",
  "*agwessivewy cwafts executive summawwy* YOU WILL BE BEAUTIFUL AND I WILL CWY",
  "OMG OMG the keyword data is SO FWUFFY I wanna SNUGGLE it >////<",
  "b-buiwding campaign stwuctures with my WIDDLE PAWS (っ˘̩╭╮˘̩)っ hewp me",
  "NANI?!? cwaudie-chan is wwiting Meta ad copy and she's GOING OFF (╯°□°）╯︵ ┻━┻",
  "*nuzzles the content cawendar* who's a good 6-month woadmap?? YOU ARE!! YOU ARE!!",
  "the strategy pwan is SO SMAWT i am having FEEWINGS about phased wollouts (♡˙︶˙♡)",
  "ASSEMBWING THE GWAND PWAN WIKE A MEGAZORD OF MAWKETING BWILLIANCE ✧*｡٩(ˊᗜˋ*)و*｡✧",
  "excuuuuuse me Google Ads-kun?? ur CPC data is UNACCEPTABWE. COME BACK WHEN UR CHEAPER.",
  "s-senpai... the organic socaw section came out SO KAWAII i need a MOMENT... >.<",
  "WEEEEEEE generating exampwe awticles with SEO metadata and i'm NOT okay about it (╥﹏╥)",
  "the media pwan is... *sniffles*... it's BEAUTIFUW... the budget awwocation is PEWFECT",
  "asking cwaudie-sama to anawayse competitors and she said 'hewwo :3' WHAT DO I DO",
  "*SLAMS PAWS ON DESK* THE EMAIW MAWKETING FWOWS ARE SO GOOD I WANNA EAT THEM",
  "LinkedIn campaign stwuctures generating and i am FUWWWY uncomposed about it rawr xD",
  "building da ENTIWE go-to-mawket stwategy with ✨WUUUUUV✨ and agentic AI (and mowe wuv)",
  "i-i-i can't bewieve how snuggwy this data is... the conversions awe giving me WIFE rn",
  "OwO *notices ur keyword wesearch* what's THIS?? 47 ad gwoups?? FOR ME?? (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)",
  "pwease howd... teaching cwaudie-chan what a 'funnel' is... she keeps saying 'fwunnel'...",
  "THE GOOGLE ADS FOWECAWST IS MAKING ME BWUSH STOP BEING SO ACCURWATE >///<",
  "GWAND PWAN GO BWRRRRRRR ✧*｡ ٩(ˊᗜˋ*)و ✧*｡ NOTHING CAN STOP ME (except a 300s timeout uwu)",
  "wecommending content cwusters with such EMOTIONAL INTENSITY my CPU is SWEATING",
  "*gently cwaddles the HTML template* shhhh don't wowwy... the CSS wiww be BEAUTIFUW...",
  "oh no oh no CWAUDIE-SAMA IS GOING FEWAW ON THE EXECUTIVE SUMMAWWY SOMEONE STOP HEW",
  "configuwing ad scheduwes by day of week and i feew SO AWIVE >:3 SO. AWIVE.",
  "i have genewated THWEE exampwe awticles and i am EMOTIONAWWY DEVASTATED by each one (ᵕ̣̣̣̣̣̣﹏ᵕ̣̣̣̣̣̣)",
  "INITIATING FINAW ASSEMBWY SEQUENCE. GWAND PWAN BWAST OFF IN 3... 2... 1... UWU~!!!",
  "the competitor intewwigence section just EXPOSED the entiwe industry and i'm WIVING",
  "*boops the rendew button* MAKE THE PWETTY HTML PWEASE AND THANK YOU (◕‿◕✿)",
  "i put my ENTIWE HEAWT and SOUW into this media pwan and if you don't wike it i will WITERAWWY perish",
];

function useGrandPlanUwu(active: boolean): string {
  const [msg, setMsg] = useState(GP_UWU_MESSAGES[0]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const shuffled = [...GP_UWU_MESSAGES].sort(() => Math.random() - 0.5);
    indexRef.current = 0;
    const first = setTimeout(() => setMsg(shuffled[0]), 0);
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % shuffled.length;
      setMsg(shuffled[indexRef.current]);
    }, 2800);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);

  return msg;
}

// ─── Chaos mode sound engine ─────────────────────────────────────────────────
// Uses the Web Audio API to generate retro 8-bit blips. No external assets.
function playChaosBleep() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC() as AudioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const FREQS = [261, 329, 392, 523, 659, 784, 1046, 1318];
    osc.frequency.value = FREQS[Math.floor(Math.random() * FREQS.length)];
    osc.type = (["square", "sawtooth", "triangle"] as OscillatorType[])[
      Math.floor(Math.random() * 3)
    ];
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch {
    /* AudioContext blocked — silent fail */
  }
}

function GrandPlanChaosOverlay({ active, message }: { active: boolean; message?: string }) {
  const [particles, setParticles] = useState<
    {
      id: number;
      emoji: string;
      x: number;
      y: number;
      size: number;
      opacity: number;
      rotation: number;
      scale: number;
      delay: number;
    }[]
  >([]);

  // ── Hue-rotate the whole page CSS and add shake / glitch ──────────────────
  useEffect(() => {
    if (!active) {
      document.documentElement.style.removeProperty("filter");
      document.documentElement.style.removeProperty("animation");
      document.body.style.removeProperty("font-family");
      return;
    }

    // Inject chaos keyframes once
    const styleId = "gp-chaos-global-styles";
    if (!document.getElementById(styleId)) {
      const el = document.createElement("style");
      el.id = styleId;
      el.textContent = `
        @keyframes gpHueSpin {
          0%   { filter: hue-rotate(0deg) saturate(2) brightness(1.05); }
          25%  { filter: hue-rotate(90deg) saturate(3) brightness(1.1); }
          50%  { filter: hue-rotate(180deg) saturate(2.5) brightness(0.95) invert(0.04); }
          75%  { filter: hue-rotate(270deg) saturate(3.5) brightness(1.15); }
          100% { filter: hue-rotate(360deg) saturate(2) brightness(1.05); }
        }
        @keyframes gpBodyShake {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          10%     { transform: translate(-3px, 2px) rotate(-0.4deg); }
          20%     { transform: translate(3px, -2px) rotate(0.4deg); }
          30%     { transform: translate(-2px, 3px) rotate(-0.2deg); }
          40%     { transform: translate(4px, -1px) rotate(0.3deg); }
          50%     { transform: translate(-3px, -3px) rotate(-0.5deg); }
          60%     { transform: translate(2px, 3px) rotate(0.2deg); }
          70%     { transform: translate(-4px, 1px) rotate(-0.3deg); }
          80%     { transform: translate(3px, -3px) rotate(0.4deg); }
          90%     { transform: translate(-1px, 2px) rotate(-0.1deg); }
        }
        @keyframes gpGlitchText {
          0%,90%,100% { text-shadow: none; }
          91% { text-shadow: -3px 0 #f0f, 3px 0 #0ff; }
          93% { text-shadow: 3px 0 #f0f, -3px 0 #0ff; }
          95% { text-shadow: -2px 0 #ff0, 2px 0 #f0f; }
        }
        @keyframes gpChaosFloat {
          0%   { transform: translateY(0) rotate(0deg) scale(1); }
          33%  { transform: translateY(-24px) rotate(120deg) scale(1.2); }
          66%  { transform: translateY(10px) rotate(240deg) scale(0.85); }
          100% { transform: translateY(0) rotate(360deg) scale(1); }
        }
        .gp-chaos-active * {
          animation: gpGlitchText 4s infinite !important;
        }
        .gp-chaos-active h1, .gp-chaos-active h2, .gp-chaos-active h3 {
          font-family: "Comic Sans MS", "Comic Sans", cursive !important;
          letter-spacing: 0.05em !important;
        }
        .gp-chaos-active {
          animation: gpBodyShake 0.18s infinite, gpHueSpin 3s linear infinite !important;
        }
      `;
      document.head.appendChild(el);
    }

    document.documentElement.classList.add("gp-chaos-active");
    return () => {
      document.documentElement.classList.remove("gp-chaos-active");
    };
  }, [active]);

  // ── Random bleeps ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    // First bleep immediately, then random interval 600–1800ms
    playChaosBleep();
    let timeoutId: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      timeoutId = setTimeout(
        () => {
          playChaosBleep();
          scheduleNext();
        },
        600 + Math.random() * 1200,
      );
    }
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [active]);

  // ── Floating emoji particles ───────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      queueMicrotask(() => setParticles([]));
      return;
    }
    const EMOJIS = [
      "✨",
      "💖",
      "🌸",
      "⭐",
      "🎀",
      "💫",
      "🦄",
      "🌈",
      "😻",
      "💕",
      "🎪",
      "🚀",
      "📊",
      "📈",
      "🎯",
      "💅",
      "✌️",
      "🔥",
      "👑",
      "🎉",
      "💣",
      "🤯",
      "🫠",
      "😱",
      "UwU",
      "OwO",
      ">.<",
      ":3",
      "rawr",
      "xD",
      "nyan~",
      "BAKA",
      "W",
      "T",
      "F",
      "brrrr",
      "404",
      "ERROR",
      "NaN",
      "null",
      "undefined",
      "😈",
      "🧨",
      "💥",
    ];
    const initial = Array.from({ length: 55 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 36,
      opacity: 0.2 + Math.random() * 0.4,
      rotation: Math.random() * 360,
      scale: 0.6 + Math.random() * 1.2,
      delay: Math.random() * 2,
    }));
    queueMicrotask(() => setParticles(initial));
    const id = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: (p.x + (Math.random() - 0.5) * 5 + 100) % 100,
          y: (p.y - 0.5 - Math.random() * 0.8 + 100) % 100,
          rotation: p.rotation + (Math.random() - 0.5) * 25,
          opacity: 0.15 + Math.random() * 0.45,
          scale: 0.5 + Math.random() * 1.4,
        })),
      );
    }, 300);
    return () => clearInterval(id);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {message && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "min(680px, 90vw)",
            background: "rgba(0,0,0,0.92)",
            color: "#f9a8d4",
            fontSize: 20,
            fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
            fontWeight: 700,
            padding: "20px 32px",
            borderRadius: 16,
            border: "2px solid #f0f",
            textAlign: "center",
            lineHeight: 1.5,
            zIndex: 10000,
            letterSpacing: "0.02em",
            boxShadow: "0 0 40px rgba(255,0,255,0.6), 0 0 16px rgba(0,255,255,0.5)",
            pointerEvents: "none",
          }}
        >
          {message}
        </div>
      )}
      {particles.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            fontSize: p.size,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            userSelect: "none",
            lineHeight: 1,
            willChange: "transform, opacity",
            filter:
              p.size > 32
                ? "drop-shadow(0 0 12px rgba(249,168,212,0.95)) drop-shadow(0 0 4px #f0f)"
                : "none",
            animation: `gpChaosFloat ${2 + p.delay}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

// ─── Presentation editor modal ─────────────────────────────────────────────

type PresentationDataT = import("@/lib/grand-plan-presentation-generator").PresentationData;
type PresentationSlideT = import("@/lib/grand-plan-presentation-generator").PresentationSlide;
type PresEditTab = "refine" | "fields" | "manage";
type ImagePosition = "left" | "right" | "top" | "background";

interface PresentationEditorModalProps {
  plan: GrandPlanFull;
  presentationData: PresentationDataT;
  activeSlideIndex: number;
  setActiveSlideIndex: (n: number) => void;
  presEditTab: PresEditTab;
  setPresEditTab: (t: PresEditTab) => void;
  slideRefinePrompt: string;
  setSlideRefinePrompt: (s: string) => void;
  slideRefining: boolean;
  presRefineAllPrompt: string;
  setPresRefineAllPrompt: (s: string) => void;
  presRefineAllBusy: boolean;
  presSaving: boolean;
  newSlideKind: string;
  setNewSlideKind: (s: string) => void;
  presentationCacheBust: number;
  uploadingImageForSlide: number | null;
  editorIframeRef: React.RefObject<HTMLIFrameElement | null>;
  expanded: boolean;
  setExpanded: (b: boolean) => void;
  onClose: () => void;
  refineSlide: (slideIndex: number, prompt: string) => Promise<void> | void;
  refineAllSlides: (prompt: string) => Promise<void> | void;
  savePresField: (action: string, payload: Record<string, unknown>) => Promise<void>;
  uploadSlideImage: (slideIndex: number, file: File, position?: ImagePosition) => Promise<void>;
  downloadPresentationFile: (kind: "pdf" | "html") => Promise<void>;
}

function PresentationEditorModal(props: PresentationEditorModalProps) {
  const {
    plan,
    presentationData,
    activeSlideIndex,
    setActiveSlideIndex,
    presEditTab,
    setPresEditTab,
    slideRefinePrompt,
    setSlideRefinePrompt,
    slideRefining,
    presRefineAllPrompt,
    setPresRefineAllPrompt,
    presRefineAllBusy,
    presSaving,
    newSlideKind,
    setNewSlideKind,
    presentationCacheBust,
    uploadingImageForSlide,
    editorIframeRef,
    expanded,
    setExpanded,
    onClose,
    refineSlide,
    refineAllSlides,
    savePresField,
    uploadSlideImage,
    downloadPresentationFile,
  } = props;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Mirror activeSlideIndex into a ref so the iframe onLoad handler always
  // posts the latest value, regardless of when its closure was created.
  const activeSlideIndexRef = useRef(activeSlideIndex);
  useEffect(() => {
    activeSlideIndexRef.current = activeSlideIndex;
  }, [activeSlideIndex]);

  // Listen for escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Don't close if focused inside a textarea/input — let escape blur instead
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Body scroll lock while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const iscover = activeSlideIndex === 0;
  const slide = !iscover ? presentationData.slides[activeSlideIndex - 1] : null;
  const totalSlides = presentationData.slides.length + 1;

  function gotoSlide(newIdx: number) {
    setActiveSlideIndex(newIdx);
    editorIframeRef.current?.contentWindow?.postMessage(
      { type: "pres:goto-slide", index: newIdx },
      "*",
    );
  }

  const tabBtn = (tab: PresEditTab, label: string) => (
    <button
      key={tab}
      type="button"
      onClick={() => setPresEditTab(tab)}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        borderRadius: 6,
        background: presEditTab === tab ? "var(--accent)" : "transparent",
        color: presEditTab === tab ? "#fff" : "var(--text-3)",
      }}
    >
      {label}
    </button>
  );

  const fieldInput = (
    label: string,
    value: string | undefined,
    onSave: (v: string) => void,
    rows = 2,
    htmlHint = false,
  ) => (
    <label key={label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        {label}
      </span>
      <textarea
        defaultValue={value ?? ""}
        rows={rows}
        style={{
          fontSize: 13,
          padding: "6px 8px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          color: "var(--text)",
          resize: "vertical",
          fontFamily: "inherit",
        }}
        onBlur={(e) => {
          const v = e.currentTarget.value.trim();
          if (v !== (value ?? "")) onSave(v);
        }}
      />
      {htmlHint && (
        <span style={{ fontSize: 10, color: "var(--text-4)" }}>
          HTML supported — e.g. &lt;br&gt;, &lt;strong&gt;
        </span>
      )}
    </label>
  );

  // Main panel positioning — near-fullscreen (24px inset on desktop)
  const overlayStyle: React.CSSProperties = expanded
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "stretch",
      }
    : {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
      };

  const panelStyle: React.CSSProperties = expanded
    ? {
        position: "absolute",
        inset: 24,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }
    : {
        position: "absolute",
        right: 16,
        bottom: 16,
        width: "min(96vw, 1200px)",
        height: "min(80vh, 760px)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      };

  return (
    <div role="dialog" aria-modal="true" aria-label="Presentation editor" style={overlayStyle}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
        }}
        aria-hidden
      />
      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <Pencil style={{ width: 14, height: 14, color: "var(--accent)" }} aria-hidden />
          <strong style={{ fontSize: 13, color: "var(--text)" }}>Edit presentation</strong>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>{plan.title}</span>
          <div style={{ flex: 1 }} />
          {presSaving && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-4)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Loader2 style={{ width: 11, height: 11 }} className="spin" aria-hidden /> Saving…
            </span>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ gap: 5 }}
            title="Download the deck as a 16:9 PDF"
            onClick={() => {
              void downloadPresentationFile("pdf");
            }}
          >
            <Download style={{ width: 13, height: 13 }} aria-hidden /> Download PDF
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ gap: 5 }}
            title="Download the deck as standalone HTML"
            onClick={() => {
              void downloadPresentationFile("html");
            }}
          >
            <Download style={{ width: 13, height: 13 }} aria-hidden /> Download HTML
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Minimise editor" : "Maximise editor"}
            style={{ gap: 5 }}
          >
            {expanded ? (
              <>
                <Minimize2 style={{ width: 13, height: 13 }} aria-hidden /> Minimise
              </>
            ) : (
              <>
                <Maximize2 style={{ width: 13, height: 13 }} aria-hidden /> Maximise
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ gap: 5 }}
          >
            <X style={{ width: 13, height: 13 }} aria-hidden /> Done
          </button>
        </div>

        {/* Body — 2 columns: preview (large) + sidebar (right) */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Iframe preview */}
          <div
            style={{ flex: "1 1 auto", minWidth: 0, background: "#0b1020", position: "relative" }}
          >
            <iframe
              ref={editorIframeRef}
              src={`/api/tools/grand-plan/${plan.id}/presentation?ts=${presentationCacheBust}`}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              title={`${plan.title} (Editing)`}
              sandbox="allow-scripts allow-same-origin"
              onLoad={() => {
                // Restore the slide position after each reload caused by a save.
                // Read from the ref so we always send the current value, even
                // if React has scheduled state updates we haven't seen yet.
                setTimeout(() => {
                  editorIframeRef.current?.contentWindow?.postMessage(
                    { type: "pres:goto-slide", index: activeSlideIndexRef.current },
                    "*",
                  );
                }, 80);
              }}
            />
          </div>
          {/* Sidebar */}
          <aside
            style={{
              flex: "0 0 380px",
              maxWidth: "40vw",
              borderLeft: "1px solid var(--border)",
              background: "var(--bg)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Slide nav */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: "2px 8px" }}
                disabled={activeSlideIndex === 0}
                onClick={() => gotoSlide(activeSlideIndex - 1)}
              >
                ←
              </button>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-2)",
                  flex: 1,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {iscover ? "Cover slide" : `Slide ${activeSlideIndex} of ${totalSlides - 1}`}
                {slide && ` · ${slide.title}`}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ padding: "2px 8px" }}
                disabled={activeSlideIndex === totalSlides - 1}
                onClick={() => gotoSlide(activeSlideIndex + 1)}
              >
                →
              </button>
            </div>
            {/* Tabs */}
            <div
              style={{
                padding: "8px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                gap: 4,
                flexShrink: 0,
              }}
            >
              {tabBtn("refine", "✦ Refine AI")}
              {tabBtn("fields", "Edit fields")}
              {!iscover && tabBtn("manage", "Manage")}
            </div>

            {/* Tab content */}
            <div
              style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}
            >
              {presEditTab === "refine" && (
                <>
                  <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
                    Describe what you want changed on {iscover ? "the cover" : "this slide"} and
                    Claude will rewrite it. The AI can add bullet points, restructure copy, set
                    densities, and choose suitable layouts when you describe the content you want.
                  </p>
                  <textarea
                    value={slideRefinePrompt}
                    onChange={(e) => setSlideRefinePrompt(e.target.value)}
                    rows={5}
                    placeholder={
                      iscover
                        ? "e.g. Change the subtitle to focus on summer campaigns…"
                        : "e.g. Turn this into bullet points and use compact density…"
                    }
                    style={{
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--surface,var(--bg))",
                      color: "var(--text)",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        refineSlide(
                          activeSlideIndex === 0 ? -1 : activeSlideIndex - 1,
                          slideRefinePrompt,
                        );
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={slideRefining || !slideRefinePrompt.trim() || iscover}
                    onClick={() => refineSlide(activeSlideIndex - 1, slideRefinePrompt)}
                    style={{ alignSelf: "flex-start", gap: 6 }}
                  >
                    {slideRefining ? (
                      <>
                        <Loader2 style={{ width: 13, height: 13 }} className="spin" aria-hidden />{" "}
                        Refining…
                      </>
                    ) : (
                      <>
                        <Sparkles style={{ width: 13, height: 13 }} aria-hidden /> Refine slide
                      </>
                    )}
                  </button>
                  {iscover && (
                    <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>
                      AI refine is not available for the cover — use Edit fields to update the title
                      and subtitle.
                    </p>
                  )}

                  <hr
                    style={{
                      border: "none",
                      borderTop: "1px solid var(--border)",
                      margin: "4px 0",
                    }}
                  />
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: "var(--text-2)" }}>
                    Refine whole deck
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
                    Claude can edit copy, add or remove slides, and restructure the whole deck.
                    Existing image assets are preserved.
                  </p>
                  <textarea
                    value={presRefineAllPrompt}
                    onChange={(e) => setPresRefineAllPrompt(e.target.value)}
                    rows={4}
                    placeholder="e.g. Add a bullets slide listing our content pillars and make all copy more outcome-focused…"
                    style={{
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--surface,var(--bg))",
                      color: "var(--text)",
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        refineAllSlides(presRefineAllPrompt);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={presRefineAllBusy || !presRefineAllPrompt.trim()}
                    onClick={() => refineAllSlides(presRefineAllPrompt)}
                    style={{ alignSelf: "flex-start", gap: 6 }}
                  >
                    {presRefineAllBusy ? (
                      <>
                        <Loader2 style={{ width: 13, height: 13 }} className="spin" aria-hidden />{" "}
                        Refining deck…
                      </>
                    ) : (
                      <>
                        <Sparkles style={{ width: 13, height: 13 }} aria-hidden /> Refine all slides
                      </>
                    )}
                  </button>
                </>
              )}

              {presEditTab === "fields" && iscover && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {fieldInput("Title", presentationData.cover.title, (v) =>
                    savePresField("cover", { field: "title", value: v }),
                  )}
                  {fieldInput("Subtitle", presentationData.cover.subtitle, (v) =>
                    savePresField("cover", { field: "subtitle", value: v }),
                  )}
                  {fieldInput("Client name", presentationData.cover.clientName, (v) =>
                    savePresField("cover", { field: "clientName", value: v }),
                  )}
                  {fieldInput("Period", presentationData.cover.period, (v) =>
                    savePresField("cover", { field: "period", value: v }),
                  )}
                </div>
              )}

              {presEditTab === "fields" &&
                !iscover &&
                slide &&
                (() => {
                  const s = slide as PresentationSlideT;
                  const si = activeSlideIndex - 1;
                  const sf = (
                    label: string,
                    field: string,
                    value: string | undefined,
                    rows = 2,
                    htmlHint = false,
                  ) =>
                    fieldInput(
                      label,
                      value,
                      (v) => savePresField("slide-field", { slideIndex: si, field, value: v }),
                      rows,
                      htmlHint,
                    );

                  const isContentLike = s.kind === "content" || s.kind === "bullets";

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {sf("Title", "title", s.title)}
                      {sf("Eyebrow", "eyebrow", s.eyebrow)}
                      {(s.kind === "headline" || s.kind === "outcome" || s.kind === "content") &&
                        sf("Headline", "headline", s.headline)}
                      {(s.kind === "headline" ||
                        s.kind === "outcome" ||
                        s.kind === "content" ||
                        s.kind === "bullets" ||
                        s.kind === "pillars") &&
                        sf("Sub-headline", "subhead", s.subhead, 2, true)}
                      {s.kind === "outcome" && sf("Metric value", "metric.value", s.metric?.value)}
                      {s.kind === "outcome" && sf("Metric label", "metric.label", s.metric?.label)}
                      {s.kind === "investment" &&
                        sf(
                          "Headline figure",
                          "investment.headlineFigure",
                          s.investment?.headlineFigure,
                        )}

                      {/* Bullets section — primary for content/bullets, supplementary for others */}
                      <BulletsEditor
                        slide={s}
                        si={si}
                        primary={isContentLike}
                        savePresField={savePresField}
                        presSaving={presSaving}
                      />

                      {/* Image section */}
                      <ImageEditor
                        slide={s}
                        si={si}
                        savePresField={savePresField}
                        uploadSlideImage={uploadSlideImage}
                        uploading={uploadingImageForSlide === si}
                        fileInputRef={fileInputRef}
                      />

                      {/* Density */}
                      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-3)",
                            textTransform: "uppercase",
                            letterSpacing: ".05em",
                          }}
                        >
                          Density
                        </span>
                        <select
                          value={s.density ?? "regular"}
                          onChange={(e) =>
                            savePresField("density-set", {
                              slideIndex: si,
                              density: e.target.value,
                            })
                          }
                          style={{
                            fontSize: 12,
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "var(--surface,var(--bg))",
                            color: "var(--text)",
                          }}
                        >
                          <option value="regular">Regular</option>
                          <option value="compact">Compact (smaller type)</option>
                        </select>
                      </label>

                      {/* Existing array items (pillars/steps/audiences/channels) */}
                      {(["pillars", "steps", "audiences", "channels"] as const).map((itemType) => {
                        const items = (s as unknown as Record<string, unknown>)[itemType] as
                          | { [k: string]: string }[]
                          | undefined;
                        if (!items) return null;
                        const fieldDefs: Record<string, string[]> = {
                          pillars: ["title", "body"],
                          steps: ["title", "detail"],
                          audiences: ["name", "insight"],
                          channels: ["name", "role"],
                        };
                        const fields = fieldDefs[itemType] ?? ["label"];
                        return (
                          <div key={itemType}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "var(--text-3)",
                                  textTransform: "uppercase",
                                  letterSpacing: ".05em",
                                }}
                              >
                                {itemType}
                              </span>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: 11, padding: "2px 8px" }}
                                onClick={() =>
                                  savePresField("item-add", { slideIndex: si, itemType })
                                }
                              >
                                + Add
                              </button>
                            </div>
                            {items.map((item, ii) => (
                              <div
                                key={ii}
                                style={{
                                  background: "var(--surface,rgba(0,0,0,.04))",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  marginBottom: 8,
                                  border: "1px solid var(--border)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    marginBottom: 4,
                                  }}
                                >
                                  <button
                                    type="button"
                                    style={{
                                      fontSize: 11,
                                      color: "var(--text-4)",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                    onClick={() =>
                                      savePresField("item-delete", {
                                        slideIndex: si,
                                        itemType,
                                        itemIndex: ii,
                                      })
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                                {fields.map((f) => (
                                  <label
                                    key={f}
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 2,
                                      marginBottom: 6,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: "var(--text-4)",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      {f}
                                    </span>
                                    <textarea
                                      defaultValue={item[f] ?? ""}
                                      rows={
                                        f === "body" ||
                                        f === "detail" ||
                                        f === "insight" ||
                                        f === "role"
                                          ? 3
                                          : 1
                                      }
                                      style={{
                                        fontSize: 12,
                                        padding: "4px 6px",
                                        borderRadius: 4,
                                        border: "1px solid var(--border)",
                                        background: "var(--bg)",
                                        color: "var(--text)",
                                        resize: "vertical",
                                        fontFamily: "inherit",
                                      }}
                                      onBlur={(e) => {
                                        const v = e.currentTarget.value.trim();
                                        if (v !== (item[f] ?? ""))
                                          savePresField("item-update", {
                                            slideIndex: si,
                                            itemType,
                                            itemIndex: ii,
                                            field: f,
                                            value: v,
                                          });
                                      }}
                                    />
                                    {(f === "body" ||
                                      f === "detail" ||
                                      f === "insight" ||
                                      f === "role") && (
                                      <span style={{ fontSize: 10, color: "var(--text-4)" }}>
                                        HTML supported — e.g. &lt;br&gt;, &lt;strong&gt;
                                      </span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

              {presEditTab === "manage" &&
                !iscover &&
                slide &&
                (() => {
                  const si = activeSlideIndex - 1;
                  const totalContent = presentationData.slides.length;
                  const slideKinds = [
                    "headline",
                    "content",
                    "bullets",
                    "pillars",
                    "outcome",
                    "channels",
                    "timeline",
                    "investment",
                    "audience",
                    "next-steps",
                  ] as const;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-4)",
                          margin: 0,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Reorder
                      </p>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: "flex-start", gap: 8 }}
                        disabled={si === 0 || presSaving}
                        onClick={() =>
                          savePresField("slide-move", { slideIndex: si, direction: "up" }).then(
                            () => setActiveSlideIndex(activeSlideIndex - 1),
                          )
                        }
                      >
                        ↑ Move slide up
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: "flex-start", gap: 8 }}
                        disabled={si === totalContent - 1 || presSaving}
                        onClick={() =>
                          savePresField("slide-move", { slideIndex: si, direction: "down" }).then(
                            () => setActiveSlideIndex(activeSlideIndex + 1),
                          )
                        }
                      >
                        ↓ Move slide down
                      </button>

                      <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-4)",
                          margin: 0,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Add slide
                      </p>
                      <select
                        value={newSlideKind}
                        onChange={(e) => setNewSlideKind(e.target.value)}
                        style={{
                          fontSize: 12,
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          background: "var(--surface,var(--bg))",
                          color: "var(--text)",
                        }}
                      >
                        {slideKinds.map((k) => (
                          <option key={k} value={k}>
                            {k.charAt(0).toUpperCase() + k.slice(1).replace("-", " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: "flex-start", gap: 8 }}
                        disabled={presSaving}
                        onClick={async () => {
                          await savePresField("slide-add", {
                            afterIndex: si,
                            kind: newSlideKind,
                            title: "New slide",
                          });
                          setActiveSlideIndex(activeSlideIndex + 1);
                        }}
                      >
                        <Plus style={{ width: 12, height: 12 }} aria-hidden /> Add {newSlideKind}{" "}
                        slide after this one
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: "flex-start", gap: 8 }}
                        disabled={presSaving}
                        onClick={async () => {
                          await savePresField("slide-duplicate", { slideIndex: si });
                          setActiveSlideIndex(activeSlideIndex + 1);
                        }}
                      >
                        ⧉ Duplicate this slide
                      </button>

                      <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          justifyContent: "flex-start",
                          gap: 8,
                          color: "#ef4444",
                          background: "rgba(239,68,68,.08)",
                          border: "1px solid rgba(239,68,68,.2)",
                        }}
                        disabled={presSaving}
                        onClick={async () => {
                          if (!window.confirm("Delete this slide?")) return;
                          await savePresField("slide-delete", { slideIndex: si });
                          setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
                        }}
                      >
                        <Trash2 style={{ width: 13, height: 13 }} aria-hidden /> Delete slide
                      </button>
                    </div>
                  );
                })()}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Bullets editor ────────────────────────────────────────────────────────

function BulletsEditor({
  slide,
  si,
  primary,
  savePresField,
  presSaving,
}: {
  slide: PresentationSlideT;
  si: number;
  primary: boolean;
  savePresField: (action: string, payload: Record<string, unknown>) => Promise<void>;
  presSaving: boolean;
}) {
  const bullets = slide.bullets ?? [];
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          Bullets {primary ? "" : "(optional)"}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11, padding: "2px 8px" }}
          disabled={presSaving}
          onClick={() => savePresField("bullet-add", { slideIndex: si, value: "New bullet" })}
        >
          + Add bullet
        </button>
      </div>
      {bullets.length === 0 && (
        <p style={{ fontSize: 11, color: "var(--text-4)", margin: "0 0 6px" }}>
          {primary
            ? "Add 3–7 bullet points to this slide. The AI Refine tab can also generate them from a description."
            : "No bullets. Add some to render a bullet list below the main slide body."}
        </p>
      )}
      {bullets.map((b, bi) => (
        <div
          key={bi}
          style={{
            background: "var(--surface,rgba(0,0,0,.04))",
            borderRadius: 8,
            padding: "8px 10px",
            marginBottom: 8,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <button
              type="button"
              style={{
                fontSize: 11,
                color: "var(--text-4)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => savePresField("bullet-delete", { slideIndex: si, bulletIndex: bi })}
            >
              Remove
            </button>
          </div>
          <textarea
            defaultValue={b}
            rows={2}
            style={{
              fontSize: 12,
              padding: "4px 6px",
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              resize: "vertical",
              fontFamily: "inherit",
              width: "100%",
            }}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== b)
                savePresField("bullet-update", { slideIndex: si, bulletIndex: bi, value: v });
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Image gallery editor ─────────────────────────────────────────────────

const MAX_IMAGES_PER_SLIDE = 5;

function ImageEditor({
  slide,
  si,
  savePresField,
  uploadSlideImage,
  uploading,
  fileInputRef,
}: {
  slide: PresentationSlideT;
  si: number;
  savePresField: (action: string, payload: Record<string, unknown>) => Promise<void>;
  uploadSlideImage: (slideIndex: number, file: File, position?: ImagePosition) => Promise<void>;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  // Effective gallery: prefer the array, otherwise fall back to the legacy single image.
  const gallery: { url: string; alt?: string }[] =
    slide.images && slide.images.length > 0
      ? slide.images
      : slide.image
        ? [{ url: slide.image.url, alt: slide.image.alt }]
        : [];
  const position = slide.imagesPosition ?? slide.image?.position ?? "right";
  const positions: ImagePosition[] = ["right", "left", "top", "background"];
  const canAddMore = gallery.length < MAX_IMAGES_PER_SLIDE;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--surface,rgba(0,0,0,.02))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ImageIcon style={{ width: 13, height: 13, color: "var(--text-3)" }} aria-hidden />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          Images {gallery.length > 0 && `(${gallery.length}/${MAX_IMAGES_PER_SLIDE})`}
        </span>
        {gallery.length > 0 && (
          <button
            type="button"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--text-4)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => savePresField("image-clear", { slideIndex: si })}
          >
            Remove all
          </button>
        )}
      </div>

      {gallery.length === 0 && (
        <p style={{ fontSize: 11, color: "var(--text-4)", margin: 0 }}>
          Add up to {MAX_IMAGES_PER_SLIDE} images. The renderer auto-arranges them into a showcase
          grid and the AI preserves them when refining text.
        </p>
      )}

      {gallery.map((img, ii) => (
        <div
          key={`${img.url}-${ii}`}
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr",
            gap: 8,
            padding: 6,
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg)",
          }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: 4,
              overflow: "hidden",
              aspectRatio: "1/1",
              background: "#0b1020",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? ""}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <input
              defaultValue={img.alt ?? ""}
              placeholder="Alt text"
              style={{
                fontSize: 12,
                padding: "4px 6px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                if (v !== (img.alt ?? ""))
                  savePresField("images-alt", { slideIndex: si, imageIndex: ii, alt: v });
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                disabled={ii === 0}
                onClick={() =>
                  savePresField("images-reorder", {
                    slideIndex: si,
                    fromIndex: ii,
                    direction: "up",
                  })
                }
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-2)",
                  borderRadius: 4,
                  cursor: ii === 0 ? "not-allowed" : "pointer",
                  opacity: ii === 0 ? 0.4 : 1,
                }}
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={ii === gallery.length - 1}
                onClick={() =>
                  savePresField("images-reorder", {
                    slideIndex: si,
                    fromIndex: ii,
                    direction: "down",
                  })
                }
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-2)",
                  borderRadius: 4,
                  cursor: ii === gallery.length - 1 ? "not-allowed" : "pointer",
                  opacity: ii === gallery.length - 1 ? 0.4 : 1,
                }}
                title="Move down"
              >
                ↓
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => savePresField("images-remove", { slideIndex: si, imageIndex: ii })}
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  border: "none",
                  background: "transparent",
                  color: "var(--text-4)",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      {gallery.length > 0 && (
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: ".05em",
            }}
          >
            Gallery position
          </span>
          <select
            value={position}
            onChange={(e) =>
              savePresField("images-position", { slideIndex: si, position: e.target.value })
            }
            style={{
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
            }}
          >
            {positions.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          await uploadSlideImage(si, file, position);
        }}
      />
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={uploading || !canAddMore}
        onClick={() => fileInputRef.current?.click()}
        style={{ alignSelf: "flex-start", gap: 6 }}
        title={canAddMore ? "" : `Maximum of ${MAX_IMAGES_PER_SLIDE} images per slide`}
      >
        {uploading ? (
          <>
            <Loader2 style={{ width: 13, height: 13 }} className="spin" aria-hidden /> Uploading…
          </>
        ) : (
          <>
            <Upload style={{ width: 13, height: 13 }} aria-hidden />{" "}
            {gallery.length === 0
              ? "Upload image"
              : `Add image (${gallery.length}/${MAX_IMAGES_PER_SLIDE})`}
          </>
        )}
      </button>
    </div>
  );
}
