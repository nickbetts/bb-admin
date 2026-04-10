"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, ChevronDown, ChevronUp, Sparkles, Clock } from "lucide-react";

interface StrategyDoc {
  id: string;
  title: string;
  period: string;
  type: string;
  content: string;
  createdAt: string;
}

interface StrategyContent {
  performanceSummary?: string;
  wins?: { title: string; description: string }[];
  challenges?: { title: string; description: string }[];
  opportunities?: { title: string; description: string; priority?: string }[];
  channelStrategy?: Record<string, string>;
  budgetRec?: string;
  contentPriorities?: string[];
  technicalActions?: string[];
  kpiTargets?: { metric: string; current: string; target: string; timeline: string }[];
  competitorSnapshot?: string;
}

interface StrategyDocumentPanelProps {
  clientId: string;
  clientName: string;
  crossPlatformData?: Record<string, unknown>;
}

const CHANNEL_LABELS: Record<string, string> = {
  paid_search: "Paid Search",
  paid_social: "Paid Social",
  seo: "SEO",
  email: "Email",
  overall: "Overall",
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}

export function StrategyDocumentPanel({ clientId, clientName, crossPlatformData }: StrategyDocumentPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [period, setPeriod] = useState(getCurrentQuarter());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<StrategyContent | null>(null);
  const [docs, setDocs] = useState<StrategyDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<StrategyDoc | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/strategy-documents`);
      if (res.ok) {
        const all = await res.json() as StrategyDoc[];
        setDocs(all.filter((d) => d.type === "strategy"));
      }
    } catch { /* non-critical */ } finally {
      setLoadingDocs(false);
    }
  }, [clientId]);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  async function handleGenerate() {
    if (!period.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setViewingDoc(null);
    try {
      const res = await fetch("/api/ai/strategy-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          period: period.trim(),
          crossPlatformData: crossPlatformData ?? {},
        }),
      });
      const data = await res.json() as { document?: { content: StrategyContent }; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to generate strategy document"); return; }
      if (data.document?.content) {
        setResult(data.document.content);
        await loadDocs();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function displayContent(content: StrategyContent | null) {
    if (!content) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {content.performanceSummary && (
          <div style={{ background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)", borderRadius: "var(--r-sm)", padding: 14, fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>
            {content.performanceSummary}
          </div>
        )}

        {content.wins && content.wins.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--success)", marginBottom: 8 }}>Wins</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {content.wins.map((w, i) => (
                <div key={i} style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--success-text)", marginBottom: 3 }}>{w.title}</p>
                  <p style={{ fontSize: 12, color: "var(--success-text)" }}>{w.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.challenges && content.challenges.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--warning)", marginBottom: 8 }}>Challenges</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {content.challenges.map((c, i) => (
                <div key={i} style={{ background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--warning-text)", marginBottom: 3 }}>{c.title}</p>
                  <p style={{ fontSize: 12, color: "var(--warning-text)" }}>{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.opportunities && content.opportunities.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)", marginBottom: 8 }}>Opportunities</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {content.opportunities.map((o, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{o.title}</p>
                    {o.priority && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY_COLOR[o.priority] ?? "#6366f1", background: `${PRIORITY_COLOR[o.priority] ?? "#6366f1"}20`, padding: "1px 6px", borderRadius: 99, textTransform: "uppercase" }}>
                        {o.priority}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-2)" }}>{o.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.channelStrategy && Object.keys(content.channelStrategy).length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 8 }}>Channel Strategy</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(content.channelStrategy).map(([channel, strategy]) => (
                <div key={channel} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-text)", textTransform: "uppercase", marginBottom: 4 }}>
                    {CHANNEL_LABELS[channel] ?? channel}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>{strategy}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.budgetRec && (
          <div style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--success-text)", marginBottom: 4 }}>Budget Recommendation</p>
            <p style={{ fontSize: 13, color: "var(--success-text)", lineHeight: 1.6 }}>{content.budgetRec}</p>
          </div>
        )}

        {content.kpiTargets && content.kpiTargets.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 8 }}>KPI Targets</p>
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-sm)", overflow: "hidden" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>KPI</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>Current</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>Target</th>
                    <th style={{ textAlign: "right", padding: "8px 12px", fontWeight: 600, color: "var(--text-3)" }}>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {content.kpiTargets.map((kpi, i) => (
                    <tr key={i} style={{ borderBottom: i < content.kpiTargets!.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text)" }}>{kpi.metric}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-3)" }}>{kpi.current}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: "var(--success)" }}>{kpi.target}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-3)" }}>{kpi.timeline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {content.contentPriorities && content.contentPriorities.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 8 }}>Content Priorities</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {content.contentPriorities.map((p, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {content.technicalActions && content.technicalActions.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 8 }}>Technical Actions</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {content.technicalActions.map((a, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r)", overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer", borderBottom: expanded ? "1px solid var(--border)" : "none" }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FileText style={{ width: 18, height: 18, color: "var(--accent)" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Quarterly Strategy Document</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>AI-generated</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {expanded ? <ChevronUp style={{ width: 16, height: 16, color: "var(--text-3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--text-3)" }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 20 }}>
          {/* Generate controls */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 4 }}>Period</label>
              <input
                className="form-input"
                placeholder="e.g. Q2 2025"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{ maxWidth: 200 }}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || !period.trim()}
              className="btn btn-primary btn-sm"
              style={{ gap: 6, whiteSpace: "nowrap" }}
            >
              {loading ? (
                <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Generating…</>
              ) : (
                <><Sparkles style={{ width: 13, height: 13 }} /> Generate Strategy</>
              )}
            </button>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--danger-text)", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Generating {clientName}&apos;s strategy document — this may take up to a minute…
            </div>
          )}

          {/* Viewing a past doc */}
          {viewingDoc && !result && (() => {
            let content: StrategyContent | null = null;
            try { content = JSON.parse(viewingDoc.content) as StrategyContent; } catch { /* skip */ }
            return (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{viewingDoc.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>{new Date(viewingDoc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewingDoc(null)}>← Back</button>
                </div>
                {displayContent(content)}
              </div>
            );
          })()}

          {/* Latest generated result */}
          {result && !viewingDoc && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--success-text)", background: "var(--success-bg)", border: "1px solid var(--success-border)", padding: "4px 10px", borderRadius: 99 }}>
                  ✓ Strategy generated for {period}
                </p>
                <button className="btn btn-secondary btn-sm" onClick={() => setResult(null)}>Dismiss</button>
              </div>
              {displayContent(result)}
            </div>
          )}

          {/* Past strategy docs */}
          {!result && !viewingDoc && (
            <div>
              {loadingDocs ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: 13 }}>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Loading past documents…
                </div>
              ) : docs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
                  No strategy documents yet. Click &ldquo;Generate Strategy&rdquo; to create your first one.
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 10 }}>Past Documents</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setViewingDoc(doc)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", cursor: "pointer", textAlign: "left", width: "100%" }}
                      >
                        <Clock style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</p>
                          <p style={{ fontSize: 11, color: "var(--text-3)" }}>{new Date(doc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
