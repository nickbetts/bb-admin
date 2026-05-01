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
  Unlink,
} from "lucide-react";
import { ClientBackLink } from "@/components/ui/ClientBackLink";
import { ClientFilterBanner } from "@/components/ui/ClientFilterBanner";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface LinkSuggestion {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  context: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  confidence?: number;
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

// ─── Design system helpers ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r)",
  fontSize: 14,
  color: "var(--text)",
  background: "var(--surface)",
  outline: "none",
  fontFamily: "inherit",
};

function onFocusInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "var(--accent)";
}
function onBlurInput(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.style.borderColor = "var(--border)";
}

// ─── Priority badge ──────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const s: Record<string, React.CSSProperties> = {
    high:   { background: "var(--danger-bg)",  color: "var(--danger-text)",  border: "1px solid var(--danger-border)" },
    medium: { background: "var(--warning-bg)", color: "var(--warning-text)", border: "1px solid var(--warning-border)" },
    low:    { background: "var(--bg-2)",        color: "var(--text-3)",       border: "1px solid var(--border)" },
  };
  return (
    <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 99, ...(s[priority] ?? s.low) }}>
      {priority}
    </span>
  );
}

// ─── Confidence bar ──────────────────────────────────────────────────────────────

function ConfidenceBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const col = clamped >= 75 ? "var(--success)" : clamped >= 50 ? "var(--warning)" : "var(--text-4)";
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }} title={`Confidence: ${clamped}%`}>
      <span style={{ fontSize: 11, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>{clamped}%</span>
      <span style={{ width: 48, height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden", display: "block" }}>
        <span style={{ display: "block", height: "100%", borderRadius: 99, width: `${clamped}%`, background: col }} />
      </span>
    </span>
  );
}

// ─── Copy button ─────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: "0 2px", display: "inline-flex", alignItems: "center" }}
      title="Copy"
    >
      {copied ? <Check size={13} style={{ color: "var(--success)" }} /> : <Copy size={13} />}
    </button>
  );
}

// ─── Collapsible section ─────────────────────────────────────────────────────────

function CollapsibleSection({
  label, count, accentColor, children, defaultOpen = true, onCopyAll,
}: {
  label: string; count: number; accentColor: string;
  children: React.ReactNode; defaultOpen?: boolean; onCopyAll?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", borderBottom: open ? "1px solid rgb(0 0 0 / 0.04)" : "none" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: `color-mix(in srgb, ${accentColor} 15%, transparent)`, color: accentColor, minWidth: 28, textAlign: "center" }}>
              {count}
            </span>
            <span style={{ fontWeight: 650, fontSize: 14, color: "var(--text)" }}>{label}</span>
          </div>
          {open ? <ChevronUp size={16} style={{ color: "var(--text-3)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-3)" }} />}
        </button>
        {onCopyAll && (
          <button
            onClick={e => { e.stopPropagation(); onCopyAll(); }}
            style={{ padding: "16px 20px", background: "none", border: "none", borderLeft: "1px solid var(--border)", cursor: "pointer", color: "var(--text-3)", flexShrink: 0 }}
            title="Copy all as text"
          >
            <ClipboardList size={14} />
          </button>
        )}
      </div>
      {open && <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>}
    </div>
  );
}

// ─── Suggestion row ──────────────────────────────────────────────────────────────

