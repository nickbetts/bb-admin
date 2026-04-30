"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Link2,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Share2,
  Globe,
  Upload,
  AlertTriangle,
  Info,
} from "lucide-react";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LinkSuggestion {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  context: string;
  rationale: string;
  priority: "high" | "medium" | "low";
}

interface PlanResult {
  summary: string;
  moneyPageLinks: LinkSuggestion[];
  outboundLinks: LinkSuggestion[];
  inboundLinks: LinkSuggestion[];
  warnings: string[];
}

interface PlanSummary {
  id: string;
  title: string;
  targetUrl: string | null;
  targetSource: string;
  domain: string;
  targetWordCount: number | null;
  generationStatus: string;
  generationMs: number | null;
  shareToken: string | null;
  portalPublishedAt: string | null;
  viewCount: number;
  createdAt: string;
  clientId: string | null;
}

interface FullPlan extends PlanSummary {
  moneyPageUrls: string[];
  inputJson: Record<string, unknown>;
  resultJson: PlanResult | null;
}

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-100 text-red-700 border border-red-200",
    medium: "bg-amber-100 text-amber-700 border border-amber-200",
    low: "bg-slate-100 text-slate-600 border border-slate-200",
  };
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${styles[priority] ?? styles.low}`}>
      {priority}
    </span>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-1 text-slate-400 hover:text-violet-600 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({
  label,
  count,
  accentClass,
  children,
  defaultOpen = true,
}: {
  label: string;
  count: number;
  accentClass: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${accentClass}`}>
            {count}
          </span>
          <span className="font-semibold text-slate-800">{label}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="divide-y divide-slate-100">{children}</div>}
    </div>
  );
}

// ─── Link suggestion row ──────────────────────────────────────────────────────

function SuggestionRow({ suggestion, type }: { suggestion: LinkSuggestion; type: "money" | "outbound" | "inbound" }) {
  const fromUrl = type === "inbound" ? suggestion.sourceUrl : suggestion.sourceUrl || "Target post";
  const toUrl = type === "inbound" ? suggestion.targetUrl : suggestion.targetUrl;

  return (
    <div className="px-5 py-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 font-mono">
              &ldquo;{suggestion.anchorText}&rdquo;
            </span>
            <CopyButton value={suggestion.anchorText} />
            <PriorityBadge priority={suggestion.priority} />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-1.5 flex-wrap">
        <span className="font-medium text-slate-600 shrink-0">
          {type === "inbound" ? "From:" : "→"}
        </span>
        <a href={type === "inbound" ? fromUrl : toUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-xs flex items-center gap-1">
          {type === "inbound" ? fromUrl : toUrl}
          <ExternalLink size={10} className="shrink-0" />
        </a>
        {type === "inbound" && (
          <>
            <span className="font-medium text-slate-600 shrink-0">→</span>
            <span className="text-slate-500 truncate max-w-xs">{suggestion.targetUrl}</span>
          </>
        )}
      </div>

      <p className="text-xs text-slate-600 mb-1">
        <span className="font-medium">Placement:</span> {suggestion.context}
      </p>
      <p className="text-xs text-slate-500">
        <span className="font-medium">Why:</span> {suggestion.rationale}
      </p>
    </div>
  );
}

// ─── Plan results panel ───────────────────────────────────────────────────────

function PlanResults({ plan }: { plan: FullPlan }) {
  const result = plan.resultJson;
  const [shareLoading, setShareLoading] = useState(false);
  const [shareToken, setShareToken] = useState(plan.shareToken ?? null);
  const [portalPublished, setPortalPublished] = useState(!!plan.portalPublishedAt);
  const [portalLoading, setPortalLoading] = useState(false);

  const copyShareLink = () => {
    if (shareToken) {
      const url = `${window.location.origin}/api/tools/internal-linking/share/${shareToken}`;
      navigator.clipboard.writeText(url);
    }
  };

  const toggleShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/tools/internal-linking/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareToken ? { revokeShareToken: true } : { generateShareToken: true }),
      });
      const data = await res.json() as { shareToken?: string | null };
      setShareToken(data.shareToken ?? null);
    } finally {
      setShareLoading(false);
    }
  };

  const togglePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`/api/tools/internal-linking/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalPublished: !portalPublished }),
      });
      const data = await res.json() as { portalPublishedAt?: string | null };
      setPortalPublished(!!data.portalPublishedAt);
    } finally {
      setPortalLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="text-sm text-slate-500 py-4 text-center">No results available.</div>
    );
  }

  const totalLinks =
    (result.moneyPageLinks?.length ?? 0) +
    (result.outboundLinks?.length ?? 0) +
    (result.inboundLinks?.length ?? 0);

  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={15} className="text-violet-600" />
          <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">Analysis Summary</span>
        </div>
        <p className="text-sm text-slate-700 mb-3">{result.summary}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="text-center">
            <div className="text-xl font-extrabold text-violet-700">{totalLinks}</div>
            <div className="text-xs text-slate-500">Total suggestions</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-extrabold text-red-600">{result.moneyPageLinks?.length ?? 0}</div>
            <div className="text-xs text-slate-500">Money page</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-extrabold text-blue-600">{result.outboundLinks?.length ?? 0}</div>
            <div className="text-xs text-slate-500">Outbound</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-extrabold text-green-600">{result.inboundLinks?.length ?? 0}</div>
            <div className="text-xs text-slate-500">Inbound</div>
          </div>
          {plan.targetWordCount && (
            <div className="text-center">
              <div className="text-xl font-extrabold text-slate-700">{plan.targetWordCount.toLocaleString("en-GB")}</div>
              <div className="text-xs text-slate-500">Word count</div>
            </div>
          )}
        </div>
      </div>

      {/* Warnings */}
      {result.warnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Notes</span>
          </div>
          <ul className="space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-800">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {(result.moneyPageLinks?.length ?? 0) > 0 && (
        <CollapsibleSection
          label="Money Page Links"
          count={result.moneyPageLinks.length}
          accentClass="bg-red-100 text-red-700"
        >
          {result.moneyPageLinks.map((s, i) => (
            <SuggestionRow key={i} suggestion={s} type="money" />
          ))}
        </CollapsibleSection>
      )}

      {(result.outboundLinks?.length ?? 0) > 0 && (
        <CollapsibleSection
          label="Outbound Links (Target → Blog Posts)"
          count={result.outboundLinks.length}
          accentClass="bg-blue-100 text-blue-700"
        >
          {result.outboundLinks.map((s, i) => (
            <SuggestionRow key={i} suggestion={s} type="outbound" />
          ))}
        </CollapsibleSection>
      )}

      {(result.inboundLinks?.length ?? 0) > 0 && (
        <CollapsibleSection
          label="Inbound Links (Blog Posts → Target)"
          count={result.inboundLinks.length}
          accentClass="bg-green-100 text-green-700"
        >
          {result.inboundLinks.map((s, i) => (
            <SuggestionRow key={i} suggestion={s} type="inbound" />
          ))}
        </CollapsibleSection>
      )}

      {/* Share / Portal */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={toggleShare}
          disabled={shareLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50 transition-colors disabled:opacity-50"
        >
          {shareLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
          {shareToken ? "Revoke share link" : "Create share link"}
        </button>
        {shareToken && (
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <Copy size={14} />
            Copy share link
          </button>
        )}
        <button
          onClick={togglePortal}
          disabled={portalLoading}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
            portalPublished
              ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100"
              : "border-slate-300 hover:border-green-400 hover:text-green-700 hover:bg-green-50"
          }`}
        >
          {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          {portalPublished ? "Published to portal" : "Publish to portal"}
        </button>
      </div>
    </div>
  );
}

