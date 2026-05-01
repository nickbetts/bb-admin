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
  Download,
  ClipboardList,
  Search,
  Layers,
  Zap,
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
  confidence?: number; // 0–100
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

// ─── Confidence indicator ─────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const colour = clamped >= 75 ? "bg-green-500" : clamped >= 50 ? "bg-amber-400" : "bg-slate-300";
  return (
    <span className="flex items-center gap-1.5" title={`Confidence: ${clamped}%`}>
      <span className="text-[10px] text-slate-400 tabular-nums">{clamped}%</span>
      <span className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <span className={`block h-full rounded-full ${colour}`} style={{ width: `${clamped}%` }} />
      </span>
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
  onCopyAll,
}: {
  label: string;
  count: number;
  accentClass: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onCopyAll?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center justify-between px-5 py-3.5"
        >
          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${accentClass}`}>
              {count}
            </span>
            <span className="font-semibold text-slate-800">{label}</span>
          </div>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {onCopyAll && (
          <button
            onClick={e => { e.stopPropagation(); onCopyAll(); }}
            className="px-3 py-3.5 text-slate-400 hover:text-violet-600 transition-colors shrink-0 border-l border-slate-200"
            title="Copy all suggestions as text"
          >
            <ClipboardList size={14} />
          </button>
        )}
      </div>
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
            {suggestion.confidence !== undefined && <ConfidenceBar score={suggestion.confidence} />}
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

  const exportCsv = () => {
    if (!result) return;
    const rows: string[][] = [
      ["Type", "Source URL", "Target URL", "Anchor Text", "Placement", "Rationale", "Priority", "Confidence"],
    ];
    const addRows = (suggestions: LinkSuggestion[], type: string) => {
      for (const s of suggestions) {
        rows.push([
          type,
          s.sourceUrl,
          s.targetUrl,
          s.anchorText,
          s.context,
          s.rationale,
          s.priority,
          s.confidence !== undefined ? String(s.confidence) : "",
        ]);
      }
    };
    addRows(result.moneyPageLinks ?? [], "Money Page");
    addRows(result.outboundLinks ?? [], "Outbound");
    addRows(result.inboundLinks ?? [], "Inbound");
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `internal-links-${plan.domain}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAllSuggestions = (suggestions: LinkSuggestion[]) => {
    const text = suggestions
      .map(s => `Anchor: "${s.anchorText}"\nTarget: ${s.targetUrl}\nPlacement: ${s.context}\nRationale: ${s.rationale}\nPriority: ${s.priority}${s.confidence !== undefined ? ` | Confidence: ${s.confidence}%` : ""}`)
      .join("\n\n---\n\n");
    void navigator.clipboard.writeText(text);
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
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Link2 size={15} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">Analysis Summary</span>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
            title="Export all suggestions as CSV"
          >
            <Download size={13} />
            Export CSV
          </button>
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
          onCopyAll={() => copyAllSuggestions(result.moneyPageLinks)}
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
          onCopyAll={() => copyAllSuggestions(result.outboundLinks)}
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
          onCopyAll={() => copyAllSuggestions(result.inboundLinks)}
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

// ─── Orphan detection panel ───────────────────────────────────────────────────

interface OrphanResult {
  orphans: string[];
  crawled: number;
  total: number;
  referenced: number;
  message?: string;
}

function OrphanDetectionPanel({ defaultDomain }: { defaultDomain?: string }) {
  const [domain, setDomain] = useState(defaultDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrphanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDetection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/tools/internal-linking/orphans?domain=${encodeURIComponent(domain.trim())}`);
      const data = await res.json() as OrphanResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Detection failed."); }
      else { setResult(data); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={runDetection} className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {loading ? "Scanning…" : "Detect Orphans"}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap gap-6">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-red-600">{result.orphans.length}</div>
              <div className="text-xs text-slate-500">Orphan pages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-slate-700">{result.crawled}</div>
              <div className="text-xs text-slate-500">Pages crawled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-slate-700">{result.total}</div>
              <div className="text-xs text-slate-500">In sitemap</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-extrabold text-green-600">{result.referenced}</div>
              <div className="text-xs text-slate-500">Unique links found</div>
            </div>
          </div>
          {result.message && (
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Info size={12} className="shrink-0 mt-0.5" />
              {result.message}
            </div>
          )}
          {result.orphans.length === 0 ? (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              No orphan pages found — all sitemap URLs are referenced by at least one crawled page.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Orphan Pages</span>
                <button
                  onClick={() => {
                    const text = result.orphans.join("\n");
                    void navigator.clipboard.writeText(text);
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600 transition-colors"
                >
                  <Copy size={11} />
                  Copy all
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {result.orphans.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex-1 truncate"
                    >
                      {url}
                    </a>
                    <ExternalLink size={10} className="text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InternalLinkingPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  // Active tab
  const [activeTab, setActiveTab] = useState<"single" | "batch" | "orphans">("single");

  // Form state
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [targetUrl, setTargetUrl] = useState("");
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [moneyPages, setMoneyPages] = useState<string[]>([""]);
  const [planTitle, setPlanTitle] = useState("");

  // Batch mode state
  const [batchUrls, setBatchUrls] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<PlanSummary[]>([]);

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

  // Batch submit
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError(null);
    setBatchResults([]);
    setBatchGenerating(true);

    const targetUrls = batchUrls
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.length > 0 && u.startsWith("http"));

    if (targetUrls.length === 0) {
      setBatchError("Enter at least one valid URL (one per line).");
      setBatchGenerating(false);
      return;
    }
    if (targetUrls.length > 8) {
      setBatchError("Maximum 8 URLs per batch.");
      setBatchGenerating(false);
      return;
    }

    const validMoneyPages = moneyPages.filter(u => u.trim().length > 0);
    if (validMoneyPages.length === 0) {
      setBatchError("Add at least one money page URL.");
      setBatchGenerating(false);
      return;
    }

    try {
      const res = await fetch("/api/tools/internal-linking/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrls,
          moneyPageUrls: validMoneyPages,
          clientId: clientId || undefined,
          title: planTitle || undefined,
        }),
      });
      const data = await res.json() as { plans?: PlanSummary[]; error?: string };
      if (!res.ok) {
        setBatchError(data.error ?? "Batch generation failed.");
      } else {
        setBatchResults(data.plans ?? []);
        await loadPlans();
      }
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBatchGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        {clientId && <ClientBackLink />}

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-violet-100 text-violet-700 shrink-0">
            <Link2 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Internal Linking Generator</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              AI-powered link suggestions, orphan detection, and batch analysis.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-xl w-fit">
          {([
            { id: "single", label: "Single URL", icon: Link2 },
            { id: "batch", label: "Batch", icon: Layers },
            { id: "orphans", label: "Orphan Finder", icon: Zap },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === id
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Client filter banner */}
        {clientId && <ClientFilterBanner />}

        {/* ── Orphan Detection Tab ── */}
        {activeTab === "orphans" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-violet-600" />
                <h2 className="text-sm font-semibold text-slate-700">Orphan Page Detection</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Crawls a site&apos;s sitemap and cross-references outbound links to find pages with no inbound internal links — quick SEO wins.
              </p>
            </div>
            <div className="p-5">
              <OrphanDetectionPanel defaultDomain={targetUrl ? (() => { try { return new URL(targetUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })() : ""} />
            </div>
          </div>
        )}

        {/* ── Batch Tab ── */}
        {activeTab === "batch" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
            <div className="space-y-5">
              <form onSubmit={handleBatchGenerate} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Layers size={14} className="text-violet-600" />
                    Batch Analysis
                  </h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Target URLs <span className="font-normal normal-case text-slate-400">(one per line, max 8)</span>
                    </label>
                    <textarea
                      value={batchUrls}
                      onChange={e => setBatchUrls(e.target.value)}
                      rows={6}
                      placeholder={"https://example.com/blog/post-1\nhttps://example.com/blog/post-2\nhttps://example.com/blog/post-3"}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono"
                    />
                  </div>

                  {/* Shared money pages */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Money page URLs <span className="font-normal normal-case text-slate-400">(shared across all)</span>
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
                            <button type="button" onClick={() => removeMoneyPage(i)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addMoneyPage} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors">
                      <Plus size={13} />
                      Add money page
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                      Title prefix <span className="font-normal normal-case text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={planTitle}
                      onChange={e => setPlanTitle(e.target.value)}
                      placeholder="E.g. May 2026 batch"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>

                  {batchError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-500" />
                      {batchError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={batchGenerating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    {batchGenerating ? (
                      <><Loader2 size={15} className="animate-spin" />Generating batch… (may take several minutes)</>
                    ) : (
                      <><Layers size={15} />Generate Batch Plans</>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div>
              {batchGenerating && (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <Loader2 size={32} className="animate-spin text-violet-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Running batch analysis…</p>
                  <p className="text-xs text-slate-500 mt-1">Shared sitemap crawl + individual AI analysis per URL. This may take a few minutes.</p>
                </div>
              )}
              {!batchGenerating && batchResults.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <Layers size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Batch plans will appear here.</p>
                </div>
              )}
              {batchResults.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                    <span className="text-sm font-semibold text-slate-700">{batchResults.length} plans generated</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {batchResults.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                        <button onClick={() => { void loadPlan(p.id); setActiveTab("single"); }} className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-medium text-slate-800 truncate">{p.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{p.domain} · {p.generationStatus}</div>
                        </button>
                        <ExternalLink size={13} className="text-slate-300 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Single URL Tab ── */}
        {activeTab === "single" && (
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
        )}
      </div>
    </div>
  );
}
