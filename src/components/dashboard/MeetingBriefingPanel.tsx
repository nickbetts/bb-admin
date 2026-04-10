"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarRange, Loader2, ChevronDown, ChevronUp, Sparkles, Clock, AlertTriangle, CheckCircle2, List } from "lucide-react";

interface BriefingWin {
  title: string;
  detail: string;
}

interface BriefingDecision {
  title: string;
  context: string;
  recommendation: string;
}

interface BriefingAction {
  title: string;
  status?: string;
}

interface BriefingProposedAction {
  title: string;
  priority: string;
  rationale: string;
}

interface BriefingRisk {
  title: string;
  likelihood: string;
  impact: string;
  mitigation: string;
}

interface BriefingGoalStatus {
  title: string;
  progress: string;
  onTrack: boolean;
}

interface Briefing {
  wins?: BriefingWin[];
  decisionsNeeded?: BriefingDecision[];
  actionStatus?: {
    outstanding?: BriefingAction[];
    proposed?: BriefingProposedAction[];
  };
  risks?: BriefingRisk[];
  goalStatus?: BriefingGoalStatus[];
  talkingPoints?: string[];
}

interface StoredDoc {
  id: string;
  title: string;
  period: string;
  type: string;
  content: string;
  createdAt: string;
}

interface MeetingBriefingPanelProps {
  clientId: string;
  clientName: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const LIKELIHOOD_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

export function MeetingBriefingPanel({ clientId, clientName }: MeetingBriefingPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [viewingDoc, setViewingDoc] = useState<StoredDoc | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/strategy-documents`);
      if (res.ok) {
        const all = await res.json() as StoredDoc[];
        setDocs(all.filter((d) => d.type === "briefing"));
      }
    } catch { /* non-critical */ } finally {
      setLoadingDocs(false);
    }
  }, [clientId]);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setBriefing(null);
    setViewingDoc(null);
    try {
      const res = await fetch("/api/ai/meeting-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json() as { briefing?: Briefing; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to generate briefing"); return; }
      if (data.briefing) {
        setBriefing(data.briefing);
        await loadDocs();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function displayBriefing(b: Briefing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Talking points — open with */}
        {b.talkingPoints && b.talkingPoints.length > 0 && (
          <div style={{ background: "var(--accent-bg)", border: "1px solid rgb(99 102 241 / 0.25)", borderRadius: "var(--r-sm)", padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent-text)", marginBottom: 8 }}>
              <List style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
              Opening Talking Points
            </p>
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {b.talkingPoints.map((point, i) => (
                <li key={i} style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{point}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Wins */}
        {b.wins && b.wins.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--success)", marginBottom: 8 }}>Wins to Highlight</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {b.wins.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: "var(--r-sm)", alignItems: "flex-start" }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: "var(--success)", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--success-text)", marginBottom: 2 }}>{w.title}</p>
                    <p style={{ fontSize: 12, color: "var(--success-text)" }}>{w.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goal status */}
        {b.goalStatus && b.goalStatus.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 8 }}>Goal Status</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {b.goalStatus.map((g, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                  <span style={{ fontSize: 12, color: g.onTrack ? "#22c55e" : "#f59e0b", fontWeight: 700, flexShrink: 0 }}>
                    {g.onTrack ? "✓" : "⚠"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{g.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>{g.progress}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decisions needed */}
        {b.decisionsNeeded && b.decisionsNeeded.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--accent)", marginBottom: 8 }}>Decisions Needed</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {b.decisionsNeeded.map((d, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{d.title}</p>
                  <p style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>{d.context}</p>
                  <div style={{ background: "var(--accent-bg)", padding: "6px 10px", borderRadius: "var(--r-sm)" }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--accent-text)" }}>Recommendation: {d.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action status */}
        {b.actionStatus && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 8 }}>Actions</p>
            {b.actionStatus.outstanding && b.actionStatus.outstanding.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Outstanding</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {b.actionStatus.outstanding.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                      <span style={{ fontSize: 11, color: "var(--text-3)", flex: 1 }}>{a.title}</span>
                      {a.status && <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", background: "var(--border)", padding: "1px 6px", borderRadius: 99 }}>{a.status}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {b.actionStatus.proposed && b.actionStatus.proposed.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 6 }}>Proposed New Actions</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {b.actionStatus.proposed.map((a, i) => (
                    <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{a.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: PRIORITY_COLOR[a.priority] ?? "#6366f1", background: `${PRIORITY_COLOR[a.priority] ?? "#6366f1"}20`, padding: "1px 6px", borderRadius: 99, textTransform: "uppercase" }}>{a.priority}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-3)" }}>{a.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Risks */}
        {b.risks && b.risks.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--danger)", marginBottom: 8 }}>Risks &amp; Watch Points</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {b.risks.map((r, i) => (
                <div key={i} style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r-sm)", padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <AlertTriangle style={{ width: 13, height: 13, color: "var(--danger)", flexShrink: 0 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--danger-text)" }}>{r.title}</p>
                    <span style={{ fontSize: 10, color: LIKELIHOOD_COLOR[r.likelihood.toLowerCase()] ?? "#ef4444", background: `${LIKELIHOOD_COLOR[r.likelihood.toLowerCase()] ?? "#ef4444"}20`, padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>
                      {r.likelihood} likelihood
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--danger-text)", marginBottom: 4 }}>Impact: {r.impact}</p>
                  <p style={{ fontSize: 12, color: "var(--danger-text)" }}>Mitigation: {r.mitigation}</p>
                </div>
              ))}
            </div>
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
          <CalendarRange style={{ width: 18, height: 18, color: "var(--warning)" }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Meeting Briefing</span>
          <span style={{ fontSize: 11, color: "var(--text-3)", background: "var(--border)", padding: "2px 8px", borderRadius: 99 }}>pre-meeting 1-pager</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!briefing && !viewingDoc && (
            <button
              onClick={(e) => { e.stopPropagation(); void handleGenerate(); }}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 13, gap: 6 }}
            >
              {loading ? (
                <><Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> Generating…</>
              ) : (
                <><Sparkles style={{ width: 13, height: 13 }} /> Generate Briefing</>
              )}
            </button>
          )}
          {expanded ? <ChevronUp style={{ width: 16, height: 16, color: "var(--text-3)" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "var(--text-3)" }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 20 }}>
          {error && (
            <div style={{ padding: "10px 14px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--danger-text)", marginBottom: 16 }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              Preparing {clientName}&apos;s meeting briefing — pulling goals, actions, and recent performance…
            </div>
          )}

          {/* Viewing a past briefing */}
          {viewingDoc && !briefing && (() => {
            let content: Briefing | null = null;
            try { content = JSON.parse(viewingDoc.content) as Briefing; } catch { /* skip */ }
            return (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{viewingDoc.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-3)" }}>{new Date(viewingDoc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewingDoc(null)}>← Back</button>
                </div>
                {content && displayBriefing(content)}
              </div>
            );
          })()}

          {/* Latest generated briefing */}
          {briefing && !viewingDoc && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--success-text)", background: "var(--success-bg)", border: "1px solid var(--success-border)", padding: "4px 10px", borderRadius: 99 }}>
                  ✓ Briefing ready for {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setBriefing(null); void handleGenerate(); }}>Regenerate</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setBriefing(null)}>Dismiss</button>
                </div>
              </div>
              {displayBriefing(briefing)}
            </div>
          )}

          {/* Past briefings list */}
          {!briefing && !viewingDoc && !loading && (
            <div>
              {loadingDocs ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: 13 }}>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Loading past briefings…
                </div>
              ) : docs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 13 }}>
                  No briefings yet. Click &ldquo;Generate Briefing&rdquo; to create a pre-meeting 1-pager.
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-3)", marginBottom: 10 }}>Past Briefings</p>
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