function SuggestionRow({ suggestion, type }: { suggestion: LinkSuggestion; type: "money" | "outbound" | "inbound" }) {
  return (
    <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-text)", background: "var(--accent-bg)", padding: "3px 10px", borderRadius: "var(--r-sm)", border: "1px solid rgb(99 102 241 / 0.2)", fontFamily: "monospace" }}>
          &ldquo;{suggestion.anchorText}&rdquo;
        </span>
        <CopyButton value={suggestion.anchorText} />
        <PriorityBadge priority={suggestion.priority} />
        {suggestion.confidence !== undefined && <ConfidenceBar score={suggestion.confidence} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)", marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, color: "var(--text-2)", flexShrink: 0 }}>{type === "inbound" ? "From:" : "→"}</span>
        <a href={type === "inbound" ? suggestion.sourceUrl : suggestion.targetUrl} target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--info)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, overflow: "hidden", maxWidth: 360 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {type === "inbound" ? suggestion.sourceUrl : suggestion.targetUrl}
          </span>
          <ExternalLink size={10} style={{ flexShrink: 0 }} />
        </a>
        {type === "inbound" && (
          <>
            <span style={{ fontWeight: 600, color: "var(--text-2)" }}>→</span>
            <span style={{ color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>{suggestion.targetUrl}</span>
          </>
        )}
      </div>
      {(() => {
        // Context may start with a quoted exact sentence: "..." — rest
        const quoteMatch = suggestion.context?.match(/^"([^"]+)"\s*[—–-]?\s*([\s\S]*)/);
        if (quoteMatch) {
          // Bold the anchor text within the quoted sentence so it's clear
          // exactly where the <a> tag should start and end.
          const sentence = quoteMatch[1];
          const anchor = suggestion.anchorText ?? "";
          const anchorIdx = anchor ? sentence.toLowerCase().indexOf(anchor.toLowerCase()) : -1;
          let sentenceNodes: React.ReactNode;
          if (anchorIdx >= 0) {
            sentenceNodes = (
              <>
                {sentence.slice(0, anchorIdx)}
                <strong style={{ fontWeight: 700, fontStyle: "italic" }}>{sentence.slice(anchorIdx, anchorIdx + anchor.length)}</strong>
                {sentence.slice(anchorIdx + anchor.length)}
              </>
            );
          } else {
            sentenceNodes = sentence;
          }
          return (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>Placement</span>
              <blockquote style={{ margin: "4px 0 4px 0", paddingLeft: 10, borderLeft: "2px solid var(--accent)", fontSize: 12, color: "var(--text)", fontStyle: "italic" }}>
                {sentenceNodes}
              </blockquote>
              {quoteMatch[2] && <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>{quoteMatch[2]}</p>}
            </div>
          );
        }
        return (
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>Placement</span>
            <blockquote style={{ margin: "4px 0 4px 0", paddingLeft: 10, borderLeft: "2px solid var(--accent)", fontSize: 12, color: "var(--text-2)", fontStyle: "normal" }}>
              {suggestion.context}
            </blockquote>
          </div>
        );
      })()}
      <p style={{ fontSize: 12, color: "var(--text-3)" }}>
        <span style={{ fontWeight: 600, color: "var(--text-2)" }}>Why:</span> {suggestion.rationale}
      </p>
    </div>
  );
}

// ─── Plan results ────────────────────────────────────────────────────────────────

