"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Map,
  ChevronRight,
  Loader2,
  FileText,
  Search as SearchIcon,
  Calendar,
  BarChart3,
  Plus,
  X,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  website?: string;
}

interface AvailableSources {
  proposals: { id: string; title: string; clientName: string; createdAt: string }[];
  keywordResearch: { id: string; title: string; website: string; createdAt: string }[];
  contentStrategies: { id: string; title: string; period: string; createdAt: string }[];
  mediaPlans: { id: string; title: string; objective: string; totalBudget: number; createdAt: string }[];
}

interface FocusPeriod {
  startMonth: number;
  endMonth: number;
  label: string;
  description: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function NewGrandPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState<"pitch" | "onboarding" | "strategy_refresh">("pitch");
  const [clientBrief, setClientBrief] = useState("");
  const [sources, setSources] = useState<AvailableSources | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState("");
  const [selectedKwResearch, setSelectedKwResearch] = useState("");
  const [selectedContentStrategy, setSelectedContentStrategy] = useState("");
  const [selectedMediaPlan, setSelectedMediaPlan] = useState("");
  const [focusPeriods, setFocusPeriods] = useState<FocusPeriod[]>([]);
  const [creating, setCreating] = useState(false);

  // Inline brief state
  const [kwWebsite, setKwWebsite] = useState("");
  const [kwBrief, setKwBrief] = useState("");
  const [kwMonthlyBudget, setKwMonthlyBudget] = useState("");
  const [csDomain, setCsDomain] = useState("");
  const [csDatabase, setCsDatabase] = useState("uk");
  const [csBrief, setCsBrief] = useState("");
  const [csCompetitors, setCsCompetitors] = useState("");
  const [mpObjective, setMpObjective] = useState("lead_gen");
  const [mpTotalBudget, setMpTotalBudget] = useState("");
  const [mpDuration, setMpDuration] = useState("90");

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data.clients ?? []))
      .catch(() => {});
  }, []);

  const loadSources = useCallback(async (cId: string) => {
    if (!cId) { setSources(null); return; }
    setLoadingSources(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/sources?clientId=${cId}`);
      if (res.ok) setSources(await res.json());
    } catch { /* ignore */ }
    finally { setLoadingSources(false); }
  }, []);

  useEffect(() => {
    if (clientId) {
      loadSources(clientId);
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        if (!title) setTitle(`${client.name} — Go-to-Market Plan`);
        if (client.website) {
          setKwWebsite((prev) => prev || client.website || "");
          setCsDomain((prev) => prev || client.website!.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, ""));
        }
      }
    }
  }, [clientId, clients, loadSources, title]);

  function addFocusPeriod() {
    setFocusPeriods((prev) => [
      ...prev,
      { startMonth: new Date().getMonth(), endMonth: new Date().getMonth() + 2, label: "", description: "" },
    ]);
  }

  function updateFocusPeriod(index: number, field: keyof FocusPeriod, value: string | number) {
    setFocusPeriods((prev) => prev.map((fp, i) => (i === index ? { ...fp, [field]: value } : fp)));
  }

  function removeFocusPeriod(index: number) {
    setFocusPeriods((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!title) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tools/grand-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          title,
          purpose,
          proposalId: selectedProposal || undefined,
          keywordResearchId: selectedKwResearch || undefined,
          contentStrategyId: selectedContentStrategy || undefined,
          mediaPlanId: selectedMediaPlan || undefined,
          clientBrief: clientBrief || undefined,
          campaignFocusPeriods: focusPeriods.filter((fp) => fp.label),
          config: {
            ...(!selectedKwResearch && kwWebsite ? { kwBrief: { website: kwWebsite, brief: kwBrief, monthlyBudget: kwMonthlyBudget } } : {}),
            ...(!selectedContentStrategy && csDomain ? { contentBrief: { domain: csDomain, database: csDatabase, brief: csBrief, competitors: csCompetitors } } : {}),
            ...(!selectedMediaPlan && mpTotalBudget ? { mediaBrief: { objective: mpObjective, totalBudget: parseFloat(mpTotalBudget) || 0, duration: parseInt(mpDuration) || 90 } } : {}),
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/tools/grand-plan/${data.grandPlan.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  };

  const cardPad: React.CSSProperties = { padding: "20px 24px" };

  const label: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-2)",
    marginBottom: 6,
    display: "block",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 14,
    background: "var(--bg-input)",
    color: "var(--text)",
    outline: "none",
  };

  const select: React.CSSProperties = { ...input, cursor: "pointer" };

  // Section card with header + optional brief panel
  const sectionCard: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  };

  const sectionHeader: React.CSSProperties = {
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const briefPanel: React.CSSProperties = {
    borderTop: "1px solid var(--border)",
    padding: "16px 20px",
    background: "var(--bg-2, #f8fafc)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: "var(--text-3)",
    marginBottom: 4,
    display: "block",
  };

  const fieldInput: React.CSSProperties = {
    ...input,
    fontSize: 13,
    padding: "8px 11px",
  };

  const aiPill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "var(--accent)",
    background: "var(--accent-bg)",
    borderRadius: 20,
    padding: "3px 8px",
    marginLeft: "auto",
  };

  const linkedPill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "#059669",
    background: "#d1fae5",
    borderRadius: 20,
    padding: "3px 8px",
    marginLeft: "auto",
  };

  return (
    <div className="page" style={{ maxWidth: 680 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Map style={{ width: 20, height: 20, color: "white" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>New Grand Plan</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 3 }}>Combine your tools into a single client-facing document</p>
        </div>
      </div>

      {/* ── Basics ── */}
      <div style={card}>
        <div style={cardPad}>
          <label style={label}>Client</label>
          <select style={select} value={clientId} onChange={(e) => {
            setClientId(e.target.value);
            setSelectedProposal(""); setSelectedKwResearch(""); setSelectedContentStrategy(""); setSelectedMediaPlan("");
          }}>
            <option value="">No client (standalone)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label style={{ ...label, marginTop: 16 }}>Title</label>
          <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Acme Co — Go-to-Market Plan 2026" />

          <label style={{ ...label, marginTop: 16 }}>Purpose</label>
          <div style={{ display: "flex", gap: 6 }}>
            {(["pitch", "onboarding", "strategy_refresh"] as const).map((p) => (
              <button key={p} onClick={() => setPurpose(p)} style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: `1px solid ${purpose === p ? "var(--accent)" : "var(--border)"}`,
                background: purpose === p ? "var(--accent-bg)" : "transparent",
                color: purpose === p ? "var(--accent)" : "var(--text-3)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}>
                {p === "pitch" ? "Pitch" : p === "onboarding" ? "Onboarding" : "Strategy Refresh"}
              </button>
            ))}
          </div>

          <label style={{ ...label, marginTop: 16 }}>Client Brief <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span></label>
          <textarea
            style={{ ...input, minHeight: 72, resize: "vertical" }}
            value={clientBrief}
            onChange={(e) => setClientBrief(e.target.value)}
            placeholder="Any specific context, goals, or pain points the AI should know about..."
          />
        </div>
      </div>

      {/* ── Section heading ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 10px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Section Inputs</h2>
        <span style={{ fontSize: 12, color: "var(--text-4)" }}>Link existing records or brief the AI to auto-generate</span>
      </div>

      {loadingSources && clientId ? (
        <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Discovering available records...
        </div>
      ) : (
        <>
          {/* ── Keyword Research ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SearchIcon style={{ width: 13, height: 13, color: "var(--text-3)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Keyword Research</div>
                {clientId && sources ? (
                  <select
                    style={{ ...select, fontSize: 12, padding: "4px 8px", marginTop: 4, maxWidth: "100%" }}
                    value={selectedKwResearch}
                    onChange={(e) => setSelectedKwResearch(e.target.value)}
                  >
                    <option value="">Auto-generate from brief</option>
                    {sources.keywordResearch.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>Brief below to auto-generate</div>
                )}
              </div>
              {selectedKwResearch
                ? <span style={linkedPill}><LinkIcon style={{ width: 10, height: 10 }} /> Linked</span>
                : <span style={aiPill}><Sparkles style={{ width: 10, height: 10 }} /> AI</span>
              }
            </div>
            {!selectedKwResearch && (
              <div style={briefPanel}>
                <div>
                  <label style={fieldLabel}>Website URL</label>
                  <input style={fieldInput} value={kwWebsite} onChange={(e) => setKwWebsite(e.target.value)} placeholder="https://example.com" />
                </div>
                <div>
                  <label style={fieldLabel}>Search Brief</label>
                  <textarea style={{ ...fieldInput, minHeight: 64, resize: "vertical" }} value={kwBrief} onChange={(e) => setKwBrief(e.target.value)} placeholder="Describe the business, services, and campaign goals..." />
                </div>
                <div style={{ maxWidth: 200 }}>
                  <label style={fieldLabel}>Monthly Budget (£)</label>
                  <input style={fieldInput} type="text" value={kwMonthlyBudget} onChange={(e) => setKwMonthlyBudget(e.target.value)} placeholder="e.g. 5,000" />
                </div>
              </div>
            )}
          </div>

          {/* ── Content Strategy ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Calendar style={{ width: 13, height: 13, color: "var(--text-3)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Content Strategy</div>
                {clientId && sources ? (
                  <select
                    style={{ ...select, fontSize: 12, padding: "4px 8px", marginTop: 4, maxWidth: "100%" }}
                    value={selectedContentStrategy}
                    onChange={(e) => setSelectedContentStrategy(e.target.value)}
                  >
                    <option value="">Auto-generate from SEMrush</option>
                    {sources.contentStrategies.map((cs) => <option key={cs.id} value={cs.id}>{cs.title} ({cs.period})</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>Brief below to auto-generate</div>
                )}
              </div>
              {selectedContentStrategy
                ? <span style={linkedPill}><LinkIcon style={{ width: 10, height: 10 }} /> Linked</span>
                : <span style={aiPill}><Sparkles style={{ width: 10, height: 10 }} /> AI</span>
              }
            </div>
            {!selectedContentStrategy && (
              <div style={briefPanel}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
                  <div>
                    <label style={fieldLabel}>Domain</label>
                    <input style={fieldInput} value={csDomain} onChange={(e) => setCsDomain(e.target.value)} placeholder="example.com" />
                  </div>
                  <div>
                    <label style={fieldLabel}>SEMrush Database</label>
                    <select style={{ ...fieldInput, cursor: "pointer" }} value={csDatabase} onChange={(e) => setCsDatabase(e.target.value)}>
                      <option value="uk">🇬🇧 UK</option>
                      <option value="us">🇺🇸 US</option>
                      <option value="au">🇦🇺 Australia</option>
                      <option value="ca">🇨🇦 Canada</option>
                      <option value="de">🇩🇪 Germany</option>
                      <option value="fr">🇫🇷 France</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={fieldLabel}>Content Goals</label>
                  <textarea style={{ ...fieldInput, minHeight: 64, resize: "vertical" }} value={csBrief} onChange={(e) => setCsBrief(e.target.value)} placeholder="Focus areas, ideal customer profile, content topics..." />
                </div>
                <div>
                  <label style={fieldLabel}>Competitors <span style={{ fontWeight: 400 }}>(comma-separated)</span></label>
                  <input style={fieldInput} value={csCompetitors} onChange={(e) => setCsCompetitors(e.target.value)} placeholder="competitor1.com, competitor2.com" />
                </div>
              </div>
            )}
          </div>

          {/* ── Media Plan ── */}
          <div style={sectionCard}>
            <div style={sectionHeader}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BarChart3 style={{ width: 13, height: 13, color: "var(--text-3)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Media Plan</div>
                {clientId && sources ? (
                  <select
                    style={{ ...select, fontSize: 12, padding: "4px 8px", marginTop: 4, maxWidth: "100%" }}
                    value={selectedMediaPlan}
                    onChange={(e) => setSelectedMediaPlan(e.target.value)}
                  >
                    <option value="">Auto-generate from brief</option>
                    {sources.mediaPlans.map((mp) => <option key={mp.id} value={mp.id}>{mp.title} (£{mp.totalBudget.toLocaleString()})</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>Brief below to auto-generate</div>
                )}
              </div>
              {selectedMediaPlan
                ? <span style={linkedPill}><LinkIcon style={{ width: 10, height: 10 }} /> Linked</span>
                : <span style={aiPill}><Sparkles style={{ width: 10, height: 10 }} /> AI</span>
              }
            </div>
            {!selectedMediaPlan && (
              <div style={briefPanel}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10 }}>
                  <div>
                    <label style={fieldLabel}>Objective</label>
                    <select style={{ ...fieldInput, cursor: "pointer" }} value={mpObjective} onChange={(e) => setMpObjective(e.target.value)}>
                      <option value="lead_gen">Lead Generation</option>
                      <option value="brand_awareness">Brand Awareness</option>
                      <option value="ecommerce">Ecommerce</option>
                      <option value="traffic">Traffic</option>
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabel}>Total Budget (£)</label>
                    <input style={fieldInput} type="text" value={mpTotalBudget} onChange={(e) => setMpTotalBudget(e.target.value)} placeholder="e.g. 10,000" />
                  </div>
                  <div>
                    <label style={fieldLabel}>Duration (days)</label>
                    <input style={fieldInput} type="text" value={mpDuration} onChange={(e) => setMpDuration(e.target.value)} placeholder="90" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Proposal (if client has one) ── */}
          {clientId && sources && sources.proposals.length > 0 && (
            <div style={sectionCard}>
              <div style={sectionHeader}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--bg-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <FileText style={{ width: 13, height: 13, color: "var(--text-3)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Proposal</div>
                  <select
                    style={{ ...select, fontSize: 12, padding: "4px 8px", marginTop: 4, maxWidth: "100%" }}
                    value={selectedProposal}
                    onChange={(e) => setSelectedProposal(e.target.value)}
                  >
                    <option value="">None</option>
                    {sources.proposals.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                {selectedProposal && <span style={linkedPill}><LinkIcon style={{ width: 10, height: 10 }} /> Linked</span>}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Campaign Focus Periods ── */}
      <div style={{ margin: "20px 0 10px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Campaign Focus Periods</h2>
        <button className="btn btn-ghost btn-sm" style={{ gap: 4, fontSize: 12 }} onClick={addFocusPeriod}>
          <Plus style={{ width: 12, height: 12 }} /> Add Period
        </button>
      </div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={cardPad}>
          {focusPeriods.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-4)", margin: 0 }}>
              No focus periods added. The AI will generate a generic calendar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {focusPeriods.map((fp, i) => (
                <div key={i} style={{ background: "var(--bg-2)", borderRadius: 8, padding: "12px 14px", position: "relative" }}>
                  <button onClick={() => removeFocusPeriod(i)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2 }}>
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-4)", display: "block", marginBottom: 3 }}>Start</label>
                      <select style={{ ...select, fontSize: 12, padding: "6px 8px" }} value={fp.startMonth} onChange={(e) => updateFocusPeriod(i, "startMonth", parseInt(e.target.value))}>
                        {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-4)", display: "block", marginBottom: 3 }}>End</label>
                      <select style={{ ...select, fontSize: 12, padding: "6px 8px" }} value={fp.endMonth} onChange={(e) => updateFocusPeriod(i, "endMonth", parseInt(e.target.value))}>
                        {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <input style={{ ...input, fontSize: 13, marginBottom: 6 }} value={fp.label} onChange={(e) => updateFocusPeriod(i, "label", e.target.value)} placeholder="Label, e.g. Ramadan Campaign, Summer Sale" />
                  <input style={{ ...input, fontSize: 13 }} value={fp.description} onChange={(e) => updateFocusPeriod(i, "description", e.target.value)} placeholder="Brief description (optional)" />
                </div>
              ))}
            </div>
          )}
          <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: focusPeriods.length ? 10 : 8, marginBottom: 0 }}>
            Define key business periods (e.g. Ramadan, Black Friday, Summer Sale) to align the content calendar.
          </p>
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4, paddingBottom: 24 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/tools/grand-plan")} style={{ padding: "10px 18px" }}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!title || creating}
          onClick={handleCreate}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 22px" }}
        >
          {creating
            ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
            : <ChevronRight style={{ width: 14, height: 14 }} />
          }
          Create Plan
        </button>
      </div>
    </div>
  );
}
