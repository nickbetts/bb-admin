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

  // Inline brief state (shown when no existing record is linked)
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

  // Load clients
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(data.clients ?? []))
      .catch(() => {});
  }, []);

  // Load sources when client changes
  const loadSources = useCallback(async (cId: string) => {
    if (!cId) { setSources(null); return; }
    setLoadingSources(true);
    try {
      const res = await fetch(`/api/tools/grand-plan/sources?clientId=${cId}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingSources(false);
    }
  }, []);

  useEffect(() => {
    if (clientId) {
      loadSources(clientId);
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        if (!title) setTitle(`${client.name} — Go-to-Market Plan`);
        // Pre-fill inline brief fields from client data
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
            ...(!selectedKwResearch && kwWebsite ? {
              kwBrief: {
                website: kwWebsite,
                brief: kwBrief,
                monthlyBudget: kwMonthlyBudget,
              },
            } : {}),
            ...(!selectedContentStrategy && csDomain ? {
              contentBrief: {
                domain: csDomain,
                database: csDatabase,
                brief: csBrief,
                competitors: csCompetitors,
              },
            } : {}),
            ...(!selectedMediaPlan && mpTotalBudget ? {
              mediaBrief: {
                objective: mpObjective,
                totalBudget: parseFloat(mpTotalBudget) || 0,
                duration: parseInt(mpDuration) || 90,
              },
            } : {}),
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

  const sectionStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600 as const,
    color: "var(--text-2)",
    marginBottom: 6,
    display: "block" as const,
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 14,
    background: "var(--bg-input)",
    color: "var(--text)",
  };

  const selectStyle = { ...inputStyle, cursor: "pointer" as const };

  const inlineBriefStyle = {
    marginTop: 8,
    padding: "12px 14px",
    background: "var(--bg-2, #f8fafc)",
    borderRadius: 8,
    border: "1px dashed var(--border)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  };

  const smallLabelStyle = {
    fontSize: 11,
    fontWeight: 500 as const,
    color: "var(--text-3)",
    marginBottom: 3,
    display: "block" as const,
  };

  const smallInputStyle = {
    ...inputStyle,
    fontSize: 13,
    padding: "7px 10px",
  };

  const hintStyle = {
    fontSize: 11,
    color: "var(--text-4)",
    fontStyle: "italic" as const,
    margin: 0,
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Map style={{ width: 20, height: 20, color: "white" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>New Grand Plan</h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Combine your tools into a single client-facing document</p>
        </div>
      </div>

      {/* Client + basics */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Client</label>
        <select style={selectStyle} value={clientId} onChange={(e) => { setClientId(e.target.value); setSelectedProposal(""); setSelectedKwResearch(""); setSelectedContentStrategy(""); setSelectedMediaPlan(""); }}>
          <option value="">No client (standalone)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label style={{ ...labelStyle, marginTop: 16 }}>Title</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Acme Co — Go-to-Market Plan 2026" />

        <label style={{ ...labelStyle, marginTop: 16 }}>Purpose</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["pitch", "onboarding", "strategy_refresh"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPurpose(p)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: `1px solid ${purpose === p ? "var(--accent)" : "var(--border)"}`,
                background: purpose === p ? "var(--accent-bg)" : "transparent",
                color: purpose === p ? "var(--accent)" : "var(--text-3)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {p === "pitch" ? "Pitch" : p === "onboarding" ? "Onboarding" : "Strategy Refresh"}
            </button>
          ))}
        </div>

        <label style={{ ...labelStyle, marginTop: 16 }}>Client Brief (optional)</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }}
          value={clientBrief}
          onChange={(e) => setClientBrief(e.target.value)}
          placeholder="Any specific context, goals, or pain points the AI should know about..."
        />
      </div>

      {/* Section inputs */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Section Inputs</h3>
        <p style={{ fontSize: 12, color: "var(--text-4)", marginBottom: 16 }}>
          Link existing records or provide brief details for the AI to auto-generate each section.
        </p>

        {loadingSources && clientId ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-3)" }}>
            <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Discovering available records...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── Keyword Research ── */}
            <div>
              <label style={labelStyle}><SearchIcon style={{ width: 12, height: 12, display: "inline" }} /> Keyword Research</label>
              {clientId && sources ? (
                <select style={selectStyle} value={selectedKwResearch} onChange={(e) => setSelectedKwResearch(e.target.value)}>
                  <option value="">None — auto-generate from brief</option>
                  {sources.keywordResearch.map((k) => (
                    <option key={k.id} value={k.id}>{k.title}</option>
                  ))}
                </select>
              ) : null}
              {!selectedKwResearch && (
                <div style={inlineBriefStyle}>
                  <p style={hintStyle}>The AI will crawl the website and run keyword research via SEMrush.</p>
                  <div>
                    <label style={smallLabelStyle}>Website URL</label>
                    <input style={smallInputStyle} value={kwWebsite} onChange={(e) => setKwWebsite(e.target.value)} placeholder="https://example.com" />
                  </div>
                  <div>
                    <label style={smallLabelStyle}>Search Brief</label>
                    <textarea
                      style={{ ...smallInputStyle, minHeight: 60, resize: "vertical" as const }}
                      value={kwBrief} onChange={(e) => setKwBrief(e.target.value)}
                      placeholder="Describe the business, services, and campaign goals..."
                    />
                  </div>
                  <div>
                    <label style={smallLabelStyle}>Monthly Budget (£)</label>
                    <input style={{ ...smallInputStyle, maxWidth: 160 }} type="text" value={kwMonthlyBudget}
                      onChange={(e) => setKwMonthlyBudget(e.target.value)} placeholder="e.g. 5000"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Content Strategy ── */}
            <div>
              <label style={labelStyle}><Calendar style={{ width: 12, height: 12, display: "inline" }} /> Content Strategy</label>
              {clientId && sources ? (
                <select style={selectStyle} value={selectedContentStrategy} onChange={(e) => setSelectedContentStrategy(e.target.value)}>
                  <option value="">None — auto-generate from SEMrush</option>
                  {sources.contentStrategies.map((cs) => (
                    <option key={cs.id} value={cs.id}>{cs.title} ({cs.period})</option>
                  ))}
                </select>
              ) : null}
              {!selectedContentStrategy && (
                <div style={inlineBriefStyle}>
                  <p style={hintStyle}>The AI will analyse the domain via SEMrush and generate a full content strategy.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={smallLabelStyle}>Domain</label>
                      <input style={smallInputStyle} value={csDomain} onChange={(e) => setCsDomain(e.target.value)} placeholder="example.com" />
                    </div>
                    <div>
                      <label style={smallLabelStyle}>SEMrush Database</label>
                      <select style={{ ...smallInputStyle, cursor: "pointer" }} value={csDatabase} onChange={(e) => setCsDatabase(e.target.value)}>
                        <option value="uk">UK</option>
                        <option value="us">US</option>
                        <option value="au">Australia</option>
                        <option value="ca">Canada</option>
                        <option value="de">Germany</option>
                        <option value="fr">France</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={smallLabelStyle}>Content Goals</label>
                    <textarea
                      style={{ ...smallInputStyle, minHeight: 60, resize: "vertical" as const }}
                      value={csBrief} onChange={(e) => setCsBrief(e.target.value)}
                      placeholder="Focus areas, ideal customer profile, content topics..."
                    />
                  </div>
                  <div>
                    <label style={smallLabelStyle}>Competitors (comma-separated)</label>
                    <input style={smallInputStyle} value={csCompetitors} onChange={(e) => setCsCompetitors(e.target.value)}
                      placeholder="competitor1.com, competitor2.com"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Media Plan ── */}
            <div>
              <label style={labelStyle}><BarChart3 style={{ width: 12, height: 12, display: "inline" }} /> Media Plan</label>
              {clientId && sources ? (
                <select style={selectStyle} value={selectedMediaPlan} onChange={(e) => setSelectedMediaPlan(e.target.value)}>
                  <option value="">None — auto-generate from brief</option>
                  {sources.mediaPlans.map((mp) => (
                    <option key={mp.id} value={mp.id}>{mp.title} (£{mp.totalBudget.toLocaleString()})</option>
                  ))}
                </select>
              ) : null}
              {!selectedMediaPlan && (
                <div style={inlineBriefStyle}>
                  <p style={hintStyle}>The AI will generate a channel allocation and media plan.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={smallLabelStyle}>Objective</label>
                      <select style={{ ...smallInputStyle, cursor: "pointer" }} value={mpObjective} onChange={(e) => setMpObjective(e.target.value)}>
                        <option value="brand_awareness">Brand Awareness</option>
                        <option value="lead_gen">Lead Generation</option>
                        <option value="ecommerce">Ecommerce</option>
                        <option value="traffic">Traffic</option>
                      </select>
                    </div>
                    <div>
                      <label style={smallLabelStyle}>Total Budget (£)</label>
                      <input style={smallInputStyle} type="text" value={mpTotalBudget}
                        onChange={(e) => setMpTotalBudget(e.target.value)} placeholder="e.g. 10000"
                      />
                    </div>
                    <div>
                      <label style={smallLabelStyle}>Duration (days)</label>
                      <input style={smallInputStyle} type="text" value={mpDuration}
                        onChange={(e) => setMpDuration(e.target.value)} placeholder="90"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Proposal (dropdown only — derives from keyword research) ── */}
            {clientId && sources && sources.proposals.length > 0 && (
              <div>
                <label style={labelStyle}><FileText style={{ width: 12, height: 12, display: "inline" }} /> Proposal</label>
                <select style={selectStyle} value={selectedProposal} onChange={(e) => setSelectedProposal(e.target.value)}>
                  <option value="">None</option>
                  {sources.proposals.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign focus periods */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>Campaign Focus Periods</h3>
          <button className="btn btn-ghost btn-sm" style={{ gap: 4 }} onClick={addFocusPeriod}>
            <Plus style={{ width: 12, height: 12 }} /> Add Period
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-4)", marginBottom: 12 }}>
          Define key business periods (e.g. Ramadan, Black Friday, Summer Sale) to align the content calendar.
        </p>

        {focusPeriods.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-4)", fontStyle: "italic" }}>No focus periods added. The AI will generate a generic calendar.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {focusPeriods.map((fp, i) => (
              <div key={i} style={{ background: "var(--bg-2)", borderRadius: 8, padding: 12, position: "relative" }}>
                <button
                  onClick={() => removeFocusPeriod(i)}
                  style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-4)" }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-4)", display: "block", marginBottom: 4 }}>Start</label>
                    <select style={{ ...selectStyle, fontSize: 12 }} value={fp.startMonth} onChange={(e) => updateFocusPeriod(i, "startMonth", parseInt(e.target.value))}>
                      {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-4)", display: "block", marginBottom: 4 }}>End</label>
                    <select style={{ ...selectStyle, fontSize: 12 }} value={fp.endMonth} onChange={(e) => updateFocusPeriod(i, "endMonth", parseInt(e.target.value))}>
                      {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <input
                  style={{ ...inputStyle, fontSize: 12, marginBottom: 6 }}
                  value={fp.label}
                  onChange={(e) => updateFocusPeriod(i, "label", e.target.value)}
                  placeholder="e.g. Ramadan Campaign, Summer Sale"
                />
                <input
                  style={{ ...inputStyle, fontSize: 12 }}
                  value={fp.description}
                  onChange={(e) => updateFocusPeriod(i, "description", e.target.value)}
                  placeholder="Brief description (optional)"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/tools/grand-plan")} style={{ padding: "10px 20px" }}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!title || creating}
          onClick={handleCreate}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
          }}
        >
          {creating ? (
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : (
            <ChevronRight style={{ width: 14, height: 14 }} />
          )}
          Create Plan
        </button>
      </div>
    </div>
  );
}
