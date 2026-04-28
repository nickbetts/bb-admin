"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Map,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Sparkles,
  Globe,
  Check,
  Users,
  Building2,
  Search as SearchIcon,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  website?: string;
  semrushDomain?: string;
}

interface AudienceSuggestion {
  name: string;
  description: string;
  primaryPain?: string;
  decisionTrigger?: string;
}

interface CompetitorEntry {
  domain: string;
  status: "valid" | "no-overlap" | "checking" | "invalid";
  commonKeywords?: number;
  pageContext?: { headings?: string[]; description?: string; ctaTexts?: string[]; h1?: string };
  source: "manual" | "auto";
  message?: string;
}

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

// Sections that can be toggled on/off independently of platform selection.
const ALWAYS_ON_SECTIONS: { key: string; label: string }[] = [
  { key: "executiveSummary",  label: "Executive Summary" },
  { key: "strategyPlan",      label: "Strategy Plan" },
  { key: "audiences",         label: "Audiences" },
  { key: "quickWins",         label: "Quick Wins" },
  { key: "contentStrategy",   label: "Content Strategy" },
  { key: "contentCalendar",   label: "Content Calendar" },
  { key: "exampleArticles",   label: "Example Articles" },
  { key: "seoFoundations",    label: "SEO Foundations" },
  { key: "competitorIntel",   label: "Competitor Intelligence" },
  { key: "servicesInvestment",label: "Services &amp; Investment" },
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
  const [prospectName, setProspectName] = useState("");
  const [brief, setBrief] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [channelBudgets, setChannelBudgets] = useState<Record<string, string>>({});

  // Audiences — chip list with optional AI auto-populate from the brief.
  const [audiences, setAudiences] = useState<AudienceSuggestion[]>([]);
  const [suggestingAudiences, setSuggestingAudiences] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");

  // Competitors — chip list with auto-detect (SEMrush) + manual add (validate).
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [detectingCompetitors, setDetectingCompetitors] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");
  const [validatingCompetitor, setValidatingCompetitor] = useState(false);

  // Content volume — drives the calendar and organic social cadence
  const [postsPerMonth, setPostsPerMonth] = useState(4);
  const [socialPostsPerWeek, setSocialPostsPerWeek] = useState(3);

  // Platforms — controls which paid/organic channels the AI focuses on
  const [platforms, setPlatforms] = useState<PlatformId[]>(["googleAds", "metaAds", "linkedInAds", "organicSocial", "emailMarketing"]);

  function togglePlatform(id: PlatformId) {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  // Always-on section toggles — defaults to all enabled
  const [enabledAlwaysOn, setEnabledAlwaysOn] = useState<Set<string>>(
    () => new Set(ALWAYS_ON_SECTIONS.map((s) => s.key))
  );

  function toggleAlwaysOn(key: string) {
    setEnabledAlwaysOn((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // UI
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : data.clients ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        if (!title) setTitle(`${client.name} — Go-to-Market Plan`);
        if (client.website && !website) setWebsite(client.website);
      }
    }
  }, [clientId, clients, title, website]);

  const domain = website.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

  // ── Audience helpers ─────────────────────────────────────────────────────
  const addAudience = useCallback((a: AudienceSuggestion) => {
    setAudiences((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === a.name.toLowerCase())) return prev;
      return [...prev, a];
    });
  }, []);

  const removeAudience = useCallback((name: string) => {
    setAudiences((prev) => prev.filter((a) => a.name !== name));
  }, []);

  const handleSuggestAudiences = useCallback(async () => {
    if (brief.trim().length < 20) return;
    setSuggestingAudiences(true);
    try {
      const res = await fetch("/api/tools/grand-plan/suggest-audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          clientId: clientId || undefined,
          sector: sector || undefined,
          clientName: clients.find((c) => c.id === clientId)?.name,
        }),
      });
      if (!res.ok) return;
      const data = await res.json() as { audiences?: AudienceSuggestion[] };
      if (Array.isArray(data.audiences)) setAudiences(data.audiences);
    } finally {
      setSuggestingAudiences(false);
    }
  }, [brief, clientId, sector, clients]);

  const handleAddManualAudience = useCallback(() => {
    const name = audienceInput.trim();
    if (!name) return;
    addAudience({ name, description: "" });
    setAudienceInput("");
  }, [audienceInput, addAudience]);

  // ── Competitor helpers ───────────────────────────────────────────────────
  const handleDetectCompetitors = useCallback(async () => {
    if (!domain && !clientId) return;
    setDetectingCompetitors(true);
    try {
      const res = await fetch("/api/tools/grand-plan/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect", domain: domain || undefined, clientId: clientId || undefined }),
      });
      if (!res.ok) return;
      const data = await res.json() as { competitors?: { domain: string; commonKeywords?: number }[] };
      const detected: CompetitorEntry[] = (data.competitors ?? []).slice(0, 6).map((c) => ({
        domain: c.domain,
        commonKeywords: c.commonKeywords,
        status: "valid",
        source: "auto",
      }));
      setCompetitors((prev) => {
        const seen = new Set(prev.map((p) => p.domain.toLowerCase()));
        return [...prev, ...detected.filter((d) => !seen.has(d.domain.toLowerCase()))];
      });
    } finally {
      setDetectingCompetitors(false);
    }
  }, [domain, clientId]);

  const handleAddManualCompetitor = useCallback(async () => {
    const raw = competitorInput.trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    if (!raw) return;
    if (competitors.some((c) => c.domain.toLowerCase() === raw)) {
      setCompetitorInput("");
      return;
    }
    const placeholder: CompetitorEntry = { domain: raw, status: "checking", source: "manual" };
    setCompetitors((prev) => [...prev, placeholder]);
    setCompetitorInput("");
    setValidatingCompetitor(true);
    try {
      const res = await fetch("/api/tools/grand-plan/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", competitor: raw, domain: domain || undefined, clientId: clientId || undefined }),
      });
      const data = await res.json() as {
        commonKeywords?: number;
        scraped?: boolean;
        pageContext?: CompetitorEntry["pageContext"];
        error?: string;
      };
      setCompetitors((prev) => prev.map((c) => {
        if (c.domain !== raw) return c;
        // API error or non-OK response → mark invalid
        if (!res.ok || data.error) return { ...c, status: "invalid", message: data.error ?? "Could not validate" };
        // Successful response: use keyword count to decide status.
        // Even with 0 overlap (scraped fallback), keep as no-overlap so it's
        // still included and the AI uses the scraped page context.
        return {
          ...c,
          status: (data.commonKeywords ?? 0) > 0 ? "valid" : "no-overlap",
          commonKeywords: data.commonKeywords,
          pageContext: data.pageContext,
        };
      }));
    } catch {
      setCompetitors((prev) => prev.map((c) => c.domain === raw ? { ...c, status: "invalid", message: "Validation failed" } : c));
    } finally {
      setValidatingCompetitor(false);
    }
  }, [competitorInput, competitors, domain, clientId]);

  const removeCompetitor = useCallback((d: string) => {
    setCompetitors((prev) => prev.filter((c) => c.domain !== d));
  }, []);

  async function handleCreate() {
    if (!title) return;
    setCreating(true);
    try {
      // Build the section enable list from toggled always-on sections + selected platforms.
      const platformSections = platforms.flatMap(
        (id) => PLATFORMS.find((p) => p.id === id)?.sections ?? [],
      );
      const enabledSections = Array.from(new Set([...Array.from(enabledAlwaysOn), ...platformSections]));

      // Stringify audiences in the same "Name: Description" format the
      // existing generator already understands when targetAudiences is set.
      const audiencesText = audiences.length
        ? audiences.map((a) => `${a.name}: ${a.description}`.trim().replace(/:\s*$/, "")).join("\n")
        : "";

      // Strip out invalid competitors before sending. We do persist no-overlap
      // ones because the generator falls back to scraped page context.
      const finalCompetitors = competitors
        .filter((c) => c.status === "valid" || c.status === "no-overlap")
        .map((c) => ({
          domain: c.domain,
          commonKeywords: c.commonKeywords,
          pageContext: c.pageContext,
          source: c.source,
        }));

      const res = await fetch("/api/tools/grand-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          prospectName: !clientId && prospectName.trim() ? prospectName.trim() : undefined,
          prospectWebsite: !clientId && website ? website : undefined,
          title,
          purpose,
          clientBrief: brief || undefined,
          targetAudiences: audiencesText || undefined,
          sector: sector || undefined,
          competitors: finalCompetitors,
          config: {
            sections: enabledSections,
            postsPerMonth,
            socialPostsPerWeek,
            ...(sector ? { sector } : {}),
            ...(website ? { kwBrief: { website, brief, monthlyBudget: channelBudgets.googleAds || monthlyBudget } } : {}),
            ...(domain ? { contentBrief: { domain, brief, competitors: finalCompetitors.map((c) => c.domain).join(",") } } : {}),
            ...(Object.keys(channelBudgets).length > 0 ? { channelBudgets: Object.fromEntries(
              Object.entries(channelBudgets).filter(([, v]) => v && Number(v.replace(/[^0-9.]/g, "")) > 0)
                .map(([k, v]) => [k, Number(v.replace(/[^0-9.]/g, ""))])
            ) } : {}),
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Redirect with autoStart so the view page kicks off generation
        // immediately — the user shouldn't have to press another button.
        router.push(`/tools/grand-plan/${data.grandPlan.id}?autoStart=1`);
      }
    } finally {
      setCreating(false);
    }
  }

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

            {/* Prospect name — only for cold prospects with no client linked */}
            {!clientId && (
              <div>
                <label className="form-label">Prospect name</label>
                <input
                  className="form-input"
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="e.g. Acme Co (cold prospect)"
                />
                <span className="form-hint">
                  Used for the share-page heading and pipeline. Convert to a full client later when they sign.
                </span>
              </div>
            )}

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

            {/* Target Audiences — chips with optional Suggest from brief */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}>
                  <Users style={{ width: 13, height: 13 }} />
                  Target Audiences
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={brief.trim().length < 20 || suggestingAudiences}
                  onClick={handleSuggestAudiences}
                  title={brief.trim().length < 20 ? "Write a brief first (20+ characters)" : "Auto-populate audiences from the brief"}
                >
                  {suggestingAudiences
                    ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                    : <Sparkles style={{ width: 12, height: 12 }} />}
                  {suggestingAudiences ? "Suggesting…" : "Suggest from brief"}
                </button>
              </div>
              {audiences.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {audiences.map((a) => (
                    <span key={a.name} style={{
                      display: "inline-flex", alignItems: "flex-start", gap: 6,
                      padding: "6px 10px", borderRadius: 8,
                      background: "var(--accent-bg)", border: "1px solid var(--accent)",
                      color: "var(--text)", fontSize: 12, lineHeight: 1.35, maxWidth: 320,
                    }}>
                      <span style={{ flex: 1 }}>
                        <strong>{a.name}</strong>
                        {a.description && <span style={{ display: "block", color: "var(--text-3)", fontSize: 11, marginTop: 2 }}>{a.description}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAudience(a.name)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0, marginTop: 1 }}
                        aria-label={`Remove ${a.name}`}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="form-input"
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                  value={audienceInput}
                  onChange={(e) => setAudienceInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddManualAudience(); } }}
                  placeholder="Add an audience name and press Enter"
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddManualAudience} disabled={!audienceInput.trim()}>
                  <Plus style={{ width: 12, height: 12 }} /> Add
                </button>
              </div>
              <span className="form-hint">Use Suggest to auto-populate from the brief, or add manually. Empty list = AI infers them.</span>
            </div>

            {/* Competitors — chips with auto-detect (SEMrush) + manual add */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}>
                  <Building2 style={{ width: 13, height: 13 }} />
                  Competitors
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={(!domain && !clientId) || detectingCompetitors}
                  onClick={handleDetectCompetitors}
                  title={!domain && !clientId ? "Set a website or pick a client first" : "Auto-detect competitors via SEMrush"}
                >
                  {detectingCompetitors
                    ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                    : <SearchIcon style={{ width: 12, height: 12 }} />}
                  {detectingCompetitors ? "Detecting…" : "Auto-detect"}
                </button>
              </div>
              {competitors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {competitors.map((c) => {
                    const tone =
                      c.status === "valid" ? { bg: "#d1fae5", fg: "#065f46", border: "#059669" } :
                      c.status === "no-overlap" ? { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" } :
                      c.status === "checking" ? { bg: "var(--accent-bg)", fg: "var(--accent)", border: "var(--accent)" } :
                      { bg: "#fee2e2", fg: "#991b1b", border: "#dc2626" };
                    return (
                      <span key={c.domain} style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "6px 10px", borderRadius: 8,
                        background: tone.bg, border: `1px solid ${tone.border}`,
                        color: tone.fg, fontSize: 12,
                      }}>
                        <strong>{c.domain}</strong>
                        {c.status === "checking" && <Loader2 style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />}
                        {typeof c.commonKeywords === "number" && c.commonKeywords > 0 && (
                          <span style={{ fontSize: 11, opacity: 0.85 }}>{c.commonKeywords} common KWs</span>
                        )}
                        {c.status === "no-overlap" && (
                          <span style={{ fontSize: 11 }}>
                            {c.pageContext ? "scraped — no SEMrush overlap" : "no SEMrush overlap"}
                          </span>
                        )}
                        {c.status === "invalid" && <span style={{ fontSize: 11 }}>{c.message ?? "invalid"}</span>}
                        <span style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase" }}>{c.source}</span>
                        <button
                          type="button"
                          onClick={() => removeCompetitor(c.domain)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: tone.fg, padding: 0 }}
                          aria-label={`Remove ${c.domain}`}
                        >
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="form-input"
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddManualCompetitor(); } }}
                  placeholder="competitor.com"
                  disabled={validatingCompetitor}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddManualCompetitor} disabled={!competitorInput.trim() || validatingCompetitor}>
                  <Plus style={{ width: 12, height: 12 }} /> Add
                </button>
              </div>
              <span className="form-hint">Auto-detect uses SEMrush keyword overlap. Manual entries are scraped for headlines/CTAs when SEMrush has no data.</span>
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

      {/* ═══════ WHAT GETS GENERATED ═══════ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)" }}>
              What gets generated
            </div>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>Click to toggle sections on or off</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {/* Always-on sections — individually toggleable */}
            {ALWAYS_ON_SECTIONS.map((s) => {
              const on = enabledAlwaysOn.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleAlwaysOn(s.key)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    background: on ? "var(--accent-bg)" : "transparent",
                    color: on ? "var(--accent)" : "var(--text-3)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    opacity: on ? 1 : 0.55,
                    transition: "all 0.15s",
                  }}
                  title={on ? `Disable ${s.label}` : `Enable ${s.label}`}
                >
                  {on
                    ? <Sparkles style={{ width: 10, height: 10 }} />
                    : <X style={{ width: 10, height: 10 }} />}
                  <span dangerouslySetInnerHTML={{ __html: s.label }} />
                </button>
              );
            })}
            {/* Platform sections — reflect the platform toggles above, not individually toggleable here */}
            {([
              { label: "Google Ads",     on: platforms.includes("googleAds") },
              { label: "Meta Campaigns", on: platforms.includes("metaAds") },
              { label: "LinkedIn Ads",   on: platforms.includes("linkedInAds") },
              { label: "Organic Social", on: platforms.includes("organicSocial") },
              { label: "Email Marketing",on: platforms.includes("emailMarketing") },
            ] as { label: string; on: boolean }[]).map((item) => (
              <span
                key={item.label}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1.5px solid ${item.on ? "var(--accent)" : "var(--border)"}`,
                  background: item.on ? "var(--accent-bg)" : "transparent",
                  color: item.on ? "var(--accent)" : "var(--text-3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: item.on ? 1 : 0.45,
                }}
                title="Toggle this in the Platforms section above"
              >
                {item.on
                  ? <Sparkles style={{ width: 10, height: 10 }} />
                  : <X style={{ width: 10, height: 10 }} />}
                {item.label}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>
            Platform sections (Google Ads, Meta, etc.) are toggled in the <strong>Platforms</strong> panel above.
            Pressing <strong>Create &amp; Generate</strong> starts the pipeline immediately.
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
          Create &amp; Generate
        </button>
      </div>
    </div>
  );
}
