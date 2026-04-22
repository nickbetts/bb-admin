"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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
} from "lucide-react";

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
  { key: "contentCalendar", label: "Content Calendar", description: "6-month blog and social posting schedule", aiPowered: true },
  { key: "organicSocial", label: "Organic Social", description: "Social pillars, posting frequency, hashtags", aiPowered: true },
  { key: "emailMarketing", label: "Email Marketing", description: "Automated flows, campaigns, segmentation", aiPowered: true },
  { key: "exampleArticles", label: "Example Articles", description: "3 sample blog posts with SEO metadata", aiPowered: true },
  { key: "competitorIntel", label: "Competitor Intelligence", description: "AI-generated competitive analysis", aiPowered: true },
  { key: "servicesInvestment", label: "Services & Investment", description: "Pricing and timeline from proposal", aiPowered: false },
  { key: "mediaPlan", label: "Media Plan", description: "Budget allocation across channels", aiPowered: false },
];

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
  mediaPlan: { id: string; title: string } | null;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function GrandPlanViewPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const confirm = useConfirm();
  const [plan, setPlan] = useState<GrandPlanFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Share state
  const [sharingBusy, setSharingBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareExpiry, setShareExpiry] = useState("0"); // days: 0 = never

  // Generation
  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UwU chaos mode
  const [funMode, setFunMode] = useState(false);
  const funMessage = useGrandPlanUwu(generating && funMode);
  const toggleFunMode = () => setFunMode((p) => !p);

  // Section toggles
  const [enabledSections, setEnabledSections] = useState<Set<string>>(new Set(ALL_SECTIONS.map(s => s.key)));
  const [showSectionConfig, setShowSectionConfig] = useState(false);
  const [savingSections, setSavingSections] = useState(false);

  // Refinement
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);

  // Per-section regeneration
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

      // Load section config
      try {
        const config = JSON.parse(gp.configJson || "{}");
        if (config.sections?.length) {
          setEnabledSections(new Set(config.sections));
        }
      } catch { /* ignore */ }

      // If generating, start polling
      if (gp.status === "generating") {
        startPolling();
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  function updateBlobUrl(html: string | null) {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
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
      // Safety cap: stop polling after 10 minutes (200 × 3s) to prevent infinite loops
      if (++pollCount > 200) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setGenerating(false);
        setGenerationMessage("Generation timed out. Please try again.");
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

  async function handleGenerate() {
    if (!plan) return;
    setGenerating(true);
    setPlan((prev) => (prev ? { ...prev, status: "generating" } : prev));

    const sectionLabels: Record<string, string> = {};
    for (const s of ALL_SECTIONS) sectionLabels[s.key] = s.label;

    try {
      // Helper to call a step and handle errors
      async function runStep(step: string, label: string): Promise<boolean> {
        setGenerationMessage(label);
        const res = await fetch(`/api/tools/grand-plan/${id}/generate-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `Step "${step}" failed`);
        }
        const data = await res.json();
        return !data.skipped;
      }

      // 1. Start — initialise plan data
      await runStep("start", "Initialising...");

      // 2. Prepare pipeline (each is its own 300s call)
      await runStep("prepare-keywords", "Researching keywords...");
      await runStep("prepare-content-data", "Collecting SEMrush data...");
      await runStep("prepare-content", "Generating content strategy (Claude Opus)...");
      await runStep("prepare-content-audit", "Auditing on-page SEO...");
      await runStep("prepare-lp-brand", "Extracting brand context...");
      await runStep("prepare-lp-draft", "Generating landing page draft...");
      await runStep("prepare-lp-critique", "Critiquing landing page...");
      await runStep("prepare-lp-refine-1", "Refining landing page (pass 1/2)...");
      await runStep("prepare-lp-refine-2", "Refining landing page (pass 2/2)...");

      // 3. Generate each enabled section sequentially
      const enabled = Array.from(enabledSections);
      for (let i = 0; i < enabled.length; i++) {
        const key = enabled[i];
        const label = sectionLabels[key] || key;
        await runStep(key, `Generating ${label} (${i + 1}/${enabled.length})...`);
      }

      // 4. Assemble — render HTML, create version
      await runStep("assemble", "Assembling final document...");

      // Done — reload plan to get the HTML
      setGenerationMessage("Complete!");
      await loadPlan();
    } catch (error) {
      // Stop polling immediately — the plan may still be in "generating" on the server
      // (e.g. a 400 early-return that didn't update status). Without this, loadPlan()
      // below would see status=generating and restart the poll indefinitely.
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      const message = error instanceof Error ? error.message : "Generation failed";
      setGenerationMessage(`Error: ${message}`);
      // Reload plan to get the accurate server status
      await loadPlan();
    } finally {
      setGenerating(false);
    }
  }

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
      }
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
    } finally {
      setSavingSections(false);
    }
  }

  async function handleSaveTitle() {
    if (!titleInput.trim() || !plan) return;
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      if (res.ok) {
        setPlan((prev) => (prev ? { ...prev, title: titleInput.trim() } : prev));
      }
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  async function handleShare() {
    setSharingBusy(true);
    try {
      const res = await fetch("/api/tools/grand-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "share", password: sharePassword || undefined, expiresInDays: parseInt(shareExpiry) || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan((prev) => (prev ? { ...prev, shareToken: data.shareToken } : prev));
        setShowShareForm(false);
        setSharePassword("");
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
    } finally {
      setSharingBusy(false);
    }
  }

  async function handleCopyShareLink() {
    if (!plan?.shareToken) return;
    const url = `${window.location.origin}/share/grand-plan/${plan.shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!(await confirm({ title: "Delete this grand plan?", description: "This cannot be undone.", confirmLabel: "Delete", danger: true }))) return;
    setDeleting(true);
    await fetch(`/api/tools/grand-plan/${id}`, { method: "DELETE" });
    router.push("/tools/grand-plan");
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
        router.push(`/tools/grand-plan/${data.grandPlan.id}`);
      }
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: 1200 }}>
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-3)" }}>
          <Loader2 style={{ width: 24, height: 24, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          Loading plan...
        </div>
      </div>
    );
  }

  if (notFound || !plan) {
    return (
      <div className="page" style={{ maxWidth: 1200 }}>
        <div style={{ textAlign: "center", padding: 80 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>Plan not found</p>
          <Link href="/tools/grand-plan" className="btn btn-ghost" style={{ marginTop: 16 }}>
            <ArrowLeft style={{ width: 14, height: 14 }} /> Back to Grand Plans
          </Link>
        </div>
      </div>
    );
  }

  const isGenerating = plan.status === "generating" || generating;
  const isComplete = plan.status === "complete" && plan.generatedHtml;

  return (
    <div className="page" style={{ maxWidth: 1200 }}>
      {/* Back link */}
      <Link href="/tools/grand-plan" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-3)", marginBottom: 20, textDecoration: "none" }}>
        <ArrowLeft style={{ width: 14, height: 14 }} /> Grand Plans
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Map style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div style={{ flex: 1 }}>
            {editingTitle ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                  autoFocus
                  style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", flex: 1 }}
                />
                <button className="btn btn-ghost btn-sm" onClick={handleSaveTitle} disabled={savingTitle}>
                  <Check style={{ width: 14, height: 14 }} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingTitle(false); setTitleInput(plan.title); }}>
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{plan.title}</h1>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingTitle(true)} style={{ padding: 4 }}>
                  <Pencil style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
              {plan.client && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{plan.client.name}</span>}
              <StatusBadge status={plan.status} />
              <PurposeBadge purpose={plan.purpose} />
              {plan.generationMs != null && (
                <span style={{ fontSize: 11, color: "var(--text-4)" }}>
                  Generated in {Math.round(plan.generationMs / 1000)}s
                </span>
              )}
              {plan.viewCount > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-3)" }}>
                  <BarChart3 style={{ width: 10, height: 10 }} /> {plan.viewCount} view{plan.viewCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Linked sources */}
      {(plan.proposal || plan.keywordResearch || plan.contentStrategy || plan.mediaPlan) && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Linked Sources</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {plan.proposal && (
              <span style={{ fontSize: 12, padding: "3px 10px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: 6 }}>
                Proposal: {plan.proposal.title}
              </span>
            )}
            {plan.keywordResearch && (
              <span style={{ fontSize: 12, padding: "3px 10px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: 6 }}>
                Keywords: {plan.keywordResearch.title}
              </span>
            )}
            {plan.contentStrategy && (
              <span style={{ fontSize: 12, padding: "3px 10px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: 6 }}>
                Content: {plan.contentStrategy.title}
              </span>
            )}
            {plan.mediaPlan && (
              <span style={{ fontSize: 12, padding: "3px 10px", background: "var(--accent-bg)", color: "var(--accent)", borderRadius: 6 }}>
                Media: {plan.mediaPlan.title}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Section configuration */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <button
          onClick={() => setShowSectionConfig(!showSectionConfig)}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <Settings style={{ width: 13, height: 13, color: "var(--text-3)" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Sections ({enabledSections.size} of {ALL_SECTIONS.length} enabled)
          </span>
          <ChevronDown style={{ width: 12, height: 12, color: "var(--text-4)", marginLeft: "auto", transform: showSectionConfig ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
        {showSectionConfig && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6 }}>
              {ALL_SECTIONS.map((s) => {
                const checked = enabledSections.has(s.key);
                return (
                  <label
                    key={s.key}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
                      borderRadius: 8, cursor: "pointer", transition: "background 0.1s",
                      background: checked ? "var(--accent-bg)" : "var(--bg-2)",
                      border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                      opacity: checked ? 1 : 0.65,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(s.key)}
                      style={{ marginTop: 2, accentColor: "var(--accent)" }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{s.label}</span>
                        {s.aiPowered && (
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--info-bg)", color: "var(--info)", fontWeight: 600 }}>AI</span>
                        )}
                        {s.aiPowered && plan?.status === "complete" && checked && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginLeft: "auto", fontSize: 10, padding: "2px 6px", gap: 3, opacity: regeneratingSection === s.key ? 1 : 0.6 }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRegenerateSection(s.key); }}
                            disabled={regeneratingSection !== null}
                            title={`Regenerate ${s.label}`}
                          >
                            {regeneratingSection === s.key
                              ? <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                              : <RefreshCw style={{ width: 10, height: 10 }} />}
                            Regen
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{s.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setEnabledSections(new Set(ALL_SECTIONS.map(s => s.key)))}
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
                {savingSections ? <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} /> : <Check style={{ width: 11, height: 11 }} />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions toolbar */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Generate / Regenerate */}
          {!isGenerating && (
            <button className="btn btn-primary btn-sm" style={{ gap: 6 }} onClick={handleGenerate}>
              <RefreshCw style={{ width: 13, height: 13 }} />
              {isComplete ? "Regenerate" : "Generate Plan"}
            </button>
          )}
          {isGenerating && (
            <>
              <GrandPlanChaosOverlay active={funMode && generating} />
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13,
                color: funMode ? "#9333ea" : "var(--warning)",
                fontWeight: funMode ? 600 : 400,
                animation: funMode ? "gpUwuWiggle 0.6s ease-in-out infinite" : "none",
              }}>
                <style>{`
                  @keyframes gpUwuWiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
                  @keyframes gpUwuPulse { 0%, 100% { text-shadow: 0 0 0 transparent; } 50% { text-shadow: 0 0 12px rgba(147,51,234,0.5); } }
                  @keyframes gpUwuBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
                `}</style>
                <Loader2 style={{
                  width: 14, height: 14,
                  animation: funMode ? "spin 0.4s linear infinite" : "spin 1s linear infinite",
                }} />
                <span style={{ animation: funMode ? "gpUwuPulse 1.5s ease-in-out infinite" : "none" }}>
                  {funMode ? funMessage : (generationMessage || plan.statusMessage || "Generating...")}
                </span>
              </span>
            </>
          )}

          {/* UwU mode toggle */}
          <button
            type="button"
            onClick={toggleFunMode}
            title={funMode ? "Disable uwu chaos mode" : "Enable uwu chaos mode"}
            style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 99,
              border: `1px solid ${funMode ? "#f9a8d4" : "var(--border)"}`,
              background: funMode ? "linear-gradient(135deg, #fdf2f8, #fae8ff)" : "var(--surface)",
              color: funMode ? "#db2777" : "var(--text-3)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.15s",
              animation: funMode ? "gpUwuBounce 1s ease-in-out infinite" : "none",
            }}
          >
            {funMode ? "😻 GWAND PWAN MODE ON" : "😐 uwu mode"}
          </button>

          <div style={{ flex: 1 }} />

          {/* Download */}
          {isComplete && (
            <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} onClick={handleDownload}>
              <Download style={{ width: 13, height: 13 }} /> Download
            </button>
          )}

          {/* Share */}
          {isComplete && !plan.shareToken && (
            <>
              {showShareForm ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="text"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Password (optional)"
                    style={{ padding: "5px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, width: 150 }}
                  />
                  <select
                    value={shareExpiry}
                    onChange={(e) => setShareExpiry(e.target.value)}
                    style={{ padding: "5px 8px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--white)" }}
                  >
                    <option value="0">No expiry</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={handleShare} disabled={sharingBusy}>
                    {sharingBusy ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Share2 style={{ width: 12, height: 12 }} />}
                    Share
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowShareForm(false)}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} onClick={() => setShowShareForm(true)}>
                  <Share2 style={{ width: 13, height: 13 }} /> Share
                </button>
              )}
            </>
          )}

          {plan.shareToken && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="btn btn-ghost btn-sm" style={{ gap: 4, color: "var(--success)" }} onClick={handleCopyShareLink}>
                {copied ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <Link href={`/share/grand-plan/${plan.shareToken}`} target="_blank" className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                <Eye style={{ width: 12, height: 12 }} /> Preview
              </Link>
              {plan.shareExpiresAt && (
                <span style={{ fontSize: 11, color: new Date(plan.shareExpiresAt) < new Date() ? "var(--danger)" : "var(--text-3)" }}>
                  {new Date(plan.shareExpiresAt) < new Date() ? "Expired" : `Expires ${new Date(plan.shareExpiresAt).toLocaleDateString("en-GB")}`}
                </span>
              )}
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", gap: 4 }} onClick={handleUnshare} disabled={sharingBusy}>
                <X style={{ width: 12, height: 12 }} /> Unshare
              </button>
            </div>
          )}

          {/* Publish to client portal */}
          {isComplete && plan.shareToken && (
            <PortalPublishToggle
              resourceType="grand_plan"
              resourceId={plan.id}
              initialPublishedAt={plan.portalPublishedAt}
              onChange={(at) => setPlan((prev) => (prev ? { ...prev, portalPublishedAt: at } : prev))}
            />
          )}

          {/* Clone */}
          <button className="btn btn-ghost btn-sm" style={{ gap: 5 }} onClick={handleClone}>
            <Copy style={{ width: 13, height: 13 }} /> Clone
          </button>

          {/* Delete */}
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={handleDelete} disabled={deleting}>
            <Trash2 style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* Refine panel */}
      {isComplete && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Refine with AI</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleRefine()}
              placeholder="e.g. Make the executive summary more detailed, add more keywords to the dental ad group..."
              style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
              disabled={refining}
            />
            <button className="btn btn-primary btn-sm" onClick={handleRefine} disabled={refining || !refinePrompt.trim()} style={{ gap: 5 }}>
              {refining ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 13, height: 13 }} />}
              Refine
            </button>
          </div>
        </div>
      )}

      {/* Version history */}
      {plan.versions.length > 0 && (
        <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Versions</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {plan.versions.map((v) => (
              <span key={v.id} style={{ fontSize: 12, padding: "4px 10px", background: "var(--bg-2)", borderRadius: 6, color: "var(--text-3)" }}>
                v{v.versionNumber}
                {v.prompt && ` — ${v.prompt.slice(0, 40)}${v.prompt.length > 40 ? "..." : ""}`}
                <span style={{ fontSize: 10, color: "var(--text-4)", marginLeft: 6 }}>
                  {new Date(v.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline warnings */}
      {isComplete && (() => {
        try {
          const data = JSON.parse(plan.planDataJson || "{}");
          const warnings = data.pipelineWarnings as string[] | undefined;
          const report = data.generationReport as Record<string, { status: string; error?: string }> | undefined;
          const failures = report ? Object.entries(report).filter(([, r]) => r.status === "failed") : [];

          if (!warnings?.length && failures.length === 0) return null;

          return (
            <div className="card" style={{ padding: "12px 16px", marginBottom: 16, background: "var(--warning-bg)", border: "1px solid var(--warning)", borderRadius: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {failures.length > 0 ? `Generation issues (${failures.length} section${failures.length === 1 ? "" : "s"} failed)` : "Warnings"}
              </p>
              {warnings?.map((w, i) => (
                <p key={`w-${i}`} style={{ fontSize: 12, color: "var(--warning)", marginBottom: 2 }}>• {w}</p>
              ))}
              {failures.map(([key, r]) => (
                <p key={`f-${key}`} style={{ fontSize: 12, color: "var(--warning)", marginBottom: 2 }}>
                  • <strong>{key}</strong> failed{r.error ? `: ${r.error}` : ""} — try regenerating this section.
                </p>
              ))}
            </div>
          );
        } catch { /* ignore */ }
        return null;
      })()}

      {/* Preview iframe */}
      {isComplete && blobUrl ? (
        <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: 12 }}>
          <iframe
            src={blobUrl}
            style={{ width: "100%", height: "80vh", border: "none" }}
            title={plan.title}
            sandbox="allow-scripts"
            onLoad={(e) => {
              const iframe = e.target as HTMLIFrameElement;
              try {
                const body = iframe.contentDocument?.body;
                if (body) {
                  iframe.style.height = Math.max(body.scrollHeight, 600) + "px";
                }
              } catch {
                /* cross-origin */
              }
            }}
          />
        </div>
      ) : !isGenerating ? (
        <div>
          {plan.status === "failed" && (
            <div className="card" style={{ padding: "14px 16px", marginBottom: 16, background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)", marginBottom: 4 }}>Generation failed</p>
              {plan.generationError && (
                <p style={{ fontSize: 12, color: "var(--danger)", opacity: 0.85 }}>{plan.generationError}</p>
              )}
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10, gap: 6 }} onClick={handleGenerate}>
                <RefreshCw style={{ width: 13, height: 13 }} /> Retry
              </button>
            </div>
          )}
          {plan.status !== "failed" && (
            <div className="card" style={{ padding: 80, textAlign: "center" }}>
              <Map style={{ width: 48, height: 48, color: "var(--text-4)", margin: "0 auto 16px" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>Ready to generate</p>
              <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6, maxWidth: 400, margin: "6px auto 0" }}>
                Click &ldquo;Generate Plan&rdquo; above to create the full document from your linked sources.
              </p>
            </div>
          )}
        </div>
      ) : null}
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
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function PurposeBadge({ purpose }: { purpose: string }) {
  const label = purpose === "pitch" ? "Pitch" : purpose === "onboarding" ? "Onboarding" : "Strategy";
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "var(--accent-bg)", color: "var(--accent)" }}>
      {label}
    </span>
  );
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
    return () => { clearTimeout(first); clearInterval(id); };
  }, [active]);

  return msg;
}

function GrandPlanChaosOverlay({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number; y: number; size: number; opacity: number; rotation: number; scale: number; delay: number }[]>([]);

  useEffect(() => {
    if (!active) { queueMicrotask(() => setParticles([])); return; }
    const EMOJIS = ["✨", "💖", "🌸", "⭐", "🎀", "💫", "🦄", "🌈", "😻", "💕", "🎪", "🚀", "📊", "📈", "🎯", "💅", "✌️", "🔥", "👑", "🎉", "UwU", "OwO", ">.<", ":3", "rawr", "xD", "nyan~", "BAKA"];
    const initial = Array.from({ length: 35 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 28,
      opacity: 0.15 + Math.random() * 0.25,
      rotation: Math.random() * 360,
      scale: 0.6 + Math.random() * 0.8,
      delay: Math.random() * 2,
    }));
    queueMicrotask(() => setParticles(initial));
    const id = setInterval(() => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: (p.x + (Math.random() - 0.5) * 3 + 100) % 100,
          y: (p.y - 0.3 - Math.random() * 0.5 + 100) % 100,
          rotation: p.rotation + (Math.random() - 0.5) * 15,
          opacity: 0.1 + Math.random() * 0.3,
        }))
      );
    }, 400);
    return () => clearInterval(id);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes gpChaosFloat { 0% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(180deg); } 100% { transform: translateY(0) rotate(360deg); } }
      `}</style>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
        {particles.map((p) => (
          <span key={p.id} style={{
            position: "absolute",
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            fontSize: p.size,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            userSelect: "none",
            lineHeight: 1,
            willChange: "transform, opacity",
            filter: p.size > 30 ? "drop-shadow(0 0 10px rgba(249,168,212,0.9))" : "none",
            animation: "gpChaosFloat 3s ease-in-out infinite",
            animationDelay: `${p.delay}s`,
          }}>{p.emoji}</span>
        ))}
      </div>
    </>
  );
}
