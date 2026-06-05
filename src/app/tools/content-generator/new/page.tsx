"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PencilLine,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  X,
  Check,
  AlertCircle,
  Globe,
  Search,
  RefreshCw,
} from "lucide-react";
import type { ContentIdea, ContentType, CompetitorContext } from "@/lib/content-generator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientOption {
  id: string;
  name: string;
  website?: string | null;
}

type CompetitorEntry = {
  domain: string;
  status: "pending" | "checking" | "valid" | "no-overlap" | "invalid";
  commonKeywords?: number;
};

const CONTENT_TYPES: { value: ContentType; label: string; description: string; colour: string }[] =
  [
    {
      value: "blog",
      label: "Blog Article",
      description: "1,000–1,500 words, SEO-optimised, H2 structure",
      colour: "#2563eb",
    },
    {
      value: "whitepaper",
      label: "Whitepaper",
      description: "2,000–3,000 words, authoritative research report",
      colour: "#7c3aed",
    },
    {
      value: "case_study",
      label: "Case Study",
      description: "800–1,200 words, Challenge → Approach → Results",
      colour: "#059669",
    },
    {
      value: "social",
      label: "Social Media Copy",
      description: "LinkedIn, Instagram, Facebook, X and TikTok variants",
      colour: "#ea580c",
    },
  ];

const INTENT_LABELS: Record<string, string> = {
  awareness: "Awareness",
  informational: "Informational",
  commercial: "Commercial",
  transactional: "Transactional",
  decision: "Decision",
};