function PlanResults({ plan }: { plan: FullPlan }) {
  const result = plan.resultJson;
  const [shareLoading, setShareLoading] = useState(false);
  const [shareToken, setShareToken] = useState(plan.shareToken ?? null);
  const [portalPublished, setPortalPublished] = useState(!!plan.portalPublishedAt);
  const [portalLoading, setPortalLoading] = useState(false);

  const copyShareLink = () => {
    if (shareToken) void navigator.clipboard.writeText(`${window.location.origin}/api/tools/internal-linking/share/${shareToken}`);
  };

  const toggleShare = async () => {
    setShareLoading(true);
    try {
      const res = await fetch(`/api/tools/internal-linking/${plan.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shareToken ? { revokeShareToken: true } : { generateShareToken: true }),
      });
      const data = await res.json() as { shareToken?: string | null };
      setShareToken(data.shareToken ?? null);
    } finally { setShareLoading(false); }
  };

  const togglePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`/api/tools/internal-linking/${plan.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalPublished: !portalPublished }),
      });
      const data = await res.json() as { portalPublishedAt?: string | null };
      setPortalPublished(!!data.portalPublishedAt);
    } finally { setPortalLoading(false); }
  };

  const exportCsv = () => {
    if (!result) return;
    const rows: string[][] = [["Type", "Source URL", "Target URL", "Anchor Text", "Placement", "Rationale", "Priority", "Confidence"]];
    const add = (ss: LinkSuggestion[], t: string) => ss.forEach(s => rows.push([t, s.sourceUrl, s.targetUrl, s.anchorText, s.context, s.rationale, s.priority, s.confidence !== undefined ? String(s.confidence) : ""]));
    add(result.moneyPageLinks ?? [], "Money Page");
    add(result.outboundLinks ?? [], "Outbound");
    add(result.inboundLinks ?? [], "Inbound");
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `internal-links-${plan.domain}-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const copyAll = (ss: LinkSuggestion[]) => void navigator.clipboard.writeText(
    ss.map(s => `Anchor: "${s.anchorText}"\nTarget: ${s.targetUrl}\nPlacement: ${s.context}\nRationale: ${s.rationale}\nPriority: ${s.priority}${s.confidence !== undefined ? ` | Confidence: ${s.confidence}%` : ""}`).join("\n\n---\n\n")
  );

  if (!result) return <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "24px 0" }}>No results available.</p>;

  const total = (result.moneyPageLinks?.length ?? 0) + (result.outboundLinks?.length ?? 0) + (result.inboundLinks?.length ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary card */}
      <div style={{ background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.2)", borderRadius: "var(--r-lg)", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link2 size={15} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-text)" }}>Analysis Summary</span>
          </div>
          <button onClick={exportCsv} className="btn btn-secondary btn-sm" style={{ gap: 6, fontSize: 12 }}>
            <Download size={12} />Export CSV
          </button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16, lineHeight: 1.6 }}>{result.summary}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          {[
            { label: "Total", value: total, color: "var(--accent)" },
            { label: "Money page", value: result.moneyPageLinks?.length ?? 0, color: "var(--danger)" },
            { label: "Outbound", value: result.outboundLinks?.length ?? 0, color: "var(--info)" },
            { label: "Inbound", value: result.inboundLinks?.length ?? 0, color: "var(--success)" },
            ...(plan.targetWordCount ? [{ label: "Words", value: plan.targetWordCount.toLocaleString("en-GB"), color: "var(--text)" }] : []),
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {(result.warnings?.length ?? 0) > 0 && (
        <div style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--r)", padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--warning-text)" }}>Notes</span>
          </div>
          <ul style={{ paddingLeft: "1.25rem", listStyleType: "disc", display: "flex", flexDirection: "column", gap: 4 }}>
            {result.warnings.map((w, i) => <li key={i} style={{ fontSize: 12, color: "var(--warning-text)" }}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Link sections */}
      {(result.moneyPageLinks?.length ?? 0) > 0 && (
        <CollapsibleSection label="Money Page Links" count={result.moneyPageLinks.length} accentColor="var(--danger)" onCopyAll={() => copyAll(result.moneyPageLinks)}>
          {result.moneyPageLinks.map((s, i) => <SuggestionRow key={i} suggestion={s} type="money" />)}
        </CollapsibleSection>
      )}
      {(result.outboundLinks?.length ?? 0) > 0 && (
        <CollapsibleSection label="Outbound Links (Target → Blog Posts)" count={result.outboundLinks.length} accentColor="var(--info)" onCopyAll={() => copyAll(result.outboundLinks)}>
          {result.outboundLinks.map((s, i) => <SuggestionRow key={i} suggestion={s} type="outbound" />)}
        </CollapsibleSection>
      )}
      {(result.inboundLinks?.length ?? 0) > 0 && (
        <CollapsibleSection label="Inbound Links (Blog Posts → Target)" count={result.inboundLinks.length} accentColor="var(--success)" onCopyAll={() => copyAll(result.inboundLinks)}>
          {result.inboundLinks.map((s, i) => <SuggestionRow key={i} suggestion={s} type="inbound" />)}
        </CollapsibleSection>
      )}

      {/* Share / Portal */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingTop: 4 }}>
        <button onClick={toggleShare} disabled={shareLoading} className="btn btn-secondary btn-sm">
          {shareLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
          {shareToken ? "Revoke share link" : "Create share link"}
        </button>
        {shareToken && (
          <button onClick={copyShareLink} className="btn btn-primary btn-sm">
            <Copy size={14} />Copy share link
          </button>
        )}
        <button
          onClick={togglePortal} disabled={portalLoading} className="btn btn-secondary btn-sm"
          style={portalPublished ? { borderColor: "var(--success)", color: "var(--success)" } : {}}
        >
          {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          {portalPublished ? "Published to portal" : "Publish to portal"}
        </button>
      </div>
    </div>
  );
}

// ─── Previous plans list ─────────────────────────────────────────────────────────

function PreviousPlans({ plans, onSelect, onDelete }: {
  plans: PlanSummary[]; onSelect: (id: string) => void; onDelete: (id: string) => void;
}) {
  if (plans.length === 0) return null;
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-header" style={{ padding: "14px 24px" }}>
        <p className="card-title" style={{ fontSize: 13 }}>Previous Plans</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {plans.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
            <button onClick={() => onSelect(p.id)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, fontSize: 12, color: "var(--text-3)" }}>
                <span>{p.domain}</span>
                <span>·</span>
                <span>{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                {p.generationStatus === "generating" && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--warning)" }}>
                    <Loader2 size={11} className="animate-spin" /> Generating…
                  </span>
                )}
                {p.generationStatus === "failed" && <span style={{ color: "var(--danger)" }}>Failed</span>}
              </div>
            </button>
            <button
              onClick={() => onDelete(p.id)}
              style={{ color: "var(--text-4)", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-4)")}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Orphan detection panel ──────────────────────────────────────────────────────

interface OrphanResult { orphans: string[]; crawled: number; total: number; referenced: number; message?: string; }

type BrokenCheckStatus = number | "timeout" | "error";
interface BrokenLink {
  brokenUrl: string;
  status: BrokenCheckStatus;
  isExternal: boolean;
  pages: { url: string; anchorText: string }[];
}
interface BrokenLinkResult {
  broken: BrokenLink[];
  checked: number;
  crawled: number;
  total: number;
  message?: string;
}

function OrphanDetectionPanel({ defaultDomain }: { defaultDomain?: string }) {
  const [domain, setDomain] = useState(defaultDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrphanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/tools/internal-linking/orphans?domain=${encodeURIComponent(domain.trim())}`);
      const data = await res.json() as OrphanResult & { error?: string };
      if (!res.ok) setError(data.error ?? "Detection failed.");
      else setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <form onSubmit={run} style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Globe style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-3)" }} />
          <input
            type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com"
            style={{ ...inputStyle, paddingLeft: 40 }} onFocus={onFocusInput} onBlur={onBlurInput}
          />
        </div>
        <button type="submit" disabled={loading || !domain.trim()} className="btn btn-primary" style={{ flexShrink: 0, gap: 8 }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? "Scanning…" : "Detect Orphans"}
        </button>
      </form>

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--danger-text)" }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: "var(--danger)" }} />{error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Orphan pages", value: result.orphans.length, color: "var(--danger)" },
              { label: "Pages crawled", value: result.crawled,       color: "var(--text)" },
              { label: "In sitemap",    value: result.total,          color: "var(--text)" },
              { label: "Links found",   value: result.referenced,     color: "var(--success)" },
            ].map(m => (
              <div key={m.label} className="metric-card" style={{ textAlign: "center", padding: "20px 16px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: m.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{m.label}</div>
              </div>
            ))}
          </div>
          {result.message && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text-3)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 14px" }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />{result.message}
            </div>
          )}
          {result.orphans.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--success-text)", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r)", padding: "14px 18px" }}>
              No orphan pages found — all sitemap URLs are referenced by at least one crawled page.
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "12px 20px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
                  Orphan Pages ({result.orphans.length})
                </p>
                <button
                  onClick={() => void navigator.clipboard.writeText(result.orphans.join("\n"))}
                  className="btn btn-ghost btn-sm" style={{ gap: 6, fontSize: 12 }}
                >
                  <Copy size={12} />Copy all
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", maxHeight: 320, overflowY: "auto" }}>
                {result.orphans.map((url, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, fontSize: 12, color: "var(--info)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {url}
                    </a>
                    <ExternalLink size={10} style={{ color: "var(--text-4)", flexShrink: 0 }} />
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

// ─── Broken link checker panel ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: BrokenCheckStatus }) {
  const is4xx = typeof status === "number" && status >= 400 && status < 500;
  const is5xx = typeof status === "number" && status >= 500;
  const style: React.CSSProperties = is4xx
    ? { background: "var(--danger-bg)",  color: "var(--danger-text)",  border: "1px solid var(--danger-border)" }
    : is5xx
    ? { background: "var(--warning-bg)", color: "var(--warning-text)", border: "1px solid var(--warning-border)" }
    : { background: "var(--bg-2)",        color: "var(--text-3)",       border: "1px solid var(--border)" };
  const label = typeof status === "number" ? String(status) : status;
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", padding: "2px 8px", borderRadius: 99, ...style }}>
      {label}
    </span>
  );
}

function BrokenLinkPanel({ defaultDomain }: { defaultDomain?: string }) {
  const [domain, setDomain] = useState(defaultDomain ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrokenLinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true); setError(null); setResult(null); setExpandedRows(new Set());
    try {
      const res = await fetch(`/api/tools/internal-linking/broken-links?domain=${encodeURIComponent(domain.trim())}`);
      const data = await res.json() as BrokenLinkResult & { error?: string };
      if (!res.ok) setError(data.error ?? "Scan failed.");
      else setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error"); }
    finally { setLoading(false); }
  };

  const toggleRow = (i: number) =>
    setExpandedRows(prev => {
      const s = new Set(prev);
      if (s.has(i)) { s.delete(i); } else { s.add(i); }
      return s;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <form onSubmit={run} style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Globe style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-3)" }} />
          <input
            type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com"
            style={{ ...inputStyle, paddingLeft: 40 }} onFocus={onFocusInput} onBlur={onBlurInput}
          />
        </div>
        <button type="submit" disabled={loading || !domain.trim()} className="btn btn-primary" style={{ flexShrink: 0, gap: 8 }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          {loading ? "Scanning…" : "Scan for Broken Links"}
        </button>
      </form>

      {error && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--danger-text)" }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: "var(--danger)" }} />{error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <Loader2 size={28} style={{ color: "var(--accent)", margin: "0 auto 12px", display: "block" }} className="animate-spin" />
          <p style={{ fontSize: 13, color: "var(--text-3)" }}>Crawling pages and checking links — this may take a minute.</p>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Broken links",  value: result.broken.length, color: result.broken.length > 0 ? "var(--danger)" : "var(--success)" },
              { label: "Links checked", value: result.checked,         color: "var(--text)" },
              { label: "Pages crawled", value: result.crawled,          color: "var(--text)" },
              { label: "In sitemap",    value: result.total,             color: "var(--text)" },
            ].map(m => (
              <div key={m.label} className="metric-card" style={{ textAlign: "center", padding: "20px 16px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: m.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {result.message && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text-3)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: "10px 14px" }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />{result.message}
            </div>
          )}

          {result.broken.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--success-text)", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r)", padding: "14px 18px" }}>
              No broken links found — all {result.checked.toLocaleString("en-GB")} checked URLs responded successfully.
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "12px 20px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
                  Broken Links ({result.broken.length})
                </p>
                <button
                  onClick={() => void navigator.clipboard.writeText(result.broken.map(b => `${typeof b.status === "number" ? b.status : b.status.toUpperCase()}  ${b.brokenUrl}  (found on: ${b.pages.map(p => p.url).join(", ")})`).join("\n"))}
                  className="btn btn-ghost btn-sm" style={{ gap: 6, fontSize: 12 }}
                >
                  <Copy size={12} />Copy all
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {result.broken.map((b, i) => (
                  <div key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", cursor: b.pages.length > 1 ? "pointer" : "default" }}
                      onClick={() => b.pages.length > 1 && toggleRow(i)}
                    >
                      <StatusBadge status={b.status} />
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 6px", borderRadius: 99, background: b.isExternal ? "var(--bg-2)" : "var(--accent-bg)", color: b.isExternal ? "var(--text-3)" : "var(--accent-text)", border: `1px solid ${b.isExternal ? "var(--border)" : "rgb(99 102 241 / 0.2)"}`, flexShrink: 0 }}>
                        {b.isExternal ? "External" : "Internal"}
                      </span>
                      <a href={b.brokenUrl} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, fontSize: 12, color: "var(--danger-text)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        onClick={e => e.stopPropagation()}
                      >
                        {b.brokenUrl}
                      </a>
                      <CopyButton value={b.brokenUrl} />
                      <ExternalLink size={10} style={{ color: "var(--text-4)", flexShrink: 0 }} />
                      {b.pages.length > 1 && (
                        <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>
                          {expandedRows.has(i) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </span>
                      )}
                    </div>
                    {/* Source pages */}
                    {(b.pages.length === 1 || expandedRows.has(i)) && (
                      <div style={{ padding: "0 20px 10px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {(b.pages.length === 1 ? b.pages : b.pages).map((p, j) => (
                          <div key={j} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                            <span style={{ color: "var(--text-4)", flexShrink: 0 }}>↳ found on</span>
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: "var(--info)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}
                            >{p.url}</a>
                            {p.anchorText && (
                              <span style={{ color: "var(--text-3)", flexShrink: 0 }}>· &ldquo;{p.anchorText}&rdquo;</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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

// ─── Main page ───────────────────────────────────────────────────────────────────

export default function InternalLinkingPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [activeTab, setActiveTab] = useState<"single" | "batch" | "orphans" | "broken">("single");
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [targetUrl, setTargetUrl] = useState("");
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [moneyPages, setMoneyPages] = useState<string[]>([""]);
  const [planTitle, setPlanTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<FullPlan | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [batchUrls, setBatchUrls] = useState("");
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<PlanSummary[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPlans = useCallback(async () => {
    const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    const res = await fetch(`/api/tools/internal-linking${qs}`);
    if (res.ok) { const data = await res.json() as { plans: PlanSummary[] }; setPlans(data.plans); }
  }, [clientId]);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  const loadPlan = async (id: string) => {
    const res = await fetch(`/api/tools/internal-linking/${id}`);
    if (res.ok) { setActivePlan(await res.json() as FullPlan); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/tools/internal-linking/${id}`, { method: "DELETE" });
    setPlans(prev => prev.filter(p => p.id !== id));
    if (activePlan?.id === id) setActivePlan(null);
  };

  const addMoneyPage    = () => setMoneyPages(prev => [...prev, ""]);
  const removeMoneyPage = (i: number) => setMoneyPages(prev => prev.filter((_, j) => j !== i));
  const updateMoneyPage = (i: number, v: string) => setMoneyPages(prev => prev.map((p, j) => j === i ? v : p));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setActivePlan(null); setGenerating(true);
    const vmp = moneyPages.filter(u => u.trim());
    if (!vmp.length) { setError("Add at least one money page URL."); setGenerating(false); return; }
    try {
      let res: Response;
      if (mode === "upload" && docxFile) {
        const fd = new FormData();
        fd.append("file", docxFile); fd.append("moneyPageUrls", JSON.stringify(vmp));
        if (clientId) fd.append("clientId", clientId);
        if (planTitle) fd.append("title", planTitle);
        res = await fetch("/api/tools/internal-linking", { method: "POST", body: fd });
      } else {
        if (!targetUrl.trim()) { setError("Enter a target blog URL."); setGenerating(false); return; }
        res = await fetch("/api/tools/internal-linking", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl: targetUrl.trim(), moneyPageUrls: vmp, clientId: clientId || undefined, title: planTitle || undefined }),
        });
      }
      const data = await res.json() as FullPlan & { error?: string };
      if (!res.ok) setError(data.error ?? "Generation failed.");
      else { setActivePlan(data); await loadPlans(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Unexpected error"); }
    finally { setGenerating(false); }
  };

  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault(); setBatchError(null); setBatchResults([]); setBatchGenerating(true);
    const urls = batchUrls.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
    if (!urls.length) { setBatchError("Enter at least one valid URL."); setBatchGenerating(false); return; }
    if (urls.length > 8) { setBatchError("Maximum 8 URLs per batch."); setBatchGenerating(false); return; }
    const vmp = moneyPages.filter(u => u.trim());
    if (!vmp.length) { setBatchError("Add at least one money page URL."); setBatchGenerating(false); return; }
    try {
      const res = await fetch("/api/tools/internal-linking/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrls: urls, moneyPageUrls: vmp, clientId: clientId || undefined, title: planTitle || undefined }),
      });
      const data = await res.json() as { plans?: PlanSummary[]; error?: string };
      if (!res.ok) setBatchError(data.error ?? "Batch failed.");
      else { setBatchResults(data.plans ?? []); await loadPlans(); }
    } catch (err) { setBatchError(err instanceof Error ? err.message : "Unexpected error"); }
    finally { setBatchGenerating(false); }
  };

  const defaultOrphanDomain = targetUrl
    ? (() => { try { return new URL(targetUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })()
    : "";

  // ── Shared money pages + title form fragment ────────────────────────────────────
  const sharedFormBody = (
    <>
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
          Money Page URLs
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {moneyPages.map((mp, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="url" value={mp} onChange={e => updateMoneyPage(i, e.target.value)}
                placeholder={`https://example.com/service-${i + 1}`}
                style={{ ...inputStyle, flex: 1 }} onFocus={onFocusInput} onBlur={onBlurInput}
              />
              {moneyPages.length > 1 && (
                <button
                  type="button" onClick={() => removeMoneyPage(i)}
                  style={{ color: "var(--text-4)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-4)")}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addMoneyPage} className="btn btn-ghost btn-sm" style={{ marginTop: 8, gap: 6, fontSize: 12, color: "var(--accent)" }}>
          <Plus size={13} />Add money page
        </button>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
          Plan Title <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
        </label>
        <input
          type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)}
          placeholder="E.g. Homepage blog linking audit"
          style={inputStyle} onFocus={onFocusInput} onBlur={onBlurInput}
        />
      </div>
    </>
  );

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <ClientBackLink />
      <ClientFilterBanner />

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Link2 style={{ width: 20, height: 20, color: "white" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Internal Linking Generator</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            AI-powered link suggestions, orphan detection, and batch analysis.
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, padding: 4, background: "var(--border-subtle)", borderRadius: "var(--r)", width: "fit-content" }}>
        {([
          { id: "single",  label: "Single URL",    Icon: Link2 },
          { id: "batch",   label: "Batch",          Icon: Layers },
          { id: "orphans", label: "Orphan Finder",  Icon: Zap },
          { id: "broken",  label: "Broken Links",   Icon: Unlink },
        ] as const).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            borderRadius: "var(--r-sm)", border: "none", cursor: "pointer",
            transition: "all 0.15s ease",
            background: activeTab === id ? "var(--surface)" : "transparent",
            color:      activeTab === id ? "var(--accent)"  : "var(--text-2)",
            boxShadow:  activeTab === id ? "var(--shadow-xs)" : "none",
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Broken links tab ── */}
      {activeTab === "broken" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Unlink style={{ width: 18, height: 18, color: "var(--text-3)" }} />
              <div>
                <p className="card-title">Broken Link Checker</p>
                <p className="card-subtitle">Crawl your site and surface 4xx / 5xx links before they hurt your rankings.</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <BrokenLinkPanel defaultDomain={defaultOrphanDomain} />
          </div>
        </div>
      )}

      {/* ── Orphan tab ── */}
      {activeTab === "orphans" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Zap style={{ width: 18, height: 18, color: "var(--text-3)" }} />
              <div>
                <p className="card-title">Orphan Page Detection</p>
                <p className="card-subtitle">Find sitemap pages with no inbound internal links — quick SEO wins.</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <OrphanDetectionPanel defaultDomain={defaultOrphanDomain} />
          </div>
        </div>
      )}

      {/* ── Batch tab ── */}
      {activeTab === "batch" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start" }}>
          <form onSubmit={handleBatchGenerate} className="card" style={{ overflow: "hidden" }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Layers style={{ width: 16, height: 16, color: "var(--text-3)" }} />
                <p className="card-title">Batch Analysis</p>
              </div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
                  Target URLs <span style={{ fontWeight: 400, textTransform: "none" }}>(one per line, max 8)</span>
                </label>
                <textarea
                  value={batchUrls} onChange={e => setBatchUrls(e.target.value)} rows={6}
                  placeholder={"https://example.com/blog/post-1\nhttps://example.com/blog/post-2"}
                  style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical" }}
                  onFocus={onFocusInput} onBlur={onBlurInput}
                />
              </div>
              {sharedFormBody}
              {batchError && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--danger-text)" }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{batchError}
                </div>
              )}
              <button type="submit" disabled={batchGenerating} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                {batchGenerating
                  ? <><Loader2 size={15} className="animate-spin" />Generating batch…</>
                  : <><Layers size={15} />Generate Batch Plans</>}
              </button>
            </div>
          </form>

          <div>
            {batchGenerating && (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Loader2 size={32} style={{ color: "var(--accent)", margin: "0 auto 16px", display: "block" }} className="animate-spin" />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Running batch analysis…</p>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>Shared sitemap crawl + AI analysis per URL. This may take a few minutes.</p>
              </div>
            )}
            {!batchGenerating && batchResults.length === 0 && (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Layers size={32} style={{ color: "var(--text-4)", margin: "0 auto 12px", display: "block" }} />
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>Batch plans will appear here.</p>
              </div>
            )}
            {batchResults.length > 0 && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div className="card-header" style={{ padding: "14px 24px" }}>
                  <p className="card-title" style={{ fontSize: 13 }}>{batchResults.length} plans generated</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {batchResults.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
                      <button onClick={() => { void loadPlan(p.id); setActiveTab("single"); }} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{p.domain} · {p.generationStatus}</div>
                      </button>
                      <ExternalLink size={13} style={{ color: "var(--text-4)", flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Single URL tab ── */}
      {activeTab === "single" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, alignItems: "start" }}>
          {/* Left: form + history */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <form onSubmit={handleGenerate} className="card" style={{ overflow: "hidden" }}>
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Link2 style={{ width: 16, height: 16, color: "var(--text-3)" }} />
                  <p className="card-title">New Analysis</p>
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Mode toggle */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
                    Target Post
                  </label>
                  <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
                    {(["url", "upload"] as const).map(m => (
                      <button key={m} type="button" onClick={() => setMode(m)} style={{
                        flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600,
                        border: "none", cursor: "pointer", transition: "all 0.15s ease",
                        background: mode === m ? "var(--gradient-accent)" : "transparent",
                        color:      mode === m ? "white"                  : "var(--text-2)",
                      }}>
                        {m === "url" ? "Live URL" : "Upload Draft"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* URL input or file upload */}
                {mode === "url" ? (
                  <div style={{ position: "relative" }}>
                    <Globe style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-3)" }} />
                    <input
                      type="url" value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
                      placeholder="https://example.com/blog/my-post"
                      style={{ ...inputStyle, paddingLeft: 40 }} onFocus={onFocusInput} onBlur={onBlurInput}
                    />
                  </div>
                ) : (
                  <div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{ border: "2px dashed var(--border)", borderRadius: "var(--r)", padding: "20px 16px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                    >
                      <input ref={fileInputRef} type="file" accept=".docx" style={{ display: "none" }} onChange={e => setDocxFile(e.target.files?.[0] ?? null)} />
                      {docxFile ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--text)" }}>
                          <Upload size={15} style={{ color: "var(--accent)" }} />
                          <span style={{ fontWeight: 600 }}>{docxFile.name}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "var(--text-3)" }}>
                          <Upload size={18} style={{ margin: "0 auto 8px", display: "block", color: "var(--text-4)" }} />
                          Click to upload a <strong style={{ color: "var(--text-2)" }}>.docx</strong> draft
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
                      <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                      Domain for sitemap discovery is taken from your first money page URL.
                    </div>
                  </div>
                )}

                {sharedFormBody}

                {error && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r)", fontSize: 13, color: "var(--danger-text)" }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
                  </div>
                )}

                <button type="submit" disabled={generating} className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  {generating
                    ? <><Loader2 size={15} className="animate-spin" />Analysing… (may take up to 2 min)</>
                    : <><Link2 size={15} />Generate Link Plan</>}
                </button>
              </div>
            </form>

            <PreviousPlans plans={plans} onSelect={loadPlan} onDelete={deletePlan} />
          </div>

          {/* Right: results */}
          <div>
            {generating && !activePlan && (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Loader2 size={36} style={{ color: "var(--accent)", margin: "0 auto 16px", display: "block" }} className="animate-spin" />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Crawling sitemap &amp; analysing content…</p>
                <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 6 }}>
                  Fetching blog posts and calling AI — this may take a minute or two.
                </p>
              </div>
            )}
            {!generating && !activePlan && (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <Link2 size={36} style={{ color: "var(--text-4)", margin: "0 auto 16px", display: "block" }} />
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>Results will appear here once you generate a plan.</p>
              </div>
            )}
            {activePlan && (
              <div className="card" style={{ overflow: "hidden" }}>
                <div className="card-header">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="card-title">{activePlan.title}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 12, color: "var(--text-3)" }}>
                      {activePlan.targetUrl && (
                        <a href={activePlan.targetUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--info)", textDecoration: "none", overflow: "hidden", maxWidth: 400 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activePlan.targetUrl}</span>
                          <ExternalLink size={10} style={{ flexShrink: 0 }} />
                        </a>
                      )}
                      {activePlan.targetSource === "upload" && <span>Draft upload</span>}
                    </div>
                  </div>
                  <button onClick={() => setActivePlan(null)} className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: "var(--text-3)", flexShrink: 0 }}>
                    Close
                  </button>
                </div>
                <div className="card-body">
                  <PlanResults plan={activePlan} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
