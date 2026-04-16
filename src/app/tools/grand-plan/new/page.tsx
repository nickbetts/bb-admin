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
  Plus,
  X,
  Sparkles,
  Link as LinkIcon,
  Globe,
  Layout,
  Check,
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

const SECTORS = [
  { value: "dental", label: "Dental Practices" },
  { value: "ecommerce", label: "Ecommerce & DTC" },
  { value: "industrial", label: "Industrial & Manufacturing" },
  { value: "charities", label: "Charities & Non-Profits" },
  { value: "healthcare", label: "Private Healthcare" },
  { value: "hospitality", label: "Hospitality & Events" },
  { value: "professional_services", label: "Professional Services" },
  { value: "saas", label: "SaaS & Technology" },
  { value: "education", label: "Education & Training" },
  { value: "other", label: "Other" },
];

export default function NewGrandPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  // Core
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState<"pitch" | "onboarding" | "strategy_refresh">("pitch");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [brief, setBrief] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");

  // Linked sources
  const [sources, setSources] = useState<AvailableSources | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState("");
  const [selectedKwResearch, setSelectedKwResearch] = useState("");
  const [selectedContentStrategy, setSelectedContentStrategy] = useState("");

  // Content strategy extras
  const [csDatabase, setCsDatabase] = useState("uk");
  const [csCompetitors, setCsCompetitors] = useState("");

  // Landing page
  const [generateLandingPage, setGenerateLandingPage] = useState(true);
  const [lpCampaignType, setLpCampaignType] = useState("lead-gen");

  // Focus periods
  const [focusPeriods, setFocusPeriods] = useState<FocusPeriod[]>([]);

  // UI
  const [creating, setCreating] = useState(false);

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
        if (client.website && !website) setWebsite(client.website);
      }
    }
  }, [clientId, clients, loadSources, title, website]);

  function addFocusPeriod() {
    setFocusPeriods((prev) => [
      ...prev,
      { startMonth: new Date().getMonth(), endMonth: new Date().getMonth() + 2, label: "", description: "" },
    ]);
  }

  function removeFocusPeriod(index: number) {
    setFocusPeriods((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFocusPeriod(index: number, field: keyof FocusPeriod, value: string | number) {
    setFocusPeriods((prev) => prev.map((fp, i) => (i === index ? { ...fp, [field]: value } : fp)));
  }

  const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

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
          clientBrief: brief || undefined,
          sector: sector || undefined,
          campaignFocusPeriods: focusPeriods.filter((fp) => fp.label),
          config: {
            ...(sector ? { sector } : {}),
            ...(!selectedKwResearch && website ? { kwBrief: { website, brief, monthlyBudget } } : {}),
            ...(!selectedContentStrategy && domain ? { contentBrief: { domain, database: csDatabase, brief, competitors: csCompetitors } } : {}),
            ...(generateLandingPage && website ? { lpBrief: { campaignType: lpCampaignType } } : {}),
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

  const hasLinkedKw = !!selectedKwResearch;
  const hasLinkedCs = !!selectedContentStrategy;

  return (
    <div className="page" style={{ maxWidth: 640, padding: "24px 16px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Map style={{ width: 18, height: 18, color: "white" }} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>New Grand Plan</h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-3)", marginLeft: 46 }}>
          One brief, every deliverable. Keywords, ads, content, a landing page, and a full strategy document.
        </p>
      </div>

      {/* ═══════ THE BRIEF ═══════ */}
      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend style={S.legend}>The Brief</legend>

        <div style={S.card}>
          {/* Client + Title row */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12 }}>
            <div>
              <label style={S.label}>Client</label>
              <select style={S.select} value={clientId} onChange={(e) => {
                setClientId(e.target.value);
                setSelectedProposal(""); setSelectedKwResearch(""); setSelectedContentStrategy("");
              }}>
                <option value="">No client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Plan Title</label>
              <input style={S.input} value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Acme Co — Go-to-Market Plan 2026" />
            </div>
          </div>

          {/* Website + Budget row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
            <div>
              <label style={S.label}>
                <Globe style={{ width: 12, height: 12, marginRight: 4, verticalAlign: -1 }} />
                Website
              </label>
              <input style={S.input} value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com" />
              <span style={S.hint}>Used for keyword research, content strategy, brand extraction, and landing page</span>
            </div>
            <div>
              <label style={S.label}>Monthly Budget</label>
              <input style={S.input} value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="£5,000" />
            </div>
          </div>

          {/* Purpose + Sector row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={S.label}>Purpose</label>
              <div style={{ display: "flex", gap: 4 }}>
                {(["pitch", "onboarding", "strategy_refresh"] as const).map((p) => (
                  <button key={p} onClick={() => setPurpose(p)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${purpose === p ? "var(--accent)" : "var(--border)"}`,
                    background: purpose === p ? "var(--accent)" : "transparent",
                    color: purpose === p ? "white" : "var(--text-3)", cursor: "pointer",
                    transition: "all 0.15s",
                  }}>
                    {p === "pitch" ? "Pitch" : p === "onboarding" ? "Onboarding" : "Refresh"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Sector</label>
              <select style={S.select} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Select...</option>
                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Brief */}
          <div>
            <label style={S.label}>Brief</label>
            <textarea
              style={{ ...S.input, minHeight: 80, resize: "vertical" }}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe the business, their goals, campaign focus, and any pain points. This single brief powers keywords, ads, content, and the landing page."
            />
          </div>
        </div>
      </fieldset>

      {/* ═══════ LINK EXISTING (only when client selected) ═══════ */}
      {clientId && (
        <fieldset style={{ border: "none", padding: 0, margin: "24px 0 0" }}>
          <legend style={S.legend}>
            Link Existing Records <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: "0" }}>(optional)</span>
          </legend>

          {loadingSources ? (
            <div style={{ padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-4)", fontSize: 13 }}>
              <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Loading records...
            </div>
          ) : sources ? (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {/* Keyword Research */}
              {sources.keywordResearch.length > 0 && (
                <div style={S.linkRow}>
                  <SearchIcon style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                  <span style={S.linkLabel}>Keywords</span>
                  <select style={S.linkSelect} value={selectedKwResearch} onChange={(e) => setSelectedKwResearch(e.target.value)}>
                    <option value="">Generate fresh from brief</option>
                    {sources.keywordResearch.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
                  </select>
                  {selectedKwResearch && <span style={S.linkedBadge}><LinkIcon style={{ width: 9, height: 9 }} /> Linked</span>}
                </div>
              )}

              {/* Content Strategy */}
              {sources.contentStrategies.length > 0 && (
                <div style={S.linkRow}>
                  <Calendar style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                  <span style={S.linkLabel}>Content</span>
                  <select style={S.linkSelect} value={selectedContentStrategy} onChange={(e) => setSelectedContentStrategy(e.target.value)}>
                    <option value="">Generate fresh from SEMrush</option>
                    {sources.contentStrategies.map((cs) => <option key={cs.id} value={cs.id}>{cs.title}</option>)}
                  </select>
                  {selectedContentStrategy && <span style={S.linkedBadge}><LinkIcon style={{ width: 9, height: 9 }} /> Linked</span>}
                </div>
              )}

              {/* Proposal */}
              {sources.proposals.length > 0 && (
                <div style={{ ...S.linkRow, borderBottom: "none" }}>
                  <FileText style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                  <span style={S.linkLabel}>Proposal</span>
                  <select style={S.linkSelect} value={selectedProposal} onChange={(e) => setSelectedProposal(e.target.value)}>
                    <option value="">None</option>
                    {sources.proposals.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  {selectedProposal && <span style={S.linkedBadge}><LinkIcon style={{ width: 9, height: 9 }} /> Linked</span>}
                </div>
              )}

              {sources.keywordResearch.length === 0 && sources.contentStrategies.length === 0 && sources.proposals.length === 0 && (
                <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--text-4)" }}>
                  No existing records found. Everything will be auto-generated.
                </div>
              )}
            </div>
          ) : null}
        </fieldset>
      )}

      {/* ═══════ EXTRAS ═══════ */}
      <fieldset style={{ border: "none", padding: 0, margin: "24px 0 0" }}>
        <legend style={S.legend}>Extras</legend>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {/* Content strategy settings */}
          {!hasLinkedCs && (
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 8 }}>Content Strategy Settings</div>
              <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10 }}>
                <div>
                  <label style={S.hintLabel}>SEMrush Region</label>
                  <select style={S.linkSelect} value={csDatabase} onChange={(e) => setCsDatabase(e.target.value)}>
                    <option value="uk">🇬🇧 UK</option>
                    <option value="us">🇺🇸 US</option>
                    <option value="au">🇦🇺 Australia</option>
                    <option value="ca">🇨🇦 Canada</option>
                    <option value="de">🇩🇪 Germany</option>
                    <option value="fr">🇫🇷 France</option>
                  </select>
                </div>
                <div>
                  <label style={S.hintLabel}>Competitors <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(comma-separated)</span></label>
                  <input style={{ ...S.input, fontSize: 12, padding: "6px 10px" }} value={csCompetitors}
                    onChange={(e) => setCsCompetitors(e.target.value)}
                    placeholder="competitor1.com, competitor2.com" />
                </div>
              </div>
            </div>
          )}

          {/* Landing page toggle */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setGenerateLandingPage(!generateLandingPage)}
              style={{
                width: 20, height: 20, borderRadius: 6,
                border: `1.5px solid ${generateLandingPage ? "var(--accent)" : "var(--border)"}`,
                background: generateLandingPage ? "var(--accent)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
              }}
            >
              {generateLandingPage && <Check style={{ width: 12, height: 12, color: "white" }} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                <Layout style={{ width: 13, height: 13, color: "var(--text-3)" }} />
                Generate Example Landing Page
              </div>
              <div style={{ fontSize: 12, color: "var(--text-4)", marginTop: 2 }}>
                Auto-generates a real, branded landing page from the website. Included as a live preview in the plan.
              </div>
            </div>
            {generateLandingPage && (
              <select style={{ ...S.select, width: "auto", fontSize: 12, padding: "5px 10px" }}
                value={lpCampaignType} onChange={(e) => setLpCampaignType(e.target.value)}>
                <option value="lead-gen">Lead Gen</option>
                <option value="event">Event</option>
                <option value="service">Service</option>
                <option value="product-launch">Product Launch</option>
                <option value="ecommerce">Ecommerce</option>
              </select>
            )}
          </div>

          {/* Focus periods */}
          <div style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: focusPeriods.length > 0 ? 10 : 0 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>Campaign Focus Periods</div>
                <div style={{ fontSize: 11, color: "var(--text-4)", marginTop: 1 }}>Ramadan, Black Friday, seasonal peaks</div>
              </div>
              <button onClick={addFocusPeriod} style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>
                <Plus style={{ width: 11, height: 11 }} /> Add
              </button>
            </div>
            {focusPeriods.map((fp, i) => (
              <div key={i} style={{
                background: "var(--bg-2, #f8fafc)", borderRadius: 8, padding: 12,
                marginBottom: 8, position: "relative",
              }}>
                <button onClick={() => removeFocusPeriod(i)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", padding: 2 }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8 }}>
                  <select style={S.linkSelect} value={fp.startMonth}
                    onChange={(e) => updateFocusPeriod(i, "startMonth", parseInt(e.target.value))}>
                    {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                  </select>
                  <select style={S.linkSelect} value={fp.endMonth}
                    onChange={(e) => updateFocusPeriod(i, "endMonth", parseInt(e.target.value))}>
                    {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                  </select>
                  <input style={{ ...S.input, fontSize: 12, padding: "5px 8px" }} value={fp.label}
                    onChange={(e) => updateFocusPeriod(i, "label", e.target.value)}
                    placeholder="e.g. Ramadan, Summer Sale" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      {/* ═══════ WHAT GETS GENERATED ═══════ */}
      <div style={{
        margin: "24px 0", padding: "14px 18px",
        background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)", marginBottom: 8 }}>
          What gets generated
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            { label: "Executive Summary", ai: true },
            { label: "Strategy Plan", ai: true },
            { label: "Google Ads + Ad Copy", ai: !hasLinkedKw },
            { label: "Keyword Research", ai: !hasLinkedKw },
            { label: "Meta Campaigns", ai: true },
            { label: "Content Strategy", ai: !hasLinkedCs },
            { label: "Content Calendar", ai: true },
            { label: "Organic Social", ai: true },
            { label: "Example Articles", ai: true },
            ...(generateLandingPage ? [{ label: "Landing Page", ai: true }] : []),
          ].map((item) => (
            <span key={item.label} style={{
              padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
              background: item.ai ? "var(--accent-bg, #f1f5f9)" : "#d1fae5",
              color: item.ai ? "var(--accent, #0f172a)" : "#059669",
            }}>
              {item.ai
                ? <Sparkles style={{ width: 9, height: 9, marginRight: 3, verticalAlign: -1 }} />
                : <LinkIcon style={{ width: 9, height: 9, marginRight: 3, verticalAlign: -1 }} />}
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════ ACTIONS ═══════ */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingBottom: 32 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/tools/grand-plan")}
          style={{ padding: "10px 18px" }}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!title || creating}
          onClick={handleCreate}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px" }}
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

// ─── Shared inline styles ────────────────────────────────────────────────────

const S = {
  legend: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.5px",
    color: "var(--text-3)", marginBottom: 12,
  } as React.CSSProperties,
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12,
    padding: "20px 22px", display: "flex", flexDirection: "column" as const, gap: 16,
  } as React.CSSProperties,
  label: {
    fontSize: 12, fontWeight: 600, color: "var(--text-2)",
    marginBottom: 5, display: "block",
  } as React.CSSProperties,
  hintLabel: {
    fontSize: 11, fontWeight: 600, color: "var(--text-3)",
    marginBottom: 4, display: "block",
  } as React.CSSProperties,
  input: {
    width: "100%", padding: "8px 11px",
    border: "1px solid var(--border)", borderRadius: 8,
    fontSize: 13, background: "var(--bg-input)", color: "var(--text)", outline: "none",
  } as React.CSSProperties,
  select: {
    width: "100%", padding: "8px 11px",
    border: "1px solid var(--border)", borderRadius: 8,
    fontSize: 13, background: "var(--bg-input)", color: "var(--text)", outline: "none",
    cursor: "pointer",
  } as React.CSSProperties,
  hint: {
    fontSize: 11, color: "var(--text-4)", marginTop: 3, display: "block",
  } as React.CSSProperties,
  linkRow: {
    padding: "12px 20px", borderBottom: "1px solid var(--border)",
    display: "flex", alignItems: "center", gap: 10,
  } as React.CSSProperties,
  linkLabel: {
    fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 100,
  } as React.CSSProperties,
  linkSelect: {
    flex: 1, padding: "6px 10px",
    border: "1px solid var(--border)", borderRadius: 8,
    fontSize: 12, background: "var(--bg-input)", color: "var(--text)", outline: "none",
    cursor: "pointer",
  } as React.CSSProperties,
  linkedBadge: {
    display: "inline-flex", alignItems: "center", gap: 3,
    fontSize: 11, fontWeight: 600, color: "#059669", background: "#d1fae5",
    borderRadius: 12, padding: "2px 8px", flexShrink: 0,
  } as React.CSSProperties,
};
