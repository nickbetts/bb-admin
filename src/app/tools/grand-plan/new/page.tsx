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

// Platform options. Each platform maps to one or more generator section
// keys (see src/lib/grand-plan-generator.ts:282-293). Always-on sections
// like Executive Summary, Strategy Plan, Audiences, Content Calendar,
// Competitor Intel, Example Articles and Media Plan are added separately
// regardless of platform selection.
type PlatformId = "googleAds" | "metaAds" | "linkedInAds" | "organicSocial" | "emailMarketing";

const PLATFORMS: { id: PlatformId; label: string; description: string; sections: string[] }[] = [
  { id: "googleAds", label: "Google Ads", description: "Search campaigns, RSA ad copy", sections: ["googleAdsCampaigns"] },
  { id: "metaAds", label: "Meta Ads", description: "Facebook & Instagram audience-led campaigns", sections: ["metaCampaigns"] },
  { id: "linkedInAds", label: "LinkedIn Ads", description: "B2B targeting and ad mockups", sections: ["linkedInAds"] },
  { id: "organicSocial", label: "Organic Social", description: "Content pillars and posting cadence", sections: ["organicSocial"] },
  { id: "emailMarketing", label: "Email Marketing", description: "Lifecycle and nurture flows", sections: ["emailMarketing"] },
];