const INTENT_COLOURS: Record<string, string> = {
  awareness: "#64748b",
  informational: "#2563eb",
  commercial: "#7c3aed",
  transactional: "#059669",
  decision: "#ea580c",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewContentGeneratorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetClientId = searchParams.get("clientId");

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState(presetClientId ?? "");
  const [brief, setBrief] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(["blog"]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [creating, setCreating] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [researching, setResearching] = useState(false);
  const [researchStatus, setResearchStatus] = useState("");
  const [researchError, setResearchError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorContext[]>([]);
  const [competitorInput, setCompetitorInput] = useState("");
  const [competitorEntries, setCompetitorEntries] = useState<CompetitorEntry[]>([]);
  const [savingSelections, setSavingSelections] = useState(false);

  // ── Step 3 ──────────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── Load clients ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: ClientOption[] | { clients?: ClientOption[] }) => {
        const list = Array.isArray(data) ? data : (data.clients ?? []);
        setClients(list);
        if (presetClientId) {
          const c = list.find((cl) => cl.id === presetClientId);
          if (c?.website) setWebsiteUrl(c.website);
        }
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoadingClients(false));
  }, [presetClientId]);

  // Auto-fill website when client is selected
  function handleClientChange(id: string) {
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    if (c?.website) setWebsiteUrl(c.website ?? c.website);
  }

  // ── Toggle content type ─────────────────────────────────────────────────────
  function toggleType(type: ContentType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  // ── Step 1 → 2: create record + run research ────────────────────────────────
  async function handleStartResearch() {
    if (!clientId || !brief.trim() || !selectedTypes.length) return;
    setCreating(true);
    setResearchError(null);

    try {
      // Create record
      const createRes = await fetch("/api/tools/content-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          brief,
          contentTypes: selectedTypes,
          websiteUrl: websiteUrl || undefined,
        }),
      });
      if (!createRes.ok) {
        const err = (await createRes.json()) as { error: string };
        throw new Error(err.error);
      }
      const { id } = (await createRes.json()) as { id: string };
      setRecordId(id);
      setStep(2);
      setCreating(false);
      await runResearch(id);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  // ── Run research (poll status) ───────────────────────────────────────────────
  const runResearch = useCallback(async (id: string, extraCompetitors?: string[]) => {
    setResearching(true);
    setResearchError(null);
    setResearchStatus("Starting research…");

    // Poll status while research runs
    const pollInterval = setInterval(async () => {
      try {
        const r = await fetch(`/api/tools/content-generator/${id}`);
        if (r.ok) {
          const d = (await r.json()) as { record: { statusMessage?: string } };
          if (d.record.statusMessage) setResearchStatus(d.record.statusMessage);
        }
      } catch {
        /* ignore */
      }
    }, 2000);

    try {
      const res = await fetch("/api/tools/content-generator/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, competitors: extraCompetitors }),
      });
      clearInterval(pollInterval);

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
      }

      const data = (await res.json()) as {
        ideas: ContentIdea[];
        competitors: CompetitorContext[];
      };

      setIdeas(data.ideas ?? []);
      setCompetitors(data.competitors ?? []);
      setCompetitorEntries(
        (data.competitors ?? []).map((c) => ({
          domain: c.domain,
          status: "valid" as const,
          commonKeywords: c.commonKeywords,
        })),
      );
    } catch (err) {
      clearInterval(pollInterval);
      setResearchError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
      setResearchStatus("");
    }
  }, []);

  // ── Add competitor manually ──────────────────────────────────────────────────
  async function addCompetitor() {
    const raw = competitorInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
    if (!raw || competitorEntries.some((c) => c.domain === raw)) return;
    setCompetitorInput("");

    const entry: CompetitorEntry = { domain: raw, status: "checking" };
    setCompetitorEntries((prev) => [...prev, entry]);

    try {
      const res = await fetch("/api/tools/grand-plan/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", clientId, competitor: raw }),
      });
      const data = (await res.json()) as { commonKeywords: number };
      setCompetitorEntries((prev) =>
        prev.map((e) =>
          e.domain === raw
            ? {
                ...e,
                status: data.commonKeywords > 0 ? "valid" : "no-overlap",
                commonKeywords: data.commonKeywords,
              }
            : e,
        ),
      );
      setCompetitors((prev) => [
        ...prev.filter((c) => c.domain !== raw),
        { domain: raw, commonKeywords: data.commonKeywords },
      ]);
    } catch {
      setCompetitorEntries((prev) =>
        prev.map((e) => (e.domain === raw ? { ...e, status: "invalid" } : e)),
      );
    }
  }

  function removeCompetitor(domain: string) {
    setCompetitorEntries((prev) => prev.filter((e) => e.domain !== domain));
    setCompetitors((prev) => prev.filter((c) => c.domain !== domain));
  }

  // ── Toggle idea selection ────────────────────────────────────────────────────
  function toggleIdea(id: string) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  }

  // ── Toggle keyword approval ──────────────────────────────────────────────────
  function toggleKeyword(
    ideaId: string,
    field: "primaryKeyword" | "secondaryKeywords" | "longTailKeywords",
    index: number,
  ) {
    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== ideaId) return idea;
        if (field === "primaryKeyword") {
          return {
            ...idea,
            primaryKeyword: { ...idea.primaryKeyword, approved: !idea.primaryKeyword.approved },
          };
        }
        const arr = [...idea[field]];
        arr[index] = { ...arr[index], approved: !arr[index].approved };
        return { ...idea, [field]: arr };
      }),
    );
  }

  // ── Step 2 → 3: save selections + trigger generation ─────────────────────────
  async function handleGenerate() {
    if (!recordId) return;
    const selected = ideas.filter((i) => i.selected);
    if (!selected.length) return;

    setSavingSelections(true);
    try {
      // Save updated ideas (with keyword approvals) and selected ideas
      await fetch(`/api/tools/content-generator/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideasJson: JSON.stringify(ideas),
          selectedIdeasJson: JSON.stringify(ideas),
        }),
      });

      setStep(3);
      setGenerating(true);
      setSavingSelections(false);

      const res = await fetch(`/api/tools/content-generator/${recordId}/generate`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
      }

      router.push(`/tools/content-generator/${recordId}`);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
      setSavingSelections(false);
    }
  }

  const selectedCount = ideas.filter((i) => i.selected).length;
  const ideasByType = CONTENT_TYPES.filter((t) => selectedTypes.includes(t.value)).map((t) => ({
    ...t,
    ideas: ideas.filter((i) => i.type === t.value),
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "var(--gradient-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <PencilLine style={{ width: 20, height: 20, color: "white" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            New Content Pack
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            AI-generated content with live keyword and competitor research
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 40 }}>
        {[
          { n: 1, label: "Brief" },
          { n: 2, label: "Ideas & Keywords" },
          { n: 3, label: "Generate" },
        ].map((s, idx) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {idx > 0 && <div style={{ width: 32, height: 1, background: "var(--border)" }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background:
                    step > s.n ? "var(--success)" : step === s.n ? "var(--accent)" : "var(--bg-2)",
                  color: step >= s.n ? "white" : "var(--text-3)",
                }}
              >
                {step > s.n ? <Check style={{ width: 12, height: 12 }} /> : s.n}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: step === s.n ? 600 : 400,
                  color: step === s.n ? "var(--text)" : "var(--text-3)",
                }}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Brief ──────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Client */}
          <div>
            <label className="form-label">Client</label>
            {loadingClients ? (
              <div style={{ fontSize: 13, color: "var(--text-3)" }}>Loading clients…</div>
            ) : (
              <select
                className="form-input"
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                style={{ maxWidth: 400 }}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Website URL */}
          <div>
            <label className="form-label">
              Website / Domain
              <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>
                (used for keyword research)
              </span>
            </label>
            <div style={{ position: "relative", maxWidth: 400 }}>
              <Globe
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 14,
                  height: 14,
                  color: "var(--text-3)",
                }}
              />
              <input
                className="form-input"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                style={{ paddingLeft: 32, maxWidth: 400 }}
              />
            </div>
          </div>

          {/* Content types */}
          <div>
            <label className="form-label">
              Content Types
              <span style={{ fontWeight: 400, color: "var(--text-3)", marginLeft: 6 }}>
                — select all that apply
              </span>
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              {CONTENT_TYPES.map((t) => {
                const active = selectedTypes.includes(t.value);
                return (
                  <button
                    key={t.value}
                    onClick={() => toggleType(t.value)}
                    style={{
                      padding: "14px 16px",
                      border: `2px solid ${active ? t.colour : "var(--border)"}`,
                      borderRadius: 10,
                      background: active ? `${t.colour}10` : "var(--surface)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all .15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: active ? t.colour : "var(--border)",
                          transition: "background .15s",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: active ? t.colour : "var(--text)",
                        }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>
                      {t.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brief */}
          <div>
            <label className="form-label">Brief</label>
            <textarea
              className="form-input"
              rows={6}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Describe what you need — e.g. 'We want to target SME owners looking for accountancy software. Focus on tax efficiency, Making Tax Digital compliance, and the pain of switching. Tone: professional but approachable.'"
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
            <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-3)" }}>
              Be specific: include target audience, key themes, tone, and any topics to avoid.
            </p>
          </div>

          {researchError && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "12px 16px",
                background: "var(--danger-bg)",
                borderRadius: 8,
                color: "var(--danger)",
                fontSize: 13,
              }}
            >
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
              {researchError}
            </div>
          )}

          <div>
            <button
              className="btn btn-primary"
              onClick={handleStartResearch}
              disabled={!clientId || !brief.trim() || !selectedTypes.length || creating}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {creating ? (
                <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
              ) : null}
              {creating ? "Starting research…" : "Research & Generate Ideas"}
              {!creating && <ChevronRight style={{ width: 15, height: 15 }} />}
            </button>
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-3)" }}>
              Runs keyword research + competitor analysis + Claude Opus idea generation (~30–60
              seconds)
            </p>
          </div>
        </div>
      )}

      {/* ── Step 2: Ideas & Keywords ───────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          {/* Research loading state */}
          {researching && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Loader2
                style={{
                  width: 32,
                  height: 32,
                  color: "var(--accent)",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                {researchStatus || "Running research…"}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                Gathering keyword data, analysing competitors and generating ideas with Claude Opus
              </p>
            </div>
          )}

          {!researching && researchError && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 16px",
                  background: "var(--danger-bg)",
                  borderRadius: 8,
                  color: "var(--danger)",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                {researchError}
              </div>
              <button className="btn btn-sm" onClick={() => recordId && runResearch(recordId)}>
                Retry research
              </button>
            </div>
          )}

          {!researching && ideas.length > 0 && (
            <>
              {/* Competitor panel */}
              <div
                style={{
                  marginBottom: 32,
                  padding: "20px 24px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    Competitors
                  </h3>
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      recordId &&
                      runResearch(
                        recordId,
                        competitorEntries
                          .filter((e) => e.status !== "invalid")
                          .map((e) => e.domain),
                      )
                    }
                    disabled={researching}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 }}
                    title="Re-run keyword research and idea generation with the current competitor list"
                  >
                    <RefreshCw style={{ width: 11, height: 11 }} />
                    Re-run Research
                  </button>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-3)" }}>
                  Auto-detected from live SEO signals. Add more to improve keyword and angle
                  quality, then re-run research.
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {competitorEntries.map((c) => (
                    <div
                      key={c.domain}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background:
                          c.status === "valid"
                            ? "var(--success-bg)"
                            : c.status === "no-overlap"
                              ? "var(--warning-bg)"
                              : c.status === "invalid"
                                ? "var(--danger-bg)"
                                : "var(--bg-2)",
                        border: `1px solid ${c.status === "valid" ? "var(--success)" : c.status === "no-overlap" ? "var(--warning)" : c.status === "invalid" ? "var(--danger)" : "var(--border)"}20`,
                      }}
                    >
                      <Globe style={{ width: 12, height: 12, color: "var(--text-3)" }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>
                        {c.domain}
                      </span>
                      {c.commonKeywords !== undefined && (
                        <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                          ({c.commonKeywords} shared kws)
                        </span>
                      )}
                      {c.status === "checking" && (
                        <Loader2
                          style={{
                            width: 11,
                            height: 11,
                            animation: "spin 1s linear infinite",
                            color: "var(--text-3)",
                          }}
                        />
                      )}
                      <button
                        onClick={() => removeCompetitor(c.domain)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          color: "var(--text-3)",
                          display: "flex",
                        }}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, maxWidth: 420 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Search
                      style={{
                        position: "absolute",
                        left: 9,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 13,
                        height: 13,
                        color: "var(--text-3)",
                      }}
                    />
                    <input
                      className="form-input"
                      value={competitorInput}
                      onChange={(e) => setCompetitorInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
                      placeholder="competitor.com"
                      style={{ paddingLeft: 30, fontSize: 13 }}
                    />
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={addCompetitor}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <Plus style={{ width: 13, height: 13 }} />
                    Add
                  </button>
                </div>
              </div>

              {/* Ideas by type */}
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)" }}>
                    Content Ideas
                  </h2>
                  <span style={{ fontSize: 13, color: "var(--text-3)" }}>
                    {selectedCount} selected
                  </span>
                </div>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--text-3)" }}>
                  Tick the ideas you want to generate. Click keyword pills to approve or reject them
                  — only approved keywords will be used.
                </p>

                {ideasByType.map(
                  ({ value: type, label, colour, ideas: typeIdeas }) =>
                    typeIdeas.length > 0 && (
                      <div key={type} style={{ marginBottom: 32 }}>
                        <h3
                          style={{
                            margin: "0 0 12px",
                            fontSize: 14,
                            fontWeight: 700,
                            color: colour,
                          }}
                        >
                          {label}
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {typeIdeas.map((idea) => (
                            <IdeaCard
                              key={idea.id}
                              idea={idea}
                              colour={colour}
                              onToggleSelect={() => toggleIdea(idea.id)}
                              onTogglePrimary={() => toggleKeyword(idea.id, "primaryKeyword", 0)}
                              onToggleSecondary={(i) =>
                                toggleKeyword(idea.id, "secondaryKeywords", i)
                              }
                              onToggleLongTail={(i) =>
                                toggleKeyword(idea.id, "longTailKeywords", i)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ),
                )}
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  className="btn"
                  onClick={() => setStep(1)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={selectedCount === 0 || savingSelections}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  {savingSelections ? (
                    <Loader2
                      style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
                    />
                  ) : null}
                  {savingSelections
                    ? "Starting…"
                    : `Generate ${selectedCount} Piece${selectedCount !== 1 ? "s" : ""}`}
                  {!savingSelections && <ChevronRight style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Generating ─────────────────────────────────────────────────── */}
      {step === 3 && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          {generating ? (
            <>
              <Loader2
                style={{
                  width: 40,
                  height: 40,
                  color: "var(--accent)",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 20px",
                }}
              />
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                Generating content…
              </p>
              <p style={{ fontSize: 14, color: "var(--text-3)", maxWidth: 400, margin: "0 auto" }}>
                Claude Opus is writing your {selectedCount} piece{selectedCount !== 1 ? "s" : ""}.
                This takes 1–3 minutes depending on length.
              </p>
            </>
          ) : generationError ? (
            <>
              <AlertCircle
                style={{ width: 40, height: 40, color: "var(--danger)", margin: "0 auto 20px" }}
              />
              <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                Generation failed
              </p>
              <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 20 }}>
                {generationError}
              </p>
              {recordId && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setGenerationError(null);
                    setGenerating(true);
                    handleGenerate();
                  }}
                >
                  Retry
                </button>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── IdeaCard sub-component ───────────────────────────────────────────────────

function IdeaCard({
  idea,
  colour,
  onToggleSelect,
  onTogglePrimary,
  onToggleSecondary,
  onToggleLongTail,
}: {
  idea: ContentIdea;
  colour: string;
  onToggleSelect: () => void;
  onTogglePrimary: () => void;
  onToggleSecondary: (i: number) => void;
  onToggleLongTail: (i: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1.5px solid ${idea.selected ? colour : "var(--border)"}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color .15s",
      }}
    >
      {/* Header row */}
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          cursor: "pointer",
        }}
        onClick={onToggleSelect}
      >
        {/* Checkbox */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: `2px solid ${idea.selected ? colour : "var(--border)"}`,
            background: idea.selected ? colour : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 1,
            transition: "all .15s",
          }}
        >
          {idea.selected && <Check style={{ width: 11, height: 11, color: "white" }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              {idea.title}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 10,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                background: `${INTENT_COLOURS[idea.intent] ?? "#64748b"}15`,
                color: INTENT_COLOURS[idea.intent] ?? "#64748b",
              }}
            >
              {INTENT_LABELS[idea.intent] ?? idea.intent}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
            {idea.summary}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-3)",
            padding: 4,
            flexShrink: 0,
          }}
        >
          <ChevronRight
            style={{
              width: 16,
              height: 16,
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform .15s",
            }}
          />
        </button>
      </div>

      {/* Expanded keyword section */}
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          <p
            style={{
              margin: "12px 0 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Primary keyword
          </p>
          <KeywordPill
            keyword={idea.primaryKeyword.keyword}
            volume={idea.primaryKeyword.volume}
            approved={idea.primaryKeyword.approved}
            onToggle={onTogglePrimary}
            primary
          />

          {idea.secondaryKeywords.length > 0 && (
            <>
              <p
                style={{
                  margin: "12px 0 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Secondary keywords
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {idea.secondaryKeywords.map((kw, i) => (
                  <KeywordPill
                    key={i}
                    keyword={kw.keyword}
                    volume={kw.volume}
                    approved={kw.approved}
                    onToggle={() => onToggleSecondary(i)}
                  />
                ))}
              </div>
            </>
          )}

          {idea.longTailKeywords.length > 0 && (
            <>
              <p
                style={{
                  margin: "12px 0 8px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                Long-tail keywords
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {idea.longTailKeywords.map((kw, i) => (
                  <KeywordPill
                    key={i}
                    keyword={kw.keyword}
                    volume={kw.volume}
                    approved={kw.approved}
                    onToggle={() => onToggleLongTail(i)}
                  />
                ))}
              </div>
            </>
          )}

          {idea.angle && (
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-3)" }}>
              <strong style={{ color: "var(--text)" }}>Angle:</strong> {idea.angle}
            </p>
          )}
          {idea.targetAudience && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-3)" }}>
              <strong style={{ color: "var(--text)" }}>Audience:</strong> {idea.targetAudience}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function KeywordPill({
  keyword,
  volume,
  approved,
  onToggle,
  primary = false,
}: {
  keyword: string;
  volume?: number;
  approved: boolean;
  onToggle: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: primary ? "5px 12px" : "3px 9px",
        borderRadius: 20,
        border: `1.5px solid ${approved ? "var(--accent)" : "var(--border)"}`,
        background: approved ? "var(--accent-bg)" : "var(--bg-2)",
        color: approved ? "var(--accent)" : "var(--text-3)",
        cursor: "pointer",
        fontSize: primary ? 13 : 12,
        fontWeight: approved ? 600 : 400,
        transition: "all .12s",
      }}
    >
      {approved ? (
        <Check style={{ width: 10, height: 10 }} />
      ) : (
        <X style={{ width: 10, height: 10 }} />
      )}
      {keyword}
      {volume !== undefined && (
        <span style={{ opacity: 0.6, fontSize: 10 }}>
          {volume >= 1000 ? `${(volume / 1000).toFixed(0)}k` : volume}
        </span>
      )}
    </button>
  );
}