// ─── Previous plans list ──────────────────────────────────────────────────────

function PreviousPlans({
  plans,
  onSelect,
  onDelete,
}: {
  plans: PlanSummary[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (plans.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">Previous Plans</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {plans.map(p => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
            <button
              onClick={() => onSelect(p.id)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="text-sm font-medium text-slate-800 truncate">{p.title}</div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span>{p.domain}</span>
                <span>·</span>
                <span>{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                {p.generationStatus === "generating" && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Loader2 size={11} className="animate-spin" /> Generating…
                  </span>
                )}
                {p.generationStatus === "failed" && (
                  <span className="text-red-500">Failed</span>
                )}
              </div>
            </button>
            <button
              onClick={() => onDelete(p.id)}
              className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InternalLinkingPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  // Form state
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [targetUrl, setTargetUrl] = useState("");
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [moneyPages, setMoneyPages] = useState<string[]>([""]);
  const [planTitle, setPlanTitle] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [activePlan, setActivePlan] = useState<FullPlan | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load previous plans
  const loadPlans = useCallback(async () => {
    const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    const res = await fetch(`/api/tools/internal-linking${qs}`);
    if (res.ok) {
      const data = await res.json() as { plans: PlanSummary[] };
      setPlans(data.plans);
    }
  }, [clientId]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  // Load a specific plan
  const loadPlan = async (id: string) => {
    const res = await fetch(`/api/tools/internal-linking/${id}`);
    if (res.ok) {
      const data = await res.json() as FullPlan;
      setActivePlan(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Delete a plan
  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/tools/internal-linking/${id}`, { method: "DELETE" });
    setPlans(prev => prev.filter(p => p.id !== id));
    if (activePlan?.id === id) setActivePlan(null);
  };

  // Money page list helpers
  const addMoneyPage = () => setMoneyPages(prev => [...prev, ""]);
  const removeMoneyPage = (i: number) => setMoneyPages(prev => prev.filter((_, j) => j !== i));
  const updateMoneyPage = (i: number, val: string) =>
    setMoneyPages(prev => prev.map((p, j) => (j === i ? val : p)));

  // Submit
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActivePlan(null);
    setGenerating(true);

    const validMoneyPages = moneyPages.filter(u => u.trim().length > 0);
    if (validMoneyPages.length === 0) {
      setError("Add at least one money page URL.");
      setGenerating(false);
      return;
    }

    try {
      let res: Response;

      if (mode === "upload" && docxFile) {
        const formData = new FormData();
        formData.append("file", docxFile);
        formData.append("moneyPageUrls", JSON.stringify(validMoneyPages));
        if (clientId) formData.append("clientId", clientId);
        if (planTitle) formData.append("title", planTitle);
        res = await fetch("/api/tools/internal-linking", { method: "POST", body: formData });
      } else {
        if (!targetUrl.trim()) {
          setError("Enter a target blog URL.");
          setGenerating(false);
          return;
        }
        res = await fetch("/api/tools/internal-linking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetUrl: targetUrl.trim(),
            moneyPageUrls: validMoneyPages,
            clientId: clientId || undefined,
            title: planTitle || undefined,
          }),
        });
      }

      const data = await res.json() as FullPlan & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
      } else {
        setActivePlan(data);
        await loadPlans();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        {clientId && <ClientBackLink />}

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-violet-100 text-violet-700 shrink-0">
            <Link2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Internal Linking Generator</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Analyse a blog post and get AI-powered suggestions for money-page, outbound, and inbound internal links.
            </p>
          </div>
        </div>

        {/* Client filter banner */}
        {clientId && <ClientFilterBanner />}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* ── Left column: form ── */}
          <div className="space-y-5">
            <form onSubmit={handleGenerate} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Link2 size={14} className="text-violet-600" />
                  New Analysis
                </h2>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Mode toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Target post
                  </label>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => setMode("url")}
                      className={`flex-1 py-2 font-medium transition-colors ${mode === "url" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      Live URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("upload")}
                      className={`flex-1 py-2 font-medium transition-colors ${mode === "upload" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      Upload Draft
                    </button>
                  </div>
                </div>

                {/* URL input or file upload */}
                {mode === "url" ? (
                  <div>
                    <input
                      type="url"
                      value={targetUrl}
                      onChange={e => setTargetUrl(e.target.value)}
                      placeholder="https://example.com/blog/my-post"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div>
                    <div
                      className="border-2 border-dashed border-slate-300 rounded-lg px-4 py-5 text-center cursor-pointer hover:border-violet-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx"
                        className="hidden"
                        onChange={e => setDocxFile(e.target.files?.[0] ?? null)}
                      />
                      {docxFile ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                          <Upload size={15} className="text-violet-600" />
                          <span className="font-medium">{docxFile.name}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">
                          <Upload size={18} className="mx-auto mb-1.5 text-slate-400" />
                          Click to upload a <span className="font-semibold">.docx</span> draft
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                      <Info size={11} className="shrink-0 mt-0.5 text-slate-400" />
                      <span>The domain for sitemap discovery will be taken from your first money page URL.</span>
                    </div>
                  </div>
                )}

                {/* Money pages */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Money page URLs
                  </label>
                  <div className="space-y-2">
                    {moneyPages.map((mp, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="url"
                          value={mp}
                          onChange={e => updateMoneyPage(i, e.target.value)}
                          placeholder={`https://example.com/service-${i + 1}`}
                          className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        />
                        {moneyPages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMoneyPage(i)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addMoneyPage}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    <Plus size={13} />
                    Add money page
                  </button>
                </div>

                {/* Optional title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Plan title <span className="font-normal normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={e => setPlanTitle(e.target.value)}
                    placeholder="E.g. Homepage blog linking audit"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Analysing… (may take up to 2 min)
                    </>
                  ) : (
                    <>
                      <Link2 size={15} />
                      Generate Link Plan
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Previous plans */}
            <PreviousPlans
              plans={plans}
              onSelect={loadPlan}
              onDelete={deletePlan}
            />
          </div>

          {/* ── Right column: results ── */}
          <div>
            {generating && !activePlan && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <Loader2 size={32} className="animate-spin text-violet-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Crawling sitemap &amp; analysing content…</p>
                <p className="text-xs text-slate-500 mt-1">Fetching blog posts, calling AI — this may take a minute or two.</p>
              </div>
            )}

            {!generating && !activePlan && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <Link2 size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Results will appear here once you generate a plan.</p>
              </div>
            )}

            {activePlan && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800">{activePlan.title}</h2>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      {activePlan.targetUrl && (
                        <a href={activePlan.targetUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-violet-600">
                          {activePlan.targetUrl}
                          <ExternalLink size={10} />
                        </a>
                      )}
                      {activePlan.targetSource === "upload" && <span>Draft upload</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePlan(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    Close
                  </button>
                </div>
                <div className="p-5">
                  <PlanResults plan={activePlan} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