// Sections that should always run (independent of platform selection).
const ALWAYS_ON_SECTIONS = [
  "executiveSummary",
  "strategyPlan",
  "audiences",
  "contentCalendar",
  "exampleArticles",
  "competitorIntel",
  "contentStrategy",
  "keywordResearch",
  "servicesInvestment",
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
  const [channelBudgets, setChannelBudgets] = useState<Record<string, string>>({});

  // Linked sources
  const [sources, setSources] = useState<AvailableSources | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState("");
  const [selectedKwResearch, setSelectedKwResearch] = useState("");
  const [selectedContentStrategy, setSelectedContentStrategy] = useState("");

  // Content strategy extras
  const [csDatabase, setCsDatabase] = useState("uk");
  const [csCompetitors, setCsCompetitors] = useState("");

  // Target audiences
  const [targetAudiences, setTargetAudiences] = useState("");

  // Content volume — drives the calendar and organic social cadence
  const [postsPerMonth, setPostsPerMonth] = useState(4);
  const [socialPostsPerWeek, setSocialPostsPerWeek] = useState(3);

  // Platforms — controls which paid/organic channels the AI focuses on
  const [platforms, setPlatforms] = useState<PlatformId[]>(["googleAds", "metaAds", "linkedInAds", "organicSocial", "emailMarketing"]);

  function togglePlatform(id: PlatformId) {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  // Focus periods
  const [focusPeriods, setFocusPeriods] = useState<FocusPeriod[]>([]);

  // UI
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : data.clients ?? []))
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
      // Build the section enable list from selected platforms + always-on
      // sections, so the generator knows exactly what to produce.
      const platformSections = platforms.flatMap(
        (id) => PLATFORMS.find((p) => p.id === id)?.sections ?? [],
      );
      const enabledSections = Array.from(new Set([...ALWAYS_ON_SECTIONS, ...platformSections]));

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
          targetAudiences: targetAudiences || undefined,
          sector: sector || undefined,
          campaignFocusPeriods: focusPeriods.filter((fp) => fp.label),
          config: {
            sections: enabledSections,
            postsPerMonth,
            socialPostsPerWeek,
            ...(sector ? { sector } : {}),
            ...(!selectedKwResearch && website ? { kwBrief: { website, brief, monthlyBudget: channelBudgets.googleAds || monthlyBudget } } : {}),
            ...(!selectedContentStrategy && domain ? { contentBrief: { domain, database: csDatabase, brief, competitors: csCompetitors } } : {}),
            ...(Object.keys(channelBudgets).length > 0 ? { channelBudgets: Object.fromEntries(
              Object.entries(channelBudgets).filter(([, v]) => v && Number(v.replace(/[^0-9.]/g, "")) > 0)
                .map(([k, v]) => [k, Number(v.replace(/[^0-9.]/g, ""))])
            ) } : {}),
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
    <div className="page" style={{ maxWidth: 720 }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "var(--r-sm)",
            background: "var(--gradient-accent)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Map style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <h1 className="page-title">New Grand Plan</h1>
        </div>
        <p className="page-desc" style={{ marginLeft: 52 }}>
          One brief, every deliverable. Keywords, ads, content, a landing page, and a full strategy document.
        </p>
      </div>

      {/* ═══════ THE BRIEF ═══════ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)", marginBottom: 12 }}>
          The Brief
        </div>

        <div className="card">
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Client + Title row */}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
              <div>
                <label className="form-label">Client</label>
                <select className="form-input form-select" value={clientId} onChange={(e) => {
                  setClientId(e.target.value);
                  setSelectedProposal(""); setSelectedKwResearch(""); setSelectedContentStrategy("");
                }}>
                  <option value="">No client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Plan Title</label>
                <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Acme Co — Go-to-Market Plan 2026" />
              </div>
            </div>

            {/* Website + Budget row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 16 }}>
              <div>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Globe style={{ width: 13, height: 13 }} />
                  Website
                </label>
                <input className="form-input" value={website} onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com" />
                <span className="form-hint">Used for keyword research, content strategy, brand extraction, and landing page</span>
              </div>
              <div>
                <label className="form-label">Monthly Budget</label>
                <input className="form-input" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="£5,000" />
              </div>
            </div>

            {/* Purpose + Sector row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="form-label">Purpose</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["pitch", "onboarding", "strategy_refresh"] as const).map((p) => (
                    <button key={p} onClick={() => setPurpose(p)} style={{
                      flex: 1, padding: "9px 0", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 600,
                      border: `1.5px solid ${purpose === p ? "var(--accent)" : "var(--border)"}`,
                      background: purpose === p ? "var(--gradient-accent)" : "transparent",
                      color: purpose === p ? "white" : "var(--text-3)", cursor: "pointer",
                      transition: "all 0.2s",
                    }}>
                      {p === "pitch" ? "Pitch" : p === "onboarding" ? "Onboarding" : "Refresh"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="form-label">Sector</label>
                <select className="form-input form-select" value={sector} onChange={(e) => setSector(e.target.value)}>
                  <option value="">Select...</option>
                  {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Brief */}
            <div>
              <label className="form-label">Brief</label>
              <textarea
                className="form-input form-textarea"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe the business, their goals, campaign focus, and any pain points. This single brief powers keywords, ads, content, and the landing page."
              />
            </div>

            {/* Target Audiences */}
            <div>
              <label className="form-label">Target Audiences</label>
              <textarea
                className="form-input form-textarea"
                value={targetAudiences}
                onChange={(e) => setTargetAudiences(e.target.value)}
                placeholder={"One per line — Name: Description\ne.g. Parents aged 30–45: looking for holiday football camps\nSchool PE coordinators: sourcing group coaching sessions"}
                style={{ minHeight: 80 }}
              />
              <span className="form-hint">One audience per line. When filled in, the plan uses your exact personas rather than inferring them — and earns a stronger data grounding badge.</span>
            </div>

            {/* Content Volume */}
            <div>
              <label className="form-label">Content Volume</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={20}
                    value={postsPerMonth}
                    onChange={(e) => setPostsPerMonth(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <span className="form-hint">Blog posts per month</span>
                </div>
                <div>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={14}
                    value={socialPostsPerWeek}
                    onChange={(e) => setSocialPostsPerWeek(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <span className="form-hint">Social posts per week</span>
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <label className="form-label">Platforms</label>
              <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10, marginTop: -4 }}>
                Choose which channels the plan should focus on. Sections for unselected platforms are skipped.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {PLATFORMS.map((p) => {
                  const checked = platforms.includes(p.id);
                  const isPaid = p.id === "googleAds" || p.id === "metaAds" || p.id === "linkedInAds";
                  return (
                    <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "12px 14px",
                          borderRadius: "var(--r-sm)",
                          border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                          background: checked ? "var(--accent-bg)" : "var(--white, #fff)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                            background: checked ? "var(--accent)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {checked && <Check style={{ width: 11, height: 11, color: "white" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{p.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{p.description}</div>
                        </div>
                      </button>
                      {isPaid && checked && (
                        <div style={{ paddingLeft: 2 }}>
                          <input
                            className="form-input"
                            style={{ fontSize: 12, padding: "6px 10px" }}
                            value={channelBudgets[p.id] ?? ""}
                            onChange={(e) => setChannelBudgets((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder="Monthly budget e.g. £500"
                          />
                          <span className="form-hint" style={{ fontSize: 11 }}>
                            Budget shapes the number of campaigns and ad groups the AI will plan
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ LINK EXISTING (only when client selected) ═══════ */}
      {clientId && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)", marginBottom: 12 }}>
            Link Existing Records <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: "0" }}>(optional)</span>
          </div>

          {loadingSources ? (
            <div style={{ padding: "20px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--text-4)", fontSize: 13 }}>
              <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> Loading records...
            </div>
          ) : sources ? (
            <div className="card">
              {/* Keyword Research */}
              {sources.keywordResearch.length > 0 && (
                <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <SearchIcon style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 100 }}>Keywords</span>
                  <select className="form-input form-select" style={{ flex: 1, padding: "8px 12px", fontSize: 13 }} value={selectedKwResearch} onChange={(e) => setSelectedKwResearch(e.target.value)}>
                    <option value="">Generate fresh from brief</option>
                    {sources.keywordResearch.map((k) => <option key={k.id} value={k.id}>{k.title}</option>)}
                  </select>
                  {selectedKwResearch && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#059669", background: "#d1fae5", borderRadius: 12, padding: "2px 8px", flexShrink: 0 }}><LinkIcon style={{ width: 9, height: 9 }} /> Linked</span>}
                </div>
              )}

              {/* Content Strategy */}
              {sources.contentStrategies.length > 0 && (
                <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <Calendar style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 100 }}>Content</span>
                  <select className="form-input form-select" style={{ flex: 1, padding: "8px 12px", fontSize: 13 }} value={selectedContentStrategy} onChange={(e) => setSelectedContentStrategy(e.target.value)}>
                    <option value="">Generate fresh from SEMrush</option>
                    {sources.contentStrategies.map((cs) => <option key={cs.id} value={cs.id}>{cs.title}</option>)}
                  </select>
                  {selectedContentStrategy && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#059669", background: "#d1fae5", borderRadius: 12, padding: "2px 8px", flexShrink: 0 }}><LinkIcon style={{ width: 9, height: 9 }} /> Linked</span>}
                </div>
              )}

              {/* Proposal */}
              {sources.proposals.length > 0 && (
                <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                  <FileText style={{ width: 14, height: 14, color: "var(--text-3)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 100 }}>Proposal</span>
                  <select className="form-input form-select" style={{ flex: 1, padding: "8px 12px", fontSize: 13 }} value={selectedProposal} onChange={(e) => setSelectedProposal(e.target.value)}>
                    <option value="">None</option>
                    {sources.proposals.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  {selectedProposal && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#059669", background: "#d1fae5", borderRadius: 12, padding: "2px 8px", flexShrink: 0 }}><LinkIcon style={{ width: 9, height: 9 }} /> Linked</span>}
                </div>
              )}

              {sources.keywordResearch.length === 0 && sources.contentStrategies.length === 0 && sources.proposals.length === 0 && (
                <div className="card-body" style={{ padding: "20px 24px", fontSize: 13, color: "var(--text-4)" }}>
                  No existing records found. Everything will be auto-generated.
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ═══════ EXTRAS ═══════ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)", marginBottom: 12 }}>
          Extras
        </div>

        <div className="card">
          {/* Content strategy settings */}
          {!hasLinkedCs && (
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", marginBottom: 10 }}>Content Strategy Settings</div>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>SEMrush Region</label>
                  <select className="form-input form-select" style={{ padding: "8px 12px", fontSize: 13 }} value={csDatabase} onChange={(e) => setCsDatabase(e.target.value)}>
                    <option value="uk">🇬🇧 UK</option>
                    <option value="us">🇺🇸 US</option>
                    <option value="au">🇦🇺 Australia</option>
                    <option value="ca">🇨🇦 Canada</option>
                    <option value="de">🇩🇪 Germany</option>
                    <option value="fr">🇫🇷 France</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 12 }}>
                    Competitors <span style={{ fontWeight: 400, color: "var(--text-3)" }}>(comma-separated)</span>
                  </label>
                  <input className="form-input" style={{ padding: "8px 12px", fontSize: 13 }} value={csCompetitors}
                    onChange={(e) => setCsCompetitors(e.target.value)}
                    placeholder="competitor1.com, competitor2.com" />
                </div>
              </div>
            </div>
          )}

          {/* Focus periods */}
          <div style={{ padding: "18px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: focusPeriods.length > 0 ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Campaign Focus Periods</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Ramadan, Black Friday, seasonal peaks</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addFocusPeriod}>
                <Plus style={{ width: 12, height: 12 }} /> Add
              </button>
            </div>
            {focusPeriods.map((fp, i) => (
              <div key={i} style={{
                background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 14,
                marginBottom: 8, position: "relative",
              }}>
                <button onClick={() => removeFocusPeriod(i)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2 }}>
                  <X style={{ width: 13, height: 13 }} />
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10 }}>
                  <select className="form-input form-select" style={{ padding: "8px 12px", fontSize: 13 }} value={fp.startMonth}
                    onChange={(e) => updateFocusPeriod(i, "startMonth", parseInt(e.target.value))}>
                    {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                  </select>
                  <select className="form-input form-select" style={{ padding: "8px 12px", fontSize: 13 }} value={fp.endMonth}
                    onChange={(e) => updateFocusPeriod(i, "endMonth", parseInt(e.target.value))}>
                    {MONTHS.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                  </select>
                  <input className="form-input" style={{ padding: "8px 12px", fontSize: 13 }} value={fp.label}
                    onChange={(e) => updateFocusPeriod(i, "label", e.target.value)}
                    placeholder="e.g. Ramadan, Summer Sale" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ WHAT GETS GENERATED ═══════ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)", marginBottom: 10 }}>
            What gets generated
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Executive Summary", ai: true, on: true },
              { label: "Strategy Plan", ai: true, on: true },
              { label: "Audiences", ai: true, on: true },
              { label: "Google Ads + Ad Copy", ai: !hasLinkedKw, on: platforms.includes("googleAds") },
              { label: "Keyword Research", ai: !hasLinkedKw, on: true },
              { label: "Meta Campaigns", ai: true, on: platforms.includes("metaAds") },
              { label: "LinkedIn Ads", ai: true, on: platforms.includes("linkedInAds") },
              { label: "Content Strategy", ai: !hasLinkedCs, on: true },
              { label: "Content Calendar", ai: true, on: true },
              { label: "Organic Social", ai: true, on: platforms.includes("organicSocial") },
              { label: "Email Marketing", ai: true, on: platforms.includes("emailMarketing") },
              { label: "Example Articles", ai: true, on: true },
            ]
              .filter((item) => item.on)
              .map((item) => (
                <span
                  key={item.label}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 12,
                    fontWeight: 500,
                    background: item.ai ? "var(--accent-bg)" : "#d1fae5",
                    color: item.ai ? "var(--accent)" : "#059669",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {item.ai ? <Sparkles style={{ width: 10, height: 10, marginRight: 4 }} /> : <LinkIcon style={{ width: 10, height: 10, marginRight: 4 }} />}
                  {item.label}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* ═══════ ACTIONS ═══════ */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: 40 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/tools/grand-plan")}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!title || creating}
          onClick={handleCreate}
        >
          {creating
            ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
            : <ChevronRight style={{ width: 15, height: 15 }} />
          }
          Create Plan
        </button>
      </div>
    </div>
  );
}
