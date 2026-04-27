"use client";

import { useState, useEffect, use, useRef, useMemo } from "react";
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
} from "lucide-react";

// ─── Section configuration ─────────────────────────────────────────────────

const ALL_SECTIONS: { key: string; label: string; description: string; aiPowered: boolean }[] = [
  { key: "executiveSummary", label: "Executive Summary", description: "AI-generated overview of the strategy", aiPowered: true },
  { key: "strategyPlan", label: "Strategy Plan", description: "Phased rollout plan (Month 1 / 2-3 / 4+)", aiPowered: true },
  { key: "audiences", label: "Audiences", description: "Target audience profiles, pain points and channel mapping", aiPowered: true },
  { key: "googleAdsCampaigns", label: "Google Ads Campaigns", description: "Campaign structure from keyword research", aiPowered: false },
  { key: "googleAdsForecast", label: "Google Ads Forecast", description: "Estimated clicks, conversions, CPA from keyword data", aiPowered: false },
  { key: "metaCampaigns", label: "Meta Campaigns", description: "AI-generated Facebook/Instagram campaigns", aiPowered: true },
  { key: "linkedInAds", label: "LinkedIn Ads", description: "AI-generated LinkedIn campaign structures", aiPowered: true },
  { key: "keywordResearch", label: "Keyword Research", description: "Ad groups and keyword data", aiPowered: false },
  { key: "contentStrategy", label: "Content Strategy", description: "Page optimisations, landing pages, blog posts", aiPowered: false },
  { key: "contentCalendar", label: "Content Calendar", description: "12-month blog and social posting schedule", aiPowered: true },
  { key: "organicSocial", label: "Organic Social", description: "Social pillars, posting frequency, hashtags", aiPowered: true },
  { key: "emailMarketing", label: "Email Marketing", description: "Automated flows, campaigns, segmentation", aiPowered: true },
  { key: "exampleArticles", label: "Example Articles", description: "3 sample blog posts with SEO metadata", aiPowered: true },
  { key: "competitorIntel", label: "Competitor Intelligence", description: "AI-generated competitive analysis", aiPowered: true },
  { key: "quickWins", label: "Quick Wins", description: "High-impact, low-effort actions achievable in 30 days", aiPowered: true },
  { key: "kpis", label: "KPIs & Targets", description: "Success metrics and 90-day targets per channel", aiPowered: true },
  { key: "seoFoundations", label: "SEO Foundations", description: "Quick wins on existing pages, internal linking structure, and link-building plan", aiPowered: true },
  { key: "servicesInvestment", label: "Services & Investment", description: "Pricing and timeline from proposal", aiPowered: false },
];

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
  { key: "prepare-research", label: "Harvesting account data (GA4 / GSC / SEMrush)", estSeconds: 60 },
  { key: "prepare-customer-voice", label: "Researching customer voice (web search)", estSeconds: 60 },
  { key: "prepare-strategy-brain", label: "Synthesising strategy brain (positioning, audiences, messaging)", estSeconds: 45 },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface GrandPlanFull {
  id: string;
  title: string;
  status: string;
  purpose: string;
  generatedHtml: string | null;
  planDataJson: string | null;
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeSections, setIframeSections] = useState<IframeSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Share state
  const [sharingBusy, setSharingBusy] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiry, setShareExpiry] = useState("0");

  // Generation
  const [generating, setGenerating] = useState(false);
  const [stepStatus, setStepStatus] = useState<Record<string, "pending" | "running" | "done" | "skipped" | "failed">>({});
  const [currentStepLabel, setCurrentStepLabel] = useState<string>("");
  const [activeSectionStep, setActiveSectionStep] = useState<{ key: string; index: number; total: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UwU chaos mode (off by default; opt-in via overflow menu)
  const [funMode, setFunMode] = useState(false);
  const funMessage = useGrandPlanUwu(generating && funMode);

  // Section toggles
  const [enabledSections, setEnabledSections] = useState<Set<string>>(new Set(ALL_SECTIONS.map((s) => s.key)));
  const [showSectionConfig, setShowSectionConfig] = useState(false);
  const [savingSections, setSavingSections] = useState(false);

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
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
    let pollCount = 0;
    pollRef.current = setInterval(async () => {
      if (++pollCount > 200) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setGenerating(false);
        toast("Generation timed out. Please try again.", "error");
        return;
      }
      try {
        const res = await fetch(`/api/tools/grand-plan/${id}`);
        if (!res.ok) return;
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
        /* ignore */
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
        try { abortRef.current?.abort(); } catch { /* noop */ }
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
            `Step "${label}" timed out after ${Math.round(STEP_TIMEOUT_MS / 1000)}s. The server may have hit its function timeout — retrying will resume from where it stopped.`
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
    try { abortRef.current?.abort(); } catch { /* noop */ }
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

  async function handleRegenerateSection(sectionKey: string) {
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
        toast(`Regenerated: ${labelFor(sectionKey)}`, "success");
      } else {
        toast(`Failed to regenerate ${labelFor(sectionKey)}`, "error");
      }
    } finally {
      setRegeneratingSection(null);
    }
  }

  async function handleRegenerateFailed() {
    if (!plan) return;
    try {
      const data = JSON.parse(plan.planDataJson || "{}");
      const report = data.generationReport as Record<string, { status: string }> | undefined;
      if (!report) return;
      const failed = Object.entries(report)
        .filter(([, r]) => r.status === "failed")
        .map(([k]) => k);
      if (!failed.length) return;
      for (const key of failed) {
        setRegeneratingSection(key);
        await fetch(`/api/tools/grand-plan/${id}/regenerate-section`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionKey: key }),
        });
      }
      await loadPlan();
      toast(`Regenerated ${failed.length} failed section${failed.length === 1 ? "" : "s"}`, "success");
    } finally {
      setRegeneratingSection(null);
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

  async function handleShare() {
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
        toast("Failed to create share link", "error");
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
    if (!(window.confirm("Export plan recommendations as action items? This will create new tasks in the client's action plan."))) return;
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
      const res = await fetch(`/api/tools/grand-plan/${id}/import-context`, { method: "POST", body: form });
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
      description: "The current document will be archived as a new version, so you can always undo.",
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

  const isGenerating = (plan?.status === "generating") || generating;
  const isComplete = plan?.status === "complete" && !!plan?.generatedHtml;

  const failureSummary = useMemo(() => {
    if (!plan?.planDataJson) return { failures: [] as { key: string; error?: string }[], warnings: [] as string[] };
    try {
      const data = JSON.parse(plan.planDataJson || "{}");
      const warnings = (data.pipelineWarnings as string[] | undefined) ?? [];
      const report = (data.generationReport as Record<string, { status: string; error?: string }> | undefined) ?? {};
      const failures = Object.entries(report)
        .filter(([, r]) => r.status === "failed")
        .map(([key, r]) => ({ key, error: r.error }));
      return { failures, warnings };
    } catch {
      return { failures: [], warnings: [] };
    }
  }, [plan?.planDataJson]);

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
      <header
        className="flex items-start justify-between"
        style={{ gap: 16, marginBottom: 18 }}
      >
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
            <div
              className="flex items-center flex-wrap"
              style={{ gap: 8, marginTop: 6 }}
            >
              {plan.client && (
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {plan.client.name}
                </span>
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
                        {s.aiPowered && plan?.status === "complete" && checked && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{
                              marginLeft: "auto",
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
                              <Loader2
                                style={{ width: 11, height: 11 }}
                                className="animate-spin"
                              />
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
        <div className="flex items-center flex-wrap" style={{ gap: 6 }}>
          {/* Primary group */}
          {!isGenerating && (
            <button
              className="btn btn-primary btn-sm"
              style={{ gap: 6 }}
              onClick={handleGenerate}
            >
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
          {isComplete && plan.clientId && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleExportActions}
              disabled={exportingActions}
              title="Export recommendations as action items"
            >
              {exportingActions ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden /> : <Download style={{ width: 14, height: 14 }} aria-hidden />}
              {" "}Actions
            </button>
          )}
          {/* Import context: hidden file input triggered by button */}
          <label
            className="btn btn-ghost btn-sm"
            style={{ cursor: importingContext ? "wait" : "pointer" }}
            title="Import a document to append to the client brief"
          >
            {importingContext
              ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" aria-hidden />
              : <Upload style={{ width: 14, height: 14 }} aria-hidden />}
            {" "}Import
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.docx,.txt"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { e.target.value = ""; handleImportContext(f); } }}
              disabled={importingContext}
            />
          </label>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClone}
            title="Clone plan"
          >
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
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10, marginBottom: 0, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13 }}>⚠️</span>
              <span>Keep this tab open — closing or navigating away will pause generation. Completed steps are saved and will not re-run.</span>
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
            Tip: be specific about which section and the change you want. Each refinement creates a new version you can roll back to.
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
              {failureSummary.failures.length} section{failureSummary.failures.length === 1 ? "" : "s"} failed
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginLeft: "auto", gap: 5, fontSize: 11 }}
              onClick={handleRegenerateFailed}
              disabled={regeneratingSection !== null}
            >
              {regeneratingSection ? (
                <Loader2 style={{ width: 11, height: 11 }} className="animate-spin" />
              ) : (
                <RefreshCw style={{ width: 11, height: 11 }} aria-hidden />
              )}
              Regenerate failed sections
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
      {isComplete && failureSummary.warnings.length > 0 && (
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
          {failureSummary.warnings.map((w, i) => (
            <p key={`w-${i}`} style={{ fontSize: 12, color: "var(--warning)", marginBottom: 2 }}>
              • {w}
            </p>
          ))}
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
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
            {!iframeLoaded && <DocumentSkeleton />}
            <iframe
              ref={iframeRef}
              src={blobUrl}
              style={{
                width: "100%",
                height: "80vh",
                border: "none",
                display: "block",
              }}
              title={plan.title}
              sandbox="allow-scripts"
              onLoad={() => {
                // Fallback in case the in-document script didn't postMessage
                try {
                  const body = iframeRef.current?.contentDocument?.body;
                  if (body && iframeRef.current) {
                    iframeRef.current.style.height = Math.max(body.scrollHeight, 600) + "px";
                  }
                } catch {
                  /* cross-origin */
                }
                // If postMessage hasn't fired, treat as loaded after 500ms
                setTimeout(() => setIframeLoaded(true), 500);
              }}
            />
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
            Click <strong>Generate plan</strong> above to create the full document from your linked sources.
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
              <li key={v.id} style={{ borderBottom: idx < plan.versions.length - 1 ? "1px solid var(--border)" : "none" }}>
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
      <GrandPlanChaosOverlay active={funMode && generating} />

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
  const allRows: { key: string; statusKey: string; label: string; group: "prep" | "section" | "assemble" }[] = [];
  for (const s of steps) allRows.push({ key: s.key, statusKey: s.key, label: s.label, group: "prep" });
  for (const k of sectionKeys) allRows.push({ key: k, statusKey: `section:${k}`, label: labelFor(k), group: "section" });
  allRows.push({ key: "assemble", statusKey: "assemble", label: "Assembling final document", group: "assemble" });

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
      <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 4, width: "40%", opacity: 0.7 }} />
      <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 4, width: "85%", opacity: 0.5, marginTop: 12 }} />
      <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 4, width: "75%", opacity: 0.5 }} />
      <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 4, width: "80%", opacity: 0.5 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 24,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: 80, background: "var(--bg-2)", borderRadius: 10, opacity: 0.55 }} />
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
  return found?.label ?? key;
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
    osc.type = (["square", "sawtooth", "triangle"] as OscillatorType[])[Math.floor(Math.random() * 3)];
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close();
  } catch { /* AudioContext blocked — silent fail */ }
}

function GrandPlanChaosOverlay({ active }: { active: boolean }) {
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
      timeoutId = setTimeout(() => {
        playChaosBleep();
        scheduleNext();
      }, 600 + Math.random() * 1200);
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
      "✨","💖","🌸","⭐","🎀","💫","🦄","🌈","😻","💕","🎪","🚀",
      "📊","📈","🎯","💅","✌️","🔥","👑","🎉","💣","🤯","🫠","😱",
      "UwU","OwO",">.<",":3","rawr","xD","nyan~","BAKA","W","T","F",
      "brrrr","404","ERROR","NaN","null","undefined","😈","🧨","💥",
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
        }))
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
            filter: p.size > 32
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
