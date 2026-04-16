"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  { key: "googleAdsCampaigns", label: "Google Ads Campaigns", description: "Campaign structure from keyword research", aiPowered: false },
  { key: "metaCampaigns", label: "Meta Campaigns", description: "AI-generated Facebook/Instagram campaigns", aiPowered: true },
  { key: "keywordResearch", label: "Keyword Research", description: "Ad groups and keyword data", aiPowered: false },
  { key: "contentStrategy", label: "Content Strategy", description: "Page optimisations, landing pages, blog posts", aiPowered: false },
  { key: "contentCalendar", label: "Content Calendar", description: "6-month blog and social posting schedule", aiPowered: true },
  { key: "organicSocial", label: "Organic Social", description: "Social pillars, posting frequency, hashtags", aiPowered: true },
  { key: "exampleArticles", label: "Example Articles", description: "3 sample blog posts written in full", aiPowered: true },
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
  viewCount: number;
  lastViewedAt: string | null;
  generationMs: number | null;
  statusMessage: string | null;
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

  // Generation
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Section toggles
  const [enabledSections, setEnabledSections] = useState<Set<string>>(new Set(ALL_SECTIONS.map(s => s.key)));
  const [showSectionConfig, setShowSectionConfig] = useState(false);
  const [savingSections, setSavingSections] = useState(false);

  // Refinement
  const [refinePrompt, setRefinePrompt] = useState("");
  const [refining, setRefining] = useState(false);

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
    pollRef.current = setInterval(async () => {
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
    setGenerating(true);
    try {
      await fetch(`/api/tools/grand-plan/${id}/generate`, { method: "POST" });
      setPlan((prev) => (prev ? { ...prev, status: "generating" } : prev));
      startPolling();
    } catch {
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
        body: JSON.stringify({ id, action: "share", password: sharePassword || undefined }),
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
    if (!confirm("Are you sure you want to delete this grand plan?")) return;
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
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{s.label}</span>
                        {s.aiPowered && (
                          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--info-bg)", color: "var(--info)", fontWeight: 600 }}>AI</span>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--warning)" }}>
              <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              {plan.statusMessage || "Generating... this may take a couple of minutes"}
            </span>
          )}

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
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", gap: 4 }} onClick={handleUnshare} disabled={sharingBusy}>
                <X style={{ width: 12, height: 12 }} /> Unshare
              </button>
            </div>
          )}

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
        <div className="card" style={{ padding: 80, textAlign: "center" }}>
          <Map style={{ width: 48, height: 48, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>Ready to generate</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6, maxWidth: 400, margin: "6px auto 0" }}>
            Click &ldquo;Generate Plan&rdquo; above to create the full document from your linked sources.
          </p>
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
